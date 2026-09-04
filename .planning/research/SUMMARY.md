# Project Research Summary

**Project:** BBj Language Server — v4.2 IntelliJ Burn-down
**Domain:** IntelliJ Platform plugin hardening (LSP4IJ-based language client) — subsequent milestone, not greenfield
**Researched:** 2026-09-04
**Confidence:** HIGH

## Executive Summary

This is a **fix-burn-down milestone**, not a new-feature milestone: 21 (actually 22, per FEATURES.md's own count) open PRIO 1/2 issues against the already-shipped `bbj-intellij` plugin, grouped into EDT responsiveness, EM token security, feature parity/correctness, composer robustness, and build/test foundation. All four research passes agree the plugin needs almost no new dependencies — every threading fix reuses the IntelliJ Platform SDK's existing `executeOnPooledThread`/`Alarm`/`invokeLater` idiom (already proven in `BbjServerService`), every security fix reuses JDK 17 APIs already on the classpath, and the one genuinely new capability (#571, a real "Compile BBj File" action) extends the `@JsonRequest`-on-`LanguageServer`-interface pattern the codebase already ships for `bbj/composer/*`. The build/test foundation work (JDK 17 toolchain pin, Gradle wrapper refresh, checksum validation) is a `build.gradle.kts`-only change with a well-defined installation recipe.

The most important cross-cutting finding, surfaced independently by ARCHITECTURE.md and PITFALLS.md after reading current `main` (not the 2026-08-20 issue text the milestone doc was scoped from): **#506 and #536 are already fixed on `main`** (shipped as CR-02 in v4.1/0.12.24), and the "no `src/test/` source set" claim underlying #569 is also stale — 7 JUnit 5 test classes already exist. These three items should be re-scoped to verify-and-close (write/confirm a regression test, close the issue) rather than re-implemented, or a phase will waste effort re-doing already-correct work and risks introducing a regression into code that currently works.

The key remaining risk is **sequencing, not technology**. Several issues share files, root causes, or prerequisite state: #535 must land before #542 (a trust-window cache built on a fail-open expiry check widens the vulnerability, it doesn't just duplicate it); #570 (JDK 17 toolchain) gates every `./gradlew` invocation in this environment and therefore gates #503/#576 (wrapper checksum/staleness) and any test-writing phase; #571 is the only issue crossing the `bbj-vscode`/`bbj-intellij` boundary and must route through a new `bbj/compile` LSP4IJ request wrapping the LS's existing `BBjCPLService`, never a literal port of VS Code's client-side `Commands.cjs` (which has no LSP relationship at all — it's extension-host-only code that would create a third, drifting bbjcpl invocation if copied). #567 also carries an explicitly open UX question (re-prompt vs. silent-abort on a stale-offset mismatch) that must be decided before implementation, not discovered mid-PR.

## Key Findings

### Recommended Stack

Almost no new third-party dependency is needed. The stack changes are three, all confined to `bbj-intellij/`: a Gradle `toolchain { languageVersion = JavaLanguageVersion.of(17) }` block plus the `foojay-resolver-convention` settings plugin (so the toolchain pin self-heals by auto-downloading JDK 17 rather than failing on whatever JDK is present — this environment's own JDK 25 reproduces the exact #570 failure); a Gradle wrapper refresh to 8.14.5 via `./gradlew wrapper --gradle-version ... --gradle-distribution-sha256-sum ...` (regenerates the actual JAR, not just the properties file, fixing the #503 checksum mismatch and #576 staleness together — stay on the 8.x line, since jumping to Gradle 9 would force an unplanned `intellij-platform-gradle-plugin` minimum-version bump and sandbox-path migration this milestone doesn't ask for); and a `testFramework(TestFrameworkType.Platform)` + JUnit Vintage engine addition so `BasePlatformTestCase`-style tests can run in the existing JUnit 5 `useJUnitPlatform()` task.

**Core technologies:**
- `org.gradle.toolchains.foojay-resolver-convention` (1.0.0, settings plugin) — auto-provisions JDK 17 for the Gradle toolchain, closing #570 for real rather than relocating the failure
- Gradle wrapper 8.14.5 (stay on 8.x) — closes #503 (checksum) and #576 (staleness) in one regenerate step
- `gradle/actions/wrapper-validation@v6` (CI step) — closes the detection gap #503 identifies (no CI check ever caught the wrapper mismatch)
- IntelliJ Platform SDK (`ApplicationManager.executeOnPooledThread`, `Alarm`, `ReadAction`/`WriteAction`, `ModalityState`) — already the established async idiom; no new concurrency library (no coroutines, no RxJava)
- JDK 17 `Base64`, `PosixFilePermissions`, `AclFileAttributeView` — token-expiry and temp-file-permission fixes need no JWT library or keychain library
- `@JsonRequest` on `BbjComposerServer` (or a sibling interface) — the extension point for #571's `bbj/compile`, already proven by 7 existing `bbj/composer/*` methods

**What NOT to add:** any JWT library, `kotlinx-coroutines`/RxJava, `java-keyring`, Gradle 9.x this milestone, a second `LanguageServerFactory` registration, or a dedicated platform-test source set (the existing single `test` task + vintage engine suffices).

### Expected Features

This milestone has no differentiators to chase — "table stakes" means restoring behaviour a mature IntelliJ plugin (or this plugin's own VS Code sibling) already exhibits. The 22 issues span 5 groups; treat the 21-vs-22 discrepancy as a milestone-doc rounding artifact.

**Must have (table stakes), by group:**
- **EDT responsiveness:** network/token work off the EDT before UI-blocking calls (#506 — verify only, already fixed), debounced settings/notification `node --version` spawns (#541, #543), crash-restart delay via `Alarm` not `Thread.sleep` in `invokeLater` (#513), single guarded restart entry point (#539), serialized Node download (#537)
- **EM token security:** fail-closed token expiry on all three "unable to determine" branches (#535), owner-only temp file permissions (#536 — verify only, already fixed via `BbjProcessSecretEnv.createOwnerOnlyFile`), non-keychain backend warning (#552), short trust-window cache before re-validating server-side (#542)
- **Feature parity/correctness:** "Compile BBj File" actually invokes bbjcpl and surfaces success/diagnostics (#571), string-literal-aware bracket matching (#568), case-insensitive REM comment toggle (#540)
- **Composer robustness:** re-validated document offsets before post-dialog apply (#567), visible signal on composer LSP request failure (#538)
- **Build/test foundation:** JDK 17 toolchain pin (#570), checksum-verified current Gradle wrapper (#503, #576), fail-fast when the LS bundle copy is missing (#517), regression tests for the behaviours this milestone changes (#569 — largely already satisfied; #554/#544 for LSP4IJ-experimental-API coupling)

**Should have:** none scoped as differentiators — the one arguable one is *framing*, not code: shipping the fail-closed security posture across #535/#536/#552/#567 coherently in release notes is free differentiation once the fixes land.

**Defer (explicitly out of this milestone):** full BBjCPL 18-option UI parity beyond success/diagnostics surfacing; any `BbjWordLexer`/parser rewrite beyond the #568 string-scan addition (ruled out by standing "no native lexer rewrite" project decision); broader dependency-locking/SCA tooling beyond the wrapper pin + Dependabot entry; #566 and other v4.1 carry-overs; a general-purpose async/threading abstraction (route each fix through the existing `Alarm`/`executeOnPooledThread` patterns instead); forcing `PasswordSafe` to always use the native keychain (a warning, not an override, per #552's own scoping).

### Architecture Approach

The 22 fixes attach to existing, unchanged component boundaries — there is no new architectural layer to design except two small, genuinely-new shared components both research passes independently flag: a token-validation trust-window cache next to `BbjEMTokenStore` (needed by #542), and a shared Node-version cache in front of the stateless `BbjNodeDetector` (needed by both #541 and #543, to avoid duplicating cache logic in two files). The one cross-package change is #571: a new `bbj/compile` LSP4IJ custom request added to the shared Langium LS (`bbj-vscode/src/language/main.ts`), following the exact precedent already set by `bbj/refreshJavaClasses` and the 7-method `bbj/composer/*` family, wrapping the LS's existing, editor-agnostic `BBjCPLService.compile()` rather than re-implementing compiler invocation on the IntelliJ side.

**Major components:**
1. `actions/BbjRunActionBase.java` + `BbjEMTokenStore.java` — off-EDT run/login pipeline (already correctly pooled per CR-02) and token validity/caching (#535, #542, #552 land here)
2. `ui/BbjServerService.java` — LS lifecycle, crash detection, the one proven `Alarm`-based debounce pattern (`restartAlarm`) that #513/#539 extend to more call sites
3. `BbjSettingsComponent.java` / `BbjMissingNodeNotificationProvider.java` + new `BbjNodeVersionCache` — settings-dialog and editor-notification debounce/caching (#541, #543)
4. `composer/ComposerLauncher.java` + 3 dialog classes — capture-decode-apply flow needing both exception handling (#538) and offset re-validation (#567), which must be planned together
5. `lsp/BbjCompletionFeature.java` etc. (7 files) — LSP4IJ `@ApiStatus.Experimental` coupling, isolated behind thin wrappers with canary regression tests (#544, #554)
6. `bbj-vscode/src/language/main.ts` + `bbj-cpl-service.ts` (shared LS) — new `bbj/compile` request wrapping the already-existing, vscode-free `BBjCPLService.compile()` (#571)
7. `build.gradle.kts` + Gradle wrapper — toolchain pin, wrapper regeneration, fail-fast LS-bundle copy check (#570, #503/#576, #517)

### Critical Pitfalls

1. **Treating issue text as current source state instead of re-diffing against `main`** — #506, #536, and the "#569 has no test source set" claim are all stale; verify against current source before writing any production code, or a phase wastes effort re-implementing (and risks regressing) already-correct fixes.
2. **A validation trust-window cache (#542) extends the blast radius of the fail-open bug (#535) if sequenced wrong** — key the cache on the exact token value, invalidate on `storeToken`/`deleteToken` (not only a timer), and land #535 first or in the same PR; a cache that remembers "validated" without re-checking bytes can wave a malformed token through the server-side check too.
3. **New debounce `Alarm`s not parented to a real `Disposable`** — the one correct example (`BbjServerService.restartAlarm`) is parented to a project-level service; `BbjSettingsComponent`/static utilities have no natural `Disposable` today, so #541/#543's new `Alarm`s need one added or they leak or throw.
4. **Porting VS Code's `Commands.cjs` compile flow literally instead of routing through the shared LS** — `Commands.cjs` is extension-host-only code (`vscode.workspace.getConfiguration`, direct `execFile`), not LSP-routed; #571 must add a `bbj/compile` request wrapping `BBjCPLService.compile()`, or the milestone creates a third, independently-drifting bbjcpl invocation.
5. **Fixing `.exceptionally()` (#538) without offset re-validation (#567) leaves the more dangerous case uncaught** — a stale-offset apply after a modal dialog closes usually does *not* throw, so `.exceptionally()` alone gives false confidence; plan both against `ComposerLauncher.java` as one phase.

## Implications for Roadmap

Both FEATURES.md's "Sequence First/Together/Independent/Last" ordering and ARCHITECTURE.md's explicit 8-wave build order converge on the same structure. Recommended phase grouping, reconciling both:

### Phase 1: Build & Test Foundation (verify-first)
**Rationale:** #570 gates every subsequent `./gradlew` invocation in this dev environment (current JDK 25 reproduces the exact #570 failure); #569's test-source-set claim is stale (7 JUnit 5 classes already exist) but needs explicit verify-and-close; #506 and #536 are also already-fixed and belong in this same "confirm, don't reimplement" pass since they're cheap wins that close 2 of 22 items immediately with zero production-code risk.
**Delivers:** working `./gradlew` on any JDK, verified wrapper checksum (#503+#576, same command), fail-fast LS-bundle copy check (#517), #506/#536/#569 closed as verify-only with backfilled regression tests.
**Addresses:** Group 5 (build/platform coupling) table stakes; unblocks regression coverage for every other group.
**Avoids:** Pitfall 1 (stale-issue-text re-implementation), Pitfall 13 (tests written before #569/#570 land and unable to compile/run).

### Phase 2: EDT Responsiveness — Shared-State Guards
**Rationale:** #539 and #513 touch the same file (`BbjServerService.java`) and the same `Alarm`; do #539 (guarded restart entry point) first so #513's crash-delay fix lands on top of the already-guarded `restart()`. #537 (Node download CAS guard) is a different file, no ordering dependency, can run in parallel.
**Delivers:** single guarded restart path, no EDT-blocking `Thread.sleep`, no download race.
**Uses:** `AtomicBoolean`/`synchronized` (JDK), `Alarm.ThreadToUse.POOLED_THREAD` (already proven in this class).
**Implements:** the `ui/BbjServerService` component; extends the anti-pattern guidance in PITFALLS.md (Pitfall 3: keep the guard scoped to match the resource — JVM-wide, not per-project).

### Phase 3: EM Token Security
**Rationale:** #535 must land before #542 — caching a fail-open expiry check widens the vulnerability rather than duplicating it (PITFALLS.md Pitfall 6, cross-confirmed by FEATURES.md's dependency graph). #552 touches the same file (`BbjEMTokenStore.java`) as #535 and can batch together but is logically independent of #542.
**Delivers:** fail-closed token expiry (all three branches, ideally collapsed into one `TokenValidity` result type per Pitfall 5), short trust-window validation cache, non-keychain backend warning.
**Addresses:** Group 2 table stakes in full.
**Avoids:** Pitfall 5 (partial fail-open fix), Pitfall 6 (cache outliving revocation), Pitfall 7 (unstable `PasswordSafeSettings` API — isolate behind one method).

### Phase 4: Settings/Notification Caching Layer
**Rationale:** #541 and #543 both need a new shared Node-version cache to exist before either lands cleanly — build once, wire both consumers, rather than duplicating cache logic per issue (this is architecture's one genuinely-new shared component beyond the token cache).
**Delivers:** `BbjNodeVersionCache` (or equivalent), debounced settings-dialog updates, cached notification-provider lookups.
**Uses:** the `Alarm` debounce idiom from Phase 2; a plain memoized field (not a timer) for the pure read-cache side per Pitfall 4's recommendation.
**Implements:** the new cache-layer boundary between `BbjSettingsComponent`/`BbjMissingNodeNotificationProvider` and `BbjNodeDetector`.

### Phase 5: Compile Action (#571)
**Rationale:** the only issue crossing the `bbj-vscode`/`bbj-intellij` boundary and the largest single change; best run after Phase 1 so a missing/stale `main.cjs` fails fast (via #517's check) rather than silently. No hard dependency on Phases 2-4 — could run in parallel with them if capacity allows, but sequence after Phase 1's build-foundation work lands.
**Delivers:** a real `bbj/compile` LSP4IJ request in the shared LS wrapping `BBjCPLService.compile()`, plus the IntelliJ-side action and server-proxy interface extension.
**Uses:** the `@JsonRequest`/`BbjComposerServer` extension pattern from STACK.md; `bbj-vscode/src/language/main.ts` changes require `npm run build` before the IntelliJ side can call the request end-to-end.
**Implements:** the compile-action data flow in ARCHITECTURE.md; **must not** literally port `Commands.cjs` (Pitfall 9) — deliberately smaller scope than VS Code's 18-option-aware compile flow, worth calling out explicitly in this phase's acceptance criteria so it isn't read as scope creep.

### Phase 6: Lexer/Commenter (#568, #540)
**Rationale:** fully independent files, zero shared state with anything else in this milestone — safe to parallelize with any other phase, sequenced late here only because it's structurally the most involved of the "quick fix" issues (3 coordinated files for #568).
**Delivers:** string-literal-aware bracket matching (with correct BBj `""`-doubling escape handling — Pitfall 10), case-insensitive REM toggle with word-boundary matching, not a bare prefix match (Pitfall 11).
**Addresses:** Group 3 remaining items.

### Phase 7: Composer Robustness (#538, #567)
**Rationale:** must be planned as one phase against `ComposerLauncher.java` — #538's `.exceptionally()` handlers alone won't catch #567's stale-offset failure mode (which usually doesn't throw). Do #538 first so #567's new re-validation call sites inherit the same failure-surfacing convention.
**Delivers:** every composer `CompletableFuture` chain gets a terminal exception handler; a shared re-decode-and-validate helper guards all three apply paths (`openMsgbox`, `applyAddWindowEdit`, `applyHexEdit`).
**Avoids:** Pitfall 12 (fixing one without the other leaves the more dangerous case uncaught). **Open UX decision that must be resolved before/during planning, not discovered mid-PR:** on an offset mismatch, does the plugin re-prompt to reopen against current state, or abort silently with a notification? Both FEATURES.md and ARCHITECTURE.md recommend **abort + notify** (matches the fail-safe posture already used for #535, and reuses the visible-notification convention #538 establishes) over silent reopening, which risks losing dialog state the user already entered — but the issue itself leaves this open, so it should be an explicit discussion/decision checkpoint at the start of this phase, not an implementation-time guess.

### Phase 8: LSP4IJ Coupling Regression Tests (#544, #554)
**Rationale:** do this last relative to #571 — #571 adds a new LSP4IJ-coupled surface (the compile request/interface extension) that these regression tests should also cover; writing them before #571 lands means writing them twice. #544 supersedes #554 (same 2 files are a strict subset of #544's 7 files); implement #544's scope once and close #554 as covered.
**Delivers:** reflective canary assertions + structural source-guard tests (following the existing `BbjLanguageServerSourceGuardTest` pattern) for every LSP4IJ `@ApiStatus.Experimental` coupling point.
**Uses:** the existing plain-JUnit-5 source-guard test pattern — explicitly NOT a new `BasePlatformTestCase`/live-IDE fixture investment (out of scope for this milestone per STACK.md).

### Phase Ordering Rationale

- **#570 → #576/#503, and #570/#569 → everything else's regression coverage**: hard dependencies — every `./gradlew` invocation in this environment fails before task listing without the toolchain pin, and several issues' acceptance criteria explicitly condition their regression test on the test-source-set gap (already closed, per architecture's correction) or fall back to "recorded manual verification."
- **#535 → #542**: hard dependency, security-correctness reason (caching a fail-open result widens rather than duplicates the bug).
- **new node-version cache → #541, #543**: hard dependency — both fixes need the cache to exist first; they're then parallelizable.
- **bbj-vscode main.ts change → npm run build → bbj-intellij side of #571**: hard dependency — IntelliJ cannot call a request the shipped `main.cjs` doesn't implement yet.
- **#538 → #567 (soft)**: shared failure-surfacing convention should exist before the code that needs to use it; both belong in one phase regardless.
- **#571 → #544/#554 (soft)**: avoids writing the LSP4IJ-coupling regression test twice.
- **#506, #536 (no edges)**: verify-and-close, can happen at any point — do them early as cheap wins.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Compile Action, #571):** the only cross-package (`bbj-vscode` + `bbj-intellij`) change in this milestone; needs careful review of the LS-side `bbj/compile` request shape and how diagnostics are rendered on the IntelliJ side (standard LSP diagnostics channel vs. a custom panel) — not yet fully specified.
- **Phase 3 (EM Token Security, #552 specifically):** relies on `PasswordSafeSettings`/`ProviderType`, an `@ApiStatus.Internal` unversioned-contract API — confirm its exact shape against the pinned `intellijIdeaCommunity("2024.2")` platform version at implementation time, don't assume from research alone.
- **Phase 7 (Composer Robustness, #567):** the re-prompt-vs-abort UX decision is explicitly unresolved in the source issue; needs a discussion/decision checkpoint before coding starts, not deep technical research, but should not be skipped.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Build Foundation):** STACK.md's installation recipe is copy-paste-ready (exact Gradle version, checksum, plugin blocks already specified).
- **Phase 2 (EDT Guards) and Phase 4 (Caching Layer):** reuse the codebase's own proven `Alarm`/`executeOnPooledThread` patterns verbatim — no new research needed, just careful application.
- **Phase 6 (Lexer/Commenter):** the reference implementations (`bbj.langium`'s string/comment terminals, `bbj.tmLanguage.json`) already exist in-repo to replicate against.
- **Phase 8 (LSP4IJ Regression Tests):** follows an established in-repo test pattern (`BbjLanguageServerSourceGuardTest`) exactly.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions/APIs cross-checked against JetBrains/Gradle/redhat-developer source or official docs; two items (exact Gradle-9-minimum-bump version for the platform plugin, `BasePlatformTestCase`'s precise JUnit-version specifics) are MEDIUM within an overall HIGH file |
| Features | HIGH | All 22 issues have concrete file:line evidence read directly from `main`; VS Code parity claims verified against source, not assumed |
| Architecture | HIGH | Every claim verified against current `bbj-intellij/src/main/java/...` and `bbj-vscode/src/...` as they exist today, not against the 2026-08-20 issue text — this is what surfaced the #506/#536/#569-staleness correction |
| Pitfalls | HIGH | Grounded in current source plus `.planning/PROJECT.md`'s own decision log (CR-02); no external ecosystem research needed for an internal burn-down |

**Overall confidence:** HIGH

### Gaps to Address

- **#552's `PasswordSafeSettings`/`ProviderType` API stability**: confirmed present in source but explicitly `@ApiStatus.Internal` with no regression guarantee — isolate behind one method and add a canary test (per Phase 8's pattern) rather than treating it as settled.
- **#567's re-prompt-vs-abort UX decision**: not a research gap so much as an explicit open product decision the issue itself flags — surface it as a discussion checkpoint at the start of Phase 7, don't let it be decided implicitly by whoever implements first.
- **Exact Gradle version at which `intellij-platform-gradle-plugin` first requires Gradle 9.0.0**: STACK.md flags this as MEDIUM confidence (a search-summary claim, not read from the plugin's own changelog) — irrelevant to this milestone's Gradle-8.14.5 recommendation, but worth a quick re-check if a future milestone considers the Gradle 9 jump.
- **Diagnostics-rendering UX for #571**: the research establishes the LS-side request shape and the `{ success, diagnostics }` return contract, but not how IntelliJ should visually surface a failed compile (notification vs. Problems-panel-style display) — worth a small discussion at the start of Phase 5, not a blocking gap.

## Sources

### Primary (HIGH confidence)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/**/*.java` (read in full across all four research passes) — current, ground-truth source for every fix site and the #506/#536/#569 staleness correction
- `bbj-vscode/src/language/main.ts`, `composer-commands.ts`, `bbj-cpl-service.ts`, `bbj-cpl-parser.ts` — shared LS precedents and reuse targets for #571
- `bbj-vscode/src/Commands/Commands.cjs`, `CompilerOptions.ts` — read directly, confirmed extension-host-only, not LSP-routed (grounds Pitfall 9)
- `bbj-intellij/build.gradle.kts`, `settings.gradle.kts`, `gradle/wrapper/gradle-wrapper.properties` — current pinned versions, existing test suite shape
- `docs.gradle.org`, `plugins.gradle.org`, `services.gradle.org` (toolchain/wrapper checksum docs) — official Gradle sources
- `github.com/JetBrains/intellij-community` (`PasswordSafe.kt`, `PasswordSafeSettings.kt`, `ProviderType.kt`) — read directly for #552 grounding
- `github.com/redhat-developer/lsp4ij` `0.19.0` git tag — confirmed `getServerInterface()`/`LanguageServerManager` present, no version bump needed for #571
- `.planning/PROJECT.md`, `CLAUDE.md` — milestone goal, Active Requirements, Out of Scope, Key Decisions (CR-02, LSP4IJ-over-native-parser)

### Secondary (MEDIUM confidence)
- Web search on `intellij-platform-gradle-plugin`'s Gradle-9-minimum-version bump — fact of the bump confirmed, exact version unconfirmed
- `plugins.jetbrains.com` docs on `BasePlatformTestCase`'s JUnit-version-shaped hierarchy — corroborated by source but not fully read line-by-line

### Tertiary (LOW confidence)
- None identified — all four research files report HIGH confidence overall, with only the two MEDIUM caveats noted above.

---
*Research completed: 2026-09-04*
*Ready for roadmap: yes*
