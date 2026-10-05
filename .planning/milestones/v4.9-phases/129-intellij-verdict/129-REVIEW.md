---
phase: 129-intellij-verdict
reviewed: 2026-10-04T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/FormatterSettingTexts.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/FormatterInitOptions.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/FormatterSettingTextsContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientOpenFormatterSettingsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLspFormattingSwitchTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFormatterSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/InteropInitOptionsContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 129: Code Review Report

**Depth:** standard

## Summary

The functional wiring holds up. Values are normalized on read (`fromState`), on write (`writeToState`) and again on
send (`toJson`), so a hand-edited settings file cannot make the server reject the formatter object. The
`isModified`/`reset`/`apply` triple stays consistent for out-of-range persisted values. The open-settings handler
ignores the server payload and opens a fixed configurable. Cross-checked against the server: `interopHost`/`interopPort`
match `bbj-ws-manager.ts`, `bbj/openFormatterSettings` matches `format-settings-notification.ts`, and the server applies
`initializationOptions.formatter` once per `initialize`, so apply-then-restart re-sends fresh values. The two warnings
concern the accuracy of the seam's contract and the fragility of the new tests; neither changes runtime behavior.

## Warnings

### WR-01: FormatterInitOptions claims to be platform-free but depends on the platform-bound BbjSettings and creates a package cycle

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/FormatterInitOptions.java:3,25,116,142`
**Issue:**
- The class Javadoc says the class has no IntelliJ platform dependency, so plain JUnit 5 tests can cover it. It imports `com.basis.bbj.intellij.BbjSettings`, which imports `ApplicationManager` and `PersistentStateComponent`.
- It only works in plain JUnit because the nested static class `BbjSettings.State` loads without the outer class.
- `FormatterInitOptionsSourceGuardTest.theSeamHasNoIntellijImport` greps only for `import com.intellij`, so it passes even though the dependency exists.
- `lsp.FormatterInitOptions` imports the root-package `BbjSettings`, and `BbjSettingsComponent` and `BbjSettingsConfigurable` import `lsp.FormatterInitOptions`. That is a package cycle, and it couples persistence into the wire-format seam.

**Fix:** Either of these works.
- Move `fromState` and `writeToState` into the settings package and keep `FormatterInitOptions` free of `BbjSettings`. Then make the guard test assert that `import com.basis.bbj.intellij.BbjSettings` is absent.
- Or correct the Javadoc and the guard's message to say the seam depends on `BbjSettings.State` only.

### WR-02: The new source-guard tests use string-unaware scanning that can silently mask regressions

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFormatterSourceGuardTest.java:80-83,105-123`; same pattern in `InteropInitOptionsContractTest.java:67-70`, `FormatterInitOptionsSourceGuardTest.java:68-86`, `BbjLanguageClientOpenFormatterSettingsTest.java:87-106`
**Issue:**
- `stripComments` removes `//[^\n]*`, so it also eats everything after a `//` inside a string literal (for example `"http://..."`).
- `methodBody` and `bodyOf` count raw `{` and `}`, so a brace inside a string or char literal unbalances the scan.
- The guarded code contains no such literals today, so the tests pass. A future edit could make a guard fail misleadingly, or pass vacuously for a `countOccurrences(..., 0)` check.

**Fix:** Make the stripper literal-aware with a small state machine that skips `"..."` and `'...'`. Share it with the brace counter in one test helper instead of copying it into five classes.

## Info

### IN-01: Missing space after comma in the line just edited

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:79`
**Issue:** `options.addProperty("interopPort",BbjSettings...)`. The rename dropped the space.
**Fix:** `options.addProperty("interopPort", BbjSettings.getInstance().getEffectiveJavaInteropPort());`

### IN-02: Formatter defaults are duplicated as literals in BbjSettings.State

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:38-52`
**Issue:**
- The 15 `State` initializers repeat `FormatterInitOptions.DEFAULTS`.
- Only `FormatterInitOptionsTest.aDefaultStateSendsAllFifteenKeysWithTheirDefaults` catches drift between them.
- A drifted default would make a fresh install show a "modified" settings page.

**Fix:** Initialize the fields from shared constants. This needs the same dependency-direction decision as WR-01.

### IN-03: LSP_FORMATTING_ENABLED is now a compile-time constant true, so the four overrides are tautological

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:48,128-145`; `BbjLspFormattingSwitchTest.java`
**Issue:**
- `true && super.isEnabled(file)` constant-folds to `super`.
- The new reflection test only checks that the four methods are declared, so nothing checks that the gate works any more.

**Fix:** Make the kill-switch injectable and test it with `false`, or remove the constant and its overrides.

### IN-04: Repeated bbj/openFormatterSettings notifications queue up multiple settings dialogs

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:203-215`
**Issue:**
- `invokeLater` with the default modality waits behind any open modal dialog.
- If the user clicks "Open Settings" several times, the BBj settings dialog reopens once for each click.
- The server only sends the notification on a user click, so this is a minor annoyance.

**Fix:** Coalesce the calls with an `AtomicBoolean` pending flag, cleared in a `finally` around `showSettingsDialog`.

---

_Reviewed: 2026-10-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
