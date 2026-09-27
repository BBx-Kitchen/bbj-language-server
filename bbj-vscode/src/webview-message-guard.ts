/**
 * The single owner of the runtime type checks every composer webview panel applies to a message
 * before anything acts on it (issue #604). A webview page is sandboxed but untrusted input to the
 * extension host: the host can apply a `WorkspaceEdit`, send a language-server request, or dispose
 * a panel in response to a `postMessage` payload, so a broken or compromised webview script must
 * not be able to push a wrongly typed value into any of those. Each composer's own `isXxxPanelMessage`
 * guard (declared next to that composer's `Selection` type in its own webview module) is built from
 * the primitives below.
 *
 * Kept free of any runtime dependency — no schema library, no `vscode` import — so it is a plain,
 * unit-testable module shared by every caller.
 */

/** A plain object, as opposed to `null`, an array, or a primitive. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Exact `typeof` string check. */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/** Exact `typeof` boolean check. */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

/** A finite integer: `typeof value === 'number' && Number.isInteger(value)`. Rejects `NaN`,
 * `Infinity`, `-Infinity`, non-integer numbers, and any non-number value (including numeric
 * strings and booleans). Accepts `2.0` because it is numerically an integer. */
export function isFiniteInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value);
}

/** An array whose every element is a string. `[]` passes. */
export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(isString);
}

/** An array whose every element is a finite integer (see {@link isFiniteInt}). `[]` passes. */
export function isIntArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every(isFiniteInt);
}

/** `true` only when `value` is a string that is a member of `list`. */
export function isOneOf<T extends string>(value: unknown, list: readonly T[]): value is T {
    return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** The shape every composer webview's message follows: a `type` discriminator and an optional,
 * type-specific `payload`. */
export type PanelMessage<S> = { type: string; payload?: S };

/** Describes one composer panel's known message shape for {@link isPanelMessage}. */
export interface PanelMessageSpec<S> {
    /** Every `type` value this panel's handler recognizes. */
    readonly types: readonly string[];
    /** The subset of {@link types} that carries a `payload` (e.g. `change`, `insert`, `apply`). */
    readonly payloadTypes: readonly string[];
    /** Whether `value` is a well-formed payload for this panel's `Selection` type. */
    isPayload(value: unknown): value is S;
}

/**
 * `true` only when `msg` is a plain object whose `type` is a known string in `spec.types`, and —
 * for a `type` in `spec.payloadTypes` — either `payload` is entirely absent (still legal; the
 * caller's own `if (msg.payload)` handles that) or `payload` is present and passes
 * `spec.isPayload`. A `payload` of `null` is rejected, since it is present but not a valid
 * payload. A `type` outside `spec.payloadTypes` never looks at `payload` at all.
 *
 * Never throws and never logs (#604, D-02): a caller that gets `false` back simply drops the
 * message with no toast and no console output.
 */
export function isPanelMessage<S>(msg: unknown, spec: PanelMessageSpec<S>): msg is PanelMessage<S> {
    if (!isPlainObject(msg)) {
        return false;
    }
    if (!isString(msg.type) || !spec.types.includes(msg.type)) {
        return false;
    }
    if (!spec.payloadTypes.includes(msg.type)) {
        return true;
    }
    const payload = msg.payload;
    if (payload === undefined) {
        return true;
    }
    if (payload === null) {
        return false;
    }
    return spec.isPayload(payload);
}
