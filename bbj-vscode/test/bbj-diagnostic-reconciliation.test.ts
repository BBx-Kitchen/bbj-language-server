import { DocumentValidator, type LangiumDocument } from 'langium';
import { describe, test, expect } from 'vitest';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import {
    DOWNGRADED_SYNTAX_CODE,
    LINE_BREAK_DIAGNOSTIC_CODE,
    applyVerdictCarryOver,
    composeWithVerdict,
    downgradeSyntaxComplaint,
    recallLangiumDiagnostics,
    recallLangiumSnapshot,
    reconcileWithVerdict,
    rememberLangiumDiagnostics,
    syntaxComplaintKey,
    type LineTextLookup,
    type VerdictComposition,
    type VerdictState,
} from '../src/language/bbj-diagnostic-reconciliation.js';
import { applyDiagnosticHierarchy } from '../src/language/bbj-document-validator.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';

/** A diagnostic spanning `line` to `endLine`, in the style of cpl-integration.test.ts's `makeDiag`. */
function makeDiag(
    line: number,
    endLine: number,
    severity: DiagnosticSeverity,
    code?: string,
    source?: string,
    message = 'diagnostic'
): Diagnostic {
    const range: Range = {
        start: { line, character: 0 },
        end: { line: endLine, character: END_OF_LINE_CHARACTER },
    };
    const diagnostic: Diagnostic = { range, severity, message };
    if (source !== undefined) {
        diagnostic.source = source;
    }
    if (code !== undefined) {
        diagnostic.data = { code };
    }
    return diagnostic;
}

/** A fake `LineTextLookup` over an invented array of line strings. */
function lineTextFrom(lines: string[]): LineTextLookup {
    return (line: number) => lines[line] ?? '';
}

