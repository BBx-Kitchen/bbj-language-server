import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildEmValidateArgv, type Argv } from '../src/Commands/process-args.js';
import { formatArgvForLog } from '../src/Commands/process-runner.js';

/**
 * GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8: these guards prove the Enterprise Manager
 * credentials and JWT travel to the spawned `bbj` process on the environment, not on
 * argv, and that the `.bbj` scripts read them via ENV() rather than ARGV(). Offline, no
 * BBj runtime — the same shape as no-shell-command-construction.test.ts and
 * command-argv-injection.test.ts.
 *
 * Transient state (75-02-PLAN.md): as of this plan all three scripts —
 * em-validate-token.bbj, em-login.bbj and web.bbj — read their credentials/token via
 * ENV() with no positional fallback. The IntelliJ callers (BbjProcessSecretEnv.emLogin
 * / webRun) already write the corresponding environment map. The VS Code TypeScript
 * callers (buildEmLoginArgv / buildWebRunArgv in process-args.ts and their extension.ts
 * call sites) are NOT migrated in this plan — that is plan 03's job — so those two
 * builders still emit the pre-migration ARGV shape. The script-side and builder-side
 * ARGV/positional-count cross-checks below are therefore written against the scripts'
 * OWN final numbering (fixed expected index sets), not against the still-unmigrated
 * `buildEmLoginArgv`/`buildWebRunArgv` output, so this suite is green after this plan
 * without also requiring plan 03's VS Code changes.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(REPO_ROOT, 'tools');
const EM_VALIDATE_SCRIPT = path.join(TOOLS_DIR, 'em-validate-token.bbj');
const EM_LOGIN_SCRIPT = path.join(TOOLS_DIR, 'em-login.bbj');
const WEB_SCRIPT = path.join(TOOLS_DIR, 'web.bbj');
const PROCESS_ARGS_TS = path.join(REPO_ROOT, 'src/Commands/process-args.ts');
const BBJ_PROCESS_SECRET_ENV_JAVA = path.resolve(
    REPO_ROOT,
    '..',
    'bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java'
);

const BBJ_EM_VOCABULARY = ['BBJ_EM_USERNAME', 'BBJ_EM_PASSWORD', 'BBJ_EM_TOKEN'];

/** Strip `rem` comment lines (case-insensitive, leading whitespace tolerated). */
function stripRemLines(source: string): string {
    return source
        .split(/\r?\n/)
        .filter((line) => !/^\s*rem\b/i.test(line))
        .join('\n');
}

