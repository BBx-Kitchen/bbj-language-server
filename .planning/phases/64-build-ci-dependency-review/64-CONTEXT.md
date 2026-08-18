# Phase 64: Build, CI & Dependency Review - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning
**Mode:** `--auto` — every gray area below was auto-resolved to its recommended option. See
`64-DISCUSSION-LOG.md` for the per-question audit trail.

<domain>
## Phase Boundary

This phase delivers **one planning artifact and no production code changes**:

`.planning/reviews/64-COVERAGE.md` — Phase 64's slice of INVENTORY.md's applicability grid, filled
in. Concretely: a recorded pass/fail for every `applies` cell across the 3 Phase 64 review units
(`RU-64-01`..`RU-64-03`, **29 files — 25 readable totalling 11,035 LOC, plus 4 vendored binary
JARs totalling 155,944 bytes**; two of the 29 are adopted because they exist in the tree but are
absent from INVENTORY's file lists — `.github/dependabot.yml` into `RU-64-01` by D-19, and
`bbj-intellij/gradle/wrapper/gradle-wrapper.jar` into `RU-64-02` by D-20), every `n/a` reason
carried forward verbatim, every finding meeting
its RVW-06 evidence tier and checked against the frozen 15-issue snapshot, the SEC-07 workflow
security write-up and the SEC-08 dependency triage that ROADMAP criteria 2 and 3 require, plus the
re-triage of **1 routed item inherited from Phase 63** (`P63-D6-002`).

**No source file is modified by this phase.** Findings are recorded; Phase 67 is the only phase
that applies fixes, Phase 66 the only one that resolves DEBT items, Phase 65 the only one that
performs the cross-cutting SEC-01/02/04/05 synthesis, and Phase 69 the only one that files GitHub
issues (ISSUE-01 is a hard gate there). Phase 64 does not edit INVENTORY.md (Phase 60 D-09,
immutable), and does not reopen `61-COVERAGE.md`, `62-COVERAGE.md` or `63-COVERAGE.md` — all three
phases are closed.

**This is the last sweep phase.** After Phase 64 closes, every `applies` cell in INVENTORY's grid
except `RU-D8-01`'s single D8 cell has been recorded. That makes the completion gates here
load-bearing in a way they were not in Phases 61-63: a cell missed at 64 is a permanent hole in
the milestone's coverage statement, because there is no fifth sweep phase to catch it.

**Phase 64's grid slice, re-derived from INVENTORY at discussion time:**

| Rows | `applies` cells | `n/a` cells | Total |
|---|---|---|---|
| 3 unit rows | 20 | 4 | 24 |
| 5 file-exception rows | 9 | 31 | 40 |
| **Total** | **29** | **35** | **64** |

The fifth file-exception row is `gradle-wrapper.jar`, adopted by **D-20**; the four INVENTORY
names contribute 7 applies / 25 n/a / 32 cells, and D-20's row adds 2 / 6 / 8.

Derivation, verified against INVENTORY's grid rather than asserted:

- `RU-64-03` — D7 `n/a — R-D7-CI` → 7 applies / 1 n/a
- `RU-64-01` — D5 `n/a — R-D5-CI`, D7 `n/a — R-D7-CI` → 6 applies / 2 n/a
- `RU-64-02` — D7 `n/a — R-D7-CI` → 7 applies / 1 n/a
- `bbj-vscode/package-lock.json` (parent `RU-64-02`) — D6 only → 1 applies / 7 n/a
- `tools/formatter/BBjCFCli.jar` (parent `RU-64-03`) — D1 + D6 → 2 applies / 6 n/a
- `tools/formatter/lib/BBjCodeFomatter.jar` (parent `RU-64-03`) — D1 + D6 → 2 applies / 6 n/a
- `tools/formatter/lib/jcommander-1.71.jar` (parent `RU-64-03`) — D1 + D6 → 2 applies / 6 n/a
- `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` (parent `RU-64-02`, **adopted by D-20**) —
  D1 + D6 → 2 applies / 6 n/a

**Phase 64 is the first and only sweep phase that owns file-exception rows in a live capacity.**
Phase 61 owned the four `lib/*.bbl` rows; Phase 62 and Phase 63 owned none. All four remaining
file-exception rows in INVENTORY — the lockfile and the three `tools/formatter/` JARs — belong to
Phase 64 units, and D-20 adds a fifth. Omitting them is the single most likely way this phase
silently under-counts (D-18).

**Two structural firsts relative to Phases 61-63:**

1. **D7 is dead across the entire phase.** All three unit rows and all four JAR rows carry
   `n/a — R-D7-CI`. No Phase 64 plan performs cross-IDE parity work of any kind.
2. **D6 is live in bulk for the first time.** Phase 63 had exactly one live D6 cell
   (`RU-63-03`/D6). Phase 64 has **eight** — three unit rows plus all five file-exception rows —
   and they carry the whole of SEC-08.

</domain>

<decisions>
## Implementation Decisions

Decision IDs below are **phase-local** (`D-01`..`D-20` of Phase 64). Phase 60's, Phase 61's,
Phase 62's and Phase 63's `D-nn` IDs are separate namespaces; where one is meant it is written as
"Phase 6N D-nn".

### Sweep Decomposition & Ordering

