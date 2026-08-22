import { describe, expect, test } from 'vitest';
import {
    bbjBin,
    bbjlstBin,
    bbjcplBin,
    buildRunArgv,
    buildWebRunArgv,
    buildCompileArgv,
    buildDecompileArgv,
    buildEmValidateArgv,
    buildEmLoginArgv
} from '../src/Commands/process-args.js';

/**
 * GHSA-p5f3-9456-9pcx (CWE-78): these tests prove that workspace-settable
 * configuration values reach the child process as inert argument-array elements
 * rather than being interpolated into a shell command string. The metacharacter
 * fixture below is inert test data proving pass-through, not an exploit.
 */
const METACHAR_FIXTURE = 'legit;`injected`';

describe('process-args - executable path helpers', () => {
    test('bbjBin appends .exe only on win32', () => {
        expect(bbjBin('/opt/bbj', 'linux')).toBe('/opt/bbj/bin/bbj');
        expect(bbjBin('C:\\bbj', 'win32')).toBe('C:\\bbj/bin/bbj.exe');
    });

    test('bbjlstBin appends .exe only on win32', () => {
        expect(bbjlstBin('/opt/bbj', 'linux')).toBe('/opt/bbj/bin/bbjlst');
        expect(bbjlstBin('C:\\bbj', 'win32')).toBe('C:\\bbj/bin/bbjlst.exe');
    });

    test('bbjcplBin appends .exe only on win32', () => {
        expect(bbjcplBin('/opt/bbj', 'linux')).toBe('/opt/bbj/bin/bbjcpl');
        expect(bbjcplBin('C:\\bbj', 'win32')).toBe('C:\\bbj/bin/bbjcpl.exe');
    });
});

describe('process-args - buildRunArgv (bbj.classpath / bbj.configPath / params.fsPath group)', () => {
    test('builds the expected argv shape', () => {
        const argv = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: 'bbj_default',
            configPath: null,
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        expect(argv.file).toBe('/opt/bbj/bin/bbj');
        expect(argv.args).toEqual(['-q', '-CPbbj_default', '-WD/w', '/w/a.bbj']);
    });

    test('omits -CP and -c when classpathEntry/configPath are empty or absent', () => {
        const argv = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: '',
            configPath: '',
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        expect(argv.args).toEqual(['-q', '-WD/w', '/w/a.bbj']);

        const argvUndefined = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        expect(argvUndefined.args).toEqual(['-q', '-WD/w', '/w/a.bbj']);
    });

    test('a classpathEntry carrying a shell metacharacter is one verbatim element', () => {
        const argv = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: METACHAR_FIXTURE,
            configPath: null,
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        const cpArg = argv.args.find((a) => a.startsWith('-CP'));
        expect(cpArg).toBe(`-CP${METACHAR_FIXTURE}`);
        const others = argv.args.filter((a) => a !== cpArg);
        for (const other of others) {
            expect(other.includes(METACHAR_FIXTURE)).toBe(false);
        }
    });

    test('a fileName carrying a shell metacharacter is one verbatim element', () => {
        const fileName = `/w/${METACHAR_FIXTURE}.bbj`;
        const argv = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: null,
            configPath: null,
            workingDir: '/w',
            fileName
        });
        expect(argv.args[argv.args.length - 1]).toBe(fileName);
    });

    test('args is always an array of strings, never a joined command line', () => {
        const argv = buildRunArgv({
            home: '/opt/bbj',
            platform: 'linux',
            classpathEntry: 'bbj_default',
            configPath: '/cfg/config.bbx',
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        expect(Array.isArray(argv.args)).toBe(true);
        for (const a of argv.args) {
            expect(typeof a).toBe('string');
        }
    });
});

