import { DeepPartial, DocumentValidator, inject, LangiumDocument, Module } from 'langium';
import { createDefaultModule, createDefaultSharedModule, LangiumSharedServices, PartialLangiumServices } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { parseHelper } from 'langium/test';
import { Socket } from 'net';
import { beforeAll, describe, expect, test } from 'vitest';
import { CancellationToken, MessageConnection, RequestType, ResponseError } from 'vscode-jsonrpc/node.js';
import { CodeAction, CodeActionParams, Diagnostic } from 'vscode-languageserver';
import { Model } from '../../src/language/generated/ast.js';
import { BBjAddedServices, BBjModule, BBjServices, BBjSharedModule } from '../../src/language/bbj-module.js';
import { BBjGeneratedModule, BBjGeneratedSharedModule } from '../../src/language/generated/module.js';
import { JavaInteropService, METHOD_NOT_FOUND } from '../../src/language/java-interop.js';
import { JavadocProvider } from '../../src/language/java-javadoc.js';
import { registerValidationChecks } from '../../src/language/bbj-validator.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';
import { createFakePeerServices } from '../fake-interop-peer.js';

/** One request observed on the wire, plus what actually came back (or a forced answer). */
interface WireRecord {
    method: string;
    params: unknown;
    outcome:
        | { status: 'fulfilled'; isArray: boolean; length: number | undefined }
        | { status: 'rejected'; code: number | undefined };
}

/**
 * `JavaInteropService` test double for the LIVE backend: every request still reaches the real
 * socket and gets the real answer, except any method named in `methodNotFoundFor`, which is
 * answered with a `MethodNotFound` error without ever touching the socket. Every request --
 * forced or real -- is recorded with its outcome, so a test can judge the client's behaviour
 * against what was actually observed on the wire instead of an assumption about it.
 */
class WireRecordingInteropService extends JavaInteropService {
    public readonly records: WireRecord[] = [];
    private readonly methodNotFoundFor: ReadonlySet<string>;

    constructor(services: BBjServices, methodNotFoundFor: Iterable<string> = []) {
        super(services);
        this.methodNotFoundFor = new Set(methodNotFoundFor);
    }

    protected override wrapSocket(socket: Socket): MessageConnection {
        const real = super.wrapSocket(socket);
        const records = this.records;
        const forced = this.methodNotFoundFor;
        return new Proxy(real, {
            get(target, prop, receiver) {
                if (prop === 'sendRequest') {
                    return (type: RequestType<unknown, unknown, unknown>, params: unknown, token?: CancellationToken): Promise<unknown> => {
                        const method = type.method;
                        if (forced.has(method)) {
                            records.push({ method, params, outcome: { status: 'rejected', code: METHOD_NOT_FOUND } });
                            return Promise.reject(new ResponseError(METHOD_NOT_FOUND, `Method not found: ${method}`));
                        }
                        return target.sendRequest(type, params, token).then(
                            result => {
                                const isArray = Array.isArray(result);
                                records.push({ method, params, outcome: { status: 'fulfilled', isArray, length: isArray ? (result as unknown[]).length : undefined } });
                                return result;
                            },
                            (error: unknown) => {
                                const code = (error as { code?: number } | undefined)?.code;
                                records.push({ method, params, outcome: { status: 'rejected', code } });
                                throw error;
                            }
                        );
                    };
                }
                const value = Reflect.get(target, prop, receiver);
                return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
            }
        });
    }
}

