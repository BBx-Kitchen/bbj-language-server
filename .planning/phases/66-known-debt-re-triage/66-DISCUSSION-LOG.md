# Phase 66: Known Debt Re-triage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-19
**Phase:** 66-known-debt-re-triage
**Areas discussed:** Fix-vs-file boundary, Debt denominator, Re-triage depth, Output artifact shape

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Fix-vs-file boundary | Is Phase 66 allowed to land code changes and open GitHub issues, or verdict-only? | ✓ |
| Debt denominator | 6 items, 8, or 9? DEBT-06's gate is unprovable without a fixed denominator | ✓ |
| Re-triage depth | Accept inherited P61/P63 findings, or re-verify live? Incl. DEBT-04 (no evidence) and DEBT-05 (not derivable from tree) | ✓ |
| Output artifact shape | Where verdicts land; whether PROJECT.md is edited by this phase | ✓ |

**User's choice:** All four.

---

## Fix-vs-File Boundary

### Q1 — Can Phase 66 modify source files?

| Option | Description | Selected |
|--------|-------------|----------|
| Verdict-only | No source changes; fixable items route to Phase 67. Keeps one-phase-one-job shape and FIX-03's green-suite gate with Phase 67 | ✓ |
| Fixes allowed, scoped | May land small contained regression-tested fixes. Duplicates Phase 67's machinery in a phase without its gates | |
| Fixes allowed, unrestricted | Includes the DEBT-01 perf work. Largest-risk change in the milestone in the phase with weakest gates | |

**User's choice:** Verdict-only. → **D-01**

### Q2 — How is the 'filed' half discharged, given ISSUE-01 is Phase 69's gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Draft only, 69 files | Zero tracker writes; issue-ready drafts handed to Phase 69. One approval gate, one filing moment | ✓ |
| Phase 66 files its own | Second approval gate outside ISSUE-01; would corrupt Phase 69's ISSUE-04 dedup re-query | |
| #232 comment only, rest drafted | One tracker write escapes ISSUE-01's single gate | |

**User's choice:** Draft only. → **D-02**
**Notes:** Option 3 was moot in any case — #232 was confirmed CLOSED during discussion, so there is no open issue to comment on.

### Q3 — How do DEBT verdicts enter the Phase 68/69 pipeline?

| Option | Description | Selected |
|--------|-------------|----------|
| As `P66-*` findings | INVENTORY's frozen record format; flows through 68→69 identically to the 33 sweep findings | ✓ |
| Separate DEBT ledger | Keyed by DEBT-01..06. More legible as debt, but Phase 68 must merge two record shapes | |
| Both — findings plus index | An index that can drift from the records it points at | |

**User's choice:** As `P66-*` findings. → **D-03**

### Q4 — DEBT-02's doc-only closure vs DEBT-06's issue-required closure?

| Option | Description | Selected |
|--------|-------------|----------|
| DEBT-06 wins — issue required | Documentation becomes the issue body, not an alternative to filing. DEBT-06 is the milestone's closure gate and its wording is absolute | ✓ |
| DEBT-02 wins — doc suffices | In-repo record only; DEBT-06 would need an explicit carve-out or its gate is unprovable | |
| Split by unblocking condition | Actionable → issue, upstream → doc. The line is a judgment call, so the gate stops being mechanically checkable | |

**User's choice:** DEBT-06 wins. → **D-07**

---

## Debt Denominator

### Q1 — What is the closed denominator?

| Option | Description | Selected |
|--------|-------------|----------|
| PROJECT.md's 8 bullets | Exactly what DEBT-06 names; re-derived live (counted: 8). Closes INVENTORY:1220's drift | ✓ |
| The 6 DEBT requirements | Simplest, but leaves two bullets as prose at milestone end — what DEBT-06 forbids | |
| 8 bullets + sweep-routed items | Most complete, but the sweep-routed items are already findings flowing to 68/69 — risks duplicates | |

**User's choice:** PROJECT.md's 8 bullets. → **D-04**

