---
phase: 116-java-interop-test-coverage
fixed_at: 2026-09-28T13:56:57Z
review_path: .planning/phases/116-java-interop-test-coverage/116-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 116: Code Review Fix Report

**Fixed at:** 2026-09-28T13:56:57Z
**Source review:** .planning/phases/116-java-interop-test-coverage/116-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: `unusedLoopbackPort()` has a check-then-use race that can flake a test on a busy CI host

**Files modified:** `bbj-vscode/test/loopback-jsonrpc-peer.ts`
**Commit:** 83baa87b
**Applied fix:** Kept the existing API shape (bare `Promise<number>` return, no handle) rather than
holding the throwaway listener open — a refused-connection test needs the port to be genuinely
unlistened-on, so keeping the probe server alive would defeat the tests that rely on
`unusedLoopbackPort()`. Added an explicit doc-comment note above `unusedLoopbackPort()` stating the
check-then-use race, its acceptable-risk rationale for this suite's low concurrency, and a pointer
for a future flaky-test investigation so it isn't rediscovered from scratch.

### IN-01: `isUniversalObjectReceiver` skip comment says "Warning" path but the suppressed diagnostic is pushed as `'error'`

**Files modified:** `bbj-vscode/src/language/bbj-document-validator.ts`
**Commit:** c1ad493b
**Applied fix:** Reworded the comment at the `skipUniversalObjectReceiver` suppression from
"...applied here to the linking-Warning path too" to "...applied here to the linking-error
diagnostic path too", matching the actual `diagnostics.push(this.toDiagnostic('error', ...))`
call a few lines below. No behavioral change — comment wording only.

## Skipped Issues

None — all findings were fixed.

## Verification

Both commits were made inside an isolated git worktree (`.claude/worktrees/rf-116-*`, branch
`gsd-reviewfix/116-*`) created off `gsd/v4.7-audit-hygiene-burndown`, then fast-forwarded back onto
that branch and torn down (worktree removed, temp branch deleted, recovery sentinel cleared) — no
divergence, clean fast-forward.

The worktree has no installed dependencies or generated Langium output (`src/language/generated/`
is gitignored and produced by `npm run langium:generate`), so `tsc`/`vitest` cannot run there.
**All verification below ran in the main checkout** (`/home/coder/repos/bbj-language-server`,
`bbj-vscode/`) after the fast-forward landed both commits on
`gsd/v4.7-audit-hygiene-burndown` — these results are reproducible from the tree as it now stands
on that branch:

- `npx tsc --noEmit` (from `bbj-vscode/`): clean, no errors.
- `npx vitest run test/java-interop-socket.test.ts test/linking.test.ts`: 2 files, 50 passed / 1
  skipped (pre-existing skip, unrelated to these fixes).
- `npx vitest run test/test-helper.test.ts` (third consumer of `unusedLoopbackPort()`): 12 passed.

---

_Fixed: 2026-09-28T13:56:57Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
