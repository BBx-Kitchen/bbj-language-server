# Phase 104: Conformance Measurement & Milestone Exit - Pattern Map

**Mapped:** 2026-09-23
**Files analyzed:** 8
**Analogs found:** 8 / 8

Files span two repositories. `bbj-corpus` is private (no proprietary content is quoted below —
only harness code, which is generic JS/TS plumbing). This repo's files carry no corpus numbers or
ids per D-09/D-10; excerpts here follow the same rule.

## File Classification

| New/Modified File | Repo | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `conformance/run.mjs` (add `--endpoint` arg, extend classification/report) | bbj-corpus | orchestrator/CLI script | batch | `conformance/run.mjs` (itself, modify in place) | exact — same file |
| `conformance/worker.mts` (add endpoint branch) | bbj-corpus | worker/batch processor | batch, request-response (to :5008) | `conformance/worker.mts` (itself) + endpoint call/reconcile shape from `conformance/snapshots/phase-103-endpoint-probe.mts` (untracked scratch — promote, do not cite as a tracked analog) | exact — promote scratch code into the tracked file |
| `README.md` §"Conformance of the language server" (extend) | bbj-corpus | docs/config | — | `README.md` (itself, same section) | exact |
| `conformance/.gitignore` (add `snapshots/`) | bbj-corpus | config | — | `conformance/.gitignore` (itself) | exact |
| `bbj-vscode/test/test-data/conformance/README.md` (new) | this repo | docs | — | `bbj-corpus/README.md` §"Conformance of the language server" (style/tone) + `104-CONFORMANCE.md`'s "no corpus content" discipline | role-match |
| `.planning/phases/104-.../104-CONFORMANCE.md` (new) | this repo | record/report | — | `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONFORMANCE.md` | exact — same document type, same phase-boundary convention |
| `.planning/PROJECT.md` (one-line pointer) | this repo | project doc | — | existing `PROJECT.md` "Key Decisions" table row style (see excerpt below) | role-match |
| `.planning/todos/pending/<new>-checkuseforeassignment-exception.md` (new, D-11) | this repo | todo record | — | `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md` | exact — same todo template |

## Pattern Assignments

### `bbj-corpus/conformance/run.mjs` (orchestrator, batch)

**Analog:** itself — this is a modify-in-place file, not a new one.

**Args pattern** (lines 14-18, already `--flag value` style, insertion point for `--endpoint`):
```javascript
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(arg => arg.trim().split(/\s+/, 2)));
const lsRepo = path.resolve(args.ls ?? '../bbj-language-server');
const mode = args.mode ?? 'validate';
const shards = Number(args.shards ?? 4);
const limit = args.limit ? Number(args.limit) : undefined;
```
Add `const endpoint = args.endpoint ?? '';` alongside these — same destructuring idiom, no new
arg-parsing library.

