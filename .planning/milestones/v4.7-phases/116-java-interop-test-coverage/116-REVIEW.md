---
phase: 116-java-interop-test-coverage
reviewed: 2026-09-28T13:48:09Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-scope-local.ts
  - bbj-vscode/src/language/bbj-scope.ts
  - bbj-vscode/src/language/configuration-change-handler.ts
  - bbj-vscode/src/language/java-class-refresh.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/test/bbj-test-module.ts
  - bbj-vscode/test/config-hot-reload-wiring.test.ts
  - bbj-vscode/test/config-path-resolution.test.ts
  - bbj-vscode/test/configuration-change-handler.test.ts
  - bbj-vscode/test/interop-config.test.ts
  - bbj-vscode/test/interop-harness-fake-peer.ts
  - bbj-vscode/test/java-class-refresh.test.ts
  - bbj-vscode/test/java-interop-socket.test.ts
  - bbj-vscode/test/linking.test.ts
  - bbj-vscode/test/loopback-jsonrpc-peer.ts
  - bbj-vscode/test/parser.test.ts
  - bbj-vscode/test/scope-cost-regression.test.ts
  - bbj-vscode/test/test-helper.test.ts
  - bbj-vscode/test/test-helper.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 116: Code Review Report

**Reviewed:** 2026-09-28T13:48:09Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

This phase (a) extracts `main.ts`'s inline `onDidChangeConfiguration` body and the
`bbj/refreshJavaClasses` reload sequence into two new, independently-testable modules
(`configuration-change-handler.ts`, `java-class-refresh.ts`), (b) adds a hardened, real-JSON-RPC
BBj-test gate (`isInteropPeerAnswering`/`shouldRunBBjTests`) that replaces a bare-TCP-connect
probe, (c) adds a real loopback JSON-RPC test peer (`loopback-jsonrpc-peer.ts`) used both by the
interop harness fixtures and a new `JavaInteropService` socket-level test suite, and (d) fixes two
real linking/validation defects surfaced while writing that coverage: issue #660 (Java primitive
type names in field/parameter/return position never linked) and an Object-typed receiver
(`java.lang.Object`) being incorrectly flagged for "unknown member" on the linking-error path.

I traced the `main.ts` → `configuration-change-handler.ts`/`java-class-refresh.ts` extraction
line-by-line against the pre-extraction body and confirm it is behavior-neutral (order of every
side effect, every message string, and the pre/post-`workspaceInitialized` branching are
identical); the accompanying structural "grep the source" tests in
`config-hot-reload-wiring.test.ts`, `config-path-resolution.test.ts`, and `interop-config.test.ts`
were re-pointed at the new file correctly and match the actual call-site counts I verified by hand.
I also traced the `#660` primitive-resolution fix (`bbj-scope-local.ts` + `bbj-scope.ts`) against
`JAVA_PRIMITIVE_TYPE_NAMES`/`isLocalJavaTypeName`/`localJavaTypeDto` in the (unchanged)
`java-interop.ts` and confirm the local-resolution path never touches `connect()` or the network,
matching the hermeticity claims made in code comments and test-double code. `npx tsc --noEmit`,
`npx eslint` (all 20 files), and a targeted `vitest run` of all ten affected/new test files (396
passed, 2 pre-existing/unrelated skips) all pass cleanly. No hardcoded secrets, no dangerous
functions, no empty catch blocks, and no leaked planning-artifact IDs (`D-NN`, `TEST-NN`, `CR-/WR-
NN`, `plan 0N`, `phase 116`) were found in any added source or test comment.

Only one substantive issue surfaced: a test-only TOCTOU port-reuse race in the new
`unusedLoopbackPort()` helper (Warning). One minor doc-comment precision nit is also listed as
Info.

## Warnings

### WR-01: `unusedLoopbackPort()` has a check-then-use race that can flake a test on a busy CI host

**File:** `bbj-vscode/test/loopback-jsonrpc-peer.ts:139-144`
**Issue:** `unusedLoopbackPort()` binds a throwaway peer to ephemeral port `0`, reads the OS-assigned
port, closes the peer, and returns that port number as "a loopback port with nothing listening on
it." Between the `close()` call and the caller's own use of the returned port (e.g.
`java-interop-socket.test.ts`'s "a refused connection settles..." tests, which rely on the port
staying unused so the subsequent `connect()` genuinely gets `ECONNREFUSED`), the OS is free to hand
that same port number to an unrelated process or another concurrent test worker. On a quiet
developer machine or a lightly loaded CI runner the window is small enough to never trigger, but on
a saturated CI host running many vitest workers in parallel it is a plausible source of rare,
hard-to-reproduce flakes in the "refused connection" and "closed port" tests (the assertion would
then fail because the connection unexpectedly succeeds instead of refusing).
**Fix:** Either keep the throwaway server listening for the duration of the port's use and close it
only when the test itself is done with it (i.e. return a handle, not a bare port number), or accept
the ECONNREFUSED assertion is best-effort and note the residual flake risk explicitly in the doc
comment so a future flaky-test investigation isn't spent rediscovering it. A minimal fix that keeps
the current API shape:
```ts
export async function unusedLoopbackPort(): Promise<number> {
  const probe = await startLoopbackPeer();
  const port = probe.port;
  await probe.close();
  // NOTE: best-effort only — the OS may reassign `port` to another process before the caller
  // connects to it. Acceptable for this suite's low concurrency, but not airtight.
  return port;
}
```

## Info

### IN-01: `isUniversalObjectReceiver` skip comment says "Warning" path but the suppressed diagnostic is pushed as `'error'`

**File:** `bbj-vscode/src/language/bbj-document-validator.ts:473-493`
**Issue:** The comment introducing `skipUniversalObjectReceiver` says this mirrors
`isUniversalObjectReceiver`'s rationale "applied here to the linking-Warning path too," but
`processLinkingErrors` pushes every non-suppressed entry via
`diagnostics.push(this.toDiagnostic('error', message, info))` (line 528) — i.e. this is the
linking-**Error** path (`DocumentValidator.LinkingError`), not a Warning-severity path. The
suppression logic itself is correct (confirmed against the new `linking.test.ts` cases for
`java.lang.Object` vs. `java.lang.String` receivers), so this is a comment-wording nit only, not a
behavioral defect.
**Fix:** Reword the comment, e.g. "...applied here to the linking-error diagnostic path too" to
avoid a future reader assuming there is a separate Warning-severity code path being touched.

---

_Reviewed: 2026-09-28T13:48:09Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
