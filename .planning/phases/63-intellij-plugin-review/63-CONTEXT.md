# Phase 63: IntelliJ Plugin Review - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning
**Mode:** `--auto` — every gray area below was auto-resolved to its recommended option. See
`63-DISCUSSION-LOG.md` for the per-question audit trail.

<domain>
## Phase Boundary

This phase delivers **one planning artifact and no production code changes**:

`.planning/reviews/63-COVERAGE.md` — Phase 63's slice of INVENTORY.md's applicability grid, filled
in. Concretely: a recorded pass/fail for every `applies` cell across the 5 Phase 63 review units
(`RU-63-01`..`RU-63-05`, **61 Java files, 6,609 LOC** — the whole of
`bbj-intellij/src/main/java/`), every `n/a` reason carried forward verbatim, every finding meeting
its RVW-06 evidence tier and checked against the frozen 15-issue snapshot, the
`BbjNodeDownloader.java` integrity posture that ROADMAP criterion 2 requires, plus the triage of
**7 cross-unit referrals inherited from Phase 62** and **1 routed item** from INVENTORY's D-06
routing table.

**No source file is modified by this phase.** Findings are recorded; Phase 67 is the only phase
that applies fixes, Phase 66 the only one that resolves DEBT items, Phase 65 the only one that
performs the cross-cutting SEC-01/02/04/05 synthesis, and Phase 69 the only one that files GitHub
issues (ISSUE-01 is a hard gate there). Phase 63 does not edit INVENTORY.md (Phase 60 D-09,
immutable), and does not reopen or edit `62-COVERAGE.md` (Phase 62 closed, verification 13/13).

**Phase 63's grid slice, re-derived from INVENTORY at discussion time:**

| Rows | `applies` cells | `n/a` cells | Total |
|---|---|---|---|
| 5 unit rows | 35 | 5 | 40 |

Verified, not asserted:

```bash
awk '/^\| `RU-63-0[1-5]` \|/ {a+=gsub(/applies/,"applies"); n+=gsub(/n\/a/,"n\/a")} END{print a, n, a+n}' .planning/reviews/INVENTORY.md
# → 35 5 40
```

**No file-exception rows exist for this phase.** All 8 file-exception rows in INVENTORY belong to
`RU-61-07`, `RU-64-02` and `RU-64-03`. Any plan that adds one breaks the D-16 gate below.

**What changes relative to Phase 62 — three things, all consequential:**

1. **D6 (Dependency health) is live for the first time in any sweep phase** — exactly one cell,
   `RU-63-03`/D6. Phases 61 and 62 carried `n/a — R-D6-CENTRAL` on every unit.
2. **D7 reverses direction.** Phase 62 read `bbj-intellij/` as the comparison side; Phase 63 reads
   `bbj-vscode/` as the comparison side, and is the *owner* of the IntelliJ rows Phase 62 was
   forbidden to fill.
3. **The `n/a` set is no longer uniform.** Four cells carry `R-D6-CENTRAL` (the `D6` cell of
   `RU-63-01`/`RU-63-04`/`RU-63-05`/`RU-63-02`); the fifth carries **`R-VSCODE-NO-DOWNLOAD`**
   (`RU-63-03`/D7) — a marker no previous phase has carried.

**Per-unit surface, re-counted from the tree during this discussion — every figure matches
INVENTORY exactly, file for file and line for line. Do not re-derive:**

| Unit | Rank | Files | LOC | Location |
|---|---|---|---|---|
| `RU-63-03` Settings & runtime acquisition | 1 | 6 | 1,097 | `com/basis/bbj/intellij/*.java` (6 of 24) |
| `RU-63-01` Run, compile & EM actions | 2 | 11 | 1,260 | `com/basis/bbj/intellij/actions/` |
| `RU-63-04` Composer dialogs & bridge | 3 | 13 | 2,067 | `com/basis/bbj/intellij/composer/` |
| `RU-63-05` LSP wiring, lifecycle & status UI | 4 | 13 | 1,297 | `lsp/` (4) + `ui/` (9) |
| `RU-63-02` Language registration & editor support | 5 | 18 | 888 | `com/basis/bbj/intellij/*.java` (18 of 24) |
| **Total** | | **61** | **6,609** | |

</domain>

<decisions>
## Implementation Decisions

Decision IDs below are **phase-local** (`D-01`..`D-18` of Phase 63). Phase 60's, Phase 61's and
Phase 62's decision sets are separate and already locked — where one is referenced it is written as
`Phase 60 D-NN` / `Phase 61 D-NN` / `Phase 62 D-NN` to avoid collision.

### Sweep Decomposition & Ordering

- **D-01:** Phase 63 is decomposed as **tracer + one plan per review unit = 5 plans**. Plan `63-01`
  creates the full `63-COVERAGE.md` skeleton (header, grid, cell-total gate, the 5 verbatim `n/a`
  carry-forwards under their two distinct markers, the inherited-referral ledger, 5 stubbed unit
  sections) **and** sweeps `RU-63-03` (settings & runtime acquisition, risk rank 1, 6 files /
  1,097 LOC) end to end. Front-loading `RU-63-03` front-loads the phase's **only named security
  requirement (SEC-03)** and its **only live D6 cell** in one plan — the same reasoning that put
  SEC-06 in Phase 61's tracer and SEC-01 in Phase 62's.

- **D-02:** Plan order follows INVENTORY's risk rank:
  `RU-63-03` → `RU-63-01` → `RU-63-04` → `RU-63-05` → `RU-63-02`.

- **D-03:** **No new format checkpoint.** Phase 61's D-05 checkpoint froze the recording shape and
  Phase 62's D-03 confirmed it transfers unchanged across phases; spending a third checkpoint on an
  answered question buys nothing. Phase 63 copies `62-COVERAGE.md`'s shape — the `### Cells` line
  format (`D{n} {name} — pass|fail — <written checks> N findings recorded: <ids>`), the verbatim
  `n/a` carry-forward presentation, the 13-field fenced finding record, and the per-unit sub-blocks
  `### Findings` / `### Not-reproducible dispositions` / `### Cross-unit referrals`. Phase 63 adds
  exactly **three** shape elements, all defined here rather than discovered at a checkpoint:
  `### SEC-03 Integrity Posture` under `RU-63-03` (D-11), `### Inherited referral triage` under each
  unit that owns one (D-06), and `### Cross-phase observations (VS Code side)` in the close-out
  (D-05).
  — **Reversibility:** costly — the skeleton is inherited by 4 downstream plans and by Phase 68's
  DOC-03 concatenation, so it is treated as frozen once `63-01` lands.

