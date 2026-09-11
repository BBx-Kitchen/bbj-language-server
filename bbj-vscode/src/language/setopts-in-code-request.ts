/**
 * `bbj/composer/setopts/decodeInCode` and `bbj/composer/setopts/composeTriState` request
 * handlers: the document-aware SETOPTS-in-code requests both IDE clients drive (#475, DISC-06,
 * plan 88-03).
 *
 * Every existing `bbj/composer/.../decodeCall` handler (`composer-commands.ts`) takes a single
 * line of text — the in-code decode needs multi-statement document context instead, so it
 * cannot join `composerHandlers`: that object is registered in `main.ts` BEFORE
 * `createBBjServices` runs, and its handlers receive only plain JSON with no document access.
 * This module follows `compile-command.ts`/`resolved-config-path-request.ts`'s precedent
 * instead: a named method constant, a `Deps` interface, a `createXHandlers(deps)` factory and a
 * `registerXRequests(connection, deps)` wiring function, registered in `main.ts` AFTER the
 * services exist (see `main.ts`'s own comment at that call site).
 *
 * `decodeInCode` resolves the target through the exact same `setoptsHoverTarget` +
 * `detectSetOptsShape` pair the hover uses (`bbj-hover.ts`), so hover and edit gating can never
 * disagree: `editable` is derived directly from the scanner's own safety verdict, never
 * re-decided here (T-88-01). `composeTriState` is a thin pass-through to
 * `composeSetOptsBlock` — it adds no arithmetic of its own, the same single-source-of-truth
 * convention `composer-commands.ts` already documents for its own handlers.
 */
import type { Connection } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import type { CstNode, LangiumDocument } from 'langium';
import { findLeafNodeAtOffset } from './bbj-validator.js';
import { isLetStatement, isSetOptsStatement } from './generated/ast.js';
import {
    detectSetOptsShape, setoptsHoverMarkdown, setoptsHoverTarget, UNSAFE_REASON_TEXT,
} from './setopts-code-scanner.js';
import {
    composeSetOptsBlock, triStateFromChainEffect, type SetOptsTriStateSelection,
} from '../setopts-catalog.js';
import { END_OF_LINE_CHARACTER } from './lsp-position.js';

/** The LSP custom-request method name for the document-aware SETOPTS-in-code decode. */
export const SETOPTS_DECODE_IN_CODE_METHOD = 'bbj/composer/setopts/decodeInCode';
/** The LSP custom-request method name for the tri-state compose-new/edit-in-place codegen. */
export const SETOPTS_COMPOSE_TRISTATE_METHOD = 'bbj/composer/setopts/composeTriState';

/** Params for {@link SETOPTS_DECODE_IN_CODE_METHOD}: a document URI plus a zero-based LSP position. */
export interface SetOptsInCodeDecodeParams {
    uri: string;
    line: number;
    character: number;
}

/** The edit target for an absolute `SETOPTS <literal>` statement. */
export interface SetOptsInCodeAbsoluteEdit {
    /** 0-based document line the literal sits on. */
    line: number;
    /** [start, end) character range of the literal token, WITHIN that line. */
    hexRange: [number, number];
    /** The canonical uppercase hex digits the literal decodes to. */
    hexDigits: string;
}

/** The edit target for a safe `var$=OPTS … SETOPTS var$` chain. */
export interface SetOptsInCodeChainEdit {
    variableName: string;
    /** 0-based document line of the first reassignment statement (half-open range start). */
    startLine: number;
    /** 0-based document line of the `SETOPTS` statement (half-open range end, exclusive). */
    endLine: number;
    /** Leading whitespace of the reassignment region's first line (or the `SETOPTS` line when empty). */
    indent: string;
}

/** Result of a {@link SETOPTS_DECODE_IN_CODE_METHOD} request. */
export interface SetOptsInCodeDecodeResult {
    found: boolean;
    editable: boolean;
    mode: 'absolute' | 'chain' | 'none';
    /** Why `editable` is `false` for a `found: true, mode: 'chain'` result — reuses the exact
     * wording {@link UNSAFE_REASON_TEXT} already gives the hover, never a second inline string. */
    reason?: string;
    /** The hover's own decode text, for a client that wants to show it alongside the edit UI. */
    summary?: string;
    absolute?: SetOptsInCodeAbsoluteEdit;
    chain?: SetOptsInCodeChainEdit;
    /** Prefill tri-state selection for a safe chain's edit-in-place composer. */
    initial?: SetOptsTriStateSelection;
}

