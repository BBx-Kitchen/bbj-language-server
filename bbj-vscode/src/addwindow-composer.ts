/**
 * Editor-agnostic logic for the BBjSysGui::addWindow composer (spike for #430).
 *
 * `addWindow(x, y, w, h, title$, flags$ [, event_mask$])` hides the window's whole personality
 * behind two hex-STRING bitmasks (see
 * https://documentation.basis.cloud/BASISHelp/WebHelp/bbjobjects/SysGui/bbjsysgui/bbjsysgui_addwindow.htm):
 *   - `flags$`      — ~26 independent toggles (close box, resize, title bar, dialog, MDI, …)
 *   - `event_mask$` — ~19 event-reporting bits (mouse/keyboard/window/control events)
 * Both are written as `$HHHHHHHH$` hex literals, e.g. `$00010003$` (Resizable + Close box +
 * Keyboard navigation). This is the same problem the MSGBOX composer (#426) solved for a decimal
 * `expr`, but hex, 32-bit, and with the sign bit (`$80000000$`) in play.
 *
 * This module owns the two catalogs and the mask <-> hex <-> statement conversions with NO
 * `vscode` dependency, so it is unit-testable and reusable by the IntelliJ client later.
 */

export interface FlagItem {
    /** The single bit this toggle sets, e.g. 0x00000002. */
    value: number;
    label: string;
    /** UI grouping so the composer can lay related toggles out together. */
    group: string;
    detail?: string;
}

/**
 * Window creation flags — every bit is an independent toggle (unlike MSGBOX's mutually-exclusive
 * button/icon groups), so the "state" is simply the set of chosen bits. Grouped for the UI.
 */
export const WINDOW_FLAGS: FlagItem[] = [
    // Frame & chrome
    { value: 0x00040000, label: 'Border', group: 'Frame' },
    { value: 0x01000000, label: 'No title bar', group: 'Frame' },
    { value: 0x00080000, label: 'Dialog', group: 'Frame' },
    { value: 0x00000800, label: 'Menu bar', group: 'Frame' },
    { value: 0x00002000, label: 'No menu separator line', group: 'Frame' },
    // Title-bar controls
    { value: 0x00000002, label: 'Close box', group: 'Title bar' },
    { value: 0x00000080, label: 'Maximizable & minimizable', group: 'Title bar' },
    // Resize & scrollbars
    { value: 0x00000001, label: 'Resizable', group: 'Resize' },
    { value: 0x00000004, label: 'Horizontal scrollbar', group: 'Resize' },
    { value: 0x00000008, label: 'Vertical scrollbar', group: 'Resize' },
    // Initial state
    { value: 0x00000010, label: 'Initially invisible', group: 'Initial state' },
    { value: 0x00000020, label: 'Initially disabled', group: 'Initial state' },
    { value: 0x00000100, label: 'Initially minimized', group: 'Initial state' },
    { value: 0x00001000, label: 'Initially maximized', group: 'Initial state' },
    // MDI
    { value: 0x02000000, label: 'Modal within MDI desktop', group: 'MDI' },
    { value: 0x40000000, label: 'Modal within MDI group', group: 'MDI' },
    // Behavior
    { value: 0x00010000, label: 'Keyboard navigation', group: 'Behavior' },
    { value: 0x00020000, label: 'Always on top', group: 'Behavior' },
    { value: 0x00100000, label: 'Automatic layout', group: 'Behavior' },
    { value: 0x00400000, label: 'Custom colors', group: 'Behavior' },
    { value: 0x00800000, label: 'Enter behaves as Tab', group: 'Behavior' },
    { value: 0x08000000, label: 'Enforce unique control names', group: 'Behavior' },
    { value: 0x04000000, label: 'SYSCOLOR events', group: 'Behavior' },
    { value: 0x10000000, label: 'Report all mouse events', group: 'Behavior' },
    { value: 0x20000000, label: 'Report all keypress events', group: 'Behavior' },
    { value: 0x80000000, label: 'TRACK(0) instead of TRACK(1)', group: 'Behavior' },
];

