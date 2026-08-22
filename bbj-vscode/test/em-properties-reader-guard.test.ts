import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Regression guard for the `bbj.em` ("Open Enterprise Manager") command crashing
 * with `TypeError: PropertiesReader is not a function`, reported against the
 * published 0.12.21 VS Code extension.
 *
 * Root cause: `properties-reader@3.0.1`'s module export is an OBJECT
 * (`{ bindToExpress, default, expressBasePath, propertiesReader }`), not a
 * callable. `Commands.cjs` required it bare (`const PropertiesReader =
 * require("properties-reader")`) and then called `PropertiesReader(...)` at
 * the single call site inside `openEnterpriseManager`, which throws every
 * time. The real factory function is `.default` (equivalently
 * `.propertiesReader`).
 *
 * `Commands.cjs` is a CommonJS file resolved by Node's native loader, so
 * `vi.mock('vscode')` never reaches its `require` and it cannot be exercised
 * end-to-end under Vitest (see no-shell-command-construction.test.ts for the
 * same constraint). Two checks compensate:
 *
 * 1. A dependency-shape test against the real installed `properties-reader`
 *    package (no vscode involved) that reproduces the exact symptom: the
 *    bare module export throws when called, `.default` does not.
 * 2. A source guard on `Commands.cjs` asserting the require site resolves to
 *    a callable (`.default`/`.propertiesReader`, or destructured) rather than
 *    the bare module object. This is what actually fails against the
 *    pre-fix source — a test that only asserted `require('properties-reader').default`
 *    is a function would pass regardless of what `Commands.cjs` does, so it
 *    would not guard this bug.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');

describe('properties-reader@3.0.1 export shape', () => {
    test('the bare module export is an object, not directly callable', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const PropertiesReader = require('properties-reader');
        expect(typeof PropertiesReader).toBe('object');
        expect(() => (PropertiesReader as unknown as (p: string) => unknown)('/nonexistent/path')).toThrow(/is not a function/);
    });

    test('.default is the callable factory function', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const PropertiesReader = require('properties-reader');
        expect(typeof PropertiesReader.default).toBe('function');
    });
});

describe('Commands.cjs does not call the properties-reader module object as a function', () => {
    test('the require site for properties-reader resolves to a callable (.default/.propertiesReader, or destructured), not the bare module object', () => {
        const source = fs.readFileSync(COMMANDS_CJS, 'utf-8');

        // Matches any of the callable-producing forms:
        //   require("properties-reader").default
        //   require("properties-reader").propertiesReader
        //   const { default: X } = require("properties-reader")
        //   const { propertiesReader: X } = require("properties-reader")
        const CALLABLE_REQUIRE =
            /require\(\s*['"]properties-reader['"]\s*\)\s*\.\s*(default|propertiesReader)\b/;
        const DESTRUCTURED_REQUIRE =
            /\{\s*(default|propertiesReader)(\s*:\s*\w+)?\s*\}\s*=\s*require\(\s*['"]properties-reader['"]\s*\)/;

        const usesCallableAccess = CALLABLE_REQUIRE.test(source) || DESTRUCTURED_REQUIRE.test(source);
        expect(usesCallableAccess).toBe(true);
    });
});
