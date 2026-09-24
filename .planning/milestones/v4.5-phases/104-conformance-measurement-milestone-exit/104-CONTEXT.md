# Phase 104: Conformance Measurement & Milestone Exit - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase measures the milestone's result, makes the measurement repeatable, and writes it down. It does
not change how the language server behaves. It delivers four things:

1. The private `bbj-corpus` conformance harness (`conformance/run.mjs`, `worker.mts`) gets an
   endpoint mode. The run then includes the verdicts of the real `bbj-ls` `parseProgram` endpoint and
   reports list B with them (CONF-02).
2. The closing measurement on the existing corpus build: **A ≤ 25, A2 ≤ 25, B ≤ 5 % of 1,210**
   with the endpoint active (CONF-03). The milestone started at A = 168, A2 = 267, B = 54.4 %.
3. Every existing test suite is green on the final tree: `bbj-vscode` vitest and the IntelliJ Gradle
   suite.
4. The result and the residual entries are recorded for the next milestone, and a maintainer pointer
   exists in this repo. Neither contains corpus content or proprietary BBj source text.

Where things stand at discussion time: with the endpoint off (fake interop), A = 9, A2 = 22 and B = 669.
Phase 103's scratch probe, with the endpoint on, measured B = 31 of 1,210 (2.6 %), and no
compiler-accepted file kept a language-server syntax error. The gates are already met in substance.
This phase turns that into the harness's own repeatable, recorded measurement.

</domain>

<decisions>
## Implementation Decisions

### Harness endpoint mode (bbj-corpus)
- **D-01:** **Endpoint mode is a flag on the existing harness**, not a separate script:
  `run.mjs --ls <repo> --endpoint <host>:<port>`, passed through to `worker.mts`. With the flag,
  each file goes through the same path as the Phase 103 probe
  (`bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts`). The file is built with validation
  on the hermetic fake-interop services, then the real `JavaInteropService.parseProgram()` is asked,
  then the product's own `reconcileWithVerdict` + `applyDiagnosticHierarchy` run. None of the
  reconciliation is reimplemented. Without the flag, the harness behaves exactly as today, byte for
  byte in its classification.
- **D-02:** **Every file goes to the endpoint:** all 11,898 accepted corpus files and all 1,210
  rejects, not only the ~1,241 the probe covered. This is the only way to catch the endpoint flagging
  code the compiler accepts anywhere in the corpus. The report adds a row for "accepted files that drew
  a BBj Parser error" (endpoint/compiler disagreement). The run will take much longer than the
  one-minute fake-interop run. That is accepted.
- **D-03:** **Report both views, and gate on the matching one.** In endpoint mode, REPORT.md and
  summary.json show Langium's own A and A2 (raw, the same meaning as the 168/267 baseline) *and* the
  reconciled view, meaning what the user sees once a verdict exists. The exit gate checks **A and A2 on
  the raw numbers** (stricter, and comparable with the baseline) and **B on the reconciled numbers**,
  which is what CONF-02/03 ask for.
- **D-04:** **An endpoint failure falls back per file and is counted.** When a call fails (timeout,
  unavailable, size cap, transport, malformed result), that file is classified the way the product
  handles a failed cycle: Langium's diagnostics stay unchanged, with no reconciliation. The failure
  count and kinds are reported in REPORT.md and summary.json. **The exit-gate run counts only if it
  has 0 endpoint failures.**

### Final tree & test gate
- **D-05:** **The closing measurement runs last, on the branch HEAD.** That is the PR #691 branch
  (`gsd/phase-103-one-set-of-errors-diagnostic-reconciliation`, phases 98-105 on top of origin/main),
  measured after every other Phase 104 commit in this repo, so the harness records
  `sourceModified: false`. The corpus build is used as it is (compiler build of September 1 2026,
  11,898 accepted, 1,210 rejects); it is not rebuilt.
