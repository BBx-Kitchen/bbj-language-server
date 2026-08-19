import { EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { isLibEventType, isLibFunction } from '../src/language/generated/ast.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);

/**
 * Guards the hand-maintained builtin function library — specifically the .ts-derived
 * virtual document served at the synthetic `bbjlib:///functions.bbl` URI
 * (bbj-ws-manager.ts's loadAdditionalDocuments), built from `builtinFunctions` in
 * lib/functions.ts. Every signature must parse under the Library grammar, so a
 * malformed entry (e.g. a param name that collides with a keyword) fails here instead
 * of silently disabling completion/hover for that function.
 *
 * This does NOT read or guard the physical lib/functions.bbl file on disk — no
 * production code path reads it either (P61-D5-017's .ts-vs-.bbl equivalence test in
 * builtin-library-members.test.ts is what compares the two).
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

    /**
     * P61-D2-019: events.ts declared ON_MOUSE_ENTER and ON_MOUSE_EXIT twice each (lines
     * 57/528 and 62/533). bbj-scope.ts's LibEventType scope has no de-duplication and
     * StreamScope.getElement resolves by first match, so the second declaration's distinct
     * DOCU text was permanently unreachable, and completion offered the same label twice.
     */
    test('P61-D2-019: every builtin event name is declared exactly once', () => {
        const doc = services.shared.workspace.LangiumDocuments.all
            .toArray()
            .find(d => d.uri.toString().endsWith('events.bbl'));
        expect(doc, 'events.bbl document should be loaded').toBeDefined();
        expect(doc!.parseResult.lexerErrors.map(e => e.message)).toEqual([]);
        expect(doc!.parseResult.parserErrors.map(e => e.message)).toEqual([]);

        const names = (doc!.parseResult.value as any).declarations
            .filter(isLibEventType)
            .map((e: any) => e.name.toUpperCase());
        const duplicates = names.filter((name: string, index: number) => names.indexOf(name) !== index);
        expect(duplicates, `expected no duplicate event names, found: ${duplicates.join(', ')}`).toEqual([]);
    });
});
