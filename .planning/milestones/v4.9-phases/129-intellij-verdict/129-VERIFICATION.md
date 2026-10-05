---
phase: 129-intellij-verdict
verified: 2026-10-04T16:10:00Z
status: passed
score: 5/6 must-haves verified
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:

  - truth: "Changing one formatter setting on the IntelliJ BBj settings page restarts the language server so the next format reflects it"
    test: "Install the final zip, set Indent width 4 and Keywords in upper case, click Apply, read the BbjServerService status lines in idea.log after the Apply, then run Reformat Code on a stripped BBj file and read the LSP trace (129-09 hand check steps 2 to 4)"
    expected: "The last status line after Apply reads 'starting -> started'; the new initialize request carries indentWidth 4 and keywordsToUppercase true inside initializationOptions.formatter; the file gets four-space indentation and upper-case keywords; reopening the page shows 4 / on and is not marked modified"
    why_human: "The restart-then-reformat sequence is a state transition across Apply, scheduleRestart, stop/start and a fresh initialize. Code and unit tests prove each link (apply writes state before scheduleRestart; initializeParams re-reads the state on every start), and the evaluation proved that values present at a fresh start reach the output (C5). No log shows a restart triggered by Apply, and none shows a changed formatter value taking effect after one."
human_verification:

  - test: "Apply restarts the server and the next Reformat Code reflects the change (129-09 hand check steps 2, 3, 4)"
    expected: "See behavior_unverified_items above"
    why_human: "Restart sequence has never been observed in a running IDE for a formatter setting"
  - test: "Formatter section layout in a running IDE (129-09 hand check step 1)"
    expected: "15 controls in order after 'BBj Compiler'; tooltips on each; the restart note and the Actions on Save hint wrap inside the page width and do not widen the page; the Indent width spinner has a sensible width"
    why_human: "Swing layout and wrapping cannot be checked from source; 129-09 itself says 'not yet seen in a running IDE'"
  - test: "Windows byte identity of the installed zip (optional)"
    expected: "sha256 of the installed zip equals the evaluation zip ae214de3... (Windows evidence) and, for shipping, the final zip 2a69a53c... "
    why_human: "The user skipped Step 0 of the Windows checklist; a switch-on build is shown (formatting requests reach the server) but identity is not proven"
---

# Phase 129: IntelliJ Verdict Verification Report

**Phase Goal:** The user decides, from a recorded hands-on evaluation, whether IntelliJ formatting is officially supported or disabled, and the plugin ships accordingly. On "supported", IntelliJ users get the 15 formatter settings.
**Verified:** 2026-10-04
**Status:** human_needed
**Re-verification:** No, initial verification

