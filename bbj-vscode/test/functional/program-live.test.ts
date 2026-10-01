import { NodeFileSystem } from 'langium/node';
import * as os from 'node:os';
import * as path from 'node:path';
import { CancellationTokenSource } from 'vscode-jsonrpc/node.js';
import { LSPErrorCodes } from 'vscode-languageserver';
import { afterAll, beforeAll, describe, expect, test, type TestContext } from 'vitest';
import { createBBjServices } from '../../src/language/bbj-module.js';
import type { ProgramOutcome } from '../../src/language/java-interop-program-types.js';
import { connect } from '../../tools/interop-test-harness/scaffold.js';
import { shouldRunBBjTests } from '../test-helper.js';

/**
 * The RUN_BBJ_TESTS-gated live confirmation that the format and DENUM client works against the
 * real bbj-ls, through the language server's own `JavaInteropService`. It calls the client
 * directly and never builds a document: a build on this path reaches the compiler and interop
 * services and is flaky locally and red on CI.
 *
 * With the gate closed this file contributes skipped tests only and opens no connection. With the
 * gate open it probes first and skips (never fails) when the peer is unreachable or does not serve
 * the methods. The measurement test prints its numbers with a `program-live:` prefix so they can be
 * copied into the phase record; no millisecond bar is asserted anywhere.
 *
 * Every program text is generated here from short synthetic statements.
 */

const HOST = '127.0.0.1';
const PORT = 5008;
const RUNS = 3;
/** Lets a large request reach the peer before the small request that is timed behind it goes out. */
const HEAD_START_MS = 30;
/** Bounds a raw request that the peer may never answer. */
const RAW_GUARD_MS = 15000;

const SMALL_FORMAT_TEXT = 'if a then print 1\n  x=1\nrem y\n';
const SMALL_NUMBERED_TEXT = '0010 print 1\n0020 goto 0010\n';

/** 20,000 lines alternating a comment and an assignment. */
function largeProgramText(): string {
    const lines: string[] = [];
    for (let n = 1; n <= 20000; n++) {
        lines.push(n % 2 === 1 ? `rem line ${n}` : `x${n} = ${n}`);
    }
    return lines.join('\n') + '\n';
}

