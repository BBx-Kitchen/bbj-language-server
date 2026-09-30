---
phase: 115-honest-interop-test-harness
reviewed: 2026-09-28T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - CLAUDE.md
  - bbj-vscode/package.json
  - bbj-vscode/test/eslint-disable-directives.test.ts
  - bbj-vscode/test/interop-harness-fake-peer.ts
  - bbj-vscode/test/interop-harness-report.test.ts
  - bbj-vscode/test/interop-harness.test.ts
  - bbj-vscode/tools/interop-test-harness/cases.ts
  - bbj-vscode/tools/interop-test-harness/gate.ts
  - bbj-vscode/tools/interop-test-harness/report-template.ts
  - bbj-vscode/tools/interop-test-harness/report.ts
  - bbj-vscode/tools/interop-test-harness/run-tests.ts
  - bbj-vscode/tools/interop-test-harness/scaffold.ts
  - bbj-vscode/tools/interop-test-harness/types.ts
  - bbj-vscode/tsconfig.harness.json
  - bbj-vscode/tsconfig.test.json
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 115: Code Review Report

**Reviewed:** 2026-09-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase splits the monolithic `run-tests.ts` interop test harness into `cases.ts` /
`gate.ts` / `scaffold.ts` / `report.ts` / `report-template.ts`, adds a real in-process
fake-peer test suite (`test/interop-harness*.ts`), adds a self-test that guards lint-suppression
comments always carry a reason (`test/eslint-disable-directives.test.ts`), and wires the harness
into `npm run lint` / `typecheck:test` / a new `npm run interop-harness` script.

The refactor is careful and mostly self-consistent: `evaluateGate`/`deriveStatus` are the single
source of truth for pass/fail, the 17 hand-written fixture cases line up with the CLI/report
assertions in both new test files, HTML/JSON escaping in `report.ts` is correctly ordered and
covered by dedicated tests, and `npm run typecheck:test` / `npx eslint tools/interop-test-harness
test/interop-harness*.ts test/eslint-disable-directives.test.ts` / the three new/changed test
files all ran clean locally. No hardcoded secrets, dangerous functions, or empty catch blocks were
found.

Three issues are worth fixing: a documented-but-inexact parity claim between the harness's
"peer signalled an error" heuristic and the production code it says it mirrors, an unanchored
substring match in the new lint-suppression guard that can misclassify text merely containing the
word "eslint-disable" as a violation, and an unguarded division in the report's summary bar. None
of these currently fail a test or reproduce with the shipped fixtures, but all three are real gaps
a reviewer should not wave through.

## Warnings

### WR-01: `hasErrorField` does not actually match the production truthiness check it claims to mirror

