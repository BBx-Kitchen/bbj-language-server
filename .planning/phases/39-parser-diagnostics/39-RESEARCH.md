# Phase 39: Parser Diagnostics - Research

**Researched:** 2026-02-08
**Domain:** Chevrotain parser ambiguity detection and Langium parser infrastructure
**Confidence:** HIGH

## Summary

Phase 39 addresses Chevrotain's "Ambiguous Alternatives Detected" warnings in the Langium-based BBj parser. The codebase already has a customized ambiguity logging handler (bbj-module.ts lines 104-120) that intercepts these warnings and logs them via logger.debug(). The research reveals three paths forward: (1) fix grammar ambiguities by refactoring rules, (2) suppress specific ambiguities via IGNORE_AMBIGUITIES flag, or (3) enhance debug logging to show details on-demand. The phase uses existing Phase 36 debug flag infrastructure, making implementation straightforward.

**Primary recommendation:** Investigate root cause first (PARSE-01), then either fix grammar or suppress with rationale (PARSE-02), and document in existing Docusaurus configuration.md (DOCS-01). The existing lookaheadStrategy.logging hook is correctly positioned to capture ambiguity warnings before they reach console output.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium | 4.1.3 | DSL framework providing grammar-to-parser compilation | Official TypeFox framework for TypeScript language servers, wraps Chevrotain with declarative grammar |
| Chevrotain | 11.0.3 | Parser building toolkit implementing LL(k) and ALL(*) algorithms | Industry-standard JavaScript parser library, used by Langium internally |
| chevrotain-allstar | 0.3.1 (via Langium) | ALL(*) lookahead algorithm plugin | Langium's default lookahead strategy since v1.0, provides unbounded lookahead |
| vscode-languageserver | 9.0.1 | Language Server Protocol implementation | Standard LSP server library for VS Code extensions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | (existing) | Test runner for unit tests | Parser ambiguity verification tests |
| TypeScript | 5.8.3 | Type-safe JavaScript | All language server code |

### Already Installed
All required dependencies are already present in bbj-vscode/package.json. No new npm packages needed.

**Installation:**
```bash
# No new installations required - all dependencies present
```

## Architecture Patterns

### Recommended Project Structure
```
bbj-vscode/
├── src/language/
│   ├── bbj-module.ts           # Parser construction with ambiguity hook
│   ├── bbj.langium             # Grammar file (ambiguity source)
│   ├── logger.ts               # Logger singleton (Phase 35)
│   └── main.ts                 # Debug flag handler (Phase 36)
├── test/
│   └── parser.test.ts          # Add ambiguity verification tests
└── documentation/
    └── docs/user-guide/
        └── configuration.md    # Add bbj.debug documentation
```

### Pattern 1: Chevrotain Ambiguity Hook (Already Implemented)
**What:** Intercept Chevrotain's lookahead strategy logging callback to suppress/route ambiguity warnings
**When to use:** When you need to control ambiguity warning visibility without modifying Chevrotain internals
**Example:**
```typescript
// Source: bbj-vscode/src/language/bbj-module.ts lines 104-120
function createBBjParser(services: LangiumServices): LangiumParser {
    const parser = prepareLangiumParser(services);
    // Customize ambiguity logging
    const lookaheadStrategy = (parser as any).wrapper.lookaheadStrategy
    if (lookaheadStrategy) {
        lookaheadStrategy.logging = (message: string) => {
            if (!ambiguitiesReported) {
                ambiguitiesReported = true;
                logger.debug('Parser: Ambiguous Alternatives Detected. Enable ambiguity logging to see details.');
            }
        }
    }
    parser.finalize();
    return parser;
}
```

**Key insight:** This hook runs BEFORE Chevrotain's default console.log(), so we can suppress or route warnings. The `ambiguitiesReported` flag prevents log spam by reporting once per parser initialization.

### Pattern 2: Grammar Refactoring to Eliminate Ambiguities
**What:** Extract common prefixes before alternation points to reduce lookahead requirements
**When to use:** When ambiguities represent real grammar design issues (LL(k) conflicts)
**Example:**
```typescript
// Source: https://chevrotain.io/docs/guide/resolving_grammar_errors.html

// BEFORE: Requires 5-token lookahead (ambiguous)
fiveTokensLookahead:
  "A" "B" "C" "D" "1" |
  "A" "B" "C" "D" "2"

// AFTER: Requires 1-token lookahead (unambiguous)
oneTokenLookahead:
  "A" "B" "C" "D"
  (
    "1" |
    "2"
  )
```

