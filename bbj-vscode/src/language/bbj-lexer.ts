import { DefaultLexer, LexerResult } from "langium";

export class BbjLexer extends DefaultLexer {
    override tokenize(text: string): LexerResult {
        if (!/\r?\n$/.test(text)) {
            // prevent expect <[LINE_BREAK]> at the end of the last statement
            return super.tokenize(text + '\n');
        }
        return super.tokenize(text);
    }
} 