**Spawn pattern** (lines 35-41) — the insertion point for passing `endpoint` through to each shard:
```javascript
await Promise.all(Array.from({ length: shards }, (_, shard) => new Promise((resolve, reject) => {
    const jobsFile = path.join(work, `jobs-${shard}.json`);
    writeFileSync(jobsFile, JSON.stringify(jobs.filter((_, index) => index % shards === shard)));
    const child = spawn(path.join(here, 'node_modules/.bin/tsx'), [path.join(here, 'worker.mts'), lsRepo, jobsFile, path.join(work, `out-${shard}.json`), mode],
        { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`shard ${shard} exited with ${code}`)));
})));
```
Per the research doc's recommended minimal insertion, append `endpoint` as a 5th positional arg to
the `spawn(...)` array (matches D-01's "passed through to worker.mts").

**Classification pattern** (lines 63-76) — additive, not replaced, per D-03:
```javascript
const falseRejects = corpusResults.filter(entry => entry.result.syntaxErrors > 0);
const falseAlarms = corpusResults.filter(entry => entry.result.syntaxErrors === 0 && entry.result.validationErrors > 0);
const isSyntaxReject = record => record.errors.some(error => !error.message);
const caughtBy = entry => entry.result.syntaxErrors > 0 ? 'parser'
    : entry.result.validationErrors > 0 ? 'validation error'
        : entry.result.validationWarnings > 0 ? 'warning only' : 'missed';
```
Endpoint mode adds a `reconciled` view alongside this `raw` view (D-03): the raw block stays exactly
as-is (gates A/A2), and a parallel block reads `entry.result.reconciled.*` fields for B and the new
"accepted files that drew a BBj Parser error" row (D-02).

**Report-writing pattern** (lines 90-138) — table/section helpers to extend, not rewrite:
```javascript
const section = (title, groups, max = 25) => {
    lines.push(`## ${title}`, '', '| Files | Group | Examples |', '|---|---|---|');
    for (const entry of groups.slice(0, max)) {
        lines.push(`| ${entry.count} | ${entry.name} | ${entry.examples.join('<br>')} |`);
    }
    lines.push('');
};
```
`summary.json`/`history.jsonl` are built as plain object literals (lines 80-88) — add an `endpoint`
key (host, port, failure count, BBj version if exposed) per D-15, not a new file.

---

### `bbj-corpus/conformance/worker.mts` (worker, batch + request-response)

**Analog:** itself, extended with an endpoint branch guarded by a 5th argv (per RESEARCH.md's
"Recommended worker.mts structure").

**Non-endpoint path stays untouched** (lines 8, 42 — the exact byte-identical guarantee D-01 requires):
```typescript
const [lsRepo, jobsFile, outFile, mode] = process.argv.slice(2);
...
if (mode === 'validate' && result.syntaxErrors === 0) {
    // hermetic-only validation — unchanged
}
```
Becomes `const [lsRepo, jobsFile, outFile, mode, endpoint] = process.argv.slice(2);` — the endpoint
branch only activates when `endpoint` is a non-empty string, and it must always call
`builder.build([document], { validation: true })` (not gated on `syntaxErrors === 0` — that guard is
the fake-interop-only rule per RESEARCH.md Pitfall 2).

**Import idiom** (lines 9-11) — absolute-path dynamic imports into the language server's own tree,
the pattern the endpoint branch's new imports must follow exactly:
```typescript
const vscode = `${lsRepo}/bbj-vscode`;
const { EmptyFileSystem, URI } = await import(`${vscode}/node_modules/langium/lib/index.js`);
const { createBBjTestServices } = await import(`${vscode}/test/bbj-test-module.ts`);
```

**Per-job try/catch + result shape** (lines 23-66) — the loop and result-writing contract the
endpoint branch's per-file processing must fit into (one `results[job.id] = {...}` per job, catch
wraps to `result.crash`):
```typescript
for (const [index, job] of jobs.entries()) {
    const text = readFileSync(job.file, 'utf8');
    const uri = URI.file(`/conformance/${process.pid}-${index}.bbj`);
    const started = Date.now();
    const result: Record<string, unknown> = {};
    try {
        // ... build, classify ...
    } catch (error) {
        result.crash = String(error).slice(0, 300);
    }
    result.ms = Date.now() - started;
    results[job.id] = result;
}
writeFileSync(outFile, JSON.stringify(results));
```

---

### Endpoint call + reconciliation shape (promote from scratch probe into `worker.mts`)

**Source (untracked scratch, promote — do not leave as the shipped analog per D-14):**
`bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts` (222 lines, git-untracked; its
origin is this phase's own promotion target, `bbj-corpus/conformance/worker.mts`, which IS tracked).

**Imports for the real endpoint side** (probe lines 26-37 — mirror verbatim into worker.mts's
endpoint branch):
```typescript
const { NodeFileSystem } = await import(`${vscode}/node_modules/langium/lib/node/index.js`);
const { createBBjServices } = await import(`${vscode}/src/language/bbj-module.ts`);
const { parseErrorsToDiagnostics } = await import(`${vscode}/src/language/bbj-parser-service.ts`);
const {
    reconcileWithVerdict,
    documentLineText,
    recallLangiumDiagnostics,
    isSyntaxComplaint
} = await import(`${vscode}/src/language/bbj-diagnostic-reconciliation.ts`);
const { applyDiagnosticHierarchy } = await import(`${vscode}/src/language/bbj-document-validator.ts`);
```

**One connection per shard, set up once** (probe lines 49-50):
```typescript
const bbjServices = createBBjServices(NodeFileSystem);
bbjServices.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
```

**Failure-kind duplication** (probe lines 58-70 — `classifyFailureKind` is module-private in
`bbj-parser-service.ts`, must be duplicated, per Claude's Discretion / RESEARCH.md "Don't Hand-Roll"):
```typescript
const APPLICATION_ERROR_KINDS: Record<number, string> = {
    [-33001]: 'parser-exception',
    [-33002]: 'timeout',
    [-33003]: 'size-cap',
    [-33004]: 'service-unavailable',
    [-33005]: 'protected-program',
};
const REQUEST_CANCELLED = -32800;
function classifyFailureKind(code: number | undefined): string {
    if (code === REQUEST_CANCELLED) return 'cancelled';
    if (code !== undefined && code in APPLICATION_ERROR_KINDS) return APPLICATION_ERROR_KINDS[code];
    return 'transport';
}
```

**Core per-file reconciliation call** (probe lines 74-121 — the exact call/reconcile/hierarchy
sequence D-01 requires, "none of the reconciliation is reimplemented"):
```typescript
await builder.build([document], { validation: true });
const raw: unknown[] = recallLangiumDiagnostics(document) ?? [];
const lineCount = document.textDocument.lineCount;
try {
    const result = await bbjServices.BBj.java.JavaInteropService.parseProgram({
        text, canonicalName, version, prefixes: [], workspaceRoots: []
    });
    const verdictDiagnostics = parseErrorsToDiagnostics(result.errors, lineCount, 20);
    const lineText = documentLineText(document.textDocument as any);
    const { diagnostics: reconciled } = reconcileWithVerdict(raw as any, verdictDiagnostics, lineText);
    hierarchyApplied = applyDiagnosticHierarchy(reconciled, true, 20);
} catch (e: any) {
    const code = e?.code as number | undefined;
    endpointOutcome = `failed:${classifyFailureKind(code)}`;
    hierarchyApplied = applyDiagnosticHierarchy(raw, true, 20); // D-04 fallback: no reconciliation
}
```

**Sanity check pattern** (probe lines 123-137 — RESEARCH.md flags this as "worth keeping verbatim",
run once before the full pass in each worker/shard):
```typescript
const checkDoc = factory.fromString('x = (1 + 2\n', checkUri);
documents.addDocument(checkDoc);
await builder.build([checkDoc], { validation: true });
const checkRaw = recallLangiumDiagnostics(checkDoc);
if (!checkRaw || checkRaw.length === 0) {
    console.error('FATAL: recallLangiumDiagnostics returned empty ... aborting before the full run.');
    process.exit(1);
}
```

---

### `bbj-corpus/README.md` §"Conformance of the language server" (docs, extend)

**Analog:** the section itself (lines 55-66):
```markdown
## Conformance of the language server

