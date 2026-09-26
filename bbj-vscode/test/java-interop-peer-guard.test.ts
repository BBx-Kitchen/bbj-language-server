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
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Classpath, type JavaClass } from '../src/language/generated/ast.js';
import { JavadocProvider } from '../src/language/java-javadoc.js';
import {
    MAX_JAVADOC_LENGTH, MAX_JAVA_IDENTIFIER_LENGTH, MAX_PEER_ERROR_LENGTH, TRUNCATION_MARKER,
    UNREADABLE_PEER_ERROR, truncateText
} from '../src/language/java-peer-guard.js';
import { logger } from '../src/language/logger.js';
import {
    backendLikeDto,
    createCountingInteropServices,
    rawField,
    rawMethod,
    type RawClassInfo,
    type RawField,
    type RawMethod,
} from './counting-java-interop.js';
import { createFakePeerServices } from './fake-interop-peer.js';

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

describe('an unusable class name never reaches canonicalJavaClassName or the package tree', () => {
    const BAD_NAMES: unknown[] = [42, '', OVER_LIMIT_NAME, null];

    for (const badName of BAD_NAMES) {
        test(`name ${JSON.stringify(badName)}: resolveRaw returns an uncached stub rooted at the classpath and throws nothing`, async () => {
            const { interop } = createCountingInteropServices();
            const dto = { name: badName, fields: [], methods: [], constructors: [] } as unknown as JavaClass;

            const resolved = await interop.resolveRaw(dto);

            expect(resolved.error).toBeDefined();
            expect(resolved.$container.$type).toBe(Classpath.$type);
            expect(interop.getResolvedClass(typeof badName === 'string' ? badName : String(badName))).toBeUndefined();
        });
    }
});

describe('non-array class-level members default to [] instead of throwing', () => {
    test('fields/methods/constructors/classes present but not arrays become []', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Malformed', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: 'nope',
            methods: {},
            constructors: 5,
            classes: 'x',
        } as unknown as Omit<RawClassInfo, 'name'>));

        const resolved = await interop.resolveClassByName('com.test.Malformed');

        expect(resolved.fields).toEqual([]);
        expect(resolved.methods).toEqual([]);
        expect(resolved.constructors).toEqual([]);
        expect(resolved.classes).toEqual([]);
    });

    test('a method whose parameters is not an array ends with parameters []', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.BadParams', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [{ ...rawMethod('run', 'void'), parameters: 'x' } as unknown as RawMethod],
            constructors: [],
        }));

        const resolved = await interop.resolveClassByName('com.test.BadParams');

        const run = resolved.methods.find(m => m.name === 'run')!;
        expect(run.parameters).toEqual([]);
    });
});

describe('non-boolean isDeprecated/isStatic flags default to false', () => {
    test('a non-boolean class isDeprecated reads as deprecated false; field isStatic 1 reads false, isStatic true is kept', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Flags', () => ({
            packageName: 'com.test',
            isDeprecated: 'yes',
            fields: [
                { ...rawField('bad', 'int'), isStatic: 1 } as unknown as RawField,
                { ...rawField('good', 'int'), isStatic: true },
            ],
            methods: [],
            constructors: [],
        } as unknown as Omit<RawClassInfo, 'name'>));

        const resolved = await interop.resolveClassByName('com.test.Flags');

        expect(resolved.deprecated).toBe(false);
        const bad = resolved.fields.find(f => f.name === 'bad')!;
        const good = resolved.fields.find(f => f.name === 'good')!;
        expect(bad.isStatic).toBe(false);
        expect(good.isStatic).toBe(true);
    });
});

describe('the class-level error field is truncated or replaced, never rejected', () => {
    test('an oversized error string is truncated with the marker', async () => {
        const { interop } = createCountingInteropServices();
        const dto = {
            name: 'com.test.LongError', fields: [], methods: [], constructors: [], error: 'e'.repeat(5000),
        } as unknown as JavaClass;

        const resolved = await interop.resolveRaw(dto);

        expect(resolved.error!.length).toBeLessThanOrEqual(MAX_PEER_ERROR_LENGTH);
        expect(resolved.error!.endsWith(TRUNCATION_MARKER)).toBe(true);
    });

    test('a non-string error is replaced by the fixed unreadable-error text, so the class still counts as unresolved', async () => {
        const { interop } = createCountingInteropServices();
        const dto = {
            name: 'com.test.BadError', fields: [], methods: [], constructors: [], error: 17,
        } as unknown as JavaClass;

        const resolved = await interop.resolveRaw(dto);

        expect(resolved.error).toBe(UNREADABLE_PEER_ERROR);
    });
});

