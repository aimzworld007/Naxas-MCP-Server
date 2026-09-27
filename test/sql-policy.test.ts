import test from "node:test";
import assert from "node:assert/strict";
import { assertReadQuery, assertWriteQuery } from "../src/security/sql-policy.js";

test("read policy accepts safe reads", () => {
  assert.doesNotThrow(() => assertReadQuery("SELECT 1"));
  assert.doesNotThrow(() => assertReadQuery("WITH x AS (SELECT 1) SELECT * FROM x"));
  assert.doesNotThrow(() => assertReadQuery("EXPLAIN SELECT * FROM users"));
});

test("read policy rejects writes or chained destructive statements", () => {
  assert.throws(() => assertReadQuery("UPDATE users SET active = true"));
  assert.throws(() => assertReadQuery("SELECT 1; DROP TABLE users"));
});

test("write policy accepts one DML statement", () => {
  assert.doesNotThrow(() => assertWriteQuery("INSERT INTO t(a) VALUES ($1)"));
  assert.doesNotThrow(() => assertWriteQuery("UPDATE t SET a = $1 WHERE id = $2"));
  assert.doesNotThrow(() => assertWriteQuery("DELETE FROM t WHERE id = $1"));
});

test("write policy rejects unsafe classes", () => {
  assert.throws(() => assertWriteQuery("DROP TABLE t"));
  assert.throws(() => assertWriteQuery("GRANT ALL ON t TO x"));
  assert.throws(() => assertWriteQuery("BEGIN"));
  assert.throws(() => assertWriteQuery("UPDATE t SET a=1; DELETE FROM t"));
});
