import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, test } from 'vitest';
import { resolveBbjBinary, confineBbjExecutable, type BbjBinaryResolution } from '../src/bbj-home-layout.js';

/**
 * Direct unit coverage of both `bbj-home-layout.ts` entry points. `cpl-service.test.ts`
 * and `process-runner.test.ts` prove the two consuming surfaces reject an unconfined
 * path end to end; this file pins the resolver's own edge semantics — which
 * requirement failed, what a trailing slash or an interior `..` segment does, what
 * happens to symlinks, and what a non-executable or wrongly-typed marker does — none
 * of which those two files can show cheaply.
 *
 * Test names state the input and the outcome; none states *why* a requirement exists.
 */

const FULL_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-bbjhome');
const PARTIAL_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-partial-bbjhome');
const NOCFG_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-nocfg-bbjhome');
const CFGFILE_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-cfgfile-bbjhome');
const NONEXEC_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-nonexec-bbjhome');
const SYMLINK_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-symlink-bbjhome');
const SYMLINKBIN_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-symlinkbin-bbjhome');
const LST_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-lst-bbjhome');

const WIN32 = process.platform === 'win32';

// Built once from process.cwd() so the relative-bbjHome case does not depend on which
// directory vitest happens to be invoked from, and reused everywhere else this exact
// relative input is needed.
const RELATIVE_FULL_HOME = path.relative(process.cwd(), FULL_HOME);
const NONEXISTENT_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-does-not-exist');

/**
 * Asserts the exactly-one-field invariant: for every resolution, precisely one of
 * `path` and `reason` is a non-empty string. Called from every case below so the
 * invariant is pinned once and applied everywhere.
 */
function expectExactlyOneField(resolution: BbjBinaryResolution): void {
    const hasPath = typeof resolution.path === 'string' && resolution.path.length > 0;
    const hasReason = typeof resolution.reason === 'string' && resolution.reason.length > 0;
    expect(hasPath).not.toBe(hasReason);
    expect(hasPath || hasReason).toBe(true);
}

