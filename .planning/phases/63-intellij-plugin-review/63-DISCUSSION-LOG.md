# Phase 63: IntelliJ Plugin Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 63-IntelliJ Plugin Review
**Mode:** `--auto` — all gray areas auto-selected; every question resolved to its recommended
option with no user prompt. Each `[auto]` line below is the audit record for one question.
**Areas discussed:** Sweep decomposition & ordering, Recording shape, D7 direction & location
boundary, Inherited referral triage, Evidence under a non-building toolchain, D5 under zero test
infrastructure, Easy-vs-major classification, Dependency health scope, Security boundary vs
Phase 65, Disclosure tier, Cell content & task split, Scope fidelity & gates

`[--auto] Selected all gray areas: Sweep decomposition & ordering, Recording shape, D7 direction &
location boundary, Inherited referral triage, Evidence under a non-building toolchain, D5 under
zero test infrastructure, Easy-vs-major classification, Dependency health scope, Security boundary
vs Phase 65, Disclosure tier, Cell content & task split, Scope fidelity & gates.`

---

## Sweep Decomposition & Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Tracer + one plan per unit (5 plans), tracer sweeps `RU-63-03` | Skeleton and the rank-1 unit in one plan; front-loads SEC-03 and the only live D6 cell | ✓ |
| Skeleton-only tracer, then 5 unit plans (6 plans) | Cleaner separation, one extra wave, skeleton unproven by real content | |
| Two plans grouped by risk band | Fewer waves, but a 2,067-LOC unit shares a plan with a 888-LOC one | |

`[auto] Sweep decomposition — Q: "How is Phase 63 decomposed into plans?" → Selected: "Tracer + one
plan per unit = 5 plans, tracer sweeps RU-63-03" (recommended default)` → **D-01**

`[auto] Plan ordering — Q: "What order do the five plans run in?" → Selected: "INVENTORY risk rank:
RU-63-03 → RU-63-01 → RU-63-04 → RU-63-05 → RU-63-02" (recommended default)` → **D-02**

`[auto] Write contract — Q: "How is the shared 63-COVERAGE.md write protected?" → Selected: "One
wave per plan, depends_on chain in risk-rank order" (recommended default, Phase 61 D-03/D-04 →
Phase 62 D-04)` → **D-04**

**Notes:** Front-loading `RU-63-03` puts SEC-03 (the phase's only named security requirement) and
D6 (its only live dependency-health cell) into the same first plan, matching how Phase 61 front-
loaded SEC-06 and Phase 62 front-loaded SEC-01.

---

## Recording Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Copy Phase 62's frozen shape; add 3 named elements, no checkpoint | Format question already answered twice; three additions defined up front | ✓ |
| Spend a third `checkpoint:decision` on format | Safest, but re-litigates a question frozen at Phase 61 D-05 and confirmed at Phase 62 D-03 | |
| Design a Phase 63-specific layout | No precedent to reuse; breaks Phase 68's DOC-03 concatenation | |

`[auto] Recording shape — Q: "Does Phase 63 spend a format checkpoint?" → Selected: "No new format
checkpoint — copy 62-COVERAGE.md's shape, add three named elements" (recommended default)` → **D-03**

**Notes:** The three additions are `### SEC-03 Integrity Posture` (`RU-63-03`),
`### Inherited referral triage` (per owning unit), and `### Cross-phase observations (VS Code side)`
(close-out). Rated **costly** to reverse — four downstream plans and Phase 68 inherit the skeleton.

---

## D7 Direction & Location Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror Phase 62 D-05: read `bbj-vscode/` as reference only, no `P63-*` located there | Symmetric with the boundary Phase 62 already proved; no double-counted cells | ✓ |
| Allow `P63-*` findings located in `bbj-vscode/` where the defect is clearly there | Would double-count against INVENTORY's 232-cell total and re-open closed rows | |
| Skip D7 and let Phase 65 synthesize parity | D7 `applies` on 4 of 5 rows — leaving them unfilled fails the D-17 cell gate | |

`[auto] D7 direction — Q: "How is D7 assessed now that Phase 63 owns the IntelliJ side?" →
Selected: "Mirror Phase 62 D-05 with the prohibition reversed" (recommended default)` → **D-05**

`[auto] VS Code-side observations — Q: "Where do VS Code-side defects found during D7 go, given
Phase 62 is closed?" → Selected: "A ### Cross-phase observations (VS Code side) subsection in
63-COVERAGE.md's close-out; do not reopen or edit 62-COVERAGE.md" (recommended default)`
→ **D-05**

**Notes:** This is the one place Phase 62's referral mechanism does not transfer symmetrically —
Phase 62 could refer forward to an unstarted Phase 63; Phase 63 has no open phase to refer back to.
Alternative considered and rejected: appending to `62-COVERAGE.md`, which would edit a verified,
closed phase's deliverable.

---

## Inherited Referral Triage

| Option | Description | Selected |
|--------|-------------|----------|
| Ledger in CONTEXT + `### Inherited referral triage` per owning unit, 3 dispositions, countable gate | Makes inherited work as visible as a blank cell | ✓ |
| Handle referrals inline wherever they happen to come up | Untracked; an unaddressed referral becomes invisible | |
| Treat referrals as optional background reading | Contradicts Phase 62 D-06's "durable records, re-triaged" framing | |

`[auto] Referral handling — Q: "How are Phase 62's 7 referrals discharged?" → Selected: "Per-unit
### Inherited referral triage subsection with one of three dispositions each, plus a countable
gate" (recommended default)` → **D-06**, gate 3 of **D-17**

`[auto] Duplicate referrals — Q: "Referrals 4 and 5 describe the same SETOPTS absence from two
Phase 62 units. One disposition or two?" → Selected: "Triage once on RU-63-04, naming both source
referrals" (recommended default)` → **D-06**

**Notes:** Distribution is 3 → `RU-63-01`, 2 → `RU-63-02`, 2 → `RU-63-04`, 0 → `RU-63-03`/`RU-63-05`.
Phase 61 Plan 06's handling of its 4 inherited referrals (2 promoted, 1 dismissed with evidence,
1 promoted) is the worked precedent.

