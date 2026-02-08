# Phase 35: Logger Infrastructure - Research

**Researched:** 2026-02-08
**Domain:** TypeScript singleton logger with zero-overhead lazy evaluation
**Confidence:** HIGH

## Summary

This phase creates a lightweight logger singleton (~60 lines) for level-based logging with zero overhead when disabled. The implementation uses ES6 module-scoped singleton pattern (not class-based getInstance), numeric enum for log levels with O(1) comparison, and lazy message evaluation via arrow function callbacks. The logger wraps Node.js console methods (console.log/warn/error) which write to stdout/stderr respectively, with stderr being synchronous and always visible.

The research confirms that ES6 modules are naturally singletons (cached by the runtime), numeric enums provide zero-overhead level comparison, and lazy evaluation via callbacks prevents string interpolation when logging is disabled. The 60-line constraint is achievable with a single-file implementation containing LogLevel enum, main logger instance, and scoped logger factory.

**Primary recommendation:** Use ES6 module-scoped singleton with numeric enum (not const enum for better debuggability), export named functions and instance, implement lazy evaluation via union type (string | () => string) to preserve ergonomics while enabling zero-overhead for expensive computations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Output format
- No level prefix on log lines (no `[INFO]`, `[WARN]` etc.)
- Timestamps included in debug mode only (when level is DEBUG)
- Component tag on debug messages via scoped loggers (e.g. `[java-interop] Loading classes...`)
- Non-debug messages (info, warn, error) are plain text without tags

#### Log level defaults
- Default level before settings load: ERROR only (quietest possible startup)
- After settings load with debug OFF: WARN (warnings and errors visible)
- After settings load with debug ON: DEBUG (everything visible)
- Simple toggle: `bbj.debug` boolean maps to WARN (off) or DEBUG (on) — no intermediate level setting
- Logger announces level changes (e.g. "Log level changed to DEBUG") when level is updated

#### API surface
- Singleton logger with `info()`, `warn()`, `error()`, `debug()` methods
- Lazy message evaluation via callback form: `logger.debug(() => \`Found ${classes.length} classes\`)` — lambda only runs if DEBUG is on
- Scoped logger factory: `logger.scoped('java-interop')` returns a child logger that prepends component tag to debug messages
- Scoped loggers expose debug-level methods only (debug output is where component tags matter)
- Level check methods: `logger.isDebug()` for conditional blocks with multiple debug statements
- `setLevel()` method for runtime level changes

#### Error handling
- `console.error()` calls stay raw — not migrated to the logger (guaranteed visible, no abstraction)
- `logger.error()` exists for API completeness — always emits regardless of level
- `logger.warn()` is filtered by level (suppressed during quiet startup when level is ERROR)
- Logger uses `console.error()` under the hood for error output (direct to stderr, works before LSP connection)

### Claude's Discretion

- Exact scoped logger implementation (thin wrapper vs class)
- How timestamps are formatted in debug mode
- File organization (single file vs split types/implementation)
- Whether `logger.info()` uses `console.log()` or `console.info()` under the hood

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

No external dependencies required. Uses built-in Node.js and TypeScript features.

| Library/Feature | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| ES6 Modules | Built-in | Module-scoped singleton pattern | Native to JavaScript, cached by runtime, zero overhead |
| TypeScript Numeric Enum | Built-in | Log level constants with O(1) comparison | Compile-time safety, runtime efficiency, debuggable |
| Node.js console | Built-in | Output to stdout/stderr | Universal, synchronous stderr, works before LSP initialization |

### Why No External Logger Framework

**Decision rationale from STATE.md:** Existing `vscode-languageserver` provides all needed logging features; Pino/Winston add 200KB-1MB+ bundle size for features LSP already provides.

**Research validation:** Modern TypeScript logging libraries (logan-logger-ts, tslog, LogLayer) provide features beyond our needs (structured logging, log levels beyond 4, transport abstractions, buffering). Our 60-line implementation achieves zero-overhead via lazy evaluation without dependencies.

## Architecture Patterns

### Recommended Project Structure

```
bbj-vscode/src/language/
├── logger.ts              # Single file implementation (~60 lines)
└── (existing files)
```

Single-file approach is sufficient given the small scope.

### Pattern 1: ES6 Module-Scoped Singleton

**What:** Export a singleton instance created at module scope, not via class getInstance() pattern

**When to use:** When the singleton needs to work immediately (before dependency injection containers initialize) and has simple initialization

**Why preferred over class-based:**
- ES6 modules are naturally singletons (cached by runtime)
- No boilerplate getInstance() method
- Better tree-shaking
- Simpler initialization (runs at module load time)

