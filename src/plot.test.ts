import assert from "node:assert/strict";
import test from "node:test";
import { dripEnd, dripSize, itemEditsInline } from "./plot.ts";

test("drip endpoint stretching snaps both dimensions and stays in the plot", () => {
  assert.deepEqual(dripSize(71, 29, 10, 10, 100, 50), { w: 60, h: 20 });
  assert.deepEqual(dripSize(2, 8, 10, 10, 100, 50), { w: -6, h: 2 });
  assert.deepEqual(dripSize(2, 2, 10, 10, 100, 50), { w: -6, h: -4 });
  assert.deepEqual(dripSize(18, 2, 10, 10, 100, 50), { w: 6, h: -4 });
  assert.deepEqual(dripSize(190, 80, 10, 10, 72, 40), { w: 62, h: 32 });
});

test("drip stays inside the plot even with under 6 in of room", () => {
  assert.deepEqual(dripSize(99, 49, 96, 49, 100, 50), { w: 4, h: 2 });
});

test("drip handle sits at the far end of the line, matching the drawn endpoint", () => {
  assert.deepEqual(dripEnd(12, 30, 60, 2), { x: 72, y: 30 });
  assert.deepEqual(dripEnd(12, 30, -60, -22), { x: -48, y: 6 });
});

test("a drip line's panel is inline so the full-screen scrim cannot cover its stretch handle", () => {
  assert.equal(itemEditsInline("drip"), true);
  for (const kind of ["bed", "tree", "mint", "path", "container", "trellis", "label"]) assert.equal(itemEditsInline(kind), false);
});
