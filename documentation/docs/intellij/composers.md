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

## addWindow and addChildWindow

**Compose addWindow…** (`bbj.composeAddWindow`) and the intention **Configure window flags…** open
the `addWindow` dialog; **Compose addChildWindow…** (`bbj.composeAddChildWindow`) and the intention
**Configure child window flags…** open the matching `addChildWindow` dialog. Both dialogs are
position-aware the same way MSGBOX is: an existing call is edited in place (title "Configure window
flags" / "Configure child window flags", rewriting only the flags and event-mask hex tokens);
otherwise a new statement is composed and inserted at the caret (title "Compose addWindow" /
"Compose addChildWindow").

Each statement field (assign-to, SysGui/parent-window expression, ID, context, title, x, y, width,
height) is validated by the language server as you type, on the same debounced schedule as MSGBOX:
after typing settles, an invalid field shows its message in a red label directly underneath, and
OK/Apply stays disabled until every field is valid. Window flags and the opt-in event mask are
grouped checkboxes; the generated statement and a schematic preview update on the same debounce.

## CVS()

**Compose CVS()…** (`bbj.composeCvs`) and the intention **Configure CVS() options…** open the
`CVS(...)` dialog. It is position-aware like MSGBOX: a cursor with no `CVS()` call composes a new
one; a cursor on an existing, safely-editable call (a plain literal bit-sum mask) opens "Configure
CVS()" and edits only its bits, leaving the string expression untouched; a cursor on an unfinished
call opens "Complete CVS() call" with an editable string field and no assign-to field. A call whose
mask is not a plain literal sum cannot be edited safely — invoking the action or intention on it
shows the server's reason instead of opening a dialog.

The bits are one flat, titled list of checkboxes applied in ascending order. The replacement
characters field stays **disabled, not hidden**, unless a bit that uses it is checked.

## SETOPTS in code

The action **Configure SETOPTS Options in Code…** (`bbj.composeSetoptsInCode`) is a second way in
that avoids the Alt+Enter intention search entirely; the intention **Configure SETOPTS options in
code…** offers the same dialog from the lightbulb. Both open the tri-state Set/Clear/Leave composer
for the `var$=OPTS` … `SETOPTS var$` reassignment chain.

Invoking it on an existing, safely-editable chain opens the composer pre-selected from that chain's
current state; applying it rewrites only the reassignment lines between the `OPTS` origin and the
`SETOPTS` line. Invoking it where there is no chain nearby inserts a brand-new block at the start of
the line. When a chain exists but cannot be rewritten safely, the server's own reason is shown
instead of opening a composer.

## config.bbx SETOPTS

**Compose SETOPTS…** (`bbj.composeSetopts`) is available only from the resolved configuration
file's own editor context menu — it never appears in a `.bbj` file. It edits that file's `SETOPTS`
line only; applying a change never restarts the language server.

## Actions and intentions

| Kind | Text | ID | Where it shows |
|------|------|----|-----------------|
| Action | Compose MSGBOX… | `bbj.composeMsgbox` | Editor context menu |
| Action | Compose addWindow… | `bbj.composeAddWindow` | Editor context menu |
| Action | Compose addChildWindow… | `bbj.composeAddChildWindow` | Editor context menu |
| Action | Compose SETOPTS… | `bbj.composeSetopts` | Editor context menu, config file only |
| Action | Configure SETOPTS Options in Code… | `bbj.composeSetoptsInCode` | Editor context menu, BBj source files only |
| Action | Compose CVS()… | `bbj.composeCvs` | Editor context menu |
| Action | Open BBj Composer at Cue | `bbj.openComposerAt` | Invoked only by a Code Vision cue click; no menu entry |
| Intention | Configure MSGBOX options… | — | Alt+Enter, family "BBj visual composer" |
| Intention | Configure window flags… | — | Alt+Enter, family "BBj visual composer" |
| Intention | Configure child window flags… | — | Alt+Enter, family "BBj visual composer" |
| Intention | Configure SETOPTS options in code… | — | Alt+Enter, family "BBj visual composer" |
| Intention | Configure CVS() options… | — | Alt+Enter, family "BBj visual composer" |

## Assign-to validation

Composing a **new** MSGBOX or CVS() call shows an **"Assign result to"** field. It is required —
leaving it empty shows **"Required"** and OK/Apply stays disabled — and pre-filled with `ret!` for
MSGBOX or `s$` for CVS(), matching each function's own result type.

- MSGBOX needs a numeric or object variable: no sigil, `%` or `!`, with one optional `[...]`
  subscript allowed (`ret`, `ret!`, `r[1]`). Anything else shows the label
  **"Not a numeric or object variable — e.g. ret, ret! or r[1]"**.
- CVS() needs a string or object variable: a `$` or `!` sigil (`s$`, `s!`, `s$[1]`). Anything else
  shows the label **"Not a string or object variable — e.g. s$, s! or s$[1]"**.

Editing an existing call, or completing an unfinished one, shows no assign-to field at all.
