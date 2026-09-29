
import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, expect, test, vi } from 'vitest';
import { URI } from 'vscode-uri';
import { EmptyFileSystem, EmptyFileSystemProvider, FileSystemNode } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { createBBjServices } from '../src/language/bbj-module.js';
import { JavadocProvider, PackageDoc } from '../src/language/java-javadoc.js';
import { logger, LogLevel } from '../src/language/logger.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { createFakePeerServices } from './fake-interop-peer.js';

class JavadocProviderUnderTest extends JavadocProvider {
    constructor(lazyLoad: boolean = true) {
        super(lazyLoad);
    }
    override async loadJavadocFile(packageName: string, packageDocURI: URI): Promise<PackageDoc | null> {
        return super.loadJavadocFile(packageName, packageDocURI);
    }
}

describe('Javadoc tests', () => {

    test('Check initialize called', async () => {
        const javadocProvider = new JavadocProvider();
        await expect(javadocProvider.getPackageDoc('test'))
            .rejects
            .toThrow('JavadocProvider not initialized. Call initialize() first.');
    })

    test('Check package name matches file name.', async () => {
        // Mock console.error to capture logger.error output (which delegates to console.error)
        vi.spyOn(console, 'error').mockImplementation(() => { });
        try {
            const javadocProvider = new class extends JavadocProviderUnderTest {
                protected override readFile(_packageDocURI: URI): Promise<string> {
                    return Promise.resolve('{"name":"wrong.package.name"}');
                }
            }
            await javadocProvider.loadJavadocFile('test', URI.parse('file:///test.json'));
            // Assert that logger.error was called (delegates to console.error)
            expect(console.error).toHaveBeenCalledWith("Failed to load javadoc file, package name 'wrong.package.name' does not match file name file:///test.json");
        } finally {
            vi.restoreAllMocks();
        }
    })

    test('Check package name matches file name.', async () => {
        // Mock console.error to capture logger.error output (which delegates to console.error)
        vi.spyOn(console, 'error').mockImplementation(() => { });
        try {
            const javadocProvider = new class extends JavadocProviderUnderTest {
                protected override readFile(_packageDocURI: URI): Promise<string> {
                    return Promise.resolve('{"name":"wrong.package.name"}');
                }
            }
            await javadocProvider.loadJavadocFile('test', URI.parse('file:///test.json'));
            expect(console.error).toHaveBeenCalledWith("Failed to load javadoc file, package name 'wrong.package.name' does not match file name file:///test.json");
        } finally {
            vi.restoreAllMocks();
        }
    })

    test('Check package documentation loaded.', async () => {
        const javadocProvider = new class extends JavadocProviderUnderTest {
            protected override async readFile(_packageDocURI: URI): Promise<string> {
                const filePath = path.resolve(__dirname, '../test/test-data/com.basis.util.json');
                return await fs.readFile(filePath, 'utf8');
            }
        }
        const javadoc = await javadocProvider.loadJavadocFile('com.basis.util', URI.parse('file:///com.basis.util.json'));
        expect(javadoc).not.toBeNull();
        expect(javadoc!.name).equals('com.basis.util');
        expect(javadoc!.classes).toHaveLength(1);
        expect(javadoc!.classes[0].name).equals('BBjStringConverter');
        expect(javadoc!.classes[0].methods).toHaveLength(1);
        expect(javadoc!.classes[0].methods[0].params).toHaveLength(1);
        expect(javadoc!.classes[0].fields).toHaveLength(1);
    })

    test('initialize shows no per-path errors, only summary warning when all fail', async () => {
        // Mock logger.warn to capture warning calls
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        logger.setLevel(LogLevel.WARN);

        try {
            // Create a provider that fails on all readDirectory calls
            const failingProvider = new class extends JavadocProviderUnderTest {
                constructor() {
                    super(false); // non-lazy to trigger immediate loading
                }
            };

            // Create a filesystem that always fails
            const failingFs = new class extends EmptyFileSystemProvider {
                override async readDirectory(_uri?: URI): Promise<FileSystemNode[]> {
                    throw new Error('Directory not accessible');
                }
            };

            await failingProvider.initialize(
                [URI.file('/fake/path1'), URI.file('/fake/path2')],
                failingFs,
                CancellationToken.None
            );

            // Should have exactly one warn call with the aggregated message
            const warnCalls = warnSpy.mock.calls.filter(call =>
                call[0].includes('Javadoc: no sources accessible')
            );
            expect(warnCalls).toHaveLength(1);
            expect(warnCalls[0][0]).toContain('tried 2 path(s)');
            expect(warnCalls[0][0]).toContain('Javadoc tooltips will be unavailable');
        } finally {
            vi.restoreAllMocks();
        }
    })

    test('initialize shows no warning when at least one source succeeds', async () => {
        // Mock logger.warn to capture warning calls
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        logger.setLevel(LogLevel.WARN);

        try {
            // Create a provider that succeeds on second path
            const mixedProvider = new class extends JavadocProviderUnderTest {
                constructor() {
                    super(false); // non-lazy
                }
            };

            // Create a filesystem that fails on first path, succeeds on second
            let callCount = 0;
            const mixedFs = new class extends EmptyFileSystemProvider {
                override async readDirectory(_uri?: URI): Promise<FileSystemNode[]> {
                    callCount++;
                    if (callCount === 1) {
                        throw new Error('First directory not accessible');
                    }
                    // Second call succeeds with empty directory
                    return [];
                }
            };

            await mixedProvider.initialize(
                [URI.file('/fake/path1'), URI.file('/fake/path2')],
                mixedFs,
                CancellationToken.None
            );

            // Should have NO aggregated warning (partial success = silent)
            const warnCalls = warnSpy.mock.calls.filter(call =>
                call[0].includes('no sources accessible')
            );
            expect(warnCalls).toHaveLength(0);
        } finally {
            vi.restoreAllMocks();
        }
    })

})

