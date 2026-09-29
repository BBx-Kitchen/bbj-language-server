import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    JAVA_PATH_SETTING,
    checkJavaExecutable,
    findJavaOnPath,
    resolveFormatterJava,
    type JavaResolverDeps,
} from '../src/formatter-java-resolver.js';

/** A fake filesystem exposed through the resolver's injected probe shape. */
function fakeProbes(overrides: Partial<JavaResolverDeps> = {}): JavaResolverDeps {
    return {
        env: {},
        platform: 'linux',
        exists: () => false,
        isFile: () => false,
        isExecutable: () => false,
        ...overrides,
    };
}

describe('resolveFormatterJava', () => {
    test('a relative configured value is refused as not absolute, without walking PATH', () => {
        const deps = fakeProbes({ env: { PATH: '/should/not/be/consulted' } });
        const result = resolveFormatterJava('relative/java', deps);
        expect(result.path).toBeUndefined();
        expect(result.reason).toContain('relative/java');
        expect(result.reason).toContain('not an absolute path');
    });

    test('an absolute configured path that does not exist is refused naming the path and the problem', () => {
        const deps = fakeProbes({ exists: () => false });
        const result = resolveFormatterJava('/opt/jdk/bin/java', deps);
        expect(result.path).toBeUndefined();
        expect(result.reason).toContain('/opt/jdk/bin/java');
        expect(result.reason).toContain('does not exist');
    });

    test('an absolute configured path that is not a regular file is refused naming the path and the problem', () => {
        const deps = fakeProbes({ exists: () => true, isFile: () => false });
        const result = resolveFormatterJava('/opt/jdk/bin/java', deps);
        expect(result.reason).toContain('/opt/jdk/bin/java');
        expect(result.reason).toContain('not a regular file');
    });

    test('an absolute configured path that is not executable is refused naming the path and the problem', () => {
        const deps = fakeProbes({ exists: () => true, isFile: () => true, isExecutable: () => false });
        const result = resolveFormatterJava('/opt/jdk/bin/java', deps);
        expect(result.reason).toContain('/opt/jdk/bin/java');
        expect(result.reason).toContain('not executable');
    });

    test('an absolute configured path passing every check is accepted as-is', () => {
        const deps = fakeProbes({ exists: () => true, isFile: () => true, isExecutable: () => true });
        const result = resolveFormatterJava('/opt/jdk/bin/java', deps);
        expect(result.reason).toBeUndefined();
        expect(result.path).toBe('/opt/jdk/bin/java');
    });

    test('a non-string configured value is refused without walking PATH', () => {
        const deps = fakeProbes({ env: { PATH: '/should/not/be/consulted' } });
        const result = resolveFormatterJava(42, deps);
        expect(result.path).toBeUndefined();
        expect(result.reason).toBeDefined();
    });

    describe('undefined, null and blank values all fall through to the PATH walk', () => {
        test('undefined walks PATH and accepts the first hit', () => {
            const deps = fakeProbes({
                env: { PATH: '/usr/bin' },
                exists: (p) => p === '/usr/bin/java',
                isFile: () => true,
                isExecutable: () => true,
            });
            const result = resolveFormatterJava(undefined, deps);
            expect(result.path).toBe('/usr/bin/java');
        });

        test('null walks PATH and accepts the first hit', () => {
            const deps = fakeProbes({
                env: { PATH: '/usr/bin' },
                exists: (p) => p === '/usr/bin/java',
                isFile: () => true,
                isExecutable: () => true,
            });
            const result = resolveFormatterJava(null, deps);
            expect(result.path).toBe('/usr/bin/java');
        });

        test('a blank/whitespace-only string walks PATH and accepts the first hit', () => {
            const deps = fakeProbes({
                env: { PATH: '/usr/bin' },
                exists: (p) => p === '/usr/bin/java',
                isFile: () => true,
                isExecutable: () => true,
            });
            const result = resolveFormatterJava('   ', deps);
            expect(result.path).toBe('/usr/bin/java');
        });
    });

    test('no PATH hit is refused naming PATH and the setting', () => {
        const deps = fakeProbes({ env: { PATH: '/usr/bin' }, exists: () => false });
        const result = resolveFormatterJava(undefined, deps);
        expect(result.path).toBeUndefined();
        expect(result.reason).toContain('PATH');
        expect(result.reason).toContain(JAVA_PATH_SETTING);
    });

    test('a PATH hit that fails the check is refused naming the hit and the problem', () => {
        const deps = fakeProbes({
            env: { PATH: '/usr/bin' },
            exists: (p) => p === '/usr/bin/java',
            isFile: () => true,
            isExecutable: () => false,
        });
        const result = resolveFormatterJava(undefined, deps);
        expect(result.path).toBeUndefined();
        expect(result.reason).toContain('/usr/bin/java');
        expect(result.reason).toContain('not executable');
    });
});

