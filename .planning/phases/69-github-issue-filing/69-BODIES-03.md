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
