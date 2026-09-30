---
phase: 123-documentation-drift
plan: 07
subsystem: docs
tags: [intellij, documentation, docusaurus, composers]

requires:
  - phase: 123-documentation-drift
    provides: commands.md rewritten with IJ-01/IJ-02 drift fixes (123-04)
provides:
  - IntelliJ guide Composers page listing every composer action, intention and cue, and
    explaining assign-to validation
affects: [123-08 phase wrap-up plan (also declares COMP-01)]

actuals:
  tokens: 4500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Composers page cites plugin.xml action ids/text and each Configure*Intention.java's
      getText() for every action and intention, rather than restating them from memory"

key-files:
  created:
    - documentation/docs/intellij/composers.md
  modified:
    - documentation/docs/intellij/commands.md
    - documentation/docs/intellij/index.md

key-decisions:
  - "COMP-01 was not marked complete in REQUIREMENTS.md: gsd-tools query requirements.ready-ids
    reports it blocked because 123-08-PLAN.md also declares COMP-01 and has no SUMMARY yet — the
    shared-ID gate held it back correctly, not just the 123-06/123-07 pairing the plan anticipated"

requirements-completed: []

coverage:
  - id: D1
    description: "IntelliJ guide has a Composers page in the sidebar (sidebar_position 6), linked
      from commands.md's new Composer Actions section and Editor Context Menu list, and from
      index.md's Quick Links table"
    requirement: COMP-01
    verification:
      - kind: other
        ref: "grep -c sidebar_position/composers.md link checks + docs build"
        status: pass
    human_judgment: false
  - id: D2
    description: "composers.md lists all seven compose actions (incl. the cue-only
      bbj.openComposerAt) with their menu text and id, and all five Alt+Enter intentions by their
      exact text, verified programmatically against plugin.xml and each Configure*Intention.java"
    requirement: COMP-01
    verification:
      - kind: other
        ref: "node composers-check script (composers ok) against plugin.xml and the five
          Configure*Intention.java files"
        status: pass
    human_judgment: false
  - id: D3
    description: "composers.md explains assign-to validation: the field is shown only on a new
      MSGBOX/CVS() insert, required, pre-filled ret!/s$, and rejects a wrong-type variable with the
      code's exact messages; OK/Apply stays disabled while invalid"
    requirement: COMP-01
    verification:
      - kind: other
        ref: "grep for 'Assign result to', 'Required', and both rejection messages in
          composers.md (covered by the composers-check script)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 07: IntelliJ Composers Page Summary

**New `documentation/docs/intellij/composers.md` documents all seven composer actions (including
the cue-only `bbj.openComposerAt`), the five Alt+Enter intentions, the Code Vision cues, and
assign-to validation — linked from the commands page's new Composer Actions section and the
guide's Quick Links.**

## Performance

- **Duration:** 15 min
- **Started:** ~2026-09-30T14:22:30Z
- **Completed:** 2026-09-30T14:27:23Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- New `documentation/docs/intellij/composers.md` (`sidebar_position: 6`, `title: Composers`)
  covers:
  - **Opening a composer** — the three entry points: the Code Vision cue (which invokes the
    internal, menu-less `bbj.openComposerAt` action), the Alt+Enter intention (family "BBj visual
    composer"), and the editor context menu.
  - **MSGBOX** — `bbj.composeMsgbox` / intention "Configure MSGBOX options…", the
    compose/edit/complete modes, the compose-and-replace banner, and the debounced preview with
    OK/Apply gating.
  - **addWindow and addChildWindow** — `bbj.composeAddWindow` / "Configure window flags…" and
    `bbj.composeAddChildWindow` / "Configure child window flags…", per-field validation after
    typing settles.
  - **CVS()** — `bbj.composeCvs` / "Configure CVS() options…", the disabled-not-hidden
    replacement-chars field, and the "Complete CVS() call" mode.
  - **SETOPTS in code** — the action "Configure SETOPTS Options in Code…" (`bbj.composeSetoptsInCode`,
    a second door that skips the Alt+Enter intention search) and the intention "Configure SETOPTS
    options in code…" (note the differing capitalization — both are real, copied verbatim from
    `plugin.xml` and `ConfigureSetoptsInCodeIntention.java`), the tri-state composer, and the
    unsafe-chain refusal.
  - **config.bbx SETOPTS** — `bbj.composeSetopts`, scoped to the config file's own context menu,
    no server restart on apply.
  - **Actions and intentions** — one table listing every action's text/id/location and every
    intention's text.
  - **Assign-to validation** — the "Assign result to" field's required/pre-filled/type-checked
    rules and both exact rejection messages, plus the edit/completing-mode exemption.
