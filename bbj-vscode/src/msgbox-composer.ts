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
 * It only flags structural errors like `"TEST` (no closing quote) — it does NOT check the
 * expression's *type*. Use {@link validateStringField} for the message/title/button inputs,
 * which additionally requires the expression to resolve to a String.
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

/** Wrap arbitrary text as a BBj string literal, doubling any embedded `"` (the BBj `""` escape). */
export function quoteAsStringLiteral(text: string): string {
    return `"${text.replace(/"/g, '""')}"`;
}

/** True when `t` is a single, whole-length `"..."` string literal (with `""` escapes). */
function isStringLiteral(t: string): boolean {
    return /^"([^"]|"")*"$/.test(t);
}

/** True when `t` starts with `(` and its matching `)` is the final character. */
function wrappedInParens(t: string): boolean {
    if (!t.startsWith('(') || !t.endsWith(')')) return false;
    let depth = 0, inStr = false;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (inStr) {
            if (c === '"') { if (t[i + 1] === '"') { i++; continue; } inStr = false; }
            continue;
        }
        if (c === '"') inStr = true;
        else if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0 && i !== t.length - 1) return false; }
    }
    return depth === 0;
}

/**
 * Split a BBj expression on its top-level `+` (concatenation) operators, ignoring `+` inside
 * string literals, parentheses, or `[...]` subscripts. Returns `null` when the top level uses a
 * numeric operator (`-`, `*`, `/`) — such an expression is arithmetic, i.e. NOT a String.
 */
function splitTopLevelPlus(t: string): string[] | null {
    const parts: string[] = [];
    let depth = 0, inStr = false, start = 0;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (inStr) {
            if (c === '"') { if (t[i + 1] === '"') { i++; continue; } inStr = false; }
            continue;
        }
        if (c === '"') inStr = true;
        else if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (depth === 0) {
            if (c === '+') { parts.push(t.slice(start, i)); start = i + 1; }
            else if (c === '-' || c === '*' || c === '/') return null; // arithmetic ⇒ numeric
        }
    }
    parts.push(t.slice(start));
    return parts;
}

/** Whether a single `+`-free operand is String-typed by its lexical form. */
function operandIsString(op: string): boolean {
    const t = op.trim();
    if (t === '') return false;
    if (wrappedInParens(t)) return resolvesToString(t.slice(1, -1));
    if (isStringLiteral(t)) return true;
    // A function/method call may return a String (STR(), CVS(), obj!.getText(), a$(...)); accept it.
    if (t.endsWith(')')) return true;
    // A reference whose name ends in `$` (string) or `!` (object), allowing a trailing subscript.
    const bare = t.replace(/(\[[^\]]*\])+$/, '');
    return /[$!]$/.test(bare);
}

/**
 * Best-effort lexical check that a BBj expression resolves to a String — the constraint for the
 * MSGBOX message/title/button arguments. Without the language server's type inference this cannot
 * be exact, but it reliably distinguishes the forms that matter here:
 *   - String literals (`"Caption"`), string vars (`caption$`), object vars (`caption!`),
 *     function/method calls, and `+`-concatenations of those  → String (accepted).
 *   - A bare numeric variable (`caption`), an integer var (`n%`), or a number → NOT a String.
 * The last case is the reported bug: `caption` lands verbatim as a numeric reference and breaks
 * the generated statement; the caller should quote it (`"caption"`) or add a `$`/`!` suffix.
 */
export function resolvesToString(text: string): boolean {
    const t = text.trim();
    if (t === '') return false;
    const operands = splitTopLevelPlus(t);
    if (operands === null) return false; // top-level arithmetic ⇒ numeric
    return operands.every(operandIsString);
}

/**
 * Validate a string-typed field (message / title / custom button). Layers three checks: presence
 * (when `required`), structural well-formedness ({@link validateBbjExpression}), and String typing
 * ({@link resolvesToString}). The typing message tells the user how to fix a bare value.
 */
export function validateStringField(text: string, opts: { required?: boolean } = {}): { ok: boolean; message?: string } {
    const t = text.trim();
    if (t === '') {
        return opts.required ? { ok: false, message: 'Required' } : { ok: true };
    }
    const structural = validateBbjExpression(t);
    if (!structural.ok) return structural;
    if (!resolvesToString(t)) {
        // Suggest a `$`/`!` suffix only when the value is a plain identifier (a valid var name);
        // for anything else (prose, numbers) the only sensible fix is to quote it.
        const isIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/.test(t);
        const suffixHint = isIdentifier ? `, or a string variable (${t}$ / ${t}!)` : '';
        return { ok: false, message: `Not a string — quote it as ${quoteAsStringLiteral(t)}${suffixHint}` };
    }
    return { ok: true };
}

