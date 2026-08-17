# Review Inventory & Finding Standard — v4.0 Stability and Quality

This document is the single immutable contract that Phases 61-69 inherit. It is produced by
Phase 60 (plans 60-01 and 60-02) and is not edited by any later phase.

## Status & Authority

**Dated:** 2026-08-17

This document is written **once** and is **immutable** for the v4.0 milestone. No phase after
Phase 60 edits this file — Phases 61, 62, 63 and 64 depend only on Phase 60 and run concurrently;
a mutable shared inventory would let a phase quietly edit the standard it is being held to, and a
shared writable file invites collisions between concurrent phases (D-09).

This document — not `.planning/codebase/*.md` — is the **authority on review scope, structure and
file counts** for the v4.0 milestone (D-16). The seven `.planning/codebase/*.md` maps are dated
2026-02-01, predate `bbj-intellij/` entirely, and are marked superseded by plan 60-04's staleness
banners; they remain readable as historical context only.

Each review phase (61, 62, 63, 64, 65) records its own findings in its own
`.planning/reviews/{NN}-COVERAGE.md` (e.g. `.planning/reviews/61-COVERAGE.md`) — not in this file.
Phase 68 assembles the DOC-03 coverage statement from the full set of `{NN}-COVERAGE.md` files.

## Frozen Open-Issue Snapshot

**Query:** `gh issue list --state open --limit 60 --json number,title,labels,createdAt` — run
2026-08-17.

This is the **authoritative dedup list** for Phases 61-65: every recorded finding is checked
against these 15 issues before being filed (RVW-07, D-14). Phase 69 re-queries the tracker
immediately before filing, catching anything opened mid-milestone, so this snapshot is not
re-verified live at sweep time.

`Area` is recorded only from the repository's existing area-label set —
`grammar`, `scoping`, `types`, `library`, `validation`, `linking`, `CUI`, `vscode`, `intellij`,
`BBj integration and infrastructure`, `missing verb/parameter`, `common pattern`, `dependencies`,
`javascript`, `documentation`. Generic labels (`enhancement`, `help wanted`, `question`,
`good first issue`, `actionable`, priority labels) are excluded from `Area`. Where an issue
carries no area label, `Area` is written `— unlabelled` and nothing is inferred.

| # | Title | Labels | Area | One-line summary |
|---|-------|--------|------|-------------------|
| 33 | VSCode workspaces don't work | question, BBj integration and infrastructure | BBj integration and infrastructure | Multi-root/workspace usage is reported broken in VS Code. |
| 65 | support tokenized BBj files | PRIO 3, BBj integration and infrastructure | BBj integration and infrastructure | Requests language-feature support for tokenized (compiled) `.bbj` sources. |
| 83 | How to define project wide USE-Statements ? | enhancement, scoping, BBj integration and infrastructure | scoping, BBj integration and infrastructure | Requests a project-wide `USE` mechanism instead of per-file declarations. |
| 90 | Skip linking or disable linking for certain code areas / files ? | enhancement, linking, BBj integration and infrastructure | linking, BBj integration and infrastructure | Requests a way to opt specific files/regions out of cross-reference linking. |
| 108 | Inlay hints | enhancement, help wanted | — unlabelled | Requests inlay-hint support (parameter names, inferred types). |
| 231 | Support Custom Classpath and Command Line Settings for starting BBj Programs | enhancement, PRIO 3, BBj integration and infrastructure | BBj integration and infrastructure | Requests configurable classpath/CLI args for run commands. |
| 381 | Config.bbx is no longer highlighted and now shows up as plain text. | (none) | — unlabelled | Regression report: `config.bbx` lost TextMate syntax highlighting. |
| 385 | Add the ability to launch the Graffiti Composer in the VS Code BBj Extension | enhancement, good first issue, vscode, actionable | vscode | Requests launching the (external) Graffiti Composer tool from VS Code. |
| 410 | Add support for Zed Editor | enhancement | — unlabelled | Requests a Zed Editor integration for the language server. |
| 466 | Detect sibling-type method return mismatches (e.g. HashMap returned for a TreeMap) via Java class hierarchy | enhancement, types, validation | types, validation | Requests a validation for Java return-type mismatches across sibling types. |
| 472 | Browser editing initiative: Langium LS in the browser + BBj-served gateway (Monaco component or full web IDE) | (none) | — unlabelled | Explores running the language server in-browser via a BBj-served gateway. |
| 475 | SETOPTS assistance in BBj code: decode hovers + tri-state composer with IOR/AND-aware codegen | (none) | — unlabelled | Requests SETOPTS hover decoding plus a tri-state composer with bitmask-aware codegen. |
| 476 | Ship curated "getting started" BBj starter programs via File > New (VS Code) and File and Code Templates (IntelliJ) | enhancement, 8, vscode, intellij | vscode, intellij | Requests starter-program templates surfaced through each IDE's native "new file" flow. |
| 485 | Support custom-named/located config files: honor the configured file everywhere and treat it as a config file in the editor | enhancement | — unlabelled | Requests honoring non-default config file names/locations throughout the extension. |
| 486 | Watch config.bbx and re-apply PREFIX/USE changes without a manual restart | enhancement | — unlabelled | Requests live-reload of PREFIX/USE settings on `config.bbx` change. |

