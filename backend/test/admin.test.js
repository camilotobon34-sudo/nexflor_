import assert from "node:assert/strict";
import test from "node:test";
import { removePersonFromDb } from "../src/admin.js";
import { isActiveWorker } from "../src/auth.js";

test("removing a worker deactivates login but preserves their audit progress", () => {
  const worker = {
    id: "nexflor-qa",
    active: true,
    completedLessons: ["safe-preparation:puesto"],
    attempts: [{ courseId: "safe-preparation", score: 2 }],
  };
  const db = {
    team: [{ id: worker.id, name: "QA worker" }],
    workers: [worker],
  };

  assert.deepEqual(removePersonFromDb(db, worker.id), { ok: true });
  assert.equal(db.team.length, 0);
  assert.equal(worker.active, false);
  assert.equal(isActiveWorker(worker), false);
  assert.deepEqual(worker.completedLessons, ["safe-preparation:puesto"]);
  assert.equal(worker.attempts.length, 1);
});
