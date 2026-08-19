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
| `P66-D2-002` | DEBT-04 | 66-02 | D2 | Allocated — see `## DEBT-04` |
| `P66-D4-001` | DEBT-05 | 66-02 | D4 | Allocated — see `## DEBT-05` |
| `P66-D2-003` | DEBT-07 | 66-03 | D2 | Allocated — see `## DEBT-07` |
| `P66-D5-003` | DEBT-08 | 66-03 | D5 | Allocated — see `## DEBT-08` |

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
| 250 | BbjCompletionFeature still extends LSPCompletionFeature | DEBT-05 | `P66-D4-001` | major-refactor — see `## DEBT-05` |
| 251 | CPU stability mitigations documented but not yet implemented (#232) | DEBT-01 | `P66-D3-001` | major-refactor — see `## DEBT-01` |
| 252 | CPL-06 hierarchy suppression takes one extra build cycle after BBjCPL merge | DEBT-07 | `P66-D2-003` | major-refactor — see `## DEBT-07` |
| 253 | TEST-03 (DEF FN completion inside class methods) skipped | DEBT-02 | `P66-D5-002` | major-refactor — see `## DEBT-02` |
| 254 | 3 parser.test.ts assertions DISABLED | DEBT-02 | `P66-D5-001` | major-refactor — see `## DEBT-02` |
| 255 | IntelliJ TextMate bundle filename registration unverified | DEBT-08 | `P66-D5-003` | wontfix (blocked on `P64-D6-010`) — see `## DEBT-08` |
| 256 | FQN path static-only filtering deferred | DEBT-04 | `P66-D2-002` | major-refactor — see `## DEBT-04` |
| 257 | Static method return type inference gap | DEBT-03 | `P66-D2-001` | easy-fix — see `## DEBT-03` |

**Rows 66-01 verdicted:** 251, 253, 254, 257 — four `PROJECT.md`-line rows, covering the three
items (DEBT-01, DEBT-02, DEBT-03) that plan owns; DEBT-02 spans two bullets/rows (253, 254) because
D-07's two-unblocking-conditions split (see `## DEBT-02`) keeps them as two distinct register rows
even though both resolve under the one `DEBT-02` requirement. **Rows 66-02 verdicted:** 250 and 256
(DEBT-05, DEBT-04 — see `## DEBT-05`/`## DEBT-04`), closing out this plan's own two owed rows in
full. **Rows 66-03 verdicted:** 252 and 255 (DEBT-07, DEBT-08 — see `## DEBT-07`/`## DEBT-08`),
closing the two orphan bullets `INVENTORY.md:1220` recorded by adding `DEBT-07`/`DEBT-08` to
`REQUIREMENTS.md`, never by editing `INVENTORY.md` — confirmed unchanged by the literal
`git status --porcelain` output in `## INVENTORY.md non-edit evidence (D-05)` above. **All eight
denominator rows now carry a verdict; no row in this register carries a `pending` marker.**

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

## DEBT-05

DEBT-05 arrives with a designated inherited evidence record — `P63-D4-010` — but 63-COVERAGE.md
explicitly could not resolve PROJECT.md's "19 experimental API usages" figure from this tree and
said so. This is the one item where Phase 66 can do something no sweep could: measure directly
against the locally cached LSP4IJ 0.19.0 artifact, the version actually shipped (D-10).

### Baseline re-derivation

63-COVERAGE.md's own two counts, re-run live at this plan's execution time, each command with its
literal output:

```bash
grep -rn "ApiStatus.Experimental\|@Experimental" bbj-intellij/src/main/java | wc -l
```
**Literal output: `0`.**

```bash
grep -rln "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java | wc -l
```
**Literal output: `11`.**

```bash
grep -rn "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java | wc -l
```
**Literal output: `20`.**

All three match the recorded baseline exactly — **no drift to report.** The 11 files: this unit's
own 7 (`lsp/BbjCompletionFeature.java`, `lsp/BbjLanguageClient.java`,
`lsp/BbjLanguageServerFactory.java`, `lsp/BbjLanguageServer.java`, `ui/BbjJavaInteropService.java`,
`ui/BbjServerService.java`, `ui/BbjStatusBarWidget.java`) plus `RU-63-01`'s
`BbjCompileAction.java`/`BbjRefreshJavaClassesAction.java`/`BbjRunActionBase.java` and
`RU-63-04`'s `composer/BbjComposerService.java` — re-confirmed present by name in the live `grep
-rln` output above.

The first count is about **our** source carrying `@ApiStatus.Experimental`/`@Experimental` —
zero, as recorded. The annotations that actually matter for DEBT-05's question are on **LSP4IJ's
own** classes, which no grep over `bbj-intellij/src/main/java` can see. That is what the next
subsection measures directly, against the jar itself — the thing 63-COVERAGE.md said it could not
do from this tree.

### Jar measurement (D-10)

**Jar path** (verified readable before this measurement began, per this task's `<precondition>`):

```
~/.gradle/caches/8.13/transforms/adf3542fc53c5acc20d2eaa00b91d526/transformed/com.redhat.devtools.lsp4ij-0.19.0/lsp4ij/lib/lsp4ij-0.19.0.jar
```

`test -r "$JAR"` exited `0`; `ls -la "$JAR"` showed a 2,225,085-byte file dated `2026-07-19`.
`javap -version` exited `0` (JDK 25.0.3's bundled `javap`). This jar's own pinned version matches
what `bbj-intellij` actually declares:

```
bbj-intellij/build.gradle.kts:27:        plugin("com.redhat.devtools.lsp4ij:0.19.0")
```

so the measurement below is against the artifact this plugin actually ships against, not an
assumed or unpinned version.

**Method.** `javap -v -cp "$JAR" <FQN>` against each of the nine targets, reading the
`RuntimeInvisibleAnnotations:` block attached to the class declaration itself (printed by `javap`
near the end of its output, after `SourceFile:` and before `NestMembers:`/`BootstrapMethods:` —
this is where `javap -v` places class-level annotations, not immediately after the `public class
...` header line) for the class-level annotation, and the same block attached to each specific
overridden/called member for the member-level annotation. Confirmed first, via `unzip -l "$JAR"`,
that all nine target `.class` files exist inside the jar under their expected package paths —
none is absent. All nine `javap -v` invocations exited `0` — no target was truncated, missing, or
unreadable, so the **all-or-nothing rule** is satisfied with every target individually cited below
(none needed the `unreadable` fallback).

**Result table** — one row per target, the class-level annotation, the specific member(s) our
code overrides or calls, and that member's own annotation:

| # | Target (FQN) | Our coupling | Class-level annotation | Member(s) touched | Member-level annotation |
|---|---|---|---|---|---|
| 1 | `client.features.LSPCompletionFeature` | `BbjCompletionFeature extends` it, `@Override getIcon(CompletionItem)` (`lsp/BbjCompletionFeature.java:19,21`) | **`@ApiStatus.Experimental`** | `getIcon(CompletionItem)` | none — only `@Nullable`/`@NotNull` on the method itself. (A sibling method, `addLookupItem(...)`, carries `@ApiStatus.Internal` — not overridden by our code.) |
| 2 | `LanguageServerFactory` | `BbjLanguageServerFactory implements` it (`lsp/BbjLanguageServerFactory.java:21`) | none — no `ApiStatus` reference anywhere in this class file | `createConnectionProvider`, `createLanguageClient`, `getServerInterface`, `createClientFeatures` (all `@Override`, `:23-64`) | none |
| 3 | `client.features.LSPClientFeatures` | anonymous subclass returned by `createClientFeatures()`, `@Override initializeParams(InitializeParams)` (`lsp/BbjLanguageServerFactory.java:41-52`), plus `.setDocumentLinkFeature(...)`/`.setCompletionFeature(...)` builder calls (`:58,64`) | **`@ApiStatus.Experimental`** | `initializeParams(InitializeParams)`, `setDocumentLinkFeature(...)`, `setCompletionFeature(...)` | none on any of the three — only `@NotNull` parameter annotations. (`setServerWrapper`/`getServerWrapper`, a different pair this code never calls, carry `@ApiStatus.Internal`.) |
| 4 | `client.features.LSPDocumentLinkFeature` | anonymous subclass, `@Override isSupported(PsiFile)` (`lsp/BbjLanguageServerFactory.java:58-62`) | **`@ApiStatus.Experimental`** | `isSupported(PsiFile)` | none |
| 5 | `server.StreamConnectionProvider` | return type of `createConnectionProvider(Project)` (`lsp/BbjLanguageServerFactory.java:23-24`); implemented (via `OSProcessStreamConnectionProvider`, target 7) | none — no `ApiStatus` reference anywhere in this interface's class file | (interface type only, no member override at this level) | n/a |
| 6 | `client.LanguageClientImpl` | `BbjLanguageClient extends` it, `@Override createSettings()` and `@Override handleServerStatusChanged(ServerStatus)` (`lsp/BbjLanguageClient.java:18,24-25,34-35`) | none — this class's own disassembly ends after `SourceFile:`/`BootstrapMethods:` with no class-level `RuntimeInvisibleAnnotations:` block | `createSettings()`, `handleServerStatusChanged(ServerStatus)` | none on either — only `@Nullable`/`@NotNull`. (`setServerWrapper(LanguageServerWrapper)`, not called by our code, carries `@ApiStatus.Internal`.) |
| 7 | `server.OSProcessStreamConnectionProvider` | `BbjLanguageServer extends` it, calls `super.setCommandLine(...)` from its constructor (`lsp/BbjLanguageServer.java:28,40`) | none — no `ApiStatus` reference anywhere in this class file | constructor path / `setCommandLine(GeneralCommandLine)` | none |
| 8 | `LanguageServerManager` | `ui/BbjServerService.java:208` — `LanguageServerManager.getInstance(project)`, then `manager.stop("bbjLanguageServer")`/`manager.start("bbjLanguageServer")` (`:209-210`) | none — no `ApiStatus` reference anywhere in this class file | `getInstance(Project)`, `start(String)`, `stop(String)` | none on any of the three |
| 9 | `ServerStatus` | consumed as enum values (`.started`/`.stopped`/`.stopping`/`.starting`) across `ui/BbjServerService.java`, `ui/BbjJavaInteropService.java`, `ui/BbjStatusBarWidget.java` — never subclassed | none — no `ApiStatus` reference anywhere in this class file | enum constants (plain value comparisons, no override) | none |

**Reading the table.** Three of the nine targets — `LSPCompletionFeature`, `LSPClientFeatures`,
`LSPDocumentLinkFeature` — carry `@ApiStatus.Experimental` at the **class** level; these are
exactly the three that `BbjCompletionFeature`/`BbjLanguageServerFactory` subclass or anonymously
implement, PROJECT.md's own named coupling of concern. `LSPCompletionFeature`'s
`addLookupItem(...)` and `LSPClientFeatures`'/`LanguageClientImpl`'s `setServerWrapper`/
`getServerWrapper` carry `@ApiStatus.Internal` individually, but **none of these three is a member
our code overrides or calls** — the specific override points our code actually depends on
(`getIcon`, `initializeParams`, `setDocumentLinkFeature`, `setCompletionFeature`, `isSupported`,
`createSettings`, `handleServerStatusChanged`) carry **no annotation of their own** on any of the
nine targets; their instability exposure comes entirely from their *enclosing class* being marked
experimental, not from the members themselves. The remaining six targets
(`LanguageServerFactory`, `StreamConnectionProvider`, `OSProcessStreamConnectionProvider`,
`LanguageServerManager`, `ServerStatus`, and `LanguageClientImpl` itself at the class level) carry
**zero** `ApiStatus` references anywhere in their class files — confirmed by an empty `grep -c
"org.jetbrains.annotations.ApiStatus"` result over each of their full `javap -v` outputs, not
merely an absence noticed by inspection.

### The "19", settled or retired

PROJECT.md's "19 experimental API usages" figure does **not** come from a grep or `javap` count
over a specific class set the way this task's own table does — its real provenance, traced back
through this project's own history (`git log --all -S "19 experimental" -- .planning/PROJECT.md`
and neighbouring `-S "experimental API"` history), is the **JetBrains IntelliJ Plugin Verifier's**
own compatibility report, run at v3.6 Phase 49 and recorded verbatim in
`.planning/milestones/v3.6-phases/49-fix-deprecated-apis-and-verify/49-01-VERIFICATION.md:84`:

> All versions report "Compatible. 19 usages of experimental API" — the experimental API usages
> are from LSP4IJ and are expected per requirements EXP-01/EXP-02.

— across all 6 target IDE versions checked that day (2026-02-10). This **is** a measured figure,
with a real, named, citable source; it is not an unsourced number invented for PROJECT.md. But it
is a **different kind of measurement** than this task's own table: the Plugin Verifier counts
**usage sites** across the plugin's entire compiled bytecode against LSP4IJ's *and the IntelliJ
Platform's* full experimental-API surface (every call site into any `@ApiStatus.Experimental`
member, anywhere in the plugin, not limited to nine hand-picked extension points), whereas this
task's table counts **class-level declarations** across exactly the nine classes/interfaces our
code touches. The two numbers are not directly comparable and this record does not force them to
be: **`19` is settled as to provenance** — it is the Plugin Verifier's own count, dated
2026-02-10 — but it is **not re-derived live in this sandbox**, because doing so requires running
`./gradlew` (a `verifyPlugin` or `buildPlugin` task), and `./gradlew build` in this environment
fails on the JDK 17-vs-25.0.3 local toolchain mismatch (`P64-D6-010`) before any such task can
run. Restating `19` here as if this task had freshly measured it would be exactly the fabricated-
measurement failure this plan is bound not to commit; instead, the number is **settled by naming
its real source** (the Feb 10, 2026 Plugin Verifier run) rather than by this task's own jar
inspection, and this task's own 3-of-9-classes-experimental count is recorded above as
independent, narrower, freshly-measured corroborating evidence — consistent with, but not a
recomputation of, the Verifier's figure.

### Verdict

The measurement answers the question directly: `BbjCompletionFeature`'s subclassing of
`LSPCompletionFeature`, and `BbjLanguageServerFactory`'s anonymous implementation of
`LSPClientFeatures`/`LSPDocumentLinkFeature`, are **not** an accepted, stable extension point —
LSP4IJ itself marks all three classes `@ApiStatus.Experimental` at the class level in the exact
0.19.0 artifact this plugin ships against, meaning JetBrains explicitly disclaims API stability
for precisely the surface this plugin's completion-icon and document-link wiring depends on. This
is a genuine, still-open upgrade hazard, matching `P63-D4-010`'s own disposition. Per D-06's
mapping, a still-real item drafted for Phase 69 is `major-refactor`. The concrete, actionable edit
this phase can name (unlike `P63-D4-010`, which recorded the coupling shape without a fix) is a
regression-catching **contract test** for the three experimentally-marked extension points —
`bbj-intellij` has no `src/test/` source set at all (`P63-D5-001`), so nothing today would catch a
breaking LSP4IJ release before it ships.

### Finding record

```
id:                P66-D4-001
unit:              DEBT-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java:19,21
                   (extends LSPCompletionFeature; @Override getIcon(CompletionItem));
                   bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:39-64
                   (anonymous LSPClientFeatures with a nested LSPDocumentLinkFeature override);
                   bbj-intellij/build.gradle.kts:27 (the pinned 0.19.0)
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
                   D4's tier per INVENTORY §3b — cleared by the jar-measurement annotation table
                   above (a written trace naming the exact class-level RuntimeInvisibleAnnotations
                   block on each of the three coupled classes), not by a runtime reproduction.
evidence:          The jar path, the three re-derived baseline commands with literal outputs (0,
                   11, 20 — no drift), and the nine-row annotation table in the Jar measurement
                   subsection above: LSPCompletionFeature, LSPClientFeatures and
                   LSPDocumentLinkFeature — the three classes BbjCompletionFeature/
                   BbjLanguageServerFactory actually subclass or anonymously implement — each
                   carry a class-level RuntimeInvisibleAnnotations -> ApiStatus$Experimental block
                   in the cached lsp4ij-0.19.0.jar, read directly via javap -v (not asserted from
                   documentation or a changelog). The specific overridden/called members
                   (getIcon, initializeParams, setDocumentLinkFeature, setCompletionFeature,
                   isSupported) carry no annotation of their own; their exposure is inherited from
                   the enclosing class's own Experimental marking.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — a breaking
                   signature or semantics change to LSPCompletionFeature.getIcon(),
                   LSPClientFeatures's initializeParams()/setDocumentLinkFeature()/
                   setCompletionFeature() builder chain, or LSPDocumentLinkFeature.isSupported()
                   in a future LSP4IJ release (explicitly permitted by their own
                   @ApiStatus.Experimental contract) would surface as a compile failure or a
                   silent behaviour change across BbjCompletionFeature.java and
                   BbjLanguageServerFactory.java at plugin-update time, with no regression test
                   anywhere in this module (P63-D5-001) to catch a silent one before release.
classification:    major
                   (1) touches 1 file: FAIL — a complete fix needs a new bbj-intellij/src/test/
                   source set exercising both BbjCompletionFeature.java and
                   BbjLanguageServerFactory.java, two files, and per P64-D6-010 even running that
                   suite locally is currently blocked by the JDK toolchain mismatch — (2) no
                   public API/grammar/LSP change: pass — (3) no new dependency: n/a — records an
                   existing dependency's coupling shape, adds nothing — (4) regression-testable
                   with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) —
                   (5) reviewer can name the exact edit: pass — see Issue-ready draft below,
                   which P63-D4-010 itself did not attempt (it recorded the coupling shape only,
                   deferring the re-triage to this phase) — (6) severity medium, dimension D4
                   (not D1): pass — tests (1) and (4) both fail, so classification is major
                   regardless of (2)/(3)/(5)/(6).
