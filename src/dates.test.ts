import test from "node:test";
import assert from "node:assert/strict";
import { validDate } from "./dates.ts";

test("validDate accepts real calendar dates only", () => {
  assert.equal(validDate("2026-11-24"), true);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate(""), false);
  assert.equal(validDate("11/24/2026"), false);
});
