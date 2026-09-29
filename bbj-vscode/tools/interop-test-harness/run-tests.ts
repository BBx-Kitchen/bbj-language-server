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
import { evaluateGate } from './gate.js';
import { generateReport } from './report.js';
import { connect } from './scaffold.js';

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
    const html = generateReport(results, matrixRows, verdict, host, port);
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`  Report: ${outputPath}\n`);

    process.exit(verdict.exitCode);
}

main().catch(err => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  Fatal error: ${message}\n`);
    process.exit(2);
});
