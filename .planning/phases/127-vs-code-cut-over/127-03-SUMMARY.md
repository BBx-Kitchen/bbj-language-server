---
phase: 127-vs-code-cut-over
plan: 03
subsystem: vscode-settings
tags: [vscode, settings, package-json, migration, formatter, denumber]

requires:
  - phase: 127-vs-code-cut-over
    provides: "plan 01 reworded the line-numbered prompt; plan 02 removed javaPath and the client-side formatter"
provides:
  - "15 typed bbj.formatter.* settings with defaults equal to FORMATTER_DEFAULTS"
  - "bbj.formatter.splitSingleLineIF kept one release as a nullable deprecated alias"
  - "migrateSplitSingleLineIf: per-scope move of the old spelling on activation"
  - "bbj.denumber.promptOnOpen description without a replace promise"
affects: [127-04, 127-05, 127-06, vscode-extension-settings-ui]

actuals:
  tokens: 31000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "vscode-free migration core with injected inspect/update/log deps, started fire-and-forget from activate()"
    - "package.json schema pin test reading the manifest from disk and round-tripping defaults through the server normalizer"

key-files:
  created:
    - bbj-vscode/src/settings-migration.ts
    - bbj-vscode/test/formatter-settings-schema.test.ts
    - bbj-vscode/test/settings-migration.test.ts
    - bbj-vscode/test/settings-migration-activation.test.ts
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/src/extension.ts

key-decisions:
  - "Migration writes the new key before removing the old one and handles user scope before workspace scope, each in its own try, so one failed scope never blocks the other"
  - "Workspace-folder scope is not migrated: window-scoped keys cannot be written there"
  - "The log sink is wrapped so a throwing log callback cannot fail a settings move"
  - "Deprecated key is typed [boolean, null] with default null so its declared default normalizes to the formatter default"

requirements-completed: [SET-01, SET-03, SET-04, DEN-05]

coverage:
  - id: D1
    description: "All 15 formatter settings are declared with typed controls, bounds, enum descriptions, distinct order values and defaults equal to FORMATTER_DEFAULTS; javaPath stays absent"
    requirement: "SET-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/formatter-settings-schema.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "The old splitSingleLineIF spelling stays declared as a deprecated nullable boolean and a user's value moves to splitSingleLineIf in the same scope on activation"
    requirement: "SET-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/settings-migration.test.ts"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/settings-migration-activation.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "bbj.formatter.javaPath is absent from the manifest"
    requirement: "SET-04"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/formatter-settings-schema.test.ts#declares the 15 formatter settings plus the deprecated spelling and no java path"
        status: pass
    human_judgment: false
  - id: D4
    description: "bbj.denumber.promptOnOpen reads 'When opening a line-numbered BBj program, prompt to denumber it for editing or open it read-only.'"
    requirement: "DEN-05"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/formatter-settings-schema.test.ts#the prompt-on-open setting describes denumbering without promising a replacement"
        status: pass
    human_judgment: false
  - id: D5
    description: "Formatter settings sit in a sensible place among the extension's other settings in the VS Code Settings UI"
    verification: []
    human_judgment: true
    rationale: "Settings UI placement of ordered versus unordered properties is not asserted by any test; checked once in the hand check"

duration: 9min
completed: 2026-10-03
status: complete
---

# Phase 127 Plan 03: Formatter Settings Schema and splitSingleLineIF Migration Summary

**VS Code now declares all 15 bbj-ls formatter settings as typed, ordered, described controls pinned to the server defaults, and moves a user's old `splitSingleLineIF` value to `splitSingleLineIf` once per scope on activation.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-10-03T09:34:40Z
- **Completed:** 2026-10-03T09:44:00Z
- **Tasks:** 2
- **Files modified:** 6 (2 modified, 4 created)

## Accomplishments

- `package.json` carries 16 `bbj.formatter.*` properties: the 15 settings (`indentWidth` an integer 0 to 16, seven checkboxes, six dropdowns with one description per value) plus the deprecated `splitSingleLineIF`. Orders are 1-3 indentation, 10-13 keywords and IF, 20-26 layout, 30 line endings; the deprecated key has none. `ifClosingKeyword`, `ifKeywordCase` and `keywordsToUppercase` explain `KEEP` and precedence in markdown descriptions.
- Schema pin test reads the manifest from disk, checks every default against `FORMATTER_DEFAULTS`, round-trips the declared defaults through `normalizeFormatterSettings`, checks the enum table against the bbj-ls settings reference (ran, not skipped, in this container) and the reworded `promptOnOpen` text.
- `src/settings-migration.ts` moves a boolean old value to the new key in the same scope (user, then trusted workspace), writes before removing, never overwrites a set value, logs one info line without values, and never rejects.
- `activate()` starts the migration fire-and-forget right after `Commands.setOutputChannel`; no popup, no disposable, activation trace unchanged.
- Existing configuration push already applies a changed formatter setting without restart; `configuration-change-handler.test.ts` and `bbj-format-settings.test.ts` stay green and were not touched.

