/**
 * Editor-agnostic logic for the MSGBOX composer (spike for #426).
 *
 * MSGBOX() encodes buttons/icon/default-button/flags as an additive numeric `expr`
 * (see https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/msgbox_function_bbj.htm).
 * This module owns the catalog and the state <-> number <-> statement-text conversions so
 * the same logic can back a VS Code QuickPick today and (later) an IntelliJ dialog, without
 * duplicating the flag arithmetic. It intentionally has NO `vscode` dependency so it is unit
 * testable and reusable.
 */

export interface CatalogItem {
    value: number;
    label: string;
    detail?: string;
}

/** Button sets — the low bits of `expr` (0..7). */
export const BUTTON_SETS: CatalogItem[] = [
    { value: 0, label: 'OK' },
    { value: 1, label: 'OK, Cancel' },
    { value: 2, label: 'Abort, Retry, Ignore' },
    { value: 3, label: 'Yes, No, Cancel' },
    { value: 4, label: 'Yes, No' },
    { value: 5, label: 'Retry, Cancel' },
    { value: 7, label: 'Custom (button1..button3)' },
];

/** Icon — added to the button value. */
export const ICONS: CatalogItem[] = [
    { value: 0, label: 'None' },
    { value: 16, label: 'Stop' },
    { value: 32, label: 'Question' },
    { value: 48, label: 'Exclamation' },
    { value: 64, label: 'Information' },
];

/** Default button — added on top. */
export const DEFAULT_BUTTONS: CatalogItem[] = [
    { value: 0, label: 'First button' },
    { value: 256, label: 'Second button' },
    { value: 512, label: 'Third button' },
];

/** Independent flags (multi-select). */
export const FLAGS: CatalogItem[] = [
    { value: 65536, label: 'Do not allow Enter selection' },
    { value: 32768, label: 'Disable HTML processing' },
    { value: 131072, label: 'Restrict to MDI desktop' },
];

const BUTTON_MASK = 0x7;     // 0..7
const ICON_MASK = 0x70;      // 16, 32, 48, 64
const DEFAULT_MASK = 0x300;  // 256, 512
const NO_ENTER = 65536;
const DISABLE_HTML = 32768;
const MDI = 131072;

export interface MsgboxState {
    buttonSet: number;
    icon: number;
    defaultButton: number;
    noEnter: boolean;
    disableHtml: boolean;
    mdi: boolean;
}

export const DEFAULT_STATE: MsgboxState = {
    buttonSet: 0, icon: 0, defaultButton: 0, noEnter: false, disableHtml: false, mdi: false,
};

/** Compose the additive `expr` number from a selection. */
export function encode(s: MsgboxState): number {
    return (s.buttonSet & BUTTON_MASK)
        + (s.icon & ICON_MASK)
        + (s.defaultButton & DEFAULT_MASK)
        + (s.noEnter ? NO_ENTER : 0)
        + (s.disableHtml ? DISABLE_HTML : 0)
        + (s.mdi ? MDI : 0);
}

/** Decompose an existing `expr` number back into a selection (for reconfiguring a call). */
export function decode(n: number): MsgboxState {
    return {
        buttonSet: n & BUTTON_MASK,
        icon: n & ICON_MASK,
        defaultButton: n & DEFAULT_MASK,
        noEnter: (n & NO_ENTER) !== 0,
        disableHtml: (n & DISABLE_HTML) !== 0,
        mdi: (n & MDI) !== 0,
    };
}

function labelOf(catalog: CatalogItem[], value: number): string {
    return catalog.find(i => i.value === value)?.label ?? String(value);
}

/** Human-readable one-line summary of an `expr` value (for previews / hovers). */
export function describe(n: number): string {
    const s = decode(n);
    const parts = [labelOf(BUTTON_SETS, s.buttonSet)];
    if (s.icon) parts.push(`${labelOf(ICONS, s.icon)} icon`);
    if (s.defaultButton) parts.push(`default: ${labelOf(DEFAULT_BUTTONS, s.defaultButton)}`);
    if (s.noEnter) parts.push('no Enter');
    if (s.disableHtml) parts.push('no HTML');
    if (s.mdi) parts.push('MDI');
    return parts.join(' · ');
}

export interface ComposeInput {
    /** BBj expression text for the message, e.g. `"Are you sure?"` or a variable. */
    message: string;
    expr: number;
    /** BBj expression text for the title, if any. */
    title?: string;
    /** Custom button label expressions (only meaningful with the "Custom" button set). */
    buttons?: string[];
    /** Optional assignment target, e.g. `ret!` -> `ret! = MSGBOX(...)`. */
    assignTo?: string;
}

/** Build a `MSGBOX(...)` statement, including only the positional args that are needed. */
export function composeStatement(input: ComposeInput): string {
    const hasButtons = !!input.buttons && input.buttons.length > 0;
    const needTitle = (input.title !== undefined && input.title !== '') || hasButtons;
    const needExpr = input.expr !== 0 || needTitle;

    const args: string[] = [input.message];
    if (needExpr) args.push(String(input.expr));
    if (needTitle) args.push(input.title ?? '""');
    if (hasButtons) args.push(...input.buttons!);

    const call = `MSGBOX(${args.join(', ')})`;
    return input.assignTo ? `${input.assignTo} = ${call}` : call;
}

export interface MsgboxCallInfo {
    /** Index of `MSGBOX` within the line. */
    callStart: number;
    /** Trimmed top-level argument texts. */
    args: string[];
    /** [start, end) of the numeric `expr` token within the line, if arg #2 is an integer literal. */
    exprRange?: [number, number];
    exprValue?: number;
}

/**
 * Locate a `MSGBOX(...)` call on a single line and, when the 2nd argument is a plain integer
 * literal, report its range so it can be decoded/replaced in place. Handles nested parens and
 * string literals (with `""` escapes) when finding top-level argument commas. Best-effort — a
 * non-literal `expr` (e.g. `32+4` or a variable) yields no exprRange.
 */
export function parseMsgboxCallOnLine(line: string): MsgboxCallInfo | undefined {
    const m = /msgbox\s*\(/i.exec(line);
    if (!m) return undefined;
    const start = m.index + m[0].length;

    const argRanges: Array<[number, number]> = [];
    let depth = 0;
    let inStr = false;
    let argStart = start;
    let ended = false;
    for (let i = start; i < line.length; i++) {
        const c = line[i];
        if (inStr) {
            if (c === '"') {
                if (line[i + 1] === '"') { i++; continue; } // "" escape
                inStr = false;
            }
            continue;
        }
        if (c === '"') { inStr = true; }
        else if (c === '(') { depth++; }
        else if (c === ')') {
            if (depth === 0) { argRanges.push([argStart, i]); ended = true; break; }
            depth--;
        } else if (c === ',' && depth === 0) {
            argRanges.push([argStart, i]);
            argStart = i + 1;
        }
    }
    if (!ended) argRanges.push([argStart, line.length]);

    const info: MsgboxCallInfo = {
        callStart: m.index,
        args: argRanges.map(([a, b]) => line.slice(a, b).trim()),
    };
    if (argRanges.length > 1) {
        const [a, b] = argRanges[1];
        const raw = line.slice(a, b);
        const numMatch = /^(\s*)(\d+)\s*$/.exec(raw);
        if (numMatch) {
            const exprStart = a + numMatch[1].length;
            info.exprRange = [exprStart, exprStart + numMatch[2].length];
            info.exprValue = parseInt(numMatch[2], 10);
        }
    }
    return info;
}
