import assert from "node:assert/strict";
import test from "node:test";
import { mysqlTlsOptions, parseMysqlUrl } from "../src/store.js";

test("parses a complete MySQL URL", () => {
  assert.deepEqual(parseMysqlUrl("mysql://nexflor:tr1gal%40secure@db.example:3307/workshop"), {
    host: "db.example",
    port: 3307,
    user: "nexflor",
    password: "tr1gal@secure",
    database: "workshop",
  });
});

test("rejects malformed or incomplete MySQL URLs with a service-unavailable error", () => {
  for (const value of ["db.example", "mysql://db.example", "https://db.example/workshop"]) {
    assert.throws(
      () => parseMysqlUrl(value),
      (error) => error.status === 503 && error.message.includes("MYSQL_URL"),
    );
  }
});

test("keeps TLS certificate verification enabled by default and supports a trusted CA", () => {
  const ca = "-----BEGIN CERTIFICATE-----\ntrusted-ca\n-----END CERTIFICATE-----";
  assert.deepEqual(mysqlTlsOptions({ MYSQL_SSL_CA: ca }), {
    rejectUnauthorized: true,
    ca,
  });
  assert.deepEqual(mysqlTlsOptions({}), { rejectUnauthorized: true });
  assert.equal(mysqlTlsOptions({ MYSQL_SSL: "false" }), undefined);
});

test("allows self-signed MySQL certificates only when explicitly enabled", () => {
  assert.deepEqual(mysqlTlsOptions({ MYSQL_SSL_ALLOW_SELF_SIGNED: "true" }), {
    rejectUnauthorized: false,
  });
  assert.deepEqual(mysqlTlsOptions({ MYSQL_SSL_ALLOW_SELF_SIGNED: "1" }), {
    rejectUnauthorized: true,
  });
});
