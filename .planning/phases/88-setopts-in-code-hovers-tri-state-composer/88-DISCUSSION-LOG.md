# Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 88-setopts-in-code-hovers-tri-state-composer
**Mode:** `--auto` — fully autonomous, no interactive session. Every gray area below was
auto-resolved to its recommended option per `workflows/discuss-phase/modes/auto.md`, using
milestone research (FEATURES.md, PITFALLS.md, ARCHITECTURE.md) and Phase 87's precedent as the
evidence base.
**Areas discussed:** Hover delivery mechanism, hover scope & content, tri-state composer
trigger, compose-new vs. edit-in-place scope, tri-state form UI, performance guardrail.

---

## Hover delivery mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Language-server-only hover (generic LSP surface) | Extend `BBjHoverProvider`; both IDEs get it via standard `textDocument/hover`, zero IntelliJ Java code | ✓ |
| Bespoke per-IDE hover UI | Custom rendering matching the composer-dialog pattern | |

**Selected:** Language-server-only hover (recommended default).
**Notes:** [auto] Hover — Q: "Does SETOPTS-in-code hover decode need per-IDE UI work like the
composer dialogs did?" → Selected: "No — generic LSP hover, zero new IntelliJ code" (recommended
default). Rationale: hover, completion, and diagnostics already reach both IDEs through the
shared LS with no IntelliJ-specific code; only `bbj/composer/*` custom requests needed native
Swing UI because they are not standard LSP surface.

---

## Hover scope & content

| Option | Description | Selected |
|--------|-------------|----------|
| DISC-05 verbatim (absolute literal, OPTS-chain, single IOR/AND call; AND masks as cleared bits) | Exact requirement wording | ✓ |
| Broader heuristic decode (best-effort on any shape) | Attempt decode even on statically-unsafe shapes | |

**Selected:** DISC-05 verbatim.
**Notes:** [auto] Hover scope — Q: "How far should hover decode reach?" → Selected: "Exactly
the three DISC-05 shapes, AND masks framed as cleared bits" (recommended default — matches the
requirement text and FEATURES.md's tiering, avoids the "decode-and-edit for every shape"
anti-feature bleeding into hover too).

---

## Tri-state composer trigger

| Option | Description | Selected |
|--------|-------------|----------|
| `IntentionAction` (lightbulb) on IntelliJ, CodeAction/CodeLens on VS Code | Matches `ConfigureMsgboxIntention`'s existing shape for in-code composers | ✓ |
| PSI-free context-menu action (Phase 87's config.bbx pattern) | Reuse the `config.bbx` trigger shape | |

**Selected:** IntentionAction / CodeAction (recommended default).
**Notes:** [auto] Trigger — Q: "Should the in-code composer use the config.bbx PSI-free
action pattern or the existing in-code Intention pattern?" → Selected: "Intention/CodeAction"
(recommended default). Rationale: `.bbj` files have full PSI/AST, unlike `config.bbx`
(Phase 87 D-01's reason for going PSI-free); no reason to diverge from the
Msgbox/addWindow/addChildWindow intention precedent.

---

## Compose-new vs. edit-in-place scope

| Option | Description | Selected |
|--------|-------------|----------|
| Edit-in-place limited to the two statically-safe shapes (DISC-06) | Absolute literal; canonical `var$=OPTS`...`SETOPTS var$` block | ✓ |
| Attempt edit-in-place on any recognizable shape | Wider "convenience" scope | |

**Selected:** Limited to the two safe shapes (recommended default — this is not really a
discretionary choice, it is DISC-06's explicit design and FEATURES.md's named anti-feature).
**Notes:** [auto] Edit scope — Q: "Should edit-in-place ever be offered beyond the two
statically-safe shapes?" → Selected: "No — hover-only for everything else" (recommended
default, binding per requirement text).

---

## Tri-state form UI

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Phase 87's byte-grouped dialog layout, swap checkboxes for 3-state controls | Visual and code consistency with the existing SETOPTS composer | ✓ |
| Design a new layout from scratch | Independent visual design | |

**Selected:** Reuse Phase 87's layout shape (recommended default).
**Notes:** [auto] Form UI — Q: "New layout or reuse Phase 87's dialog shape?" → Selected:
"Reuse — swap checkbox for tri-state control" (recommended default). Rationale: keeps the two
SETOPTS composers visually consistent and reuses catalog-rendering code (`BYTE_GROUPS`
iteration, bbj-annotation greying, debounced preview) rather than duplicating it.

---

## Performance guardrail

| Option | Description | Selected |
|--------|-------------|----------|
| Hook into the existing document-build/validation debounce cycle | Matches Pitfall 11's fix direction | ✓ |
| Independent full-AST walk per hover/keystroke | Simpler to implement, reintroduces the #505-class cost | |

**Selected:** Hook into the existing debounce cycle (recommended default, and binding — this
is Success Criterion 4 of the phase, not a preference).
**Notes:** [auto] Performance — Q: "How should SETOPTS-in-code detection avoid Pitfall 11's
full-AST-walk-per-keystroke risk?" → Selected: "Hook into the existing document-build cycle or
a cache invalidated by it" (recommended default, research-mandated).

---

## Claude's Discretion

- Exact new `bbj/composer/setopts/*`-adjacent request names for in-code decode/compose.
- Whether hover decode needs a thin wrapper over `describeVector` for the "AND masks as
  cleared bits" phrasing, or reuses it directly.
- Exact IntentionAction/CodeAction label wording and detection-helper class naming.
- Where the new AST-detection logic for "SETOPTS-in-code" shapes lives (new module vs.
  extending `bbj-type-inferer.ts`).
- Whether the tri-state form needs Phase 87 D-08's "unknown/reserved bits" callout.
- Whether the tri-state dialog is a new class or a mode flag on `SetoptsComposerDialog`.

## Deferred Ideas

- Composer discoverability cue (persistent clickable marker) — DISC-01, Phase 89.
- CVS() composer, MSGBOX-expression composer — DISC-02/03, Phase 89.
- Composer robustness (malformed free-text rejection, QuickPick edit-window safety, listener
  leaks, IntelliJ debounce/cache for repeated opens) — DISC-07..11, Phase 90.
- Four `todo.match-phase` hits (Node.js download/interop-test todos) reviewed and declined —
  bare "bbj" keyword match, unrelated to SETOPTS; same set Phase 87 already reviewed.