- **D-01:** Phase 64 is decomposed as **one plan per review unit = 3 plans**, with the tracer
  responsibility folded into plan `64-01` rather than given a plan of its own. Phase 63 used
  tracer + one-per-unit = 5 plans for 5 units; with only 3 units here, a standalone tracer plan
  would produce a skeleton and nothing else. Plan `64-01` creates the `64-COVERAGE.md` skeleton
  (header, grid, the `8 29 35 64` cell gate, all 35 verbatim `n/a` carry-forwards, the
  inherited-item ledger, 3 stubbed unit sections) **and** sweeps its unit end to end.

- **D-02:** Plan order follows INVENTORY's risk rank, unchanged from the Phase 61-63 precedent:

  1. `64-01` → `RU-64-03` — BBj tool scripts, vendored JARs & interop test harness (rank 1)
  2. `64-02` → `RU-64-01` — GitHub Actions workflows (rank 2)
  3. `64-03` → `RU-64-02` — build, packaging & dependency manifests (rank 3)

  This ordering also happens to be the right one for SEC-08: `RU-64-03` establishes the
  vendored-binary half of the dependency posture first, and `RU-64-02` closes with the npm/Gradle
  tree half, able to reference what the JAR sweep already established rather than guessing at it.

- **D-03:** **No fourth plan for SEC-08, but `64-03` splits into three tasks rather than the
  standard two.** Phases 61-63 used a two-task split per plan by evidence tier (Phase 63 D-15).
  `RU-64-02`/D6 is the single largest discrete unit of work in this phase — the entire npm tree
  plus the entire Gradle tree plus the ROADMAP-criterion-3 triage — so it gets its own task and
  its own commit:

  - **Task A — tier `repro`:** D1, D2, D3 over the build/packaging manifests
  - **Task B — SEC-08 dependency audit:** D6 for `RU-64-02` **and** the `package-lock.json`
    file-exception row, producing the triage table criterion 3 requires
  - **Task C — tier `trace`:** D4, D5, D8

  — **Reversibility:** reversible — the split is internal to one plan's task list; merging Task B
  back into Task A costs one plan edit and no cross-file rework.

- **D-04:** All 3 plans write into the **single** `.planning/reviews/64-COVERAGE.md` mandated by
  INVENTORY's recording protocol (Phase 60 D-09), and the shared-file constraint is enforced **by
  wave chaining, not by trust**: one plan per wave, three waves, each plan's `depends_on` naming
  its predecessor in D-02's order. Same-wave concurrency would corrupt the append. Phase 61
  D-03/D-04 → Phase 62 D-04 → Phase 63 D-04, carried forward unchanged.

  This matters more here than in earlier phases: this repository's worktree isolation degrades to
  serial execution on the current branch anyway, so the wave chain costs nothing in wall-clock and
  removes the only mechanism by which the append could interleave.

### Recording Shape — Inherited, Not Re-negotiated

- **D-05:** **No new format checkpoint.** Phase 61's D-05 checkpoint froze the recording shape;
  Phase 62 D-03 and Phase 63 D-03 each confirmed it transfers unchanged across phases. A fourth
  checkpoint on an unchanged shape would spend a user interruption to re-approve what three phases
  have already approved. Plan `64-01` renders the shape and proceeds.

- **D-06:** Three Phase-64-specific sections extend the frozen shape without altering the per-cell
  record format:

  - `### SEC-07 Workflow Security Posture` under `RU-64-01` (D-11)
  - `### SEC-08 Dependency Triage` under `RU-64-02`, holding the criterion-3 triage table (D-09)
  - `### Vendored Binary Provenance` under `RU-64-03` (D-10)

  These are the direct analogues of Phase 63's `### SEC-03 Integrity Posture`. Each is a named
  subsection of its unit, not a separate document, so the concatenation Phase 68 performs still
  works file-by-file.

### SEC-08 — Dependency Vulnerability Evidence

This is the phase's hardest evidence problem: two dependency trees with two completely different
tooling situations, and a criterion (3) that demands *enumeration*, not spot-checks.

- **D-07:** **The npm half is enumerated with live `npm audit`, and its output is the evidence.**
  Verified during this discussion, not assumed:

  ```
  $ cd bbj-vscode && npm audit
  19 vulnerabilities (7 moderate, 11 high, 1 critical)
  ```

  `node_modules/` is populated in this checkout (385 entries) and `registry.npmjs.org` is
  reachable (HTTP 200), so `npm audit --json` runs to completion and gives a machine-readable,
  advisory-linked enumeration. Every npm-side D6 finding cites the advisory it came from. This
  satisfies INVENTORY's `inherited` evidence tier for D6, which requires "the advisory reference
  (`repro`-equivalent)" for a CVE claim.

  **The audit output must be pinned into `64-COVERAGE.md` with its run date**, because
  `npm audit` is a live query whose result changes as advisories are published — a later reader
  must be able to tell what was true on the day of the sweep rather than re-run it and get a
  different number.

- **D-08:** **INVENTORY's `node_modules/` exclusion note is stale and this phase says so rather
  than working around it.** INVENTORY records `node_modules/` as excluded with the parenthetical
  *"0 packages present in this checkout"*. That was true when INVENTORY was written; it is not
  true now (385 entries). The **exclusion itself still stands** — Phase 64 does not review
  installed package source — but the stated reason no longer describes the tree.

  This is recorded as a **D8 finding against INVENTORY.md** on `RU-64-02`'s row, not as a silent
  correction and not as an edit to INVENTORY (Phase 60 D-09 makes it immutable). It is exactly
  the class of claim-vs-reality drift D8 exists to catch, and the milestone has a precedent for
  it: Phase 60's D-15 correction log.

