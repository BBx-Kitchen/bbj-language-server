/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstUtils, isJSDoc, LangiumDocument, LangiumDocuments, Mutable, parseJSDoc } from 'langium';
import { Socket } from 'net';
import { CancellationToken, MessageConnection } from 'vscode-jsonrpc/node.js';
import { URI } from 'vscode-uri';
import { BBjServices } from './bbj-module.js';
import { Classpath, DocumentationInfo, JavaClass, JavaField, JavaMethod, JavaMethodParameter, JavaPackage } from './generated/ast.js';
import { isClassDoc, JavadocProvider, MethodDoc } from './java-javadoc.js';
import {
    createSocketMessageConnection, InteropTransportError, isInteropTransportFailure, JavaInteropConnection,
    type ParseProgramParams, type ParseProgramResult
} from './java-interop-connection.js';
import { canonicalJavaClassName, JavaResolutionCache } from './java-interop-cache.js';
import { CompleteClassIndex } from './java-interop-class-index.js';
import { ClasspathLoader } from './java-interop-classpath.js';
import { ResolutionLock } from './java-interop-lock.js';
import { isUsableJavaClassName, MAX_JAVADOC_LENGTH, MAX_JAVA_IDENTIFIER_LENGTH, sanitizeJavaClassDto, truncateText } from './java-peer-guard.js';
import { logger } from './logger.js';

export {
    INTEROP_BREAKER_BACKOFF_FACTOR, INTEROP_BREAKER_INITIAL_COOLDOWN_MS, INTEROP_BREAKER_MAX_COOLDOWN_MS,
    InteropTransportError, isInteropTransportFailure, METHOD_NOT_FOUND
} from './java-interop-connection.js';
export { canonicalJavaClassName } from './java-interop-cache.js';
export type { ParseProgramParams, ParseError, ParseProgramResult } from './java-interop-connection.js';

/**
 * Packages probed (as `pkg.SimpleName`) when suggesting a `use` statement for an unresolved
 * class reference (issue #447). Unlike {@link implicitJavaImports}, these are NOT auto-imported;
 * they are only tried on demand to discover the FQN of a specific simple name. Kept to common
 * standard-library packages; broader/customer-jar coverage would need a dedicated server-side
 * lookup (deliberately avoided here so no BBj-side rebuild is required).
 */
const autoImportCandidatePackages = ['java.util', 'java.util.concurrent', 'java.util.function', 'java.util.stream', 'java.io', 'java.nio.file', 'java.time', 'java.math', 'java.net', 'java.text']

export const JavaSyntheticDocUri = 'classpath:/bbj.bbl'

/**
 * Maximum number of resolved Java classes kept in the resolved-class cache ({@link JavaResolutionCache})
 * before the least-recently-used entry is evicted (P61-D3-001) — an open-ended editor session
 * against a large/varied classpath must not grow this cache without bound. No specific number is
 * named by the finding record; 5000 is a discretionary choice, large enough to comfortably hold a
 * typical project's resolved classpath while still bounding steady-state memory growth.
 */
export const RESOLVED_CLASSES_CACHE_LIMIT = 5000;

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
 * be fed straight into {@link JavaInteropService.resolveClass}'s existing pipeline instead of
 * {@link JavaInteropService.createStubClass}'s failed-resolution shape (which carries an `error`
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

/**
 * Manages Java interop operations including class resolution, classpath loading,
 * and communication with the Java backend service.
 */
export class JavaInteropService {

    /**
     * The shared connection, its circuit breaker and the connection generation, built with hooks
     * bound to this service's own (possibly overridden) createSocket/wrapSocket/connect (#558).
     */
    private readonly interopConnection = new JavaInteropConnection({
        createSocket: () => this.createSocket(),
        wrapSocket: (socket) => this.wrapSocket(socket),
        connect: () => this.connect()
    });
    /**
     * The resolved-class cache and the Java package tree, built with the overridable cache limit
     * read eagerly — before any subclass field exists, matching the timing the old field
     * initializer relied on — and a hook bound to this service's own classpath document (#558).
     */
    private readonly resolutionCache = new JavaResolutionCache(this.resolvedClassesCacheLimit(), {
        classpath: () => this.classpath
    });
    private readonly lock = new ResolutionLock();
    /** Maximum recursion depth for Java class resolution to prevent runaway resolution chains. */
    private static readonly MAX_RESOLUTION_DEPTH = 50;
    /** Maximum time (ms) allowed for a single resolveClassByName call chain before aborting. */
    private static readonly RESOLUTION_TIMEOUT_MS = 30_000;
    /**
     * Classpath and implicit-import loading, built with hooks bound to this service's own
     * (possibly overridden) connect/resolveClass and to its classpath-document bookkeeping (#558).
     */
    private readonly classpathLoader = new ClasspathLoader({
        connect: () => this.connect(),
        resolveClass: (javaClass, token) => this.resolveClass(javaClass, token),
        registerResolvedClass: (name, javaClass) => this.resolutionCache.registerResolvedClass(name, javaClass),
        classpath: () => this.classpath,
        ensureClasspathDocument: () => this.ensureClasspathDocument(),
        addTopLevelPackage: (packageName) => this.resolutionCache.addTopLevelPackage(packageName)
    });

    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly classpathDocument: LangiumDocument<Classpath>;
    protected readonly javadocProvider: JavadocProvider;