All code-level and record-level checks pass. One truth (Apply restarts the server and the next format reflects the change) is present and wired but its runtime sequence has never been observed. It is routed to human verification, not passed.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: An evaluation record exists for the built plugin zip against a live BBjServices covering Reformat Code, selection, Actions on Save, numbered-file message, settings, CRLF, edit application, each backed by real-log evidence | VERIFIED (with caveats below) | `129-EVALUATION.md` has rows C1, C2a/b, C3a/b, C4a/b, C5, C6a/b/c, C7a/b/c on Linux and W1-W4, E1-E5 on Windows, plus code-verified V1-V6. I spot-checked the raw logs under `tmp/129-eval/`: C1 wire has the `textDocument/formatting` request and `documentFormattingProvider:true`; C5 `initialize` carries `indentWidth:4`, `keywordsToUppercase:true`; C6b `idea.log` line 463 has the SEVERE `Wrong line separators` and the `initialize` carries `eolCharacter:"CRLF"`; C4a wire has the two-button `showMessageRequest`; C3a wire shows didSave then formatting; C3b has two `rangeFormatting`; the eval zip sha256 on disk equals the record's `ae214de3...`. Windows `idea.log` (session of 2026-10-04 16:37) and `lsp-trace.txt` contain formatting id 73 and rangeFormatting id 103, zero `didSave`, zero `Wrong line separators`; the record states all of this. |
| 2 | SC2a: The user's verdict is recorded at a decision checkpoint | VERIFIED | `129-VERDICT.md`: `verdict: supported`, `decided_by: user`, verbatim answer "supported + known-issue", `recommended: disabled`, `override: true`. `129-EVALUATION.md` "Decision" section repeats it and keeps Claude's original recommendation unchanged. The override is recorded openly; the verdict is consistent with the record's own rule 5 once C6b is a known issue. |
| 3 | SC2b: The single formatting switch matches the verdict; Reformat Code is offered for BBj files only when the verdict is "supported" | VERIFIED | `BbjLanguageServerFactory.java:48` `LSP_FORMATTING_ENABLED = true`; all four overrides (`isEnabled`, `isSupported`, `isFormattingSupported`, `isRangeFormattingSupported`) gated on it (lines 126-146); no range-only constant (verdict is `supported`, not `supported-no-range`). The built zip, sha256 `2a69a53c...`, jar `javap` shows `ConstantValue: int 1`. Javadoc points at the evaluation findings. `BbjLspFormattingSwitchTest`, `Lsp4ijOverrideSiteSourceGuardTest`, `Lsp4ijCouplingCanaryTest`: green (see spot-checks). See IN-03 in the review: with the constant `true` the override gate is tautological and the switch test only checks declarations. |
| 4 | SC3a: All 15 formatter settings are on the IntelliJ BBj settings page | VERIFIED (layout unseen) | `BbjSettingsComponent.java:378-395`: a `TitledSeparator("Formatter")` directly after "BBj Compiler", then exactly 15 controls (indent width spinner, 5 combos for indentCharacter/ifClosingKeyword/ifKeywordCase/parameterLayout/operatorSpacing/eolCharacter = 6 combos, 8 checkboxes, 1 spinner), tooltips from `FormatterSettingTexts`, bounded spinner 0 to 16, combos over the allowed values only. `isModified`, `apply` and `reset` in `BbjSettingsConfigurable` cover the formatter values (lines 61, 93, 183). The eol note says plainly that CRLF stops formatting entirely (`FormatterSettingTexts.RESTART_NOTE`). Page appearance in a running IDE is a human item. |
| 5 | SC3b: They reach the server through `initializationOptions` | VERIFIED | `BbjLanguageServerFactory.java:91-92` adds `formatter` from `FormatterInitOptions.toJson(fromState(state))`, always 15 keys, normalized, never null. Runtime: C5 `initialize` on the wire carries the changed values and the output follows (four-space indent, upper-case keywords); Windows trace `initialize` carries the 15 defaults. `FormatterInitOptionsTest`, `FormatterInitOptionsContractTest` (pins keys/defaults against `bbj-format-settings.ts` and `package.json`), `InteropInitOptionsContractTest` green. The folded interop key mismatch is fixed (`interopHost`/`interopPort` at lines 76-79; no `javaInterop*` key sent) and the todo moved to `todos/completed/`. |
| 6 | SC3c: Changing one setting restarts the language server so the next format reflects it | PRESENT_BEHAVIOR_UNVERIFIED | Wired: `BbjSettingsConfigurable.apply()` writes the formatter state (line 93) before `scheduleRestart()` for every open project (lines 103-105); `BbjServerService.doRestart()` stops with `willDisable(false)` then starts; `initializeParams` re-reads `BbjSettings` state on each start. Not observed: no log of a restart triggered by Apply, and no formatter value taking effect after one. `129-09-SUMMARY.md` states this itself and keeps hand check steps 2 to 4 pending. Routed to human verification per the instruction; not counted in the score. |

**Score:** 5/6 truths verified (1 present, behavior-unverified)

