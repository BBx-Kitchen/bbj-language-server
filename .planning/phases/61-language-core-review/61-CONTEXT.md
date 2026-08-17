# Phase 61: Language Core Review - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **one planning artifact and no production code changes**:

`.planning/reviews/61-COVERAGE.md` — Phase 61's slice of INVENTORY.md's applicability grid, filled
in. Concretely: a recorded pass/fail for every `applies` cell across the 7 Phase 61 review units
(`RU-61-01`..`RU-61-07`, 53 files, ~13.7k LOC in `bbj-vscode/src/language/`) plus the 4 `.bbl`
file-exception rows, every `n/a` reason carried forward verbatim, every finding meeting its RVW-06
evidence tier and checked against the frozen 15-issue snapshot, and a documented SEC-06 trust
boundary for the java-interop client.

**No source file is modified by this phase.** Findings are recorded; Phase 67 is the only phase that
applies fixes, and Phase 66 is the only phase that resolves DEBT items. Phase 61 does not fix, does
not file GitHub issues (ISSUE-01 is a hard gate in Phase 69), and does not edit INVENTORY.md (D-09,
immutable).

**Phase 61's grid slice, as counted during this discussion:**

| Rows | `applies` cells | `n/a` cells | Total |
|---|---|---|---|
| 7 unit rows (D1-D5, D8 apply; D6/D7 `n/a`) | 42 | 14 | 56 |
| 4 `.bbl` file-exception rows (D2, D4 apply) | 8 | 24 | 32 |
| **Total** | **50** | **38** | **88** |

These numbers are this discussion's arithmetic, not INVENTORY's — see D-14 for how they are treated.

</domain>

<decisions>
## Implementation Decisions

Decision IDs below are **phase-local** (`D-01`..`D-16` of Phase 61). Phase 60's `D-01`..`D-17` are a
separate, already-locked set — where a Phase 60 decision is referenced, it is written as
`Phase 60 D-NN` to avoid collision.

### Sweep Decomposition & Ordering

- **D-01:** Phase 61 is decomposed as **tracer + one plan per review unit = 7 plans**. Plan `61-01`
  sweeps `RU-61-06` (java-interop client, risk rank 1, 4 files / 1,255 LOC) end to end and is
  verified before any expansion, exactly as plan 60-01 worked `RU-62-04` to prove the shape every
  other unit follows. Plans `61-02`..`61-07` then take one unit each. Front-loading `RU-61-06` also
  front-loads SEC-06, the phase's only non-RVW-01 requirement.

- **D-02:** Plan order follows INVENTORY's risk rank:
  `RU-61-06` → `RU-61-01` → `RU-61-03` → `RU-61-02` → `RU-61-04` → `RU-61-05` → `RU-61-07`.

- **D-03:** All 7 plans write into the **single** `.planning/reviews/61-COVERAGE.md` mandated by
  INVENTORY's recording protocol. The tracer (`61-01`) creates the **full file skeleton** — grid
  header, all 7 unit sections stubbed, all 38 `n/a` reasons pre-filled verbatim from INVENTORY —
  and fills its own section. Each later plan fills **exactly its own section** and touches nothing
  else. No fragment files, no assembly plan, no whole-file rewrites.
  — **Reversibility:** costly — the skeleton's section shape is inherited by 6 downstream plans and
  by Phase 68's DOC-03 concatenation; changing it after any expansion plan runs forces those units
  to be re-recorded.

- **D-04:** The shared-file constraint is enforced **by the dependency graph, not by an assumption
  about the executor**: one wave per plan (waves 1-7), each plan's `depends_on` naming its
  predecessor in D-02's order. Same-wave concurrency would corrupt the append; making the ordering
  structural means the plan stays correct even if the executor's concurrency behavior changes.

- **D-05:** Plan `61-01` carries a **`checkpoint:decision` on format only**, after `RU-61-06`'s
  sweep completes and before `61-02` runs. The user reviews the rendered section — cell format, a
  sample finding record, the `n/a` carry-forward wording — and approves the *shape*, not the
  findings. Finding-level triage stays in Phases 67-69.
  — **Reversibility:** costly — this is the gate that makes D-03's inherited skeleton correctable
  at the only point where correcting it is cheap.

### What a Recorded Cell Must Contain

