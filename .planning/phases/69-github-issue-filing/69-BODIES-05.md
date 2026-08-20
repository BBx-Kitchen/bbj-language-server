## Index rows 88-107

| # | finding_id | route | title | labels |
|---|---|---|---|---|
| 88 | P61-D1-009 | public issue | vscode: isExternalDocument()'s bare string-prefix comparison misclassifies workspace-internal sibling directories as external | vscode, PRIO 3, 2 |
| 89 | P61-D4-011 | public issue | vscode: getFunctionReference is duplicated verbatim across the signature-help and inlay-hint providers | vscode, PRIO 3, 2 |
| 90 | P61-D4-013 | public issue | vscode: interop host/port default literals are recomputed independently in bbj-ws-manager.ts and main.ts | vscode, PRIO 3, 2 |
| 91 | P61-D4-014 | public issue | vscode: composer-commands.ts is nested inside src/language/ despite having no interaction with the Langium pipeline | vscode, PRIO 3, 2 |
| 92 | P61-D4-016 | public issue | vscode: the four built-in-catalog .ts wrappers close with three different, inconsistent shapes | vscode, PRIO 3, 2 |
| 93 | P62-D1-002 | public issue | vscode: CSP nonce generation across all four composer webviews uses Math.random() instead of a cryptographic RNG | vscode, PRIO 3, 2 |
| 94 | P62-D1-007 | public issue | vscode: isTokenizedFile/statSize open files with no symlink or file-type check before reading | vscode, PRIO 3, 2 |
| 95 | P63-D1-002 | public issue | intellij: the cached Node.js binary is trusted on read with no digest or version verification | intellij, PRIO 3, 2 |
| 96 | P63-D1-008 | public issue | intellij: the Java-interop connection probe treats any successful TCP handshake as a confirmed connection | intellij, PRIO 3, 2 |
| 97 | P63-D2-001 | public issue | intellij: getCachedNodePath() cannot distinguish "not yet downloaded" from "cache directory inaccessible" | intellij, PRIO 3, 2 |
| 98 | P63-D2-005 | public issue | intellij: the Login to Enterprise Manager action has no update()/getActionUpdateThread() override, unlike all ten sibling actions | intellij, PRIO 3, 2 |
| 99 | P63-D2-006 | public issue | intellij: EM login's temp-file cleanup try/finally doesn't wrap the process-launch call that precedes it | intellij, PRIO 3, 2 |
| 100 | P63-D2-009 | public issue | intellij: applyHexEdit indexes flagsRange/eventMaskRange arrays with no length check | intellij, PRIO 3, 2 |
| 101 | P63-D2-014 | public issue | intellij: the Java-interop health check omits the project.isDisposed() guard its own unit's other service already applies everywhere | intellij, PRIO 3, 2 |
| 102 | P63-D3-005 | public issue | intellij: the Java-interop status poll runs on a fixed 5-second timer with no visibility or focus gating | intellij, PRIO 3, 2 |
| 103 | P63-D4-002 | public issue | intellij: the java-interop default port literal 5008 is hardcoded independently across 3 files with no shared constant | intellij, PRIO 3, 2 |
| 104 | P63-D8-004 | public issue | documentation: three composer class docs still describe a create-only flow after edit-in-place was added | documentation, PRIO 3, 2 |
| 105 | P64-D2-002 | public issue | BBj integration and infrastructure: the interop test harness's JSON syntax highlighter never matches escaped quotes, so key/string coloring has never worked | BBj integration and infrastructure, PRIO 3, 2 |
| 106 | P64-D2-006 | public issue | BBj integration and infrastructure: preview.yml's version-bump-and-push has no concurrency protection, so two overlapping pushes to main can silently drop a preview publish | BBj integration and infrastructure, PRIO 3, 2 |
| 107 | P64-D3-003 | public issue | vscode: the prepare npm lifecycle hook duplicates the full generate-typecheck-bundle pipeline that three CI workflows already run explicitly | vscode, PRIO 3, 2 |

## Bodies rows 88-107

### 88. P61-D1-009 — vscode: isExternalDocument()'s bare string-prefix comparison misclassifies workspace-internal sibling directories as external
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P61-D1-009 -->
## Problem

`isExternalDocument()` tests whether a document belongs to a PREFIX directory by checking
`documentUri.fsPath.startsWith(URI.file(prefix).fsPath)` — a bare string-prefix comparison with no
path-segment boundary check. A workspace directory that merely shares a PREFIX directory's path as
a text prefix (for example a sibling `library-secrets` directory next to a PREFIX `lib` directory)
is misclassified as external.

## Evidence

`bbj-vscode/src/language/bbj-ws-manager.ts:231-241`

Surface: `isExternalDocument()`'s `documentUri.fsPath.startsWith(...)` prefix check. Problem class:
a containment check with no path-segment boundary — a string-prefix match, not a
directory-containment match. Impact: `shouldValidate()` silently skips validation for a genuine
in-workspace file that happens to share a PREFIX directory's path as a text prefix, and
`revalidateUseFilePathDiagnostics`/`shouldRelink` treat it as read-only even though it is not.

## Failure scenario