## Finding Standard

### 3a. Finding IDs (D-11)

**Locked at the Task 1 checkpoint of this plan: `phase-dimension-seq`.**

Token shape: **`P{phase}-D{dimension}-{seq}`** — worked example **`P62-D1-003`**.

- `{phase}` — the sweep phase number that discovered the finding (61, 62, 63 or 64; 65 for the
  cross-cutting security audit).
- `{dimension}` — the primary dimension digit, 1-8, from the D1-D8 table below.
- `{seq}` — zero-padded to **three digits**, allocated **monotonically in discovery order** within
  each `(phase, dimension)` pair, so ties cannot occur (RVW-06 ordering backstop).

A finding spanning two dimensions declares exactly **one primary dimension**, which supplies its
ID, and lists the rest in the record's `secondary` field.

**Reserved phase `00`.** Phase number `00` is reserved for non-allocatable template/illustration
examples (see `P00-D1-001` below), so a documentation example can never collide with a real
allocation. No sweep phase may allocate a `P00-*` ID.

Because each of Phases 61-64 owns a disjoint `{phase}` value, they may allocate IDs concurrently
with zero collision risk, and the sweep plus violated dimension are readable from the ID alone
with no lookup.

### 3b. Evidence Tiers (D-12)

The RVW-06 verification bar is tiered by dimension:

| Dimension(s) | Tier | What clears the bar |
|---|---|---|
| D4 (Maintainability), D8 (Comment/doc accuracy) | `trace` | A written trace naming the code shape or the stale text is sufficient — there is nothing to run. |
| D1 (Security), D2 (Correctness), D3 (Performance) | `repro` | Either a runnable reproduction, or a line-by-line trace naming the concrete inputs/state and the exact `file:line` where behaviour diverges. A bare assertion is **not** a finding. |
| D5 (Test coverage), D6 (Dependency health), D7 (Cross-IDE parity) | `inherited` | Follows the tier of whatever the finding asserts: a missing test is `trace`-evidenced; a CVE claim needs the advisory reference (`repro`-equivalent); a parity gap needs the concrete divergent behaviour in both IDEs (`repro`-equivalent). |

**Adjacency rule (RVW-06):** a finding spanning two dimensions must clear the **stricter** of the
two tiers (`repro` is stricter than `trace`).

**Drop-vs-disposition rule (RVW-06, DOC-04):** a finding that does not fully clear its tier is
**not recorded as a finding**. It is instead written into the sweep's `{NN}-COVERAGE.md` file under
disposition `not-reproducible`, with its reason, so it stays visible rather than being silently
dropped.

### 3c. Easy-vs-major classification (D-13)

A finding is **`easy`** only if **all six** of the following tests pass. Failing any one test makes
it **`major`**.

1. The fix touches **at most one file**.
2. It changes **no public API**, no rule in `bbj-vscode/src/language/bbj.langium`, and no LSP
   protocol contract.
3. It adds or upgrades **no dependency** in `bbj-vscode/package.json` or
   `bbj-intellij/build.gradle.kts`.
