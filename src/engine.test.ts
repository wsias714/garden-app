import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTasks, sowNow, waterNudge } from "./engine.ts";
import { emptyData } from "./seed.ts";
import type { GardenData, Plant } from "./sync/types.ts";

const lettuce = (planted: string): Plant => ({ id: "p1", name: "Lettuce", cropKey: "lettuce", itemId: "", x: 0, y: 0, planted, status: "growing", notes: "", updated: 1 });
const data = (...p: Plant[]): GardenData => ({ ...emptyData(), plants: p });

test("planned or unplanted plants make no care tasks", () => {
  assert.equal(generateTasks(data({ ...lettuce(""), status: "planned" }), null, "2026-11-10", 7).filter((t) => t.plantId).length, 0);
});

test("water interval is season-adjusted and recurs", () => {
  // lettuce: 3 days, November factor 1.5 -> 4 or 5 days
  const t = generateTasks(data(lettuce("2026-11-08")), null, "2026-11-10", 14).filter((x) => x.kind === "water");
  assert.ok(t.length >= 2);
  assert.equal(t[0].date, "2026-11-13");
});

test("completing a water task moves the next one", () => {
  const d = data(lettuce("2026-11-01"));
  const first = generateTasks(d, null, "2026-11-10", 7).find((x) => x.kind === "water")!;
  assert.equal(first.overdue, true);
  const d2 = { ...d, done: [{ id: first.id, at: "2026-11-10", state: "done" as const, title: first.title, updated: 1 }] };
  const next = generateTasks(d2, null, "2026-11-10", 7).filter((x) => x.kind === "water" && !x.done);
  assert.ok(next.every((x) => x.date > "2026-11-10"));
  assert.ok(generateTasks(d2, null, "2026-11-10", 7).some((x) => x.done), "ticked task stays visible today");
});

test("harvest window opens at the catalog's first day", () => {
  const t = generateTasks(data(lettuce("2026-11-01")), null, "2026-11-10", 60).find((x) => x.kind === "harvest")!;
  assert.equal(t.date, "2026-12-16");
});

test("rain nudge, never a skip", () => {
  assert.match(waterNudge({ rainSoonMm: 5, rainPast48Mm: 0, maxTempC: 20 }), /Rain/);
  assert.equal(waterNudge({ rainSoonMm: 0, rainPast48Mm: 0, maxTempC: 20 }), "");
  const d = data(lettuce("2026-11-01"));
  const t = generateTasks(d, { rainSoonMm: 5, rainPast48Mm: 0, maxTempC: 20 }, "2026-11-10", 7).find((x) => x.kind === "water")!;
  assert.ok(t.nudge && !t.done);
});

test("mint regrowth checks start after the pull step is ticked", () => {
  const d = emptyData();
  assert.equal(generateTasks(d, null, "2026-11-10", 60).some((t) => t.id.startsWith("mint:")), false);
  d.steps = d.steps.map((s) => (s.id === "mint-3" ? { ...s, done: true, doneAt: "2026-11-08" } : s));
  assert.equal(generateTasks(d, null, "2026-11-10", 60).find((t) => t.id === "mint:1")?.date, "2026-11-22");
});

test("monthly drip check appears on the 1st and stays two weeks", () => {
  assert.ok(generateTasks(emptyData(), null, "2026-11-05", 7).some((t) => t.id === "drip:2026-11"));
  assert.ok(!generateTasks(emptyData(), null, "2026-11-20", 7).some((t) => t.id === "drip:2026-11"));
});

test("sow now lists optimal crops not already planted", () => {
  const names = sowNow(data(lettuce("2026-11-01")), 11).map((c) => c.key);
  assert.ok(names.includes("kale"));
  assert.ok(!names.includes("lettuce"));
  assert.ok(!names.includes("tomato"));
});
