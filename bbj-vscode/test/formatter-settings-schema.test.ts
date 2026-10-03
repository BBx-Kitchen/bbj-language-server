/*---------------------------------------------------------------------------------------------
 * Pins the formatter settings the extension declares in package.json: names, types, bounds,
 * defaults, enum values and their descriptions, ordering, and the deprecated old spelling.
 *--------------------------------------------------------------------------------------------*/

import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    FORMATTER_DEFAULTS,
    FORMATTER_SETTING_KEYS,
    LEGACY_SPLIT_SINGLE_LINE_IF_KEY,
    normalizeFormatterSettings,
} from '../src/language/bbj-format-settings.js';

interface SettingSchema {
    type?: string | string[];
    default?: unknown;
    scope?: string;
    minimum?: number;
    maximum?: number;
    enum?: string[];
    enumDescriptions?: string[];
    description?: string;
    markdownDescription?: string;
    deprecationMessage?: string;
    markdownDeprecationMessage?: string;
    order?: number;
}

const bbjVscodeRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(
    fs.readFileSync(path.join(bbjVscodeRoot, 'package.json'), 'utf-8')
) as { contributes: { configuration: { properties: Record<string, SettingSchema> } } };
const properties = packageJson.contributes.configuration.properties;

const PREFIX = 'bbj.formatter.';
const DEPRECATED_KEY = `${PREFIX}${LEGACY_SPLIT_SINGLE_LINE_IF_KEY}`;

/** The allowed values of the six enum settings, as the bbj-ls settings reference lists them. */
const ENUM_VALUES: Record<string, string[]> = {
    indentCharacter: ['SPACE', 'TAB'],
    eolCharacter: ['KEEP', 'LF', 'CRLF'],
    ifClosingKeyword: ['KEEP', 'FI', 'ENDIF'],
    ifKeywordCase: ['KEEP', 'MATCH_IF', 'LOWER_CASE', 'UPPER_CASE'],
    parameterLayout: ['KEEP_INITIAL_LAYOUT', 'NO_BLANK', 'BEFORE_COMMA', 'AFTER_COMMA', 'BEFORE_AND_AFTER_COMMA'],
    operatorSpacing: ['KEEP', 'SPACED'],
};

const BOOLEAN_KEYS = [
    'indentLabelBlocks',
    'keywordsToUppercase',
    'splitSingleLineIf',
    'removeLineContinuation',
    'splitInlineComments',
    'splitInlineLabelComment',
    'collapseMultiLine',
    'blankLineAfterReturn',
];

function schemaOf(key: string): SettingSchema {
    const schema = properties[`${PREFIX}${key}`];
    expect(schema, `${PREFIX}${key} is declared`).toBeDefined();
    return schema;
}

function describedText(schema: SettingSchema): string {
    return schema.markdownDescription ?? schema.description ?? '';
}

/** Whether a numeric value passes the declared integer bounds of a schema. */
function acceptsInteger(schema: SettingSchema, value: number): boolean {
    return schema.type === 'integer'
        && Number.isInteger(value)
        && value >= (schema.minimum ?? Number.NEGATIVE_INFINITY)
        && value <= (schema.maximum ?? Number.POSITIVE_INFINITY);
}

