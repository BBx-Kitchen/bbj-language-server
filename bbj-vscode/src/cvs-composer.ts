/**
 * Editor-agnostic domain logic for the CVS() composer (#649).
 *
 * `CVS(string, int {, chars} {, ERR=lineref})` modifies a string according to a bitmask of up
 * to eight documented operations (strip/uppercase/lowercase/collapse-spaces/etc, see
 * https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/cvs_function_bbj.htm).
 * Multiple operations combine by summing bit values and are always applied in ascending bit
 * order, regardless of the order they were selected in. An optional `chars` argument (BBj 19.0+)
 * replaces the default space character for the customizable operations, and accepts multiple
 * characters for a subset of them (BBj 19.10+) — this module never checks the target BBj version
 * or measures/trims `chars`; whatever text is entered is used verbatim.
 *
 * This module owns the catalog, mask helpers, call composition, call location and edit-in-place
 * decode logic with NO `vscode` dependency, so it is unit-testable and shared by the VS Code UI
 * and the language server (and, through the language server, IntelliJ).
 */
import { scanArgs, trimmedRange } from './addwindow-composer.js';
import { validateStringField } from './msgbox-composer.js';

export interface CvsBit {
    /** The single bit this operation sets, e.g. 1. */
    value: number;
    label: string;
    detail?: string;
    /** Version gate, e.g. 'BBj 19.0+'. */
    since?: string;
    /** Whether the optional `chars` argument replaces the default space for this operation. */
    charsCustomizable: boolean;
}

/** The eight documented CVS() operation bits, in ascending order. */
export const CVS_BITS: CvsBit[] = [
    { value: 1, label: 'Strip leading spaces', charsCustomizable: true },
    { value: 2, label: 'Strip trailing spaces', charsCustomizable: true },
    { value: 4, label: 'Convert to uppercase', charsCustomizable: false },
    { value: 8, label: 'Convert to lowercase', charsCustomizable: false },
    { value: 16, label: 'Convert non-printable characters to spaces', charsCustomizable: true },
    { value: 32, label: 'Replace multiple spaces with one space', charsCustomizable: true },
    { value: 64, label: 'Replace comma and period per SETOPTS mask settings', charsCustomizable: false },
    { value: 128, label: 'Strip all spaces', detail: 'BBj-specific (not in PRO/5)', charsCustomizable: true },
];

/** OR of every documented CVS() bit — bits outside this mask are undocumented. */
export const CVS_KNOWN_MASK = 255;

/** Shared tooltip text for the `chars` field, naming both BBj version gates (never enforced here). */
export const CVS_CHARS_TOOLTIP =
    'From BBj 19.0, the optional chars argument replaces the default space character (one ' +
    'replacement character) for operations 1, 2, 16, 32 and 128. From BBj 19.10, operations 1, 2 ' +
    'and 128 additionally accept multiple characters in chars. The composer does not check the ' +
    'target BBj version — whatever text is entered here is used as-is.';

/** OR a list of CVS bit values into a single mask. */
export function encodeCvsMask(bits: number[]): number {
    return bits.reduce((acc, v) => (acc | v) >>> 0, 0);
}

/** The catalog bit values present in `mask`, in ascending (catalog) order. */
export function cvsBitsSet(mask: number): number[] {
    return CVS_BITS.filter(b => (mask & b.value) !== 0).map(b => b.value);
}

/** True when any of the given bit values is chars-customizable — drives whether chars is enabled. */
export function charsApplies(bits: number[]): boolean {
    return bits.some(v => CVS_BITS.find(b => b.value === v)?.charsCustomizable === true);
}

export interface CvsComposeInput {
    /** The string expression to convert, verbatim BBj text. */
    str: string;
    mask: number;
    /** Optional chars replacement expression; omitted from the call when empty. */
    chars?: string;
    /** Optional assignment target, e.g. `b$` -> `b$ = CVS(...)`. */
    assignTo?: string;
    /** Verbatim trailing arguments (e.g. `ERR=100`) appended last, in order. */
    trailingArgs?: string[];
}

/** Build a `CVS(...)` statement. Never measures, trims or version-gates `chars`. */
export function composeCvsCall(input: CvsComposeInput): string {
    const args = [input.str, String(input.mask)];
    if (input.chars) {
        args.push(input.chars);
    }
    if (input.trailingArgs) {
        args.push(...input.trailingArgs);
    }
    const call = `CVS(${args.join(', ')})`;
    return input.assignTo ? `${input.assignTo} = ${call}` : call;
}

