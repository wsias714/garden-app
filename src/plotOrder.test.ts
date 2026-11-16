import assert from "node:assert/strict";
import { test } from "node:test";
import { bedsUnder } from "./plotOrder.ts";
import type { MapItem } from "./sync/types.ts";

const item = (id: string, kind: MapItem["kind"]): MapItem => ({ id, kind, label: id, x: 0, y: 0, w: 1, h: 1, updated: 0 });

test("beds render below other plot items without mutating input order", () => {
  const source = [item("drip", "drip"), item("bed-1", "bed"), item("bed-2", "bed"), item("tree", "tree")];
  const ordered = bedsUnder(source);
  assert.deepEqual(ordered.map((x) => x.id), ["bed-1", "bed-2", "drip", "tree"]);
  assert.deepEqual(source.map((x) => x.id), ["drip", "bed-1", "bed-2", "tree"]);
});