4. It is **regression-testable with the existing harness** — vitest for TypeScript, Gradle for the
   IntelliJ plugin — with no new test infrastructure.
5. The reviewer can **name the exact edit** in the finding record.
6. Its `severity` is **neither `critical` nor `high`**, **and** its primary dimension is **not D1**.

Test (6) is a deliberate safety gate: it guarantees that no high-impact or security finding
reaches Phase 67's apply path without first being recorded in `MAJOR-REFACTORS.md`. A `critical`
or `high` finding, or any D1 (Security) finding, is `major` regardless of how small its edit is.

### 3d. Severity and effort scales

**Severity** is a four-point scale: `critical` | `high` | `medium` | `low`. Mapped to the
repository's existing priority labels for ISSUE-03:

| Severity | Priority label |
|---|---|
| `critical`, `high` | `PRIO 1` |
| `medium` | `PRIO 2` |
| `low` | `PRIO 3` |

**Effort** is measured in hours and takes exactly one of three values — the literal label names
already present in the repository: `2`, `4`, `8`. DOC-02's effort estimate and ISSUE-03's effort
label are therefore the same value, with no translation step.

## Finding Record Template

Every recorded finding uses this exact field shape. Required fields have no default; optional
fields must still be written explicitly (never left blank).

```
id:                <P{phase}-D{dimension}-{seq}> — required, see 3a
unit:              <RU-{phase}-{seq}> — required, the review unit this finding belongs to
location:           path:line — required (RVW-06, DOC-01, DOC-02, ISSUE-02)
dimension:         <D1..D8> — required, the primary dimension
secondary:         [<D1..D8>, ...] — optional, other dimensions this finding also violates
severity:          <critical|high|medium|low> — required
evidence_tier:     <repro|trace|inherited> — required, per 3b, the stricter tier if `secondary` is set
evidence:          <the reproduction, or the line-by-line trace> — required
failure_scenario:  <inputs/state -> wrong behaviour> — required
classification:    <easy|major> — required, with the six D-13 tests recorded pass/fail
effort:            <2|4|8> — required
dedup:             <none | #NNN duplicate | #NNN partial-overlap — <what this adds>> — required, never blank, checked against the Frozen Open-Issue Snapshot above
disposition:       <easy-fix|major-refactor|duplicate|wontfix|already-covered|not-reproducible> — required; a reason is required for the last four
```

DOC-04 dispositions are captured **at sweep time**, in the finding record itself, by the reviewing
phase — Phase 68 **assembles** the DOC-01/DOC-02 documents from these dispositions; it does not
re-triage them.

## Review Units

Review units use the identifier shape **`RU-{phase}-{seq}`** — e.g. `RU-62-04`. Plan 60-02 defines
the remaining ~20 units (`RU-61-01`..`RU-61-07`, `RU-62-01`..`RU-62-05`, `RU-63-01`..`RU-63-05`,
`RU-64-01`..`RU-64-03`, `RU-D8-01`). This plan works exactly **one** unit end to end, proving the
shape every other unit follows.

