---
phase: 90-composer-robustness-intellij-composer-performance
plan: 08
subsystem: testing
tags: [e2e, qa-checklist, msgbox, addwindow, installed-bundle, todo-closure]

requires:
  - phase: 90-composer-robustness-intellij-composer-performance
    provides: MSGBOX unfinished-call completion (90-01/90-07), addWindow/addChildWindow field validation (90-02), IntelliJ debounced/cached composer dialogs (90-03..90-06)
provides:
  - installed-bundle e2e proof that the rebuilt VS Code extension serves the MSGBOX incomplete decode and the addWindow valid/xError verdict
  - QA rows for every Phase 90 behaviour in both IDEs
  - closure of the folded MSGBOX compose-new nesting todo
affects: [phase-90-verification, phase-90-uat]

actuals:
  tokens: 24000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - installed-bundle IPC e2e assertions as the packaging/staleness gate for a phase, ahead of unit tests over src/

key-files:
  created: []
  modified:
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts
    - QA/FULL-TEST-CHECKLIST.md
    - .planning/todos/completed/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md

key-decisions:
  - "Task 1's tracer verify (build, reinstall, e2e run, IntelliJ clean buildPlugin, zip listing) doubled as the Phase 90 tracer-feedback-gate re-run under auto mode; it passed, so expansion (Task 2) proceeded without a checkpoint."

requirements-completed: [DISC-07, DISC-08, DISC-09, DISC-10, DISC-11]

coverage:
  - id: D1
    description: "Reinstalled VS Code bundle decodes an unfinished MSGBOX( call as incomplete with the correct call span, over IPC against the freshly built extension"
    requirement: DISC-07
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#bbj/composer/msgbox/decodeCall on an unfinished call returns the incomplete outcome with the call span"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reinstalled VS Code bundle reports a malformed addWindow x field (quoted number) as invalid with the numeric-field error, and blank fields as valid with the default statement"
    requirement: DISC-08
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#bbj/composer/addwindow/preview reports a malformed field as invalid and blank fields as valid"
        status: pass
    human_judgment: false
  - id: D3
    description: "IntelliJ plugin zip rebuilt via clean buildPlugin carries a fresh language-server/main.cjs entry"
    requirement: DISC-09
    verification:
      - kind: other
        ref: "unzip -l bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip (main.cjs entry timestamped 2026-09-12 21:27)"
        status: pass
    human_judgment: false
  - id: D4
    description: "QA/FULL-TEST-CHECKLIST.md gains VS Code rows 22-23 and IntelliJ rows 28-30 covering every Phase 90 behaviour change, with no existing row altered"
    requirement: DISC-10
    verification:
      - kind: other
        ref: "git diff -- QA/FULL-TEST-CHECKLIST.md (additions only, confirmed by inspection)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The folded MSGBOX compose-new nesting todo is closed, moved to completed/ with a Resolution section naming the fixing plans"
    requirement: DISC-11
    verification:
      - kind: other
        ref: "test -f .planning/todos/completed/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md"
        status: pass
    human_judgment: false
  - id: D6
    description: "Live IntelliJ composer debounce/reopen-after-restart behaviour and the VS Code cue/context-menu/validation flows behave as designed"
    verification: []
    human_judgment: true
    rationale: "Swing timing, modal dialog layout, and a live LSP4IJ/VS Code session cannot be driven headlessly in this devcontainer; staged as the plan's two end-of-phase human checks for UAT"

duration: 35min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 08: Installed-Bundle Proof, QA Coverage, and Todo Closure Summary

