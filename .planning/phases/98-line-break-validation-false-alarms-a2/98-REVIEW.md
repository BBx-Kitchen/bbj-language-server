---
phase: 98-line-break-validation-false-alarms-a2
reviewed: 2026-09-21T04:38:07Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - bbj-vscode/src/language/bbj-token-builder.ts
  - bbj-vscode/src/language/bbj-validator.ts
  - bbj-vscode/src/language/bbj.langium
  - bbj-vscode/src/language/validations/check-classes.ts
  - bbj-vscode/src/language/validations/check-variable-scoping.ts
  - bbj-vscode/src/language/validations/line-break-validation.ts
  - bbj-vscode/test/classes.test.ts
  - bbj-vscode/test/conformance-regressions.test.ts
  - bbj-vscode/test/line-break-single-line-if.test.ts
  - bbj-vscode/test/line-break-validation.test.ts
  - bbj-vscode/test/parser.test.ts
  - bbj-vscode/test/validation.test.ts
  - bbj-vscode/test/variable-scoping.test.ts
  - bbj-vscode/test/test-data/conformance/declare-methodret.bbj
  - bbj-vscode/test/test-data/conformance/def-fn-early-return.bbj
  - bbj-vscode/test/test-data/conformance/def-fn-unclosed-body.bbj
  - bbj-vscode/test/test-data/conformance/exit-load-save.bbj
  - bbj-vscode/test/test-data/conformance/keyword-branch-targets.bbj
  - bbj-vscode/test/test-data/conformance/print-trailing-comma.bbj
  - bbj-vscode/test/test-data/conformance/restore-numeric.bbj
  - bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj
  - bbj-vscode/test/test-data/conformance/table-statement.bbj
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 98: Code Review Report

**Reviewed:** 2026-09-21T04:38:07Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the diff against `875ba420f74febd7974e2f0460b276be3500c185^` for the token builder, grammar,
`bbj-validator.ts`, the two touched `validations/*.ts` files, and the full test/fixture set that backs
this phase (nine conformance fixtures + five test files). The phase's stated goal — stop line-break
validation from crying wolf on legal single-line IF/FI/ELSE chains, TABLE/RESTORE/EXIT/LOAD statements,
keyword-named GOTO/GOSUB targets, and unclosed multi-line DEF FN bodies — is achieved for every case its
own test suite exercises, and the severity downgrades (METHODRET checks, DEF FN bare RETURN, program-level
conflicting DECLARE) are asserted precisely (`expectWarning`/`DiagnosticSeverity.Warning`), not just
"no error".

However, two of the exact mechanisms this phase changed were empirically probed (via a temporary,
never-committed vitest file, immediately deleted after each run — `git status` confirms the working tree
is clean) against inputs the shipped test suite does **not** cover, and both reproduce regressions of the
same class this phase exists to fix:

- `elseStatementLineBreaks`/`ifEndStatementLineBreaks` lost the ability to tell a nested single-line
  IF/FI/ELSE chain from a non-nested one that closed early, so a genuinely malformed one-liner is now
  silently accepted (false negative).
- `RESTORE_NO_NL`'s character class doesn't include `*`, so `RESTORE` with a symbolic label target — a
  form the grammar explicitly supports via `LabelRef = SymbolicLabelRef | UserLabelRef` — is misparsed
  and produces exactly the kind of spurious "needs a line break" diagnostic this phase is supposed to be
  eliminating.

Both are documented below with the literal reproduction input and observed diagnostics. Everything else
in the diff (TABLE_DATA's statement-start anchor, the EXIT/LOAD grammar wiring, the branch-target
exclusion lookbehind, the classFqn/bbjSupertypesReach extraction, and FNEND becoming optional) held up
under adversarial reasoning and the additional probes performed.

## Critical Issues

### CR-01: ELSE/FI backward-walk regression silently accepts a non-nested, genuinely misplaced ELSE or FI on a single-line IF chain

**File:** `bbj-vscode/src/language/validations/line-break-validation.ts:182-222` (`elseStatementLineBreaks`, `ifEndStatementLineBreaks`)

**Issue:** The old code stopped the backward walk the moment it hit another `ElseStatement`/`IfEndStatement`
on the same line, leaving `lineBreaks.both = true` (i.e. "flag it") unless the walk found a governing
`IfStatement` *before* hitting one of those closers:

