# Pitfalls Research

**Domain:** Adding external compiler integration, diagnostic hierarchy, and outline resilience to an existing Langium language server (BBj LS v3.7 milestone)
**Researched:** 2026-02-19
**Confidence:** HIGH (codebase analysis + official documentation + verified community reports)

---

## Critical Pitfalls

### Pitfall 1: Orphaned BBjCPL Processes When LS Restarts or Client Disconnects

**What goes wrong:**
The language server spawns a BBjCPL process per save event. When the LS crashes, is restarted by the IDE, or the client disconnects unexpectedly, in-flight BBjCPL processes are left running. Because BBjCPL is a JVM-based compiler (Java startup cost is ~500ms-2s), multiple orphaned processes accumulate quickly. On macOS/Linux they become zombies; on Windows they hold file locks on the .bbj file being compiled, blocking the next invocation.

**Why it happens:**
The existing codebase uses `child_process.exec()` in extension.ts for EM login/validation with no AbortController hookup. The pattern is fire-and-forget with a timeout but no process reference for cleanup. When developers add BBjCPL invocation inside the language server (main.ts or a new service), they follow the same pattern and don't register a `process.on('exit')` or connection `onShutdown` handler to kill the child process.

**How to avoid:**
1. **Use `spawn()` with AbortController, not `exec()`**: `AbortSignal.timeout(30000)` automatically kills the process on timeout. Store the AbortController per-document so a new save can abort the previous invocation.
2. **Register cleanup on LS shutdown**: In main.ts, register `process.on('SIGTERM', cleanup)` and `process.on('SIGINT', cleanup)` plus the LSP `shutdown` handler to kill all active BBjCPL processes.
3. **Use `detached: false`** (the default) so child processes die when the Node.js parent dies on Linux/macOS. On Windows, use `tree-kill` pattern or track PIDs for explicit `process.kill()`.
4. **Serialize invocations per document URI**: Keep a `Map<string, AbortController>` keyed by document URI. On new invocation, abort the previous controller before spawning.

**Warning signs:**
- `ps aux | grep bbjcpl` shows multiple compiler processes after a rapid-save sequence
- Windows: "file is locked" errors when attempting the second BBjCPL run on the same file
- Memory growth in the LS process over time (stdout/stderr streams accumulate without `.unref()`)
- IntelliJ health monitor reports LS as healthy but BBjCPL processes pile up in Activity Monitor

**Phase to address:**
Phase 1 (BBjCPL process management foundation) — before any diagnostic surfacing, establish the spawn/abort/cleanup lifecycle. Serialize invocations in this phase so later phases inherit correct process lifetime.

---

### Pitfall 2: Concurrent BBjCPL Invocations on Rapid Save (Race Condition on Diagnostics)

