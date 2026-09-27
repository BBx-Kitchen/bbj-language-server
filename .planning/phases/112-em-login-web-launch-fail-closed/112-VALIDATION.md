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
| (filled by planner) | — | — | SEC-12 | T-112 fail-open default creds | No default username; admin123 only for admin + empty password | source-guard | `npx vitest run test/web-bbj-source-guard.test.ts` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | SEC-13 | T-112 silent EM failure | Each guarded EM call has its own err= label → shared reporter, non-zero RELEASE, no secrets | source-guard + manual UAT | `npx vitest run test/web-bbj-source-guard.test.ts` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | SEC-14 | T-112 fail-open JWT | Malformed / unsigned / exp-less / non-integer exp → expired | unit | `npx vitest run test/em-token-validity.test.ts` | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | TEST-09 | — | Commands.cjs run/compile/runWeb/decompile bodies execute under vitest | unit (execution) | `npx vitest run test/commands-cjs-execution.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/em-token-validity.test.ts` — SEC-14 (D-09/D-10/D-11)
- [ ] `test/commands-cjs-harness.ts` — `module.registerHooks` loader with fake `vscode` + `.ts` fallback
- [ ] `test/commands-cjs-execution.test.ts` — TEST-09 (D-12/D-13/D-14), replaces the text-scan block in `test/config-path-consumers.test.ts`
- [ ] `test/web-bbj-source-guard.test.ts` — SEC-12/SEC-13 (D-15)
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
