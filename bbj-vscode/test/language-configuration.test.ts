import { readFileSync } from 'fs';
import { describe, expect, test } from 'vitest';

/**
 * Regression for P62-D2-006: bbj-language-configuration.json carries two trailing commas
 * (a comma after the last element of autoClosingPairs, and a comma after onEnterRules'
 * closing bracket) that make the file invalid strict JSON. VS Code's own extension host
 * loads it with a lenient JSONC-style parser (comments/trailing commas tolerated), which
 * is why this has shipped unnoticed -- but it is a genuine defect against the file's own
 * .json extension and against any consumer that uses strict JSON.parse.
 *
 * Pre-fix entry counts (recorded here so the fix's own edit can be checked against them --
 * a deleted comma must not become a deleted entry): comments=1, brackets=3,
 * autoClosingPairs=7, surroundingPairs=5, onEnterRules=3.
 */

describe('bbj-language-configuration.json (P62-D2-006)', () => {
    test('parses as strict JSON', () => {
        const raw = readFileSync('bbj-language-configuration.json', 'utf8');
        expect(() => JSON.parse(raw)).not.toThrow();
    });

    test('every collection keeps its pre-fix entry count', () => {
        const raw = readFileSync('bbj-language-configuration.json', 'utf8');
        const config = JSON.parse(raw);
        expect(Object.keys(config.comments)).toHaveLength(1);
        expect(config.brackets).toHaveLength(3);
        expect(config.autoClosingPairs).toHaveLength(7);
        expect(config.surroundingPairs).toHaveLength(5);
        expect(config.onEnterRules).toHaveLength(3);
    });
});
