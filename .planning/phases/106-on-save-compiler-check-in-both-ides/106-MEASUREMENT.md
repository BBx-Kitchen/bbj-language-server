# Phase 106 Measurement — On-Save Compiler Check in Both IDEs

Records the whole-suite gates, the build-artifact match, and a re-check of the Phase 105 live-diagnostics
timing (RESP-05, JINT-03) taken on the final Phase 106 tree, alongside the tester's hand-verification of
the on-save trigger, the IntelliJ setting, and the bbjcpl fallback dedup in both running IDEs.

## Metric

The time from the `textDocument/didChange` that introduces an invalid line — in a file opened while the
initial workspace build is still running — to the first `textDocument/publishDiagnostics` for that file
whose parameters contain a diagnostic with `source: "BBj Parser"`. Taken with the compiler trigger setting
at `debounced` (the default) in both IDEs, since typing starts no check at all under `on-save`. Same metric
as 105-MEASUREMENT.md, re-taken against this phase's final build only (no "before" leg — Phase 105 already
recorded before/after; this is a regression check that the live-parse-on-its-own-connection work in this
phase (JINT-03) did not regress the Phase 105 result).

## Environment

**This container (build side):**

- BBj: branch `26.10`, `FixedIssues.txt` report date 2026-09-22 (no separate version file found under the
  install root; this is the most specific build identifier available — same install as 105-MEASUREMENT.md).
- Shipped `bbj-ls.jar`: `/opt/bbx/.lib/bbjls/bbj-ls.jar`, 40889 bytes; its `bbj/interop/ParserCacheGuard.class`
  entry carries an internal timestamp of 2026-09-22 15:43 (same jar contents as 105-MEASUREMENT.md).
- Final commit (this build): (recorded by the tester's continuation plan from the resulting SUMMARY.md;
  see Task 3)
- Node.js (build/runtime): v24.20.0.
- Machine: 10 CPUs, 62 GiB RAM.

**SHA-256 of the two distributables:**

| File | SHA-256 |
|---|---|
| `/tmp/phase-106-uat/bbj-lang.vsix` | `7a7d05198a25b453c0b4826c983a7c8331ce5f09c22ddb3c3cd4630f41789436` |
| `/tmp/phase-106-uat/bbj-intellij-0.1.0.zip` | `3aff06d6c9d8d987f3f06144a15e3b59b18335a32071653116792768aa3300a1` |

The zip was verified to bundle the freshly built language server:
`unzip -p <zip> bbj-intellij/lib/language-server/main.cjs | cmp - bbj-vscode/out/language/main.cjs`
exited 0.

**Whole-suite gates (this build):**

- Whole vitest suite (`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`): `numFailedTests=0`,
  `numTotalTests=2671`. 35 test files were reported as failed suites with zero individually failing tests
  inside them — the project's documented "whole-suite hook timeouts are contention" pattern (STATE.md),
  not a regression.
- IntelliJ Gradle JUnit suite (`./gradlew test --rerun-tasks`): `BUILD SUCCESSFUL`, 1109 tests, 0 failures,
  0 skipped, 100% success.

**Tester's machine:** (filled by the tester's reply; see Hand-verification results)

- OS:
- VS Code version:
- IntelliJ product and version:
- LSP4IJ version:
- BBjServices version on the tester's machine:
- Any other client talking to port 5008 during measurement:

## Runbook

Same runbook as 105-MEASUREMENT.md's Runbook section, used unchanged, with this phase's build only (no
"before" leg). See `.planning/milestones/v4.5-phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-MEASUREMENT.md`
for the full step-by-step (install the build, turn on the LSP trace for that IDE, close every editor tab,
open the private large workspace, type an invalid line while the initial build is still running, read the
trace for T0/T1/TB, record T1 − T0, repeat for three samples per IDE restarting the IDE between samples).

**Never record** a corpus file name, a corpus file path below the workspace folder name, or any corpus
source text — only elapsed times, the timestamp resolution, and environment notes.

## Results

| IDE | Sample 1 (s) | Sample 2 (s) | Sample 3 (s) | Median (s) | 105 median for comparison |
|---|---|---|---|---|---|
| VS Code | | | | | 5.3 s |
| IntelliJ | | | | | 6 s |

(Filled by Task 3 from the tester's reply.)

## Hand-verification results

(Filled by Task 3, one line per UAT step 1-13 from the plan's Task 2, from the tester's reply.)
