import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildEmValidateArgv, buildEmLoginArgv, buildWebRunArgv, type Argv } from '../src/Commands/process-args.js';
import { formatArgvForLog } from '../src/Commands/process-runner.js';

/**
 * GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8: these guards prove the Enterprise Manager
 * credentials and JWT travel to the spawned `bbj` process on the environment, not on
 * argv, and that the `.bbj` scripts read them via ENV() rather than ARGV(). Offline, no
 * BBj runtime — the same shape as no-shell-command-construction.test.ts and
 * command-argv-injection.test.ts.
 *
 * All three scripts — em-validate-token.bbj, em-login.bbj and web.bbj — read their
 * credentials/token via ENV() with no positional fallback. All three VS Code builders —
 * buildEmValidateArgv, buildEmLoginArgv and buildWebRunArgv — emit an env map alongside a
 * secret-free args array, and every VS Code call site that launches a secret-bearing
 * process passes that map spread over process.env.
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

/** Strip `//` line comments, mirroring no-shell-command-construction.test.ts. */
function stripLineComments(source: string): string {
    return source.replace(/\/\/.*$/gm, '');
}

/** Number of `args` elements a builder emits after the `-` separator. */
function positionalArgCount(args: string[]): number {
    const separatorIndex = args.indexOf('-');
    return args.length - separatorIndex - 1;
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

describe('em-secret-env-channel guard — buildEmLoginArgv', () => {
    const OPTS = {
        home: '/opt/bbj',
        platform: 'linux' as NodeJS.Platform,
        scriptPath: '/ext/tools/em-login.bbj',
        tmpFile: '/tmp/out.tmp',
        infoString: 'VS Code on Linux as dev'
    };

    test('returns an env map carrying the username under BBJ_EM_USERNAME and the password under BBJ_EM_PASSWORD, and a five-element args array containing neither value', () => {
        const username = 'admin';
        const password = 'sup3r-secret';
        const argv = buildEmLoginArgv({ ...OPTS, username, password });

        expect(argv.env?.['BBJ_EM_USERNAME']).toBe(username);
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe(password);
        expect(argv.args).toEqual(['-q', OPTS.scriptPath, '-', OPTS.tmpFile, OPTS.infoString]);
        expect(argv.args).toHaveLength(5);
        expect(argv.args.some((a) => a.includes(username))).toBe(false);
        expect(argv.args.some((a) => a.includes(password))).toBe(false);
    });

    test('sets both credential keys even when both values are the empty string', () => {
        const argv = buildEmLoginArgv({ ...OPTS, username: '', password: '' });
        expect(argv.env?.['BBJ_EM_USERNAME']).toBe('');
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe('');
    });

    test('a credential containing non-ASCII characters and shell-significant bytes is carried byte-identically as an environment value and appears in no args element', () => {
        const credential = 'pässwörd;`$(rm -rf)` ';
        const argv = buildEmLoginArgv({ ...OPTS, username: credential, password: credential });
        expect(argv.env?.['BBJ_EM_USERNAME']).toBe(credential);
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe(credential);
        expect(argv.args.some((a) => a.includes(credential))).toBe(false);
    });

    test('the number of distinct ARGV(n) indices em-login.bbj reads equals the number of positional args buildEmLoginArgv emits after the "-" separator', () => {
        const stripped = readStrippedScript(EM_LOGIN_SCRIPT);
        const argv = buildEmLoginArgv({ ...OPTS, username: 'admin', password: 'secret' });
        expect(distinctArgvIndices(stripped).length).toBe(positionalArgCount(argv.args));
    });
});

describe('em-secret-env-channel guard — buildWebRunArgv', () => {
    const OPTS = {
        home: '/opt/bbj',
        platform: 'linux' as NodeJS.Platform,
        toolsDir: '/ext/tools',
        client: 'BUI',
        name: 'myapp',
        programme: 'myapp.bbj',
        workingDir: '/w',
        classpathEntry: 'bbj_default',
        configPath: '/cfg/config.bbx'
    };

    test('returns an env map carrying all three secrets under their keys, and a ten-element args array containing none of them', () => {
        const username = 'admin';
        const password = 'sup3r-secret';
        const token = 'tok-abc-123';
        const argv = buildWebRunArgv({ ...OPTS, username, password, token });

        expect(argv.env?.['BBJ_EM_USERNAME']).toBe(username);
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe(password);
        expect(argv.env?.['BBJ_EM_TOKEN']).toBe(token);
        expect(argv.args).toEqual([
            '-q',
            `-WD${OPTS.toolsDir}`,
            `${OPTS.toolsDir}/web.bbj`,
            '-',
            OPTS.client,
            OPTS.name,
            OPTS.programme,
            OPTS.workingDir,
            OPTS.classpathEntry,
            OPTS.configPath
        ]);
        expect(argv.args).toHaveLength(10);
        for (const secret of [username, password, token]) {
            expect(argv.args.some((a) => a.includes(secret))).toBe(false);
        }
    });

    test('sets all three keys even when all three values are empty', () => {
        const argv = buildWebRunArgv({ ...OPTS, username: '', password: '', token: '' });
        expect(argv.env?.['BBJ_EM_USERNAME']).toBe('');
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe('');
        expect(argv.env?.['BBJ_EM_TOKEN']).toBe('');
    });

    test('a token containing non-ASCII characters and shell-significant bytes is carried byte-identically as an environment value and appears in no args element', () => {
        const token = 'tökén;`$(rm -rf)` ';
        const argv = buildWebRunArgv({ ...OPTS, username: 'admin', password: 'secret', token });
        expect(argv.env?.['BBJ_EM_TOKEN']).toBe(token);
        expect(argv.args.some((a) => a.includes(token))).toBe(false);
    });

    test('the number of distinct ARGV(n) indices web.bbj reads equals the number of positional args buildWebRunArgv emits after the "-" separator', () => {
        const stripped = readStrippedScript(WEB_SCRIPT);
        const argv = buildWebRunArgv({ ...OPTS, username: 'admin', password: 'secret', token: 'tok' });
        expect(distinctArgvIndices(stripped).length).toBe(positionalArgCount(argv.args));
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

    test('neither file passes an options object, an environment map, or a bare argv/invocation, directly to appendLine', () => {
        for (const filePath of [EXTENSION_TS, COMMANDS_CJS]) {
            for (const call of appendLineCallArguments(filePath)) {
                expect(call).not.toMatch(/\boptions\b/);
                // A bare "argv"/"invocation"/"env" mention that is not inside a
                // formatArgvForLog( call would be a builder result or environment
                // map logged directly.
                const withoutRedactedCall = call.replace(/formatArgvForLog\([^)]*\)/g, '');
                expect(withoutRedactedCall).not.toMatch(/\b(argv|invocation|env)\b/);
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

describe('em-secret-env-channel guard — VS Code call sites spread process.env and reference only exported builders', () => {
    const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts');
    const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');
    const SECRET_BUILDERS = ['buildEmValidateArgv', 'buildEmLoginArgv', 'buildWebRunArgv'];

    /** Returns the full text of the balanced-parens call starting at `callStartIndex` (the index of the call's identifier). */
    function extractBalancedCall(source: string, callStartIndex: number): string {
        const openParenIndex = source.indexOf('(', callStartIndex);
        let depth = 0;
        for (let i = openParenIndex; i < source.length; i++) {
            if (source[i] === '(') depth++;
            else if (source[i] === ')') {
                depth--;
                if (depth === 0) {
                    return source.slice(callStartIndex, i + 1);
                }
            }
        }
        throw new Error(`Unbalanced parentheses for the call starting at index ${callStartIndex}`);
    }

    /**
     * For each secret-bearing builder call site in `source`, finds the nearest following
     * `runProcess(`/`runProcessCallback(` call and returns its full text (options object
     * included). A non-secret-bearing launcher call (following buildRunArgv,
     * buildCompileArgv or buildDecompileArgv) is never collected.
     */
    function launcherCallsFollowingSecretBuilders(filePath: string, source: string): string[] {
        const results: string[] = [];
        for (const builder of SECRET_BUILDERS) {
            const builderRegex = new RegExp(`\\b${builder}\\(`, 'g');
            let match: RegExpExecArray | null;
            while ((match = builderRegex.exec(source)) !== null) {
                const rest = source.slice(match.index);
                const launcherMatch = rest.match(/\brun(?:ProcessCallback|Process)\(/);
                if (!launcherMatch || launcherMatch.index === undefined) {
                    throw new Error(`No process-launcher call found following ${builder}( in ${filePath}`);
                }
                const launcherStart = match.index + launcherMatch.index;
                results.push(extractBalancedCall(source, launcherStart));
            }
        }
        return results;
    }

    function builderCallsUsed(source: string): string[] {
        return [...new Set([...source.matchAll(/\b(build[A-Za-z]*Argv)\(/g)].map((m) => m[1]))];
    }

    function exportedBuilderNames(tsSource: string): string[] {
        return [...new Set([...tsSource.matchAll(/export function (build[A-Za-z]*Argv)\(/g)].map((m) => m[1]))];
    }

    test('every call to the process launcher that follows a secret-bearing builder passes an options object whose env property spreads process.env', () => {
        for (const filePath of [EXTENSION_TS, COMMANDS_CJS]) {
            const source = stripLineComments(readFileOrThrow(filePath));
            const launcherCalls = launcherCallsFollowingSecretBuilders(filePath, source);
            expect(launcherCalls.length).toBeGreaterThan(0);
            for (const call of launcherCalls) {
                expect(call).toMatch(/env:\s*\{[^}]*\.\.\.process\.env/);
            }
        }
    });

    test('neither file references a builder that is not exported from process-args.ts', () => {
        const tsSource = readFileOrThrow(PROCESS_ARGS_TS);
        const exported = exportedBuilderNames(tsSource);
        expect(exported.length).toBeGreaterThan(0);
        for (const filePath of [EXTENSION_TS, COMMANDS_CJS]) {
            const source = stripLineComments(readFileOrThrow(filePath));
            const used = builderCallsUsed(source);
            expect(used.length).toBeGreaterThan(0);
            for (const name of used) {
                expect(exported).toContain(name);
            }
        }
    });

    test('fails with an explicit message naming the path when extension.ts or Commands.cjs is absent', () => {
        const missing = path.join(REPO_ROOT, 'src', 'does-not-exist-extension.ts');
        expect(() => readFileOrThrow(missing)).toThrow(
            new RegExp(`Guarded source file not found at .*does-not-exist-extension\\.ts`)
        );
    });
});
