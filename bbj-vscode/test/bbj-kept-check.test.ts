import { DocumentValidator, URI } from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { afterEach, describe, expect, test } from 'vitest';
import {
    MAX_RECORDED_CHANGE_BATCHES,
    clearAllContentChanges,
    clearContentChanges,
    composeWithKeptCheck,
    contentChangesSince,
    createChangeRecordingTextDocumentsConfiguration,
    mapLineThroughBatches,
    mapLineThroughChange,
    mapRangeThroughBatches,
    pruneContentChangesThrough,
    recordContentChanges,
    wholeDocumentChangeAsRange,
    type ContentChangeBatch,
    type KeptCheck,
    type RangedContentChange
} from '../src/language/bbj-kept-check.js';
import {
    DOWNGRADED_SYNTAX_CODE,
    reconcileWithVerdict,
    syntaxComplaintKey,
    textLineLookup
} from '../src/language/bbj-diagnostic-reconciliation.js';

/** A diagnostic spanning `line` to `endLine`, in the style of
 * `bbj-diagnostic-reconciliation.test.ts`'s own `makeDiag`. */
function makeDiag(
    line: number,
    endLine: number,
    severity: DiagnosticSeverity,
    code: string | undefined,
    source: string,
    message: string
): Diagnostic {
    const range: Range = { start: { line, character: 0 }, end: { line: endLine, character: 999 } };
    const diagnostic: Diagnostic = { range, severity, message, source };
    if (code !== undefined) {
        diagnostic.data = { code };
    }
    return diagnostic;
}

/** A ranged change replacing every line from `startLine` up to (not including) `endLineExclusive`
 * with `text`, column 0 to column 0 -- the same idiom `replaceLines` in
 * `fake-text-document-connection.ts` uses. */
function replaceLines(startLine: number, endLineExclusive: number, text: string): RangedContentChange {
    return {
        range: { start: { line: startLine, character: 0 }, end: { line: endLineExclusive, character: 0 } },
        text
    };
}

/** A zero-width ranged change inserting `text` at `line`/`character`. */
function insertAt(line: number, character: number, text: string): RangedContentChange {
    const position = { line, character };
    return { range: { start: position, end: position }, text };
}

/** A ranged change replacing `[startLine,startChar)` through `[endLine,endChar)` with `text`. */
function replaceRange(startLine: number, startChar: number, endLine: number, endChar: number, text: string): RangedContentChange {
    return { range: { start: { line: startLine, character: startChar }, end: { line: endLine, character: endChar } }, text };
}

afterEach(() => {
    clearAllContentChanges();
});

describe('mapLineThroughChange', () => {
    test('a line before the change stays', () => {
        expect(mapLineThroughChange(0, insertAt(5, 0, 'x\n'))).toBe(0);
    });

    test('inserting two lines above shifts a later line by 2', () => {
        expect(mapLineThroughChange(5, insertAt(0, 0, 'a\nb\n'))).toBe(7);
    });

    test('deleting one line above shifts a later line up by 1', () => {
        expect(mapLineThroughChange(5, replaceLines(0, 1, ''))).toBe(4);
    });

    test('pressing Enter at column 0 of the line moves it to L+1', () => {
        expect(mapLineThroughChange(3, insertAt(3, 0, '\n'))).toBe(4);
    });

    test('typing inside the line keeps L', () => {
        expect(mapLineThroughChange(3, replaceRange(3, 2, 3, 2, 'x'))).toBe(3);
    });

    test("replacing the line's whole content keeps L", () => {
        expect(mapLineThroughChange(3, replaceRange(3, 0, 3, 5, 'new text'))).toBe(3);
    });

    test('splitting the line at a column above 0 keeps L', () => {
        expect(mapLineThroughChange(3, replaceRange(3, 4, 3, 4, '\nrest'))).toBe(3);
    });

    test('backspace at column 0 of the line moves it to L-1', () => {
        expect(mapLineThroughChange(4, replaceRange(3, 5, 4, 0, ''))).toBe(3);
    });

    test('deleting the line break at the end of the line keeps L', () => {
        expect(mapLineThroughChange(3, replaceRange(3, 5, 4, 0, ''))).toBe(3);
    });

    test('deleting the line with range (L,0)-(L+1,0) drops it', () => {
        expect(mapLineThroughChange(3, replaceLines(3, 4, ''))).toBeUndefined();
    });

    test('deleting the last line with range (L-1,len)-(L,len) drops it', () => {
        expect(mapLineThroughChange(4, replaceRange(3, 5, 4, 5, ''))).toBeUndefined();
    });

    test('deleting a block that contains it drops it', () => {
        expect(mapLineThroughChange(4, replaceLines(2, 7, ''))).toBeUndefined();
    });

    test('a change without a range returns undefined', () => {
        expect(mapLineThroughChange(3, { text: 'whole document' })).toBeUndefined();
    });
});

