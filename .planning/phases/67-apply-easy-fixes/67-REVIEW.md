---
phase: 67-apply-easy-fixes
reviewed: 2026-08-19T15:46:45Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - bbj-vscode/src/decompile-io.ts
  - bbj-vscode/src/document-formatter.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/assertions.ts
  - bbj-vscode/src/language/bbj-completion-provider.ts
  - bbj-vscode/src/language/bbj-cpl-parser.ts
  - bbj-vscode/src/language/bbj-cpl-service.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-document-symbol-provider.ts
  - bbj-vscode/src/language/bbj-lexer.ts
  - bbj-vscode/src/language/bbj-linker.ts
  - bbj-vscode/src/language/bbj-token-builder.ts
  - bbj-vscode/src/language/bbj-type-inferer.ts
  - bbj-vscode/src/language/bbj-validator.ts
  - bbj-vscode/src/language/bbj-value-converter.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/lib/events.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/language/validations/check-variable-scoping.ts
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - .github/workflows/build.yml
  - .github/workflows/pr-validation.yml
  - bbj-vscode/package.json
  - bbj-vscode/bbj-language-configuration.json
  - bbj-vscode/syntaxes/bbj.tmLanguage.json
  - bbj-vscode/vitest.config.ts
  - CLAUDE.md
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found (1 critical, 6 warning)
---

# Phase 67: Code Review Report

**Reviewed:** 2026-08-19T15:46:45Z
**Depth:** standard
**Files Reviewed:** 33 source files (plus 24 test files reviewed for test quality) — diff range `47bb785..HEAD`
**Status:** issues_found

## Summary

Phase 67 applied 73 mechanically-derived "easy fix" edits from six prior review passes. The large
majority of the diff is small, well-scoped, and verifiably faithful to its stated intent — the
extraction refactors (`bbj-linker.ts`, `bbj-token-builder.ts`, `main.ts`, `bbj-document-symbol-provider.ts`),
the dead-code deletions (`assertions.ts`, `bbj-validator.ts::checkClassReference`), and the small
defensive-default fixes (`bbj-cpl-parser.ts`, `bbj-value-converter.ts`) all check out against their
regression tests and against direct code reading.

The findings below cluster around the harder concurrency/timing fixes the phase's own
`<areas_of_particular_interest>` flagged as needing a second look, and one pre-existing, explicitly
deferred security exposure that the phase's own `500001d` commit pins rather than fixes (per its
own design — it is reported here at correct severity per this review's instructions, not as a
phase-67 regression).

One Critical finding: an unvalidated, workspace-settable `bbj.home` path is used to build a binary
path that is `spawn()`-ed automatically (no explicit user action beyond opening/trusting the
workspace and editing a `.bbj` file) — a known, accepted-and-deferred exposure (P61-D1-003, routed
to Phase 68) that is nonetheless real and worth flagging at its true severity.

Six Warnings: two genuine (if narrow-trigger) concurrency bugs introduced by the new
`java-interop.ts` connection-lifecycle and LRU-cache fixes; a cancellation-token field that is
shared mutable state instead of being threaded per-request in `bbj-completion-provider.ts`; a
lexer regex change that silently widens what counts as a line break; a stale-content risk in the
new shared in-flight format promise; and a filesystem-mtime-granularity assumption in the
`decompile-io.ts` freshness gate that the fix's own regression test brushes up against without
fully protecting.

Four Info-level items: minor code-quality/robustness nits, none behavior-affecting.

## Critical Issues

### CR-01: Unvalidated, workspace-settable `bbj.home` drives an automatically-spawned binary path

**File:** `bbj-vscode/src/language/bbj-cpl-service.ts:230-236` (spawn site: `bbj-cpl-service.ts:140`,
auto-trigger: `bbj-vscode/src/language/bbj-document-builder.ts:117`); setting definition:
`bbj-vscode/package.json:341-349`

**Issue:** `getBbjcplPath()` builds `path.join(bbjHome, 'bin', binaryName)` directly from
`this.wsManager.getBBjDir()`, which is populated from `vscode.workspace.getConfiguration("bbj").get("home")`
(`bbj-vscode/src/extension.ts:870`). `bbj.home` is declared `"scope": "window"` in `package.json`,
meaning it is settable from a repository's own `.vscode/settings.json` — i.e. by whoever controls
the repository content, not only the user's own machine-level VS Code settings. No validation is
performed on the resulting path or on the binary found there (no signature/checksum check, no
restriction to a known-good directory, no confirmation prompt) before `child_process.spawn(bbjcplBin, ['-N', filePath])`
executes it (`bbj-cpl-service.ts:140`).