**Applicability-grid vocabulary.** Two row types: `unit` (one per review unit) and
`file-exception` (one per file whose applicability differs from its unit's). Cell values are
restricted to exactly two legal forms: `applies` or `n/a — <written reason>`. A blank cell is a
defect.

### RU-62-04 — Composer webview HTML generators

**Review phase:** 62 (RVW-03); cross-referenced by Phase 65 (SEC-01).

**Files, LOC, and risk rank:**

| File | LOC |
|---|---|
| `bbj-vscode/src/msgbox-composer-webview.ts` | 373 |
| `bbj-vscode/src/addwindow-composer-webview.ts` | 408 |
| `bbj-vscode/src/addchildwindow-composer-webview.ts` | 431 |
| `bbj-vscode/src/setopts-composer-webview.ts` | 321 |
| **Total** | **1,533 (4 files)** |

**Risk rank:** 1 of the Phase 62 units — the largest LOC in the phase and the entire SEC-01 attack
surface (webview HTML generation). Risk rank and LOC are recorded as columns so the Phase 62
sweep can be ordered by them.

**D1-D8 applicability, with a written reason for every `n/a`:**

| Dimension | Cell | Reason |
|---|---|---|
| D1 Security | applies | These four modules are the complete SEC-01 webview HTML-generation surface; `bbj-vscode/package.json` declares no `customEditors` contribution, so there is no fifth generator. |
| D2 Correctness & error handling | applies | — |
| D3 Performance & resource use | applies | — |
| D4 Maintainability & code smells | applies | The four generators are near-duplicates of each other — this is the duplication callout ROADMAP §Phase 62 criterion 2 requires. |
| D5 Test coverage gaps | applies | — |
| D6 Dependency health | n/a — these modules import only `vscode` and sibling project modules and introduce no third-party dependency; dependency health is assessed once at `RU-64-02`. |
| D7 Cross-IDE parity | applies | VS Code renders these webviews while IntelliJ presents native Swing dialogs (`RU-63-04`), so the parity question here is equivalence of the generated BBj code, not of the UI. |
| D8 Comment & doc accuracy | applies | — |

**File-exception row.** `setopts-composer-webview.ts` has **no** `setopts-composer.ts` sibling —
its codegen logic lives in `setopts-catalog.ts` (`RU-62-03`), not in a `-composer.ts` file. Its D4
duplication assessment therefore runs against **three** `-composer.ts` files (msgbox, addwindow,
addchildwindow), not four. Any template that assumes a uniform `-composer`/`-ui`/`-webview` triple
is wrong (D-15) — see the D-15 Correction Log below.

| Row type | File | Dimension | Cell | Reason |
|---|---|---|---|---|
| file-exception | `setopts-composer-webview.ts` | D4 | applies — asymmetric baseline | Compared against 3 `-composer.ts` siblings (msgbox/addwindow/addchildwindow), not 4; SETOPTS has no `-composer.ts` file. |

**Dedup neighbours from the Frozen Open-Issue Snapshot.** A Phase 62 reviewer of `RU-62-04` must
check new findings against both of these before filing:

- **#475** — SETOPTS assistance in BBj code: decode hovers + tri-state composer with IOR/AND-aware
  codegen. Covers a *feature request* for SETOPTS decode/hover assistance and a new tri-state
  composer UX; a `RU-62-04` finding about `setopts-composer-webview.ts`'s existing HTML generation
  is `partial-overlap` only if it touches the same SETOPTS codegen surface — record what the
  finding adds beyond the feature request.
- **#385** — Add the ability to launch the Graffiti Composer in the VS Code BBj Extension. Covers
  launching an *external* Graffiti Composer tool, not the in-tree msgbox/addwindow/addchildwindow/
  SETOPTS composers reviewed here; a `RU-62-04` finding is `partial-overlap` only if it concerns
  composer-launch UX generally, not the HTML-generation defects this unit records.

**Worked finding record — `P00-D1-001` (template illustration only).**

> **This is a template illustration under the reserved `P00` phase — it is not an allocated
> finding.** Phase 62 allocates the real first D1 finding against `RU-62-04` as `P62-D1-001`.

```
id:                P00-D1-001
unit:              RU-62-04
location:           bbj-vscode/src/setopts-composer-webview.ts:<line-to-be-filled-by-Phase-62>
dimension:         D1
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace naming the concrete input/state and the exact
                    file:line where an interpolated value reaches the generated webview HTML
                    without an established escaping/sanitization step (no payload, no trigger
                    sequence recorded here — see threat T-60-02 below).
failure_scenario:  A value influenced by user/config input flows into the generated HTML
                    string without confirmed escaping, so the composer webview can render
                    attacker-controlled markup/script in the extension's webview context.
classification:    major
                    (1) touches 1 file: n/a — pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit: pass — (6) severity is `high` and
                    primary dimension is D1: FAIL — test (6) fails, so classification is
                    `major` regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             #475 partial-overlap — #475 requests SETOPTS composer UX; this finding is
                    about the existing webview's HTML-generation safety, which #475 does not
                    address.
disposition:       major-refactor
```

This illustration demonstrates: the tier-`repro` D1 evidence rule (3b) — a bare assertion would
not qualify; and the D-13 test-(6) outcome — a D1 finding is `major` regardless of edit size.
Because this repository is public and this surface is unfixed, the illustration names the surface
and the class of problem only. No payload, no trigger sequence, and no proof-of-concept are
recorded here (threat T-60-02).

## Pinned Baseline Range (D-01)

The v4.0 baseline is pinned to the **`v0.12.0` tag**, not to the branch tip (`HEAD`). Pinning to a
tag rather than a moving branch tip is deliberate: `HEAD` sits on branch
`issue494-cyclic-inheritance-hang`, which advances with every v4.0 planning commit — a moving
endpoint would reproduce exactly the drift this phase exists to eliminate. The measured tail
(`v0.12.0..HEAD`) was **4 commits** when Phase 60's context was gathered and is **larger now** (8
commits at the time this section was written) — this growth is the evidence for why the endpoint
must be a fixed tag, not a floating ref.

