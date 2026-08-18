# Phase 65: Cross-Cutting Security Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 65-cross-cutting-security-audit
**Mode:** `--auto` — Claude selected the recommended option for every question; no user prompts.
**Areas discussed:** Completeness without a grid, surface denominators, deliverable naming,
synthesis vs re-sweep, the SEC-01 baseline, plan decomposition, SEC-04/SEC-05 overlap, recording
shape, evidence standard, positive results, type-vs-runtime validation, disclosure, scope fences,
completion gates

---

## Completeness Without a Grid — the phase's defining question

| Option | Description | Selected |
|--------|-------------|----------|
| Four closed surface enumerations, one per requirement, each with a live-derived denominator and a verdict per item | Same auditable shape as the cell grid, keyed on security surfaces | ✓ |
| Narrative audit per requirement | Readable, but completeness becomes an assertion no reader can check | |
| Invent `RU-65-*` units and add them to INVENTORY | Prohibited — INVENTORY is immutable under Phase 60 D-09 | |

**Choice:** Surface enumerations → **D-01**
**Notes:** `[auto] Completeness — Q: "What replaces the grid?" → Selected: "four surface enumerations" (recommended default)`. Verified `grep -c 'RU-65' INVENTORY.md` → **0**: no units, no rows, no cell gate, no file gate. Phases 61-64 could prove completeness because INVENTORY handed them a closed denominator; Phase 65 must construct its own or "audited end to end" is unverifiable. Rated **costly** — Phase 68 reads these enumerations as the evidence SEC-01/02/04/05 were discharged.

---

## The Four Denominators

| Option | Description | Selected |
|--------|-------------|----------|
| Measure now, record in CONTEXT, re-derive live in the phase | Drift becomes visible instead of silently absorbed | ✓ |
| Leave the denominators to the plans | Nothing to check the plans against | |
| Fix them as immutable literals | A tree change between now and execution would force a false choice | |

**Choice:** Measure now, re-derive live → **D-02**
**Notes:** `[auto] Denominators — Q: "How pinned?" → Selected: "measure + re-derive" (recommended default)`. Measured: SEC-01 → **4** HTML generators; SEC-02 → **4** `onDidReceiveMessage` handlers; SEC-04 → **4 stages × 7 sites**; SEC-05 → **27** spawn sites (16 VS Code + 8 IntelliJ + 3 `.bbj`). The 4/4 symmetry on SEC-01/SEC-02 is the same four composer webviews generating HTML and receiving messages — which is what drives D-06's pairing.

---

## Deliverable Naming

| Option | Description | Selected |
|--------|-------------|----------|
| `65-COVERAGE.md`, with a header stating its construct differs | Keeps Phase 68's DOC-03 `6N-COVERAGE.md` walk working | ✓ |
| `65-AUDIT.md` | More literally accurate; breaks the concatenation for a cosmetic gain | |

**Choice:** `65-COVERAGE.md` → **D-03**
**Notes:** `[auto] Naming — Q: "Same convention?" → Selected: "65-COVERAGE.md" (recommended default)`. The header says outright that there is no cell gate here, so no reader concludes one went missing.

---

## Synthesis vs Re-Sweep

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-reference the 30 inherited D1 findings by ID; new IDs only for genuinely cross-cutting results | The phase's actual value — answering what no single-module unit was scoped to see | ✓ |
| Re-record findings in this file so it stands alone | Guarantees Phase 68 lists the same defect twice under two IDs | |
| Audit only the inherited findings | Would leave the four criteria's own surfaces unenumerated | |

**Choice:** Cross-reference; new IDs only for cross-cutting results → **D-04**
**Notes:** `[auto] Synthesis — Q: "Re-record or reference?" → Selected: "cross-reference by ID" (recommended default)`. 30 inherited D1 findings (9+7+8+6). A new `P65-*` is justified only by a gap *between* modules, an asymmetry between the two IDEs on one concern, or a chain where two acceptable behaviours compose into an unacceptable one. Otherwise → `disposition: duplicate` naming the owner, per INVENTORY's vocabulary at line 154.

---

## The SEC-01 Baseline

| Option | Description | Selected |
|--------|-------------|----------|
| Verify and extend Phase 62's conclusion; a disagreement is a finding recorded here | Neither blind trust nor wasteful rediscovery | ✓ |
| Re-derive SEC-01 from scratch | Discards a verified conclusion and re-reads the same four files | |
| Accept Phase 62's conclusion as settled | The handoff did not enumerate interpolation sites one by one | |

