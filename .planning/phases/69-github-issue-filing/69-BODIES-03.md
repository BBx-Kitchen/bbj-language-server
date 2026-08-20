## Index rows 41-64

| # | finding_id | route | title | labels |
|---|---|---|---|---|
| 41 | P62-D2-005 | public issue | vscode: bare msgbox composer command applies captured Code Action coordinates without re-validating them after a multi-step wizard | vscode, PRIO 2, 4 |
| 42 | P62-D4-001 | public issue | vscode: getNonce() and CSP-array construction are duplicated byte-identically across four composer webview files | vscode, PRIO 2, 4 |
| 43 | P62-D4-004 | public issue | vscode: call-locator and argument-scanner logic is duplicated across the composer logic and UI layer files | vscode, PRIO 2, 4 |
| 44 | P63-D1-004 | public issue | intellij: EM token expiry check reports malformed, unsigned, or exp-less JWTs as not expired | intellij, PRIO 2, 4 |
| 45 | P63-D1-005 | public issue | intellij: EM login temp files holding plaintext JWT output are created without owner-only permissions | intellij, PRIO 2, 4 |
| 46 | P63-D2-003 | public issue | intellij: Node.js download-in-progress flag is check-then-set with no synchronization, allowing concurrent downloads | intellij, PRIO 2, 4 |
| 47 | P63-D2-007 | public issue | intellij: composer LSP request failures are silently swallowed by unhandled CompletableFuture exceptions | intellij, PRIO 2, 4 |
| 48 | P63-D2-013 | public issue | intellij: six language-server restart call sites bypass the debounced restart path, risking overlapping restarts | intellij, PRIO 2, 4 |
| 49 | P63-D2-016 | public issue | intellij: line-comment toggle only recognizes uppercase REM, not BBj's case-insensitive rem syntax | intellij, PRIO 2, 4 |
| 50 | P63-D3-001 | public issue | intellij: settings dialog spawns a node --version subprocess synchronously on the EDT on every keystroke | intellij, PRIO 2, 4 |
| 51 | P63-D3-002 | public issue | intellij: Run and EM-login actions redundantly re-validate the EM token server-side on every invocation | intellij, PRIO 2, 4 |
| 52 | P63-D3-007 | public issue | intellij: missing-Node-runtime notification spawns a node --version subprocess on every editor-notification refresh | intellij, PRIO 2, 4 |
| 53 | P63-D4-010 | public issue | intellij: BbjCompletionFeature and language-server registration classes couple tightly to LSP4IJ's experimental API surface with no regression test | intellij, PRIO 2, 4 |
| 54 | P63-D6-001 | public issue | dependencies: pinned Node.js runtime is past its own upstream end-of-life and missing five flagged security releases | dependencies, PRIO 2, 4 |
| 55 | P64-D1-001 | public issue | BBj integration and infrastructure: web.bbj silently falls back to the default admin/admin123 Enterprise Manager credentials when none are supplied | BBj integration and infrastructure, PRIO 2, 4 |
| 56 | P64-D1-005 | public issue | BBj integration and infrastructure: most CI workflows declare no permissions: block, leaving GITHUB_TOKEN scope at whatever the org default is | BBj integration and infrastructure, PRIO 2, 4 |
| 57 | P64-D2-003 | public issue | BBj integration and infrastructure: six post-login EM calls in web.bbj have no error handler, so failures produce a silent no-op | BBj integration and infrastructure, PRIO 2, 4 |
| 58 | P64-D3-002 | public issue | BBj integration and infrastructure: build.yml runs unconditionally and without a concurrency group on every pull request, duplicating another workflow's build and test | BBj integration and infrastructure, PRIO 2, 4 |
| 59 | P64-D6-003 | public issue | dependencies: all 36 GitHub Actions references across the workflows use mutable version tags instead of pinned commit SHAs | dependencies, PRIO 2, 4 |
| 60 | P64-D6-005 | public issue | dependencies: Dependabot configuration covers only the bbj-vscode npm tree, leaving the Gradle, documentation, and GitHub Actions dependency trees unwatched | dependencies, PRIO 2, 4 |
| 61 | P65-D1-002 | public issue | intellij: EM JWT token storage silently follows the IDE-wide password-save setting instead of a fixed secure backend | intellij, PRIO 2, 4 |
| 62 | P65-D1-003 | public issue | vscode: EM token expiry check reports malformed, unsigned, or exp-less JWTs as not expired | vscode, PRIO 2, 4 |
| 63 | P66-D4-001 | public issue | intellij: BbjCompletionFeature and BbjLanguageServerFactory couple to LSP4IJ classes marked @ApiStatus.Experimental, confirmed by jar inspection | intellij, PRIO 2, 4 |
| 64 | P66-D5-001 | public issue | javascript: three parser test assertions remain disabled, so classpath-dependent validation regressions pass the suite undetected | javascript, PRIO 2, 4 |

## Bodies rows 41-64

### 41. P62-D2-005 — vscode: bare msgbox composer command applies captured Code Action coordinates without re-validating them after a multi-step wizard
**Route:** public issue
**Labels:** vscode, PRIO 2, 4

<!-- BODY-BEGIN P62-D2-005 -->
## Problem

`runComposer`, the bare (non-visual) `bbj.composeMsgbox` command handler, builds a `vscode.Range` (or
a raw character offset) from a numeric token's coordinates captured at the moment a Code Action was
computed, then applies `editor.edit(...)` using those coordinates directly after a four-step
`QuickPick` wizard has run to completion, with no re-fetch or re-validation of the target line's
current text.

## Evidence

`bbj-vscode/src/msgbox-composer-ui.ts:87-133`

Surface: the `arg?.edit` branch (`:100-104`) and the `arg?.insert` branch (`:105-108`) of
`runComposer`, both applying coordinates captured by `MsgboxCodeActionProvider` at
Code-Action-computation time, after `runWizard`'s four sequential awaited `QuickPick` steps
intervene (`:94`, defined `:136-160`). Problem class: stale-position edit application — a captured
line/range/offset is applied without re-fetching or re-validating the underlying line's current
text. Impact: an edit can silently replace or insert into the wrong location if the user edits the
same document during the wizard, corrupting unrelated text with no error surfaced.

## Failure scenario

If the user edits the same document (adds/removes lines above the target line, or edits the target line itself) at any point during the multi-step QuickPick wizard, the previously captured line/exprRange/character coordinates no longer correspond to the same content when editor.edit(...) finally runs -- the edit can silently replace or insert into the wrong location, corrupting text unrelated to the MSGBOX call the user originally invoked the composer on, with no error surfaced to the user.

## Proposed approach

The fix is contained to msgbox-composer-ui.ts (re-resolve the call at the captured line immediately before applying the edit).

## Acceptance criteria

Before `editor.edit()` is applied in both the `arg?.edit` and `arg?.insert` branches, the target
line is re-resolved from the document's current text and the previously captured coordinates are
re-validated against it; if the token no longer matches, the edit is aborted rather than applied at
a stale location. A regression test simulates a document edit occurring during the QuickPick wizard
and asserts that the composer either applies the edit at the correct, re-resolved location or aborts
without modifying unrelated text.

## Traceability

Finding `P62-D2-005` · dimension D2 (secondary D1) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P62-D2-005 -->

### 42. P62-D4-001 — vscode: getNonce() and CSP-array construction are duplicated byte-identically across four composer webview files
**Route:** public issue
**Labels:** vscode, PRIO 2, 4

<!-- BODY-BEGIN P62-D4-001 -->
## Problem

`getNonce()` and the 5-line CSP-array construction are duplicated byte-identically across all four
`*-composer-webview.ts` files, with no shared helper factoring either out.

## Evidence

`bbj-vscode/src/msgbox-composer-webview.ts:366-373`

Surface: `getNonce()` at `msgbox-composer-webview.ts:366-373` and the equivalent blocks in
`addwindow-composer-webview.ts:401-408`, `addchildwindow-composer-webview.ts:424-431`,
`setopts-composer-webview.ts:314-321` (32 duplicated lines total); the CSP-array construction at
`msgbox-composer-webview.ts:124-128` duplicated identically in the other three files (20 duplicated
lines total). Problem class: code duplication with no shared source of truth for
webview-security-relevant construction logic. Impact: a future CSP/nonce hardening fix must
currently be applied identically in four places by hand, with drift risk between them.

