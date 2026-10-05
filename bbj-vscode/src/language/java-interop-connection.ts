/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The Java interop connection lifecycle: the shared socket connection to the Java backend
 * service, its three-state circuit breaker, the connection generation and the recovery
 * listeners that fire once a probe succeeds after an outage. Two further connections hang off
 * it: the dedicated `parseProgram` lane, and the dedicated format and DENUM lane.
 *
 * Split out of `JavaInteropService` (#558).
 */
import { Socket } from 'net';
import {
    CancellationToken, ConnectionError, createMessageConnection, ErrorCodes, MessageConnection, RequestType,
    ResponseError, SocketMessageReader, SocketMessageWriter
} from 'vscode-jsonrpc/node.js';
import { notifyJavaConnectionError } from './bbj-notifications.js';
import { JavaClass } from './generated/ast.js';
import { DEFAULT_INTEROP_HOST, DEFAULT_INTEROP_PORT, formatInteropRejection, validateInteropConfig } from './interop-config.js';
import { formatRequestTimeoutMs, ProgramLane } from './java-interop-program-lane.js';
import {
    denumProgramRequest, formatProgramRequest,
    type DenumProgramParams, type DenumProgramResult, type FormatProgramParams, type FormatProgramResult,
    type ProgramOutcome
} from './java-interop-program-types.js';
import { validateDenumResult, validateFormatResult } from './java-program-guard.js';
import { logger } from './logger.js';

/**
 * Cooldown (ms) the breaker in {@link connect} applies after opening, before it lets a single
 * half-open probe through (#504). No issue or research note pins these numbers; one
 * connect-level failure opens the breaker, and the initial cooldown, backoff factor and cap
 * below are a discretionary starting point.
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

/** JSON-RPC error code returned by a server that does not implement a requested method. */
export const METHOD_NOT_FOUND = -32601;

/**
 * Parameters for class information requests.
 */
interface ClassInfoParams {
    className: string
}

/**
 * Request type for retrieving information about a single Java class.
 */
const getClassInfoRequest = new RequestType<ClassInfoParams, JavaClass, null>('getClassInfo');

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
 * Request type for parsing a document's current (possibly unsaved) text through BBj's own
 * parser. Provided only by an augmented bbj-ls (BBj 26.03+); older servers answer with a
 * MethodNotFound error, which the caller uses to latch live diagnostics off.
 */
const parseProgramRequest = new RequestType<ParseProgramParams, ParseProgramResult, null>('parseProgram');

/**
 * Wraps a connected socket in a JSON-RPC message connection. Extracted so a test double can
 * swap in a scriptable fake peer while the real connect()/breaker logic around it runs
 * unmodified.
 */
export function createSocketMessageConnection(socket: Socket): MessageConnection {
    return createMessageConnection(new SocketMessageReader(socket), new SocketMessageWriter(socket));
}

/**
 * The socket/wrap/connect call-time hooks {@link JavaInteropConnection} reaches back through,
 * bound by the owning `JavaInteropService` to its own (possibly subclass-overridden)
 * `createSocket`/`wrapSocket`/`connect` methods — so a hermetic test double's override still
 * takes effect and this module never bypasses it.
 */
export interface InteropConnectionHooks {
    createSocket(): Promise<Socket>;
    wrapSocket(socket: Socket): MessageConnection;
    connect(): Promise<MessageConnection>;
}

/**
 * The shared connection to the Java interop backend, its three-state circuit breaker, the
 * connection generation and the recovery listeners that fire on recovery from an outage. Owns
 * the socket lifecycle behind the `createSocket`/`wrapSocket`/`connect` hooks, so a
 * `JavaInteropService` subclass's override of any of the three still takes effect — the module
 * never bypasses them, and never calls its own {@link connect} to reach the peer.
 *
 * Split out of `JavaInteropService` (#558).
 */
export class JavaInteropConnection {

    constructor(private readonly hooks: InteropConnectionHooks) { }

    private connection?: MessageConnection;
    /**
     * In-flight `connect()` promise shared by same-tick callers (P61-D2-001): without it, two
     * concurrent callers that both observe no existing connection each open their own socket,
     * and the second silently overwrites/leaks the first.
     */
    private connectingPromise?: Promise<MessageConnection>;
    private interopHost: string = DEFAULT_INTEROP_HOST;
    private interopPort: number = DEFAULT_INTEROP_PORT;
    /** Three-state breaker guarding {@link connect} against a peer that is unreachable at the connect level (#504). */
    private breakerState: 'closed' | 'open' | 'half-open' = 'closed';
    /** `Date.now()` time at which the next lookup is let through as the single half-open probe. */
    private breakerProbeDueAt = 0;
    /** Cooldown (ms) applied the next time the breaker opens; grows on a failed probe and resets on a successful one. */
    private breakerCooldownMs = INTEROP_BREAKER_INITIAL_COOLDOWN_MS;
    /** Bumped by resetBreaker() so a connect attempt started before the reset cannot change breaker state or report recovery. */
    private breakerGeneration = 0;
    /**
     * Bumped in two places: once inside {@link establishConnection} right after a fresh shared
     * `MessageConnection` is assigned, and once inside {@link resetBreaker} beside
     * {@link breakerGeneration}. The owning `JavaInteropService` bumps it a third time, when its
     * dedicated parser connection is lost after having been open. Opening the dedicated
     * connection itself never bumps this value — the server behind it is the one the shared
     * connection already probed — but losing it does, so any per-connection latch (e.g. a probe
     * result) or stored diagnostic verdict keyed on this value resets and re-decides on the next
     * request. The format and DENUM lane never bumps it, on open, loss or disposal: it keeps its
     * own epoch, so format traffic can never reset a live-parse verdict.
     */
    public generation = 0;
    /** Fired once per half-open-to-closed transition, scheduled with Promise.resolve().then(...) — connect() never awaits them. */
    private readonly recoveryListeners: Array<() => void | Promise<void>> = [];

    /**
     * The dedicated connection `parseProgram` requests travel over, kept separate from the
     * shared connection so class-lookup traffic during a large workspace's initial build never
     * delays a live parse (issue #692). Built through the {@link InteropConnectionHooks.createSocket}/
     * {@link InteropConnectionHooks.wrapSocket} hooks, so it reads the same host/port the shared
     * connection does. Opened lazily on the first parse for a given {@link generation}; retired
     * and reopened whenever the generation moves on.
     */
    private parseLane?: MessageConnection;
    /** The {@link generation} {@link parseLane} was opened for. */
    private parseLaneGeneration = -1;
    /** In-flight open shared by same-tick callers, mirroring the shared connection's own in-flight-connect handling. */
    private parseLaneConnecting?: Promise<MessageConnection | undefined>;
    /**
     * The generation in which opening {@link parseLane} failed, or a `MethodNotFound` answer
     * closed it (an older server). No further open attempt is made until {@link generation}
     * moves past this value.
     */
    private parseLaneRetiredGeneration = -1;

    /**
     * The third connection, used only by `formatProgram` and `denumProgram`. The hooks are arrow
     * closures so they are read only when the lane calls them; the lane gets the socket hooks and a
     * read-only view of {@link generation}, and nothing that could reach the breaker.
     */
    private readonly programLane = new ProgramLane({
        createSocket: () => this.hooks.createSocket(),
        wrapSocket: (socket) => this.hooks.wrapSocket(socket),
        sharedGeneration: () => this.generation
    });

    /**
     * Establishes connection to the Java backend service. Concurrent same-tick callers share the
     * single in-flight {@link connectingPromise} instead of each opening their own socket
     * (P61-D2-001).
     */
    public async connect(): Promise<MessageConnection> {
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
     * matches the current one — resetBreaker() bumped it, so this attempt started before the
     * reset and must not change breaker state or report recovery.
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
     * after an outage. Never fired by resetBreaker().
     */
    public onConnectionRecovered(listener: () => void | Promise<void>): void {
        this.recoveryListeners.push(listener);
    }

    /**
     * Starts the single half-open probe, without awaiting it, when the breaker is open and its
     * cooldown has elapsed. Used by callers that can answer from a local index and would
     * otherwise never touch connect() again after an outage — a caret-driven lookup can then
     * bring recovery with no edit. The outcome is handled entirely by onConnectAttemptSettled.
     * Goes through the hooks' connect (never this module's own {@link connect} directly), so a
     * subclass override of the owning service's `connect()` still takes effect.
     */
    public probeIfDue(): void {
        if (this.breakerState === 'open' && Date.now() >= this.breakerProbeDueAt) {
            this.hooks.connect().catch(() => { /* handled by onConnectAttemptSettled */ });
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
            socket = await this.hooks.createSocket();
        } catch (e) {
            console.error('Failed to connect to the Java service.', e);
            throw e;
        }
        const connection = this.hooks.wrapSocket(socket);
        // Guard on identity: an old connection's close/error can be delivered after a newer
        // connect() already installed a healthy replacement, and an unguarded clear would drop
        // that live reference and force a spurious reconnect (P67-WR-02).
        connection.onClose(() => { if (this.connection === connection) this.connection = undefined; });
        connection.onError(() => { if (this.connection === connection) this.connection = undefined; });
        connection.listen();
        this.connection = connection;
        this.generation++;
        return connection;
    }

    /**
     * Sets the connection configuration for the Java interop service.
     * Call resetBreaker()/disconnect() separately to reconnect with new settings.
     *
     * Any value is accepted: `host`/`port` are validated through {@link validateInteropConfig}
     * itself, so no caller can bypass validation. An invalid or absent value falls back per
     * field to the shared defaults; an invalid (present but rejected) value additionally logs
     * one warning naming the setting and the rejected value.
     * @param host hostname or IP address of the Java interop service
     * @param port port number of the Java interop service
     */
    public setConnectionConfig(host: unknown, port: unknown): void {
        const validated = validateInteropConfig(host, port);
        for (const rejection of validated.rejected) {
            logger.warn(formatInteropRejection(rejection));
        }
        this.interopHost = validated.host;
        this.interopPort = validated.port;
        logger.debug(`Java interop connection config: ${this.interopHost}:${this.interopPort}`);
    }

    /** Returns a fresh snapshot of the currently configured interop host/port. */
    public getConnectionConfig(): { host: string; port: number } {
        return { host: this.interopHost, port: this.interopPort };
    }

    /**
     * Creates a socket connection to the Java service
     */
    public openSocket(): Promise<Socket> {
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

    /**
     * Retrieves raw class information from the Java backend service. Goes through the hooks'
     * connect (never this module's own {@link connect} directly), so a subclass override of the
     * owning service's `connect()` still takes effect.
     * @param className fully qualified name of the class to retrieve
     * @param token cancellation token for request cancellation
     */
    public async requestClassInfo(className: string, token?: CancellationToken): Promise<JavaClass> {
        const connection = await this.hooks.connect();
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
     * Resets the circuit breaker so the next lookup attempts a socket immediately, and bumps
     * the generation so a connect attempt started before this reset cannot report its
     * outcome (#504).
     */
    public resetBreaker(): void {
        this.breakerGeneration++;
        // A cleared cache forces the next connect() to open a fresh socket (see disconnect()
        // below), so the connection generation is bumped here too — otherwise a latch already
        // sitting at "off" would suppress every request forever, since nothing would ever call
        // connect() again to reach the establishConnection() bump.
        this.generation++;
        this.breakerState = 'closed';
        this.breakerProbeDueAt = 0;
        this.breakerCooldownMs = INTEROP_BREAKER_INITIAL_COOLDOWN_MS;
    }

    /** Disconnects the existing shared connection, if any, so a fresh one is created on the next connect(). */
    public disconnect(): void {
        if (this.connection) {
            this.connection.dispose();
            this.connection = undefined;
        }
        // Disconnect the dedicated parser connection too, and forget any prior open failure so
        // the next parse attempts it again.
        this.disposeParseLane();
        this.parseLaneRetiredGeneration = -1;
        // And the format and DENUM connection, which also forgets its own open cool-down.
        this.programLane.dispose();
    }

    /**
     * Formats `params.text` (the whole document, or `params.range`) through the peer's
     * `formatProgram` endpoint. Travels over the dedicated format and DENUM connection, never the
     * shared connection or the parse lane, and never touches the circuit breaker. Never throws:
     * every failure, including an unreachable peer, is a typed outcome, and a peer answer is only
     * ever returned after it passed validation against `params`.
     * @param params the format request — the live document text, not a file path
     * @param token cancellation token forwarded to the request
     */
    public formatProgram(params: FormatProgramParams, token?: CancellationToken): Promise<ProgramOutcome<FormatProgramResult>> {
        return this.programLane.request(formatProgramRequest, params, (raw) => validateFormatResult(params, raw), token, formatRequestTimeoutMs(params));
    }

    /**
     * Removes line numbers from `params.text` through the peer's `denumProgram` endpoint. Travels
     * over the same dedicated connection as {@link formatProgram}, and like it never throws and
     * never touches the circuit breaker. The caller passes the live editor text — the client never
     * reads a file.
     * @param params the DENUM request
     * @param token cancellation token forwarded to the request
     */
    public denumProgram(params: DenumProgramParams, token?: CancellationToken): Promise<ProgramOutcome<DenumProgramResult>> {
        return this.programLane.request(denumProgramRequest, params, (raw) => validateDenumResult(params, raw), token);
    }

    /**
     * Parses `params.text` through the interop service's `parseProgram` endpoint and returns its
     * result. The request tries its own dedicated connection first — opened lazily by
     * {@link parseLaneConnection} — independent of the shared connection's state and its circuit
     * breaker: a shared connection that is down, half-open, or still busy with a burst of
     * `getClassInfo` traffic never delays or short-circuits a parse. The shared connection (via
     * the {@link InteropConnectionHooks.connect} hook, with its own breaker and reconnect logic)
     * is used only when the dedicated one cannot be opened or was retired for the current
     * generation. One side effect of trying the dedicated connection first: a parse that runs
     * before any shared connection exists opens the lane under the current generation, and the
     * shared connection's own later first connect bumps the generation — which retires that
     * lane, so the next parse re-opens it and re-probes the endpoint (the same "a reset of
     * either connection clears verdict state" rule this generation already follows).
     * Deliberately NOT routed through the front's own request-with-fallback helper: a caller
     * here must be able to tell a `MethodNotFound` error (older server, no endpoint), an
     * application error (`-3300x`) and a cancellation (`RequestCancelled`, a superseded request)
     * apart, which a collapsed fallback value would destroy.
     * @param params the parse request — the document's current text plus its resolution context
     * @param token cancellation token for request cancellation
     */
    public async parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
        const lane = await this.parseLaneConnection();
        if (!lane) {
            const shared = await this.hooks.connect();
            return shared.sendRequest(parseProgramRequest, params, token);
        }
        try {
            return await lane.sendRequest(parseProgramRequest, params, token);
        } catch (e) {
            if ((e as { code?: number } | undefined)?.code === METHOD_NOT_FOUND) {
                // An older server behind the dedicated connection: close it for the rest of this
                // generation so no idle second socket lingers, and let every further parse in
                // this generation go over the shared connection instead.
                this.parseLaneRetiredGeneration = this.generation;
                this.disposeParseLane();
            }
            throw e;
        }
    }

    /**
     * Returns the dedicated `parseProgram` connection for the current connection generation,
     * opening it lazily on first use and reusing it for the rest of the generation. Same-tick
     * callers share the single in-flight {@link parseLaneConnecting} promise, mirroring
     * {@link connect}'s handling of {@link connectingPromise}. Returns `undefined` — never
     * throws — when the dedicated connection could not be opened or was retired for this
     * generation; the caller falls back to the shared connection.
     */
    private async parseLaneConnection(): Promise<MessageConnection | undefined> {
        const generation = this.generation;
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
     * {@link onParseLaneLost}. Never touches the breaker state, never raises the connection
     * error notification and never bumps {@link generation} — the server behind it is the one
     * the shared connection already probed. If {@link generation} moved on while opening, the
     * new connection is disposed and `undefined` is returned instead of being stored for a
     * generation that is no longer current. If the socket itself cannot be opened, retires
     * `generation` (so no further attempt is made until it moves on) and returns `undefined`
     * after logging one warn line — see the catch block below.
     */
    private async openParseLane(generation: number): Promise<MessageConnection | undefined> {
        let socket: Socket;
        try {
            socket = await this.hooks.createSocket();
        } catch (e) {
            // The dedicated connection could not be opened, but the shared one keeps working:
            // fall back silently, logged once per generation, never as a parse failure and
            // never touching the breaker, a dialog or the endpoint probe latch.
            this.parseLaneRetiredGeneration = generation;
            const message = e instanceof Error ? e.message : String(e);
            logger.warn(`Live compiler diagnostics: could not open a dedicated parser connection (${message}); using the shared interop connection`);
            return undefined;
        }
        const lane = this.hooks.wrapSocket(socket);
        lane.onClose(() => this.onParseLaneLost(lane));
        lane.onError(() => this.onParseLaneLost(lane));
        lane.listen();
        if (this.generation !== generation) {
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
     * already-replaced lane cannot clear a newer one, and so a connection this module disposed
     * of itself (its field already cleared first by {@link disposeParseLane}) never reaches this
     * far. A genuine loss — the dedicated connection dropping after having been open — bumps
     * {@link generation} once, so every per-connection latch and stored diagnostic verdict
     * resets and re-decides on the next request, while the shared connection stays in use with
     * no new socket.
     */
    private onParseLaneLost(lane: MessageConnection): void {
        if (this.parseLane !== lane) {
            return;
        }
        this.parseLane = undefined;
        this.generation++;
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
}
