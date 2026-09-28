/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Coverage for `JavaInteropService`'s real `connect()`, `createSocket()` and `wrapSocket()` code
 * against the shared loopback peer (`loopback-jsonrpc-peer.ts`), instead of a client-side fake
 * (#560). `LoopbackInterop` below overrides no connection member — only adds public passthroughs
 * — so a class lookup genuinely travels over a real `net` socket to the peer and back. Covers the
 * happy path, a refused connection, a response that never arrives, and concurrent lookups
 * serialized by the resolution lock. `test/fake-interop-peer.ts` and the breaker/parse-lane
 * suites that use it are untouched — they cover what this suite deliberately does not.
 */
import { EmptyFileSystem } from 'langium';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices, type BBjServices } from '../src/language/bbj-module.js';
import { JavaInteropService } from '../src/language/java-interop.js';
import { JavadocProvider } from '../src/language/java-javadoc.js';
import { startLoopbackPeer, type LoopbackPeer } from './loopback-jsonrpc-peer.js';

/** Exposes connect()/createSocket()/getRawClass() as public passthroughs; overrides nothing. */
class LoopbackInterop extends JavaInteropService {
    public callConnect() {
        return this.connect();
    }

    public callCreateSocket() {
        return this.createSocket();
    }

    public callGetRawClass(className: string) {
        return this.getRawClass(className);
    }
}

function newServices(): BBjServices {
    return createBBjServices(EmptyFileSystem).BBj;
}

/** A fresh, unconfigured service. Mirrors test/fake-interop-peer.ts's JavadocProvider guard. */
function newInterop(): LoopbackInterop {
    const services = newServices();
    if (!JavadocProvider.getInstance().isInitialized()) {
        JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
    }
    return new LoopbackInterop(services);
}

describe('JavaInteropService over a real loopback socket (#560)', () => {
    let interop: LoopbackInterop | undefined;
    let peer: LoopbackPeer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        interop?.clearCache();
        await peer?.close();
        interop = undefined;
        peer = undefined;
    });

    test('a class lookup travels over a real loopback socket to the shared peer and back', async () => {
        peer = await startLoopbackPeer({
            getClassInfo: (params) => {
                const { className } = params as { className: string };
                const packageName = className.slice(0, className.lastIndexOf('.'));
                return { name: className, packageName, fields: [], methods: [], constructors: [] };
            },
        });
        interop = newInterop();
        interop.setConnectionConfig('127.0.0.1', peer.port);

        const resolved = await interop.resolveClassByName('java.util.HashMap');

        expect(resolved.error).toBeUndefined();
        expect(resolved.packageName).toBe('java.util');
        expect(peer.requests).toHaveLength(1);
        expect(peer.requests[0]).toMatchObject({ method: 'getClassInfo', params: { className: 'java.util.HashMap' } });
        expect(peer.connectionCount).toBe(1);
        expect(interop.connectionGeneration).toBe(1);

        // A second lookup of the same name is a cache hit — no further request is sent.
        await interop.resolveClassByName('java.util.HashMap');
        expect(peer.requests).toHaveLength(1);
    });
});