- **D-06:** A no-finding `applies` cell records **`pass` plus a written line naming the concrete
  checks applied**, phrased against that dimension's "what counts as a finding" wording in
  REQUIREMENTS.md — e.g. for D2 on `RU-61-01`: *"checked line-continuation splitter for off-by-one
  on CRLF, token-builder for swallowed errors, value-converter for null propagation; no divergence
  found."* Rationale: INVENTORY required a written reason for every `n/a`, tested against the
  dimension's own wording and explicitly not a mechanical exclusion. A bare `pass` would be weaker
  evidence than an exclusion, and would make an unswept unit indistinguishable from a clean one.
  `file:line` anchors per check were considered and rejected as roughly doubling recording cost for
  auditability DOC-03 does not consume.

- **D-07:** Within each unit's plan, the 6 live dimensions are **split by evidence tier into 2
  tasks**, following D-12's real cost boundary rather than an arbitrary grouping:
  - **Task A — tier `repro`:** D1, D2, D3. Needs a runnable reproduction, or a line-by-line trace
    naming concrete inputs/state and the exact `file:line` where behavior diverges.
  - **Task B — tier `trace`:** D4, D5, D8. The code shape or the stale text is the defect.

  Each task's `acceptance_criteria` enumerate its dimensions by name, so no dimension can be
  silently absorbed by whichever one is loudest. One-task-per-dimension (42 tasks) was rejected as
  re-reading the same files six times per unit; a single holistic analysis task was rejected because
  a thin D3 or D5 pass would be easy to write and hard to catch.

- **D-08:** Sweep depth is **risk-proportional, with the method recorded in the cell**. Ranks 1-6
  (behavioral code, ~10k LOC) get a full read. `RU-61-07` (3,752 LOC of static catalogs, where only
  D2 value-correctness and D4 `.ts`-vs-`.bbl` duplication apply) instead gets a **mechanical check**:
  a programmatic diff of each `.ts`/`.bbl` pair for the D4 duplication finding, and D2 by a stated
  sampling protocol with the sample size and the source consulted recorded in the cell. The cell
  names which method was used, so the coverage claim stays honest rather than implying a line-by-line
  read that did not happen.

- **D-09:** `61-COVERAGE.md` layout is **grid table on top, per-unit detail below**. The opening
  table uses INVENTORY's exact column shape (`Unit | D1 | ... | D8`) so Phase 68 can concatenate
  mechanically without re-deriving scope; each unit section then carries its written pass reasons,
  its verbatim `n/a` carry-forwards, and the full finding records discovered in that unit. Unit →
  evidence adjacency is preserved deliberately: a flat ID-ordered findings list would read better as
  a queue but would break the ability to check a coverage claim against its evidence.

### SEC-06 Trust Boundary

- **D-10:** The trust boundary is documented as a **narrative `## SEC-06 Trust Boundary` subsection
  inside `RU-61-06`'s part of `61-COVERAGE.md`, plus discrete `P61-D1-*` finding records** wherever
  a concrete evidence-clearing defect exists. The narrative covers what the peer controls, the
  authentication posture as a factual statement, and behavior against a malicious peer versus a
  merely unresponsive one. Rationale: success criterion 2 asks for the boundary to be *documented*,
  and a boundary map is not naturally expressible as a list of defects — "the channel is
  unauthenticated" is a fact to state, and becomes a finding only if it enables something.

- **D-11:** Evidence for D1 is a **trace floor with a runnable repro required for `critical`/`high`**.
  D-12 satisfies tier `repro` with either a reproduction or a line-by-line trace; traces are
  sufficient for most of the boundary. Any finding the reviewer rates `critical` or `high` must
  additionally carry a runnable reproduction before it is recorded — those are precisely the findings
  that become PRIO 1 public issues under ISSUE-02/ISSUE-03, so they earn the stronger evidence. No
  hostile-peer harness is built up front; one is built only if a specific finding demands it.

- **D-12:** Public-repo disclosure is **two-tier**. `.planning/` is committed and this repository is
  public, so INVENTORY's own threat T-60-02 precedent applies — but only where it is earned:
  - **`critical`/`high` D1 findings:** the committed record names the surface, the problem class, and
    the impact. **No trigger sequence, no payload, no proof-of-concept.** The required runnable repro
    (D-11) is still written and run; the record states that it exists and what it establishes,
    without publishing the sequence. Phase 69 decides disclosure at filing time.
  - **Everything else** (all D2-D8 findings, and D1 findings rated `medium`/`low`): full concrete
    detail per the finding standard as written.

  Rationale for not redacting everything: java-interop binds `localhost:5008`, so a malicious peer
  already implies local access or a hijacked port on a developer machine, not an internet-exposed
  service; blanket redaction would weaken low-risk records and force Phase 67 to re-derive detail.

