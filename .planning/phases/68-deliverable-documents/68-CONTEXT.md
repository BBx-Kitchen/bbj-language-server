# Phase 68: Deliverable Documents - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** `--auto` — every gray area was auto-resolved with its recommended option. See
`68-DISCUSSION-LOG.md` for the per-question audit trail. All decisions here are **correctable**:
the planner follows them unless the user says otherwise.

<domain>
## Phase Boundary

This phase **writes two documents and nothing else**. It is a pure assembly phase — it applies no
source change, files nothing to the tracker, and re-triages no classification.

It delivers:

1. **`.planning/reviews/EASY-FIXES.md`** (DOC-01) — every `easy-fix` record with finding ID,
   `file:line`, dimension, verified failure scenario, the fix applied, and its commit hash.
2. **`.planning/reviews/MAJOR-REFACTORS.md`** (DOC-02) — every `major-refactor` record with finding
   ID, `file:line`, dimension, verified failure scenario, proposed approach, effort estimate, and
   proposed labels.
3. **A coverage statement opening both documents** (DOC-03) — modules reviewed, dimensions applied,
   exclusions, **and the gaps**, so a reader sees what was *not* checked as clearly as what was.
4. **A recorded disposition for every finding that is neither** (DOC-04) — wontfix,
   not-reproducible, overlap-with-existing-issue, and the Phase 67 non-apply verdicts.

### The corpus, measured

Derived live at context-gathering time from the six closed COVERAGE files by counting the
`disposition:` field:

| Source | `major-refactor` | `easy-fix` | `wontfix` | Records |
|---|---|---|---|---|
| `61-COVERAGE.md` | 29 | 44 | 0 | 73 |
| `62-COVERAGE.md` | 20 | 14 | 0 | 34 |
| `63-COVERAGE.md` | 52 | 10 | 0 | 62 |
| `64-COVERAGE.md` | 34 | 8 | 2 | 44 |
| `65-COVERAGE.md` | 3 | 0 | 0 | 3 |
| `66-COVERAGE.md` | 6 | 1 | 1 | 8 |
| **Total** | **144** | **77** | **3** | **224** |

Severity across all 224: 2 `critical`, 16 `high`, 100 `medium`, 106 `low`.
Effort across all 224: 98 × `2`, 79 × `4`, 45 × `8`, plus **2 off-scale `1` values** already
annotated in-record as rounded down (Phase 67 `<specifics>`) — carry the annotation, do not re-round.
Evidence tier across all 224: 108 `repro`, 80 `trace`, 36 `inherited` — **every record is verified**;
none is a "not-reproducible" record, because RVW-06 routed those elsewhere (see D-05).

Beyond the 224 numbered records, the COVERAGE files carry two prose sub-blocks per review unit that
hold the rest of DOC-04's population:

| Prose sub-block | Items | Where |
|---|---|---|
| `### Not-reproducible dispositions` | **24** | 61 → 11, 62 → 4, 63 → 2, 64 → 7; 65 says "None" explicitly, 66 has no such block |
| `### Cross-unit referrals` / `### Cross-references` | **30** | 61 → 12, 62 → 7, 63 → 1, 64 → 10 |

And the `dedup:` field: **210 of 224 read `none`**; **14 carry a real annotation** naming an existing
issue or a superseded item (`#231`, `#475`, `#485`, `#486`, `#466` ×2, `#65` ×2, `#33`, `#381`,
`DEBT-02` ×2, `DEBT-05`, and one `supersedes`).

### What this phase does NOT do

- **No source change.** Phase 67 was the only apply phase (Phase 66 D-01, Phase 67 D-01).
- **No write to `.planning/reviews/INVENTORY.md`** — immutable for v4.0 (Phase 60 D-09).
- **No write to any `6N-COVERAGE.md`** — the six sweep records are closed (Phase 67).
- **No write to the GitHub tracker.** Phase 69 is the only phase that files, under ISSUE-01's single
  approval gate (Phase 66 D-02). Reading the tracker is permitted; writing is not.
