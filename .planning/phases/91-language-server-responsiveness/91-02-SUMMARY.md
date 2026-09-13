---
phase: 91-language-server-responsiveness
plan: 02
subsystem: language-server
tags: [langium, completion-provider, cancellation, async-local-storage, vitest]

# Dependency graph
requires: []
provides:
  - "BBjCompletionProvider: module-level completionRequestToken (AsyncLocalStorage<CancellationToken | undefined>) entered per request by getCompletion, read by completionForCrossReference"
  - "BBjCompletionProvider.computeCompletion(document, params, cancelToken?): the former getCompletion body, run inside completionRequestToken's per-request storage"
  - "BBjCompletionProvider.findClassCandidatesByPrefixCached(prefix): token-free shared per-prefix lookup — cancelling the caller that creates it no longer rejects the promise other concurrent callers for the same prefix are sharing"
  - "test/completion-test.test.ts: 'concurrent completion requests keep their own cancellation (#498)' describe with two regression tests"
affects: []

actuals:
  tokens: 3958
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Per-request state on a singleton Langium service provider carried via a module-level node:async_hooks AsyncLocalStorage instead of an instance field, so concurrent requests for different documents never clobber each other's request-scoped value"
    - "A shared in-flight-promise memo (keyed by prefix) is created with no caller-specific cancellation token, so one caller's cancellation cannot reject a promise other concurrent callers are awaiting; each caller still re-checks its own token immediately after the shared await returns"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/test/completion-test.test.ts

key-decisions:
  - "getCompletion is now a thin wrapper: it enters completionRequestToken.run(cancelToken, ...) and delegates to a new protected computeCompletion(document, params, cancelToken?) that holds the former getCompletion body unchanged, so the '.' auto-trigger's internal super.getCompletion() call and every other branch keep their existing behavior"
  - "findClassCandidatesByPrefixCached dropped its cancelToken parameter entirely (not just stopped forwarding it) — the shared lookup it creates always calls javaInterop.findClassCandidatesByPrefix(prefix, undefined, undefined); completeAutoImportClasses keeps both of its own isCancellationRequested checks (before creating the prefix and right after the shared await returns) unchanged"
  - "dotTriggerActive was left untouched per the plan's explicit scope boundary — noted below as a follow-up, not fixed here"

requirements-completed: []  # RESP-04 is also declared by plan 91-06 (not yet summarized) — not marked Complete here per phase instruction; will be marked once every declaring plan lands

coverage:
  - id: D1
    description: "Two concurrent completion requests on two different documents each observe only their own cancellation token; cancelling the first has no effect on the second"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/completion-test.test.ts#concurrent completion requests keep their own cancellation (#498) > cancelling the first of two concurrent requests on two documents leaves the second untouched"
        status: pass
    human_judgment: false
  - id: D2
    description: "The shared per-prefix class-candidate lookup is created with no caller's token; cancelling the request that created it does not reject the promise a second, concurrent request for the same prefix is sharing"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/completion-test.test.ts#concurrent completion requests keep their own cancellation (#498) > a cancelled first request does not reject the per-prefix lookup a second request shares"
        status: pass
    human_judgment: false

duration: ~12min
completed: 2026-09-13
status: complete
---

# Phase 91 Plan 02: Per-Request Completion Cancellation Summary

