/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Pure argument-array builders for every BBj process this extension launches.
 *
 * GHSA-p5f3-9456-9pcx (CWE-78, OS command injection): prior to this module every
 * launch site built a single shell command string by interpolating workspace-settable
 * configuration values (bbj.classpath, bbj.configPath, bbj.web.apps.<file>.name, and
 * the string-typed bbj.compiler.* options) and caller-supplied file paths, then handed
 * that string to a shell for parsing. A workspace's own committed settings file can
 * set arbitrary values for all of those, and params.fsPath is reachable from any other
 * extension's command invocation — so a crafted value could break out of its intended
 * argument and have the shell run something else entirely.
 *
 * This module builds `{ file, args }` pairs instead: an executable path plus an
 * argument array, following Node's execFile calling convention. See
 * process-runner.ts for the code that actually launches these values — it never
 * invokes a shell.
 *
 * Argument-mapping decision: each configured string maps to exactly one argument
 * array element. No value is ever split on whitespace. This preserves the behaviour
 * of every documented usage, and — as a deliberate side effect, not a regression —
 * fixes a latent pre-existing bug: a value containing a space (for example, an output
 * path under `Program Files`) used to be split by the shell into two arguments; it
 * now arrives as one argument, intact.
 *
 * No `vscode` import here, intentionally: every builder takes plain primitives, so
 * this module is unit-testable with zero mocks.
 */

export interface Argv {
    file: string;
    args: string[];
    env?: Record<string, string>;
}

/**
 * The three Enterprise Manager secret environment-variable names, in one spelling shared
 * by every VS Code call site. `em-validate-token.bbj`, `em-login.bbj` and `web.bbj` read
 * the same three names via `ENV(...)` on the BBj side; `BbjProcessSecretEnv` on the
 * IntelliJ side carries the identical literals (GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8).
 */
export const EM_ENV_VARS = Object.freeze({
    USERNAME: 'BBJ_EM_USERNAME',
    PASSWORD: 'BBJ_EM_PASSWORD',
    TOKEN: 'BBJ_EM_TOKEN'
});

const exeSuffix = (platform: NodeJS.Platform): string => (platform === 'win32' ? '.exe' : '');

export function bbjBin(home: string, platform: NodeJS.Platform = process.platform): string {
    return `${home}/bin/bbj${exeSuffix(platform)}`;
}

export function bbjlstBin(home: string, platform: NodeJS.Platform = process.platform): string {
    return `${home}/bin/bbjlst${exeSuffix(platform)}`;
}

export function bbjcplBin(home: string, platform: NodeJS.Platform = process.platform): string {
    return `${home}/bin/bbjcpl${exeSuffix(platform)}`;
}

export interface BuildRunArgvOptions {
    home: string;
    platform?: NodeJS.Platform;
    classpathEntry?: string | null;
    configPath?: string | null;
    workingDir: string;
    fileName: string;
}

/**
 * Reproduces today's `Commands.run` invocation: `bbj -q [-CP<classpath>] [-c<configPath>]
 * -WD<workingDir> <fileName>`. `-CP` and `-c` are omitted entirely when the corresponding
 * value is empty or absent, matching the existing `sscp > ''` guard.
 */
export function buildRunArgv(opts: BuildRunArgvOptions): Argv {
    const { home, platform = process.platform, classpathEntry, configPath, workingDir, fileName } = opts;
    const args: string[] = ['-q'];
    if (classpathEntry) {
        args.push(`-CP${classpathEntry}`);
    }
    if (configPath) {
        args.push(`-c${configPath}`);
    }
    args.push(`-WD${workingDir}`, fileName);
    return { file: bbjBin(home, platform), args };
}

export interface BuildWebRunArgvOptions {
    home: string;
    platform?: NodeJS.Platform;
    toolsDir: string;
    client: string;
    name: string;
    programme: string;
    workingDir: string;
    username: string;
    password: string;
    classpathEntry: string;
    token: string;
    configPath: string;
}