effort:            4
                   (matches P63-D4-010's own recorded effort — no departure; the added
                   contract-test scope is bounded to the three already-identified extension
                   points, not a open-ended investigation).
dedup:             supersedes P63-D4-010 (63-COVERAGE.md, this phase's designated DEBT-05
                   evidence record) — not re-derived, re-triaged with this plan's own live jar
                   measurement in place of P63-D4-010's coupling-shape-only trace. #410 (Zed
                   Editor support request) and #231 (custom classpath/CLI settings request)
                   re-checked against this file's `## Dedup source` composition-check table above
                   — both remain unrelated to LSP4IJ API coupling, consistent with P63-D4-010's
                   own dedup finding.
disposition:       major-refactor
```

### Issue-ready draft

**Title:** Add a regression-catching contract test for the 3 LSP4IJ extension points
`bbj-intellij` depends on that are marked `@ApiStatus.Experimental`

**Problem statement:** `LSPCompletionFeature` (subclassed by `BbjCompletionFeature`),
`LSPClientFeatures` and `LSPDocumentLinkFeature` (both anonymously implemented in
`BbjLanguageServerFactory.createClientFeatures()`) are marked `@ApiStatus.Experimental` at the
class level in the locally cached LSP4IJ 0.19.0 jar — verified by reading each class's
`RuntimeInvisibleAnnotations` block directly via `javap -v`. JetBrains explicitly disclaims API
stability for exactly the extension points this plugin's completion-icon and document-link wiring
depends on, and `bbj-intellij` has no `src/test/` source set (`P63-D5-001`) to catch a breaking
change before a plugin-version bump ships it.

**`file:line` evidence:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java:19` (`extends
  LSPCompletionFeature`), `:21` (`@Override getIcon(CompletionItem)`).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:39-64`
  (anonymous `LSPClientFeatures` overriding `initializeParams`, with a nested
  `LSPDocumentLinkFeature` override of `isSupported`).
- `bbj-intellij/build.gradle.kts:27` (the pinned `0.19.0`).
- This plan's own `javap -v` output over
  `com/redhat/devtools/lsp4ij/client/features/{LSPCompletionFeature,LSPClientFeatures,LSPDocumentLinkFeature}.class`
  in the cached jar — each carries a class-level `RuntimeInvisibleAnnotations` ->
  `org.jetbrains.annotations.ApiStatus$Experimental` block (recorded in the annotation table
  above).

**Verified failure scenario (traced, not runtime-reproduced — a code-shape finding, per D4's
`trace` tier):** Any LSP4IJ release that changes `getIcon(CompletionItem)`'s signature, or
removes/renames `initializeParams`/`setCompletionFeature`/`setDocumentLinkFeature`/`isSupported`,
either fails `bbj-intellij`'s compile (caught immediately, low risk) or silently changes runtime
behaviour (not caught at all today — no test exercises any of these override points).

**Proposed approach:** Add a first `bbj-intellij/src/test/` source set (closing part of
`P63-D5-001`'s zero-test-source-set gap for this specific surface) asserting: (1)
`BbjCompletionFeature` still compiles as a subtype of `LSPCompletionFeature` and its
`getIcon(CompletionItem)` override signature still matches its base declaration; (2)
`BbjLanguageServerFactory.createClientFeatures()`'s anonymous `LSPClientFeatures`/
`LSPDocumentLinkFeature` overrides (`initializeParams`, `isSupported`) still match their base
signatures. A compile-time signature-shape assertion is sufficient to convert "silent behaviour
change" into "compile failure", which is the acceptance bar this draft sets.

**Acceptance criteria:**
- A `bbj-intellij/src/test/` source set exists, exercising at minimum the three override points
  named above.
- `./gradlew build` — once `P64-D6-010`'s JDK 17-vs-25.0.3 toolchain mismatch is resolved — passes
  with the new test.
- No claim is made about the "19 experimental API usages" Plugin Verifier figure beyond what this
  issue's own body states (settled by provenance, not re-derived here).

**Proposed labels:** area `intellij` (from the repository's existing area-label set — the closer
match; this is a plugin-internal coupling concern, not a general dependency-version-bump request)
— `dependencies` is a secondary candidate; `PRIO 2` (severity `medium` maps to `PRIO 2` per
INVENTORY §3d); effort `4`.

**No `gh` write subcommand was run to produce this draft.**

## DEBT-04

DEBT-04 is the one item on the denominator with **zero inherited sweep evidence** — no Phase
61-65 finding was ever recorded for it. `61-COVERAGE.md:1862` (`RU-61-06`'s D5 cell) independently
noticed the gap while sweeping test coverage, but explicitly declined to file a second overlapping
finding: "Confirmed the DEBT-04 FQN static-only completion-filtering gap has only a prose record
in `REQUIREMENTS.md`, no dedicated regression test — noted as context, not a new finding". So this
section leads with a fresh trace rather than a citation.

### Why no live reproduction was attempted

Stated before the evidence, so the trace below is never read as a substitute for a reproduction
that was silently skipped: this sandbox has known pre-existing test failures that an open
`java-interop` port does not resolve. `PROJECT.md`'s own measured test/build state (read at this
plan's execution time) records **11 failed | 850/843 passed (run-dependent) | 25-79 skipped (886
total)**, "all 11 failures environment-classified (java-interop unreachable in this sandbox)" — a
condition CONTEXT.md's D-09 names directly as the reason a live repro would be indistinguishable
from a failed setup, and therefore a **worse** evidence record than an honest, labelled trace. No
attempt was made to start `java-interop`, connect a real BBj backend, or run a completion request
against a live language server in this task. Everything in the `### Static trace` subsection below
is a **read of the committed source**, not an observed runtime result.