describe('checkJavaExecutable', () => {
    test('checks run in order: not absolute, does not exist, not a regular file, not executable', () => {
        expect(checkJavaExecutable('relative', fakeProbes())).toBe('is not an absolute path');
        expect(checkJavaExecutable('/abs/java', fakeProbes({ exists: () => false }))).toBe('does not exist');
        expect(
            checkJavaExecutable('/abs/java', fakeProbes({ exists: () => true, isFile: () => false }))
        ).toBe('is not a regular file');
        expect(
            checkJavaExecutable(
                '/abs/java',
                fakeProbes({ exists: () => true, isFile: () => true, isExecutable: () => false })
            )
        ).toBe('is not executable');
        expect(
            checkJavaExecutable(
                '/abs/java',
                fakeProbes({ exists: () => true, isFile: () => true, isExecutable: () => true })
            )
        ).toBeUndefined();
    });
});

describe('findJavaOnPath', () => {
    test('returns the first existing PATH entry candidate', () => {
        const deps = fakeProbes({
            env: { PATH: '/opt/a:/opt/b' },
            exists: (p) => p === '/opt/b/java',
        });
        expect(findJavaOnPath(deps)).toBe('/opt/b/java');
    });

    test('relative PATH entries are skipped', () => {
        const deps = fakeProbes({
            env: { PATH: 'relative/dir:/opt/found' },
            exists: (p) => p === '/opt/found/java',
        });
        expect(findJavaOnPath(deps)).toBe('/opt/found/java');
    });

    test('empty PATH entries are skipped', () => {
        const deps = fakeProbes({
            env: { PATH: '::/opt/found' },
            exists: (p) => p === '/opt/found/java',
        });
        expect(findJavaOnPath(deps)).toBe('/opt/found/java');
    });

    test('an absent PATH returns no hit', () => {
        const deps = fakeProbes({ env: {} });
        expect(findJavaOnPath(deps)).toBeUndefined();
    });

    describe('win32', () => {
        test('follows PATHEXT order and skips a relative PATH entry', () => {
            const deps = fakeProbes({
                platform: 'win32',
                env: { Path: 'C:\\jdk\\bin;relative\\dir', PATHEXT: '.COM;.EXE' },
                exists: (p) => p === 'C:\\jdk\\bin\\java.EXE',
            });
            expect(findJavaOnPath(deps)).toBe('C:\\jdk\\bin\\java.EXE');
        });

        test('without PATHEXT, tries .COM, .EXE, .BAT, .CMD in that order', () => {
            const tried: string[] = [];
            const deps = fakeProbes({
                platform: 'win32',
                env: { Path: 'C:\\jdk\\bin' },
                exists: (p) => {
                    tried.push(p);
                    return p === 'C:\\jdk\\bin\\java.CMD';
                },
            });
            expect(findJavaOnPath(deps)).toBe('C:\\jdk\\bin\\java.CMD');
            expect(tried).toEqual([
                'C:\\jdk\\bin\\java.COM',
                'C:\\jdk\\bin\\java.EXE',
                'C:\\jdk\\bin\\java.BAT',
                'C:\\jdk\\bin\\java.CMD',
            ]);
        });

        test('accepts a quoted PATH entry after stripping the quotes', () => {
            const deps = fakeProbes({
                platform: 'win32',
                env: { Path: '"C:\\Program Files\\Java\\bin";C:\\other', PATHEXT: '.EXE' },
                exists: (p) => p === 'C:\\Program Files\\Java\\bin\\java.EXE',
            });
            expect(findJavaOnPath(deps)).toBe('C:\\Program Files\\Java\\bin\\java.EXE');
        });

        test('checks the first existing hit, not a later better one', () => {
            const deps = fakeProbes({
                platform: 'win32',
                env: { Path: 'C:\\first;C:\\second', PATHEXT: '.EXE' },
                exists: (p) => p === 'C:\\first\\java.EXE' || p === 'C:\\second\\java.EXE',
                isFile: () => true,
                isExecutable: (p) => p === 'C:\\second\\java.EXE',
            });
            const found = findJavaOnPath(deps);
            expect(found).toBe('C:\\first\\java.EXE');
            const reason = checkJavaExecutable(found as string, deps);
            expect(reason).toBe('is not executable');
        });
    });
});

