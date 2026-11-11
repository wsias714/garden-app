import { CATALOG, cropByKey, seasonFactor } from "./catalog.ts";
import type { Climate, Crop } from "./catalog.ts";
import { addDays, diffDays, fmt, monthOf, parse, pretty } from "./dates.ts";
import type { GardenData, Plant } from "./sync/types.ts";

/* Pure schedule engine. Nothing but completions (`done`) is stored, so two phones never conflict
   over the schedule. Rules: interval (water, feed), anchored to planting (harvest window), calendar
   (monthly drip check, seasonal timer adjust), project-anchored (mint regrowth checks), and weather
   (7-day forecast alerts and nudges). Thresholds and intervals are ASSUMPTIONS, tunable later.
   Weather only ever nudges: it never ticks or skips a task by itself. */

export interface ForecastDay {
  date: string;
  rainMm: number;
  rainProb: number; // %
  tMaxC: number;
  tMinC: number;
  et0Mm: number; // water the sun and wind pull out of soil and leaves
  rhMin: number; // %
  gustKmh: number;
}
export interface Forecast {
  pastRainMm: number; // last 2 days
  days: ForecastDay[]; // today first, 7 days
}

export interface Task {
  id: string;
  date: string;
  title: string;
  note: string;
  kind: "water" | "feed" | "harvest" | "check";
  plantId: string;
  done: boolean;
  overdue: boolean;
  monthly: boolean; // a "this month" chore, not tied to one day
  nudge: string;
}

export interface Alert {
  id: string;
  date: string;
  kind: "heat" | "frost" | "rain" | "wind" | "week";
  title: string;
  detail: string;
}

export const HOT_C = 32; // 90 F
export const WARM_C = 29.5; // 85 F: heat-tender crops start to suffer
const FROST_C = 3; // 37 F at 2 m: frost possible on the ground
const RAIN_MM = 6; // about 1/4 in: enough to skip a watering
const SOAK_MM = 12; // about 1/2 in
export const cToF = (c: number) => Math.round(c * 1.8 + 32);
export const mmToIn = (mm: number) => (mm / 25.4).toFixed(2);

/** A plant's effective climate: its own settings, else the catalog's. */
export function climateOf(p: Plant): Climate {
  const base = cropByKey(p.cropKey)?.climate ?? {
    heat: "ok", frostTender: false, rainSensitive: false, windTender: false,
    heatCare: "Water deeply before a heat wave and keep the soil mulched.",
    rainCare: "After 1/4 in or more of rain, skip the next watering and check the soil 2 in down.",
    season: "",
  };
  return {
    heat: p.heatTolerance || base.heat,
    frostTender: p.frostTender ? p.frostTender === "yes" : base.frostTender,
    rainSensitive: p.rainSensitive ? p.rainSensitive === "yes" : base.rainSensitive,
    windTender: base.windTender,
    heatCare: p.heatPlan?.trim() || base.heatCare,
    rainCare: p.rainPlan?.trim() || base.rainCare,
    season: p.seasonNotes?.trim() || base.season,
  };
}

const active = (p: Plant) => p.status === "growing" || p.status === "harvesting";

/** Days between waterings: the plant's own setting, else catalog x season, shade waters less. */
export function waterInterval(p: Plant, crop: Crop | undefined, month: number): number {
  if (p.waterEveryDays && p.waterEveryDays > 0) return p.waterEveryDays;
  const shade = p.sun === "shade" ? 1.5 : p.sun === "part" ? 1.2 : 1;
  return Math.max(1, Math.round((crop?.water ?? 5) * seasonFactor(month) * shade));
}

const dayOf = (f: Forecast | null, date: string) => f?.days.find((d) => d.date === date);
const rainy = (d: ForecastDay | undefined) => !!d && (d.rainMm >= RAIN_MM || (d.rainProb >= 60 && d.rainMm >= 2.5));

/** Weather nudge for a water task due on `date` (overdue tasks use today). */
export function waterNudge(p: Plant, f: Forecast | null, date: string, today: string): string {
  if (!f) return "";
  const on = date < today ? today : date;
  const d = dayOf(f, on);
  const next = dayOf(f, addDays(on, 1));
  const c = climateOf(p);
  if (rainy(d) || rainy(next)) {
    const r = rainy(d) ? d! : next!;
    return `Rain ${r.date === on ? "that day" : "the next day"} (about ${mmToIn(r.rainMm)} in): likely skip; check the soil 2 in down.`;
  }
  if (on <= addDays(today, 1) && f.pastRainMm >= RAIN_MM) return `It rained about ${mmToIn(f.pastRainMm)} in recently: check the soil before watering.`;
  if (d && (d.tMaxC >= HOT_C || (c.heat === "tender" && d.tMaxC >= WARM_C))) return `${cToF(d.tMaxC)}°F: water early and deeply. ${c.heatCare}`;
  if (d && d.rhMin <= 20 && d.gustKmh >= 40) return "Dry gusty wind: soil dries fast, check it today.";
  return "";
}

