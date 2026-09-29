/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `JavaResolutionCache` on its own, built with a stub classpath hook and no owning interop
 * service (#558): the LRU cap and recency, the package tree built by storeJavaClass/
 * addTopLevelPackage, the #676 leaf-collision guard, findClassCandidatesBySimpleName, canonical
 * ($-spelled) name lookup, reset(), and the class resolution routing added in this plan.
 */
import { Mutable } from 'langium';
import { beforeEach, describe, expect, test } from 'vitest';
import { Classpath, isJavaPackage, JavaClass, JavaPackage } from '../src/language/generated/ast.js';
import { ResolutionCacheHooks, JavaResolutionCache } from '../src/language/java-interop-cache.js';
import { ResolutionLock } from '../src/language/java-interop-lock.js';

/** A minimal, well-formed JavaClass with no fields/methods/constructors. */
function minimalJavaClass(name: string, packageName: string): Mutable<JavaClass> {
    return {
        $type: 'JavaClass',
        name,
        packageName,
        classes: [],
        fields: [],
        methods: [],
        constructors: [],
    } as unknown as Mutable<JavaClass>;
}

describe('JavaResolutionCache (#558)', () => {
    let classpath: Classpath;

    beforeEach(() => {
        classpath = { $type: 'Classpath', packages: [], classes: [] } as unknown as Classpath;
    });

    function createCache(limit = 5000): JavaResolutionCache {
        return new JavaResolutionCache(limit, new ResolutionLock(), { classpath: () => classpath } as ResolutionCacheHooks);
    }

    test('the LRU is bounded: registering a class past the limit evicts the least-recently-used entry, and a getResolvedClass read refreshes recency', () => {
        const cache = createCache(3);
        cache.registerResolvedClass('test.A', minimalJavaClass('test.A', 'test'));
        cache.registerResolvedClass('test.B', minimalJavaClass('test.B', 'test'));
        cache.registerResolvedClass('test.C', minimalJavaClass('test.C', 'test'));
        // Reading A refreshes its recency, so B (not A) becomes the least-recently-used entry.
        cache.getResolvedClass('test.A');
        cache.registerResolvedClass('test.D', minimalJavaClass('test.D', 'test'));

        expect(cache.getResolvedClass('test.B')).toBeUndefined();
        expect(cache.getResolvedClass('test.A')).toBeDefined();
        expect(cache.getResolvedClass('test.D')).toBeDefined();
    });

    test('storeJavaClass builds the package tree, getChildOf walks it, getChildrenOf lists a package\'s children, and isKnownJavaPackage answers from the tree alone', () => {
        const cache = createCache();
        const widget = minimalJavaClass('com.acme.Widget', 'com.acme');
        cache.storeJavaClass(widget, 'com.acme');

        const com = cache.getChildOf(classpath, 'com');
        expect(com).toBeDefined();
        expect(isJavaPackage(com)).toBe(true);
        const acme = cache.getChildOf(com as JavaPackage, 'acme');
        expect(acme).toBeDefined();
        expect(isJavaPackage(acme)).toBe(true);
        expect(cache.getChildOf(acme as JavaPackage, 'Widget')).toBe(widget);
        expect(cache.getChildrenOf(acme as JavaPackage)).toEqual([widget]);

        expect(cache.isKnownJavaPackage('com.acme')).toBe(true);
        expect(cache.isKnownJavaPackage('com.acme.Widget')).toBe(false);
    });

    test('a class whose leaf name matches an existing package stays outside the tree, with the classpath as its $container, and the package is left intact (#676)', () => {
        const cache = createCache();
        cache.addTopLevelPackage('a.b');
        const aPkgBefore = cache.getChildOf(classpath, 'a') as JavaPackage;
        const bPkgBefore = cache.getChildOf(aPkgBefore, 'b');
        expect(isJavaPackage(bPkgBefore)).toBe(true);

        const colliding = minimalJavaClass('a.b', 'a');
        cache.storeJavaClass(colliding, 'a');

        expect(colliding.$container).toBe(classpath);
        expect(colliding.$containerProperty).toBe('classes');
        const aPkgAfter = cache.getChildOf(classpath, 'a') as JavaPackage;
        const bPkgAfter = cache.getChildOf(aPkgAfter, 'b');
        expect(bPkgAfter).toBe(bPkgBefore);
        expect(isJavaPackage(bPkgAfter)).toBe(true);
    });

    test('addTopLevelPackage makes the package known, and a second call for the same name adds no second node', () => {
        const cache = createCache();
        cache.addTopLevelPackage('org.example');
        const first = cache.getChildOf(classpath, 'org');
        expect(cache.isKnownJavaPackage('org.example')).toBe(true);

        cache.addTopLevelPackage('org.example');
        const second = cache.getChildOf(classpath, 'org');

        expect(second).toBe(first);
        expect(cache.getChildrenOf()).toHaveLength(1);
    });

    test('findClassCandidatesBySimpleName finds a registered packaged class case-insensitively, and skips inner ($) and packageless names', () => {
        const cache = createCache();
        cache.registerResolvedClass('java.util.List', minimalJavaClass('java.util.List', 'java.util'));
        cache.registerResolvedClass('java.util.Map$Entry', minimalJavaClass('java.util.Map$Entry', 'java.util'));
        cache.registerResolvedClass('NoPackage', minimalJavaClass('NoPackage', ''));

        expect(cache.findClassCandidatesBySimpleName('list')).toEqual(['java.util.List']);
        expect(cache.findClassCandidatesBySimpleName('LIST')).toEqual(['java.util.List']);
        expect(cache.findClassCandidatesBySimpleName('Entry')).toEqual([]);
        expect(cache.findClassCandidatesBySimpleName('NoPackage')).toEqual([]);
    });

    test("getResolvedClass('Outer$Inner') finds a class registered under its canonical 'Outer.Inner' spelling", () => {
        const cache = createCache();
        const inner = minimalJavaClass('test.Outer.Inner', 'test.Outer');
        cache.registerResolvedClass('test.Outer.Inner', inner);

        expect(cache.getResolvedClass('test.Outer$Inner')).toBe(inner);
    });

    test('reset() empties both the resolved-class cache and the package tree', () => {
        const cache = createCache();
        cache.addTopLevelPackage('com');
        cache.registerResolvedClass('test.A', minimalJavaClass('test.A', 'test'));
        expect(cache.isClasspathAvailable()).toBe(true);

        cache.reset();

        expect(cache.isClasspathAvailable()).toBe(false);
        expect(cache.getChildOf(classpath, 'com')).toBeUndefined();
    });

    describe('class resolution routing (#558)', () => {
        /**
         * Builds a cache whose `resolveClass`/`resolveClassByName` hooks route straight back to
         * the cache's own same-named methods — mirroring how the front class's hooks route back
         * through itself — so the pipeline's internal recursive calls are exercised for real. The
         * `getRawClass` hook answers a fresh, member-less DTO for any requested name unless a
         * scripted answer is installed via `scripts`.
         */
        function createRoutedCache(limit = 5000): {
            cache: JavaResolutionCache;
            rawClassCalls: string[];
            resolveClassCalls: string[];
            scripts: Map<string, Mutable<JavaClass>>;
        } {
            const rawClassCalls: string[] = [];
            // The name requested of resolveClass, captured before resolveClass's own
            // storeJavaClass mutates javaClass.name down to its simple (unqualified) spelling.
            const resolveClassCalls: string[] = [];
            const scripts = new Map<string, Mutable<JavaClass>>();
            let cache!: JavaResolutionCache;
            const hooks: ResolutionCacheHooks = {
                classpath: () => classpath,
                ensureClasspathDocument: () => { /* no-op */ },
                getDocumentation: async () => undefined,
                getRawClass: async (className) => {
                    rawClassCalls.push(className);
                    return scripts.get(className) ?? ({
                        $type: 'JavaClass', name: className, packageName: 'test', fields: [], methods: [], constructors: []
                    } as unknown as Mutable<JavaClass>);
                },
                resolveClass: (javaClass, token, depth) => {
                    resolveClassCalls.push(javaClass.name);
                    return cache.resolveClass(javaClass, token, depth);
                },
                resolveClassByName: (className, token, depth) => cache.resolveClassByName(className, token, depth)
            };
            cache = new JavaResolutionCache(limit, new ResolutionLock(), hooks);
            return { cache, rawClassCalls, resolveClassCalls, scripts };
        }

        test('resolveClass hands every field/method/constructor member type to the resolveClassByName hook at depth 1, never calls getRawClass, and caches the resolved class', async () => {
            const resolveClassByNameCalls: Array<{ className: string; depth: number | undefined }> = [];
            const getRawClassCalls: string[] = [];
            let cache!: JavaResolutionCache;
            const hooks: ResolutionCacheHooks = {
                classpath: () => classpath,
                ensureClasspathDocument: () => { /* no-op */ },
                getDocumentation: async () => undefined,
                getRawClass: async (className) => {
                    getRawClassCalls.push(className);
                    return minimalJavaClass(className, '');
                },
                resolveClass: (javaClass, token, depth) => cache.resolveClass(javaClass, token, depth),
                resolveClassByName: async (className, _token, depth) => {
                    resolveClassByNameCalls.push({ className, depth });
                    return minimalJavaClass(className, '');
                }
            };
            cache = new JavaResolutionCache(5000, new ResolutionLock(), hooks);

            const dto: Mutable<JavaClass> = {
                $type: 'JavaClass',
                name: 'test.Widget',
                packageName: 'test',
                classes: [],
                constructors: [{ name: '<init>', returnType: 'test.Widget', parameters: [{ name: 'p0', type: 'test.CtorParam' }] }],
                fields: [{ name: 'field1', type: 'test.FieldType' }],
                methods: [{ name: 'doIt', returnType: 'test.ReturnType', parameters: [{ name: 'p0', type: 'test.MethodParam' }] }],
            } as unknown as Mutable<JavaClass>;

            const resolved = await cache.resolveClass(dto);

            expect(getRawClassCalls).toEqual([]);
            expect(resolveClassByNameCalls.map(c => c.className).sort()).toEqual(
                ['test.CtorParam', 'test.FieldType', 'test.MethodParam', 'test.ReturnType', 'test.Widget'].sort()
            );
            expect(resolveClassByNameCalls.every(c => c.depth === 1)).toBe(true);
            expect(cache.getResolvedClass('test.Widget')).toBe(resolved);
        });

        test('resolveClassByName for a new class calls the getRawClass hook once with the requested spelling, and passes its answer to the resolveClass hook', async () => {
            const { cache, rawClassCalls, resolveClassCalls } = createRoutedCache();

            const resolved = await cache.resolveClassByName('test.Outer$Inner');

            expect(rawClassCalls).toEqual(['test.Outer$Inner']);
            expect(resolveClassCalls).toHaveLength(1);
            expect(resolveClassCalls[0]).toBe('test.Outer$Inner');
            // storeJavaClass (run inside resolveClass) strips the 'test.' package prefix,
            // leaving javaClass.name as the simple (unqualified) spelling under the package node.
            expect(resolved.name).toBe('Outer.Inner');
            expect(cache.getResolvedClass('test.Outer.Inner')).toBe(resolved);
        });

        test('a second resolveClassByName lookup of the same class returns the cached object with no further getRawClass call', async () => {
            const { cache, rawClassCalls } = createRoutedCache();

            const first = await cache.resolveClassByName('test.Outer$Inner');
            const second = await cache.resolveClassByName('test.Outer$Inner');

            expect(second).toBe(first);
            expect(rawClassCalls).toEqual(['test.Outer$Inner']);
        });

        test("the 'Outer.Inner' dotted spelling of an already-resolved 'Outer$Inner' class returns the cached object with no further getRawClass call", async () => {
            const { cache, rawClassCalls } = createRoutedCache();

            const first = await cache.resolveClassByName('test.Outer$Inner');
            const dotted = await cache.resolveClassByName('test.Outer.Inner');

            expect(dotted).toBe(first);
            expect(rawClassCalls).toEqual(['test.Outer$Inner']);
        });

        test("resolveClassByName('int') goes to the resolveClass hook with a local primitive DTO and never calls getRawClass", async () => {
            const { cache, rawClassCalls, resolveClassCalls } = createRoutedCache();

            const resolved = await cache.resolveClassByName('int');

            expect(rawClassCalls).toEqual([]);
            expect(resolveClassCalls).toHaveLength(1);
            expect(resolveClassCalls[0]).toBe('int');
            expect(resolved.packageName).toBe('java.lang');
            expect(resolved.error).toBeUndefined();
        });

        test('two concurrent lookups of one new class name share a single getRawClass call', async () => {
            const { cache, rawClassCalls } = createRoutedCache();

            const first = cache.resolveClassByName('test.Concurrent');
            const second = cache.resolveClassByName('test.Concurrent');

            const [a, b] = await Promise.all([first, second]);

            expect(a).toBe(b);
            expect(rawClassCalls).toEqual(['test.Concurrent']);
        });
    });
});