The disabled-branch requirements of SC3 ("no formatter settings UI ships", "IJF-04 moves to Out of Scope") do not apply on a `supported` verdict. `129-08-SUMMARY.md` records the plan as not applicable and `REQUIREMENTS.md` keeps IJF-04 as `[x]`, Phase 129, Complete.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `129-EVALUATION.md` | Record of cases with evidence | VERIFIED | Rows, evidence sections, known issues, blockers, recommendation, decision; raw evidence exists under `tmp/129-eval/` and matches |
| `129-VERDICT.md` | Machine-readable verdict | VERIFIED | `verdict: supported`, `override: true`, known_issues list, `eol_note` |
| `129-LSP4IJ-ISSUE-crlf-newtext.md` | Upstream draft for the LSP4IJ-caused finding | VERIFIED | Present; filing left to the user (D-15) |
| `lsp/FormatterInitOptions.java` | Seam, 15 keys, normalize, toJson | VERIFIED | Substantive, wired from factory, state, configurable and component |
| `BbjSettings.java` State fields | 15 persisted `formatter*` fields | VERIFIED | Read by `fromState`, written by `writeToState` |
| `BbjSettingsComponent.java` Formatter section | 15 controls | VERIFIED | Lines 55-71, 146-188, 378-395, 641-680 |
| `FormatterSettingTexts.java` | Tooltips, restart note, on-save hint, eol note | VERIFIED | Contract test pins them against `package.json` |
| `BbjLanguageClient.openFormatterSettings` | Handler for `bbj/openFormatterSettings` | VERIFIED | `@JsonNotification` at line 203; opens the fixed `BbjSettingsConfigurable`, payload ignored; present in the built jar |
| `BbjLanguageServerFactory.java` switch | `true`, four overrides | VERIFIED | Also in the built jar |
| Plugin zip `bbj-intellij-0.1.0.zip` | Built from the final tree | VERIFIED | sha256 `2a69a53c...` matches `129-09-SUMMARY.md`; `javap` confirms `ConstantValue: int 1` and the handler |
| `REQUIREMENTS.md` | IJF-02, IJF-03, IJF-04 complete | VERIFIED | Lines 67-69 ticked; traceability rows 135-137 `Phase 129 | Complete` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BbjSettingsComponent` controls | `BbjSettings.State` | `getFormatterValues` -> `FormatterInitOptions.writeToState` in `apply()` | WIRED | Normalized on write |
| `BbjSettings.State` | server `initializationOptions.formatter` | `fromState` -> `toJson` in `initializeParams` | WIRED | Runtime proof in C5 |
| `apply()` | language server restart | `scheduleRestart()` -> `requestRestart` -> `doRestart` (stop, bounded wait, start) | WIRED, not observed | See truth 6 |
| server `bbj/openFormatterSettings` | BBj settings dialog | `@JsonNotification` -> `ShowSettingsUtil.showSettingsDialog(project, BbjSettingsConfigurable.class)` | WIRED | Unit-tested; not clicked in a running IDE (IN-04: repeated clicks queue dialogs) |
| `LSP_FORMATTING_ENABLED` | `LSPFormattingFeature` | four overrides | WIRED | Fence tests green |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `initializationOptions.formatter` | 15 values | persisted `BbjSettings.State`, edited via the page | Yes (C5 wire: changed values on the wire; formatted output follows) | FLOWING |
| Formatter section controls | `FormatterInitOptions.Values` | `fromState(state)` in `reset()` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 129 IntelliJ tests | `cd bbj-intellij && ./gradlew test --offline --rerun-tasks --tests` over the 11 formatter, switch, fence, interop-key, handler, contract-text and `ComposerRequestContractTest` classes | BUILD SUCCESSFUL, 71 tests, 0 failures, 0 errors | PASS |
| Built zip carries the verdict | `unzip` + `javap -v` on `BbjLanguageServerFactory` | `ConstantValue: int 1`; `openFormatterSettings` present | PASS |
| Zip identity | `sha256sum` of the zip | `2a69a53c...` equals the 129-09 summary | PASS |
| Raw evidence vs record | `grep` over `tmp/129-eval/linux/C1, C3a, C3b, C4a, C5, C6b` and `windows/` | All quoted facts found | PASS |

The whole suite was not re-run (the 129-09 summary reports 1301/0/0; my targeted run covers every phase-129 test class).

### Probe Execution

SKIPPED: the plans declare no probe scripts and no `probe-*.sh` is referenced.

### Requirements Coverage

Plan frontmatter IDs: 129-01 [IJF-02], 129-02 [IJF-02, IJF-04], 129-03 [IJF-02], 129-04 [IJF-02], 129-05 [IJF-02, IJF-03], 129-06 [IJF-03, IJF-04], 129-07 [IJF-04], 129-08 [IJF-03, IJF-04], 129-09 [IJF-02, IJF-03, IJF-04]. Union = IJF-02, IJF-03, IJF-04. These are the three IDs the ROADMAP lists for the phase; `REQUIREMENTS.md` maps no other ID to Phase 129. No orphans.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| IJF-02 | 01, 02, 03, 04, 05, 09 | Formatting evaluated on the built zip against a live BBjServices, recorded from a real `idea.log` | SATISFIED | Evaluation record + raw logs (truth 1). Note: the runtime sequences are mostly the wire capture; `idea.log` supplies launch, status and the error/warning check (and the C6b SEVERE). Windows W4, E1, E2 are user observation only. |
| IJF-03 | 05, 06, 08, 09 | The user decides supported or disabled; the switch is set accordingly | SATISFIED | Truths 2 and 3 |
| IJF-04 | 02, 06, 07, 08, 09 | If supported: all 15 settings on the page, reach the server via `initializationOptions` (restart on change) | SATISFIED in code; restart-reflects-change NEEDS HUMAN | Truths 4, 5 verified; truth 6 behavior-unverified. `REQUIREMENTS.md` already ticks IJF-04 as Complete, ahead of that human check. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `FormatterInitOptions.java` | 3, 25 | Javadoc says "no IntelliJ platform dependency" but imports `BbjSettings` (package cycle) | Warning (review WR-01) | Documentation accuracy; no runtime effect |
| Five source-guard tests | various | String-unaware comment/brace scanning | Warning (review WR-02) | A future edit could make a guard fail misleadingly or pass vacuously; passes today |
| `BbjLanguageServerFactory.java` | 79 | Missing space after comma | Info (IN-01) | Cosmetic |
| `BbjSettings.java` | 38-52 | Defaults duplicated as literals | Info (IN-02) | Drift guarded only by one test |
| `BbjLspFormattingSwitchTest` | whole | Switch constant is `true`, gate tautological | Info (IN-03) | Kill-switch not exercised by any test |
| `BbjLanguageClient.java` | 203-215 | Repeated notifications queue dialogs | Info (IN-04) | Minor |
| Register scan (`D-nn`, `C-nn`, `CR-nn`, `WR-nn`, `IJF-0`, `129-0`, `Phase 12x`) over the seven edited main sources | | none | | Clean; `129-09-SUMMARY.md` reports the added-lines check clean as well |
| Debt markers `TBD`/`FIXME`/`XXX` | | none found in edited main sources by the register scan above (not matched) | | Clean |

No blocker. The two review warnings are advisory, as the instruction says.

### Human Verification Required

#### 1. Apply restarts the server and the next Reformat Code reflects the change

**Test:** Install the final zip (`bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, sha256 `2a69a53c6f377056a887e9b84e6b8804dea170c77e96f72a6e0588927c704e7f`). Set the BBj server trace to verbose. In Settings, Languages & Frameworks, BBj set Indent width to 4 and turn on Keywords in upper case, click Apply. Read the `BbjServerService - BBj language server status:` lines after the Apply, then run Code | Reformat Code on a stripped BBj file.
**Expected:** The last status line reads `starting -> started` with a timestamp after the Apply; the latest `initialize` carries `"indentWidth":4` and `"keywordsToUppercase":true` in `initializationOptions.formatter`; one `textDocument/formatting` follows and the file shows four-space indents and upper-case keywords; reopening the page shows 4 / on and is not marked modified.
**Why human:** A restart triggered by Apply has never been logged for this feature. Presence and wiring checks cannot see whether stop/start completes and whether the new initialize carries the stored values.

