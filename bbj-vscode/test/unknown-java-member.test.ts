import { DocumentValidator, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';
import { UNKNOWN_JAVA_MEMBER_CODE } from '../src/language/validations/check-unknown-java-member.js';

const services = createBBjTestServices(EmptyFileSystem);
const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

beforeAll(async () => {
    await initializeWorkspace(services.shared);
});

/** Diagnostics whose message mentions the given member name, quoted exactly as the check quotes it. */
function diagnosticsForMember(diagnostics: Diagnostic[] | undefined, memberName: string): Diagnostic[] {
    return (diagnostics ?? []).filter(d => d.message.includes(`'${memberName}'`));
}

function linkingDiagnostics(diagnostics: Diagnostic[] | undefined): Diagnostic[] {
    return (diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
}

describe('Unknown member on a fully resolved Java class', () => {
    test('an unknown method on a declared Java object is one Error on the member name', async () => {
        const document = await validate('declare java.lang.String s!\ns!.anyInvalidMethod()\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        const diagnostic = matches[0];
        expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
        expect(diagnostic.message).toBe("Method 'anyInvalidMethod' is not defined on String");
        expect(diagnostic.data?.code).toBe(UNKNOWN_JAVA_MEMBER_CODE);
        expect(diagnostic.range).toEqual({
            start: { line: 1, character: 3 },
            end: { line: 1, character: 19 }
        });
        expect(linkingDiagnostics(document.diagnostics)).toHaveLength(0);
    });

    test('field access uses field wording', async () => {
        const document = await validate('declare java.lang.String s!\nx! = s!.anyInvalidField\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidField');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(matches[0].message).toBe("Field 'anyInvalidField' is not defined on String");
    });

    test('an unknown method on a constructed Java object is one Error', async () => {
        const document = await validate('h! = new java.util.HashMap()\nh!.anyInvalidMethod()\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(matches[0].message).toBe("Method 'anyInvalidMethod' is not defined on HashMap");
    });
});
