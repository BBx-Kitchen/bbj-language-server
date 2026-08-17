import { EmptyFileSystem } from 'langium';
import { validationHelper, ValidationResult } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import type { Program } from '../src/language/generated/ast.js';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);

/**
 * Regression coverage for #494: the member-visibility check walked the using class's
 * `extends` chain with no visited set, so a cycle that did not contain the declaring
 * class re-expanded the same classes forever.
 *
 * The walk is synchronous, so the consequence was the #232 signature — 100% CPU, a
 * server that stops answering, and one that outlives the editor because a blocked
 * event loop starves the `clientProcessId` watchdog timer.
 *
 * Which is also why these tests cannot fail fast: if the guard is removed they hang
 * rather than fail, since no in-process timeout can interrupt a blocked event loop.
 * Once #493 lands, adding these sources to its child-process guard table converts a
 * regression here into a readable failure.
 *
 * The access-level semantics themselves are covered by
 * "Call instance members with different access levels" in validation.test.ts; the
 * cases below pin that the cycle guard leaves those semantics intact.
 */

const CYCLE_DIAGNOSTICS = [
    "Cyclic inheritance detected: class 'A' is involved in an inheritance cycle.",
    "Cyclic inheritance detected: class 'B' is involved in an inheritance cycle."
];

function messages(result: ValidationResult<Program>): string[] {
    return result.diagnostics.map(d => d.message);
}

describe('cyclic inheritance does not hang validation (#494)', () => {
    test('member of a class outside the cycle terminates the hierarchy walk', async () => {
        // The original hang: walking up from B looks for Helper, which is not in the
        // B -> A -> B cycle, so the only loop exit was never reached.
        const result = await validate(`class public Helper
    field public num k
classend

class public A extends B
classend

class public B extends A
    method public void go()
        h! = new Helper()
        x = h!.k
    methodend
classend
`);

        // The document must parse cleanly, otherwise validation never runs and this
        // covers nothing.
        expect(result.document.parseResult.parserErrors).toHaveLength(0);
        // The cycle is reported, and the public member access is not flagged.
        expect(messages(result)).toEqual(CYCLE_DIAGNOSTICS);
    });

    test('protected member reached through the cycle is still visible', async () => {
        // Reachability must survive the guard: B does extend A, through the cycle, so
        // A's protected member stays accessible.
        const result = await validate(`class public A extends B
    method protected void prot()
    methodend
classend

class public B extends A
    method public void go()
        a! = new A()
        a!.prot()
    methodend
classend
`);

        expect(result.document.parseResult.parserErrors).toHaveLength(0);
        expect(messages(result)).toEqual(CYCLE_DIAGNOSTICS);
    });

    test('private member of another class in the cycle is still flagged', async () => {
        // Negative guard: skipping visited classes must not turn the walk into a blanket
        // "everything is visible".
        const result = await validate(`class public A extends B
    method private void priv()
    methodend
classend

class public B extends A
    method public void go()
        a! = new A()
        a!.priv()
    methodend
classend
`);

        expect(result.document.parseResult.parserErrors).toHaveLength(0);
        // Matched loosely: the message embeds the declaring file name, which the test
        // helper derives from a per-run document counter.
        expect(messages(result)).toHaveLength(CYCLE_DIAGNOSTICS.length + 1);
        expect(messages(result).slice(0, CYCLE_DIAGNOSTICS.length)).toEqual(CYCLE_DIAGNOSTICS);
        expect(messages(result).at(-1)).toMatch(/The member 'priv' from the type 'A'.*is not visible/);
    });
});
