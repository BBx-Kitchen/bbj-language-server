# Phase 66: Known Debt Re-triage - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** interactive (default) — see `66-DISCUSSION-LOG.md` for the per-question audit trail.

<domain>
## Phase Boundary

This phase delivers **one planning artifact and no production code changes**:

`.planning/reviews/66-COVERAGE.md` — a re-triage verdict for **every** item on `PROJECT.md`'s
§"Known tech debt" list, established against current code, so that no debt item ends this milestone
recorded only as prose.

Plus two bounded edits outside that file, both required by DEBT-06's own wording:

1. `.planning/REQUIREMENTS.md` — two new requirements (`DEBT-07`, `DEBT-08`) closing the drift
   `INVENTORY.md:1220` recorded, with the coverage matrix updated to map them to Phase 66.
2. `.planning/PROJECT.md` §"Known tech debt" — each surviving bullet rewritten to carry its
   `P66-*` finding ID, its `DEBT-NN` requirement and its disposition; resolved items struck.

**Phase 66 is a triage phase, not a sweep and not an apply phase.** Phases 61-65 recorded 33 D1
findings plus the full multi-dimension corpus across the same trees. This phase re-examines
**specific, already-known items** rather than surfacing new ones — which is why ROADMAP states it
can run independently of Phases 61-65.

**No source file is modified. No GitHub issue is created, commented on, or otherwise written.**
Phase 67 is the only phase that applies fixes; Phase 69 is the only phase that writes to the
tracker, gated on ISSUE-01. `INVENTORY.md` (Phase 60 D-09, immutable) and the five closed
`6N-COVERAGE.md` files are not edited — drift found in any of them is recorded as a finding here.

### The structural break from Phases 61-65

**INVENTORY defines no `RU-66-*` units.** There is no grid, no applicability cells, no cell gate
and no file gate for this phase — the same structural absence Phase 65 faced (its D-01) and solved
by constructing its own closed denominator. Phase 66 does the same, keyed on **debt items** rather
than on INVENTORY rows or security surfaces.

Phases 61-64 could prove completeness because INVENTORY handed them a closed denominator. Phase 65
constructed four surface enumerations. Phase 66 constructs an **8-row debt denominator** derived
live from `PROJECT.md` — see D-04.

</domain>

<decisions>
## Implementation Decisions

Decision IDs are **phase-local** (`D-01`..`D-16` of Phase 66). Phase 60-65's `D-nn` IDs are
separate namespaces; where one is meant it is written as "Phase 6N D-nn".

### The Fix-vs-File Boundary — What This Phase Is Allowed To Do

- **D-01: Phase 66 is verdict-only. It lands no source change.** Every item resolves to a written
  verdict; anything fixable routes to Phase 67's apply path carrying a finding ID and an
  `easy`/`major` classification. The goal's "resolved now" is read as **resolved on paper, applied
  in Phase 67**.

  This keeps the milestone's one-phase-one-job shape intact and leaves the green-suite gate
  (`npm test`, `npm run lint`, `./gradlew build` — FIX-03) owned by the phase whose requirements
  actually carry it. DEBT-01..08 carry no test/commit/green-suite gates; Phase 67's FIX-01..04 do.

  — **Reversibility:** reversible — a later phase can still apply anything this phase routed.

- **D-02: Phase 66 writes to the GitHub tracker zero times.** For each unresolved item it produces
  an **issue-ready draft** — problem statement, `file:line` evidence, verified failure scenario,
  proposed approach, acceptance criteria, and proposed area / `PRIO 1|2|3` / effort `{2,4,8}`
  labels drawn from the repository's existing label set. Phase 69 files them with everything else,
  under ISSUE-01's single approval gate.

  Reading the tracker is permitted and expected (dedup, state checks). **Writing** is not: no
  `gh issue create`, no `gh issue comment`, no label or state change. One approval gate, one filing
  moment, and Phase 69's ISSUE-04 dedup re-query stays meaningful because nothing was opened behind
  it.

  Consequence, stated plainly rather than papered over: DEBT-06's "represented by a GitHub issue"
  is **not literally true at the end of Phase 66** — it becomes true when Phase 69 files. Phase 66
  discharges its half by producing a draft per item plus the PROJECT.md pointer of D-13; the
  close-out says exactly this rather than claiming the tracker state it does not create.

  — **Reversibility:** one-way — an issue filed early cannot be un-filed from a public repository,
  and would permanently corrupt Phase 69's ISSUE-01 "nothing filed before approval" claim.

