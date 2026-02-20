# Phase 33: Parser and Lexer Fixes - Research

**Researched:** 2026-02-07
**Domain:** Langium grammar rules, parser patterns, lexer token handling
**Confidence:** HIGH

## Summary

Phase 33 fixes four parser/lexer bugs that produce false errors on valid BBj syntax. All four issues are grammar-level problems — not validation logic — requiring changes to the Langium grammar file (bbj.langium) and potentially the custom lexer (bbj-lexer.ts).

**PARSE-01 (void return type):** The grammar currently treats `void` as a type reference that must resolve to a class. The fix requires making `void` a special keyword recognized only in method return-type position, similar to how `RECORD` is handled as an optional keyword in READ/PRINT statements.

**PARSE-02 (DEF FN suffixed variables):** The lexer has special handling for line continuation (`:` at line start), but the interaction between RPAREN_NO_NL tokens and suffixed variable identifiers (ID_WITH_SUFFIX terminal) inside DEF FN within method bodies creates lexer errors. The issue is likely token-ordering or context-sensitivity in how the lexer processes closing parentheses vs. variable names.

**PARSE-03 (SELECT verb):** SELECT is currently not in the grammar at all. It needs a new statement rule following the verb-with-clauses pattern (like READ/PRINT). The FROM/WHERE/SORTBY/LIMIT clauses use expression syntax that already exists, but the line-break validation system may incorrectly flag multi-line SELECT statements.

**PARSE-04 (cast array notation):** The cast validator checks type resolvability but doesn't handle array bracket notation in type expressions. The ConstructorCall rule already supports array creation (`new Type[size]`), but cast uses MethodCall which passes Expression as the type argument — bracket notation isn't parsed as part of the type.

