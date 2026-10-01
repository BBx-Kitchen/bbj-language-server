/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Proves the format and DENUM client over a real loopback JSON-RPC socket: real message framing,
 * real error data, real cancellation. The scriptable fake peer cannot show these (it rejects a
 * cancelled request itself, while the real connection leaves it pending). Every peer here binds
 * its own ephemeral loopback port; nothing ever reaches the live interop port 5008.
 */
import { EmptyFileSystem } from 'langium';
import { CancellationTokenSource, ResponseError } from 'vscode-jsonrpc/node.js';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { JavaInteropService } from '../src/language/java-interop.js';
import { PROGRAM_REQUEST_TIMEOUT_MS } from '../src/language/java-interop-program-lane.js';
import { neverAnswer, startLoopbackPeer, type LoopbackPeer, type LoopbackPeerHandlers } from './loopback-jsonrpc-peer.js';

/** A plain, unconfigured service with no overridden members, as production builds it. */
function newInterop(): JavaInteropService {
    const services = createBBjServices(EmptyFileSystem).BBj;
    if (!services.java.JavadocProvider.isInitialized()) {
        services.java.JavadocProvider.initialize([], services.shared.workspace.FileSystemProvider);
    }
    return new JavaInteropService(services);
}

/** The sorted property names of a recorded request's params. */
function sortedKeys(params: unknown): string[] {
    return Object.keys(params as Record<string, unknown>).sort();
}

/** One loopback peer and the plain service pointed at it, torn down after each test. */
class WireFixture {
    private interop?: JavaInteropService;
    private peer?: LoopbackPeer;

    async start(handlers: LoopbackPeerHandlers): Promise<{ service: JavaInteropService; peer: LoopbackPeer }> {
        const peer = await startLoopbackPeer(handlers);
        const service = newInterop();
        service.setConnectionConfig('127.0.0.1', peer.port);
        this.peer = peer;
        this.interop = service;
        return { service, peer };
    }

    async stop(): Promise<void> {
        vi.useRealTimers();
        this.interop?.clearCache();
        await this.peer?.close();
        this.interop = undefined;
        this.peer = undefined;
    }
}

/** Answers a format request with its text upper-cased. */
const echoUpperCase: LoopbackPeerHandlers = {
    formatProgram: (params) => {
        const { text, version } = params as { text: string; version: string };
        return { text: text.toUpperCase(), diagnostics: [], denumbered: false, version };
    },
};

describe('formatProgram over a real loopback socket', () => {
    const fixture = new WireFixture();
    afterEach(() => fixture.stop());

    test('a whole-document format sends only the fields that were set and comes back typed over one dedicated socket', async () => {
        const { service, peer } = await fixture.start(echoUpperCase);

        const outcome = await service.formatProgram({ text: 'rem a\n', version: 'w1' });

        expect(outcome.kind).toBe('ok');
        if (outcome.kind !== 'ok') {
            return;
        }
        expect(outcome.result.scope).toBe('document');
        if (outcome.result.scope !== 'document') {
            return;
        }
        expect(outcome.result.text).toBe('REM A\n');
        expect(outcome.result.version).toBe('w1');
        expect(peer.requests).toHaveLength(1);
        expect(peer.requests[0].method).toBe('formatProgram');
        // An unset optional field is left off the wire; it is never sent as null.
        expect(sortedKeys(peer.requests[0].params)).toEqual(['text', 'version']);
        // Only the dedicated connection was opened: nothing used the shared connection or the parse lane.
        expect(peer.connectionCount).toBe(1);
    });

    test('canonicalName, settings and allowDenum reach the peer exactly as given, and a request with no range carries none', async () => {
        const { service, peer } = await fixture.start(echoUpperCase);

        const outcome = await service.formatProgram({
            text: 'rem a\n',
            version: 'w2',
            canonicalName: '/work/a.bbj',
            settings: { indentWidth: 4, splitSingleLineIf: true },
            allowDenum: true,
        });

        expect(outcome.kind).toBe('ok');
        expect(peer.requests).toHaveLength(1);
        expect(peer.requests[0].params).toEqual({
            text: 'rem a\n',
            version: 'w2',
            canonicalName: '/work/a.bbj',
            settings: { indentWidth: 4, splitSingleLineIf: true },
            allowDenum: true,
        });
        expect(sortedKeys(peer.requests[0].params)).not.toContain('range');
    });
});

