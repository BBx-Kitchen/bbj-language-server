import { NodeFileSystem } from 'langium/node';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { CancellationToken } from 'vscode-jsonrpc/node.js';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { JavaClass } from '../../src/language/generated/ast.js';
import { canonicalJavaClassName, isLocalJavaTypeName } from '../../src/language/java-interop.js';
import { JavadocProvider } from '../../src/language/java-javadoc.js';
import { LogLevel, logger } from '../../src/language/logger.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';

/**
 * End-to-end verification of ROADMAP criteria 4 and 5 against the LIVE java-interop service (real
 * JDK classpath, not the fake test classpath). Skipped unless a java-interop service is reachable
 * on :5008 (or RUN_BBJ_TESTS is set). A real cold start — workspace initialization plus implicit
 * imports — must send no `getClassInfo` request and write no `Resolving class` debug line for a
 * primitive, `void`, array or blank name (issue #660), and must never request one class under two
 * spellings (issue #659), proven on `java.util.AbstractMap.SimpleEntry` / `java.util.AbstractMap$SimpleEntry`.
 */
describe('Java class lookups against the real backend (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const services = createBBjServices(NodeFileSystem);
    const interop = services.BBj.java.JavaInteropService;

    /** Structural view onto the interop service's protected getRawClass, reached via cast. */
    type InteropPrivates = {
        getRawClass(className: string, token?: CancellationToken): Promise<JavaClass>;
    };

    const NESTED_DOTTED = 'java.util.AbstractMap.SimpleEntry';
    const NESTED_BINARY = 'java.util.AbstractMap$SimpleEntry';

    const requestedSpellings: string[] = [];
    const debugLines: string[] = [];
    let consoleLogSpy: ReturnType<typeof vi.spyOn> | undefined;

    beforeAll(async () => {
        if (!run) return;
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
        }
        interop.setConnectionConfig('127.0.0.1', 5008);
        logger.setLevel(LogLevel.DEBUG);

        // Collect every debug line instead of letting it reach the terminal.
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
            if (typeof message === 'string') {
                debugLines.push(message);
            }
        });

        // Record every spelling sent to the backend, while still letting the real request through
        // (a structural cast reaches the protected method, mirroring bbj-parser-service.test.ts's
        // BuilderPrivates pattern).
        const privates = interop as unknown as InteropPrivates;
        const originalGetRawClass = privates.getRawClass.bind(interop);
        vi.spyOn(privates, 'getRawClass').mockImplementation(async (className: string, token?: CancellationToken) => {
            requestedSpellings.push(className);
            return originalGetRawClass(className, token);
        });

        await initializeWorkspace(services.shared);
        if (!interop.getResolvedClass('BBjAPI')) {
            await interop.loadImplicitImports();
        }

        await interop.resolveClassByName(NESTED_DOTTED);
        await interop.resolveClassByName(NESTED_BINARY);
    }, 300000);

    afterAll(() => {
        consoleLogSpy?.mockRestore();
        logger.setLevel(LogLevel.WARN);
    });

    test.runIf(run)('sends no request and logs no lookup for primitive, void, array or blank names', () => {
        const localSpellings = requestedSpellings.filter(isLocalJavaTypeName);
        expect(localSpellings).toEqual([]);

        const localDebugLines = debugLines.filter(line => {
            const match = /^\[debug\] Resolving class (.+?):/.exec(line);
            return match ? isLocalJavaTypeName(match[1]) : false;
        });
        expect(localDebugLines).toEqual([]);

        // Sanity: the spies actually observed real cold-start traffic.
        expect(requestedSpellings.length).toBeGreaterThan(0);
        expect(debugLines.some(line => line.startsWith('[debug] Resolving class '))).toBe(true);
    }, 60000);

    test.runIf(run)('never requests one class under two spellings', () => {
        const spellingsByCanonicalKey = new Map<string, Set<string>>();
        for (const spelling of requestedSpellings) {
            const key = canonicalJavaClassName(spelling);
            if (!spellingsByCanonicalKey.has(key)) {
                spellingsByCanonicalKey.set(key, new Set());
            }
            spellingsByCanonicalKey.get(key)!.add(spelling);
        }
        for (const [key, spellings] of spellingsByCanonicalKey) {
            expect(spellings.size, `canonical key ${key} requested under: ${[...spellings].join(', ')}`).toBe(1);
        }
    }, 60000);

    test.runIf(run)('resolves a nested class once for both spellings', () => {
        const canonicalKey = canonicalJavaClassName(NESTED_DOTTED);
        const countForKey = requestedSpellings.filter(spelling => canonicalJavaClassName(spelling) === canonicalKey).length;
        expect(countForKey).toBeLessThanOrEqual(1);

        const dotted = interop.getResolvedClass(NESTED_DOTTED);
        const binary = interop.getResolvedClass(NESTED_BINARY);
        expect(dotted).toBeDefined();
        expect(dotted).toBe(binary);
        expect(dotted?.methods?.some(m => m.name.toLowerCase() === 'getkey')).toBe(true);
    }, 60000);
});
