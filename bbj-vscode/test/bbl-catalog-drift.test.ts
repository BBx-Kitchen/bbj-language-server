import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, test } from 'vitest';
import { builtinSymbolicLabels } from '../src/language/lib/labels.js';
import { builtinVariables } from '../src/language/lib/variables.js';

/**
 * The four lib/*.bbl files under src/language/lib are hand-synced mirrors of the catalog
 * constants exported from their sibling .ts files. Nothing at runtime reads a .bbl file:
 * bbj-ws-manager.ts and lib/fs-provider.ts both build the served bbjlib:/// content directly
 * from the .ts exports (builtinFunctions, builtinVariables, builtinSymbolicLabels,
 * builtinEvents). Because a .bbl is never read at runtime, a stale mirror goes unnoticed until
 * someone reads the file by hand (#603).
 *
 * This test keeps each .bbl byte-identical to the evaluated .ts export, tolerating only a CRLF
 * line-ending difference. A failure is fixed by writing the exported string value into the
 * named .bbl — the evaluated value, not the .ts source text, whose escaped backticks differ
 * from the value the language server actually serves.
 */

const LIB_DIR = path.join(__dirname, '..', 'src', 'language', 'lib');

function toLf(text: string): string {
    return text.replace(/\r\n/g, '\n');
}

interface CatalogRow {
    bbl: string;
    ts: string;
    exportName: string;
    value: string;
}

const CATALOGS: CatalogRow[] = [
    { bbl: 'labels.bbl', ts: 'labels.ts', exportName: 'builtinSymbolicLabels', value: builtinSymbolicLabels },
    { bbl: 'variables.bbl', ts: 'variables.ts', exportName: 'builtinVariables', value: builtinVariables },
];

describe('.bbl catalog mirrors match their .ts exports', () => {
    test.each(CATALOGS)('$bbl matches $exportName from $ts', ({ bbl, ts, exportName, value }) => {
        const bblPath = path.join(LIB_DIR, bbl);
        const text = fs.readFileSync(bblPath, 'utf-8');
        const message = `src/language/lib/${bbl} has drifted from ${exportName} in src/language/lib/${ts}; rewrite the .bbl from the exported string value`;
        expect(toLf(text), message).toBe(toLf(value));
    });
});