/** Builds a full BBj service set, against `NodeFileSystem`, with the `JavaInteropService` swapped for {@link WireRecordingInteropService}. */
function createWireRecordingServices(methodNotFoundFor: Iterable<string> = []): { shared: LangiumSharedServices; BBj: BBjServices; interop: WireRecordingInteropService } {
    const WireRecordingModule: Module<BBjServices, PartialLangiumServices & DeepPartial<BBjAddedServices>> = {
        java: {
            JavaInteropService: (services) => new WireRecordingInteropService(services, methodNotFoundFor)
        }
    };
    const shared = inject(
        createDefaultSharedModule(NodeFileSystem),
        BBjGeneratedSharedModule,
        BBjSharedModule
    );
    const BBj = inject(
        createDefaultModule({ shared }),
        BBjGeneratedModule,
        BBjModule,
        WireRecordingModule
    );
    shared.ServiceRegistry.register(BBj);
    registerValidationChecks(BBj);
    return { shared, BBj, interop: BBj.java.JavaInteropService as WireRecordingInteropService };
}

/**
 * Verification for issue #447 (suggest missing `use` statements) across three layers of
 * confidence in the getAllClassNames class-index capability:
 *   1. A definitive test against the LIVE java-interop service on :5008: the client's
 *      capability is judged against the request actually observed on the wire, rather than
 *      an invariant that holds regardless of what the backend answers.
 *   2. A forced-fallback test against the live backend: a test-only connection wrapper makes
 *      getAllClassNames answer MethodNotFound while every other request still reaches the
 *      real socket, exercising the real fallback latch and the curated-package probe against
 *      the real classpath.
 *   3. An ungated, hermetic forced-fallback case built on the scriptable fake peer
 *      (fake-interop-peer.ts), which always answers getAllClassNames with MethodNotFound, so
 *      the fallback latch and probe are pinned deterministically in every environment,
 *      including CI with nothing listening on :5008.
 * The existing code-action test (layer 1) is unaffected in substance.
 */
describe('Issue #447 - suggest missing use statements (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const services = createWireRecordingServices();
    const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

    beforeAll(async () => {
        if (!run) return;
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
        services.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(services.shared);
    }, 120000);

    function linkingErrors(document: LangiumDocument) {
        return document.diagnostics?.filter(err => err.data?.code === DocumentValidator.LinkingError) ?? [];
    }

    test.runIf(run)('capability is judged from the answer actually observed on the wire, not an invariant that holds either way', async () => {
        const interop = services.interop;
        const hasCompleteIndex = await interop.ensureCompleteClassIndex();
        const record = interop.records.find(r => r.method === 'getAllClassNames');
        expect(record).toBeDefined();

        if (record!.outcome.status === 'fulfilled') {
            // The deployed backend exposes the augmented endpoint: the answer was an array, the
            // client reports a complete index, a second call makes no further request, and the
            // simple-name lookup is answered from the index with no getClassInfo probe.
            expect(record!.outcome.isArray).toBe(true);
            expect(hasCompleteIndex).toBe(true);
            expect(interop.hasCompleteClassIndex()).toBe(true);

            const beforeSecondCall = interop.records.length;
            await interop.ensureCompleteClassIndex();
            expect(interop.records.slice(beforeSecondCall).some(r => r.method === 'getAllClassNames')).toBe(false);

            const beforeLookup = interop.records.length;
            const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
            expect(candidates).toContain('java.util.HashMap');
            expect(interop.records.slice(beforeLookup).some(r => r.method === 'getClassInfo')).toBe(false);
        } else if (record!.outcome.status === 'rejected' && record!.outcome.code === METHOD_NOT_FOUND) {
            // The deployed backend predates the augmented endpoint: the client reports no
            // complete index, and the simple-name lookup falls back to the curated-package
            // getClassInfo probe (and still resolves java.util.HashMap).
            expect(hasCompleteIndex).toBe(false);
            expect(interop.hasCompleteClassIndex()).toBe(false);

            const beforeLookup = interop.records.length;
            const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
            expect(interop.records.slice(beforeLookup).some(r => r.method === 'getClassInfo')).toBe(true);
            expect(candidates).toContain('java.util.HashMap');
        } else {
            throw new Error(`Unexpected getAllClassNames outcome from the live backend: ${JSON.stringify(record!.outcome)}`);
        }
    }, 60000);

    test.runIf(run)("offers 'use java.util.HashMap' for an unresolved HashMap reference", async () => {
        const doc = await validate('hm! = new HashMap()\n');
        const linking = linkingErrors(doc);
        expect(linking.some(d => Diagnostic.getMessageString(d).includes('HashMap'))).toBe(true);

        const params: CodeActionParams = {
            textDocument: { uri: doc.textDocument.uri },
            range: linking[0].range,
            context: { diagnostics: linking }
        };
        const actions = (await services.BBj.lsp.CodeActionProvider!.getCodeActions(doc, params) ?? []) as CodeAction[];
        expect(actions.map(a => a.title)).toContain("Add 'use java.util.HashMap'");
    }, 60000);
});

