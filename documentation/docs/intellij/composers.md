---
sidebar_position: 6
title: Composers
---

# Composers

Composers are dialogs that write or edit a BBj call for you: `MSGBOX`, `addWindow`,
`addChildWindow`, `CVS()`, `SETOPTS` in code, and the `SETOPTS` line of the active configuration
file. They take their decoding and validation from the language server, the same server VS Code
uses.

## Opening a composer

There are three ways to open a composer:

1. **The Code Vision cue above a composer call.** A cue — "Compose MSGBOX", "Compose addWindow",
   "Compose addChildWindow", "Compose CVS()" or "Compose SETOPTS" — appears above every eligible
   line. Clicking it runs the internal action "Open BBj Composer at Cue" (`bbj.openComposerAt`),
   which opens the matching composer pre-filled for that specific call. This action has no menu
   entry or keyboard shortcut of its own — it exists only for the cue to invoke.
2. **The Alt+Enter intention on the line.** Placing the caret on or inside a call and pressing
   Alt+Enter offers the matching composer, listed under `Settings > Editor > Intentions > BBj`
   under the family name "BBj visual composer".
3. **The editor context menu.** Right-click in a `.bbj` file (or the active configuration file for
   the config SETOPTS composer) to find every compose action by its menu text.

## MSGBOX

**Compose MSGBOX…** (`bbj.composeMsgbox`) in the editor context menu, and the intention
**Configure MSGBOX options…**, both open the same dialog.

The dialog is position-aware: with the caret on an existing `MSGBOX(...)` call it edits that call
in place (title "Configure MSGBOX"); on a call still being typed (for example `MSGBOX(` or
`MSGBOX("Hi",`) it opens as "Complete MSGBOX call", with no compose-and-replace banner and no
assign-to field; otherwise it composes a new statement (title "Compose MSGBOX").

When the existing call's options expression could not be decoded (for example a variable or an
expression the composer does not understand), the dialog shows a compose-and-replace banner naming
that it could not decode the expression, with the original expression displayed read-only above the
rest of the fields; applying replaces the whole options argument, and the message and title are
preserved unchanged.

Every field — message, title, assign-to, icon, buttons, default button, custom button labels, and
extra options — feeds a debounced preview request to the language server: a burst of typing sends
one preview per settle point, not one per keystroke. OK/Apply stays disabled until a preview
round-trip resolves, and is disabled again the instant another field changes, so it can never be
accepted against a stale or in-flight preview.