Proved over IPC that the rebuilt, reinstalled VS Code bundle serves the MSGBOX unfinished-call `incomplete` decode and the addWindow `valid`/`xError` verdict, rebuilt the IntelliJ zip from the same tree, added QA rows for every Phase 90 behaviour in both IDEs, and closed the folded MSGBOX compose-new nesting todo.

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-12T21:19:55Z
- **Completed:** 2026-09-12T21:55:00Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Added two installed-bundle e2e assertions (over `--node-ipc` against the extension actually resolved from `~/.ext-test/extensions/extensions.json`) proving `bbj/composer/msgbox/decodeCall` returns the `incomplete` outcome with the exact call span for `x = MSGBOX(` and prefills the message for `x = MSGBOX("Hi",`, and that `bbj/composer/addwindow/preview` reports `x: '"10"'` as invalid with `Not a number — remove the quotes: 10` while a blank `x` reports valid with the all-default statement.
- Rebuilt `bbj-vscode` (`npm run build`), reinstalled the VSIX via `bbj-ext-install` (extension `basis-intl.bbj-lang` v0.12.28, `installedTimestamp` 1789248386742 = 2026-09-12T21:26:26.742Z), and ran the full e2e file against the fresh install: 33 passed, 1 skipped (the "needs bbj-ext-install first" inverse-skip test, correctly skipped because the install is present).
- Rebuilt the IntelliJ plugin with `./gradlew clean buildPlugin --offline --console=plain -q` (exit 0; the Swing `buildSearchableOptions` stack trace is the known headless-environment noise) and confirmed `bbj-intellij/lib/language-server/main.cjs` in the zip listing, dated 2026-09-12 21:27 (same build run as the VSIX).
- sha256 digests recorded below.
- Appended QA rows: VS Code 22 (MSGBOX unfinished call and wizard target safety), VS Code 23 (addWindow and addChildWindow field validation), IntelliJ 28 (MSGBOX dialog completes an unfinished call with a debounced preview), IntelliJ 29 (addWindow and addChildWindow dialog field validation), IntelliJ 30 (Composer reopen across a language-server restart) — all appended after the existing rows, no existing row changed.
- Closed the folded todo: moved `.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md` to `completed/` with a `## Resolution` section naming plans 90-01 and 90-07 as the fix.
- Staged the two manual-only checks from the validation strategy (IntelliJ Swing debounce/reopen-across-restart, and the VS Code cue/context-menu/validation flows) as `<human-check>` blocks for end-of-phase UAT harvesting.

## Distributable Record

- VSIX: `/tmp/bbj-lang.vsix`
  - sha256: `fcdc464ce1256da16e3e0293f3006db3f4b231356f8ff3c800382cc7c562eddb`
  - extension `basis-intl.bbj-lang` v0.12.28, `installedTimestamp` 1789248386742 (2026-09-12T21:26:26.742Z)
- IntelliJ zip: `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`
  - sha256: `90e9c0ce02ec530143f7609738d6fe904ea0bcddbc72750a63e42e2515234534`
  - `bbj-intellij/lib/language-server/main.cjs` entry timestamped 2026-09-12 21:27 in the zip listing

## Task Commits

1. **Task 1: Prove the rebuilt, installed bundles carry the MSGBOX completion outcome and the addWindow validity verdict end to end** - `9e4dd6cb` (test)
2. **Task 2: QA rows for every Phase 90 behaviour in both IDEs, the closed MSGBOX todo, and the end-of-phase human checks** - `59f287c0` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - two new installed-bundle e2e assertions (MSGBOX incomplete decode, addWindow validity)
- `QA/FULL-TEST-CHECKLIST.md` - VS Code rows 22-23, IntelliJ rows 28-30
- `.planning/todos/completed/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md` - moved from `pending/`, with a Resolution section

## Decisions Made
- Task 1's tracer `<verify>` run (build + reinstall + e2e + IntelliJ `clean buildPlugin` + zip listing) doubled as the phase's tracer-feedback-gate re-run under auto mode (`workflow._auto_chain_active`/`workflow.auto_advance` both `true`): it passed end to end, so Task 2 (expansion) proceeded without synthesizing a checkpoint.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DISC-07 through DISC-11 all marked Complete in REQUIREMENTS.md (single-declaring plan; `requirements.ready-ids` reported all 5 ready).
- The two `<human-check>` blocks from Task 2's `<verify>` (IntelliJ MSGBOX/addWindow/addChildWindow dialog behavior + composer reopen across restart; VS Code MSGBOX completion/wizard-safety + field validation) are staged for the end-of-phase UAT harvest, to be run against distributables rebuilt from the final tree after any code-review fixes — the sha256 digests above are pre-code-review-fix baselines, not the ones UAT should trust.
- No blockers for phase verification.

---
*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*

## Self-Check: PASSED
- FOUND: bbj-vscode/test/functional/installed-extension-e2e.test.ts
- FOUND: commit 9e4dd6cb (test)
- FOUND: commit 59f287c0 (docs)
