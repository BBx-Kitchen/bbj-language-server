import { describe, expect, test } from 'vitest';
import { isJavaQualifiedName, MAX_JAVA_IDENTIFIER_LENGTH } from '../src/language/java-peer-guard.js';

// Class names supplied by the interop peer are inserted into a user's source only when they are
// Java qualified names (issue #525). The `$` (nested-class) case is exercised on the predicate
// directly, not through a candidate-producing call site: today's candidate producers in
// java-interop.ts explicitly skip any simple name containing `$`, so it never reaches a live
// auto-import suggestion, but a user can still type `use java.util.Map$Entry` by hand.
describe('isJavaQualifiedName', () => {
    const longIdentifier = 'a'.repeat(MAX_JAVA_IDENTIFIER_LENGTH);
    const tooLongIdentifier = 'a'.repeat(MAX_JAVA_IDENTIFIER_LENGTH + 1);

    test.each([
        ['java.util.HashMap'],
        ['java.util.Map$Entry'],
        ['java.util.Map.Entry'],
        ['com.basis.bbj.proxies.BBjAPI'],
        ['$Proxy12'],
        ['a.b_c.D9'],
        ['com.exämple.Klasse'],
        ['HashMap'],
        [longIdentifier]
    ])('accepts %s', (fqn) => {
        expect(isJavaQualifiedName(fqn)).toBe(true);
    });

    test.each([
        ['', 'an empty string'],
        [undefined, 'undefined'],
        [null, 'null'],
        [42, 'a number'],
        ['java.util;HashMap', 'a semicolon'],
        ['java.util.Hash Map', 'an embedded space'],
        [' java.util.HashMap', 'a leading space'],
        ['java.util.HashMap\n', 'a trailing line feed'],
        ['java.util.HashMap\r', 'a trailing carriage return'],
        ['Foo\nRUN "x.bbj"', 'a line feed followed by a BBj statement'],
        ['.Foo', 'a leading dot'],
        ['Foo.', 'a trailing dot'],
        ['a..b', 'an empty segment'],
        ['1abc.Foo', 'a segment starting with a digit'],
        ['java.util.Map<String>', 'angle brackets'],
        ['java-util.Map', 'a hyphen'],
        ['java.util.Map‮', 'a trailing right-to-left override'],
        ['java.util.Map​', 'a trailing zero-width space'],
        [tooLongIdentifier, 'one character over the length limit']
    ])('rejects %s (%s)', (fqn) => {
        expect(isJavaQualifiedName(fqn)).toBe(false);
    });

    test('is pure: calling it twice on the same input gives the same answer', () => {
        expect(isJavaQualifiedName('java.util.HashMap')).toBe(isJavaQualifiedName('java.util.HashMap'));
        expect(isJavaQualifiedName('java.util.Hash Map')).toBe(isJavaQualifiedName('java.util.Hash Map'));
    });
});
