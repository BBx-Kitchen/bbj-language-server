# Phase 37: Console Migration - Research

**Researched:** 2026-02-08
**Domain:** TypeScript console.* to logger migration patterns and automation
**Confidence:** HIGH

## Summary

Phase 37 migrates all console.log/debug calls to the logger singleton (established in Phase 35) while preserving console.error calls untouched. The codebase contains 73 console method calls across 15 TypeScript files, with high-impact files being java-interop.ts (14 calls), bbj-ws-manager.ts (18 calls), bbj-scope-local.ts (5 calls), and main.ts (3 calls). The migration enables quiet startup by default (only essential summary lines) and verbose output on-demand (detailed class resolution, javadoc scanning) via the bbj.debug flag wired in Phase 36.

This is primarily a search-and-replace task with semantic awareness. The core challenge is mapping console method semantics to appropriate logger levels: console.log() represents general-purpose output (map to logger.info() for essential summaries, logger.debug() for verbose details), console.debug() is verbose/development-stage output (map to logger.debug()), console.warn() is non-critical warnings (map to logger.warn()), and console.error() is always-visible errors (keep as console.error() per Phase 35 constraints). The migration should prioritize high-impact files first to demonstrate value early.

**Primary recommendation:** Manual migration file-by-file (not automated codemod) due to semantic judgment required for each call site. Start with high-impact files (java-interop.ts, bbj-ws-manager.ts, bbj-scope-local.ts, main.ts), then expand to remaining files. Use grep to identify all console calls, evaluate each in context, migrate to appropriate logger level, and verify behavior with debug flag toggled on/off.

## Standard Stack

### Core Migration Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| grep/ripgrep | Built-in | Find all console.* call sites | Fast, accurate pattern matching for source analysis |
| TypeScript Compiler | 5.7.2 | Verify migration doesn't break types | Already in project, zero-cost verification |
| vitest | 2.1.8 | Test logger integration | Already in project for logger.test.ts |
| Manual inspection | N/A | Semantic analysis of each call site | Required for correct logger.info vs logger.debug mapping |

### Why Not Automated Codemod

**Evaluated:** jscodeshift, ts-morph, TypeScript compiler API for automated AST transformation

**Decision:** Manual migration preferred over automated codemod because:
1. **Semantic judgment required:** console.log() calls have different intents (essential summary vs verbose debugging) that require human context to distinguish
2. **Small scope:** 73 calls across 15 files is manageable manually (1-2 hours work)
3. **Mixed migration rules:** console.error() stays untouched while log/debug/warn migrate to different logger levels
4. **Testing burden:** Automated codemod requires extensive verification tests; manual migration verifies inline
5. **One-time operation:** Not recurring (unlike library API migrations that benefit from repeatability)

**When codemod would make sense:** If migrating 500+ files, or if this pattern recurs across multiple projects

## Architecture Patterns

### Recommended Migration Structure

```
Migration order (high-impact first):
1. bbj-vscode/src/language/java-interop.ts     (14 calls - class loading, javadoc scanning)
2. bbj-vscode/src/language/bbj-ws-manager.ts   (18 calls - workspace initialization)
3. bbj-vscode/src/language/bbj-scope-local.ts  (5 calls - type resolution)
4. bbj-vscode/src/language/main.ts             (3 calls - settings, Java interop reload)
5. Remaining files (bbj-scope.ts, bbj-linker.ts, bbj-document-builder.ts, etc.)
```

**Rationale:** High-impact files produce most startup noise. Migrating them first demonstrates immediate value (quiet startup, verbose on-demand) and validates the approach before expanding.

### Pattern 1: console.log() -> logger.info() vs logger.debug()

**What:** Map console.log() calls to appropriate logger level based on semantic intent

**When to use each:**
- **logger.info():** Essential summary information users should see by default (class count, config loaded, errors only)
- **logger.debug():** Verbose details helpful during debugging but noisy in production (individual class resolution, javadoc file paths)

**Decision criteria:**
```typescript
// Essential summary (appears with debug OFF) -> logger.info()
console.log(`BBj home: ${this.bbjdir}`);                          // logger.info()
console.log(`Java Classes ${loaded ? '' : 'not '}loaded`);        // logger.info()
console.log(`Loaded config.bbx from custom path: ${path}`);       // logger.info()

// Verbose debugging (appears only with debug ON) -> logger.debug()
console.log(`Java interop connection config: ${host}:${port}`);   // logger.debug()
console.log(`Initialization options received: ${JSON.stringify(opts)}`); // logger.debug()
console.debug(`Resolving class ${className}: ${methods.length} methods`); // logger.debug()
```

