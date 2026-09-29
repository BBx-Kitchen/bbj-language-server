---
phase: 120-classvalidator-activate-splits
verified: 2026-09-29T08:14:11Z
status: passed
score: 5/6 must-haves verified (1 present, behavior-unverified — hand UAT)
behavior_unverified: 1
overrides_applied: 0
human_verification:

  - test: "Build and install the VSIX (and IntelliJ plugin zip) from the final tree (including the post-review fix commit 4934de34), then in a running VS Code instance: run a GUI program, run a BUI program, run a DWC program, log into Enterprise Manager, and compile a file."
    expected: "Each behaves identically to the pre-phase build: GUI/BUI/DWC launch and run, EM login prompts for credentials and stores a working session, and compilation produces the same diagnostics as before the split."
    why_human: "Roadmap success criterion 4 is an explicit hand check in a real VS Code + BBj runtime; no automated test exercises the live EM login browser flow, GUI/BUI/DWC process launch, or the on-save compiler integration end to end. The phase's own plans (D-18) defer this to /gsd-verify-work and do not claim it was run."
---

# Phase 120: ClassValidator & activate() Splits Verification Report

**Phase Goal:** The two remaining god objects outside java-interop, `ClassValidator` and the VS Code `activate()` function, are split along their responsibilities and produce identical diagnostics and identical extension behaviour.
**Verified:** 2026-09-29T08:14:11Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ClassValidator's four responsibilities live in separate modules; class-validation and inheritance-cycle suites report identical diagnostics without assertion changes | ✓ VERIFIED | `check-class-reference.ts`, `check-return-types.ts`, `check-constructor.ts`, `check-cyclic-inheritance.ts` each export exactly the functions the plan specifies; `check-classes.ts` exports only `registerClassChecks`; zero `ClassValidator`/`this.` occurrences remain. Independently ran the 10 validation suites: `Test Files 10 passed (10)`, `Tests 185 passed (185)`, no test file edited (confirmed by diff scope below). |
| 2 | activate() calls single-purpose registration functions; EM validate, EM login and the Commands.cjs run path share one exec-wrapping helper with its own unit tests | ✓ VERIFIED | `activate()`'s body register-call sequence, independently extracted, is exactly `register( registerMsgboxComposer( ... registerConfigFileCommands( registerEmLoginCommand( registerRunCommands( ... registerOpenFilePrompts( registerDiagnosticStatusBars( registerConfigReloadStatus( registerConfigAssociation(` — matches the plan's pinned order. `em-script-runner.ts` (`createScriptOutputFile`/`runScriptToOwnerOnlyFile`, built on `runProcess`) is the shared runner both EM login and EM validate call; `test/em-script-runner.test.ts` exists and passes. `Commands.cjs`'s `execWithProgress` alias is unchanged (byte-identical), doc-comment-only edit confirmed. See note below on a shell-verification-script discrepancy (not a functional defect). |
| 3 | The `bbj.em.credentials` fallback and the unreachable `bbj.web.username`/`bbj.web.password` branch are gone (or kept per locked decision); activation, Commands.cjs and EM tests pass unchanged; every contributed command is still registered | ✓ VERIFIED | `grep -rn "bbj.em.credentials" src` returns nothing — fallback deleted. The `runWeb` non-token branch in `Commands.cjs` is confirmed kept (CONTEXT.md D-10, five `commands-cjs-execution.test.ts` tests drive it) — this is the user-approved locked decision cited in the phase goal note, correctly honored. `activation-command-coverage.test.ts` (proving every contributed command reaches `registerCommand`) and `activation-prompts-and-status-bars.test.ts` pass; independently ran all 21 host-side suites: `Test Files 21 passed (21)`, `Tests 334 passed | 1 skipped`. The one locked test re-expression (`em-secret-env-channel.test.ts`) is confirmed: exactly the 3 base `expect()` lines naming `creationIndices`/`launcherIndices` were removed, every other `expect()` line in that file and in `no-shell-command-construction.test.ts` is byte-identical to base — matches the user-approved exception recorded in 120-CONTEXT.md and both SUMMARYs. |
| 4 | A hand check in VS Code runs a GUI, a BUI and a DWC program, logs into EM and compiles a file | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Not claimed as done by any plan/SUMMARY (D-18 explicitly defers this to a human via `/gsd-verify-work`); routed to human verification below. |

