---
phase: 88-setopts-in-code-hovers-tri-state-composer
reviewed: 2026-09-07T23:06:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - bbj-vscode/src/language/setopts-code-scanner.ts
  - bbj-vscode/test/setopts-code-scanner.test.ts
  - bbj-vscode/src/setopts-in-code-ui.ts
  - bbj-vscode/test/setopts-in-code-ui.test.ts
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 88: Code Review Report (re-review)

**Reviewed:** 2026-09-07T23:06:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This is a re-review after the gsd-code-fixer applied CR-01 (missing control-flow guards),
WR-01 (unreachable `MethodCall` branch removal), and WR-02 (word-boundary matching for the
SETOPTS/IOR(/AND( candidate-line gates). All three targeted fixes were verified directly
against `git show` diffs and cross-checked against `generated/ast.ts` and `bbj.langium`:

- **CR-01** is correct and complete for its stated scope. `isOnGotoStatement`, `isSwitchStatement`,
  `isSwitchCase`, `isUntilStatement`, and the `isKeywordStatement(stmt) && stmt.kind === 'REPEAT'`
  check are all real, exported type guards from `generated/ast.ts` (confirmed by grep), and the
  grammar confirms `GotoStatement.kind` covers both `GOTO`/`GOSUB`, and `SwitchStatement` covers
  both `SWITCH` and `SWEND` as one node type — so a single `isSwitchStatement` guard is sufficient
  for both keywords. All 13 control-flow-marker cases in the `test.each` table pass against the
  real guard list.
- **WR-01** is a clean, correct type-narrowing; no leftover dead code, and no other caller still
  passes a `MethodCall` into `traceOptsChain`/`trackedVariableName`.
- **WR-02** is a genuine improvement (previously `expand(`, `command(`, `brand(`, etc. false-positived
  the candidate-line gate) but is **incomplete**: it only guards the *leading* edge of the bare
  `SETOPTS` keyword. See WR-A below for the reproducible edge case this leaves open, present
  identically in both the VS Code regex and the IntelliJ Java heuristic.

Beyond the three targeted fixes, a standard-depth pass over `setopts-code-scanner.ts` surfaced one
pre-existing (not introduced by this round's fixes) but reproducible correctness bug in the
backward chain walk's scope resolution when the traced `SetOptsStatement` itself sits inside a
semicolon-joined `CompoundStatement` — confirmed empirically by a scratch reproduction test (not
committed) before being removed. No hardcoded secrets, dangerous functions, or debug artifacts
were found in any of the five files.

## Warnings

### WR-A: WR-02's word-boundary fix has no trailing boundary for the bare `SETOPTS` keyword

**File:** `bbj-vscode/src/setopts-in-code-ui.ts:44`
**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:70-76`

**Issue:** The WR-02 fix added a *leading* word-boundary check (`\b` in the TS regex;
`hasIdentifierCharBefore` in the Java heuristic) so substrings like `expand(`, `command(`,
`brand(` no longer false-positive. But neither implementation checks the boundary *after* the
bare `SETOPTS` keyword (the `IOR(` / `AND(` alternatives get an implicit trailing boundary for
free, because the pattern requires the literal `(` immediately after them — `SETOPTS` has no such
anchor). Confirmed by direct execution:

```
$ node -e "
const pattern = /\b(?:SETOPTS|IOR\(|AND\()/gi;
function test(line, character) {
  let match; pattern.lastIndex=0;
  while ((match = pattern.exec(line))) { if (match.index <= character) return true; }
  return false;
}
console.log(test('SETOPTSFOO opts\$', 10));        // true  (false positive)
console.log(test('x = SETOPTSHELPER(1)', 18));      // true  (false positive)
"
true
true
```

A line containing an unrelated identifier like `SETOPTSFOO` or `SETOPTSHELPER(1)` (a plausible
user-defined function/variable name) still satisfies `setoptsInCodeCandidateLine`, so the
"Compose SETOPTS block…" Code Action is offered on a line that has nothing to do with SETOPTS.
Since the server-side `decodeInCode` will legitimately report `found: false` for such a line, the
extension currently routes this straight into `openSetOptsTriStateComposerPanel(context, {}, send)`
— i.e. the **compose-new** flow — which is prepared to *insert a brand-new SETOPTS block at the
user's cursor* if they don't notice the mismatch between "I clicked near `SETOPTSFOO`" and "a
blank SETOPTS composer opened." The dialog requires an explicit OK, so this is not a silent data
change, but it is a real, reproducible triggering-condition regression in exactly the code path
WR-02 was meant to close. The identical structural gap exists in
`ComposerLauncher.isCaretOnCall`/`hasIdentifierCharBefore` for the `"setopts"` keyword (no check of
`text.charAt(idx + keyword.length())`), so the IntelliJ lightbulb intention's `isAvailable` has the
same false positive for `SETOPTSFOO`/`SETOPTSHELPER(`.

**Fix:** Require a trailing boundary for the bare `SETOPTS` alternative only (IOR(/AND( already have
one via the literal `(`):

```ts
// bbj-vscode/src/setopts-in-code-ui.ts
const pattern = /\bSETOPTS\b|\bIOR\(|\bAND\(/gi;
```

```java
// ComposerLauncher.java — for the "setopts" keyword specifically, also require
// !hasIdentifierCharAfter(text, idx + keyword.length())
private static boolean hasIdentifierCharAfter(String text, int idxAfterKeyword) {
    if (idxAfterKeyword >= text.length()) return false;
    char next = text.charAt(idxAfterKeyword);
    return Character.isLetterOrDigit(next) || next == '_' || next == '$' || next == '!' || next == '%' || next == '@';
}
// then in the loop: if (!hasIdentifierCharBefore(text, idx)
//     && !(keyword.equals("setopts") && hasIdentifierCharAfter(text, idx + keyword.length()))
//     && caretCol >= idx) { return true; }
```

### WR-B: `findAnchor` mis-scopes the backward walk when the target `SetOptsStatement` is itself inside a semicolon-joined `CompoundStatement`

**File:** `bbj-vscode/src/language/setopts-code-scanner.ts:198-213` (`findAnchor`), interacting with
`traceOptsChain` at `:453-458`

**Issue:** `containerStatements()` (line 176) treats `CompoundStatement` as a valid "statement list
owner," exactly like `Program`/`MethodDecl`/`DefFunction`. `findAnchor` stops climbing at the
*first* node for which `containerStatements()` returns a value. When the traced `SetOptsStatement`
is itself one of the semicolon-joined elements of a `CompoundStatement` (e.g. `A$=IOR(A$,"$08$")
; SETOPTS A$` on one physical line), `target.$container` **is** that `CompoundStatement`, so
`findAnchor` returns the compound's own (tiny) `.statements` array as the whole search space —
losing every sibling statement in the actual enclosing scope, including an `A$=OPTS` origin on a
preceding line. Reproduced directly (scratch test, removed after confirming, not committed):

```
source: 'A$=OPTS\nA$=IOR(A$,"$08$") ; SETOPTS A$'
traceOptsChain(target) => { safe: false, unsafeReason: 'no-origin',
                             links: [{fnName:'IOR', maskHex:'08', ...}], ... }
```

i.e. a chain that is obviously safe (one `IOR` link between an `OPTS` origin and the `SETOPTS`
target) is reported as `no-origin`, and the hover text tells the user **"no `var$=OPTS` assignment
was found in the enclosing block"** — which is factually wrong; the assignment exists, it's just
outside the mistakenly-narrowed search window. This fails closed (no incorrect edit is ever
offered), so it's not a safety violation of DISC-06's "never a false safe" contract, but it is a
functional defect that silently disables edit-in-place for a documented, already-tested BBj idiom
(the existing "CompoundStatement sibling is transparent" test only covers a compound statement that
is a *sibling before* the target — not one that *contains* the target itself). This is pre-existing
(introduced in the original 88-02 chain-walk implementation, not by this round's CR-01/WR-01/WR-02
fixes), but was not previously flagged.

**Fix:** Don't let `findAnchor` treat `CompoundStatement` as a terminal container — keep climbing
through it to the real top-level statement-list owner, and locate the actual `target` node (not
`anchor.statements[anchor.anchorIndex]`) in the already-flattened array so the compound wrapper
itself never needs to appear in the flattened list:

```ts
function findAnchor(target: AstNode): { statements: ReadonlyArray<AstNode>; anchorIndex: number } | undefined {
    let prev: AstNode = target;
    let node: AstNode | undefined = target.$container;
    let hops = 0;
    while (node && hops < MAX_CONTAINER_HOPS) {
        const statements = containerStatements(node);
        if (statements && !isCompoundStatement(node)) {
            const idx = statements.indexOf(prev);
            return idx === -1 ? undefined : { statements, anchorIndex: idx };
        }
        prev = node;
        node = node.$container;
        hops++;
    }
    return undefined;
}
```

and in `traceOptsChain`, pass `target` itself (not `anchor.statements[anchor.anchorIndex]`) as the
anchor statement to `walkChain`, since `flattenStatements` already inlines compound children and
`target` is guaranteed to be present in the flattened array once `findAnchor` correctly climbs past
any enclosing `CompoundStatement`.

### WR-C: Divergent identifier-boundary definitions between the TS and Java word-boundary checks

**File:** `bbj-vscode/src/setopts-in-code-ui.ts:44` vs.
`bbj-intellij/.../ComposerLauncher.java:81-87` (`hasIdentifierCharBefore`)

**Issue:** The two "same" heuristics disagree on what counts as an identifier character
immediately before the keyword. The TS regex's `\b` uses JS's `\w` definition (`[A-Za-z0-9_]`
only), while the Java `hasIdentifierCharBefore` additionally treats BBj's sigil characters
(`$ ! % @`) as identifier characters. Concretely, for a hypothetical line where a `$`/`!`/`%`/`@`
-terminated identifier sits directly adjacent to `AND(`/`IOR(`/`SETOPTS` with no operator between
them, the VS Code gate would treat it as a boundary (candidate) while the IntelliJ gate would not
(no candidate). Because a BBj sigil terminates an identifier, arguably the *Java* behavior is the
one out of step with real BBj tokenization (the TS behavior more closely matches how the lexer
would actually split those tokens) — but regardless of which is "more correct," two composer UIs
sharing one supposedly-identical heuristic should not diverge. Low real-world impact (this
requires an unusual missing-operator text pattern to manifest), but worth reconciling so the two
IDEs offer the composer action consistently for the same source text.

**Fix:** Either drop the sigil characters from `hasIdentifierCharBefore` to match the TS `\w`-based
definition, or extend the TS regex to a custom boundary class (`(?<![\w$!%@])`) that matches the
Java definition — pick one canonical definition and use it in both places, ideally sourced from a
single shared doc comment describing BBj identifier characters.

## Info

### IN-01: `setopts-in-code-ui.test.ts`'s substring-negative cases don't exercise the trailing-boundary gap (WR-A)

**File:** `bbj-vscode/test/setopts-in-code-ui.test.ts:293-304`
**Issue:** The `test.each` table for `setoptsInCodeCandidateLine` covers keywords that contain
`IOR(`/`AND(` as a substring preceded by a letter (`expand(`, `command(`, `brand(`, etc.), which is
exactly the case WR-02 fixed — but there is no case for an identifier where `SETOPTS` is a
*prefix* (e.g. `SETOPTSFOO`), so the gap described in WR-A has no regression test guarding it.
**Fix:** Add a case such as `['SETOPTSFOO', 'x = SETOPTSFOO(1)']` to the negative
`test.each` table (it will currently fail, confirming WR-A) once the trailing-boundary fix lands.

---

_Reviewed: 2026-09-07T23:06:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
