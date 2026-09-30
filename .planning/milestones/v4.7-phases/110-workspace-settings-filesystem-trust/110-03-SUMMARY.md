---
phase: 110-workspace-settings-filesystem-trust
plan: 03
subsystem: extension-host
tags: [filesystem, security, decompile, symlink, fifo, toctou]

# Dependency graph
requires: []
provides:
  - "statSize exported from decompile-io.ts, using lstat and returning undefined for anything but a regular file"
  - "isTokenizedFile hardened: lstat-first, O_NOFOLLOW|O_NONBLOCK open flags where defined, fstat re-check on the opened handle"
affects: []

# Actuals (#2632)
actuals:
  tokens: 2305
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TOCTOU-safe file probing: lstat -> isFile() check -> open(O_NOFOLLOW|O_NONBLOCK) where defined -> fstat() re-check, applied to both decompile-io.ts probes"

key-files:
  created: []
  modified:
    - bbj-vscode/src/decompile-io.ts
    - bbj-vscode/test/decompile-io.test.ts

key-decisions:
  - "Followed D-16/D-17 exactly as written: lstat first in both probes, explicit typeof number branch for O_NOFOLLOW/O_NONBLOCK rather than relying on bitwise-OR coercion (Windows pitfall), fstat re-check on the opened handle to close the lstat-to-open swap window"

patterns-established:
  - "Neither probe in decompile-io.ts ever calls fs.promises.stat/open on an unverified path again; every entry goes through lstat's isFile() gate first"

requirements-completed: [SEC-08]

coverage:
  - id: D1
    description: "isTokenizedFile refuses to open a symlink, directory or FIFO before opening (lstat-first), requests O_NOFOLLOW/O_NONBLOCK where the platform defines them, and re-checks the opened handle with fstat before reading"
    requirement: SEC-08
    verification:
      - kind: unit
        ref: "test/decompile-io.test.ts#isTokenizedFile > false for a symlink pointing at a real tokenized file"
        status: pass
      - kind: unit
        ref: "test/decompile-io.test.ts#isTokenizedFile > false for a directory"
        status: pass
      - kind: unit
        ref: "test/decompile-io.test.ts#isTokenizedFile > false for a FIFO, returning promptly instead of blocking on open"
        status: pass
      - kind: unit
        ref: "test/decompile-io.test.ts#isTokenizedFile > opens with O_NOFOLLOW and O_NONBLOCK where the platform defines them"
        status: pass
      - kind: unit
        ref: "test/decompile-io.test.ts#isTokenizedFile > reports false and still closes the handle when the opened handle is not a regular file on fstat re-check"
        status: pass
    human_judgment: false
  - id: D2
    description: "statSize (now exported) uses lstat and reports not-a-file (undefined) for a symlink, directory or FIFO, and waitForDecompileOutput never resolves to a symlinked <input>.lst as real output"
    requirement: SEC-08
    verification:
      - kind: unit
        ref: "test/decompile-io.test.ts#statSize > returns undefined for a symlink to a regular file"
        status: pass
      - kind: unit
        ref: "test/decompile-io.test.ts#statSize > returns undefined for a directory"
        status: pass
      - kind: unit
        ref: "test/decompile-io.test.ts#statSize > returns undefined for a FIFO"
        status: pass
      - kind: integration
        ref: "test/decompile-io.test.ts#waitForDecompileOutput > does not resolve to a symlinked .lst pointing at a real listing, and rejects on timeout"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-09-26
status: complete
---

# Phase 110 Plan 03: Decompile Probe Filesystem Trust Summary