/** A fake file system whose one root directory holds exactly one `<packageName>.json` file. */
class PackageFileSystem extends EmptyFileSystemProvider {
    public readFileCallCount = 0;

    constructor(private readonly packageName: string) {
        super();
    }

    override async readDirectory(): Promise<FileSystemNode[]> {
        return [{ isFile: true, isDirectory: false, uri: URI.parse(`file:///javadoc/${this.packageName}.json`) }];
    }

    override async readFile(): Promise<string> {
        this.readFileCallCount++;
        return JSON.stringify({ name: this.packageName, classes: [] });
    }
}

/** A minimal Java class DTO shape, as `JavaInteropService`'s protected `resolveClass` accepts. */
interface MinimalJavaClassDto {
    name: string;
    packageName: string;
    fields: unknown[];
    methods: Array<{ name: string, returnType: string, parameters: unknown[] }>;
    constructors: unknown[];
    classes: unknown[];
    deprecated: boolean;
}

/** Structural view onto `JavaInteropService`'s protected `resolveClass`, reached via cast. */
interface ResolvableInterop {
    resolveClass(javaClass: MinimalJavaClassDto): Promise<unknown>;
}

describe('Independent JavadocProvider instances (#624)', () => {

    test('Two createBBjServices sets hand out distinct JavadocProvider objects', () => {
        const first = createBBjServices(EmptyFileSystem).BBj;
        const second = createBBjServices(EmptyFileSystem).BBj;
        expect(first.java.JavadocProvider).not.toBe(second.java.JavadocProvider);
    })

    test('Initialising one services set leaves a second, independently built services set uninitialised', async () => {
        const first = createBBjServices(EmptyFileSystem).BBj;
        const second = createBBjServices(EmptyFileSystem).BBj;
        await first.java.JavadocProvider.initialize([URI.parse('file:///javadoc')], new PackageFileSystem('com.alpha'));

        expect(second.java.JavadocProvider.isInitialized()).toBe(false);
        await expect(second.java.JavadocProvider.getPackageDoc('com.alpha'))
            .rejects
            .toThrow('JavadocProvider not initialized. Call initialize() first.');
    })

    test('Two independently initialised providers answer only their own package and read only their own file system', async () => {
        const first = createBBjServices(EmptyFileSystem).BBj;
        const second = createBBjServices(EmptyFileSystem).BBj;
        const alphaFs = new PackageFileSystem('com.alpha');
        const betaFs = new PackageFileSystem('com.beta');
        await first.java.JavadocProvider.initialize([URI.parse('file:///javadoc')], alphaFs);
        await second.java.JavadocProvider.initialize([URI.parse('file:///javadoc')], betaFs);

        expect((await first.java.JavadocProvider.getPackageDoc('com.alpha'))?.name).toBe('com.alpha');
        expect(await first.java.JavadocProvider.getPackageDoc('com.beta')).toBeUndefined();
        expect((await second.java.JavadocProvider.getPackageDoc('com.beta'))?.name).toBe('com.beta');
        expect(await second.java.JavadocProvider.getPackageDoc('com.alpha')).toBeUndefined();

        expect(alphaFs.readFileCallCount).toBe(1);
        expect(betaFs.readFileCallCount).toBe(1);
    })

    test('A second initialize() on one provider rejects without touching the other', async () => {
        const first = createBBjServices(EmptyFileSystem).BBj;
        const second = createBBjServices(EmptyFileSystem).BBj;
        const alphaFs = new PackageFileSystem('com.alpha');
        const betaFs = new PackageFileSystem('com.beta');
        await first.java.JavadocProvider.initialize([URI.parse('file:///javadoc')], alphaFs);
        await second.java.JavadocProvider.initialize([URI.parse('file:///javadoc')], betaFs);

        await expect(first.java.JavadocProvider.initialize([URI.parse('file:///javadoc')], alphaFs))
            .rejects
            .toThrow('JavadocProvider already initialized');
        expect((await second.java.JavadocProvider.getPackageDoc('com.beta'))?.name).toBe('com.beta');
    })

    test('Resolving a scripted class through one services set consults only that set\'s provider', async () => {
        const first = createBBjTestServices(EmptyFileSystem);
        const second = createBBjTestServices(EmptyFileSystem);
        const dto: MinimalJavaClassDto = {
            name: 'com.test.Documented',
            packageName: 'com.test',
            fields: [],
            methods: [{ name: 'go', returnType: 'void', parameters: [] }],
            constructors: [],
            classes: [],
            deprecated: false
        };
        const firstInterop = first.BBj.java.JavaInteropService as unknown as ResolvableInterop;
        const firstSpy = vi.spyOn(first.BBj.java.JavadocProvider, 'getDocumentation');
        const secondSpy = vi.spyOn(second.BBj.java.JavadocProvider, 'getDocumentation');
        // JavaInteropTestService's constructor kicks off its own (unawaited) preload of fifteen
        // fake classes, so each spy also sees unrelated leftover calls from its own set's
        // construction. The assertion below checks specifically for `dto`'s own name rather than
        // "called at all", so it stays correct regardless of that unrelated background activity.
        try {
            await firstInterop.resolveClass(dto);
            const calledWithDto = (spy: typeof firstSpy) => spy.mock.calls.some(call => (call[0] as { name?: string }).name === dto.name);
            expect(calledWithDto(firstSpy)).toBe(true);
            expect(calledWithDto(secondSpy)).toBe(false);
        } finally {
            vi.restoreAllMocks();
        }
    })

    test('createBBjTestServices and createFakePeerServices each hand out a synchronously-initialised provider, built on the same createInitializedJavadocProvider primitive', () => {
        const testServices = createBBjTestServices(EmptyFileSystem);
        expect(testServices.BBj.java.JavadocProvider.isInitialized()).toBe(true);

        const fakePeer = createFakePeerServices();
        expect(fakePeer.BBj.java.JavadocProvider.isInitialized()).toBe(true);
    })

    test('A fresh provider initialises synchronously with no roots, before any await', () => {
        const provider = new JavadocProvider();
        expect(provider.isInitialized()).toBe(false);
        void provider.initialize([], new EmptyFileSystemProvider());
        expect(provider.isInitialized()).toBe(true);
    })

})
