---
phase: 81-feature-parity-and-correctness
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjPairedBraceMatcher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjParserDefinition.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/commenter/RemToggleSeam.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lexer/BbjStringCommentScanner.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/BbjCommenterSelfManagingSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/RemToggleSeamTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjLexerStringCommentSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java
  - bbj-vscode/src/Commands/CompilerOptions.ts
  - bbj-vscode/src/language/bbj-cpl-service.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/compile-command.ts
  - bbj-vscode/src/language/compiler-options.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/test/compile-request.test.ts
  - bbj-vscode/test/compiler-options-single-table.test.ts
  - bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/bin/bbj
  - bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/bin/bbjcpl
  - bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/cfg/.gitkeep
  - bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/bin/bbj
  - bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/bin/bbjcpl
  - bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/cfg/.gitkeep
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 81: Code Review Report

**Reviewed:** 2026-09-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

Reviewed the shared `bbj/compile` request handler and its bbjcpl argv/option-table logic
(`compile-command.ts`, `compiler-options.ts`, `bbj-cpl-service.ts`, `bbj-ws-manager.ts`,
`main.ts`), the VS Code adapter over the shared option table, and the IntelliJ-side lexer
seam (`BbjStringCommentScanner`/`BbjWordLexer`/`BbjPairedBraceMatcher`), commenter toggle
seam (`RemToggleSeam`/`BbjCommenter`), compile-output-directory setting plumbing
(`BbjSettings*`, `CompilerInitOptions`, `BbjLanguageServerFactory`), and the "Compile BBj
File" action/presenter (`BbjCompileAction`, `CompileResultPresenter`).

No security vulnerabilities or crash/data-loss-grade defects were found — the process is
always spawned with an argv array (never a shell string), so no command injection is
possible from configured option values, and the new "explicit output location required"
guard does block a compile before any bbjcpl invocation in the tested cases. However,
several correctness/robustness gaps weaken the guarantees the code's own comments claim,
and there is a small amount of duplicated recognition logic and stale documentation. None
of the findings below are exercised by the existing test suite, which is why they survived
this far.

## Warnings

### WR-01: `setCompilerConfig`'s "merge, never replace" contract is only a shallow, top-level merge

**File:** `bbj-vscode/src/language/bbj-ws-manager.ts:296-301` (contract documented at 290-295)
**Issue:** `setCompilerConfig` does `this.compilerConfig = { ...this.compilerConfig, ...config }`.
This is a shallow, top-level spread: if `config` carries an `output` key at all (even one that
omits `directory`), it **replaces** the entire nested `output` object rather than merging into
it — silently erasing a previously-seeded `output.directory` (e.g. IntelliJ's
`compilerOutputDirectory` seed from `onInitialize`). The doc comment at lines 290-295
explicitly promises this "is a merge (never a wholesale replace) so a VS Code settings push
that carries no output directory can never erase the `compilerOutputDirectory` seed" — that
promise only holds today because IntelliJ never happens to call this path with an `output`-
bearing object in the same server process as a VS Code push (per the source-guard tests'
own account of the wiring). The implementation itself does not enforce the invariant the
comment claims, so a later change to either client's config-push wiring (or a test/refactor
that calls `setCompilerConfig` with a partial `output` object) would silently regress
`bbj/compile`'s output-directory seeding with no error and no test to catch it.
**Fix:**
```ts
public setCompilerConfig(config: Record<string, unknown> | undefined): void {
    if (!config) return;
    const merged: Record<string, unknown> = { ...this.compilerConfig };
    for (const [key, value] of Object.entries(config)) {
        const existing = merged[key];
        merged[key] = (isPlainObject(existing) && isPlainObject(value))
            ? { ...existing, ...value }
            : value;
    }
    this.compilerConfig = merged;
}
```
(or, more narrowly, special-case `output` to be deep-merged one level).

### WR-02: The "explicit output location required" guard is not whitespace-safe

