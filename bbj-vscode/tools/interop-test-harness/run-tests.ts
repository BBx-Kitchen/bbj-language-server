/**
 * Java Interop Test Harness
 *
 * Connects to the live BBj Java interop service over JSON-RPC 2.0 (TCP), exercises all 4 API
 * methods, and generates a self-contained HTML report.
 *
 * The gate checks exactly the fields in CRITICAL_FIELDS (defined in gate.ts): isStatic,
 * isDeprecated, constructors, name, returnType, type, parameters, packageName. A critical field
 * passes only when it is present and of the expected type, matched on the final segment of the
 * field path.
 *
 * Exit codes: 0 when every case passes; 1 when any case fails or errors or a critical field
 * check fails; 2 on a connection failure or a fatal error.
 *
 * Options:
 *   --host      Interop service host (default: 127.0.0.1)
 *   --port      Interop service port (default: 5008)
 *   --output    Report output path (default: report.html next to this file)
 *   --timeout   Connection timeout in milliseconds (default: 15000); bounds the connection
 *               attempt only
 *
 * Usage:
 *   cd bbj-vscode
 *   npm run interop-harness
 *   npm run interop-harness -- --host 192.168.1.100 --port 5008
 *   npm run interop-harness -- --output /tmp/report.html
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { type MessageConnection } from 'vscode-jsonrpc/node.js';
import { runSuite } from './cases.js';
import { CRITICAL_FIELDS, evaluateGate, isCriticalFieldCheck } from './gate.js';
import { connect } from './scaffold.js';
import type { GateVerdict, MatrixRow, TestResult, TestStatus } from './types.js';

// ─── CLI args ───────────────────────────────────────────────────────────────

interface CliArgs {
    host: string;
    port: number;
    timeout: number;
    outputPath: string;
}

function parseCliArgs(): CliArgs {
    const { values: args } = parseArgs({
        options: {
            host: { type: 'string', default: '127.0.0.1' },
            port: { type: 'string', default: '5008' },
            output: { type: 'string' },
            timeout: { type: 'string', default: '15000' },
        },
        strict: true,
    });

    return {
        host: args.host!,
        port: Number(args.port!),
        timeout: Number(args.timeout!),
        outputPath: args.output
            ? resolve(args.output)
            : resolve(dirname(new URL(import.meta.url).pathname), 'report.html'),
    };
}

// ─── HTML report generation ─────────────────────────────────────────────────

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Turns a value into JSON text, the way `syntaxHighlightJson` expects to receive it: an absent
 * value (`JSON.stringify` returning `undefined`) renders as the text `null` instead of throwing
 * when it is later passed through the highlighter.
 */
