# Phase 62: Extension Host & Webview Composer Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 62-extension-host-webview-composer-review
**Mode:** `--auto` — all gray areas auto-selected, every question resolved to its recommended
option without an interactive prompt. Each row below records what the alternatives were.
**Areas discussed:** Sweep decomposition & ordering, D7 cross-IDE parity, Security boundary against
Phase 65, Public-repo disclosure, D4 duplication callout, Scope fidelity & completion gates

---

## Sweep decomposition & ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Tracer + one plan per unit (5 plans), risk-rank order, no new format checkpoint | Mirrors Phase 61 D-01/D-02/D-03 but drops the format checkpoint, which Phase 61 already discharged | ✓ |
| Tracer + one plan per unit, with a fresh D-05-style format checkpoint after `RU-62-04` | Re-gates the recording shape before expansion | |
| Merge `RU-62-03` + `RU-62-04` into one plan | They are tightly coupled — composer logic feeds the generators | |
| Two plans (extension host, composers) | Coarser decomposition, fewer waves | |

**Choice:** Tracer + 5 plans, `RU-62-04` → `RU-62-01` → `RU-62-03` → `RU-62-05` → `RU-62-02`, no new
checkpoint. → CONTEXT D-01, D-02, D-03, D-04.
**Notes:** Merging 03+04 was rejected because INVENTORY's unit boundaries are the recording contract
and Phase 68 concatenates against them; the coupling is handled by cross-unit referrals instead
(the mechanism Phase 61 used seven times). The checkpoint was dropped because `61-COVERAGE.md`'s
shape is already reviewed and frozen — Phase 62 adds only two named shape elements, both specified
in CONTEXT rather than discovered at a gate. One-wave-per-plan is retained: the shared-file
constraint is enforced structurally, not by trusting executor concurrency behavior.

---

## D7 cross-IDE parity — the new live dimension

| Option | Description | Selected |
|--------|-------------|----------|
| Read `bbj-intellij/` as reference only; findings located VS Code-side; referrals to Phase 63 | Mirrors Phase 61 D-13's `java-interop/` boundary, re-aimed | ✓ |
| Defer all D7 cells to Phase 63 | Leaves 5 grid cells unfilled | |
| Full symmetric review of both IDE sides | Duplicates Phase 63's contracted work | |

**Choice:** Read-as-reference, no `P62-*` finding located inside `bbj-intellij/`, IntelliJ-side
defects written as durable cross-unit referrals. → CONTEXT D-05, D-06.
**Notes:** This was the phase's largest genuinely new decision — D7 was `n/a` for all of Phase 61
and is `applies` on all five Phase 62 units. INVENTORY 3b resolves D7 to *repro-equivalent*
("a parity gap needs the concrete divergent behaviour in both IDEs"), so reading the IntelliJ side
is mandatory rather than discretionary; deferring was rejected on that basis plus Phase 60 D-09
(an unfilled cell is a visible coverage gap). Symmetric review was rejected as producing two
independent finding sets over the same IntelliJ code with colliding dedup. Because Phases 61-64 may
run concurrently, referrals are written as durable records rather than as a handoff assuming Phase
63 has not started.

---

## Security boundary against Phase 65 (SEC-01 / SEC-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 62 records concrete D1 findings; Phase 65 adds only the cross-cutting synthesis | Plus a narrative `### SEC-01/SEC-02 Surface Handoff` under `RU-62-04` | ✓ |
| Phase 62 records non-injection D1 only; injection deferred to Phase 65 | Keeps the security work in one place | |
| Phase 62 performs the full SEC-01 audit; Phase 65 becomes a formality | Front-loads everything | |

**Choice:** Record concretely, hand off a boundary map. → CONTEXT D-07, D-08.
**Notes:** Deferring injection would leave `RU-62-04`'s D1 cell — which INVENTORY calls "the
complete SEC-01 webview HTML-generation surface" — filled with a pointer instead of a verdict, the
exact hole constraint T-60-06 exists to prevent. The handoff subsection structurally mirrors Phase
61's `### SEC-06 Trust Boundary`: facts stated as facts, findings allocated only where a concrete
evidence-clearing defect exists.

---

## Public-repo disclosure for unfixed D1 findings

