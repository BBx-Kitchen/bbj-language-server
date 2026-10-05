# Phase 126: LS DENUM - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-02
**Phase:** 126-ls-denum
**Areas discussed:** Diagnostics list surface, Format offer flow, Who presents outcomes, Edit shape & undo

---

## Diagnostics list surface

| Option | Description | Selected |
|--------|-------------|----------|
| Server notification | Host-neutral notification carrying the list; each IDE renders it | ✓ |
| LS log channel only | Server writes the list to its own log | |
| Virtual document | showDocument of a read-only listing | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated 'BBj DENUM' channel | New channel, cleared per run | |
| Existing 'BBj' log channel | Append with a header per run | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Only if diagnostics > 0 | Clean run shows only the confirmation | ✓ |
| Always, with counts | Includes "0 problems" | |

| Option | Description | Selected |
|--------|-------------|----------|
| Success only | Failures carry no diagnostics | ✓ |
| Also clear on failure | Avoid stale list | |

---

## Format offer flow

| Option | Description | Selected |
|--------|-------------|----------|
| Explain + [Denumber] (range) | One click away from fixing it | ✓ |
| Explain only | Plain warning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Act on current buffer (late click) | Read text/version at click time, versioned edit | ✓ |
| Refuse if changed | Ask to format again | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same deduped offer on save | Dedup per document + version | ✓ |
| You decide | | |

---

## Who presents outcomes

| Option | Description | Selected |
|--------|-------------|----------|
| Server, both paths | One wording; 127/128 thin | ✓ |
| Client, compile precedent | Each IDE presents | |

| Option | Description | Selected |
|--------|-------------|----------|
| No dedup for DENUM runs | Explicit action always answered | ✓ |
| Same dedup as 125 | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Always answer env errors | Incl. "BBjServices is not reachable" | ✓ |
| Mirror 125 exactly | Once per generation, not-connected logs only | |

---

## Edit shape & undo

| Option | Description | Selected |
|--------|-------------|----------|
| Server applies, both paths | workspace/applyEdit, result also returns edit | ✓ |
| Client applies (DEN-01 literal) | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal line diff | wholeDocumentChangeAsRange | ✓ |
| Whole-document replace | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Info ok / Warning fail | | ✓ |
| Warning for all | | |

---

## Claude's Discretion

Message wording beyond fixed texts, notification/DTO names, reason vocabulary, canonicalName, where the DENUM core lives, concurrency of overlapping runs.

## Deferred Ideas

DEN-07 Problems-view merge (future). Roadmap note: 127/128 shrink to sending `bbj/denum`.
