---
sidebar_position: 6
title: Composers
---

# Composers

Composers are visual editors that write or edit a BBj call for you: `MSGBOX`, `addWindow`,
`addChildWindow`, `CVS()`, `SETOPTS` in code, and the `SETOPTS` line of the active configuration
file.

## Opening a composer

There are three ways to open a composer:

1. **The cue above a composer call.** A plain-text link — "Compose MSGBOX", "Compose addWindow",
   "Compose addChildWindow", "Compose CVS()" or "Compose SETOPTS" — appears directly above every
   eligible line. Clicking it opens the matching composer pre-filled for that specific call. No
   cue appears above a call inside a comment or a string literal, a CVS() call whose mask is not a
   plain bit sum (it cannot be edited safely), or an in-code SETOPTS shape the composer cannot
   edit safely (for example a chain interrupted by `IF`/`FI`).
2. **The lightbulb / `Ctrl+.` on the line.** Placing the cursor on or inside a call and invoking
   the lightbulb (Quick Fix) offers the same composer, labeled for what it will do.
3. **The editor context menu or the Command Palette.** Right-click in a `.bbj` file (or the active
   config file for the config SETOPTS composer) or open the Command Palette and type "BBj:" to
   find every compose command by its title.

## MSGBOX

Two commands compose a `MSGBOX` call:

- **Compose MSGBOX…** (`bbj.composeMsgbox`) — a step-by-step QuickPick wizard: icon, button set,
  default button, then extra options.
- **Compose MSGBOX (visual)…** (`bbj.composeMsgboxVisual`) — a visual panel with a schematic
  dialog preview and the generated statement.

Both commands, and the cue, are position-aware: with no cursor on an existing call they compose a
new statement at the cursor; with the cursor on or inside an existing call they edit that call in
place, never nesting a new statement inside it.

The lightbulb on an existing call offers one of these labels, depending on the call's shape:

- **"Configure MSGBOX options (…)"** — the call already has a decodable numeric options
  expression; the parenthesized text summarizes the current icon/buttons/flags.
- **"Add MSGBOX options…"** — a bare `MSGBOX("...")` call with no options argument yet.
- **"Compose MSGBOX options (replaces expression)…"** — the options argument could not be decoded
  (for example a variable or an expression the composer does not understand). The panel shows the
  banner "Could not decode this options expression — composing will replace it." with the original
  expression displayed read-only; pressing Insert replaces the whole options argument with no
  extra confirmation, and the message and title are preserved unchanged.
- **"Complete MSGBOX call…"** — the call has no message yet, or its options slot is open but empty
  (for example `MSGBOX(`, `MSGBOX()`, or `MSGBOX("Hi",`). The panel is titled "Complete MSGBOX
  call", shows no compose-and-replace banner and no assign-to field, and Insert replaces the whole
  unfinished call.

If the document changes between opening the composer and pressing Insert — for example the line
was edited in another tab, or more characters were typed while the panel was open — the call is
re-checked against the live document immediately before writing. On any mismatch nothing is
applied, and the message "The MSGBOX() call changed since the composer opened; nothing was
applied." is shown instead.