describe('reconcileWithVerdict', () => {

    test('an accepted verdict with no errors downgrades every syntax complaint, keeping message, range and source', () => {
        const langium = [
            makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error'),
            makeDiag(1, 1, DiagnosticSeverity.Error, DocumentValidator.LexingError, 'bbj', 'lex error'),
            makeDiag(2, 2, DiagnosticSeverity.Error, LINE_BREAK_DIAGNOSTIC_CODE, 'bbj', 'line break error'),
        ];
        const lineText = lineTextFrom(['a', 'b', 'c']);

        const { diagnostics } = reconcileWithVerdict(langium, [], lineText);

        expect(diagnostics).toHaveLength(3);
        diagnostics.forEach((d, i) => {
            expect(d.severity).toBe(DiagnosticSeverity.Warning);
            expect((d.data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);
            expect(d.message).toBe(langium[i].message);
            expect(d.range).toEqual(langium[i].range);
            expect(d.source).toBe(langium[i].source);
        });
    });

    test('a semantic error, a linking-error warning and a plain validator warning pass through unchanged', () => {
        const semanticError = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'bbj', 'semantic error');
        const linkingWarning = makeDiag(1, 1, DiagnosticSeverity.Warning, DocumentValidator.LinkingError, 'bbj', 'linking warning');
        const validatorWarning = makeDiag(2, 2, DiagnosticSeverity.Warning, undefined, 'bbj', 'validator warning');
        const langium = [semanticError, linkingWarning, validatorWarning];
        const lineText = lineTextFrom(['a', 'b', 'c']);

        const { diagnostics, state } = reconcileWithVerdict(langium, [], lineText);

        expect(diagnostics).toEqual(langium);
        expect(state.seen.size).toBe(0);
    });

    test('a BBj diagnostic and a Langium parse error on the same line: the Langium one is gone, BBj\'s remains unchanged', () => {
        const langiumParseError = makeDiag(4, 4, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'langium parse error');
        const bbjDiag = makeDiag(4, 4, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error');
        const lineText = lineTextFrom(['', '', '', '', 'x = (']);

        const { diagnostics } = reconcileWithVerdict([langiumParseError], [bbjDiag], lineText);

        expect(diagnostics).toEqual([bbjDiag]);
    });

    test('colon-continued statement: a BBj span covering the Langium complaint\'s line replaces it', () => {
        // BBj reports lines 3-4; the Langium complaint sits on line 4, inside that span.
        const langiumComplaint = makeDiag(4, 4, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'langium complaint');
        const bbjDiag = makeDiag(3, 4, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error spanning 3-4');
        const lineText = lineTextFrom(['', '', '', 'x =', '(1']);

        const { diagnostics } = reconcileWithVerdict([langiumComplaint], [bbjDiag], lineText);

        expect(diagnostics).toEqual([bbjDiag]);
    });

    test('colon-continued statement: a Langium span whose line BBj flags replaces it', () => {
        // Langium reports lines 2-3; BBj flags line 3, inside that span.
        const langiumComplaint = makeDiag(2, 3, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'langium complaint spanning 2-3');
        const bbjDiag = makeDiag(3, 3, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error on line 3');
        const lineText = lineTextFrom(['', '', 'x =', '(1']);

        const { diagnostics } = reconcileWithVerdict([langiumComplaint], [bbjDiag], lineText);

        expect(diagnostics).toEqual([bbjDiag]);
    });

    test('touching spans that share exactly one line still replace the Langium complaint', () => {
        const langiumComplaint = makeDiag(2, 4, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'langium complaint spanning 2-4');
        const bbjDiag = makeDiag(4, 4, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error on line 4');
        const lineText = lineTextFrom(['', '', '', '', 'x = (']);

        const { diagnostics } = reconcileWithVerdict([langiumComplaint], [bbjDiag], lineText);

        expect(diagnostics).toEqual([bbjDiag]);
    });

    test('an adjacent span with no shared line downgrades the Langium complaint instead of replacing it', () => {
        const langiumComplaint = makeDiag(5, 5, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'langium complaint on line 5');
        const bbjDiag = makeDiag(4, 4, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error on line 4');
        const lineText = lineTextFrom(['', '', '', '', 'x = (', 'y = 1']);

        const { diagnostics } = reconcileWithVerdict([langiumComplaint], [bbjDiag], lineText);

        expect(diagnostics).toHaveLength(2);
        const downgraded = diagnostics.find(d => d.message === 'langium complaint on line 5');
        expect(downgraded).toBeDefined();
        expect(downgraded!.severity).toBe(DiagnosticSeverity.Warning);
        expect((downgraded!.data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);
        expect(diagnostics).toContainEqual(bbjDiag);
    });

    test('a semantic error on the line BBj flags stays, as an Error', () => {
        const semanticError = makeDiag(4, 4, DiagnosticSeverity.Error, undefined, 'bbj', 'semantic error on line 4');
        const bbjDiag = makeDiag(4, 4, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error on line 4');
        const lineText = lineTextFrom(['', '', '', '', 'x = (']);

        const { diagnostics } = reconcileWithVerdict([semanticError], [bbjDiag], lineText);

        expect(diagnostics).toEqual([semanticError, bbjDiag]);
    });

    test('both empty: [] and [] reconcile to []', () => {
        const { diagnostics } = reconcileWithVerdict([], [], lineTextFrom([]));
        expect(diagnostics).toEqual([]);
    });

    test('empty Langium list with a BBj list reconciles to exactly the BBj list', () => {
        const bbjDiag = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error');
        const { diagnostics } = reconcileWithVerdict([], [bbjDiag], lineTextFrom(['x']));
        expect(diagnostics).toEqual([bbjDiag]);
    });

    test('a Langium list with an empty BBj list: every syntax complaint is downgraded', () => {
        const parseError = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const semanticError = makeDiag(1, 1, DiagnosticSeverity.Error, undefined, 'bbj', 'semantic error');

        const { diagnostics } = reconcileWithVerdict([parseError, semanticError], [], lineTextFrom(['a', 'b']));

        expect(diagnostics).toHaveLength(2);
        expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
        expect((diagnostics[0].data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);
        expect(diagnostics[1]).toEqual(semanticError);
    });

    test('ordering: Langium survivors keep their input order, then BBj\'s in input order', () => {
        const a = makeDiag(0, 0, DiagnosticSeverity.Warning, undefined, 'bbj', 'a');
        const b = makeDiag(1, 1, DiagnosticSeverity.Warning, undefined, 'bbj', 'b');
        const bbj1 = makeDiag(2, 2, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj1');
        const bbj2 = makeDiag(3, 3, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj2');

        const { diagnostics } = reconcileWithVerdict([a, b], [bbj1, bbj2], lineTextFrom(['', '', '', '']));

        expect(diagnostics).toEqual([a, b, bbj1, bbj2]);
    });

    test('purity: inputs are not mutated and equal inputs give equal outputs', () => {
        const langium = [
            makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error'),
            makeDiag(1, 1, DiagnosticSeverity.Warning, undefined, 'bbj', 'warning'),
        ];
        const verdict = [makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error')];
        const langiumBefore = structuredClone(langium);
        const verdictBefore = structuredClone(verdict);
        const lineText = lineTextFrom(['x = (', 'y = 1']);

        const first = reconcileWithVerdict(langium, verdict, lineText);
        const second = reconcileWithVerdict(langium, verdict, lineText);

        expect(langium).toEqual(langiumBefore);
        expect(verdict).toEqual(verdictBefore);
        expect(first.diagnostics).toEqual(second.diagnostics);
    });

    test('purity: downgrading an already-downgraded diagnostic yields an equal diagnostic', () => {
        const complaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const downgradedOnce = downgradeSyntaxComplaint(complaint);
        const downgradedTwice = downgradeSyntaxComplaint(downgradedOnce);
        expect(downgradedTwice).toEqual(downgradedOnce);
    });

    test('state: seen holds the key of every downgraded AND every replaced complaint, and nothing for non-syntax diagnostics', () => {
        const downgradedComplaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'downgraded complaint');
        const replacedComplaint = makeDiag(1, 1, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'replaced complaint');
        const semanticError = makeDiag(2, 2, DiagnosticSeverity.Error, undefined, 'bbj', 'semantic error');
        const bbjDiag = makeDiag(1, 1, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error');
        const lineText = lineTextFrom(['a', 'b', 'c']);

        const { state } = reconcileWithVerdict([downgradedComplaint, replacedComplaint, semanticError], [bbjDiag], lineText);

        expect(state.seen).toEqual(new Set([
            syntaxComplaintKey(downgradedComplaint.message, 'a'),
            syntaxComplaintKey(replacedComplaint.message, 'b'),
        ]));
    });

});

describe('applyDiagnosticHierarchy', () => {

    test('a downgraded syntax warning and a linking-error warning both survive when there is no Error', () => {
        const downgraded = makeDiag(0, 0, DiagnosticSeverity.Warning, DOWNGRADED_SYNTAX_CODE, 'bbj', 'downgraded warning');
        const linking = makeDiag(1, 1, DiagnosticSeverity.Warning, DocumentValidator.LinkingError, 'bbj', 'linking warning');

        const result = applyDiagnosticHierarchy([downgraded, linking], true, 20);

        expect(result).toEqual([downgraded, linking]);
    });

    test('the same list plus a fresh parsing-error Error removes the linking-error, not the downgraded warning', () => {
        const downgraded = makeDiag(0, 0, DiagnosticSeverity.Warning, DOWNGRADED_SYNTAX_CODE, 'bbj', 'downgraded warning');
        const linking = makeDiag(1, 1, DiagnosticSeverity.Warning, DocumentValidator.LinkingError, 'bbj', 'linking warning');
        const parseError = makeDiag(2, 2, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'fresh parse error');

        const result = applyDiagnosticHierarchy([downgraded, linking, parseError], true, 20);

        expect(result).toEqual([downgraded, parseError]);
    });

    test('a live-parser Error and a downgraded warning survive; a validator warning and a linking warning are removed', () => {
        const liveError = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'live parser error');
        const downgraded = makeDiag(1, 1, DiagnosticSeverity.Warning, DOWNGRADED_SYNTAX_CODE, 'bbj', 'downgraded warning');
        const validatorWarning = makeDiag(2, 2, DiagnosticSeverity.Warning, undefined, 'bbj', 'validator warning');
        const linkingWarning = makeDiag(3, 3, DiagnosticSeverity.Warning, DocumentValidator.LinkingError, 'bbj', 'linking warning');

        const result = applyDiagnosticHierarchy([liveError, downgraded, validatorWarning, linkingWarning], true, 20);

        expect(result).toEqual([liveError, downgraded]);
    });

    test('25 downgraded warnings with maxErrors 20: exactly the first 20 survive, in order', () => {
        const warnings = Array.from({ length: 25 }, (_, i) =>
            makeDiag(i, i, DiagnosticSeverity.Warning, DOWNGRADED_SYNTAX_CODE, 'bbj', `warning ${i}`));

        const result = applyDiagnosticHierarchy(warnings, true, 20);

        expect(result).toEqual(warnings.slice(0, 20));
    });

    test('20 parsing-errors plus 5 downgraded warnings all survive — downgraded warnings do not count against the error cap', () => {
        const parseErrors = Array.from({ length: 20 }, (_, i) =>
            makeDiag(i, i, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', `parse error ${i}`));
        const warnings = Array.from({ length: 5 }, (_, i) =>
            makeDiag(20 + i, 20 + i, DiagnosticSeverity.Warning, DOWNGRADED_SYNTAX_CODE, 'bbj', `warning ${i}`));

        const result = applyDiagnosticHierarchy([...parseErrors, ...warnings], true, 20);

        expect(result).toHaveLength(25);
    });

    test('unchanged: suppression off returns the input as is', () => {
        const diagnostics = [makeDiag(0, 0, DiagnosticSeverity.Warning, undefined, 'bbj', 'a warning')];

        const result = applyDiagnosticHierarchy(diagnostics, false, 20);

        expect(result).toBe(diagnostics);
    });

    test('unchanged: a parse error plus a linking error removes the linking error', () => {
        const parseError = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const linking = makeDiag(1, 1, DiagnosticSeverity.Warning, DocumentValidator.LinkingError, 'bbj', 'linking warning');

        const result = applyDiagnosticHierarchy([parseError, linking], true, 20);

        expect(result).toEqual([parseError]);
    });

    test('unchanged: a semantic Error plus a Warning removes the Warning', () => {
        const semanticError = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'bbj', 'semantic error');
        const warning = makeDiag(1, 1, DiagnosticSeverity.Warning, undefined, 'bbj', 'ordinary warning');

        const result = applyDiagnosticHierarchy([semanticError, warning], true, 20);

        expect(result).toEqual([semanticError]);
    });

    test('unchanged: 25 parse errors cap at 20', () => {
        const parseErrors = Array.from({ length: 25 }, (_, i) =>
            makeDiag(i, i, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', `parse error ${i}`));

        const result = applyDiagnosticHierarchy(parseErrors, true, 20);

        expect(result).toHaveLength(20);
    });

    test('unchanged: a BBjCPL-sourced diagnostic removes the Parse tier (Rule 0\'s pure behaviour)', () => {
        const parseError = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const cplDiag = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'BBjCPL', 'bbjcpl error');

        const result = applyDiagnosticHierarchy([parseError, cplDiag], true, 20);

        expect(result).toEqual([cplDiag]);
    });

});

describe('applyVerdictCarryOver', () => {

    test('a parsing-error whose message and line text match a seen key is downgraded', () => {
        const complaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const lineText = lineTextFrom(['x = (']);
        const state: VerdictState = { seen: new Set([syntaxComplaintKey('parse error', 'x = (')]) };

        const result = applyVerdictCarryOver([complaint], state, lineText);

        expect(result).toHaveLength(1);
        expect(result[0].severity).toBe(DiagnosticSeverity.Warning);
        expect((result[0].data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);
    });

    test('a complaint whose message differs from every seen key stays an Error', () => {
        const complaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'a different message');
        const lineText = lineTextFrom(['x = (']);
        const state: VerdictState = { seen: new Set([syntaxComplaintKey('parse error', 'x = (')]) };

        const result = applyVerdictCarryOver([complaint], state, lineText);

        expect(result).toEqual([complaint]);
    });

    test('a complaint whose line text differs from every seen key stays an Error', () => {
        const complaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const lineText = lineTextFrom(['x = (1']); // the line was edited since the last verdict
        const state: VerdictState = { seen: new Set([syntaxComplaintKey('parse error', 'x = (')]) };

        const result = applyVerdictCarryOver([complaint], state, lineText);

        expect(result).toEqual([complaint]);
    });

    test('the same message on the same text at a different line number is still downgraded', () => {
        const complaint = makeDiag(3, 3, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const lineText = lineTextFrom(['', '', '', 'x = (']);
        const state: VerdictState = { seen: new Set([syntaxComplaintKey('parse error', 'x = (')]) };

        const result = applyVerdictCarryOver([complaint], state, lineText);

        expect(result[0].severity).toBe(DiagnosticSeverity.Warning);
    });

    test('a non-syntax diagnostic whose key happens to match a seen entry is untouched', () => {
        const semanticError = makeDiag(0, 0, DiagnosticSeverity.Error, undefined, 'bbj', 'parse error');
        const lineText = lineTextFrom(['x = (']);
        const state: VerdictState = { seen: new Set([syntaxComplaintKey('parse error', 'x = (')]) };

        const result = applyVerdictCarryOver([semanticError], state, lineText);

        expect(result).toEqual([semanticError]);
    });

    test('an already-downgraded complaint is untouched', () => {
        const downgraded = makeDiag(0, 0, DiagnosticSeverity.Warning, DOWNGRADED_SYNTAX_CODE, 'bbj', 'already downgraded');
        const lineText = lineTextFrom(['x = (']);
        const state: VerdictState = { seen: new Set([syntaxComplaintKey('already downgraded', 'x = (')]) };

        const result = applyVerdictCarryOver([downgraded], state, lineText);

        expect(result).toEqual([downgraded]);
    });

    test('inputs are not mutated', () => {
        const complaint = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error');
        const before = structuredClone(complaint);
        const lineText = lineTextFrom(['x = (']);
        const state: VerdictState = { seen: new Set([syntaxComplaintKey('parse error', 'x = (')]) };

        applyVerdictCarryOver([complaint], state, lineText);

        expect(complaint).toEqual(before);
    });

});

describe('composeWithVerdict — early verdict against a stale Langium list', () => {

    test('rememberLangiumDiagnostics/recallLangiumSnapshot round-trip the validated text; recallLangiumDiagnostics returns the same list; remembering with two arguments recalls validatedText as undefined', () => {
        const list = [makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error')];
        const documentWithText = {} as LangiumDocument;
        rememberLangiumDiagnostics(documentWithText, list, 'text v1');

        const snapshot = recallLangiumSnapshot(documentWithText);
        expect(snapshot?.diagnostics).toBe(list);
        expect(snapshot?.validatedText).toBe('text v1');
        expect(recallLangiumDiagnostics(documentWithText)).toBe(list);

        const documentWithoutText = {} as LangiumDocument;
        rememberLangiumDiagnostics(documentWithoutText, list);
        expect(recallLangiumSnapshot(documentWithoutText)?.validatedText).toBeUndefined();
    });

    test('an early verdict for the live version composed against a stale Langium list downgrades a matched complaint, leaves a changed-line complaint an Error, drops the complaint on a line BBj flags, and passes a non-syntax diagnostic through unchanged', () => {
        const validatedLines = ['a = 1', 'b = (', 'c = 3'];
        const liveLines = ['a = 1', 'b = (2', 'c = 3', 'd = )'];
        const validatedText = validatedLines.join('\n');
        const liveText = liveLines.join('\n');

        const line0Error = makeDiag(0, 0, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error on line 0');
        const line1Error = makeDiag(1, 1, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error on line 1');
        const line2Error = makeDiag(2, 2, DiagnosticSeverity.Error, DocumentValidator.ParsingError, 'bbj', 'parse error on line 2');
        const linkingWarning = makeDiag(1, 1, DiagnosticSeverity.Warning, DocumentValidator.LinkingError, 'bbj', 'linking warning');
        const langium = [line0Error, line1Error, line2Error, linkingWarning];

        const bbjDiag = makeDiag(2, 2, DiagnosticSeverity.Error, undefined, 'BBj Parser', 'bbj error on line 2');
        const verdict: VerdictState = { seen: new Set(), version: 2, diagnostics: [bbjDiag] };

        const composition: VerdictComposition = {
            langiumDiagnostics: langium,
            validatedText,
            liveText,
            liveVersion: 2,
            verdict,
        };
        const { diagnostics, seen } = composeWithVerdict(composition);

        expect(diagnostics).toHaveLength(4);
        expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
        expect((diagnostics[0].data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);
        expect(diagnostics[0].message).toBe(line0Error.message);
        expect(diagnostics[0].range).toEqual(line0Error.range);
        expect(diagnostics[1]).toEqual(line1Error);
        expect(diagnostics[2]).toEqual(linkingWarning);
        expect(diagnostics[3]).toEqual(bbjDiag);

        expect(seen).toEqual(new Set([
            syntaxComplaintKey(line0Error.message, liveLines[0]),
            syntaxComplaintKey(line2Error.message, liveLines[2]),
        ]));
    });

});
