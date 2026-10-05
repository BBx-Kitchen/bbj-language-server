---
phase: 129-intellij-verdict
fixed_at: 2026-10-04T00:00:00Z
review_path: /home/coder/repos/bbj-language-server/.planning/phases/129-intellij-verdict/129-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 4
skipped: 2
status: partial
---

# Phase 129: Code Review Fix Report

**Fixed at:** 2026-10-04
**Source review:** /home/coder/repos/bbj-language-server/.planning/phases/129-intellij-verdict/129-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 4
- Skipped: 2 (IN-02, IN-03)

**Verification:** run in an isolated worktree (with a copy of `bbj-vscode/out/language/main.cjs`), then again in
the main checkout after the fast-forward. `cd bbj-intellij && ./gradlew test` finished with BUILD SUCCESSFUL in
both places: 1306 tests, 0 failures, 0 errors, 0 skipped (counted from the test result XML files). The worktree
and its temporary branch are removed and the fixes sit on `gsd/v4.9-bbj-ls-denum-format`.

## Fixed Issues

### WR-01: FormatterInitOptions claims to be platform-free but depends on the platform-bound BbjSettings

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/FormatterInitOptions.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/FormatterInitOptionsSourceGuardTest.java`
**Commit:** 58d08e77
**Applied fix:** Took the lighter option. The class Javadoc now says the seam has no IntelliJ platform import of its own
and that its only link to the settings class is the nested plain-data `BbjSettings.State`, used by `fromState` and
`writeToState`. `theSeamHasNoIntellijImport` now also fails on any use of `BbjSettings` other than `BbjSettings.State`
(for example `BbjSettings.getInstance()`). The package cycle remains by design. Status: fixed, requires human
verification (it is a contract/design wording judgment).

### WR-02: The new source-guard tests use string-unaware scanning

**Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/JavaSourceScan.java` (new), `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/JavaSourceScanTest.java` (new), `BbjSettingsFormatterSourceGuardTest.java`, `InteropInitOptionsContractTest.java`, `FormatterInitOptionsSourceGuardTest.java`, `BbjLanguageClientOpenFormatterSettingsTest.java` (all under the same test directory)
**Commit:** 344315cf
**Applied fix:** One shared, literal-aware helper in the test tree (`stripComments`, `bodyOf`, `methodBody`). It treats
string literals, char literals, text blocks and comments as opaque, so a `//` inside a string survives and a brace
inside a literal or comment is not counted. The four copied local helpers are removed. The new `JavaSourceScanTest`
covers the URL, char, text-block and brace cases. New files were created because the fix needs a shared helper.
Two other guard tests outside the review's list still carry their own copies of the old scanners; they were not in
scope and were left alone.

### IN-01: Missing space after comma in the line just edited

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java`
**Commit:** 821163a9
**Applied fix:** `options.addProperty("interopPort", BbjSettings...)`.

### IN-04: Repeated bbj/openFormatterSettings notifications queue up multiple settings dialogs

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageClientOpenFormatterSettingsTest.java`
**Commit:** 5f498d20
**Applied fix:** An `AtomicBoolean` pending flag guards the handler: `compareAndSet(false, true)` before the hop to
the EDT, cleared in a `finally` around `showSettingsDialog`, so clicks made while the modal dialog is up are dropped.
The existing source guard keeps its counts, and two assertions pin the flag and the `finally`. Status: fixed,
requires human verification (concurrency and modal-dialog behavior is not exercised by a unit test).

## Skipped Issues

### IN-02: Formatter defaults are duplicated as literals in BbjSettings.State

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:38-52`
**Reason:** Skipped on purpose. The review says this needs the same dependency-direction decision as WR-01. WR-01 was
fixed with the lighter option (documentation and guard only), so initializing `State` from
`FormatterInitOptions.DEFAULTS` would add a second dependency edge between the two classes. The existing
`FormatterInitOptionsTest.aDefaultStateSendsAllFifteenKeysWithTheirDefaults` still catches drift.
**Original issue:** The 15 `State` initializers repeat `FormatterInitOptions.DEFAULTS`.

### IN-03: LSP_FORMATTING_ENABLED is now a compile-time constant true, so the four overrides are tautological

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:48,128-145`
**Reason:** Skipped on purpose. Removing the constant and its four overrides would change the plugin's override
surface. The kill switch is a documented rollback lever, and `Lsp4ijOverrideSiteSourceGuardTest` pins the constant,
the four overrides and the short-circuit shape. Making the switch injectable means replacing the anonymous
`LSPFormattingFeature` with a named, parameterized class and rewriting those guards. That is a design change for a
decision-maker, not a behavior-identical edit.
**Original issue:** `true && super.isEnabled(file)` constant-folds to `super`, and the reflection test only checks
that the four methods are declared.

---

_Fixed: 2026-10-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
