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

/**
 * Build a MsgboxState from a flat UI selection (button/icon/default values + a list of flag
 * values). Keeps the flag-value -> boolean mapping in one place so UIs (QuickPick, webview,
 * a future IntelliJ dialog) only pass raw selections.
 */
export function stateFromSelection(sel: { buttonSet?: number; icon?: number; defaultButton?: number; flags?: number[] }): MsgboxState {
    const flags = new Set(sel.flags ?? []);
    return {
        buttonSet: sel.buttonSet ?? 0,
        icon: sel.icon ?? 0,
        defaultButton: sel.defaultButton ?? 0,
        noEnter: flags.has(65536),
        disableHtml: flags.has(32768),
        mdi: flags.has(131072),
    };
}

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
    /**
     * Verbatim args appended after the title — used when rewriting an existing call to preserve
     * anything past the title we don't model (custom buttons, `MODE=`/`TIM=`/`ERR=`).
     */
    trailingArgs?: string[];
    /** Optional assignment target, e.g. `ret!` -> `ret! = MSGBOX(...)`. */
    assignTo?: string;
}

/** Build a `MSGBOX(...)` statement, including only the positional args that are needed. */
export function composeStatement(input: ComposeInput): string {
    const extras = [...(input.buttons ?? []), ...(input.trailingArgs ?? [])];
    const hasExtras = extras.length > 0;
    const needTitle = (input.title !== undefined && input.title !== '') || hasExtras;
    const needExpr = input.expr !== 0 || needTitle;

    const args: string[] = [input.message];
    if (needExpr) args.push(String(input.expr));
    if (needTitle) args.push(input.title || '""');
    if (hasExtras) args.push(...extras);

    const call = `MSGBOX(${args.join(', ')})`;
    return input.assignTo ? `${input.assignTo} = ${call}` : call;
}

/** The flag values (65536/32768/131072) set on a state — inverse of the flag part of stateFromSelection. */
export function flagsFromState(s: MsgboxState): number[] {
    const flags: number[] = [];
    if (s.noEnter) flags.push(65536);
    if (s.disableHtml) flags.push(32768);
    if (s.mdi) flags.push(131072);
    return flags;
}

/**
 * Lightweight lexical check that a message/title entry is a well-formed BBj expression: not
 * empty (when required), with balanced `"` string literals (`""` escapes) and parentheses.
 * It intentionally does NOT require a string *literal* — `msg$`, `a$+b$`, `getText()` are all
 * valid string expressions — it only flags obvious errors like `"TEST` (no closing quote).
 * Deeper "resolves to a String" checking would need the language server's type inference.
 */
export function validateBbjExpression(text: string, opts: { required?: boolean } = {}): { ok: boolean; message?: string } {
    const t = text.trim();
    if (t === '') {
        return opts.required ? { ok: false, message: 'Required' } : { ok: true };
    }
    let inStr = false;
    let depth = 0;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (inStr) {
            if (c === '"') {
                if (t[i + 1] === '"') { i++; continue; } // "" escape
                inStr = false;
            }
            continue;
        }
        if (c === '"') { inStr = true; }
        else if (c === '(') { depth++; }
        else if (c === ')') { if (--depth < 0) return { ok: false, message: 'Unbalanced parentheses' }; }
    }
    if (inStr) return { ok: false, message: 'Unterminated string literal' };
    if (depth !== 0) return { ok: false, message: 'Unbalanced parentheses' };
    return { ok: true };
}

export interface MsgboxCallInfo {
    /** Index of `MSGBOX` within the line. */
    callStart: number;
    /** Index just past the closing `)` (or the line end if the call is unterminated). */
    callEnd: number;
    /** Trimmed top-level argument texts. */
    args: string[];
    /** [start, end) of the numeric `expr` token within the line, if arg #2 is an integer literal. */
    exprRange?: [number, number];
    exprValue?: number;
    /**
     * Line-relative offset at which to insert `, <expr>` when the call has ONLY a message and
     * no options argument yet (so the composer can *add* options to a bare `MSGBOX("...")`).
     */
    optionInsertOffset?: number;
}

/**
 * Scan the top-level arguments of a call, starting just after its `(`. Handles nested parens
 * and string literals (with `""` escapes) so commas inside them don't split arguments. Returns
 * the argument ranges and `callEnd` (index just past the closing `)`, or the line end).
 */
function scanArgs(line: string, open: number): { argRanges: Array<[number, number]>; callEnd: number } {
    const argRanges: Array<[number, number]> = [];
    let depth = 0;
    let inStr = false;
    let argStart = open;
    let i = open;
    let ended = false;
    for (; i < line.length; i++) {
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

function buildCallInfo(line: string, callStart: number, open: number): MsgboxCallInfo {
    const { argRanges, callEnd } = scanArgs(line, open);
    const info: MsgboxCallInfo = {
        callStart,
        callEnd,
        args: argRanges.map(([a, b]) => line.slice(a, b).trim()),
    };
    if (argRanges.length > 1) {
        // 2nd arg is a plain integer literal -> reconfigurable expr.
        const [a, b] = argRanges[1];
        const numMatch = /^(\s*)(\d+)\s*$/.exec(line.slice(a, b));
        if (numMatch) {
            const exprStart = a + numMatch[1].length;
            info.exprRange = [exprStart, exprStart + numMatch[2].length];
            info.exprValue = parseInt(numMatch[2], 10);
        }
    } else if (argRanges.length === 1 && info.args[0] !== '') {
        // Only a message, no options yet: where `, <expr>` would be inserted.
        const [a, b] = argRanges[0];
        info.optionInsertOffset = a + line.slice(a, b).replace(/\s+$/, '').length;
    }
    return info;
}

/** Every `MSGBOX(...)` call on the line, in source order. */
export function findMsgboxCalls(line: string): MsgboxCallInfo[] {
    const re = /msgbox\s*\(/gi;
    const calls: MsgboxCallInfo[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        calls.push(buildCallInfo(line, m.index, m.index + m[0].length));
    }
    return calls;
}

/** First `MSGBOX(...)` call on the line (convenience). */
export function parseMsgboxCallOnLine(line: string): MsgboxCallInfo | undefined {
    return findMsgboxCalls(line)[0];
}

/**
 * The `MSGBOX(...)` call the cursor is inside, if any. When calls are nested, the innermost
 * (smallest span) containing the cursor wins. Returns undefined when the cursor is on the line
 * but outside every call — so a line with two calls (e.g. `IF..THEN MSGBOX(..) ELSE MSGBOX(..)`)
 * only offers the action for the one in focus.
 */
export function findMsgboxCallAt(line: string, character: number): MsgboxCallInfo | undefined {
    const containing = findMsgboxCalls(line).filter(c => character >= c.callStart && character <= c.callEnd);
    if (containing.length === 0) return undefined;
    return containing.reduce((best, c) => (c.callEnd - c.callStart < best.callEnd - best.callStart ? c : best));
}