describe('mapLineThroughBatches', () => {
    test('several changes in one batch apply in order', () => {
        const batch: ContentChangeBatch = {
            fromVersion: 1,
            toVersion: 2,
            changes: [insertAt(0, 0, 'a\n'), insertAt(0, 0, 'b\n')]
        };
        // Line 0 (before both inserts) shifts by 2, since each insert lands at line 0 and pushes
        // the target line down by one, in the order the changes are given.
        expect(mapLineThroughBatches(0, [batch])).toBe(2);
    });

    test('several batches fold in order', () => {
        const batches: ContentChangeBatch[] = [
            { fromVersion: 1, toVersion: 2, changes: [insertAt(0, 0, 'a\n')] },
            { fromVersion: 2, toVersion: 3, changes: [insertAt(0, 0, 'b\n')] }
        ];
        expect(mapLineThroughBatches(0, batches)).toBe(2);
    });

    test('mapping twice with the same batches gives the same result', () => {
        const batches: ContentChangeBatch[] = [{ fromVersion: 1, toVersion: 2, changes: [insertAt(0, 0, 'a\n')] }];
        expect(mapLineThroughBatches(5, batches)).toBe(mapLineThroughBatches(5, batches));
    });

    test('a dropped line short-circuits the rest of the batches', () => {
        const batches: ContentChangeBatch[] = [
            { fromVersion: 1, toVersion: 2, changes: [replaceLines(3, 4, '')] },
            { fromVersion: 2, toVersion: 3, changes: [insertAt(0, 0, 'a\n')] }
        ];
        expect(mapLineThroughBatches(3, batches)).toBeUndefined();
    });
});

describe('mapRangeThroughBatches', () => {
    test('keeps the start and end characters', () => {
        const batches: ContentChangeBatch[] = [{ fromVersion: 1, toVersion: 2, changes: [insertAt(0, 0, 'a\n')] }];
        const range = { start: { line: 2, character: 3 }, end: { line: 2, character: 9 } };
        expect(mapRangeThroughBatches(range, batches)).toEqual({
            start: { line: 3, character: 3 },
            end: { line: 3, character: 9 }
        });
    });

    test('undefined when the start line is dropped', () => {
        const batches: ContentChangeBatch[] = [{ fromVersion: 1, toVersion: 2, changes: [replaceLines(2, 3, '')] }];
        const range = { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } };
        expect(mapRangeThroughBatches(range, batches)).toBeUndefined();
    });

    test('collapses a dropped end line onto the new start line', () => {
        const batches: ContentChangeBatch[] = [{ fromVersion: 1, toVersion: 2, changes: [replaceLines(3, 5, '') /* drops lines 3 and 4 */] }];
        const range = { start: { line: 2, character: 1 }, end: { line: 4, character: 7 } };
        const mapped = mapRangeThroughBatches(range, batches);
        // Line 2 stays 2 (before the deleted block); line 4 was dropped, so the end collapses
        // onto the mapped start line, keeping its own original character.
        expect(mapped).toEqual({ start: { line: 2, character: 1 }, end: { line: 2, character: 7 } });
    });
});