- **No re-triage of `easy` vs `major`.** INVENTORY §3c is the single routing rule and every record
  already carries its six-test result. This phase transcribes the verdict; it never revises it.
- **No new finding.** If assembly surfaces something the sweeps missed, it is reported as a
  discrepancy in the phase close-out, not written into the corpus as a 225th record.

</domain>

<decisions>
## Implementation Decisions

Decision IDs are **phase-local** (`D-01`..`D-12`). Phase 60–67's `D-nn` IDs are separate namespaces;
where one is meant it is written as "Phase 6N D-nn".

### Derivation and the Closed Denominator

- **D-01: Both documents are mechanically derived by a committed script, with a reconciliation
  section.** This mirrors Phase 67 D-01 and its `derive-apply-set.mjs`, which worked: the ledger's
  completeness was provable against the corpus rather than by summing plans.

  A `derive-review-docs.mjs` lives in the phase directory, is committed, and selects records by the
  `disposition:` field across the six COVERAGE files. Each document opens with a **Derivation**
  section naming the script and the selection rule, and a **Reconciliation** section showing the
  arithmetic: 224 records in → 144 + 77 + 3 out, every row accounted for, none silently absent.

  — **Reversibility:** reversible — the script and both documents are new planning files; nothing
  else depends on them until Phase 69 reads MAJOR-REFACTORS.md.

- **D-02: The denominator is 224 records, and a different derived number is a finding, not an
  adjustment.** The counts in `<domain>` above were produced by that selection at
  context-gathering time and are the expected result. A planner or executor that derives a
  different total treats the discrepancy as something to report, not to silently absorb — the same
  rule Phase 67 `<specifics>` set for its 77.

- **D-03: `EASY-FIXES.md` carries all 77 easy-fix records, not just the 70 applied.** DOC-01's
  "every easy finding" is read as the full `easy-fix` selection. `67-APPLY-SET.md`'s index records
  four verdicts, and all four appear:

  | Verdict | Count | What the row shows |
  |---|---|---|
  | `applied` | 70 | fix applied + commit hash(es) |
  | `no-op` | 4 | already resolved by another finding's fix — the resolving finding ID and its commit |
  | `excluded` | 2 | `P64-D8-003`, `P64-D8-004` — INVENTORY immutable (Phase 60 D-09, Phase 67 D-03) |
  | `deferred` | 1 | `P63-D7-004` — no JDK 17 → no Gradle test (Phase 67 D-15) |

  The seven non-applied rows carry their verdict and reason inline, so `EASY-FIXES.md` is its own
  closed denominator and a reader never needs `67-APPLY-SET.md` open to see why a row has no commit.

  Note the **four `no-op` verdicts were discovered during Phase 67 execution** — its CONTEXT
  predicted only 2 excluded + 1 deferred. They are real outcomes, not bookkeeping: `P61-D8-001`,
  `P61-D8-002`, `P61-D8-006` and `P62-D5-004` were each resolved by another finding's fix before
  their own turn came.

- **D-04: Row content is lifted from `67-APPLY-SET.md`, not re-derived from source or COVERAGE.**
  Phase 67's close-out states that all 77 ledger rows carry exactly the fields DOC-01 requires —
  `finding_id:`, `location:`, `dimension:`, `failure_scenario:`, `fix_applied:`, `commit:` — plus a
  `user_facing:` flag DOC-01 does not require. Lifting is the whole point of that design; re-deriving
  would risk producing a *different* document from the same corpus.

  The `user_facing:` flag is carried through: **29 rows read `user_facing: yes`**, and those are the
  rows that discharge FIX-04 (see D-11).

### DOC-04 — Reconciling the Named Categories With What Exists