## Task Commits

1. **Task 1 (tracer, TDD):** RED `313f1fbb` (test), GREEN `0f303eda` (feat)
2. **Task 2 (TDD):** RED `50a09b82` (test), GREEN `b1e3c760` (feat)

**Plan metadata:** committed separately after this summary (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/package.json` - 16 formatter properties and the reworded prompt description
- `bbj-vscode/src/settings-migration.ts` - vscode-free per-scope migration core
- `bbj-vscode/src/extension.ts` - `startFormatterSettingsMigration()` and its call in `activate()`
- `bbj-vscode/test/formatter-settings-schema.test.ts` - 58 schema pins
- `bbj-vscode/test/settings-migration.test.ts` - 22 tests through a fake configuration plus a source guard
- `bbj-vscode/test/settings-migration-activation.test.ts` - 4 tests through the real `activate()`

## Decisions Made

- Followed the plan's migration rules exactly (same scope, boolean only, no overwrite, user before workspace, independent scope failures).
- Wrapped the log callback in a guard so a throwing sink cannot abort a move; this keeps the "never throws" promise literal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan inaccuracy] enumDescriptions count acceptance check expects 6, file has 7**
- **Found during:** Task 1 acceptance check
- **Issue:** `grep -c '"enumDescriptions"' package.json` prints 7, not 6. The plan's note that no existing property uses `enumDescriptions` was wrong: `bbj.compiler.trigger` already declares one. All six formatter enums carry theirs, and the schema test asserts that directly.
- **Fix:** none needed in code; the criterion's intent (six formatter enum descriptions) is met and covered by the test.
- **Files modified:** none
- **Verification:** `formatter-settings-schema.test.ts` enum tests pass for all six enum keys

**2. [Rule 3 - Blocking] Activation suite mock needed `inspect` on the `bbj` section**
- **Found during:** Task 2 activation suite
- **Issue:** with an untrusted workspace `effectiveConfigPath` calls `getConfiguration('bbj').inspect`, which the copied mock lacked.
- **Fix:** the default configuration mock answers `inspect` with undefined.
- **Files modified:** `bbj-vscode/test/settings-migration-activation.test.ts`
- **Verification:** suite passes
- **Committed in:** `b1e3c760`

**3. [Rule 1 - Bug] One migration test inspected both keys identically**
- **Found during:** Task 2 GREEN run
- **Issue:** the non-Error rejection test answered `globalValue: true` for the new key too, so the scope was skipped as already set.
- **Fix:** the fake answers per key.
- **Files modified:** `bbj-vscode/test/settings-migration.test.ts`
- **Committed in:** `b1e3c760`

---

**Total deviations:** 3 (2 test-only fixes, 1 plan wording inaccuracy)
**Impact on plan:** none on behavior or scope.

## Issues Encountered

None beyond the deviations above.

## TDD Gate Compliance

Both tasks have a `test(127-03)` commit that failed first (48 failing schema tests; module not found for the migration), followed by a `feat(127-03)` commit that passes.

## Known Stubs

None.

## Threat Flags

None. The migration writes only the two documented keys in the user and trusted-workspace scopes, as in the threat register (T-127-09 to T-127-11).

## Verification Results

- Task 1 verify: 6 suites, 158 tests passed; `npm run typecheck:test` and `npm run lint` clean
- Task 2 verify: 13 suites, 248 tests passed, no unhandled errors; typecheck, lint and `npm run build` clean
- Acceptance greps: 16 formatter properties, 0 `javaPath`, 1 reworded description, `startFormatterSettingsMigration()` twice, one `getConfiguration('bbj.formatter')`, only `Global` and `Workspace` targets, no planning identifiers in the new source and tests

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 127-04. The hand check in 127-06 should confirm where the ordered formatter settings land in the Settings UI (flagged assumption) and that a real settings file with the old key migrates.

---
*Phase: 127-vs-code-cut-over*
*Completed: 2026-10-03*

## Self-Check: PASSED

All created files exist; commits `313f1fbb`, `0f303eda`, `50a09b82`, `b1e3c760` are present in the log.
