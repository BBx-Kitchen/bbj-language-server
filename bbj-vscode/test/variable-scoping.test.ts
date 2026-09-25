import { AstNode, AstUtils, EmptyFileSystem, LangiumDocument } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { expectError, expectIssue, expectWarning, parseHelper, validationHelper, ValidationResult } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjServices } from '../src/language/bbj-module.js';
import { isFieldDecl, isSymbolRef, isVariableDecl, Model, Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { recallLangiumDiagnostics } from '../src/language/bbj-diagnostic-reconciliation.js';

/**
 * Find all AST nodes matching a filter in a document.
 */
function findAll<T extends AstNode = AstNode>(document: LangiumDocument, filter: (item: unknown) => item is T, streamAll: boolean = false): T[] {
    return (streamAll ? AstUtils.streamAllContents(document.parseResult.value) : AstUtils.streamContents(document.parseResult.value)).filter(filter).toArray();
}

/**
 * Helper to assert a hint-severity diagnostic exists with the given message pattern.
 */
function expectHint<T extends Program>(
    validationResult: ValidationResult<T>,
    message: string | RegExp,
): void {
    expectIssue(validationResult, {
        message,
        severity: DiagnosticSeverity.Hint,
    });
}

/**
 * Helper to assert NO hint-severity diagnostics exist with a given message pattern.
 */
function expectNoHints<T extends Program>(
    validationResult: ValidationResult<T>,
    messagePattern?: RegExp,
): void {
    const hints = validationResult.diagnostics.filter(
        d => d.severity === DiagnosticSeverity.Hint
            && (!messagePattern || messagePattern.test(d.message))
    );
    expect(hints, `Expected no hint diagnostics${messagePattern ? ` matching ${messagePattern}` : ''}, but found ${hints.length}:\n${hints.map(h => `  - ${h.message}`).join('\n')}`).toHaveLength(0);
}

describe('Variable Scoping', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;
    // Conflict checks need both DECLARE types to resolve. The test double preloads
    // java.lang.String and java.util.HashMap, so these tests pass without a live :5008.
    const hermeticServices = createBBjTestServices(EmptyFileSystem);
    let validateHermetic: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Program>(services.BBj);
        await initializeWorkspace(hermeticServices.shared);
        validateHermetic = validationHelper<Program>(hermeticServices.BBj);
    });

    // ========================================================================
    // SCOPE-01: Use before assignment
    // ========================================================================
    describe('SCOPE-01: Use before assignment', () => {

        test('Variable used before LET shows hint', async () => {
            const result = await validate(`
PRINT x$
LET x$ = "hello"
            `);
            expectHint(result, /x\$.*used before assignment/i);
        });

        test('Variable used after LET shows no hint', async () => {
            const result = await validate(`
LET x$ = "hello"
PRINT x$
            `);
            expectNoHints(result, /used before assignment/i);
        });

        test('Variable used before DIM shows hint', async () => {
            const result = await validate(`
PRINT a$
DIM a$[10]
            `);
            expectHint(result, /a\$.*used before assignment/i);
        });

        test('Variable used before plain assignment shows hint', async () => {
            const result = await validate(`
PRINT y
y = 5
            `);
            expectHint(result, /y.*used before assignment/i);
        });

        test('Variable used before FOR init shows hint', async () => {
            const result = await validate(`
PRINT i
FOR i = 1 TO 10
NEXT i
            `);
            expectHint(result, /i.*used before assignment/i);
        });

        test('DREAD counts as assignment', async () => {
            const result = await validate(`
PRINT a$
DREAD a$
            `);
            expectHint(result, /a\$.*used before assignment/i);

            // Opposite direction: DREAD before PRINT should have no hint
            const result2 = await validate(`
DREAD b$
PRINT b$
            `);
            expectNoHints(result2, /b\$.*used before assignment/i);
        });

        test('Variable in compound statement', async () => {
            const result = await validate(`
x = 1 ; PRINT y ; y = 2
            `);
            expectHint(result, /y.*used before assignment/i);
        });

        test('No hint for DECLARE variable used before DECLARE statement', async () => {
            const result = await validate(`
class public TestDecl
    method public void test()
        PRINT myVar!
        DECLARE java.lang.String myVar!
    methodend
classend
            `);
            expectNoHints(result, /myVar.*used before assignment/i);
        });

        test('Method scope: use before assignment in method body', async () => {
            const result = await validate(`
class public TestScope
    method public void test()
        PRINT x
        x = 5
    methodend
classend
            `);
            expectHint(result, /x.*used before assignment/i);
        });

        test('Method params are always visible', async () => {
            const result = await validate(`
class public TestParams
    method public void test(BBjString name$)
        PRINT name$
    methodend
classend
            `);
            expectNoHints(result, /name.*used before assignment/i);
        });

        test('No hint for unresolved references', async () => {
            const result = await validate(`
PRINT unknownVar$
            `);
            // Should NOT produce use-before-assignment hint
            // (only linking warning for unresolved reference)
            expectNoHints(result, /used before assignment/i);
        });

        test('Assignment inside IF counts (branching ignored)', async () => {
            const result = await validate(`
cond = 1
IF cond THEN x = 1
PRINT x
            `);
            // The IF line is above PRINT, so assignment is "before" usage
            expectNoHints(result, /x.*used before assignment/i);
        });

        test('Multiple variables, some before some after', async () => {
            const result = await validate(`
PRINT a
b = 1
PRINT b
a = 2
            `);
            // 'a' used before assignment
            expectHint(result, /a.*used before assignment/i);
            // 'b' used after assignment - no hint
            const bHints = result.diagnostics.filter(
                d => d.severity === DiagnosticSeverity.Hint && /\bb\b.*used before assignment/i.test(d.message)
            );
            expect(bHints).toHaveLength(0);
        });

        test('READ statement variables count as assignment', async () => {
            const result = await validate(`
READ(1)a$
PRINT a$
            `);
            expectNoHints(result, /a\$.*used before assignment/i);
        });

        test('ENTER statement variables count as assignment', async () => {
            const result = await validate(`
ENTER a$
PRINT a$
            `);
            expectNoHints(result, /a\$.*used before assignment/i);
        });

        test('Variable on same line as assignment has no hint', async () => {
            const result = await validate(`
x = 5
PRINT x
            `);
            expectNoHints(result, /used before assignment/i);
        });

        test('P61-D2-010: excluded subtree (a method body) is pruned from the outer scope walk, not just skipped', async () => {
            // The method body correctly assigns x before reading it. A same-named, later
            // program-scope assignment to x must not make the outer Program-scope walk reach
            // into the method body and flag the method's own perfectly valid read — Pass 2's
            // traversal is documented not to enter nested MethodDecl/BbjClass/DefFunction
            // bodies at all (they have their own dedicated validation pass).
            const result = await validate(`
class public TestPrune
    method public void test()
        x = 1
        PRINT x
    methodend
classend

x = 99
            `);
            expectNoHints(result, /x.*used before assignment/i);
        });
    });

    // ========================================================================
    // SCOPE-04: DIM/DREAD linkage
    // ========================================================================
    describe('SCOPE-04: DIM/DREAD linkage', () => {

        test('DREAD after DIM resolves without error', async () => {
            const result = await validate(`
DIM a$[10]
DREAD a$
            `);
            // No linking errors for a$
            const linkingErrors = result.diagnostics.filter(
                d => d.message.includes('Could not resolve')
            );
            expect(linkingErrors.filter(e => /\ba\$\b/i.test(e.message))).toHaveLength(0);
        });

        test('DREAD creates variable in scope if not DIMd', async () => {
            const result = await validate(`
DREAD x$
PRINT x$
            `);
            // No linking errors for x$
            const linkingErrors = result.diagnostics.filter(
                d => d.message.includes('Could not resolve') && /\bx\$\b/i.test(d.message)
            );
            expect(linkingErrors).toHaveLength(0);
        });

        test('DIM then DREAD preserves array info', async () => {
            const result = await validate(`
DIM key$[10]
DREAD key$
PRINT key$
            `);
            const linkingErrors = result.diagnostics.filter(
                d => d.message.includes('Could not resolve') && /\bkey\$\b/i.test(d.message)
            );
            expect(linkingErrors).toHaveLength(0);
        });
    });

    // ========================================================================
    // SCOPE-05: DECLARE type propagation
    // ========================================================================
    describe('SCOPE-05: DECLARE type propagation', () => {

        test('Conflicting DECLARE types produce error inside a method body', async () => {
            // The one deliberate exception: two DECLAREs of one name inside a single method
            // body, whose types both resolve and are unrelated, stays an error on purpose.
            const result = await validateHermetic(`
class public ConflictTest
    method public void test()
        DECLARE java.lang.String x!
        DECLARE java.util.HashMap x!
    methodend
classend
            `);
            expectError(result, /Conflicting DECLARE/i, {
                node: findAll(result.document, isVariableDecl, true)[1]
            });
        });

        test('Same-type duplicate DECLARE is fine', async () => {
            const result = await validate(`
class public DupeTest
    method public void test()
        DECLARE java.lang.String x!
        DECLARE java.lang.String x!
    methodend
classend
            `);
            const conflictErrors = result.diagnostics.filter(
                d => d.severity === DiagnosticSeverity.Error && /Conflicting DECLARE/i.test(d.message)
            );
            expect(conflictErrors).toHaveLength(0);
        });

        test('DECLARE in method body applies to entire method - no hint', async () => {
            const result = await validate(`
class public WholeScope
    method public void test()
        x$ = myVar!
        DECLARE java.lang.String myVar!
    methodend
classend
            `);
            expectNoHints(result, /myVar.*used before assignment/i);
        });

        test('DECLARE AUTO property is parsed', async () => {
            const result = await validate(`
class public AutoTest
    method public void test()
        DECLARE AUTO java.lang.String x!
    methodend
classend
            `);
            // Find the VariableDecl node and check auto === true
            const varDecls = findAll(result.document, isVariableDecl, true);
            expect(varDecls.length).toBeGreaterThan(0);
            const autoDecl = varDecls.find(d => d.name?.toLowerCase() === 'x!');
            expect(autoDecl).toBeDefined();
            expect(autoDecl!.auto).toBe(true);
        });

        test('DECLARE AUTO does not flag type mismatch vs plain DECLARE', async () => {
            const result = await validate(`
class public AutoNoConflict
    method public void test()
        DECLARE AUTO java.lang.String y!
        DECLARE java.lang.String y!
    methodend
classend
            `);
            const conflictErrors = result.diagnostics.filter(
                d => d.severity === DiagnosticSeverity.Error && /Conflicting DECLARE/i.test(d.message)
            );
            expect(conflictErrors).toHaveLength(0);
        });

        test('Conflicting DECLARE at program scope produces a warning, not an error', async () => {
            // Subroutines and event handlers share one program-level namespace, and
            // re-declaring a variable per handler is ordinary BBj practice — so an unrelated
            // resolved type pair at program level is a warning, never an error.
            const result = await validateHermetic(`
DECLARE java.lang.String z!
DECLARE java.util.HashMap z!
            `);
            expectWarning(result, /Conflicting DECLARE/i, {
                node: findAll(result.document, isVariableDecl, true)[1]
            });
            const conflictErrors = result.diagnostics.filter(
                d => d.severity === DiagnosticSeverity.Error && /Conflicting DECLARE/i.test(d.message)
            );
            expect(conflictErrors).toHaveLength(0);
        });

        test('Conflicting DECLARE of related (sub/supertype) BBj classes produces no diagnostic', async () => {
            const result = await validate(`
class public ProbeConflictBase
classend

class public ProbeConflictChild extends ProbeConflictBase
classend

class public UsesRelatedDeclares
    method public void test()
        DECLARE ProbeConflictBase pb!
        DECLARE ProbeConflictChild pb!
    methodend
classend

DECLARE ProbeConflictBase pg!
DECLARE ProbeConflictChild pg!
            `);
            const conflictErrors = result.diagnostics.filter(d => /Conflicting DECLARE/i.test(d.message));
            expect(conflictErrors).toHaveLength(0);
        });

        test('Conflicting DECLARE where a type does not resolve produces no diagnostic', async () => {
            const result = await validate(`
DECLARE NoSuchProbeClassAtAll q!
DECLARE AlsoNoSuchProbeClass q!
            `);
            const conflictErrors = result.diagnostics.filter(d => /Conflicting DECLARE/i.test(d.message));
            expect(conflictErrors).toHaveLength(0);
        });

        test('Conflicting DECLARE of two different BBj scalar types at program scope produces a warning, not an error', async () => {
            // Restores the scalar-vs-scalar conflict this check used to catch with no Java
            // classpath loaded, without needing either side to resolve to a class first.
            const result = await validate(`
DECLARE BBjNumber sv!
DECLARE BBjString sv!
            `);
            expectWarning(result, /Conflicting DECLARE/i, {
                node: findAll(result.document, isVariableDecl, true)[1]
            });
            const conflictErrors = result.diagnostics.filter(
                d => d.severity === DiagnosticSeverity.Error && /Conflicting DECLARE/i.test(d.message)
            );
            expect(conflictErrors).toHaveLength(0);
        });

        test('Conflicting DECLARE of two different BBj scalar types inside a method body produces an error', async () => {
            const result = await validate(`
class public ScalarConflictTest
    method public void test()
        DECLARE BBjNumber sv!
        DECLARE BBjString sv!
    methodend
classend
            `);
            expectError(result, /Conflicting DECLARE/i, {
                node: findAll(result.document, isVariableDecl, true)[1]
            });
        });

        test('Conflicting DECLARE of the same BBj scalar type produces no diagnostic', async () => {
            const result = await validate(`
DECLARE BBjNumber sameScalar!
DECLARE BBjNumber sameScalar!
            `);
            const conflictErrors = result.diagnostics.filter(d => /Conflicting DECLARE/i.test(d.message));
            expect(conflictErrors).toHaveLength(0);
        });

        test('Conflicting DECLARE of a BBj scalar type against an unresolvable class produces no diagnostic', async () => {
            // Only a pair where BOTH sides are scalars is caught without resolution; a mixed
            // pair still needs both sides to resolve, and the resolution-based rule is
            // unchanged for it.
            const result = await validate(`
DECLARE BBjNumber mixedPair!
DECLARE NoSuchProbeClassForMixedPair mixedPair!
            `);
            const conflictErrors = result.diagnostics.filter(d => /Conflicting DECLARE/i.test(d.message));
            expect(conflictErrors).toHaveLength(0);
        });
    });

    // ========================================================================
    // DEF FN Parameter Scoping
    // ========================================================================
    describe('DEF FN Parameter Scoping', () => {

        test('DEF FN parameters are visible inside multi-line FN body', async () => {
            const result = await validate(`
DEF FNCalc(x,y)
    LET z = x + y
    RETURN z
FNEND
LET result = FNCalc(1,2)
            `);
            expectNoHints(result, /used before assignment/i);
        });

        test('Enclosing method variables visible inside DEF FN body', async () => {
            const result = await validate(`
class public Test
    method public doWork()
        LET multiplier = 2
        DEF FNScale(x)
            RETURN x*multiplier
        FNEND
        LET result = FNScale(5)
    methodend
classend
            `);
            expectNoHints(result, /used before assignment/i);
        });

        test('Program-scope DEF FN parameters scoped correctly', async () => {
            const result = await validate(`
DEF FNDouble(n)
    RETURN n*2
FNEND
LET result = FNDouble(5)
            `);
            expectNoHints(result, /used before assignment/i);
        });

        test('DEF FN parameters do NOT leak into enclosing scope', async () => {
            const result = await validate(`
DEF FNSquare(x)
    RETURN x*x
FNEND
PRINT x
            `);
            // If parameter 'x' leaked from DEF FN into program scope,
            // PRINT x would resolve to the parameter (no diagnostic).
            // Since it does NOT leak, 'x' outside the FN is unresolved.
            // Check for warning (severity 2) about unresolved reference.
            const unresolvedErrors = result.diagnostics.filter(d =>
                d.severity === DiagnosticSeverity.Warning &&
                /Could not resolve.*x/i.test(d.message)
            );
            expect(unresolvedErrors.length).toBeGreaterThan(0);
        });
    });

    // ========================================================================
    // P61-D5-008: local shadows same-named field (bbj-scope.ts:253-292)
    // ========================================================================
    describe('P61-D5-008: local shadows a same-named field', () => {

        test('a DECLAREd local resolves in preference to a same-named class field', async () => {
            const parse = parseHelper<Model>(services.BBj);
            const document = await parse(`
class public ShadowTest
    field public java.lang.String x!

    method public void test()
        DECLARE java.lang.String x!
        PRINT x!
    methodend
classend
            `, { validation: true });

            const fieldDecl = AstUtils.streamAllContents(document.parseResult.value).find(isFieldDecl);
            // isVariableDecl also matches FieldDecl/ArrayDecl/ParameterDecl (VariableDecl's
            // $type union covers all four grammar rules) — narrow to the plain DECLARE's
            // own concrete $type to get the local, not the field.
            const localDecl = AstUtils.streamAllContents(document.parseResult.value)
                .find((n): n is AstNode => isVariableDecl(n) && n.$type === 'VariableDecl');
            expect(fieldDecl, 'field declaration must be present').toBeDefined();
            expect(localDecl, 'local DECLARE must be present').toBeDefined();
            expect(localDecl).not.toBe(fieldDecl);

            // `PRINT x!` is the only plain (non-DECLARE, non-field) reference to x! in the
            // method body — find its SymbolRef and confirm it resolved to the local, not
            // the field.
            const printRef = AstUtils.streamAllContents(document.parseResult.value)
                .filter(isSymbolRef)
                .find(ref => ref.symbol.$refText === 'x!' && ref !== fieldDecl);
            expect(printRef, 'PRINT x! reference must be present').toBeDefined();
            expect(printRef!.symbol.ref).toBe(localDecl);
            expect(printRef!.symbol.ref).not.toBe(fieldDecl);
        });
    });

    // --- section ---
    // Use before assignment with a reference that has no symbol
    // --- section ---
    describe('Use before assignment with a reference that has no symbol', () => {
        const parseHermetic = parseHelper<Model>(hermeticServices.BBj);

        test('a malformed double-sigil assignment does not stop the check', async () => {
            const document = await parseHermetic('print x\nx = 1\n## = 1\n', { validation: true });
            // The malformed `## = 1` line carries a parser error, so the published
            // (post-hierarchy) diagnostics list hides hints by design (Rule 2: any Error hides
            // warnings and hints). Assert on the remembered pre-hierarchy list instead -- that is
            // what the check itself produced before the hierarchy ran.
            const published = document.diagnostics ?? [];
            expect(published.some(d => d.message.startsWith('An error occurred during validation'))).toBe(false);

            const remembered = recallLangiumDiagnostics(document);
            expect(remembered).toBeDefined();
            expect(remembered!.some(d => d.message.startsWith('An error occurred during validation'))).toBe(false);
            const hints = remembered!.filter(d => d.severity === DiagnosticSeverity.Hint);
            expect(hints.some(h => h.message === "'x' used before assignment (first assigned at line 2)")).toBe(true);
        });

        test('building a malformed double-sigil assignment does not throw', async () => {
            await expect(parseHermetic('## = 1\n', { validation: true })).resolves.toBeDefined();
        });

        test('a malformed ENTER target does not crash scope computation', async () => {
            const document = await parseHermetic('ENTER ##\nprint y\ny = 1\n', { validation: true });
            const published = document.diagnostics ?? [];
            expect(published.some(d => d.message.startsWith('An error occurred during validation'))).toBe(false);

            const remembered = recallLangiumDiagnostics(document);
            expect(remembered).toBeDefined();
            expect(remembered!.some(d => d.message.startsWith('An error occurred during validation'))).toBe(false);
            const hints = remembered!.filter(d => d.severity === DiagnosticSeverity.Hint);
            expect(hints.some(h => h.message === "'y' used before assignment (first assigned at line 3)")).toBe(true);
        });

        // Every one of these five shapes crashed the check or the build on the base tree,
        // confirmed via a throwaway probe (run against the pre-fix sources, then restored and
        // deleted): DREAD ##, READ(1)##, and FOR ## = 1 TO 2 each produced a validation-crash
        // diagnostic; DREAD ##[ALL] did too; ENTER ##[1] threw and crashed the whole build (the
        // scope-computation site, same as the plain `ENTER ##` case above).
        const malformedInputShapes: Array<[string, string]> = [
            ['DREAD ##', 'DREAD ##\n'],
            ['READ(1)##', 'READ(1)##\n'],
            ['ENTER ##[1]', 'ENTER ##[1]\n'],
            ['DREAD ##[ALL]', 'DREAD ##[ALL]\n'],
            ['FOR ## = 1 TO 2', 'FOR ## = 1 TO 2\nNEXT\n'],
        ];

        test.each(malformedInputShapes)('a malformed %s target does not stop validation', async (_label, text) => {
            const document = await parseHermetic(text, { validation: true });
            const published = document.diagnostics ?? [];
            expect(published.some(d => d.message.startsWith('An error occurred during validation'))).toBe(false);
        });

        test('a malformed reference inside a class method body still produces the method-scope hint', async () => {
            const document = await parseHermetic(`
class public A
    method public void m()
        print z
        z = 1
        ## = 1
    methodend
classend
            `, { validation: true });
            const published = document.diagnostics ?? [];
            expect(published.some(d => d.message.startsWith('An error occurred during validation'))).toBe(false);

            const remembered = recallLangiumDiagnostics(document);
            expect(remembered).toBeDefined();
            expect(remembered!.some(d => d.message.startsWith('An error occurred during validation'))).toBe(false);
            const hints = remembered!.filter(d => d.severity === DiagnosticSeverity.Hint);
            expect(hints.some(h => /^'z' used before assignment/.test(h.message))).toBe(true);
        });

        test('the check adds nothing for the malformed node itself -- exactly one hint, for the real variable', async () => {
            const document = await parseHermetic('print x\nx = 1\n## = 1\n', { validation: true });
            const remembered = recallLangiumDiagnostics(document);
            expect(remembered).toBeDefined();
            const usedBeforeAssignmentHints = remembered!.filter(
                d => d.severity === DiagnosticSeverity.Hint && /used before assignment/i.test(d.message)
            );
            expect(usedBeforeAssignmentHints).toHaveLength(1);
            expect(usedBeforeAssignmentHints[0].message).toBe("'x' used before assignment (first assigned at line 2)");
        });

        test('the single-sigil `# = 1` shape behaves exactly as before (control case)', async () => {
            const document = await parseHermetic('# = 1\nprint z\nz = 1\n', { validation: true });
            const messages = (document.diagnostics ?? []).map(d => d.message);
            // Confirmed via the same throwaway pre-Task-1 probe: the base tree produces the
            // identical shape here -- a single `#` never reaches an Assignment or SymbolRef node
            // this plan's guards touch at all (it is a bare parser-level rejection at the very
            // first token of the file), so nothing this plan changed can affect it. Compared by
            // count and by each message's own stable, deterministic text/prefix rather than a
            // literal multi-kilobyte snapshot of Chevrotain's full alternative-token listing.
            expect(messages).toHaveLength(2);
            expect(messages[1]).toBe('Expecting end of file but found `#`.');
            expect(messages[0]).toMatch(/^Expecting: one of these possible Token sequences:/);
        });

        test('validating the same malformed input twice in a row yields identical diagnostics both times', async () => {
            const firstDocument = await parseHermetic('print x\nx = 1\n## = 1\n', { validation: true });
            const secondDocument = await parseHermetic('print x\nx = 1\n## = 1\n', { validation: true });
            const firstMessages = (firstDocument.diagnostics ?? []).map(d => d.message);
            const secondMessages = (secondDocument.diagnostics ?? []).map(d => d.message);
            expect(firstMessages).toEqual(secondMessages);

            const firstRemembered = recallLangiumDiagnostics(firstDocument)?.map(d => d.message);
            const secondRemembered = recallLangiumDiagnostics(secondDocument)?.map(d => d.message);
            expect(firstRemembered).toBeDefined();
            expect(firstRemembered).toEqual(secondRemembered);
        });
    });
});