## Failure scenario

n/a (D4 is a code-shape finding, not a runtime failure scenario) — the duplication is a maintainability cost: a future CSP/nonce hardening fix (e.g. P62-D1-002's remediation) must currently be applied identically in 4 places with no shared source of truth, and the ~80% overlap between addwindow and addchildwindow means most future flag/event-mask UI changes need a matching edit in both files by hand, with drift risk between them.

## Proposed approach

Extracting a shared `webview-security.ts` helper for getNonce()/CSP-array construction necessarily touches all 4 call sites.

## Acceptance criteria

A single shared helper module provides `getNonce()` and CSP-array construction, and all four
`*-composer-webview.ts` files import and use it instead of their own duplicated copies. The existing
per-file webview test coverage continues to pass unchanged against the shared implementation, and a
diff confirms the four duplicated `getNonce()`/CSP blocks have been replaced by calls to the shared
helper.

## Traceability

Finding `P62-D4-001` · dimension D4 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P62-D4-001 -->

### 43. P62-D4-004 — vscode: call-locator and argument-scanner logic is duplicated across the composer logic and UI layer files
**Route:** public issue
**Labels:** vscode, PRIO 2, 4

<!-- BODY-BEGIN P62-D4-004 -->
## Problem

The three composer logic files' `findXCallAt` entry points and top-level argument scanner
(`scanArgs`) are duplicated, and the addwindow/addchildwindow Code-Action UI registration helpers
near-duplicate each other, with no shared source of truth for either.

## Evidence

`bbj-vscode/src/msgbox-composer.ts:470-498,546-550`

Surface: `findMsgboxCallAt` (`msgbox-composer.ts:546-550`), `findAddWindowCallAt`
(`addwindow-composer.ts:401-405`), `findAddChildWindowCallAt`
(`addchildwindow-composer.ts:301-305`) — all three hash identically after stripping each function's
own type-name token; `msgbox-composer.ts`'s private `scanArgs` (`:470-498`) is algorithmically
identical to `addwindow-composer.ts`'s exported, reused `scanArgs` (`:320-341`); `addwindow-composer-ui.ts`
and `addchildwindow-composer-ui.ts` independently define a byte-identical-shaped `titleArg()` helper
and the same `XCodeActionProvider`/`registerXComposer` contract. Problem class: code duplication
across both the logic and UI layers of the composer feature. Impact: a future fix to the shared
call-locator/scanner algorithm must currently be applied by hand in three (effectively four,
counting the private msgbox copy) separate places, and future Code-Action UX changes need a matching
hand-edit in both `-ui.ts` files.

## Failure scenario

n/a -- D4 is a code-shape finding, not a runtime failure scenario; the maintainability cost is that a future fix to the shared findXCallAt/scanArgs algorithm must currently be applied by hand in three (effectively four, counting the private msgbox copy) separate places with no shared source of truth, and the addwindow/addchildwindow -ui.ts near-duplication means most future Code-Action UX changes need a matching hand-edit in both files.

## Proposed approach

Extracting a shared call-locator/scanner helper, or a shared UI registration helper, necessarily touches at least 3 (composer.ts) or 2 (ui.ts) files at once.

## Acceptance criteria

A shared call-locator/scanner helper replaces the three near-identical `findXCallAt`/`scanArgs`
implementations across `msgbox-composer.ts`, `addwindow-composer.ts`, and
`addchildwindow-composer.ts`, and a shared UI registration helper replaces the near-duplicated
`titleArg()`/`XCodeActionProvider` logic in `addwindow-composer-ui.ts` and
`addchildwindow-composer-ui.ts`. The existing per-file test suites continue to pass unchanged
against the extracted helpers.

## Traceability

Finding `P62-D4-004` · dimension D4 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P62-D4-004 -->

### 44. P63-D1-004 — intellij: EM token expiry check reports malformed, unsigned, or exp-less JWTs as not expired
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D1-004 -->
## Problem

`isTokenExpired()` returns "not expired" for three classes of malformed or ambiguous JWT input — a
non-3-part token, a payload with no `exp` claim, and any exception during decode — with no signature
verification anywhere in the file.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88`

Surface: `isTokenExpired()` (`:56-88`), three "unable to determine" branches at `:64-66`, `:76-77`,
`:84-86`; no `Signature`/JWT-library usage anywhere in this 89-line file. Problem class: fail-open
expiry validation — an unverifiable token is treated identically to a genuinely fresh one. Impact: a
malformed, unsigned, or exp-less token substituted or issued at store time passes this client-side
gate silently; the login flow is protected only by a separate server-side validation call this code
path never invokes.

## Failure scenario

A JWT token that is not well-formed 3-part base64url, whose decoded payload lacks an exp claim, or whose decode throws for any reason is reported as "not expired" identically to a token with a genuine future exp. BbjEMLoginAction's freshly- stored token is never itself re-checked through this or any other validator before being written to PasswordSafe, so a malformed or unsigned token issued or substituted at that point would pass this client-side gate silently; the run flows are protected only by the separate validateTokenServerSide() server round trip, which BbjEMLoginAction itself never calls.

## Proposed approach

Change the three "unable to determine" branches to return true — fail closed — or add an explicit isTokenWellFormed() gate callers must check before treating a token as usable.

## Acceptance criteria

The three "unable to determine" branches in `isTokenExpired()` either return `true` (fail closed) or
are gated behind an explicit `isTokenWellFormed()` check that callers must pass before treating a
token as usable. A regression test exercises a non-3-part token, an exp-less payload, and a
decode-throwing payload, and asserts each is now treated as expired (or rejected as not well-formed)
rather than as valid.

## Traceability

Finding `P63-D1-004` · dimension D1 (secondary D2) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D1-004 -->

### 45. P63-D1-005 — intellij: EM login temp files holding plaintext JWT output are created without owner-only permissions
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D1-005 -->
## Problem

Two `Files.createTempFile` call sites that hold plaintext JWT output are created with no explicit
owner-only file-permission attribute, leaving their default permissions to whatever the JVM/OS
combination applies for the window until they are deleted.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:295,303,BbjEMLoginAction.java:96,104`

Surface: `BbjRunActionBase.java:295` and `BbjEMLoginAction.java:96`, both `createTempFile` calls
passing no `FileAttribute`/`PosixFilePermissions` argument, for the window until the finally-block
delete (`BbjRunActionBase.java:315-317`, `BbjEMLoginAction.java:119-123`). Problem class: missing
explicit file-permission hardening on a temp file holding sensitive content. Impact: on a multi-user
host or shared filesystem where the plugin's temp directory is not exclusively readable by the
current user, another local process running as a different OS user could read the plaintext JWT
token or validation result during that window.

## Failure scenario

On a multi-user host or shared filesystem where the plugin's temp-file directory is not exclusively readable by the current user, another local process running as a different OS user could read the plaintext JWT token or the validation result during that window — a file-contents exposure channel distinct from P63-D1-003's always-open process-argument exposure, recorded separately because it is a different attack surface.

## Proposed approach

Pass PosixFilePermissions.asFileAttribute(EnumSet.of(OWNER_READ, OWNER_WRITE)) to both createTempFile calls, with a Windows-appropriate ACL fallback.

## Acceptance criteria

Both `Files.createTempFile` call sites (`BbjRunActionBase.java:295`, `BbjEMLoginAction.java:96`)
pass an explicit owner-only permission attribute
(`PosixFilePermissions.asFileAttribute(EnumSet.of(OWNER_READ, OWNER_WRITE))` on POSIX platforms,
with a Windows-appropriate ACL fallback), and a regression test asserts the created temp file's
permissions are owner-only immediately after creation on a POSIX platform.

## Traceability

Finding `P63-D1-005` · dimension D1 (secondary D2) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D1-005 -->

### 46. P63-D2-003 — intellij: Node.js download-in-progress flag is check-then-set with no synchronization, allowing concurrent downloads
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D2-003 -->
## Problem

`downloadNodeAsync()`'s in-progress flag check and set are two separate, unsynchronized
`PropertiesComponent` calls with task queueing and start intervening between them, allowing two
concurrent downloads to proceed at once.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:70-79`

Surface: `props.getBoolean(DOWNLOAD_IN_PROGRESS_KEY, false)` at `:71` and
`props.setValue(DOWNLOAD_IN_PROGRESS_KEY, true)` at `:79`; no synchronized block, lock, or atomic
compare-and-set anywhere in the file. Problem class: check-then-set race condition. Impact: two
IntelliJ windows or near-simultaneous invocations can both observe the flag as false and run
concurrent downloads, each independently calling `Files.copy(..., REPLACE_EXISTING)` to the
identical target path, risking an interleaved or partially-extracted read.

## Failure scenario

Two IntelliJ windows (or two near-simultaneous invocations from within one window) that both call downloadNodeAsync() inside the same race window both observe the flag as false before either call reaches :79, so two concurrent Task.Backgroundable downloads run at once, each independently downloading, extracting, and calling Files.copy(..., REPLACE_EXISTING) (:149) to the identical targetPath — a caller could observe a Files.copy from one task interleaved with a partially-extracted file from the other, or a getCachedNodePath() read of a node executable mid-overwrite by a second concurrent copy.

## Proposed approach

Guard the check-then-set with a synchronized block or an AtomicBoolean compare-and-set.

## Acceptance criteria

The in-progress check and set in `downloadNodeAsync()` are guarded by a synchronized block or an
`AtomicBoolean` compare-and-set so at most one download can be in flight at a time. A regression
test triggers two near-simultaneous calls to `downloadNodeAsync()` and asserts only one download
task actually runs.

## Traceability

Finding `P63-D2-003` · dimension D2 (secondary D1) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D2-003 -->

### 47. P63-D2-007 — intellij: composer LSP request failures are silently swallowed by unhandled CompletableFuture exceptions
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D2-007 -->
## Problem

Every composer `CompletableFuture` chain in this unit — `ComposerLauncher.launch()`'s chain and each
dialog's `refresh()` chain — has no completion-exception handler anywhere, so a failed LSP request
produces no visible effect.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-87,MsgboxComposerDialog.java:209-214,AddWindowComposerDialog.java:238-243,AddChildWindowComposerDialog.java:247-252`

Surface: `ComposerLauncher.launch()`'s nested chain at `:66-87` and each dialog's
`refresh() -> *Preview(...).thenAccept(...)` chain; a repo-wide grep for
`exceptionally|whenComplete|.handle(|catch(` across all 13 files in this unit returns zero matches.
Problem class: unhandled asynchronous exceptions. Impact: if any composer LSP request completes
exceptionally (server restart mid-request, timeout, connection drop), the continuation never runs
and the exception is stored unobserved, producing zero visible effect or a silently stale dialog.

## Failure scenario

If any bbj/composer/* LSP4IJ request completes exceptionally (server restart mid-request, timeout, connection drop), the .thenAccept(...) continuation never runs and the exception is stored on the future unobserved. Invoking a composer action/intention under this condition produces zero visible effect (no dialog, no error, no log entry); an already-open dialog's refresh() silently stops updating the preview/statement/schematic on the next keystroke, leaving stale text a user could unknowingly accept via the still-clickable OK button.

## Proposed approach

Add .exceptionally(t -> onEdt(() -> notifyNotReady(...))) or an equivalent error-surfacing handler to each chain.

## Acceptance criteria

Every composer `CompletableFuture` chain named above (`ComposerLauncher.launch()` and each dialog's
`refresh()` chain) has an `.exceptionally()` or equivalent handler that surfaces a user-visible
notification on completion failure instead of leaving the exception unobserved. A regression test
forces one chain to complete exceptionally and asserts a notification (or equivalent visible signal)
is produced rather than a silent no-op.

## Traceability

Finding `P63-D2-007` · dimension D2 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D2-007 -->

### 48. P63-D2-013 — intellij: six language-server restart call sites bypass the debounced restart path, risking overlapping restarts
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D2-013 -->
## Problem

Six independent call sites invoke the raw, unguarded `restart()` directly, bypassing the debounced
`scheduleRestart()`, so two triggers invoked close together can race into overlapping
`manager.stop()`/`manager.start()` calls with no synchronization.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:34-35,206-220`

Surface: `scheduleRestart()` (`:217-220`) debounces via `restartAlarm`, but a repo-wide grep for
`scheduleRestart()` calls found only one caller beyond this unit; six call sites —
`BbjRestartServerAction.java:27`, `BbjServerCrashNotificationProvider.java:49`,
`BbjStatusBarWidget.java:122`, `BbjJavaInteropStatusBarWidget.java:116`,
`BbjRefreshJavaClassesAction.java:30`, and the crash-auto-restart path itself (`:127`) — call the
raw `restart()` (`:206-211`) with no lock, flag, or debounce. Problem class: unguarded concurrent
restart race. Impact: two of these six triggers invoked close together (e.g. a user
double-clicking "Restart Server" while a crash-triggered auto-restart is still pending) call
`manager.stop`/`start` with no synchronization between the two calls.

## Failure scenario

Two of these six triggers invoked within a short window of each other — e.g. a user double-clicking "Restart Server" in the status-bar popup, or clicking "Restart" on the crash notification banner while the crash-triggered 1-second auto-restart delay (P63-D2-012) is still pending — each independently call manager.stop("bbjLanguageServer")/manager.start("bbjLanguageServer") with no synchronization between the two calls, an unguarded interleaving whose outcome depends on LanguageServerManager's own internal handling of overlapping stop/start calls for the same server id, not on anything this file coordinates.

## Proposed approach

Guard restart() with an in-flight AtomicBoolean, or make the currently-unused scheduleRestart()/Alarm machinery the single entry point every caller uses. Note: contrary to this record's own evidence field, `BbjSettingsConfigurable.apply():83` has called `scheduleRestart()` since commit `35c916b`, predating the Phase 63 review — the guard must account for that existing call site rather than treating the debounce machinery as unused (Phase 67 close-out correction).

## Acceptance criteria

`restart()` (or an equivalent single entry point that all six identified call sites route through)
is guarded by an in-flight check — an `AtomicBoolean` compare-and-set or the existing debounce
machinery — so overlapping restart triggers cannot both proceed to `manager.stop`/`start`
concurrently. A regression test triggers two of the six restart call sites in close succession and
asserts only one restart cycle actually executes.

## Traceability

Finding `P63-D2-013` · dimension D2 (secondary D4) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D2-013 -->

### 49. P63-D2-016 — intellij: line-comment toggle only recognizes uppercase REM, not BBj's case-insensitive rem syntax
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D2-016 -->
## Problem

`BbjCommenter.getLineCommentPrefix()` returns the fixed literal `"REM "` (uppercase), so a lowercase
or mixed-case `rem` line — grammar-valid per BBj's case-insensitive comment syntax — is not
recognized as already commented.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java:9-11`

Surface: `getLineCommentPrefix()` (`:9-11`) returns the fixed literal `"REM "`; the language
grammar's comment terminal is explicitly case-insensitive; no override in this 37-line file
normalizes case before IntelliJ's literal-prefix comparison, and `getCommentTokens()` returns
`TokenSet.EMPTY`, confirming no PSI-level comment token exists either. Problem class:
case-sensitivity mismatch between a case-insensitive language grammar and a case-sensitive IDE
feature. Impact: pressing the comment-toggle shortcut on an already-commented lowercase/mixed-case
line inserts a second `"REM "` prefix instead of removing the existing one.

## Failure scenario

A BBj source line beginning with lowercase or mixed-case "rem " (grammar-valid per bbj.langium:923, and BBj is case-insensitive per CLAUDE.md) is not recognized as already-commented when the user presses Ctrl+/ (Cmd+/) — IntelliJ inserts a second "REM " prefix instead of removing the existing one, producing "REM rem <original text>" rather than toggling the comment off.

## Proposed approach

BbjCommenter.java:9-11 is the exact site; the fix direction is to make REM recognition case-insensitive, either via a lexer-level COMMENT token so the platform's PSI-aware commenting path applies instead of raw-text matching, or a custom case-insensitive commenter.

## Acceptance criteria

Pressing the comment-toggle shortcut on a line already prefixed with any case combination of
`"rem "` removes the existing prefix rather than inserting a second one. A regression test toggles a
lowercase-prefixed `rem` line and a mixed-case-prefixed `Rem` line and asserts each is recognized as
already commented.

## Traceability

Finding `P63-D2-016` · dimension D2 (secondary D7) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D2-016 -->

### 50. P63-D3-001 — intellij: settings dialog spawns a node --version subprocess synchronously on the EDT on every keystroke
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D3-001 -->
## Problem

Two document listeners in the Settings dialog spawn synchronous, blocking work on the Swing EDT on
every keystroke — a `node --version` subprocess spawn for the Node.js path field, and a synchronous
file read for the BBj home path field.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:148-164`

Surface: `bbjHomeField` and `nodeJsField` document listeners (`:148-155`, `:157-164`); the
`nodeJsField` listener's `updateNodeVersionLabel()` (`:221-239`) spawns a `node --version`
subprocess synchronously via `ExecUtil.execAndReadLine` whenever the in-progress path already exists
as a file; the `bbjHomeField` listener's `updateClasspathDropdown()` (`:200-216`) performs a
synchronous `Files.readAllLines`. Problem class: EDT-blocking I/O and subprocess spawn triggered on
every keystroke, with no debounce. Impact: typing a path character-by-character can freeze the
entire Settings dialog for the duration of each spawn or file read.

## Failure scenario

Typing a Node.js executable path character-by-character in the Settings dialog spawns a subprocess synchronously on the EDT for every keystroke where the in-progress path happens to already exist as a file (e.g., typing over an existing valid path to correct it), freezing the entire Settings dialog for the duration of each spawn; the effect is worse on a slow filesystem, a network- mounted Node.js path, or a `node` shim with non-trivial startup overhead.

## Proposed approach

Move getNodeVersion()/getBBjClasspathEntries() calls off the EDT via a debounced background task.

## Acceptance criteria

Neither the `bbjHomeField` nor the `nodeJsField` document listener blocks the EDT: `getNodeVersion()`
and `getBBjClasspathEntries()` are invoked from a debounced background task rather than
synchronously inline. A regression test simulates rapid keystroke-triggered document changes and
asserts the EDT is not blocked for the duration of a subprocess spawn or a file read.

## Traceability

Finding `P63-D3-001` · dimension D3 (secondary D2) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D3-001 -->

### 51. P63-D3-002 — intellij: Run and EM-login actions redundantly re-validate the EM token server-side on every invocation
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D3-002 -->
## Problem

`buildCommandLine()` calls `validateTokenServerSide()` on every invocation, not only the first after
a fresh login, with no cache recording a recent successful validation.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:282-322,BbjRunBuiAction.java:81,BbjRunDwcAction.java:81`

Surface: `validateTokenServerSide()` (`BbjRunActionBase.java:282-322`), a full second bbj-process
spawn with a 10-second timeout, called unconditionally in addition to the cheap client-side
`isTokenExpired()` decode; no cache field anywhere in this unit records a "validated at time T,
trust until N" state. Problem class: redundant, unbounded-cost re-validation. Impact: every Run As
BUI/DWC invocation redundantly re-spawns and re-waits on the server-side validation subprocess even
seconds after a prior successful run.

## Failure scenario

Every "Run As BUI"/"Run As DWC" invocation redundantly re-spawns and re-waits on the server-side validation subprocess even when the token was validated seconds earlier by the previous run. Because (per P63-D2-004) this call happens synchronously on the EDT before the pooled-thread dispatch, each redundant validation directly extends that finding's per-click UI-freeze window, compounding rather than merely duplicating cost.

## Proposed approach

Cache the last-validated token value plus a timestamp and skip re-validation within a short trust window.

## Acceptance criteria

`buildCommandLine()` skips the server-side validation subprocess when a cached successful
validation for the current token value exists within a short trust window, and only re-validates
when the token has changed or the window has expired. A regression test issues two Run invocations
in quick succession with the same token and asserts the server-side validation subprocess runs at
most once.

## Traceability

Finding `P63-D3-002` · dimension D3 (secondary D2) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D3-002 -->

### 52. P63-D3-007 — intellij: missing-Node-runtime notification spawns a node --version subprocess on every editor-notification refresh
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D3-007 -->
## Problem

`collectNotificationData` spawns a `node --version` subprocess on every editor-notification refresh
pass, with no cache remembering the last result across calls.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java:28-59`

Surface: `collectNotificationData` (`:28-59`), invoked by the platform on every file/editor open and
refresh; both the explicit-path branch (`:39-44`) and the PATH auto-detection branch (`:46-52`) call
`BbjNodeDetector.getNodeVersion(...)`, which spawns and blocks on a real child process, with no
field, cache, or debounce remembering the last result. Problem class: redundant subprocess spawn on
a high-frequency code path. Impact: for any user with a configured or auto-detectable Node.js path,
every editor-notification refresh — not just the first per session — spawns a fresh
`node --version` process and blocks on its output.

## Failure scenario

For any user with a configured or auto-detectable Node.js path (the common case), every editor-notification refresh pass — not just the first per session — spawns a fresh "node --version" child process and blocks on its output before the banner can be suppressed or shown, redundant work on a path that runs far more often than a one-time startup check.

## Proposed approach

Cache the last known-good version result per path, invalidated on settings change.

## Acceptance criteria

`collectNotificationData` caches the last known-good Node.js version result per configured path,
invalidated only when the relevant setting changes, so a repeat refresh pass for an unchanged path
does not re-spawn `node --version`. A regression test triggers two consecutive refresh passes for
the same path and asserts the version-check subprocess runs at most once.

## Traceability

Finding `P63-D3-007` · dimension D3 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D3-007 -->

### 53. P63-D4-010 — intellij: BbjCompletionFeature and language-server registration classes couple tightly to LSP4IJ's experimental API surface with no regression test
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P63-D4-010 -->
## Problem

Seven files in this unit subclass or consume LSP4IJ classes and APIs directly, with no regression
test anywhere in the module to catch a breaking change from a future LSP4IJ release.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:8-12,40-65,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:8-9,18,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:11,28,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:19-20,208-210,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:10,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:14`

Surface: 20 references to `com.redhat.devtools.lsp4ij` across 11 files repo-wide, concentrated in
this unit's 7 files — `BbjCompletionFeature` extends `LSPCompletionFeature` (overriding `getIcon()`);
`BbjLanguageServerFactory` implements `LanguageServerFactory`, returning an anonymous
`LSPClientFeatures` with a nested `LSPDocumentLinkFeature` override; `BbjLanguageClient` extends
`LanguageClientImpl`; `BbjLanguageServer` extends `OSProcessStreamConnectionProvider`;
`BbjServerService`/`BbjJavaInteropService`/`BbjStatusBarWidget` consume the `ServerStatus` enum and
`LanguageServerManager`'s id-based start/stop API as plain values. Problem class:
dependency-coupling surface with no regression coverage. Impact: a breaking signature or semantics
change to any of the subclassed/overridden LSP4IJ members in a future release would surface as a
compile failure or a silent behaviour change at plugin-update time, with nothing in this module to
catch a silent one before release.

## Failure scenario

n/a (D4 is a code-shape finding, not a runtime failure scenario) — a breaking signature or semantics change to LSPCompletionFeature.getIcon(), LSPClientFeatures's builder chain, LanguageClientImpl. handleServerStatusChanged(), or OSProcessStreamConnectionProvider's constructor contract in a future LSP4IJ release would surface as a compile failure or a silent behaviour change across this unit's 7 files at plugin-update time, with no regression test anywhere in this module (P63-D5-001) to catch a silent one before release.

## Proposed approach

P66-D4-001 supersedes this record — its own `dedup:` states so directly. It re-triages this same coupling-shape evidence with a live jar measurement (the nine-row `RuntimeInvisibleAnnotations -> ApiStatus$Experimental` annotation table against the cached `lsp4ij-0.19.0.jar`) and names its own approach: a new `bbj-intellij/src/test/` source set exercising `BbjCompletionFeature.java` and `BbjLanguageServerFactory.java`, currently blocked by the same JDK toolchain gap `P63-D6-002` records. An implementer should read `P66-D4-001` as the live record for this coupling surface; this block stays in the document as the phase's designated DEBT-05 evidence handoff, not collapsed into its successor.

## Acceptance criteria

This finding's own coupling-shape evidence is superseded by finding `P66-D4-001`'s live
jar-measurement re-triage (see Traceability below); the concrete acceptance criteria for adding
regression coverage are tracked against that superseding finding's own issue, not duplicated here.
This issue is considered resolved when the successor issue's `bbj-intellij/src/test/` source set
closes the same coupling surface this record identifies.

## Traceability

Finding `P63-D4-010` · dimension D4 · severity medium · effort 4. This finding is superseded by a
later finding, `P66-D4-001`, which re-triages the same LSP4IJ-coupling evidence with a live jar
measurement and names a concrete regression-test plan. What remains true of this finding on its own:
it is the original record of the coupling surface across all seven files in this unit, and it stays
open as its own standalone issue rather than being dropped, so the coupling surface it documents has
a tracker entry independent of its successor's.
<!-- BODY-END P63-D4-010 -->

### 54. P63-D6-001 — dependencies: pinned Node.js runtime is past its own upstream end-of-life and missing five flagged security releases
**Route:** public issue
**Labels:** dependencies, PRIO 2, 4

<!-- BODY-BEGIN P63-D6-001 -->
## Problem

The pinned Node.js version constant (`NODE_VERSION = "v20.18.1"`) is past its own upstream
end-of-life and missing five later releases that nodejs.org's own release index flags as security
releases.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34`

Surface: `NODE_VERSION = "v20.18.1"` (`:34`). Problem class: outdated pinned runtime dependency past
its own vendor's end-of-life date. Impact: every install of this plugin downloads and executes a
Node.js runtime build that is past its own upstream end-of-life and missing at least five releases
flagged as security fixes, with no mechanism to pick any of them up short of a plugin-code change
and a new plugin release.

## Failure scenario

Every install of this plugin downloads and executes a Node.js runtime build that is, as of sweep time, past its own upstream end-of-life and missing at least 5 releases nodejs.org itself flagged as security fixes — the plugin has no mechanism to pick up any of those fixes short of a plugin-code change to the pinned constant and a new plugin release.

## Proposed approach

Bump NODE_VERSION to a current, in-support v20.x or later LTS release and verify the download filename/checksum shape is unchanged.

## Acceptance criteria

`NODE_VERSION` is bumped to a currently in-support Node.js LTS release (v20.x or later), and the
download filename/checksum construction logic is verified unchanged for the new version's release
artifact naming. A regression test (or a manually documented verification step, given no existing
harness covers this path) confirms the plugin can still resolve and download the updated version's
release artifact.

## Traceability

Finding `P63-D6-001` · dimension D6 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P63-D6-001 -->

### 55. P64-D1-001 — BBj integration and infrastructure: web.bbj silently falls back to the default admin/admin123 Enterprise Manager credentials when none are supplied
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 4

<!-- BODY-BEGIN P64-D1-001 -->
## Problem

When no EM credentials or token are supplied, `web.bbj` silently substitutes the literal default
administrator credentials `"admin"`/`"admin123"` and authenticates as the EM administrator.

## Evidence

`bbj-vscode/tools/web.bbj:30-31`

Surface: `web.bbj:19-20` read username/password via `ARGV(5,err=*next)`/`ARGV(6,err=*next)`, leaving
both unset if fewer than six arguments are supplied; `:26` takes the token branch only if a token is
present, otherwise `:30` assigns the literal `"admin"` to `username!` and `:31` assigns
`"admin123"` to `password!`, and `:32` authenticates with `BBjAdminFactory.getBBjAdmin(...)`.
Problem class: fail-open authentication with hardcoded default credentials — silent, with no message,
log line, or marker in the output, and no configuration switch to disable the fallback. Impact: a
BUI/DWC run command with no EM credentials configured and no token available silently authenticates
as the EM administrator, and the subsequent flow creates or overwrites a registered application
entry under administrator authority the user never knowingly exercised.

## Failure scenario

A BBj installation whose EM administrator password was never changed from the shipped default. A user triggers the BUI or DWC run command with no EM credentials configured and no token available, so ARGV(5), ARGV(6) and ARGV(8) all arrive empty. `web.bbj:30-31` substitutes admin/admin123, `:32` authenticates as the EM administrator, and `:54`-`:87` then create or overwrite a registered application entry — program path, working directory, classpath and config file — under administrator authority that the user never knowingly exercised and was never prompted for. The same path is what makes an unattended or scripted invocation silently privileged.

## Proposed approach

Delete the two fallback assignments and route the no-credential case to `login_failed:`.

## Acceptance criteria

A BUI/DWC run invocation with no EM credentials configured and no token available fails closed —
routing to the `login_failed:` path — instead of silently authenticating with default
`admin`/`admin123` credentials. A regression test (or documented manual verification, given no
existing harness drives this `.bbj` tool script) exercises the no-credential case and asserts it
reaches the failure path rather than a successful admin login.

## Traceability

Finding `P64-D1-001` · dimension D1 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P64-D1-001 -->

### 56. P64-D1-005 — BBj integration and infrastructure: most CI workflows declare no permissions: block, leaving GITHUB_TOKEN scope at whatever the org default is
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 4

<!-- BODY-BEGIN P64-D1-005 -->
## Problem

Four of six workflows (seven of ten jobs) declare no `permissions:` block, so their `GITHUB_TOKEN`
scope is whatever the repository/organization default is rather than an explicit, reviewable
minimum.

## Evidence

`.github/workflows/preview.yml:8-10`

Surface: `permissions:` appears only at `deploy-docs.yml:12`, `pr-vsix.yml:26` (both top-level), and
`manual-release.yml:149` (job-level, one job only); `build.yml`, `preview.yml`, `pr-validation.yml`,
and `manual-release.yml`'s `build-vscode`/`build-intellij` jobs declare none. Problem class:
undeclared token scope defaulting to an org-level setting not visible in the tree — inferred to be
the permissive default because `preview.yml` and `manual-release.yml` push commits/tags with no
explicit token, which requires `contents: write`. Impact: the jobs holding the VS Code and
JetBrains marketplace publishing tokens, and the same-repository-PR build job, also hold a
full-scope repository token by default, granting far more authority than each job's task requires.

## Failure scenario

A third-party action or a Gradle plugin executing inside `preview.yml`'s `publish-preview` or `build-intellij` job — every action reference in both being a mutable tag under `P64-D6-003` — runs with a repository token that, on the permissive default, can push to `main`, move tags, create releases and write packages, in addition to whatever marketplace credential is in scope for its step. The narrower everyday case is the same shape without a compromise: any step that misbehaves in those seven jobs does so with far more authority than the job's task requires, and nothing in the repository records what that authority is, so a reviewer reading `build.yml` or `pr-validation.yml` cannot tell from the file whether its token can write to the repository or not.

## Proposed approach

Add `permissions: contents: read` to `build.yml` and `pr-validation.yml`, `contents: write` to `preview.yml`, and per-job blocks to `manual-release.yml`'s two undeclared jobs.

## Acceptance criteria

`build.yml` and `pr-validation.yml` declare an explicit `permissions: contents: read` block;
`preview.yml` declares `contents: write`; `manual-release.yml`'s `build-vscode` and `build-intellij`
jobs each declare an explicit per-job permissions block. The next run of each modified workflow
completes successfully under its newly declared scope, confirming the declared permission is
sufficient for that workflow's actual operations.

## Traceability

Finding `P64-D1-005` · dimension D1 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P64-D1-005 -->

### 57. P64-D2-003 — BBj integration and infrastructure: six post-login EM calls in web.bbj have no error handler, so failures produce a silent no-op
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 4

<!-- BODY-BEGIN P64-D2-003 -->
## Problem

Six external calls that run after a successful EM login carry no `err=` handler, so a failure at any
of them produces a silent no-op rather than any visible message.

## Evidence

`bbj-vscode/tools/web.bbj:34,54,70,87,90,91`

Surface: seven `err=` occurrences total in `web.bbj` — five `ARGV` reads and the two login calls
only; the script's one user-facing failure message (`MSGBOX("Login Failed!",...)` at `:97`) is
reachable only from those two login calls; six post-login calls —
`admin!.getRemoteConfiguration()` (`:34`), `configuration!.createApplication()` (`:54`),
`BBjAPI().getConfig().getConfigFileName()` (`:70`), `app!.commit()` (`:87`),
`app!.getDwcUrl(0)`/`app!.getBuiUrl(0)` (`:90`), and `BBjAPI().getThinClient().browse(url!)` (`:91`)
— carry no `err=` branch. Problem class: silent failure — errors after login are simply unhandled
rather than surfaced. Impact: if any of these six calls fails (e.g. `commit()` fails due to a
permission or connection issue), control never reaches the browser-open or message-box steps, and
the BUI/DWC run command produces nothing at all, indistinguishable from a run that was never
triggered.

## Failure scenario

EM authentication succeeds, so `:27` or `:32` returns an `admin!` handle and the `login_failed:` path is out of reach. `app!.commit()` at `:87` then fails — the authenticated EM user lacks permission to write the application entry, the entry collides, or the EM connection drops between `:34` and `:87`. Control never reaches `:90-91`, so no browser is opened, and it cannot reach `:97`, so no message box is shown. From the user's side the BUI/DWC run command produces nothing at all: no browser, no dialog, no distinction from a run that was never triggered. The same shape applies to the other five unguarded calls.

## Proposed approach

Add `err=` branches to the six calls and give them a distinct labelled message rather than reusing `login_failed:`, whose text would be wrong for them.

## Acceptance criteria

Each of the six identified post-login calls (`getRemoteConfiguration`, `createApplication`,
`getConfigFileName`, `commit`, `getDwcUrl`/`getBuiUrl`, and the browser launch) has an `err=` branch
routing to a distinct, correctly worded failure message rather than being silently unhandled or
reusing `login_failed:`'s text. A regression test (or documented manual verification, given no
existing harness drives this `.bbj` tool script) forces one of the six calls to fail and asserts a
distinct, visible failure message is produced.

## Traceability

Finding `P64-D2-003` · dimension D2 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P64-D2-003 -->

### 58. P64-D3-002 — BBj integration and infrastructure: build.yml runs unconditionally and without a concurrency group on every pull request, duplicating another workflow's build and test
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 4

<!-- BODY-BEGIN P64-D3-002 -->
## Problem

`build.yml` has no `paths:` filter and runs on every pull request regardless of what changed,
duplicating `pr-vsix.yml`'s install/build/test/package sequence for any PR touching `bbj-vscode`,
and neither workflow declares a `concurrency:` group to cancel superseded runs.

## Evidence

`.github/workflows/build.yml:3-9`

Surface: `build.yml:7-9` declares `pull_request: branches: [main]` with no `paths:` filter, running
`npm ci`/build/vitest/`vsce package` on every PR; `pr-vsix.yml` declares the same trigger behind a
`paths:` filter and runs an equivalent sequence, fully overlapping for any PR touching
`bbj-vscode/**`; `build.yml` is the only workflow among the four PR-triggered ones with no `paths:`
scoping. Problem class: unscoped CI trigger plus missing concurrency control, causing redundant and
non-cancelled CI runs. Impact: a documentation-only PR still triggers a full `build.yml` run
including the vitest suite and a VSIX package; a branch pushed multiple times leaves multiple full
builds running to completion because no concurrency group cancels the superseded ones.

## Failure scenario

A contributor opens a pull request that edits `bbj-vscode/src/language/bbj.langium` and pushes three times over ten minutes while responding to review. Each push starts a fresh `build.yml` run (cold install, build, full vitest suite, VSIX package) and a fresh `pr-vsix.yml` run (cold install, build, full vitest suite, VSIX package), and because neither declares a `concurrency:` group for `build.yml`, none of the earlier `build.yml` runs is cancelled. Six full builds of the same project execute for one pull request, four of them for commits nobody will look at again. Separately, a documentation-only pull request — which `deploy-docs.yml` correctly declines to build — still triggers a complete `build.yml` run including the vitest suite.

## Proposed approach

The manifest file is `.github/workflows/build.yml:3-9`, and the decision it turns on is what protects `main`: whether `build.yml` gains a `paths:` filter (bringing it in line with every other scoped workflow), is merged into `pr-vsix.yml` so the two stop running the same install-build-test-package sequence twice per pull request, or deliberately stays the one unconditional gate that runs on every PR regardless of what changed — the wrong choice removes the only check `main` currently has on every pull request, which is why this is a review decision rather than a nameable edit. The sibling `on:`-block change is already applied: `P64-D4-004` landed in Phase 67 as a recorded D-06 departure, removing the dead `push: branches: [typefox-dev]` trigger and leaving `on:` with `pull_request` alone — an implementer starts from that state, a change already recorded as complete in the project's own internal release-engineering notes, not the pre-Phase-67 one.

## Acceptance criteria

A named CI-policy decision is made and recorded (in the resulting issue's own discussion, not
preempted here) on one of: adding a `paths:` filter to `build.yml`, merging `build.yml` into
`pr-vsix.yml`, or deliberately keeping `build.yml` as the one unconditional gate on every pull
request. Whichever direction is chosen, a follow-up regression check confirms `main` retains at
least one CI gate that runs on every pull request regardless of what changed.

## Traceability

Finding `P64-D3-002` · dimension D3 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P64-D3-002 -->

### 59. P64-D6-003 — dependencies: all 36 GitHub Actions references across the workflows use mutable version tags instead of pinned commit SHAs
**Route:** public issue
**Labels:** dependencies, PRIO 2, 4

<!-- BODY-BEGIN P64-D6-003 -->
## Problem

All 36 `uses:` references across the six workflow files, covering nine distinct GitHub Actions,
resolve to mutable major-version tags, and none is pinned to a commit SHA.

## Evidence

`.github/workflows/manual-release.yml:18-162`

Surface: 36 `uses:` references total across `build.yml` (3), `deploy-docs.yml` (5),
`manual-release.yml` (11), `pr-validation.yml` (6), `pr-vsix.yml` (4), `preview.yml` (7); a
repo-wide grep for a 40-character commit-SHA pin returns zero matches. Problem class: unpinned
supply-chain dependency — the bytes executed at job start are whatever the mutable tag currently
resolves to, with no reviewable diff for a re-tag. Impact: the highest-privilege combination is five
`actions/upload-artifact@v4` steps inside the same jobs holding the VS Code and JetBrains
marketplace publishing tokens; a re-tag of any of the nine referenced actions changes what those
jobs execute with no corresponding change in this repository.

## Failure scenario

A release of any one of the nine referenced actions is re-tagged or republished under its existing major tag — the ordinary mechanism by which `@v4` advances, and the mechanism an account compromise would ride. The next `preview.yml` or `manual-release.yml` run executes the new bytes inside a job that holds a marketplace publishing credential and, per `P64-D1-005`, a repository token at the permissive default scope. Nothing in this repository changes, no pull request is opened, and no diff exists for anyone to review; the first observable signal would be whatever the changed action does. The same exposure applies in the ordinary non-malicious case as a reproducibility gap: a build that succeeded last week and fails today cannot be attributed from the repository alone, because the workflow file is identical and the code it ran is not.

## Proposed approach

The manifest files are the six workflows under `.github/workflows/`, whose 36 `uses:` references cover 9 distinct actions and resolve entirely to mutable major-version tags (`grep -nE 'uses:.*@[0-9a-f]{40}' .github/workflows/*.yml` returns `0`). The edit is to pin each of the 36 references to the commit SHA its current tag currently resolves to, appending a `# vX.Y.Z` comment per GitHub's own convention so the human-readable version stays visible, and to adopt an update mechanism so the pins do not go stale — a `github-actions` Dependabot ecosystem entry (`P64-D6-005` names the same gap) is the natural fit since Dependabot already resolves SHA bumps for pinned actions. The tool-native check that proves the result is the same grep against all six files reporting `36` SHA-pinned references and `0` remaining mutable-tag references.

## Acceptance criteria

All 36 `uses:` references across the six workflow files are pinned to the commit SHA their current
tag resolves to, each with a `# vX.Y.Z` comment naming the human-readable version. A grep for a
commit-SHA-pinned `uses:` pattern reports 36 matches and a grep for a bare mutable-tag `uses:`
pattern reports 0. An update mechanism (a `github-actions` Dependabot ecosystem entry or equivalent)
is in place so the pins do not silently go stale.

## Traceability

Finding `P64-D6-003` · dimension D6 (secondary D1) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P64-D6-003 -->

### 60. P64-D6-005 — dependencies: Dependabot configuration covers only the bbj-vscode npm tree, leaving the Gradle, documentation, and GitHub Actions dependency trees unwatched
**Route:** public issue
**Labels:** dependencies, PRIO 2, 4

<!-- BODY-BEGIN P64-D6-005 -->
## Problem

`.github/dependabot.yml` declares exactly one update entry, covering only `bbj-vscode`'s npm tree,
leaving three other dependency trees — the IntelliJ Gradle tree, the documentation npm tree, and the
36 GitHub Actions references — with no automated update coverage.

## Evidence

`.github/dependabot.yml:3-7`

Surface: `dependabot.yml` is 19 lines, one `updates:` entry
(`package-ecosystem: "npm"`, `directory: "/bbj-vscode"`, `interval: "weekly"`); uncovered: the
`bbj-intellij` Gradle tree (no `gradle` ecosystem entry), the `documentation/` npm tree (no entry
naming that directory, despite a 685KB `package-lock.json` built on every doc change), and the 36
GitHub Actions references (no `github-actions` ecosystem entry). Problem class: incomplete
dependency-update coverage across a repository with four distinct dependency trees. Impact: a
published advisory affecting a transitive Gradle plugin dependency, the documentation site's tree,
or one of the nine GitHub Actions produces no Dependabot pull request, and the steady stream of
`bbj-vscode` npm update PRs the maintainers already see reads as working dependency automation
rather than partial coverage.

## Failure scenario

A published advisory affects a transitive dependency of the IntelliJ Platform Gradle plugin, or the Docusaurus tree under `documentation/`, or one of the nine GitHub Actions this repository executes. Dependabot opens no pull request, because none of those three trees is declared in its configuration, and the repository's maintainers see the same steady stream of `bbj-vscode` npm updates they always see — five such branches are open right now — which reads as working dependency automation rather than as partial coverage. Nothing else fills the gap: the review of this repository's Gradle build tooling will establish that the Gradle tree cannot be enumerated locally either, so for that tree there is no automated signal and no manual one. The failure is therefore silent by construction: the absence of an alert is indistinguishable from the absence of a vulnerability.

## Proposed approach

The manifest file is `.github/dependabot.yml:3-7`. Two of the three uncovered trees are nameable edits: add a `github-actions` ecosystem entry (`directory: "/"`) to close the 36-reference gap `P64-D6-003` enumerates, and add a second `npm` entry for `directory: "/documentation"` to cover the Docusaurus tree's own `package-lock.json`. The third — whether `bbj-intellij`'s Gradle tree is covered by a `gradle` ecosystem entry, a different scanner, or accepted with a written reason — is not part of this approach: it is a decision that belongs to the review of this repository's Gradle build and CI tooling, under SEC-08, referred rather than pre-empted here, per this record's own evidence. The tool-native check that proves the mechanical half is a YAML parse of `dependabot.yml` reporting three `updates:` entries once the Gradle decision is also recorded (two if it is deferred as a documented exception).

## Acceptance criteria

`dependabot.yml` gains a `github-actions` ecosystem entry (`directory: "/"`) and a second `npm`
entry for `directory: "/documentation"`, closing the two mechanically nameable gaps. A YAML parse of
`dependabot.yml` reports three `updates:` entries (or two, if the Gradle-tree decision is deferred
as a documented exception rather than resolved here). Whether and how the `bbj-intellij` Gradle tree
is covered is recorded as an explicit, written decision rather than left silently unaddressed.

## Traceability

Finding `P64-D6-005` · dimension D6 · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P64-D6-005 -->

### 61. P65-D1-002 — intellij: EM JWT token storage silently follows the IDE-wide password-save setting instead of a fixed secure backend
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P65-D1-002 -->
## Problem

The IntelliJ EM JWT token's storage backend is governed entirely by IntelliJ's IDE-wide
"Save passwords" setting, unlike VS Code's fixed, platform-bound `SecretStorage`.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:25-29 (contrasted with bbj-vscode/src/extension.ts:587,667)`

Surface: `createAttributes()` (`:25-29`) builds a `CredentialAttributes` from only a generated
service name, with no further flag; `storeToken`/`getToken`/`deleteToken` call
`PasswordSafe.getInstance()` with those attributes alone; which backend `PasswordSafe` actually uses
is governed entirely by the IDE-wide "Save passwords" setting (native keychain, a local
KeePass-format file, or memory-only). Problem class: a security-relevant storage guarantee that
silently varies with a setting outside the plugin's knowledge or control, contrasted against VS
Code's fixed `SecretStorage` binding, which offers no equivalent lever. Impact: an org policy or a
user setting IntelliJ's "Save passwords" preference to "In KeePass" or "Do not save" causes the EM
JWT to be stored with a materially weaker guarantee, or not persisted at all, with no warning to the
user that this specific credential's protection changed.

## Failure scenario

An organization's IT policy, or a user acting alone, sets IntelliJ's "Save passwords" preference to "In KeePass" or "Do not save" — a setting entirely outside this plugin's knowledge or control — and the EM JWT is thereafter stored in a local KeePass-format file (protected only by that file's own master password and OS file permissions, a materially weaker guarantee than an OS keychain entry) or not persisted at all across IDE restarts, forcing a silent re-login prompt with no indication to the user that their chosen preference changed this specific credential's protection. The equivalent VS Code user has no such lever available to weaken it, and no comparable warning exists on either side telling the user which backend is currently protecting this particular token.

## Proposed approach

(surface a one-time notification when PasswordSafe's resolved backend is not the native keychain, mirroring the transparency VS Code's fixed binding provides for free).

## Acceptance criteria

When `PasswordSafe`'s resolved backend for the EM JWT credential is not the native OS keychain, the
plugin surfaces a one-time notification informing the user which backend is currently protecting
the token. A regression test (or documented manual verification, given no existing IntelliJ test
harness in this module) exercises a non-keychain `PasswordSafe` configuration and asserts the
notification is shown exactly once.

## Traceability

Finding `P65-D1-002` · dimension D1 (secondary D7) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P65-D1-002 -->

### 62. P65-D1-003 — vscode: EM token expiry check reports malformed, unsigned, or exp-less JWTs as not expired
**Route:** public issue
**Labels:** vscode, PRIO 2, 4

<!-- BODY-BEGIN P65-D1-003 -->
## Problem

`extension.ts`'s `isTokenExpired()` independently exhibits the same fail-open weakness already
recorded on the IntelliJ side — it returns "not expired" for three classes of malformed or
ambiguous JWT input, with no signature verification.

## Evidence

`bbj-vscode/src/extension.ts:339-366 (contrasted with bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88, P63-D1-004)`

Surface: `isTokenExpired()` (`:339-366`), three "unable to determine" branches at `:344-346`,
`:355-357`, `:363-365`, no signature verification anywhere in the function. Problem class: fail-open
expiry validation, mirroring the IntelliJ-side defect this cross-cutting sweep surfaced by tracing
expiry handling on both IDEs. Impact: mitigated but not eliminated by `ensureValidToken()`'s
mandatory server round trip for both run commands; the residual gap is that a freshly-issued token
stored by the login handler is never itself re-validated at that moment, so a malformed or
substituted token at exactly that point would be accepted into secret storage silently.

## Failure scenario

A JWT token that is not well-formed 3-part base64url, whose decoded payload lacks an exp claim, or whose decode throws for any reason is reported "not expired" identically to a token with a genuine future exp, by getEMCredentials() (:374-388) and therefore by ensureValidToken() and getEMCredentials()'s every other caller. The freshly-issued token stored by the bbj.loginEM handler (:667) is never itself run through this or any other validator before being persisted, so a malformed or substituted token at that exact moment would be accepted into SecretStorage silently — the run flows remain protected only because ensureValidToken's separate server round trip (:471) is unconditional, not because this decode caught anything.

## Proposed approach

(change the three "unable to determine" branches at :345,:356,:364 to return true — fail closed — matching the exact edit P63-D1-004 already proposes for its own IntelliJ analog).

## Acceptance criteria

The three "unable to determine" branches in `extension.ts`'s `isTokenExpired()` (`:345`, `:356`,
`:364`) return `true` (fail closed) rather than `false`, matching the fix applied to the IntelliJ
analog. A regression test exercises a non-3-part token, an exp-less payload, and a decode-throwing
payload against `isTokenExpired()` directly (a pure function requiring no VS Code API mock) and
asserts each is now treated as expired.

## Traceability

Finding `P65-D1-003` · dimension D1 (secondary D2) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P65-D1-003 -->

### 63. P66-D4-001 — intellij: BbjCompletionFeature and BbjLanguageServerFactory couple to LSP4IJ classes marked @ApiStatus.Experimental, confirmed by jar inspection
**Route:** public issue
**Labels:** intellij, PRIO 2, 4

<!-- BODY-BEGIN P66-D4-001 -->
## Problem

A live jar-measurement re-triage confirms that `BbjCompletionFeature` and `BbjLanguageServerFactory`
subclass or anonymously implement three LSP4IJ classes each carrying a class-level
`@ApiStatus.Experimental` marker, with no regression test to catch a breaking change.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java:19,21 (extends LSPCompletionFeature; @Override getIcon(CompletionItem)); bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:39-64 (anonymous LSPClientFeatures with a nested LSPDocumentLinkFeature override); bbj-intellij/build.gradle.kts:27 (the pinned 0.19.0)`

Surface: `LSPCompletionFeature`, `LSPClientFeatures`, and `LSPDocumentLinkFeature` — the three
classes `BbjCompletionFeature`/`BbjLanguageServerFactory` subclass or anonymously implement — each
carry a class-level `RuntimeInvisibleAnnotations -> ApiStatus$Experimental` block in the cached
`lsp4ij-0.19.0.jar`, read directly via `javap -v` rather than asserted from documentation. Problem
class: dependency-coupling to an API its own vendor marks unstable, with no regression coverage.
Impact: a breaking signature or semantics change to any of the subclassed/overridden members in a
future LSP4IJ release — explicitly permitted under their own `@ApiStatus.Experimental` contract —
would surface as a compile failure or a silent behaviour change at plugin-update time, with nothing
in this module to catch a silent one before release.

## Failure scenario

n/a (D4 is a code-shape finding, not a runtime failure scenario) — a breaking signature or semantics change to LSPCompletionFeature.getIcon(), LSPClientFeatures's initializeParams()/setDocumentLinkFeature()/ setCompletionFeature() builder chain, or LSPDocumentLinkFeature.isSupported() in a future LSP4IJ release (explicitly permitted by their own @ApiStatus.Experimental contract) would surface as a compile failure or a silent behaviour change across BbjCompletionFeature.java and BbjLanguageServerFactory.java at plugin-update time, with no regression test anywhere in this module (P63-D5-001) to catch a silent one before release.

## Proposed approach

A complete fix needs a new bbj-intellij/src/test/ source set exercising both BbjCompletionFeature.java and BbjLanguageServerFactory.java, two files, and per P64-D6-010 even running that suite locally is currently blocked by the JDK toolchain mismatch.

## Acceptance criteria

A new `bbj-intellij/src/test/` source set exists exercising both `BbjCompletionFeature.java` and
`BbjLanguageServerFactory.java` against their subclassed LSP4IJ extension points (`getIcon()`, the
`LSPClientFeatures` builder chain, and `LSPDocumentLinkFeature.isSupported()`), providing a
regression signal a future LSP4IJ upgrade would trip if it breaks one of these three coupling
points. This criterion is understood to be blocked on resolving the JDK toolchain mismatch that
currently prevents running the module's test suite locally, and that blocker is tracked as a
precondition, not silently dropped.

## Traceability

Finding `P66-D4-001` · dimension D4 · severity medium · effort 4 (matches the same effort already on
record for this coupling surface — no departure). This finding supersedes an earlier finding,
`P63-D4-010`, re-triaging the same LSP4IJ-coupling evidence with this record's own live jar
measurement (the nine-row annotation table above) in place of the earlier record's
coupling-shape-only trace. What it adds beyond `P63-D4-010`: a confirmed, tool-measured
`@ApiStatus.Experimental` annotation on all three coupled LSP4IJ classes, and a concrete proposed
fix — a new `bbj-intellij/src/test/` source set — that the earlier record did not attempt.
<!-- BODY-END P66-D4-001 -->

### 64. P66-D5-001 — javascript: three parser test assertions remain disabled, so classpath-dependent validation regressions pass the suite undetected
**Route:** public issue
**Labels:** javascript, PRIO 2, 4

<!-- BODY-BEGIN P66-D5-001 -->
## Problem

Three disabled/commented-out assertions in `parser.test.ts` mean a regression in
Java-classpath-dependent validation would pass the full test suite undetected.

## Evidence

`bbj-vscode/test/parser.test.ts:530,811,860`

Surface: three `DISABLED` `expectNoValidationErrors` assertions in `bbj-vscode/test/parser.test.ts`,
covering `new String()` substring validation, `BBjAPI()` global-namespace method-chain resolution,
and `String[]`/`byte[]` Java-typed class fields, all unchanged at their recorded lines with their
recorded blocking comments intact. Problem class: missing/disabled regression assertions — a
test-infrastructure gap (no Java classpath resolvable under Langium's `EmptyFileSystem` test
context) rather than a runtime behavior defect. Impact: any regression in these three validation
scenarios would pass the full npm test suite undetected, because the only assertions that would
catch it are commented out rather than executed.

## Failure scenario

Any regression in Java-classpath-dependent validation for these three scenarios — new String() substring validation, BBjAPI() global-namespace method-chain resolution, and String[]/byte[] Java-typed class fields — would pass the full npm test suite undetected, because the only assertions that would catch it are commented out rather than executed.

## Proposed approach

Like the Phase 61 D5 environment/coverage-gap records this record cites (P61-D5-003), no single code edit closes this gap: the three disabled `expectNoValidationErrors` assertions in `bbj-vscode/test/parser.test.ts` (lines 533, 815, 864) need a Java classpath resolvable under Langium's `EmptyFileSystem` test context, a capability the current unit-test setup does not provide. DEBT-02's own re-triage scope is to either enable them once that capability exists or document the specific blocking limitation and what would unblock it — this record's approach is that documentation-or-enablement choice, not a fabricated single-file fix, since its own classification found none.

## Acceptance criteria

The three disabled `expectNoValidationErrors` assertions in `bbj-vscode/test/parser.test.ts` are
either (a) re-enabled once a Java classpath resolvable under Langium's `EmptyFileSystem` test
context is available, with each assertion passing under that classpath, or (b) left disabled with a
written, current explanation of the specific blocking limitation and what capability would need to
exist to unblock them. Whichever path is taken, the outcome is a documented decision rather than an
indefinitely silent gap.

## Traceability

Finding `P66-D5-001` · dimension D5 (secondary D2) · severity medium · effort 4. `dedup: none`.
<!-- BODY-END P66-D5-001 -->
