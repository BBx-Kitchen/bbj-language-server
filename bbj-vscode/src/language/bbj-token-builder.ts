import { CustomPatternMatcherFunc, TokenPattern, TokenType, TokenVocabulary } from "chevrotain";
import { DefaultTokenBuilder, GrammarAST, TokenBuilderOptions } from "langium";

export class BBjTokenBuilder extends DefaultTokenBuilder {

    override buildTokens(grammar: GrammarAST.Grammar, options?: TokenBuilderOptions | undefined): TokenVocabulary {
        const tokens = super.buildTokens(grammar, options) as TokenType[];
        const nextTokenIndex = tokens.findIndex(type => type.name === 'NEXT_TOKEN');
        const nextToken = tokens.splice(nextTokenIndex, 1);
        tokens.splice(1, 0, ...nextToken);
        return tokens;
    }

    protected override buildKeywordPattern(keyword: GrammarAST.Keyword, caseInsensitive: boolean): TokenPattern {
        if (keyword.value === 'SLTHEN') {
            return /then/i;
        } else if (keyword.value === 'MLTHENFirst') {
            return /then[ \t]*(\r?\n|rem[ \t][^\n\r]*\r?\n)/i;
        } else {
            return super.buildKeywordPattern(keyword, caseInsensitive);
        }
    }

    protected override buildTerminalToken(terminal: GrammarAST.TerminalRule): TokenType {
        if (terminal.name === 'NEXT_TOKEN') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/(?<=\r?\n[ \t]*)next(?=[ \t]*([_a-zA-Z][\w_]*(!|\$|%)?)?\r?\n)/i),
                LINE_BREAKS: true
            };
            return token;
        } else {
            return super.buildTerminalToken(terminal);
        }
    }

    protected regexPatternFunction(regex: RegExp): CustomPatternMatcherFunc {
        const stickyRegex = new RegExp(regex, regex.flags + 'y');
        return (text, offset) => {
            stickyRegex.lastIndex = offset;
            const execResult = stickyRegex.exec(text);
            return execResult;
        };
    }

}
