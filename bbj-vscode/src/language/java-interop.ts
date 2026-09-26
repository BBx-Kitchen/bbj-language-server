/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstUtils, isJSDoc, LangiumDocument, LangiumDocuments, Mutable, parseJSDoc } from 'langium';
import { Socket } from 'net';
import {
    CancellationToken, ConnectionError, createMessageConnection, ErrorCodes, MessageConnection, RequestType,
    ResponseError, SocketMessageReader, SocketMessageWriter
} from 'vscode-jsonrpc/node.js';
import { URI } from 'vscode-uri';
import { BBjServices } from './bbj-module.js';
import { notifyJavaConnectionError } from './bbj-notifications.js';
import { Classpath, DocumentationInfo, JavaClass, JavaField, JavaMethod, JavaMethodParameter, JavaPackage } from './generated/ast.js';
import { isClassDoc, JavadocProvider, MethodDoc } from './java-javadoc.js';
import { logger } from './logger.js';
import { assertType } from './utils.js';

const implicitJavaImports = ['java.lang', 'com.basis.startup.type', 'com.basis.bbj.proxies', 'com.basis.bbj.proxies.sysgui', 'com.basis.bbj.proxies.event', 'com.basis.startup.type.sysgui', 'com.basis.bbj.proxies.servlet']

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
 * Maximum number of resolved Java classes kept in {@link JavaInteropService._resolvedClasses}
 * before the least-recently-used entry is evicted (P61-D3-001) — an open-ended editor session
 * against a large/varied classpath must not grow this cache without bound. No specific number is
 * named by the finding record; 5000 is a discretionary choice, large enough to comfortably hold a
 * typical project's resolved classpath while still bounding steady-state memory growth.
 */
export const RESOLVED_CLASSES_CACHE_LIMIT = 5000;

/**
 * Cooldown (ms) the breaker in {@link JavaInteropService.connect} applies after opening, before
 * it lets a single half-open probe through (#504). No issue or research note pins these
 * numbers; one connect-level failure opens the breaker, and the initial cooldown, backoff
 * factor and cap below are a discretionary starting point.
 */
export const INTEROP_BREAKER_INITIAL_COOLDOWN_MS = 5_000;
/** Multiplier applied to the cooldown after each failed half-open probe, capped below. */
export const INTEROP_BREAKER_BACKOFF_FACTOR = 2;
/** Upper bound on the breaker's cooldown after repeated failed probes. */
export const INTEROP_BREAKER_MAX_COOLDOWN_MS = 30_000;

/**
 * Thrown for a connection-transport-level failure: the breaker short-circuiting, a failed
 * connect, a resolution timeout, or a dropped in-flight request (#504). Distinguishes "the peer
 * or transport is unavailable right now" from a genuine backend answer, so callers know which
 * failure stubs are safe to cache — see {@link isInteropTransportFailure}.
 */
export class InteropTransportError extends Error {
    constructor(message: string, public readonly originalError?: unknown) {
        super(message);
        this.name = 'InteropTransportError';
    }
}

/**
 * True for a transport-level failure that must never be cached as a genuine "class not found":
 * an {@link InteropTransportError} (breaker short-circuit, failed connect, or a resolution
 * timeout), a vscode-jsonrpc `ConnectionError`, or a `ResponseError` whose code is
 * `ErrorCodes.PendingResponseRejected` (a dropped connection rejecting its in-flight requests).
 */
