import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import { Model } from '../src/language/generated/ast.js';
import {
    classifyDocumentText,
    LINE_NUMBERED_DIAGNOSTIC_CODE
} from '../src/language/bbj-document-kind.js';
import {
    clearAllVerdictStates,
    getVerdictState,
    setVerdictState
} from '../src/language/bbj-diagnostic-reconciliation.js';
import { TOKENIZED_BBJ_MAGIC, TOKENIZED_BBJ_MAGIC_TEXT } from '../src/tokenized-bbj.js';

const { shared, BBj: bbjServices } = createBBjTestServices(EmptyFileSystem);

beforeAll(async () => {
    await initializeWorkspace(shared);
});

const NUMBERED = '0010 PRINT "Hello"\n0020 PRINT "World"\n0030 END\n';
const DENUMBERED = 'PRINT "Hello"\nPRINT "World"\nEND\n';
const TOKENIZED = TOKENIZED_BBJ_MAGIC_TEXT + '\u0084\u0000\u0000rest';

let uriCounter = 0;

function uniqueUri(): string {
    return `file:///document-kind-probe-${uriCounter++}.bbj`;
}

async function validated(text: string, documentUri = uniqueUri()) {
    const document = await parseHelper<Model>(bbjServices)(text, { documentUri, validation: true });
    return document.diagnostics ?? [];
}

describe('classifyDocumentText', () => {
    test('text that starts with the tokenized magic is tokenized', () => {
        expect(classifyDocumentText(TOKENIZED)).toBe('tokenized');
    });

    test('three numbered statements are line-numbered', () => {
        expect(classifyDocumentText(NUMBERED)).toBe('line-numbered');
    });

    test('the text form of the magic is the decoded byte form', () => {
        expect(Buffer.from(TOKENIZED_BBJ_MAGIC).toString('latin1')).toBe(TOKENIZED_BBJ_MAGIC_TEXT);
    });

    test.each([
        ['numeric labels without a space', '0010: PRINT 1\n0020: GOTO 0010\n0030: END\n'],
        ['two numbered lines only', '0010 PRINT "Hello"\n0020 END\n'],
        ['a numbered first line followed by unnumbered statements', '0010 PRINT "Hello"\nPRINT "World"\nEND\n'],
        ['keyword-prefixed identifiers', 'rem1 = 5\nprint1$ = "x"\nPRINT rem1\n'],
        ['the magic spelled inside a string', 'PRINT "<<bbj>>"\nPRINT "x"\nEND\n'],
        ['a space before the magic', ' <<bbj>>\nPRINT 1\nEND\n'],
        ['an empty text', ''],
    ])('%s stays normal', (_name, text) => {
        expect(classifyDocumentText(text)).toBe('normal');
    });
});

describe('document kind through the language server validation', () => {
    test('a tokenized document gets no diagnostics at all', async () => {
        expect(await validated(TOKENIZED)).toEqual([]);
    });

    test('a numbered document gets exactly one Information diagnostic on its first line', async () => {
        const diagnostics = await validated(NUMBERED);
        expect(diagnostics).toHaveLength(1);
        const [hint] = diagnostics;
        expect(hint.severity).toBe(DiagnosticSeverity.Information);
        expect(hint.code).toBe(LINE_NUMBERED_DIAGNOSTIC_CODE);
        expect(hint.message).toContain('Denumber BBj Program');
        expect(hint.range.start.line).toBe(0);
        expect(hint.range.end.line).toBe(0);
    });

    test('a numbered document with syntax garbage still gets only the hint', async () => {
        const diagnostics = await validated('0010 PRINT "Hello"\n0020 ))) ((( @@@\n0030 END END END\n');
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0].code).toBe(LINE_NUMBERED_DIAGNOSTIC_CODE);
    });

    test('the denumbered program is validated normally again', async () => {
        expect((await validated(NUMBERED)).map(d => d.code)).toEqual([LINE_NUMBERED_DIAGNOSTIC_CODE]);
        const afterDenumber = await validated(DENUMBERED);
        expect(afterDenumber.some(d => d.code === LINE_NUMBERED_DIAGNOSTIC_CODE)).toBe(false);
    });

    test('a broken unnumbered program still reports its own errors', async () => {
        const diagnostics = await validated('PRINT "Hello"\nIF THEN ELSE ((\nEND\n');
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.some(d => d.code === LINE_NUMBERED_DIAGNOSTIC_CODE)).toBe(false);
    });

    test('validating a numbered document forgets the verdict stored for its uri', async () => {
        const uri = uniqueUri();
        clearAllVerdictStates();
        setVerdictState(uri, { seen: new Set(['some-key']) });
        expect(getVerdictState(uri)).toBeDefined();

        await validated(NUMBERED, uri);

        expect(getVerdictState(uri)).toBeUndefined();
    });
});
