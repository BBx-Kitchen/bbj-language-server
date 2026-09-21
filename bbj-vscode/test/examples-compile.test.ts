import { DocumentValidator, EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'node:child_process';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace, shouldRunBBjTests } from './test-helper.js';

// Every BBj program under "examples/" either compiles with the real compiler or lives under
// "examples/invalid/" with an asserted diagnostic expectation (EXMP-01). This file has two
// independent layers:
//   - always-on: parses and validates every example with the language server itself. Runs
//     everywhere (CI included) since it needs no local BBj install.
//   - BBj-gated (RUN_BBJ_TESTS=1): compiles every example with the real bbjcpl compiler and
//     asserts it agrees with which folder the file lives in. Needs a local BBj install, so it
//     is skipped unless explicitly requested or the BBj-side interop is reachable, exactly like
//     every other BBj-dependent test in this suite (see shouldRunBBjTests()).

const examplesRoot = path.join(__dirname, '../../examples');
const invalidRoot = path.join(examplesRoot, 'invalid');
const BBJCPL_BIN = '/opt/bbx/bin/bbjcpl';
const COMPILE_TIMEOUT_MS = 15000;

interface ExpectedDiagnostic {
    line: number;
    severity: 'error' | 'warning';
    messageFragment: string;
}

interface Sidecar {
    reason: string;
    diagnostics: 'none-today' | ExpectedDiagnostic[];
}

/**
 * `examples/imports/*.bbj` genuinely cross-references sibling files on disk (a relative-path
 * `use`/`::path::Class` import). validationHelper validates one file in isolation, with no
 * sibling document registered under the same services instance, so the importer's own
 * "File '...' could not be resolved" diagnostic (bbj-validator.ts) is a harness artifact here,
 * not a defect in the example -- a real multi-file workspace build resolves it fine (confirmed
 * by bbj-document-builder.ts's own re-check pass, which only runs through that full pipeline).
 * Excluded the same way DocumentValidator.LinkingError already is, for the same underlying
 * reason: this single-document harness cannot fully exercise cross-file resolution.
 */
const FILE_NOT_RESOLVED_PATTERN = /^File '.*' could not be resolved/;

/**
 * Recursively collects every ".bbj" file under `dir`, skipping `exclude` (an absolute directory
 * path, e.g. "examples/invalid") if given. Excludes by extension only, never by name match --
 * config.bbx, config.min, functions.bbl, project.properties.example and every javadoc/*.json
 * file are not BBj programs and are excluded here for that reason alone, the same filter
 * conformance-regressions.test.ts already uses for its own folder.
 */
function collectBbjFiles(dir: string, exclude?: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (exclude && full === exclude) {
                continue;
            }
            out.push(...collectBbjFiles(full, exclude));
        } else if (entry.isFile() && entry.name.endsWith('.bbj')) {
            out.push(full);
        }
    }
    return out;
}

/** Compiles one file with bbjcpl and returns the combined stdout+stderr (trimmed). bbjcpl
 * always exits 0 and writes its errors to stderr -- reading stdout alone reports a false
 * acceptance for every file, so both streams are concatenated here regardless of exit status. */
function compileWithBbjcpl(file: string): { combined: string; timedOut: boolean } {
    const res = spawnSync(BBJCPL_BIN, ['-N', file], { encoding: 'utf8', timeout: COMPILE_TIMEOUT_MS });
    const timedOut = res.error !== undefined && (res.error as NodeJS.ErrnoException).code === 'ETIMEDOUT';
    const combined = ((res.stdout ?? '') + (res.stderr ?? '')).trim();
    return { combined, timedOut };
}