- **D-13:** `java-interop/` (the Java service) may be **read as reference material** to establish the
  wire contract and what the client is entitled to assume — a trust boundary cannot be assessed
  against an inferred protocol. **No `P61-*` finding may carry a `location:` inside `java-interop/`**
  (explicit `must_haves` prohibition), and no coverage cell covers it: the milestone Out-of-Scope row
  and FUT-01 stand.

  **Java-side observations are captured as GSD backlog entries tagged `FUT-01`** — not as findings,
  not in `61-COVERAGE.md`, not in a new `.planning/reviews/` artifact. This keeps
  `.planning/reviews/` purely about in-scope findings and keeps INVENTORY's recording protocol
  (which names only `{NN}-COVERAGE.md`) intact. **Known tradeoff, accepted by the user:** a reader of
  `61-COVERAGE.md` alone will not learn these observations exist.

  This is a deliberate, user-made widening of the milestone's java-interop exclusion, recorded here
  so it is not mistaken for drift. The exclusion on *reviewing and filing against* the Java service
  is unchanged.

### Debt Overlap & Review Target

- **D-14:** For items INVENTORY's D-06 routing table sends to Phase 61 that Phase 66's DEBT
  requirements also own — the 3 disabled `parser.test.ts` assertions and the TEST-03 skip
  (`DEBT-02`), and `#232` CPU stability routed to `RU-61-02` (`DEBT-01`) — **Phase 61 records,
  Phase 66 resolves.** Phase 61 writes them as normal `P61-D5-*` / `P61-D4-*` findings with full
  evidence, and each record's `dedup` field names the owning DEBT requirement so Phase 66 re-triages
  rather than re-derives. This matches the milestone shape (review phases record, later phases act),
  honors D-06's explicit framing of these as "routed for triage, not an accepted known-failing
  allowlist", and keeps the D5 cells genuinely filled instead of holed.

  The full Phase 61 routing-table inheritance: 11 `test/linking.test.ts` "Interop related tests"
  failures (D5, cross-ref D2); `beforeAll` `WorkspaceManager.initializeWorkspace()` hookTimeout
  flakiness (D5); 3 disabled `parser.test.ts` assertions (D5); TEST-03 `completion-test.test.ts`
  skip (D5); 2 `bbj-document-symbol-provider.ts` unused-eslint-disable warnings (D4).

- **D-15:** The sweep reads **HEAD of `v4.0-stability-and-quality`, with the exact SHA recorded once
  in `61-COVERAGE.md`**. Rationale: HEAD is what Phase 67 will fix — sweeping `v0.12.0` would produce
  findings against code that has already moved, starting with re-reporting `a7e1b53 fix(#494)`.
  HEAD advances with every v4.0 planning commit, so "HEAD" alone is not a reproducible statement;
  the recorded SHA anchors the coverage claim to one tree for the whole phase (not re-anchored per
  plan, so DOC-03 describes a single tree). INVENTORY's pinned `2194616..v0.12.0` range keeps its
  original job: history reconstruction, not review targeting.

- **D-16:** **`.planning/codebase/*.md` is not to be read during this sweep.** INVENTORY supersedes
  it on scope, structure and counts (Phase 60 D-16), so it offers Phase 61 nothing, while
  `CONCERNS.md` lists FIXMEs already resolved in v3.8 and actively invites false findings. Paired
  with an explicit `must_haves` prohibition that **no finding may restate `a7e1b53 fix(#494)`**
  (the in-flight, unreleased cyclic-inheritance fix on this branch). This overrides Phase 60 D-16's
  banner-as-guard design for Phase 61 specifically: correctness should not depend on a reviewer
  heeding a banner while under instruction to find problems.

- **D-17:** Phase completion carries a **hard, countable gate**: a `must_haves` truth requiring
  `61-COVERAGE.md` to contain every cell in INVENTORY's Phase 61 slice, with the expected totals
  stated (**50 `applies`, 38 `n/a`, 88 total**) *and* re-derived from INVENTORY at verification time.
  If the derivation disagrees with the stated totals, **that disagreement is itself a defect to
  surface** — so an arithmetic slip in this discussion cannot silently become the contract. "Swept"
  becomes countable rather than a judgement call.

### Claude's Discretion

- The per-unit stopping rule — when a unit's sweep is "done" beyond cell coverage. Raised, not
  explored; the planner decides, constrained by D-06's written-check requirement and D-08's depth
  rule.
