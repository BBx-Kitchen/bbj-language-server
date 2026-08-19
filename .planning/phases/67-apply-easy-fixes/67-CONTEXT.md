# Phase 67: Apply Easy Fixes - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** interactive (default) — see `67-DISCUSSION-LOG.md` for the per-question audit trail.

<domain>
## Phase Boundary

This phase **applies source changes**. It is the only phase in the v4.0 milestone that does so
(Phase 66 D-01: "Phase 67 is the only phase that applies fixes").

It delivers:

1. **Every finding dispositioned `easy-fix` by Phases 61–66, applied**, each traceable to its
   finding ID by commit message, with a regression test where the rule in D-08 requires one.
2. **`.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md`** — the phase's closed denominator:
   a derived ledger of all 77 `easy-fix` records with a per-row apply/exclude verdict, the
   verification each fix carried, and its commit hash.
3. **A recorded test/build baseline delta** discharging FIX-03 under the wording of D-05.

### The denominator, measured

Parsed from the six closed COVERAGE files (`.planning/reviews/61-COVERAGE.md` …
`66-COVERAGE.md`) at context-gathering time:

| | Count |
|---|---|
| Total finding records | 224 |
| `disposition: major-refactor` | 144 |
| `disposition: wontfix` | 3 |
| **`disposition: easy-fix`** | **77** |
| — excluded by D-02/D-03 | 3 |
| — merged pair (D-04) | 2 records → 1 edit |
| **Distinct edits this phase applies** | **73** |

Easy-fix records by originating phase: 61 → 44, 62 → 14, 63 → 10, 64 → 8, 66 → 1.

Apply set by tree: `bbj-vscode/src` + config → 54, `bbj-vscode/test` → 5, `bbj-intellij/` → 9,
`CLAUDE.md` → 3, `.github/workflows/` → 3.

Apply set by primary dimension: D2 → 25, D8 → 17, D5 → 13, D4 → 11, D3 → 4, D6 → 3, D7 → 1.

### What this phase does NOT do

- **No `major-refactor` finding is applied.** All 144 route to Phase 68's `MAJOR-REFACTORS.md`.
  The easy/major classification (INVENTORY §3c) is the single routing rule; this phase does not
  re-triage it.
- **No write to `.planning/reviews/INVENTORY.md`** — immutable for v4.0 (Phase 60 D-09).
- **No write to any closed `6N-COVERAGE.md`** — the six sweep records are closed.
- **No write to the GitHub tracker.** Phase 69 is the only phase that files, under ISSUE-01.
- **No assembly of `EASY-FIXES.md` / `MAJOR-REFACTORS.md`.** Those are Phase 68's DOC-01/DOC-02
  deliverables. See D-14 for how FIX-04 is discharged without crossing that boundary.
- **No opportunistic cleanup.** Every edit in this phase traces to a finding ID in the ledger.

</domain>

<decisions>
## Implementation Decisions

Decision IDs are **phase-local** (`D-01`..`D-14`). Phase 60–66's `D-nn` IDs are separate
namespaces; where one is meant it is written as "Phase 6N D-nn".

### The Apply Denominator

- **D-01: The denominator is a derived artifact, `67-APPLY-SET.md`.** It is produced
  mechanically from the six COVERAGE files by selecting every record whose `disposition:` field
  begins `easy-fix`, and it carries one numbered row per record with: finding ID, unit,
  `file:line`, primary dimension, severity, effort, apply-or-exclude verdict, the verification
  performed, and the resulting commit hash(es).

  This mirrors the constructed-denominator shape Phases 65 and 66 used when INVENTORY handed
  them no closed grid. Completeness is provable against the ledger rather than by summing plans:
  77 rows in, every exclusion argued in writing, no row silently absent.

  — **Reversibility:** reversible — the ledger is a new planning file; deleting or regenerating
  it touches nothing else.

- **D-02: Apply scope is every tree except `.planning/`.** `bbj-vscode/` source, config and
  tests; `bbj-intellij/` Java; `CLAUDE.md`; `.github/workflows/`; `bbj-vscode/package-lock.json`.
  Findings are not deferred for living outside `src/` — a finding recorded as `easy-fix` is
  applied unless a rule below excludes it.