Critically, this is not gated behind an explicit user action like "Run compile": `debouncedCompile()`
in `bbj-document-builder.ts:117` calls this path automatically as part of the language server's
normal document-build/validation cycle, i.e. simply opening a trusted workspace that contains a
`.bbj` file (or editing one) is enough to trigger the spawn — no menu command, no button.

A malicious repository can therefore ship a `.vscode/settings.json` setting `bbj.home` to a path
inside the repo (or elsewhere writable by the checkout) containing a `bin/bbjcpl` (or
`bin/bbjcpl.exe` on Windows) executable of the attacker's choosing. Any victim who opens that
repository in VS Code with this extension installed, and trusts the workspace (VS Code's Workspace
Trust prompt — this extension does not declare an `untrustedWorkspaces` capability in
`package.json`, so its exact behavior in a *restricted* workspace could not be confirmed from the
source alone), gets that binary executed under their own OS account the moment the language
server's build/validate cycle runs against any `.bbj` file — which happens automatically.

This exposure pre-dates Phase 67 and Phase 67 explicitly did not fix it: commit `500001d`
(`P61-D5-005`, `test/cpl-service.test.ts`) deliberately adds a *characterization* test pinning this
exact unvalidated-spawn behavior, with the underlying fix (`P61-D1-003`) classified
major-refactor and routed to Phase 68. That routing decision is reasonable engineering process, but
the exposure itself is real today and is reported here at its correct severity per this review's
explicit instructions, independent of its "queued for later" status.

**Fix:** Not a phase-67 fix — flagging for Phase 68 (`P61-D1-003`) to prioritize appropriately.
Candidate mitigations: validate `bbjHome` resolves to a path outside the open workspace folder(s)
(or require it to match a user-level/machine-scoped setting, not a workspace-overridable one — i.e.
change `bbj.home`'s `scope` to `"machine"` or `"application"` in `package.json` so a repo's own
`.vscode/settings.json` cannot set it), and/or declare
`"capabilities": {"untrustedWorkspaces": {"supported": false}}` in `package.json` so VS Code
explicitly disables the extension until the user has affirmatively trusted the workspace.

## Warnings

### WR-01: LRU cache can evict a class registration still needed by its own in-flight cyclic resolution