describe('formatter settings schema', () => {
    const declaredFormatterKeys = Object.keys(properties).filter(key => key.startsWith(PREFIX));

    test('declares the 15 formatter settings plus the deprecated spelling and no java path', () => {
        const expected = [...FORMATTER_SETTING_KEYS.map(key => `${PREFIX}${key}`), DEPRECATED_KEY].sort();
        expect(declaredFormatterKeys.slice().sort()).toEqual(expected);
        expect(declaredFormatterKeys).not.toContain(`${PREFIX}javaPath`);
    });

    test('keeps the two spellings that differ only in case as separate settings', () => {
        expect(properties[`${PREFIX}splitSingleLineIf`]).toBeDefined();
        expect(properties[DEPRECATED_KEY]).toBeDefined();
        expect(properties[`${PREFIX}splitSingleLineIf`]).not.toBe(properties[DEPRECATED_KEY]);
        expect(properties[`${PREFIX}splitSingleLineIf`].type).toBe('boolean');
        expect(properties[DEPRECATED_KEY].type).toEqual(['boolean', 'null']);
    });

    test.each(FORMATTER_SETTING_KEYS.map(key => [key]))('%s defaults to its normalizer default in scope window', key => {
        const schema = schemaOf(key);
        expect(schema.default).toEqual(FORMATTER_DEFAULTS[key]);
        expect(schema.scope).toBe('window');
    });

    test('indentWidth is an integer from 0 to 16 and rejects values outside it', () => {
        const schema = schemaOf('indentWidth');
        expect(schema.type).toBe('integer');
        expect(schema.minimum).toBe(0);
        expect(schema.maximum).toBe(16);
        expect(schema.default).toBe(2);
        expect(acceptsInteger(schema, 0)).toBe(true);
        expect(acceptsInteger(schema, 16)).toBe(true);
        expect(acceptsInteger(schema, 17)).toBe(false);
        expect(acceptsInteger(schema, -1)).toBe(false);
    });

    test.each(BOOLEAN_KEYS.map(key => [key]))('%s is a boolean', key => {
        expect(schemaOf(key).type).toBe('boolean');
    });

    test('the boolean list and the enum list together with indentWidth cover all 15 settings', () => {
        const covered = ['indentWidth', ...BOOLEAN_KEYS, ...Object.keys(ENUM_VALUES)].sort();
        expect(covered).toEqual([...FORMATTER_SETTING_KEYS].sort());
    });

    test.each(Object.entries(ENUM_VALUES))('%s offers exactly its allowed values with one description each', (key, values) => {
        const schema = schemaOf(key);
        expect(schema.enum).toEqual(values);
        expect(values).toContain(schema.default);
        expect(schema.enumDescriptions).toBeDefined();
        expect(schema.enumDescriptions).toHaveLength(values.length);
        for (const entry of schema.enumDescriptions ?? []) {
            expect(typeof entry).toBe('string');
            expect(entry.trim().length).toBeGreaterThan(0);
        }
    });

    test('every enum setting is declared in the literal table and nothing else carries an enum', () => {
        const withEnum = declaredFormatterKeys
            .filter(key => properties[key].enum !== undefined)
            .map(key => key.slice(PREFIX.length))
            .sort();
        expect(withEnum).toEqual(Object.keys(ENUM_VALUES).sort());
    });

    test.each(FORMATTER_SETTING_KEYS.map(key => [key]))('%s has a description', key => {
        expect(describedText(schemaOf(key)).trim().length).toBeGreaterThan(0);
    });

    test('ifClosingKeyword explains KEEP and the closer that gets added', () => {
        const text = schemaOf('ifClosingKeyword').markdownDescription ?? '';
        expect(text).toContain('KEEP');
        expect(text).toContain('FI');
    });

    test('ifKeywordCase explains KEEP and that keywordsToUppercase wins', () => {
        const text = schemaOf('ifKeywordCase').markdownDescription ?? '';
        expect(text).toContain('KEEP');
        expect(text).toContain('keywordsToUppercase');
    });

    test('keywordsToUppercase states that it wins over ifKeywordCase', () => {
        const text = schemaOf('keywordsToUppercase').markdownDescription ?? '';
        expect(text).toContain('ifKeywordCase');
        expect(text).toMatch(/wins/i);
    });

    test('the 15 settings carry distinct integer order values', () => {
        const orders = FORMATTER_SETTING_KEYS.map(key => schemaOf(key).order);
        for (const order of orders) {
            expect(Number.isInteger(order)).toBe(true);
        }
        expect(new Set(orders).size).toBe(FORMATTER_SETTING_KEYS.length);
    });

    test('settings are grouped as indentation, keywords and IF, layout, then line endings', () => {
        const order = (key: string): number => schemaOf(key).order as number;
        const indentation = ['indentWidth', 'indentCharacter', 'indentLabelBlocks'];
        const keywordsAndIf = ['keywordsToUppercase', 'ifClosingKeyword', 'ifKeywordCase', 'splitSingleLineIf'];
        const layout = [
            'removeLineContinuation', 'splitInlineComments', 'splitInlineLabelComment',
            'collapseMultiLine', 'blankLineAfterReturn', 'parameterLayout', 'operatorSpacing',
        ];
        const lineEndings = ['eolCharacter'];
        const groups = [indentation, keywordsAndIf, layout, lineEndings];
        for (let g = 0; g + 1 < groups.length; g++) {
            const highestOfGroup = Math.max(...groups[g].map(order));
            const lowestOfNext = Math.min(...groups[g + 1].map(order));
            expect(highestOfGroup).toBeLessThan(lowestOfNext);
        }
        expect([...indentation, ...keywordsAndIf, ...layout, ...lineEndings].sort())
            .toEqual([...FORMATTER_SETTING_KEYS].sort());
    });

    test('the deprecated spelling is a nullable boolean that points to the new spelling and has no order', () => {
        const schema = properties[DEPRECATED_KEY];
        expect(schema.type).toEqual(['boolean', 'null']);
        expect(schema.default).toBeNull();
        expect(schema.scope).toBe('window');
        expect(schema.order).toBeUndefined();
        expect(schema.deprecationMessage).toContain('splitSingleLineIf');
        expect(schema.markdownDeprecationMessage).toContain('splitSingleLineIf');
    });

    test('the declared defaults, the deprecated null included, normalize to exactly the defaults', () => {
        const declared: Record<string, unknown> = {};
        for (const key of declaredFormatterKeys) {
            declared[key.slice(PREFIX.length)] = properties[key].default;
        }
        expect(Object.keys(declared)).toContain(LEGACY_SPLIT_SINGLE_LINE_IF_KEY);
        expect(declared[LEGACY_SPLIT_SINGLE_LINE_IF_KEY]).toBeNull();
        expect(normalizeFormatterSettings(declared)).toEqual(FORMATTER_DEFAULTS);
        expect(normalizeFormatterSettings(declared).indentWidth).toBe(2);
    });

    test('the prompt-on-open setting describes denumbering without promising a replacement', () => {
        const description = properties['bbj.denumber.promptOnOpen'].description ?? '';
        expect(description).toBe(
            'When opening a line-numbered BBj program, prompt to denumber it for editing or open it read-only.'
        );
        expect(description).toContain('read-only');
        expect(description).not.toMatch(/replac/i);
    });
});

