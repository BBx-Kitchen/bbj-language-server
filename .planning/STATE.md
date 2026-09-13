---
gsd_state_version: 1.0
milestone: v4.3
milestone_name: Polish & Quality (Phases 84-92) — IN PROGRESS
current_phase: 92
status: completed
stopped_at: Phase 92 complete — all phases complete
last_updated: "2026-09-13T09:01:27.992Z"
last_activity: 2026-09-13
last_activity_desc: Phase 92 complete
state_head: 7c74103147d6f7dbb147f498c9b51833ed995328
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 70
  completed_plans: 70
  percent: 100
---

# Project State: BBj Language Server

**Last Updated:** 2026-09-13 (Phase 92 complete — live IntelliJ tab-switch UAT passed 1/1 on the first round; all nine v4.3 phases done, milestone ready to close)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-13)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v4.3 Polish & Quality milestone close (all phases 84-92 complete)

---

## Current Position

Phase: 92
Plan: Not started
Status: All phases complete
Last activity: 2026-09-13 — Phase 92 complete

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 19
**Phases completed:** 85
**Plans completed:** 278
**Days elapsed:** 217
**Velocity:** ~1.2 plans/day (lifetime); v4.2 ran at ~8 plans/day over 3 days

### Recent History

**v4.2 (Shipped: 2026-09-06):**

- Duration: 3 days
- Phases: 6 (78-83)
- Plans: 25 (74 tasks)
- Key: Every open PRIO 1/2 IntelliJ issue (22) closed in code — EDT responsiveness, fail-closed EM token handling with owner-only temp files on Windows, `bbj/compile` on the shared language server, composer stale-edit guard, JDK 17 toolchain and pinned wrapper, IntelliJ JUnit suite 96 → 504; override closeout (no milestone audit, 8 artifacts deferred); landed on `origin/main` via PR #651 (preview 0.12.28)

**v4.1 (Shipped: 2026-09-03):**

- Duration: 14 days
- Phases: 8 (70-77; 76 closed by 75)
- Plans: 37
- Key: Eight advisories remediated 1:1 per phase, each fix merged to `main` via a human-gated public PR with red-then-green regression coverage; override closeout — PROC-01/02/03 carried as known gaps until a tagged release and publication

**v4.0 (Shipped: 2026-08-20):**

