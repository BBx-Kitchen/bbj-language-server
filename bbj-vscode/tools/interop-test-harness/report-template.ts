/**
 * The interop test harness report's static shell: the CSS text and the one function that
 * interpolates already-built, already-escaped HTML fragments into the full document. No logic
 * and no runtime file read — the CSS lives here as a plain string constant, moved verbatim from
 * the report's former inline `<style>` block, so the template stays type-checked with nothing to
 * look up at run time.
 */

/** The report page's CSS, unchanged from the harness's original inline `<style>` block. */
export const REPORT_STYLES = `
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
`;

/** Already-built, already-escaped HTML fragments `renderPage` assembles into the full document. */
export interface ReportPageParts {
    /** The one-line connection/generated/duration meta line under the title. */
    headerMeta: string;
    /** The summary-bar div (pass/fail/error/total counts and the progress bar). */
    summaryBar: string;
    /** The field presence matrix section, or the empty string when there are no matrix rows. */
    matrixSection: string;
    /** The concatenated per-case `<details>` sections. */
    testSections: string;
}

/**
 * The report page's one template literal. Takes already-built, already-escaped fragments and
 * returns the whole self-contained HTML document; it never escapes or builds a fragment itself.
 */
export function renderPage(parts: ReportPageParts): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Java Interop Test Report</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<h1>Java Interop Test Report</h1>
<div class="header-meta">
    ${parts.headerMeta}
</div>

${parts.summaryBar}

${parts.matrixSection}

<h2>Test Results</h2>
${parts.testSections}

</body>
</html>`;
}
