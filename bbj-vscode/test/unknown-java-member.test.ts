import { AstUtils, DocumentValidator, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module.js';
import { isConstructorCall, isMemberCall, Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';
import {
    UNKNOWN_JAVA_MEMBER_CODE,
    hasCertainReceiverType,
    isFullyResolvedJavaClass
} from '../src/language/validations/check-unknown-java-member.js';
import {
    applyDiagnosticHierarchy,
    dropShadowedMemberLinkingDiagnostics
} from '../src/language/bbj-document-validator.js';

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

function hasUnknownMemberDiagnostic(diagnostics: Diagnostic[] | undefined): boolean {
    return (diagnostics ?? []).some(d => d.data?.code === UNKNOWN_JAVA_MEMBER_CODE);
}

function validationCrashed(diagnostics: Diagnostic[] | undefined): boolean {
    return (diagnostics ?? []).some(d => d.message.startsWith('An error occurred during validation'));
}

/** The first MemberCall's own receiver expression, for the pure-predicate tests. */
async function firstMemberCallReceiver(content: string) {
    const document = await validate(content);
    const memberCall = AstUtils.streamAllContents(document.parseResult.value).find(isMemberCall);
    if (!memberCall) {
        throw new Error(`No MemberCall found in: ${content}`);
    }
    return memberCall.receiver;
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

describe("Receivers that keep today's diagnostics", () => {
    test('an unresolved class keeps its linking warning', async () => {
        const document = await validate('declare java.util.ArrayList a!\na!.anyInvalidMethod()\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => d.message.includes('anyInvalidMethod'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('isFullyResolvedJavaClass is false for a stub and true for a class the backend actually resolved', () => {
        const stub = {
            $type: 'JavaClass',
            name: 'X',
            error: 'Resolution failed or depth limit exceeded',
            methods: [],
            fields: []
        };
        expect(isFullyResolvedJavaClass(stub)).toBe(false);

        const resolvedString = services.BBj.java.JavaInteropService.getResolvedClass('java.lang.String');
        expect(isFullyResolvedJavaClass(resolvedString)).toBe(true);
    });

    test('the method-less BBjAPI fallback keeps its linking warning', async () => {
        const document = await validate('BBjAPI().anyInvalidMethod()\n');
        expect(linkingDiagnostics(document.diagnostics)).toHaveLength(1);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a BBj class receiver keeps its linking warning', async () => {
        const document = await validate('class public Foo\nclassend\ndeclare Foo f!\nf!.nothing()\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => d.message.includes('nothing'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('an inherited method resolves and stays clean', async () => {
        const document = await validate('declare java.util.HashMap h!\nx! = h!.getClass()\n');
        expect(document.diagnostics ?? []).toHaveLength(0);
    });

    test.each([
        ['declare java.lang.String s!\nx! = s!.class\n'],
        ['declare java.lang.String s!\nx! = s!.CLASS\n'],
        ['use java.lang.String\nx! = String.class\n']
    ])('a .class member never gets the new diagnostic (%s)', async (content) => {
        const document = await validate(content);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a template-string array field access stays clean (NAME:C(10))', async () => {
        const document = await validate('dim rec$:"NAME:C(10)"\nrec.nosuchfield = 1\n');
        expect(document.diagnostics ?? []).toHaveLength(0);
    });

    test('a case-different member name (CHARAT) resolves and keeps its linking warning', async () => {
        const document = await validate('declare java.lang.String s!\nx! = s!.CHARAT(0)\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => d.message.includes('CHARAT'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a member reached through a method return keeps its linking warning (getClass().anyInvalidMethod())', async () => {
        const document = await validate('declare java.util.HashMap h!\nx! = h!.getClass().anyInvalidMethod()\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => d.message.includes('anyInvalidMethod'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a variable assigned from a method return also keeps its linking warning', async () => {
        const document = await validate('declare java.util.HashMap h!\nc! = h!.getClass()\nc!.anyInvalidMethod()\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => d.message.includes('anyInvalidMethod'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('hasCertainReceiverType is false for a method-return receiver and true for a constructor call', async () => {
        const methodReturnReceiver = await firstMemberCallReceiver('declare java.util.HashMap h!\nx! = h!.getClass().anyInvalidMethod()\n');
        expect(hasCertainReceiverType(methodReturnReceiver)).toBe(false);

        const document = await validate('h! = new java.util.HashMap()\nh!.anyInvalidMethod()\n');
        const constructorCall = AstUtils.streamAllContents(document.parseResult.value).find(isConstructorCall);
        if (!constructorCall) {
            throw new Error('No ConstructorCall found');
        }
        expect(hasCertainReceiverType(constructorCall)).toBe(true);
    });

    test('broken member syntax produces no validation-crash diagnostic', async () => {
        const document = await validate('declare java.lang.String s!\ns!.\n');
        expect(validationCrashed(document.diagnostics)).toBe(false);
    });
});

describe('Static-only access through a class reference', () => {
    test('a static field resolves via a class reference and stays clean', async () => {
        const document = await validate('use java.lang.String\nx! = String.CASE_INSENSITIVE_ORDER\n');
        expect(document.diagnostics ?? []).toHaveLength(0);
    });

    test('an instance field through a class reference is a Static-field Error, and no linking diagnostic', async () => {
        const document = await validate('use java.lang.String\nx! = String.someInstanceField\n');
        expect(linkingDiagnostics(document.diagnostics)).toHaveLength(0);
        const matches = diagnosticsForMember(document.diagnostics, 'someInstanceField');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(matches[0].message).toBe("Static field 'someInstanceField' is not defined on String");
    });

    test('both static and instance fields resolve through an instance receiver', async () => {
        const document = await validate('declare java.lang.String s!\nx! = s!.CASE_INSENSITIVE_ORDER\ny! = s!.someInstanceField\n');
        expect(document.diagnostics ?? []).toHaveLength(0);
    });

    test('an instance method is still reachable through a class reference, unlike an instance field', async () => {
        // Linking itself may still keep its own pre-existing Warning for this shape (out of scope
        // for this check to fix) -- the guard only has to stop a NEW Error from firing on top of it.
        const document = await validate('use java.lang.String\nx! = String.charAt(1)\n');
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });
});

describe('The unknown-member Error in files with other errors', () => {
    test('the Error for the unknown member coexists with other Errors in the same file, and an unrelated linking warning stays hidden', async () => {
        const document = await validate('declare java.lang.String s!\ns!.anyInvalidMethod()\na = 1 b = 2\nq = nosuchvar\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect((document.diagnostics ?? []).some(d => d.message.includes('nosuchvar'))).toBe(false);
    });

    // A genuine Chevrotain parser error in this grammar consumes the rest of the token stream in
    // every shape tried (a lone close paren, a stray semicolon chain) -- nothing downstream ever
    // runs on the following statement, so there is no way to build an integration test proving
    // survival specifically alongside a *parser* error. An unterminated string literal is a
    // *lexer* error instead, and recovers cleanly: the following statement still links and
    // validates, giving a real (non-synthetic) case of the new Error coexisting with another
    // Error-severity diagnostic. applyDiagnosticHierarchy's own Rule 1/Rule 2 behavior is proven
    // directly from the rule bodies in the test below.
    test('the Error survives alongside a lexer error from an unterminated string literal', async () => {
        const document = await validate('x$ = "abc\ndeclare java.lang.String s!\ns!.anyInvalidMethod()\n');
        expect(document.parseResult.parserErrors).toHaveLength(0);
        expect(document.parseResult.lexerErrors.length).toBeGreaterThan(0);
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
    });

    test('applyDiagnosticHierarchy keeps a parse error and the unknown-member Error, and drops the linking warning', () => {
        const parseError: Diagnostic = {
            message: 'Expecting end of file but found `)`.',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            severity: DiagnosticSeverity.Error,
            data: { code: DocumentValidator.ParsingError }
        };
        const linkingWarning: Diagnostic = {
            message: "Could not resolve reference to NamedElement named 'foo'.",
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } },
            severity: DiagnosticSeverity.Warning,
            data: { code: DocumentValidator.LinkingError }
        };
        const unknownMemberError: Diagnostic = {
            message: "Method 'anyInvalidMethod' is not defined on String",
            range: { start: { line: 2, character: 0 }, end: { line: 2, character: 16 } },
            severity: DiagnosticSeverity.Error,
            data: { code: UNKNOWN_JAVA_MEMBER_CODE }
        };
        const result = applyDiagnosticHierarchy([parseError, linkingWarning, unknownMemberError], true, 20);
        expect(result).toContainEqual(parseError);
        expect(result).toContainEqual(unknownMemberError);
        expect(result).not.toContainEqual(linkingWarning);
    });

    test('dropShadowedMemberLinkingDiagnostics removes a same-range linking diagnostic, keeps a different-range one, and returns the input unchanged when there is no unknown-member Error', () => {
        const range = { start: { line: 1, character: 3 }, end: { line: 1, character: 19 } };
        const unknownMemberError: Diagnostic = {
            message: "Method 'anyInvalidMethod' is not defined on String",
            range,
            severity: DiagnosticSeverity.Error,
            data: { code: UNKNOWN_JAVA_MEMBER_CODE }
        };
        const sameRangeLinking: Diagnostic = {
            message: "Could not resolve reference to NamedElement named 'anyInvalidMethod'.",
            range,
            severity: DiagnosticSeverity.Warning,
            data: { code: DocumentValidator.LinkingError }
        };
        const otherRangeLinking: Diagnostic = {
            message: "Could not resolve reference to NamedElement named 'nosuchvar'.",
            range: { start: { line: 3, character: 0 }, end: { line: 3, character: 9 } },
            severity: DiagnosticSeverity.Warning,
            data: { code: DocumentValidator.LinkingError }
        };

        const result = dropShadowedMemberLinkingDiagnostics([unknownMemberError, sameRangeLinking, otherRangeLinking]);
        expect(result).toEqual([unknownMemberError, otherRangeLinking]);

        const noUnknownMember = [otherRangeLinking];
        expect(dropShadowedMemberLinkingDiagnostics(noUnknownMember)).toBe(noUnknownMember);
    });
});