// ---------------------------------------------------------------------------------------------
// Literal-sum recognition (edit-in-place)
// ---------------------------------------------------------------------------------------------

/**
 * Upper bound for a decodable literal sum: bitwise operators (`&`) coerce their operands via
 * `ToInt32`, which reduces modulo 2^32 — so a sum at or beyond this would silently wrap and could
 * be misreported as using only documented bits. Rejecting it here, before any bitwise operator
 * ever sees the value, keeps the "safely decodable" boundary exact.
 */
const CVS_MAX_LITERAL_SUM = 0xFFFFFFFF;

/**
 * Parse a `+`-sum of integer literals (e.g. `5`, `1 + 4`, `1+2+128`) to its base-10 sum. Anything
 * else — a named constant, a variable, java-interop, an arithmetic operator other than `+`, an
 * empty/malformed sum, or a sum too large to safely test with 32-bit bitwise operators — yields
 * `undefined`. Integer literals only.
 */
export function parseCvsLiteralSum(text: string): number | undefined {
    const t = text.trim();
    if (t === '') return undefined;
    const parts = t.split('+');
    let sum = 0;
    for (const raw of parts) {
        const p = raw.trim();
        if (!/^[0-9]+$/.test(p)) return undefined;
        sum += parseInt(p, 10);
        if (sum > CVS_MAX_LITERAL_SUM) return undefined;
    }
    return sum;
}

// ---------------------------------------------------------------------------------------------
// Call location
// ---------------------------------------------------------------------------------------------

export interface CvsCallInfo {
    /** Index of `CVS` (well, `cvs`, case-insensitively) start within the line. */
    callStart: number;
    /** Index just past the closing `)` (or the line end if the call is unterminated). */
    callEnd: number;
    /** Trimmed top-level argument texts. */
    args: string[];
}

/** `cvs(` not preceded by an identifier character or `.` — keeps longer names and method calls out. */
const CVS_CALL_BOUNDARY_SOURCE = String.raw`(?<![A-Za-z0-9_.])cvs\s*\(`;

function buildCvsCallInfo(line: string, callStart: number, open: number): CvsCallInfo {
    const { argRanges, callEnd } = scanArgs(line, open);
    const args = argRanges.map(([a, b]) => {
        const [ta, tb] = trimmedRange(line, a, b);
        return line.slice(ta, tb);
    });
    return { callStart, callEnd, args };
}

/** Every `CVS(...)` call on the line, in source order. Matching is case-insensitive. */
export function findCvsCalls(line: string): CvsCallInfo[] {
    const re = new RegExp(CVS_CALL_BOUNDARY_SOURCE, 'gi');
    const calls: CvsCallInfo[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        calls.push(buildCvsCallInfo(line, m.index, m.index + m[0].length));
    }
    return calls;
}

/** First `CVS(...)` call on the line (convenience). */
export function parseCvsCallOnLine(line: string): CvsCallInfo | undefined {
    return findCvsCalls(line)[0];
}

/**
 * The `CVS(...)` call the cursor is inside, if any. When calls are nested/multiple, the innermost
 * (smallest span) containing the cursor wins.
 */
export function findCvsCallAt(line: string, character: number): CvsCallInfo | undefined {
    const containing = findCvsCalls(line).filter(c => character >= c.callStart && character <= c.callEnd);
    if (containing.length === 0) return undefined;
    return containing.reduce((best, c) => (c.callEnd - c.callStart < best.callEnd - best.callStart ? c : best));
}

// ---------------------------------------------------------------------------------------------
// Edit-in-place decode verdict
// ---------------------------------------------------------------------------------------------

export type CvsNotEditableReason = 'missing-mask' | 'non-literal-mask' | 'unknown-bits';

/** Single source of truth for {@link CvsNotEditableReason}'s user-facing sentence. */
export const CVS_NOT_EDITABLE_REASON_TEXT: Record<CvsNotEditableReason, string> = {
    'missing-mask': 'This CVS() call has no mask argument, so there is nothing to compose from.',
    'non-literal-mask': 'The mask argument is not a sum of integer literals, so it cannot be safely decoded.',
    'unknown-bits': 'The mask uses bits this composer does not document, so it cannot be safely rewritten.',
};

