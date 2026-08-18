---
phase: 64-build-ci-dependency-review
plan: 03
subsystem: review
tags: [build-ci, dependency-health, sec-08, npm-audit, gradle, vendored-binary, supply-chain, inventory-drift, phase-close-out, milestone-coverage]

requires:
  - phase: 60-review-inventory
    provides: INVENTORY.md's RU-64-02 unit definition, the applicability grid row, the package-lock.json file-exception row, the R-LOCKFILE/R-JAR-BINARY/R-D7-CI exclusion texts, the 13-field finding template, the finding-ID scheme, the six easy-vs-major tests, the evidence tiers, the java-interop dependency-tree-source carve-out, the Grid totals (148/84/232) and the frozen 15-issue snapshot
  - phase: 63-intellij-plugin-review
    provides: "P63-D6-002 — the bbj-intellij Gradle JDK 17-vs-25.0.3 toolchain mismatch at build.gradle.kts:12-13, routed to RU-64-02/D6 by 63-COVERAGE.md's close-out inheritance table, with the explicit note that every other Gradle/IntelliJ-Platform/LSP4IJ version question remains RU-64-02/SEC-08's"
  - phase: 64-build-ci-dependency-review
    provides: "plan 64-01's 64-COVERAGE.md skeleton (header, 8-row grid with all 5 file-exception rows, both gates, the four verbatim n/a carry-forwards, the inherited-item ledger) plus its completed RU-64-03 section and Vendored Binary Provenance subsection; and plan 64-02's completed RU-64-01 section, its SEC-07 Workflow Security Posture table, and P64-D6-005 — dependabot.yml declares no gradle ecosystem, which this plan composes with D-10"
provides:
  - RU-64-02 (build, packaging & dependency manifests — INVENTORY's 14 files / 9,208 lines plus D-20's adopted gradle-wrapper.jar / 43,583 bytes, INVENTORY risk rank 3, the largest unit by LOC in the inventory) fully swept across all 10 live cells — 7 unit-row dimensions, the package-lock.json row's D6, and the wrapper JAR row's D1 and D6 — and closed against the four-part stopping rule
  - "### SEC-08 Dependency Triage — the ROADMAP criterion-3 deliverable: a 20-row table (19 npm + 1 Maven), each row carrying a resolvable advisory reference, a triage:, a classification: and the finding ID that records it; totals fix-now 6, file-issue 11, accepted-with-reason 3"
  - "The npm half enumerated by a live `npm audit` pinned to run date 2026-08-18 — 19 vulnerabilities (7 moderate, 11 high, 1 critical) over 593 packages (296 prod / 260 dev / 96 optional) — with the empty case stated so the totals are interpretable"
  - "The production-versus-dev split established from package.json and the lockfile's own paths rather than asserted: 16 of the 19 sit in the production closure, 15 of them reaching it through @vscode/vsce alone (P64-D6-007), and exactly one — brace-expansion@5.0.7 — reaching the shipped bundle (P64-D6-008), measured by grepping out/extension.cjs rather than inferred"
  - "The Gradle half enumerated statically with the coverage limitation stated, not hidden: ./gradlew --offline -q dependencies exits 1 in 723 ms with `* What went wrong: 25.0.3`, so transitive Gradle dependencies are not enumerable in this environment and the Gradle half covers declared coordinates only"
  - "The composed statement 64-02 deliberately left to this plan: with P64-D6-005 (no gradle ecosystem in dependabot.yml) plus D-10 (no local enumeration), the bbj-intellij dependency tree is both unscanned by tooling and unenumerable by hand"
  - "D-20's gradle-wrapper.jar swept directly by manifest and hash — its sha256 matches Gradle's published wrapperChecksum for releases 8.10-8.12.1 while gradle-wrapper.properties:3 declares 8.13, so the two halves of the wrapper do not correspond (P64-D6-006), and nothing pins either (no distributionSha256Sum, no wrapper-validation action in any workflow — P64-D1-006)"
  - "P63-D6-002 re-triaged with a written disposition — merged into P64-D6-010 — and the header ledger's disposition column resolved to match"
  - "Both INVENTORY drift records: P64-D8-003 (the stale node_modules/ exclusion reason at :938, with the exclusion itself explicitly still standing) and P64-D8-004 (the unlisted gradle-wrapper.jar at :964, with D-20's both-gates arithmetic stated at the point of the record)"
  - "## Phase 64 Close-Out — all seven lettered sections with both D-18 gates re-run live (file gate 29 with zero absent basenames; cell gate 7 27 29 56 from INVENTORY plus D-20's row = 8 29 35 64, three sources agreeing), 44-finding accounting with the triage distribution checked against D-09's mapping, complete inherited-item accounting, scope fidelity, all four ROADMAP criteria answered Met, and closing confirmations"
  - "### Milestone coverage position (last sweep phase) — re-derived live at 50 35 35 29 across the four coverage files: 147 of INVENTORY's 148 applies cells recorded and 77 of 84 n/a carried, with RU-D8-01/D8 under R-D8-SCOPE the sole remainder, and Phase 64's 8 cells on D-20's adopted row reported separately so INVENTORY's denominator stays checkable — the exact claim Phase 68's DOC-03 consumes"
