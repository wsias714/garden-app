import assert from "node:assert/strict";
import { test } from "node:test";
import { newStep, nextOrder, projectKeys, projectName } from "./projects.ts";
import type { Step } from "./sync/types.ts";

const starters = { mint: "Clear the mint", drip: "Set up the drip" };
const st = (id: string, project: string, order: number): Step => ({ id, project, title: id, note: "", done: false, doneAt: "", order, updated: 0 });

test("user lists follow the starter lists, which stay even when emptied", () => {
  const steps = [st("a", "u:Shopping", 5), st("b", "u:Chores", 2), st("c", "u:Shopping", 6)];
  assert.deepEqual(projectKeys(steps, starters), ["mint", "drip", "u:Chores", "u:Shopping"]);
});

test("project names", () => {
  assert.equal(projectName("mint", starters), "Clear the mint");
  assert.equal(projectName("u:Shopping", starters), "Shopping");
});

test("new steps go last, with a trimmed title and no list required", () => {
  assert.equal(nextOrder([]), 0);
  const steps = [st("a", "mint", 3)];
  const s = newStep("mint", "  buy twine ", steps, "x1");
  assert.equal(s.order, 4);
  assert.equal(s.title, "buy twine");
});
