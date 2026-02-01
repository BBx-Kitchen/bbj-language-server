# Codebase Concerns

**Analysis Date:** 2026-02-01

## Tech Debt

**Orphaned AST Instances Workaround:**
- Issue: Hacky workaround in scope resolution for handling orphaned AST nodes
- Files: `bbj-vscode/src/language/bbj-scope.ts` (line 207)
- Code: Comment states "FIXME HACK for orphaned AST Instances"
- Impact: Code fragility; indicates underlying architecture issue with AST lifecycle management
- Fix approach: Investigate root cause of orphaned nodes in AST generation and resolve properly instead of working around

**Method Receiver Reference Resolution:**
- Issue: Deferred resolution to avoid unnecessary work
- Files: `bbj-vscode/src/language/bbj-linker.ts` (line 67)
- Code: Comment "FIXME try to not resolve receiver ref"
- Impact: Potential incomplete linking in complex expression trees
- Fix approach: Profile impact and determine if full resolution is necessary; document decision if skipping is intentional

**Unimplemented Binary File Handling:**
- Issue: Binary BBj files (tokenized format) are skipped with no actual parsing support
- Files: `bbj-vscode/src/language/bbj-ws-manager.ts` (line 131)
- Impact: Users cannot work with compiled/binary BBj files; feature incomplete
- Fix approach: Either implement binary file decompilation/parsing or document non-support clearly

**File System Access Tightly Coupled to OS Libraries:**
- Issue: Direct use of `fs` and `os` modules instead of abstracted FileSystemAccess
- Files: `bbj-vscode/src/language/bbj-ws-manager.ts` (lines 13-17)
- Impact: Reduces testability, platform abstraction not maintained, mixing concerns
- Fix approach: Extend FileSystemAccess service or create abstraction wrapper

**Incomplete Scope Resolution for Prefixes:**
- Issue: TODO to improve PREFIX folder resolution logic
- Files: `bbj-vscode/src/language/bbj-scope.ts` (lines 225-228)
- Impact: PREFIX path resolution is incomplete; may miss valid imports
- Fix approach: Complete implementation of project root relative path resolution as documented in TODO

## Known Bugs

**Parser Performance Flakiness:**
- Symptoms: Test timeout fluctuates significantly (5s to 48s)
- Files: `bbj-vscode/test/parser.test.ts` (line 41)
- Trigger: Unknown; appears intermittent
- Impact: Unreliable test execution; affects CI/CD confidence
- Workaround: None; tests use high timeout threshold (14s)
- Fix approach: Profile parser under various input sizes; identify performance bottleneck

**Cancelled Javadoc Provider Operation Not Re-triggered:**
- Symptoms: Javadoc provider fails silently when cancellation token is signaled
- Files: `bbj-vscode/src/language/java-javadoc.ts` (line 51)
- Code: Comment "FIXME will not be re-triggered return;"
- Impact: User won't receive javadoc unless they manually retry
- Fix approach: Implement proper retry mechanism for cancelled operations

**Newline Validation After Colon (Commented Out):**
- Symptoms: Validation test disabled/broken
- Files: `bbj-vscode/test/validation.test.ts` (lines 103-111)
- Trigger: Single-line statements after colon fail to validate
- Workaround: Test is skipped (commented out as FIXME)
- Fix approach: Debug and re-enable validation rule for single-line IF statements

## Security Considerations

**Default Credentials in Configuration:**
- Risk: VS Code settings expose default Enterprise Manager credentials
- Files: `bbj-vscode/package.json` (lines 299-309)
- Current mitigation: Defaults are obvious test credentials ("admin"/"admin123"), requiring user override
- Recommendations:
  - Document security implications clearly
  - Avoid storing any credentials in settings if possible
  - Use VS Code's secret storage API for sensitive config
  - Warn users if default credentials are detected

**Error Messages Exposed to Console:**
- Risk: Java interop connection failures and other errors logged to console without sanitization
- Files: `bbj-vscode/src/language/java-interop.ts` (lines 69, 309)
- Impact: Could leak path information or system details in shared environments
- Recommendations: Filter error messages; avoid logging sensitive paths

## Performance Bottlenecks

**Recursive Classpath Loading:**
- Problem: Java interop loads classpath entries sequentially with Promise.all, then processes classes linearly
- Files: `bbj-vscode/src/language/java-interop.ts` (lines 160-163)
- Impact: Large classpath entries block language server responsiveness
- Improvement path: Implement lazy loading; batch process classes; add progress reporting

**No Lazy Loading of Implicit Java Imports:**
- Problem: All implicit imports (java.lang, java.sql, etc.) loaded on workspace initialization
- Files: `bbj-vscode/src/language/java-interop.ts` (lines 156-175)
- Impact: Long startup time for workspaces with no Java interop needs
- Improvement path: Load only on-demand when Java class references appear

**Method Parameter Type Checking Incomplete:**
- Problem: Parameter types not checked against Javadoc
- Files: `bbj-vscode/src/language/java-interop.ts` (line 301)
- Impact: Code completion and type validation may be inaccurate for Java method parameters
- Improvement path: Extract and validate parameter types from Javadoc

