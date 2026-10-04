---
phase: 129-intellij-verdict
plan: 07
subsystem: intellij-settings
status: complete
verdict_served: supported
eol_character: known-issue
tags: [intellij, settings, formatter, tooltips, initializationOptions]
requires:
  - phase: 129-02
    provides: "FormatterInitOptions seam (KEYS, bounds, value lists, Values, normalize, fromState, toJson) and the 15 formatter* State fields"
  - phase: 129-05
    provides: "129-VERDICT.md: verdict supported, eol_character known-issue, eol_note text"
  - phase: 129-06
    provides: "LSP formatting on; bbj/openFormatterSettings opens the BBj settings page (relies on the Formatter section sitting second)"
provides:
  - "Formatter section on the BBj settings page, directly after BBj Compiler: 15 controls, tooltips, note, format-on-save hint"
  - "BbjSettingsComponent.getFormatterValues() / setFormatterValues(Values)"
  - "FormatterInitOptions.writeToState(Values, BbjSettings.State)"
  - "com.basis.bbj.intellij.FormatterSettingTexts: tooltip(String), RESTART_NOTE, FORMAT_ON_SAVE_HINT"
  - "tests: lsp/BbjSettingsFormatterSourceGuardTest (4), FormatterSettingTextsContractTest (5), FormatterInitOptionsTest +1"
affects: [129-09]
tech-stack:
  added: []
  patterns:
    - "wrapping section notes via ComponentPanelBuilder.createCommentComponent(text, true)"
    - "tooltip texts pinned against bbj-vscode/package.json by a Gson contract test"
key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/FormatterSettingTexts.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/FormatterSettingTextsContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFormatterSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/FormatterInitOptions.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsTest.java
decisions:
  - "The Formatter section note is RESTART_NOTE = restart sentence + the verdict's eol_note word for word; the Line ending control stays"
  - "Section note and format-on-save hint are wrapping comment labels (ComponentPanelBuilder.createCommentComponent), not plain JBLabels, so the long note does not widen the page"
  - "A one-line format-on-save hint points to Settings | Tools | Actions on Save | Reformat code"
metrics:
  duration: "about 5 min"
  completed: 2026-10-04
actuals:
  tokens: 11300
  tasks: 3
  commits: 3
---

# Phase 129 Plan 07: IntelliJ Formatter settings section Summary

The BBj settings page in IntelliJ now has a "Formatter" section directly after "BBj Compiler". It holds all 15
formatter settings as controls that can only produce values bbj-ls accepts, each with the VS Code description as
its tooltip. Apply stores the normalized values before the existing debounced restart, which re-sends them as
`initializationOptions.formatter`.

## Guard (Task 1)

`sed -n 's/^verdict: //p'` on `129-VERDICT.md` prints `supported`, and the `eol_character:` line reads
`known-issue`. Tasks 2 and 3 ran. Task 1 has no commit of its own, as in 129-06.

## The section, in page order

| # | Setting | Label | Control |
|---|---------|-------|---------|
| 1 | indentWidth | Indent width: | `JBIntSpinner(INDENT_WIDTH_DEFAULT, INDENT_WIDTH_MIN, INDENT_WIDTH_MAX)` = 2, 0..16 |
| 2 | indentCharacter | Indent character: | combo over `INDENT_CHARACTER_VALUES` |
| 3 | indentLabelBlocks | Indent label blocks | checkbox |
| 4 | keywordsToUppercase | Keywords in upper case | checkbox |
| 5 | ifClosingKeyword | IF closing keyword: | combo over `IF_CLOSING_KEYWORD_VALUES` |
| 6 | ifKeywordCase | IF keyword case: | combo over `IF_KEYWORD_CASE_VALUES` |
| 7 | splitSingleLineIf | Split single-line IF | checkbox |
| 8 | removeLineContinuation | Remove line continuation | checkbox |
| 9 | splitInlineComments | Move in-line comments to their own line | checkbox |
| 10 | splitInlineLabelComment | Move label comments to their own line | checkbox |
| 11 | collapseMultiLine | Collapse blank lines | checkbox |
| 12 | blankLineAfterReturn | Blank line after RETURN | checkbox |
| 13 | parameterLayout | Parameter layout: | combo over `PARAMETER_LAYOUT_VALUES` |
| 14 | operatorSpacing | Operator spacing: | combo over `OPERATOR_SPACING_VALUES` |
| 15 | eolCharacter | Line ending: | combo over `EOL_CHARACTER_VALUES` |

The combos show the wire values themselves. There is no free-text field and no control for the deprecated
`splitSingleLineIF` alias. Below the controls are the note and the format-on-save hint.

**Final RESTART_NOTE** (the second half is `eol_note` from 129-VERDICT.md word for word, checked by a script that
compares the joined Java literal with the YAML value):

