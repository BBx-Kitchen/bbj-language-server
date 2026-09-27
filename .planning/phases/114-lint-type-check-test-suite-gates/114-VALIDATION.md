---
phase: "114"
slug: "lint-type-check-test-suite-gates"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-27"
---

# Phase 114 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (bbj-vscode); JUnit 5 via Gradle (bbj-intellij) |
| **Config file** | `bbj-vscode/vitest.config.ts` (gains explicit `include`/`exclude` this phase) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --reporter=json --outputFile=<path>` |
| **Estimated runtime** | ~300 seconds (whole suite, before the TEST-07 fix) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command scoped to the touched files, plus `npm run lint` / `npm run typecheck:test` once those gates exist
- **After every plan wave:** Run the full suite command; judge on `numFailedTests` and the failing-test-name set against the phase base commit
- **Before `/gsd-verify-work`:** Three consecutive full-suite runs (D-10) with no `Hook timed out` and `numFailedTests` unchanged
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 114-TBD | TBD | TBD | TEST-01 | — | N/A | lint gate | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm run lint` | ✅ | ⬜ pending |
| 114-TBD | TBD | TBD | TEST-02 | — | N/A | typecheck gate | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm run typecheck:test` | ❌ W0 | ⬜ pending |
| 114-TBD | TBD | TBD | TEST-03 | — | N/A | discovery diff | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest list --filesOnly` (diff vs pre-change snapshot) | ✅ | ⬜ pending |
| 114-TBD | TBD | TBD | TEST-07 | — | N/A | whole-suite ×3 | full suite command ×3, no `Hook timed out` | ✅ | ⬜ pending |
| 114-TBD | TBD | TBD | TEST-11 | — | N/A | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/language-configuration.test.ts` | ❌ W0 | ⬜ pending |
| 114-TBD | TBD | TBD | FIX-04 | — | N/A | JUnit + vitest | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests '*BbjNodeDownloader*' --tests '*Lsp4ijOverrideSiteSourceGuardTest*'` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

The planner replaces the TBD rows with per-task rows.

---

## Wave 0 Requirements

- [ ] Pre-change baseline: `vitest list --filesOnly` snapshot and whole-suite JSON (`numFailedTests`, failing test names) captured on the phase base commit
- [ ] `package.json` — `typecheck:test` script
- [ ] `tsconfig.test.json` — repaired shape (no project reference, `noEmit`)
- [ ] `test/language-configuration.test.ts` — bbx describe block
- [ ] Behavioural rewrites of `BbjNodeDownloaderSourceGuardTest` and the `bbjcplAvailability` guard

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PR CI fails on an introduced lint / type error | TEST-01, TEST-02 | Needs a GitHub Actions run | Push a branch with a deliberate lint error, confirm `build.yml` fails at the Lint step, then revert |
| IntelliJ Node.js download shows progress | FIX-04 | Needs the IDE UI | Remove the cached Node.js, start the plugin, watch the progress bar and idea.log for IllegalStateException |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
