# Phase 61: Language Core Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-17
**Phase:** 61-language-core-review
**Areas discussed:** Sweep decomposition & order, What a "pass" must record, SEC-06 trust boundary depth, Debt overlap & review target

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Sweep decomposition & order | How the 7 review units become PLAN.md files, and in what order | ✓ |
| What a "pass" must record | Bare `pass` vs written check line; unit-major vs dimension-major sweep | ✓ |
| SEC-06 trust boundary depth | Output form, evidence method, public-repo disclosure limits | ✓ |
| Debt overlap & review target | D-06 routing table vs Phase 66 DEBT ownership; which tree is swept | ✓ |

**User's choice:** All four areas.

---

## Sweep Decomposition & Order

### Q1 — How should the 7 Phase 61 review units map to PLAN.md files?

| Option | Description | Selected |
|--------|-------------|----------|
| Tracer + one plan per unit | 61-01 sweeps RU-61-06 end-to-end and is verified first (mirroring 60-01/RU-62-04), then 61-02..61-07 take one unit each. Front-loads SEC-06. | ✓ |
| One plan per unit, no tracer | 7 peer plans in one wave, no proving run | |
| Risk-tiered groups (3 plans) | ranks 1-2 / ranks 3-5 / ranks 6-7 | |
| Tracer + risk-tiered groups | Tracer, then 2-3 grouped expansion plans | |

**User's choice:** Tracer + one plan per unit (7 plans).
**Notes:** Recorded as CONTEXT D-01/D-02. Plan order follows INVENTORY's risk rank.

### Q2 — How should the 7 plans share the single 61-COVERAGE.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Tracer creates skeleton, each plan appends | 61-01 writes full structure + pre-filled n/a reasons; later plans fill only their own section | ✓ |
| Fragments + assembly plan | Per-unit fragment files, 8th plan concatenates and asserts totals | |
| Single file, whole-file rewrite per plan | Each plan reads and rewrites the whole file | |

**User's choice:** Skeleton-then-append.
**Notes:** Recorded as CONTEXT D-03, rated **costly** reversibility — the skeleton shape is inherited by 6 downstream plans and by Phase 68's DOC-03 concatenation.

### Q3 — How is the no-concurrent-write constraint enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| One wave per plan | Waves 1-7, `depends_on` chained in risk-rank order; safe by construction | ✓ |
| Wave 1 tracer, wave 2 the other six | Relies on the executor running same-wave plans serially | |
| Waves by risk tier | Wave 1 tracer, wave 2 ranks 2-4, wave 3 ranks 5-7 | |

**User's choice:** One wave per plan.
**Notes:** Recorded as CONTEXT D-04. Chosen so the plan stays correct even if executor concurrency behavior changes — the constraint lives in the dependency graph rather than in an assumption.

### Q4 — Should 61-01 stop for review before the expansion plans run?

| Option | Description | Selected |
|--------|-------------|----------|
| Checkpoint on format only | User approves cell format, sample finding record, n/a wording — not the findings | ✓ |
| Checkpoint on format and findings | Also review RU-61-06's actual D1 / SEC-06 results | |
| No checkpoint | Run straight through; review at verify time | |

**User's choice:** Checkpoint on format only.
**Notes:** Recorded as CONTEXT D-05. Placed at the only point where correcting the inherited skeleton is cheap; finding-level triage stays in Phases 67-69.

---

## What a "Pass" Must Record

### Q1 — What must a no-finding `applies` cell record?

| Option | Description | Selected |
|--------|-------------|----------|
| pass + what was checked | One written line naming concrete checks, phrased against the dimension's REQUIREMENTS.md wording | ✓ |
| pass + checks + file:line anchors | Same plus a file:line per check; ~2x recording cost | |
| Bare pass | Cell reads `pass`, nothing more | |

**User's choice:** pass + what was checked.
**Notes:** Recorded as CONTEXT D-06. Framed by the symmetry argument — INVENTORY required a written, non-mechanical reason for every `n/a`, so a bare `pass` would be weaker evidence than an exclusion and would make an unswept unit indistinguishable from a clean one.

### Q2 — How are the 6 live dimensions structured inside each unit's plan?

| Option | Description | Selected |
|--------|-------------|----------|
| Split by evidence tier — 2 tasks | Task A = D1/D2/D3 (tier `repro`), Task B = D4/D5/D8 (tier `trace`) | ✓ |
| One task per dimension — 6 tasks | 42 tasks across the phase; re-reads files six times per unit | |
| One analysis task + one recording task | Holistic analysis then recording; dimension checklist only in acceptance criteria | |

**User's choice:** Split by evidence tier.
**Notes:** Recorded as CONTEXT D-07. The split follows D-12's real cost boundary; each task's acceptance criteria enumerate its dimensions by name so none can be silently absorbed.

### Q3 — Depth rule, given RU-61-07 is 3,752 LOC of static catalogs?

