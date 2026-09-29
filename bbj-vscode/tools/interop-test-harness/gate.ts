/**
 * The critical-field gate: the one exported list of fields the language server depends on, the
 * exact-final-segment matcher, and the single verdict function every consumer reads instead of
 * re-deriving pass/fail counts on its own. No side effects at import.
 */
import type { CriticalFailure, FieldCheck, GateVerdict, TestResult } from './types.js';

/**
 * The one list of fields the language server depends on. The report and the gate both read this
 * constant; nothing else in the harness declares its own critical-field list.
 */
export const CRITICAL_FIELDS = [
    'isStatic', 'isDeprecated', 'constructors', 'name',
    'returnType', 'type', 'parameters', 'packageName',
] as const;

/**
 * The text after the last '.' in a field path, or the whole path when there is none. A field
 * check named `methods[0].returnType` has the final segment `returnType`.
 */
export function finalSegment(path: string): string {
    const idx = path.lastIndexOf('.');
    return idx === -1 ? path : path.slice(idx + 1);
}

/**
 * True only when a field check's final path segment equals a CRITICAL_FIELDS entry exactly — no
 * substring matching, so a check on `returnType` never matches `type` and `packageName` never
 * matches `name`.
 */
export function isCriticalFieldCheck(fieldCheck: FieldCheck): boolean {
    return (CRITICAL_FIELDS as readonly string[]).includes(finalSegment(fieldCheck.field));
}

/**
 * The one place the run's overall pass/fail verdict is decided. A critical field check counts as
 * failed unless it is both present and correctly typed. The verdict's exitCode is 1 when any
 * case failed or errored, or any critical field check failed; 0 otherwise. The connection-failure
 * path and the CLI's fatal handler keep their own outer status codes, decided outside this
 * function.
 */
export function evaluateGate(results: TestResult[]): GateVerdict {
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    const criticalFailures: CriticalFailure[] = [];
    for (const r of results) {
        for (const fc of r.fieldChecks) {
            if (isCriticalFieldCheck(fc) && !(fc.present && fc.typeMatch)) {
                criticalFailures.push({ caseName: r.name, field: fc.field, present: fc.present, typeMatch: fc.typeMatch });
            }
        }
    }

    const exitCode = (failCount > 0 || errorCount > 0 || criticalFailures.length > 0) ? 1 : 0;
    return { passCount, failCount, errorCount, criticalFailures, exitCode };
}
