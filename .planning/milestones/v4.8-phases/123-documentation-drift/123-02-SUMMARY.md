---
phase: 123-documentation-drift
plan: 02
subsystem: testing
tags: [qa, checklist, enterprise-manager, composers, formatter, workspace-trust, interop, javadoc]

# Dependency graph
requires: []
provides:
  - "QA/FULL-TEST-CHECKLIST.md Enterprise Manager rows test only bbj.em.url plus the login prompt"
  - "QA/FULL-TEST-CHECKLIST.md rows for remembered EM username, web.bbj username rule, expired/undecodable token re-prompt, assign-to validation (VS Code + IntelliJ), formatter Java path, workspace configPath trust gating, interop host/port fallback, and the Java hover Docs link"
  - "QA/SMOKE-TEST-CHECKLIST.md and QA/FULL-TEST-CHECKLIST.md run steps that name the real editor and Project View menus"
affects: [124, "any future QA release-testing phase"]

# Actuals (#2632)
actuals:
  tokens: 5175
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - QA/FULL-TEST-CHECKLIST.md
    - QA/SMOKE-TEST-CHECKLIST.md

key-decisions:
  - "Task 1 was a tracer task; its tracer feedback gate re-ran the automated <verify> checks (auto mode active via workflow.auto_advance) and passed, so expansion into Tasks 2-3 proceeded without a checkpoint"
  - "web.bbj row 5 uses plain placeholder tokens (someuser, bbj-home, programfile.bbj, ...) inside a single backtick-quoted command line rather than angle-bracket placeholders, to avoid any HTML-tag-like text landing outside a code span in a Markdown table cell"
  - "examples/msgbox.bbj replaces the non-existent examples/hello.bbj as the run-command example file, since it already exists in the repo"

requirements-completed: [QA-01, QA-02, QA-03]

coverage:
  - id: D1
    description: "Enterprise Manager rows in the full checklist test bbj.em.url and the login prompt only — no EM host/port/username/password setting is named"
    requirement: "QA-01"
    verification:
      - kind: other
        ref: "grep -cE 'EM host, port|bbj\\.em\\.(host|port|username|password)' QA/FULL-TEST-CHECKLIST.md prints 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "One row per new v4.7 behaviour: remembered EM username, web.bbj username rule, expired/undecodable-token re-prompt, assign-to validation in VS Code and IntelliJ, bbj.formatter.javaPath, workspace configPath under Workspace Trust, invalid interop host/port fallback, Java hover Docs link"
    requirement: "QA-02"
    verification:
      - kind: other
        ref: "grep -cE 'Remembered EM username|web.bbj|EM token expired or invalid|Assign result to|bbj.formatter.javaPath|Restricted Mode|Ignoring invalid|Docs link' QA/FULL-TEST-CHECKLIST.md prints 10 (>=9 required)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Run steps in both checklists name the real menus: direct editor-context 'Run As BBj Program' in both IDEs, and IntelliJ's Project View 'BBj Run' submenu; no nonexistent command or file is named"
    requirement: "QA-03"
    verification:
      - kind: other
        ref: "grep -cE 'Run BBj >|Run with Debug|examples/hello\\.bbj' on both checklists prints 0 for each; grep -c 'Run As BBj Program' on the smoke checklist prints 2; grep -c 'BBj Run' prints >=1 in each checklist"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 02: QA Checklist Drift Summary

**Rewrote the Enterprise Manager, composer, formatter, workspace-trust, interop and run-menu rows in both QA checklists to match the shipped v4.7 code, quoting prompt and message text straight from `em-auth.ts`, `BbjEMLoginAction.java`, `BbjRunActionBase.java`, `formatter-java-resolver.ts`, `config-path-trust.ts` and `interop-config.ts`.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-30T09:26Z (following 123-01)
- **Completed:** 2026-09-30T09:31Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Enterprise Manager Integration rows now test only the `bbj.em.url` (VS Code) / "EM URL" (IntelliJ) setting and the token-based login prompt — no removed host/port/username/password setting is named anywhere in the checklist
- Added one row each for: remembered EM username (both IDEs), running `web.bbj` by hand with the built-in `admin`/`admin123` default password rule, and the expired/invalid/undecodable-token re-login flow with the exact prompt text from both codebases
- Added assign-to validation rows for the MSGBOX and CVS() composers in both the VS Code and IntelliJ LSP Features sections, quoting the exact validation messages and default pre-fills (`ret!` / `s$`) from `validateAssignTo`
- Added rows for `bbj.formatter.javaPath` resolution, the workspace-scoped `bbj.configPath` Workspace Trust gate, the invalid interop host/port fallback (plus IntelliJ's silent empty-Host-to-localhost substitution), and the Java hover trailing "Docs" link
- Rewrote every run-command row in both checklists to name the real menus: "Run As BBj Program" sits directly in each IDE's editor context menu; only IntelliJ's Project View adds a "BBj Run" submenu; the nonexistent "Run with Debug" command and `examples/hello.bbj` are gone, replaced by a `bbj.debug` launch-log row and `examples/msgbox.bbj`

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Enterprise Manager rows test bbj.em.url and the login prompt only** - `bfdbd656` (docs)
2. **Task 2: One row per new behaviour** - `389e76fc` (docs)
3. **Task 3: Run steps match the real editor and Project View menus** - `84ec93f2` (docs)

_Task 1 was a `type="tracer"` task. Its tracer feedback gate re-ran the plan's automated `<verify>` checks (auto mode active, `workflow.auto_advance: true`) before Task 2 began; both checks passed, so execution proceeded straight to expansion with no checkpoint._

## Files Created/Modified
- `QA/FULL-TEST-CHECKLIST.md` - Enterprise Manager, VS Code LSP Features, IntelliJ LSP Features, and both Run Commands sections rewritten/extended
- `QA/SMOKE-TEST-CHECKLIST.md` - Run Program rows 7-8 rewritten to name the real menus

## Decisions Made
- Kept the web.bbj terminal-command row's placeholders as plain lowercase tokens (`someuser`, `bbj-home`, `programfile.bbj`, etc.) inside one backtick code span rather than `<placeholder>` angle brackets, so nothing outside a code span could be mistaken for an HTML tag in the rendered table
- Used `examples/msgbox.bbj` (confirmed present in the repo) everywhere the old rows named the nonexistent `examples/hello.bbj`

## Deviations from Plan

None - plan executed exactly as written. All automated `<verify>` and `<acceptance_criteria>` checks in Tasks 1-3 passed on the first attempt; no auto-fixes, blockers, or architectural questions arose.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `QA/FULL-TEST-CHECKLIST.md` and `QA/SMOKE-TEST-CHECKLIST.md` are ready for the next real QA pass; no remaining row names a removed setting, a nonexistent command, or a nonexistent example file
- QA-01, QA-02 and QA-03 are complete; no blockers for the remaining plans in Phase 123

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*

## Self-Check: PASSED

- FOUND: QA/FULL-TEST-CHECKLIST.md
- FOUND: QA/SMOKE-TEST-CHECKLIST.md
- FOUND: .planning/phases/123-documentation-drift/123-02-SUMMARY.md
- FOUND commit bfdbd656 (task 1)
- FOUND commit 389e76fc (task 2)
- FOUND commit 84ec93f2 (task 3)
- FOUND commit dbe986f5 (SUMMARY metadata commit)
- Re-ran all automated `<verify>` and `<acceptance_criteria>` checks from Tasks 1-3: all pass
- Plan-level verification: `git diff --name-only 8b53253d` lists only files inside this plan's `files_modified` plus `.planning/` and 123-01's already-committed files
