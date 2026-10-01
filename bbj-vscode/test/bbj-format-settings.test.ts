import { afterEach, describe, expect, test } from 'vitest';
import {
    FORMATTER_DEFAULTS,
    FORMATTER_SETTING_KEYS,
    FormatterSettingsHolder,
    LEGACY_SPLIT_SINGLE_LINE_IF_KEY,
    normalizeFormatterSettings
} from '../src/language/bbj-format-settings.js';

describe('normalizeFormatterSettings', () => {
    test('defaults carry exactly the 15 keys with indentWidth 2', () => {
        expect(Object.keys(FORMATTER_DEFAULTS)).toEqual([...FORMATTER_SETTING_KEYS]);
        expect(FORMATTER_SETTING_KEYS).toHaveLength(15);
        expect(FORMATTER_DEFAULTS.indentWidth).toBe(2);
    });

    test.each([
        ['undefined', undefined],
        ['null', null],
        ['a string', 'x'],
        ['a number', 42],
        ['an array', []]
    ])('%s yields the defaults', (_name, raw) => {
        const out = normalizeFormatterSettings(raw);
        expect(out).toEqual(FORMATTER_DEFAULTS);
        expect(Object.keys(out)).toHaveLength(15);
        expect(out.indentWidth).toBe(2);
    });

    test('the object VS Code sends keeps its values, drops javaPath and maps the legacy key', () => {
        const out = normalizeFormatterSettings({
            indentWidth: 2,
            removeLineContinuation: false,
            keywordsToUppercase: true,
            splitSingleLineIF: true,
            javaPath: '/usr/bin/java'
        });
        expect(out.keywordsToUppercase).toBe(true);
        expect(out.splitSingleLineIf).toBe(true);
        expect(out).not.toHaveProperty('javaPath');
        expect(out).not.toHaveProperty(LEGACY_SPLIT_SINGLE_LINE_IF_KEY);
        expect(Object.keys(out)).toHaveLength(15);
    });

    test('the new splitSingleLineIf key wins over the legacy spelling', () => {
        const out = normalizeFormatterSettings({ splitSingleLineIf: false, splitSingleLineIF: true });
        expect(out.splitSingleLineIf).toBe(false);
        expect(out).not.toHaveProperty(LEGACY_SPLIT_SINGLE_LINE_IF_KEY);
    });

    test('a null value keeps the default and an unknown key is dropped', () => {
        expect(normalizeFormatterSettings({ indentWidth: null }).indentWidth).toBe(2);
        const out = normalizeFormatterSettings({ foo: 1, indentWidth: 3 });
        expect(out.indentWidth).toBe(3);
        expect(out).not.toHaveProperty('foo');
    });

    test('a non-scalar value for a known key is forwarded as its JSON text', () => {
        expect(normalizeFormatterSettings({ indentWidth: [2] }).indentWidth).toBe('[2]');
        expect(normalizeFormatterSettings({ indentCharacter: { a: 1 } }).indentCharacter).toBe('{"a":1}');
        expect(normalizeFormatterSettings({ indentWidth: '4' }).indentWidth).toBe('4');
    });

    test('values that JSON cannot express still become text, never a number or null', () => {
        expect(normalizeFormatterSettings({ indentWidth: Number.NaN }).indentWidth).toBe('null');
        expect(normalizeFormatterSettings({ indentWidth: Infinity }).indentWidth).toBe('null');
        const fn = () => 1;
        expect(normalizeFormatterSettings({ indentWidth: fn }).indentWidth).toBe(String(fn));
        expect(normalizeFormatterSettings({ indentWidth: BigInt(7) }).indentWidth).toBe('7');
    });

    test('a value whose JSON conversion throws falls back to its string form', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        expect(normalizeFormatterSettings({ indentCharacter: circular }).indentCharacter).toBe('[object Object]');
    });

    test('the output lists the 15 keys in the fixed order whatever the input order', () => {
        const reversed: Record<string, unknown> = {};
        for (const key of [...FORMATTER_SETTING_KEYS].reverse()) {
            reversed[key] = FORMATTER_DEFAULTS[key];
        }
        expect(Object.keys(normalizeFormatterSettings(reversed))).toEqual([...FORMATTER_SETTING_KEYS]);
    });

    describe('prototype keys', () => {
        afterEach(() => {
            delete (Object.prototype as Record<string, unknown>).polluted;
        });

        test('a parsed __proto__ key neither reaches the output nor pollutes Object.prototype', () => {
            const raw = JSON.parse('{"__proto__": {"polluted": true}, "indentWidth": 3}');
            const out = normalizeFormatterSettings(raw);
            expect(out.indentWidth).toBe(3);
            expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
            expect(Object.keys(out)).toEqual([...FORMATTER_SETTING_KEYS]);
            expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
            expect((out as Record<string, unknown>).polluted).toBeUndefined();
        });

        test('a value inherited through the prototype chain is ignored', () => {
            const inherited = Object.create({ indentWidth: 9, keywordsToUppercase: true });
            const out = normalizeFormatterSettings(inherited);
            expect(out).toEqual(FORMATTER_DEFAULTS);
        });
    });

    test('every output value is a string, a finite number or a boolean', () => {
        const out = normalizeFormatterSettings({
            indentWidth: [1], indentCharacter: null, keywordsToUppercase: {}, eolCharacter: 'LF',
            collapseMultiLine: true, operatorSpacing: Number.NaN
        });
        for (const value of Object.values(out)) {
            const type = typeof value;
            expect(['string', 'number', 'boolean']).toContain(type);
            if (type === 'number') {
                expect(Number.isFinite(value)).toBe(true);
            }
        }
    });
});

