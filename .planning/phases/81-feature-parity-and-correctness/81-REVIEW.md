---
phase: 81-feature-parity-and-correctness
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 45
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
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjLexerStringCommentSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerInitOptionsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/CompilerOutputDirectorySourceGuardTest.java
  - bbj-vscode/src/Commands/CompilerOptions.ts
  - bbj-vscode/src/language/bbj-cpl-parser.ts
  - bbj-vscode/src/language/bbj-cpl-service.ts
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/compile-command.ts
  - bbj-vscode/src/language/compiler-options.ts
  - bbj-vscode/src/language/lsp-position.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/test/compile-request.test.ts
  - bbj-vscode/test/compiler-options-single-table.test.ts
  - bbj-vscode/test/cpl-integration.test.ts
  - bbj-vscode/test/cpl-parser.test.ts
  - bbj-vscode/test/lsp-position.test.ts
  - bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/bin/bbj
  - bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/bin/bbjcpl
  - bbj-vscode/test/test-data/cpl-fixture-compile-fatal-bbjhome/cfg/.gitkeep
  - bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/bin/bbj
  - bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/bin/bbjcpl
  - bbj-vscode/test/test-data/cpl-fixture-compile-ok-bbjhome/cfg/.gitkeep
findings:
  critical: 0
  warning: 6
  info: 6
  total: 12
status: issues_found
---

# Phase 81: Code Review Report

**Reviewed:** 2026-09-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

Re-review after gap-closure plan 81-06 landed, widening scope from the previous 38 files to
45: the new `lsp-position.ts` sentinel module, its two emitting sites
(`bbj-cpl-parser.ts`, `bbj-document-validator.ts`), their four touched/added test files, and
the new `CompileResultJsonBoundaryTest.java` cross-language boundary test.

81-06's core fix is correct and well-covered: `Number.MAX_SAFE_INTEGER` is gone from both
`character:` emitting sites, `END_OF_LINE_CHARACTER` (2147483647) is now the single shared
sentinel, the TypeScript source guard (`lsp-position.test.ts`) will catch a future
`character:` literal regression, and `CompileResultJsonBoundaryTest` proves the fix against
LSP4J's own `MessageJsonHandler`/Gson, including a pinned negative control for the old value.
No security vulnerabilities or crash/data-loss-grade defects were found in this pass either —
bbjcpl is still always spawned with an argv array (never a shell string), and the new
"explicit output location required" guard still blocks a compile before any bbjcpl invocation.

However, the fix is asymmetric: it bounds `character` but not `line`, and the new source
guard is explicitly scoped to `character:` literals only, so nothing in the test suite would
catch a `line` value doing the same thing `character` used to do (WR-05). The four warnings
and four info items carried over from the previous review's 38-file scope
(`bbj-ws-manager.ts`, `compiler-options.ts`, `compile-command.ts`,
`BbjCompileAction.java`/`CompileResultPresenter.java`, `RemToggleSeam.java` /
`BbjStringCommentScanner.java`) are unchanged — none of those files were touched by 81-06 —
and are restated below for a self-contained report. Two further findings are new to this
pass, found while reading the newly-in-scope lexer seam and CPL service files at this depth:
`BbjStringCommentScanner` over-extends a `rem` comment past what the grammar terminal it
claims to mirror actually matches (WR-06), and `BBjCPLService`'s two compile methods
duplicate the same ~60-line spawn/timeout/stdout/stderr wiring (IN-05).

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
`bbj/compile`'s output-directory seeding with no error and no test to catch it. Confirmed by
direct trace: `setCompilerConfig({output:{directory:'/tmp/out'}})` followed by
`setCompilerConfig({output:{validateOnly:true}})` leaves `getCompilerConfig().output.directory`
`undefined` — no test in `compile-request.test.ts` exercises two consecutive calls where the
second carries a (different) `output` sub-key, only the top-level-disjoint-key case
(`{trigger:'off'}`).
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

### WR-05 (new): The `character` bound from 81-06 has no `line` counterpart, on either emitting site