A workspace happens to contain a directory whose name shares a PREFIX directory's path as a text prefix (e.g. PREFIX `/ws/lib` and an in-workspace directory `/ws/library-legacy`). Any document under that sibling directory is misclassified as an "external", PREFIX-resolved document — shouldValidate (bbj-document-builder.ts:50-59) then silently skips validation for it, and revalidateUseFilePathDiagnostics/shouldRelink treat it as read-only, even though it is a genuine in-workspace file that should be validated normally.

## Proposed approach

Compare against `prefix + path.sep`, or use a proper relative()-based containment check.

## Acceptance criteria

`isExternalDocument()` no longer misclassifies a workspace-internal directory whose name shares a
PREFIX directory's path as a text prefix. A regression test with a PREFIX directory `/ws/lib` and a
sibling in-workspace directory `/ws/library-legacy/File.bbj` confirms the sibling file is validated
normally rather than treated as external/read-only.

## Traceability

Finding `P61-D1-009` · dimension D1 (secondary D2) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P61-D1-009 -->

### 89. P61-D4-011 — vscode: getFunctionReference is duplicated verbatim across the signature-help and inlay-hint providers
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P61-D4-011 -->
## Problem

`getFunctionReference` is defined identically in `bbj-signature-help-provider.ts` and
`bbj-inlay-hint-provider.ts` — the same 9-line body and the same signature shape — with no shared
helper between them, despite both files already importing shared logic from `bbj-hover.ts`.

## Evidence

`bbj-vscode/src/language/bbj-signature-help-provider.ts:60-68, bbj-vscode/src/language/bbj-inlay-hint-provider.ts:93-101`

Surface: `getFunctionReference`, duplicated verbatim in both files. Problem class: code duplication
with no shared module boundary for logic both files already partially share elsewhere. Impact: a
future change to how a `MethodCall`'s callee reference is resolved must be applied by hand in both
files, risking drift between signature help and inlay hints.

## Failure scenario

n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a future change to how a MethodCall's callee reference is resolved (e.g. adding a third method-reference shape) must be applied in both files by hand, risking drift between signature help and inlay hints.

## Proposed approach

Extract getFunctionReference into bbj-nodedescription-provider.ts and update both call sites.

## Acceptance criteria

`getFunctionReference` exists in exactly one place (`bbj-nodedescription-provider.ts`), and both
`bbj-signature-help-provider.ts` and `bbj-inlay-hint-provider.ts` import it rather than redefining
it. The existing vitest suites covering signature help and inlay hints continue to pass unchanged.

## Traceability

Finding `P61-D4-011` · dimension D4 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P61-D4-011 -->

### 90. P61-D4-013 — vscode: interop host/port default literals are recomputed independently in bbj-ws-manager.ts and main.ts
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P61-D4-013 -->
## Problem

`bbj-ws-manager.ts` computes `params.initializationOptions.interopHost || 'localhost'` and
`...interopPort || 5008`; `main.ts` independently recomputes the identical default literals at a
second call site, with no shared constant or helper between them.

## Evidence

`bbj-vscode/src/language/bbj-ws-manager.ts:53-54`

Surface: two independent call sites (`bbj-ws-manager.ts:53-54` and `main.ts:151-152`) recomputing
the same `'localhost'`/`5008` fallback defaults. Problem class: duplicated default-literal
computation with no single source of truth. Impact: if the default interop host/port ever needs to
change, both call sites must be updated in lockstep by hand, and a partial update leaves the two
paths silently disagreeing on the effective default.

## Failure scenario

n/a (D4 trace-tier finding): if the default host/port ever needs to change (e.g. a new default interop port), both call sites must be updated in lockstep by hand; a partial update leaves the two paths silently disagreeing on the effective default.

## Proposed approach

Pass interopHost/interopPort through unmodified at both call sites, relying solely on setConnectionConfig's own default.

## Acceptance criteria

`bbj-ws-manager.ts` and `main.ts` no longer each apply their own `|| 'localhost'` / `|| 5008`
fallback; the effective default is computed in exactly one place (`setConnectionConfig`). A
regression test confirms both call sites still resolve to the same default value when no explicit
host/port is configured.

## Traceability

Finding `P61-D4-013` · dimension D4 (secondary D1) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P61-D4-013 -->

### 91. P61-D4-014 — vscode: composer-commands.ts is nested inside src/language/ despite having no interaction with the Langium pipeline
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P61-D4-014 -->
## Problem

`composer-commands.ts`'s only non-`vscode-languageserver` imports are three composer domain
modules that live one directory up, in `src/`, not in `src/language/` alongside this file. The file
touches no Langium grammar/scope/validation/LSP-provider service; its only tie to `src/language/`
is being imported once, by `main.ts`, to register composer requests.

## Evidence

`bbj-vscode/src/language/composer-commands.ts:1-13`

Surface: `composer-commands.ts`'s file placement inside `src/language/`. Problem class: a
module-placement mismatch — the file's actual dependencies live in `src/`, not `src/language/`.
Impact: a contributor looking for the composer request-handling layer next to the composer domain
modules it wraps will not find it there; it is instead nested inside the Langium-pipeline-focused
`src/language/` directory.

## Failure scenario