- **D-06:** **"Green" means no new failures against the base.**
  - A `bbj-vscode` whole-suite run with :5008 up. `numFailedTests` may contain only the named, known
    env-drift tests (the linking.test.ts interop block and the issue447 capability test). The same
    test names must fail on origin/main in a scratch worktree with Node 22. Compare by test name, not
    by count.
  - A `bbj-vscode` run with interop unreachable (what CI sees): exactly 0 failures.
  - IntelliJ `./gradlew test` in `bbj-intellij`: 0 failures.
  - This covers all CONF-01 synthetic regression files (98-100) and Phase 100's `examples/`
    assertions, because they are part of those suites.
- **D-07:** **Build both distributables from the final tree, with no hand UAT.** The VSIX and the
  IntelliJ zip are built as a smoke check (Gradle needs `bbj-vscode/out/language/main.cjs` anyway).
  Phase 104 changes no IDE behaviour, so there is no hand UAT.
- **D-08:** **Push the branch and update the PR #691 description** with the exit numbers and a
  104 summary. Before that, scan every branch commit body for closing keywords (`Closes #`, `fixes #`,
  …), because the repo squash-merges. Merging the PR and completing the milestone
  (`/gsd-complete-milestone`) stay with the user.

### Where the record lives (this repo)
- **D-09:** **The maintainer pointer is a README next to the regression files:**
  `bbj-vscode/test/test-data/conformance/README.md`. It says what those files are (CONF-01
  regression shapes, parsed by `example-files.test.ts`) and that the corpus measurement lives in the
  private `bbj-corpus` repository. It gives the command shape (`conformance/run.mjs --ls <this repo>
  [--endpoint host:port]`), notes the run is local only and never in CI, and notes endpoint mode needs
  a BBj 26.03+ BBjServices. It holds no corpus numbers, file names or content. It does not go on the
  public docs site, and CLAUDE.md is not changed. The full procedure lives in the corpus repo's README
  (D-13).
- **D-10:** **The result is recorded in `104-CONFORMANCE.md` plus a pointer in PROJECT.md.** The phase
  record holds:
  - the gate table, both runs (D-15) and the raw and reconciled views;
  - each residual list-A / A2 group, described in our own words with the reason it remains;
  - the residual B misses and why they remain (expected to be semantic-only rejects the syntax-only
    endpoint cannot see, with save-time `bbjcpl` as the authority);
  - the endpoint failure count.

  No corpus ids, paths or source lines go in it. PROJECT.md gets a one-line "next milestone starts
  from" pointer to it. File ids stay in the corpus repo's REPORT.md and details.json only. No
  per-residual todos or seeds are created.
- **D-11:** **Phase 103's caveat becomes a todo and is not fixed here.** During the 103 run,
  `check-variable-scoping.ts`'s `checkUseBeforeAssignment` threw an exception on 2 reject files
  (`getSymbolRefName` reading a property of an undefined reference). Langium catches it, so that check
  is silently skipped for those files. File a pending todo with a synthetic repro shape, which the
  researcher or executor derives from the construct in their own words, with no corpus text. Mention
  the todo in 104-CONFORMANCE.md.

### Corpus repo housekeeping (bbj-corpus, local-only, no remote)
- **D-12:** **Commit in bbj-corpus:** the `run.mjs`/`worker.mts` endpoint mode, the README's
  endpoint-mode section, and the closing run's `REPORT.md`, `summary.json`, `details.json` and
  `history.jsonl`. This also takes in the result files from the 98-103 runs, which are currently
  uncommitted. Stage by exact path only. **`eval/` belongs to another project and must never be
  touched or staged.** There is no push, because the repo has no remote.
- **D-13:** **README in the corpus repo:** extend its existing "Conformance of the language server"
  section with endpoint mode. Cover the flag, the prerequisite (BBjServices with the `parseProgram`
  endpoint, BBj 26.03+), the expected runtime, the raw vs reconciled columns, and the zero-failure rule
  for gate runs.
- **D-14:** **`snapshots/` stays untracked scratch** and is added to the corpus `.gitignore`. Delete
  `snapshots/phase-103-endpoint-probe.mts` (and its `.json` output) once the harness's endpoint mode has
  reproduced the probe's B figure, since the flag supersedes it.
