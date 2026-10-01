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
import type { CancellationToken, MessageConnection, RequestType } from 'vscode-jsonrpc/node.js';
import { classifyInteropError, FailureLogCadence } from './java-interop-errors.js';
import type { ProgramOutcome } from './java-interop-program-types.js';
import { MAX_PEER_ERROR_LENGTH } from './java-peer-guard.js';
import { sanitizePeerText, type ProgramGuardResult } from './java-program-guard.js';

/**
 * How long (ms) after a failed open of the dedicated connection no further open is attempted.
 * Discretionary; the same value as the circuit breaker's initial cool-down, so a burst of requests
 * during an outage never hammers the peer.
 */
export const PROGRAM_LANE_REOPEN_COOLDOWN_MS = 5_000;

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
    const classified = classifyInteropError(error);
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

    constructor(private readonly hooks: ProgramLaneHooks) { }

    /**
     * Sends one request over the dedicated connection and resolves with its typed outcome. Never
     * rejects. With no connection to send on the outcome is `unavailable` / `not-reachable`: there
     * is no fallback to any other connection.
     * @param type the request type (its result is unknown until `validate` has run)
     * @param params the request parameters
     * @param validate checks the raw answer against the request that was sent
     * @param token forwarded to the request so a cancellation reaches the peer
     */
    public async request<P, R>(
        type: RequestType<P, unknown, null>,
        params: P,
        validate: (raw: unknown) => ProgramGuardResult<R>,
        token?: CancellationToken
    ): Promise<ProgramOutcome<R>> {
        try {
            const lane = await this.laneConnection();
            if (!lane) {
                return { kind: 'unavailable', reason: 'not-reachable' };
            }
            // An unsupported-method answer deliberately leaves the lane open: the other method
            // may still be served on it.
            const raw = await lane.sendRequest(type, params, token);
            return programOutcomeForResult(raw, validate);
        } catch (e) {
            return programOutcomeForError(e);
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
            // The connection could not be opened: answer not-reachable, start the cool-down and log
            // one line carrying only the socket error. Nothing latches for the generation — the
            // next request after the cool-down tries again — and the breaker, the shared connection
            // and the error dialog are never touched.
            if (this.laneEpoch === epoch) {
                // Not when a disposal overtook this open: it lifted the cool-down on purpose.
                this.reopenNotBefore = Date.now() + PROGRAM_LANE_REOPEN_COOLDOWN_MS;
            }
            const detail = sanitizePeerText(e instanceof Error ? e.message : String(e), MAX_PEER_ERROR_LENGTH);
            this.failureLog.syncGeneration(this.currentKey());
            this.failureLog.report('not-reachable', `Format/DENUM interop: could not open a dedicated connection (${detail})`);
            return undefined;
        }
        // Small sequential requests wait for the peer's delayed acknowledgement on a default
        // socket; a test double's socket is a bare object with no such method.
        if (typeof socket.setNoDelay === 'function') {
            socket.setNoDelay(true);
        }
        const lane = this.hooks.wrapSocket(socket);
        lane.onClose(() => this.onLaneLost(lane));
        lane.onError(() => this.onLaneLost(lane));
        lane.listen();
        if (this.laneEpoch !== epoch) {
            lane.dispose();
            return undefined;
        }
        this.lane = lane;
        return lane;
    }

    /** The shared generation and the lane epoch together: any change of either re-arms the failure log. */
    private currentKey(): string {
        return `${this.hooks.sharedGeneration()}.${this.laneEpoch}`;
    }

    /**
     * Clears the connection once it is lost, guarded on identity so a stale listener from an
     * already-replaced connection cannot clear a newer one, and moves only the lane's own epoch.
     * The shared connection generation is deliberately not touched.
     */
    private onLaneLost(lane: MessageConnection): void {
        if (this.lane !== lane) {
            return;
        }
        this.lane = undefined;
        this.laneEpoch++;
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
