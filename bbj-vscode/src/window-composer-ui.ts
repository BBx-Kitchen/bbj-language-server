/**
 * The one home of the addWindow/addChildWindow title pick and Code Action argument builder
 * (issue #534). Today the title pick exists as three near-identical copies (both VS Code UI
 * modules and the language server's composer-commands.ts), and the Code Action argument builder
 * is duplicated between addwindow-composer-ui.ts and addchildwindow-composer-ui.ts. This module
 * holds both, shared by both VS Code UI modules, the composer-cue click and the language server's
 * decodeCall handlers, and therefore imports nothing from vscode or the webview modules at
 * runtime, so the language server can import it.
 */
import { unknownBits, type FlagItem } from './addwindow-composer.js';

/** Fallback title used when an addWindow call has no string-literal title argument. */
export const WINDOW_TITLE_FALLBACK = '"Window"';
/** Fallback title used when an addChildWindow call has no string-literal title argument. */
export const CHILD_WINDOW_TITLE_FALLBACK = '"Child"';

/** Best-effort pick of the title argument for the preview: the last string-literal arg, or `fallback`. */
export function titleArg(args: readonly string[], fallback: string): string {
    const literal = [...args].reverse().find(a => /^"([^"]|"")*"$/.test(a));
    return literal ?? fallback;
}

/**
 * The subset of AddWindowCallInfo / AddChildWindowCallInfo that {@link windowPanelArgAt} needs.
 * Both call-info types structurally satisfy this shape (they carry these fields plus their own
 * callStart/callEnd), so a `findXCallAt` function can be passed directly as `findCallAt`.
 */
export interface WindowCallInfo {
    args: string[];
    flagsValue?: number;
    flagsRange?: [number, number];
    flagsInsertOffset?: number;
    eventMaskValue?: number;
    eventMaskRange?: [number, number];
    eventMaskInsertOffset?: number;
}

/**
 * The shared shape of AddWindowEditTarget / AddChildWindowEditTarget: where/how to apply an EDIT.
 */
export interface WindowEditTarget {
    uri: string;
    line: number;
    flagsRange?: [number, number];
    flagsInsertOffset?: number;
    eventMaskRange?: [number, number];
    eventMaskInsertOffset?: number;
    preservedFlagBits: number;
    preservedEventBits: number;
}

/**
 * Everything that differs between the addWindow and addChildWindow Code Action helpers.
 * `Extra` is the per-kind fixed-field shape merged into `initial` (e.g. `sysgui` vs.
 * `window`/`id`/`context`).
 */
export interface WindowPanelArgSpec<Extra> {
    findCallAt(lineText: string, character: number): WindowCallInfo | undefined;
    flagCatalog: FlagItem[];
    eventCatalog: FlagItem[];
    describeFlags(mask: number): string;
    titleFallback: string;
    /** Fixed initial fields (geometry/receiver/etc.) merged alongside flags/eventMask/title. */
    fixedInitial: Extra;
    configureLabel: string;
    addLabel: string;
    /**
     * When true, a call with neither a flags value nor a flags-insert slot yields `undefined`
     * (addChildWindow's no-title overloads cannot take flags). addWindow never sets this.
     */
    requireFlagsSlot: boolean;
}

/**
 * Build the target/initial/label triple for the window-composer call at `character` on
 * `lineText`, or `undefined` if there is none to rewrite. Implements exactly the logic the two
 * per-kind helpers used to duplicate: decode the call via `spec.findCallAt`, refuse a
 * no-flags-slot call when `spec.requireFlagsSlot` is set, build the preserved-bit edit target, and
 * pick a configure/add label depending on whether the call already carries a flags value.
 */
export function windowPanelArgAt<Extra>(
    spec: WindowPanelArgSpec<Extra>,
    uri: string, line: number, lineText: string, character: number,
): { arg: { target: WindowEditTarget; initial: { flags: number; eventMask: number | null; title: string } & Extra }; label: string } | undefined {
    const info = spec.findCallAt(lineText, character);
    if (!info) return undefined;
    if (spec.requireFlagsSlot && info.flagsValue === undefined && info.flagsInsertOffset === undefined) return undefined;

    const flags = info.flagsValue ?? 0;
    const eventMask = info.eventMaskValue ?? null;
    const target: WindowEditTarget = {
        uri,
        line,
        flagsRange: info.flagsRange,
        flagsInsertOffset: info.flagsInsertOffset,
        eventMaskRange: info.eventMaskRange,
        eventMaskInsertOffset: info.eventMaskInsertOffset,
        preservedFlagBits: unknownBits(flags, spec.flagCatalog),
        preservedEventBits: eventMask === null ? 0 : unknownBits(eventMask, spec.eventCatalog),
    };
    const initial = {
        flags, eventMask,
        title: titleArg(info.args, spec.titleFallback),
        ...spec.fixedInitial,
    };

    const label = info.flagsValue !== undefined
        ? `${spec.configureLabel} (${spec.describeFlags(flags)})`
        : spec.addLabel;
    return { arg: { target, initial }, label };
}