**Note:** This pattern applies when the ambiguity warning indicates a genuine grammar issue that could cause incorrect parsing.

### Pattern 3: IGNORE_AMBIGUITIES Suppression (Last Resort)
**What:** Explicitly suppress ambiguity warnings for specific OR alternatives
**When to use:** When ambiguities are implicitly resolved by alternative ordering and refactoring is impractical
**Example:**
```typescript
// Source: https://chevrotain.io/documentation/9_0_0/interfaces/ormethodopts.html

// At entire alternation level
$.OR({
  IGNORE_AMBIGUITIES: true,
  DEF: [
    { ALT: () => $.CONSUME(TokenA) },
    { ALT: () => $.CONSUME(TokenB) }
  ]
})

// At specific alternative level
$.OR([
  { ALT: () => $.CONSUME(TokenA), IGNORE_AMBIGUITIES: true },
  { ALT: () => $.CONSUME(TokenB) }
])
```

**Caution:** Chevrotain documentation emphasizes this should only be used in "rare circumstances." Must document rationale when used.

### Pattern 4: Debug-Gated Verbose Ambiguity Logging
**What:** Show full ambiguity details only when bbj.debug=true
**When to use:** When users need to diagnose specific grammar rules causing ambiguities
**Example:**
```typescript
// Enhanced version for PARSE-01 investigation
lookaheadStrategy.logging = (message: string) => {
    if (logger.isDebug()) {
        // Show full details when debug enabled
        logger.debug(`Parser ambiguity: ${message}`);
    } else if (!ambiguitiesReported) {
        // Show once-per-session summary otherwise
        ambiguitiesReported = true;
        logger.debug('Parser: Ambiguous Alternatives Detected. Enable ambiguity logging to see details.');
    }
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grammar ambiguity detection | Custom lookahead analysis | Chevrotain's built-in ambiguity detection | Chevrotain's detector handles LL(k) and ALL(*) algorithms, edge cases, performance optimizations — reimplementing would miss subtle cases |
| Langium parser construction | Manual Chevrotain parser | prepareLangiumParser() | Langium manages parser lifecycle, wrapper creation, lookahead strategy, finalization — manual construction would break Langium's internals |
| Grammar validation | Custom grammar checker | Langium CLI's built-in validation | Langium CLI validates grammar syntax, type consistency, cross-references during `langium generate` — custom validation would duplicate complex logic |
| Lookahead strategy logging | Monkey-patching console.log | lookaheadStrategy.logging property | Official extension point provided by Chevrotain for logging customization — console monkey-patching is fragile and breaks in test environments |

**Key insight:** Chevrotain and Langium are mature frameworks with extensive edge case handling. The lookaheadStrategy.logging hook is the official API for customizing ambiguity warnings — use it, don't circumvent it.

## Common Pitfalls

### Pitfall 1: Suppressing Ambiguities Without Investigation
**What goes wrong:** Using IGNORE_AMBIGUITIES globally without understanding root cause can hide real grammar bugs that cause incorrect parsing
**Why it happens:** Ambiguity warnings are noisy and developers want to silence them quickly
**How to avoid:** Always investigate with verbose logging first (PARSE-01). Document specific grammar rules and why suppression is safe. Use granular suppression (per-alternative, not global).
**Warning signs:** Parser produces incorrect AST for valid input; tests pass but real-world code fails

### Pitfall 2: Accessing Internal Chevrotain Properties Without Type Safety
**What goes wrong:** The code uses `(parser as any).wrapper.lookaheadStrategy` which bypasses TypeScript checks and could break if Langium changes internals
**Why it happens:** Langium doesn't expose lookaheadStrategy in its public API
**How to avoid:** Wrap access in conditional check `if (lookaheadStrategy)`, add comment explaining necessity, test behavior when property is undefined. This is already done correctly in bbj-module.ts.
**Warning signs:** Runtime errors after Langium upgrades; parser initialization fails silently

### Pitfall 3: Assuming All Ambiguities Are False Positives
**What goes wrong:** ALL(*) algorithm still detects real ambiguities that cause non-deterministic parsing; dismissing them as "framework noise" can hide bugs
**Why it happens:** ALL(*) reduces false positives compared to LL(k), leading to assumption that remaining warnings are spurious
**How to avoid:** Test ambiguous grammar rules with inputs that exercise both alternatives. Verify parser chooses correct alternative consistently. Document expected behavior.
**Warning signs:** Parser behavior differs across runs; alternative ordering affects results

### Pitfall 4: Verbose Logging Performance Impact
**What goes wrong:** Logging every ambiguity message (potentially hundreds) causes startup delay and log spam
**Why it happens:** Ambiguity detection runs during parser initialization, before first parse
**How to avoid:** Use `ambiguitiesReported` flag to log once-per-session summary. Gate verbose details behind logger.isDebug(). This pattern is already implemented.
**Warning signs:** Parser initialization takes seconds; output channel fills with repeated messages

### Pitfall 5: Changing Grammar Without Re-testing Ambiguities
**What goes wrong:** Grammar refactoring to fix one ambiguity can introduce new ambiguities in other rules
**Why it happens:** Grammar rules interact in complex ways via lookahead computation
**How to avoid:** Run full test suite after grammar changes. Add specific tests for previously ambiguous patterns. Monitor parser warnings in CI.
**Warning signs:** Regression in parsing accuracy; new test failures after "unrelated" grammar changes

## Code Examples

Verified patterns from official sources:

### Investigating Ambiguity Root Cause (PARSE-01)
```typescript
// Enhanced logging for investigation phase
// Source: Based on existing bbj-module.ts pattern + Chevrotain docs