---

## Evidence Under a Non-Building Toolchain

| Option | Description | Selected |
|--------|-------------|----------|
| Lock trace-only evidence; forbid plans that schedule build/test runs | Matches the verified environment; INVENTORY 3b's second `repro` branch permits it | ✓ |
| Plan for runnable repros and let executors discover the failure | Guarantees blocked tasks mid-phase | |
| Fix the toolchain first, then sweep | Environment work inside a review phase; blocks the deliverable on unrelated setup | |

`[auto] Evidence approach — Q: "How do D1/D2/D3 findings clear the repro tier when the build does
not run?" → Selected: "Line-by-line trace per INVENTORY 3b's second branch; no finding claims a
runnable reproduction" (recommended default)` → **D-07**

**Notes:** Verified live during this discussion, not assumed —
`cd bbj-intellij && ./gradlew --offline -q tasks` → `BUILD FAILED ... * What went wrong: 25.0.3`
in 5s (Temurin 25.0.3 vs `JavaVersion.VERSION_17` at `build.gradle.kts:12-13`). It fails before task
listing, so nothing build-driven is available. Rated **reversible** — if a JDK 17 appears mid-phase,
a repro may be added.

---

## D5 Under Zero Test Infrastructure

| Option | Description | Selected |
|--------|-------------|----------|
| One systemic finding (`P63-D5-001` on `RU-63-03`); other 4 units cross-reference by ID + own consequence | Cells genuinely filled, no five-fold restatement — Phase 62 D-12's pattern applied to D5 | ✓ |
| Five independent D5 findings, one per unit | Five records of one fact; inflates the finding count without adding information | |
| One finding, other four cells record `pass` | A unit with zero tests does not pass D5 | |

`[auto] D5 recording — Q: "How are five D5 cells recorded over one systemic absence?" → Selected:
"Single P63-D5-001 on RU-63-03, cross-referenced by ID from the other four with per-unit
consequences" (recommended default)` → **D-08**

**Notes:** Verified — `ls bbj-intellij/src/` prints only `main`;
`grep -rn "test" bbj-intellij/build.gradle.kts` returns nothing. INVENTORY never states this fact,
so it would otherwise surface for the first time mid-sweep.

---

## Easy-vs-Major Classification

| Option | Description | Selected |
|--------|-------------|----------|
| Test (4) fails for behavioural fixes (`major`); satisfied vacuously for non-behavioural ones | Keeps a real easy path for doc/dead-code edits; no untested behavioural change reaches Phase 67 | ✓ |
| Blanket `major` for every Phase 63 finding | Classifies "fix a wrong Javadoc" as a major refactor — plainly false | |
| Treat test (4) as not-applicable for the whole plugin | Lets behavioural IntelliJ fixes into Phase 67 with no verification story at all | |