describe('packageName and simpleName are removed when unusable, letting resolveClass derive its own', () => {
    test('a non-string packageName is ignored; the derived package name is used instead', async () => {
        const { interop } = createCountingInteropServices();
        const dto = {
            name: 'com.test.Odd', packageName: 7, fields: [], methods: [], constructors: [],
        } as unknown as JavaClass;

        const resolved = await interop.resolveRaw(dto);

        expect(resolved.packageName).toBe('com.test');
    });

    test('an oversized simpleName is removed from the DTO', async () => {
        const { interop } = createCountingInteropServices();
        const dto = {
            name: 'com.test.Odd2', simpleName: OVER_LIMIT_NAME, fields: [], methods: [], constructors: [],
        } as unknown as JavaClass;

        const resolved = await interop.resolveRaw(dto);

        expect((resolved as unknown as { simpleName?: string }).simpleName).toBeUndefined();
    });

    test('an empty-string packageName (the unnamed/default package) is kept, not removed', async () => {
        const { interop } = createCountingInteropServices();
        const dto = {
            name: 'TopLevel', packageName: '', fields: [], methods: [], constructors: [],
        } as unknown as JavaClass;
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { /* silence */ });

        const resolved = await interop.resolveRaw(dto);

        expect(resolved.packageName).toBe('');
        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});

describe('sanitation adjustments log exactly one warn line per class, naming only field paths', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('a class with several problems produces one warn line naming the class and each field path, never 100 consecutive characters of a rejected value', async () => {
        const { interop } = createCountingInteropServices();
        const hugeValue = 'x'.repeat(5000);
        interop.scripts.set('com.test.Several', () => ({
            packageName: 'com.test',
            isDeprecated: 'yes',
            fields: [{ ...rawField('placeholder', 'int'), name: OVER_LIMIT_NAME }],
            methods: [],
            constructors: [],
            error: hugeValue,
        } as unknown as Omit<RawClassInfo, 'name'>));
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { /* silence */ });

        await interop.resolveClassByName('com.test.Several');

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const line = warnSpy.mock.calls[0].join(' ');
        expect(line).toContain('com.test.Several');
        expect(line).toContain('fields[0] dropped');
        expect(line).not.toContain(hugeValue.slice(0, 100));
    });
});

describe('truncateText', () => {
    test('empty text and text exactly at the limit come back unchanged', () => {
        expect(truncateText('', 10)).toBe('');
        expect(truncateText('a'.repeat(10), 10)).toBe('a'.repeat(10));
    });

    test('text one character over the limit is truncated to the limit, ending in the marker', () => {
        const result = truncateText('a'.repeat(11), 10);
        expect(result.length).toBe(10);
        expect(result.endsWith(TRUNCATION_MARKER)).toBe(true);
    });

    test('a surrogate pair straddling the cut is not split', () => {
        const surrogatePair = '😀'; // an emoji, two UTF-16 code units
        const text = 'a'.repeat(8) + surrogatePair + 'a'.repeat(2); // 12 code units total
        const limit = 10;

        const result = truncateText(text, limit);

        expect(result.length).toBeLessThanOrEqual(limit);
        expect(result.endsWith(TRUNCATION_MARKER)).toBe(true);
        // The character right before the marker must never be a lone high surrogate.
        const beforeMarker = result.charCodeAt(result.length - 1 - TRUNCATION_MARKER.length);
        expect(beforeMarker >= 0xD800 && beforeMarker <= 0xDBFF).toBe(false);
    });

    test('the javadoc limit is exported and matches the measured real maximum with wide margin', () => {
        expect(MAX_JAVADOC_LENGTH).toBe(32768);
    });
});

describe('loadImplicitImports survives junk entries in a getClassInfos answer (bulk path)', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('a mix of a valid class and junk entries resolves true, keeps the valid class resolvable, and adds the same class count as a clean run', async () => {
        const messy = createFakePeerServices();
        messy.interop.connectDelayMs = 0;
        messy.interop.peerUp = true;
        vi.useFakeTimers();
        messy.interop.packageClasses.set('java.lang', () => ([
            messy.interop.classInfo('java.lang.Alpha'),
            { name: 42 } as unknown as JavaClass,
            { name: OVER_LIMIT_NAME } as unknown as JavaClass,
            null as unknown as JavaClass,
            'junk' as unknown as JavaClass,
        ]));

        const messyResult = await messy.interop.loadImplicitImports();

        expect(messyResult).toBe(true);
        expect(messy.interop.getResolvedClass('Alpha')).toBeDefined();
        vi.useRealTimers();

        const clean = createFakePeerServices();
        clean.interop.connectDelayMs = 0;
        clean.interop.peerUp = true;
        vi.useFakeTimers();
        clean.interop.packageClasses.set('java.lang', () => ([clean.interop.classInfo('java.lang.Alpha')]));

        await clean.interop.loadImplicitImports();
        vi.useRealTimers();

        expect(messy.interop.classpathClassCount()).toBe(clean.interop.classpathClassCount());
    });

    test('a getClassInfos answer that is not an array is treated as empty; loadImplicitImports still resolves true', async () => {
        const { interop } = createFakePeerServices();
        interop.connectDelayMs = 0;
        interop.peerUp = true;
        vi.useFakeTimers();
        interop.packageClasses.set('java.lang', () => (null as unknown as JavaClass[]));

        const result = await interop.loadImplicitImports();

        expect(result).toBe(true);
    });
});

