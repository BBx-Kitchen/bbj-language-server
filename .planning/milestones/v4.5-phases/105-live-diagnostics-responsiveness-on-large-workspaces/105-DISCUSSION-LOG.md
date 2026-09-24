# Phase 105: Live Diagnostics Responsiveness on Large Workspaces - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-23
**Phase:** 105-live-diagnostics-responsiveness-on-large-workspaces
**Areas discussed:** Fix breadth, Verdict before Langium, Interop contention, Measurement & proof

---

## Fix breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Decouple + own lane | Arm live parse from document change; keep parseProgram off the bulk queue; no build reorder | ✓ |
| Decouple only | Smallest change, measure, add lane later if needed | |
| All three | Also build open documents first, defer the rest | |

| Option | Description | Selected |
|--------|-------------|----------|
| Change + open | Keystrokes and document open arm the cycle | ✓ |
| Change only | Only keystrokes | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep, same timer | Rebuild path stays as a second trigger on the same per-document timer | ✓ |
| Remove it | Only change/open events arm the cycle | |

**User's choice:** all recommended options.

---

## Verdict before Langium

| Option | Description | Selected |
|--------|-------------|----------|
| Show BBj now, reconcile later | Publish at once, reconcile when Langium validates that text | ✓ |
| Hold until Langium catches up | Publish only once Langium validated the same version | |

| Option | Description | Selected |
|--------|-------------|----------|
| Apply 103 carry-over | Downgrade/replace older Langium complaints per 103 D-08 | ✓ |
| Leave untouched | Add BBj errors on top of Langium's last list | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same cycle | bbjcpl fallback also runs from the early event path | ✓ |
| No, fallback waits for the build | Only the live parse moves early | |

| Option | Description | Selected |
|--------|-------------|----------|
| Last text version wins | One consistent snapshot per publish; older never overwrites newer | ✓ |
| Serialize the writers | Per-document queue | |
| You decide | Planner chooses | |

**User's choice:** all recommended options.

---

## Interop contention

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated connection | Second MessageConnection only for parseProgram | ✓ |
| Throttle bulk resolution | Cap in-flight getClassInfo | |
| Server-side priority in bbj-ls | Own executor in the Java backend | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to shared socket | Log once, use main connection | ✓ |
| Treat as parse failure | Per-cycle bbjcpl fallback | |

**User's choice:** all recommended options. Latch/breaker/generation wiring left to the planner.

---

## Measurement & proof

| Option | Description | Selected |
|--------|-------------|----------|
| bbj-corpus locally | Real 1,210-file corpus, numbers only recorded | ✓ |
| Synthetic generated workspace | Committable, may not reproduce | |
| Both | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Edit → first BBj diagnostic | Log timestamps, before/after, both IDEs | ✓ |
| Also initial-build duration | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Held-lock unit test | CI test holding the write lock + interleaving tests | ✓ |
| Plus gated live test | RUN_BBJ_TESTS flood test | |

| Option | Description | Selected |
|--------|-------------|----------|
| Phase dir + PR body | 105-MEASUREMENT.md, quoted in PR and #692 close | ✓ |
| Phase dir only | | |

**User's choice:** all recommended options.

---

## Claude's Discretion

- Event hook wiring point (must not wait on workspaceLock)
- Second connection vs breaker/generation/latch sharing (reset clears verdicts)
- Tracking Langium's latest pre-hierarchy list and its text version
- `hasPendingWork()` semantics for #486 quiescence
- Plan split

## Deferred Ideas

- Open-documents-first initial build (#692 direction 2; relates to #562)
- Server-side parseProgram priority in bbj-ls