**File:** `bbj-vscode/tools/interop-test-harness/cases.ts:171-182`
**Issue:** The docstring says this helper reads "the same signal `java-interop.ts` reads on a
resolved class to decide whether to skip it (#514)". Production code (`bbj-vscode/src/language/java-interop.ts:965` and `:989`) does a plain truthy check: `if (javaClass.error || !javaClass.packageName)`. `hasErrorField` instead explicitly excludes only `undefined`, `null`, `false` and `''`:
```ts
return err !== undefined && err !== null && err !== false && err !== '';
```
For a hypothetical peer reply with `error: 0` (or `NaN`), the plain truthy check in production
treats it as "no error" (0 is falsy), while `hasErrorField` treats it as "peer signalled an
error" (0 passes all four `!==` comparisons). The two are equivalent for every value the fixtures
actually exercise (string messages, `undefined`, `false`, `''`), but the exact-parity claim in the
comment is not true in general, which undermines the "honest harness mirrors production" premise
this whole phase is about.
**Fix:** Either mirror the production check exactly (`return Boolean(err)`, matching
`javaClass.error`'s plain truthiness), or narrow the comment to state the check is "equivalent to
`javaClass.error` for the value shapes the peer is known to send (message string, absent, or
`false`)" rather than "the same signal".

### WR-02: Lint-suppression guard's directive match is not boundary-anchored

**File:** `bbj-vscode/test/eslint-disable-directives.test.ts:43-62`
**Issue:** `findDirectiveViolations` locates a line's violation purely via
`line.indexOf(DIRECTIVE)` (`DIRECTIVE = 'eslint-disable'`) and then classifies whatever follows
into next-line / same-line / "bare, therefore always a violation":
```ts
const rest = line.slice(at + DIRECTIVE.length);
let scoped: string | null = null;
if (rest.startsWith(NEXT_LINE_SUFFIX)) { ... }
else if (rest.startsWith(SAME_LINE_SUFFIX)) { ... }
if (scoped === null) {
    // Bare or range-form directive ... Never allowed.
    violations.push(...);
    return;
}
```
There is no check that the match is a whole directive token (e.g. word-boundary/non-identifier
character after `DIRECTIVE`). Any line that merely contains the substring `eslint-disable` without
being an actual ESLint directive — e.g. a variable/property named `eslintDisabledRules`, or prose
in a comment/string such as `"never write eslint-disable without a reason"` — falls into the
`scoped === null` branch and is reported as a "bare file-wide suppression … never allowed"
violation, even though no suppression comment exists at all. No such text currently exists in the
scanned roots (verified via `grep -rn "eslint-disable" src test tools/interop-test-harness`
outside the skipped generated folder), so the test is green today, but the matcher will produce a
misleading false-positive report — telling a future contributor their line is an unscoped
suppression when it may not be a directive at all — the moment such text is introduced.
**Fix:** Require a non-identifier boundary immediately after `DIRECTIVE` before treating it as a
directive at all (e.g. `at !== -1 && !/^[a-zA-Z]/.test(rest)`), or restrict matching to a comment
prefix (`//` or `/*`) directly preceding `DIRECTIVE`, so the scanner only classifies genuine
`eslint-disable`/`eslint-disable-line`/`eslint-disable-next-line` directives instead of any line
containing the raw substring.

### WR-03: `buildSummaryBar` divides by `total` with no zero guard

**File:** `bbj-vscode/tools/interop-test-harness/report.ts:99-124`
**Issue:**
```ts
function buildSummaryBar(verdict: GateVerdict, total: number): string {
    const { passCount, failCount, errorCount } = verdict;
    return `<div class="summary-bar">
    ...
    <div class="progress-bar">
        <div class="progress-pass" style="width:${(passCount / total) * 100}%"></div>
        <div class="progress-fail" style="width:${(failCount / total) * 100}%"></div>
        <div class="progress-error" style="width:${(errorCount / total) * 100}%"></div>
    </div>
</div>`;
}
```
`generateReport` (and therefore `buildSummaryBar`) is a publicly exported function that other
callers (or a future case set) could invoke with an empty `results` array, making `total === 0`.
Every `width:` value becomes `NaN%`, silently producing a broken progress bar in the emitted HTML
instead of a clear degenerate-but-valid rendering (e.g. an empty/0-width bar). This can't be hit
through the current 17-case CLI/tests (`total` is always 17), but the function itself enforces no
such invariant and is exported as a general-purpose report builder.
**Fix:** Guard the denominator, e.g. `const pct = (n: number) => total === 0 ? 0 : (n / total) * 100;` and use `pct(passCount)` etc.

## Info

### IN-01: Inconsistent field-check path naming for constructors between cases

**File:** `bbj-vscode/tools/interop-test-harness/cases.ts:49, 80`
**Issue:** Case 1 (`java.lang.String`) labels its constructor field-check path
`'constructors[0]'` (line 49: `validateMethodFields(cls.constructors[0], checks, 'constructors[0]');`), while case 2 (`java.util.HashMap`) labels each of its constructors
`` `constructor(${ctor.parameters?.length ?? '?'})` `` (line 80). Both resolve to the same
`isCriticalFieldCheck` verdict because `gate.ts`'s `finalSegment` only looks at text after the
last `.`, so this has no functional effect — but the two different path-naming conventions
(`constructors[N]` vs `constructor(arity)`) show up side-by-side in the generated report's
field-check table, which is a minor readability/consistency regression for a report whose whole
purpose is to be legible to a human triaging a real peer regression.
**Fix:** Pick one convention (e.g. always `constructors[N]`) for the field-check path prefix
across all case validators.

---

_Reviewed: 2026-09-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
