---
phase: 129-intellij-verdict
plan: 06
subsystem: intellij-formatting
status: complete
verdict_served: supported
tags: [intellij, lsp4ij, formatting, notification, settings]
requires:
  - phase: 129-05
    provides: "129-VERDICT.md with verdict supported (no range-only constant), known issues, IDE builds"
provides:
  - "LSP_FORMATTING_ENABLED = true in BbjLanguageServerFactory, Javadoc naming LSP4IJ 0.21.0, both IDE builds and the four known issues"
  - "fence tests pinning the true switch, the four short-circuits and the absence of a range-only constant"
  - "BbjLanguageClient.openFormatterSettings(Object ignoredKeys): bbj/openFormatterSettings opens the BBj settings page"
  - "BbjLanguageClientOpenFormatterSettingsTest (5 tests)"
affects: [129-07, 129-09]
tech-stack:
  added: []
  patterns: ["payload-ignoring @JsonNotification handler pinned by a whole-file parameter-name count of 1"]
key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientOpenFormatterSettingsTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLspFormattingSwitchTest.java
decisions:
  - "IntelliJ LSP formatting is on (LSP_FORMATTING_ENABLED = true) for whole-file, range and on-save formatting; no range-only constant"
  - "bbj/openFormatterSettings opens BbjSettingsConfigurable by class and ignores its keys payload; no scrolling to the Formatter section"
metrics:
  duration: "about 6 min"
  completed: 2026-10-04
actuals:
  tokens: 3800
  tasks: 3
  commits: 3
---

# Phase 129 Plan 06: IntelliJ formatting switch on and Open Settings handler Summary

On the user's `supported` verdict, IntelliJ now offers LSP formatting for BBj files (`LSP_FORMATTING_ENABLED = true`,
one constant, all four checks still short-circuit on it). The server's `bbj/openFormatterSettings` notification opens
the BBj settings page on the EDT and never reads its payload.

## What was done

- **Task 1 (guard):** `sed -n 's/^verdict: //p'` on `129-VERDICT.md` prints `supported`, so Tasks 2 and 3 ran. No
  commit of its own; the verdict is recorded here (`verdict_served: supported`).
- **Task 2 (tracer, commit 0f9f56c1):** The factory's switch is `true`. Its Javadoc now says formatting is on after a
  hands-on evaluation with LSP4IJ 0.21.0 on IntelliJ IDEA 2024.2 (build 242, Linux) and 2026.2.2 (build 262, Windows),
  and lists the four known issues in plain words: CRLF line ending stops formatting (lsp4ij #381), an empty
  didChange after a no-op format, the double save under Actions on Save, and format on save being IntelliJ's own
  Actions on Save setting. It keeps the sentences about all four checks being gated and server-driven on-type
  formatting not being gated. `Lsp4ijOverrideSiteSourceGuardTest` renamed the switch test to
  `theLspFormattingSwitchIsOneConstantSetToTrueThatGatesAllFourFormattingChecks`. It asserts the `= true;`
  declaration once, the four overrides, four `LSP_FORMATTING_ENABLED && super.` short-circuits, and zero occurrences
  of `LSP_RANGE_FORMATTING_ENABLED`. `BbjLspFormattingSwitchTest` dropped
  `everyFormattingCheckAnswersFalseWithoutTouchingTheFile` and the throwing proxy file, kept the
  installed-subclass test, and added `theGatedSubclassOverridesAllFourChecks` (reflection, `getDeclaredMethod(name,
  PsiFile.class)`).
- **Tracer gate:** auto mode is on, so the gate re-ran `<verify>` end to end. The four fence suites passed (9 + 2 + 18
  + 6 tests, 0 failures), and javap shows `ConstantValue: int 1` for `LSP_FORMATTING_ENABLED` with no range constant.
  Expansion to Task 3 went ahead.
- **Task 3 (TDD):** RED commit d1b1b64e: the new test ran 5 tests, 2 failed (registration and the source-guard
  body test). The two parse tests already passed in RED because LSP4J parses a notification for an unregistered
  method as well; they guard the wire shape once the handler exists. GREEN commit f27d0751 added
  `@JsonNotification("bbj/openFormatterSettings") public void openFormatterSettings(Object ignoredKeys)` after
  `showDenumDiagnostics`. It checks for a disposed project, calls `invokeLater`, checks for a disposed project again,
  then calls `ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class)`. It also adds
  imports for `ShowSettingsUtil` and `BbjSettingsConfigurable`. No REFACTOR commit was needed.

## Verification

- Focused Task 3 run: OpenFormatterSettings 5/0/0, DenumSourceGuard 8/0/0 (its `ignoredPayload` count stays 1),
  DenumNotification 5/0/0, ConfigReloadNotificationContract 5/0/0, Lsp4ijImportAllowlist 6/0/0.
- Whole IntelliJ suite, `./gradlew cleanTest test --offline` (re-run with `--no-build-cache`; the test task really
  executed and wrote fresh XML): **tests=1291 failures=0 errors=0** (skipped 0), above the 1263 floor.
- Acceptance greps: `@JsonNotification("bbj/openFormatterSettings")` once and `ignoredKeys` once in
  `BbjLanguageClient.java`; `Proxy.newProxyInstance` absent from `BbjLspFormattingSwitchTest.java`.
- Register check: the added lines of the `bbj-intellij/src` diff hold no planning identifier, `Phase 1…` or
  `.planning` path.
- No LS-side (TypeScript) file changed, so `ComposerRequestContractTest` is unaffected; it passed in the whole suite.

## For 129-07

- `BbjLanguageClient` now imports `com.basis.bbj.intellij.BbjSettingsConfigurable` and opens it by class. Its
  Javadoc says the Formatter section "sits near the top" of the BBj page, which relies on 129-07 placing the
  Formatter section second, directly after BBj Compiler.
- The factory Javadoc already names the CRLF known issue. The settings-page note text comes from `eol_note` in
  `129-VERDICT.md` (word for word), as 129-05 recorded.
- `ignoredKeys` must stay a single occurrence in `BbjLanguageClient.java`: do not mention it in a comment there.

## Deviations from Plan

None. The plan executed as written. One clarification: two of the five new tests (the parse tests) were green in
RED, as explained above; the plan's RED requirement is met by the registration and body tests.

ROADMAP.md, REQUIREMENTS.md and WINDOWS.md were left untouched, per the orchestrator's instructions.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientOpenFormatterSettingsTest.java
- FOUND: 0f9f56c1, d1b1b64e, f27d0751