- **D-04:** All 5 plans write into the **single** `.planning/reviews/63-COVERAGE.md` mandated by
  INVENTORY's recording protocol (Phase 60 D-09), and the shared-file constraint is enforced **by
  the dependency graph, not by an assumption about the executor**: one wave per plan (waves 1-5),
  each plan's `depends_on` naming its predecessor in D-02's order. Same-wave concurrency would
  corrupt the append. Phase 61 D-03/D-04 → Phase 62 D-04, carried forward unchanged, with the same
  known cost (no intra-phase parallelism).

### D7 Cross-IDE Parity — the reversed direction

- **D-05:** D7 is assessed by **reading `bbj-vscode/` as reference material only** — the exact
  mirror of Phase 62 D-05, with the prohibition pointed the other way:

  - **No `P63-*` finding may carry a `location:` inside `bbj-vscode/`** (explicit `must_haves`
    prohibition). A divergence is *recorded* against the IntelliJ file that is missing or differs;
    the VS Code side is cited in the `evidence:` field as the comparison point.
  - **No coverage cell in `63-COVERAGE.md` covers a `bbj-vscode/` file.** Phase 62 owns those rows
    and has already filled them; a Phase 63 cell claiming them would double-count against
    INVENTORY's 232-cell total.
  - **Where the defect is plainly on the VS Code side**, Phase 63 records nothing as a finding —
    but unlike Phase 62 it has **no open phase to refer to**: Phase 62 is complete and verified
    (13/13), and its coverage file is not reopened. Such an observation is instead written into a
    **`### Cross-phase observations (VS Code side)`** subsection of `63-COVERAGE.md`'s close-out,
    stating the surface, the evidence, and which Phase 62 unit would have owned it. Phase 68 reads
    every coverage file for DOC-03 and Phase 67 reads classifications, so the observation stays
    visible rather than being silently dropped (DOC-04's intent). **Phase 62 is not reopened and
    `62-COVERAGE.md` is not edited.**

  Rationale for not deferring D7 wholesale: INVENTORY's grid marks D7 `applies` on four of five
  Phase 63 unit rows (`RU-63-03` is the exception, `R-VSCODE-NO-DOWNLOAD`). Leaving them unfilled is
  a *visible* coverage gap under Phase 60 D-09 and fails this phase's own D-16 gate.

- **D-06:** **The 7 referrals Phase 62 addressed to `RU-63-*` are inherited work, not optional
  reading.** Each is triaged inside a `### Inherited referral triage` subsection of its owning
  unit's section, and each ends with exactly one of three dispositions:
  (a) **promoted** to a `P63-D7-*` (or other-dimension) finding clearing its evidence tier;
  (b) **dismissed with evidence** — the absence or divergence is a deliberate, documented scope
  decision, with the document or code that establishes it cited; or
  (c) **not-reproducible** — written under the unit's existing `### Not-reproducible dispositions`
  sub-block with its reason. This is Phase 61 Plan 06's worked pattern (4 inherited referrals →
  2 promoted, 1 dismissed with evidence, 1 promoted) applied at phase scale.

  The full inherited ledger, copied from `62-COVERAGE.md` §D Group 2 — **3 to `RU-63-01`, 2 to
  `RU-63-02`, 2 to `RU-63-04`, 0 to `RU-63-03`/`RU-63-05`**:

  | # | Owning unit | Subject |
  |---|---|---|
  | 1 | `RU-63-01` | `BbjCompileAction.java` is an unimplemented `TODO` stub, never invokes `bbjcpl` |
  | 2 | `RU-63-01` | Six VS Code commands (`configureCompileOptions`, `denumber`, `decompile`, `decompileReadonly`, `em`) have no IntelliJ action counterpart |
  | 3 | `RU-63-01` | `bbj.refreshJavaClasses` restarts the whole LS on IntelliJ vs. a targeted LSP request on VS Code (secondary interest to `RU-63-05`) |
  | 4 | `RU-63-04` | SETOPTS has no IntelliJ composer dialog at all (from `RU-62-04`) |
  | 5 | `RU-63-04` | Independent logic/UI-layer confirmation of the same SETOPTS absence (from `RU-62-03`) |
  | 6 | `RU-63-02` | Whether IntelliJ's TextMate importer honors `filenames`; whether LSP4IJ registration independently covers `.bbl` |
  | 7 | `RU-63-02` | None of format / denumber / tokenized-detection / decompile has any IntelliJ counterpart (four features in one bullet); #65 already checked by number as the tokenized-detection dedup neighbour |

  Referrals 4 and 5 describe the **same** absence from two Phase 62 vantage points — they are
  triaged **once**, as a single disposition on `RU-63-04`, with both source referrals named. Merging
  them is the point of the ledger; recording two findings for one absence would double-count.

### Evidence Under a Non-Building Toolchain

- **D-07:** **The Gradle build cannot run in this environment, and no Phase 63 finding may claim a
  runnable reproduction.** Verified during this discussion, not assumed:
  `cd bbj-intellij && ./gradlew --offline -q tasks` fails in 5s with `FAILURE: Build failed with an
  exception. * What went wrong: 25.0.3` — the local JDK is Temurin **25.0.3** while
  `bbj-intellij/build.gradle.kts:12-13` sets `sourceCompatibility`/`targetCompatibility` to
  `JavaVersion.VERSION_17`. It fails before task listing, so compilation, test execution and
  build-driven static analysis are all unavailable.

  Consequence for planning: every D1/D2/D3 finding clears its `repro` tier via INVENTORY 3b's
  **second** branch — *"a line-by-line trace naming the concrete inputs/state and the exact
  `file:line` where behaviour diverges"* — and each record says so in its `evidence_tier:` context
  rather than leaving a reader to wonder why no repro script exists. **A plan that schedules "build
  the plugin and observe" is scheduling a task that cannot complete.** Non-build tooling that does
  work (reading, `grep`, `javac`-free structural analysis, `diff` against `bbj-vscode/`, `gh`) is
  unaffected.

  Restoring a JDK 17 toolchain is **not** Phase 63 work — see `<deferred>`.
  — **Reversibility:** reversible — if a JDK 17 becomes available mid-phase, a plan may add a repro;
  nothing in the recording shape forbids one.

