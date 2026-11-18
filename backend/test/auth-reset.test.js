import assert from "node:assert/strict";
import test from "node:test";
import { applyAdminPasswordReset, checkPassword, hashPassword } from "../src/auth.js";

test("resets only Camilo once for a unique reset identifier", () => {
  const originalPassword = "old-admin-password";
  const db = {
    admins: [
      { id: "camilo", passwordHash: hashPassword(originalPassword) },
      { id: "emiliano", passwordHash: hashPassword(originalPassword) },
    ],
  };
  const nextPassword = "a-new-admin-password-2026";

  assert.equal(applyAdminPasswordReset(db, "camilo", "camilo-reset-2026-11", nextPassword), true);
  assert.equal(checkPassword(nextPassword, db.admins[0].passwordHash), true);
  assert.equal(checkPassword(originalPassword, db.admins[1].passwordHash), true);

  const savedHash = db.admins[0].passwordHash;
  assert.equal(applyAdminPasswordReset(db, "camilo", "camilo-reset-2026-11", "another-password-2026"), false);
  assert.equal(db.admins[0].passwordHash, savedHash);
});

test("rejects a weak reset password without changing the account", () => {
  const db = {
    admins: [{ id: "camilo", passwordHash: hashPassword("old-admin-password") }],
  };
  const savedHash = db.admins[0].passwordHash;

  assert.throws(
    () => applyAdminPasswordReset(db, "camilo", "camilo-reset-2026-11", "shortpass"),
    (error) => error.status === 503,
  );
  assert.equal(db.admins[0].passwordHash, savedHash);
  assert.equal(db.adminPasswordResetId, undefined);
});
