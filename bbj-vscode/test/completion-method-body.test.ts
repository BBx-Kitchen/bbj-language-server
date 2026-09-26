
import { appendFileSync } from 'node:fs';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { Model } from '../src/language/generated/ast.js';

const bbjServices = createBBjTestServices(EmptyFileSystem).BBj;

let probeCounter = 0;

/**
 * Strips the `<|>` marker from `text`, parses the remainder with a unique document URI, then
 * requests completion at the marker position and returns the offered labels as a set (label
 * sets only are ever compared in this file, never list order or position).
 */
async function labelsAt(text: string, trigger?: '.'): Promise<Set<string>> {
    const offset = text.indexOf('<|>');
    const clean = text.replace('<|>', '');
    const doc = await parseHelper<Model>(bbjServices)(
        clean, { documentUri: `file:///method-body-probe-${probeCounter++}.bbj` });
    const params: CompletionParams = {
        textDocument: { uri: doc.textDocument.uri },
        position: doc.textDocument.positionAt(offset),
        context: trigger === '.'
            ? { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
            : { triggerKind: CompletionTriggerKind.Invoked }
    };
    const list = await bbjServices.lsp.CompletionProvider!.getCompletion(doc, params);
    return new Set((list?.items ?? []).map(i => i.label));
}

/**
 * Wraps `lines` as the body of a class method — the "in method" side of the position matrix.
 * Two program-level variables are planted right beside the class (a method cannot see them)
 * so `verdict()` can flag them if they ever leak into the in-method candidate set.
 */
function inMethod(lines: string[]): string {
    return [
        'programOnly$ = "outside"',
        'ProgramObj! = "outside"',
        'class public MethodBodyProbe',
        'method public void run()',
        ...lines,
        'methodend',
        'classend',
        ''
    ].join('\n');
}

/** Renders `lines` unwrapped — the program-scope control side of the position matrix. */
function atProgramScope(lines: string[]): string {
    return [...lines, ''].join('\n');
}

interface MatrixRow {
    name: string;
    body: string[];
    control?: string[];
    expected?: string[];
    absent?: string[];
    trigger?: '.';
    /** Legitimately scope-specific control labels to ignore (default: none). */
    allow?: string[];
    /** Legitimately scope-specific in-method-only labels to ignore, beyond METHOD_SCOPE_ONLY_LABELS (default: none). */
    allowExtra?: string[];
}

// `class`/`interface` are legitimately program-scope-only statement keywords — BBj has no
// syntax for declaring a class or interface inside a method body, so their absence from an
// in-method candidate set is correct behaviour, not a measured gap. Confirmed live: the
// program-scope control for a bare statement position offers both; a class/interface
// declaration nested inside a method is not valid BBj syntax at all.
const PROGRAM_SCOPE_ONLY_KEYWORDS = ['class', 'interface'];

// Program-level variables planted beside the class in every `inMethod()` fixture. A class
// METHOD body cannot see them, so they must never appear in the in-method candidate set —
// this is issue #561's own regression: completion inside a method offered program-scope
// variables. Neither this list nor any `allow`/`allowExtra` entry below may ever repeat one
// of these two names.
const PROGRAM_SCOPE_VARIABLES = ['programOnly$', 'ProgramObj!'];

// Labels that are always visible inside `run()` but never appear in a program-scope control
// fixture: the class name, the method itself, the class's own `this!`, and the keyword that
// closes the method.
const METHOD_SCOPE_ONLY_LABELS = ['MethodBodyProbe', 'run()', 'this!', 'methodend'];

const MATRIX: MatrixRow[] = [
    {
        name: 'statement start',
        body: ['probeVar = 1', '<|>', 'probeTail = 2'],
        expected: ['probeVar'],
        allow: PROGRAM_SCOPE_ONLY_KEYWORDS
    },
    {
        name: 'after =',
        body: ['probeVar = 1', 'probeOut = <|>', 'probeTail = 2']
    },
    {
        name: 'PRINT argument',
        body: ['probeVar = 1', 'PRINT <|>', 'probeTail = 2'],
        allow: PROGRAM_SCOPE_ONLY_KEYWORDS
    },
    {
        name: 'function argument',
        body: ['probeVar = 1', 'probeOut$ = STR(<|>)', 'probeTail = 2']
    },
    {
        name: 'member after .',
        // The completion item label for a Java method includes its call parentheses ("charAt()"),
        // confirmed live against this fixture — not a truncated/missing member.
        body: ['declare java.lang.String probeStr!', 'probeStr!.<|>', 'probeTail = 2'],
        trigger: '.',
        expected: ['charAt()']
    },
    {
        name: 'inside IF',
        body: ['probeVar = 1', 'IF probeVar > 0 THEN', '<|>', 'FI', 'probeTail = 2'],
        allow: PROGRAM_SCOPE_ONLY_KEYWORDS
    },
    {
        name: 'inside FOR',
        body: ['FOR probeI = 1 TO 3', '<|>', 'NEXT probeI', 'probeTail = 2'],
        allow: PROGRAM_SCOPE_ONLY_KEYWORDS
    },
    {
        name: 'DEF FN in a method',
        body: ['DEF fnIsText(_f$,_t$)', 'PRINT <|>', 'FNEND'],
        expected: ['_f$', '_t$'],
        absent: ['_f', '_t']
    },
    {
        name: 'first line after METHOD',
        body: ['<|>', 'probeTail = 2'],
        allow: PROGRAM_SCOPE_ONLY_KEYWORDS,
        // Fixture-shape differences, not measured gaps: a control marker at the very start of
        // the document gets neither the Java package roots (`com`, `java`) nor the class-member
        // keyword (`method`) that a marker nested one level deeper always sees, and a method's
        // first body line can also begin the next class member (`classend`), which is why
        // `probeTail` (the row's own trailing statement) shows up as an in-method extra too.
        allowExtra: ['classend', 'com', 'java', 'method', 'probeTail']
    },
    {
        name: 'last line before METHODEND',
        body: ['probeVar = 1', '<|>'],
        // The control's trailing `probeTail = 2` is the mandatory statement-after-marker fixture
        // rule (avoids the EOF completion artifact); the body variant deliberately omits it since
        // this row tests the marker as the method's LAST line. `probeTail` therefore never exists
        // in the body's own scope — a fixture-shape difference, not a measured gap.
        control: ['probeVar = 1', '<|>', 'probeTail = 2'],
        allow: [...PROGRAM_SCOPE_ONLY_KEYWORDS, 'probeTail']
    },
    {
        name: 'empty method body',
        body: ['<|>'],
        control: ['<|>', 'probeTail = 2'],
        allow: PROGRAM_SCOPE_ONLY_KEYWORDS,
        // Same fixture-shape reason as 'first line after METHOD': a marker at the very start of
        // the document sees neither the Java package roots nor the class-member keyword that an
        // equivalent marker nested one level deeper always sees.
        allowExtra: ['classend', 'com', 'java', 'method']
    }
];

interface Verdict {
    missingInMethod: string[];
    extraInMethod: string[];
    verdict: 'works' | 'broken' | 'control-empty';
}

/**
 * Compares label SETS in both directions, never item order or position: `missingInMethod` is
 * a control label the method must offer but doesn't; `extraInMethod` is an in-method label the
 * control doesn't have and that isn't a legitimately method-only label either — most notably a
 * `PROGRAM_SCOPE_VARIABLES` leak (issue #561's own regression). `control-empty` flags a fixture
 * error (fix the control fixture and re-run — never record it as a measurement result).
 */
function verdict(inMethodLabels: Set<string>, controlLabels: Set<string>, row: MatrixRow): Verdict {
    if (controlLabels.size === 0) {
        return { missingInMethod: [], extraInMethod: [], verdict: 'control-empty' };
    }
    const allow = new Set(row.allow ?? []);
    const allowExtra = new Set([...METHOD_SCOPE_ONLY_LABELS, ...(row.allowExtra ?? [])]);
    const missingInMethod = [...controlLabels]
        .filter(label => !inMethodLabels.has(label) && !allow.has(label))
        .sort();
    const extraInMethod = [...inMethodLabels]
        .filter(label => !controlLabels.has(label) && !allowExtra.has(label))
        .sort();
    const hasExpected = (row.expected ?? []).every(label => inMethodLabels.has(label));
    const hasNoAbsent = (row.absent ?? []).every(label => !inMethodLabels.has(label));
    const works = inMethodLabels.size > 0 && missingInMethod.length === 0 && extraInMethod.length === 0
        && hasExpected && hasNoAbsent;
    return { missingInMethod, extraInMethod, verdict: works ? 'works' : 'broken' };
}

// Env-gated recorder: appends one JSON line per row to MEASURE_COMPLETION_OUT. No assertions
// here — this is the before/after measurement pass, run explicitly via that env var.
describe.runIf(!!process.env.MEASURE_COMPLETION_OUT)('method body completion measurement', () => {
    for (const row of MATRIX) {
        test(row.name, async () => {
            const inMethodLabels = await labelsAt(inMethod(row.body), row.trigger);
            const controlLabels = await labelsAt(atProgramScope(row.control ?? row.body), row.trigger);
            const result = verdict(inMethodLabels, controlLabels, row);
            const record = {
                row: row.name,
                inMethodCount: inMethodLabels.size,
                controlCount: controlLabels.size,
                missingInMethod: result.missingInMethod,
                extraInMethod: result.extraInMethod,
                expectedInMethod: (row.expected ?? []).every(label => inMethodLabels.has(label)),
                expectedInControl: (row.expected ?? []).every(label => controlLabels.has(label)),
                verdict: result.verdict
            };
            appendFileSync(process.env.MEASURE_COMPLETION_OUT!, JSON.stringify(record) + '\n');
        });
    }
});

// Pins: one non-skipped test per row measured `works` in the before-fix record; a row measured
// `broken` would stay `test.skip` (with its reason) until fixed or recorded out of reach. Every
// row in this matrix measured `works` on the unmodified tree (see the phase measurement record),
// so every row is pinned here. A row now fails both on labels missing from the method AND on
// labels the method must not see — most notably a planted program-scope variable leaking in.
describe('completion inside class method bodies (issue #561)', () => {
    for (const row of MATRIX) {
        test(row.name, async () => {
            const inMethodLabels = await labelsAt(inMethod(row.body), row.trigger);
            const controlLabels = await labelsAt(atProgramScope(row.control ?? row.body), row.trigger);
            const result = verdict(inMethodLabels, controlLabels, row);
            expect(result.verdict).toBe('works');
            for (const label of row.expected ?? []) {
                expect(inMethodLabels.has(label)).toBe(true);
            }
            for (const label of row.absent ?? []) {
                expect(inMethodLabels.has(label)).toBe(false);
            }
            const lowerInMethod = new Set([...inMethodLabels].map(l => l.toLowerCase()));
            for (const programVar of PROGRAM_SCOPE_VARIABLES) {
                expect(lowerInMethod.has(programVar.toLowerCase())).toBe(false);
            }
        });
    }
});