### Test Coverage Under Zero Test Infrastructure

- **D-08:** **`bbj-intellij` has no test source set at all.** Verified during this discussion:
  `ls bbj-intellij/src/` prints only `main`; `build.gradle.kts` declares no test dependency and
  configures no test task (`grep -rn "test" bbj-intellij/build.gradle.kts` → no matches). All five
  D5 cells therefore sit over the same single fact.

  Recording rule: the systemic absence is stated **once**, as `P63-D5-001` allocated against
  `RU-63-03` (rank 1, swept first), with the evidence above. The other four units record D5 as
  `fail` with a line that **cross-references `P63-D5-001` by ID rather than restating it**, plus
  that unit's own specific consequence — which behaviours in *that* unit are consequently untested
  and what a first test would have to cover. This is Phase 62 D-12's two-layer treatment applied to
  D5: one finding, cross-referenced, not five copies of one sentence, and the cells stay genuinely
  filled rather than holed.

- **D-09:** **D-13 test (4) is applied as INVENTORY writes it, with one principled carve-out.**
  INVENTORY 3c test (4) requires a finding be *"regression-testable with the existing harness —
  vitest for TypeScript, **Gradle for the IntelliJ plugin** — with no new test infrastructure."*
  Given D-08, no IntelliJ-side behavioural fix can ship a regression test without adding a test
  source set, which is new test infrastructure by definition. Therefore:

  - **Any finding whose fix changes runtime behaviour fails test (4) and is `major`**, regardless of
    how small the edit is. The six-test log in the record states this explicitly ("test 4: fail —
    no `src/test/` source set exists, D-08") rather than leaving it to be inferred.
  - **A finding whose fix changes no runtime behaviour at all** — a stale comment or Javadoc (D8),
    dead-code or unused-import removal, a duplicated constant with no behavioural consequence (D4) —
    **satisfies test (4) vacuously**: there is no behaviour to regress, so no test infrastructure is
    required. It may be `easy` if the other five tests also pass. The record states which reading
    was applied and why.

  Rationale for the carve-out rather than a blanket `major`: a blanket rule would classify "fix a
  wrong Javadoc" as a major refactor, which is plainly false and would inflate
  `MAJOR-REFACTORS.md`/Phase 69 with textual edits. Rationale for not loosening further: test (6)
  already guarantees no D1 or `critical`/`high` finding reaches Phase 67 unrecorded, and this keeps
  the same guarantee for every behavioural IntelliJ change — which is the one class of fix Phase 67
  genuinely cannot verify in this environment.
  — **Reversibility:** costly — the `easy`/`major` split is consumed directly by Phase 67's apply
  path and Phase 68's two deliverable documents.

### Dependency Health — the one live D6 cell

- **D-10:** `RU-63-03`/D6 is Phase 63's **only** live D6 cell, and it covers exactly two things:

  1. **The pinned Node.js runtime.** `BbjNodeDownloader.java:34` fixes
     `NODE_VERSION = "v20.18.1"`, fetched from `DOWNLOAD_BASE_URL = "https://nodejs.org/dist/"`
     (`:35`). Currency, support status and known advisories for that pin are D6 substance — this is
     a third-party runtime the plugin downloads and then executes, which is precisely why INVENTORY
     marks this row `applies` where every other Phase 63 row carries `R-D6-CENTRAL`.
  2. **The routed D-06 item.** INVENTORY's routing table sends *"`bbj-intellij` Gradle build JDK
     17-vs-25.0.3 toolchain mismatch"* to **Phase 63, D6 (dependency/toolchain health)** — the only
     routed item this phase inherits, and the only D6 cell it has to hold it.

  **The one deliberate location exception in this phase:** item 2's finding carries a `location:` of
  `bbj-intellij/build.gradle.kts:12-13`, a file INVENTORY assigns to `RU-64-02`. It is recorded here
  anyway because INVENTORY's own routing table names Phase 63 as the target phase and Phase 63 has
  exactly one D6 cell. The record states the exception explicitly and its `dedup:` field notes that
  `RU-64-02` owns the file for all other dimensions, so Phase 64 re-triages rather than re-reports.
  Everything else about Gradle, IntelliJ-Platform (`2024.2`) and LSP4IJ (`0.19.0`) dependency
  versions stays with `RU-64-02`/SEC-08 — Phase 63 does not run a second dependency audit.

  Per Phase 61 D-14's precedent, a routed item is recorded with full evidence by the sweep phase and
  re-triaged (not re-derived) by whichever later phase owns its resolution.

### Security Boundary — SEC-03 is owned here, SEC-04/SEC-05 are bounded

- **D-11:** **SEC-03 is Phase 63's own requirement and is discharged here in full — not deferred to
  Phase 65.** Phase 65 owns SEC-01/SEC-02/SEC-04/SEC-05 only; SEC-03 appears in ROADMAP's Phase 63
  Requirements line and in criterion 2. It is recorded as a narrative
  **`### SEC-03 Integrity Posture`** subsection inside `RU-63-03`'s part of `63-COVERAGE.md`,
  structurally mirroring Phase 61's `### SEC-06 Trust Boundary` and Phase 62's
  `### SEC-01/SEC-02 Surface Handoff`.

  It states as *facts*, not findings, the four things ROADMAP criterion 2 names — transport
  security, checksum-or-signature verification, archive extraction path safety (zip-slip), and cache
  trust — against the actual code. The structural landmarks located during this discussion, to give
  the sweep its starting points and nothing more:
  `BbjNodeDownloader.java:34-35` (pinned version + base URL), `:102-115` (filename/URL construction,
  `Files.createTempFile`, `request.saveToFile`), `:137-159` (extracted-binary path resolution,
  `setExecutable(true)`, temp cleanup), `:169-176` (`ZipInputStream` entry loop and
  `destDir.resolve(...)`), `:244` (cache at
  `PathManager.getPluginsPath()/bbj-intellij-data/nodejs`), and `:50` (the cache-hit path taken on
  every subsequent launch). **Nothing here is asserted as a defect** — the file was grepped for
  structure during this discussion, never read for verdicts. Discrete `P63-D1-*` records are
  allocated only where a concrete evidence-clearing defect exists.

- **D-12:** For **SEC-04 (EM token lifecycle)** and **SEC-05 (process spawning)**, **Phase 63
  records concrete findings on its own files; Phase 65 does the cross-cutting synthesis** — Phase 62
  D-07 carried forward verbatim, re-aimed. `RU-63-01`'s D1 cell is filled with real `file:line`
  findings against `BbjEMTokenStore.java`, `BbjEMLoginAction.java`, `BbjRunActionBase.java` and the
  three run subclasses, not deferred with "see Phase 65". Phase 65 then adds only what a per-unit
  sweep structurally cannot produce: the EM token lifecycle stated once across
  `BbjEMTokenStore.java` + `em-login.bbj` + `em-validate-token.bbj`, and the process-spawning
  picture across **both** IDEs (where Phase 62's `P62-D7-001` already established the categorical
  `GeneralCommandLine.addParameter()`-vs-`child_process.exec()` divergence from the VS Code side).
  A D1 cell filled with a pointer instead of a verdict is the hole T-60-06 exists to prevent.

- **D-13:** Public-repo disclosure inherits the **two-tier rule verbatim** (Phase 61 D-12 → Phase 62
  D-09), with the rationale tightened again rather than loosened:
  - **`critical`/`high` D1 findings:** the committed record names the surface, the problem class and
    the impact. **No trigger sequence, no payload, no proof-of-concept.** The evidence is still
    produced; the record states that it exists and what it establishes. Phase 69 decides disclosure
    at filing time.
  - **Everything else** (all D2-D8 findings, and D1 findings rated `medium`/`low`): full concrete
    detail per the finding standard as written.

  Why it tightens here: Phase 61 could argue `java-interop` binds `localhost:5008` so a malicious
  peer already implies local access; Phase 62 dealt with values a developer types into their own
  webview. Neither mitigation transfers. A runtime-download integrity gap concerns **an executable
  binary the plugin fetches over the network and then runs**, and its cache directory is trusted on
  every subsequent launch. This repository is public and any such gap would be unfixed at commit
  time — so the redaction tier is applied strictly, as a live constraint rather than a formality.

### What a Recorded Cell Must Contain

- **D-14:** A no-finding `applies` cell records **`pass` plus a written line naming the concrete
  checks applied**, phrased against that dimension's "what counts as a finding" wording in
  REQUIREMENTS.md. Phase 61 D-06 → Phase 62 D-10, carried forward unchanged — including its
  rejection of a bare `pass` (weaker evidence than an `n/a` exclusion) and its rejection of
  per-check `file:line` anchors (roughly doubles recording cost for auditability DOC-03 does not
  consume).

- **D-15:** Within each unit's plan, the live dimensions **split by evidence tier into 2 tasks**,
  following INVENTORY 3b:
  - **Task A — tier `repro`, satisfied by trace per D-07:** D1, D2, D3, **D7** — plus **D6 on
    `RU-63-03` only**, because a version/advisory claim is repro-equivalent under 3b (it needs the
    advisory reference). So `RU-63-03`'s Task A carries **5** dimensions (D1, D2, D3, D6 — D7 is
    `n/a` there) and every other unit's carries **4**.
  - **Task B — tier `trace`:** D4, D5, D8.

  Each task's `acceptance_criteria` enumerate its dimensions **by name**, so no dimension can be
  silently absorbed by whichever one is loudest. Note the asymmetry: `RU-63-03` is the only unit
  whose Task A includes D6 and excludes D7; a template assuming a uniform 4/3 split is wrong.

