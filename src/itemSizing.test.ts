import assert from "node:assert/strict";
import { test } from "node:test";
import { sizeStep } from "./itemSizing.ts";

test("beds and containers use two-inch size steps", () => {
  assert.equal(sizeStep("bed"), 2);
  assert.equal(sizeStep("container"), 2);
  assert.equal(sizeStep("tree"), 6);
});
