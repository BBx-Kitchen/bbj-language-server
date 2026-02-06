# Phase 24: Grammar & Parsing Fixes - Research

**Researched:** 2026-02-06
**Domain:** Langium/Chevrotain parsing, lexer token resolution, error recovery
**Confidence:** HIGH

## Summary

Phase 24 addresses five grammar/parsing issues causing false errors in valid BBj code. The core technical challenges involve Chevrotain lexer token disambiguation (keyword vs identifier conflicts), Langium grammar extensions (adding missing statements), and error recovery configuration (preventing cascading errors).

The project uses Langium 4.1.3 with Chevrotain 11.0.3, which provides proven patterns for all required fixes. The lexer currently splits camel-case identifiers like `getResult` into `GET` + `Result` because keyword tokens take precedence. The grammar lacks DREAD/DATA statement definitions despite their widespread use in legacy code. Inline REM comments after semicolons fail because the parser doesn't recognize `;rem` as `; + REM statement`. Error recovery is disabled by default in Chevrotain, causing one bad line to break parsing for the entire file.

**Primary recommendation:** Use Chevrotain's `longer_alt` property for keyword/identifier resolution, extend the Langium grammar with minimal DREAD/DATA/DEF-FN-in-methods rules, and enable Chevrotain's built-in error recovery with `recoveryEnabled: true`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Identifier vs keyword resolution:**
- All keywords must be handled as potential identifier prefixes, not just `get`/`new`/`is` — future-proof
- The lexer (Chevrotain) currently splits `getResult` into `GET` + `Result` because keyword matching takes priority over identifier matching
- The main real-world conflict contexts are: labels (`getResult:`) and GOTO/GOSUB targets (`GOTO getResult`) — method calls always have a prefix (`obj!.getResult()`, `#getResult()`, `this!.getResult()`)
- After a dot (`.`) or hash (`#`), the issue doesn't manifest — it's standalone names that break
- The existing workaround in `bbj-token-builder.ts` (adding keywords to ID category) doesn't prevent the lexer from splitting tokens — needs a proper fix at the lexer level
- Reference: BBjAPI javadoc at `/Users/beff/bbx/documentation/javadoc/` contains complete method name reference

**Inline comment patterns:**
- Semicolon (`;`) is a statement separator, not specifically a comment marker
- `REM` is a statement that treats the rest of the line as comment text
- `endif;rem blah` = `endif` + `;` (separator) + `rem blah` (REM statement) — must parse without error
- Colon at start of line (`:`) is line continuation (appends to previous logical line)
- Colon elsewhere is a label definition (`my_label:`)
- `: REM ...` at start of line = continue previous line + REM comment — rare but valid, must not error

**Legacy statement support (DREAD, DATA, DEF FN):**
- These exist in a lot of legacy code and will continue to exist
- `DATA` stores values (numeric, string, expressions) to be read by `DREAD` — they work as a pair
- `DATA` cannot be part of a compound statement; may include a line label
- `DEF FN` / `FNEND` blocks can appear inside class methods (not just top level)
- DATA reference: https://documentation.basis.cloud/BASISHelp/WebHelp/commands/data_verb.htm

**Error tolerance strategy:**
- Parser should recover and continue when encountering broken/partial constructs — minimize cascading errors
- Cascading errors (one bad line causing entire file to error) is a high priority to fix
- Unrecognized statements: show one error on that specific line, then recover for the rest of the file
- Error messages must clearly show the CAUSE of the parser giving up — not just "unexpected token"
- Discover additional missing statements as they come — fix the known five (GRAM-01 through GRAM-05) now

### Claude's Discretion

- Level of semantic support for DREAD/DATA/DEF FN (parse-without-error vs full validation/completion)
- Specific lexer implementation approach for keyword/identifier resolution (longest match, lookahead, custom token matcher)
- Langium/Chevrotain error recovery mechanisms to use
- Exact error message wording

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

