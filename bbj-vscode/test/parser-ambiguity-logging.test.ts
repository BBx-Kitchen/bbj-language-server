import { EmptyFileSystem } from 'langium';
import { expectCompletion } from 'langium/test';
import { describe, expect, test, vi } from 'vitest';
import { createBBjTestServices } from './bbj-test-module';

// Regression: chevrotain-allstar's lookahead strategy logs "Ambiguous Alternatives
// Detected" via console.log. The main LangiumParser reroutes that to the debug
// logger, but the CompletionParser was left with the default logging and leaked
// raw messages into the LS output channel during completion. Both parsers must
// suppress it now.
describe('parser ambiguity logging', () => {
    const services = createBBjTestServices(EmptyFileSystem).BBj;

    test('both main and completion parsers reroute ambiguity logging', () => {
        for (const parser of [services.parser.LangiumParser, services.parser.CompletionParser]) {
            const logging = (parser as any).wrapper?.lookaheadStrategy?.logging;
            expect(typeof logging).toBe('function');
            expect(String(logging)).toContain('isDebug');
        }
    });

    test('completion does not print raw ambiguity noise to console.log', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
        try {
            const completion = expectCompletion(services);
            // Statement-position completion exercises the ambiguous SingleStatement OR.
            await completion({ text: `bye\n<|>`, index: 0, assert: () => { } });
            const leaked = spy.mock.calls.some(args =>
                args.some(a => typeof a === 'string' && /Ambiguous Alternatives|prefix path/.test(a)));
            expect(leaked).toBe(false);
        } finally {
            spy.mockRestore();
        }
    });
});
