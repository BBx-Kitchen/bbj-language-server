---
phase: 86-intellij-interop-settings-targeted-refresh
plan: 04
subsystem: docs
tags: [qa-checklist, documentation, api-coverage, todo-closure]

requires:
  - phase: 86-01
    provides: "Refresh Java Classes targeted-request behavior — the live-IDE property row 16 hand-verifies"
  - phase: 86-02
    provides: "com.basis.languageServer.addr port detection and the effective-port rule — the behavior row 17 and the documentation rewrite describe"
provides:
  - "COVERAGE.md — the one-line no-external-API declaration the seal-time gate reads"
  - "QA/FULL-TEST-CHECKLIST.md rows 16-17 — hand-executable checks for the two properties this phase cannot prove with a test"
  - "documentation/docs/intellij/configuration.md Java Interop section rewritten to describe the Auto-detect checkbox instead of the auto-detection that never worked"
  - "The folded Enterprise Manager config-sentinel todo closed in .planning/todos/completed/ with a resolution note"
affects: []

actuals:
  tokens: 2200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Reasoned no-external-API COVERAGE.md declaration (Phase 85 precedent) accepted in place of a capability matrix when a phase adds no third-party service integration"

key-files:
  created:
    - .planning/phases/86-intellij-interop-settings-targeted-refresh/COVERAGE.md
  modified:
    - QA/FULL-TEST-CHECKLIST.md
    - documentation/docs/intellij/configuration.md
    - .planning/todos/completed/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md

key-decisions:
  - "The folded todo is closed as delivered by Phase 84 D-12 (ConfigPaths.configPathArg from plan 84-04, wired in plan 84-06 on IntelliJ; stripSentinel(getActiveConfigPath()) from plan 84-03 on VS Code) rather than built — no production code was written for it in this plan."
  - "COVERAGE.md names the phase's actual new surface (one in-plugin JSON-RPC request on the existing composer-server interface, plus a local BBj.properties read) rather than a fabricated external-API capability matrix, following the Phase 85 precedent for the same seal-gate false positive."

patterns-established: []

requirements-completed: [CFG-04, CFG-05]

coverage:
  - id: D1
    description: "The phase's hand-verifiable surface (targeted refresh keeps features online; port auto-detect and explicit-5008 survival) is written down as exact, falsifiable QA checklist rows"
    requirement: "CFG-04"
    verification:
      - kind: manual_procedural
        ref: "QA/FULL-TEST-CHECKLIST.md row 16 (Refresh Java Classes keeps language features online)"
        status: unknown
    human_judgment: true
    rationale: "This plan writes the hand-check row; executing it in a running IDE against a large classpath is deferred to end-of-phase UAT, consistent with 86-01's Next Phase Readiness note."
  - id: D2
    description: "The interop port auto-detect / explicit-5008-survival regression pair has its own hand-executable QA row"
    requirement: "CFG-05"
    verification:
      - kind: manual_procedural
        ref: "QA/FULL-TEST-CHECKLIST.md row 17 (Java-interop port auto-detects, and an explicitly confirmed 5008 is kept)"
        status: unknown
    human_judgment: true
    rationale: "The row is written and its automated presence/wording is verified by grep; whether a live Settings dialog session actually behaves this way is a plan 86-03 deliverable and an end-of-phase UAT item."
  - id: D3
    description: "The seal-time API-coverage gate has a reasoned one-line declaration instead of a missing file or a fabricated capability matrix"
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "awk check on COVERAGE.md: begins with the declaration prefix, under 200 chars, exactly one line"
        status: pass
    human_judgment: false
  - id: D4
    description: "The IntelliJ Port documentation describes the shipped behavior (checkbox, detection key, hint, explicit-port rule, restart-on-Apply) instead of the auto-detection that never worked"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "grep check on configuration.md for 'Auto-detect' and 'com.basis.languageServer.addr'"
        status: pass
    human_judgment: false
  - id: D5
    description: "The folded Enterprise Manager config-sentinel todo is closed with a resolution note, and no production code was written for it"
    requirement: "CFG-05"
    verification:
      - kind: unit
        ref: "test -f completed/... && test ! -e pending/... ; grep '## Resolution' ; git status --porcelain over bbj-intellij/src bbj-vscode/src java-interop is empty"
        status: pass
    human_judgment: false
---

# Phase 86 Plan 4: Documentation, QA Checklist and Todo Closure Summary