n/a (D4 trace-tier finding — a placement/structure defect, not a runtime failure): a contributor looking for the composer request-handling layer inside `src/` (next to the composer domain modules it wraps) will not find it there; it is instead nested inside the Langium-pipeline-focused `src/language/` directory.

## Proposed approach

Move composer-commands.ts to src/, update main.ts's import path.

## Acceptance criteria

`composer-commands.ts` lives in `src/` alongside the composer domain modules it imports, `main.ts`'s
import path is updated accordingly, and the existing `test/composer-commands.test.ts` continues to
pass unchanged after the move.

## Traceability

Finding `P61-D4-014` · dimension D4 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P61-D4-014 -->

### 92. P61-D4-016 — vscode: the four built-in-catalog .ts wrappers close with three different, inconsistent shapes
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P61-D4-016 -->
## Problem

`events.ts` closes with a bare `;`; `functions.ts` and `labels.ts` close with `.trimLeft();` plus
an extra leading blank line that `.trimLeft()` exists to strip; `variables.ts` closes with a bare
backtick, relying on ASI. Four files, three different closing shapes, with no observable parsing
difference between any of them.

## Evidence

`bbj-vscode/src/language/lib/events.ts:1,735; functions.ts:1,996; labels.ts:1,66; variables.ts:1,87`

Surface: the closing lines of all four built-in-catalog wrapper files. Problem class: inconsistent
code shape, including dead defensive code (`.trimLeft()`) in two of the four files. Impact: a
future edit to any one file's wrapper has no consistent pattern to follow.

## Failure scenario

Not a runtime defect (WS is hidden, so all four parse identically) — a maintainability smell: .trimLeft() is dead defensive code in 2 of 4 files, present for no principled reason distinguishing them from the other 2, and a future edit to any one file's wrapper has no consistent pattern to follow.

## Proposed approach

Pick one wrapper shape, apply to all four.

## Acceptance criteria

All four catalog wrapper files (`events.ts`, `functions.ts`, `labels.ts`, `variables.ts`) close with
the same shape. The existing vitest suite covering built-in catalog parsing continues to pass
unchanged.

## Traceability

Finding `P61-D4-016` · dimension D4 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P61-D4-016 -->

### 93. P62-D1-002 — vscode: CSP nonce generation across all four composer webviews uses Math.random() instead of a cryptographic RNG
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P62-D1-002 -->
## Problem

`getNonce()` builds the 32-character CSP nonce by indexing a 62-character alphabet with
`Math.floor(Math.random() * chars.length)` — a non-cryptographic PRNG. The identical construction,
confirmed byte-identical by md5, recurs in three other composer webview files.

## Evidence

`bbj-vscode/src/msgbox-composer-webview.ts:366-373`

Surface: `getNonce()`, duplicated identically across `msgbox-composer-webview.ts`,
`addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts` and
`setopts-composer-webview.ts`, used as the sole `script-src` allowlist value in each panel's CSP and
written onto each panel's single inline `<script nonce>` tag. Problem class: a CSP nonce generated
from a non-cryptographic PRNG. Impact: a CSP-hardening gap — no injection point into the generated
HTML currently exists in any of these four files, so this diverges from best practice without
currently being exploitable.

## Failure scenario

A CSP nonce's security property depends on being unguessable per page load; Math.random() is not designed to resist state reconstruction from observed outputs. Because no injection point into the generated HTML exists in these four files today (SEC-01/SEC-02 Surface Handoff fact (1)), there is no current path to exploit a predicted nonce — this is a CSP-hardening gap, not a live vulnerability, and diverges from VS Code's own extension-guidelines recommendation to use a cryptographically strong nonce generator.

## Proposed approach

Swap Math.random() for node:crypto's randomBytes/randomUUID.

## Acceptance criteria

All four composer webview files generate their CSP nonce via `node:crypto`'s `randomBytes` or
`randomUUID` rather than `Math.random()`. Each generated nonce is asserted to still satisfy the
panel's `script-src 'nonce-...'` CSP directive exactly as before.

## Traceability

Finding `P62-D1-002` · dimension D1 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P62-D1-002 -->

### 94. P62-D1-007 — vscode: isTokenizedFile/statSize open files with no symlink or file-type check before reading
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P62-D1-007 -->
## Problem

`isTokenizedFile` and `statSize` call `fs.promises.open`/`fs.promises.stat` directly on their file
parameter with no realpath resolution, no symlink check and no regular-file-type check before
opening — both functions trust their caller entirely for path containment.

## Evidence

`bbj-vscode/src/decompile-io.ts:15-27,29-35`

Surface: `isTokenizedFile` and `statSize`'s unchecked file open/stat calls. Problem class: a missing
defense-in-depth path/file-type validation before a filesystem read. Impact: today neither of the
two call sites is attacker- or workspace-setting-influenced, but a future caller passing a
webview-message- or workspace-setting-derived path would have no containment check at all.

## Failure scenario

If a future caller ever passes a webview-message-derived or workspace-setting-derived path to isTokenizedFile/statSize without its own containment check, a symlink escaping the workspace or a device node could be opened; today no such caller exists, so this is a defense-in-depth absence, not a currently exploitable defect.

## Proposed approach

(fs.lstat the resolved path first and reject non-regular files).

