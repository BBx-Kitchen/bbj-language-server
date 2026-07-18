import { readFileSync } from 'fs';
import { beforeAll, describe, expect, test } from 'vitest';
import * as oniguruma from 'vscode-oniguruma';
import { INITIAL, IGrammar, Registry, StateStack, parseRawGrammar } from 'vscode-textmate';

/**
 * TextMate tokenization test for the BBx config grammar (config.bbx / config.min).
 * Regression for #381: config.bbx must get dedicated config highlighting instead of
 * being rendered as plain text (or mis-highlighted as BBj source).
 */

let grammar: IGrammar;

beforeAll(async () => {
    await oniguruma.loadWASM(readFileSync('node_modules/vscode-oniguruma/release/onig.wasm'));
    const registry = new Registry({
        onigLib: Promise.resolve({
            createOnigScanner: (patterns: string[]) => new oniguruma.OnigScanner(patterns),
            createOnigString: (s: string) => new oniguruma.OnigString(s),
        }),
        loadGrammar: async (scopeName: string) => {
            if (scopeName === 'source.bbx') {
                const content = readFileSync('syntaxes/bbx.tmLanguage.json', 'utf8');
                return parseRawGrammar(content, 'bbx.tmLanguage.json');
            }
            return null;
        },
    });
    const loaded = await registry.loadGrammar('source.bbx');
    if (!loaded) throw new Error('failed to load source.bbx grammar');
    grammar = loaded;
});

function tokenize(line: string): Array<{ text: string; scopes: string[] }> {
    const ruleStack: StateStack = INITIAL;
    const result = grammar.tokenizeLine(line, ruleStack);
    return result.tokens.map(t => ({ text: line.substring(t.startIndex, t.endIndex), scopes: t.scopes }));
}

function scopesOf(line: string, text: string): string[] {
    const token = tokenize(line).find(t => t.text.trim() === text || t.text.includes(text));
    expect(token, `token "${text}" present in "${line}"`).toBeDefined();
    return token!.scopes;
}

describe('BBx config TextMate highlighting (#381)', () => {
    test('ALIAS directive: keyword, alias name and device are scoped', () => {
        const line = 'ALIAS T1 SYSWINDOW "" TITLE="Extra Window"';
        expect(scopesOf(line, 'ALIAS')).toContain('keyword.control.directive.alias.bbx');
        expect(scopesOf(line, 'T1')).toContain('entity.name.function.alias.bbx');
        expect(scopesOf(line, 'SYSWINDOW')).toContain('support.class.device.bbx');
        expect(scopesOf(line, 'TITLE')).toContain('entity.other.attribute-name.option.bbx');
        expect(scopesOf(line, 'Extra Window')).toContain('string.quoted.double.bbx');
    });

    test('ALIAS with Java plugin class is scoped as class name', () => {
        const line = 'ALIAS J0 com.basis.bbj.bridge.BBjBridgeOpenPlugin';
        expect(scopesOf(line, 'com.basis.bbj.bridge.BBjBridgeOpenPlugin')).toContain('entity.name.type.class.bbx');
    });

    test('ALIAS option flags are scoped', () => {
        const line = 'ALIAS TMINI MINI "BUI Mini Console" INVISIBLE,FLOAT,ROWS=24,COLS=80';
        expect(scopesOf(line, 'INVISIBLE')).toContain('entity.other.attribute-name.flag.bbx');
        expect(scopesOf(line, 'FLOAT')).toContain('entity.other.attribute-name.flag.bbx');
        expect(scopesOf(line, 'ROWS')).toContain('entity.other.attribute-name.option.bbx');
        expect(scopesOf(line, '24')).toContain('constant.numeric.decimal.bbx');
    });

    test('PREFIX directive with quoted directories', () => {
        const line = 'PREFIX "/usr/basis/bbj/utils/" "/usr/basis/bbj/plugins/"';
        expect(scopesOf(line, 'PREFIX')).toContain('keyword.control.directive.bbx');
        expect(scopesOf(line, '/usr/basis/bbj/utils/')).toContain('string.quoted.double.bbx');
    });

    test('SETOPTS hex value is numeric', () => {
        const line = 'SETOPTS 08004020000000';
        expect(scopesOf(line, 'SETOPTS')).toContain('keyword.control.directive.bbx');
        expect(scopesOf(line, '08004020000000')).toContain('constant.numeric.hex.bbx');
    });

    test('DSKSYN directive', () => {
        const line = 'DSKSYN A:';
        expect(scopesOf(line, 'DSKSYN')).toContain('keyword.control.directive.bbx');
        expect(scopesOf(line, 'A:')).toContain('constant.other.drive.bbx');
    });

    test('limit settings (KEY=value) are scoped', () => {
        expect(scopesOf('FCBS=128', 'FCBS')).toContain('keyword.other.setting.bbx');
        expect(scopesOf('FCBS=128', '128')).toContain('constant.numeric.decimal.bbx');
        expect(scopesOf('SQL=/usr/basis/bbj/cfg/sql.ini', 'SQL')).toContain('keyword.other.setting.bbx');
    });

    test('settings with omitted = still highlight the option name', () => {
        expect(scopesOf('PRECISION 2,16', 'PRECISION')).toContain('keyword.other.setting.bbx');
    });

    test('SET directive with !COMPAT option', () => {
        const line = 'SET !COMPAT=LISTBUTTON_DESELECT=TRUE';
        expect(scopesOf(line, 'SET')).toContain('keyword.control.directive.bbx');
        expect(scopesOf(line, '!COMPAT')).toContain('entity.other.attribute-name.option.bbx');
    });

    test('comment lines are comment-scoped', () => {
        const line = '# For BUI debugging, change the INVISIBLE mode to VISIBLE';
        const tokens = tokenize(line);
        expect(tokens.every(t => t.scopes.includes('comment.line.number-sign.bbx'))).toBe(true);
    });

    test('every line of examples/config.bbx and examples/config.min tokenizes without dropping to plain text on directive lines', () => {
        for (const file of ['../examples/config.bbx', '../examples/config.min']) {
            const lines = readFileSync(file, 'utf8').split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                const tokens = tokenize(line);
                // The first non-whitespace token of each directive line must carry
                // some scope beyond the base source.bbx scope.
                const first = tokens.find(t => t.text.trim().length > 0);
                expect(first, `tokens for "${line}"`).toBeDefined();
                expect(first!.scopes.length, `"${line.substring(0, 40)}..." first token should be scoped (got only ${first!.scopes.join(', ')})`).toBeGreaterThan(1);
            }
        }
    });
});
