# Pitfalls Research

**Domain:** Adding Debug Logging Controls, Diagnostic Filtering, and Log Level Management to Existing Langium Language Server
**Researched:** 2026-02-08
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Global Debug Flag State Hiding Real Errors in Development

**What goes wrong:**
Adding a global debug flag to suppress console.log/console.warn output works perfectly in production, but then developers accidentally ship code with real errors because they never saw the warnings during development. The flag becomes "set and forget" — turned on once, and then critical parser errors, type resolution failures, or PREFIX loading issues go unnoticed for months.

**Why it happens:**
The debug flag is typically set at the language server initialization level (in main.ts or ws-manager.ts) and affects ALL console output globally. Developers working on unrelated features never think to check the flag state. When they add new code that logs errors, those errors get silently suppressed if the flag is enabled in their workspace settings.

**How to avoid:**
1. **Never suppress console.error() calls** — only console.log() and console.debug(). Errors should always be visible regardless of debug settings.
2. **Use log levels with selective suppression**: `console.debug()` for verbose output, `console.log()` for normal operation logging, `console.warn()` for potential issues, `console.error()` for actual errors. Only suppress debug/log, never warn/error.
3. **Add environment detection**: In development mode (NODE_ENV=development or when running via VS Code debug launch), ignore the debug flag and show all logs. Only respect the flag in production/packaged builds.
4. **Document the flag in developer guide**: Make it obvious where the flag is set and what it suppresses, so new developers don't assume all logging is broken.

**Warning signs:**
- Developers report "logging doesn't work" — it does, but the flag is suppressing it
- Bug reports from users about issues that should have been caught during development
- console.error() calls in the codebase that should have triggered during testing but didn't get noticed
- Tests that assert against console output start failing intermittently based on local developer settings

**Phase to address:**
Phase 1 (debug flag implementation) — establish the log level hierarchy and suppression rules BEFORE writing any flag-checking code. Phase 2 (verification) — add tests that verify console.error() is NEVER suppressed regardless of flag state.

---

### Pitfall 2: Filtering Synthetic File Diagnostics Masks Parser Bugs

**What goes wrong:**
You add logic to suppress diagnostics from "synthetic" or "generated" files (like the JavaSyntheticDocUri document containing imported Java classes, or PREFIX-loaded library files). This works great for hiding noise from imported libraries — until a parser bug affects those files and you never see the error. The parser crashes silently, classes don't get indexed, but the diagnostic filter prevents the error from surfacing. Users report "IntelliSense doesn't work for this library" and you have no visibility into why.

**Why it happens:**
The existing codebase already has synthetic file handling in bbj-document-builder.ts (line 26-30 for JavaSyntheticDocUri, line 32-38 for isExternalDocument). When adding diagnostic filtering, developers extend this pattern without distinguishing between "expected diagnostics we want to hide" (like unresolved references in library files) vs. "parser/lexer errors that indicate real bugs" (like grammar ambiguities or malformed AST nodes).

**How to avoid:**
1. **Filter by diagnostic severity and code, not by file type**: Only suppress specific diagnostic types (e.g., "Class could not be resolved" warnings) from external files, never ALL diagnostics.
2. **Never suppress parser/lexer errors**: Langium's DocumentValidator emits different diagnostic categories. Parser errors (syntax errors) should ALWAYS be visible, even for synthetic files. Only suppress semantic validation warnings (reference resolution, type checking).
3. **Log suppressed diagnostics in debug mode**: When the debug flag is on, log "Suppressed X diagnostic(s) for file Y: [messages]" so developers can see what's being hidden.
4. **Separate validation from suppression**: Keep the shouldValidate() logic (which prevents validation from running at all) separate from diagnostic filtering (which runs validation but hides results). Don't over-apply shouldValidate().

**Warning signs:**
- Binary files (like `<<bbj>>` tokenized BBj files) loaded via PREFIX don't produce any feedback — you added them to the index but parser failures are invisible
- Users report "library X doesn't work" but no diagnostics appear in the Problems panel
- Tests pass (because synthetic file diagnostics are suppressed) but real-world usage fails
- Console shows "Maximum transitive import depth reached" warnings but no corresponding user-facing diagnostic

