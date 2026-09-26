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
- Final commit (this build): `a2071c45` (parent of the results commit; the `bbj-vscode/` and
  `bbj-intellij/` sources are unchanged since `6824b2ca`, so both distributables reflect that tree).
  See 106-07-SUMMARY.md.
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

**Tester's machine:**

- OS: macOS 27.0, Apple Silicon (aarch64), 16 cores.
- VS Code version: not reported.
- IntelliJ product and version: IntelliJ IDEA 2026.2.3 (IU-262.10968.63), JBR 25.0.4.
- LSP4IJ version: 0.21.0.
- Node.js: 22 (Homebrew `node@22`).
- BBjServices version on the tester's machine: not reported.
- Any other client talking to port 5008 during measurement: not reported.
- Test-environment note: during testing the JetBrains Marketplace downloaded BBj Language Support 0.16.5
  as a pending update; the session under test ran the plugin build 0.1.0 from this plan (see Evidence).

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
| VS Code | not taken | not taken | not taken | not taken | 5.3 s |
| IntelliJ | not taken | not taken | not taken | not taken | 6 s |

The timing re-check was not taken, at the user's decision after the checkpoint.

**Verdict — VS Code:** not taken — user decision; no regression evidence either way.

**Verdict — IntelliJ:** not taken — user decision; no regression evidence either way.

Notes:

- One message-level IntelliJ LSP4IJ trace (2026-09-24) showed about 5.3 s between the first edit and the
  first diagnostics update for a file opened during the initial build. The trace was not verbose (no
  message payloads), so the source of that update (whether it carried a `BBj Parser` diagnostic) could not
  be confirmed. It is not counted as a sample.
- Large-workspace observation from the same session: linking took about 24.9 s during the initial build,
  and queued requests waited 4-12 s. This is pre-existing behaviour, not introduced by this phase.

## Hand-verification results

The tester approved all 13 steps in both IDEs (reply: "approved").

- Step 1 (open a file with a syntax error: compiler error appears without saving): pass (tester approved)
- Step 2 (typing a new invalid line starts no check; the language server's own error appears): pass (tester approved)
- Step 3 (inserted lines above: the compiler error moves with its line): pass (tester approved)
- Step 4 (fix without saving keeps the error; save runs one check at once and clears it): pass (tester approved)
- Step 5 (deleting the erroneous line removes its compiler error): pass (tester approved)
- Step 6 (save with no change runs exactly one check): pass (tester approved)
- Step 7 (switch to debounced: no check at the switch, typing checks after about 500 ms; off clears the errors): pass (tester approved)
- Step 8 (auto-save after delay with on-save: one check per auto-save): pass (tester approved)
- Step 9 (BBjServices stopped: one `BBjCPL` error per line, other lines still shown): pass (tester approved)
- Step 10 (setting descriptions match the observed behaviour; on-save recommended for large workspaces): pass (tester approved)
- Step 11 (IntelliJ "Compiler check:" setting under BBj Compiler; Apply restarts the server; steps 1-5 in IntelliJ): pass (tester approved). Log evidence: each Settings Apply scheduled a server restart in 500 ms; each `didSave` produced one `publishDiagnostics` for the file (see Evidence).
- Step 12 (On save persists after reopening Settings and after an IDE restart): pass (tester approved)
- Step 13 (both feature docs describe the three modes as observed): pass (tester approved)

### Evidence from the tester's logs

Source: IntelliJ `idea.log` and an LSP4IJ message-level trace, 2026-09-24.

- The IDE loaded the test plugin build 0.1.0, and the language server reported v0.16.4 (matching
  `bbj-vscode/package.json`).
- Each Settings Apply scheduled a language-server restart in 500 ms (confirms "Apply restarts the server"
  in step 11).
- Each `textDocument/didSave` in the trace was followed shortly by a single
  `textDocument/publishDiagnostics` for that file, plus one more after `workspace/didChangeWatchedFiles`;
  no duplicate bursts.
- One restart logged "Timed out after 5000 ms waiting for the BBj language server to stop; starting
  anyway", with an LSP4IJ `TimeoutException` during shutdown. The server came back. This is the known
  upstream LSP4IJ shutdown issue #1672, not a behaviour of this phase.
- No VS Code trace was supplied; the VS Code steps rest on the tester's approval.
