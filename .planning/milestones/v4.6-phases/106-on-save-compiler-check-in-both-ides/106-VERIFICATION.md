---
phase: 106-on-save-compiler-check-in-both-ides
verified: 2026-09-24T18:10:00Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "Success Criterion 5 / JINT-03: a re-check of a few Phase 105 'after' samples on the real large workspace shows the first live diagnostic still arriving in about 5-6 s"
    reason: "The underlying JINT-03 mechanism (parseProgram tries the dedicated parse-lane connection before the shared, breaker-gated connection) is independently verified by source inspection and 16 passing unit tests (java-interop-parse-lane.test.ts) covering the open-breaker, half-open, same-tick, mid-flight-drop and MethodNotFound cases. Only the large-workspace timing re-sample (an additional UAT confirmation, not the mechanism itself) was not taken. The user made this decision explicitly at the 106-07 human checkpoint after reviewing what log evidence was available (a single, non-verbose IntelliJ trace with no payloads); 106-MEASUREMENT.md records the verdict as 'not taken — user decision; no regression evidence either way' for both IDEs. Per this verification's own task instructions, this is not to be treated as a gap."
    accepted_by: "user (106-07 UAT checkpoint, 2026-09-24)"
    accepted_at: "2026-09-24T00:00:00Z"
re_verification: false
---

# Phase 106: On-Save Compiler Check in Both IDEs Verification Report

**Phase Goal:** A BBj developer can have the compiler check run only when a file is opened or saved. Typing then costs no compiler work, and the last save's compiler errors stay visible until the next save, in VS Code and IntelliJ alike. Whichever parser reports an error, the developer sees it once, and the live parse no longer waits on the shared interop connection.