- How `not-reproducible` dispositions (D-12's drop-vs-disposition rule) surface alongside passes in
  the per-unit sections. Raised, not explored.
- Whether Phase 61 should assume Phases 62-64 run concurrently or after it. Raised, not explored —
  D-03/D-04 make Phase 61 self-contained either way, and Phase 60 D-09/D-11 already guarantee no
  cross-phase collision.
- The exact wording and column set of the per-unit section template the tracer establishes (subject
  to the D-05 checkpoint).
- The sampling protocol's specific size and source for D-08's `RU-61-07` D2 value-correctness check.
- Which GSD backlog mechanism carries the D-13 `FUT-01` observations.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone contract — authoritative, read first

- `.planning/reviews/INVENTORY.md` — **the single immutable contract for this phase.** Read in full.
  Specifically: §"Phase 61 review units" (the 7 units, their files, LOC and risk ranks),
  §"Applicability Grid" + §"File-exception rows" + §"Exclusion reasons" (the cells Phase 61 owns and
  the `n/a` text to carry verbatim), §"Finding Standard" 3a-3d (IDs, evidence tiers, easy-vs-major,
  severity/effort scales), §"Finding Record Template", §"Frozen Open-Issue Snapshot" (the 15-issue
  dedup list), §"Recording protocol (D-09)", §"Test & Build Baseline" incl. §"Routing table (D-06)".
- `.planning/REQUIREMENTS.md` — the D1-D8 dimensions table with each dimension's "what counts as a
  finding" wording (D-06 requires pass lines phrased against it), RVW-01, SEC-06, RVW-06, RVW-07,
  the Out of Scope table, and DEBT-01/DEBT-02 (the D-14 overlap).
- `.planning/ROADMAP.md` §"Phase 61: Language Core Review" — the four success criteria this phase is
  verified against.
- `.planning/phases/60-baseline-resync-review-standards/60-CONTEXT.md` — Phase 60's D-01..D-17,
  which this phase inherits and must not re-litigate.

### Artifacts this phase creates

- `.planning/reviews/61-COVERAGE.md` — **does not yet exist.** The phase's sole deliverable.
  Created by plan `61-01` (skeleton + `RU-61-06`), appended by `61-02`..`61-07`.

### Code under review (the 7 units)

- `bbj-vscode/src/language/` — the review surface. Unit membership, per-file LOC and risk ranks are
  enumerated in INVENTORY §"Phase 61 review units"; do not re-derive them.
- `java-interop/` — **reference reading only** (D-13). Establishes the wire contract for the SEC-06
  analysis. No finding may be located here.

### Code-truth references

- `CLAUDE.md` (repo root) — build/test commands, the Langium pipeline description, DI module pattern,
  testing pattern, AST type constants. Doubles as a **D8 target**: its claims about
  `src/language/` are checkable against the code Phase 61 is reading. Note it names only a subset of
  `validations/` (`check-classes.ts`, `check-variable-scoping.ts`, `line-break-validation.ts`) and
  omits `check-function-calls.ts` — a candidate D8 check, not an asserted finding.
- `bbj-vscode/VERBs.md` — BBj verb implementation status; relevant to D5/D8 claims against
  `RU-61-07`'s catalogs.
- `bbj-vscode/package.json` — version reads `0.12.0`; `contributes` surface.

### Explicitly NOT to be read (D-16)

- `.planning/codebase/ARCHITECTURE.md`, `CONCERNS.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`,
  `STACK.md`, `STRUCTURE.md`, `TESTING.md` — all dated 2026-02-01, all superseded by INVENTORY.md
  per Phase 60 D-16. `CONCERNS.md` carries the highest re-report risk (v3.8-resolved FIXMEs,
  Langium 3.2.1). Prohibited for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **INVENTORY.md has already done the scoping work.** Unit boundaries, per-file LOC, risk ranks,
  dimension applicability, the 38 `n/a` reasons, the finding template, the dedup snapshot and the
  D-06 routing table all exist. Phase 61 reads them; it does not re-derive them. This is the single
  largest cost saving available to the planner.
- **Phase 61's live dimensions are only 6, not 8.** D6 is `n/a` for all 7 units (R-D6-CENTRAL —
  dependency health is assessed once at `RU-64-02`) and D7 is `n/a` for all 7 (R-D7-SHARED-LS — the
  single shared `out/language/main.cjs` binary means there is no second implementation to compare
  against). The `.bbl` file-exception rows narrow further, to D2 and D4 only.
- **Plan 60-01's `RU-62-04` write-up is a worked example of the target shape** — the tracer can
  follow its structure rather than inventing one.
- **`gh` CLI is authenticated** in this environment, though Phase 61 does not need it: D-14's dedup
  runs against the frozen snapshot in INVENTORY, and Phase 69 re-queries live.

### Established Patterns