- **D-05: DOC-04's four categories are reconciled against the corpus honestly, including the empty
  one.** DOC-04 names "duplicate, wontfix, already-covered, not-reproducible". The corpus does not
  contain four disposition values — it contains three, and two of DOC-04's categories live somewhere
  other than the `disposition:` field. The mapping is stated in the document rather than a category
  being presented as populated when it is not:

  | DOC-04 category | Where it actually lives | Count |
  |---|---|---|
  | `wontfix` | `disposition:` field | **3** — `P64-D8-002`, `P64-D6-012`, `P66-D5-003` |
  | `not-reproducible` | `### Not-reproducible dispositions` prose blocks | **24** |
  | `duplicate` | nowhere — **no finding was dropped as a duplicate** | **0** |
  | `already-covered` | the `dedup:` field's non-`none` annotations | **14** |

  **The `duplicate` count is zero and the document says so in words.** RVW-07 required every finding
  to be checked against the 15 frozen open issues *before* being recorded; where overlap existed it
  was annotated in-record as `partial-overlap` or `supersedes` and the finding was still recorded.
  Nothing was discarded for duplicating a tracker entry. Writing "0 — and here is why that is the
  right number" is the honest form; quietly omitting the category would read as an oversight.

  — **Reversibility:** reversible — a presentation decision inside a new document.

- **D-06: DOC-04's population lives in one `## Other Dispositions` section in `MAJOR-REFACTORS.md`,
  with a one-line pointer from `EASY-FIXES.md`.** No third artifact is created: the ROADMAP names
  two documents and Phase 69 reads MAJOR-REFACTORS.md, so a third file would be an artifact nothing
  is scoped to consume. Duplicating the section into both documents would create two copies that can
  drift.

  MAJOR-REFACTORS.md is the right home because DOC-04's population is dominated by **things that are
  not being fixed** — 3 wontfix and 24 not-reproducible — which is that document's subject matter.
  The easy-fix side's own non-applied rows stay in `EASY-FIXES.md` under D-03, because they *are*
  `easy-fix`-classified records and belong with their denominator.

- **D-07: The 30 cross-unit referrals are recorded with their resolution.** Each referral handed a
  candidate observation from one review unit to another. The section records, per referral, whether
  the receiving unit went on to record a finding for it — and names that finding ID where it did.

  This is inside DOC-04's intent, not beyond it: a referral whose receiving unit recorded nothing is
  precisely a finding "dropped silently", which is what DOC-04 exists to prevent. A referral that
  landed is `already-covered` with a citation. Either way the reader can check it.

### DOC-03 — The Coverage Statement

- **D-08: The coverage preamble is self-contained and states the gaps, not just the scope.** Both
  documents open with the same preamble block. DOC-03's wording is "so coverage gaps are visible to
  a reader" — a preamble listing only what *was* reviewed does not discharge it.

  **Scope half** — 21 review units across the four sweep phases, the 8 dimensions (D1–D8) with the
  applicability grid totals, and the named exclusions: `java-interop/` (scope decision at milestone
  start; the TypeScript client is reviewed), `bbj-vscode/src/language/generated/` (17.5k LOC,
  machine-generated), `bbj-vscode-deprecated/` (stale `.vsix`, no source), grammar redesign, and
  wholesale test authoring.

  **Gap half** — stated as plainly as the scope:
  - **No IntelliJ fix was compiled or tested.** The only installed JDK is Temurin 25.0.3 and
    `bbj-intellij/build.gradle.kts` targets Java 17, so `./gradlew build` cannot run. Nine applied
    `bbj-intellij/` fixes are review-verified only (Phase 67 D-14), and one is deferred for the same
    reason (Phase 67 D-15).
  - **11 deterministic `npm test` failures** in `test/linking.test.ts > Interop related tests`, all
    from an unreachable java-interop peer. Opening a listener on port 5008 does not fix them
    (Phase 64 D-06).
  - **24 not-reproducible candidate claims** — each is an area a reviewer looked at and could not
    settle within a read-only sweep. They are coverage gaps by definition and the preamble links to
    the `## Other Dispositions` section that enumerates them.
  - **Phase 65's shape:** its sweep enumerated ~36 items but recorded only 3 as findings, because
    the rest were resolved by direct code trace. The preamble says this rather than letting a reader
    infer that the security audit found almost nothing.

  The preamble **summarises** INVENTORY rather than restating its grid verbatim, and cites
  `INVENTORY.md` §"Applicability Grid" and §"Surface Accounting & Named Exclusions" for the full
  detail. A reader gets a truthful picture without a second file open, and an auditor gets the path.

  — **Reversibility:** reversible.