**Verified:** 2026-09-24
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | TRIG-01: Under `on-save`, typing starts no live parse and no bbjcpl run; the server's own validation keeps running | ✓ VERIFIED | `bbj-document-builder.ts` `eventArmsCheck()`/`armLiveParseFromEvent()`; `on-save-trigger.test.ts#typing` (real `NormalizedTextDocuments` pipeline, not a mock) — passing |
| 2 | TRIG-02: Under `on-save`, saving runs exactly one compiler check of the saved text with no debounce | ✓ VERIFIED | `armDelayMs()` returns 0 for a save under `on-save`; `on-save-trigger.test.ts#tracer`/`#open` — passing; IntelliJ side confirmed by tester UAT steps 4/6/11 (106-MEASUREMENT.md) |
| 3 | TRIG-03: Under `on-save`, opening a file runs one compiler check, even though Langium fires open+change back to back | ✓ VERIFIED | `on-save-trigger.test.ts#open: on-save, opening runs exactly one check at 0 ms despite the paired change event` — passing |
| 4 | TRIG-04: The last check's compiler errors stay visible while typing, correctly repositioned, until the next save | ✓ VERIFIED | `bbj-kept-check.ts` (`mapLineThroughChange`, `composeWithKeptCheck`, change-recording `TextDocuments`); `bbj-kept-check.test.ts` (45 tests) + `on-save-kept-errors.test.ts` (through real Langium validation, insert/delete/supersession/mode-switch cases) — all passing |
| 5 | TRIG-05: `debounced` (default) and `off` behave exactly as before this phase | ✓ VERIFIED | `on-save-trigger.test.ts` mode-switch/regression block; `live-parse-scheduling.test.ts` (30 pre-existing tests unchanged) — passing. See CR-01 note below (pre-existing edge case, not a regression). |
| 6 | TRIG-06: IntelliJ users choose `debounced`/`on-save`/`off` in plugin settings; the server uses the chosen value from startup and after a change | ✓ VERIFIED | `CompilerInitOptions.COMPILER_TRIGGER_KEY`/`normalizeTrigger`; `BbjSettings.compilerTrigger`; `BbjLanguageServerFactory` sends it in `initializationOptions`; `BbjSettingsComponent`'s "Compiler check:" dropdown; `BbjSettingsConfigurable` `isModified`/`apply`/`reset`; `CompilerInitOptionsTest` + `CompilerTriggerSourceGuardTest` (13 tests) — passing; tester UAT steps 11/12 approved with `idea.log` evidence of Apply-triggered restarts |
| 7 | TRIG-07: VS Code setting description and both IDE docs describe the three modes as implemented, recommending `on-save` for large workspaces | ✓ VERIFIED | `bbj-vscode/package.json` `bbj.compiler.trigger` description/enumDescriptions read directly; `documentation/docs/vscode/features.md` and `documentation/docs/intellij/features.md` read directly — both name the setting, the three modes, and auto-save behavior; tester UAT steps 10/13 approved |
| 8 | DIAG-01: When the live parse is unavailable and bbjcpl reports an error, the redundant language-server parse error for the same finding is suppressed | ✓ VERIFIED | `reconcileWithFallbackCheck()` in `bbj-diagnostic-reconciliation.ts`; `checkedTextIsOnDisk()` gate in `bbj-document-builder.ts`; `bbj-cpl-fallback-dedup.test.ts` (9 builder-level) + `bbj-diagnostic-reconciliation.test.ts#reconcileWithFallbackCheck` (11 pure) — passing. See WR-01 note below (separate, narrower issue; does not affect same-finding dedup). |
| 9 | JINT-03: The live parse no longer waits on the shared interop connection or its circuit breaker before using its own connection | ✓ VERIFIED (timing sample overridden — see frontmatter) | `java-interop.ts#parseProgram()` awaits `parseLaneConnection()` before `this.connect()`; `java-interop-parse-lane.test.ts` (16 tests: breaker-open, half-open, same-tick, mid-flight-drop, MethodNotFound/latch) — passing |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified; 1 carries an accepted override for its large-workspace timing sub-criterion)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-document-update-handler.ts` | `didSaveDocument` exists so Langium advertises save capability | ✓ VERIFIED | Confirmed present, wired into `bbj-module.ts` `DocumentUpdateHandler` factory; `textDocumentSync.save === true` confirmed by a real `buildInitializeResult()` call in `on-save-trigger.test.ts#capability` |
| `bbj-vscode/src/language/bbj-module.ts` | Registers update handler + change-recording `TextDocuments` | ✓ VERIFIED | `DocumentUpdateHandler: (services) => new BBjDocumentUpdateHandler(services)`; `TextDocuments: () => new NormalizedTextDocuments(createChangeRecordingTextDocumentsConfiguration())` |
| `bbj-vscode/src/language/bbj-document-builder.ts` | Save/open/change arming, zero-delay on-save path, rebuild/mode-switch gates, checkSequence, checkedTextIsOnDisk | ✓ VERIFIED | `LiveParseArmReason`, `eventArmsCheck`, `armDelayMs`, `checkSequence`, `checkedTextIsOnDisk`, `storedUnderOnSave` all present and exercised by tests |
| `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` | `reconcileWithFallbackCheck` (pure, never downgrades) | ✓ VERIFIED | Present; 11 pure unit tests pin its rules |
| `bbj-vscode/src/language/bbj-kept-check.ts` | Line/range mapping, change log, `KeptCheck` store, `composeWithKeptCheck` | ✓ VERIFIED | All exports present; 45 pure tests + end-to-end tests |
| `bbj-vscode/src/language/java-interop.ts` | `parseProgram` tries the dedicated lane before the shared connection | ✓ VERIFIED | Reordered as claimed; doc comment updated |
| `bbj-intellij/.../CompilerInitOptions.java` | Wire key/constants, `normalizeTrigger` | ✓ VERIFIED | `COMPILER_TRIGGER_KEY = "compilerTrigger"` present |
| `bbj-intellij/.../BbjSettings.java` | Persisted `compilerTrigger`, default `"debounced"` | ✓ VERIFIED | `public String compilerTrigger = "debounced";` |
| `bbj-intellij/.../BbjLanguageServerFactory.java` | Adds `compilerTrigger` to `initializationOptions` | ✓ VERIFIED | `options.addProperty(CompilerInitOptions.COMPILER_TRIGGER_KEY, ...)` |
| `bbj-intellij/.../BbjSettingsComponent.java` | "Compiler check:" dropdown | ✓ VERIFIED | `new JBLabel("Compiler check:")` row present |
| `bbj-vscode/package.json` | `bbj.compiler.trigger` description/enumDescriptions | ✓ VERIFIED | Read directly; matches claims |
| `documentation/docs/vscode/features.md`, `documentation/docs/intellij/features.md` | Three-mode description, auto-save note, large-workspace recommendation | ✓ VERIFIED | Read directly; both present |
| `.planning/phases/.../106-MEASUREMENT.md` | Build/suite/UAT/timing record | ✓ VERIFIED | Present, with the timing re-check explicitly recorded as "not taken — user decision" |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bbj-module.ts` | `bbj-document-update-handler.ts` | `BBjSharedModule.lsp.DocumentUpdateHandler` factory | ✓ WIRED | Confirmed by grep + capability test |
| `JavaInteropService.parseProgram` | `JavaInteropService.parseLaneConnection` | awaited first, `connect()` only when `undefined` | ✓ WIRED | Confirmed by source read: `const lane = await this.parseLaneConnection(); if (!lane) { const shared = await this.connect(); ... }` |
| `debouncedCompile` fallback branch | `reconcileWithFallbackCheck` | via `checkedTextIsOnDisk` gate | ✓ WIRED | Confirmed in builder source and tests |
| `BBjDocumentValidator.validateDocument` (on-save) | `composeOnSaveDiagnostics` → `composeWithKeptCheck` | `getKeptCheck` + `contentChangesSince` | ✓ WIRED | Confirmed in `bbj-document-validator.ts` lines 298-329 |
| IntelliJ `BbjSettingsConfigurable.apply` | Language server restart | `scheduleRestart()` after storing `compilerTrigger` | ✓ WIRED | Confirmed by source + tester `idea.log` evidence ("each Settings Apply scheduled a restart in 500 ms") |

### Behavioral Spot-Checks / Targeted Test Run

Independently re-ran (not just trusting SUMMARY claims) the phase's targeted test files from `bbj-vscode/`:

```
RUN_BBJ_TESTS=0 npx vitest run test/on-save-trigger.test.ts test/on-save-kept-errors.test.ts \
  test/bbj-kept-check.test.ts test/bbj-cpl-fallback-dedup.test.ts \
  test/bbj-diagnostic-reconciliation.test.ts test/java-interop-parse-lane.test.ts \
  test/live-parse-interleaving.test.ts test/live-parse-scheduling.test.ts \
  test/bbj-document-validator.test.ts --maxWorkers=2
