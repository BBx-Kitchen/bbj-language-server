/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Unit tests for the canonical nested-class name used by `JavaInteropService.resolveClassByName`,
 * `resolveClass` and `getResolvedClass` (issue #659). Uses `CountingJavaInteropService`
 * (`test/counting-java-interop.ts`), not the project's default `JavaInteropTestService`, because
 * the default double overrides `resolveClassByName` itself and would never exercise the code under
 * test. Every test here runs against the real, inherited `resolveClassByName`/`resolveClass` and
 * never opens a socket. Each test uses a fresh service.
 */
import { describe, expect, test } from 'vitest';
import { canonicalJavaClassName } from '../src/language/java-interop.js';
import { rawMethod } from './counting-java-interop.js';
import { createCountingInteropServices } from './counting-java-interop.js';

/** A minimal nested-class body, reused across the dotted-first and binary-first cases. */
const emptyNestedClassBody = () => ({
    packageName: 'com.test',
    isDeprecated: false,
    fields: [],
    methods: [],
    constructors: [],
});

describe('a nested class is resolved once whatever its spelling (issue #659)', () => {
    test('dotted spelling first: the dotted spelling is sent once, and the binary spelling reuses the same object', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Outer.Inner', emptyNestedClassBody);
        interop.scripts.set('com.test.Outer$Inner', emptyNestedClassBody);

        const dotted = await interop.resolveClassByName('com.test.Outer.Inner');
        const binary = await interop.resolveClassByName('com.test.Outer$Inner');

        expect(interop.rawClassCalls).toEqual(['com.test.Outer.Inner']);
        expect(binary).toBe(dotted);
        expect(dotted.name).toBe('Outer.Inner');
        expect(dotted.packageName).toBe('com.test');
    });

    test('binary spelling first: the binary spelling is sent once, and the dotted spelling reuses the same object', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Outer.Inner', emptyNestedClassBody);
        interop.scripts.set('com.test.Outer$Inner', emptyNestedClassBody);

        const binary = await interop.resolveClassByName('com.test.Outer$Inner');
        const dotted = await interop.resolveClassByName('com.test.Outer.Inner');

        expect(interop.rawClassCalls).toEqual(['com.test.Outer$Inner']);
        expect(dotted).toBe(binary);
        expect(binary.name).toBe('Outer.Inner');
        expect(binary.packageName).toBe('com.test');
    });

    test('the mechanism behind issue #659: a Holder class whose methods, and the nested class\'s own constructor, name the nested class under both spellings resolve to one object', async () => {
        const { interop } = createCountingInteropServices();
        const nestedClassBody = () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [rawMethod('size', 'int')],
            // bbj-ls names a member type with getCanonicalName (dotted) but a constructor return
            // type with getName ($) — the pair that produces the duplicate on a normal cold start.
            constructors: [rawMethod('<init>', 'com.test.Outer$Inner')],
        });
        interop.scripts.set('com.test.Outer.Inner', nestedClassBody);
        interop.scripts.set('com.test.Outer$Inner', nestedClassBody);
        interop.scripts.set('com.test.Holder', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [
                rawMethod('dotted', 'com.test.Outer.Inner'),
                rawMethod('binary', 'com.test.Outer$Inner'),
            ],
            constructors: [],
        }));

        const holder = await interop.resolveClassByName('com.test.Holder');

        expect(interop.rawClassCalls).toEqual(['com.test.Holder', 'com.test.Outer.Inner']);

        const dottedMethod = holder.methods.find(m => m.name === 'dotted')!;
        const binaryMethod = holder.methods.find(m => m.name === 'binary')!;
        const nested = dottedMethod.resolvedReturnType?.ref;
        expect(nested).toBeDefined();
        expect(binaryMethod.resolvedReturnType?.ref).toBe(nested);

        const nestedClass = interop.getResolvedClass('com.test.Outer.Inner')!;
        const constructor = nestedClass.constructors[0];
        expect(constructor.resolvedReturnType?.ref).toBe(nested);
    });
});

