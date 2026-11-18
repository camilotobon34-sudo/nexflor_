import assert from "node:assert/strict";
import test from "node:test";
import { getProgressStages } from "../src/progressStages.js";

test("starts at zero and reaches all ten stages at full completion", () => {
  assert.deepEqual(getProgressStages(0, 23), { completed: 0, total: 10, percent: 0 });
  assert.deepEqual(getProgressStages(23, 23), { completed: 10, total: 10, percent: 100 });
});

test("maps total lesson completion into ten cumulative milestones", () => {
  assert.equal(getProgressStages(1, 10).completed, 1);
  assert.equal(getProgressStages(9, 10).completed, 9);
  assert.equal(getProgressStages(3, 23).completed, 1);
});

test("handles empty totals and clamps invalid completion counts", () => {
  assert.equal(getProgressStages(4, 0).completed, 0);
  assert.equal(getProgressStages(-2, 10).completed, 0);
  assert.equal(getProgressStages(20, 10).completed, 10);
});