```ts
// before
} else if (isElseStatement(prev) || isIfEndStatement(prev)) {
    break; // other
}
```

The new code deleted that branch so the walk keeps going *past* any `ElseStatement`/`IfEndStatement` it
meets, looking only for the nearest `IfStatement` on the same physical line — with no bookkeeping of how
many closers were skipped versus how many governing `IfStatement`s remain "open". This was done to let a
genuinely nested chain like `if a then if b then c = 1 fi else d = 1 fi` find the *outer* IF past the
*inner* FI (correctly fixed, and tested in `line-break-single-line-if.test.ts`). But the same walk now
also accepts the non-nested case, where there is only **one** IF and it was already closed:

```
if a then b=1 fi else c=1
```

Verified empirically (temporary probe, `bbj-vscode/test/zzz-review-probe.test.ts`, deleted immediately
after the run — not part of this diff or any commit):

```
statements: ['IfStatement', 'LetStatement', 'IfEndStatement', 'ElseStatement', 'LetStatement']
lineBreakDiagnostics: []
```

Zero diagnostics. The `ELSE` has no IF left open for it to attach to (the only IF was already closed by
the preceding `FI`), yet the walk treats it as legitimate because it eventually finds *an* `IfStatement`
further back, without checking that IF is still "open" relative to the FIs it skipped over. The identical
flaw affects `ifEndStatementLineBreaks` — an extra, unmatched trailing `FI`:

```
if a then b=1 fi fi
```
```
statements: ['IfStatement', 'LetStatement', 'IfEndStatement', 'IfEndStatement']
lineBreakDiagnostics: []
```

Also zero diagnostics, for the same reason. Neither case is covered by
`line-break-single-line-if.test.ts`'s "forms that stay flagged" section, so nothing in the test suite
catches this.

**Fix:** Track a running balance while walking backward instead of stopping/continuing on shape alone —
e.g. increment a counter for each same-line `IfStatement` seen and decrement for each same-line
`IfEndStatement`/`ElseStatement` seen (an `ElseStatement` also "consumes" one open IF for the purposes of
this walk, the same way `FI` does), and only clear `lineBreaks.both`/`before` when an `IfStatement` is
found while the running balance indicates it is still un-closed:

```ts
function elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
    const mask = (node: ElseStatement) => {
        const lineBreaks = { before: false, after: false, both: true };
        let prev = previousStatement(node);
        let openClosers = 0; // FI/ELSE seen so far that still need a governing IF
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfStatement(prev)) {
                if (openClosers === 0) {
                    lineBreaks.both = false;
                }
                break;
            }
            if (isElseStatement(prev) || isIfEndStatement(prev)) {
                openClosers++;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks;
    };
    return [isElseStatement, mask];
}
```
(and the analogous change in `ifEndStatementLineBreaks`).

---

### CR-02: `RESTORE_NO_NL` doesn't recognize a symbolic label operand, reintroducing a false line-break alarm for `RESTORE *label`

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:134-147`; grammar at `bbj-vscode/src/language/bbj.langium:216-218`

**Issue:** The grammar change in this phase is:

```
RestoreStatement:
    RESTORE_NO_NL lineref=(LabelRef | NUMBER) | kind='RESTORE'
    ;