- **D-09:** **Criterion 3's triage vocabulary is a second, additive field — it does not replace
  `classification:`.** ROADMAP criterion 3 demands each vulnerable dependency be triaged as
  *fix-now*, *file-issue*, or *accepted-with-reason*. The milestone-wide `classification:`
  field (`easy` | `major`) drives Phases 67 and 68 and cannot be repurposed. So every D6 finding
  carries **both**, with a stated mapping:

  | `triage:` | Meaning | Maps to `classification:` |
  |---|---|---|
  | `fix-now` | A version bump with no API change, applicable in Phase 67 | `easy` |
  | `file-issue` | Needs a breaking upgrade, a replacement, or upstream action | `major` |
  | `accepted-with-reason` | Not reachable in this product's usage; reason stated in full | `major` (documented, not filed as a fix) |

  `accepted-with-reason` requires a written reachability argument naming the code path that would
  have to exist for the vulnerability to matter and showing it does not — a bare "dev dependency,
  not shipped" is **not** an accepted reason under RVW-06.

  — **Reversibility:** costly — the `triage:` field is read by Phase 68's `MAJOR-REFACTORS.md`
  generation and Phase 69's issue drafting; changing its vocabulary after `64-COVERAGE.md` is
  written means re-triaging every D6 finding by hand.

- **D-10:** **The Gradle half cannot use `./gradlew dependencies`, and the phase states that
  limitation instead of hiding it.** Verified during this discussion:

  ```
  $ cd bbj-intellij && ./gradlew --offline -q dependencies
  BUILD FAILED in 5s      # JDK version check — local toolchain is Temurin 25.0.3
  ```

  This is the same toolchain failure Phase 63 recorded as `P63-D6-002`. Consequence: the Gradle
  dependency tree is enumerated **statically** — every version coordinate declared in
  `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties` and
  `gradle/wrapper/gradle-wrapper.properties` is read from the file and checked against published
  advisories by web lookup. Transitive Gradle dependencies are **not** enumerable in this
  environment.

  **That gap is recorded as a stated coverage limitation inside `RU-64-02`/D6, not left
  implicit.** The cell still records `pass`/`fail`, but its text names exactly what was and was
  not reachable — the same honesty rule Phase 63 D-07 applied to its non-building toolchain, and
  the same rule that made Phase 63's `extractTarGz` a Not-reproducible disposition rather than a
  hand-waved finding.

- **D-11:** **The three vendored JARs are assessed by manifest and hash, and the one that cannot
  be identified is itself the finding.** Verified during this discussion:

  | JAR | What its manifest says |
  |---|---|
  | `jcommander-1.71.jar` | `Bundle-Version: 1.71`, `Bnd-LastModified: 1493325683414` (2017-04-27) — identifiable, and roughly 9 years old |
  | `BBjCFCli.jar` | `Created-By: 11.0.10+9 (AdoptOpenJDK)`, `Ant-Version: Apache Ant 1.10.8`, `Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar` — first-party, build provenance readable |
  | `BBjCodeFomatter.jar` | `Manifest-Version: 1.0` **and nothing else** — no version, no vendor, no build date, no source reference |

  So: `jcommander-1.71.jar` gets a real advisory check against its known version.
  `BBjCodeFomatter.jar`'s **unidentifiability is the D6 finding** — a 38KB binary shipped inside
  the published extension that no manifest, lockfile, or build script identifies cannot be
  vulnerability-triaged at all, which is a strictly worse posture than a known-vulnerable
  dependency. Its `triage:` is `file-issue`, and the fix it asks for is provenance, not a bump.

  **No JAR is decompiled and no JAR is executed.** D1 on the JAR rows is satisfied by
  distribution-integrity reasoning (what is shipped, from where, verified how) and by their
  `Class-Path` wiring — consistent with Phase 63 D-13's prohibition on constructing exploits to
  confirm a finding.

### SEC-07 — Workflow Security Evidence

- **D-12:** **Workflow findings are `trace`-evidenced by construction, and the trace must name the
  triggering event.** GitHub Actions cannot be executed here, so no Phase 64 finding may claim a
  workflow "was run" or "was exploited". A `RU-64-01` D1 finding is valid when it names: the
  workflow file and line, the **trigger** that reaches it, the untrusted input that flows in, and
  the sink it reaches. A finding that names a sink without a reachable trigger is an observation,
  not a finding, and is recorded as `pass` with a note.

  Scouted ground truth to anchor this, verified at discussion time (**not** the review itself —
  the sweep re-derives all of it):

  - 36 `uses:` references across the 6 workflows (build 3, deploy-docs 5, pr-vsix 4,
    manual-release 11, pr-validation 6, preview 7)
  - **No `pull_request_target` anywhere** — which removes the single highest-severity Actions
    attack pattern from this repository and must be stated as a *positive* finding, not omitted
  - Only `deploy-docs.yml` and `pr-vsix.yml` declare a top-level `permissions:` block; 4 of 6 do
    not
  - Real secrets in play: `VSCE_PAT`, `JETBRAINS_MARKETPLACE_TOKEN`, `GITHUB_TOKEN`

