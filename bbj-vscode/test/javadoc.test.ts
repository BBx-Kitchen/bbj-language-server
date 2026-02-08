
import fs from 'fs/promises';
import path from 'path';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { URI } from 'vscode-uri';
import { EmptyFileSystemProvider, FileSystemNode } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { JavadocProvider, PackageDoc } from '../src/language/java-javadoc.js';
import { logger, LogLevel } from '../src/language/logger.js';

class JavadocProviderUnderTest extends JavadocProvider {
    constructor() {
        super();
    }
    override async loadJavadocFile(packageName: string, packageDocURI: URI): Promise<PackageDoc | null> {
        return super.loadJavadocFile(packageName, packageDocURI);
    }
}

describe('Javadoc tests', () => {

    test('Check initialize called', async () => {
        const javadocProvider = JavadocProvider.getInstance();
        await expect(javadocProvider.getPackageDoc('test'))
            .rejects
            .toThrow('JavadocProvider not initialized. Call initialize() first.');
    })

    test('Check package name matches file name.', async () => {
        // Mock console.error to capture logger.error output (which delegates to console.error)
        vi.spyOn(console, 'error').mockImplementation(() => { });
        try {
            const javadocProvider = new class extends JavadocProviderUnderTest {
                protected override readFile(packageDocURI: URI): Promise<string> {
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
                protected override readFile(packageDocURI: URI): Promise<string> {
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
            protected override async readFile(packageDocURI: URI): Promise<string> {
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
                override async readDirectory(uri: URI): Promise<FileSystemNode[]> {
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
                override async readDirectory(uri: URI): Promise<FileSystemNode[]> {
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