- **D-15:** **One history file, tagged by mode.** Endpoint-mode runs append to the same
  `history.jsonl` with an `endpoint` field (host, port, failure count, plus the BBj version if the
  endpoint exposes one). REPORT.md states the mode in its header line. **The closing measurement records
  both runs**, endpoint off (continuing the fake-interop series) and endpoint on (the gate run), each
  preceded by a `details.json` snapshot, with file sets compared rather than totals.

### Claude's Discretion
- **Concurrency in endpoint mode:** shards with one endpoint connection each, or sequential calls.
  Choose whatever is reliable against one BBjServices. 0 failures (D-04) matters more than speed. Phase
  105's separate parse lane already exists on the interop side.
- **Validation always runs in endpoint mode.** The product validates every open document, even one
  with a syntax error, and the probe did the same. The fake-interop mode keeps its current rule
  (validate only when there are no syntax errors) so that its series stays comparable. The planner
  confirms this and states it in the README.
- **The exact field names** in summary.json, history.jsonl and the REPORT.md layout for the raw vs
  reconciled columns and the disagreement row.
- **The classification helpers the probe duplicated** (the failure-kind map, because
  `bbj-parser-service.ts` does not export it). The harness may duplicate them, or import them if they
  are already exported. **Do not add exports to the language server only for the harness**, because
  that would change `bbj-vscode/src` and flip `sourceModified`. If an export is truly needed, it must
  land before the closing run (D-05).
- **Plan split.** The obvious default:
  1. The harness endpoint mode, the README and a sample run that reproduces the probe.
  2. The test gate (both vitest runs, the base comparison, Gradle, both builds) and the regression-dir
     README.
  3. The closing measurement (both runs), 104-CONFORMANCE.md, the PROJECT.md pointer, the todo, the
     corpus commits, cleanup, the push and the PR body.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and gates
- `.planning/ROADMAP.md` §"Phase 104: Conformance Measurement & Milestone Exit" — goal, 4 success criteria, and the ordering note (local and manual, never CI)
- `.planning/ROADMAP.md` §v4.5 preamble — "Measurement is local, never CI", CONF-01 rule, "No proprietary BBj source text enters this repository"
- `.planning/REQUIREMENTS.md` — CONF-02, CONF-03 (and CONF-01 for the regression-file convention)

