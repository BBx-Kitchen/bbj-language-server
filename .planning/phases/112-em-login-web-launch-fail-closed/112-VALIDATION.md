---
phase: "112"
slug: "em-login-web-launch-fail-closed"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-27"
---

# Phase 112 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 (bbj-vscode); JUnit via Gradle (bbj-intellij, D-08 only) |
| **Config file** | `bbj-vscode/vitest.config.ts` (coverage `include` must be widened to reach `Commands.cjs`) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/em-token-validity.test.ts test/commands-cjs-execution.test.ts test/web-bbj-source-guard.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` |
| **Estimated runtime** | ~10 s quick, ~180 s full |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (plus the task's own test file)
- **After every plan wave:** Run the full suite command, judged on `numFailedTests` against the phase base
- **Before `/gsd-verify-work`:** Full suite green, plus the D-14 coverage run recorded
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 112-01-T1 | 112-01 | 1 | SEC-12 | T-112-01, T-112-06 | No default username; admin123 only for admin + empty password; login failures exit 1 | source-guard + bbjcpl syntax gate | `npx vitest run test/web-bbj-source-guard.test.ts`; `test -z "$(/opt/bbx/bin/bbjcpl -N …/tools/web.bbj 2>&1)"` | ❌ W0 | ⬜ pending |
| 112-01-T2 | 112-01 | 1 | SEC-13 | T-112-03, T-112-04 | Each guarded EM call has its own err= label → shared reporter, non-zero RELEASE, no secrets | source-guard + manual UAT | `npx vitest run test/web-bbj-source-guard.test.ts` | ❌ W0 | ⬜ pending |
| 112-02-T1 | 112-02 | 1 | SEC-14 | T-112-07, T-112-09 | Malformed / unsigned / exp-less → expired; stored token deleted, login prompt shown | unit + activation wiring | `npx vitest run test/em-token-validity.test.ts test/em-token-expiry-wiring.test.ts` | ❌ W0 | ⬜ pending |
| 112-02-T2 | 112-02 | 1 | SEC-14 | T-112-07, T-112-08 | All JwtValidityTest shapes incl. non-integer / overflow exp and strict base64url | unit | `npx vitest run test/em-token-validity.test.ts` | ❌ W0 | ⬜ pending |
| 112-03-T1 | 112-03 | 2 | SEC-12 | T-112-13, T-112-14 | VS Code login pre-fills last successful username (else admin); only the username stored, only after success | unit + activation-driven handler | `npx vitest run test/em-login-username.test.ts` | ❌ W0 | ⬜ pending |
| 112-03-T2 | 112-03 | 2 | SEC-12 | T-112-13, T-112-14 | IntelliJ login pre-fills last successful username (else admin) via PropertiesComponent | JUnit 5 unit + source guard | `./gradlew cleanTest test --tests '…EmUsernameMemoryTest' --tests '…EmLoginUsernameMemorySourceGuardTest'` | ❌ W0 | ⬜ pending |
| 112-04-T1 | 112-04 | 1 | TEST-09 | T-112-20, T-112-21 | Commands.cjs loads under vitest via registerHooks; run uses the resolved config path | unit (execution) | `npx vitest run test/commands-cjs-execution.test.ts` | ❌ W0 | ⬜ pending |
| 112-04-T2 | 112-04 | 1 | TEST-09, SEC-12 | T-112-17, T-112-18, T-112-19 | Show-config/run/runWeb execution tests replace text scans; no credentials → no web.bbj spawn | unit (execution) | `npx vitest run test/commands-cjs-execution.test.ts test/config-path-consumers.test.ts` | ❌ W0 | ⬜ pending |
| 112-04-T3 | 112-04 | 1 | TEST-09 | — | compile/decompile bodies execute; V8 coverage reports Commands.cjs (lines ≥ 70%) | unit (execution) + coverage run | `npx vitest run test/commands-cjs-execution.test.ts --coverage …` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/em-token-validity.test.ts` — SEC-14 (D-09/D-10/D-11)
- [ ] `test/commands-cjs-harness.ts` — `module.registerHooks` loader with fake `vscode` + `.ts` fallback
- [ ] `test/commands-cjs-execution.test.ts` — TEST-09 (D-12/D-13/D-14), replaces the text-scan block in `test/config-path-consumers.test.ts`
- [ ] `test/web-bbj-source-guard.test.ts` — SEC-12/SEC-13 (D-15)
- [ ] `test/em-token-expiry-wiring.test.ts` — SEC-14 call-site wiring through `activate()` (D-11)
- [ ] `test/em-login-username.test.ts` and IntelliJ `EmUsernameMemoryTest` / `EmLoginUsernameMemorySourceGuardTest` — SEC-12 (D-08)
- [ ] `vitest.config.ts` — widen `coverage.include` to cover `src/**/*.cjs`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| BUI and DWC launch with valid EM credentials from VS Code and IntelliJ | SEC-12, SEC-13 (criterion 5) | Needs a live BBj + EM and both IDEs | Build + install VSIX and IntelliJ zip; log in to EM; run a BUI and a DWC program from each IDE; both open in the browser |
| No credentials / EM stopped → login-failure or step MSGBOX and non-zero exit | SEC-12, SEC-13 | BBj process + EM required; no in-process BBj harness | Run web.bbj with empty username; stop EM and launch; confirm MSGBOX names the step and the IDE logs the exit code |
| Remembered username pre-fill | SEC-12 (D-08) | IDE UI | Log in as a non-admin user, re-trigger login in each IDE, confirm the prompt pre-fills that user |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
