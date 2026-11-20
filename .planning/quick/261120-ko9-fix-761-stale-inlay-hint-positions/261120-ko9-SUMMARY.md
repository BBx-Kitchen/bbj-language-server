---
phase: 261120-ko9-fix-761-stale-inlay-hint-positions
plan: 01
subsystem: language-server
tags: [inlay-hints, langium, workspace-lock, lsp, issue-761]
status: complete
requires: []
provides:
  - "Inlay hints never answered from a parse older than the client's live text"
affects: [bbj-vscode/src/language/bbj-inlay-hint-provider.ts]
tech-stack:
  added: []
  patterns:
    - "Staleness detected by comparing CST root fullText with the live TextDocuments text (never versions)"
    - "Cancel-aware WorkspaceLock.read barrier with bounded attempts, ContentModified on give-up"
key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-inlay-hint-provider.ts
    - bbj-vscode/test/inlay-hints.test.ts
key-decisions:
  - "ResponseError and LSPErrorCodes imported from 'vscode-languageserver' so langium's instanceof check matches"
  - "Fresh path delegates to super.getInlayHints without touching the workspace lock"
metrics:
  tasks: 2
  files: 2
actuals:
  tokens: 2900
  tasks: 2
  commits: 3
plan_head_before: e854e8bbdf1a0446d56035f1e422f4217dcf4403
plan_head_after: 485247a68c0b177636d5937d5caf633c58b655f2
completed: 2026-11-20
---

# Phase 261120-ko9 Plan 01: Stale inlay hint positions (#761) Summary

`BBjInlayHintProvider.getInlayHints` now checks that the syntax tree was parsed from the text the client currently holds. If not, it waits for the queued rebuild behind the workspace lock and answers with current positions, or fails with `ContentModified`.

## What changed

- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts`: new `getInlayHints` override.
  - `isParseCurrent` compares `parseResult.value.$cstNode.root.fullText` with the live `TextDocuments` text. Version numbers are not compared, because the built document and the TextDocuments entry are the same mutable instance.
  - When the parse is current, the call delegates straight to `super.getInlayHints` with no lock access.
  - Otherwise it makes up to 3 attempts. Each one does `delayNextTick`, then `waitForQueuedWrites`, then looks the document up again and re-checks. `waitForQueuedWrites` is a no-op `WorkspaceLock.read` raced against the request's cancellation token.
  - After the last attempt it throws `ResponseError(LSPErrorCodes.ContentModified, ...)`.
  - Services are resolved at call time through a stored `services.shared`.
- `bbj-vscode/test/inlay-hints.test.ts`: nested `#761` describe block with four tests. Each mutates the live TextDocument in place, as production does.
  - waits for the queued rebuild and returns current-text positions (also asserts the same-instance, same-version, different-fullText precondition)
  - fresh parse answers at once while a write holds the lock
  - gives up with `ContentModified` (a `ResponseError` from `vscode-languageserver`)
  - cancellation rejects with `OperationCancelled`, and the lock still serves the next write and read

## Commits

- 8c82fdf1 test(ls): inlay hints must not answer from a parse older than the live text (#761) (red, failed on the `settled` assertion)
- 4f874444 fix(ls): inlay hints wait for the queued rebuild instead of answering from a stale parse (#761)
- 485247a6 test(ls): pin inlay-hint give-up, cancellation and fresh path (#761)

## Verification

- `npx vitest run test/inlay-hints.test.ts test/inlay-hints-javadoc.test.ts`: 28 passed.
- `npm run lint`, `npm run typecheck:test` and `npm run build`: clean.
- Acceptance greps: `fullText`, `WorkspaceLock` and `LSPErrorCodes.ContentModified` each 1 in non-comment source. `.version` and `from 'vscode-jsonrpc'` are both 0. The planning-id register check over added lines is 0. Only the two planned files changed.
- The whole suite was not run, as it is optional in the plan.

## Deviations from Plan

**1. [Rule 3 - Blocking] `CancellationToken` import source**
- **Issue:** `langium` does not export `CancellationToken` from its root (it exports a `Cancellation` namespace), so the first compile failed.
- **Fix:** imported `CancellationToken` from `vscode-languageserver` in the provider, as the plan's action text states.
- **Files modified:** `bbj-vscode/src/language/bbj-inlay-hint-provider.ts`, included in commit 4f874444.

**2. [Rule 3 - Blocking] Test helper return type**
- **Issue:** `getInlayHints` is typed `MaybePromise`, so `.then` failed `typecheck:test`.
- **Fix:** made the test helper `requestHints` an `async` function. It was committed together with the Task 2 tests.

Otherwise the plan was executed as written. The plan-head ledger file was created right after the first (test) commit rather than before it. Its value is the parent commit e854e8bb, so the measured commit count is correct.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Provider and test files exist, and commits 8c82fdf1, 4f874444 and 485247a6 are ancestors of HEAD.