**Primary recommendation:** Fix all four issues at the grammar level using Langium's standard patterns: optional keywords for void, terminal rule ordering for DEF FN, new statement rule for SELECT following verb patterns, and enhanced type expression parsing for cast array notation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Void return type (PARSE-01):**
- Recognize `void` specifically in method return-type position only — not as a general keyword
- Only `void` is affected — other return types like BBjString resolve correctly already
- `void` is NOT valid anywhere else (e.g., not in cast expressions)
- Just stop the false error — no return-value validation (don't check METHODRET usage)

**DEF FN suffixed variables (PARSE-02):**
- All variable suffixes are affected: `$`, `%`, `!` — not just `$`
- Problem only occurs when DEF FN is inside a class method body — works fine in main program scope
- Both single-line and multi-line DEF FN forms should work inside method bodies
- Uncommon but valid pattern — needs a solid fix, not a workaround

**SELECT verb (PARSE-03):**
- SELECT is a BBj verb, not SQL — treat it like other BBj verbs (READ, WRITE, etc.)
- Handle all SELECT verb clauses: FROM, WHERE, SORTBY, LIMIT, MODE, ERR
- Full syntax: `SELECT (chan{,MODE=str}{,ERR=ref})template {:fields} FROM fileid {WHERE expr} {SORTBY expr} {LIMIT first, count}`
- Multi-line only via standard BBj line continuation (`:` at first position of next line)
- Only SELECT has this issue — no other verbs have the same clause-based false error

**Cast array notation (PARSE-04):**
- Array bracket notation `[]` should work with any type in cast — BBj built-ins and user-defined classes
- Multi-dimensional arrays supported: `Type[][]`, `Type[][][]`, etc.
- Only cast has this parsing issue — array notation works correctly in method signatures and other contexts
- Just stop the false error — no type resolution for array casts in this phase

### Claude's Discretion
- Grammar rule structure for each fix
- Whether to use lexer-level or parser-level approach for each issue
- Test case design and coverage
- Fix ordering within the phase

### Deferred Ideas (OUT OF SCOPE)
- METHODRET return type validation (verify METHODRET value matches declared return type for non-void methods) — future phase
- Type resolution for array cast expressions (e.g., `cast(BBjString[], x!)` resolving to typed array for code completion) — future phase

</user_constraints>

## Standard Stack

### Core Langium Components

| Component | Version | Purpose | Usage in Phase 33 |
|-----------|---------|---------|-------------------|
| **Langium** | ~4.1.3 | Grammar-first language toolkit | Grammar file modifications for all four fixes |
| **Chevrotain** | ~11.0.3 | Parsing library underlying Langium | Token ordering for PARSE-02 (DEF FN) |
| **bbj.langium** | N/A | BBj grammar definition | Primary file for all grammar changes |
| **bbj-lexer.ts** | N/A | Custom lexer with line-continuation handling | Potential changes for PARSE-02 if grammar alone insufficient |
| **line-break-validation.ts** | N/A | Custom validation for statement boundaries | May need SELECT exclusion for PARSE-03 |

**Installation:** No new dependencies — all fixes use existing Langium/Chevrotain infrastructure.

### Grammar Patterns Already in Use

The BBj grammar already demonstrates all patterns needed for these fixes:

**Optional keywords in specific positions:**
```langium
ReadStatement:
    kind=READ_KINDS record?='RECORD'? WithChannelAndOptionsAndInputItems?
```

**Verb statements with clause-like options:**
```langium
PrintStatement:
    PRINT_STANDALONE_NL
    | (('?' | 'PRINT' | 'WRITE') record?='RECORD'?) WithChannelAndOptionsAndOutputItems?
```

**Context-specific terminals (RPAREN_NL vs RPAREN_NO_NL):**
```langium
terminal RPAREN_NL: /_rparen_nl/;
terminal RPAREN_NO_NL returns string: ')';

OpenStatement:
    'OPEN' '(' channelno=Expression? Options? RPAREN_NO_NL fileid=Expression
```

**Array notation in type positions:**
```langium
VariableDecl:
    'declare' auto?='auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName

MethodDecl:
    'METHOD' Visibility Static (returnType=QualifiedClass (array?='[' ']')? )? name=ValidName '(' ...
```

## Architecture Patterns

### Pattern 1: Context-Specific Keyword Recognition

**What:** Make keywords valid only in specific grammar positions, not globally.

**When to use:** When a word should act as a keyword in one context but remain available as an identifier elsewhere.

**Example from current grammar:**
```langium
// 'RECORD' is optional keyword only in READ/PRINT positions
ReadStatement:
    kind=READ_KINDS record?='RECORD'? WithChannelAndOptionsAndInputItems?
```

**Applied to PARSE-01 (void):**
```langium
MethodDecl:
    'METHOD' Visibility Static (voidReturn?='void' | (returnType=QualifiedClass (array?='[' ']')?))?
    name=ValidName '(' params+=ParameterDecl? (',' params+=ParameterDecl)* RPAREN
```

**Source:** [Langium Grammar Language - Optional Keywords](https://langium.org/docs/reference/grammar-language/)

### Pattern 2: Verb-with-Clauses Statement Pattern

**What:** Statements that start with a verb keyword and have optional named clauses (like MODE, ERR, FROM, WHERE).

**When to use:** For BBj verbs that accept both channel/options in parentheses AND subsequent clause keywords.

**Example from current grammar:**
```langium
ReadStatement:
    kind=READ_KINDS record?='RECORD'? WithChannelAndOptionsAndInputItems?

fragment WithChannelAndOptionsAndInputItems:
    '(' channelno=Expression? Options? (RPAREN_NL | RPAREN_NO_NL items+=InputItem (',' items+=InputItem)*)
    | items+=InputItem (',' items+=InputItem)*
```

**Applied to PARSE-03 (SELECT):**
```langium
SelectStatement:
    'SELECT' '(' channelno=Expression Mode? Err? RPAREN_NO_NL template=Expression
    (':' fields+=Expression (',' fields+=Expression)*)?
    'FROM' fileid=Expression
    ('WHERE' whereExpr=Expression)?
    ('SORTBY' sortExpr=Expression)?
    ('LIMIT' limitFirst=Expression ',' limitCount=Expression)?
```

**Documentation source:** [SELECT Verb - Basis Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/select_verb.htm)

### Pattern 3: Terminal Rule Ordering for Context-Sensitive Tokens

**What:** Langium/Chevrotain processes terminals in definition order — first match wins.

**When to use:** When token ambiguity exists (e.g., `)` could be RPAREN_NO_NL or part of a larger pattern).

**Critical principle from Langium docs:**
> "The order in which terminal rules are defined is critical as the lexer will always return the first match."

**Current issue (PARSE-02):** The interaction between:
- `RPAREN_NO_NL` terminal (matches `)`)
- `ID_WITH_SUFFIX` terminal (matches `name$`, `value%`, `obj!`)
- DEF FN single-line syntax: `DEF FN(param)=expression`

Inside a method body, the lexer may tokenize incorrectly when a suffixed variable appears after the closing paren.

**Potential fix approaches:**
1. **Grammar-level:** Use explicit token differentiation in DEF FN rule
2. **Lexer-level:** Custom token pattern with lookahead for RPAREN_NO_NL in DEF context
3. **Token ordering:** Ensure ID_WITH_SUFFIX is checked before RPAREN_NO_NL

**Source:** [Langium Lexing Documentation](https://langium.org/docs/reference/grammar-language/)

### Pattern 4: Type Expression with Array Notation

**What:** Allow type references to include bracket notation for array types.

**When to use:** Anywhere a type can be specified and array types are valid (declarations, cast, method signatures).

**Current working pattern:**
```langium
VariableDecl:
    'declare' auto?='auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName

FieldDecl:
    'FIELD' Visibility Static type=QualifiedClass (array?='[' ']')? name=FeatureName
```

**Current cast limitation:**
```langium
// CAST is a library function, so it uses MethodCall
MethodCall:
    {infer MethodCall.method=current} '(' (args+=ParameterCall (',' args+=ParameterCall)*)? Err? RPAREN

ParameterCall:
    expression=Expression

// Expression doesn't include array notation as part of type references
```

**Applied to PARSE-04 (cast array):**

Option A: Enhance Expression grammar to recognize type-with-brackets in cast context
Option B: Create a TypeExpression rule that includes array notation, use specifically in cast validation
Option C: Make bracket notation part of QualifiedClass when followed by comma (cast signature)

**Recommended: Option A** — Most consistent with existing patterns and allows arrays in other expression contexts if needed.

### Anti-Patterns to Avoid

- **Don't add void as a global keyword** — Would prevent `void` as a variable name in valid contexts
- **Don't create SELECT-specific line-break rules** — Use existing fragment patterns (RPAREN_NL vs RPAREN_NO_NL) to handle naturally
- **Don't special-case cast in validator before fixing grammar** — Grammar should parse correctly first, then validators can provide additional checks
- **Don't change terminal ordering without documenting rationale** — Terminal order is critical and affects all parsing; changes need clear justification

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Context-sensitive keyword parsing | Custom keyword detection in lexer or validator | Langium optional keyword syntax (`keyword?='word'`) in specific rule positions | Langium handles token precedence automatically; custom lexer logic is error-prone |
| Line continuation for multi-line statements | New lexer preprocessing | Existing bbj-lexer.ts prepareLineSplitter already handles `:` continuation | Line continuation is already working — SELECT just needs proper grammar structure |
| Array type notation parsing | String parsing in validator to extract `[]` from type names | Grammar-level array syntax (`type=QualifiedClass (array?='[' ']')?`) | Parser should create correct AST; validators operate on structured AST, not text |
| RPAREN token disambiguation | Lexer state machine for context-aware tokenization | Chevrotain's terminal ordering and Langium's terminal patterns | Existing patterns handle context; may just need rule reordering or lookahead hints |

**Key insight:** Langium's grammar-first approach means almost everything should be expressible in the .langium file. Custom lexer/validator logic is typically a last resort, not the first approach.

## Common Pitfalls

### Pitfall 1: Terminal Ordering Breaking Existing Parses

**What goes wrong:** Changing terminal rule order to fix one parse issue breaks other valid syntax.

**Why it happens:** Chevrotain lexer uses first-match wins — reordering affects all tokenization, not just the problematic case.

**How to avoid:**
- Run full test suite after any terminal reordering
- Document which terminal order constraints exist and why
- Consider adding new terminal variants instead of reordering (e.g., RPAREN_IN_DEF vs. RPAREN_NO_NL)

**Warning signs:** Existing passing tests start failing with lexer errors after changes.

### Pitfall 2: Grammar Changes Not Regenerating Parser

**What goes wrong:** Editing bbj.langium but forgetting to run `langium generate`, so changes don't take effect.

**Why it happens:** Langium generates TypeScript code from .langium files; IDE doesn't auto-regenerate.

**How to avoid:**
```bash
npm run langium:generate  # Regenerate after grammar changes
npm run build             # Rebuild TypeScript
npm test                  # Verify changes
```

**Warning signs:** Grammar changes have no effect; tests still fail with same errors.

### Pitfall 3: Line-Break Validation Conflicting with New Grammar

**What goes wrong:** Adding SELECT statement but line-break-validation.ts flags valid multi-line SELECT as errors.

**Why it happens:** The validation system has hardcoded patterns for which statements require line breaks. New statement types need explicit handling or exclusion.

**How to avoid:**
- Check line-break-validation.ts after adding new statement types
- SELECT uses `:` continuation so the lexer preprocessor handles it
- May need to add SELECT to statement patterns that don't require line-break-before

**Warning signs:** Grammar parses correctly but validation errors appear for valid multi-line statements.

### Pitfall 4: Optional Keyword Conflicts with Identifier Usage

**What goes wrong:** Making `void` a keyword prevents using `void` as a variable name (e.g., `void = 5`).

**Why it happens:** Keywords take precedence over identifiers in Langium's lexer.

**How to avoid:**
- Use context-specific keyword recognition: `voidReturn?='void'` only in method signature rule
- Don't add `void` to terminal keywords or global keyword list
- Test that `void` still works as a variable name outside method signatures

**Warning signs:** Valid code using `void` as identifier produces parse errors.

### Pitfall 5: Fixing Symptom Instead of Root Cause

**What goes wrong:** Adding validation to suppress errors instead of fixing grammar to parse correctly.

**Why it happens:** Validators are easier to modify than grammar rules, tempting quick fixes.

**How to avoid:**
- If syntax is valid BBj, parser should handle it without errors — grammar fix required
- Validators check semantic correctness, not syntax validity
- Use validators for things like "unresolvable type warning" not "syntax error suppression"

**Warning signs:** Comments in validator like "workaround for grammar issue" or "ignore false positive."

## Code Examples

Verified patterns from the BBj grammar and Langium documentation:

### Example 1: Optional Keyword in Specific Position (PARSE-01 Solution Pattern)

```langium
// Current: void treated as class that must resolve
MethodDecl:
    'METHOD' Visibility Static (returnType=QualifiedClass (array?='[' ']')?)?
    name=ValidName '(' params+=ParameterDecl? (',' params+=ParameterDecl)* RPAREN

// Fixed: void as optional keyword, separate from type resolution
MethodDecl:
    'METHOD' Visibility Static (voidReturn?='void' | (returnType=QualifiedClass (array?='[' ']')?))?
    name=ValidName '(' params+=ParameterDecl? (',' params+=ParameterDecl)* RPAREN
```

**Source:** Current bbj.langium line 352-353, adapted with optional void keyword.

### Example 2: Verb Statement with Clauses (PARSE-03 Solution Pattern)

```langium
// Pattern from existing READ statement
ReadStatement:
    kind=READ_KINDS record?='RECORD'? WithChannelAndOptionsAndInputItems?

// Applied to SELECT statement
SelectStatement:
    'SELECT' '(' channelno=Expression Mode? Err? RPAREN_NO_NL template=Expression
    (':' fields+=Expression (',' fields+=Expression)*)?
    FromClause
    WhereClause?
    SortByClause?
    LimitClause?

fragment FromClause:
    'FROM' fileid=Expression

fragment WhereClause:
    'WHERE' condition=Expression

fragment SortByClause:
    'SORTBY' sortExpression=Expression

fragment LimitClause:
    'LIMIT' first=Expression ',' count=Expression
```

**Source:** [SELECT Verb Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/select_verb.htm) + existing ReadStatement pattern (bbj.langium line 581-583).

### Example 3: Array Notation in Type Position (PARSE-04 Solution Pattern)

```langium
// Current: Works in declarations
VariableDecl:
    'declare' auto?='auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName

// Current: Works in method signatures
MethodDecl:
    'METHOD' Visibility Static (returnType=QualifiedClass (array?='[' ']')?)?
    name=ValidName '(' params+=ParameterDecl? (',' params+=ParameterDecl)* RPAREN

// Need: Also work in expressions (for CAST first argument)
// Option: Enhance QualifiedClass to optionally include array brackets
QualifiedClass:
    (BBjTypeRef | SimpleTypeRef | JavaTypeRef) (arrayDims?='[' ']')*

// OR: Create TypeExpression rule
TypeExpression:
    type=QualifiedClass (arrayDims?='[' ']')*
```

**Source:** Current bbj.langium lines 298, 353, 365 showing existing array notation pattern.

### Example 4: Terminal Ordering for Token Disambiguation

```langium
// Current terminal definitions (order matters!)
terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/;
terminal ID: /[_a-zA-Z][\w_]*(@)?/;
terminal RPAREN_NO_NL returns string: ')';

// Potential DEF FN issue: In single-line DEF, `)=expr` followed by `var$`
// Lexer may tokenize as: RPAREN_NO_NL, '=', ID_WITH_SUFFIX
// But context expects: RPAREN_NO_NL as part of DEF syntax

// Solution may require: Lookahead in terminal pattern
terminal RPAREN_NO_NL returns string: /\)(?!=)/;  // ) not followed by =

// OR: Different token for DEF context
terminal RPAREN_DEF returns string: /\)(?==)/;    // ) followed by =
```

**Source:** Current bbj.langium lines 918-920, 659-661. Pattern informed by [Chevrotain Lexer Patterns](https://chevrotain.io/docs/tutorial/step1_lexing.html).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global keyword lists | Context-specific keyword rules | Langium 3.0+ | Keywords can be valid identifiers in different contexts |
| Manual lexer state machines | Terminal pattern ordering + lookahead | Chevrotain 11.0+ | Simpler disambiguation via regex lookahead |
| Validator-based syntax filtering | Grammar-level syntax acceptance | Langium 4.0+ best practice | Parser produces correct AST; validators check semantics only |
| Fixed terminal precedence | ALL(*) lookahead algorithm | Langium 4.0 | Better handling of ambiguous alternatives |

**Recent enhancement (Langium 4.1):** Terminal definitions can use positive/negative lookahead for fine-grained lexer behavior. This may help PARSE-02 (DEF FN) if the issue is distinguishing `)=` from `) var$`.

**Deprecated/outdated:**
- Suppressing parse errors in validators — Modern Langium: fix grammar to accept valid syntax
- Hardcoded keyword tables — Modern Langium: use optional keyword syntax in specific rules

**Sources:**
- [Langium Changelog](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md)
- [Langium Grammar Reference](https://langium.org/docs/reference/grammar-language/)

## Open Questions

1. **PARSE-02 Root Cause Clarification**
   - What we know: DEF FN with suffixed variables works in main program, fails in method bodies
   - What's unclear: Exact token sequence causing lexer error — is it RPAREN_NO_NL, the suffix, or line continuation interaction?
   - Recommendation: Add debug logging to lexer for this specific pattern; may need to examine generated tokens for failing vs. working case

2. **SELECT Multi-Dimensional Syntax Edge Cases**
   - What we know: Basic SELECT with FROM/WHERE/SORTBY/LIMIT documented
   - What's unclear: Can FROM/WHERE/SORTBY appear in any order, or is order fixed? Documentation shows specific order.
   - Recommendation: Implement fixed order per documentation; if BBj compiler accepts other orders, enhance later

3. **Array Type Dimension Limits in CAST**
   - What we know: `Type[]`, `Type[][]` should work
   - What's unclear: Is there a practical limit? BBj supports multi-dimensional arrays.
   - Recommendation: Support unlimited `[]` repetitions in grammar; if issues arise, document and limit later

4. **Void Keyword Case Sensitivity**
   - What we know: BBj is case-insensitive
   - What's unclear: Should `VOID`, `Void`, `void` all work in method signatures?
   - Recommendation: Test with multiple cases; Langium keywords default to case-sensitive, may need terminal rule for case-insensitive matching

## Sources

### Primary (HIGH confidence)

- **bbj.langium** (current grammar) — Shows existing patterns for optional keywords, verb statements, array notation
- **bbj-lexer.ts** (custom lexer) — Demonstrates line continuation preprocessing and token handling
- **line-break-validation.ts** — Shows how statement patterns are validated for line breaks
- **bbj-validator.ts** — checkCastTypeResolvable (lines 75-103) shows current cast handling
- [Langium Grammar Language Reference](https://langium.org/docs/reference/grammar-language/) — Official grammar syntax
- [SELECT Verb Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/select_verb.htm) — Official BBj syntax
- [Chevrotain Lexer Tutorial](https://chevrotain.io/docs/tutorial/step1_lexing.html) — Token pattern fundamentals

### Secondary (MEDIUM confidence)

- [Langium Keywords as Identifiers](https://langium.org/docs/recipes/keywords-as-identifiers/) — Context-specific keyword patterns
- [Chevrotain Custom Token Patterns](https://chevrotain.io/docs/guide/custom_token_patterns.html) — Advanced lexer patterns
- [Langium Indentation-Sensitive Languages](https://langium.org/docs/recipes/lexing/indentation-sensitive-languages/) — Custom lexer patterns

### Tertiary (LOW confidence)

- None — All research based on official documentation and current codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Using existing Langium 4.1.3, no new dependencies
- Architecture patterns: HIGH — All patterns exist in current grammar or Langium docs
- Pitfalls: MEDIUM — Based on Langium best practices and bbj-language-server test suite, some inference on specific issues

**Research date:** 2026-02-07
**Valid until:** 60 days (Langium 4.x stable, BBj syntax not changing)

**Key risks:**
- PARSE-02 may require deeper lexer debugging if terminal ordering alone doesn't fix
- SELECT clause ordering may need refinement based on actual BBj compiler behavior
- Array bracket notation in expressions may have grammar ambiguity with array indexing
