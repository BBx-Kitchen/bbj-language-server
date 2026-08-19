# Phase 66: Known Debt Re-triage — Coverage Record

**Plan:** 66-01 (this file created here; DEBT-01, DEBT-02, DEBT-03 verdicted here). Plans 66-02
(DEBT-04, DEBT-05) and 66-03 (DEBT-07, DEBT-08, `REQUIREMENTS.md`/`PROJECT.md` edits, DEBT-06
closure, the four close-out gates) append to this same file.

**Resume signal recorded (Task 1 checkpoint, resolved):** the user selected **`drafts-only`**
(CONTEXT.md D-02 as written). Phase 66 produces issue-ready drafts and files nothing to the
GitHub tracker anywhere in this phase — no `gh issue create`, `gh issue comment`, `gh issue edit`,
`gh issue close/reopen`, and no label or state change occurs in any of this phase's three plans.
Read-only `gh issue view` / `gh issue list` are used below for `dedup:` checks against the Frozen
Open-Issue Snapshot. Consequence, stated plainly per D-02: DEBT-06's "represented by a GitHub
issue" is **not literally true at the end of this plan** — it becomes true only when Phase 69
files the drafts recorded below, under `ISSUE-01`'s single approval gate. This plan discharges its
half by producing a complete draft per unresolved item.

## The structural break — no phase-66 review-unit tokens exist

`INVENTORY.md` defines review units, an applicability grid, a cell gate and a file gate for
Phases 61-64 (and Phase 65 constructed its own four-surface enumeration for the same structural
absence). It defines **none of these for Phase 66** — there is no `RU-`-prefixed token for this
phase anywhere in `INVENTORY.md`, no D1-D8 applicability grid keyed to a Phase 66 review unit, and
consequently no cell gate or file gate this phase could re-derive even if it wanted to.

