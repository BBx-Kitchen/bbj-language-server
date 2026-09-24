---
phase: "102"
slug: "live-compiler-diagnostics-with-backward-compatibility"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
validated: "2026-09-22"
created: "2026-09-22"
---

# Phase 102 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.10` (already installed, `bbj-vscode/package.json` devDependencies) |
| **Config file** | none dedicated — `npx vitest run <file>` from `bbj-vscode/` (cwd must be `bbj-vscode/`, per CLAUDE.md) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/bbj-parser-service.test.ts test/parser-coordinate-converter.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (judge on `numFailedTests: 0`; known local baseline: 11 `linking.test.ts` interop tests + `issue447`, env drift) |
| **Estimated runtime** | ~10 seconds (quick) / ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/bbj-parser-service.test.ts test/parser-coordinate-converter.test.ts`
- **After every plan wave:** Run `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (`RUN_BBJ_TESTS` unset)
- **Before `/gsd-verify-work`:** Full suite must be green, plus one run of `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` against the live endpoint on 127.0.0.1:5008
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 102-01-01 | 01 | 1 | PSRV-03 | T-102-01 | A scripted parser error becomes one Error diagnostic with the live parser source, BBj's message verbatim, joined categories as its code, and a range bounded by the end-of-line sentinel | integration (hermetic double, real document builder) | `npx vitest run test/bbj-parser-service.test.ts -t "publishes a live diagnostic"` | ✅ | ✅ green |
| 102-01-02 | 01 | 1 | PSRV-04 | — | Default old-server double: no live diagnostic, one request only, save-time compile still invoked, one off-mode log line, no error; a simulated reconnect re-probes | integration (hermetic double) | `npx vitest run test/bbj-parser-service.test.ts -t "an older server"` | ✅ | ✅ green |
| 102-01-02 | 01 | 1 | PSRV-09 | — | Exactly one mode log line per connection generation, across two documents | unit (logger spy) | `npx vitest run test/bbj-parser-service.test.ts -t "logs the mode once per connection"` | ✅ | ✅ green |
| 102-01-03 | 01 | 1 | PSRV-08 | T-102-02, T-102-03 | Five application codes, a transport failure and a malformed result each yield zero diagnostics and one log line at the right level; a cancellation yields silence; no log line carries the document text | unit/integration (scripted double, logger spies) | `npx vitest run test/bbj-parser-service.test.ts -t "never becomes a diagnostic"` | ✅ | ✅ green |
| 102-02-01 | 02 | 2 | PSRV-05 | T-102-06, T-102-07 | The existing diagnostics setting caps the live errors per document, in the parser's own order, applied to the records before conversion | integration (hermetic double) | `npx vitest run test/bbj-parser-service.test.ts -t "caps the live errors"` | ✅ | ✅ green |
| 102-02-02 | 02 | 2 | PSRV-05 | T-102-01 | Colon continuation, user line numbers, CRLF and no-final-newline land on the right zero-based line; out-of-range, inverted and zero-start ranges clamp and are never dropped; no range exceeds the LSP unsigned-integer bound | unit (hand-written typed DTO fixtures) | `npx vitest run test/parser-coordinate-converter.test.ts` | ✅ | ✅ green |
| 102-03-01 | 03 | 3 | PSRV-05 | — | The same four invented documents plus a clean-program control against the real endpoint; skipped, never failed, when the gate is closed | integration (`RUN_BBJ_TESTS`-gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` | ✅ | ✅ green |
| 102-03-02 | 03 | 3 | PSRV-09 | T-102-09 | The VS Code guide states BBj 26.03 or later, keeps the 25.00 base prerequisite, and names the existing compiler trigger setting | source assertion | `grep -c '26\.03' documentation/docs/vscode/getting-started.md documentation/docs/vscode/index.md documentation/docs/vscode/features.md` | ✅ | ✅ green |
| 102-03-03 | 03 | 3 | PSRV-09 | T-102-09 | The IntelliJ guide says the same three things, and no IntelliJ plugin source changed | source assertion | `grep -c '26\.03' documentation/docs/intellij/getting-started.md documentation/docs/intellij/index.md documentation/docs/intellij/features.md` | ✅ | ✅ green |
| 102-04-01 | 04 | 4 | PSRV-03, PSRV-09 | — | Both distributables built from the final tree; the endpoint-present hand check is staged for the end-of-phase verifier | build + `<human-check>` | `cd bbj-vscode && npm run build` · `cd bbj-intellij && ./gradlew buildPlugin` | ✅ | ✅ green |
| 102-04-02 | 04 | 4 | PSRV-04, PSRV-09 | T-102-12 | The endpoint jar is backed up outside the load directory, the directory holds exactly two jars, and the older-server replay plus restore is staged verbatim for the tester | CLI assertion + `<human-check>` | `ls -l /opt/bbx/.lib/bbjls/ /opt/bbx/.lib/bbjls-backup/` | ✅ | ✅ green |
| 102-04-03 | 04 | 4 | PSRV-03, PSRV-04, PSRV-09 | T-102-11, T-102-13 | Whole suite green against the documented baseline; no planning identifier in any added source, test or doc line; no closing keyword in any commit body; branch pushed and pull request open | CLI assertion | `cd bbj-vscode && npm test -- --maxWorkers=2` · branch-diff register check | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Re-mapped from the RESEARCH.md strategy seed to the final plan/task ids. Note the test-selector
change: the seed used requirement ids as `-t` selectors, which would have put planning identifiers
into shipped test names — every selector above is a behaviour phrase instead.*

---

## Wave 0 Requirements

- [x] `bbj-vscode/test/bbj-test-module.ts` — `JavaInteropTestService` exported and given a scriptable
      `parseProgram()` plus `simulateReconnect()`; shared fixture infrastructure every test below
      depends on (plan 01 task 1)
- [x] `bbj-vscode/test/bbj-parser-service.test.ts` — PSRV-03, PSRV-04, PSRV-08, PSRV-09 and the cap:
      probe/latch, per-connection reset, failure cadence, same-line coexistence, idempotency
      (plan 01 tasks 1-3, plan 02 task 1)
- [x] `bbj-vscode/test/parser-coordinate-converter.test.ts` — PSRV-05 and the clamp-never-drop cases
      (plan 02 task 2)
- [x] `bbj-vscode/test/functional/parse-program-live.test.ts` — PSRV-05's live confirmation plus a
      clean-program control, `RUN_BBJ_TESTS`-gated (plan 03 task 1)
- Framework install: none — Vitest is already installed and configured

---

## Manual-Only Verifications

`workflow.human_verify_mode` resolves to `end-of-phase`, so these are staged as `<verify><human-check>`
blocks inside plan 04's `auto` tasks rather than as mid-flight checkpoints; the verifier harvests them
into `102-UAT.md`.

| Behavior | Requirement | Plan · Task | Why Manual | Test Instructions |
|----------|-------------|-------------|------------|-------------------|
| Live errors appear while typing, without saving, in VS Code and in IntelliJ | PSRV-03 | 04 · 1 | Needs both IDEs against the running BBjServices with the phase-101 jar | Build and install both distributables from the final tree; enable the BBj debug setting; open a `.bbj` file, type an invalid line, watch the live parser diagnostic appear without a save; hover it and read its source and code |
| Both extensions behave as 0.16.x against a pre-endpoint `bbj-ls` | PSRV-04 | 04 · 2 | Needs the backed-up 26.02 jar swapped into `/opt/bbx/.lib/bbjls/` and BBjServices restarted | Follow plan 04 task 2's 16-step procedure verbatim: swap, reload both IDEs, confirm Java completion and the save-time check still work, confirm no live diagnostic and no dialog, count the off-mode log line, then restore and confirm live diagnostics return |
| The server log states the mode once per connection | PSRV-09 | 04 · 1 and 04 · 2 | Log inspection in two IDEs | The mode line is emitted at info level and the server's level is warn unless the BBj debug setting is on — enable it first, then count the line in the output channel and in `idea.log` after connect, and again after the jar swap re-establishes the connection |
| Live and save-time diagnostics overlapping on one line | — | 04 · 1 | Expected in this phase, reconciled in the next | Two diagnostics on one line after a save is CORRECT here — the tester must not file it |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-22

---

## Validation Audit 2026-09-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence, run on HEAD `37ecb3d8`:

- **Hermetic:** `test/bbj-parser-service.test.ts`, `test/parser-coordinate-converter.test.ts` and `test/document-builder.test.ts` (which holds the source-relabel regression from the review-fix round) pass 45/45.
- **Live:** `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` against 127.0.0.1:5008 passes 5/5 (four coordinate shapes plus the clean-program control).
- **Docs:** all six guide pages carry `26.03`. Both getting-started pages keep the `25.00` base prerequisite, and both features pages name `bbj.compiler.trigger`. `bbj-intellij/src` is unchanged since phase start.
- **Jars:** `/opt/bbx/.lib/bbjls/` holds exactly two jars. `/opt/bbx/.lib/bbjls-backup/` holds the 26.02 and endpoint jars.
- **Whole suite** (`--maxWorkers=2`): 2425 of 2460 tests pass, with `numFailedTests: 11`. These are exactly the documented `linking.test.ts` interop baseline (env drift). The failed suites (`hover`, `lazy-prefix-loading`, `linking`, `installed-extension-e2e`) have no failing assertions: they are `beforeAll` contention timeouts. `hover` and `lazy-prefix-loading` pass 18/18 when run alone.
- **Manual-only rows:** covered by `102-UAT.md`'s re-test round (20/20, both IDEs).
- **Known residue, not a gap:** a concurrent debounce cycle can still relabel a live diagnostic. `102-VERIFICATION.md` records it as deferred, and Phase 105 criterion 3 owns it.
