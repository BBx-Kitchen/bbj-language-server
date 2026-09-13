---
phase: 85-config-hot-reload-with-restart-coalescing
fixed_at: 2026-09-07T06:57:06Z
review_path: .planning/phases/85-config-hot-reload-with-restart-coalescing/85-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 85: Code Review Fix Report

**Fixed at:** 2026-09-07T06:57:06Z
**Source review:** .planning/phases/85-config-hot-reload-with-restart-coalescing/85-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03; Info findings IN-01/IN-02 were out of scope per fix_scope)
- Fixed: 3
- Skipped: 0

All edits were made and committed directly in the main checkout (`workflow.use_worktrees` is `false` in `.planning/config.json`), per the documented opt-out.

## Fixed Issues

### WR-01: `hasPendingWork()` has a blind spot during `addImportedBBjDocuments`/`revalidateUseFilePathDiagnostics` and the off-trigger diagnostic-clear loop

**Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-vscode/test/config-hot-reload-wiring.test.ts`
**Commit:** `cce31b39`
**Applied fix:** Added a `postProcessingDepth` counter, incremented at the top of the overridden `buildDocuments()` and decremented in a `finally`, wrapping the entire method body (including `super.buildDocuments()` and the post-processing tail). OR'd `this.postProcessingDepth > 0` into `hasPendingWork()`, alongside the existing `currentState < DocumentState.Validated` and `hasPendingCompile()` checks. Updated the `hasPendingWork()` doc comment to describe all three busy conditions accurately, including why the counter is needed (currentState already reaches `Validated` before the tail finishes). Added a test that stubs `addImportedBBjDocuments` with a controllable never-resolving promise, calls `builder.build([], {})` without awaiting, yields to the macrotask queue, and asserts `hasPendingWork()` is `true` while the tail is suspended, then resolves the stub and asserts `hasPendingWork()` returns to `false`.

### WR-02: `RestartGate.cancel()` (VS Code) cannot abort an in-flight restart — only a *scheduled* one

**Files modified:** `bbj-vscode/src/restart-gate.ts`, `bbj-vscode/test/config-reload-host.test.ts`
**Commit:** `baa7867d`
**Applied fix:** Added a `cancelled` flag inside `createRestartGate`'s closure. `cancel()` now sets it (in addition to still clearing any pending timer), and `request()` resets it to `false` on every new request. `runRestart()` checks the flag immediately after its `target.stop()` await resolves; if set, it returns without calling `target.start()`. The fix stays entirely inside `restart-gate.ts` — `extension.ts` is untouched, and the source-guard invariants (exactly one `target.stop(` and one `target.start(` call in `restart-gate.ts`, zero `vscode` imports) still hold. Added a test: `request(500)`, advance the fake timer past the window (so `runRestart()` has fired and is awaiting a `stop()` that never resolves until told to), call `cancel()`, resolve `stop()`, then assert `start()` was never called.

### WR-03: The watcher's initial baseline can go stale between `initializeWorkspace()` and `configWatcher.start()`, with no re-check at arm time

**Files modified:** `bbj-vscode/src/language/config-watcher.ts`, `bbj-vscode/test/config-hot-reload.test.ts`, `bbj-vscode/test/config-hot-reload-wiring.test.ts`
**Commits:** `4116c017` (fix), `5c90331e` (comment-hygiene follow-up, no behavior change)
**Applied fix:** `start()` now calls the existing `evaluate()` function immediately after arming the watch (when `resolved.path` is set), reusing its exact read-via-injected-`readFile`/`consumedConfigSnapshot`/reason-classification logic (`'prefix-changed'` vs `'config-missing'`) rather than duplicating it — `canonicalPath` and `snapshot` are already primed correctly for `evaluate()` at that point in `start()`. Added a new `describe('start(): arm-time relevance check', …)` block with four tests: a diverged file detected immediately with `'prefix-changed'`, a diverged-to-missing file detected with `'config-missing'`, a matching file producing zero notifications, and a `null` resolved path performing no read/notify. Adjusted two existing test fixtures whose fake `readFile` returns didn't match the baseline passed to `start()` (an artifact of fixtures pre-dating this check, not the behavior under test): the `setup()` helpers in both `config-hot-reload.test.ts` and `config-hot-reload-wiring.test.ts` now call `readFile.mockClear()` right after `start()` so per-test call-count assertions still measure only each test's own subsequent events; the `dispose()` test's fixture now starts with content matching its own baseline (matching its actual intent — proving `dispose()` cancels a *later* pending debounce timer, not testing the arm-time check).

## Verification

All fixes were verified with the 3-tier strategy (re-read + `npx tsc --noEmit -p tsconfig.json` scoped to the modified files, no new errors introduced) and by running the full required regression set after each fix and again after all three:

```
npx vitest run test/config-hot-reload.test.ts test/config-hot-reload-wiring.test.ts \
  test/config-reload-host.test.ts test/document-builder.test.ts \
  test/document-builder-rebuild-guard.test.ts
```
Result: 5 test files passed, 82 tests passed (0 failed).

`npm run build` and `npm run lint` (both from `bbj-vscode/`) exit 0.

All three fixes are backed by unit tests exercising the actual race/edge condition, not just structural syntax checks — none require flagging as "requires human verification" under the logic-bug limitation, since each new test directly proves the previously-missing behavior with fake timers / controllable stubbed promises.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-09-07T06:57:06Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
