import { describe, expect, test } from 'vitest';
import { formatDenumDiagnosticsBlock } from '../src/denum-diagnostics-output.js';

describe('formatDenumDiagnosticsBlock', () => {
    test('writes a header naming the file, then one line per entry', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' }],
        });

        expect(lines).toEqual([
            'Denumber diagnostics for /ws/a.bbj:',
            '  line 1 (original 0010) ERROR: syntax error',
        ]);
    });
});
