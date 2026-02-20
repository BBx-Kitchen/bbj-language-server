---
phase: 57-bug-fixes
plan: 01
subsystem: run-commands
tags: [classpath, vscode, intellij, textmate, file-associations, em-config]

# Dependency graph
requires: []
provides:
  - "'--' sentinel stripped from classpath in all run command paths (VS Code + IntelliJ)"
  - "config.bbx and config.min excluded from BBj language association in VS Code"
affects: [run-commands, classpath, file-associations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "stripSentinel helper pattern: v === '--' ? '' : (v || '') for EM Config sentinel values"
    - "VS Code configurationDefaults for filename-level file type overrides"

key-files:
  created: []
  modified:
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/package.json
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java

key-decisions:
  - "When '--' is stripped, silently omit classpath and proceed with launch — no warning or failure"
  - "stripSentinel applied at read time (not build time) in both runWeb() and run() in VS Code"
  - "IntelliJ TextMate bundle does not support filename-level exclusions — config.bbx exclusion documented as limitation; IntelliJ users must override manually in Settings > File Types"
  - "configurationDefaults files.associations used in VS Code package.json for filename-level overrides — .bbx remains in extensions list for other BBj programs"

patterns-established:
  - "EM Config sentinel '--' must always be stripped before use in any classpath argument construction"

requirements-completed: [BUG-01, BUG-02]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 57 Plan 01: Bug Fixes Summary

**EM Config '--' sentinel stripping across all VS Code and IntelliJ run command paths, plus config.bbx and config.min excluded from BBj syntax highlighting via VS Code configurationDefaults**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T17:19:22Z
- **Completed:** 2026-02-20T17:21:24Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Eliminated `-CP--` argument being passed to bbj executable when EM Config sentinel "--" is set as classpath
- VS Code `runWeb()` and `run()` both strip "--" via shared `stripSentinel` helper before building command line
- IntelliJ `BbjRunActionBase.getClasspathArg()` returns null for "--", `BbjRunDwcAction` and `BbjRunBuiAction` treat "--" as empty string
- VS Code `configurationDefaults` maps `config.bbx` and `config.min` to `plaintext`, overriding the `.bbx` extension BBj association for these specific configuration files

## Task Commits

Each task was committed atomically:

1. **Task 1: Strip "--" sentinel from classpath in all run commands** - `b8977fd` (fix)
2. **Task 2: Exclude config.bbx and config.min from BBj language association** - `cc73a75` (fix)

**Plan metadata:** (see final commit)

## Files Created/Modified

- `bbj-vscode/src/Commands/Commands.cjs` - Added `stripSentinel` helper; applied in `runWeb()` and `run()`
- `bbj-vscode/package.json` - Added `configurationDefaults.files.associations` for `config.bbx` and `config.min` -> `plaintext`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - `getClasspathArg()` returns null for "--" sentinel
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java` - Classpath read treats "--" as empty string
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` - Classpath read treats "--" as empty string

## Decisions Made

- **stripSentinel as module-level helper in Commands.cjs**: Centralized sentinel check; used at read time in both `runWeb()` and `run()` so neither path can accidentally pass `--` to bbj.
- **IntelliJ TextMate bundle limitation**: The TextMate bundle JSON format does not support filename-level exclusions (only extensions). config.bbx remains associated with BBj in IntelliJ. Users must override in Settings > Editor > File Types. Documented as limitation — no code change made to the bundle.
- **VS Code configurationDefaults approach**: This is the correct VS Code mechanism for overriding file associations at filename level. The `.bbx` extension remains in `contributes.languages[0].extensions` so all other `.bbx` files still get BBj syntax highlighting.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript build errors exist in `bbj-linker.ts` and `bbj-validator.ts` (Property 'visibility' does not exist on type 'BBjClassMember'). These are out of scope for this plan — confirmed present before any changes were made. Build of `Commands.cjs` is not affected (it's a plain JavaScript file, not TypeScript).

## User Setup Required

None - no external service configuration required. IntelliJ users who open `config.bbx` files and want plain text display must manually override in Settings > Editor > File Types until IntelliJ TextMate bundle gains filename-exclusion support.

## Next Phase Readiness

- BUG-01 and BUG-02 resolved — EM Config "--" sentinel and config.bbx highlighting bugs fixed
- Ready for any remaining bug fixes in Phase 57

---
*Phase: 57-bug-fixes*
*Completed: 2026-02-20*
