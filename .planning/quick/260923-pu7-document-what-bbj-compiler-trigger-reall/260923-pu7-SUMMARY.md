---
phase: 260923-pu7-document-what-bbj-compiler-trigger-reall
plan: 01
subsystem: docs
tags: [compiler-diagnostics, vscode, intellij, documentation]

requires: []
provides:
  - Corrected bbj.compiler.trigger setting text (description + enumDescriptions) in bbj-vscode/package.json
  - Accurate VS Code Live Compiler Diagnostics documentation (500ms fixed delay, per-value behavior, large-workspace workaround)
  - Accurate IntelliJ Live Compiler Diagnostics documentation (no trigger setting exists there)
  - Comment-only correction of stale saves-only debounce wording in bbj-document-builder.ts
affects: [documentation, vscode-settings-ui]

actuals:
  tokens: 1672
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/src/language/bbj-document-builder.ts
    - documentation/docs/vscode/features.md
    - documentation/docs/intellij/features.md

key-decisions:
  - "Documented the real fixed 500ms debounce (not the previously claimed 2s) as the single source of truth in both the settings UI and the docs page"
  - "Stated on-save's current equivalence to debounced as an observed fact, not a design goal, in both package.json and features.md"
  - "Removed the claim that IntelliJ has a working bbj.compiler.trigger setting; stated the off-workaround for slow completion is VS Code-only today"

patterns-established: []

requirements-completed: ["QUICK-260923-pu7"]

coverage:
  - id: D1
    description: "bbj.compiler.trigger setting description and enumDescriptions in package.json state the real 500ms delay, tie on-save to debounced, and name off as the large-workspace completion workaround"
    requirement: "QUICK-260923-pu7"
    verification:
      - kind: unit
        ref: "node -e assertion in Task 1 verify block (checks default/enum/scope, 500ms presence, no stale 2s/save-only claims, on-save-debounced tie, off-completion workaround, no planning ids)"
        status: pass
    human_judgment: false
  - id: D2
    description: "bbj-document-builder.ts SAVE_DEBOUNCE_MS, runBbjcplForDocuments, and debouncedCompile JSDoc comments corrected to describe the re-arm-on-every-event behavior instead of rapid-saves-only, with zero non-comment diff"
    requirement: "QUICK-260923-pu7"
    verification:
      - kind: unit
        ref: "grep assertions in Task 1 verify block (SAVE_DEBOUNCE_MS = 500 unchanged; stale sentence gone; diff -U0 contains only comment-prefixed +/- lines)"
        status: pass
    human_judgment: false
  - id: D3
    description: "VS Code features.md Live Compiler Diagnostics section documents all three trigger values, the fixed 500ms delay, the saved-file fallback, immediate effect on change, and off as the completion-slowdown workaround"
    requirement: "QUICK-260923-pu7"
    verification:
      - kind: unit
        ref: "node -e assertion in Task 2 verify block (checks all required terms present, on-save-debounced equivalence regex, no stale claims, no planning ids)"
        status: pass
    human_judgment: false
  - id: D4
    description: "IntelliJ features.md Live Compiler Diagnostics section states the plugin has no trigger setting, always uses default (500ms) behavior, and that the off workaround is VS Code-only"
    requirement: "QUICK-260923-pu7"
    verification:
      - kind: unit
        ref: "node -e assertion in Task 3 verify block (checks required terms present, old 'This follows the existing' claim removed, no stale claims, no planning ids)"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-23
status: complete
---

# Quick Task 260923-pu7: Document what bbj.compiler.trigger really does Summary

**Replaced the fictional "2-second, save-only" trigger description with the real 500 ms
fixed debounce across the VS Code setting text and both features pages, and told IntelliJ
users the setting does not exist there.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-23T18:25:00Z
- **Completed:** 2026-09-23T18:47:05Z
- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments
- `bbj.compiler.trigger` in `bbj-vscode/package.json` now carries a corrected description plus
  per-value `enumDescriptions`, all grounded in the verified 500 ms `SAVE_DEBOUNCE_MS` constant
  and the actual per-value trigger logic in `bbj-document-builder.ts` /
  `bbj-document-validator.ts`.
- `documentation/docs/vscode/features.md`'s Live Compiler Diagnostics section now explains the
  fixed 500 ms delay, all three trigger values (including that `on-save` currently behaves
  exactly like `debounced`), the saved-file fallback for older BBj/BBjServices-down, that
  changing the setting takes effect immediately, and `off` as the workaround for slow code
  completion in very large workspaces.
- `documentation/docs/intellij/features.md`'s equivalent section no longer claims the trigger
  setting works in IntelliJ; it now says the plugin always uses the default (500 ms) behavior
  and that the `off` completion-slowdown workaround is VS Code-only today.
