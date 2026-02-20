import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';

/**
 * Matches a bbjcpl error line.
 *
 * Real format (empirically confirmed):
 *   <filepath>: error at line <legacy_line> (<physical_line>):     <source_code>
 *
 * Example:
 *   /path/to/file.bbj: error at line 30 (3):     method public void brokenMethod())
 *
 * Group 1: physical line number (1-based) — used for LSP line mapping.
 * Group 2: source code snippet from the error line (trimmed).
 *
 * The first number (legacy BASIC line) is ignored; only the parenthesized
 * physical line number is used.
 */
const ERROR_LINE_RE = /^.+:\s+error at line \d+ \((\d+)\):\s*(.*)/;

/**
 * Parse bbjcpl stderr output into LSP Diagnostic objects.
 *
 * bbjcpl always exits 0; errors are reported on stderr only. Empty stderr
 * means the file compiled successfully.
 *
 * @param stderr - The full stderr string from a `bbjcpl -N <file>` invocation.
 * @returns An array of LSP Diagnostic objects, one per bbjcpl error line.
 */
export function parseBbjcplOutput(stderr: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (!stderr.trim()) return diagnostics;

    const lines = stderr.split('\n');

    for (const line of lines) {
        const match = ERROR_LINE_RE.exec(line);
        if (!match) continue;

        // bbjcpl reports 1-based physical lines; LSP ranges are 0-based
        const physicalLine = parseInt(match[1], 10) - 1;
        const sourceSnippet = match[2].trim();

        const range: Range = {
            start: { line: physicalLine, character: 0 },
            end:   { line: physicalLine, character: Number.MAX_SAFE_INTEGER },
        };

        // Use the source snippet from bbjcpl output if available, otherwise
        // fall back to a generic "Syntax error" message.
        const message = sourceSnippet
            ? `Syntax error: ${sourceSnippet}`
            : `Syntax error at line ${physicalLine + 1}`;

        diagnostics.push({
            range,
            severity: DiagnosticSeverity.Error,
            source: 'BBjCPL',
            message,
        });
    }

    return diagnostics;
}
