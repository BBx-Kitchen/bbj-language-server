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
| 114-01-01 | 01 | 1 | TEST-03 | T-114-01, T-114-02 | Baseline captured before edits; discovery set byte-identical | discovery diff | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest list --filesOnly \| grep -E '^test/.*\.test\.ts$' \| LC_ALL=C sort \| diff - <phase>/baseline/files-before.txt` | ✅ (baseline created in-task) | ⬜ pending |
| 114-01-02 | 01 | 1 | TEST-11 | — | N/A | unit + mutation probe | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/language-configuration.test.ts` | ❌ W0 (new describe block) | ⬜ pending |
| 114-02-01 | 02 | 2 | TEST-07 | T-114-03 | Gated real-interop files keep production services | single-file before/after | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/hover.test.ts` | ✅ | ⬜ pending |
| 114-02-02 | 02 | 2 | TEST-07 | T-114-03 | Assertion lines unchanged | 27-file batch | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <27 migrated files>` | ✅ | ⬜ pending |
| 114-02-03 | 02 | 2 | TEST-07 | T-114-04 | No timeout or worker change | whole-suite ×3 | digest diff: FAILED_TEST vs baseline, `hookTimeoutSuites=0` in run1..3 | ✅ | ⬜ pending |
| 114-03-01 | 03 | 1 | FIX-04 | T-114-06 | Determinate mode before every fraction | JUnit (recording fake) + mutation probe | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew cleanTest test --tests 'com.basis.bbj.intellij.BbjNodeDownloaderProgressTest' --tests 'com.basis.bbj.intellij.lsp.BbjNodeDownloaderSourceGuardTest' --tests 'com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest'` | ❌ W0 (new class) | ⬜ pending |
| 114-03-02 | 03 | 1 | FIX-04 | T-114-05 | bbjcplAvailability stays a registered no-op taking Object | JUnit (reflection) + 2 mutation probes | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew cleanTest test` | ✅ (method rewritten) | ⬜ pending |
| 114-04-01 | 04 | 4 | FIX-04 | T-114-08 | MethodNotFound latch has teeth | vitest hermetic + mutation probe | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/functional/issue447-real-interop.test.ts` | ❌ W0 (new describe) | ⬜ pending |
| 114-04-02 | 04 | 4 | FIX-04 | T-114-08, T-114-09 | Capability judged by the wire answer; no src change | vitest live (RUN_BBJ_TESTS=1) | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=1 npx vitest run test/functional/issue447-real-interop.test.ts --reporter=json --outputFile=coverage/phase-114/issue447-live.json` + all-passed node check | ❌ W0 (new describes) | ⬜ pending |
| 114-05-01 | 05 | 2 | TEST-01 | T-114-10 | Overrides limited to the allowed set | eslint --print-config checks | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx eslint --print-config test/linking.test.ts \| node -e …` (×3 files) | ✅ | ⬜ pending |
| 114-05-02 | 05 | 2 | TEST-01 | T-114-11 | Autofix is let→const only | targeted vitest + build | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/linking.test.ts test/webview-panel-lifecycle.test.ts test/config-hot-reload-wiring.test.ts test/document-formatter.test.ts test/line-break-validation.test.ts test/document-builder.test.ts` | ✅ | ⬜ pending |
| 114-05-03 | 05 | 2 | TEST-01 | T-114-10 | Reason-less and file-wide disables rejected | vitest guard + self-tests | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/eslint-disable-directives.test.ts && npx eslint test/eslint-disable-directives.test.ts --max-warnings 0` | ❌ W0 (new file) | ⬜ pending |
| 114-06-01 | 06 | 3 | TEST-01 | T-114-12 | Behaviour-neutral src edits | eslint (3 files) + vitest | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx eslint src/language/bbj-comment-provider.ts src/language/bbj-ws-manager.ts src/language/utils.ts --max-warnings 0 && npx vitest run test/comment-provider.test.ts test/ws-manager.test.ts` | ✅ | ⬜ pending |
| 114-06-02 | 06 | 3 | TEST-01 | T-114-12 | No any in src | eslint (7 files) + vitest | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx eslint <7 src files> --max-warnings 0 && npx vitest run test/hover.test.ts test/document-symbol.test.ts test/javadoc.test.ts test/line-break-validation.test.ts test/document-formatter.test.ts test/parser-ambiguity-logging.test.ts` | ✅ | ⬜ pending |
| 114-06-03 | 06 | 3 | TEST-01 | T-114-12, T-114-13 | src lint at zero, no suppression | lint gate (src) + whole suite | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx eslint src --max-warnings 0` | ✅ | ⬜ pending |
| 114-07-01 | 07 | 3 | TEST-02 | T-114-14 | Only noImplicitAny relaxed | typecheck runs end to end | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx tsc -p tsconfig.test.json --noEmit` + no config-code / no src error check | ❌ W0 (config repair + script) | ⬜ pending |
| 114-07-02 | 07 | 3 | TEST-02 | T-114-15 | Fake shapes complete, names unchanged | per-file tsc count + vitest | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx tsc -p tsconfig.test.json --noEmit 2>&1 \| grep -c '^test/bbj-test-module.ts' \| grep -qx 0 && RUN_BBJ_TESTS=0 npx vitest run test/linking.test.ts …` | ✅ | ⬜ pending |
| 114-07-03 | 07 | 3 | TEST-02 | T-114-15 | Typed harness, assertions unchanged | per-file tsc count + vitest | `… grep -cE '^test/(commands-cjs-harness…)' \| grep -qx 0 && npx vitest run test/commands-cjs-execution.test.ts …` | ✅ | ⬜ pending |
| 114-08-01 | 08 | 4 | TEST-01, TEST-02 | T-114-16 | require via createRequire, assertions unchanged | eslint + tsc count + vitest | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx eslint test/validation.test.ts test/em-properties-reader-guard.test.ts --max-warnings 0 && …` | ✅ | ⬜ pending |
| 114-08-02 | 08 | 4 | TEST-01, TEST-02 | T-114-16 | Whole-tree lint at zero | lint gate (src+test) + tsc count + vitest | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx eslint src test --max-warnings 0 && …` | ✅ | ⬜ pending |
| 114-09-01 | 09 | 4 | TEST-02 | T-114-17 | Fake providers mirror existing behaviour | tsc count (6 files) + vitest | `… grep -cE '^test/(fake-text-document-connection\.ts\|…)' \| grep -qx 0 && npx vitest run …` | ✅ | ⬜ pending |
| 114-09-02 | 09 | 4 | TEST-02 | T-114-17 | — | tsc count (16 files) + vitest + whole suite | same pattern, 16 files | ✅ | ⬜ pending |
| 114-10-01 | 10 | 4 | TEST-02 | T-114-18 | Messages via getMessageString | tsc count (4 files) + vitest | `… grep -cE '^test/(line-break-validation\|…)\.test\.ts' \| grep -qx 0 && npx vitest run …` | ✅ | ⬜ pending |
| 114-10-02 | 10 | 4 | TEST-02 | T-114-18 | Vacuous clause removal recorded | tsc count (6 files) + vitest + whole suite | same pattern, 6 files | ✅ | ⬜ pending |
| 114-11-01 | 11 | 4 | TEST-02 | T-114-19 | Fail-if-false narrowing only | tsc count (6 files) + vitest + passed-count check | `… grep -cE '^test/(unknown-java-member\|…)\.test\.ts' \| grep -qx 0 && npx vitest run …` | ✅ | ⬜ pending |
| 114-11-02 | 11 | 4 | TEST-02 | T-114-19 | Live gates unchanged | tsc count (17 files) + vitest + whole suite | same pattern, 17 files | ✅ | ⬜ pending |
| 114-12-01 | 12 | 4 | TEST-02 | T-114-20 | No esModuleInterop relaxation | tsc count (13 files) + vitest | `… grep -cE '^test/(workflow-secret-hygiene\|…)\.test\.ts' \| grep -qx 0 && RUN_BBJ_TESTS=0 npx vitest run …` | ✅ | ⬜ pending |
| 114-12-02 | 12 | 4 | TEST-02 | T-114-20 | Whole-tree typecheck result recorded | tsc count (24 files) + vitest + whole suite | same pattern, 24 files | ✅ | ⬜ pending |
| 114-13-01 | 13 | 5 | TEST-01, TEST-02 | T-114-21, T-114-22 | build.yml additions only; publish workflows untouched | step-order awk + local gates + probe | `awk … build.yml && npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run lint && npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run typecheck:test` | ✅ | ⬜ pending |
| 114-13-02 | 13 | 5 | TEST-07, TEST-03 | T-114-23 | Phase gate | whole-suite ×3 + list diff + IntelliJ suite | digest loop over suite-114-13-run1..3; `vitest list` diff shows only the new guard test | ✅ | ⬜ pending |
| 114-13-03 | 13 | 5 | TEST-01, TEST-02, FIX-04 | T-114-22 | — | manual (checkpoint) | see Manual-Only Verifications | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

