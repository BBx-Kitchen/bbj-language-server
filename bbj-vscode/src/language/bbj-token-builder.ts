import { TokenType, TokenVocabulary } from "chevrotain";
import { DefaultTokenBuilder, GrammarAST, TokenBuilderOptions } from "langium";

export class BBjTokenBuilder extends DefaultTokenBuilder {

    override buildTokens(grammar: GrammarAST.Grammar, options?: TokenBuilderOptions | undefined): TokenVocabulary {
        const tokens = super.buildTokens(grammar, options) as TokenType[];
        this.spliceToken(tokens, 'FNEND', 1);
        this.spliceToken(tokens, 'NEXT_TOKEN', 1);
        this.spliceToken(tokens, 'METHODRET_END', 1);
        this.spliceToken(tokens, 'ENDLINE_RETURN', 1);
        this.spliceToken(tokens, 'ENDLINE_PRINT_COMMA', 1);
        return tokens;
    }

    private spliceToken(tokens: TokenType[], name: string, index: number) {
        const nextTokenIndex = tokens.findIndex(type => type.name === name);
        const nextToken = tokens.splice(nextTokenIndex, 1);
        tokens.splice(index, 0, ...nextToken);
    }

    protected override buildTerminalToken(terminal: GrammarAST.TerminalRule): TokenType {
        if (terminal.name === 'FNEND') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/FNEND[ \t]*(?=(;|\r?\n))/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'NEXT_TOKEN') {
            const token: TokenType = {
                name: terminal.name,
                PATTERN: this.regexPatternFunction(/(?<=\r?\n[ \t]*)next(?=[ \t]*([_a-zA-Z][\w_]*(!|\$|%)?)?\r?\n)/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'METHODRET_END') {
            const token: TokenType = {
                name: terminal.name,
                // Add more expceptional tokens here if an explicit line break token is needed
                PATTERN: this.regexPatternFunction(/METHODRET[ \t]*(?=(;|\r?\n))/i),
                LINE_BREAKS: false
            };
            return token;
        } else if (terminal.name === 'ENDLINE_PRINT_COMMA') {
            const token: TokenType = {
                name: terminal.name,
                // Add more expceptional tokens here if an explicit line break token is needed
                PATTERN: this.regexPatternFunction(/,(?=(\r?\n))/i),
                LINE_BREAKS: true
            };
            return token;
        } else {
            return super.buildTerminalToken(terminal);
        }
    }

}
