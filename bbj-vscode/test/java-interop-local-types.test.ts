/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Unit tests for `JavaInteropService.resolveClassByName`'s local primitive/void/array/blank
 * short-circuit (issue #660). Uses `CountingJavaInteropService` (`test/counting-java-interop.ts`),
 * not the project's default `JavaInteropTestService`, because the default double overrides
 * `resolveClassByName` itself and would never exercise the code under test. Every test here runs
 * against the real, inherited `resolveClassByName`/`resolveClass` and never opens a socket.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { JavaClass } from '../src/language/generated/ast.js';
import { logger, LogLevel } from '../src/language/logger.js';
import { backendLikeDto, createCountingInteropServices, rawField, rawMethod } from './counting-java-interop.js';

describe('primitive, void and array type names never reach the backend (issue #660)', () => {
    test('a class with an int member resolves with one backend request, end to end', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Types', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [rawMethod('count', 'int')],
            constructors: [],
        }));

        const resolved = await interop.resolveClassByName('com.test.Types');

        expect(interop.rawClassCalls).toEqual(['com.test.Types']);

        const method = resolved.methods.find(m => m.name === 'count')!;
        const returnType = method.resolvedReturnType?.ref;
        expect(returnType).toBeDefined();
        expect(returnType!.name).toBe('int');
        expect(returnType!.packageName).toBe('java.lang');
        expect(returnType!.error).toBeUndefined();
        expect(returnType!.fields).toHaveLength(0);
        expect(returnType!.methods).toHaveLength(0);
        expect(returnType!.constructors).toHaveLength(0);
        expect(interop.getResolvedClass('int')).toBe(returnType);
    });
});

describe('the local result is what the backend answered before', () => {
    const LOCAL_NAMES = [
        'boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void',
        'byte[]', 'java.lang.Object[]', 'int[][]', '', '  '
    ];

    for (const name of LOCAL_NAMES) {
        test(`${JSON.stringify(name)} resolves with no backend request`, async () => {
            const { interop } = createCountingInteropServices();
            await interop.resolveClassByName(name);
            expect(interop.rawClassCalls).toEqual([]);
        });

        test(`${JSON.stringify(name)} matches the modelled round trip field for field`, async () => {
            const local = createCountingInteropServices();
            const backend = createCountingInteropServices();

            const localResult = await local.interop.resolveClassByName(name);
            const backendResult = await backend.interop.resolveRaw(backendLikeDto(name));

            const project = (c: JavaClass) => ({
                name: c.name,
                packageName: c.packageName,
                error: c.error,
                deprecated: c.deprecated,
                fieldsLength: c.fields.length,
                methodsLength: c.methods.length,
                constructorsLength: c.constructors.length,
                classesLength: c.classes.length,
                containerType: c.$container.$type,
            });
            expect(project(localResult)).toEqual(project(backendResult));
        });
    }

    test('byte[] keeps the not-found error and is not replaced by the byte class', async () => {
        const { interop } = createCountingInteropServices();
        const result = await interop.resolveClassByName('byte[]');
        expect(result.error).toBe('Class not found: byte[]');
        expect(result.name).not.toBe('byte');
    });

    test('multi-dimensional member types (one-level backend erasure) stay local', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Masks', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [rawField('flags', 'long')],
            // A byte[][] parameter and an Object[][] return type arrive here already erased one
            // dimension by the backend's own getProperTypeName, per issue #660.
            methods: [rawMethod('apply', 'java.lang.Object[]', ['byte[]'])],
            constructors: [],
        }));

        await interop.resolveClassByName('com.test.Masks');

        expect(interop.rawClassCalls).toEqual(['com.test.Masks']);
    });

    test('two concurrent lookups of the same primitive or array name share one object and issue zero backend requests', async () => {
        const { interop } = createCountingInteropServices();

        const [int1, int2, arr1, arr2] = await Promise.all([
            interop.resolveClassByName('int'),
            interop.resolveClassByName('int'),
            interop.resolveClassByName('byte[]'),
            interop.resolveClassByName('byte[]'),
        ]);

        expect(int1).toBe(int2);
        expect(arr1).toBe(arr2);
        expect(interop.rawClassCalls).toEqual([]);
    });
});

describe('real class names still reach the backend', () => {
    const REAL_NAMES = ['java.lang.Integer', 'java.lang.Byte', 'com.bytes.Foo', 'Voider', 'Integer'];

    for (const name of REAL_NAMES) {
        test(`${name} adds exactly one entry, spelled as requested`, async () => {
            const { interop } = createCountingInteropServices();
            await interop.resolveClassByName(name);
            expect(interop.rawClassCalls).toEqual([name]);
        });
    }
});

describe('logging on a cold start', () => {
    afterEach(() => {
        logger.setLevel(LogLevel.WARN);
        vi.restoreAllMocks();
    });

    test('the debug log shows the real class but no local member type', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Masks', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [rawField('flags', 'long')],
            methods: [rawMethod('apply', 'java.lang.Object[]', ['byte[]'])],
            constructors: [],
        }));

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { /* silence */ });
        logger.setLevel(LogLevel.DEBUG);

        await interop.resolveClassByName('com.test.Masks');

        const lines = logSpy.mock.calls.map(call => call.join(' '));
        expect(lines.some(line => line.includes('Resolving class com.test.Masks'))).toBe(true);
        expect(lines.some(line => line.includes('Resolving class byte[]'))).toBe(false);
        expect(lines.some(line => line.includes('Resolving class java.lang.Object[]'))).toBe(false);
        expect(lines.some(line => line.includes('Resolving class long'))).toBe(false);
    });
});