function readFileOrThrow(filePath: string): string {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Guarded source file not found at ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

function readStrippedScript(filePath: string): string {
    return stripRemLines(readFileOrThrow(filePath));
}

function distinctArgvIndices(strippedSource: string): number[] {
    const indices = new Set<number>();
    for (const match of strippedSource.matchAll(/ARGV\((\d+)/g)) {
        indices.add(Number(match[1]));
    }
    return [...indices].sort((a, b) => a - b);
}

function bbjEmNamesIn(source: string): string[] {
    return [...new Set([...source.matchAll(/BBJ_EM_[A-Z]+/g)].map((m) => m[0]))];
}

describe('em-secret-env-channel guard — em-validate-token.bbj reads ENV, not ARGV, for the token', () => {
    test('obtains its token from ENV("BBJ_EM_TOKEN") and the only ARGV index it reads is 1', () => {
        const stripped = readStrippedScript(EM_VALIDATE_SCRIPT);
        expect(stripped).toContain('ENV("BBJ_EM_TOKEN"');
        expect(distinctArgvIndices(stripped)).toEqual([1]);
    });

    test('fails with an explicit message naming the path when the guarded script is absent', () => {
        const missing = path.join(TOOLS_DIR, 'does-not-exist-em-validate-token.bbj');
        expect(() => readStrippedScript(missing)).toThrow(
            new RegExp(`Guarded source file not found at .*${'does-not-exist-em-validate-token.bbj'}`)
        );
    });
});

/** ARGV index count each script's final numbering settles on (75-02-PLAN.md). */
const FINAL_POSITIONAL_COUNT: Record<string, number> = {
    [EM_VALIDATE_SCRIPT]: 1,
    [EM_LOGIN_SCRIPT]: 2,
    [WEB_SCRIPT]: 6
};

describe('em-secret-env-channel guard — em-login.bbj reads ENV, not ARGV, for the credentials', () => {
    test('obtains its username and password from ENV("BBJ_EM_USERNAME"/"BBJ_EM_PASSWORD") and reads exactly ARGV indices 1 and 2', () => {
        const stripped = readStrippedScript(EM_LOGIN_SCRIPT);
        expect(stripped).toContain('ENV("BBJ_EM_USERNAME"');
        expect(stripped).toContain('ENV("BBJ_EM_PASSWORD"');
        expect(distinctArgvIndices(stripped)).toEqual([1, 2]);
    });

    test('assigns no credential variable from an ARGV read', () => {
        const stripped = readStrippedScript(EM_LOGIN_SCRIPT);
        expect(stripped).not.toMatch(/username!\s*=\s*ARGV\(/);
        expect(stripped).not.toMatch(/password!\s*=\s*ARGV\(/);
    });

    test('contains no statement that erases or deletes the output-file path before opening it', () => {
        const stripped = readStrippedScript(EM_LOGIN_SCRIPT);
        expect(stripped).not.toMatch(/erase[( ]/i);
    });

    test('the number of distinct ARGV(n) indices equals this script\'s final positional-argument count', () => {
        const stripped = readStrippedScript(EM_LOGIN_SCRIPT);
        expect(distinctArgvIndices(stripped).length).toBe(FINAL_POSITIONAL_COUNT[EM_LOGIN_SCRIPT]);
    });

    test('fails with an explicit message naming the path when the guarded script is absent', () => {
        const missing = path.join(TOOLS_DIR, 'does-not-exist-em-login.bbj');
        expect(() => readStrippedScript(missing)).toThrow(
            new RegExp(`Guarded source file not found at .*${'does-not-exist-em-login.bbj'}`)
        );
    });
});

describe('em-secret-env-channel guard — web.bbj reads ENV, not ARGV, for the credentials and token', () => {
    test('obtains its username, password and token from the three BBJ_EM_* ENV reads and reads exactly ARGV indices 1 through 6', () => {
        const stripped = readStrippedScript(WEB_SCRIPT);
        expect(stripped).toContain('ENV("BBJ_EM_USERNAME"');
        expect(stripped).toContain('ENV("BBJ_EM_PASSWORD"');
        expect(stripped).toContain('ENV("BBJ_EM_TOKEN"');
        expect(distinctArgvIndices(stripped)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('assigns no credential or token variable from an ARGV read', () => {
        const stripped = readStrippedScript(WEB_SCRIPT);
        expect(stripped).not.toMatch(/username!\s*=\s*ARGV\(/);
        expect(stripped).not.toMatch(/password!\s*=\s*ARGV\(/);
        expect(stripped).not.toMatch(/token!\s*=\s*ARGV\(/);
    });

    test('the number of distinct ARGV(n) indices equals this script\'s final positional-argument count', () => {
        const stripped = readStrippedScript(WEB_SCRIPT);
        expect(distinctArgvIndices(stripped).length).toBe(FINAL_POSITIONAL_COUNT[WEB_SCRIPT]);
    });

    test('fails with an explicit message naming the path when the guarded script is absent', () => {
        const missing = path.join(TOOLS_DIR, 'does-not-exist-web.bbj');
        expect(() => readStrippedScript(missing)).toThrow(
            new RegExp(`Guarded source file not found at .*${'does-not-exist-web.bbj'}`)
        );
    });
});

describe('em-secret-env-channel guard — buildEmValidateArgv', () => {
    const OPTS = {
        home: '/opt/bbj',
        platform: 'linux' as NodeJS.Platform,
        scriptPath: '/ext/tools/em-validate-token.bbj',
        tmpFile: '/tmp/out.tmp'
    };

    test('returns an env map carrying the token under BBJ_EM_TOKEN and a four-element args array containing the token nowhere', () => {
        const token = 'tok-abc-123';
        const argv = buildEmValidateArgv({ ...OPTS, token });

        expect(argv.env?.['BBJ_EM_TOKEN']).toBe(token);
        expect(argv.args).toEqual(['-q', OPTS.scriptPath, '-', OPTS.tmpFile]);
        expect(argv.args.some((a) => a.includes(token))).toBe(false);
    });

    test('the number of distinct ARGV(n) indices em-validate-token.bbj reads equals the number of positional args buildEmValidateArgv emits after the "-" separator', () => {
        const stripped = readStrippedScript(EM_VALIDATE_SCRIPT);
        const argv = buildEmValidateArgv({ ...OPTS, token: 'tok-abc-123' });
        const separatorIndex = argv.args.indexOf('-');
        const positionalCount = argv.args.length - separatorIndex - 1;

        expect(distinctArgvIndices(stripped).length).toBe(positionalCount);
    });
});

describe('em-secret-env-channel guard — cross-layer BBJ_EM_* name contract', () => {
    test('every BBJ_EM_* literal in BbjProcessSecretEnv.java and process-args.ts is drawn from the three-name vocabulary, and every name a script reads via ENV() is a name at least one builder writes', () => {
        const javaSource = readFileOrThrow(BBJ_PROCESS_SECRET_ENV_JAVA);
        const tsSource = readFileOrThrow(PROCESS_ARGS_TS);

        const javaNames = bbjEmNamesIn(javaSource);
        const tsNames = bbjEmNamesIn(tsSource);
        const writtenNames = new Set([...javaNames, ...tsNames]);

        for (const name of writtenNames) {
            expect(BBJ_EM_VOCABULARY).toContain(name);
        }
        expect(writtenNames.has('BBJ_EM_TOKEN')).toBe(true);

        for (const scriptPath of [EM_VALIDATE_SCRIPT, EM_LOGIN_SCRIPT, WEB_SCRIPT]) {
            const stripped = readStrippedScript(scriptPath);
            for (const name of BBJ_EM_VOCABULARY) {
                const readsViaEnv = new RegExp(`ENV\\("${name}"`).test(stripped);
                if (readsViaEnv) {
                    expect(writtenNames.has(name)).toBe(true);
                }
            }
        }
    });

    test('fails with an explicit message naming the path when a guarded file is absent', () => {
        const missing = path.join(TOOLS_DIR, 'does-not-exist.bbj');
        expect(() => readFileOrThrow(missing)).toThrow(
            new RegExp(`Guarded source file not found at .*does-not-exist\\.bbj`)
        );
    });
});

describe('em-secret-env-channel guard — the environment map has no path to the debug log', () => {
    const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts');
    const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');

    /** Strip `//` line comments, mirroring no-shell-command-construction.test.ts. */
    function stripLineComments(source: string): string {
        return source.replace(/\/\/.*$/gm, '');
    }

    function appendLineCallArguments(filePath: string): string[] {
        const source = stripLineComments(readFileOrThrow(filePath));
        return [...source.matchAll(/outputChannel\.appendLine\((.*)\);/g)].map((m) => m[1]);
    }

    test('every appendLine call whose argument mentions an invocation (argv) renders it through formatArgvForLog', () => {
        for (const filePath of [EXTENSION_TS, COMMANDS_CJS]) {
            const calls = appendLineCallArguments(filePath);
            expect(calls.length).toBeGreaterThan(0);
            for (const call of calls) {
                if (/\bargv\b/.test(call)) {
                    expect(call).toMatch(/formatArgvForLog\(/);
                }
            }
        }
    });

    test('neither file passes an options object, nor a bare argv/invocation, directly to appendLine', () => {
        for (const filePath of [EXTENSION_TS, COMMANDS_CJS]) {
            for (const call of appendLineCallArguments(filePath)) {
                expect(call).not.toMatch(/\boptions\b/);
                // A bare "argv" (or "invocation") mention that is not inside a
                // formatArgvForLog( call would be a builder result logged directly.
                const withoutRedactedCall = call.replace(/formatArgvForLog\([^)]*\)/g, '');
                expect(withoutRedactedCall).not.toMatch(/\b(argv|invocation)\b/);
            }
        }
    });

    test('formatArgvForLog applied to an Argv carrying a populated env map returns a string containing none of that map\'s values', () => {
        const secretValue = 'super-secret-token-value-9f3c';
        const argv: Argv = {
            file: '/opt/bbj/bin/bbj',
            args: ['-q', '/ext/tools/em-validate-token.bbj', '-', '/tmp/out.tmp'],
            env: { BBJ_EM_TOKEN: secretValue }
        };

        const rendered = formatArgvForLog(argv);

        expect(rendered).not.toContain(secretValue);
    });
});