### Scope Fidelity & Completion Gates

- **D-16:** **The grid is the contract; the ROADMAP success criteria are a subset of it.** ROADMAP
  criterion 1 names a partial file list ("`BbjRunActionBase.java` and its GUI/BUI/DWC subclasses,
  `BbjSettingsComponent.java`, composer dialogs, `BbjNodeDownloader.java`, `BbjEMTokenStore.java`,
  LSP wiring, status bar widgets, lexer/parser definitions"). **All 61 files are swept regardless**,
  and the close-out states explicitly which surfaces were covered beyond the criteria's naming —
  among them the five notification providers (`BbjJavaInteropNotificationProvider.java`,
  `BbjMissingHomeNotificationProvider.java`, `BbjMissingNodeNotificationProvider.java`,
  `BbjServerCrashNotificationProvider.java`, `BbjWelcomeNotification.java`),
  `BbjColorSettingsPage.java`, `BbjSpellcheckingStrategy.java`, `BbjTextMateBundleProvider.java`,
  `BbjCommenter.java`, and the composer bridge (`BbjComposerServer.java`,
  `BbjComposerService.java`, `ComposerLauncher.java`, `ComposerModels.java`, the three
  `Configure*Intention.java` files and the three `*SchematicPanel.java` files) — so a reader sees
  the extra coverage as deliberate, exactly as Phase 62 D-13 did for `RU-62-05`/`Commands.cjs`.

  **`plugin.xml` (247 lines) is read as context, never as a cell.** INVENTORY's `bbj-intellij/`
  breakdown excludes `src/main/resources/` with one cross-reference: `plugin.xml`'s extension-point
  declarations are the manifest counterpart to `RU-63-02`'s Java registration classes and are *read
  as context when reviewing that unit, not as a separate finding surface*. **No cell covers it and
  no `P63-*` finding may be located in it** — the same shape as `bbj-vscode/`'s D-05 prohibition.

- **D-17:** Phase completion carries **three hard, countable gates**:
  1. **Cell gate:** `63-COVERAGE.md` contains every cell in INVENTORY's Phase 63 slice, with the
     expected totals stated (**35 `applies`, 5 `n/a`, 40 total**) *and* re-derived from INVENTORY at
     verification time via the awk pass in `<domain>` above. If the derivation disagrees with the
     stated totals, **that disagreement is itself a defect to surface**, not a number to adopt.
  2. **File gate:** all **61** in-scope files are enumerated from the tree — not from a list typed
     into a plan — and each basename is confirmed present somewhere in `63-COVERAGE.md`:
     ```bash
     find bbj-intellij/src/main/java -name '*.java' | wc -l   # → 61
     ```
  3. **Referral gate:** all **7** inherited Phase 62 referrals (D-06's ledger) and the **1** routed
     D-06 item (D-10) carry a written disposition. Zero may be silently dropped — this is the gate
     Phase 62 could not have and the one this phase is most likely to under-serve, because inherited
     work is easier to skip than a blank cell.

  Gates 1 and 2 were both run during this discussion and both agree with INVENTORY. The plan
  re-runs them, it does not restate them.

- **D-18:** The sweep reads **HEAD of `v4.0-stability-and-quality`, with the exact SHA recorded once
  in `63-COVERAGE.md`** by plan `63-01` at execution time (Phase 61 D-15 → Phase 62 D-15). The SHA
  is *not* pinned in this document: HEAD at discussion time was
  `4103f0889b7f2bc27792fbe52b0d70609ab50fe1` (`docs(62): complete phase — verification passed`) and
  advances with every v4.0 planning commit, including the one that commits this file. INVENTORY's
  pinned `2194616..v0.12.0` range keeps its original job — history reconstruction, not review
  targeting.

- **D-19:** **`.planning/codebase/*.md` is not to be read during this sweep** (Phase 61 D-16 →
  Phase 62 D-16, carried forward with its strongest justification yet). All seven maps are dated
  2026-02-01 and, in INVENTORY's own words, **"predate `bbj-intellij/` entirely"** — for *this*
  phase they are not merely stale but blank on the entire subject matter. `CONCERNS.md` carries the
  highest re-report risk. INVENTORY supersedes them on scope, structure and counts (Phase 60 D-16).

### Claude's Discretion

- The per-unit stopping rule beyond cell coverage. Phase 62's rendered three-part rule (every live
  cell has a verdict + written checks; every file in the unit named at least once inside its own
  section; every candidate claim either promoted or written under `not-reproducible`) is the obvious
  carry-forward, extended by D-06's referral disposition — the planner confirms or adjusts it.
- Whether `RU-63-02`'s 18 files justify grouping into sub-clusters within one plan (registration /
  PSI-lexer plumbing / notification providers) or a flat file-by-file pass — it is the largest file
  count in the phase at the smallest average LOC.
