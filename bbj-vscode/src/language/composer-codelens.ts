/**
 * `BBjComposerCodeLensProvider` — the server-side `textDocument/codeLens` source for composer
 * cues (#650): a plain-text `Compose addWindow` cue on every `addWindow(...)` call in code.
 *
 * The provider reads only the text and CST the document build already produced (Roadmap Success
 * Criterion 5): it calls no parser, no `DocumentBuilder` method and no workspace scan, and it
 * takes no caret or selection input, so a cue appears on every eligible call regardless of
 * where the cursor is.
 *
 * Applicability is decided entirely by the existing `findAddWindowCalls` detector — this module
 * adds no new addWindow pattern.
 */
import { CstUtils, type LangiumDocument } from 'langium';
import type { CodeLensProvider } from 'langium/lsp';
import type { CodeLens } from 'vscode-languageserver';
import { findAddWindowCalls } from '../addwindow-composer.js';
import {
    COMPOSER_LENS_COMMAND, COMPOSER_LENS_TITLES,
    type ComposerLensKind, type ComposerLensTarget,
} from '../composer-lens-contract.js';

/** Token type names of the grammar's comment and string terminals (bbj.langium). */
const NON_CODE_TOKEN_NAMES = new Set(['COMMENT', 'STRING_LITERAL']);

/** One composer call found on the document, before it is turned into an LSP `CodeLens`. */
export interface ComposerLensCandidate {
    kind: ComposerLensKind;
    line: number;
    start: number;
    end: number;
    character: number;
}

/**
 * Everything a detector needs to scan a document for composer cues. An interface (not a
 * concrete type) so later detectors can add optional members without changing call sites.
 */
export interface ComposerLensScanContext {
    lines: string[];
    /** True when the offset at `line`/`character` is real code — false inside a comment or string. */
    isCode(line: number, character: number): boolean;
}

/** Scan every line for addWindow calls in code, reusing the existing applicability detector. */
export function collectComposerLensCandidates(ctx: ComposerLensScanContext): ComposerLensCandidate[] {
    const candidates: ComposerLensCandidate[] = [];
    for (let line = 0; line < ctx.lines.length; line++) {
        const calls = findAddWindowCalls(ctx.lines[line]);
        for (const call of calls) {
            if (!ctx.isCode(line, call.callStart)) {
                continue;
            }
            candidates.push({
                kind: 'addwindow',
                line,
                start: call.callStart,
                end: call.callEnd,
                character: call.callStart,
            });
        }
    }
    return candidates;
}

/**
 * Turn scanned candidates into LSP `CodeLens` entries: stable-sorted by line then start
 * character, with an ` (i/n)` suffix when more than one candidate of the same kind shares a line,
 * in source order.
 */
export function toComposerCodeLenses(uri: string, candidates: ComposerLensCandidate[]): CodeLens[] {
    const sorted = [...candidates].sort((a, b) => a.line - b.line || a.start - b.start);

    // Count same-kind candidates per line so a suffix is added only when more than one exists.
    const perLineKindCount = new Map<string, number>();
    for (const c of sorted) {
        const key = `${c.line}:${c.kind}`;
        perLineKindCount.set(key, (perLineKindCount.get(key) ?? 0) + 1);
    }
    const perLineKindSeen = new Map<string, number>();

    return sorted.map((candidate) => {
        const key = `${candidate.line}:${candidate.kind}`;
        const total = perLineKindCount.get(key) ?? 1;
        const seen = (perLineKindSeen.get(key) ?? 0) + 1;
        perLineKindSeen.set(key, seen);

        const baseTitle = COMPOSER_LENS_TITLES[candidate.kind];
        const title = total > 1 ? `${baseTitle} (${seen}/${total})` : baseTitle;

        const target: ComposerLensTarget = {
            kind: candidate.kind,
            uri,
            line: candidate.line,
            character: candidate.character,
        };

        return {
            range: {
                start: { line: candidate.line, character: candidate.start },
                end: { line: candidate.line, character: candidate.end },
            },
            command: {
                title,
                command: COMPOSER_LENS_COMMAND,
                arguments: [target],
            },
        };
    });
}

/**
 * The Langium `CodeLensProvider` registered in `bbj-module.ts`. Takes no caret input, calls no
 * parser or `DocumentBuilder` method, and only reads text and CST already on the document.
 */
export class BBjComposerCodeLensProvider implements CodeLensProvider {
    provideCodeLens(document: LangiumDocument): CodeLens[] {
        const text = document.textDocument.getText();
        const lines = text.split(/\r?\n/);
        const root = document.parseResult.value.$cstNode;

        const isCode = (line: number, character: number): boolean => {
            if (!root) {
                return true;
            }
            const offset = document.textDocument.offsetAt({ line, character });
            const leaf = CstUtils.findLeafNodeAtOffset(root, offset);
            if (!leaf) {
                return true;
            }
            return !NON_CODE_TOKEN_NAMES.has(leaf.tokenType.name);
        };

        const candidates = collectComposerLensCandidates({ lines, isCode });
        return toComposerCodeLenses(document.uri.toString(), candidates);
    }
}
