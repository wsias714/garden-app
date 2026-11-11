import assert from "node:assert/strict";
import { test } from "node:test";
import { climateOf, generateTasks, sowNow, waterInterval, weatherAlerts } from "./engine.ts";
import type { Forecast, ForecastDay } from "./engine.ts";
import { cropByKey } from "./catalog.ts";
import { emptyData } from "./seed.ts";
import type { GardenData, Plant } from "./sync/types.ts";
import { addDays } from "./dates.ts";
import { parseForecast } from "./weather.ts";

const lettuce = (planted: string, extra: Partial<Plant> = {}): Plant => ({ id: "p1", name: "Lettuce", cropKey: "lettuce", itemId: "", x: 0, y: 0, planted, status: "growing", notes: "", updated: 1, ...extra });
const tomato = (planted: string): Plant => ({ ...lettuce(planted), id: "p2", name: "Tomato", cropKey: "tomato" });
const data = (...p: Plant[]): GardenData => ({ ...emptyData(), plants: p });
const day = (date: string, x: Partial<ForecastDay> = {}): ForecastDay => ({ date, rainMm: 0, rainProb: 0, tMaxC: 22, tMinC: 12, et0Mm: 3, rhMin: 50, gustKmh: 10, ...x });
const week = (start: string, patch: Record<number, Partial<ForecastDay>> = {}): Forecast => ({
  pastRainMm: 0, days: Array.from({ length: 7 }, (_, i) => day(addDays(start, i), patch[i] ?? {})),
});

test("planned or unplanted plants make no care tasks", () => {
  assert.equal(generateTasks(data({ ...lettuce(""), status: "planned" }), null, "2026-11-10", 7).filter((t) => t.plantId).length, 0);
});

test("water interval is season-adjusted and recurs", () => {
  const t = generateTasks(data(lettuce("2026-11-08")), null, "2026-11-10", 14).filter((x) => x.kind === "water");
  assert.ok(t.length >= 2);
  assert.equal(t[0].date, "2026-11-13");
});

test("a long-missed plant shows one overdue water task, not a pile", () => {
  const t = generateTasks(data(lettuce("2026-09-01")), null, "2026-11-10", 7).filter((x) => x.kind === "water");
  assert.equal(t.filter((x) => x.overdue).length, 1);
  assert.ok(t.filter((x) => !x.overdue).every((x) => x.date > "2026-11-10"));
});

test("completing a water task moves the next one and stays visible today", () => {
  const d = data(lettuce("2026-11-01"));
  const first = generateTasks(d, null, "2026-11-10", 7).find((x) => x.kind === "water")!;
  const d2 = { ...d, done: [{ id: first.id, at: "2026-11-10", state: "done" as const, title: first.title, updated: 1 }] };
  const all = generateTasks(d2, null, "2026-11-10", 7);
  assert.ok(all.filter((x) => x.kind === "water" && !x.done).every((x) => x.date > "2026-11-10"));
  assert.equal(all.filter((x) => x.done).length, 1);
});

test("a plant's own interval and drip setting override the default", () => {
  assert.equal(waterInterval(lettuce("2026-11-01", { waterEveryDays: 9 }), cropByKey("lettuce"), 11), 9);
  assert.ok(waterInterval(lettuce("2026-11-01", { sun: "shade" }), cropByKey("lettuce"), 11) > waterInterval(lettuce("2026-11-01"), cropByKey("lettuce"), 11));
  const t = generateTasks(data(lettuce("2026-11-01", { onDrip: true })), null, "2026-11-10", 14);
  assert.equal(t.filter((x) => x.kind === "water").length, 0);
});

test("climate: catalog defaults, plant overrides win", () => {
  assert.equal(climateOf(lettuce("")).heat, "tender");
  assert.equal(climateOf(tomato("")).frostTender, true);
  assert.equal(climateOf(lettuce("", { heatTolerance: "tough", heatPlan: "Move the pot" })).heat, "tough");
  assert.equal(climateOf(lettuce("", { heatPlan: "Move the pot" })).heatCare, "Move the pot");
});

test("harvest window opens at the catalog's first day", () => {
  assert.equal(generateTasks(data(lettuce("2026-11-01")), null, "2026-11-10", 60).find((x) => x.kind === "harvest")!.date, "2026-12-16");
});

test("rain in the forecast nudges a water task, never skips it", () => {
  const d = data(lettuce("2026-11-08"));
  const due = generateTasks(d, null, "2026-11-10", 7).find((x) => x.kind === "water")!.date;
  const f = week("2026-11-10", { [3]: { rainMm: 9, rainProb: 80 } }); // 11-13 = due date
  assert.equal(due, "2026-11-13");
  const t = generateTasks(d, f, "2026-11-10", 7).find((x) => x.kind === "water")!;
  assert.match(t.nudge, /Rain/);
  assert.equal(t.done, false);
});

test("weather alerts: heat names tender plants, frost names frost-tender, rain, wind, week", () => {
  const f = week("2026-11-10", { 1: { tMaxC: 34 }, 2: { tMinC: 1 }, 3: { rainMm: 14, rainProb: 90 }, 4: { rhMin: 12, gustKmh: 55 } });
  const a = weatherAlerts(data(lettuce("2026-11-01"), tomato("2026-11-01")), f, "2026-11-10");
  const by = (k: string) => a.find((x) => x.kind === k)!;
  assert.match(by("heat").detail, /Lettuce/);
  assert.match(by("frost").detail, /Tomato/);
  assert.match(by("rain").detail, /soak/);
  assert.match(by("wind").detail, /Santa Ana/);
  assert.ok(by("week"));
});

test("a mild week with nothing planted has no alerts", () => {
  assert.equal(weatherAlerts(emptyData(), week("2026-11-10"), "2026-11-10").length, 0);
});

test("forecast parsing splits the two past days off", () => {
  const n = 9;
  const z = (v: number) => Array(n).fill(v);
  const f = parseForecast({
    time: Array.from({ length: n }, (_, i) => addDays("2026-11-08", i)),
    precipitation_sum: [3, 4, 0, 0, 0, 0, 0, 0, 0], precipitation_probability_max: z(0), temperature_2m_max: z(20),
    temperature_2m_min: z(10), et0_fao_evapotranspiration: z(3), relative_humidity_2m_min: z(50), wind_gusts_10m_max: z(10),
  });
  assert.equal(f.pastRainMm, 7);
  assert.equal(f.days.length, 7);
  assert.equal(f.days[0].date, "2026-11-10");
});

test("mint regrowth checks start after the pull step is ticked", () => {
  const d = emptyData();
  assert.equal(generateTasks(d, null, "2026-11-10", 60).some((t) => t.id.startsWith("mint:")), false);
  d.steps = d.steps.map((s) => (s.id === "mint-3" ? { ...s, done: true, doneAt: "2026-11-08" } : s));
  assert.equal(generateTasks(d, null, "2026-11-10", 60).find((t) => t.id === "mint:1")?.date, "2026-11-22");
});

test("monthly drip check is a 'this month' chore for two weeks", () => {
  const t = generateTasks(emptyData(), null, "2026-11-05", 7).find((x) => x.id === "drip:2026-11")!;
  assert.equal(t.monthly, true);
  assert.ok(!generateTasks(emptyData(), null, "2026-11-20", 7).some((x) => x.id === "drip:2026-11"));
});

test("sow now lists optimal crops not already planted", () => {
  const names = sowNow(data(lettuce("2026-11-01")), 11).map((c) => c.key);
  assert.ok(names.includes("kale") && !names.includes("lettuce") && !names.includes("tomato"));
});