- **D-03: The two INVENTORY findings are excluded, on their own recorded reason.**
  `P64-D8-003` (a one-parenthetical correction at `INVENTORY.md:938`) and `P64-D8-004` (a two-row
  addition plus totals adjustment at `INVENTORY.md:964`) each state **in their own disposition
  text** that they are not applied by this phase, because INVENTORY is immutable for v4.0
  (Phase 60 D-09). The ledger records both as `excluded — INVENTORY immutable (Phase 60 D-09)`,
  quoting the record's own wording. This phase does not re-argue the exclusion; it honours it.

- **D-04: `P61-D2-011` and `P66-D2-001` are one edit, committed once, citing both IDs.**
  Both point at `bbj-vscode/src/language/bbj-type-inferer.ts:75-76`, and both name the same edit
  — a fallback in `getTypeInternal`'s `isJavaMethod` branch for a `JavaMethod` whose
  `resolvedReturnType` was never populated. `P66-D2-001` is Phase 66's DEBT-03 re-triage and
  cites `P61-D2-011` by ID as the original reproduction.

  One commit, both finding IDs in the subject, both ledger rows closed against it. Neither
  record is rewritten. FIX-01's intent — one finding traceable to one self-contained change —
  holds: this is one change that happens to close two records of the same defect.

  Related: `P61-D5-009` (`bbj-type-inferer.ts:73-78`) is the untested-regression angle on the
  same lines and is a **separate** D5 record with its own commit under D-11.

- **D-05: The easy/major classification is applied, never re-litigated.** Every one of the 224
  records carries a `classification:` field with the six INVENTORY §3c tests recorded pass/fail,
  and a `disposition:` derived from it. Phase 67 reads those fields as given.

  It does **not** promote a `major-refactor` record because the edit looks small, and does not
  demote an `easy-fix` record because the edit looks risky. Several major records say in their own
  text that the edit is mechanical — `P61-D1-001` passes five of the six tests and is `major`
  solely because test 6 routes every D1 finding away from this phase's apply path. That safety
  gate only works if this phase honours it.

  The one place judgement enters is D-15's deferral, which excludes an `easy-fix` record on
  verifiability grounds while leaving its classification untouched.

  — **Reversibility:** reversible — no record is edited, so any later phase can still act on the
  full corpus.

- **D-06: `P64-D4-004` is applied on its own, and the departure is recorded.** Its disposition
  says it "should be applied alongside the `P64-D3-002` decision about `build.yml`'s `paths:`
  filter rather than before it, since both edit the same `on:` block". `P64-D3-002` is
  `major-refactor` and out of scope for this phase, so the sequencing cannot be honoured.

  The ledger row states that plainly: the reviewer's "alongside" note could not be followed
  because the paired finding is major and routes to Phase 68. The easy/major classification stays
  the single routing rule; a reviewer aside does not override it, and it is not quietly dropped
  either.

  — **Reversibility:** reversible — a one-glob edit inside one workflow's `on:` block.

### The Green-Suite Gate (FIX-03)

