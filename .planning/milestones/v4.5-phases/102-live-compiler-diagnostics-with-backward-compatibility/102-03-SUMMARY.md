---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
plan: 03
subsystem: language-server
tags: [vitest, real-interop, documentation, docusaurus, compiler-diagnostics]

# Dependency graph
requires:
  - phase: 102-01
    provides: "BBjParserService, parseProgram() on JavaInteropService, and setConnectionConfig used to reach the live endpoint"
  - phase: 102-02
    provides: "The exported parseErrorToRange converter and the four PSRV-05 fixture texts this plan sends to the real endpoint verbatim"
provides:
  - "A RUN_BBJ_TESTS-gated confirmation that the coordinate convention the hermetic fixture suite encodes matches the real, deployed bbj-ls endpoint for all four PSRV-05 document shapes plus a clean-program control"
  - "Both published guides (VS Code and IntelliJ) stating that live compiler diagnostics need BBj 26.03 or later, while BBj 25.00 stays the base prerequisite"
affects: [103-diagnostic-reconciliation, 104-conformance-measurement]

# Actuals (#2632)
actuals:
  tokens: 2782
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gated live-interop confirmation test mirrors the existing issue447-real-interop.test.ts shape exactly: async describe -> shouldRunBBjTests() -> beforeAll(120000) with an early return on a closed gate -> test.runIf(run)(..., 60000)"
    - "Live test fixtures are copied verbatim from the hermetic converter suite rather than re-derived, so the two suites cannot silently drift apart"

key-files:
  created:
    - bbj-vscode/test/functional/parse-program-live.test.ts
  modified:
    - documentation/docs/vscode/getting-started.md
    - documentation/docs/vscode/index.md
    - documentation/docs/vscode/features.md
    - documentation/docs/intellij/getting-started.md
    - documentation/docs/intellij/index.md
    - documentation/docs/intellij/features.md

key-decisions:
  - "The live test asserts converted range shape (start line, END_OF_LINE_CHARACTER sentinel) through the same exported parseErrorToRange converter the hermetic suite uses, never the raw endCharacter value BBj reports — per the plan's own instruction, since that value was measured exceeding the anchor line's true length in three of four live-probed cases"
  - "Every fixture and canonicalName is invented text under the OS temp directory; no corpus file, no .bbj file under test/test-data/, and no BBj source text of any kind enters this test"
  - "The documentation additions are exactly a one-line prerequisite plus a short features paragraph in both guides, per D-13 — no new configuration-page section, no new setting, no new IDE surface"

requirements-completed: [PSRV-05, PSRV-09]

coverage:
  - id: D1
    description: "The coordinate convention the hand-written fixtures encode is confirmed once against the real endpoint: the same four invented documents sent to the running BBjServices produce converted editor ranges on the expected lines"
    requirement: PSRV-05
    verification:
      - kind: integration
        ref: "test/functional/parse-program-live.test.ts (RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts — 5 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The live confirmation test is skipped, not failed, when the gate is closed, so the default suite and CI stay hermetic"
    verification:
      - kind: integration
        ref: "RUN_BBJ_TESTS=0 npx vitest run test/functional/parse-program-live.test.ts — 5 skipped, 0 failed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both published guides state that live compiler diagnostics need BBj 26.03 or later, keep BBj 25.00 as the base prerequisite, and describe the feature, its trigger setting and its older-BBj behaviour"
    requirement: PSRV-09
    verification:
      - kind: other
        ref: "grep -c '26\\.03' over all six documentation pages — every line non-zero; grep -c 'BBj** version 25.00 or higher installed' getting-started.md pages — unchanged at 1; grep -c 'bbj.compiler.trigger' both features.md pages — non-zero"
        status: pass
    human_judgment: false
  - id: D4
    description: "No IntelliJ plugin source changed to make the documentation true"
    verification:
      - kind: other
        ref: "git status --short -- bbj-intellij — empty"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-22
status: complete
---

# Phase 102 Plan 03: Live Endpoint Confirmation And Documentation Summary