/** 9,999 numbered lines with five-digit line numbers 00010, 00020, ... */
function largeNumberedText(): string {
    const lines: string[] = [];
    for (let n = 1; n <= 9999; n++) {
        lines.push(`${String(n * 10).padStart(5, '0')} print ${n}`);
    }
    return lines.join('\n') + '\n';
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

function rounded(values: number[]): string {
    return values.map(value => Math.round(value)).join(', ');
}

/** Times one call; the result is returned with the elapsed milliseconds. */
async function timed<T>(call: () => Promise<T>): Promise<{ ms: number; value: T }> {
    const start = performance.now();
    const value = await call();
    return { ms: performance.now() - start, value };
}

/**
 * Starts a large request without awaiting it, gives it a head start, times a small request while
 * the large one is pending, then settles the large one.
 */
async function timedBehind<P, S>(large: () => Promise<P>, small: () => Promise<S>): Promise<{ ms: number; large: P; small: S }> {
    const pending = large();
    pending.catch(() => undefined);
    await sleep(HEAD_START_MS);
    const { ms, value } = await timed(small);
    return { ms, large: await pending, small: value };
}

/** One warm-up, then RUNS timed runs; prints the median and the runs under the given label. */
async function sample(label: string, scenario: () => Promise<number>): Promise<number> {
    await scenario();
    const runs: number[] = [];
    for (let i = 0; i < RUNS; i++) {
        runs.push(await scenario());
    }
    const middle = median(runs);
    console.log(`program-live: ${label} median=${Math.round(middle)}ms runs=[${rounded(runs)}]`);
    return middle;
}

/** Set by the probe; a non-empty value means every test skips. */
let skipReason: string | undefined;
/** Set by the probe when it failed for a reason that is not "unavailable"; every test asserts it. */
let probeFailure: ProgramOutcome<unknown> | undefined;

function requireLivePeer(ctx: TestContext): void {
    if (skipReason) ctx.skip();
    expect(probeFailure).toBeUndefined();
}

describe('formatProgram and denumProgram - the live endpoint through the language server client (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const services = createBBjServices(NodeFileSystem);
    const interop = services.BBj.java.JavaInteropService;
    let versionCounter = 0;

    function nextVersion(label: string): string {
        versionCounter++;
        return `live-${label}-${versionCounter}`;
    }

    function parseParams(text: string, name: string, label: string) {
        return {
            text,
            canonicalName: path.join(os.tmpdir(), name),
            version: nextVersion(label),
            prefixes: [] as string[],
            workspaceRoots: [] as string[]
        };
    }

    beforeAll(async () => {
        if (!run) return;
        interop.setConnectionConfig(HOST, PORT);
        const probe = await interop.formatProgram({ text: 'rem probe\n', version: 'live-probe' });
        if (probe.kind === 'unavailable') {
            skipReason = `probe answered unavailable/${probe.reason}`;
            console.log(`program-live: skipped - ${skipReason}`);
        } else if (probe.kind !== 'ok') {
            probeFailure = probe;
        }
    }, 120000);

    afterAll(() => {
        if (run) interop.clearCache();
    });

    test.runIf(run)('a whole-document format returns a typed ok result', async ctx => {
        requireLivePeer(ctx);

        const outcome = await interop.formatProgram({
            text: SMALL_FORMAT_TEXT,
            version: 'live-whole-v1'
        });

        expect(outcome.kind).toBe('ok');
        if (outcome.kind !== 'ok') return;
        expect(outcome.result.scope).toBe('document');
        expect(outcome.result.version).toBe('live-whole-v1');
        if (outcome.result.scope !== 'document') return;
        expect(typeof outcome.result.text).toBe('string');
        expect(Array.isArray(outcome.result.diagnostics)).toBe(true);
    }, 60000);

    test.runIf(run)('a range format returns a typed ok result with at most one edit', async ctx => {
        requireLivePeer(ctx);

        const outcome = await interop.formatProgram({
            text: SMALL_FORMAT_TEXT,
            version: 'live-range-v1',
            range: { start: { line: 0, character: 0 }, end: { line: 2, character: 0 } }
        });

        expect(outcome.kind).toBe('ok');
        if (outcome.kind !== 'ok') return;
        expect(outcome.result.scope).toBe('range');
        expect(outcome.result.version).toBe('live-range-v1');
        if (outcome.result.scope !== 'range') return;
        expect(outcome.result.edits.length).toBeLessThanOrEqual(1);
    }, 60000);

    test.runIf(run)('DENUM removes the line numbers of a numbered program and leaves an unnumbered one alone', async ctx => {
        requireLivePeer(ctx);

        const numbered = await interop.denumProgram({ text: SMALL_NUMBERED_TEXT, version: 'live-denum-v1' });
        expect(numbered.kind).toBe('ok');
        if (numbered.kind === 'ok') {
            expect(numbered.result.denumbered).toBe(true);
            expect(numbered.result.version).toBe('live-denum-v1');
            expect(numbered.result.text.split('\n')[0].startsWith('0010')).toBe(false);
        }

        const plain = await interop.denumProgram({ text: 'print 1\n', version: 'live-denum-plain-v1' });
        expect(plain.kind).toBe('ok');
        if (plain.kind === 'ok') {
            expect(plain.result.denumbered).toBe(false);
            expect(plain.result.text).toBe('print 1\n');
        }
    }, 60000);

    test.runIf(run)('DENUM latency behind a pending parse, on the shared connection and on the dedicated one', async ctx => {
        requireLivePeer(ctx);

        const largeText = largeProgramText();
        const numberedText = largeNumberedText();

        // Idle: a small DENUM and a small parse through the client.
        await interop.denumProgram({ text: SMALL_NUMBERED_TEXT, version: nextVersion('warm') });
        await interop.parseProgram(parseParams('rem warm\n', 'program-live-warm.bbj', 'warm'));
        await sample('idle small denum (client)', async () => {
            const { ms, value } = await timed(() => interop.denumProgram({ text: SMALL_NUMBERED_TEXT, version: nextVersion('idle') }));
            expect(value.kind).toBe('ok');
            return ms;
        });

        // How long the large parse takes on its own, to read the scenarios below against.
        await sample('idle large parse (client)', async () => {
            const { ms, value } = await timed(() => interop.parseProgram(parseParams(largeText, 'program-live-idle-large.bbj', 'idle-large')));
            expect(Array.isArray(value.errors)).toBe(true);
            return ms;
        });

        // (a) Baseline: a raw connection, the large parse and the small DENUM on the same connection.
        const raw = await connect(HOST, PORT, 10000);
        try {
            await sample('(a) small denum behind a pending parse, same raw connection', async () => {
                const { ms, large, small } = await timedBehind(
                    () => raw.sendRequest<{ errors?: unknown }>('parseProgram', parseParams(largeText, 'program-live-raw-large.bbj', 'raw')),
                    () => raw.sendRequest<{ denumbered?: boolean }>('denumProgram', { text: SMALL_NUMBERED_TEXT, version: nextVersion('raw-denum') })
                );
                expect(Array.isArray(large.errors)).toBe(true);
                expect(small.denumbered).toBe(true);
                return ms;
            });
        } finally {
            raw.dispose();
        }

        // (b) The dedicated lane: the large parse on the parse lane, the small DENUM on the program lane.
        await sample('(b) small denum behind a pending parse, dedicated lane', async () => {
            const { ms, large, small } = await timedBehind(
                () => interop.parseProgram(parseParams(largeText, 'program-live-lane-large.bbj', 'lane')),
                () => interop.denumProgram({ text: SMALL_NUMBERED_TEXT, version: nextVersion('lane-denum') })
            );
            expect(Array.isArray(large.errors)).toBe(true);
            expect(small.kind).toBe('ok');
            return ms;
        });

        // (c) Parse latency: idle, then while a large DENUM runs on the program lane.
        await sample('(c) idle small parse', async () => {
            const { ms, value } = await timed(() => interop.parseProgram(parseParams('rem small\nx = 1\n', 'program-live-small.bbj', 'idle-parse')));
            expect(Array.isArray(value.errors)).toBe(true);
            return ms;
        });
        await sample('(c) small parse while a large denum runs', async () => {
            const { ms, large, small } = await timedBehind(
                () => interop.denumProgram({ text: numberedText, version: nextVersion('large-denum') }),
                () => interop.parseProgram(parseParams('rem small\nx = 1\n', 'program-live-small.bbj', 'busy-parse'))
            );
            expect(large.kind).toBe('ok');
            expect(Array.isArray(small.errors)).toBe(true);
            return ms;
        });
    }, 180000);

    test.runIf(run)('whether bbj-ls honours a cancelled DENUM request on a raw connection', async ctx => {
        requireLivePeer(ctx);

        const raw = await connect(HOST, PORT, 10000);
        const source = new CancellationTokenSource();
        let guardTimer: ReturnType<typeof setTimeout> | undefined;
        try {
            const request = raw
                .sendRequest('denumProgram', { text: largeNumberedText(), version: nextVersion('raw-cancel') }, source.token)
                .then(
                    () => ({ settled: 'result' as const, code: undefined as number | undefined }),
                    (error: unknown) => ({ settled: 'error' as const, code: (error as { code?: number } | undefined)?.code })
                );
            const guard = new Promise<{ settled: 'guard'; code: undefined }>(resolve => {
                guardTimer = setTimeout(() => resolve({ settled: 'guard', code: undefined }), RAW_GUARD_MS);
            });

            await sleep(20);
            const cancelledAt = performance.now();
            source.cancel();
            const settled = await Promise.race([request, guard]);
            const ms = performance.now() - cancelledAt;

            const honoured = settled.settled === 'error' && settled.code === LSPErrorCodes.RequestCancelled;
            // The peer's behaviour is a finding to record, not a contract to assert.
            console.log(`program-live: cancel honoured=${honoured ? 'yes' : 'no'} code=${settled.code ?? 'none'} ms=${Math.round(ms)}`);
        } finally {
            if (guardTimer !== undefined) clearTimeout(guardTimer);
            source.dispose();
            raw.dispose();
        }
    }, 60000);

    test.runIf(run)('a cancelled DENUM through the client settles as cancelled', async ctx => {
        requireLivePeer(ctx);

        // Open the dedicated connection first so the cancel lands on a request that is in flight.
        const warm = await interop.denumProgram({ text: SMALL_NUMBERED_TEXT, version: nextVersion('cancel-warm') });
        expect(warm.kind).toBe('ok');

        const source = new CancellationTokenSource();
        try {
            const pending = interop.denumProgram({ text: largeNumberedText(), version: nextVersion('client-cancel') }, source.token);
            await sleep(20);
            const cancelledAt = performance.now();
            source.cancel();
            const outcome = await pending;
            const ms = performance.now() - cancelledAt;

            console.log(`program-live: client cancel outcome=${outcome.kind} ms=${Math.round(ms)}`);
            expect(outcome.kind).toBe('cancelled');
        } finally {
            source.dispose();
        }
    }, 60000);
});
