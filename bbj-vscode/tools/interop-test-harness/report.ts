/**
 * Builds the interop test harness's self-contained HTML report from a finished suite run. No
 * side effects at import: every function here is pure, taking already-computed results and a
 * verdict and returning HTML text. The page shell and CSS live in report-template.ts; this module
 * only builds the fragments that go inside it.
 */
import { CRITICAL_FIELDS, isCriticalFieldCheck } from './gate.js';
import { renderPage } from './report-template.js';
import type { Assertion, FieldCheck, GateVerdict, MatrixRow, TestResult, TestStatus } from './types.js';

// ─── Escaping and JSON highlighting ─────────────────────────────────────────

export function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Turns a value into JSON text, the way `syntaxHighlightJson` expects to receive it: an absent
 * value (`JSON.stringify` returning `undefined`) renders as the text `null` instead of throwing
 * when it is later passed through the highlighter.
 */
export function toJsonText(value: unknown): string {
    const json = JSON.stringify(value, null, 2);
    return json === undefined ? 'null' : json;
}

// One token per JSON string, number, boolean or null. The JSON-string pattern keeps its
// backslash-escape handling — see Pitfall 2 in the phase research: it already correctly matches
// a string containing an escaped quote, so it stays untouched here.
const JSON_TOKEN_PATTERN = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g;

/**
 * Highlights raw JSON text (as produced by `JSON.stringify`, not yet HTML-escaped) in a single
 * left-to-right pass. Every token and every gap between tokens goes through `escapeHtml` exactly
 * once here, so the peer's data is always escaped and the span markup itself never is (#596: the
 * old order ran `escapeHtml` first, turning every `"` into `&quot;` before the quote-anchored
 * regexes ever saw it, so no key or string was ever coloured).
 */
export function syntaxHighlightJson(rawJson: string): string {
    let result = '';
    let lastIndex = 0;
    JSON_TOKEN_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = JSON_TOKEN_PATTERN.exec(rawJson)) !== null) {
        result += escapeHtml(rawJson.slice(lastIndex, match.index));
        const token = match[0];
        lastIndex = match.index + token.length;
        const rest = rawJson.slice(lastIndex);
        const isKey = token.startsWith('"') && /^\s*:/.test(rest);
        const cssClass = isKey ? 'json-key'
            : token.startsWith('"') ? 'json-string'
            : token === 'true' || token === 'false' ? 'json-bool'
            : token === 'null' ? 'json-null'
            : 'json-number';
        result += `<span class="${cssClass}">${escapeHtml(token)}</span>`;
    }
    result += escapeHtml(rawJson.slice(lastIndex));
    return result;
}

function jsonPre(rawJson: string): string {
    return `<pre class="json">${syntaxHighlightJson(rawJson)}</pre>`;
}

function truncateJson(obj: unknown, maxDepth: number = 3): unknown {
    if (maxDepth <= 0) return '...';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        if (obj.length > 5) {
            return [...obj.slice(0, 5).map(i => truncateJson(i, maxDepth - 1)), `... (${obj.length - 5} more)`];
        }
        return obj.map(i => truncateJson(i, maxDepth - 1));
    }
    const result: Record<string, unknown> = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
        result[key] = truncateJson((obj as Record<string, unknown>)[key], maxDepth - 1);
    }
    return result;
}