- `commands.md` gained a "## Composer Actions" section linking to the new page, and its Editor
  Context Menu list now names all six composer actions with the same link.
- `index.md`'s Quick Links table gained a "Composers" row.
- All text was traced to `plugin.xml` (actions and registered intentions),
  `BbjComposeActionBase.java`/`BbjComposeMsgboxAction.java`/`BbjComposeAddWindowAction.java`/
  `BbjComposeAddChildWindowAction.java`/`BbjComposeCvsAction.java`/`BbjComposeSetoptsAction.java`/
  `BbjComposeSetoptsInCodeAction.java`/`SetoptsInCodeActionAvailability.java`,
  `BbjOpenComposerAtAction.java`/`ComposerLensKinds.java` (Code Vision cue dispatch),
  `ComposerIntentionBase.java` and each `Configure*Intention.java`,
  `MsgboxComposerDialog.java`/`AddWindowFamilyComposerDialogBase.java`/
  `AddWindowComposerDialog.java`/`AddChildWindowComposerDialog.java`/`CvsComposerDialog.java`/
  `SetoptsTriStateComposerDialog.java`/`SetoptsComposerDialog.java` (fields, validation, OK
  gating), `bbj-vscode/src/msgbox-composer.ts`'s shared `validateAssignTo` (the exact rejection
  messages), and cross-checked against the QA checklist's verified IntelliJ composer rows (18-25,
  29, 31).

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Composers page with the MSGBOX section, in the sidebar and linked from
   commands.md** - `63de0ede` (docs)
2. **Task 2: Every other composer action and intention, assign-to validation, Quick Links row** -
   `b7d4b7c3` (docs)

**Plan metadata:** commit will follow this SUMMARY.

## Files Created/Modified
- `documentation/docs/intellij/composers.md` - new page: every composer action, intention, cue,
  and assign-to validation
- `documentation/docs/intellij/commands.md` - Composer Actions section and Editor Context Menu
  composer entries, both linking to `./composers.md`
- `documentation/docs/intellij/index.md` - Quick Links table gained a Composers row

## Decisions Made
- Verified every action id/text and intention text programmatically (the plan's own Node
  one-liner) against `plugin.xml` and each `Configure*Intention.java`'s `getText()`, rather than
  by hand, catching the exact-substring requirement precisely — including the deliberate
  capitalization difference between the `bbj.composeSetoptsInCode` action's menu text ("Configure
  SETOPTS Options in Code…") and its sibling intention's text ("Configure SETOPTS options in
  code…").
- Did not mark COMP-01 complete in `.planning/REQUIREMENTS.md`: `gsd-tools query
  requirements.ready-ids` reports it still blocked, because `123-08-PLAN.md` (the phase wrap-up
  plan) also declares COMP-01 and has not produced a SUMMARY yet. The plan's own note anticipated
  only the 123-06/123-07 pairing; the shared-ID gate correctly found the third declaring plan too.

## Deviations from Plan

None - plan executed exactly as written. Both `must_haves.artifacts` and all three
`must_haves.truths` in the plan frontmatter are satisfied by the committed content; no auto-fixes,
no scope changes. The tracer feedback gate after Task 1 ran under auto mode
(`workflow.auto_advance: true`): the tracer's `<verify>` (grep counts, docs build) was re-run end
to end, all checks passed, and expansion continued without a checkpoint.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- COMP-01 is shared across `123-06`, `123-07`, and `123-08`. It remains unmarked in
  `.planning/REQUIREMENTS.md` until `123-08-PLAN.md` also produces a `*-SUMMARY.md` — verified via
  `gsd-tools query requirements.ready-ids`, which reports it `blocked` (0/1 ready).
- `commands.md` and `index.md` now carry both the VS Code (123-06) and IntelliJ (this plan)
  Composers page links; no further changes to these two files are expected from 123-08 on this
  topic.
- No blockers or concerns for subsequent phase 123 plans.

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*

## Self-Check: PASSED

- `documentation/docs/intellij/composers.md` — FOUND
- `documentation/docs/intellij/commands.md` — FOUND
- `documentation/docs/intellij/index.md` — FOUND
- Commit `63de0ede` — FOUND in `git log --oneline --all`
- Commit `b7d4b7c3` — FOUND in `git log --oneline --all`
- All three `must_haves.truths` and both tasks' acceptance criteria re-verified via the exact
  grep/node commands from the plan: PASS
- Plan-level `<verification>`: both tasks' automated checks pass; docs build exits 0 with no
  WARNING lines; `git diff --name-only 8b53253d -- documentation/docs/intellij/` shows exactly
  this plan's new file (`composers.md`) plus 123-04's and the shared files
  (`configuration.md`, `features.md`, `commands.md`, `index.md`): PASS