## Acceptance criteria

`isTokenizedFile` and `statSize` call `fs.lstat` on the resolved path and reject non-regular files
(symlinks, directories, device nodes) before opening. `decompile-io.test.ts` is extended with a
symlink/directory fixture confirming the rejection.

## Traceability

Finding `P62-D1-007` · dimension D1 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P62-D1-007 -->

### 95. P63-D1-002 — intellij: the cached Node.js binary is trusted on read with no digest or version verification
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D1-002 -->
## Problem

`getCachedNodePath()` returns the cached Node.js binary path whenever
`Files.exists(nodePath) && Files.isExecutable(nodePath)` holds — no hash comparison, no signature
check, no size assertion and no version probe anywhere in the file. A file satisfying only
exists+executable is indistinguishable to this method from a binary the plugin itself downloaded.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:52`

Surface: `getCachedNodePath()`'s trust decision on the cache-read path — a code path distinct from
the download path itself. Problem class: missing integrity verification on a cached executable
before it is launched. Impact: any local process able to write into the plugin data directory can
place an executable at the predictable cache path and have it launched as the Node.js host process
on every subsequent IDE launch.

## Failure scenario

Any local process or user able to write into the plugin data directory can place an executable file at exactly <plugins>/bbj-intellij-data/nodejs/node (or node.exe on Windows). On the next IDE launch getCachedNodePath() returns it on the strength of :52 alone, and the caller runs it as the Node.js host process for the language server for every BBj file opened. Note this path BYPASSES the download entirely — the archive is never fetched, so P63-D1-001's absent checksum is not merely insufficient here, it is never reached. This is the distinct half of the integrity gap: D1-001 covers bytes that arrive over the network unverified, D1-002 covers bytes that are never verified on read, on every launch after the first. Severity is low because the plugin data directory is normally private to the current OS user, limiting who can pre-place the file; it is not `none` because the directory is a predictable, non-randomised path under a well-known IDE root, and the file is made executable by the plugin's own code (:153) on the download path.

## Proposed approach

Record the downloaded binary's digest alongside the cache and re-verify it in getCachedNodePath() before returning, or at minimum probe `node --version` against NODE_VERSION.

## Acceptance criteria

`getCachedNodePath()` verifies the cached binary's digest (or at minimum its reported version)
against the value recorded at download time before returning it. A test fixture confirms a
tampered or mismatched cache entry is rejected rather than launched.

## Traceability

Finding `P63-D1-002` · dimension D1 (secondary D2) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D1-002 -->

### 96. P63-D1-008 — intellij: the Java-interop connection probe treats any successful TCP handshake as a confirmed connection
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D1-008 -->
## Problem

`checkConnection()` opens a plain TCP socket and treats a successful three-way handshake alone as
the signal that `InteropStatus.CONNECTED` should be reported — no byte is written to or read from
the socket anywhere in the file, so no application-layer exchange confirms the listening peer is
actually java-interop.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-150`

Surface: `checkConnection()`'s bare TCP-connect probe. Problem class: missing peer-identity
verification behind a status indicator. Impact: any process accepting a connection on the
configured host:port causes the status bar to misleadingly report "Java: Connected" — a cosmetic
misrepresentation, not a data exposure, since nothing is read from or acted on from the socket
anywhere in this file.

## Failure scenario

Any process — not necessarily the genuine java-interop service — that accepts a TCP connection on the configured host:port (default localhost:5008) causes this probe to report "Java: Connected" in the status bar, even though no application-layer exchange confirms the listening peer is actually java-interop. The consequence is a misleading, purely cosmetic status indicator, not a state change or data exposure — no value from the socket is read or acted upon anywhere in this file.

## Proposed approach

The limitation is inherent given java-interop exposes no LSP-visible identity or handshake to check against, per this file's own class doc, :19-23 — the nameable edit is documenting the limitation explicitly in that same doc, since a protocol-level identity check would require a java-interop change out of this unit's scope.

## Acceptance criteria

`BbjJavaInteropService`'s class doc explicitly documents that the connection probe verifies only a
TCP handshake and not java-interop's application-layer identity, naming this as a known limitation
rather than leaving it undocumented.

## Traceability

Finding `P63-D1-008` · dimension D1 (secondary D2) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D1-008 -->

### 97. P63-D2-001 — intellij: getCachedNodePath() cannot distinguish "not yet downloaded" from "cache directory inaccessible"
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D2-001 -->
## Problem