Phase 66 constructs its own closed denominator instead, keyed on **debt items** — the eight
bullets under `PROJECT.md`'s "Known tech debt" heading — rather than on INVENTORY rows or on
security surfaces (Phase 65's approach for the same structural gap). No record in this file
carries an `RU-` token in its `unit:` field.

## Two recording-shape resolutions the structural break forces

1. **The required `unit:` field carries the `DEBT-NN` requirement ID, not an `RU-` token.** Every
   finding record below (`P66-D3-001`, `P66-D5-001`, `P66-D5-002`, `P66-D2-001`) writes
   `unit: DEBT-01` / `DEBT-02` / `DEBT-03` in place of an `RU-{phase}-{seq}` value, mirroring how
   `65-COVERAGE.md` put its own surface ID (`SEC-01`..`SEC-05`) in the same field when no `RU-65-*`
   unit existed either.
2. **Phase 64's `triage:` field is absent — by decision, not oversight (D-06).** Phase 64's
   correction-log field does not apply to a phase it was never scoped to touch; carrying it here
   would make Phase 68's cross-phase assembly ambiguous about which of its buckets this file's
   records belong to. No record below carries a `triage:` field.

## Finding-ID namespace

Token shape: `P66-D{n}-nnn`, zero-padded to three digits. Dimensions follow the concern each
item's inherited evidence already carries, per D-16 — unlike Phase 65, which used D1 throughout
because all four of its requirements were security concerns. The effort scale is INVENTORY §3d's
`2` | `4` | `8` and nothing else; Phase 63 shipped three off-scale values (`3`, `1`, `1`) that
needed a post-hoc correction — that mistake is not repeated here.

**Pre-allocation table**, reproduced from `66-01-PLAN.md`'s "Artifacts this phase produces"
section so the whole allocation is visible in one place. A pre-allocated ID that resolves
`already-covered` / `not-reproducible` is recorded "not allocated — disposition `<value>`" rather
than reassigned (none of this plan's four does).

| Finding ID | Owning item | Allocated by | Dimension | Status this plan |
|---|---|---|---|---|
| `P66-D3-001` | DEBT-01 | 66-01 | D3 | Allocated — see `## DEBT-01` |
| `P66-D5-001` | DEBT-02 (parser.test.ts trio) | 66-01 | D5 | Allocated — see `## DEBT-02` |
| `P66-D5-002` | DEBT-02 (TEST-03 skip) | 66-01 | D5 | Allocated — see `## DEBT-02` |
| `P66-D2-001` | DEBT-03 | 66-01 | D2 (secondary D5) | Allocated — see `## DEBT-03` |
| `P66-D2-002` | DEBT-04 | 66-02 | D2 | Not this plan's — pending 66-02 |
| `P66-D4-001` | DEBT-05 | 66-02 | D4 | Not this plan's — pending 66-02 |
| `P66-D2-003` | DEBT-07 | 66-03 | D2 | Not this plan's — pending 66-03 |
| `P66-D5-003` | DEBT-08 | 66-03 | D5 | Not this plan's — pending 66-03 |

## Dedup source

The Frozen Open-Issue Snapshot (`INVENTORY.md` lines 24-38), 15 issues, queried 2026-08-17, is the
`dedup:` input for every record below — the same snapshot every Phase 61-65 sweep used, kept
comparable across all six re-triage phases.

**Composition check actually run against the 15 rows** — which are topically adjacent to
DEBT-01/02/03 and which are not:

| # | Title | Topically adjacent to | Adjacency verdict |
|---|---|---|---|
| 33 | VSCode workspaces don't work | none of DEBT-01/02/03 | not adjacent — multi-root workspace usage bug report, not a scope-performance or type-inference concern |
| 65 | support tokenized BBj files | none | not adjacent |
| 83 | How to define project wide USE-Statements? | DEBT-01 (scope resolution) | checked, no match — feature request for a new USE mechanism, not the existing scan-performance path |
| 90 | Skip linking or disable linking for certain code areas/files | DEBT-01 (scope/linking performance) | checked, no match — opt-out UX request, not the always-on scan cost DEBT-01 records |
| 108 | Inlay hints | none | not adjacent |
| 231 | Support Custom Classpath and Command Line Settings | none | not adjacent |
| 381 | Config.bbx is no longer highlighted | none of DEBT-01/02/03 (adjacent to DEBT-08, out of this plan's scope) | not adjacent here |
| 385 | Launch Graffiti Composer in VS Code | none | not adjacent |
| 410 | Add support for Zed Editor | none | not adjacent |
| 466 | Detect sibling-type method return mismatches via Java class hierarchy | DEBT-03 (type inference) | checked — see `## DEBT-03`'s `dedup:` field for the full reasoning; verdict: **unrelated mechanism** |
| 472 | Browser editing initiative | none | not adjacent |
| 475 | SETOPTS assistance | none | not adjacent |
| 476 | Ship curated starter programs | none | not adjacent |
| 485 | Support custom-named/located config files | none | not adjacent |
| 486 | Watch config.bbx and re-apply changes | none | not adjacent |

`#232` (DEBT-01's own originating issue) is **absent from the frozen snapshot because it is
CLOSED** — confirmed by re-running the read-only query below at this plan's execution time:

```bash
gh issue view 232 --json number,state,title,labels
```
```json
{"labels":[],"number":232,"state":"CLOSED","title":"Code Helper process using 100% CPU on macOS"}
```

This is a **read-only** query — no write subcommand. `#232`'s closure is why DEBT-01's issue-ready
draft below is a **new** issue that supersedes `#232` rather than a comment on it (D-11) — a
closed issue in a public repository cannot take an update comment in any way that keeps a single
filing moment, and this phase writes nothing to the tracker regardless (D-02).

## The evidence rule (D-08) — the governing rule of this file

Inherited evidence is **cited, not re-derived.** For each of DEBT-01, DEBT-02 and DEBT-03, the
finding this file cites was already established by a Phase 61 sweep — the trace, the reproduction
and the failure scenario are **not restated**; only the citation (by ID) plus a fresh **currency
check** against the swept SHA are recorded.

**Phase-wide currency baseline**, run once and applying to every anchor cited below:

```bash
git diff --name-only 1750ad749d55c3e88d74be3ac2d561d37e8170d0..HEAD -- bbj-vscode bbj-intellij java-interop .github
```

**Literal output: (empty — no lines).** Zero files changed under any of the four reviewed trees
between the swept SHA and this plan's execution HEAD. This baseline does **not** replace the
per-anchor re-read below — it bounds it: an empty diff makes drift at any individual anchor
*a priori* unlikely, but each anchor is still re-read individually and its construct-level result
recorded, because the baseline is file-level (any line inside a changed file) while the finding is
line-level (the exact construct).

**Currency-equality rule used throughout this file:** equality is by **named construct**, not by
line number. Each re-read anchor records the recorded line, the current line, and whether the
named identifier or construct is still present. A construct found at a shifted line is recorded
`current`; a vanished construct is recorded as `drift` with its cause.

A disagreement with a closed `COVERAGE.md` file is recorded **here** as a finding, with the
evidence that settles it, and never as a silent correction or an edit to that file — the
`P63-D1-002` withdrawal (`63-VERIFICATION.md`) is the worked precedent. No disagreement was found
in this plan (the phase-wide diff is empty).

## The scope fence

This file records verdicts and lands **no source change** (D-01) — `files_modified` for this plan
is exactly `.planning/reviews/66-COVERAGE.md`. It drafts issues and writes to the GitHub tracker
**zero times** (D-02) — confirmed at the end of each `## DEBT-NN` section and again in
`## Plan 66-01 accounting` below. `INVENTORY.md` and the five closed `6N-COVERAGE.md` files are
**immutable inputs** — never edited by this phase.

## Stopping rule & write contract

One section per denominator row. A row is closed when it carries a disposition from
`INVENTORY.md` line 154's vocabulary plus, for unresolved items, a `P66-*` finding record and an
issue-ready draft. A row this plan does not close carries the literal cell `pending 66-02` or
`pending 66-03` — never a blank cell.

## Debt Denominator Register

Denominator command, re-run at this plan's execution time:

```bash
sed -n '/^\*\*Known tech debt:/,/^## /p' .planning/PROJECT.md | grep -c '^- '
```

**Literal output: `8`.** Matches D-04's discussion-time count exactly — no drift to report. The
register below enumerates all eight bullets in `PROJECT.md` source order (deterministic and
reproducible), one row per bullet, each carrying that bullet's `PROJECT.md` line number.

| PROJECT.md line | Bullet (leading text) | Owner | Pre-allocated ID | Verdict |
|---|---|---|---|---|
| 250 | BbjCompletionFeature still extends LSPCompletionFeature | DEBT-05 | `P66-D4-001` | pending 66-02 |
| 251 | CPU stability mitigations documented but not yet implemented (#232) | DEBT-01 | `P66-D3-001` | major-refactor — see `## DEBT-01` |
| 252 | CPL-06 hierarchy suppression takes one extra build cycle after BBjCPL merge | DEBT-07 | `P66-D2-003` | pending 66-03 |
| 253 | TEST-03 (DEF FN completion inside class methods) skipped | DEBT-02 | `P66-D5-002` | major-refactor — see `## DEBT-02` |
| 254 | 3 parser.test.ts assertions DISABLED | DEBT-02 | `P66-D5-001` | major-refactor — see `## DEBT-02` |
| 255 | IntelliJ TextMate bundle filename registration unverified | DEBT-08 | `P66-D5-003` | pending 66-03 |
| 256 | FQN path static-only filtering deferred | DEBT-04 | `P66-D2-002` | pending 66-02 |
| 257 | Static method return type inference gap | DEBT-03 | `P66-D2-001` | easy-fix — see `## DEBT-03` |

**Rows this plan (66-01) verdicts:** 251, 253, 254, 257 — four `PROJECT.md`-line rows, covering
the three items (DEBT-01, DEBT-02, DEBT-03) this plan owns; DEBT-02 spans two bullets/rows (253,
254) because D-07's two-unblocking-conditions split (see `## DEBT-02`) keeps them as two distinct
register rows even though both resolve under the one `DEBT-02` requirement. **Rows still owed:**
250 and 256 remain `pending 66-02` (DEBT-05, DEBT-04); 252 and 255 remain `pending 66-03`
(DEBT-07, DEBT-08) — neither orphan bullet is dropped or silently folded; 66-03 closes them by
adding `DEBT-07`/`DEBT-08` to `REQUIREMENTS.md`, never by editing `INVENTORY.md`.

Lines 252 and 255 are the two orphans `INVENTORY.md:1220` recorded (the 8-vs-6 debt-list drift);
their rows above are the pointer into that drift and are what makes it discoverable from this file
without opening `INVENTORY.md` directly.

## DEBT-01

### Inherited evidence

Cites `P61-D3-003` (`.planning/reviews/61-COVERAGE.md`, D3 cell narrative ~line 1517, record
~line 1625) by ID. Its trace is **not restated** here; what it established: two current-code
mechanisms that scale with **total multi-project workspace size** rather than the referencing
file's own size —

1. `getBBjClassesFromFile` (`bbj-scope.ts:308-331`) performs a full linear scan of
   `this.indexManager.allElements(BbjClass.$type)` — every `BbjClass` in the entire workspace
   index across all loaded projects — on every `::file::Class`-qualified reference and every
   `USE "::file::"` resolution, with no per-file/per-request cache.
2. `collectLocalSymbols` (`bbj-scope-local.ts:106-114`) walks the full, unpruned AST of every
   document via `AstUtils.streamAllContents(rootNode)`, with no `isExternalDocument`-aware pruning
   — unlike `bbj-linker.ts:47-58`'s `link()`, which already calls `treeIter.prune()` to skip
   external-document private-member subtrees.

Plus `bbj-index-manager.ts:14-27`'s `isAffected()` recorded as an **existing partial mitigation**
— present at the index-rebuild layer (it skips rebuilding external documents when only
non-external URIs changed), absent at both request-time paths above.

### Currency check

All four anchors re-read against the current tree (phase-wide diff above is empty, so no file-level
drift was expected; each anchor is still individually confirmed):

| Anchor | Recorded location | Current location | Construct | Result |
|---|---|---|---|---|
| `getBBjClassesFromFile` full-index scan | `bbj-scope.ts:308-331` | `bbj-scope.ts:308-330` (method body ends one line earlier than recorded — the recorded range's closing brace was off by one; the method itself, `private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean)`, still opens at line 308) | `getBBjClassesFromFile`, specifically `this.indexManager.allElements(BbjClass.$type).filter(bbjClass => ...)` at line 317 | **current** — construct present, same shape, same opening line |
| `collectLocalSymbols` unpruned walk | `bbj-scope-local.ts:106-114` | `bbj-scope-local.ts:106-118` | `override async collectLocalSymbols(...)` at line 106; `for (const node of AstUtils.streamAllContents(rootNode))` at line 111 with `await interruptAndCheck(cancelToken)` on the next line | **current** — method opens at the identically recorded line 106; no `isExternalDocument`-aware pruning added |
| `isAffected()` partial mitigation | `bbj-index-manager.ts:14-27` | `bbj-index-manager.ts:14-28` | `public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean` at line 14 | **current** — identical opening line, identical body (external-document rebuild-skip logic unchanged) |
| `link()`'s `treeIter.prune()` precedent | `bbj-linker.ts:47-58` | `override async link(...)` now opens at line 41; `treeIter.prune()` itself is at line 58 | `link()`, `treeIter.prune()` | **current** — the named construct `treeIter.prune()` is at the identically recorded line 58; the enclosing method's own opening line shifted from 47 to 41 (a net five-line shift earlier in the file), which does not affect the cited construct's presence or behavior |

No drift found at any of the four anchors — the phase-wide empty diff and the per-anchor read
agree.

### Verdict

All three mechanisms are unchanged since the swept SHA: the full-index scan in
`getBBjClassesFromFile`, the unpruned walk in `collectLocalSymbols`, and `isAffected()`'s partial,
rebuild-layer-only mitigation are all still present exactly as `P61-D3-003` recorded them. The item
is **still real**. Per D-06's mapping, a still-real item drafted for Phase 69 is `major-refactor`.

### Finding record

```
id:                P66-D3-001
unit:              DEBT-01
location:          bbj-vscode/src/language/bbj-scope.ts:308-330 (getBBjClassesFromFile);
                   bbj-vscode/src/language/bbj-scope-local.ts:106-118 (collectLocalSymbols)
dimension:         D3
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Cites P61-D3-003 (61-COVERAGE.md, D3 cell narrative ~1517, record ~1625) — the
                   line-by-line trace of both mechanisms — plus this plan's currency re-read of
                   all three anchors (see Currency check above), confirming both mechanisms and
                   isAffected()'s partial mitigation are unchanged. This re-read clears INVENTORY
                   §3b's D3 repro bar by its second form (a line-by-line trace naming the exact
                   file:line where behaviour diverges), not by a fresh runtime reproduction — no
                   benchmark was run in this plan.
failure_scenario:  A multi-project workspace with many external/referenced BbjClass documents
                   loaded: every ::file::Class scope resolution rescans the entire cross-project
                   index (getBBjClassesFromFile), and every document load/rebuild walks its full
                   AST including every external project's documents with no pruning
                   (collectLocalSymbols) — CPU cost scales with total multi-project workspace
                   size rather than the active file's own size, consistent with #232's reported
                   symptom (Code Helper process at 100% CPU on macOS).
classification:    major
                   (1) touches 1 file: FAIL — the named edit below needs a cache in bbj-scope.ts
                   AND isExternalDocument-aware pruning in bbj-scope-local.ts, two files —
                   (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass —
                   (4) regression-testable with existing vitest harness (a synthetic
                   multi-document workspace fixture with timing assertions, per RU-61-01's D3
                   benchmark precedent): pass — (5) reviewer can name the exact edit: pass (see
                   Issue-ready draft below) — (6) severity high: FAIL — major regardless of the
                   other five tests (D-13's safety gate, test 6).
effort:            8
dedup:             none — #232 is CLOSED and therefore absent from the frozen 15-issue snapshot,
                   so this is not a duplicate of any open issue. Checked #83 (project-wide USE
                   statements — different feature, no match) and #90 (opt-out linking — a UX
                   request, not this always-on scan cost, no match) as the plausible neighbours
                   already identified at Phase 61 sweep time; re-confirmed no new open issue
                   exists to check against (frozen snapshot unchanged, still 15 issues). This
                   finding adds: a concrete, two-mechanism named-edit implementation plan (D-11),
                   which #232 (now closed) never had.
disposition:       major-refactor
```

### Issue-ready draft

**Title:** CPU stability in multi-project workspaces — cache `getBBjClassesFromFile` and prune
`collectLocalSymbols` for external documents (supersedes #232)

**Cross-reference:** supersedes #232 (CLOSED — "Code Helper process using 100% CPU on macOS"),
which cannot take an update comment because it is closed and this phase writes to the tracker zero
times regardless (D-02). This new issue is what Phase 69 files under `ISSUE-01`.

**Problem statement:** Two independent code paths scale with total multi-project workspace size
rather than the referencing file's own size, and only one of the two request-time costs has any
mitigation.

**`file:line` evidence:**
- `bbj-vscode/src/language/bbj-scope.ts:308-330` — `getBBjClassesFromFile`'s
  `this.indexManager.allElements(BbjClass.$type).filter(...)` full linear scan.
- `bbj-vscode/src/language/bbj-scope-local.ts:106-118` — `collectLocalSymbols`'s unpruned
  `AstUtils.streamAllContents(rootNode)` walk.
- `bbj-vscode/src/language/bbj-index-manager.ts:14-28` — `isAffected()`, the existing **partial**
  mitigation (rebuild-layer only).
- `bbj-vscode/src/language/bbj-linker.ts:47-58` (`link()`, `treeIter.prune()` at line 58) — the
  **in-repo precedent** the second mechanism's fix copies rather than invents.

**Verified failure scenario:** In a multi-project workspace, every `::file::Class`-qualified
reference or `USE "::file::"` resolution triggers a full scan of the entire cross-project class
index; every document load/rebuild walks its complete AST, including every loaded external
project's documents with no pruning. Both costs grow with total workspace size, matching #232's
macOS CPU-spike symptom.

**Proposed approach — named edit for both mechanisms:**

1. **`getBBjClassesFromFile` (`bbj-scope.ts:308-330`).** Add a cache keyed by
   `(bbjFilePath, currentDocUri.toString())` (the two inputs that fully determine the method's
   candidate-URI set and therefore its filtered result) mapping to the resolved `bbjClasses`
   array. **Invalidation trigger:** clear the cache entry (or the whole cache, given the method's
   low per-workspace cardinality) inside `BBjIndexManager.isAffected()`
   (`bbj-index-manager.ts:14-28`) whenever a document whose URI matches one of the cached
   candidate URIs is rebuilt — `isAffected()` already receives `changedUris` and already
   distinguishes external from workspace documents, so it is the natural place to trigger
   invalidation without adding a second override point.
2. **`collectLocalSymbols` (`bbj-scope-local.ts:106-118`).** Add an `isExternalDocument`-aware
   `treeIter.prune()`, modelled directly on `bbj-linker.ts:47-58`'s `link()`, which already
   implements exactly this pattern for the linking pass: replace the plain
   `AstUtils.streamAllContents(rootNode)` iteration with `AstUtils.streamAst(rootNode).iterator()`,
   and call `treeIter.prune()` on any subtree rooted at a private `BBjClassMember` when the
   document is external (`wsManager.isExternalDocument(document.uri)`), mirroring `link()`'s own
   `externalDoc && isBBjClassMember(node)` branch. This is an in-repo precedent to copy, not a
   design to invent.

**Existing partial mitigation:** `bbj-index-manager.ts:14-28`'s `isAffected()` already skips
rebuilding external documents when only non-external URIs changed — present at the index-rebuild
layer, absent at both request-time paths this draft fixes.

**Measuring the win — no benchmark built:** #232's symptom is macOS-specific and load-dependent
(reported against a real multi-project workspace under the OS's own process-monitor); a sandboxed
timing number here would not reproduce the OS-level symptom and could mislead more than it
informs. The proposed acceptance criteria below are instead behavioral (cache hit/invalidation
correctness, pruning correctness) rather than a wall-clock target.

**Acceptance criteria:**
- A synthetic multi-document workspace fixture asserts `getBBjClassesFromFile` is called at most
  once per distinct `(bbjFilePath, docUri)` pair across N resolutions of the same reference (cache
  hit), and that the cache entry is invalidated when the underlying document is rebuilt.
- The same fixture (or a second one) asserts `collectLocalSymbols` does not descend into a private
  `BBjClassMember`'s subtree for a document flagged `isExternalDocument`, mirroring
  `bbj-linker.ts`'s existing `link()` pruning test coverage pattern if one exists, or a new
  equivalent test otherwise.
- `npm test` remains green; no existing scope/linking assertion regresses.

**Proposed labels:** area `scoping` (from the repository's existing area-label set); `PRIO 1`
(severity `high` maps to `PRIO 1` per INVENTORY §3d); effort `8`.

**No `gh` write subcommand was run to produce this draft.**

## DEBT-02

### Inherited evidence

Cites two `P61-*` records by ID, per D-07's two-unblocking-conditions split:

- **`P61-D5-003`** (`61-COVERAGE.md`, D5 cell narrative ~line 661, record ~line 900) — the three
  disabled `parser.test.ts` assertions: `'Check substring other cases'` (line 530), `'Release
  usage'` (line 811), and the `OutputHandler` array-type-ref test (line 860), each a commented-out
  `expectNoValidationErrors(result)` call blocked on Java classpath resolution being unavailable
  under `EmptyFileSystem`.
- **`P61-D5-010`** (`61-COVERAGE.md`, D5 cell narrative ~line 1862, record ~line 2139) — the
  `completion-test.test.ts:185` `test.skip('DEF FN parameters with $ suffix inside class
  method', ...)`, root-caused to a Langium completion-grammar-follower limitation that produces
  zero completions anywhere inside `MethodDecl.body` statement positions — independently of DEF FN
  and independently of the scope chain (both explicitly ruled out by the recorded investigation).

Neither trace is restated here.

### Currency check

```bash
grep -c 'DISABLED' bbj-vscode/test/parser.test.ts
```
**Literal output: `3`.**

```bash
grep -c 'test.skip' bbj-vscode/test/completion-test.test.ts
```
**Literal output: `1`.**

Both match the recorded counts exactly — no drift in either file's disabled/skipped count.

| Anchor | Recorded location | Current location | Construct | Result |
|---|---|---|---|---|
| Substring/`new String()` DISABLED assertion | `parser.test.ts:530` | `parser.test.ts:530` | `// DISABLED: 'String' is a Java class that cannot be resolved in EmptyFileSystem test context.` | **current** — identical line |
| `BBjAPI()` method-chain DISABLED assertion | `parser.test.ts:811` | `parser.test.ts:811` | `// DISABLED: BBjAPI() method chain (getGlobalNamespace, getValue, release) cannot be resolved` | **current** — identical line |
| `OutputHandler` array-type DISABLED assertion | `parser.test.ts:860` | `parser.test.ts:860` | `// DISABLED: 'String' and 'byte' are Java types that cannot be resolved in EmptyFileSystem` | **current** — identical line |
| TEST-03 `test.skip` | `completion-test.test.ts:185` | `completion-test.test.ts:185` | `test.skip('DEF FN parameters with $ suffix inside class method', async () => {` | **current** — identical line, identical root-cause comment (186-193) |

All four sites are at the exact recorded lines — zero drift.

### Verdict

Both angles are unresolved and unchanged since the swept SHA. Per D-07, DEBT-06 outranks DEBT-02's
own doc-only escape hatch: the documentation becomes the issue body, not an alternative to filing
one. Per D-06's mapping, both still-real items are `major-refactor`, drafted for Phase 69. Per the
plan's own instruction, these are recorded as **two** finding records with **two** issue-ready
drafts, because their unblocking conditions differ in kind (repo-local vs. upstream) — collapsing
them into one record would blur two different unblocking conditions into a false single one.

### Finding record

**Record 1 — the `parser.test.ts` trio:**

```
id:                P66-D5-001
unit:              DEBT-02
location:          bbj-vscode/test/parser.test.ts:530,811,860
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     trace
evidence:          Per INVENTORY §3b, D5 (test coverage) follows the tier of what the finding
                   asserts; these three are a missing/disabled-assertion gap, which is
                   trace-evidenced (not repro — there is no runtime behaviour to reproduce, only
                   the disabled state of the assertions themselves). Cites P61-D5-003 by ID (the
                   original trace of all three DISABLED sites and their stated blockers) plus
                   this plan's currency re-read (see Currency check above), confirming all three
                   sites are unchanged at their recorded lines with their recorded blocking
                   comments intact.
failure_scenario:  Any regression in Java-classpath-dependent validation for these three
                   scenarios — new String() substring validation, BBjAPI() global-namespace
                   method-chain resolution, and String[]/byte[] Java-typed class fields — would
                   pass the full npm test suite undetected, because the only assertions that
                   would catch it are commented out rather than executed.
classification:    major
                   (1) touches 1 file: n/a — this is an environment/test-infrastructure gap (no
                   Java classpath under EmptyFileSystem), not a single code edit — (2)-(5): n/a
                   for the same reason — (6) severity medium, primary dimension D5: the six D-13
                   tests are built for code-fix findings; per D-14 this is routed conservatively
                   as `major`, matching P61-D5-003's own precedent (and RU-61-06's P61-D5-001)
                   for the same class of environment-dependent gap.
effort:            4
dedup:             none — checked against the frozen 15-issue snapshot; no open issue concerns
                   these three disabled parser.test.ts assertions. #83/#90/#466 (this plan's
                   other checked neighbours) are unrelated dimensions/mechanisms.
disposition:       major-refactor
```

**Record 2 — the TEST-03 skip:**

```
id:                P66-D5-002
unit:              DEBT-02
location:          bbj-vscode/test/completion-test.test.ts:185
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     trace
evidence:          Per INVENTORY §3b's D5 rule (as above), this is trace-evidenced. Cites
                   P61-D5-010 by ID (the original root-cause trace: the Langium completion
                   engine's grammar follower produces zero candidate positions anywhere inside
                   MethodDecl.body statement positions, independently of DEF FN and independently
                   of the scope chain) plus this plan's currency re-read confirming the skip and
                   its root-cause comment are unchanged at the recorded line.
failure_scenario:  Any attempt to re-enable the skipped test, as currently written, against the
                   current completion-grammar traversal fails: the completion engine's grammar
                   follower does not produce candidate positions inside class-method statement
                   bodies at all, so the expected _f$/_t$ parameter items are never offered —
                   independent of DEF FN or the scope chain, both already ruled out by the
                   recorded root-cause investigation.
classification:    major
                   (1) touches 1 file: FAIL — the grammar-follower limitation is inside Langium's
                   completion engine's traversal of the grammar for MethodDecl.body statement
                   positions, not a single-file BBj-side fix — (2) no public API/grammar/LSP
                   change: FAIL — a real fix likely requires either a grammar restructuring of
                   MethodDecl.body statement completion positions or an upstream Langium
                   completion-provider change — (3)-(5): moot, already failing — (6) severity
                   medium, dimension D5: would pass in isolation, but classification is already
                   major from tests (1)/(2).
effort:            8
dedup:             none — checked against the frozen 15-issue snapshot; no open issue addresses
                   this Langium completion-grammar-follower limitation.
disposition:       major-refactor
```

### Issue-ready draft

**Draft 1 — the `parser.test.ts` trio. Unblocking condition: repo-local, actionable in this
repository.**

**Title:** Enable 3 disabled `parser.test.ts` assertions under a Java-classpath-backed test
fixture

**Problem statement:** Three validation assertions are disabled (commented out) because they
depend on Java classpath resolution (`String`, `BBjAPI()`, `String[]`/`byte[]`) that the current
`EmptyFileSystem` test context cannot provide.

**`file:line` evidence:** `bbj-vscode/test/parser.test.ts:530` (`new String()(1)` substring
case), `:811` (`BBjAPI().getGlobalNamespace().getValue().release()` chain), `:860`
(`OutputHandler` class with `String[]`/`byte[]`-typed field/method).

**Verified failure scenario:** A regression in any of the three Java-classpath-dependent
validation paths above passes `npm test` undetected, since the only assertions covering them are
commented out.

**Proposed approach:** Run these three tests under a **repo-local Java classpath** available under
a non-`EmptyFileSystem` fixture — i.e., `createBBjTestServices` (`bbj-vscode/test/bbj-test-module.ts`)
extended with real classpath data (or a richer `JavaInteropTestService` fixture covering `String`,
`BBjAPI`'s namespace/semaphore methods, and Java array types) rather than the current fake-class
stub. This is the **unblocking condition**: nothing outside this repository needs to change.

**Acceptance criteria:** These three assertions run (uncommented) and pass under the new fixture;
no other test in `parser.test.ts` regresses.

**Proposed labels:** area `validation` (the three disabled calls are all `expectNoValidationErrors`);
`PRIO 2` (severity `medium`); effort `4`.

**Draft 2 — the TEST-03 skip. Unblocking condition: upstream, outside this repository.**

**Title:** TEST-03 (`DEF FN` params inside class methods) blocked on Langium's completion grammar
follower

**Problem statement:** The completion provider offers zero completions anywhere inside
`MethodDecl.body` statement positions — not a DEF FN-specific or scope-chain bug, but a Langium
completion-engine grammar-traversal limitation.

**`file:line` evidence:** `bbj-vscode/test/completion-test.test.ts:185` (`test.skip`), with the
root-cause investigation recorded in the test's own comment (lines 186-193).

**Verified failure scenario:** Re-enabling the test as written fails against the current grammar
traversal, because the completion engine never produces candidate positions inside class-method
statement bodies — independent of DEF FN and independent of the scope chain (both already
eliminated by the recorded investigation).

**Proposed approach:** Track Langium's completion grammar follower resolving inside
`MethodDecl.body` — this is the **unblocking condition**, and it is upstream, in Langium itself,
not in this repository's grammar or scope code.

**Acceptance criteria:** When the upstream Langium completion-grammar follower resolves candidate
positions inside `MethodDecl.body` statement positions, this skip is removed and the test passes
as written. This repository cannot close this issue alone — the acceptance criteria intentionally
do not imply otherwise.

**Proposed labels:** area `grammar` (the root cause is Langium's grammar-traversal behavior for
completion); `PRIO 2` (severity `medium`); effort `8`.

**Deliberately out of this phase's denominator:** `bbj-vscode/test/linking.test.ts:85`'s third
`test.skip('Link to string template array members', ...)` is named by **no** `DEBT-*` item
(confirmed: `grep -n "test.skip" bbj-vscode/test/linking.test.ts` returns exactly this one line,
and no `DEBT-NN` bullet in `PROJECT.md` references it) and is deliberately outside this phase's
8-row denominator per `66-CONTEXT.md`'s `<deferred>` section — a reader counting three skipped
tests across the suite (this one, plus the two above) is not left wondering why only two are
verdicted here.

**No `gh` write subcommand was run to produce either draft.**

## DEBT-03

### Inherited evidence

Cites both `P61-*` records by ID — the reproduction angle and the untested-regression angle:

- **`P61-D2-011`** (`61-COVERAGE.md`, D2 cell narrative ~line 1516, record ~line 1527) — the
  reproduction: a synthetic `JavaMethod` (`valueOf`, `returnType: 'java.lang.String'`) with
  `resolvedReturnType` left unset produced **zero** "incompatible type" diagnostics when validated
  against a declared `java.util.HashMap` return type, proving `getType()` silently returned
  `undefined` instead of the expected mismatch.
- **`P61-D5-009`** (`61-COVERAGE.md`, D5 cell narrative ~line 1519, record ~line 1797) — the
  untested-regression angle: the gap exists only as prose (`STATE.md`, `ROADMAP.md`), with no
  committed regression test asserting a static Java method call's inferred type.

Neither trace is restated here.

### Currency check

The Phase 61 reproduction used a throwaway vitest test, deleted before commit (`git status
--porcelain bbj-vscode` was clean at sweep time) — it cannot be re-run by citation alone, and it
is **not** re-run here (no fresh reproduction was executed by this plan). Instead, INVENTORY §3b's
`repro` bar is cleared by its **second form**: a line-by-line trace from current code.

```bash
grep -n "isJavaMethod(member)" bbj-vscode/src/language/bbj-type-inferer.ts
```
**Literal output:** `75:                } else if (isJavaMethod(member)) {`

Read directly (`bbj-vscode/src/language/bbj-type-inferer.ts:65-90`): the `getTypeInternal`
`isMemberCall` branch's `isJavaMethod(member)` case (lines 75-76) reads

```ts
} else if (isJavaMethod(member)) {
    return member.resolvedReturnType?.ref;
```

with **no fallback** to the always-present raw `member.returnType: string`
(`generated/ast.ts:1350`) when `resolvedReturnType` is unset. Compare the sibling branches
immediately below: `isMethodDecl(member)` (line 77) and `isFieldDecl(member)` (line 79) both call
`getClass(member.returnType)` / `getClass(member.type)` directly off the raw, always-present type
string — only the `isJavaMethod` branch has no equivalent fallback.

| Anchor | Recorded location | Current location | Construct | Result |
|---|---|---|---|---|
| `isJavaMethod` branch, no fallback | `bbj-type-inferer.ts:75-76` | `bbj-type-inferer.ts:75-76` | `} else if (isJavaMethod(member)) { return member.resolvedReturnType?.ref; }` | **current** — identical lines, identical code, no fallback added |

Zero drift — the exact code `P61-D2-011` reproduced against is still present, unmodified, at the
identically recorded line range.

### Verdict

The code is unchanged since the swept SHA (confirmed by the phase-wide empty diff and this
anchor's exact-line match): the item is **still real**. Per D-06's exception clause, this verdicts
`easy-fix` — not `major-refactor` — because both inherited records (`P61-D2-011` and `P61-D5-009`)
already independently classified `easy` with all six §3c tests passing, and re-evaluating each
test against the current, unchanged code confirms the same result (see Finding record below): the
fix touches one file, adds no public API/grammar/LSP change, adds no dependency, is
regression-testable with the existing vitest harness, the exact edit is nameable, and severity is
`medium` (not `critical`/`high`, and dimension is D2 not D1).

### Finding record

```
id:                P66-D2-001
unit:              DEBT-03
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
secondary:         [D5]
severity:          medium
evidence_tier:     repro
evidence:          Because a secondary dimension (D5) is set, INVENTORY §3b's adjacency rule
                   requires the stricter of the two tiers; D2 is repro-tier and D5 is
                   trace-tier-by-assertion, so repro (the stricter) governs and is recorded here.
                   Cites P61-D2-011 (the original reproduction, evidence not restated) and
                   P61-D5-009 (the untested-regression angle, evidence not restated) by ID, plus
                   this plan's line-by-line re-read of the current isJavaMethod branch (see
                   Currency check above), which clears the repro bar's second form: a trace naming
                   the concrete inputs/state (a JavaMethod whose resolvedReturnType is unset — any
                   path bypassing java-interop.ts's async Phase 2, java-interop.ts:615-618) and
                   the exact file:line where behaviour diverges (bbj-type-inferer.ts:75-76's
                   missing fallback to the always-present raw member.returnType string).
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType has
                   not (yet, or ever) been populated — a resolution race, a partially resolved
                   class, or any future code path constructing/updating a JavaMethod outside
                   java-interop.ts's own resolveClass() Phase 2 — causes bbj-type-inferer.ts to
                   silently return no type for that call site, with no diagnostic explaining why.
                   Matches DEBT-03's documented symptom (String.valueOf(2) assigns no type to the
                   target variable).
classification:    easy
                   (1) touches 1 file: pass — the fallback edit lives entirely inside the
                   isJavaMethod branch of bbj-type-inferer.ts's getTypeInternal — (2) no public
                   API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                   regression-testable with the existing vitest harness: pass — the same
                   method-return-java-type.test.ts #437 mismatch-detection mechanism the original
                   reproduction used can carry a committed regression test — (5) reviewer can name
                   the exact edit: pass — in the isJavaMethod branch, fall back to
                   this.javaInterop.getResolvedClass(member.returnType) when
                   resolvedReturnType?.ref is undefined — (6) severity medium, dimension D2 (not
                   D1): pass — all six pass, easy. Both inherited records (P61-D2-011,
                   P61-D5-009) independently reached the same easy classification; re-evaluating
                   against the current, byte-for-byte-unchanged code reproduces the same result.
effort:            4
dedup:             #466 (Detect sibling-type method return mismatches via Java class hierarchy) —
                   checked and recorded as unrelated: #466 requests a validation that compares an
                   ALREADY-RESOLVED return type against a Java class hierarchy (e.g. a HashMap
                   returned where a TreeMap was declared) — its premise is that getType() already
                   produced a type to compare. This finding is about getType() producing no type
                   at all in the first place (silently returning undefined), a different and
                   upstream mechanism from #466's hierarchy-comparison concern; a fix for this
                   finding is a precondition for #466's validation ever having a type to compare
                   in the resolvedReturnType-unset case, but the two are not duplicates and do not
                   partially overlap in what they each check.
disposition:       easy-fix
```

### Issue-ready draft

**Title:** `bbj-type-inferer.ts`'s `isJavaMethod` branch drops the return type when
`resolvedReturnType` is unresolved — add a raw-`returnType` fallback

**Problem statement:** `getTypeInternal`'s `isJavaMethod(member)` branch returns
`member.resolvedReturnType?.ref` with no fallback to the always-present raw
`member.returnType: string`, so any call site whose Java method type has not (yet, or ever) been
async-resolved by `java-interop.ts`'s Phase 2 silently receives `undefined` instead of a usable
type, with no diagnostic explaining why.

**`file:line` evidence:** `bbj-vscode/src/language/bbj-type-inferer.ts:75-76`.

**Verified failure scenario:** `String.valueOf(2)` (a static Java method call) assigns no
inferred type to its target variable, matching `PROJECT.md`'s documented symptom exactly; the
inherited reproduction (`P61-D2-011`) demonstrated this produces zero "incompatible type"
diagnostics even against a declared, mismatched return type.

**Proposed approach — named edit:** In `getTypeInternal`'s `isJavaMethod` branch
(`bbj-type-inferer.ts:75-76`), fall back to
`this.javaInterop.getResolvedClass(member.returnType)` when `member.resolvedReturnType?.ref` is
`undefined`, using the method's own always-present raw `returnType: string`
(`generated/ast.ts:1350`) as the fallback input — the same resolution mechanism `java-interop.ts`'s
own Phase 2 already uses, just invoked synchronously against the raw string instead of waiting on
the async-populated `resolvedReturnType` reference.

**Acceptance criteria:**
- `String.valueOf(2)` (and any other static/instance Java method call with an unresolved
  `resolvedReturnType`) infers a usable type instead of `undefined`.
- A new committed regression test (the untested-regression angle `P61-D5-009` recorded — no such
  test currently exists in the committed tree) asserts the inferred/propagated type of a static
  Java method call using the existing `method-return-java-type.test.ts` `#437`
  mismatch-detection mechanism.
- `npm test` remains green; no existing type-inference assertion regresses.

**Proposed labels:** area `types` (from the repository's existing area-label set); `PRIO 2`
(severity `medium`); effort `4`.

**No `gh` write subcommand was run to produce this draft.**

## Plan 66-01 accounting

**Rows and records this plan verdicted.** Three of the eight denominator items (DEBT-01, DEBT-02,
DEBT-03) are verdicted by this plan, spanning **4 `PROJECT.md`-line register rows** (251, 253,
254, 257 — DEBT-02 owns two rows per D-07's two-unblocking-conditions split) and **4 finding
records** (`P66-D3-001`, `P66-D5-001`, `P66-D5-002`, `P66-D2-001`) — "3 rows, 4 records" in the
plan's own shorthand, where "rows" counts denominator *items* and "records" counts the finding
records those items produced.

**Finding IDs allocated by this plan:** `P66-D3-001` (DEBT-01), `P66-D5-001` and `P66-D5-002`
(DEBT-02), `P66-D2-001` (DEBT-03) — all four, per the pre-allocation table above, matched their
pre-allocated slots exactly; none resolved `already-covered`/`not-reproducible` (the phase-wide
diff was empty, so nothing had changed since the swept SHA), so no pre-allocated ID went unused.

**Pre-allocated IDs left for later plans:** `P66-D2-002` (DEBT-04) and `P66-D4-001` (DEBT-05),
left for `66-02`; `P66-D2-003` (DEBT-07) and `P66-D5-003` (DEBT-08), left for `66-03`. Their
register rows (250, 256 pending `66-02`; 252, 255 pending `66-03`) are carried above with the
explicit `pending 66-02` / `pending 66-03` cells — never left blank.

**Zero source files modified, zero tracker writes.** Re-run at this plan's completion:

```bash
git status --porcelain bbj-vscode bbj-intellij java-interop .github
```
**Literal output: (empty — nothing).**

```bash
git status --porcelain .planning/reviews/INVENTORY.md .planning/reviews/61-COVERAGE.md .planning/reviews/62-COVERAGE.md .planning/reviews/63-COVERAGE.md .planning/reviews/64-COVERAGE.md .planning/reviews/65-COVERAGE.md
```
**Literal output: (empty — nothing).**

No `gh` write subcommand ran anywhere in this plan — only the read-only `gh issue view 232` and
`gh issue view 466` queries recorded above (`## Dedup source`, `## DEBT-01`, `## DEBT-03`'s dedup
field). D-01 (verdict-only, no source change) and D-02 (zero tracker writes) both hold, evidenced
by literal command output rather than asserted.