/** Event-mask bits — which events the window reports. Optional; usually left at the default. */
export const EVENT_MASK_BITS: FlagItem[] = [
    // Mouse
    { value: 0x00000040, label: 'Mouse button down', group: 'Mouse' },
    { value: 0x00000080, label: 'Mouse button up', group: 'Mouse' },
    { value: 0x00000100, label: 'Mouse moved', group: 'Mouse' },
    { value: 0x00000200, label: 'Mouse button double-click', group: 'Mouse' },
    { value: 0x00000020, label: 'Mouse wheel scroll', group: 'Mouse' },
    { value: 0x00000800, label: 'Mouse button click (BBj 23+)', group: 'Mouse' },
    { value: 0x20000000, label: 'Right mouse button down', group: 'Mouse' },
    { value: 0x10000000, label: 'Mouse enter/exit control or window', group: 'Mouse' },
    // Keyboard
    { value: 0x00000400, label: 'Key pressed', group: 'Keyboard' },
    // Window
    { value: 0x00000001, label: 'Popup request', group: 'Window' },
    { value: 0x00000004, label: 'Window focus change', group: 'Window' },
    { value: 0x00000008, label: 'Window resized', group: 'Window' },
    { value: 0x40000000, label: 'Window activation', group: 'Window' },
    { value: 0x80000000, label: 'User changed system colors', group: 'Window' },
    // Controls
    { value: 0x02000000, label: 'Check/uncheck checkbox or radio button', group: 'Controls' },
    { value: 0x01000000, label: 'Click or double-click on list item', group: 'Controls' },
    { value: 0x00400000, label: 'Edit / list-edit modified', group: 'Controls' },
    { value: 0x00800000, label: 'Edit / list-edit / text-edit focus change', group: 'Controls' },
    { value: 0x00100000, label: 'Scroll bar position changed', group: 'Controls' },
];

/** OR of every catalog bit — used to isolate bits we don't model so a round-trip can preserve them. */
export function knownMask(catalog: FlagItem[]): number {
    return catalog.reduce((m, f) => (m | f.value) >>> 0, 0);
}

/** OR a list of bit values into a single unsigned 32-bit mask (sign bit safe). */
export function encodeBits(values: number[]): number {
    return values.reduce((acc, v) => (acc | v) >>> 0, 0);
}

/** The catalog bits set in `mask`, in catalog order (inverse of {@link encodeBits}). */
export function bitsSet(mask: number, catalog: FlagItem[]): number[] {
    return catalog.filter(f => (mask & f.value) !== 0).map(f => f.value);
}

/** Bits set in `mask` that no catalog entry models — preserved verbatim when re-encoding a call. */
export function unknownBits(mask: number, catalog: FlagItem[]): number {
    return (mask & ~knownMask(catalog)) >>> 0;
}

/** Format a 32-bit mask as a canonical BBj hex-string literal, e.g. `$00010003$`. */
export function formatHex(mask: number): string {
    return '$' + (mask >>> 0).toString(16).toUpperCase().padStart(8, '0') + '$';
}

/** Parse a `$HHHHHHHH$` hex-string literal to an unsigned 32-bit number; `$$` is 0. Else undefined. */
export function parseHexLiteral(token: string): number | undefined {
    const m = /^\$([0-9A-Fa-f]*)\$$/.exec(token.trim());
    if (!m) return undefined;
    return m[1] === '' ? 0 : parseInt(m[1], 16) >>> 0;
}

/** Human-readable ` · `-joined summary of the set bits in `mask` (or `(none)` when empty). */
export function describeMask(mask: number, catalog: FlagItem[]): string {
    const labels = catalog.filter(f => (mask & f.value) !== 0).map(f => f.label);
    return labels.length ? labels.join(' · ') : '(none)';
}

export const describeFlags = (mask: number): string => describeMask(mask, WINDOW_FLAGS);
export const describeEventMask = (mask: number): string => describeMask(mask, EVENT_MASK_BITS);

// ---------------------------------------------------------------------------------------------
// Statement composition
// ---------------------------------------------------------------------------------------------

export interface AddWindowInput {
    /** Optional assignment target, e.g. `window!` -> `window! = SYSGUI!.addWindow(...)`. */
    receiver?: string;
    /** The BBjSysGui expression the method is called on, e.g. `sysgui!`. */
    sysgui: string;
    /** Positional geometry/title argument texts (verbatim BBj expressions). */
    x: string;
    y: string;
    width: string;
    height: string;
    title: string;
    /** Window flags bitmask; rendered as a `$........$` hex literal. */
    flags: number;
    /** Event mask bitmask, or null/undefined to leave it unset (omit the argument = window default). */
    eventMask?: number | null;
}

/** Build an `addWindow(...)` statement, emitting the event_mask argument only when it is set. */
export function composeAddWindow(input: AddWindowInput): string {
    const args = [input.x, input.y, input.width, input.height, input.title, formatHex(input.flags)];
    if (input.eventMask != null) {
        args.push(formatHex(input.eventMask));
    }
    const call = `${input.sysgui}.addWindow(${args.join(', ')})`;
    return input.receiver ? `${input.receiver} = ${call}` : call;
}

