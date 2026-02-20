import { describe, test, expect, beforeAll } from 'vitest';
import { parseBbjcplOutput } from '../src/language/bbj-cpl-parser.js';
import { DiagnosticSeverity } from 'vscode-languageserver';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'test-data/cpl-fixtures');

let singleErrorStderr: string;
let multipleErrorsStderr: string;
let noErrorsStderr: string;

beforeAll(() => {
    singleErrorStderr = fs.readFileSync(path.join(FIXTURES_DIR, 'single-error-stderr.txt'), 'utf-8');
    multipleErrorsStderr = fs.readFileSync(path.join(FIXTURES_DIR, 'multiple-errors-stderr.txt'), 'utf-8');
    noErrorsStderr = fs.readFileSync(path.join(FIXTURES_DIR, 'no-errors-stderr.txt'), 'utf-8');
});

describe('parseBbjcplOutput', () => {

    test('single-error fixture produces 2 diagnostics (cascading methodend)', () => {
        // single-error.bbj has one syntax error on line 3 and a cascading methodend error on line 5
        const diagnostics = parseBbjcplOutput(singleErrorStderr);
        expect(diagnostics).toHaveLength(2);

        const [first, second] = diagnostics;

        // Line 3 (physical) -> 0-based line 2
        expect(first.severity).toBe(DiagnosticSeverity.Error);
        expect(first.source).toBe('BBj Compiler');
        expect(first.range.start.line).toBe(2);
        expect(first.range.start.character).toBe(0);
        expect(first.range.end.character).toBe(Number.MAX_SAFE_INTEGER);

        // Line 5 (physical) -> 0-based line 4
        expect(second.severity).toBe(DiagnosticSeverity.Error);
        expect(second.source).toBe('BBj Compiler');
        expect(second.range.start.line).toBe(4);
        expect(second.range.start.character).toBe(0);
        expect(second.range.end.character).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('multiple-errors fixture produces 4 diagnostics with correct independent line numbers', () => {
        // multiple-errors.bbj: errors on physical lines 3, 5, 6, 8
        const diagnostics = parseBbjcplOutput(multipleErrorsStderr);
        expect(diagnostics).toHaveLength(4);

        // Physical line 3 -> 0-based line 2
        expect(diagnostics[0].range.start.line).toBe(2);
        expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
        expect(diagnostics[0].source).toBe('BBj Compiler');

        // Physical line 5 -> 0-based line 4
        expect(diagnostics[1].range.start.line).toBe(4);

        // Physical line 6 -> 0-based line 5
        expect(diagnostics[2].range.start.line).toBe(5);

        // Physical line 8 -> 0-based line 7
        expect(diagnostics[3].range.start.line).toBe(7);
    });

    test('no-errors fixture (empty stderr) produces empty array', () => {
        const diagnostics = parseBbjcplOutput(noErrorsStderr);
        expect(diagnostics).toHaveLength(0);
    });

    test('empty string produces empty array', () => {
        const diagnostics = parseBbjcplOutput('');
        expect(diagnostics).toHaveLength(0);
    });

    test('whitespace-only string produces empty array', () => {
        const diagnostics = parseBbjcplOutput('   \n\n  \t  ');
        expect(diagnostics).toHaveLength(0);
    });

    test('non-error lines are ignored (source code lines mixed with error lines)', () => {
        // Simulate a mix of error lines and non-error content
        const mixedInput = [
            '/some/file.bbj: error at line 340 (34):     method public void broken())',
            '    method public void broken())  ', // this is a source line, NOT an error line
            '',                                    // blank line
            'stdout: some output',                 // stdout content
            '/some/file.bbj: error at line 360 (36):     methodend',
        ].join('\n');

        const diagnostics = parseBbjcplOutput(mixedInput);
        // Only the two lines starting with "error at line" should produce diagnostics
        expect(diagnostics).toHaveLength(2);
        expect(diagnostics[0].range.start.line).toBe(33); // physical 34 -> 0-based 33
        expect(diagnostics[1].range.start.line).toBe(35); // physical 36 -> 0-based 35
    });

    test('line number off-by-one guard: physical line (34) maps to LSP line 33 (0-based)', () => {
        const input = '/some/file.bbj: error at line 340 (34):     some broken code';
        const diagnostics = parseBbjcplOutput(input);
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0].range.start.line).toBe(33);
    });

    test('each diagnostic has range covering full line (character 0 to MAX_SAFE_INTEGER)', () => {
        const input = '/some/file.bbj: error at line 10 (1):     bad code here';
        const diagnostics = parseBbjcplOutput(input);
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0].range.start.line).toBe(0);
        expect(diagnostics[0].range.start.character).toBe(0);
        expect(diagnostics[0].range.end.line).toBe(0);
        expect(diagnostics[0].range.end.character).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('all diagnostics have Error severity and BBj Compiler source', () => {
        const input = [
            '/some/file.bbj: error at line 10 (1):     code',
            '/some/file.bbj: error at line 20 (2):     more code',
        ].join('\n');

        const diagnostics = parseBbjcplOutput(input);
        expect(diagnostics).toHaveLength(2);
        for (const d of diagnostics) {
            expect(d.severity).toBe(DiagnosticSeverity.Error);
            expect(d.source).toBe('BBj Compiler');
        }
    });

});
