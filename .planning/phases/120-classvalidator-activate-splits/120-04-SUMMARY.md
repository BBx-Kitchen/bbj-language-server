---
phase: 120-classvalidator-activate-splits
plan: "04"
subsystem: vscode-extension
tags: [vscode-extension, activation, refactor, vitest]

requires:
  - phase: 120-classvalidator-activate-splits
    provides: "plan 02's activate() characterization safety net (activation-command-coverage.test.ts, activation-prompts-and-status-bars.test.ts) and plan 03's em-auth.ts/em-script-runner.ts split, both kept green unedited by this plan's moves"
provides:
  - "activate() reduced to an ordered list of eighteen register* calls in the base order, registering no command/notification/status-bar/listener itself"
  - "The tokenized/line-numbered open prompts in their own module (open-file-prompts.ts) with activation-scoped state"
  - "The suppression and BBjCPL diagnostic status bars in their own module (diagnostic-status-bars.ts)"
  - "The phase measured end to end against its base SHA, with a guard ledger, the D-18 hand UAT list and the milestone-PR closing lines"
affects: []

actuals:
  tokens: 6800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Host register*(context, deps) modules take the shared client instance and output channel directly as named deps fields, never a getClient() accessor — mirrors setopts-in-code-ui.ts's registerSetOptsInCodeComposer(context, send)"
    - "Per-activation state (the two prompted-file Sets) is created inside the register function and closed over by its listeners, never module-level — same shape em-auth.ts and em-script-runner.ts already established in plan 03"
    - "Extracted register* functions are placed AFTER the function that still calls them (activate()), not before, so a source-position diff against the pre-split file shows only true content changes and not a spurious move of untouched lines above them"

key-files:
  created:
    - bbj-vscode/src/open-file-prompts.ts
    - bbj-vscode/src/diagnostic-status-bars.ts
    - .planning/phases/120-classvalidator-activate-splits/COVERAGE.md
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/test/no-shell-command-construction.test.ts

key-decisions:
  - "Placed the seven module-private register* functions extracted from activate() in extension.ts AFTER activate() (between it and deactivate()), not before it — an earlier attempt that put them before activate() passed every functional check but failed the 'composer lines untouched' acceptance grep, because git's diff algorithm represented the untouched composer-registration lines as a delete+add pair once unrelated content was inserted above them in the file. Reordering placement (not content) resolved it; the fix was applied as a soft-reset-and-redo before the Task 2 commit was finalized, so only one commit exists for Task 2, matching the plan's single-commit-per-task acceptance criterion."

requirements-completed: [REF-11]

coverage:
  - id: D1
    description: "activate() is an ordered list of eighteen register* calls in the base order (BBjLibraryFileSystemProvider.register, the seven composer registrations, then registerConfigFileCommands through registerConfigAssociation), registering no command/notification/status-bar/listener directly"
    requirement: "REF-11"
    verification:
      - kind: unit
        ref: "this plan's own activate-shape shell check (register-call sequence + zero direct registerCommand/onNotification/createStatusBarItem/.onDid calls in activate()'s body)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The open prompts and the diagnostic status bars live in their own modules (open-file-prompts.ts, diagnostic-status-bars.ts) with activation-scoped state — no module-level let/var/Set/Map in either new module"
    requirement: "REF-11"
    verification:
      - kind: unit
        ref: "this plan's own module-shape shell checks + test/activation-prompts-and-status-bars.test.ts (6 tests) + test/activation-command-coverage.test.ts (4 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Plan 02's activation pins, plan 03's EM error-path test, and the config-reload/target-resolution/setopts-in-code-ui guards all pass unedited after the move"
    requirement: "REF-11"
    verification:
      - kind: unit
        ref: "npx vitest run <the 21-file Task 2 targeted suite>"
        status: pass
    human_judgment: false
  - id: D4
    description: "Whole suite at head has no failing test name absent from the phase base list; lint, typecheck:test and build pass; the cumulative phase diff touches exactly the expected 19 files under bbj-vscode; Commands.cjs changed only in comments; no planning identifier in any added line; no closing keyword in any commit body since the base"
    requirement: "REF-11"
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 --reporter=json (whole suite) + npm run lint + npm run typecheck:test + npm run build + this plan's own hygiene shell check"
        status: pass
    human_judgment: false
  - id: D5
    description: "COVERAGE.md declares no external API integration and the api-coverage pre-verify check reports block=false"
    verification:
      - kind: other
        ref: "gsd-tools check api-coverage.verify-pre against the phase directory"
        status: pass
    human_judgment: false
  - id: D6
    description: "Hand UAT for /gsd-verify-work: build and install the VSIX from the final tree (after any code-review fixes), run a GUI/BUI/DWC program, log into EM, compile a file — not run by the executor"
    verification: []
    human_judgment: true
    rationale: "Explicitly deferred to a human per D-18; the executor never runs a live VS Code session or builds/installs a VSIX"