const latestDone = (d: GardenData, prefix: string): string => {
  let best = "";
  for (const x of d.done) if (x.id.startsWith(prefix) && x.state !== "open" && x.at > best) best = x.at;
  return best;
};
const isDone = (d: GardenData, id: string) => d.done.some((x) => x.id === id && x.state !== "open");

function plantTasks(p: Plant, d: GardenData, f: Forecast | null, today: string, horizon: number, out: Task[]) {
  if (!active(p) || !p.planted) return;
  const crop = cropByKey(p.cropKey);
  const end = addDays(today, horizon);
  const base = { plantId: p.id, done: false, monthly: false };
  const emit = (rule: "water" | "feed", title: string, every: (month: number) => number, firstOffset: number) => {
    const last = latestDone(d, `${rule}:${p.id}:`);
    let due = last ? addDays(last, every(monthOf(last))) : addDays(p.planted, firstOffset);
    // Missed several: show one overdue task, not a pile of them.
    if (due < today) {
      out.push({ ...base, id: `${rule}:${p.id}:${due}`, date: due, title, note: "", kind: rule, overdue: true, nudge: rule === "water" ? waterNudge(p, f, due, today) : "" });
      due = addDays(today, every(monthOf(today)));
    }
    for (let i = 0; i < 6 && due <= end; i++) {
      out.push({ ...base, id: `${rule}:${p.id}:${due}`, date: due, title, note: "", kind: rule, overdue: false, nudge: rule === "water" ? waterNudge(p, f, due, today) : "" });
      due = addDays(due, every(monthOf(due)));
    }
  };
  if (!p.onDrip) emit("water", `Water ${p.name}`, (m) => waterInterval(p, crop, m), waterInterval(p, crop, monthOf(p.planted)));
  if (crop && !crop.perennial) emit("feed", `Feed ${p.name}`, () => 28, 21);
  if (crop?.days && p.status === "growing") {
    const open = addDays(p.planted, crop.days[0]);
    const id = `harvest:${p.id}`;
    if (!isDone(d, id) && open <= end) {
      out.push({ ...base, id, date: open, title: `${p.name}: harvest window opens`, note: `Usually ripe by ${crop.days[1]} days after planting.`, kind: "harvest", overdue: open < today && diffDays(today, open) > 14, nudge: "" });
    }
  }
}

