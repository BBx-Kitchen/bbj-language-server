---
phase: 123-documentation-drift
plan: 06
subsystem: docs
tags: [vscode, documentation, docusaurus, composers]

requires:
  - phase: 123-documentation-drift
    provides: commands.md rewritten with real Command Palette titles (123-03)
provides:
  - VS Code guide Composers page listing every compose command, cue and lightbulb action, and
    explaining assign-to validation
affects: [123-07 IntelliJ Composers page (shares COMP-01)]

actuals:
  tokens: 6800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Composers page cites source files (msgbox-composer.ts, cvs-composer.ts, *-composer-ui.ts,
      composer-lens-contract.ts) for every command id, cue title and lightbulb label rather than
      restating them from memory"

key-files:
  created:
    - documentation/docs/vscode/composers.md
  modified:
    - documentation/docs/vscode/commands.md
    - documentation/docs/vscode/index.md

key-decisions:
  - "Removed a forward Markdown anchor link to a heading Task 2 had not created yet (Task 1's
    Opening a composer section originally linked to #lightbulb-actions); Docusaurus's broken-anchor
    check treats a not-yet-existing in-page anchor as a build warning, and Task 1's own <verify>
    requires zero WARNING lines before Task 2 runs. Replaced with plain prose; no link was
    reintroduced once the heading existed in Task 2, since the prose reads fine without it."

requirements-completed: []

coverage:
  - id: D1
    description: "VS Code guide has a Composers page in the sidebar (sidebar_position 6), linked
      from commands.md's new Composer Commands section and Editor Context Menu list, and from
      index.md's Quick Links table"
    requirement: "COMP-01"
    verification:
      - kind: other
        ref: "grep -c sidebar_position/composers.md link checks + docs build"
        status: pass
    human_judgment: false
  - id: D2
    description: "composers.md lists all seven compose commands with real titles/ids, the five cue
      titles, and every lightbulb label, verified programmatically against package.json and
      composer-lens-contract.ts"
    requirement: "COMP-01"
    verification:
      - kind: other
        ref: "node composers-check script (composers ok) against bbj-vscode/package.json and
          composer-lens-contract.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "composers.md explains assign-to validation: Assign result to field shown only on
      a new insert, required, pre-filled (ret!/s$), and rejects the wrong variable type with the
      code's exact messages"
    requirement: "COMP-01"
    verification:
      - kind: other
        ref: "grep for 'Assign result to', 'Required', and both rejection messages in composers.md"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 06: VS Code Composers Page Summary

**New `documentation/docs/vscode/composers.md` documents all seven compose commands, the five
cue titles, every lightbulb action across MSGBOX/addWindow/addChildWindow/CVS()/SETOPTS, and the
assign-to validation rules — linked from the commands page, its Editor Context Menu list, and the
guide's Quick Links.**

## Performance

- **Duration:** 40 min
- **Started:** ~2026-09-30T13:40:00Z
- **Completed:** 2026-09-30T14:21:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- New `documentation/docs/vscode/composers.md` (`sidebar_position: 6`, `title: Composers`) covers:
  - **Opening a composer** — the three entry points (cue, lightbulb/`Ctrl+.`, context
    menu/Command Palette), including which lines get no cue.
  - **MSGBOX** — `bbj.composeMsgbox` (QuickPick wizard) and `bbj.composeMsgboxVisual` (visual
    panel), all four lightbulb labels including the compose-and-replace banner text and the
    "Complete MSGBOX call…" completion mode, and the stale-edit guard message.
  - **addWindow and addChildWindow** — `bbj.composeAddWindow` / `bbj.composeAddChildWindow`, field
    validation messages and defaults, and the four lightbulb labels (including addChildWindow's
    no-flags-slot refusal).
  - **CVS()** — `bbj.composeCvs`, the chars field's disabled-not-hidden behaviour, position-aware
    dispatch, and its two lightbulb labels.
  - **SETOPTS in code** — `bbj.composeSetoptsInCode`, the tri-state reassignment-chain composer,
    new-block insertion, and the unsafe-chain refusal.
  - **config.bbx SETOPTS** — `bbj.composeConfigSetopts`, scoped to the config file's own context
    menu, one cue per line, no server restart on apply.
  - **Lightbulb actions** — one table listing every composer's lightbulb label(s).
  - **Assign-to validation** — the "Assign result to" field's required/pre-filled/type-checked
    rules and both exact rejection messages, plus the edit/completing-mode exemption.
