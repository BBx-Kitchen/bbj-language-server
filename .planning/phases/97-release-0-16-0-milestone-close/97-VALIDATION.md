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

Task IDs filled in by the planner (2026-09-20). Eleven plans; every code-wave row maps onto a named
plan task, every release-half row onto a `gh` read-back behind its checkpoint.

| Item | Plan · Task | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|-------------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Crash detection: the status feed reaches `BbjServerService` from the client-features hook, from exactly one call site | 97-01 · Task 1, Task 3 | folded todo 1 | T-97-01, T-97-02 | Single authoritative feed site; whole body still EDT-dispatched | source guard | `./gradlew test --tests "*.Lsp4ijOverrideSiteSourceGuardTest"` | ✅ (2 new assertions) | ⬜ pending |
| Crash detection: `LSPClientFeatures.handleServerStatusChanged(ServerStatus)` and `getProject()` still exist with those signatures | 97-01 · Task 2 | folded todo 1 | T-97-04 | Vendor drift reds the build | coupling canary | `./gradlew test --tests "*.Lsp4ijCouplingCanaryTest"` | ✅ (new canary) | ⬜ pending |
| Crash detection: new LSP4IJ symbol is allowlisted | 97-01 · Task 1 | folded todo 1 | T-97-04 | No unfenced vendor coupling | source guard | `./gradlew test --tests "*.Lsp4ijImportAllowlistTest"` | ✅ (entry edit) | ⬜ pending |
| Classification over the real status sequence: one-behind vs two-behind from-state | 97-02 · Task 1 | folded todo 2 | T-97-05 | Crash verdict restored for a real lost connection | plain-JUnit seam | `./gradlew test --tests "*.ExpectedStopGuardTest"` | ✅ (2 new cases) | ⬜ pending |
| Status log prints the real from-state; classifier input pinned red before it changes, then green | 97-02 · Task 1 (red), Task 3 (green) | folded todo 2 | T-97-06, T-97-07 | Classifier semantics unchanged; only the caller's argument moves | source guard | `./gradlew test --tests "*.BbjServerServiceRestartSourceGuardTest"` | ✅ (new assertion) | ⬜ pending |
| `bbj/bbjcplAvailability` handled, with an empty body | 97-04 · Task 1 | folded todo 3 | T-97-11 | No parse/validate/store path for the payload | source guard | `./gradlew test --tests "*.Lsp4ijOverrideSiteSourceGuardTest"` | ✅ (new assertion) | ⬜ pending |
| `setIndeterminate(false)` precedes the first `setFraction` | 97-04 · Task 2 | folded todo 4 | T-97-13 | N/A | source guard | `./gradlew test --tests "*.BbjNodeDownloaderSourceGuardTest"` | ✅ (new assertion) | ⬜ pending |
| gradle-wrapper-hygiene green, no code change | 97-03 · Task 2 | folded todo 5 | — | N/A | unit | `npx vitest run test/gradle-wrapper-hygiene.test.ts` | ✅ | ⬜ pending |
| issue447 capability test accepts either backend shape | 97-03 · Task 1 | folded todo 6 | T-97-08 | Product invariant asserted, not one backend's answer | unit | `RUN_BBJ_TESTS=1 npx vitest run test/functional/issue447-real-interop.test.ts` | ✅ (rewrite) | ⬜ pending |
| linking interop failures investigated: fixed, or re-filed as a pending todo | 97-03 · Task 3 | folded todo 6 | T-97-09 | Test-tier scope enforced by an exit-code diff on `bbj-vscode/src` | unit + report | `RUN_BBJ_TESTS=1 npx vitest run test/linking.test.ts -t "Interop" \|\| ls …/todos/pending/ \| grep -q 'linking-interop'` | ✅ | ⬜ pending |
| Whole-suite gate on the final code-wave tree | 97-05 · Task 1 | folded todos 1-6 | T-97-16 | `--rerun-tasks` forbids an UP-TO-DATE no-op | full suite | `./gradlew test --rerun-tasks` · `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | ✅ | ⬜ pending |
| No planning identifiers in the source/test diff | 97-05 · Task 1; 97-06 · Task 2 | D-03 | T-97-15, T-97-17 | Nothing leaks into permanent public history | CLI | `git -C … diff origin/main...HEAD -- bbj-intellij bbj-vscode documentation .github \| grep -nE '(^\+.*)(\b(D\|C\|CR)-[0-9]+\b\|\b(COMP\|PLAT\|EM\|IOP\|REL)-[0-9]+\b\|\b9[0-7]-[0-9]{2}\b)'` prints nothing | ✅ | ⬜ pending |
| Workflow files untouched | 97-06 · Task 1; 97-07 · Task 1 | D-09 | T-97-20 | Release gate definition unchanged | CLI | `git -C … diff --exit-code origin/main -- .github/workflows/manual-release.yml .github/workflows/preview.yml` | ✅ | ⬜ pending |
| `package.json` version does not regress on the landing merge | 97-06 · Task 1 | D-02 | T-97-18 | Version history stays accurate | CLI | `test "$(git show HEAD:bbj-vscode/package.json \| grep -m1 version)" = "$(git show origin/main:bbj-vscode/package.json \| grep -m1 version)"` | ✅ | ⬜ pending |
| PR body carries no GitHub closing keyword | 97-06 · Task 2 | D-04, D-18 | T-97-19 | Issues close only after a released version exists | CLI | `grep -niE '\b(fix\|fixes\|close\|closes\|resolve\|resolves)\s+#[0-9]+' 97-LANDING-PR.md` prints nothing | ✅ | ⬜ pending |
| Reconciliation runbook exists, flags the unverified token assumption, carries no token literal | 97-07 · Task 1 | D-10, D-12 | T-97-21, T-97-22, T-97-23 | Token from the environment, last on the line | CLI | `grep -c 'gh run download' …/97-RECONCILIATION-RUNBOOK.md` · `grep -ciE 'UNVERIFIED' …` · token-shape grep prints nothing | ✅ | ⬜ pending |
| Preview run green on the merged commit | 97-07 · Task 2 | D-06 | — | Same verification work as the release gate | CLI read-back | `gh run list --workflow "Publish Preview Extension" --branch main --json databaseId,headSha,conclusion` | n/a | ⬜ pending |
| Release exists with tag and both assets; `verify` finished before either publish started | 97-08 · Task 3 | REL-01 | T-97-26 | One gate before anything public | CLI read-back | `gh release view v0.16.0 --json tagName,targetCommitish,assets` · `git ls-remote --tags origin v0.16.0` | n/a | ⬜ pending |
| Curated release notes applied without losing the install block or an asset | 97-09 · Task 3 | D-13 | T-97-29, T-97-30 | No planning identifier on the public page | CLI read-back | `gh release view v0.16.0 --json body --jq .body \| grep -c '## Installation'` · `gh release view v0.16.0 --json assets --jq '.assets \| length'` | n/a | ⬜ pending |
| Smoke verdict tied to both asset hashes; milestone still at 21 before closure | 97-10 · Task 3 | REL-01, D-14..D-17 | T-97-32, T-97-35 | Verdict cannot detach from the bytes judged | CLI read-back | `grep -cE '[0-9a-f]{64}' …/97-SMOKE-VERDICT.md` · `gh api …/milestones/7 --jq '.open_issues'` | n/a | ⬜ pending |
| 21 issues + milestone closed | 97-11 · Task 3 | REL-02 | T-97-37, T-97-38, T-97-40 | One at a time, ascending, milestone last, skip already-closed | CLI read-back | `gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '.state,.open_issues,.closed_issues'` | n/a | ⬜ pending |
| Six folded-todo files moved to completed; no GitHub issue created for any of them | 97-11 · Task 3 | D-21 | T-97-40 | Milestone stays at exactly 21 | CLI | `ls …/todos/completed/ \| grep -cE '<the six filenames>'` returns 6 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Every gap below is now owned by a named plan task; none is left to be discovered during execution.

- [ ] New assertions in `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` pinning the new `handleServerStatusChanged` override and the single status-feed call site — **97-01 · Task 3** (`clientFeaturesHandleServerStatusChangedIsTheSingleStatusFeedSite`, `theLanguageClientOverrideNoLongerFeedsTheServerService`)
- [ ] New reflective canary in `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` for `LSPClientFeatures.handleServerStatusChanged(ServerStatus)` and `getProject()` — **97-01 · Task 2** (`theClientFeaturesMembersThisPluginOverridesStillExist`)
- [ ] `Lsp4ijImportAllowlistTest` entry for `BbjLanguageServerFactory.java` gains `ServerStatus` — **97-01 · Task 1**
- [ ] A pin on the from-state fed to `ExpectedStopGuard.classify` (none exists today), written and demonstrably **red before** the production change — **97-02 · Task 1** (`theClassifierIsFedTheOneBehindFromState` in `BbjServerServiceRestartSourceGuardTest`, plus two `ExpectedStopGuardTest` cases contrasting the one-behind and two-behind inputs)
- [ ] Resolved at planning time: `BbjNodeDownloaderSourceGuardTest` already exists and is the home for the indicator-ordering guard — **97-04 · Task 2** (`theIndicatorLeavesIndeterminateModeBeforeTheFirstFractionIsReported`); no new test file is needed
- [ ] `bbj-vscode/test/functional/issue447-real-interop.test.ts` rewrite for both backend shapes — **97-03 · Task 1**
- [ ] The `bbjcplAvailability` handler's empty-body guard in `Lsp4ijOverrideSiteSourceGuardTest` — **97-04 · Task 1** (`theBbjcplAvailabilityHandlerIsDeclaredAndDoesNothingWithItsPayload`)

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

- [x] All code-wave tasks have `<automated>` verify or Wave 0 dependencies — every task across plans 97-01..97-05 carries at least one `<automated>` command with a stated failing direction (71 commands across the plan set, 0 blockers and 0 warnings from the verify-command-path gate)
- [x] Sampling continuity: no 3 consecutive code-wave tasks without automated verify — the only tasks without a runnable command are the eight human checkpoints, which are `<human-check>` by nature
- [x] Wave 0 covers all MISSING references — each gap above names its owning plan task, and the `BbjNodeDownloader` open question was resolved at planning time (the guard file already exists)
- [x] No watch-mode flags — every vitest invocation uses `npx vitest run`; every Gradle invocation is a one-shot `test`/`compileJava` with `--rerun-tasks`
- [x] Feedback latency < 120s for targeted runs — targeted `--tests` Gradle runs and single-file vitest runs only; the two whole suites run once each, at the 97-05 code-wave gate and once more after the 97-06 merge
- [ ] `nyquist_compliant: true` set in frontmatter — set by `/gsd-validate-phase` after execution, not by the planner

**Approval:** task ids filled in by the planner 2026-09-20; pending phase execution.
