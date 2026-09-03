import { describe, expect, test } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
    FORMATTER_ARTIFACT_PINS,
    FORMATTER_TOOLS_DIR,
    formatterArtifactNames,
} from '../src/formatter-verifier.js';

/**
 * Drift guard: recomputes SHA-256 over the real, on-disk
 * `tools/formatter` artefacts and compares against the committed FORMATTER_ARTIFACT_PINS table,
 * so updating a vendored JAR without updating its pin -- or adding one without pinning it --
 * fails this suite instead of shipping silently. This is the guard the realistic failure mode
 * targets: a legitimate formatter update where the pin blocks a release and the pressure is to
 * disable the check rather than update the pin. Every assertion message below tells the updater
 * what to do instead of only reporting that two values differ.
 *
 * No `vscode` mock and no `child_process` mock are needed -- this file, like
 * formatter-verifier.ts itself, depends on neither.
 */

function recompute(absolutePath: string): { sha256: string; sizeBytes: number } {
    const bytes = fs.readFileSync(absolutePath);
    return {
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        sizeBytes: bytes.length,
    };
}

function remediation(relativePath: string): string {
    return (
        `Recompute the SHA-256 for '${relativePath}' (sha256sum bbj-vscode/tools/formatter/${relativePath}), ` +
        `update that entry's sha256, sizeBytes, and vendoredOn in bbj-vscode/src/formatter-verifier.ts, ` +
        `and re-vendor deliberately -- do not disable or loosen this check to unblock a release.`
    );
}

/** Every `.jar` file under `dir`, as paths relative to `baseDir`, POSIX-separated. */
function scanForJarFiles(dir: string, baseDir: string = dir): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...scanForJarFiles(fullPath, baseDir));
        } else if (entry.isFile() && entry.name.endsWith('.jar')) {
            results.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
        }
    }
    return results.sort();
}

describe('formatter-pins-drift: committed pins vs. the real tools/formatter tree', () => {
    for (const pin of FORMATTER_ARTIFACT_PINS) {
        test(`${pin.relativePath}: real bytes on disk match the committed pin`, () => {
            const absolutePath = path.join(FORMATTER_TOOLS_DIR, pin.relativePath);

            expect(
                fs.existsSync(absolutePath),
                `Expected vendored artefact missing at ${absolutePath}. ${remediation(pin.relativePath)}`
            ).toBe(true);

            const { sha256, sizeBytes } = recompute(absolutePath);

            expect(
                sizeBytes,
                `Size drift for '${pin.relativePath}': committed pin says ${pin.sizeBytes} bytes, ` +
                    `the real file is ${sizeBytes} bytes. ${remediation(pin.relativePath)}`
            ).toBe(pin.sizeBytes);

            expect(
                sha256,
                `Digest drift for '${pin.relativePath}': the committed SHA-256 no longer matches the ` +
                    `real file on disk. ${remediation(pin.relativePath)}`
            ).toBe(pin.sha256.toLowerCase());
        });
    }

    test('FORMATTER_ARTIFACT_PINS has exactly three entries, in declared order', () => {
        expect(
            FORMATTER_ARTIFACT_PINS,
            'The pin table changed shape -- if an artefact was intentionally added or removed, ' +
                'update this test alongside it; if not, this is a drift the table itself must not have.'
        ).toHaveLength(3);
        expect(formatterArtifactNames()).toEqual([
            'BBjCFCli.jar',
            'lib/jcommander-1.71.jar',
            'lib/BBjCodeFomatter.jar',
        ]);
    });

    test('every pinned entry carries a well-formed digest and non-empty provenance', () => {
        for (const pin of FORMATTER_ARTIFACT_PINS) {
            expect(
                pin.sha256,
                `'${pin.relativePath}' has a malformed sha256 pin (expected 64 lowercase hex characters). ` +
                    remediation(pin.relativePath)
            ).toMatch(/^[0-9a-f]{64}$/);
            expect(
                pin.origin.length,
                `'${pin.relativePath}' has an empty origin field -- every pin needs a provenance note, ` +
                    `not only a digest.`
            ).toBeGreaterThan(0);
            expect(
                pin.vendoredOn.length,
                `'${pin.relativePath}' has an empty vendoredOn field -- record the date the bytes ` +
                    `entered this tree.`
            ).toBeGreaterThan(0);
        }
    });

    test('no .jar file under tools/formatter is missing a pin table entry', () => {
        const onDisk = scanForJarFiles(FORMATTER_TOOLS_DIR);
        const pinned = new Set(formatterArtifactNames());
        const unpinned = onDisk.filter((relativePath) => !pinned.has(relativePath));

        expect(
            unpinned,
            `Found .jar file(s) under tools/formatter with no pin table entry: ${unpinned.join(', ')}. ` +
                `Add an entry to FORMATTER_ARTIFACT_PINS in bbj-vscode/src/formatter-verifier.ts ` +
                `(relativePath, sha256, sizeBytes, origin, vendoredOn) and re-vendor deliberately before ` +
                `merging -- do not ship an artefact the runtime gate has never checked.`
        ).toEqual([]);
    });
});