describe('process-args - buildWebRunArgv (bbj.web.apps.<file>.name / bbj.configPath / params.fsPath group)', () => {
    const baseOpts = {
        home: '/opt/bbj',
        platform: 'linux' as NodeJS.Platform,
        toolsDir: '/ext/tools',
        client: 'BUI',
        name: 'myapp',
        programme: 'myapp.bbj',
        workingDir: '/w',
        username: 'user',
        password: 'pass',
        classpathEntry: 'bbj_default',
        token: '',
        configPath: '/cfg/config.bbx'
    };

    test('emits the ten positional elements in today\'s order, with credentials and token on env instead', () => {
        const argv = buildWebRunArgv(baseOpts);
        expect(argv.file).toBe('/opt/bbj/bin/bbj');
        expect(argv.args).toEqual([
            '-q',
            '-WD/ext/tools',
            '/ext/tools/web.bbj',
            '-',
            'BUI',
            'myapp',
            'myapp.bbj',
            '/w',
            'bbj_default',
            '/cfg/config.bbx'
        ]);
        expect(argv.args).toHaveLength(10);
        expect(argv.env?.['BBJ_EM_USERNAME']).toBe('user');
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe('pass');
        expect(argv.env?.['BBJ_EM_TOKEN']).toBe('');
    });

    test('empty credentials and token are carried as empty environment values, not dropped, and are absent from args', () => {
        const argv = buildWebRunArgv({ ...baseOpts, username: '', password: '', token: '' });
        expect(argv.env?.['BBJ_EM_USERNAME']).toBe('');
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe('');
        expect(argv.env?.['BBJ_EM_TOKEN']).toBe('');
        expect(argv.args).toHaveLength(10);
    });

    test('an app name carrying a shell metacharacter is one verbatim element', () => {
        const argv = buildWebRunArgv({ ...baseOpts, name: METACHAR_FIXTURE });
        expect(argv.args[5]).toBe(METACHAR_FIXTURE);
        const others = argv.args.filter((_, i) => i !== 5);
        for (const other of others) {
            expect(other.includes(METACHAR_FIXTURE)).toBe(false);
        }
    });

    test('a configPath carrying a shell metacharacter is one verbatim element', () => {
        const argv = buildWebRunArgv({ ...baseOpts, configPath: METACHAR_FIXTURE });
        expect(argv.args[9]).toBe(METACHAR_FIXTURE);
    });

    test('a fileName (programme) carrying a shell metacharacter is one verbatim element', () => {
        const argv = buildWebRunArgv({ ...baseOpts, programme: METACHAR_FIXTURE });
        expect(argv.args[6]).toBe(METACHAR_FIXTURE);
    });
});

describe('process-args - buildCompileArgv (bbj.compiler.* group)', () => {
    test('forwards buildCompileOptions elements in order, then the file name last', () => {
        const argv = buildCompileArgv({
            home: '/opt/bbj',
            platform: 'linux',
            compilerOptions: ['-t', '-Werror'],
            fileName: '/w/a.bbj'
        });
        expect(argv.file).toBe('/opt/bbj/bin/bbjcpl');
        expect(argv.args).toEqual(['-t', '-Werror', '/w/a.bbj']);
    });

    test('an option value carrying a metacharacter stays in one element', () => {
        const argv = buildCompileArgv({
            home: '/opt/bbj',
            platform: 'linux',
            compilerOptions: [`-p${METACHAR_FIXTURE}`],
            fileName: '/w/a.bbj'
        });
        expect(argv.args[0]).toBe(`-p${METACHAR_FIXTURE}`);
    });

    test('an option value containing a space stays in one element (deliberate pre-existing-bug fix)', () => {
        const argv = buildCompileArgv({
            home: '/opt/bbj',
            platform: 'linux',
            compilerOptions: ['-oC:\\Program Files\\out'],
            fileName: '/w/a.bbj'
        });
        expect(argv.args[0]).toBe('-oC:\\Program Files\\out');
        expect(argv.args).toHaveLength(2);
    });

    test('a fileName carrying a shell metacharacter is one verbatim element', () => {
        const fileName = `/w/${METACHAR_FIXTURE}.bbj`;
        const argv = buildCompileArgv({ home: '/opt/bbj', platform: 'linux', compilerOptions: [], fileName });
        expect(argv.args[argv.args.length - 1]).toBe(fileName);
    });
});

