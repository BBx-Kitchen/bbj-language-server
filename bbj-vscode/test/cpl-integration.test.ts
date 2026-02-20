import { describe, test, expect } from 'vitest';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { mergeDiagnostics } from '../src/language/bbj-document-validator.js';

// Helper to create a diagnostic at a given line
function makeDiag(line: number, source: string, severity: DiagnosticSeverity, message: string): Diagnostic {
    const range: Range = {
        start: { line, character: 0 },
        end: { line, character: Number.MAX_SAFE_INTEGER },
    };
    return { range, severity, source, message };
}

describe('mergeDiagnostics', () => {

    test('BBjCPL-only errors are added when no Langium match on same line', () => {
        const langium = [
            makeDiag(0, 'bbj', DiagnosticSeverity.Error, 'Langium error on line 0'),
        ];
        const cpl = [
            makeDiag(5, 'BBjCPL', DiagnosticSeverity.Error, 'CPL error on line 5'),
        ];
        const merged = mergeDiagnostics(langium, cpl);
        expect(merged).toHaveLength(2);
        expect(merged[0].message).toBe('Langium error on line 0');
        expect(merged[0].source).toBe('bbj'); // unchanged — no CPL on same line
        expect(merged[1].message).toBe('CPL error on line 5');
        expect(merged[1].source).toBe('BBjCPL');
    });

    test('same-line match: Langium message kept, source changed to BBjCPL', () => {
        const langium = [
            makeDiag(3, 'bbj', DiagnosticSeverity.Error, 'Detailed Langium error'),
        ];
        const cpl = [
            makeDiag(3, 'BBjCPL', DiagnosticSeverity.Error, 'Syntax error: brokenMethod'),
        ];
        const merged = mergeDiagnostics(langium, cpl);
        expect(merged).toHaveLength(1);
        expect(merged[0].message).toBe('Detailed Langium error'); // Langium message preserved
        expect(merged[0].source).toBe('BBjCPL'); // source changed to BBjCPL
    });

    test('empty BBjCPL array returns Langium diagnostics unchanged', () => {
        const langium = [
            makeDiag(0, 'bbj', DiagnosticSeverity.Error, 'Error'),
            makeDiag(1, 'bbj', DiagnosticSeverity.Warning, 'Warning'),
        ];
        const merged = mergeDiagnostics(langium, []);
        expect(merged).toHaveLength(2);
        expect(merged[0].source).toBe('bbj');
        expect(merged[1].source).toBe('bbj');
    });

    test('empty Langium array returns all BBjCPL diagnostics', () => {
        const cpl = [
            makeDiag(2, 'BBjCPL', DiagnosticSeverity.Error, 'CPL error 1'),
            makeDiag(4, 'BBjCPL', DiagnosticSeverity.Error, 'CPL error 2'),
        ];
        const merged = mergeDiagnostics([], cpl);
        expect(merged).toHaveLength(2);
        expect(merged[0].source).toBe('BBjCPL');
        expect(merged[1].source).toBe('BBjCPL');
    });

    test('multiple BBjCPL errors: some match Langium lines, some do not', () => {
        const langium = [
            makeDiag(1, 'bbj', DiagnosticSeverity.Error, 'Langium L1'),
            makeDiag(3, 'bbj', DiagnosticSeverity.Warning, 'Langium L3 warning'),
            makeDiag(5, 'bbj', DiagnosticSeverity.Error, 'Langium L5'),
        ];
        const cpl = [
            makeDiag(1, 'BBjCPL', DiagnosticSeverity.Error, 'CPL L1'),  // matches Langium L1
            makeDiag(7, 'BBjCPL', DiagnosticSeverity.Error, 'CPL L7'),  // no Langium match
        ];
        const merged = mergeDiagnostics(langium, cpl);
        expect(merged).toHaveLength(4); // L1(merged) + L3 + L5 + L7(added)
        expect(merged.find(d => d.range.start.line === 1)!.source).toBe('BBjCPL');
        expect(merged.find(d => d.range.start.line === 1)!.message).toBe('Langium L1');
        expect(merged.find(d => d.range.start.line === 3)!.source).toBe('bbj');
        expect(merged.find(d => d.range.start.line === 5)!.source).toBe('bbj');
        expect(merged.find(d => d.range.start.line === 7)!.source).toBe('BBjCPL');
    });

    test('original Langium array is not mutated', () => {
        const langium = [
            makeDiag(3, 'bbj', DiagnosticSeverity.Error, 'Original'),
        ];
        const cpl = [
            makeDiag(3, 'BBjCPL', DiagnosticSeverity.Error, 'CPL match'),
        ];
        const originalSource = langium[0].source;
        mergeDiagnostics(langium, cpl);
        expect(langium[0].source).toBe(originalSource); // not mutated
    });

    test('both empty arrays returns empty result', () => {
        const merged = mergeDiagnostics([], []);
        expect(merged).toHaveLength(0);
    });

});
