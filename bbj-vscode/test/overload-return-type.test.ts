import { AstUtils, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import {
    Assignment,
    isAssignment,
    isJavaClass,
    isMemberCall,
    isMethodCall,
    isMethodDecl,
    isSymbolRef,
    JavaClass,
    JavaMethod,
    MethodCall,
    MethodDecl,
    Model
} from '../src/language/generated/ast.js';
import { UNKNOWN_JAVA_MEMBER_CODE } from '../src/language/validations/check-unknown-java-member.js';

// A call to an overloaded BBj or Java method should get the return type of the overload its
// arguments match, whichever order the overloads are declared or returned in (issue #556).
// Uses the test module's fake java.lang.String/java.util.HashMap classes so declared/returned
// types actually resolve. See bbj-test-module.ts.
const { shared, BBj } = createBBjTestServices(EmptyFileSystem);

beforeAll(async () => {
    await initializeWorkspace(shared);
});

let probeCounter = 0;

/**
 * Parses `code`, finds the Assignment whose variable text is `probe!`, and returns the type
 * inferer's result for its value rendered as a fully-qualified name for a JavaClass or a bare
 * name otherwise. `undefined` means the call's type was not inferred at all.
 */
async function inferredProbeType(code: string): Promise<string | undefined> {
    const document = await parseHelper<Model>(BBj)(
        code, { documentUri: `file:///overload-return-type-probe-${probeCounter++}.bbj` });
    const assignment = AstUtils.streamAllContents(document.parseResult.value)
        .find((n): n is Assignment => isAssignment(n) && isSymbolRef(n.variable) && n.variable.symbol.$refText === 'probe!');
    if (!assignment) {
        throw new Error('no probe! assignment found in fixture');
    }
    const type = BBj.types.Inferer.getType(assignment.value);
    if (!type) {
        return undefined;
    }
    // resolveClass() cuts a JavaClass's own `name` down to its simple name once resolved
    // (packageName carries the rest) — reconstruct the FQN the same way
    // method-return-java-type.test.ts's own fqn-reconstruction helper does.
    return isJavaClass(type) && type.packageName ? `${type.packageName}.${type.name}` : type.name;
}

/** Completion driver mirroring test/completion-class-reference.test.ts's own `labels()`. */
async function labels(text: string, trigger?: '.'): Promise<string[]> {
    const offset = text.indexOf('<|>');
    const clean = text.replace('<|>', '');
    const doc = await parseHelper<Model>(BBj)(
        clean, { documentUri: `file:///overload-return-type-completion-${probeCounter++}.bbj` });
    const params: CompletionParams = {
        textDocument: { uri: doc.textDocument.uri },
        position: doc.textDocument.positionAt(offset),
        context: trigger === '.'
            ? { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
            : { triggerKind: CompletionTriggerKind.Invoked }
    };
    const list = await BBj.lsp.CompletionProvider!.getCompletion(doc, params);
    return (list?.items ?? []).map(i => i.label).sort();
}

/** Diagnostics matching the #437 return-type check's own message text. */
async function incompatibleReturnDiagnostics(code: string): Promise<string[]> {
    const document = await parseHelper<Model>(BBj)(
        code, { documentUri: `file:///overload-return-type-methodret-${probeCounter++}.bbj`, validation: true });
    return (document.diagnostics ?? [])
        .filter(d => d.message.includes('returns a value of incompatible type'))
        .map(d => d.message);
}

/** Diagnostics carrying the unknown-Java-member Error code. */
async function unknownMemberDiagnostics(code: string) {
    const document = await parseHelper<Model>(BBj)(
        code, { documentUri: `file:///overload-return-type-unknown-member-${probeCounter++}.bbj`, validation: true });
    return (document.diagnostics ?? []).filter(d => d.data?.code === UNKNOWN_JAVA_MEMBER_CODE);
}

function pushJavaMethod(container: JavaClass, name: string, paramType: string | undefined, returnType: string) {
    container.methods.push({
        $type: JavaMethod.$type,
        name,
        $containerProperty: 'methods',
        $container: container,
        isStatic: false,
        deprecated: false,
        returnType,
        parameters: paramType === undefined ? [] : [{ $type: 'JavaMethodParameter', name: 'p', type: paramType }]
    } as unknown as JavaMethod);
}

// Fake overload pairs on the fake java.lang.String class, each demonstrating a different
// undecided-argument shape: find/seek differ only in declaration order (Java-backend order is
// not something this codebase controls), pick shares one return type across both overloads, and
// span picks its overload by argument count alone. Guarded so re-running this file's beforeAll
// never duplicates an entry.
beforeAll(() => {
    const stringClass = BBj.java.JavaInteropService.getResolvedClass('java.lang.String')!;
    if (!stringClass.methods.some(m => m.name === 'find')) {
        pushJavaMethod(stringClass, 'find', 'java.lang.String', 'java.lang.String');
        pushJavaMethod(stringClass, 'find', 'java.util.HashMap', 'java.util.HashMap');
    }
    if (!stringClass.methods.some(m => m.name === 'seek')) {
        // Opposite declaration order to find's pair — the backend's own overload order is
        // outside this codebase's control (issue #556).
        pushJavaMethod(stringClass, 'seek', 'java.util.HashMap', 'java.util.HashMap');
        pushJavaMethod(stringClass, 'seek', 'java.lang.String', 'java.lang.String');
    }
    if (!stringClass.methods.some(m => m.name === 'pick')) {
        pushJavaMethod(stringClass, 'pick', 'java.lang.String', 'java.util.HashMap');
        pushJavaMethod(stringClass, 'pick', 'java.util.HashMap', 'java.util.HashMap');
    }
    if (!stringClass.methods.some(m => m.name === 'span')) {
        pushJavaMethod(stringClass, 'span', 'int', 'java.lang.String');
        stringClass.methods.push({
            $type: JavaMethod.$type,
            name: 'span',
            $containerProperty: 'methods',
            $container: stringClass,
            isStatic: false,
            deprecated: false,
            returnType: 'java.util.HashMap',
            parameters: [
                { $type: 'JavaMethodParameter', name: 'a', type: 'int' },
                { $type: 'JavaMethodParameter', name: 'b', type: 'int' }
            ]
        } as unknown as JavaMethod);
    }
});

describe('overloaded BBj method calls (issue #556)', () => {
    const stringFirst = `
class public Probe
  method public java.lang.String m1(java.lang.String s!)
    methodret ""
  methodend
  method public java.util.HashMap m1(java.util.HashMap h!)
    methodret new java.util.HashMap()
  methodend
classend
declare Probe f!
declare java.util.HashMap h!
`;

    const hashMapFirst = `
class public Probe
  method public java.util.HashMap m1(java.util.HashMap h!)
    methodret new java.util.HashMap()
  methodend
  method public java.lang.String m1(java.lang.String s!)
    methodret ""
  methodend
classend
declare Probe f!
declare java.util.HashMap h!
`;

    test('a HashMap argument infers HashMap when the String overload is declared first', async () => {
        expect(await inferredProbeType(`${stringFirst}\nprobe! = f!.m1(h!)\n`)).toBe('java.util.HashMap');
    });

    test('a String argument infers String when the String overload is declared first', async () => {
        expect(await inferredProbeType(`${stringFirst}\nprobe! = f!.m1("a")\n`)).toBe('java.lang.String');
    });

    test('a HashMap argument infers HashMap when the HashMap overload is declared first', async () => {
        expect(await inferredProbeType(`${hashMapFirst}\nprobe! = f!.m1(h!)\n`)).toBe('java.util.HashMap');
    });

    test('a String argument infers String when the HashMap overload is declared first', async () => {
        expect(await inferredProbeType(`${hashMapFirst}\nprobe! = f!.m1("a")\n`)).toBe('java.lang.String');
    });

    test('completion on the matched overload result offers the HashMap members, not the String ones', async () => {
        const items = await labels(`${stringFirst}\nx! = f!.m1(h!).<|>\nprobeTail = 1\n`, '.');
        expect(items).toContain('put()');
        expect(items).not.toContain('charAt()');
    });

    test('a call through the matching overload draws no incompatible-return-type diagnostic', async () => {
        const code = `
class public Probe
  method public java.lang.String m1(java.lang.String s!)
    methodret ""
  methodend
  method public java.util.HashMap m1(java.util.HashMap h!)
    methodret new java.util.HashMap()
  methodend
  method public java.util.HashMap wrap(java.util.HashMap h!)
    methodret #m1(h!)
  methodend
classend
`;
        // Before the fix, the linker's first-declared m1 (String) was used for the return-type
        // check, so wrap()'s own declared java.util.HashMap return type conflicted with it.
        expect(await incompatibleReturnDiagnostics(code)).toEqual([]);
    });

    test('the member reference still links to the first-declared overload though the inferred type is the second', async () => {
        const document = await parseHelper<Model>(BBj)(
            `${stringFirst}\nprobe! = f!.m1(h!)\n`,
            { documentUri: `file:///overload-return-type-link-${probeCounter++}.bbj` });
        const methodDecls = AstUtils.streamAllContents(document.parseResult.value)
            .filter((n): n is MethodDecl => isMethodDecl(n) && n.name.toLowerCase() === 'm1')
            .toArray();
        expect(methodDecls).toHaveLength(2);
        const call = AstUtils.streamAllContents(document.parseResult.value)
            .find((n): n is MethodCall => isMethodCall(n) && isMemberCall(n.method) && n.method.member?.$refText.toLowerCase() === 'm1');
        expect(call).toBeDefined();
        const method = call!.method;
        const member = isMemberCall(method) ? method.member : undefined;
        expect(member?.ref).toBe(methodDecls[0]);
    });
});

describe('overloaded Java method calls (issue #556)', () => {
    test('a HashMap argument infers HashMap for both declaration orders', async () => {
        expect(await inferredProbeType(`
declare java.lang.String s!
declare java.util.HashMap h!
probe! = s!.find(h!)
`)).toBe('java.util.HashMap');
        expect(await inferredProbeType(`
declare java.lang.String s!
declare java.util.HashMap h!
probe! = s!.seek(h!)
`)).toBe('java.util.HashMap');
    });

    test('a String argument infers String for both declaration orders', async () => {
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.find("a")
`)).toBe('java.lang.String');
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.seek("a")
`)).toBe('java.lang.String');
    });

    test('completion on the matched overload result offers the HashMap members', async () => {
        const items = await labels(`
declare java.lang.String s!
declare java.util.HashMap h!
x! = s!.find(h!).<|>
probeTail = 1
`, '.');
        expect(items).toContain('put()');
        expect(items).not.toContain('charAt()');
    });
});