**File:** `bbj-vscode/src/language/bbj-cpl-parser.ts:43` and `bbj-vscode/src/language/bbj-document-validator.ts:218-231`
**Issue:** 81-06's own `must_haves.truths` states: "Every LSP `Position` the language server
emits... carries a `line` and a `character` that are non-negative integers no greater than
2147483647." The fix delivers this for `character` (now `END_OF_LINE_CHARACTER`,
imported at both sites) but not for `line`. In `bbj-cpl-parser.ts`,
`physicalLine = Math.max(0, parseInt(match[1], 10) - 1)` clamps only the lower bound (the
pre-existing P61-D2-009 zero-clamp); `parseInt` on the regex's unbounded `\d+` capture can
produce any positive integer, and that value becomes `range.start.line`/`range.end.line`
directly, un-clamped on the high end. The same pattern repeats in
`extractCyclicReferenceRelatedInfo`: `line = parsedLine - 1` (from `parseInt` on a
`[in path:line]` message fragment), again `Math.max(0, line)`-clamped low but not high. This
is exactly the class of defect 81-06 exists to close (T-81-24: "a `bbj/compile` response
carrying a position a JVM client cannot represent") — a `range.start.line`/`range.end.line`
above `2147483647` would fail to deserialize into `org.eclipse.lsp4j.Position`'s `int` field
the same way the old `character` value did. The new source guard in `lsp-position.test.ts`
is explicitly and deliberately scoped to `character:` properties only ("an unrelated future
use of the large global elsewhere in the language server does not trip it" —
by the same construction it also does not watch `line:`), so nothing in the suite would catch
this. Practical risk is low — `physicalLine` reflects bbjcpl's own count of physical lines in
the compiled file, not attacker-controlled input, so reaching 2^31 requires an implausibly
large source file — but the fix as shipped does not fully satisfy its own stated invariant,
and the gap is cheap to close for defense-in-depth/symmetry with the `character` fix.
**Fix:** Clamp the high end the same way the low end already is, e.g. add a
`clampUinteger(n: number): number` helper to `lsp-position.ts`
(`Math.min(Math.max(0, n), LSP_MAX_UINTEGER)`) and use it for `physicalLine` in
`bbj-cpl-parser.ts` and for `line` in `bbj-document-validator.ts`'s
`extractCyclicReferenceRelatedInfo`.

### WR-06 (new): `BbjStringCommentScanner` over-extends a `rem` comment past what the grammar terminal it claims to mirror actually matches

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lexer/BbjStringCommentScanner.java:63-94` (`isCommentStart`/`scanComment`), grammar terminal at `bbj-vscode/src/language/bbj.langium:923`
**Issue:** The class doc claims to mirror `terminal COMMENT:
/([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/;` "verbatim." That terminal's
`([ \t][^\n\r]*)?` group — the part that consumes the rest of the line — is itself
conditioned on the very next character being a space or a tab; if `rem` is immediately
followed by anything else that still passes the negative lookahead (e.g. `(`, `:`, `,`), the
terminal matches only the 3-letter `rem` itself and nothing more, confirmed against the live
regex: `/(...)/.exec("rem(x)")` → `"rem"` only, vs. `.exec("rem (x)")` → `"rem (x)"` (the
whole line). `isCommentStart` correctly reuses the same negative-lookahead character set, but
`scanComment` — called whenever `isCommentStart` is true, with no re-check of what the next
character actually was — unconditionally scans to end of line regardless of whether that next
character is whitespace. So for `rem(x)`, the Java scanner classifies the whole line as one
COMMENT token (making `(`/`)` invisible to `BbjPairedBraceMatcher`), while the grammar it
claims to mirror would treat `rem` as an (empty) comment and `(x)` as ordinary tokens.
Practical impact is limited — the tests (`remOpensACommentThatRunsToTheEndOfTheLine` and
`BbjStringCommentScannerTest` generally) only exercise the whitespace-after-`rem` case, and a
well-formed BBj program is unlikely to contain `rem` immediately followed by punctuation with
intent other than "comment" — but this is exactly the transient/in-progress-typing state (a
user typing `rem(` mid-edit) that bracket-matching and auto-close need to behave reasonably
through, and it is the same terminal `RemToggleSeam` in the same module additionally chose
to require a literal space/tab/EOL for (a narrower, but here more grammar-accurate, rule than
`BbjStringCommentScanner`'s).
**Fix:** In `scanComment`, check whether the character at `start + 3` is a space or tab (or
end of buffer/line) before scanning to end of line; when it is present but not whitespace,
have `advance()` in `BbjWordLexer` treat the 3 letters as a (short) COMMENT token and resume
normal tokenization from `start + 3`, matching the terminal's actual match length in that
case.

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

### IN-05 (new): `BBjCPLService.compile` and `.compileWithOptions` duplicate ~60 lines of spawn/timeout/stdout/stderr wiring

**File:** `bbj-vscode/src/language/bbj-cpl-service.ts:103-221` (`compile`) and `:242-314` (`compileWithOptions`)
**Issue:** Both methods independently: build the same three-variable closure
(`stderr`/`stdout`/`proc`/`settled`), define an equivalent `settle()` guard, set up a
`setTimeout` that kills the process and settles with an empty/failure result, wrap `spawn()`
in an identical try/catch distinguishing `ENOENT` from other errors, and wire near-identical
`stdout`/`stderr`/`close`/`error` handlers. The two genuinely differ only in the abort-on-resave
`inFlight` bookkeeping, the argv (`['-N', filePath]` vs. `[...compilerArgs, filePath]`), and the
return shape (`Diagnostic[]` vs. `CompileRun`). This is a maintainability/DRY concern, not a
correctness bug — both copies are internally consistent — but a future change to timeout or
error-classification behavior (a common source of past bugs in this area, per the extensive
inline commentary on race-safety in both methods) has to be made twice and kept in sync by hand.
**Fix:** Extract a shared `spawnBbjcpl(bbjcplBin, args, { timeoutMs, onSettle })`-style helper
that both methods call, parameterizing only the argv, the `inFlight`/abort wiring, and the
result-shaping step each needs.

### IN-06 (new): Unchecked platform cast in `BbjSettingsComponent`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:100`
**Issue:** `((JBTextField) compilerOutputDirectoryField.getTextField())` casts the result of
`TextFieldWithBrowseButton.getTextField()` (declared to return `JTextField`) to the narrower
`JBTextField`, purely to reach `.getEmptyText().setText(...)`. Every other
`TextFieldWithBrowseButton` in this same class (`bbjHomeField`, `nodeJsField`) avoids this by
never calling a `JBTextField`-only method on the result. This relies on the current IntelliJ
Platform version's default `TextFieldWithBrowseButton` implementation happening to construct a
`JBTextField`-based field internally; if a future platform version (or a different
`TextFieldWithBrowseButton` constructor were used later) returns a plain `JTextField`, this
line throws `ClassCastException` during settings-panel construction, breaking the whole BBj
settings page. No test in the reviewed scope exercises `createComponent()` to catch this.
**Fix:** Guard with `instanceof` (`if (getTextField() instanceof JBTextField jbf) jbf.getEmptyText().setText(...)`) or use `TextFieldWithBrowseButton`'s own placeholder-text API if one exists in this platform version, so a future platform change degrades gracefully instead of throwing.

---

_Reviewed: 2026-09-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
