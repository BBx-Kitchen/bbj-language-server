/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * A scriptable fake java-interop peer sitting behind the real `connect()` path, for the
 * circuit-breaker regression tests in java-interop-breaker.test.ts (#504) and the dedicated
 * parser connection tests in java-interop-parse-lane.test.ts. Overrides only `createSocket()`
 * and `wrapSocket()` on `JavaInteropService`, so every other code path — the breaker state
 * machine, the resolution lock, the LRU, the dedicated `parseProgram` connection — runs
 * unmodified under test. Every wrapped socket gets its own numeric connection id (assigned in
 * creation order) so a test can tell which connection a given request or drop belongs to.
 *
 * Never opens a real socket and never reaches port 5008.
 */
import { DeepPartial, EmptyFileSystem, inject, Module } from 'langium';
import { createDefaultModule, createDefaultSharedModule, LangiumSharedServices, PartialLangiumServices } from 'langium/lsp';
import { Socket } from 'net';
import { CancellationToken, ErrorCodes, MessageConnection, RequestType, ResponseError } from 'vscode-jsonrpc/node.js';
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from '../src/language/bbj-module.js';
import { BBjGeneratedModule, BBjGeneratedSharedModule } from '../src/language/generated/module.js';
import { registerValidationChecks } from '../src/language/bbj-validator.js';
import { JavaClass } from '../src/language/generated/ast.js';
import { JavadocProvider } from '../src/language/java-javadoc.js';
import { JavaInteropService } from '../src/language/java-interop.js';

/** One request recorded by the fake peer's `sendRequest` override. */
export interface SentRequest {
    method: string;
    params: unknown;
    /** The id (in creation order) of the wrapped connection this request was sent on. */
    connectionId: number;
}

interface PendingRequest {
    connectionId: number;
    reject: (reason: unknown) => void;
}

/** Per-connection bookkeeping tracked by {@link FakePeerInteropService.wrapSocket}. */
interface ConnectionRecord {
    readonly id: number;
    disposed: boolean;
    readonly closeListeners: Array<() => void>;
    readonly errorListeners: Array<() => void>;
}

/**
 * `JavaInteropService` test double whose socket layer is entirely scripted. `peerUp` toggles
 * whether `createSocket()` succeeds; `answerRequests` toggles whether a connected peer answers
 * requests at all (a slow/hung peer) or leaves them pending until `dropConnection()`.
 */
export class FakePeerInteropService extends JavaInteropService {
    /** Whether `createSocket()` succeeds once it settles. */
    public peerUp = false;
    /** Delay (ms) before `createSocket()` settles; 0 means an immediate refusal/success. */
    public connectDelayMs = 10000;
    /** Whether a connected peer answers requests at all, or leaves them pending. */
    public answerRequests = true;
    /** `getClassInfos` answers for a package name, keyed by package. */
    public readonly packageClasses = new Map<string, () => JavaClass[]>();
    /**
     * One-based `createSocket()` attempt numbers that are refused with the standard connect
     * error even while {@link peerUp} is true — for exercising a dedicated connection's own
     * open failure independently of the shared connection's state.
     */
    public readonly refusedSocketAttempts = new Set<number>();
    /**
     * Connection ids (assigned in {@link wrapSocket} creation order) whose requests stay
     * pending forever, exactly like {@link answerRequests} set to false but scoped to one
     * connection instead of every connection.
     */
    public readonly hungConnectionIds = new Set<number>();
    /** When true, a `parseProgram` request answers with a `MethodNotFound` error (an older server). */
    public parseProgramMethodMissing = false;

    /** Number of times `createSocket()` was invoked. */
    public socketAttempts = 0;
    /** Every request sent over the fake connection, in order. */
    public readonly sentRequests: SentRequest[] = [];

    private pendingRequests: PendingRequest[] = [];
    private readonly connections = new Map<number, ConnectionRecord>();
    private connectionIdCounter = 0;

    constructor(services: BBjServices) {
        super(services);
        // Mirrors MockableJavaInteropService (test/java-interop-service.test.ts): resolveClass()
        // throws without an initialized JavadocProvider.
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
    }

    /** A fresh minimal `JavaClass` DTO for `className`, as the real backend would answer. */
    classInfo(className: string): JavaClass {
        const lastDot = className.lastIndexOf('.');
        return {
            $type: 'JavaClass',
            name: className,
            packageName: lastDot >= 0 ? className.substring(0, lastDot) : '',
            classes: [],
            fields: [],
            methods: [],
            constructors: []
        } as unknown as JavaClass;
    }

    protected override createSocket(): Promise<Socket> {
        this.socketAttempts++;
        const attemptNumber = this.socketAttempts;
        return new Promise((resolve, reject) => {
            const settle = () => {
                if (this.refusedSocketAttempts.has(attemptNumber)) {
                    reject(new Error('connect ECONNREFUSED 127.0.0.1:5008'));
                } else if (this.peerUp) {
                    resolve({} as Socket);
                } else if (this.connectDelayMs === 0) {
                    reject(new Error('connect ECONNREFUSED 127.0.0.1:5008'));
                } else {
                    reject(new Error('Socket connection to Java service timed out after 10s'));
                }
            };
            if (this.connectDelayMs === 0) {
                settle();
            } else {
                setTimeout(settle, this.connectDelayMs);
            }
        });
    }

    protected override wrapSocket(_socket: Socket): MessageConnection {
        const connectionId = ++this.connectionIdCounter;
        const record: ConnectionRecord = { id: connectionId, disposed: false, closeListeners: [], errorListeners: [] };
        this.connections.set(connectionId, record);
        const connection = {
            listen: () => { /* no-op */ },
            dispose: () => { record.disposed = true; },
            onClose: (listener: () => void) => { record.closeListeners.push(listener); },
            onError: (listener: () => void) => { record.errorListeners.push(listener); },
            sendRequest: (type: RequestType<unknown, unknown, unknown>, params: unknown, token?: CancellationToken) =>
                this.handleSendRequest(connectionId, type, params, token)
        };
        return connection as unknown as MessageConnection;
    }

    private handleSendRequest(connectionId: number, type: RequestType<unknown, unknown, unknown>, params: unknown, token?: CancellationToken): Promise<unknown> {
        this.sentRequests.push({ method: type.method, params, connectionId });
        if (!this.answerRequests || this.hungConnectionIds.has(connectionId)) {
            return new Promise((_resolve, reject) => {
                const entry: PendingRequest = { connectionId, reject };
                this.pendingRequests.push(entry);
                token?.onCancellationRequested(() => {
                    reject(new Error('Canceled'));
                    this.pendingRequests = this.pendingRequests.filter(p => p !== entry);
                });
            });
        }
        switch (type.method) {
            case 'getClassInfo':
                return Promise.resolve(this.classInfo((params as { className: string }).className));
            case 'getClassInfos': {
                const factory = this.packageClasses.get((params as { packageName: string }).packageName);
                return Promise.resolve(factory ? factory() : []);
            }
            case 'loadClasspath':
                return Promise.resolve(true);
            case 'getTopLevelPackages':
                return Promise.resolve([]);
            case 'getAllClassNames':
                return Promise.reject({ code: -32601 });
            case 'parseProgram':
                if (this.parseProgramMethodMissing) {
                    return Promise.reject({ code: -32601 });
                }
                return Promise.resolve({ version: (params as { version: string }).version, errors: [] });
            default:
                return Promise.reject(new Error(`FakePeerInteropService: unhandled request '${type.method}'`));
        }
    }

    /**
     * Rejects every pending request on the named connection as if it was disposed, then fires
     * that connection's close listeners — mirrors what a real socket close does to in-flight
     * requests. With no `connectionId`, does this for every connection (today's single-connection
     * behaviour, unchanged for the breaker suite).
     */
    dropConnection(connectionId?: number): void {
        const targets = connectionId === undefined
            ? [...this.connections.values()]
            : (this.connections.has(connectionId) ? [this.connections.get(connectionId)!] : []);
        const pending = connectionId === undefined
            ? this.pendingRequests
            : this.pendingRequests.filter(p => p.connectionId === connectionId);
        this.pendingRequests = connectionId === undefined
            ? []
            : this.pendingRequests.filter(p => p.connectionId !== connectionId);
        for (const p of pending) {
            p.reject(new ResponseError(ErrorCodes.PendingResponseRejected, 'Pending response rejected since connection got disposed'));
        }
        for (const record of targets) {
            for (const listener of record.closeListeners) {
                listener();
            }
        }
    }

    /** One `{ id, disposed }` record per connection wrapped so far, in creation order. */
    connectionRecords(): Array<{ id: number; disposed: boolean }> {
        return [...this.connections.values()].map(r => ({ id: r.id, disposed: r.disposed }));
    }

    /** Seeds the complete class index directly, as a live `getAllClassNames` answer would. */
    seedCompleteClassIndex(fqns: string[]): void {
        this.buildCompleteClassIndex(fqns);
    }

    /** Number of classes currently in the synthetic classpath document. */
    classpathClassCount(): number {
        return this.classpath.classes.length;
    }
}

const FakePeerModule: Module<BBjServices, PartialLangiumServices & DeepPartial<BBjAddedServices>> = {
    java: {
        JavaInteropService: (services) => new FakePeerInteropService(services)
    }
};

/** Builds a full BBj service set with the `JavaInteropService` swapped for {@link FakePeerInteropService}. */
export function createFakePeerServices(): { shared: LangiumSharedServices; BBj: BBjServices; interop: FakePeerInteropService } {
    const shared = inject(
        createDefaultSharedModule(EmptyFileSystem),
        BBjGeneratedSharedModule,
        BBjSharedModule
    );
    const BBj = inject(
        createDefaultModule({ shared }),
        BBjGeneratedModule,
        BBjModule,
        FakePeerModule
    );
    shared.ServiceRegistry.register(BBj);
    registerValidationChecks(BBj);
    return { shared, BBj, interop: BBj.java.JavaInteropService as FakePeerInteropService };
}