`getCachedNodePath()` catches an `IOException` during directory creation and falls through to the
same `return null` that the "not yet cached" branch also reaches — the two conditions are
indistinguishable to every caller. The same catch-and-return-null-uniformly pattern recurs in two
other files in this unit.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:47-59`

Surface: `getCachedNodePath()`'s `IOException` handling. Problem class: an error condition collapsed
into the same return value as a normal not-yet-cached state. Impact: an unwritable plugin data
directory (read-only filesystem, permission denial, disk full) is reported identically to a fresh
first-run state, so a UI or logic branch presents the wrong diagnosis and a user retries a download
that is doomed to fail at the same step for the same underlying reason.

## Failure scenario

A plugin data directory that is unwritable (read-only filesystem, permission denial, disk full during Files.createDirectories at :245) causes getCachedNodePath() to report "not cached" identically to the correct first-run state, so any UI or logic that branches on this method's result (e.g., deciding whether to show a "Download Node.js" action) presents the wrong diagnosis — "not downloaded yet" instead of "environment is misconfigured" — and a user retries a download that is doomed to fail at the same directory-creation step for the same underlying reason.

## Proposed approach

Log the swallowed IOException, or return a small sealed result type distinguishing "not cached" from "cache directory inaccessible".

## Acceptance criteria

`getCachedNodePath()` distinguishes a genuine "not yet cached" state from a "cache directory
inaccessible" error, either by logging the swallowed `IOException` or by returning a sealed result
type, so a caller (or its logs) can tell the two conditions apart.

## Traceability

Finding `P63-D2-001` · dimension D2 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D2-001 -->

### 98. P63-D2-005 — intellij: the Login to Enterprise Manager action has no update()/getActionUpdateThread() override, unlike all ten sibling actions
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D2-005 -->
## Problem

`BbjEMLoginAction` extends `AnAction` directly and defines only `actionPerformed()` — no `update()`
or `getActionUpdateThread()` override, unlike all ten other actions in this unit, each of which
explicitly declares `ActionUpdateThread.BGT` and gates enablement on project/file/server-readiness
state.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:25-36`

Surface: `BbjEMLoginAction`'s missing `update()`/`getActionUpdateThread()` override. Problem class:
an inconsistent action-enablement pattern relative to every sibling action in the same unit.
Impact: the "Login to Enterprise Manager" menu item stays enabled and visible regardless of whether
a project is open or the language server is running, inconsistent with its ten siblings.

## Failure scenario

"Login to Enterprise Manager" remains enabled and visible in the Tools menu regardless of whether a project is open or the language server is running — inconsistent with its ten siblings. performLogin()'s own internal checks (BBj Home configured, credentials entered) prevent a hard failure, but the menu item's enabled state does not reflect the project's actual readiness the way every other action in this unit does.

## Proposed approach

Add update()/ getActionUpdateThread() overrides mirroring BbjRefreshJavaClassesAction's pattern.

## Acceptance criteria

`BbjEMLoginAction` declares `update()`/`getActionUpdateThread()` overrides mirroring
`BbjRefreshJavaClassesAction`'s pattern, gating enablement on project/file/server-readiness state
consistently with its ten siblings.

## Traceability

Finding `P63-D2-005` · dimension D2 (secondary D4) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D2-005 -->

### 99. P63-D2-006 — intellij: EM login's temp-file cleanup try/finally doesn't wrap the process-launch call that precedes it
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D2-006 -->
## Problem

`tmpFile` is created inside the outer try block; the inner try/finally deletes it but wraps only
the subsequent read, not the earlier `handler.runProcess(15000)` call, which executes between the
file's creation and that inner block.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:96,115,119-123,145`

Surface: the try/finally scoping around `tmpFile`'s creation, the process launch, and its deletion.
Problem class: a resource-cleanup block that doesn't cover the full lifetime of the resource it's
meant to protect. Impact: an exception thrown by the process-launch call is caught only by the
outer handler, which returns without ever reaching the inner try/finally that deletes `tmpFile`,
leaving a temp file — potentially containing a partially-written login output — on disk until the
OS reclaims it.

## Failure scenario

An exception thrown by handler.runProcess(15000) at line 115 — a process-launch failure, an I/O error, or an internal timeout — is caught only by the outer catch (Exception ex) at line 145, which shows an error dialog and returns false without ever reaching the inner try/finally that deletes tmpFile; the temp file (potentially containing a partially-written EM login output, including a token fragment, if em-login.bbj wrote before the process failed) is left on disk in the OS temp directory until the OS itself reclaims it.

## Proposed approach

Widen the try/finally at :119-123 to also wrap the runProcess(...) call at line 115.

## Acceptance criteria

The try/finally block that deletes `tmpFile` also wraps the `runProcess()` call, so an exception
thrown during process launch still triggers cleanup of the temp file. A test or manual trace
confirms `tmpFile` is removed on a `runProcess()` failure.

## Traceability

Finding `P63-D2-006` · dimension D2 (secondary D1) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D2-006 -->

### 100. P63-D2-009 — intellij: applyHexEdit indexes flagsRange/eventMaskRange arrays with no length check
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D2-009 -->
## Problem

