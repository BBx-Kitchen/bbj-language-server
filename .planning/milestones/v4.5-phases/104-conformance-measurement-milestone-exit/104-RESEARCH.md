# Phase 104: Conformance Measurement & Milestone Exit - Research

**Researched:** 2026-09-23
**Domain:** Conformance-harness engineering (private `bbj-corpus` repo) + whole-suite release gate (this repo)
**Confidence:** HIGH for the harness/product code paths (all read this session with line citations); MEDIUM for endpoint-mode runtime estimate and cross-connection BBjServices behavior (partially inferred from source, not empirically re-measured at scale this session); LOW/flagged for one item — see the **blocking finding** below, which the planner must resolve with the user before Plan 3 can run.

## Summary

Phase 104 is almost entirely wiring and measurement, not new product behavior: Phase 103 already
proved the mechanism (`reconcileWithVerdict` + `applyDiagnosticHierarchy` against the real endpoint,
scratch-probed at B = 31/1,210, 0 failures). This phase promotes that scratch probe into the
harness's own `--endpoint` flag, runs it over the full corpus (not just the 1,241 the probe
covered), gates the whole `bbj-vscode` and IntelliJ test suites, and writes the exit record.

**The harness's existing shape does almost all the work already.** `run.mjs` spawns N worker
shards (`tsx worker.mts`), each an independent Node process; `worker.mts` opens one Langium
service instance per shard and iterates its job list. Every symbol the endpoint path needs
(`reconcileWithVerdict`, `documentLineText`, `recallLangiumDiagnostics`, `isSyntaxComplaint`,
`applyDiagnosticHierarchy`, `parseErrorsToDiagnostics`, `parseProgram`, `setConnectionConfig`,
`METHOD_NOT_FOUND`, `connectionGeneration`) is a named export today — confirmed by reading each
file this session. No export needs to be added to `bbj-vscode/src` (Claude's Discretion item
satisfied without needing the escape hatch). The one private symbol the probe had to duplicate
(`classifyFailureKind`'s `-3300x` code table in `bbj-parser-service.ts`) is still private; the
harness duplicates it again, exactly as the probe did.

**Concurrency is safe by construction, not by luck.** `bbj-ls`'s `ParserWorker` (the Java-side
class behind `parseProgram`) is **per-connection**: each TCP connection gets its own single-thread
executor, its own `ProgramFactoryIF`, and its own `pending` map keyed by `canonicalName`
(`ParserWorker.java:39-56,156-166`). "Latest-wins" cancellation only fires when two in-flight
requests on the **same connection** share a `canonicalName`. The recommended shape — one shard =
one dedicated connection, each shard's files parsed strictly sequentially (await each response
before sending the next) — cannot trigger cross-shard cancellation at all, and cannot trigger
same-connection cancellation either, because at most one request per connection is ever in flight.
This maps onto the harness's existing shard architecture with no redesign.

**A blocking finding surfaced this session, not anticipated by CONTEXT.md.** The private
`bbj-corpus` repository's `main` branch was rebuilt and committed *during this research session*
(commit `c0099067`, 2026-09-23 17:22 UTC, authored by the project owner under a **different**
GSD project, "BBjlangMCP phase 3 plan 03-09") — adding two new sources (`docs-samples`,
`tree-samples`) and a newer compiler build. The corpus is now 16,884 accepted / 4,615 rejected
(compiler build "September 22 2026", `26.03`), not the 11,898 / 1,210 (compiler build
"September 1 2026", `26.02`) that D-05 explicitly locks as "the corpus build is used as it is
… it is not rebuilt." **D-05's premise is now false.** See the dedicated section below for the
verified evidence and a concrete, non-destructive mitigation (a `git worktree` combining the
harness's current code with the old commit's data files). This must go to the user as a
checkpoint before Plan 3 runs — it is not something research or the planner can resolve alone,
because it touches a locked decision's factual premise.

**Primary recommendation:** Build the `--endpoint` flag as an additive branch inside the existing
`run.mjs`/`worker.mts` shape (new CLI arg → passed to each shard → worker imports the reconciliation
module and the real `JavaInteropService` only when the flag is present); reuse Phase 103's probe
code nearly verbatim for the per-file endpoint call; use one connection per shard, sequential
per-shard dispatch; and resolve the corpus-rebuild discrepancy with a scratch `git worktree` at
`bbj-corpus` commit `cdaf3761` (current harness code + Sept-1 baseline data) for the closing run only,
never touching the shared `main` working tree other sessions may be using concurrently.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Corpus/reject file iteration, sharding, classification, report writing | Harness (`bbj-corpus/conformance/run.mjs`) | — | Already owns this; endpoint mode only adds columns |
| Per-file Langium parse/validate (hermetic) | Harness worker (`worker.mts`), via the language server's own `createBBjTestServices` | — | Unchanged code path in non-endpoint mode |
| Per-file real BBj parse verdict | `bbj-ls` `ParserWorker` (Java, behind BBjServices :5008) | Harness worker, via `JavaInteropService.parseProgram` | The harness is a client; it never reimplements the parser |
| Diagnostic reconciliation (verdict vs. Langium) | `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` + `bbj-document-validator.ts` | Harness worker (calls it, does not reimplement it) | D-01 explicitly forbids reimplementation |
| Whole-suite regression gate | `bbj-vscode` vitest + `bbj-intellij` Gradle | — | Pre-existing test infrastructure, no new framework |
| Exit record | This repo's `.planning/` + a no-corpus-content README | Private `bbj-corpus` repo (REPORT.md/history.jsonl, has the real numbers by file id) | D-09/D-10 split: numbers-with-ids stay private, own-words summary is public |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

