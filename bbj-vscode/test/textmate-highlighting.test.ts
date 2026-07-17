import { readFileSync } from 'fs';
import { beforeAll, describe, expect, test } from 'vitest';
import * as oniguruma from 'vscode-oniguruma';
import { INITIAL, IGrammar, Registry, StateStack, parseRawGrammar } from 'vscode-textmate';

/**
 * Real TextMate tokenization test for the BBj grammar. Regression for #107: a BBj
 * multiline string (opening quote is the last char on the line, continuation lines
 * begin with `:`) must stay in the string scope across all physical lines, instead of
 * dropping the string scope after the opening quote.
 */

const STRING_SCOPE = 'string.quoted.double.bbj';

let grammar: IGrammar;

beforeAll(async () => {
    await oniguruma.loadWASM(readFileSync('node_modules/vscode-oniguruma/release/onig.wasm'));
    const registry = new Registry({
        onigLib: Promise.resolve({
            createOnigScanner: (patterns: string[]) => new oniguruma.OnigScanner(patterns),
            createOnigString: (s: string) => new oniguruma.OnigString(s),
        }),
        loadGrammar: async (scopeName: string) => {
            if (scopeName === 'source.bbj') {
                const content = readFileSync('syntaxes/bbj.tmLanguage.json', 'utf8');
                return parseRawGrammar(content, 'bbj.tmLanguage.json');
            }
            return null;
        },
    });
    const loaded = await registry.loadGrammar('source.bbj');
    if (!loaded) throw new Error('failed to load source.bbj grammar');
    grammar = loaded;
});

/** Tokenize multiple lines, carrying grammar state across line breaks (as an editor does). */
function tokenizeLines(lines: string[]): Array<Array<{ text: string; scopes: string[] }>> {
    let ruleStack: StateStack = INITIAL;
    return lines.map(line => {
        const result = grammar.tokenizeLine(line, ruleStack);
        ruleStack = result.ruleStack;
        return result.tokens.map(t => ({ text: line.substring(t.startIndex, t.endIndex), scopes: t.scopes }));
    });
}

describe('TextMate highlighting (#107)', () => {
    test('a `:`-continued multiline string stays in string scope across lines', () => {
        // From the issue. Inner quotes are single quotes: inside a BBj "double" string a
        // bare " would close it (""" escapes), so the real example uses '...'.
        const lines = [
            'pos! = inputD!.executeScript("',
            ': (async () => {',
            ":  await customElements.whenDefined('bbj-inputd');",
            ':  return (await component.getPart(\'input\')).selectionStart',
            ':", BBjAPI.TRUE)',
        ];
        const perLine = tokenizeLines(lines);

        // Opening line: the trailing `"` opens the string.
        expect(perLine[0].some(t => t.scopes.includes(STRING_SCOPE)), 'opening quote starts a string').toBe(true);

        // Continuation lines (1..3) must be entirely inside the string scope.
        for (let i = 1; i <= 3; i++) {
            const allString = perLine[i].every(t => t.scopes.includes(STRING_SCOPE));
            expect(allString, `line ${i} ("${lines[i]}") should be fully inside the string`).toBe(true);
        }

        // Final line: the closing `"` ends the string; the code after it (BBjAPI, TRUE)
        // must NOT be string-scoped.
        const lastLine = perLine[4];
        const apiToken = lastLine.find(t => t.text.includes('BBjAPI'));
        expect(apiToken, 'BBjAPI token present on the closing line').toBeDefined();
        expect(apiToken!.scopes.includes(STRING_SCOPE), 'code after the closing quote is not string-scoped').toBe(false);
    });

    test('a normal single-line string still terminates at its closing quote', () => {
        const [tokens] = tokenizeLines(['x$ = "hello" + y$']);
        const yToken = tokens.find(t => t.text.includes('y$'));
        expect(yToken, 'y$ token present').toBeDefined();
        expect(yToken!.scopes.includes(STRING_SCOPE), 'text after the closed string is not string-scoped').toBe(false);
    });
});
