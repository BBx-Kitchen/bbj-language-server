---
phase: 110-workspace-settings-filesystem-trust
fixed_at: 2026-09-26T13:11:00Z
review_path: .planning/phases/110-workspace-settings-filesystem-trust/110-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 110: Code Review Fix Report

**Fixed at:** 2026-09-26
**Source review:** .planning/phases/110-workspace-settings-filesystem-trust/110-REVIEW.md
**Iteration:** 1

**Fix scope:** CR-01 and WR-01 only (IN-01 left alone, per explicit scope).

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

**Verification environment:** All edits, test runs, and `tsc --noEmit` were executed directly in
the main checkout (`/home/coder/repos/bbj-language-server`) on the existing branch
`gsd/v4.7-audit-hygiene-burndown`, **not** in an isolated git worktree. The normal fixer protocol
calls for creating a dedicated worktree before any edits when `workflow.use_worktrees` is `true`
(it is, per `.planning/config.json`); that step was skipped by operator error before the first
commit was made. Both commits below are already real, correctly-scoped, and atomic on the current
branch, so no destructive git surgery was attempted to retroactively relocate them. The numbers in
this report are reproducible by checking out the two commit hashes below on this same branch.

## Fixed Issues

### CR-01: `containedPrefixCandidates` callers do not filter the empty-string PREFIX entry that is the default state, producing a phantom root anchored at the server's own `cwd`

**Files modified:** `bbj-vscode/src/language/path-containment.ts`, `bbj-vscode/test/path-containment.test.ts`, `bbj-vscode/test/use-path-containment.test.ts`
**Commit:** `bf4bc57d`
**Applied fix:** Centralized the empty/whitespace-only-PREFIX skip inside `containedPrefixCandidates` itself (one `if (prefix.trim().length === 0) continue;` guard per iteration), so all four call sites — including the three the review found unguarded (`bbj-document-builder.ts`, `bbj-scope.ts`, `bbj-validator.ts`) — are covered without touching those call sites individually. Left `isPathInside` unchanged, as instructed, and corrected the module's doc comment, which previously claimed (incorrectly) that callers already filtered empty entries before calling this module.

Added a regression test in each of the two suggested test files:
- `path-containment.test.ts`: `containedPrefixCandidates([''], 'X.bbj')` and `containedPrefixCandidates(['   '], 'X.bbj')` both yield `[]`; `containedPrefixCandidates(['', '/v/lib'], 'Used.bbj')` still yields the real prefix's candidate.
- `use-path-containment.test.ts`: with `prefixes: ['']`, a relative `USE` statement triggers zero `readFile` calls on the spy `FileSystemProvider`.

All four new assertions were confirmed to fail before the fix (verified by temporarily reverting the guard, re-running, then reapplying) and pass after it.

**Regression run** (`example-files.test.ts`, `classes.test.ts`, `linking.test.ts`, `use-path-containment.test.ts`, `path-containment.test.ts`, `validation.test.ts`): 141 passed, 1 skipped, 11 failed — all 11 failures are pre-existing `linking.test.ts` "Interop related tests" failures (`Could not resolve reference to JavaPackageLike/NamedElement …`), unrelated to PREFIX containment and matching the documented baseline (interop-backend `getAllClassNames` env drift against the local `:5008` service; see project memory `interop-backend-getallclassnames-test-drift`). No assertion in any pre-existing test was changed — the fix did not require touching any existing test's expected behavior.

### WR-01: `toPlainJSON` copies workspace-controlled settings via bracket assignment, which is vulnerable to a `__proto__` key silently redirecting the copy's prototype

**Files modified:** `bbj-vscode/src/config-path-trust.ts`, `bbj-vscode/test/extension-config-trust.test.ts`
**Commit:** `8f0943ae`
**Applied fix:** In `toPlainJSON`'s object branch, the accumulator is now built with `Object.create(null)` instead of a plain object literal, and a source key literally named `"__proto__"` is skipped rather than copied — closing both the prototype-redirection path and any future `Object.assign`/spread reintroduction of the same hazard on the returned object. Updated the function's doc comment to describe the guard.

Added a regression test to `extension-config-trust.test.ts` (next to the existing `gatedBbjSettings` copy test): a nested settings value built via `JSON.parse('{"__proto__":{"polluted":true},"safe":"value"}')` (a genuine own `"__proto__"` data property, matching how a hand-edited `.vscode/settings.json` would parse) is passed through `gatedBbjSettings`. Asserts `Object.getPrototypeOf(nested)` is `null` (not redirected to the attacker-supplied object), `nested.polluted` is `undefined` (not inherited through a redirected prototype), `nested.safe` is preserved, and `JSON.stringify(result)` does not throw.

Confirmed to fail before the fix (`Object.getPrototypeOf(nested)` was the attacker-supplied `{ polluted: true }` object instead of `null`) and pass after it.

**Regression run:** `extension-config-trust.test.ts` (23/23 passed), plus `extension-activation.test.ts`, `config-reload-host.test.ts`, `config-file-association.test.ts` (52/52 passed) — all pre-existing assertions unchanged.

## Skipped Issues

None — both in-scope findings were fixed.

## Type Check

`npx tsc -p tsconfig.json --noEmit` — clean, no errors, after both fixes.

---

_Fixed: 2026-09-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
