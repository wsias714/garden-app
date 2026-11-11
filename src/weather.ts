import type { Forecast, ForecastDay } from "./engine.ts";

/* Open-Meteo 7-day forecast (free for non-commercial use, no key), called straight from the phone
   with rounded, city-level coordinates. Cached 3 hours. A failure just means no weather alerts. */

const KEY = "garden-wx2";
const TTL = 3 * 3_600_000;

interface Daily {
  time: string[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  et0_fao_evapotranspiration: number[];
  relative_humidity_2m_min: number[];
  wind_gusts_10m_max: number[];
}

export function parseForecast(daily: Daily): Forecast {
  const days: ForecastDay[] = daily.time.map((date, i) => ({
    date,
    rainMm: daily.precipitation_sum[i] ?? 0,
    rainProb: daily.precipitation_probability_max[i] ?? 0,
    tMaxC: daily.temperature_2m_max[i] ?? 0,
    tMinC: daily.temperature_2m_min[i] ?? 0,
    et0Mm: daily.et0_fao_evapotranspiration[i] ?? 0,
    rhMin: daily.relative_humidity_2m_min[i] ?? 50,
    gustKmh: daily.wind_gusts_10m_max[i] ?? 0,
  }));
  // The request asks for 2 past days, then today and the next 6.
  const past = days.slice(0, 2);
  return { pastRainMm: past.reduce((s, d) => s + d.rainMm, 0), days: days.slice(2) };
}

export async function fetchForecast(lat: number, lon: number): Promise<Forecast | null> {
  const la = lat.toFixed(2);
  const lo = lon.toFixed(2);
  try {
    const c = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { at: number; la: string; lo: string; f: Forecast } | null;
    if (c && c.la === la && c.lo === lo && Date.now() - c.at < TTL) return c.f;
  } catch {
    /* ignore a bad cache */
  }
  try {
    const fields = "precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration,relative_humidity_2m_min,wind_gusts_10m_max";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&daily=${fields}&past_days=2&forecast_days=7&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const f = parseForecast(((await r.json()) as { daily: Daily }).daily);
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), la, lo, f }));
    } catch {
      /* ignore */
    }
    return f;
  } catch {
    return null;
  }
}
