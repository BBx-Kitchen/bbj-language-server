/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `JavaResolutionCache` on its own, built with a stub classpath hook and no owning interop
 * service (#558): the LRU cap and recency, the package tree built by storeJavaClass/
 * addTopLevelPackage, the #676 leaf-collision guard, findClassCandidatesBySimpleName, canonical
 * ($-spelled) name lookup and reset().
 */
import { Mutable } from 'langium';
import { beforeEach, describe, expect, test } from 'vitest';
import { Classpath, isJavaPackage, JavaClass, JavaPackage } from '../src/language/generated/ast.js';
import { JavaResolutionCache } from '../src/language/java-interop-cache.js';

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
        return new JavaResolutionCache(limit, { classpath: () => classpath });
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
});
