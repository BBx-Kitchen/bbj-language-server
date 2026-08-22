import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildEmValidateArgv } from '../src/Commands/process-args.js';

/**
 * GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8: these guards prove the Enterprise Manager
 * credentials and JWT travel to the spawned `bbj` process on the environment, not on
 * argv, and that the `.bbj` scripts read them via ENV() rather than ARGV(). Offline, no
 * BBj runtime — the same shape as no-shell-command-construction.test.ts and
 * command-argv-injection.test.ts.
 *
 * Transient state (75-01-PLAN.md): only the validate path (em-validate-token.bbj /
 * buildEmValidateArgv) is migrated in this plan. em-login.bbj and web.bbj still read
 * their secrets via ARGV until plans 02 and 03 land — the cross-layer contract test
 * below is written to hold vacuously for those two scripts until then, not to assert
 * anything about their current (pre-migration) ARGV intake.
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
