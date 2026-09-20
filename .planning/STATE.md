---
gsd_state_version: 1.0
milestone: v4.4
milestone_name: IntelliJ Focus (Phases 93-97) — IN PROGRESS
current_phase: 96
current_phase_name: Platform Integration & Node.js Diagnosis
status: executing
stopped_at: Completed 96-01-PLAN.md
last_updated: "2026-09-20T01:14:48.417Z"
last_activity: 2026-09-20
last_activity_desc: Phase 96 execution resumed (wave continue)
state_head: cc9de609e4cf3611acc206ce62e67bb7335c8ae3
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 24
  completed_plans: 18
  percent: 60
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-19 (Phase 94 complete — 4/4 plans, UAT 5/5, 12/12 threats closed)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-19)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 96 — Platform Integration & Node.js Diagnosis

---

## Current Position

Phase: 96 (Platform Integration & Node.js Diagnosis) — EXECUTING
Plan: 2 of 7
Status: Ready to execute
Last activity: 2026-09-20 — Phase 96 execution resumed (wave continue)

Progress: [████████████████████] 13/13 plans ([██████░░░░] 60%)

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 20
**Phases completed:** 94
**Plans completed:** 348
**Days elapsed:** 228
**Velocity:** ~1.5 plans/day (lifetime); v4.3 ran at ~9 plans/day over 8 days

Per-plan duration tables for phases 72-92 are archived with their phase artifacts under
`.planning/milestones/v4.2-phases/` and `.planning/milestones/v4.3-phases/`.

### Recent History

**v4.3 (Shipped: 2026-09-13):**

- Duration: 8 days
- Phases: 9 (84-92)
- Plans: 70 (174 tasks)
- Key: all 23 GitHub milestone #5 issues fixed in code — config path honored everywhere with hot-reload, IntelliJ targeted Java refresh and port auto-detect, composer cues in both IDEs plus SETOPTS-in-code and CVS() composers, composer robustness on both hosts, language-server responsiveness, host-side hygiene; milestone audit `tech_debt` with no gaps; override closeout (21 artifacts acknowledged). All phases now on `origin/main`.

**v4.2 (Shipped: 2026-09-06):**

- Duration: 3 days
- Phases: 6 (78-83)
- Plans: 25 (74 tasks)
- Key: Every open PRIO 1/2 IntelliJ issue (22) closed in code — EDT responsiveness, fail-closed EM token handling with owner-only temp files on Windows, `bbj/compile` on the shared language server, composer stale-edit guard, JDK 17 toolchain and pinned wrapper, IntelliJ JUnit suite 96 → 504; landed on `origin/main` via PR #651

**v4.1 (Shipped: 2026-09-03):**

- Duration: 14 days
- Phases: 8 (70-77; 76 closed by 75)
- Plans: 37
- Key: Eight advisories remediated 1:1 per phase, each fix merged via a human-gated public PR; override closeout — PROC-01/02/03 carried until a tagged release and publication

---
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 93 P01 | 25min | 3 tasks | 12 files |
| Phase 93 P02 | 35min | 3 tasks | 7 files |
| Phase 93 P03 | 20min | 3 tasks | 6 files |
| Phase 93 P04 | 5min | 3 tasks | 8 files |
| Phase 93 P05 | 15min | 3 tasks | 4 files |
| Phase 93 P06 | 40min | 3 tasks | 6 files |
| Phase 93 P07 | 10min | 3 tasks | 11 files |
| Phase 93 P08 | 20 min | 3 tasks | 4 files |
| Phase 93 P09 | 9min | 3 tasks | 4 files |
| Phase 94 P01 | 20min | 2 tasks | 4 files |
| Phase 94 P02 | 14min | 3 tasks | 5 files |
| Phase 94 P03 | 20min | 2 tasks | 3 files |
| Phase 94 P04 | 12min | 2 tasks | 1 files |
| Phase 95 P01 | 15min | 3 tasks | 9 files |
| Phase 95 P02 | 12min | 3 tasks | 6 files |
| Phase 95 P03 | 10min | 2 tasks | 3 files |
| Phase 95 P04 | 9min | 3 tasks | 7 files |
| Phase 96 P01 | 25min | 2 tasks | 3 files |

