# Phase 64: Build, CI & Dependency Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 64-build-ci-dependency-review
**Mode:** `--auto` — Claude selected the recommended option for every question. No user prompts
were issued. Every selection below is auto-resolved and auditable against `64-CONTEXT.md`.
**Areas discussed:** Sweep decomposition & ordering, Recording shape, SEC-08 dependency evidence,
Vendored JAR provenance, SEC-07 workflow evidence, Triage vocabulary, Dead/thin dimensions,
Disclosure tier, Inherited work, Completion gates

---

## Sweep Decomposition & Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Tracer + one plan per unit (4 plans) | Mirror Phase 63 exactly: a standalone skeleton plan, then 3 unit plans | |
| One plan per unit (3 plans), tracer folded into `64-01` | With only 3 units, a standalone tracer produces a skeleton and nothing else | ✓ |
| Two plans (merge the two smaller units) | Combine `RU-64-03` and `RU-64-01` into one plan | |

**Choice:** One plan per unit, tracer folded into `64-01` → **D-01**
**Notes:** `[auto] Sweep decomposition — Q: "How many plans?" → Selected: "3 plans, tracer folded" (recommended default)`. Phase 63's 5-plan shape existed because it had 5 units; the tracer was never a unit of work in its own right.

---

## Plan Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| INVENTORY risk rank (`RU-64-03` → `RU-64-01` → `RU-64-02`) | The Phase 61-63 precedent, unchanged | ✓ |
| Largest-unit-first (`RU-64-02` first) | Front-load the 9,208-LOC unit | |
| SEC-first (both security units, then manifests) | Group SEC-07 + SEC-08 work together | |

**Choice:** Risk rank → **D-02**
**Notes:** `[auto] Ordering — Q: "What order?" → Selected: "INVENTORY risk rank" (recommended default)`. Noted in CONTEXT that this ordering is also correct for SEC-08 independently: the vendored-binary half (`RU-64-03`) lands before the npm/Gradle tree half (`RU-64-02`), so the later unit can reference the earlier rather than guess.

---

## Task Split Within Plans

