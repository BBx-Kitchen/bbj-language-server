/**
 * Editor-agnostic logic for the BBjWindow::addChildWindow composer (#473) — the child-window
 * counterpart of the addWindow composer (#430).
 *
 * `addChildWindow(id, x, y, w, h, title$, flags$, context [, event_mask$])` (see
 * https://documentation.basis.cloud/BASISHelp/WebHelp/bbjobjects/Window/bbjwindow/bbjwindow_addchildwindow.htm)
 * shares the `$HHHHHHHH$` hex-mask problem with addWindow but has its OWN flag set (borderless,
 * recessed/raised edge, fieldset/simple, docking, …) and two structural twists:
 *   - it is called on a BBjWindow (the parent), not on the BBjSysGui object, and
 *   - the `context` argument sits BETWEEN `flags$` and `event_mask$` in every overload.
 *
 * This module owns the child-window catalogs and the mask <-> hex <-> statement conversions with NO
 * `vscode` dependency, so it is unit-testable and reusable by the IntelliJ client over LSP (#433).
 */
import { expressionDisplayText } from './msgbox-composer.js';
import {
    FlagItem, encodeBits, formatHex, parseHexLiteral, describeMask, knownMask, bitsSet, unknownBits,
    scanArgs, trimmedRange,
} from './addwindow-composer.js';

export { EVENT_MASK_BITS as CHILD_EVENT_MASK_BITS } from './addwindow-composer.js';
import { EVENT_MASK_BITS } from './addwindow-composer.js';

/**
 * Child-window creation flags — every bit is an independent toggle, grouped for the UI. The set is
 * NOT the same as addWindow's: no title-bar/resize/MDI bits, but borderless, edges, fieldset/simple
 * and docking instead.
 */
export const CHILD_WINDOW_FLAGS: FlagItem[] = [
    // Frame & edges
    { value: 0x00000800, label: 'Borderless', group: 'Frame' },
    { value: 0x01000000, label: 'Recessed client edge', group: 'Frame' },
    { value: 0x02000000, label: 'Raised edge', group: 'Frame' },
    { value: 0x00008000, label: 'Simple child window (BBj 22+)', group: 'Frame', detail: 'No status bar or internal docked child windows' },
    { value: 0x00001000, label: 'Fieldset element (BBj 22+)', group: 'Frame', detail: 'With "Simple": renders as a fieldset to emulate a groupbox' },
    // Scrollbars
    { value: 0x00000004, label: 'Horizontal scrollbar', group: 'Scrollbars' },
    { value: 0x00000008, label: 'Vertical scrollbar', group: 'Scrollbars' },
    // Initial state
    { value: 0x00000010, label: 'Initially invisible', group: 'Initial state' },
    { value: 0x00000020, label: 'Initially disabled', group: 'Initial state' },
    // Behavior
    { value: 0x00010000, label: 'Keyboard navigation', group: 'Behavior' },
    { value: 0x00100000, label: 'Automatic layout', group: 'Behavior' },
    { value: 0x00200000, label: 'Docking', group: 'Behavior', detail: 'Attach to one side of the parent frame (default: top)' },
    { value: 0x00800000, label: 'Enter behaves as Tab', group: 'Behavior' },
    { value: 0x08000000, label: 'Enforce unique control names', group: 'Behavior' },
    { value: 0x10000000, label: 'Report all mouse events', group: 'Behavior' },
    { value: 0x20000000, label: 'Report all keypress events', group: 'Behavior' },
    { value: 0x80000000, label: 'TRACK(0) instead of TRACK(1)', group: 'Behavior' },
];

export const describeChildFlags = (mask: number): string => describeMask(mask, CHILD_WINDOW_FLAGS);
export const describeChildEventMask = (mask: number): string => describeMask(mask, EVENT_MASK_BITS);

/** Named child-window flag bits — for readable render/preview code without scattering magic hex. */
export const CHILD_WINDOW_FLAG = {
    HSCROLL: 0x00000004,
    VSCROLL: 0x00000008,
    INVISIBLE: 0x00000010,
    DISABLED: 0x00000020,
    BORDERLESS: 0x00000800,
    FIELDSET: 0x00001000,
    SIMPLE: 0x00008000,
    DOCKING: 0x00200000,
    RECESSED: 0x01000000,
    RAISED: 0x02000000,
} as const;

/** Bits the schematic mock draws directly; every other set flag is surfaced as a text badge. */
const VISUALIZED = (Object.values(CHILD_WINDOW_FLAG).reduce((m, v) => (m | v) >>> 0, 0)
    // "Simple" alone has no visual — badge it unless it participates in the fieldset rendering.
    & ~CHILD_WINDOW_FLAG.SIMPLE) >>> 0;

