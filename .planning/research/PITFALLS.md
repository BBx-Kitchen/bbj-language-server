# Pitfalls Research

**Domain:** Adding bbj-ls `formatProgram` / `denumProgram` (LSP formatting, range formatting, DENUM command) to a shipped Langium language server with two live clients (VS Code `vscode-languageclient` 10.1.2 and IntelliJ LSP4IJ 0.21.0), replacing a vendored formatter jar and the `bbjlst` denumber path
**Researched:** 2026-10-01
**Confidence:** HIGH for everything grounded in this repo's source and the live probe below; MEDIUM for LSP4IJ and VS Code client behaviour (GitHub issues and docs, not re-verified against 0.21.0 or the current VS Code build); LOW items are tagged inline.

Milestone: v4.9 bbj-ls DENUM & Format Migration. Spec: `/home/coder/repos/bbj-ls/README.md` (method contracts, error codes -33001..-33009, -32800 supersession).

## Evidence base (read this first)

Besides reading the code, one probe was run on 2026-10-01 against the live `:5008` peer in this dev container (shipped `bbj-ls.jar`, 284297 bytes, built 2026-09-30, which already serves `formatProgram`/`denumProgram`). Findings marked **[LIVE]** below come from it (HIGH confidence, reproducible with plain Content-Length-framed JSON-RPC):

| Probe | Result |
|-------|--------|
| `settings: {splitSingleLineIF: true}` (the OLD key spelling) | `-33007`, message lists the 15 allowed keys; the rename is a hard error, not a no-op |
| `indentWidth: 2.5`, `eolCharacter: null` | `-33007` with `data: [{setting, message}, ...]`, one entry per bad key |
| numbered source, `allowDenum` absent | `-33006` |
| numbered source, `allowDenum: true` | formatted text returned, `denumbered: true`, line numbers became labels (`L10:`) |
| mixed numbering, `allowDenum: true` | `-33008`, `data: {line: 2}` |
| range request on numbered source, `allowDenum: true` | `-33006` (a range never DENUMs) |
| range request on unnumbered source containing `é😀` | one `edits[0]` with LSP 0-based range, UTF-16 columns, `text` absent |
| text starting `<<bbj>>` (tokenized) | `-33009` (generic "engine failed" code, only the message says tokenized) |
| unknown method | `-32601` "Unsupported request method" |
| two whole-document requests, same `canonicalName`, sent back to back | first answered `-32800`, second succeeded |
| a whole-document request followed by a RANGE request, same `canonicalName` | the WHOLE-document request got `-32800`; a range request supersedes a whole-document request |
| latency | ~4 ms warm for a tiny file, ~42-45 ms floor seen on most calls, 42 KB in 55 ms, 560 KB in 210 ms |

Phase vocabulary used in "Phase to address" (suggested; the roadmapper may rename or merge):

- **Interop client** - `formatProgram`/`denumProgram` request plumbing in `java-interop-connection.ts`, lane choice, typed error taxonomy, per-method capability latch
- **LS formatting service** - the language-server `Formatter`, its handler, diff, guards, settings intake, VS Code provider swap, IntelliJ gate
- **DENUM command** - `bbj.denumber` rewire, open-file prompt, DENUM diagnostics, apply path
- **Settings** - 15 keys in both IDEs, migration of the existing four
- **Cut-over removal** - jar, verifier, resolver, tests, docs, QA, SBOM fallout
- **IntelliJ evaluation** - the LSP4IJ evaluation and the supported/disabled decision
- **Docs and QA** - user guides, QA checklists, CLAUDE.md

## Critical Pitfalls

### Pitfall 1: Langium's stock formatting handler waits for the whole workspace, and loads the document from disk

**What goes wrong:**
Registering a `lsp.Formatter` service makes Langium's `startLanguageServer` install its default `connection.onDocumentFormatting` handler. That handler (`createRequestHandler` in `langium/lib/lsp/language-server.js`) first awaits `workspaceManager.ready` and `documentBuilder.waitUntil(DocumentState.Parsed)`, then calls `documents.getOrCreateDocument(uri)`, which loads a client-supplied URI from disk when the document is not open. Format-on-save right after opening a large workspace therefore queues behind cold workspace initialization (this repo measured 5-66 s for it in v4.5 phase 105). A format request that needs only text is held hostage by linking/indexing.

