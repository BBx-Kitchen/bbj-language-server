/**
 * Classifies the text of a BBj document so every diagnostic publisher can agree on which
 * documents are checked at all.
 *
 *  - `'tokenized'`: a compiled/binary program that reached the server as text. It cannot be
 *    parsed or checked, so nothing is reported for it.
 *  - `'line-numbered'`: a classic program with a line number on every statement. It is not
 *    checked either; one hint points the user to the Denumber command instead.
 *  - `'normal'`: everything else, validated and compiler-checked as usual.
 *
 * The rules are the shared ones (`isLineNumberedSource`, the tokenized magic) and are reused here,
 * never re-implemented, so the language server and both IDE clients cannot drift apart.
 */

import { isLineNumberedSource } from '../line-numbering.js';
import { TOKENIZED_BBJ_MAGIC_TEXT } from '../tokenized-bbj.js';

export type DocumentKind = 'tokenized' | 'line-numbered' | 'normal';

/** Code of the single Information diagnostic a line-numbered document carries. */
export const LINE_NUMBERED_DIAGNOSTIC_CODE = 'bbj-line-numbered';

/** Text of the single Information diagnostic a line-numbered document carries. */
export const LINE_NUMBERED_DIAGNOSTIC_MESSAGE =
    'This is a line-numbered BBj program. Use "Denumber BBj Program" to remove the line numbers; it is not checked until then.';

/** Decides whether `text` is a tokenized program, a line-numbered program or ordinary source. */
export function classifyDocumentText(text: string): DocumentKind {
    if (text.startsWith(TOKENIZED_BBJ_MAGIC_TEXT)) {
        return 'tokenized';
    }
    if (isLineNumberedSource(text)) {
        return 'line-numbered';
    }
    return 'normal';
}
