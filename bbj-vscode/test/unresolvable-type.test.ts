import { EmptyFileSystem } from 'langium';
import { ParseHelperOptions, validationHelper } from 'langium/test';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { Program } from '../src/language/generated/ast.js';
import { setTypeResolutionWarnings } from '../src/language/bbj-validator.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * Issue #438: a QualifiedClass type reference that resolves to nothing must be flagged.
 * These tests use the test double (createBBjTestServices), whose fake java-interop preloads a
 * handful of classes, so `isClasspathAvailable()` is true and genuinely-invalid names warn —
 * while EmptyFileSystem-with-real-interop-down stays quiet.
 */
describe('Unresolvable type references (#438)', () => {
    const services = createBBjTestServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;
    const disposables: (() => Promise<void>)[] = [];

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        const validateInternal = validationHelper<Program>(services.BBj);
        validate = async (input: string, options?: ParseHelperOptions) => {
            const result = await validateInternal(input, options);
            disposables.push(result.dispose);
            return result;
        };
    });

    afterAll(async () => {
        for (const dispose of disposables) {
            await dispose();
        }
    });

    function unresolvableWarnings(diagnostics: { message: string }[], name: string) {
        return diagnostics.filter(d => d.message === `Type '${name}' cannot be resolved.`);
    }

    test('unresolvable return type warns', async () => {
        const { diagnostics } = await validate(`
            class public Foo
                method public SomeInvalidType testmethod()
                    methodret new SomeInvalidType()
                methodend
            classend
        `);
        expect(unresolvableWarnings(diagnostics, 'SomeInvalidType').length).toBeGreaterThanOrEqual(1);
    });

    test('unresolvable parameter type warns', async () => {
        const { diagnostics } = await validate(`
            class public Foo
                method public void testmethod(SomeInvalidType p!)
                methodend
            classend
        `);
        expect(unresolvableWarnings(diagnostics, 'SomeInvalidType').length).toBeGreaterThanOrEqual(1);
    });

    test('unresolvable field type warns', async () => {
        const { diagnostics } = await validate(`
            class public Foo
                field public SomeInvalidType f!
            classend
        `);
        expect(unresolvableWarnings(diagnostics, 'SomeInvalidType').length).toBeGreaterThanOrEqual(1);
    });

    test('unresolvable DECLARE variable type warns', async () => {
        const { diagnostics } = await validate(`
            declare SomeInvalidType x!
        `);
        expect(unresolvableWarnings(diagnostics, 'SomeInvalidType').length).toBeGreaterThanOrEqual(1);
    });

    test('unresolvable extends target warns', async () => {
        const { diagnostics } = await validate(`
            class public Foo extends SomeInvalidType
            classend
        `);
        expect(unresolvableWarnings(diagnostics, 'SomeInvalidType').length).toBeGreaterThanOrEqual(1);
    });

    test('resolvable BBj class in the same file does NOT warn', async () => {
        const { diagnostics } = await validate(`
            class public Bar
            classend

            class public Foo
                field public Bar b!
                method public Bar getBar()
                    methodret new Bar()
                methodend
            classend
        `);
        expect(diagnostics.filter(d => /cannot be resolved/.test(d.message))).toHaveLength(0);
    });

    test('resolvable Java fake (java.util.HashMap) does NOT warn', async () => {
        const { diagnostics } = await validate(`
            use java.util.HashMap

            class public Foo
                field public java.util.HashMap m!
            classend
        `);
        expect(diagnostics.filter(d => /cannot be resolved/.test(d.message))).toHaveLength(0);
    });

    test('built-in BBj scalar types (BBjString, BBjNumber) do NOT warn', async () => {
        const { diagnostics } = await validate(`
            class public Foo
                field public BBjString s$
                field public BBjNumber n%
                method public BBjString getS()
                    methodret ""
                methodend
            classend
        `);
        expect(diagnostics.filter(d => /cannot be resolved/.test(d.message))).toHaveLength(0);
    });

    test('with type-resolution warnings disabled there is NO warning', async () => {
        setTypeResolutionWarnings(false);
        try {
            const { diagnostics } = await validate(`
                class public Foo
                    method public SomeInvalidType testmethod()
                        methodret new SomeInvalidType()
                    methodend
                classend
            `);
            expect(diagnostics.filter(d => /cannot be resolved/.test(d.message))).toHaveLength(0);
        } finally {
            setTypeResolutionWarnings(true);
        }
    });
});
