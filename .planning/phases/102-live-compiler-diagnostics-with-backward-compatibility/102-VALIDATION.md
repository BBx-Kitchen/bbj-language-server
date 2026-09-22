---
phase: "102"
slug: "live-compiler-diagnostics-with-backward-compatibility"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 102-01-01 | 01 | 1 | PSRV-04 | T-102-01 / — | Old-server double: no live diagnostic, `bbjcpl` path untouched, one "off" log line, no error | integration (hermetic double) | `npx vitest run test/bbj-parser-service.test.ts -t "PSRV-04"` | ❌ W0 | ⬜ pending |
| 102-01-02 | 01 | 1 | PSRV-03 | — | Scripted result list becomes Error diagnostics with source `BBj Parser` | integration (hermetic double) | `npx vitest run test/bbj-parser-service.test.ts -t "publishes a live diagnostic"` | ❌ W0 | ⬜ pending |
| 102-01-03 | 01 | 1 | PSRV-08 | T-102-02 / — | `-3300x`, transport and malformed failures never become a diagnostic; first at warn, repeats at debug | unit (scripted double, log spy) | `npx vitest run test/bbj-parser-service.test.ts -t "never a diagnostic"` | ❌ W0 | ⬜ pending |
| 102-01-04 | 01 | 1 | PSRV-09 | — | Exactly one mode log line per connection; reset on new connection and `clearCache()` | unit (log spy) | `npx vitest run test/bbj-parser-service.test.ts -t "logs the mode exactly once"` | ❌ W0 | ⬜ pending |
| 102-02-01 | 02 | 1 | PSRV-05 | — | One-based → zero-based ranges for colon continuation, user line numbers, CRLF, no trailing newline; D-11 clamping | unit (hand-written DTO fixtures) | `npx vitest run test/parser-coordinate-converter.test.ts` | ❌ W0 | ⬜ pending |
| 102-03-01 | 03 | 2 | PSRV-05 | — | Same four fixtures against the real endpoint | integration (`RUN_BBJ_TESTS`-gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` | ❌ W0 | ⬜ pending |
| 102-03-02 | 03 | 2 | PSRV-09 | — | Docs of both extensions state BBj 26.03 or later | source assertion | `grep -c '26.03' documentation/docs/vscode/getting-started.md documentation/docs/intellij/getting-started.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*The planner re-maps rows to the final plan/task ids; the table above is the strategy seed from RESEARCH.md § Validation Architecture.*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/bbj-parser-service.test.ts` — PSRV-03, PSRV-04, PSRV-08, PSRV-09 (probe/latch, per-connection reset, failure-cadence logging, hermetic double scripting)
- [ ] `bbj-vscode/test/parser-coordinate-converter.test.ts` — PSRV-05 (hand-written `ParseError` DTO fixtures, D-11 clamping cases)
- [ ] `bbj-vscode/test/functional/parse-program-live.test.ts` — PSRV-05 live confirmatory check, `RUN_BBJ_TESTS`-gated
- [ ] `bbj-vscode/test/bbj-test-module.ts` — extend `JavaInteropTestService` with the scriptable `parseProgram()` override (D-14); shared fixture infrastructure every test above depends on
- Framework install: none — Vitest is already installed and configured

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live errors appear while typing in VS Code and in IntelliJ | PSRV-03 | Needs both IDEs against the running BBjServices with the Phase 101 jar | Build + install VSIX and IntelliJ zip; open a `.bbj` file, type an invalid line, watch the `BBj Parser` diagnostic appear without saving |
| Both extensions behave as 0.16.x against a pre-endpoint `bbj-ls` | PSRV-04 | Needs the backed-up 26.02 jar swapped into `/opt/bbx/.lib/bbjls/` and BBjServices restarted | Swap jar, restart, open a `.bbj` file in each IDE: Java completion works, save runs `bbjcpl`, no dialog, server log shows one "off" line; swap back afterwards |
| Server log states the mode once per connection | PSRV-09 | Log inspection | Open the language-server output channel / idea.log; count the mode line after connect and after "Refresh Java classes" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
