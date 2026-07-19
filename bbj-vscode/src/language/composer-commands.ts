/**
 * Shared composer command layer for the MSGBOX (#426) and addWindow (#430) visual composers,
 * exposed over LSP `workspace`-style custom requests so BOTH clients — the VS Code webview and the
 * IntelliJ plugin (LSP4IJ) — drive one implementation of the flag/hex arithmetic (#433).
 *
 * The domain logic itself lives in the editor-agnostic `../msgbox-composer` and `../addwindow-composer`
 * modules (no `vscode` dependency, fully unit-tested); this file only re-exposes their pure API as
 * request handlers. It adds NO new flag/hex logic — every handler is a thin pass-through — so the
 * language server and the VS Code UI stay a single source of truth.
 *
 * Requests use the `bbj/composer/*` namespace, matching the existing custom-request convention in
 * `main.ts` (e.g. `bbj/refreshJavaClasses`). Params/results are plain JSON.
 */
import type { Connection } from 'vscode-languageserver';
import {
    BUTTON_SETS, ICONS, DEFAULT_BUTTONS, FLAGS,
    encode, decode, describe as describeMsgbox, composeStatement, stateFromSelection, flagsFromState,
    validateStringField, findMsgboxCallAt, parseMsgboxCallOnLine, msgboxPreview,
    splitButtonsAndTrailing,
    type ComposeInput, type MsgboxPreviewInput,
} from '../msgbox-composer.js';
import {
    WINDOW_FLAGS, EVENT_MASK_BITS,
    encodeBits, bitsSet, unknownBits, formatHex, parseHexLiteral,
    describeFlags, describeEventMask, windowSchematic, composeAddWindow, addwindowPreview,
    findAddWindowCallAt, parseAddWindowCallOnLine,
    type AddWindowInput, type AddWindowPreviewInput,
} from '../addwindow-composer.js';
import {
    CHILD_WINDOW_FLAGS, CHILD_EVENT_MASK_BITS,
    childWindowSchematic, composeAddChildWindow, addchildwindowPreview,
    findAddChildWindowCallAt, parseAddChildWindowCallOnLine,
    type AddChildWindowInput, type AddChildWindowPreviewInput,
} from '../addchildwindow-composer.js';

/** A line + optional cursor column; when `character` is set, only the call at the cursor is returned. */
interface LineQuery { line: string; character?: number }

/** Best-effort title for a window preview: the last string-literal argument in the call. */
function titleArg(args: string[], fallback: string): string {
    const literal = [...args].reverse().find(a => /^"([^"]|"")*"$/.test(a));
    return literal ?? fallback;
}
const addWindowTitleArg = (args: string[]) => titleArg(args, '"Window"');
const addChildWindowTitleArg = (args: string[]) => titleArg(args, '"Child"');

/**
 * The composer request handlers, keyed by LSP method. Exported (not just wired) so they can be
 * unit-tested directly without a live LSP connection. Each takes the JSON params and returns JSON.
 */
