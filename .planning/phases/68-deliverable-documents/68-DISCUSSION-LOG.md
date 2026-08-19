# Phase 68: Deliverable Documents - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-19
**Phase:** 68-deliverable-documents
**Mode:** `--auto` — no interactive prompts. Every question was resolved with its recommended
option and logged here for review. All decisions are correctable.
**Areas discussed:** Derivation method, DOC-04 taxonomy reconciliation, DOC-04 placement, DOC-03
coverage depth, MAJOR-REFACTORS record shape, EASY-FIXES denominator, Ordering

---

## Derivation method

| Option | Description | Selected |
|--------|-------------|----------|
| Derived by committed script + reconciliation section | Mirror Phase 67's `derive-apply-set.mjs`; select on the `disposition:` field; show the 224 → 144 + 77 + 3 arithmetic in the document | ✓ |
| Hand-assembled from the COVERAGE files | Author each block by reading records directly; no script | |

**Choice:** Derived by committed script (D-01, D-02).
**Notes:** Phase 67 proved the pattern on this exact corpus — its ledger's completeness was
provable against the source rather than by summing plans. A derivation nobody can re-run is an
assertion, not a proof. The 224-record denominator was measured live during context gathering, and
D-02 makes a differing derived count a reportable finding rather than a silent adjustment.

---

## DOC-04 taxonomy reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| Map all four named categories to where they actually live, including the empty one | State `wontfix` = 3 (disposition field), `not-reproducible` = 24 (prose blocks), `already-covered` = 14 (`dedup:` field), `duplicate` = 0 — and say in words why zero is correct | ✓ |
| Record only the categories that are populated | Omit `duplicate` silently since nothing maps to it | |
| Retro-fit new disposition values into the corpus | Add `duplicate`/`not-reproducible` as `disposition:` values so all four categories are populated | |

**Choice:** Map all four, including the empty one (D-05).
**Notes:** The corpus holds three disposition values, not four. Two of DOC-04's categories live
outside the `disposition:` field entirely — `not-reproducible` in per-unit prose blocks,
`already-covered` in the `dedup:` field. `duplicate` maps to nothing because RVW-07 required the
dedup check *before* recording, and overlaps were annotated in-record rather than causing a drop;
nothing was discarded for duplicating a tracker entry. Writing "0 — and here is why" is honest;
omitting the category reads as an oversight. The third option was rejected outright: the six
COVERAGE files are closed and INVENTORY is immutable (Phase 60 D-09).

---

## DOC-04 placement

| Option | Description | Selected |
|--------|-------------|----------|
| One `## Other Dispositions` section in MAJOR-REFACTORS.md | Pointer line from EASY-FIXES.md; no duplication | ✓ |
| A third file, `.planning/reviews/OTHER-DISPOSITIONS.md` | Dedicated artifact for the non-easy/non-major population | |
| Duplicate the section into both documents | Each document self-contained on dispositions | |

**Choice:** One section in MAJOR-REFACTORS.md (D-06).
**Notes:** The ROADMAP names two documents and Phase 69 reads MAJOR-REFACTORS.md — a third file
would be an artifact nothing is scoped to consume. Duplication creates two copies that can drift.
MAJOR-REFACTORS.md is the right home because DOC-04's population is dominated by things not being
fixed (3 wontfix, 24 not-reproducible). The easy-fix side's own non-applied rows stay in
EASY-FIXES.md under D-03, since those *are* `easy-fix`-classified records and belong with their
denominator.

---

## Cross-unit referrals

| Option | Description | Selected |
|--------|-------------|----------|
| Record all 30 with their resolution | Per referral, whether the receiving unit recorded a finding, and its ID where it did | ✓ |
| Omit — referrals are not findings | Treat them as internal sweep bookkeeping outside DOC-04's scope | |

**Choice:** Record all 30 (D-07).
**Notes:** Considered for scope creep and kept. A referral whose receiving unit recorded nothing is
precisely a finding "dropped silently", which is the failure DOC-04 exists to prevent. A referral
that landed is `already-covered` with a citation. Either way the reader can check it, and the check
is cheap.

---

## DOC-03 coverage depth

| Option | Description | Selected |
|--------|-------------|----------|
| Self-contained preamble stating scope **and** gaps, citing INVENTORY for full detail | Reader gets a truthful picture without a second file; auditor gets the path | ✓ |
| Pointer to INVENTORY.md's grid | Short preamble, "see INVENTORY §Applicability Grid" | |
| Restate INVENTORY's full grid verbatim in both documents | Maximum self-containment | |