The project already uses the correct stack for this phase — no additional dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium | ~4.1.3 | Language server framework | Industry standard for building LSP servers in TypeScript |
| Chevrotain | ~11.0.3 | Parser/lexer library | Langium's underlying parser, provides fault tolerance, custom token patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | — | — | All functionality exists in current stack |

### Key Insight

Langium abstracts Chevrotain behind a grammar DSL (`bbj.langium`), but provides extension points (`BBjTokenBuilder`, `BbjLexer`) for cases where Chevrotain's lexer-level control is needed. The BBj language server already uses these extension points — we're refining existing patterns, not adding new infrastructure.

## Architecture Patterns

### Current Architecture

```
bbj-vscode/src/language/
├── bbj.langium              # Grammar definition (Langium DSL)
├── bbj-token-builder.ts     # Custom token configuration (Chevrotain level)
├── bbj-lexer.ts             # Lexer preprocessing (line continuation)
├── bbj-module.ts            # Dependency injection configuration
└── generated/               # Auto-generated from bbj.langium
```

### Pattern 1: Keyword/Identifier Disambiguation with longer_alt

**What:** Configure keyword tokens to prefer longer identifier matches when possible

**When to use:** When keywords can be valid identifier prefixes (e.g., `get` in `getResult`)

**Example:**
```typescript
// In BBjTokenBuilder.buildTokens()
// After buildKeywordTokens() creates keyword tokens

const idToken = terminalTokens.find(e => e.name === 'ID')!;

for (const keywordToken of keywordTokens) {
    // Configure each keyword to defer to ID if longer match exists
    keywordToken.longer_alt = idToken;
}
```

**Why this works:** Chevrotain will match `get` as keyword initially, but if more characters follow forming a longer identifier match, it will choose the identifier token instead. This resolves `getResult` → `[getResult]` instead of `[GET][Result]`.

