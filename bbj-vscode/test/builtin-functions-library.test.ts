import { EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { isLibFunction } from '../src/language/generated/ast.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);

/**
 * Guards the hand-maintained builtin function library (lib/functions.bbl and its
 * lib/functions.ts mirror). Every signature must parse under the Library grammar,
 * so a malformed entry (e.g. a param name that collides with a keyword) fails here
 * instead of silently disabling completion/hover for that function.
 */
describe('builtin functions library', () => {
    beforeAll(async () => { await initializeWorkspace(services.shared); });

    function functionsDocument() {
        return services.shared.workspace.LangiumDocuments.all
            .toArray()
            .find(d => d.uri.toString().endsWith('functions.bbl'));
    }

    test('functions.bbl parses without lexer or parser errors', () => {
        const doc = functionsDocument();
        expect(doc, 'functions.bbl document should be loaded').toBeDefined();
        expect(doc!.parseResult.lexerErrors.map(e => e.message)).toEqual([]);
        expect(doc!.parseResult.parserErrors.map(e => e.message)).toEqual([]);
    });

    test('previously missing/renamed functions are now defined', () => {
        const doc = functionsDocument()!;
        const names = new Set(
            (doc.parseResult.value as any).declarations
                .filter(isLibFunction)
                .map((f: any) => f.name.toUpperCase())
        );
        for (const name of ['NFIELD', 'TIME', 'TMPL', 'SGN', 'SQR', 'RESINFO', 'WININFO']) {
            expect(names, `expected ${name} to be defined`).toContain(name);
        }
    });
});