- **D-13:** **Criterion 2 requires all four sub-questions answered per workflow, including where
  the answer is "nothing to report".** ROADMAP criterion 2 names secret handling, `GITHUB_TOKEN`
  permission scope, third-party action pinning, and exposure to untrusted PR-controlled input —
  *"every workflow's"*. So `### SEC-07 Workflow Security Posture` is a **6-row × 4-column table**,
  one row per workflow file, every cell filled. A workflow with no secrets still gets an explicit
  "no secrets referenced" cell rather than a blank. This is the criterion-2 analogue of Phase 63's
  three-part integrity posture, and it is what makes criterion 2 verifiable by a reader rather
  than by the phase's own assertion.

### The Dead Dimension and the Thin One

- **D-14:** **D7 is `n/a` for all 7 rows and no plan does parity work.** Phase 62 read
  `bbj-intellij/` as reference material for its live D7 cells; Phase 63 read `bbj-vscode/` for
  its own. Phase 64 does **neither** — `R-D7-CI` retires the dimension for this whole phase, and
  the reason is carried forward verbatim in all 7 rows. A `P64-D7-*` finding ID must never be
  issued. If a plan finds itself wanting one, the finding belongs to a different dimension or a
  different unit, and the plan says so rather than inventing a live D7 cell.

- **D-15:** **D5 splits three ways across this phase and each way is recorded differently.**

  - `RU-64-01`/D5 is `n/a — R-D5-CI` — workflow YAML is not itself unit-testable code.
  - `RU-64-02`/D5 and `RU-64-03`/D5 are **live**, and they mean something specific here: not "is
    this config file tested" but "does the test *configuration* this unit owns
    (`vitest.config.ts`, `tsconfig.test.json`, `package.json` scripts) accurately describe and
    actually run the suite it claims to run".
  - The 11 known-failing tests and the 3 disabled `parser.test.ts` assertions are **already
    owned** — by `RU-61-06` and DEBT-02 respectively. Phase 64 does not re-record them; where the
    config sweep touches them it cross-references by finding ID, per Phase 62 D-14's precedent.

### Disclosure

- **D-16:** **The two-tier disclosure rule is inherited verbatim (Phase 61 D-12 → Phase 62 D-09 →
  Phase 63 D-13) and it bites harder here than in any prior phase.** This repository is public,
  and `RU-64-01` is the one unit in the entire milestone whose findings, if written as a recipe,
  would describe how to steal a live publishing credential (`VSCE_PAT`,
  `JETBRAINS_MARKETPLACE_TOKEN`) from a repository anyone can fork.

  So for any `RU-64-01` finding rated critical or high: record the **surface, problem class, and
  impact**; do **not** record a trigger sequence, a payload, or a fork-and-run procedure. Lower
  severities record normally. Same rule applies to any SEC-08 finding that would amount to a
  working exploitation path against a shipped artifact.

  **No user checkpoint is spent re-approving this.** Phase 62 D-09's checkpoint approved the
  rendered shape and Phase 63 D-13 carried it unchanged; the shape is frozen, and a fourth
  approval of an unchanged rule is not worth an interruption. Plan `64-02` renders it and
  proceeds.

  — **Reversibility:** one-way — once a redacted finding is written and committed to a public
  repository's planning directory, un-redacting it later is a publication decision, and
  over-disclosing it now cannot be undone by a later edit because git history retains it.

### Inherited Work & Scope Fidelity

- **D-17:** **One inherited item, and it is inherited work, not an optional cross-reference.**
  Phase 63's close-out routes exactly one thing here:

  > `P63-D6-002` — the `bbj-intellij` Gradle build JDK 17-vs-25.0.3 toolchain mismatch, recorded
  > at `bbj-intellij/build.gradle.kts:12-13` — a `location:` Phase 63 flagged as its one
  > deliberate exception, since INVENTORY assigns that file to `RU-64-02` for every dimension.

  Plan `64-03` re-triages it in `RU-64-02`'s section with a written disposition (promoted /
  dismissed with evidence / merged), exactly as Phases 62 and 63 dispositioned their inherited
  referrals. Phases 61 and 62 route nothing to Phase 64 — verified, their close-out inheritance
  tables have no Phase 64 row.

  Phase 63 also leaves `RU-64-02`/SEC-08 owning "every other dependency version this phase did not
  touch" — the IntelliJ Platform version (`2024.2`), LSP4IJ (`0.19.0`), and the Gradle wrapper
  version. Those are `RU-64-02`/D6's, not a separate ledger entry.

