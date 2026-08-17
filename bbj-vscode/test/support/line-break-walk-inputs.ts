/**
 * Inputs that exercise the backward walks in `line-break-validation.ts` (#232, #492).
 *
 * Three masks walk backwards over statements looking for a governing `IF` on the
 * same line: `ifStatementLineBreaks`, `elseStatementLineBreaks` and
 * `ifEndStatementLineBreaks`. Each walk must advance `prev` on every iteration.
 * Before b25dad4 the `IF` walk did not, so any input that entered its loop body
 * spun forever — 100% CPU, a wedged language server, and a server process that
 * outlived the editor, because a synchronous loop starves the `--clientProcessId`
 * watchdog timer in `vscode-languageserver` just as it starves any other timer.
 *
 * `walk`/`iterations` record which walk each input drives and how many times its
 * loop body ran when these inputs were chosen, measured by instrumenting the
 * loops. An input with `iterations >= 1` hangs if its walk stops advancing;
 * `iterations >= 2` additionally proves the advance is used on the way to
 * termination rather than being incidental.
 *
 * Every input must parse cleanly. `checkLineBreaks` returns early when
 * `document.parseResult.parserErrors.length > 0`, so an input that stops parsing
 * would silently stop covering anything — hence the parser-error assertions in
 * the tests that consume this table.
 *
 * Note that `;`-separated forms (`fi; if …`) do NOT reach the `IF` walk: the `;`
 * chain produces a `CompoundStatement`, which takes the other branch of
 * `ifStatementLineBreaks`. That is what `fi-semicolon-if` guards.
 */
export interface WalkInput {
    readonly label: string;
    readonly walk: 'if' | 'else' | 'ifEnd' | 'none';
    readonly iterations: number;
    readonly source: string;
}

export const walkInputs: readonly WalkInput[] = [
    // --- IF walk: the one that regressed ---
    {
        label: 'fi-then-if-same-line',
        walk: 'if',
        iterations: 1,
        source: 'if x then\na = 1\nfi if y then\nb = 2\nfi'
    },
    {
        label: 'endif-then-if-same-line',
        walk: 'if',
        iterations: 1,
        source: 'if x then\na = 1\nendif if y then\nb = 2\nendif'
    },
    {
        label: 'next-then-if-same-line',
        walk: 'if',
        iterations: 2,
        source: 'for i = 1 to 3\na = 1\nnext i if y then\nb = 2\nfi'
    },
    {
        label: 'wend-then-if-same-line',
        walk: 'if',
        iterations: 1,
        source: 'while x\na = 0\nwend if y then\nb = 2\nfi'
    },
    {
        label: 'swend-then-if-same-line',
        walk: 'if',
        iterations: 1,
        source: 'switch x\ncase 1\nbreak\nswend if y then\nb = 2\nfi'
    },
    {
        label: 'single-line-if-fi-then-if',
        walk: 'if',
        iterations: 3,
        source: 'if x then a = 1 fi if y then b = 2 fi'
    },
    {
        label: 'method-body-fi-then-if',
        walk: 'if',
        iterations: 1,
        source: 'class public Foo\nmethod public void bar()\nif x then\na = 1\nfi if y then\nb = 2\nfi\nmethodend\nclassend'
    },
    {
        label: 'deffn-body-fi-then-if',
        walk: 'if',
        iterations: 1,
        source: 'def fnfoo(a)\nif a then\na = 1\nfi if a then\na = 2\nfi\nfnend'
    },
    {
        label: 'nested-fi-then-if',
        walk: 'if',
        iterations: 1,
        source: 'if x then\nif y then\nb = 1\nfi if z then\nc = 1\nfi\nfi'
    },

    // --- ELSE walk ---
    {
        label: 'else-after-compound-with-governing-if',
        walk: 'else',
        iterations: 3,
        source: 'if x then a = 1; b = 2 else b = 3'
    },
    {
        label: 'else-after-compound-without-governing-if',
        walk: 'else',
        iterations: 2,
        source: 'a = 1; b = 2 else c = 3'
    },

    // --- ENDIF walk ---
    {
        label: 'fi-after-compound-with-governing-if',
        walk: 'ifEnd',
        iterations: 3,
        source: 'if x then a = 1; b = 2 fi'
    },
    {
        label: 'fi-after-compound-without-governing-if',
        walk: 'ifEnd',
        iterations: 2,
        source: 'a = 1; b = 2 fi'
    },

    // --- Control: `;` keeps the IF inside a CompoundStatement, so the IF walk is never entered ---
    {
        label: 'fi-semicolon-if',
        walk: 'none',
        iterations: 0,
        source: 'if x then a = 1 fi; if y then b = 2 fi'
    }
];
