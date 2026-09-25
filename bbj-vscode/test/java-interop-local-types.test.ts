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
import { describe, expect, test } from 'vitest';
import { createCountingInteropServices, rawMethod } from './counting-java-interop.js';

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
