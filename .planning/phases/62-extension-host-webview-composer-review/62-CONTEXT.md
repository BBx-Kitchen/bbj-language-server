# Phase 62: Extension Host & Webview Composer Review - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning
**Mode:** `--auto` — every gray area below was auto-resolved to its recommended option. See
`62-DISCUSSION-LOG.md` for the per-question audit trail.

<domain>
## Phase Boundary

This phase delivers **one planning artifact and no production code changes**:

`.planning/reviews/62-COVERAGE.md` — Phase 62's slice of INVENTORY.md's applicability grid, filled
in. Concretely: a recorded pass/fail for every `applies` cell across the 5 Phase 62 review units
(`RU-62-01`..`RU-62-05`, 22 files, 5,889 LOC — the whole of `bbj-vscode/src/` outside `language/`,
plus the TextMate grammar and the two language-configuration JSONs), every `n/a` reason carried
forward verbatim, every finding meeting its RVW-06 evidence tier and checked against the frozen
15-issue snapshot, and the D4 duplication callout across the composer subsystems that ROADMAP
criterion 2 requires.

**No source file is modified by this phase.** Findings are recorded; Phase 67 is the only phase
that applies fixes, Phase 66 the only one that resolves DEBT items, Phase 65 the only one that
performs the cross-cutting security synthesis, and Phase 69 the only one that files GitHub issues
(ISSUE-01 is a hard gate there). Phase 62 does not edit INVENTORY.md (Phase 60 D-09, immutable).

**Phase 62's grid slice, re-derived from INVENTORY at discussion time:**

| Rows | `applies` cells | `n/a` cells | Total |
|---|---|---|---|
| 5 unit rows (D1-D5, D7, D8 apply; D6 `n/a` — R-D6-CENTRAL) | 35 | 5 | 40 |

Verified, not asserted:

```bash
awk '/^\| `RU-62-0[1-5]` \|/ {a+=gsub(/applies/,"applies"); n+=gsub(/n\/a/,"n\/a")} END{print a, n, a+n}' .planning/reviews/INVENTORY.md
# → 35 5 40
```

**No `.bbl`-style file-exception rows exist for this phase.** The one file-level exception in
scope — `setopts-composer-webview.ts`'s D4 "asymmetric baseline" — is recorded *inside* INVENTORY's
`RU-62-04` block, not in the file-exception table, and is therefore a **qualifier on an existing
`applies` cell, not a 41st cell**. Any plan that adds it as a row breaks the D-14 gate below.

**What changes relative to Phase 61:** D7 (Cross-IDE parity) is **live for all five units** here,
where it was `n/a — R-D7-SHARED-LS` for all of Phase 61. That is the single largest new obligation
in this phase and drives D-04/D-05 below.

</domain>

<decisions>
## Implementation Decisions

Decision IDs below are **phase-local** (`D-01`..`D-16` of Phase 62). Phase 60's `D-01`..`D-17` and
Phase 61's `D-01`..`D-17` are separate, already-locked sets — where one is referenced it is written
as `Phase 60 D-NN` / `Phase 61 D-NN` to avoid collision.

### Sweep Decomposition & Ordering

- **D-01:** Phase 62 is decomposed as **tracer + one plan per review unit = 5 plans**. Plan `62-01`
  creates the full `62-COVERAGE.md` skeleton (header, grid, cell-total gate, the 5 verbatim `n/a`
  carry-forwards, 5 stubbed unit sections) **and** sweeps `RU-62-04` (composer webview HTML
  generators, risk rank 1, 4 files / 1,533 LOC) end to end. Plans `62-02`..`62-05` then take one
  unit each. Front-loading `RU-62-04` front-loads the phase's entire SEC-01 handoff surface, exactly
  as Phase 61 D-01 front-loaded SEC-06.

- **D-02:** Plan order follows INVENTORY's risk rank:
  `RU-62-04` → `RU-62-01` → `RU-62-03` → `RU-62-05` → `RU-62-02`.

