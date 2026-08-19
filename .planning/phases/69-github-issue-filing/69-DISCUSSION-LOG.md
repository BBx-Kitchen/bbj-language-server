# Phase 69: GitHub Issue Filing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-19
**Phase:** 69-github-issue-filing
**Areas discussed:** Security disclosure, Approval gate format, Dedup re-query, Issue body & title
shape, Filing mechanism, Batching & pacing, Labels beyond the three, ISSUE-05 write-back

---

## Area Selection

Eight gray areas were presented across two multi-select questions. **The user selected all eight.**

| Question | Areas offered | Selected |
|---|---|---|
| 1 of 2 — content & correctness | Security disclosure, Approval gate format, Dedup re-query, Issue body & title shape | all four ✓ |
| 2 of 2 — mechanics & traceability | Filing mechanism, Batching & pacing, Labels beyond the three, ISSUE-05 write-back | all four ✓ |

---

## Security Disclosure

### Route for the 9 critical/high D1-primary findings

| Option | Description | Selected |
|--------|-------------|----------|
| File publicly, same as the rest | Evidence is already public in the pushed `.planning/` tree; INVENTORY D-12 already withheld payloads and trigger sequences | |
| Public issues, evidence trimmed further | File all 9 with problem statement + `file:line` + approach, omitting full `failure_scenario:` | |
| Private GitHub Security Advisories | Route the 9 to draft advisories via `gh api .../security-advisories`; not issues, so ISSUE-03/ISSUE-05 need different handling | ✓ |
| You decide | Claude recommended option 1 | |

**User's choice:** Private GitHub Security Advisories.
**Notes:** Chosen against Claude's recommendation. The trade-off was stated before the choice: the
nine leave the public tracker, and ISSUE-03's label triad plus ISSUE-05's issue-number write-back
need a different shape for them. Both consequences are handled in CONTEXT.md — D-15 (GHSA ID in the
existing `issue:` slot) and D-17 (written carve-out, no requirement text edited). Feasibility was
verified live before the decision was recorded: `admin: true` on the repository and the
`security-advisories` endpoint reachable, returning `0`.

### Handling of the 24 medium/low D1 findings

| Option | Description | Selected |
|--------|-------------|----------|
| No — identical to non-security findings | Same body, labels, batch; PRIO already encodes urgency | |
| Same flow, but flagged in the approval draft | Filed identically; the draft groups all 33 D1 records so the security surface is visible as one block | ✓ |
| You decide | Claude recommended option 2 | |

**User's choice:** Same flow, flagged in the approval draft. → CONTEXT.md D-03.

### SECURITY.md

| Option | Description | Selected |
|--------|-------------|----------|
| No — out of scope | Repo source change; belongs in the backlog | ✓ |
| Yes — file it as an issue instead | Would mean a 145th issue with no finding ID behind it | |
| You decide | Claude recommended option 1 | |

**User's choice:** Out of scope. Kept as a deferred idea; the denominator stays at exactly 144.

### Follow-up questions withdrawn

A four-question follow-up on advisory mechanics (advisory scope boundary, GHSA traceability,
requirement honesty, gate count) was **interrupted and rejected by the user**, who said "continue".
All four were then recorded as Claude's discretion in CONTEXT.md and stated back to the user before
proceeding: D-02 (line drawn at D1-primary; the four `high` dependency findings stay public),
D-15 (GHSA ID in the existing `issue:` slot), D-17 (carve-out in the close-out, `REQUIREMENTS.md`
not edited), D-06 (one gate covering both issues and advisories).

---

## Approval Gate Format

| Option | Description | Selected |
|--------|-------------|----------|
| Committed `69-ISSUE-DRAFT.md`, all bodies | Every body rendered in full, in filing order, plus the 9 advisory drafts; the filing consumes that exact file | ✓ |
| Summary table + full bodies for critical/high | One-row-per-finding table for all 144, full bodies only for the 17 critical/high | |
| Draft file plus a `--dry-run` transcript | The rendered draft plus the exact `gh issue create` invocations, printed not executed | |
| You decide | Claude recommended option 1 with option 3 folded in | |

**User's choice:** Committed `69-ISSUE-DRAFT.md` with all bodies. → CONTEXT.md D-05.
**Notes:** The "consumes rather than re-renders" property was the stated reason — approval and
execution cannot diverge.

---

## Dedup Re-query

| Option | Description | Selected |
|--------|-------------|----------|
| Open issues only; a hit halts | Re-query open, diff against the frozen 15, check the delta against all 144 | |
| Open and closed; a hit halts | Also catches findings already fixed-and-closed since the sweep | ✓ |
| Open only; a hit auto-files with a cross-reference | Nothing blocks; user owns cleanup afterwards | |
| You decide | Claude recommended option 2 | |

**User's choice:** Open and closed, halt on a hit. → CONTEXT.md D-07.
**Notes:** Live measurement presented before the question: the tracker had grown from the frozen 15
to 19 open, with #497–#500 opened mid-milestone. A grep of the corpus confirmed none of the 144
records matches any of the four.

---

## Issue Body & Title Shape

### Title convention

| Option | Description | Selected |
|--------|-------------|----------|
| `<area>: <problem>` — finding ID in body | Matches the shape of #497–#500 already on the tracker | ✓ |
| `[P61-D1-003] <problem>` — ID in title | Greppable as a batch; exposes internal review IDs to outside readers | |
| You decide | Claude recommended option 1 | |

**User's choice:** `<area>: <problem>`. → CONTEXT.md D-10.

### Body self-containment

