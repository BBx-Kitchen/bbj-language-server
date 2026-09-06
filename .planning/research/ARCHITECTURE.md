# Architecture Research

**Domain:** IntelliJ plugin burn-down (21 PRIO 1/2 issues) integrating into an existing LSP4IJ-based plugin
**Researched:** 2026-09-04
**Confidence:** HIGH (every claim below is verified against `bbj-intellij/src/main/java/...` and `bbj-vscode/src/...` as they exist on `main` today, not against the 2026-08-20 issue text)

## Critical Correction: Two "open" issues are already fixed on `main`

Before any build-order planning: **#506 and #536 are already resolved in the current codebase.** Both issue bodies (read from the scratchpad) describe a pre-CR-02 state. `PROJECT.md`'s Key Decisions log records "EDT-threading restructuring (CR-02) shipped in 0.12.24" (v4.1 Phase 75), and the diff is visible in the source today:

- **#506** (`BbjRunActionBase`/`BbjEMLoginAction` block the EDT on token validation/login) — **FIXED.** `BbjRunActionBase.actionPerformed()` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:65-110`) now calls `buildCommandLine()` *inside* `ApplicationManager.getApplication().executeOnPooledThread(...)`, with an explicit comment citing "CR-02". `BbjEMLoginAction.actionPerformed()` (`BbjEMLoginAction.java:36-43`) likewise dispatches `performLogin(project)` to a pooled thread. Every `Messages.*` dialog inside `performLogin()` is individually routed back to the EDT via `invokeAndWait` (`promptUsername`, `promptPassword`, `showErrorOnEdt`, `showInfoOnEdt`, lines 166-201).
- **#536** (EM login temp files created without owner-only permissions) — **FIXED.** `BbjProcessSecretEnv.createOwnerOnlyFile()` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java:114-125`) sets `PosixFilePermissions.asFileAttribute(Set.of(OWNER_READ, OWNER_WRITE))` on POSIX, with a documented Windows-ACL-is-different-but-reasoned fallback. Both call sites the issue names (`BbjRunActionBase.java:298`, `BbjEMLoginAction.java:107`) already call it.

Treat these two as **verify-and-close**, not implement: write (or extend) a regression test asserting the pooled-thread dispatch and the owner-only permission, and close the issue. No production code changes are needed. This matters for build-order because the milestone's first target-features bullet ("single off-EDT pipeline for run/login token work") is **already satisfied by the existing `executeOnPooledThread` wrapping** — there is no new shared pipeline component to design for #506/#536; the remaining EDT work in this milestone (#541, #543, #513) is about *other* call sites that don't yet use this pattern.

A second stale claim, repeated across #569/#571/#513/#554: **"no `src/test/` source set exists."** False today — `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/` has 7 JUnit 5 test classes (`BbjProcessSecretEnvTest`, `BbjLanguageServerSourceGuardTest`, `NodeArchiveVerifierTest`, `NodeInstallIntegrityTest`, `NodeExecutableResolverTest`, `BbjNodeDownloaderSourceGuardTest`, `BbjSecretArgvSourceGuardTest`), and `build.gradle.kts:33-40` declares `junit-jupiter` + `useJUnitPlatform()`, with `buildPlugin` already `dependsOn(tasks.named("test"))` (line 43). #569's *actionable* remainder is not "add a test source set" (done) but "add regression coverage for the specific behaviors this phase changes" — which falls out naturally as each functional fix below lands with its own test, per that fix's own acceptance criteria. No dependency on #569 as a gating task.

