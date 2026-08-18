# Phase 63: IntelliJ Plugin Review - Pattern Map

**Mapped:** 2026-08-18
**Files analyzed:** 1 artifact (`.planning/reviews/63-COVERAGE.md`, does not yet exist) + up to 5 plan files (`63-01`..`63-05`)
**Analogs found:** 2 / 2 primary shape analogs (both exact, worked precedent), 3 new shape elements with no exact analog (named below)

**This is a review phase.** Per `63-CONTEXT.md` `<domain>`, Phase 63 modifies zero source files. It
creates exactly one artifact, `.planning/reviews/63-COVERAGE.md`, plus up to 5 plan files that
produce it. Pattern mapping here is documentary — the markdown shape to copy literally, not
code-structural role/data-flow classification of `bbj-intellij/*.java` files (those 61 files are
the read-only SUBJECT of the review, never edit targets — see "Code Under Review" below).

**D-19 compliance:** `.planning/codebase/*.md` (the 7 dated 2026-02-01 maps) was **not read** while
producing this file, per Phase 63 D-19's prohibition, carried forward from Phase 61 D-16 / Phase 62
D-16. Not cited as an analog or source anywhere below.

## File Classification

| New File | Role | Closest Analog | Match Quality |
|---|---|---|---|
| `.planning/reviews/63-COVERAGE.md` | review-coverage document | `.planning/reviews/62-COVERAGE.md` | exact — frozen shape (Phase 63 D-03, no new format checkpoint) |
| `.planning/phases/63-.../63-01-PLAN.md` (tracer: skeleton + `RU-63-03`) | GSD execute-plan | `62-01-PLAN.md` / `61-01-PLAN.md` (tracer: skeleton + rank-1 unit) | exact |
| `.planning/phases/63-.../63-02..05-PLAN.md` (one unit each) | GSD execute-plan | `62-02..05-PLAN.md` / `61-04-PLAN.md` (expansion plan, one unit) | exact |

## Pattern Assignments

### `.planning/reviews/63-COVERAGE.md`

**Primary analog:** `.planning/reviews/62-COVERAGE.md` (2,077 lines, phase-closed, verification
13/13). Per Phase 63 D-03 this shape is copied **unchanged** — no new format checkpoint.
**Secondary analog:** `.planning/reviews/61-COVERAGE.md` (3,329 lines) — the original approved
rendering, useful where 62-COVERAGE's own worked example is thin (e.g. a second `### SEC-NN`
narrative subsection).

**1. Header block** — literal shape, substitute Phase 63's own numbers (`62-COVERAGE.md:1-9`):

```markdown
# Phase 63 Coverage — bbj-intellij/src/main/java/ (RVW-04, SEC-03)

**Swept tree:** branch `v4.0-stability-and-quality` at commit `<SHA recorded by 63-01 at execution
time, D-18>` — recorded once for the whole phase; not re-anchored per plan.

**Governing standard:** `.planning/reviews/INVENTORY.md` — the single immutable contract for
Phases 61-69. Not edited by this phase.

**Dedup source:** INVENTORY's Frozen Open-Issue Snapshot (15 issues, queried 2026-08-17). Phase 69
re-queries the tracker live immediately before filing, so this snapshot is not re-verified live at
sweep time. Phase 63-plausible neighbours: #65, #231, #381, #385, #410, #476, #485.

**Slice size:** 5 unit rows × 8 dimensions = **40 cells** (**35** `applies`, **5** `n/a`).
```

Do NOT pin the SHA in any plan text — D-18 records it at execution time only. Do not carry over
`62-COVERAGE.md`'s "Recording shape: inherited unchanged from `61-COVERAGE.md`" sentence verbatim;
Phase 63's header instead states inheritance from `62-COVERAGE.md` and names its three additions
(D-03): `### SEC-03 Integrity Posture` under `RU-63-03`, `### Inherited referral triage` under each
unit owning one, `### Cross-phase observations (VS Code side)` in the close-out.