### Q2 — How are the two orphan bullets mapped?

| Option | Description | Selected |
|--------|-------------|----------|
| Add DEBT-07 and DEBT-08 | Own requirements in REQUIREMENTS.md, mapped to Phase 66. Traceable; neither orphan folds naturally | ✓ |
| Denominator rows only, no new IDs | Avoids a mid-milestone contract edit; traceability lives only in this phase's doc | |
| Fold into existing DEBT items | Cheapest, but arbitrary — CPL-06 is compiler timing, TextMate is bundle registration | |

**User's choice:** Add DEBT-07 and DEBT-08. → **D-05**

### Q3 — What verdict vocabulary closes each row?

| Option | Description | Selected |
|--------|-------------|----------|
| INVENTORY's disposition set | `easy-fix | major-refactor | duplicate | wontfix | already-covered | not-reproducible` verbatim. Nothing new; Phase 68 assembles unchanged | ✓ |
| Debt-specific outcome set | Says what happens next rather than what kind of finding it is; Phase 68 would map two vocabularies | |
| Both — disposition plus outcome | Two fields that can disagree, needing a consistency gate | |

**User's choice:** INVENTORY's disposition set. → **D-06**
**Notes:** Follows Phase 65 D-10's precedent that inapplicable fields must not be added.

---

## Re-triage Depth

### Q1 — How deep for items with inherited sweep evidence?

| Option | Description | Selected |
|--------|-------------|----------|
| Cite + confirm still-current | Cite by ID, re-run the recorded command or re-read the `file:line` anchor against swept SHA `1750ad74`, then write the verdict | ✓ |
| Full re-derivation | Highest confidence, but re-does ~4 units of finished work; disagreements become drift records anyway | |
| Cite only, no re-check | Cheapest, but makes criterion 1's "against current code" unprovable | |

**User's choice:** Cite + confirm still-current. → **D-08**

### Q2 — How is DEBT-04 established (zero inherited evidence)?

| Option | Description | Selected |
|--------|-------------|----------|
| Static trace to `trace` tier | Read `bbj-scope.ts:199-213`'s `isClassRef`/`isJavaClass` branch and the completion provider; record the JAR-redeployment dependency as blocker | ✓ |
| Attempt live reproduction | Strongest evidence, but known pre-existing failures mean a failed setup is indistinguishable from a failed repro | |
| Record as unverifiable | Item ends the milestone with the evidence quality it started with | |

**User's choice:** Static trace. → **D-09**

### Q3 — How is DEBT-05's experimental-API count established?

| Option | Description | Selected |
|--------|-------------|----------|
| Measure against the cached jar | The installed 0.19.0 artifact is locally present; read annotations off the 9 named APIs our 11 files touch | ✓ |
| Upstream docs and changelog | Adds forward-looking signal, but depends on network and on upstream accuracy about its own annotations | |
| Retire the number, assess the coupling | Criterion 4 says "against the installed LSP4IJ version" — a coupling count alone doesn't establish upstream stability | |

**User's choice:** Measure against the cached jar. → **D-10**
**Notes:** Jar location confirmed during discussion at `~/.gradle/caches/8.13/transforms/adf3542.../lsp4ij-0.19.0.jar`, matching the `0.19.0` pin at `build.gradle.kts:27`.

### Q4 — How concrete must DEBT-01's implementation plan be?

| Option | Description | Selected |
|--------|-------------|----------|
| Named-edit level | Cache shape/key/invalidation for `getBBjClassesFromFile`; `isExternalDocument`-aware prune for `collectLocalSymbols` modelled on `bbj-linker.ts:47-58`; `isAffected()` as existing partial mitigation; a measurement method | ✓ |
| Approach level | A future implementer re-derives the design; "concrete implementation plan" becomes a judgment call | |
| Prototype-backed | Benchmark scaffolding is real work in a verdict-only phase, and #232's symptom is macOS-specific and load-dependent | |