- `commands.md` gained a "## Composer Commands" section linking to the new page, and its Editor
  Context Menu list now names the six composer commands with the same link.
- `index.md`'s Quick Links table gained a "Composers" row.
- All text was traced to the shipping code (`msgbox-composer.ts`, `msgbox-composer-ui.ts`,
  `msgbox-composer-webview.ts`, `cvs-composer.ts`, `cvs-composer-ui.ts`, `cvs-composer-webview.ts`,
  `addwindow-composer-ui.ts`, `addchildwindow-composer-ui.ts`, `window-composer-ui.ts`,
  `setopts-in-code-ui.ts`, `setopts-composer-ui.ts`, `composer-lens-contract.ts`,
  `composer-codelens.ts`, `package.json`'s `contributes.commands`) and cross-checked against the
  QA checklist's verified composer rows (10-23).

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Composers page with the MSGBOX section, in the sidebar and linked from
   commands.md** - `1fa556f8` (docs)
2. **Task 2: Every other composer, the lightbulb list, assign-to validation, Quick Links row** -
   `a050eb6e` (docs)

**Plan metadata:** commit will follow this SUMMARY.

## Files Created/Modified
- `documentation/docs/vscode/composers.md` - new page: every compose command, cue, lightbulb
  action, and assign-to validation
- `documentation/docs/vscode/commands.md` - Composer Commands section and Editor Context Menu
  composer entries, both linking to `./composers.md`
- `documentation/docs/vscode/index.md` - Quick Links table gained a Composers row

## Decisions Made
- Task 1's "Opening a composer" section originally linked to `#lightbulb-actions`, a heading Task 2
  had not created yet. Docusaurus's build reported this as a broken-anchor `WARNING`, which Task
  1's own `<verify>` requires to be absent before commit. Removed the link and described the
  lightbulb entry point in plain prose instead — no link was reintroduced once the heading existed,
  since the prose reads fine standalone and the Lightbulb actions table is one scroll away.
- Verified every command id/title, cue title and lightbulb label programmatically against
  `bbj-vscode/package.json` and `composer-lens-contract.ts` (the plan's own Node one-liner) rather
  than by hand, catching the exact-substring requirement precisely.

## Deviations from Plan

None - plan executed exactly as written. Both `must_haves.artifacts` and all three `must_haves.truths`
in the plan frontmatter are satisfied by the committed content; no auto-fixes, no scope changes.

## Issues Encountered

The docs build reported one `WARNING` (a broken in-page anchor) after Task 1's first draft, caused
by a forward link to a heading only Task 2 creates. Not a plan deviation — a routine authoring
pitfall caught by Task 1's own build-based `<verify>` step before commit; fixed by removing the
link (see Decisions Made) and the rebuild was clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- COMP-01 is a shared requirement with plan 123-07 (IntelliJ half). Per this plan's
  `executor_rules`, it was **not** marked complete in `.planning/REQUIREMENTS.md` — verified via
  `gsd-tools query requirements.ready-ids`, which correctly reports 0/1 ready since
  `123-07-SUMMARY.md` does not exist yet. Plan 123-07 (or its own `update_requirements` step) will
  mark COMP-01 complete once both halves are done.
- `commands.md` and `index.md` are ready for 123-07 to add the IntelliJ Composers page alongside
  this VS Code one without further changes to these two files.
- No blockers or concerns for subsequent phase 123 plans.

## Self-Check: PASSED

- `documentation/docs/vscode/composers.md` — FOUND
- `documentation/docs/vscode/commands.md` — FOUND
- `documentation/docs/vscode/index.md` — FOUND
- Commit `1fa556f8` — FOUND in `git log --oneline --all`
- Commit `a050eb6e` — FOUND in `git log --oneline --all`
- All three `must_haves.truths` re-verified via grep/node checks above: PASS
- Plan-level `<verification>`: both tasks' node/grep checks pass; docs build exits 0 with no
  WARNING lines; `git diff --name-only 8b53253d -- documentation/docs/vscode/` shows exactly this
  plan's three files plus 123-03's five files: PASS

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*
