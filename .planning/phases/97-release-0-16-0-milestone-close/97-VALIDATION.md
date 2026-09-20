---
phase: "97"
slug: "release-0-16-0-milestone-close"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-20"
---

# Phase 97 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `97-RESEARCH.md` § Validation Architecture. Roughly half of this phase is release
> mechanics whose only honest evidence is a human checkpoint plus a `gh` read-back; those rows are
> listed under Manual-Only Verifications rather than dressed up as automated.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bbj-intellij: JUnit 5 via Gradle `useJUnitPlatform()`; bbj-vscode: Vitest 4.x (`bbj-vscode/vitest.config.ts`) |
| **Config file** | `bbj-intellij/build.gradle.kts`, `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "<ClassName>"` · `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` · `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` |
| **Estimated runtime** | targeted Gradle run ~60-120 s; IntelliJ full suite ~5 min; Vitest full suite ~3-5 min |

---

## Sampling Rate

- **After every task commit (code wave):** the targeted Gradle `--tests` classes and/or the single
  Vitest file the task touched. Never the whole suite per task.
- **After the code wave:** IntelliJ full suite with `--rerun-tasks` (an UP-TO-DATE `:test` must not
  mask a stale green) and the Vitest suite judged on `numFailedTests: 0` with `RUN_BBJ_TESTS=0`,
  cwd = `bbj-vscode`. Both must be green before the landing PR opens.
- **Release half:** the Preview workflow run triggered by the landing-PR merge is the full-suite
  gate (same `verify` job as `manual-release.yml`); then the Manual Release run's own `verify` job.
- **Before `/gsd-verify-work`:** both local suites green and the release evidence recorded.
- **Max feedback latency:** ~120 seconds for targeted runs.

---

## Per-Task Verification Map

Task IDs are filled in by the planner; rows below are the contract each plan must map onto.

| Item | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Crash detection: `stopped` reaches `BbjServerService.updateStatus` exactly once per transition | folded todo 1 | — | N/A | source guard | `./gradlew test --tests "*.Lsp4ijOverrideSiteSourceGuardTest"` | ✅ (new assertion) | ⬜ pending |
| Crash detection: `LSPClientFeatures.handleServerStatusChanged(ServerStatus)` still exists with that signature | folded todo 1 | — | N/A | coupling canary | `./gradlew test --tests "*.Lsp4ijCouplingCanaryTest"` | ✅ (new canary) | ⬜ pending |
| Crash detection: new LSP4IJ symbol is allowlisted | folded todo 1 | — | N/A | source guard | `./gradlew test --tests "*.Lsp4ijImportAllowlistTest"` | ✅ (entry edit) | ⬜ pending |
| Crash detection: classification over the full status sequence | folded todo 1 | — | N/A | plain-JUnit seam | `./gradlew test --tests "*.ExpectedStopGuardTest"` + the new seam test | ❌ W0 | ⬜ pending |
| Status log prints the real from-state; classifier input pinned before it changes | folded todo 2 | — | N/A | plain-JUnit seam | new pinning test (planner names it) | ❌ W0 | ⬜ pending |
| `bbj/bbjcplAvailability` handled | folded todo 3 | — | N/A | source guard / unit | planner names it; existing `BbjLanguageClient` guards must stay green | ❌ W0 | ⬜ pending |
| `setIndeterminate(false)` precedes first `setFraction` | folded todo 4 | — | N/A | source guard | planner names it | ❌ W0 | ⬜ pending |
| gradle-wrapper-hygiene green | folded todo 5 | — | N/A | unit | `npx vitest run test/gradle-wrapper-hygiene.test.ts` | ✅ | ⬜ pending |
| issue447 capability test accepts the getAllClassNames backend; linking interop failures investigated | folded todo 6 | — | N/A | unit + report | `npx vitest run test/functional/issue447-real-interop.test.ts` | ✅ (rewrite) | ⬜ pending |
| No planning identifiers in the source/test diff | D-03 | — | N/A | CLI | `git -C … diff origin/main...HEAD -- bbj-intellij bbj-vscode documentation .github \| grep -nE '<register pattern>'` exits 1 | ✅ | ⬜ pending |
| Workflow files untouched | D-09 | — | N/A | CLI | `git -C … diff --exit-code origin/main -- .github/workflows/manual-release.yml` | ✅ | ⬜ pending |
| Release exists with tag and both assets | REL-01 | — | N/A | CLI read-back | `gh release view v0.16.0 --json tagName,assets` | n/a | ⬜ pending |
| 21 issues + milestone closed | REL-02 | — | N/A | CLI read-back | `gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '.state,.open_issues'` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New assertion in `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` pinning the new `handleServerStatusChanged` override and the single `updateStatus(` call site
- [ ] New reflective canary in `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` for `LSPClientFeatures.handleServerStatusChanged(ServerStatus)`
- [ ] `Lsp4ijImportAllowlistTest` entry for `BbjLanguageServerFactory.java` gains `ServerStatus`
- [ ] A plain-JUnit test pinning the from-state fed to `ExpectedStopGuard.classify` (none exists today) — written and red/green **before** the production change
- [ ] Check whether any test covers `BbjNodeDownloader`'s indicator calls before writing one
- [ ] `bbj-vscode/test/functional/issue447-real-interop.test.ts` rewrite for both backend shapes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A killed node process / dropped connection produces the crash banner and sane restart behaviour | folded todo 1 (D-07) | No live IntelliJ UI coverage exists in CI | Build both distributables from the final tree; install the IntelliJ zip; open a `.bbj` file; kill the language-server node process; observe crash banner, status widget, restart; confirm idea.log has no `Unsupported notification method: bbj/bbjcplAvailability` WARN |
| Preview build sanity in both IDEs | D-06 | Marketplace-delivered artifact in a real IDE | After the Preview run is green, install the preview build in VS Code and IntelliJ; open a `.bbj` file; confirm server starts, diagnostics and completion work |
| Manual Release 0.16.0 dispatched and green | REL-01 (D-11) | One-way public action reserved to the maintainer | Maintainer dispatches from the Actions UI after the precondition report; Claude watches with `gh run watch` |
| Smoke checklist on the released artifacts | REL-01 (D-15, D-16) | Clean-IDE install behaviour | Maintainer runs `QA/SMOKE-TEST-CHECKLIST.md`: VS Code from the Marketplace, IntelliJ from `bbj-intellij-0.16.0.zip` on the GitHub Release (D-14 override); verdict recorded against the assets' sha256, run id and commit |
| Release notes and 21 closing comments read correctly | REL-02 (D-13, D-19) | Public wording under the maintainer's identity | Maintainer reads the draft file(s), edits, gives an explicit go |

---

## Validation Sign-Off

- [ ] All code-wave tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive code-wave tasks without automated verify (release-half tasks are checkpoint + `gh` read-back by nature)
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s for targeted runs
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