`applyHexEdit` indexes `ed.flagsRange[0]`/`[1]` and `ed.eventMaskRange[0]`/`[1]` with no length
check before indexing. Today's `composer-commands.ts` handlers always build these as 2-element
tuples, so this is a latent, not currently observed, gap.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:179,185`

Surface: `applyHexEdit`'s unchecked array indexing. Problem class: a missing defensive length check
on data crossing the language-server-to-IDE boundary. Impact: a future language-server-side
encoding change producing a 0- or 1-element array would throw `ArrayIndexOutOfBoundsException`
inside the `WriteCommandAction` applying the edit, with no defensive check anywhere in the client to
catch it first.

## Failure scenario

A future LS-side change to the flagsRange/eventMaskRange encoding that ever produces a 0- or 1-element array would throw ArrayIndexOutOfBoundsException inside the WriteCommandAction that applies the edit, with no defensive length check anywhere in the client to catch it before indexing.

## Proposed approach

Guard ed.flagsRange.length == 2 / ed.eventMaskRange.length == 2 before indexing.

## Acceptance criteria

`applyHexEdit` guards both `ed.flagsRange.length == 2` and `ed.eventMaskRange.length == 2` before
indexing, failing gracefully rather than throwing if a future encoding change produces a shorter
array.

## Traceability

Finding `P63-D2-009` · dimension D2 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D2-009 -->

### 101. P63-D2-014 — intellij: the Java-interop health check omits the project.isDisposed() guard its own unit's other service already applies everywhere
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D2-014 -->
## Problem

`BbjServerService.updateStatus()` checks `project.isDisposed()` at entry and again inside every
`invokeLater` lambda it schedules; `BbjJavaInteropService.checkConnection()` and `broadcastStatus()`
contain no such check anywhere, despite calling `project.getMessageBus()` and `EditorNotifications`
unconditionally.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-184`

Surface: `checkConnection()` and `broadcastStatus()`'s missing `project.isDisposed()` checks,
contrasted against `BbjServerService`'s established pattern in the same unit. Problem class: a
missing disposal guard on a background-thread callback that touches project services. Impact: a
health check already in flight when project disposal begins can complete after disposal has
started and call `project.getMessageBus()`/`EditorNotifications` on a possibly-disposed project — a
class of failure this same unit's own code already guards against at every equivalent call site.

## Failure scenario

A health check already in flight on the pooled thread when the project begins disposing (dispose() at :202-205 only calls checkAlarm.cancelAllRequests(), which cancels queued-but-not-yet-running requests, not one already executing) completes after disposal has started and reaches broadcastStatus()'s invokeLater lambda, which calls project.getMessageBus()/EditorNotifications. getInstance(project) on a project that may already be disposed — a class of failure this same unit's own BbjServerService code already guards against at every equivalent call site.

## Proposed approach

Add `if (project.isDisposed()) return;` at the top of checkConnection() and inside broadcastStatus()'s invokeLater lambda, mirroring BbjServerService's own pattern.

## Acceptance criteria

`checkConnection()` and `broadcastStatus()`'s `invokeLater` lambda both check
`project.isDisposed()` and return early before touching any project service, mirroring
`BbjServerService`'s own pattern.

## Traceability

Finding `P63-D2-014` · dimension D2 (secondary D4) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D2-014 -->

### 102. P63-D3-005 — intellij: the Java-interop status poll runs on a fixed 5-second timer with no visibility or focus gating
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D3-005 -->
## Problem

Once the language server has started, `scheduleNextCheck()` unconditionally re-arms a TCP connect
attempt against java-interop every 5 seconds indefinitely, for the lifetime of the project, with no
check anywhere in this file for whether a BBj file is currently open or whether the IDE window has
focus.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:93-96,109-111,117-160`

Surface: `startChecking()`/`scheduleNextCheck()`'s unconditional 5-second re-arm loop. Problem
class: missing visibility/focus gating on a recurring background poll. Impact: the poll runs
indefinitely even while every open editor tab is a non-BBj file, or while the IDE window is
minimized or in the background, since neither condition is checked anywhere in the scheduling loop.

## Failure scenario

Once the language server has started, this unit performs a TCP connect attempt against the configured java-interop host:port every 5 seconds indefinitely — for the lifetime of the project — even while every open editor tab is a non-BBj file (the status widget itself is hidden per its own visibility check) and even while the IDE window is minimized or in the background, since neither condition is checked anywhere in the scheduling loop. The settings re-read on every tick (BbjSettings.getInstance().getState(), :119) is a stated, deliberate design trade-off ("not cached - user may change them") rather than a defect, so this finding is scoped to the missing visibility/focus gating only.

## Proposed approach

Gate scheduleNextCheck()/startChecking() on whether a BBj file is currently open, mirroring the widgets' own updateVisibility() check, or on project-frame focus/idle state.

## Acceptance criteria

`scheduleNextCheck()`/`startChecking()` are gated on whether a BBj file is currently open
(mirroring the status widgets' own `updateVisibility()` check) or on project-frame focus/idle
state, so the poll no longer runs unconditionally every 5 seconds regardless of relevance.

## Traceability

Finding `P63-D3-005` · dimension D3 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D3-005 -->

### 103. P63-D4-002 — intellij: the java-interop default port literal 5008 is hardcoded independently across 3 files with no shared constant
**Route:** public issue
**Labels:** intellij, PRIO 3, 2

<!-- BODY-BEGIN P63-D4-002 -->
## Problem

The literal `5008` is hardcoded across `BbjSettings.java` (five separate sites),
`BbjSettingsComponent.java` and `BbjSettingsConfigurable.java` — three files in total, with no
shared named constant anywhere.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:30,107,111,116,150`

Surface: the literal `5008`, repeated across `BbjSettings.java`, `BbjSettingsComponent.java` and
`BbjSettingsConfigurable.java`. Problem class: a duplicated default-value literal with no single
source of truth. Impact: if the default java-interop port is ever changed, every site across all
three files needs a coordinated, hand-synchronized edit, and missing one leaves the UI placeholder
text, the persisted default and the "was this ever changed from default" check silently
inconsistent with each other.