```

`LabelRef infers Expression: SymbolicLabelRef | UserLabelRef;` — so `RESTORE` explicitly supports a
symbolic label target (`*foo`), the same way `GOTO`/`GOSUB` do. But `RESTORE_NO_NL`'s lexer pattern only
looks for an alphanumeric/underscore operand:

```ts
PATTERN: this.regexPatternFunction(/RESTORE(?=[ \t]+[0-9A-Za-z_])/i),
```

`*` is not in that character class, so `RESTORE *foo` never matches `RESTORE_NO_NL`; it falls back to the
bare `kind='RESTORE'` keyword alternative, leaving `*foo` to be parsed as a separate, following
`ExpressionStatement` with no line break/`;` between them. Verified empirically (temporary probe, deleted
immediately after the run):

```
input: "RESTORE *foo\n"
statements: ['RestoreStatement', 'ExpressionStatement']
diagnostics: [
  'This statement needs to end with a line break: RESTORE',
  'This statement needs to start in a new line: *foo'
]
```

This is exactly the class of false alarm this phase exists to remove, reintroduced for a form the grammar
itself declares legal. None of the RESTORE test cases (`restore-numeric.bbj`, the "RESTORE with a numeric
or label reference" describe block in `line-break-validation.test.ts`) use a symbolic label, so this gap
shipped untested.

**Fix:** Extend the operand-start character class to include `*` (and update the doc comment, which
currently says "a numeric or label line reference" but should say "or symbolic label"):

```ts
PATTERN: this.regexPatternFunction(/RESTORE(?=[ \t]+[0-9A-Za-z_*])/i),
```

## Warnings

### WR-01: Conflicting-DECLARE check now requires interop-backed resolution, silently losing a real, resolution-free scalar-type mismatch

**File:** `bbj-vscode/src/language/validations/check-variable-scoping.ts:340-364`

**Issue:** The narrowed check requires both DECLARE types to resolve to a `Class` before comparing them
for relatedness:

```ts
const firstClass = getClass(decls[0].type);
const thisClass = getClass(decls[i].type);
if (!firstClass || !thisClass) {
    continue;
}
```

This is the right call for user-defined/Java types (avoids flooding diagnostics when java-interop is
down, per the comment). But BBj's built-in scalar types (`BBjNumber`/`BBjString`/`BBjInt`) only resolve to
a `Class` once a live classpath is loaded (see `ClassValidator.KNOWN_BBJ_SCALAR_TYPES`'s own comment:
"backed by real `com.basis.startup.type.*` classes that resolve once the classpath is loaded"). Verified
empirically against this project's own default test setup (`createBBjServices(EmptyFileSystem)` +
`initializeWorkspace`, no live java-interop — the same setup `variable-scoping.test.ts` itself uses):

```
DECLARE BBjNumber q!
DECLARE BBjString q!
```
produces only two "Could not resolve reference to Class named ..." linking diagnostics and **zero**
"Conflicting DECLARE" diagnostics.

Before this phase, the check was a plain case-insensitive text compare (`thisType.toLowerCase() !==
firstType.toLowerCase()`), so this exact mismatch — one of the most common, cheapest-to-catch DECLARE
typos in BBj (re-declaring the same variable with a different scalar suffix type) — was always flagged
whether or not java-interop was reachable. Now it is silently dropped whenever the classpath isn't loaded,
which per this repo's own test convention ("BBj/Java-dependent tests are skipped unless BBj is reachable")
is the common/default case. No test in `variable-scoping.test.ts` exercises a scalar-vs-scalar DECLARE
conflict (all new/changed tests use `java.lang.String`/`java.lang.Integer` or user-defined BBj classes,
which do resolve in the fake-interop test harness), so this loss of coverage shipped unnoticed.

**Fix:** Special-case the known scalar type names with a plain string compare before falling through to
the resolution-based check, mirroring the existing `ClassValidator.KNOWN_BBJ_SCALAR_TYPES` /
`literalTypeMismatch()` pattern in `check-classes.ts`:

```ts
const SCALAR_TYPES = new Set(['bbjnumber', 'bbjstring', 'bbjint']);
...
const firstLower = firstType.toLowerCase();
const thisLower = thisType.toLowerCase();
if (SCALAR_TYPES.has(firstLower) || SCALAR_TYPES.has(thisLower)) {
    if (firstLower !== thisLower) {
        // flag unconditionally — no resolution needed for these built-ins
    }
    continue;
}
```

### WR-02: `BRANCH_TARGET_EXCLUSION`'s bounded quantifiers silently reintroduce the branch-target bug past their limits

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:261`

**Issue:** The lookbehind

```ts
const BRANCH_TARGET_EXCLUSION = '(?<!(?:GOTO|GOSUB)[ \\t]{1,8}(?:[_A-Za-z]\\w{0,63}@?[ \\t]{0,8},[ \\t]{0,8}){0,16})'
```

