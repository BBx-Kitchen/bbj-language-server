---
phase: 106-on-save-compiler-check-in-both-ides
reviewed: 2026-09-24T17:51:51Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerTriggerSourceGuardTest.java
  - bbj-vscode/package.json
  - bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-document-update-handler.ts
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-kept-check.ts
  - bbj-vscode/src/language/bbj-module.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts
  - bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts
  - bbj-vscode/test/bbj-kept-check.test.ts
  - bbj-vscode/test/fake-text-document-connection.ts
  - bbj-vscode/test/java-interop-parse-lane.test.ts
  - bbj-vscode/test/on-save-kept-errors.test.ts
  - bbj-vscode/test/on-save-trigger.test.ts
  - documentation/docs/intellij/features.md
  - documentation/docs/vscode/features.md
findings:
  critical: 1
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 106: Code Review Report

**Reviewed:** 2026-09-24T17:51:51Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

This phase adds the `bbj.compiler.trigger` = `on-save` mode (plus the existing `debounced`/`off`
modes) across both the VS Code language server and the IntelliJ plugin: a new `didSaveDocument`
capability, a change-recording `TextDocuments` configuration (`bbj-kept-check.ts`), a large
extension of `BBjDocumentBuilder`'s debounce/arming logic, a rewritten diagnostic-hierarchy
composition path (`composeOnSaveDiagnostics`), and the matching IntelliJ settings/init-options
wiring. The design is unusually well documented (nearly every function has a doc comment
explaining its invariants), and the accompanying test suites (`on-save-trigger.test.ts`,
`on-save-kept-errors.test.ts`, `bbj-kept-check.test.ts`, `bbj-cpl-fallback-dedup.test.ts`) are
extensive and exercise most of the documented edge cases through a real `NormalizedTextDocuments`
instance rather than hand-rolled stubs.

Despite that density of documentation and tests, direct execution against the actual code (not
just static reading) turned up two genuine, reproducible correctness gaps in the on-save/debounced
compiler-check machinery — both confirmed with throwaway repro tests run against the real modules
and then discarded (no source files were modified; `git status` was clean before and after). The
first directly contradicts this phase's own headline guarantee for `off` mode ("No compiler checks
at all"). The IntelliJ side, the diagnostic-reconciliation pure functions, the `java-interop.ts`
parse-lane change, and the documentation updates did not turn up further defects on this pass.

## Critical Issues