## Failure scenario

n/a (D4 is a code-shape finding) — if the default java-interop port is ever changed (matching a future language-server default), every one of these sites across 3 files needs a coordinated, hand-synchronized edit; missing one leaves an inconsistent default between the UI's placeholder text, the persisted state's default, and the Configurable's "was this ever changed from default" check used by P63-D2-002's auto-detection gate — silently reintroducing or compounding that finding.

## Proposed approach

Introduce BbjSettings.DEFAULT_JAVA_INTEROP_PORT and reference it from all 3 files.

## Acceptance criteria

A single `BbjSettings.DEFAULT_JAVA_INTEROP_PORT` constant is introduced and referenced from all
three files that previously hardcoded the literal `5008`, with no remaining independent occurrence
of the literal.

## Traceability

Finding `P63-D4-002` · dimension D4 (secondary D2) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D4-002 -->

### 104. P63-D8-004 — documentation: three composer class docs still describe a create-only flow after edit-in-place was added
**Route:** public issue
**Labels:** documentation, PRIO 3, 2

<!-- BODY-BEGIN P63-D8-004 -->
## Problem

`MsgboxComposerDialog.java`'s class doc names only the create flow, with no mention of
edit-in-place; `AddWindowComposerDialog.java`'s class doc explicitly claims "Create flow only for
now" even though `applyAddWindowEdit`/`applyHexEdit` fully implement edit-in-place;
`ComposerLauncher.java`'s class doc still describes only two composer UIs though the class has
dispatched three `Kind` values since a later composer UI landed.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:39-44,AddWindowComposerDialog.java:40-45,ComposerLauncher.java:25-31`

Surface: the class-level Javadoc of `MsgboxComposerDialog.java`, `AddWindowComposerDialog.java` and
`ComposerLauncher.java`. Problem class: stale documentation describing behavior the code no longer
has (doc-lag). Impact: a maintainer reading either dialog's class doc alone, without reading the
constructor or the launcher's call sites, would not learn edit-in-place exists for either class,
and would read `AddWindowComposerDialog.java`'s doc as an accurate current limitation when it is
stale.

## Failure scenario

A maintainer reading MsgboxComposerDialog.java's or AddWindowComposerDialog. java's class doc alone, without reading the constructor or ComposerLauncher's call sites, would not learn edit-in-place exists for either class, and would read AddWindowComposerDialog.java's doc as an accurate current limitation when it is stale.

## Proposed approach

Update each class doc to name both create and edit-in-place flows, mirroring AddChildWindowComposerDialog.java's own accurate wording, and update ComposerLauncher.java's doc to say "all three composer UIs".

## Acceptance criteria

Each of the three class docs accurately matches what its code does: `MsgboxComposerDialog.java` and
`AddWindowComposerDialog.java` both name create and edit-in-place flows, mirroring
`AddChildWindowComposerDialog.java`'s already-accurate wording, and `ComposerLauncher.java`'s doc
names all three composer UIs it dispatches to. No behavioral regression test is implied, since this
is a documentation-only fix.

## Traceability

Finding `P63-D8-004` · dimension D8 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P63-D8-004 -->

### 105. P64-D2-002 — BBj integration and infrastructure: the interop test harness's JSON syntax highlighter never matches escaped quotes, so key/string coloring has never worked
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 3, 2

<!-- BODY-BEGIN P64-D2-002 -->
## Problem

`generateReport` calls `escapeHtml(...)` before `syntaxHighlightJson(...)`, but `escapeHtml`
replaces every `"` with `&quot;` first, and `syntaxHighlightJson`'s key/string-matching regexes
both require a literal `"` — which by then no longer occurs anywhere in the input, so zero
`json-key` and zero `json-string` spans are ever produced.

## Evidence

`bbj-vscode/tools/interop-test-harness/run-tests.ts:706-708`

Surface: `escapeHtml(...)` run before `syntaxHighlightJson(...)` inside `generateReport`. Problem
class: an escape-then-match ordering bug that silently defeats two regexes that require an
unescaped quote character. Impact: every JSON key and every JSON string value in a generated report
renders in the default color, while numbers/booleans/nulls (whose patterns contain no quote
character) are still colored correctly — the report looks deliberately styled rather than broken.

## Failure scenario

Run the harness against any live service and open the generated `report.html`. Expand any Request block or any Response block: every JSON key and every JSON string value renders in the default `pre` colour, and the document contains no `<span class="json-key">` or `<span class="json-string">` element at all, while numbers, booleans and nulls are coloured. The feature the CSS and the two dead regexes were written for has never worked in any report this harness has produced, and nothing signals that — the report looks deliberately styled rather than broken.

## Proposed approach

Highlight first, then escape, or make the two regexes match `&quot;`.

## Acceptance criteria

Running the harness against a live service and opening the generated `report.html` shows JSON keys
and string values colored via `<span class="json-key">`/`<span class="json-string">` elements,
matching the coloring already correctly applied to numbers, booleans and nulls.

## Traceability

