/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The bounded cache of resolved Java classes and the Java package tree built from them. Split out
 * of the Java interop service (#558).
 */
import { Mutable } from 'langium';
import { Classpath, isJavaPackage, JavaClass, JavaPackage } from './generated/ast.js';
import { assertType } from './utils.js';
import { logger } from './logger.js';

/**
 * Canonicalizes a nested Java class name to the Java source spelling (`Outer.Inner`), the single
 * identity this module and the resolution pipeline use: the key of {@link JavaResolutionCache.resolvedClasses},
 * the in-flight registry and the pending-resolution map, and the display name shown in hover,
 * completion detail and messages. The backend echoes back whichever spelling was requested — a
 * member type's own name via `getCanonicalName` (dotted) but a constructor's return type via
 * `getName` (`$`) — so without this normalization the two spellings are fetched and cached as two
 * distinct classes (issue #659).
 *
 * Anonymous and local classes (`Foo$1`, `Foo$1$Bar`, `Foo$1Local`) have no canonical name and are
 * left entirely unchanged: a `$` directly followed by a digit anywhere in the name means the whole
 * name is returned as is. Otherwise, a `$` that directly follows a letter, digit or underscore and
 * directly precedes a letter or underscore is a nested-class separator and becomes `.`; a `$`
 * starting a segment (`$Proxy12`), a `$$` run, and a trailing `$` are part of the name, not a
 * separator, and are left untouched.
 */
export function canonicalJavaClassName(name: string): string {
    if (/\$[0-9]/.test(name)) {
        return name;
    }
    // Capture the preceding character instead of a lookbehind, so the "follows a letter, digit or
    // underscore" check works the same on every supported JS engine.
    return name.replace(/([A-Za-z0-9_])\$(?=[A-Za-z_])/g, '$1.');
}

/**
 * A `Map` bounded to a maximum size, evicting the least-recently-used entry once the cap is
 * exceeded (P61-D3-001). Recency is refreshed on both `get` and `set` by deleting and
 * re-inserting the key, relying on `Map`'s insertion-order iteration to find the oldest entry.
 */
class LruMap<K, V> {
    private readonly map = new Map<K, V>();

    constructor(private readonly limit: number) { }

    get size(): number {
        return this.map.size;
    }

    has(key: K): boolean {
        return this.map.has(key);
    }

    get(key: K): V | undefined {
        const value = this.map.get(key);
        if (value !== undefined) {
            // Refresh recency: delete + re-insert moves the key to the end of iteration order.
            this.map.delete(key);
            this.map.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        this.map.delete(key);
        this.map.set(key, value);
        if (this.map.size > this.limit) {
            const oldestKey = this.map.keys().next().value;
            if (oldestKey !== undefined) {
                this.map.delete(oldestKey);
            }
        }
    }

    values(): IterableIterator<V> {
        return this.map.values();
    }

    clear(): void {
        this.map.clear();
    }
}

/** Structural dependencies {@link JavaResolutionCache} needs from the front class. */
export interface ResolutionCacheHooks {
    classpath(): Classpath;
}

/**
 * Holds the resolved-class cache and the Java package tree built from it: the bounded LRU, the
 * in-flight Phase 2 registry, the pending-resolution map, the `java.lang.Object` shortcut and the
 * children-of tree, plus the tree/cache lookup and mutation methods.
 *
 * `resolvedClasses`, `inFlightPhase2` and `pendingResolutions` are public in this plan only, so the
 * resolution pipeline — still on the front class until a later plan moves it — can read and mutate
 * them directly through three private front getters; a later plan makes them private.
 *
 * Split out of `JavaInteropService` (#558).
 */
export class JavaResolutionCache {

    /**
     * The bounded cache of resolved Java classes, evicting the least-recently-used entry once the
     * front's overridable cache limit is exceeded (P61-D3-001).
     */
    readonly resolvedClasses: LruMap<string, JavaClass>;

    /**
     * Classes registered in {@link resolvedClasses} whose async member-type resolution (Phase 2 of
     * the front's `resolveClass`) is still running (#497). Consulted by every fast path that would
     * otherwise miss a class evicted from the LRU during its own cyclic resolution; cleared by the
     * front's `resolveClass` identity-guarded `finally` and by {@link reset}.
     */
    readonly inFlightPhase2: Map<string, JavaClass> = new Map();

    /**
     * In-flight resolution promises keyed by class name, preventing duplicate concurrent
     * resolution of the same class.
     */
    readonly pendingResolutions: Map<string, Promise<JavaClass>> = new Map();

    private readonly childrenOfByName = new Map<JavaClass | JavaPackage | Classpath, Map<string, JavaClass | JavaPackage>>();

    private javaLangObjectCache: JavaClass | undefined = undefined;

    constructor(cacheLimit: number, private readonly hooks: ResolutionCacheHooks) {
        this.resolvedClasses = new LruMap<string, JavaClass>(cacheLimit);
    }

    /**
     * Retrieves a previously resolved Java class by its fully qualified name.
     * @param className fully qualified class name (e.g., "java.lang.String")
     * @returns the resolved JavaClass or undefined if not found
     */
    public getResolvedClass(className: string): JavaClass | undefined {
        if (className === 'java.lang.Object') {
            // called very often, so cache it
            return this.javaLangObject()
        }
        return this.resolvedClasses.get(canonicalJavaClassName(className));
    }

    private javaLangObject(): JavaClass | undefined {
        if (!this.javaLangObjectCache) {
            this.javaLangObjectCache = this.resolvedClasses.get('java.lang.Object');
        }
        return this.javaLangObjectCache;
    }

    /**
     * True once the java-interop classpath has actually been populated with at least one resolved
     * class (via `loadImplicitImports`/`loadClasspath`, or preloaded in the test double). Used to
     * gate "type cannot be resolved" diagnostics: when no class is available the interop service is
     * effectively down (e.g. CI without a running service, or EmptyFileSystem without a reachable
     * :5008), so an unresolved reference means "interop unavailable", not "invalid type".
     */
    public isClasspathAvailable(): boolean {
        return this.resolvedClasses.size > 0;
    }

    /** Every currently resolved Java class, for a full scan (e.g. a prefix search with no complete index). */
    public values(): IterableIterator<JavaClass> {
        return this.resolvedClasses.values();
    }

    /** Test seam: number of classes whose Phase 2 (async member-type resolution) is currently in flight. */
    public inFlightCount(): number {
        return this.inFlightPhase2.size;
    }

    /** Registers `javaClass` under `name` in the LRU (a plain set), refreshing its recency. */
    public registerResolvedClass(name: string, javaClass: JavaClass): void {
        this.resolvedClasses.set(name, javaClass);
    }

    /**
     * Returns fully-qualified names of already-resolved Java classes whose simple name matches
     * `simpleName` (case-insensitive), used to suggest missing `use` statements (issue #447).
     * Only classes present in the index are considered; `resolveClassCandidatesBySimpleName`
     * additionally probes common packages. Inner classes and classes without a package (nothing to
     * `use`) are skipped. Results are de-duplicated and sorted.
     */
    public findClassCandidatesBySimpleName(simpleName: string): string[] {
        const target = simpleName.toLowerCase();
        const matches = new Set<string>();
        for (const javaClass of this.resolvedClasses.values()) {
            if (javaClass.error || !javaClass.packageName) {
                continue;
            }
            const simple = javaClass.name.substring(javaClass.name.lastIndexOf('.') + 1);
            if (simple.includes('$') || simple.toLowerCase() !== target) {
                continue;
            }
            matches.add(`${javaClass.packageName}.${simple}`);
        }
        return [...matches].sort();
    }

    /**
     * Retrieves all child packages and classes of a given package-like container.
     * @param javaPackageLike the parent container (JavaClass, JavaPackage, or undefined for classpath root)
     * @returns array of child JavaClass and JavaPackage elements
     */
    public getChildrenOf(javaPackageLike?: JavaClass | JavaPackage) {
        const children = this.childrenOfByName.get(javaPackageLike ?? this.hooks.classpath());
        if (!children) {
            return [];
        }
        return [...children.values()];
    }

    /**
     * Retrieves a specific child package or class by name from a parent container.
     * @param javaPackageLike the parent container
     * @param childName the name of the child to retrieve
     * @returns the matching JavaClass or JavaPackage, or undefined if not found
     */
    public getChildOf(javaPackageLike: JavaClass | JavaPackage | Classpath, childName: string): JavaClass | JavaPackage | undefined {
        return this.childrenOfByName.get(javaPackageLike)?.get(childName);
    }

    /**
     * Answers whether `qualifiedName` already names a Java package registered in the in-memory
     * package tree — reads the tree only, never sends a request to the peer. A name registered as
     * a package must never be resolved as a class (issue #676): `extractPackageName` would derive
     * the wrong package for it, and `storeJavaClass` would then collide the class with the package
     * of the same name. A `$`-spelled name is canonicalized first. Every dot segment must exist
     * and the last one must be a {@link JavaPackage}; a class of the same name is not a package.
     */
    public isKnownJavaPackage(qualifiedName: string): boolean {
        const canonical = canonicalJavaClassName(qualifiedName);
        if (!canonical) {
            return false;
        }
        let parent: Classpath | JavaPackage | JavaClass = this.hooks.classpath();
        for (const part of canonical.split('.')) {
            const child = this.getChildOf(parent, part);
            if (!child) {
                return false;
            }
            parent = child;
        }
        return isJavaPackage(parent);
    }

    /**
     * Stores a Java class in the AST hierarchy, creating intermediate packages as needed.
     * This method builds the complete package structure and links the class to its parent container.
     * @param javaClass the Java class to store in the hierarchy
     * @param packageName the fully qualified package name (e.g., "java.lang")
     */
    public storeJavaClass(javaClass: Mutable<JavaClass>, packageName: string): void {

        // Defensive check for javaClass.name
        if (!javaClass.name || typeof javaClass.name !== 'string') {
            console.error('Invalid javaClass.name:', javaClass.name);
            return;
        }
        javaClass.$type = JavaClass.$type;

        const simpleName = (packageName.length > 0) ? javaClass.name.replace(packageName + '.', '') : javaClass.name;
        if (javaClass.packageName !== packageName) {
            logger.warn(`Package name mismatch for class ${javaClass.name}: expected '${javaClass.packageName}', got '${packageName}'`);
        }

        const classpath = this.hooks.classpath();
        let parent: Classpath | JavaPackage | JavaClass = classpath;

        const parts = packageName.split('.').concat(simpleName);

        parts.forEach((part, index) => {
            if (!this.childrenOfByName.has(parent)) {
                this.childrenOfByName.set(parent, new Map());
            }
            const children = this.childrenOfByName.get(parent)!;
            if (!children.has(part)) {
                if (index === parts.length - 1) {
                    javaClass.$container = parent;
                    javaClass.$containerProperty = 'classes';
                    // Ensure parent.classes exists
                    if (!parent.classes) {
                        parent.classes = [];
                    }
                    javaClass.$containerIndex = parent.classes.length;
                    javaClass.name = part;
                    parent.classes.push(javaClass);
                    children.set(part, javaClass);
                } else {
                    assertType<JavaPackage>(parent);
                    // Ensure parent.packages exists
                    if (!parent.packages) {
                        parent.packages = [];
                    }
                    const javaPackage: JavaPackage = {
                        $container: parent,
                        $type: JavaPackage.$type,
                        classes: [],
                        packages: [],
                        name: part,
                        $containerIndex: parent.packages.length,
                        $containerProperty: 'packages',
                    };
                    parent.packages.push(javaPackage);
                    children.set(part, javaPackage);
                }
            } else if (index === parts.length - 1) {
                // Defence in depth for issue #676: the leaf name already names a registered
                // child. When that child is a JavaPackage, a class must never overwrite it or
                // be pushed into it — the package and its own classes stay reachable exactly as
                // they were. The class is kept outside the package tree instead, on the same
                // classpath fallback shape createStubClass uses. An existing JavaClass at the
                // leaf is left unchanged, so resolveClass's "has no container" console.error
                // still reports any other genuinely unexpected missing container.
                const existingChild = children.get(part)!;
                if (isJavaPackage(existingChild)) {
                    javaClass.$container = classpath;
                    javaClass.$containerProperty = 'classes';
                    javaClass.$containerIndex = classpath.classes.length;
                    logger.debug(`Java class ${javaClass.name} matches an existing package '${part}' and is kept outside the package tree.`);
                    return;
                }
            }
            parent = children.get(part)!;
        });
    }

    /**
     * Adds one top-level package name to the package tree ({@link childrenOfByName}), creating
     * intermediate {@link JavaPackage} nodes as needed. Called by the classpath loader once per
     * package name returned by `getTopLevelPackages`.
     * @param packageName the dotted top-level package name (e.g. "java.util")
     */
    public addTopLevelPackage(packageName: string): void {
        const parts = packageName.split('.');
        let parent: Classpath | JavaPackage = this.hooks.classpath();
        parts.forEach((part) => {
            if (!this.childrenOfByName.has(parent)) {
                this.childrenOfByName.set(parent, new Map());
            }
            const children = this.childrenOfByName.get(parent)!;
            if (!children.get(part)) {
                // Ensure parent.packages exists
                if (!parent.packages) {
                    parent.packages = [];
                }
                const javaPackage: JavaPackage = {
                    $container: parent,
                    $type: JavaPackage.$type,
                    classes: [],
                    packages: [],
                    name: part,
                    $containerIndex: parent.packages.length,
                    $containerProperty: 'packages',
                };
                parent.packages.push(javaPackage);
                children.set(part, javaPackage);
            }
            parent = children.get(part) as JavaPackage;
        })
    }

    /**
     * Clears the resolved-class cache, the pending-resolution map, the in-flight Phase 2 registry,
     * the package tree and the `java.lang.Object` cache, in that order (#558). Called by the
     * front's `clearCache()` as its first step.
     */
    public reset(): void {
        // Clear resolved classes cache
        this.resolvedClasses.clear();

        // Clear in-flight resolution promises
        this.pendingResolutions.clear();

        // Clear the in-flight Phase-2 registry (#497) so a class from a cleared classpath is
        // never put back into the LRU by a Phase 2 that settles after this reset.
        this.inFlightPhase2.clear();

        // Clear children-of-by-name map
        this.childrenOfByName.clear();

        // Clear java.lang.Object cache
        this.javaLangObjectCache = undefined;
    }
}
