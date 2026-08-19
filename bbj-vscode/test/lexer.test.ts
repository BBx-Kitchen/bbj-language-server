import { EmptyFileSystem } from "langium";
import { expandToString } from "langium/generate";
import { createBBjTestServices, TestableBBjLexer } from "./bbj-test-module.js";
import { describe, test, expect } from "vitest";
import { BBjTokenBuilder } from "../src/language/bbj-token-builder.js";
import type { TokenType } from "chevrotain";

const services = createBBjTestServices(EmptyFileSystem);
const lexer = services.BBj.parser.Lexer;

describe('Lexer tests', () => {

    test('Joins split lines', () => {
        const text = expandToString`
        P
        :R
        :INT
        : "Hel
        :lo World
        :"

        PRINT "After"
        `;
        const result = lexer.tokenize(text);
        // Text is lexed correctly without errors
        expect(result.errors).toHaveLength(0);
        // Expected to have exactly 4 tokens (2 PRINT, 2 strings)
        expect(result.tokens).toHaveLength(4);
        const afterIndex = text.indexOf('PRINT "After"');
        // The second PRINT statement is starting at the correct offset
        expect(result.tokens[2].startOffset).toBe(afterIndex);
    });

    test('Joins split lines preserve offset with empty line', () => {
        const text = `
if sys = "1" then
: goto *NEXT
: goto *BREAK
PRINT "After"

`;
        const expectedSplitJoin = `
if sys = "1" then goto *NEXT goto *BREAK  


PRINT "After"


`;
        const tokenizedText = (lexer as TestableBBjLexer).prepareLineSplitter(text);
        expect(tokenizedText.length).toBe(expectedSplitJoin.length);
        expect(tokenizedText).toBe(expectedSplitJoin);
    });

    test('P61-D2-006: mixed CRLF/LF line endings preserve token offsets against the original text', () => {
        // One CRLF line followed by two LF lines. Pre-fix, prepareLineSplitter re-emits every
        // line with a single globally-detected EOL (CRLF here, since text.includes('\r\n') is
        // true), turning each LF-only line's 1-char terminator into a 2-char one and shifting
        // every downstream token offset by 1 per drifted line.
        const text = 'PRINT 1\r\nPRINT 2\nPRINT "After"\n';
        const result = lexer.tokenize(text);
        expect(result.errors).toHaveLength(0);
        const printTokens = result.tokens.filter(t => t.tokenType.name === 'PRINT');
        expect(printTokens).toHaveLength(3);
        const first = text.indexOf('PRINT');
        const second = text.indexOf('PRINT', first + 1);
        const third = text.indexOf('PRINT "After"');
        expect(printTokens.map(t => t.startOffset)).toEqual([first, second, third]);
    });

    test('P61-D2-006: a single-EOL-style file still tokenizes with unchanged offsets', () => {
        const text = 'PRINT 1\nPRINT 2\nPRINT "After"\n';
        const result = lexer.tokenize(text);
        expect(result.errors).toHaveLength(0);
        const printTokens = result.tokens.filter(t => t.tokenType.name === 'PRINT');
        const afterIndex = text.indexOf('PRINT "After"');
        expect(printTokens[2].startOffset).toBe(afterIndex);
    });

    test('P61-D2-006: a file with no trailing newline still tokenizes with unchanged offsets', () => {
        const text = 'PRINT 1\nPRINT "After"';
        const result = lexer.tokenize(text);
        expect(result.errors).toHaveLength(0);
        const printTokens = result.tokens.filter(t => t.tokenType.name === 'PRINT');
        const afterIndex = text.indexOf('PRINT "After"');
        expect(printTokens[1].startOffset).toBe(afterIndex);
    });

    test('P61-D2-008: spliceToken throws instead of silently corrupting the stream when the named token is absent', () => {
        // spliceToken is called with 14 hardcoded terminal names during buildTokens(). If any of
        // them is ever absent from the token list (e.g. a future grammar edit renames/removes one),
        // findIndex returns -1 and splicing at -1 silently reorders the wrong (last) token instead
        // of failing loudly.
        const tokenBuilder = new BBjTokenBuilder() as unknown as {
            spliceToken(tokens: TokenType[], name: string): void
        };
        const tokens: TokenType[] = [
            { name: 'FIRST', PATTERN: /first/ },
            { name: 'SECOND', PATTERN: /second/ },
            { name: 'THIRD', PATTERN: /third/ }
        ];
        expect(() => tokenBuilder.spliceToken(tokens, 'MISSING_TOKEN')).toThrow();
        // The stream must be untouched when the guard fires — no silent corruption.
        expect(tokens.map(t => t.name)).toEqual(['FIRST', 'SECOND', 'THIRD']);
    });
});