describe('FormatterSettingsHolder', () => {
    test('starts at the defaults with revision 0', () => {
        const holder = new FormatterSettingsHolder();
        expect(holder.revision).toBe(0);
        expect(holder.snapshot()).toEqual(FORMATTER_DEFAULTS);
    });

    test('the revision moves only on a real change', () => {
        const holder = new FormatterSettingsHolder();
        expect(holder.set({})).toBe(false);
        expect(holder.revision).toBe(0);
        expect(holder.set({ indentWidth: 4 })).toBe(true);
        expect(holder.revision).toBe(1);
        expect(holder.set({ indentWidth: 4 })).toBe(false);
        expect(holder.revision).toBe(1);
        expect(holder.snapshot().indentWidth).toBe(4);
    });

    test('the same settings listed in another order are not a change', () => {
        const holder = new FormatterSettingsHolder();
        holder.set({ indentWidth: 4, keywordsToUppercase: true });
        expect(holder.set({ keywordsToUppercase: true, indentWidth: 4 })).toBe(false);
        expect(holder.revision).toBe(1);
    });

    test('a settings change back to the defaults is a change', () => {
        const holder = new FormatterSettingsHolder();
        holder.set({ indentWidth: 4 });
        expect(holder.set(undefined)).toBe(true);
        expect(holder.revision).toBe(2);
        expect(holder.snapshot()).toEqual(FORMATTER_DEFAULTS);
    });

    test('mutating a returned snapshot does not change the next snapshot', () => {
        const holder = new FormatterSettingsHolder();
        const first = holder.snapshot();
        first.indentWidth = 99;
        delete first.indentCharacter;
        expect(holder.snapshot()).toEqual(FORMATTER_DEFAULTS);
    });

    test('userKeyFor names the legacy spelling only when the user set it', () => {
        const holder = new FormatterSettingsHolder();
        holder.set({ splitSingleLineIF: true });
        expect(holder.userKeyFor('splitSingleLineIf')).toBe('splitSingleLineIF');
        holder.set({ splitSingleLineIf: true, splitSingleLineIF: false });
        expect(holder.userKeyFor('splitSingleLineIf')).toBe('splitSingleLineIf');
        expect(holder.userKeyFor('indentWidth')).toBe('indentWidth');
    });

    test('userKeyFor follows the latest settings even when the values are equal', () => {
        const holder = new FormatterSettingsHolder();
        holder.set({ splitSingleLineIF: true });
        expect(holder.set({ splitSingleLineIf: true })).toBe(false);
        expect(holder.userKeyFor('splitSingleLineIf')).toBe('splitSingleLineIf');
        holder.set({ splitSingleLineIF: null });
        expect(holder.userKeyFor('splitSingleLineIf')).toBe('splitSingleLineIf');
    });

    test('javaPath and unknown keys never appear in the snapshot', () => {
        const holder = new FormatterSettingsHolder();
        holder.set({ javaPath: '/usr/bin/java', mystery: 1 });
        expect(holder.revision).toBe(0);
        expect(Object.keys(holder.snapshot())).toEqual([...FORMATTER_SETTING_KEYS]);
    });
});