**Example:**
```typescript
// logger.ts

// Enum for log levels
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Module-scoped singleton state
let currentLevel: LogLevel = LogLevel.ERROR;

// Main logger implementation
const logger = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
    console.log(`Log level changed to ${LogLevel[level]}`);
  },

  isDebug(): boolean {
    return currentLevel >= LogLevel.DEBUG;
  },

  debug(message: string | (() => string)): void {
    if (currentLevel >= LogLevel.DEBUG) {
      const msg = typeof message === 'function' ? message() : message;
      console.log(msg);
    }
  },

  // ... other methods
};

// Named exports
export { logger, LogLevel };
```

**Source:** Based on [ES6 singleton pattern: module default exports an instance](https://gist.github.com/dmnsgn/4a6ad76de1b5928f13f68f406c70bb09) and [Stop Writing Singleton Classes: Use ES6 Modules](https://dev.to/saiful__bashar/stop-writing-singleton-classes-use-es6-modules-the-typescript-way-29kj)

### Pattern 2: Lazy Message Evaluation via Union Type

**What:** Accept either a string or a callback returning a string, only evaluate callback if logging is enabled

**When to use:** When log messages contain expensive string interpolation or computations

**Why:** Zero overhead when logging is disabled — callback never executes, template literal never evaluates

**Example:**
```typescript
type LogMessage = string | (() => string);

function debug(message: LogMessage): void {
  if (currentLevel >= LogLevel.DEBUG) {
    // Only evaluate if DEBUG is enabled
    const msg = typeof message === 'function' ? message() : message;
    console.log(msg);
  }
}

// Usage - callback only runs if DEBUG is on
logger.debug(() => `Found ${classes.length} classes`);
logger.debug('Simple message'); // String works too
```

**Source:** Pattern informed by [What is lazy evaluation in TypeScript?](https://www.educative.io/answers/what-is-lazy-evaluation-in-typescript) and [MatrixAI/js-logger lazy evaluation properties](https://github.com/MatrixAI/js-logger)

### Pattern 3: Scoped Logger Factory

**What:** Factory function that returns a logger wrapper prepending component tag

**When to use:** For component-specific logging where you want to identify the source

**Implementation options:**

**Option A: Object with debug method only (simpler)**
```typescript
function scoped(component: string) {
  return {
    debug(message: LogMessage): void {
      if (currentLevel >= LogLevel.DEBUG) {
        const msg = typeof message === 'function' ? message() : message;
        console.log(`[${component}] ${msg}`);
      }
    }
  };
}
```

**Option B: Class instance (more extensible)**
```typescript
class ScopedLogger {
  constructor(private component: string) {}

  debug(message: LogMessage): void {
    if (currentLevel >= LogLevel.DEBUG) {
      const msg = typeof message === 'function' ? message() : message;
      console.log(`[${component}] ${msg}`);
    }
  }
}

function scoped(component: string): ScopedLogger {
  return new ScopedLogger(component);
}
```

**Recommendation:** Option A (object) — simpler, fewer lines, sufficient for single-method interface

### Pattern 4: Timestamp Formatting in Debug Mode

**What:** Include ISO 8601 timestamp on debug messages only

**Implementation:**
```typescript
function formatTimestamp(): string {
  return new Date().toISOString();
}

function debug(message: LogMessage): void {
  if (currentLevel >= LogLevel.DEBUG) {
    const msg = typeof message === 'function' ? message() : message;
    console.log(`[${formatTimestamp()}] ${msg}`);
  }
}
```

**Performance:** `Date.prototype.toISOString()` is fast (native implementation), but only called when DEBUG is enabled, so overhead is acceptable.

**Source:** [Date.prototype.toISOString() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)

### Anti-Patterns to Avoid

- **const enum:** While slightly faster, regular enum provides better debuggability and compatibility with `isolatedModules` (which may be used in IntelliJ LSP4IJ builds)
- **Class-based getInstance():** Unnecessary boilerplate; ES6 modules are already singletons
- **String interpolation outside callback:** `logger.debug(\`Found ${x}\`)` evaluates template before calling debug — use callback form instead
- **Abstracting console.error():** Keep raw console.error() calls for critical failures to guarantee visibility

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log transport/formatting frameworks | Custom Pino/Winston equivalent | Built-in console methods | LSP already handles log routing; 200KB+ dependency for unused features |
| Timestamp libraries | Custom date formatter | `Date.prototype.toISOString()` | Native, fast, standards-compliant ISO 8601 |
| Level filtering in settings | Custom config parser | Direct boolean mapping | CONTEXT.md specifies `bbj.debug` boolean maps to WARN/DEBUG |

**Key insight:** This is infrastructure glue code, not a general-purpose logging framework. Optimize for simplicity and zero dependencies.

## Common Pitfalls

### Pitfall 1: Forgetting lazy evaluation for expensive messages

**What goes wrong:** Logger methods receive pre-evaluated strings with expensive interpolation

**Why it happens:** Natural TypeScript syntax encourages template literals as arguments

**How to avoid:**
- Accept union type `string | (() => string)` for ergonomics
- Document callback form in API examples
- Use callback form for any message with template literals containing variable access

**Warning signs:**
- Performance degradation even when debug is OFF
- High CPU on string operations in profiler when logging disabled

**Example:**
```typescript
// BAD - classes.length evaluated even when DEBUG is off
logger.debug(`Found ${classes.length} classes`);

// GOOD - callback only runs if DEBUG is on
logger.debug(() => `Found ${classes.length} classes`);
```

### Pitfall 2: Using const enum in TypeScript projects with multiple build targets

**What goes wrong:** const enums are inlined at compile time, breaking cross-module references with `isolatedModules`

**Why it happens:** const enum values are erased from .d.ts files

**How to avoid:** Use regular numeric enum unless bundle size is critical (not the case here — 4 enum values)

**Warning signs:**
- Build errors in IntelliJ LSP4IJ integration
- "Cannot access ambient const enums when 'isolatedModules' is enabled" error

**Source:** [TypeScript: Handbook - Enums](https://www.typescriptlang.org/docs/handbook/enums.html) on const enum limitations

### Pitfall 3: Mixing stdout and stderr assumptions

**What goes wrong:** Assuming console.log and console.error both write asynchronously

**Why it happens:** Misunderstanding Node.js console stream behavior

**How to avoid:**
- Use console.error() for ERROR level (synchronous, always visible)
- Use console.log() for INFO/DEBUG (asynchronous, buffered)
- Use console.warn() or console.error() for WARN (stderr is synchronous)

**Warning signs:**
- Log messages appearing out of order
- Missing error messages in crash scenarios

**Source:** [Node.js Console Documentation](https://nodejs.org/api/console.html) — stderr writes are synchronous, stdout writes may be asynchronous

### Pitfall 4: Not announcing level changes

**What goes wrong:** Users change debug setting but see no feedback, unclear if it took effect

**Why it happens:** Silent level updates feel like broken functionality

**How to avoid:** Always log level changes at the new level (so users see confirmation)

**Example:**
```typescript
function setLevel(level: LogLevel): void {
  currentLevel = level;
  // Use console.log directly to ensure message appears
  console.log(`Log level changed to ${LogLevel[level]}`);
}
```

## Code Examples

Verified patterns from official sources:

### Numeric Enum for Log Levels

```typescript
// Regular enum (NOT const enum) for better debuggability
enum LogLevel {
  ERROR = 0,  // Only errors
  WARN = 1,   // Errors + warnings
  INFO = 2,   // Errors + warnings + info
  DEBUG = 3   // Everything
}

// Efficient numeric comparison (O(1), no function call overhead)
if (currentLevel >= LogLevel.DEBUG) {
  // ... log debug message
}
```

**Source:** [TypeScript: Handbook - Enums](https://www.typescriptlang.org/docs/handbook/enums.html) — numeric enums compile to simple number constants

### Lazy Evaluation with Arrow Functions

```typescript
type LogMessage = string | (() => string);

function debug(message: LogMessage): void {
  if (currentLevel >= LogLevel.DEBUG) {
    // typeof check is O(1), callback only runs if DEBUG is on
    const msg = typeof message === 'function' ? message() : message;
    console.log(msg);
  }
}

// Usage
logger.debug('Static message');
logger.debug(() => `Dynamic: ${expensiveComputation()}`);
```

**Source:** [Arrow function expressions - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) and [What is lazy evaluation in TypeScript?](https://www.educative.io/answers/what-is-lazy-evaluation-in-typescript)

### Complete Minimal Logger (~60 lines)

```typescript
// logger.ts

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

type LogMessage = string | (() => string);

let currentLevel: LogLevel = LogLevel.ERROR; // Default: quietest

function formatTimestamp(): string {
  return new Date().toISOString();
}

function evaluateMessage(message: LogMessage): string {
  return typeof message === 'function' ? message() : message;
}

const logger = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
    console.log(`Log level changed to ${LogLevel[level]}`);
  },

  isDebug(): boolean {
    return currentLevel >= LogLevel.DEBUG;
  },

  debug(message: LogMessage): void {
    if (currentLevel >= LogLevel.DEBUG) {
      const msg = evaluateMessage(message);
      console.log(`[${formatTimestamp()}] ${msg}`);
    }
  },

  info(message: LogMessage): void {
    if (currentLevel >= LogLevel.INFO) {
      console.log(evaluateMessage(message));
    }
  },

  warn(message: LogMessage): void {
    if (currentLevel >= LogLevel.WARN) {
      console.warn(evaluateMessage(message));
    }
  },

  error(message: LogMessage): void {
    // Always emit, even at ERROR level
    console.error(evaluateMessage(message));
  },

  scoped(component: string) {
    return {
      debug(message: LogMessage): void {
        if (currentLevel >= LogLevel.DEBUG) {
          const msg = evaluateMessage(message);
          console.log(`[${formatTimestamp()}] [${component}] ${msg}`);
        }
      }
    };
  }
};

export { logger, LogLevel };
```

**Line count:** ~60 lines including blank lines and formatting

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based singleton with getInstance() | ES6 module-scoped singleton | ~2015 (ES6 adoption) | Simpler code, natural caching, better tree-shaking |
| String concatenation for lazy eval | Arrow function callbacks with union types | ~2016 (arrow functions mainstream) | Zero overhead, type-safe, ergonomic |
| const enum for performance | Regular enum for compatibility | Ongoing (isolatedModules awareness) | Better cross-module compatibility, minimal performance difference |
| External logging frameworks (Winston, Pino) | Minimal custom loggers for LSP | 2020+ (bundle size awareness) | Smaller bundles, fewer dependencies, faster installs |

**Deprecated/outdated:**
- **Class-based singleton:** Still works but unnecessary boilerplate with ES6 modules
- **const enum:** Problematic with isolatedModules, not worth micro-optimization for 4 values
- **Heavy logging frameworks in LSP context:** vscode-languageserver already handles log routing

## Open Questions

### 1. Should scoped loggers have a parent reference for level checking?

**What we know:** Scoped loggers need to check currentLevel to filter messages

**What's unclear:** Whether scoped logger closures sufficiently capture currentLevel or need explicit parent reference

**Recommendation:** Closure approach is sufficient — `currentLevel` is module-scoped, accessible in nested functions. No parent reference needed.

### 2. Should info() use console.log() or console.info()?

**What we know:**
- Both write to stdout
- console.info() is semantically clearer
- console.log() is more commonly used

**What's unclear:** Performance difference (if any) and best practice in Node.js LSP context

**Recommendation:** Use console.log() for consistency with debug() output. Semantic distinction between info/log is minimal in practice.

**Sources:** [Node.js Console Documentation](https://nodejs.org/api/console.html) shows console.info() is an alias for console.log()

### 3. Should timestamps use full ISO 8601 or simplified format?

**What we know:**
- ISO 8601 via toISOString() is standard: "2026-02-08T14:30:45.123Z"
- Simplified format like "14:30:45.123" is more readable

**What's unclear:** User preference and whether timezone info matters

**Recommendation:** Use full ISO 8601 (toISOString()) — unambiguous, parseable, standard. Readability is secondary for debug output.

## Sources

### Primary (HIGH confidence)

- [TypeScript: Handbook - Enums](https://www.typescriptlang.org/docs/handbook/enums.html) — enum vs const enum, numeric comparison performance
- [Node.js Console Documentation](https://nodejs.org/api/console.html) — console methods, stdout/stderr behavior
- [Date.prototype.toISOString() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) — timestamp formatting
- [Arrow function expressions - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) — lazy evaluation via callbacks

### Secondary (MEDIUM confidence)

- [ES6 singleton pattern: module default exports an instance](https://gist.github.com/dmnsgn/4a6ad76de1b5928f13f68f406c70bb09) — module-scoped singleton pattern
- [Stop Writing Singleton Classes: Use ES6 Modules](https://dev.to/saiful__bashar/stop-writing-singleton-classes-use-es6-modules-the-typescript-way-29kj) — ES6 modules as singletons
- [What is lazy evaluation in TypeScript?](https://www.educative.io/answers/what-is-lazy-evaluation-in-typescript) — lazy evaluation concepts
- [MatrixAI/js-logger](https://github.com/MatrixAI/js-logger) — lazy evaluation properties pattern
- [Understanding err, stdout, and stderr in Node.js](https://dev.to/tene/understanding-err-stdout-and-stderr-in-nodejs-44ia) — stream behavior

### Codebase Evidence (HIGH confidence)

- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/java-javadoc.ts` — Existing singleton pattern with getInstance()
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/tsconfig.json` — TypeScript config (Node16 modules, strict mode)
- `/Users/beff/_workspace/bbj-language-server/.planning/STATE.md` — 60-line constraint, no external framework decision

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Built-in Node.js/TypeScript features, no external dependencies
- Architecture patterns: HIGH — ES6 modules, numeric enums, lazy eval are well-established patterns
- Pitfalls: HIGH — Documented from official sources and codebase analysis
- Code examples: HIGH — Based on official TypeScript/Node.js documentation and STATE.md constraints

**Research date:** 2026-02-08
**Valid until:** ~30 days (stable domain — TypeScript language server fundamentals change slowly)

**Sources verification:**
- 4 HIGH confidence primary sources (official docs)
- 5 MEDIUM confidence secondary sources (verified community patterns)
- 3 codebase files analyzed for existing patterns
- 0 LOW confidence sources (all findings verified)
