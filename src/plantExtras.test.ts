import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PHOTOS, addPhoto, sizeUp } from "./plantExtras.ts";
import type { MapItem, Plant } from "./sync/types.ts";

const box = (extra: Partial<MapItem> = {}): MapItem => ({ id: "i", kind: "container", label: "Pot", x: 0, y: 0, w: 12, h: 12, updated: 1, ...extra });
const plant = (extra: Partial<Plant> = {}): Plant => ({ id: "p", name: "Basil", cropKey: "", itemId: "", x: 0, y: 0, planted: "", status: "growing", notes: "", updated: 1, ...extra });

test("size up starts from the current size, then grows the replacement by 2 inches", () => {
  assert.equal(sizeUp(box()).replaceW, 14);
  assert.equal(sizeUp(box({ replaceW: 18 })).replaceW, 20);
});

test("photos are tagged to the plant, newest first, capped", () => {
  let p = plant();
  for (let i = 0; i < MAX_PHOTOS + 2; i++) p = addPhoto(p, `data:${i}`, "2026-11-18");
  assert.equal(p.photos!.length, MAX_PHOTOS);
  assert.equal(p.photos![0].data, `data:${MAX_PHOTOS + 1}`);
});