### CR-01: Switching the compiler trigger to `off` does not cancel an in-flight debounce cycle, so a stale check still runs and publishes diagnostics

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:712-966` (the `debouncedCompile` timer
callback), interacting with `runBbjcplForDocuments`'s `'off'` branch at `bbj-vscode/src/language/bbj-document-builder.ts:421-442`

**Issue:** `debouncedCompile`'s `setTimeout` callback never re-checks `getCompilerTrigger()` before
doing its work. Once a cycle is armed (by typing under `debounced`, or by an open/save under either
mode), it runs the live parse (or the BBjCPL fallback compile) and stores/publishes the result
unconditionally — the only trigger checks inside the callback are `=== 'on-save'` branches that pick
*which* composition function to use, never a guard that aborts when the trigger has become `'off'`.

Separately, nothing cancels the pending `cplDebounceTimers` entry when the trigger flips to `'off'`:
`runBbjcplForDocuments`'s `'off'` branch (`bbj-document-builder.ts:421-442`) clears verdict/kept-check
state and strips existing `BBjCPL`/`BBj Parser` diagnostics, but only for documents in the *current
rebuild's* `documents` array, and it never touches `this.cplDebounceTimers`.

Net effect: type in a file under `debounced` (arming a 500 ms timer), then switch
`bbj.compiler.trigger` to `off` before the timer fires (`main.ts`'s `onDidChangeConfiguration`
calls `setCompilerTrigger('off')` directly, with no interaction with the builder's timers at all).
The already-armed cycle still fires, still calls the live parser (or BBjCPL), still calls
`setVerdictState`/`setKeptCheck`, and still calls `publishCycleDiagnostics` — pushing a fresh
compiler diagnostic to the client (or writing it into `document.diagnostics`) *after* the user
disabled compiler checks. This directly contradicts the mode's own documented contract: the
`bbj.compiler.trigger` enum description (`bbj-vscode/package.json`) and both `features.md` pages
say `off` means "No compiler checks at all, neither the live compiler check nor BBjCPL."

Confirmed empirically (not just by reading): a throwaway test that opens a document under
`debounced`, advances the fake timer 200 ms into the 500 ms window, calls `setCompilerTrigger('off')`,
then advances the remaining 400 ms, shows `getVerdictState(uri)` populated with the scripted
diagnostic (`message: 'this should never reach the client once trigger is off'`) even though the
trigger was `off` for the entire second half of the window. The test file was written to
`bbj-vscode/test/`, run, and deleted immediately after — it is not part of this diff.

**Fix:** Add an early guard at the top of the timer callback (right after the `mySequence`
bookkeeping, before any `await`) that reads the trigger fresh and bails out — clearing this
document's verdict via `forgetVerdict` and returning — when it is `'off'`:

```ts
const timer = setTimeout(async () => {
    this.cplDebounceTimers.delete(key);
    if (getCompilerTrigger() === 'off') {
        this.forgetVerdict(document);
        return;
    }
    const mySequence = (this.checkSequence.get(key) ?? 0) + 1;
    ...
```

This alone fixes the case above (the check re-reads the trigger at fire time). For full coverage,
also cancel every pending timer when a rebuild observes the trigger switching to `'off'`, so a
timer armed under `debounced`/`on-save` doesn't even need to fire and no-op:

```ts
if (trigger === 'off') {
    for (const [, timer] of this.cplDebounceTimers) clearTimeout(timer);
    this.cplDebounceTimers.clear();
    clearAllVerdictStates();
    ...
```

## Warnings

### WR-01: `composeOnSaveDiagnostics`'s `'fallback'` branch never re-applies Rule 2, so a Langium warning can survive next to a kept BBjCPL error

**File:** `bbj-vscode/src/language/bbj-document-validator.ts:221-229` (`composeOnSaveDiagnostics`)

**Issue:** For `input.kept.kind === 'fallback'` (the save-time BBjCPL compile, used whenever the
live BBj parser is unavailable), the diagnostic hierarchy is applied *once*, to
`input.langiumDiagnostics` alone, before the kept BBjCPL diagnostics are placed onto the result by
`composeWithKeptCheck`:

```ts
return composeWithKeptCheck({
    ...input,
    langiumDiagnostics: applyDiagnosticHierarchy(input.langiumDiagnostics, suppressCascadingEnabled, maxErrorsDisplayed)
});
```

The function's own doc comment explains this ordering is deliberate so a kept BBjCPL diagnostic
never re-triggers Rule 0 ("BBjCPL errors present → suppress Langium parse errors") a second time.
That reasoning holds for Rule 0, but `applyDiagnosticHierarchy` also implements Rule 2 ("any
Error-severity diagnostic present → suppress all warnings/hints"), and Rule 2 is evaluated *before*
the kept BBjCPL diagnostic (which may itself be the only Error in play) is added to the list. If
`input.langiumDiagnostics` contains only a Warning (e.g. a downgraded linking warning) and the kept
fallback check's own diagnostic is an Error, the final, published list contains both — the warning
is never suppressed, because at the moment Rule 2 ran there was no Error yet in the list it saw.

Confirmed empirically with a focused unit test calling `composeOnSaveDiagnostics` directly with a
one-Warning `langiumDiagnostics` list and a one-Error `kept.diagnostics` (`kind: 'fallback'`): the
result contained both severities (`[Warning, Error]`) instead of just the Error. This is the
`'verdict'` branch's *opposite* ordering (there, the hierarchy correctly runs *after*
`composeWithKeptCheck`, so Rule 2 sees the full merged list) — only the `'fallback'` branch has this
gap. The repro test was written, run, and deleted; it is not part of this diff.

**Fix:** Reorder so Rule 2 sees the final merged list without re-exposing Rule 0 to the kept
diagnostics. One option: keep Rule 0 pre-applied to `langiumDiagnostics` alone (as today), but move
Rule 2 (and the existing Rule 3/3b capping) to run once, after composition, against the merged
result — e.g. by splitting `applyDiagnosticHierarchy` into a "Rule 0 only" pre-pass and a
"Rules 2/3/3b" post-pass, and calling them on either side of `composeWithKeptCheck` for the
`'fallback'` branch (mirroring the already-correct `'verdict'` branch's single post-composition
call, which doesn't have this problem because Rule 0 there has nothing to suppress a second time).

## Info

### IN-01: `CompilerTriggerSourceGuardTest` asserts on exact source-text substrings/counts, which is brittle and was previously flagged in this codebase

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerTriggerSourceGuardTest.java`

**Issue:** This new test (following the pre-existing `CompilerOutputDirectorySourceGuardTest`
pattern for #571) reads the raw `.java` source of five files with `Files.readString` and asserts on
literal substring counts and index ordering (e.g. `countOccurrences(text, "public String
compilerTrigger = \"debounced\"")`, `text.indexOf("new JBLabel(\"Compiler check:\")")`). This style
provides real regression protection against a wiring site silently disappearing, but it is fragile
against any harmless refactor (renaming a local, reformatting a line, switching quote style) and
gives no protection against a logic error that keeps the exact same source shape. The project's own
memory notes a prior instance of this style of guard shipping "green-but-weak" coverage. Not a
functional defect in this phase, but worth a second look before this pattern is copied again for a
future setting.

**Fix:** No change required for this phase. If this pattern is reused again, consider asserting via
reflection/behavioral tests (as `CompilerInitOptionsTest` already does for the pure-Java seam)
rather than raw source-text scanning, reserving the source-guard style for the handful of
integration points (e.g. "does `BbjLanguageClient` avoid mentioning this key at all") that have no
other testable seam.

---

_Reviewed: 2026-09-24T17:51:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