**Phase to address:**
Phase 2 (diagnostic suppression implementation) — before adding any filtering logic, enumerate which diagnostic codes/severities should be filtered. Phase 3 (testing) — add tests that verify parser errors in synthetic files ARE visible even when the filtering is active.

---

### Pitfall 3: Configuration Hot-Reload State Desynchronization

**What goes wrong:**
User changes the debug flag setting (or diagnostic filtering setting) in VS Code settings. The language server's onDidChangeConfiguration handler fires, updates a global variable (like `typeResolutionWarningsEnabled` in bbj-validator.ts line 22), and documents get re-validated. But parts of the system still hold stale state — cached diagnostics aren't cleared, the DocumentBuilder still has old settings, or only NEW documents get the updated setting. Result: inconsistent behavior where some files respect the new setting and others don't.

**Why it happens:**
The existing codebase has TWO configuration update paths: (1) onDidChangeConfiguration in main.ts (line 72) which forwards to ConfigurationProvider, and (2) initialization in ws-manager.ts (line 33) which sets initial values. When adding a new debug flag, developers often update one path but not the other. Additionally, the existing onDidChangeConfiguration handler (main.ts line 100) calls setTypeResolutionWarnings() but doesn't re-validate all open documents — that only happens for classpath/PREFIX changes (line 125).

**How to avoid:**
1. **Single source of truth**: Store the debug flag in BBjWorkspaceManager's settings object alongside prefixes and classpath, not as a module-level global variable.
2. **Invalidate ALL cached state on change**: When settings change, reset document state to Parsed (forcing re-validation), clear any cached diagnostic results, and notify all open documents (see main.ts line 113-125 pattern).
3. **Apply settings in both paths**: Update both onDidChangeConfiguration (for runtime changes) AND onInitialize (for startup). Don't assume one implies the other.
4. **Test hot-reload explicitly**: Add integration tests that change settings via workspace/didChangeConfiguration LSP notification and verify diagnostics update without requiring document edits.

**Warning signs:**
- User reports "I disabled debug logging but still see logs" — the setting changed but cached logger state didn't update
- Reloading VS Code fixes the issue but changing settings doesn't
- Only newly opened files respect the setting, existing open files don't
- onDidChangeConfiguration logs "BBj settings changed" but behavior doesn't change

**Phase to address:**
Phase 1 (settings infrastructure) — establish the configuration storage pattern and update protocol. Phase 2 (implementation) — ensure BOTH init and change handlers update the same state. Phase 3 (verification) — integration test that simulates didChangeConfiguration and verifies behavior updates.

---

### Pitfall 4: Debug Flag Doesn't Work in IntelliJ (LSP4IJ)

**What goes wrong:**
You implement a debug flag that works perfectly in VS Code — controls console output, filters diagnostics, everything great. Then you test in IntelliJ via LSP4IJ and nothing happens. The debug flag has no effect because IntelliJ's language server integration doesn't send the same initializationOptions structure as VS Code, or it doesn't support workspace/didChangeConfiguration for this setting, or the console output goes to a different log stream that bypasses your logging controls.

**Why it happens:**
VS Code and IntelliJ use different LSP client implementations with different capabilities. VS Code's vscode-languageclient handles configuration synchronization automatically (see extension.ts line 544 `synchronize.configurationSection: 'bbj'`). IntelliJ's LSP4IJ has its own configuration mechanism via preferences UI and may not map settings to initializationOptions in the same way. Additionally, console.log() in a Node.js language server shows up in VS Code's Output panel but may go to IntelliJ's IDE log file instead.

**How to avoid:**
1. **Use LSP-standard mechanisms**: Instead of custom initializationOptions for debug flags, use the LSP `workspace/configuration` request (language server pulls config from client) or `workspace/didChangeConfiguration` notification (client pushes config to server). These work across all LSP clients.
2. **Test with minimal IntelliJ integration early**: Don't wait until the feature is "done" in VS Code. Set up a basic IntelliJ LSP4IJ integration and verify initializationOptions are received as expected (log them like ws-manager.ts line 34).
3. **Document IDE-specific differences**: If some features only work in VS Code, document this clearly in settings descriptions and user guide.
4. **Use LSP4IJ trace settings**: LSP4IJ provides its own debug/trace configuration (see search results: "Language Servers preferences page to configure the LSP trace level"). Don't try to reinvent this — use the platform's mechanism.