- **D-03: Every unresolved item is recorded as a `P66-D{n}-nnn` finding in INVENTORY's frozen
  record format** — same required fields, evidence tiers, `dedup:`, `disposition:`, the `{2,4,8}`
  effort scale (§3d), and the easy-vs-major rule. It then flows through Phase 68 → Phase 69
  identically to the sweep findings. Nothing bespoke is invented; ROADMAP already makes Phase 68
  depend on Phase 66, and this is the shape Phase 68 already knows how to assemble.

  **`effort` must land on `{2,4,8}`** — stated explicitly because Phase 63 shipped three off-scale
  values (`3`, `1`, `1`) that were unlabellable for ISSUE-03 and needed a post-hoc correction at
  verification time (Phase 65 D-09 recorded the same warning). Do not repeat it.

### The Denominator — What Makes DEBT-06 Provable

- **D-04: The closed denominator is `PROJECT.md` §"Known tech debt", re-derived live.** Measured at
  discussion time: **8 bullets** (`sed -n '/^\*\*Known tech debt:/,/^## /p' .planning/PROJECT.md |
  grep -c '^- '` → `8`). Every enumerated bullet carries a verdict; a reader can re-run the command,
  get the same denominator, and check every row.

  This is the correct denominator because it is **exactly what DEBT-06 names** — "none remain
  recorded only as prose in PROJECT.md". Keying the gate on the 6 `DEBT-*` requirement IDs instead
  would leave two bullets unowned at milestone end, which is precisely what DEBT-06 forbids.

  **If the live count is not 8 at execution time, the drift is reported with its cause, not
  silently adopted.**

  — **Reversibility:** costly — the enumeration becomes Phase 68's evidence that the debt list was
  discharged; changing its shape later means re-deriving every verdict.

