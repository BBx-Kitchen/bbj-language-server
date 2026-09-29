import { describe, expect, test } from 'vitest';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
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

/**
 * Remediation message for a drift between the committed jcommander provenance records
 * (bom.json, README.md) and either the FORMATTER_ARTIFACT_PINS table or the real vendored bytes.
 * Shared by the bom.json and README.md drift tests below.
 */
function remediationSbom(): string {
    return (
        `Re-vendor jcommander deliberately from a verifiable source, then update ` +
        `bbj-vscode/tools/formatter/lib/bom.json, bbj-vscode/tools/formatter/lib/README.md, and the ` +
        `'lib/jcommander-1.71.jar' entry in FORMATTER_ARTIFACT_PINS (bbj-vscode/src/formatter-verifier.ts) ` +
        `together -- never loosen this check to unblock a release.`
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

    test('lib/bom.json records the vendored jcommander with the pinned SHA-256', () => {
        const bomPath = path.join(FORMATTER_TOOLS_DIR, 'lib/bom.json');
        const pin = FORMATTER_ARTIFACT_PINS.find((p) => p.relativePath === 'lib/jcommander-1.71.jar');

        expect(
            pin,
            `FORMATTER_ARTIFACT_PINS has no entry for 'lib/jcommander-1.71.jar' -- this test needs that ` +
                `entry to exist to cross-check bom.json against it.`
        ).toBeDefined();

        expect(
            fs.existsSync(bomPath),
            `Expected a CycloneDX SBOM at ${bomPath}. ${remediationSbom()}`
        ).toBe(true);

        const bom = JSON.parse(fs.readFileSync(bomPath, 'utf-8')) as {
            bomFormat?: string;
            specVersion?: string;
            components?: Array<{
                type?: string;
                group?: string;
                name?: string;
                version?: string;
                purl?: string;
                publisher?: string;
                hashes?: Array<{ alg?: string; content?: string }>;
                properties?: Array<{ name?: string; value?: string }>;
            }>;
        };

        expect(bom.bomFormat, `bom.json's bomFormat must be 'CycloneDX'. ${remediationSbom()}`).toBe(
            'CycloneDX'
        );
        expect(bom.specVersion, `bom.json's specVersion must be '1.5'. ${remediationSbom()}`).toBe('1.5');
        expect(
            bom.components,
            `bom.json must have exactly one component (jcommander only). ${remediationSbom()}`
        ).toHaveLength(1);

        const component = bom.components![0];

        expect(component.type, `bom.json's component type must be 'library'. ${remediationSbom()}`).toBe(
            'library'
        );
        expect(component.group, `bom.json's component group must be 'com.beust'. ${remediationSbom()}`).toBe(
            'com.beust'
        );
        expect(component.name, `bom.json's component name must be 'jcommander'. ${remediationSbom()}`).toBe(
            'jcommander'
        );
        expect(
            component.version,
            `bom.json's component version must be '1.71'. ${remediationSbom()}`
        ).toBe('1.71');

        const expectedPurl = `pkg:maven/${component.group}/${component.name}@${component.version}`;
        expect(
            component.purl,
            `bom.json's purl must equal pkg:maven/\${group}/\${name}@\${version}, so the coordinate and ` +
                `the file name cannot disagree. ${remediationSbom()}`
        ).toBe(expectedPurl);
        expect(
            pin!.relativePath,
            `The jcommander pin's relativePath must equal 'lib/\${name}-\${version}.jar' so it stays ` +
                `consistent with bom.json's coordinate. ${remediationSbom()}`
        ).toBe(`lib/${component.name}-${component.version}.jar`);

        expect(
            component.hashes,
            `bom.json's component must have exactly one hash entry. ${remediationSbom()}`
        ).toHaveLength(1);
        const hash = component.hashes![0];
        expect(hash.alg, `bom.json's hash algorithm must be 'SHA-256'. ${remediationSbom()}`).toBe(
            'SHA-256'
        );
        expect(
            hash.content,
            `bom.json's recorded SHA-256 no longer matches FORMATTER_ARTIFACT_PINS' jcommander entry. ` +
                remediationSbom()
        ).toBe(pin!.sha256.toLowerCase());

        const { sha256: realSha256 } = recompute(
            path.join(FORMATTER_TOOLS_DIR, 'lib/jcommander-1.71.jar')
        );
        expect(
            hash.content,
            `bom.json's recorded SHA-256 no longer matches the real bytes of lib/jcommander-1.71.jar on ` +
                `disk. ${remediationSbom()}`
        ).toBe(realSha256);

        expect(
            component.publisher && component.publisher.length > 0,
            `bom.json's component publisher must be non-empty. ${remediationSbom()}`
        ).toBe(true);

        const origin = component.properties?.find((p) => p.name === 'bbj:origin');
        expect(
            origin && origin.value && origin.value.length > 0,
            `bom.json's component properties must include a non-empty 'bbj:origin' value. ${remediationSbom()}`
        ).toBe(true);
    });

    test('lib/README.md states the jcommander SHA-256 and purl recorded in bom.json', () => {
        const readmePath = path.join(FORMATTER_TOOLS_DIR, 'lib/README.md');
        const bomPath = path.join(FORMATTER_TOOLS_DIR, 'lib/bom.json');
        const pin = FORMATTER_ARTIFACT_PINS.find((p) => p.relativePath === 'lib/jcommander-1.71.jar');

        expect(
            pin,
            `FORMATTER_ARTIFACT_PINS has no entry for 'lib/jcommander-1.71.jar' -- this test needs that ` +
                `entry to exist to cross-check README.md against it.`
        ).toBeDefined();

        expect(
            fs.existsSync(readmePath),
            `Expected a provenance README at ${readmePath}. ${remediationSbom()}`
        ).toBe(true);

        const bom = JSON.parse(fs.readFileSync(bomPath, 'utf-8')) as {
            components?: Array<{ purl?: string }>;
        };
        const purl = bom.components?.[0]?.purl ?? '';
        const readmeText = fs.readFileSync(readmePath, 'utf-8');
        const sha256 = pin!.sha256.toLowerCase();

        const shaOccurrences = readmeText.split(sha256).length - 1;
        expect(
            shaOccurrences,
            `README.md must contain the jcommander pin's SHA-256 exactly once (found ${shaOccurrences}). ` +
                remediationSbom()
        ).toBe(1);

        expect(
            readmeText.includes(purl),
            `README.md must contain bom.json's purl ('${purl}'). ${remediationSbom()}`
        ).toBe(true);
    });
});