### MAJOR-REFACTORS.md Shape and the Phase 69 Handoff

- **D-09: Each of the 144 records is a block in INVENTORY's frozen field order, plus four
  Phase-69-facing fields.** The added fields are `proposed_approach:`, `effort:`,
  `proposed_labels:` (area + `PRIO 1|2|3` + effort `2|4|8`), and an **empty `issue:` slot** that
  Phase 69 fills under ISSUE-05.

  Labels are applied from INVENTORY §3d's locked scales, never re-derived — the same discipline
  Phase 67 D-05 applied to classification. ISSUE-02 requires each filed issue to be readable without
  opening the review documents, so `proposed_approach:` and `failure_scenario:` must each stand
  alone in the block; Phase 69 lifts them directly into issue bodies.

  — **Reversibility:** costly — Phase 69 writes issue numbers back into this file under ISSUE-05.
  Once that has happened, regenerating the document from `derive-review-docs.mjs` would clobber every
  filed issue number. The field set therefore has to be right *before* Phase 69 runs, and the
  derivation script must be re-run only against a pre-Phase-69 state.

- **D-10: Primary order is originating phase then finding ID; a severity-sorted index sits above
  it.** Phase-then-ID matches `67-APPLY-SET.md` and keeps the two documents diffable against the
  ledger and against each other. The index table — sorted by severity, then `PRIO`, then effort —
  is what Phase 69 works down when filing, so the 2 `critical` and 16 `high` records surface first
  rather than being buried at whatever phase they happened to come from.

### Requirement Discharge