`[auto] Classification — Q: "How does D-13 test (4) resolve with no test harness?" → Selected:
"Fails for behaviour-changing fixes; satisfied vacuously where no behaviour can regress; the
reading is stated in each six-test log" (recommended default)` → **D-09**

**Notes:** Rated **costly** to reverse — the `easy`/`major` split feeds Phase 67's apply path and
both Phase 68 deliverables directly. Test (6) already blocks D1 and `critical`/`high` findings from
the easy path independently.

---

## Dependency Health Scope (the one live D6 cell)

| Option | Description | Selected |
|--------|-------------|----------|
| `RU-63-03`/D6 covers the Node.js pin + the routed Gradle JDK item, with the location exception stated | Honors INVENTORY's routing table, which names Phase 63 explicitly | ✓ |
| Push the routed item to Phase 64 because `build.gradle.kts` is `RU-64-02`'s file | Contradicts the routing table; leaves the routed item unowned | |
| Run a full Gradle dependency audit here | Duplicates `RU-64-02`/SEC-08 under a different heading | |

`[auto] D6 scope — Q: "What does Phase 63's single live D6 cell cover?" → Selected: "The
NODE_VERSION v20.18.1 pin plus the routed JDK 17-vs-25.0.3 toolchain item, with the build.gradle.kts
location exception recorded explicitly" (recommended default)` → **D-10**

**Notes:** The location exception is the phase's only deliberate departure from
location-decides-ownership. The record's `dedup:` field names `RU-64-02` as the file's owner for
every other dimension so Phase 64 re-triages rather than re-reports.

---

## Security Boundary vs Phase 65

| Option | Description | Selected |
|--------|-------------|----------|
| SEC-03 closes here as a narrative subsection + records; SEC-04/SEC-05 findings recorded here, synthesis to Phase 65 | Mirrors Phase 62 D-07/D-08; no D1 cell filled with a pointer | ✓ |
| Defer all IntelliJ security to Phase 65 | Leaves `RU-63-03`'s D1 cell and ROADMAP criterion 2 unanswered | |
| Do the full SEC-04/SEC-05 cross-IDE synthesis here | Duplicates Phase 65's contracted work with colliding dedup | |

`[auto] SEC-03 ownership — Q: "Is SEC-03 discharged in Phase 63 or handed to Phase 65?" →
Selected: "Discharged here in full, as a ### SEC-03 Integrity Posture subsection stating transport,
checksum/signature, extraction path safety and cache trust as facts" (recommended default)`
→ **D-11**

`[auto] SEC-04/SEC-05 boundary — Q: "What does Phase 63 record vs defer for EM token and process
spawning?" → Selected: "Record concrete file:line findings here; Phase 65 adds only the
cross-module/cross-IDE synthesis" (recommended default, Phase 62 D-07 carried forward)` → **D-12**

**Notes:** `BbjNodeDownloader.java` was grepped for structure during this discussion — pinned
version, base URL, `ZipInputStream` extraction, temp/cache paths — and every landmark is recorded in
CONTEXT as a starting point, explicitly not as a verdict.

---

## Disclosure Tier

| Option | Description | Selected |
|--------|-------------|----------|
| Two-tier rule carried forward verbatim, rationale tightened for SEC-03 | Consistent with Phases 61-62; the strictest justification yet | ✓ |
| Full detail for everything | The affected artifact is an executable binary fetched over the network in a public repo | |
| Redact all D1 findings regardless of severity | Removes the `file:line` anchors Phase 67 needs for `medium`/`low` fixes | |

`[auto] Disclosure — Q: "How are critical/high D1 findings rendered in a public repo?" → Selected:
"Name surface, problem class and impact; no trigger sequence, no payload, no PoC. Everything else
full detail" (recommended default)` → **D-13**

**Notes:** Neither prior phase's mitigating argument transfers — there is no "already needs local
access" and no "developer-typed input only" here.

---

## Cell Content & Task Split