affects: [64-build-ci-dependency-review, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes-major-refactors, 68-deliverable-documents, 69-issue-filing]

actuals:
  tokens: 56000
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Hash-against-published-checksum as the identity method for a vendored binary whose manifest carries no version: Gradle publishes a per-release wrapperChecksum at services.gradle.org/versions/all, so a JAR that cannot identify itself can still be identified — and here the answer contradicts the properties file beside it, turning an unanswerable-looking provenance question into a concrete finding"
    - "Reachability measured against the built artefact rather than reasoned from the dependency graph: grepping out/extension.cjs and out/language/main.cjs for each flagged package separates 'in the production closure' (16) from 'actually shipped' (1), which is the distinction every accepted-with-reason argument turns on"
    - "accepted-with-reason granted only where a code path can be named and shown absent — three grants, each backed by a recorded command (no workflow runs concurrently; no stylesheet exists so Vite's CSS pipeline is never entered; nothing imports nanoid) — and explicitly refused for the 15 vsce-tree packages, because a package running in a job that holds a marketplace token is reachable even though it does not ship"
    - "Refusing an acceptance the unit cannot finish: brace-expansion is triaged file-issue rather than accepted-with-reason because completing its reachability argument requires reading RU-62-01's closed surface, and that incompleteness is recorded as a Not-reproducible disposition rather than resolved by assumption"
    - "A two-part completion gate where one part is unrecoverable by grep: the INVENTORY pipeline's `7 27 29 56` and the hand-added `1 2 6 8` are recorded as separate literals with `grep -c 'gradle-wrapper.jar' INVENTORY = 0` as the proof that the second cannot be derived, so a close-out that reports the pipeline result as the phase total fails visibly rather than plausibly"
    - "Two figures kept structurally unblendable in the milestone coverage claim — 147 of INVENTORY's 148 on-grid, plus 8 cells beyond the grid reported as a separate line — so Phase 68's DOC-03 reads a denominator that still matches INVENTORY while the surplus coverage stays visible"

key-files:
  created:
    - .planning/phases/64-build-ci-dependency-review/64-03-SUMMARY.md
  modified:
    - .planning/reviews/64-COVERAGE.md

