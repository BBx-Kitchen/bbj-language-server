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
        expect(files.length, `conformance folder "${conformanceFolder}" has no fixtures`).toBeGreaterThan(0);
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
});