> **Disposition (Phase 67 UAT):** deferred — filed as [#497](https://github.com/BBx-Kitchen/bbj-language-server/issues/497) (`bug`, `vscode`, `PRIO 2`, `8`). Design decision + hard-to-construct regression test; out of scope for a low-risk fix pass.

**File:** `bbj-vscode/src/language/java-interop.ts:36-64` (`LruMap`), `:698-705` (`resolveClass`'s
early registration), `:544-556` (`resolveClassByName`'s fast-path/pending-dedup)

**Issue:** `P61-D3-001`'s new `LruMap` (bounded to `RESOLVED_CLASSES_CACHE_LIMIT = 5000`) replaced
the previously-unbounded `_resolvedClasses` map. `resolveClass()` still registers a class into
`resolvedClasses` *before* recursing into its member types (`java-interop.ts:705`), with the
adjacent comment explicitly stating this ordering is required because "the fast-path check in
`resolveClassByName` and the re-entry guard in `resolveClass` both depend on this entry existing."
That invariant is no longer guaranteed: if enough *other* classes are resolved and `.set()` into the
same `LruMap` during this class's own Phase 2 (async) recursion — plausible for a broad `use`/auto-import
or `loadImplicitImports()` resolution chain touching thousands of related types within
`MAX_RESOLUTION_DEPTH = 50` levels — the entry for the class currently being resolved can be
evicted as least-recently-used before its own recursion completes.

If that class also participates in a reference cycle (common in real JDK classpaths, e.g.
`Object`↔`Class`), the recursive lookback into `resolveClassByName(className)` then misses the
`resolvedClasses.has()` fast path (line 547) and instead hits `_pendingResolutions.get(className)`
(line 553), returning the *same* outer promise this very call is nested inside of — i.e. the
recursive await now depends on its own outer resolution completing. This does not hang forever
(the outer `doResolveClassByName`'s own `Promise.race` against `RESOLUTION_TIMEOUT_MS` — 30s —
eventually settles and returns a stub via the `catch` branch at `java-interop.ts` around line
590), but it does mean: (a) a ~30s stall for that resolution instead of an immediate cache hit, and
(b) the caller silently receives a `createStubClass()` stub (with `error: 'Resolution failed or
depth limit exceeded'`) instead of the correctly resolved class, potentially producing spurious
"unresolved type" diagnostics for a class that genuinely does resolve.

`test/java-interop-service.test.ts`'s own LRU regression test (`_resolvedClasses is bounded by an
LRU size cap`) only resolves `CACHE_LIMIT + 1` *independent* classes concurrently via
`Promise.all` — it does not exercise a self-referential/cyclic resolution racing its own eviction,
so this gap is untested.

**Fix:** Either (a) pin the currently-resolving class's cache entry for the duration of its own
Phase 2 recursion (e.g. track a small "protected" set of in-flight class names that `LruMap.set()`
must never evict), or (b) have the recursive fast-path in `resolveClassByName` also check whether
`className` equals any name currently in `_pendingResolutions` *and* is the same top-level chain
(not just "some" pending promise) before falling back to await-self.

### WR-02: Stale `connection.onClose`/`onError` listener can clobber a newer, healthy connection

> **Disposition (Phase 67 UAT):** fixed in-phase (commit `8194248`) — identity guard on both listeners, with a regression test verified to fail against the un-fixed code.

**File:** `bbj-vscode/src/language/java-interop.ts:134-135`

**Issue:**
```ts
connection.onClose(() => { this.connection = undefined; });
connection.onError(() => { this.connection = undefined; });
```
These listeners unconditionally clear `this.connection`, without checking that the closing/erroring
`connection` is still the one currently referenced by `this.connection`. If an old connection's
`close`/`error` event is delivered *after* `connect()` has already been called again and
successfully established a new connection (e.g. the old socket's teardown is asynchronous and
races a fresh reconnect triggered by a caller that observed the drop through some other path, such
as a failed `sendRequest`), the stale event's handler will wipe out the perfectly healthy new
`this.connection` reference, forcing an unnecessary reconnect on the next call and potentially
discarding in-flight state tied to the (still valid) connection object.

**Fix:** Capture identity and guard the assignment:
```ts
connection.onClose(() => { if (this.connection === connection) this.connection = undefined; });
connection.onError(() => { if (this.connection === connection) this.connection = undefined; });
```

### WR-03: `activeCancelToken` is shared mutable instance state, not threaded per-request

> **Disposition (Phase 67 UAT):** deferred — filed as [#498](https://github.com/BBx-Kitchen/bbj-language-server/issues/498) (`bug`, `vscode`, `PRIO 2`, `4`). Architectural change to a singleton service.

**File:** `bbj-vscode/src/language/bbj-completion-provider.ts:59` (field), `:247` (write in
`getCompletion`), `:102` (read in `completionForCrossReference`)

**Issue:** `getCompletion()` sets `this.activeCancelToken = cancelToken` at its start
(`bbj-completion-provider.ts:247`), and `completionForCrossReference` — invoked deep inside the
base Langium completion engine without a token parameter in its own signature — reads
`this.activeCancelToken` (line 102) to pass into `completeAutoImportClasses`. Because
`BBjCompletionProvider` is a shared, singleton Langium service (not one instance per request), and
LSP completion requests for *different open documents* can legitimately be in flight concurrently
on the same connection, a second `getCompletion()` call overwrites `this.activeCancelToken` while
the first request's own (deeper, still-executing) `completionForCrossReference` call has not yet
read it. The first request's auto-import-completion branch can then observe the *second* request's
cancellation token instead of its own — either wasting work if the wrong token is non-cancelled
when it should be, or (more concerning) silently returning an empty/partial completion result for a
request that was never actually cancelled, if the concurrently-arriving second request's token
happens to already be cancelled.

**Fix:** Thread the token explicitly through the completion engine's own extension points (Langium
lets `completionFor`/`completionForCrossReference` overrides carry request-scoped closures) rather
than via an instance field, or at minimum snapshot/restore the field around the awaited section so a
nested concurrent call cannot observe a value written by an unrelated request.

### WR-04: Lexer's EOL-preserving split also splits on bare `\r`, changing continuation-detection input beyond what was tested

> **Disposition (Phase 67 UAT):** fixed in-phase (commit `8194248`) — split narrowed back to `/(\r\n|\n)/`, with a regression test verified to fail against the un-fixed code.

**File:** `bbj-vscode/src/language/bbj-lexer.ts:15` (vs. prior `text.split(/\r?\n/g)`)

**Issue:** The old splitter `/\r?\n/g` only ever split on `\n` (optionally preceded by `\r`) — a
lone `\r` not followed by `\n` was left embedded as a literal character inside whatever "line" it
appeared in. The new capturing split `/(\r\n|\r|\n)/` additionally splits on a bare `\r`. This is a
behavior change beyond the stated fix (preserving each line's own EOL for mixed CRLF/LF files):
content containing a stray `\r` not part of `\r\n` is now treated as an additional line boundary
that feeds into the colon-continuation-detection loop (`bbj-lexer.ts:24-43`, which inspects
`nextLine.charAt(0) === ':'` per "line"). A `\r` appearing mid-content would now split what used to
be one array entry into two, changing what the continuation logic sees as line 0/1 boundaries for
that content. `test/lexer.test.ts`'s two new `P61-D2-006` cases cover only "mixed CRLF/LF" and
"single-EOL-style" inputs — neither exercises a lone `\r`, so this widened-splitting behavior is
unverified either way.

**Fix:** If lone-`\r` splitting is intentional (old-Mac-style line endings), state that explicitly
and add a test; if it's incidental to reaching for a "capture the delimiter" regex, narrow the
pattern back to `/(\r\n|\n)/` to preserve the prior splitting semantics exactly, per the fix's own
stated scope ("mixed CRLF/LF").

### WR-05: Shared in-flight format promise can apply a stale full-document replacement

> **Disposition (Phase 67 UAT):** deferred — filed as [#499](https://github.com/BBx-Kitchen/bbj-language-server/issues/499) (`bug`, `vscode`, `PRIO 3`, `2`). Requires an explicit guard-or-document decision.

**File:** `bbj-vscode/src/document-formatter.ts:38-53`

**Issue:** `provideDocumentFormattingEdits` computes `documentContent` fresh on every call
(line 40), but if another format request for the *same* `document.uri` is already in flight, the
freshly-read `documentContent` is discarded — the caller instead reuses the earlier request's
`formatPromise`, which resolves with output computed from the *earlier* request's captured content
only (`document-formatter.ts:44-53`). The resulting `vscode.TextEdit` is a full-document
replacement (`new vscode.Range(0, 0, document.lineCount, 0)` — read at *resolution* time, i.e. the
then-current document extent) applied with the *first* request's formatted content. If the document
was edited between the first request's start and the second request's issuance (e.g. a manual
"Format Document" racing an autosave-triggered format-on-save for the same file), the second
request silently applies formatting computed from stale content over the current buffer, discarding
the interim edit when the edit is applied. The map-identity guard
(`inFlightFormats.get(uriKey) === formatPromise`) correctly prevents map corruption/URI poisoning
(the concern this fix explicitly set out to address), but does not address this separate,
content-staleness risk that the sharing itself introduces. No test in
`test/document-formatter.test.ts` exercises overlapping requests whose captured content actually
differs.

**Fix:** Either compare the freshly-read `documentContent` against what the in-flight promise was
started with and bypass sharing on a mismatch, or accept the risk explicitly (document it) given the
narrow trigger window — but the current code neither guards against nor documents this trade-off.

### WR-06: `.lst` freshness gate is vulnerable to filesystem mtime-granularity truncation

> **Disposition (Phase 67 UAT):** deferred — filed as [#500](https://github.com/BBx-Kitchen/bbj-language-server/issues/500) (`bug`, `vscode`, `PRIO 2`, `4`). Highest user impact of the six; needs a slack value + mtime-independent test strategy.

**File:** `bbj-vscode/src/decompile-io.ts:69-90`

**Issue:** The `P62-D2-011` fix requires `lstStat.mtimeMs >= callStartMs` (line 88) in addition to
size-settling, to reject a stale pre-existing `.lst`. `callStartMs = Date.now()` has millisecond
resolution, but `fs.Stats.mtimeMs` reflects whatever resolution the underlying filesystem actually
stores (commonly truncated to whole seconds on FAT/exFAT, historically HFS+, and some
network/overlay filesystems). If a genuinely fresh write lands within the same truncation bucket as
`callStartMs` (very plausible for a fast bbjlst run completing in well under a second — the added
regression test's own fresh-write happens only 45ms after the call starts), the stored mtime can
round down to a value *less than* `callStartMs` even though the write is real and happened after
the call started. Because `lastLstSize` and the truncated `mtimeMs` then stay constant across every
subsequent poll, the `mtimeMs >= callStartMs` check never becomes true, and `waitForDecompileOutput`
spins until the full `timeoutMs` (default 20000ms) elapses and then throws — even though the
correct output was ready almost immediately. This converts what should be a fast, reliable
operation into a systematic ~20s failure on any filesystem with coarse mtime resolution. The
regression test added alongside this fix (`test/decompile-io.test.ts`, `P62-D2-011` describe block)
explicitly calls out "filesystem mtime rounding" as a hazard for the *stale*-file case (hence its
100ms real sleep before writing the stale fixture) but does not give the *fresh*-write case (only
45ms after call start) the same protection — so the test itself would be susceptible to the same
class of flakiness this finding describes, on a coarse-mtime filesystem.

**Fix:** Add slack to the comparison (e.g. `mtimeMs >= callStartMs - GRANULARITY_SLACK_MS` with a
slack on the order of 1-2s), or fall back to a purely size-settling check when the filesystem's
mtime resolution can't be determined to be fine-grained enough to trust.

## Info

### IN-01: Redundant if/else with identical branches in the formatter's spawn error handler

**File:** `bbj-vscode/src/document-formatter.ts:86-92`

**Issue:** `P62-D2-010`'s fix correctly makes every spawn error settle the promise, but leaves the
original `if (ENOENT) {...}` conditional in place with an `else` branch that does the exact same
thing (`return reject(err);` either way):
```ts
p.on('error', (err) => {
  if (err && (err as any).code === 'ENOENT') {
    return reject(err);
  } else {
    return reject(err);
  }
});
```
**Fix:** Simplify to `p.on('error', (err) => reject(err));` — the conditional no longer distinguishes
any behavior.

### IN-02: Verbose, repetition-prone manual iterator-advance pattern

**File:** `bbj-vscode/src/language/validations/check-variable-scoping.ts:208-282`

**Issue:** The `P61-D2-010` fix correctly switches to `contentsIterator.prune()` to stop descending
into excluded subtrees, but does so by replacing a `for...of` loop with a manual
`while (!contentsResult.done)` loop that repeats `contentsResult = contentsIterator.next();` before
every one of its nine `continue` sites. This is currently correct (every exit path does advance the
iterator), but it's a fragile pattern going forward — a future added `continue` that forgets the
`next()` call would infinite-loop rather than fail loudly.

**Fix:** Consider a small helper that returns/advances in one step, or restructure the per-node body
into a function called from a simpler loop, to remove the need to repeat the advance call at every
branch.

### IN-03: TextMate `IOL=`/`LEN=` right-context restriction removed entirely, not narrowed

**File:** `bbj-vscode/syntaxes/bbj.tmLanguage.json:15`

**Issue:** `P62-D2-009` dropped the trailing `\B` after `([iI][oO][lL]=|[lL][eE][nN]=)` to fix the
case where a value is directly attached (`IOL=5`), which the old `\B` incorrectly excluded. Removing
`\B` entirely (rather than replacing it with something that still restricts *some* right contexts)
means `LEN=`/`IOL=` now scope as `keyword.control.bbj` regardless of what follows — e.g. a
hypothetical `X.LEN=5` (property/member-style access, if such a construct exists or is ever added)
would also be highlighted as the keyword. This is unverified either way (no test covers this shape,
and it's unclear whether such a construct is legal BBj), so it's flagged as a possible but unconfirmed
scope-leakage risk rather than a confirmed defect.

**Fix:** If a member-style `X.LEN=`/`X.IOL=` construct is not legal BBj syntax, no action needed;
otherwise consider a negative lookbehind for `.` before the `\b` anchor.

### IN-04: `BbjNodeDownloader`'s extracted `fileName` derived by round-tripping the constructed URL

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:103-107`

**Issue:** The `P61-D4-...`-style extraction (`buildDownloadUrl`) now computes `fileName` in the
caller by slicing the *already-built* `downloadUrl` string (`lastIndexOf('/') + 1` to
`length - extension.length()`), rather than having `buildDownloadUrl` (or a sibling helper) return
the filename directly. Behaviorally correct today, but an indirect, string-surgery-based derivation
that's easy to break if `DOWNLOAD_BASE_URL`'s format ever changes.

**Fix:** Have `buildDownloadUrl` return both the filename and the URL (e.g. a small record/pair), or
expose a separate `buildFileName(Platform)` helper, instead of parsing the filename back out of the
URL string.

---

_Reviewed: 2026-08-19T15:46:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