> These settings apply after the language server restarts. Apply restarts it automatically. In IntelliJ, Line ending
> CRLF stops formatting entirely: the IDE refuses the formatter's edit and the file stays unchanged, without a message
> (an LSP4IJ limitation, lsp4ij issue #381); LF does not change a file's line endings either, so leave it at KEEP.

**FORMAT_ON_SAVE_HINT:** "To format on save, turn on Reformat code under Settings | Tools | Actions on Save." This
addresses the Windows-run usability finding: the user looked for format on save on the BBj page first. It is one
wrapping comment line under the note.

## What was done

- **Task 2 (tracer, TDD).** RED commit 3fb467d9: `FormatterInitOptionsTest.writingToStateAndReadingBackGivesTheNormalizedValues`
  and `BbjSettingsFormatterSourceGuardTest` (3 tests). First run: compile failure, because `writeToState` did not
  exist. After `writeToState` was added, the seam test passed and the three guard tests failed (23 run, 3 failed).
  GREEN commit f8454257 added the 15 controls, the section, `getFormatterValues()`/`setFormatterValues(Values)`, and
  the configurable wiring:
  - `isModified` compares the controls with `FormatterInitOptions.fromState(state)`.
  - `apply` calls `FormatterInitOptions.writeToState(myComponent.getFormatterValues(), state)` before the project
    loops and the existing `scheduleRestart()`. There is no dialog.
  - `reset` calls `myComponent.setFormatterValues(FormatterInitOptions.fromState(state))`.
  - The constructor sets the controls to `DEFAULTS`.
  - Tracer gate: auto mode is on, so `<verify>` was re-run end to end. All 8 suites passed (50 tests, 0 failures),
    and the acceptance grep passed.
- **Task 3.** Commit 8dc17822:
  - Added `FormatterSettingTexts`. It is plain Java with no platform import. For spinner and checkbox settings it
    returns the plain description; for combos it returns an HTML tooltip with one `VALUE: description` line per
    value, escaping `&`, `<` and `>`. An unknown key returns `""`.
  - `FormatterSettingTextsContractTest` (5 tests) parses `../bbj-vscode/package.json` with Gson. It uses its own
    markup stripper.
  - The 15 `setToolTipText(FormatterSettingTexts.tooltip(...))` calls are each on one line, so the plan's grep
    (which counts lines) sees 15.
  - The guard gained `everyControlCarriesItsTooltipAndTheNoteTakesTheSharedText` and a check that the note sits
    under the last control.

## Verification

- Task 2 focused run: BbjSettingsFormatterSourceGuard 3/0, FormatterInitOptionsTest 10/0, FormatterInitOptionsContract
  6/0, FormatterInitOptionsSourceGuard 4/0, BbjSettingsComponentSourceGuard 10/0, CompilerOutputDirectorySourceGuard
  7/0, CompilerTriggerSourceGuard 6/0, EffectiveInteropPortSourceGuard 6/0.
- Task 3 focused run: FormatterSettingTextsContract 5/0, BbjSettingsFormatterSourceGuard 4/0,
  BbjSettingsComponentSourceGuard 10/0. Acceptance grep: 15 tooltip calls, RESTART_NOTE used, "line ending" present.
- Whole IntelliJ suite, `./gradlew cleanTest test --offline --no-build-cache`: **tests=1301 skipped=0 failures=0
  errors=0**. That is 1291 after 129-06 plus 10 new tests, above the 1263 floor.
- `ignoredKeys` still appears once in `BbjLanguageClient.java` (untouched).
- Register check on the source diff: no planning identifier in any added line. The only hit is the pre-existing
  `lookup (D-12)` in `BbjSettingsComponent`'s class Javadoc, a context line this plan did not add. It is left as is
  (out of scope).

## Deviations from Plan

1. **[Override - orchestrator] Note wording.** RESTART_NOTE ends with the verdict's `eol_note` word for word, in place
   of the plan's example "LF or CRLF may not take effect" wording. The Line ending control stays.
2. **[Rule 2 - usability] Wrapping comment labels.** The plan described the note as a plain `JBLabel`. The final
   note is about 330 characters, and a single-line `JBLabel` would widen the whole settings page. The note (and the
   hint) are now `ComponentPanelBuilder.createCommentComponent(text, true)`. That returns a wrapping `JBLabel` with
   `setAllowAutoWrapping(true)`, confirmed by javap on platform 242. The fields are typed `JLabel`.
3. **[Orchestrator request] Format-on-save hint.** Added one line, `FORMAT_ON_SAVE_HINT`, under the note. It is a
   short addition that fits the section's existing hint-line style.
4. **[Rule 1 - test robustness] Whitespace in the guard.** The guard collapses whitespace before matching the
   spinner and combo constructor calls, because the code wraps the spinner's arguments. The fix went into the GREEN
   commit.

## For 129-08 / 129-09

- 129-08 (disabled outcome) does not apply: the verdict is `supported`.
- 129-09: the whole-suite baseline is now **1301**. New guard and contract suites:
  `lsp.BbjSettingsFormatterSourceGuardTest`, `FormatterSettingTextsContractTest`. Editing a `bbj.formatter.*`
  description or enumDescription in `bbj-vscode/package.json` now also requires updating
  `FormatterSettingTexts.java`.
- The Formatter section sits second on the page, as the `bbj/openFormatterSettings` handler Javadoc assumes.
- The visual layout (wrapping note, spinner width) was checked only through source and the platform API, not in a
  running IDE. It is worth a look in the final UAT build.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/FormatterSettingTexts.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/FormatterSettingTextsContractTest.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFormatterSourceGuardTest.java
- FOUND: 3fb467d9, f8454257, 8dc17822
