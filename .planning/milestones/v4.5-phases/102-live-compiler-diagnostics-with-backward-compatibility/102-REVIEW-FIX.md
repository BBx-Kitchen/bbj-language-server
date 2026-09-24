---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
fixed_at: 2026-09-22T18:42:00Z
review_path: .planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 102: Code Review Fix Report

**Fixed at:** 2026-09-22T18:42:00Z
**Source review:** .planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (CR-01, WR-01, IN-01)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: Stale live-parser diagnostic silently absorbed into a mislabeled 'BBjCPL' diagnostic

**Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-vscode/test/document-builder.test.ts`
**Commit:** 30708d5d
**Applied fix:** `debouncedCompile()`'s timer callback previously cleared only `source === 'BBjCPL'` diagnostics before calling `mergeDiagnostics()`, and cleared `BBJ_PARSER_SOURCE` diagnostics only afterward. That let a leftover live-parser diagnostic from the previous debounce cycle collide with `mergeDiagnostics()`'s same-line match, which rewrites the entry's `source` to `'BBjCPL'` while keeping the *old* live-parser message text — silently dropping the current cycle's real BBjCPL diagnostic. Changed the first filter to clear both `'BBjCPL'` and `BBJ_PARSER_SOURCE` diagnostics together, before the merge step runs, and removed the now-redundant second filter (documented as append-only since nothing stale is left to remove). Extended `bbj-document-builder.ts`'s existing unit-test harness (`buildHarness()` in `document-builder.test.ts`) with a mocked `BBjParserService` (`isEnabled`/`requestLiveParse`) and added a regression test that runs `debouncedCompile()` across two debounce cycles on the same document: cycle 1 leaves a live-parser diagnostic on a line, cycle 2 has BBjCPL report a fresh diagnostic on the same line. The test asserts the final diagnostic carries the current BBjCPL message, not the stale live-parser text. Verified the test fails against the pre-fix code (received the stale message) and passes against the fix.
**Fixed in this run's source-verification:** re-read `bbj-document-builder.ts:248-286` and confirmed the fix is present and unchanged from the prior run — the combined filter clears both `'BBjCPL'` and `BBJ_PARSER_SOURCE` before the merge step, and the second (now-redundant) filter has been removed. No source changes were needed in this run.

### WR-01: `parseErrorToRange` does not guard against `editorEndLine` clamping below `editorStartLine`

**Files modified:** `bbj-vscode/src/language/bbj-parser-service.ts`, `bbj-vscode/test/parser-coordinate-converter.test.ts`
**Commit:** ba0f9853
**Applied fix:** `startLine` and `endLine` were clamped independently in `parseErrorToRange()`, so an endpoint reply with `editorEndLine < editorStartLine` could produce an inverted `Range` (`end.line < start.line`), which the function's own doc comment notes a JVM language client's deserializer may reject outright — hiding every diagnostic for the document. Changed `endLine` to `Math.max(clampLine(error.editorEndLine), startLine)`, mirroring the existing defensive clamp already applied to the character axis. Updated the doc comment to describe the new guarantee. Added a test to `parser-coordinate-converter.test.ts` ("an end line reported before the start line clamps up to the start line, never producing an inverted range") using `editorStartLine: 5, editorEndLine: 2` against a document long enough that neither clamps to the same document-length bound; asserts `range.end.line` equals `range.start.line` and is never less than it. Verified the test fails against the pre-fix code (received `end.line: 1` vs expected `4`) and passes against the fix.
**Fixed in this run's source-verification:** re-read `bbj-parser-service.ts:42-53` and confirmed `const endLine = Math.max(clampLine(error.editorEndLine), startLine);` is present and unchanged from the prior run. No source changes were needed in this run.

### IN-01: `parseProgramRequest`'s error-data generic is inconsistent with the file's other `RequestType`s

**File:** `bbj-vscode/src/language/java-interop.ts:1319`
**Commit:** b02ffbb0
**Applied fix:** Every other `RequestType` in `java-interop.ts` (`loadClasspathRequest`, `getClassInfoRequest`, `getClassInfosRequest`, `getTopLevelPackages`, `getAllClassNamesRequest`) uses `null` as its third (error-data) type parameter; `parseProgramRequest` used `void` instead, an unexplained deviation from the file's own established convention with no runtime effect. Changed `parseProgramRequest`'s third generic parameter from `void` to `null`:
```ts
const parseProgramRequest = new RequestType<ParseProgramParams, ParseProgramResult, null>('parseProgram');
```
No test changes were required — the change is compile-time only and unused by any caller in this file.

## Skipped Issues

None — all 3 in-scope findings (CR-01, WR-01, IN-01) are fixed.

## Verification

CR-01 and WR-01 were already fixed and committed in a prior run of this workflow (commits 30708d5d and ba0f9853, on top of this branch); this run re-verified both are present in the current source (see "Fixed in this run's source-verification" notes above) before proceeding, and made no further source changes for either.

IN-01 was fixed in this run inside an isolated review-fix worktree (`.claude/worktrees/rf-102-4047679-1790102498`, branch `gsd-reviewfix/102-4047679`), created from and fast-forwarded back onto `gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility`, then removed as part of this run's cleanup. The worktree has no `node_modules` or generated Langium artifacts by design (both are gitignored); both were symlinked in from this main checkout purely to run the verification commands below, then removed before each commit and before the worktree was torn down — no symlinks were staged or committed. The numbers below are reproducible from this main checkout after the fast-forward, since only a source file changed (`git log` on this branch shows the three fix commits, most recent `b02ffbb0`).

- `npx tsc --noEmit -p bbj-vscode` (run against the worktree with `java-interop.ts`'s `void` -> `null` change applied): **no errors** — confirms the type change is compile-clean and did not surface any downstream type mismatch (no caller in this file passes `parseProgramRequest` through the `sendRequestSafe<P, R>(request: RequestType<P, R, null>, ...)` helper that already expects a `null` third parameter; `parseProgramRequest` is dispatched directly via `connection.sendRequest`).
- `cd bbj-vscode && npx vitest run test/bbj-parser-service.test.ts test/functional/parse-program-live.test.ts` (run against the worktree with the IN-01 fix applied): **2 files, 30 tests, all passed.** `parse-program-live.test.ts` requires a live BBj/java-interop endpoint on `:5008` for its `RUN_BBJ_TESTS=1` cases; those cases run under Vitest's own skip/guard when the endpoint is unreachable in this environment, and no test failed or reported the endpoint as reachable — reported faithfully as run, not independently confirmed against a live BBj instance.
- Each new regression test from the prior run (CR-01, WR-01) was confirmed to fail against its pre-fix source and pass against its fix at the time it was committed (see commits 30708d5d, ba0f9853). IN-01 required no new test — a compile-time-only generic-parameter change with no runtime behavior and no caller-visible effect in this file.

---

_Fixed: 2026-09-22T18:42:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