- **D-18:** **Two completion gates, both re-derived live in plan `64-03`'s close-out, and the
  file-exception rows are the one this phase is most likely to fail.**

  1. **Cell-total gate** — the close-out re-counts the grid and must print `8 29 35 64` (row
     count first, so a dropped row fails mechanically rather than looking plausible), agreeing
     with the derivation in `<domain>` above. **All 8 rows must appear**: 3 unit rows *and* the
     5 file-exception rows (4 from INVENTORY + D-20's). Phase 63 closed with no file-exception
     rows at all and explicitly noted that adding one would have broken its gate; Phase 64 is the
     mirror image — omitting one breaks *this* gate.
  2. **File gate** — enumerate the files INVENTORY assigns to `RU-64-01`..`RU-64-03` from the
     live tree and confirm every one is named in `64-COVERAGE.md`. The counts and LOC were
     re-verified during this discussion and match INVENTORY exactly: 6 workflows / 568 lines,
     4 readable tool files / 1,240 lines + 3 JARs, 14 manifest files / 9,208 lines — **27 files**.
     Per **D-19** and **D-20** the gate prints **29**, the extras being `.github/dependabot.yml`
     (19 lines) and `gradle/wrapper/gradle-wrapper.jar` (43,583 bytes). Both must be named as
     documented adoptions at the point of the count rather than folded in silently.

  **`RU-D8-01` is not Phase 64's.** INVENTORY scopes it as *"cross-cutting, not owned by Phases
  61-64"*. No `P64-*` finding may be located in `CLAUDE.md`, `VERBs.md` or `documentation/`, and
  the close-out states that `RU-D8-01` remains the milestone's one unrecorded row rather than
  leaving a reader to assume Phase 64 forgot it.

  Since this is the **last sweep phase**, plan `64-03`'s close-out additionally states the
  milestone-level coverage position: which INVENTORY rows are now recorded across
  `61`/`62`/`63`/`64-COVERAGE.md`, and that `RU-D8-01`/D8 is the sole remainder. Phase 68 consumes
  this directly for its DOC-03 full-coverage statement.

- **D-19:** **`.github/dependabot.yml` exists, INVENTORY says it does not, and Phase 64 adopts it
  into `RU-64-01` as a 28th file.** Discovered during this discussion, verified live:

  ```
  $ ls .github/
  dependabot.yml    workflows/
  $ git log --oneline -1 -- .github/dependabot.yml
  be402d6 chore: tell dependabot to ignore TypeScript major bumps (#402)
  ```

  INVENTORY's full-surface accounting table states for `.github/`: *"`workflows/` → `RU-64-01`;
  **no other content under `.github/` in this tree**."* That is factually wrong — an 881-byte,
  committed, functional config file sits beside `workflows/` and belongs to no review unit.

  Three consequences, all of which the plans must carry:

  1. **The claim is a D8 finding against INVENTORY.md**, recorded on `RU-64-01`'s row — the same
     treatment D-08 gives the stale `node_modules/` note, and for the same reason (Phase 60 D-09
     makes INVENTORY immutable, so drift is recorded, never edited away).
  2. **The file is swept**, not skipped. Leaving the milestone's only dependency-automation config
     unreviewed in the phase that owns SEC-08 would be the exact "invisible hole" the coverage
     gates exist to prevent. It joins `RU-64-01` — it is `.github/` CI configuration, and
     `RU-64-01` is the unit that owns `.github/`.
  3. **It is substantively relevant to SEC-08, not just a scope-accounting footnote.** The config
     declares `package-ecosystem: "npm"`, `directory: "/bbj-vscode"` — **npm only**. There is no
     `gradle` ecosystem entry, so the `bbj-intellij` dependency tree receives no automated update
     coverage at all. Given D-10 already establishes that the Gradle tree cannot even be
     enumerated locally, "unscanned by tooling *and* unenumerable by hand" is a materially
     stronger SEC-08 finding than either half alone. Its two documented `ignore:` entries
     (`chevrotain` pinned to Langium's version per PR #347; `typescript` majors blocked by
     typescript-eslint's `>=4.8.4 <6.1.0` range per PR #397) are **well-reasoned and must be
     recorded as such** — they are a model of what `triage: accepted-with-reason` looks like
     (D-09), not defects.

  **Gate arithmetic is unchanged.** D-18's cell gate counts *rows*, and `dependabot.yml` inherits
  `RU-64-01`'s row rather than earning a file-exception row of its own — its applicability is
  identical to the workflows' (D5 `n/a — R-D5-CI`, D7 `n/a — R-D7-CI`). The cell gate still prints
  **27 / 29 / 56**. Only D-18's **file gate** moves: **28 files**, not 27, with the 28th named and
  its adoption justified in writing at the point of the count, so a reader diffing against
  INVENTORY sees a deliberate documented addition rather than a miscount.

  — **Reversibility:** reversible — if a later reader disagrees with the adoption, the file moves
  to its own file-exception row or to `RU-64-02` with a one-line note; nothing downstream keys on
  which of the two units holds it.

- **D-20:** **`bbj-intellij/gradle/wrapper/gradle-wrapper.jar` is adopted into `RU-64-02` as a
  fourth vendored binary with its own file-exception row.** Surfaced during planning, verified
  live:

  ```
  $ ls -la bbj-intellij/gradle/wrapper/
  -rw-r--r-- 43583 gradle-wrapper.jar
  -rw-r--r--   251 gradle-wrapper.properties
  $ grep -n 'gradle-wrapper.jar' bbj-intellij/gradlew
  117:CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar
  $ grep -c 'gradle-wrapper.jar' .planning/reviews/INVENTORY.md
  0
  ```

  INVENTORY assigns `gradle/wrapper/gradle-wrapper.properties` (7 lines) to `RU-64-02` but never
  names the 43,583-byte **executable JAR sitting beside it** — the binary `gradlew:117` puts on
  the classpath and runs on every build. That is a fourth vendored, unpinned, unscanned
  third-party binary, in a milestone whose SEC-08 requirement exists to enumerate exactly those.

  **The gate follows the scope; the scope does not follow the gate.** This decision overrides the
  contrary reasoning that a pinned file count is a reason not to sweep a file — a count that
  excludes a real in-scope artifact is simply a wrong count, and D-19 already established the
  correct direction one decision earlier. Recording it only as a drift note while assessing its
  integrity indirectly, through the two text files INVENTORY *does* assign, would leave the
  milestone's SEC-08 claim resting on an unexamined executable.

  **Treatment mirrors the three `tools/formatter/` JARs exactly** (D-11): assessed by manifest and
  hash, never decompiled and never executed; its own file-exception row with **D1 `applies`, D6
  `applies`**, D7 `n/a — R-D7-CI`, and D2/D3/D4/D5/D8 `n/a — R-JAR-BINARY`. Its provenance
  question is distinctive and worth stating: a Gradle wrapper JAR's integrity is normally
  established by the `distributionSha256Sum` / checksum mechanism declared in
  `gradle-wrapper.properties`, so whether that property is present is the finding, not an aside.

  **Both gates move, and both must be restated wherever they appear:**

  | Gate | Was (D-18/D-19) | Now |
  |---|---|---|
  | Rows | 7 | **8** |
  | `applies` cells | 27 | **29** |
  | `n/a` cells | 29 | **35** |
  | Total cells | 56 | **64** |
  | File gate | 28 | **29** |

  `R-JAR-BINARY` is now carried **20** times (4 JARs × 5 cells), not 15. The close-out re-derives
  `8 29 35 64` and `29`; a result of `7 27 29 56` now means this row was dropped and fails
  mechanically.

  — **Reversibility:** reversible — same as D-19; the row can be re-parented or removed with a
  one-line note, and nothing downstream keys on it beyond the two gate literals.

### Claude's Discretion

Auto mode resolved every gray area to its recommended option; the following are left to the
planner and the executing agents rather than pinned here:

- Exact task boundaries within plans `64-01` and `64-02` (D-03 pins only `64-03`'s three-way
  split). The two-task evidence-tier split from Phase 63 D-15 is the default.
- Whether `npm audit --json` output is embedded verbatim, summarised into a table, or both — as
  long as the run date and the totals are pinned (D-07).
- Which specific advisory database is cited for Gradle-side coordinates (GitHub Advisory,
  OSV, or vendor advisory), provided each claim carries a resolvable reference.
- Ordering of dimensions inside a unit section, provided every `applies` cell is present.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone contract — authoritative, read first

- `.planning/reviews/INVENTORY.md` — the Phase 60 review standard and the **authority for this
  phase's scope**. Specifically: the `RU-64-01`/`RU-64-02`/`RU-64-03` unit definitions with file
  lists, LOC and risk ranks; the applicability grid rows for all three units; the **4
  file-exception rows** (`package-lock.json`, the 3 JARs); the exclusion-reason texts
  `R-D7-CI`, `R-D5-CI`, `R-D6-CENTRAL`, `R-LOCKFILE`, `R-JAR-BINARY`; the evidence-tier table
  (D4/D8 → `trace`, D1/D2/D3 → `repro`, D5/D6/D7 → `inherited`); the finding-ID scheme; the
  easy-vs-major rule; the frozen 15-issue snapshot for dedup; the pinned `2194616..v0.12.0`
  baseline; the D-06 routing table; and the full-surface accounting table. **Immutable — Phase 64
  does not edit it** (Phase 60 D-09); drift is recorded as a D8 finding instead (D-08).
- `.planning/ROADMAP.md` §"Phase 64: Build, CI & Dependency Review" — the goal and the 4 success
  criteria this phase is verified against.
- `.planning/REQUIREMENTS.md` — RVW-05 (line 38), SEC-07 (line 50), SEC-08 (line 51) verbatim,
  plus RVW-06 (verified failure scenario) and RVW-07 (dedup vs open issues) as the standard every
  finding must meet.

### Inherited work — read before planning `64-03`

- `.planning/reviews/63-COVERAGE.md` §close-out inheritance table and `RU-63-03`/D6 — the source
  of `P63-D6-002` (the routed toolchain item at `bbj-intellij/build.gradle.kts:12-13`) and of
  Phase 63's statement that `RU-64-02`/SEC-08 continues to own every dependency version Phase 63
  did not touch (D-17).

### Worked precedent — the shape to copy, not to re-invent

- `.planning/reviews/63-COVERAGE.md` — the most recent closed sweep; the per-cell record format,
  the `### SEC-03 Integrity Posture` subsection that `### SEC-07 Workflow Security Posture` and
  `### Vendored Binary Provenance` are modelled on, the inherited-referral disposition format, and
  the close-out sections A-G with both gates re-derived live.
- `.planning/reviews/62-COVERAGE.md` — the two-tier disclosure rendering (Phase 62 D-09) that
  D-16 inherits, and the cross-reference-by-ID convention D-15 uses.
- `.planning/phases/63-intellij-plugin-review/63-CONTEXT.md` — the decision-document shape this
  file follows.

### Artifacts this phase creates

- `.planning/reviews/64-COVERAGE.md` — the sole deliverable. Created by plan `64-01`, appended by
  `64-02` and `64-03`, closed by `64-03`.

### Code under review (3 units, 27 files)

**`RU-64-03` — BBj tool scripts, vendored JARs & interop test harness (rank 1)**
- `bbj-vscode/tools/web.bbj` (97), `bbj-vscode/tools/em-login.bbj` (51),
  `bbj-vscode/tools/em-validate-token.bbj` (34)
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` (1,058)
- `bbj-vscode/tools/formatter/BBjCFCli.jar` (6,780 bytes),
  `bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar` (38,078 bytes),
  `bbj-vscode/tools/formatter/lib/jcommander-1.71.jar` (67,503 bytes)

**`RU-64-01` — GitHub Actions workflows (rank 2)**
- `.github/workflows/build.yml` (45), `deploy-docs.yml` (62), `manual-release.yml` (186),
  `preview.yml` (109), `pr-validation.yml` (61), `pr-vsix.yml` (105) — 568 total
- `.github/dependabot.yml` (881 bytes) — **adopted into this unit by D-19**; present in the tree
  but absent from INVENTORY's file list and contradicted by INVENTORY's own `.github/` accounting

**`RU-64-02` — Build, packaging & dependency manifests (rank 3)**
- `bbj-vscode/package.json` (694), `package-lock.json` (7,894), `esbuild.mjs` (28),
  `eslint.config.js` (18), `langium-config.json` (22), `tsconfig.json` (25),
  `tsconfig.test.json` (13), `vitest.config.ts` (30)
- `bbj-intellij/build.gradle.kts` (135), `settings.gradle.kts` (5), `gradle.properties` (1),
  `gradlew` (244), `gradlew.bat` (92), `gradle/wrapper/gradle-wrapper.properties` (7)
- `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` (43,583 bytes) — **adopted into this unit by
  D-20**; executed via `gradlew:117`, present in the tree but absent from INVENTORY's file list

### Code-truth references

- `CLAUDE.md` — build/test command surface (`npm run build`, `npm test`, `npm run test:bbj`,
  `./gradlew build`) that `RU-64-02`'s D5 cell checks the config against. **Read as reference
  only** — it is `RU-D8-01`'s file, and no `P64-*` finding may be located in it (D-18).
- `.planning/PROJECT.md` — Key Decisions table and the v4.0 constraint list.
- `.planning/STATE.md` — Active Constraints, in particular the 11 known-failing tests and the 3
  disabled `parser.test.ts` assertions that D-15 forbids re-recording.

### Explicitly NOT to be read as reviewable surface

- `java-interop/` — excluded by FUT-01. `java-interop/build.gradle` and `settings.gradle` are
  read **once** by `RU-64-02`/SEC-08 as an additional dependency-tree source only; this does not
  add `java-interop/` source files to any unit's file list.
- `bbj-vscode/src/language/generated/` — machine-generated, excluded at milestone start.
- `bbj-vscode-deprecated/` — excluded at milestone start.
- `node_modules/` — excluded as reviewable source; dependency *health* is assessed from the
  manifest and lockfile (D-08).
- `CLAUDE.md`, `VERBs.md`, `documentation/` — `RU-D8-01`'s surface, not owned by Phase 64 (D-18).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **The `6N-COVERAGE.md` document shape**, three times proven. `64-COVERAGE.md` is a fourth
  instance of the same structure — header, grid slice, cell gate, per-unit sections with one
  block per dimension, findings with `location:` / `evidence:` / `classification:` / `dedup:`,
  close-out sections A-G. Nothing about it is being designed in this phase.
- **INVENTORY's exclusion-reason texts** are copy-paste inputs, not prose to re-write. All 29
  `n/a` cells in this phase carry one of five verbatim strings (`R-D7-CI`, `R-D5-CI`,
  `R-D6-CENTRAL`, `R-LOCKFILE`, `R-JAR-BINARY`).
- **The frozen 15-issue snapshot** in INVENTORY is the dedup input for all 27 live cells — no new
  issue-list query is made, so dedup verdicts stay comparable across all four sweep phases.
- **`npm audit --json`** is a working, machine-readable enumerator in this environment
  (verified: 19 vulnerabilities — 7 moderate, 11 high, 1 critical). The SEC-08 npm half does not
  need a hand-built dependency walk.
- **`unzip -p <jar> META-INF/MANIFEST.MF`** is a working, non-destructive provenance reader for
  all three vendored JARs (verified), and needs no Java toolchain.

### Established Patterns

- **Sweep phases record; they never fix.** Phases 61-63 modified zero source files. Phase 64 is
  the same: the only file it writes under `.planning/` is `64-COVERAGE.md`.
- **Gates are re-derived live, never asserted.** Every prior sweep closed by re-running its own
  counts and printing them. D-18 keeps that, with the file-exception rows as the new failure mode.
- **A limitation is stated, not hidden.** Phase 63 D-07 (non-building Gradle) and its
  `extractTarGz` Not-reproducible disposition set the precedent D-10 follows for the
  un-enumerable Gradle transitive tree.
- **Cross-reference by ID rather than re-record.** Phase 62 D-14 and Phase 63's referral
  dispositions; D-15 applies it to the already-owned test failures.

### Integration Points

- **Phase 65** consumes nothing from Phase 64 by design — SEC-01/02/04/05 are cross-cutting over
  Phases 61-63's units. Phase 64 closing SEC-07 and SEC-08 means Phase 65's scope is *only* those
  four, with no CI or dependency component.
- **Phase 66** consumes any `dedup:` naming a `DEBT-*` requirement. `P63-D6-002`'s re-triage
  (D-17) is the likeliest producer.
- **Phase 67** consumes the `classification: easy` set. D-09's `triage: fix-now` bucket is
  designed to land there cleanly — a version bump with no API change is exactly an atomic,
  regression-tested commit.
- **Phase 68** consumes all four `6N-COVERAGE.md` files for the DOC-03 concatenation, and depends
  on D-18's milestone-level coverage statement to write its full-coverage claim.
- **Phase 69** consumes every `dedup:` verdict, gated on ISSUE-01.

### Environment facts verified at discussion time

| Fact | Status | Bearing |
|---|---|---|
| `node_modules/` populated (385 entries) | ✅ present | Enables `npm audit` (D-07); makes INVENTORY's "0 packages" note stale (D-08) |
| `registry.npmjs.org` reachable | ✅ HTTP 200 | Live advisory data available |
| `npm audit` | ✅ runs | 19 vulns: 7 moderate / 11 high / 1 critical |
| `./gradlew --offline dependencies` | ❌ BUILD FAILED in 5s | JDK 25.0.3 version check; forces static Gradle enumeration (D-10) |
| JAR manifests readable via `unzip -p` | ✅ all 3 | jcommander 1.71 identified; `BBjCodeFomatter.jar` manifest is bare (D-11) |
| `pull_request_target` in workflows | ❌ absent | Positive SEC-07 finding, must be stated not omitted (D-12) |
| Top-level `permissions:` blocks | 2 of 6 workflows | Criterion-2 input (D-13) |
| `.github/dependabot.yml` | ✅ present (881 B, committed `be402d6`) | Contradicts INVENTORY's `.github/` accounting; adopted into `RU-64-01` (D-19) |
| Dependabot ecosystem coverage | npm only — no `gradle` entry | SEC-08 finding: `bbj-intellij` has no automated dependency updates (D-19) |

</code_context>

<specifics>
## Specific Ideas

- **The `8 29 35 64` gate is written into `64-01`'s skeleton, not computed at close-out.** Plan
  `64-01` writes the expected totals into the document up front; `64-03` re-derives them and the
  two must agree. This is the shape Phase 63 used (its skeleton carried `35/5/40`) and it is what
  turns the gate into a check rather than a restatement.

- **`BBjCodeFomatter.jar`'s bare manifest is the phase's most interesting single finding and
  should not be softened into "could not determine version".** A binary shipped inside a published
  marketplace extension, with no version, no vendor, no build date and no build script that
  produces it, is unauditable by construction — that is a supply-chain posture statement, and
  D-11 says so directly. (Note also its filename typo, `Fomatter`, which is what a hand-copied
  vendored binary looks like rather than a build-produced one.)

- **The absence of `pull_request_target` deserves an explicit positive record.** Review documents
  that only list defects leave a reader unable to distinguish "checked and clean" from "not
  checked". Phase 60's standard already requires a no-finding `applies` cell to record `pass`
  plus a written line naming what was checked; D-12 makes that concrete for the highest-value
  Actions attack pattern.

- **`jcommander-1.71.jar` is dated by its own manifest** (`Bnd-LastModified: 1493325683414` →
  2017-04-27), so the age claim in INVENTORY's risk-rank note ("notably old") is verifiable from
  the artifact itself rather than from the filename.

</specifics>

<deferred>
## Deferred Ideas

- **Actually fixing any of the 19 npm vulnerabilities** — Phase 67 only. Phase 64 records
  `triage: fix-now` on the bumpable ones; it does not run `npm audit fix`.
- **Replacing or re-building the vendored formatter JARs** — a major refactor, recorded here and
  filed by Phase 69 if approved.
- **Adding a `permissions:` block to the 4 workflows that lack one** — Phase 67 if it lands as
  `easy`; recorded, not applied, here.
- **Adding a `src/test/` source set to `bbj-intellij`** — Phase 63 D-08's finding, carried to
  Phase 66/67, not Phase 64's.
- **Resolving the JDK 17-vs-25 toolchain mismatch** so Gradle builds locally — `P63-D6-002` is
  re-triaged here (D-17) but fixing it belongs to Phase 66/67. Doing so would also retroactively
  close D-10's stated Gradle enumeration gap, which is worth noting in the re-triage.
- **Reviewing `RU-D8-01`** (`CLAUDE.md`, `VERBs.md`, `documentation/`) — cross-cutting, owned by
  neither Phase 64 nor any other sweep phase; D-18 requires the close-out to say so out loud.
- **Extending Dependabot to the Gradle ecosystem** — `.github/dependabot.yml` already covers npm
  for `/bbj-vscode` but declares no `gradle` entry (D-19), so `bbj-intellij` has no automated
  dependency-update coverage. Phase 64 **records** that gap as a SEC-08 finding; adding the
  ecosystem entry is Phase 67's if it classifies `easy`, and is not done here.
- **Adding an `npm audit` gate to CI** — a genuine improvement surfaced by this phase's work, but
  a new capability rather than a review finding. Belongs in a future milestone.

</deferred>

---

*Phase: 64-build-ci-dependency-review*
*Context gathered: 2026-08-18*
