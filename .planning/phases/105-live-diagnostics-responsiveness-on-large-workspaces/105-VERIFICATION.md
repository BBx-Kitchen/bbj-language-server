---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
verified: 2026-09-23T16:00:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Confirm in a live IDE trace (either VS Code or IntelliJ) that after the initial workspace build finishes, a file whose invalid line is still present shows exactly one diagnostic for that line (the BBj Parser verdict, no doubled or duplicated language-server complaint), rather than relying solely on the hermetic interleaving test suite."
    expected: "Exactly one diagnostic on the invalid line post-build, matching the reconciled result the interleaving tests predict; no flash, no duplicate."
    why_human: "105-MEASUREMENT.md's own hand-verification answer to Q2 records this exact scenario as 'not observed' — none of the tester's 'after' trace samples captured the invalid line and the build-finished marker together in the same trace. The automated interleaving suite (test/live-parse-interleaving.test.ts, 10 tests, including the CR-02 regression for two overlapping debounce cycles) covers the underlying no-lost/doubled/misattributed invariant hermetically and thoroughly, but this one live, real-IDE confirmation of the post-build steady state was explicitly flagged by the phase's own measurement record as unconfirmed, not as clean."
---

# Phase 105: Live Diagnostics Responsiveness on Large Workspaces Verification Report