**Warning signs:**
- Feature works in VS Code but reports from IntelliJ users say "setting has no effect"
- initializationOptions log shows empty or missing fields when running in IntelliJ
- console.log() output appears in IDE log file but not in LSP console view
- didChangeConfiguration notifications aren't received (check with console.log in onDidChangeConfiguration handler)

**Phase to address:**
Phase 1 (design) — review LSP spec and LSP4IJ documentation for configuration handling. Phase 2 (implementation) — test with IntelliJ alongside VS Code. Phase 4 (documentation) — document any IDE-specific limitations.

---

### Pitfall 5: Chevrotain Ambiguity Warnings Suppressed by Blanket Diagnostic Filter

**What goes wrong:**
You add diagnostic filtering to hide noise from PREFIX-loaded files. As a side effect, Chevrotain parser ambiguity warnings (generated during grammar construction, not document validation) also get suppressed because your filter is too broad. Developers then change the grammar in ways that introduce real conflicts, but they never see the warnings because the diagnostic filter is active. Parser behavior becomes unpredictable (wrong alternatives chosen, lookahead failures) and debugging is extremely difficult without the ambiguity warnings.

**Why it happens:**
Chevrotain ambiguity warnings are emitted at parser initialization time (when Langium constructs the parser from the grammar), not during document parsing. They appear as console.warn() calls and may also surface as LSP diagnostics if Langium's grammar analyzer detects them. Developers assume "diagnostic filtering" only affects user file validation, not grammar meta-analysis.

**How to avoid:**
1. **Never suppress Chevrotain warnings**: Grammar ambiguity warnings should ALWAYS be visible during development. These are framework-level errors, not user code issues.
2. **Distinguish initialization logs from runtime logs**: Chevrotain warnings appear during language server startup (before any documents are opened). Use console grouping or prefixes like `[GRAMMAR]` for initialization-time logs vs. `[VALIDATION]` for runtime logs. Only suppress runtime logs, never initialization logs.
3. **Preserve Chevrotain's IGNORE_AMBIGUITIES mechanism**: Chevrotain provides explicit grammar-level controls for suppressing known-safe ambiguities (see search results: "IGNORE_AMBIGUITIES property should be used instead on specific DSL rules"). Use that for intentional suppressions, not blanket diagnostic filtering.
4. **Test grammar changes with debug flag both on and off**: When modifying the Langium grammar, verify ambiguity warnings still appear regardless of debug flag state.

**Warning signs:**
- Grammar changes that should produce ambiguity warnings don't show any output
- Parser behavior changes unexpectedly after grammar modifications
- Tests pass but production parsing has different behavior (indicates parser is choosing wrong alternatives due to undetected ambiguity)
- Developers report "parser is broken" but no warnings appear in console