- **D-11: This phase discharges FIX-04, and its close-out says so explicitly.** FIX-04 ("no applied
  fix changes user-facing behavior without that change being recorded in EASY-FIXES.md") was
  deliberately left un-discharged at the end of Phase 67 — its close-out records that
  `.planning/reviews/EASY-FIXES.md` did not exist and that FIX-04 "becomes true when Phase 68
  assembles the document".

  Writing `EASY-FIXES.md` with the 29 `user_facing: yes` rows completes it. The Phase 68 close-out
  states this in the same plain form Phase 66 D-02 and Phase 67 D-14 used — naming the requirement,
  naming the phase that deferred it, and naming the rows that now carry it — rather than leaving a
  reader to notice that a Phase 67 requirement quietly became true two phases later.

- **D-12: The write boundary is exactly two files in `.planning/reviews/`, plus this phase's own
  directory.** `EASY-FIXES.md` and `MAJOR-REFACTORS.md` are created; `derive-review-docs.mjs`,
  `PLAN.md`s and `SUMMARY.md`s land in `.planning/phases/68-deliverable-documents/`. Nothing else in
  the tree is touched — no source, no `INVENTORY.md`, no COVERAGE file, no `REQUIREMENTS.md` text,
  no tracker.

  `git status --porcelain .planning/reviews/` at phase close should show exactly two new files and
  no modifications. That is a cheap, checkable gate and the close-out records its output.

### Claude's Discretion

Recorded so planning is not blocked. Both are **correctable** — follow them unless the user says
otherwise.

- **Plan and wave grouping.** Wave 1: the derivation script plus the shared coverage preamble
  (D-08), since both documents depend on them. Wave 2: `EASY-FIXES.md` (77 rows) and
  `MAJOR-REFACTORS.md` (144 rows + `## Other Dispositions`) authored in parallel — they share no
  file. Wave 3: reconciliation, the FIX-04 close-out statement (D-11), and the D-12 write-boundary
  check. The 144-record document is the larger job and may warrant splitting by originating phase.

- **Whether the derivation script is committed.** Yes — committed alongside the documents, as
  `derive-apply-set.mjs` was in Phase 67. A derivation nobody can re-run is an assertion, not a
  proof.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The finding corpus — this phase's entire input

- `.planning/reviews/61-COVERAGE.md` — Phase 61 sweep (`bbj-vscode/src/language/`). 73 records:
  29 major, 44 easy. Also 11 not-reproducible items and 12 cross-unit referrals.
- `.planning/reviews/62-COVERAGE.md` — Phase 62 sweep (extension host, composers, TextMate).
  34 records: 20 major, 14 easy. Also 4 not-reproducible, 7 referrals.
- `.planning/reviews/63-COVERAGE.md` — Phase 63 sweep (`bbj-intellij/`). 62 records: 52 major,
  10 easy. Also 2 not-reproducible, 1 referral. **The largest major-refactor source.**
- `.planning/reviews/64-COVERAGE.md` — Phase 64 sweep (build, CI, dependencies). 44 records:
  34 major, 8 easy, **2 wontfix** (`P64-D8-002`, `P64-D6-012`). Also 7 not-reproducible,
  10 cross-references.
- `.planning/reviews/65-COVERAGE.md` — Phase 65 cross-cutting security audit. **3 records, all
  major** — its "Not-reproducible dispositions" blocks say "None" explicitly because ~36 enumerated
  items were settled by direct code trace. See D-08's gap half.
- `.planning/reviews/66-COVERAGE.md` — Phase 66 known-debt re-triage. 8 records: 6 major, 1 easy,
  **1 wontfix** (`P66-D5-003`, DEBT-08, blocked on `P64-D6-010`). `P66-D2-003` carries DEBT-07.

### The assembled easy-fix ledger — DOC-01's direct source

- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — **77 rows**, each with `finding_id:`,
  `location:`, `dimension:`, `severity:`, `effort:`, `verdict:`, `failure_scenario:`,
  `fix_applied:`, `user_facing:`, `verification:`, `commit:`. §"Index" is the verdict table
  (70 applied / 4 no-op / 2 excluded / 1 deferred); §"Close-out" §"FIX-04 verdict" states exactly
  what Phase 68 is expected to lift; §"Recorded departures" carries the D-06 sequencing departure.
- `.planning/phases/67-apply-easy-fixes/derive-apply-set.mjs` — the selection/ordering logic
  `derive-review-docs.mjs` should mirror (D-01).

### The standard the corpus was written against

- `.planning/reviews/INVENTORY.md` §"Finding Record Template" — the exact field shape. Both
  documents' record blocks derive from it. **Immutable for v4.0 (Phase 60 D-09).**
- `.planning/reviews/INVENTORY.md` §3a "Finding IDs", §3b "Evidence Tiers" — ID scheme and the
  `repro`/`trace`/`inherited` tiers quoted in the coverage preamble.
- `.planning/reviews/INVENTORY.md` §3c "Easy-vs-major classification (D-13)" — the six tests.
  **Applied, never re-run** (Phase 67 D-05).
- `.planning/reviews/INVENTORY.md` §3d "Severity and effort scales" — the `{2,4,8}` effort scale and
  the `PRIO 1|2|3` mapping D-09's `proposed_labels:` draws on.
- `.planning/reviews/INVENTORY.md` §"Review Units", §"Applicability Grid", §"Surface Accounting &
  Named Exclusions" — **the source for D-08's coverage preamble**: 21 units, the grid totals, the
  exclusion reasons, and the named-exclusion accounting.
- `.planning/reviews/INVENTORY.md` §"Test & Build Baseline (D-05, D-06)" — the authority for the
  11 named failing tests and the Gradle/JDK gap quoted in D-08's gap half. Do not restate suite
  numbers from anywhere else.
- `.planning/reviews/INVENTORY.md` §"Frozen Open-Issue Snapshot" — the 15 issues open at milestone
  start, against which every `dedup:` annotation was written.

### Phase boundaries this phase must respect

- `.planning/phases/66-known-debt-re-triage/66-CONTEXT.md` §D-01 — Phase 67 was the only apply phase.
- `.planning/phases/66-known-debt-re-triage/66-CONTEXT.md` §D-02 — **zero tracker writes** before
  Phase 69's ISSUE-01 approval gate.
- `.planning/phases/67-apply-easy-fixes/67-CONTEXT.md` §"Claude's Discretion" — the FIX-04 boundary
  this phase closes (D-11), and the statement that Phase 67 deliberately did not create either
  document.
- `.planning/ROADMAP.md` §"Phase 69: GitHub Issue Filing" — ISSUE-05 writes filed issue numbers back
  into `MAJOR-REFACTORS.md`. This is why D-09 leaves an `issue:` slot and rates itself `costly`.

### Requirements

- `.planning/REQUIREMENTS.md` — `DOC-01`..`DOC-04` (lines 73–76) and the coverage matrix rows
  (lines 151–154). Also `FIX-04` (line 69), which this phase discharges under D-11, and
  `ISSUE-02`/`ISSUE-03`/`ISSUE-05` (lines 79–83), which constrain `MAJOR-REFACTORS.md`'s field set.
  **No requirement text is edited by this phase.**
- `.planning/REQUIREMENTS.md` §"Out of Scope" — the exclusion table quoted in D-08's scope half.

### Project instructions

- `CLAUDE.md` (repo root) — build/test commands and architecture. Read for orientation only; this
  phase changes no code and runs no build.

</canonical_refs>

<code_context>
## Existing Code Insights

This phase writes Markdown into `.planning/reviews/` and touches no application source. The
"reusable assets" that matter are planning artifacts and one Node script.

### Reusable assets

- **`derive-apply-set.mjs`** (`.planning/phases/67-apply-easy-fixes/`) — a plain Node ESM script,
  run as `node derive-apply-set.mjs` from its own directory, that parses the six COVERAGE files and
  emits the ledger. `derive-review-docs.mjs` should be built from it rather than written fresh: the
  record-block parsing, the `disposition:` selection, and the phase-then-ID ordering are all already
  solved and already proven against this exact corpus.
- **`67-APPLY-SET.md`'s row format** — a fenced `key:` / value block per record, aligned at column
  20. Both new documents should use the same shape so the three files diff and grep alike. It is
  also close enough to INVENTORY's frozen template that a reader moving between them is not
  re-learning a layout.
- **The COVERAGE files' own record blocks** — the `failure_scenario:` and `evidence:` fields are
  already written as prose a reader can act on. `MAJOR-REFACTORS.md` lifts `failure_scenario:`
  verbatim; it does not paraphrase, because ISSUE-02 needs that text to stand alone in a GitHub
  issue two phases from now.

### Established patterns

- **The derived-denominator pattern**, used by Phases 65, 66 and 67 whenever INVENTORY handed the
  phase no closed grid: state the selection rule, state the count, argue every exclusion in writing,
  and let a reader re-run the derivation. Phase 68's Reconciliation sections are the third
  application of it.
- **The honesty pattern for partially-met requirements**, used by Phase 66 D-02 (DEBT-06) and
  Phase 67 D-07/D-14 (FIX-03/FIX-04): say what is true at phase end, name the shortfall and its
  cause, and never restate a requirement's wording as if it had been met. D-08's gap half and D-11's
  close-out statement both follow it.
- **Phase-local decision IDs** — `D-nn` is namespaced per phase; a cross-phase reference is always
  written "Phase 6N D-nn". Both documents follow this when citing decisions.
- **`.planning/` files are the only write target.** Every v4.0 phase has held this line except
  Phase 67, which was scoped to break it.

### Integration points

- **`MAJOR-REFACTORS.md` → Phase 69.** The only downstream consumer of a Phase 68 artifact.
  ISSUE-02 (self-contained issues), ISSUE-03 (area + `PRIO` + effort labels) and ISSUE-05 (issue
  number written back per finding) all read from it. D-09's field set exists to serve those three.
- **`EASY-FIXES.md` → FIX-04.** Its 29 `user_facing: yes` rows are what makes a Phase 67 requirement
  true (D-11). Nothing downstream reads it otherwise.
- **`derive-review-docs.mjs` → the six COVERAGE files, read-only.** The script must open them for
  reading and never for writing; D-12's `git status --porcelain .planning/reviews/` check is what
  proves it did.

### Environment facts that will otherwise be misdiagnosed

- **`bc` is not installed** on this machine — arithmetic in shell scripts must use `node -e`,
  `awk`, or shell built-ins. This bit the count derivation during context gathering.
- **No JDK 17** (only Temurin 25.0.3 at `/opt/java/default`), and **java-interop on port 5008 is
  unreachable**. Neither blocks this phase — it runs no build and no test — but both are facts the
  coverage preamble must state (D-08).
- **`67-CONTEXT.md`'s per-phase finding counts are not record counts.** It cites "73 / 34 / 65 / 45 /
  37 / 18 findings" for Phases 61–66; the actual `disposition:` record counts are
  **73 / 34 / 62 / 44 / 3 / 8**. Its totals (224 / 144 / 3 / 77) and its per-phase *easy-fix* counts
  (44 / 14 / 10 / 8 / 0 / 1) are correct and match. The larger per-phase numbers count items
  *enumerated or swept*, not records recorded — the gap is widest for Phase 65, which swept ~36 items
  and recorded 3. **Derive from the `disposition:` field; do not copy the per-phase figures out of
  `67-CONTEXT.md`.**

</code_context>

<specifics>
## Specific Ideas

- **Two records point at Phase 68 by name.** `P64-D6-012`'s own disposition text reads "wontfix —
  accepted with the reasons recorded above; documented in Phase 68's ...". The record is telling this
  phase what to do with it. Honour the record's own wording in the `## Other Dispositions` entry
  rather than re-arguing the acceptance.

- **`P64-D4-004` carries a recorded departure.** Phase 67's close-out §"Recorded departures" notes it
  was applied without its paired `P64-D3-002`, because that pair is `major-refactor` and routes here.
  `MAJOR-REFACTORS.md`'s `P64-D3-002` block should carry the reciprocal note — that its `build.yml`
  `on:` block sibling already landed in Phase 67 — so whoever implements it is not surprised.

- **`P61-D2-011` and `P66-D2-001` are one defect with two records** (Phase 67 D-04), applied as one
  commit pair citing both IDs. `EASY-FIXES.md` keeps both rows and both close against the same
  commits — one row per record, as the ledger does.

- **DEBT-07 and DEBT-08 are still `Pending` in the REQUIREMENTS traceability matrix**, but both are
  covered by findings that flow through this phase: `P66-D2-003` (DEBT-07, major-refactor) and
  `P66-D5-003` (DEBT-08, wontfix). Documenting them here makes their state visible. **Ticking those
  two matrix rows is Phase 66's close-out, not this phase's** — flag the observation in the phase
  summary, edit nothing.

- **Commit message shape** stays `<type>(<scope>): <what changed>` with `docs(68):` for this phase's
  commits, matching Phase 67's `docs(...)` ledger commits.

</specifics>

<deferred>
## Deferred Ideas

- **Filing anything to the GitHub tracker** — Phase 69, under ISSUE-01's single approval gate. Not
  this phase under any circumstances (Phase 66 D-02).
- **Implementing any of the 144 major refactors** — `FUT-04`, each in its own milestone or PR. The
  explicit milestone intent is detailed issues for separate resolution.
- **Applying `P63-D7-004`** — deferred inside Phase 67 by its D-15, pending a JDK 17. Documented
  here as `deferred`; applied by whichever later phase has the toolchain.
- **Provisioning a JDK 17** so the IntelliJ fixes can be compiled and tested. Environment
  provisioning, not document assembly. It would close the largest gap the D-08 preamble has to
  declare.
- **Re-running the sweeps to settle the 24 not-reproducible claims** — each needs a runtime
  measurement, a BBj interpreter, or repository-settings access that a read-only sweep did not have.
  Recording them is DOC-04's job; settling them is not this milestone's.
- **Ticking the DEBT-07 / DEBT-08 traceability rows** — Phase 66's close-out. See `<specifics>`.

</deferred>

---

*Phase: 68-deliverable-documents*
*Context gathered: 2026-08-19*