| Option | Description | Selected |
|--------|-------------|----------|
| Risk-proportional, method recorded | Full read ranks 1-6; RU-61-07 gets a programmatic .ts/.bbl diff for D4 and a stated sampling protocol for D2 | ✓ |
| Full read of every file, no exceptions | All 53 files line by line including both sides of the four near-duplicate pairs | |
| Full read everywhere except .bbl siblings | .bbl treated purely as diff targets | |

**User's choice:** Risk-proportional with the method recorded in the cell.
**Notes:** Recorded as CONTEXT D-08. The cell names which method was used so the coverage claim does not imply a line-by-line read that did not happen.

### Q4 — 61-COVERAGE.md layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Grid table on top, per-unit detail below | Table in INVENTORY's exact column shape for mechanical Phase 68 concatenation, then per-unit evidence | ✓ |
| Per-unit sections only | No summary table; Phase 68 parses prose | |
| Grid + separate flat findings list | Findings ordered by ID rather than nested under units | |

**User's choice:** Grid on top, per-unit detail below.
**Notes:** Recorded as CONTEXT D-09. Unit → evidence adjacency preserved deliberately; a flat ID-ordered list reads better as a queue but breaks the ability to check a coverage claim against its evidence.

---

## SEC-06 Trust Boundary Depth

### Q1 — What form does the trust-boundary documentation take?

| Option | Description | Selected |
|--------|-------------|----------|
| Narrative section + discrete findings | `## SEC-06 Trust Boundary` inside RU-61-06's section, plus P61-D1-* records where a defect clears evidence | ✓ |
| Findings only — no narrative | Every property becomes a finding or an explicit no-finding pass | |
| Its own file | `.planning/reviews/61-SEC-06-TRUST-BOUNDARY.md` | |

**User's choice:** Narrative section + discrete findings.
**Notes:** Recorded as CONTEXT D-10. "The channel is unauthenticated" is a fact to state; it becomes a finding only if it enables something.

### Q2 — How hard should Phase 61 work to prove hostile-peer behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Trace floor, repro for critical/high | Traces satisfy D-12 for most of the boundary; critical/high additionally require a runnable repro | ✓ |
| Trace-only | Every D1 finding cleared by trace alone, as D-12 permits | |
| Build a hostile-peer harness | Fake peer returning malformed/oversized/hostile/never-arriving responses | |

**User's choice:** Trace floor with repro required for critical/high.
**Notes:** Recorded as CONTEXT D-11. Rationale: critical/high are exactly the findings that become PRIO 1 public issues under ISSUE-02/03, so they earn the stronger evidence. No harness built up front.

### Q3 — How much attack detail lands in the committed, public file for an unfixed D1 finding?

| Option | Description | Selected |
|--------|-------------|----------|
| Two-tier — T-60-02 redaction for critical/high D1 only | Surface + problem class + impact for critical/high; full detail for everything else | ✓ |
| Full detail everywhere | Finding standard as written; localhost:5008 already implies local access | |
| T-60-02 for all D1 findings | Surface + class only regardless of severity | |

**User's choice:** Two-tier.
**Notes:** Recorded as CONTEXT D-12. The required repro is still written and run; the record states it exists and what it establishes without publishing the sequence. Phase 69 decides disclosure at filing time.

### Q4 — How far into `java-interop/` does the reviewer go?

| Option | Description | Selected |
|--------|-------------|----------|
| Read as reference, record nothing against it | Read for wire contract; explicit prohibition on any finding located inside java-interop/ | |
| Client-side only — don't open it | Treat the peer as a pure black box | |
| Read it and note observations for FUT-01 | Read as reference and additionally capture Java-side observations | ✓ |

**User's choice:** Read it and note observations for FUT-01.
**Notes:** Claude flagged this option as the "helpfully expand into it" drift the milestone scope decision was made to prevent, and noted the observations would sit outside the finding standard with no phase owning them. User selected it anyway — recorded in CONTEXT D-13 as a deliberate, user-made widening, explicitly marked so it is not later mistaken for drift. The exclusion on *reviewing and filing against* the Java service is unchanged.

### Q5 (follow-up) — Where do the FUT-01 observations live?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate section in 61-COVERAGE.md, no finding IDs | `## FUT-01 Observations (out of scope — not findings)` | |
| Its own file | `.planning/reviews/FUT-01-OBSERVATIONS.md` | |
| Backlog entries | Routed through GSD's backlog tagged FUT-01 | ✓ |

**User's choice:** Backlog entries.
**Notes:** Recorded as CONTEXT D-13. Keeps `.planning/reviews/` purely about in-scope findings and INVENTORY's recording protocol intact. Known tradeoff stated to the user and accepted: a reader of 61-COVERAGE.md alone will not learn these observations exist.

---

## Debt Overlap & Review Target