function createBBjParser(services: LangiumServices): LangiumParser {
    const parser = prepareLangiumParser(services);
    const lookaheadStrategy = (parser as any).wrapper.lookaheadStrategy
    if (lookaheadStrategy) {
        lookaheadStrategy.logging = (message: string) => {
            if (logger.isDebug()) {
                // Show full details when investigating
                logger.debug(`Parser: ${message}`);
            } else if (!ambiguitiesReported) {
                ambiguitiesReported = true;
                logger.debug('Parser: Ambiguous Alternatives Detected. Enable bbj.debug to see details.');
            }
        }
    }
    parser.finalize();
    return parser;
}
```

### Grammar Refactoring Example (PARSE-02 - Fix)
```typescript
// Source: https://chevrotain.io/docs/guide/resolving_grammar_errors.html

// BEFORE: Ambiguous due to common prefix
Statement:
  VariableDeclaration |
  VariableAssignment

VariableDeclaration:
  ID ':' Type

VariableAssignment:
  ID '=' Expression

// AFTER: Extract common prefix
Statement:
  ID (
    ':' Type          // Declaration
    | '=' Expression  // Assignment
  )
```

### Explicit Ambiguity Suppression (PARSE-02 - Suppress)
```typescript
// Source: https://chevrotain.io/documentation/9_0_0/interfaces/ormethodopts.html
// Only use when ambiguity is proven safe and refactoring is impractical

// Example: Order-dependent alternatives where first match wins
$.OR({
  IGNORE_AMBIGUITIES: true,  // Suppression must be documented
  DEF: [
    // Longer pattern must come first
    { ALT: () => { $.CONSUME(Keyword); $.CONSUME(Identifier); } },
    // Shorter pattern comes second (fallback)
    { ALT: () => { $.CONSUME(Identifier); } }
  ]
});

// Rationale: Both alternatives start with Identifier when Keyword is an Identifier.
// Order guarantees Keyword+Identifier is tried first. Suppression is safe.
```

### Test Pattern for Ambiguity Verification
```typescript
// Source: Based on existing test/parser.test.ts patterns

