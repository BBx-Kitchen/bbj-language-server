import { DocumentValidator, EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import path from 'path';
import fs from 'fs';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

describe('Conformance regression Tests', () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Model>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Model>(services.BBj);
    });

    const conformanceFolder = path.join(__dirname, './test-data/conformance');

    test('Every fixture in "test-data/conformance" parses and validates clean', async () => {
        const files = fs.readdirSync(conformanceFolder).filter(file => file.endsWith('.bbj')).sort();
        expect(files.length, `conformance folder "${conformanceFolder}" has no fixtures — an empty folder protects nothing`).toBeGreaterThan(0);
        for (const file of files) {
            const result = await validate(fs.readFileSync(path.join(conformanceFolder, file), 'utf-8'));
            expect(result.document.parseResult.lexerErrors, `${file}: lexer errors`).empty;
            expect(result.document.parseResult.parserErrors, `${file}: parser errors`).empty;
            const errorDiagnostics = result.diagnostics.filter(d =>
                d.severity === DiagnosticSeverity.Error &&
                d.data?.code !== DocumentValidator.LinkingError
            );
            expect(errorDiagnostics, `${file}: validation errors`).empty;
        }
    });

    test('conformance folder is non-empty', () => {
        // A conformance folder with no fixture silently stops protecting anything — the
        // loop above would iterate zero times and report green regardless.
        const files = fs.readdirSync(conformanceFolder).filter(file => file.endsWith('.bbj'));
        expect(files.length, `conformance folder "${conformanceFolder}" has no .bbj fixtures — a conformance folder with no fixture protects nothing`).toBeGreaterThan(0);
    });

    test('conformance file list is order-independent', () => {
        // The verdict must not depend on what fs.readdirSync happens to return — sort the
        // collected list before iterating, and prove that sort is a no-op on an already-sorted
        // list, so re-ordering the directory contents can never change which fixtures ran.
        const files = fs.readdirSync(conformanceFolder).filter(file => file.endsWith('.bbj'));
        expect(files, 'collected conformance file list must equal its own sorted copy').toEqual([...files].sort());
    });

    test('conformance fixtures are disjoint from the flat "test-data" fixture folder', () => {
        // example-files.test.ts reads "test-data" non-recursively, so a subfolder named
        // "conformance" never reaches its loop. Prove the reverse holds too: no fixture name
        // is asserted under both the parse-only flat rule and this stricter conformance rule.
        const flatFolder = path.join(__dirname, './test-data');
        const flatFiles = new Set(fs.readdirSync(flatFolder).filter(file => file.endsWith('.bbj')));
        const conformanceFiles = fs.readdirSync(conformanceFolder).filter(file => file.endsWith('.bbj'));
        const intersection = conformanceFiles.filter(file => flatFiles.has(file));
        expect(intersection, 'no fixture name may be asserted under both the flat "test-data" rule and the stricter conformance rule').toEqual([]);
    });
});