- Two stale JSDoc comments in `bbj-document-builder.ts` (`SAVE_DEBOUNCE_MS`, `debouncedCompile`)
  that described the debounce as a rapid-saves-only mechanism were corrected to describe the
  real re-arm-on-every-open/edit/rebuild behavior; a third comment (`runBbjcplForDocuments`) got
  one added sentence noting only `'off'` is distinguished in that method. No non-comment line in
  `bbj-document-builder.ts` changed; `SAVE_DEBOUNCE_MS` is still `500`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct the bbj.compiler.trigger setting text in package.json and the stale debounce comments** - `0d671e66` (docs)
2. **Task 2: Rewrite the trigger paragraph in the VS Code Live Compiler Diagnostics section** - `8557754f` (docs)
3. **Task 3: Correct the IntelliJ Live Compiler Diagnostics section (no trigger setting in IntelliJ)** - `3984e85f` (docs)

**Plan metadata:** committed separately by the orchestrator.

## Files Created/Modified
- `bbj-vscode/package.json` - `bbj.compiler.trigger` description rewritten; `enumDescriptions` array added (3 entries, one per enum value)
- `bbj-vscode/src/language/bbj-document-builder.ts` - Three JSDoc comments corrected (`SAVE_DEBOUNCE_MS`, `runBbjcplForDocuments`, `debouncedCompile`); no behavior change, `SAVE_DEBOUNCE_MS` still `500`
- `documentation/docs/vscode/features.md` - Live Compiler Diagnostics section rewritten with per-value bullets, fixed-delay statement, fallback, immediate-effect note, and completion-slowdown workaround
- `documentation/docs/intellij/features.md` - Live Compiler Diagnostics section rewritten to state no trigger setting exists in IntelliJ and the workaround is VS Code-only

## Decisions Made
- Kept the two out-of-scope files (`documentation/docs/vscode/configuration.md`,
  `documentation/docs/intellij/configuration.md`) untouched, per the plan's explicit exclusion —
  neither documents this setting today.
- Did not change any trigger-check logic (`=== 'off'` / `!== 'off'`) or make `on-save` actually
  defer to save; this was a documentation-accuracy task only, not a behavior change.

## Deviations from Plan

None - plan executed exactly as written. All four Task 1 automated checks, the Task 2 check, and
the Task 3 check passed on the first attempt after one minor self-correction (see Issues
Encountered). The plan-level diff-stat and planning-id greps both passed clean.

## Issues Encountered
While editing the `runBbjcplForDocuments` JSDoc (Task 1), the first edit introduced a blank
comment line (`*` with no text) between the new sentence and the existing `IMPORTANT:` line. The
plan's action explicitly forbids blank-line additions or removals in this file. Caught by
re-reading the diff before running the automated diff-gate check; fixed by joining the new
sentence directly onto the paragraph above without an intervening blank comment line, restoring a
diff with no blank-line changes. Verified via `git diff` inspection and the automated
comment-only diff gate, both before committing.

## Open Questions (for the user, not resolved by this task)

These two discrepancies found in the verified facts are documented in the shipped text as-is
(matching real behavior), but they remain open follow-up decisions — not fixed by this task:

1. **`on-save` currently behaves identically to `debounced`.** The only trigger check anywhere in
   the language server is `=== 'off'` / `!== 'off'`; nothing distinguishes `on-save` from
   `debounced`. This has been true since Phase 53, which deliberately preserved the enum
   distinction "for future use." Whether `on-save` should be made to actually defer `bbjcpl` to
   save (or the value should be removed/merged) is a design decision for the user, not addressed
   here.
2. **IntelliJ has no equivalent setting at all.** `BbjSettings.State`, the settings page, and every
   `initializationOptions`/`createSettings()` payload IntelliJ sends carry no trigger field, so the
   server always falls back to `debounced` on IntelliJ. The `off` workaround for the large-workspace
   completion slowdown is therefore unavailable to IntelliJ users today. Whether to add the setting
   to IntelliJ is a follow-up decision for the user, out of scope for this docs-only task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Documentation now matches implemented behavior for the `bbj.compiler.trigger` setting in both
VS Code and IntelliJ. No code behavior changed (`SAVE_DEBOUNCE_MS` unchanged at 500,
comment-only diff verified). The two open questions above (on-save/debounced equivalence,
IntelliJ lacking the setting) are recorded for the user to decide on separately; this task
intentionally left the underlying trigger logic and IntelliJ settings surface unchanged.

---
*Quick task: 260923-pu7*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 4 files_modified plus the SUMMARY.md exist on disk; all 3 task commit hashes
(`0d671e66`, `8557754f`, `3984e85f`) are found in `git log --oneline --all`.