\`\`\`
cd conformance && npm install
node run.mjs --ls /path/to/bbj-language-server [--mode validate|parser] [--shards 6] [--limit 150]
\`\`\`

Runs the language server's parser and validators over `corpus/` and `rejects/` (about one minute) and writes `conformance/REPORT.md`, `summary.json`, `details.json` and one line per run to `history.jsonl`. It uses the language server's test module, so the Java interop service on port 5008 is never contacted. Linking errors and unresolvable `USE` files are ignored because they depend on the environment.

Three numbers to drive down: **A** valid code the parser rejects, **A2** valid code that gets a validation error, **B** invalid code that gets no error.

First run, language server `d8071b24`: A = 168 of 11,898 (1.4 %), A2 = 267 (2.2 %), B = 658 of 1,210 (54.4 %).
```
Extend with an `--endpoint host:port` line in the command block, a sentence on the prerequisite
(BBjServices with `parseProgram`, BBj 26.03+), expected runtime, and the raw-vs-reconciled column
meaning + zero-failure rule for gate runs (D-13). Follow the same terse, numbers-and-procedure tone
— no narrative padding.

---

### `bbj-corpus/conformance/.gitignore` (config)

**Analog:** itself (2 lines):
```
node_modules/
work/
```
Add `snapshots/` as a third line (D-14).

---

