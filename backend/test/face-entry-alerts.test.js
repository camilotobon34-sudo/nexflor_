import assert from "node:assert/strict";
import test from "node:test";
import { recordEntryAlert } from "../src/faceStore.js";

test("records an administrator alert for an authorized entry", () => {
  const db = { faceAlerts: [] };
  const event = {
    id: "access-1",
    at: 123,
    access: "permitido",
    personId: "person-1",
    name: "Ana Trigal",
    documentId: "123456",
  };

  recordEntryAlert(db, event);

  assert.equal(db.faceAlerts.length, 1);
  assert.equal(db.faceAlerts[0].kind, "ingreso");
  assert.equal(db.faceAlerts[0].at, event.at);
  assert.equal(db.faceAlerts[0].name, event.name);
  assert.equal(db.faceAlerts[0].documentId, event.documentId);
  assert.equal(db.faceAlerts[0].reviewed, false);
});

test("does not create administrator entry alerts for denied access", () => {
  const db = { faceAlerts: [] };

  recordEntryAlert(db, { access: "denegado", at: 123, name: "Persona no reconocida" });

  assert.deepEqual(db.faceAlerts, []);
});