Finding `P64-D2-002` · dimension D2 (secondary D4) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P64-D2-002 -->

### 106. P64-D2-006 — BBj integration and infrastructure: preview.yml's version-bump-and-push has no concurrency protection, so two overlapping pushes to main can silently drop a preview publish
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 3, 2

<!-- BODY-BEGIN P64-D2-006 -->
## Problem

`preview.yml` triggers on every push to `main` and declares no `concurrency:` group anywhere in the
file. Its bump step reads the current version out of the checked-out `package.json` and increments
it in the workspace, then commits and pushes that bump to `main` — two overlapping runs both
compute the same next version from stale checkouts, and the losing run's push is rejected, so that
run publishes nothing.

## Evidence

`.github/workflows/preview.yml:3-8`

Surface: `preview.yml`'s push-triggered version-bump-and-push steps, with no `concurrency:` group
anywhere in the file. Problem class: a read-modify-write race in the version-bump logic, not
fixable by adding a `concurrency:` block alone in either cancel mode. Impact: two commits pushed to
`main` close together can result in the second commit's preview build silently never being
published, surfacing only as a red Git-rejection run rather than anything that reads as a
release-related failure.

## Failure scenario

Two commits are pushed to `main` a minute apart — an ordinary merge followed by a follow-up fix. Run A and run B both start, both read version `0.12.0` from their own checkouts, and both compute `0.12.1`. Run A pushes the bump and publishes preview `0.12.1`. Run B's `git push` at `:60` is rejected, the step fails, and run B stops before `:62-68`, so the second commit is never published as a preview and the only signal is a red run whose failure message is a Git rejection rather than anything about releases. A maintainer who re-runs the failed job hits the same rejection, because run B's checkout is still the pre-bump commit.

## Proposed approach

The manifest file is `.github/workflows/preview.yml:34-60`. Adding a bare `concurrency:` group is not sufficient in either cancel mode, as the record's own evidence traces: the defect is in the read-modify-write shape of the version bump, not in run overlap alone. The observable that has to change is that two pushes to `main` within the same window no longer both compute the same `NEW_VERSION` from a stale checkout — closing this means deciding how the bump reads `main`'s current version: fetch-and-rebase immediately before bumping, derive the version from the tag list instead of the checked-out `package.json`, or move the bump to run after publication succeeds rather than before.

## Acceptance criteria

Two commits pushed to `main` within the same window no longer both compute the same next version
from a stale checkout. Verified by re-running the workflow's version-bump logic against a
simulated overlapping-push scenario and confirming the second run derives a version that accounts
for the first run's bump (or, alternatively, that the bump has been moved to run only after
publication succeeds).

## Traceability

Finding `P64-D2-006` · dimension D2 · severity low · effort 2. `dedup: none`.
<!-- BODY-END P64-D2-006 -->

### 107. P64-D3-003 — vscode: the prepare npm lifecycle hook duplicates the full generate-typecheck-bundle pipeline that three CI workflows already run explicitly
**Route:** public issue
**Labels:** vscode, PRIO 3, 2

<!-- BODY-BEGIN P64-D3-003 -->
## Problem

`package.json`'s `prepare` lifecycle hook runs `npm run langium:generate && npm run build` after
every `npm install`/`npm ci`. Three CI workflows (`build.yml`, `pr-vsix.yml`, `pr-validation.yml`)
run `npm ci` immediately followed by an explicit `npm run build`, so each of those jobs pays the
full generate-typecheck-bundle pipeline twice.

## Evidence

`bbj-vscode/package.json:653`

Surface: the `prepare` lifecycle hook, combined with three CI workflows that immediately follow
`npm ci` with an explicit second build. Problem class: structurally redundant build work triggered
by a non-opt-in npm lifecycle hook. Impact: every CI run of those three workflows pays the
generate/typecheck/bundle cost twice, and every contributor running `npm install` locally pays it
once before doing anything else — including a contributor who only wanted to update a dependency.

## Failure scenario

Any push to `typefox-dev`, or any pull request to `main` matching `pr-validation.yml:8-13`'s path filters, or any pull request touching `bbj-vscode/**`. The runner executes `npm ci`, npm fires `prepare`, and the full generate-plus-typecheck-plus-bundle pipeline runs to completion; the next line then runs `npm run build`, repeating the type-check and the bundle from cold. Every CI run of those three workflows pays the build twice, and every contributor who runs `npm install` locally pays it once before doing anything — including contributors who only wanted to update a dependency. The cost is duplicated work rather than incorrect output, which is why this is `low`.

## Proposed approach

Either narrow `prepare` to `npm run langium:generate` (the part a fresh checkout genuinely needs) and let each caller build explicitly, or drop the redundant `npm run build` line from the three workflows.

## Acceptance criteria

After the fix, neither a bare `npm install`/`npm ci` nor any of the three CI workflows
(`build.yml`, `pr-vsix.yml`, `pr-validation.yml`) runs the full generate-typecheck-bundle pipeline
more than once per invocation. The existing CI workflows continue to succeed unchanged.

## Traceability

Finding `P64-D3-003` · dimension D3 (secondary D4) · severity low · effort 2. `dedup: none`.
<!-- BODY-END P64-D3-003 -->
