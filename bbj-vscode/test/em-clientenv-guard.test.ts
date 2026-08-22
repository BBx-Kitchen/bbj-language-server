import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { shouldRunBBjTests } from './test-helper.js';

/**
 * Regression guard for the macOS Enterprise Manager login/run-action failure
 * live in released `0.12.21`/`0.12.22`: `em-login.bbj` writes
 * `ERROR:Username required`, meaning its username read back empty.
 *
 * Root cause (confirmed by direct experiment on two platforms, same script,
 * same `bbj -q <script> - <outputFile>` invocation shape the extension uses,
 * one variable `BBJ_PROBE_VAR=HELLO` set on the spawning process):
 *
 *   Linux (dev container, /opt/bbx):  ENV=[HELLO] CLIENTENV=[HELLO] SERVERENV=[HELLO]
 *   macOS (user's machine, ~/bbx):    ENV=[null]  CLIENTENV=[HELLO] SERVERENV=[null]
 *
 * `ENV()` does not see the spawning process's environment on macOS.
 * `CLIENTENV()` does, on both platforms tested. Phase 75
 * (GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8) moved the EM secrets off the
 * command line onto the child process environment and read them back with
 * `ENV()` — correct on Linux (where every automated test in this phase ran),
 * silently broken on macOS (where nothing in this repository's CI or test
 * suite runs BBj at all).
 *
 * The fix reads `CLIENTENV()` first and falls back to `ENV()` only when
 * `CLIENTENV()` reads back empty. Windows was NOT tested at merge time —
 * only Linux and macOS were probed. If Windows turns out to be the mirror
 * image (`CLIENTENV()` blind, `ENV()` populated), the fallback still works
 * there; a `CLIENTENV()`-only fix would not have, and would have shipped a
 * second platform-specific break.
 *
 * ## What this guard proves, and what it does not
 *
 * (a) Below is a **source-text** guard: it asserts every `BBJ_EM_*` secret
 *     in the three affected scripts is read via `CLIENTENV(` at least once
 *     (with `ENV(`, when present for the same variable, appearing only
 *     later in the source, i.e. as a fallback read after the `CLIENTENV()`
 *     read — never as the sole or first read). This is the check that
 *     actually would have caught the regression before release — it fails
 *     against the pre-fix scripts, which read `BBJ_EM_*` exclusively via
 *     bare `ENV(` with no `CLIENTENV(` anywhere (RED, captured verbatim in
 *     the accompanying commit/SUMMARY). The regex is anchored on `\bENV\(`/
 *     `\bCLIENTENV\(` rather than "does the string ENV( appear" — a plain
 *     substring check is wrong here, since `CLIENTENV(` itself contains the
 *     substring `ENV(` (that exact trap already produced one wrong verdict
 *     during this investigation). It proves the *accessor choice* is
 *     correct. It does NOT prove `CLIENTENV()` or the fallback behave
 *     identically to `ENV()` at runtime on any platform, and it does NOT
 *     prove anything about macOS or Windows, because no macOS or Windows
 *     runner exists in this container or in CI.
 *
 * (b) Further below is a **behavioral** test, gated behind the project's
 *     standard `RUN_BBJ_TESTS` convention (`test:bbj` / a reachable BBj
 *     instance), that spawns `em-login.bbj` for real against this
 *     container's live BBjServices instance with synthetic credentials on
 *     the environment. It asserts the output is the authentication-failure
 *     path (`ERROR:Authentication failed...`), not `ERROR:Username
 *     required` — proving the credentials *arrived* at the script. This
 *     test passes on Linux **even against the pre-fix `ENV()`-only
 *     scripts**, because `ENV()` does see the spawning process's
 *     environment on Linux. It is a guard for the *callers* (argv/env
 *     wiring reaching the child process correctly), not for the *accessor
 *     choice* — only guard (a) above is specific to this regression. Do not
 *     read a pass here as proof the macOS bug is fixed; only (a) and a real
 *     macOS run can prove that.
 */

const TOOLS_DIR = path.resolve(__dirname, '..', 'tools');

