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
 * This module owns the catalog, mask helpers and call composition with NO `vscode` dependency,
 * so it is unit-testable and shared by the VS Code UI and the language server (and, through the
 * language server, IntelliJ).
 */

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
