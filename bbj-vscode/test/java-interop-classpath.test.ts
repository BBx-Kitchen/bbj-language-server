/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `ClasspathLoader` on its own, built with stub hooks and no owning interop service (#558):
 * `loadClasspath`'s entry mapping and failure fallback, and `loadImplicitImports`'s simple-name
 * copies, java.sql handling, bulk-path junk-entry tolerance, top-level packages and reset().
 */
import { MessageConnection, RequestType } from 'vscode-jsonrpc/node.js';
import { beforeEach, describe, expect, test } from 'vitest';
import { Classpath, JavaClass } from '../src/language/generated/ast.js';
import { ClasspathLoader } from '../src/language/java-interop-classpath.js';

interface PackageInfoParams {
    packageName: string
}

interface TopLevelPackageInfo {
    packageName: string
}

describe('ClasspathLoader (#558)', () => {
    let connectShouldFail: boolean;
    let loadClasspathRequests: Array<{ classPathEntries: string[] }>;
    let loadClasspathResult: boolean;
    /** Scripted `getClassInfos` answer per package name; a missing entry answers `[]`. */
    let packageClasses: Map<string, JavaClass[] | 'not-an-array'>;
    /** Scripted `getTopLevelPackages` answer, or a rejection when `topLevelPackagesFail` is set. */
    let topLevelPackages: TopLevelPackageInfo[];
    let topLevelPackagesFail: boolean;
    let resolvedClasses: JavaClass[];
    let registered: Map<string, JavaClass>;
    let ensureClasspathDocumentCalls: number;
    let addedTopLevelPackages: string[];
    let classpath: Classpath;

    beforeEach(() => {
        connectShouldFail = false;
        loadClasspathRequests = [];
        loadClasspathResult = true;
        packageClasses = new Map();
        topLevelPackages = [];
        topLevelPackagesFail = false;
        resolvedClasses = [];
        registered = new Map();
        ensureClasspathDocumentCalls = 0;
        addedTopLevelPackages = [];
        classpath = { $type: 'Classpath', packages: [], classes: [] } as unknown as Classpath;
    });

    function fakeConnection(): MessageConnection {
        return {
            sendRequest: (type: RequestType<unknown, unknown, null>, params: unknown) => {
                if (type.method === 'loadClasspath') {
                    loadClasspathRequests.push(params as { classPathEntries: string[] });
                    return Promise.resolve(loadClasspathResult);
                }
                if (type.method === 'getClassInfos') {
                    const packageName = (params as PackageInfoParams).packageName;
                    const answer = packageClasses.get(packageName) ?? [];
                    return Promise.resolve(answer);
                }
                if (type.method === 'getTopLevelPackages') {
                    if (topLevelPackagesFail) {
                        return Promise.reject(new Error('getTopLevelPackages not supported'));
                    }
                    return Promise.resolve(topLevelPackages);
                }
                return Promise.reject(new Error(`unexpected request ${type.method}`));
            }
        } as unknown as MessageConnection;
    }

    function createLoader(): ClasspathLoader {
        return new ClasspathLoader({
            connect: () => connectShouldFail
                ? Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:5008'))
                : Promise.resolve(fakeConnection()),
            resolveClass: (javaClass) => {
                resolvedClasses.push(javaClass);
                return Promise.resolve(javaClass);
            },
            registerResolvedClass: (name, javaClass) => { registered.set(name, javaClass); },
            classpath: () => classpath,
            ensureClasspathDocument: () => { ensureClasspathDocumentCalls++; },
            addTopLevelPackage: (packageName) => { addedTopLevelPackages.push(packageName); }
        });
    }

    test('loadClasspath drops empty entries, keeps bracketed entries as-is, prefixes the rest with file:, and sends one request', async () => {
        const loader = createLoader();

        const result = await loader.loadClasspath(['', '[custom-classpath-entry]', 'some/dir', '']);

        expect(result).toBe(true);
        expect(loadClasspathRequests).toHaveLength(1);
        expect(loadClasspathRequests[0].classPathEntries).toEqual(['[custom-classpath-entry]', 'file:some/dir']);
    });

    test('loadClasspath returns false when connect rejects', async () => {
        connectShouldFail = true;
        const loader = createLoader();

        const result = await loader.loadClasspath(['some/dir']);

        expect(result).toBe(false);
        expect(loadClasspathRequests).toHaveLength(0);
    });

    test('loadImplicitImports resolves each class of an implicit package, pushes one simple-name copy and registers it', async () => {
        packageClasses.set('java.lang', [
            { $type: 'JavaClass', name: 'java.lang.Alpha', packageName: 'java.lang', fields: [], methods: [] } as unknown as JavaClass
        ]);
        const loader = createLoader();

        const result = await loader.loadImplicitImports();

        expect(result).toBe(true);
        expect(resolvedClasses.map(c => c.name)).toContain('java.lang.Alpha');
        expect(classpath.classes).toHaveLength(1);
        expect(classpath.classes[0].name).toBe('Alpha');
        expect(registered.get('Alpha')?.name).toBe('Alpha');
        expect(ensureClasspathDocumentCalls).toBe(1);
    });

    test('loadImplicitImports does not push a simple-name copy for java.sql classes', async () => {
        packageClasses.set('java.sql', [
            { $type: 'JavaClass', name: 'java.sql.Connection', packageName: 'java.sql', fields: [], methods: [] } as unknown as JavaClass
        ]);
        const loader = createLoader();

        const result = await loader.loadImplicitImports();

        expect(result).toBe(true);
        expect(resolvedClasses.map(c => c.name)).toContain('java.sql.Connection');
        expect(classpath.classes).toHaveLength(0);
        expect(registered.has('Connection')).toBe(false);
    });

    test('a getClassInfos answer that is not an array is treated as empty', async () => {
        packageClasses.set('java.lang', 'not-an-array');
        const loader = createLoader();

        const result = await loader.loadImplicitImports();

        expect(result).toBe(true);
        expect(classpath.classes).toHaveLength(0);
    });

    test('a non-object entry in a getClassInfos answer is skipped without calling resolveClass', async () => {
        packageClasses.set('java.lang', [
            null as unknown as JavaClass,
            42 as unknown as JavaClass,
            'junk' as unknown as JavaClass
        ]);
        const loader = createLoader();

        const result = await loader.loadImplicitImports();

        expect(result).toBe(true);
        expect(resolvedClasses).toHaveLength(0);
        expect(classpath.classes).toHaveLength(0);
    });

    test('loadImplicitImports hands each top-level package name to addTopLevelPackage', async () => {
        topLevelPackages = [{ packageName: 'java.util' }, { packageName: 'java.time' }];
        const loader = createLoader();

        const result = await loader.loadImplicitImports();

        expect(result).toBe(true);
        expect(addedTopLevelPackages).toEqual(['java.util', 'java.time']);
    });

    test('loadImplicitImports still returns true when getTopLevelPackages rejects', async () => {
        topLevelPackagesFail = true;
        const loader = createLoader();

        const result = await loader.loadImplicitImports();

        expect(result).toBe(true);
        expect(addedTopLevelPackages).toHaveLength(0);
    });

    test('a second loadImplicitImports run reuses the existing simple-name copy instead of pushing a duplicate', async () => {
        packageClasses.set('java.lang', [
            { $type: 'JavaClass', name: 'java.lang.Alpha', packageName: 'java.lang', fields: [], methods: [] } as unknown as JavaClass
        ]);
        const loader = createLoader();

        await loader.loadImplicitImports();
        expect(classpath.classes).toHaveLength(1);

        await loader.loadImplicitImports();

        expect(classpath.classes).toHaveLength(1);
        expect(registered.get('Alpha')).toBe(classpath.classes[0]);
    });

    test('after reset() a run pushes a fresh copy instead of reusing the pre-reset one', async () => {
        packageClasses.set('java.lang', [
            { $type: 'JavaClass', name: 'java.lang.Alpha', packageName: 'java.lang', fields: [], methods: [] } as unknown as JavaClass
        ]);
        const loader = createLoader();

        await loader.loadImplicitImports();
        expect(classpath.classes).toHaveLength(1);
        const firstCopy = classpath.classes[0];

        loader.reset();
        await loader.loadImplicitImports();

        expect(classpath.classes).toHaveLength(2);
        expect(classpath.classes[1]).not.toBe(firstCopy);
    });
});
