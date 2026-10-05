# Phase 128: IntelliJ DENUM - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-03
**Phase:** 128-intellij-denum
**Areas discussed:** Banner behaviour, Diagnostics display, Action reach

---

## Banner behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Denumber + Dismiss | Dismiss hides for the session; no read-only option | |
| Denumber + Dismiss + Don't show again | Persistent opt-out via new BbjSettings field | |
| Denumber only | Banner stays until denumbered | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Java port of the client regex | Same rule as isLineNumberedSource, pinned by test | ✓ |
| Ask the language server | New request, round trip | |

| Option | Description | Selected |
|--------|-------------|----------|
| On open and after each change | Banner goes after DENUM, returns on undo | ✓ |
| Only on open, hide after click | Simpler, can be stale | |

| Option | Description | Selected |
|--------|-------------|----------|
| No special cases | Base guard is enough; server messages cover the rest | ✓ |
| Hide on non-writable files | Check VirtualFile.isWritable() | |

---

## Diagnostics display

| Option | Description | Selected |
|--------|-------------|----------|
| BBj console only | Block per run in "BBj Language Server" console | ✓ |
| Console + editor highlights | Plus markup highlights cleared on edit | |
| Editor highlights only | No console copy | |

| Option | Description | Selected |
|--------|-------------|----------|
| Open the BBj console tool window | Activate tool window, payload ignored | ✓ |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, plain text | Keeps 126 "no link" contract | ✓ |
| Yes, go-to-line links | Would need contract rewording | |

---

## Action reach

| Option | Description | Selected |
|--------|-------------|----------|
| Tools and editor menus only | Exactly IJF-05 | ✓ |
| Also Project View, open file first | Mirrors VS Code 127 D-01 | |

| Option | Description | Selected |
|--------|-------------|----------|
| No shortcut | Rare operation | ✓ |
| Yes | Pick a free one | |

| Option | Description | Selected |
|--------|-------------|----------|
| Next to Compile | After bbj.compile / Compile BBj File | ✓ |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Any BBj program file | Server says "nothing to do" on unnumbered | |
| Only when the file looks line-numbered | Grey out otherwise; regex on update | ✓ |

---

## Claude's Discretion

- Banner text and status style; console block layout; helper placement; change-listener/debounce; debug logging of DenumResult.

## Deferred Ideas

- Editor highlights for DENUM diagnostics in IntelliJ; Project View entry with open-then-denumber.
- Todos reviewed, none folded (user: keep lean).