**Both decompile-io.ts probes (`isTokenizedFile`, now-exported `statSize`) refuse anything but a regular file via `lstat`, with `isTokenizedFile` additionally opening with `O_NOFOLLOW`/`O_NONBLOCK` where the platform defines them and re-checking the opened handle with `fstat`.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-26T11:45:30Z
- **Completed:** 2026-09-26T11:52:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `isTokenizedFile` now calls `fs.promises.lstat` before ever calling `open`, returning `false` for a symlink, directory, FIFO, socket or device — a FIFO is never opened, so the call returns promptly instead of blocking indefinitely on `open`
- The `open` call requests `O_NOFOLLOW | O_NONBLOCK`, each OR'd in only when `typeof fs.constants.O_NOFOLLOW`/`O_NONBLOCK === 'number'` (both are `undefined` on Windows; an unconditional bitwise-OR would have silently coerced them to `0` there)
- The opened handle is re-checked with `handle.stat().isFile()` before reading, closing the TOCTOU swap window between the `lstat` and the `open`; the handle is still closed via the existing `finally` in every path
- `statSize` is exported and now uses `lstat` with the same `isFile()` gate, so `waitForDecompileOutput`'s `.lst` size-polling loop can never take a symlinked `<input>.lst` as real output
- New test cases: symlink, directory and FIFO cases for both probes (FIFO cases `skipIf(win32)`, 2s timeout so a regression shows as a timeout, not a hang), an `O_NOFOLLOW`/`O_NONBLOCK` flags assertion via `vi.spyOn(fs.promises, 'open')`, an `fstat`-re-check case with a faked handle, and a `waitForDecompileOutput` case proving a symlinked `.lst` is never resolved
- All existing cases still pass unmodified: a regular tokenized file is still detected, plain text and a missing file still report `false`/`undefined`, and every existing `waitForDecompileOutput` case is unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: isTokenizedFile refuses symlinks, directories and FIFOs before opening, end to end** - `d568197a` (feat)
2. **Task 2: statSize reports not-a-file for symlinks, directories and FIFOs** - `26d2ede8` (feat)

## Files Created/Modified
- `bbj-vscode/src/decompile-io.ts` - `isTokenizedFile` hardened (lstat-first, conditional O_NOFOLLOW/O_NONBLOCK, fstat re-check); `statSize` exported and hardened (lstat + isFile gate)
- `bbj-vscode/test/decompile-io.test.ts` - symlink/directory/FIFO/flags/fstat-recheck cases for `isTokenizedFile`; a new `statSize` describe block; a symlinked-`.lst` `waitForDecompileOutput` case

## Decisions Made
- Followed D-16 and D-17 exactly as written in CONTEXT.md — no deviations.
- Used `vi.spyOn(fs.promises, 'open')` with call-through (not a full mock) for the flags assertion, and a one-off `mockResolvedValueOnce` returning a faked handle for the fstat-re-check case, matching the existing `vi.spyOn` convention already used elsewhere in this test suite (`completion-test.test.ts`, `composer-codelens-handler.test.ts`, `bbj-cpl-fallback-dedup.test.ts`).
- Gave the FIFO test cases an explicit 2000ms per-test timeout (third argument to `test(...)`) so that a regression that reintroduces a blocking `open` on a FIFO surfaces as a timeout rather than hanging the whole suite indefinitely.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The whole-suite regression gate (`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`, cwd `bbj-vscode`) reported 4 failed test *files* but 0 failed *tests* (2767 passed, 125 skipped). Three of the four are `beforeAll`/`initializeWorkspace` hook timeouts (`builtin-library-members.test.ts`, `setopts-code-scanner.test.ts`, `validation.test.ts`) — the documented `initializeWorkspace` hook-contention pattern, unrelated to this plan's files (neither `decompile-io.ts` nor its test touches Langium document building). The fourth, `test/functional/installed-extension-e2e.test.ts > installed extension e2e: SETOPTS-in-code (#475)`, is the project's documented pre-existing failure on the phase base (`c591cfe8`) named explicitly in this plan's executor rules; confirmed unrelated since neither of this plan's changed files intersects the SETOPTS/composer code path. This plan's own targeted verification commands (Task 1 and Task 2 `<verify>` blocks) all passed with 0 failures, and both `npx tsc -p tsconfig.json` runs were clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SEC-08 is complete; issue #585 is addressed in code — the closing keyword goes in the milestone PR, not in these commits.
- `decompile-io.ts` and its test file are untouched by any other plan in this phase (disjoint files per the roadmap split), so no coordination is needed with 110-01/02/04/05.
- No blockers for the rest of Phase 110.

---
*Phase: 110-workspace-settings-filesystem-trust*
*Completed: 2026-09-26*

## Self-Check: PASSED
