import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Invariant test (#650): no VS Code source module registers its own code-lens provider —
 * every composer cue in VS Code comes from the shared server-side `textDocument/codeLens`
 * provider, dispatched through `bbj.openComposerAt`. This scans every module under `src/` rather
 * than a fixed list, so it fails the moment a future client-side lens provider is added, not only
 * when the one retired here regresses.
 *
 * Also pins that the language client's `documentSelector` includes the config-document language
 * id alongside `bbj`, so a config file's SETOPTS cue actually reaches the server.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');
const EXTENSION_TS = path.join(SRC_DIR, 'extension.ts');

// Strip both line comments and block comments — good enough for a source guard.
function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
}

function readStripped(filePath: string): string {
    return stripComments(fs.readFileSync(filePath, 'utf-8'));
}

/** Every `.ts` file under `src/`, skipping `language/generated` (Langium-generated code). */
function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (path.relative(SRC_DIR, fullPath) === path.join('language', 'generated')) {
                continue;
            }
            results.push(...collectTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            results.push(fullPath);
        }
    }
    return results;
}

/** Matches a call registering a VS Code code-lens provider — the client-side lens API this
 * invariant forbids. `registerCodeLensProvider(` is unambiguous: no other VS Code API shares
 * that identifier. */
const REGISTER_CODE_LENS_PROVIDER_CALL = /\bregisterCodeLensProvider\s*\(/;

describe('composer cue single source (#650)', () => {
    test('no .ts module under src/ (excluding generated code) registers a VS Code code-lens provider', () => {
        const offenders = collectTsFiles(SRC_DIR)
            .filter((filePath) => REGISTER_CODE_LENS_PROVIDER_CALL.test(readStripped(filePath)))
            .map((filePath) => path.relative(SRC_DIR, filePath).split(path.sep).join('/'))
            .sort();

        expect(offenders).toEqual([]);
    });

    test('extension.ts documentSelector includes the config-document language id beside bbj', () => {
        const source = readStripped(EXTENSION_TS);
        expect(source).toMatch(/documentSelector\s*:\s*\[[^\]]*language:\s*'bbj'[^\]]*language:\s*CONFIG_DOCUMENT_LANGUAGE_ID[^\]]*\]/s);
    });
});
