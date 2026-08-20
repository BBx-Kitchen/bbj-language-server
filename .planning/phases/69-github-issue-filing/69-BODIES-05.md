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