| Option | Description | Selected |
|--------|-------------|----------|
| Inherit Phase 61 D-12's two-tier rule verbatim, with a tightened rationale | `critical`/`high` D1: surface + class + impact only; everything else full detail | ✓ |
| Redact all D1 findings regardless of severity | Weakens low-risk records, forces Phase 67 to re-derive | |
| Full detail throughout — `.planning/` is planning, not a advisory | Publishes a payload for an unfixed injection surface in a public repo | |

**Choice:** Two-tier, applied strictly. → CONTEXT D-09.
**Notes:** The rationale deliberately tightens rather than loosens on carry-forward. Phase 61 could
argue `java-interop` binds `localhost:5008`, so a malicious peer already implies local access. That
mitigation does not transfer: a webview injection fed by values a developer's own project supplies
needs no attacker foothold, only that the developer opens a file. Same rule, stronger reason.

---

## D4 duplication callout across the composer subsystems

| Option | Description | Selected |
|--------|-------------|----------|
| Mechanical structural diff, finding allocated at both layers with a cross-reference | `RU-62-04` owns the generator-layer callout (INVENTORY names it there); `RU-62-03` owns the logic/UI layer | ✓ |
| Single finding owned by `RU-62-04` covering all 12 composer files | Simpler, but flattens two different fix targets into one record | |
| Prose comparison in the D4 cells, no allocated finding | Would not satisfy ROADMAP criterion 2's "explicitly called out" | |

**Choice:** Mechanical diff, two layered findings, method and output recorded in the cell.
→ CONTEXT D-12.
**Notes:** ROADMAP criterion 2 requires the callout explicitly, and INVENTORY's `RU-62-04` D4 row
names that unit as where it is satisfied. The D-15-confirmed asymmetry is carried into both units:
SETOPTS has no `-composer.ts`, so the `-composer.ts` baseline is 3 files, not 4. Mechanical over
eyeball follows Phase 61 D-08's precedent for near-duplicate content.

---

## Scope fidelity & completion gates

| Option | Description | Selected |
|--------|-------------|----------|
| Sweep the full grid; record the criteria/grid discrepancy explicitly; two countable gates | `RU-62-05` and `Commands.cjs` are in the grid but absent from ROADMAP's criteria | ✓ |
| Sweep only what the ROADMAP success criteria name | Leaves 8 grid cells unfilled | |
| Sweep the full grid silently | Extra coverage looks like drift rather than a decision | |

**Choice:** Full grid, discrepancy recorded in the close-out, cell gate (35/5/40, re-derived) plus
file gate (22 files enumerated from the tree). → CONTEXT D-13, D-14.
**Notes:** Both gates were executed during this discussion and both agree with INVENTORY — the awk
pass over the five `RU-62-*` grid rows prints `35 5 40`, and the tree enumeration prints `22`. The
plan re-runs them rather than restating them. `RU-62-05` is not a formality: open issue #381
(`config.bbx` highlighting lost) is that surface's exact failure mode and sits in the frozen dedup
snapshot.

---

## Claude's Discretion

Auto-mode selected the recommended option for every question above; the following were identified
as genuinely planner-owned rather than auto-answered:

- The per-unit stopping rule beyond cell coverage (Phase 61's rendered three-part rule is the
  obvious carry-forward).
- The sampling protocol — size and source — for `setopts-catalog.ts`'s D2 value-correctness check.
- Whether `RU-62-05`'s three JSON files justify a mechanical diff or a full read for their D7 cell.
- Which Phase 63 unit each D7 referral is addressed to when a divergence spans more than one.
- Whether any `critical`/`high` D1 finding on `RU-62-04` demands a runnable webview harness.

## Deferred Ideas

- Building a webview injection harness up front — built only if a specific `critical`/`high` D1
  finding demands the reproduction, and then as a Phase 67 deliverable.
- Reviewing `bbj-intellij/` — remains RVW-04 / Phase 63.
- Fixing anything found, including the SEC-01 surface — Phases 67-69.
- Deduplicating the composer subsystems — a `major` refactor by Phase 60 D-13's test (1).
- Regenerating the seven `.planning/codebase/*.md` maps — deferred by Phase 60 D-16; prohibited from
  being read here by Phase 62 D-16.
