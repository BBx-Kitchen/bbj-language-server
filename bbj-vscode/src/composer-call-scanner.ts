/**
 * The single place composer call location and top-level argument scanning live, shared by the
 * MSGBOX, addWindow, addChildWindow and CVS composers and by the language server. No `vscode`
 * dependency, so it is unit-testable and reusable (issue #534).
 */

/** The span of a located call within its line. */
export interface CallSpan {
    /** Index of the call's keyword start within the line. */
    callStart: number;
    /** Index just past the closing `)` (or the line end if the call is unterminated). */
    callEnd: number;
}

/** Options that narrow {@link findCalls}'s matching beyond the default looser rule. */
export interface CallLocatorOptions {
    /**
     * When set, a match is rejected if the keyword is preceded by an identifier character or a
     * dot — the stricter boundary CVS needs so `obj.cvs(` and `xcvs(` are never mistaken for a
     * `CVS()` call. Omitted (the default), a match is accepted regardless of what precedes it —
     * the existing looser matching MSGBOX, addWindow and addChildWindow rely on.
     */
    notAfterIdentifierOrDot?: boolean;
}

/**
 * Scan the top-level arguments of a call starting just after its `(`. Handles nested parens and
 * `"` string literals (with `""` escapes) so commas inside them don't split arguments. `$...$` hex
 * literals contain no comma/paren so they need no special handling here.
 */
export function scanArgs(line: string, open: number): { argRanges: Array<[number, number]>; callEnd: number } {
    const argRanges: Array<[number, number]> = [];
    let depth = 0, inStr = false, argStart = open, i = open, ended = false;
    for (; i < line.length; i++) {
        const c = line[i];
        if (inStr) {
            if (c === '"') { if (line[i + 1] === '"') { i++; continue; } inStr = false; }
            continue;
        }
        if (c === '"') inStr = true;
        else if (c === '(') depth++;
        else if (c === ')') {
            if (depth === 0) { argRanges.push([argStart, i]); i++; ended = true; break; }
            depth--;
        } else if (c === ',' && depth === 0) {
            argRanges.push([argStart, i]);
            argStart = i + 1;
        }
    }
    if (!ended) argRanges.push([argStart, line.length]);
    return { argRanges, callEnd: i };
}

/** The [start, end) of the trimmed token inside an argument range (strips surrounding whitespace). */
export function trimmedRange(line: string, a: number, b: number): [number, number] {
    const seg = line.slice(a, b);
    const start = a + (seg.length - seg.trimStart().length);
    return [start, start + seg.trim().length];
}

/** `name` must look like this to be usable in a locator regex — never attacker-controlled text. */
const PLAIN_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Locate every `name(...)` call on `line`, case-insensitively, in source order, calling `build`
 * with `(line, callStart, open)` per match — `open` is the index just past the matched opening
 * parenthesis. `name` must be a plain ASCII identifier (throws otherwise). By default a match is
 * accepted no matter what precedes it; pass `{ notAfterIdentifierOrDot: true }` for the stricter
 * boundary a caller opts into (see {@link CallLocatorOptions}).
 */
export function findCalls<T extends CallSpan>(
    line: string,
    name: string,
    build: (line: string, callStart: number, open: number) => T,
    options: CallLocatorOptions = {},
): T[] {
    if (!PLAIN_IDENTIFIER.test(name)) {
        throw new Error(`findCalls: name must be a plain identifier, got ${JSON.stringify(name)}`);
    }
    const boundary = options.notAfterIdentifierOrDot ? String.raw`(?<![A-Za-z0-9_.])` : '';
    const re = new RegExp(`${boundary}${name}\\s*\\(`, 'gi');
    const calls: T[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        calls.push(build(line, m.index, m.index + m[0].length));
    }
    return calls;
}

/**
 * The call in `calls` whose span contains `character` (both ends inclusive) — the smallest
 * containing span wins on nested/overlapping calls (first wins on a tie). `undefined` when
 * `character` is outside every span.
 */
export function findCallAt<T extends CallSpan>(calls: T[], character: number): T | undefined {
    const containing = calls.filter(c => character >= c.callStart && character <= c.callEnd);
    if (containing.length === 0) return undefined;
    return containing.reduce((best, c) => (c.callEnd - c.callStart < best.callEnd - best.callStart ? c : best));
}