### Q1 — Who records the items INVENTORY routes to Phase 61 that Phase 66's DEBT requirements also own?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 61 records, Phase 66 resolves | Normal P61-* findings with `dedup` naming the owning DEBT requirement | ✓ |
| Phase 66 owns them end-to-end | Phase 61's D5 cell records `deferred — DEBT-02` | |
| Phase 61 records only what DEBT doesn't name | Splits the D5 story for RU-61-03 across two phases | |

**User's choice:** Phase 61 records, Phase 66 resolves.
**Notes:** Recorded as CONTEXT D-14. Matches the milestone shape, honors D-06's "routed for triage, not an accepted known-failing allowlist" framing, and keeps the D5 cells filled rather than holed.

### Q2 — Which tree does the sweep read?

| Option | Description | Selected |
|--------|-------------|----------|
| HEAD, with the SHA recorded in 61-COVERAGE.md | Review what Phase 67 will fix; anchor the coverage claim to one SHA | ✓ |
| v0.12.0 tag | Sweep INVENTORY's pinned immutable point | |
| HEAD, re-anchored per plan | Each plan records its own SHA | |

**User's choice:** HEAD with the SHA recorded once for the phase.
**Notes:** Recorded as CONTEXT D-15. Sweeping v0.12.0 would re-report `a7e1b53 fix(#494)`; "HEAD" alone is not reproducible because it advances with planning commits. Updated after the branch split — the pinned tree is now `v4.0-stability-and-quality` HEAD.

### Q3 — How should the plans guard against the known re-report traps?

| Option | Description | Selected |
|--------|-------------|----------|
| Prohibit the maps outright for Phase 61 | `.planning/codebase/*.md` not to be read; plus a must_haves prohibition on restating #494 | ✓ |
| Allow, banners as the guard | Phase 60 D-16's original design intent | |
| Allow, but re-verify against code before recording | Provenance rule tracked per finding | |

**User's choice:** Prohibit outright.
**Notes:** Recorded as CONTEXT D-16, explicitly overriding Phase 60 D-16's banner-as-guard design for this phase. Rationale: correctness should not depend on a reviewer heeding a banner while under instruction to find problems, and the maps offer Phase 61 nothing INVENTORY does not supersede.

### Q4 — Should the phase carry a hard, countable completion gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Assert counts, re-derived from INVENTORY | State 50/38/88 *and* re-derive at verification; disagreement is itself a defect | ✓ |
| Assert derived counts only | Require every cell present without writing expected totals | |
| Qualitative completion check | Verify each unit's section addresses all its dimensions | |

**User's choice:** Assert stated counts, re-derived from INVENTORY.
**Notes:** Recorded as CONTEXT D-17. Chosen so an arithmetic slip in this discussion cannot silently become the contract.

---

## Mid-Discussion: Branch Hygiene (not a phase decision)

Raised by the user during `write_context`: the v4.0 milestone should have been branched fresh.

Investigation found the 29 v4.0 planning commits were **unpushed** on `issue494-cyclic-inheritance-hang`, whose origin ref sat at `a7e1b53` (the #494 fix). Resolved by pointer move — `git branch v4.0-stability-and-quality` at `748eb43`, then `git branch -f issue494-cyclic-inheritance-hang origin/...`. No rebase, no SHA rewriting, working tree preserved.

Rebasing onto `main` to drop `a7e1b53` was considered and rejected: INVENTORY.md's D-15 correction log and 60-CONTEXT.md's D-01 cite `9cc746a`, `110be82`, `e8f566e` by SHA, and a rebase would rewrite all of them.

Recorded in CONTEXT `<code_context>` Integration Points, and D-15's pinned tree updated accordingly.

---

## Claude's Discretion

- The per-unit stopping rule — when a unit's sweep is "done" beyond cell coverage (raised, not explored).
- How `not-reproducible` dispositions surface alongside passes in per-unit sections (raised, not explored).
- Whether Phase 61 assumes Phases 62-64 run concurrently or after it (raised, not explored).
- Exact wording and column set of the per-unit section template the tracer establishes (subject to the D-05 checkpoint).
- The sampling protocol's specific size and source for D-08's RU-61-07 D2 check.
- Which GSD backlog mechanism carries the D-13 FUT-01 observations.

## Deferred Ideas

- **Hostile-peer test harness** for java-interop — rejected as up-front work (D-11); built only if a specific critical/high D1 finding demands the repro. Phase 64 already owns the existing `tools/interop-test-harness/`.
- **Reviewing the `java-interop/` Java service** — remains FUT-01 and an Out-of-Scope row.
- **Regenerating the seven `.planning/codebase/*.md` maps** — already deferred by Phase 60 D-16; this phase goes further and prohibits reading them.
- **Reconciling `v4.0-stability-and-quality` with `origin/main`** (local `main` is behind by 4) — a ship-time merge question, not a Phase 61 concern.