describe('javadoc text and parameter real names copied in Phase 2 are bounded', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('an oversized docu and an oversized javadoc parameter name are both truncated with the marker; the signature is built from the bounded real name', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Documented', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [rawMethod('run', 'void', ['int'])],
            constructors: [],
        }));
        const oversizedDocu = '/**' + 'a'.repeat(40000) + '*/';
        const oversizedParamName = 'p'.repeat(1100);
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({
            name: 'Documented',
            fields: [],
            methods: [{ name: 'run', docu: oversizedDocu, params: [{ name: oversizedParamName }] }],
        });

        const resolved = await interop.resolveClassByName('com.test.Documented');

        const run = resolved.methods.find(m => m.name === 'run')!;
        expect(run.docu?.javadoc.length).toBeLessThanOrEqual(MAX_JAVADOC_LENGTH);
        expect(run.docu?.javadoc.endsWith(TRUNCATION_MARKER)).toBe(true);
        expect(run.parameters[0].realName.length).toBeLessThanOrEqual(MAX_JAVA_IDENTIFIER_LENGTH);
        expect(run.parameters[0].realName.endsWith(TRUNCATION_MARKER)).toBe(true);
        expect(run.docu?.signature?.length ?? 0).toBeLessThan(3000);
    });

    test('a short docu is stored exactly as its JSDoc-to-Markdown conversion, with no marker', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.ShortDoc', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [rawMethod('addOne', 'void', ['int'])],
            constructors: [],
        }));
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({
            name: 'ShortDoc',
            fields: [],
            methods: [{ name: 'addOne', docu: '/** Adds one. */', params: [{ name: 'p0' }] }],
        });

        const resolved = await interop.resolveClassByName('com.test.ShortDoc');

        const addOne = resolved.methods.find(m => m.name === 'addOne')!;
        expect(addOne.docu?.javadoc).not.toContain(TRUNCATION_MARKER);
        expect(addOne.docu?.javadoc).toContain('Adds one.');
    });

    test('a methodDoc whose docu is not a string and whose param name is not a string leaves docu and realName unset; the class still resolves with its methods', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.OddDoc', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [rawMethod('go', 'void', ['int'])],
            constructors: [],
        }));
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({
            name: 'OddDoc',
            fields: [],
            methods: [{ name: 'go', docu: 42 as unknown as string, params: [{ name: 7 as unknown as string }] }],
        });

        const resolved = await interop.resolveClassByName('com.test.OddDoc');

        const go = resolved.methods.find(m => m.name === 'go')!;
        expect(go.docu).toBeUndefined();
        expect(go.parameters[0].realName).toBeUndefined();
    });

    test('the stored javadoc still contains the Markdown characters it arrived with (no escaping at storage)', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.MarkdownDoc', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [],
            methods: [rawMethod('render', 'void', ['int'])],
            constructors: [],
        }));
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({
            name: 'MarkdownDoc',
            fields: [],
            methods: [{ name: 'render', docu: '/** [click](https://evil.example) */', params: [{ name: 'p0' }] }],
        });

        const resolved = await interop.resolveClassByName('com.test.MarkdownDoc');

        const render = resolved.methods.find(m => m.name === 'render')!;
        expect(render.docu?.javadoc).toContain('[click](https://evil.example)');
    });

    test('a class with a dropped field and a truncated javadoc produces exactly one logger.warn line naming both field paths', async () => {
        const { interop } = createCountingInteropServices();
        interop.scripts.set('com.test.Combined', () => ({
            packageName: 'com.test',
            isDeprecated: false,
            fields: [{ ...rawField('placeholder', 'int'), name: OVER_LIMIT_NAME }],
            methods: [rawMethod('run', 'void', ['int'])],
            constructors: [],
        } as unknown as Omit<RawClassInfo, 'name'>));
        vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue({
            name: 'Combined',
            fields: [],
            methods: [{ name: 'run', docu: '/**' + 'a'.repeat(40000) + '*/', params: [{ name: 'p0' }] }],
        });
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { /* silence */ });

        await interop.resolveClassByName('com.test.Combined');

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const line = warnSpy.mock.calls[0].join(' ');
        expect(line).toContain('fields[0] dropped');
        expect(line).toContain('methods[0].docu truncated');
    });
});
