---
phase: 113-composer-webview-hardening-consolidation
verified: 2026-09-27T13:45:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "In a live VS Code window (built extension), compose a new MSGBOX call, clear the assign-to field, type an invalid target (e.g. ret$), and observe the inline error under the field with Insert disabled; repeat for CVS with an invalid target (e.g. x); then confirm the edit-in-place and completing flows show no assign-to row at all."
    expected: "The error text appears under the assign-to field and the Insert button is disabled for the invalid/empty case; no assign-to row or error appears in edit-in-place or completing mode."
    why_human: "Visual rendering and button-enabled state in a live webview cannot be confirmed by static analysis; the mocked-vscode unit tests (composer-assign-to.test.ts) already exercise the same code paths (assignToError computed, WorkspaceEdit refused) but do not substitute for visual UAT of the built extension, per plan 04's own deferred verification note."
  - test: "In a live IntelliJ instance (built plugin), compose a new MSGBOX and a new CVS call, clear the assign-to field, type an invalid target, and observe the error label under the field with OK disabled; repeat clearing the field entirely; confirm the edit-in-place flow shows no assign-to row."
    expected: "The server's assignToError text renders under the field and OK is disabled; the row is absent in edit-in-place mode."
    why_human: "Requires a running IntelliJ instance built from the final tree; ComposerAssignToSourceGuardTest and ComposerModelsJsonBoundaryTest pin the wiring and JSON boundary but do not render Swing UI, per plan 03's own deferred verification note."
---

# Phase 113: Composer Webview Hardening & Consolidation Verification Report