| Option | Description | Selected |
|--------|-------------|----------|
| Two tasks per plan by evidence tier | Phase 63 D-15's shape applied uniformly to all 3 plans | |
| Two tasks for `64-01`/`64-02`, three for `64-03` | Give `RU-64-02`/D6 (all of SEC-08's tree half) its own task and commit | ✓ |
| Three tasks everywhere | Uniform but over-split for the two smaller units | |

**Choice:** Three-way split for `64-03` only → **D-03**
**Notes:** `[auto] Task split — Q: "How to split 64-03?" → Selected: "Task A repro / Task B SEC-08 / Task C trace" (recommended default)`. Rated **reversible** — internal to one plan's task list.

---

## Recording Shape / Format Checkpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Spend a fourth format checkpoint | Re-approve the recording shape with the user | |
| No new checkpoint — carry the frozen shape | Phase 61 D-05 froze it; Phases 62 and 63 each confirmed it transfers | ✓ |

**Choice:** No new checkpoint → **D-05**, with three Phase-64-specific subsections → **D-06**
**Notes:** `[auto] Recording shape — Q: "New format checkpoint?" → Selected: "No — carry frozen shape" (recommended default)`. The three new subsections (`SEC-07 Workflow Security Posture`, `SEC-08 Dependency Triage`, `Vendored Binary Provenance`) are direct analogues of Phase 63's `SEC-03 Integrity Posture` and do not alter the per-cell record format.

---

## SEC-08 — npm Half Evidence Method

| Option | Description | Selected |
|--------|-------------|----------|
| Live `npm audit --json`, output pinned with run date | Verified working in this environment | ✓ |
| Hand-walk `package-lock.json` against advisories | No tooling dependency, but not exhaustive and error-prone | |
| Defer the npm tree to a later phase | Would leave criterion 3 unanswerable | |

**Choice:** Live `npm audit`, pinned → **D-07**
**Notes:** `[auto] SEC-08 npm — Q: "How to enumerate?" → Selected: "live npm audit" (recommended default)`. Verified during discussion: `node_modules/` is populated (385 entries), `registry.npmjs.org` returns 200, and `npm audit` reports **19 vulnerabilities (7 moderate, 11 high, 1 critical)**. Pinning the run date is required because the query is live and its answer drifts.

---

## INVENTORY's Stale `node_modules` Note

| Option | Description | Selected |
|--------|-------------|----------|
| Record as a D8 finding against INVENTORY.md | Claim-vs-reality drift is exactly what D8 catches | ✓ |
| Silently work around it | Leaves the milestone's own scope document wrong | |
| Edit INVENTORY.md | Prohibited — Phase 60 D-09 makes it immutable | |

**Choice:** D8 finding on `RU-64-02`'s row → **D-08**
**Notes:** `[auto] INVENTORY drift — Q: "How to handle?" → Selected: "record as D8 finding" (recommended default)`. INVENTORY says `node_modules/` has *"0 packages present in this checkout"*; it now has 385 entries. The **exclusion still stands** — only its stated reason is stale. Precedent: Phase 60's D-15 correction log.

---

## Criterion 3 Triage Vocabulary

| Option | Description | Selected |
|--------|-------------|----------|
| Additive `triage:` field alongside `classification:` | Both vocabularies coexist with a stated mapping | ✓ |
| Repurpose `classification:` | Would break Phases 67 and 68, which read `easy`/`major` | |
| Prose-only triage in the SEC-08 section | Not machine-readable for Phase 69's issue drafting | |

**Choice:** Additive `triage:` field with a mapping table → **D-09**
**Notes:** `[auto] Triage vocabulary — Q: "New field or reuse?" → Selected: "additive triage: field" (recommended default)`. Mapping recorded: `fix-now`→`easy`, `file-issue`→`major`, `accepted-with-reason`→`major` (documented, not filed). Rated **costly** — Phases 68 and 69 read the field; changing its vocabulary later means re-triaging every D6 finding. Also decided: `accepted-with-reason` requires a written reachability argument, not "dev dependency, not shipped".

---

## SEC-08 — Gradle Half Evidence Method

| Option | Description | Selected |
|--------|-------------|----------|
| Static enumeration from declared coordinates + advisory lookup, with the transitive gap stated | Honest about what the toolchain cannot reach | ✓ |
| Fix the JDK toolchain first, then run `./gradlew dependencies` | Turns a review phase into a fix phase; belongs to 66/67 | |
| Mark the Gradle half n/a | Would abandon half of SEC-08 | |

**Choice:** Static enumeration with a stated coverage limitation → **D-10**
**Notes:** `[auto] SEC-08 Gradle — Q: "How to enumerate?" → Selected: "static + stated gap" (recommended default)`. Verified: `./gradlew --offline -q dependencies` → `BUILD FAILED in 5s` on the JDK 25.0.3 version check — the same failure Phase 63 recorded as `P63-D6-002`. Transitive Gradle dependencies are **not** enumerable here, and the cell says so. Precedent: Phase 63 D-07's non-building-toolchain honesty rule and its `extractTarGz` Not-reproducible disposition.

---

## Vendored JAR Assessment Method

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest + hash + `Class-Path` reasoning; no decompilation, no execution | Non-destructive, verified working | ✓ |
| Decompile and inspect bytecode | Disproportionate, and edges toward Phase 63 D-13's exploit prohibition | |
| Treat all three as unassessable | Would waste the two that *are* identifiable | |

**Choice:** Manifest-based provenance → **D-11**
**Notes:** `[auto] JAR provenance — Q: "How to assess?" → Selected: "manifest + hash, no decompile" (recommended default)`. Verified via `unzip -p <jar> META-INF/MANIFEST.MF`: `jcommander-1.71.jar` self-reports `Bundle-Version: 1.71` and `Bnd-LastModified` = 2017-04-27; `BBjCFCli.jar` reports `Created-By: 11.0.10+9 (AdoptOpenJDK)`, `Ant-Version: 1.10.8` and a `Class-Path` naming the other two; **`BBjCodeFomatter.jar` carries only `Manifest-Version: 1.0`** — no version, no vendor, no date. Decided that this unidentifiability *is* the D6 finding, `triage: file-issue`, and that the fix it asks for is provenance rather than a version bump.

---

## SEC-07 — Workflow Evidence Tier

| Option | Description | Selected |
|--------|-------------|----------|
| `trace` by construction; a valid D1 finding must name file:line + trigger + untrusted input + sink | Actions cannot be executed here | ✓ |
| Attempt to run workflows via `act` or a fork | Out of scope, and a fork-and-run recipe is exactly what D-16 forbids publishing | |
| Assert findings without a reachable trigger | Fails RVW-06 | |

**Choice:** `trace` with a mandatory named trigger → **D-12**
**Notes:** `[auto] SEC-07 evidence — Q: "What tier?" → Selected: "trace with named trigger" (recommended default)`. A sink with no reachable trigger is recorded as `pass` with a note, not as a finding. Scouted (and to be re-derived by the sweep): 36 `uses:` across 6 workflows; **no `pull_request_target` anywhere**; only `deploy-docs.yml` and `pr-vsix.yml` declare top-level `permissions:`; live secrets are `VSCE_PAT`, `JETBRAINS_MARKETPLACE_TOKEN`, `GITHUB_TOKEN`.

---

## Criterion 2 Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| 6×4 table, one row per workflow, every cell filled including "nothing to report" | Makes criterion 2 reader-verifiable rather than self-asserted | ✓ |
| Prose per workflow | Harder to audit for completeness | |
| Findings-only | A blank cell is indistinguishable from an unchecked one | |

**Choice:** Full 6×4 table → **D-13**
**Notes:** `[auto] Criterion 2 — Q: "How to render?" → Selected: "6×4 table, all cells filled" (recommended default)`. ROADMAP criterion 2 says *"every workflow's"* — four sub-questions × six files. Also decided that the absence of `pull_request_target` gets an explicit **positive** record, since Phase 60's standard already requires a no-finding `applies` cell to state what was checked.

---

## D7 Across the Phase

| Option | Description | Selected |
|--------|-------------|----------|
| Dead — `n/a — R-D7-CI` on all 7 rows, no parity work, `P64-D7-*` never issued | INVENTORY retires the dimension for this whole phase | ✓ |
| Look for parity findings opportunistically | Would invent a live cell the grid does not have | |

**Choice:** Dead → **D-14**
**Notes:** `[auto] D7 — Q: "Any parity work?" → Selected: "none — D7 dead phase-wide" (recommended default)`. Phase 62 read `bbj-intellij/` for its live D7 cells and Phase 63 read `bbj-vscode/` for its own; Phase 64 reads neither. If a plan wants a `P64-D7-*` ID, the finding belongs to a different dimension or unit and the plan says so.

---

## D5 Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Three-way split, each recorded differently, with already-owned failures cross-referenced by ID | Respects `R-D5-CI` and avoids double-recording | ✓ |
| Re-record the 11 known-failing tests here | Duplicates `RU-61-06` | |
| Treat D5 as n/a phase-wide | Contradicts the grid — it is live for two units | |

**Choice:** Three-way split → **D-15**
**Notes:** `[auto] D5 — Q: "What does D5 mean here?" → Selected: "three-way split" (recommended default)`. `RU-64-01`/D5 is `n/a — R-D5-CI`. `RU-64-02`/D5 and `RU-64-03`/D5 are live and mean *does the test configuration accurately describe and actually run the suite it claims to run*. The 11 failing tests (`RU-61-06`) and 3 disabled `parser.test.ts` assertions (DEBT-02) are already owned — cross-referenced by ID per Phase 62 D-14.

---

## Public-Repo Disclosure Tier

| Option | Description | Selected |
|--------|-------------|----------|
| Inherit the two-tier rule verbatim; no new user checkpoint | Phase 62 D-09's rendered shape was approved and Phase 63 D-13 carried it unchanged | ✓ |
| Spend a fourth disclosure checkpoint | Re-approves an unchanged rule at the cost of an interruption | |
| Record everything in full | Unacceptable — `RU-64-01` findings could describe stealing a live publishing credential from a public, forkable repo | |

**Choice:** Inherit verbatim, no checkpoint → **D-16**
**Notes:** `[auto] Disclosure — Q: "New checkpoint?" → Selected: "inherit verbatim" (recommended default)`. Flagged in CONTEXT that this rule bites harder here than in any prior phase: `RU-64-01` is the one unit whose critical/high findings, written as a recipe, would be a credential-theft procedure against a public repository. Surface + problem class + impact are recorded; trigger sequences, payloads and fork-and-run procedures are not. Rated **one-way** — over-disclosure survives in git history and cannot be undone by a later edit.

---

## Inherited Work

| Option | Description | Selected |
|--------|-------------|----------|
| Treat `P63-D6-002` as inherited work with a written disposition | Matches how Phases 62 and 63 handled their inherited referrals | ✓ |
| Cross-reference it without re-triage | Leaves Phase 63's routed item permanently unresolved | |

**Choice:** Re-triage with a written disposition in `64-03` → **D-17**
**Notes:** `[auto] Inherited work — Q: "How to handle P63-D6-002?" → Selected: "re-triage with disposition" (recommended default)`. Verified that Phases 61 and 62 route **nothing** to Phase 64 — neither close-out inheritance table has a Phase 64 row. Phase 63 additionally leaves `RU-64-02`/SEC-08 owning the IntelliJ Platform (`2024.2`), LSP4IJ (`0.19.0`) and Gradle wrapper versions; those sit in `RU-64-02`/D6, not in a separate ledger.

---

## Completion Gates

| Option | Description | Selected |
|--------|-------------|----------|
| Two gates re-derived live, with the 4 file-exception rows explicitly in the cell count | Phase 64 is the only sweep phase owning live file-exception rows | ✓ |
| Unit rows only (3×8 = 24 cells) | Would silently drop 32 cells — the lockfile and all three JARs | |
| Assert the totals from INVENTORY without re-deriving | Every prior sweep re-derived; assertion is what the gate exists to prevent | |

**Choice:** Two gates, file-exception rows included → **D-18**
**Notes:** `[auto] Gates — Q: "How to gate?" → Selected: "two gates, 7 rows" (recommended default)`. Cell gate must print **27 applies / 29 n/a / 56 cells** across 3 unit rows + 4 file-exception rows; file gate enumerates 27 files (6 workflows / 568 lines, 4 readable tool files / 1,240 lines + 3 JARs, 14 manifest files / 9,208 lines — all re-verified live against INVENTORY during this discussion and matching exactly). Also decided: `RU-D8-01` is **not** Phase 64's, no `P64-*` finding may live in `CLAUDE.md` / `VERBs.md` / `documentation/`, and — because this is the **last sweep phase** — `64-03`'s close-out states the milestone-level coverage position for Phase 68's DOC-03 claim.

---

## Claude's Discretion

Auto mode resolved every gray area, so nothing was deferred to Claude by a user. The following
were deliberately left unpinned for the planner and executing agents:

- Exact task boundaries within plans `64-01` and `64-02` (D-03 pins only `64-03`)
- Whether `npm audit --json` output is embedded verbatim, summarised, or both — provided the run
  date and totals are pinned
- Which advisory database is cited for Gradle-side coordinates, provided each claim resolves
- Dimension ordering inside a unit section, provided every `applies` cell is present

## Deferred Ideas

- Fixing any of the 19 npm vulnerabilities — Phase 67
- Replacing or rebuilding the vendored formatter JARs — major refactor, Phase 69 if approved
- Adding `permissions:` blocks to the 4 workflows lacking one — Phase 67 if classified `easy`
- Adding a `src/test/` source set to `bbj-intellij` — Phase 63 D-08's finding, Phase 66/67
- Resolving the JDK 17-vs-25 toolchain mismatch — Phase 66/67; would retroactively close D-10's
  stated Gradle enumeration gap, worth noting in the re-triage
- Reviewing `RU-D8-01` — cross-cutting, owned by no sweep phase
- Adding dependency scanning to CI (Dependabot / audit gate / Gradle plugin) — a new capability
  surfaced by this work, belongs in a future milestone
