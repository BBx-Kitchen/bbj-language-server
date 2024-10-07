import { EmptyFileSystem } from "langium";
import { expandToString } from "langium/generate";
import { createBBjTestServices } from "./bbj-test-module.js";
import { describe, test, expect } from "vitest";

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

});