- **D-01:** Endpoint mode is a flag on the existing harness, not a separate script: `run.mjs --ls <repo> --endpoint <host>:<port>`, passed through to `worker.mts`. With the flag, each file goes through the same path as the Phase 103 probe. The file is built with validation on the hermetic fake-interop services, then the real `JavaInteropService.parseProgram()` is asked, then the product's own `reconcileWithVerdict` + `applyDiagnosticHierarchy` run. None of the reconciliation is reimplemented. Without the flag, the harness behaves exactly as today, byte for byte in its classification.
- **D-02:** Every file goes to the endpoint: all 11,898 accepted corpus files and all 1,210 rejects, not only the ~1,241 the probe covered. The report adds a row for "accepted files that drew a BBj Parser error" (endpoint/compiler disagreement). The run will take much longer than the one-minute fake-interop run. That is accepted.
- **D-03:** Report both views, and gate on the matching one. In endpoint mode, REPORT.md and summary.json show Langium's own A and A2 (raw) *and* the reconciled view. The exit gate checks **A and A2 on the raw numbers** and **B on the reconciled numbers**.
- **D-04:** An endpoint failure falls back per file and is counted. When a call fails, that file is classified the way the product handles a failed cycle: Langium's diagnostics stay unchanged, with no reconciliation. The failure count and kinds are reported. **The exit-gate run counts only if it has 0 endpoint failures.**
- **D-05:** The closing measurement runs last, on the branch HEAD (PR #691 branch, phases 98-105 on top of origin/main), measured after every other Phase 104 commit in this repo, so the harness records `sourceModified: false`. **The corpus build is used as it is (compiler build of September 1 2026, 11,898 accepted, 1,210 rejects); it is not rebuilt.** — **See the "Corpus rebuild" section below: this premise is now false as measured on disk; the planner must add a resolution step.**
- **D-06:** "Green" means no new failures against the base. A `bbj-vscode` whole-suite run with :5008 up: `numFailedTests` may contain only the named, known env-drift tests (linking.test.ts interop block and the issue447 capability test), same test names must fail on origin/main in a scratch worktree with Node 22, compared by name not count. A run with interop unreachable (what CI sees): exactly 0 failures. IntelliJ `./gradlew test`: 0 failures. This covers CONF-01 regression files and Phase 100's `examples/` assertions.
- **D-07:** Build both distributables from the final tree, with no hand UAT (Phase 104 changes no IDE behaviour).
- **D-08:** Push the branch and update the PR #691 description with the exit numbers and a 104 summary, after scanning every branch commit body for closing keywords (squash-merge risk). Merging the PR and completing the milestone stay with the user.
- **D-09:** The maintainer pointer is `bbj-vscode/test/test-data/conformance/README.md`. Says what the files are, that corpus measurement lives in the private `bbj-corpus` repo, gives the command shape, notes local-only/never-CI, notes endpoint mode needs BBj 26.03+. Holds no corpus numbers/names/content. Not on the public docs site; CLAUDE.md unchanged.
- **D-10:** The result is recorded in `104-CONFORMANCE.md` plus a one-line PROJECT.md pointer. Holds the gate table (both runs, raw+reconciled), each residual list-A/A2 group in own words, residual B misses and why, endpoint failure count. No corpus ids/paths/source. No per-residual todos or seeds.
- **D-11:** Phase 103's `checkUseBeforeAssignment` exception on 2 reject files becomes a pending todo, not fixed here. Synthetic repro derived in own words, no corpus text.
- **D-12:** Commit in bbj-corpus: endpoint mode code, README section, closing run's REPORT.md/summary.json/details.json/history.jsonl, plus uncommitted 98-103 result files. Stage by exact path only. **`eval/` must never be touched or staged.** No push (no remote).
- **D-13:** README in bbj-corpus: extend "Conformance of the language server" with endpoint mode — flag, prerequisite (BBjServices with `parseProgram`, BBj 26.03+), expected runtime, raw vs reconciled columns, zero-failure rule.
- **D-14:** `snapshots/` stays untracked scratch, added to bbj-corpus `.gitignore`. Delete `snapshots/phase-103-endpoint-probe.mts` (+ its `.json`) once endpoint mode reproduces the probe's B figure.
- **D-15:** One `history.jsonl`, tagged by mode — endpoint-mode runs append with an `endpoint` field (host, port, failure count, BBj version if exposed). REPORT.md states the mode in its header. The closing measurement records both runs (endpoint off + endpoint on), each preceded by a `details.json` snapshot, file sets compared not totals.

### Claude's Discretion

- **Concurrency in endpoint mode:** shards with one endpoint connection each, or sequential calls. 0 failures matters more than speed. — **Research finding: one connection per shard, sequential dispatch within each shard, is both simplest and provably safe against `bbj-ls`'s per-connection `ParserWorker` design (see below). Recommended.**
- **Validation always runs in endpoint mode**, unlike fake-interop mode's "validate only when no syntax errors" rule, which stays as-is so its series stays comparable. State this in the README.
- **Exact field names** in summary.json/history.jsonl/REPORT.md for raw vs reconciled columns and the disagreement row.
- **The classification helpers the probe duplicated** (the failure-kind map) — duplicate again, or import if exported. Do not add exports to the language server only for the harness.
- **Plan split** (the obvious default, used by this research):
  1. Harness endpoint mode, README, sample run reproducing the probe.
  2. Test gate (both vitest runs, base comparison, Gradle, both builds), regression-dir README.
  3. Closing measurement (both runs), 104-CONFORMANCE.md, PROJECT.md pointer, todo, corpus commits, cleanup, push, PR body.

### Deferred Ideas (OUT OF SCOPE)

- The `checkUseBeforeAssignment` exception on 2 reject shapes becomes a pending todo (D-11), not fixed here.
- `2026-09-20-linking-interop-failures-survive-class-warmup.md` — handled by the D-06 gate instead, not folded.
- `2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` — not folded, stale (A2 already 22 ≤ 25); remaining IF-shaped A2 files stay residuals in 104-CONFORMANCE.md.
- IntelliJ lifecycle todos (`2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md`, `2026-09-20-phase-97-code-review-follow-ups.md`, `2026-09-20-status-transition-log-prints-a-stale-previous-status.md`) — unrelated.
- `2026-09-23-live-parse-waits-on-shared-connection-breaker.md` — java-interop behaviour, out of scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-02 | The conformance run can include the `bbj-ls` endpoint, reports list B with it, and the way to run it is documented for maintainers | `--endpoint` flag design (Architecture Patterns), exported symbols confirmed (Code Examples), bbj-corpus README extension (D-13) |
| CONF-03 | On the corpus build of the baseline, the milestone ends with A ≤ 25, A2 ≤ 25, and B ≤ 5 % with the endpoint active, all existing test suites passing | Corpus-rebuild blocking finding + mitigation, concurrency finding, test-gate mechanics (D-06), IntelliJ/VSIX build commands |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Search/read with built-in tools first (`Grep`/`Glob`/`Read`); shell `grep`/`find`/`cat` only when a pipeline into another program is unavoidable. (This session's `Grep` tool was reported unavailable per project memory `grep-tool-unavailable-use-bash-grep.md`; bash `grep` with absolute paths was used instead, consistent with that memory.)
- Every shell path absolute and complete; never `cd` + `grep`/`find`/`cat`/`sed`/`head`/`tail`; `cd` only in front of a build tool.
- No blind recursive `grep -r`/`find` over a directory; never read `.env*`/`*.pem`/`*.key`/credential stores.
- `git add <exact path>` only, never `-A`/`.`.
- All of these were followed this session (absolute paths, `git -C`, no recursive greps, no secret-file reads).

## Corpus Rebuild — Blocking Finding (read before planning Plan 3)

**Verified this session**, `git -C /home/coder/repos/bbj-corpus`:

```
$ git log --format='%h %ad %s' --date=short -- build-info.json manifest.jsonl
c0099067 2026-09-23 feat: jsonl-snippets source type; docs-samples/tree-samples publishable (BBjlangMCP 03-09)
48f7bfc3 2026-09-20 Initial corpus: pipeline, golden test and first build
```

`git show c0099067:build-info.json` (current `main` tip, matches the working tree on disk —
`manifest.jsonl`/`rejects.jsonl` line counts confirmed at 16,884 / 4,615 via `wc -l`, and
`find corpus -name '*.bbj' | wc -l` / `find rejects -name '*.bbj' | wc -l` confirmed 16,884 / 4,615
files on disk):

```json
{ "built": "2026-09-23", "compiler": { "build": "build on September 22 2026", "release_notes_version": "26.03" },
  "corpus_entries": 16884, "reject_entries": 4615 }
```

`git show cdaf3761:build-info.json` (the commit that added the harness, one before the rebuild):

```json
{ "built": "2026-09-20", "compiler": { "build": "build on September 1 2026", "release_notes_version": "26.02" },
  "corpus_entries": 11898, "reject_entries": 1210 }
```

This matches the milestone baseline exactly (A=168/11,898, B=658/1,210 was measured against this
build). **`bbj-corpus`'s shared `main` branch no longer holds that build.** The rebuild commit
(`c0099067`, authored by the project owner, same GitHub identity, but under a *different* GSD
project — "BBjlangMCP phase 3 plan 03-09" — landed 2026-09-23 17:22 UTC, during this repo's own
Phase 104 work) added two new sources (`docs-samples`, `tree-samples`) and re-ran the pipeline
against a newer compiler build. `git -C /home/coder/repos/bbj-corpus status --short` also shows
the harness's own result files (`REPORT.md`, `details.json`, `history.jsonl`, `summary.json`) as
locally modified/uncommitted from the 98-103 runs, and `conformance/snapshots/` and `eval/` as
untracked (matches D-12/D-14's expectations for those two).

**Why this blocks Plan 3 as CONTEXT.md wrote it.** D-05's absolute gate numbers (A ≤ 25, A2 ≤ 25)
and the B percentage's denominator (5 % of 1,210) are only comparable against the Sept-1/11,898/1,210
build. Running the closing measurement against the rebuilt 16,884/4,615 corpus would produce numbers
that are not the milestone's own baseline series, and the fixed absolute caps would silently mean
something different (the corpus is ~42 % larger and its composition changed).

**Verified, not reimplemented, harness code is unaffected.** `git diff cdaf3761 c0099067 --
conformance/run.mjs conformance/worker.mts conformance/package.json conformance/package-lock.json`
returns empty — only `build-info.json`, `manifest.jsonl`, `rejects.jsonl`, `sources.json`,
`README.md`, and `corpus/`/`rejects/` content changed. The harness's own code that Plan 1 will
extend with `--endpoint` is identical between the two commits.

**Recommended mitigation (present to the user as a checkpoint, do not silently resolve):**

```bash
# One-time, isolated, does not touch the shared main working tree other sessions use:
git -C /home/coder/repos/bbj-corpus worktree add /tmp/bbj-corpus-v45-gate main
git -C /tmp/bbj-corpus-v45-gate checkout cdaf3761 -- \
  manifest.jsonl rejects.jsonl build-info.json corpus/ rejects/
# /tmp/bbj-corpus-v45-gate now has: current harness code (main, with Plan 1's --endpoint
# addition once committed) + the Sept-1/26.02/11,898/1,210 baseline data.
```

Run Plan 3's closing measurement (both endpoint-off and endpoint-on) from this worktree's
`conformance/` directory (needs its own `npm install`, or symlink `node_modules` from the main
checkout — `package-lock.json` is identical between the two commits so either is safe). Remove the
worktree afterward (`git -C /home/coder/repos/bbj-corpus worktree remove /tmp/bbj-corpus-v45-gate`).
This never checks out old data into `main`'s own working directory, so it cannot race or corrupt
whatever the sibling BBjlangMCP project does concurrently in the same clone.

**Alternative the user may prefer instead:** accept the new, larger corpus and rescale the gate
(e.g., B ≤ 5 % of 4,615 ≈ 230 files, A/A2 caps left as absolute counts or also rescaled). This is a
milestone-scope decision, not a research one — flag it, do not decide it.

**What must NOT happen:** running the closing measurement against `bbj-corpus`'s current `main`
working tree as-is and reporting the result as "A ≤ 25 of 11,898" — the corpus underneath would
silently not be the 11,898 the number claims.

## Standard Stack

No new library dependency for this phase. The endpoint-mode code reuses:

| Component | Where | Purpose |
|-----------|-------|---------|
| `tsx` `~4.20.0` | `bbj-corpus/conformance/package.json` (existing devDependency) | Runs `.mts`/`.ts` source directly, already installed |
| `JavaInteropService.parseProgram` | `bbj-vscode/src/language/java-interop.ts:492` | The real endpoint call — reused, not reimplemented |
| `createBBjServices(NodeFileSystem)` | `bbj-vscode/src/language/bbj-module.ts` | Real-side services (mirrors the probe) |
| `createBBjTestServices(EmptyFileSystem)` | `bbj-vscode/test/bbj-test-module.ts` | Hermetic Langium side (unchanged, already used by `worker.mts`) |

**Package Legitimacy Audit:** Not applicable — this phase adds no new npm/pip/cargo package to
either repository. (Follows the same "not applicable" pattern Phases 98-100 recorded for
grammar-only plans.)

## Architecture Patterns

### System Architecture Diagram (endpoint mode, one shard)

```
run.mjs (orchestrator)
  │ builds job list (corpus/ + rejects/), splits into N shards
  │ spawns N × `tsx worker.mts <lsRepo> <jobsFile> <outFile> <mode> <endpoint>`
  ▼
worker.mts (one shard, one Node process)
  │
  ├─ mode !== endpoint-active:  UNCHANGED — createBBjTestServices only, byte-identical output
  │
  └─ endpoint flag present:
       │ createBBjTestServices(EmptyFileSystem)     ── hermetic Langium side (as today)
       │ createBBjServices(NodeFileSystem)           ── real side, ONE per shard process
       │   .setConnectionConfig(host, port)          ── ONE dedicated socket per shard
       │
       for each job in this shard (SEQUENTIAL — await before next):
         │
         ├─ factory.fromString(text, uri) → parse
         ├─ builder.build([doc], {validation:true})   ── ALWAYS, even with syntax errors (discretion item)
         ├─ raw = recallLangiumDiagnostics(doc)        ── "raw" view (Langium's own A/A2)
         │
         ├─ await bbjServices...JavaInteropService.parseProgram({text, canonicalName, ...})
         │     │
         │     ├─ result.errors → verdictDiagnostics = parseErrorsToDiagnostics(...)
         │     │     reconciled = reconcileWithVerdict(raw, verdictDiagnostics, documentLineText(doc))
         │     │     hierarchyApplied = applyDiagnosticHierarchy(reconciled.diagnostics, true, 20)
         │     │        ── "reconciled" view (what the user sees; B gates on this)
         │     │
         │     └─ throws (timeout/size-cap/service-unavailable/transport/cancelled)
         │           → classifyFailureKind(code) [duplicated, not exported]
         │           → hierarchyApplied = applyDiagnosticHierarchy(raw, true, 20)  ── no reconciliation
         │           → endpoint-failure counted (D-04)
         │
         └─ result[job.id] = { raw: {...}, reconciled: {...}, endpointOutcome, ms }
       │
       ▼ writeFileSync(outFile, JSON.stringify(results))

run.mjs (after all shards resolve)
  │ classification EXTENDED (not replaced): falseRejects/falseAlarms computed from `raw` (D-03),
  │ `missed` (list B) computed from `reconciled` when endpoint mode, from today's single view otherwise
  │ new row: accepted files where `reconciled.bbjErrorCount > 0` (endpoint/compiler disagreement, D-02)
  ▼
REPORT.md / summary.json / details.json / history.jsonl (endpoint field added per D-15)
```

### Recommended worker.mts structure (endpoint branch, additive)

```
bbj-corpus/conformance/
├── run.mjs        # + args.endpoint parsing (same `--flag value` style as --ls/--mode/--shards),
│                  #   passed as a 5th positional arg to each spawned worker.mts
├── worker.mts     # + endpoint-mode branch: only entered when the 5th argv is non-empty;
│                  #   the non-endpoint path is untouched (D-01's byte-identical guarantee)
```

`run.mjs`'s `spawn(...)` call (today: `[worker.mts, lsRepo, jobsFile, outFile, mode]`) is the
**minimal insertion point** — append `args.endpoint ?? ''` as a 5th element. `worker.mts`'s
`const [lsRepo, jobsFile, outFile, mode] = process.argv.slice(2)` becomes `const [lsRepo, jobsFile,
outFile, mode, endpoint] = process.argv.slice(2)`, and the endpoint-mode services/imports are only
constructed when `endpoint` is a non-empty string.

### Pattern: Promote the probe, don't rewrite it

**What:** `bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts` already contains, verified
working end-to-end against the real endpoint with 0 failures over 1,241 files: the exact import set
(`vscode/node_modules/langium/lib/index.js` for `EmptyFileSystem`/`URI`/`DocumentValidator`,
`vscode/node_modules/langium/lib/node/index.js` for `NodeFileSystem`, then absolute-path imports
into `vscode/test/bbj-test-module.ts` and `vscode/src/language/*.ts` — the same absolute-path idiom
`worker.mts` already uses and that `sourceModified` detection depends on), the per-file
`processFile` function (build with validation always on, call `parseProgram`, reconcile, apply
hierarchy, classify caught/syntaxErrorRemains), the `APPLICATION_ERROR_KINDS`/`classifyFailureKind`
duplication, and a sanity check (`x = (1 + 2\n` must produce a non-empty `recallLangiumDiagnostics`
before the real run starts, aborting with `process.exit(1)` otherwise).
**When to use:** Plan 1, task 1 — lift this into `worker.mts`'s new endpoint branch nearly verbatim;
adapt only the per-shard job-list iteration (probe iterates its own `rejectRecords`/`acceptedEntries`
arrays; `worker.mts` already iterates a generic `jobs` array from `jobsFile`) and the output shape
(probe writes one big JSON; `worker.mts` must write per-job `results[job.id]` matching `run.mjs`'s
existing aggregation contract).
**Example (sanity check, worth keeping verbatim — it is what caught silent-measure-nothing risk in Phase 103):**
```typescript
// Source: bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts:123-137 (read this session)
const checkDoc = factory.fromString('x = (1 + 2\n', checkUri);
documents.addDocument(checkDoc);
await builder.build([checkDoc], { validation: true });
const checkRaw = recallLangiumDiagnostics(checkDoc);
if (!checkRaw || checkRaw.length === 0) {
    console.error('FATAL: recallLangiumDiagnostics returned empty ... aborting before the full run.');
    process.exit(1);
}
```

### Pattern: One connection per shard, sequential dispatch

**What:** Each `worker.mts` shard process, in endpoint mode, opens exactly one
`createBBjServices(NodeFileSystem)` instance and calls `.setConnectionConfig(host, port)` once at
startup (mirroring the probe). Every job in that shard's list is processed with a plain `for...of`
loop and `await` on `parseProgram` before moving to the next job — never `Promise.all` over a
shard's own job list.
**When to use:** Always, for the endpoint-mode branch. This is the only shape verified safe against
`bbj-ls`'s `ParserWorker` design (see Common Pitfalls below) without needing to change or reason
about BBj-side code.
**Why not more concurrency:** D-04 makes 0 endpoint failures the acceptance bar for the gate run;
sequential-per-shard has no plausible failure mode from the client side. Shard count is a pure
runtime lever (`--shards N`), already a `run.mjs` CLI flag — raise it if the sequential-per-shard
runtime proves too slow after Plan 1's sample run, watching `endpointFailuresByKind` for any
nonzero count as the signal to back off.

### Anti-Patterns to Avoid

- **Reimplementing failure classification or reconciliation logic in the harness.** D-01 forbids
  this explicitly. Every one of `reconcileWithVerdict`, `applyDiagnosticHierarchy`,
  `parseErrorsToDiagnostics` is an exported function — import and call it.
- **Adding a language-server export solely for the harness.** Confirmed unnecessary this session:
  every symbol the endpoint path needs except `classifyFailureKind` (module-private in
  `bbj-parser-service.ts`) is already exported. Duplicate that one function only, as the probe did.
- **Running the gate measurement against whatever `bbj-corpus/main` happens to hold at the time.**
  See the blocking finding above — verify `build-info.json`'s `corpus_entries`/`reject_entries`
  match 11,898/1,210 immediately before Plan 3's closing run, every time, not only once.
- **`Promise.all` across a shard's own job list in endpoint mode.** Would put multiple in-flight
  requests on one connection; safe only if every `canonicalName` is guaranteed unique per in-flight
  moment, which sequential dispatch guarantees trivially and concurrent dispatch does not.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Diagnostic reconciliation (verdict vs. Langium) | A harness-local "which diagnostic wins" comparator | `reconcileWithVerdict` (`bbj-diagnostic-reconciliation.ts`) | D-01; also the only way the harness's B number means what the product actually shows a user |
| Diagnostic hierarchy / suppression rules | A harness-local Error/Warning filter | `applyDiagnosticHierarchy` (`bbj-document-validator.ts`) | Same reasoning; Rule 0-3 order matters and is already tested |
| Coordinate conversion (BBj 1-based → LSP 0-based, clamping) | A harness-local range converter | `parseErrorsToDiagnostics` / `parseErrorToRange` (`bbj-parser-service.ts`) | Already pinned against continuation lines/CRLF/line-numbered programs (Phase 102) |

**Key insight:** every one of the "hard" parts of this phase's harness work is already solved,
tested product code. The phase's actual engineering is plumbing (argv → services → per-file loop →
result shape → `run.mjs`'s aggregation), which is exactly why D-01 pins "none of the reconciliation
is reimplemented" as a locked decision rather than leaving it to discretion.

## Runtime State Inventory

Not applicable — this phase is not a rename/refactor/migration. It adds an opt-in code path and
writes records; nothing renamed, nothing migrated.

## Common Pitfalls

### Pitfall 1: Cross-connection cancellation fear (unfounded, but verify empirically once)

**What goes wrong:** Assuming BBjServices "serializes everything" and building an unnecessarily
slow single-global-connection harness, or the opposite — assuming full parallelism is free and
firing many concurrent requests over one connection, hitting `RequestCancelled`.
**Why it happens:** `bbj-ls`'s `ParserWorker` class comment ("latest-wins... a queued older request
is never parsed") reads, out of context, like a global constraint. It is not: `pending` is an
**instance field**, one `ParserWorker` per TCP connection (`ParserWorker.java:56,166`,
`newWorkerExecutor()` at line 226 creates one dedicated daemon thread per connection).
**How to avoid:** One connection per shard (verified above), sequential dispatch within a shard.
Confirmed by reading `ParserWorker.java` this session — not empirically load-tested at N-way
concurrency against BBjServices in this session, so treat "N shards run cleanly in parallel" as
**MEDIUM confidence** until Plan 1's sample run (small `--limit`, a handful of shards) confirms 0
endpoint failures at the chosen shard count.
**Warning signs:** Any nonzero `endpointFailuresByKind.cancelled` in a sample run — back off shard
count or fall back to `--shards 1` before the full 13,108-file run (D-04 requires 0 failures for the
run to count as the gate).

### Pitfall 2: The endpoint-mode validation rule silently diverging from the probe

**What goes wrong:** Reusing `worker.mts`'s existing `if (mode === 'validate' && result.syntaxErrors
=== 0)` guard unchanged inside the endpoint branch — this SKIPS validation whenever there's a syntax
error, which is the **fake-interop-mode rule**, not the product's real behavior and not what the
probe measured.
**Why it happens:** It is the path of least resistance — the condition already exists in the file
and looks reusable.
**How to avoid:** In the endpoint branch, always call `builder.build([document], { validation: true
})` regardless of `syntaxErrors`, exactly as the probe does (`phase-103-endpoint-probe.mts:80`) and
as CONTEXT.md's Claude's-Discretion item states explicitly. Document this divergence in the
bbj-corpus README per D-13, so a future reader does not "fix" it back to matching fake-interop mode.
**Warning signs:** Endpoint-mode B numbers implausibly higher than the Phase 103 probe's 31/1,210 —
a sign validation is being skipped on syntax-erroring rejects, which is most of `rejects.jsonl`.

### Pitfall 3: Reporting "A ≤ 25" against the wrong denominator

**What goes wrong:** Running Plan 3's closing measurement against whatever `bbj-corpus/main` holds
at the moment, and reporting the absolute counts as if they still mean "of 11,898 / of 1,210."
**Why it happens:** `run.mjs` reads `manifest.jsonl`/`rejects.jsonl` from the repo root at run time
with no version pin or count assertion — it will happily run against 16,884/4,615 and print numbers
that look like the same kind of number as the baseline.
**How to avoid:** See the Corpus Rebuild section — verify `build-info.json`'s counts immediately
before Plan 3's runs, every time.
**Warning signs:** `summary.json`'s `corpus.files`/`rejects.files` not equal to 11898/1210.

### Pitfall 4: `checkUseBeforeAssignment`'s exception surfacing as a real test failure elsewhere

**What goes wrong:** The same pre-existing exception noted in 103-CONFORMANCE.md
(`check-variable-scoping.ts`'s `checkUseBeforeAssignment` throwing when `getSymbolRefName` reads
`.symbol` off a `SymbolRef` AST node whose cross-reference was never populated, e.g. from parser
error-recovery on a malformed statement) is caught by Langium's `ValidationRegistry.handleException`
and silently skips that one check for that one file — it will not surface as a harness crash, but it
also means that check silently contributes no diagnostic for those two files, which could shift
this phase's own residual-A2 counting if a plan tries to attribute a specific file's classification
to this check.
**How to avoid:** File the D-11 todo (see below); do not attempt to fix the check in this phase.
**Warning signs:** None visible in the harness output itself — this is exactly why it needs a todo,
not a silent pass-through.

## D-11 Todo — `checkUseBeforeAssignment` Exception Repro Shape

**Read this session**, `bbj-vscode/src/language/validations/check-variable-scoping.ts:62-67`:

```typescript
function getSymbolRefName(expr: AstNode): string | undefined {
    if (isSymbolRef(expr)) {
        return expr.symbol.$refText?.toLowerCase();
    }
    return undefined;
}
```

The 103-CONFORMANCE.md caveat says this throws reading a property of an undefined reference on 2
reject files. Since `isSymbolRef(expr)` already narrows `expr.$type` to `SymbolRef`, the only way
`expr.symbol` itself can be `undefined` (not merely unresolved — `expr.symbol.ref === undefined` is
the ordinary, already-handled "unresolved reference" case checked elsewhere in this file) is a
`SymbolRef` AST node whose `symbol` cross-reference property was never populated at all — a shape
Chevrotain's parser error-recovery can produce when it synthesizes a partial CST for a rule that did
not fully match (as opposed to a single missing token, which Chevrotain's own recovery inserts a
placeholder for). `getSymbolRefName` is called from two passes: Pass 1 (`isLetStatement`'s
`assignment.variable`, `isForStatement`'s `stmt.init?.variable`) and indirectly by Pass 2's own
inline `child.symbol.$refText` read. A plausible trigger shape (own words, no corpus text): **a
`FOR` loop's init clause, or an assignment's left-hand side, positioned immediately adjacent to an
unrelated syntax error severe enough that the parser's error recovery skips past the normal
identifier/cross-reference machinery for that one clause while still producing a `SymbolRef`-typed
node for it** — e.g. a `FOR` statement whose loop variable is itself a malformed or unexpected token
sequence that the grammar's error recovery absorbs into a degenerate `SymbolRef`.

**Probe attempt this session (13 candidates via `parseHelper`/`validationHelper` against
`createBBjServices(EmptyFileSystem)`, in a temporary test file created and deleted within this
session, never committed):** incomplete `FOR` init, incomplete assignment RHS, malformed `FOR`
target (parenthesized expression), dangling `DIM`/`ENTER` with unclosed bracket, malformed
assignment LHS, `FOR` with a missing variable before `=`, a nested compound-statement malformed
`IF`, a `#`-prefixed target outside a class, a `FOR` with a `#`-prefixed target, an assignment to a
keyword-shaped name, a dotted `FOR` target, and a malformed array-element receiver in a `FOR`/`ENTER`
context. **None reproduced the exception** — each either parsed cleanly, produced an ordinary parser
error, or produced the already-handled "could not resolve reference" linking diagnostic. This
narrows the true trigger to something this session's 13 candidates did not hit; the 2 corpus reject
files that did trigger it are not available to read directly (private repo, D-11 forbids quoting
their content in any case).
**Recommendation for the todo's author (executor):** file the todo with the hypothesis above stated
as a hypothesis, not a confirmed root cause, and note the 13 negative probe results as "tried, did
not reproduce" so a future investigator does not repeat them. A more targeted next attempt would be
a malformed statement that gets swallowed into `CompoundStatement` error recovery specifically
inside a `FOR`/assignment's own sub-expression position (nested past one level of colon-continuation
or a semicolon-joined statement), which this session's candidates did not try in combination.

## Push Mechanics — PR #691's Branch Name Does Not Match the Local Branch (D-08)

**Verified this session**, `git branch -vv` + `gh pr view 691`:

```
gh pr view 691 --json headRefName,baseRefName,state,mergeable
  → headRefName: "gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility"
  → baseRefName: "main", state: "OPEN", mergeable: "MERGEABLE"

git branch -vv (relevant lines):
  gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility  [origin/gsd/phase-102-...: behind 60]
* gsd/phase-103-one-set-of-errors-diagnostic-reconciliation           [origin/gsd/phase-103-...: ahead 19]

git merge-base --is-ancestor origin/gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility HEAD
  → true (20 commits behind local HEAD, clean fast-forward)
```

PR #691's GitHub head ref is still named after Phase 102 (per STATE.md's Phase 105 note, "PR #691
retitled and extended... pushed by plain fast-forward only" — the PR's *title* and description were
updated per-phase, but the underlying branch ref name was never renamed). The current local branch
(`gsd/phase-103-one-set-of-errors-diagnostic-reconciliation`) is a **different, newer** local branch
that continues the same commit lineage, with its own separate `origin/gsd/phase-103-...` remote
branch (already pushed, 19 commits, but this is NOT the PR's branch).

**What D-08's "push the branch" must actually do, once Phase 104's commits land on local HEAD:**

```bash
git push origin HEAD:gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility
```

A plain `git push` (or pushing to `gsd/phase-104-...`) would either push to the wrong ref (the
already-existing `origin/gsd/phase-103-...` tracking branch) or create a new branch that is not
attached to PR #691 at all. This exact fast-forward-to-a-differently-named-ref pattern is what
Phase 105 already did successfully (STATE.md: "pushed by plain fast-forward only"), so it is a
proven, not merely inferred, mechanism.

## Code Examples

### Exported symbols confirmed this session (no new exports needed)

```typescript
// Source: bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts (read this session)
export function reconcileWithVerdict(langiumDiagnostics, verdictDiagnostics, lineText): { diagnostics, state };
export function documentLineText(textDocument): LineTextLookup;
export function recallLangiumDiagnostics(document): Diagnostic[] | undefined;
export function isSyntaxComplaint(diagnostic): boolean;

// Source: bbj-vscode/src/language/bbj-document-validator.ts (read this session)
export function applyDiagnosticHierarchy(diagnostics, suppressEnabled, maxErrors): Diagnostic[];

// Source: bbj-vscode/src/language/bbj-parser-service.ts (read this session)
export function parseErrorsToDiagnostics(errors, lineCount, maxErrors): Diagnostic[];
export function parseErrorToRange(error, lineCount): Range;
// classifyFailureKind (this file's own -3300x mapping) is module-private — NOT exported.
// The harness must duplicate the same table, exactly as
// snapshots/phase-103-endpoint-probe.mts:58-70 already does.

// Source: bbj-vscode/src/language/java-interop.ts (read this session)
export class JavaInteropService {
  public setConnectionConfig(host: string, port: number): void;               // line 406
  public async parseProgram(params: ParseProgramParams, token?): Promise<ParseProgramResult>; // line 492
  public get connectionGeneration(): number;                                  // line 235
}
export const METHOD_NOT_FOUND = -32601;                                       // line 1464
export interface ParseProgramParams { text, canonicalName, version, prefixes, workspaceRoots }
export interface ParseProgramResult { errors: ParseError[] }                  // errors always present
```

### The bbj-ls server-side failure-code table (must match the client's duplicate exactly)

```java
// Source: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java:71-95 (read this session)
static final int ERROR_PARSE_FAILED = -33001;
static final int ERROR_TIMEOUT = -33002;
static final int ERROR_TOO_LARGE = -33003;
static final int ERROR_SERVICE_UNAVAILABLE = -33004;
static final int ERROR_PROTECTED_PROGRAM = -33005;
// InvalidParams uses JSON-RPC's own -32602; RequestCancelled uses lsp4j's own -32800.
```
This confirms the probe's/parser-service's `APPLICATION_ERROR_KINDS` table (`-33001`..`-33005`) is
complete and current — no sixth code was added since Phase 102/103.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Fake-interop-only harness (Langium alone vs. compiler) | Endpoint-aware harness (Langium + real BBj parser verdict) | This phase | List B becomes measurable against the actual live-diagnostics feature, not just Langium's static grammar |
| One-off scratch probe (`snapshots/phase-103-endpoint-probe.mts`, 1,241 files, never committed) | `--endpoint` flag on the harness proper, all 13,108 files, committed | This phase (D-14 deletes the scratch probe once superseded) | Repeatable, not a one-time proof |

**Deprecated/outdated:** `snapshots/phase-103-endpoint-probe.mts` and its `.json` output — delete
once endpoint mode reproduces the probe's B figure (D-14).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | N-way concurrent connections to BBjServices (one per shard) will not hit a shared bottleneck on the BBj side beyond the per-connection isolation `ParserWorker.java` shows — not empirically load-tested at scale this session | Common Pitfalls #1 | A full-corpus run at N shards could show endpoint failures the source reading didn't predict; mitigated by Plan 1's small sample run and D-04's fallback (drop concurrency, not the gate) |
| A2 | The endpoint-mode wall-clock runtime for 13,108 files is not estimated from a recorded number — the Phase 103 probe (1,241 files, sequential, one connection) did not record per-file or total timing | Don't Hand-Roll / Architecture Patterns | Plan 1 or Plan 3 could underestimate how long the full run takes; mitigated by running a small `--limit` timed sample first and extrapolating before committing to the full run |
| A3 | The corpus-rebuild mitigation (`git worktree` at `cdaf3761` + current harness code) is a workable combination — verified that `run.mjs`/`worker.mts`/`package.json`/`package-lock.json` are byte-identical between `cdaf3761` and current `main` (`git diff` empty), so this is HIGH confidence, but the *decision* to use this mitigation vs. rescaling the gate is a user call, not a technical one | Corpus Rebuild section | If the user prefers rescaling instead, Plan 3's task list changes; flagged as a checkpoint, not silently resolved |

## Open Questions

1. **Which resolution does the user want for the corpus rebuild?** (worktree-at-old-commit to
   preserve the exact baseline denominators, or accept-and-rescale against the new corpus)
   - What we know: both are mechanically possible; the harness code itself is unaffected either way.
   - What's unclear: whether "the milestone's own baseline series" (comparability with 168/267/658)
     or "measure against the freshest, more diverse corpus" is more valuable to the user.
   - Recommendation: surface as an explicit checkpoint at the start of Plan 3, default to the
     worktree mitigation (preserves D-05's literal locked numbers) unless the user says otherwise.

2. **Exact endpoint-mode full-corpus runtime.**
   - What we know: fake-interop mode does all 13,108 files in ~78-88 seconds (4 shards); the
     endpoint-mode probe covered 1,241 files sequentially with 0 recorded timing.
   - What's unclear: real BBj parse latency per file at scale, and whether it is network- or
     parse-bound.
   - Recommendation: Plan 1's "sample run that reproduces the probe" should use `--limit` with
     `time` around it, to get a real files/second figure before Plan 3 commits to the full run.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| BBjServices on :5008 offering `parseProgram` | Endpoint-mode runs, Plan 1/3 | ✓ (confirmed this session — port open, a live `com.basis.startup.BBjServices` Java process running since 10:12 today) | BBj 26.03-class `bbj-ls.jar` (per project memory, fresh install since 2026-09-23 ships its own `parseProgram`-capable jar) | — |
| Node.js | `npm test`, `langium:generate`, harness (`tsx`) | ✓ | v24.20.0 (system default; no nvm/fnm/volta/asdf found) | `npx -y node@22 -p process.execPath` resolves a Node 22 binary on demand — the established project pattern for `langium:generate` and scratch-worktree base comparisons (Node 24 breaks `langium:generate`; `npm run build`/`vsce package` run fine on Node 24 per 105-MEASUREMENT.md) |
| `gh` CLI + GitHub auth | D-08 push/PR update | ✓ (PR #691 queried successfully this session) | — | — |
| `bbj-corpus` repo, `bbjcpl`/`bbjlst` | Harness corpus, `examples-compile.test.ts`'s BBj-gated layer | ✓ (`/opt/bbx`) | build Sept 22 2026 currently on disk (see Corpus Rebuild) | — |

**Missing dependencies with no fallback:** none identified.

**Missing dependencies with fallback:** Node 22 for `langium:generate`/base-comparison — fallback
already established and used by every prior v4.5 phase (`npx -y node@22 -p process.execPath`).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (`bbj-vscode`), JUnit 5 via Gradle (`bbj-intellij`) |
| Config file | `bbj-vscode/vitest.config.ts` (existing); no new config needed |
| Quick run command | `cd bbj-vscode && npx vitest run test/example-files.test.ts` (or any single file) |
| Full suite command | `cd bbj-vscode && npx vitest run --maxWorkers=2` (interop-up path); `RUN_BBJ_TESTS=0 npx vitest run` (interop-unreachable/CI-equivalent path); `cd bbj-intellij && ./gradlew test --rerun-tasks` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| CONF-02 | `--endpoint` flag produces list B with real verdicts, documented | integration (manual harness run, private repo, never CI) | `node run.mjs --ls <this repo> --endpoint 127.0.0.1:5008 --limit 150` (sample), then full run | ✅ (harness exists; flag is this phase's own deliverable) |
| CONF-03 (test-suite half) | `npm test` green (interop up and unreachable), IntelliJ suite green | whole-suite | `cd bbj-vscode && npx vitest run --maxWorkers=2` / `RUN_BBJ_TESTS=0 npx vitest run`; `cd bbj-intellij && ./gradlew test --rerun-tasks` | ✅ |
| CONF-03 (gate-number half) | A ≤ 25, A2 ≤ 25, B ≤ 5 % with endpoint active | integration (manual, private repo) | Plan 3's closing run against the resolved (worktree or rescaled) corpus | ✅ once Plan 1 lands the flag |

### Sampling Rate

- **Per task commit (Plan 1/2):** targeted test file (`npx vitest run test/example-files.test.ts` or the file under change).
- **Per wave merge:** full `bbj-vscode` suite (both interop-up and interop-unreachable modes) — D-06's explicit gate.
- **Phase gate:** full suite green (both modes) + IntelliJ `./gradlew test --rerun-tasks` green, before Plan 3's closing measurement and before `/gsd-verify-work`.

### Wave 0 Gaps

None — existing test infrastructure (`example-files.test.ts`, `examples-compile.test.ts`,
`linking.test.ts`, the IntelliJ Gradle suite) covers every phase requirement's automatable half. The
private-corpus half is deliberately never automated in CI (roadmap ordering note), consistent with
every prior v4.5 phase.

## Security Domain

`security_enforcement` is not disabled in `.planning/config.json` — treated as enabled. This phase
adds no new runtime attack surface: it is harness plumbing in a private repository (never deployed,
never CI) plus a documentation pointer in the public repo. The relevant control is data
confidentiality, not code security.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | no | No auth surface touched |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (new) | `parseProgram`'s size/prefix caps already exist server-side (`ParserWorker.checkSize`, Phase 101); this phase only calls the existing client method |
| V6 Cryptography | no | — |

### Known Threat Patterns for this phase's stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Proprietary/corpus content leaking into the public repo (file names, source text, corpus ids) | Information Disclosure | D-09/D-10's explicit "own words, no ids/paths/content" rule for every file this phase writes in the public repo; verified this session that `bbj-corpus`'s own `REPORT.md`/`details.json`/`history.jsonl` (which DO carry file ids) stay in the private repo only, per D-12 |
| `eval/` (a sibling project's directory inside the same private clone) getting staged accidentally by a broad `git add` | Tampering (unintended commit) | D-12's "stage by exact path only" — confirmed this session that `eval/` is currently untracked and must stay that way; never `git add -A`/`git add .` in `bbj-corpus` |
| The corpus-rebuild race (a concurrent, unrelated project mutating the shared private repo mid-phase) | Tampering (of the measurement's own input) | The worktree mitigation above isolates Plan 3's read from `main`'s live working tree entirely |

## Sources

### Primary (HIGH confidence — read this session)

- `bbj-corpus/conformance/run.mjs`, `worker.mts`, `README.md`, `.gitignore`, `package.json` — full read
- `bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts` — full read
- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts`, `bbj-document-validator.ts`,
  `bbj-parser-service.ts`, `java-interop.ts` (relevant sections), `validations/check-variable-scoping.ts` — full/partial read
- `bbj-vscode/test/bbj-test-module.ts`, `test/example-files.test.ts`, `test/examples-compile.test.ts`,
  `test/test-helper.ts` — full read
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java` — full read
- `.planning/phases/103-.../103-CONFORMANCE.md`, `104-CONTEXT.md`, `.planning/REQUIREMENTS.md`,
  `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md` (Phase 104 section) — full/partial read
- `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md` — full read (todo format reference)
- Git evidence: `bbj-corpus` commit log/diff/show across `cdaf3761`/`c0099067`/`48f7bfc3`; `bbj-language-server`
  branch/remote-tracking state (`gsd/phase-102-...` vs `gsd/phase-103-...`); `gh pr view 691`
- 13-candidate `parseHelper`/`validationHelper` probe against `createBBjServices(EmptyFileSystem)`,
  run this session in a temporary, deleted-before-session-end test file (D-11 repro attempt)

### Secondary (MEDIUM confidence)

- N-way concurrent-connection behavior against real BBjServices: inferred from `ParserWorker.java`'s
  per-connection design, not load-tested at scale this session (see Assumption A1)
- Endpoint-mode full-corpus runtime: no recorded timing exists yet to extrapolate from (Assumption A2)

### Tertiary (LOW confidence)

- None recorded as authoritative-but-unverified this session; the one genuinely uncertain item
  (corpus rebuild) is escalated as a blocking finding/checkpoint rather than stated as fact.

## Metadata

**Confidence breakdown:**
- Standard stack / exported symbols: HIGH — every claim backed by a `Read` this session with line numbers
- Architecture (harness wiring, concurrency): HIGH for the client-side design, MEDIUM for at-scale server behavior (not load-tested)
- Corpus-rebuild finding: HIGH (git evidence, reproducible) — but its *resolution* is a user decision, not research
- Pitfalls: HIGH — each one is either confirmed by reading the relevant code path or is the documented Phase 103 caveat

**Research date:** 2026-09-23
**Valid until:** Re-check `bbj-corpus/build-info.json`'s `corpus_entries`/`reject_entries` immediately
before Plan 3 runs, regardless of how much time has passed — the corpus is a shared, actively-written
resource, not a stable artifact this research can pin for more than the current session.
