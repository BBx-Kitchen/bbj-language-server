/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The bounded cache of resolved Java classes and the Java package tree built from them, and the
 * class resolution pipeline (resolveClassByName/resolveClass) that populates both. Split out of
 * the Java interop service (#558).
 */
import { AstUtils, isJSDoc, Mutable, parseJSDoc } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc/node.js';
import {
    Classpath, DocumentationInfo, Documented, isJavaPackage, JavaClass, JavaField, JavaMethod,
    JavaMethodParameter, JavaPackage, NamedElement
} from './generated/ast.js';
import { InteropTransportError, isInteropTransportFailure } from './java-interop-connection.js';
import type { ResolutionLock } from './java-interop-lock.js';
import { isClassDoc, MethodDoc, NamedDoc } from './java-javadoc.js';
import { isUsableJavaClassName, MAX_JAVADOC_LENGTH, MAX_JAVA_IDENTIFIER_LENGTH, sanitizeJavaClassDto, truncateText } from './java-peer-guard.js';
import { logger } from './logger.js';
import { assertType } from './utils.js';

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
 * exceeded (see {@link LruMap}). Recency is refreshed on both `get` and `set` by deleting and
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

/** The eight Java primitive type names plus `void` — never classes on the backend's classpath. */
export const JAVA_PRIMITIVE_TYPE_NAMES: ReadonlySet<string> = new Set([
    'boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void'
]);

/**
 * True for a type name that is never a class on the java-interop backend's classpath: one of the
 * eight Java primitives or `void` (whole-name match only — `java.lang.Integer`, a package segment
 * `bytes`, or a class named `Voider` are real class names and are not matched here), a name ending
 * in `[]` (an array type, at any dimension), or a name that is empty once trimmed. A primitive or
 * `void` keeps the backend's own answer (package `java.lang`, no members, no error); an array or
 * blank name keeps its not-found answer. Both are built locally instead of sent as a class lookup
 * (issue #660).
 */
export function isLocalJavaTypeName(name: string): boolean {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        return true;
    }
    return JAVA_PRIMITIVE_TYPE_NAMES.has(trimmed) || trimmed.endsWith('[]');
}

/**
 * Builds the raw, backend-shaped DTO for a name {@link isLocalJavaTypeName} recognizes, so it can
 * be fed straight into {@link JavaResolutionCache.resolveClass}'s existing pipeline instead of
 * {@link JavaResolutionCache.createStubClass}'s failed-resolution shape (which carries an `error`
 * today's real primitive/void/array round trip never sets). A primitive or `void` gets the
 * backend's own answer (packageName `java.lang`, no error, no members); an array or blank name
 * gets its not-found answer (empty members, the same "Class not found" text `getRawClass` would
 * have produced) with no `packageName`, so `resolveClass` derives one exactly as it does for
 * today's real answer.
 */
function localJavaTypeDto(name: string): Mutable<JavaClass> {
    const trimmed = name.trim();
    if (JAVA_PRIMITIVE_TYPE_NAMES.has(trimmed)) {
        return {
            $type: JavaClass.$type,
            name,
            simpleName: name,
            packageName: 'java.lang',
            isDeprecated: false,
            fields: [],
            methods: [],
            classes: [],
            constructors: [],
        } as unknown as Mutable<JavaClass>;
    }
    return {
        $type: JavaClass.$type,
        name,
        fields: [],
        methods: [],
        classes: [],
        constructors: [],
        error: `Class not found: ${name}`,
    } as unknown as Mutable<JavaClass>;
}

/** Structural dependencies {@link JavaResolutionCache} needs from the front class. */
export interface ResolutionCacheHooks {
    classpath(): Classpath;
    ensureClasspathDocument(): void;
    getDocumentation(node: Documented & NamedElement): Promise<NamedDoc | undefined>;
    getRawClass(className: string, token?: CancellationToken): Promise<JavaClass>;
    resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, depth?: number): Promise<JavaClass>;
    resolveClassByName(className: string, token?: CancellationToken, depth?: number): Promise<JavaClass>;
}

