# Phase 127: VS Code Cut-Over - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-03
**Phase:** 127-vs-code-cut-over
**Areas discussed:** Denumber command targets, Open-file prompt, Decompile vs denumber, Settings migration

---

## Denumber command targets

| Option | Description | Selected |
|--------|-------------|----------|
| Open it, then denumber | Client opens the file, then sends bbj/denum; same behaviour for Explorer and editor | ✓ |
| Remove from Explorer menu | Editor/title/Alt+N only; conflicts with "same menus" | |
| Explorer = denumber on disk | Open, denumber, auto-save; two semantics for one command | |

| Option | Description | Selected |
|--------|-------------|----------|
| Leave dirty | Matches 126 D-14 / DEN-02; user reviews and saves | ✓ |
| Save automatically | Closer to old behaviour; triggers format-on-save | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep menus as-is | LS rejects .bbx if it must | |
| Drop .bbx from denumber menus | | |

**User's choice (.bbx):** free text — ".bbx is also valid for denumbering. The config.bbx file is the outlier - it's the config file despite its extension."
**Notes:** Verified: `.bbx` maps to language `bbj`; `config.bbx` maps to `bbx-config` by filename, so the existing menus already match the user's intent. The `resourceLangId == bbx` clause is dead.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the client guard | Same "no active BBj file" behaviour as Run/Compile | ✓ |
| You decide | | |

---

## Open-file prompt

| Option | Description | Selected |
|--------|-------------|----------|
| "Denumber" | Same word as command and format offer; no save promise | ✓ |
| Keep "Denumber & Replace" | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep client regex | Immediate, works offline; bbj/denum answers mismatches | ✓ |
| Ask the server | Single truth, but needs a new probe and a live BBjServices | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep unchanged | Read-only-in-session as today | ✓ |
| You decide | | |

---

## Decompile vs denumber

| Option | Description | Selected |
|--------|-------------|----------|
| Keep -l in decompile | Output unchanged, works without BBjServices; remove only the text-file denumber path | ✓ |
| Decompile, then bbj/denum | One DENUM engine; needs 26.03 + live BBjServices | |
| Decompile numbered only | Drop -l; user denumbers afterwards | |

---

## Settings migration

| Option | Description | Selected |
|--------|-------------|----------|
| One-time client migration | Copy old key to new key per scope, remove old; deprecated for one release | ✓ |
| LS rule: either true wins | No settings writes; explicit new=false loses to old=true | |
| Deprecation warning only | Fails SET-03 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Just remove the schema | Leftover value is greyed out and dropped by the LS | ✓ |
| Also remove it on activation | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Rich schema | integer bounds, enumDescriptions, markdownDescription, order | ✓ |
| Minimal schema | | |
| You decide | | |

---

## Claude's Discretion

- Wording, enum description texts, setting order/scope, the open-then-denumber wait mechanism,
  migration module placement, deletion-sweep order, CUT-03 step list.

## Deferred Ideas

- Migration note for "Denumber no longer saves to disk" — Phase 130.