function statusBadge(status: TestStatus): string {
    const colors: Record<TestStatus, string> = {
        pass: '#22c55e',
        fail: '#ef4444',
        error: '#f59e0b',
    };
    const labels: Record<TestStatus, string> = {
        pass: 'PASS',
        fail: 'FAIL',
        error: 'ERROR',
    };
    return `<span style="background:${colors[status]};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.85em;font-weight:600;">${labels[status]}</span>`;
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function buildSummaryBar(verdict: GateVerdict, total: number): string {
    const { passCount, failCount, errorCount } = verdict;
    const pct = (count: number): number => total === 0 ? 0 : (count / total) * 100;
    return `<div class="summary-bar">
    <div>
        <div class="summary-stat pass">${passCount}</div>
        <div class="summary-label">Passed</div>
    </div>
    <div>
        <div class="summary-stat fail">${failCount}</div>
        <div class="summary-label">Failed</div>
    </div>
    <div>
        <div class="summary-stat error">${errorCount}</div>
        <div class="summary-label">Errors</div>
    </div>
    <div>
        <div class="summary-stat">${total}</div>
        <div class="summary-label">Total</div>
    </div>
    <div class="progress-bar">
        <div class="progress-pass" style="width:${pct(passCount)}%"></div>
        <div class="progress-fail" style="width:${pct(failCount)}%"></div>
        <div class="progress-error" style="width:${pct(errorCount)}%"></div>
    </div>
</div>`;
}

// ─── Field presence matrix ───────────────────────────────────────────────────

/** True when a class/field count fraction like `0/4` shows zero out of a non-zero denominator. */
function fractionCellClass(fraction: string): string {
    return fraction.startsWith('0/') && !fraction.startsWith('0/0') ? 'cell-warn' : 'cell-ok';
}

function boolCell(ok: boolean): string {
    return `<td class="${ok ? 'cell-ok' : 'cell-warn'}">${ok ? '✓' : '✗'}</td>`;
}

function buildMatrixRowHtml(row: MatrixRow): string {
    return `<tr>
        <td class="class-name">${escapeHtml(row.className)}</td>
        <td class="${fractionCellClass(row.isStatic.methods)}">${escapeHtml(row.isStatic.methods)}</td>
        <td class="${fractionCellClass(row.isStatic.fields)}">${escapeHtml(row.isStatic.fields)}</td>
        <td class="${fractionCellClass(row.isDeprecated.methods)}">${escapeHtml(row.isDeprecated.methods)}</td>
        <td class="${fractionCellClass(row.isDeprecated.fields)}">${escapeHtml(row.isDeprecated.fields)}</td>
        <td class="${row.isDeprecated.class === 'missing' ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isDeprecated.class)}</td>
        <td class="${row.constructors.startsWith('✗') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.constructors)}</td>
        ${boolCell(row.hasName)}
        ${boolCell(row.hasReturnType)}
        ${boolCell(row.hasType)}
        ${boolCell(row.hasParameters)}
        ${boolCell(row.hasPackageName)}
    </tr>`;
}

function buildMatrixSection(matrixRows: MatrixRow[]): string {
    if (matrixRows.length === 0) {
        return '';
    }
    return `
    <h2>Field Presence Matrix</h2>
    <p class="subtitle">Shows which critical fields the Java interop service provides for each tested class. Gated fields: ${escapeHtml(CRITICAL_FIELDS.join(', '))}.</p>
    <div class="table-wrap">
    <table class="matrix">
        <thead>
            <tr>
                <th>Class</th>
                <th>isStatic (methods)</th>
                <th>isStatic (fields)</th>
                <th>isDeprecated (methods)</th>
                <th>isDeprecated (fields)</th>
                <th>isDeprecated (class)</th>
                <th>constructors</th>
                <th>name</th>
                <th>returnType</th>
                <th>type</th>
                <th>parameters</th>
                <th>packageName</th>
            </tr>
        </thead>
        <tbody>
            ${matrixRows.map(buildMatrixRowHtml).join('')}
        </tbody>
    </table>
    </div>`;
}

// ─── Per-case field-check and assertion tables ──────────────────────────────

function buildFieldCheckTable(fieldChecks: FieldCheck[]): string {
    if (fieldChecks.length === 0) {
        return '';
    }
    const rows = fieldChecks.map(fc => `
                    <tr class="${fc.present && fc.typeMatch ? '' : 'row-warn'}">
                        <td><code>${escapeHtml(fc.field)}</code></td>
                        <td>${escapeHtml(fc.expected)}</td>
                        <td>${escapeHtml(fc.actual)}</td>
                        <td>${fc.present ? '✓' : '✗'}</td>
                        <td>${fc.typeMatch ? '✓' : '✗'}</td>
                        <td>${isCriticalFieldCheck(fc) ? '✓' : ''}</td>
                    </tr>`).join('');
    return `<table class="field-table">
                <thead><tr><th>Field</th><th>Expected</th><th>Actual</th><th>Present</th><th>Type Match</th><th>Critical</th></tr></thead>
                <tbody>${rows}
                </tbody></table>`;
}

function buildAssertionTable(assertions: Assertion[]): string {
    if (assertions.length === 0) {
        return '';
    }
    const rows = assertions.map(a => `
                    <tr class="${a.passed ? '' : 'row-warn'}">
                        <td>${escapeHtml(a.description)}</td>
                        <td>${a.passed ? '✓ Pass' : '✗ Fail'}</td>
                        <td>${a.detail ? escapeHtml(a.detail) : ''}</td>
                    </tr>`).join('');
    return `<table class="assertion-table">
                <thead><tr><th>Assertion</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>${rows}
                </tbody></table>`;
}

// ─── Per-case section ────────────────────────────────────────────────────────

function buildCaseSection(r: TestResult): string {
    const requestJson = toJsonText(r.request);
    const responseJson = toJsonText(truncateJson(r.response, 3));
    const fieldCheckRows = buildFieldCheckTable(r.fieldChecks);
    const assertionRows = buildAssertionTable(r.assertions);

    return `
        <details ${r.status !== 'pass' ? 'open' : ''}>
            <summary>
                ${statusBadge(r.status)}
                <strong>${escapeHtml(r.name)}</strong>
                <span class="method-tag">${escapeHtml(r.method)}</span>
                <span class="duration">${r.durationMs.toFixed(0)}ms</span>
                ${r.errorMessage ? `<span class="error-msg">${escapeHtml(r.errorMessage)}</span>` : ''}
            </summary>
            <div class="test-body">
                <h4>Request</h4>
                ${jsonPre(requestJson)}

                <details>
                    <summary>Response (click to expand)</summary>
                    ${jsonPre(responseJson)}
                </details>

                ${fieldCheckRows ? `<h4>Field Validation</h4>${fieldCheckRows}` : ''}
                ${assertionRows ? `<h4>Assertions</h4>${assertionRows}` : ''}
            </div>
        </details>`;
}

// ─── Report assembly ─────────────────────────────────────────────────────────

/**
 * Assembles the full HTML report from a finished suite run: the summary bar, the field presence
 * matrix (when there are matrix rows), and one section per case. `generatedAt` defaults to the
 * current time; passing a fixed date keeps a test's report text deterministic.
 */
export function generateReport(
    results: TestResult[],
    matrixRows: MatrixRow[],
    verdict: GateVerdict,
    host: string,
    port: number,
    generatedAt: Date = new Date(),
): string {
    const total = results.length;
    const totalDuration = results.reduce((s, r) => s + r.durationMs, 0);

    const headerMeta = `Connection: ${escapeHtml(host)}:${port} &bull;
    Generated: ${escapeHtml(generatedAt.toISOString())} &bull;
    Total duration: ${totalDuration.toFixed(0)}ms`;

    return renderPage({
        headerMeta,
        summaryBar: buildSummaryBar(verdict, total),
        matrixSection: buildMatrixSection(matrixRows),
        testSections: results.map(buildCaseSection).join('\n'),
    });
}