| Option | Description | Selected |
|--------|-------------|----------|
| Fully self-contained, no link | All five ISSUE-02 elements inline; no pointer into `.planning/` | ✓ |
| Self-contained plus a provenance footer | Same body plus finding ID and review-document reference | |
| You decide | Claude recommended option 2 with a commit-pinned permalink | |

**User's choice:** Fully self-contained, no link. → CONTEXT.md D-11.
**Notes:** Chosen against Claude's recommendation. The finding ID is still carried as a body line
(established by the title decision above), so traceability from issue → finding survives; what is
dropped is the outbound link into a branch-scoped `.planning/` path that will move on merge.

---

## Filing Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Committed script, ledger, resumable | `file-issues.mjs` with `--dry-run`, ledger-before-next-call, skip-on-rerun | |
| Agent files them inline via `gh` | No script; no built-in idempotency guarantee | ✓ |
| You decide | Claude recommended option 1 | |

**User's choice:** Inline via `gh`. → CONTEXT.md D-13, D-14.
**Notes:** Chosen against Claude's recommendation. The stated cost — no idempotency, so a crash or
rate-limit rejection mid-run risks double-filing into a public tracker — is carried into CONTEXT.md
as D-14, which makes the run ledger and a deterministic title-match resume check **mandatory**
rather than optional. The user separately chose a ledger-sourced write-back (below), so a ledger
exists either way.

---

## Batching & Pacing

| Option | Description | Selected |
|--------|-------------|----------|
| One run, paced | All 144 in severity order after the single approval | |
| Critical/high first, then pause | File the 17 critical/high, stop, eyeball, then release the remaining 127 | ✓ |
| PRIO tiers as three separate runs | Three release points | |
| You decide | Claude recommended option 2 | |

**User's choice:** Critical/high first, then pause. → CONTEXT.md D-13.
**Notes:** Wave 1 is 17 records but only 8 public issues, since 9 route to advisories under D-01.
The pause is a checkpoint inside the approved run, not a second approval gate.

---

## Labels Beyond the Three

| Option | Description | Selected |
|--------|-------------|----------|
| Triad only | Exactly ISSUE-03; every label already exists | ✓ |
| Triad plus a new `v4.0-review` label | Batch findable forever; requires creating one label | |
| Triad plus `bug`/`enhancement` | 144 per-finding judgement calls with no source field | |
| You decide | Claude recommended option 2 | |

**User's choice:** Triad only. → CONTEXT.md D-09.
**Notes:** Chosen against Claude's recommendation. The consequence — 144 new issues on a 19-issue
tracker with no way to filter them out as a set — is recorded as a deferred idea rather than argued
further. `gh label list` confirmed all twelve labels the triad needs already exist, so nothing is
created.

---

## ISSUE-05 Write-back

| Option | Description | Selected |
|--------|-------------|----------|
| Once at the end, from the run ledger | Single pass, single commit, re-runnable from the ledger | ✓ |
| Incrementally as each issue is filed | Maximum crash-safety; 144 edits to a 578 KB file | |
| You decide | Claude recommended option 1 | |

**User's choice:** Once at the end, from the ledger. → CONTEXT.md D-16.
**Notes:** The regeneration hazard Phase 68 recorded is respected by not running
`derive-review-docs.mjs` at all and never passing `--force`.

---

## Final Check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write CONTEXT.md and hand off to planning | ✓ |
| Explore more gray areas | Acceptance-criteria derivation, resume protocol, the 5 open-gap referrals, #497–#500 | |

**User's choice:** Ready for context.
**Notes:** Two items were flagged to the user rather than asked about, and both are resolved in
CONTEXT.md: acceptance criteria have no source field in the corpus and must be derived per issue
(D-12), and inline filing makes the ledger plus resume check load-bearing (D-14).

---

## Claude's Discretion

Recorded in CONTEXT.md and marked correctable at each decision:

- **D-02** — the advisory boundary: D1-primary `critical`/`high` only; the four `high` dependency
  findings (`P64-D6-002/006/007/008`) stay public because their CVEs are already published upstream.
- **D-06** — one approval gate covering both issues and advisories.
- **D-12** — the acceptance-criteria derivation rule (restate `failure_scenario:` as an observable
  end condition, plus whatever regression coverage `proposed_approach:` implies).
- **D-14** — the specific resume mechanisms (`69-FILING-LEDGER.md` plus deterministic title match).
  The *requirement* that inline filing be resumable is not discretionary.
- **D-15** — GHSA ID written into the existing `issue:` slot rather than a new field.
- **D-17** — requirement gaps handled as a written carve-out; `REQUIREMENTS.md` text not edited.
- Plan and wave grouping, `docs(69):` commit prefix, and the phase-close write-boundary check.

## Deferred Ideas

- Adding a `SECURITY.md` and a private vulnerability-reporting channel (the repository has neither).
- Creating a `v4.0-review` batch label so the 144 entries are findable as a set.
- Adding `bug`/`enhancement` type labels per issue.
- Assigning filed issues to a GitHub milestone or project board.
- A committed filing script with built-in idempotency, as the fallback if the inline run proves
  fragile.
- Implementing any of the 144 major refactors (`FUT-04`).
- Settling the 24 not-reproducible claims and the 5 open-gap referrals Phase 68 recorded.
- Provisioning a JDK 17 so the nine review-verified-only IntelliJ fixes can be compiled and tested.

## Open Item Handed to Planning

Not a deferred idea — a routing question CONTEXT.md `<specifics>` requires the plan to settle before
drafting: **`P66-D4-001` records `supersedes P63-D4-010`, and both are among the 144.** Filing both
as-is would put two issues on the tracker for one item. Settling how the relationship is expressed
is not re-triage; silently filing two, or silently filing one, are both wrong.