### `bbj-vscode/test/test-data/conformance/README.md` (new, this repo)

**Analog (tone/procedure-block style):** `bbj-corpus/README.md`'s own conformance section (above) —
short command block + prose, no corpus numbers. **Analog (no-corpus-content discipline):**
`104-CONFORMANCE.md`'s own opening line style (see below) and D-09's explicit constraints.

Content per D-09: what these `.bbj` files are (CONF-01 regression shapes, parsed by
`example-files.test.ts`), that the corpus measurement lives in the private `bbj-corpus` repo, the
command shape (`conformance/run.mjs --ls <this repo> [--endpoint host:port]`), local-only/never-CI,
and the BBj 26.03+ endpoint-mode prerequisite. No corpus numbers, file names, or content. Not linked
from the public docs site; `CLAUDE.md` is not touched.

---

### `.planning/phases/104-.../104-CONFORMANCE.md` (new, this repo)

**Analog:** `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONFORMANCE.md`
(full file, 124 lines) — same phase-boundary conformance-record genre, reuse its structure directly:

**Header/scope framing** (lines 1-8):
```markdown
# Phase 103 — Conformance Measurement

The phase-boundary working measurement the roadmap asks for (success criteria 3 and 4). ...
Only counts and own-words shape descriptions are recorded here — no corpus file name, no corpus
path, no corpus id, no corpus source line.
```

**Gate table pattern** (lines 24-30, 64-66) — the exact shape 104-CONFORMANCE.md's own gate table
should follow, now with raw AND reconciled columns per D-03 and D-15's "both runs" requirement:
```markdown
| Measure | Snapshot (before) | This run | File-set diff |
|---|---|---|---|
| A — valid code the language server rejects | 9 | 9 | left: 0, entered: 0 |
```
and
```markdown
| Measure | Milestone start | Endpoint absent (this phase) | Endpoint active (this run) | Target |
|---|---|---|---|---|
| B — invalid code not flagged, of 1,210 | 658 | 669 | **31 (2.6 %)** | ≤ 5 % (≤ 60 files) |
```

**Residual-group-in-own-words pattern** (lines 90-98) — the "own words, no ids" residual writeup
style 104-CONFORMANCE.md's A/A2 residual sections should copy:
```markdown
| Measure | Files | Note |
|---|---|---|
| Keeps a non-syntax validation Error (by design — semantic diagnostics stay visible) | **5** | The five non-line-break A2 message groups already on record for this corpus set (a field type/initializer mismatch, a misplaced `CASE DEFAULT`, `DECLARE` at class member level, a visibility check, an MKEYED-only option) — none of these is a syntax complaint... |
```

**"Caveat found, out of scope" pattern** (lines 100-111) — reuse directly for the D-11 todo mention
in 104-CONFORMANCE.md (link to the new pending todo instead of re-describing the exception in full).

**Closing self-scope note** (lines 113-120) — 103's own "what this is, and is not" footer; 104's
version should instead assert this IS the formal exit gate (opposite framing, same section shape).

---

### `.planning/PROJECT.md` (one-line pointer, D-10)