**Method Overloading Not Handled:**
- Problem: Javadoc lookups don't distinguish overloaded methods
- Files: `bbj-vscode/src/language/java-javadoc.ts` (line 104)
- Impact: Incorrect documentation shown for overloaded methods; type hints may be wrong
- Improvement path: Add signature-based method lookup using parameter type information

## Fragile Areas

**Scope Resolution with Class File References:**
- Files: `bbj-vscode/src/language/bbj-scope.ts` (lines 218-235)
- Why fragile: Multiple path resolution strategies (same folder, PREFIX, project root) with fallback logic; case sensitivity issues mixed with case-insensitive matching
- Safe modification: Add comprehensive test coverage for each path resolution scenario before changes
- Test coverage: Partial; VERBs.md shows many unimplemented verbs with TODO status

**Java Interop Class Caching:**
- Files: `bbj-vscode/src/language/java-interop.ts` (lines 31-32, 52-104)
- Why fragile: Complex caching with locks and lazy-loaded maps; no cache invalidation strategy
- Safe modification: Document cache lifecycle; avoid modifying cache after initialization
- Test coverage: Limited testing of concurrent access patterns

**Grammar and AST Generation:**
- Files: `bbj-vscode/src/language/generated/grammar.ts` (11,687 lines), `bbj-vscode/src/language/generated/ast.ts` (3,956 lines)
- Why fragile: Generated code; manual edits lost on regeneration
- Safe modification: Only edit grammar source; regenerate with `langium:generate`
- Test coverage: Must be maintained manually via integration tests

**Test Fixtures Incomplete:**
- Files: `bbj-vscode/test/parser.test.ts` (multiple commented-out assertions)
- Why fragile: Many tests have disabled validation checks (//TODO expectNoValidationErrors)
- Safe modification: Enable one validation check at a time; debug before committing
- Test coverage: ~38 locations with disabled validation assertions

## Scaling Limits

**Langium Document Cache:**
- Current capacity: No documented limits; held entirely in memory
- Limit: Large workspaces (1000+ files) may cause memory pressure
- Scaling path: Implement document eviction policy; profile memory usage; add metrics

**Java Interop Classpath Size:**
- Current capacity: Loads all classes from classpath into memory on startup
- Limit: Large classpath entries (100+ packages) block initialization
- Scaling path: Implement lazy loading per-package; add progress UI; cache to disk

**Reference Linking Performance:**
- Current: All references linked synchronously during document load
- Limit: Documents with 1000+ references show noticeable lag
- Scaling path: Implement incremental linking; defer non-critical references; add cancellation support

## Dependencies at Risk

**Langium Framework:**
- Risk: Rapidly evolving framework (v3.2.1); breaking changes between minor versions
- Impact: Grammar changes may require significant rework
- Migration plan: Pin version; evaluate breaking changes before upgrade; maintain compatibility matrix

**Chevrotain Parser:**
- Risk: Parsing library complexity; custom grammar rules may be fragile
- Impact: Parser bugs difficult to diagnose; grammar evolution risky
- Migration plan: Document grammar rationale; maintain test coverage; consider Langium's built-in parser

**Deprecated Properties File Library:**
- Risk: `properties-file` v3.6.3 may have vulnerabilities
- Impact: Configuration parsing security issue
- Migration plan: Audit for CVEs; consider Node.js native solutions or maintained alternatives

## Missing Critical Features

**Binary File Support:**
- Problem: Tokenized BBj files (<<bbj>> format) are skipped entirely
- Blocks: Users cannot edit compiled programs; decompilation not implemented
- Impact: Feature gap for production BBj environments that use compiled files
- Priority: Medium (affects advanced workflows)

**Constructor Documentation:**
- Problem: Java constructor javadoc not extracted or displayed
- Blocks: New object creation hints unavailable
- Impact: Poor developer experience for Java interop
- Priority: Medium

**Static Code Analysis for Verbs:**
- Problem: 40+ BBj language verbs have TODO status (no validation)
- Blocks: Language validation incomplete; users get no feedback for invalid VERB usage
- Impact: High error rate in BBj programs; poor language support quality
- Priority: High (core feature incomplete)

## Test Coverage Gaps

**Validation Rules Untested:**
- What's not tested: Large portion of VERB validation; error parameter handling; complex scope scenarios
- Files: `bbj-vscode/test/parser.test.ts` (lines 453, 480, 498, 543, 591, 812, 857, 931, 985)
- Risk: Regressions in validation logic go undetected
- Priority: High (validation is critical)

**Java Interop Concurrency:**
- What's not tested: Concurrent class resolution; lock contention; cancellation under load
- Files: `bbj-vscode/src/language/java-interop.ts` (entire service)
- Risk: Race conditions in multi-threaded scenarios (workspace with many files)
- Priority: High (reliability issue)

**Binary File Parsing:**
- What's not tested: No tests for binary file handling (intentionally skipped)
- Files: `bbj-vscode/src/language/bbj-ws-manager.ts` (line 131)
- Risk: Future implementation will have no baseline tests
- Priority: Medium (depends on feature priority)

**Error Handling Paths:**
- What's not tested: Connection failure recovery; Java service unavailability; timeout handling
- Files: `bbj-vscode/src/language/java-interop.ts` (lines 59-75)
- Risk: Poor user experience when Java interop fails
- Priority: Medium

---

*Concerns audit: 2026-02-01*