**Range:** `2194616..v0.12.0`

**Endpoint semantics:** the left endpoint `2194616` is **excluded**; the right endpoint `v0.12.0`
is **included**.

**Verified size** — `git rev-list --count 2194616..v0.12.0` → **153**

**Per-release breakdown** — each count from `git rev-list --count <prev>..<tag>`:

| Range | Command | Count |
|---|---|---|
| `2194616..v0.9.0` | `git rev-list --count 2194616..v0.9.0` | 93 |
| `v0.9.0..v0.10.0` | `git rev-list --count v0.9.0..v0.10.0` | 38 |
| `v0.10.0..v0.11.0` | `git rev-list --count v0.10.0..v0.11.0` | 9 |
| `v0.11.0..v0.12.0` | `git rev-list --count v0.11.0..v0.12.0` | 13 |

**Checked arithmetic identity:** `93 + 38 + 9 + 13 = 153` = the range total above. ✓

**Release tags** — from
`git tag --list 'v0.9.0' 'v0.10.0' 'v0.11.0' 'v0.12.0' --sort=creatordate --format='%(refname:short) %(creatordate:short) %(objectname:short)'`:

| Tag | Date | Commit |
|---|---|---|
| `v0.9.0` | 2026-07-17 | `f95a872` |
| `v0.10.0` | 2026-07-18 | `ac3a530` |
| `v0.11.0` | 2026-07-18 | `8d8d814` |
| `v0.12.0` | 2026-07-19 | `1b86a6b` |

`v0.10.0` and `v0.11.0` are **both dated 2026-07-18** and are nevertheless separate releases with
separate rows above, ordered by tag creation date, not deduplicated by calendar day.

**Attribution rule (used by plan 60-03's reconstruction):** a single commit belongs to the first
release tag that contains it (`git tag --contains <sha>`, taking the earliest by creation date); a
capability spanning several commits is attributed to the tag of its **last** commit, and is listed
exactly once.

**Excluded tail** — `git log --oneline v0.12.0..HEAD`, all outside the baseline:

| Commit | Classification |
|---|---|
| `ff35ceb` | planning-doc |
| `3fbdc52` | planning-doc |
| `696750d` | planning-doc |
| `8f02970` | planning-doc |
| `e8f566e` | planning-doc |
| `110be82` | planning-doc |
| `9cc746a` | planning-doc |
| `a7e1b53` | code-fix |

**`a7e1b53 fix(#494): terminate the visibility hierarchy walk on cyclic inheritance`** is called
out explicitly as an **unreleased, in-flight code fix** — a Phase 61 reviewer must **not**
re-report the cyclic-inheritance hang as a live finding; it is already fixed on this branch, just
not yet released under a tag.

The commit range above was measured on branch **`issue494-cyclic-inheritance-hang`**. v4.0
planning commits are landing on this same branch, which is precisely why the endpoint is pinned to
the `v0.12.0` tag rather than to this moving tail.

## Test & Build Baseline (D-05, D-06)

**Commands run** (per `CLAUDE.md` §"Build & Test Commands"): `npm test` and `npm run lint` from
`bbj-vscode/`; `./gradlew build` from `bbj-intellij/`. BBj/Java-dependent tests skip unless BBj is
reachable; per the established environment fact, these failures are **not** resolved by bringing a
java-interop peer up on port 5008 — that has been tried.

### Headline vitest counts

`npm test` was run **twice in immediate succession**, with no source changes between runs, to
characterize stability. The two runs produced different totals:

| Run | Test files | Tests |
|---|---|---|
| 1 | 3 failed \| 47 passed (50) | 11 failed \| 850 passed \| 25 skipped (886) |
| 2 | 2 failed \| 48 passed (50) | 11 failed \| 843 passed \| 32 skipped (886) |

The **11 failed tests are identical and deterministic across both runs** — all 11 are in
`test/linking.test.ts > Linking Tests > Interop related tests`. The **variance in test-file
failures and skip counts is itself a finding** (see the routing table below): a `beforeAll` hook
(`WorkspaceManager.initializeWorkspace()`) intermittently exceeds vitest's default 10-second
`hookTimeout` under system load, and whichever suite happens to be running that hook when
contention spikes is marked as a failed suite with its tests reported skipped. Run 1 hit this on
`test/functional/chevrotain-tokens.test.ts` (21/21 skipped) and `test/run-call-file-resolution.test.ts`
(1/6 skipped); run 2 hit it on `test/variable-scoping.test.ts` (29/29 skipped) instead. Per D-05,
the snapshot recorded when Phase 60's context was gathered measured **79** skipped tests (4 test
files failed, 796 passed) — a third, even-more-contended data point consistent with the same
root cause. 886 total tests is stable across all three measurements.