**Why it happens:**
Langium assumes a formatter works on the AST, so it gates on a built document. A bbj-ls format works on text alone. The repo already hit exactly this for hover, codeAction and codeLens (`main.ts` "Register AFTER startLanguageServer to override Langium's default ... handler", and the comment about IntelliJ's modal "Searching for Context Actions..." dialog freezing the EDT on a request with no timeout of its own).

**How to avoid:**
- Implement the Langium `Formatter` interface directly (do NOT extend `AbstractFormatter`) only so `buildInitializeResult` flips `documentFormattingProvider` and `documentRangeFormattingProvider` to true (Langium 4.3.1 registers no default formatter, so both are `false` today; verified by reading `default-lsp-module.js`).
- Register a bounded handler AFTER `startLanguageServer(shared)`, exactly like `registerBoundedCodeActionHandler` and `registerConfigAwareHoverHandler`: read the live buffer from `shared.workspace.TextDocuments` (never `getOrCreateDocument`), no `workspaceManager.ready` wait, no document-state wait, answers within a named budget.
- `formatOnTypeOptions` must return `undefined` and `formatDocumentOnType` return `[]`, otherwise both clients start sending on-type formatting requests.
- Put the handler in its own module (like `compile-command.ts` / `composer-codelens-handler.ts`) so a test can drive it with plain stubs and no `main.ts` import (the `bbj-notifications.ts` isolation rule).

**Warning signs:**
First format-on-save after window open takes tens of seconds or is cancelled; format works only after the status bar finishes indexing; a unit test needs a built `LangiumDocument` to exercise the handler.

**Phase to address:** LS formatting service

---

### Pitfall 2: Two formatters at once (legacy provider plus LSP), and IntelliJ silently gaining formatting

**What goes wrong:**
(a) `extension.ts` `registerDocumentFormatter` still registers the client-side `registerDocumentFormattingEditProvider("bbj", DocumentFormatter)`. The moment the server advertises `documentFormattingProvider`, `vscode-languageclient` registers a second provider for the same selector. VS Code then shows "multiple formatters, configure a default" for Format Document and for format-on-save, or silently runs the legacy one that spawns Java.
(b) IntelliJ has no formatter today because the server advertised none. LSP4IJ keys formatting purely off server capabilities, so the moment the LS advertises formatting, "Reformat Code", the commit-dialog "Reformat code" option and "Actions on Save > Reformat code" start calling bbj-ls in IntelliJ, before the milestone's evaluation and the user's supported/disabled decision. This repo publishes a preview of BOTH extensions on every push to `main`, so an unevaluated capability reaches the JetBrains Marketplace preview channel.

**Why it happens:**
The capability flip is a server-side change with client-side consequences in two different products.

**How to avoid:**
- Remove the legacy `registerDocumentFormatter` call and `DocumentFormatter` registration in the SAME phase/commit that makes the server advertise formatting. Never ship a state where both exist.
- In the same phase add the IntelliJ gate: `BbjLanguageServerFactory.createClientFeatures()` gets a `.setFormattingFeature(new LSPFormattingFeature() { isEnabled(file) -> false })` (LSP4IJ `LSPFormattingFeature.isEnabled/isSupported` are documented in `LSPApi.md`). Flip it on only after the evaluation phase decides "supported". If the decision is "disabled", the gate is already the implementation.
- Never register a `lang.formatter` (FormattingModelBuilder) for BBj in `plugin.xml`: LSP4IJ's `canFormat` refuses to run when an IDE formatter exists for the language (lsp4ij #388, #424; `isExistingFormatterOverrideable` defaults to `false`).

**Warning signs:**
VS Code "There are multiple formatting providers" prompt; the Java process still spawns on save; `extension-activation.test.ts` still expects `registerDocumentFormattingEditProvider` toHaveBeenCalledTimes(1); "Reformat Code" suddenly enabled in an IntelliJ build nobody evaluated.

**Phase to address:** LS formatting service (swap and gate); IntelliJ evaluation (flip decision)

---

### Pitfall 3: Stale TextEdit applied to a newer buffer (format racing edits and saves)

**What goes wrong:**
The LSP formatting request carries no document version. The server formats version N, the user types (N+1) while the request is in flight, and the response edit (a whole-document or whole-range replace computed against N) lands on N+1, silently overwriting what was just typed. Format-on-save makes this likely: save participants are asynchronous and the editor stays editable while they run.

**Why it happens:**
The legacy provider was safe only because VS Code handed it the exact `TextDocument` object and the extension compared text (issue #499: share an in-flight run only when `content` is identical; an older settle never evicts a newer entry). That protection lived in `document-formatter.ts` and disappears with the cut-over. Whether VS Code or LSP4IJ discard a stale response is client behaviour this repo has not verified (LOW confidence), and `AbstractLSPFormattingService` has no visible stale check.

**How to avoid:**
- In the LS handler capture `textDocuments.get(uri).version` BEFORE sending, send `version: String(version)` and verify the echoed `version` on the result, then re-read the live version AFTER the await. If it moved, return `ResponseError(LSPErrorCodes.ContentModified)` (-32801), which `vscode-languageclient` treats as a silent default for formatting. Never return the edit.
- Compare against the text actually sent, not a re-read buffer: build the diff from the snapshot you sent.
- Keep the #499 semantics at the new seam: coalesce concurrent requests only when (uri, version, serialized settings, range) are identical.
- Port the precedent: `setopts-stale-edit-guard.ts` and IntelliJ's `StaleEditGuard`/`DecodeEquality` already encode "re-confirm the document is still the one the capture described immediately before the write, fail closed".
- Test with the fake peer (`createSocketMessageConnection` seam) delaying its answer while the test sends `didChange`.

**Warning signs:**
Characters typed during a save vanish; a format result applies to a buffer whose version differs from the request's; a test that never changes the document between request and response.

**Phase to address:** LS formatting service (guard); a manual UAT step ("type while a large file formats") in both IDEs

---

### Pitfall 4: Whole-document text converted to one giant TextEdit

**What goes wrong:**
`formatProgram` returns the whole formatted `text` for whole-document requests (`edits` is absent). The legacy provider returned one edit `Range(0,0,lineCount,0)` replacing everything. In an LSP world that causes: caret jump to the end or start; lost folding state, breakpoints and bookmarks (IntelliJ and LSP4IJ apply edits as-is); stale TextMate highlighting after a big replace (lsp4ij #739, open); the buffer marked dirty even when nothing changed; a huge undo entry; slow application on 100k-line files. VS Code mitigates some of this by minimising edits client-side (MEDIUM confidence), IntelliJ does not.

**Why it happens:**
It is the shortest path: `[{range: wholeDoc, newText: result.text}]`.

**How to avoid:**
- Compute a minimal LINE-granular diff server-side (LS side, JS) between the sent text and the returned text. Return `[]` when they are identical, so an unchanged file never dirties the buffer (the README already promises this for range requests: "an unchanged range never dirties the caller's buffer").
- Diff by lines only. Never diff inside a line by code unit: two different astral characters (for example U+1F600 and U+1F601) share a high surrogate, so a common-prefix trim can split a surrogate pair and produce a lone surrogate that becomes U+FFFD on the wire.
- Emit ascending, non-overlapping, non-adjacent edits: merge hunks that touch, and never emit an insert and a replace at the same start position (lsp4ij #1404, "Text edits at the same position are not applied in LSP spec order", closed, fix level in 0.21.0 unverified).
- Use exact, valid end positions (`textDocument.positionAt(text.length)` of the SENT text), never `lineCount, 0` past the end: this repo already learned that an over-range `Position` makes a JVM language client reject the entire message (`parseErrorToRange` comment in `bbj-parser-service.ts`).
- Cap the diff (very large rewrites fall back to one replace of the changed span) so a pathological file cannot make the diff O(n^2).

**Warning signs:**
Caret ends at line 1 after Format Document; undo shows one edit touching every line; `git diff` after format-on-save of an already formatted file; an edit whose `end` is beyond the document; a test asserting `edits.length === 1` for a whole-document format.

**Phase to address:** LS formatting service

---

### Pitfall 5: Line endings: `eolCharacter` KEEP/LF/CRLF in an editor that owns EOL

**What goes wrong:**
`formatProgram` `eolCharacter=KEEP` writes the input's dominant ending (LF on a tie). That is consistent only if what the client sent represents the file's real endings:
- VS Code sends the model text with its single normalized EOL; inserted text is normalized to the model's EOL, so `eolCharacter=CRLF` on an LF model changes nothing visible, while a naive text diff against it marks EVERY line as changed.
- IntelliJ documents are always `\n` internally and store the separator separately. A `\r\n` in a returned `newText` is the open LSP4IJ issue #381 ("When the line ending is CRLF, it cannot be formatted", open): the formatting response is silently not applied.
- A forced `LF`/`CRLF` setting therefore either does nothing, corrupts the diff, or breaks IntelliJ formatting, depending on the editor.

**Why it happens:**
The formatter was designed as a CLI that owns the output bytes; under LSP the editor owns line separators.

**How to avoid:**
- Make an explicit decision and write it down: the LS normalizes the returned text to the EOL of the text it received before diffing (compare lines ignoring terminators), so the diff contains only real changes and `eolCharacter` never produces EOL-only edits.
- Expose `eolCharacter` in settings (milestone requires 15), but document that it cannot change a file's line-ending style under VS Code or IntelliJ (use `files.eol` or the status-bar separator control). Prefer shipping the default `KEEP` and treating `LF`/`CRLF` as "honored only when the editor already agrees".
- Treat lone `CR` input (classic BBj files) as a line break consistently with `vscode-languageserver-textdocument`.
- Test a CRLF document, an LF document and a lone-CR document end to end.

**Warning signs:**
Every format-on-save of a CRLF file reports all lines changed; IntelliJ Reformat Code appears to do nothing on a Windows-line-ending file; the diff helper compares raw strings.

**Phase to address:** LS formatting service (decision and tests); Settings (documentation); IntelliJ evaluation (CRLF case)

---

### Pitfall 6: UTF-16 positions versus UTF-8 sizes and 1-based diagnostics

**What goes wrong:**
Three different units meet in one feature:
- `Range`/`Position` in requests and in `edits` are 0-based with `character` in UTF-16 code units (spec "Conventions"; **[LIVE]** `é😀` round-trips correctly).
- The size limit `bbj.interop.parse.maxBytes` (default 4194304) is in UTF-8 BYTES. A JS `text.length` pre-check under-counts CJK/accented text and the server answers `-33003` anyway.
- `ProgramDiagnostic.line` is 1-based and refers to the DENUMBERED text, with `0` meaning "BBj gave none".

Typical bugs: diffing on `Buffer` offsets or `Array.from` code points (wrong columns after any astral character in a string or REM), subtracting 1 from `line: 0`, publishing DENUM diagnostics against the still-numbered buffer so every squiggle is on the wrong line, a negative line from `Math.max` omitted.

**How to avoid:**
- Do all offset arithmetic in JS string indices with `TextDocument.positionAt/offsetAt` (UTF-16, which is also what LSP4IJ's Java strings use). Do not negotiate or advertise another `positionEncoding`.
- Pre-check size with `Buffer.byteLength(text, 'utf8')` only to produce a friendlier message; always handle `-33003` from the peer too (the cap is server-configurable and unknown to the client).
- Convert `ProgramDiagnostic` with the same clamp discipline as `parseErrorToRange`; map `line === 0` to "no location" (show in the message list only). Surface DENUM diagnostics only after the DENUM text has actually been applied to the buffer, or show them in the result message, never as editor diagnostics on a different text.

**Warning signs:**
Edits off by a few columns on lines containing emoji; `-33003` on a file the client thought was small; diagnostics on line 0 or negative.

**Phase to address:** Interop client (types and size check); LS formatting service (positions); DENUM command (diagnostics)

---

### Pitfall 7: `-32800` supersession shown as an error, and supersession silently losing a format-on-save

**What goes wrong:**
(a) Treating the peer's `-32800` like any other `ResponseError` produces a toast "Request textDocument/formatting failed" or a warn log line on every fast double-save. `bbj-parser-service.ts` already has the right precedent: checked first, `LSPErrorCodes.RequestCancelled` produces no diagnostics change and no log line at any level.
(b) The worse trap: supersession is keyed by `canonicalName` PER METHOD on the connection, so it can cancel a request the user cares about. **[LIVE]** a range `formatProgram` supersedes a pending whole-document `formatProgram` of the same `canonicalName`. Concretely: "Format Selection" or format-on-paste fires while format-on-save is in flight, and the save-time format is cancelled, so the file is saved unformatted. Same for duplicate whole-document requests ("Save All", a manual format racing format-on-save, which is exactly why #499 added coalescing). IntelliJ "Reformat Code > Only VCS changed text" issues one range request per changed hunk for the same file; with a shared `canonicalName` each cancels the previous.

**How to avoid:**
- Map `-32800` (and the `-32800` that means "connection closed while pending") to `ResponseError(RequestCancelled)` toward the client, no toast, no warn, never counted as a failure kind and never fed to any breaker or latch.
- Choose `canonicalName` deliberately: whole-document format = the document path; range format = path plus a suffix that includes the range (for example `path#range:12-30`); DENUM = `null` or its own key. The spec says `canonicalName` "keys supersession only", so a suffix is safe.
- Serialize requests per document inside the LS (a per-URI chain) or coalesce identical ones, instead of relying on the peer cancelling the older request. A request the peer cancelled because a NEWER request for the same URI exists should await that newer request's result and apply it only if it still matches the older request's version; otherwise return `[]`/ContentModified.
- Unit-test with a scripted peer that answers `-32800` for the first of two calls.

**Warning signs:**
"Request textDocument/formatting failed" in the output or toast during fast saves; unformatted files saved under heavy save-all or paste activity; warn lines containing "superseded".

**Phase to address:** Interop client (classification); LS formatting service (canonicalName and serialization)

---

### Pitfall 8: Timeouts blocking the save (three clocks, one of them poisons the connection)

**What goes wrong:**
There are three independent clocks: the client's (VS Code save-participant progress, LSP4IJ's task), the LS's own, and bbj-ls's (`bbj.interop.format.timeoutMs` 10000, `bbj.interop.parse.timeoutMs` 10000 for the DENUM step). Mistakes:
- The legacy code warns "Formatting took too long (>750ms). Format On Save feature could be aborted." That figure is stale: since VS Code 1.42 there is no hard 750 ms abort, save participants show a cancellable progress notification (MEDIUM confidence; the old `editor.formatOnSaveTimeout` setting was removed). Do not port the 750 ms logic.
- LSP4IJ's formatting service has no timeout of its own that I could confirm (the fetched service source shows only a `cancel()` hook), and the repo already documented LSP4IJ waiting on a server reply with no timeout while holding the EDT (codeAction override comment). A handler that can hang can freeze IntelliJ's UI.
- Copying `requestClassInfo`'s `Promise.race(setTimeout 10 s -> InteropTransportError)` pattern abandons the request WITHOUT cancelling it and mislabels a slow format as a transport failure. The spec says a request that "arrived while a previous request on this connection was still overrunning" gets `-33002`, so an abandoned slow format makes every following format fail until the old one finally ends.

**How to avoid:**
- The LS handler has its own named budget, answers `[]` with a one-line non-blocking message on expiry, and propagates the client's `CancellationToken` into `sendRequest(type, params, token)` so vscode-jsonrpc emits `$/cancelRequest`.
- Make the LS-side budget at least the server's (10 s + margin) OR smaller but then ALWAYS cancel; never abandon.
- `-33002` is an application error: log at the existing "warn first, debug repeat" cadence (`logFailure` in `bbj-parser-service.ts`), at most one user message per outage, never a toast per save.
- Drop the 750 ms warning.

**Warning signs:**
After one slow file, every later format fails with `-33002`; IntelliJ UI stalls on Reformat; a toast per save during an outage.

**Phase to address:** Interop client (cancellation, classification); LS formatting service (budget)

---

### Pitfall 9: Format/DENUM traffic coupled to the circuit breaker, the connection generation and the live-parse lane

**What goes wrong:**
`java-interop-connection.ts` has three couplings a new request type can trip:
1. **Breaker**: `connect()` opens the breaker only on a connect-level failure; application errors (`-3300x`, `-32602`, `-32601`, `-32800`) are `ResponseError`s and never reach it. If format code wraps its errors in `InteropTransportError` (as `requestClassInfo` does for its timeout) or catches everything and calls `isInteropTransportFailure`-style handling, a format failure is classified as an outage, suppresses class-resolution caching decisions and can cause popups.
2. **Generation**: `onParseLaneLost` does `this.generation++`, and `resetIfGenerationChanged` in `BBjParserService` then clears EVERY document's verdict state and re-probes. If format/DENUM share the parse lane, any malformed or oversized request that makes the peer drop the socket restarts live diagnostics for the whole workspace.
3. **Worker queue**: per the spec, `denumProgram` and `formatProgram`'s DENUM step run on the connection's PARSER worker, the same one `parseProgram` uses. A slow DENUM (up to 10 s) on the parse lane delays live compiler diagnostics, and a DENUM timeout makes the next parse on that connection answer `-33002`.

**How to avoid:**
- Give format and DENUM their own dedicated lane (a third connection, opened lazily like `parseLane`) with its own retirement bookkeeping that does NOT bump the shared `generation`. Keep the parse lane exclusive to `parseProgram`. If a separate lane is judged too heavy, at minimum route DENUM (never pure format) away from the parse lane.
- Application errors never touch the breaker, the latches of other methods, or the generation. Only connect failures do, via the existing `connect()` path.
- Transport failures on this lane map to one message ("BBj Services not reachable") shown once per outage, not per save; reuse the breaker's single popup per outage (`notifyJavaConnectionError`) instead of adding another.
- Test: a scripted peer that answers `-33009`/`-33002` repeatedly must leave `connectionGeneration`, breaker state and the live-parse latch untouched.

**Warning signs:**
Live compiler diagnostics blink or re-probe after a failed format; class completion degrades after a format failure; `connectionGeneration` changes during a format-only test.

**Phase to address:** Interop client

---

### Pitfall 10: `-32601` on an older BBj read as "interop down" (and per-method availability)

**What goes wrong:**
`formatProgram` and `denumProgram` exist only on BBj 26.03 or later. An older peer answers `-32601`. If the code folds it into "the interop service is unavailable", the user gets the Java-connection popup or a generic failure on every save, and the hard cut-over leaves users with no formatter and no explanation. Related traps: (a) in this dev container `parseProgram` shipped on 2026-09-22/23 and `formatProgram` only on 2026-09-30, so "parseProgram works" does not imply "formatProgram works": a single shared latch is wrong; (b) the in-repo `java-interop/` dev mirror serves none of `parseProgram`, `formatProgram` or `denumProgram` (no match in its sources), so anything run against it gets `-32601`; (c) `-33004` is also "DENUM itself is not available on this BBj", the same user-facing meaning.

**How to avoid:**
- One capability state per method (`formatProgram`, `denumProgram`): `unknown | available | unavailable`, decided by the first real request (the probe-and-latch precedent in `BBjParserService`: no capability request, no version parsing), reset whenever the connection generation of that lane changes (a reconnect after a BBj upgrade must re-probe).
- `-32601` and `-33004` map to a typed outcome `unsupported`, producing the single message "Formatting/DENUM requires BBj 26.03 or later", shown once per session (log afterwards at debug), never a toast per save, never touching the breaker.
- Format-on-save for an unsupported peer returns `[]`; it must not make saves slow (latched `unavailable` skips the round trip until the generation moves).
- Add the fake-peer cases to `JavaInteropTestService` (its `parseProgram` script defaults to `method-not-found`; mirror that scripting for the two new methods) so CI, which has no BBj, covers every outcome.

**Warning signs:**
Java connection popup on a BBj 26.02 install after pressing Format; the same message on every save; a test that only covers the success path; one latch variable named for "endpoint".

**Phase to address:** Interop client; DENUM command (message wording)

---

### Pitfall 11: DENUM replacing a dirty buffer, undo, and the legacy disk-based semantics

**What goes wrong:**
The legacy `bbj.denumber` (`Commands.cjs` `decompileInPlace`) runs `bbjlst` against the FILE ON DISK, `fs.rename`s the result over it and reopens it. It ignores unsaved edits, bypasses undo, and fights the open editor's file watcher. A naive port that calls `denumProgram` on the buffer text and then writes the file, or that replaces the buffer without version checking, inherits the bugs: lost unsaved edits, an unsaveable "file changed on disk" conflict, no undo, or a DENUM result applied to a buffer that changed meanwhile.

Additional traps: `denumbered: false` (already unnumbered) must be a no-op with an informational message, not a rewrite; `Commands.cjs` `decompileInPlace` is shared with tokenized-program decompile, which MUST keep working through `bbjlst` (see Pitfall 17); `denumProgram` on tokenized input fails `-33001`, whereas the old command decompiled-and-denumbered tokenized files; the old path needed only `bbj.home`, the new one needs a running BBjServices on 26.03+.

**How to avoid:**
- DENUM operates on the live buffer text and applies through the client as a versioned `WorkspaceEdit` (`workspace/applyEdit` with `OptionalVersionedTextDocumentIdentifier`), a single undo step, buffer left dirty (the user saves). Never write the file from the server or the extension.
- Capture version and text before the request, re-check immediately before applying, refuse with "the document changed, nothing was changed, run again" (the wording pattern of `setopts-stale-edit-guard.ts`).
- Branch on content: tokenized (binary header) goes to the existing decompile path; text goes to `denumProgram`.
- `canonicalName` for DENUM: `null` (never supersedes, never superseded) unless a concrete reason exists.
- Surface the diagnostics from DENUM's compile step (`ProgramDiagnostic`, severity ERROR still counts as success) in the result message; note `originalLineNumber`.
- State clearly in prompt and docs that "Denumber & Replace" now edits the open buffer and does not save it.

**Warning signs:**
`fs.rename`/`writeFile` anywhere in the new DENUM path; the command works only on saved files; DENUM of a tokenized file errors where it used to work; no undo entry after DENUM.

**Phase to address:** DENUM command

---

### Pitfall 12: Numbered files and format-on-save (silent rewrite, prompt storms, mismatched definitions)

**What goes wrong:**
- Sending `allowDenum: true` from format-on-save would silently turn every line number into a label (**[LIVE]** `0010 print 1` became `print 1`, `goto 0010` became `goto L10` with `L10:`), an irreversible-in-practice semantic change for a legacy program, on every save.
- With `allowDenum` absent, each format of a numbered file returns `-33006`; with format-on-save on, a prompt per save (and per paste when `editor.formatOnPaste` issues range requests, which are ALWAYS `-33006` on numbered source).
- Mixed numbering (`-33008`, `data.line`) deserves the offending line, but the open-file prompt's client heuristic (`line-numbering.ts` `isLineNumberedSource`: uniform numbering across the first 20 non-blank lines, otherwise false) and the server's `LineNumbering` (NUMBERED / UNNUMBERED / MIXED, continuation-aware) disagree on exactly those files, so the prompt never fires and the format then reports DENUM-needed or mixed.
- Awaiting a `window/showMessageRequest` inside the format handler blocks the save on a human, and an IntelliJ balloon that is dismissed or expires can leave that promise pending forever.

**How to avoid:**
- Default `allowDenum: false` for LS-triggered formatting. DENUM only through the explicit command or an explicit prompt action.
- On `-33006`: return `[]`, never throw; show ONE non-blocking prompt with a "Denumber" action per document per session (reset on close or after DENUM), fire-and-forget, with a timeout so a never-answered request cannot suppress the prompt forever. Range `-33006` is logged at debug and, at most, shown once.
- On `-33008`: show the message with the line number from `data.line` (and offer "go to line" where the client supports it), never a generic failure.
- Keep `isLineNumberedSource` only as a cheap pre-filter for the open-file prompt, or drop it and ask the server; document that the server's definition wins, and treat `denumbered: false` as "nothing to denumber".

**Warning signs:**
A numbered file changes on save; a prompt on every save or paste; "format failed" for numbered files; a test using only uniformly numbered input.

**Phase to address:** LS formatting service (`-33006` handling); DENUM command (prompt, `-33008`)

---

### Pitfall 13: Settings keys: rename, unknown-key rejection, defaults, nulls

**What goes wrong:**
- `splitSingleLineIF` becomes `splitSingleLineIf`. **[LIVE]** the old spelling is a `-33007` hard error ("unknown setting"), so passing the whole VS Code `bbj.formatter` object through breaks formatting for every user who has the old key.
- `vscode.workspace.getConfiguration` returns keys users set even when no longer registered, so after the cut-over `bbj.formatter.javaPath` (removed) and the old `splitSingleLineIF` would be in the object a pass-through sends. `bbj-vscode/src/config-path-trust.ts` already forwards the WHOLE `bbj` section (`gatedBbjSettings`) to the server, so the LS receives them.
- Renaming the VS Code key silently drops users' existing value; the old and new keys differ only by case (confusing in the Settings UI, legal in JSON).
- Type strictness: `indentWidth: 2.5` and a JSON `null` for an enum are both `-33007` (**[LIVE]**). IntelliJ text fields can yield `null` or blanks.
- Default drift: the extension defaults `indentWidth` to 2; the engine's own default is 4. Omitting unset keys changes behaviour for every user and again whenever bbj-ls changes a default.

**How to avoid:**
- One whitelist in the LS: exactly the 15 spec keys, each coerced to its type (`indentWidth` integer clamped 0-16, booleans strictly boolean, enums uppercased from a fixed set). Build the `settings` object key by key; never spread or forward a client section.
- Send ALL 15 explicitly, with the extension's declared defaults, so engine default changes never alter output. Decide `indentWidth` default deliberately (2 for continuity versus the engine's 4) and record it.
- Migration for `splitSingleLineIF`: read the new key; if the user has not set it (`inspect().globalValue/workspaceValue/...` all undefined) fall back to the old key's value; keep the old key declared with `deprecationMessage` (and the docs mapping) for at least one release. A pure rename with no shim is a silent regression.
- `-33007` handling: it carries `data: [{setting, message}]`. Show each key and its message once (a single message, "Fix in settings" action), not per save, and fall back to formatting with defaults is NOT acceptable (it hides the misconfiguration).
- Remove `bbj.formatter.javaPath` from `package.json`, docs and the machine-scope trust paragraph in `configuration.md`; users' leftover value shows VS Code's "unknown setting" hint, note it in the changelog.

**Warning signs:**
`-33007` in the log naming `splitSingleLineIF` or `javaPath`; a code path that does `config.formatter` -> `settings`; formatting output changing with no settings change after an engine bump.

**Phase to address:** Settings (whitelist, defaults, migration); Cut-over removal (`javaPath`)

---

### Pitfall 14: The IntelliJ settings channel is initialization-only

**What goes wrong:**
VS Code pushes settings through `didChangeConfiguration` (and initializationOptions). IntelliJ does not: `CompilerInitOptions` documents that LSP4IJ's settings push is "never wired for BBj settings" and its `workspace/configuration` pull for section `bbj` returns null against the plugin's flat `createSettings()` object. The only channel that reaches the server is flat `initializationOptions` built in `BbjLanguageServerFactory`, so changes apply after a restart. An LS that reads formatter settings per request through `connection.workspace.getConfiguration('bbj.formatter')` works in VS Code and returns nothing in IntelliJ, silently formatting with defaults. Also LSP4IJ sends the IDE's `tabSize`/`insertSpaces` (Code Style > Other File Types) in every formatting request (lsp4ij #1323), and VS Code sends `editor.tabSize`/`insertSpaces`; these will not match `bbj.formatter.indentWidth`.

**How to avoid:**
- The LS holds ONE settings holder fed by both paths: initializationOptions (flat keys, as `compilerTrigger` is) and `didChangeConfiguration` (VS Code). Never pull per request.
- Add the 15 values as persisted state, UI and `initializationOptions` entries in the plugin (the `CompilerInitOptions` seam pattern: a plain-Java normalizer with JUnit tests, no platform dependency). A settings change restarts the server through the existing settings-apply restart; state this in the UI text and docs.
- Decide that `bbj.formatter.*` always wins over the request's `FormattingOptions` (ignore `options.tabSize/insertSpaces`) and say so in the docs; do not try to merge them.
- A contract test on each side that lists the 15 keys: the TS whitelist and the Java normalizer must agree, as `ComposerRequestContractTest` does for request names.

**Warning signs:**
IntelliJ format output ignores a changed setting until a manual restart; settings differ between IDEs for the same values; the LS code calls `getConfiguration` inside the format handler.

**Phase to address:** Settings

---

### Pitfall 15: IntelliJ LSP4IJ formatting quirks (evaluation checklist, not assumptions)

**What goes wrong / what the evidence says (MEDIUM, from LSP4IJ issues and docs, not re-run on 0.21.0):**
- `LSPFormattingAndRangeBothService` is used when the server supports both; range support is read from the server capability (`isRangeFormattingSupported`). Our server advertises both, so selection formatting goes to `rangeFormatting`.
- There is no LSP4IJ "format on save" API. Format on save in IntelliJ is the IDE's "Actions on Save > Reformat code" (and the commit-dialog reformat option), which drives the same service. Open issue lsp4ij #1647: commit-time reformat "can't be filtered by file type" for files LSP4IJ maps. That means the formatter will also run for the "BBx Config" file type, which `plugin.xml` maps to the same server with `languageId=bbx-config`.
- Open issues: #381 CRLF files are not formatted (Pitfall 5), #739 stale syntax highlighting after formatting, #747 no format-on-paste.
- `canFormat` refuses when an IDE `FormattingModelBuilder` exists (Pitfall 2). The plugin registers `BbjLanguageCodeStyleSettingsProvider` and a minimal `lang.parserDefinition`, neither of which is a formatter, but any future `lang.formatter` kills LSP formatting.
- TextMate-highlighted custom file types are supported by the LSP4IJ file mapping used by this plugin; whether `Reformat Code` is enabled for `.bbj/.bbjt/.src/.bbx` is exactly what the evaluation must observe, not assume.
- `window/showMessageRequest` actions, `workspace/applyEdit` with versions, and error-response rendering in IntelliJ are unverified for this plugin; the DENUM-needed prompt and DENUM apply path depend on them.

**How to avoid:**
Make the evaluation a written, executable checklist (whole document, range, Only-VCS-changed-text, format on save, commit reformat, CRLF file, config file, numbered file with DENUM-needed, tokenized file, settings change) run on the built plugin zip from the final tree (UAT rule: build both extensions first), with real `idea.log`/LSP console traces rather than hand-derived sequences (the 97-02 crash-detection UAT was approved on a wrong hand-derived trace and reverted). Keep the formatting gate OFF until the checklist passes and the user decides.

**Warning signs:**
"Works in VS Code" taken as evidence for IntelliJ; no CRLF, config-file or commit-time case in the evaluation; the decision made from a single manual Reformat Code on a small LF file.

**Phase to address:** IntelliJ evaluation (with the gate from LS formatting service)

---

### Pitfall 16: Format requests for documents that are not BBj source

**What goes wrong:**
The VS Code `documentSelector` is `[{scheme:'file', language:'bbj'}, {scheme:'file', language:'bbx-config'}]` and IntelliJ maps both "BBj" and "BBx Config" to the server. `vscode-languageclient` registers the formatting provider for every selector entry, so Format Document or format-on-save on `config.bbx` sends a formatting request, and a handler that treats every request as BBj source would run `formatProgram` over the config file and rewrite it (or reject it noisily). Other non-source inputs: tokenized programs (text starting `<<bbj>>`; **[LIVE]** `-33009`, a code whose name says "engine failed" while the message says tokenized), empty or read-only decompiled copies. Conversely, untitled and non-`file` scheme BBj documents lose formatting: the old provider registered for language `bbj` on every scheme, the LSP provider only for `scheme:'file'`.

**How to avoid:**
- The handler returns `[]` for `languageId === 'bbx-config'` (use the same `TextDocuments.get(uri)?.languageId` check `bbj-document-builder.ts` and `bbj-hover-handler.ts` use) and for text beginning with the `<<bbj>>` marker, without calling the peer.
- Treat `-33009` as "engine failed" only when the message does not say tokenized; otherwise a quiet skip.
- Record the untitled/virtual-scheme regression in the changelog or add the schemes deliberately (it widens what every other feature receives, so it is a separate decision).

**Warning signs:**
`config.bbx` modified by Format Document; a "formatter engine failed" toast on a compiled program; no test with a `bbx-config` document.

**Phase to address:** LS formatting service

---

### Pitfall 17: Removal fallout: the cut-over deletes more than the jar, and one deletion breaks decompile

**What goes wrong:**
"Remove the bbjlst denumber path" is dangerous: `Commands.cjs` `decompileInPlace(..., {denumber: true})` is ALSO the tokenized-decompile path (`decompileReplace` and `decompileReadonly` call it with `denumber: true`), and `process-args.ts` `buildDecompileArgv({denumber})` plus `bbj-home-layout.ts` `'bbjlst'` and the `test/test-data/cpl-fixture-lst-bbjhome/bin/bbjlst` fixture serve it. The milestone keeps tokenized decompile, so only the plain-text denumber command goes. Concrete inventory (all verified present):

- Source to delete: `src/document-formatter.ts`, `src/formatter-verifier.ts`, `src/formatter-java-resolver.ts`, `tools/formatter/` (`BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`, `lib/jcommander-1.71.jar`, `lib/bom.json`, `lib/README.md`).
- Source to edit: `extension.ts` (import, `registerDocumentFormatter`, its call), `package.json` (`bbj.formatter.javaPath`, the `splitSingleLineIF` key, new keys), `Commands.cjs` plain-denumber entry only.
- Tests that must be deleted: `document-formatter.test.ts`, `formatter-verifier-tamper.test.ts`, `formatter-pins-drift.test.ts`, `formatter-java-resolver.test.ts`.
- Tests that must be EDITED, not deleted (they fail on the removed file, not on a feature): `no-shell-command-construction.test.ts` (an exact list of three `child_process` importers `['Commands/process-runner.ts','document-formatter.ts','language/bbj-cpl-service.ts']`, plus four assertions about `document-formatter.ts` and the verifier/resolver imports), `extension-activation.test.ts` (`registerDocumentFormattingEditProvider` toHaveBeenCalledTimes(1)), `activation-command-coverage.test.ts` (expected activation trace contains `'formatter'`), and the `registerDocumentFormattingEditProvider` / `formatter: {}` mock leftovers in about eight activation tests (harmless but dead).
- Docs: `documentation/docs/vscode/configuration.md` (the four `bbj.formatter.*` entries plus the whole `javaPath` section and the machine-scope exception paragraph near line 381, the sample settings block), `commands.md` (the "Formatting runs Java" requirement item and the Denumber section), `features.md` (Code Formatting section), `README.md` ("In VS Code: code formatting ... Denumber"), `CLAUDE.md` (architecture lists), `QA/FULL-TEST-CHECKLIST.md` row 25 "Formatter Java path" (and the formatting/denumber smoke rows).
- Provenance: the SBOM/provenance note in `tools/formatter/lib/README.md` disappears with the folder; DEP-02/#507 (single-line-IF crash) is closed by the move, record that in PROJECT.md rather than leaving a dangling "re-run osv-scanner" instruction. `.vscodeignore` has no formatter entry (the jars shipped in the VSIX), so nothing to remove there, but verify the VSIX contents shrink and nothing loads the path. `pr-validation.yml` watches `bbj-vscode/tools/**`; harmless.
- Leave alone: `process-runner.ts`, `bbj-cpl-service.ts`, `bbj-home-layout.ts` (bbjlst), `decompile-io.ts`, `tokenized-bbj.ts`, `isTokenizedFile`.

**How to avoid:**
Do the removal as its own phase after the LS path has parity and tests, as a checklist-driven change (grep each name above scoped to `bbj-vscode/src`, `bbj-vscode/test`, `documentation/docs`, `QA`, `README.md`, `CLAUDE.md`), then run full lint, `typecheck:test` and `npm test`. A deletion that "passes" because a test mocks the whole module hides a dangling import: run the `npm run build` bundle too.

**Warning signs:**
Decompile & Replace stops working; a test fails with "cannot find module ./formatter-verifier.js"; docs still mention `javaPath`; the VSIX still contains `tools/formatter`.

**Phase to address:** Cut-over removal

---

### Pitfall 18: IntelliJ `ComposerRequestContractTest` and other cross-language gates that vitest cannot see

**What goes wrong:**
`ComposerRequestContractTest` reads a fixed list of `bbj-vscode/src/**.ts` paths and requires every `@JsonRequest` name as a quoted literal; it also pins "the sixteen names". Adding a custom `bbj/denum` request (or moving handlers into a new `format-handler.ts`/`denum-command.ts`) breaks it only under `cd bbj-intellij && ./gradlew test`, which phase gates that run vitest alone never execute (this broke PR #708's `validate-intellij` job after phase 116). The same applies to any IntelliJ-side contract for the new settings keys.

**How to avoid:**
- If IntelliJ needs a DENUM entry point, prefer the LS-driven path (the server shows the `showMessageRequest` prompt and sends `workspace/applyEdit` itself), so no new request name is added to `BbjComposerServer` at all. If a request name is added, add its TS file to the test's path list and the name to `DECLARED_REQUESTS` in the same commit.
- Put `./gradlew test` (needs `bbj-vscode/out/language/main.cjs` first, so `npm run build` before it) into the verification of every phase that touches `main.ts`, request names or the settings keys; compare the test count with CI (1160 on 2026-09-29).
- Never name a planning id (plan number, D-xx, requirement id) in new source or test comments (project convention enforced at phase close); describe behaviour in plain words.

**Warning signs:**
Green vitest and a red `validate-intellij` job on the PR.

**Phase to address:** every phase touching request names or `main.ts`; the final gate in Docs and QA

---

### Pitfall 19: Trusting the peer's response shape

**What goes wrong:**
`text`, `edits` and `diagnostics` arrive from the interop peer. v4.7 hardened Java class data (`java-peer-guard.ts`: bounded, escaped, validated) because a malformed peer answer reached the AST, hover and completion. The same risk exists here: an `edits[0].range` outside the document (a JVM client rejects the whole message, hiding other features' output), a missing `text` on a whole-document result, a `diagnostics` entry with an HTML-ish `message` shown in an IntelliJ balloon, a `text` hundreds of times larger than the request.

**How to avoid:**
Validate on receipt: exactly one of `text`/`edits`; `text` a string no larger than a multiple of the request; `edits` an array of at most a few entries with integer non-negative positions within the sent document; `diagnostics` truncated, control characters stripped, and messages treated as plain text when shown. A malformed result is a `failed` outcome (the `malformed-result` kind already exists in `bbj-parser-service.ts`), never applied.

**Warning signs:**
`result.text.length` used without a type check; an `edits` array passed straight to the client.

**Phase to address:** Interop client (guard); LS formatting service (use)

## Moderate Pitfalls

### Pitfall 20: Hermetic tests that cannot see the real contract

**What goes wrong:**
CI has no BBj and the in-repo `java-interop/` has none of the three methods, so a green suite can still ship a broken contract. `JavaInteropTestService` defaults `parseProgram` to `method-not-found`; the same default for the new methods yields tests that never exercise success paths. Live tests exist only behind `RUN_BBJ_TESTS=1`.

**Prevention:** Script every outcome in the test double (success text, success edits, `-33006/7/8/9`, `-33002/3/4`, `-32601`, `-32800`, a delayed answer, a malformed result). Keep format tests on `parseHelper`/`TextDocuments` fixtures; do not use `DocumentBuilder.build` (it reaches CPL and `:5008`, fails on GitHub, flaky locally). Add live tests gated on `RUN_BBJ_TESTS` that probe capability first and skip, not fail, on `-32601`. Add an end-to-end fake-peer test over a real `createMessageConnection` pair so framing and `ResponseError.data` survive.

**Phase to address:** Interop client; LS formatting service

### Pitfall 21: Interop `data` fields lost between peer and client

**What goes wrong:** `-33007` carries `data: [{setting,message}]` and `-33008` carries `data: {line}`. Langium's `responseError` returns a thrown `ResponseError` unchanged but RETHROWS any other error, and rebuilding a `ResponseError` from a message string drops `data`. A `-33008` shown without its line number, or an unhandled throw turned into a generic internal error toast, follows.

**Prevention:** Convert peer errors into a typed outcome inside the handler (`{kind:'invalid-settings', problems}`, `{kind:'mixed-numbering', line}`), render the user message from the outcome, and return `[]`/ContentModified/RequestCancelled; do not rethrow application errors to the client for format. Pass `data` through only where the client needs it.

**Phase to address:** Interop client; LS formatting service; DENUM command

### Pitfall 22: A `showMessageRequest` prompt that lingers or repeats

**What goes wrong:** Prompts launched from a format request (DENUM-needed, invalid settings, unsupported BBj) repeat on every save, stack up, or never clear when the client drops the request.

**Prevention:** One dedupe map keyed by (document, kind) with a timeout and reset-on-close; fire-and-forget; log the rest at debug. Prompt wording for IntelliJ must be plain text (no markdown/HTML).

**Phase to address:** LS formatting service; DENUM command

### Pitfall 23: DENUM on text BBj's charset cannot represent

**What goes wrong:** `-33001` also covers "text BBj's own charset cannot represent" (the DENUM listing round-trips through the JVM default charset). The generic message "DENUM failed" sends users to the wrong place.

**Prevention:** Show the peer's message verbatim (sanitized) for `-33001` from DENUM, add a hint "the file contains characters BBj's default charset cannot represent", and suggest saving the program in the ISO-8859-1/Windows-1252 range first. Test with a non-Latin string.

**Phase to address:** DENUM command

### Pitfall 24: A large range is not cheaper than the whole file

**What goes wrong:** Every range request still sends the whole `text` (up to 4 MiB) and the whole document is lexed to compute indent state; a formatter on paste in a 4 MiB file is a 4 MiB request each time.

**Prevention:** Acceptable on measured numbers (560 KB in 210 ms **[LIVE]**), but cap by size client-side with a friendly message above the peer limit, and do not enable on-type formatting.

**Phase to address:** LS formatting service

### Pitfall 25: Treating repository memory gotchas as someone else's problem

These bite this milestone specifically (from the project memory index):

- **Branch first.** Cut a `gsd/phase-NN-<slug>` branch (the repo is on `gsd/v4.9-bbj-ls-denum-format`); expect base-check degrade to sequential executors; run big phases `--wave N` at a time.
- **Executor shell rules.** Subagent prompts must forbid chained `cd ... && grep`, relative paths and `git stash`; a permission-hook prompt on an opaque shell command stalls executors silently. The Grep tool is not registered here, so scoped `grep` with absolute paths is the norm.
- **Test running.** `vitest` needs cwd = `bbj-vscode`; whole-suite "failed suites" with `numFailedTests: 0` are `initializeWorkspace` hook timeouts under contention (use `--maxWorkers=2`); judge regressions by diffing test names against the phase base commit in a scratch worktree on Node 22 (executors relabelled real failures as "env noise" before). Node 24 breaks `langium:generate`. Do not upgrade Langium (4.4 held at 4.3.1, upstream #2236).
- **Register check.** Executors and code-review fixers put plan/D-xx/CR-xx ids in source and test comments; grep the diff before closing a phase.
- **Executors log resolved deviations to `WINDOWS.md`**; open entries block `/gsd-ship`: say "SUMMARY-only" in the prompt.
- **Planner HTML-escapes `&&` in `<automated>`** and writes `--reporter=basic` (not in this vitest): fix before the checker.
- **Commits.** `gsd_run query commit` omits trailers; add the Co-Authored-By trailers with plain git. The git identity env override (skillspilot.de) beats `-c user.email`.
- **UAT.** Build and install both the VSIX and the IntelliJ zip before Test 1 AND at phase end from the final tree (after code-review fixes).
- **PR.** Squash merges concatenate every commit body, so `Closes #N` in old commit messages closes issues early; scan `git log --format=%B` before merge. A PR issue table does not close issues; add `Closes #N` lines. Every push to `main` bumps the version and publishes previews to both marketplaces (Pitfall 2).
- **bbj-ls is the production backend** (`/home/coder/repos/bbj-ls`); any protocol change (for example distinguishing "tokenized" from "engine failed", or a dedicated code) is a bbj-ls change, pushed through the forwarded VS Code agent, and the in-repo `java-interop/` mirror is not touched for this milestone.
- **Dependabot PRs** and local main/origin sync: merge one at a time and validate the lockfile; check main vs origin before verifying.

## Minor Pitfalls

### Pitfall 26: Stale `document-formatter.ts` behaviours worth deciding, not inheriting

`unsavedContentMap`, the `-i document.uri.fsPath` flag and `process.stdin.end(content)` all exist because the CLI took a path AND stdin. None applies. Do not port the mirror map; `TextDocuments` is already the live buffer.

### Pitfall 27: `.bbl` and `bbx` language ids

`.bbl` is language `bbj` in VS Code but excluded from the IntelliJ BBj file type (#369); `bbj.denumber`'s menu `when` clause also lists `resourceLangId == bbx`, a language id no longer declared. The LS client only serves `bbj` and `bbx-config`, so a menu entry on a `bbx` resource does nothing. Fix the `when` clauses when rewiring the command.

### Pitfall 28: `alt+n`, menus, the title-bar icon and the open-file setting survive the rewire

`bbj.denumber` is bound in keybindings, four menus and `bbj.denumber.promptOnOpen`; renaming the command id breaks users' keybindings. Keep the id and the `promptOnOpen` key; change only the implementation and the descriptions.

### Pitfall 29: `-32602` for a malformed range

Happens only on a client bug (negative or inverted positions). Log at warn with the request's range, return `[]`, do not retry.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One edit replacing the whole document | 5 lines of code | Caret jump, lost folds/breakpoints, IntelliJ stale highlighting, dirty no-op saves | Never for the shipped path; fine in the first spike |
| Pass `config.formatter` straight through as `settings` | No whitelist to maintain | `-33007` on any stale or renamed key, silent default drift | Never |
| Reuse the `parseProgram` lane for format/DENUM | No new connection code | DENUM blocks live diagnostics; lane loss re-probes everything | Only for pure `formatProgram`, never DENUM, and only with a generation-neutral loss path |
| Single `endpoint available` latch for parse/format/DENUM | Less state | One missing method disables the others (or the reverse) | Never |
| `allowDenum: true` from format-on-save | Numbered files "just format" | Irreversible semantic rewrite on every save | Never |
| Skip IntelliJ gate until the evaluation phase | Fewer files in phase 1 | Unevaluated feature reaches the preview channel | Never (gate lands with the capability) |
| Delete `denumber` option from `buildDecompileArgv` | Looks like removing the bbjlst denumber path | Breaks tokenized decompile | Never |
| Mock the whole formatter module in tests | Fast tests | Dangling imports pass CI; dead mocks remain | Only inside the deleted tests |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| bbj-ls `formatProgram` | Treat any error as "format failed" | Typed outcomes per code: `unsupported` (-32601/-33004), `needs-denum` (-33006), `invalid-settings` (-33007), `mixed-numbering` (-33008), `engine-failed` (-33009/-33001), `timeout` (-33002), `too-large` (-33003), `protected` (-33005), `cancelled` (-32800), `transport` |
| bbj-ls `denumProgram` | Pass a file path or write the result to disk | Send buffer text, apply a versioned `WorkspaceEdit`, `canonicalName` null |
| Langium `Formatter` | Extend `AbstractFormatter` and rely on the default handler | Plain interface implementation plus a bounded handler registered after `startLanguageServer` |
| vscode-languageclient | Keep `registerDocumentFormattingEditProvider` | Remove it; the LS capability registers formatting for the selector |
| LSP4IJ formatting | Assume Reformat Code and save hooks behave like VS Code | Gate off, evaluate with a checklist and real logs, then decide |
| VS Code settings | `getConfiguration('bbj.formatter')` pass-through | Whitelist 15 keys, explicit defaults, rename shim with `inspect()` |
| IntelliJ settings | Expect `workspace/configuration` to work | Flat `initializationOptions`, restart on apply (existing seam) |
| Workspace trust | Forget formatter keys ride the trust-gated `bbj` payload | Keep reading through the existing `gatedBbjSettings` payload and validate on the LS side |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Quadratic line diff | Format of a large rewrite pegs the LS thread | Cap diff size, fall back to a single changed-span replace | Roughly tens of thousands of changed lines |
| Cold-workspace wait inherited from Langium | First save after open stalls | Bounded custom handler (Pitfall 1) | Large workspaces (seconds to a minute) |
| Format on the shared connection during a class-resolution burst | Save waits behind `getClassInfo` | Dedicated lane (Pitfall 9) | Initial build of a large workspace |
| Whole file per range request | Paste-format latency grows with file size | Accept (measured 210 ms at 560 KB), message above the byte cap | Files near 4 MiB |
| Re-sending identical requests | Peer busy, `-33002` | Coalesce identical (uri, version, settings, range) | Save All, rapid repeats |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Peer-supplied edit ranges or text applied unvalidated | Corrupted buffer, client rejects the message and hides other results | Validate shape and bounds before use (Pitfall 19) |
| Peer error messages shown verbatim in rich-text balloons | Markup or control characters in IntelliJ notifications | Strip control characters, truncate, plain text only |
| Workspace-controlled settings forwarded blindly | Oversized or hostile values (the server caps echo at 40 chars, but the client still ships them) | Whitelist, coerce types, clamp |
| Writing the DENUM result to disk from the extension | Bypasses the v4.7 path-containment posture and undo | Apply as a buffer edit only |
| Keeping the Java-spawn code path "just in case" | A `child_process` importer outside the pinned list, plus an unverified jar | Delete it; update the pinned importer list test |
| Logging document text on failure | Source leakage into logs | Log kind and message only (the `logFailure` rule) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Hard cut-over with no message on BBj below 26.03 | Formatting and Denumber just stop working | One clear "requires BBj 26.03" message per session, documented, with the version line in the docs |
| Toast per save for every failure | Format-on-save becomes unusable | Per-kind once-per-outage cadence, errors in the output channel |
| First format after upgrade rewrites whole files | Surprise diffs (the new engine has different rules: no automatic blank-line insertion, labels transparent to indentation, defaults differ) | Release note listing the behavioural differences and the explicit defaults |
| "Denumber & Replace" no longer saves the file | User thinks nothing happened or loses the change on close | Prompt text and result message say "edited in the editor; save to keep" |
| Settings changes in IntelliJ need a restart | Setting appears ignored | State it in the settings UI and docs, reuse the existing restart flow |
| Rename without a shim | Existing `splitSingleLineIF` preference silently lost | Fallback read plus deprecation message |
| `editor.formatOnPaste` hits numbered files | Prompt storm | Range `-33006` is silent after the first time |

## "Looks Done But Isn't" Checklist

- [ ] **Format Document works in VS Code:** often missing the stale-version guard, config-document skip, and EOL-insensitive diff. Verify by typing during a delayed format, formatting `config.bbx`, and formatting a CRLF file twice (second run returns no edits, buffer not dirty).
- [ ] **Format on save:** often missing numbered/mixed handling and the superseded case. Verify a numbered file saves unchanged with one non-blocking prompt, and Save All on two edited files formats both.
- [ ] **Range formatting:** often missing the `-33006` behaviour and the distinct `canonicalName`. Verify Format Selection during a pending format-on-save does not cancel the save-time format.
- [ ] **DENUM command:** often missing the dirty-buffer, undo and tokenized branches. Verify a dirty numbered buffer is denumbered once, undo restores it, a tokenized file still decompiles, an unnumbered file reports "nothing to do".
- [ ] **Unsupported BBj:** often only tested with success. Verify against a peer that answers `-32601`: one message, saves stay fast, no Java popup, live diagnostics unaffected.
- [ ] **Settings:** often missing migration. Verify a user with only `bbj.formatter.splitSingleLineIF: true` formats with `splitSingleLineIf: true`, and a user with a stale `javaPath` gets no `-33007`.
- [ ] **IntelliJ:** often assumed. Verify the gate (formatting disabled by default), then run the full evaluation checklist on the built zip, including CRLF, config file, commit reformat, Actions on Save, numbered file prompt, settings change after restart.
- [ ] **Removal:** often incomplete. Verify `npm run build`, `lint`, `typecheck:test`, `npm test`, `./gradlew test` in `bbj-intellij`, the VSIX contents, and a grep of docs/QA/README/CLAUDE.md for `javaPath`, `BBjCFCli`, `formatter-verifier`.
- [ ] **No-op safety:** often missing. Verify a second Format Document on an already formatted file returns `[]` and leaves the buffer clean in both IDEs.
- [ ] **Breaker isolation:** verify a scripted run of 20 failing format requests leaves `connectionGeneration`, breaker state and live-parse verdicts unchanged.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Two formatters shipped to preview | LOW | Remove the client-side registration, publish a new preview; users can pick the default formatter meanwhile |
| IntelliJ formatting shipped unevaluated | MEDIUM | Ship the `isEnabled` gate in a preview; communicate that Reformat is disabled until evaluated |
| Stale edit corrupted a buffer | MEDIUM | Undo works (single edit); ship the version guard; add the regression test |
| Settings rename dropped user values | LOW | Add the fallback read and deprecation shim in a patch; changelog entry |
| Format traffic restarted live diagnostics or tripped the breaker | MEDIUM | Move format/DENUM to their own lane; add the isolation test |
| Decompile broken by the removal | LOW | Restore the `denumber` option in `buildDecompileArgv`/`decompileInPlace` (they are shared); add a decompile regression test |
| DENUM applied to wrong buffer version | MEDIUM | Add versioned `WorkspaceEdit` and text-equality guard; undo recovers the user |
| `ComposerRequestContractTest` red on the PR | LOW | Add the new path/name to the test lists in the same commit |
| Planning ids leaked into source | LOW | Grep the diff, reword in plain language before the PR |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Stock handler waits for the workspace | LS formatting service | Handler test with a never-ready workspace manager still answers; no `getOrCreateDocument` in the module |
| 2 Two formatters, IntelliJ gains formatting | LS formatting service (swap, gate), IntelliJ evaluation (decision) | Activation test expects zero client-side formatting providers; IntelliJ `isEnabled` false until flipped |
| 3 Stale TextEdit | LS formatting service | Delayed fake-peer test with a `didChange` returns ContentModified, no edit |
| 4 Whole-document replace | LS formatting service | Line-diff unit tests: no-op returns `[]`, single changed line yields one edit, astral characters intact, valid end positions |
| 5 EOL handling | LS formatting service, Settings (docs) | CRLF, LF and lone-CR end-to-end tests; second format returns no edits |
| 6 UTF-16/UTF-8/1-based | Interop client, LS formatting service, DENUM command | Emoji range test, byte-length pre-check test, `line: 0` diagnostic test |
| 7 `-32800` | Interop client, LS formatting service | Scripted `-32800` produces no log/toast; range and whole use different `canonicalName`; two-file Save All |
| 8 Timeouts | Interop client, LS formatting service | Cancellation token reaches the peer request; no `Promise.race` abandonment; `-33002` once per outage |
| 9 Breaker/generation/lane coupling | Interop client | Isolation test (generation, breaker, parse verdicts unchanged after repeated failures); DENUM never on the parse lane |
| 10 `-32601` and per-method latch | Interop client, DENUM command | Fake peer `-32601` per method; message once; latch resets on generation change |
| 11 DENUM dirty buffer and undo | DENUM command | Versioned `applyEdit`, undo restores, tokenized still decompiles, `denumbered:false` no-op |
| 12 Numbered files on save | LS formatting service, DENUM command | `allowDenum` never sent by format; prompt dedupe test; `-33008` message carries the line |
| 13 Settings rename and strictness | Settings | Whitelist unit test over stale keys; migration test with `inspect()`; null/2.5 coercion |
| 14 IntelliJ settings channel | Settings | JUnit on the normalizer; TS and Java key lists agree; restart-applied settings documented |
| 15 LSP4IJ quirks | IntelliJ evaluation | Executed checklist on the final-tree zip with `idea.log` traces |
| 16 Non-BBj documents | LS formatting service | `bbx-config` and `<<bbj>>` inputs return `[]` without a peer call |
| 17 Removal fallout | Cut-over removal | Build, lint, typecheck:test, vitest, `./gradlew test`, doc greps, VSIX contents |
| 18 Cross-language contract tests | Every phase touching request names; Docs and QA (final gate) | `./gradlew test` green and count matches CI |
| 19 Peer response shape | Interop client | Malformed-result tests for text, edits, diagnostics |
| 20-24 Test double, data loss, prompts, charset, range size | Interop client / LS formatting service / DENUM command | Per-item tests listed above |
| 25 Process memory gotchas | Every phase | Phase-close register check, test-name diff against base commit |

## Sources

- `/home/coder/repos/bbj-ls/README.md` (JSON-RPC methods, supersession, limits, error codes, DENUM section) and `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` (settings reference, line-ending and numbering rules, range semantics) - HIGH
- Live probe of `127.0.0.1:5008` on 2026-10-01 against the shipped `bbj-ls.jar` (table at the top) - HIGH
- Repo source read: `bbj-vscode/src/document-formatter.ts`, `src/language/java-interop-connection.ts`, `src/language/bbj-parser-service.ts`, `src/open-file-prompts.ts`, `src/line-numbering.ts`, `src/extension.ts`, `src/Commands/Commands.cjs`, `src/language/main.ts`, `src/language/bbj-document-update-handler.ts`, `src/language/compile-command.ts`, `src/config-path-trust.ts`, `src/setopts-stale-edit-guard.ts`, `package.json`, `.vscodeignore`; `bbj-intellij/.../lsp/CompilerInitOptions.java`, `BbjLanguageServerFactory.java`, `META-INF/plugin.xml`, `BbjLanguageCodeStyleSettingsProvider.java`, `ComposerRequestContractTest.java`; tests `no-shell-command-construction.test.ts`, `extension-activation.test.ts`, `activation-command-coverage.test.ts`, `formatter-*.test.ts` - HIGH
- Langium 4.3.1 `lib/lsp/language-server.js` (`createRequestHandler`, `waitUntilPhase`, `responseError`, `buildInitializeResult`) and `lib/lsp/formatter.d.ts` read directly - HIGH
- LSP4IJ docs `docs/LSPApi.md` (LSP Formatting Feature table) and source of `AbstractLSPFormattingService`/`LSPFormattingAndRangeBothService` via GitHub (main branch, not 0.21.0) - MEDIUM
- LSP4IJ issues read via `gh`: #381 (CRLF files not formatted, open), #388 and #424 (`canFormat` refuses when an IDE formatter exists, closed), #739 (stale highlighting after formatting, open), #747 (no format on paste, open), #1323 (tabSize in formatting requests, closed), #1404 (edit ordering at the same position, closed), #1647 (commit-time reformat not filterable by file type, open) - MEDIUM
- VS Code format-on-save timeout history (`editor.formatOnSaveTimeout` in 1.22; progress-based save participants since 1.42), from the VS Code release notes surfaced by search - MEDIUM; whether VS Code or LSP4IJ discard a stale formatting response was not verified - LOW
- Project memory index (`MEMORY.md`) and linked notes (devcontainer setup, bbj-ls production backend, formatter jar provenance, IntelliJ contract test, vitest cwd, register check, executor and branch rules) - HIGH for this repo's process

---
*Pitfalls research for: LSP formatting and DENUM migration on a dual-client Langium language server*
*Researched: 2026-10-01*
