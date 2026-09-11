/**
 * Stale-edit guard for VS Code's two SETOPTS-in-code edit-in-place writers (#475, DISC-06,
 * plan 88-15). The composer panel is a non-modal `ViewColumn.Beside` webview, so the source
 * `.bbj` document stays fully editable for the whole time the panel is open, and the edit range
 * (or hex token range) the panel holds was computed once, at decode time, before the panel ever
 * opened. This module is the check that stands between that captured range and the write: it
 * re-confirms — immediately before `vscode.workspace.applyEdit` runs — that the document is
 * still the one the captured decode described.
 *
 * This is the VS Code counterpart of IntelliJ's `StaleEditGuard`/`DecodeEquality` pair
 * (`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/StaleEditGuard.java` and
 * `DecodeEquality.java`), whose behavioural contract it ports: resolve and snapshot the live
 * document, re-issue the exact same `decodeInCode` request the panel was opened from (bounded by
 * a timeout), compare the whole fresh decode against the captured one, re-check the document
 * version immediately before the write, and only then apply. Every branch is fail-closed.
 *
 * The compose-new (create) flow is deliberately outside this guard, matching the reference
 * guard's own documented exclusion: an insert at the cursor has no captured *range* that can be
 * silently overwritten by someone else's edit, so there is nothing here for this check to
 * protect. Every config.bbx composer caller likewise passes no guard and keeps its current
 * unguarded behaviour.
 */
import * as vscode from 'vscode';
import type { SetOptsInCodeDecodeResult } from './language/setopts-in-code-request.js';

/** Comfortably under a minute, bounding a re-decode that would otherwise hang the Apply forever. */
export const STALE_EDIT_REDECODE_TIMEOUT_MS = 10_000;

/** Shown when the document is provably no longer the one the captured decode described. */
export const STALE_DOCUMENT_MESSAGE =
    'The document changed while the SETOPTS composer was open. Nothing was changed — run the composer again to retry.';

/** Shown when the pre-apply check itself could not complete (rejected, timed out, or the document closed). */
export const STALE_CHECK_FAILED_MESSAGE =
    'The SETOPTS composer could not re-check the document before applying. Nothing was changed — run the composer again to retry.';

/**
 * Everything the pre-apply check needs. `reDecode` must close over the identical params object
 * the panel's own launch request used — never a rebuilt one — so a re-check can never
 * accidentally ask about a different position than the capture did.
 */
export interface SetOptsStaleEditGuard {
    /** The target document's `Uri.toString()` form — the same string the decode request used. */
    uri: string;
    /** The decode result the panel's edit range/hex range was computed from. */
    capturedDecode: SetOptsInCodeDecodeResult;
    /** Re-issues the exact same `decodeInCode` request the panel was opened from. */
    reDecode: () => Promise<SetOptsInCodeDecodeResult | undefined>;
}

function sameAbsolute(
    a: SetOptsInCodeDecodeResult['absolute'], b: SetOptsInCodeDecodeResult['absolute'],
): boolean {
    if (a === undefined || b === undefined) {
        return a === b;
    }
    return a.line === b.line
        && a.hexRange[0] === b.hexRange[0] && a.hexRange[1] === b.hexRange[1]
        && a.hexDigits === b.hexDigits;
}

function sameChain(
    a: SetOptsInCodeDecodeResult['chain'], b: SetOptsInCodeDecodeResult['chain'],
): boolean {
    if (a === undefined || b === undefined) {
        return a === b;
    }
    return a.variableName === b.variableName && a.startLine === b.startLine
        && a.endLine === b.endLine && a.indent === b.indent;
}

/**
 * Order-sensitive on purpose: a reordered selection is itself evidence the underlying document
 * changed shape, and the guard must fail closed rather than assume a reorder is harmless —
 * mirroring `DecodeEquality.sameSetoptsTriStateEntries`'s own documented rule.
 */
function sameEntries(
    a: ReadonlyArray<{ byte: number; mask: number; state: string }>,
    b: ReadonlyArray<{ byte: number; mask: number; state: string }>,
): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i].byte !== b[i].byte || a[i].mask !== b[i].mask || a[i].state !== b[i].state) {
            return false;
        }
    }
    return true;
}