    /**
     * @param services BBj language services providing access to documents and workspace
     */
    constructor(services: BBjServices) {
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.classpathDocument = services.shared.workspace.LangiumDocumentFactory.fromModel(<Classpath>{
            $container: undefined!,
            $type: Classpath.$type,
            packages: [],
            classes: []
        }, URI.parse(JavaSyntheticDocUri));
        this.javadocProvider = services.java.JavadocProvider;
    }

    /** See {@link JavaInteropConnection.generation}. */
    protected get _connectionGeneration(): number {
        return this.interopConnection.generation;
    }

    protected set _connectionGeneration(value: number) {
        this.interopConnection.generation = value;
    }

    /**
     * Test seam: the resolution pipeline (still on this class) reads its cache through this and
     * the two getters below, so `resolveClassByName`/`doResolveClassByName`/`resolveClass` keep
     * their exact text while the state they read now lives in {@link resolutionCache} (#558).
     */
    private get resolvedClasses() {
        return this.resolutionCache.resolvedClasses;
    }

    /** See {@link resolvedClasses}. */
    private get _inFlightPhase2() {
        return this.resolutionCache.inFlightPhase2;
    }

    /** See {@link resolvedClasses}. */
    private get _pendingResolutions() {
        return this.resolutionCache.pendingResolutions;
    }

    /** See {@link _connectionGeneration}. */
    public get connectionGeneration(): number {
        return this._connectionGeneration;
    }

    /**
     * Test seam: the {@link resolutionCache}'s cache bound. Read during field initialization —
     * before any subclass field exists — so an override must return a literal and read no
     * subclass state.
     */
    protected resolvedClassesCacheLimit(): number {
        return RESOLVED_CLASSES_CACHE_LIMIT;
    }

    /** Test seam: number of classes whose Phase 2 (async member-type resolution) is currently in flight. */
    protected inFlightResolutionCount(): number {
        return this.resolutionCache.inFlightCount();
    }

    /**
     * True once the java-interop classpath has actually been populated with at least one resolved
     * class (via {@link loadImplicitImports}/{@link loadClasspath}, or preloaded in the test double).
     * Used to gate "type cannot be resolved" diagnostics: when no class is available the interop
     * service is effectively down (e.g. CI without a running service, or EmptyFileSystem without a
     * reachable :5008), so an unresolved reference means "interop unavailable", not "invalid type".
     */
    public isClasspathAvailable(): boolean {
        return this.resolutionCache.isClasspathAvailable();
    }

    /**
     * Establishes connection to the Java backend service, through the shared
     * {@link interopConnection}'s breaker-guarded connect.
     */
    protected connect(): Promise<MessageConnection> {
        return this.interopConnection.connect();
    }

    /**
     * Wraps a connected socket in a JSON-RPC message connection. Extracted from the connection
     * module's own establishConnection() so a test double can swap in a scriptable fake peer
     * while the real connect()/breaker logic around it runs unmodified.
     */
    protected wrapSocket(socket: Socket): MessageConnection {
        return createSocketMessageConnection(socket);
    }

    /**
     * Sets the connection configuration for the Java interop service.
     * Call clearCache() separately to reconnect with new settings.
     */
    public setConnectionConfig(host: unknown, port: unknown): void {
        this.interopConnection.setConnectionConfig(host, port);
    }

    /** Returns a fresh snapshot of the currently configured interop host/port. */
    public getConnectionConfig(): { host: string; port: number } {
        return this.interopConnection.getConnectionConfig();
    }