- **D-03:** **No new format checkpoint.** Phase 61's D-05 checkpoint is already discharged: the
  rendered shape in `61-COVERAGE.md` — the `### Cells` line format (`D{n} {name} — pass|fail — <written
  checks> N findings recorded: <ids>`), the verbatim `n/a` carry-forward presentation, the 13-field
  fenced finding record, and the per-unit sub-blocks `### Findings` / `### Not-reproducible
  dispositions` / `### Cross-unit referrals` — was reviewed and frozen. Phase 62 **copies that shape
  unchanged**; the tracer proves nothing new about format, so gating on it would spend a checkpoint
  on an answered question. Phase 62 adds exactly two shape elements, both defined here rather than
  discovered at the checkpoint: `### SEC-01/SEC-02 Surface Handoff` under `RU-62-04` (D-06) and
  `### D7 parity` cross-unit referrals addressed to Phase 63 (D-05).
  — **Reversibility:** cheap in the abstract, costly in practice — the skeleton is inherited by 4
  downstream plans and by Phase 68's DOC-03 concatenation, so it is treated as frozen once `62-01`
  lands.

- **D-04:** All 5 plans write into the **single** `.planning/reviews/62-COVERAGE.md` mandated by
  INVENTORY's recording protocol (Phase 60 D-09), and the shared-file constraint is enforced **by
  the dependency graph, not by an assumption about the executor**: one wave per plan (waves 1-5),
  each plan's `depends_on` naming its predecessor in D-02's order. Same-wave concurrency would
  corrupt the append. This is Phase 61 D-03 + D-04 carried forward unchanged, for the same reasons
  and with the same known cost (no intra-phase parallelism).

### D7 Cross-IDE Parity — the new live dimension

- **D-05:** D7 is assessed by **reading `bbj-intellij/` as reference material only**. INVENTORY 3b
  puts D7 at tier `inherited`, resolving to *repro-equivalent* — *"a parity gap needs the concrete
  divergent behaviour in both IDEs"* — so a parity cell cannot be filled without looking at the
  IntelliJ side. Reading it is therefore mandatory, not optional. The boundary is drawn exactly
  where Phase 61 D-13 drew it for `java-interop/`:

  - **No `P62-*` finding may carry a `location:` inside `bbj-intellij/`** (explicit `must_haves`
    prohibition). The divergence is *recorded* against the VS Code file that is missing or differs;
    the IntelliJ side is cited in the `evidence:` field as the comparison point.
  - **Where the defect is plainly on the IntelliJ side**, Phase 62 records nothing and instead
    writes a **`### Cross-unit referrals` entry addressed to the owning Phase 63 unit**
    (`RU-63-04` composer dialogs, `RU-63-02` language registration/TextMate bundle,
    `RU-63-01` run/compile actions), naming the surface and what to check. Phase 63 inherits it the
    way Phase 61's units inherited each other's referrals.
  - **No coverage cell in `62-COVERAGE.md` covers a `bbj-intellij/` file.** Phase 63 owns those
    rows; a Phase 62 cell that claimed them would double-count against INVENTORY's 232-cell total.

  Rationale for not deferring D7 wholesale to Phase 63: INVENTORY's grid marks D7 `applies` on all
  five Phase 62 unit rows. Leaving them unfilled is a *visible* coverage gap under Phase 60 D-09 and
  would fail this phase's own D-14 gate. Rationale for not reviewing both sides symmetrically: that
  is Phase 63's contracted work, and duplicating it would produce two independent finding sets over
  the same IntelliJ code with colliding dedup.

- **D-06:** Phase 62 and Phase 63 may run **concurrently**, so D-05's referrals are written as
  **durable records in `62-COVERAGE.md`, not as a handoff that assumes Phase 63 has not started**.
  Each referral states the surface, the check, and the VS Code-side evidence that motivated it. If
  Phase 63 has already swept the named unit by the time it reads the referral, it re-triages;
  it does not silently drop it. Phase 68 sees both files, so an unaddressed referral stays visible.

### Security Boundary Against Phase 65

- **D-07:** For the SEC-01 (webview HTML injection) and SEC-02 (webview→extension message
  validation) surfaces, **Phase 62 records concrete findings; Phase 65 does the cross-cutting
  synthesis.** Phase 62's D1 cells on `RU-62-04` and `RU-62-01` are filled with real, file:line
  findings clearing tier `repro` — they are not deferred with "see Phase 65". Phase 65 then consumes
  those findings and adds only what a per-unit sweep structurally cannot produce: CSP posture stated
  once across all four generators, the message-handler validation picture across the whole
  webview↔extension boundary, and any systemic conclusion that emerges from the set rather than from
  any one file.

  Rationale: the alternative — Phase 62 recording only non-injection D1 and leaving injection to 65 —
  creates exactly the hole INVENTORY's T-60-06 constraint exists to prevent, and would leave
  `RU-62-04`'s D1 cell (which INVENTORY calls *"the complete SEC-01 webview HTML-generation
  surface"*) filled with a pointer instead of a verdict.

