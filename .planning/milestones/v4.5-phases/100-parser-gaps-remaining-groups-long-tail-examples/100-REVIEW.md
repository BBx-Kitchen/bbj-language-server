---
phase: 100-parser-gaps-remaining-groups-long-tail-examples
reviewed: 2026-09-22T04:33:01Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - bbj-vscode/src/language/bbj.langium
  - bbj-vscode/src/language/bbj-token-builder.ts
  - bbj-vscode/src/language/validations/check-classes.ts
  - bbj-vscode/src/language/validations/line-break-validation.ts
  - bbj-vscode/test/examples-compile.test.ts
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
  - bbj-vscode/test/parser-keyword-statements.test.ts
  - bbj-vscode/test/test-data/conformance/array-bracket-forms.bbj
  - bbj-vscode/test/test-data/conformance/language-words-as-names.bbj
  - bbj-vscode/test/test-data/conformance/line-numbered-class.bbj
  - bbj-vscode/test/test-data/conformance/rem-after-block-boundaries.bbj
  - bbj-vscode/test/test-data/conformance/statement-option-tails.bbj
  - examples/invalid/README.md
  - examples/invalid/dim-examples-substring-expressions.bbj
  - examples/invalid/dim-examples-substring-expressions.expected.json
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 100: Code Review Report

**Reviewed:** 2026-09-22T04:33:01Z
**Depth:** standard
**Files Reviewed:** 14 (one, `dim-examples-substring-expressions.expected.json`, is a JSON sidecar with no findings of its own)
**Status:** issues_found

## Summary

Reviewed the grammar (`bbj.langium`), the token-category grants in `bbj-token-builder.ts`, the
`array?` → `arrayDims` rename in `check-classes.ts`, the widened tolerance regexes in
`line-break-validation.ts`, the new `examples-compile.test.ts` harness, the touched e2e/parser
test files, and the five conformance fixtures / `examples/invalid` addition.

Ran the two directly-modified test files plus `example-files.test.ts`, `validation.test.ts`, and
`conformance-regressions.test.ts` (`--maxWorkers=2` to dodge the known `initializeWorkspace`
`beforeAll` contention timeout) — all 389 assertions across those runs passed. Traced the new
`ArrayElement` empty-bracket alternative, the `arrayDims` rename (confirmed zero remaining `.array`
consumers anywhere in `src/`), the seven new custom-token `CATEGORIES`/`LONGER_ALT` grants against
their regex patterns (including lookbehind edge cases at document offset 0, verified empirically
with node), and the two widened `line-break-validation.ts` regexes character-by-character for
over-acceptance. No BLOCKER-level defect found in the reviewed diff — the grammar/token-builder
change set is well-covered by its own new tests and those tests are not vacuous.

Two real WARNING-level issues were found: forbidden planning-artifact identifiers left in shipped
source/test comments, and an overly broad diagnostic exclusion in the new `examples-compile.test.ts`
harness that silently blinds the "always-on" layer to any unresolved cross-reference bug in any
example file, not just the cross-file-import fixtures it was written to cover. Two INFO-level
observations are also recorded.

## Warnings

### WR-1: Planning-artifact identifiers left in shipped source and test comments

**File:** `bbj-vscode/src/language/bbj-token-builder.ts:14, 75-76`
**File:** `bbj-vscode/test/parser-keyword-statements.test.ts:617, 619, 628, 723, 756, 808`
**Issue:** The project's own `CLAUDE.md` / team convention (also restated in this review's own
`review_focus`, and explicitly honored in `examples/invalid/README.md`'s closing line: "No
requirement, plan or decision identifier appears in this file...") forbids planning identifiers in
source and test comments. This phase's own README follows that rule, but two other touched files
don't:
- `bbj-token-builder.ts:14`: `// 100-CONFORMANCE.md's oracle-sweep section for the reverted probe evidence.`
- `bbj-token-builder.ts:75-76`: `// for \`next\` (100-CONTEXT/ROADMAP) was not actually true until this grant (discovered by / // this plan's own deeper sweep, 100-CONFORMANCE.md).`
- `parser-keyword-statements.test.ts:617`: `// fallback (unrelated to this plan's own widening) -- recorded in 100-CONFORMANCE.md's`
- `parser-keyword-statements.test.ts:619`: `// flagged, and adding a check for them is not this plan's job.`
- `parser-keyword-statements.test.ts:628`: `// 100-CONFORMANCE.md, not fixed.`
- `parser-keyword-statements.test.ts:723`: `// Plan 02 asserted these shapes parse-only (the line-break validator's raw line-start text`
- `parser-keyword-statements.test.ts:756`: `// scope here, recorded in 100-CONFORMANCE.md.`
- `parser-keyword-statements.test.ts:808`: `// 100-CONFORMANCE.md, not fixed here. \`clear x![]\` and \`clear except a$,b\` stay exactly as`

These reference a planning artifact (`100-CONFORMANCE.md`) and a plan number (`Plan 02`) that are
meaningless to a future reader of the shipped code and violate the project's explicit no-planning-
identifiers rule for source/test comments.
**Fix:** Reword each comment to describe the reverted/deferred behavior in its own terms without
citing the planning document or plan number, e.g. replace "recorded in 100-CONFORMANCE.md, not
fixed" with "recorded as a known gap, not fixed here" and "Plan 02 asserted..." with "An earlier
pass asserted...".