describe('process-args - buildDecompileArgv', () => {
    test('no flags when not denumbering', () => {
        const argv = buildDecompileArgv({ home: '/opt/bbj', platform: 'linux', fileName: '/w/a.bbj' });
        expect(argv.args).toEqual(['/w/a.bbj']);
    });

    test("['-l'] when denumbering a non-.lst input", () => {
        const argv = buildDecompileArgv({ home: '/opt/bbj', platform: 'linux', fileName: '/w/a.bbj', denumber: true });
        expect(argv.args).toEqual(['-l', '/w/a.bbj']);
    });

    test("['-l', '-xlst'] when denumbering a .lst input", () => {
        const argv = buildDecompileArgv({ home: '/opt/bbj', platform: 'linux', fileName: '/w/a.lst', denumber: true });
        expect(argv.args).toEqual(['-l', '-xlst', '/w/a.lst']);
    });

    test('a fileName carrying a shell metacharacter is one verbatim element', () => {
        const fileName = `/w/${METACHAR_FIXTURE}.bbj`;
        const argv = buildDecompileArgv({ home: '/opt/bbj', platform: 'linux', fileName, denumber: true });
        expect(argv.args[argv.args.length - 1]).toBe(fileName);
    });
});

describe('process-args - EM launches', () => {
    test('buildEmValidateArgv returns the four non-secret elements in order, with the token on env instead', () => {
        const argv = buildEmValidateArgv({
            home: '/opt/bbj',
            platform: 'linux',
            scriptPath: '/ext/tools/em-validate-token.bbj',
            token: 'tok-123',
            tmpFile: '/tmp/out.tmp'
        });
        expect(argv.file).toBe('/opt/bbj/bin/bbj');
        expect(argv.args).toEqual(['-q', '/ext/tools/em-validate-token.bbj', '-', '/tmp/out.tmp']);
        expect(argv.args).not.toContain('tok-123');
        expect(argv.env?.['BBJ_EM_TOKEN']).toBe('tok-123');
    });

    test('buildEmValidateArgv keeps a metacharacter-bearing token in the env map, never in args', () => {
        const argv = buildEmValidateArgv({
            home: '/opt/bbj',
            platform: 'linux',
            scriptPath: '/ext/tools/em-validate-token.bbj',
            token: METACHAR_FIXTURE,
            tmpFile: '/tmp/out.tmp'
        });
        expect(argv.env?.['BBJ_EM_TOKEN']).toBe(METACHAR_FIXTURE);
        expect(argv.args.some((a) => a.includes(METACHAR_FIXTURE))).toBe(false);
    });

    test('buildEmLoginArgv returns the five elements in order, with credentials on env instead', () => {
        const argv = buildEmLoginArgv({
            home: '/opt/bbj',
            platform: 'linux',
            scriptPath: '/ext/tools/em-login.bbj',
            username: 'admin',
            password: 'secret',
            tmpFile: '/tmp/out.tmp',
            infoString: 'VS Code on Linux as dev'
        });
        expect(argv.file).toBe('/opt/bbj/bin/bbj');
        expect(argv.args).toEqual([
            '-q',
            '/ext/tools/em-login.bbj',
            '-',
            '/tmp/out.tmp',
            'VS Code on Linux as dev'
        ]);
        expect(argv.env?.['BBJ_EM_USERNAME']).toBe('admin');
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe('secret');
    });

    test('buildEmLoginArgv keeps metacharacter-bearing credentials on the environment side and preserves spaces in the info string at its new index', () => {
        const argv = buildEmLoginArgv({
            home: '/opt/bbj',
            platform: 'linux',
            scriptPath: '/ext/tools/em-login.bbj',
            username: METACHAR_FIXTURE,
            password: METACHAR_FIXTURE,
            tmpFile: '/tmp/out.tmp',
            infoString: 'VS Code on Linux as dev'
        });
        expect(argv.env?.['BBJ_EM_USERNAME']).toBe(METACHAR_FIXTURE);
        expect(argv.env?.['BBJ_EM_PASSWORD']).toBe(METACHAR_FIXTURE);
        expect(argv.args.some((a) => a.includes(METACHAR_FIXTURE))).toBe(false);
        expect(argv.args[4]).toBe('VS Code on Linux as dev');
    });
});
