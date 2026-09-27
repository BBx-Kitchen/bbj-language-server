# Phase 113: Composer Webview Hardening & Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-27
**Phase:** 113-composer-webview-hardening-consolidation
**Areas discussed:** Message validation, assignTo rules, Consolidation layout

---

## Message validation

| Option | Description | Selected |
|--------|-------------|----------|
| All six | Include CVS and SETOPTS tristate; amend SEC-10 | ✓ |
| Only the four named | Keep roadmap scope, todo for the rest | |

| Option | Description | Selected |
|--------|-------------|----------|
| Drop silently | No toast/log; matches `if (!r.valid) break` | ✓ |
| Drop + console.warn | Extension host console only | |
| Drop + warning toast | Visible warning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Full payload shape | Known type + every Selection field correctly typed | ✓ |
| Type + fields build() reads | Ignore extra keys | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Shared tiny helpers + per-panel guard | No new dependency | ✓ |
| zod | Declarative schemas, new runtime dep | |
| Inside registerPanelMessageHandler | Lifecycle helper takes a guard | |

**User's choice:** all recommended options.

---

## assignTo rules

| Option | Description | Selected |
|--------|-------------|----------|
| Plain numeric var or array element | `ret`, `ret!`, `r[i+1]` | ✓ |
| Plain identifier only | | |
| Any validateBbjExpression | Structural only | |

| Option | Description | Selected |
|--------|-------------|----------|
| CVS too, string rules | `s$`, `s!`, `s$[i]` | ✓ |
| msgbox only | Todo for CVS | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same as other fields | Inline error, preview invalid, Insert disabled | ✓ |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Empty stays valid | Field labelled optional today | |
| Require it | | ✓ (free text: "Require it for MSGBOX and CVS") |

Follow-up (field hidden in edit/completing modes):

| Option | Description | Selected |
|--------|-------------|----------|
| Only new inserts | Keep `ret!` prefill, CVS gets a prefill | ✓ |
| New inserts, no prefill | | |
| Everywhere | Show/require in edit + completing modes | |

**Notes:** Scout found the IntelliJ Msgbox/Cvs dialogs carry the same "(optional)" field and read the LS preview. The required rule therefore needs a small IntelliJ UI change (error display, label) and an `assignToError` model field, recorded as a consequence in D-09.

---

## Consolidation layout

| Option | Description | Selected |
|--------|-------------|----------|
| One module per concern | webview-csp.ts, composer-call-scanner.ts, window UI shared, message guards | ✓ |
| One composer-shared.ts | | |
| New src/composer/ folder | | |

| Option | Description | Selected |
|--------|-------------|----------|
| One generic locator, 4 thin wrappers | Exports + assertions unchanged | ✓ |
| Replace the exports | | |

| Option | Description | Selected |
|--------|-------------|----------|
| src/composer-commands.ts | Matches roadmap | ✓ |
| src/composer/composer-commands.ts | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Include CVS/tristate | Shared CSP + scanner everywhere | ✓ |
| Only the named four | | |

---

## Todos

Four keyword-only matches reviewed; none folded (user: "Fold none").

## Claude's Discretion

- Guard placement (per handler vs. `registerPanelMessageHandler` argument), exact new module names, CVS `assignTo` prefill value, how tests post wrong-shaped messages.

## Deferred Ideas

None.