    /**
     * Registers a listener fired once per half-open-to-closed transition — a probe succeeding
     * after an outage. Never fired by clearCache().
     */
    public onConnectionRecovered(listener: () => void | Promise<void>): void {
        this.interopConnection.onConnectionRecovered(listener);
    }

    /**
     * Creates a socket connection to the Java service
     */
    protected createSocket(): Promise<Socket> {
        return this.interopConnection.openSocket();
    }

    protected get classpath(): Classpath {
        return this.classpathDocument.parseResult.value;
    }

    /**
     * Retrieves a previously resolved Java class by its fully qualified name.
     * @param className fully qualified class name (e.g., "java.lang.String")
     * @returns the resolved JavaClass or undefined if not found
     */
    getResolvedClass(className: string): JavaClass | undefined {
        return this.resolutionCache.getResolvedClass(className);
    }

    /**
     * Retrieves raw class information from the Java backend service
     * @param className fully qualified name of the class to retrieve
     * @param token cancellation token for request cancellation
     */
    protected getRawClass(className: string, token?: CancellationToken): Promise<JavaClass> {
        return this.interopConnection.requestClassInfo(className, token);
    }

    /**
     * Parses `params.text` through the interop service's `parseProgram` endpoint. Delegates to
     * {@link JavaInteropConnection.parseProgram}, which tries the dedicated parser connection
     * first — independent of the shared connection's state and its circuit breaker — falling
     * back to the shared connection only when the dedicated one cannot be opened or was retired
     * for the current generation (issue #692).
     * @param params the parse request — the document's current text plus its resolution context
     * @param token cancellation token for request cancellation
     */
    public parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
        return this.interopConnection.parseProgram(params, token);
    }

    /**
     * Loads the Java classpath from the specified entries.
     * @param classPath array of classpath entries (file paths or BBj classpath notation)
     * @param token cancellation token for request cancellation
     * @returns true if classpath was loaded successfully, false otherwise
     */
    public loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
        return this.classpathLoader.loadClasspath(classPath, token);
    }

    /**
     * Loads implicit Java imports including standard packages and BBj-specific packages.
     * @param token cancellation token for request cancellation
     * @returns true if implicit imports were loaded successfully, false otherwise
     */
    public loadImplicitImports(token?: CancellationToken): Promise<boolean> {
        return this.classpathLoader.loadImplicitImports(token);
    }

    /**
     * Adds {@link classpathDocument} to {@link langiumDocuments} if it is not already registered,
     * so the synthetic classpath document participates in linking. Called by
     * {@link classpathLoader} after `loadImplicitImports()` populates the document.
     */
    private ensureClasspathDocument(): void {
        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }
    }

    /**
     * The complete class index, built with hooks bound to this service's own (possibly
     * overridden) connect/buildCompleteClassIndex and to the shared connection's probeIfDue
     * (#558).
     */
    private readonly classIndex = new CompleteClassIndex({
        connect: () => this.connect(),
        probeIfDue: () => this.interopConnection.probeIfDue(),
        buildCompleteClassIndex: (fqns) => this.buildCompleteClassIndex(fqns)
    });

    /**
     * Builds the complete class index from the augmented bbj-ls `getAllClassNames` endpoint, at
     * most once, and reports whether a complete index is available. Servers that predate the
     * endpoint answer with a MethodNotFound error, which is latched so callers transparently fall
     * back to the on-demand probe/index (issue #447). Transient connection errors are NOT latched,
     * so a later call can still succeed once interop is reachable.
     */
    public ensureCompleteClassIndex(token?: CancellationToken): Promise<boolean> {
        return this.classIndex.ensure(token);
    }

    /** True once a complete class index has been built (i.e. the augmented endpoint is available). */
    public hasCompleteClassIndex(): boolean {
        return this.classIndex.has();
    }

    /** Drops the complete class index so it is rebuilt on the next request (e.g. after a classpath change). */
    protected clearCompleteClassIndex(): void {
        this.classIndex.clear();
    }

    /**
     * Builds the complete class index from a list of fully-qualified class names, indexing each by
     * its lowercased simple name. Inner classes and packageless names are skipped. Marks the index
     * as resolved. Shared by the live `getAllClassNames` path and test seeding.
     */
    protected buildCompleteClassIndex(fqns: string[]): void {
        this.classIndex.build(fqns);
    }

    /**
     * Suggests fully-qualified names for an unresolved simple class name, to power missing-`use`
     * quick-fixes (issue #447). Prefers the complete index when the augmented server provides it;
     * otherwise falls back to classes already in the index plus a cheap, targeted probe of the
     * curated {@link autoImportCandidatePackages} (`pkg.SimpleName` lookups — no full-package
     * enumeration). Results are de-duplicated and sorted.
     */
    public async resolveClassCandidatesBySimpleName(simpleName: string, token?: CancellationToken): Promise<string[]> {
        if (await this.ensureCompleteClassIndex(token)) {
            return this.classIndex.simpleNameMatches(simpleName).sort();
        }
        const found = new Set<string>(this.findClassCandidatesBySimpleName(simpleName));
        await Promise.all(autoImportCandidatePackages.map(async pack => {
            const fqn = `${pack}.${simpleName}`;
            try {
                const resolved = await this.resolveClassByName(fqn, token);
                if (resolved && !resolved.error) {
                    found.add(fqn);
                }
            } catch (e) {
                logger.debug(() => `Auto-import probe for ${fqn} failed: ` + (e instanceof Error ? e.message : String(e)));
            }
        }));
        return [...found].sort();
    }

    /**
     * Returns fully-qualified names of Java classes whose simple name starts with `prefix`
     * (case-insensitive), for completion-time auto-import (issue #447). Uses the complete index
     * when the augmented server provides it; otherwise falls back to classes already resolved in
     * this session. Inner/packageless classes are skipped and the result is bounded by `limit`.
     */
    public async findClassCandidatesByPrefix(prefix: string, limit = 50, token?: CancellationToken): Promise<string[]> {
        const lower = prefix.toLowerCase();
        const matches = new Set<string>();
        if (await this.ensureCompleteClassIndex(token)) {
            for (const fqn of this.classIndex.prefixMatches(lower, limit)) {
                matches.add(fqn);
            }
        } else {
            for (const javaClass of this.resolutionCache.values()) {
                if (javaClass.error || !javaClass.packageName) {
                    continue;
                }
                const simple = javaClass.name.substring(javaClass.name.lastIndexOf('.') + 1);
                if (simple.includes('$') || !simple.toLowerCase().startsWith(lower)) {
                    continue;
                }
                matches.add(`${javaClass.packageName}.${simple}`);
            }
        }
        return [...matches].sort().slice(0, limit);
    }

    /**
     * Returns fully-qualified names of already-resolved Java classes whose simple name matches
     * `simpleName` (case-insensitive), used to suggest missing `use` statements (issue #447).
     * Only classes present in the index are considered; {@link resolveClassCandidatesBySimpleName}
     * additionally probes common packages. Inner classes and classes without a package (nothing to
     * `use`) are skipped. Results are de-duplicated and sorted.
     */
    public findClassCandidatesBySimpleName(simpleName: string): string[] {
        return this.resolutionCache.findClassCandidatesBySimpleName(simpleName);
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
            return this.resolveClass(localJavaTypeDto(key), token, _depth);
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
        const inFlightClass = this._inFlightPhase2.get(key);
        if (inFlightClass) {
            return inFlightClass;
        }

        // Safeguard 3: deduplicate — if another caller is already resolving this class, wait for it.
        // Also checked before the depth limit: the in-flight resolution owns the recursion budget.
        const pending = this._pendingResolutions.get(key);
        if (pending) {
            return pending;
        }

        // Safeguard 2: depth limit to prevent runaway recursive resolution chains. Only applies
        // to genuinely new classes we are about to fetch and resolve — cycles among already-seen
        // classes are broken by the resolvedClasses cache above (resolveClass registers a class
        // before recursing into its member types).
        if (_depth > JavaInteropService.MAX_RESOLUTION_DEPTH) {
            logger.warn(`Java class resolution depth limit (${JavaInteropService.MAX_RESOLUTION_DEPTH}) exceeded for '${key}', returning partial class`);
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
        this._pendingResolutions.set(key, resolutionPromise);
        try {
            return await resolutionPromise;
        } finally {
            this._pendingResolutions.delete(key);
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
            setTimeout(() => reject(new InteropTransportError(`Java class resolution chain timed out after ${JavaInteropService.RESOLUTION_TIMEOUT_MS}ms for '${key}'`)), JavaInteropService.RESOLUTION_TIMEOUT_MS)
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
            const inFlightClass = this._inFlightPhase2.get(key);
            if (inFlightClass) {
                return inFlightClass;
            }
            const javaClass: Mutable<JavaClass> = await Promise.race([
                this.getRawClass(requestName, token),
                timeoutPromise
            ]);
            return await Promise.race([
                this.resolveClass(javaClass, token, depth),
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
            $container: this.classpath,
            $containerProperty: 'classes',
            $containerIndex: this.classpath.classes.length,
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
    protected async resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
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
        const inFlightClass = this._inFlightPhase2.get(className);
        if (inFlightClass) {
            return inFlightClass;
        }

        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }

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
            javaClass.$container = this.classpath; // fallback to classpath
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
        this._inFlightPhase2.set(className, javaClass);

        try {
            try {
                // Phase 2 (async): resolve type references and populate documentation.
                const documentation = await this.javadocProvider.getDocumentation(javaClass);
                for (const field of javaClass.fields) {
                    field.resolvedType = {
                        ref: await this.resolveClassByName(field.type, token, _depth + 1),
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
                        ref: await this.resolveClassByName(method.returnType, token, _depth + 1),
                        $refText: method.returnType
                    };
                    for (const [index, parameter] of method.parameters.entries()) {
                        (parameter as Mutable<JavaMethodParameter>).$type = JavaMethodParameter.$type;
                        parameter.resolvedType = {
                            ref: await this.resolveClassByName(parameter.type, token, _depth + 1),
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
                        ref: await this.resolveClassByName(constructor.returnType, token, _depth + 1),
                        $refText: constructor.returnType
                    };
                    for (const parameter of constructor.parameters) {
                        (parameter as Mutable<JavaMethodParameter>).$type = JavaMethodParameter.$type;
                        parameter.resolvedType = {
                            ref: await this.resolveClassByName(parameter.type, token, _depth + 1),
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
            if (this._inFlightPhase2.get(className) === javaClass) {
                if (!this.resolvedClasses.has(className)) {
                    // The LRU evicted this class during its own Phase 2 — put it back so a later
                    // lookup (before this registry entry is deleted below) still finds it.
                    this.resolvedClasses.set(className, javaClass);
                }
                this._inFlightPhase2.delete(className);
            }
        }
    }

    /**
     * Retrieves all child packages and classes of a given package-like container.
     * @param javaPackageLike the parent container (JavaClass, JavaPackage, or undefined for classpath root)
     * @returns array of child JavaClass and JavaPackage elements
     */
    getChildrenOf(javaPackageLike?: JavaClass | JavaPackage) {
        return this.resolutionCache.getChildrenOf(javaPackageLike);
    }

    /**
     * Retrieves a specific child package or class by name from a parent container.
     * @param javaPackageLike the parent container (defaults to classpath root)
     * @param childName the name of the child to retrieve
     * @returns the matching JavaClass or JavaPackage, or undefined if not found
     */
    getChildOf(javaPackageLike: JavaClass | JavaPackage | Classpath = this.classpath, childName: string): JavaClass | JavaPackage | undefined {
        return this.resolutionCache.getChildOf(javaPackageLike, childName);
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
        return this.resolutionCache.isKnownJavaPackage(qualifiedName);
    }

    /**
     * Stores a Java class in the AST hierarchy, creating intermediate packages as needed.
     * This method builds the complete package structure and links the class to its parent container.
     * @param javaClass the Java class to store in the hierarchy
     * @param packageName the fully qualified package name (e.g., "java.lang")
     */
    storeJavaClass(javaClass: Mutable<JavaClass>, packageName: string): void {
        this.resolutionCache.storeJavaClass(javaClass, packageName);
    }

    /**
     * Clears all cached Java class data, disconnects the current connection,
     * and resets the classpath document. Call this before reloading classpath.
     */
    public clearCache(): void {
        // Clear the resolved-class cache, the pending resolutions, the in-flight Phase 2
        // registry, the package tree and the java.lang.Object cache.
        this.resolutionCache.reset();

        // Clear the complete class index so it is rebuilt against the new classpath instead of
        // continuing to answer auto-import suggestions with stale FQNs (P61-D2-004)
        this.clearCompleteClassIndex();

        // Reset lock state
        this.lock.reset();

        // Reset the circuit breaker and bump the connection generation so a connect attempt
        // started before this reset cannot report its outcome (#504).
        this.interopConnection.resetBreaker();

        // Clear implicit-import bookkeeping so a later loadImplicitImports() rebuilds it from scratch.
        this.classpathLoader.reset();

        // Reset classpath document arrays
        this.classpath.packages = [];
        this.classpath.classes = [];

        // Disconnect existing connection so a fresh one is created
        this.interopConnection.disconnect();

        logger.info('Java interop cache cleared');
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