## Accumulated Context

### Active Constraints

- Disclosure constraint: no v4.1 planning artifact on `main` may describe a flaw mechanism, affected file, or exploitation path for any of the 8 unpublished advisories — opaque GHSA-id-only references only. Remediation research (`SECRETS-AND-EXEC.md`, `SUPPLY-CHAIN.md`) stays untracked via `.git/info/exclude`.
- New work lands via a branch cut from `origin/main` plus a pull request, with a per-commit register check of the source diff for planning identifiers (plan/D-xx/C-xx/COMP/CR-xx tokens) before push.
- v4.4 is IntelliJ-only: every one of the 21 issues lives in `bbj-intellij/src/main/java/...`. Anything both IDEs need stays a host-neutral language-server request — no reimplementation on the IntelliJ side.
- No live IntelliJ UI test coverage exists in CI. Verification pattern is plain-Java seams under plain JUnit 5, whole-file source guards for IDE-only wiring, and hand UAT in a running IDE per phase — build both distributables first, and again from the final tree after code-review fixes.
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require a Java classpath unavailable in the EmptyFileSystem test environment
- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation

### Decisions

Full decision log in PROJECT.md's Key Decisions table; per-phase decision detail for phases 70-92
is archived with the phase directories (v4.1 embargoed off `main`; v4.2/v4.3 tracked). Standing
decisions and the ones that bear directly on v4.4's files:

