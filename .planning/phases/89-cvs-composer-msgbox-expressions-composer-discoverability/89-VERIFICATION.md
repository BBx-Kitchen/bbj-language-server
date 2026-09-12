---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
verified: 2026-09-12T12:10:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open examples/issue650-composer-cues.bbj in a running VS Code editor (installed VSIX) without placing the caret or opening any menu. Confirm a persistent CodeLens reading Compose MSGBOX / Compose addWindow / Compose addChildWindow / Compose CVS() / Compose SETOPTS renders above each applicable line, and nothing renders above the mode% CVS line, the interrupted SETOPTS chain, the REM line, or the string decoy."
    expected: "All five cue kinds are visibly rendered as CodeLens text with no icon, exactly on the lines the e2e test already proves the server returns cues for; clicking each opens the matching composer pre-filled; Cancel leaves the file unchanged."
    why_human: "installed-extension-e2e.test.ts proves the server-computed codeLens payload (kind, line, command, arguments) is correct against the installed bundle over IPC, but no automated harness in this devcontainer renders VS Code's editor UI, so the actual on-screen CodeLens rendering and click-through for MSGBOX/addChildWindow/CVS/SETOPTS (as opposed to addWindow, which a human already confirmed in plan 89-06) has not been visually observed."
  - test: "Open the same fixture in a real IntelliJ build inside the plugin's sinceBuild range, with the BBj Language Server plugin and LSP4IJ 0.21.0 installed, without placing the caret. Confirm Code Vision entries render for all five cue kinds and that clicking each opens the matching dialog (CvsComposerDialog, MsgboxComposerDialog with/without the replace banner, addWindow/addChildWindow dialogs, and the config SETOPTS dialog)."
    expected: "Same rendering/click-through behavior as VS Code, for every kind including the config-file setopts-config cue (opened on a bbx-config-mapped document) and the MSGBOX compose-and-replace banner on the flags% line."
    why_human: "Plan 89-06's Code Vision spike confirmed the mechanism (GO, IU-262.10315.125) using only the addWindow cue. ComposerLensKinds/BbjOpenComposerAtAction/plugin.xml wiring for the other four kinds is proven correct by Java unit/source-guard tests (ComposerLensKindsTest, ComposerLensCommandContractTest, ComposerModelsJsonBoundaryTest, BbjConfigFileTypeRegistrationTest — all pass), but none of those tests render a live IntelliJ Code Vision entry or click through it; QA/FULL-TEST-CHECKLIST.md rows 23-27 are unchecked, meaning this walkthrough has not yet been executed by a human."
  - test: "In IntelliJ, open the CVS() composer (Alt+Enter on a CVS( call, the editor context menu, and the Compose CVS() cue) and visually confirm: the eight operations render as one flat checkbox list with no byte-group headers and no scroll pane; the chars field stays visible but greyed-out/disabled when no chars-customizable bit is checked, with its tooltip naming BBj 19.0/19.10; OK stays disabled until the first preview resolves."
    expected: "Layout, disabled-field greying, and OK-gating behave exactly as CvsComposerDialog.java's source (checked structurally: one PreviewDebouncer, zero JBScrollPane) implies."
    why_human: "Java source-guard tests confirm the dialog's structural shape (no scroll pane, single debouncer, tooltip wiring) but cannot observe rendered greying/disabled visuals or interactive OK-gating in a live Swing dialog; deferred to plan 89-13's own end-of-phase human checks (QA row 26/similar), which are unchecked."
  - test: "In a large .bbj file containing many composer calls, type continuously in both VS Code and IntelliJ and confirm no perceptible added input lag after the composer-cue feature shipped."
    expected: "No noticeable typing lag versus the file's behavior before Phase 89 (Roadmap Success Criterion 5's perceptual half)."
    why_human: "Plan 89-01/89-09's structural tests prove zero parser/DocumentBuilder.update/DocumentBuilder.build calls across 20 repeated codeLens requests on a synthetic 5000+ line document — real but not perceptual evidence. Plan 89-13's own must-have for this truth is explicitly tagged `verification: backstop` (no automated check possible) and is carried as an unchecked human-check item in QA/FULL-TEST-CHECKLIST.md."