describe('error data survives real framing', () => {
    const fixture = new WireFixture();
    afterEach(() => fixture.stop());

    test('an invalid-settings error keeps its problems per setting and drops an entry that is not a problem', async () => {
        const { service } = await fixture.start({
            formatProgram: () => {
                throw new ResponseError(-33007, 'invalid settings', [
                    { setting: 'indentWidth', message: 'not an integer' },
                    { setting: 5 },
                ]);
            },
        });

        const outcome = await service.formatProgram({ text: 'rem a\n', version: 'e1' });

        expect(outcome).toEqual({
            kind: 'invalid-settings',
            problems: [{ setting: 'indentWidth', message: 'not an integer' }],
        });
    });

    test('a mixed-numbering error carries the offending line', async () => {
        const { service } = await fixture.start({
            denumProgram: () => {
                throw new ResponseError(-33008, 'mixed line numbering', { line: 2 });
            },
        });

        const outcome = await service.denumProgram({ text: '10 rem a\nrem b\n', version: 'e2' });

        expect(outcome).toEqual({ kind: 'mixed-numbering', line: 2 });
    });

    test('a peer that reports the request cancelled gives a cancelled outcome', async () => {
        const { service } = await fixture.start({
            formatProgram: () => {
                throw new ResponseError(-32800, 'cancelled');
            },
        });

        const outcome = await service.formatProgram({ text: 'rem a\n', version: 'e3' });

        expect(outcome).toEqual({ kind: 'cancelled' });
    });
});

describe('each method is available on its own over the real wire', () => {
    const fixture = new WireFixture();
    afterEach(() => fixture.stop());

    test('a peer without formatProgram latches only that method off and still serves denumProgram on the same socket', async () => {
        const { service, peer } = await fixture.start({
            denumProgram: (params) => {
                const { text, version } = params as { text: string; version: string };
                return { text, diagnostics: [], denumbered: false, version };
            },
        });

        const first = await service.formatProgram({ text: 'rem a\n', version: 'm1' });
        const second = await service.formatProgram({ text: 'rem a\n', version: 'm2' });
        const denum = await service.denumProgram({ text: 'rem a\n', version: 'm3' });

        expect(first).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        expect(second).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        // The second format call was answered from the latch: only one format request was ever sent.
        expect(peer.requests.filter(request => request.method === 'formatProgram')).toHaveLength(1);
        expect(denum.kind).toBe('ok');
        expect(peer.requests.filter(request => request.method === 'denumProgram')).toHaveLength(1);
        expect(peer.connectionCount).toBe(1);
    });
});

/**
 * A peer whose format handler answers `warm` and `after` requests at once and holds a `hang`
 * request open forever. `arrived` settles when the hung request reaches the peer; `cancelled`
 * settles when that request's own token is cancelled, which only a real `$/cancelRequest` can do.
 */
function hangingFormatPeer(): { handlers: LoopbackPeerHandlers; arrived: Promise<void>; cancelled: Promise<void> } {
    let markArrived!: () => void;
    let markCancelled!: () => void;
    const arrived = new Promise<void>(resolve => { markArrived = resolve; });
    const cancelled = new Promise<void>(resolve => { markCancelled = resolve; });
    const handlers: LoopbackPeerHandlers = {
        formatProgram: (params, ctx) => {
            const { text, version } = params as { text: string; version: string };
            if (version === 'hang') {
                ctx.token.onCancellationRequested(() => markCancelled());
                markArrived();
                return neverAnswer();
            }
            return { text, diagnostics: [], denumbered: false, version };
        },
    };
    return { handlers, arrived, cancelled };
}

