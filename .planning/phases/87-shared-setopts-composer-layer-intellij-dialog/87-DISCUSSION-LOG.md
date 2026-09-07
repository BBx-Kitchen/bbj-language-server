# Phase 87: Shared SETOPTS Composer Layer & IntelliJ Dialog - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 87-shared-setopts-composer-layer-intellij-dialog
**Areas discussed:** IntelliJ launch trigger, Compose-new vs edit-existing scope, Dialog layout for a large catalog

---

## IntelliJ launch trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Editor context-menu action on current line (Recommended) | A right-click / Editor Popup Menu action that scans the current line's raw text for a SETOPTS token — mirrors VS Code's line-scan CodeAction, needs no PSI. | ✓ |
| Plain IntentionAction, PSI-free | IntelliJ IntentionActions can work off raw PsiFile text without a real grammar. | |
| Toolbar/menu command only, no per-line trigger | A single always-visible 'Compose SETOPTS' action operating on whatever SETOPTS line exists. | |

**User's choice:** Editor context-menu action on current line.

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden entirely (Recommended) | update()/isAvailable() returns not-visible when the current line isn't SETOPTS. | ✓ (later superseded — see Scope area) |
| Visible but disabled (greyed out) | Always shows in the menu, greyed out unless the line matches. | |

**User's choice:** Hidden entirely — later refined by the Scope discussion to "hidden outside config files, visible on every line within a config file."

| Option | Description | Selected |
|--------|-------------|----------|
| Context-menu only, no shortcut (Recommended) | Matches MSGBOX/addWindow's baseline. | ✓ |
| Also bind a default keyboard shortcut | Adds discoverability sooner, needs keymap conflict care. | |

**User's choice:** Context-menu only, no shortcut.

**Notes:** The "hidden entirely" answer here was reconciled in the next area once compose-new-with-no-existing-line came up — see below.

---

## Compose-new vs edit-existing scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both — edit existing + compose new (Recommended) | Matches VS Code parity and the roadmap's own wording ("previews, composes, and applies edits"). | ✓ |
| Edit-existing only for v1 | Composing a brand-new line deferred to a later phase. | |

**User's choice:** Both.

| Option | Description | Selected |
|--------|-------------|----------|
| Same context-menu action, always visible in config.bbx (Recommended) | One entry point: edits the SETOPTS line under the caret if present, else composes new at the cursor — mirrors VS Code's argForActiveEditor fallback. | ✓ |
| Two separate actions | One for edit-existing (line-scoped), one always-visible "Compose SETOPTS…" for new. | |

**User's choice:** Same context-menu action, always visible in config.bbx.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — hidden outside config.bbx/config.min files (Recommended) | Scoped exactly like VS Code's BBX_CONFIG language filter. | ✓ |
| Show everywhere but disabled outside config files | Always present in the menu, greyed out outside config files. | |

**User's choice:** Yes — hidden outside config files.

**Notes:** This reconciles the launch-trigger visibility rule: hidden outside config.bbx/config.min files entirely; visible on every line inside one (edit if the line is SETOPTS, else compose-new at cursor).

---

## Dialog layout for a large catalog

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable panel with group headers (Recommended) | One JBScrollPane, section headers per byte-group in catalog order — matches the existing MSGBOX/addWindow dialog shape, just longer. | ✓ |
| Tabbed pane, one tab per byte-group | 7 tabs, keeps each screen short but is a new dialog pattern for this project. | |

**User's choice:** Single scrollable panel with group headers.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — grey out label + tooltip (Recommended) | Uses the existing SetOptsBit.bbj/bbjDetail fields; matches the catalog module's own "de-emphasize no-ops" intent. | ✓ |
| No de-emphasis | All checkboxes look the same. | |

**User's choice:** Grey out label, show bbj/bbjDetail note as a tooltip.

| Option | Description | Selected |
|--------|-------------|----------|
| Live preview, debounced (Recommended) | Preview updates via setoptsPreview as options are toggled, debounced through the Scheduler/Alarm seam. | ✓ |
| Compute only on Apply | No running preview; computed once before writing. | |

**User's choice:** Live preview, debounced.

---

## Claude's Discretion

- Exact context-menu action label/wording, position in the Editor Popup Menu, action ID/class name.
- Whether "the line under the caret" or "the file's first existing SETOPTS line" wins when both exist but the caret sits elsewhere (VS Code's argForActiveEditor precedent prefers the first existing line; flagged in CONTEXT.md for the researcher/planner to confirm rather than leaving fully open).
- Exact `bbj/composer/setopts/*` method names (follow the msgbox/addwindow naming convention).
- Dialog widget choices for the byte 5/6 mask-replacement character fields and the raw-hex tail field.
- Whether "unknown bits" get their own visual callout or fold into the summary text only.
- Debounce interval constant and wiring point for the live preview.

## Deferred Ideas

- A true IntentionAction/lightbulb trigger for the SETOPTS composer (deferred; PSI-free context menu chosen instead).
- A default keyboard shortcut for the composer action.
- Composer discoverability cue (persistent clickable marker) — DISC-01, Phase 89.
- SETOPTS-in-code hovers and the tri-state Set/Clear/Leave composer — DISC-05/DISC-06, Phase 88.
