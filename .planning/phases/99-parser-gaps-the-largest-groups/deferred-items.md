# Phase 99 — Deferred Items

Out-of-scope discoveries found during plan execution, logged per the executor's scope boundary
(not fixed, not part of this phase's tasks).

## From plan 01

- **`test/functional/installed-extension-e2e.test.ts` > "installed extension e2e: SETOPTS-in-code
  (#475)"** fails the whole suite run with `Error: No document found for URI:
  file:///home/coder/repos/bbj-language-server/examples/issue475-setopts-in-code.bbj`. Reproduced
  in isolation (`npx vitest run test/functional/installed-extension-e2e.test.ts --maxWorkers=1`),
  so it is not a contention artifact. This suite is gated by `installPresent` and drives an
  already-installed VS Code extension bundle over its own language-server connection — unrelated
  to this plan's single-rule grammar edit (`LastVerifyOption`'s `LEN=` unfuse) and to SETOPTS
  handling. The installed extension bundle predates this plan's source change (no rebuild/install
  was run as part of this plan's tasks); root cause is most likely a stale or unsynced installed
  bundle, not a regression this plan introduced. Out of scope for a grammar-only plan; flagged for
  the orchestrator/phase owner.