describe('resolveBbjBinary', () => {
    test('full layout resolves to bin/bbjcpl with no reason', () => {
        const resolution = resolveBbjBinary(FULL_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.path).toBe(path.join(FULL_HOME, 'bin', 'bbjcpl'));
        expect(resolution.reason).toBeUndefined();
    });

    test('the resolved basename carries the platform executable suffix', () => {
        const resolution = resolveBbjBinary(FULL_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        const expectedBasename = WIN32 ? 'bbjcpl.exe' : 'bbjcpl';
        expect(path.basename(resolution.path as string)).toBe(expectedBasename);
    });

    test('only bin/bbjcpl present returns the bin/bbj reason', () => {
        const resolution = resolveBbjBinary(PARTIAL_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must contain an executable bin/bbj');
    });

    test('missing cfg directory returns the cfg reason', () => {
        const resolution = resolveBbjBinary(NOCFG_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must contain a cfg directory');
    });

    test('cfg present as a file rather than a directory returns the cfg reason', () => {
        const resolution = resolveBbjBinary(CFGFILE_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must contain a cfg directory');
    });

    test('bin/bbjcpl present but not executable returns the bin/bbjcpl reason (POSIX only)', () => {
        if (WIN32) {
            // The executable bit is not distinguishable on win32.
            return;
        }
        const resolution = resolveBbjBinary(NONEXEC_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must contain an executable bin/bbjcpl');
    });

    test('bbjHome that is a file rather than a directory returns the directory reason', () => {
        const resolution = resolveBbjBinary(path.join(FULL_HOME, 'bin', 'bbjcpl'), 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must be an existing directory');
    });

    test('bbjHome that does not exist returns the directory reason', () => {
        const resolution = resolveBbjBinary(path.join(__dirname, 'test-data', 'cpl-fixture-does-not-exist'), 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must be an existing directory');
    });

    test('a relative bbjHome is refused with the absolute-path reason, not any marker reason', () => {
        const resolution = resolveBbjBinary(RELATIVE_FULL_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must be an absolute path');
        expect(resolution.reason).not.toBe('bbj.home must contain an executable bin/bbjcpl');
        expect(resolution.reason).not.toBe('bbj.home must contain an executable bin/bbj');
        expect(resolution.reason).not.toBe('bbj.home must contain a cfg directory');
    });

    test('a trailing separator resolves to the same path as the plain full-layout fixture', () => {
        const withTrailingSlash = FULL_HOME + path.sep;
        const resolution = resolveBbjBinary(withTrailingSlash, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.path).toBe(path.join(FULL_HOME, 'bin', 'bbjcpl'));
    });

    test('an interior .. segment resolves to the same path as the plain full-layout fixture', () => {
        const withInteriorDotDot = path.join(FULL_HOME, 'bin', '..');
        const resolution = resolveBbjBinary(withInteriorDotDot, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.path).toBe(path.join(FULL_HOME, 'bin', 'bbjcpl'));
    });

    test('a symlinked bbjHome resolves successfully', () => {
        if (WIN32) {
            return;
        }
        if (!fs.lstatSync(SYMLINK_HOME).isSymbolicLink()) {
            // A checkout that did not materialise a real symlink is testing something else.
            return;
        }
        const resolution = resolveBbjBinary(SYMLINK_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.path).toBeDefined();
        expect(resolution.reason).toBeUndefined();
    });

    test('a bin/bbjcpl that is itself a symlink to a satisfying target resolves successfully', () => {
        if (WIN32) {
            return;
        }
        if (!fs.lstatSync(path.join(SYMLINKBIN_HOME, 'bin', 'bbjcpl')).isSymbolicLink()) {
            return;
        }
        const resolution = resolveBbjBinary(SYMLINKBIN_HOME, 'bbjcpl');
        expectExactlyOneField(resolution);
        expect(resolution.path).toBeDefined();
        expect(resolution.reason).toBeUndefined();
    });

    test('the five requirement-isolating inputs produce five distinct reasons', () => {
        const reasons = new Set<string>();
        reasons.add(resolveBbjBinary(RELATIVE_FULL_HOME, 'bbjcpl').reason as string);
        reasons.add(resolveBbjBinary(NONEXISTENT_HOME, 'bbjcpl').reason as string);
        reasons.add(resolveBbjBinary(PARTIAL_HOME, 'bbjcpl').reason as string);
        reasons.add(resolveBbjBinary(NOCFG_HOME, 'bbjcpl').reason as string);
        if (!WIN32) {
            reasons.add(resolveBbjBinary(NONEXEC_HOME, 'bbjcpl').reason as string);
            expect(reasons.size).toBe(5);
        } else {
            expect(reasons.size).toBe(4);
        }
    });

    test('never throws for a path containing a newline', () => {
        const resolution = resolveBbjBinary('/tmp/evil\npath-does-not-exist', 'bbjcpl');
        expect(resolution.reason).toBeDefined();
        expect(resolution.path).toBeUndefined();
    });

    test('never throws for a path containing a control character', () => {
        const resolution = resolveBbjBinary('/tmp/evil\x07path-does-not-exist', 'bbjcpl');
        expect(resolution.reason).toBeDefined();
        expect(resolution.path).toBeUndefined();
    });

    test("bbjlst against the full-layout fixture returns the sixth requirement's reason", () => {
        const resolution = resolveBbjBinary(FULL_HOME, 'bbjlst');
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('the requested binary must be an executable file under bbj.home/bin');
    });

    test('bbjlst against a fixture carrying bin/bbjlst returns a path', () => {
        const resolution = resolveBbjBinary(LST_HOME, 'bbjlst');
        expectExactlyOneField(resolution);
        expect(resolution.path).toBe(path.join(LST_HOME, 'bin', WIN32 ? 'bbjlst.exe' : 'bbjlst'));
        expect(resolution.reason).toBeUndefined();
    });
});

describe('confineBbjExecutable', () => {
    test('a satisfying full-layout candidate resolves to a path', () => {
        const candidate = path.join(FULL_HOME, 'bin', 'bbjcpl');
        const resolution = confineBbjExecutable(candidate);
        expectExactlyOneField(resolution);
        expect(resolution.path).toBe(candidate);
    });

    test('a candidate with a doubled separator before bin reconstructs to the same path as the plain form', () => {
        const plain = path.join(FULL_HOME, 'bin', 'bbjcpl');
        const doubled = FULL_HOME + path.sep + path.sep + 'bin' + path.sep + 'bbjcpl';
        const plainResolution = confineBbjExecutable(plain);
        const doubledResolution = confineBbjExecutable(doubled);
        expectExactlyOneField(plainResolution);
        expectExactlyOneField(doubledResolution);
        expect(doubledResolution.path).toBe(plainResolution.path);
    });

    test('a basename that is not a known bbj program name returns its own reason', () => {
        const resolution = confineBbjExecutable(path.join(FULL_HOME, 'bin', 'notbbj'));
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('the executable name must be a known bbj program name');
    });

    test("a parent directory not named bin returns its own reason", () => {
        const resolution = confineBbjExecutable(path.join(FULL_HOME, 'cfg', 'bbj'));
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe("the executable's parent directory must be named bin");
    });

    test('a candidate under the partial fixture delegates to resolveBbjBinary and returns its bin/bbj reason', () => {
        const resolution = confineBbjExecutable(path.join(PARTIAL_HOME, 'bin', 'bbjcpl'));
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must contain an executable bin/bbj');
    });

    test('a bare relative path returns the absolute-path reason', () => {
        const resolution = confineBbjExecutable(path.join('bin', 'bbj'));
        expectExactlyOneField(resolution);
        expect(resolution.reason).toBe('bbj.home must be an absolute path');
    });

    test('the six resolveBbjBinary requirement-isolating inputs and the two confineBbjExecutable-only inputs produce eight distinct reasons', () => {
        const reasons = new Set<string>();
        reasons.add(resolveBbjBinary(RELATIVE_FULL_HOME, 'bbjcpl').reason as string);
        reasons.add(resolveBbjBinary(NONEXISTENT_HOME, 'bbjcpl').reason as string);
        reasons.add(resolveBbjBinary(PARTIAL_HOME, 'bbjcpl').reason as string);
        reasons.add(resolveBbjBinary(NOCFG_HOME, 'bbjcpl').reason as string);
        reasons.add(resolveBbjBinary(FULL_HOME, 'bbjlst').reason as string);
        reasons.add(confineBbjExecutable(path.join(FULL_HOME, 'bin', 'notbbj')).reason as string);
        reasons.add(confineBbjExecutable(path.join(FULL_HOME, 'cfg', 'bbj')).reason as string);
        if (!WIN32) {
            reasons.add(resolveBbjBinary(NONEXEC_HOME, 'bbjcpl').reason as string);
            expect(reasons.size).toBe(8);
        } else {
            expect(reasons.size).toBe(7);
        }
    });
});