| Option | Description | Selected |
|--------|-------------|----------|
| `pass` + written checks phrased against REQUIREMENTS.md; 2 tasks split by evidence tier | Phase 61 D-06/D-07 → Phase 62 D-10/D-11, carried forward | ✓ |
| Bare `pass` verdicts | Weaker evidence than an `n/a` exclusion | |
| One task per dimension (7-8 tasks per unit) | Recording cost with no auditability gain for DOC-03 | |

`[auto] Cell content — Q: "What does a no-finding applies cell record?" → Selected: "pass plus a
written line naming the concrete checks, phrased against that dimension's REQUIREMENTS.md wording"
(recommended default)` → **D-14**

`[auto] Task split — Q: "How do the live dimensions split into tasks?" → Selected: "Task A =
repro-tier (D1, D2, D3, D7 — plus D6 on RU-63-03 only); Task B = trace-tier (D4, D5, D8)"
(recommended default)` → **D-15**

**Notes:** `RU-63-03` is the only unit whose Task A carries 5 dimensions and excludes D7; a uniform
4/3 template is wrong for it.

---

## Scope Fidelity & Gates

| Option | Description | Selected |
|--------|-------------|----------|
| Sweep all 61 files; three countable gates (cells, files, referrals); `plugin.xml` context-only | Grid is the contract, criteria are a subset — Phase 62 D-13/D-14 carried forward and extended | ✓ |
| Sweep only the files ROADMAP criterion 1 names | Leaves grid cells unfilled — a visible coverage gap under Phase 60 D-09 | |
| Two gates only (cells + files), referrals tracked informally | Inherited work is the easiest thing to skip; it needs the same countability as a blank cell | |

`[auto] Scope fidelity — Q: "Are all 61 files swept, or only those ROADMAP names?" → Selected: "All
61; the close-out states which surfaces were covered beyond the criteria" (recommended default)`
→ **D-16**

`[auto] Completion gates — Q: "What makes 'swept' countable?" → Selected: "Three gates — 35/5/40
cells re-derived from INVENTORY, 61 files enumerated from the tree, 7+1 referrals/routed items
dispositioned" (recommended default)` → **D-17**

`[auto] Swept tree — Q: "Which tree does the sweep read?" → Selected: "HEAD of
v4.0-stability-and-quality, SHA recorded once by 63-01 at execution time, not pinned here"
(recommended default)` → **D-18**

`[auto] Codebase maps — Q: "Are .planning/codebase/*.md readable during this sweep?" → Selected:
"Prohibited — all seven predate bbj-intellij/ entirely" (recommended default)` → **D-19**

**Notes:** Gates 1 and 2 were run live during this discussion (`35 5 40`; `61`) and both agree with
INVENTORY. Gate 3's ledger was assembled from `62-COVERAGE.md` §D Group 2 plus INVENTORY's routing
table.

---

## Claude's Discretion

- The per-unit stopping rule beyond cell coverage (Phase 62's three-part rule plus D-06's referral
  disposition is the obvious carry-forward).
- Whether `RU-63-02`'s 18 files are grouped into sub-clusters or swept flat.
- Read depth for `ComposerModels.java` (245 lines of DTOs declaring the TypeScript side the single
  source of truth).
- Whether referral #3 (`bbj.refreshJavaClasses`) is dispositioned under `RU-63-01` or `RU-63-05`.
- How far to pursue the LSP4IJ experimental-API count for DEBT-05, given the "19" figure is not
  greppable from this tree (0 `@ApiStatus.Experimental` annotations here; 20 lsp4ij references
  across 10 files).

## Deferred Ideas

- Installing a JDK 17 toolchain so `./gradlew build` runs (Phase 67 setup or a quick task — FIX-03
  needs it, Phase 63 does not).
- Adding a `src/test/` source set to `bbj-intellij` (the fix for `P63-D5-001`; `major` by D-09).
- Reviewing `bbj-vscode/` (complete — Phase 62).
- Reopening or editing `62-COVERAGE.md` (rejected; observations go to Phase 63's close-out).
- `bbj-intellij/src/main/resources/` beyond `plugin.xml`-as-context (INVENTORY exclusion).
- Re-auditing Gradle/IntelliJ-Platform/LSP4IJ versions (`RU-64-02`/SEC-08, Phase 64).
- Fixing anything found (Phase 67 / Phases 68-69).
- Resolving DEBT-05 (Phase 66).
- Regenerating `.planning/codebase/*.md` (deferred at Phase 60 D-16; reading prohibited by D-19).