**File:** `bbj-vscode/src/language/compiler-options.ts:570-575` (`lacksExplicitOutputLocation`) and `:490-495` (`buildCompileOptionsFrom`'s string/number branch)
**Issue:** `lacksExplicitOutputLocation` treats any non-empty string as an explicit output
directory: `typeof outputDirectory === 'string' && outputDirectory.length > 0`. A
whitespace-only value (e.g. `"  "`, plausible from a stray trailing space pasted into
`settings.json`) satisfies this check and is never trimmed, so the safety guard this code's
own comment describes — "`bbj/compile` always requires the caller to say, explicitly,
either where the compiled output should go... or that nothing should be written at all"
(lines 557-566) — is bypassed by a value that names nowhere real. `buildCompileOptionsFrom`
then emits `-d   ` (flag directly concatenated with the untrimmed value, per its own
"parameterized options" comment) which bbjcpl will reject in some unhelpful way, rather than
the friendly `output-directory-required` message the user should have seen. The IntelliJ
side already guards against exactly this (`CompilerInitOptions.normalizeOutputDirectory`
trims and normalizes blank-after-trim to `""` before it ever reaches the server), but the VS
Code path (`compiler-options.ts`/`Commands/CompilerOptions.ts`) has no equivalent
normalization, so the two client channels are inconsistent.
**Fix:**
```ts
const outputDirectory = read(getFullConfigKey('output.directory'));
const hasOutputDirectory = typeof outputDirectory === 'string' && outputDirectory.trim().length > 0;
```
and trim string option values generically in `buildCompileOptionsFrom` before the
`!== ''` check.

### WR-03: `bbj/compile`'s URI handling can throw instead of returning a structured `CompileResult`

**File:** `bbj-vscode/src/language/compile-command.ts:92-101`
**Issue:** `createCompileHandler` does `const uri = URI.parse(params.uri);` with no
try/catch, then (after only a scheme check) `const filePath = uri.fsPath;`. `vscode-uri`'s
`fsPath` getter runs `decodeURIComponent` internally and can throw `URIError: URI malformed`
for a `file:` URI containing an invalid percent-encoded sequence. Every other failure mode in
this handler is turned into a well-formed `CompileResult` with a `reason`, but this one would
instead reject the request's promise, which the IntelliJ/VS Code clients are not written to
expect from `bbj/compile` (both dispatch on `CompileResult.reason`, not on a JSON-RPC error).
Low likelihood given both clients construct the URI themselves, but the handler's own
contract ("refuses before any bbjcpl spawn... each check returning a `CompileResult`")
implies every rejection path should be structured.
**Fix:**
```ts
let uri: URI;
try {
    uri = URI.parse(params.uri);
} catch (e) {
    return { success: false, diagnostics: [], reason: 'invalid-file-uri', message: String(e) };
}
```
(and similarly guard the `uri.fsPath` access, or fold it into the same try/catch).

### WR-04: `BbjCompileAction`'s file-extension gating is case-sensitive, unlike the rest of the codebase

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:162-168`
**Issue:** `update()` computes visibility with
`ext.equals("bbj") || ext.equals("bbx") || ext.equals("src")` — a case-sensitive comparison.
CLAUDE.md states "The BBj language is case-insensitive," and the language server's own file
filter (`BBjWorkspaceManager.shouldIncludeEntry` in `bbj-ws-manager.ts:225-238`) explicitly
lowercases the path before comparing extensions for exactly that reason. A file saved with an
uppercase or mixed-case extension (`Foo.BBJ`, common after a case-insensitive-filesystem
rename or an external tool) would silently fail this action's visibility gate — "Compile BBj
File" simply would not appear for it, with no error shown. This literal comparison is pinned
by `BbjCompileActionSourceGuardTest.theUpdateGatingAndTheHashtag571ReferenceAreUnchanged`, so
fixing it also means updating that guard test's expectation.
**Fix:**
```java
String ext = file.getExtension();
isBbjFile = ext != null && switch (ext.toLowerCase(Locale.ROOT)) {
    case "bbj", "bbx", "src" -> true;
    default -> false;
};
```

## Info

### IN-01: Duplicated case-insensitive `r`/`e`/`m` matching between two classes

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/commenter/RemToggleSeam.java:87-97` and `bbj-intellij/src/main/java/com/basis/bbj/intellij/lexer/BbjStringCommentScanner.java:96-106`
**Issue:** Both classes independently implement the identical three-method pattern
(`isR`/`isE`/`isM` vs. `isRChar`/`isEChar`/`isMChar`, each comparing a `char` against its
upper- and lower-case ASCII form). Both are documented with nearly the same rationale
("never through a locale-sensitive... method"). This is exact logic duplication across two
otherwise-unrelated plain-Java seams that both exist specifically to mirror the same grammar
terminal.
**Fix:** Extract a shared `RemWordMatch` (or similar) utility with `isCommentStart(CharSequence, int, int)`-style helpers that both `RemToggleSeam` and `BbjStringCommentScanner` delegate to, removing one of the two duplicated triads.

### IN-02: Stale "18-entry" comment; the table actually has 20 entries

**File:** `bbj-vscode/src/Commands/CompilerOptions.ts:21`
**Issue:** The doc comment reads "the 18-entry `COMPILER_OPTIONS` table," but
`COMPILER_OPTIONS` in `bbj-vscode/src/language/compiler-options.ts:85-302` has 20 entries
(counted: 5 type-checking, 5 line-numbering, 5 output-control, 3 content-modification, 2
diagnostics = 20).
**Fix:** Update the comment to "20-entry" (or drop the count entirely so it can't drift again).

### IN-03: `CompileResultPresenter`'s `reason == null` branch renders the literal text "null"

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java:54-57`
**Issue:** `titleTail = ": " + reason;` when `reason` is `null` string-concatenates to
`": null"`, so the balloon title would literally read
`Failed to compile "hello.bbj": null`. This path is unreachable from the real `bbj/compile`
server today (every failure branch in `compile-command.ts` sets a concrete `reason` string),
so it only fires in the defensive `CompileResultPresenterTest.anUnknownReasonStillProducesAVisibleErrorBalloon`
case, which only asserts the title still starts with "Failed to compile" and does not catch
the literal "null" text.
**Fix:**
```java
titleTail = "";
```
(mirroring the `default` branch's non-null handling, or use a dedicated "no reason given" clause).

### IN-04: Raw bbjcpl text goes into IntelliJ notification bodies unescaped

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:130-135` and `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java:85-89` (the `bbjcpl-error` branch)
**Issue:** `presentation.body` for the `bbjcpl-error` reason is the raw bbjcpl `stderr` text
verbatim (by design — see `rawCompilerTextIsShownVerbatimWhenNothingParsed` in
`CompileResultPresenterTest.java:94-101`), and that string is passed unescaped into
`NotificationGroupManager...createNotification(title, body, type)`. IntelliJ's notification
balloons render a subset of HTML in their body text; if bbjcpl's stderr ever contains `<` or
`&` (plausible in a compiler message quoting source text), the balloon could render garbled
or truncated rather than showing the operator the literal text they need to diagnose the
failure.
**Fix:** HTML-escape `presentation.body` (e.g. via `StringUtil.escapeXmlEntities`) at the one
call site that constructs the `Notification`, without changing `CompileResultPresenter`'s
own "verbatim" contract.

---

_Reviewed: 2026-09-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