/**
 * Reproduces today's `runWeb` invocation: `bbj -q -WD<toolsDir> <toolsDir>/web.bbj -
 * <client> <name> <programme> <workingDir> <username> <password> <classpath> <token>
 * <configPath>`. Empty-string credentials are preserved as empty elements, matching
 * today's behaviour, rather than dropped.
 */
export function buildWebRunArgv(opts: BuildWebRunArgvOptions): Argv {
    const {
        home,
        platform = process.platform,
        toolsDir,
        client,
        name,
        programme,
        workingDir,
        username,
        password,
        classpathEntry,
        token,
        configPath
    } = opts;
    const args: string[] = [
        '-q',
        `-WD${toolsDir}`,
        `${toolsDir}/web.bbj`,
        '-',
        client,
        name,
        programme,
        workingDir,
        username,
        password,
        classpathEntry,
        token,
        configPath
    ];
    return { file: bbjBin(home, platform), args };
}

export interface BuildCompileArgvOptions {
    home: string;
    platform?: NodeJS.Platform;
    compilerOptions: string[];
    fileName: string;
}

/**
 * Forwards `buildCompileOptions`'s array element-for-element (it already returns one
 * complete flag-plus-value token per entry), then the file name last.
 */
export function buildCompileArgv(opts: BuildCompileArgvOptions): Argv {
    const { home, platform = process.platform, compilerOptions, fileName } = opts;
    return { file: bbjcplBin(home, platform), args: [...compilerOptions, fileName] };
}

export interface BuildDecompileArgvOptions {
    home: string;
    platform?: NodeJS.Platform;
    fileName: string;
    denumber?: boolean;
}

/**
 * Reproduces today's bbjlst flags: none when not denumbering; `['-l']` when
 * denumbering a non-`.lst` input; `['-l', '-xlst']` when denumbering a `.lst` input.
 * The file name is always the final element.
 */
export function buildDecompileArgv(opts: BuildDecompileArgvOptions): Argv {
    const { home, platform = process.platform, fileName, denumber } = opts;
    const args: string[] = [];
    if (denumber) {
        args.push('-l');
        if (fileName.endsWith('.lst')) {
            args.push('-xlst');
        }
    }
    args.push(fileName);
    return { file: bbjlstBin(home, platform), args };
}

export interface BuildEmValidateArgvOptions {
    home: string;
    platform?: NodeJS.Platform;
    scriptPath: string;
    token: string;
    tmpFile: string;
}

/**
 * Reproduces today's `bbj -q em-validate-token.bbj - <tmpFile>` invocation. The token
 * travels on the returned `env` map under `EM_ENV_VARS.TOKEN`, never in `args` — it is
 * always written, even when empty, so an inherited environment variable of the same
 * name can never be read in its place (GHSA-33x9-cpwv-xcv2).
 */
export function buildEmValidateArgv(opts: BuildEmValidateArgvOptions): Argv {
    const { home, platform = process.platform, scriptPath, token, tmpFile } = opts;
    return {
        file: bbjBin(home, platform),
        args: ['-q', scriptPath, '-', tmpFile],
        env: { [EM_ENV_VARS.TOKEN]: token }
    };
}

export interface BuildEmLoginArgvOptions {
    home: string;
    platform?: NodeJS.Platform;
    scriptPath: string;
    username: string;
    password: string;
    tmpFile: string;
    infoString: string;
}

/** Reproduces today's `bbj -q em-login.bbj - <username> <password> <tmpFile> <infoString>` invocation. */
export function buildEmLoginArgv(opts: BuildEmLoginArgvOptions): Argv {
    const { home, platform = process.platform, scriptPath, username, password, tmpFile, infoString } = opts;
    return { file: bbjBin(home, platform), args: ['-q', scriptPath, '-', username, password, tmpFile, infoString] };
}