- **D-08:** `RU-62-04` carries a narrative **`### SEC-01/SEC-02 Surface Handoff`** subsection inside
  its part of `62-COVERAGE.md`, structurally mirroring Phase 61's `### SEC-06 Trust Boundary`. It
  states as *facts* (not findings): which values reach generated HTML and from where; the CSP
  posture of each of the four webviews as it actually is; which `onDidReceiveMessage` handlers exist
  and what shape/range validation each performs before acting; and what a webview can reach through
  the extension host. Discrete `P62-D1-*` records are allocated only where a concrete
  evidence-clearing defect exists. Rationale: identical to Phase 61 D-10 — a boundary map is not
  naturally expressible as a list of defects, and "the CSP is absent" is a fact to state, becoming a
  finding only if it enables something. This subsection is the artifact Phase 65 inherits.

- **D-09:** Public-repo disclosure inherits **Phase 61 D-12's two-tier rule verbatim**, with a
  tightened rationale rather than a loosened one:
  - **`critical`/`high` D1 findings:** the committed record names the surface, the problem class,
    and the impact. **No trigger sequence, no payload, no proof-of-concept.** The evidence is still
    produced and run; the record states that it exists and what it establishes. Phase 69 decides
    disclosure at filing time.
  - **Everything else** (all D2-D8 findings, and D1 findings rated `medium`/`low`): full concrete
    detail per the finding standard as written.

  Why the rationale tightens: Phase 61 D-12 could argue that `java-interop` binds `localhost:5008`,
  so a malicious peer already implies local access. That mitigation **does not transfer**. A webview
  injection reachable from values a developer's own project supplies — file content, `config.bbx`
  settings, workspace paths — needs no attacker foothold at all, only that the developer opens a
  file. This surface is unfixed and this repository is public, so the redaction tier is applied
  strictly, not as a formality carried over from a phase where it mattered less.

### What a Recorded Cell Must Contain

- **D-10:** A no-finding `applies` cell records **`pass` plus a written line naming the concrete
  checks applied**, phrased against that dimension's "what counts as a finding" wording in
  REQUIREMENTS.md. Phase 61 D-06 carried forward unchanged, including its rejection of a bare
  `pass` (weaker evidence than an `n/a` exclusion) and its rejection of per-check `file:line`
  anchors (roughly doubles recording cost for auditability DOC-03 does not consume).

- **D-11:** Within each unit's plan, the **7 live dimensions split by evidence tier into 2 tasks**,
  following INVENTORY 3b's real tier boundary rather than Phase 61's dimension list:
  - **Task A — tier `repro` / repro-equivalent:** D1, D2, D3, **D7**. Needs a runnable reproduction,
    or a line-by-line trace naming concrete inputs/state and the exact `file:line` where behavior
    diverges. D7 sits here — not in Task B — because 3b resolves a parity gap to *repro-equivalent*:
    the concrete divergent behavior in both IDEs.
  - **Task B — tier `trace`:** D4, D5, D8. The code shape or the stale text is the defect.

  Each task's `acceptance_criteria` enumerate its dimensions by name, so no dimension can be
  silently absorbed by whichever one is loudest.