/**
 * Holds the resolved-class cache and the Java package tree built from it, and the class
 * resolution pipeline (`resolveClassByName`/`doResolveClassByName`/`createStubClass`/`resolveClass`)
 * that reads and writes them: the bounded LRU, the in-flight Phase 2 registry, the
 * pending-resolution map, the `java.lang.Object` shortcut and the children-of tree, plus the
 * tree/cache lookup and mutation methods.
 *
 * Every call the pipeline makes to `getRawClass`, `resolveClass` or `resolveClassByName` goes
 * through {@link ResolutionCacheHooks} back to the front class's own (possibly
 * subclass-overridden) method — never a same-module call — so a hermetic test double's override
 * of any of the three still takes effect (#558).
 *
 * Split out of `JavaInteropService` (#558).
 */
export class JavaResolutionCache {

    /** Maximum recursion depth for Java class resolution to prevent runaway resolution chains. */
    private static readonly MAX_RESOLUTION_DEPTH = 50;
    /** Maximum time (ms) allowed for a single resolveClassByName call chain before aborting. */
    private static readonly RESOLUTION_TIMEOUT_MS = 30_000;

    /**
     * The bounded cache of resolved Java classes, evicting the least-recently-used entry once the
     * front's overridable cache limit is exceeded (see {@link LruMap}).
     */
    private readonly resolvedClasses: LruMap<string, JavaClass>;

    /**
     * Classes registered in {@link resolvedClasses} whose async member-type resolution (Phase 2 of
     * {@link resolveClass}) is still running (#497). Consulted by every fast path that would
     * otherwise miss a class evicted from the LRU during its own cyclic resolution; cleared by
     * {@link resolveClass}'s identity-guarded `finally` and by {@link reset}.
     */
    private readonly inFlightPhase2: Map<string, JavaClass> = new Map();

    /**
     * In-flight resolution promises keyed by class name, preventing duplicate concurrent
     * resolution of the same class.
     */
    private readonly pendingResolutions: Map<string, Promise<JavaClass>> = new Map();

    private readonly childrenOfByName = new Map<JavaClass | JavaPackage | Classpath, Map<string, JavaClass | JavaPackage>>();

    private javaLangObjectCache: JavaClass | undefined = undefined;

