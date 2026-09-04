# Feature Research

**Domain:** IntelliJ Platform plugin hardening (LSP4IJ-based language client) — burn-down of 21 open PRIO 1/2 issues from the v4.0 audit
**Researched:** 2026-09-03
**Confidence:** HIGH (all 22 issues have concrete file:line evidence in-repo; VS Code parity claims verified against source; IntelliJ Platform conventions verified against this plugin's own existing patterns)

> Note: the milestone header says "21 open PRIO 1/2 issues" but the source list
> (`intellij-prio12.md`) contains 22 issue numbers across 5 groups. All 22 are mapped below;
> treat the discrepancy as a milestone-doc rounding artifact, not a missing issue.

## Context: this is not a net-new-feature milestone

Every item here is a **correctness/hardening fix to an existing, shipped v1.0-v3.9 feature**, not
a new product capability. "Table stakes" therefore means *the behaviour a mature IntelliJ plugin
already exhibits for a feature class this plugin already ships* (EDT hygiene, credential handling,
compile actions, bracket matching, async error handling, reproducible builds) — the bar this
plugin currently falls short of on 22 specific call sites. There are no differentiators to chase
in this milestone; over-delivering here (e.g. building a general async-task framework) is itself
an anti-feature given the fixed 21/22-issue scope.

## Feature Landscape

### Table Stakes (Users/Contributors Expect These)

Behaviours a mature IntelliJ plugin already exhibits. Missing them makes this plugin feel
amateurish relative to any JetBrains-verified plugin, or (for the security items) actively unsafe
relative to the VS Code sibling extension that already does this correctly.

#### Group 1 — EDT responsiveness

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| Network/token work runs off EDT before any UI-blocking call (#506) | JetBrains plugin guidelines: any I/O, network, or process spawn must never run on the Swing EDT. `BbjRunActionBase.actionPerformed()` calls `buildCommandLine()` synchronously at `:60` *before* the existing `executeOnPooledThread(...)` dispatch at `:67`, so BUI/DWC runs can freeze the IDE ~25s (10s token validate + 15s re-login). `BbjEMLoginAction` has no pooled-thread dispatch at all. | LOW | Pure reordering: move `buildCommandLine()` inside the pooled-thread block. Pattern already exists elsewhere in this same file (`:65` `executeOnPooledThread`) — no new machinery needed. |
| Settings-dialog and notification `node --version` spawns off EDT, debounced (#541, #543) | Typing in a settings field, or a passive editor-notification refresh, must never block on subprocess I/O. Both `BbjSettingsComponent`'s document listeners (`:148-164`) and `BbjMissingNodeNotificationProvider.collectNotificationData` (`:28-59`) spawn `node --version` synchronously; the settings case is on every keystroke, the notification case on every editor-notification refresh (i.e. far more than once per session). | LOW-MEDIUM | Plugin already has a working `Alarm`-debounce pattern (`BbjServerService.restartAlarm`, `BbjJavaInteropService.checkAlarm`) to copy for #541's keystroke case. #543 needs a simple last-known-good cache keyed by path, invalidated on settings change — no debounce needed, just memoization. |
| Crash auto-restart delay scheduled off EDT (#513) | A cosmetic pre-restart delay must not be a `Thread.sleep()` inside `invokeLater()` — that freezes the *entire* IDE, not just this plugin's UI, for the sleep duration. `BbjServerService.updateStatus()`'s `crashCount == 1` branch does exactly this for 1 second. | LOW | The fix target — `restartAlarm.addRequest(this::restart, 1000)` — already exists as working code in the same class (used by `scheduleRestart()`); this is literally routing one more call site through infrastructure already present. |
| Single guarded restart entry point (#539) | A restart/recovery action must be idempotent under rapid double-invocation (double-click, or user action racing an automatic recovery). Six call sites invoke raw `restart()` directly, bypassing the debounced `scheduleRestart()`, so two triggers close together can race `manager.stop()`/`manager.start()` with no synchronization. | LOW-MEDIUM | `scheduleRestart()`/`restartAlarm` already exist and are proven (one caller already uses them, per the Phase 67 close-out correction noted in the issue). Fix is consolidating 5 more call sites onto the existing entry point, or guarding raw `restart()` with an `AtomicBoolean`. |
| Serialized/single-flight background downloads (#537) | A one-time bootstrap download (Node.js runtime) must not race itself across two IDE windows or near-simultaneous triggers. `downloadNodeAsync()`'s in-progress flag is check-then-set across two unsynchronized `PropertiesComponent` calls (`:71`, `:79`), with task queueing/start intervening — a classic TOCTOU race that risks two `Files.copy(..., REPLACE_EXISTING)` calls interleaving into a corrupt or partially-extracted node binary. | LOW | `synchronized` block or `AtomicBoolean.compareAndSet` around the existing flag. No architecture change. |

#### Group 2 — EM token security

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| Fail-closed token expiry (#535) | A credential validity check must never be more permissive on malformed/unverifiable input than on a genuinely fresh token — "unable to determine" must map to "treat as expired/untrusted," never to "treat as valid." `isTokenExpired()` returns "not expired" for a non-3-part token, an exp-less payload, and any decode exception (three separate branches, `:64-66`, `:76-77`, `:84-86`). No signature verification exists anywhere in the file. | LOW | Flip the three "unable to determine" return values from `false`/not-expired to `true`/expired (or gate behind an explicit `isTokenWellFormed()` precondition). Pure logic change, no new dependency. |
| Owner-only permissions on temp files holding plaintext JWTs (#536) | Any temp file holding a bearer credential must be created with an explicit owner-only ACL from the moment of creation — relying on umask/OS defaults is not a stated guarantee. Both `BbjRunActionBase.java:295` and `BbjEMLoginAction.java:96` call `Files.createTempFile` with no `FileAttribute` argument, leaving default (potentially world-readable on some OS/JVM combos) permissions for the window until the finally-block delete. | LOW | `PosixFilePermissions.asFileAttribute(EnumSet.of(OWNER_READ, OWNER_WRITE))` at both call sites, with a documented Windows ACL caveat (NTFS defaults are already user-scoped per-profile, so the POSIX branch is the actionable one). |
| Warn when the credential backend is not the native OS keychain (#552) | A plugin storing a security-sensitive credential via `PasswordSafe` should tell the user, once, when the *resolved* backend is something weaker than the native keychain (KeePass-file or memory-only) — because that resolution is driven by an IDE-wide setting outside the plugin's control, unlike VS Code's fixed `SecretStorage` binding (`extension.ts:587,667`) which offers no such lever and needs no such warning. | LOW-MEDIUM | One-time notification (`Notifications.Bus` or similar) gated on `PasswordSafe`'s reported backend type at token-store time. This is a UX addition, not a storage-mechanism change — do NOT attempt to force a specific backend (see Anti-Features). |
| Short trust window before re-validating a token server-side (#542) | Redundant identical network round-trips on every user action are a UX and correctness smell, *especially* when (per #506) that round trip runs before the pooled-thread dispatch and each redundant call directly extends the EDT-freeze window. `validateTokenServerSide()` (10s timeout) is called unconditionally on every Run invocation with no cache of "validated at T, trust until T+window." | LOW-MEDIUM | Cache `(tokenValue, validatedAtEpoch)`; skip re-validation within a short window (e.g. minutes, not hours — this is a security control, not a performance cache, so the window must stay short and reset on token change). Directly compounds with #506's fix — plan these together. |

#### Group 3 — Feature parity and correctness

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| "Compile BBj File" actually invokes bbjcpl and surfaces success/diagnostics (#571) | A command that presents as enabled and available (`update()` gates it on file type + server-started) must do what its label says, or not exist. `BbjCompileAction.actionPerformed()` currently only logs "[Compile] Triggered for file: ..." — confirmed against VS Code's real, 18-option-aware compile flow (`Commands.cjs:298-345` via `CompilerOptions.ts`'s `buildCompileOptions`/`validateOptions`). A user sees no error and reasonably believes the file compiled. | MEDIUM-HIGH | Requires a **new shared LS surface**, not just an IntelliJ-side fix: a `bbj/compile` LSP4IJ custom request/notification, following the exact established pattern already used by `bbj/refreshJavaClasses` (`main.ts:32`) and the 20+ `bbj/composer/*` handlers (`composer-commands.ts`). The LS side can largely delegate to the same `buildCompileArgv`/compiler-options logic VS Code already has in `Commands.cjs`/`CompilerOptions.ts` — this is a wiring/parity task, not new compiler-integration design (BBjCPL integration already exists per PROJECT.md v3.7). IntelliJ side then sends the request and renders success/diagnostics (reuse the existing LS-log-window convention, or route diagnostics through the standard LSP diagnostics channel already wired for editor validation). Regression coverage is blocked on #569 (no `src/test/` source set) unless a manual verification step is recorded at merge time. |
| Brackets inside string literals are not treated as structural for matching/navigation (#568) | `PRINT "value (not a bracket)"` must not have IntelliJ's bracket-highlight, Ctrl+Shift+M navigation, or auto-close-bracket treat the parens inside the string as a real pair — this is standard IDE lexer hygiene for any language with string literals, and BBj user-facing message strings routinely contain parens. `BbjWordLexer.advance()`'s punctuation branch tokenizes brackets unconditionally by character with no string-literal state; `getStringLiteralElements()` returns `TokenSet.EMPTY`. | MEDIUM | Needs a real lexer state addition: a quote-delimited scan branch emitting a new `STRING` `IElementType`, wired into `BbjParserDefinition.getStringLiteralElements()`, with `BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType` guarded against it. This is the most structurally involved of the "quick fix" issues in this milestone — it touches three coordinated files (lexer, parser-definition, brace-matcher) rather than one. Must handle BBj's quoting rules faithfully (single vs double quote, escape handling if any) to avoid regressing legitimate bracket matching outside strings. |
| REM comment toggle is case-insensitive, matching the grammar (#540) | BBj is a case-insensitive language (stated in this repo's own CLAUDE.md); the comment-toggle keyboard shortcut must recognize `rem`, `Rem`, `REM` alike as "already commented," the same way the grammar's comment terminal already does. `BbjCommenter.getLineCommentPrefix()` returns the fixed literal `"REM "`, so toggling an already-lowercase-commented line inserts a second prefix (`REM rem ...`) instead of removing it. | LOW | Either normalize case before IntelliJ's literal-prefix comparison in a custom commenter, or (more robust, matches the issue's own stated preferred direction) add a lexer-level `COMMENT` token so the platform's PSI-aware commenting path applies instead of raw-text matching. Low line-count, but the PSI-token route is the "do it right once" option worth weighing against the cheaper string-normalize patch. |

#### Group 4 — Composer robustness

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| Captured document offsets are re-validated before being applied post-dialog (#567) | Any modal-dialog flow that captures a document position *before* showing the dialog and applies an edit at that position *after* the dialog closes must re-check that the document hasn't changed underneath it — standard "stale range" hygiene for any IDE quick-fix/refactoring UX. `ComposerLauncher.launch()` captures `line`/`lineText`/`col` and decodes the call before `dialog.showAndGet()`; all three apply methods (`openMsgbox`, `applyAddWindowEdit`, `applyHexEdit`) use those same captured offsets afterward with zero re-decode step, risking a throw or — worse — a silent overwrite of unrelated text that has since moved into that byte range. | MEDIUM | Add a shared re-decode-and-validate helper reachable from all three apply paths, re-decoding at the captured line/offsets immediately before `WriteCommandAction.replaceString` and diffing against the pre-dialog decode. **Open UX decision the issue explicitly flags as unresolved:** on mismatch, does the plugin re-prompt the user to reopen against current state, or silently abort the edit with a notification? This must be decided before/during planning — it's a product behaviour choice, not an implementation detail. Recommend: abort + notify (matches the fail-safe posture used elsewhere in this milestone, e.g. #535's fail-closed pattern) over silent reopening, which risks losing dialog state the user already entered. |
| Composer LSP request failures produce a visible signal, not silence (#538) | Any async chain wrapping a network/LSP request must have a terminal `.exceptionally()`/`.handle()` — an unhandled exceptional `CompletableFuture` is a well-known Java pitfall the platform's own conventions guard against. Every composer chain in this unit (`ComposerLauncher.launch()`'s nested chain, and each dialog's `refresh()` chain) has zero completion-exception handlers across 13 files (`grep` for `exceptionally|whenComplete|.handle(|catch(` returns 0 matches). A server restart, timeout, or connection drop mid-request produces zero visible effect — worse, an already-open dialog's `refresh()` silently stops updating its preview, leaving stale text the user can unknowingly accept via a still-clickable OK button. | LOW-MEDIUM | Add `.exceptionally(t -> onEdt(() -> notifyNotReady(...)))` (the issue's own proposed shape) to each of the ~4+ chains identified. Mechanical repetition across files rather than novel design — the main design decision is what the user-visible notification says and whether a stale-preview dialog also disables its OK button, not just shows a message (worth considering as a stronger mitigation than notification alone, given the "unknowingly accept stale text" failure mode). |

#### Group 5 — Build and platform coupling (contributor-facing, not end-user-facing)

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| JDK 17 toolchain pin (#570) | A Gradle build declaring `sourceCompatibility`/`targetCompatibility` = 17 must also declare a `toolchain { languageVersion = JavaLanguageVersion.of(17) }` block, so the build runs on Gradle's own resolved/downloaded JDK 17 regardless of whatever JVM launched Gradle. Currently the build fails before task listing on any newer JDK (confirmed failing on Temurin 25.0.3) with only the version string as the error — effectively the least actionable Gradle failure possible. | LOW | Standard Gradle idiom, one `toolchain {}` block. The issue explicitly routes ownership to "the dependency-and-build-configuration review's own broader toolchain work" — check whether that broader review is in scope for this same milestone or a dependency to sequence around. |
| Checksum-verified, current Gradle wrapper (#503, #576) | A committed `gradle-wrapper.jar` must be traceable to a specific, intentional Gradle release — not merely "whatever hash happens to match some cluster of old releases." Today the JAR's SHA-256 matches 19 of Gradle's published checksums spanning the 8.10-8.12.1 line, while `gradle-wrapper.properties` declares 8.13 (whose own checksum differs) — an unverifiable, unpinned bootstrap artifact that executes with `secrets.JETBRAINS_MARKETPLACE_TOKEN` authority in release workflows. #576 additionally notes the pin is ~18 months stale (8.13 vs. current 9.7.0) and, because the build can't run on newer JDKs (#570), the transitive dependency tree is currently unenumerable by anyone. | LOW-MEDIUM | `./gradlew wrapper --gradle-version <release> --gradle-distribution-sha256-sum <checksum>` regenerates a verifiable wrapper; add a `gradle` entry to `.github/dependabot.yml` so this doesn't silently drift again. #570 (toolchain) should land first or alongside, since `./gradlew dependencies` needs a working JDK story to actually enumerate the tree #576 asks for. |
| Fail-fast when the language-server bundle is missing, instead of silently assembling an incomplete plugin (#517) | A Gradle copy task pulling a build artifact from a sibling module (`bbj-vscode/out/language/main.cjs`, gitignored, produced only by `bbj-vscode`'s own `npm run build`) must either declare that dependency or fail loudly when the source is absent — never silently produce a plugin missing its core functionality. Neither `copyLanguageServer` nor the `prepareSandbox` customization has a `dependsOn`, an `Exec` task, an `onlyIf`, or a `doFirst` existence check today. | LOW | Add a `doFirst` existence assertion with a directed error message ("run `npm run build` in bbj-vscode/ first") at both copy sites. Does not require wiring a cross-Gradle/npm task dependency (which would be a bigger, riskier change) — a clear failure message satisfies the acceptance criteria as written. |
| Regression tests exist at all for this module (#569, #554, #544) | A module shipping EDT-sensitive UI code, a security-relevant credential store, and coupling to an explicitly `@ApiStatus.Experimental` third-party API surface (LSP4IJ) must have *some* test harness that would fail if any of that broke — right now `bbj-intellij` has zero `src/test/` source set and zero test dependency declared. #554/#544 additionally document that 7 files / 20 references couple directly to three LSP4IJ classes marked experimental by their own vendor, with literally nothing to catch a breaking change at plugin-update time. | MEDIUM | This is the **foundational dependency for regression coverage on nearly every other fix in this milestone** — #506, #513, #571 all explicitly note their own regression coverage is blocked on this gap (or on a recorded manual-verification step as a substitute). Establishing the `src/test/` source set + JUnit dependency + first test class should be sequenced early, not last, even though it's filed as its own issue — every EDT and security fix in Groups 1-2 wants a JUnit regression test per its own acceptance criteria, and none of those tests can exist until this lands. |

### Differentiators (Competitive Advantage)

This milestone has essentially none in the traditional sense — it is closing a correctness gap
against the plugin's own VS Code sibling and against baseline IntelliJ Platform conventions, not
building new capability. The one arguable differentiator:

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Fail-closed-by-default posture applied consistently (token expiry #535, temp-file perms #536, backend warning #552, offset re-validation #567) | Most IDE plugins handling credentials get *one* of these right; doing all four coherently is a genuine trust signal for an enterprise-facing tool (BBj shops care about EM credential handling). Framing it as one coherent security posture in release notes, rather than four disconnected bugfixes, is free differentiation once the fixes land. | N/A (documentation framing, not code) | Not a build item — a note for whoever writes release notes / the security advisory once this milestone ships. |

### Anti-Features (Commonly Requested, Often Problematic)

Traps specific to a bug-burn-down milestone with a fixed, externally-scoped issue list.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| General-purpose async/threading framework (a `BbjBackgroundTask` abstraction, a shared debounce utility class, etc.) | Six EDT issues (#506, #541, #543, #513, #539, #537) look like they'd benefit from one shared abstraction, and it's tempting to build it once "properly." | Scope creep against a fixed 21/22-issue list; the plugin already has two working, proven patterns (`Alarm`-based debounce in `BbjServerService`/`BbjJavaInteropService`, `executeOnPooledThread` in `BbjRunActionBase`/`BbjEMLoginAction`) — introducing a third abstraction adds a new thing to learn and test rather than reusing what's already validated in production. | Route each fix through whichever *existing* pattern already fits (Alarm for debounce, executeOnPooledThread for one-shot dispatch); only extract a shared helper if literally the same 5+ line block is copy-pasted 3+ times, and even then keep it a static utility, not a new class hierarchy. |
| Forcing `PasswordSafe` to always use the native keychain, overriding the IDE-wide "Save passwords" setting (#552) | Seems like the "real" fix for the backend-varies problem — just don't let it vary. | IntelliJ Platform plugins are not supposed to override a user's/org's IDE-wide security policy setting; doing so would itself be a worse trust violation than the one being fixed, and may not even be achievable via public `PasswordSafe` API. The issue's own proposed approach is explicitly a *warning*, not a backend override. | One-time notification when the resolved backend isn't the native keychain (as scoped in the issue and in the table above). |
| A full BBjCPL option-surface UI port to IntelliJ as part of #571 | VS Code's compile flow is "18-option-aware" (`CompilerOptions.ts`); it's tempting to port the whole options dialog to reach full parity in one pass. | Massively inflates #571's scope beyond its stated acceptance criteria ("surfaces the result — success or diagnostics — to the user instead of only logging a message"). PROJECT.md's Out of Scope already defers BBjCPL `-t` static type checking, pipe mode, and diagnostic range correlation to a future milestone — a full options UI port belongs in that same future-milestone bucket, not this burn-down. | Ship the minimal `bbj/compile` request using whatever compiler-options defaults/config the LS already resolves (mirroring `Commands.cjs`'s config-read + `buildCompileOptions` call), surface success/diagnostics, and leave an IntelliJ options-configuration UI for later. |
| Rewriting `BbjWordLexer` as a "real" PSI-aware lexer/parser while fixing #568's string handling | Once you're adding lexer state for strings, it's tempting to fix the lexer's broader ad-hoc, character-by-character design in the same pass. | PROJECT.md's Out of Scope explicitly rules out "Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS." `BbjWordLexer` exists only for TextMate-adjacent bracket matching/highlighting, not as a real parser; a broader rewrite is out of scope by standing project decision, not an oversight. | Add exactly the quote-delimited scan branch #568's acceptance criteria describe, touching only the three named files. |
| A comprehensive Gradle/dependency-management overhaul (version catalogs, dependency-locking, full SCA tooling) while fixing #503/#570/#576 | Once you're touching the wrapper and toolchain, it's tempting to modernize the whole build in one pass. | These three issues are scoped narrowly (pin toolchain, regenerate/verify wrapper, add a Dependabot ecosystem entry) and are explicitly the D-06/D-10 "trace evidence, not full remediation" findings from the underlying audit — the issue text itself routes broader toolchain work to "the dependency-and-build-configuration review," a separate unit. | Land the three narrow fixes (toolchain block, wrapper regeneration + checksum, Dependabot `gradle` entry); leave broader SCA/dependency-locking tooling for a future milestone unless that separate review is explicitly also in this milestone's scope. |

## Feature Dependencies

```
#569 (add src/test/ source set)
    └──blocks (regression coverage for)──> #506, #513, #571, #535, #536, #542, #537, #539, #541, #543, #538, #567, #540, #568
                                             (each issue's own acceptance criteria name a regression test,
                                              or explicitly fall back to "manual verification at merge time"
                                              until #569 lands)

#570 (JDK 17 toolchain pin)
    └──blocks──> #576 (stale wrapper / unenumerable dependency tree — needs a working JDK to run `./gradlew dependencies`)
    └──blocks──> #503, #569 (any `./gradlew` invocation on a non-17 JDK fails before task listing)

#503 (wrapper checksum fix) ──pairs-with──> #576 (stale wrapper version) — same file, sequence together

#506 (EDT: run actions call buildCommandLine before pooled dispatch)
    └──shares root cause with──> #542 (redundant server-side re-validation, called from the same
                                        buildCommandLine() path — #542's fix directly shrinks
                                        #506's freeze window; plan/implement together)

#539 (single guarded restart entry point)
    └──depends on──> the existing scheduleRestart()/restartAlarm machinery, already proven by
                      #513's fix target and one pre-existing caller (BbjSettingsConfigurable.apply())

#541 (settings-dialog debounce) ──reuses pattern from──> BbjServerService.restartAlarm / BbjJavaInteropService.checkAlarm
    (both already exist; #541 is applying the same Alarm idiom to a new call site, not inventing one)

#571 (real Compile BBj File)
    └──requires──> a new bbj/compile LSP4IJ request on the shared language server
                       └──follows the established pattern of──> bbj/refreshJavaClasses (main.ts:32)
                                                                  and bbj/composer/* (composer-commands.ts)
    └──can mirror server-side logic from──> bbj-vscode/src/Commands/Commands.cjs:298-345
                                              + CompilerOptions.ts (buildCompileOptions/validateOptions)
                                              — this logic is IDE-agnostic and lives in the shared LS,
                                                so it is reusable, not re-implementable, for IntelliJ

#567 (composer offset re-validation) ──requires a UX decision before implementation──> re-prompt vs. silent-abort on mismatch
    (explicitly unresolved in the issue itself; blocks a clean single PR until decided)

#538 (composer LSP failures surfaced) ──independent of──> #567 (different files/methods within ComposerLauncher
    and the three dialog classes; can ship separately or together)

#568 (string-aware bracket lexing) ──touches the same file family as──> #540 (case-insensitive REM toggle)
    (both live in the lexer/commenter layer, but are otherwise independent — no ordering dependency)
```

### Dependency Notes

- **#569 is the highest-leverage single issue in this milestone.** It's filed as one line item
  but its acceptance criteria are cited as a blocking precondition (or "manual verification"
  fallback) by at least 8 other issues' own acceptance criteria. Sequencing it early — even
  though nothing else strictly *requires* it exist before their code changes land — determines
  whether the rest of the milestone ships with real regression coverage or with a trail of
  "manual verification recorded at merge time" notes.
- **#506 and #542 should be planned as one unit.** They're filed separately (EDT ordering vs.
  redundant re-validation) but touch the exact same `buildCommandLine()` call path and the same
  root symptom (the ~25s freeze). Fixing #506 alone (move the call into the pooled-thread block)
  still leaves the freeze on the pooled thread; #542's trust-window cache is what actually removes
  most of the redundant work causing it on repeated invocations.
- **#570 (toolchain) gates #576 and constrains #503/#569.** Every `./gradlew` command in this repo
  currently fails before task listing on this environment's available JDK (per #570's own evidence:
  Temurin 25.0.3 fails in ~5s with only the version string as output). Any issue whose acceptance
  criteria says "a subsequent `./gradlew X` run..." (see #569's literal wording) is implicitly
  sequenced after #570.
- **#571 is the one issue in this milestone requiring shared-language-server changes**, not just
  an IntelliJ-side fix. It should be planned/reviewed with the same rigor as a cross-package change
  (touches `bbj-vscode/src/language/` in addition to `bbj-intellij/`), unlike every other issue in
  this milestone which is `bbj-intellij/`-only.

## MVP Definition

Not applicable in the traditional "launch product" sense — every issue in this milestone is
already a committed acceptance-criteria item in PROJECT.md's Active Requirements. The relevant
question isn't "what's minimum," it's "what's the safe/testable sequencing." Recommended ordering
by leverage and risk:

### Sequence First (unblocks/de-risks everything else)

- [ ] #569 — add `src/test/` source set — every other fix's regression coverage depends on this existing
- [ ] #570 — JDK 17 toolchain pin — every `./gradlew` invocation in this environment is currently broken without it

### Sequence Together (shared root cause or shared UX decision)

- [ ] #506 + #542 — EDT reorder + trust-window cache, same `buildCommandLine()` path
- [ ] #503 + #576 — wrapper checksum + staleness, same file
- [ ] #567 — needs its re-prompt-vs-abort UX decision made before implementation starts

### Independent, Low-Risk (can parallelize freely once #569/#570 land)

- [ ] #541, #543, #513, #539, #537 — EDT/debounce fixes, each reusing an existing plugin pattern
- [ ] #535, #536, #552 — token security fixes, each self-contained
- [ ] #540, #538 — comment-toggle case-insensitivity, composer exception handling
- [ ] #517 — fail-fast LS-bundle check

### Sequence Last or With Extra Care (structurally larger / cross-package)

- [ ] #568 — coordinated 3-file lexer change (highest structural complexity of the "quick" fixes)
- [ ] #571 — requires a new shared LS surface; the only issue touching `bbj-vscode/` in this milestone
- [ ] #554, #544 — regression-test-only issues for the LSP4IJ-experimental-API coupling; naturally land once #569's harness exists, exercising code that's otherwise untouched by this milestone

### Explicitly Out of This Milestone

- [ ] Full BBjCPL options UI parity beyond success/diagnostics surfacing — future milestone (PROJECT.md Out of Scope)
- [ ] `BbjWordLexer`/parser rewrite beyond the #568 string-scan addition — ruled out by standing "no native lexer rewrite" decision
- [ ] Broader dependency-locking/SCA tooling beyond wrapper pin + Dependabot entry — future milestone
- [ ] #566 (VS Code-side fix) and v4.1 carry-overs — explicitly out of this milestone per PROJECT.md

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| #569 test source set | HIGH (enables everything) | MEDIUM | P1 |
| #570 JDK toolchain pin | HIGH (unblocks all builds) | LOW | P1 |
| #506 EDT reorder (run/login) | HIGH (worst freeze: ~25s) | LOW | P1 |
| #571 real compile action | HIGH (currently silently broken) | MEDIUM-HIGH | P1 |
| #535 fail-closed token expiry | HIGH (security correctness) | LOW | P1 |
| #513 crash-restart sleep off EDT | MEDIUM (1s freeze, but on every crash) | LOW | P1 |
| #536 owner-only temp file perms | MEDIUM (security hardening) | LOW | P1 |
| #542 token re-validation trust window | MEDIUM (compounds #506) | LOW-MEDIUM | P1 |
| #567 composer stale-offset revalidation | MEDIUM (data-corruption risk, narrow trigger) | MEDIUM | P1 |
| #538 composer LSP failure surfacing | MEDIUM (silent failure UX) | LOW-MEDIUM | P1 |
| #539 single restart entry point | MEDIUM (race is narrow-window) | LOW-MEDIUM | P2 |
| #541 settings-dialog debounce | MEDIUM (dialog-only freeze) | LOW-MEDIUM | P2 |
| #543 notification node-version cache | LOW-MEDIUM (redundant work, not a freeze per se) | LOW | P2 |
| #537 serialized Node download | LOW-MEDIUM (narrow multi-window race) | LOW | P2 |
| #552 non-keychain backend warning | MEDIUM (trust/transparency) | LOW-MEDIUM | P2 |
| #568 string-aware bracket lexing | MEDIUM (visible editor-correctness bug) | MEDIUM | P2 |
| #540 case-insensitive REM toggle | LOW-MEDIUM (minor editor annoyance) | LOW | P2 |
| #517 fail-fast LS-bundle check | LOW (contributor DX only) | LOW | P2 |
| #503 wrapper checksum fix | LOW (supply-chain hygiene) | LOW-MEDIUM | P2 |
| #576 stale wrapper/unenumerable deps | LOW (supply-chain hygiene) | LOW-MEDIUM | P2 |
| #554 LSP4IJ-experimental regression tests (2 classes) | LOW (regression safety net only) | LOW (once #569 exists) | P2 |
| #544 LSP4IJ-experimental regression tests (7 files) | LOW (regression safety net only) | MEDIUM (once #569 exists) | P2 |

**Priority key:**
- P1: User-facing freeze/security/silent-failure fixes — the core of "no longer freezes the IDE,
  handles EM tokens securely, matches VS Code on compile" from the milestone goal
- P2: Hardening, contributor-facing, and supply-chain items — the "builds reliably on current
  JDKs" and regression-safety-net portion of the milestone goal

## Competitor Feature Analysis

Not a market-competitor comparison — the relevant "competitor" is this plugin's own VS Code
sibling extension, which already implements the correct behaviour for every Group 3 (parity) item
and several Group 1/2 items. This is the actual comparison basis for this milestone:

| Behaviour | VS Code extension (bbj-vscode) | IntelliJ plugin (bbj-intellij) today | Target after this milestone |
|-----------|--------------------------------|----------------------------------------|------------------------------|
| Compile action | Real bbjcpl invocation, 18-option-aware config, progress notification, success/error surfaced (`Commands.cjs:298-345`, `CompilerOptions.ts`) | Logs a line, never invokes bbjcpl (#571) | New `bbj/compile` LS request; result surfaced |
| Credential storage | Fixed, platform-bound `SecretStorage` — no user-facing lever to weaken it (`extension.ts:587,667`) | Follows IDE-wide "Save passwords" setting, silently varies backend (#552) | Same `PasswordSafe` mechanism, but with a transparency warning when the resolved backend is weaker |
| Long-running action dispatch | `vscode.window.withProgress(...)` wraps async work; VS Code's extension host model keeps the UI thread separate from extension execution by default | Multiple call sites run network/subprocess work synchronously on the EDT before dispatch (#506, #541, #543, #513) | All such work moves inside existing `executeOnPooledThread`/`Alarm` machinery |
| Async failure handling | Standard `try/catch` + `showErrorMessage` around awaited calls (see `compile`'s own `catch (err)` block) | Composer `CompletableFuture` chains have zero `.exceptionally()` handlers anywhere (#538) | Every composer chain gets a terminal exception handler surfacing a notification |
| Comment toggle case sensitivity | N/A — VS Code delegates to TextMate/language-configuration comment rules, which are typically case-agnostic for token matching | `BbjCommenter` does literal `"REM "` string matching (#540) | Case-insensitive recognition matching the grammar's own case-insensitivity |

## Sources

- Issue bodies (evidence, failure scenario, proposed approach, acceptance criteria) for all 22
  issues: `/tmp/claude-1000/-home-coder-repos-bbj-language-server/2efab816-5e9a-42b3-8118-18d873728193/scratchpad/intellij-prio12.md`
  — HIGH confidence; these are first-party audit findings with file:line evidence, not third-party claims.
- `bbj-vscode/src/Commands/Commands.cjs` (compile flow, `:298-345`) and
  `bbj-vscode/src/Commands/CompilerOptions.ts` (option types/validation) — read directly for #571 parity grounding. HIGH confidence.
- `bbj-vscode/src/language/main.ts` (`bbj/refreshJavaClasses`, `:32`) and
  `bbj-vscode/src/language/composer-commands.ts` (`bbj/composer/*` convention) — read directly to confirm
  the established custom-LSP-request pattern #571's `bbj/compile` should follow. HIGH confidence.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` — read directly,
  confirms the stub `actionPerformed()` matches the issue's evidence exactly. HIGH confidence.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` and
  `BbjJavaInteropService.java` — read directly (grep) to confirm the existing `Alarm`-based debounce
  pattern is real, working, production code — grounding the LOW/MEDIUM complexity ratings for #513,
  #539, #541, #543. HIGH confidence.
- `/home/coder/repos/bbj-language-server/.planning/PROJECT.md` — milestone goal, Active Requirements,
  Out of Scope, Key Decisions (LSP4IJ-over-native-parser, no-CVE/security-posture precedent from v4.1).
  HIGH confidence (canonical project source of truth).
- IntelliJ Platform SDK EDT/threading guidance (general knowledge — no live web query needed; this
  plugin's own existing `executeOnPooledThread`/`Alarm`/`ProgressIndicator` usages are the concrete,
  in-repo instantiation of that guidance and were used as the grounding evidence instead). MEDIUM
  confidence for the general Platform-guideline framing, HIGH for the in-repo pattern evidence it rests on.

---
*Feature research for: IntelliJ Platform plugin hardening / bug burn-down (BBj Language Server, v4.2 milestone)*
*Researched: 2026-09-03*
