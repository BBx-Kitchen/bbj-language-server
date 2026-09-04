# Pitfalls Research

**Domain:** IntelliJ plugin maintenance — LSP4IJ-based BBj language client, EDT threading, credential storage, native compiler integration
**Researched:** 2026-09-04
**Confidence:** HIGH (all findings grounded in current `bbj-intellij/src/main/java` source, `bbj-vscode/src/Commands/Commands.cjs`, `bbj-vscode/src/language/*.ts`, and `.planning/PROJECT.md`; no external ecosystem research needed — this is an internal burn-down of 21 already-triaged issues against a codebase this agent read directly)

## Critical Pitfalls

### Pitfall 1: Treating issue text as current source state instead of re-diffing against `main`

**What goes wrong:**
A phase plan re-implements a fix that the CR-02 EDT-threading restructuring (shipped in v4.1, 0.12.24) already made, wasting effort and risking a regression to code that's already correct.

**Why it happens:**
Issue #506 ("Run/EM-login actions perform network token validation and login synchronously on the EDT") cites `BbjRunActionBase.java:60,67` and `BbjEMLoginAction.java:34-36,115` for code that calls `buildCommandLine()`/`performLogin()` before dispatching to `executeOnPooledThread`. Reading the **current** source shows both call sites already wrapped: `BbjRunActionBase.actionPerformed()` (`:66-67`) calls `buildCommandLine()` *inside* `executeOnPooledThread(...)`, with an inline comment citing "CR-02"; `BbjEMLoginAction.actionPerformed()` (`:42`) already dispatches `performLogin(project)` to `executeOnPooledThread`. This matches PROJECT.md's Key Decision: *"EDT-threading restructuring (CR-02) shipped in 0.12.24 without live-IDE automated coverage... confirmed by hand in a running IDE... this repository has no live IntelliJ UI test coverage in CI... so the JUnit suite... cannot exercise the EDT/pooled-thread handoff."* The issue's own acceptance-criteria text was written before CR-02 landed and the tracker entry was never re-triaged against it.

**How to avoid:**
Before planning the #506 phase, diff `BbjRunActionBase.java` and `BbjEMLoginAction.java` against the issue's cited line numbers. If CR-02 already restructured the call sites, the phase's real remaining work is writing the JUnit regression test CR-02 shipped without (gated on #569's test source set existing at all) — not another EDT restructuring. Scope the phase as "backfill coverage for CR-02," not "fix EDT blocking."

**Warning signs:**
A plan for #506 that proposes moving `buildCommandLine()`/`performLogin()` inside `executeOnPooledThread` when a `grep -n executeOnPooledThread` already shows it there.