test('Grammar handles ambiguous pattern correctly', async () => {
    const result1 = await parse('KEYWORD identifier');
    expectNoParserLexerErrors(result1);
    expect(isKeywordStatement(result1.parseResult.value)).true;

    const result2 = await parse('identifier');
    expectNoParserLexerErrors(result2);
    expect(isIdentifierStatement(result2.parseResult.value)).true;
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LL(k) with fixed maxLookahead | ALL(*) with unbounded lookahead | Langium 1.0 (2022) | Eliminates most lookahead-related ambiguities; remaining warnings are more likely to indicate real issues |
| Global IGNORE_AMBIGUITIES in parser config | Per-alternative IGNORE_AMBIGUITIES flag | Chevrotain 7.0 (2020) | More granular control; forces explicit documentation of which alternatives are suppressed |
| Console.log() for ambiguity warnings | lookaheadStrategy.logging hook | Chevrotain 6.0+ | Allows custom routing/filtering without monkey-patching console |
| Quiet ambiguity warnings by default | Verbose ambiguity detection | Langium/Chevrotain default | Encourages fixing real grammar issues; can be suppressed if needed |

**Deprecated/outdated:**
- **IParserConfig.ignoredIssues**: Deprecated in Chevrotain 9.0+, replaced by per-rule IGNORE_AMBIGUITIES flag. Global suppression was too coarse-grained.
- **Manual lookahead calculation**: ALL(*) algorithm makes manual maxLookahead tuning obsolete for most grammars. Only needed when reverting to LL(k) via langium-config.json.

## Open Questions

1. **Which specific BBj grammar rules trigger the ambiguity warning?**
   - What we know: The warning is triggered during parser initialization (bbj-module.ts line 114)
   - What's unclear: Which alternation(s) in bbj.langium are detected as ambiguous
   - Recommendation: Enable bbj.debug, capture full warning message during initialization, identify specific rule names. PARSE-01 task should document these.

2. **Is the ambiguity real or a false positive from ALL(*) analysis?**
   - What we know: ALL(*) reduces false positives but can still flag safe patterns (e.g., CSS fallback tokens)
   - What's unclear: Whether the detected ambiguity actually causes incorrect parsing
   - Recommendation: Write tests exercising both alternatives with inputs that would disambiguate. If parser always chooses correctly, likely safe to suppress with rationale.

3. **Should ambiguity details always be shown when bbj.debug=true, or require separate flag?**
   - What we know: Phase 36 established bbj.debug as binary flag for all verbose output
   - What's unclear: Whether parser-specific verbosity needs separate control
   - Recommendation: Use existing bbj.debug flag for consistency. Parser ambiguities are debug-level information like other diagnostics. Keep implementation simple unless users request separate control.

4. **Does the ambiguity warning appear on every parser initialization or only once?**
   - What we know: The ambiguitiesReported flag is module-scoped, persisting across language server lifecycle
   - What's unclear: Whether parser is recreated on grammar changes or settings updates
   - Recommendation: Test behavior when reloading extension or changing settings. If parser is recreated, flag should probably reset to allow re-detection.

## Sources

### Primary (HIGH confidence)
- Chevrotain Official Docs - Resolving Grammar Errors: https://chevrotain.io/docs/guide/resolving_grammar_errors.html
- Chevrotain API Reference - OrMethodOpts.IGNORE_AMBIGUITIES: https://chevrotain.io/documentation/9_0_0/interfaces/ormethodopts.html
- Chevrotain API Reference - ILookaheadStrategy: https://chevrotain.io/documentation/11_0_0/interfaces/ILookaheadStrategy.html
- TypeFox Blog - ALL(*) Lookahead in Langium: https://www.typefox.io/blog/allstar-lookahead/
- Project codebase: bbj-vscode/src/language/bbj-module.ts (existing ambiguity hook implementation)
- Project codebase: bbj-vscode/src/language/logger.ts (Phase 35 logger singleton)
- Project codebase: bbj-vscode/src/language/main.ts (Phase 36 debug flag handler)
- Project codebase: bbj-vscode/package.json (Langium 4.1.3, Chevrotain 11.0.3, chevrotain-allstar 0.3.1)

### Secondary (MEDIUM confidence)
- Chevrotain GitHub Issues - Ambiguous Alternatives Documentation: https://github.com/chevrotain/chevrotain/issues/853
- Chevrotain GitHub Issues - Support More Specific Ambiguity Ignoring: https://github.com/SAP/chevrotain/issues/569
- chevrotain-allstar GitHub Issues - Ambiguity Warnings in Ambiguous Alternations: https://github.com/TypeFox/chevrotain-allstar/issues/3
- Langium GitHub Changelog: https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md
- Langium Configuration Documentation: https://langium.org/docs/reference/configuration-services/

### Tertiary (LOW confidence - WebSearch only)
- Chevrotain Breaking Changes documentation (historical context on deprecated features)
- Mermaid CLI ambiguity issues (external project encountering similar warnings)
- Various GitHub discussions on lookahead configuration (general patterns, not BBj-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies verified in package.json with specific versions
- Architecture patterns: HIGH - Existing hook implementation verified in codebase, official Chevrotain docs for other patterns
- Pitfalls: MEDIUM-HIGH - Based on official docs warnings + common patterns in GitHub issues
- Code examples: HIGH - Derived from verified codebase + official Chevrotain documentation

**Research date:** 2026-02-08
**Valid until:** 60 days (Langium and Chevrotain are mature, stable projects; ambiguity detection APIs unchanged since Chevrotain 9.0)

**Key research findings:**
1. Codebase already has correct ambiguity interception infrastructure (bbj-module.ts lines 104-120)
2. ALL(*) algorithm means remaining ambiguities are more likely to be real issues than false positives
3. IGNORE_AMBIGUITIES should be last resort after investigation and documentation
4. Phase 36 debug flag infrastructure is ready to control verbose ambiguity output
5. Documentation should go in existing Docusaurus site at documentation/docs/user-guide/configuration.md
