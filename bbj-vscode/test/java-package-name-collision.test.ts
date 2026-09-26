/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Reproduces and pins issue #676: a bare package name in a `USE` line, or in a qualified type
 * reference, must never be sent into Java class resolution. Before the fix, scope computation
 * forwarded the raw package text to `resolveClassByName`; the peer answered "not found", and
 * `storeJavaClass` then tried to store a same-named class beside the already-registered package,
 * leaving the class with no container and logging "Java class java.io has no container,
 * packageName: java". Uses `CountingJavaInteropService` (`test/counting-java-interop.ts`), not
 * the project's default `JavaInteropTestService`, so the real `resolveClass`/`storeJavaClass`
 * pipeline runs.
 */
import { DocumentValidator, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Model } from '../src/language/generated/ast.js';
import { createCountingInteropServices } from './counting-java-interop.js';

/** A minimal package-member body, reused for `java.io.File` and `java.net.URL`. */
const packageMemberBody = (packageName: string) => () => ({
    packageName,
    isDeprecated: false,
    fields: [],
    methods: [],
    constructors: [],
});

/** Linking-error diagnostics whose message mentions the given member name. */
function linkingDiagnosticsFor(document: LangiumDocument, memberName: string) {
    return (document.diagnostics ?? []).filter(
        d => d.data?.code === DocumentValidator.LinkingError && d.message.includes(memberName)
    );
}

describe('a bare package name is never sent into class resolution (issue #676)', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;

    afterEach(() => {
        consoleErrorSpy?.mockRestore();
        consoleErrorSpy = undefined;
    });

    test('use java.io / use java.net / use java.io.File: no "has no container" error, no request for the bare package, and File still resolves', async () => {
        const { interop, BBj } = createCountingInteropServices();
        interop.scripts.set('java.io.File', packageMemberBody('java.io'));
        interop.scripts.set('java.net.URL', packageMemberBody('java.net'));
        await interop.resolveClassByName('java.io.File');
        await interop.resolveClassByName('java.net.URL');
        interop.rawClassCalls.length = 0;

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const parse = parseHelper<Model>(BBj);
        const document = await parse(
            'use java.io\nuse java.net\nuse java.io.File\ndeclare File f!\n',
            { validation: true }
        );

        const hasNoContainerCalls = consoleErrorSpy.mock.calls.filter(call =>
            call.some(arg => typeof arg === 'string' && arg.includes('has no container'))
        );
        expect(hasNoContainerCalls).toEqual([]);
        expect(interop.rawClassCalls).not.toContain('java.io');
        expect(interop.rawClassCalls).not.toContain('java.net');
        expect(interop.rawClassCalls).not.toContain('java$io');
        expect(interop.rawClassCalls).not.toContain('java$net');
        expect(linkingDiagnosticsFor(document, 'File')).toEqual([]);
    });

    describe('isKnownJavaPackage answers from the in-memory package tree only', () => {
        test('true for a registered package, false for a class, an unregistered name and the empty string; a $ spelling is canonicalized', async () => {
            const { interop } = createCountingInteropServices();
            interop.scripts.set('java.io.File', packageMemberBody('java.io'));
            interop.scripts.set('java.net.URL', packageMemberBody('java.net'));
            await interop.resolveClassByName('java.io.File');
            await interop.resolveClassByName('java.net.URL');

            expect(interop.isKnownJavaPackage('java.io')).toBe(true);
            expect(interop.isKnownJavaPackage('java.io.File')).toBe(false);
            expect(interop.isKnownJavaPackage('java')).toBe(true);
            expect(interop.isKnownJavaPackage('')).toBe(false);
            expect(interop.isKnownJavaPackage('java.nope')).toBe(false);
            expect(interop.isKnownJavaPackage('java$io')).toBe(true);
        });
    });
});
