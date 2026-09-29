---
phase: 111-java-class-data-from-the-interop-peer
plan: 06
subsystem: java-interop
tags: [langium, java-interop, hover, security-hardening, vitest]

requires:
  - phase: 111-java-class-data-from-the-interop-peer
    provides: "111-01's java-peer-guard.ts bounds and sanitizeJavaClassDto; 111-03's escapeMarkdown/toMethodDocToMethodData hover render path"
provides:
  - "method.parameters ??= [] and constructor.parameters ??= [] in resolveClass Phase 1, closing the absent-parameters crash"
  - "boundedJavadocName in bbj-hover.ts bounding the javadoc-file MethodDoc fallback's method and parameter names"
affects: [111-VERIFICATION.md re-verification, phase 111 closeout]

actuals:
  tokens: 34000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Phase 1 member-loop defaulting (javaClass.fields ??= [] precedent) extended to method.parameters/constructor.parameters"
    - "boundedJavadocName: truncate-if-string, else fall back to an already-bounded name, mirroring the interop path's realName bound"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/test/java-interop-peer-guard.test.ts
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/test/javadoc-markdown-escape.test.ts

key-decisions:
  - "Defaulted parameters inside the existing Phase 1 method/constructor loops rather than a separate pass, matching the fields/methods ??= [] precedent already there"
  - "boundedJavadocName lives beside toMethodDocToMethodData and is reused for both the method name and every parameter name, so both call sites share one bound"

requirements-completed: []

coverage:
  - id: D1
    description: "A method or constructor entry from the peer with an absent parameters key no longer crashes Phase 2; the class resolves fully and later members still get their types"
    requirement: "SEC-03"
    verification:
      - kind: integration
        ref: "test/java-interop-peer-guard.test.ts#a method entry with no parameters key gets parameters [], and the method after it still gets its return type and parameter types"
        status: pass
      - kind: integration
        ref: "test/java-interop-peer-guard.test.ts#a constructor entry with no parameters key gets parameters [], the constructor after it still resolves, and an over-long constructor entry is dropped"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hover's javadoc-file MethodDoc fallback bounds the method name and every parameter name it renders, falling back to the node's own name when a value is not text"
    requirement: "SEC-04"
    verification:
      - kind: integration
        ref: "test/javadoc-markdown-escape.test.ts#the javadoc-file method fallback bounds an oversized method name and parameter name in the hover signature"
        status: pass
      - kind: integration
        ref: "test/javadoc-markdown-escape.test.ts#a javadoc-file method entry whose names are not strings falls back to the method's own name, and hover still renders"
        status: pass
    human_judgment: false

duration: 27min
completed: 2026-09-26
status: complete
---

# Phase 111 Plan 06: Two Gap-Closure Fixes for the Absent-Parameters Crash and the Unbounded Hover Fallback Name Summary

**`method.parameters ??= []` / `constructor.parameters ??= []` in `resolveClass` Phase 1 stop the Phase 2 TypeError on an absent parameters key, and a new `boundedJavadocName` helper truncates the method/parameter names hover's javadoc-file fallback renders.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-09-26T18:51:00Z
- **Completed:** 2026-09-26T19:18:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- A peer method or constructor entry whose `parameters` key is entirely absent (not present-but-wrong-type) survives `resolveClass()` Phase 2 instead of throwing a `TypeError` that was silently swallowed by the catch-all `console.error`, which previously left every subsequent method/constructor in that class without `resolvedReturnType`, `docu` or linked parameters.
- Hover's javadoc-file `MethodDoc` fallback (installed `.json` javadoc files, distinct from the live interop-peer path) now bounds both the method name and every parameter name it copies into the bold signature header at `MAX_JAVA_IDENTIFIER_LENGTH`, closing the one D-02 path that was still unbounded. A non-string name falls back to the node's own (already bounded) name instead of rendering a wrong-typed value or throwing.
- Both `111-VERIFICATION.md` gaps (CR-02/SEC-03 crash, CR-01/SEC-04-adjacent D-02 hover bound) are closed and pinned by four new regression tests through the real `resolveClass()` pipeline and the real hover provider.

## Task Commits

Each task was committed atomically:

1. **Task 1: A method or constructor entry with no parameters key resolves fully through the real resolveClass(), end to end** - `d1ef6a27` (fix, includes RED test additions)
2. **Task 2: Hover's javadoc-file MethodDoc fallback bounds the method and parameter names it renders** - `2c0c169f` (fix, includes RED test additions)

_Note: Task 1 is `type="tracer"`; Task 2 is `tdd="true"`. Both follow red-then-fix within the single commit per this plan's structure — the red run was executed and observed to fail (recorded below) before the source edit, then the same commit captures the passing state, matching the plan's own task-level commit granularity (one commit per task, not a separate test/feat split)._

**Plan metadata:** committed together with this SUMMARY (see below).

