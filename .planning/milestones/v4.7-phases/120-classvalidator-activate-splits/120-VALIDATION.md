---
phase: "120"
slug: "classvalidator-activate-splits"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-29"
---

# Phase 120 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <files touched by the task>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (failed-name set diffed against the phase base) |
| **Estimated runtime** | ~30 s targeted, ~300 s full suite |

---

## Sampling Rate

- **After every task commit:** run the targeted files for that task
- **After every plan wave:** run the full suite and `comm -13` its failed-name list against the base list
- **Before `/gsd-verify-work`:** full suite shows no new failed names against the base; lint and typecheck:test pass
- **Max feedback latency:** 60 seconds (targeted)

Baseline at HEAD `fd3d75ef`: the 15 load-bearing files (`class-validations-issues`, `inheritance-cycle-validation`, `extension-activation`, `em-token-expiry-wiring`, `em-login-username`, `commands-cjs-execution`, `process-runner`, `decompile-io`, `no-shell-command-construction`, `target-resolution`, `em-secret-env-channel`, `setopts-in-code-ui`, `composer-cue-single-source`, `config-reload-host`, `em-properties-reader-guard`) give 262 passed, 1 skipped, 0 failed.

---

## Per-Task Verification Map

Filled in by the planner and executors. The requirement-to-test map it draws on:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| REF-10 | Class-reference/visibility and constructor diagnostics identical | integration | `npx vitest run test/class-validations-issues.test.ts` | ✅ | ⬜ pending |
| REF-10 | Cyclic-inheritance diagnostics identical | integration | `npx vitest run test/inheritance-cycle-validation.test.ts` | ✅ | ⬜ pending |
| REF-10 | No other validation suite regresses | whole suite | full suite, failed-name diff against base | ✅ | ⬜ pending |
| REF-11 | Every `contributes.commands` id registered after activation | unit (mocked vscode) | new command-registration test | ❌ W0 | ⬜ pending |
| REF-11 | Shared exec helper: output, temp-file cleanup on success/failure, env spread, timeout, rejection | unit | new helper tests | ❌ W0 | ⬜ pending |
| REF-11 | EM login/validate behaviour unchanged | unit | `npx vitest run test/em-token-expiry-wiring.test.ts test/em-login-username.test.ts` | ✅ | ⬜ pending |
| REF-11 | `Commands.cjs` run paths unchanged | unit | `npx vitest run test/commands-cjs-execution.test.ts test/decompile-io.test.ts` | ✅ | ⬜ pending |
| REF-11 | Source guards widened, not weakened | unit (source scan) | `npx vitest run test/em-secret-env-channel.test.ts test/target-resolution.test.ts test/setopts-in-code-ui.test.ts test/no-shell-command-construction.test.ts test/config-reload-host.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Unit tests for the shared exec helper (D-05): six cases
- [ ] Command-registration test (D-16) on the `extension-activation.test.ts` mocked-vscode harness, with a named allow-list

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GUI, BUI and DWC runs, EM login and compile behave as before | REF-11 | Needs a live BBj install and the VS Code UI | Build and install the VSIX from the final tree, then run a GUI, a BUI and a DWC program, log into EM and compile a file (D-18) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
