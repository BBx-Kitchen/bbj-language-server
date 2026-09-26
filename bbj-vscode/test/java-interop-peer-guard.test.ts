/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Unit and end-to-end tests for the bounds applied to Java class data from the interop peer
 * (issue #523). Uses `CountingJavaInteropService` (`test/counting-java-interop.ts`), not the
 * project's default `JavaInteropTestService`, because the default double overrides
 * `resolveClassByName` itself and never runs the real `resolveClass`/`storeJavaClass` pipeline
 * under test here.
 */
import { describe, expect, test } from 'vitest';
import { MAX_JAVA_IDENTIFIER_LENGTH } from '../src/language/java-peer-guard.js';
import {
    backendLikeDto,
    createCountingInteropServices,
    rawField,
    rawMethod,
    type RawField,
    type RawMethod,
} from './counting-java-interop.js';

const OVER_LIMIT_NAME = 'a'.repeat(MAX_JAVA_IDENTIFIER_LENGTH + 1);
const BOUNDARY_NAME = 'b'.repeat(MAX_JAVA_IDENTIFIER_LENGTH);

describe('member drops: an oversized or wrongly typed field/method/parameter never reaches the class node', () => {
    function wideClassBody() {
        const overLongNameField: RawField = { ...rawField('placeholder', 'int'), name: OVER_LIMIT_NAME };
        const numericNameField = { ...rawField('placeholder', 'int'), name: 42 } as unknown as RawField;
        const overLongReturnMethod: RawMethod = { ...rawMethod('overReturn', 'int'), returnType: OVER_LIMIT_NAME };
        const numericParamMethod = {
            ...rawMethod('keep', 'void', ['int']),
            parameters: [{ name: 'p0', type: 42 }],
        } as unknown as RawMethod;
        return {
            packageName: 'com.test',
            isDeprecated: false,
            fields: [rawField('ok', 'int'), overLongNameField, numericNameField],
            methods: [rawMethod('run', 'void'), overLongReturnMethod, numericParamMethod],
            constructors: [],
        };
    }

    test('resolveClassByName: field names are exactly [\'ok\'], method names are [\'run\', \'keep\'], and keep has no parameters left', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Wide', wideClassBody);

        const resolved = await interop.resolveClassByName('com.test.Wide');

        expect(resolved.fields.map(f => f.name)).toEqual(['ok']);
        expect(resolved.methods.map(m => m.name)).toEqual(['run', 'keep']);
        const keep = resolved.methods.find(m => m.name === 'keep')!;
        expect(keep.parameters).toEqual([]);
    });

    test('resolveRaw gives the same stored result for the same DTO', async () => {
        const { interop } = createCountingInteropServices();
        const dto = backendLikeDto('com.test.Wide', wideClassBody);

        const resolved = await interop.resolveRaw(dto);

        expect(resolved.fields.map(f => f.name)).toEqual(['ok']);
        expect(resolved.methods.map(m => m.name)).toEqual(['run', 'keep']);
        const keep = resolved.methods.find(m => m.name === 'keep')!;
        expect(keep.parameters).toEqual([]);
    });

    test('a field or method whose name is exactly the limit is kept (boundary)', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Boundary', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [rawField(BOUNDARY_NAME, 'int')],
            methods: [rawMethod(BOUNDARY_NAME, 'void')],
            constructors: [],
        }));

        const resolved = await interop.resolveClassByName('com.test.Boundary');

        expect(resolved.fields.map(f => f.name)).toEqual([BOUNDARY_NAME]);
        expect(resolved.methods.map(m => m.name)).toEqual([BOUNDARY_NAME]);
    });

    test('a class with nothing to drop keeps the identical fields and methods array objects it arrived with', async () => {
        const { interop } = createCountingInteropServices();
        const fields = [rawField('a', 'int')];
        const methods = [rawMethod('run', 'void')];
        interop.scripts.set('com.test.Clean', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields,
            methods,
            constructors: [],
        }));

        const resolved = await interop.resolveClassByName('com.test.Clean');

        expect(resolved.fields[0]).toBe(fields[0]);
        expect(resolved.methods[0]).toBe(methods[0]);
    });
});