/** Params for {@link SETOPTS_COMPOSE_TRISTATE_METHOD} — mirrors `composeSetOptsBlock`'s own input shape exactly. */
export interface SetOptsComposeTriStateParams {
    selection: SetOptsTriStateSelection;
    variable?: string;
    indent?: string;
    scope?: 'block' | 'reassignments';
}

/** Result of {@link SETOPTS_COMPOSE_TRISTATE_METHOD} — mirrors `composeSetOptsBlock`'s own output shape. */
export interface SetOptsComposeTriStateResult {
    lines: string[];
    text: string;
}

/**
 * Structural dependency the decode handler needs, kept minimal and interface-based so the
 * handler is unit-testable with a plain stub and there is no circular import back to
 * `bbj-module.ts`. Deliberately exposes only `getDocument` (the already-open in-memory
 * document) — never `getOrCreateDocument` — so a client can never make the server load an
 * arbitrary filesystem path (T-88-08).
 */
export interface SetOptsInCodeDeps {
    documents: {
        getDocument(uri: URI): LangiumDocument | undefined;
    };
}

const NOT_FOUND: SetOptsInCodeDecodeResult = { found: false, editable: false, mode: 'none' };

/** Leading whitespace of the given 0-based document line. */
function lineIndent(document: LangiumDocument, lineNumber: number): string {
    const text = document.textDocument.getText({
        start: { line: lineNumber, character: 0 },
        end: { line: lineNumber, character: END_OF_LINE_CHARACTER },
    });
    return /^[ \t]*/.exec(text)?.[0] ?? '';
}

/**
 * Why a *decodable* `chain` shape is still not edit-eligible. This is never a decode verdict —
 * the scanner (`traceOptsChain`) remains the single source of truth for whether a chain is
 * safe; this module adds exactly one further, independent gate on top: whether the resulting
 * edit can be expressed as a whole-line region the chain owns outright. The hover must keep
 * showing a line-sharing chain's real accumulated effect per DISC-05, while the edit gate closes
 * per DISC-06 and D-04. This reason deliberately does NOT live in `SetOptsUnsafeReason` /
 * `UNSAFE_REASON_TEXT`: `setopts-code-scanner.test.ts`'s exhaustiveness test ties
 * `UNSAFE_REASON_TEXT`'s key count to the reasons `traceOptsChain` itself emits, and this reason
 * is never emitted by `traceOptsChain` — it would be both wrong and untestable there.
 */
export type SetOptsNotEditableReason = 'shared-line';

/** Single source of truth for {@link SetOptsNotEditableReason}'s user-facing sentence, mirroring
 * `UNSAFE_REASON_TEXT`'s own convention. */
export const NOT_EDITABLE_REASON_TEXT: Record<SetOptsNotEditableReason, string> = {
    'shared-line': "one of this chain's statements shares its physical line with other code, "
        + 'so the reassignment block cannot be rewritten without touching code outside the chain',
};

/**
 * The line of the given CST node's LAST character — never the position one past its end, so a
 * node whose text happens to carry a trailing line break (e.g. a `CommentStatement`'s `COMMENT`
 * token, which the grammar's terminal optionally captures through) cannot inflate a computed
 * region by a line.
 */
function lastLineOf(document: LangiumDocument, cst: CstNode): number {
    return document.textDocument.positionAt(cst.offset + Math.max(cst.length - 1, 0)).line;
}

/**
 * `;` is BBj's own statement separator and therefore the only non-whitespace character a
 * chain's edit region may contain outside its own reassignment statements. Anything else in the
 * residue — an unrelated statement sharing a reassignment's line, a `CommentStatement` from a
 * trailing or interleaved `REM`, a stray expression — means the region is not the chain's to
 * rewrite.
 */
const REGION_RESIDUE_SHAPE = /^[\s;]*$/;

/**
 * Whether the document text of the half-open `[startLine, endLine)` region contains nothing but
 * `spans` (each an `[offset, offset+length)` range over the document, order-independent),
 * whitespace and `;` separators.
 */