**What goes wrong:**
User saves twice in quick succession. Two BBjCPL processes start. The first process finishes and publishes its diagnostics. The second process (running stale code from save #1) finishes and overwrites the diagnostics with results based on the same stale content. The diagnostics panel shows results from whichever process finished last, not the most recent save.

**Why it happens:**
BBjCPL is invoked on `textDocument/didSave`. Langium's document builder also runs on `textDocument/didChange`. If BBjCPL is called directly from the save handler without debouncing, two concurrent invocations can produce out-of-order diagnostic updates. This is more likely with IntelliJ which sends `didSave` more aggressively than VS Code.

**How to avoid:**
1. **One-process-per-URI invariant**: Before spawning, abort any previous AbortController for the URI. Only the last-invoked process should publish diagnostics.
2. **Version-stamp diagnostics**: Capture the document version number at invocation time. When the process finishes, only publish diagnostics if the document version matches what was current at invocation time. Langium's `LangiumDocument.version` is the right source.
3. **Debounce on-save trigger**: Apply a 200-300ms debounce before invoking BBjCPL, so rapid saves collapse into a single invocation. This mirrors the existing `shouldRelink` debouncing pattern in `bbj-document-builder.ts`.
4. **Never publish stale results**: If the AbortController was aborted, discard all output from that process even if it completed before the abort propagated.

**Warning signs:**
- Diagnostics flicker between two states after rapid saves
- Diagnostics from a previous save reappear momentarily after being cleared
- "Compiler reported 0 errors" appears briefly then reverts to showing errors (or vice versa)

**Phase to address:**
Phase 1 (BBjCPL process management) — the document version stamp and abort pattern must be built in from the start, not retrofitted after diagnostic merging.

---

### Pitfall 3: Stale BBjCPL Diagnostics Not Cleared When File Is Modified

**What goes wrong:**
BBjCPL runs on save and publishes diagnostics tagged with `source: "BBjCPL"`. User then edits the file (typing fixes the error). The Langium parser re-runs and clears Langium diagnostics. But the BBjCPL diagnostics are never cleared — they persist until the next save triggers another BBjCPL run. If the user edits without saving, the Problems panel shows BBjCPL errors pointing at line numbers that no longer correspond to the actual code.

**Why it happens:**
`textDocument/publishDiagnostics` is a document-scoped notification that replaces ALL diagnostics for a URI per-source. If BBjCPL uses its own source tag, Langium's diagnostic publications don't touch BBjCPL's diagnostics (and vice versa). Standard LSP behavior per spec section 3.17: diagnostics are keyed by URI AND version. Clients like VS Code merge diagnostics from multiple sources.

**How to avoid:**
1. **Clear BBjCPL diagnostics on `textDocument/didChange`**: When the document changes (before the next save), emit `publishDiagnostics` with an empty array for the BBjCPL source so stale line numbers are immediately removed.
2. **Or: merge BBjCPL diagnostics into the single Langium diagnostic publication**: Override `BBjDocumentValidator` or hook into `notifyDocumentPhase(DocumentState.Validated)` to include BBjCPL results. This avoids the multi-source problem entirely. Only the last published diagnostic set is valid per the LSP spec.
3. **Use the same source tag consistently**: Langium currently uses no source tag (defaults to the language server name). BBjCPL diagnostics must use a DIFFERENT identifiable source so they can be cleared independently. Name it `"BBjCPL"` or `"bbj-compiler"` consistently everywhere.

**Warning signs:**
- Errors pointing at wrong line numbers (lines shifted by edits since last save)
- Resolving an error in the editor doesn't remove it from the Problems panel until save
- IntelliJ Structure view shows error indicators that VS Code doesn't (client-side diagnostic merging differs)

**Phase to address:**
Phase 2 (diagnostic merging) — establish the clear-on-change + publish-on-save pattern before integrating compiler results into the Problems panel.

---

### Pitfall 4: Duplicate Diagnostics From Parser and Compiler Reporting the Same Error

**What goes wrong:**
BBjCPL and Langium both report the same syntax error on the same line. The Problems panel shows it twice, with slightly different messages. For example: Langium reports "Expected ',' but found 'STRING'" and BBjCPL reports "Syntax error at line 42: unexpected token". User sees two red squiggles on the same location.

**Why it happens:**
Langium's parser (Chevrotain) and BBjCPL are both full compilers. They independently detect the same syntax errors. Without a hierarchy rule, both sets of diagnostics are published and the user sees the overlap. This is especially bad for parse errors where Langium's recovery-based parser may report different error boundaries than BBjCPL.

**How to avoid:**
1. **Establish precedence hierarchy**: When BBjCPL reports errors, suppress Langium parser-level errors (DiagnosticKind errors from Chevrotain). This requires tracking "is BBjCPL reporting errors for this document?" state.
2. **Do NOT suppress Langium semantic errors**: Only suppress Langium parse errors when BBjCPL has spoken. Semantic errors (linking, type checking, scope) are Langium-only and should always be shown.
3. **Implement in `BBjDocumentValidator.validateDocument()`**: Check if a BBjCPL result is available for this document/version. If yes, skip adding parser-level diagnostics (check `document.parseResult.parserErrors`). This is the same location where `stopAfterParsingErrors` is already checked.
4. **Use `data` field on diagnostics to tag origin**: Tag each diagnostic with `data: { source: 'parser' | 'semantic' | 'compiler' }` so the hierarchy can be enforced during merging.

**Warning signs:**
- Two identical or near-identical errors shown for the same line
- User reports "I see the error twice — which one should I fix?"
- Test assertions fail because expected 1 diagnostic but got 2

**Phase to address:**
Phase 2 (diagnostic merging) — the hierarchy rules must be specified before implementing merging, not discovered after.

---

### Pitfall 5: BBjCPL Error Output Format Parsing Brittleness

**What goes wrong:**
BBjCPL error messages contain both the BBj line number and the ASCII file line number. A naive regex parser extracts the wrong line number, placing squiggles on the wrong line. Or the error format changes between BBj runtime versions (e.g., BBj 23 vs BBj 24) and the regex silently fails to match, resulting in zero diagnostics even when BBjCPL reports errors.

**Why it happens:**
BBjCPL writes errors to stderr. The format includes both BBj internal line numbers and ASCII source line numbers. Developers regex-parse stderr assuming a fixed format and don't handle: (a) multi-line error messages, (b) warnings vs errors mixed in output, (c) path separators that differ by platform (backslash on Windows), (d) relative vs absolute paths in error output.

**How to avoid:**
1. **Parse the ASCII file line number, not the BBj line number**: BBjCPL includes both. The ASCII line number is what corresponds to the source the user edits. Identify the exact field in BBjCPL output via manual testing with a known file.
2. **Test the parser against real BBjCPL output samples**: Capture actual stderr from multiple BBjCPL versions and commit as test fixtures. Run unit tests against these fixtures, not mocked output.
3. **Fail gracefully**: If the regex doesn't match, don't crash — return zero BBjCPL diagnostics and log a DEBUG-level message with the raw output for investigation. Never throw.
4. **Normalize line numbers to 0-based**: LSP uses 0-based line numbers. BBjCPL output is 1-based. The off-by-one error is one of the most common bugs when integrating compiler output into LSP diagnostics.
5. **Handle no-error exit as authoritative**: If BBjCPL exits with code 0 and empty stderr, treat the document as compiler-clean and clear all previous BBjCPL diagnostics for that URI.

**Warning signs:**
- Squiggles appear one line off from the actual error
- Empty diagnostics in Problems even when code clearly has errors
- `console.error` messages containing raw BBjCPL output that wasn't parseable
- Diagnostics appear correctly on one platform but not another (path separator issue)

**Phase to address:**
Phase 1 (BBjCPL integration) — write the output parser with test fixtures BEFORE integrating into the document builder lifecycle. Treat the parser as a standalone unit with known-good test cases.

---

### Pitfall 6: Langium Rebuild Loop Triggered by BBjCPL Diagnostic Publications

**What goes wrong:**
BBjCPL publishes diagnostics. Langium's document builder interprets the diagnostic publication as a "document changed" signal and schedules a rebuild. The rebuild triggers another BBjCPL invocation (because shouldValidate returns true). BBjCPL publishes more diagnostics. Loop. CPU hits 100%.

**Why it happens:**
This is related to the documented issue #232 (CPU stability mitigations not yet implemented). The existing `shouldRelink` override in `BBjDocumentBuilder` prevents relinking loops but doesn't address the scenario where external diagnostic publication triggers rebuild. This is a new failure mode introduced specifically by adding BBjCPL.

The existing `isImportingBBjDocuments` flag prevents recursive `addImportedBBjDocuments` calls, but there's no equivalent guard for "BBjCPL is already running for this document."

**How to avoid:**
1. **Trigger BBjCPL only from `onDidSave`, not from document build callbacks**: Never invoke BBjCPL from `onBuildPhase(DocumentState.Validated)` — this fires on every rebuild, creating the loop.
2. **Add a per-URI "BBjCPL in-flight" flag**: Before invoking BBjCPL, check if it's already running for this URI. If yes, skip the new invocation.
3. **Publish BBjCPL diagnostics without triggering Langium rebuild**: The key is that `publishDiagnostics` (the LSP notification) does NOT inherently trigger a rebuild. It only triggers rebuild if the LS itself interprets published diagnostics as a change. Confirm the current code path does not feed published diagnostics back into the document builder.
4. **Gate BBjCPL on `bbj.compiler.enabled` setting**: Default to disabled. This ensures the rebuild loop can never happen unless the user has explicitly opted in.

**Warning signs:**
- CPU consistently above 80% after enabling BBjCPL integration
- `DocumentBuilder.update()` calls appearing in logs at high frequency
- Log shows repeated "Building document: file.bbj" for the same file with no user action
- IntelliJ health monitor shows LS unresponsive (spin detected in health probe)

**Phase to address:**
Phase 1 (BBjCPL process management) — establish trigger mechanism (on-save only, with debounce) before adding any diagnostic feedback. Phase 3 (CPU stability) — verify no rebuild loops with a test that simulates rapid saves.

---

### Pitfall 7: Diagnostic Cascading — Linking/Semantic Errors From Broken Parse

**What goes wrong:**
A syntax error in one class method causes Chevrotain's error recovery to produce a partial AST. The partial AST has undefined or malformed nodes for the rest of the file. The linker then fails to resolve references that touch the broken nodes and emits "could not resolve" warnings for every reference in the file — dozens of false warnings drowning out the single real syntax error.

**Why it happens:**
The existing `BBjDocumentValidator` already has `stopAfterParsingErrors` support in the interface, but doesn't enforce it by default. The `BBjDocumentBuilder.shouldValidate()` runs validation even when `document.parseResult.parserErrors.length > 0`. Langium's default behavior is to report all errors at all stages regardless of parse state.

**How to avoid:**
1. **Suppress linking/semantic diagnostics when parser errors exist**: In `BBjDocumentValidator`, check `document.parseResult.parserErrors.length > 0` at the top of `validateDocument()`. If parse errors exist, only emit parse error diagnostics — skip the linking and semantic validation phases.
2. **Do NOT suppress warnings that are independent of the parse state**: Some validators (like `checkLabelDecl`, `checkSymbolicLabelRef`) may still be safe to run on partially parsed documents. Evaluate per-check.
3. **Coordinate with BBjCPL hierarchy**: If BBjCPL reports errors, AND the parser has errors, show BBjCPL errors only. BBjCPL is the authoritative source on parse validity.
4. **Test with intentionally broken files**: Confirm that a single syntax error produces only 1-3 diagnostics (the error + immediate recovery artifacts), not 20+ cascading failures.

**Warning signs:**
- A single syntax error causes a flood of "could not resolve" warnings
- Problems panel shows 40+ diagnostics for a file with one obvious error
- After fixing the syntax error, all cascading warnings disappear instantly (confirming they were false positives)

**Phase to address:**
Phase 2 (diagnostic noise reduction) — implement the parse-error gate before adding BBjCPL results so the baseline noise level is already controlled.

---

### Pitfall 8: Outline/DocumentSymbol Crashes With Null `$cstNode` From Partial Parse

**What goes wrong:**
Langium's `DefaultDocumentSymbolProvider` walks the AST to build DocumentSymbol items. For each node, it accesses `node.$cstNode.range` to get the symbol's location. When Chevrotain's error recovery produces nodes with `undefined` or null `$cstNode` (recoveredNode=true), the symbol provider throws `TypeError: Cannot read properties of undefined (reading 'range')`. The entire outline request fails with an error, and the IDE shows an empty Structure view.

**Why it happens:**
`DefaultDocumentSymbolProvider.getSymbol()` assumes `$cstNode` is always present. This assumption holds for valid parses. With error recovery (which Langium enables by default), Chevrotain can produce AST nodes where `$cstNode` is set but has a zero-width or invalid range, OR where the node was inserted via token deletion recovery and has no corresponding source text.

The existing codebase does not override `DefaultDocumentSymbolProvider`, making it vulnerable to this crash the first time a BBj file has a syntax error.

**How to avoid:**
1. **Override `DefaultDocumentSymbolProvider` with null guards**: Check `node.$cstNode?.range` before accessing range. If undefined, skip the symbol (return undefined from `getSymbol()`).
2. **Guard against zero-width ranges**: A `range.start.line === range.end.line && range.start.character === range.end.character` indicates an empty range. These symbols are valid to show but may indicate a recovery artifact — optionally skip them.
3. **Never crash — always return a valid (possibly empty) array**: Wrap the entire symbol computation in try/catch. LSP clients expect symbol requests to always succeed, even if the result is `[]`.
4. **Test specifically with files containing parse errors**: Add a test that opens a file with a known syntax error and verifies: (a) no exception thrown, (b) symbols for the portions that DID parse correctly are returned.

**Warning signs:**
- `Request textDocument/documentSymbol failed. TypeError: Cannot read properties of undefined (reading 'range')` in LS output
- Structure view/Outline panel empty whenever a syntax error exists in the file
- Error appears in IntelliJ's IDE log but not in VS Code (client handles the error differently)

**Phase to address:**
Phase 3 (outline resilience) — must be implemented before any user-facing testing of BBjCPL integration, since BBjCPL errors guarantee partial ASTs and the outline will immediately crash.

---

### Pitfall 9: Windows Path Handling — BBj Home With Spaces, Backslashes in Compiler Output

**What goes wrong:**
Two separate failures on Windows:

(A) **Spawn failure**: `bbj.home` is `C:\Program Files\BASIS` (contains spaces). `child_process.spawn()` with the command assembled by string concatenation fails because the executable path isn't quoted. On Windows, `spawn('C:\Program Files\BASIS\bin\bbjcpl.exe', args)` works when passing the executable as the first argument directly. But `spawn('cmd', ['/c', 'C:\\Program Files\\BASIS\\bin\\bbjcpl.exe ' + args.join(' ')])` fails without additional quoting.

(B) **Output parsing failure**: BBjCPL error messages on Windows include backslash-separated paths (`C:\Users\dev\project\file.bbj:42`). A regex written on macOS uses forward-slash assumptions and fails to match Windows paths in error output.

**Why it happens:**
The existing codebase already handles this for EM login/validation in extension.ts (lines 400-436) using `"${bbj}"` with quotes in the exec command string. But when BBjCPL is integrated into the language server (main.ts), a new implementation is written without referencing the existing pattern. The output parser is developed on macOS and never tested on Windows before shipping.

**How to avoid:**
1. **Use `spawn(executable, args, options)` with args as array, not string concatenation**: `spawn('/path with spaces/bbjcpl', ['-N', filePath])` handles spaces in the executable path on all platforms. Never build a shell string with spaces in it.
2. **Normalize paths before building spawn arguments**: Use `path.normalize()` on all paths from settings and document URIs. Convert URI `fsPath` (which is always platform-native) to the spawn argument directly.
3. **Build the output regex to handle both `/` and `\` path separators**: Use `[/\\]` in regex character classes for path separators. Or normalize all paths in the output to forward slashes before parsing.
4. **Test BBjCPL invocation on Windows as part of Phase 1 acceptance criteria**: The existing EM login tests on Windows (noted in PROJECT.md v1.2) show this is possible. Add a BBjCPL integration test to the smoke test checklist.
5. **Guard against `bbj.home` undefined**: If `bbj.home` is not configured, skip BBjCPL invocation entirely and surface a status bar indicator or diagnostic suggesting the user configure the setting.

**Warning signs:**
- "No such file or directory" or "spawn ENOENT" errors on Windows but not macOS
- Zero BBjCPL diagnostics on Windows despite known errors in the file
- Error output with `\` separators causing the line number regex to not match
- Path in spawn error contains double-quotes within the path (over-quoting symptom)

**Phase to address:**
Phase 1 (BBjCPL process management) — cross-platform path handling must be part of the spawn implementation, not a subsequent fix. Add Windows-specific test cases to the compiler output parser unit tests.

---

### Pitfall 10: IntelliJ Receives Different Timing for `didSave` Than VS Code

**What goes wrong:**
BBjCPL is triggered on `textDocument/didSave`. In VS Code, the extension controls when `didSave` is sent (it can be delayed until auto-save). In IntelliJ via LSP4IJ, `didSave` is sent immediately on Ctrl+S. If BBjCPL takes 2-3 seconds to run (JVM startup + compilation), IntelliJ users experience a visible delay before diagnostics update, whereas VS Code users with debouncing see a smoother experience.

Additionally, IntelliJ's health monitor probe interval (defined in `BbjLanguageServerDescriptor`) may coincide with BBjCPL runs, and if BBjCPL blocks the LS event loop, the health probe times out and IntelliJ marks the LS as unhealthy.

**Why it happens:**
BBjCPL is a Java process (JVM startup overhead). The existing LS already runs one external Java process (java-interop). Adding a second increases the risk that overlapping JVM startups cause the Node.js event loop to lag (setImmediate starvation on Node.js 20, documented in Node.js 20 performance regression).

**How to avoid:**
1. **Never await BBjCPL synchronously from the LSP message handler**: The `didSave` handler must fire the spawn and return immediately. BBjCPL runs in the background. This is a hard requirement to avoid blocking the event loop.
2. **Implement BBjCPL as non-blocking**: Use `spawn()` with event handlers (`on('close', ...)`) rather than `execSync()` or `await exec()`. Never block the event loop.
3. **Verify health probe timing is unaffected**: After adding BBjCPL, run IntelliJ's health probe under load and verify it succeeds. The 30-second grace period in `BbjServerHealthChecker` provides buffer, but sustained load can exhaust it.
4. **Consider optional JVM reuse**: If BBjCPL supports being invoked via stdin (it does — "bbjcpl can be used as a pipe"), a persistent process that accepts filenames over stdin eliminates JVM startup overhead for subsequent invocations.

**Warning signs:**
- IntelliJ status bar shows language server as "degraded" or shows the health indicator flicker after saves
- VS Code shows diagnostics quickly but IntelliJ lags by 3-5 seconds
- Node.js event loop lag metrics (if logged) spike on save events

**Phase to address:**
Phase 1 (BBjCPL process management) — async-only invocation is a design constraint, not an optimization. Phase 4 (performance validation) — test under IntelliJ with the health probe active to verify no false-unhealthy reports.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `exec()` instead of `spawn()` for BBjCPL | Simpler API, familiar from existing EM login code | No streaming of large output; buffer overflow for files with many errors (default 1MB limit); no AbortController support | Never — BBjCPL output can exceed exec buffer. Use `spawn()` with stream handling. |
| Invoke BBjCPL from `onBuildPhase(Validated)` callback | Triggered automatically after every build | Creates rebuild loop (Pitfall 6). CPU hits 100% | Never — always trigger from `didSave` handler only. |
| Parse BBjCPL output with a single regex | Fast to implement | Brittle — format varies by BBj version, platform, error type | Acceptable for prototype/spike only. Production needs fixture-tested multi-pattern parser. |
| Merge BBjCPL diagnostics as a separate diagnostic source | Easier to implement independently | Stale diagnostics problem (Pitfall 3), user sees duplicate errors from both sources | Never for production — merge into the single Langium document validation cycle. |
| Skip null guard for `$cstNode.range` in symbol provider | One line of code saved | Crash on first syntax error (Pitfall 8), empty outline for any file with errors | Never — `$cstNode` can be undefined whenever error recovery is active. |
| Hard-code BBjCPL path relative to `bbj.home` | No configuration needed | Breaks when BBj is not installed at expected location; fails on non-standard installs | Acceptable as the default, but must fall back gracefully when not found. |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BBjCPL process invocation | Using `exec()` with shell: true and string-interpolated arguments | `spawn(bbjcplPath, ['-N', filePath], { stdio: ['ignore', 'pipe', 'pipe'] })` — no shell, array args, explicit stream capture |
| BBjCPL output parsing | Reading from stdout | BBjCPL writes errors to stderr. stdout is the compiled output. Use the stderr stream only for diagnostic parsing. |
| Langium diagnostic publication | Calling `publishDiagnostics` directly from compiler callback | Hook into `notifyDocumentPhase()` or override `DefaultDocumentValidator` to inject BBjCPL results during the Langium build cycle |
| Document version tracking | Assuming document version at process start matches version at process finish | Capture `document.version` before spawn; compare at output handler time; discard results if version changed |
| IntelliJ LSP4IJ `didSave` behavior | Assuming same throttling as VS Code | LSP4IJ sends `didSave` synchronously on Ctrl+S. Implement debouncing in the LS, not the client extension. |
| Cross-platform path | Using `URI.fsPath` directly in regex for output parsing | `URI.fsPath` returns platform-native separators. Normalize with `path.normalize()` before comparison; use `[/\\]` in output-parsing regex. |
| BBj HOME not set | Throwing an unhandled error if `bbj.home` is undefined | Check setting before invoking BBjCPL; skip silently with a status bar hint if not configured. The ws-manager already tracks `this.bbjdir` — use that. |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| JVM startup per save (no process reuse) | 1-3 second delay on every save; IntelliJ health probe misses during compilation | Use BBjCPL pipe mode (stdin input) for a persistent compiler process; or accept JVM startup cost but make it async | Immediately visible on first use; worsens as file size grows |
| Synchronous BBjCPL wait (blocking event loop) | IDE shows "language server not responding"; IntelliJ health indicator goes red; VS Code freezes briefly on save | Always async: `spawn` + event handlers, never `execFileSync` or `await` with synchronous wait | Any file that takes >100ms to compile; all files on slower machines |
| BBjCPL for every file on workspace open | Startup floods with compiler invocations; other workspace files starve for processing | Only trigger BBjCPL on explicit save (`didSave`), never on `didOpen` or initial workspace build | Large workspaces with 50+ BBj files |
| Full workspace revalidation when compiler config changes | Every file gets revalidated + BBjCPL-recompiled when user changes `-t` flag in settings | Only re-run BBjCPL on the currently open/active document when compiler settings change; don't trigger on all documents | Workspaces with 100+ files; compound with #232 rebuild loop debt |
| Output buffer accumulation without process cleanup | Memory growth over long sessions; LS OOM crash | Always call `process.stdout.destroy()` and `process.stderr.destroy()` after reading output; unref streams when not needed | Sessions lasting hours with frequent saves |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Diagnostics flicker on save (clear then re-appear) | Jarring UX; users think errors are "fixed" then "return" | Clear BBjCPL diagnostics when BBjCPL run starts, not on `didChange`. Show a progress indicator (status bar item) during compilation. |
| No indicator that BBjCPL is running | User sees no feedback during 1-3s JVM startup; thinks LS is hung | Status bar item: "BBjCPL: checking..." while running, "BBjCPL: OK" or "BBjCPL: N errors" when done. |
| Showing BBjCPL errors when bbj.home is wrong | User sees "BBjCPL not found" error in Problems panel | Use informational notification for configuration errors, not a document diagnostic. Document diagnostics should only reflect source code problems. |
| Showing BOTH compiler and parser errors for the same issue | User sees duplicates; doesn't know which source to trust | Implement the hierarchy: BBjCPL errors take precedence over parser errors for the same line. Show a "source" tag on each diagnostic (VS Code already displays `source` field). |
| BBjCPL errors on a file the user can't see (imported USE file) | Errors in a library file surface on the wrong document | Only publish BBjCPL diagnostics for the document URI that was compiled, not for transitive USE imports. |
| Structure view disappears entirely on first syntax error | User loses navigation when they need it most | Override symbol provider with null guards (Pitfall 8). Partial symbols from unaffected regions should always be shown. |

---

## "Looks Done But Isn't" Checklist

- [ ] **BBjCPL process management**: Process spawns and produces output — verify the process is killed on LS shutdown, on abort, and when a new invocation supersedes the previous one
- [ ] **BBjCPL process management**: Works on macOS — verify it also works on Windows (path spaces, backslash in output, `.exe` extension)
- [ ] **Diagnostic merging**: BBjCPL errors appear in Problems panel — verify Langium parser errors are suppressed when BBjCPL speaks, and stale BBjCPL errors are cleared on `didChange`
- [ ] **Diagnostic merging**: Both sources publish diagnostics — verify no duplicate errors for the same line number across sources
- [ ] **Error recovery**: Outline works on valid files — verify outline also works (no crash, partial symbols shown) when file has syntax errors
- [ ] **Error recovery**: Symbol provider doesn't crash — run the documentSymbol request against 5 files each with different parse error types
- [ ] **Cascading suppression**: Langium validator shows all errors on valid file — verify it suppresses linking/semantic noise when parse errors exist
- [ ] **CPU stability**: Feature works on single file — verify no rebuild loop after 10 rapid saves with `ps` showing only one BBjCPL process at a time
- [ ] **IntelliJ compatibility**: Works in VS Code — verify in IntelliJ that health probe doesn't report LS as unhealthy during BBjCPL run
- [ ] **BBjCPL not configured**: Feature works when `bbj.home` is set — verify graceful degradation (no crash, no spurious errors) when `bbj.home` is empty or BBjCPL binary is not found

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orphaned BBjCPL processes discovered post-ship | MEDIUM | Add AbortController cleanup to spawn wrapper. Add `process.on('exit')` handler to kill all tracked PIDs. Ship hotfix. No user-visible behavior change except reduced zombie processes. |
| Rebuild loop triggered (CPU 100%) | HIGH | Disable BBjCPL trigger from any callback other than `didSave`. Add `bbj.compiler.enabled = false` as emergency escape hatch. Ships as hotfix config change users can apply immediately. |
| Outline crash on parse errors (TypeError) | LOW | Single null guard `node.$cstNode?.range` in `getSymbol()` method. Contained change, no state impact. |
| Stale BBjCPL diagnostics (wrong line numbers) | LOW-MEDIUM | Add `publishDiagnostics(uri, [])` call on `didChange`. One-line fix in the document change handler. |
| Duplicate diagnostics from parser and BBjCPL | MEDIUM | Add parse-error gate in `BBjDocumentValidator`. Requires careful testing to avoid over-suppression of legitimate semantic errors. |
| Windows spawn failure (path spaces) | LOW | Switch from string interpolation to array args in `spawn()`. Existing EM login code (extension.ts:520) shows the correct pattern to copy. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Orphaned BBjCPL processes | Phase 1: Process management | Test: kill LS mid-compilation; verify no orphan processes remain in `ps` output |
| Concurrent invocation race condition | Phase 1: Process management | Test: trigger 5 rapid saves; verify only 1 BBjCPL process runs at a time via process count |
| Stale diagnostics not cleared on edit | Phase 2: Diagnostic merging | Test: save with errors, edit without saving, verify Problems panel is empty |
| Duplicate parser + compiler errors | Phase 2: Diagnostic merging | Test: introduce syntax error; verify exactly 1 diagnostic per error location, not 2 |
| BBjCPL output format brittleness | Phase 1: BBjCPL integration | Unit tests: parse 5 different BBjCPL error output samples; assert correct line numbers |
| Langium rebuild loop | Phase 1: Process management | Load test: 10 rapid saves; verify CPU returns to <10% within 5 seconds |
| Cascading diagnostic noise | Phase 2: Diagnostic noise reduction | Test: single syntax error produces ≤3 diagnostics in Problems panel |
| Outline crash on partial AST | Phase 3: Outline resilience | Test: request documentSymbols on file with parse error; assert no exception thrown |
| Windows path handling | Phase 1: BBjCPL integration | Test: BBjCPL invocation with `bbj.home` containing spaces succeeds on Windows |
| IntelliJ event loop blocking | Phase 4: IntelliJ validation | Manual: save in IntelliJ during BBjCPL run; verify health indicator remains green |

---

## Sources

### Primary (HIGH confidence — codebase analysis)

- **bbj-vscode/src/language/bbj-document-builder.ts** — `shouldRelink` override, `isImportingBBjDocuments` guard, `revalidateUseFilePathDiagnostics` pattern (reconciliation after async external loading)
- **bbj-vscode/src/language/bbj-document-validator.ts** — `processLinkingErrors` override, `toDiagnostic` severity downgrade pattern (existing diagnostic hierarchy precedent)
- **bbj-vscode/src/language/main.ts** — `onDidChangeConfiguration` handler, document re-validation pattern, `workspaceInitialized` gate (models for BBjCPL lifecycle hooks)
- **bbj-vscode/src/language/java-interop.ts** — Socket-based external process connection with timeout, `resolvedClassesLock` mutex (parallel to BBjCPL serialization pattern)
- **bbj-vscode/src/extension.ts** (lines 396-444) — Existing `exec()` usage for EM validation with temp file pattern (anti-pattern to avoid repeating for BBjCPL)
- **bbj-vscode/src/Commands/CompilerOptions.ts** — BBjCPL flag definitions, `-N` validate-only flag (key for diagnostic-only invocation without output side effects)
- **bbj-vscode/src/language/bbj-index-manager.ts** — `isAffected` override preventing external document reindex (model for preventing BBjCPL-induced rebuild loops)
- **.planning/PROJECT.md** — Issue #232 (CPU stability, rebuild loops), existing tech debt list, 11 pre-existing test failures

### Secondary (MEDIUM confidence — official documentation)

- [LSP 3.17 Specification — textDocument/publishDiagnostics](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — `source` field, version semantics, per-URI diagnostic replacement behavior
- [Node.js child_process documentation](https://nodejs.org/api/child_process.html) — AbortController/AbortSignal support for `spawn()`, Windows-specific quoting behavior, `detached` option
- [Chevrotain Fault Tolerance guide](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html) — `recoveredNode` flag, re-sync recovery behavior, how partial ASTs are produced
- [vscode-languageserver-node issue #726](https://github.com/microsoft/vscode-languageserver-node/issues/726) — Orphaned process reports when client closes before server is ready
- [vscode-languageserver-node issue #900](https://github.com/microsoft/vscode-languageserver-node/issues/900) — Orphaned dotnet process after exit (identical pattern to BBjCPL)
- [BBjCPL documentation](https://documentation.basis.com/BASISHelp/WebHelp/util/bbjcpl_bbj_compiler.htm) — Both BBj and ASCII line numbers in output, stderr for errors, pipe mode support

### Tertiary (LOW confidence — community reports, verified by pattern matching)

- [Node.js issue #46569](https://github.com/nodejs/node/issues/46569) — Zombie process generation with unref'd child processes (runtime concern)
- [Node.js child_process issue #7367](https://github.com/nodejs/node/issues/7367) — spawn fails on Windows with spaces in command and argument simultaneously
- [vscode-languageserver-node issue #1257](https://github.com/microsoft/vscode-languageserver-node/issues/1257) — `TypeError: Cannot read properties of undefined (reading 'range')` in textDocument/documentSymbol (exact Pitfall 8 scenario)
- [Neovim issue #29927](https://github.com/neovim/neovim/issues/29927) — Duplicate diagnostics when LSP implements both push and pull (same root cause as Pitfall 4)
- [Node.js setImmediate performance (2024)](https://blog.platformatic.dev/the-dangers-of-setimmediate) — Node.js 20 event loop changes that can cause health check starvation under load

---

*Pitfalls research for: Adding external compiler integration (BBjCPL), diagnostic hierarchy, and outline resilience to an existing Langium-based BBj language server*
*Researched: 2026-02-19*