key-decisions:
  - "The wrapper JAR's identity question was answered rather than declared unanswerable: its manifest is two lines with no version field, but Gradle publishes a wrapperChecksum per release, and matching sha256 2db75c40… against all 521 published entries returned 19 matches spanning 8.10-8.12.1 — against a properties file declaring 8.13 (published checksum 81a82aaea5…). git log shows both files landed together in e97c587 and never changed, so the pair was never produced by one `./gradlew wrapper` run"
  - "P64-D1-006 (integrity: nothing pins the JAR or the distribution) and P64-D6-006 (identity and update path: the JAR is not the declared version and no tool could ever update or validate it) kept as two findings on two dimensions of the same artefact rather than merged, because the D1 and D6 cells of the wrapper row each need their own verdict and merging would have left one citing the other's evidence"
  - "The 15 @vscode/vsce-tree packages were deliberately NOT accepted-with-reason despite not shipping (.vscodeignore:8 excludes node_modules; 0 bundle occurrences of vsce/undici/markdown-it/shell-quote): they are installed by npm ci in five workflows and vsce itself runs beside secrets.VSCE_PAT, so 'does not ship' is true and is not 'cannot run'. They share one finding, P64-D6-007, because they share one structural fix"
  - "Six moderate-severity transitive advisories bundled as P64-D6-013 (easy / fix-now, lockfile-only) after reading INVENTORY 3c test (3) literally — it names package.json and build.gradle.kts, not the lockfile — which is what gives Phase 67 a non-empty apply bucket from this unit; the 11 high/critical rows are file-issue because test (6) forces major and major cannot map to fix-now, and that constraint is stated in the triage table rather than left for a reader to infer"
  - "P63-D6-002 dispositioned `merged` rather than `promoted`: the toolchain declaration, the Gradle 8.13 wrapper pin and the resulting inability to resolve any transitive coordinate are one condition with one fix, and P64-D6-010 records it with this unit's own re-derived evidence plus the version coordinates Phase 63 explicitly left here"
  - "Guava 31.1-jre recorded with location: java-interop/build.gradle:22 — the dependency-tree-source citation INVENTORY's own carve-out authorises — because criterion 3 says *every* Gradle dependency with a known vulnerability and OSV returns two advisories for it, with the scope note written into the record so it is not read as an expansion; it is the only declared Gradle-side coordinate in the milestone that returns an advisory"
  - "Two coordinates (com.redhat.devtools.lsp4ij:0.19.0 and intellijIdeaCommunity 2024.2) recorded as *not answerable by OSV* rather than as clean, because they are not Maven artefacts OSV indexes — a weaker statement than a pass and preserved as such"
  - "P64-D4-006 recorded classification: major on D-13's one-file test failing at a file count of two, with the note that splitting it into two single-file findings would make both easy — noted rather than done, because inventing a split to clear a threshold is the gaming D-13 resists"
  - "eslint.config.js:16's `rules: {}` verified by running the tool (--print-config reports 0 enabled rules; eslint src test exits 0 with 2 warnings, both 'Unused eslint-disable directive') rather than by reading the file, which turned a plausible observation into P64-D4-005 with mechanical proof that a developer expected a rule the config never enables"
  - "D5 read strictly per D-15: the 50-discovered / 50-present agreement is recorded as the finding, not the reassurance, because nothing in the three sources causes it — vitest.config.ts declares no globs at all, tsconfig.test.json's written boundary cannot compile, and package.json's scripts delegate entirely"
  - "properties-reader was NOT recorded as an unused dependency: an initial grep restricted to *.ts missed src/Commands/Commands.cjs:6, which requires it. The claim was dropped before it reached the file rather than corrected afterwards"
  - "Two claims dispositioned not-reproducible rather than asserted: Gradle's Copy NO-SOURCE outcome for the missing language-server input (documented behaviour, not observable here because the build does not run) and whether a workspace-controlled glob reaches the shipped brace-expansion copy (requires RU-62-01's closed surface)"
  - "Every observation that did not clear the bar states its own judgement where it is recorded — runIde's ~/tinybbj argument, gradlew.bat's LF normalisation, esbuild.mjs:1's inert //@ts-check, bbj.denumber's missing category, the versioning concern spread across three Gradle files, and package.json's 293-line configuration block, which is measured and then explicitly not promoted because VS Code gives it nowhere else to live"

requirements-completed: [RVW-05, SEC-07, SEC-08]

metrics:
  duration: ~90min
  completed: 2026-08-18
  status: complete
---

# Phase 64 Plan 03: RU-64-02 Sweep and Phase Close-Out Summary

The npm and Gradle halves of SEC-08 enumerated and triaged in one criterion-3 table — 20 rows, a
pinned `npm audit` run, and a stated Gradle limitation — with the phase's largest unit swept across
all 10 live cells and Phase 64 closed at **29 verdicts / 0 placeholders**, both D-18 gates re-run
live, and the milestone's coverage position stated at **147 of INVENTORY's 148**.

## What Was Built