**Two new hand-executable QA rows for the properties no automated test in this repo can reach, a one-line no-external-API COVERAGE.md declaration, a rewritten IntelliJ Port documentation section describing the Auto-detect checkbox and the explicit-5008 rule, and the folded Enterprise Manager sentinel todo closed as already delivered by Phase 84.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-09-07T14:49:28Z
- **Completed:** 2026-09-07T14:52:14Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `COVERAGE.md` declares "No external API integration" with a one-line reason (one in-plugin JSON-RPC request on the existing composer-server interface, plus a local `BBj.properties` read), passing the seal-time api-coverage gate that pattern-matches the word "API" in prose
- `QA/FULL-TEST-CHECKLIST.md` gained rows 16 and 17 in the IntelliJ IDEA - LSP Features table, appended after row 15 with rows 14-15 left untouched: row 16 hand-verifies that completion, hover and the Structure View keep answering while Refresh Java Classes runs; row 17 hand-verifies that the port auto-detects from `com.basis.languageServer.addr` and that an explicitly applied 5008 survives a properties file naming a different port
- `documentation/docs/intellij/configuration.md`'s Java Interop → Port section now describes the Auto-detect checkbox, the detection key and its `host:port:enabled` shape, the disabled-service hint, the uncheck-and-keep-5008 rule, the 1-65535 validation, the shared effective value across every consumer, and the restart-on-Apply propagation — replacing the old bullet that claimed auto-detection worked when it never matched a real installation; the Host subsection now notes the host is never auto-detected
- The folded Enterprise Manager `--` sentinel todo moved from `.planning/todos/pending/` to `.planning/todos/completed/` with a `## Resolution` section naming Phase 84's decision D-12 and the three plans (84-03, 84-04, 84-06) that delivered both guards, and a `completed:` front-matter key; no production file was touched for it

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "the phase's hand-checked surface is written down" — checklist rows and the coverage declaration (tracer)** - `ef1a8fa6` (docs)
2. **Task 2: The Port documentation tells the truth, and the folded todo is closed** - `d7215cc5` (docs)

**Plan metadata:** commit to follow (docs)

## Files Created/Modified
- `.planning/phases/86-intellij-interop-settings-targeted-refresh/COVERAGE.md` - one-line no-external-API declaration
- `QA/FULL-TEST-CHECKLIST.md` - new rows 16 and 17 in the IntelliJ IDEA - LSP Features table
- `documentation/docs/intellij/configuration.md` - rewritten `### Port` subsection, one new sentence in `### Host`
- `.planning/todos/completed/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` - moved from `pending/`, `completed:` front-matter key added, `## Resolution` section appended, `## Problem` section byte-identical to before the move

## Decisions Made
- The folded todo's closure cites Phase 84 D-12 by name and lists all three delivering plans (84-03 VS Code `stripSentinel`, 84-04 `ConfigPaths.configPathArg` helper, 84-06 IntelliJ wiring into `BbjRunActionBase`) rather than a single plan, since the guard's two sides landed in different plans.
- COVERAGE.md's reason names the phase's actual new surface (one JSON-RPC request, one properties read) instead of a generic "no API" statement, matching the Phase 85 COVERAGE.md format model exactly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 86-03 (Settings dialog wiring, wave 2) still needs to run; the documentation and QA rows this plan wrote describe the designed behavior from 86-CONTEXT.md and the 86-03 plan, not code that exists yet in `BbjSettingsComponent`/`BbjSettingsConfigurable`. Once 86-03 lands, the hand checks in QA rows 16-17 and the Port documentation become directly executable against the built plugin.
- The two hand-check QA rows (16, 17) and the phase's other UAT-flagged live-IDE properties remain for end-of-phase UAT, consistent with 86-01's and 86-02's `human_judgment: true` coverage entries.
- No production code (`bbj-intellij/src`, `bbj-vscode/src`, `java-interop`) was touched by this plan — confirmed by an empty `git status --porcelain` over those trees.

---
*Phase: 86-intellij-interop-settings-targeted-refresh*
*Completed: 2026-09-07*

## Self-Check: PASSED

`COVERAGE.md` exists and passes the awk gate check. `QA/FULL-TEST-CHECKLIST.md` contains exactly two rows numbered 16 and 17 in the IntelliJ IDEA - LSP Features section, with rows 14-15 unchanged. `documentation/docs/intellij/configuration.md` contains "Auto-detect" and "com.basis.languageServer.addr" and no plan/decision identifiers. The folded todo exists only under `.planning/todos/completed/`, carries a `## Resolution` section, and its `## Problem` section is byte-identical to before the move. `git status --porcelain` over `bbj-intellij/src bbj-vscode/src java-interop` is empty. Both task commits (`ef1a8fa6`, `d7215cc5`) confirmed present in `git log --oneline`.
