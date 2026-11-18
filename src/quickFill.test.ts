import assert from "node:assert/strict";
import test from "node:test";
import { FLAG_LABEL, flaggedPlants, quickPlant } from "./quickFill.ts";
import type { Plant } from "./sync/types.ts";

test("quick fill matches a catalog crop by name, ignoring case and spaces", () => {
  const p = quickPlant("  LETTUCE ", "2026-11-18");
  assert.equal(p.cropKey, "lettuce");
  assert.equal(p.status, "growing");
  assert.equal(p.planted, "2026-11-18");
});

test("quick fill makes a custom plant when nothing matches", () => {
  const p = quickPlant("Mystery vine", "2026-11-18");
  assert.equal(p.cropKey, "");
  assert.equal(p.name, "Mystery vine");
});

test("flagged plants lists weeding and replant, skips done and unflagged", () => {
  const base = quickPlant("Lettuce", "2026-11-18");
  const list: Plant[] = [
    { ...base, id: "a", flag: "weeding" },
    { ...base, id: "b", flag: "replant" },
    { ...base, id: "c" },
    { ...base, id: "d", flag: "weeding", status: "done" },
  ];
  assert.deepEqual(flaggedPlants(list).map((p) => p.id), ["a", "b"]);
  assert.equal(FLAG_LABEL.weeding, "Needs weeding");
});