export interface ChildWindowSchematic {
    borderless: boolean;
    recessed: boolean;
    raised: boolean;
    /** Fieldset (groupbox-like) rendering: requires both the Fieldset and Simple flags. */
    fieldset: boolean;
    hScroll: boolean;
    vScroll: boolean;
    invisible: boolean;
    disabled: boolean;
    /** Docked to the top of the parent frame instead of freely positioned. */
    docked: boolean;
    /** Labels for set flags with no direct visual (Simple alone, Keyboard navigation, …). */
    badges: string[];
}

/** Derive a schematic description of the child window a flag mask produces (drives the preview). */
export function childWindowSchematic(mask: number): ChildWindowSchematic {
    const on = (bit: number) => (mask & bit) !== 0;
    const fieldset = on(CHILD_WINDOW_FLAG.FIELDSET) && on(CHILD_WINDOW_FLAG.SIMPLE);
    return {
        borderless: on(CHILD_WINDOW_FLAG.BORDERLESS),
        recessed: on(CHILD_WINDOW_FLAG.RECESSED),
        raised: on(CHILD_WINDOW_FLAG.RAISED),
        fieldset,
        hScroll: on(CHILD_WINDOW_FLAG.HSCROLL),
        vScroll: on(CHILD_WINDOW_FLAG.VSCROLL),
        invisible: on(CHILD_WINDOW_FLAG.INVISIBLE),
        disabled: on(CHILD_WINDOW_FLAG.DISABLED),
        docked: on(CHILD_WINDOW_FLAG.DOCKING),
        badges: CHILD_WINDOW_FLAGS
            .filter(f => (mask & f.value) !== 0 && (VISUALIZED & f.value) === 0)
            // When fieldset rendering is active, Simple is part of the visual — don't badge it.
            .filter(f => !(fieldset && f.value === CHILD_WINDOW_FLAG.SIMPLE))
            .map(f => f.label),
    };
}

// ---------------------------------------------------------------------------------------------
// Statement composition
// ---------------------------------------------------------------------------------------------

export interface AddChildWindowInput {
    /** Optional assignment target, e.g. `child!` -> `child! = window!.addChildWindow(...)`. */
    receiver?: string;
    /** The parent BBjWindow expression the method is called on, e.g. `window!`. */
    window: string;
    /** Positional argument texts (verbatim BBj expressions). */
    id: string;
    x: string;
    y: string;
    width: string;
    height: string;
    title: string;
    /** Child-window flags bitmask; rendered as a `$........$` hex literal. */
    flags: number;
    /** The child window's context expression, e.g. `sysgui!.getAvailableContext()`. */
    context: string;
    /** Event mask bitmask, or null/undefined to leave it unset (omit the argument = default). */
    eventMask?: number | null;
}

/** Flat UI selection for an addChildWindow preview — shared by the VS Code webview and IntelliJ. */
export interface AddChildWindowPreviewInput {
    /** Chosen child-window-flag bit values. */
    flags: number[];
    /** When false the event_mask argument is omitted entirely (default). */
    eventMaskEnabled: boolean;
    /** Chosen event-mask bit values (only meaningful when enabled). */
    eventMask: number[];
    receiver?: string;
    window: string;
    id: string;
    x: string;
    y: string;
    width: string;
    height: string;
    title: string;
    context: string;
    /** In edit mode the assignment/geometry live in the source; only the hex tokens are rewritten. */
    editMode?: boolean;
    /** Undocumented bits to OR back into the flags/event mask so a round-trip preserves them. */
    preservedFlagBits?: number;
    preservedEventBits?: number;
}

export interface AddChildWindowPreview {
    flags: number;
    eventMask: number | null;
    flagsHex: string;
    eventHex: string | null;
    statement: string;
    flagsSummary: string;
    eventSummary: string;
    render: ChildWindowSchematic & { title: string };
}

/**
 * Compute the full preview payload for an addChildWindow selection — the single entry point every
 * UI uses, so the hex/compose/schematic logic lives in exactly one place.
 */
