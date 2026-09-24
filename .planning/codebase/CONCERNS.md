# Codebase Concerns

**Analysis Date:** 2026-09-21

## Tech Debt

**Library Definition Sync Burden:**
- Issue: `src/language/lib/functions.ts` (and `variables.ts`, `labels.ts`, `events.ts`) are paired with `.bbl` mirror files; no generator synchronizes them
- Files: `bbj-vscode/src/language/lib/functions.ts`, `bbj-vscode/src/language/lib/functions.bbl`
- Impact: Manual edits must be applied to both files or signatures drift. Following issue #179 (function definition corrections), any change to arity, types, or documentation requires careful synchronization
- Fix approach: Consider adding a pre-build validation step to diff the paired files and warn on mismatch, or generate the `.bbl` from the `.ts` file

**Java Method Overloading Not Handled:**
- Issue: `JavadocProvider.getDoc()` resolves Java methods by name only, not by signature/overload
- Files: `bbj-vscode/src/language/java-javadoc.ts:115`
- Impact: Hover documentation and completion hints pick the first matching method name, ignoring parameter count/types. Multi-overload methods (e.g., `ArrayList.add(int, E)` vs `ArrayList.add(E)`) show inconsistent or wrong documentation
- Fix approach: Extend method lookup to match parameter count and types against the call site's argument list

**Class-Level `USE` Statements Not Inspected:**
- Issue: Scope collection only gathers top-level `USE` statements; `USE` inside `CLASS` blocks is ignored
- Files: `bbj-vscode/src/language/bbj-scope.ts:575`
- Impact: Imported types via class-level `USE` are not resolved, causing false positives on class field and method types
- Fix approach: Extend `collectUseStatements()` to recurse into class bodies

**Super Getters/Setters Inaccessible from Scope Provider:**
- Issue: Auto-generated getter/setter for class fields are registered only in `ScopeComputation` (local scope), not in the main `ScopeProvider`
- Files: `bbj-vscode/src/language/bbj-scope-local.ts:275`
- Impact: Inherited getters/setters from superclass fields cannot be linked from derived classes; only local field accessors work
- Fix approach: Move accessor generation to `ScopeProvider` or provide a separate cross-file lookup path for inherited accessors

**FileSystemAccess Service Extension Needed:**
- Issue: `BBjWorkspaceManager` imports `fs` and `os` directly instead of using Langium's `FileSystemAccess`
- Files: `bbj-vscode/src/language/bbj-ws-manager.ts:15`
- Impact: Hard-coded file system access bypasses any custom or virtual file system implementations (e.g., in testing or remote scenarios); reduces testability
- Fix approach: Extend or wrap `FileSystemAccess` to support the config file lookup and workspace folder traversal operations

**Missing Workspace Folder Validation:**
- Issue: `isExternalDocument()` checks if a URI matches a configured prefix but does not verify the document is part of registered workspace folders
- Files: `bbj-vscode/src/language/bbj-ws-manager.ts:276`
- Impact: A document URI could match a prefix yet not be in any workspace, leading to inconsistent behavior across multi-folder workspaces
- Fix approach: Add a check to ensure the document's root is within a registered workspace folder before marking it external

**Disabled Line-Break Validation Test:**
- Issue: A test in `validation.test.ts:103` checking line breaks after `:` is commented out (`FIXME`)
- Files: `bbj-vscode/test/validation.test.ts:103`
- Impact: This edge case (colon continuation followed by non-statement) may regress undetected
- Fix approach: Investigate why the test was disabled and either fix the underlying validation or document the known limitation

## Known Bugs & Runtime Issues

**Java Interop Cold Resolution Timeout:**
- Symptoms: Large Java classes (500+ fields) timeout during cold resolution against live :5008 service; methods/fields lack `$container`, causing "AST node has no document" errors during linking
- Files: `bbj-vscode/src/language/java-interop.ts:492` (linkContentToContainer call)
- Trigger: E2E tests using live java-interop without pre-warming the class cache (e.g., `BBjHtmlView`, 536 fields)
- Workaround: Pre-warm large classes in `beforeAll` by calling `resolveClassByName()` and polling until a field has `$container`. This is a test-harness artifact; VS Code pre-warms via `loadImplicitImports()`. See memory note: [[java-interop-cold-resolution-gotcha]]
- Status: By design; not a production bug

