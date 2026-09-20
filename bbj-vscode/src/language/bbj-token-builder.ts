import { TokenType, TokenVocabulary } from "chevrotain";
import { DefaultTokenBuilder, GrammarAST, GrammarUtils, RegExpUtils, stream, TokenBuilderOptions } from "langium";


export class BBjTokenBuilder extends DefaultTokenBuilder {
    static EXCLUDED = new Set(['METHODEND', 'CLASSEND', 'INTERFACEEND'])
    override buildTokens(grammar: GrammarAST.Grammar, options?: TokenBuilderOptions | undefined): TokenVocabulary {
        const reachableRules = stream(GrammarUtils.getAllReachableRules(grammar, false));
        const terminalTokens: TokenType[] = this.buildTerminalTokens(reachableRules);
        const tokens: TokenType[] = this.buildKeywordTokens(reachableRules, terminalTokens, options);

        terminalTokens.forEach(terminalToken => {
            const pattern = terminalToken.PATTERN;
            if (typeof pattern === 'object' && pattern && 'test' in pattern && RegExpUtils.isWhitespace(pattern)) {
                tokens.unshift(terminalToken);
            } else {
                tokens.push(terminalToken);
            }
        });

        this.reorderTokenPriorities(tokens);

        const id = terminalTokens.find(e => e.name === 'ID')!;
        const idWithSuffix = terminalTokens.find(e => e.name === 'ID_WITH_SUFFIX')!;
        const terminalNames = new Set(terminalTokens.map(t => t.name));

        for (const keywordToken of tokens) {
            if (/[A-Z]+(?!_)/.test(keywordToken.name)
                    && !terminalNames.has(keywordToken.name)
                    && !('LINE_BREAKS' in keywordToken)
                    && !BBjTokenBuilder.EXCLUDED.has(keywordToken.name)) {
                // add all matching keywords to ID category
                keywordToken.CATEGORIES = [id];
                // ID_WITH_SUFFIX first: identifiers with suffix (printTest$, stepXYZ!, indVal%)
                // must match before ID, otherwise ID matches without suffix and $ is orphaned
                keywordToken.LONGER_ALT = [idWithSuffix, id];
            }
        }

        const releaseNl = terminalTokens.find(e => e.name === 'RELEASE_NL')!;
        const releaseNoNl = terminalTokens.find(e => e.name === 'RELEASE_NO_NL')!;
        releaseNl.CATEGORIES = [id];
        releaseNoNl.CATEGORIES = [id];
        releaseNl.LONGER_ALT = [idWithSuffix, id];
        releaseNoNl.LONGER_ALT = [idWithSuffix, id];

        const exitNoNl = terminalTokens.find(e => e.name === 'EXIT_NO_NL')!;
        exitNoNl.CATEGORIES = [id];
        exitNoNl.LONGER_ALT = [idWithSuffix, id];

        return tokens;
    }

    /**
     * Splices the 14 custom tokens with an explicit priority requirement (line-break markers,
     * standalone-vs-expression disambiguators, etc.) to the front of the token vocabulary
     * (P61-D4-005). Extracted out of buildTokens() so a future edit to this reordering can't
     * accidentally land inside the unrelated CATEGORIES/LONGER_ALT wiring that follows it in
     * buildTokens() — same custom patterns and ordering as before the extraction, unchanged.
     */
    private reorderTokenPriorities(tokens: TokenType[]): void {
        this.spliceToken(tokens, 'START_BREAK');
        this.spliceToken(tokens, 'FNEND');
        this.spliceToken(tokens, 'NEXT_BREAK');
        this.spliceToken(tokens, 'NEXT_ID');
        this.spliceToken(tokens, 'METHODRET_END');
        this.spliceToken(tokens, 'ENDLINE_PRINT_COMMA');
        this.spliceToken(tokens, 'KEYWORD_STANDALONE');
        this.spliceToken(tokens, 'PRINT_STANDALONE_NL');
        this.spliceToken(tokens, 'RPAREN_NL');
        this.spliceToken(tokens, 'ASTERISK_EXPRESSION');
        this.spliceToken(tokens, 'ASTERISK_STANDALONE');
        this.spliceToken(tokens, 'RELEASE_NL');
        this.spliceToken(tokens, 'RELEASE_NO_NL');
        this.spliceToken(tokens, 'EXIT_NO_NL');
        this.spliceToken(tokens, 'TABLE_DATA');
    }