**Phase Goal:** Every composer webview validates the messages it receives before touching the document, and msgbox validates its `assignTo` field like every other field. Once the remaining composer UI files are covered by tests, the duplicated CSP, call-locator, argument-scanner and UI helpers exist once each, and `composer-commands.ts` lives outside the language-server directory.
**Verified:** 2026-09-27
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | A message of the wrong shape posted to any of the six composer webviews (msgbox, addWindow, addChildWindow, SETOPTS, SETOPTS tristate, CVS) is dropped before `build()` or a WorkspaceEdit runs, and a test posts one to each | ✓ VERIFIED | Each of the six `*-composer-webview.ts` handlers has `if (!isXxxPanelMessage(msg)) return;` as its first statement (grep-confirmed at msgbox:163, addwindow:142, addchildwindow:149, cvs:129, setopts:115, setopts-tristate:143). `webview-message-guard.ts` holds the dependency-free primitives (0 imports). `composer-webview-message-shape.test.ts` and `webview-message-guard.test.ts` (314 tests across the 10 targeted files, all passing when re-run) post malformed batteries to each panel plus a discovery-based generic battery over every `open...Panel` export found in `src/`. |
| 2 | An invalid or (on a new insert) empty `assignTo` in the msgbox or CVS composer marks the preview invalid and blocks insertion, like an invalid message or title does, in both VS Code and IntelliJ | ✓ VERIFIED (live-UI visual check routed to human verification) | `validateAssignTo(text, resultType)` exported from `msgbox-composer.ts:340`; `cvs-composer.ts` imports and calls it with `'string'`. `MsgboxPreview.assignToError`/`CvsPreview.assignToError` fold into `valid`. IntelliJ's `ComposerModels.assignToError` (2 occurrences, msgbox+CVS) pinned across the JSON boundary; both dialogs render it via `labeledWithError("Assign result to", ...)` and gate OK/Insert only on the server's `valid`. `composer-assign-to.test.ts` exercises both preview functions and both VS Code panels end to end with a mocked-vscode harness (re-run, passing). Live visual confirmation in a running VS Code/IntelliJ session is deferred by plans 03/04 themselves to phase UAT — see Human Verification below. |
| 3 | The addWindow, addChildWindow and SETOPTS `*-composer-ui.ts` files are executed by tests (their code actions, code lenses and commands), not only mocked, and those tests pass before and after the consolidation | ✓ VERIFIED | `test/addwindow-composer-ui.test.ts`, `test/addchildwindow-composer-ui.test.ts`, `test/setopts-composer-ui.test.ts` each mock only `vscode` (`vi.mock(` count = 1 per file, re-confirmed). Re-run of all three post-consolidation (after plans 05-08 moved/refactored the helpers they exercise): all pass, 0 regressions. |
| 4 | The webview CSP array, `scanArgs`, the call locator and the addWindow/addChildWindow `titleArg` and code-action helpers each exist once, `composer-commands.ts` lives outside `src/language/`, and the composer suites pass without changes to their assertions | ✓ VERIFIED | `grep -rn` confirms exactly one `scanArgs`/`trimmedRange` definition (`composer-call-scanner.ts`), exactly one `titleArg` definition (`window-composer-ui.ts`), and `default-src` appears in exactly one `src` file (`webview-csp.ts`). `composer-commands.ts` exists at `bbj-vscode/src/composer-commands.ts`; `bbj-vscode/src/language/composer-commands.ts` confirmed absent. `main.ts` imports it from `'../composer-commands.js'`. `npx tsc -p tsconfig.json` exits 0 with no output. |
| 5 | The IntelliJ `AddWindowComposerDialog` and `ComposerLauncher` class docs describe the edit-in-place flow and all six composer kinds | ✓ VERIFIED | Read both class docs directly: `ComposerLauncher`'s doc names all six `Kind` values (MSGBOX, ADDWINDOW, ADDCHILDWINDOW, SETOPTS, SETOPTS_IN_CODE, CVS) in declaration order and describes edit-in-place, completing and create paths plus the stale-cue behavior. `AddWindowComposerDialog`'s doc describes both the create flow (title "Compose addWindow", OK "Insert") and the edit-in-place flow (title "Configure window flags", OK "Apply", geometry hidden, preserved bits). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/webview-message-guard.ts` | Dependency-free type-check primitives + `isPanelMessage` | ✓ VERIFIED | Exists, 0 `^import` lines, exports confirmed used by all 6 webviews |
| `bbj-vscode/src/webview-csp.ts` | `buildComposerCsp(webview)` | ✓ VERIFIED | Exists, called by all 6 webviews (`grep -c` = 1 each), `default-src` appears only here |
| `bbj-vscode/src/composer-call-scanner.ts` | `scanArgs`, `trimmedRange`, `findCalls`, `findCallAt` | ✓ VERIFIED | Exists, 0 imports, sole definitions of `scanArgs`/`trimmedRange` under `src/` |
| `bbj-vscode/src/window-composer-ui.ts` | `titleArg`, `windowPanelArgAt` | ✓ VERIFIED | Exists, sole `titleArg` definition under `src/`, used by both `*-composer-ui.ts` files and `composer-commands.ts` |
| `bbj-vscode/src/composer-commands.ts` | Moved out of `src/language/` | ✓ VERIFIED | Exists at new path; old path confirmed absent; `main.ts` import updated |
| `bbj-vscode/test/{addwindow,addchildwindow,setopts}-composer-ui.test.ts` | TEST-10 unmocked coverage | ✓ VERIFIED | All 3 exist, pass, mock only `vscode` |
| `bbj-vscode/test/{webview-message-guard,composer-webview-message-shape,composer-assign-to,composer-call-scanner,webview-csp,window-composer-ui}.test.ts` | New coverage for each consolidated module | ✓ VERIFIED | All 6 exist and pass |
| `bbj-intellij/.../ComposerModels.java` | `assignToError` fields | ✓ VERIFIED | 2 occurrences (MsgboxPreview, CvsPreview) |
| `bbj-intellij/.../{Msgbox,Cvs}ComposerDialog.java` | Render `assignToError`, drop "(optional)" | ✓ VERIFIED | Confirmed via grep; "(optional)" absent |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| 6 `*-composer-webview.ts` handlers | `webview-message-guard.ts` | `isXxxPanelMessage(msg)` as first handler statement | ✓ WIRED | Confirmed at all 6 call sites (line numbers above) |
| 6 `*-composer-webview.ts` `getHtml` | `webview-csp.ts` | `buildComposerCsp(webview)` | ✓ WIRED | Confirmed at all 6 call sites |
| `cvs-composer.ts` | `msgbox-composer.ts` | `validateAssignTo(..., 'string')` import | ✓ WIRED | Confirmed via grep (import line + call site) |
| `MsgboxComposerDialog.java` / `CvsComposerDialog.java` | `ComposerModels.assignToError` | `assignToError.setText(p.assignToError...)` | ✓ WIRED | Confirmed at both dialog call sites |
| `src/language/main.ts` | `bbj-vscode/src/composer-commands.ts` | `import { registerComposerRequests } from '../composer-commands.js'` | ✓ WIRED | Confirmed; `out/language/main.cjs` rebuilt and present, contains composer request names per plan 05/08 SUMMARY evidence |
| `addwindow-composer-ui.ts` / `addchildwindow-composer-ui.ts` | `window-composer-ui.ts` | `windowPanelArgAt(...)` | ✓ WIRED | Confirmed (`unknownBits(` count 0 in both UI files, `windowPanelArgAt(` count 1 in both) |

### Behavioral Spot-Checks / Targeted Test Runs

| Behavior | Command | Result | Status |
|---|---|---|---|
| All phase-113 new/modified test files pass together | `npx vitest run test/webview-message-guard.test.ts test/composer-webview-message-shape.test.ts test/webview-csp.test.ts test/composer-call-scanner.test.ts test/window-composer-ui.test.ts test/composer-assign-to.test.ts test/addwindow-composer-ui.test.ts test/addchildwindow-composer-ui.test.ts test/setopts-composer-ui.test.ts test/composer-commands.test.ts` | 10 files passed, 314 tests passed | ✓ PASS |
| IntelliJ composer package builds and tests pass | `./gradlew cleanTest test --tests 'com.basis.bbj.intellij.composer.*'` | BUILD SUCCESSFUL | ✓ PASS |
| TypeScript compiles cleanly | `npx tsc -p tsconfig.json` | exit 0, no output | ✓ PASS |
| Planning-identifier register-check across phase diff | `git diff e09aa21d..HEAD -- bbj-vscode/src bbj-vscode/test bbj-intellij/src \| grep '^+' \| grep -nE '...'` | 0 matches | ✓ PASS |
| Debt markers (TBD/FIXME/XXX/HACK/PLACEHOLDER) in new phase-113 source files | targeted grep on 5 new modules | 0 matches | ✓ PASS |

Note: per this repo's project rules, the full vitest suite was not re-run in this verification pass (the executor of the last plan already ran it on the final tree; `numFailedTests: 11` is the documented pre-existing `linking.test.ts` interop baseline). The targeted run above covers every test file created or modified across all 8 plans of this phase.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| SEC-10 | 113-02 | All six composer webviews validate postMessage shape | ✓ SATISFIED | Guards wired at all 6 sites, tests pass; REQUIREMENTS.md marked Complete |
| SEC-11 | 113-03, 113-04 | msgbox/CVS `assignTo` validation, both IDEs | ✓ SATISFIED (live-UI check deferred to human verification) | Validator + preview wiring + both dialogs confirmed; REQUIREMENTS.md marked Complete |
| TEST-10 | 113-01 | addwindow/addchildwindow/setopts `*-ui.ts` executed by tests | ✓ SATISFIED | 3 files exist, pass, mock only vscode; REQUIREMENTS.md marked Complete |
| REF-03 | 113-05 | `composer-commands.ts` outside `src/language/` | ✓ SATISFIED | Confirmed moved; REQUIREMENTS.md marked Complete |
| REF-07 | 113-07 | CSP array built by one shared helper | ✓ SATISFIED | Confirmed single location; REQUIREMENTS.md marked Complete |
| REF-08 | 113-06, 113-08 | Call-locator/argument-scanner/titleArg/code-action helpers exist once | ✓ SATISFIED | Confirmed single definitions; REQUIREMENTS.md marked Complete |
| DOC-01 | 113-03 | IntelliJ class docs describe edit-in-place + all six kinds | ✓ SATISFIED | Confirmed by direct read; REQUIREMENTS.md marked Complete |

No orphaned requirements: every ID declared across the phase's 8 plans (`SEC-10, SEC-11, TEST-10, REF-03, REF-07, REF-08, DOC-01`) matches the ROADMAP's declared requirement list for Phase 113 exactly, and REQUIREMENTS.md's cross-reference table shows all 7 as `Phase 113 | Complete`.

### Anti-Patterns Found

None (blocker-tier). No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` markers in the phase's new source modules. No stub returns, empty handlers, or hardcoded-empty stub data found in the reviewed modules.

**Advisory findings from 113-REVIEW.md (0 critical, 2 warning, 1 info) — do not block this phase, noted for follow-up:**
- **WR-01**: `setopts-composer-webview.ts`'s `isSetOptsSelection` guard validates `checked` as `string[]` (matches the declared `Selection` field type) but does not validate each entry's internal `"byte:mask"` format. The reviewer hand-traced this and confirmed it is currently inert (a malformed entry can never satisfy the catalog's strict-equality membership test, so it is silently and harmlessly dropped). This does not fail the must-have as specified ("every Selection field has its declared runtime type... arrays hold only the declared element type") — `checked` is validated as a string array correctly — but is a real hardening gap worth closing in a follow-up plan before any future change threads `sel.bits` more directly into indexing.
- **WR-02**: The CVS-vs-MSGBOX boundary-mode test doesn't extend to addWindow/addChildWindow, so a future accidental flip of their `findCalls` options argument would not be caught by a test. Does not affect current correctness (addWindow/addChildWindow already default to the correct looser mode, confirmed passing tests) — a coverage gap, not a defect.
- **IN-01**: A misleading "apply right-to-left" comment in `addchildwindow-composer-webview.ts` that doesn't reflect how `vscode.WorkspaceEdit` actually applies edits. Documentation-only, no functional impact.

Neither warning breaks a phase must-have; both are recorded here per the verification instructions rather than treated as gaps.

### Human Verification Required

Both items below were explicitly flagged as deferred-to-UAT by the executing plans themselves (113-03 SUMMARY D5, 113-04 SUMMARY D6) because they require a live, built extension/plugin rather than a mocked test harness.

### 1. VS Code: assign-to validation renders and gates Insert in a live webview

**Test:** Build the VSIX from the final tree, install it, open a BBj file, compose a new MSGBOX call, clear the assign-to field and type an invalid target (e.g. `ret$`); repeat for a new CVS call with an invalid target (e.g. `x`); then trigger the edit-in-place flow (Code Action on an existing call) and the completing flow for each.
**Expected:** The inline error shows under the assign-to field and the Insert button is disabled for the invalid/empty case; typing a valid target (e.g. `ret!` / `s$`) clears the error and re-enables Insert; the edit-in-place and completing flows show no assign-to row or error at all.
**Why human:** Visual rendering (error text, disabled-button state) in a live VS Code webview cannot be confirmed by static analysis or a mocked-vscode unit test; `composer-assign-to.test.ts` already proves the underlying logic (assignToError computed, WorkspaceEdit refused) but this is not a substitute for visual UAT, per the plan's own note.

### 2. IntelliJ: assign-to validation renders and gates OK in a live dialog

**Test:** Build the IntelliJ plugin zip from the final tree, install it, compose a new MSGBOX and a new CVS call, clear the assign-to field and type an invalid target; repeat with an empty field; then open the edit-in-place flow for each.
**Expected:** The server's `assignToError` text renders under the field and OK is disabled; the row and its error label are absent in edit-in-place mode.
**Why human:** Requires a running IntelliJ instance built from the final tree; `ComposerAssignToSourceGuardTest` and `ComposerModelsJsonBoundaryTest` pin the wiring and JSON boundary contract but do not render Swing UI, per the plan's own note.

### Gaps Summary

No gaps found. All 5 ROADMAP success criteria for Phase 113 are verified against the actual codebase: all 7 declared requirements (SEC-10, SEC-11, TEST-10, REF-03, REF-07, REF-08, DOC-01) have concrete, wired, tested implementations, with zero regressions across the 8 plans' combined targeted test suite (314 tests, 10 files) and a clean IntelliJ composer-package build. The two items routed to human verification are pre-flagged, narrowly-scoped visual/live-UI checks that both executing plans explicitly deferred to phase UAT — not defects found during this verification.

---

_Verified: 2026-09-27_
_Verifier: Claude (gsd-verifier)_