**User's choice:** Named-edit level. → **D-11**
**Notes:** `gh issue view 232` returned CLOSED during discussion, so criterion 1's "issue update" becomes a new drafted issue superseding #232.

---

## Output Artifact Shape

### Q1 — Where do verdicts land, and under what filename?

| Option | Description | Selected |
|--------|-------------|----------|
| `.planning/reviews/66-COVERAGE.md` | Phase 68's DOC-03 walk picks it up with no special case — the trade Phase 65 D-03 already decided the same way | ✓ |
| `66-DEBT-TRIAGE.md` | More honest name, but breaks the `6N-COVERAGE.md` walk for a cosmetic gain | |
| Fold into the phase directory | Splits the evidence base across two trees | |

**User's choice:** `.planning/reviews/66-COVERAGE.md`. → **D-12**

### Q2 — Who edits PROJECT.md's debt list, and when?

| Option | Description | Selected |
|--------|-------------|----------|
| 66 writes IDs, 69 backfills numbers | Prose becomes a pointer into the evidence base; keeps DEBT-06 provable inside the phase that owns it | ✓ |
| Leave it to Phase 69 | One edit, no intermediate state — but DEBT-06 becomes unprovable inside Phase 66 | |
| Phase 68 owns the rewrite | Same intermediate state as option 1, just further from the phase that owns the requirement | |

**User's choice:** 66 writes IDs, 69 backfills. → **D-13**

### Q3 — What gates close the phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Four gates incl. boundary | Denominator, criterion, requirement, plus a boundary gate proving zero source mutation and zero tracker writes | ✓ |
| Three gates, no boundary | Mirrors Phase 65 D-16, but leaves D-01/D-02 asserted rather than evidenced | |
| Criterion gate only | DEBT-06's "every item" claim would have no denominator behind it | |

**User's choice:** Four gates. → **D-15**

### Q4 — How is the work split into plans?

| Option | Description | Selected |
|--------|-------------|----------|
| Three plans by evidence source | `66-01` inherited-evidence items + skeleton; `66-02` live investigation (DEBT-04, DEBT-05); `66-03` orphans, edits, closure, gates | ✓ |
| Two plans | Plan 1 would mix cheap citation work with the jar measurement and static trace — uneven task weight | |
| One plan per item | Per-plan overhead exceeds the work for five of the eight rows | |

**User's choice:** Three plans by evidence source. → **D-14**

---

## Claude's Discretion

Recorded in CONTEXT.md `<decisions>` §"Claude's Discretion":

- Task boundaries within each plan.
- Whether the 8-row denominator renders as one table or per-item subsections.
- The order in which `66-02` takes DEBT-04 and DEBT-05.
- The exact `PRIO 1|2|3` label proposed per drafted issue.
- The method used to read annotations off the LSP4IJ jar (`javap`, unzip-and-read, or a sources artifact).
- Dimension assignment per finding follows the inherited finding's dimension (D-16) rather than a phase default.

## Deferred Ideas

- **`P61-D5-013`** — `initializeWorkspace()` hookTimeout flakiness. Its `dedup:` suggests Phase 66 triage it as a new debt item; excluded by D-04 because it is already a recorded finding flowing to Phase 68/69, and re-triaging would duplicate it.
- **`P61-D5-001`** — the `linking.test.ts` routing-table item. Same reasoning.
- **`P64-D6-010`** (with `P63-D6-002` merged) — Gradle JDK 17-vs-25.0.3 toolchain mismatch, routed by 64-COVERAGE to "Phase 66/67". Excluded from the denominator; referenced only as DEBT-08's blocker.
- **`linking.test.ts:85`'s `test.skip('Link to string template array members')`** — a third skipped test named by no `DEBT-*` item. Candidate `DEBT-09` for a future milestone, or a fold into Phase 69's DEBT-02 issue.
- **Applying any Phase 66 finding** — Phase 67 only.
- **Filing any drafted issue** — Phase 69, gated on ISSUE-01.
- **Reviewing `RU-D8-01`** — owned by no phase; still the milestone's one unrecorded grid row.