**Phase to address:**
Phase 1 (debug flag implementation) — explicitly exclude parser initialization logs from suppression. Phase 2 (grammar testing) — add test that verifies Chevrotain warnings appear during parser construction.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Global mutable flag for debug mode (`let debugEnabled = true` at module level) | Easy to implement, works immediately | Hard to test (tests affect global state), doesn't hot-reload cleanly, breaks in multi-workspace scenarios | Never — always use configuration service or dependency injection |
| Checking debug flag on every console call (`if (debug) console.log(...)`) | Straightforward, no abstraction needed | Scattered throughout codebase, easy to miss checks, performance overhead | Only for hot path logging (called thousands of times). Use logger abstraction elsewhere. |
| Filtering ALL diagnostics for external files (blanket `if (isExternal) return []`) | Silences library file noise completely | Hides parser bugs, grammar errors, and real issues in libraries | Never — always filter by severity/code, not by file type |
| Storing debug settings in global variables instead of ConfigurationProvider | Avoids LSP complexity, works for single-client scenarios | Breaks hot-reload, doesn't sync across workspace folders, fails in multi-root workspaces | Only for prototyping — production code must use ConfigurationProvider |
| Hard-coding quiet startup (no logs before initialization completes) | Cleaner output panel on startup | Violates LSP spec (allowed to send logs during initialize), hides initialization errors | Never during actual initialize request — quiet mode should only apply AFTER initialization completes |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| VS Code initializationOptions | Assuming all settings are sent in initializationOptions | Use `workspace/configuration` request after initialization for dynamic settings. Only send minimal config (home dir, critical paths) via initializationOptions. |
| IntelliJ LSP4IJ | Using same configuration mechanism as VS Code | Check LSP4IJ documentation for platform-specific config handling. Use LSP4IJ's preferences UI and trace settings instead of custom debug flags. |
| Langium DocumentBuilder validation | Assuming shouldValidate() and diagnostics filtering are the same | shouldValidate() = prevent validation from running (for performance). Diagnostic filtering = run validation but hide certain results (for UX). Use shouldValidate() for synthetic docs, filtering for warnings. |
| onDidChangeConfiguration handler | Forwarding to ConfigurationProvider only | ALSO apply settings to services (like JavaInteropService, validators) and re-validate affected documents. See main.ts line 72-131 for full pattern. |
| Console output in language servers | Assuming console.log() goes to editor's Output panel | In VS Code, goes to Output panel. In IntelliJ, may go to IDE log file. In tests, goes to test runner output. Use proper LSP logging (window/logMessage) for user-visible messages. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Checking debug flag on every console.log call in hot path | Slowdown during large workspace builds, high CPU usage during validation | Move debug check outside loop. Use conditional logging wrapper: `if (debug) { /* expensive string building */ logger.log(...) }`. Cache flag value per-document instead of reading config repeatedly. | When processing 100+ documents or logging inside AST traversal loops (called thousands of times per document) |
| Re-validating all documents on EVERY configuration change | Lag when changing settings, progress bar shows "Validating..." for seconds | Only re-validate documents affected by the changed setting. If changing classpath, re-validate; if changing debug flag, just update logger state. | Workspaces with 50+ BBj files — full re-validation takes 5-10 seconds |
| Creating new diagnostic arrays during filtering | Memory churn, GC pauses during large builds | Mutate existing diagnostic arrays (filter in place) or use immutable.js for efficient transforms. Cache filtered results if diagnostics don't change often. | Workspaces with heavily-imported libraries (PREFIX loading creates hundreds of synthetic diagnostics to filter) |
| Synchronous file I/O during diagnostic filtering | Language server freezes, "not responding" errors in IDE | Diagnostic filtering should only check in-memory state (like isExternalDocument check against cached URI set). Never do file I/O during validation. | When diagnostic filtering logic tries to re-check file existence on disk for every diagnostic |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Enabling quiet mode by default | Users think language server is broken when there's no feedback during long operations (PREFIX loading, Java class reflection) | Default to normal logging. Provide explicit setting "bbj.logging.quiet" that users opt into. Show progress notifications (window/workDoneProgress) even in quiet mode. |
| Filtering diagnostics without user awareness | User sees no errors but code doesn't work. They have no idea diagnostics are being hidden. | When filtering diagnostics, add setting description: "Note: diagnostics from library files in PREFIX directories are automatically suppressed." Add command to "Show all diagnostics including libraries" for debugging. |
| Debug flag requires language server restart | User changes setting, nothing happens, they think it's broken | Implement hot-reload via onDidChangeConfiguration. If restart IS required (e.g., for grammar changes), show notification: "Debug setting changed. Reload window to apply: [Reload]". |
| No indication of what debug mode does | User enables "debug" setting and wonders what changed | Setting description should be explicit: "Debug mode: show verbose logging including PREFIX resolution, class loading, and validation details in the Output panel." |
| Suppressing warnings that users need to see | User's code has real issues but warnings are hidden by default | Never suppress warnings by default. Provide granular controls: "bbj.diagnostics.hideTypeResolutionWarnings", "bbj.diagnostics.hideLibraryFileErrors" — all default to false (show everything). |

## "Looks Done But Isn't" Checklist