**Choice:** Verify and extend → **D-05**
**Notes:** `[auto] SEC-01 baseline — Q: "Trust Phase 62?" → Selected: "verify and extend" (recommended default)`. `62-COVERAGE.md`'s `### SEC-01/SEC-02 Surface Handoff` fact (1) already concludes no editor-selection, document-text, `config.bbx`, workspace-path or catalog value reaches any of the four `getHtml()` strings — no current injection path, hardening gaps only. Disagreement gets recorded with the reproduction that settles it, never a silent correction and never an edit to the closed file.

---

## Plan Decomposition

| Option | Description | Selected |
|--------|-------------|----------|
| 3 plans: SEC-01+SEC-02 / SEC-04 / SEC-05+close-out | Groups by surface; avoids two plans reading the same four files | ✓ |
| 4 plans, one per requirement | SEC-01 and SEC-02 would both read the same four webviews | |
| 2 plans: webview / process-and-token | Merges the EM token lifecycle into the spawn sweep and buries criterion 3 | |

**Choice:** 3 plans → **D-06**
**Notes:** `[auto] Decomposition — Q: "How many plans?" → Selected: "3, grouped by surface" (recommended default)`. `65-01` also creates the skeleton; `65-03` also carries the close-out. Serial waves — all three append to one file, as in Phases 61-64.

---

## SEC-04 / SEC-05 Overlap

| Option | Description | Selected |
|--------|-------------|----------|
| Assign ownership up front: `65-02` owns the token-as-process-argument question, `65-03` cross-references | Prevents a duplicate before it is written | ✓ |
| Let whichever plan reaches it first record it | Wave order makes that deterministic but undocumented | |
| Record in both with a note | Ships a duplicate by design | |

**Choice:** `65-02` owns it → **D-07**
**Notes:** `[auto] Overlap — Q: "Who owns P63-D1-003's concern?" → Selected: "65-02, lifecycle" (recommended default)`. Criterion 3's own wording ("exposure via process arguments or logs") puts it in the lifecycle question.

---

## Recording Shape & Finding IDs

| Option | Description | Selected |
|--------|-------------|----------|
| Inherit the frozen shape; IDs `P65-D1-nnn`, D1 throughout | All four requirements are security concerns; keeps Phase 68's assembly uniform | ✓ |
| New per-requirement ID scheme (`P65-SEC01-nnn`) | Breaks the dimension-keyed convention four phases share | |
| Spend a fifth format checkpoint | Re-approves an unchanged shape at the cost of an interruption | |

**Choice:** Inherit; `P65-D1-nnn` → **D-08**
**Notes:** `[auto] Recording — Q: "Shape and IDs?" → Selected: "inherit, D1 throughout" (recommended default)`. If a finding is really about correctness rather than security it belongs to the module-owning phase, not here — so a `P65-D2-*` must not appear.

---

## Effort Scale

| Option | Description | Selected |
|--------|-------------|----------|
| State the `{2,4,8}` constraint explicitly in CONTEXT | Phase 63 shipped 3 off-scale values needing post-hoc correction | ✓ |
| Assume the executors read INVENTORY §3d | That assumption already failed once this milestone | |

**Choice:** State it explicitly → **D-09**
**Notes:** `[auto] Effort — Q: "Restate the scale?" → Selected: "yes, explicitly" (recommended default)`. INVENTORY makes the effort value *be* the ISSUE-03 label with no translation step, so an off-scale value is unlabellable at Phase 69.

---

## Phase 64's `triage:` Field

| Option | Description | Selected |
|--------|-------------|----------|
| Does not apply — `classification:` and `disposition:` only | The vocabulary was introduced for SEC-08 dependency triage | ✓ |
| Carry it forward for consistency | Would make Phase 68 ambiguous about which findings the buckets cover | |

**Choice:** Does not apply → **D-10**
**Notes:** `[auto] triage field — Q: "Carry forward?" → Selected: "no" (recommended default)`.

---

## Evidence Standard — the governing rule

| Option | Description | Selected |
|--------|-------------|----------|
| Show the mechanism or dispose of it as not-reproducible; never assert | Written directly from Phase 63's false-finding failure | ✓ |
| Allow well-reasoned assertions for hard-to-reproduce security claims | Exactly what produced `P63-D1-002` | |