**Source:** Semantic meaning from MDN console documentation and LOG-02/LOG-03 requirements (quiet default, verbose on-demand)

### Pattern 2: console.debug() -> logger.debug()

**What:** Direct 1:1 mapping for console.debug() calls

**Example:**
```typescript
// Before
console.debug(`Resolving class ${className}: ${javaClass.methods?.length ?? 0} methods`);

// After
logger.debug(`Resolving class ${className}: ${javaClass.methods?.length ?? 0} methods`);
```

**Rationale:** console.debug() semantics match logger.debug() exactly (verbose, development-stage, hidden by default in production)

**Source:** Browser behavior analysis — console.debug() hidden by default in Chrome DevTools unless "Verbose" filter enabled

### Pattern 3: console.warn() -> logger.warn()

**What:** Direct 1:1 mapping for console.warn() calls

**Example:**
```typescript
// Before
console.warn(`Java '${javaClassName}' class resolution error: ${javaClass.error}`);

// After
logger.warn(`Java '${javaClassName}' class resolution error: ${javaClass.error}`);
```

**Rationale:** Warnings are important but non-critical (should appear when debug is OFF but suppressed during quiet startup at ERROR level)

### Pattern 4: console.error() -> KEEP UNTOUCHED

**What:** Do NOT migrate console.error() calls to logger

**Rationale (from Phase 35 constraints):**
- console.error() is guaranteed visible regardless of log level
- Direct to stderr (synchronous, works before LSP initialization)
- Logger abstraction adds unnecessary indirection for critical errors
- logger.error() exists for API completeness but wraps console.error() internally

**Example:**
```typescript
// DO NOT CHANGE
console.error('Failed to connect to the Java service.', e);
console.error(`Java class ${className} has no container`);
```

### Pattern 5: Lazy Evaluation for Expensive String Construction

**What:** Use callback form for expensive string interpolation or JSON.stringify operations

**When to use:**
```typescript
// Simple string literal (no overhead) -> direct form
logger.debug('Loading classpath');

// String interpolation with cheap variable access -> direct form
logger.debug(`Loading ${count} classes`);

// Expensive operations (JSON.stringify, array.join, object property traversal) -> callback form
logger.debug(() => `Initialization options received: ${JSON.stringify(params.initializationOptions)}`);
logger.debug(() => `Load classpath from: ${classPath.join(', ')}`);
logger.debug(() => `Resolving class ${className}: ${javaClass.methods?.length ?? 0} methods, ${javaClass.fields?.length ?? 0} fields`);
```

**Rationale:** Callback prevents execution when logger is suppressed (zero overhead at WARN/ERROR level)

**Source:** logger.ts implementation (lines 17-19, 31-35) — evaluateMessage() only invoked when level threshold met

### Anti-Patterns to Avoid

