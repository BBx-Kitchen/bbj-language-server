/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The one shared real loopback JSON-RPC server used by test infrastructure, used both by the
 * interop harness tests (via `interop-harness-fake-peer.ts`'s thin adapter) and by the
 * JavaInteropService socket suite. It listens on `127.0.0.1` with an ephemeral port (port `0`)
 * and dispatches every incoming request by JSON-RPC method name to a per-test handler map; it
 * never reaches the live peer on :5008 or any non-loopback host.
 */
import { createServer, type Server, type Socket } from 'node:net';
import {
    createMessageConnection,
    ErrorCodes,
    ResponseError,
    SocketMessageReader,
    SocketMessageWriter,
    type CancellationToken,
    type MessageConnection,
} from 'vscode-jsonrpc/node.js';

/**
 * Passed to every handler. `connectionId` identifies which accepted socket carried the request;
 * `token` is that request's own cancellation token, cancelled when a `$/cancelRequest` for it
 * arrives over the wire.
 */
export interface LoopbackPeerContext {
    readonly connectionId: number;
    readonly token: CancellationToken;
    drop(): void;
}

/** A handler for one JSON-RPC method name. May return a value, a promise, or throw/reject. */
export type LoopbackPeerHandler = (params: unknown, ctx: LoopbackPeerContext) => unknown;

/** Record from JSON-RPC method name to its handler. A method with no entry answers MethodNotFound. */
export type LoopbackPeerHandlers = Record<string, LoopbackPeerHandler>;

/** One request recorded by the peer, in arrival order. */
export interface RecordedRequest {
    readonly method: string;
    readonly params: unknown;
    readonly connectionId: number;
}

export interface LoopbackPeer {
    readonly port: number;
    /** Every request received, in arrival order. */
    readonly requests: readonly RecordedRequest[];
    /** Every request whose `$/cancelRequest` arrived, in arrival order. */
    readonly cancellations: readonly RecordedRequest[];
    /** Total number of sockets accepted so far. */
    readonly connectionCount: number;
    /** Number of requests currently being handled (dispatched but not yet settled). */
    inFlight(): number;
    /** The highest value `inFlight()` has reached so far. */
    readonly maxInFlight: number;
    close(): Promise<void>;
}

/**
 * Starts the shared loopback peer. `handlers` maps a JSON-RPC method name to its handler; a
 * method with no handler answers `MethodNotFound`, matching vscode-jsonrpc's own default for an
 * unhandled method.
 */
export function startLoopbackPeer(handlers: LoopbackPeerHandlers = {}): Promise<LoopbackPeer> {
    return new Promise((resolvePeer, rejectPeer) => {
        const sockets = new Set<Socket>();
        const connections: MessageConnection[] = [];
        const requests: RecordedRequest[] = [];
        const cancellations: RecordedRequest[] = [];
        let connectionIdCounter = 0;
        let inFlightCount = 0;
        let maxInFlight = 0;

        const server: Server = createServer(socket => {
            sockets.add(socket);
            socket.on('close', () => sockets.delete(socket));

            connectionIdCounter += 1;
            const connectionId = connectionIdCounter;

            const conn = createMessageConnection(
                new SocketMessageReader(socket),
                new SocketMessageWriter(socket),
            );
            connections.push(conn);

            conn.onRequest((method: string, params: unknown, token: CancellationToken) => {
                const record: RecordedRequest = { method, params, connectionId };
                const ctx: LoopbackPeerContext = { connectionId, token, drop: () => socket.destroy() };
                requests.push(record);
                token.onCancellationRequested(() => { cancellations.push(record); });
                inFlightCount += 1;
                if (inFlightCount > maxInFlight) {
                    maxInFlight = inFlightCount;
                }
                const settle = (): void => { inFlightCount -= 1; };
                const handler = handlers[method];
                if (!handler) {
                    settle();
                    return Promise.reject(new ResponseError(ErrorCodes.MethodNotFound, `Unhandled method ${method}`));
                }
                return Promise.resolve()
                    .then(() => handler(params, ctx))
                    .finally(settle);
            });

            conn.listen();
        });

        server.on('error', rejectPeer);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address !== null ? address.port : 0;
            resolvePeer({
                port,
                get requests() { return requests; },
                get cancellations() { return cancellations; },
                get connectionCount() { return connectionIdCounter; },
                inFlight: () => inFlightCount,
                get maxInFlight() { return maxInFlight; },
                close: () => new Promise<void>((resolveClose) => {
                    for (const conn of connections) {
                        conn.dispose();
                    }
                    for (const socket of sockets) {
                        socket.destroy();
                    }
                    server.close(() => resolveClose());
                }),
            });
        });
    });
}

/** A promise that never settles — the never-answer control for a handler that must hang forever. */
export function neverAnswer(): Promise<never> {
    return new Promise<never>(() => { /* deliberately never settles */ });
}

/**
 * Resolves to a loopback port with nothing listening on it: binds a throwaway peer on ephemeral
 * port `0` of `127.0.0.1` (the same bind used by {@link startLoopbackPeer}), reads the assigned
 * port, and closes it immediately, leaving the port free.
 *
 * NOTE: this is a best-effort check-then-use — the OS is free to hand `port` to another process
 * or a concurrent test worker in the window between `close()` and the caller's own connection
 * attempt. Acceptable for this suite's low concurrency, but not airtight; if a "refused
 * connection" assertion ever flakes on a saturated CI host, this is the reason.
 */
export async function unusedLoopbackPort(): Promise<number> {
    const probe = await startLoopbackPeer();
    const port = probe.port;
    await probe.close();
    return port;
}