**Replaced a singleton instance field with a module-level `AsyncLocalStorage` for the completion request's cancellation token, and removed the token from the shared per-prefix class-lookup memo, so two concurrent completion requests on different documents no longer clobber each other's cancellation (#498)**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-13T00:00:11Z (STATE.md handoff from 91-01)
- **Completed:** 2026-09-13T00:12:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added a module-level `completionRequestToken` (`node:async_hooks` `AsyncLocalStorage<CancellationToken | undefined>`) in `bbj-completion-provider.ts`. `getCompletion` is now a thin wrapper that enters `completionRequestToken.run(cancelToken, ...)` for the whole lifetime of the request and delegates to a new `protected computeCompletion(document, params, cancelToken?)` holding the former `getCompletion` body verbatim. `completionForCrossReference` reads `completionRequestToken.getStore()` instead of the old `this.activeCancelToken` instance field, so a second concurrent request on a different document can no longer overwrite the first request's token before its own async chain reads it.
- Removed the `activeCancelToken` instance field and its doc comment entirely.
- `findClassCandidatesByPrefixCached(prefix)` dropped its `cancelToken` parameter; the shared in-flight lookup it creates now always calls `this.javaInterop.findClassCandidatesByPrefix(prefix, undefined, undefined)`. `completeAutoImportClasses` keeps both of its own `isCancellationRequested` checks (before starting the lookup and right after it resolves) so a request that was cancelled while sharing someone else's in-flight lookup still returns no auto-import item for itself.
- Added a `concurrent completion requests keep their own cancellation (#498)` describe to `completion-test.test.ts` with two tests: one driving two real `getCompletion` calls on two documents through the token layer, the other mocking `JavaInteropService.findClassCandidatesByPrefix` and spying on `findClassCandidatesByPrefixCached` to prove the shared per-prefix lookup survives one caller's cancellation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Two concurrent completion requests on two documents each observe only their own cancellation token** - `1f5af4c7` (feat)
2. **Task 2: A cancelled request never rejects or empties another request's shared per-prefix lookup** - `06058cfe` (fix)

_No separate plan-metadata commit was created for the task work; SUMMARY/STATE/ROADMAP updates are committed together as the final commit below._

## Files Created/Modified

- `bbj-vscode/src/language/bbj-completion-provider.ts` - `completionRequestToken` (`AsyncLocalStorage`), `getCompletion`/`computeCompletion` split, `activeCancelToken` field removed, `findClassCandidatesByPrefixCached` token parameter dropped
- `bbj-vscode/test/completion-test.test.ts` - new `concurrent completion requests keep their own cancellation (#498)` describe with two tests

## Pre-Change Failing Assertions (RED before GREEN)

Both new tests were confirmed to fail against the pre-fix code, one task at a time, by temporarily reverting only that task's production change (via a saved patch) and re-running the targeted suite, then reapplying the fix:

- **Task 1 test** (`cancelling the first of two concurrent requests on two documents leaves the second untouched`), run against the original `activeCancelToken`-field code: failed at `expect((listA?.items ?? []).some(i => (i.detail ?? '').startsWith('Auto-import '))).toBe(false)` with `expected true to be false` — request A read request B's token (the field having been overwritten) and still offered the auto-import item.
- **Task 2 test** (`a cancelled first request does not reject the per-prefix lookup a second request shares`), run against Task 1's fix alone (before Task 2's change to `findClassCandidatesByPrefixCached`): failed at `expect(resultA.status).toBe('fulfilled')` with `expected 'rejected' to be 'fulfilled'` — the shared lookup was created with request A's own token, so cancelling A rejected the promise both A and B were awaiting.

After each corresponding production fix, both tests passed and stayed green in the full targeted run (`test/completion-test.test.ts` + `test/file-path-completion.test.ts`: 79 passed, 1 pre-existing skip).

## Decisions Made

- Kept `getCompletion`'s existing branching logic (trigger-character dispatch, `.`-trigger `dotTriggerActive` handling, default-path dedupe) byte-for-byte inside the new `computeCompletion`, changing only the removal of the `this.activeCancelToken = cancelToken;` assignment line — the goal was isolating the per-request-storage mechanism, not touching unrelated completion behavior.
- Widened `findClassCandidatesByPrefixCached`'s signature change (dropped the parameter, not just stopped using it) so no caller can silently reintroduce a per-request token into the shared lookup by accident.
- Both new tests seed disjoint, single-use prefixes/URIs (`CancelTokenMark`/`concurrent-token-*`, `CancelMemoMark`/`concurrent-memo-*`) distinct from every other prefix used elsewhere in the file, since the per-prefix memo is shared across the whole file's test run.

## Deviations from Plan

None — plan executed as written. No Rule 1-4 auto-fixes were needed; the only inline correction was to my own doc-comment wording (see below), not a code-behavior fix.

### Self-correction (not a deviation from behavior)

- While verifying Task 1's acceptance criteria (`grep -n "completionRequestToken.getStore()" ... prints exactly one line`), my first doc comment on `computeCompletion` restated the literal string `completionRequestToken.getStore()`, which made the grep match twice. Reworded the comment to describe the same behavior without repeating the literal token, then re-ran the grep, tests, lint, build and register-check to confirm the fix held. No production behavior was affected — this was a comment-wording correction caught by the plan's own acceptance check before the task commit was made.

## Issues Encountered

None beyond the self-correction above.

**Observation on `dotTriggerActive` (out of scope per plan, recorded as a follow-up):** `dotTriggerActive` remains a plain instance field on the singleton provider, unrelated to cancellation. A `.`-trigger request from one document could in principle suppress another concurrent request's non-member completion items if their execution interleaves, the same class of bug this plan fixed for the cancellation token — but that is not a #498 cancellation issue and was left untouched, as directed by the plan's interfaces section. Not filed as a new GitHub issue by this plan; a future plan should assess whether it warrants one.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The per-request token storage and the token-free shared lookup are both in place and covered by regression tests; subsequent 91-0x plans are independent of this plan's changes and can proceed.
- `RESP-04` stays open in REQUIREMENTS.md until plan 91-06 (which also declares it) lands its own SUMMARY.

## Self-Check: PASSED

All modified files verified present on disk; both task commit hashes (`1f5af4c7`, `06058cfe`) verified present in git history.

---
*Phase: 91-language-server-responsiveness*
*Completed: 2026-09-13*
