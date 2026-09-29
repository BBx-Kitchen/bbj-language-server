# Phase 111: Java Class Data from the Interop Peer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 111-java-class-data-from-the-interop-peer
**Mode:** `--auto`. All gray areas were auto-selected, and each question took the recommended option.
**Areas discussed:** Peer response bounds, Markdown escape point, `use` name validation, FIX-02 fix location, FIX-03 exemption scope and wording

[auto] Selected all gray areas: Peer response bounds, Markdown escape point, use-name validation, FIX-02 fix location, FIX-03 exemption scope and wording.
[auto] Todos: fold rule is score >= 0.4, and 4 todos matched at 0.6. Folded only the FIX-03 todo, which the roadmap already names. The other 3 are assigned to Phases 114/116 or are outside this phase's boundary. Folding them would widen a roadmap-fixed phase, so the scope guardrail overrides the auto-fold rule.

---

## Peer response bounds (SEC-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Guard at `resolveClass` entry; drop bad members, truncate free text, fixed constants | Covers the bulk path; the class still resolves | ✓ |
| Reject the whole class on any bad field | Simpler, but one bad member hides the whole class | |
| Configurable limits (settings) | More surface for no user need | |

[auto] Peer bounds — Q: "Where and how are peer fields validated?" → Selected: "Guard at resolveClass entry, drop/truncate, fixed constants" (recommended default)

## Markdown escape point (SEC-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Escape at render (hover/completion), store bounded-but-raw | One escape per render site, no double escaping | ✓ |
| Escape at storage in `resolveClass` | #523 wording, but double-escapes the hover fallback path and pollutes non-Markdown consumers | |
| Escape raw javadoc before JSDoc→Markdown conversion | Keeps `{@code}` formatting but lets `{@link url}` render as a link, which fails criterion 2 | |

[auto] Escape — Q: "Where is Markdown escaped?" → Selected: "At render, after conversion" (recommended default)

## `use` name validation (SEC-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Shared Java-qualified-name predicate; drop invalid silently; next valid candidate becomes preferred | Matches criterion 3 ("insert nothing") | ✓ |
| Sanitize (strip bad characters) and insert | Inserts a name the peer never sent | |

[auto] use-name — Q: "What happens to an invalid fqn?" → Selected: "Drop silently, keep preferred on next valid" (recommended default)

## FIX-02 fix location

| Option | Description | Selected |
|--------|-------------|----------|
| Trace and fix the caller, plus a defensive `storeJavaClass` guard; keep the log for real anomalies | Follows the roadmap note "stop the bad request" | ✓ |
| Downgrade the log to debug | Roadmap says this alone is not enough | |

[auto] FIX-02 — Q: "How is the log line removed?" → Selected: "Fix the caller (research gate), defensive guard" (recommended default)

## FIX-03 exemption scope and wording

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit `javaMemberAccess` flag on linking data; only that Warning exempt from Rule 2; reword only that case | Narrow, mirrors `instanceMemberAccess` | ✓ |
| Exempt all linking Warnings from Rule 2 | Brings back cascade noise that Rule 2 exists to hide | |
| Reword every linking message | Out of FIX-03's scope; risks tests matching on text | |

[auto] FIX-03 — Q: "Which Warnings survive Rule 2, and what is reworded?" → Selected: "Flagged Java-member Warning only" (recommended default)

---

## Claude's Discretion

- Helper module name and exports, escape implementation, optional `tryParseJavaDoc` dedup, test layout.

## Deferred Ideas

- Rewording other "NamedElement" linking messages.
- A VAL-03 downgrade setting (Phase 107 D-11).
- Reviewed todos not folded: linking warm-up failures (Phase 116), phase 97 follow-ups (Phase 114), IntelliJ interop init-option key mismatch (outside the boundary; left pending).
