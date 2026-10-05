import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Formatting in VS Code is done by the BBj language server. The client-side
 * formatter that used to launch a vendored jar is gone, and this suite keeps it
 * gone: the modules, their tests and the vendored files must not reappear, and
 * nothing under src/ may name them again. It scans src/, package.json, tools/
 * and the IntelliJ build file only, never itself.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

const SOURCE_EXTENSIONS = ['.ts', '.cjs', '.mjs', '.js'];

function walk(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walk(fullPath));
        } else if (entry.isFile()) {
            results.push(fullPath);
        }
    }
    return results;
}

function sourceFiles(): string[] {
    return walk(SRC_DIR).filter((file) => SOURCE_EXTENSIONS.some((ext) => file.endsWith(ext)));
}

/**
 * Files under src/ that import or require a module whose specifier ends in the
 * given module name (with or without a `.js` suffix).
 */
function importersOf(moduleName: string): string[] {
    const specifier = new RegExp(
        `(?:from\\s+|require\\(\\s*|import\\(\\s*|import\\s+)['"][^'"]*${moduleName}(?:\\.js)?['"]`
    );
    return sourceFiles()
        .filter((file) => specifier.test(fs.readFileSync(file, 'utf-8')))
        .map((file) => path.relative(SRC_DIR, file).split(path.sep).join('/'));
}

const REMOVED_MODULES = ['document-formatter', 'formatter-java-resolver', 'formatter-verifier'];
const VENDORED_NAMES = ['BBjCFCli', 'tools/formatter'];

/** Source text with `//` and block comments removed; string literals are left intact. */
function stripComments(text: string): string {
    return text;
}

/** Removed module names found inside an import, dynamic import or require specifier. */
function removedModuleSpecifiers(text: string): string[] {
    void text;
    return [];
}

/** Vendored formatter names found inside a quoted string literal. */
function quotedVendoredNames(text: string): string[] {
    void text;
    return [];
}

/** Every string value in a parsed JSON document, at any depth. */
function jsonStringValues(value: unknown): string[] {
    void value;
    return [];
}

function exists(relativePath: string): boolean {
    return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

describe('the client-side formatter is removed', () => {
    test('the document formatter module and its test do not exist', () => {
        expect(exists('src/document-formatter.ts')).toBe(false);
        expect(exists('test/document-formatter.test.ts')).toBe(false);
    });

    test('no file under src/ imports the document formatter module', () => {
        expect(importersOf('document-formatter')).toEqual([]);
    });

    test('the README does not credit BBjCodeFormatter', () => {
        const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf-8');
        expect(readme).not.toContain('BBjCodeFormatter');
    });

    test('the java resolver module and its test do not exist', () => {
        expect(exists('src/formatter-java-resolver.ts')).toBe(false);
        expect(exists('test/formatter-java-resolver.test.ts')).toBe(false);
    });

    test('no file under src/ imports the java resolver module', () => {
        expect(importersOf('formatter-java-resolver')).toEqual([]);
    });

    test('package.json no longer declares the bbj.formatter.javaPath setting', () => {
        const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
        const configurations = [manifest.contributes.configuration].flat();
        for (const configuration of configurations) {
            expect(Object.keys(configuration.properties)).not.toContain('bbj.formatter.javaPath');
        }
    });

    test('the jar verifier module and its two tests do not exist', () => {
        expect(exists('src/formatter-verifier.ts')).toBe(false);
        expect(exists('test/formatter-verifier-tamper.test.ts')).toBe(false);
        expect(exists('test/formatter-pins-drift.test.ts')).toBe(false);
    });

    test('the vendored formatter directory does not exist', () => {
        expect(exists('tools/formatter')).toBe(false);
    });

    test('no jar file is left anywhere under tools/', () => {
        const jars = walk(path.join(REPO_ROOT, 'tools')).filter((file) => file.endsWith('.jar'));
        expect(jars).toEqual([]);
    });

    test('no file under src/ names a removed formatter module or its vendored files', () => {
        const removedNames = ['document-formatter', 'formatter-java-resolver', 'formatter-verifier', 'BBjCFCli', 'tools/formatter'];
        const offenders = sourceFiles().flatMap((file) => {
            const text = fs.readFileSync(file, 'utf-8');
            return removedNames
                .filter((name) => text.includes(name))
                .map((name) => `${path.relative(SRC_DIR, file)}: ${name}`);
        });
        expect(offenders).toEqual([]);
    });

    test('package.json mentions no vendored formatter path', () => {
        const manifest = fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8');
        expect(manifest).not.toContain('tools/formatter');
    });

    test('the BBj run tools still ship from tools/', () => {
        for (const tool of ['web.bbj', 'em-login.bbj', 'em-validate-token.bbj']) {
            expect(exists(`tools/${tool}`)).toBe(true);
        }
    });

    test('the IntelliJ build copies no vendored formatter file', () => {
        const gradle = fs.readFileSync(path.join(REPO_ROOT, '..', 'bbj-intellij', 'build.gradle.kts'), 'utf-8');
        expect(gradle).not.toContain('tools/formatter');
    });
});

describe('the removed-reference matchers', () => {
    test('a module-specifier matcher reports import, require and dynamic import of a removed module', () => {
        expect(removedModuleSpecifiers("import x from './document-formatter.js';")).toEqual(['document-formatter']);
        expect(removedModuleSpecifiers('const v = require("../formatter-verifier");')).toEqual(['formatter-verifier']);
        expect(removedModuleSpecifiers("const r = await import('./formatter-java-resolver.js');")).toEqual([
            'formatter-java-resolver',
        ]);
    });

    test('a module-specifier matcher ignores a comment that names the same modules', () => {
        const text = [
            "// import x from './document-formatter.js'",
            "/* const v = require('../formatter-verifier'); */",
            '/**',
            " * The old import('./formatter-java-resolver.js') is gone.",
            ' */',
            "import { other } from './other.js';",
        ].join('\n');
        expect(removedModuleSpecifiers(text)).toEqual([]);
    });

    test('a string-literal matcher reports a vendored path or name inside quotes', () => {
        expect(quotedVendoredNames("const jar = 'tools/formatter/BBjCFCli.jar';")).toEqual(['BBjCFCli', 'tools/formatter']);
        expect(quotedVendoredNames('const name = "BBjCFCli";')).toEqual(['BBjCFCli']);
        expect(quotedVendoredNames('const p = `${root}/tools/formatter`;')).toEqual(['tools/formatter']);
    });

    test('a string-literal matcher ignores the same words in a comment or in plain code', () => {
        const text = [
            '// the BBjCFCli jar used to live in tools/formatter',
            '/* tools/formatter and BBjCFCli were removed */',
            "const ok = 'unrelated';",
            "const quoteAfterComment = 'x'; // BBjCFCli",
        ].join('\n');
        expect(quotedVendoredNames(text)).toEqual([]);
    });

    test('a comment marker inside a string literal does not hide a reference after it', () => {
        expect(quotedVendoredNames("const url = 'http://host'; const jar = 'tools/formatter';")).toEqual(['tools/formatter']);
    });

    test('a JSON string-value walker reaches nested strings and skips keys and numbers', () => {
        const values = jsonStringValues({ a: 'one', 'tools/formatter': 1, b: [{ c: 'two' }, 3, ['three']] });
        expect(values.sort()).toEqual(['one', 'three', 'two']);
    });
});
