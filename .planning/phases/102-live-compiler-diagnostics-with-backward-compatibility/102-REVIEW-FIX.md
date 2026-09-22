---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
fixed_at: 2026-09-22T18:20:00Z
review_path: .planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 102: Code Review Fix Report

**Fixed at:** 2026-09-22T18:20:00Z
**Source review:** .planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (CR-01, WR-01; IN-01 was out of scope for this run)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### CR-01: Stale live-parser diagnostic silently absorbed into a mislabeled 'BBjCPL' diagnostic

**Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-vscode/test/document-builder.test.ts`
**Commit:** 30708d5d
**Applied fix:** `debouncedCompile()`'s timer callback previously cleared only `source === 'BBjCPL'` diagnostics before calling `mergeDiagnostics()`, and cleared `BBJ_PARSER_SOURCE` diagnostics only afterward. That let a leftover live-parser diagnostic from the previous debounce cycle collide with `mergeDiagnostics()`'s same-line match, which rewrites the entry's `source` to `'BBjCPL'` while keeping the *old* live-parser message text — silently dropping the current cycle's real BBjCPL diagnostic. Changed the first filter to clear both `'BBjCPL'` and `BBJ_PARSER_SOURCE` diagnostics together, before the merge step runs, and removed the now-redundant second filter (documented as append-only since nothing stale is left to remove). Extended `bbj-document-builder.ts`'s existing unit-test harness (`buildHarness()` in `document-builder.test.ts`) with a mocked `BBjParserService` (`isEnabled`/`requestLiveParse`) and added a regression test that runs `debouncedCompile()` across two debounce cycles on the same document: cycle 1 leaves a live-parser diagnostic on a line, cycle 2 has BBjCPL report a fresh diagnostic on the same line. The test asserts the final diagnostic carries the current BBjCPL message, not the stale live-parser text. Verified the test fails against the pre-fix code (received the stale message) and passes against the fix.

### WR-01: `parseErrorToRange` does not guard against `editorEndLine` clamping below `editorStartLine`

**Files modified:** `bbj-vscode/src/language/bbj-parser-service.ts`, `bbj-vscode/test/parser-coordinate-converter.test.ts`
**Commit:** ba0f9853
**Applied fix:** `startLine` and `endLine` were clamped independently in `parseErrorToRange()`, so an endpoint reply with `editorEndLine < editorStartLine` could produce an inverted `Range` (`end.line < start.line`), which the function's own doc comment notes a JVM language client's deserializer may reject outright — hiding every diagnostic for the document. Changed `endLine` to `Math.max(clampLine(error.editorEndLine), startLine)`, mirroring the existing defensive clamp already applied to the character axis. Updated the doc comment to describe the new guarantee. Added a test to `parser-coordinate-converter.test.ts` ("an end line reported before the start line clamps up to the start line, never producing an inverted range") using `editorStartLine: 5, editorEndLine: 2` against a document long enough that neither clamps to the same document-length bound; asserts `range.end.line` equals `range.start.line` and is never less than it. Verified the test fails against the pre-fix code (received `end.line: 1` vs expected `4`) and passes against the fix.

## Skipped Issues

None — both in-scope findings (CR-01, WR-01) were fixed. IN-01 was explicitly out of scope for this run per the fixer's dispatch configuration.

## Verification

All fix development and test runs happened inside an isolated review-fix worktree (`.claude/worktrees/rf-102-<pid>-<epoch>`, branch `gsd-reviewfix/102-<pid>`), which was fast-forwarded onto `gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility` and removed as part of this run's cleanup. The worktree has no `node_modules` or generated Langium artifacts by design (both are gitignored); both were symlinked in from this main checkout purely to run the commands below, then removed before the worktree was torn down — no symlinks were staged or committed. The numbers below are reproducible from this main checkout, since only source and test files changed (`git log` on this branch shows the two fix commits).

- `npx vitest run test/document-builder.test.ts test/parser-coordinate-converter.test.ts test/bbj-parser-service.test.ts` (run from `bbj-vscode/`): **3 files, 45 tests, all passed.**
- `npx tsc --noEmit -p bbj-vscode`: **no errors.**
- Each new regression test was confirmed to fail against the pre-fix source (verified by temporarily restoring the pre-fix file content, re-running the single affected test file, observing the expected failure, then restoring the fix) before being committed alongside its fix.

---

_Fixed: 2026-09-22T18:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