**Phase to address:** EDT responsiveness (#506) — verify-first before planning.

---

### Pitfall 2: New async fixes don't replicate the existing `isDisposed()`-guarded `invokeLater` pattern

**What goes wrong:**
A background task (settings debounce, node-version cache refresh, token-validation cache) completes after the project has closed and touches disposed UI/services, throwing `AlreadyDisposedException` or silently updating a swing component that no longer belongs to a live editor.

**Why it happens:**
`BbjServerService.updateStatus()` already establishes the correct shape — every `invokeLater` runnable checks `if (project.isDisposed()) return;` before touching `EditorNotifications`/`MessageBus` (`BbjServerService.java:121-141,152-157,163-170`). New EDT-adjacent code being added for #541 (settings dialog debounce), #543 (notification cache), and #542 (validation cache) is easy to write as "just call `invokeLater(...)`" without copying that guard, because the guard isn't part of any shared helper — it's copy-pasted at each call site today.

**How to avoid:**
Extract the `isDisposed()` + `invokeLater` pattern into a small shared helper (e.g. `BbjEdtUtil.invokeLaterIfLive(project, runnable)`) as part of this milestone, or explicitly copy the guard verbatim at every new call site added for #541/#542/#543. Since `BbjSettingsComponent`/`BbjSettingsConfigurable` are dialog-scoped rather than project-scoped, also guard against the *dialog* having been closed/disposed, not just the project.

**Warning signs:**
A new `ApplicationManager.getApplication().invokeLater(...)` call added to this milestone's diff with no `isDisposed()` check immediately inside the lambda.

**Phase to address:** EDT responsiveness (#541, #542, #543).

---

### Pitfall 3: Fixing a check-then-set race at the wrong scope

**What goes wrong:**
#537's fix (an `AtomicBoolean`/`synchronized` guard around the Node.js download in-progress flag) is scoped per-instance or per-project when the bug it's fixing is scoped per-JVM (or even per-machine).

**Why it happens:**
`BbjNodeDownloader.downloadNodeAsync()` reads/writes `DOWNLOAD_IN_PROGRESS_KEY` via `PropertiesComponent.getInstance()` — the **application-level** singleton, not `PropertiesComponent.getInstance(project)`. That's deliberate: the target of the race, `getNodeDataDirectory()` (`PathManager.getPluginsPath()/bbj-intellij-data/nodejs`), is shared across every open project window in the same IDE instance. A naive fix using a local `AtomicBoolean` field on `BbjNodeDownloader` (a `final class` with only static methods, i.e. effectively a JVM-wide singleton already) is *correctly* scoped to the JVM. But if a future refactor moves this into a project-level service (to reuse the `isDisposed()`-guard pattern from Pitfall 2), the lock would silently narrow to per-project and stop protecting the two-window race the issue describes. A second, harder edge the fix should note rather than solve: two separate IDE *processes* (e.g. two IntelliJ major-version installs sharing one config/plugins directory) are not covered by any in-JVM lock at all — only a file-based lock would close that gap, and it is reasonable to leave it out of scope.

**How to avoid:**
Keep the guard as a static field/`AtomicBoolean` on `BbjNodeDownloader` itself (JVM-wide), matching the scope of the resource it protects. Note in the phase's residual-risk record that cross-process races (two separate IDE installs) remain unguarded — that's an acceptable, explicitly-scoped gap, not a silent one.

**Warning signs:**
A fix that introduces `project.getService(...)`-backed locking for this specific race.

**Phase to address:** EDT responsiveness / Node download (#537).

---

### Pitfall 4: New debounce `Alarm`s not parented to a `Disposable`

**What goes wrong:**
A new `Alarm` created for #541's keystroke debounce or reused for #543's cache invalidation leaks (keeps firing after the owning dialog/editor closes) or throws once its (missing or wrong) parent is disposed.

**Why it happens:**
The one correctly-built `Alarm` in this codebase, `BbjServerService.restartAlarm`, is constructed as `new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this)` where `this` is a project-level service registered via `Disposer.register(project, this)` (`BbjServerService.java:37,47,50`) — so the alarm's lifecycle is tied to the project. `BbjSettingsComponent`/`BbjSettingsConfigurable` (needed for #541) and the static-utility `ComposerLauncher`/`BbjEMTokenStore` (needed for #538/#542) have no natural `Disposable` of their own today. A debounce `Alarm` added there without a real parent either defaults to application-lifetime (never cleaned up per-dialog) or gets built with `null`/`Disposer.newDisposable()` that nothing ever disposes.

**How to avoid:**
For dialog-scoped debounce (#541), make `BbjSettingsComponent` (or its owning `Configurable`) implement `Disposable` and register it, or reuse an existing `Disposable` IntelliJ hands the settings UI (e.g. via `DialogWrapper`/`Configurable.disposeUIResources()`). For #543's cache, prefer a plain memoized field over an `Alarm` — there's no debounce need for a pure read-cache, only invalidation-on-settings-change, which can be a direct call from the settings-apply path rather than a timer.

**Warning signs:**
`new Alarm(...)` with `this` where `this` is a static utility class or a Swing component that doesn't implement `Disposable`.

**Phase to address:** EDT responsiveness (#541), Node notification cache (#543).

---

### Pitfall 5: "Unable to determine" security checks stay fail-open after a partial fix

**What goes wrong:**
#535's fix flips one of `isTokenExpired()`'s three "unable to determine" branches to fail closed but leaves another, because the three are easy to fix independently and the acceptance criteria (non-3-part token, exp-less payload, decode-throwing payload) can be satisfied by a test that only exercises one path per assertion.

**Why it happens:**
`BbjEMTokenStore.isTokenExpired()` (`:56-88`) has three separate early-return-`false` sites (`:65-66` malformed part count, `:76-77` no `exp` claim, `:84-86` catch-all exception), each with its own "let server decide" comment. A code-review pass or a partial diff can plausibly touch one or two and miss the third, especially since the method has no shared "unable to determine" sentinel today — each branch independently decides to return `false`.

**How to avoid:**
Introduce a single `TokenValidity` result type (e.g. `VALID`, `EXPIRED`, `MALFORMED`) instead of three independent boolean-returning branches, so a reviewer can see all three collapse to the same fail-closed outcome by construction rather than by three separate edits. Write the regression test as one parameterized test over all three malformed inputs, not three separate tests that could pass individually while one branch is missed.

**Warning signs:**
A diff to `isTokenExpired()` that changes fewer than all three "unable to determine" `return false` sites, or a test file with only one of the three malformed-input cases.

**Phase to address:** EM token security (#535).

---

### Pitfall 6: A validation trust-window cache (#542) extends the blast radius of the fail-open bug (#535)

**What goes wrong:**
#542 asks for caching `validateTokenServerSide()`'s result "within a short trust window." If #535 isn't fixed first (or the cache keys on the wrong thing), a malformed/substituted token that the client-side `isTokenExpired()` fail-open bug waves through could now also skip the *server-side* check for the whole trust window, because the cache remembers "validated" rather than re-checking the actual bytes each time.

**Why it happens:**
The two issues touch the same call site (`BbjRunActionBase.buildCommandLine()` → `validateTokenServerSide()`) and the natural cache key is the token *value*, which is correct — but only if the cache is also invalidated the moment `BbjEMTokenStore.deleteToken()`/`storeToken()` runs (logout, re-login, token replaced by another process), not just on a timer. `BbjEMLoginAction.performLogin()`'s freshly-stored token is never itself re-checked before being written to `PasswordSafe` (per #535's own evidence) — so a bad token can enter the cache-eligible state at the very first login, before any trust window logic even runs.

**How to avoid:**
Sequence #535 before or alongside #542 in the same phase (they share `BbjEMTokenStore`/`BbjRunActionBase`). Key the cache on the exact token string (not "a token exists"), invalidate on `storeToken`/`deleteToken`, and keep the trust window short (minutes, not the full BUI/DWC session) — the window is a performance optimization, not a security boundary, and should never be the sole thing standing between a revoked token and a successful run.

**Warning signs:**
A #542 implementation that ships without a corresponding #535 fix in the same PR, or a cache invalidation path that only fires on a timer.

**Phase to address:** EM token security (#535, #542) — plan together.

---

### Pitfall 7: PasswordSafe backend introspection relies on an API surface JetBrains doesn't promise to keep stable

**What goes wrong:**
#552's "warn when the resolved backend isn't the native keychain" needs to ask `PasswordSafe`/its settings object what backend is actually active. That capability check may live on an API that isn't part of IntelliJ Platform's stable/public contract, so it silently breaks on a future platform update — the same category of risk this milestone is already tracking explicitly for LSP4IJ (#554, #544).

**Why it happens:**
`BbjEMTokenStore.createAttributes()` (`:26-29`) builds `CredentialAttributes` and calls `PasswordSafe.getInstance()` with no further flag — there is no code in this repo today that inspects which backend `PasswordSafe` resolved to, because nothing needed to know. `PasswordSafeSettings`/`PasswordSafeSettings.ProviderType` (or equivalent) is the natural place to look, but its exact shape and stability guarantee should be verified against the pinned platform version (`intellijIdeaCommunity("2024.2")`) rather than assumed from memory or from a JetBrains blog post.

**How to avoid:**
Treat the backend-detection call the same way #554/#544 already treat `LSPCompletionFeature`/`LSPClientFeatures`: isolate it behind a single narrow method so a breaking platform change fails at one call site, add it to the same regression-test unit those issues call for (gated on #569), and prefer erring toward "warn" when the detection itself throws or returns an unrecognized value, rather than assuming native-keychain (which would silently defeat the whole point of #552).

**Warning signs:**
Backend detection code that isn't isolated behind its own method, or that has no fallback branch for "detection itself failed."

**Phase to address:** EM token security (#552); coordinate with LSP4IJ coupling isolation (#554, #544).

---

### Pitfall 8: Reinventing owner-only temp files instead of reusing `BbjProcessSecretEnv.createOwnerOnlyFile`

**What goes wrong:**
A new temp file that carries secret material (token, password, compiler output containing a token) is created with `Files.createTempFile(prefix, suffix)` directly, or with `PosixFilePermissions.asFileAttribute(...)` passed unconditionally — which throws `UnsupportedOperationException` on Windows/NTFS, where the default filesystem provider doesn't support the POSIX attribute view.

**Why it happens:**
This exact problem is already solved correctly in this codebase: `BbjProcessSecretEnv.createOwnerOnlyFile()` checks `FileSystems.getDefault().supportedFileAttributeViews().contains("posix")` before touching `PosixFilePermissions`, falling back to a plain temp file (relying on the per-user temp directory's own ACL restriction) on Windows — and it is **already used** by both `BbjRunActionBase.validateTokenServerSide()` (`:298`) and `BbjEMLoginAction.performLogin()` (`:107`). #536's own evidence (`Files.createTempFile` with no attribute at `BbjRunActionBase.java:295,303` / `BbjEMLoginAction.java:96,104`) appears to predate this helper's introduction — re-verify #536's current state before treating it as open work, the same way Pitfall 1 applies to #506. Where it *is* still relevant: any **new** temp file this milestone adds (e.g. for a #571 compile-result surface, if one is needed) must route through the same helper rather than a fresh direct `Files.createTempFile` call.

**How to avoid:**
Grep for `Files.createTempFile` across any new/changed file in this milestone's diff; every call touching secret-bearing content must go through `BbjProcessSecretEnv.createOwnerOnlyFile`, not a bespoke `PosixFilePermissions` call.

**Warning signs:**
`PosixFilePermissions.asFileAttribute(...)` called without a prior `supportedFileAttributeViews().contains("posix")` guard anywhere in a new diff.

**Phase to address:** EM token security (#536) — re-verify current state first; reuse for any new temp-file need.

---

### Pitfall 9: Porting VS Code's `Commands.cjs` compile flow literally, instead of routing through the shared language server

**What goes wrong:**
#571's own "Proposed approach" text says to mirror "VS Code's real compile flow in `Commands.cjs:294-343`" via a new `bbj/compile` LSP4IJ request. Read literally, this is misleading: VS Code's `compile` handler (`Commands.cjs:298-345`) is **client-side only** — it calls `vscode.workspace.getConfiguration('bbj')`, builds compiler options with `buildCompileOptions`/`buildCompileArgv`, and spawns `bbjcpl` directly via `execWithProgress(argv)`, entirely inside the VS Code extension process. It never goes through the language server or an LSP request at all. Implementing #571 by literally porting this logic into IntelliJ (as Java code re-reading IntelliJ settings and re-spawning `bbjcpl` independently) would create a **third**, independently-drifting BBjCPL invocation, alongside VS Code's client-side one and the language server's own `BBjCPLService` (`bbj-cpl-service.ts`, already used for automatic on-save diagnostics via `buildDocuments()`).

**Why it happens:**
The issue text conflates "the behavior VS Code's compile command produces" with "how VS Code's compile command is implemented." The two are not the same, and only the LS-side `BBjCPLService`/`composer-commands.ts` precedent is actually shared infrastructure both clients can use without duplicating spawn/parse logic.

**How to avoid:**
Follow the `composer-commands.ts` precedent (`bbj/composer/*`, already used by both the VS Code webview and this IntelliJ plugin) rather than `Commands.cjs`: add a genuinely shared `bbj/compile` request/notification handler in the language server that wraps the **existing** `BBjCPLService.compile()`/`parseBbjcplOutput` (`bbj-cpl-service.ts`, `bbj-cpl-parser.ts`) — not a reimplementation of VS Code's client-side option-reading and process-spawning. This also respects PROJECT.md's "Existing LS unchanged" constraint in its actual intent (no IntelliJ-only special cases in the LS) rather than its literal wording (the LS has already been extended once, for composer commands, specifically because both clients needed the same capability).

**Warning signs:**
A #571 implementation that adds `ProcessBuilder`/`GeneralCommandLine` spawning `bbjcpl` directly inside `bbj-intellij/`, duplicating argument-building logic that already exists in `CompilerOptions.ts`/`process-args` on the VS Code side, instead of a new `connection.onRequest('bbj/compile', ...)` in the shared LS.

**Phase to address:** Compile action (#571).

---

### Pitfall 10: A string-aware bracket lexer that mishandles BBj's doubled-quote escape reintroduces the same bug, shifted

**What goes wrong:**
#568's fix adds a quote-delimited scan branch to `BbjWordLexer.advance()`. If that scan naively terminates the string on the first unescaped `"`, it will mis-terminate on BBj's `""`-doubling escape (a literal quote inside a string is written as two consecutive `"` characters, not a backslash escape) — cutting the STRING token short mid-string and misclassifying everything after the doubled quote, including any real brackets that follow on the same line, as loose punctuation again. This is the same class of bug #568 exists to fix, just relocated a few characters to the right instead of eliminated.

**Why it happens:**
`BbjWordLexer` currently has no string-literal state at all (`"` falls through to the `SYMBOL` default, `:91`, with no state change), so the fix is being added from scratch rather than adjusted from an existing (even if buggy) implementation — there's no prior art in this file to anchor the escape-handling logic to. The grammar's own string terminal (`bbj.langium`) and the TextMate grammar's string pattern (`bbj.tmLanguage.json`, used for actual syntax coloring per PROJECT.md's "TextMate grammar reuse" decision) both already encode the correct `""`-doubling rule — they are the reference implementations to match, not something to re-derive.

**How to avoid:**
Before writing the scan loop, read the string terminal in `bbj.langium` and the string match rule in `syntaxes/bbj.tmLanguage.json` and replicate their doubled-quote handling exactly (a `"` immediately followed by another `"` inside a string is a literal quote, not a terminator). Add a test fixture containing a bracket character *after* an escaped quote in the same string literal (e.g. `PRINT "she said ""go"" (now)"`) to catch a scanner that terminates early.

**Warning signs:**
A quote-scan implementation that treats the first bare `"` after the opening quote as the closing quote, with no lookahead for a doubled `""`.

**Phase to address:** Lexer/commenter (#568).

---

### Pitfall 11: Case-insensitive REM detection matches on prefix alone, catching identifiers like `REMOTE`/`REMARK`

**What goes wrong:**
#540's fix needs `getLineCommentPrefix()` (or its replacement) to recognize `rem`/`Rem`/`REM` as an existing comment regardless of case. A naive case-insensitive `startsWith("rem")` check also matches a line that legitimately starts with an identifier like `REMOTE$` or a label `REMARK:`, causing the toggle to (incorrectly) treat an uncommented statement as already commented and delete its first three characters, or fail to comment it at all.

**Why it happens:**
BBj's actual comment terminal in `bbj.langium` requires the keyword to be followed by a word boundary (whitespace, end of line, or a non-identifier character) — a plain string-prefix comparison, even case-normalized, doesn't reproduce that boundary check. The issue's own "Proposed approach" flags this tension directly: either add a lexer-level `COMMENT` token so the platform's PSI-aware commenting path applies (correct boundary handling for free), or write a custom case-insensitive commenter (which must reimplement the boundary check by hand).

**How to avoid:**
Match the grammar's own comment-terminal boundary rule (word-boundary after the keyword), not a bare case-insensitive prefix match. Test both directions: `Rem` line correctly detected as already-commented, and a `REMOTE$ = ...` or similarly-prefixed identifier line correctly treated as *not* commented.

**Warning signs:**
A fix expressed as `line.toLowerCase().startsWith("rem ")` or `line.toLowerCase().startsWith("rem")` with no following-character check.

**Phase to address:** Lexer/commenter (#540).

---

### Pitfall 12: Fixing `.exceptionally()` (#538) without offset re-validation (#567) leaves the more dangerous case uncaught

**What goes wrong:**
#538 asks for an `.exceptionally()` handler on every composer `CompletableFuture` chain so a failed LSP request produces a visible notification instead of silently doing nothing. #567 asks for re-validating captured line/offset coordinates before `WriteCommandAction.replaceString` applies them. These read as independent fixes, but #567's failure mode — the document changed at or before the captured offsets while the modal dialog was open — usually does **not** throw. `WriteCommandAction.replaceString` either throws (offsets now exceed the line's length — the rarer, "loud" case `.exceptionally()` would actually catch) or silently rewrites whatever text now occupies that byte range — the more concerning case, which produces no exception for `.exceptionally()` to observe at all. Shipping only #538 gives a false sense that "failures are now surfaced," while the specific failure #567 documents remains silent.

**Why it happens:**
Both issues were triaged as separate findings against the same file (`ComposerLauncher.java`) with the same evidence base (`:57-159`), but their fixes target different layers: #538 is exception-handling on the async plumbing, #567 is data-validity checking on the applied result. Neither substitutes for the other.

**How to avoid:**
Plan #538 and #567 as one phase against `ComposerLauncher.java`. Implement the shared re-decode-and-validate helper #567 calls for (re-decoding the call at the captured offsets immediately before `WriteCommandAction.replaceString`, comparing against what was captured before `dialog.showAndGet()`), and route both a mismatch *and* an async exception through the same user-visible notification path #538 establishes.

**Warning signs:**
A PR that touches `ComposerLauncher.java` for only one of #538/#567.

**Phase to address:** Composer robustness (#538, #567) — plan together.

---

### Pitfall 13: Adding JUnit regression tests before #569/#570 land produces tests that can't run

**What goes wrong:**
Several issues' acceptance criteria explicitly condition regression coverage on other issues in this same milestone: #506, #513, #571 each say "because no `src/test/` source set exists for `bbj-intellij` today, regression coverage... depends on that gap being closed first (#569), or on a recorded manual verification step." #569 itself depends on #570 (the build fails on any JDK newer than 17 before `./gradlew test` can even run). A phase plan that writes JUnit tests for #535/#536/#537/#539/#540/#541/#542/#543 without first landing #569+#570 produces test files that cannot execute in this environment (this dev container's only available JDK, per #570's own evidence, is Temurin 25).

**Why it happens:**
The 21 issues are individually scoped and individually acceptance-criteria'd, but several silently share a prerequisite that isn't called out as a phase-ordering constraint anywhere except in each issue's fine print.

**How to avoid:**
Sequence #570 (JDK toolchain pin) and #569 (test source set + first test) as an early phase that everything else's regression coverage depends on. For any fix landed before that phase completes, fall back explicitly to the "recorded manual verification step at merge time" language several issues already allow, rather than writing tests that will fail to compile/run.

**Warning signs:**
A phase plan for #535/#536/#537/#539/#540/#541/#542/#543 whose verification step is "run `./gradlew test`" scheduled before the #569/#570 phase.

**Phase to address:** Build and platform coupling (#570, #569) — sequence first; all others reference it.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Ship #535/#536/#537/etc. fixes with only "recorded manual verification" instead of a JUnit test (per several issues' own acceptance-criteria fallback) | Unblocks fixing real bugs before #569/#570 land | Regression risk stays open exactly as it is today — nothing catches a future re-break | Only until the #569/#570 phase lands; must be revisited immediately after, not left indefinitely |
| Keep the six `restart()` call sites (#539) individually guarded with a simple `AtomicBoolean` in-flight flag rather than routing all six through `scheduleRestart()`'s existing debounce `Alarm` | Smaller, more localized diff; doesn't change UX latency for the "Restart Server" button (debounce would add a delay users didn't ask for) | Two coordination mechanisms (flag + alarm) now coexist in the same class, harder to reason about together | Acceptable if the in-flight flag is the chosen fix (per the issue's own "guard restart() with an in-flight AtomicBoolean, **or** make scheduleRestart() the single entry point" framing) — not acceptable if both are implemented redundantly |
| Application-scoped `PasswordSafe`-backend warning shown once per session rather than persisted/dismissable state | Simple to implement, no new settings-persistence surface | User re-sees the same warning every IDE restart even after consciously accepting the tradeoff | Acceptable for an initial #552 fix; revisit only if user feedback calls it noisy |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| LSP4IJ 0.19.0 `@ApiStatus.Experimental` classes (`LSPCompletionFeature`, `LSPClientFeatures`, `LSPDocumentLinkFeature`) | Assuming an experimental API is stable because it hasn't changed across the pinned version | Isolate every subclass/override behind this repo's own thin wrapper, add regression tests (gated on #569) that fail loudly at compile or test time on an LSP4IJ bump, and treat any version bump of the `0.19.0` pin in `build.gradle.kts:27` as requiring a re-audit of #554/#544's file list |
| IntelliJ `PasswordSafe` / `CredentialAttributes` | Assuming the resolved storage backend is always the native OS keychain | Query the actual resolved backend before claiming a security property about it (#552); treat "can't determine the backend" as itself warning-worthy |
| `PropertiesComponent.getInstance()` (no project) vs `PropertiesComponent.getInstance(project)` | Picking the project-scoped overload out of habit when the resource being guarded (Node.js cache directory) is shared IDE-wide | Match the lock's scope to the resource's scope — application-level resource needs an application-level (or JVM-static) lock, not a per-project one |
| `bbj-vscode`'s `Commands.cjs` vs the shared language server | Treating "what Commands.cjs does" as "what the language server exposes," and porting client-side logic into IntelliJ instead of routing through the LS | Only `composer-commands.ts`-style `bbj/*` custom LSP requests are genuinely shared; `Commands.cjs` is VS Code-only and must not be used as an implementation template for IntelliJ, only as a behavioral reference |
| `bbj-vscode/src/language/bbj-cpl-parser.ts` (diagnostic-oriented BBjCPL parsing) | Writing a second, IntelliJ-specific bbjcpl stdout/stderr parser for the manual "Compile BBj File" action | Reuse the LS-side `BBjCPLService`/`parseBbjcplOutput` via a new shared `bbj/compile` request, matching the existing `bbj/composer/*` pattern |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| `node --version` subprocess spawned per keystroke in Settings, or per editor-notification refresh | Settings dialog stutters while typing a path; every tab switch/file open re-spawns a process | Debounce (settings, ~300-500ms, matching this repo's existing `RESTART_DEBOUNCE_MS=500`/BBjCPL 500ms trailing-edge precedent) plus a memoized last-known-good result keyed on path, invalidated only on settings change | Immediately, on the first keystroke or first notification refresh — this is not a scale problem, it's present-from-first-use |
| `validateTokenServerSide()` re-spawned on every Run click even seconds after a prior successful validation | Rapid edit-run-edit-run iteration dominated by a 10s subprocess spawn each time | Short trust-window cache keyed on exact token value (#542), invalidated on token change/logout (see Pitfall 6) | Breaks down for any workflow doing more than one Run within the trust window without caching — i.e. immediately for typical iterative development |
| `EditorNotificationProvider.collectNotificationData` re-running the Node.js detection chain (explicit path check + PATH auto-detect + cached-download check) on every editor/tab open | Slight lag opening/switching BBj files, worse on slow filesystems or network-mounted paths | Cache the detection result at the JVM/session level, not per-editor-instance, invalidated on settings change | Compounds with tab count — many open BBj files means many redundant checks per session even with per-editor memoization; must be a single shared cache |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Leaving any of `isTokenExpired()`'s three "unable to determine" branches fail-open (#535) | A malformed, unsigned, or substituted token is treated as valid, protected only by an optional server-side round trip nothing forces the client to call | Fail closed on all three branches (or gate behind an explicit well-formedness check); test all three together, not independently (Pitfall 5) |
| Caching a server-side token validation result for a "trust window" that outlives how quickly a revoked token should stop working (#542) | A just-revoked/replaced token keeps launching BUI/DWC runs until the cache entry ages out | Keep the window short (minutes); invalidate immediately on `storeToken`/`deleteToken`, not only on a timer (Pitfall 6) |
| Assuming `PasswordSafe`'s resolved backend is the native OS keychain without checking (#552) | JWT persisted in a weaker KeePass-file store, or not persisted at all, with the user unaware their credential's protection silently changed | Detect the actual resolved backend and warn when it isn't native keychain; treat detection failure as itself warning-worthy (Pitfall 7) |
| Creating a new temp file that holds secret content via a bare `Files.createTempFile(...)` instead of the existing owner-only helper | Plaintext JWT/credential readable by another OS user on a multi-user host during the file's lifetime | Always route through `BbjProcessSecretEnv.createOwnerOnlyFile` (Pitfall 8); never call `PosixFilePermissions.asFileAttribute` directly without the POSIX-support guard it already implements |
| Publishing every push to `main` via `preview.yml` while a fix for a security-relevant finding (e.g. #535, #536, #552) is mid-implementation | A partially-fixed security issue (e.g. two of three fail-open branches closed) ships to the preview channel before the phase is complete | Land each of the four EM-token-security issues (#535, #536, #542, #552) as a complete, tested unit per PR, not as incremental partial commits merged to `main` between sessions |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| "Compile BBj File" (#571 as it stands) presents as enabled/working but only logs a line | User believes their file compiled with no errors, when nothing was checked at all | Always end in a visible terminal state — success notification or a diagnostics panel — never a click with zero observable effect |
| Composer dialog silently stops updating its preview after an LSP request fails mid-session (#538) | User can click OK on stale, out-of-date preview content without any indication it stopped refreshing | Visibly mark the dialog as out-of-date (disable OK, show an inline banner) on a failed refresh, not just a background notification easy to miss while the modal has focus |
| Settings dialog appears to hang for the duration of a subprocess spawn or file read while typing a path (#541) | Users may believe the IDE crashed and force-quit, losing unrelated unsaved settings changes | Debounce plus a lightweight "checking..." indicator while the background task runs, so the UI stays visibly responsive |
| Two IDE windows or a double-click both trigger the raw `restart()` with no coordination (#539) | Overlapping stop/start calls produce an unpredictable server state the user has to notice and manually retry | Route every restart trigger through one guarded entry point so a second trigger during an in-flight restart is a no-op, not a race |

## "Looks Done But Isn't" Checklist

- [ ] **EDT restructuring for #506:** Often "already fixed" by CR-02 (0.12.24) — verify against current `BbjRunActionBase.java`/`BbjEMLoginAction.java` before writing new production code; the real gap is likely regression-test backfill only (Pitfall 1).
- [ ] **Owner-only temp files for #536:** Often already fixed by `BbjProcessSecretEnv.createOwnerOnlyFile`, already in use at both cited call sites — verify current state before treating it as open (Pitfall 8).
- [ ] **"Compile BBj File" (#571):** Often implemented as a direct `bbjcpl` spawn duplicating VS Code's client-side `Commands.cjs` logic — verify it instead routes through a shared `bbj/compile` LSP request wrapping the LS's existing `BBjCPLService` (Pitfall 9).
- [ ] **String-aware bracket lexer (#568):** Often handles a single embedded quote but not BBj's `""`-doubling escape — verify with a test fixture containing a bracket *after* a doubled quote on the same line (Pitfall 10).
- [ ] **Case-insensitive REM toggle (#540):** Often implemented as a bare case-insensitive prefix match — verify it does not also match identifiers like `REMOTE$`/`REMARK` at line start (Pitfall 11).
- [ ] **Composer robustness (#538 or #567 alone):** Often ships one without the other — verify both the `.exceptionally()` handler and the offset re-validation land together, since a stale-offset apply is the case `.exceptionally()` alone won't catch (Pitfall 12).
- [ ] **New `Alarm`/debounce machinery (#541, #543):** Often parented to `this` where `this` isn't actually a registered `Disposable` — verify with `Disposer.isDisposed(...)` after closing the owning dialog/project in a manual test (Pitfall 4).
- [ ] **JUnit regression tests for any of #506/#513/#535/#536/#537/#539/#540/#541/#542/#543:** Often written before #569+#570 land and therefore cannot compile/run — verify `./gradlew test` actually executes the new test class, not just that the file exists (Pitfall 13).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-----------------|
| #506 re-implemented despite already being fixed by CR-02 | LOW | Revert the redundant restructuring; redirect the phase's effort to the JUnit regression test instead |
| Trust-window cache (#542) shipped without the #535 fail-open fix | MEDIUM | Ship #535 immediately after in a follow-up PR; shorten the trust window as a stop-gap in the interim |
| New `Alarm` leaks because it wasn't parented to a real `Disposable` | LOW | Add the missing `Disposable`/`Disposer.register` call; no data corruption risk, only a resource-cleanup gap |
| #571 implemented as a duplicate direct `bbjcpl` spawn instead of routing through the LS | HIGH | Requires reworking both the IntelliJ action and adding the missing `bbj/compile` LS-side handler — budget this as if it were unstarted work, not a small patch |
| #538 shipped without #567 (or vice versa) | MEDIUM | The missing half is additive to the same file (`ComposerLauncher.java`) and doesn't require reverting the shipped half — land it as a follow-up phase against the same file |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Stale issue text vs. current source (#506) | EDT responsiveness | `git diff`/manual read of `BbjRunActionBase.java`/`BbjEMLoginAction.java` against the issue's cited line numbers before planning |
| EDT slip-back via unguarded `invokeLater` | EDT responsiveness (#541, #542, #543) | Every new `invokeLater` call reviewed for an `isDisposed()` (or dialog-closed) guard |
| Check-then-set race at the wrong scope (#537) | EDT responsiveness | Confirm the guard's scope (static/JVM) matches `getNodeDataDirectory()`'s scope (shared across windows) |
| Unparented debounce `Alarm` (#541, #543) | EDT responsiveness | Manual test: close the owning dialog/project mid-debounce, confirm no exception and no stale callback fires |
| Partial fail-open fix (#535) | EM token security | Single parameterized test exercising all three malformed-input branches at once |
| Trust-window cache outliving revocation (#542) | EM token security | Test: store token, validate (caches), delete token, immediately re-run — must not use the cached "valid" result |
| PasswordSafe backend detection on unstable API (#552) | EM token security | Isolate detection behind one method; add to the #554/#544 regression-test unit once #569 lands |
| Reinvented owner-only temp file (#536) | EM token security | Grep new diff for `Files.createTempFile` outside `BbjProcessSecretEnv` |
| `Commands.cjs` ported literally instead of routing through the LS (#571) | Compile action | Confirm the IntelliJ change adds a `connection.onRequest('bbj/compile', ...)`-style shared handler, not a standalone `bbjcpl` spawn in Java |
| Doubled-quote escape mishandled in string-aware lexer (#568) | Lexer/commenter | Test fixture with a bracket immediately after an escaped `""` in the same string literal |
| REM prefix match without word-boundary check (#540) | Lexer/commenter | Test both a case-varied `rem`/`Rem` comment line and a same-prefixed identifier line (`REMOTE$`/`REMARK`) |
| `.exceptionally()` without offset re-validation, or vice versa (#538, #567) | Composer robustness | Single phase touching `ComposerLauncher.java` covers both; test both an async-exception path and a stale-offset (no-exception) path |
| Tests written before #569/#570 land | Build and platform coupling | `./gradlew test` actually runs (not just compiles) before any dependent phase's regression test is treated as done |

## Sources

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java`, `BbjWordLexer.java`, `BbjParserDefinition.java`, `BbjPairedBraceMatcher.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` (current source, read in part)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` (current source, read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` (current source, read in part)
- `bbj-intellij/build.gradle.kts` (current source, read in full)
- `bbj-vscode/src/Commands/Commands.cjs` (`compile` handler, `:298-345`, read directly — confirmed client-side only, not LS-routed)
- `bbj-vscode/src/language/bbj-cpl-service.ts`, `bbj-cpl-parser.ts` (LS-side BBjCPL integration, header/design-decision comments read)
- `bbj-vscode/src/language/composer-commands.ts` (precedent for shared `bbj/*` LSP custom requests, read in part)
- `bbj-vscode/src/language/main.ts` (`bbj/refreshJavaClasses`, `bbj/bbjcplAvailability` custom request/notification registrations)
- `.planning/PROJECT.md` (Key Decisions, especially CR-02/EDT-threading restructuring and its "no live IntelliJ UI test coverage in CI" gap)
- `/tmp/.../scratchpad/intellij-prio12.md` (full GitHub issue bodies for #506, #571, #570, #569, #568, #567, #554, #552, #544, #543, #542, #541, #540, #539, #538, #537, #536, #535, #517, #513, #503, #576)

---
*Pitfalls research for: IntelliJ plugin burn-down (LSP4IJ, EDT threading, credential security, native compiler integration)*
*Researched: 2026-09-04*