function sameInitial(
    a: SetOptsInCodeDecodeResult['initial'], b: SetOptsInCodeDecodeResult['initial'],
): boolean {
    if (a === undefined || b === undefined) {
        return a === b;
    }
    return sameEntries(a.entries, b.entries);
}

/**
 * Pure field-wise comparison of two `decodeInCode` results — the TypeScript counterpart of the
 * IntelliJ `DecodeEquality.sameSetoptsInCode` contract. Compares `found`, `editable`, `mode`,
 * `reason`, `summary`, then the whole `absolute` payload, the whole `chain` payload and the whole
 * `initial` tri-state selection. Array-valued fields (`hexRange`, `initial.entries`) are compared
 * element-wise, never by reference: a fresh re-decode never returns the same array instance as
 * the captured one, so reference equality would report every re-decode as a mismatch and turn
 * this guard into a permanent refusal. The `initial.entries` comparison is order-sensitive on
 * purpose — see {@link sameEntries}.
 */
export function sameSetOptsInCodeDecode(
    a: SetOptsInCodeDecodeResult, b: SetOptsInCodeDecodeResult,
): boolean {
    return a.found === b.found
        && a.editable === b.editable
        && a.mode === b.mode
        && a.reason === b.reason
        && a.summary === b.summary
        && sameAbsolute(a.absolute, b.absolute)
        && sameChain(a.chain, b.chain)
        && sameInitial(a.initial, b.initial);
}

/** Reads only already-open documents and never opens a path from a string. */
function documentVersion(uri: string): number | undefined {
    return vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri)?.version;
}

/** Races `pending` against a rejecting timer, always clearing the timer so a resolved check never leaves one pending. */
function withTimeout<T>(pending: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('SETOPTS composer re-decode timed out')), ms);
    });
    return Promise.race([pending, timeout]).finally(() => {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    });
}

/**
 * The pre-apply check itself. Body, in this order and no other — the order is the mitigation:
 *
 * 1. `guard === undefined` — an unguarded caller (compose-new, and every config.bbx caller):
 *    apply immediately, no request, no message, no behaviour change.
 * 2. Snapshot the target document's current version. Absent from `vscode.workspace.textDocuments`
 *    means the target document is no longer open — a stale document: refuse with
 *    {@link STALE_DOCUMENT_MESSAGE}, no request issued.
 * 3. Re-issue the guard's `reDecode`, bounded by `timeoutMs`. Any throw, rejection or timeout
 *    refuses with {@link STALE_CHECK_FAILED_MESSAGE}; the rejection never escapes this function.
 * 4. Compare the fresh decode against the captured one field-wise. A missing or unequal decode
 *    refuses with {@link STALE_DOCUMENT_MESSAGE}.
 * 5. Re-check the document version against the step-2 snapshot — closing the window between the
 *    re-decode completing and the write starting, the VS Code counterpart of the reference
 *    guard's modification-stamp re-check inside its write command. A change refuses with
 *    {@link STALE_DOCUMENT_MESSAGE}.
 * 6. Apply, and resolve `true`.
 */
export async function applyIfUnchanged(
    guard: SetOptsStaleEditGuard | undefined,
    applyEdit: () => Thenable<unknown>,
    timeoutMs: number = STALE_EDIT_REDECODE_TIMEOUT_MS,
): Promise<boolean> {
    if (guard === undefined) {
        await applyEdit();
        return true;
    }

    const snapshotVersion = documentVersion(guard.uri);
    if (snapshotVersion === undefined) {
        vscode.window.showWarningMessage(STALE_DOCUMENT_MESSAGE);
        return false;
    }

    let fresh: SetOptsInCodeDecodeResult | undefined;
    try {
        fresh = await withTimeout(guard.reDecode(), timeoutMs);
    } catch {
        vscode.window.showWarningMessage(STALE_CHECK_FAILED_MESSAGE);
        return false;
    }

    if (!fresh || !sameSetOptsInCodeDecode(guard.capturedDecode, fresh)) {
        vscode.window.showWarningMessage(STALE_DOCUMENT_MESSAGE);
        return false;
    }

    if (documentVersion(guard.uri) !== snapshotVersion) {
        vscode.window.showWarningMessage(STALE_DOCUMENT_MESSAGE);
        return false;
    }

    await applyEdit();
    return true;
}