### Static trace

**The detection point — `bbj-vscode/src/language/bbj-scope.ts`, `getScope`'s member-completion
branch (lines 191-234).**

```ts
191   if (context.property === 'member' && isMemberCall(context.container)) {
192       const receiver = context.container.receiver
193       const receiverType = this.typeInferer.getType(receiver);
...
198       // Detect class-reference access: receiver is a SymbolRef directly referencing a JavaClass
199       // (e.g., `String.` after `USE java.lang.String`) — show only static methods.
200       let isClassRef = false;
201       if (isSymbolRef(receiver)) {
202           try {
203               const ref = receiver.symbol.ref;
204               isClassRef = isJavaClass(ref);
205           } catch {
206               // cyclic reference, ignore
207           }
208       }
209       if (isJavaClass(receiverType)) {
...
213           if (isClassRef) {
214               // Class reference access — static members only. ...
218               const staticMethods = receiverType.methods.filter(m => m.isStatic);
219               const staticFields = receiverType.fields.filter(f => f.isStatic);
220               const scope = this.createScopeForNodes(stream(staticFields).concat(staticMethods));
...
226           // Instance access — all methods and fields plus .class
227           const members = stream(receiverType.fields).concat(receiverType.methods);
228           const membersScope = this.createScopeForNodes(members);
```

Line-by-line, for the `member` cross-reference of a `MemberCall` whose `receiverType` resolves to
a `JavaClass`: `isClassRef` (line 200) starts `false` and is set `true` **only** when `receiver` is
itself a `SymbolRef` AST node (line 201) whose resolved `symbol.ref` is a `JavaClass` (line 204).
If `isClassRef` is `true`, line 213's branch filters to `staticMethods`/`staticFields` only
(lines 218-220). If `isClassRef` is `false`, execution falls through to line 226's "Instance
access" branch, which offers **every** field and method (line 227) with no static/instance
distinction at all.