- [ ] **Debug flag**: Setting exists and is read at initialization — verify it's ALSO read in onDidChangeConfiguration and applied without requiring restart
- [ ] **Debug flag**: console.log() calls are suppressed when flag is off — verify console.error() and console.warn() are NOT suppressed (only debug/log should be affected)
- [ ] **Diagnostic filtering**: Diagnostics from PREFIX files are hidden — verify parser/lexer errors ARE shown even for PREFIX files (only suppress semantic warnings)
- [ ] **Diagnostic filtering**: isExternalDocument check exists — verify JavaSyntheticDocUri is also excluded from validation (see bbj-document-builder.ts line 26)
- [ ] **Configuration hot-reload**: onDidChangeConfiguration handler exists — verify it calls ConfigurationProvider.updateConfiguration(), applies settings to all affected services, and re-validates documents
- [ ] **Configuration hot-reload**: Settings change triggers re-validation — verify document state is reset to Parsed before calling update() (see main.ts line 119)
- [ ] **Multi-IDE support**: Works in VS Code — verify initializationOptions are logged and used correctly in IntelliJ (test with LSP4IJ integration)
- [ ] **Multi-IDE support**: Configuration is set via VS Code settings UI — verify IntelliJ has equivalent settings in preferences (may need platform-specific implementation)
- [ ] **Chevrotain warnings**: Grammar ambiguity warnings appear during development — verify they're not suppressed by debug flag or diagnostic filtering
- [ ] **Logging to correct stream**: console.log() output appears in Output panel — verify window/logMessage is used for user-facing messages that should appear as notifications

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Debug flag globally suppresses all logging including errors | MEDIUM | 1. Add environment check (if NODE_ENV=development, ignore flag). 2. Change suppression to only affect console.debug/console.log, never console.warn/error. 3. Audit all existing console calls and categorize by severity. 4. Add tests verifying errors are always visible. |
| Diagnostic filtering hides parser bugs in synthetic files | HIGH | 1. Review all isExternalDocument/shouldValidate usages. 2. Add severity/code checks: only filter DiagnosticSeverity.Warning, never Error. 3. Add debug logging "Suppressed N diagnostics from file X". 4. Add setting to show all diagnostics (disable filtering) for troubleshooting. 5. Re-test library integrations to verify parser errors now surface. |
| Configuration doesn't hot-reload | LOW | 1. Add document state reset to onDidChangeConfiguration (doc.state = DocumentState.Parsed). 2. Call DocumentBuilder.update() with all open document URIs. 3. Add integration test for hot-reload. Cost is low because the pattern already exists in main.ts (classpath reload), just needs to be applied to new settings. |
| Debug flag doesn't work in IntelliJ | MEDIUM-HIGH | 1. Investigate LSP4IJ configuration mechanism (may require platform plugin changes). 2. Document VS Code-only features. 3. Consider alternative: use LSP trace setting ($/setTrace) instead of custom debug flag — this is LSP-standard and works everywhere. Cost is medium if alternative approach works, high if platform-specific code is needed. |
| Chevrotain warnings suppressed | LOW | 1. Add check in logging suppression: never suppress logs during parser construction (before first document build). 2. Use console group/prefix to distinguish initialization logs from runtime logs. 3. Test by introducing intentional grammar ambiguity and verifying warning appears. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Global debug flag hiding real errors | Phase 1: Debug flag implementation | Test: verify console.error() output appears regardless of flag state. Test: introduce intentional error and verify it's visible. |
| Filtering synthetic files masks parser bugs | Phase 2: Diagnostic filtering implementation | Test: create PREFIX file with parse error. Verify error diagnostic appears even though file is external. Test: verify only warnings are filtered, not errors. |
| Configuration hot-reload state desync | Phase 1: Settings infrastructure + Phase 3: Hot-reload implementation | Integration test: send workspace/didChangeConfiguration LSP notification. Verify diagnostics update without document edit. Verify logger behavior changes immediately. |
| Debug flag doesn't work in IntelliJ | Phase 4: IntelliJ testing | Manual verification: test in IntelliJ with LSP4IJ. Verify initializationOptions received. Document any limitations. |
| Chevrotain warnings suppressed | Phase 1: Debug flag implementation | Test: trigger grammar ambiguity warning during parser construction. Verify warning appears regardless of debug flag. |

## Sources

### Primary (HIGH confidence — codebase analysis)

