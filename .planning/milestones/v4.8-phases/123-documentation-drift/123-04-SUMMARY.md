---
phase: 123-documentation-drift
plan: 04
subsystem: docs
tags: [intellij, documentation, docusaurus, em-login, compiler]

requires:
  - phase: 123-documentation-drift
    provides: "DOC-DRIFT-2026-09-30.md drift scan as research input"
provides:
  - "IntelliJ configuration.md documents the BBj Compiler settings section, the automatic EM login/re-prompt flow, the remembered username, and the Host empty-field fallback"
  - "IntelliJ commands.md documents Compile BBj File in its real menus/shortcut and the automatic EM login re-prompt"
  - "IntelliJ features.md Run Commands table uses the real action titles and Alt+C"
affects: [123-documentation-drift]

actuals:
  tokens: 3082
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - documentation/docs/intellij/configuration.md
    - documentation/docs/intellij/commands.md
    - documentation/docs/intellij/features.md

key-decisions:
  - "Host fallback documented as the plugin implements it (empty field -> localhost, substituted client-side before the language server starts), not the drift scan's server-side-validator-warning description — the code and the scan disagreed and the code wins per the plan's own note"
  - "Compile BBj File's Tools-menu entry is cross-referenced from the Tools Menu Commands section rather than duplicated as its own subsection, since the Compile Command section above already documents it fully"

patterns-established: []

requirements-completed: [IJ-01, IJ-02]

coverage:
  - id: D1
    description: "configuration.md gained a BBj Compiler section (Compile output directory, Compiler check) matching the settings page's field order, and the config.bbx Path validation rule"
    requirement: "IJ-02"
    verification:
      - kind: other
        ref: "grep -cE heading check + docs build (documentation/node_modules/docs-build-123-04.log)"
        status: pass
    human_judgment: false
  - id: D2
    description: "configuration.md and commands.md describe the automatic EM login re-prompt on BUI/DWC runs (no-token and expired/invalid-token dialogs), the remembered username (admin default, PasswordSafe token storage), and replace the old 'log in again by hand' guidance"
    requirement: "IJ-01"
    verification:
      - kind: other
        ref: "grep checks for 'EM token expired or invalid', 'EM login required', 'admin', 'PasswordSafe', absence of old re-authenticate text, and planning-id diff scan"
        status: pass
    human_judgment: false
  - id: D3
    description: "configuration.md Host subsection documents the localhost fallback for an empty field; commands.md and features.md describe Compile BBj File in the editor context menu, Tools menu, and Alt+C, with no toolbar-button text remaining anywhere on either page"
    requirement: "IJ-02"
    verification:
      - kind: other
        ref: "grep -ci toolbar (0 on both files), grep -c Alt+C, docs build"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 04: IntelliJ Configuration and Commands Drift Summary

**IntelliJ configuration/commands/features pages now describe the BBj Compiler settings section, the automatic EM re-login prompt with remembered username, the Host localhost fallback, and Compile BBj File's real menu/shortcut location, all traced to the plugin source.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-30T09:40:00Z (approx.)
- **Completed:** 2026-09-30T09:44:19Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added a "## BBj Compiler" section to `configuration.md` (Compile output directory, Compiler check) in the same order `BbjSettingsComponent.java`'s form builder lays out the settings page, plus the config.bbx Path absolute/`~`-expansion validation rule
- Rewrote the EM Token Authentication flow in `configuration.md` and the Login to Enterprise Manager command in `commands.md` to describe the automatic re-prompt (`BbjRunActionBase.buildWebRunCommandLine`) instead of manual re-authentication, including the remembered-username behaviour (`EmUsernameMemory`, `admin` default, PasswordSafe storage)
- Documented the Host field's empty-value fallback to `localhost` (`BbjLanguageServerFactory`/`BbjSettingsConfigurable`), correcting the drift scan's inaccurate "server-side validator warning" description
- Moved Compile BBj File's documented location to match `plugin.xml` exactly — editor context menu (after the run actions), Tools menu, `Alt+C` — and removed every "toolbar button" reference from `commands.md` and `features.md`
- Updated `features.md`'s Run Commands quick-reference table to the real action titles and `Alt+C`

## Task Commits

1. **Task 1 (tracer): "BBj Compiler" section on the configuration page** - `bac2481e` (docs)
2. **Task 2: Automatic EM login, remembered username, Host fallback** - `f61ed37b` (docs)
3. **Task 3: Compile BBj File menus and shortcut** - `8e915921` (docs)

**Plan metadata:** (this commit) - `docs(123-04): complete IntelliJ configuration and commands drift plan`

## Files Created/Modified
- `documentation/docs/intellij/configuration.md` - BBj Compiler section, config.bbx Path validation rule, EM auto-login flow, Host fallback
- `documentation/docs/intellij/commands.md` - Compile BBj File access/availability, EM auto-login re-prompt, BUI/DWC Requires lines and troubleshooting, no toolbar text, shortcut table
- `documentation/docs/intellij/features.md` - Run Commands table real titles and Alt+C

## Decisions Made
- Host fallback documented per the code (`BbjLanguageServerFactory.java:52-54`, `BbjSettingsConfigurable.java:140-144`, trimmed in `BbjSettingsComponent.java:465`), not the drift scan's "falls back with a warning (server-side validator)" — the code and scan disagreed; the code's behaviour (silent substitution, no warning shown for Host) is what shipped
- Compile BBj File's Tools-menu presence is a one-line cross-reference from the Tools Menu Commands section back to the Compile Command section, avoiding duplicate documentation of the same command

## Deviations from Plan

None - plan executed exactly as written, including the tracer feedback gate after Task 1 (auto mode active per `workflow.auto_advance: true`; re-ran the tracer's `<verify>` end-to-end, all checks passed, expansion continued without a checkpoint).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- IntelliJ configuration/commands/features drift for EM login, Host fallback, BBj Compiler settings, and Compile BBj File access is closed (IJ-01, IJ-02 complete)
- The composer actions get their own IntelliJ docs page in a later plan (123-07), which will link back to this plan's `commands.md`
- No blockers for subsequent phase-123 plans

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*

## Self-Check: PASSED

All three modified doc files and this SUMMARY.md exist on disk. All three task commits (`bac2481e`, `f61ed37b`, `8e915921`) are present in git log. All acceptance criteria for Tasks 1-3 were re-verified with the exact `grep`/`sed` commands from the plan and passed. The docs build ran twice (after Task 1 and after Task 3) and exited 0 both times with zero `WARNING` lines. The planning-identifier diff scan (`git diff 8b53253d`) found no leaked plan/requirement/decision ids.