**Choice:** Show or dispose → **D-11**
**Notes:** `[auto] Evidence — Q: "What standard?" → Selected: "show or dispose" (recommended default)`. `P63-D1-002` claimed `Files.copy` follows a symlink and overwrites the referent. False — `LinkOption.NOFOLLOW_LINKS` governs the copy's *source*. It survived the sweep, its unit closure and the close-out, and was caught only at verification, one phase before Phase 69 would have filed it publicly. Every Phase 65 finding is a security claim in a public repo feeding Phase 69 unmodified. Worked precedents for doing this right: Phase 63's `extractTarGz` and Phase 64's `$GITHUB_OUTPUT` not-reproducible dispositions.

---

## Positive Results

| Option | Description | Selected |
|--------|-------------|----------|
| Record explicitly, with the check that established them | Criterion 1 requires CSP posture *documented*, not just defects listed | ✓ |
| Record only defects | Leaves a reader unable to distinguish checked-and-clean from unchecked | |

**Choice:** Record explicitly → **D-12**
**Notes:** `[auto] Positives — Q: "Record clean results?" → Selected: "yes" (recommended default)`. Verified during discussion: **all four** generators set a CSP meta tag with a per-render nonce and `script-src 'nonce-…'`, and all four open with `{ enableScripts: true, retainContextWhenHidden: true }` — symmetric, a genuine finding-free result. (An initial grep appeared to show only 2 of 4; it had been truncated by `head`. Re-checked per file before recording.) Precedent: Phase 64 D-12's `pull_request_target` treatment.

---

## Type Annotation vs Runtime Validation

| Option | Description | Selected |
|--------|-------------|----------|
| A TS annotation is not runtime validation and must not be accepted as evidence for criterion 2 | The annotation is erased at compile time | ✓ |
| Treat the typed signature as partial evidence | Would let criterion 2 pass on a compile-time artifact | |

**Choice:** Not validation → **D-13**
**Notes:** `[auto] SEC-02 evidence — Q: "Does the type count?" → Selected: "no" (recommended default)`. Handlers read `async (msg: { type: string; payload?: Selection }) => …` then `switch (msg.type)`. Criterion 2 asks what runtime check sits between receipt and first side effect; where the switch's `default` branch is the de-facto guard, say so precisely rather than calling it validation.

---

## Disclosure

| Option | Description | Selected |
|--------|-------------|----------|
| Inherit the two-tier rule verbatim; marker `Disclosure-limited per D-14`; no new checkpoint | Approved at Phase 62 D-09 and carried unchanged three times | ✓ |
| Spend a fifth disclosure checkpoint | Re-approves an unchanged rule | |
| Record everything in full | This is the security synthesis itself, in a public forkable repo, feeding public issues | |

**Choice:** Inherit verbatim → **D-14**
**Notes:** `[auto] Disclosure — Q: "New checkpoint?" → Selected: "inherit" (recommended default)`. Most exposed phase in the milestone. Critical/high → surface + problem class + impact only. Rated **one-way**: git history retains over-disclosure permanently.

---

## Scope Fences & Completion Gates

| Option | Description | Selected |
|--------|-------------|----------|
| Three gates — surface, criterion, requirement — all re-derived live in the close-out | Matches the four sweeps' "re-derive, never assert" discipline | ✓ |
| One summary statement per requirement | Unverifiable by a reader | |

**Choice:** Three gates → **D-15**, **D-16**
**Notes:** `[auto] Gates — Q: "How to close?" → Selected: "three gates, re-derived" (recommended default)`. Surface gate re-derives all four denominators with literal outputs and shows every item carries a verdict; criterion gate answers all five ROADMAP criteria Met/Partially/Not Met; requirement gate closes SEC-01/02/04/05 — the milestone's last open `SEC-*` items. Fences: no fixes (67), no issues (69), no DEBT re-triage (66), no edits to INVENTORY or the four closed coverage files. Phase 68's denominator must not be polluted — Phase 65 adds *surfaces*, not grid cells, and the 147/148 figure stands untouched.

## Claude's Discretion

- Task boundaries within each plan (two-task evidence-tier split is the default)
- Whether SEC-04 renders as a stage×site matrix or per-stage narrative, provided all 7 sites are addressed at all 4 stages
- Ordering of the 27 SEC-05 spawn sites, provided all 27 carry a verdict

## Deferred Ideas

- Applying any finding (67); filing any issue (69); re-triaging DEBT (66)
- Reviewing `RU-D8-01` — owned by no phase, still the milestone's one unrecorded grid row
- Adding runtime message-shape validation at the four webview handlers — likely motivated by this
  phase, but a new capability: recorded here, implemented in 67 if `easy`, else a future milestone
- A CSP/webview security regression suite — new capability, not a review finding
