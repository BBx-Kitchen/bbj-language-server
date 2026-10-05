import { NodeFileSystem } from 'langium/node';
import * as os from 'node:os';
import * as path from 'node:path';
import { CancellationTokenSource } from 'vscode-jsonrpc/node.js';
import { CancellationToken, LSPErrorCodes } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { afterAll, beforeAll, describe, expect, test, vi, type TestContext } from 'vitest';
import { createBBjServices } from '../../src/language/bbj-module.js';
import {
    DENUMBER_ACTION, DENUMBER_AND_FORMAT_ACTION, DENUMBER_AND_FORMAT_EDIT_LABEL, DENUMBER_EDIT_LABEL,
    DENUM_AND_FORMAT_SUCCESS_MESSAGE, DENUM_NOTHING_TO_DO_MESSAGE, DENUM_OFFER_MESSAGE, DENUM_SUCCESS_MESSAGE,
    SHOW_DENUM_DIAGNOSTICS_ACTION, type DenumMessenger
} from '../../src/language/bbj-denum-service.js';
import { GO_TO_LINE_ACTION, type FormatMessenger } from '../../src/language/bbj-format-service.js';
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
/** Numbered and unnumbered lines together, which a format without the denumber permission refuses. */
const MIXED_NUMBERING_TEXT = '0010 print 1\nprint 2\n';

/** 1,000 lines of the small program's statements repeated, which the formatter rewrites. */
function thousandLineProgramText(): string {
    const lines: string[] = [];
    while (lines.length < 1000) {
        lines.push(...SMALL_FORMAT_TEXT.trimEnd().split('\n'));
    }
    return lines.slice(0, 1000).join('\n') + '\n';
}

/** A messenger that keeps what the format service would have shown, so a test can assert silence. */
function recordingMessenger(shown: string[]): FormatMessenger {
    return {
        warn: text => { shown.push(text); },
        warnWithAction: text => { shown.push(text); },
        showDocument: () => undefined,
        openFormatterSettings: () => undefined
    };
}

/** One recorded call of a {@link DenumMessenger}: the method name and its arguments. */
interface DenumCall {
    method: string;
    args: unknown[];
}

/**
 * A denum messenger that records every call. Its `applyEdit` records the edit like the others and
 * resolves true, as a client that accepted it would.
 */
function recordingDenumMessenger(log: DenumCall[]): DenumMessenger {
    const record = (method: string) => (...args: unknown[]): void => { log.push({ method, args }); };
    return {
        info: record('info'),
        warn: record('warn'),
        infoWithAction: record('infoWithAction'),
        warnWithAction: record('warnWithAction'),
        warnWithActions: record('warnWithActions'),
        showDocument: record('showDocument'),
        openFormatterSettings: record('openFormatterSettings'),
        denumDiagnostics: record('denumDiagnostics'),
        showDenumDiagnostics: record('showDenumDiagnostics'),
        applyEdit: (...args) => {
            log.push({ method: 'applyEdit', args });
            return Promise.resolve(true);
        }
    };
}

function callsOf(log: DenumCall[], method: string): DenumCall[] {
    return log.filter(call => call.method === method);
}

