---
phase: 260914-l1o-fix-663-run-and-call-file-targets-hover-
plan: 01
subsystem: language-server
tags: [definition-provider, hover, validation, run-call, langium]
status: complete
dependency-graph:
  requires: []
  provides:
    - "run-call-target.ts: shared RUN/CALL static-target extraction and candidate resolution"
    - "getDefinition override for RUN/CALL file literals"
    - "RUN/CALL hover branch"
  affects:
    - bbj-vscode/src/language/bbj-validator.ts (checkRunCallFileResolves refactored onto the shared resolver)
tech-stack:
  added: []
  patterns:
    - "Single shared resolver module (run-call-target.ts) consumed by validator, hover, and definition provider so RUN/CALL candidate-path logic exists exactly once"
key-files:
  created:
    - bbj-vscode/src/language/run-call-target.ts
    - bbj-vscode/test/run-call-navigation.test.ts
  modified:
    - bbj-vscode/src/language/bbj-definition-provider.ts
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/src/language/bbj-validator.ts
    - documentation/docs/vscode/features.md
    - documentation/docs/intellij/features.md
decisions:
  - "Wrote the whole run-call-target.ts module (including runCallHoverMarkdown/codeSpan, nominally Task 3's output) during Task 1's GREEN step, since those are pure functions with no dependency on Task 3's hover-wiring work. See Deviations."
metrics:
  duration: "~35 min"
  completed: 2026-09-14
actuals:
  tokens: 8830
  tasks: 3
  commits: 3
---

# Phase 260914-l1o Plan 01: Fix #663 RUN and CALL file targets hover and go-to-definition Summary

One-liner: RUN/CALL file literals now resolve to a LocationLink (Ctrl/Cmd-Click) and hover markdown through one shared resolver, `run-call-target.ts`, also used to refactor the #173 unresolved-file warning without changing its behavior.

## What was built

