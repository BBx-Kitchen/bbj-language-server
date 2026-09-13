/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * A scriptable fake java-interop peer sitting behind the real `connect()` path, for the
 * circuit-breaker regression tests in java-interop-breaker.test.ts (#504). Overrides only
 * `createSocket()` and `wrapSocket()` on `JavaInteropService`, so every other code path — the
 * breaker state machine, the resolution lock, the LRU — runs unmodified under test.
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
}

interface PendingRequest {
    reject: (reason: unknown) => void;
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

    /** Number of times `createSocket()` was invoked. */
    public socketAttempts = 0;
    /** Every request sent over the fake connection, in order. */
    public readonly sentRequests: SentRequest[] = [];

    private pendingRequests: PendingRequest[] = [];
    private closeListener?: () => void;

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
        return new Promise((resolve, reject) => {
            const settle = () => {
                if (this.peerUp) {
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
        const connection = {
            listen: () => { /* no-op */ },
            dispose: () => { /* no-op */ },
            onClose: (listener: () => void) => { this.closeListener = listener; },
            onError: (_listener: () => void) => { /* not exercised by these tests */ },
            sendRequest: (type: RequestType<unknown, unknown, unknown>, params: unknown, token?: CancellationToken) =>
                this.handleSendRequest(type, params, token)
        };
        return connection as unknown as MessageConnection;
    }

    private handleSendRequest(type: RequestType<unknown, unknown, unknown>, params: unknown, token?: CancellationToken): Promise<unknown> {
        this.sentRequests.push({ method: type.method, params });
        if (!this.answerRequests) {
            return new Promise((_resolve, reject) => {
                const entry: PendingRequest = { reject };
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
            default:
                return Promise.reject(new Error(`FakePeerInteropService: unhandled request '${type.method}'`));
        }
    }

    /**
     * Rejects every pending request as if the connection was disposed, then fires the stored
     * close listener — mirrors what a real socket close does to in-flight requests.
     */
    dropConnection(): void {
        const pending = this.pendingRequests;
        this.pendingRequests = [];
        for (const p of pending) {
            p.reject(new ResponseError(ErrorCodes.PendingResponseRejected, 'Pending response rejected since connection got disposed'));
        }
        this.closeListener?.();
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
