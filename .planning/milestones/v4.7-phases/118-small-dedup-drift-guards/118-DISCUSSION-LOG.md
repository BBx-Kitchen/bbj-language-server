# Phase 118: Small Dedup & Drift Guards - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-28
**Phase:** 118-small-dedup-drift-guards
**Areas discussed:** .bbl mirrors: fate & repair, Compiler-option test scope, Catalog closing shape, getFunctionReference home

---

## .bbl mirrors: fate & repair

| Option | Description | Selected |
|--------|-------------|----------|
| Keep + drift test | Hand-synced mirrors plus a vitest comparison (roadmap criterion 3) | ✓ |
| Generate at build time | Build script writes .bbl from .ts; test guards committed output | |
| Delete the .bbl files | Nothing at runtime reads them; criterion 3 would need rewording | |

| Option | Description | Selected |
|--------|-------------|----------|
| .ts wins everywhere | Regenerate each .bbl from its .ts body; no runtime change | ✓ |
| Review each difference | Carry .bbl-only fixes back into .ts hunk by hunk | |

| Option | Description | Selected |
|--------|-------------|----------|
| Exact after unescaping | Byte-for-byte after \` unescape and CRLF normalisation | ✓ |
| Whitespace-tolerant | Ignore blank-line/trailing-space differences | |

**User's choice:** Keep + drift test; .ts wins; exact comparison.
**Notes:** Scout found that all four pairs had drifted. events.bbl still has the duplicate MOUSE entries that v4.0 merged in events.ts, and functions differs by about 260 diff lines.

---

## Compiler-option test scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keys + default + type | Roadmap criterion 4 plus type; passes today | ✓ |
| Also descriptions | Unify 19 differing descriptions and compare them | |
| Keys + default + type + flag mention | Require package.json description to mention the flag | |

| Option | Description | Selected |
|--------|-------------|----------|
| Named exemption in the test | Allow-list bbj.compiler.trigger with a reason | ✓ |
| Scope the test by group | Only compare the table's namespaces | |

| Option | Description | Selected |
|--------|-------------|----------|
| Test closes it | Test is the sync mechanism; no generator | ✓ |
| Also generate package.json block | Script writes the block; test checks currency | |

**User's choice:** Keys + default + type; named exemption for trigger; the test closes #606.

---

## Catalog closing shape

| Option | Description | Selected |
|--------|-------------|----------|
| `library … `; — no trim | Backtick directly followed by `library`, closing backtick + `;`, no trim | ✓ |
| `\nlibrary … `.trimStart(); | Leading newline plus trimStart in all four | |
| `\nlibrary … `; + test strips one newline | Uniform leading newline; test drops it | |

**User's choice:** `library … `; with no trim call.

---

## getFunctionReference home

| Option | Description | Selected |
|--------|-------------|----------|
| utils.ts free fn, methods removed | Direct calls from both providers | ✓ |
| utils.ts free fn, methods delegate | Keep one-line protected wrappers | |
| New module (e.g. method-call-utils.ts) | Dedicated call-site helper module | |

**User's choice:** utils.ts free function; both protected methods removed.

---

## Claude's Discretion

- Drift test file names/placement, table-driven shape, imports, plan split and ordering.

## Deferred Ideas

- None raised. Three keyword-matched todos were reviewed and left out as unrelated (see CONTEXT.md).