export interface CvsDecodeCallResult {
    found: boolean;
    editable?: boolean;
    reason?: string;
    edit?: { callStart: number; callEnd: number };
    initial?: { str: string; bits: number[]; chars: string };
    trailingArgs?: string[];
}

const ERR_ARG = /^ERR\s*=/i;

/**
 * Decode the `CVS(...)` call at `character` (or the first call on the line, when `character` is
 * omitted) into an edit-in-place verdict. Only an integer-literal-sum mask within the documented
 * bits is editable; everything else is reported not-editable with a named reason, still carrying
 * `edit` so callers can locate and report on the call.
 */
export function decodeCvsCall(line: string, character?: number): CvsDecodeCallResult {
    const call = character === undefined ? parseCvsCallOnLine(line) : findCvsCallAt(line, character);
    if (!call) {
        return { found: false };
    }

    const edit = { callStart: call.callStart, callEnd: call.callEnd };
    const args = call.args;

    if (args.length < 2 || args[1].trim() === '') {
        return { found: true, editable: false, reason: CVS_NOT_EDITABLE_REASON_TEXT['missing-mask'], edit };
    }

    const sum = parseCvsLiteralSum(args[1]);
    if (sum === undefined) {
        return { found: true, editable: false, reason: CVS_NOT_EDITABLE_REASON_TEXT['non-literal-mask'], edit };
    }

    // Guard the bitwise test itself too (belt-and-suspenders with parseCvsLiteralSum's own bound):
    // `&` coerces via ToInt32 (mod 2^32), so anything at or beyond 2^32 must never reach it.
    if (sum > CVS_MAX_LITERAL_SUM || (sum & ~CVS_KNOWN_MASK) !== 0) {
        return { found: true, editable: false, reason: CVS_NOT_EDITABLE_REASON_TEXT['unknown-bits'], edit };
    }

    let chars = '';
    let trailingArgs: string[] = [];
    if (args.length > 2) {
        if (ERR_ARG.test(args[2])) {
            trailingArgs = args.slice(2);
        } else {
            chars = args[2];
            trailingArgs = args.slice(3);
        }
    }

    return {
        found: true,
        editable: true,
        edit,
        initial: { str: args[0], bits: cvsBitsSet(sum), chars },
        trailingArgs,
    };
}

// ---------------------------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------------------------

/** `(no operation)` for mask 0; otherwise catalog labels ascending, noting ascending application. */
export function describeCvsMask(mask: number): string {
    const bits = cvsBitsSet(mask);
    if (bits.length === 0) {
        return '(no operation)';
    }
    const labels = bits.map(v => CVS_BITS.find(b => b.value === v)!.label);
    const summary = labels.join(' · ');
    return bits.length >= 2 ? `${summary} — applied in ascending order` : summary;
}

export interface CvsPreviewInput {
    str: string;
    bits: number[];
    chars: string;
    assignTo?: string;
    trailingArgs?: string[];
    /** In edit mode `str` is the preserved verbatim argument and `assignTo` is omitted. */
    editMode?: boolean;
}

export interface CvsPreview {
    mask: number;
    statement: string;
    summary: string;
    charsEnabled: boolean;
    strError?: string;
    charsError?: string;
    valid: boolean;
}

/**
 * Compute the full preview payload for a CVS() selection — the single entry point every UI (the
 * VS Code webview, the IntelliJ dialog, and the language server) uses.
 */
export function cvsPreview(input: CvsPreviewInput): CvsPreview {
    const mask = encodeCvsMask(input.bits);
    const charsEnabled = charsApplies(input.bits);

    const strV = input.editMode ? { ok: true } : validateStringField(input.str, { required: true });
    const charsV = charsEnabled && input.chars.trim() !== '' ? validateStringField(input.chars) : { ok: true };

    const statement = composeCvsCall({
        str: input.str,
        mask,
        chars: charsEnabled ? (input.chars || undefined) : undefined,
        assignTo: input.editMode ? undefined : input.assignTo,
        trailingArgs: input.trailingArgs,
    });

    return {
        mask,
        statement,
        summary: describeCvsMask(mask),
        charsEnabled,
        strError: strV.ok ? undefined : strV.message,
        charsError: charsV.ok ? undefined : charsV.message,
        valid: strV.ok && charsV.ok,
    };
}