describe('canonicalJavaClassName', () => {
    const CASES: Array<[string, string]> = [
        ['com.test.Outer$Inner', 'com.test.Outer.Inner'],
        ['com.test.A$B$C', 'com.test.A.B.C'],
        // Anonymous and local classes have no canonical name: a $ directly followed by a digit
        // anywhere in the name leaves the whole name unchanged.
        ['com.test.Foo$1', 'com.test.Foo$1'],
        ['com.test.Foo$1$Bar', 'com.test.Foo$1$Bar'],
        ['com.test.Foo$1Local', 'com.test.Foo$1Local'],
        // A $ starting a segment, a $$ run and a trailing $ are part of the name, not a separator.
        ['com.sun.proxy.$Proxy12', 'com.sun.proxy.$Proxy12'],
        ['com.test.Foo$$Lambda', 'com.test.Foo$$Lambda'],
        ['scala.Foo$', 'scala.Foo$'],
        ['java.lang.String', 'java.lang.String'],
        ['', ''],
        ['int', 'int'],
        ['com.test.Outer$Inner[]', 'com.test.Outer.Inner[]'],
    ];

    for (const [input, expected] of CASES) {
        test(`${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
            expect(canonicalJavaClassName(input)).toBe(expected);
        });
    }
});

describe('names that must stay distinct', () => {
    test('com.test.A$B$C then com.test.A.B.C: one request, spelled com.test.A$B$C, same object', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.A$B$C', emptyNestedClassBody);
        interop.scripts.set('com.test.A.B.C', emptyNestedClassBody);

        const first = await interop.resolveClassByName('com.test.A$B$C');
        const second = await interop.resolveClassByName('com.test.A.B.C');

        expect(interop.rawClassCalls).toEqual(['com.test.A$B$C']);
        expect(second).toBe(first);
    });

    test('com.test.Foo$1 (an anonymous class) and com.test.Foo are two distinct classes', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Foo$1', emptyNestedClassBody);
        interop.scripts.set('com.test.Foo', emptyNestedClassBody);

        const anonymous = await interop.resolveClassByName('com.test.Foo$1');
        const outer = await interop.resolveClassByName('com.test.Foo');

        expect(interop.rawClassCalls).toEqual(['com.test.Foo$1', 'com.test.Foo']);
        expect(anonymous).not.toBe(outer);
        expect(interop.getResolvedClass('com.test.Foo$1')).toBeDefined();
        expect(interop.getResolvedClass('com.test.Foo.1')).toBeUndefined();
    });

    test('com.sun.proxy.$Proxy12: one request with that exact spelling', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.sun.proxy.$Proxy12', () => ({
            packageName: 'com.sun.proxy',
            isDeprecated: false,
            fields: [],
            methods: [],
            constructors: [],
        }));

        await interop.resolveClassByName('com.sun.proxy.$Proxy12');

        expect(interop.rawClassCalls).toEqual(['com.sun.proxy.$Proxy12']);
    });
});

describe('every lookup path agrees', () => {
    test('concurrent Promise.all of the dotted and the $ spelling: one request, identical objects', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Outer.Inner', emptyNestedClassBody);
        interop.scripts.set('com.test.Outer$Inner', emptyNestedClassBody);

        const [dotted, binary] = await Promise.all([
            interop.resolveClassByName('com.test.Outer.Inner'),
            interop.resolveClassByName('com.test.Outer$Inner'),
        ]);

        expect(interop.rawClassCalls).toHaveLength(1);
        expect(binary).toBe(dotted);
    });

    test('getResolvedClass answers either spelling with the same object', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Outer.Inner', emptyNestedClassBody);

        const resolved = await interop.resolveClassByName('com.test.Outer.Inner');

        expect(interop.getResolvedClass('com.test.Outer$Inner')).toBe(resolved);
        expect(interop.getResolvedClass('com.test.Outer.Inner')).toBe(resolved);
    });

    test('com.test.Outer$Inner[] adds no request (still a local array type)', async () => {
        const { interop } = createCountingInteropServices();

        const result = await interop.resolveClassByName('com.test.Outer$Inner[]');

        expect(interop.rawClassCalls).toEqual([]);
        expect(result.name.endsWith('Inner[]')).toBe(true);
        expect(result.name).not.toContain('$');
    });
});