describe('a connection that drops while a request is in flight', () => {
    const fixture = new WireFixture();
    afterEach(() => fixture.stop());

    /** Answers `warm` and `after` requests at once; on `drop` it destroys the socket and never answers. */
    const droppingPeer: LoopbackPeerHandlers = {
        formatProgram: (params, ctx) => {
            const { text, version } = params as { text: string; version: string };
            if (version === 'drop') {
                ctx.drop();
                return neverAnswer();
            }
            return { text, diagnostics: [], denumbered: false, version };
        },
    };

    test('the pending request settles at once as a transport failure, far before the deadline, and the next request opens a second socket', async () => {
        const { service, peer } = await fixture.start(droppingPeer);
        expect((await service.formatProgram({ text: 'rem a\n', version: 'warm' })).kind).toBe('ok');
        // From here a timer that is not advanced never fires: only the loss itself can settle the request.
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        const startedAt = performance.now();
        const outcome = await service.formatProgram({ text: 'rem a\n', version: 'drop' });
        const elapsed = performance.now() - startedAt;

        expect(outcome).toMatchObject({ kind: 'failed', failure: 'transport' });
        expect(elapsed).toBeLessThan(PROGRAM_REQUEST_TIMEOUT_MS / 3);
        expect(peer.connectionCount).toBe(1);

        const after = await service.formatProgram({ text: 'rem b\n', version: 'after' });
        expect(after.kind).toBe('ok');
        expect(peer.connectionCount).toBe(2);
    });
});

describe('cancellation reaches the peer as a real $/cancelRequest', () => {
    const fixture = new WireFixture();
    afterEach(() => fixture.stop());

    test('the deadline settles a silent request as a client timeout, then cancels it on the wire and leaves the socket usable', async () => {
        const hanging = hangingFormatPeer();
        const { service, peer } = await fixture.start(hanging.handlers);
        // Open the dedicated connection for real before any timer is faked.
        expect((await service.formatProgram({ text: 'rem a\n', version: 'warm' })).kind).toBe('ok');
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        let settled = false;
        const pending = service.formatProgram({ text: 'rem a\n', version: 'hang' }).then(outcome => {
            settled = true;
            return outcome;
        });
        await hanging.arrived;

        await vi.advanceTimersByTimeAsync(PROGRAM_REQUEST_TIMEOUT_MS - 1);
        expect(settled).toBe(false);
        expect(peer.cancellations).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(1);
        const outcome = await pending;
        expect(outcome).toEqual({ kind: 'timeout', origin: 'client' });

        // The cancellation is a real message the peer received; the client did not wait for any reply.
        await hanging.cancelled;
        expect(peer.cancellations).toHaveLength(1);
        expect(peer.cancellations[0]).toMatchObject({ method: 'formatProgram', params: { version: 'hang' } });

        const after = await service.formatProgram({ text: 'rem b\n', version: 'after' });
        expect(after.kind).toBe('ok');
        expect(peer.connectionCount).toBe(1);
    });

    test('a caller cancellation settles a pending request as cancelled at once and cancels it on the wire afterwards', async () => {
        const hanging = hangingFormatPeer();
        const { service, peer } = await fixture.start(hanging.handlers);
        expect((await service.formatProgram({ text: 'rem a\n', version: 'warm' })).kind).toBe('ok');

        const source = new CancellationTokenSource();
        let settled = false;
        const pending = service.formatProgram({ text: 'rem a\n', version: 'hang' }, source.token).then(outcome => {
            settled = true;
            return outcome;
        });
        await hanging.arrived;
        expect(settled).toBe(false);

        source.cancel();
        const outcome = await pending;
        expect(outcome).toEqual({ kind: 'cancelled' });

        await hanging.cancelled;
        expect(peer.cancellations).toHaveLength(1);
        expect(peer.cancellations[0]).toMatchObject({ method: 'formatProgram', params: { version: 'hang' } });
        expect(peer.connectionCount).toBe(1);
        source.dispose();
    });
});