## Files Created/Modified
- `bbj-vscode/src/language/java-interop.ts` - Added `method.parameters ??= [];` and `constructor.parameters ??= [];` as the last statement of each Phase 1 member loop, with a short comment explaining why (an entry may omit its parameter list entirely; Phase 2 iterates it).
- `bbj-vscode/test/java-interop-peer-guard.test.ts` - Added a new describe block "a method or constructor entry with no parameters key still resolves fully" with two end-to-end tests through `CountingJavaInteropService`/`resolveClassByName`, one for a bare method entry and one for a bare constructor entry (which also proves an over-long sibling constructor is still dropped).
- `bbj-vscode/src/language/bbj-hover.ts` - Added `boundedJavadocName(value, fallback)` (truncates a string at `MAX_JAVA_IDENTIFIER_LENGTH`, else returns `fallback`) and wired it into `toMethodDocToMethodData` for `methodDoc.name` and each `params[i].name`. Imported `MAX_JAVA_IDENTIFIER_LENGTH` from `java-peer-guard.js`.
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` - Added two tests inside the existing "Hover's javadoc-file fallback is bounded and escaped..." describe: one with a 5,000-character method name and parameter name (asserts the rendered value is bounded and still contains the true javadoc text), one with non-string names (asserts the fallback to the real method name and no wrong-typed value rendered). Extended the `java-peer-guard.js` import with `MAX_JAVA_IDENTIFIER_LENGTH`/`TRUNCATION_MARKER` and the `java-javadoc.js` import with `type MethodDoc`.

## Decisions Made
- Defaulted `parameters` inside the existing Phase 1 method/constructor loops (as the last statement of each loop), rather than a separate pass over `javaClass.methods`/`javaClass.constructors` — this mirrors the existing `javaClass.fields ??= []` / `javaClass.methods ??= []` precedent immediately above and keeps all Phase 1 member defaulting in one place.
- `boundedJavadocName` is a single shared helper for both the method name and every parameter name in `toMethodDocToMethodData`, rather than two separate inline truncations, so both call sites can never drift out of sync on the bound or the fallback behavior.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' red-phase test failures matched the plan's own predicted failure messages exactly ("expected undefined to deeply equal []" for Task 1; the 1,024-'m'/'HashMap.put' assertions for Task 2), confirming the plan's pre-measured probe results.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Verification Evidence

- Task 1 red run (before the source edit): both new `java-interop-peer-guard.test.ts` tests failed with `AssertionError: expected undefined to deeply equal []` at the `bare.parameters`/`resolved.constructors[0].parameters` assertions — matching the plan's predicted failure exactly.
- Task 1 green run: `test/java-interop-peer-guard.test.ts` reports `30 passed (30)`; combined with `test/java-interop-nested-class-names.test.ts`, `test/java-interop-service.test.ts`, `test/inlay-hints-javadoc.test.ts`: `67 passed (67)`.
- Task 2 red run (before the source edit): the oversized-name test failed on the 1,024-consecutive-'m' check (hover value was 10,043+ characters); the non-string-name test failed because the value contained `HashMap.42` instead of `HashMap.put` — matching the plan's predicted failure exactly.
- Task 2 green run: `test/javadoc-markdown-escape.test.ts` reports `22 passed (22)`; combined with `test/hover.test.ts`: `39 passed (39)`.
- `npx tsc -p tsconfig.json` exits 0 with no output after each task's fix.
- Plan-level combined run: `npx vitest run test/java-interop-peer-guard.test.ts test/javadoc-markdown-escape.test.ts` reports `Tests  52 passed (52)` (48 pre-existing + 4 new), matching the plan's `<verification>` exactly.
- No planning identifiers in the plan's source/test diff: `git diff 25ea70bd HEAD -- bbj-vscode/src bbj-vscode/test | grep -E '^\+' | grep -E '...'` exits 1 (no match).
- `git diff --quiet 25ea70bd HEAD -- bbj-vscode/src/language/java-peer-guard.ts bbj-intellij java-interop` exits 0 — none of these were touched.
- Whole-suite run twice with `npx vitest run --maxWorkers=2`: both runs report exactly `Tests  11 failed`, and every named failure is `test/linking.test.ts > Linking Tests > Interop related tests > ...` — the known local BBjServices-on-:5008 drift, identical in name and count to the documented baseline (11). Other files intermittently reported as `FAIL` at the suite level across the two runs (`classes.test.ts`, `composer-codelens.test.ts`, `document-builder-rebuild-guard.test.ts`, `functional/installed-extension-e2e.test.ts`, `setopts-code-scanner.test.ts`, `setopts-in-code-request.test.ts`, `variable-scoping.test.ts`, varying between the two runs) contributed 0 to the `Tests failed` count in both runs — consistent with the documented `--maxWorkers=2` beforeAll-hook contention pattern, not a regression from this plan's two-file diff.

## Next Phase Readiness
Both `111-VERIFICATION.md` gaps (the absent-`parameters` Phase 2 crash and hover's unbounded javadoc-file MethodDoc fallback names) are closed and pinned by tests through the real production pipelines. `SEC-03` and `SEC-04` remain "Gaps Found" in `REQUIREMENTS.md`/`ROADMAP.md` per this plan's own instruction — the phase verifier, not this executor, re-verifies and flips them. No blockers for phase 111 re-verification.

---
*Phase: 111-java-class-data-from-the-interop-peer*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `bbj-vscode/src/language/java-interop.ts` — FOUND
- `bbj-vscode/test/java-interop-peer-guard.test.ts` — FOUND
- `bbj-vscode/src/language/bbj-hover.ts` — FOUND
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` — FOUND
- Commit `d1ef6a27` — FOUND in `git log --oneline --all`
- Commit `2c0c169f` — FOUND in `git log --oneline --all`
- All `<acceptance_criteria>` from both tasks re-verified (grep counts, test counts, tsc clean, no planning identifiers) — all PASS, recorded above
- Plan-level `<verification>` commands re-run — all PASS, recorded above
