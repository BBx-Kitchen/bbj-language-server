/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Unit tests for `JavaInteropService` (src/language/java-interop.ts), covering the
 * P61-D2-001..004 and P61-D3-001 findings applied by Phase 67 plan 67-02. The service is driven
 * directly with a mock socket (see `FakeSocket`/`MockableJavaInteropService` below) — this suite
 * NEVER opens a real socket and NEVER reaches port 5008. The existing interop coverage that does
 * depend on a live peer lives in `test/linking.test.ts`'s "Interop related tests" and is left
 * untouched (it is part of the baseline's deterministic-failure gate set, see 67-BASELINE.md).
 */
import { DeepPartial, EmptyFileSystem, inject, Module } from 'langium';
import { createDefaultModule, createDefaultSharedModule, LangiumSharedServices, PartialLangiumServices } from 'langium/lsp';
import { EventEmitter } from 'events';
import { Socket } from 'net';
import { describe, expect, test, vi } from 'vitest';
import { CancellationToken, MessageConnection } from 'vscode-jsonrpc/node.js';
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from '../src/language/bbj-module.js';
import { BBjGeneratedModule, BBjGeneratedSharedModule } from '../src/language/generated/module.js';
import { registerValidationChecks } from '../src/language/bbj-validator.js';
import { JavaClass } from '../src/language/generated/ast.js';
import { JavadocProvider } from '../src/language/java-javadoc.js';
import { JavaInteropService, RESOLVED_CLASSES_CACHE_LIMIT } from '../src/language/java-interop.js';

/**
 * A minimal in-memory stand-in for `net.Socket`, implementing only what vscode-jsonrpc's
 * `SocketMessageReader`/`SocketMessageWriter` actually touch (`on`/`off` via EventEmitter,
 * `write(data, encoding?, callback?)`, `end()`, `destroy()`). Never connects to a real port.
 */
class FakeSocket extends EventEmitter {
    public destroyed = false;

    write(data: unknown, encodingOrCallback?: unknown, callback?: unknown): boolean {
        const cb = typeof encodingOrCallback === 'function' ? encodingOrCallback as (err?: Error) => void
            : typeof callback === 'function' ? callback as (err?: Error) => void
                : undefined;
        cb?.();
        return true;
    }

    end(callback?: () => void): void {
        callback?.();
    }

    destroy(): void {
        this.destroyed = true;
        this.emit('close');
    }
}

/**
 * Test double exposing `JavaInteropService`'s protected surface for direct unit testing and
 * replacing the real socket factory with {@link FakeSocket} — per 67-01-PLAN.md's
 * phase_conventions ("regression-testable with vitest (mock socket)", P61-D2-001's own record).
 */
class MockableJavaInteropService extends JavaInteropService {
    public socketFactoryCalls = 0;
    public lastSocket?: FakeSocket;

    constructor(services: BBjServices) {
        super(services);
        // Init JavadocProvider otherwise resolveClass() throws (mirrors test/bbj-test-module.ts).
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
    }

    protected override createSocket(): Promise<Socket> {
        this.socketFactoryCalls++;
        const socket = new FakeSocket();
        this.lastSocket = socket;
        return Promise.resolve(socket as unknown as Socket);
    }

    public testConnect(): Promise<MessageConnection> {
        return this.connect();
    }

    public testGetRawClass(className: string, token?: CancellationToken): Promise<JavaClass> {
        return this.getRawClass(className, token);
    }

    public testResolveClass(javaClass: JavaClass): Promise<JavaClass> {
        return this.resolveClass(javaClass);
    }

    public testBuildCompleteClassIndex(fqns: string[]): void {
        this.buildCompleteClassIndex(fqns);
    }
}

const TestModule: Module<BBjServices, PartialLangiumServices & DeepPartial<BBjAddedServices>> = {
    java: {
        JavaInteropService: (services) => new MockableJavaInteropService(services)
    }
};

function createServices(): { shared: LangiumSharedServices, BBj: BBjServices } {
    const shared = inject(
        createDefaultSharedModule(EmptyFileSystem),
        BBjGeneratedSharedModule,
        BBjSharedModule
    );
    const BBj = inject(
        createDefaultModule({ shared }),
        BBjGeneratedModule,
        BBjModule,
        TestModule
    );
    shared.ServiceRegistry.register(BBj);
    registerValidationChecks(BBj);
    return { shared, BBj };
}

function createInteropService(): MockableJavaInteropService {
    const { BBj } = createServices();
    return BBj.java.JavaInteropService as MockableJavaInteropService;
}

/** A minimal, well-formed JavaClass with no fields/methods/constructors — safe to resolveClass(). */
function minimalJavaClass(name: string, overrides: Partial<JavaClass> = {}): JavaClass {
    return {
        $type: 'JavaClass',
        name,
        packageName: 'test',
        classes: [],
        fields: [],
        methods: [],
        constructors: [],
        ...overrides
    } as unknown as JavaClass;
}

describe('JavaInteropService (mock socket, no real port 5008 connection)', () => {

    describe('connect() concurrency and dead-connection recovery (P61-D2-001)', () => {
        test('two same-tick connect() calls open exactly one socket and share the connection', async () => {
            const service = createInteropService();
            const [first, second] = await Promise.all([service.testConnect(), service.testConnect()]);
            expect(service.socketFactoryCalls).toBe(1);
            expect(first).toBe(second);
        });

        test('drops the dead connection and reconnects after the peer closes it', async () => {
            const service = createInteropService();
            const first = await service.testConnect();
            expect(service.socketFactoryCalls).toBe(1);
            service.lastSocket!.emit('close');
            const second = await service.testConnect();
            expect(service.socketFactoryCalls).toBe(2);
            expect(second).not.toBe(first);
        });
    });

    describe('a stale connection listener cannot clobber a newer healthy connection (P67-WR-02)', () => {
        test('the old connection closing after a reconnect leaves the new connection installed', async () => {
            const service = createInteropService();
            const first = await service.testConnect();
            const staleSocket = service.lastSocket!;
            expect(service.socketFactoryCalls).toBe(1);

            // Drop the first connection via its `error` listener, then reconnect.
            staleSocket.emit('error', new Error('peer reset'));
            const second = await service.testConnect();
            expect(service.socketFactoryCalls).toBe(2);
            expect(second).not.toBe(first);

            // The first socket's teardown is asynchronous: its `close` arrives only now, after a
            // healthy replacement is already installed. Unguarded, this handler would null out
            // `this.connection` and force a spurious third socket on the next call.
            staleSocket.emit('close');
            const third = await service.testConnect();
            expect(service.socketFactoryCalls).toBe(2);
            expect(third).toBe(second);
        });
    });

    describe('raced getRawClass request never produces an unhandled promise rejection (P61-D2-002)', () => {
        // NOTE on this test's shape (see 67-02-SUMMARY.md "Deviations" for the full writeup):
        // Empirical verification against the real vscode-jsonrpc SocketMessageReader/Writer +
        // createMessageConnection (not just a hand-rolled Promise.race repro) found that
        // Promise.race([sendRequest(...), timeoutPromise]) already attaches a rejection handler
        // to BOTH array entries synchronously (per the Promise.race spec), so a losing branch
        // that rejects later is never "unhandled" — with or without an extra .catch(). This test
        // therefore cannot show a genuine failing-before state; it asserts the invariant the
        // record's fix is meant to defend (no unhandledRejection across a realistic timeout race,
        // and the rejection still reaches the awaiting caller), and stays green on both sides of
        // the P61-D2-002 fix. fail_before is recorded as `inapplicable` in 67-APPLY-SET.md, not
        // fabricated as an observed red.
        test('a request that times out is surfaced to the caller with no unhandled rejection', async () => {
            vi.useFakeTimers();
            const unhandled: unknown[] = [];
            const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
            process.on('unhandledRejection', onUnhandledRejection);
            try {
                const service = createInteropService();
                await service.testConnect();
                const pending = service.testGetRawClass('does.not.Matter');
                const assertion = expect(pending).rejects.toThrow(/timeout/i);
                await vi.advanceTimersByTimeAsync(10_000);
                await assertion;
                await vi.advanceTimersByTimeAsync(0);
            } finally {
                process.off('unhandledRejection', onUnhandledRejection);
                vi.useRealTimers();
            }
            expect(unhandled).toEqual([]);
        });
    });

    describe('resolveClass tolerates a classpath response missing fields/methods (P61-D2-003)', () => {
        test('defaults missing fields and methods to empty arrays instead of throwing', async () => {
            const service = createInteropService();
            const malformed = {
                $type: 'JavaClass',
                name: 'test.Malformed',
                packageName: 'test',
                classes: [],
                constructors: []
                // fields/methods intentionally omitted, as a malformed getClassInfo response would
            } as unknown as JavaClass;

            const resolved = await service.testResolveClass(malformed);

            expect(resolved.fields).toEqual([]);
            expect(resolved.methods).toEqual([]);
        });
    });

    describe('clearCache() also clears the complete class index (P61-D2-004)', () => {
        test('hasCompleteClassIndex() is false after clearCache()', () => {
            const service = createInteropService();
            service.testBuildCompleteClassIndex(['java.lang.String']);
            expect(service.hasCompleteClassIndex()).toBe(true);

            service.clearCache();

            expect(service.hasCompleteClassIndex()).toBe(false);
        });
    });

    describe('_resolvedClasses is bounded by an LRU size cap (P61-D3-001)', () => {
        const CACHE_LIMIT = RESOLVED_CLASSES_CACHE_LIMIT;

        test('resolving more distinct classes than the cap evicts the least-recently-used entry', async () => {
            const service = createInteropService();
            const resolutions: Promise<JavaClass>[] = [];
            for (let i = 0; i <= CACHE_LIMIT; i++) {
                resolutions.push(service.testResolveClass(minimalJavaClass(`test.Class${i}`)));
            }
            await Promise.all(resolutions);

            // The very first class resolved must have been evicted as least-recently-used...
            expect(service.getResolvedClass('test.Class0')).toBeUndefined();
            // ...while the most recently resolved class is still present.
            expect(service.getResolvedClass(`test.Class${CACHE_LIMIT}`)).toBeDefined();
        });
    });

});