- The read depth for `ComposerModels.java` (245 lines of DTOs whose own doc comment declares the
  TypeScript side the single source of truth) — full read versus structural comparison against the
  VS Code param/result shapes.
- Whether referral #3 (`bbj.refreshJavaClasses` restart-vs-targeted-request) is dispositioned under
  `RU-63-01` (where `BbjRefreshJavaClassesAction.java` lives) or `RU-63-05` (where
  `BbjServerService.restart()` lives); Phase 62 flagged it as "secondary interest to `RU-63-05`".
  Location-decides-ownership points at `RU-63-01`; the planner confirms.
- How far to pursue the LSP4IJ experimental-API question for DEBT-05. Note the count basis: there
  are **zero** `@ApiStatus.Experimental` annotations in this repository's own source
  (`grep -rn "ApiStatus.Experimental\|@Experimental" bbj-intellij/src/main/java` → 0) and **20**
  `com.redhat.devtools.lsp4ij` references across **10** files — PROJECT.md's "19 experimental API
  usages" counts usages of APIs marked experimental *in LSP4IJ*, which is not greppable from here.
  Resolving that number is `RU-63-05`'s D4/D5 work; Phase 66 owns the re-triage.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone contract — authoritative, read first

- `.planning/reviews/INVENTORY.md` — **the single immutable contract for this phase.** Read in full.
  Specifically: §"Phase 63 review units (`bbj-intellij/`, RVW-04, SEC-03) — 5 units, 61 Java files"
  (lines 539-681: the ranking basis and the five unit blocks with files, LOC and risk ranks),
  §"Applicability Grid" (the 5 `RU-63-*` rows), §"Exclusion reasons" → **R-D6-CENTRAL** (4 cells
  here) and **R-VSCODE-NO-DOWNLOAD** (1 cell, `RU-63-03`/D7 — a marker no earlier phase carried),
  §"Finding Standard" 3a-3d (IDs, evidence tiers, the six easy-vs-major tests, severity/effort),
  §"Finding Record Template" (13 fields), §"Frozen Open-Issue Snapshot" (the 15-issue dedup list —
  **#65**, **#231**, **#381**, **#385**, **#410**, **#476**, **#485** are the Phase 63-plausible
  neighbours), §"Recording protocol (D-09)", §"Surface Accounting" → the `bbj-intellij/` breakdown
  (the `src/main/resources/` exclusion with its `plugin.xml` cross-reference), §"Test & Build
  Baseline" → `### bbj-intellij/./gradlew build` (the JDK mismatch, classified `environment`), and
  §"Routing table (D-06)" — **one row targets Phase 63**.
- `.planning/REQUIREMENTS.md` — the D1-D8 dimensions table with each dimension's "what counts as a
  finding" wording (D-14 requires pass lines phrased against it), RVW-04, RVW-06, RVW-07, SEC-03
  (owned here), SEC-04/SEC-05 (Phase 65's, bounded by D-12), DEBT-05 (Phase 66's LSP4IJ re-triage),
  and the Out of Scope table.
- `.planning/ROADMAP.md` §"Phase 63: IntelliJ Plugin Review" (lines 354-380) — the four success
  criteria this phase is verified against. Criterion 2 explicitly requires the
  `BbjNodeDownloader.java` integrity posture (satisfied by D-11); criterion 1's file list is a
  subset of the 61 (handled by D-16).