**Source:** [Chevrotain Token Alternative Matches](https://chevrotain.io/docs/features/token_alternative_matches.html), [Keywords vs Identifiers Example](https://github.com/Chevrotain/chevrotain/blob/master/examples/lexer/keywords_vs_identifiers/keywords_vs_identifiers.js)

### Pattern 2: Grammar Extension for Legacy Statements

**What:** Add minimal grammar rules for DREAD, DATA, and DEF-FN-in-methods

**When to use:** When existing BBj code uses statements not yet in grammar

**Example:**
```langium
// In bbj.langium SingleStatement alternatives

SingleStatement:
    KeywordStatement |
    ReadStatement |
    DreadStatement |        // NEW
    DataStatement |         // NEW
    ExtendedInputStatement |
    // ... existing alternatives
;

DreadStatement:
    'DREAD' items+=InputItem (',' items+=InputItem)* Err?
;

DataStatement:
    'DATA' values+=Expression (',' values+=Expression)*
;
```

**Key constraints:**
- DATA cannot be part of compound statement (no semicolon chaining)
- DREAD uses same `InputItem` syntax as READ
- DEF FN already exists at top level — extend `MethodDecl` body to allow it

**Source:** [BBj DATA Verb Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/data_verb.htm), [BBj DREAD Verb Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/dread_verb.htm)

### Pattern 3: Inline REM Comment Support

**What:** Ensure semicolon-separated REM statements parse correctly

**Current state:** The grammar already recognizes REM via the `COMMENT` terminal:
```langium
terminal COMMENT: /([rR][eE][mM])([ \t][^\n\r]*)?[\n\r]+/;
```

**Issue:** The regex requires a newline at the end, but `;rem blah` places REM after a semicolon on the same physical line.

**Solution approach:** Either:
1. Adjust COMMENT terminal regex to allow semicolon as terminator
2. Add explicit CommentStatement recognition after semicolons in Statement rule

**Example (Option 2):**
```langium
Statement:
    SingleStatement ({infer CompoundStatement.statements+=current}
        (';' (statements+=SingleStatement | comments+=CommentStatement))+
    )?
;
```

**Source:** Current implementation in `bbj.langium` lines 23-24, 279-280

### Pattern 4: Error Recovery Configuration

**What:** Enable Chevrotain's built-in error recovery to prevent cascading errors

**When to use:** Always — improves LSP experience for partially-valid code

**Example:**
```typescript
// In bbj-module.ts createBBjParser() function
export function createBBjParser(services: BBjServices): LangiumParser {
    const parser = prepareLangiumParser(services, {
        recoveryEnabled: true,  // Enable Chevrotain error recovery
    });
    return parser;
}
```

**How it works:**
- **Single token insertion/deletion**: Parser inserts missing tokens or skips unexpected ones
- **Re-sync recovery**: Parser skips tokens until finding valid continuation point
- **Repetition re-sync**: Within loops/repetitions, parser attempts to find next iteration

**Tradeoff:** Recovered nodes may have incomplete AST structures (flagged with `recoveredNode: true`). Validators must be defensive when accessing AST properties.

**Source:** [Chevrotain Fault Tolerance Tutorial](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html)

### Pattern 5: Colon Line Continuation with REM

**What:** Handle `: REM ...` at line start (continue previous line + comment)

**Current state:** `BbjLexer.prepareLineSplitter()` already handles colon continuation by joining lines:
```typescript
while (nextLine && nextLine.charAt(0) === ':') {
    // Joins :continuation lines to previous physical line
}
```

**Issue:** After joining, the resulting line may end with `: REM ...`, where the REM must be recognized.

**Solution:** The COMMENT terminal must recognize REM without requiring newline at end, or CommentStatement must be explicitly allowed after colon in continued lines.

**Verification needed:** Test whether existing implementation handles this after the REM comment fix from Pattern 3.

### Anti-Patterns to Avoid

**Don't add keywords to ID category without longer_alt:** The current workaround in `bbj-token-builder.ts` (lines 38-46) adds keywords to ID category, but this doesn't prevent the lexer from splitting tokens initially — it just makes them categorized as IDs afterward. Use `longer_alt` instead.

**Don't create comprehensive DREAD/DATA validators yet:** User discretion allows "parse-without-error vs full validation." Start with minimal grammar support. Full semantic validation (type checking DATA values, DREAD/DATA pointer tracking) can be deferred.

**Don't disable error recovery per-rule unless necessary:** The default re-sync strategy is usually correct. Only use `resyncEnabled: false` on specific rules if re-sync causes worse problems than stopping.

**Don't require newlines in statement terminals if semicolons are valid separators:** The current COMMENT terminal pattern forces newline endings, breaking inline usage. Terminals shared between newline and semicolon contexts must handle both.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyword/identifier conflict | Custom lexer state machine | Chevrotain `longer_alt` | Already proven, handles edge cases (prefix matching, performance), standard pattern |
| Error recovery heuristics | Custom error skip logic | Chevrotain `recoveryEnabled` | ANTLR-style recovery with single-token-insertion, re-sync, repetition recovery |
| Parser configuration | Modify generated parser code | Langium `prepareLangiumParser` options | Regeneration-safe, documented API |
| Token precedence | Regex ordering tricks | Token categories + `longer_alt` | Chevrotain's designed solution, handles ambiguity correctly |

**Key insight:** Chevrotain and Langium already solved these problems. The BBj grammar challenges (keywords as identifier prefixes, error resilience) are common to many languages. Use the framework's built-in solutions rather than inventing language-specific workarounds.

## Common Pitfalls

### Pitfall 1: Assuming Adding Keywords to ID Category Fixes Lexing

**What goes wrong:** You add `keywordToken.CATEGORIES = [id]` thinking this prevents keyword/identifier splitting, but tokens still split during lexing (e.g., `getResult` → `[GET][Result]`).

**Why it happens:** Token categorization happens AFTER token matching. The lexer matches `GET` keyword first (keyword regexes come before ID), then categorizes it as ID. But by then, the remaining `Result` is already a separate token.

**How to avoid:** Use `longer_alt` property on keyword tokens BEFORE they're added to the lexer. This tells Chevrotain to check for longer matches DURING tokenization.

**Warning signs:**
- Tests show camelCase identifiers still split despite category configuration
- `console.log(tokens)` shows multiple tokens where one was expected
- Parser receives unexpected token sequences

**Source:** Current issue in `bbj-token-builder.ts` lines 38-46, [Chevrotain longer_alt documentation](https://chevrotain.io/docs/features/token_alternative_matches.html)

### Pitfall 2: Terminal Regex Overly Restrictive

**What goes wrong:** The COMMENT terminal requires `[\n\r]+` at the end, breaking inline REM statements after semicolons (`endif;rem blah`).

**Why it happens:** The regex was designed for standalone REM statements at statement level, not considering compound statement contexts where semicolon separates statements.

**How to avoid:** Make newline optional in terminal regex, OR add explicit CommentStatement alternative in Statement rule after semicolons.

**Warning signs:**
- Parsing fails with "unexpected token" after semicolons before REM
- Manual testing of `endif;rem test` produces parser errors
- Lexer matches REM correctly but parser rejects it

**Verification:** Test case should parse without errors:
```bbj
if x > 5 then
    print "yes";rem this is a comment
endif
```

### Pitfall 3: Error Recovery Not Enabled

**What goes wrong:** Parser stops at first error, leaving rest of file unparsed. Diagnostics show cascading errors where one bad line causes hundreds of "unexpected token" errors.

**Why it happens:** Chevrotain's error recovery is disabled by default for performance. Langium doesn't override this default.

**How to avoid:** Pass `recoveryEnabled: true` to `prepareLangiumParser()` in parser creation.

**Warning signs:**
- Single syntax error produces dozens of diagnostics
- Deleting one bad line clears most diagnostics
- Diagnostics don't correspond to actual problems (cascading from earlier error)

**Source:** [Chevrotain Fault Tolerance Tutorial](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html)

### Pitfall 4: DEF FN Location Restrictions

**What goes wrong:** Parser accepts DEF FN at top level but rejects it inside class methods, even though BBj allows it.

**Why it happens:** The grammar defines `DefFunction` as a top-level alternative in `Statements` fragment, but `MethodDecl` body only allows `Statement`, not `DefFunction`.

**How to avoid:** Add `DefFunction` to the alternatives allowed in `MethodDecl.body`.

**Warning signs:**
- Legacy code with DEF FN inside methods shows parser errors
- Same DEF FN works at top level but fails in methods
- Error message: "expecting METHODEND, got DEF"

**Fix:**
```langium
MethodDecl returns MethodDecl:
    MethodDeclStart
    Comments?
    (
        (body+=(Statement | DefFunction))*  // Allow DefFunction in body
        endTag='METHODEND'
    )?
;
```

### Pitfall 5: DATA in Compound Statements

**What goes wrong:** Parser allows `DATA 1,2,3; PRINT x` but BBj runtime rejects it.

**Why it happens:** Grammar allows all statements in compound statements via `Statement` rule.

**How to avoid:** Define `DataStatement` outside `SingleStatement` alternatives, OR use predicate/validation to prevent it in compounds.

**Warning signs:**
- Grammar accepts DATA after semicolons
- Runtime shows "Invalid statement" when executing compound DATA
- Official docs state "DATA cannot be part of a compound statement"

**Recommended approach:** Add validation check rather than complicating grammar. Parse it (avoid false parse errors), but flag it in validation phase with clear error message.

## Code Examples

Verified patterns from official sources and current implementation:

### Keyword/Identifier Resolution (Chevrotain)

```typescript
// Source: https://github.com/Chevrotain/chevrotain/blob/master/examples/lexer/keywords_vs_identifiers/keywords_vs_identifiers.js

import { createToken, Lexer } from "chevrotain";

// Define identifier token FIRST
export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-z]\w+/,
});

// Define keywords with longer_alt pointing to Identifier
export const While = createToken({
  name: "While",
  pattern: /while/,
  longer_alt: Identifier,  // If longer match exists, use Identifier instead
});

export const For = createToken({
  name: "For",
  pattern: /for/,
  longer_alt: Identifier,
});

// Place keywords BEFORE identifier in lexer token array
const lexer = new Lexer([
  Whitespace,
  While,      // Keywords first
  For,
  Identifier, // Identifier last
]);
```

**Result:** `while` → `[While]`, `whileTesting` → `[Identifier('whileTesting')]`

### Grammar Extension for DREAD/DATA

```langium
// Add to SingleStatement alternatives
DreadStatement:
    'DREAD' items+=InputItem (',' items+=InputItem)* Err?
;

DataStatement:
    'DATA' values+=Expression (',' values+=Expression)*
;

// InputItem and Err already defined in existing grammar
// Reuse existing patterns from ReadStatement
```

**Source:** [BBj DREAD Verb Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/dread_verb.htm)

### Error Recovery Configuration

```typescript
// In bbj-module.ts
export function createBBjParser(services: BBjServices): LangiumParser {
    const parser = prepareLangiumParser(services, {
        recoveryEnabled: true,
    });
    return parser;
}
```

**Source:** [Chevrotain Fault Tolerance Tutorial](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html)

### Current Line Continuation Implementation

```typescript
// Source: bbj-vscode/src/language/bbj-lexer.ts lines 10-35
protected prepareLineSplitter(text: string): string {
    const lines = text.split(/\r?\n/g);
    for (let i = 0; i < lines.length - 1; i++) {
        const start = i + 1;
        let lineIndex = start;
        let nextLine = lines[lineIndex];
        let end = 0;

        // Detect colon continuation lines
        while (nextLine && nextLine.charAt(0) === ':') {
            end = lineIndex;
            nextLine = lines[++lineIndex];
        }

        if (end > 0) {
            // Join continuation lines by removing colons and concatenating
            let line = lines[i];
            const lineAmount = end - start + 1;
            const replaceLines = new Array<string>(lineAmount).fill('');
            const splitLines = lines.splice(start, lineAmount, ...replaceLines)
                .map(e => e.substring(1)); // Remove leading colon
            const padding = ' '.repeat(splitLines.length);
            line = [line, ...splitLines, padding].join('');
            lines[i] = line;
            i = end;
        }
    }
    return lines.join(eol) + eol;
}
```

**Key insight:** Line continuation happens in lexer preprocessing BEFORE tokenization. This means `: REM comment` on a continuation line becomes part of the joined logical line, where REM must be recognized mid-line (not just after newline).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Token categories without longer_alt | Chevrotain longer_alt property | Chevrotain 7.0+ | Proper disambiguation during lexing, not after |
| Keyword matching by exact regex | Keyword tokens with identifier fallback | Langium/Chevrotain standard | Handles camelCase identifiers starting with keywords |
| Parser stops on first error | Chevrotain fault-tolerant parsing | Chevrotain 4.0+ (2018) | LSP can provide diagnostics for partially-valid code |
| Newline-only statement terminators | Semicolon and newline both supported | BBj language design | Allows compound statements and inline comments |

**Deprecated/outdated:**
- **Adding keywords to ID category without longer_alt:** This workaround (currently in `bbj-token-builder.ts`) doesn't prevent token splitting. Replace with `longer_alt` configuration.

**Current best practice (2026):**
- Use Langium 4.0+ with Chevrotain 11.0+ for ALL(*) lookahead and improved error recovery
- Enable `recoveryEnabled: true` for LSP use cases (editor tools need to handle incomplete code)
- Use `longer_alt` for all keyword/identifier conflicts
- Separate lexer-level concerns (token matching) from parser-level concerns (grammar rules)

## Open Questions

Things that couldn't be fully resolved:

1. **Exact COMMENT terminal fix approach**
   - What we know: Current regex requires newline at end, breaking `;rem` inline comments
   - What's unclear: Whether modifying terminal regex breaks other REM contexts, or if explicit CommentStatement after semicolon is safer
   - Recommendation: Test both approaches — adjust regex first (simpler), fall back to explicit CommentStatement if issues arise

2. **DATA in compound statement prevention**
   - What we know: BBj runtime rejects it, grammar currently would allow it after grammar extension
   - What's unclear: Whether to prevent at grammar level (complex) or validation level (simpler but less immediate feedback)
   - Recommendation: Allow in grammar, flag in validation with clear error message ("DATA cannot be part of compound statement"). Parsing it prevents false negatives on otherwise-valid code.

3. **Semantic support level for DREAD/DATA**
   - What we know: User discretion allows choosing parse-only vs full validation
   - What's unclear: Whether v3.0 scope includes type checking DATA values, tracking DREAD/DATA pointer, validating RESTORE targets
   - Recommendation: Phase 24 focuses on parsing without errors. Defer full semantic validation to future phases when type system improvements are prioritized.

4. **Performance impact of longer_alt on all keywords**
   - What we know: `longer_alt` adds extra checking during lexing
   - What's unclear: Whether applying it to ALL keywords (not just get/is/new) causes measurable performance degradation
   - Recommendation: Apply to all keywords (future-proof), then measure. If performance issues arise, apply selectively to known-conflict keywords only.

## Sources

### Primary (HIGH confidence)

- [Chevrotain Keywords vs Identifiers Example](https://github.com/Chevrotain/chevrotain/blob/master/examples/lexer/keywords_vs_identifiers/keywords_vs_identifiers.js) - Official working implementation
- [Chevrotain Token Alternative Matches Documentation](https://chevrotain.io/docs/features/token_alternative_matches.html) - Official longer_alt specification
- [Chevrotain Fault Tolerance Tutorial](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html) - Official error recovery guide
- [Langium Keywords as Identifiers Recipe](https://langium.org/docs/recipes/keywords-as-identifiers/) - Official Langium pattern
- [BBj DATA Verb Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/data_verb.htm) - Official BBj syntax reference
- [BBj DREAD Verb Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/dread_verb.htm) - Official BBj syntax reference
- Current implementation: `bbj-vscode/src/language/bbj-token-builder.ts`, `bbj-lexer.ts`, `bbj.langium`

### Secondary (MEDIUM confidence)

- [Resilient LL Parsing Tutorial](https://matklad.github.io/2023/05/21/resilient-ll-parsing-tutorial.html) - General error recovery principles (not Chevrotain-specific but applicable)
- [Langium Grammar Language Reference](https://langium.org/docs/reference/grammar-language/) - General Langium grammar patterns

### Tertiary (LOW confidence)

- WebSearch results for "BBj REM semicolon" - General BASIC-style comment patterns, not BBj-specific documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions confirmed in package.json, no new dependencies needed
- Architecture (longer_alt pattern): HIGH - Official Chevrotain example, widely used pattern
- Architecture (error recovery): HIGH - Official Chevrotain tutorial, standard LSP approach
- Architecture (grammar extension): MEDIUM - Pattern straightforward but exact DATA/DREAD syntax needs verification against real BBj code
- Pitfalls (COMMENT terminal): MEDIUM - Issue identified in current code, fix approach needs testing
- Open question (DATA compound statement handling): MEDIUM - Runtime behavior documented, implementation approach is trade-off decision

**Research date:** 2026-02-06
**Valid until:** ~30 days (Langium/Chevrotain stable, BBj syntax unchanged)