- **D-12:** The **D4 duplication callout is mechanical, and allocated twice at two layers**, not
  once as prose:
  - `RU-62-04` owns the **generator-layer** duplication finding. INVENTORY's own `RU-62-04` D4 row
    names it explicitly (*"the four generators are near-duplicates of each other — this is the
    duplication callout ROADMAP §Phase 62 criterion 2 requires"*), so this is where criterion 2 is
    satisfied.
  - `RU-62-03` separately records duplication in the **logic/UI layer** (3 `-composer.ts` × 4
    `-ui.ts`), cross-referenced to `RU-62-04`'s finding rather than restating it.

  Both use a **programmatic structural diff with the method and its output recorded in the cell**
  (Phase 61 D-08's mechanical-check precedent), not an eyeball comparison — with the D-15-confirmed
  asymmetry applied: SETOPTS has **no `-composer.ts`**, so the `-composer.ts` baseline is **3 files,
  not 4**, in both units. Any template assuming a uniform `-composer`/`-ui`/`-webview` triple is
  wrong.

### Scope Fidelity

- **D-13:** **The grid is the contract; the ROADMAP success criteria are a subset of it.** Two
  in-scope surfaces are named by INVENTORY but *not* by ROADMAP §Phase 62's criteria:
  `RU-62-05` (`bbj.tmLanguage.json`, `bbj-language-configuration.json`,
  `bbx-language-configuration.json`) and `Commands/Commands.cjs` inside `RU-62-01`. Both are swept
  in full. The discrepancy is **recorded explicitly in `62-COVERAGE.md`'s close-out** rather than
  silently covered, so a reader can see the phase covered more than its criteria asked and why
  (Phase 60 D-09: a missing cell is a visible coverage gap — an unexplained extra one should be
  visible too).

  `RU-62-05` is not a formality: open issue **#381** (*"Config.bbx is no longer highlighted and now
  shows up as plain text"*) is exactly this surface's failure mode and is in the frozen snapshot, so
  every `RU-62-05` finding must be dedup-checked against it and will frequently resolve to
  `#381 duplicate` or `#381 partial-overlap`.

- **D-14:** Phase completion carries a **hard, countable gate** — two of them:
  1. **Cell gate:** `62-COVERAGE.md` contains every cell in INVENTORY's Phase 62 slice, with the
     expected totals stated (**35 `applies`, 5 `n/a`, 40 total**) *and* re-derived from INVENTORY at
     verification time via the awk pass in `<domain>` above. If the derivation disagrees with the
     stated totals, **that disagreement is itself a defect to surface**, not a number to adopt.
  2. **File gate:** all **22** in-scope files are enumerated from the tree — not from a list typed
     into a plan — and each basename is confirmed present somewhere in `62-COVERAGE.md`:
     ```bash
     ls bbj-vscode/src/*.ts bbj-vscode/src/Commands/* \
        bbj-vscode/syntaxes/bbj.tmLanguage.json \
        bbj-vscode/bbj-language-configuration.json \
        bbj-vscode/bbx-language-configuration.json | wc -l   # → 22
     ```
     Both were run during this discussion and both agree with INVENTORY. Phase 61's close-out
     established this pattern; here it also doubles as the check that `src/` outside `language/`
     contains no file INVENTORY missed.

- **D-15:** The sweep reads **HEAD of `v4.0-stability-and-quality`, with the exact SHA recorded once
  in `62-COVERAGE.md`** by plan `62-01` at execution time (Phase 61 D-15 carried forward). The SHA
  is *not* pinned in this document: HEAD advances with every v4.0 planning commit, including the one
  that commits this file, so recording a SHA here would guarantee it is stale by the time `62-01`
  runs. INVENTORY's pinned `2194616..v0.12.0` range keeps its original job — history reconstruction,
  not review targeting.

- **D-16:** **`.planning/codebase/*.md` is not to be read during this sweep** (Phase 61 D-16 carried
  forward). INVENTORY supersedes it on scope, structure and counts (Phase 60 D-16); `CONCERNS.md`
  lists FIXMEs already resolved in v3.8 and actively invites false findings; the seven maps predate
  the webview composers entirely (dated 2026-02-01), so for *this* phase they are not merely stale
  but blank on the primary subject matter. Paired with an explicit `must_haves` prohibition that
  **no finding may restate `a7e1b53 fix(#494)`**, the in-flight unreleased cyclic-inheritance fix on
  this branch.

### Inherited routing

- **No rows of INVENTORY's D-06 routing table are addressed to Phase 62.** All six routed items
  belong to Phase 61 (five) and Phase 63 (one, the Gradle JDK toolchain mismatch). A planner should
  not go looking for pre-identified Phase 62 findings — there are none, and the absence is
  deliberate, not an omission.

### Claude's Discretion

- The per-unit stopping rule beyond cell coverage. Phase 61's rendered three-part rule
  (every live cell has a verdict + written checks; every file in the unit named at least once inside
  its own section; every candidate claim either promoted or written under `not-reproducible`) is the
  obvious carry-forward; the planner confirms or adjusts it.
- The sampling protocol — size and source — for `setopts-catalog.ts`'s D2 value-correctness check
  (335 lines of SETOPTS bitmask data, the one genuinely catalog-shaped file in this phase).
- Whether `RU-62-05`'s three JSON files justify a mechanical diff (D-12's method) for their D7 cell
  against the IntelliJ TextMate bundle, or a full read.
- Which Phase 63 unit each D7 referral is addressed to when the divergence spans more than one.
- Whether any `critical`/`high` D1 finding on `RU-62-04` demands a runnable webview harness (see
  `<deferred>` — none is built up front).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone contract — authoritative, read first

- `.planning/reviews/INVENTORY.md` — **the single immutable contract for this phase.** Read in full.
  Specifically: §"Review Units" → `### RU-62-04` (defined out of order, at the top, deliberately —
  see its "Ordering note"; it carries the phase's only file-exception detail and the two dedup
  neighbours #475/#385), §"Phase 62 review units … — remainder" (`RU-62-01`, `RU-62-03`, `RU-62-05`,
  `RU-62-02` with files, LOC and risk ranks), §"Applicability Grid" (the 5 `RU-62-*` rows),
  §"Exclusion reasons" → **R-D6-CENTRAL** (the only marker Phase 62 carries forward, 5 cells),
  §"Finding Standard" 3a-3d (IDs, evidence tiers — note D7 is `inherited`/repro-equivalent,
  easy-vs-major, severity/effort), §"Finding Record Template", §"Frozen Open-Issue Snapshot"
  (the 15-issue dedup list; **#381**, **#475**, **#385** are the Phase 62-relevant ones),
  §"Recording protocol (D-09)", §"Routing table (D-06)" (confirms: no Phase 62 rows).
- `.planning/REQUIREMENTS.md` — the D1-D8 dimensions table with each dimension's "what counts as a
  finding" wording (D-10 requires pass lines phrased against it), RVW-02, RVW-03, RVW-06, RVW-07,
  SEC-01/SEC-02 (Phase 65's, bounded here by D-07), and the Out of Scope table.
- `.planning/ROADMAP.md` §"Phase 62: Extension Host & Webview Composer Review" — the four success
  criteria this phase is verified against. Note criterion 2's explicit D4 duplication requirement
  (satisfied by D-12) and that the criteria do not name `RU-62-05`/`Commands.cjs` (handled by D-13).
- `.planning/phases/60-baseline-resync-review-standards/60-CONTEXT.md` — Phase 60's `D-01`..`D-17`,
  inherited and not to be re-litigated.
- `.planning/phases/61-language-core-review/61-CONTEXT.md` — Phase 61's `D-01`..`D-17`. This phase
  carries forward D-03/D-04 (shared-file write contract), D-06 (written pass lines), D-08
  (mechanical checks), D-12 (disclosure), D-13 (read-as-reference boundary, re-aimed at
  `bbj-intellij/`), D-15 (swept tree), D-16 (codebase-maps prohibition), D-17 (countable gate).

### Worked precedent — the shape to copy, not to re-invent

- `.planning/reviews/61-COVERAGE.md` — **the frozen recording shape (D-03).** Read its header,
  §"Stopping Rule & Write Contract", §"D-17 Cell-Total Gate", §"Exclusion reasons carried forward",
  and the whole of `## RU-61-06 — Java interop client` (the approved reference rendering, including
  `### SEC-06 Trust Boundary` which `### SEC-01/SEC-02 Surface Handoff` mirrors) plus
  `## Phase 61 Close-Out` (the enumeration-gate pattern D-14 reuses).

### Artifacts this phase creates

- `.planning/reviews/62-COVERAGE.md` — **does not yet exist.** The phase's sole deliverable.
  Created by plan `62-01` (skeleton + `RU-62-04`), appended by `62-02`..`62-05`.

### Code under review (the 5 units, 22 files / 5,889 LOC)

- `bbj-vscode/src/extension.ts` (894), `bbj-vscode/src/Commands/CompilerOptions.ts` (506),
  `bbj-vscode/src/Commands/Commands.cjs` (405) — `RU-62-01`, rank 2.
- `bbj-vscode/src/msgbox-composer-webview.ts` (373), `addwindow-composer-webview.ts` (408),
  `addchildwindow-composer-webview.ts` (431), `setopts-composer-webview.ts` (321) — `RU-62-04`,
  rank 1.
- `bbj-vscode/src/msgbox-composer.ts` (550), `addwindow-composer.ts` (405),
  `addchildwindow-composer.ts` (308), `msgbox-composer-ui.ts` (193), `addwindow-composer-ui.ts` (68),
  `addchildwindow-composer-ui.ts` (72), `setopts-composer-ui.ts` (96), `setopts-catalog.ts` (335) —
  `RU-62-03`, rank 3, largest by LOC.
- `bbj-vscode/syntaxes/bbj.tmLanguage.json` (74), `bbj-vscode/bbj-language-configuration.json` (100),
  `bbj-vscode/bbx-language-configuration.json` (82) — `RU-62-05`, rank 4.
- `bbj-vscode/src/document-formatter.ts` (96), `line-numbering.ts` (49), `tokenized-bbj.ts` (39),
  `decompile-io.ts` (84) — `RU-62-02`, rank 5, smallest by LOC.

Per-file LOC above was re-counted from the tree during this discussion and matches INVENTORY
exactly, file for file. Do not re-derive.

- `bbj-intellij/` — **reference reading only (D-05).** Establishes the comparison side for every D7
  cell. **No `P62-*` finding may be located here.** Its own review is `RVW-04`/Phase 63.

### Code-truth references

- `CLAUDE.md` (repo root) — build/test commands, the IDE-integration section (both IDEs consume
  `out/language/main.cjs`; the IntelliJ plugin bundles the compiled LS **and the TextMate grammar**,
  which is `RU-62-05`'s D7 hook). Doubles as a **D8 target**: its claims about `bbj-vscode/src/` are
  checkable against the code Phase 62 is reading, and it currently says almost nothing about the four
  composer subsystems — a candidate D8 check, not an asserted finding.
- `bbj-vscode/package.json` — the `contributes` surface: commands, languages, `bbx-config` language
  ID registration, and (per INVENTORY's `RU-62-04` D1 reason) the absence of any `customEditors`
  contribution, which is what makes the four generators the *complete* HTML-generation surface.

### Explicitly NOT to be read (D-16)

- `.planning/codebase/ARCHITECTURE.md`, `CONCERNS.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`,
  `STACK.md`, `STRUCTURE.md`, `TESTING.md` — all dated 2026-02-01, all superseded by INVENTORY.md
  per Phase 60 D-16, and all predating the webview composers entirely. `CONCERNS.md` carries the
  highest re-report risk. Prohibited for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **INVENTORY.md has already done the scoping work.** Unit boundaries, per-file LOC, risk ranks,
  dimension applicability, the 5 `n/a` reasons, the finding template, the dedup snapshot, the
  `setopts-composer-webview.ts` D4 asymmetry and the two `RU-62-04` dedup neighbours all exist.
  Phase 62 reads them; it does not re-derive them.
- **Phase 61 already answered the format question.** `61-COVERAGE.md` is 3,329 lines of worked,
  approved precedent — cell lines, finding records, `not-reproducible` dispositions, cross-unit
  referrals, a narrative security subsection, and a close-out gate. D-03 spends none of Phase 62's
  budget re-deriving any of it.
- **The 22-file surface is exactly `bbj-vscode/src/` outside `language/`, plus three config files.**
  Verified during this discussion: `ls bbj-vscode/src/*.ts bbj-vscode/src/Commands/*` yields 19
  files, all 19 named in INVENTORY's Phase 62 units, none extra — so there is no unassigned VS
  Code-side source file hiding between Phase 61 and Phase 62.
- **Phase 62's live dimensions are 7, not 6 and not 8.** Only D6 is `n/a` (R-D6-CENTRAL, 5 cells).
  D7 — dead for all of Phase 61 — is live for every unit here.
- **`gh` CLI is authenticated** in this environment, though Phase 62 does not need it: dedup runs
  against INVENTORY's frozen snapshot, and Phase 69 re-queries live.

### Established Patterns

- **Finding IDs `P62-D{dimension}-{seq}`**, zero-padded to three digits, allocated monotonically in
  discovery order within each `(62, dimension)` pair. INVENTORY's `P00-D1-001` worked example is a
  template illustration under the reserved `P00` phase — **Phase 62 allocates the real first D1
  finding against `RU-62-04` as `P62-D1-001`**, and INVENTORY says so explicitly.
- **All four `*-composer-webview.ts` files contain webview-security-relevant API usage** — grepping
  for `Content-Security-Policy|webview.cspSource|getNonce|onDidReceiveMessage|asWebviewUri` matches
  exactly those four files and no others in `bbj-vscode/src/`. This confirms INVENTORY's scoping of
  the SEC-01/SEC-02 surface and gives D-08's handoff subsection its file list. **What each file
  actually does with those APIs is the sweep's job — nothing is asserted here.**
- **The composer subsystems are structurally near-duplicate, asymmetrically.** msgbox / addwindow /
  addchildwindow each have the full `-composer` / `-ui` / `-webview` triple; SETOPTS has only
  `-ui` + `-webview`, with its codegen in `setopts-catalog.ts`. This is D-15-confirmed in INVENTORY
  and is the shape D-12's mechanical diff must respect.
- **Issue #381 (`config.bbx` highlighting regression) is live tracker content on `RU-62-05`'s exact
  surface**, and `bbx-language-configuration.json` + the `bbx-config` language ID are that surface.
  Expect dedup hits, not novel findings, in that neighbourhood.

### Integration Points

- **Phase 65** consumes D-08's `### SEC-01/SEC-02 Surface Handoff` plus every `P62-D1-*` record as
  the reviewed baseline ROADMAP's Phase 62 goal promises it. **Phase 63** consumes D-05's D7
  cross-unit referrals. **Phase 66** re-triages any finding whose `dedup` names a DEBT requirement.
  **Phase 67** consumes `classification: easy|major`. **Phase 68** concatenates `62-COVERAGE.md`
  with the other coverage files against INVENTORY's grid for DOC-03. **Phase 69** files issues,
  gated on ISSUE-01.
- **v4.0 work lives on `v4.0-stability-and-quality`**; HEAD at discussion time was
  `073d92d5d7dc66ff77c9556abaac1a9cc5f88892` (`docs(phase-61): add security threat verification`).
  Per D-15 the sweep SHA is recorded by `62-01` at execution time, not pinned here.
- **Phases 61-64 depend only on Phase 60 and may run concurrently** (INVENTORY §"Status &
  Authority"). D-04 makes Phase 62 self-contained within itself, and Phase 60 D-09 guarantees no
  cross-phase file collision — each phase writes only its own `{NN}-COVERAGE.md`.

</code_context>

<specifics>
## Specific Ideas

- A `pass` cell should read like INVENTORY's `n/a` reasons: a written sentence testing the dimension
  against its own definition, never a mechanical or generic line.
- The D7 cells are the ones most likely to be filled thinly, because filling them honestly costs a
  trip into `bbj-intellij/`. D-11 puts D7 in the repro-tier task specifically so a thin parity pass
  is structurally awkward to write.
- For an unfixed `critical`/`high` D1 finding on a webview generator in a public repo: name the
  surface and the problem class, confirm the evidence exists and say what it establishes — but do
  not publish the sequence or the payload.
- The close-out should state plainly that `RU-62-05` and `Commands.cjs` were swept despite not
  appearing in ROADMAP's success criteria, so the extra coverage reads as deliberate.
- Both D-14 gates were run during this discussion (`35 5 40`, `22`) — the plan should re-run them,
  not restate them.

</specifics>

<deferred>
## Deferred Ideas

- **Building a webview injection harness** (a fixture project whose file content / `config.bbx`
  values flow into each composer's generated HTML, driven end to end) — not built up front. Same
  reasoning as Phase 61 D-11's rejected hostile-peer harness: it is test infrastructure built during
  a phase whose output is findings. One is built only if a specific `critical`/`high` D1 finding
  demands the reproduction, and any such harness is a Phase 67 deliverable, not a Phase 62 one.
- **Reviewing `bbj-intellij/`** — remains `RVW-04`/Phase 63. D-05 permits reading it as the D7
  comparison side and routes IntelliJ-side observations to cross-unit referrals; it does not open it
  for review or for finding allocation.
- **Fixing anything found** — Phase 67 (`easy`) and the `MAJOR-REFACTORS.md` path (Phase 68 → 69).
  Phase 62 records and classifies only. This includes the SEC-01 surface, however it reads.
- **Deduplicating the composer subsystems** — D-12 records the duplication as a D4 finding with a
  classification and an effort estimate. Performing the deduplication is a `major` refactor by test
  (1) of Phase 60 D-13 and belongs to the Phase 68/69 path.
- **Regenerating the seven `.planning/codebase/*.md` maps** — deferred by Phase 60 D-16; D-16 here
  goes further and prohibits reading them.

</deferred>

---

*Phase: 62-Extension Host & Webview Composer Review*
*Context gathered: 2026-08-18*