### Prior measurements to reproduce and extend
- `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONFORMANCE.md` — the endpoint-active probe method, numbers (B = 31, 0 failures, 0 surviving syntax errors on accepted files), classification rules, and the checkUseBeforeAssignment caveat
- `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONTEXT.md` — D-04..D-10 (what "syntax complaint", downgrade and replace mean; downgraded warnings keep Langium's `source`)
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md` — the earlier phase-boundary conformance record format and the snapshot / file-set-diff discipline

### Harness (private repo, outside this one)
- `/home/coder/repos/bbj-corpus/conformance/run.mjs` — orchestrator: sharding, classification (A, A2, B, syntax/semantic reject kind), REPORT/summary/details/history writing
- `/home/coder/repos/bbj-corpus/conformance/worker.mts` — per-shard Langium run on `createBBjTestServices(EmptyFileSystem)`; linking and `File … could not be resolved` exclusions
- `/home/coder/repos/bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts` — the probe to promote into endpoint mode (then delete, D-14)
- `/home/coder/repos/bbj-corpus/README.md` §"Conformance of the language server" — the procedure to extend (D-13)

### Language-server code the harness calls (read only; do not change)
- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` — `reconcileWithVerdict`, `recallLangiumDiagnostics`, `isSyntaxComplaint`, `documentLineText`, `DOWNGRADED_SYNTAX_CODE`, `LINE_BREAK_DIAGNOSTIC_CODE`
- `bbj-vscode/src/language/bbj-document-validator.ts` — `applyDiagnosticHierarchy`
- `bbj-vscode/src/language/bbj-parser-service.ts` — `parseErrorsToDiagnostics`, failure-kind classification (not exported)
- `bbj-vscode/src/language/java-interop.ts` — `parseProgram`, `setConnectionConfig`, parse lane (Phase 105)
- `bbj-vscode/test/bbj-test-module.ts` — `createBBjTestServices` (the fake interop double)

### Test gate
- `bbj-vscode/test/example-files.test.ts` + `bbj-vscode/test/test-data/conformance/` — the CONF-01 regression files (19 today); the new README goes in this directory
- `bbj-vscode/test/examples-compile.test.ts` — Phase 100's `examples/` assertions
- `bbj-vscode/test/linking.test.ts` (Interop block) and the issue447 capability test — known env-drift failures with :5008 up
- `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md` — the known-failure description (not folded)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The Phase 103 probe** already has the endpoint path working end to end: the import set,
  `createBBjServices(NodeFileSystem)` plus `setConnectionConfig('127.0.0.1', 5008)` for the real side,
  the fake services for Langium's side, the failure-kind classifier, and a sanity check that
  `recallLangiumDiagnostics` is non-empty for a known-bad fixture. Promote it rather than rewrite it.
- **`run.mjs`'s classification** (`caughtBy`, `isSyntaxReject`, `group`, `firstWord`) already produces
  every table the report needs. Endpoint mode adds columns, not new logic.

### Established Patterns
- **Worker imports use absolute paths** into the language-server repo, and tsx runs `.ts` source
  directly. That is why `sourceModified` is read from `bbj-vscode/src` at run time.
- **Record hygiene:** numbers, and shape descriptions in our own words, only. File ids stay in the
  corpus repo (98-103 CONFORMANCE.md files all follow this).
- **Snapshot before every full run**, then diff file sets. Totals hid real movement in phase 98 and 99.
- **The regression gate compares against the base commit** in a scratch worktree with Node 22
  (Node 24 breaks `langium:generate`). Executors have mislabelled real failures as "env noise"
  before.
- **vitest cwd must be `bbj-vscode`** (`npm --prefix … test` or `cd …/bbj-vscode && npx vitest run`).
  Whole-suite hook timeouts under contention are not failures; judge on `numFailedTests` and use
  `--maxWorkers=2`.

### Integration Points
- The harness runs as `bbj-corpus/conformance/node_modules/.bin/tsx`, which reads the language
  server's working tree, so no build of `bbj-vscode` is needed for the corpus run.
- The endpoint is BBjServices on :5008 in the dev container. It ships its own `bbj-ls.jar` with
  `parseProgram`.

</code_context>

<specifics>
## Specific Ideas

- The closing record should show the milestone arc in one table: start (168 / 267 / 54.4 %), each
  phase boundary where it was measured, endpoint-off final and endpoint-on final.
- Residual B is expected to be semantic-only (undefined labels or functions and similar), which the
  syntax-only endpoint cannot see by design. Say so explicitly, so the next milestone does not treat it
  as a parser gap.

</specifics>

<deferred>
## Deferred Ideas

- The `checkUseBeforeAssignment` exception on 2 reject shapes becomes a pending todo (D-11). It is
  not fixed in this phase.

### Reviewed Todos (not folded)
- `2026-09-20-linking-interop-failures-survive-class-warmup.md`: not folded. It is handled by the
  D-06 "no new failures vs base" gate instead.
- `2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md`: not folded and stale for the gate
  (A2 is already 22 ≤ 25). The remaining IF-shaped A2 files are listed as residuals in
  104-CONFORMANCE.md.
- `2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md`,
  `2026-09-20-phase-97-code-review-follow-ups.md`,
  `2026-09-20-status-transition-log-prints-a-stale-previous-status.md`: IntelliJ lifecycle items,
  unrelated.
- `2026-09-23-live-parse-waits-on-shared-connection-breaker.md`: java-interop behaviour, not
  measurement. It is out of scope.

</deferred>

---

*Phase: 104-conformance-measurement-milestone-exit*
*Context gathered: 2026-09-23*