#### 2. Formatter section layout

**Test:** Open the BBj settings page in a running IDE.
**Expected:** 15 controls in the planned order directly after "BBj Compiler", tooltips on each, the note and the on-save hint wrap inside the page width, the spinner is sensibly sized.
**Why human:** Visual layout.

#### 3. Optional: Windows zip identity

**Test:** Compare the sha256 of the zip installed on Windows with the evaluation zip.
**Expected:** Equal.
**Why human:** Step 0 was skipped by the user.

### Gaps Summary

No gaps. The evaluation record, verdict, switch, 15-setting page, initialization-options path and handler are present, substantive, wired and tested; the built zip matches the verdict.

Points to weigh, none blocking:

- **Override of the recommendation.** The user chose `supported` over Claude's `disabled` recommendation. The record documents this plainly and consistently (`override: true`, rule 5 once C6b is a known issue). It is the user's call, not a defect. The known consequence stays visible: with Line ending CRLF, IntelliJ silently formats nothing (LSP4IJ #381); the settings page note says so, and the `Line ending` control still offers CRLF.
- **Evidence strength on Windows.** W1 to W3 are wire-backed and replayed; W4, E1, E2 are user observation after the logs were copied; E4 and E5 were not run; the zip hash was not verified. Linux covers all seven cases with wire and `idea.log`, so criterion 1 holds, but build 262 evidence for Actions on Save and the numbered-file buttons rests on the user's word. CRLF with `eolCharacter=CRLF` was measured on build 242 only.
- **Bookkeeping, not a code issue.** `ROADMAP.md` line 425 still shows `- [ ] **Phase 129: IntelliJ Verdict**`; the orchestrator's phase completion handles that. `REQUIREMENTS.md` already marks IJF-04 Complete before the restart hand check; revisit if step 2 to 4 fails.

---

_Verified: 2026-10-04_
_Verifier: Claude (gsd-verifier)_