is bounded on purpose (documented: "cannot backtrack catastrophically"), but the bounds are also
functional limits, not just perf safety valves: a target name longer than 64 characters, more than 8
spaces/tabs of indentation after `GOTO`/`GOSUB`, or more than 16 prior comma-separated targets in an
`ON ... GOSUB a,b,c,...` list will fall outside the lookbehind's reach and reintroduce exactly the bug
this token exists to fix (a keyword-named label losing its branch-target linking). This is a reasonable
engineering trade-off, but none of it is tested at the boundary (the "last target of an ON ... GOSUB list"
test in `line-break-validation.test.ts` uses a 2-item list, nowhere near 16), so a future change that
narrows these bounds further, or a real program that happens to have a 17-target GOSUB list, would
regress silently.

**Fix:** Add at least one boundary test (e.g. a 17-target `ON ... GOSUB` list with the last target
keyword-named) documenting the known limit, or note the limit in the roadmap/known-issues rather than
leaving it implicit in a regex comment.

### WR-03: `TABLE_DATA`'s optional numeric line-number prefix is untested and appears unused by the grammar

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:216-234`

**Issue:** `TABLE_DATA`'s lookbehind optionally allows a leading `\d+[ \t]+` before `TABLE`:

```ts
/(?<=(?:^|;)[ \t]*(?:\d+[ \t]+)?(?:[A-Za-z_][A-Za-z0-9_]*:[ \t]*)?TABLE[ \t]+)(?![=<>+\-*/,)\]])[^\r\n;]+/im
```

No other statement-start token added or touched in this phase (`RESTORE_NO_NL`, `EXIT_NO_NL`,
`START_BREAK`, `FNEND`, `METHODRET_END`, `KEYWORD_STANDALONE`, `PRINT_STANDALONE_NL`) supports a leading
numeric line-number prefix, and nothing else in `bbj.langium` appears to model classic-BASIC-style numeric
line numbers before a statement. This branch of the lookbehind is not exercised by any of the new
`table-statement.bbj` fixture lines or the "Line break validation: TABLE statement" test block (all cases
are either unlabelled or use a `L1:`/`L2:` name label, never a bare digit prefix).

**Fix:** Either confirm numeric line-number prefixes are a real, still-supported BBj legacy form and add a
fixture/test for `123 TABLE ff00\n`, or drop the untested `(?:\d+[ \t]+)?` group to keep the regex's
surface area matched by what's actually verified.

## Info

### IN-01: Forbidded planning identifier "P61-D5-006" survives in a line this phase's own diff touched

**File:** `bbj-vscode/test/line-break-validation.test.ts:36` (and the adjoining, untouched doc comment at
lines 30-34)

**Issue:** This phase's diff removes and re-adds the exact same `describe(...)` call (only the
per-describe `beforeAll` was hoisted out), so the line was directly in the diff's hunk:

```diff
-describe('Line break validation: CRLF and missing trailing newline (P61-D5-006)', async () => {
+describe('Line break validation: CRLF and missing trailing newline (P61-D5-006)', () => {
```

Per `CLAUDE.md`/project convention (and the reviewer brief for this phase), plan/decision IDs like
`P61-D5-006` don't belong in source or test files; GitHub issue numbers are the only IDs that are fine.
This one predates this phase, but touching the line was a free opportunity to drop it that was missed.

**Fix:** Rename the describe block to drop the `(P61-D5-006)` suffix (and trim the same ID out of the doc
comment two lines above it) the next time this file is touched.

### IN-02: Two conformance-suite tests are close to tautological

**File:** `bbj-vscode/test/conformance-regressions.test.ts:37-50`

**Issue:** `'conformance folder is non-empty'` re-asserts, standalone, exactly the same
`expect(files.length).toBeGreaterThan(0)` that the main test above it already performs inline before
iterating — it can never fail independently of the main test. `'conformance file list is order-independent'`
asserts `files` equals `[...files].sort()`, i.e. that today's directory listing happens to already be
sorted; it doesn't feed a shuffled/out-of-order list through anything, so it can't detect an
order-dependence bug in the code under test — only that `fs.readdirSync` returned a sorted list on this
run, which is an OS/filesystem property, not a property of this codebase.

**Fix:** Either fold the non-empty assertion into the main test only (already done there) and drop the
duplicate, or repurpose the "order-independent" test to actually shuffle the file list before feeding it
through the same code path the main test uses, so it exercises the property its name claims.

---

_Reviewed: 2026-09-21T04:38:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