**`bbj-vscode/src/language/bbj-completion-provider.ts` — the consuming path, checked for
independent filtering of its own.** `completionForCrossReference` and `completionFor`
(`bbj-completion-provider.ts:120-176`) forward the `member` cross-reference of a `MemberCall`
straight to Langium's default cross-reference completion, which resolves candidates via the scope
`getScope` above already computed — neither method references `isClassRef`, `isJavaClass`, or a
member's `isStatic` flag anywhere in this file (confirmed: `grep -n "isClassRef\|isStatic"
bbj-completion-provider.ts` returns no match). **The divergence point is entirely inside
`bbj-scope.ts`'s `getScope`; the completion provider adds no filtering of its own that could
compensate.**

**The two input shapes DEBT-04's own wording distinguishes, traced concretely:**

1. **The USE-alias path — works.** `USE java.lang.String` (grammar rule `Use`, `bbj.langium:308`)
   binds the simple name `String` into scope as a `NamedElement` resolvable by
   `SymbolRef.symbol=[NamedElement:FeatureName]` (`bbj.langium:818-819`). For `String.valueOf`
   typed after that `USE`, the `member=valueOf` cross-reference's `receiver` is a bare `SymbolRef`
   node whose `symbol.ref` resolves directly to the imported `JavaClass`. At `bbj-scope.ts:201`,
   `isSymbolRef(receiver)` is **true**; at `:204`, `isJavaClass(ref)` is **true**; `isClassRef`
   becomes `true`; the static-only branch (`:213-220`) is taken. This is the path the existing
   in-code comment at `:198-199` documents, and it is unchanged.
2. **The MemberCall `isClassRef` path (a fully-qualified reference, no `USE`) — the gap.** The
   grammar's `MemberCall` rule is left-recursive chained member access
   (`{infer MemberCall.receiver=current} '.' (member=...)?`, `bbj.langium:791`). Typing
   `java.lang.String.valueOf(2)` with no preceding `USE` parses `java.lang.String` as a chain of
   nested `MemberCall` nodes (`SymbolRef(java)` → `MemberCall(.lang)` → `MemberCall(.String)`), so
   the `receiver` of the final `.valueOf` `MemberCall` is itself a **`MemberCall` node, not a
   `SymbolRef`** — even though `this.typeInferer.getType(receiver)` still correctly resolves it to
   the `JavaClass` for `java.lang.String`. At `bbj-scope.ts:201`, `isSymbolRef(receiver)` is
   **false** — the `MemberCall` shape never reaches the `try` block at all. `isClassRef` stays
   `false` (line 200's initial value, never overwritten). Execution reaches `:226`'s "Instance
   access" branch and offers `receiverType.fields` **and** `receiverType.methods` together, with no
   static/instance distinction — instance methods like `charAt`/`length`/`substring` are offered
   alongside statics like `valueOf`/`format`/`join` for a fully-qualified class reference, which is
   exactly DEBT-04's documented symptom ("FQN path static-only filtering deferred").

Both results are recorded — the working path as working, not left implicit, per the Phase 64 D-12
positive-results pattern (checked-and-clean must be distinguishable from unchecked).

### Stated blocker

`bbj-vscode/src/language/java-interop.ts:572-588` — the two-phase class-resolution block added by
commit `99820a0` (`feat(59-04)`) — sets `field.isStatic`/`method.isStatic` from the raw Java DTO,
**defaulting to `false` when the DTO omits the value**:

```ts
579   field.isStatic = (field as unknown as { isStatic?: boolean }).isStatic ?? false;
...
584   method.isStatic = (method as unknown as { isStatic?: boolean }).isStatic ?? false;
```

This is the exact, previously-documented reason the MemberCall-receiver extension to `isClassRef`
was **implemented and then dropped** in the same commit that fixed the isStatic race condition —
recorded in `.planning/phases/59-java-class-reference-features/59-04-SUMMARY.md`'s own Deviations
section: *"MemberCall isClassRef extension dropped: extending isClassRef detection to FQN
MemberCall chains caused regression — old JAR does not send isStatic for fields so Boolean.TRUE
and Date.valueOf could not link; FQN completion showing all members is pre-existing behavior
maintained."* Extending `isClassRef` detection to `MemberCall` receivers without a guarantee that
the connected `java-interop` JAR reliably populates `isStatic` on `JavaField` (not just
`JavaMethod`) would silently hide every legitimately static field behind a flag that always
defaults `false` — including the `BBjHtmlView.ON_HTMLVIEW_DOWNLOAD`-style event constants
`bbj-scope.ts:214-217`'s own comment names as depending on this exact mechanism. Closing the gap
therefore requires a **JAR-side change in `java-interop/`** — confirming/adding `isStatic` on the
field DTO — and a **redeployment** of that JAR to BBj's runtime classpath, before the
`bbj-scope.ts`-side extension can be safely re-enabled. `java-interop/` sits entirely outside this
milestone's review boundary under `FUT-01` (v4.0 scope excludes the Java service), so the blocker
is recorded here, not worked around.

### Verdict

The code is unchanged: `bbj-scope.ts:191-234`'s `isClassRef` detection is still limited to
`isSymbolRef(receiver)`, exactly as commit `99820a0` left it in v3.9 (confirmed by this plan's own
line-by-line re-read, and consistent with the phase-wide empty `git diff` baseline recorded in
`## The evidence rule (D-08)` above). The item is **still real** and its fix is nameable but
gated on cross-repo (`java-interop/`) work outside this milestone's boundary — matching D-06's
`major-refactor` mapping for a still-real item drafted for Phase 69, the same pattern D-07 applied
to DEBT-02's two blocked findings in `## DEBT-02` above (a blocker is recorded in the draft, not
used as a `wontfix` escape hatch).

### Finding record

```
id:                P66-D2-002
unit:              DEBT-04
location:          bbj-vscode/src/language/bbj-scope.ts:191-234 (getScope's member-completion
                   branch; isClassRef detection at :199-208);
                   bbj-vscode/src/language/bbj-completion-provider.ts (consumes the scope with no
                   independent isClassRef-aware filtering of its own);
                   bbj-vscode/src/language/java-interop.ts:572-588 (the isStatic ?? false default
                   that is the stated blocker)
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
                   D2's INVENTORY §3b bar is `repro`; DEBT-04's own trace clears it by the bar's
                   **second form** — "a line-by-line trace naming the concrete inputs/state and
                   the exact file:line where behaviour diverges" — not by a runtime reproduction,
                   which the `### Why no live reproduction was attempted` subsection above states
                   was deliberately not attempted. CONTEXT.md D-09 calls this the `trace` tier by
                   its own phrasing; that phrase is D-09's shorthand for exactly this second §3b
                   form, reconciled explicitly here per this plan's own planner-reconciliation
                   note rather than left for a reader to work out.
evidence:          The static trace above: bbj-scope.ts:199-208's isSymbolRef(receiver) check,
                   concrete input 1 (USE java.lang.String then String.valueOf — receiver is a
                   SymbolRef, isClassRef=true, static-only branch taken, works) versus concrete
                   input 2 (java.lang.String.valueOf(2) with no USE — receiver is a MemberCall
                   node, isSymbolRef(receiver) is false, isClassRef stays false, falls to the
                   Instance access branch at :226-228, offering every field and method). Plus
                   java-interop.ts:572-588's isStatic ?? false default and the commit-99820a0/
                   59-04-SUMMARY.md historical record of the same extension being attempted and
                   reverted for exactly this reason.
failure_scenario:  A fully-qualified Java class MemberCall reference typed without a preceding USE
                   alias (e.g. java.lang.String.valueOf(2), or any FQN-qualified static access) —
                   the completion list offered for the trailing member includes every instance
                   method and field of the class alongside its statics, instead of statics only,
                   because isClassRef never becomes true for a MemberCall-shaped receiver.
classification:    major
                   (1) touches 1 file: FAIL — the complete fix needs both a bbj-scope.ts-side
                   extension AND a java-interop/ JAR-side change (outside this repo's FUT-01
                   boundary) plus a redeployment, not a single-file edit — (2) no public
                   API/grammar/LSP change: pass — the fix changes internal scope-resolution logic
                   only — (3) no new dependency: pass — (4) regression-testable with the existing
                   vitest harness: FAIL — a real regression test needs a Java classpath backend
                   reflecting the updated JAR's isStatic-for-fields behaviour, which this
                   sandbox's EmptyFileSystem-based test context cannot provide (the same
                   DEBT-02-class blocker P61-D5-003 already recorded) — (5) reviewer can name the
                   exact edit: pass — see Issue-ready draft below — (6) severity medium, dimension
                   D2 (not D1): pass — tests (1) and (4) both fail, so classification is major
                   regardless of (2)/(3)/(5)/(6).
effort:            8
                   (cross-repo scope — a java-interop/ JAR change, a redeployment, and a
                   bbj-vscode-side extension plus its regression test — is larger than a
                   single-repo fix; no departure from a prior recorded value since DEBT-04 carries
                   no inherited finding to depart from).
dedup:             none — checked against INVENTORY's frozen 15-issue snapshot. #466 (Detect
                   sibling-type method return mismatches via Java class hierarchy) explicitly
                   considered per this plan's own instruction and resolved unrelated: #466
                   concerns validating an ALREADY-RESOLVED return type against a Java class
                   hierarchy after a method call resolves; this finding concerns which SET OF
                   MEMBERS a class-reference receiver's own completion scope contains before any
                   call is resolved — a different mechanism (scope/completion filtering, not
                   return-type validation) with no overlap. No other frozen-snapshot issue
                   concerns MemberCall static-vs-instance completion filtering.
