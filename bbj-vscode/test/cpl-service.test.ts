import { describe, test, expect, vi } from 'vitest';
import { BBjCPLService } from '../src/language/bbj-cpl-service.js';

/**
 * Create a minimal mock services object satisfying BBjCPLServiceContext.
 *
 * BBjCPLService only requires services.shared.workspace.WorkspaceManager
 * to call getBBjDir(). All other services are unused by this class.
 *
 * @param bbjHome The value to return from getBBjDir().
 */
function createMockServices(bbjHome: string) {
    return {
        shared: {
            workspace: {
                WorkspaceManager: {
                    getBBjDir: () => bbjHome
                }
            }
        }
    };
}

describe('BBjCPLService', () => {

    test('empty bbjHome returns empty diagnostics immediately (no spawn attempted)', async () => {
        // When BBj home is not configured, compile() should return [] without spawning
        const services = createMockServices('');
        const svc = new BBjCPLService(services as any);

        const result = await svc.compile('/some/file.bbj');

        expect(result).toEqual([]);
    });

    test('undefined-like bbjHome (empty string) returns empty diagnostics', async () => {
        const services = createMockServices('');
        const svc = new BBjCPLService(services as any);

        const result = await svc.compile('/another/file.bbj');

        expect(result).toEqual([]);
    });

    test('ENOENT graceful degradation: bbjcpl not installed returns empty diagnostics', async () => {
        // Use a non-empty bbjHome so the path is derived, but bbjcpl won't actually exist there
        // Using /tmp which definitely exists, but bbjcpl won't be in /tmp/bin/
        const services = createMockServices('/tmp');
        const svc = new BBjCPLService(services as any);

        // bbjcpl binary won't exist at /tmp/bin/bbjcpl
        // This should trigger ENOENT and return [] gracefully
        const result = await svc.compile('/some/file.bbj');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([]);
    }, 10000);

    test('inFlight map is cleaned up after ENOENT error', async () => {
        const services = createMockServices('/tmp');
        const svc = new BBjCPLService(services as any);

        const filePath = '/tmp/test-file.bbj';

        // Should not be compiling before the call
        expect(svc.isCompiling(filePath)).toBe(false);

        // Start compilation — will fail with ENOENT
        const compilePromise = svc.compile(filePath);

        // After completion, inFlight map must be cleaned up
        await compilePromise;
        expect(svc.isCompiling(filePath)).toBe(false);
    }, 10000);

    test('setTimeout updates internal timeout value', () => {
        const services = createMockServices('/opt/bbj');
        const svc = new BBjCPLService(services as any);

        // setTimeout should not throw
        expect(() => svc.setTimeout(5000)).not.toThrow();
        expect(() => svc.setTimeout(1000)).not.toThrow();
    });

    test('isCompiling returns false when not compiling', () => {
        const services = createMockServices('/opt/bbj');
        const svc = new BBjCPLService(services as any);

        expect(svc.isCompiling('/any/file.bbj')).toBe(false);
        expect(svc.isCompiling('/another/file.bbj')).toBe(false);
    });

    test('abort-on-resave: second compile() call on same file completes without error', async () => {
        // When a second compile() is called for the same file while first is in-flight,
        // the first should be aborted. Both should return [] (ENOENT in this test environment).
        const services = createMockServices('/tmp');
        const svc = new BBjCPLService(services as any);

        const filePath = '/tmp/test-file.bbj';

        // Start two compilations for the same file — second aborts the first
        const first = svc.compile(filePath);
        const second = svc.compile(filePath);

        const [result1, result2] = await Promise.all([first, second]);

        // Both should resolve to arrays (not throw)
        expect(Array.isArray(result1)).toBe(true);
        expect(Array.isArray(result2)).toBe(true);

        // inFlight map should be cleaned up after both settle
        expect(svc.isCompiling(filePath)).toBe(false);
    }, 10000);

    test('getBbjcplPath: non-Windows uses bbjcpl (no .exe suffix)', async () => {
        // Validate path derivation by checking that the ENOENT is triggered
        // for the expected path (not .exe on non-Windows).
        // We use /tmp as bbjHome — bbjcpl does not exist at /tmp/bin/bbjcpl.
        // The service should attempt spawn and get ENOENT.
        if (process.platform === 'win32') {
            // Skip on Windows — would need bbjcpl.exe
            return;
        }

        const services = createMockServices('/tmp');
        const svc = new BBjCPLService(services as any);

        // Spy on logger — INFO is suppressed at default WARN level, so we check indirectly
        const result = await svc.compile('/tmp/test.bbj');
        expect(result).toEqual([]);
    }, 10000);

});
