import { AstUtils } from 'langium';
import type { LangiumDocument } from 'langium';
import { Position } from 'vscode-languageserver';
import { isUse } from './generated/ast.js';

/**
 * Position at which to insert a new `use` statement: on the line right after the last existing
 * `use`, or the top of the file when there are none. Shared by the missing-`use` quick-fix and
 * completion-time auto-import (issue #447).
 */
export function useInsertPosition(document: LangiumDocument): Position {
    let line = 0;
    for (const node of AstUtils.streamAllContents(document.parseResult.value)) {
        if (isUse(node) && node.$cstNode) {
            line = Math.max(line, node.$cstNode.range.end.line + 1);
        }
    }
    return Position.create(line, 0);
}
