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

## addWindow and addChildWindow

- **Compose addWindow (visual)…** (`bbj.composeAddWindow`) — composes or edits a
  `sysgui!.addWindow(...)` call: position, size, title, window flags and the event mask.
- **Compose addChildWindow (visual)…** (`bbj.composeAddChildWindow`) — the same panel shape for
  `window!.addChildWindow(...)`: parent window, ID, context, position, size, title, flags and
  event mask.

Both panels validate every statement field (position, size, title expression) as you type: a
malformed field gets a red border and a message underneath — for example `Not a number — remove
the quotes: 10`, `Not a string — quote it as "caption"…`, or `Unbalanced parentheses` — and Insert
stays disabled until every field is valid. Leaving a field empty uses its default (`0` for
position/size, `""` for the title), so an all-empty addWindow call composes
`sysgui!.addWindow(0, 0, 0, 0, "", $00010003$)`.

The lightbulb on an existing call offers:

- **"Configure window flags (…)"** / **"Configure child window flags (…)"** — the call already
  carries a flags value; the parenthesized text summarizes the current flags.
- **"Add window flags…"** / **"Add child window flags…"** — a call with no flags argument yet.
  addChildWindow's no-title overloads cannot take flags at all, so a call with neither an existing
  flags value nor a place to insert one gets no lightbulb action.

## CVS()

**Compose CVS() (visual)…** (`bbj.composeCvs`) composes or edits a `CVS(...)` call: the string
expression, the bit operations (applied in ascending order), and an optional replacement-chars
field. The chars field stays **disabled, not hidden**, unless a bit that uses it (1, 2, 16, 32 or
128) is checked.

The command and cue are position-aware, like MSGBOX: a cursor with no CVS() call composes new; a
cursor on an editable call (a plain literal bit-sum mask) edits it in place; a cursor on an
unfinished call (for example `a$ = CVS(name$`) opens complete-the-call mode. A call whose mask is
not a plain literal sum — a variable, or an undocumented bit — cannot be edited safely and gets no
lightbulb action; running the command on it shows the server's reason instead of opening a panel.

The lightbulb on an existing call offers:

- **"Configure CVS() options (…)"** — an editable literal-mask call; the parenthesized text
  summarizes the current bits.
- **"Complete CVS() call…"** — an unfinished or mask-less call. The panel opens with an editable
  string field and no assign-to field, and Insert replaces the whole unfinished call.

## SETOPTS in code

**Compose SETOPTS in code (visual)…** (`bbj.composeSetoptsInCode`) edits the tri-state
`var$=OPTS` / `var$=IOR(var$,$..$)` or `var$=AND(var$,$..$)` / `SETOPTS var$` reassignment chain
that sets options through a variable, rather than a single absolute `SETOPTS $..$` literal. The
lightbulb label is **"Compose SETOPTS block…"**.

Invoking it on an existing, safely-editable chain opens a composer with one Set/Clear/Unchanged
choice per option; applying it rewrites only the reassignment lines between the `OPTS` origin and
the `SETOPTS` line, leaving those two lines themselves unchanged. Invoking it where there is no
chain nearby inserts a brand new `var$=OPTS` … `SETOPTS var$` block at the start of the line. When
a chain exists but cannot be rewritten safely — for example one of its statements shares its
physical line with other code, or the chain is interrupted by an `IF`/`FI` — a message names why,
and no composer opens.

## config.bbx SETOPTS

**Compose config.bbx SETOPTS (visual)…** (`bbj.composeConfigSetopts`) edits the absolute
`SETOPTS $..$` line of the active BBj configuration file. It is available only from that file's
own editor context menu and Command Palette (language id `bbx-config`), never in `.bbj` files. One
cue appears per SETOPTS line in the file; the cue and the lightbulb both edit that line only — no
other line is touched — and applying a change never restarts or reloads the language server.

## Lightbulb actions

| Composer | Label |
|----------|-------|
| MSGBOX | Configure MSGBOX options (…) |
| MSGBOX | Add MSGBOX options… |
| MSGBOX | Compose MSGBOX options (replaces expression)… |
| MSGBOX | Complete MSGBOX call… |
| addWindow | Configure window flags (…) |
| addWindow | Add window flags… |
| addChildWindow | Configure child window flags (…) |
| addChildWindow | Add child window flags… |
| CVS() | Configure CVS() options (…) |
| CVS() | Complete CVS() call… |
| SETOPTS in code | Compose SETOPTS block… |
| config.bbx SETOPTS | Configure SETOPTS (…), or Compose SETOPTS… with no existing line |

## Assign-to validation

Composing a **new** MSGBOX or CVS() call shows an **"Assign result to"** field — with no
"(optional)" marker, because it is always required. It is pre-filled with `ret!` for MSGBOX and
`s$` for CVS(), matching each function's own result type.

- Leaving it empty shows **"Required"** and Insert stays disabled.
- MSGBOX returns a number, so the target must be a numeric or object variable — no sigil, `%` or
  `!` — with one optional `[...]` subscript allowed (`ret`, `ret!`, `r[1]`). Anything else shows
  **"Not a numeric or object variable — e.g. ret, ret! or r[1]"**.
- CVS() returns a string, so the target needs a `$` or `!` sigil (`s$`, `s!`, `s$[1]`). Anything
  else shows **"Not a string or object variable — e.g. s$, s! or s$[1]"**.

Editing an existing call, or completing an unfinished one, shows no assign-to field at all — the
existing assignment (or lack of one) is preserved as written.