- **D-07: FIX-03 is discharged as a baseline delta, and the shortfall is stated plainly.**

  FIX-03 as written ("`npm test` and `npm run lint` are clean in `bbj-vscode/`, and
  `./gradlew build` succeeds in `bbj-intellij/`") is **not achievable in this environment**, and
  `INVENTORY.md` §"Test & Build Baseline" already records why with dated evidence:

  - **11 deterministic `npm test` failures**, all in
    `test/linking.test.ts > Linking Tests > Interop related tests`, all traced to an unreachable
    java-interop peer / no `bbjdir`. Opening a listener on port 5008 was tried and does **not**
    fix them (Phase 64 D-06).
  - **Load-dependent `beforeAll` timeouts** — `WorkspaceManager.initializeWorkspace()` exceeds
    vitest's default 10s `hookTimeout` under contention, marking whichever suite is running as
    failed with its tests reported skipped. It hit different suites on each recorded run.
  - **2 pre-existing lint warnings** in `bbj-document-symbol-provider.ts` (but see D-09).
  - **`./gradlew build` aborts** on a build-script Java version check: `build.gradle.kts` sets
    `sourceCompatibility`/`targetCompatibility` to `JavaVersion.VERSION_17` and the only
    installed JDK is Temurin **25.0.3** at `/opt/java/default`. Gradle 8.13 itself starts fine —
    this is not a bootstrap rejection.

  **The gate becomes:** capture a baseline on the phase's start commit; re-run at phase close;
  require the failure set to be **identical or smaller**. The close-out states in plain words
  that literal cleanliness was not achieved, names the 11 interop failures and the JDK-17 gap as
  the reason, and does not claim a green suite it did not produce.

  This is the same honesty shape Phase 66 D-01/D-02 used for DEBT-06 — say what is true at phase
  end rather than restating the requirement's wording as if it had been met.

  **FIX-03's text in `REQUIREMENTS.md` is not edited.** The requirement stands; the close-out
  records how it was discharged and where it fell short.

  — **Reversibility:** reversible — a measurement convention, not a code change.

- **D-08: The baseline compares failing test NAMES, not file or skip counts.** The 11 interop
  failures are deterministic and individually named in INVENTORY's baseline table. A suite marked
  failed purely by a `beforeAll` hook timeout is recorded as **flaky** and excluded from the
  comparison, with the exclusion argued per occurrence (name the suite, name the timeout, note it
  did not reproduce). File-level and skip-level counts are recorded as observations, never as
  gate criteria — INVENTORY documents them varying run-to-run with no source change.

- **D-09: Targeted runs per commit, full baseline-delta run per plan.** Each commit runs
  `npm run build` plus `npx vitest run <the test files its fix touches>`. A full baseline-delta
  run happens once per `PLAN.md` and once at phase close. With ~8–12 commits per plan,
  attribution stays sharp while full-suite runs drop from ~100 to under 10 — and each avoided
  full run is one fewer roll of the flaky-hook dice.

- **D-10: Lint ends genuinely clean, via a finding, not via housekeeping.** The 2 pre-existing
  "unused eslint-disable directive" warnings at
  `bbj-document-symbol-provider.ts:75` and `:149` **are** finding `P61-D4-010` — its evidence
  field is literally those two `npm run lint` warnings, both guarding a `(astNode as any).name`
  read that no longer trips `@typescript-eslint/no-explicit-any`.

  Applying `P61-D4-010` clears both. So lint reaches literal cleanliness, the commit stays
  finding-keyed, and no untracked edit ships. `P61-D2-014` also touches this file
  (`:155,173-182`, sibling nodes keyed by start position only) and is a separate commit.

### Regression Tests (FIX-02)

- **D-11: "Behaviour-changing" is decided by primary dimension, with a per-record override.**

  | Primary dimension | Count in apply set | Regression test required? |
  |---|---|---|
  | D2 Correctness & error handling | 25 | **Yes** |
  | D3 Performance & resource use | 4 | **Yes** |
  | D7 Cross-IDE parity | 1 | **Yes** (but see D-13) |
  | D5 Test coverage gaps | 13 | The fix **is** the test (D-12) |
  | D4 Maintainability & code smells | 11 | No — no behaviour change |
  | D8 Comment & doc accuracy | 17 | No — no behaviour change |
  | D6 Dependency health | 3 | Tool-native check (D-14) |

  **30 fixes require a regression test.** Any record whose own text contradicts its dimension
  default overrides it, and the override is argued in that ledger row — mechanical where it can
  be, judged where it must be, and visibly so either way.

- **D-12: Test-first for behaviour-changing fixes — red commit, then green commit.**
  Commit the failing test first, then the fix. The red state is permanently in git history and
  re-checkable by anyone later; nothing rests on a transcript that cannot be re-run.

  **FIX-01's "own atomic commit" reads as: the commit pair is the atomic unit.** Both commits
  carry the same finding ID in the subject — `test(P61-D2-011): …` then `fix(P61-D2-011): …` —
  and the ledger records the pair against one row. This reading is stated explicitly here so
  verify-phase does not read a red/green pair as a FIX-01 violation.

  **FIX-01's text in `REQUIREMENTS.md` is not edited.**

  Estimated commit count: 73 edits + 30 red-test commits ≈ **103 commits**.

  — **Reversibility:** costly — the convention is cheap to change, but re-shaping commits already
  pushed means a history rewrite across ~100 commits.

- **D-13: D5 test-coverage gaps land as one commit, with fail-before recorded as inapplicable.**
  A D5 fix adds a missing test against code that already works, so a red state is impossible —
  the test passes the moment it is written. Those 13 fixes land as a single commit each, and the
  ledger row records that FIX-02's fail-before clause **does not apply**, with the reason. No
  invented red state, and no silent skip of the requirement either.

### Fixes This Environment Cannot Verify

- **D-14: The 9 applied `bbj-intellij/` fixes are verified by review, and the gap is recorded.**
  No JDK 17 exists on this machine, so `./gradlew build` cannot run (D-07). All 10 IntelliJ
  easy-fix records are `low` severity, and 8 of 10 are comment/doc (D8 ×6) or naming/maintain-
  ability (D4 ×2) edits that cannot change bytecode behaviour:

  `P63-D4-001`, `P63-D8-001` (`BbjNodeDownloader.java`), `P63-D8-002` (`BbjCompileAction.java`),
  `P63-D8-003` (`BbjEMTokenStore.java`), `P63-D8-005` (`ComposerModels.java`), `P63-D8-006`
  (`BbjServerLogToolWindowFactory.java`), `P63-D8-007` (`BbjServerService.java`), `P63-D4-014`
  (`BbjIcons.java`), `P63-D8-008` (`BbjColorSettingsPage.java`).

  Each is verified by reading the finding's named edit against the applied diff. The ledger and
  the close-out both record that **no compile and no test ran** for these nine, and why.

- **D-15: `P63-D7-004` is deferred — the one easy fix this phase deliberately does not apply.**
  It is a D7 cross-IDE parity fix in `ComposerModels.java:18-23,75-84`. D-11 says D7 requires a
  regression test; no Gradle test can run here. Rather than apply it untested or reclassify it,
  it is held. The ledger row records: deferred, the reason (no JDK 17 → no Gradle test), and the
  test that would prove it once a supported JDK exists.

  This is the only `easy-fix` record excluded for a reason this phase originates — D-03's two are
  excluded on the reviewer's own recorded reason.

  — **Reversibility:** reversible — a later phase applies it unchanged once the JDK is available.

- **D-16: Lockfile and workflow fixes use the strongest check their artifact type admits.**
  - **`P64-D6-009`, `P64-D6-013`** (`bbj-vscode/package-lock.json`): verify by `npm ci`, then
    `npm audit`, then the baseline-delta suite run — the dependency actually resolves and nothing
    regresses.
  - **`P64-D2-004`** (`pr-validation.yml`), **`P64-D6-004`** and **`P64-D4-004`** (`build.yml`):
    verify by YAML parse, plus `actionlint` if it is available on the machine.

  No test is invented for an artifact that cannot carry one. The ledger records for the three
  workflow fixes that **no CI run occurred**, so the check stops at static validity.

### Claude's Discretion

Two gray areas were surfaced but not discussed. Defaults are recorded here so planning is not
blocked; both are **correctable** — the planner should follow them unless the user says otherwise.

- **Plan and wave grouping.** Group plans by tree and by file so that the ~103 commits never
  produce two agents editing one file concurrently. Files carrying multiple fixes need their
  commits serialized within a single plan: `java-interop.ts` (7), `bbj-type-inferer.ts` (3, plus
  the D-04 merge), `bbj-ws-manager.ts` (3), `bbj-document-builder.ts` (3), `bbj.tmLanguage.json`
  (3), `document-formatter.ts` (3), and the pairs on `bbj-token-builder.ts`,
  `bbj-completion-provider.ts`, `bbj-document-symbol-provider.ts`, `builtin-functions-library.test.ts`,
  `decompile-io.ts`, `CLAUDE.md`, `build.yml`, `package-lock.json`,
  `BbjNodeDownloader.java`, `ComposerModels.java`. Ledger construction (D-01) is wave 1 and
  everything else depends on it.

- **FIX-04 and the Phase 67 / Phase 68 boundary.** FIX-04 requires user-facing behaviour changes
  to be "recorded in EASY-FIXES.md", but `.planning/reviews/EASY-FIXES.md` does not exist and is
  Phase 68's DOC-01 deliverable. **Default: Phase 67 does not create it.** Instead each ledger
  row in `67-APPLY-SET.md` carries the exact fields DOC-01 requires — finding ID, `file:line`,
  dimension, verified failure scenario, the fix applied, and the commit hash — so Phase 68
  assembles without re-deriving anything.

  Stated the way Phase 66 D-02 stated DEBT-06: **FIX-04 is not literally true at the end of
  Phase 67** — it becomes true when Phase 68 assembles the document. Phase 67 discharges its half
  by recording every behaviour change in a form Phase 68 can lift directly, and the close-out
  says exactly this rather than claiming a document it did not write. This also keeps the
  denominator decision in D-01 consistent: the ledger is Phase 67's artifact, not a Phase 68 one
  written early.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The finding corpus — the phase's entire input

- `.planning/reviews/61-COVERAGE.md` — Phase 61 sweep (`bbj-vscode/src/language/`), 73 findings,
  **44 easy-fix**. The largest single source.
- `.planning/reviews/62-COVERAGE.md` — Phase 62 sweep (extension host, composers, TextMate),
  34 findings, **14 easy-fix**.
- `.planning/reviews/63-COVERAGE.md` — Phase 63 sweep (`bbj-intellij/`), 65 findings,
  **10 easy-fix**.
- `.planning/reviews/64-COVERAGE.md` — Phase 64 sweep (build, CI, dependencies), 45 findings,
  **8 easy-fix**.
- `.planning/reviews/65-COVERAGE.md` — Phase 65 cross-cutting security audit, 37 findings,
  **0 easy-fix** (all D1 → `major` by INVENTORY §3c test 6).
- `.planning/reviews/66-COVERAGE.md` — Phase 66 known-debt re-triage, 18 findings,
  **1 easy-fix** (`P66-D2-001`, merged per D-04).

### The standard these findings were written against

- `.planning/reviews/INVENTORY.md` §"Finding Record Template" — the exact field shape every
  record uses; the ledger's columns derive from it. **Immutable for v4.0 (Phase 60 D-09).**
- `.planning/reviews/INVENTORY.md` §3c "Easy-vs-major classification (D-13)" — the six tests.
  Phase 67 applies this classification; it does not re-run it.
- `.planning/reviews/INVENTORY.md` §3d "Severity and effort scales" — the `{2,4,8}` effort scale
  and the `PRIO 1|2|3` mapping.
- `.planning/reviews/INVENTORY.md` §"Test & Build Baseline (D-05, D-06)" — **the authority for
  D-07 and D-08.** Carries the 11 named failing tests, the two-run variance table, the flaky
  `beforeAll` analysis, and the lint/gradle state. Do not restate suite numbers from anywhere
  else; read them here.

### Phase boundaries this phase must respect

- `.planning/phases/66-known-debt-re-triage/66-CONTEXT.md` §D-01 — Phase 67 is the only apply
  phase, and owns the FIX-03 green-suite gate.
- `.planning/phases/66-known-debt-re-triage/66-CONTEXT.md` §D-02 — zero tracker writes before
  Phase 69's ISSUE-01 gate.
- `.planning/ROADMAP.md` §"Phase 68: Deliverable Documents" — DOC-01/DOC-02 own `EASY-FIXES.md`
  and `MAJOR-REFACTORS.md`. See the FIX-04 discretion item.

### Requirements and project instructions

- `.planning/REQUIREMENTS.md` — `FIX-01`..`FIX-04` (lines 66–69) and the coverage matrix rows
  (lines 147–150). **Neither FIX-01 nor FIX-03 is edited by this phase** (D-07, D-12).
- `CLAUDE.md` (repo root) — build/test commands and architecture. Note it is itself the target of
  three easy fixes (`P61-D8-003`, `P61-D8-005`, `P62-D8-001`), all correcting stale text.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- **Vitest + Langium test harness** — `bbj-vscode/test/`, with `createBBjServices(EmptyFileSystem)`
  and `validationHelper<Program>` for validation tests, and `createBBjTestServices` from
  `test/bbj-test-module.ts` (injects `JavaInteropTestService` with fake `BBjAPI`/`HashMap`/`String`
  classes plus a `TestableBBjLexer`) for anything touching Java interop. The 30 D-11 regression
  tests should reuse these, not build new infrastructure — INVENTORY §3c test 4 already required
  each easy finding to be testable with the existing harness, so this is guaranteed for all 30.
- **`test/test-data/`** — every `.bbj` file there is auto-parsed by `example-files.test.ts` and
  must produce zero lexer/parser errors. Dropping a file there is a zero-code parsing regression
  test, useful for grammar- and lexer-adjacent fixes.
- **`test/test-helper.ts`** — `initializeWorkspace()`, `findFirst()`, `findByIndex()`.
- **The reproduction technique already used in the sweeps** — `P61-D2-011`'s evidence was produced
  with a throwaway vitest test that pushed a synthetic `JavaMethod` onto the test double's fake
  `java.lang.String` class. Several D2 findings carry a reproduction recipe like this in their
  `evidence:` field; the D-12 red-test commit should start from it rather than reinvent it.

### Established patterns

- **Langium DI overrides** wired in `bbj-vscode/src/language/bbj-module.ts` via
  `createBBjServices()`. Most Phase 61 fixes land inside services registered there.
- **Generated code is off-limits** — `src/language/generated/` is regenerated by
  `npm run langium:generate` and never edited directly. `P61-D8-002` targets
  `bbj.langium:948`, which is a **comment** in the grammar source; confirm the applied edit does
  not change a grammar rule, since INVENTORY §3c test 2 forbids grammar changes in an easy fix.
- **Langium 4.x `$type` constants** and `isXxx()` guards from `generated/ast.ts` for runtime type
  checks — match this in any new test.
- **BBj is case-insensitive** — relevant to lexer, token-builder, and TextMate fixes.

### Integration points

- **`bbj-vscode/out/language/main.cjs`** is the single shared LS binary consumed by both VS Code
  and IntelliJ via LSP4IJ. A `bbj-vscode/src/` fix reaches IntelliJ users too — which is why
  `npm run build` is part of D-09's per-commit check, not just `vitest`.
- **`bbj-vscode/syntaxes/bbj.tmLanguage.json`** is shared by both IDEs and carries 3 easy fixes
  (`P62-D2-007`, `P62-D2-008`, `P62-D2-009`). `bbj-vscode/test/textmate-highlighting.test.ts` is
  the existing harness for it, and is itself the target of `P62-D5-004`.
- **java-interop on port 5008** is unreachable here and cannot be made to work (D-07). The 7
  `java-interop.ts` easy fixes must be tested against the test double, never a live peer.

### Environment facts that will otherwise be misdiagnosed

- Node `v24.18.0`; Java Temurin `25.0.3` at `/opt/java/default` — the **only** installed JDK
  (`/usr/lib/jvm` is empty, no SDKMAN). `bbj-intellij/build.gradle.kts` targets Java 17.
- Gradle wrapper is 8.13 and starts fine — the build failure is a version check, not bootstrap.
- Vitest is `^4.1.10`. `.planning/codebase/TESTING.md` is **superseded** and states 1.6.1 plus
  stale suite counts; it carries its own warning banner. Do not plan from its numbers.

</code_context>

<specifics>
## Specific Ideas

- **The ledger is derived, not hand-written.** `67-APPLY-SET.md`'s 77 rows come from selecting
  records whose `disposition:` begins `easy-fix` across the six COVERAGE files. The counts in
  this document (224 total / 144 major / 3 wontfix / 77 easy-fix; 44/14/10/8/0/1 by phase) were
  produced by that selection at context-gathering time and are the expected result — a planner or
  executor that derives a different number should treat the discrepancy as a finding, not adjust
  silently.

- **Two records carry an off-scale `effort` value** (`1`, outside INVENTORY §3d's locked
  `{2,4,8}`), already annotated in-record as rounded down to stay labellable for ISSUE-03. Carry
  the annotation into the ledger; do not re-round.

- **Commit message shape:** `<type>(<FINDING-ID>): <what changed>`, e.g.
  `fix(P61-D2-011,P66-D2-001): fall back to getResolvedClass for unresolved JavaMethod return`.
  Every commit in this phase names at least one finding ID — that is what makes FIX-01 checkable
  and what lets Phase 68 assemble DOC-01 by grepping history.

</specifics>

<deferred>
## Deferred Ideas

- **`P63-D7-004`** (`ComposerModels.java`, D7 parity) — deferred within this phase by D-15, not to
  another phase. Applies unchanged once a JDK 17 is available.
- **Provisioning a JDK 17** so `./gradlew build` and the IntelliJ tests can genuinely run. Raised
  and rejected as in-scope: it is environment provisioning, not applying fixes. It would unblock
  D-14's review-only verification and D-15's deferral.
- **Raising vitest's `hookTimeout`** so `initializeWorkspace()` stops timing out under load.
  Raised as a way to remove the D-08 flakiness at source; rejected because changing test config
  is itself a behaviour change with no finding ID behind it.
- **The 144 `major-refactor` findings** — Phase 68 documents them, Phase 69 files them. Not this
  phase, under any circumstances.

</deferred>

---

*Phase: 67-apply-easy-fixes*
*Context gathered: 2026-08-19*
