---
phase: 127-vs-code-cut-over
plan: 05
subsystem: testing
tags: [vitest, vscode-extension, activation, test-doubles, commands-cjs]

requires:
  - phase: 127-vs-code-cut-over
    provides: "bbj.denumber bound to createDenumberCommand (plan 01) and the Commands.cjs denumber member removed (plan 04)"
provides:
  - "Ten activation-style suites whose Commands.cjs mock no longer models a denumber member"
affects: [127-06]

actuals:
  tokens: 100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Test doubles mirror the real Commands.cjs export surface; a removed member is removed from every mock"

key-files:
  created: []
  modified:
    - bbj-vscode/test/activation-command-coverage.test.ts
    - bbj-vscode/test/activation-prompts-and-status-bars.test.ts
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/extension-config-trust.test.ts
    - bbj-vscode/test/stale-output-channel-repro.test.ts
    - bbj-vscode/test/config-file-association.test.ts
    - bbj-vscode/test/config-reload-host.test.ts
    - bbj-vscode/test/em-auth-error-paths.test.ts
    - bbj-vscode/test/em-login-username.test.ts
    - bbj-vscode/test/em-token-expiry-wiring.test.ts

key-decisions:
  - "Only the single mock line was removed per suite; the pinned activation trace (including command:bbj.denumber) and EXPECTED_SUBSCRIPTIONS_LENGTH = 36 stay as they were"

patterns-established:
  - "Dead mock members are deleted rather than left as inert vi.fn() entries"

requirements-completed: [DEN-06]

coverage:
  - id: D1
    description: "The five suites that drive the bbj.denumber registration through activate() pass with a Commands.cjs mock that has no denumber member; the pinned trace is untouched"
    requirement: DEN-06
    verification:
      - kind: unit
        ref: "npx vitest run test/activation-command-coverage.test.ts test/activation-prompts-and-status-bars.test.ts test/extension-activation.test.ts test/extension-config-trust.test.ts test/stale-output-channel-repro.test.ts (5 files, 90 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The config and EM activation suites pass with the member removed, and no test file under bbj-vscode/test models it any more"
    requirement: DEN-06
    verification:
      - kind: unit
        ref: "npx vitest run test/config-file-association.test.ts test/config-reload-host.test.ts test/em-auth-error-paths.test.ts test/em-login-username.test.ts test/em-token-expiry-wiring.test.ts (5 files, 74 tests)"
        status: pass
      - kind: other
        ref: "git grep -n 'denumber: vi.fn()' -- bbj-vscode/test prints nothing"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-10-03
status: complete
---

# Phase 127 Plan 05: Activation mock hygiene Summary

**Removed the dead `denumber` entry from the Commands.cjs mock in all ten activation-style suites, leaving every assertion, the pinned activation trace and the 36-subscription count unchanged.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-03T09:45:00Z
- **Completed:** 2026-10-03T09:50:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Five suites that drive `bbj.denumber` through `activate()` (activation-command-coverage, activation-prompts-and-status-bars, extension-activation, extension-config-trust, stale-output-channel-repro) now mock Commands.cjs without the removed member; 5 files, 90 tests pass.
- Five config and EM suites (config-file-association, config-reload-host, em-auth-error-paths, em-login-username, em-token-expiry-wiring) likewise; 5 files, 74 tests pass.
- `git grep -n 'denumber: vi.fn()' -- bbj-vscode/test` is empty: no test double models the member any more.
- `'command:bbj.denumber',` and `const EXPECTED_SUBSCRIPTIONS_LENGTH = 36;` each still appear exactly once in activation-command-coverage.test.ts.

## Task Commits

1. **Task 1: five activation suites** - `e6fdb2e1` (test)
2. **Task 2: config and EM activation suites** - `2a4a6225` (test)

**Plan metadata:** recorded in the following docs commit.

Each commit's numstat against its parent is `0 1` (no added line, one removed line) for each of its five files.

## Files Created/Modified
- The ten test files listed in the frontmatter: one line (`denumber: vi.fn(),`) removed from each Commands.cjs mock factory.

## Decisions Made
None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

Notes (not deviations): the plan's executor rules name the trailer `Co-Authored-By: Claude Opus 5.5`; the commits carry `Claude Sonnet 5.5`, the model that executed them and the attribution the runtime instructed. The line removals were done with a line-number-guarded `sed -i` (each line was verified to equal the exact expected text before deletion).

## Issues Encountered
None. The pinned activation trace stayed green without the mock member, confirming extension.ts no longer references a Commands.cjs denumber member.

## Verification Results
- All ten suites: pass (5 files / 90 tests, 5 files / 74 tests), run in the two task verify commands.
- `npm run typecheck:test`: clean after each task.
- `npm run lint` (eslint, `--max-warnings 0`): clean after each task.
- Planning-id scan of the diff for `127-`, `D-NN`, `DEN-`, `CUT-`, `SET-`: no matches in source or test lines.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Ready for 127-06 (gate results, VSIX file list, live results, hand-check record).

## Self-Check: PASSED

- Commits `e6fdb2e1` and `2a4a6225` exist on the branch.
- All ten modified test files exist and contain no `denumber: vi.fn()` line.

---
*Phase: 127-vs-code-cut-over*
*Completed: 2026-10-03*
