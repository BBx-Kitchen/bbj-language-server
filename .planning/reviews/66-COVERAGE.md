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