/**
 * Layer 2: forced fallback against the LIVE backend. A `WireRecordingInteropService` forces
 * `getAllClassNames` to answer MethodNotFound while every other request -- including the
 * curated-package `getClassInfo` probe below -- still reaches the real socket and gets the
 * real backend's answer, exercising the real fallback latch and probe against the real
 * classpath, not a hermetic double.
 */
describe('Issue #447 - forced fallback with a live backend (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const services = createWireRecordingServices(['getAllClassNames']);

    beforeAll(async () => {
        if (!run) return;
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
        services.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(services.shared);
    }, 120000);

    test.runIf(run)('a forced MethodNotFound latches once and the probe resolves java.util.HashMap from the real classpath but not java.util.concurrent.HashMap', async () => {
        const interop = services.interop;

        const first = await interop.ensureCompleteClassIndex();
        expect(first).toBe(false);
        const second = await interop.ensureCompleteClassIndex();
        expect(second).toBe(false);
        expect(interop.hasCompleteClassIndex()).toBe(false);
        expect(interop.records.filter(r => r.method === 'getAllClassNames')).toHaveLength(1);

        const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
        expect(candidates).toContain('java.util.HashMap');
        expect(candidates).not.toContain('java.util.concurrent.HashMap');
        expect(interop.records.some(r =>
            r.method === 'getClassInfo' && (r.params as { className: string }).className === 'java.util.concurrent.HashMap'
        )).toBe(true);
    }, 60000);
});

/**
 * Layer 3: hermetic forced fallback. Runs everywhere, including CI with nothing on :5008 --
 * the scriptable fake peer always answers getAllClassNames with a MethodNotFound error
 * (fake-interop-peer.ts), so this pins the real fallback latch and the curated-package probe
 * deterministically, independent of whether a real backend is reachable.
 */
describe('Issue #447 - forced fallback with no backend (hermetic)', () => {
    test('a getAllClassNames MethodNotFound latches once and the candidate probe still resolves java.util.HashMap', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;

        const first = await interop.ensureCompleteClassIndex();
        expect(first).toBe(false);
        const second = await interop.ensureCompleteClassIndex();
        expect(second).toBe(false);
        expect(interop.hasCompleteClassIndex()).toBe(false);
        expect(interop.sentRequests.filter(r => r.method === 'getAllClassNames')).toHaveLength(1);

        const beforeProbe = interop.sentRequests.length;
        const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
        const classInfoNames = interop.sentRequests.slice(beforeProbe)
            .filter(r => r.method === 'getClassInfo')
            .map(r => (r.params as { className: string }).className);
        expect(classInfoNames).toContain('java.util.HashMap');
        expect(classInfoNames).toContain('java.io.HashMap');
        expect(candidates).toContain('java.util.HashMap');
        expect(interop.sentRequests.filter(r => r.method === 'getAllClassNames')).toHaveLength(1);
    });

    test('a seeded index answers without probing', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        interop.seedCompleteClassIndex(['java.util.HashMap']);

        const beforeProbe = interop.sentRequests.length;
        const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
        expect(candidates).toEqual(['java.util.HashMap']);
        expect(interop.sentRequests.slice(beforeProbe).some(r => r.method === 'getClassInfo')).toBe(false);
    });
});