**Analog:** the "Key Decisions" table's existing row style (grep excerpt, one row per phase,
terminated with a phase/date tag):
```markdown
| v4.5 Phase 101: `bbj-ls` gains a `parseProgram` JSON-RPC request (...) | The endpoint is the server half of live compiler diagnostics (Phases 102/103) ... | ✓ Good — Phase 101, 2026-09-22; ... |
```
Add a one-line pointer (not a full table row necessarily — D-10 only asks for "next milestone
starts from" pointing at `104-CONFORMANCE.md`) in whatever section PROJECT.md uses for
milestone/phase closing pointers, following this file's existing terse, evidence-tagged tone. No
corpus numbers repeated here — the pointer references the file, not the figures.

---

### `.planning/todos/pending/<date>-checkusebeforeassignment-exception.md` (new, D-11)

**Analog:** `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md`
(full file, 102 lines) — frontmatter + `## Problem` / `## Investigation` / `## Reproduction` /
`## Fix options` shape:

**Frontmatter pattern** (lines 1-14):
```yaml
---
created: 2026-09-20
title: linking.test.ts "Interop related tests" fail even after a targeted class warm-up
area: testing
severity: minor
files:
  - bbj-vscode/test/linking.test.ts:295-452 (Interop related tests)
  - bbj-vscode/test/bbj-test-module.ts (JavaInteropTestService)
audit_acknowledged:
  milestone: v4.4
  at: 2026-09-20
---
```
For the D-11 todo: `files:` should point at
`bbj-vscode/src/language/validations/check-variable-scoping.ts` (the `getSymbolRefName`/
`checkUseBeforeAssignment` functions), `area: validation`, `severity: minor`, no
`audit_acknowledged` block yet (this is filed fresh, not carried from a prior milestone close).

**Section pattern** — `## Problem` (root-cause description with source citations, own words),
`## Investigation` (what was tried and refuted — RESEARCH.md already has this: the 13 negative probe
candidates), `## Reproduction` (a command if one exists — here there is none reproducible outside
the private corpus, so state that plainly instead of a shell command), `## Fix options for the next
investigator` (bulleted, concrete). RESEARCH.md's own "D-11 Todo" section already drafts this
content nearly verbatim — the todo file should transcribe it into this template, not redo the
investigation.

## Shared Patterns

### "No corpus content" discipline
**Source:** D-09/D-10 (104-CONTEXT.md) + `103-CONFORMANCE.md`'s own opening line and closing
sections.
**Apply to:** `104-CONFORMANCE.md`, `bbj-vscode/test/test-data/conformance/README.md`, the D-11 todo.
Never write a corpus file id, corpus path, or corpus source line into any file this phase commits to
`bbj-language-server`. Numbers and own-words shape descriptions only.

### Absolute-path dynamic import into the language server's own tree
**Source:** `bbj-corpus/conformance/worker.mts` lines 9-11, replicated in the (untracked) probe.
**Apply to:** `worker.mts`'s new endpoint branch. `tsx` executes `.ts`/`.mts` source directly from
the resolved `lsRepo` path — no build step, and `sourceModified` detection (`run.mjs` line 82) reads
`git status --porcelain -- bbj-vscode/src` on that same path at run time.

### Sequential per-shard endpoint dispatch (no `Promise.all` over a shard's own job list)
**Source:** RESEARCH.md's "Pattern: One connection per shard, sequential dispatch" section, derived
from `bbj-ls`'s `ParserWorker.java` per-connection design.
**Apply to:** `worker.mts`'s endpoint branch — a plain `for...of` + `await` loop per shard, one
`createBBjServices(NodeFileSystem)` + one `setConnectionConfig` call per shard process, never
concurrent requests on one connection.

### Additive-not-replacing report changes
**Source:** `run.mjs`'s existing `mode === 'validate'` conditional sections (lines 98-100, 119-122)
— the file already branches its own report content by mode.
**Apply to:** the endpoint-mode extension: add a raw/reconciled distinction and a new
"accepted files that drew a BBj Parser error" row without touching the non-endpoint code paths' own
output shape (D-01's byte-identical guarantee for the flag-off case).

## No Analog Found

None — every file in this phase's scope has a clear existing-code analog (either itself, being
modified in place, or a structurally close sibling document).

## Metadata

**Analog search scope:** `/home/coder/repos/bbj-corpus/conformance/`, `/home/coder/repos/bbj-corpus/README.md`,
`/home/coder/repos/bbj-language-server/.planning/phases/{98,103}-*/`, `/home/coder/repos/bbj-language-server/.planning/todos/pending/`,
`/home/coder/repos/bbj-language-server/bbj-vscode/test/test-data/conformance/`, `.planning/PROJECT.md`
**Files scanned:** 8 read in full (run.mjs, worker.mts, phase-103-endpoint-probe.mts, bbj-corpus README.md,
.gitignore, 103-CONFORMANCE.md, a pending todo, PROJECT.md excerpt) + 1 `git ls-files` tracked-status check
**Pattern extraction date:** 2026-09-23
**Tracked-source note:** `bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts` is
git-untracked (confirmed via `git ls-files`) — it is cited above only as content to *promote into*
the tracked `worker.mts`, never as a standalone analog path for the planner to point an executor at.
</content>