describe('Examples compile Tests', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Model>>;
    const runBBjTests = await shouldRunBBjTests();
    const runCompilerLayer = runBBjTests && fs.existsSync(BBJCPL_BIN);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Model>(services.BBj);
    }, 20000);

    describe('always-on: language-server layer', () => {
        test('every valid example parses and validates clean', async () => {
            const files = collectBbjFiles(examplesRoot, invalidRoot).sort();
            expect(files.length, `examples root "${examplesRoot}" has no .bbj programs -- nothing to protect`).toBeGreaterThan(0);
            for (const file of files) {
                const rel = path.relative(examplesRoot, file);
                const result = await validate(fs.readFileSync(file, 'utf-8'));
                expect(result.document.parseResult.lexerErrors, `${rel}: lexer errors`).empty;
                expect(result.document.parseResult.parserErrors, `${rel}: parser errors`).empty;
                const errorDiagnostics = result.diagnostics.filter(d =>
                    d.severity === DiagnosticSeverity.Error &&
                    d.data?.code !== DocumentValidator.LinkingError &&
                    !FILE_NOT_RESOLVED_PATTERN.test(typeof d.message === 'string' ? d.message : '')
                );
                expect(errorDiagnostics, `${rel}: validation errors`).empty;
            }
        }, 60000);

        test('examples/invalid folder is non-empty', () => {
            // An invalid folder with no fixture would let the sidecar-pairing and
            // diagnostics-assertion tests below iterate zero times and report green regardless.
            const files = fs.readdirSync(invalidRoot).filter(f => f.endsWith('.bbj'));
            expect(files.length, `"${invalidRoot}" has no .bbj fixtures -- an empty invalid folder protects nothing`).toBeGreaterThan(0);
        });

        test('every examples/invalid program has a sidecar, and every sidecar has a program', () => {
            const bbjFiles = fs.readdirSync(invalidRoot).filter(f => f.endsWith('.bbj')).sort();
            const sidecarBaseNames = fs.readdirSync(invalidRoot)
                .filter(f => f.endsWith('.expected.json'))
                .map(f => f.slice(0, -'.expected.json'.length) + '.bbj')
                .sort();
            for (const bbj of bbjFiles) {
                expect(sidecarBaseNames.includes(bbj), `${bbj} has no matching .expected.json sidecar`).toBe(true);
            }
            for (const bbj of sidecarBaseNames) {
                expect(bbjFiles.includes(bbj), `sidecar for "${bbj}" has no matching .bbj file`).toBe(true);
            }
        });

        test('every examples/invalid program honours its sidecar diagnostics, or an explicit no-diagnostic-today entry', async () => {
            const files = fs.readdirSync(invalidRoot).filter(f => f.endsWith('.bbj')).sort();
            expect(files.length).toBeGreaterThan(0);
            for (const file of files) {
                const sidecarPath = path.join(invalidRoot, file.replace(/\.bbj$/, '.expected.json'));
                const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8')) as Sidecar;
                if (sidecar.diagnostics === 'none-today') {
                    // The language server produces nothing for this construct today -- the
                    // gap must stay visible as this explicit marker, never as an empty list
                    // that would look identical to "we checked, there is nothing to expect".
                    expect(sidecar.diagnostics, `${file}: sidecar must literally say "none-today"`).toBe('none-today');
                    continue;
                }
                const result = await validate(fs.readFileSync(path.join(invalidRoot, file), 'utf-8'));
                for (const expected of sidecar.diagnostics) {
                    const expectedSeverity = expected.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning;
                    const match = result.diagnostics.find(d =>
                        d.range.start.line + 1 === expected.line &&
                        d.severity === expectedSeverity &&
                        (d.message ?? '').includes(expected.messageFragment)
                    );
                    expect(match, `${file}: expected diagnostic not found -- line ${expected.line}, "${expected.messageFragment}"`).toBeTruthy();
                }
            }
        }, 20000);
    });

    describe.runIf(runCompilerLayer)('BBj-gated: compiler layer', () => {
        test('every valid example compiles with bbjcpl (empty combined stdout+stderr)', () => {
            const files = collectBbjFiles(examplesRoot, invalidRoot).sort();
            expect(files.length).toBeGreaterThan(0);
            const failures: string[] = [];
            for (const file of files) {
                const rel = path.relative(examplesRoot, file);
                const { combined, timedOut } = compileWithBbjcpl(file);
                if (timedOut) {
                    failures.push(`${rel}: bbjcpl timed out after ${COMPILE_TIMEOUT_MS}ms`);
                } else if (combined !== '') {
                    failures.push(`${rel}: ${combined}`);
                }
            }
            expect(failures, failures.join('\n')).toEqual([]);
        }, 180000);

        test('every examples/invalid program fails to compile with bbjcpl (non-empty combined stdout+stderr)', () => {
            const files = fs.readdirSync(invalidRoot).filter(f => f.endsWith('.bbj')).sort();
            expect(files.length).toBeGreaterThan(0);
            const failures: string[] = [];
            for (const file of files) {
                const { combined, timedOut } = compileWithBbjcpl(path.join(invalidRoot, file));
                if (timedOut) {
                    // A timeout is reported as this file's failure, not silently skipped --
                    // it is not the "compiler rejected it" evidence the test is looking for.
                    failures.push(`${file}: bbjcpl timed out after ${COMPILE_TIMEOUT_MS}ms`);
                } else if (combined === '') {
                    failures.push(`${file}: bbjcpl unexpectedly accepted this deliberately-invalid file`);
                }
            }
            expect(failures, failures.join('\n')).toEqual([]);
        }, 60000);
    });
});