---

# Phase 89: CVS() Composer, MSGBOX Expressions & Composer Discoverability Verification Report

**Phase Goal:** Every composer opportunity is visibly discoverable in both IDEs without opening a menu, MSGBOX offers its composer for expression-valued options (shipped before the cue so the cue doesn't silently fail to appear on the lines #648 fixes), and users can compose CVS() calls visually.
**Verified:** 2026-09-12T12:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | [Go/no-go] IntelliJ's visual-cue mechanism is confirmed to compile and render visibly against the plugin's sinceBuild range via a same-phase spike, before other cue-dependent work is done | ✓ VERIFIED | `89-06-SUMMARY.md`: human-recorded `Code Vision spike: GO (IU-262.10315.125)` on IntelliJ IDEA 2026.2.2, LSP4IJ 0.21.0, before plans 89-07..89-13 ran (roadmap wave-gating and plan preconditions confirmed — 89-12's own SUMMARY re-quotes both required lines before proceeding) |
| 2 | A user sees a persistent, clickable cue on every line where MSGBOX/addWindow/addChildWindow/CVS/SETOPTS composers apply, in both VS Code and IntelliJ, without caret or context menu | ⚠️ Code/wiring VERIFIED; live-render for 4 of 5 kinds not yet human-observed | Server: `composer-codelens.ts` computes all five kinds correctly (read + tests below); VS Code: `extension.ts` documentSelector + `composer-lens-command.ts` dispatch for all 6 wire kinds, confirmed by 162 passing targeted unit tests and 30 passing installed-bundle e2e tests (`installed-extension-e2e.test.ts`, run against the reinstalled VSIX in this session); IntelliJ: `ComposerLensKinds.java` maps all six wire kinds, `plugin.xml` registers `bbj.openComposerAt` and both language mappings, confirmed by a full green IntelliJ composer/config/actions/lsp test run (Gradle, this session). Only the addWindow kind's live on-screen rendering/click-through was human-confirmed (plan 89-06); the other four kinds' visual rendering awaits the unchecked QA rows — see human_verification |
| 3 | MSGBOX options that sum constant Java static fields or integer literals pre-fill the composer; any other expression opens compose-and-replace | ✓ VERIFIED | `msgbox-composer.ts`'s `parseMsgboxOptionsSum`/`decodeMsgboxCall`, `msgbox-composer-webview.ts`'s banner/read-only field, and IntelliJ's `MsgboxComposerDialog.java` (`replace != null` gate, `AllIcons.General.BalloonWarning`, read-only `originalOptionsField`) all read as claimed; unit tests pass on both sides (TS: `msgbox-composer.test.ts`, `msgbox-composer-ui.test.ts`; Java: `ComposerReplaceBannerSourceGuardTest`, `DecodeEqualityTest`, `ComposerModelsJsonBoundaryTest`) |
| 4 | A user can compose a CVS() call visually in both IDEs using the eight documented bits (ascending order) incl. the version-gated `chars` parameter, and edit an existing literal-mask call in place | ✓ VERIFIED | `cvs-composer.ts` (`CVS_BITS` — 8 bits ascending, `charsCustomizable` exactly for 1/2/16/32/128, `CVS_CHARS_TOOLTIP` naming 19.0/19.10, `decodeCvsCall`'s three named not-editable reasons), `functions.ts`/`functions.bbl` widened to `chars?:string` (confirmed by reading both files and by the passing `builtin-functions-library.test.ts`), VS Code `cvs-composer-webview.ts`/`cvs-composer-ui.ts`, IntelliJ `CvsComposerDialog.java`/`ConfigureCvsIntention.java`/`BbjComposeCvsAction.java` all present and wired; all targeted TS tests (cvs-composer, cvs-composer-ui) and all IntelliJ composer tests pass |
| 5 | The cue mechanism computes positions without a full-document reparse per keystroke — no added typing lag on a large file | ⚠️ Structurally VERIFIED; perceptual half not yet human-observed | `composer-codelens-handler.test.ts`'s widened structural test (all five kinds mixed into a 5000+ line synthetic document) asserts zero `parser.parse`/`DocumentBuilder.update`/`DocumentBuilder.build` calls across 20 consecutive `provideCodeLens` requests — re-confirmed passing in this session. The perceptual/felt half is explicitly `verification: backstop` in plan 89-13's own must-haves and is an unchecked QA item — see human_verification |

**Score:** 5/5 truths structurally/code verified (2 of the 5 also carry an outstanding perceptual/visual human-check item, tracked below rather than counted as a gap)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/composer-lens-contract.ts` | Shared cue contract (command id, kinds, target shape, titles, config language id) | ✓ VERIFIED | Present, zero runtime imports, six `ComposerLensKind` values, `COMPOSER_LENS_TITLES` plain-text, `CONFIG_DOCUMENT_LANGUAGE_ID = 'bbx-config'` |
| `bbj-vscode/src/language/composer-codelens.ts` | Cue provider + candidate collection for all 5 composer kinds + config lens | ✓ VERIFIED | `collectComposerLensCandidates` detects addwindow/msgbox/addchildwindow/cvs(gated on `decodeCvsCall`)/setopts-in-code(gated on `decodeSetoptsInCode`); `configComposerLenses` for `bbx-config`; `BBjComposerCodeLensProvider` registered via DI |
| `bbj-vscode/src/language/composer-codelens-handler.ts` | Bounded handler gated at `DocumentState.Parsed`, config fast-path | ✓ VERIFIED | `COMPOSER_CODE_LENS_BUDGET_MS = 5000`, config-language early return before any wait, `DocumentState.Parsed` gate, all failure paths return `null` |
| `bbj-vscode/src/composer-lens-command.ts` | VS Code `bbj.openComposerAt` dispatch for all 6 wire kinds | ✓ VERIFIED | File exists, dispatch branches confirmed via passing `composer-lens-command.test.ts` |
| `bbj-vscode/src/cvs-composer.ts` | CVS catalog, compose, decode, preview | ✓ VERIFIED | Matches plan spec exactly (8 bits, `charsCustomizable` set, `CVS_KNOWN_MASK=255`, `parseCvsLiteralSum`, `decodeCvsCall`, `cvsPreview`) |
| `bbj-vscode/src/language/lib/functions.ts` / `functions.bbl` | `CVS(str, mask, chars?, ERR?!)` signature | ✓ VERIFIED | Both files read `CVS(str:string, conversion_flags:int, chars?:string, ERR?!:lineref): string`; hand-synced mirror confirmed identical |
| `bbj-vscode/src/language/bbj-document-builder.ts` | `isBuildableDocumentUri` filter, config never built | ✓ VERIFIED | Filters `bbx-config`-language and service-less uris out of `update`; early-return when nothing survives |
| `bbj-vscode/src/language/bbj-hover-handler.ts` | Config-aware hover fast-path (DoS-hang fix found live in 89-13) | ✓ VERIFIED | New file, registered in `main.ts` after `startLanguageServer`, immediate `null` for `bbx-config`, unchanged delegation otherwise |
| `bbj-intellij/.../composer/ComposerLensKinds.java` | Wire-kind→launcher-kind map, all 6 kinds | ✓ VERIFIED | `cvs` maps to `Kind.CVS`; all 6 wire kinds present |
| `bbj-intellij/.../actions/BbjOpenComposerAtAction.java` | LSP4IJ Code Vision click target | ✓ VERIFIED | Registered as action id `bbj.openComposerAt` in `plugin.xml` |
| `bbj-intellij/.../composer/CvsComposerDialog.java` | Flat CVS() dialog | ✓ VERIFIED | Present; `ComposerLauncher.Kind.CVS` wired; source guards (`JBScrollPane` count 0, one `PreviewDebouncer`) pass |
| `bbj-intellij/.../resources/META-INF/plugin.xml` | `bbj.openComposerAt`/`bbj.composeCvs` actions, `ConfigureCvsIntention`, two `languageMapping`s (`bbj`, `bbx-config`) | ✓ VERIFIED | All four confirmed present by direct read |
| `examples/issue650-composer-cues.bbj` | Fixture covering every kind incl. non-editable/decoy shapes | ✓ VERIFIED | Contains addWindow (incl. shared line, REM, string decoy), 3 MSGBOX shapes, addChildWindow, editable+non-editable CVS, absolute/safe-chain/interrupted-chain SETOPTS |
| `QA/FULL-TEST-CHECKLIST.md` | Hand-check rows for cues, CVS composer, MSGBOX expressions, both IDEs | ✓ VERIFIED (rows present, unchecked) | Rows 17-21 (VS Code), 23-27 (IntelliJ) present; all checkboxes are `[ ]` — not yet executed by a human |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bbj-module.ts` | `composer-codelens.ts` | `lsp.CodeLensProvider` DI entry | ✓ WIRED | `CodeLensProvider: () => new BBjComposerCodeLensProvider()` confirmed present |
| `main.ts` | `composer-codelens-handler.ts` | `registerComposerCodeLensHandler` after `startLanguageServer` | ✓ WIRED | Confirmed by direct read of `main.ts` |
| `main.ts` | `bbj-hover-handler.ts` | `registerConfigAwareHoverHandler` after `startLanguageServer` | ✓ WIRED | Confirmed by direct read |
| `extension.ts` | server | widened `documentSelector` incl. `bbx-config` | ✓ WIRED | Confirmed present at `extension.ts:1039-1041` |
| `setopts-composer-ui.ts` | (retired) | no more `registerCodeLensProvider` for a bare client-side lens | ✓ WIRED (retired as claimed) | Repo-wide `grep` for `registerCodeLensProvider` under `bbj-vscode/src` returns only the doc-comment in `setopts-composer-ui.ts`, no live call; `composer-cue-single-source.test.ts` passes |
| LSP4IJ `CommandExecutor` | `BbjOpenComposerAtAction.java` | action id == command string `bbj.openComposerAt` | ✓ WIRED | Confirmed in `plugin.xml` and Java source |
| `ComposerLensKinds.java` | `ComposerLauncher.java` | `cvs` → `Kind.CVS`, `setopts-config` → `Kind.SETOPTS` | ✓ WIRED | Confirmed by direct read |
| `plugin.xml` | server | `BBx Config` → `languageId="bbx-config"` (never `bbj`) | ✓ WIRED | Confirmed; `BbjConfigFileTypeRegistrationTest` (5/5) passes |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Targeted TS unit suites for phase 89 (10 files) | `npx vitest run test/composer-codelens.test.ts test/composer-codelens-handler.test.ts test/cvs-composer.test.ts test/cvs-composer-ui.test.ts test/composer-lens-command.test.ts test/msgbox-composer.test.ts test/msgbox-composer-ui.test.ts test/composer-commands.test.ts test/bbj-document-builder-config.test.ts test/composer-cue-single-source.test.ts` | 162/162 passed | ✓ PASS |
| Installed-bundle e2e (against the reinstalled VSIX, proving the shipped artifact) | `npx vitest run test/functional/installed-extension-e2e.test.ts` | 30 passed, 1 skipped (documented fallback) | ✓ PASS |
| functions.bbl / example fixture parse cleanly | `npx vitest run test/builtin-functions-library.test.ts test/example-files.test.ts` | 4/4 passed | ✓ PASS |
| IntelliJ composer/config/actions/lsp test packages | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*' --tests 'com.basis.bbj.intellij.config.*' --tests 'com.basis.bbj.intellij.actions.*' --tests 'com.basis.bbj.intellij.lsp.*'` | All green (spot-checked ~19 suites' XML reports, 0 failures) | ✓ PASS |
| Whole vitest suite (pre-established this session) | see orchestrator note | 1686 passed / 12 failed (known pre-existing interop-drift baseline, unrelated to phase 89) | ✓ PASS (baseline) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DISC-01 (#650) | 89-01, 89-04, 89-06, 89-09, 89-11, 89-12, 89-13 | Persistent, clickable cue on every composer line, both IDEs, no caret/menu | ✓ SATISFIED (code); live-render human-check outstanding for 4/5 kinds | REQUIREMENTS.md marks Complete; code/wiring/unit/e2e evidence above; QA checklist rows unchecked |
| DISC-02 (#648) | 89-02, 89-07, 89-08, 89-13 | MSGBOX composer for expression-valued options, constant-sum pre-fill vs. compose-and-replace | ✓ SATISFIED | REQUIREMENTS.md marks Complete; code + unit test evidence above |
| DISC-03 (#649) | 89-03, 89-05, 89-07, 89-08, 89-10, 89-13 | Visual CVS() composer in both IDEs, documented bits, chars parameter, edit-in-place | ✓ SATISFIED | REQUIREMENTS.md marks Complete; code + unit test evidence above |

No orphaned requirements: REQUIREMENTS.md's traceability table maps only DISC-01/02/03 to Phase 89; DISC-04 through DISC-11 map to Phases 87/88/90, outside this phase's scope.

### Anti-Patterns Found

None. Scanned all phase-89-created/modified TS composer files and the Java files touched by this phase for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/hardcoded-empty-render patterns: no matches (one false-positive grep hit on the English phrase "not available" in a doc comment, not a stub marker). Pre-existing `D-01`..`D-06` decision-id references found in `BbjComposeSetoptsAction.java` predate this phase (introduced in phase 87-03); phase 89's own edit to that file (89-12) only corrected a Javadoc sentence and is confirmed clean by that plan's own register check.

### Human Verification Required

See `human_verification` in the frontmatter above — four items, all concerning live-IDE visual rendering/click-through and perceptual typing latency, none of which an automated harness in this devcontainer can exercise. All four map directly to QA/FULL-TEST-CHECKLIST.md rows 17-21 (VS Code) and 23-27 (IntelliJ), which are present but unchecked (`[ ]`).

### Gaps Summary

No FAILED truths, no MISSING/STUB artifacts, no NOT_WIRED key links, no debt-marker blockers. Every plan's must-haves are backed by matching source code and a passing, phase-scoped automated test (TS unit + installed-bundle e2e + IntelliJ Gradle unit tests, all re-run in this verification session rather than trusted from SUMMARY claims). The phase is not `gaps_found`.

The phase is `human_needed` because Roadmap Success Criteria 2 and 5 have an inherently non-automatable component (on-screen cue rendering for MSGBOX/addChildWindow/CVS/config-SETOPTS in both IDEs, and perceptual typing latency) that plan 89-13 itself already deferred to unchecked QA-checklist rows and its own `<human-check>` items — this verification did not silently pass those over, and did not fail the phase for something no grep or unit test can observe. The addWindow cue and the Code Vision mechanism itself were already human-confirmed live in plan 89-06 (GO, IU-262.10315.125); what remains is running the same walkthrough for the other four cue kinds and the CVS()/MSGBOX dialogs, per the unchecked QA rows.

---
*Verified: 2026-09-12T12:10:00Z*
*Verifier: Claude (gsd-verifier)*