// ---------------------------------------------------------------------------------------------
// Call parsing (locate the flags / event_mask hex literals in an existing call)
// ---------------------------------------------------------------------------------------------

const HEX_LITERAL = /^\$[0-9A-Fa-f]*\$$/;

export interface AddWindowCallInfo {
    /** Index of `addWindow` (well, the receiver-relative `.addWindow`) start within the line. */
    callStart: number;
    /** Index just past the closing `)` (or the line end if the call is unterminated). */
    callEnd: number;
    /** Trimmed top-level argument texts. */
    args: string[];
    /** [start, end) of the flags hex literal token within the line, if present. */
    flagsRange?: [number, number];
    flagsValue?: number;
    /** [start, end) of the event_mask hex literal token within the line, if present. */
    eventMaskRange?: [number, number];
    eventMaskValue?: number;
    /**
     * Line-relative offset at which to insert `, $flags$` when the call has args but no hex-literal
     * flags yet (flags follow the title in every overload) — lets the composer *add* flags.
     */
    flagsInsertOffset?: number;
    /**
     * Line-relative offset at which to insert `, $event_mask$` when the call has flags but no
     * event_mask yet — the opt-in "configure event mask" path.
     */
    eventMaskInsertOffset?: number;
}

/**
 * Scan the top-level arguments of a call starting just after its `(`. Handles nested parens and
 * `"` string literals (with `""` escapes) so commas inside them don't split arguments. `$...$` hex
 * literals contain no comma/paren so they need no special handling here.
 */
function scanArgs(line: string, open: number): { argRanges: Array<[number, number]>; callEnd: number } {
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
function trimmedRange(line: string, a: number, b: number): [number, number] {
    const seg = line.slice(a, b);
    const start = a + (seg.length - seg.trimStart().length);
    return [start, start + seg.trim().length];
}

function buildCallInfo(line: string, callStart: number, open: number): AddWindowCallInfo {
    const { argRanges, callEnd } = scanArgs(line, open);
    const args = argRanges.map(([a, b]) => line.slice(a, b).trim());
    const nonEmpty = args.length > 1 || args[0] !== '';
    const info: AddWindowCallInfo = { callStart, callEnd, args };

    // flags = first hex literal, event_mask = second (event_mask never precedes flags in any overload).
    const hexArgIdx = args.map((a, i) => (HEX_LITERAL.test(a) ? i : -1)).filter(i => i >= 0);
    if (hexArgIdx.length >= 1) {
        const fi = hexArgIdx[0];
        info.flagsRange = trimmedRange(line, argRanges[fi][0], argRanges[fi][1]);
        info.flagsValue = parseHexLiteral(args[fi]);
    }
    if (hexArgIdx.length >= 2) {
        const ei = hexArgIdx[1];
        info.eventMaskRange = trimmedRange(line, argRanges[ei][0], argRanges[ei][1]);
        info.eventMaskValue = parseHexLiteral(args[ei]);
    }

    if (hexArgIdx.length === 0 && nonEmpty) {
        // No flags yet: flags go right after the last (title) argument.
        const [, end] = trimmedRange(line, argRanges[argRanges.length - 1][0], argRanges[argRanges.length - 1][1]);
        info.flagsInsertOffset = end;
    } else if (hexArgIdx.length === 1) {
        // Flags but no event_mask: the event_mask goes right after the flags literal.
        info.eventMaskInsertOffset = info.flagsRange![1];
    }
    return info;
}

/** Every `addWindow(...)` call on the line, in source order. */
export function findAddWindowCalls(line: string): AddWindowCallInfo[] {
    const re = /addwindow\s*\(/gi;
    const calls: AddWindowCallInfo[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        calls.push(buildCallInfo(line, m.index, m.index + m[0].length));
    }
    return calls;
}

/** First `addWindow(...)` call on the line (convenience). */
export function parseAddWindowCallOnLine(line: string): AddWindowCallInfo | undefined {
    return findAddWindowCalls(line)[0];
}

/**
 * The `addWindow(...)` call the cursor is inside, if any. When calls are nested/multiple, the
 * innermost (smallest span) containing the cursor wins — so a line with two calls only offers the
 * action for the one in focus.
 */
export function findAddWindowCallAt(line: string, character: number): AddWindowCallInfo | undefined {
    const containing = findAddWindowCalls(line).filter(c => character >= c.callStart && character <= c.callEnd);
    if (containing.length === 0) return undefined;
    return containing.reduce((best, c) => (c.callEnd - c.callStart < best.callEnd - best.callStart ? c : best));
}