describe('checkJavaExecutable on win32', () => {
    test('treats C:\\jdk\\bin\\java.exe as absolute and jdk\\bin\\java.exe as not absolute', () => {
        const deps = fakeProbes({ platform: 'win32', exists: () => false });
        expect(checkJavaExecutable('C:\\jdk\\bin\\java.exe', deps)).toBe('does not exist');
        expect(checkJavaExecutable('jdk\\bin\\java.exe', deps)).toBe('is not an absolute path');
    });
});

describe('package.json manifest', () => {
    test('declares bbj.formatter.javaPath with type string, default "" and scope machine', () => {
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const setting = packageJson.contributes.configuration.properties[JAVA_PATH_SETTING];
        expect(setting).toBeDefined();
        expect(setting.type).toBe('string');
        expect(setting.default).toBe('');
        expect(setting.scope).toBe('machine');
    });
});

describe('real filesystem (POSIX permission checks)', () => {
    test.skipIf(process.platform === 'win32')(
        'an executable temp file passes checkJavaExecutable; the same file without the executable bit is refused naming it',
        () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formatter-java-resolver-test-'));
            try {
                const executablePath = path.join(tmpDir, 'java-exec');
                fs.writeFileSync(executablePath, '#!/bin/sh\n');
                fs.chmodSync(executablePath, 0o755);
                expect(checkJavaExecutable(executablePath)).toBeUndefined();

                const nonExecutablePath = path.join(tmpDir, 'java-noexec');
                fs.writeFileSync(nonExecutablePath, '#!/bin/sh\n');
                fs.chmodSync(nonExecutablePath, 0o644);
                const reason = checkJavaExecutable(nonExecutablePath);
                expect(reason).toBe('is not executable');

                const resolved = resolveFormatterJava(nonExecutablePath);
                expect(resolved.path).toBeUndefined();
                expect(resolved.reason).toContain(nonExecutablePath);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        }
    );

    test.skipIf(process.platform === 'win32')(
        'findJavaOnPath finds a later PATH entry, accepts a symlinked executable, and refuses a directory named java',
        () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formatter-java-resolver-realpath-test-'));
            try {
                const tempA = path.join(tmpDir, 'a');
                const tempB = path.join(tmpDir, 'b');
                fs.mkdirSync(tempA);
                fs.mkdirSync(tempB);

                const realExecutable = path.join(tmpDir, 'real-java');
                fs.writeFileSync(realExecutable, '#!/bin/sh\n');
                fs.chmodSync(realExecutable, 0o755);

                const symlinkedJava = path.join(tempA, 'java');
                fs.symlinkSync(realExecutable, symlinkedJava);

                const found = findJavaOnPath({ env: { PATH: `${tempA}:${tempB}` } });
                expect(found).toBe(symlinkedJava);
                expect(checkJavaExecutable(found as string)).toBeUndefined();

                // A later PATH entry is found when the earlier one has no java at all.
                fs.rmSync(symlinkedJava);
                const executableInB = path.join(tempB, 'java');
                fs.writeFileSync(executableInB, '#!/bin/sh\n');
                fs.chmodSync(executableInB, 0o755);
                expect(findJavaOnPath({ env: { PATH: `${tempA}:${tempB}` } })).toBe(executableInB);

                // A directory named java is refused as not a regular file.
                fs.rmSync(executableInB);
                fs.mkdirSync(executableInB);
                const dirHit = findJavaOnPath({ env: { PATH: `${tempA}:${tempB}` } });
                expect(dirHit).toBe(executableInB);
                expect(checkJavaExecutable(dirHit as string)).toBe('is not a regular file');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        }
    );
});
