---
phase: "106"
slug: "on-save-compiler-check-in-both-ides"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-24"
---

# Phase 106 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (bbj-vscode); JUnit 5 via Gradle (bbj-intellij) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (judge on numFailedTests; known env-drift baseline: linking.test.ts interop + issue447) plus `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` for Java changes |
| **Estimated runtime** | ~180 seconds (vitest whole suite); ~10 seconds per targeted file |

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run <changed-file>.test.ts` (or `./gradlew test` for bbj-intellij tasks)
- **After every plan wave:** Run the full vitest suite with `--maxWorkers=2`
- **Before `/gsd-verify-work`:** Full suite green (env-drift baseline excepted), plus hand UAT in both IDEs from freshly built VSIX and IntelliJ zip
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 106-01-01 | 01 | 1 | TRIG-02 (+ save capability) | T-106-01, T-106-03 | save capability advertised; one zero-delay check per save | unit (tracer) | `npx vitest run test/on-save-trigger.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 106-01-02 | 01 | 1 | TRIG-01, TRIG-03 | T-106-02 | typing/rebuild start nothing; open checks once | unit | `npx vitest run test/on-save-trigger.test.ts test/live-parse-scheduling.test.ts` | ✅ after 01-01 | ⬜ pending |
| 106-01-03 | 01 | 1 | TRIG-05 | — | mode switch starts no burst; debounced/off unchanged | unit (regression) | `npx vitest run test/on-save-trigger.test.ts test/live-parse-scheduling.test.ts test/live-parse-interleaving.test.ts test/document-builder.test.ts …` | ✅ | ⬜ pending |
| 106-02-01 | 02 | 1 | JINT-03 | T-106-04 | lane answers while shared breaker open | unit (tracer) | `npx vitest run test/java-interop-parse-lane.test.ts` | ✅ | ⬜ pending |
| 106-02-02 | 02 | 1 | JINT-03 | T-106-04, T-106-05 | half-open, same-tick, mid-flight drop, latch | unit | `npx vitest run test/java-interop-parse-lane.test.ts test/java-interop-breaker.test.ts test/bbj-parser-service.test.ts test/java-class-reload.test.ts` | ✅ | ⬜ pending |
| 106-03-01 | 03 | 1 | TRIG-06 | T-106-07 | only allowed trigger values reach the server | JUnit 5 (tracer) | `cd bbj-intellij && ./gradlew test --rerun-tasks --tests '…CompilerInitOptionsTest' --tests '…CompilerTriggerSourceGuardTest'` | ❌ W0 (created by this task) | ⬜ pending |
| 106-03-02 | 03 | 1 | TRIG-06 | T-106-08 | Apply stores before restart | JUnit 5 (source guard) | `cd bbj-intellij && ./gradlew test --rerun-tasks` | ✅ after 03-01 | ⬜ pending |
| 106-03-03 | 03 | 1 | TRIG-07 | — | N/A | content checks + manual read | `node -e …` package.json check; docs grep check | n/a | ⬜ pending |
| 106-04-01 | 04 | 2 | DIAG-01 | T-106-09 | dedup only for saved text | unit (tracer) | `npx vitest run test/bbj-cpl-fallback-dedup.test.ts test/live-parse-interleaving.test.ts test/on-save-trigger.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 106-04-02 | 04 | 2 | DIAG-01 | T-106-09, T-106-10 | not-on-disk text merged as before | unit | `npx vitest run test/bbj-cpl-fallback-dedup.test.ts …` | ✅ | ⬜ pending |
| 106-04-03 | 04 | 2 | DIAG-01 | — | N/A | unit (pure) | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts test/bbj-cpl-fallback-dedup.test.ts` | ✅ | ⬜ pending |
| 106-05-01 | 05 | 3 | TRIG-04 | T-106-12, T-106-14 | kept error never placed on a guessed line | unit (tracer) | `npx vitest run test/on-save-kept-errors.test.ts …` | ❌ W0 (created by this task) | ⬜ pending |
| 106-05-02 | 05 | 3 | TRIG-04 | T-106-13 | change log bounded | unit (pure) | `npx vitest run test/bbj-kept-check.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 106-05-03 | 05 | 3 | TRIG-04, TRIG-05 | — | N/A | unit + end to end | `npx vitest run test/bbj-kept-check.test.ts test/on-save-kept-errors.test.ts …` (8 files) | ✅ | ⬜ pending |
| 106-06-01 | 06 | 4 | TRIG-04, TRIG-02 | T-106-15 | superseded result never overwrites newer | unit (tracer) | `npx vitest run test/on-save-kept-errors.test.ts test/live-parse-interleaving.test.ts test/on-save-trigger.test.ts` | ✅ | ⬜ pending |
| 106-06-02 | 06 | 4 | TRIG-04, DIAG-01 | T-106-16 | kept fallback never suppresses for other text | unit | `npx vitest run test/on-save-kept-errors.test.ts test/bbj-cpl-fallback-dedup.test.ts …` | ✅ | ⬜ pending |
| 106-06-03 | 06 | 4 | TRIG-04, TRIG-05 | — | N/A | unit + whole suite | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 --reporter=json …` (numFailedTests=0) | ✅ | ⬜ pending |
| 106-07-01 | 07 | 5 | TRIG-02, TRIG-06, JINT-03 | — | N/A | build + whole suites | bundle `cmp`; whole vitest suite; `./gradlew test --rerun-tasks` | n/a | ⬜ pending |
| 106-07-02 | 07 | 5 | TRIG-01..07, DIAG-01, JINT-03 | T-106-18, T-106-19 | UAT evidence from real logs | manual (checkpoint) | hand UAT steps 1-13 + criterion-5 timing | n/a | ⬜ pending |
| 106-07-03 | 07 | 5 | JINT-03 | T-106-18 | no corpus names recorded | record | `grep` checks on 106-MEASUREMENT.md | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are filled in by the planner / validate-phase once plans exist.*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/on-save-trigger.test.ts` (or equivalent) — save-path arming, no debounce, one check per save (106-01-01)
- [ ] JUnit 5 test for the new `compilerTrigger` init option in bbj-intellij (106-03-01: `CompilerInitOptionsTest` extension + new `CompilerTriggerSourceGuardTest`)
- [ ] Test (or documented manual UAT step) proving the server advertises `save` in `textDocumentSync` (106-01-01: `buildInitializeResult` capability test; UAT step 11 confirms IntelliJ sends didSave)
- [ ] `bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts` (106-04-01), `bbj-vscode/test/on-save-kept-errors.test.ts` (106-05-01), `bbj-vscode/test/bbj-kept-check.test.ts` (106-05-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docs and VS Code setting description describe the three modes and recommend on-save | TRIG-07 | Content review | Read `bbj-vscode/package.json` enumDescriptions and both `documentation/docs/*/features.md` sections |
| didSave reaches the server from both IDEs; on-save behaviour end to end | TRIG-02, TRIG-06 | Needs real VS Code and IntelliJ clients | Build VSIX + IntelliJ zip, set on-save, type (no check), save (one check), confirm errors persist on correct lines |
| First live diagnostic still ~5-6 s on the large workspace | JINT-03 | Needs the real large workspace and BBj | Re-check a few Phase 105 "after" samples per 105-MEASUREMENT.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
