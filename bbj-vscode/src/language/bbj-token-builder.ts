import { TokenType, TokenVocabulary } from "chevrotain";
import { DefaultTokenBuilder, GrammarAST, TokenBuilderOptions } from "langium";

export class BBjTokenBuilder extends DefaultTokenBuilder {

    override buildTokens(grammar: GrammarAST.Grammar, options?: TokenBuilderOptions | undefined): TokenVocabulary {
        const tokens = super.buildTokens(grammar, options) as TokenType[];
        this.spliceToken(tokens, 'START_BREAK', 1);
        this.spliceToken(tokens, 'FNEND', 1);
        this.spliceToken(tokens, 'NEXT_BREAK', 1);
        this.spliceToken(tokens, 'NEXT_ID', 1);
        this.spliceToken(tokens, 'METHODRET_END', 1);
        this.spliceToken(tokens, 'ENDLINE_PRINT_COMMA', 1);
        this.spliceToken(tokens, 'KEYWORD_STANDALONE', 1);
        this.spliceToken(tokens, 'PRINT_STANDALONE_NL', 1);
        return tokens;
    }

    private spliceToken(tokens: TokenType[], name: string, index: number) {
        const nextTokenIndex = tokens.findIndex(type => type.name === name);
        const nextToken = tokens.splice(nextTokenIndex, 1);
        tokens.splice(index, 0, ...nextToken);
    }

    protected override buildTerminalToken(terminal: GrammarAST.TerminalRule): TokenType {
        if (terminal.name === 'START_BREAK') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/START[ \t]*(?=(;|\r?\n))/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'FNEND') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/FNEND[ \t]*(?=(;|\r?\n))/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'NEXT_BREAK') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/(?<=\r?\n[ \t]*)next(?=[ \t]*(\r?\n))/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'NEXT_ID') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/(?<=\r?\n[ \t]*)next(?=[ \t]*([_a-zA-Z][\w_]*(!|\$|%)?)\r?\n)/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'METHODRET_END') {
            const token: TokenType = {
                name: terminal.name,
                // Add more exceptional tokens here if an explicit line break token is needed
                PATTERN: this.regexPatternFunction(/METHODRET[ \t]*(?=(;|\r?\n))/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'ENDLINE_PRINT_COMMA') {
            const token: TokenType = {
                name: terminal.name,
                // Add more exceptional tokens here if an explicit line break token is needed
                PATTERN: this.regexPatternFunction(/,(?=(\r?\n))/i),
                LINE_BREAKS: true
            };
            return token;
        } else if (terminal.name === 'PRINT_STANDALONE_NL') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/(\?|PRINT|WRITE)\s*(\r?\n)/i),
                LINE_BREAKS: true
            };
            return token;
        } else if (terminal.name === 'KEYWORD_STANDALONE') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(new RegExp(`(${KEYWORD_STANDALONE})\s*(\r?\n|;|$)`, 'i')),
                LINE_BREAKS: true
            };
            return token;
        } else {
            return super.buildTerminalToken(terminal);
        }
    }
}
const KEYWORD_STANDALONE = 'DELETE|SAVE'