### WR-2: `examples-compile.test.ts`'s always-on layer is blind to any unresolved-reference bug, not just cross-file imports

**File:** `bbj-vscode/test/examples-compile.test.ts:100-116` (filter at `:103-107`)
**Issue:** The "always-on: language-server layer" test's error filter is:
```ts
const errorDiagnostics = result.diagnostics.filter(d =>
    d.severity === DiagnosticSeverity.Error &&
    d.data?.code !== DocumentValidator.LinkingError &&
    !FILE_NOT_RESOLVED_PATTERN.test(typeof d.message === 'string' ? d.message : '')
);
```
The comment above `FILE_NOT_RESOLVED_PATTERN` (lines 44-53) justifies excluding `LinkingError`
specifically for `examples/imports/*.bbj`, whose sibling-file cross-reference genuinely can't
resolve in this single-document harness. But `d.data?.code !== DocumentValidator.LinkingError` is
applied to **every** file collected by `collectBbjFiles(examplesRoot, invalidRoot)`, not just files
under `examples/imports/`. `DocumentValidator.LinkingError` (`bbj-document-validator.ts:172-190`,
`node_modules/langium/lib/validation/document-validator.js:286`) is Langium's generic code for
*any* unresolved cross-reference in the document — an unresolved variable, class, or label
reference anywhere, not only the cross-file import case the comment describes. As written, a typo'd
variable/class/label reference introduced into any non-`imports/` example file would produce a
`LinkingError`-coded diagnostic that this filter silently discards, so the test's stated guarantee
("every valid example parses and validates clean") does not actually hold for that entire class of
bug.
**Fix:** Scope the exclusion to the files it was written for, e.g.:
```ts
const rel = path.relative(examplesRoot, file);
const isImportFixture = rel.startsWith(`imports${path.sep}`);
const errorDiagnostics = result.diagnostics.filter(d =>
    d.severity === DiagnosticSeverity.Error &&
    !(isImportFixture && d.data?.code === DocumentValidator.LinkingError) &&
    !(isImportFixture && FILE_NOT_RESOLVED_PATTERN.test(typeof d.message === 'string' ? d.message : ''))
);
```
so a genuine unresolved-reference regression in any other example still fails the test.

## Info

### IN-1: `ParameterDecl`'s trailing `[ALL]`/`[]` marker is parsed but never captured in the AST

**File:** `bbj-vscode/src/language/bbj.langium:415`
**Issue:**
```
ParameterDecl returns VariableDecl:
    {infer ParameterDecl} type=QualifiedClass (arrayDims+='[' ']')* name=FeatureName ('[' 'ALL'? ']')?
```
The trailing `('[' 'ALL'? ']')?` after the parameter name is consumed by the parser (so
`BBjArray dat[ALL]` parses cleanly, per the new `type-side bracket shapes` tests) but assigns
nothing — no property on `ParameterDecl`/`VariableDecl` records whether the marker was present, or
whether it was `[ALL]` vs. a bare `[]`. Downstream consumers (hover, completion, semantic tokens,
any future by-reference-array validation) have no way to see this marker at all; it is silently
discarded during parsing.
**Fix:** If this information is ever needed downstream, add an assigned flag, e.g.
`(byRefArray?='[' all?='ALL'? ']')?`, and extend the `VariableDecl`/`ParameterDecl` interface
accordingly. If it's intentionally parse-only for now, a one-line comment on the rule saying so
would save the next reader from re-deriving this.

### IN-2: `NUMBER?` line-number tolerance in `ClassDecl`/`InterfaceDecl` also accepts decimal values

**File:** `bbj-vscode/src/language/bbj.langium:357-358, 362-363`
**Issue:** The new `NUMBER? (members+=ClassMember | Comments))*` / `NUMBER? 'CLASSEND'` tolerance
(and the equivalent for `InterfaceDecl`) reuses the shared `NUMBER` terminal
(`terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?|\.[0-9]+/;`, line 1042), which also matches
decimal literals. Classic BASIC-style line numbers are always integers, so `10.5 CLASSEND` (or a
bare `.5` before a member) now silently parses and validates clean as a "line number" prefix, wider
than the convention being emulated. Low impact — the `line-numbered-class.bbj` fixture only
exercises integer line numbers, and this is a widening rather than a narrowing bug — but worth a
one-line comment or an integer-only sub-pattern if strict fidelity to the BASIC-numbering
convention matters here.
**Fix:** Either accept as intentional over-tolerance (leave a comment noting it), or use a
dedicated integer-only terminal/fragment (`/[0-9]+/`) for this specific tolerance instead of the
general `NUMBER` terminal.

---

_Reviewed: 2026-09-22T04:33:01Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Orchestrator disposition (2026-09-22)

- WR-1: fixed — every planning identifier named above was reworded in plain terms (commit after review).
- WR-2: accepted as is — the `LinkingError` exclusion mirrors `conformance-regressions.test.ts`; without Java interop the single-document harness cannot resolve Java classes anywhere under `examples/`, so a per-folder exclusion would fail every example that uses Java.
- IN-1, IN-2: recorded, no change.
- Found outside this review, at the regression gate: freeing `library` as a variable name broke `BBjAPI()` resolution (three `linking.test.ts` tests); reverted for the variable position with a guard test, see `100-CONFORMANCE.md`.