function regionOwnedExclusively(
    document: LangiumDocument, startLine: number, endLine: number,
    spans: ReadonlyArray<{ offset: number; length: number }>,
): boolean {
    const regionStart = document.textDocument.offsetAt({ line: startLine, character: 0 });
    const regionEnd = document.textDocument.offsetAt({ line: endLine, character: 0 });
    const fullText = document.textDocument.getText();
    const sorted = [...spans].sort((a, b) => a.offset - b.offset);
    let cursor = regionStart;
    let residue = '';
    for (const span of sorted) {
        const spanStart = Math.max(span.offset, regionStart);
        const spanEnd = Math.min(span.offset + span.length, regionEnd);
        if (spanStart > cursor) {
            residue += fullText.slice(cursor, spanStart);
        }
        cursor = Math.max(cursor, spanEnd);
    }
    if (cursor < regionEnd) {
        residue += fullText.slice(cursor, regionEnd);
    }
    return REGION_RESIDUE_SHAPE.test(residue);
}

/**
 * Build the `bbj/composer/setopts/decodeInCode` request handler. Resolves the document with
 * `deps.documents.getDocument` only (no filesystem read), finds the leaf CST node at the given
 * position, and runs it through the exact `setoptsHoverTarget`/`detectSetOptsShape` pair the
 * hover uses — `editable` is assigned directly from the scanner's own verdict, never re-decided
 * here. Any missing document, unresolvable leaf, or undetected shape returns {@link NOT_FOUND}
 * rather than throwing — this handler never raises on a malformed or out-of-range position.
 */