- **bbj-vscode/src/language/main.ts** (lines 72-131): Existing onDidChangeConfiguration pattern with document re-validation, classpath reload, and ConfigurationProvider sync
- **bbj-vscode/src/language/bbj-validator.ts** (line 22-26): Existing typeResolutionWarningsEnabled global flag and setTypeResolutionWarnings() pattern (anti-pattern to avoid repeating)
- **bbj-vscode/src/language/bbj-document-builder.ts** (lines 25-40): Existing shouldValidate() logic for JavaSyntheticDocUri and isExternalDocument filtering
- **bbj-vscode/src/language/bbj-ws-manager.ts** (lines 33-62): Existing initializationOptions handling for home, classpath, configPath, interopHost/Port, typeResolutionWarnings
- **bbj-vscode/src/extension.ts** (line 544): VS Code configuration synchronization pattern (`synchronize.configurationSection: 'bbj'`)
- **.planning/phases/34-diagnostic-polish/34-04-PLAN.md**: Binary file detection pattern (<<bbj>> header check), PREFIX loading diagnostics reconciliation
- **.planning/phases/34-diagnostic-polish/34-RESEARCH.md**: USE statement file path validation pattern, diagnostic property targeting, FileSystemProvider usage

### Secondary (MEDIUM confidence — official documentation)

- [Language Server Protocol Specification 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — TraceValue definition, initialize request restrictions, window/logMessage vs console output
- [VS Code Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) — Configuration synchronization, onDidChangeConfiguration pattern
- [Chevrotain Resolving Grammar Errors](https://chevrotain.io/docs/guide/resolving_grammar_errors.html) — Ambiguous alternatives detection, IGNORE_AMBIGUITIES property usage
- [Chevrotain FAQ](https://chevrotain.io/docs/FAQ) — Parser ambiguity false positives, explicit suppression mechanism
- [LSP4IJ GitHub Documentation](https://github.com/redhat-developer/lsp4ij) — IntelliJ language server preferences UI, debug tab configuration, trace level settings
- [LSP4IJ Developer Guide](https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md) — JavaProcessCommandBuilder debug flag handling
- [Langium Configuration via Services](https://langium.org/docs/reference/configuration-services/) — Service dependency injection, avoiding global state

### Tertiary (LOW confidence — community articles, Stack Overflow patterns)

- [DEV: Hide console logs in production](https://dev.to/sharmakushal/hide-all-console-logs-in-production-with-just-3-lines-of-code-pp4) — Environment-based console suppression pattern (use with caution, shows common pitfall)
- [Medium: Console.log in Production](https://medium.com/@lordmoma/do-you-have-console-log-in-production-161927490df0) — Why production console logs are problematic, selective suppression strategies
- [GitHub: VS Code Issue #134271](https://github.com/microsoft/vscode/issues/134271) — Add option to disable diagnostics on custom file system or read-only files (shows user demand for diagnostic filtering)
- [GitHub: VS Code Issue #76405](https://github.com/microsoft/vscode/issues/76405) — Restart language server generic solution (hot-reload vs restart trade-offs)

## Metadata

**Confidence breakdown:**
- Critical pitfalls (1-5): HIGH — based on existing codebase patterns, LSP specification, and Langium/Chevrotain documentation
- Technical debt patterns: HIGH — anti-patterns observed in existing code (global flags, blanket filtering) with documented correct approaches
- Integration gotchas: MEDIUM-HIGH — VS Code patterns HIGH (in codebase), IntelliJ patterns MEDIUM (from LSP4IJ docs, not yet tested in this project)
- Performance traps: MEDIUM — based on Langium patterns and typical language server performance issues, not project-specific profiling
- UX pitfalls: HIGH — based on existing setting descriptions in package.json and user feedback patterns from issue tracking

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days — stable APIs for Langium 4.1.3, Chevrotain 11.0.3, LSP 3.17)

**Gaps to address in phase-specific research:**
- IntelliJ LSP4IJ integration testing (current patterns are from documentation, need hands-on verification)
- Actual performance profiling of debug flag checking overhead (current recommendations are based on typical patterns, not measured)
- User preferences for default logging verbosity (UX recommendations assume users prefer quiet by default, may need validation)
