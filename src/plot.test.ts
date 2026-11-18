import assert from "node:assert/strict";
import test from "node:test";
import { dripSize } from "./plot.ts";

test("drip endpoint stretching snaps both dimensions and stays in the plot", () => {
  assert.deepEqual(dripSize(71, 29, 10, 10, 100, 50), { w: 60, h: 20 });
  assert.deepEqual(dripSize(2, 8, 10, 10, 100, 50), { w: 6, h: 2 });
  assert.deepEqual(dripSize(190, 80, 10, 10, 72, 40), { w: 72, h: 40 });
});

test("drip stays inside the plot even with under 6 in of room", () => {
  assert.deepEqual(dripSize(99, 49, 96, 49, 4, 1), { w: 4, h: 1 });
});