describe('arguments that do not decide', () => {
    test('a tie between candidates with differing return types infers no type', async () => {
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.find(u!)
`)).toBeUndefined();
    });

    test('a tie between candidates with differing return types offers no member of either candidate', async () => {
        const items = await labels(`
declare java.lang.String s!
x! = s!.find(u!).<|>
probeTail = 1
`, '.');
        expect(items).not.toContain('put()');
        expect(items).not.toContain('charAt()');
    });

    test('a tie between candidates sharing a return type infers that shared type', async () => {
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.pick(u!)
`)).toBe('java.util.HashMap');
    });

    test('argument count alone picks between overloads that differ only by arity', async () => {
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.span(1, 2)
`)).toBe('java.util.HashMap');
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.span(1)
`)).toBe('java.lang.String');
    });

    test('no overload fits the argument count: differing return types give no type, a shared return type still wins', async () => {
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.find()
`)).toBeUndefined();
        expect(await inferredProbeType(`
declare java.lang.String s!
probe! = s!.pick()
`)).toBe('java.util.HashMap');
    });
});

describe('what does not change', () => {
    test('a method with no same-named sibling keeps today\'s linked type', async () => {
        expect(await inferredProbeType(`
declare java.util.HashMap h!
probe! = h!.getClass(1, 2)
`)).toBe('java.lang.Class');
    });

    test('the member reference still links to the first-declared Java overload though the inferred type is the second', async () => {
        const document = await parseHelper<Model>(BBj)(`
declare java.lang.String s!
declare java.util.HashMap h!
probe! = s!.find(h!)
`, { documentUri: `file:///overload-return-type-java-link-${probeCounter++}.bbj` });
        const stringClass = BBj.java.JavaInteropService.getResolvedClass('java.lang.String')!;
        const firstFind = stringClass.methods.find(m => m.name === 'find');
        const call = AstUtils.streamAllContents(document.parseResult.value)
            .find((n): n is MethodCall => isMethodCall(n) && isMemberCall(n.method) && n.method.member?.$refText.toLowerCase() === 'find');
        expect(call).toBeDefined();
        const method = call!.method;
        const member = isMemberCall(method) ? method.member : undefined;
        expect(member?.ref).toBe(firstFind);
    });

    test('a member read on a re-selected call result draws no unknown-member diagnostic', async () => {
        const diagnostics = await unknownMemberDiagnostics(`
declare java.lang.String s!
declare java.util.HashMap h!
x! = s!.find(h!)
x!.put(1, 2)
`);
        expect(diagnostics).toEqual([]);
    });

    test('a member read on a tied, undecided call result draws no unknown-member diagnostic', async () => {
        const diagnostics = await unknownMemberDiagnostics(`
declare java.lang.String s!
y! = s!.find(u!)
y!.anything()
`);
        expect(diagnostics).toEqual([]);
    });
});