describe('formatter settings against the bbj-ls settings reference', () => {
    const bbjLsRepo = process.env.BBJ_LS_REPO ?? path.resolve(bbjVscodeRoot, '../../bbj-ls');
    const readme = path.join(bbjLsRepo, 'bbj-ls-formatter', 'README.md');

    test.skipIf(!fs.existsSync(readme))('lists the same allowed values as the literal enum table', () => {
        const text = fs.readFileSync(readme, 'utf-8');
        const rows = new Map<string, string>();
        for (const line of text.split(/\r?\n/)) {
            const cells = line.split('|').map(cell => cell.trim());
            const name = /^`([A-Za-z]+)`$/.exec(cells[1] ?? '');
            if (cells.length >= 5 && name && FORMATTER_SETTING_KEYS.includes(name[1] as never)) {
                rows.set(name[1], cells[3]);
            }
        }
        expect([...rows.keys()].sort()).toEqual([...FORMATTER_SETTING_KEYS].sort());
        expect(rows.get('indentWidth')).toBe('`0` to `16`');
        for (const [key, values] of Object.entries(ENUM_VALUES)) {
            const listed = [...(rows.get(key) ?? '').matchAll(/`([A-Z_]+)`/g)].map(match => match[1]);
            expect(listed, `${key} allowed values`).toEqual(values);
        }
    });
});