    private spliceToken(tokens: TokenType[], name: string) {
        const nextTokenIndex = tokens.findIndex(type => type.name === name);
        if (nextTokenIndex === -1) {
            // A missing name previously reached tokens.splice(-1, 1), which silently removes and
            // reorders the LAST token instead of the intended one — a silent stream corruption
            // (P61-D2-008). Fail loudly instead: buildTokens() calls this with 14 hardcoded
            // terminal names, and a future grammar edit renaming/removing one of them should be a
            // visible error, not a corrupted token vocabulary.
            throw new Error(`spliceToken: no token named '${name}' found in the token list.`);
        }
        const nextToken = tokens.splice(nextTokenIndex, 1)[0];
        tokens.splice(1, 0, nextToken);
    }

    protected override buildTerminalToken(terminal: GrammarAST.TerminalRule): TokenType {
        if (terminal.name === 'ASTERISK_STANDALONE') {
            return {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/\*(?=\s*(,|;\s*|\r?\n))/),
                LINE_BREAKS: false
            };
        } else if (terminal.name === 'ASTERISK_EXPRESSION') {
            return {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/\*/),
                LINE_BREAKS: false
            };
        } else if (terminal.name === 'RELEASE_NO_NL') {
            return {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/RELEASE(?!\s*(;\s*|\r?\n))/i),
                LINE_BREAKS: false
            };
        } else if (terminal.name === 'RELEASE_NL') {
            return {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/RELEASE(?=\s*(;\s*|\r?\n))/i),
                LINE_BREAKS: false
            };
        } else if (terminal.name === 'EXIT_NO_NL') {
            // Matches EXIT followed by horizontal whitespace then a numeric expression starter,
            // OR by an identifier expression that is not one of the words that may legally
            // follow a bare EXIT on the same line (ELSE, FI, ENDIF, THEN, REM — each checked at
            // a word boundary, case-insensitive). This lets `EXIT err` (a variable holding an
            // error code) parse as one exit statement while `IF x THEN EXIT ELSE ...` keeps
            // treating EXIT as bare, so ELSE stays its own statement.
            // EXITTO keyword is not matched because there is no whitespace between EXIT and TO.
            // Bare EXIT (at EOL or before flow-control keywords) is handled by the 'EXIT' keyword
            // token generated from the `kind='EXIT'` grammar alternative.
            return {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/EXIT(?=[ \t]+(?!(?:ELSE|FI|ENDIF|THEN|REM)\b)[0-9(+\-A-Za-z_])/i),
                LINE_BREAKS: false
            };
        } else if (terminal.name === 'RPAREN_NL') {
            return {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/\)(?=\s*(;\s*|\r?\n))/),
                LINE_BREAKS: false
            };
        } else if (terminal.name === 'START_BREAK') {
            const token: TokenType = {
                name: terminal.name,
                // excluded right after a GOTO/GOSUB branch target (BRANCH_TARGET_EXCLUSION below)
                PATTERN: this.regexPatternFunction(new RegExp(`${BRANCH_TARGET_EXCLUSION}START[ \\t]*(?=(;|\\r?\\n))`, 'i')),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'FNEND') {
            const token: TokenType = {
                name: terminal.name,
                // excluded right after a GOTO/GOSUB branch target (BRANCH_TARGET_EXCLUSION below)
                PATTERN: this.regexPatternFunction(new RegExp(`${BRANCH_TARGET_EXCLUSION}FNEND[ \\t]*(?=(;|\\r?\\n))`, 'i')),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'NEXT_BREAK') {
            const token: TokenType = {
                name: terminal.name,
                // may match `next` or `<NL>next`, but not `*next`, and not a GOTO/GOSUB target
                PATTERN: this.regexPatternFunction(new RegExp(`(?<=\\r?\\n?[^\\*][ \\t]*)${BRANCH_TARGET_EXCLUSION}next(?=[ \\t]*(?=(;|\\r?\\n)))`, 'i')),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'NEXT_ID') {
            const token: TokenType = {
                name: terminal.name,
                // may match `next ID` or `<NL>next ID`
                PATTERN: this.regexPatternFunction(/(?<=\r?\n?[ \t]*)next(?=[ \t]+([_a-zA-Z][\w_]*(!|\$|%)?)[ \t]*(?=(;|\r?\n)))/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'METHODRET_END') {
            const token: TokenType = {
                name: terminal.name,
                // Add more exceptional tokens here if an explicit line break token is needed
                // excluded right after a GOTO/GOSUB branch target (BRANCH_TARGET_EXCLUSION below)
                PATTERN: this.regexPatternFunction(new RegExp(`${BRANCH_TARGET_EXCLUSION}METHODRET[ \\t]*(?=(;|\\r?\\n))`, 'i')),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'ENDLINE_PRINT_COMMA') {
            const token: TokenType = {
                name: terminal.name,
                // Add more exceptional tokens here if an explicit line break token is needed
                PATTERN: this.regexPatternFunction(/,(?=(\r?\n|;))/),
                LINE_BREAKS: true
            };
            return token;
        } else if (terminal.name === 'PRINT_STANDALONE_NL') {
            const token: TokenType = {
                name: terminal.name,
                // excluded right after a GOTO/GOSUB branch target (BRANCH_TARGET_EXCLUSION below)
                PATTERN: this.regexPatternFunction(new RegExp(`${BRANCH_TARGET_EXCLUSION}(\\?|PRINT|WRITE)\\s*(?=(;|\\r?\\n))`, 'i')),
                LINE_BREAKS: true
            };
            return token;
        } else if (terminal.name === 'TABLE_DATA') {
            // Opaque rest-of-line data for the TABLE statement, matched only when TABLE is the
            // verb starting a statement: the lookbehind requires TABLE, plus at least one
            // space/tab, to be preceded by nothing but the start of a line (optionally with a
            // leading numeric line number and/or a "label:" prefix) or by a ';' statement
            // separator (with optional surrounding whitespace). This keeps a bare identifier
            // that merely ends in or contains "table" — mytable, rowtable, a `table` variable
            // used mid-expression — from ever being mistaken for the statement, since none of
            // those occur at a position immediately preceded by that anchor. Everything after
            // 'TABLE' plus the whitespace, up to end of line or a trailing ';rem' comment, is one
            // data token — no hex validation here, the compiler owns that. The negative lookahead
            // keeps `table = 5` / `x = table + 1` parsing as an ordinary identifier: TABLE_DATA
            // never matches immediately before an operator or closing bracket, so a
            // TableStatement is only formed when real data follows.
            return {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/(?<=(?:^|;)[ \t]*(?:\d+[ \t]+)?(?:[A-Za-z_][A-Za-z0-9_]*:[ \t]*)?TABLE[ \t]+)(?![=<>+\-*/,)\]])[^\r\n;]+/im),
                LINE_BREAKS: false
            };
        } else if (terminal.name === 'KEYWORD_STANDALONE') {
            const token: TokenType = {
                name: terminal.name,
                // excluded right after a GOTO/GOSUB branch target (BRANCH_TARGET_EXCLUSION below)
                PATTERN: this.regexPatternFunction(new RegExp(`${BRANCH_TARGET_EXCLUSION}(${KEYWORD_STANDALONE})\\s*(\\r?\\n|;)`, 'i')),
                LINE_BREAKS: true
            };
            return token;
        } else {
            return super.buildTerminalToken(terminal);
        }
    }
}

const KEYWORD_STANDALONE = 'DELETE|SAVE|ENTER|READ|INPUT|EXTRACT|FIND'

// A label whose name is one of the words above (or START, FNEND, NEXT, METHODRET, PRINT/?/WRITE)
// is lost as a GOTO/GOSUB/ON...GOTO/GOSUB branch target, because the custom end-of-line tokens
// above win the lexer's priority race and are not ID-category — the label-reference
// cross-reference can only match an ID-category token. This lookbehind suppresses each affected
// token immediately after GOTO or GOSUB (one to eight spaces or tabs, case-insensitive), and
// through a bounded run of prior comma-separated targets in the same list (so the LAST target of
// `ON x GOSUB a,b,print` is covered too, not only a single lone target) — leaving the token to
// fall back to the generic keyword-as-identifier handling used everywhere else, which the
// cross-reference already understands. Every quantifier here is bounded (never `*`/`+` alone) so
// the lookbehind cannot backtrack catastrophically.
const BRANCH_TARGET_EXCLUSION = '(?<!(?:GOTO|GOSUB)[ \\t]{1,8}(?:[_A-Za-z]\\w{0,63}@?[ \\t]{0,8},[ \\t]{0,8}){0,16})'