**A `RUN_BBJ_TESTS`-gated test sends the four PSRV-05 fixture documents plus a clean-program control straight to the real, deployed `bbj-ls` endpoint via `JavaInteropService.parseProgram()` and confirms every converted range against the exported `parseErrorToRange` converter, and both published guides now state that live compiler diagnostics need BBj 26.03 or later.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-22T15:05:00Z
- **Completed:** 2026-09-22T15:13:59Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `bbj-vscode/test/functional/parse-program-live.test.ts`: a new gated confirmation suite, structurally identical to the existing `issue447-real-interop.test.ts` (async `describe` → `shouldRunBBjTests()` → `beforeAll` with a 120s timeout that returns immediately on a closed gate → `test.runIf(run)` at 60s each). Five tests: the colon-continuation, user-line-number, CRLF, and no-trailing-newline PSRV-05 fixtures (copied verbatim from `test/parser-coordinate-converter.test.ts`) each sent to the real endpoint and converted through the exported `parseErrorToRange`, plus a clean two-line program asserting an empty `errors` array as the negative control.
- Run and confirmed twice against the actual environment: `RUN_BBJ_TESTS=1` → 5 passed against the real, deployed jar; `RUN_BBJ_TESTS=0` → 5 skipped, 0 failed, no socket opened.
- `documentation/docs/vscode/{getting-started,index,features}.md` and the parallel `documentation/docs/intellij/{getting-started,index,features}.md`: a one-line BBj 26.03 prerequisite added beneath the unchanged BBj 25.00 base bullet in both `getting-started.md`/`index.md` pairs, and a short `### Live Compiler Diagnostics` subsection added to both `features.md` pages next to `## Validation and Diagnostics` (ahead of IntelliJ's unrelated `## Java Interop` section) — what the feature does, that it follows the existing `bbj.compiler.trigger` setting, and that an older BBj (or a stopped BBjServices) simply keeps the save-time compiler check. No new configuration-page section, setting, or IDE surface documented.

## Task Commits

Each task was committed atomically:

1. **Task 1: The real parser confirms the convention once** - `d776d7bb` (test)
2. **Task 2: The VS Code guide states the version the feature needs** - `f60d6d9b` (docs)
3. **Task 3: The IntelliJ guide says the same thing** - `ae993a59` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-vscode/test/functional/parse-program-live.test.ts` - New gated live-interop confirmation test (5 tests: 4 PSRV-05 shapes + clean-program control)
- `documentation/docs/vscode/getting-started.md` - Prerequisites: added BBj 26.03 bullet beneath the unchanged BBj 25.00 bullet
- `documentation/docs/vscode/index.md` - Requirements: same one-liner in this list's terser voice
- `documentation/docs/vscode/features.md` - New `### Live Compiler Diagnostics` subsection beside `## Validation and Diagnostics`
- `documentation/docs/intellij/getting-started.md` - Same Prerequisites addition as the VS Code guide
- `documentation/docs/intellij/index.md` - Same Requirements addition
- `documentation/docs/intellij/features.md` - Same subsection, placed ahead of the unrelated `## Java Interop` section

## Decisions Made

- The live test never asserts BBj's raw reported `endCharacter`, only that the converted range's end character equals the `END_OF_LINE_CHARACTER` sentinel — matches the plan's explicit instruction, since the raw value was measured exceeding the anchor line's true length in three of four cases during research and would make the test green against one BBj build and red against the next.
- `canonicalName` for every live request is a non-null path under the OS temp directory ending in `.bbj`, never null, per the plan's D-16 note that the deployed jar is the reviewed build and must not be relied on to tolerate a null there.
- Fixture programs and the clean-program control are invented, minimal BBj text — the clean-program fixture (`rem clean program\nprint "ok"\n`) matches the exact text the phase's own research-session live probe already confirmed returns an empty `errors` array, so the negative control is grounded in a previously observed real-endpoint result, not merely assumed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. One clarifying note for future readers: the plan's own `<verification>` describes running `npx vitest run test/functional/parse-program-live.test.ts` with no `RUN_BBJ_TESTS` set and expecting "five skipped ... and the port is unreachable." In this execution environment the port (127.0.0.1:5008) *is* reachable (BBjServices is running for the live-endpoint task), so `shouldRunBBjTests()`'s unset-variable fallback (`isPortOpen(5008)`) resolves to `true` and the suite runs live rather than skipping — this is `shouldRunBBjTests()`'s documented, correct behavior (`test-helper.ts`), not a defect. The task's own `<verify>` block sidesteps this by testing the two forced states explicitly (`RUN_BBJ_TESTS=1` and `RUN_BBJ_TESTS=0`), and both were confirmed to pass exactly as required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The coordinate convention is now confirmed against the real endpoint for every PSRV-05 shape, and both extensions' published guides state the BBj 26.03 requirement. Phase 102's client-side scope (PSRV-03, -04, -05, -08, -09) is complete across all three plans.
- No blockers. Phase 103 (diagnostic reconciliation) and Phase 104 (conformance measurement) can proceed once the phase closes.
- The BASIS GitLab merge request for `bbj-ls` `feat/689-parse-program-endpoint` is still pending by hand (carried from Phase 101, tracked in STATE.md); this plan's live test ran successfully against the already-deployed jar regardless of that MR's merge status.

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 3 task commit hashes (`d776d7bb`,
`f60d6d9b`, `ae993a59`) verified present in `git log --oneline -5`. The plan-level `<verification>`
commands were re-run after the third task commit: `RUN_BBJ_TESTS=1 npx vitest run
test/functional/parse-program-live.test.ts` (5 passed), `RUN_BBJ_TESTS=0 npx vitest run
test/functional/parse-program-live.test.ts` (5 skipped, 0 failed), `grep -c '26\.03'` over all six
documentation pages (every count 1), and `git status --short -- bbj-intellij` (empty).

---
*Phase: 102-live-compiler-diagnostics-with-backward-compatibility*
*Completed: 2026-09-22*
