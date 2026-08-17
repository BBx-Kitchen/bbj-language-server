/**
 * Child entry point for the out-of-process termination guard (#492).
 *
 * Validates every input in `line-break-walk-inputs.ts` and exits 0. If any backward
 * walk in `line-break-validation.ts` stops advancing, this process spins forever and
 * the parent kills it — see `test/line-break-walk-timeout.test.ts`.
 *
 * This runs as its own process on purpose: the failure mode is a synchronous loop,
 * which blocks the event loop and therefore defeats every in-process timeout,
 * vitest's included.
 */
import { EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import { createBBjServices } from '../../src/language/bbj-module.js';
import type { Program } from '../../src/language/generated/ast.js';
import { walkInputs } from './line-break-walk-inputs.js';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);

async function main(): Promise<void> {
    for (const input of walkInputs) {
        process.stdout.write(`start ${input.label}\n`);
        const result = await validate(input.source);
        const parserErrors = result.document.parseResult.parserErrors.length;
        if (parserErrors > 0) {
            // Not a hang, but the input no longer covers anything: checkLineBreaks
            // bails out before the walks when a document has parser errors.
            process.stderr.write(`${input.label} no longer parses cleanly (${parserErrors} parser errors)\n`);
            process.exit(2);
        }
        process.stdout.write(`done ${input.label}\n`);
    }
    process.stdout.write('all inputs terminated\n');
}

main().catch(err => {
    process.stderr.write(`${err?.stack ?? err}\n`);
    process.exit(3);
});