- `.planning/phases/60-baseline-resync-review-standards/60-CONTEXT.md` — Phase 60's `D-01`..`D-17`,
  inherited and not to be re-litigated.
- `.planning/phases/61-language-core-review/61-CONTEXT.md` — Phase 61's `D-01`..`D-17`. Carried
  forward here: D-03/D-04 (shared-file write contract), D-06 (written pass lines), D-12
  (disclosure), D-13 (read-as-reference boundary, re-aimed at `bbj-vscode/`), D-14 (routed-item
  handling: record here, resolve later), D-15 (swept tree), D-16 (codebase-maps prohibition),
  D-17 (countable gate).
- `.planning/phases/62-extension-host-webview-composer-review/62-CONTEXT.md` — Phase 62's
  `D-01`..`D-16`. Carried forward here: D-03 (no new format checkpoint), D-05 (the D7 location
  boundary, now mirrored), D-07 (security boundary against Phase 65), D-09 (disclosure), D-12
  (one finding cross-referenced, not restated per layer — applied to D5 by D-08), D-13 (grid-is-
  the-contract), D-14 (countable gates).

### Inherited work — read before planning any unit

- `.planning/reviews/62-COVERAGE.md` §"D. Cross-unit referral accounting" → **Group 2's 7-row
  table** — the referral ledger D-06 reproduces. Then read each referral's full text at its source:
  `RU-62-04`'s `### Cross-unit referrals` (SETOPTS absence), `RU-62-01`'s (compile stub, six missing
  commands, refreshJavaClasses), `RU-62-03`'s (SETOPTS logic/UI-layer confirmation), `RU-62-05`'s
  (TextMate `filenames` honoring, `.bbl` registration), `RU-62-02`'s (format/denumber/tokenized/
  decompile). The full text carries the commands Phase 62 already ran and their outputs — Phase 63
  should not re-derive them.
- `.planning/reviews/62-COVERAGE.md` `## RU-62-01` §D7 cell and finding `P62-D7-001` — establishes
  the `GeneralCommandLine.addParameter()`-vs-`child_process.exec()` spawning divergence **from the
  VS Code side**, with IntelliJ line anchors already located (`BbjRunActionBase.java:144-169`,
  `:282-322`, `BbjRunGuiAction.java:27-52`, `BbjRunBuiAction.java:115-129`,
  `BbjRunDwcAction.java:115-129`, `BbjEMLoginAction.java:94-152`). `RU-63-01`'s D1/D7 cells start
  here rather than from zero.
- `.planning/reviews/62-COVERAGE.md` `## RU-62-05` §D7 cell — the four-file byte-identical
  `copyTextMateBundle` diff, the `BbjTextMateBundleProvider.java:17-23` `BUNDLE_FILES` list
  (including its hand-authored fifth file), and the confirmation that #381 is fixed symmetrically.
  `RU-63-02`'s D7 cell starts here.

### Worked precedent — the shape to copy, not to re-invent

- `.planning/reviews/62-COVERAGE.md` — **the frozen recording shape (D-03).** Read its header,
  §"Applicability Grid — Phase 62 slice", §"D-14 Cell-Total Gate", §"Stopping Rule & Write
  Contract", §"Exclusion reasons carried forward", the whole of `## RU-62-04` (the reference
  rendering, including `### SEC-01/SEC-02 Surface Handoff` which `### SEC-03 Integrity Posture`
  mirrors), and `## Phase 62 Close-Out` sections A-G (the gate, accounting and criteria-answering
  pattern D-17 reuses).
- `.planning/reviews/61-COVERAGE.md` `## RU-61-06` — the original approved rendering and
  `### SEC-06 Trust Boundary`, if a second worked example of the narrative security subsection is
  wanted.

### Artifacts this phase creates

- `.planning/reviews/63-COVERAGE.md` — **does not yet exist.** The phase's sole deliverable.
  Created by plan `63-01` (skeleton + `RU-63-03`), appended by `63-02`..`63-05`.

### Code under review (5 units, 61 files / 6,609 LOC — all under `bbj-intellij/src/main/java/com/basis/bbj/intellij/`)

- **`RU-63-03`, rank 1, 6 files / 1,097 LOC** — `BbjSettings.java` (152),
  `BbjSettingsComponent.java` (333), `BbjSettingsConfigurable.java` (161), `BbjHomeDetector.java`
  (91), `BbjNodeDetector.java` (70), `BbjNodeDownloader.java` (290). The entire SEC-03 surface and
  the phase's only live D6 cell.
- **`RU-63-01`, rank 2, 11 files / 1,260 LOC** — `actions/BbjRunActionBase.java` (423),
  `BbjEMLoginAction.java` (169), `BbjRunBuiAction.java` (142), `BbjRunDwcAction.java` (142),
  `BbjEMTokenStore.java` (89), `BbjCompileAction.java` (71), `BbjRunGuiAction.java` (62),
  `BbjRefreshJavaClassesAction.java` (48), `BbjComposeAddChildWindowAction.java` (38),
  `BbjComposeAddWindowAction.java` (38), `BbjComposeMsgboxAction.java` (38).
- **`RU-63-04`, rank 3, 13 files / 2,067 LOC** (largest by LOC) —
  `composer/AddChildWindowComposerDialog.java` (315), `AddWindowComposerDialog.java` (306),
  `MsgboxComposerDialog.java` (273), `ComposerModels.java` (245), `ComposerLauncher.java` (224),
  `MsgboxSchematicPanel.java` (180), `ChildWindowSchematicPanel.java` (159),
  `WindowSchematicPanel.java` (132), `BbjComposerServer.java` (54),
  `ConfigureAddChildWindowIntention.java` (50), `ConfigureAddWindowIntention.java` (50),
  `ConfigureMsgboxIntention.java` (49), `BbjComposerService.java` (30).
