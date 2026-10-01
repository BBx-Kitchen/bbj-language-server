/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The dedicated connection format and DENUM requests travel over, separate from the shared
 * connection (class lookups) and the parse lane (live diagnostics). bbj-ls gives each TCP
 * connection its own parser and format workers, so a format or DENUM request never queues behind
 * a live parse, and class traffic never delays it (the issue #692 precedent). The lane keeps its
 * own lane epoch and never touches the shared connection generation, the circuit breaker or the
 * connection-error popup: it is handed only the socket hooks and a read-only view of the shared
 * generation, and it never imports the notifications or connection modules.
 */
import type { Socket } from 'net';
import { CancellationTokenSource, type CancellationToken, type Disposable, type MessageConnection, type RequestType } from 'vscode-jsonrpc/node.js';
import { classifyInteropError, FailureLogCadence, type ClassifiedInteropError } from './java-interop-errors.js';
import type { FormatProgramParams, ProgramMethod, ProgramOutcome } from './java-interop-program-types.js';
import { MAX_PEER_ERROR_LENGTH } from './java-peer-guard.js';
import { sanitizePeerText, type ProgramGuardResult } from './java-program-guard.js';
import { logger } from './logger.js';

/**
 * How long (ms) after a failed open of the dedicated connection no further open is attempted.
 * Discretionary; the same value as the circuit breaker's initial cool-down, so a burst of requests
 * during an outage never hammers the peer.
 */
export const PROGRAM_LANE_REOPEN_COOLDOWN_MS = 5_000;

/**
 * The client's own deadline for one whole-document format, range format or DENUM request, in
 * milliseconds. It sits above the peer's own 10 s format and parse timeouts, so it only ever fires
 * for a peer that has stopped answering at all. On expiry the request is cancelled on the wire and
 * the call settles as a client timeout.
 */
export const PROGRAM_REQUEST_TIMEOUT_MS = 15_000;

/**
 * The client's deadline for a format request that may denumber the program first, in milliseconds.
 * The peer runs a DENUM step and then a format step for such a request, each bounded by its own
 * 10 s timeout, so a slow but healthy answer can legitimately take about 20 s. This leaves slack
 * above that and still fires only for a peer that has stopped answering.
 */
export const PROGRAM_DENUM_FORMAT_REQUEST_TIMEOUT_MS = 25_000;

/** The deadline for one format request: the longer one when it allows denumbering, else the default. */
export function formatRequestTimeoutMs(params: FormatProgramParams): number {
    return params.allowDenum === true ? PROGRAM_DENUM_FORMAT_REQUEST_TIMEOUT_MS : PROGRAM_REQUEST_TIMEOUT_MS;
}

/** The marker {@link ProgramLane.raceCancellation} resolves with when the caller cancelled first. */
const CANCELLED = Symbol('cancelled');

/** How one request ended before its answer is judged. */
type Exchange =
    | { kind: 'answer'; raw: unknown }
    | { kind: 'rejected'; error: unknown }
    | { kind: 'timeout' }
    | { kind: 'cancelled' };

/**
 * The only things the lane may call back into: opening and wrapping a socket (bound by the owning
 * service to its own, possibly overridden, methods) and a read-only view of the shared connection
 * generation. There is deliberately no hook that connects the shared connection.
 */
export interface ProgramLaneHooks {
    createSocket(): Promise<Socket>;
    wrapSocket(socket: Socket): MessageConnection;
    /** Read-only view of the shared connection's generation; the lane never changes it. */
    sharedGeneration(): number;
}

/**
 * Turns a failed request into its typed outcome. An application error is never rethrown: every
 * rejection becomes an outcome, and every peer string in it is stripped of control characters and
 * bounded before it leaves the client.
 */
export function programOutcomeForError(error: unknown): ProgramOutcome<never> {
    return outcomeForClassifiedError(classifyInteropError(error));
}

/** The outcome for an error that has already been classified, so one classification serves the outcome and the log line. */
function outcomeForClassifiedError(classified: ClassifiedInteropError): ProgramOutcome<never> {
    const kind = classified.kind;
    switch (kind) {
        case 'cancelled':
            return { kind: 'cancelled' };
        case 'method-not-found':
            return { kind: 'unavailable', reason: 'method-not-found' };
        case 'timeout':
            return { kind: 'timeout', origin: 'peer' };
        case 'invalid-settings': {
            const data = classified.data;
            const problems = data?.kind === 'invalid-settings' ? data.problems : [];
            return {
                kind: 'invalid-settings',
                problems: problems.map(problem => ({
                    setting: sanitizePeerText(problem.setting, MAX_PEER_ERROR_LENGTH),
                    message: sanitizePeerText(problem.message, MAX_PEER_ERROR_LENGTH)
                }))
            };
        }
        case 'mixed-numbering': {
            const data = classified.data;
            return { kind: 'mixed-numbering', line: data?.kind === 'mixed-numbering' ? data.line : undefined };
        }
        case 'parser-exception':
        case 'size-cap':
        case 'service-unavailable':
        case 'protected-program':
        case 'denum-needed':
        case 'format-failed':
        case 'invalid-params':
        case 'transport':
            return {
                kind: 'failed',
                failure: kind,
                code: classified.code,
                message: sanitizePeerText(classified.message, MAX_PEER_ERROR_LENGTH)
            };
        default: {
            const unreachable: never = kind;
            return { kind: 'failed', failure: 'transport', code: classified.code, message: String(unreachable) };
        }
    }
}

/** Turns a wire answer into `ok` when it passes `validate`, or `malformed-result` with the guard's reason. */
export function programOutcomeForResult<R>(raw: unknown, validate: (raw: unknown) => ProgramGuardResult<R>): ProgramOutcome<R> {
    const validated = validate(raw);
    return validated.ok
        ? { kind: 'ok', result: validated.value }
        : { kind: 'malformed-result', reason: validated.reason };
}

/** What is known about one method on the current connection. */
type MethodAvailability = 'unknown' | 'available' | 'unavailable';

/**
 * What an outcome proves about the method that produced it. An answer that shows the method exists
 * (a result, a malformed result, any peer application error, a peer timeout) makes it available.
 * Only an unsupported-method answer makes it unavailable. A cancellation, a client deadline, a
 * transport failure and an unreachable connection prove nothing and leave the state alone.
 */
function availabilityProvedBy(outcome: ProgramOutcome<unknown>): 'available' | 'unavailable' | undefined {
    switch (outcome.kind) {
        case 'ok':
        case 'malformed-result':
        case 'invalid-settings':
        case 'mixed-numbering':
            return 'available';
        case 'timeout':
            return outcome.origin === 'peer' ? 'available' : undefined;
        case 'failed':
            return outcome.failure === 'transport' ? undefined : 'available';
        case 'unavailable':
            return outcome.reason === 'method-not-found' ? 'unavailable' : undefined;
        case 'cancelled':
            return undefined;
    }
}

/**
 * The third connection to the interop peer, used only by format and DENUM requests. Opened lazily
 * on the first request; same-tick callers share one open. Losing or disposing it moves only its own
 * epoch.
 */
export class ProgramLane {

    private lane?: MessageConnection;
    private connecting?: Promise<MessageConnection | undefined>;
    /** Bumped when the open connection is lost and on dispose; never related to the shared generation. */
    private laneEpoch = 0;
    /** `Date.now()` time before which no open is attempted, set by a failed open and lifted by {@link dispose}. */
    private reopenNotBefore = 0;
    private readonly failureLog = new FailureLogCadence();
    /** What each method's answers have shown so far, valid only for the key it was recorded under. */
    private readonly latches = new Map<ProgramMethod, { key: string; state: 'available' | 'unavailable' }>();

    constructor(private readonly hooks: ProgramLaneHooks) { }

    /**
     * Sends one request over the dedicated connection and resolves with its typed outcome. Never
     * rejects. With no connection to send on the outcome is `unavailable` / `not-reachable`: there
     * is no fallback to any other connection. A method the peer has answered as unsupported on the
     * current connection answers `unavailable` / `method-not-found` at once, with no socket and no
     * request.
     * @param type the request type (its result is unknown until `validate` has run)
     * @param params the request parameters
     * @param validate checks the raw answer against the request that was sent
     * @param token forwarded to the request so a cancellation reaches the peer
     * @param timeoutMs the client deadline for this request; defaults to {@link PROGRAM_REQUEST_TIMEOUT_MS}
     */
    public async request<P, R>(
        type: RequestType<P, unknown, null>,
        params: P,
        validate: (raw: unknown) => ProgramGuardResult<R>,
        token?: CancellationToken,
        timeoutMs: number = PROGRAM_REQUEST_TIMEOUT_MS
    ): Promise<ProgramOutcome<R>> {
        const method = type.method as ProgramMethod;
        if (token?.isCancellationRequested) {
            return { kind: 'cancelled' };
        }
        if (this.availability(method) === 'unavailable') {
            return { kind: 'unavailable', reason: 'method-not-found' };
        }
        let key: string | undefined;
        let outcome: ProgramOutcome<R>;
        // What a log line says about a failure: the guard's fixed refusal token for a malformed
        // answer, or the bounded peer message for a classified error. Never the request.
        let detail = '';
        try {
            // A cancellation during a slow open settles at once. The open itself carries on and,
            // when it succeeds, the connection is kept for later requests: other callers may be
            // sharing the same open.
            const lane = await this.raceCancellation(this.laneConnection(), token);
            if (lane === CANCELLED) {
                return { kind: 'cancelled' };
            }
            if (!lane) {
                return { kind: 'unavailable', reason: 'not-reachable' };
            }
            if (token?.isCancellationRequested) {
                return { kind: 'cancelled' };
            }
            // The key the request goes out under: an answer from a connection that has since been
            // replaced must not decide anything about the new one.
            key = this.currentKey();
            // An unsupported-method answer deliberately leaves the lane open: the other method
            // may still be served on it.
            const exchange = await this.exchange(lane, type, params, token, timeoutMs);
            switch (exchange.kind) {
                case 'cancelled':
                    return { kind: 'cancelled' };
                case 'timeout':
                    outcome = { kind: 'timeout', origin: 'client' };
                    detail = `no answer within ${timeoutMs / 1000} s`;
                    break;
                case 'answer':
                    outcome = programOutcomeForResult(exchange.raw, validate);
                    if (outcome.kind === 'malformed-result') {
                        detail = outcome.reason;
                    }
                    break;
                case 'rejected': {
                    const classified = classifyInteropError(exchange.error);
                    outcome = outcomeForClassifiedError(classified);
                    detail = sanitizePeerText(classified.message, MAX_PEER_ERROR_LENGTH);
                    break;
                }
            }
        } catch (e) {
            const classified = classifyInteropError(e);
            outcome = outcomeForClassifiedError(classified);
            detail = sanitizePeerText(classified.message, MAX_PEER_ERROR_LENGTH);
        }
        if (key !== undefined) {
            this.recordAvailability(method, key, outcome);
            this.logFailure(method, key, outcome, detail);
        }
        return outcome;
    }

    /**
     * Resolves with the result of `work`, or with {@link CANCELLED} as soon as `token` is
     * cancelled, whichever comes first. `work` is never aborted: it keeps running, and its late
     * result or failure is simply dropped.
     */
    private async raceCancellation<T>(work: Promise<T>, token?: CancellationToken): Promise<T | typeof CANCELLED> {
        if (!token) {
            return work;
        }
        // If the caller wins, a later failure of the abandoned open must not be unhandled.
        work.catch(() => { /* the open's own failure is handled by whoever still awaits it */ });
        let listener: Disposable | undefined;
        try {
            const cancelled = new Promise<typeof CANCELLED>(resolve => {
                listener = token.onCancellationRequested(() => resolve(CANCELLED));
            });
            return await Promise.race([work, cancelled]);
        } finally {
            listener?.dispose();
        }
    }

    /**
     * One request on `lane`, settled without waiting for the peer. The request goes out under a
     * source of its own, linked to the caller's token, so a cancellation — the caller's or the
     * deadline's — always reaches the peer as a cancel notification. In vscode-jsonrpc a cancelled
     * request's promise stays pending until the peer answers, so the outcome is decided here by a
     * race against the deadline and the caller instead of by awaiting the peer, and the abandoned
     * promise gets a no-op handler so a late rejection is never unhandled.
     */
    private async exchange<P>(
        lane: MessageConnection,
        type: RequestType<P, unknown, null>,
        params: P,
        caller: CancellationToken | undefined,
        timeoutMs: number
    ): Promise<Exchange> {
        const source = new CancellationTokenSource();
        let timedOut = false;
        let callerCancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let callerListener: Disposable | undefined;
        try {
            const gate = new Promise<'timeout' | 'caller'>(resolve => {
                timer = setTimeout(() => {
                    timedOut = true;
                    source.cancel();
                    resolve('timeout');
                }, timeoutMs);
                callerListener = caller?.onCancellationRequested(() => {
                    callerCancelled = true;
                    source.cancel();
                    resolve('caller');
                });
            });
            const wire = lane.sendRequest(type, params, source.token);
            wire.catch(() => { /* a late cancellation or dropped-connection rejection after the outcome settled */ });
            const winner = await Promise.race([wire.then(raw => ({ raw })), gate]);
            if (winner === 'timeout') {
                return { kind: 'timeout' };
            }
            if (winner === 'caller') {
                return { kind: 'cancelled' };
            }
            return { kind: 'answer', raw: winner.raw };
        } catch (error) {
            // Our own cancellation can come back as the peer's cancelled answer: it must not read
            // as anything but what caused it.
            if (timedOut) {
                return { kind: 'timeout' };
            }
            if (callerCancelled) {
                return { kind: 'cancelled' };
            }
            return { kind: 'rejected', error };
        } finally {
            if (timer !== undefined) {
                clearTimeout(timer);
            }
            callerListener?.dispose();
            source.dispose();
        }
    }

    /**
     * Logs a failed request through the lane's cadence: the first failure of a kind on a connection
     * is a warning, repeats are debug lines. A cancellation is not a failure, and an unsupported
     * method is logged once when it is latched, so neither goes through here.
     */
    private logFailure(method: ProgramMethod, key: string, outcome: ProgramOutcome<unknown>, detail: string): void {
        let kind: string;
        switch (outcome.kind) {
            case 'ok':
            case 'cancelled':
            case 'unavailable':
                return;
            case 'failed':
                kind = outcome.failure;
                break;
            default:
                kind = outcome.kind;
        }
        this.failureLog.syncGeneration(key);
        this.failureLog.report(kind, `Format/DENUM interop: ${method} failed (${kind}): ${detail}`);
    }

    /** What is known about `method` for the current shared generation and lane epoch. */
    private availability(method: ProgramMethod): MethodAvailability {
        const latch = this.latches.get(method);
        return latch !== undefined && latch.key === this.currentKey() ? latch.state : 'unknown';
    }

    /**
     * Records what `outcome` proves about `method`, but only while `key` — the key the request was
     * sent under — is still the current one.
     */
    private recordAvailability(method: ProgramMethod, key: string, outcome: ProgramOutcome<unknown>): void {
        const proved = availabilityProvedBy(outcome);
        if (proved === undefined || key !== this.currentKey()) {
            return;
        }
        const wasUnavailable = this.latches.get(method)?.key === key && this.latches.get(method)?.state === 'unavailable';
        this.latches.set(method, { key, state: proved });
        if (proved === 'unavailable' && !wasUnavailable) {
            logger.info(`Format/DENUM interop: ${method} is not available on this connection`);
        }
    }

    /**
     * Returns the open connection, opening it lazily. Same-tick callers share the single in-flight
     * open. Returns `undefined`, never throws, when the connection could not be opened.
     */
    private async laneConnection(): Promise<MessageConnection | undefined> {
        if (this.lane) {
            return this.lane;
        }
        if (this.connecting) {
            return this.connecting;
        }
        if (Date.now() < this.reopenNotBefore) {
            // A burst of requests during an outage must not hammer the peer.
            return undefined;
        }
        const attempt = this.openLane(this.laneEpoch);
        this.connecting = attempt;
        try {
            return await attempt;
        } finally {
            if (this.connecting === attempt) {
                this.connecting = undefined;
            }
        }
    }

    /**
     * Opens a fresh socket and wraps it as the dedicated connection for `epoch`. Only the socket
     * hooks are ever called; the shared connection, the breaker and the connection-error
     * notification are never reached. If the epoch moved on while opening, the new connection is
     * disposed and `undefined` is returned.
     */
    private async openLane(epoch: number): Promise<MessageConnection | undefined> {
        let socket: Socket;
        try {
            socket = await this.hooks.createSocket();
        } catch (e) {
            this.failOpen(epoch, e);
            return undefined;
        }
        let lane: MessageConnection | undefined;
        try {
            // Small sequential requests wait for the peer's delayed acknowledgement on a default
            // socket; a test double's socket is a bare object with no such method.
            if (typeof socket.setNoDelay === 'function') {
                socket.setNoDelay(true);
            }
            const wrapped = this.hooks.wrapSocket(socket);
            lane = wrapped;
            wrapped.onClose(() => this.onLaneLost(wrapped));
            wrapped.onError(() => this.onLaneLost(wrapped));
            wrapped.listen();
        } catch (e) {
            // The socket exists but could not be put to use: release it so it is not left open and
            // unreferenced, then treat the open like any other failed one.
            try {
                lane?.dispose();
            } catch {
                // Disposing is best effort; the socket is destroyed next regardless.
            }
            socket.destroy?.();
            this.failOpen(epoch, e);
            return undefined;
        }
        if (this.laneEpoch !== epoch) {
            lane.dispose();
            return undefined;
        }
        this.lane = lane;
        return lane;
    }

    /**
     * The connection could not be opened: starts the cool-down and logs one line carrying only the
     * socket error. Nothing latches for the generation — the next request after the cool-down tries
     * again — and the breaker, the shared connection and the error dialog are never touched.
     */
    private failOpen(epoch: number, e: unknown): void {
        if (this.laneEpoch === epoch) {
            // Not when a disposal overtook this open: it lifted the cool-down on purpose.
            this.reopenNotBefore = Date.now() + PROGRAM_LANE_REOPEN_COOLDOWN_MS;
        }
        const detail = sanitizePeerText(e instanceof Error ? e.message : String(e), MAX_PEER_ERROR_LENGTH);
        this.failureLog.syncGeneration(this.currentKey());
        this.failureLog.report('not-reachable', `Format/DENUM interop: could not open a dedicated connection (${detail})`);
    }

    /** The shared generation and the lane epoch together: any change of either re-arms the failure log. */
    private currentKey(): string {
        return `${this.hooks.sharedGeneration()}.${this.laneEpoch}`;
    }

    /**
     * Clears the connection once it is lost, guarded on identity so a stale listener from an
     * already-replaced connection cannot clear a newer one, and moves only the lane's own epoch.
     * The shared connection generation is deliberately not touched.
     *
     * The lost connection is then disposed. A close event alone does not reject the requests still
     * pending on it, and a reader error does not even close the socket; disposing rejects them at
     * once (they settle as a transport failure) and releases the socket and the peer's workers. The
     * field is already cleared, so any close event the disposal raises is a no-op.
     */
    private onLaneLost(lane: MessageConnection): void {
        if (this.lane !== lane) {
            return;
        }
        this.lane = undefined;
        this.laneEpoch++;
        lane.dispose();
    }

    /**
     * Disposes the connection, if any, clearing the field first so its own close listener is a
     * no-op. Also forgets any open cool-down, so a cache clear or a configuration change retries at
     * once.
     */
    public dispose(): void {
        const lane = this.lane;
        this.lane = undefined;
        this.connecting = undefined;
        this.laneEpoch++;
        this.reopenNotBefore = 0;
        lane?.dispose();
    }
}
