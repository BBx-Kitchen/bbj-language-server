import { describe, expect, test } from 'vitest';
import {
    isBoolean, isFiniteInt, isIntArray, isOneOf, isPanelMessage, isPlainObject, isString, isStringArray,
    PanelMessageSpec,
} from '../src/webview-message-guard.js';

/**
 * Unit coverage for the shared composer-webview message-shape primitives (#604): every function
 * here is dependency-free (no `vscode` import, no schema library) and is exercised with plain
 * values only.
 */

describe('isPlainObject', () => {
    test.each([
        [{}, true],
        [Object.create(null), true],
        [{ a: 1 }, true],
        [null, false],
        [undefined, false],
        [[], false],
        [[1, 2], false],
        ['x', false],
        [42, false],
        [() => { /* noop */ }, false],
    ])('isPlainObject(%p) === %p', (value, expected) => {
        expect(isPlainObject(value)).toBe(expected);
    });
});

describe('isString', () => {
    test.each([
        ['', true],
        ['hello', true],
        [42, false],
        [true, false],
        [null, false],
        [undefined, false],
        [[], false],
        [{}, false],
    ])('isString(%p) === %p', (value, expected) => {
        expect(isString(value)).toBe(expected);
    });
});

describe('isBoolean', () => {
    test.each([
        [true, true],
        [false, true],
        [0, false],
        [1, false],
        ['true', false],
        [null, false],
        [undefined, false],
    ])('isBoolean(%p) === %p', (value, expected) => {
        expect(isBoolean(value)).toBe(expected);
    });
});

describe('isFiniteInt', () => {
    test.each([
        [0, true],
        [-1, true],
        [2147483648, true],
        [2.0, true],
        [1.5, false],
        [NaN, false],
        [Infinity, false],
        [-Infinity, false],
        ['1', false],
        [true, false],
        [null, false],
        [undefined, false],
    ])('isFiniteInt(%p) === %p', (value, expected) => {
        expect(isFiniteInt(value)).toBe(expected);
    });
});

describe('isStringArray', () => {
    test.each([
        [[], true],
        [['a', 'b'], true],
        ['a string', false],
        [{ length: 1, 0: 'a' }, false],
        [['a', 1], false],
        [[1, 2], false],
    ])('isStringArray(%p) === %p', (value, expected) => {
        expect(isStringArray(value)).toBe(expected);
    });
});

describe('isIntArray', () => {
    test.each([
        [[], true],
        [[1, 2, 3], true],
        ['a string', false],
        [{ length: 1, 0: 1 }, false],
        [[1, 'a'], false],
        [[1, 1.5], false],
        [[1, NaN], false],
    ])('isIntArray(%p) === %p', (value, expected) => {
        expect(isIntArray(value)).toBe(expected);
    });
});

describe('isOneOf', () => {
    const list = ['set', 'clear', 'leave'] as const;
    test.each([
        ['set', true],
        ['clear', true],
        ['leave', true],
        ['maybe', false],
        [1, false],
        [null, false],
        [undefined, false],
    ])('isOneOf(%p, [set, clear, leave]) === %p', (value, expected) => {
        expect(isOneOf(value, list)).toBe(expected);
    });
});

describe('isPanelMessage', () => {
    interface Selection { name: string }
    const spec: PanelMessageSpec<Selection> = {
        types: ['ready', 'change', 'insert', 'cancel'],
        payloadTypes: ['change', 'insert'],
        isPayload: (value: unknown): value is Selection =>
            isPlainObject(value) && isString(value.name),
    };

    test('false for a non-plain-object message', () => {
        expect(isPanelMessage(null, spec)).toBe(false);
        expect(isPanelMessage(undefined, spec)).toBe(false);
        expect(isPanelMessage('insert', spec)).toBe(false);
        expect(isPanelMessage(42, spec)).toBe(false);
        expect(isPanelMessage([], spec)).toBe(false);
    });

    test('false for a missing or non-string type', () => {
        expect(isPanelMessage({}, spec)).toBe(false);
        expect(isPanelMessage({ type: 42 }, spec)).toBe(false);
        expect(isPanelMessage({ type: null }, spec)).toBe(false);
    });

    test('false for a type outside the spec', () => {
        expect(isPanelMessage({ type: 'bogus' }, spec)).toBe(false);
    });

    test('a payload-carrying type with an absent payload is true', () => {
        expect(isPanelMessage({ type: 'change' }, spec)).toBe(true);
        expect(isPanelMessage({ type: 'insert' }, spec)).toBe(true);
    });

    test('a payload-carrying type with a null payload is false', () => {
        expect(isPanelMessage({ type: 'change', payload: null }, spec)).toBe(false);
    });

    test('a payload-carrying type defers to spec.isPayload for a present payload', () => {
        expect(isPanelMessage({ type: 'change', payload: { name: 'ok' } }, spec)).toBe(true);
        expect(isPanelMessage({ type: 'change', payload: { name: 42 } }, spec)).toBe(false);
        expect(isPanelMessage({ type: 'change', payload: {} }, spec)).toBe(false);
        expect(isPanelMessage({ type: 'change', payload: [] }, spec)).toBe(false);
        expect(isPanelMessage({ type: 'change', payload: 'x' }, spec)).toBe(false);
    });

    test('a type outside payloadTypes ignores payload entirely', () => {
        expect(isPanelMessage({ type: 'ready', payload: 'garbage' }, spec)).toBe(true);
        expect(isPanelMessage({ type: 'cancel', payload: null }, spec)).toBe(true);
    });
});