- **`RU-63-05`, rank 4, 13 files / 1,297 LOC** — `ui/BbjServerService.java` (244),
  `ui/BbjJavaInteropService.java` (206), `ui/BbjStatusBarWidget.java` (167),
  `ui/BbjJavaInteropStatusBarWidget.java` (151), `lsp/BbjLanguageServer.java` (97),
  `lsp/BbjCompletionFeature.java` (77), `lsp/BbjLanguageServerFactory.java` (66),
  `ui/BbjServerCrashNotificationProvider.java` (63), `lsp/BbjLanguageClient.java` (50),
  `ui/BbjServerLogToolWindowFactory.java` (47), `ui/BbjJavaInteropStatusBarWidgetFactory.java` (43),
  `ui/BbjRestartServerAction.java` (43), `ui/BbjStatusBarWidgetFactory.java` (43).
- **`RU-63-02`, rank 5, 18 files / 888 LOC** — `BbjColorSettingsPage.java` (157),
  `BbjWordLexer.java` (105), `BbjParserDefinition.java` (79),
  `BbjMissingNodeNotificationProvider.java` (76), `BbjWelcomeNotification.java` (63),
  `BbjJavaInteropNotificationProvider.java` (57), `BbjMissingHomeNotificationProvider.java` (55),
  `BbjTextMateBundleProvider.java` (49), `BbjPairedBraceMatcher.java` (39), `BbjCommenter.java` (36),
  `BbjFileType.java` (36), `BbjLanguageCodeStyleSettingsProvider.java` (31),
  `BbjTokenTypes.java` (23), `BbjFile.java` (21), `BbjIcons.java` (19),
  `BbjSpellcheckingStrategy.java` (16), `BbjPsiElement.java` (15), `BbjLanguage.java` (11).

Per-file LOC above is INVENTORY's; the five **unit totals** and the 61-file count were re-derived
from the tree during this discussion and match INVENTORY exactly. Do not re-derive.

- `bbj-vscode/` — **reference reading only (D-05).** Establishes the comparison side for every D7
  cell. **No `P63-*` finding may be located here.** Its review is complete (`RVW-02`/`RVW-03`,
  Phase 62).
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (247 lines) — **context only for `RU-63-02`
  (D-16).** No cell, no finding location.

### Code-truth references

- `bbj-intellij/build.gradle.kts` — the toolchain declaration (`:12-13`,
  `JavaVersion.VERSION_17`) behind D-07 and D-10's routed item; the dependency block
  (`intellijIdeaCommunity("2024.2")`, `bundledPlugin("org.jetbrains.plugins.textmate")`,
  `plugin("com.redhat.devtools.lsp4ij:0.19.0")`); the three `copy*` tasks that stitch the VS Code
  side into the plugin (`copyTextMateBundle`, `copyLanguageServer`, `copyWebRunner`) and
  `prepareSandbox` — the concrete mechanism behind every D7 claim about shared assets. **Read as
  context; `RU-64-02` owns it for every dimension except D-10's routed D6 item.**
- `CLAUDE.md` (repo root) — the IDE-integration section (both IDEs consume
  `out/language/main.cjs`; the IntelliJ plugin bundles the compiled LS and the TextMate grammar and
  connects via LSP4IJ). Doubles as a **D8 target**: its claims about `bbj-intellij/` are checkable
  against the code Phase 63 is reading — a candidate D8 check, not an asserted finding.
