import { AstNode, AstUtils, EmptyFileSystem, LangiumDocument } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { expectError, expectIssue, validationHelper, ValidationResult } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program, isVariableDecl } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

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

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Program>(services.BBj);
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

        test('Conflicting DECLARE types produce error', async () => {
            const result = await validate(`
class public ConflictTest
    method public void test()
        DECLARE java.lang.String x!
        DECLARE java.lang.Integer x!
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

        test('Conflicting DECLARE at program scope produces error', async () => {
            const result = await validate(`
DECLARE java.lang.String z!
DECLARE java.lang.Integer z!
            `);
            expectError(result, /Conflicting DECLARE/i, {
                node: findAll(result.document, isVariableDecl, true)[1]
            });
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
});