### Every failing test

All 11 failures are deterministic and reproduce identically across both runs:

| Test file | Test name | Failure summary | Classification | Evidence |
|---|---|---|---|---|
| `test/linking.test.ts` | All BBj classes extends Object | Unresolved reference to `NamedElement` | environment | No `bbjdir` set (`stderr: "No bbjdir set. No classpath and prefixes loaded."`); java-interop is not reachable in this sandbox and port-5008 was already ruled out as a fix (D-06). |
| `test/linking.test.ts` | Import and declare simple Java class without using FQNs | Unresolved Java class reference | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Import Java class | Unresolved Java class reference | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Declare with direct import | Unresolved Java class reference | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Class definition with direct import in extends | `Could not resolve reference to JavaPackageLike named 'Date'` | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Class definition with direct import in implements | `Could not resolve reference to JavaPackageLike named 'List'` | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Unloaded Java FQN access - test for #6 | Unresolved `sql`/`Date`/`valueOf` references | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Java FQN access - test for #6 | Unresolved `sql`/`Date`/`Boolean`/`TRUE`/`valueOf` references | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Linked List is resolved | `Could not resolve reference to JavaPackageLike named 'LinkedList'` | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Resolve nested class in use statement | `Could not resolve reference to JavaPackageLike named 'Map'/'Entry'` | environment | Same interop-unreachable root cause. |
| `test/linking.test.ts` | Resolve nested class FQN | `Could not resolve reference to JavaPackageLike named 'Map'/'Entry'`, `NamedElement named 'getValue'` | environment | This is the **leading environment-dependent candidate** already established in D-06: it fails on unresolved `Map`/`Entry`/`getValue` references, which is exactly the java-interop-dependency signature. |

No failure in this run is classified `genuine` — each is traced to the same unreachable
java-interop dependency, and none has evidence of a defect independent of that dependency. This is
not a blanket classification: each row's evidence is the specific unresolved-reference error text
for that test, all pointing to the same root cause (no live java-interop peer / no `bbjdir`).

### Flaky suite-level failures (separate from the 11 above)

| Test file | Symptom | Classification | Evidence |
|---|---|---|---|
| `test/functional/chevrotain-tokens.test.ts` (run 1 only) | `beforeAll` hook timed out in 10000ms calling `WorkspaceManager.initializeWorkspace()` | environment | Did not reproduce in run 2; timing-dependent, consistent with sandbox resource contention. |
| `test/run-call-file-resolution.test.ts` (run 1 only) | Same `beforeAll` hook timeout | environment | Did not reproduce in run 2. |
| `test/variable-scoping.test.ts` (run 2 only) | Same `beforeAll` hook timeout | environment | Did not reproduce in run 1; a *different* suite than run 1's, confirming the timeout is load-dependent rather than tied to one file. |

### Every skipped test, grouped by file