- **Finding IDs `P61-D{dimension}-{seq}`**, zero-padded to three digits, allocated monotonically in
  discovery order within each `(61, dimension)` pair. Phase `00` is reserved for template examples.
- **Each `.ts`/`.bbl` catalog pair is near-duplicate content in two formats** (`events.ts` 734 vs
  `events.bbl` 732; `functions.ts` 995 vs `functions.bbl` 993; `labels.ts` 67 vs `labels.bbl` 61;
  `variables.ts` 86 vs `variables.bbl` 84) — INVENTORY flags this as a D4 duplication candidate for
  `RU-61-07` to confirm, and D-08 makes it a mechanical diff rather than an eyeball comparison.
- **`constants.ts` (1 line) and `utils.ts` (0 lines) are effectively empty** — INVENTORY flags a
  plausible D4 dead/vestigial-module finding on `RU-61-05` **for confirmation, not as an asserted
  finding**. The reviewer confirms or dismisses it with evidence.
- **The 11 `test/linking.test.ts` failures are environment-classified, not code defects** — and per
  the established environment fact, bringing a java-interop peer up on port 5008 does **not** fix
  them; that has been tried. D5 findings here should not propose "run the service" as the fix.

### Integration Points

- **Phase 67** consumes Phase 61's `classification: easy|major` and finding IDs to apply fixes.
  **Phase 66** consumes the D-14 cross-referenced DEBT findings. **Phase 68** concatenates
  `61-COVERAGE.md` with the other four coverage files against INVENTORY's grid to produce DOC-03,
  and assembles DOC-01/DOC-02 from the finding dispositions — it does not re-triage.
  **Phase 69** files issues, gated on ISSUE-01 approval.
- **v4.0 work lives on `v4.0-stability-and-quality`** (created 2026-08-17 at `748eb43`), not `main`.
  The 29 v4.0 planning commits were originally made on `issue494-cyclic-inheritance-hang`; they were
  unpushed, so the branch was split by pointer move — `issue494-cyclic-inheritance-hang` is back at
  `a7e1b53` (in sync with origin, carrying only its fix) and every v4.0 commit SHA is unchanged, so
  the SHAs cited in INVENTORY.md's D-15 correction log (`9cc746a`, `110be82`, `e8f566e`) remain
  valid. `a7e1b53` is an ancestor of both branches. D-15 pins the sweep to
  `v4.0-stability-and-quality`'s HEAD with the SHA recorded.
- **Local `main` is behind `origin/main` by 4 commits** — `origin/main` has moved past `v0.12.0`.
  The v4.0 branch is based on the tree the milestone was planned against, not on latest `main`;
  reconciling that divergence is a merge question for ship time, not for this phase.

</code_context>

<specifics>
## Specific Ideas

- The tracer's job is explicitly **to prove the recording shape**, mirroring how plan 60-01 worked
  `RU-62-04` end to end — the D-05 checkpoint reviews the shape, not the findings.
- A `pass` cell should read like the `n/a` reasons INVENTORY wrote: a written sentence testing the
  dimension against its own definition, never a mechanical or generic line.
- The D-17 gate should state the expected totals **and** re-derive them, so a miscount in this
  discussion surfaces as a defect instead of quietly becoming the contract.
- For an unfixed `critical`/`high` D1 finding in a public repo: name the surface and the problem
  class, confirm the repro exists and say what it establishes — but do not publish the sequence.

</specifics>

<deferred>
## Deferred Ideas

- **Building a hostile-peer test harness** for java-interop (a fake peer returning malformed,
  oversized, hostile and never-arriving responses) — considered and rejected as up-front work for
  this phase (D-11). It is test infrastructure built during a review phase whose output is findings,
  and Phase 64 already owns the existing `bbj-vscode/tools/interop-test-harness/`. A harness is built
  only if a specific `critical`/`high` D1 finding demands the repro.
- **Reviewing the `java-interop/` Java service** — remains FUT-01 and an explicit Out-of-Scope row.
  D-13 permits reading it as reference and routes Java-side observations to the backlog; it does not
  open it for review or filing.
- **Regenerating the seven `.planning/codebase/*.md` maps** — already deferred by Phase 60 D-16;
  D-16 of this phase goes further and prohibits reading them here.
- **Three gray areas raised but not explored** (user was ready for context): the per-unit stopping
  rule; how `not-reproducible` dispositions surface alongside passes; and whether Phase 61 should
  assume Phases 62-64 run concurrently. All recorded under Claude's Discretion above.

</deferred>

---

*Phase: 61-Language Core Review*
*Context gathered: 2026-08-17*