const SCRIPTS_WITH_SECRETS: Record<string, string[]> = {
    'em-login.bbj': ['BBJ_EM_USERNAME', 'BBJ_EM_PASSWORD'],
    'em-validate-token.bbj': ['BBJ_EM_TOKEN'],
    'web.bbj': ['BBJ_EM_USERNAME', 'BBJ_EM_PASSWORD', 'BBJ_EM_TOKEN']
};

describe('EM secret reads use CLIENTENV(), not bare ENV() -- ENV() does not see the spawning process environment on macOS', () => {
    for (const [scriptName, vars] of Object.entries(SCRIPTS_WITH_SECRETS)) {
        const scriptPath = path.join(TOOLS_DIR, scriptName);

        describe(scriptName, () => {
            const source = fs.readFileSync(scriptPath, 'utf-8');

            for (const varName of vars) {
                test(`${varName} is read via CLIENTENV() first; a bare ENV() read, if present, is only a later fallback`, () => {
                    // \b before ENV( does NOT match inside CLIENTENV( -- "T" and "E" are both
                    // word characters, so there is no word boundary between them. This is a
                    // tokenized/anchored check, not a plain substring search for "ENV(" --
                    // CLIENTENV( contains that substring, and a naive check on it already
                    // produced one wrong verdict during this investigation.
                    const bareEnvPattern = new RegExp(`\\bENV\\(\\s*["']${varName}["']`);
                    const clientEnvPattern = new RegExp(`\\bCLIENTENV\\(\\s*["']${varName}["']`);

                    // Must fail against the pre-fix scripts: they have no CLIENTENV( read at
                    // all, only a bare ENV( read. This assertion is what actually goes RED.
                    const clientEnvMatch = source.match(clientEnvPattern);
                    expect(clientEnvMatch).not.toBeNull();

                    // A fallback ENV( read, if present, must come strictly after the
                    // CLIENTENV( read that takes priority over it -- never before or instead.
                    const bareEnvMatch = source.match(bareEnvPattern);
                    if (bareEnvMatch) {
                        expect(bareEnvMatch.index!).toBeGreaterThan(clientEnvMatch!.index!);
                    }
                });
            }
        });
    }
});

describe('em-login.bbj behavioral check against a live BBjServices instance', async () => {
    const BBJ_BIN = '/opt/bbx/bin/bbj';
    const EM_LOGIN_SCRIPT = path.join(TOOLS_DIR, 'em-login.bbj');
    const run = (await shouldRunBBjTests()) && fs.existsSync(BBJ_BIN);

    // See the file-level comment above: this test passes on Linux against BOTH
    // the pre-fix ENV() scripts and the post-fix CLIENTENV() scripts. It proves
    // the callers wire the secret onto the child environment correctly; it does
    // NOT distinguish ENV() from CLIENTENV(), and does NOT cover macOS. Only
    // guard (a) above catches this specific regression.
    test.runIf(run)(
        'synthetic non-real credentials on the environment reach the script -- output is the authentication-failure path, never "Username required"',
        () => {
            const tmpFile = path.join(
                os.tmpdir(),
                `em-login-clientenv-verify-${process.pid}-${Date.now()}.tmp`
            );
            try {
                execFileSync(
                    BBJ_BIN,
                    ['-q', EM_LOGIN_SCRIPT, '-', tmpFile, 'clientenv-guard-behavioral-test'],
                    {
                        env: {
                            ...process.env,
                            BBJ_EM_USERNAME: 'synthetic-clientenv-guard-user-DO-NOT-USE',
                            BBJ_EM_PASSWORD: 'synthetic-clientenv-guard-pw-DO-NOT-USE-9f3a'
                        },
                        timeout: 30000
                    }
                );
                const output = fs.readFileSync(tmpFile, 'utf-8').trim();
                expect(output).not.toBe('ERROR:Username required');
                expect(output).toContain('ERROR:Authentication failed');
            } finally {
                fs.rmSync(tmpFile, { force: true });
            }
        },
        60000
    );
});