    constructor(cacheLimit: number, private readonly lock: Pick<ResolutionLock, 'acquire' | 'currentToken'>, private readonly hooks: ResolutionCacheHooks) {
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
     * Resolves a Java class by its fully qualified name, fetching from the Java backend if not already cached.
     * This method acquires a lock to prevent concurrent resolution of the same class.
     * A primitive, `void`, array or blank name is resolved locally instead, with no backend request (issue #660).
     * @param className fully qualified class name (e.g., "java.lang.String")
     * @param token cancellation token for request cancellation
     * @returns the resolved JavaClass with all dependencies linked
     */
    async resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        // The canonical spelling is the single key used by resolvedClasses, the in-flight
        // registry and the pending-resolution map: a nested class resolved once as `Outer.Inner`
        // and again as `Outer$Inner` is one class, one request, one object (issue #659).
        const key = canonicalJavaClassName(className);
        // A primitive, void, array or blank name is never a class on the backend's classpath
        // (issue #660): build the same zero-member result locally, with no round trip, and feed
        // it through the real resolveClass pipeline below — its own cache and in-flight checks
        // then make every later or concurrent lookup of the same name return the identical object.
        if (isLocalJavaTypeName(key)) {
            return this.hooks.resolveClass(localJavaTypeDto(key), token, _depth);
        }
        // Fast path: already fully resolved. Checked *before* the depth limit because a
        // cached class triggers no further recursion — the depth limit is irrelevant to it,
        // and returning it here avoids re-stubbing already-resolved leaf types (int, void,
        // java.lang.Object, ...) that are reached deep inside a legitimate type graph.
        if (this.resolvedClasses.has(key)) {
            return this.resolvedClasses.get(key)!;
        }

        // A class the LRU evicted mid-Phase-2 of its own cyclic resolution (#497): return the
        // same in-flight object instead of falling through to a redundant, timing-out refetch.
        const inFlightClass = this.inFlightPhase2.get(key);
        if (inFlightClass) {
            return inFlightClass;
        }

        // Safeguard 3: deduplicate — if another caller is already resolving this class, wait for it.
        // Also checked before the depth limit: the in-flight resolution owns the recursion budget.
        const pending = this.pendingResolutions.get(key);
        if (pending) {
            return pending;
        }

        // Safeguard 2: depth limit to prevent runaway recursive resolution chains. Only applies
        // to genuinely new classes we are about to fetch and resolve — cycles among already-seen
        // classes are broken by the resolvedClasses cache above (resolveClass registers a class
        // before recursing into its member types).
        if (_depth > JavaResolutionCache.MAX_RESOLUTION_DEPTH) {
            logger.warn(`Java class resolution depth limit (${JavaResolutionCache.MAX_RESOLUTION_DEPTH}) exceeded for '${key}', returning partial class`);
            // Do NOT cache this stub: a later, shallower resolution of the same class must still be
            // able to resolve it fully. Caching here would permanently freeze the class as a
            // member-less stub for every subsequent reference (via the fast path above).
            return this.createStubClass(key, false);
        }

        // The backend is asked with the spelling that arrived (className), not the canonical key:
        // a `$` spelling is the binary name Class.forName accepts directly, and a dotted spelling
        // goes out exactly as today, resolved by the backend's own nested-class fallback — no
        // backend version check either way.
        const resolutionPromise = this.doResolveClassByName(key, className, token, _depth);
        this.pendingResolutions.set(key, resolutionPromise);
        try {
            return await resolutionPromise;
        } finally {
            this.pendingResolutions.delete(key);
        }
    }

    /**
     * `key` is the canonical spelling — used for every cache/in-flight check, log line and stub —
     * while `requestName` is the exact spelling that arrived at {@link resolveClassByName} and is
     * sent to the backend unchanged (issue #659, no backend version check either way).
     */
    private async doResolveClassByName(key: string, requestName: string, token: CancellationToken | undefined, depth: number): Promise<JavaClass> {
        // Safeguard 4: timeout to prevent indefinitely stuck resolution chains
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new InteropTransportError(`Java class resolution chain timed out after ${JavaResolutionCache.RESOLUTION_TIMEOUT_MS}ms for '${key}'`)), JavaResolutionCache.RESOLUTION_TIMEOUT_MS)
        );

        // Create a lock token scoped to this top-level resolution chain.
        // Re-entrant calls from resolveClass (field/method type resolution) share the same token.
        const lockToken = depth === 0 ? {} : (this.lock.currentToken ?? {});
        const release = await this.lock.acquire(lockToken);
        try {
            // Double-check after acquiring lock
            if (this.resolvedClasses.has(key)) {
                return this.resolvedClasses.get(key)!;
            }
            const inFlightClass = this.inFlightPhase2.get(key);
            if (inFlightClass) {
                return inFlightClass;
            }
            const javaClass: Mutable<JavaClass> = await Promise.race([
                this.hooks.getRawClass(requestName, token),
                timeoutPromise
            ]);
            return await Promise.race([
                this.hooks.resolveClass(javaClass, token, depth),
                timeoutPromise
            ]);
        } catch (e) {
            logger.warn(`Failed to resolve Java class '${key}': ${e}`);
            // A cancellation is a routine, frequent event (e.g. every keystroke cancels an
            // in-flight completion/hover request) and carries no information about whether the
            // class actually exists. Treat it the same as a transport failure so the stub is never
            // cached, letting a later, uncancelled lookup resolve the class normally.
            const cancelled = token?.isCancellationRequested === true;
            return this.createStubClass(key, !(cancelled || isInteropTransportFailure(e)));
        } finally {
            release();
        }
    }

    /**
     * Creates a minimal stub JavaClass for cases where resolution fails or is aborted.
     * This prevents callers from receiving undefined and allows partial results.
     * @param cache when true (default), the stub is stored in resolvedClasses so subsequent lookups
     *   reuse it — appropriate for genuine resolution failures. Pass false for transient stubs (e.g.
     *   the depth-limit backstop), so a later shallower resolution can still populate the real class.
     */
    private createStubClass(className: string, cache: boolean = true): JavaClass {
        const existing = this.resolvedClasses.get(className);
        if (existing) return existing;

        const stub: Mutable<JavaClass> = {
            $type: JavaClass.$type,
            $container: this.hooks.classpath(),
            $containerProperty: 'classes',
            $containerIndex: this.hooks.classpath().classes.length,
            name: className,
            packageName: extractPackageName(className),
            fields: [],
            methods: [],
            classes: [],
            constructors: [],
            deprecated: false,
            error: `Resolution failed or depth limit exceeded`,
        } as unknown as Mutable<JavaClass>;
        if (cache) {
            this.resolvedClasses.set(className, stub);
        }
        return stub;
    }

    /**
     * Resolves and links a Java class with its dependencies including fields, methods, parameters, and documentation.
     * This method processes the raw class data, resolves type references, links Javadoc, and stores the class in the AST hierarchy.
     * The "Resolving class ..." debug line is skipped for a primitive, `void`, array or blank name (issue #660).
     * @param javaClass the Java class to resolve and link
     * @param token cancellation token for request cancellation
     * @returns the resolved and linked JavaClass
     */
    async resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        // A class entry whose name is not a string, is empty or is over the identifier limit is
        // rejected before canonicalJavaClassName (which throws on a non-string) or the package
        // tree ever sees it (issue #523): it is treated as unresolved via the existing uncached
        // stub path, and no field of the entry is ever copied onto a node.
        const rawEntry = javaClass as unknown;
        if (typeof rawEntry !== 'object' || rawEntry === null || !isUsableJavaClassName(javaClass.name)) {
            const rawName: unknown = (rawEntry !== null && typeof rawEntry === 'object')
                ? (rawEntry as { name?: unknown }).name
                : undefined;
            const message = `The Java interop peer returned a class entry whose name is not a string, is empty or is longer than ${MAX_JAVA_IDENTIFIER_LENGTH} characters; it is treated as unresolved.`;
            if (rawName === '') {
                // The local blank-type path (localJavaTypeDto('')) produces an empty name
                // routinely; this is not itself an indication of a broken or hostile peer.
                logger.debug(message);
            } else {
                logger.warn(message);
            }
            return this.createStubClass('', false);
        }
        // The backend echoes back whichever spelling was requested; canonicalize it here too so
        // the bulk implicit-import path (which calls resolveClass directly, not through
        // resolveClassByName) also caches and displays the class under its canonical spelling.
        javaClass.name = canonicalJavaClassName(javaClass.name);
        const className = javaClass.name
        if (this.resolvedClasses.has(className)) {
            return this.resolvedClasses.get(className)!;
        }
        const inFlightClass = this.inFlightPhase2.get(className);
        if (inFlightClass) {
            return inFlightClass;
        }

        this.hooks.ensureClasspathDocument();

        // Bound and type-check the peer-supplied class description before any of its fields are
        // copied onto the node (issue #523): no field is stored before this call runs. Logged
        // together with any Phase 2 (javadoc/real-name) adjustment notes, once, after Phase 2
        // below completes.
        const sanitationNotes = sanitizeJavaClassDto(javaClass);
        const phase2Notes: string[] = [];

        javaClass.$type = JavaClass.$type; // make isJavaClass work
        const packageName = extractPackageName(className);
        if (!isLocalJavaTypeName(className)) {
            logger.debug(() => `Resolving class ${className}: ${javaClass.methods?.length ?? 0} methods, ${javaClass.fields?.length ?? 0} fields`);
        }

        if (!javaClass.packageName) {
            // can happen if the class was not found by Java backend
            javaClass.packageName = packageName;
        }
        javaClass.classes ??= [];
        javaClass.constructors ??= [];
        // Map Java DTO naming (isDeprecated) to Langium type naming (deprecated) for the class itself
        javaClass.deprecated = (javaClass as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;

        this.storeJavaClass(javaClass, javaClass.packageName);
        if (javaClass.$container === undefined) {
            console.error(`Java class ${className} has no container, packageName: ${javaClass.packageName}`);
            javaClass.$container = this.hooks.classpath(); // fallback to classpath
        }

        // Phase 1 (synchronous): set $type, isStatic, and deprecated on all members from the
        // raw Java DTO data before any async awaits. This is the data that the static-method
        // filter in bbj-scope.ts depends on, and it must be present before getResolvedClass()
        // can return this class to external callers.
        // A malformed/older classpath response may omit fields/methods entirely (P61-D2-003) —
        // default them like classes/constructors above so the loops below don't throw.
        javaClass.fields ??= [];
        javaClass.methods ??= [];
        for (const field of javaClass.fields) {
            (field as Mutable<JavaField>).$type = JavaField.$type;
            field.deprecated = (field as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
            field.isStatic = (field as unknown as { isStatic?: boolean }).isStatic ?? false;
        }
        for (const method of javaClass.methods) {
            (method as Mutable<JavaMethod>).$type = JavaMethod.$type;
            method.deprecated = (method as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
            method.isStatic = (method as unknown as { isStatic?: boolean }).isStatic ?? false;
            // An entry may omit its parameter list entirely, so default it the way the member
            // lists above are defaulted, because Phase 2 iterates it.
            method.parameters ??= [];
        }
        for (const constructor of javaClass.constructors) {
            (constructor as Mutable<JavaMethod>).$type = JavaMethod.$type;
            constructor.isStatic = false;
            constructor.deprecated = (constructor as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
            constructor.parameters ??= [];
        }

        // Register in resolvedClasses now that isStatic and deprecated are fully populated.
        // This must happen before the async type-resolution loop below, which calls
        // resolveClassByName() recursively — the fast-path check in resolveClassByName
        // and the re-entry guard in resolveClass both depend on this entry existing.
        this.resolvedClasses.set(className, javaClass);
        // Beside the LRU: lets every fast path find this exact object while Phase 2 below is
        // still running, even if the LRU evicts the resolvedClasses entry in the meantime (#497).
        this.inFlightPhase2.set(className, javaClass);

        try {
            try {
                // Phase 2 (async): resolve type references and populate documentation.
                const documentation = await this.hooks.getDocumentation(javaClass);
                for (const field of javaClass.fields) {
                    field.resolvedType = {
                        ref: await this.hooks.resolveClassByName(field.type, token, _depth + 1),
                        $refText: field.type
                    };
                }
                // Overloads share a name, so a method's javadoc entry is found among the
                // entries with its name and arity (see selectMethodDoc, #478/#481).
                for (const [methodIndex, method] of javaClass.methods.entries()) {
                    const methodDocs = isClassDoc(documentation) ? documentation.methods.filter(
                        m => m.name == method.name
                            && m.params.length === method.parameters.length
                    ) : [];
                    const methodDoc = selectMethodDoc(methodDocs, method);
                    method.resolvedReturnType = {
                        ref: await this.hooks.resolveClassByName(method.returnType, token, _depth + 1),
                        $refText: method.returnType
                    };
                    for (const [index, parameter] of method.parameters.entries()) {
                        (parameter as Mutable<JavaMethodParameter>).$type = JavaMethodParameter.$type;
                        parameter.resolvedType = {
                            ref: await this.hooks.resolveClassByName(parameter.type, token, _depth + 1),
                            $refText: parameter.type
                        };
                        // Bound where Phase 2 copies it (issue #523): a non-string javadoc
                        // parameter name leaves realName unset rather than storing junk.
                        const rawRealName = methodDoc?.params[index]?.name;
                        if (typeof rawRealName === 'string') {
                            const boundedRealName = truncateText(rawRealName, MAX_JAVA_IDENTIFIER_LENGTH);
                            parameter.realName = boundedRealName;
                            if (boundedRealName.length < rawRealName.length) {
                                phase2Notes.push(`methods[${methodIndex}].parameters[${index}].realName truncated`);
                            }
                        }
                    }
                    if (methodDoc?.docu) {
                        const doc = methodDoc;
                        if (typeof doc.docu === 'string' && doc.docu.length > 0) {
                            // Build signature: "ReturnType ClassName.methodName(Type paramName, ...)"
                            // using the already-bounded realName so a caller reading only the
                            // signature never sees an unbounded javadoc parameter name.
                            const params = method.parameters.map(p => {
                                const realName = p.realName ?? p.name;
                                return `${javaTypeAdjust(p.type)} ${realName}`;
                            }).join(', ');
                            const ownerName = javaClass.name.split('.').pop() ?? javaClass.name;
                            const signature = `${javaTypeAdjust(method.returnType)} ${ownerName}.${method.name}(${params})`;
                            const parsedJavadocLength = tryParseJavaDoc(doc.docu).length;
                            (method as Mutable<JavaMethod>).docu = {
                                $type: 'DocumentationInfo',
                                $container: method,
                                javadoc: truncateText(tryParseJavaDoc(doc.docu), MAX_JAVADOC_LENGTH),
                                signature: signature
                            } as DocumentationInfo;
                            if (parsedJavadocLength > MAX_JAVADOC_LENGTH) {
                                phase2Notes.push(`methods[${methodIndex}].docu truncated`);
                            }
                        }
                    }
                    AstUtils.linkContentToContainer(method);
                }
                for (const constructor of javaClass.constructors) {
                    constructor.resolvedReturnType = {
                        ref: await this.hooks.resolveClassByName(constructor.returnType, token, _depth + 1),
                        $refText: constructor.returnType
                    };
                    for (const parameter of constructor.parameters) {
                        (parameter as Mutable<JavaMethodParameter>).$type = JavaMethodParameter.$type;
                        parameter.resolvedType = {
                            ref: await this.hooks.resolveClassByName(parameter.type, token, _depth + 1),
                            $refText: parameter.type
                        };
                    }
                    AstUtils.linkContentToContainer(constructor);
                }
            } catch (e) {
                // finish linking of the class even if it has an error
                console.error(e)
            }
            AstUtils.linkContentToContainer(javaClass);
            // One combined line per class, naming only the affected field paths — never a
            // rejected or truncated value (issue #523).
            const adjustmentNotes = sanitationNotes.concat(phase2Notes);
            if (adjustmentNotes.length > 0) {
                logger.warn(`Java class ${className} peer data adjusted: ${adjustmentNotes.join(', ')}`);
            }
            return javaClass;
        } finally {
            // Only act while the registry still maps this name to this exact object: a later
            // clearCache() or a newer resolution of the same class must not be disturbed by a
            // stale Phase 2 settling after the fact (#497).
            if (this.inFlightPhase2.get(className) === javaClass) {
                if (!this.resolvedClasses.has(className)) {
                    // The LRU evicted this class during its own Phase 2 — put it back so a later
                    // lookup (before this registry entry is deleted below) still finds it.
                    this.resolvedClasses.set(className, javaClass);
                }
                this.inFlightPhase2.delete(className);
            }
        }
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

/**
 * Picks the javadoc entry describing `method` among the doc entries sharing its name
 * and arity (#478/#481). A single candidate is an unambiguous match. Several
 * candidates — same-arity overloads like addWindow(p_context, p_title) vs
 * addWindow(p_title, p_flags) — are told apart by the declared parameter types
 * (emitted by genjdoc.bbj since #481). Without types the assignment would be a
 * guess, and a wrong parameter name or doc text is worse than none: no entry is
 * used, which also suppresses the parameter-name inlay hints for that method.
 */
function selectMethodDoc(docs: MethodDoc[], method: JavaMethod): MethodDoc | undefined {
    if (docs.length <= 1) {
        return docs[0];
    }
    return docs.find(doc =>
        doc.params.every(p => p.type)
        && doc.params.every((p, i) => erasedSimpleName(p.type!) === erasedSimpleName(method.parameters[i].type)));
}

/**
 * Reduces a type name to its erased simple name for comparison. The javadoc side
 * carries the source text ("BBjString", "List<String>", "int[]", varargs "String...");
 * the reflected side the canonical name from Class.getCanonicalName() (arrays already
 * reduced to their component type by the interop service's getProperTypeName).
 */
function erasedSimpleName(type: string): string {
    let name = type.trim();
    const generic = name.indexOf('<');
    if (generic >= 0) {
        name = name.substring(0, generic);
    }
    name = name.replace(/(\.\.\.|\[\])+$/, '');
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.substring(dot + 1) : name;
}

/** Extracts package name from fully qualified class name
 * @param className fully qualified class name
 * @returns package name or empty string if no package */
function extractPackageName(className: string): string {
    const lastIndexOfDot = className.lastIndexOf('.');
    if (lastIndexOfDot === -1) {
        return ''; // No package name
    }
    const match = className.match(/\.(?=[A-Z])/);
    if (match && match.index !== undefined) {
        return className.substring(0, match.index); // Extract package name
    }

    return className.substring(0, lastIndexOfDot); // Fallback to last dot
}

/**
 * Strips the java.lang. prefix from fully qualified type names for display.
 * Mirrors the same helper in bbj-hover.ts.
 */
function javaTypeAdjust(typeFqn: string): string {
    return typeFqn.replace(/^java\.lang\./, '');
}

/**
 * Attempts to parse a raw Javadoc comment string into Markdown.
 * Falls back to the raw comment if parsing fails or input is not JSDoc.
 */
function tryParseJavaDoc(comment: string): string {
    if (isJSDoc(comment)) {
        try {
            return parseJSDoc(comment).toMarkdown();
        } catch {
            // JSDoc parsing can fail on complex Java documentation
        }
    }
    return comment;
}