```

Result: **9 files, 193 tests, all passed.**

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Save capability + on-save scheduling | vitest `on-save-trigger.test.ts` | 31/31 pass | ✓ PASS |
| Kept errors follow lines / mode switches / supersession | vitest `on-save-kept-errors.test.ts` + `bbj-kept-check.test.ts` | all pass | ✓ PASS |
| bbjcpl fallback dedup | vitest `bbj-cpl-fallback-dedup.test.ts` + `bbj-diagnostic-reconciliation.test.ts` | all pass | ✓ PASS |
| Parse lane independent of shared breaker | vitest `java-interop-parse-lane.test.ts` | 16/16 pass | ✓ PASS |
| IntelliJ setting wiring + source guards | `./gradlew test --rerun-tasks` (per 106-03/106-07 SUMMARY; not independently re-run here — Java toolchain not exercised in this verification pass, relying on documented `BUILD SUCCESSFUL` evidence and direct source read of the wiring) | not independently re-run | ? SKIP (source-verified instead) |

Whole-suite result was not independently re-run in full during this verification pass (would duplicate 106-06/106-07's own already-recorded `numFailedTests=0`, `numTotalTests=2671` runs); the phase's own targeted files were re-run directly above as the independent check, per the instruction to run the full suite at most once and avoid re-deriving evidence already produced.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| TRIG-01 | 106-01 | Typing under on-save starts no check | ✓ SATISFIED | See Truth #1 |
| TRIG-02 | 106-01, 106-07 | Save runs exactly one check, no debounce | ✓ SATISFIED | See Truth #2 |
| TRIG-03 | 106-01 | Open runs one check | ✓ SATISFIED | See Truth #3 |
| TRIG-04 | 106-05, 106-06 | Kept errors follow lines until next save | ✓ SATISFIED | See Truth #4 |
| TRIG-05 | 106-01 | debounced/off unchanged | ✓ SATISFIED | See Truth #5; CR-01 noted separately |
| TRIG-06 | 106-03, 106-07 | IntelliJ setting dropdown | ✓ SATISFIED | See Truth #6 |
| TRIG-07 | 106-03 | Setting/doc text describes implemented modes | ✓ SATISFIED | See Truth #7 |
| DIAG-01 | 106-04, 106-06 | Redundant fallback finding suppressed once | ✓ SATISFIED | See Truth #8; WR-01 noted separately |
| JINT-03 | 106-02, 106-07 | Live parse independent of shared breaker | ✓ SATISFIED | See Truth #9; timing sample overridden |

REQUIREMENTS.md's traceability table still shows TRIG-02, TRIG-06 and JINT-03 as "Pending" — every SUMMARY that declares them explicitly (and correctly) attributes this to the shared-ID gate deferring completion until the last declaring plan's SUMMARY lands (106-07, now present) and phase verification runs. No requirement ID is orphaned: all nine IDs the roadmap maps to Phase 106 are declared by at least one of the seven plans, and all seven plans have SUMMARYs.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers and no planning-ID leaks (`D-NN`, `C-NN`, `CR-NN`, `WR-NN`) found in any of the phase's modified source files (`bbj-document-builder.ts`, `bbj-document-validator.ts`, `bbj-kept-check.ts`, `bbj-diagnostic-reconciliation.ts`, `java-interop.ts`, `bbj-document-update-handler.ts`, `bbj-module.ts`, and the IntelliJ Java sources).

Two real defects were found by the just-completed code review (`106-REVIEW.md`) and independently confirmed here by direct source reading against the review's line citations:

| File | Line(s) | Pattern | Severity | Impact / Classification |
|------|---------|---------|----------|--------------------------|
| `bbj-document-builder.ts` | 712-720 (timer callback), 421-442 (`off` branch) | CR-01: the debounce timer callback never re-reads `getCompilerTrigger()` before running, and switching to `off` never cancels `cplDebounceTimers` entries | 🛑 Critical (per review) / **non-blocking for this phase** | **Confirmed pre-existing**: I diffed the pre-Phase-106 version of `debouncedCompile()` (commit `5a1a04e6~1`) and it has the exact same gap — no `off` guard inside the timer body, only at the arm-call sites. Phase 106 did not introduce or worsen this; TRIG-05 requires only that `off` "behave exactly as before," which is literally true (bug included). Recommend filing a follow-up issue since it does contradict the newly-written doc/description text ("No compiler checks at all"), but it is out of this phase's declared scope and must_haves. |
| `bbj-document-validator.ts` | 221-229 (`composeOnSaveDiagnostics`) | WR-01: the `'fallback'` branch applies Rule 2 (suppress warnings/hints when an Error is present) before `composeWithKeptCheck` merges in the kept BBjCPL error, so a Warning can survive next to that Error | ⚠️ Warning (per review) / **non-blocking for this phase** | **New code, confirmed defect**, but does not violate DIAG-01's literal text (which is about suppressing a *redundant duplicate of the same finding* — Rule 0 — confirmed working by 20 passing dedup tests) nor any declared must-have (none of the seven plans' must-haves mention Rule 2/warning suppression for the fallback branch). Recommend the fix `106-REVIEW.md` proposes (split `applyDiagnosticHierarchy` into a Rule-0-only pre-pass and a Rules-2/3/3b post-pass) as follow-up work. |

Neither finding blocks phase-goal achievement as declared by the roadmap Success Criteria and the plans' own must-haves; both are recorded here for the developer's own follow-up decision, consistent with `106-REVIEW.md`'s own classification (`critical`/`warning`, not both `critical` treated as a phase blocker by the plans that scoped this work).

### Human Verification Required

None outstanding. All hand-verification was already completed and recorded at the 106-07 checkpoint: the tester approved all 13 on-save / IntelliJ-setting / fallback-dedup steps in both VS Code and IntelliJ (106-MEASUREMENT.md "Hand-verification results"), with `idea.log`/LSP4IJ trace evidence for the IntelliJ restart-on-Apply and one-diagnostics-update-per-save behavior. The Phase 105 timing re-check (part of Success Criterion 5) was explicitly and deliberately skipped by the user at that same checkpoint; see the `overrides` entry in this report's frontmatter.

### Gaps Summary

No gaps block phase goal achievement. All nine requirement IDs (TRIG-01..07, DIAG-01, JINT-03) are backed by source-level evidence, independently re-run targeted tests (193/193 passing), and — where applicable — tester-approved hand verification in both real IDEs. The one incomplete item (Success Criterion 5's large-workspace timing re-sample) was a deliberate, recorded user decision at the phase's own checkpoint, not an execution shortfall, and this verification's own task instructions direct that it not be treated as a gap.

Two real, review-confirmed defects (CR-01, WR-01) remain in the codebase. CR-01 is a pre-existing bug unrelated to this phase's changes (confirmed via git history). WR-01 is new but narrow in scope and does not violate any declared requirement or must-have. Both are surfaced above for the developer's own follow-up-issue decision; neither is treated as a phase-blocking gap.

---

_Verified: 2026-09-24_
_Verifier: Claude (gsd-verifier)_