**Task 1 — `RU-64-02` at tier `repro` (D1, D2, D3 + the wrapper JAR's D1), commit `ac649ee`.**
Enumerated every npm lifecycle hook (exactly one, `prepare` at `package.json:653`, firing on all 8
`npm ci` invocations in CI) and read all 7 lines of `gradle-wrapper.properties`, answering the
`distributionSha256Sum` question explicitly: **absent**. Swept `gradle-wrapper.jar` directly on its
own file-exception row — `sha256sum`, byte size, a two-line manifest with no version field, and the
`gradlew:117` classpath line as reachability evidence. Found that `vscode:prepublish` builds
`out/main.js` while `main` is `out/extension.cjs`, that `tsconfig.test.json` cannot compile
(TS6306/TS6310) and is run by nothing, that the IntelliJ language-server copy has no declared
producer and no guard, and that three workflows build twice per job. 5 findings.

**Task 2 — the SEC-08 audit (D6 ×3, the triage table, the inherited item), commit `dc9e320`.**
Ran `npm audit` live and pinned it to **2026-08-18**; resolved every one of the 19 flagged packages'
dependency paths with `npm ls`; grepped the built bundles to separate the production closure (16)
from what actually ships (1). Re-ran the failing Gradle command and recorded its literal output.
Queried OSV for every declared Gradle coordinate. Wrote `### SEC-08 Dependency Triage` (20 rows) and
`### Inherited item triage` (`P63-D6-002` → `merged`). 8 findings.

**Task 3 — `RU-64-02` at tier `trace` (D4, D5, D8) and unit closure, commit `df49036`.**
Proved `npm run lint` enforces zero rules by running `eslint --print-config`; measured
`package.json`'s block distribution; showed `gradlew` byte-identical to `java-interop/gradlew`;
named the three-way disagreement about what constitutes the test suite; checked every comment in the
13 readable manifests; and recorded both INVENTORY drift findings. 6 findings, 2 not-reproducible
dispositions, 3 cross-unit referrals, unit closed.

**Task 4 — the close-out, commit `7b5b1c5`.** Sections A-G plus
`### Milestone coverage position (last sweep phase)`, both gates re-run live, the ledger column
resolved.

## Notable Results Worth Flagging

**The wrapper JAR is not the version its own properties file declares.** Its
`sha256 2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046` matches Gradle's published
`wrapperChecksum` for **19 releases spanning 8.10 – 8.12.1**, while
`gradle-wrapper.properties:3` declares `gradle-8.13-bin.zip` (published wrapper checksum
`81a82aaea5…`). Both files landed in a single commit (`e97c587`) and neither has changed since. This
is exactly the state a wrapper-JAR substitution would produce, and it has sat undetected since the
initial commit — which is the practical demonstration that a real substitution would also go
undetected, including in the two jobs that run `./gradlew publishPlugin` with
`secrets.JETBRAINS_MARKETPLACE_TOKEN` bound. It was findable only because D-20 adopted the file;
assessing it through its two text neighbours would have missed it entirely.

**Exactly one of the 19 flagged npm packages reaches an end user.** `.vscodeignore:8` excludes
`node_modules` from the VSIX, so the shipped surface is the two esbuild bundles. Grepping them:
`vsce`, `undici`, `markdown-it`, `shell-quote`, `nanoid` and `postcss` return **0**;
`brace-expansion` returns **2** in `out/extension.cjs`, reached through
`vscode-languageclient@10.1.0 → minimatch@10.2.5` (itself outside every flagged range).

**One declaration accounts for 15 of the 19.** `@vscode/vsce` — a *publishing* CLI, imported by no
source file — sits under `dependencies` at `package.json:670`. Moving it to `devDependencies` removes
15 packages from the production closure in one edit. Two workflow comments already assert it *is* a
devDependency, which is referred to `RU-64-01` rather than recorded twice.

**`npm run lint` enforces nothing.** `eslint.config.js:16` is `rules: {}` with no `extends`;
`--print-config` reports 0 enabled rules across 120 files. The proof is two
`Unused eslint-disable directive` warnings — a developer suppressed `no-explicit-any` for a rule the
config never turns on.

**The `bbj-intellij` dependency tree is invisible to every process this repository operates.**
`.github/dependabot.yml` declares no `gradle` ecosystem (`P64-D6-005`, wave 2) and
`./gradlew --offline -q dependencies` exits 1 in 723 ms (`D-10`, this wave). Neither an automated
scanner nor a human currently produces a list of what it depends on. Fixing `P63-D6-002` would close
the second half retroactively.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] Dropped a false "unused dependency" claim before it reached the file**
- **Found during:** Task 2
- **Issue:** An initial `grep -rn "properties-reader" --include=*.ts` returned nothing, which would
  have supported recording `properties-reader@^3.0.1` as an unused production dependency inside
  `P64-D6-007`.
- **Fix:** Re-ran the grep without the `--include` filter before writing. `src/Commands/Commands.cjs:6`
  does `require("properties-reader")`. The claim was removed from the finding's scope; `P64-D6-007`
  records only the `@vscode/vsce` placement, which is independently verified.
