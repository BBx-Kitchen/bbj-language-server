import { AstUtils, DocumentValidator, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module.js';
import { Expression, isConstructorCall, isMemberCall, Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';
import {
    UNKNOWN_JAVA_MEMBER_CODE,
    hasCertainReceiverType,
    isFullyResolvedJavaClass,
    isUniversalObjectReceiver
} from '../src/language/validations/check-unknown-java-member.js';
import {
    applyDiagnosticHierarchy,
    dropShadowedMemberLinkingDiagnostics,
    isJavaMemberLinkingWarning,
    javaMemberLinkingMessage,
    javaMemberOwnerName
} from '../src/language/bbj-document-validator.js';

const services = createBBjTestServices(EmptyFileSystem);
const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

beforeAll(async () => {
    await initializeWorkspace(services.shared);
});

/** Diagnostics whose message mentions the given member name, quoted exactly as the check quotes it. */
function diagnosticsForMember(diagnostics: Diagnostic[] | undefined, memberName: string): Diagnostic[] {
    return (diagnostics ?? []).filter(d => Diagnostic.getMessageString(d).includes(`'${memberName}'`));
}

function linkingDiagnostics(diagnostics: Diagnostic[] | undefined): Diagnostic[] {
    return (diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
}

function hasUnknownMemberDiagnostic(diagnostics: Diagnostic[] | undefined): boolean {
    return (diagnostics ?? []).some(d => d.data?.code === UNKNOWN_JAVA_MEMBER_CODE);
}

function validationCrashed(diagnostics: Diagnostic[] | undefined): boolean {
    return (diagnostics ?? []).some(d => Diagnostic.getMessageString(d).startsWith('An error occurred during validation'));
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
        expect(Diagnostic.getMessageString(diagnostic)).toBe("Method 'anyInvalidMethod' is not defined on String");
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
        expect(Diagnostic.getMessageString(matches[0])).toBe("Field 'anyInvalidField' is not defined on String");
    });

    test('an unknown method on a constructed Java object is one Error', async () => {
        const document = await validate('h! = new java.util.HashMap()\nh!.anyInvalidMethod()\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(Diagnostic.getMessageString(matches[0])).toBe("Method 'anyInvalidMethod' is not defined on HashMap");
    });
});

describe("Receivers that keep today's diagnostics", () => {
    test('an unresolved class keeps its linking warning', async () => {
        const document = await validate('declare java.util.ArrayList a!\na!.anyInvalidMethod()\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => Diagnostic.getMessageString(d).includes('anyInvalidMethod'))).toBe(true);
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
        expect(linkingDiagnostics(document.diagnostics).some(d => Diagnostic.getMessageString(d).includes('nothing'))).toBe(true);
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
        expect(linkingDiagnostics(document.diagnostics).some(d => Diagnostic.getMessageString(d).includes('CHARAT'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a member reached through a method return keeps its linking warning (getClass().anyInvalidMethod())', async () => {
        const document = await validate('declare java.util.HashMap h!\nx! = h!.getClass().anyInvalidMethod()\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => Diagnostic.getMessageString(d).includes('anyInvalidMethod'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a variable assigned from a method return also keeps its linking warning', async () => {
        const document = await validate('declare java.util.HashMap h!\nc! = h!.getClass()\nc!.anyInvalidMethod()\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => Diagnostic.getMessageString(d).includes('anyInvalidMethod'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('hasCertainReceiverType does not trust a resolved symbol named "bbjapi" that is not the real built-in', () => {
        // The name-only check used to trust any `bbjapi(...)` call by its reference text alone.
        // Simulate what a shadowing user-declared symbol resolving to something else entirely
        // would look like, to prove the guard now checks what the reference actually resolves to.
        const shadowingSymbol = { $type: 'DefFunction', name: 'bbjapi' };
        const shadowedReceiver = {
            $type: 'MethodCall',
            method: {
                $type: 'SymbolRef',
                symbol: { $refText: 'bbjapi', ref: shadowingSymbol }
            }
        } as unknown as Expression;
        expect(hasCertainReceiverType(shadowedReceiver)).toBe(false);
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

    test('an empty-string first assignment does not make a later reassignment to a different type certain', async () => {
        // Found via the live-backend corpus review: an empty string is a common BBj
        // "not yet assigned" sentinel for an auto-declared variable, later reassigned to a real
        // object -- the shared declaring-occurrence-is-the-first-assignment scoping rule means
        // every reference's receiver type traces back to that placeholder, not the real one.
        const document = await validate('x! = ""\nx! = new java.util.HashMap()\nx!.anyInvalidMethod()\n');
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a variable reconstructed as a different class elsewhere is not certain either', async () => {
        // Found via the live-backend corpus review: a variable first constructed as one class,
        // then reconstructed as a completely different class a few lines later -- the shared
        // declaring-occurrence-is-the-first-assignment scoping rule means every reference's
        // receiver type still traces back to the FIRST construction, misreporting a member that
        // may well exist on the class the variable actually held at the point of the call.
        const document = await validate('x! = new java.util.HashMap()\nx! = new java.lang.String()\nx!.anyInvalidMethod()\n');
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('a declared array of a Java class keeps its linking warning on .length, not the new Error', async () => {
        // Java's own array .length pseudo-field is not a member of the element class itself -- a
        // declared array receiver is not certain enough to trust an "unknown member" verdict on.
        const document = await validate('declare java.lang.String[] arr!\nx! = arr!.length\n');
        expect(linkingDiagnostics(document.diagnostics).some(d => Diagnostic.getMessageString(d).includes('length'))).toBe(true);
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });

    test('isUniversalObjectReceiver is true only for java.lang.Object, never for another resolved class', () => {
        const objectClass = {
            $type: 'JavaClass',
            name: 'Object',
            packageName: 'java.lang',
            methods: [],
            fields: []
        };
        expect(isUniversalObjectReceiver(objectClass)).toBe(true);

        const stringClass = services.BBj.java.JavaInteropService.getResolvedClass('java.lang.String');
        expect(isUniversalObjectReceiver(stringClass)).toBe(false);

        const namedObjectSubclass = { $type: 'JavaClass', name: 'Object', packageName: 'com.example', methods: [], fields: [] };
        expect(isUniversalObjectReceiver(namedObjectSubclass)).toBe(false);
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
        expect(Diagnostic.getMessageString(matches[0])).toBe("Static field 'someInstanceField' is not defined on String");
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

    test('a bare nested-type-shaped reference on a class ref does not become a false-positive Error', async () => {
        // java-interop's JavaClass model never reports nested-class membership (`classes` is
        // always empty), so a PascalCase member name that is neither a known method nor a known
        // field might still be a real nested type or enum used as a value on its own -- not just
        // when chained into a further member access.
        const document = await validate('use java.lang.String\nx! = String.SomeNestedThing\n');
        expect(hasUnknownMemberDiagnostic(document.diagnostics)).toBe(false);
    });
});

describe('The unknown-member Error in files with other errors', () => {
    test('the Error for the unknown member coexists with other Errors in the same file, and an unrelated linking warning stays hidden', async () => {
        const document = await validate('declare java.lang.String s!\ns!.anyInvalidMethod()\na = 1 b = 2\nq = nosuchvar\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect((document.diagnostics ?? []).some(d => Diagnostic.getMessageString(d).includes('nosuchvar'))).toBe(false);
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

describe('An unresolved member on an uncertain Java receiver stays visible next to an unrelated Error', () => {
    test('the flagged Warning survives next to bbj-line-break Errors from an unrelated statement', async () => {
        const document = await validate('declare java.util.HashMap h!\nc! = h!.getClass()\nc!.anyInvalidMethod()\na = 1 b = 2\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Warning);
        expect(matches[0].data?.code).toBe(DocumentValidator.LinkingError);
        expect(isJavaMemberLinkingWarning(matches[0])).toBe(true);
        const errorCount = (document.diagnostics ?? []).filter(d => d.severity === DiagnosticSeverity.Error).length;
        expect(errorCount).toBe(2);
    });

    test('the flagged Warning is present, and flagged, even with no other Error in the file', async () => {
        const document = await validate('declare java.util.HashMap h!\nc! = h!.getClass()\nc!.anyInvalidMethod()\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(isJavaMemberLinkingWarning(matches[0])).toBe(true);
    });

    test('a chained getClass().anyInvalidMethod() receiver also keeps its flagged Warning', async () => {
        const document = await validate('declare java.util.HashMap h!\nx! = h!.getClass().anyInvalidMethod()\na = 1 b = 2\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(isJavaMemberLinkingWarning(matches[0])).toBe(true);
    });

    test('an ordinary unresolved variable still follows Rule 2 and stays hidden next to an Error', async () => {
        const document = await validate('declare java.util.HashMap h!\nc! = h!.getClass()\nc!.anyInvalidMethod()\na = 1 b = 2\nq = nosuchvar\n');
        expect((document.diagnostics ?? []).some(d => Diagnostic.getMessageString(d).includes('nosuchvar'))).toBe(false);
    });
});

describe('applyDiagnosticHierarchy Rule 2 exempts a flagged Java-member linking Warning', () => {
    test('keeps a semantic Error, the flagged Java-member Warning, and drops an unflagged linking Warning', () => {
        const semanticError: Diagnostic = {
            message: "Method 'anyInvalidMethod' is not defined on String",
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 16 } },
            severity: DiagnosticSeverity.Error,
            data: { code: UNKNOWN_JAVA_MEMBER_CODE }
        };
        const flaggedWarning: Diagnostic = {
            message: "'anyInvalidMethod' is not a known method or field of HashMap",
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } },
            severity: DiagnosticSeverity.Warning,
            data: { code: DocumentValidator.LinkingError, javaMemberAccess: true }
        };
        const unflaggedWarning: Diagnostic = {
            message: "Could not resolve reference to NamedElement named 'nosuchvar'.",
            range: { start: { line: 2, character: 0 }, end: { line: 2, character: 9 } },
            severity: DiagnosticSeverity.Warning,
            data: { code: DocumentValidator.LinkingError }
        };
        const result = applyDiagnosticHierarchy([semanticError, flaggedWarning, unflaggedWarning], true, 20);
        expect(result).toContainEqual(semanticError);
        expect(result).toContainEqual(flaggedWarning);
        expect(result).not.toContainEqual(unflaggedWarning);
    });

    test('Rule 1 is unchanged: a parse error still drops the flagged Java-member Warning', () => {
        const parseError: Diagnostic = {
            message: 'Expecting end of file but found `)`.',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            severity: DiagnosticSeverity.Error,
            data: { code: DocumentValidator.ParsingError }
        };
        const flaggedWarning: Diagnostic = {
            message: "'anyInvalidMethod' is not a known method or field of HashMap",
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } },
            severity: DiagnosticSeverity.Warning,
            data: { code: DocumentValidator.LinkingError, javaMemberAccess: true }
        };
        const result = applyDiagnosticHierarchy([parseError, flaggedWarning], true, 20);
        expect(result).toContainEqual(parseError);
        expect(result).not.toContainEqual(flaggedWarning);
    });
});

describe('javaMemberLinkingMessage: the flagged Warning names the member and its owner', () => {
    test('an owner name is available', () => {
        expect(javaMemberLinkingMessage('foo', 'HashMap', "Could not resolve reference to NamedElement named 'foo'. [in a/b.bbj:3]"))
            .toBe("'foo' is not a known method or field of HashMap [in a/b.bbj:3]");
    });

    test('no owner name is available', () => {
        expect(javaMemberLinkingMessage('foo', undefined, "Could not resolve reference to NamedElement named 'foo'. [in a/b.bbj:3]"))
            .toBe("Cannot resolve 'foo' [in a/b.bbj:3]");
    });

    test('an original message with no suffix gives a result with none', () => {
        expect(javaMemberLinkingMessage('foo', 'HashMap', "Could not resolve reference to NamedElement named 'foo'."))
            .toBe("'foo' is not a known method or field of HashMap");
    });
});

describe('javaMemberOwnerName', () => {
    test('a stub class (error set) has no owner name', () => {
        const stub = { $type: 'JavaClass', name: 'X', error: 'stub', methods: [], fields: [] };
        expect(javaMemberOwnerName(stub)).toBeUndefined();
    });

    test('a fully resolved class returns its last dot segment', () => {
        const resolved = services.BBj.java.JavaInteropService.getResolvedClass('java.util.HashMap');
        expect(javaMemberOwnerName(resolved)).toBe('HashMap');
    });

    test('a non-JavaClass value has no owner name', () => {
        expect(javaMemberOwnerName(undefined)).toBeUndefined();
        expect(javaMemberOwnerName({ $type: 'JavaPackage', name: 'java.util' })).toBeUndefined();
    });
});

describe('The flagged Warning reads in plain words end to end, and other wordings are unchanged', () => {
    test("uses the owner's simple name and keeps the [in ...] suffix", async () => {
        const document = await validate('declare java.util.HashMap h!\nc! = h!.getClass()\nc!.anyInvalidMethod()\na = 1 b = 2\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(Diagnostic.getMessageString(matches[0])).toMatch(/^'anyInvalidMethod' is not a known method or field of Class( \[in [^\]]+\])?$/);
    });

    test('an ordinary unresolved variable keeps NamedElement wording and no flag', async () => {
        const document = await validate('print undefinedVar\n');
        const matches = (document.diagnostics ?? []).filter(d => Diagnostic.getMessageString(d).includes('undefinedVar'));
        expect(matches.length).toBeGreaterThan(0);
        expect(Diagnostic.getMessageString(matches[0])).toContain("Could not resolve reference to NamedElement named 'undefinedVar'");
        expect(isJavaMemberLinkingWarning(matches[0])).toBe(false);
    });

    test('a BBj class receiver keeps Langium wording and is not flagged', async () => {
        const document = await validate('class public Foo\nclassend\ndeclare Foo f!\nf!.nothing()\n');
        const matches = diagnosticsForMember(document.diagnostics, 'nothing');
        expect(matches.length).toBeGreaterThan(0);
        expect(Diagnostic.getMessageString(matches[0])).toContain('NamedElement');
        expect(isJavaMemberLinkingWarning(matches[0])).toBe(false);
    });

    test('a certain receiver still shows exactly one diagnostic: the Error, not a linking Warning', async () => {
        const document = await validate('declare java.lang.String s!\ns!.anyInvalidMethod()\na = 1 b = 2\n');
        const matches = diagnosticsForMember(document.diagnostics, 'anyInvalidMethod');
        expect(matches).toHaveLength(1);
        expect(matches[0].severity).toBe(DiagnosticSeverity.Error);
        expect(matches[0].data?.code).toBe(UNKNOWN_JAVA_MEMBER_CODE);
        expect(linkingDiagnostics(document.diagnostics).some(d => Diagnostic.getMessageString(d).includes('anyInvalidMethod'))).toBe(false);
    });
});
