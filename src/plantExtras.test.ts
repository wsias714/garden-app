import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PHOTOS, addPhoto, sizeUp } from "./plantExtras.ts";
import type { MapItem } from "./sync/types.ts";

const box = (extra: Partial<MapItem> = {}): MapItem => ({ id: "i", kind: "container", label: "Pot", x: 0, y: 0, w: 12, h: 12, updated: 1, ...extra });

test("size up starts from the current size, then grows the replacement by 2 inches", () => {
  assert.equal(sizeUp(box()).replaceW, 14);
  assert.equal(sizeUp(box({ replaceW: 18 })).replaceW, 20);
});

test("photos are tagged per plant, newest first, capped", () => {
  let all = {};
  for (let i = 0; i < MAX_PHOTOS + 2; i++) all = addPhoto(all, "p", `data:${i}`, "2026-11-18");
  all = addPhoto(all, "q", "other", "2026-11-18");
  const a = all as Record<string, { data: string }[]>;
  assert.equal(a.p.length, MAX_PHOTOS);
  assert.equal(a.p[0].data, `data:${MAX_PHOTOS + 1}`);
  assert.equal(a.q.length, 1);
});
