import { EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { parseHelper, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model, Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);
const parse = parseHelper<Model>(services.BBj);

// Note: BBj built-in types (BBjNumber, BBjWindow, ...) are provided by the java-interop
// service, which is not running in these tests. Such type references therefore produce an
// incidental "Could not resolve reference to Class" diagnostic. The assertions below target
// the specific validation messages under test rather than the total diagnostic count.
async function messagesOf(code: string): Promise<string[]> {
    const result = await validate(code);
    return (result.diagnostics ?? []).map(d => d.message);
}

describe('Class validation issues (#79, #80, #86, #87)', () => {
    beforeAll(async () => { await initializeWorkspace(services.shared); });

    describe('#79 validate field value against the type', () => {
        test('field initialized with a wrong-kind literal is flagged', async () => {
            const messages = await messagesOf(`
class public Test
  field public BBjNumber DrawerBreakpoint! = "(max-width: 800px)"
classend
`);
            expect(messages).toContain(`Field 'DrawerBreakpoint!' is declared 'BBjNumber' but is initialized with a string.`);
        });

        test('matching literal initializers are not flagged', async () => {
            const messages = await messagesOf(`
class public Test
  field public BBjNumber n! = 5
  field public BBjString s! = "text"
classend
`);
            expect(messages.filter(m => m.includes('is initialized with'))).toHaveLength(0);
        });

        test('non-literal initializer is left to type inference', async () => {
            const messages = await messagesOf(`
class public Test
  field public BBjNumber n! = otherValue!
classend
`);
            expect(messages.filter(m => m.includes('is initialized with'))).toHaveLength(0);
        });
    });

    describe('#80 using undefined class fields should produce an error', () => {
        test('#field referencing an undefined field is flagged even when a parameter shares its name', async () => {
            const messages = await messagesOf(`
class public Test
  method public void run(BBjWindow window!)
    ? #window!
  methodend
classend
`);
            expect(messages.some(m => /Could not resolve reference to NamedElement named 'window!'/.test(m))).toBe(true);
        });

        test('valid instance member access (#this!, own field) still resolves', async () => {
            const messages = await messagesOf(`
class public Test
  field public BBjString s!
  method public void run()
    #s! = "x"
    ? #this!
  methodend
classend
`);
            expect(messages.some(m => /Could not resolve reference to NamedElement/.test(m))).toBe(false);
        });
    });

    describe('#86 validate interfaces cannot be instantiated', () => {
        test('instantiating an interface is an error', async () => {
            const messages = await messagesOf(`
interface public TheInterface

interfaceend

a! = new TheInterface()
`);
            expect(messages).toContain(`Interface 'TheInterface' cannot be instantiated.`);
        });

        test('an array whose element type is an interface is allowed', async () => {
            const messages = await messagesOf(`
interface public TheInterface

interfaceend

a! = new TheInterface[5]
`);
            expect(messages.some(m => /cannot be instantiated/.test(m))).toBe(false);
        });
    });

    describe('#87 validate object constructors', () => {
        test('constructor called with the wrong number of arguments is an error', async () => {
            const messages = await messagesOf(`
class public Test
  method public Test(BBjNumber a!)
  methodend
classend

o! = new Test(1, 5)
`);
            expect(messages).toContain(`No constructor of 'Test' takes 2 argument(s) (expected 1).`);
        });

        test('matching one of several overloaded constructors is allowed', async () => {
            const messages = await messagesOf(`
class public Test
  method public Test()
  methodend
  method public Test(BBjNumber a!)
  methodend
classend

o! = new Test()
p! = new Test(1)
`);
            expect(messages.some(m => /No constructor of/.test(m))).toBe(false);
        });

        test('a class without an explicitly declared constructor is not constrained', async () => {
            const messages = await messagesOf(`
class public Test
classend

o! = new Test()
`);
            expect(messages.some(m => /No constructor of/.test(m))).toBe(false);
        });
    });
});

describe('#439 void usable as a variable name', () => {
    beforeAll(async () => { await initializeWorkspace(services.shared); });

    test.each([
        `void=scall("x &")\n`,
        `void = 5\nprint void\n`,
        `x! = void + 1\n`,
    ])('parses %j without parser errors', async (code) => {
        const doc = await parse(code, { validation: false });
        expect(doc.parseResult.parserErrors.map(e => e.message)).toEqual([]);
    });

    test('void is still recognized as a method void-return marker', async () => {
        const doc = await parse(`
class public Test
  method public void run()
  methodend
classend
`, { validation: false });
        expect(doc.parseResult.parserErrors.map(e => e.message)).toEqual([]);
    });
});
