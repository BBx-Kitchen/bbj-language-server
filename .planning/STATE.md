# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, and Java class/method completions — through a single shared language server.
**Current focus:** v1.1 Phase 8 — Run Commands

## Current Position

Milestone: v1.1 Polish & Run Commands
Phase: 8 of 10 (Run Commands)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-02-01 — Completed 08-02-PLAN.md

Progress: [███░░░] 3/6 (50%)

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |

See: .planning/MILESTONES.md

## Performance Metrics

**Velocity:**
- Total plans completed: 19 (v1.0) + 3 (v1.1) = 22
- v1.1 plans completed: 3
- v1.1 total plans: 6

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 7. Brand Icons | 1/1 | ~12min | ~12min |
| 8. Run Commands | 2/2 | ~6min | ~3min |
| 9. Structure View | 0/1 | - | - |
| 10. Bug Fixes | 0/2 | - | - |

## Accumulated Context

### Decisions (v1.1)

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 07-01 | viewBox 0 0 3000 3000 with translate/scale for B-logo SVGs | Preserves original path coordinates from VSCode source without rescaling |
| 07-01 | Stroke-based rendering for Tabler icons | IntelliJ renders strokes correctly; simpler than converting to fill paths |
| 07-01 | BbxConfigFileType uses BbjLanguage.INSTANCE | Shares BBj syntax highlighting and LSP support for .bbx files |
| 07-01 | Icon colors: #6E6E6E light, #AFB1B3 dark | IntelliJ standard icon color convention |
| 08-01 | Project root as working directory | Uses project.getBasePath() for -WD flag instead of VSCode's file directory |
| 08-01 | ActionUpdateThread.BGT for update() | File extension check is cheap, safe to run on background thread |
| 08-01 | Auto-save defaults to true | Matches VSCode behavior, prevents running stale code |
| 08-02 | web.bbj path via PluginManagerCore | PluginManagerCore.getPlugin().getPluginPath() more robust than PathManager |
| 08-02 | Separate BUI/DWC action classes | Clearer action registry than single parameterized class |
| 08-02 | web.bbj working directory is tools dir | Matches VSCode webRunnerWorkingDir pattern |
| 08-02 | Three separate toolbar buttons | Individual MainToolBar registrations for visible buttons vs dropdown group |

### Known Issues (from v1.0 -- being addressed in Phase 10)

1. Comment toggling (REM) -- FIX-01
2. Bracket/keyword matching -- FIX-02
3. "LSP Symbol ..." popup text -- FIX-03
4. LS shutdown delay on last file close -- FIX-04
5. BbjCompletionFeature orphaned icons -- FIX-05
6. Stale bbj-intellij/META-INF/plugin.xml -- FIX-06
7. Linux code path review -- FIX-07

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-01 23:02
Stopped at: Completed 08-02-PLAN.md (Phase 08 complete)
Resume file: None
Next: Phase 09 (Structure View) or Phase 10 (Bug Fixes)