**Phase Goal:** Make live compiler diagnostics appear while typing on a project of realistic size,
not only on a handful of files. Previously the live-parse debounce timer was armed from inside
`buildDocuments()`, sitting behind Langium's FIFO `WorkspaceLock` until the initial whole-workspace
build finished, and the request shared one interop socket with the build's bulk class resolution.
Both IDEs affected (issue #692).

**Verified:** 2026-09-23
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (SC1/RESP-01) A live parser diagnostic appears while typing in a large workspace without waiting for the initial build to finish, in VS Code and IntelliJ alike | ✓ VERIFIED | Mechanism: `BBjDocumentBuilder`'s constructor subscribes directly to `TextDocuments.onDidOpen`/`onDidChangeContent` (`bbj-document-builder.ts:145-146`), never through `buildDocuments()`/`update()`; `test/live-parse-scheduling.test.ts`'s held-lock tracer proves a parse request and the client publish both complete while a real `WorkspaceLock` write is still held. Hand check: `105-MEASUREMENT.md` — tester's answer to runbook Q1 is "yes" in both VS Code and IntelliJ; every "after" sample's trace carries no build-finished marker (`workspace/inlayHint/refresh`) at all. |
| 2 | (SC2/RESP-02) The live-parse path no longer depends on `buildDocuments()` for its scheduling | ✓ VERIFIED | `armLiveParseFromEvent`/`armLiveParseForDocument`/`armWhenWorkspaceReady` are reached only from the `TextDocuments` event listeners and the `ready`-deferral chain, never from `buildDocuments()`; `runBbjcplForDocuments` (the rebuild-driven trigger) is unchanged and still feeds the same `cplDebounceTimers` map (`grep -c 'cplDebounceTimers = new Map'` = 1). The held-lock tracer test is the direct proof: the queued rebuild write is still pending when the event-armed parse and publish complete. |
| 3 | (SC3/RESP-03) Live-parse and BBjCPL diagnostics remain correct when both write `document.diagnostics` concurrently — no lost, doubled or misattributed diagnostic | ✓ VERIFIED (with one flagged live-IDE caveat, see Human Verification) | `composeWithVerdict`/`reconcileEarlyVerdict` (`bbj-diagnostic-reconciliation.ts`) are the single pure derivation every writer uses; `latestLangiumBaseline` is the one seam the builder's verdict branch, its bbjcpl fallback and the USE revalidation all read through; the validator composes via the same function. `test/live-parse-interleaving.test.ts` (10 tests, all passing) proves both publish orders, both version skews, a stale-validation-after-newer-verdict race, idempotent repeats, and — added by the code-review fix (CR-02, commit `d199ba71`) — two regression tests for two overlapping debounce cycles on the same document (a stale `'failed'` cycle no longer erases a newer cycle's published verdict; a stale `'unavailable'` cycle still clears state globally without republishing over a newer cycle). `105-MEASUREMENT.md`'s hand-verification Q2 records no overlapping/duplicate diagnostic was *observed*, but also records the specific post-build-with-invalid-line-present scenario as **not observed** in any trace — see Human Verification. |
| 4 | (SC4/RESP-05) Measured on a workspace large enough to reproduce the stall, with the before/after wait time recorded | ✓ VERIFIED | `105-MEASUREMENT.md` records 3 samples per cell across 4 cells (VS Code before/after, IntelliJ before/after) with medians (VS Code 58.895s → 5.260s, ~11x; IntelliJ 66s → 6s, ~11x), timestamp resolution, environment (BBj build, `bbj-ls.jar` details, commit hashes, four distributable SHA-256 hashes, tester's machine/IDE versions), and a drafted #692 closing comment. No corpus file name or content recorded (`grep -ciE 'bbj-corpus/'` on the file was required to print 0 per the plan's own acceptance criteria). |
| 5 | (RESP-04) The live parse travels its own interop connection, apart from class-lookup traffic; if it cannot be opened, it falls back to the shared one, logged once, with no dialog and no effect on the endpoint probe | ✓ VERIFIED | `java-interop.ts`'s `parseLane`/`parseLaneConnection`/`openParseLane`/`onParseLaneLost`/`disposeParseLane` implement the dedicated, lazily-opened, generation-scoped connection; `parseProgram()` routes to it with a shared-connection fallback. `test/java-interop-parse-lane.test.ts` (10 tests, all passing) proves the tracer scenario (a parse answered while 50 class lookups sit unanswered), the fallback (one `logger.warn` per generation, no dialog, breaker/generation untouched), the generation-bump-on-loss behaviour, the `MethodNotFound`/older-server path, and `clearCache()` disposal. **Known, deliberately deferred limitation (WR-01, not a gap):** `parseProgram()` still awaits the shared connection's `connect()` (and so its circuit breaker) before trying the dedicated lane, so a parse can still be short-circuited during the shared connection's half-open probe window even though the dedicated lane could plausibly succeed on its own. Filed as `.planning/todos/pending/2026-09-23-live-parse-waits-on-shared-connection-breaker.md`, explicitly deferred by the user because fixing it would change the transport the phase's measured timings ran through. This is a narrower edge case than RESP-04's stated text (which only commits to "falls back... with no effect on the endpoint probe" when the dedicated connection itself cannot be opened) and does not defeat RESP-04 as written. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-document-builder.ts` | Event-armed live-parse cycle, state-aware publish, bbx-config gate, stale-cycle guard | ✓ VERIFIED | `hasTextDocumentEvents`, `armLiveParseFromEvent`, `armLiveParseForDocument`, `armWhenWorkspaceReady`, `bindLiveTextDocument`, `publishCycleDiagnostics`, `sendDiagnosticsToClient`, `latestLangiumBaseline` all present and wired; `isBuildableDocumentUri` gate applied (CR-01 fix); `stillCurrent` gate on the fallback branch (CR-02 fix) |
| `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` | Pure `composeWithVerdict`/`reconcileEarlyVerdict` composition | ✓ VERIFIED | All exports present (`composeWithVerdict`, `reconcileEarlyVerdict`, `recallLangiumSnapshot`, `textLineLookup`, `isVerdictForVersion`); import isolation held |
| `bbj-vscode/src/language/bbj-document-validator.ts` | Validator composes via `composeWithVerdict`, remembers validated text | ✓ VERIFIED | `composeWithVerdict`, `root.fullText`, `isVerdictForVersion`, `setVerdictState` all present and called in `validateDocument()` |
| `bbj-vscode/src/language/java-interop.ts` | Dedicated `parseProgram` connection with lifecycle and fallback | ✓ VERIFIED | `parseLane`, `parseLaneConnection`, `openParseLane`, `onParseLaneLost`, `disposeParseLane`, three `_connectionGeneration++` bump sites |
| `bbj-vscode/test/live-parse-scheduling.test.ts` | Held-lock tracer + scheduling behaviours | ✓ VERIFIED | 13 tests (12 + CR-01 regression), all passing |
| `bbj-vscode/test/live-parse-interleaving.test.ts` | Concurrent-writer interleaving matrix | ✓ VERIFIED | 10 tests (8 + 2 CR-02 regressions), all passing |
| `bbj-vscode/test/java-interop-parse-lane.test.ts` | Dedicated connection tracer + lifecycle | ✓ VERIFIED | 10 tests, all passing |
| `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` | Pure composition unit tests | ✓ VERIFIED | 48 tests, all passing |
| `.planning/phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-MEASUREMENT.md` | Before/after measurement record | ✓ VERIFIED | Present, filled, no corpus text |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BBjDocumentBuilder` constructor | `TextDocuments.onDidOpen`/`onDidChangeContent` | Direct subscription, gated by `hasTextDocumentEvents` | ✓ WIRED | `bbj-document-builder.ts:145-146`; held-lock tracer proves it never touches `WorkspaceLock` |
| `armLiveParseForDocument` | `debouncedCompile`/`cplDebounceTimers` | Same timer map the rebuild path uses | ✓ WIRED | `grep -c 'cplDebounceTimers = new Map'` = 1; merge-within-window test passes |
| `debouncedCompile`'s verdict branch | `composeWithVerdict` | Via `latestLangiumBaseline` snapshot | ✓ WIRED | `bbj-document-builder.ts:523-529` |
| `BBjDocumentValidator.validateDocument()` | `composeWithVerdict` | Remembered validated text + stored verdict | ✓ WIRED | `bbj-document-validator.ts:239-268` |
| `JavaInteropService.parseProgram()` | dedicated `MessageConnection` (`parseLane`) | `parseLaneConnection()`, fallback to `shared` | ✓ WIRED | `java-interop.ts:492-505`; tracer test proves the routing |
| `BBjParserService` | `connectionGeneration` reset | Bump on dedicated-connection loss | ✓ WIRED | `onParseLaneLost` bumps `_connectionGeneration`; test proves verdict-clear on the next `isEnabled()` |

### Behavioral Spot-Checks / Test Execution

| Suite | Command | Result | Status |
|-------|---------|--------|--------|
| `live-parse-scheduling.test.ts` | `npx vitest run` | 13 passed, 0 failed | ✓ PASS |
| `live-parse-interleaving.test.ts` | `npx vitest run` | 10 passed, 0 failed | ✓ PASS |
| `java-interop-parse-lane.test.ts` | `npx vitest run` | 10 passed, 0 failed | ✓ PASS |
| `bbj-diagnostic-reconciliation.test.ts` | `npx vitest run` | 48 passed, 0 failed | ✓ PASS |
| `bbj-document-validator.test.ts` | standalone run (initial combined run hit a worker-startup hook timeout, matching documented contention pattern) | 11 passed, 0 failed | ✓ PASS |
| `document-builder-rebuild-guard.test.ts` | standalone run (same contention pattern) | 5 passed, 0 failed | ✓ PASS |
| `document-builder.test.ts`, `bbj-parser-service.test.ts`, `java-interop-breaker.test.ts`, `java-interop-service.test.ts`, `java-interop-timeouts.test.ts`, `config-hot-reload-wiring.test.ts`, `bbj-document-builder-config.test.ts` | combined run | all passed | ✓ PASS |
| `npx tsc -b tsconfig.json` | type check | exit 0, no output | ✓ PASS |
| Register check (`git diff … \| grep planning-identifier-pattern`) | over the full phase diff `9601e712..HEAD` | no match (exit 1) | ✓ PASS |
| CR-01 regression (`bbx-config` exclusion) | `npx vitest run test/live-parse-scheduling.test.ts -t bbx-config` | 1 passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| RESP-01 | 01, 04, 05 | Live parser diagnostic appears without waiting for initial build, both IDEs | ✓ SATISFIED (code + hand check) | See Truth #1. `REQUIREMENTS.md` still shows `[ ]` Pending — per this repo's process, marking requirements Complete is the orchestrator's `phase.complete` step, not the verifier's; all three declaring plans report `requirements-completed` including RESP-01 in their SUMMARYs. |
| RESP-02 | 01 | Event-armed scheduling, independent of `buildDocuments()`/`WorkspaceLock` | ✓ SATISFIED | See Truth #2. `REQUIREMENTS.md` shows `[x]` Complete. |
| RESP-03 | 02, 04 | Concurrent-writer correctness — no lost/doubled/misattributed diagnostic | ✓ SATISFIED | See Truth #3. `REQUIREMENTS.md` shows `[x]` Complete. |
| RESP-04 | 03 | Dedicated interop connection with silent fallback | ✓ SATISFIED (with a documented, deferred edge case) | See Truth #5. `REQUIREMENTS.md` shows `[x]` Complete. |
| RESP-05 | 05 | Before/after measurement recorded | ✓ SATISFIED | See Truth #4. `REQUIREMENTS.md` still shows `[ ]` Pending — same orchestrator-step note as RESP-01. |

No orphaned requirements found: `REQUIREMENTS.md`'s traceability table maps exactly RESP-01..05 to Phase 105, and all five appear in at least one plan's frontmatter `requirements` field.

### Anti-Patterns Found

None. Scanned the four modified source files (`bbj-document-builder.ts`, `bbj-diagnostic-reconciliation.ts`, `bbj-document-validator.ts`, `java-interop.ts`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub-shaped text — no matches.

### Code Review Findings Disposition

- **CR-01** (blocker: event-armed trigger reached `bbx-config` documents) — fixed, commit `c1fb6dde`. Verified: `isBuildableDocumentUri` gate present in `armLiveParseForDocument`; regression test passes.
- **CR-02** (blocker: stale failed cycle could erase a newer cycle's verdict) — fixed, commit `d199ba71`. Verified: `stillCurrent` gate present in the fallback branch; both regression tests pass.
- **WR-01** (warning: `parseProgram` still gated by the shared connection's breaker during its half-open probe window) — deliberately deferred by the user to `.planning/todos/pending/2026-09-23-live-parse-waits-on-shared-connection-breaker.md`, with a stated reason (fixing it would change the measured transport). Confirmed present on disk and correctly attributes the source review. Does not defeat RESP-04 as literally stated in `REQUIREMENTS.md`.
- **IN-01** (info: duplicated `bbjcplAvailable` gate across two call sites) — deferred, cosmetic, no functional risk.

### Human Verification Required

### 1. Live-IDE confirmation of the post-build steady state with the invalid line still present

**Test:** After the initial workspace build finishes (in either VS Code or IntelliJ), with a file
that still contains the invalid line typed during the build, inspect the diagnostics shown on that
line.
**Expected:** Exactly one diagnostic on the invalid line (the reconciled `BBj Parser`/Langium
result), matching what the hermetic interleaving test suite predicts — no duplicate, no stale
complaint left behind, no flash.
**Why human:** `105-MEASUREMENT.md`'s own hand-verification record (Task 2's answer to runbook
question 2) explicitly states this exact scenario — the invalid line still present alongside the
build-finished marker, captured together in one trace — was **not observed** in any of the tester's
samples, in either IDE. The automated `live-parse-interleaving.test.ts` suite (10 tests, including
the CR-02 regression for two overlapping debounce cycles) proves the underlying "no lost, doubled or
misattributed diagnostic" invariant hermetically and rigorously, and the general "no overlap
observed while typing" answer was reported as clean — but this one specific live confirmation was
flagged by the phase's own artifacts as an open item, not something this verifier can resolve by
reading code or running the existing test suite.

### Gaps Summary

No gaps. All five roadmap success criteria and all five RESP-01..05 requirements are satisfied by
verified code, passing tests (including two targeted CR-01/CR-02 regression tests added during code
review), and the completed corpus measurement. The phase's own measurement record flags one specific
live-IDE confirmation as not observed (see Human Verification above), which is why this report's
status is `human_needed` rather than `passed` — it is not a code or design defect, and the underlying
correctness guarantee it partially re-confirms is otherwise well covered by hermetic tests. WR-01 and
IN-01 from code review are deliberately deferred, documented, and do not defeat any must-have as
stated. `REQUIREMENTS.md` still shows RESP-01 and RESP-05 as Pending, which is expected at this point
in the process (that update is the orchestrator's `phase.complete` step, not part of plan execution or
verification).

---

*Verified: 2026-09-23*
*Verifier: Claude (gsd-verifier)*
