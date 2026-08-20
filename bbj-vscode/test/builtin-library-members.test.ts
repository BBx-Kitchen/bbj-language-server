import fs from 'fs';
import path from 'path';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { isLibEventType, isLibSymbolicLabelDecl, isLibVariable, Model } from '../src/language/generated/ast.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

/**
 * P61-D5-017: mirrors builtin-functions-library.test.ts's shape (parse-guard + named-entry
 * assertions) for the other three builtin catalogs — labels.ts, variables.ts, events.ts —
 * which had no test coverage at all (`grep -rln 'labels\.bbl|variables\.bbl|events\.bbl|
 * builtinSymbolicLabels|builtinVariables|builtinEvents' bbj-vscode/test` returned nothing).
 * Also adds the record's named-but-missing `.ts`-vs-`.bbl` content-equivalence assertion:
 * the physical lib/*.bbl file on disk is parsed independently and its declared symbol names
 * are compared against the .ts-derived virtual document's own declared names.
 */
describe('builtin library: labels, variables, events (P61-D5-017)', () => {
    beforeAll(async () => { await initializeWorkspace(services.shared); });

    function virtualDocument(suffix: string) {
        return services.shared.workspace.LangiumDocuments.all
            .toArray()
            .find(d => d.uri.toString().endsWith(suffix));
    }

    describe('labels.ts (builtinSymbolicLabels)', () => {
        test('labels.bbl (virtual, .ts-derived) parses without lexer or parser errors', () => {
            const doc = virtualDocument('labels.bbl');
            expect(doc, 'labels.bbl virtual document should be loaded').toBeDefined();
            expect(doc!.parseResult.lexerErrors.map(e => e.message)).toEqual([]);
            expect(doc!.parseResult.parserErrors.map(e => e.message)).toEqual([]);
        });

        test('known symbolic labels are defined', () => {
            const doc = virtualDocument('labels.bbl')!;
            const names = new Set(
                (doc.parseResult.value as any).declarations
                    .filter(isLibSymbolicLabelDecl)
                    .map((l: any) => l.name.toUpperCase())
            );
            for (const name of ['*PROCEED', '*NEXT', '*SAME']) {
                expect(names, `expected ${name} to be defined`).toContain(name);
            }
        });
    });

    describe('variables.ts (builtinVariables)', () => {
        test('variables.bbl (virtual, .ts-derived) parses without lexer or parser errors', () => {
            const doc = virtualDocument('variables.bbl');
            expect(doc, 'variables.bbl virtual document should be loaded').toBeDefined();
            expect(doc!.parseResult.lexerErrors.map(e => e.message)).toEqual([]);
            expect(doc!.parseResult.parserErrors.map(e => e.message)).toEqual([]);
        });

        test('known builtin variables are defined', () => {
            const doc = virtualDocument('variables.bbl')!;
            const names = new Set(
                (doc.parseResult.value as any).declarations
                    .filter(isLibVariable)
                    .map((v: any) => v.name.toUpperCase())
            );
            for (const name of ['ARGC', 'CHN', 'CTL']) {
                expect(names, `expected ${name} to be defined`).toContain(name);
            }
        });
    });

    describe('events.ts (builtinEvents)', () => {
        test('events.bbl (virtual, .ts-derived) parses without lexer or parser errors', () => {
            const doc = virtualDocument('events.bbl');
            expect(doc, 'events.bbl virtual document should be loaded').toBeDefined();
            expect(doc!.parseResult.lexerErrors.map(e => e.message)).toEqual([]);
            expect(doc!.parseResult.parserErrors.map(e => e.message)).toEqual([]);
        });

        test('known builtin events are defined', () => {
            const doc = virtualDocument('events.bbl')!;
            const names = new Set(
                (doc.parseResult.value as any).declarations
                    .filter(isLibEventType)
                    .map((e: any) => e.name.toUpperCase())
            );
            for (const name of ['ON_MOUSE_ENTER', 'ON_MOUSE_EXIT']) {
                expect(names, `expected ${name} to be defined`).toContain(name);
            }
        });
    });

    // .ts-vs-.bbl content-equivalence: the physical lib/*.bbl file on disk (never read by
    // any production code path — same fact P61-D8-007 corrects the comment about) is parsed
    // independently here and its declared name set compared against the .ts-derived virtual
    // document actually served to the language server. This is the equivalence assertion
    // the record names as missing (no drift guard currently exists on any of the four pairs).
    //
    // Compares the *unique* name set, not raw declaration counts: events.bbl still carries
    // the pre-P61-D2-019 duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT entries that events.ts no
    // longer has (that fix, landed elsewhere in this phase, only touched the consumed .ts
    // file — the never-read .bbl sibling was correctly out of that fix's scope). A raw-count
    // comparison would flag that pre-existing, already-understood staleness as new drift;
    // the unique-name-set comparison still catches a genuinely added/removed/renamed entry.
    describe('.ts-vs-.bbl equivalence', () => {
        async function declaredNames(virtualSuffix: string, physicalFile: string, guard: (n: unknown) => boolean) {
            const virtualDoc = virtualDocument(virtualSuffix)!;
            const virtualNames = [...new Set(
                (virtualDoc.parseResult.value as any).declarations
                    .filter(guard)
                    .map((n: any) => n.name.toUpperCase())
            )].sort();

            const physicalPath = path.join(__dirname, '..', 'src', 'language', 'lib', physicalFile);
            const physicalText = fs.readFileSync(physicalPath, 'utf-8');
            const physicalDoc = await parse(physicalText);
            expect(physicalDoc.parseResult.lexerErrors, `${physicalFile}: lexer errors`).toEqual([]);
            expect(physicalDoc.parseResult.parserErrors, `${physicalFile}: parser errors`).toEqual([]);
            const physicalNames = [...new Set(
                (physicalDoc.parseResult.value as any).declarations
                    .filter(guard)
                    .map((n: any) => n.name.toUpperCase())
            )].sort();

            return { virtualNames, physicalNames };
        }

        test('labels.ts and lib/labels.bbl declare the same symbolic label names', async () => {
            const { virtualNames, physicalNames } = await declaredNames('labels.bbl', 'labels.bbl', isLibSymbolicLabelDecl);
            expect(physicalNames).toEqual(virtualNames);
        });

        test('variables.ts and lib/variables.bbl declare the same variable names', async () => {
            const { virtualNames, physicalNames } = await declaredNames('variables.bbl', 'variables.bbl', isLibVariable);
            expect(physicalNames).toEqual(virtualNames);
        });

        test('events.ts and lib/events.bbl declare the same event names', async () => {
            const { virtualNames, physicalNames } = await declaredNames('events.bbl', 'events.bbl', isLibEventType);
            expect(physicalNames).toEqual(virtualNames);
        });
    });
});