- Duration: 181 days
- Phases: 10 (60-69)
- Plans: 62
- Key: Review-and-hardening pass across the repo; cross-cutting security audit surfaced 9 advisories, 1 fixed in-phase (GHSA-p5f3-9456-9pcx, PR #637), 8 carried into v4.1

**v3.9 (Shipped: 2026-02-21):**

- Duration: 1 day
- Phases: 3 (57-59)
- Plans: 8
- Key: Bug fixes, grammar additions (EXIT/SERIAL/ADDR), Java class reference features (.class, static methods, deprecated, constructors)

**v3.8 (Shipped: 2026-02-20):**

- Duration: 1 day
- Phases: 3 (54-56)
- Plans: 7
- Key: Fixed all test failures, re-enabled disabled assertions, removed dead code, resolved all production FIXMEs

---
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 72 P01 | 55min | 2 tasks | 6 files |
| Phase 72 P02 | 50min | 2 tasks | 2 files |
| Phase 72 P03 | 45min | 1 tasks | 1 files |
| Phase 72-remediate-ghsa-c4hw-5j83-cx5h P04 | 15min | 1 tasks | 1 files |
| Phase 72 P05 | 20 min | 3 tasks | 2 files |
| Phase 73 P01 | 18min | 3 tasks | 6 files |
| Phase 73 P02 | 25min | 2 tasks | 3 files |
| Phase 73 P03 | 25min | 3 tasks | 1 files |
| Phase 74 P01 | 55min | 3 tasks | 8 files |
| Phase 74 P02 | 35min | 3 tasks | 4 files |
| Phase 74 P03 | 20min | 1 tasks | 1 files |
| Phase 75 P01 | 65min | 3 tasks | 9 files |
| Phase 75 P02 | 58min | 3 tasks | 10 files |
| Phase 75 P03 | 14min | 3 tasks | 5 files |
| Phase 75 P04 | 8 min | 3 tasks | 4 files |
| Phase 75 P05 | 26min | 3 tasks | 1 files |
| Phase 75 P06 | 65min | 2 tasks | 2 files |
| Phase 77 P01 | 20min | 3 tasks | 6 files |
| Phase 77 P02 | 12min | 3 tasks | 1 files |
| Phase 77 P03 | 10min | 3 tasks | 5 files |
| Phase 77 P04 | 20min | 3 tasks | 3 files |
| Phase 77 P05 | 15min | 3 tasks | 2 files |
| Phase 77 P06 | 20min | 1 tasks | 1 files |
| Phase 77 P07 | 35min | 2 tasks | 1 files |
| Phase 78 P01 | 17min | 3 tasks | 4 files |
| Phase 78 P02 | 20min | 3 tasks | 6 files |
| Phase 78 P03 | 52min | 3 tasks | 3 files |
| Phase 79 P01 | 25min | 3 tasks | 13 files |
| Phase 79 P02 | ~15min | 3 tasks | 10 files |
| Phase 79 P03 | 20min | 3 tasks | 7 files |
| Phase 80 P01 | 45min | 3 tasks | 6 files |
| Phase 80 P02 | 70 min | 3 tasks | 5 files |
| Phase 80 P03 | ~30min | 3 tasks | 5 files |
| Phase 80 P04 | 30min | 3 tasks | 7 files |
| Phase 80 P05 | ~15min | 2 tasks | 3 files |
| Phase 81 P01 | 15min | 3 tasks | 10 files |
| Phase 81 P02 | 15min | 3 tasks | 7 files |
| Phase 81 P03 | 18min | 3 tasks | 4 files |
| Phase 81 P04 | 10min | 3 tasks | 7 files |
| Phase 81 P05 | 12min | 3 tasks | 6 files |
| Phase 81 P06 | 13min | 3 tasks | 8 files |
| Phase 81 P07 | 15min | 3 tasks | 5 files |
| Phase 82 P01 | 15min | 3 tasks | 7 files |
| Phase 82 P02 | 13min | 3 tasks | 7 files |
| Phase 82 P03 | 12min | 3 tasks | 6 files |
| Phase 82 P04 | 10min | 3 tasks | 14 files |
| Phase 83 P01 | 63min | 3 tasks | 12 files |
| Phase 83 P02 | 27min | 3 tasks | 10 files |
| Phase 83 P03 | 23min | 3 tasks | 7 files |
| Phase 84 P01 | 35min | 3 tasks | 6 files |
| Phase 84 P02 | 20min | 3 tasks | 6 files |
| Phase 84 P04 | 12min | 3 tasks | 11 files |
| Phase 84 P03 | 25min | 3 tasks | 7 files |
| Phase 84 P05 | 25min | 3 tasks | 12 files |
| Phase 84 P06 | 20min | 3 tasks | 9 files |
| Phase 85 P01 | 17min | 3 tasks | 6 files |
| Phase 85 P05 | 5min | 2 tasks | 2 files |
| Phase 85 P02 | 25min | 3 tasks | 4 files |
| Phase 85 P03 | 22min | 3 tasks | 3 files |
| Phase 85 P04 | 25min | 3 tasks | 9 files |
| Phase 86 P01 | 14min | 3 tasks | 11 files |
| Phase 86 P02 | 20min | 3 tasks | 8 files |
| Phase 86 P04 | 3min | 2 tasks | 4 files |
| Phase 86 P03 | 15min | 3 tasks | 7 files |
| Phase 86 P05 | 40min | 3 tasks | 8 files |
| Phase 87 P01 | 12min | 3 tasks | 9 files |
| Phase 87 P02 | 15min | 3 tasks | 4 files |
| Phase 87 P03 | 8min | 3 tasks | 8 files |
| Phase 88 P01 | 55min | 3 tasks | 5 files |
| Phase 88 P02 | 40min | 3 tasks | 5 files |
| Phase 88 P03 | 15min | 3 tasks | 6 files |
| Phase 88 P04 | 15min | 3 tasks | 7 files |
| Phase 88 P06 | 20min | 3 tasks | 5 files |
| Phase 88 P05 | 25min | 3 tasks | 13 files |
| Phase 88 P07 | 20min | 2 tasks | 3 files |
| Phase 88 P10 | 25min | 3 tasks | 9 files |
| Phase 88 P11 | 20min | 3 tasks | 4 files |
| Phase 88 P12 | 20min | 3 tasks | 9 files |
| Phase 88 P13 | 35min | 3 tasks | 4 files |
| Phase 88 P14 | 30min | 3 tasks | 3 files |
| Phase 88 P15 | ~20min | 3 tasks | 6 files |
| Phase 89 P01 | 14min | 3 tasks | 12 files |
| Phase 89 P02 | 20min | 2 tasks | 7 files |
| Phase 89 P03 | 17min | 2 tasks | 5 files |
| Phase 89 P04 | 8min | 3 tasks | 11 files |
| Phase 89 P05 | 14min | 2 tasks | 6 files |
| Phase 89 P07 | 25min | 2 tasks | 9 files |
| Phase 89 P06 | 6min | 3 tasks | 2 files |
| Phase 89 P08 | 10min | 2 tasks | 8 files |
| Phase 89 P09 | 25min | 2 tasks | 6 files |
| Phase 89 P10 | 12min | 2 tasks | 8 files |
| Phase 89 P11 | 25min | 2 tasks | 10 files |
| Phase 89 P12 | 12min | 2 tasks | 5 files |
| Phase 89 P13 | 28min | 2 tasks | 5 files |
| Phase 89 P14 | 16min | 2 tasks | 7 files |
| Phase 89 P15 | 15min | 3 tasks | 11 files |
| Phase 89 P16 | 13min | 2 tasks | 3 files |
| Phase 90 P01 | 45min | 3 tasks | 6 files |
| Phase 90 P02 | 40min | 2 tasks | 8 files |
| Phase 90 P03 | 25min | 2 tasks | 9 files |
| Phase 90 P04 | 25min | 2 tasks | 5 files |
| Phase 90 P05 | 20min | 3 tasks | 13 files |
| Phase 90 P06 | 30min | 2 tasks | 4 files |
| Phase 90 P07 | 25min | 3 tasks | 9 files |
| Phase 90 P08 | 35min | 2 tasks | 3 files |
| Phase 91 P01 | 21min | 3 tasks | 4 files |
| Phase 91 P02 | 12min | 2 tasks | 2 files |
| Phase 91 P03 | ~35min | 3 tasks | 3 files |
| Phase 91 P04 | ~25min | 2 tasks | 2 files |
| Phase 91 P05 | ~20min | 2 tasks | 3 files |
| Phase 91 P06 | ~5min | 2 tasks | 0 files |
| Phase 92 P01 | 15min | 2 tasks | 4 files |
| Phase 92 P02 | 5min | 2 tasks | 2 files |
| Phase 92 P03 | 4min | 2 tasks | 5 files |
| Phase 92 P04 | ~12min | 2 tasks | 3 files |
| Phase 92 P05 | ~20min | 2 tasks | 2 files |
| Phase 92 P06 | ~20min | 2 tasks | 0 files |

## Accumulated Context

### Active Constraints

- Disclosure constraint: no v4.1 planning artifact on `main` may describe a flaw mechanism, affected file, or exploitation path for any of the 8 unpublished advisories — opaque GHSA-id-only references only (see REQUIREMENTS.md disclosure notice)
- Per-phase implementation detail (findings, fix design, tests) lives inside each advisory's private fork, not under `.planning/phases/` on `main`
- Remediation RESEARCH is likewise untracked (`.git/info/exclude`): `SECRETS-AND-EXEC.md` and `SUPPLY-CHAIN.md` exist on disk only. Naming a file plus the control to add to it discloses that the control is absent — "best-practice framing" does not sanitise that. Copy the relevant sections into each private fork when its phase starts.
- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment
- v4.2 sequencing: TOKEN-01 (#535) must land before TOKEN-04 (#542) — a trust-window cache built on a fail-open expiry check widens the vulnerability. Phase 83 (BUILD-04, BUILD-05) depends on Phase 79 (EDT paths) and Phase 81 (new `bbj/compile` surface) landing first.

### Decisions

Full decision log in PROJECT.md Key Decisions table. Per-phase decision detail for phases
70-77 was archived with the phase directories under `.planning/milestones/v4.1-phases/`
(embargoed, off `main`) and removed from this file at the v4.1 close — it described fix
mechanisms for advisories that are still unpublished. Standing decisions that still apply:

- [v4.1, standing]: No CVE is requested for any v4.1 advisory during implementation; CVE
  and severity are decided by the maintainer at publication time (a deliberate PROC-03
  departure, recorded per phase).
- [v4.1, standing]: Whole-suite regression gate is project-wide `numFailedTests: 0` plus
  deterministic targeted-file runs, not a failing-suite identity delta (DEBT.md item 5).
- [v4.1, landing shape]: An advisory's private fork cannot take a same-repo pull request
  (its base resolves to the public repo), so every fix landed via a normal public PR under a
  recorded PROC-01 waiver.
- [Phase 74 UAT]: Three post-hoc code-review findings accepted as residual before
  publication; detail embargoed.
- [Phase 77 UAT]: Two human-attestation items closed at the UAT checkpoint 2026-09-03;
  detail embargoed.
- [Phase 59]: Two-phase resolveClass: synchronously set isStatic/deprecated before
  registering in resolvedClasses
- [Phase 59]: isClassRef via SymbolRef.symbol.ref → isJavaClass for static-only completion
  filtering
- [v4.2 roadmap]: Phases 78-83 derived from research's 8-phase grouping, merged to 6:
  build foundation (78) gates every `./gradlew` invocation; EDT shared-state guards and the
  new caching layer merged into one EDT Responsiveness phase (79); the compile action and
  lexer/commenter fixes merged into one Feature Parity phase (81), matching the
  REQUIREMENTS.md category boundary; LSP4IJ coupling tests deferred to a final Regression
  Test Hardening phase (83) so it can cover both the EDT paths and the new compile surface.
- [Phase 78]: 78-01: Daemon JVM criteria (toolchainVersion=17) plus a compile/test toolchain block fix #570; foojay resolver proven end-to-end with a real Temurin 17.0.20.1 download for the self-heal path. — Gradle 8.x cannot run its daemon on Java 25; the daemon JVM criteria file steers the daemon itself, which a build-script-level toolchain block alone cannot do.
- [Phase 78]: 78-02: Wrapper regenerated to Gradle 8.14.5 via the wrapper task run twice, checksums verified live against services.gradle.org, and buildPlugin proven on intellij-platform-gradle-plugin 2.11.0 after installing missing host fontconfig/libfreetype6 packages (unrelated to the version bump).
- [Phase 78]: 78-03: fail-fast bundle guard scoped via gradle.taskGraph.hasTask(buildPlugin|prepareSandbox|runIde) so the pre-existing test-sandbox coupling (intellij-platform-gradle-plugin's prepareTestSandbox needing a composed jar) never fails ./gradlew test on a clean clone — Two Rule-1 fixes discovered only by running the build: processResources->classes->test coupling (fixed by moving copyLanguageServer's output outside sourceSets.main.output) and the deeper plugin-internal test-sandbox coupling (fixed by scoping the guard's throw to packaging tasks only)
- [Phase 79]: Phase 79 Plan 01: Task 1 redirected all six external restart call sites (not just BbjRestartServerAction) because making doRestart() private broke compilation for the others (Rule 3 blocking-issue auto-fix); Task 2 still delivered its own scoped source-guard coverage.
- [Phase 79]: Phase 79 Plan 01: the in-file crash-balloon Restart action (notifyCrash()) was also redirected through requestRestart(0), a superset of D-06 matching #539's 'all triggers' literally.
- [Phase 79]: Phase 79 Plan 02: BbjNodeVersionCache memoizes node --version keyed on path + file stat (lastModified+length); KeystrokeDebouncer over the 79-01 Scheduler seam cancels only its own pending task (never cancelAll), keeping two Settings fields on one Alarm independent; BbjSettingsLookups isolates all Settings-dialog file/subprocess work off the EDT. — EDT-02/EDT-03 (#541, #543): a per-path stat-keyed cache avoids re-spawning node --version on every notification refresh, and a debounced background lookup with staleness discard removes all keystroke-path filesystem/subprocess work from the EDT while keeping the two settings fields independently coalesced.
- [Phase 79]: Phase 79 Plan 03: DownloadGuard.tryAcquire performs the compare-and-set and completion-attachment under one lock, acquired before the Task.Backgroundable is queued (the actual EDT-06 fix, since the old persisted flag was set only after a second caller could already pass the check); assertIsNonDispatchThread() compiled without a ThreadingAssertions substitution on this platform. — EDT-06 (#537) and EDT-01 (#506) verify-and-close; both close phase 79's remaining requirements
- [Phase 79 UAT]: Three live-IDE checks (classpath preserved across Settings reset, Run As BUI/DWC + EM login with the off-EDT assertion, Apply inside the debounce window after WR-03's flush) passed by hand on 2026-09-04 against a plugin built from main @ bb11133; the WR-03 synchronous-flush-on-Apply tradeoff is accepted.
- [Phase 80]: 80-01: One three-valued JwtValidity.check classification replaces four independent fail-open return-false sites; a decimal exp value regex bug (silently truncated to a verdict) was caught and fixed during Task 2's red-then-green cycle — D-03/D-04: single decode prevents a partial fix from missing a branch; performLogin now classifies before storeToken so an unusable EM login result never reaches PasswordSafe (D-05)
- [Phase 80]: 80-02: createOwnerOnlyFile has three outcomes and no fourth (posix attribute, acl:acl attribute supplied at creation, or a fail-closed IOException); the default-permission fallback is deleted rather than demoted, and selectOwnerOnlyStrategy is package-private purely so its otherwise-unreachable failure branch is testable on a host that always reports posix.
- [Phase 80]: 80-02: the Windows ACL branch is proven by a pure OwnerOnlyAcl builder test, a strategy-selection test over synthetic view sets and seven source guards, never by an executed Windows run (CI is ubuntu-latest, no Windows runner); the icacls DACL check and the write-through login check are carried as human UAT items required for #536 closure.
- [Phase 80]: Phase 80: 80-03: resolveBackend() is the sole PasswordSafeSettings/ProviderType touch point, placed last in BbjEMTokenStore.java; BackendNoticePolicy warns once per distinct non-keychain backend and resets on keychain; a Task 3 source guard caught TokenBackend's own javadoc leaking the literal ProviderType, fixed by rewording (Rule 1).
- [Phase 80]: Phase 80 Plan 04: TokenValidationCache is a static AtomicReference<Entry> memo keyed on the SHA-256 digest of the token's UTF-8 bytes, five-minute window checked on read with no timer; storeToken/deleteToken invalidate unconditionally, and validateTokenTrusted collapses BUI/DWC's duplicated server-validation calls onto one base-class entry point — TOKEN-04 (#542): two Run invocations in quick succession with the same token now validate at most once; the trust window is a UX optimisation only since web.bbj still presents the token to EM at every launch
- [Phase 80]: Widened the Windows owner ACE by exactly READ_NAMED_ATTRS and WRITE_NAMED_ATTRS (ten permissions), not full control — Windows folds FILE_READ_EA/FILE_WRITE_EA into GENERIC_READ/GENERIC_WRITE; an access check denies the whole open when any bit is ungranted; ten bits is the surgical fix, fourteen is the escalation reserved for a failing Windows recheck.
- [Phase 80 UAT]: All six live-IDE checks passed by hand. The Windows owner-ACE write-through check (G-80-1) first failed with BBj !ERROR=18, was fixed by 80-05, and passed on 2026-09-05 against a plugin built from main @ 232d321. TOKEN-01..04 (#535, #536, #552, #542) closed.
- [Phase 81]: Phase 81 Plan 01: bbj/compile re-homes the 20-entry compiler-option table into a vscode-free compiler-options.ts driven by a plain CompilerConfigReader; BBjCPLService.compileWithOptions never touches the abort-on-resave inFlight map so an explicit compile and a background validate-only compile of the same file never cancel each other. — PARITY-01 (#571): IntelliJ's compile action must reach bbjcpl through the shared language server with zero duplicated bbjcpl-invocation logic; compilerOutputDirectory reaches the server via the flat initializationOptions key (compilerTrigger's channel), not config.compiler, per RESEARCH.md's correction that IntelliJ's createSettings() never resolves that path.
- [Phase 81]: [Phase 81] Phase 81 Plan 02: BbjStringCommentScanner is a plain-Java seam (scanString/scanComment/isCommentStart) mirroring the grammar's STRING_LITERAL/COMMENT terminals; BbjWordLexer dispatches to it ahead of the word branch and BbjParserDefinition/BbjPairedBraceMatcher are wired to the new STRING/COMMENT token types, so bracket characters inside a string or rem comment are never classified as brackets (#568, PARITY-02).
- [Phase 81]: Phase 81 Plan 03: RemToggleSeam is a plain-Java seam (isCommented/comment/uncomment) recognizing rem in any case via direct ASCII comparison (never toLowerCase/equalsIgnoreCase, proven locale-independent under Turkish default locale); BbjCommenter implements both Commenter and SelfManagingCommenter<CommenterDataHolder>, delegating every line decision to the seam with the insert hard-coded to column 0 — PARITY-03 (#540): a rem/Rem/REM line now round-trips through Ctrl+/ instead of stacking a second prefix.
- [Phase 81]: [Phase 81]: Phase 81 Plan 04: CompilerInitOptions is a plain-Java seam (COMPILER_OUTPUT_DIRECTORY_KEY, normalizeOutputDirectory) with no IntelliJ import; the value reaches the server through the flat compilerOutputDirectory initializationOptions key in BbjLanguageServerFactory, not through BbjLanguageClient.createSettings(), which LSP4IJ 0.19.0 resolves to null for this plugin's flat settings object — BbjLanguageClient stays deliberately unchanged and a source guard pins that.
- [Phase 81]: Phase 81 Plan 05: bbj/compile is declared directly on BbjComposerServer (not a new sibling interface) since getServerInterface() returns exactly one interface (RESEARCH.md Pitfall 5); CompileResultPresenter is a plain-Java seam dispatching on the machine-readable reason (never message prose, D-10); Task.Backgroundable asserts assertIsNonDispatchThread() as its first statement before any blocking LSP4IJ call, mirroring the Phase 79 convention; a 45s client-side wait bounds both requests, comfortably above the server's own 30s compile timeout.
- [Phase 81]: Phase 81 Plan 06: END_OF_LINE_CHARACTER pinned to the LSP uinteger max (2147483647), not the real line length; both whole-line-range sites (bbj-cpl-parser.ts, bbj-document-validator.ts) import one shared lsp-position.ts constant — G-81-4: bbjcpl reports no column and no source text is in hand at either emitting site; Number.MAX_SAFE_INTEGER overflowed LSP4IJ's int-typed Position.character and crashed the compile-error balloon with MessageIssueException
- [Phase 81]: Phase 81 Plan 06: JUnit boundary test's negative control asserts RuntimeException, not com.google.gson.JsonParseException — LSP4IJ's MessageJsonHandler wraps the Gson failure in its own MessageIssueException, confirmed empirically before asserting — The plan itself pre-authorized widening to RuntimeException if the thrown type turned out broader; confirmed via a throwaway debug run rather than guessed
- [Phase 81]: Phase 81 Plan 07: LSP4IJ Gradle pin raised from 0.19.0 to 0.21.0 (kept, not reverted) -- resolved cleanly, whole IntelliJ module green at 326 tests, buildPlugin archive produced; CompileResultPresenter.messageTextOf reads a diagnostic's message reflectively (getMessage resolved by name, normalised across a plain string, either branch of a two-branch value, or a markup value's own text) since a plugin descriptor cannot pin the runtime version of a dependency plugin's vendored client library -- closes G-81-5's NoSuchMethodError.
- [Phase 81 UAT]: All six live-IDE checks passed by hand 2026-09-05. Two gaps found and closed in-phase: G-81-4 (`Number.MAX_SAFE_INTEGER` overflowed LSP4IJ's int `Position`, fixed by 81-06) and G-81-5 (`Diagnostic.getMessage()` signature skew between the 0.19.0 build pin and the IDE's LSP4IJ 0.21.0, fixed by 81-07); the final re-check rendered `16:1 Syntax error: xdd`. G-81-3 withdrawn: a Marketplace auto-update replaced the local 0.1.0 build mid-session. PARITY-01..03 (#571, #568, #540) closed.
- [Phase 82]: [Phase 82]: 82-01: ComposerFlow's terminal handle() unwraps CompletionException/ExecutionException before classifying, so a NotReadySignal thrown at any nesting depth is recognized regardless of wrapper layers; ComposerNotices is the shared reason-keyed notice vocabulary 82-02/82-03 build on.
- [Phase 82]: Phase 82: 82-02: ComposerFlow.observe/once seam lets each dialog's refresh() check its own sequence before touching state, so a superseded success or failure is discarded identically; ComposerLauncherChainSourceGuardTest's whole-file 'exactly one handle()' assertion was rescoped to launch()'s own body since observe() legitimately owns a second, independent terminal handler for its own chain.
- [Phase 82]: [Phase 82]: 82-03: StaleEditGuard.applyIfUnchanged re-decodes the captured line's current text and modification stamp, re-runs the same decodeCall the launch used, and writes only on a full-decode match with the stamp re-checked as the write command's first statement; DecodeEquality compares found/edit/initial/trailingArgs field-wise with Arrays.equals for int[] ranges; all three edit-in-place apply paths (MSGBOX, addWindow, addChildWindow) now route through the guard, closing COMP-02 (#567).
- [Phase 82 UAT]: Round 1 (2026-09-05) passed 5/7 with one gap: every lightbulb preview threw `PluginException: Intention Description Dir URL is null` (G-82-6), closed by 82-04. Round 2 passed 8/8 by hand against the rebuilt plugin; test 3 (server-stopped balloon) is accepted from code because `BbjComposerService.server` auto-restarts a stopped server. COMP-01/COMP-02 (#538, #567) closed; VALIDATION nyquist-compliant (12 tasks), SECURITY threats_open 0 (27 threats).
- [Phase 82]: [Phase 82]: Phase 82 Plan 04 (gap closure G-82-6): shipped intentionDescriptions/<SimpleClassName>/ resource trees for the three composer intentions and switched generatePreview to IntentionPreviewInfo.Html on all three, closing the PluginException "Intention Description Dir URL is null" thrown on every lightbulb preview computation. Both halves kept deliberately redundant per the plan's flagged assumption; IntentionDescriptionResourcesTest derives its subject list from plugin.xml (never a hard-coded class array) so a future intention is covered automatically.
- [Phase 83]: Phase 83 Plan 01: NodeInstallPipeline seam with injected Target/Fetcher/Progress/CancelProbe drives the whole Node.js download pipeline under plain JUnit 5 against committed fixtures; fixture digests are literal pins transcribed from a provenance README (never test-computed, or the verify step is vacuous); the 79-REVIEW symlink-following delete bug is fixed via a no-follow-links Files.walkFileTree; DownloadCompletions.dispatch isolates one throwing UI-refresh completion from the rest.
- [Phase 83]: Phase 83 Plan 02: Settings-lookup catch lives at the lookup layer (BbjSettingsLookups), not the debouncer, so a throwing lookup returns a failure-marked NodeLookup/HomeLookup instead of leaving the dialog stuck; NodeAvailability extracts the missing-Node banner decision into a plain-Java seam so both branches execute under plain JUnit; a configured-but-unusable Node path never falls back to the cached download, pinned as-is and filed as a todo
- [Phase 83]: Phase 83 Plan 03: Lsp4ijClassFileMarkers reads a class file's constant pool directly to prove ApiStatus.Experimental is retained class-file-only, so a runtime isAnnotationPresent lookup is provably vacuous for it; Lsp4ijImportAllowlistTest turns the plugin's LSP4IJ coupling into a hand-written eleven-file, symbol-level allowlist that fails when a use drifts anywhere in src/main/java; ComposerModelsJsonBoundaryTest generalises the compile-result MessageJsonHandler harness across all seven composer DTOs. Two measured facts were corrected against the live 0.21.0 jar and actual code rather than forced to the plan's original wording: ServerStatus now has 9 constants (not 4), and the Java-interop icon heuristic does not change Interface's icon (only Class/Method/Function).
- [Phase 84]: Config-path resolution centralized in config-path-resolver.ts (84-01): single resolveConfigPath() owns the fallback, exposed via bbj/resolvedConfigPath request + notification; initializeWorkspace's PREFIX read now goes through it, and every bbj.configPath setting change re-resolves and re-pushes.
- [Phase 84]: [Phase 84]: Phase 84 Plan 02: config-path-cache.ts is the VS Code host's warm cache (getActiveConfigPath prefers the last pushed path, falls back to the explicit setting canonicalized, never derives a home default); applyConfigAssociation/releaseConfigAssociation in extension.ts wire four triggers (activation sweep, open, change, config-path setting change) so bbx-config survives reopen/revert and the old path is released on a setting change; extension.ts tracks lastKnownActiveConfigPath itself rather than re-deriving the previous path from the cache, since the cache only moves once the server's next push arrives; setopts-composer-ui.ts's argForActiveEditor (now exported) shows a non-blocking hint naming the active config file when the open bbx-config document is a different one.
- [Phase 84]: 84-04: static-helper-plus-thin-wrapper on BbjConfigPathService (resolveActivePath/isConfigFileName/isDefaultConfigFilename are package-private static) so the pure decisions are unit-testable without a live IntelliJ Application; a source-guard test covers the remaining platform-bound wiring.
- [Phase 84]: Show-config's missing-file check reads the cached exists flag, not a live fs check — The resolved payload is the single source of truth for existence, and the test suite seeds cache state with synthetic paths that never exist on disk.
- [Phase 84]: readerWithResolvedConfigFile is a reader wrapper, not an edit to buildCompileOptionsFrom — Keeps the -c argument's argv position and the existing -c/-P conflict rule provably unchanged whether the value came from injection or an explicit setting.
- [Phase 84]: Phase 84 Plan 05: BbxConfigLanguage/BbjConfigFileType give IntelliJ its own config Language and file type (no parser, unmapped to the server); BbxConfigSyntaxHighlighterFactory resolves the bbx grammar by a constant default filename instead of the opened file's name; BbjConfigFileTypeOverrider delegates entirely to BbjConfigPathService.isConfigFile at runtime; update() re-parses the previously/newly active config files via reparseFiles inside invokeLater only when the active path actually changes, guarded for the no-live-Application plain-JUnit case.
- [Phase 84]: Phase 84 Plan 06: getConfigPathArg()/getConfigPath() redirected to BbjConfigPathService.activeConfigPath(); ConfigPaths.configPathArg() refuses the EM Config sentinel as the single tested guard; BUI/DWC actions abort with a named notification on a blank resolved path instead of registering an empty value with EM; the Settings dialog's configPathField gets a non-blocking ComponentValidator sharing the component's single AlarmScheduler via a new debouncer, with a win32-drive-letter absolute-path rule tested through an injectable OS name.
- [Phase 84 UAT]: All eight live-IDE checks passed by hand on 2026-09-06 (macOS, VS Code + IntelliJ builds from `main` @ 98a1f65c); `ps` showed both hosts spawning `bbjinit` with the resolved `-c/…/barista.cfg`. One false alarm (IntelliJ custom config "not detected") was resolved by checking the gear icon and the Language Servers tool window — the tester expected a SETOPTS editor link, which exists only in VS Code. Accepted as-is: the VS Code inactive-config hint fires only on the Command Palette entry point (CodeLens/Code Action pass an argument and skip it), matching QA row 11's wording. Post-UAT: 84-VALIDATION.md nyquist-compliant (18 tasks, 2 gaps filled with new tests: VS Code missing-file warning once-per-path, IntelliJ notification-handler source guard), 84-SECURITY.md threats_open 0 (25 threats). CFG-01/CFG-02 (#485) closed.
- [Phase 85]: Detection is server-side and relevance-gated: `createConfigWatcher` (directory-scoped `fs.watch`, `samePath` basename filter, 1000 ms trailing debounce) notifies `bbj/configReloadRequired` only when the consumed PREFIX snapshot changed, read through the same `extractConsumedConfigContent` that `initializeWorkspace` uses — a SETOPTS-only write yields zero notifications, so Phase 87's composer needs no dialog-aware restart deferral.
- [Phase 85]: The push waits for build quiescence: `BBjDocumentBuilder.hasPendingWork()` (Langium `currentState`, pending BBjCPL debounce, post-`super.buildDocuments()` tail per review fix WR-01) polled at 100 ms, bounded at 5000 ms, one outstanding wait replaced by a newer verdict; `main.ts` arms the watcher once after the first Validated build and re-arms at exactly the two `setConfigPath` sites (source-guarded).
- [Phase 85]: Hosts restart through their existing coalescing choke point and signal without a prompt — VS Code `restart-gate.ts` (`createRestartGate`, port of IntelliJ's `RestartGate`, cancellable in flight per WR-02) plus a dedicated auto-hiding status-bar item; IntelliJ `BbjLanguageClient.configReloadRequired` → `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)` with the reason in the widget tooltip and one console line, no balloon. Cross-language contract test pins the notification name, reason tokens and DTO fields.
- [Phase 85 UAT]: All seven live-IDE checks (VS Code QA rows 12-14, IntelliJ rows 13-15, cold start) passed by hand on 2026-09-07 (macOS, builds from `main` @ 4d60d84f). Post-UAT: 85-VALIDATION.md nyquist-compliant (14 tasks, 0 gaps), 85-SECURITY.md threats_open 0, 85-VERIFICATION.md re-verified after a metadata-only summary edit. CFG-03 (#486) closed. The startup log reviewed at Test 1 surfaced four pre-existing defects filed as #659 (nested classes resolved twice as `Outer.Inner`/`Outer$Inner`), #660 (primitives/arrays round-trip to java-interop), #661 (`config.bbx` wording in the workspace-manager log line), #662 (logger format inconsistency).
- [Phase 85]: Phase 85 Plan 01: extractConsumedConfigContent/consumedConfigSnapshot in config-path-resolver.ts is the single shared PREFIX-reading function; initializeWorkspace and the hot-reload relevance gate both call it, with a source-scan test proving no second parser exists.
- [Phase 85]: Phase 85 Plan 01: notifyConfigReloadRequired is deliberately undeduplicated (unlike notifyResolvedConfigPath); the config-watcher.ts relevance gate is the sole point deciding whether a reload notification fires, so a sender-side dedupe would be a redundant second suppression layer.
- [Phase 85]: Phase 85 Plan 05: placed the four hand-only QA rows two-per-IDE-section (VS Code: atomic-save, SETOPTS-no-restart; IntelliJ: out-of-workspace config, save burst) since only the headline PREFIX-reload behavior was flagged '(both IDEs)' in 85-CONTEXT's Integration Points, and IntelliJ's SETOPTS composer does not exist until Phase 87 — Fixed the SETOPTS row's placement unambiguously (VS Code is the only IDE with a working composer today) and avoided duplicating rows the phase context did not ask to be duplicated
- [Phase 85]: Phase 85 Plan 02: hasPendingWork() reads Langium's own currentState field directly (currentState < DocumentState.Validated) rather than a new bookkeeping flag; the quiescence wait lives inside config-watcher.ts's two existing changed-verdict call sites so no caller can bypass it; Task 3 needed no new production code since the quiescence wait (Task 1) and the relevance gate (85-01) already compose to guarantee at most one notification per consumed-content transition.
- [Phase 85]: Phase 85 Plan 03: restart-gate.ts's RestartTarget is the LanguageClient instance itself (not a wrapper closure) so exactly-one client.start()/client.stop( stays literal in extension.ts for the source guard; the handler's log line and gate dispatch were both built in Task 1 per its own action text.
- [Phase 85]: Phase 85 Plan 04: RESTART_DEBOUNCE_MS widened from private to public rather than duplicating the literal 500 at the new configReloadRequired call site -- one named constant is the only source of the coalescing delay on either restart trigger.
- [Phase 85]: Phase 85 Plan 04: ConfigReloadPresentation.clearsReason clears only on the started state or an abandoned auto-restart (crashCount >= 2, hoisted into a local in BbjServerService.updateStatus) -- a plain stopped is deliberately excluded since a restart legitimately passes through it and clearing there would blank the tooltip mid-reload.
- [Phase 85]: Phase 85 Plan 04: the cross-language contract test checks DTO field names as unquoted TypeScript interface members (word-boundary match) rather than quoted literals, since config-reload-notification.ts declares path/reason as plain interface fields, not JSON string literals -- code wins over the plan's literal wording.
- [Phase 86]: D-11..D-16 closed for 86-01: bbj/refreshJavaClasses joins the composer server proxy; success is console-only, failures render a reason-keyed balloon with a user-clicked restart fallback; a per-project single-flight guard bounds concurrency
- [Phase 86]: [Phase 86]: 86-02: PortLookup collapses a read failure and a genuinely absent key into one detected boolean (no separate failed flag like BbjSettingsLookups' records) since both cases mean 'nothing detected, use 5008 and say so'; BbjInteropPortCache keys on the resolved properties file's absolute path, mirroring BbjNodeVersionCache's compute() race-safety idiom.
- [Phase 86]: Folded todo closed as delivered by Phase 84 D-12 (plans 84-03, 84-04, 84-06) rather than built; COVERAGE.md names the phase's actual JSON-RPC/properties-read surface instead of a generic no-API statement
- [Phase 86]: [Phase 86]: 86-03: one BbjSettings.getEffectiveJavaInteropPort() accessor answers the java-interop port for the language-server initialization options, the health probe and the Settings dialog's reset; the persisted javaInteropPortAutoDetect flag migrates once in loadState before any reader observes it, and BbjSettingsConfigurable.apply() captures the stored port before writing so InteropPortSettings.portToPersist never sees its own output.
- [Phase 86]: [Phase 86] Phase 86 Plan 05: LanguageServerManager.stop(String) returns void in LSP4IJ 0.21.0, so doRestart() waits for manager.getServerStatus(SERVER_ID) to report the server down (BoundedWait, 5s budget) instead of awaiting stop's future; a restart request landing mid-restart is dropped (RestartGate in-flight rejection) rather than queued, to avoid an unbounded restart loop on a future stop-classification regression; the ExpectedStopGuard token is one-shot, 30s-windowed and armed only when the server was observed live -- closes G-86-1's automated-evidence portion.
- [Phase 86 UAT]: All four checkpoints passed by hand 2026-09-07. Test 1 (QA row 16) initially surfaced G-86-1 (`JsonRpcException`/`IOException: Stream closed` in the log despite visibly-working completion/hover/Structure View); diagnosed, fixed by 86-05 (gap closure), and independently re-verified clean via Test 3 (rows 16+17 rerun together — the exact sequence that originally surfaced the gap). Test 2 (QA row 17, port settings) passed on first try. Test 4: WR-01 (stale-by-one-generation `previousStatus`) and WR-02 (unguarded bounded-wait exception, both from 86-05-REVIEW.md) accepted as residual risk rather than fixed. CFG-04/CFG-05 (#632, #608) closed. Post-UAT: 86-VALIDATION.md nyquist-compliant (14 tasks across 5 plans, 0 gaps — every task carries an `<automated>` verify and every SUMMARY coverage entry is `status: pass`), 86-SECURITY.md threats_open 0 (27 threats across 5 plans, short-circuit path — register authored at plan time, ASVS level 1).
- [Phase 87]: [Phase 87] 87-01: bbj/composer/setopts/decodeCall and preview are thin pass-throughs added to the existing composer-commands.ts/ComposerModels.java/BbjComposerServer.java; the SETOPTS vector crosses the LSP4IJ boundary as a hex String end-to-end, never a numeric bitmask; DecodeEquality.sameSetopts compares hexRange/bits element-wise, never by reference identity
- [Phase 87]: [Phase 87] 87-02: PreviewDebouncer mirrors KeystrokeDebouncer's cancel-only-own-pending idiom but debounces a UI-thread action with no staleness check of its own (the caller's ComposerFlow mySeq==seq.get() handles staleness); SetoptsComposerDialog's own client-side input validation (raw-hex-tail regex, printable-ASCII mask chars) is the entire OK gate since SetoptsPreview carries no server-side valid flag unlike MsgboxPreview
- [Phase 87]: [Phase 87]: 87-03: ComposerLauncher.Kind.SETOPTS wired end-to-end (guarded edit-in-place via StaleEditGuard/DecodeEquality.sameSetopts, line-start compose-new via refactored insertAt) and BbjComposeSetoptsAction added as a PSI-free config-file-scoped Editor Popup entry; a composer-built regression pair reconfirms Phase 85 D-06's zero-restart guarantee. DISC-04 (#633) closed.
- [Phase 88]: 88-01: SETOPTS branch lives in getHoverContent (not getAstNodeHoverContent) since a hex StringLiteral resolves to no declaration and Langium only reaches getAstNodeHoverContent via References.findDeclarations
- [Phase 88]: 88-02: traceOptsChain flattens the enclosing statement array once (CompoundStatement transparency), walks backward, and stops at the first control-flow marker, non-IOR/AND reassignment, alias, or unparseable mask; foldChainEffect accumulates catalog-ordered set/clear with last-write-wins per bit
- [Phase 88]: 88-02: DISC-06 intentionally left pending despite appearing in this plan's frontmatter requirements — its tri-state composer/edit-in-place deliverables land in plan 88-03; only DISC-05 was marked complete
- [Phase 88]: [Phase 88] 88-03: Widened traceOptsChain with an optional originNode (the OPTS-sourced Assignment) so setopts-in-code-request.ts locates the edit-in-place line range without a second AST walk
- [Phase 88]: [Phase 88] 88-03: decodeInCode maps a bare IOR/AND mask-call target to the same not-found result as no-shape-nearby -- D-04 names only the two SetOptsStatement-rooted shapes as edit-in-place targets, and mode has no fourth value for it
- [Phase 88]: [Phase 88] 88-03: DISC-06 intentionally NOT marked complete -- its tri-state composer/edit-in-place deliverables also need plans 88-05 (IntelliJ dialog) and 88-06 (VS Code UI); only the wire layer landed here
- [Phase 88]: 88-04: ComposerModels' eight new SETOPTS-in-code DTOs mirror setopts-in-code-request.ts/setopts-catalog.ts field-for-field (byteNo remapped to wire key byte via @SerializedName); BbjComposerServer.setoptsDecodeInCode/setoptsComposeTriState declared on the single server interface, pinned by ComposerRequestContractTest (14 names).
- [Phase 88]: 88-04: DecodeEquality.sameSetoptsInCode compares found/editable/mode/reason/summary/absolute/chain/initial field-wise, order-sensitive on tri-state entries (fails closed on reorder); DISC-06 still NOT marked complete pending 88-05/88-06.
- [Phase 88]: 88-06: SetOptsInCodeRequestSender declared in setopts-tristate-webview.ts and imported into setopts-in-code-ui.ts; scope ('reassignments' vs 'block') decided client-side from whether a chain target is present, but the composed bytes always come from the server's composeSetOptsBlock; DISC-06 still NOT marked complete pending 88-05 (IntelliJ dialog)
- [Phase 88]: [Phase 88]: 88-05: SetoptsTriStateComposerDialog reuses SetoptsComposerDialog's exact skeleton (ComposerFlow+PreviewDebouncer+CR-01 gating) with a ButtonGroup-backed Set/Clear/Leave radio row replacing the checkbox, and a read-only block preview replacing the mask-character/raw-tail region; ComposerLauncher.Kind.SETOPTS_IN_CODE routes absolute/chain/compose-new/not-editable to the right dialog and guarded write; DISC-06 (#475) closed -- both IDE halves (88-06 VS Code, 88-05 IntelliJ) now exist
- [Phase 88]: [Phase 88]: 88-07: SetOptsUnsafeReason 'indexed-target' plus indexedAccessRootName classify byte-range/element accessor mutations (A$(1,1)=, A$[1]=, or as an IOR/AND argument) as unsafe instead of silently transparent, closing the false-safe/empty-effect defect at G-88-1's code half (live-hover retest still pending, G-88-1 stays status:failed)
- [Phase 88]: 88-10 (gap-closure G-88-3): bbjHexLiteral/BbjHexLiteral.of is the one formatter per host deciding a BBj hex literal's $...$ delimiters; composeSetOptsBlock's IOR/AND lines and both hosts' absolute in-place writers now route through it; SetOptsEditTarget.hexSyntax discriminator (default config-bare) keeps the #474 config.bbx composer's bare-hex syntax unchanged and pinned by a direct test. G-88-3 stays status:failed pending plan 88-13's live BBjServices verification.
- [Phase 88]: [Phase 88]: 88-11: parseHexLiteral now consults the StringLiteral's raw CST source text (not its converted value) to accept only the grammar's own anchored HEX_STRING shape, since BBjValueConverter makes a quoted "$08$" and a bare $08$ byte-identical by the time the AST value is read -- closes G-88-3's decode-side leniency that let the invalid composer output round-trip through the test corpus; decode-side fixture corpus migrated to real BBj syntax and a round-trip test proves hexRange + bbjHexLiteral compose. G-88-3 stays status:failed pending plan 88-13's live verification.
- [Phase 88]: 88-12 (gap-closure G-88-2): textDocument/codeAction gated at DocumentState.Linked (hover's gate, not Validated) with a named 5000ms budget racing the state wait, overriding Langium's default registration after startLanguageServer(shared); a cold-ordering probe (workspace=repo root, codeAction issued immediately after didOpen) confirms the fix -- 7ms vs. the pre-fix 56016ms hang. IntelliJ gains a second, non-intention editor-context-menu entry point (bbj.composeSetoptsInCode) into the tri-state composer, calling the identical launcher the Alt+Enter intention uses. G-88-2 stays status:failed -- no IntelliJ sandbox exists in this devcontainer; plan 88-13 stages the live retest.
- [Phase 88]: [Phase 88]: 88-13: rebuilt both distributables and proved this round's fixes ship (new shipped-bundle e2e assertion that composeTriState mask arguments are bare hex, never quoted; IntelliJ plugin jar proven to carry the new context-menu action + Java formatter + unchanged intention), corrected QA/FULL-TEST-CHECKLIST.md's now-invalid quoted hover sample syntax and added the IntelliJ context-menu row, rewrote 88-LIVE-RETEST.md as round two, and narrowed G-88-2/G-88-3's missing: lists to exactly the live-render residue -- both gaps stay status:failed pending the next human retest
- [Phase 88]: [Phase 88]: 88-14 (gap-closure): decodeInCode's chain edit-in-place region is now anchored on the reassignment statements' own CST ranges (via traceOptsChain's new linkStatementNodes field) rather than origin/SETOPTS line arithmetic; every shape whose region cannot be expressed as a whole-line replace the chain owns outright (shared-line reassignment, comma-joined assignment, comment/unrelated-statement interleaving) fails closed with a new SetOptsNotEditableReason('shared-line') instead of an empty or inverted replace range -- DISC-05/DISC-06 marked complete
- [Phase 88]: [Phase 88]: 88-15 (gap-closure round 5, final): setopts-stale-edit-guard.ts ports IntelliJ's StaleEditGuard/DecodeEquality contract to VS Code — applyIfUnchanged snapshots the target document's version, re-issues the identical decodeInCode request the panel was opened from (bounded by a 10s timeout), compares the whole fresh decode field-wise via sameSetOptsInCodeDecode, re-checks the version immediately before the write, and fails closed on every branch; both edit-in-place writers (setopts-tristate-webview.ts chain path, setopts-composer-webview.ts absolute-literal path) now route their applyEdit through it, while compose-new and every config.bbx caller stay unguarded since neither has a captured range that can go stale. All 15/15 Phase 88 plans now complete; three items remain human verification (IntelliJ composer reachability, live mask-width, live VS Code observation of this guard).
- [Phase 88 UAT, closeout 2026-09-12]: All 3 outstanding human_verification items (IntelliJ Alt+Enter/context-menu reachability, live mask-width falsification against a real BBjServices, live VS Code observation of the 88-15 stale-edit guard) confirmed passing against a freshly rebuilt VS Code VSIX and bbj-intellij-0.1.0.zip (sha256 50ae9d74...) at HEAD f56c17e2. G-88-1/G-88-2/G-88-3 all resolved; 88-VERIFICATION.md status: passed; 88-UAT.md 9/9 pass. Filed GitHub issue #666 ("Improve the user experience and discoverability for SETOPTS handling") as a follow-up — during retest the tester noted it's not obvious how to create a new SETOPTS block or upgrade an existing one to a different format; needs a dedicated UX/flow review across both IDEs, out of scope for Phase 88. Notably overlaps Phase 89's own "Composer Discoverability" scope.
- [Phase 89]: COMPOSER_CODE_LENS_BUDGET_MS=5000ms bounds cue-request hold time, mirroring CODE_ACTION_BUDGET_MS; handler gates at DocumentState.Parsed (not IndexedReferences) since the cue provider never touches linking; workspace/codeLens/refresh sent via connection.sendRequest(CodeLensRefreshRequest.type) since this vscode-languageserver version has no codeLens.refresh() helper.
- [Phase 89]: decodeMsgboxCall recognizes closed +-sums of integer literals and/or BBjMsgBox.* constants via a reverse lookup built once from the existing catalogs; anything else opens VS Code compose-and-replace mode with the original text and a banner, no second confirmation.
- [Phase 89]: 89-03: cvs-composer.ts follows setopts-catalog.ts's catalog+compose+decode+preview shape; CVS_BITS 128 carries a BBj-specific detail and 1/2/16/32/128 are chars-customizable; decodeCvsCall recognizes only integer-literal +-sums as editable
- [Phase 89]: 89-04: ComposerLensKinds/ComposerLensTarget/ComposerLauncher.launchAt/BbjOpenComposerAtAction wire LSP4IJ's bbj.openComposerAt Code Vision click to an EDT-pinned action that opens the exact composer at the cue's own position; a fromCue stale check renders staleDocument instead of falling through to compose-new
- [Phase 89]: 89-05: cvsCallStillMatches is a plain string-slice comparison against the captured callText (no server re-decode); cvsPanelArgAt returns undefined for every not-editable verdict, so the lightbulb offers no action at all rather than a degraded compose-and-replace mode
- [Phase 89]: 89-07: CVS() wire requests (decodeCall/preview) + cvs catalog land as thin pass-throughs; IntelliJ DTOs/interface methods/equality (sameCvs) pinned by contract/boundary/equality tests; MsgboxDecodeResult also gained hasOptions to match plan 89-02's deviation, with sameMsgbox extended to compare replace/hasOptions
- [Phase 89]: Code Vision spike: GO (IU-262.10315.125) — IntelliJ IDEA 2026.2.2, macOS aarch64, LSP4IJ 0.21.0; composer cue rendered and clicked through
- [Phase 89]: Config routing decision: route — config.bbx routed to the language server under its own bbx-config id, superseding Phase 84's pinned invariant; plans 89-11/89-12 proceed unchanged
- [Phase 89]: Phase 89 89-08: CvsComposerDialog reuses SETOPTS's exact ComposerFlow/PreviewDebouncer/scheduleRefresh plumbing in a single flat titled checkbox list (no byte-group headers, no scroll pane); MsgboxComposerDialog's compose-and-replace banner renders the server's replace.banner verbatim plus a read-only original-expression field, with no client-side wording and no confirmation dialog
- [Phase 89]: Phase 89 89-09: setopts-in-code cue scans only the SETOPTS keyword itself (never IOR(/AND( lines); MSGBOX/addChildWindow cues carry no decode veto while CVS/SETOPTS-in-code require their composer's own editable verdict; the Roadmap Success Criterion 5 structural test actually lives in composer-codelens-handler.test.ts (widened to mix all five kinds), not composer-codelens.test.ts as an earlier summary and this plan assumed.
- [Phase 89]: 89-10: ConfigureCvsIntention's isAvailable reuses ComposerLauncher.isCaretOnCall(editor, "cvs(") unchanged — The keyword already ends in a literal '(' and gets a trailing boundary for free, so no SETOPTS-style multi-keyword widening was needed
- [Phase 89]: 89-11: isBuildableDocumentUri checks the open document's language id (bbx-config excluded regardless of extension) before falling back to serviceRegistry.hasServices, mirroring Langium's own ServiceRegistry.getServices lookup order
- [Phase 89]: 89-11: BBjDocumentBuilder.update returns without calling the base method at all when the filtered changed list and deleted are both empty, avoiding a currentState reset/build-phase fire for a config-only change
- [Phase 89]: 89-11: setoptsConfigPanelArgAt is the single argument-building function shared by the Code Action, active-editor command and cue-click dispatch, replacing the former argForLine wrapper
- [Phase 89]: 89-12: cvs mapped to ComposerLensKinds and BBx Config mapped to the server as bbx-config, re-pinning Phase 84's invariant as a two-mapping check; a pre-existing D-01 comment token on the touched BbjComposeSetoptsAction Javadoc line was dropped to satisfy this plan's own register-check regex
- [Phase 89]: Phase 89 89-13: bbj-hover-handler.ts overrides textDocument/hover to answer a bbx-config document instantly, closing a real >6s hang where Langium's default hover handler awaited WorkspaceManager.ready before checking document state -- discovered live while proving the T-89-42 mitigation, the same class of hang the codeAction/codeLens overrides already closed; every other document's hover is delegated unchanged.
- [Phase 89]: Phase 89 89-13: All 13 phase plans now summarized; DISC-01/02/03 (#650, #648, #649) marked Complete via the shared-ID gate. Both distributables rebuilt and reinstalled from the final tree, proven against the fixture over IPC (sha256-identical main.cjs in both bundles).
- [Phase 89]: 89-14: CVS() incomplete decode outcome stays editable:false (fail closed) so the codelens cue's existing found && editable gate keeps half-typed lines cue-free with no code change
- [Phase 89]: 89-14: cvsCallStillMatches re-locates the call via findCvsCalls (span-exact), not just a text-slice comparison, so a grown unterminated call is refused as stale
- [Phase 89]: 89-14: runComposeCvsCommand decodes the caret before falling through to compose-new, so bbj.composeCvs from the palette/context menu can no longer nest a call inside a partial or existing one
- [Phase 89]: 89-15: CvsComposerDialog takes a CvsComposeMode instead of a boolean editMode, throwing IllegalArgumentException for NOT_EDITABLE; the assign-to row is now hidden in both replace modes (edit-in-place and completing an unfinished call), not just editing
- [Phase 89]: 89-15: openCvs routes through CvsComposeMode.of and reuses the single existing guarded CVS write for both edit-in-place and completing an unfinished call, differing only in the write-command name; DecodeEquality.sameCvs now compares incomplete so a stale unfinished-call completion cannot pass the guard
- [Phase 89]: 89-16: MSGBOX compose-new nesting recorded as a Phase 90 todo instead of copying the CVS fix; QA row 19/25 step 5 folds three sub-actions into one numbered step — Gap decision 7 scoped the MSGBOX fix out of Phase 89; it needs its own design (guarded replace + MSGBOX's replace/sameMsgbox/banner semantics)
- [Phase 89 UAT, closeout 2026-09-12]: Round 1 passed 3/4 with gap G-89-3 (an unfinished `CVS(` call showed the not-editable notice in IntelliJ and nested a second call in VS Code), closed by gap-closure plans 89-14..16. Round 2 passed 2/2 by hand in both IDEs against artifacts rebuilt at `deb25b4a` (VSIX sha256 8111f522…, bbj-intellij-0.1.0.zip sha256 55b3f52f…; the zip needed `clean buildPlugin` because Gradle judged it up to date). 89-VERIFICATION.md status: passed; 89-VALIDATION.md nyquist-compliant; 89-SECURITY.md threats_open 0. DISC-01/02/03 (#650, #648, #649) closed.
- [Phase 90]: MSGBOX unfinished-call decode/completing-mode mirrors CVS's 89-14 incomplete outcome but ported to MSGBOX's own replace/hasOptions field shape, not copied verbatim
- [Phase 90]: 90-02: validateNumericField lives in addwindow-composer.ts and is imported into addchildwindow-composer.ts for its id field; addwindowPreview/addchildwindowPreview compute per-field errors plus valid, skipped entirely in edit mode — Reuses the msgboxPreview per-field-error/valid template rather than re-inventing it; keeps structural-only fields (receiver/sysgui/window/context) unconstrained so valid expressions like BBjAPI().openSysGui("X0") are never rejected
- [Phase 90]: 90-03: ComposerHandleCache is package-private and memoizes both the server proxy and catalogs, cleared on any BbjServerStatusListener.TOPIC status change and on any ComposerFlow launch failure — DISC-11 (#612): identity-checked invalidation guarantees a resolution started before a clear is never served after it; BbjComposerService.server(project) stays an unchanged static facade so BbjCompileAction/BbjRefreshJavaClassesAction need no edit
- [Phase 90]: Task 1 added only MSGBOX_SOURCE to DEBOUNCED_DIALOG_SOURCES (not all three dialogs at once), matching the plan's per-task scope
- [Phase 90]: 90-05: registerPanelMessageHandler ties every composer panel's message subscription to panel.onDidDispose instead of the extension context; a source-discovered test finds panel modules by scanning src/ for createWebviewPanel(, not a hard-coded list, so a future seventh composer is covered automatically
- [Phase 90]: Phase 90: 90-06: AddWindowPreview/AddChildWindowPreview gain per-field error strings and valid, mirroring MsgboxPreview's precedent; errorText(String) reads each p.<field>Error exactly once so the source guard's per-field occurrence count holds; setOKActionEnabled(p.valid) replaces the unconditional enable in both dialogs' apply()
- [Phase 90]: 90-07: MsgboxComposeMode routes a MSGBOX decode to COMPOSE_NEW/EDIT_IN_PLACE/REPLACE_OPTIONS/COMPLETE_CALL, testing incomplete before replace so a decode the server never sends still completes the call rather than opening the compose-and-replace banner — Mirrors CvsComposeMode's incomplete-before-editable ordering
- [Phase 90]: 90-07: openMsgbox keeps its single applyIfUnchanged/replaceString call site for edit-in-place, compose-and-replace and completing an unfinished call, differing only in the WriteCommandAction name — No second write site is ever acquired for the new completion mode
- [Phase 90]: 90-08: installed-bundle e2e proof + tracer-feedback-gate reuse, QA rows and MSGBOX-nesting todo closure
- [Phase 90 UAT, closeout 2026-09-12]: Both human checks passed by hand on the first round — IntelliJ (MSGBOX/addWindow/addChildWindow debounce, per-field error labels with OK disabled, faster second open, composer still opens after Restart Language Server) and VS Code (unfinished `MSGBOX(` completion from cue/context menu/palette, stale-edit refusal beside the open panel, window-composer field errors) — against a VSIX (sha256 5505b2a3…) and bbj-intellij-0.1.0.zip rebuilt at `6e1efb2d`, after the CR-01 `seq` fix, with the bundled `main.cjs` byte-identical to the fresh build. 90-VERIFICATION.md status: passed; 90-VALIDATION.md nyquist-compliant (8 rows, 0 gaps; 203 vitest + 113 JUnit targeted tests green); 90-SECURITY.md threats_open 0 (24 threats, short-circuit path). DISC-07..11 (#623, #532, #530, #611, #612) closed.
- [Phase 91]: 91-01: path-keyed BbjClass index in BBjIndexManager (updateContent/removeContent) replaces the full-scan getBBjClassesFromFile; collectLocalSymbols mirrors bbj-linker.ts's external-document member-pruning rule so PREFIX symbol collection no longer walks method bodies (#505)
- [Phase 91]: 91-02: completionRequestToken (node:async_hooks AsyncLocalStorage) replaces the activeCancelToken instance field so completionForCrossReference reads the request it is actually serving; findClassCandidatesByPrefixCached dropped its cancelToken parameter entirely so the shared per-prefix lookup can never be tied to one caller's token — closes both cancellation layers of #498
- [Phase 91]: [Phase 91]: Phase 91 Plan 03: A three-state (closed/open/half-open) circuit breaker sits in front of java-interop's existing shared connect(), classifying only connect-level failures (never a post-connect request timeout) as trip-worthy; a generation counter bumped solely by clearCache() invalidates any in-flight connect attempt so a stale probe cannot report state after a reset.
- [Phase 91]: [Phase 91]: Phase 91 Plan 03: Stub caching narrows to genuine backend not-found answers via isInteropTransportFailure(error), driving the existing createStubClass(className, cache) flag; ensureCompleteClassIndex's already-resolved fast path starts (never awaits) the half-open probe, the only way a no-edit candidate lookup can bring recovery; loadImplicitImports dedupes its simple-name copies so a recovery re-run never grows the synthetic classpath document.
- [Phase 91]: Phase 91 Plan 04: an in-flight Phase-2 registry (_inFlightPhase2, plain Map) beside the resolvedClasses LRU stops eviction mid-cyclic-resolution from stalling or stubbing a class that resolves (#497); identity-guarded finally drains it after success/timeout/cancellation/clearCache
- [Phase 91]: Phase 91 Plan 05: reloadClasspathAndRecheckDocuments takes Pick<...> service shapes so unit tests pass vi.fn() stand-ins directly; recheckAfterInteropRecovery logs failures via console.error only, never a popup, matching the no-notification-on-recovery requirement
- [Phase 91]: Plan 91-06 rebuilt both distributables from HEAD 3ca0bf51 and confirmed the breaker marker (count 1) in each bundle; whole suite 1824 passed/29 skipped/0 failed, lint 0, register/gated-test/IntelliJ-diff checks all clean; REQUIREMENTS.md deliberately not edited here, RESP-01..04 marked complete by phase verification after the live D-14 check
- [Phase 91 UAT, closeout 2026-09-13]: The single human check (live java-interop outage and recovery in VS Code: stop BBjServices, one "Failed to connect to the Java interop service" popup for the whole outage, no freeze, unresolved-class diagnostics on new `use`/`declare` lines; restart BBjServices, diagnostics clear after a caret move with no edit, popup or Refresh Java Classes) passed by hand on the first round against a VSIX (sha256 31ecff5a…) and bbj-intellij-0.1.0.zip (sha256 15b4c0a4…, `clean buildPlugin`) rebuilt at `e52e5e50`, after review fixes 2ca423ff/59befa50, with both bundled `main.cjs` byte-identical to the fresh build. The popup fires on the first edit that makes the server resolve a not-yet-cached Java class (a failed reconnect while the breaker is closed), never on the stop itself or on hover/caret moves. 91-VERIFICATION.md status: passed; 91-VALIDATION.md nyquist-compliant (14 tasks, 0 gaps; whole suite 1855 tests, 0 failed); 91-SECURITY.md threats_open 0 (21 threats, short-circuit path). RESP-01..04 (#505, #504, #497, #498) closed.
- [Phase 92]: 92-01: extracted a vscode-free target-resolution.ts module (resolveRunTarget/resolveDecompileTarget) so Commands.cjs's seven run/compile/decompile commands resolve argument-first with a language-aware active-editor fallback and one shared no-active-BBj-file warning — Commands.cjs is CommonJS and cannot load under Vitest, so the testable logic had to live in a pure module with Commands.cjs reduced to a source-guard-verified caller
- [Phase 92]: Phase 92 Plan 02: inFlightFormats keys on { content, promise }; a request reuses the running formatter only when its own text matches the running text (D-08, issue #499); cleanup compares the stored entry's promise identity so an older run settling after a newer one cannot evict it. — Fixes the stale-format-replacement bug where a second format request during interim edits received the first run's output.
- [Phase 92]: BbjFileVisibility mirrors BbjConfigPathService's static-helper-plus-thin-wrapper convention; both widgets delegate visibility to file.getFileType().getName(), never file extension, so config.bbx/config.min/a custom-named config file hide the widgets whatever their extension.
- [Phase 92]: 92-04: delete-then-wait replaces the mtime gate for decompile freshness (D-01..D-04); delete target shares the wait's own path expression so it can never remove the input file — Coarse-mtime filesystems can produce a fresh .lst whose mtime reads earlier than the call start, causing the old mtime-gated wait to spin to timeout; deleting the leftover first makes any subsequently-appearing .lst provably fresh without a timestamp comparison
- [Phase 92]: Every Disposable activate() creates directly (14 registerCommand calls, the formatting provider, all 3 client.onNotification handlers) is pushed onto context.subscriptions; the mocked harness's languages.registerCodeActionsProvider/registerCodeLensProvider also needed a real dispose() since setopts-in-code-ui.ts's unmocked registration runs through them every activate(). — Closes RESP-08 (#531): a second activate() re-registers cleanly after the first activation's subscriptions are disposed, proven by a mock that throws on a duplicate command id.
- [Phase 92]: Phase 92 Plan 06: rebuilt VSIX and IntelliJ zip from final tree, both proven via sha256-pinned marker checks (VSIX warning count 1, plugin jar BbjFileVisibility count 2); IntelliJ buildPlugin's JUnit suite ran 865/0/0/0; whole vitest suite 1873 passed/0 failed, lint/register/boundary gates all green; D-13's live tab-switch check staged for UAT — No tracked source/test file was changed — this closing plan only proves and stages per its own prohibition
- [Phase 92 UAT, closeout 2026-09-13]: The single human check (IntelliJ status-bar widgets follow a bare editor-tab switch: `.bbj` → non-BBj → `config.bbx` → `.bbx` program → `.bbj`, each show/hide on the click itself with no server-status change) passed by hand on the first round against bbj-intellij-0.1.0.zip (sha256 5e57a632…, `clean buildPlugin`) and a VSIX built at 07:49 after the last source commit, with the bundled `main.cjs` byte-identical to the fresh build. 92-VERIFICATION.md status: passed; 92-VALIDATION.md nyquist-compliant (8 rows, 0 gaps; 80 targeted vitest + 19 JUnit tests green); 92-SECURITY.md threats_open 0 (17 threats, short-circuit path — register authored at plan time, ASVS level 1). RESP-05..09 (#500, #499, #512, #531, #610) closed; v4.3's nine phases are all complete.

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- LSP4IJ experimental API usages remain (expected, requires LSP4IJ to stabilize); since Phase 83 they are fenced by signature canaries and an eleven-file import allowlist that fail on drift
- BbjCompletionFeature depends on LSPCompletionFeature API that may change
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level
- FQN path static-only filtering deferred — requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type

### Blockers/Concerns

- **v4.2 landed.** PR #651 merged the v4.2 code to `origin/main` on 2026-09-06; local `main`
  and `origin/main` are in sync, the preview version is 0.12.28, and all 22 IntelliJ issues
  are closed. The old local `main` (with the push-blocked v4.0 archive commit) is kept on
  `backup/local-main-2026-09-06`. New work lands via branches from `origin/main` plus a pull
  request, with a per-commit register check.

- **8 draft advisories — every fix merged to `main`, none yet published.** v4.1 closed
  2026-09-03 with all eight phases verified (70 and 77 with recorded overrides). Publication
  for each waits on a tagged `manual-release.yml` release, then per-advisory severity/CVE
  decisions and publication by the maintainer. GHSA-p5f3-9456-9pcx (fixed in v4.0, PR #637)
  waits on the same release. The post-release checklist is in MILESTONES.md under v4.1.

- **`WINDOWS.md` entry 1 open** (Phase 70 guardrail breadth, accepted as unmet 2026-08-21).
  With `workflow.windows_enforce` on, this blocks `/gsd-ship` until fixed or explicitly waived.

- **Test-harness false positive.** `shouldRunBBjTests()` (`test/test-helper.ts:37-43`) gates
  on a bare TCP connect to :5008. BBjServices squats on that port without speaking the
  interop protocol, so 11 `linking.test.ts` interop tests switch on and fail. Green with
  `RUN_BBJ_TESTS=0`. Tracked in `.planning/DEBT.md`. Since 2026-09-03 the live backend also
  exposes `getAllClassNames`, which drifts a further set of interop tests (todo filed).

- Full inventory of items needing a human decision: `tmp_human_review/` (untracked).

- ⚠️ [Phase 79] Residual review follow-ups after Phase 83: 79-REVIEW IN-01 (text source guards are
  refactor-defeatable) and IN-02 (duplicated plugin-bundle path resolution) remain advisory. The Settings-lookup
  failure path (79-UI-REVIEW) was closed by 83-02 and the symlink-following delete (IN-03) by 83-01. The combo
  placeholder still does not distinguish "no home set" from "home set but invalid" (quick-task candidate).
- ⚠️ [Phase 80 UAT observations, not phase-80 gaps]: (1) an old IntelliJ 2015 install accepted the plugin
  but it did not run — consider trimming `since-build` in the plugin descriptor; (2) automatic Node.js
  installation did not work on the Windows test machine. Phase 83's fixture-driven Windows-branch tests all pass
  on Linux, so the failure is not reproducible from the pipeline's branch logic; a live Windows check is filed as
  todo `2026-09-06-live-windows-check-for-node-auto-install-failure.md` (human attestation).
- ⚠️ [Phase 80] Review follow-ups in 80-REVIEW.md / 80-UI-REVIEW.md are advisory; none blocked verification.
- ⚠️ [Phase 82] UI-review follow-ups (advisory, 82-UI-REVIEW.md, 17/24): the in-dialog "Preview unavailable — <reason>" label
  uses the same plain gray as healthy status text (the dialogs already have a red `errorLabel()` convention); that red is a
  hardcoded `Color(0xC0392B)` rather than a theme-aware `JBColor`; `ComposerNotices.detailOf()` puts raw exception text
  into the balloon body with no user-oriented rewrite. Candidates for a quick task. 82-REVIEW.md findings were all fixed in-phase.
- ⚠️ [Phase 81 UAT observations]: (1) local dev builds are versioned 0.1.0 and IntelliJ silently replaced one with a Marketplace auto-update mid-test; deferred idea (81-UAT.md) — give interim builds a high version such as 999 so they outrank published ones. (2) `plugin.xml`'s unpinned LSP4IJ dependency lets the runtime lsp4j diverge from the Gradle pin; Phase 83 fenced the Gradle-pinned surface (canaries, allowlist, version-pin test), but runtime version skew in the IDE is still only covered by the reflective message read and remains a known limit.
- ⚠️ [Phase 83] Code review (83-REVIEW.md, advisory, 0 critical / 5 warnings / 3 info): cancellation during Unix `tar` extraction only fires on output lines a silent `tar xzf` never emits (WR-01); the outer temp-file cleanup in `NodeInstallPipeline.install()` is unguarded and can mask the real exception (WR-02); the `tar` process stdin pipe is never closed (WR-03); zip entry match uses `endsWith("node.exe")` rather than an exact name (WR-04); `flushPendingHomeLookup()` still runs the blocking lookup synchronously on the EDT from `apply()` — the accepted Phase 79 WR-03 tradeoff (WR-05). Info: `(D-12)` decision-id comments in `BbjSettingsComponent.java`/`BbjSettingsLookups.java` are pre-existing from Phase 79 (79-02), not added in Phase 83. Candidates for `/gsd-code-review 83 --fix` or a quick task.
- ⚠️ [Phase 83] Todo filed: a configured-but-unusable Node path suppresses the cached-download fallback (`2026-09-06-configured-node-path-suppresses-cached-download-fallback.md`); pinned as-is by 83-02, decision deferred.
- ⚠️ [Phase 84] Follow-ups from UAT/validation (advisory, none blocked verification): (1) the VS Code SETOPTS inactive-config hint is shown only when the composer is launched from the Command Palette — the CodeLens and lightbulb paths pass a line argument and skip `argForActiveEditor`, so a user clicking the CodeLens on the home default edits the wrong file silently (quick-task candidate: move the hint into the shared command handler). (2) `QA/FULL-TEST-CHECKLIST.md` lacks rows for three behaviors UAT covered by hand — the IntelliJ missing-config balloon, the run-action `-c` argv check (`ps -ef | grep -- '-c/'`), and the IntelliJ Settings inline config-path validation — plus the VS Code missing-config warning, which no UAT test exercised. (3) BUI/DWC run actions were not exercised against the custom config in UAT (GUI only, both IDEs); the abort-on-blank-path notification is pinned by source guards only. (4) Review fix WR-01 (per-keystroke association listener removed) is unpinned: a re-added `onDidChangeTextDocument` trigger would fail no test. (5) The IntelliJ pre-push fallback compares the setting verbatim (no `~` expansion) while VS Code expands `~` in the same branch — harmless once the server has pushed, but a `~/…` IntelliJ setting is not recognized until then.
- ⚠️ [Phase 84] UI-review follow-ups (advisory, 84-UI-REVIEW.md, 19/24 — copywriting 2/4 is the weak pillar): the IntelliJ Settings label still reads "config.bbx Path:" (`BbjSettingsComponent.java:281`) after the phase removed filename-specific wording everywhere else; `Commands.cjs` carries two divergent "no config path" strings (`NO_CONFIG_PATH_MESSAGE` vs. the inline string in `openConfigFile`); IntelliJ has no SETOPTS discoverability affordance (no CodeLens/hint equivalent), which is what confused the UAT tester. Candidates for a quick task; the first two are string-only.
- ⚠️ [Phase 85] Follow-ups (advisory, none blocked verification): (1) 85-REVIEW.md info findings left out of fix scope — IN-01 `pollQuiescence()`'s catch-all drops the pending notification with no retry; IN-02 the crash-triggered `requestRestart(CRASH_RESTART_DELAY_MS)` in `BbjServerService.updateStatus()` does not clear `pendingRestartReason`. (2) Four pre-existing defects found in the UAT cold-start log and filed as GitHub issues #659-#662 (java-interop nested-class double resolution, primitive/array lookups, `config.bbx` log wording — a one-line fix in `bbj-ws-manager.ts` — and logger format). (3) `85-VERIFICATION.md` `verified:` frontmatter still carries the original 03:00Z stamp; the close-out re-run is recorded in its trailing section.
- ⚠️ [Phase 86] Two residual review risks from 86-05-REVIEW.md accepted as-is at the UAT checkpoint (Test 4), not fixed: WR-01 — `updateStatus()` passes `ExpectedStopGuard.classify()` a `previousStatus` that lags the true immediate predecessor by one broadcast (self-corrects for the single-hop sequence G-86-1's fix targets; a duplicate/echoed `stopped` broadcast would not self-correct). WR-02 — `doRestart()` has no exception handling around the new bounded wait; a thrown exception would leave the server stopped with no console explanation. Candidates for a quick task if either surfaces in practice.
- ⚠️ [Phase 89] Gap-closure-round code review (89-REVIEW.md, 0 critical / 1 warning / 1 info) is unfixed, and UAT round 2 passed without it: WR-01 — the VS Code composer panel always labels its primary button "Insert", even when completing or editing a call; IN-01 — `runComposeCvsCommand` decodes the same call twice on the hard-stop path. The first-round review (CR-01, WR-01..03) was fully fixed (89-REVIEW-FIX.md). Candidates for `/gsd-code-review 89 --fix` or a quick task; rebuild both extensions after either lands. The MSGBOX compose-new nesting todo filed by 89-16 was closed by Phase 90 (90-01, 90-07).
- ⚠️ [Phase 90] Advisory (90-SECURITY.md T-90-11): the per-project `ComposerHandleCache` has no source guard forbidding a static map — the no-cross-project-leak control is structural only (instance field of a `projectService`). Quick-task candidate: add the guard assertion.
- ⚠️ [Phase 91] Advisory, none blocked verification: (1) 91-REVIEW.md IN-01 left out of fix scope — `bbj-vscode/src/language/bbj-index-manager.ts` has no trailing newline (lint passes; one-character quick fix). (2) Interop recovery is request-driven by design (no background timer): after BBjServices returns, stale unresolved-class diagnostics clear on the next Java lookup, such as a caret move or edit, not on their own while the editor is idle.
- ⚠️ [Phase 92] Advisory, none blocked verification: denumbering an input that is already a `.lst` file still watches the unreachable `<input>.lst.lst` path — a pre-existing defect explicitly out of scope per 92-CONTEXT.md and recorded under "Discovered, Not Fixed" in 92-04-SUMMARY.md (the new delete step never touches the input itself). 92-REVIEW.md found 0 findings.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|

---

## Session Continuity

Last session: 2026-09-13T09:02:00Z
Stopped at: Phase 92 complete — all phases complete
Resume file: None

Next: all v4.3 phases (84-92) are complete and verified — close the milestone with
`/gsd-complete-milestone v4.3`.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| debug_sessions | compile-diagnostic-getmessage-nosuchmethoderror | diagnosed (fixed by 81-07) | 2026-09-06 | v4.2 |
| debug_sessions | compile-error-response-message-could-not-be-parsed | diagnosed (fixed by 81-06) | 2026-09-06 | v4.2 |
| debug_sessions | compile-output-directory-row-not-visible | diagnosed (fixed by 81-04) | 2026-09-06 | v4.2 |
| debug_sessions | composer-intention-description-missing | diagnosed (fixed by 82-04) | 2026-09-06 | v4.2 |
| debug_sessions | windows-owner-only-tmp-error18 | diagnosed (fixed by 80-05) | 2026-09-06 | v4.2 |
| todos | 2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md | (presence-only) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-configured-node-path-suppresses-cached-download-fallback.md | (presence-only) | 2026-09-06 | v4.2 |
| todos | 2026-09-06-live-windows-check-for-node-auto-install-failure.md | (presence-only) | 2026-09-06 | v4.2 |
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

See: `.planning/MILESTONES.md`

---

*State updated: 2026-09-13 after Phase 92 verify-work close-out (Phases 84-92 complete, 9/9; RESP-05..09 closed)*

## Operator Next Steps

- Phases 84-92 complete and verified; next: `/gsd-complete-milestone v4.3` (optionally `/gsd-audit-milestone` first)
- Two residual review risks (WR-01, WR-02 from 86-05-REVIEW.md) accepted as-is at Phase 86's UAT checkpoint; revisit only if either surfaces in practice
- Triage the four UAT-log issues #659-#662 (all pre-existing; #661 is a one-line string fix) into v4.3 or the hygiene milestone
- Human attestation still open: live Windows check of Node.js auto-install (todo filed by 83-01)
- v4.1 post-release checklist unchanged (tagged release, advisory publication, `WINDOWS.md` entry 1)