- **`bbj-vscode/src/language/run-call-target.ts`** (new): `getStaticRunCallTarget` extracts the program path from a RUN/CALL `fileid` string literal (HEX_STRING and dynamic expressions excluded, `::label` stripped and trimmed). `findRunCallTargetAtLeaf` maps a CST leaf to that target only when the leaf's `$containerProperty` is `fileid` (excludes CALL argument literals). `RunCallResolutionContext` bundles `LangiumDocuments`, `FileSystemProvider`, and `BBjWorkspaceManager`. `hasRunCallProjectContext` gates on workspace folders or non-empty PREFIX entries. `resolveRunCallPath` walks the candidate list (current-file directory, each workspace root, each PREFIX) and adds a drive-letter branch (`C:\...` or `C:/...` resolves to itself via `URI.file` with backslashes normalized to forward slashes) — POSIX absolute paths already resolve as themselves through the first candidate. `runCallHoverMarkdown` renders "Program file: `<fsPath>`" (resolved) or "Program file `<path>` could not be resolved" (unresolved), using a private `codeSpan` helper whose backtick fence is always one longer than the longest backtick run in the text, so a path containing backticks can't escape the span.
- **`bbj-vscode/src/language/bbj-definition-provider.ts`**: added `override getDefinition`, which finds the leaf at the cursor, resolves a RUN/CALL target via the shared module, and returns a `LocationLink` to line 0 character 0 of the resolved program file (origin range = the literal's CST range) — or `undefined` when the target is unresolvable. Falls through to `super.getDefinition` for everything else, so the existing USE-statement `collectLocationLinks` override is untouched.
- **`bbj-vscode/src/language/bbj-hover.ts`**: added a hover branch — after the SETOPTS branch, before the declaration-resolution path — that calls `findRunCallTargetAtLeaf` and, when it matches, returns `runCallHoverMarkdown` directly. Not gated on `typeResolutionWarningsEnabled` or project context (hover is a navigation aid, not a diagnostic).
- **`bbj-vscode/src/language/bbj-validator.ts`**: `checkRunCallFileResolves` now delegates to `getStaticRunCallTarget`, `hasRunCallProjectContext`, and `resolveRunCallPath`; the inline label-stripping and candidate-list construction were deleted. Warning severity, message wording (`File '<path>' could not be resolved in the project directory or any PREFIX.`), and node/property target are unchanged. Removed the now-unused `isStringLiteral` import (still used elsewhere: `URI`, `UriUtils`, `resolve`, `AstUtils`, all still needed by `checkUsedClassExists`, which was not touched).
- **`bbj-vscode/test/run-call-navigation.test.ts`** (new): three describe blocks — `RUN/CALL file target navigation (#663)` (project-context, definition + hover), `RUN/CALL navigation without project context or warnings (#663)` — covering go-to-definition and hover for: plain relative RUN target, CALL with `::label`, absolute POSIX target, Windows drive-letter target (both slash forms handled by the same regex), unresolvable target (no link), dynamic concatenation target (no link/no hover), CALL argument literal (no link), a path containing a backtick (hover code-span escaping), and navigation with no workspace/PREFIX and type-resolution warnings disabled.
- **Docs**: `documentation/docs/vscode/features.md` and `documentation/docs/intellij/features.md` each gained one bullet for RUN/CALL go-to-definition and hover, under the existing "Go to Definition" section.

## Deviations from Plan

### Auto-fixed Issues

None — no bugs or blocking issues were hit.

### Implementation-order note (not a Rule 1-4 deviation)

Task 1's GREEN step wrote the entire `run-call-target.ts` module in one pass, including `runCallHoverMarkdown` and its private `codeSpan` helper — functions the plan assigns to Task 3's GREEN step. These are pure, dependency-free functions, so writing them alongside the rest of the module was lower-risk than splitting the file across two commits. Effect: Task 3's commit (`2bb43ae3`) contains 4 changed files (`bbj-hover.ts`, `run-call-navigation.test.ts`, the two docs pages) rather than the 5 files named in the plan's `must_haves.artifacts` / done-criteria for Task 3 (`run-call-target.ts` has no diff in that commit since its content was already committed in Task 1). All functional done-criteria for every task — targeted test counts, `tsc`/`eslint` exit codes, the `grep` counts in Task 2's done section, and the hygiene-check grep across all three commits — pass as specified. No plan requirement, truth, or artifact `contains` string was weakened; only which commit's diff happens to touch `run-call-target.ts` shifted.

## Known Stubs

None.

## Threat Flags

None beyond the plan's own threat model (T-663-01..04), which was implemented as specified: `codeSpan`'s backtick-fence widening (T-663-01, mitigate) is covered by the backtick test; the other three threats were accepted at planning time with no new surface introduced.

## Verification

- `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test -- test/run-call-navigation.test.ts test/run-call-file-resolution.test.ts test/definition.test.ts test/hover.test.ts`: 4 files, 42 tests, 0 failed
- `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx tsc --noEmit`: exit 0
- `npx eslint` on all five changed source files and the new test file: exit 0 (no output)
- Whole suite (`npx vitest run --maxWorkers=2`): 2 failed test files / 12 failed tests, all matching the documented local drift (linking.test.ts interop ×11, issue447 capability test ×1) — 105 passed files, 1902 passed tests, 6 skipped
- `run-call-file-resolution.test.ts`: `git diff 6f19afa5 HEAD -- bbj-vscode/test/run-call-file-resolution.test.ts` is empty (byte-identical)
- Hygiene check: `git diff 6f19afa5 HEAD -- bbj-vscode/src bbj-vscode/test | grep -n -E '260914|l1o-|\bD-[0-9]{2}\b|T-663-'` prints nothing

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/run-call-target.ts
- FOUND: bbj-vscode/test/run-call-navigation.test.ts
- FOUND: bbj-vscode/src/language/bbj-definition-provider.ts (modified)
- FOUND: bbj-vscode/src/language/bbj-hover.ts (modified)
- FOUND: bbj-vscode/src/language/bbj-validator.ts (modified)
- FOUND: documentation/docs/vscode/features.md (modified)
- FOUND: documentation/docs/intellij/features.md (modified)
- FOUND commit f695aec4989cda6ca4521766670a6cdae5c4a7d0
- FOUND commit 0e64846d5494a36ab7ffd5b7ecb729963a2a6cc1
- FOUND commit 2bb43ae33e046f09af9b9fce17e7a7ba31cfb519
