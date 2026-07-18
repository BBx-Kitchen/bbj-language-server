import { EmptyFileSystem } from 'langium';
import { beforeAll, afterEach, describe, expect, test } from 'vitest';
import { validationHelper } from 'langium/test';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import { Program } from '../src/language/generated/ast.js';
import { setTypeResolutionWarnings } from '../src/language/bbj-validator.js';

// Uses the test module's FAKE Java classes (java.util.HashMap, java.lang.String,
// java.lang.Class, BBjAPI) so declared/returned types actually resolve. See bbj-test-module.ts.
const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
const validate = validationHelper<Program>(BBj);

// The diagnostic emitted by the #437 return-type check. Assertions target this message
// specifically — incidental "Could not resolve reference to ..." linking diagnostics appear
// whenever a type isn't in the fake classpath and are irrelevant here.
const INCOMPATIBLE = 'returns a value of incompatible type';

async function returnTypeDiagnostics(code: string): Promise<string[]> {
    const result = await validate(code);
    return result.diagnostics
        .filter(d => d.message.includes(INCOMPATIBLE))
        .map(d => d.message);
}

describe('#437 validate returned value against a Java / non-BBj return type', () => {
    beforeAll(async () => { await initializeWorkspace(shared); });
    afterEach(() => setTypeResolutionWarnings(true));

    test('string returned for a java.util.HashMap return type is flagged', async () => {
        const diagnostics = await returnTypeDiagnostics(`
use java.util.HashMap
class public Test
  method public java.util.HashMap doSomething()
    methodret ""
  methodend
classend
`);
        expect(diagnostics).toEqual([
            `Method 'doSomething' declares return type 'java.util.HashMap' but returns a value of incompatible type 'java.lang.String'.`
        ]);
    });

    test('the incompatibility is reported as an error', async () => {
        const result = await validate(`
use java.util.HashMap
class public Test
  method public java.util.HashMap doSomething()
    methodret ""
  methodend
classend
`);
        const diag = result.diagnostics.find(d => d.message.includes(INCOMPATIBLE));
        expect(diag).toBeDefined();
        expect(diag!.severity).toBe(1); // 1 = Error
    });

    describe('no false positives', () => {
        test('exact type match: string returned for a java.lang.String return type', async () => {
            const diagnostics = await returnTypeDiagnostics(`
class public Test
  method public java.lang.String doSomething()
    methodret ""
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });

        test('BBjString scalar return type is left to the loose literal check', async () => {
            const diagnostics = await returnTypeDiagnostics(`
class public Test
  method public BBjString doSomething()
    methodret ""
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });

        test('java.lang.Object return type accepts any returned value (top type)', async () => {
            // Object is not in the fake classpath, so the declared type does not resolve and the
            // check skips silently — never a false positive. When Object does resolve it is treated
            // as the top type by isAssignable().
            const diagnostics = await returnTypeDiagnostics(`
class public Test
  method public java.lang.Object doSomething()
    methodret ""
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });

        test('a supertype (CharSequence) return type accepts a String value', async () => {
            const diagnostics = await returnTypeDiagnostics(`
class public Test
  method public java.lang.CharSequence doSomething()
    methodret ""
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });

        test('an unresolved declared return type is not flagged', async () => {
            const diagnostics = await returnTypeDiagnostics(`
class public Test
  method public com.example.Unknown doSomething()
    methodret ""
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });

        test('a returned value whose type does not resolve is not flagged', async () => {
            const diagnostics = await returnTypeDiagnostics(`
use java.util.HashMap
class public Test
  method public java.util.HashMap doSomething()
    methodret unknownVar!
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });

        test('a non-final returned Java type is not flagged (hierarchy not walkable)', async () => {
            // Returning a HashMap where a String is declared is a genuine mismatch, but HashMap is
            // not a known final type, so its supertype set is unknown and we deliberately defer
            // rather than risk a false positive on a legitimate subtype return.
            const diagnostics = await returnTypeDiagnostics(`
use java.util.HashMap
class public Test
  method public java.lang.String doSomething()
    methodret new java.util.HashMap()
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });

        test('a BBj subtype instance returned for a BBj supertype is not flagged', async () => {
            const diagnostics = await returnTypeDiagnostics(`
class public Animal
classend
class public Dog extends Animal
classend
class public Test
  method public Animal make()
    declare Dog d!
    d! = new Dog()
    methodret d!
  methodend
classend
`);
            expect(diagnostics).toHaveLength(0);
        });
    });

    test('the check is silent when typeResolutionWarnings is disabled', async () => {
        setTypeResolutionWarnings(false);
        const diagnostics = await returnTypeDiagnostics(`
use java.util.HashMap
class public Test
  method public java.util.HashMap doSomething()
    methodret ""
  methodend
classend
`);
        expect(diagnostics).toHaveLength(0);
    });
});
