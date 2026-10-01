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
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { JavaInteropService } from '../src/language/java-interop.js';
import { startLoopbackPeer, type LoopbackPeer, type LoopbackPeerHandlers } from './loopback-jsonrpc-peer.js';

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

describe('formatProgram over a real loopback socket', () => {
    let interop: JavaInteropService | undefined;
    let peer: LoopbackPeer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        interop?.clearCache();
        await peer?.close();
        interop = undefined;
        peer = undefined;
    });

    async function connectTo(handlers: LoopbackPeerHandlers): Promise<JavaInteropService> {
        peer = await startLoopbackPeer(handlers);
        interop = newInterop();
        interop.setConnectionConfig('127.0.0.1', peer.port);
        return interop;
    }

    const echoUpperCase: LoopbackPeerHandlers = {
        formatProgram: (params) => {
            const { text, version } = params as { text: string; version: string };
            return { text: text.toUpperCase(), diagnostics: [], denumbered: false, version };
        },
    };

    test('a whole-document format sends only the fields that were set and comes back typed over one dedicated socket', async () => {
        const service = await connectTo(echoUpperCase);

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
        expect(peer!.requests).toHaveLength(1);
        expect(peer!.requests[0].method).toBe('formatProgram');
        // An unset optional field is left off the wire; it is never sent as null.
        expect(sortedKeys(peer!.requests[0].params)).toEqual(['text', 'version']);
        // Only the dedicated connection was opened: nothing used the shared connection or the parse lane.
        expect(peer!.connectionCount).toBe(1);
    });

    test('canonicalName, settings and allowDenum reach the peer exactly as given, and a request with no range carries none', async () => {
        const service = await connectTo(echoUpperCase);

        const outcome = await service.formatProgram({
            text: 'rem a\n',
            version: 'w2',
            canonicalName: '/work/a.bbj',
            settings: { indentWidth: 4, splitSingleLineIf: true },
            allowDenum: true,
        });

        expect(outcome.kind).toBe('ok');
        expect(peer!.requests).toHaveLength(1);
        expect(peer!.requests[0].params).toEqual({
            text: 'rem a\n',
            version: 'w2',
            canonicalName: '/work/a.bbj',
            settings: { indentWidth: 4, splitSingleLineIf: true },
            allowDenum: true,
        });
        expect(sortedKeys(peer!.requests[0].params)).not.toContain('range');
    });
});