/** Human display text for an expression: a `"..."` literal becomes its content, anything else is shown as-is. */
export function expressionDisplayText(expr: string): string {
    const t = (expr ?? '').trim();
    if (/^"([^"]|"")*"$/.test(t)) {
        return t.slice(1, -1).replace(/""/g, '"');
    }
    return t;
}

const STANDARD_BUTTON_LABELS: Record<number, string[]> = {
    0: ['OK'],
    1: ['OK', 'Cancel'],
    2: ['Abort', 'Retry', 'Ignore'],
    3: ['Yes', 'No', 'Cancel'],
    4: ['Yes', 'No'],
    5: ['Retry', 'Cancel'],
};

/** Display labels for the schematic preview: standard set labels, or the custom button expressions. */
export function buttonLabels(buttonSet: number, customButtons: string[] = []): string[] {
    if (buttonSet === 7) {
        const labels = customButtons.map(expressionDisplayText).filter(s => s.trim() !== '');
        return labels.length ? labels : ['Button 1'];
    }
    return STANDARD_BUTTON_LABELS[buttonSet] ?? ['OK'];
}

/** Flat UI selection for a MSGBOX preview (message/title/options), shared by every client. */
export interface MsgboxPreviewInput {
    message: string;
    title: string;
    assignTo?: string;
    buttonSet: number;
    icon: number;
    defaultButton: number;
    flags: number[];
    customButtons: string[];
    /** Verbatim args past the title to preserve when rewriting an existing call. */
    trailingArgs?: string[];
    /** In edit mode the assignment prefix already exists in the source, so it is omitted. */
    editMode?: boolean;
}

/** Everything a composer UI needs to render one state: the statement, validation, and a schematic. */
export interface MsgboxPreview {
    expr: number;
    statement: string;
    summary: string;
    messageError?: string;
    titleError?: string;
    customError?: string;
    valid: boolean;
    render: { title: string; message: string; icon: number; buttons: string[]; defaultIndex: number };
}

/**
 * Compute the full preview payload for a MSGBOX selection — the single entry point every UI (the
 * VS Code webview and the IntelliJ dialog, via the LS) uses so the compose/validate/render logic
 * lives in exactly one place.
 */
export function msgboxPreview(input: MsgboxPreviewInput): MsgboxPreview {
    const state = stateFromSelection(input);
    const isCustom = state.buttonSet === 7;
    const cleanCustom = (input.customButtons ?? []).map(s => s.trim()).filter(s => s !== '');
    const expr = encode(state);

    const msgV = validateStringField(input.message, { required: true });
    const titleV = validateStringField(input.title, { required: false });
    const firstBadButton = cleanCustom.map(b => validateStringField(b)).find(v => !v.ok);
    const customOk = !isCustom || (cleanCustom.length > 0 && !firstBadButton);

    const statement = composeStatement({
        message: input.message || '""',
        expr,
        title: input.title || undefined,
        buttons: isCustom ? cleanCustom : undefined,
        trailingArgs: input.trailingArgs,
        assignTo: input.editMode ? undefined : (input.assignTo || undefined),
    });

    const labels = buttonLabels(state.buttonSet, input.customButtons);
    const defaultIndex = state.defaultButton === 256 ? 1 : state.defaultButton === 512 ? 2 : 0;
    return {
        expr, statement, summary: describe(expr),
        messageError: msgV.ok ? undefined : msgV.message,
        titleError: titleV.ok ? undefined : titleV.message,
        customError: customOk ? undefined : (cleanCustom.length === 0 ? 'Add at least one button label' : (firstBadButton?.message ?? 'Invalid button expression')),
        valid: msgV.ok && titleV.ok && customOk,
        render: {
            title: expressionDisplayText(input.title),
            message: expressionDisplayText(input.message),
            icon: state.icon,
            buttons: labels,
            defaultIndex: Math.max(0, Math.min(defaultIndex, labels.length - 1)),
        },
    };
}

/**
 * Split the args past the title (args[3..]) into custom button labels and the remaining trailing
 * args to preserve verbatim. Positional buttons only apply to the "Custom" set (7) and stop at the
 * first `MODE=`/`TIM=`/`ERR=` keyword arg.
 */
export function splitButtonsAndTrailing(rest: string[], isCustom: boolean): { buttons: string[]; trailing: string[] } {
    if (!isCustom) return { buttons: [], trailing: rest };
    const keyword = /^(MODE|TIM|ERR)\b\s*=/i;
    const buttons: string[] = [];
    let i = 0;
    while (i < rest.length && buttons.length < 3 && !keyword.test(rest[i])) {
        buttons.push(rest[i]);
        i++;
    }
    return { buttons, trailing: rest.slice(i) };
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