export function createDecodeInCodeHandler(deps: SetOptsInCodeDeps): (params: SetOptsInCodeDecodeParams) => SetOptsInCodeDecodeResult {
    return (params: SetOptsInCodeDecodeParams): SetOptsInCodeDecodeResult => {
        const document = deps.documents.getDocument(URI.parse(params.uri));
        const rootNode = document?.parseResult?.value?.$cstNode;
        if (!document || !rootNode) {
            return NOT_FOUND;
        }
        const offset = document.textDocument.offsetAt({ line: params.line, character: params.character });
        const leaf = findLeafNodeAtOffset(rootNode, offset);
        if (!leaf) {
            return NOT_FOUND;
        }
        const target = setoptsHoverTarget(leaf);
        if (!target) {
            return NOT_FOUND;
        }
        const shape = detectSetOptsShape(target);
        if (!shape || !isSetOptsStatement(target)) {
            // A bare IOR/AND call (mask-call) resolves to a hover shape but is never itself an
            // edit-in-place target — decodeInCode's edit gate only ever opens for the two
            // statically-safe SetOptsStatement shapes named by DISC-06 (D-04).
            return NOT_FOUND;
        }
        const summary = setoptsHoverMarkdown(shape);

        if (shape.kind === 'absolute') {
            const cst = target.opts.$cstNode;
            if (!cst) {
                return NOT_FOUND;
            }
            const line = document.textDocument.positionAt(cst.offset).line;
            const lineStart = document.textDocument.offsetAt({ line, character: 0 });
            const hexRange: [number, number] = [cst.offset - lineStart, cst.offset + cst.length - lineStart];
            return {
                found: true,
                editable: true,
                mode: 'absolute',
                summary,
                absolute: { line, hexRange, hexDigits: shape.hexDigits },
            };
        }

        if (shape.kind === 'chain') {
            if (!shape.safe) {
                return {
                    found: true,
                    editable: false,
                    mode: 'chain',
                    reason: shape.unsafeReason ? UNSAFE_REASON_TEXT[shape.unsafeReason] : undefined,
                    summary,
                };
            }
            const setoptsCst = target.$cstNode;
            const originCst = shape.originNode?.$cstNode;
            if (!setoptsCst || !originCst) {
                // A safe chain must always carry both nodes — fail closed rather than guess a
                // possibly-wrong edit range (the "never touch what you can't round-trip" rule).
                return NOT_FOUND;
            }

            const notEditable = (): SetOptsInCodeDecodeResult => ({
                found: true,
                editable: false,
                mode: 'chain',
                reason: NOT_EDITABLE_REASON_TEXT['shared-line'],
                summary,
            });

            // The invariant this region computation guarantees: the half-open
            // `[startLine, endLine)` region contains the chain's reassignment statements,
            // whitespace and `;` separators and nothing else, so a whole-line replace of it can
            // neither delete code the chain does not own nor leave a superseded reassignment
            // behind.
            const setoptsStartLine = document.textDocument.positionAt(setoptsCst.offset).line;
            const originEndLine = lastLineOf(document, originCst);

            const linkStatements = shape.linkStatementNodes;
            if (!linkStatements || linkStatements.length !== shape.links.length) {
                // A structural anomaly the scanner should never produce for a safe chain — fail
                // closed the same way as the missing-CST guard above, not as a user-facing reason.
                return NOT_FOUND;
            }
            const linkCsts: CstNode[] = [];
            for (const stmt of linkStatements) {
                const cst = stmt.$cstNode;
                if (!cst) {
                    return NOT_FOUND;
                }
                // A comma-joined `LET A$=IOR(A$,$08$),B$="x"` is a single statement the scanner
                // legitimately calls safe, but its whole text cannot be replaced without
                // destroying `B$="x"` — only a single-assignment LetStatement's whole text can be
                // safely replaced.
                if (!isLetStatement(stmt) || stmt.assignments.length !== 1) {
                    return notEditable();
                }
                linkCsts.push(cst);
            }

            let startLine: number;
            let endLine: number;
            if (linkCsts.length === 0) {
                // Zero-link chain: the region is a pure insertion point at the start of the
                // SETOPTS line. Inserting there is always non-destructive and always lands after
                // the origin; when the origin and SETOPTS share a line there is no such point —
                // exactly the inverted-range case.
                if (!(originEndLine < setoptsStartLine)) {
                    return notEditable();
                }
                startLine = setoptsStartLine;
                endLine = setoptsStartLine;
            } else {
                startLine = Math.min(...linkCsts.map(cst => document.textDocument.positionAt(cst.offset).line));
                endLine = Math.max(...linkCsts.map(cst => lastLineOf(document, cst))) + 1;
                if (!(originEndLine < startLine) || !(endLine <= setoptsStartLine)) {
                    return notEditable();
                }
                const spans = linkCsts.map(cst => ({ offset: cst.offset, length: cst.length }));
                if (!regionOwnedExclusively(document, startLine, endLine, spans)) {
                    return notEditable();
                }
            }

            // Structural backstop: unreachable given the requirements above, kept so no future
            // refactor can hand either writer an inverted range.
            if (startLine > endLine) {
                return NOT_FOUND;
            }

            return {
                found: true,
                editable: true,
                mode: 'chain',
                summary,
                chain: { variableName: shape.variableName, startLine, endLine, indent: lineIndent(document, startLine) },
                initial: triStateFromChainEffect(shape.effect),
            };
        }

        // shape.kind === 'mask-call' — not an edit-in-place target for decodeInCode.
        return NOT_FOUND;
    };
}

/**
 * Build the `bbj/composer/setopts/composeTriState` request handler — a thin pass-through to
 * `composeSetOptsBlock`, adding no arithmetic of its own.
 */
export function createComposeTriStateHandler(): (params: SetOptsComposeTriStateParams) => SetOptsComposeTriStateResult {
    return (params: SetOptsComposeTriStateParams): SetOptsComposeTriStateResult => composeSetOptsBlock(params);
}

/**
 * The SETOPTS-in-code request handlers, keyed by LSP method. Exported (not just wired) so they
 * can be unit-tested directly without a live LSP connection.
 */
export function createSetOptsInCodeHandlers(deps: SetOptsInCodeDeps): Record<string, (params: never) => unknown> {
    return {
        [SETOPTS_DECODE_IN_CODE_METHOD]: createDecodeInCodeHandler(deps),
        [SETOPTS_COMPOSE_TRISTATE_METHOD]: createComposeTriStateHandler(),
    };
}

/** Register both SETOPTS-in-code requests on the LSP connection. Call once during server startup. */
export function registerSetOptsInCodeRequests(connection: Pick<Connection, 'onRequest'>, deps: SetOptsInCodeDeps): void {
    for (const [method, handler] of Object.entries(createSetOptsInCodeHandlers(deps))) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
