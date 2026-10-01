import { NodeFileSystem } from 'langium/node';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../../src/language/bbj-module.js';
import type { ProgramOutcome } from '../../src/language/java-interop-program-types.js';
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

/** Set by the probe; a non-empty value means every test skips. */
let skipReason: string | undefined;
/** Set by the probe when it failed for a reason that is not "unavailable"; every test asserts it. */
let probeFailure: ProgramOutcome<unknown> | undefined;

describe('formatProgram and denumProgram - the live endpoint through the language server client (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const services = createBBjServices(NodeFileSystem);
    const interop = services.BBj.java.JavaInteropService;

    beforeAll(async () => {
        if (!run) return;
        interop.setConnectionConfig('127.0.0.1', 5008);
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
        if (skipReason) ctx.skip();
        expect(probeFailure).toBeUndefined();

        const outcome = await interop.formatProgram({
            text: 'if a then print 1\n  x=1\nrem y\n',
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
});