- [v4.1, standing]: No CVE is requested for any advisory during implementation; CVE and severity are decided by the maintainer at publication time (a deliberate PROC-03 departure).
- [v4.1, standing]: Whole-suite regression gate is project-wide `numFailedTests: 0` plus deterministic targeted-file runs, not a failing-suite identity delta (DEBT.md item 5).
- [v4.4 roadmap]: Phases 93-97 follow REQUIREMENTS.md's subsystem grouping, so each phase carries both its behaviour fixes and its behaviour-preserving consolidations — the alternative would edit the same files and re-run the same hand UAT twice. Risk is contained by ordering inside each phase: a consolidation goes first when it creates the home a fix must live in (COMP-06 → COMP-04, PLAT-03 → PLAT-04), last when the fix changes the shape being consolidated (IOP-02/03 → IOP-05, EM-03 → EM-04).
- [Phase 83, pinned as-is]: `NodeAvailability.decide` never consults the cached download when a configured Node path is unusable; pinned by test, decision deferred — this is exactly what PLAT-05 must now settle.
- [Phase 82/87/90]: Composer dialogs compose through `ComposerFlow` + `StaleEditGuard` + `ComposerNotices`, with previews debounced over the shared `PreviewDebouncer`/`AlarmScheduler` seam — the conventions Phase 93's consolidations must preserve.
- [Phase 79/80]: All blocking work stays off the EDT behind the `Scheduler` seam with `assertIsNonDispatchThread()` at entry; EM token handling classifies once through `JwtValidity.check` and fails closed — constrains IOP-03's peer confirmation and Phase 94's EM work.
- [Phase 92]: `BbjFileVisibility` mirrors `BbjConfigPathService`'s static-helper-plus-thin-wrapper convention; widget visibility reads `file.getFileType().getName()`, never the extension — the shape IOP-05's widget base must keep.
- [Phase 83]: LSP4IJ coupling is fenced by signature canaries, class-file marker assertions and an eleven-file symbol-level import allowlist that fails on drift anywhere in `src/main/java`.
- [Phase 93]: NamedColorUtil.getErrorForeground() confirmed against the 2024.2 platform jar; clip() reconciled to the cached-FontMetrics variant; setOKActionEnabled(false) stays local to each dialog's wrapper, never moved into the shared helper
- [Phase 93]: SETOPTS raw-tail validity rule moved server-side (MAX_RAW_TAIL_DIGITS=14, single RAW_TAIL_PATTERN regex); valid/rawTailError on SetOptsPreview and valid on the composeTriState result reach both hosts, fail-closed on a missing key
- [Phase 93]: MALFORMED_EDIT deliberately reuses Severity.WARNING (shared with STALE_DOCUMENT) rather than adding a fifth Severity constant; ComposerNoticesTest's severity assertion moved from a distinctness count to an explicit per-reason severity table
- [Phase 93]: openSetoptsInCodeAbsolute's hexRange guard folds null-check and length-check into one ComposerEditRanges.isUsable(...) call, since that write path had no separate null check and no insert-offset fallback to preserve
- [Phase 93]: COMP-08 shipped as abstract ComposerIntentionBase + 5 thin no-arg Configure*Intention subclasses (platform-forced deviation from #618's 'single data-driven registration' wording -- IntelliJ's <intentionAction> extension point instantiates only via a no-arg constructor with no registration identity, so one class cannot vary text/Kind/keyword); close #618 as done with this reasoning, not as partially implemented
- [Phase 93]: ComposerCatalogsCheck reuses ComposerNotices.notReady (never MALFORMED_EDIT) -- a malformed catalogs payload and a malformed edit range are different failure classes
- [Phase 93]: openSetoptsInCode is the single catalogs-shape gate for both SETOPTS-in-code dialogs; the three downstream dispatch methods carry no redundant check
- [Phase 93]: Carried the addGroupedChecks tooltip branch unconditionally on the base after verifying against the addWindow catalog source that it is dead code there (COMP-06)
- [Phase 93]: prefill(...)'s title-setting statement stays in each subclass constructor (title is subclass-owned), keeping the base to a single refresh() abstract hook (COMP-06)
- [Phase 93]: BbjComposeActionBase.isAvailableFor(...) is a regular overridable method defaulting to true, not an abstract hook -- unlike ComposerIntentionBase's getText()/isAvailable(), four of six action subclasses share the literal default gate, so only kind() stays the abstract, compile-time-checked hook
- [Phase 93]: COMP-09 shipped as abstract BbjComposeActionBase + 6 thin no-arg BbjCompose*Action subclasses (deviation from #616's 'single data-driven registration' wording, per D-06) -- an AnAction could read its own id via ActionManager.getId(this), but that would turn a renamed/mistyped action id into a silent click-time no-op instead of a compile error; close #616 as done with this reasoning
- [Phase 93]: Both SETOPTS composer dialogs now gate OK/Apply on the language server's valid verdict; the last client-side validation rule in the composer surface (SetoptsComposerDialog's Java hex regex) is deleted. No second validation gate was added at ComposerLauncher's write path, per D-09 -- #607 closes on the dialog-side verdict plus the launcher's existing empty-value guards.
- [Phase 93]: Line-bound accepted band is strictly [0, lineCount) for ed.line/chain.startLine/chain.endLine, not the 93-REVIEW.md sketch's chain.endLine > lineCount (which still permits endLine == lineCount). — getLineStartOffset(int) throws IndexOutOfBoundsException on exactly that boundary value; the sketch's form would have shipped a guard that still crashes on the one value it claims to close.
- [Phase 93]: Both new SETOPTS-in-code line-bound aborts reuse ComposerNotices.malformedEdit(...) -- no new Reason or Severity added. — Same failure class as the existing hexRange/flagsRange/eventMaskRange guards (D-10 from 93-CONTEXT.md); a malformed range and a malformed line number are one user-visible failure class.
- [Phase 94]: Confirmed by inspection that after moving validateTokenServerSide/validateTokenTrusted out of BbjRunActionBase, the first BbjProcessSecretEnv.Invocation declaration and first withEnvironment( call remaining in the file are both buildWebRunCommandLine's own invocation variable, so BbjSecretArgvSourceGuardTest's pre-existing data-flow assertion continues to hold with no code change.
- [Phase 94]: [Phase 94] BbjEMLoginAction's update() gate reads e.getProject() != null only -- no ServerStatus, no BBj Home -- since EM login never talks to the language server and must keep firing the BBj-Home dialog for new users.
- [Phase 94]: [Phase 94] EM-01's temp-file cleanup needed no production change (already fixed by 06eb1a7c); EmLoginTempFileCleanupSourceGuardTest pins the ordering with four indexOf assertions, proven to fail on a deliberately narrowed scope via a throwaway helper (to keep the falsification edit compiling) and restored byte-identical before re-verifying.
- [Phase 94]: EM-04 closed on cited evidence (commit 6a55b854 + two named guards) as verified-already-true, not newly implemented; no third guard added — The invariant was already pinned twice before this plan began; a third assertion of the same fact adds nothing
- [Phase 94]: Whole-suite gate run with --rerun-tasks rather than plain test, to avoid a Task :test UP-TO-DATE no-op masking a stale green — Gradle's incremental build would otherwise silently skip re-executing tests against this phase's final edits
- [Phase 95]: InteropProbeClient uses an explicit ExecutorService for the client-role LSP4J Launcher.Builder chain (setExecutorService with newCachedThreadPool, shutdownNow in finally), per RESEARCH.md assumption A1's pre-execution spike -- no re-spike needed in 95-01
- [Phase 95]: Wrong-peer wording fixed: status label 'Java: Wrong peer', tooltip names the port-collision situation, banner points at the port setting instead of telling the user to start BBjServices
- [Phase 95]: Phase 96 PLAT-03 file-disjointness correction: 95-01 edited BbjJavaInteropNotificationProvider.java, one of the three editor notification providers PLAT-03 (#622) consolidates -- ROADMAP's Phase 96 file-disjoint claim is now false
- [Phase 95]: No third volatile field for server-started state -- checkConnection() passes a literal true (invariant: it only runs while a server-started-gated request is pending), refreshSelectionGate() reads BbjServerService.getCurrentStatus() live on the EDT; keeps the field count at exactly two (bbjFileSelected, gateWasOpen)
- [Phase 95]: BbjFileVisibility and showsForFileTypeNames widened from package-private to public so the interop-package InteropPollPolicyTest can feed the empty-selection edge case through the real predicate; showsForSelection stays package-private
- [Phase 95]: BbjJavaInteropServiceDisposalSourceGuardTest's pinned isDisposed() count widened from two to three (new startup invokeLater guard) -- Task 2 explicitly requires the third guard, which necessarily changes the count the 95-01 guard pins
- [Phase 95]: Closed #594 as done on D-11 reasoning (BbjInteropPortDetector.DEFAULT_PORT is the sole canonical port constant); no second BbjSettings-owned constant introduced. — Follows Phase 93 D-05 / Phase 94 D-05 precedent; a second constant would recreate the exact drift #594 complains about and would point platform-free InteropPortSettings/InteropPortPresentation at a PersistentStateComponent.
- [Phase 95]: IOP-05 (#620): status-bar widgets consolidated onto a generic BbjStatusBarWidgetBase<S> plus thin subclasses (Phase 93 base+thin-subclass precedent), not one data-driven class as #620's literal wording asked -- the two status enums are unrelated types — keeps every difference compile-time checked instead of a runtime no-op on a wiring mistake
- [Phase 95]: subscribeToStatusTopic's abstract-hook parameter is named messageBusConnection, not connection, so each subclass's own subscribe call matches the source guard's pre-existing literal convention — surfaced as a guard test failure during Task 3, fixed before commit
- [Phase 96]: Deleted BbjColorSettingsPage outright and its plugin.xml registration (D-01/D-03/D-04); rewrote IntelliJ docs Customization section (D-02) as the phase's one accepted departure from the v4.4-is-IntelliJ-only constraint.

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); fenced since Phase 83
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level (adjacent to PLAT-01)
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type

### Pending Todos

4 pending in `.planning/todos/pending/`. Two of them are now v4.4 requirements:

- `2026-09-06-configured-node-path-suppresses-cached-download-fallback` → PLAT-05 (Phase 96)
- `2026-09-06-live-windows-check-for-node-auto-install-failure` → PLAT-06 (Phase 96)
- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend` — env drift, not a regression
- `2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version` — fixed 2026-09-06; close-out pending

### Blockers/Concerns

- **9 advisory fixes merged to `main`, none published.** Publication waits on a tagged release, then per-advisory severity/CVE decisions by the maintainer. v4.4's 0.16.0 release (Phase 97) is the candidate trigger. Post-release checklist in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21). With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived.

- **0.15.0 is half-released.** VS Code Marketplace has 0.15.0 and tag `v0.15.0` exists; the JetBrains plugin was never published. Deliberately not reconciled (SEED-002) — 0.16.0 simply ships. Phase 97 is the first real exercise of the verify-before-publish gate, and its two publish jobs still run in parallel, so one marketplace succeeding while the other fails still needs manual reconciliation.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts:37-43`) gates on a bare TCP connect to :5008. BBjServices squats on that port without speaking the interop protocol, so 11 `linking.test.ts` interop tests switch on and fail; since 2026-09-03 the live backend also exposes `getAllClassNames`, drifting the issue447 capability test. Local whole-suite baseline is 12 failures; green with `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`.

- **Advisory review follow-ups that land in v4.4's own files** (all advisory, none blocked prior verification):
  - `79-REVIEW` IN-02 — duplicated plugin-bundle path resolution; EM-05 (#614) retires it.
  - `83-REVIEW` WR-01..WR-05 on the Node install pipeline (silent `tar` cancellation, unguarded temp cleanup masking the real exception, unclosed `tar` stdin, `endsWith("node.exe")` entry match, EDT flush in `apply()`) — Phase 96 territory.
  - `82-UI-REVIEW` — the in-dialog "Preview unavailable" label uses plain gray where the dialogs have a red `errorLabel()` convention; that red is a hardcoded `Color(0xC0392B)` rather than a theme-aware `JBColor`; `ComposerNotices.detailOf()` puts raw exception text into the balloon — Phase 93 territory.
  - `89-REVIEW` WR-01 — the VS Code composer panel always labels its primary button "Insert" even when completing or editing a call.
  - `90-SECURITY` T-90-11 — `ComposerHandleCache` has no source guard forbidding a static map; the no-cross-project-leak control is structural only.
  - `86-05-REVIEW` WR-01/WR-02 — stale-by-one-generation `previousStatus` in status classification, and no exception handling around the bounded restart wait. Accepted as residual at Phase 86 UAT.

- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260914-7tx | Fix #667: INPUT verification rules accept numeric literals/expressions (e.g. pick:(c)) | 2026-09-14 | 082d02f8 | — | [260914-7tx-fix-667-input-verification-rules-accept-](./quick/260914-7tx-fix-667-input-verification-rules-accept-/) |
| 2 | Gradle 9 migration: land #652 (wrapper 9.7.1) + #654 (IntelliJ Platform plugin 2.18.1) via PR #669 — 9.7.1 checksums, drop instrumentationTools() | 2026-09-14 | 890e1125 | — | — |
| 260914-l1o | Fix #663: RUN/CALL file targets — hover shows resolved path, Ctrl/Cmd-Click opens the program (shared resolver with #173 warning) | 2026-09-14 | f695aec4 | — | [260914-l1o-fix-663-run-and-call-file-targets-hover-](./quick/260914-l1o-fix-663-run-and-call-file-targets-hover-/) |
| 260916-7vf | Fix #671 ("Channel has been closed" — extension now owns the output channel so a restart cannot dispose it) + #672 (a transient unreadable config.bbx no longer restarts the language server) | 2026-09-16 | 3e5ecaa5 | — | [260916-7vf-fix-671-stale-outputchannel-and-672-spur](./quick/260916-7vf-fix-671-stale-outputchannel-and-672-spur/) |
| 260916-9jy | SEED-001: BbjEMTokenStore.resolveBackend() classifies from the public PasswordSafe.isMemoryOnly() instead of the internal PasswordSafeSettings/ProviderType, unblocking the verifyPlugin INTERNAL_API_USAGES gate that failed the v0.15.0 release; folds in running verifyPlugin in PR validation + preview (ci: 54960905) | 2026-09-16 | 1c80dfb1 | — | [260916-9jy-drop-the-internal-passwordsafesettings-a](./quick/260916-9jy-drop-the-internal-passwordsafesettings-a/) |
| 260917-9ei | SEED-002 (both parts): one verification job now gates every publish, tag and push in manual-release.yml (5 jobs) and preview.yml (4 jobs + concurrency group); Part B caches the verifier's ~211 MB plugin downloads in all three verifyPlugin jobs, IDE distributions deliberately not cached | 2026-09-17 | fa2c80bf | — | [260917-9ei-verify-before-publish-in-the-release-and](./quick/260917-9ei-verify-before-publish-in-the-release-and/) |

---

## Session Continuity

Last session: 2026-09-20T01:14:48.249Z
Stopped at: Completed 96-01-PLAN.md
Resume file: None

Next: `/gsd-discuss-phase 95` or `/gsd-plan-phase 95`.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| debug_sessions | g-88-1-hover-no-decode | diagnosed (G-88-1 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-2-composer-never-activates | diagnosed (G-88-2 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-2-docker-pull-hang | diagnosed (resolved per 88-UAT) | 2026-09-13 | v4.3 |
| debug_sessions | g-88-3-composer-mask-literal-quoting | diagnosed (G-88-3 resolved in Phase 88) | 2026-09-13 | v4.3 |
| debug_sessions | g-89-3-cvs-composer-unfinished-call | diagnosed (G-89-3 fixed by 89-14..16) | 2026-09-13 | v4.3 |
| debug_sessions | refresh-stream-closed | diagnosed (G-86-1 fixed by 86-05) | 2026-09-13 | v4.3 |
| quick_tasks | 1-fix-duplicate-bbj-output-channels-create | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 2-fix-em-login-bbj-not-found-in-intellij-p | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 3-fix-duplicate-bbj-output-channel-ensure- | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 4-fix-intellij-bui-dwc-passing-dash-as-con | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 5-fix-em-token-expiration-jwt-expiry-check | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 6-fix-em-login-bbj-and-em-validate-token-b | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 7-add-client-info-string-to-em-auth-token- | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 8-fix-documentation-links-add-jetbrains-ma | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 9-automate-jetbrains-marketplace-publishin | missing | 2026-09-13 | v4.3 |
| quick_tasks | 10-fix-intellij-maintoolbar-group-registrat | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 11-enhance-em-auth-token-info-string-change | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 12-use-actual-jetbrains-ide-product-name-in | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 13-fix-intellij-multi-instance-language-ser | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 14-fix-manual-release-workflow-pass-version | unknown | 2026-09-13 | v4.3 |
| quick_tasks | 260329-oqw-pr-383-return-undefined-instead-of-empty | unknown | 2026-09-13 | v4.3 |
| debug_sessions | compile-diagnostic-getmessage-nosuchmethoderror | diagnosed (fixed by 81-07) | 2026-09-06 | v4.2 |
| debug_sessions | compile-error-response-message-could-not-be-parsed | diagnosed (fixed by 81-06) | 2026-09-06 | v4.2 |
| debug_sessions | compile-output-directory-row-not-visible | diagnosed (fixed by 81-04) | 2026-09-06 | v4.2 |
| debug_sessions | composer-intention-description-missing | diagnosed (fixed by 82-04) | 2026-09-06 | v4.2 |
| debug_sessions | windows-owner-only-tmp-error18 | diagnosed (fixed by 80-05) | 2026-09-06 | v4.2 |
| todos | 2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md | (presence-only) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-configured-node-path-suppresses-cached-download-fallback.md | promoted to PLAT-05 (v4.4 Phase 96) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-live-windows-check-for-node-auto-install-failure.md | promoted to PLAT-06 (v4.4 Phase 96) | 2026-09-06 | v4.2 |
| debug_sessions | constructor-completion | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | deprecated-strikethrough | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | prefix-diagnostic-reconciliation | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | prefix-reconciliation-final | diagnosed | 2026-09-03 | v4.1 |
| debug_sessions | use-import-static-completion | diagnosed | 2026-09-03 | v4.1 |
| todos | 2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md | (presence-only) | 2026-09-03 | v4.1 |
| todos | 2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md | (presence-only) | 2026-09-03 | v4.1 |
| uat_gaps | 59/59-UAT.md (archived v3.9) | passed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-final-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 34/34-re-UAT.md (archived v3.2) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 29/29-UAT.md (archived v3.1) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 30/30-UAT.md (archived v3.1) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 24/24-UAT.md (archived v3.0) | diagnosed | 2026-09-03 | v4.1 |
| uat_gaps | 25/25-UAT.md (archived v3.0) | diagnosed | 2026-09-03 | v4.1 |
| verification_gaps | 50/50-VERIFICATION.md (archived v3.7) | human_needed | 2026-09-03 | v4.1 |
| verification_gaps | 46/46-VERIFICATION.md (archived v3.5) | gaps_found | 2026-09-03 | v4.1 |
| verification_gaps | 17/17-VERIFICATION.md (archived v2.0) | gaps_found | 2026-09-03 | v4.1 |
| verification_gaps | 11/11-VERIFICATION.md (archived v1.2) | human_needed | 2026-09-03 | v4.1 |
| verification_gaps | 10/10-VERIFICATION.md (archived v1.1) | gaps_found | 2026-09-03 | v4.1 |

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |
| v2.0 Langium 4 Upgrade | 14-20 | 11 | 2026-02-04 |
| v2.1 Feature Gap Analysis | N/A | N/A | 2026-02-04 |
| v2.2 IntelliJ Build & Release Automation | 21-23 | 3 | 2026-02-05 |
| v3.0 Improving BBj Language Support | 24-27 | 11 | 2026-02-06 |
| v3.1 PRIO 1+2 Issue Burndown | 28-31 | 13 | 2026-02-07 |
| v3.2 Bug Fix Release | 32-34 | 10 | 2026-02-08 |
| v3.3 Output & Diagnostic Cleanup | 35-39 | 6 | 2026-02-08 |
| v3.4 0.8.0 Issue Closure | 40-43 | 4 | 2026-02-08 |
| v3.5 Documentation for 0.8.0 Release | 44-47 | 7 | 2026-02-09 |
| v3.6 IntelliJ Platform API Compatibility | 48-49 | 2 | 2026-02-10 |
| v3.7 Diagnostic Quality & BBjCPL Integration | 50-53 | 7 | 2026-02-20 |
| v3.8 Test & Debt Cleanup | 54-56 | 7 | 2026-02-20 |
| v3.9 Quick Wins | 57-59 | 8 | 2026-02-21 |
| v4.0 Stability and Quality | 60-69 | 62 | 2026-08-20 |
| v4.1 Security Advisory Remediation | 70-77 | 37 | 2026-09-03 |
| v4.2 IntelliJ Burn-down | 78-83 | 25 | 2026-09-06 |
| v4.3 Polish & Quality | 84-92 | 70 | 2026-09-13 |
| v4.4 IntelliJ Focus | 93-97 | in progress | — |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-09-17 after v4.4 roadmap creation (Phases 93-97, 25/25 requirements mapped).
Per-plan metrics and per-phase decision detail for phases 70-92 now live with their archived phase
artifacts; this file is a digest again.*

## Operator Next Steps

- Discuss or plan Phase 93 (`/gsd-discuss-phase 93` or `/gsd-plan-phase 93`)
- Line up a real Windows machine before Phase 96's UAT — PLAT-06 is a human attestation that no Linux run can close, and it has been carried since v4.2
- Phase 97 is the first real exercise of the verify-before-publish gate and the maintainer's trigger for the v4.1 advisory publication decision (PROC-03)
- Carried forward: triage the UAT-log issues #659-#662 and the SETOPTS discoverability follow-up #666 (both deferred out of v4.4)
- `WINDOWS.md` entry 1 still blocks `/gsd-ship` under `windows_enforce`