- **D-05: The two orphan bullets become `DEBT-07` and `DEBT-08` in `REQUIREMENTS.md`**, mapped to
  Phase 66 in the coverage matrix. `INVENTORY.md:1220` records the drift and states the two legal
  resolutions ("folded into an existing DEBT item or added as a new one"); this phase takes the
  second, because neither orphan has a natural home — one is BBjCPL compiler-integration timing,
  the other is IntelliJ TextMate bundle registration, and folding either would blur the meaning of
  the requirement it was folded into.

  | New req | Carried bullet | `PROJECT.md` |
  |---|---|---|
  | **DEBT-07** | CPL-06 hierarchy suppression takes one extra build cycle after BBjCPL merge (timing nuance, end state correct) | line 252 |
  | **DEBT-08** | IntelliJ TextMate bundle: filename-based `config.bbx`/`config.min` registration (`2489001`, #381) — whether JetBrains' TextMate plugin honors `filenames` vs `extensions` is unverified | line 255 |

  `REQUIREMENTS.md` is a living planning document and this edit is in-scope. **`INVENTORY.md` is
  not** — it stays immutable (Phase 60 D-09); the drift it recorded is closed by acting on it here,
  never by editing it.

  — **Reversibility:** costly — Phase 68's coverage arithmetic and the requirement matrix both pick
  these up.

- **D-06: Verdicts use INVENTORY's existing disposition vocabulary verbatim** —
  `easy-fix | major-refactor | duplicate | wontfix | already-covered | not-reproducible`, with a
  reason required for the last four. Mapping for this phase: a still-real item drafted for Phase 69
  is `major-refactor`; one fixed since it was written is `already-covered`; one that no longer
  reproduces against current code is `not-reproducible`; an accepted upstream limitation is
  `wontfix` **with its unblocking condition stated**.

  **No new field is introduced.** Phase 65 D-10 is the precedent: Phase 64's `triage:` field was
  correctly *not* carried into a phase it did not apply to, because an inapplicable field makes
  Phase 68's assembly ambiguous about what its buckets cover.

- **D-07: DEBT-06 outranks DEBT-02's doc-only escape hatch.** DEBT-02 allows closure by
  "documented with the specific blocking limitation and what would unblock them"; DEBT-06 says every
  item ends "fixed or represented by a GitHub issue". When both apply — the 3 `EmptyFileSystem`-
  blocked `parser.test.ts` assertions, the Langium grammar-follower TEST-03 skip — **the
  documentation becomes the issue body, not an alternative to filing one.**

  DEBT-06 is the milestone's closure gate and its wording is absolute. A blocked item still gets a
  drafted issue so the debt is discoverable by someone who never opens `.planning/`. Filing an issue
  whose resolution depends on something outside this repository is the intended outcome, not a
  defect — the issue states the blocker and the unblocking condition, which is what DEBT-02 asked
  for all along.

### Re-triage Depth — Per Item

- **D-08: Items with inherited sweep evidence are cited, not re-derived — plus a currency check.**
  Accept the inherited finding as the evidence, cite it by ID, then run the cheap currency check:
  re-run its own recorded command, or re-read its `file:line` anchor, to confirm the code has not
  moved since the swept SHA `1750ad749d55c3e88d74be3ac2d561d37e8170d0`. Then write the verdict.

  This honours Phase 65 D-04's cross-reference-don't-re-record rule and spends the phase's effort
  on the verdict — which is the thing that is actually missing. The currency check is what makes
  criterion 1's "against current code" provable rather than asserted.

  | Item | Inherited evidence | Currency check |
  |---|---|---|
  | **DEBT-01** | `P61-D3-003` (high) — `bbj-scope.ts:308-331`, `bbj-scope-local.ts:106-114`; `bbj-index-manager.ts:14-27` `isAffected()` as existing partial mitigation | re-read all three anchors |
  | **DEBT-02** | `P61-D5-003` (3 disabled `parser.test.ts` assertions at `:530`, `:811`, `:860`) and `P61-D5-010` (`completion-test.test.ts:185`) | re-read the 4 sites |
  | **DEBT-03** | two `P61-*` findings — the reproduction and the untested-regression angle | re-read anchors |
  | **DEBT-05** | `P63-D4-010` — 63-COVERAGE's designated DEBT-05 evidence record | superseded by D-10's measurement |

  **A disagreement with a closed COVERAGE file is recorded as a finding here, with the evidence that
  settles it — never as a silent correction and never as an edit to that file.** Phase 63's
  `P63-D1-002` withdrawal is the worked precedent (Phase 65 D-05, D-11).

- **D-09: DEBT-04 is established by static trace to INVENTORY's `trace` tier.** It is the one item
  no sweep touched — zero inherited evidence — and its stated blocker (a JAR redeployment on the
  java-interop side) sits behind FUT-01's out-of-scope boundary.

  Read the actual path — `bbj-scope.ts:199-213`'s `isClassRef` / `isJavaClass` branch and the
  completion provider — and record line-by-line what the code does and does not filter, naming
  concrete inputs and the exact `file:line` where behaviour diverges from the expectation. Record
  the JAR-redeployment dependency as the stated blocker (DEBT-04's own wording requires it), and
  record that the **USE-alias path works** while the MemberCall `isClassRef` path is the gap.

  Live reproduction is **not** attempted: this environment has known pre-existing test failures that
  an open java-interop port does not resolve, so a failed setup would be indistinguishable from a
  failed repro — a worse evidence record than an honest trace.

- **D-10: DEBT-05 is measured against the locally cached LSP4IJ 0.19.0 artifact.** Verified at
  discussion time: the installed artifact is present at
  `~/.gradle/caches/8.13/transforms/adf3542fc53c5acc20d2eaa00b91d526/transformed/com.redhat.devtools.lsp4ij-0.19.0/lsp4ij/lib/lsp4ij-0.19.0.jar`,
  matching `bbj-intellij/build.gradle.kts:27`'s `plugin("com.redhat.devtools.lsp4ij:0.19.0")`.

  Read the `@ApiStatus.Experimental` / `@ApiStatus.Internal` annotations off the **exact classes and
  methods our code touches**, enumerated by 63-COVERAGE: `LSPCompletionFeature` (subclassed by
  `BbjCompletionFeature`), `LanguageServerFactory`, `LSPClientFeatures`, `LSPDocumentLinkFeature`,
  `StreamConnectionProvider`, `LanguageClientImpl` (subclassed, overriding `createSettings()` /
  `handleServerStatusChanged()`), `OSProcessStreamConnectionProvider` (subclassed),
  `LanguageServerManager`, `ServerStatus`.

  This settles or retires PROJECT.md's "19" **with evidence against the version actually shipped** —
  which is exactly what ROADMAP criterion 4 asks for and what 63-COVERAGE could not do from this
  tree. Re-derive 63's own two counts as the baseline and report any drift:
  `grep -rn "ApiStatus.Experimental\|@Experimental" bbj-intellij/src/main/java` → **0**;
  `grep -rln "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` → **11 files / 20 references**
  (re-verified at discussion time: 11 and 20).

- **D-11: DEBT-01's draft carries a named-edit implementation plan.** Criterion 1's own word is
  "concrete", and #232 is **CLOSED** (verified at discussion time: `gh issue view 232` →
  `"state": "CLOSED"`, title "Code Helper process using 100% CPU on macOS", no labels — which is why
  it is absent from INVENTORY's frozen 15-issue snapshot). So criterion 1's "issue update" cannot be
  a comment on an open issue: it becomes a **new issue drafted for Phase 69** that supersedes #232,
  cross-referencing it.

  The draft names the exact edit for each of `P61-D3-003`'s two mechanisms:

  1. **`getBBjClassesFromFile` (`bbj-scope.ts:308-331`)** — full linear scan of
     `indexManager.allElements(BbjClass.$type)` across the entire multi-project workspace index, on
     every `::file::Class`-qualified reference and every `USE "::file::"` resolution, uncached.
     The plan states the cache shape, its key, and its invalidation trigger.
  2. **`collectLocalSymbols` (`bbj-scope-local.ts:106-114`)** — full unpruned
     `AstUtils.streamAllContents(rootNode)` walk with a per-node `await interruptAndCheck`. The plan
     states the `isExternalDocument`-aware `treeIter.prune()`, **modelled on `bbj-linker.ts:47-58`'s
     `link()`, which already does exactly this** — so the fix has an in-repo precedent to copy
     rather than a design to invent.

  Plus `bbj-index-manager.ts:14-27`'s `isAffected()` recorded as the **existing partial mitigation**
  (present at the index-rebuild layer, absent at both request-time paths), and a stated method for
  measuring the win. No benchmark is built — #232's symptom is macOS-specific and load-dependent, so
  a sandbox number would mislead more than it informs.

### Output Shape & Closure

- **D-12: The deliverable is `.planning/reviews/66-COVERAGE.md`**, despite holding debt rows rather
  than grid cells. Phase 68's DOC-03 concatenation walks `6N-COVERAGE.md`; renaming for accuracy
  would break that walk for a cosmetic gain. **Phase 65 D-03 decided this exact trade the same
  way.** The header states plainly that this file's completeness construct is an 8-row debt
  denominator and not a cell grid, so no reader expects a gate that is not there.

- **D-13: Phase 66 rewrites `PROJECT.md`'s debt list to carry IDs; Phase 69 backfills issue
  numbers.** Each surviving bullet gains its `P66-*` finding ID, its `DEBT-NN` requirement, and its
  disposition — so the prose becomes a **pointer into the evidence base** rather than being the
  record itself, which is what "recorded only as prose" actually forbids. Items resolved or found
  not-reproducible are struck from the list with their evidence named.

  Phase 69 then backfills the filed issue number per bullet. Doing the ID pass here keeps DEBT-06
  provable **inside the phase that owns it**, instead of depending on a phase three steps
  downstream.

  — **Reversibility:** reversible — the file is planning prose under version control.

- **D-14: Three plans, grouped by the kind of work each item needs rather than by requirement
  number:**

  1. **`66-01`** — inherited-evidence items (**DEBT-01, DEBT-02, DEBT-03**) via D-08's
     cite-plus-currency-check, including D-11's named-edit plan. Creates the `66-COVERAGE.md`
     skeleton and anchors the phase to the swept SHA.
  2. **`66-02`** — live-investigation items (**DEBT-04** static trace per D-09, **DEBT-05** jar
     measurement per D-10). These two are where the phase's real investigative work is.
  3. **`66-03`** — the orphans (**DEBT-07, DEBT-08**), the `REQUIREMENTS.md` edit (D-05), the
     `PROJECT.md` rewrite (D-13), **DEBT-06** closure and **the four gates** (D-15).

- **D-15: Four completion gates, re-derived live in `66-03`'s close-out:**

  1. **Denominator gate** — `PROJECT.md`'s list re-counted by the D-04 command with its literal
     output printed, and every row shown to carry a verdict. A drift from 8 is reported with its
     cause, never silently adopted.
  2. **Criterion gate** — each of ROADMAP's 5 success criteria answered **Met / Partially Met /
     Not Met**, with the section that discharges it named.
  3. **Requirement gate** — `DEBT-01`..`DEBT-08` each marked complete or explicitly not, with the
     evidence named.
  4. **Boundary gate** — `git status --porcelain bbj-vscode bbj-intellij java-interop .github`
     prints nothing, `git status --porcelain` over `INVENTORY.md` and the five closed
     `6N-COVERAGE.md` files prints nothing, and **no tracker write occurred**.

  Gate 4 is what makes D-01 and D-02 — this discussion's two most consequential decisions —
  checkable rather than asserted, in the first phase of the milestone where writing code was even on
  the table. Phase 65 §F/§G is the worked precedent.

  The close-out also states what each downstream phase inherits (67, 68, 69), following the
  inheritance-table pattern every prior phase used.

- **D-16: Finding dimensions follow the concern, not a phase default.** Unlike Phase 65 (D1
  throughout, because all four of its requirements were security concerns), Phase 66's items span
  dimensions: DEBT-01 is **D3** (performance/resource use, matching `P61-D3-003`), DEBT-02 is **D5**
  (test coverage, matching `P61-D5-003`/`010`), DEBT-05 is **D4** (maintainability, matching
  `P63-D4-010`). Assign each `P66-*` finding the dimension its inherited finding already carries, so
  Phase 68's per-dimension assembly stays consistent across phases.

### Claude's Discretion

Left to the planner and executing agents:

- Task boundaries within each plan.
- Whether the 8-row denominator renders as one table with a verdict column or as per-item
  subsections, provided every row is enumerated and every row carries a verdict.
- The order in which `66-02` takes DEBT-04 and DEBT-05.
- The exact `PRIO 1|2|3` label proposed per drafted issue, provided it is drawn from the
  repository's existing label set and effort lands on `{2,4,8}`.
- Whether the LSP4IJ jar is inspected via `javap`, an unzip-and-read of the class constant pool, or
  a bundled sources artifact — whichever yields a citable annotation result.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone contract — read first

- `.planning/reviews/INVENTORY.md` — the Phase 60 review standard: evidence tiers, the finding
  record's required fields, the disposition vocabulary (**line 154** — D-06 uses it verbatim), the
  finding-ID scheme, the easy-vs-major rule, the `{2,4,8}` effort scale (§3d), and the **Frozen
  Open-Issue Snapshot** (15 issues, queried 2026-08-17) that every `dedup:` is checked against.
  **Immutable** (Phase 60 D-09) — never edited by this phase.
  - **`line 1220`** — the recorded 8-vs-6 debt drift that D-04/D-05 close. Read this line before
    planning; it is the reason `DEBT-07`/`DEBT-08` exist.
- `.planning/ROADMAP.md` §"Phase 66: Known Debt Re-triage" (line 512) — the goal and 5 success
  criteria. Also §"Phase 67" / §"Phase 68" / §"Phase 69" for the boundaries D-01/D-02 hold.
- `.planning/REQUIREMENTS.md` — `DEBT-01`..`DEBT-06` verbatim (lines 55-60), the requirement
  coverage matrix (lines 137-142), and `ISSUE-01` (line 78) — the gate D-02 protects. **This file is
  edited by `66-03`** to add `DEBT-07`/`DEBT-08`.
- `.planning/PROJECT.md` §"Known tech debt" (lines 249-257) — **the denominator itself** (D-04).
  Edited by `66-03` per D-13.

### Inherited evidence — cited, not re-derived (D-08)

- `.planning/reviews/61-COVERAGE.md`
  - **`P61-D3-003`** (line ~1517 for the D3 cell narrative, ~1632 for the record) — DEBT-01's
    re-triage: the two current-code mechanisms, `isAffected()` as partial mitigation, and the
    `dedup:` noting #232 is not in the frozen snapshot.
  - **`P61-D5-003`** (line ~661, record ~935) — DEBT-02's 3 disabled `parser.test.ts` assertions.
  - **`P61-D5-010`** (line ~1862, record ~2172) — DEBT-02's TEST-03 skip.
  - **DEBT-03's two records** (lines ~1555, ~1806-1822) — the reproduction and the
    untested-regression angle.
  - **`P61-D5-013`** (record ~2820-2840) — the `initializeWorkspace()` hookTimeout flakiness whose
    `dedup:` says "Phase 66 should triage this as a new debt item". **Deliberately out of this
    phase's denominator** (D-04) — see `<deferred>`.
- `.planning/reviews/63-COVERAGE.md`
  - **`P63-D4-010`** (D4 cell narrative at line ~1932, record ~2281-2286) — DEBT-05's designated
    evidence record, incl. the measured `0` / `11 files / 20 refs` correction and the explicit
    routing of the "19" to Phase 66. **Superseded by D-10's jar measurement.**
- `.planning/reviews/64-COVERAGE.md` — `P64-D6-010` (the Gradle JDK 17-vs-25.0.3 toolchain
  mismatch, `P63-D6-002` merged into it) and its close-out inheritance table (line ~3863), which
  routes it to "Phase 66/67". **Not in this phase's denominator** (D-04) — see `<deferred>`.
- `.planning/reviews/65-COVERAGE.md` — its close-out inheritance table (line ~1838) states Phase 66
  inherits **nothing** from Phase 65: all 3 of its findings resolve `dedup: none`.

### Worked precedent — the shape to copy

- `.planning/phases/65-cross-cutting-security-audit/65-CONTEXT.md` — the decision-document shape,
  and D-01/D-03/D-04/D-09/D-10 specifically: constructing a closed denominator without a grid,
  keeping the `6N-COVERAGE.md` name, cross-reference-don't-re-record, the `{2,4,8}` warning, and the
  don't-add-inapplicable-fields rule. This phase's D-04, D-12, D-08, D-03 and D-06 each descend from
  one of them.
- `.planning/reviews/65-COVERAGE.md` §F/§G — the boundary-gate form D-15 gate 4 copies:
  `git status --porcelain` over every protected tree, printed with its literal output.
- `.planning/phases/63-intellij-plugin-review/63-VERIFICATION.md` — the `P63-D1-002` withdrawal,
  the precedent behind D-08's "a disagreement is a finding, not a silent correction".

### Code and artifacts under re-triage

- **DEBT-01:** `bbj-vscode/src/language/bbj-scope.ts:308-331`,
  `bbj-vscode/src/language/bbj-scope-local.ts:106-114`,
  `bbj-vscode/src/language/bbj-index-manager.ts:14-27`, and
  `bbj-vscode/src/language/bbj-linker.ts:47-58` (the `treeIter.prune()` precedent D-11 copies).
- **DEBT-02:** `bbj-vscode/test/parser.test.ts:530`, `:811`, `:860` (the 3 `// DISABLED:` sites);
  `bbj-vscode/test/completion-test.test.ts:185` (`test.skip` — TEST-03).
- **DEBT-03:** the static method return-type inference path — anchors carried by its two
  `P61-*` records.
- **DEBT-04:** `bbj-vscode/src/language/bbj-scope.ts:199-213` (`isClassRef` / `isJavaClass`) plus
  `bbj-vscode/src/language/bbj-completion-provider.ts`.
- **DEBT-05:** `bbj-intellij/build.gradle.kts:27` (the pinned `0.19.0`); the 11 files carrying the
  20 LSP4IJ references — `lsp/BbjCompletionFeature.java`, `lsp/BbjLanguageClient.java`,
  `lsp/BbjLanguageServerFactory.java`, `lsp/BbjLanguageServer.java`, `lsp/BbjJavaInteropService.java`
  (per 63's enumeration), `ui/BbjServerService.java`, `ui/BbjStatusBarWidget.java`,
  `BbjCompileAction.java`, `BbjRefreshJavaClassesAction.java`, `BbjRunActionBase.java`,
  `BbjComposerService.java`; and the cached artifact
  `~/.gradle/caches/8.13/transforms/adf3542fc53c5acc20d2eaa00b91d526/transformed/com.redhat.devtools.lsp4ij-0.19.0/lsp4ij/lib/lsp4ij-0.19.0.jar`.
- **DEBT-08:** the IntelliJ TextMate bundle registration landed in `2489001` (#381), and
  `bbj-intellij/build.gradle.kts:12-13` (the JDK toolchain mismatch that blocks `./gradlew build`
  locally — `P64-D6-010`, and the reason DEBT-08 is recorded as unverified).

### Out of scope

`java-interop/` (FUT-01), `bbj-vscode/src/language/generated/` (machine-generated),
`bbj-vscode-deprecated/`, and `RU-D8-01`'s surface (`CLAUDE.md`, `VERBs.md`, `documentation/`) —
still the milestone's one unrecorded grid row and not this phase's to close.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **INVENTORY's finding-record format, evidence tiers and disposition vocabulary** — five times
  proven across Phases 61-65. Nothing is being designed here (D-03, D-06).
- **The frozen 15-issue snapshot** is the `dedup:` input, keeping this phase's verdicts comparable
  with all five sweeps. Note **#232 is not in it because it is CLOSED** — a fact D-11 depends on.
- **Four of six items arrive with `file:line` evidence and verified failure scenarios already
  recorded** — the re-triage starts from evidence, not from a blank sweep (D-08).
- **`bbj-linker.ts:47-58`'s `link()` already implements the exact `treeIter.prune()` pattern**
  DEBT-01's second mechanism is missing — so D-11's plan cites an in-repo precedent rather than
  proposing an untested design.
- **Phase 65's §F/§G boundary evidence and its four-denominator construction** are the structural
  models for D-15 and D-04 respectively.

### Established Patterns

- **Audit and triage phases record; they never fix.** Five phases, zero source files modified —
  D-01 keeps the streak and D-15 gate 4 proves it.
- **Gates are re-derived live, never asserted** (Phase 65 D-16) — D-15 keeps this with a debt
  denominator.
- **A limitation is stated, not hidden** (Phase 63 D-07, Phase 64 D-10) — D-02 states plainly that
  DEBT-06's tracker half completes in Phase 69, rather than overclaiming.
- **Positive results are recorded** so checked-and-clean is distinguishable from unchecked
  (Phase 64 D-12) — an item that no longer reproduces is recorded as `not-reproducible` with its
  evidence, never quietly deleted.
- **Cross-reference by ID rather than re-record** (Phase 62 D-14, Phase 65 D-04) — D-08 makes this
  the organising rule for four of the eight rows.

### Verified at discussion time

| Fact | Finding |
|---|---|
| `PROJECT.md` §"Known tech debt" bullet count | **8** — the denominator (D-04) |
| `grep -c '^- \[ \] \*\*DEBT-' REQUIREMENTS.md` (per INVENTORY:1220) | **6** — hence the 2 orphans (D-05) |
| `gh issue view 232` | **CLOSED**, "Code Helper process using 100% CPU on macOS", no labels (D-11) |
| `grep -rln "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` | **11 files** — matches 63-COVERAGE |
| `grep -rn "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` | **20 references** — matches 63-COVERAGE |
| LSP4IJ pin | `bbj-intellij/build.gradle.kts:27` → `0.19.0` |
| LSP4IJ 0.19.0 artifact locally cached | **yes** — `~/.gradle/caches/8.13/transforms/adf3542.../lsp4ij-0.19.0.jar` (makes D-10 possible) |
| `// DISABLED:` sites in `parser.test.ts` | **3** — `:530`, `:811`, `:860` (DEBT-02) |
| TEST-03 skip | `completion-test.test.ts:185` — `test.skip('DEF FN parameters with $ suffix inside class method')` |
| Third `test.skip` in the suite | `linking.test.ts:85` — `'Link to string template array members'`, named by **no** `DEBT-*` item |
| Phase 65 findings routing to Phase 66 | **0** — all 3 resolve `dedup: none` |
| Swept-tree SHA | `1750ad749d55c3e88d74be3ac2d561d37e8170d0` on `v4.0-stability-and-quality` |

### Integration Points

- **Phase 67** inherits this phase's `classification: easy` set — expect it to be small. Four of the
  eight items are structural or blocked-on-environment, and the two orphans are a timing nuance and
  an unverifiable bundle registration.
- **Phase 68** concatenates `66-COVERAGE.md` for DOC-03, assembles the `P66-*` findings into
  `MAJOR-REFACTORS.md`/`EASY-FIXES.md`, and must pick up `DEBT-07`/`DEBT-08` in its requirement
  coverage statement (D-05).
- **Phase 69** files every drafted issue produced here, under ISSUE-01, and **backfills the issue
  number into each `PROJECT.md` bullet** (D-13) — the step that finally makes DEBT-06 literally
  true.

</code_context>

<specifics>
## Specific Ideas

- **The most valuable output of this phase is probably a `not-reproducible` or `already-covered`
  verdict, not a new issue.** Several of these items were written across v3.0-v3.9 and the tree has
  moved a long way since; PROJECT.md's own header says they were "checked against the tree ... on
  2026-08-17; none resolved — all 8 survive", but that check was a survival check, not a re-triage
  against current code. D-08's currency check is where a genuine change of status would show up.

- **DEBT-05 is the one item where this phase can do something no sweep could.** 63-COVERAGE
  explicitly could not resolve the "19" from this tree and said so. The cached 0.19.0 jar makes it
  answerable — and the answer determines whether `BbjCompletionFeature`'s subclassing of
  `LSPCompletionFeature` is a genuine upgrade hazard or an accepted, stable extension point.

- **DEBT-08 is blocked by another finding, and that dependency should be stated rather than
  worked around.** Whether JetBrains' TextMate plugin honors `filenames` cannot be verified while
  `./gradlew build` fails on the JDK 17-vs-25.0.3 toolchain mismatch (`P64-D6-010`). The verdict
  should name that dependency explicitly — DEBT-08's unblocking condition is another finding's fix.

- **DEBT-02's three assertions and its skip have two different unblocking conditions and should not
  be collapsed.** The `parser.test.ts` trio needs a Java classpath under a non-`EmptyFileSystem`
  fixture — actionable in this repository. TEST-03 needs Langium's completion grammar follower to
  resolve inside `MethodDecl.body` — upstream. Both get drafted issues per D-07, but their
  acceptance criteria are not the same shape.

</specifics>

<deferred>
## Deferred Ideas

- **`P61-D5-013`** — the `initializeWorkspace()` sequential-I/O hookTimeout flakiness. Its own
  `dedup:` suggests "Phase 66 should triage this as a new debt item", but D-04 deliberately keeps
  the denominator at PROJECT.md's list: it is already a recorded finding flowing to Phase 68/69 on
  its own, and re-triaging it here would create the duplicate record Phase 65 D-04 exists to
  prevent. Same reasoning for **`P61-D5-001`** (the `linking.test.ts` routing-table item).

- **`P64-D6-010`** (Gradle JDK 17-vs-25.0.3 toolchain mismatch, `P63-D6-002` merged in) — routed by
  64-COVERAGE to "Phase 66/67". Excluded from the denominator for the same reason; it is referenced
  here only as **DEBT-08's blocker** (see `<specifics>`).

- **`linking.test.ts:85`'s `test.skip('Link to string template array members')`** — a third skipped
  test that no `DEBT-*` item names and that this phase's denominator therefore does not cover. Worth
  a `DEBT-09` in a future milestone, or folding into whatever Phase 69 files for DEBT-02.

- **Applying any Phase 66 finding** — Phase 67 only (D-01).
- **Filing any drafted issue** — Phase 69, gated on ISSUE-01 (D-02).
- **Reviewing `RU-D8-01`** (`CLAUDE.md`, `VERBs.md`, `documentation/`) — owned by no phase; still
  the milestone's one unrecorded grid row.

</deferred>

---

*Phase: 66-Known Debt Re-triage*
*Context gathered: 2026-08-19*