- **Over-using callbacks for simple strings:** `logger.debug(() => 'simple message')` adds noise without benefit
- **Mixing console and logger in same file:** Creates inconsistent verbosity (some output respects debug flag, some doesn't)
- **Migrating console.error():** Violates Phase 35 constraint (errors must always be visible)
- **Incorrect level choice:** Using logger.debug() for essential summary info forces users to enable verbose mode for basic feedback

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AST parsing for codemod | Custom regex on source text | jscodeshift or ts-morph (if automation needed) | Regex can't handle syntax edge cases (template literals, multiline calls, comments) |
| Logger level abstraction | Custom log level enum | Existing LogLevel enum from logger.ts | Already defined, tested, and integrated with settings |
| Timestamp formatting | Custom Date formatting logic | Existing logger ISO 8601 implementation | Already handles DEBUG-only timestamps per Phase 35 |
| Find/replace automation | Custom Node.js script | ripgrep + manual verification | 73 calls is small enough for manual migration, avoids false positives |

**Key insight:** For 73 console calls across 15 files, manual migration with grep-assisted discovery is faster and more reliable than building automation infrastructure.

## Common Pitfalls

### Pitfall 1: Migrating Console Calls in Test Files

**What goes wrong:** Test files may use console.log() for debugging test failures or displaying test output; migrating these breaks test readability

**Why it happens:** Grep finds all console calls including test files; planner creates migration tasks without distinguishing production vs test code

**How to avoid:**
1. Identify test files before migration (bbj-vscode/test/*.test.ts)
2. Skip console migration in test files UNLESS they're testing logger behavior
3. Test files can use console directly (tests run in Node.js with full console output visible)

**Warning signs:**
- Migration plan includes test/parser.test.ts or test/javadoc.test.ts
- Test output becomes unreadable after migration

**Source:** test/logger.test.ts uses console spies (vi.spyOn(console, 'log')) which rely on raw console, not logger abstraction

### Pitfall 2: Incorrect Level Choice for Startup Summary Lines

**What goes wrong:** Migrating essential summary output (e.g., "BBj home: /path/to/bbj") to logger.debug() means users with debug OFF see nothing, even after quiet startup completes

**Why it happens:** All console.log() calls look similar; planner doesn't distinguish "always show this summary" from "verbose debugging details"

**How to avoid:**
- Essential summary lines (config paths, class counts, success/failure status) -> logger.info()
- Verbose details (individual class names, JSON dumps, intermediate steps) -> logger.debug()
- Post-startup level is WARN (debug off) or DEBUG (debug on), so info() ensures visibility in both modes

**Warning signs:**
- User turns debug OFF and sees NO output after startup (expected: summary lines only)
- User complaints: "I don't know if language server loaded successfully without debug mode"

**Source:** LOG-02 requirement — "startup output shows only essential summary lines when debug is off"

### Pitfall 3: Not Importing logger in Migration Files

**What goes wrong:** TypeScript compilation fails with "Cannot find name 'logger'" after migration

**Why it happens:** Migration adds logger.info() calls but forgets to add import statement at top of file

**How to avoid:**
```typescript
// Add this import at top of EVERY file that uses logger
import { logger } from './logger.js';

// For scoped loggers, also import:
// const scopedLogger = logger.scoped('component-name');
```

**Warning signs:**
- TypeScript compilation error: "Cannot find name 'logger'"
- VSCode red squiggles under logger references

**Source:** Standard TypeScript ES6 module import pattern

### Pitfall 4: Lazy Evaluation Syntax Errors

**What goes wrong:** Using arrow function callback with incorrect syntax breaks compilation or runtime

**Why it happens:** Callback form is `() => string` but developer writes `() => { return string }` (block body requires explicit return) or forgets arrow

**How to avoid:**
```typescript
// CORRECT: Implicit return (no braces)
logger.debug(() => `Load classpath from: ${classPath.join(', ')}`);

// WRONG: Block body without return
logger.debug(() => { `Load classpath from: ${classPath.join(', ')}` });

// WRONG: Missing arrow function wrapper
logger.debug(`Load classpath from: ${classPath.join(', ')}`); // Still executes join() even when suppressed
```

**Warning signs:**
- TypeScript error: "Type 'void' is not assignable to type 'string'"
- String interpolation still runs when debug is OFF (performance regression)

**Source:** TypeScript arrow function syntax and logger.ts LogMessage type (string | (() => string))

### Pitfall 5: Breaking Existing Console.error() Behavior

**What goes wrong:** Migrating console.error() to logger.error() changes output timing (logger adds indirection) or breaks error visibility guarantees

**Why it happens:** Planner sees "migrate all console calls" and includes console.error() in scope

**How to avoid:**
- Explicitly exclude console.error() from migration scope
- Phase 35 constraint: "console.error() calls stay raw — not migrated to the logger"
- Verification step: grep for logger.error() in production code should find ZERO occurrences (only in tests)

**Warning signs:**
- Production code contains logger.error() calls
- Critical errors disappear when debug mode is OFF (shouldn't happen with console.error)

**Source:** Phase 35 CONTEXT.md decision: "console.error() calls stay raw"

## Code Examples

### Example 1: Migrating java-interop.ts Class Loading Output

**Before:**
```typescript
public async loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
    console.warn("Load classpath from: " + classPath.join(', '))
    try {
        // ... implementation
        console.debug("Loaded " + this.classpath.classes.length + " classes")
    } catch (e) {
        console.error(e)
        return false;
    }
}
```

**After:**
```typescript
import { logger } from './logger.js';

public async loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
    logger.debug(() => `Load classpath from: ${classPath.join(', ')}`)
    try {
        // ... implementation
        logger.debug(() => `Loaded ${this.classpath.classes.length} classes`)
    } catch (e) {
        console.error(e)  // KEEP UNTOUCHED
        return false;
    }
}
```

**Changes:**
1. Add import statement at top of file
2. console.warn() -> logger.debug() (verbose classpath details, use lazy callback for array.join())
3. console.debug() -> logger.debug() with template literal (verbose class count)
4. console.error() stays untouched (critical error, always visible)

**Source:** Actual code from java-interop.ts lines 158-173, 200

### Example 2: Migrating bbj-ws-manager.ts Startup Summary

**Before:**
```typescript
console.log(`BBj home: ${this.bbjdir}`);
console.log(`Classpath from settings: ${this.classpathFromSettings}`);
console.log(`Java Classes ${loaded ? '' : 'not '}loaded`);
```

**After:**
```typescript
import { logger } from './logger.js';

logger.info(`BBj home: ${this.bbjdir}`);
logger.info(`Classpath from settings: ${this.classpathFromSettings}`);
logger.info(`Java Classes ${loaded ? '' : 'not '}loaded`);
```

**Changes:**
1. Add import statement at top of file
2. console.log() -> logger.info() (essential summary, should be visible with debug OFF)
3. No lazy evaluation needed (simple variable interpolation, not expensive)

**Rationale:** These are essential summary lines users need to see after quiet startup completes (LOG-02 requirement)

**Source:** Actual code from bbj-ws-manager.ts lines 42-43, 136

### Example 3: Migrating main.ts Settings Change Notification

**Before:**
```typescript
console.log('BBj settings changed, refreshing Java classes...');
```

**After:**
```typescript
import { logger } from './logger.js';

logger.info('BBj settings changed, refreshing Java classes...');
```

**Changes:**
1. Add import statement at top of file
2. console.log() -> logger.info() (user-initiated action feedback, should be visible)

**Rationale:** When user changes settings in IDE, they expect visible feedback that the change took effect

**Source:** Actual code from main.ts line 120

### Example 4: Migrating Verbose Initialization Details

**Before:**
```typescript
console.log('Initialization options received:', JSON.stringify(params.initializationOptions));
console.debug(`JavaDoc provider initialize ${wsJavadocFolders}`);
```

**After:**
```typescript
import { logger } from './logger.js';

logger.debug(() => `Initialization options received: ${JSON.stringify(params.initializationOptions)}`);
logger.debug(`JavaDoc provider initialize ${wsJavadocFolders}`);
```

**Changes:**
1. Add import statement at top of file
2. console.log() with JSON.stringify -> logger.debug() with lazy callback (expensive operation)
3. console.debug() -> logger.debug() (direct mapping)

**Rationale:** Initialization details are verbose debugging info (only show with debug ON)

**Source:** Actual code from bbj-ws-manager.ts lines 34, 115

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw console.* everywhere | Level-based logger abstraction | Logger frameworks since ~2010 | Enables quiet startup, on-demand verbosity, no code changes to toggle |
| console.log() for all output | Semantic levels (info/debug/warn/error) | Best practice since ~2015 | Clearer intent, better filtering, easier debugging |
| Always-on verbose logging | Lazy evaluation callbacks | Modern logger libraries (2020+) | Zero overhead when logging suppressed (no string interpolation) |
| Manual find/replace migration | AST-based codemods (jscodeshift) | Facebook/Meta codemods (2015+) | Automation for large-scale migrations (500+ files) |

**Deprecated/outdated:**
- **Global console.log() debugging:** Modern practice uses level-based logging with runtime toggling
- **String interpolation without guards:** Lazy evaluation prevents performance overhead in production
- **No distinction between production and debug output:** Semantic levels (info vs debug) clarify intent

## Open Questions

### 1. Should test files migrate console calls to logger?

**What we know:**
- Test files (test/*.test.ts) contain console.log() calls for debugging test failures
- logger.test.ts specifically tests logger behavior by spying on console methods
- Production code (src/**/*.ts) is the primary migration target

**What's unclear:**
- Do test console calls interfere with test runner output?
- Would migrating test console calls improve consistency?

**Recommendation:**
- EXCLUDE test files from migration (keep console.* as-is)
- Test files run in Node.js with full console output visible
- Console spies in tests rely on raw console, not logger abstraction
- Only migrate test files if they're testing production logger integration (already done in logger.test.ts)

**Trade-off:** Slight inconsistency (tests use console, production uses logger) but simpler migration and preserved test debuggability

### 2. Should extension.ts (client-side) console calls be migrated?

**What we know:**
- extension.ts runs in VS Code extension host (browser-like environment)
- Language server logger is server-side only (Node.js process)
- extension.ts has 1 console call (likely for extension activation debugging)

**What's unclear:**
- Should client-side code use same logger abstraction?
- Does VS Code provide client-side logging API we should use instead?

**Recommendation:**
- EXCLUDE extension.ts from migration (keep console.* as-is)
- Client-side and server-side are separate processes with different logging needs
- VS Code extension host console output goes to "Output" panel (different from LSP server stderr)
- Future work: Consider VS Code's OutputChannel API for structured client logging

**Trade-off:** Client and server use different logging mechanisms, but this reflects their different runtime environments

### 3. What order should files be migrated within a single plan?

**What we know:**
- High-impact files identified: java-interop.ts, bbj-ws-manager.ts, bbj-scope-local.ts, main.ts
- Remaining 11 files have lower console call counts

**What's unclear:**
- Should all files be migrated in a single plan (one big change)?
- Or split into multiple plans (iterative approach with validation between)?

**Recommendation:**
- Single plan with file-by-file tasks (atomic commits per file for rollback safety)
- Order: high-impact first (immediate value), then alphabetical (predictable)
- Verification after each file migration (TypeScript compile + test suite)

**Trade-off:** Longer single plan vs multiple smaller plans (single plan preferred for simpler coordination)

## Sources

### Primary (HIGH confidence)

- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/logger.ts` — Logger API surface, LogLevel enum, lazy evaluation implementation
- `/Users/beff/_workspace/bbj-language-server/.planning/phases/35-logger-infrastructure/35-RESEARCH.md` — Logger architecture decisions and constraints
- `/Users/beff/_workspace/bbj-language-server/.planning/phases/36-settings-plumbing/36-RESEARCH.md` — Settings integration for bbj.debug flag
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/test/logger.test.ts` — Logger test patterns and vitest usage
- Console method call counts from grep analysis (73 calls across 15 files)
- Actual console call sites from java-interop.ts, bbj-ws-manager.ts, bbj-scope-local.ts, main.ts
- Phase 37 requirements from ROADMAP.md (LOG-02, LOG-03, LOG-04)

### Secondary (MEDIUM confidence)

- [MDN Console API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/console) — Semantic meaning of console.log/debug/info/warn/error
- [Hover Console: console.info() vs console.log()](https://hoverconsole.com/console-info-vs-console-log) — Browser behavior differences
- [Medium: Why Console.Debug is sometimes better than Console.Log](https://sebastian-rogers.medium.com/why-console-debug-is-sometimes-better-than-console-log-953226a067db) — console.debug() semantics and filtering
- [Martin Fowler: Refactoring with Codemods to Automate API Changes](https://martinfowler.com/articles/codemods-api-refactoring.html) — Codemod automation patterns
- [Toptal: Refactoring With Codemods and jscodeshift](https://www.toptal.com/javascript/write-code-to-rewrite-your-code) — AST-based refactoring with jscodeshift
- [dhiwise: A Step-by-Step Guide to Using jscodeshift with TypeScript](https://www.dhiwise.com/post/the-ultimate-guide-to-using-jscodeshift-with-typescript) — TypeScript codemod implementation
- [DEV Community: Implementing logging with metadata - Pure DI in TypeScript](https://dev.to/vad3x/implementing-logger-with-metadata-24dj) — TypeScript logger patterns
- [tslog.js.org](https://tslog.js.org/) — Modern TypeScript logger example (evaluated but not used)

### Tertiary (LOW confidence)

None — research based on codebase analysis and authoritative documentation only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Built-in tools (grep, TypeScript compiler, vitest) already in project
- Architecture patterns: HIGH — Logger API defined and tested in Phase 35, console call sites verified via grep
- Migration approach: HIGH — Manual migration justified by small scope (73 calls), semantic judgment required
- Pitfalls: HIGH — Based on direct code analysis and Phase 35 constraints
- Codemod evaluation: MEDIUM — Evaluated based on documentation, not hands-on implementation

**Research date:** 2026-02-08
**Valid until:** ~30 days (stable domain — logger API frozen, console migration is one-time operation)

**Key findings:**
1. 73 console method calls across 15 TypeScript files (14 source, 1 test-related)
2. High-impact files: java-interop.ts (14), bbj-ws-manager.ts (18), bbj-scope-local.ts (5), main.ts (3)
3. Console semantics: log (general), debug (verbose), info (informational), warn (non-critical), error (critical)
4. Logger migration rules: log->info/debug (context-dependent), debug->debug (1:1), warn->warn (1:1), error->UNCHANGED
5. Manual migration preferred over codemod (small scope, semantic judgment required, one-time operation)
6. Lazy evaluation callbacks required for expensive operations (JSON.stringify, array.join, object traversal)
7. Test files excluded from migration (preserve test debuggability, console spies rely on raw console)
8. Phase 35 constraint: console.error() stays untouched (guaranteed visibility, no logger abstraction)
