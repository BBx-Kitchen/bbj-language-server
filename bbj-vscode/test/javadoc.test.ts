
import fs from 'fs/promises';
import path from 'path';
import { describe, expect, test, vi } from 'vitest';
import { URI } from 'vscode-uri';
import { JavadocProvider, PackageDoc } from '../src/language/java-javadoc.js';

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
        // Mock console.error before each test
        vi.spyOn(console, 'error').mockImplementation(() => { });
        try {
            const javadocProvider = new class extends JavadocProviderUnderTest {
                protected override readFile(packageDocURI: URI): Promise<string> {
                    return Promise.resolve('{"name":"wrong.package.name"}');
                }
            }
            await javadocProvider.loadJavadocFile('test', URI.parse('file:///test.json'));
            // Assert that console.error was called with the expected message
            expect(console.error).toHaveBeenCalledWith("Failed to load javadoc file, package name 'wrong.package.name' does not match file name file:///test.json");
        } finally {
            // Restore console.error after each test
            vi.restoreAllMocks();
        }
    })

    test('Check package name matches file name.', async () => {
        // Mock console.error before each test
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
            // Restore console.error after each test
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

})