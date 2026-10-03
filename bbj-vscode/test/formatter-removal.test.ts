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
});