export function addchildwindowPreview(input: AddChildWindowPreviewInput): AddChildWindowPreview {
    const flags = encodeBits(input.flags);
    const eventMask = input.eventMaskEnabled ? encodeBits(input.eventMask) : null;
    // The hex and the composed statement both carry the preserved (undocumented) bits, so they
    // stay coherent; the summaries/schematic use the catalog-only mask (preserved bits are unlabeled).
    const flagsFull = (flags | (input.preservedFlagBits ?? 0)) >>> 0;
    const eventFull = eventMask === null ? null : (eventMask | (input.preservedEventBits ?? 0)) >>> 0;

    const statement = composeAddChildWindow({
        receiver: input.editMode ? undefined : (input.receiver || undefined),
        window: input.window || 'window!',
        id: input.id || '101',
        x: input.x || '0', y: input.y || '0', width: input.width || '0', height: input.height || '0',
        title: input.title || '""',
        flags: flagsFull,
        context: input.context || 'sysgui!.getAvailableContext()',
        eventMask: eventFull,
    });

    return {
        flags, eventMask, flagsHex: formatHex(flagsFull), eventHex: eventFull === null ? null : formatHex(eventFull),
        statement,
        flagsSummary: describeChildFlags(flags),
        eventSummary: eventMask === null ? '(default)' : describeChildEventMask(eventMask),
        render: { ...childWindowSchematic(flags), title: expressionDisplayText(input.title) },
    };
}

/**
 * Build an `addChildWindow(...)` statement. The context argument follows the flags; the event_mask
 * argument (emitted only when set) follows the context — matching the BBj overloads.
 */
export function composeAddChildWindow(input: AddChildWindowInput): string {
    const args = [input.id, input.x, input.y, input.width, input.height, input.title, formatHex(input.flags), input.context];
    if (input.eventMask != null) {
        args.push(formatHex(input.eventMask));
    }
    const call = `${input.window}.addChildWindow(${args.join(', ')})`;
    return input.receiver ? `${input.receiver} = ${call}` : call;
}

// ---------------------------------------------------------------------------------------------
// Call parsing (locate the flags / event_mask hex literals in an existing call)
// ---------------------------------------------------------------------------------------------

const HEX_LITERAL = /^\$[0-9A-Fa-f]*\$$/;
const STRING_LITERAL = /^"([^"]|"")*"$/;

export interface AddChildWindowCallInfo {
    /** Index of `addChildWindow` start within the line. */
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
     * Line-relative offset at which to insert `, $flags$` when the call has no flags yet. Flags go
     * after the title, i.e. BEFORE the trailing context argument — so this is only offered when a
     * title (string-literal second-to-last argument) is present, since the flags overloads all
     * require a title.
     */
    flagsInsertOffset?: number;
    /**
     * Line-relative offset at which to insert `, $event_mask$` when the call has flags but no
     * event_mask yet. The event_mask follows the context, i.e. goes after the LAST argument.
     */
    eventMaskInsertOffset?: number;
}

function buildCallInfo(line: string, callStart: number, open: number): AddChildWindowCallInfo {
    const { argRanges, callEnd } = scanArgs(line, open);
    const args = argRanges.map(([a, b]) => line.slice(a, b).trim());
    const info: AddChildWindowCallInfo = { callStart, callEnd, args };

    // flags = first hex literal, event_mask = second (context is an int/expr, never a $...$ literal).
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

    if (hexArgIdx.length === 0 && args.length >= 2 && STRING_LITERAL.test(args[args.length - 2])) {
        // No flags yet, but a title is present: flags go right after the title, before the context.
        const [, end] = trimmedRange(line, argRanges[args.length - 2][0], argRanges[args.length - 2][1]);
        info.flagsInsertOffset = end;
    } else if (hexArgIdx.length === 1) {
        // Flags but no event_mask: it goes after the context, i.e. after the last argument.
        const [, end] = trimmedRange(line, argRanges[argRanges.length - 1][0], argRanges[argRanges.length - 1][1]);
        info.eventMaskInsertOffset = end;
    }
    return info;
}

/** Every `addChildWindow(...)` call on the line, in source order. */
export function findAddChildWindowCalls(line: string): AddChildWindowCallInfo[] {
    const re = /addchildwindow\s*\(/gi;
    const calls: AddChildWindowCallInfo[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        calls.push(buildCallInfo(line, m.index, m.index + m[0].length));
    }
    return calls;
}

/** First `addChildWindow(...)` call on the line (convenience). */
export function parseAddChildWindowCallOnLine(line: string): AddChildWindowCallInfo | undefined {
    return findAddChildWindowCalls(line)[0];
}

/**
 * The `addChildWindow(...)` call the cursor is inside, if any. When calls are nested/multiple, the
 * innermost (smallest span) containing the cursor wins.
 */
export function findAddChildWindowCallAt(line: string, character: number): AddChildWindowCallInfo | undefined {
    const containing = findAddChildWindowCalls(line).filter(c => character >= c.callStart && character <= c.callEnd);
    if (containing.length === 0) return undefined;
    return containing.reduce((best, c) => (c.callEnd - c.callStart < best.callEnd - best.callStart ? c : best));
}

/** Convenience re-exports so clients of this module need not also import the addWindow module. */
export { encodeBits, formatHex, parseHexLiteral, knownMask, bitsSet, unknownBits, type FlagItem };