`<phase>` = `/home/coder/repos/bbj-language-server/.planning/phases/114-lint-type-check-test-suite-gates`. The full commands are in each PLAN.md task's `<automated>` block; abbreviated rows (`…`) point there.

---

## Wave 0 Requirements

- [ ] Pre-change baseline: `vitest list --filesOnly` snapshot and whole-suite digest (`numFailedTests`, failing test names, hook-timeout suites, duration) captured on the phase base commit — plan 114-01 Task 1 (`baseline/files-before.txt`, `baseline/suite-before.txt`, `baseline/suite-digest.mjs`)
- [ ] `package.json` — `typecheck:test` script — plan 114-07 Task 1
- [ ] `tsconfig.test.json` — repaired shape (no project reference, `noEmit`, `noImplicitAny: false` commented) — plan 114-07 Task 1
- [ ] `test/language-configuration.test.ts` — bbx describe block — plan 114-01 Task 2
- [ ] `test/eslint-disable-directives.test.ts` — disable-reason guard — plan 114-05 Task 3
- [ ] Behavioural `BbjNodeDownloaderProgressTest` (replaces the substring guard method) and the reflective `bbjcplAvailability` guard — plan 114-03
- [ ] issue447 definitive, live forced-fallback and hermetic forced-fallback cases — plan 114-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PR CI fails on an introduced lint / type error | TEST-01, TEST-02 | Needs a GitHub Actions run | Plan 114-13 Task 3: throwaway branch with one lint error and one type error, draft PR to main; confirm "Lint" and "Type-check test tree" both fail and "Test" still runs; close the PR and delete the branch (nothing publishes: preview.yml runs only on push to main) |
| IntelliJ Node.js download shows progress | FIX-04 | Needs the IDE UI | Plan 114-13 Task 3: build both distributables from the final tree, install the plugin, remove the cached Node.js, accept the download offer, watch the progress bar and grep idea.log for IllegalStateException |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
