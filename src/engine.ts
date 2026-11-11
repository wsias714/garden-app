import { CATALOG, cropByKey, seasonFactor } from "./catalog.ts";
import type { Crop } from "./catalog.ts";
import { addDays, diffDays, fmt, monthOf, parse } from "./dates.ts";
import type { GardenData, Plant } from "./sync/types.ts";

/* Pure schedule engine: generateTasks(data, weather, today, horizon) -> Task[].
   Nothing but completions (`done`) is stored, so two phones never conflict over the schedule.
   Rules: interval (water, feed), anchored to planting (harvest window), calendar (monthly drip
   check, seasonal timer adjust), project-anchored (mint regrowth checks). All intervals are
   ASSUMPTIONS from the catalog, tunable later. */

export interface Weather {
  rainSoonMm: number; // max of today/tomorrow forecast
  rainPast48Mm: number;
  maxTempC: number;
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
  nudge: string;
}

const RAIN_SOON_MM = 2.5;
const RAIN_PAST_MM = 6.4;
const HOT_C = 32;

/** Pure rain/heat nudge for a water task due today or earlier. Never skips anything by itself. */
export function waterNudge(w: Weather | null): string {
  if (!w) return "";
  if (w.rainSoonMm >= RAIN_SOON_MM) return "Rain is forecast: check the soil 2 in down before watering.";
  if (w.rainPast48Mm >= RAIN_PAST_MM) return "It rained recently: check the soil 2 in down first.";
  if (w.maxTempC >= HOT_C) return "Hot day: check the soil, and consider mulch or shade.";
  return "";
}

const latestDone = (d: GardenData, prefix: string): string => {
  let best = "";
  for (const x of d.done) if (x.id.startsWith(prefix) && x.state !== "open" && x.at > best) best = x.at;
  return best;
};
const isDone = (d: GardenData, id: string) => d.done.some((x) => x.id === id && x.state !== "open");

function interval(rule: "water" | "feed", crop: Crop | undefined, month: number): number {
  if (rule === "feed") return 28;
  return Math.max(1, Math.round((crop?.water ?? 5) * seasonFactor(month)));
}

function rulesFor(p: Plant, crop: Crop | undefined, d: GardenData, today: string, horizon: number, wx: Weather | null, out: Task[]) {
  if (p.status === "done" || p.status === "planned" || !p.planted) return;
  const end = addDays(today, horizon);
  const emit = (rule: "water" | "feed", title: string, anchor: string, firstOffset: number) => {
    const last = latestDone(d, `${rule}:${p.id}:`);
    let due = last ? addDays(last, interval(rule, crop, monthOf(last))) : addDays(anchor, firstOffset);
    for (let i = 0; i < 6 && due <= end; i++) {
      const id = `${rule}:${p.id}:${due}`;
      const overdue = due < today;
      out.push({
        id, date: due, title, note: "", kind: rule, plantId: p.id, done: false, overdue,
        nudge: rule === "water" && due <= today ? waterNudge(wx) : "",
      });
      due = addDays(due, interval(rule, crop, monthOf(due)));
    }
  };
  emit("water", `Water ${p.name}`, p.planted, interval("water", crop, monthOf(p.planted)));
  if (crop && !crop.perennial) emit("feed", `Feed ${p.name}`, p.planted, 21);
  if (crop?.days && p.status === "growing") {
    const open = addDays(p.planted, crop.days[0]);
    const id = `harvest:${p.id}`;
    if (!isDone(d, id) && open <= end) {
      out.push({
        id, date: open, title: `${p.name}: harvest window opens`, note: `Usually ripe by ${crop.days[1]} days after planting.`,
        kind: "harvest", plantId: p.id, done: false, overdue: open < today && diffDays(today, open) > 14, nudge: "",
      });
    }
  }
}

/** Tasks due between today (overdue included) and today + horizon, plus what was ticked today. */
export function generateTasks(d: GardenData, wx: Weather | null, today: string, horizon = 7): Task[] {
  const out: Task[] = [];
  for (const p of d.plants) rulesFor(p, cropByKey(p.cropKey), d, today, horizon, wx, out);

  const end = addDays(today, horizon);
  // Calendar rules: due the 1st, kept visible for two weeks.
  for (const offset of [0, 1]) {
    const t = parse(today);
    const first = fmt(new Date(t.getFullYear(), t.getMonth() + offset, 1));
    const ym = first.slice(0, 7);
    const add = (id: string, title: string, note: string) => {
      const late = diffDays(today, first);
      if (first > end || late > 13 || isDone(d, id)) return;
      out.push({ id, date: first, title, note, kind: "check", plantId: "", done: false, overdue: false, nudge: "" });
    };
    add(`drip:${ym}`, "Check the drip system", "Walk the line: leaks, clogged emitters, loose fittings, timer battery.");
    const m = monthOf(first);
    if ([3, 6, 9, 11].includes(m)) add(`timer:${ym}`, "Adjust the drip timer for the season", "Winter needs far less water than summer.");
  }

  // Mint regrowth checks: every 2 weeks for 8 weeks after the "pull it out" step is ticked.
  const pull = d.steps.find((s) => s.id === "mint-3");
  if (pull?.done && pull.doneAt) {
    for (let k = 1; k <= 4; k++) {
      const date = addDays(pull.doneAt, 14 * k);
      const id = `mint:${k}`;
      if (date > end || isDone(d, id)) continue;
      out.push({ id, date, title: "Check for mint regrowth", note: "Pull new shoots early; follow runners.", kind: "check", plantId: "", done: false, overdue: date < today, nudge: "" });
    }
  }

  // Tasks ticked today stay on the list so one tap can undo.
  for (const x of d.done) {
    if (x.state !== "open" && x.at === today) {
      out.push({ id: x.id, date: today, title: x.title, note: "", kind: "check", plantId: "", done: true, overdue: false, nudge: "" });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

/** Crops that are in their best sowing/planting window this month and not already on the plot. */
export function sowNow(d: GardenData, month: number): Crop[] {
  const have = new Set(d.plants.filter((p) => p.status !== "done").map((p) => p.cropKey));
  return CATALOG.filter((c) => c.opt.includes(month) && !have.has(c.key));
}