function toJsonText(value: unknown): string {
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
function syntaxHighlightJson(rawJson: string): string {
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

function generateReport(results: TestResult[], matrixRows: MatrixRow[], host: string, port: number, verdict: GateVerdict): string {
    const { passCount, failCount, errorCount } = verdict;
    const total = results.length;
    const totalDuration = results.reduce((s, r) => s + r.durationMs, 0);
    const timestamp = new Date().toISOString();

    let matrixHtml = '';
    if (matrixRows.length > 0) {
        matrixHtml = `
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
                ${matrixRows.map(row => `
                <tr>
                    <td class="class-name">${escapeHtml(row.className)}</td>
                    <td class="${row.isStatic.methods.startsWith('0/') && !row.isStatic.methods.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isStatic.methods)}</td>
                    <td class="${row.isStatic.fields.startsWith('0/') && !row.isStatic.fields.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isStatic.fields)}</td>
                    <td class="${row.isDeprecated.methods.startsWith('0/') && !row.isDeprecated.methods.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isDeprecated.methods)}</td>
                    <td class="${row.isDeprecated.fields.startsWith('0/') && !row.isDeprecated.fields.startsWith('0/0') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isDeprecated.fields)}</td>
                    <td class="${row.isDeprecated.class === 'missing' ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.isDeprecated.class)}</td>
                    <td class="${row.constructors.startsWith('✗') ? 'cell-warn' : 'cell-ok'}">${escapeHtml(row.constructors)}</td>
                    <td class="${row.hasName ? 'cell-ok' : 'cell-warn'}">${row.hasName ? '✓' : '✗'}</td>
                    <td class="${row.hasReturnType ? 'cell-ok' : 'cell-warn'}">${row.hasReturnType ? '✓' : '✗'}</td>
                    <td class="${row.hasType ? 'cell-ok' : 'cell-warn'}">${row.hasType ? '✓' : '✗'}</td>
                    <td class="${row.hasParameters ? 'cell-ok' : 'cell-warn'}">${row.hasParameters ? '✓' : '✗'}</td>
                    <td class="${row.hasPackageName ? 'cell-ok' : 'cell-warn'}">${row.hasPackageName ? '✓' : '✗'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        </div>`;
    }

    const testSections = results.map(r => {
        const requestJson = toJsonText(r.request);
        const responsePreview = truncateJson(r.response, 3);
        const responseJson = toJsonText(responsePreview);

        const fieldCheckRows = r.fieldChecks.length > 0
            ? `<table class="field-table">
                <thead><tr><th>Field</th><th>Expected</th><th>Actual</th><th>Present</th><th>Type Match</th><th>Critical</th></tr></thead>
                <tbody>${r.fieldChecks.map(fc => `
                    <tr class="${fc.present && fc.typeMatch ? '' : 'row-warn'}">
                        <td><code>${escapeHtml(fc.field)}</code></td>
                        <td>${escapeHtml(fc.expected)}</td>
                        <td>${escapeHtml(fc.actual)}</td>
                        <td>${fc.present ? '✓' : '✗'}</td>
                        <td>${fc.typeMatch ? '✓' : '✗'}</td>
                        <td>${isCriticalFieldCheck(fc) ? '✓' : ''}</td>
                    </tr>`).join('')}
                </tbody></table>`
            : '';

        const assertionRows = r.assertions.length > 0
            ? `<table class="assertion-table">
                <thead><tr><th>Assertion</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>${r.assertions.map(a => `
                    <tr class="${a.passed ? '' : 'row-warn'}">
                        <td>${escapeHtml(a.description)}</td>
                        <td>${a.passed ? '✓ Pass' : '✗ Fail'}</td>
                        <td>${a.detail ? escapeHtml(a.detail) : ''}</td>
                    </tr>`).join('')}
                </tbody></table>`
            : '';

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
                <pre class="json">${syntaxHighlightJson(requestJson)}</pre>

                <details>
                    <summary>Response (click to expand)</summary>
                    <pre class="json">${syntaxHighlightJson(responseJson)}</pre>
                </details>

                ${fieldCheckRows ? `<h4>Field Validation</h4>${fieldCheckRows}` : ''}
                ${assertionRows ? `<h4>Assertions</h4>${assertionRows}` : ''}
            </div>
        </details>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Java Interop Test Report</title>
<style>
:root {
    --bg: #ffffff;
    --fg: #1a1a2e;
    --card-bg: #f8f9fa;
    --border: #dee2e6;
    --subtle: #6c757d;
    --pass: #22c55e;
    --fail: #ef4444;
    --warn: #f59e0b;
    --code-bg: #f1f3f5;
    --json-key: #0550ae;
    --json-string: #0a3069;
    --json-number: #0550ae;
    --json-bool: #cf222e;
    --json-null: #6c757d;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #0d1117;
        --fg: #c9d1d9;
        --card-bg: #161b22;
        --border: #30363d;
        --subtle: #8b949e;
        --code-bg: #1c2128;
        --json-key: #79c0ff;
        --json-string: #a5d6ff;
        --json-number: #79c0ff;
        --json-bool: #ff7b72;
        --json-null: #8b949e;
    }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--fg);
    line-height: 1.6;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

h1 { margin-bottom: 0.5rem; }
h2 { margin: 2rem 0 0.5rem; }
h4 { margin: 1rem 0 0.5rem; }

.subtitle { color: var(--subtle); margin-bottom: 1rem; font-size: 0.9em; }

.header-meta {
    color: var(--subtle);
    font-size: 0.85em;
    margin-bottom: 1.5rem;
}

.summary-bar {
    display: flex;
    gap: 1.5rem;
    padding: 1rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
}

.summary-stat {
    font-size: 1.5rem;
    font-weight: 700;
}
.summary-stat.pass { color: var(--pass); }
.summary-stat.fail { color: var(--fail); }
.summary-stat.error { color: var(--warn); }
.summary-label { font-size: 0.8rem; color: var(--subtle); text-transform: uppercase; }

.progress-bar {
    flex: 1;
    min-width: 200px;
    height: 12px;
    background: var(--border);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
}
.progress-pass { background: var(--pass); }
.progress-fail { background: var(--fail); }
.progress-error { background: var(--warn); }

.table-wrap { overflow-x: auto; margin-bottom: 2rem; }

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;
}

th, td {
    padding: 6px 10px;
    border: 1px solid var(--border);
    text-align: left;
}

th {
    background: var(--card-bg);
    font-weight: 600;
    white-space: nowrap;
}

.matrix td { text-align: center; }
.matrix td.class-name { text-align: left; font-family: monospace; font-weight: 600; }
.cell-ok { background: color-mix(in srgb, var(--pass) 15%, transparent); }
.cell-warn { background: color-mix(in srgb, var(--fail) 15%, transparent); }
.row-warn { background: color-mix(in srgb, var(--fail) 8%, transparent); }

details {
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 0.5rem;
    background: var(--card-bg);
}

details > summary {
    padding: 0.75rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

details > summary::-webkit-details-marker { display: none; }
details > summary::before { content: '▶'; font-size: 0.7em; transition: transform 0.2s; }
details[open] > summary::before { transform: rotate(90deg); }

.test-body { padding: 1rem; border-top: 1px solid var(--border); }

.method-tag {
    font-family: monospace;
    font-size: 0.8em;
    background: var(--code-bg);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--subtle);
}

.duration { font-size: 0.8em; color: var(--subtle); }
.error-msg { font-size: 0.8em; color: var(--fail); font-style: italic; }

pre.json {
    background: var(--code-bg);
    padding: 0.75rem;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.8em;
    line-height: 1.5;
    max-height: 400px;
    overflow-y: auto;
}

.json-key { color: var(--json-key); }
.json-string { color: var(--json-string); }
.json-number { color: var(--json-number); }
.json-bool { color: var(--json-bool); }
.json-null { color: var(--json-null); font-style: italic; }

code { font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 0.9em; }

.field-table, .assertion-table { margin-bottom: 1rem; }
</style>
</head>
<body>
<h1>Java Interop Test Report</h1>
<div class="header-meta">
    Connection: ${escapeHtml(host)}:${port} &bull;
    Generated: ${escapeHtml(timestamp)} &bull;
    Total duration: ${totalDuration.toFixed(0)}ms
</div>

<div class="summary-bar">
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
        <div class="progress-pass" style="width:${(passCount / total) * 100}%"></div>
        <div class="progress-fail" style="width:${(failCount / total) * 100}%"></div>
        <div class="progress-error" style="width:${(errorCount / total) * 100}%"></div>
    </div>
</div>

${matrixHtml}

<h2>Test Results</h2>
${testSections}

</body>
</html>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const { host, port, timeout, outputPath } = parseCliArgs();

    console.log(`\n  Java Interop Test Harness`);
    console.log(`  ========================`);
    console.log(`  Host: ${host}:${port}`);
    console.log(`  Timeout: ${timeout}ms`);
    console.log(`  Output: ${outputPath}\n`);

    // Connect
    let conn: MessageConnection;
    try {
        process.stdout.write('  Connecting... ');
        conn = await connect(host, port, timeout);
        console.log('OK\n');
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`FAILED\n\n  Error: ${message}\n`);
        console.error('  Make sure the BBj interop service is running on the specified host/port.\n');
        process.exit(2);
    }

    // Run tests
    const { results, matrixRows } = await runSuite(conn, (index, total, result) => {
        const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
        console.log(`  [${index}/${total}] ${icon} ${result.name} (${result.durationMs.toFixed(0)}ms)`);
    });

    // Disconnect
    conn.dispose();

    // Summary — the one verdict that drives the console output, the report and the exit code
    const verdict = evaluateGate(results);

    console.log(`\n  ─────────────────────────────`);
    console.log(`  Results: ${verdict.passCount} passed, ${verdict.failCount} failed, ${verdict.errorCount} errors`);

    if (verdict.criticalFailures.length > 0) {
        console.log(`  Critical field failures:`);
        for (const cf of verdict.criticalFailures) {
            console.log(`    ✗ ${cf.caseName}: ${cf.field}`);
        }
    }

    // Generate report
    const html = generateReport(results, matrixRows, host, port, verdict);
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`  Report: ${outputPath}\n`);

    process.exit(verdict.exitCode);
}

main().catch(err => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  Fatal error: ${message}\n`);
    process.exit(2);
});