/** True when a line of `text` starts with a four-digit line number and a space. */
function hasNumberedLine(text: string): boolean {
    return text.split('\n').some(line => /^\d{4} /.test(line));
}

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

    test.runIf(run)('the production format service returns edits, and formatting its own output again returns none', async ctx => {
        requireLivePeer(ctx);

        const formatService = services.BBj.compiler.BBjFormatService;
        const shown: string[] = [];
        formatService.setMessenger(recordingMessenger(shown));
        const uri = 'file:///tmp/program-live-format-service.bbj';

        const first = TextDocument.create(uri, 'bbj', 1, SMALL_FORMAT_TEXT);
        const edits = await formatService.format({ document: first, current: () => first }, CancellationToken.None);
        expect(Array.isArray(edits)).toBe(true);

        const formattedText = TextDocument.applyEdits(first, edits);
        const second = TextDocument.create(uri, 'bbj', 2, formattedText);
        const again = await formatService.format({ document: second, current: () => second }, CancellationToken.None);

        console.log(`program-live: format service first edits=${edits.length} second edits=${again.length}`);
        expect(again).toEqual([]);
        expect(shown).toEqual([]);
    }, 60000);

    test.runIf(run)('the 15 default settings and the settings made from a legacy key and a javaPath are accepted', async ctx => {
        requireLivePeer(ctx);

        const formatService = services.BBj.compiler.BBjFormatService;
        try {
            const defaults = formatService.settingsSnapshot();
            expect(Object.keys(defaults)).toHaveLength(15);
            const withDefaults = await interop.formatProgram({
                text: SMALL_FORMAT_TEXT, version: nextVersion('settings-default'), settings: defaults
            });
            expect(withDefaults.kind).toBe('ok');

            formatService.setSettings({ splitSingleLineIF: true, javaPath: '/usr/bin/java', indentWidth: 2 });
            const converted = formatService.settingsSnapshot();
            expect(Object.keys(converted)).toHaveLength(15);
            const withConverted = await interop.formatProgram({
                text: SMALL_FORMAT_TEXT, version: nextVersion('settings-converted'), settings: converted
            });
            expect(withConverted.kind).toBe('ok');
        } finally {
            formatService.setSettings({});
        }
        expect(Object.keys(formatService.settingsSnapshot())).toHaveLength(15);
    }, 60000);

    test.runIf(run)('a mixed-numbered file sent without the denumber permission is answered denum-needed', async ctx => {
        requireLivePeer(ctx);

        const outcome = await interop.formatProgram({ text: MIXED_NUMBERING_TEXT, version: nextVersion('mixed') });

        console.log(`program-live: mixed-numbered file without denumber permission kind=${outcome.kind}${outcome.kind === 'failed' ? ` failure=${outcome.failure}` : ''}`);
        expect(outcome.kind).toBe('failed');
        if (outcome.kind !== 'failed') return;
        expect(outcome.failure).toBe('denum-needed');
    }, 60000);

    test.runIf(run)('the first format on a fresh program connection, timed through the production format service', async ctx => {
        requireLivePeer(ctx);

        const text = thousandLineProgramText();
        const runs: number[] = [];
        for (let i = 0; i < RUNS; i++) {
            const fresh = createBBjServices(NodeFileSystem);
            const freshInterop = fresh.BBj.java.JavaInteropService;
            freshInterop.setConnectionConfig(HOST, PORT);
            const document = TextDocument.create(`file:///tmp/program-live-first-format-${i}.bbj`, 'bbj', 1, text);
            try {
                const { ms, value } = await timed(() => fresh.BBj.compiler.BBjFormatService.format(
                    { document, current: () => document }, CancellationToken.None
                ));
                // A text the formatter leaves alone would answer no edits and prove nothing about a real format.
                expect(value.length).toBeGreaterThan(0);
                runs.push(ms);
            } finally {
                freshInterop.clearCache();
            }
        }
        console.log(`program-live: first format on a fresh program connection median=${Math.round(median(runs))}ms runs=[${rounded(runs)}]`);
    }, 120000);

    test.runIf(run)('the production denumber service denumbers a numbered buffer into one applied edit', async ctx => {
        requireLivePeer(ctx);

        const denum = services.BBj.compiler.BBjDenumService;
        const log: DenumCall[] = [];
        denum.setMessenger(recordingDenumMessenger(log));
        const document = TextDocument.create('file:///tmp/program-live-denum-numbered.bbj', 'bbj', 1, SMALL_NUMBERED_TEXT);

        const result = await denum.run({ uri: document.uri, current: () => document }, CancellationToken.None);

        console.log(`program-live: denumber numbered status=${result.status} reason=${result.reason ?? 'none'}`);
        expect(result.status).toBe('denumbered');
        expect(result.applied).toBe(true);
        const applied = callsOf(log, 'applyEdit');
        expect(applied).toHaveLength(1);
        expect(applied[0].args[1]).toBe(1);
        expect(applied[0].args[3]).toBe(DENUMBER_EDIT_LABEL);
        const after = TextDocument.applyEdits(document, applied[0].args[2] as Parameters<typeof TextDocument.applyEdits>[1]);
        expect(after).toContain('L10');
        expect(hasNumberedLine(after)).toBe(false);
        expect(callsOf(log, 'info').map(call => call.args[0])).toEqual([DENUM_SUCCESS_MESSAGE]);
    }, 60000);

    test.runIf(run)('the production denumber service leaves an unnumbered buffer alone', async ctx => {
        requireLivePeer(ctx);

        const denum = services.BBj.compiler.BBjDenumService;
        const log: DenumCall[] = [];
        denum.setMessenger(recordingDenumMessenger(log));
        const document = TextDocument.create('file:///tmp/program-live-denum-plain.bbj', 'bbj', 1, 'print 1\n');

        const result = await denum.run({ uri: document.uri, current: () => document }, CancellationToken.None);

        console.log(`program-live: denumber unnumbered status=${result.status} reason=${result.reason ?? 'none'}`);
        expect(result.status).toBe('not-line-numbered');
        expect(callsOf(log, 'applyEdit')).toEqual([]);
        expect(callsOf(log, 'info').map(call => call.args[0])).toEqual([DENUM_NOTHING_TO_DO_MESSAGE]);
    }, 60000);

    test.runIf(run)('the production denumber service names the first offending line of a mixed-numbered buffer', async ctx => {
        requireLivePeer(ctx);

        const denum = services.BBj.compiler.BBjDenumService;
        const log: DenumCall[] = [];
        denum.setMessenger(recordingDenumMessenger(log));
        const document = TextDocument.create('file:///tmp/program-live-denum-mixed.bbj', 'bbj', 1, MIXED_NUMBERING_TEXT);

        const result = await denum.run({ uri: document.uri, current: () => document }, CancellationToken.None);

        console.log(`program-live: denumber mixed status=${result.status} reason=${result.reason ?? 'none'} line=${result.line ?? 'none'}`);
        expect(result.status).toBe('failed');
        expect(result.reason).toBe('mixed-numbering');
        expect(result.line).toBe(1);
        expect(callsOf(log, 'applyEdit')).toEqual([]);
        const warned = callsOf(log, 'warnWithAction');
        expect(warned).toHaveLength(1);
        expect(warned[0].args[0]).toBe('Mixed line numbering at line 2. The file was not changed.');
        expect(warned[0].args[1]).toBe(GO_TO_LINE_ACTION);
    }, 60000);

    test.runIf(run)('a tokenized buffer is refused before anything is sent to bbj-ls', async ctx => {
        requireLivePeer(ctx);

        const denum = services.BBj.compiler.BBjDenumService;
        const log: DenumCall[] = [];
        denum.setMessenger(recordingDenumMessenger(log));
        const denumSpy = vi.spyOn(interop, 'denumProgram');
        const formatSpy = vi.spyOn(interop, 'formatProgram');
        try {
            const document = TextDocument.create('file:///tmp/program-live-denum-tokenized.bbj', 'bbj', 1, '<<bbj>>abc');

            const result = await denum.run({ uri: document.uri, current: () => document }, CancellationToken.None);

            console.log(`program-live: denumber tokenized status=${result.status} reason=${result.reason ?? 'none'}`);
            expect(result.status).toBe('failed');
            expect(result.reason).toBe('tokenized');
            expect(denumSpy).not.toHaveBeenCalled();
            expect(formatSpy).not.toHaveBeenCalled();
            expect(callsOf(log, 'warn')).toHaveLength(1);
        } finally {
            denumSpy.mockRestore();
            formatSpy.mockRestore();
        }
    }, 60000);

    test.runIf(run)('a numbered buffer with a syntax error is denumbered and ends with the diagnostics list and a counts warning', async ctx => {
        requireLivePeer(ctx);

        const denum = services.BBj.compiler.BBjDenumService;
        const log: DenumCall[] = [];
        denum.setMessenger(recordingDenumMessenger(log));
        const document = TextDocument.create('file:///tmp/program-live-denum-syntax-error.bbj', 'bbj', 1, '0010 if then\n0020 print 1\n');

        const result = await denum.run({ uri: document.uri, current: () => document }, CancellationToken.None);

        console.log(`program-live: denumber syntax error status=${result.status} diagnostics=${JSON.stringify(result.diagnostics ?? [])}`);
        expect(result.status).toBe('denumbered');
        expect(result.diagnostics?.some(diagnostic => diagnostic.severity === 'ERROR')).toBe(true);
        const listed = callsOf(log, 'denumDiagnostics');
        expect(listed).toHaveLength(1);
        expect((listed[0].args[0] as { uri: string }).uri).toBe(document.uri);
        const warned = callsOf(log, 'warnWithAction');
        expect(warned).toHaveLength(1);
        expect(String(warned[0].args[0]).startsWith('Denumbered. ')).toBe(true);
        expect(warned[0].args[1]).toBe(SHOW_DENUM_DIAGNOSTICS_ACTION);
    }, 60000);

    test.runIf(run)('Denumber and Format is one formatProgram call with the denumber permission and one applied edit', async ctx => {
        requireLivePeer(ctx);

        const denum = services.BBj.compiler.BBjDenumService;
        const log: DenumCall[] = [];
        denum.setMessenger(recordingDenumMessenger(log));
        const formatSpy = vi.spyOn(interop, 'formatProgram');
        const denumSpy = vi.spyOn(interop, 'denumProgram');
        try {
            const document = TextDocument.create('file:///tmp/program-live-denum-and-format.bbj', 'bbj', 1, SMALL_NUMBERED_TEXT);

            const result = await denum.runDenumAndFormat({ uri: document.uri, current: () => document }, CancellationToken.None);

            console.log(`program-live: denumber and format status=${result.status} reason=${result.reason ?? 'none'} calls=${formatSpy.mock.calls.length}`);
            expect(result.status).toBe('denumbered');
            expect(formatSpy).toHaveBeenCalledTimes(1);
            expect(denumSpy).not.toHaveBeenCalled();
            const sent = formatSpy.mock.calls[0][0];
            expect(sent.allowDenum).toBe(true);
            expect(sent).not.toHaveProperty('canonicalName');
            const applied = callsOf(log, 'applyEdit');
            expect(applied).toHaveLength(1);
            expect(applied[0].args[3]).toBe(DENUMBER_AND_FORMAT_EDIT_LABEL);
            const after = TextDocument.applyEdits(document, applied[0].args[2] as Parameters<typeof TextDocument.applyEdits>[1]);
            expect(after).toContain('L10');
            expect(hasNumberedLine(after)).toBe(false);
            expect(callsOf(log, 'info').map(call => call.args[0])).toEqual([DENUM_AND_FORMAT_SUCCESS_MESSAGE]);
        } finally {
            formatSpy.mockRestore();
            denumSpy.mockRestore();
        }
    }, 60000);

    test.runIf(run)('Format Document on a numbered buffer returns no edits and raises the offer with both actions', async ctx => {
        requireLivePeer(ctx);

        const formatService = services.BBj.compiler.BBjFormatService;
        const denum = services.BBj.compiler.BBjDenumService;
        const shown: string[] = [];
        const log: DenumCall[] = [];
        formatService.setMessenger(recordingMessenger(shown));
        denum.setMessenger(recordingDenumMessenger(log));
        const document = TextDocument.create('file:///tmp/program-live-denum-offer.bbj', 'bbj', 1, SMALL_NUMBERED_TEXT);

        const edits = await formatService.format({ document, current: () => document }, CancellationToken.None);

        console.log(`program-live: offer edits=${edits.length} offers=${callsOf(log, 'warnWithActions').length}`);
        expect(edits).toEqual([]);
        expect(shown).toEqual([]);
        const offers = callsOf(log, 'warnWithActions');
        expect(offers).toHaveLength(1);
        expect(offers[0].args[0]).toBe(DENUM_OFFER_MESSAGE);
        expect(offers[0].args[1]).toEqual([DENUMBER_ACTION, DENUMBER_AND_FORMAT_ACTION]);
        expect(callsOf(log, 'applyEdit')).toEqual([]);
    }, 60000);
});