- `.planning/PROJECT.md` §"Known tech debt" — the two IntelliJ-specific entries (19 LSP4IJ
  experimental API usages; `BbjCompletionFeature` LSPCompletionFeature coupling; the TextMate bundle
  filename-exclusion limitation) that `RU-63-05`/`RU-63-02` will meet. DEBT-05 owns their
  re-triage in Phase 66 — Phase 63 records, Phase 66 resolves (Phase 61 D-14's pattern).

### Explicitly NOT to be read (D-19)

- `.planning/codebase/ARCHITECTURE.md`, `CONCERNS.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`,
  `STACK.md`, `STRUCTURE.md`, `TESTING.md` — all dated 2026-02-01, all superseded by INVENTORY.md
  per Phase 60 D-16, and all predating `bbj-intellij/` **entirely**, which INVENTORY states in its
  own §"Re-report risk". Prohibited for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **INVENTORY.md has already done the scoping work.** Unit boundaries, per-file LOC, risk ranks,
  dimension applicability, the 5 `n/a` reasons under two markers, the finding template, the dedup
  snapshot, and the one routed item all exist. Phase 63 reads them; it does not re-derive them.
- **Phase 62 already answered the format question and did reconnaissance inside `bbj-intellij/`.**
  `62-COVERAGE.md` is 2,077 lines of worked, approved precedent, and — because D7 was live for all
  five of its units — it already contains **line-anchored observations inside the IntelliJ tree**:
  the spawning methodology comparison, the composer LSP-sharing analysis, the TextMate bundle diff,
  and the four-feature editor-support absence. Seven of those became referrals D-06 now inherits.
  Phase 63 starts from those anchors instead of from an empty tree.
- **`gh` CLI is authenticated** in this environment (account `StephanWald`), though Phase 63 does
  not need it: dedup runs against INVENTORY's frozen 15-issue snapshot, and Phase 69 re-queries live.

### Established Patterns

- **Finding IDs `P63-D{dimension}-{seq}`**, zero-padded to three digits, allocated monotonically in
  discovery order within each `(63, dimension)` pair. Phase 63 owns the `P63-*` namespace outright —
  no collision with the concurrent Phase 64 sweep is possible (INVENTORY 3a).
- **The plugin is a single-module Gradle/IntelliJ-Platform project with no test source set.**
  `ls bbj-intellij/src/` → `main` only. This is the single most consequential structural fact in the
  phase (D-08, D-09) and it is not visible from INVENTORY, which never states it.
- **The Gradle build does not run in this environment.** Verified: `./gradlew --offline -q tasks`
  → `BUILD FAILED ... * What went wrong: 25.0.3` in 5s. INVENTORY's Test & Build Baseline recorded
  the same failure and classified it `environment`, not a code defect — the target (`17`) is correct;
  the local toolchain (Temurin 25.0.3) simply does not offer a matching JDK (D-07).
- **The unit boundary inside `com/basis/bbj/intellij/*.java` is a 24-file directory split 6/18.**
  `RU-63-03` claims exactly the six settings/detection/download files; `RU-63-02` claims the other
  eighteen. Both were counted from the tree during this discussion (`24 = 6 + 18`). A plan that
  globs the directory without applying the split will double-count files across two units and break
  the D-17 file gate.
- **`BbjEMTokenStore.java` stores the EM JWT via IntelliJ's `PasswordSafe`/`CredentialAttributes`
  (OS-native keychain), not in plaintext settings** — structurally located during this discussion at
  `:3-6`, `:25-46`, with an `exp`-claim expiry decoder at `:50`. What that storage and expiry
  handling actually guarantee is `RU-63-01`'s D1 work and Phase 65's SEC-04 synthesis; **nothing is
  asserted here.**
- **20 `com.redhat.devtools.lsp4ij` references across 10 files; zero `@ApiStatus.Experimental`
  annotations in this repository's own source.** The DEBT-05 "19 experimental API usages" figure
  counts LSP4IJ-side annotations, which cannot be grepped from this tree — see Claude's Discretion.

### Integration Points

- **Phase 65** consumes `RU-63-01`'s D1 records and `RU-63-03`'s `### SEC-03 Integrity Posture` as
  the IntelliJ half of its SEC-04/SEC-05 synthesis (SEC-03 itself closes here). **Phase 66**
  re-triages any finding whose `dedup:` names a `DEBT-*` requirement — DEBT-05 is the likely hit on
  `RU-63-05`. **Phase 67** consumes `classification: easy|major`, which D-09 makes predominantly
  `major` for this phase. **Phase 68** concatenates `63-COVERAGE.md` with the other coverage files
  against INVENTORY's grid for DOC-03, and reads D-05's `### Cross-phase observations` subsection.
  **Phase 69** files issues, gated on ISSUE-01.
- **v4.0 work lives on `v4.0-stability-and-quality`**; HEAD at discussion time was
  `4103f0889b7f2bc27792fbe52b0d70609ab50fe1` (`docs(62): complete phase — verification passed`).
  Per D-18 the sweep SHA is recorded by `63-01` at execution time, not pinned here.
- **Phases 63 and 64 may still run concurrently** (INVENTORY §"Status & Authority"; Phases 61 and 62
  are complete). D-04 makes Phase 63 self-contained within itself, and Phase 60 D-09 guarantees no
  cross-phase file collision — each phase writes only its own `{NN}-COVERAGE.md`. D-10's location
  exception is the one place Phase 63 and Phase 64 touch the same file, and it is bounded to a
  single dimension with the overlap stated in the record.

</code_context>

<specifics>
## Specific Ideas

- A `pass` cell should read like INVENTORY's `n/a` reasons: a written sentence testing the dimension
  against its own definition, never a mechanical or generic line.
- The D7 cells are the ones most likely to be filled thinly in *both* directions — Phase 62 already
  warned that filling them honestly costs a trip into the other IDE's tree. Here the inherited
  referral ledger (D-06) makes thinness structurally visible: an untriaged referral is countable.
- `### SEC-03 Integrity Posture` should read like a map, not a defect list — the same register as
  `### SEC-06 Trust Boundary` and `### SEC-01/SEC-02 Surface Handoff`. "There is no checksum" is a
  fact to state; it becomes a finding only when the record says what it enables.
- For an unfixed `critical`/`high` D1 finding on the runtime-download path in a public repo: name
  the surface and the problem class, confirm the evidence exists and say what it establishes — but
  do not publish the sequence or the payload.
- Every finding record in this phase should say, in one clause, why it carries no runnable
  reproduction (D-07). Silence there reads as laziness; a stated environment constraint reads as
  method.
- The close-out should state plainly that all 61 files were swept despite ROADMAP criterion 1 naming
  only a subset, so the extra coverage reads as deliberate.
- All three D-17 gates were run or established during this discussion (`35 5 40`; `61`; the 7+1
  referral/routing ledger) — the plan should re-run them, not restate them.

</specifics>

<deferred>
## Deferred Ideas

- **Installing or configuring a JDK 17 toolchain so `./gradlew build` runs.** Real, and it blocks
  more than this phase — FIX-03 in Phase 67 requires `./gradlew build` to succeed. But it is
  environment work, not review work, and D-07 makes the phase deliverable without it. Recorded here
  so it is not mistaken for an oversight; it belongs to Phase 67's own setup or to a quick task.
- **Adding a `src/test/` source set to `bbj-intellij`.** This is the fix for `P63-D5-001`, not part
  of the sweep — and by D-09 it is a `major` refactor by definition (new test infrastructure).
  Phase 68/69 path.
- **Reviewing `bbj-vscode/`** — complete (`RVW-02`/`RVW-03`, Phase 62). D-05 permits reading it as
  the D7 comparison side; it does not reopen it for review or finding allocation.
- **Reopening or editing `62-COVERAGE.md`** to record a VS Code-side observation found now. Not
  done — D-05 routes those to Phase 63's own close-out subsection instead. Phase 62 is verified and
  closed.
- **`bbj-intellij/src/main/resources/`** — icons, the TextMate bundle's `package.json`, and
  `META-INF/` assets remain an INVENTORY exclusion; `plugin.xml` is read as context only (D-16).
- **Re-auditing Gradle/IntelliJ-Platform/LSP4IJ dependency versions** — `RU-64-02`/SEC-08 in
  Phase 64. D-10 bounds Phase 63's single D6 cell to the Node.js pin plus the one routed toolchain
  item.
- **Fixing anything found** — Phase 67 (`easy`) and the `MAJOR-REFACTORS.md` path (Phase 68 → 69).
  Phase 63 records and classifies only, including the SEC-03 surface however it reads.
- **Resolving DEBT-05** (LSP4IJ experimental-API exposure and `BbjCompletionFeature` coupling) —
  Phase 66. Phase 63 records it with evidence and names DEBT-05 in the finding's `dedup:` field.
- **Regenerating the seven `.planning/codebase/*.md` maps** — deferred by Phase 60 D-16; D-19 here
  goes further and prohibits reading them.

</deferred>

---

*Phase: 63-IntelliJ Plugin Review*
*Context gathered: 2026-08-18*