describe('wholeDocumentChangeAsRange', () => {
    test('identical texts give a change that moves no line', () => {
        const text = 'a\nb\nc\n';
        const change = wholeDocumentChangeAsRange(text, text);
        for (const line of [0, 1, 2, 3]) {
            expect(mapLineThroughChange(line, change)).toBe(line);
        }
    });

    test('one changed middle line maps the lines above and below to themselves', () => {
        const oldText = 'a\nb\nc\n';
        const newText = 'a\nB\nc\n';
        const change = wholeDocumentChangeAsRange(oldText, newText);
        expect(mapLineThroughChange(0, change)).toBe(0);
        expect(mapLineThroughChange(2, change)).toBe(2);
    });

    test('appended lines leave earlier lines in place', () => {
        const oldText = 'a\n';
        const newText = 'a\nb\n';
        const change = wholeDocumentChangeAsRange(oldText, newText);
        expect(mapLineThroughChange(0, change)).toBe(0);
    });
});

describe('contentChangesSince', () => {
    const uri = URI.file('/proj/change-log.bbj');

    test('equal versions give []', () => {
        expect(contentChangesSince(uri, 3, 3)).toEqual([]);
    });

    test('a complete chain gives its batches in order', () => {
        recordContentChanges(uri, 1, 2, [insertAt(0, 0, 'a\n')]);
        recordContentChanges(uri, 2, 3, [insertAt(0, 0, 'b\n')]);
        const result = contentChangesSince(uri, 1, 3);
        expect(result).toHaveLength(2);
        expect(result![0].fromVersion).toBe(1);
        expect(result![1].fromVersion).toBe(2);
    });

    test('a missing middle batch gives undefined', () => {
        recordContentChanges(uri, 1, 2, [insertAt(0, 0, 'a\n')]);
        recordContentChanges(uri, 3, 4, [insertAt(0, 0, 'c\n')]);
        expect(contentChangesSince(uri, 1, 4)).toBeUndefined();
    });

    test('after pruning through version v, a request from a version before v gives undefined', () => {
        recordContentChanges(uri, 1, 2, [insertAt(0, 0, 'a\n')]);
        recordContentChanges(uri, 2, 3, [insertAt(0, 0, 'b\n')]);
        pruneContentChangesThrough(uri, 2);
        expect(contentChangesSince(uri, 1, 3)).toBeUndefined();
        expect(contentChangesSince(uri, 2, 3)).toHaveLength(1);
    });

    test('past MAX_RECORDED_CHANGE_BATCHES the oldest start version gives undefined', () => {
        for (let v = 0; v <= MAX_RECORDED_CHANGE_BATCHES; v++) {
            recordContentChanges(uri, v, v + 1, [insertAt(0, 0, 'a\n')]);
        }
        // The very first batch (fromVersion 0) has been pushed out by the cap.
        expect(contentChangesSince(uri, 0, 1)).toBeUndefined();
        // The oldest surviving batch still chains through.
        expect(contentChangesSince(uri, 1, 2)).toHaveLength(1);
    });

    test('clearContentChanges empties one uri only', () => {
        const otherUri = URI.file('/proj/other.bbj');
        recordContentChanges(uri, 1, 2, [insertAt(0, 0, 'a\n')]);
        recordContentChanges(otherUri, 1, 2, [insertAt(0, 0, 'b\n')]);
        clearContentChanges(uri);
        expect(contentChangesSince(uri, 1, 2)).toBeUndefined();
        expect(contentChangesSince(otherUri, 1, 2)).toHaveLength(1);
    });
});

describe('createChangeRecordingTextDocumentsConfiguration', () => {
    test("the recording configuration's update gives the same text and version as TextDocument.update and records exactly one batch per call", () => {
        const uri = URI.file('/proj/recording.bbj').toString();
        const configuration = createChangeRecordingTextDocumentsConfiguration();

        const recorded = configuration.create(uri, 'bbj', 1, 'x = 1\ny = 2\n');
        const plain = TextDocument.create(uri, 'bbj', 1, 'x = 1\ny = 2\n');

        const change = insertAt(0, 0, 'rem added\n');
        const updatedRecorded = configuration.update(recorded, [change], 2);
        const updatedPlain = TextDocument.update(plain, [change], 2);

        expect(updatedRecorded.getText()).toBe(updatedPlain.getText());
        expect(updatedRecorded.version).toBe(updatedPlain.version);

        const batches = contentChangesSince(uri, 1, 2);
        expect(batches).toHaveLength(1);
        expect(batches![0].changes).toEqual([change]);
    });

    test('a whole-document change is recorded as a ranged change', () => {
        const uri = URI.file('/proj/recording-full.bbj').toString();
        const configuration = createChangeRecordingTextDocumentsConfiguration();

        const document = configuration.create(uri, 'bbj', 1, 'a\nb\nc\n');
        configuration.update(document, [{ text: 'a\nB\nc\n' }], 2);

        const batches = contentChangesSince(uri, 1, 2);
        expect(batches).toHaveLength(1);
        expect(batches![0].changes).toHaveLength(1);
        expect(batches![0].changes[0].range).toBeDefined();
        expect(batches![0].changes[0].text).toBe('B\n');
    });
});

