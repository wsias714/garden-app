import type { Weather } from "./engine.ts";

/* Open-Meteo forecast (free for non-commercial use, no key). Called straight from the phone with
   rounded, city-level coordinates. Cached 3 hours. A failure just means no nudge. */

const KEY = "garden-wx";
const TTL = 3 * 3_600_000;

export async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  const la = lat.toFixed(2);
  const lo = lon.toFixed(2);
  try {
    const c = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { at: number; la: string; lo: string; w: Weather } | null;
    if (c && c.la === la && c.lo === lo && Date.now() - c.at < TTL) return c.w;
  } catch {
    /* ignore a bad cache */
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&daily=precipitation_sum,temperature_2m_max&past_days=2&forecast_days=2&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = (await r.json()) as { daily: { precipitation_sum: number[]; temperature_2m_max: number[] } };
    const p = j.daily.precipitation_sum;
    const t = j.daily.temperature_2m_max;
    const w: Weather = {
      rainPast48Mm: (p[0] ?? 0) + (p[1] ?? 0),
      rainSoonMm: Math.max(p[2] ?? 0, p[3] ?? 0),
      maxTempC: Math.max(t[2] ?? 0, t[3] ?? 0),
    };
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), la, lo, w }));
    } catch {
      /* ignore */
    }
    return w;
  } catch {
    return null;
  }
}