**Score:** 3/4 roadmap criteria fully machine-verified; criterion 4 is, by design, a human item.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/validations/class-types.ts` | shared class-type helpers | ✓ VERIFIED | Exports `classFqn`, `bbjSupertypesReach`, `KNOWN_BBJ_SCALAR_TYPES`, `bbjTypesAreRelated`; imported by `check-variable-scoping.ts` and the return-type/class-reference modules |
| `bbj-vscode/src/language/validations/check-cyclic-inheritance.ts` | cyclic-inheritance check | ✓ VERIFIED | `export function checkCyclicInheritance(klass: BbjClass, accept: ValidationAcceptor): void` present, called from `check-classes.ts` |
| `bbj-vscode/src/language/validations/check-class-reference.ts` | class reference/visibility checks | ✓ VERIFIED | Exports `checkClassReference`, `checkBBjClass`; called from `check-classes.ts` |
| `bbj-vscode/src/language/validations/check-return-types.ts` | return-type/field-init checks | ✓ VERIFIED | Exports `checkMethodReturn`, `checkFieldInit`; `FINAL_TYPE_ASSIGNABLE_TO` present as module constant |
| `bbj-vscode/src/language/validations/check-constructor.ts` | constructor checks | ✓ VERIFIED | Exports `checkInstantiable`, `checkConstructorArguments` |
| `bbj-vscode/src/language/validations/check-classes.ts` | single registration entry point | ✓ VERIFIED | Exports only `registerClassChecks`; `registry.register(classChecks)` with no `thisArg` |
| `bbj-vscode/src/em-auth.ts` | EM login command, token validation, credential lookup | ✓ VERIFIED | Exports `EmAuthDeps`, `getEMCredentials`, `ensureValidToken`, `registerEmLoginCommand`; `bbj.em.credentials` fallback absent |
| `bbj-vscode/src/em-script-runner.ts` | shared owner-only-output runner | ✓ VERIFIED | Exports `createScriptOutputFile`, `runScriptToOwnerOnlyFile`; no vscode/child_process import |
| `bbj-vscode/src/open-file-prompts.ts` | tokenized/line-numbered open prompts | ✓ VERIFIED | Exports `registerOpenFilePrompts(context)`; no module-level Set/Map (per-activation state) |
| `bbj-vscode/src/diagnostic-status-bars.ts` | suppression/BBjCPL status bars | ✓ VERIFIED | Exports `registerDiagnosticStatusBars(context, { client })` |
| `.planning/phases/120-classvalidator-activate-splits/COVERAGE.md` | api-coverage declaration | ✓ VERIFIED | One line, `api-coverage.verify-pre` reports `block=false` (independently re-run) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `bbj-validator.ts` | `check-classes.ts registerClassChecks` | unchanged import/call | ✓ WIRED | `bbj-validator.ts` byte-identical to base (confirmed via diff scope: not in the 19 changed files) |
| `check-classes.ts` | four validation modules | per-node-type handlers call free functions in base order | ✓ WIRED | 13 `check*(` calls in `registerClassChecks`, order independently confirmed via structural grep matching the plan's documented base order |
| `check-variable-scoping.ts` | `class-types.ts` | named import | ✓ WIRED | `import { bbjTypesAreRelated, KNOWN_BBJ_SCALAR_TYPES } from './class-types.js';` confirmed present |
| `extension.ts activate()` | `em-auth.ts registerEmLoginCommand` | one call at base position | ✓ WIRED | `registerEmLoginCommand(context, { outputChannel });` present in `activate()`'s register sequence |
| `extension.ts activate()` | `open-file-prompts.ts registerOpenFilePrompts` | one call | ✓ WIRED | Present in the independently-extracted register sequence |
| `extension.ts activate()` | `diagnostic-status-bars.ts registerDiagnosticStatusBars` | one call with `{ client }` | ✓ WIRED | Present in the independently-extracted register sequence |
| `em-auth.ts` | `em-script-runner.ts` | `createScriptOutputFile`/`runScriptToOwnerOnlyFile` calls | ✓ WIRED | Both functions imported and called for both EM login (15000ms) and EM validate (10000ms) paths |

### Data-Flow Trace (Level 4)

Not applicable — this phase is a structural refactor (function relocations), not a data-rendering feature. No new data source or rendered value was introduced.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Ten validation suites pass unedited | `npx vitest run` (10 files) | `Test Files 10 passed (10)`, `Tests 185 passed (185)` | ✓ PASS |
| 21 REF-11 host-side suites pass unedited | `npx vitest run` (21 files) | `Test Files 21 passed (21)`, `Tests 334 passed \| 1 skipped` | ✓ PASS |
| Whole suite has no failing name beyond the base | `npx vitest run --maxWorkers=2 --reporter=json` + `comm` against base-failed list | `numFailedTests=0 numPassedTests=3637 numPendingTests=30 numTotalTests=3667`; only failing suite is pre-existing `installed-extension-e2e.test.ts`, present in the base's own failed list | ✓ PASS |
| Lint clean | `npm run lint` | exit 0, no findings | ✓ PASS |
| Typecheck clean | `npm run typecheck:test` | exit 0, no findings | ✓ PASS |
| `bbj.em.credentials` fallback removed | `grep -rn "bbj.em.credentials" src` | no matches | ✓ PASS |
| Commands.cjs changed only in comments | `git diff <base> -- Commands.cjs` non-comment-line filter | empty | ✓ PASS |
| File scope matches exactly the 19 claimed files | `git diff --name-only <base> -- bbj-vscode \| sort` | exact match to the list in 120-04-SUMMARY.md | ✓ PASS |
| No planning identifiers added | `git diff <base> \| grep '^+' \| grep -E <id-patterns>` | 0 matches | ✓ PASS |
| No closing-keyword-before-issue in commit bodies | `git log --format=%B <base>..HEAD \| grep -E <pattern>` | 0 matches | ✓ PASS |
| em-secret-env-channel guard: only the 3 expected expect() lines removed, rest byte-identical | shell diff of expect() lines, base vs head | exact match to the claimed exception | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REF-10 | 120-01 | ClassValidator split into modules, unchanged diagnostics | ✓ SATISFIED | Marked Complete in REQUIREMENTS.md; artifacts and suites independently verified above |
| REF-11 | 120-02, 120-03, 120-04 | activate() split into single-purpose registration functions sharing one exec helper, unchanged behaviour | ✓ SATISFIED | Marked Complete in REQUIREMENTS.md; artifacts, register sequence and 21 host suites independently verified above |

No orphaned requirements: REQUIREMENTS.md maps only REF-10 and REF-11 to Phase 120, and both are declared by plans in this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none found | — | Scanned all 9 new/heavily-modified source files (`em-auth.ts`, `em-script-runner.ts`, `open-file-prompts.ts`, `diagnostic-status-bars.ts`, and the 5 validation modules) for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER and "not yet implemented" text — none found |

One item from the phase's own code-review report (WR-01: an unbraced `switch` case in `check-class-reference.ts` risking a lexical-scope footgun) was found already fixed in the working tree by commit `4934de34` ("fix(class-validation): scope the PROTECTED switch case to its own block"), applied after the 120-REVIEW.md review. Independently confirmed the fix is present and the affected validation suites still pass.

## Verification Note: one self-reported shell-check claim does not reproduce

120-04-SUMMARY.md's Task 2 evidence states that its own acceptance shell check printed `"activate shape OK"`. Re-running that exact check (as literally written in 120-04-PLAN.md, Task 2's second `<automated>` block) against the current tree does **not** print that line — it exits non-zero at the sub-check `grep -c -E 'registerCommand\(|onNotification\(|createStatusBarItem\(|\.onDid[A-Za-z]+\('` over `activate()`'s body, which returns `1` instead of the required `0`.

Root cause: `activate()` retains a pre-existing, untouched comment (present since before this phase, part of the byte-identical top boilerplate per D-13) that reads `` `.trace(...)` / `.onDidChangeLogLevel(...)` `` — explanatory prose about `vscode-languageclient`'s API, not a real call. The plan's shell check does not strip comments before this particular grep (unlike several of its sibling checks), so the check has a false-positive bug against code that predates the phase.

This does **not** indicate a functional regression: manually reading `activate()`'s body confirms the only match is inside that comment, and the actual register-call sequence (independently re-extracted above) matches the plan's required order exactly, with the sole real `context.subscriptions.push(` call intact and no direct `registerCommand`/`onNotification`/`createStatusBarItem`/`.onDid*` call anywhere else in the function body. The underlying truth ("activate() registers nothing directly") holds. However, the SUMMARY's claim that this specific automated check exited 0 and printed its success marker is not reproducible against the final tree, which is a genuine discrepancy between the self-reported evidence and what actually runs today — worth a maintainer's awareness even though it does not block the phase goal.

### Human Verification Required

### 1. Roadmap success criterion 4 — hand UAT in a real VS Code + BBj environment

**Test:** Build and install the VSIX (and, if relevant, the IntelliJ plugin zip) from the final tree — including the post-review fix commit `4934de34` — then in a running VS Code instance with the extension installed: run a GUI program, run a BUI program, run a DWC program, log into Enterprise Manager (`bbj.em`), and compile a file (`bbj.compile`).
**Expected:** Each behaves identically to the pre-phase build — GUI/BUI/DWC launch and run as before, the EM login flow prompts for credentials and completes a working session exactly as before the split (now routed through `em-auth.ts`/`em-script-runner.ts`), and compilation produces the same diagnostics as before.
**Why human:** This is explicitly a live-environment check (real VS Code, real BBj toolchain, a real Enterprise Manager instance) that no automated test in this repository exercises end to end. The phase's own plans (D-18) defer it to `/gsd-verify-work` and no SUMMARY claims it was run.

### Gaps Summary

No blocking gaps. All must-have truths, artifacts and key links for REF-10 and REF-11 are independently verified against the current codebase (not just SUMMARY narrative): the ClassValidator split is structurally and behaviorally confirmed by re-running the ten validation suites; the activate() split is structurally confirmed by re-extracting the register-call sequence and re-running the 21 host-side suites; the whole test suite, lint, and typecheck were independently re-run and match the phase's own recorded evidence exactly; the file-scope, hygiene, and guard-exception checks were independently re-run and match exactly. The single discrepancy found (a shell-check false-positive on pre-existing comment text, documented above) does not affect the underlying goal achievement but is flagged for the record. The phase's own design correctly defers the live-environment UAT (roadmap criterion 4) to a human, which is the only reason this report is not `passed`.

---

_Verified: 2026-09-29T08:14:11Z_
_Verifier: Claude (gsd-verifier)_