describe('composeWithKeptCheck', () => {
    test('no Langium diagnostics gives exactly the placed kept diagnostics', () => {
        const keptDiag = makeDiag(2, 2, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error');
        const kept: KeptCheck = { kind: 'verdict', version: 1, diagnostics: [keptDiag], seen: new Set(), storedUnderOnSave: false };

        const result = composeWithKeptCheck({
            langiumDiagnostics: [],
            liveText: 'a\nb\nc\n',
            kept,
            changesSinceCheck: []
        });

        expect(result).toEqual([keptDiag]);
    });

    test('a seen complaint on an unchanged line that overlaps a placed verdict diagnostic is dropped; a seen complaint that overlaps none is downgraded', () => {
        const liveText = 'line0\nline1\nline2\nline3\nline4\nline5\n';
        const overlapComplaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'overlap complaint');
        const loneComplaint = makeDiag(5, 5, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'lone complaint');
        const bbjDiag = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error');
        const kept: KeptCheck = {
            kind: 'verdict',
            version: 1,
            diagnostics: [bbjDiag],
            seen: new Set([
                syntaxComplaintKey(overlapComplaint.message, 'line0'),
                syntaxComplaintKey(loneComplaint.message, 'line5')
            ]),
            storedUnderOnSave: false
        };

        const result = composeWithKeptCheck({
            langiumDiagnostics: [overlapComplaint, loneComplaint],
            liveText,
            kept,
            changesSinceCheck: []
        });

        expect(result.find(d => d.message === 'overlap complaint')).toBeUndefined();
        const downgraded = result.find(d => d.message === 'lone complaint');
        expect(downgraded?.severity).toBe(DiagnosticSeverity.Warning);
        expect((downgraded?.data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);
    });

    test('an unseen complaint stays an Error, and a complaint beside a kept error that was not seen stays an Error too', () => {
        const liveText = 'x = 1 +\nnew bad line\n';
        const newComplaint = makeDiag(1, 1, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'new complaint');
        const editedLineComplaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'edited line complaint');
        const bbjDiag = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'kept bbj error');
        const kept: KeptCheck = { kind: 'verdict', version: 1, diagnostics: [bbjDiag], seen: new Set(), storedUnderOnSave: false };

        const result = composeWithKeptCheck({
            langiumDiagnostics: [newComplaint, editedLineComplaint],
            liveText,
            kept,
            changesSinceCheck: []
        });

        expect(result.find(d => d.message === 'new complaint')?.severity).toBe(DiagnosticSeverity.Error);
        expect(result.find(d => d.message === 'edited line complaint')?.severity).toBe(DiagnosticSeverity.Error);
        expect(result.find(d => d.message === 'kept bbj error')).toBeDefined();
    });

    test('a kept diagnostic whose line was deleted is gone, while a seen complaint elsewhere is still downgraded', () => {
        const liveText = 'a\nb\nc\n';
        const elsewhereComplaint = makeDiag(2, 2, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'elsewhere');
        const bbjDiag = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'deleted-line error');
        const kept: KeptCheck = {
            kind: 'verdict',
            version: 1,
            diagnostics: [bbjDiag],
            seen: new Set([syntaxComplaintKey(elsewhereComplaint.message, 'c')]),
            storedUnderOnSave: false
        };
        const batches: ContentChangeBatch[] = [{
            fromVersion: 1,
            toVersion: 2,
            changes: [replaceLines(0, 1, '')] // deletes line 0, the kept diagnostic's own line.
        }];

        const result = composeWithKeptCheck({
            langiumDiagnostics: [elsewhereComplaint],
            liveText,
            kept,
            changesSinceCheck: batches
        });

        expect(result.find(d => d.message === 'deleted-line error')).toBeUndefined();
        const downgraded = result.find(d => d.message === 'elsewhere');
        expect(downgraded?.severity).toBe(DiagnosticSeverity.Warning);
    });

    test('changesSinceCheck undefined places nothing, and still downgrades a seen complaint', () => {
        const liveText = 'a\nb\n';
        const complaint = makeDiag(1, 1, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'seen complaint');
        const bbjDiag = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'unplaceable error');
        const kept: KeptCheck = {
            kind: 'verdict',
            version: 1,
            diagnostics: [bbjDiag],
            seen: new Set([syntaxComplaintKey(complaint.message, 'b')]),
            storedUnderOnSave: false
        };

        const result = composeWithKeptCheck({
            langiumDiagnostics: [complaint],
            liveText,
            kept,
            changesSinceCheck: undefined
        });

        expect(result.some(d => d.message === 'unplaceable error')).toBe(false);
        const downgraded = result.find(d => d.message === 'seen complaint');
        expect(downgraded?.severity).toBe(DiagnosticSeverity.Warning);
    });

    test('a complaint whose validated line text differs from its live line text stays an Error, and non-syntax diagnostics pass through', () => {
        const liveText = 'x = 2\n';
        const validatedText = 'x = 1\n';
        const complaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'stale complaint');
        const semanticError = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'bbj', 'semantic error');
        const kept: KeptCheck = {
            kind: 'verdict',
            version: 1,
            diagnostics: [],
            // Even a matching key must not be trusted once the line text itself has moved on.
            seen: new Set([syntaxComplaintKey(complaint.message, 'x = 2')]),
            storedUnderOnSave: false
        };

        const result = composeWithKeptCheck({
            langiumDiagnostics: [complaint, semanticError],
            validatedText,
            liveText,
            kept,
            changesSinceCheck: []
        });

        expect(result.find(d => d.message === 'stale complaint')?.severity).toBe(DiagnosticSeverity.Error);
        expect(result).toContainEqual(semanticError);
    });

    test("with no changes and validatedText equal to liveText, the result deep-equals reconcileWithVerdict's diagnostics for the same verdict; equal inputs give deep-equal outputs and no input is mutated", () => {
        const liveText = 'x = 1 +\nrem ok\ny = 2 *\n';
        const complaintA = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'first complaint');
        const complaintB = makeDiag(2, 2, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'second complaint');
        const bbjDiag = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error');
        const langiumDiagnostics = [complaintA, complaintB];
        const verdictDiagnostics = [bbjDiag];

        const { diagnostics: reconciled, state } = reconcileWithVerdict(langiumDiagnostics, verdictDiagnostics, textLineLookup(liveText));

        const kept: KeptCheck = { kind: 'verdict', version: 1, diagnostics: verdictDiagnostics, seen: state.seen, storedUnderOnSave: false };
        const composed = composeWithKeptCheck({
            langiumDiagnostics,
            validatedText: liveText,
            liveText,
            kept,
            changesSinceCheck: []
        });

        expect(composed).toEqual(reconciled);

        // Purity: a second call with structurally-equal (fresh-object) inputs gives a deep-equal
        // result, and neither original input array was mutated by either call.
        const composedAgain = composeWithKeptCheck({
            langiumDiagnostics: [{ ...complaintA }, { ...complaintB }],
            validatedText: liveText,
            liveText,
            kept: { kind: 'verdict', version: 1, diagnostics: [{ ...bbjDiag }], seen: state.seen, storedUnderOnSave: false },
            changesSinceCheck: []
        });
        expect(composedAgain).toEqual(composed);
        expect(langiumDiagnostics).toEqual([complaintA, complaintB]);
        expect(verdictDiagnostics).toEqual([bbjDiag]);
    });
});
