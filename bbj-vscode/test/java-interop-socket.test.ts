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
import { neverAnswer, startLoopbackPeer, unusedLoopbackPort, type LoopbackPeer } from './loopback-jsonrpc-peer.js';

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

describe('a refused connection settles through the real socket code (#560)', () => {
    let interop: LoopbackInterop | undefined;
    let errorSpy: ReturnType<typeof vi.spyOn> | undefined;

    afterEach(() => {
        interop?.clearCache();
        errorSpy?.mockRestore();
        interop = undefined;
        errorSpy = undefined;
    });

    test('callConnect() rejects with ECONNREFUSED and logs the connect failure', async () => {
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* silence expected log */ });
        interop = newInterop();
        interop.setConnectionConfig('127.0.0.1', await unusedLoopbackPort());

        await expect(interop.callConnect()).rejects.toThrow(/ECONNREFUSED/);

        expect(errorSpy).toHaveBeenCalledWith('Failed to connect to the Java service.', expect.anything());
    });

    test('a lookup against a refused connection resolves to an uncached error stub', async () => {
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* silence expected log */ });
        interop = newInterop();
        interop.setConnectionConfig('127.0.0.1', await unusedLoopbackPort());

        const resolved = await interop.resolveClassByName('java.util.HashMap');

        expect(resolved.error).toBeDefined();
        expect(interop.getResolvedClass('java.util.HashMap')).toBeUndefined();
    });
});

describe('a response that never arrives times out through the real socket code (#560)', () => {
    let interop: LoopbackInterop | undefined;
    let peer: LoopbackPeer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        interop?.clearCache();
        await peer?.close();
        interop = undefined;
        peer = undefined;
    });

    /** Starts a peer whose getClassInfo handler never answers, connects for real, and returns a
     *  promise that resolves once the peer has recorded the getClassInfo request's arrival. */
    async function setUpHungPeer(): Promise<() => Promise<void>> {
        let resolveArrived!: () => void;
        const arrived = new Promise<void>((resolve) => { resolveArrived = resolve; });
        peer = await startLoopbackPeer({
            getClassInfo: () => {
                resolveArrived();
                return neverAnswer();
            },
        });
        interop = newInterop();
        interop.setConnectionConfig('127.0.0.1', peer.port);
        await interop.callConnect();
        return () => arrived;
    }

    test('resolveClassByName is still pending at 9,999 ms and settles with an uncached error at 10,000 ms', async () => {
        const waitForArrival = await setUpHungPeer();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        let settled = false;
        const pending = interop!.resolveClassByName('com.example.Hung').then((result) => { settled = true; return result; });
        await waitForArrival();

        await vi.advanceTimersByTimeAsync(9_999);
        expect(settled).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        const resolved = await pending;

        expect(settled).toBe(true);
        expect(resolved.error).toBeDefined();
        expect(interop!.getResolvedClass('com.example.Hung')).toBeUndefined();
        expect(peer!.requests).toHaveLength(1);
        expect(peer!.requests[0]).toMatchObject({ method: 'getClassInfo', params: { className: 'com.example.Hung' } });
    });

    test('callGetRawClass rejects with the 10s resolution-timeout message, not before', async () => {
        const waitForArrival = await setUpHungPeer();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        let settled = false;
        const pending = interop!.callGetRawClass('com.example.Other').catch((e) => { settled = true; throw e; });
        const assertion = expect(pending).rejects.toThrow(/Java class resolution timeout for com\.example\.Other/);
        await waitForArrival();

        await vi.advanceTimersByTimeAsync(9_999);
        expect(settled).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        await assertion;
        expect(settled).toBe(true);
    });
});

describe('the resolution lock serializes concurrent lookups, observed on the wire (#560)', () => {
    let interop: LoopbackInterop | undefined;
    let peer: LoopbackPeer | undefined;

    afterEach(async () => {
        interop?.clearCache();
        await peer?.close();
        interop = undefined;
        peer = undefined;
    });

    /** A promise/resolve pair, deferred-style, so a test can hold a peer's answer open. */
    function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
        let resolve!: (value: T) => void;
        const promise = new Promise<T>((r) => { resolve = r; });
        return { promise, resolve };
    }

    function realDelay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    test('three concurrent lookups of distinct classes reach the peer one at a time, in call order', async () => {
        const names = ['a.One', 'a.Two', 'a.Three'];
        const arrivals = new Map(names.map(name => [name, deferred<void>()]));
        const releases = new Map<string, () => void>();

        peer = await startLoopbackPeer({
            getClassInfo: (params) => {
                const { className } = params as { className: string };
                arrivals.get(className)?.resolve();
                return new Promise((resolve) => {
                    releases.set(className, () => resolve({ name: className, packageName: '', fields: [], methods: [], constructors: [] }));
                });
            },
        });
        interop = newInterop();
        interop.setConnectionConfig('127.0.0.1', peer.port);

        const allResolved = Promise.all(names.map(name => interop!.resolveClassByName(name)));

        for (const name of names) {
            await arrivals.get(name)!.promise;
            // Real time, not fake: proves the next request has not also reached the wire.
            await realDelay(50);
            const getClassInfoRequests = peer.requests.filter(r => r.method === 'getClassInfo');
            expect(getClassInfoRequests.map(r => (r.params as { className: string }).className)).toEqual(
                names.slice(0, names.indexOf(name) + 1)
            );
            expect(peer.inFlight()).toBe(1);
            releases.get(name)!();
        }

        const resolved = await allResolved;
        expect(peer.requests.map(r => (r.params as { className: string }).className)).toEqual(names);
        expect(peer.maxInFlight).toBe(1);
        for (const javaClass of resolved) {
            expect(javaClass.error).toBeUndefined();
        }
    });

    test('non-vacuity control: loadImplicitImports\' unlocked getClassInfos burst shows 2+ requests genuinely in flight at once', async () => {
        let seenCount = 0;
        const second = deferred<void>();
        let releaseImmediately = false;
        const heldReleases: Array<() => void> = [];

        peer = await startLoopbackPeer({
            getClassInfos: () => {
                seenCount += 1;
                if (seenCount === 2) {
                    second.resolve();
                }
                if (releaseImmediately) {
                    return [];
                }
                return new Promise((resolve) => {
                    heldReleases.push(() => resolve([]));
                });
            },
            getTopLevelPackages: () => [],
        });
        interop = newInterop();
        interop.setConnectionConfig('127.0.0.1', peer.port);

        const pending = interop.loadImplicitImports();

        await second.promise;
        // The second getClassInfos landed while the first is still unanswered: real concurrency,
        // not a harness artefact — the resolution lock does not cover this unlocked burst.
        expect(peer.maxInFlight).toBeGreaterThanOrEqual(2);

        releaseImmediately = true;
        for (const release of heldReleases) {
            release();
        }

        await expect(pending).resolves.toBe(true);
    });
});
