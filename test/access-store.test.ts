import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AccessStore } from "../src/security/access-store.js";
import { assertProjectAccess, assertWriteAccess } from "../src/security/users.js";

test("dashboard grants persist, limit writes by project, and revoke rotated tokens", () => {
  const dir = mkdtempSync(join(tmpdir(), "naxas-access-"));
  try {
    const file = join(dir, "access.json");
    const owner = "o".repeat(43);
    const store = new AccessStore(owner, ["01", "02"], file);
    const token = store.create("alice", ["01", "02"], ["02"]);
    const principal = store.authenticate(token);
    assert.ok(principal);
    assertProjectAccess(principal, "01");
    assertWriteAccess(principal, "02");
    assert.throws(() => assertWriteAccess(principal, "01"), /disabled/);
    assert.throws(() => store.update("alice", ["01"], ["02"]), /invalid write projects/);
    assertProjectAccess(store.authenticate(token)!, "02");
    const restarted = new AccessStore(owner, ["01", "02"], file);
    assert.ok(restarted.authenticate(token));
    restarted.update("alice", ["01"], []);
    assert.deepEqual(restarted.list()[0].projects, ["01"]);
    const replacement = restarted.rotate("alice");
    assert.equal(restarted.authenticate(token), undefined);
    assert.ok(restarted.authenticate(replacement));
    restarted.remove("alice");
    assert.equal(restarted.authenticate(replacement), undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