export function isInteropTransportFailure(error: unknown): boolean {
    if (error instanceof InteropTransportError) {
        return true;
    }
    if (error instanceof ConnectionError) {
        return true;
    }
    if (error instanceof ResponseError && (error as ResponseError<unknown>).code === ErrorCodes.PendingResponseRejected) {
        return true;
    }
    return false;
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
 * Canonicalizes a nested Java class name to the Java source spelling (`Outer.Inner`), the single
 * identity `java-interop.ts` uses for a class: the key of `resolvedClasses`, the in-flight
 * registry and the pending-resolution map, and the display name shown in hover, completion detail
 * and messages. The backend echoes back whichever spelling was requested — a member type's own
 * name via `getCanonicalName` (dotted) but a constructor's return type via `getName` (`$`) — so
 * without this normalization the two spellings are fetched and cached as two distinct classes
 * (issue #659).
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

/**
 * Manages Java interop operations including class resolution, classpath loading,
 * and communication with the Java backend service.
 */
export class JavaInteropService {

    private connection?: MessageConnection;
    /**
     * In-flight `connect()` promise shared by same-tick callers (P61-D2-001): without it, two
     * concurrent callers that both observe no existing connection each open their own socket,
     * and the second silently overwrites/leaks the first.
     */
    private connectingPromise?: Promise<MessageConnection>;
    private readonly _resolvedClasses = new LruMap<string, JavaClass>(this.resolvedClassesCacheLimit());
    private readonly childrenOfByName = new Map<JavaClass | JavaPackage | Classpath, Map<string, JavaClass | JavaPackage>>();
    /**
     * Classes registered in {@link _resolvedClasses} whose async member-type resolution (Phase 2 of
     * {@link resolveClass}) is still running (#497). Consulted by every fast path that would
     * otherwise miss a class evicted from the LRU during its own cyclic resolution; cleared in
     * {@link resolveClass}'s identity-guarded `finally` and by {@link clearCache}.
     */
    private readonly _inFlightPhase2: Map<string, JavaClass> = new Map();
    /** Queue-based async mutex: each entry is a resolve function that grants the lock to the next waiter. */
    private lockQueue: Array<() => void> = [];
    private lockHeld = false;
    /** Tracks the current lock owner to allow re-entrant acquisition during recursive resolveClass calls. */
    private currentLockToken: object | null = null;
    /** In-flight resolution promises keyed by class name, preventing duplicate concurrent resolution of the same class. */
    private readonly _pendingResolutions: Map<string, Promise<JavaClass>> = new Map();
    /** Maximum recursion depth for Java class resolution to prevent runaway resolution chains. */
    private static readonly MAX_RESOLUTION_DEPTH = 50;
    /** Maximum time (ms) allowed for a single resolveClassByName call chain before aborting. */
    private static readonly RESOLUTION_TIMEOUT_MS = 30_000;
    private interopHost: string = '127.0.0.1';
    private interopPort: number = 5008;
    /** Three-state breaker guarding {@link connect} against a peer that is unreachable at the connect level (#504). */
    private breakerState: 'closed' | 'open' | 'half-open' = 'closed';
    /** `Date.now()` time at which the next lookup is let through as the single half-open probe. */
    private breakerProbeDueAt = 0;
    /** Cooldown (ms) applied the next time the breaker opens; grows on a failed probe and resets on a successful one. */
    private breakerCooldownMs = INTEROP_BREAKER_INITIAL_COOLDOWN_MS;
    /** Bumped by clearCache() so a connect attempt started before the reset cannot change breaker state or report recovery. */
    private breakerGeneration = 0;
    /**
     * Bumped in three places: once inside {@link establishConnection} right after a fresh shared
     * `MessageConnection` is assigned, once inside {@link clearCache} beside
     * {@link breakerGeneration}, and once inside {@link onParseLaneLost} when the dedicated
     * parser connection is lost after having been open. Opening the dedicated connection itself
     * never bumps this value — the server behind it is the one the shared connection already
     * probed — but losing it does, so any per-connection latch (e.g. a probe result) or stored
     * diagnostic verdict keyed on this value resets and re-decides on the next request.
     */
    protected _connectionGeneration = 0;
    /** Fired once per half-open-to-closed transition, scheduled with Promise.resolve().then(...) — connect() never awaits them. */
    private readonly recoveryListeners: Array<() => void | Promise<void>> = [];
    /** Simple-name copies already added by loadImplicitImports(), keyed by "package.simpleName", so re-running it adds no duplicate entry to the synthetic classpath document. */
    private readonly implicitImportCopies = new Map<string, Mutable<JavaClass>>();

    /**
     * The dedicated connection `parseProgram` requests travel over, kept separate from
     * {@link connection} so class-lookup traffic during a large workspace's initial build never
     * delays a live parse (issue #692). Built with the service's own {@link createSocket}/
     * {@link wrapSocket}, so it reads the same `interopHost`/`interopPort` the shared connection
     * does. Opened lazily on the first parse for a given {@link _connectionGeneration}; retired
     * and reopened whenever the generation moves on.
     */
    private parseLane?: MessageConnection;
    /** The {@link _connectionGeneration} {@link parseLane} was opened for. */
    private parseLaneGeneration = -1;
    /** In-flight open shared by same-tick callers, mirroring {@link connectingPromise}'s role for {@link connect}. */
    private parseLaneConnecting?: Promise<MessageConnection | undefined>;
    /**
     * The generation in which opening {@link parseLane} failed, or a `MethodNotFound` answer
     * closed it (an older server). No further open attempt is made until
     * {@link _connectionGeneration} moves past this value.
     */
    private parseLaneRetiredGeneration = -1;

    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly classpathDocument: LangiumDocument<Classpath>;
    protected javadocProvider = JavadocProvider.getInstance();

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
    }

    private get resolvedClasses(): LruMap<string, JavaClass> {
        return this._resolvedClasses;
    }

    /** See {@link _connectionGeneration}. */
    public get connectionGeneration(): number {
        return this._connectionGeneration;
    }

    /**
     * Test seam: the {@link _resolvedClasses} bound. Read during field initialization — before any
     * subclass field exists — so an override must return a literal and read no subclass state.
     */
    protected resolvedClassesCacheLimit(): number {
        return RESOLVED_CLASSES_CACHE_LIMIT;
    }

    /** Test seam: number of classes whose Phase 2 (async member-type resolution) is currently in flight. */
    protected inFlightResolutionCount(): number {
        return this._inFlightPhase2.size;
    }

    /**
     * True once the java-interop classpath has actually been populated with at least one resolved
     * class (via {@link loadImplicitImports}/{@link loadClasspath}, or preloaded in the test double).
     * Used to gate "type cannot be resolved" diagnostics: when no class is available the interop
     * service is effectively down (e.g. CI without a running service, or EmptyFileSystem without a
     * reachable :5008), so an unresolved reference means "interop unavailable", not "invalid type".
     */
    public isClasspathAvailable(): boolean {
        return this._resolvedClasses.size > 0;
    }

    /**
     * Establishes connection to the Java backend service. Concurrent same-tick callers share the
     * single in-flight {@link connectingPromise} instead of each opening their own socket
     * (P61-D2-001).
     */
    protected async connect(): Promise<MessageConnection> {
        if (this.connection) {
            return this.connection;
        }
        if (this.breakerState === 'open') {
            if (Date.now() < this.breakerProbeDueAt) {
                this.throwCircuitOpen();
            }
            // The cooldown elapsed: this call becomes the single half-open probe. A probe
            // issued from inside a resolution holds the unchanged resolution lock for at most
            // one connect attempt per cooldown window.
            this.breakerState = 'half-open';
        } else if (this.breakerState === 'half-open') {
            // A probe is already in flight; every other caller short-circuits.
            this.throwCircuitOpen();
        }
        if (this.connectingPromise) {
            return this.connectingPromise;
        }
        const isProbe = this.breakerState === 'half-open';
        const generation = this.breakerGeneration;
        this.connectingPromise = this.establishConnection().then(
            connection => {
                this.onConnectAttemptSettled(generation, isProbe, { success: true });
                return connection;
            },
            e => {
                const message = e instanceof Error ? e.message : String(e);
                this.onConnectAttemptSettled(generation, isProbe, { success: false, message });
                throw new InteropTransportError(message, e);
            }
        );
        try {
            return await this.connectingPromise;
        } finally {
            this.connectingPromise = undefined;
        }
    }

    /** Throws the short-circuit error used by every breaker-open code path, so its text exists in exactly one place. */
    private throwCircuitOpen(): never {
        throw new InteropTransportError('Java interop service unavailable (circuit open)');
    }

    /**
     * Updates breaker state from a settled connect attempt. Ignored once `generation` no longer
     * matches the current one — clearCache() bumped it, so this attempt started before the reset
     * and must not change breaker state or report recovery.
     */
    private onConnectAttemptSettled(generation: number, wasProbe: boolean, outcome: { success: true } | { success: false; message: string }): void {
        if (generation !== this.breakerGeneration) {
            return;
        }
        if (outcome.success) {
            this.breakerState = 'closed';
            this.breakerCooldownMs = INTEROP_BREAKER_INITIAL_COOLDOWN_MS;
            if (wasProbe) {
                this.fireRecoveryListeners();
            }
        } else {
            this.breakerState = 'open';
            this.breakerProbeDueAt = Date.now() + this.breakerCooldownMs;
            if (wasProbe) {
                // A failed half-open probe backs off silently — no popup.
                this.breakerCooldownMs = Math.min(this.breakerCooldownMs * INTEROP_BREAKER_BACKOFF_FACTOR, INTEROP_BREAKER_MAX_COOLDOWN_MS);
            } else {
                // The closed-to-open transition: exactly one popup per outage.
                notifyJavaConnectionError(outcome.message);
            }
        }
    }

    private fireRecoveryListeners(): void {
        for (const listener of this.recoveryListeners) {
            Promise.resolve().then(() => listener()).catch(e => logger.error(`Java interop recovery listener failed: ${e}`));
        }
    }

    /**
     * Registers a listener fired once per half-open-to-closed transition — a probe succeeding
     * after an outage. Never fired by clearCache().
     */
    public onConnectionRecovered(listener: () => void | Promise<void>): void {
        this.recoveryListeners.push(listener);
    }

    /**
     * Starts the single half-open probe, without awaiting it, when the breaker is open and its
     * cooldown has elapsed. Used by callers that can answer from a local index and would
     * otherwise never touch connect() again after an outage — a caret-driven lookup can then
     * bring recovery with no edit. The outcome is handled entirely by onConnectAttemptSettled.
     */
    private probeIfDue(): void {
        if (this.breakerState === 'open' && Date.now() >= this.breakerProbeDueAt) {
            this.connect().catch(() => { /* handled by onConnectAttemptSettled */ });
        }
    }

    /**
     * Opens a fresh socket and message connection, and registers `close`/`error` listeners that
     * drop {@link connection} so a peer disconnect forces the next {@link connect} call to
     * reconnect instead of handing back the dead reference (P61-D2-001).
     */
    private async establishConnection(): Promise<MessageConnection> {
        let socket: Socket;
        try {
            socket = await this.createSocket();
        } catch (e) {
            console.error('Failed to connect to the Java service.', e);
            throw e;
        }
        const connection = this.wrapSocket(socket);
        // Guard on identity: an old connection's close/error can be delivered after a newer
        // connect() already installed a healthy replacement, and an unguarded clear would drop
        // that live reference and force a spurious reconnect (P67-WR-02).
        connection.onClose(() => { if (this.connection === connection) this.connection = undefined; });
        connection.onError(() => { if (this.connection === connection) this.connection = undefined; });
        connection.listen();
        this.connection = connection;
        this._connectionGeneration++;
        return connection;
    }

    /**
     * Wraps a connected socket in a JSON-RPC message connection. Extracted from
     * establishConnection() so a test double can swap in a scriptable fake peer while the real
     * connect()/breaker logic around it runs unmodified.
     */
    protected wrapSocket(socket: Socket): MessageConnection {
        return createMessageConnection(new SocketMessageReader(socket), new SocketMessageWriter(socket));
    }

    /**
     * Sets the connection configuration for the Java interop service.
     * Call clearCache() separately to reconnect with new settings.
     * @param host hostname or IP address of the Java interop service
     * @param port port number of the Java interop service
     */
    public setConnectionConfig(host: string, port: number): void {
        this.interopHost = host || '127.0.0.1';
        this.interopPort = port || 5008;
        logger.debug(`Java interop connection config: ${this.interopHost}:${this.interopPort}`);
    }

    /**
     * Creates a socket connection to the Java service
     */
    protected createSocket(): Promise<Socket> {
        return new Promise((resolve, reject) => {
            const socket = new Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                reject(new Error('Socket connection to Java service timed out after 10s'));
            }, 10000);
            socket.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
            socket.on('ready', () => {
                clearTimeout(timeout);
                resolve(socket);
            });
            socket.connect(this.interopPort, this.interopHost);
        });
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
        if (className === 'java.lang.Object') {
            // called very often, so cache it
            return this.javaLangObject()
        }
        return this.resolvedClasses.get(canonicalJavaClassName(className));
    }

    private JAVA_LANG_OBJECT: JavaClass | undefined = undefined;

    private javaLangObject(): JavaClass | undefined {
        if (!this.JAVA_LANG_OBJECT) {
            this.JAVA_LANG_OBJECT = this.resolvedClasses.get('java.lang.Object');
        }
        return this.JAVA_LANG_OBJECT;
    }

    /**
     * Retrieves raw class information from the Java backend service
     * @param className fully qualified name of the class to retrieve
     * @param token cancellation token for request cancellation
     */
    protected async getRawClass(className: string, token?: CancellationToken): Promise<JavaClass> {
        const connection = await this.connect();
        const requestPromise = connection.sendRequest(getClassInfoRequest, { className }, token);
        // Defensive no-op handler on the raced branch (P61-D2-002): the rejection still reaches
        // the caller via the Promise.race below, this only guards against a late settlement being
        // reported as an unhandled rejection.
        requestPromise.catch(() => { /* surfaced to the caller via the race below */ });
        return Promise.race([
            requestPromise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new InteropTransportError(`Java class resolution timeout for ${className}`)), 10000))
        ]);
    }

    /**
     * Parses `params.text` through the interop service's `parseProgram` endpoint and returns its
     * result. The request tries its own dedicated connection first — opened lazily by
     * {@link parseLaneConnection} — independent of the shared connection's state and its circuit
     * breaker: a shared connection that is down, half-open, or still busy with a burst of
     * `getClassInfo` traffic never delays or short-circuits a parse. The shared connection (via
     * {@link connect}, with its own breaker and reconnect logic) is used only when the dedicated
     * one cannot be opened or was retired for the current generation. One side effect of trying
     * the dedicated connection first: a parse that runs before any shared connection exists opens
     * the lane under the current generation, and the shared connection's own later first connect
     * bumps the generation — which retires that lane, so the next parse re-opens it and re-probes
     * the endpoint (the same "a reset of either connection clears verdict state" rule this
     * generation already follows). Deliberately NOT routed through {@link sendRequestSafe}: a
     * caller here must be able to tell a `MethodNotFound` error (older server, no endpoint), an
     * application error (`-3300x`) and a cancellation (`RequestCancelled`, a superseded request)
     * apart, which a collapsed fallback value would destroy.
     * @param params the parse request — the document's current text plus its resolution context
     * @param token cancellation token for request cancellation
     */
    public async parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
        const lane = await this.parseLaneConnection();
        if (!lane) {
            const shared = await this.connect();
            return shared.sendRequest(parseProgramRequest, params, token);
        }
        try {
            return await lane.sendRequest(parseProgramRequest, params, token);
        } catch (e) {
            if ((e as { code?: number } | undefined)?.code === METHOD_NOT_FOUND) {
                // An older server behind the dedicated connection: close it for the rest of this
                // generation so no idle second socket lingers, and let every further parse in
                // this generation go over the shared connection instead.
                this.parseLaneRetiredGeneration = this._connectionGeneration;
                this.disposeParseLane();
            }
            throw e;
        }
    }

    /**
     * Returns the dedicated `parseProgram` connection for the current connection generation,
     * opening it lazily on first use and reusing it for the rest of the generation. Same-tick
     * callers share the single in-flight {@link parseLaneConnecting} promise, mirroring
     * {@link connect}'s handling of {@link connectingPromise}. Returns `undefined` — never throws —
     * when the dedicated connection could not be opened or was retired for this generation; the
     * caller falls back to the shared connection.
     */
    private async parseLaneConnection(): Promise<MessageConnection | undefined> {
        const generation = this._connectionGeneration;
        if (this.parseLane && this.parseLaneGeneration === generation) {
            return this.parseLane;
        }
        if (this.parseLane) {
            // An older generation's connection is still around: retire it before opening a new one.
            this.disposeParseLane();
        }
        if (this.parseLaneRetiredGeneration === generation) {
            return undefined;
        }
        if (this.parseLaneConnecting) {
            return this.parseLaneConnecting;
        }
        this.parseLaneConnecting = this.openParseLane(generation);
        try {
            return await this.parseLaneConnecting;
        } finally {
            this.parseLaneConnecting = undefined;
        }
    }

    /**
     * Opens a fresh socket and wraps it as the dedicated `parseProgram` connection for
     * `generation`, registering `close`/`error` listeners that hand the loss to
     * {@link onParseLaneLost}. Never touches {@link breakerState}, never raises the connection
     * error notification and never bumps {@link _connectionGeneration} — the server behind it is
     * the one the shared connection already probed. If {@link _connectionGeneration} moved on
     * while opening, the new connection is disposed and `undefined` is returned instead of being
     * stored for a generation that is no longer current. If the socket itself cannot be opened,
     * retires `generation` (so no further attempt is made until it moves on) and returns
     * `undefined` after logging one warn line — see the catch block below.
     */
    private async openParseLane(generation: number): Promise<MessageConnection | undefined> {
        let socket: Socket;
        try {
            socket = await this.createSocket();
        } catch (e) {
            // The dedicated connection could not be opened, but the shared one keeps working:
            // fall back silently, logged once per generation, never as a parse failure and
            // never touching the breaker, a dialog or the endpoint probe latch.
            this.parseLaneRetiredGeneration = generation;
            const message = e instanceof Error ? e.message : String(e);
            logger.warn(`Live compiler diagnostics: could not open a dedicated parser connection (${message}); using the shared interop connection`);
            return undefined;
        }
        const lane = this.wrapSocket(socket);
        lane.onClose(() => this.onParseLaneLost(lane));
        lane.onError(() => this.onParseLaneLost(lane));
        lane.listen();
        if (this._connectionGeneration !== generation) {
            lane.dispose();
            return undefined;
        }
        this.parseLane = lane;
        this.parseLaneGeneration = generation;
        return lane;
    }

    /**
     * Clears {@link parseLane} once it is lost (closed or errored) — guarded on identity, as
     * {@link establishConnection} does for {@link connection}, so a stale listener from an
     * already-replaced lane cannot clear a newer one, and so a connection this service disposed
     * of itself (its field already cleared first by {@link disposeParseLane}) never reaches this
     * far. A genuine loss — the dedicated connection dropping after having been open — bumps
     * {@link _connectionGeneration} once, so every per-connection latch and stored diagnostic
     * verdict resets and re-decides on the next request, while the shared connection stays in
     * use with no new socket.
     */
    private onParseLaneLost(lane: MessageConnection): void {
        if (this.parseLane !== lane) {
            return;
        }
        this.parseLane = undefined;
        this._connectionGeneration++;
    }

    /**
     * Disposes the current dedicated connection, if any, clearing the field first so its own
     * close listener (routed through {@link onParseLaneLost}) is a no-op once disposal starts.
     */
    private disposeParseLane(): void {
        const lane = this.parseLane;
        this.parseLane = undefined;
        lane?.dispose();
    }

    /**
     * Sends a request to the Java backend service, returning `fallback` and logging the error
     * instead of throwing if connecting or the request itself fails (P61-D4-003). Shared by
     * request paths whose error handling is exactly "connect, send, log-and-return-fallback on
     * failure" — {@link loadClasspath} today; paths with additional success/error-branch logic
     * (e.g. {@link ensureCompleteClassIndex}'s METHOD_NOT_FOUND latch, or {@link getRawClass}'s
     * timeout race) are not routed through this helper since they don't fit the plain shape.
     * @param request the JSON-RPC request type to send
     * @param params request parameters
     * @param fallback value returned when connecting or the request fails
     * @param token cancellation token for request cancellation
     */
    private async sendRequestSafe<P, R>(request: RequestType<P, R, null>, params: P, fallback: R, token?: CancellationToken): Promise<R> {
        try {
            const connection = await this.connect();
            return await connection.sendRequest(request, params, token);
        } catch (e) {
            console.error(e)
            return fallback;
        }
    }

    /**
     * Loads the Java classpath from the specified entries.
     * @param classPath array of classpath entries (file paths or BBj classpath notation)
     * @param token cancellation token for request cancellation
     * @returns true if classpath was loaded successfully, false otherwise
     */
    public async loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
        logger.debug(() => "Load classpath from: " + classPath.join(', '))
        const entries = classPath.filter(entry => entry.length > 0).map(entry => {
            // If entry is already wrapped in square brackets (BBj classpath notation), keep it as is
            // Otherwise, add 'file:' prefix for regular file paths
            if (entry.startsWith('[') && entry.endsWith(']')) {
                return entry;
            }
            return 'file:' + entry;
        });
        return this.sendRequestSafe(loadClasspathRequest, { classPathEntries: entries }, false, token);
    }

    /**
     * Loads implicit Java imports including standard packages and BBj-specific packages.
     * @param token cancellation token for request cancellation
     * @returns true if implicit imports were loaded successfully, false otherwise
     */
    public async loadImplicitImports(token?: CancellationToken): Promise<boolean> {
        logger.debug(() => "Load package classes: " + implicitJavaImports.join(', '))
        try {
            const connection = await this.connect();
            await Promise.all(implicitJavaImports.concat('java.sql').map(async pack => {
                const classInfos = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
                await Promise.all(classInfos.map(async javaClass => {
                    await this.resolveClass(javaClass, token)

                    if (pack !== 'java.sql') { // Not an implicit import but sql package preload.
                        // add as implicit Java package import
                        const simpleName = javaClass.name.replace(pack + '.', '')
                        const copyKey = `${pack}.${simpleName}`;
                        const existingCopy = this.implicitImportCopies.get(copyKey);
                        if (existingCopy) {
                            // Already added by an earlier run: reuse it instead of pushing a
                            // second entry into the synthetic classpath document.
                            this.resolvedClasses.set(simpleName, existingCopy);
                        } else {
                            const simpleNameCopy = { ...javaClass }
                            simpleNameCopy.name = simpleName
                            simpleNameCopy.$containerIndex = this.classpath.classes.length;
                            this.classpath.classes.push(simpleNameCopy);
                            this.resolvedClasses.set(simpleNameCopy.name, simpleNameCopy);
                            this.implicitImportCopies.set(copyKey, simpleNameCopy);
                        }
                    }
                }))
            }))
            logger.info(() => "Loaded " + this.classpath.classes.length + " classes")

            if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
                this.langiumDocuments.addDocument(this.classpathDocument);
            }
            // Try to get top level packages, but handle gracefully if not supported
            try {
                const topLevelPackages = await connection.sendRequest(getTopLevelPackages, {}, token);
                for (const pack of topLevelPackages) {
                    const parts = pack.packageName.split('.');
                    let parent: Classpath | JavaPackage = this.classpath;
                    parts.forEach((part, index) => {
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
            } catch (topLevelErr) {
                // getTopLevelPackages might not be supported by older Java interop versions
                logger.debug("getTopLevelPackages not supported, skipping top-level package initialization");
            }
            return true;
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    /**
     * Complete `simpleName(lowercased) → FQN[]` index built from the augmented bbj-ls
     * `getAllClassNames` endpoint, or null when that endpoint is unavailable (older server).
     */
    private completeClassIndex: Map<string, string[]> | null = null;
    /** True once we have determined — by success or a definitive MethodNotFound — whether {@link completeClassIndex} is available. */
    private completeIndexResolved = false;

    /**
     * Builds the {@link completeClassIndex} from the augmented bbj-ls `getAllClassNames` endpoint,
     * at most once, and reports whether a complete index is available. Servers that predate the
     * endpoint answer with a MethodNotFound error, which is latched so callers transparently fall
     * back to the on-demand probe/index (issue #447). Transient connection errors are NOT latched,
     * so a later call can still succeed once interop is reachable.
     */
    public async ensureCompleteClassIndex(token?: CancellationToken): Promise<boolean> {
        if (this.completeIndexResolved) {
            this.probeIfDue();
            return this.completeClassIndex !== null;
        }
        try {
            const connection = await this.connect();
            const fqns = await connection.sendRequest(getAllClassNamesRequest, {}, token);
            this.buildCompleteClassIndex(fqns);
            logger.info(() => `Loaded complete Java class index (${this.completeClassIndex!.size} distinct simple names)`);
            return true;
        } catch (e) {
            if ((e as { code?: number } | undefined)?.code === METHOD_NOT_FOUND) {
                // Server predates the augmented endpoint — stop probing and use the fallback path.
                this.completeIndexResolved = true;
                logger.debug('Interop service has no getAllClassNames; using on-demand class suggestions.');
            } else {
                logger.debug(() => 'getAllClassNames failed (will retry): ' + (e instanceof Error ? e.message : String(e)));
            }
            return false;
        }
    }

    /** True once a complete class index has been built (i.e. the augmented endpoint is available). */
    public hasCompleteClassIndex(): boolean {
        return this.completeClassIndex !== null;
    }

    /** Drops the complete class index so it is rebuilt on the next request (e.g. after a classpath change). */
    protected clearCompleteClassIndex(): void {
        this.completeClassIndex = null;
        this.completeIndexResolved = false;
    }

    /**
     * Builds {@link completeClassIndex} from a list of fully-qualified class names, indexing each by
     * its lowercased simple name. Inner classes and packageless names are skipped. Marks the index
     * as resolved. Shared by the live `getAllClassNames` path and test seeding.
     */
    protected buildCompleteClassIndex(fqns: string[]): void {
        const index = new Map<string, string[]>();
        for (const fqn of fqns) {
            const simple = fqn.substring(fqn.lastIndexOf('.') + 1);
            if (!simple || simple.includes('$') || !fqn.includes('.')) {
                continue;
            }
            const key = simple.toLowerCase();
            let bucket = index.get(key);
            if (!bucket) {
                index.set(key, bucket = []);
            }
            bucket.push(fqn);
        }
        this.completeClassIndex = index;
        this.completeIndexResolved = true;
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
            return [...(this.completeClassIndex!.get(simpleName.toLowerCase()) ?? [])].sort();
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
            for (const [key, fqns] of this.completeClassIndex!) {
                if (key.startsWith(lower)) {
                    fqns.forEach(fqn => matches.add(fqn));
                    if (matches.size >= limit * 2) break;
                }
            }
        } else {
            for (const javaClass of this.resolvedClasses.values()) {
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
        const lockToken = depth === 0 ? {} : (this.currentLockToken ?? {});
        const release = await this.acquireLock(lockToken);
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
        }
        for (const constructor of javaClass.constructors) {
            (constructor as Mutable<JavaMethod>).$type = JavaMethod.$type;
            constructor.isStatic = false;
            constructor.deprecated = (constructor as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
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
                for (const method of javaClass.methods) {
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
                        if (methodDoc) {
                            parameter.realName = methodDoc.params[index]?.name
                        }
                    }
                    if (methodDoc?.docu) {
                        const doc = methodDoc;
                        // Build signature: "ReturnType ClassName.methodName(Type paramName, ...)"
                        const params = method.parameters.map((p, idx) => {
                            const realName = doc.params[idx]?.name ?? p.name;
                            return `${javaTypeAdjust(p.type)} ${realName}`;
                        }).join(', ');
                        const ownerName = javaClass.name.split('.').pop() ?? javaClass.name;
                        const signature = `${javaTypeAdjust(method.returnType)} ${ownerName}.${method.name}(${params})`;
                        (method as Mutable<JavaMethod>).docu = {
                            $type: 'DocumentationInfo',
                            $container: method,
                            javadoc: tryParseJavaDoc(doc.docu!),
                            signature: signature
                        } as DocumentationInfo;
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
        const children = this.childrenOfByName.get(javaPackageLike ?? this.classpath);
        if (!children) {
            return [];
        }
        return [...children.values()];
    }

    /**
     * Retrieves a specific child package or class by name from a parent container.
     * @param javaPackageLike the parent container (defaults to classpath root)
     * @param childName the name of the child to retrieve
     * @returns the matching JavaClass or JavaPackage, or undefined if not found
     */
    getChildOf(javaPackageLike: JavaClass | JavaPackage | Classpath = this.classpath, childName: string): JavaClass | JavaPackage | undefined {
        return this.childrenOfByName.get(javaPackageLike)?.get(childName);
    }

    /**
     * Stores a Java class in the AST hierarchy, creating intermediate packages as needed.
     * This method builds the complete package structure and links the class to its parent container.
     * @param javaClass the Java class to store in the hierarchy
     * @param packageName the fully qualified package name (e.g., "java.lang")
     */
    storeJavaClass(javaClass: Mutable<JavaClass>, packageName: string): void {

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

        const classpath = this.classpath;
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
            }
            parent = children.get(part)!;
        });
    }

    /**
     * Clears all cached Java class data, disconnects the current connection,
     * and resets the classpath document. Call this before reloading classpath.
     */
    public clearCache(): void {
        // Clear resolved classes cache
        this._resolvedClasses.clear();

        // Clear in-flight resolution promises
        this._pendingResolutions.clear();

        // Clear the in-flight Phase-2 registry (#497) so a class from a cleared classpath is
        // never put back into the LRU by a Phase 2 that settles after this reset.
        this._inFlightPhase2.clear();

        // Clear children-of-by-name map
        this.childrenOfByName.clear();

        // Clear java.lang.Object cache
        this.JAVA_LANG_OBJECT = undefined;

        // Clear the complete class index so it is rebuilt against the new classpath instead of
        // continuing to answer auto-import suggestions with stale FQNs (P61-D2-004)
        this.clearCompleteClassIndex();

        // Reset lock state
        this.lockQueue = [];
        this.lockHeld = false;
        this.currentLockToken = null;

        // Reset the circuit breaker so the next lookup attempts a socket immediately, and bump
        // the generation so a connect attempt started before this reset cannot report its
        // outcome (#504).
        this.breakerGeneration++;
        // A cleared cache forces the next connect() to open a fresh socket (see the dispose()
        // call below), so the connection generation is bumped here too — otherwise a latch
        // already sitting at "off" would suppress every request forever, since nothing would
        // ever call connect() again to reach the establishConnection() bump.
        this._connectionGeneration++;
        this.breakerState = 'closed';
        this.breakerProbeDueAt = 0;
        this.breakerCooldownMs = INTEROP_BREAKER_INITIAL_COOLDOWN_MS;

        // Clear implicit-import bookkeeping so a later loadImplicitImports() rebuilds it from scratch.
        this.implicitImportCopies.clear();

        // Reset classpath document arrays
        this.classpath.packages = [];
        this.classpath.classes = [];

        // Disconnect existing connection so a fresh one is created
        if (this.connection) {
            this.connection.dispose();
            this.connection = undefined;
        }

        // Disconnect the dedicated parser connection too, and forget any prior open failure so
        // the next parse attempts it again.
        this.disposeParseLane();
        this.parseLaneRetiredGeneration = -1;

        logger.info('Java interop cache cleared');
    }

    /**
     * Acquires the resolution lock. Uses a queue-based async mutex that supports
     * re-entrant acquisition: if the current async context already holds the lock
     * (tracked via lockToken), the call returns immediately without deadlocking.
     * @returns a release function that MUST be called when the critical section is done
     */
    private acquireLock(lockToken: object): Promise<() => void> {
        // Re-entrant: if this token already owns the lock, return a no-op release
        if (this.lockHeld && this.currentLockToken === lockToken) {
            return Promise.resolve(() => { /* re-entrant, no-op release */ });
        }

        if (!this.lockHeld) {
            this.lockHeld = true;
            this.currentLockToken = lockToken;
            return Promise.resolve(() => {
                this.drainLockQueue();
            });
        }

        return new Promise<() => void>((resolve) => {
            this.lockQueue.push(() => {
                this.currentLockToken = lockToken;
                resolve(() => {
                    this.drainLockQueue();
                });
            });
        });
    }

    private drainLockQueue(): void {
        if (this.lockQueue.length > 0) {
            const next = this.lockQueue.shift()!;
            next();
        } else {
            this.lockHeld = false;
            this.currentLockToken = null;
        }
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

/**
 * Request type for loading classpath entries into the Java backend service.
 */
const loadClasspathRequest = new RequestType<ClassPathInfoParams, boolean, null>('loadClasspath');

/**
 * Request type for retrieving information about a single Java class.
 */
const getClassInfoRequest = new RequestType<ClassInfoParams, JavaClass, null>('getClassInfo');

/**
 * Request type for retrieving information about all classes in a package.
 */
const getClassInfosRequest = new RequestType<PackageInfoParams, JavaClass[], null>('getClassInfos');

/**
 * Request type for retrieving all top-level packages available in the classpath.
 */
const getTopLevelPackages = new RequestType<null, PackageInfoParams[], null>('getTopLevelPackages');

/**
 * Request type for retrieving every fully-qualified class name known to the interop service
 * (classpath jars plus JDK modules). Provided only by an augmented bbj-ls; older servers answer
 * with a MethodNotFound error, which callers use to fall back to on-demand class suggestions.
 */
const getAllClassNamesRequest = new RequestType<null, string[], null>('getAllClassNames');

/**
 * Request type for parsing a document's current (possibly unsaved) text through BBj's own
 * parser. Provided only by an augmented bbj-ls (BBj 26.03+); older servers answer with a
 * MethodNotFound error, which {@link BBjParserService} uses to latch live diagnostics off.
 */
const parseProgramRequest = new RequestType<ParseProgramParams, ParseProgramResult, null>('parseProgram');

/** JSON-RPC error code returned by a server that does not implement a requested method. */
export const METHOD_NOT_FOUND = -32601;

/**
 * Parameters for class information requests.
 */
interface ClassInfoParams {
    className: string
}

/**
 * Parameters for the `parseProgram` request — the wire contract fixed by
 * `101-MR-DESCRIPTION.md`. Field names and types are not renamed, added to or omitted here.
 */
export interface ParseProgramParams {
    /** The full current text of the active document, including unsaved edits. */
    text: string;
    /** The document's path as the language server knows it. */
    canonicalName: string;
    /** Opaque to the server and echoed back unchanged. */
    version: string;
    /** The PREFIX directories referenced programs should be resolved through. May be empty. */
    prefixes: string[];
    /** The workspace roots referenced programs should be resolved through. May be empty. */
    workspaceRoots: string[];
}

/** One error reported by BBj's parser through `parseProgram` — editor coordinates, one-based. */
export interface ParseError {
    /** BBj's own error-type strings for this error; one error can carry several at once. */
    categories: string[];
    /** The parser's own message, unchanged. */
    message: string;
    /** BBj's editor starting line, verbatim (one-based). */
    editorStartLine: number;
    /** BBj's editor ending line, verbatim (one-based). */
    editorEndLine: number;
    /** BBj's starting character position, verbatim (one-based). */
    startCharacter: number;
    /** BBj's ending character position, verbatim (one-based) — not always trustworthy, see the converter. */
    endCharacter: number;
}

/** Result of a `parseProgram` request. `errors` is always present — empty on a clean parse. */
export interface ParseProgramResult {
    /** The request's own `version` token, unchanged. */
    version: string;
    /** The parser's errors, in the parser's own order. */
    errors: ParseError[];
}

/**
 * Parameters for package information requests.
 */
interface PackageInfoParams {
    packageName: string
}

/**
 * Parameters for classpath loading requests.
 */
interface ClassPathInfoParams {
    classPathEntries: string[]
}
