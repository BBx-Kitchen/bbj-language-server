import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Shared layout validator for a configured BBj installation directory (`bbj.home`).
 *
 * Both execution surfaces that resolve an executable path from `bbj.home` — the
 * language server's compiler invocation and the extension's command launcher —
 * import this module. It has two entry points, each returning exactly one of
 * `path` or `reason`:
 *
 * - {@link resolveBbjBinary} takes a home directory and a binary name and
 *   builds the executable path itself.
 * - {@link confineBbjExecutable} takes an already-built executable path,
 *   recovers the home directory and binary name from it, and delegates to
 *   {@link resolveBbjBinary}. It returns the reconstructed path it checked
 *   rather than the candidate it was given.
 *
 * Imports `node:fs` and `node:path` only, so this module is importable from
 * both the language-server bundle and the extension bundle.
 */

/** The BBj programs this module knows how to locate under `<bbjHome>/bin`. */
export type BbjBinaryName = 'bbj' | 'bbjcpl' | 'bbjlst';

const BBJ_BINARY_NAMES: readonly BbjBinaryName[] = ['bbj', 'bbjcpl', 'bbjlst'];

function isBbjBinaryName(name: string): name is BbjBinaryName {
    return (BBJ_BINARY_NAMES as readonly string[]).includes(name);
}

/**
 * Result of a resolution attempt. Exactly one of `path` or `reason` is set.
 */
export interface BbjBinaryResolution {
    path?: string;
    reason?: string;
}

const EXE_SUFFIX = '.exe';

function suffixed(name: string, platform: NodeJS.Platform): string {
    return platform === 'win32' ? `${name}${EXE_SUFFIX}` : name;
}

function isDirectorySync(p: string): boolean {
    try {
        return fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
}

function isExecutableFile(p: string): boolean {
    try {
        if (!fs.statSync(p).isFile()) {
            return false;
        }
        fs.accessSync(p, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

// Requirement order is fixed and each reason string is unique, so a caller or a
// test can tell which requirement failed.
const REASON_NOT_ABSOLUTE = 'bbj.home must be an absolute path';
const REASON_NOT_DIRECTORY = 'bbj.home must be an existing directory';
const REASON_NO_BBJCPL = 'bbj.home must contain an executable bin/bbjcpl';
const REASON_NO_BBJ = 'bbj.home must contain an executable bin/bbj';
const REASON_NO_CFG = 'bbj.home must contain a cfg directory';
const REASON_REQUESTED_NOT_EXECUTABLE = 'the requested binary must be an executable file under bbj.home/bin';
const REASON_UNKNOWN_PROGRAM_NAME = 'the executable name must be a known bbj program name';
const REASON_NOT_IN_BIN = "the executable's parent directory must be named bin";

/**
 * Resolve the path to `binary` under `bbjHome`, checking that `bbjHome` matches
 * the expected BBj installation layout first.
 *
 * Checks, in order: `bbjHome` is an absolute path; `bbjHome` is an existing
 * directory; `<bbjHome>/bin/bbjcpl` (with the platform's executable suffix) is
 * an executable file; `<bbjHome>/bin/bbj` (with suffix) is an executable file;
 * `<bbjHome>/cfg` is an existing directory; the requested binary itself is an
 * executable file under `<bbjHome>/bin`. The first unmet check's reason is
 * returned; only when every check passes is a `path` returned, and it is built
 * from the same `bbjHome`/`bin`/name join every check ran against.
 */
export function resolveBbjBinary(
    bbjHome: string,
    binary: BbjBinaryName,
    platform: NodeJS.Platform = process.platform
): BbjBinaryResolution {
    if (!path.isAbsolute(bbjHome)) {
        return { reason: REASON_NOT_ABSOLUTE };
    }
    if (!isDirectorySync(bbjHome)) {
        return { reason: REASON_NOT_DIRECTORY };
    }

    const bbjcplMarker = path.join(bbjHome, 'bin', suffixed('bbjcpl', platform));
    if (!isExecutableFile(bbjcplMarker)) {
        return { reason: REASON_NO_BBJCPL };
    }

    const bbjMarker = path.join(bbjHome, 'bin', suffixed('bbj', platform));
    if (!isExecutableFile(bbjMarker)) {
        return { reason: REASON_NO_BBJ };
    }

    const cfgDir = path.join(bbjHome, 'cfg');
    if (!isDirectorySync(cfgDir)) {
        return { reason: REASON_NO_CFG };
    }

    const requested = path.join(bbjHome, 'bin', suffixed(binary, platform));
    if (!isExecutableFile(requested)) {
        return { reason: REASON_REQUESTED_NOT_EXECUTABLE };
    }

    return { path: requested };
}

/**
 * Validate an already-built executable path of the shape `<home>/bin/<name>`.
 *
 * Recovers `<name>` (stripping the platform's executable suffix) and the `bin`
 * parent segment from `candidate`, refuses unless the basename is one of
 * {@link BbjBinaryName} with the suffix matching `platform` and the parent
 * directory is named `bin`, then delegates to {@link resolveBbjBinary} with the
 * recovered home directory. The returned `path` is therefore the
 * reconstructed, normalised path every check ran against — never the raw
 * `candidate` string.
 */
export function confineBbjExecutable(
    candidate: string,
    platform: NodeJS.Platform = process.platform
): BbjBinaryResolution {
    const basename = path.basename(candidate);
    const suffixExpected = platform === 'win32';
    const hasSuffix = basename.toLowerCase().endsWith(EXE_SUFFIX);
    const bareName = hasSuffix ? basename.slice(0, basename.length - EXE_SUFFIX.length) : basename;

    if (hasSuffix !== suffixExpected || !isBbjBinaryName(bareName)) {
        return { reason: REASON_UNKNOWN_PROGRAM_NAME };
    }

    const binDir = path.dirname(candidate);
    if (path.basename(binDir) !== 'bin') {
        return { reason: REASON_NOT_IN_BIN };
    }

    const home = path.dirname(binDir);
    return resolveBbjBinary(home, bareName, platform);
}