**2. `## Applicability Grid — Phase 63 slice`** — same table shape as `62-COVERAGE.md:13-23`, but
the `n/a` markers are **not uniform** (unlike Phase 62's all-`R-D6-CENTRAL` grid): four `D6` cells
carry `R-D6-CENTRAL` and one `D6` cell (`RU-63-03`) is `applies`; the D7 cell for `RU-63-03` alone
carries `R-VSCODE-NO-DOWNLOAD` while the other four units' D7 cells are `applies`. Reproduce the
"No file-exception rows" sentence style from `62-COVERAGE.md:25`, substituted with Phase 63's own
`63-CONTEXT.md` line: "All 8 file-exception rows in INVENTORY belong to `RU-61-07`, `RU-64-02` and
`RU-64-03`."

**3. `## D-14 Cell-Total Gate`** (Phase 63's own decision numbering — Phase 62 called this
"D-14" too, Phase 61 called it "D-17"; use whatever ID `63-CONTEXT.md` D-17 assigns) — awk
re-derivation pattern copied verbatim from `63-CONTEXT.md`'s own `<domain>` block:

```bash
awk '/^\| `RU-63-0[1-5]` \|/ {a+=gsub(/applies/,"applies"); n+=gsub(/n\/a/,"n\/a")} END{print a, n, a+n}' .planning/reviews/INVENTORY.md
# → 35 5 40
```

**4. `## Exclusion reasons carried forward`** — mirror `62-COVERAGE.md:53-63`'s verbatim-quote +
identity-check pattern, but Phase 63 quotes **two** distinct markers (not one uniform marker like
Phase 62):

```markdown
**R-D6-CENTRAL** (4 cells in this slice — the `D6` cell of `RU-63-01`/`RU-63-02`/`RU-63-04`/`RU-63-05`):

> "No distinct third-party dependency of its own; ... Repeating the audit per unit would restate
> the same npm/Gradle audit under a different heading, not surface a new finding."

**R-VSCODE-NO-DOWNLOAD** (1 cell — `RU-63-03`/D7):

> "<verbatim text from INVENTORY.md's own Exclusion reasons section for this marker>"

**Identity check:** 4 + 1 = 5, matching the 5 `n/a` cells in this slice.
```

Quote both blocks verbatim from `INVENTORY.md` — do not paraphrase either, and do not merge them
into one bullet the way Phase 62's single-marker slice allowed.

**5. Per-unit section shape** — full worked example is `## RU-62-04 — Composer webview HTML
generators` (`62-COVERAGE.md:65-324`, the rank-1/SEC-owning unit — the closest structural sibling
to `RU-63-03`, since both are risk-rank-1 units carrying their phase's sole named security
requirement). The literal skeleton (unchanged from Phase 62):

```markdown
## RU-63-03 — Settings & runtime acquisition

**Files (6 / 1,097 LOC):**
- `com/basis/bbj/intellij/BbjSettings.java` (152)
- `com/basis/bbj/intellij/BbjSettingsComponent.java` (333)
- `com/basis/bbj/intellij/BbjSettingsConfigurable.java` (161)
- `com/basis/bbj/intellij/BbjHomeDetector.java` (91)
- `com/basis/bbj/intellij/BbjNodeDetector.java` (70)
- `com/basis/bbj/intellij/BbjNodeDownloader.java` (290)

**Risk rank:** 1 of 5 Phase 63 units — the entire SEC-03 surface and the phase's only live D6 cell.
**Sweep method:** full read.
**Owning plan:** 63-01 (this plan).

### Cells
- D1 Security — pass|fail — <written line naming concrete checks applied>. N findings recorded: <ids>.
- D2 ...
- D6 Dependency health — pass|fail — <Node.js pin currency + routed toolchain item, per D-10>
- D7 Cross-IDE parity — n/a — "<verbatim R-VSCODE-NO-DOWNLOAD text>"
- D8 Comment & doc accuracy — pass|fail — <written line>

### SEC-03 Integrity Posture
<narrative subsection — see below>

### Findings
<13-field fenced records>

### Not-reproducible dispositions
- **Tier failed: `<tier>` (D<n>).** Candidate claim: ... **Reason not recorded as a finding:** ...

### Cross-unit referrals
- **RU-XX-YY** — <surface>, <divergent evidence>. <what the target's own sweep should confirm>.
```

Every other unit (`RU-63-01`, `RU-63-04`, `RU-63-05`, `RU-63-02`) omits `### SEC-03 Integrity
Posture` and, per D-06, adds `### Inherited referral triage` where it owns one of the 7 inherited
Phase 62 referrals (all four non-`RU-63-03` units own at least one per the D-06 ledger; `RU-63-03`
and `RU-63-05` own zero).

**The 13-field finding record** (verified against `62-COVERAGE.md:101-143`) is exactly: `id, unit,
location, dimension, secondary, severity, evidence_tier, evidence, failure_scenario,
classification, effort, dedup, disposition`. Reproduce this field set and order unchanged for every
`P63-D{n}-{seq}` record. Per D-07, every `evidence:` clears its tier via the "line-by-line trace"
branch (no `repro` script exists in this environment — the Gradle build fails on the JDK 17-vs-25
mismatch) and every record states this once in its own `evidence_tier:`/`evidence:` context per
D-07's instruction, mirroring how `62-COVERAGE.md`'s D1 records state their trace basis inline
(see `P62-D1-001`'s "Line-by-line trace:" opening at `62-COVERAGE.md:109`). Per D-13, any `P63-D1-*`
finding rated `critical`/`high` uses the two-tier redaction rule (name surface/problem
class/impact, no trigger sequence or payload) — the same rule `62-COVERAGE.md`'s D-09 checkpoint
approved for `RU-62-04`'s D1 records, tightened here per D-13's stated rationale (an executable
binary fetched over the network and then run, cached and trusted on every later launch).

The `### Cells` line format (exact, per D-03): `- D{n} <Dimension name> — pass|fail — <written
checks…>. N findings recorded: <ids>.` For an `n/a` cell: `- D{n} <Dimension name> — n/a —
"<verbatim INVENTORY marker text>"`.

**6. `## Stopping Rule & Write Contract`** — copy `62-COVERAGE.md:41-51`'s three-part rule
structure verbatim, substituting: 5 plans / waves 1-5 (not 4), `depends_on` chain following D-02's
order (`RU-63-03` → `RU-63-01` → `RU-63-04` → `RU-63-05` → `RU-63-02`), and D-03's note that no new
format checkpoint is spent (state inheritance from `62-COVERAGE.md` by name, the way `62-COVERAGE.md`
itself states inheritance from `61-COVERAGE.md`). Extend part (iii) of the stopping rule with D-06's
referral disposition clause, since Phase 63 — unlike Phase 62 — inherits outstanding cross-unit
work that must also reach a disposition before a unit is "done" (Claude's Discretion in
`63-CONTEXT.md` flags this as the planner's to confirm or adjust).

**7. `## Phase 63 Close-Out`** — reproduce `62-COVERAGE.md:1839-2076`'s sections A-G unchanged in
shape:
- **A. File gate** — the 61-file enumeration, mirroring `62-COVERAGE.md:1846-1880`'s `ls | wc -l`
  + per-basename `grep -q` loop, using the command given verbatim in `63-CONTEXT.md` D-17.2:
  `find bbj-intellij/src/main/java -name '*.java' | wc -l` → `61`.
- **B. Cell-total gate** — mirror `62-COVERAGE.md:1882-1906`'s three-source-agreement table
  (stated totals / INVENTORY re-derivation / this file's own grep-counted content), using the
  `RU-63-0[1-5]` awk line.
- **C. Finding accounting** — dimension/disposition count tables + not-reproducible-by-unit table +
  dedup-resolution paragraph, mirroring `62-COVERAGE.md:1908-1955`.
- **D. Cross-unit referral accounting** — mirror `62-COVERAGE.md:1957-1977`'s two-group table
  shape, but Phase 63's "Group 2" table is **inbound** (referrals Phase 63 received and
  dispositioned, sourced from D-06's 7-row ledger) rather than **outbound** (Phase 62's table was
  entirely outbound, since Phase 62 owned no referrals from an earlier phase). Add the disposition
  column (`promoted`/`dismissed-with-evidence`/`not-reproducible`) per referral, since D-06 requires
  each of the 7 to end in exactly one of the three.
- **E. Scope-fidelity note** — mirror `62-COVERAGE.md:1979-2007`'s D-13-equivalent note (Phase 63's
  own D-16): state plainly that all 61 files were swept though ROADMAP criterion 1 names only a
  subset, and name the extra surfaces explicitly (the five notification providers,
  `BbjColorSettingsPage.java`, `BbjSpellcheckingStrategy.java`, `BbjTextMateBundleProvider.java`,
  `BbjCommenter.java`, the composer bridge files) — the exact list `63-CONTEXT.md` D-16 already
  gives.
- **F. ROADMAP success criteria** — mirror `62-COVERAGE.md:2009-2043`'s "Met." per-criterion
  structure, four criteria per `63-CONTEXT.md`'s canonical_refs (criterion 2 explicitly satisfied by
  D-11's SEC-03 subsection).
- **G. Closing confirmations** — mirror `62-COVERAGE.md:2045-2076` (ISSUE-01 not triggered,
  INVENTORY immutability, no source file modified, downstream-inheritance table). Phase 63's
  downstream-inheritance table differs from Phase 62's in one row: **no Phase 64/65 row needs a
  "Phase 63 inherits referrals" line the way Phase 62's row named Phase 63** — instead add a row
  for **Phase 65** naming both `RU-63-01`'s D1 records (SEC-04/SEC-05 synthesis input, per D-12) and
  `RU-63-03`'s `### SEC-03 Integrity Posture` (SEC-03 itself closes here, per D-11 — nothing further
  flows to Phase 65 on SEC-03 specifically, only the fact that it is closed).

---

### Three shape elements Phase 63 adds beyond the frozen Phase 62 shape (per D-03)

**(a) `### SEC-03 Integrity Posture` under `RU-63-03`.**

**Closest analogs:** `### SEC-01/SEC-02 Surface Handoff` under `## RU-62-04` (`62-COVERAGE.md:87-97`)
and `### SEC-06 Trust Boundary` under `## RU-61-06` (`61-COVERAGE.md:124-143`, read via
`62-PATTERNS.md`'s own extraction above — a second worked example of the same narrative-register
subsection, per `63-CONTEXT.md`'s canonical_refs). Both extracted in full by the Phase 62 pattern
map; the register to copy is: numbered facts, each ending with "Recorded as `P{n}-D1-NNN`" only
where a concrete defect was promoted, closing with a blast-radius statement and a
what-was-read-vs-what-was-asserted disclaimer.

No exact prior section titled `### SEC-03 Integrity Posture` exists anywhere in the codebase — it
is new to Phase 63. D-11 names the four facts it must state (as facts, not findings, against
ROADMAP criterion 2): (i) transport security — is `BbjNodeDownloader.java`'s fetch over HTTPS,
checked against `:34-35`'s `DOWNLOAD_BASE_URL`; (ii) checksum-or-signature verification — is the
downloaded archive verified before use, checked against `:102-115`'s
`Files.createTempFile`/`request.saveToFile` path; (iii) archive extraction path safety (zip-slip) —
checked against `:169-176`'s `ZipInputStream` entry loop and `destDir.resolve(...)`; (iv) cache
trust — checked against `:244`'s cache location
(`PathManager.getPluginsPath()/bbj-intellij-data/nodejs`) and `:50`'s cache-hit path taken on every
subsequent launch. Also state the extracted-binary path resolution and `setExecutable(true)` call
at `:137-159` as a fifth structural landmark (D-11 names it alongside the four ROADMAP-required
facts). Nothing is asserted as a defect purely by virtue of appearing in this subsection — discrete
`P63-D1-*` records are allocated only where a concrete evidence-clearing defect exists, exactly as
`### SEC-01/SEC-02 Surface Handoff`'s point (1)/(3) close with "Recorded as `P62-D1-00N`" only where
warranted, and its point (2) ("Authentication posture... stated as a fact, not itself a finding")
is the direct model for a bare "there is no checksum" statement that is not automatically a finding.

**(b) `### Inherited referral triage` under each unit owning one of Phase 62's 7 referrals.**

**No exact analog exists** — `62-COVERAGE.md` has no subsection with this title, because Phase 62
was the first sweep phase in this milestone with zero inbound referrals (`62-COVERAGE.md:1959-1961`,
"Group 1 — referrals addressed to another Phase 62 unit: 0"). The **closest analog** is the general
`### Cross-unit referrals` mechanism itself (`62-COVERAGE.md:321-323`, `61-COVERAGE.md:638-641`) —
the sentence shape a referral is written in when it is *created* — combined with D-06's own
three-way disposition vocabulary (promoted / dismissed-with-evidence / not-reproducible), which has
a structural sibling in the existing `### Not-reproducible dispositions` sub-block shape
(`62-COVERAGE.md:317-319`) for exactly one of its three outcomes. `63-CONTEXT.md` D-06 states this
is "Phase 61 Plan 06's worked pattern (4 inherited referrals → 2 promoted, 1 dismissed with
evidence, 1 promoted) applied at phase scale" — this specific worked instance was not located
verbatim as a distinctly-titled subsection inside `61-COVERAGE.md` during this pattern-mapping pass
(no `### Inherited referral triage`-titled heading exists there either); the planner should locate
the exact `RU-61-06`-adjacent disposition language `63-CONTEXT.md` D-06 refers to at planning time,
or construct the subsection directly from the three-way vocabulary D-06 itself defines, which is
self-contained and does not require the missing precedent to be planable. Skeleton to use for each
owning unit:

```markdown
### Inherited referral triage

- **Referral #N (from `RU-62-0N`):** <subject, verbatim from the D-06 ledger>. **Disposition:**
  promoted | dismissed-with-evidence | not-reproducible. <if promoted: names the P63-D{n}-{seq}
  finding it became; if dismissed: cites the document/code establishing the deliberate scope
  decision; if not-reproducible: reason, cross-referenced into this unit's own
  ### Not-reproducible dispositions sub-block>.
```

Referrals #4 and #5 (both `RU-63-04`, the SETOPTS absence from two Phase 62 vantage points) are
triaged **once**, as a single disposition naming both source referrals — do not render two entries.

**(c) `### Cross-phase observations (VS Code side)` in the close-out.**

**No analog exists anywhere in `61-COVERAGE.md` or `62-COVERAGE.md`.** This is stated plainly per
the task instruction — Phase 61 and Phase 62 each had a downstream open phase to route a
same-direction discrepancy into (Phase 62 routed IntelliJ-side observations to `RU-63-*` referrals
because Phase 63 was still open); Phase 63 has no equivalent downstream phase for a VS Code-side
observation, because Phase 62 is closed and `62-COVERAGE.md` is not reopened (D-05). The nearest
structural precedent for "a written record of an observation that is deliberately not a finding and
not silently dropped" is `62-COVERAGE.md`'s own D8 cells' "noted but not promoted to a finding"
phrasing (e.g. `62-COVERAGE.md:85`, `62-COVERAGE.md:344`, the `CLAUDE.md`-silence observations) —
same register (state it, don't promote it, don't drop it), different placement (per-cell inline
there; a dedicated close-out subsection here, since D-05 requires it survive independent of any one
unit's cell). Skeleton:

```markdown
### Cross-phase observations (VS Code side)

- **Surface:** <bbj-vscode/ file:line>. **Evidence:** <what was observed while doing a D7 read>.
  **Would-have-owned unit:** `RU-62-0N`. <one sentence stating why this is recorded here rather
  than as a `P63-D7-*` finding — per D-05, no P63-* finding may locate inside bbj-vscode/>.
```

---

### Plan file shape (secondary analog)

**Analogs:** `62-01-PLAN.md`/`61-01-PLAN.md` (tracer: skeleton + rank-1 unit) and
`62-02-PLAN.md`../`62-05-PLAN.md`/`61-04-PLAN.md` (expansion plan, one unit). Frontmatter shape
(`phase`, `plan`, `type: execute`, `wave`, `depends_on`, `files_modified: [.planning/reviews/63-COVERAGE.md]`,
`autonomous`, `requirements: [RVW-04]`, `estimate`, `must_haves.{truths,artifacts,key_links,prohibitions}`)
is structurally identical to Phase 62's, per `62-PATTERNS.md`'s own extraction (already quoted in
full there — not re-extracted here to avoid duplicate reading of the same source). Phase 63-specific
substitutions: `requirements: [RVW-04]` (not `RVW-01`/`RVW-02`/`RVW-03`), `wave: 1..5`,
`depends_on` chain per D-02's order, and — the one Phase 63-only frontmatter addition — plan `63-01`'s
`prohibitions` list must add "MUST NOT claim a runnable Gradle build reproduction (D-07)" and "MUST
NOT read `.planning/codebase/*.md` (D-19)" alongside the carried-forward "MUST NOT modify any file
under `bbj-intellij/`" prohibition. Task decomposition per D-15: **`RU-63-03`'s Task A carries 5
dimensions (D1, D2, D3, D6 — D7 excluded)**, every other unit's Task A carries 4 (D1, D2, D3, D7);
Task B is D4, D5, D8 for all five units — the asymmetry must be named explicitly in
`acceptance_criteria`, mirroring how Phase 62's D-11 task split was named explicitly in
`62-PATTERNS.md`'s own plan-shape section.

## Shared Patterns

### Finding-ID allocation
**Source:** `62-COVERAGE.md:101-102` (`id: P62-D1-001` pattern) and `62-PATTERNS.md`'s own
"Finding-ID allocation" shared pattern.
**Apply to:** all 5 Phase 63 plans. Token shape `P63-D{dimension}-{seq}`, zero-padded to three
digits, allocated monotonically in discovery order within each `(63, dimension)` pair across the
whole phase — plan `63-0N` continues from the highest sequence already present for that dimension,
not restarting per plan. Per D-15, `RU-63-03`'s tracer plan opens the phase and allocates the real
first `P63-D1-001`.

### Per-unit stopping rule
**Source:** `62-COVERAGE.md:41-43` (quoted in full above under "Stopping Rule & Write Contract").
**Apply to:** all 5 Phase 63 unit sections, extended by D-06's referral-disposition clause per
Claude's Discretion in `63-CONTEXT.md`.

### Shared-file write contract via wave dependency chain
**Source:** `62-COVERAGE.md:45` and `63-CONTEXT.md` D-04 (already resolved, not discretionary).
**Apply to:** all 5 Phase 63 plans — one wave per plan, `depends_on` naming the predecessor in
D-02's risk-rank order (`RU-63-03` → `RU-63-01` → `RU-63-04` → `RU-63-05` → `RU-63-02`).

### Public-repo disclosure two-tier rule
**Source:** `62-COVERAGE.md:51` (the D-09 checkpoint approval paragraph) and `63-CONTEXT.md` D-13.
**Apply to:** every `P63-D1-*` finding rated `critical`/`high` — name surface, problem class,
impact; no trigger sequence or payload. Everything else (D2-D8, and D1 rated `medium`/`low`): full
concrete detail per the finding standard.

### D5 two-layer cross-reference (systemic absence stated once)
**Source:** `62-COVERAGE.md` D-12 pattern, re-aimed by `63-CONTEXT.md` D-08 at the `bbj-intellij`
zero-test-source-set fact. **Apply to:** `RU-63-03`'s D5 cell states the absence once as
`P63-D5-001`; the other four units' D5 cells record `fail` with a line that cross-references
`P63-D5-001` by ID plus that unit's own specific untested-consequence statement, not a restatement
of the systemic fact.

## No Analog Found

| Item | Reason |
|---|---|
| `### SEC-03 Integrity Posture` (verbatim-titled section) | Does not exist anywhere; built by structural mirroring of `### SEC-01/SEC-02 Surface Handoff` (`62-COVERAGE.md`) and `### SEC-06 Trust Boundary` (`61-COVERAGE.md`) per D-11's four named facts. |
| `### Inherited referral triage` (verbatim-titled section) | Does not exist anywhere — Phase 62 was the first sweep phase and had zero inbound referrals. Built from the existing `### Cross-unit referrals` sentence shape plus D-06's three-way disposition vocabulary; the specific "Phase 61 Plan 06" precedent `63-CONTEXT.md` D-06 cites was not locatable as a distinctly-titled subsection during this pass. |
| `### Cross-phase observations (VS Code side)` (verbatim-titled section) | Does not exist anywhere — no prior phase needed a same-shape record of a VS Code-side observation with no open downstream phase to route it to. Closest register: `62-COVERAGE.md`'s inline D8 "noted but not promoted to a finding" phrasing, relocated to a dedicated close-out subsection. |
| Code-structural analogs for the 61 reviewed `bbj-intellij/*.java` files | Not applicable — READ TARGETS only, never edit targets. Structural fact worth recording for reviewer navigation: the 24 files directly under `com/basis/bbj/intellij/*.java` split 6 (`RU-63-03`: `BbjSettings*.java`, `BbjHomeDetector.java`, `BbjNodeDetector.java`, `BbjNodeDownloader.java`) / 18 (`RU-63-02`: everything else in that directory, e.g. `BbjColorSettingsPage.java`, `BbjFileType.java`, the five notification providers) — a globbed sweep of the directory without applying this split double-counts files across two units and breaks the D-17 file gate. This is a navigation fact, not a proposed edit. |

## Metadata

**Analog search scope:** `.planning/reviews/62-COVERAGE.md` (full read via 2 non-overlapping
targeted ranges: lines 1-345 and 1839-2076), `.planning/reviews/61-COVERAGE.md` (grepped for
section headers + the `### SEC-06 Trust Boundary`/inherited-referral text already extracted inside
`62-PATTERNS.md`, not re-read in full), `.planning/phases/62-.../62-PATTERNS.md` (full read — the
direct predecessor pattern map, reused rather than re-deriving its plan-frontmatter and
finding-ID-allocation extractions from `61-01-PLAN.md`/`61-04-PLAN.md` a second time).
**Files scanned:** 4 (`62-COVERAGE.md`, `61-COVERAGE.md` headers, `62-PATTERNS.md`, `63-CONTEXT.md`).
**`.planning/codebase/*.md` deliberately NOT read** — prohibited by Phase 63 D-19.
**Pattern extraction date:** 2026-08-18
</content>