- **Files modified:** none — the claim never reached `64-COVERAGE.md`.
- **Commit:** n/a (prevented, not corrected)

**2. [Rule 1 — Bug] Corrected the Guava severity from `high` to `moderate` after querying OSV**
- **Found during:** Task 2
- **Issue:** The criterion-3 table's Guava row was first written as `high`.
- **Fix:** Queried OSV for the two advisories' own `database_specific.severity`:
  `GHSA-7g45-4rm6-3mm3` is `MODERATE` and `GHSA-5mg8-w23w-74h3` is `LOW`. The row was corrected to
  `moderate`, both OSV ratings were cited inline, and a sentence was added to the totals paragraph
  explaining why a `moderate` row is nonetheless `file-issue`/`major` (a major-version bump in an
  FUT-01-excluded project whose Gradle wrapper is not committed).
- **Files modified:** `.planning/reviews/64-COVERAGE.md`
- **Commit:** `dc9e320`

**3. [Rule 1 — Bug] Fixed a contradictory `classification:` field in `P64-D4-006`**
- **Found during:** Task 3 self-review
- **Issue:** The field read `easy` while its own recorded test results said test (1) failed at a file
  count of two — an internal contradiction that would have mis-routed the finding into Phase 67's
  apply path and corrupted §C's `easy`/`major` split.
- **Fix:** Set `classification: major` and `disposition: major-refactor`, and stated explicitly that
  splitting the finding to clear the threshold was considered and rejected.
- **Files modified:** `.planning/reviews/64-COVERAGE.md`
- **Commit:** `df49036`

**4. [Rule 1 — Bug] Corrected two `package.json` line anchors**
- **Found during:** Task 2 verification
- **Issue:** `P64-D6-012` cited `package.json:691` for `vitest`; the actual line is `690`.
- **Fix:** Corrected in both the `location:` field and the `evidence:` text.
- **Files modified:** `.planning/reviews/64-COVERAGE.md`
- **Commit:** `dc9e320`

### Plan-text defects encountered (not "fixed" — reported per the standing instruction)

**A. Two `<precondition>` blocks carry stale pre-D-20 verdict counts.** Task 2's precondition states
"the phase-wide verdict count is exactly 22 with 5 placeholders remaining" and Task 3's states
"exactly 24 with 3". The true values after Tasks 1 and 2 are **23/6** and **26/3**, which are exactly
what those same tasks' own `<acceptance_criteria>` and `<verify>` blocks assert
(`test "$(grep -c … pass|fail …)" = 23` and `= 26`). The plan's own "Cell accounting for this plan"
paragraph also says "Task 1 records 4 verdicts … (phase-wide 19 → 23)". The preconditions are the
stale text; the mechanically-checked criteria are correct and were followed. Both prior waves hit
the same class of defect.

**B. One Task 4 acceptance criterion is mechanically unsatisfiable without violating a hard
prohibition, and was therefore satisfied in intent and documented in the artefact.** The criterion
requires `grep -c 'pending' .planning/reviews/64-COVERAGE.md` to print `0`. It prints **`5`**, and
none of the five is a placeholder:

| Line | Occurrence | Owner |
|---|---|---|
| `:105` | The skeleton's write-contract paragraph *describing* the placeholder convention | plan `64-01` |
| `:889` | `RU-64-03`'s closure: "No cell in this unit carries the `pending` placeholder" | plan `64-01` |
| `:922` | The substring inside **de·pending** — "`langium@4.3.1` depending on `chevrotain`" | plan `64-02` |
| `:1753` | `RU-64-01`'s closure, same phrasing as `:889` | plan `64-02` |
| §B | The gate command `grep -cE '… — pending$'` quoted verbatim with its literal output `0`, as D-18 requires | this plan |

Four of the five sit in text this plan's write contract explicitly forbids it to reword ("MUST NOT
reword or overwrite anything plans `64-01` and `64-02` recorded"), and one is a gate record that
removing would weaken. **The prohibition was honoured and the criterion's intent was met**: all three
placeholder *shapes* count zero — `^- (D[1-8]|\[file-exception\]) .* — pending$` → **0**,
`^_\(pending` → **0**, `\| pending \|` → **0**. A paragraph was added to close-out §G enumerating all
five residual substring matches with their owners, so a later reader running the bare `grep -c` finds
the explanation inside the artefact rather than a mystery. **Every other clause of Task 4's `<verify>`
passes.**