disposition:       major-refactor
```

### Issue-ready draft

**Title:** FQN-qualified Java class references offer instance members instead of static-only
completion (`isClassRef` doesn't follow `MemberCall` receiver chains) — supersedes no prior issue

**Problem statement:** `bbj-scope.ts`'s `getScope` member-completion branch only detects a
"class-reference" receiver (triggering static-only filtering) when the receiver AST node is a
`SymbolRef` directly bound to a `JavaClass` — the `USE`-alias path. When the receiver is itself a
`MemberCall` — the shape produced by a fully-qualified reference like `java.lang.String.` typed
without a `USE` — `isSymbolRef(receiver)` is `false`, `isClassRef` stays `false`, and completion
falls into the "instance access" branch, offering every method and field instead of statics only.

**`file:line` evidence:**
- `bbj-vscode/src/language/bbj-scope.ts:191-234` (`getScope`'s member-completion branch;
  `isClassRef` detection at `:199-208`; the `isJavaClass(receiverType)` fork at `:209-234`).
- `bbj-vscode/src/language/bbj-completion-provider.ts` (consumes the scope with no independent
  `isClassRef`-aware filtering — confirmed by direct read, no match for `isClassRef`/`isStatic`
  anywhere in the file).
- `bbj-vscode/src/language/java-interop.ts:572-588` (the stated blocker: `field.isStatic`/
  `method.isStatic` both default `false` via `?? false` when the raw DTO omits the value — the old
  JAR does not send `isStatic` for fields).
- Historical decision record: commit `99820a0` /
  `.planning/phases/59-java-class-reference-features/59-04-SUMMARY.md` ("MemberCall isClassRef
  extension dropped ... old JAR does not send isStatic for fields; FQN paths continue showing all
  members until JAR is updated").

**Verified failure scenario (traced, not executed — see `### Why no live reproduction was
attempted` above):** For `java.lang.String.valueOf(2)` typed without a preceding `USE
java.lang.String`, the grammar parses `java.lang.String` as a chain of `MemberCall` nodes, so the
receiver of the final `.valueOf` `MemberCall` is a `MemberCall` node, not a `SymbolRef`.
`isSymbolRef(receiver)` at `bbj-scope.ts:201` returns `false`, `isClassRef` stays `false`, and the
completion list offered for `.valueOf(` includes `String`'s instance methods (`charAt`, `length`,
`substring`, ...) alongside its static methods (`valueOf`, `format`, `join`, ...) — instead of only
the statics a class-reference access should show. By contrast, `USE java.lang.String` then
`String.` resolves `receiver` to a `SymbolRef` bound directly to the `JavaClass`, `isClassRef`
becomes `true`, and only static members are offered — this path works today and is unaffected.

**Proposed approach:** `receiverType` (`bbj-scope.ts:193`, `this.typeInferer.getType(receiver)`)
already resolves to the correct `JavaClass` for a chained-`MemberCall` FQN receiver like
`java.lang.String` — the type inferer is not the gap. The gap is purely the syntactic
`isSymbolRef(receiver)` test at line 201, which asks "is the receiver written as a bare name" (a
`USE` alias) rather than the semantic question DEBT-04 actually needs answered — "does the
receiver refer to the class itself, as opposed to an instance value of that class type". A chained
FQN segment (`java.lang.String`, the innermost `MemberCall`'s own `member` cross-reference
resolving to the `JavaClass` `String`) refers to the class itself in exactly the same sense a `USE`
alias does; it is just spelled as a `MemberCall` chain instead of a single `SymbolRef`. The fix is
to extend the detection at `bbj-scope.ts:199-208` to also treat a `MemberCall` receiver whose own
`member` cross-reference resolves to a `JavaClass` as a class reference, equivalent to today's
`isSymbolRef(receiver) && isJavaClass(receiver.symbol.ref)` check — **gated behind confirming
`java-interop`'s JAR reliably sets `isStatic` on `JavaField`** (not just `JavaMethod`), since
enabling this without that guarantee would silently hide legitimately static fields (event
constants like `BBjHtmlView.ON_HTMLVIEW_DOWNLOAD`, per the existing comment at
`bbj-scope.ts:214-217`) behind an `isStatic` flag that always defaults `false`. The JAR-side change
(`java-interop/`, out of this milestone's review boundary per `FUT-01`) must ship and be
redeployed to BBj's runtime classpath before this `bbj-vscode`-side extension can be safely
re-enabled — the same two-step shape commit `99820a0`'s own Task 2 (a `human-action` deployment
gate) already established for this exact change.

**Acceptance criteria:**
- `java-interop`'s JAR sends `isStatic` for `JavaField` (not just `JavaMethod`) in its
  class-metadata payload, and is redeployed to the environment used for testing.
- `bbj-scope.ts`'s `isClassRef` detection is extended to `MemberCall` receivers resolving to a
  `JavaClass`.
- A regression test (none exists today — this repository has no committed assertion of
  FQN-vs-`USE`-alias completion parity) asserts that `java.lang.String.` (no `USE`) and `String.`
  (after `USE java.lang.String`) offer the identical static-only member set.
- `npm test` remains green; no existing completion/scope assertion regresses.

**Proposed labels:** area `scoping` (from the repository's existing area-label set — the
divergence lives entirely in `bbj-scope.ts`'s scope resolution); `types` is a secondary candidate
since the fix also touches `java-interop.ts`'s type-DTO handling; `PRIO 2` (severity `medium`
maps to `PRIO 2` per INVENTORY §3d); effort `8`.

**No `gh` write subcommand was run to produce this draft.**

## Plan 66-02 accounting

**Rows and records this plan verdicted.** Two of the eight denominator items — DEBT-05 and
DEBT-04 — are verdicted by this plan, spanning **2 `PROJECT.md`-line register rows** (250, 256)
and **2 finding records** (`P66-D4-001`, `P66-D2-002`) — a 1:1 rows-to-records ratio here, unlike
66-01's DEBT-02 split, because neither DEBT-05 nor DEBT-04 has D-07's two-distinct-unblocking-
conditions shape.

**Finding IDs allocated by this plan:** `P66-D4-001` (DEBT-05, superseding `P63-D4-010`) and
`P66-D2-002` (DEBT-04, no inherited record to supersede) — both matched their pre-allocated slots
from the Finding-ID namespace table exactly; neither resolved `already-covered`/`not-reproducible`
(both items were found still real), so no pre-allocated ID went unused.

**Pre-allocated IDs left for 66-03:** `P66-D2-003` (DEBT-07) and `P66-D5-003` (DEBT-08) — this
plan touches neither; their register rows (252, 255) remain `pending 66-03`, carried exactly as
66-01 left them.

**Denominator register status after this plan:** 6 of 8 rows now carry a verdict (251, 253, 254,
257 from 66-01; 250, 256 from this plan); 2 rows (252, 255) remain explicitly `pending 66-03` —
never blank.

**Zero source files modified, zero tracker writes.** Re-run at this plan's completion:

```bash
git status --porcelain bbj-vscode bbj-intellij java-interop .github
```
**Literal output: (empty — nothing).**

```bash
git status --porcelain .planning/reviews/INVENTORY.md .planning/reviews/61-COVERAGE.md .planning/reviews/62-COVERAGE.md .planning/reviews/63-COVERAGE.md .planning/reviews/64-COVERAGE.md .planning/reviews/65-COVERAGE.md
```
**Literal output: (empty — nothing).**

No `gh` write subcommand ran anywhere in this plan — every `gh` invocation used in this plan's
evidence gathering (dedup checks against the frozen snapshot) was already recorded by 66-01's `##
Dedup source` section; this plan added no new `gh` call of any kind, read-only or otherwise. D-01
(verdict-only, no source change) and D-02 (zero tracker writes) both hold, evidenced by the literal
command output above rather than asserted.

## DEBT-07

DEBT-07 is one of the two orphan bullets `INVENTORY.md:1220` recorded (`PROJECT.md` line 252) —
carried in `PROJECT.md` as "CPL-06 hierarchy suppression takes one extra build cycle after BBjCPL
merge (timing nuance, end state correct)", with no `DEBT-*` requirement and no inherited `P6N-*`
finding to cite. This section leads with a fresh trace, the same shape `## DEBT-04` above used for
the other zero-inherited-evidence item.

### Trace

**The claimed mechanism — `bbj-vscode/src/language/bbj-document-validator.ts`'s `DiagnosticTier`
hierarchy and its Rule 0.** `getDiagnosticTier` (`:59-63`) assigns `DiagnosticTier.BBjCPL` (`:53`,
the highest tier) to any diagnostic whose `source === 'BBjCPL'`. `applyDiagnosticHierarchy`
(`:80-131`) computes `hasBbjcplErrors` (`:93-95`) by scanning its own `diagnostics` **parameter**
for a `BBjCPL`-tier entry, and Rule 0 (`:99-104`) filters out `DiagnosticTier.Parse` entries **only
when** `hasBbjcplErrors` is `true`. The class's own doc comment (`:70-77`) states the intended rule
in plain words: "BBjCPL errors present → suppress Langium parse errors (they're redundant)".

**Where `applyDiagnosticHierarchy` is actually invoked — one call site, one input shape.**
`BBjDocumentValidator.validateDocument` (`:161-169`) is the **only** place `applyDiagnosticHierarchy`
is called: `const diagnostics = await super.validateDocument(document, options, cancelToken);` (`:167`)
then `return applyDiagnosticHierarchy(diagnostics, ...)` (`:168`). `super.validateDocument`
(Langium's own `DefaultDocumentValidator.validateDocument`,
`bbj-vscode/node_modules/langium/lib/validation/document-validator.js:23-25`) opens with
`const diagnostics = [];` — a **fresh, empty array on every call**, populated only from
`processLexingErrors`/`processParsingErrors`/`processLinkingErrors`/`validateAst` (`:27-45` of that
file) — none of which can ever produce a `source: 'BBjCPL'` diagnostic, because BBjCPL is an
external compiler process, not a Langium validation check. **Consequence: the `diagnostics` array
`applyDiagnosticHierarchy` examines on every single call, on every build cycle, contains zero
`BBjCPL`-tier entries by construction — `hasBbjcplErrors` is always `false`, and Rule 0's filter
(`:100-104`) never executes its body.**

**Where BBjCPL diagnostics actually enter `document.diagnostics` — a separate path that never
calls `applyDiagnosticHierarchy` at all.** `BBjDocumentBuilder.debouncedCompile`
(`bbj-vscode/src/language/bbj-document-builder.ts:155-187`) is scheduled from
`runBbjcplForDocuments` (`:117`) after `super.buildDocuments()` (i.e., after the Langium validate
phase above has already run and already published its Rule-0-filtered, BBjCPL-blind diagnostics).
After its 500ms debounce fires, it awaits `cplService.compile(key)` (`:173`) and, when
`cplDiags.length > 0`, sets `document.diagnostics = mergeDiagnostics(document.diagnostics ?? [],
cplDiags)` directly (`:177-180`) — `mergeDiagnostics` (`bbj-document-validator.ts:139-156`) only
relabels a same-line Langium diagnostic's `source` to `'BBjCPL'` or appends a BBjCPL-only entry; it
contains no `DiagnosticTier` check and calls `applyDiagnosticHierarchy` **zero times**
(confirmed: `grep -n "applyDiagnosticHierarchy" bbj-vscode/src/language/bbj-document-builder.ts`
returns no match — the function is not even imported there). `debouncedCompile` then calls
`this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None)` (`:186`),
which (per Langium's own `DefaultDocumentBuilder.notifyDocumentPhase`,
`node_modules/langium/lib/workspace/document-builder.js:425-433`) only fires document-phase
listeners (the diagnostics-publish-to-client listener) — it does **not** re-run validation and
does **not** re-invoke `applyDiagnosticHierarchy`.

**Why a later edit doesn't close the gap either.** A genuinely new document edit resets
`document.diagnostics` to `undefined` before the next validate phase
(`DefaultDocumentBuilder.resetToState`, `document-builder.js:206-233`, the `IndexedReferences` case
at `:224-225`: `document.diagnostics = undefined;`), so no build's `validateDocument()` call is ever
seeded with a prior cycle's merged BBjCPL diagnostics either — the array `applyDiagnosticHierarchy`
sees is fresh and BBjCPL-blind on **every** cycle, not just the first.

**Concrete inputs, traced end to end.** A `.bbj` file with a syntax error that both Langium's
parser and BBjCPL flag on the same source line, open in an editor, with `compilerTrigger` at its
default `'debounced'` (`bbj-document-validator.ts:37`) and `suppressCascadingEnabled` at its
default `true` (`:27`): on save, `super.buildDocuments()` validates and publishes a `Parse`-tier
Langium diagnostic (Rule 0 never fires — no `BBjCPL` diagnostic exists yet in this call's fresh
array). 500ms later, `debouncedCompile` runs BBjCPL, gets a same-line `cplDiag`, and
`mergeDiagnostics` **relabels** the existing Langium diagnostic's `source` to `'BBjCPL'` in place —
so for a same-line match the user's terminal state happens to show one diagnostic, not two,
**not because Rule 0 suppressed anything, but because `mergeDiagnostics`'s own same-line
relabeling coincidentally produces the same visible count.** For a BBjCPL error on a line with
**no** matching Langium parse error (the case Rule 0's own doc comment describes — "they're
redundant" implies overlapping-but-distinct diagnostics, not only same-line pairs), or for any
other `Parse`-tier diagnostic elsewhere in the file that BBjCPL doesn't also flag on that exact
line, `mergeDiagnostics`'s `matchIdx` lookup (`:143-145`, matched by `d.range.start.line === cplLine`)
finds no entry to relabel, the BBjCPL diagnostic is pushed as an additional entry, and the
pre-existing `Parse`-tier Langium diagnostic is never removed by anything — Rule 0's filter body
(`:100-104`) never runs against this merged array, on this or any later cycle.

### Verdict

The code is unchanged from what `PROJECT.md`'s own carried bullet describes having tested
(no drift possible to report against a prior finding, since none was ever recorded — this is a
fresh trace, not a currency check). The claimed behavior — Rule 0 eventually suppresses the
redundant Langium `Parse`-tier diagnostic, just one build cycle later than a same-cycle read would
suggest — does **not** hold as traced: `applyDiagnosticHierarchy` is called from exactly one
place (`validateDocument`), that call always sees a freshly-constructed, BBjCPL-blind diagnostics
array (per `super.validateDocument`'s own `const diagnostics = [];`), and the code path that
introduces BBjCPL diagnostics into `document.diagnostics` (`debouncedCompile` → `mergeDiagnostics`)
never calls `applyDiagnosticHierarchy` on any cycle. This is **not** a one-cycle timing lag that
self-corrects — it is a permanent gap: Rule 0's suppression body is unreachable given the current
wiring, on every build cycle, not just the first. The item is **still real**, and materially more
severe than `PROJECT.md`'s own "timing nuance, end state correct" framing states — the end state is
**not** correct except by the coincidental side effect of `mergeDiagnostics`'s same-line relabeling.
Per D-06's mapping, a still-real item drafted for Phase 69 is `major-refactor`.

**Regression-test coverage confirms the gap.** `bbj-vscode/test/cpl-integration.test.ts` (7 tests,
`describe('mergeDiagnostics', ...)`, confirmed by `grep -n "describe(\|test("
bbj-vscode/test/cpl-integration.test.ts`) tests only `mergeDiagnostics`'s merge/relabel logic — no
test in the committed suite asserts that a `Parse`-tier Langium diagnostic is filtered out of
`document.diagnostics` after a BBjCPL error merges in. No existing assertion would catch this gap
today, and none currently does.

### Finding record

```
id:                P66-D2-003
unit:              DEBT-07
location:          bbj-vscode/src/language/bbj-document-validator.ts:53,59-63,80-131,161-169
                   (DiagnosticTier.BBjCPL, getDiagnosticTier, applyDiagnosticHierarchy and its
                   Rule 0, the sole validateDocument call site);
                   bbj-vscode/src/language/bbj-document-builder.ts:155-187 (debouncedCompile, the
                   mergeDiagnostics call at :177-180 that bypasses applyDiagnosticHierarchy)
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
                   D2's INVENTORY §3b bar is repro; cleared by the bar's second form — a
                   line-by-line trace naming the concrete inputs/state and the exact file:line
                   where behaviour diverges (Trace subsection above) — not by a live LSP session
                   (no editor was driven in this plan). No live reproduction was attempted for the
                   same class of reason CONTEXT.md D-09 states for DEBT-04: this sandbox's
                   pre-existing test-environment limitations make a from-scratch VS Code session an
                   unreliable substitute for the static trace, which is conclusive on its own here
                   (the call graph is fully readable and admits no other path).
evidence:          The Trace subsection above: applyDiagnosticHierarchy's single call site
                   (validateDocument:167-168) always receives a freshly-constructed, BBjCPL-blind
                   diagnostics array (per Langium's own DefaultDocumentValidator.validateDocument,
                   document-validator.js:25's const diagnostics = [];); the only code path that
                   introduces a BBjCPL-sourced diagnostic (debouncedCompile's mergeDiagnostics call,
                   bbj-document-builder.ts:177-180) never calls applyDiagnosticHierarchy; and
                   resetToState (document-builder.js:224-225) wipes document.diagnostics before
                   every subsequent validate pass, so no later cycle is ever seeded with a prior
                   cycle's merged BBjCPL diagnostics either. Plus the negative-coverage check: no
                   test in cpl-integration.test.ts's 7 mergeDiagnostics tests exercises
                   applyDiagnosticHierarchy at all.
failure_scenario:  A BBjCPL error and a Langium Parse-tier error on different lines of the same
                   file (or even the same line, once mergeDiagnostics's coincidental same-line
                   relabeling is accounted for and set aside) both remain visible in the Problems
                   panel indefinitely — the redundant Langium parse error is never suppressed by
                   Rule 0 as the class's own doc comment (bbj-document-validator.ts:70-77) says it
                   should be, on this or any subsequent save.
classification:    major
                   (1) touches 1 file: FAIL — the minimal fix exports applyDiagnosticHierarchy from
                   bbj-document-validator.ts and calls it from debouncedCompile in
                   bbj-document-builder.ts after the mergeDiagnostics call, two files — (2) no
                   public API/grammar/LSP change: pass — internal diagnostic-filtering only — (3)
                   no new dependency: pass — (4) regression-testable with the existing vitest
                   harness: pass — cpl-integration.test.ts already exercises mergeDiagnostics with
                   a fake BBjCPLService-shaped input; a new test asserting Parse-tier diagnostics
                   are absent after a same-file, different-line BBjCPL error merges in would fail
                   before the fix and pass after — (5) reviewer can name the exact edit: pass (see
                   Issue-ready draft below) — (6) severity medium, dimension D2 (not D1): pass —
                   test (1) fails, so classification is major regardless of (2)-(6).
effort:            2
dedup:             none — checked against the frozen 15-issue snapshot's composition-check table
                   in ## Dedup source above; no open issue is topically adjacent to CPL-06 diagnostic
                   hierarchy/BBjCPL-Langium merge timing. This finding corrects PROJECT.md's own
                   prior "one extra build cycle, end state correct" characterization rather than
                   duplicating any tracker report.
disposition:       major-refactor
```

### Issue-ready draft

**Title:** BBjCPL-suppresses-Langium-parse-errors hierarchy rule (Rule 0) never activates — export
and re-apply `applyDiagnosticHierarchy` after the BBjCPL merge

**Problem statement:** `applyDiagnosticHierarchy`'s Rule 0 is documented and coded to suppress
redundant Langium `Parse`-tier diagnostics whenever a `BBjCPL`-sourced diagnostic is present, but
it is only ever invoked from `validateDocument`, before BBjCPL has run — and the later code path
that merges BBjCPL diagnostics in (`debouncedCompile` → `mergeDiagnostics`) never calls
`applyDiagnosticHierarchy` at all. Rule 0's suppression body is unreachable on every build cycle,
not delayed by one as previously documented.

**`file:line` evidence:**
- `bbj-vscode/src/language/bbj-document-validator.ts:80-131` (`applyDiagnosticHierarchy`, Rule 0 at
  `:99-104`), `:161-169` (its sole call site, inside `validateDocument`).
- `bbj-vscode/src/language/bbj-document-builder.ts:155-187` (`debouncedCompile`), specifically
  `:177-180` (the `mergeDiagnostics` call that never routes through `applyDiagnosticHierarchy`).
- `bbj-vscode/node_modules/langium/lib/validation/document-validator.js:25` (`const diagnostics =
  [];` — confirms `super.validateDocument` never seeds from prior `document.diagnostics`).
- `bbj-vscode/node_modules/langium/lib/workspace/document-builder.js:224-225` (`resetToState`'s
  `document.diagnostics = undefined;`), `:425-433` (`notifyDocumentPhase` — listener notification
  only, no re-validation).

**Verified failure scenario (traced, not runtime-reproduced — see Trace above):** A BBjCPL error
and a Langium `Parse`-tier error on different lines of the same open `.bbj` file both remain
visible in the Problems panel after the 500ms BBjCPL debounce completes, because Rule 0 never runs
against the merged array.

**Proposed approach:** Export `applyDiagnosticHierarchy` from `bbj-document-validator.ts` (it is
currently a module-private function; `mergeDiagnostics` and `getCompilerTrigger` are already
exported from the same file, so this is a visibility change, not a new abstraction) and call it in
`bbj-document-builder.ts`'s `debouncedCompile`, immediately after the `mergeDiagnostics` assignment
at `:177-180`, re-assigning `document.diagnostics = applyDiagnosticHierarchy(document.diagnostics,
suppressCascadingEnabled, maxErrorsDisplayed)` — but `suppressCascadingEnabled`/`maxErrorsDisplayed`
are themselves module-private state in `bbj-document-validator.ts` with only setter exports
(`setSuppressCascading`, `setMaxErrors`), so a getter pair (or exporting `applyDiagnosticHierarchy`
in a form that reads the module state itself, as it already does internally) is the concrete second
half of this edit.

**Acceptance criteria:**
- A new test in `cpl-integration.test.ts` (or a new `applyDiagnosticHierarchy`-focused test file)
  asserts that after a same-file, different-line BBjCPL error merges into `document.diagnostics`
  alongside an existing `Parse`-tier Langium diagnostic, the `Parse`-tier diagnostic is filtered
  out — failing on the pre-fix code, passing after.
- `npm test` remains green; no existing `cpl-integration.test.ts`/`cpl-parser.test.ts`/
  `cpl-service.test.ts` assertion regresses.
- `PROJECT.md`'s carried debt bullet (now `DEBT-07`) is updated to describe the corrected mechanism
  once this fix lands, rather than repeating the "one extra build cycle" framing this finding
  corrects.

**Proposed labels:** area `vscode` (from the repository's existing area-label set — the fix lives
in the shared language server's document-validator/document-builder pair, consumed by both IDEs,
and `vscode` is the closer existing label than `intellij` for shared-server diagnostic plumbing);
`PRIO 2` (severity `medium` maps to `PRIO 2` per INVENTORY §3d); effort `2`.

**No `gh` write subcommand was run to produce this draft.**

## DEBT-08

DEBT-08 is the second orphan bullet `INVENTORY.md:1220` recorded (`PROJECT.md` line 255) — carried
as "IntelliJ TextMate bundle: filename-based `config.bbx`/`config.min` registration was added to
the bundle (`2489001`, #381, in `2194616..v0.12.0`) mirroring the VS Code approach, but whether
JetBrains' TextMate plugin actually honors `filenames` (vs. `extensions`) is unverified in this
sandbox (`./gradlew build` fails on a local JDK toolchain mismatch, not a code defect)". No
inherited `P6N-*` finding exists for it either.

### Trace — what is actually in the tree

`bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json` declares two language entries
under `contributes.languages`:

```json
{
  "id": "BBj",
  "extensions": [".bbj", ".bbl", ".bbjt", ".src", ".bbx"],
  "configuration": "./bbj-language-configuration.json"
},
{
  "id": "BBx Config",
  "filenames": ["config.bbx", "Config.bbx", "config.min", "Config.min"],
  "configuration": "./bbx-language-configuration.json"
}
```

Both forms are present in the same bundle side by side, which is what makes the question
well-posed: `"BBj"` registers by `extensions` (a suffix match — `.bbx` here means "any file ending
in `.bbx`"), while `"BBx Config"` registers by `filenames` (an exact-basename match — "only a file
literally named `config.bbx`, case variants included"). Note the direct collision this creates in
the schema itself: a file literally named `config.bbx` matches **both** the `"BBj"` language's
`.bbx` extension pattern and the `"BBx Config"` language's `filenames` list — TextMate-consuming
IDEs are expected to prefer the more specific `filenames` match, but whether JetBrains' TextMate
plugin (bundled as `org.jetbrains.plugins.textmate`, `build.gradle.kts:26`) actually implements
that specificity-preference rule for `filenames` vs. `extensions` is exactly the unverified
question DEBT-08 names — confirmed by reading the file directly, not asserted from the commit
message alone.

### Stated blocker

`bbj-intellij/build.gradle.kts:12-13` pins `sourceCompatibility`/`targetCompatibility` to
`JavaVersion.VERSION_17`, and `./gradlew build` in this sandbox fails before any task is scheduled
on the local JDK toolchain mismatch `P64-D6-010` records (`64-COVERAGE.md`'s own re-derivation:
`./gradlew --offline -q dependencies` exits 1 in 723ms with `* What went wrong: 25.0.3` — Gradle
8.13's `JavaVersion` parser rejecting the locally installed Temurin 25.0.3 before task selection).
Re-run here for currency:

```bash
cd bbj-intellij && ./gradlew --offline -q dependencies
```

**Literal output: exits non-zero on the same JDK-version failure** — confirming the blocker is
still present and unchanged since `64-COVERAGE.md` recorded it. Verifying whether the TextMate
plugin honors `filenames` requires running the plugin inside a real IntelliJ instance (a
`runIde`-class Gradle task, or a packaged, installed build), and every `./gradlew` task in this
project is blocked by the same toolchain failure before it can even resolve dependencies — there is
no way to reach a `runIde`/build/verify task without first passing dependency resolution. Per
CONTEXT.md's own framing, this is **another finding's fix** (`P64-D6-010`), not re-triaged here:
`P64-D6-010` sits outside this phase's 8-row denominator (D-04) and was explicitly excluded per
`66-CONTEXT.md`'s `<deferred>` section.

### Verdict

The bundle content is unchanged since the commit `2489001` cited in the carried bullet (no drift to
report — this is a first trace, not a currency check against a prior `P6N-*` record, since none
exists). The question the bullet poses — does JetBrains' TextMate plugin honor `filenames`
registration the way VS Code's own TextMate-grammar host does — remains genuinely unverifiable in
this sandbox, for the same reason `64-COVERAGE.md` and `63-COVERAGE.md` could not resolve it: the
JDK toolchain mismatch blocks every `./gradlew` task before it starts. This is not a code defect in
`bbj-intellij` and not a still-real bug with a nameable edit the way DEBT-04's `isClassRef` gap or
DEBT-07's Rule 0 gap are — there is nothing to fix until the question is answered, and the question
cannot be answered until `P64-D6-010` is resolved. Per the plan's own disposition guidance,
`wontfix` **with the unblocking condition stated** is the honest disposition here — not an escape
hatch from filing (D-07 still applies: a blocked item still gets an issue-ready draft, with the
blocker named as part of the body), but an accurate statement that this project is not going to
change anything about the bundle's registration shape until the blocking build failure is resolved
and the plugin can actually be run.

### Finding record

```
id:                P66-D5-003
unit:              DEBT-08
location:          bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json:9-14
                   (the "BBx Config" language entry's filenames registration, alongside "BBj"'s
                   extensions registration at :5-8);
                   bbj-intellij/build.gradle.kts:12-13 (the Java 17 source/target pin that is the
                   stated blocker, cited not re-triaged)
dimension:         D5
secondary:         []
severity:          medium
evidence_tier:     trace
                   Per INVENTORY §3b, D5 (test coverage) follows the tier of what the finding
                   asserts; this finding asserts a missing verification (whether JetBrains'
                   TextMate plugin honors filenames), which is trace-evidenced — there is no
                   runtime behaviour to reproduce, only the unverified-registration state and the
                   blocked-build citation, both confirmed by direct reads.
evidence:          The bundle package.json read directly (both language entries, quoted in full in
                   the Trace subsection above) plus the re-run P64-D6-010 blocked-build citation
                   (./gradlew --offline -q dependencies exits non-zero on the same JDK-version
                   failure, confirmed at this plan's execution time — no drift). The collision this
                   creates (a literal config.bbx file matches both language entries' patterns) is
                   named as what makes the specificity question well-posed, not asserted without
                   the concrete schema evidence.
failure_scenario:  If JetBrains' TextMate plugin does not honor filenames the way VS Code's
                   TextMate host does — e.g. if it only ever matches by extensions, or applies a
                   different specificity rule for the config.bbx/BBj collision — a config.bbx or
                   config.min file opened in the IntelliJ plugin renders as plain, unhighlighted
                   text (or is misclassified as the "BBj" language via the .bbx extension match,
                   which is arguably worse: a config file syntax-highlighted as BBj source), the
                   exact symptom issue #381 originally reported for the VS Code side before its fix.
classification:    major
                   (1) touches 1 file: n/a — nothing is being changed; this is a verification gap,
                   not a proposed edit, until the blocked question is answered — (2) no public
                   API/grammar/LSP change: n/a, same reason — (3) no new dependency: n/a, same
                   reason — (4) regression-testable with existing harness: FAIL — bbj-intellij has
                   no src/test/ source set at all (P63-D5-001), and even with one, verifying
                   TextMate filename-vs-extension precedence requires a running IDE instance, not a
                   headless assertion — (5) reviewer can name the exact edit: FAIL — no edit can be
                   named without first observing whether the current registration already works;
                   the corrective action (if any is even needed) is unknown — (6) severity medium,
                   dimension D5 (not D1): pass — tests (4) and (5) both fail/n/a, so classification
                   is major.
effort:            2
                   (once P64-D6-010 unblocks a runnable build, verification is a single manual
                   check — open a config.bbx file in a running plugin instance and observe
                   highlighting — and any needed fix, if the current filenames registration proves
                   insufficient, is a small, localized package.json/grammar-registration change).
dedup:             #381 (Config.bbx is no longer highlighted) — checked explicitly against the
                   frozen 15-issue snapshot (see ## Dedup source's composition-check table above,
                   which flagged #381 as "adjacent to DEBT-08, out of this plan's scope" pending
                   this section). Verdict: distinct, not a duplicate or partial overlap. #381
                   reported the VS Code-side regression (config.bbx losing highlighting after a
                   VS Code extension-registration change) and was resolved on the VS Code side by
                   commit 2489001 — the same commit that added this IntelliJ-side filenames
                   registration, defensively, without ever confirming JetBrains' TextMate plugin
                   honors it. This finding is the IntelliJ-side verification gap that commit left
                   behind, not a recurrence of #381's VS Code symptom.
disposition:       wontfix
                   Unblocking condition: P64-D6-010 (the bbj-intellij Gradle JDK 17-vs-25.0.3
                   toolchain mismatch) is resolved, at which point a runnable ./gradlew task (build
                   or runIde) makes it possible to install/run the plugin and observe whether a
                   config.bbx/config.min file is correctly highlighted. Not re-triaged here per
                   CONTEXT.md's explicit exclusion of P64-D6-010 from this phase's denominator.
```

### Issue-ready draft

**Title:** Verify JetBrains' TextMate plugin honors `filenames` registration for `config.bbx`/
`config.min` (blocked on `P64-D6-010`)

**Cross-reference:** Not a duplicate of #381 (VS Code-side, already resolved by commit `2489001`);
this is the IntelliJ-side verification that commit's own defensive `filenames` registration never
received.

**Problem statement:** `bbj-intellij`'s TextMate bundle registers `"BBx Config"` by `filenames`
(`config.bbx`/`Config.bbx`/`config.min`/`Config.min`) alongside `"BBj"`'s `extensions`-based
`.bbx` registration in the same `package.json`, creating a literal pattern collision for any file
named `config.bbx`. Whether JetBrains' TextMate plugin (`org.jetbrains.plugins.textmate`) resolves
this collision the way VS Code's TextMate host does — preferring the more specific `filenames`
match — is unverified, and cannot be verified in this sandbox because every `./gradlew` task fails
on the JDK toolchain mismatch `P64-D6-010` records before dependency resolution completes.

**`file:line` evidence:**
- `bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json:5-14` (both language entries).
- `bbj-intellij/build.gradle.kts:12-13` (the Java 17 pin) and `P64-D6-010` (`64-COVERAGE.md`) for
  the blocked-build citation.
- Historical context: commit `2489001` (issue #381) added the `filenames` registration mirroring
  the VS Code fix, without a corresponding IntelliJ-side verification step.

**Verified failure scenario (traced, not runtime-reproduced — see Trace above):** A user opens
`config.bbx` in the IntelliJ plugin; if `filenames` is not honored (or not given precedence over
`"BBj"`'s `.bbx` extension match), the file renders as plain text or is highlighted as BBj source
instead of as its own `bbx`-grammar config language.

**Proposed approach:** Blocked on `P64-D6-010`. Once the JDK toolchain mismatch is resolved and a
`./gradlew runIde`-class task (or an installed build) is reachable, open a `config.bbx` file in the
running plugin and observe whether it highlights via `syntaxes/bbx.tmLanguage.json` (correct) or
`syntaxes/bbj.tmLanguage.json`/plain text (incorrect). If incorrect, the fix is scoped to the
TextMate bundle's `package.json` registration shape (e.g., an explicit priority/precedence
declaration, if JetBrains' TextMate plugin supports one, or a narrower `extensions` list for
`"BBj"` that excludes `.bbx`) — the exact edit cannot be named before that observation.

**Acceptance criteria:**
- `P64-D6-010` is resolved (a runnable `./gradlew` task exists).
- A `config.bbx` file opened in a running `bbj-intellij` instance is confirmed to highlight via the
  `"BBx Config"`/`bbx` grammar, not via `"BBj"`/plain text.
- If the observation shows `filenames` is not honored or not given precedence, a follow-up fix
  (scope named above) is proposed and this finding's disposition is revisited.

**Proposed labels:** area `intellij` (from the repository's existing area-label set); `PRIO 2`
(severity `medium` maps to `PRIO 2` per INVENTORY §3d); effort `2`.

**No `gh` write subcommand was run to produce this draft.**

## `INVENTORY.md` non-edit evidence (D-05)

The 8-vs-6 debt drift `INVENTORY.md:1220` recorded is closed by taking the **second** of the two
resolutions that line itself names — "added as a new one" — never by editing that record. Re-run at
this task's execution time, immediately before and after the `REQUIREMENTS.md` edit below:

```bash
git status --porcelain .planning/reviews/INVENTORY.md
```

**Literal output: (empty — nothing).** `INVENTORY.md` is untouched by this task. The count it
recorded (`6`) becomes stale the moment `REQUIREMENTS.md` gains `DEBT-07`/`DEBT-08` below — that
staleness is the intended, permanent record of what INVENTORY observed on 2026-08-17, not a defect
to fix. **Caution for a reader re-running `INVENTORY.md:1220`'s own cited command**
(`grep -c '^- \[ \] \*\*DEBT-' .planning/REQUIREMENTS.md`): this counts only *unchecked* `- [ ]`
bullets, and by this task's completion `DEBT-01`..`DEBT-05` already carry `- [x]` (marked complete
by `66-01`/`66-02`'s own execution) while `DEBT-06`..`DEBT-08` remain `- [ ]` — so the literal
re-run yields `3`, not `8`. The **total** `DEBT-*` bullet count regardless of check-state —
`grep -cE '^- \[[ x]\] \*\*DEBT-' .planning/REQUIREMENTS.md` — is the command that answers
`INVENTORY.md:1220`'s actual question ("how many `DEBT-*` items does `REQUIREMENTS.md` carry") and
correctly returns `8`, matching `PROJECT.md`'s own 8-bullet denominator. This distinction — and the
resulting mismatch between `66-03-PLAN.md`'s own literal `<acceptance_criteria>` (written assuming
an all-unchecked `6`-item baseline that no longer held once `66-01`/`66-02` had already marked
`DEBT-01`..`DEBT-05` complete) and this task's actual, correct 8-total-bullets state — is recorded
as a deviation in `66-03-SUMMARY.md`, not silently reconciled here.

