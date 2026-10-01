/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { LangiumDocument, LangiumDocuments, Mutable } from 'langium';
import { Socket } from 'net';
import { CancellationToken, MessageConnection } from 'vscode-jsonrpc/node.js';
import { URI } from 'vscode-uri';
import { BBjServices } from './bbj-module.js';
import { Classpath, JavaClass, JavaPackage } from './generated/ast.js';
import { JavadocProvider } from './java-javadoc.js';
import {
    createSocketMessageConnection, JavaInteropConnection,
    type ParseProgramParams, type ParseProgramResult
} from './java-interop-connection.js';
import { JavaResolutionCache } from './java-interop-cache.js';
import { CompleteClassIndex } from './java-interop-class-index.js';
import { ClasspathLoader } from './java-interop-classpath.js';
import { ResolutionLock } from './java-interop-lock.js';
import type {
    DenumProgramParams, DenumProgramResult, FormatProgramParams, FormatProgramResult, ProgramOutcome
} from './java-interop-program-types.js';
import { logger } from './logger.js';

export {
    INTEROP_BREAKER_BACKOFF_FACTOR, INTEROP_BREAKER_INITIAL_COOLDOWN_MS, INTEROP_BREAKER_MAX_COOLDOWN_MS,
    InteropTransportError, isInteropTransportFailure, METHOD_NOT_FOUND
} from './java-interop-connection.js';
export { canonicalJavaClassName, isLocalJavaTypeName, JAVA_PRIMITIVE_TYPE_NAMES } from './java-interop-cache.js';
export type { ParseProgramParams, ParseError, ParseProgramResult } from './java-interop-connection.js';
export type {
    DenumProgramParams, DenumProgramResult, DocumentFormatResult, FormatProgramParams, FormatProgramResult,
    FormatSettingValue, ProgramDiagnostic, ProgramFailureKind, ProgramOutcome, ProgramPosition, ProgramRange,
    ProgramSettingProblem, ProgramTextEdit, RangeFormatResult
} from './java-interop-program-types.js';

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
    private readonly lock = new ResolutionLock();
    /**
     * The resolved-class cache, the Java package tree and the class resolution pipeline, built
     * with the overridable cache limit read eagerly — before any subclass field exists, matching
     * the timing the old field initializer relied on — the {@link lock} instance (declared above
     * this field so it exists when this field initializer runs), and hooks bound to this
     * service's own (possibly overridden) methods so a subclass override of any of them still
     * takes effect for a call the pipeline makes internally (#558).
     */
    private readonly resolutionCache = new JavaResolutionCache(this.resolvedClassesCacheLimit(), this.lock, {
        classpath: () => this.classpath,
        ensureClasspathDocument: () => this.ensureClasspathDocument(),
        getDocumentation: (node) => this.javadocProvider.getDocumentation(node),
        getRawClass: (className, token) => this.getRawClass(className, token),
        resolveClass: (javaClass, token, depth) => this.resolveClass(javaClass, token, depth),
        resolveClassByName: (className, token, depth) => this.resolveClassByName(className, token, depth)
    });
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
     * Formats `params.text` (the whole document, or `params.range`) through the interop service's
     * `formatProgram` endpoint. Delegates to {@link JavaInteropConnection.formatProgram}: the request
     * travels over its own dedicated connection, never the shared connection or the parse lane, and
     * never delays a parse or a class lookup. Never throws; the answer is a typed outcome built from
     * a validated peer answer. The caller passes the live editor text — the client never reads a file.
     * @param params the format request
     * @param token cancellation token forwarded to the request
     */
    public formatProgram(params: FormatProgramParams, token?: CancellationToken): Promise<ProgramOutcome<FormatProgramResult>> {
        return this.interopConnection.formatProgram(params, token);
    }

    /**
     * Removes line numbers from `params.text` through the interop service's `denumProgram`
     * endpoint, over the same dedicated connection as {@link formatProgram}. Never throws; the
     * answer is a typed outcome built from a validated peer answer. The caller passes the live
     * editor text — the client never reads a file.
     * @param params the DENUM request
     * @param token cancellation token forwarded to the request
     */
    public denumProgram(params: DenumProgramParams, token?: CancellationToken): Promise<ProgramOutcome<DenumProgramResult>> {
        return this.interopConnection.denumProgram(params, token);
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
     * {@link classpathLoader} after `loadImplicitImports()` populates the document, and by
     * {@link resolutionCache} before storing a newly resolved class (#558).
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
    resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        return this.resolutionCache.resolveClassByName(className, token, _depth);
    }

    /**
     * Resolves and links a Java class with its dependencies including fields, methods, parameters, and documentation.
     * This method processes the raw class data, resolves type references, links Javadoc, and stores the class in the AST hierarchy.
     * The "Resolving class ..." debug line is skipped for a primitive, `void`, array or blank name (issue #660).
     * @param javaClass the Java class to resolve and link
     * @param token cancellation token for request cancellation
     * @returns the resolved and linked JavaClass
     */
    protected resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        return this.resolutionCache.resolveClass(javaClass, token, _depth);
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