duration: 20min
completed: 2026-09-29
status: complete
---

# Phase 120 Plan 04: activate() Registration Split and Phase Close Summary

**`activate()` in `bbj-vscode/src/extension.ts` is now an eighteen-call ordered list — the tokenized/line-numbered open prompts moved to `open-file-prompts.ts` and the diagnostic status bars to `diagnostic-status-bars.ts`, with the rest of the body turned into seven small single-purpose register functions — and the whole phase re-measured clean against its base SHA, closing REF-11 (#564) and the phase itself.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-29T07:42:00Z (approx.)
- **Completed:** 2026-09-29T08:00:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified: `extension.ts`, `no-shell-command-construction.test.ts` touched across Tasks 1-2; `COVERAGE.md` created in Task 3)

## Accomplishments

- **Task 1 (tracer):** Created `src/open-file-prompts.ts` exporting `registerOpenFilePrompts(context)`, moving `readLeadingBytes`, `uriFromTab`, `maybePromptTokenized` and `maybePromptLineNumbered` verbatim as unexported module functions. The two `promptedTokenizedFiles`/`promptedLineNumberedDocs` Sets are no longer module-level in `extension.ts` — they are created inside `registerOpenFilePrompts` and passed as an added last parameter to each `maybePrompt*` function. `extension.ts`'s prompt wiring collapsed to one call, `registerOpenFilePrompts(context);`, at the same position. `no-shell-command-construction.test.ts`'s `HOST_TS_FILES` list gained the new module. Plan 02's `activation-prompts-and-status-bars.test.ts` and `activation-command-coverage.test.ts` passed unedited on the first run — the tracer feedback gate (targeted suites) cleared without a checkpoint, so Task 2 proceeded automatically (auto mode, `<automated>`-only verify).
- **Task 2:** Created `src/diagnostic-status-bars.ts` exporting `registerDiagnosticStatusBars(context, { client })`, moving the suppression status bar and BBjCPL status bar blocks verbatim and in order, dropping the one stale "Phase 53" comment line and keeping the "Simple heuristic" line. In `extension.ts`, extracted seven module-private functions — `registerConfigFileCommands`, `registerRunCommands`, `registerCompileCommands`, `registerJavaClasspathCommands`, `registerDocumentFormatter`, `registerConfigReloadStatus`, `registerConfigAssociation` — each taking `(context)` or `(context, deps)` with deps destructured to the base identifier names (`client`, `outputChannel`, `restartGate`). Rewrote `activate()`'s body after `Commands.setOutputChannel(...)` as the ten ordered calls (the seven new functions plus the pre-existing `registerEmLoginCommand`, `registerOpenFilePrompts`, `registerDiagnosticStatusBars`), with everything above that point (library file system, seven composer lines, `secretStorage`, output-channel setup, client creation, restart-gate setup, `setOutputChannel`) byte-identical to the pre-Task-2 tree. `no-shell-command-construction.test.ts` gained the new status-bar module in `HOST_TS_FILES`.
- **Task 3:** Ran the whole-suite verify command at head (`numFailedTests=0`, the one pre-existing `installed-extension-e2e.test.ts` stale-bundle suite failure unchanged from base, `comm -13` against the base failed-name list empty). Ran lint, `typecheck:test` and build (all green). Ran the phase-wide hygiene check: exactly the expected 19 files changed under `bbj-vscode`, `Commands.cjs` changed only in comment lines, no added line carries a planning identifier, no commit body since the base carries a closing keyword before an issue number, and the `em-secret-env-channel.test.ts` re-expressed test (plan 03's single approved D-15 exception) is confirmed as the only `expect()` change in the phase. Wrote `COVERAGE.md`'s one-line no-external-API declaration; the api-coverage check reports `block=false`. Marked REF-11 complete in `REQUIREMENTS.md` (only its checkbox and traceability row changed).

## Task Commits

1. **Task 1: The open prompts run end-to-end from their own module, with activation-scoped state** — `b55412b8` (refactor)
2. **Task 2: activate() is an ordered list of single-purpose register calls, with the diagnostic status bars in their own module** — `de15df46` (refactor)
3. **Task 3: The phase measured against its base, with the guard ledger, the hand UAT list and the closing lines** — `f816974a` (docs, COVERAGE.md only; the SUMMARY/REQUIREMENTS/STATE/ROADMAP updates are committed separately as plan metadata per the task commit protocol)

**Plan metadata:** committed alongside `SUMMARY.md`/`STATE.md`/`ROADMAP.md`/`REQUIREMENTS.md` at plan-completion time.

## Files Created/Modified

- `bbj-vscode/src/open-file-prompts.ts` — `registerOpenFilePrompts(context)`; the tokenized-file and line-numbered-file prompts with per-activation state
- `bbj-vscode/src/diagnostic-status-bars.ts` — `registerDiagnosticStatusBars(context, { client })`; the suppression and BBjCPL status bars
- `bbj-vscode/src/extension.ts` — `activate()` reduced to an eighteen-call ordered list; seven new module-private register functions added after `activate()`
- `bbj-vscode/test/no-shell-command-construction.test.ts` — `HOST_TS_FILES` widened to include the two new host modules
- `.planning/phases/120-classvalidator-activate-splits/COVERAGE.md` — the one-line no-external-API declaration

## Base Evidence and Identity Checks

**Phase base SHA (unchanged since plan 01):** `a2d08e25ca22ab7c995f942ce6b5a21d27b0efa0`

**Whole-suite counts across the phase:**
```
base   (a2d08e25):    numFailedTests=0 numPassedTests=3608 numPendingTests=30 numTotalTests=3638 failedSuites=1
after plan 01:         numFailedTests=0 numPassedTests=3608 numPendingTests=30 numTotalTests=3638 failedSuites=1
after plan 03:         numFailedTests=0 numPassedTests=3637 numPendingTests=30 numTotalTests=3667 failedSuites=1
at head (this plan):   numFailedTests=0 numPassedTests=3637 numPendingTests=30 numTotalTests=3667 failedSuites=1
```
The one failed suite throughout is `test/functional/installed-extension-e2e.test.ts` (pre-existing stale-installed-bundle failure, present in the base's own failed-name list). `comm -13` of the base failed-name list against the head failed-name list is empty at every measurement point in the phase, including this plan's — no failing test name beyond the base at any point.

**Targeted Task 1 run** (9 files): `Test Files 9 passed (9)` / `Tests 94 passed (94)`.

**Targeted Task 2 run** (21 files): `Test Files 21 passed (21)` / `Tests 334 passed | 1 skipped (335)`.

**Gates (all three tasks):** `npm run lint`, `npm run typecheck:test` and `npm run build` all exit 0.

**Structure/shape checks (Task 1 and Task 2, both `printf` — `echo` combined outputs):**
- `open-file-prompts.ts` exports exactly `registerOpenFilePrompts`, contains zero module-level `let`/`var`/`Set`/`Map`, contains exactly two `new Set<string>()` literals (both inside the register function), and both prompt message texts are byte-identical to the base. `extension.ts` contains zero occurrences of any of the moved identifiers or helper names.
- `diagnostic-status-bars.ts` exports the exact signature `registerDiagnosticStatusBars(context: vscode.ExtensionContext, deps: { client: LanguageClient }): void`, contains zero module-level `let`/`var`/`Set`/`Map`, and zero occurrences of a stale phase-number comment. `extension.ts` contains zero occurrences of `Diagnostics filtered`, `BBjCPL: unavailable` or `bbj/bbjcplAvailability`.
- `activate()`'s body, scanned for `\bregister[A-Za-z]*\(` calls, is exactly `register( registerMsgboxComposer( registerAddWindowComposer( registerAddChildWindowComposer( registerComposerLensCommand( registerCvsComposer( registerSetOptsComposer( registerSetOptsInCodeComposer( registerConfigFileCommands( registerEmLoginCommand( registerRunCommands( registerCompileCommands( registerJavaClasspathCommands( registerDocumentFormatter( registerOpenFilePrompts( registerDiagnosticStatusBars( registerConfigReloadStatus( registerConfigAssociation( ` — the base order, unchanged. `activate()`'s body contains zero direct `registerCommand(`/`onNotification(`/`createStatusBarItem(`/`.onDid*(` calls and exactly one `context.subscriptions.push(` (the output channel).
- `grep -c -F 'client.onNotification(CONFIG_RELOAD_METHOD'` and `grep -c -F 'restartGate?.request(CONFIG_RELOAD_RESTART_DELAY_MS)'` on `extension.ts` both print 1.
- `git diff HEAD~1 HEAD -- bbj-vscode/src/extension.ts | grep -E '^[-+]' | grep -c -E 'register(Msgbox|AddWindow|AddChildWindow|ComposerLens|Cvs|SetOpts|SetOptsInCode)Composer|registerComposerLensCommand'` prints 0 for Task 2's commit — the seven composer lines were not touched.

**Hygiene (Task 3, end-to-end shell check):** all of the following hold in one run, producing `hygiene OK`:
- `git diff <base> -- bbj-vscode/src bbj-vscode/test | grep '^+'` contains zero lines matching any planning-identifier pattern (D-NN, phase-NN plan-NN, requirement-family IDs, review-finding IDs, or "Phase NN").
- `git log --format=%B <base>..HEAD` contains zero lines matching a closing keyword immediately before a `#`-issue reference.
- `git diff --name-only <base> -- bbj-vscode` is exactly the 19 expected files, `LC_ALL=C`-sorted.
- The diff of `Commands.cjs` against the base is non-empty and every changed line is a comment line (`//`, `*`, `/**` or `*/`).
- The `em-secret-env-channel.test.ts` diff against the base removes exactly the three base `expect()` lines naming `creationIndices`/`launcherIndices` (the one approved D-15 exception, re-expressed in plan 03) and leaves every other `expect()` line, duplicates included, byte-identical.
- `no-shell-command-construction.test.ts`'s `expect()` lines are byte-identical to the base.

## Module Map

**Five validation modules** (plan 01, unchanged by this plan): `check-class-reference.ts`, `check-return-types.ts`, `check-constructor.ts`, `check-cyclic-inheritance.ts`, `class-types.ts`, registered from `check-classes.ts`'s `registerClassChecks`.

**Four host modules split out of `activate()`:**

| Module | Exports | Dependency parameters |
|---|---|---|
| `em-auth.ts` (plan 03) | `registerEmLoginCommand`, `ensureValidToken`, `getEMCredentials`, `EmAuthDeps` | `{ outputChannel }` |
| `em-script-runner.ts` (plan 03) | `createScriptOutputFile`, `runScriptToOwnerOnlyFile` | none (pure exec-wrapping helper) |
| `open-file-prompts.ts` (this plan) | `registerOpenFilePrompts` | none — reads `context`, creates its own per-activation Sets |
| `diagnostic-status-bars.ts` (this plan) | `registerDiagnosticStatusBars` | `{ client }` |

**Stayed in `extension.ts` (small register functions, plus what did not move at all):**

| Function / code | Deps | Why it stayed |
|---|---|---|
| `registerConfigFileCommands(context)` | none | Three one-line command registrations; not large enough to warrant its own module (D-13's "mixed by size") |
| `registerRunCommands(context, { outputChannel })` | `outputChannel` | Small; the BUI/DWC handlers are pinned in place by `target-resolution.test.ts`'s marker-based extraction, which only requires the literal text to exist somewhere in `extension.ts` — satisfied either way, so no reason to move it |
| `registerCompileCommands(context)` | none | Five one-line command registrations |
| `registerJavaClasspathCommands(context, { client })` | `client` | Two commands, one of them a ~40-line QuickPick flow; still small relative to the two extracted modules |
| `registerDocumentFormatter(context)` | none | One-line registration |
| `registerConfigReloadStatus(context, { client, restartGate })` | `client`, `restartGate` | Assigns to the module-level `configReloadStatusBar` that `onConfigRestartPhase` (itself staying module-level, driven by the restart gate) reads; `config-reload-host.test.ts`'s `readGuardedSource('extension.ts')` pins the `CONFIG_RELOAD_METHOD` handler's exact text and position inside this file — moving it would mean either new module-level state in a different module (forbidden by D-14) or repointing that guard, neither of which this plan's scope allows |
| `registerConfigAssociation(context, { client })` | `client` | `applyConfigAssociation`, `releaseConfigAssociation`, `sweepOpenDocumentsForConfigAssociation` and `lastKnownActiveConfigPath` already live at module level in `extension.ts` from before this phase; moving only the register function while leaving its helpers behind would split one concern across two files for no benefit |
| `configureCompileOptions` (~170 lines) | — | Not part of `activate()` at all — it is the `bbj.configureCompileOptions` command *handler*, referenced by `registerCompileCommands` but defined earlier in the file as its own top-level function; out of this plan's scope (see Observations) |

## Guard Ledger (D-15)

| Guard | Touched in this plan? | Change |
|---|---|---|
| `no-shell-command-construction.test.ts` | Yes | `HOST_TS_FILES` widened twice: `OPEN_FILE_PROMPTS_TS` (Task 1), then `DIAGNOSTIC_STATUS_BARS_TS` (Task 2). Every `expect()` line and test title byte-identical to the base and to plan 03's version. |
| `em-secret-env-channel.test.ts` | No (in this plan) | Already widened and its one exception applied in plan 03; this plan made no further change — confirmed by the hygiene check's byte-identical `expect()` comparison against the base outside the three removed lines. |
| `target-resolution.test.ts` | No | `bbj.runBUI`/`bbj.runDWC` handler bodies are byte-identical text, now inside `registerRunCommands` instead of directly inside `activate()`; the guard's marker-based `extractBraceBlock` search finds the same literal text anywhere in `extension.ts`, so moving it into a named function changed nothing the guard inspects. |
| `setopts-in-code-ui.test.ts` | No | Out of this plan's scope; the composer registration line was never touched (confirmed by the composer-lines diff check above). |
| `decompile-io.test.ts` | No | Pins `execWithProgress(argv)` in `Commands.cjs`, untouched since plan 03. |
| `composer-cue-single-source.test.ts` | No | Checks `documentSelector` inside `startLanguageClient` (never touched) and forbids `registerCodeLensProvider` anywhere under `src`. |
| `config-reload-host.test.ts` | No | All four of its assertions (`client.start()`/`client.stop(`/`createRestartGate(` exactly-once counts, and the `CONFIG_RELOAD_METHOD` handler-body check) still pass unedited: the handler now lives inside `registerConfigReloadStatus`, but that function is itself defined in `extension.ts`, so `readGuardedSource('extension.ts')` still finds exactly one occurrence of each pinned call, in the same relative order. |
| `em-properties-reader-guard.test.ts` | No | Unrelated to this plan's files; included in the Task 2 targeted run as a regression check only. |

The single user-approved exception to D-15 across the whole phase remains the one from plan 03: `em-secret-env-channel.test.ts`'s test `'both output-file paths in extension.ts are created through createOwnerOnlyFile before their launcher call'` was renamed and rewritten against `em-script-runner.ts`/`em-auth.ts` (approved 2026-09-29). This plan touched no `expect()` line anywhere; the hygiene check's phase-wide comparison confirms it is still the only `expect()` change in the whole phase.

## Dead Branches

- D-09 (delete the `bbj.em.credentials` `secretStorage` fallback from `getEMCredentials`) — done in plan 03.
- D-10 (delete `Commands.cjs`'s `runWeb` non-token branch) — kept, per plan 03's research: five `commands-cjs-execution.test.ts` tests still drive a username/password credential through `runWeb` directly.
- The `bbj.web.username`/`bbj.web.password` settings read that issue #564 originally described was already removed earlier, in Phase 112 (#546/#565) — not part of this phase's own work, carried forward as context only.

## Behaviour Notes

- No EM error path changed in this plan. `em-auth-error-paths.test.ts` (written and passing against the pre-split `extension.ts` in plan 03) is untouched by this plan and still passes unedited at head — confirmed by `git diff f850b188..HEAD -- bbj-vscode/src/em-auth.ts bbj-vscode/src/em-script-runner.ts bbj-vscode/test/em-auth-error-paths.test.ts` returning empty.
- Plan 03's one kept base quirk still holds unchanged: a throw between creating an EM output file and its launch leaves the empty owner-only file behind (cleanup would be new behaviour, out of scope).
- The two prompted-file Sets (`promptedTokenizedFiles`, `promptedLineNumberedDocs`) moved from module lifetime to activation lifetime in Task 1. VS Code activates the extension once per extension host, so this is not observable to a user — plan 02's characterization pins (written against the module-lifetime version) still pass unedited against the activation-lifetime version, confirming no behaviour difference.

## Hand UAT for /gsd-verify-work (D-18, not run by the executor)

Build and install the VS Code extension VSIX and the IntelliJ plugin zip from the final tree (after any code-review fixes land), per the project's standing UAT pattern (build both extensions first, and again at phase end from the final tree). Then, in a running VS Code instance with the built extension installed:
1. Run a GUI program — confirm it launches and behaves as before the split.
2. Run a BUI program — confirm the EM login prompt and token flow work exactly as before (now routed through `registerRunCommands` → `ensureValidToken` in `em-auth.ts`).
3. Run a DWC program — same as BUI.
4. Log into Enterprise Manager (`bbj.em` command) — confirm the browser opens as before.
5. Compile a file (`bbj.compile`) — confirm compilation and diagnostics are unchanged.

Each of these should behave identically to the pre-phase build; the refactor is behaviour-neutral by construction and by the automated guards above, but only a human running the real IDE and BBj toolchain can confirm the end-to-end experience.

## Milestone PR Closing Lines

```
Closes #625
Closes #564
```

### #625 closing-note draft

`ClassValidator`'s four responsibilities now live in `check-class-reference.ts` (class reference and visibility), `check-return-types.ts` (return type and field initializer — `FINAL_TYPE_ASSIGNABLE_TO` unchanged, #466 still open), `check-constructor.ts` (constructor) and `check-cyclic-inheritance.ts` (cyclic inheritance), with the shared helpers (`classFqn`, `bbjSupertypesReach`, `bbjTypesAreRelated`, `KNOWN_BBJ_SCALAR_TYPES`) in `class-types.ts`. `check-classes.ts` now only builds the `ValidationChecks` map and registers it, in the same per-node-type handler order as before. `class-validations-issues`, `inheritance-cycle-validation` and eight more validation suites pass with no assertion changes.

### #564 closing-note draft

`activate()` in `extension.ts` is now an eighteen-call ordered list of single-purpose register functions, registering nothing directly itself. EM login, token validation and the credential lookup live in `em-auth.ts`; EM login and EM token validation share one runner module, `em-script-runner.ts` (`createScriptOutputFile`/`runScriptToOwnerOnlyFile`), which has its own unit tests and is built on the same `runProcess` exec core `Commands.cjs`'s launcher already used. A characterization test written before any source move (`em-auth-error-paths.test.ts`) proves every EM error still surfaces exactly as before. The unused `bbj.em.credentials` stored-credentials fallback is deleted; the settings read behind it was removed earlier, and the remaining username/password routing in `Commands.cjs`'s `runWeb` is kept on purpose because five existing tests still exercise it directly. A new test (`activation-command-coverage.test.ts`) proves every command `package.json` contributes is registered, and pins the full activation order and subscription count.

## Observations, Not Acted On

- `test/method-return-java-type.test.ts:256` still names `check-classes.ts` in a comment describing FQN-reconstruction logic that now lives in `class-types.ts`/`check-return-types.ts` (carried forward from plan 01's SUMMARY, unchanged by this plan).
- `configureCompileOptions` (about 170 lines) stays in `extension.ts` because it is a command *handler*, not part of `activate()` itself — `registerCompileCommands` merely references it, the same as every other `Commands.<x>` handler passed to `registerCommand`.

## Decisions Made

See `key-decisions` in the frontmatter — the extracted register functions were placed after `activate()` rather than before it, to keep the untouched composer-registration lines from appearing as a spurious delete+add in the per-task commit diff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reordered where Task 2's extracted register functions live in the file, after the first placement broke the plan's own "composer lines untouched" acceptance check**
- **Found during:** Task 2, immediately after the first commit, while running the plan's own acceptance-criteria shell check
- **Issue:** Placing the seven new `register*` functions directly before `activate()` (the natural reading order) caused `git diff` to represent the unrelated, byte-identical composer-registration lines at the top of `activate()` as a delete+add pair, because the intervening insertion of new function bodies moved `activate()`'s starting position in the file. `git diff HEAD~1 HEAD -- extension.ts | grep '^[-+]' | grep -c '...Composer...'` printed 14 instead of the required 0, even though the composer lines' content never changed.
- **Fix:** Soft-reset the premature commit (`git reset --soft HEAD~1`, no working-tree changes lost, nothing pushed or shared), moved the same seven function bodies to after `activate()` instead of before it (between `activate()` and `deactivate()`), and recommitted once. `activate()` itself now sits at exactly the same file position it held immediately after Task 1, so the diff against the Task 1 commit only touches lines that actually changed.
- **Files modified:** `bbj-vscode/src/extension.ts` (structural placement only — no functional or textual change to any of the seven extracted functions themselves)
- **Verification:** re-ran every Task 2 verify command (activate-shape check, 21-file targeted suite, lint/typecheck/build) after the reordering; all passed. `git diff HEAD~1 HEAD -- extension.ts | grep '^[-+]' | grep -c '...Composer...'` now prints 0.
- **Committed in:** `de15df46` (the single, final Task 2 commit — the premature first attempt was soft-reset and never left local history as a separate commit)

---

**Total deviations:** 1 auto-fixed (verification-driven structural placement fix, no behaviour change).
**Impact on plan:** No production behaviour affected — same functions, same content, same signatures, only their position in the file relative to `activate()` changed. No scope creep.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

REF-11 is complete. The phase (`ClassValidator & activate() Splits`) is now fully closed: REF-10 (plan 01) and REF-11 (this plan) both satisfied, the whole-suite whole-phase diff matches its base with no new failing name, and the guard ledger accounts for every source guard the phase's decisions named. The milestone PR body for v4.7 should carry the two `Closes #625` / `Closes #564` lines recorded above (table rows alone do not close issues, per the project's standing v4.7 constraint). The D-18 hand UAT (build both extensions from the final tree, run GUI/BUI/DWC, log into EM, compile a file) remains for a human to run via `/gsd-verify-work` before the phase is considered user-verified. No blockers for Phase 121 (`JavaInteropService` split, REF-09/REF-12).

## Self-Check: PASSED

- All three created files verified present on disk: `bbj-vscode/src/open-file-prompts.ts`, `bbj-vscode/src/diagnostic-status-bars.ts`, `.planning/phases/120-classvalidator-activate-splits/COVERAGE.md`.
- All three task commits (`b55412b8`, `de15df46`, `f816974a`) verified present in `git log --oneline --all`.
- Re-ran the whole-suite verify command, lint/typecheck/build, and the phase-wide hygiene shell check against the final tree; all printed their expected success markers (`suite names OK`, `gates OK`, `hygiene OK`, `block=false`).
- `git status --short` lists no file under `bbj-vscode/`; `git worktree list` shows no worktree under `/home/coder/repos/tmp/phase-120/`; no leftover `vitest` process.

---
*Phase: 120-classvalidator-activate-splits*
*Completed: 2026-09-29*
