import { EmptyFileSystem } from 'langium';
import { MessageConnection } from 'vscode-jsonrpc/node.js';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices, BBjServices } from '../src/language/bbj-module.js';
import { JavaInteropService } from '../src/language/java-interop.js';
import { JavaClass } from '../src/language/generated/ast.js';

/**
 * Coverage for the java-interop timeouts added in b25dad4 (#232, #492).
 *
 * The third strand of that fix: `getRawClass()` and the interop socket connect could
 * hang indefinitely when the Java backend was unresponsive, taking completion and
 * hover with them. Both now reject after 10s, and nothing pinned that.
 *
 * These use fake timers, so they assert the timeout fires without waiting 10s of
 * wall clock. What matters is that the promise settles at all — an unresponsive
 * backend must not be able to wedge a request forever.
 */

/** Exposes the protected members under test and never opens a real socket. */
class HangingBackendInterop extends JavaInteropService {
    public sendRequestCalls = 0;

    protected override async connect(): Promise<MessageConnection> {
        const connection = {
            sendRequest: () => {
                this.sendRequestCalls++;
                // The unresponsive backend: accepts the request, never answers.
                return new Promise<never>(() => { });
            }
        };
        return connection as unknown as MessageConnection;
    }

    public callGetRawClass(className: string): Promise<JavaClass> {
        return this.getRawClass(className);
    }

    public callCreateSocket(): Promise<unknown> {
        return this.createSocket();
    }
}

function newServices(): BBjServices {
    return createBBjServices(EmptyFileSystem).BBj;
}

describe('java-interop timeouts (#232)', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('getRawClass rejects when the Java backend never answers', async () => {
        vi.useFakeTimers();
        const interop = new HangingBackendInterop(newServices());

        const pending = interop.callGetRawClass('java.util.HashMap');
        const assertion = expect(pending).rejects.toThrow(/timeout/i);

        // The request is in flight and unanswered; only the timeout can settle it.
        await vi.advanceTimersByTimeAsync(10_000);
        await assertion;

        expect(interop.sendRequestCalls).toBe(1);
    });

    test('getRawClass stays pending before its timeout elapses', async () => {
        // Guards against a regression in the other direction: a timeout short enough to
        // cancel legitimate slow resolutions would make Java completion flaky.
        vi.useFakeTimers();
        const interop = new HangingBackendInterop(newServices());

        let settled = false;
        void interop.callGetRawClass('java.util.HashMap').catch(() => { settled = true; });

        await vi.advanceTimersByTimeAsync(9_000);
        expect(settled).toBe(false);

        await vi.advanceTimersByTimeAsync(2_000);
        expect(settled).toBe(true);
    });

    test('socket connect to an unreachable backend settles rather than hanging', async () => {
        // 192.0.2.0/24 is reserved for documentation (RFC 5737) and routes nowhere, so the
        // connect stays pending and the 10s guard is what ends it — that is the path taken
        // here. A sandboxed environment may instead refuse the address outright, which also
        // settles the promise, so a routing error counts as a pass too.
        vi.useFakeTimers();
        const interop = new HangingBackendInterop(newServices());
        interop.setConnectionConfig('192.0.2.1', 5008);

        const pending = interop.callCreateSocket();
        const assertion = expect(pending).rejects.toThrow(
            /timed out after 10s|ENETUNREACH|EHOSTUNREACH|ECONNREFUSED|ENETDOWN|EACCES|EPERM/
        );

        await vi.advanceTimersByTimeAsync(10_000);
        await assertion;
    });
});
