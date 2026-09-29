---
phase: 120-classvalidator-activate-splits
fixed_at: 2026-09-29T08:09:08Z
review_path: /home/coder/repos/bbj-language-server/.planning/phases/120-classvalidator-activate-splits/120-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 1
skipped: 1
status: partial
---

# Phase 120: Code Review Fix Report

**Fixed at:** 2026-09-29T08:09:08Z
**Source review:** /home/coder/repos/bbj-language-server/.planning/phases/120-classvalidator-activate-splits/120-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (fix_scope: all)
- Fixed: 1
- Skipped: 1 (intentional, no change required)

## Fixed Issues

### WR-01: `case "PROTECTED":` declares `const`s directly in the `switch` body, with no block scope

**Files modified:** `bbj-vscode/src/language/validations/check-class-reference.ts`
**Commit:** 4934de34
**Applied fix:** Wrapped the `PROTECTED` case body in `{ }` braces so `dirOfDeclaration` and
`dirOfUsage` are lexically scoped to that case only, instead of being visible (via TDZ) across the
entire `switch` statement. Matches the fix suggested in the review exactly; no adaptation needed
since the file was unchanged since the review ran.

**Verification:**
- Tier 1: re-read the modified section — braces present, `break;` and closing brace intact,
  surrounding `PUBLIC`/`PRIVATE` cases untouched.
- Tier 2: `tsc --noEmit` and `eslint` against the isolated worktree could not resolve `node_modules`
  / generated Langium artifacts (both are build outputs, gitignored, and not present in a fresh
  `git worktree`); this is worktree-environment noise unrelated to the edit — confirmed by symlinking
  the main checkout's `node_modules` and `src/language/generated` into the worktree and re-running
  both tools successfully (see below), and by the fact no `tsc` error referenced
  `check-class-reference.ts` even before the symlinks were added.
- After symlinking `node_modules` and `src/language/generated` from the main checkout into the
  isolated worktree (read-only; no writes to the main checkout's contents), ran the full required
  test/lint set **inside the worktree, on the fixed code**:
  - `npx vitest run test/validation.test.ts test/method-return-java-type.test.ts
    test/declare-in-class.test.ts test/completion-class-reference.test.ts test/classes.test.ts
    test/class-validations-issues.test.ts test/inheritance-cycle-validation.test.ts` →
    **7 files passed, 129 tests passed, 0 failed**.
  - `npm run lint` (`eslint src test tools/interop-test-harness --max-warnings 0`) → **clean, 0
    warnings/errors**.
  - All verification ran in the isolated worktree (`.claude/worktrees/rf-120-*`), not the main
    checkout, so these numbers reflect the fixed tree at commit 4934de34 rather than the
    orchestrator's post-merge checkout; re-run after the fast-forward merge if independent
    confirmation from the main checkout is desired.

## Skipped Issues

### IN-01: `getEMCredentials`'s dead `bbj.em.credentials` fallback is dropped (documented, zero runtime impact)

**File:** `bbj-vscode/src/em-auth.ts:25-40`
**Reason:** No change needed — intentional removal. This is documented dead-code removal
(`120-04-SUMMARY.md`, decision D-09): nothing in the repo, at `diff_base` or since, ever writes the
`bbj.em.credentials` secret-storage key the fallback read from, so the fallback was unreachable in
practice. Per explicit project instruction for this fix pass, this finding is recorded as
informational only and left as-is.
**Original issue:** `getEMCredentials` in `em-auth.ts` no longer falls back to a `bbj.em.credentials`
stored-JSON credential when the `bbj.em.token` SecretStorage key misses, unlike the pre-refactor
`extension.ts`. Confirmed dead code (no write-sites anywhere in the tree); zero runtime impact.

---

_Fixed: 2026-09-29T08:09:08Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
