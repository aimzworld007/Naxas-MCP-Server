import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertProjectAccess,
  assertWriteAccess,
  actorId,
  createAuthenticator,
  samePrincipal,
  tokenSha256
} from "../src/security/users.js";

const ownerToken = "o".repeat(43);
const aliceToken = "a".repeat(43);
const bobToken = "b".repeat(43);
const projects = ["naxas", "other"] as const;

function authenticator() {
  return createAuthenticator(ownerToken, projects, JSON.stringify({
    alice: { tokenSha256: tokenSha256(aliceToken), projects: ["naxas"] },
    bob: { tokenSha256: tokenSha256(bobToken), projects: ["other"], writeEnabled: true }
  }));
}

test("legacy owner remains authorized for every project", () => {
  const authenticate = authenticator();
  const owner = authenticate(ownerToken);
  assert.ok(owner);
  assert.equal(owner.kind, "owner");
  assert.equal(actorId(owner), "owner:owner");
  assertProjectAccess(owner, "naxas");
  assertProjectAccess(owner, "other");
  assertWriteAccess(owner);
});

test("users have isolated project and write permissions", () => {
  const authenticate = authenticator();
  const alice = authenticate(aliceToken);
  const bob = authenticate(bobToken);
  assert.ok(alice && bob);
  assertProjectAccess(alice, "naxas");
  assert.equal(actorId(alice), "user:alice");
  assert.throws(() => assertProjectAccess(alice, "other"), /unauthorized/);
  assert.throws(() => assertWriteAccess(alice), /disabled/);
  assertProjectAccess(bob, "other");
  assert.throws(() => assertProjectAccess(bob, "naxas"), /unauthorized/);
  assertWriteAccess(bob);
  assert.equal(authenticate("invalid"), undefined);
  assert.equal(samePrincipal(alice, bob), false);
  assert.equal(samePrincipal(alice, authenticate(aliceToken)!), true);
  assert.equal(samePrincipal(alice, authenticate(ownerToken)!), false);
});

test("invalid or ambiguous user configuration fails at startup", () => {
  assert.throws(() => createAuthenticator(ownerToken, projects, "{"), /valid JSON/);
  assert.throws(() => createAuthenticator(ownerToken, projects, JSON.stringify({
    alice: { tokenSha256: tokenSha256(aliceToken), projects: ["missing"] }
  })), /unknown project/);
  assert.throws(() => createAuthenticator(ownerToken, projects, JSON.stringify({
    alice: { tokenSha256: tokenSha256(aliceToken), projects: ["naxas", "naxas"] }
  })), /repeats a project/);
  assert.throws(() => createAuthenticator(ownerToken, projects, JSON.stringify({
    alice: { tokenSha256: tokenSha256(ownerToken), projects: ["naxas"] }
  })), /duplicate bearer token hash/);
  assert.throws(() => createAuthenticator(ownerToken, projects, JSON.stringify({
    alice: { tokenSha256: tokenSha256(aliceToken), projects: ["naxas"] },
    bob: { tokenSha256: tokenSha256(aliceToken), projects: ["other"] }
  })), /duplicate bearer token hash/);
  assert.throws(() => createAuthenticator(ownerToken, projects, JSON.stringify({
    alice: { token: aliceToken, projects: ["naxas"] }
  })));
});