/** Tasks due between today (overdue included) and today + horizon, plus what was ticked today. */
export function generateTasks(d: GardenData, f: Forecast | null, today: string, horizon = 7): Task[] {
  const out: Task[] = [];
  for (const p of d.plants) plantTasks(p, d, f, today, horizon, out);
  const end = addDays(today, horizon);
  const chore = { kind: "check" as const, plantId: "", done: false, overdue: false, nudge: "" };

  // Calendar rules: a "this month" chore from the 1st, visible for two weeks.
  for (const offset of [0, 1]) {
    const t = parse(today);
    const first = fmt(new Date(t.getFullYear(), t.getMonth() + offset, 1));
    const ym = first.slice(0, 7);
    const add = (id: string, title: string, note: string) => {
      if (first > end || diffDays(today, first) > 13 || isDone(d, id)) return;
      out.push({ ...chore, id, date: first, title, note, monthly: true });
    };
    add(`drip:${ym}`, "Check the drip system", "Walk the line: leaks, clogged emitters, loose fittings, timer battery.");
    if ([3, 6, 9, 11].includes(monthOf(first))) add(`timer:${ym}`, "Adjust the drip timer for the season", "Winter needs far less water than summer.");
  }

  // Mint regrowth checks: every 2 weeks for 8 weeks after the "pull it out" step is ticked.
  const pull = d.steps.find((s) => s.id === "mint-3");
  if (pull?.done && pull.doneAt) {
    for (let k = 1; k <= 4; k++) {
      const date = addDays(pull.doneAt, 14 * k);
      const id = `mint:${k}`;
      if (date > end || isDone(d, id)) continue;
      out.push({ ...chore, id, date, title: "Check for mint regrowth", note: "Pull new shoots early; follow runners.", overdue: date < today, monthly: false });
    }
  }

  // Tasks ticked today stay on the list so one tap can undo.
  const seen = new Set(out.map((t) => t.id));
  for (const x of d.done) {
    if (x.state !== "open" && x.at === today && !seen.has(x.id)) {
      out.push({ ...chore, id: x.id, date: today, title: x.title, note: "", done: true, monthly: false });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

/** Weather alerts for the next 7 days, naming the plants each one matters for. */
export function weatherAlerts(d: GardenData, f: Forecast | null, today: string): Alert[] {
  if (!f) return [];
  const plants = d.plants.filter(active);
  const names = (pick: (p: Plant) => boolean) => plants.filter(pick).map((p) => p.name);
  const list = (xs: string[]) => (xs.length > 4 ? `${xs.slice(0, 4).join(", ")} and ${xs.length - 4} more` : xs.join(", "));
  const anyDrip = plants.some((p) => p.onDrip);
  const out: Alert[] = [];
  for (const day of f.days) {
    if (day.date < today) continue;
    const when = day.date === today ? "Today" : `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parse(day.date).getDay()]} ${pretty(day.date)}`;
    const tender = names((p) => climateOf(p).heat === "tender");
    if (day.tMaxC >= HOT_C || (tender.length && day.tMaxC >= WARM_C)) {
      const hot = day.tMaxC >= HOT_C;
      const who = hot ? names((p) => climateOf(p).heat !== "tough") : tender;
      out.push({ id: `heat:${day.date}`, date: day.date, kind: "heat", title: `${when}: ${cToF(day.tMaxC)}°F`,
        detail: `Water deeply early that morning or the evening before${who.length ? ` (${list(who)})` : ""}. Mulch bare soil${tender.length ? `; shade cloth for ${list(tender)}` : ""}.${anyDrip && hot ? " Consider an extra drip cycle." : ""}` });
    }
    if (day.tMinC <= FROST_C) {
      const who = names((p) => climateOf(p).frostTender);
      out.push({ id: `frost:${day.date}`, date: day.date, kind: "frost", title: `${when}: low ${cToF(day.tMinC)}°F`,
        detail: `Possible frost on the ground.${who.length ? ` Cover ${list(who)} overnight; water the day before (moist soil holds heat).` : " Nothing tender is planted."}` });
    }
    if (rainy(day)) {
      const who = names((p) => climateOf(p).rainSensitive);
      out.push({ id: `rain:${day.date}`, date: day.date, kind: "rain", title: `${when}: rain about ${mmToIn(day.rainMm)} in (${day.rainProb}%)`,
        detail: `${day.rainMm >= SOAK_MM ? "A good soak: skip watering for a few days" : "Skip the next watering"}${anyDrip ? " and pause the drip timer" : ""}.${who.length ? ` Rain-sensitive: ${list(who)} (pick ripe fruit first, keep leaves dry after).` : ""}` });
    }
    if (day.rhMin <= 20 && day.gustKmh >= 40) {
      const who = names((p) => climateOf(p).windTender);
      out.push({ id: `wind:${day.date}`, date: day.date, kind: "wind", title: `${when}: dry gusty wind`,
        detail: `Santa Ana-type conditions (humidity ${day.rhMin}%, gusts ${Math.round(day.gustKmh / 1.609)} mph): soil and seedlings dry fast. Check the soil daily${who.length ? `; water ${list(who)} first` : ""}.` });
    }
  }
  const et = f.days.reduce((s, x) => s + x.et0Mm, 0);
  const rain = f.days.reduce((s, x) => s + x.rainMm, 0);
  if (plants.length) {
    const need = Math.max(0, et - rain);
    // 1 mm over 1 sq ft is about 0.0245 gal. ET0 is for grass; veg beds use roughly the same, so a guide only.
    out.push({ id: "week", date: today, kind: "week", title: "This week's water",
      detail: `Sun and wind will pull about ${mmToIn(et)} in of water from the beds; rain adds ${mmToIn(rain)} in. ${need > 2 ? `Plan to replace about ${mmToIn(need)} in (about ${(need * 0.0245).toFixed(2)} gal per sq ft of bed).` : "Rain covers it."}` });
  }
  return out;
}

/** Crops that are in their best sowing/planting window this month and not already on the plot. */
export function sowNow(d: GardenData, month: number): Crop[] {
  const have = new Set(d.plants.filter((p) => p.status !== "done").map((p) => p.cropKey));
  return CATALOG.filter((c) => c.opt.includes(month) && !have.has(c.key));
}