## Standard Architecture (where the 21 fixes attach)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  IntelliJ Platform (Swing EDT)                                              │
│  ┌──────────────┐ ┌───────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│  │ actions/      │ │ BbjSettings-  │ │ BbjMissingNode-   │ │ composer/    │ │
│  │ BbjRun*Action │ │ Component     │ │ NotificationProv. │ │ *Dialog      │ │
│  │ BbjEMLogin-   │ │ (Settings UI) │ │ (editor banner)   │ │ Composer-    │ │
│  │ Action        │ │               │ │                   │ │ Launcher     │ │
│  └──────┬───────┘ └──────┬────────┘ └─────────┬─────────┘ └──────┬───────┘ │
│         │ pooled thread  │ EDT-blocking calls  │ EDT-blocking     │ CompletableFuture
│         │ (fixed, #506)  │ (#541 open)          │ spawn (#543 open)│ (no .exceptionally, #538)
│  ┌──────▼───────┐        │                     │                  │
│  │ BbjEMToken-   │        │                     │                  │
│  │ Store         │◄───────┴─────────────────────┘                  │
│  │ (#535,#552    │        BbjNodeDetector.getNodeVersion()          │
│  │  open)        │        — stateless, spawns every call           │
│  └───────────────┘        (no cache layer exists yet)              │
│                                                                      │
│  ┌───────────────────────────────┐   ┌─────────────────────────┐  │
│  │ ui/BbjServerService            │   │ lsp/BbjCompletionFeature │  │
│  │  restart() — 6 unguarded       │   │ lsp/BbjLanguageServer-   │  │
│  │  callers (#539 open)           │   │ Factory                  │  │
│  │  crash Thread.sleep(1000) in   │   │ lsp/BbjLanguageClient    │  │
│  │  invokeLater (#513 open)       │   │ lsp/BbjLanguageServer    │  │
│  │  scheduleRestart()/restartAlarm│   │  — 7 files coupled to    │  │
│  │  (Alarm, POOLED_THREAD) exists │   │  @ApiStatus.Experimental │  │
│  │  but only 1 of 7 callers uses  │   │  LSP4IJ classes, no test │  │
│  │  it                            │   │  (#544/#554 open)        │  │
│  └───────────────┬────────────────┘   └─────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────────────┘
                    │ LanguageServerManager.start/stop("bbjLanguageServer")
                    │ stdio (LSP4IJ-managed OSProcessStreamConnectionProvider)
┌───────────────────▼──────────────────────────────────────────────────┐
│  bbj-vscode/out/language/main.cjs  (shared Langium LS, stdio)         │
│  main.ts:                                                             │
│    connection.onRequest('bbj/refreshJavaClasses', ...)  ← precedent   │
│    registerComposerRequests(connection)  ← bbj/composer/* precedent   │
│    NO bbj/compile request exists yet (#571 — new surface needed)      │
│  bbj-cpl-service.ts: BBjCPLService.compile(filePath) — pure, already  │
│    used internally for diagnostics-on-save; no vscode dependency      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Fix(es) that touch it |
|-----------|----------------|------------------------|
| `actions/BbjRunActionBase.java` | Shared run-action skeleton; off-EDT dispatch (already fixed), token cache to add | #506 (done), #542 |
| `actions/BbjRunBuiAction.java`, `BbjRunDwcAction.java` | Mode-specific `buildCommandLine()`; call `validateTokenServerSide()` and `isTokenExpired()` | #535, #542 (indirectly, via base class) |
| `actions/BbjEMLoginAction.java` | Credential prompt + `em-login.bbj` launch + token store | #506 (done), #536 (done) |
| `actions/BbjEMTokenStore.java` | PasswordSafe read/write + client-side expiry decode | #535, #552 |
| `actions/BbjCompileAction.java` | Compile command entry point — currently only logs | #571 |
| `ui/BbjServerService.java` | LS lifecycle, crash detection, restart, debounced `scheduleRestart()`/`Alarm` | #539, #513 |
| `ui/BbjRestartServerAction.java`, `BbjServerCrashNotificationProvider.java`, `BbjStatusBarWidget.java`, `BbjJavaInteropStatusBarWidget.java`, `actions/BbjRefreshJavaClassesAction.java`, `BbjNodeDownloader.java` (success-notification action) | 6 direct `restart()` callers | #539 |
| `BbjSettingsComponent.java` | Settings dialog Swing form; document listeners spawn `node --version` / read files synchronously | #541 |
| `BbjMissingNodeNotificationProvider.java` | Editor banner; calls `BbjNodeDetector.getNodeVersion()` on every refresh | #543 |
| `BbjNodeDetector.java` | Stateless `node --version` spawn + version-compare helper — no cache today | #541, #543 (both need a cache layer built on top of this) |
| `BbjNodeDownloader.java` | Download/extract/cache Node.js; check-then-set in-progress flag | #537 |
| `BbjWordLexer.java`, `BbjTokenTypes.java`, `BbjParserDefinition.java`, `BbjPairedBraceMatcher.java` | Minimal PSI lexer for bracket-matching/navigation only (TextMate does highlighting) | #568 |
| `BbjCommenter.java` | REM toggle prefix, case-sensitive literal match | #540 |
| `composer/ComposerLauncher.java` | Capture caret offsets → decode via LSP → open dialog → apply edits at captured offsets | #567 |
| `composer/MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java` | `refresh()` → `server.*Preview(...).thenAccept(...)`, no `.exceptionally()` | #538 |
| `lsp/BbjCompletionFeature.java`, `BbjLanguageServerFactory.java`, `BbjLanguageClient.java`, `BbjLanguageServer.java`, `ui/BbjServerService.java`, `ui/BbjJavaInteropService.java`, `ui/BbjStatusBarWidget.java` | Subclass/consume `@ApiStatus.Experimental` LSP4IJ classes, no regression coverage | #544 (superset), #554 (subset — same 2 files as #544's first two) |
| `build.gradle.kts` | Toolchain, `copyLanguageServer`/`prepareSandbox` tasks, test deps | #570, #517, (#569's test-infra request — already satisfied) |
| `gradle/wrapper/gradle-wrapper.{properties,jar}` | Gradle bootstrap; JAR checksum unverifiable against declared 8.13 | #503, #576 |
| `bbj-vscode/src/language/main.ts` | LS-side custom-request registration point (`bbj/refreshJavaClasses`, `bbj/composer/*`) | #571 (new `bbj/compile` request) |
| `bbj-vscode/src/language/bbj-cpl-service.ts` | `BBjCPLService.compile(filePath)` — already vscode-free, already used for diagnostics | #571 (reuse target) |
| `bbj-vscode/src/Commands/Commands.cjs` + `CompilerOptions.ts` | VS Code **extension-host** compile command (`vscode.commands.registerCommand("bbj.compile", ...)`), reads `vscode.workspace.getConfiguration('bbj')` for 18 compiler flags, shells out via `execFile` directly — **not** LS code, has `vscode` import | #571 (reference implementation only; do not literally reuse — see below) |

## New vs Modified Components (explicit)

### Modified (existing file, in-place fix)

| File | Fix | Nature of change |
|------|-----|-------------------|
| `ui/BbjServerService.java` | #539 | Add a guard (in-flight `AtomicBoolean` or make `scheduleRestart()`/`restartAlarm` the sole path) around `restart()`; update its own Javadoc (currently documents the gap as "only one caller ... uses it," `:27-30`) |
| `ui/BbjServerService.java` | #513 | Replace `Thread.sleep(1000)` inside `invokeLater` (`:121-131`) with `restartAlarm.addRequest(this::restart, 1000)` — **same file as #539, do serially** |
| `ui/BbjRestartServerAction.java`, `BbjServerCrashNotificationProvider.java`, `ui/BbjStatusBarWidget.java`, `ui/BbjJavaInteropStatusBarWidget.java`, `actions/BbjRefreshJavaClassesAction.java`, `BbjNodeDownloader.java` | #539 | Change `.restart()` call to `.scheduleRestart()` (6 one-line call-site edits, mechanical once the guard lands) |
| `actions/BbjEMTokenStore.java` | #535 | Three "unable to determine" branches in `isTokenExpired()` (`:64-66,76-77,84-86`) flip to fail-closed, or gate behind a new `isTokenWellFormed()` |
| `actions/BbjEMTokenStore.java` | #552 | Add a one-time notification when `PasswordSafe`'s resolved backend isn't the native keychain — same file as #535, batch together |
| `actions/BbjRunActionBase.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java` | #542 | `buildCommandLine()` skips `validateTokenServerSide()` inside a short trust window — depends on #535 landing first (don't cache a fail-open result) |
| `BbjNodeDownloader.java` | #537 | Guard `props.getBoolean(...)`/`props.setValue(...)` (`:77,85`) with a `synchronized` block or `AtomicBoolean` CAS |
| `BbjSettingsComponent.java` | #541 | Move `updateNodeVersionLabel()`/`updateClasspathDropdown()` off the `DocumentAdapter`'s synchronous path onto a debounced background task (`Alarm`, same idiom as `BbjServerService.restartAlarm`) |
| `BbjMissingNodeNotificationProvider.java` | #543 | Route through the new node-version cache instead of calling `BbjNodeDetector.getNodeVersion()` directly at `:42,50` |
| `BbjWordLexer.java`, `BbjParserDefinition.java`, `BbjPairedBraceMatcher.java`, `BbjTokenTypes.java` | #568 | Add quote-delimited scan branch + `STRING` `IElementType`; register it in `getStringLiteralElements()`; guard `isPairedBracesAllowedBeforeType` |
| `BbjCommenter.java` | #540 | Case-insensitive REM recognition (either a real `COMMENT` PSI token via the lexer, or a custom `Commenter`/`CommenterDataHolder`) |
| `composer/MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java`, `ComposerLauncher.java` | #538 | Add `.exceptionally(...)` to every chain listed in the issue (`ComposerLauncher.launch()`'s nested chain, each dialog's `refresh()` chain) |
| `composer/ComposerLauncher.java` | #567 | `openMsgbox`/`applyAddWindowEdit`/`applyHexEdit` re-decode via the new shared helper before `WriteCommandAction.replaceString` |
| `actions/BbjCompileAction.java` | #571 | Replace the log-only `actionPerformed()` (`:27-41`) with a call through the new server interface method + result surfacing |
| `bbj-vscode/src/language/main.ts` | #571 | Add `connection.onRequest('bbj/compile', ...)` alongside the existing `bbj/refreshJavaClasses` handler |
| `build.gradle.kts` | #570 | Add `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }` |
| `build.gradle.kts` | #517 | `copyLanguageServer`/`prepareSandbox` gain a `doFirst` existence check or a real `dependsOn` |
| `gradle/wrapper/gradle-wrapper.properties`, `gradle-wrapper.jar` | #503, #576 | Regenerate via `./gradlew wrapper --gradle-version <N> --gradle-distribution-sha256-sum <hash>` — single command fixes both |

### New (files/classes that don't exist yet)

| New component | Needed by | Why it must be new, not folded into an existing file |
|----------------|-----------|--------------------------------------------------------|
| A token-validation trust-window cache (e.g. `TokenValidationCache`, a small static/`Map`-backed helper next to `BbjEMTokenStore`) | #542 | `BbjRunActionBase`/subclasses are `AnAction` singletons reused across invocations with no per-call state; a "validated at T, trust until T+window" fact needs a place to live that survives across `actionPerformed()` calls without being reset each time (unlike a local variable). No such cache exists anywhere in the module today. |
| A shared Node-version cache (e.g. `BbjNodeVersionCache`) sitting in front of `BbjNodeDetector.getNodeVersion()` | #541, #543 | Both consumers (`BbjSettingsComponent`, `BbjMissingNodeNotificationProvider`) currently call the stateless detector directly; today there is genuinely nothing to reuse. Building it once and pointing both call sites at it is the only way to satisfy both issues' acceptance criteria ("cache invalidated on settings change" for #543, debounce for #541) without duplicating cache logic in two files. |
| A shared re-decode-and-validate helper on the composer's apply path (per #567's own "Proposed approach": *"add a shared re-decode-and-validate helper reachable from all three apply paths"*) | #567 | `openMsgbox`, `applyAddWindowEdit`, `applyHexEdit` each currently apply captured offsets with no common validation step; the issue explicitly asks for one shared helper, not three parallel copies. This is a genuinely open UX question the issue itself flags (mismatch → re-open dialog vs. silently abort) — resolve it once at the top of this wave, not per call site. |
| `bbj/compile` LSP request (server-side handler in `main.ts`, or a new sibling module `compile-commands.ts` mirroring `composer-commands.ts`'s shape) | #571 | No such request exists; `bbj/refreshJavaClasses` and `bbj/composer/*` are the only precedents. |
| A `bbj/compile` method on the IntelliJ-side server-proxy interface (extend `composer/BbjComposerServer.java`, or add a sibling `BbjCompileServer` interface if scope separation is preferred) plus a resolver mirroring `BbjComposerService.server(project)` | #571 | `BbjLanguageServerFactory.getServerInterface()` (`lsp/BbjLanguageServerFactory.java:34-37`) returns exactly one proxy type (`BbjComposerServer`); a second custom request needs either a new method on that same interface or LSP4IJ's generic `LanguageServer.getWorkspaceService()`-style escape hatch — adding it to the existing interface is the path of least resistance since it's already the extension point in use. |
| Source-guard/canary regression tests for the LSP4IJ-experimental surface (extending the existing `BbjLanguageServerSourceGuardTest`-style pattern, not new IDE-fixture infrastructure) | #544, #554 | No IntelliJ Platform test-fixture dependency (`testFramework`, `BasePlatformTestCase`, `LightPlatform*`) is declared in `build.gradle.kts` today, and none of the 7 existing tests use one — they're plain JUnit 5 unit tests or text/regex assertions against `.java` source files (see `BbjLanguageServerSourceGuardTest.java:38-53`, which asserts ordering of tokens inside `BbjLanguageServer.java`'s source text). Adding a live-IDE test harness would be a much larger, separately-scoped investment; the established, low-cost pattern already answers "how do we test LSP4IJ-coupled classes" for this milestone: reflective canary assertions (e.g. `LSPCompletionFeature.class.getMethod("getIcon", CompletionItem.class)` — throws `NoSuchMethodException` at test time if the vendor breaks the signature) plus structural source-guard checks. |

## Data Flow

### 1. Run/EM-login pipeline (already off-EDT; #542/#535/#552 land inside it)

```
User clicks "Run As BUI"                                    [EDT]
  → BbjRunActionBase.actionPerformed()                       [EDT: fast local checks only]
      autoSaveIfNeeded() / validateBeforeRun()  (fast, local fs checks — fine on EDT)
  → executeOnPooledThread(() -> { ... })                     [pooled thread — CR-02, done]
      → buildCommandLine(file, project)                      [pooled thread]
          BbjEMTokenStore.getToken()                          — PasswordSafe read
          BbjEMTokenStore.isTokenExpired(token)                — #535 fixes fail-open here
          validateTokenServerSide(project, token)              — #542 adds a trust-window
                                                                   short-circuit here, built
                                                                   ON TOP of #535's fixed check
          [if invalid] BbjEMLoginAction.performLogin(project)  — already pooled-thread-safe,
                                                                   dialogs already EDT-routed
      → OSProcessHandler launch, stderr → BbjServerService.logToConsole
```

### 2. Restart guard (#539 wraps #513)

```
6 call sites: BbjRestartServerAction, BbjServerCrashNotificationProvider,
BbjStatusBarWidget, BbjJavaInteropStatusBarWidget, BbjRefreshJavaClassesAction,
BbjNodeDownloader (post-download notification action)
        │  currently: each calls service.restart() directly — UNGUARDED
        ▼
BbjServerService.restart()  →  manager.stop(...); manager.start(...)   [race today]
        │  #539: make scheduleRestart() (already exists, restartAlarm,
        │  Alarm.ThreadToUse.POOLED_THREAD, 500ms debounce) the ONLY path;
        │  either rename restart()→private and have scheduleRestart() call it,
        │  or add an AtomicBoolean in-flight guard directly to restart()
        ▼
crash-path (updateStatus(), crashCount==1 branch)
        │  today: invokeLater(() -> { Thread.sleep(1000); restart(); })  — EDT-blocking
        │  #513: restartAlarm.addRequest(this::restart, 1000)  — reuses the SAME Alarm
        ▼                                                          #539 formalizes
     (no EDT block; single debounced entry point for every trigger)
```

### 3. New `bbj/compile` surface (#571) — the one fix that crosses the LS/plugin boundary

```
IntelliJ: BbjCompileAction.actionPerformed()
    │  today: only service.logToConsole(...) — TODO comment, no LSP call at all
    ▼ (new)
BbjComposerServer (or new interface) . compile(CompileParams)   [@JsonRequest("bbj/compile")]
    │  same shape as BbjComposerService.server(project) resolving the running proxy
    ▼  JSON-RPC over stdio (LSP4IJ-managed connection, existing transport — no new plumbing)
bbj-vscode main.cjs: connection.onRequest('bbj/compile', async (params) => { ... })
    │  NEW handler, added next to the existing 'bbj/refreshJavaClasses' registration
    │  reuses BBjCPLService.compile(filePath) — already pure/vscode-free, already the
    │  server's own internal compile-for-diagnostics path (bbj-cpl-service.ts:52,86)
    ▼
returns { success, diagnostics: Diagnostic[] }  — same shape BBjCPLService already produces
    ▼
BbjCompileAction surfaces success/diagnostics (notification or Problems-style display)
```

**Do not literally port `Commands.cjs`'s `compile` function (`:298-343`).** That function is VS Code **extension-host** code — it `require("vscode")`, reads `vscode.workspace.getConfiguration('bbj')` for 18 compiler flags via `CompilerOptions.ts`'s `buildCompileOptions(config)`, and shells out directly with `execFile`. It is not reachable from, or callable by, the language server process, and the language server has no equivalent of `vscode.workspace.getConfiguration`. The right server-side reuse target is `BBjCPLService.compile(filePath)` (`bbj-vscode/src/language/bbj-cpl-service.ts:52-86`), which is already editor-agnostic and already runs inside the LS process. This means v4.2's `bbj/compile` request is, by design, a simpler compile (no 18-option UI) than VS Code's command-palette "Compile BBj File" — an intentional, smaller scope than a literal parity port, and worth calling out explicitly in the phase's acceptance criteria so it isn't read as scope creep against `CLAUDE.md`'s "Existing LS unchanged" constraint. The precedent that makes this acceptable is `registerComposerRequests(connection)` (`main.ts:26`) and `bbj/refreshJavaClasses` (`main.ts:32-39`): the project has already extended the shared LS with IntelliJ-motivated custom requests twice before (#426/#430/#433, and the Java-classes refresh command), so a third instance following the same shape is consistent with existing practice, not a new precedent.

### 4. Composer edit-application (#538 wraps #567)

```
ComposerLauncher.launch()  [EDT: capture line/lineText/col]
    ▼
BbjComposerService.server(project).thenAccept(...)     — #538: needs .exceptionally() here
    .composerCatalogs().thenAccept(...)                — and here
    .msgboxDecodeCall(...).thenAccept(decoded -> ...)  — and here
    ▼ onEdt(() -> openMsgbox/openAddWindow/openAddChildWindow(...))
dialog.showAndGet()   [modal, EDT — arbitrary time passes, document may change]
    ▼
openMsgbox/applyAddWindowEdit/applyHexEdit(captured offsets)
    │  today: applies WriteCommandAction.replaceString(capturedStart, capturedEnd, text)
    │  directly — no re-check
    ▼ (new, #567)
sharedReDecodeAndValidate(project, editor, line, capturedOffsets)
    → re-run the same decodeCall request the launch used, compare to captured offsets
    → on mismatch: (UX decision the issue leaves open — recommend prompting to reopen
      rather than silently aborting, since #538's new .exceptionally() handlers already
      establish "surface a visible notification on failure" as this unit's convention)
    ▼
WriteCommandAction.replaceString(...)  — only reached if validation passed
```

## Build Order (minimizes rework)

```
Wave 0 — Build foundation (nothing else should start before this; low risk, no code coupling)
  #570 (toolchain pin)  ──┐
                          ├──► #503 + #576 (single `./gradlew wrapper --gradle-version ...
  [requires #570 to run ─┘     --gradle-distribution-sha256-sum ...` regenerates both
   `./gradlew dependencies`    the properties file's declared version AND re-derives a
   at all, per #576's own      verifiable jar in one step)
   evidence]
  #517 (fail-fast LS-bundle copy)  — independent, do anytime in this wave

Wave 1 — Shared mutable-state guards (two unrelated concerns, both "guard a check-then-set race")
  #539 (guarded restart entry point) → #513 (crash delay via restartAlarm)
    — SAME FILE (BbjServerService.java), same Alarm; do #539 first so #513's fix lands on
      top of the already-guarded restart() rather than needing its own separate guard
  #537 (Node download CAS guard) — different file (BbjNodeDownloader.java), no ordering
    dependency on #539/#513, can run in parallel

Wave 2 — Token/EM pipeline (fixes land INSIDE the already-off-EDT pipeline from #506 — no new
  pipeline component needed, #506/#536 are verify-and-close only)
  #535 (fail-closed isTokenExpired) ──► #542 (trust-window cache)
    — #542's cache must be built on TOP of #535's fixed semantics; caching a fail-open
      result would widen the vulnerability window, not just duplicate it
  #552 (non-keychain storage warning) — same file as #535 (BbjEMTokenStore.java), batch
    together in one PR since both are small and touch the same class, but logically
    independent of #542

Wave 3 — Settings/Node-notification caching layer
  New: shared Node-version cache class ──► #543 (notification provider, simple consumer)
                                       └──► #541 (settings dialog, adds debounce on top)
    — build the cache once, wire both consumers to it; #541 additionally needs the
      Alarm-based debounce pattern already established in BbjServerService (Wave 1)

Wave 4 — Compile (#571) — the only fix touching bbj-vscode, largest single change
  (a) bbj-vscode/src/language/main.ts: add `bbj/compile` request, reusing
      BBjCPLService.compile() — requires `npm run build` in bbj-vscode/ to regenerate
      out/language/main.cjs
  (b) bbj-intellij: extend the server-proxy interface + BbjCompileAction — CANNOT be
      built/tested end-to-end until (a)'s main.cjs is copied in by copyLanguageServer/
      prepareSandbox (Wave 0's #517 fail-fast check makes this dependency loud instead
      of silent if forgotten)
  Recommend running this wave after Wave 0 (so a missing/stale main.cjs fails fast) but
  it has no dependency on Waves 1-3; could run in parallel with them if capacity allows.

Wave 5 — Lexer/Commenter (#568, #540) — fully independent files, zero shared state with
  anything else in this milestone; safe to parallelize with any other wave
  #568 (BbjWordLexer/BbjParserDefinition/BbjPairedBraceMatcher/BbjTokenTypes)
  #540 (BbjCommenter) — can literally run concurrently with #568, no file overlap

Wave 6 — Composer (#538 wraps #567)
  #538 (.exceptionally() on every composer CompletableFuture chain) ──► #567 (shared
    re-decode-and-validate helper, itself another CompletableFuture-returning LSP call)
    — do #538 first: #567's new re-validation call sites should inherit the same
      failure-surfacing convention #538 establishes, not invent a second one

Wave 7 — LSP4IJ coupling regression tests (#544 supersedes #554 — same 2 files are a
  strict subset of #544's 7; implement #544's scope once, close #554 as covered)
  — do this LAST relative to #571, since #571 adds a NEW LSP4IJ-coupled surface
    (the compile request/interface extension) that these regression tests should also
    cover; writing them before #571 lands means writing them twice
  — follow the existing BbjLanguageServerSourceGuardTest.java pattern (text/regex
    assertions + reflective canary checks on vendor method signatures), NOT new
    IntelliJ Platform test-fixture infrastructure (none exists, none is declared in
    build.gradle.kts, and introducing BasePlatformTestCase-style fixtures is a
    separately-scoped investment this milestone doesn't need)
  — #569's "add regression coverage" ask is satisfied cumulatively by every wave above
    following its own issue's acceptance criteria (each of #535/#537/#541/#542/#543/
    #513/#539 already specifies its own regression test in the issue text); no
    standalone #569 implementation step remains
```

### Why this order, restated as dependency edges

- `#570 → #576/#503` (hard: `./gradlew dependencies` cannot even run without a toolchain, per #576's own reproduction)
- `#539 → #513` (soft: same file, same `Alarm`; sequential avoids rework/merge churn)
- `#535 → #542` (hard: caching a fail-open expiry check widens the bug rather than just duplicating it)
- `new node-version cache → #541, #543` (hard: both fixes need the cache to exist first; #541/#543 are then parallelizable)
- `bbj-vscode main.ts change → npm run build → bbj-intellij side of #571` (hard: IntelliJ cannot call a request the shipped `main.cjs` doesn't implement yet)
- `#538 → #567` (soft: shared failure-surfacing convention should exist before the code that needs to use it)
- `#571 → #544/#554 regression tests` (soft: avoids writing the LSP4IJ-coupling test twice)
- `#506, #536` — no edges; verify-and-close, can happen at any point, ideally early (cheap wins, closes 2 of 21 items immediately)

## Anti-Patterns Specific to This Codebase

### Anti-Pattern 1: `Thread.sleep()` (or any blocking call) inside `invokeLater()`
**What people do:** Treat `invokeLater` as "off the main flow" and put a delay/sleep inside it, forgetting the runnable still executes ON the EDT.
**Why it's wrong:** `invokeLater` schedules the runnable to run on the Swing EDT, not on a background thread — `Thread.sleep()` there blocks the *entire IDE UI*, not just the calling code path. This is exactly the bug #513 documents, and the project's own established pattern (`executeOnPooledThread` for #506, `Alarm.ThreadToUse.POOLED_THREAD` for `restartAlarm`) already shows the fix.
**Do this instead:** Use `Alarm.addRequest(runnable, delayMs)` (with `Alarm.ThreadToUse.POOLED_THREAD` or `SWING_THREAD` chosen deliberately) for any delayed/debounced work, never a raw sleep inside a UI callback.

### Anti-Pattern 2: check-then-set on a shared flag with no synchronization
**What people do:** `if (!flag) { doWork(); flag = true; }` split across two unsynchronized calls (`PropertiesComponent.getBoolean`/`setValue` in #537 is exactly this shape).
**Why it's wrong:** Two near-simultaneous invocations (two IDE windows, or a double-click) can both observe the flag as false before either sets it, defeating the guard entirely.
**Do this instead:** `AtomicBoolean.compareAndSet(false, true)` or a `synchronized` block around both the check and the set as one atomic unit.

### Anti-Pattern 3: unhandled `CompletableFuture` chains from LSP requests
**What people do:** `server.someRequest(...).thenAccept(result -> ...)` with no `.exceptionally()`, assuming LSP requests always succeed.
**Why it's wrong:** A failed future (server restart mid-request, timeout, connection drop) stores its exception unobserved; the continuation silently never runs, producing a "nothing happened" UX with no log entry — the exact failure mode #538 documents across every composer chain.
**Do this instead:** Every `CompletableFuture` chain that originates from an LSP4IJ server-proxy call gets a terminal `.exceptionally(t -> onEdt(() -> notifyNotReady(...)))`, mirroring `ComposerLauncher.notifyNotReady()`'s existing shape.

### Anti-Pattern 4: applying captured document offsets after a modal dialog closes, without re-validating
**What people do:** Capture line/offset coordinates before showing a modal dialog, then apply them unconditionally after the dialog returns.
**Why it's wrong:** The document can change while the modal is open (the user can, in some IDE configurations, still interact with other editors); applying stale offsets either throws or silently corrupts unrelated text — #567's exact failure mode.
**Do this instead:** Re-decode/re-validate captured offsets against the live document immediately before the write, and fail visibly (not silently) on mismatch — the same visibility convention #538 establishes for LSP failures.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Shared Langium LS (`main.cjs`) | LSP4IJ-managed stdio process; custom `bbj/*` requests via `@JsonRequest` on a server-proxy interface | `bbj/refreshJavaClasses` and `bbj/composer/*` are the two existing precedents; `bbj/compile` (#571) is the third. Add new requests either to `BbjComposerServer` or a sibling interface — `BbjLanguageServerFactory.getServerInterface()` returns exactly one proxy type today. |
| PasswordSafe (`com.intellij.ide.passwordSafe`) | `CredentialAttributes` + `Credentials`, backend resolved by IDE-wide "Save passwords" setting | #552 needs to *inspect* which backend was resolved and warn — no PasswordSafe API for this is confirmed read yet; check `PasswordSafe`'s settings-introspection surface during implementation. |
| nodejs.org distribution server | `HttpRequests.request(...)`, pinned digests via `NodeArchiveVerifier` | Unrelated to any of the 21 fixes directly, but #537's CAS guard wraps the `Task.Backgroundable` that calls into this path. |
| bbjcpl (native BBj compiler binary) | Already spawned via `execFile`-style process launch inside `BBjCPLService.compile()` (LS-side) and inside `Commands.cjs`'s `compile` (VS Code extension-side) — two independent call sites today | #571 adds a THIRD caller only if IntelliJ's `bbj/compile` handler reuses `BBjCPLService.compile()` (recommended) rather than re-implementing the invocation. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `actions/*` ↔ `ui/BbjServerService` | Direct method calls (`getInstance(project)`, `.restart()`/`.scheduleRestart()`, `.logToConsole()`) | #539 changes the *contract* here: after the fix, callers should treat `scheduleRestart()` as the only supported entry point; `restart()` may become effectively private/guarded. |
| `actions/*` ↔ `BbjEMTokenStore` | Static method calls, no async boundary | #535/#542/#552 all land here; #542's new cache should probably live adjacent to (or inside) this class rather than in the action classes, to keep the "is this token trustworthy right now" question in one place. |
| `BbjSettingsComponent`/`BbjMissingNodeNotificationProvider` ↔ `BbjNodeDetector` | Direct static calls today, no cache | #541/#543 insert a new cache layer between these UI consumers and the detector — this is the one place in the whole milestone where a genuinely new shared component is unambiguously required by two separate issues. |
| `bbj-intellij` ↔ `bbj-vscode` | Build-time file copy only (`copyLanguageServer`, `copyTextMateBundle`, `copyWebRunner` in `build.gradle.kts:95-141`), no source-level dependency | #517 hardens this boundary (fail fast on missing `main.cjs`); #571 is the only fix in this milestone that requires a *source* change on the `bbj-vscode` side, which then flows through this same build-time copy. |

## Sources

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java`, `BbjRunDwcAction.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java` (read relevant sections)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java`, `BbjNodeDetector.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java`, `BbjParserDefinition.java`, `BbjPairedBraceMatcher.java`, `BbjCommenter.java`, `BbjTokenTypes.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` (read in full); `MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java` (grepped for async patterns)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java`, `BbjLanguageServerFactory.java` (read in full)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java`, `BbjComposerService.java` (read relevant sections — the `@JsonRequest` template for #571)
- `bbj-intellij/build.gradle.kts` (read in full)
- `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` (read); `gradle-wrapper.jar` sha256 computed locally (`81a82aae...`); `git log` on both files
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java`, `BbjLanguageServerSourceGuardTest.java` (read — establishes the existing test pattern)
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (grepped for action registrations)
- `.github/workflows/pr-validation.yml` (read — confirms CI already pins JDK 17 and runs `gradle/actions/wrapper-validation@v6`)
- `bbj-vscode/src/Commands/Commands.cjs` (read `compile` function, lines ~298-343, and imports)
- `bbj-vscode/src/Commands/CompilerOptions.ts` (read header/types)
- `bbj-vscode/src/language/bbj-cpl-service.ts` (grepped — `BBjCPLService.compile()` signature and doc comment)
- `bbj-vscode/src/language/main.ts` (read head — `bbj/refreshJavaClasses` and `registerComposerRequests` precedents)
- `bbj-vscode/src/language/composer-commands.ts` (read head — the `bbj/composer/*` request-registration template)
- `/home/coder/repos/bbj-language-server/.planning/PROJECT.md` (required reading — milestone goal, constraints, decision log)
- `/home/coder/repos/bbj-language-server/CLAUDE.md` (required reading — repo structure, LS/IDE boundary)
- `/tmp/claude-1000/.../scratchpad/intellij-prio12.md` (the 21 issue bodies, dated 2026-08-20 — used only as a checklist, every claim cross-checked against source above)

---
*Architecture research for: BBj IntelliJ plugin v4.2 burn-down milestone*
*Researched: 2026-09-04*
