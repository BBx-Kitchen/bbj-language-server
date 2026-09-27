import { describe, expect, test } from 'vitest';
import { buildRunArgv, buildWebRunArgv } from '../src/Commands/process-args.js';
import {
    buildCompileOptionsFrom,
    readerFromCompilerConfig,
    readerWithResolvedConfigFile,
    validateOptionsFrom,
} from '../src/language/compiler-options.js';

/**
 * Covers every VS Code consumer of the one shared resolved config path: the run-argument
 * builders' sentinel guard, and bbjcpl's `-c` injection when nothing else claims it. The
 * Commands.cjs command paths (openConfigFile, run, runBUI/runDWC, compile, decompile) are
 * covered by execution tests in commands-cjs-execution.test.ts, which loads and runs the
 * real Commands.cjs under vitest through commands-cjs-harness.ts (issue #565).
 */

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

describe('compiler-options - readerWithResolvedConfigFile', () => {
    test('injects the resolved path as -c when type checking is on, with no explicit config-file and no prefix-directories', () => {
        const read = readerFromCompilerConfig({ typeChecking: { enabled: true } });
        const wrapped = readerWithResolvedConfigFile(read, '/resolved/config.bbx');
        const argv = buildCompileOptionsFrom(wrapped);
        expect(argv.filter((a) => a.startsWith('-c'))).toEqual(['-c/resolved/config.bbx']);
    });

    test('an explicit typeChecking.configFile is not overwritten, and exactly one -c argument is produced', () => {
        const read = readerFromCompilerConfig({
            typeChecking: { enabled: true, configFile: '/explicit/config.bbx' }
        });
        const wrapped = readerWithResolvedConfigFile(read, '/resolved/config.bbx');
        const argv = buildCompileOptionsFrom(wrapped);
        expect(argv.filter((a) => a.startsWith('-c'))).toEqual(['-c/explicit/config.bbx']);
    });

    test('with prefix-directories set, no injection occurs and validateOptionsFrom reports no conflict', () => {
        const read = readerFromCompilerConfig({
            typeChecking: { enabled: true, prefixDirectories: '/prefix/dir' }
        });
        const wrapped = readerWithResolvedConfigFile(read, '/resolved/config.bbx');
        const argv = buildCompileOptionsFrom(wrapped);
        expect(argv.some((a) => a.startsWith('-c'))).toBe(false);
        expect(argv).toContain('-P/prefix/dir');

        const validation = validateOptionsFrom(wrapped);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toEqual([]);
    });

    test('type checking off: no injection regardless of the resolved path', () => {
        const read = readerFromCompilerConfig({ typeChecking: { enabled: false } });
        const wrapped = readerWithResolvedConfigFile(read, '/resolved/config.bbx');
        const argv = buildCompileOptionsFrom(wrapped);
        expect(argv.some((a) => a.startsWith('-c'))).toBe(false);
    });

    test('a null resolved path never injects', () => {
        const read = readerFromCompilerConfig({ typeChecking: { enabled: true } });
        const wrapped = readerWithResolvedConfigFile(read, null);
        const argv = buildCompileOptionsFrom(wrapped);
        expect(argv.some((a) => a.startsWith('-c'))).toBe(false);
    });

    test('the argument order is unchanged from a reader without injection when injection does not apply', () => {
        const config = {
            typeChecking: { enabled: true, configFile: '/explicit/config.bbx', warnings: true },
            output: { directory: '/tmp/out' }
        };
        const read = readerFromCompilerConfig(config);
        const wrapped = readerWithResolvedConfigFile(read, '/resolved/config.bbx');
        expect(buildCompileOptionsFrom(wrapped)).toEqual(buildCompileOptionsFrom(read));
    });

    test('the injected -c argument lands at the same argv position an explicit value would', () => {
        const explicitConfig = {
            typeChecking: { enabled: true, configFile: '/explicit/config.bbx', warnings: true },
            output: { directory: '/tmp/out' }
        };
        const explicitArgv = buildCompileOptionsFrom(readerFromCompilerConfig(explicitConfig));

        const injectedConfig = {
            typeChecking: { enabled: true, warnings: true },
            output: { directory: '/tmp/out' }
        };
        const injectedRead = readerFromCompilerConfig(injectedConfig);
        const injectedArgv = buildCompileOptionsFrom(
            readerWithResolvedConfigFile(injectedRead, '/explicit/config.bbx')
        );

        expect(injectedArgv).toEqual(explicitArgv);
    });
});
