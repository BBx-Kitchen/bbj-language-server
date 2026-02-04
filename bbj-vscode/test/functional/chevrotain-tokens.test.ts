import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { Model } from '../../src/language/generated/ast.js';

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

describe('Chevrotain Token Runtime Verification', () => {

    function expectNoParserLexerErrors(document: LangiumDocument) {
        expect(document.parseResult.lexerErrors.join('\n')).toBe('');
        expect(document.parseResult.parserErrors.join('\n')).toBe('');
    }

    beforeAll(() => services.shared.workspace.WorkspaceManager.initializeWorkspace([]));

    // READ token
    describe('READ token', () => {
        test('Standalone READ', async () => {
            const doc = await parse(`
                READ
                PRINT "done"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('Compound READ with channel and key', async () => {
            const doc = await parse(`
                READ(1,KEY="TEST",ERR=errLabel)A$,B$,C$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('READ RECORD form', async () => {
            const doc = await parse(`
                READ RECORD(1,IND=2,ERR=errLabel)A$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });
    });

    // INPUT token
    describe('INPUT token', () => {
        test('Compound INPUT with prompt and variable', async () => {
            const doc = await parse(`
                INPUT "Name:", name$
            `);
            expectNoParserLexerErrors(doc);
        });

        test('INPUT with channel and mnemonics', async () => {
            const doc = await parse(`
                INPUT 'CS','BR',@(0,0),"Hello World",'ER',@(10,10),"Enter your name:",@(30),X$
            `);
            expectNoParserLexerErrors(doc);
        });

        test('INPUT RECORD form', async () => {
            const doc = await parse(`
                INPUT RECORD(1,IND=2,ERR=errLabel)A$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });
    });

    // ENTER token
    describe('ENTER token', () => {
        test('Standalone ENTER', async () => {
            const doc = await parse(`
                someVar$ = "TEST"
                ENTER
                someVar$ = "TEST2"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('Compound ENTER with variables', async () => {
            const doc = await parse(`
                someVar$ = "TEST"
                someOtherVar$ = "TEST"
                ENTER someVar$, someOtherVar$
            `);
            expectNoParserLexerErrors(doc);
        });

        test('ENTER with ERR option', async () => {
            const doc = await parse(`
                someVar$ = "TEST"
                ENTER someVar$, ERR=JumpToLabel
                JumpToLabel:
            `);
            expectNoParserLexerErrors(doc);
        });
    });

    // EXTRACT token
    describe('EXTRACT token', () => {
        test('Compound EXTRACT with key and dom', async () => {
            const doc = await parse(`
                EXTRACT(2,KEY=Q$,DOM=domLabel)A$
                domLabel:
                    PRINT "done"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('EXTRACT RECORD form', async () => {
            const doc = await parse(`
                EXTRACT RECORD(1,IND=2,ERR=errLabel)A$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('EXTRACTRECORD compound form', async () => {
            const doc = await parse(`
                EXTRACTRECORD(1,IND=2,ERR=errLabel)A$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });
    });

    // DELETE token
    describe('DELETE token', () => {
        test('Standalone DELETE', async () => {
            const doc = await parse(`
                DELETE
            `);
            expectNoParserLexerErrors(doc);
        });

        test('Compound DELETE with labels', async () => {
            const doc = await parse(`
                DELETE label1,label2
                label1:
                    PRINT "1"
                label2:
                    PRINT "2"
            `);
            expectNoParserLexerErrors(doc);
        });
    });

    // SAVE token
    describe('SAVE token', () => {
        test('Standalone SAVE', async () => {
            const doc = await parse(`
                SAVE
            `);
            expectNoParserLexerErrors(doc);
        });

        test('Compound SAVE with filename', async () => {
            const doc = await parse(`
                SAVE "file.txt"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('SAVE with filename and line number', async () => {
            const doc = await parse(`
                SAVE "file.txt",100
            `);
            expectNoParserLexerErrors(doc);
        });
    });

    // FIND token
    describe('FIND token', () => {
        test('Compound FIND with key', async () => {
            const doc = await parse(`
                FIND(1,KEY="key",ERR=errLabel)data$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('FIND RECORD form', async () => {
            const doc = await parse(`
                FIND RECORD(1,IND=2,ERR=errLabel)A$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });

        test('FINDRECORD compound form', async () => {
            const doc = await parse(`
                FINDRECORD(1,IND=2,ERR=errLabel)A$
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });
    });

    // Combined test: all 7 tokens in one program
    describe('Combined token test', () => {
        test('All 7 tokens coexist in a single program', async () => {
            const doc = await parse(`
                READ(1,KEY="TEST")A$
                INPUT "Name:", name$
                someVar$ = "TEST"
                ENTER someVar$
                EXTRACT(2,KEY="key",DOM=domLabel)B$
                DELETE delLabel
                SAVE "file.txt"
                FIND(1,KEY="key",ERR=errLabel)data$
                domLabel:
                    PRINT "dom"
                delLabel:
                    PRINT "deleted"
                errLabel:
                    PRINT "error"
            `);
            expectNoParserLexerErrors(doc);
        });
    });
});