export const composerHandlers = {
    /** Static option catalogs — a client fetches these once and renders its own UI. */
    'bbj/composer/catalogs': () => ({
        msgbox: { buttonSets: BUTTON_SETS, icons: ICONS, defaultButtons: DEFAULT_BUTTONS, flags: FLAGS },
        addwindow: { flags: WINDOW_FLAGS, eventBits: EVENT_MASK_BITS },
        addchildwindow: { flags: CHILD_WINDOW_FLAGS, eventBits: CHILD_EVENT_MASK_BITS },
    }),

    // ---- MSGBOX ----------------------------------------------------------------------------------
    /** Flat UI selection -> additive numeric `expr`. */
    'bbj/composer/msgbox/encode': (p: { selection: Parameters<typeof stateFromSelection>[0] }) =>
        ({ expr: encode(stateFromSelection(p.selection)) }),
    /** `expr` -> flat selection (button set / icon / default button / flag values). */
    'bbj/composer/msgbox/decode': (p: { expr: number }) => {
        const s = decode(p.expr);
        return { buttonSet: s.buttonSet, icon: s.icon, defaultButton: s.defaultButton, flags: flagsFromState(s) };
    },
    /** Aggregate: full UI payload (statement + validation + render) for one selection in a single call. */
    'bbj/composer/msgbox/preview': (p: { input: MsgboxPreviewInput }) => msgboxPreview(p.input),
    'bbj/composer/msgbox/compose': (p: { input: ComposeInput }) => ({ statement: composeStatement(p.input) }),
    'bbj/composer/msgbox/describe': (p: { expr: number }) => ({ text: describeMsgbox(p.expr) }),
    /** Validate a string-typed field (message/title/button) — resolves-to-String + structural. */
    'bbj/composer/msgbox/validateString': (p: { text: string; required?: boolean }) =>
        validateStringField(p.text, { required: p.required }),
    /** Locate a MSGBOX call on a line (the one at `character`, or the first). */
    'bbj/composer/msgbox/parseLine': (p: LineQuery) =>
        ({ call: p.character === undefined ? parseMsgboxCallOnLine(p.line) : findMsgboxCallAt(p.line, p.character) }),
    /**
     * Find the MSGBOX call at the caret and decode it into a ready-to-prefill payload + the call
     * span to replace (edit-in-place). `found: false` when the caret is not inside a MSGBOX call.
     */
    'bbj/composer/msgbox/decodeCall': (p: LineQuery) => {
        const info = p.character === undefined ? parseMsgboxCallOnLine(p.line) : findMsgboxCallAt(p.line, p.character);
        const hasExpr = !!info && info.exprRange !== undefined && info.exprValue !== undefined;
        const canAddOptions = !!info && info.optionInsertOffset !== undefined;
        if (!info || (!hasExpr && !canAddOptions)) {
            return { found: false };
        }
        const st = decode(hasExpr ? info.exprValue! : 0);
        const { buttons, trailing } = hasExpr
            ? splitButtonsAndTrailing(info.args.slice(3), st.buttonSet === 7)
            : { buttons: [], trailing: [] };
        return {
            found: true,
            edit: { callStart: info.callStart, callEnd: info.callEnd },
            trailingArgs: trailing,
            initial: {
                message: info.args[0] ?? '""',
                title: hasExpr ? (info.args[2] ?? '') : '',
                buttonSet: st.buttonSet, icon: st.icon, defaultButton: st.defaultButton,
                flags: flagsFromState(st), customButtons: buttons,
            },
        };
    },

    // ---- addWindow -------------------------------------------------------------------------------
    /** Chosen flag bits -> mask + `$........$` hex (unknown bits OR-ed back for round-trip safety). */
    'bbj/composer/addwindow/encodeFlags': (p: { bits: number[]; preserved?: number }) => {
        const mask = encodeBits(p.bits) | (p.preserved ?? 0);
        return { mask: mask >>> 0, hex: formatHex(mask) };
    },
    'bbj/composer/addwindow/encodeEventMask': (p: { bits: number[]; preserved?: number }) => {
        const mask = encodeBits(p.bits) | (p.preserved ?? 0);
        return { mask: mask >>> 0, hex: formatHex(mask) };
    },
    /** A flags mask -> the set flag bits, the bits we don't model, and a drawable schematic. */
    'bbj/composer/addwindow/decodeFlags': (p: { mask: number }) => ({
        bits: bitsSet(p.mask, WINDOW_FLAGS),
        unknownBits: unknownBits(p.mask, WINDOW_FLAGS),
        schematic: windowSchematic(p.mask),
        text: describeFlags(p.mask),
    }),
    'bbj/composer/addwindow/decodeEventMask': (p: { mask: number }) => ({
        bits: bitsSet(p.mask, EVENT_MASK_BITS),
        unknownBits: unknownBits(p.mask, EVENT_MASK_BITS),
        text: describeEventMask(p.mask),
    }),
    /** Aggregate: full UI payload (statement + flags/event hex + summaries + schematic) in one call. */
    'bbj/composer/addwindow/preview': (p: { input: AddWindowPreviewInput }) => addwindowPreview(p.input),
    'bbj/composer/addwindow/compose': (p: { input: AddWindowInput }) => ({ statement: composeAddWindow(p.input) }),
    'bbj/composer/addwindow/schematic': (p: { mask: number }) => windowSchematic(p.mask),
    /** Parse a `$HHHHHHHH$` hex literal to an unsigned number (or undefined). */
    'bbj/composer/addwindow/parseHex': (p: { token: string }) => ({ value: parseHexLiteral(p.token) }),
    /** Locate an addWindow call on a line (the one at `character`, or the first). */
    'bbj/composer/addwindow/parseLine': (p: LineQuery) =>
        ({ call: p.character === undefined ? parseAddWindowCallOnLine(p.line) : findAddWindowCallAt(p.line, p.character) }),
    /**
     * Find the addWindow call at the caret and decode it into a prefill payload + the token ranges/
     * insert offsets to rewrite in place. `found: false` when the caret is not inside such a call.
     */
    'bbj/composer/addwindow/decodeCall': (p: LineQuery) => {
        const info = p.character === undefined ? parseAddWindowCallOnLine(p.line) : findAddWindowCallAt(p.line, p.character);
        if (!info) {
            return { found: false };
        }
        const flags = info.flagsValue ?? 0;
        const hasEvent = info.eventMaskValue !== undefined;
        const eventMask = info.eventMaskValue ?? 0;
        return {
            found: true,
            edit: {
                flagsRange: info.flagsRange, flagsInsertOffset: info.flagsInsertOffset,
                eventMaskRange: info.eventMaskRange, eventMaskInsertOffset: info.eventMaskInsertOffset,
                preservedFlagBits: unknownBits(flags, WINDOW_FLAGS),
                preservedEventBits: hasEvent ? unknownBits(eventMask, EVENT_MASK_BITS) : 0,
            },
            initial: {
                flags: bitsSet(flags, WINDOW_FLAGS),
                eventMaskEnabled: hasEvent,
                eventMask: hasEvent ? bitsSet(eventMask, EVENT_MASK_BITS) : [],
                title: addWindowTitleArg(info.args),
            },
        };
    },
    // ---- addChildWindow --------------------------------------------------------------------------
    /** Aggregate: full UI payload (statement + flags/event hex + summaries + schematic) in one call. */
    'bbj/composer/addchildwindow/preview': (p: { input: AddChildWindowPreviewInput }) => addchildwindowPreview(p.input),
    'bbj/composer/addchildwindow/compose': (p: { input: AddChildWindowInput }) => ({ statement: composeAddChildWindow(p.input) }),
    'bbj/composer/addchildwindow/schematic': (p: { mask: number }) => childWindowSchematic(p.mask),
    /** Locate an addChildWindow call on a line (the one at `character`, or the first). */
    'bbj/composer/addchildwindow/parseLine': (p: LineQuery) =>
        ({ call: p.character === undefined ? parseAddChildWindowCallOnLine(p.line) : findAddChildWindowCallAt(p.line, p.character) }),
    /**
     * Find the addChildWindow call at the caret and decode it into a prefill payload + the token
     * ranges/insert offsets to rewrite in place. `found: false` when the caret is not inside one.
     */
    'bbj/composer/addchildwindow/decodeCall': (p: LineQuery) => {
        const info = p.character === undefined ? parseAddChildWindowCallOnLine(p.line) : findAddChildWindowCallAt(p.line, p.character);
        if (!info) {
            return { found: false };
        }
        const flags = info.flagsValue ?? 0;
        const hasEvent = info.eventMaskValue !== undefined;
        const eventMask = info.eventMaskValue ?? 0;
        return {
            found: true,
            edit: {
                flagsRange: info.flagsRange, flagsInsertOffset: info.flagsInsertOffset,
                eventMaskRange: info.eventMaskRange, eventMaskInsertOffset: info.eventMaskInsertOffset,
                preservedFlagBits: unknownBits(flags, CHILD_WINDOW_FLAGS),
                preservedEventBits: hasEvent ? unknownBits(eventMask, CHILD_EVENT_MASK_BITS) : 0,
            },
            initial: {
                flags: bitsSet(flags, CHILD_WINDOW_FLAGS),
                eventMaskEnabled: hasEvent,
                eventMask: hasEvent ? bitsSet(eventMask, CHILD_EVENT_MASK_BITS) : [],
                title: addChildWindowTitleArg(info.args),
            },
        };
    },
} as const;

/** Register every composer request on the LSP connection. Call once during server startup. */
export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