**C. Plan prose refers to `RU-64-02`'s tasks as "Task A / Task B / Task C"** in the skeleton's
`**Owning plan:**` line while the plan itself numbers them 1-3. Cosmetic; no action taken, since that
line is `64-01`'s text.

## Authentication Gates

None. No credential was required and none was requested. `npm audit` queried the public registry and
OSV/Gradle metadata were fetched over anonymous HTTPS.

## Verification

All four `<verify>` blocks were executed and pass:

- Task 1 → `P64_03_RU02_REPRO_OK`
- Task 2 → `P64_03_SEC08_OK`
- Task 3 → `P64_03_RU02_COMPLETE`
- Task 4 → `P64_CLOSED` (with the single `grep -c 'pending' = 0` clause adapted per deviation B; all
  other clauses pass unmodified)

Live gate outputs recorded in the artefact:

- **File gate:** `29`; zero absent basenames.
- **Cell gate part 1:** `7 27 29 56` (leading row count `7`, not `3`).
- **Cell gate part 2:** `grep -c 'gradle-wrapper.jar' INVENTORY.md` → `0`.
- **Phase total:** `8 29 35 64`, three sources in agreement.
- **This file's content:** 29 verdicts / 0 placeholders / 35 `n/a` / 64 cell lines.
- **Milestone verdict loop:** `50 35 35 29`; `n/a` loop `38 5 5 35`; total loop `88 40 40 64`.
- **Working tree:** `git status --porcelain bbj-vscode bbj-intellij java-interop .github .planning/reviews/INVENTORY.md .planning/reviews/61-COVERAGE.md .planning/reviews/62-COVERAGE.md .planning/reviews/63-COVERAGE.md`
  is empty — no source file modified, no immutable record touched, and therefore no automated
  dependency remediation was run.

## Commits

| Task | Commit | Subject |
|---|---|---|
| 1 | `ac649ee` | sweep RU-64-02 at tier repro — D1, D2, D3 and the wrapper JAR's D1 |
| 2 | `dc9e320` | SEC-08 dependency audit — D6 for RU-64-02 and both file-exception rows |
| 3 | `df49036` | complete RU-64-02 at tier trace — D4, D5, D8 — and close the unit |
| 4 | `7b5b1c5` | close Phase 64 — both D-18 gates re-run live, milestone coverage stated |

## What Phases 65-69 Inherit

- **Phase 65** — nothing as open work. SEC-07 and SEC-08 both close here. As context only,
  `RU-64-03`'s D1 records feed its SEC-04/SEC-05 picture.
- **Phase 66** — no `dedup:` names a `DEBT-*` requirement (all 44 resolve to `none`), so the
  inheritance is `P63-D6-002`'s re-triage, merged into `P64-D6-010`, which is `DEBT`-shaped work whose
  value exceeds its `medium` severity because applying it closes the Gradle enumeration gap.
- **Phase 67** — the **8** `classification: easy` findings and, within D6, the **3** `triage: fix-now`
  records. The largest single apply item is `P64-D6-013`, a lockfile-only `npm audit fix` bundle
  covering six moderate advisories, with an explicit instruction to verify `package.json` is
  untouched by the run.
- **Phase 68** — this whole file for DOC-03 (sections A and B close the scope gate), the
  `### Milestone coverage position (last sweep phase)` arithmetic, and the **36** `major` records for
  `MAJOR-REFACTORS.md`.
- **Phase 69** — all 44 `dedup:` verdicts for issue drafting, gated on ISSUE-01, under D-16's
  disclosure limits for `P64-D1-004`.

## Known Stubs

None. All 29 live cells carry a verdict and a written check line; all seven close-out sections and
the milestone subsection are filled; the inherited-item ledger's disposition column is resolved. No
placeholder of any shape remains (see deviation B for the five residual substring matches, none of
which is a placeholder).

## Self-Check: PASSED

- `.planning/reviews/64-COVERAGE.md` — FOUND
- `.planning/phases/64-build-ci-dependency-review/64-03-SUMMARY.md` — FOUND
- `ac649ee` — FOUND
- `dc9e320` — FOUND
- `df49036` — FOUND
- `7b5b1c5` — FOUND
