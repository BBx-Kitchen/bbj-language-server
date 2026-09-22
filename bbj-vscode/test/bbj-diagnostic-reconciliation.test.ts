import { DocumentValidator } from 'langium';
import { describe, test, expect } from 'vitest';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import {
    DOWNGRADED_SYNTAX_CODE,
    LINE_BREAK_DIAGNOSTIC_CODE,
    downgradeSyntaxComplaint,
    reconcileWithVerdict,
    syntaxComplaintKey,
    type LineTextLookup,
} from '../src/language/bbj-diagnostic-reconciliation.js';
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