**Choice:** Self-contained with gaps (D-08).
**Notes:** DOC-03's wording is "so coverage gaps are visible to a reader" — a preamble listing only
what *was* reviewed does not discharge it. The gap half names the JDK-17 absence (no IntelliJ fix
compiled or tested), the 11 deterministic interop test failures, the 24 unsettled not-reproducible
claims, and Phase 65's shape (~36 items swept, 3 recorded) so nobody infers the security audit found
almost nothing. Restating the full grid verbatim was rejected as duplication of an immutable file.

---

## MAJOR-REFACTORS record shape

| Option | Description | Selected |
|--------|-------------|----------|
| INVENTORY field order + `proposed_approach:`, `effort:`, `proposed_labels:`, empty `issue:` slot | Phase 69 lifts fields straight into issue bodies and writes the number back | ✓ |
| Minimal shape — just the DOC-02 required fields | Add labels and issue numbers in Phase 69 | |

**Choice:** Full shape with the write-back slot (D-09).
**Notes:** ISSUE-02 requires each filed issue to be readable without opening the review documents,
so `proposed_approach:` and `failure_scenario:` must each stand alone in the block. ISSUE-03 needs
area + `PRIO` + effort labels from INVENTORY §3d's locked scales. ISSUE-05 writes the filed issue
number back into this file. Rated **costly**: once Phase 69 has written issue numbers, regenerating
from the derivation script would clobber them — the field set has to be right before Phase 69 runs.

---

## EASY-FIXES denominator

| Option | Description | Selected |
|--------|-------------|----------|
| All 77 easy-fix records, each with its Phase 67 verdict | 70 applied, 4 no-op, 2 excluded, 1 deferred — reasons inline | ✓ |
| Only the 70 applied | "Fixes" document contains fixes; non-applied stay in the ledger | |

**Choice:** All 77 (D-03).
**Notes:** DOC-01's "every easy finding" is read as the full `easy-fix` selection. Carrying the
seven non-applied rows with their reasons makes EASY-FIXES.md its own closed denominator — a reader
never needs `67-APPLY-SET.md` open to see why a row has no commit hash. Worth noting the four
`no-op` verdicts were discovered during Phase 67 *execution*; its CONTEXT predicted only 2 excluded
+ 1 deferred.

---

## Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Phase then finding ID, with a severity-sorted index above | Matches `67-APPLY-SET.md`; index is Phase 69's filing order | ✓ |
| Severity/PRIO order throughout | Highest-impact findings first everywhere | |
| Group by review unit | Mirror INVENTORY's structure | |

**Choice:** Phase then ID, plus severity index (D-10).
**Notes:** Phase-then-ID keeps the two documents diffable against the ledger and each other. The
severity-sorted index is what Phase 69 works down when filing, so the 2 `critical` and 16 `high`
records surface first rather than being buried at whatever phase they came from.

---

## Claude's Discretion

Recorded in CONTEXT.md so planning is not blocked; both correctable.

- **Plan and wave grouping** — wave 1: derivation script + shared coverage preamble; wave 2:
  EASY-FIXES.md (77 rows) and MAJOR-REFACTORS.md (144 rows + `## Other Dispositions`) in parallel;
  wave 3: reconciliation, the FIX-04 close-out statement, the write-boundary check. The 144-record
  document may warrant splitting by originating phase.
- **Committing the derivation script** — yes, alongside the documents, as Phase 67 did.

## Deferred Ideas

- Filing anything to the GitHub tracker — Phase 69, under ISSUE-01's approval gate.
- Implementing any of the 144 major refactors — `FUT-04`.
- Applying `P63-D7-004` — deferred inside Phase 67 by its D-15, pending a JDK 17.
- Provisioning a JDK 17 so the IntelliJ fixes can be compiled and tested.
- Re-running the sweeps to settle the 24 not-reproducible claims.
- Ticking the DEBT-07 / DEBT-08 traceability rows — Phase 66's close-out, not this phase's.

## Observations recorded during context gathering

- **`67-CONTEXT.md`'s per-phase finding counts are enumerated-item counts, not record counts.**
  It cites 73 / 34 / 65 / 45 / 37 / 18 for Phases 61–66; actual `disposition:` record counts are
  73 / 34 / 62 / 44 / 3 / 8. Its totals (224 / 144 / 3 / 77) and per-phase easy-fix counts
  (44 / 14 / 10 / 8 / 0 / 1) are correct. Captured in CONTEXT.md `<code_context>` so the planner
  derives from the corpus rather than copying the figures.
- **`bc` is not installed** on this machine — shell arithmetic needs `node -e` or `awk`.
