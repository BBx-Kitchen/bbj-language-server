# Phase 92: Host-Side Hygiene & Focus Guards - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-13
**Phase:** 92-host-side-hygiene-focus-guards
**Areas discussed:** Stale .lst handling (#500), No-editor guard (#512), Format race (#499), Widget file rules (#610)

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| None — keep lean | All four keyword matches were reviewed and deferred in Phase 91; none touches decompile, format, commands, activation or the widgets | ✓ |
| Fold some | Name which ones | |

**User's choice:** None — keep lean

---

## Stale .lst handling (#500)

**How should Decompile tell a fresh .lst from one left over by an earlier run?**

| Option | Description | Selected |
|--------|-------------|----------|
| Delete leftover first | Remove `<file>.lst` before bbjlst runs; the wait then only checks size settling (Pitfall 9's preferred fix) | ✓ |
| Mtime slack | Keep the mtime check with a documented ~2 s slack; a leftover under ~2 s old would pass | |
| Both | Delete first and keep a slackened mtime check as a second layer | |

**User's choice:** Delete leftover first

**If a leftover `.lst` exists but can't be deleted, what should Decompile do?**

| Option | Description | Selected |
|--------|-------------|----------|
| Abort with a message | Don't run bbjlst; show the existing "Failed to decompile" error naming the leftover and the reason | ✓ |
| Run anyway, keep old check | Log it and fall back to the mtime check for that run | |

**User's choice:** Abort with a message

---

## No-editor guard (#512)

**Which file should Run / Run BUI / Run DWC / Compile / Denumber act on?**

| Option | Description | Selected |
|--------|-------------|----------|
| Passed file first | Argument, then active editor, then message; reuses resolveTargetFileName; fixes Explorer right-click running the focused file | ✓ |
| Active editor first | Keep today's order, add only the undefined guard | |

**User's choice:** Passed file first

**If the focused editor is not a BBj file and no file is passed, what happens?**

| Option | Description | Selected |
|--------|-------------|----------|
| Show the message too | Treat it as "no active BBj file" using the menus' bbj/bbx when-clause rule | ✓ |
| Only guard the missing case | Message only with no editor and no argument | |

**User's choice:** Show the message too

**How should the message appear, and where?**

| Option | Description | Selected |
|--------|-------------|----------|
| Warning, all 7 commands | One shared warning for Run, Run BUI, Run DWC, Compile, Denumber and both Decompile commands (which return silently today) | ✓ |
| Warning, only the 5 that throw | Decompile commands keep returning silently | |
| Error toast, all 7 | Same coverage as an error message | |

**User's choice:** Warning, all 7 commands

---

## Format race (#499)

**How should overlapping format requests for the same file be handled?**

| Option | Description | Selected |
|--------|-------------|----------|
| Share only identical text | Reuse the in-flight format only for identical content, otherwise start a fresh one (Pitfall 10's fix) | ✓ |
| Drop sharing entirely | Every request spawns its own java process; loses the Save All dedupe | |
| Accept and document | No code change; record the narrow window as accepted residual | |

**User's choice:** Share only identical text

---

## Widget file rules (#610)

**Which selected files should make the two IntelliJ status-bar widgets visible?**

| Option | Description | Selected |
|--------|-------------|----------|
| Match BBj file type | One shared check on the BBj file type (bbj, bbjt, src, bbx); adds .bbx, drops .bbl | ✓ (with note) |
| Keep today's list | Only add the tab-switch trigger | |
| Today's list plus .bbx | Add .bbx, keep .bbl | |

**User's choice:** Match BBj file type
**Notes:** "keep an eye on .bbx - config.bbx is the config file!" → follow-up question below. Code
check: IntelliJ gives the config file (config.bbx or the custom configured one) `BbjConfigFileType`
via `BbjConfigFileTypeOverrider`, so a file-type check separates it from ordinary `.bbx` programs
while an extension check would not.

**When the config file is the selected tab, should the widgets show?**

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden | Decide by BBj file type, never extension; the config file hides them whatever its name | ✓ |
| Language-server widget only | Show server status on the config file, hide the Java-interop widget | |
| Both visible | Treat the config file like BBj source | |

**User's choice:** Hidden

**How should the tab-switch fix be proven?**

| Option | Description | Selected |
|--------|-------------|----------|
| JUnit + one live check | Plain-JUnit decision test, source guard on the FILE_EDITOR_MANAGER subscription, one live UAT tab-switch step | ✓ |
| Automated only | Seam test and source guard, no live step | |

**User's choice:** JUnit + one live check

---

## Wrap-up

#531 (re-activation cleanup) was not selected for discussion; its recorded default (push every
`activate()` registration onto `context.subscriptions`, plus a double-`activate()` regression test)
was restated in the final question and the user chose "I'm ready for context".

## Claude's Discretion

- #500: location of the delete helper; test mechanics independent of real mtime granularity.
- #512: warning wording; check ordering; Decompile commands' active-editor rule; test shape.
- #499: in-flight map shape and slot ownership after a mismatch.
- #531: disposal beyond `activate()`'s direct registrations, only if the double-activate test needs it.
- #610: seam shape; EDT handling.
- VS Code UAT steps beyond the IntelliJ tab-switch check.

## Deferred Ideas

- Replace the plugin's other hard-coded BBj extension lists (`BbjRunActionBase`,
  `BbjRestartServerAction`, `BbjServerCrashNotificationProvider`) with the same file-type check.
- `when` clauses on the alt+g/b/d/c/n keybindings.