| File | Skipped | Deliberate & documented? |
|---|---|---|
| `test/linking.test.ts` | 1 (`Link to string template array members`) | Yes — `test.skip` at `test/linking.test.ts:85`. |
| `test/completion-test.test.ts` | 1 (`DEF FN parameters with $ suffix inside class method`) | Yes — TEST-03, `test.skip` at `test/completion-test.test.ts:185`, Langium grammar-follower limitation. |
| `test/parser.test.ts` | 3 assertions disabled (not `test.skip` — commented-out expectations at lines ~530, ~811, ~860) | Yes — need a Java classpath unavailable under `EmptyFileSystem`; documented in STATE.md Active Constraints. |
| `test/functional/chevrotain-tokens.test.ts` | 0-21, varies by run | **No** — introduced by the `hookTimeout` flakiness above, not a deliberate skip; routed below. |
| `test/run-call-file-resolution.test.ts` | 0-1, varies by run | **No** — same flakiness; routed below. |
| `test/variable-scoping.test.ts` | 0-29, varies by run | **No** — same flakiness; routed below. |

The 3 disabled `parser.test.ts` assertions are not counted in vitest's "skipped" total (they are
commented-out expectations inside otherwise-passing tests, not `test.skip`/`it.skip` calls), but
are recorded here per D-06's instruction to distinguish deliberate, already-documented skips from
skips introduced during the drift window with no recorded reason. No undocumented deliberate skip
was found beyond the flakiness above.

### `npm run lint`

**Exit code:** 0. **Errors:** 0. **Warnings:** 2 — both in
`bbj-vscode/src/language/bbj-document-symbol-provider.ts` (lines 75 and 149): "Unused eslint-disable
directive (no problems were reported from `@typescript-eslint/no-explicit-any`)".

### `bbj-intellij/./gradlew build`

**Exit code:** non-zero (`BUILD FAILED`). **Failure mode:** a toolchain/Java-version rejection —
Gradle reports the failure as the bare string `25.0.3` (the local JDK's version). The local JDK is
**Temurin 25.0.3**, while `bbj-intellij/build.gradle.kts` sets source/target compatibility to
`JavaVersion.VERSION_17`. This is an **environment** classification, not a code defect — the build
config's target (`17`) is unchanged and correct; the local toolchain simply does not offer a
matching JDK.

### Contrast with v3.9

MILESTONES.md records v3.9 (2026-02-21) as **511 passed, 4 skipped, 0 failures**. The drift window
(153 commits, `2194616..v0.12.0`, plus the still-growing `v0.12.0..HEAD` tail) produced:

- **Tests added:** 886 total today vs. 511+4=515 at v3.9 → **+371 tests**.
- **Failures added:** 0 → 11 (all `environment`-classified, java-interop dependency).
- **Skip growth:** 4 → 25-79 depending on run (deterministic deliberate skips: 5 — `linking.test.ts`
  ×1, `completion-test.test.ts` ×1 TEST-03, plus the 3 `parser.test.ts` disabled assertions counted
  separately; the remainder is the `hookTimeout` flakiness above, not a deliberate skip).

### Routing table (D-06)

These are **pre-identified findings routed into Phases 61-64 for triage**, not an accepted
known-failing allowlist — FIX-03's "`npm test` clean" gate in Phase 67 is unreachable until they
are dispositioned.

| Item | Target phase | Target dimension |
|---|---|---|
| 11 `test/linking.test.ts` "Interop related tests" failures (java-interop unreachable) | Phase 61 | D5 (test coverage / environment-dependent setup), cross-referenced D2 |
| `beforeAll` `WorkspaceManager.initializeWorkspace()` hook timeout flakiness (hits a different suite each run) | Phase 61 | D5 (brittle test setup) |
| 3 disabled `parser.test.ts` assertions (needs Java classpath under `EmptyFileSystem`) | Phase 61 | D5 |
| TEST-03 `completion-test.test.ts` skip (Langium grammar-follower limitation) | Phase 61 | D5 |
| `bbj-intellij` Gradle build JDK 17-vs-25.0.3 toolchain mismatch | Phase 63 | D6 (dependency/toolchain health) |
| `bbj-document-symbol-provider.ts` unused eslint-disable directives (2 warnings) | Phase 61 | D4 |