**Test Build Trigger Path Fragility:**
- Symptoms: Using `DocumentBuilder.build([doc])` in tests triggers BBjCPL validation and reaches for :5008, failing on GitHub CI (no socket) and causing flaky cross-test pollution in dev containers
- Files: Any test using `services.shared.workspace.DocumentBuilder.build()`
- Trigger: Integration/acceptance tests that need full validation, particularly those driving LSP features
- Workaround: Use `parseHelper<Model>(services)(text, { documentUri })` instead (validation defaults OFF), or enable validation selectively. See memory note: [[test-parsehelper-not-documentbuilder]]
- Status: Known pattern; test harness design constraint

**Ambiguous Completion Request Race Condition (Fixed):**
- Symptoms: Two concurrent completion requests on different documents could overwrite each other's cancellation tokens if the provider instance held a single field
- Files: `bbj-vscode/src/language/bbj-completion-provider.ts:45` (AsyncLocalStorage pattern)
- Fix: `AsyncLocalStorage` now scopes each request's token independently, preventing overwrites
- Status: Fixed (issue #498)

## Performance Bottlenecks

**LRU Cache Eviction at 5000 Resolved Classes:**
- Problem: `JavaInteropService._resolvedClasses` cache grows unbounded without eviction; a long-lived server session against a large/varied classpath would exhaust memory
- Files: `bbj-vscode/src/language/java-interop.ts:41` (RESOLVED_CLASSES_CACHE_LIMIT constant)
- Cause: No LRU eviction logic in earlier versions; 5000 limit is discretionary, balancing typical project size vs. steady-state memory
- Improvement path: Monitor cache hit/miss ratio; if eviction is too aggressive, tune the limit upward or implement a time-based TTL in addition to LRU

**Completion Prefix Cache Staleness Window:**
- Problem: `BBjCompletionProvider`'s prefix cache (20-entry LRU, 2s TTL) can serve stale results if the Java classpath index grows mid-session (a class resolving after its prefix was cached)
- Files: `bbj-vscode/src/language/bbj-completion-provider.ts:24-33`
- Cause: Caching prefix lookups to avoid duplicate work within one request, but the index only grows; a cached "not found" may become "found" later
- Improvement path: The 2s TTL self-heals; monitor if users report "class not in completion" issues. If common, reduce TTL or warm all known prefixes upfront

**Large Generated Files:**
- Problem: `grammar.ts` (12,218 lines) and `ast.ts` (5,743 lines) are auto-generated from the Langium grammar; any changes to grammar require full regeneration, which is a long-running build step
- Files: `bbj-vscode/src/language/generated/grammar.ts`, `bbj-vscode/src/language/generated/ast.ts`
- Cause: Langium's auto-generation strategy; cannot be edited directly
- Improvement path: None; this is by design. Ensure grammar changes are tested locally before pushing to avoid CI overhead

## Fragile Areas

**Lexer Token Lookbehind Anchor Sensitivity:**
- Files: `bbj-vscode/src/language/bbj-lexer.ts` (custom lexer with line-continuation handling)
- Why fragile: Custom tokens (e.g., `KEYWORD_STANDALONE`) include their terminators (`;` or newline). Tests can pass with green counts but miss edge cases like keywords inside identifiers. Example: 98-01 regression where `TABLE_DATA` matched inside `mytable`
- Safe modification: When adding/modifying custom tokens, include keyword-as-identifier test cases in the test suite (e.g., `let mytable = TABLE_DATA(...)`), not just count-based probes
- Test coverage: Parser and lexer tests exist but are vulnerable to false negatives

**Completion Provider Async Caching:**
- Files: `bbj-vscode/src/language/bbj-completion-provider.ts` (lines 17-81 document the caching strategy)
- Why fragile: Caches in-flight promises to deduplicate concurrent requests for the same prefix. If the cache key (prefix only, not per-document) is too broad or if TTL is miscalibrated, concurrent clients could observe stale data
- Safe modification: Any change to caching logic must account for concurrent requests across multiple documents and the time window in which the classpath index can grow
- Test coverage: Async cache behavior is complex; ensure E2E tests cover multi-document concurrent completion scenarios

**Scope Computation Local Symbols:**
- Files: `bbj-vscode/src/language/bbj-scope-local.ts` (458 lines, complex scope computation)
- Why fragile: Local scope (within a block) is computed separately from global scope; interactions between class-level fields, inherited members, and method-local variables are error-prone. Super accessor generation (line 275 TODO) hints at missing inheritance handling
- Safe modification: Changes to scope computation should include tests exercising class inheritance, nested scopes, and shadowing patterns
- Test coverage: `linking.test.ts`, `variable-scoping.test.ts` and `scope-cost-regression.test.ts` provide coverage but may miss edge cases in complex class hierarchies

**BBjCPL Integration with Hot-Reload:**
- Files: `bbj-vscode/src/language/bbj-document-validator.ts`, `bbj-vscode/src/language/config-watcher.ts`
- Why fragile: Config hot-reload triggers CPL compilation debouncing; timing issues between file watchers, debounce timers, and validation requests can cause out-of-order or missed diagnostics
- Safe modification: Changes to debounce logic or config watching must consider: (a) a config change arriving while a previous CPL request is in-flight, (b) user typing triggering debounce before config change completes, (c) saved document not matching the config state the validator last saw
- Test coverage: `config-hot-reload-wiring.test.ts` provides detailed scenario testing

**Interop Breaker and Retry Strategy:**
- Files: `bbj-vscode/src/language/java-interop.ts` (lines 49-53 constants, connection logic)
- Why fragile: Circuit breaker pattern with exponential backoff (5s → 10s → 20s → 30s) means a transient :5008 outage can block completion for 30s per request. Initial cooldown, backoff factor, and max are discretionary with no tuning data
- Safe modification: Changes must preserve the breaker state machine (open → half-open → closed) and ensure a half-open probe failure re-opens (not immediate full backoff). Monitor production telemetry to validate timing choices
- Test coverage: `java-interop-breaker.test.ts` (with `java-interop-service.test.ts`, `java-interop-timeouts.test.ts`) covers breaker scenarios but may not exercise all edge cases (e.g., probe race conditions)

## Architectural Constraints

**Conservative Validation by Design:**
- Strategy: Builtin function type checks (`check-function-calls.ts`) only judge unambiguously-typed cases (literals, variables with suffix, nested builtins). Binary operators, Java calls, and casts are deliberately unjudged
- Rationale: LSP layer provides instant feedback for clear cases; BBjCPL (native compiler integration) is the authoritative type checker and runs on save. Avoiding false positives is the priority
- Implication: Extending validation must stay conservative; if it requires real expression type inference, defer to bbjcpl instead
- Files: `bbj-vscode/src/language/validations/check-function-calls.ts`, `bbj-vscode/src/language/bbj-type-inferer.ts`

**Module-Level Type Inference:**
- Strategy: `TypeInferer` service is injected and used across validation, completion, and hover providers to infer types from expressions
- Constraint: Type inference is limited to safe, unambiguous cases (lexical suffixes, library signatures, simple assignments). Dynamic typing and context-sensitive inference are out of scope
- Files: `bbj-vscode/src/language/bbj-type-inferer.ts`

**Shared Language Server Across Platforms:**
- Strategy: Single `main.cjs` binary consumed by both VS Code and IntelliJ via LSP4IJ
- Constraint: Any platform-specific behavior (e.g., file paths, environment variables) must be negotiated through LSP and configuration, not compiled into the binary
- Files: `bbj-vscode/src/extension.ts` (VS Code), `bbj-intellij/` (IntelliJ plugin), `bbj-vscode/src/language/main.ts` (shared LS entry)

## Security Considerations

**Secret Environment Variable Hygiene:**
- Risk: Secret tokens (API keys, passwords) passed through `process.env` to child processes
- Mitigation: Tests verify that every child process launcher spreads `process.env` explicitly (not passed alone, which would strip PATH/BBJ_HOME). Secret-bearing builders are tested to ensure they pass env options correctly
- Files: `bbj-vscode/test/em-secret-env-channel.test.ts`, `bbj-vscode/src/extension.ts:506` (spreads env)

**Tokenized BBj File Format:**
- Risk: Binary BBj program files (`<<bbj>>` magic) can be decompiled on user request, potentially exposing obfuscated or protected source
- Mitigation: User is prompted before decompiling; read-only mode available as alternative. No automatic decompilation
- Files: `bbj-vscode/src/tokenized-bbj.ts`, `bbj-vscode/src/decompile-io.ts`

**EM Login and HTTP Connections:**
- Risk: Enterprise Manager URL (user setting) may be HTTP (not HTTPS); credentials sent over plaintext
- Mitigation: No direct credential handling in the LS; credentials are managed by VS Code's auth provider. EM login is a user-initiated workflow that delegates to EM's own security model
- Files: `bbj-vscode/src/extension.ts` (EM login handler)

## Dependencies at Risk

**Chevrotain 12.0 with Ambiguity Warnings:**
- Risk: Chevrotain 12.0 uses LLStar lookahead strategy, which emits ambiguity warnings for grammar positions where multiple alternatives are viable. These are benign (pre-existing, no false positives in practice) but noisy
- Mitigation: Warnings are suppressed via `overrideAmbiguityLogging()` in `bbj-module.ts:130`; debug mode shows details. A known pattern; not a defect
- Impact: None on correctness; improves log readability
- Status: Intentional design; see memory note: [[chevrotain-ambiguity-warnings-benign]]

**Langium 4.3.1 Tight Coupling:**
- Risk: Langium version is pinned; grammar changes require exact version match. Breaking changes in Langium would require full grammar and service rewrites
- Mitigation: Langium is stable; minor version updates are checked before applying. Major version upgrades are infrequent and require careful planning
- Files: `bbj-vscode/package.json` (dependency pinned to `~4.3.1`)
- Upgrade path: Test major Langium upgrades in a branch; require full test suite pass before applying

**Node >=22 Requirement:**
- Risk: Node 24 breaks `langium generate` (issue observed in Dependabot runs)
- Mitigation: Pinned to Node >=22 in `package.json:12`. CI and dev container use Node 22 explicitly
- Files: `bbj-vscode/package.json:12`
- Note: See memory note: [[dependabot-local-verification-gotchas]]

**VSCode Protocol Version Pinning:**
- Risk: `vscode-languageserver-protocol` is pinned to 3.18.2 via package overrides; mismatches with client version can cause compatibility issues
- Mitigation: Override in `package.json:719-721` ensures consistent protocol version between client and server
- Status: Intentional design; verified to be compatible with VS Code 1.101.0 and IntelliJ LSP4IJ

**BBj 26.03 Parser Endpoint (Future Dependency):**
- Risk: Requirements PSRV-01 through PSRV-09 (Phase 101+) introduce a dependency on BBj 26.03's parser endpoint. Older BBj versions (≤26.02) will lose compiler diagnostics
- Mitigation: Graceful degradation: with no endpoint available, the LS keeps all existing features (Java completion, save-time `bbjcpl` run). Probe the endpoint once per connection; do not retry or error
- Status: Pending implementation (Phase 101+)
- Files: Will be in `bbj-cpl-service.ts` (when implemented)

## Test Coverage Gaps

**Untested Java Method Overloading:**
- What's not tested: Multiple Java methods with the same name but different arities (e.g., `HashMap.put(K, V)`, `HashMap.put(Object, Object)`)
- Files: `bbj-vscode/test/javadoc.test.ts`, `bbj-vscode/src/language/java-javadoc.ts`
- Risk: Completion hints and hover documentation show wrong method signature
- Priority: Medium (affects Java integration quality)

**Class-Level USE Statement Linking:**
- What's not tested: Importing a type inside a `CLASS` body and using it in method signatures or field types
- Files: `bbj-vscode/test/linking.test.ts` (scope tests)
- Risk: Type resolution fails for class-scoped imports; false positives on method return types
- Priority: Medium (affects class-heavy codebases)

**Inherited Accessor Resolution:**
- What's not tested: Using a superclass field's auto-generated getter/setter in a derived class
- Files: `bbj-vscode/test/linking.test.ts`, `bbj-vscode/test/variable-scoping.test.ts`
- Risk: Inherited accessors are not resolved; field read/write fails in derived classes
- Priority: High (blocks object-oriented patterns)

**Concurrent Completion Across Multiple Documents:**
- What's not tested: Two documents triggering completion simultaneously with identical prefix; cache behavior with overlapping TTLs and requests
- Files: `bbj-vscode/test/completion-test.test.ts` (single-document tests only)
- Risk: Race condition in async cache (fixed by AsyncLocalStorage, but cache staleness edge cases may exist)
- Priority: Low (rare in practice; AsyncLocalStorage mitigates)

**Config Hot-Reload Edge Cases:**
- What's not tested: Rapid config changes while CPL validation is in-flight; config change during parser initialization
- Files: `bbj-vscode/test/config-hot-reload-wiring.test.ts` (does test debounce, but not all race scenarios)
- Risk: Diagnostic mismatch or missed config update
- Priority: Medium (affects configuration workflow)

**Interop Breaker State Machine:**
- What's not tested: Probe race conditions (half-open breaker receives multiple requests before probe completes); breaker state persistence across multiple connection attempts
- Files: `bbj-vscode/test/java-interop-breaker.test.ts`
- Risk: Breaker gets stuck open or cycles prematurely
- Priority: Low (breaker logic is robust, but edge cases possible)

## Missing Critical Features

**Empty-Bracket Array Form (PARSE-04):**
- What's missing: `name[]` syntax for whole-array reference in arguments, assignments, and print items
- Impact: Blocks: `CALL myFunc(arr[])`, `PRINT (chan) arr[]`, `myvar = othervar[]`
- Status: Pending (Phase 100)
- Files: Grammar `bbj-vscode/src/language/bbj.langium` (no `[]` syntax yet)

**Array Parameter Type Declarations (PARSE-05):**
- What's missing: `DREAD` into arrays, type declarations with brackets (`int[][] name!`), and parameter types like `BBjArray name[all]`
- Impact: Type inference and validation break on array method parameters and return types
- Status: Pending (Phase 100)
- Files: Grammar, type inferer

**Comments After Block Keywords (PARSE-06):**
- What's missing: `;` comments after `METHOD`, `METHODEND`, `CLASSEND`, `FNEND` headers; line-numbered class code
- Impact: Common coding style is rejected (false positive)
- Status: Pending (Phase 100)
- Files: Grammar lexer (line-break validation)

**Arbitrary Keywords as Names (PARSE-08, PARSE-09):**
- What's missing: Comprehensive audit of which BBj keywords can be used as names in which contexts; untracked files on list A (parser rejects but compiler accepts)
- Impact: Limits on variable/function naming reduce expressiveness
- Status: Pending (Phase 100)
- Files: Grammar, example files

**Compiler Parser Endpoint (PSRV-01 through PSRV-09):**
- What's missing: Integration with BBj 26.03's new parser endpoint for live syntax diagnostics, without requiring BBjCPL save-time run
- Impact: Type checking only works on save; real-time checking is LSP-only (conservative, limited to unambiguous types)
- Status: Pending (Phase 101-103, in separate `bbj-ls` repository)
- Files: `bbj-vscode/src/language/bbj-cpl-service.ts` (placeholder)

---

*Concerns audit: 2026-09-21*
