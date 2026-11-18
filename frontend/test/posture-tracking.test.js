import assert from "node:assert/strict";
import test from "node:test";
import { chooseTrackedPose } from "../src/postureTracking.js";

test("selects the most confident tracked person when tracking starts", () => {
  const first = { id: 1, score: 0.72 };
  const second = { id: 2, score: 0.94 };

  assert.deepEqual(chooseTrackedPose([first, second], null), { pose: second, trackId: 2 });
});

test("keeps the selected person instead of switching to another visible person", () => {
  const first = { id: 1, score: 0.99 };
  const selected = { id: 2, score: 0.61 };

  assert.deepEqual(chooseTrackedPose([first, selected], 2), { pose: selected, trackId: 2 });
  assert.deepEqual(chooseTrackedPose([first], 2), { pose: null, trackId: 2 });
});

test("does not claim a track when poses have no tracker IDs", () => {
  const pose = { score: 1 };

  assert.deepEqual(chooseTrackedPose([pose], null), { pose: null, trackId: null });
});
