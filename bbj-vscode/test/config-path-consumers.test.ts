import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildRunArgv, buildWebRunArgv } from '../src/Commands/process-args.js';

/**
 * Covers every VS Code consumer of the one shared resolved config path: the run-argument
 * builders' sentinel guard and the Show-config/run/web-run command paths in Commands.cjs.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');

describe('process-args - buildRunArgv / buildWebRunArgv refuse the EM Config sentinel', () => {
    test('buildRunArgv emits no -c argument when configPath is the EM Config sentinel', () => {
        const argv = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: null,
            configPath: '--',
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        expect(argv.args.some((a) => a.startsWith('-c'))).toBe(false);
    });

    test('buildRunArgv emits exactly one -c argument carrying a real configPath', () => {
        const argv = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: null,
            configPath: '/cfg/config.bbx',
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        const cArgs = argv.args.filter((a) => a.startsWith('-c'));
        expect(cArgs).toEqual(['-c/cfg/config.bbx']);
    });

    test('buildRunArgv emits no -c argument when configPath is empty or absent (unchanged)', () => {
        const withEmpty = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: null,
            configPath: '',
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        expect(withEmpty.args.some((a) => a.startsWith('-c'))).toBe(false);

        const withAbsent = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        expect(withAbsent.args.some((a) => a.startsWith('-c'))).toBe(false);
    });

    test('buildWebRunArgv replaces the EM Config sentinel with an empty positional element, never handing it to web.bbj', () => {
        const argv = buildWebRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            toolsDir: '/ext/tools',
            client: 'BUI',
            name: 'myapp',
            programme: 'myapp.bbj',
            workingDir: '/w',
            username: '',
            password: '',
            classpathEntry: 'bbj_default',
            token: '',
            configPath: '--'
        });
        expect(argv.args).not.toContain('--');
        expect(argv.args[9]).toBe('');
    });

    test('buildWebRunArgv passes a real configPath through unchanged, at its existing position', () => {
        const argv = buildWebRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            toolsDir: '/ext/tools',
            client: 'BUI',
            name: 'myapp',
            programme: 'myapp.bbj',
            workingDir: '/w',
            username: '',
            password: '',
            classpathEntry: 'bbj_default',
            token: '',
            configPath: '/cfg/config.bbx'
        });
        expect(argv.args[9]).toBe('/cfg/config.bbx');
    });
});

describe('Commands.cjs - Show-config and run paths read the resolved config path', () => {
    /**
     * `Commands.cjs` is a CommonJS file resolved by Node's native loader, so `vi.mock('vscode')`
     * never reaches its `require` and it cannot be exercised end-to-end under Vitest — the same
     * constraint documented in `no-shell-command-construction.test.ts` and
     * `em-properties-reader-guard.test.ts` for this exact file (confirmed empirically: a bare
     * `require('vscode')` inside a test throws "Cannot find module 'vscode'" even under an
     * active `vi.mock('vscode', ...)`). These are therefore source guards over the extracted
     * function bodies, the established technique for this file.
     */
    function readSource(): string {
        return fs.readFileSync(COMMANDS_CJS, 'utf-8');
    }

    /** Extracts the brace-balanced block starting at the first `{` found after `marker`. */
    function extractBraceBlock(source: string, marker: string): string {
        const markerIndex = source.indexOf(marker);
        if (markerIndex === -1) {
            throw new Error(`Marker not found in Commands.cjs: ${marker}`);
        }
        const braceStart = source.indexOf('{', markerIndex);
        let depth = 0;
        for (let i = braceStart; i < source.length; i++) {
            if (source[i] === '{') {
                depth++;
            } else if (source[i] === '}') {
                depth--;
                if (depth === 0) {
                    return source.slice(braceStart, i + 1);
                }
            }
        }
        throw new Error(`Unbalanced braces for marker in Commands.cjs: ${marker}`);
    }

    test('Commands.cjs imports the config-path cache module', () => {
        expect(readSource()).toMatch(/require\(\s*['"]\.\.\/config-path-cache['"]\s*\)/);
    });

    test('openConfigFile no longer hardcodes {home}/cfg/config.bbx', () => {
        const body = extractBraceBlock(readSource(), 'openConfigFile: function');
        expect(body).not.toMatch(/cfg\/config\.bbx/);
    });

    test('the web-run config read no longer hardcodes {home}/cfg/config.bbx', () => {
        const body = extractBraceBlock(readSource(), 'const runWeb = ');
        expect(body).not.toMatch(/cfg\/config\.bbx/);
    });

    test('openConfigFile reads the active path via getActiveConfigPath, and shows an error naming the setting (without opening a document) when nothing is configured', () => {
        const body = extractBraceBlock(readSource(), 'openConfigFile: function');
        expect(body).toMatch(/getActiveConfigPath\s*\(\s*\)/);

        const unconfiguredErrorIndex = body.indexOf('No config file is configured');
        const openIndex = body.indexOf('openTextDocument(');
        expect(unconfiguredErrorIndex).toBeGreaterThan(-1);
        expect(openIndex).toBeGreaterThan(-1);
        expect(unconfiguredErrorIndex).toBeLessThan(openIndex);

        const returnAfterError = body.indexOf('return', unconfiguredErrorIndex);
        expect(returnAfterError).toBeGreaterThan(-1);
        expect(returnAfterError).toBeLessThan(openIndex);
    });

    test('openConfigFile shows an error naming the attempted path (without opening a document) when the resolved payload reports the file missing', () => {
        const body = extractBraceBlock(readSource(), 'openConfigFile: function');
        const missingErrorIndex = body.indexOf('Config file not found: ${configPath}');
        const openIndex = body.indexOf('openTextDocument(');
        expect(missingErrorIndex).toBeGreaterThan(-1);
        expect(missingErrorIndex).toBeLessThan(openIndex);

        const returnAfterError = body.indexOf('return', missingErrorIndex);
        expect(returnAfterError).toBeGreaterThan(-1);
        expect(returnAfterError).toBeLessThan(openIndex);
    });

    test('the GUI run function reads the sentinel-stripped active resolved path and refuses to run (no argv built) with a guessed path', () => {
        const body = extractBraceBlock(readSource(), 'run: function');
        expect(body).toMatch(/stripSentinel\(getActiveConfigPath\(\)\)/);

        const errorIndex = body.indexOf('NO_CONFIG_PATH_MESSAGE');
        const argvIndex = body.indexOf('buildRunArgv(');
        expect(errorIndex).toBeGreaterThan(-1);
        expect(argvIndex).toBeGreaterThan(-1);
        expect(errorIndex).toBeLessThan(argvIndex);

        const returnAfterError = body.indexOf('return', errorIndex);
        expect(returnAfterError).toBeGreaterThan(-1);
        expect(returnAfterError).toBeLessThan(argvIndex);
    });

    test('the web-run function reads the sentinel-stripped active resolved path and refuses to run (no argv built) with a guessed path', () => {
        const body = extractBraceBlock(readSource(), 'const runWeb = ');
        expect(body).toMatch(/stripSentinel\(getActiveConfigPath\(\)\)/);

        const errorIndex = body.indexOf('NO_CONFIG_PATH_MESSAGE');
        const argvIndex = body.indexOf('buildWebRunArgv(');
        expect(errorIndex).toBeGreaterThan(-1);
        expect(argvIndex).toBeGreaterThan(-1);
        expect(errorIndex).toBeLessThan(argvIndex);

        const returnAfterError = body.indexOf('return', errorIndex);
        expect(returnAfterError).toBeGreaterThan(-1);
        expect(returnAfterError).toBeLessThan(argvIndex);
    });
});
