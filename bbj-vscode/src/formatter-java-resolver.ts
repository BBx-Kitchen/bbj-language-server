// Chooses and verifies the java executable the formatter spawns (issue #605).
//
// A configured bbj.formatter.javaPath is checked and never replaced by a PATH lookup: an
// invalid setting cancels formatting instead of falling back. An empty setting is resolved by
// this module's own PATH walk, so the spawn always receives an absolute, checked path either
// way. Kept free of Langium and editor imports (plain Node `fs`/`path` only) so it is
// unit-testable with injected probes and does not add a fourth entry to the process-launcher
// import guard in no-shell-command-construction.test.ts.
import * as fs from 'fs';
import * as path from 'path';

/** The VS Code setting this module resolves and verifies before every formatter spawn. */
export const JAVA_PATH_SETTING = 'bbj.formatter.javaPath';

/** Injectable env/filesystem probes, used by tests to avoid touching the real environment. */
export interface JavaResolverDeps {
  /** Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Defaults to `process.platform`. */
  platform?: NodeJS.Platform;
  /** Returns whether `path` exists. Defaults to a real `fs.existsSync` probe. */
  exists?: (candidate: string) => boolean;
  /** Returns whether `path` is a regular file, following symlinks. Defaults to `fs.statSync`. */
  isFile?: (candidate: string) => boolean;
  /** Returns whether `path` is executable. Defaults to `fs.accessSync(X_OK)` (existence-only on Windows). */
  isExecutable?: (candidate: string) => boolean;
}

/** Result of a resolution attempt. Exactly one of `path` or `reason` is set. */
export interface FormatterJavaResolution {
  path?: string;
  reason?: string;
}

function defaultExists(candidate: string): boolean {
  return fs.existsSync(candidate);
}

function defaultIsFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function defaultIsExecutable(candidate: string): boolean {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

interface ResolvedDeps {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  exists: (candidate: string) => boolean;
  isFile: (candidate: string) => boolean;
  isExecutable: (candidate: string) => boolean;
}

function resolveDeps(deps: JavaResolverDeps = {}): ResolvedDeps {
  return {
    env: deps.env ?? process.env,
    platform: deps.platform ?? process.platform,
    exists: deps.exists ?? defaultExists,
    isFile: deps.isFile ?? defaultIsFile,
    isExecutable: deps.isExecutable ?? defaultIsExecutable,
  };
}

function pathModuleFor(platform: NodeJS.Platform): typeof path.posix {
  return platform === 'win32' ? path.win32 : path.posix;
}

/**
 * Checks a candidate java executable path, in order: is it absolute for the target platform,
 * does it exist, is it a regular file (symlinks followed — JDK installs commonly symlink
 * `java`), is it executable (`fs.accessSync(X_OK)`; on Windows this degrades to an existence
 * check). Returns the first failing check's reason, or `undefined` when every check passes.
 */
export function checkJavaExecutable(candidate: string, deps: JavaResolverDeps = {}): string | undefined {
  const { platform, exists, isFile, isExecutable } = resolveDeps(deps);
  const pathModule = pathModuleFor(platform);

  if (!pathModule.isAbsolute(candidate)) {
    return 'is not an absolute path';
  }
  if (!exists(candidate)) {
    return 'does not exist';
  }
  if (!isFile(candidate)) {
    return 'is not a regular file';
  }
  if (!isExecutable(candidate)) {
    return 'is not executable';
  }
  return undefined;
}

function pathEnvValue(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string | undefined {
  if (platform === 'win32') {
    // Windows environment variable lookups are case-insensitive; the actual key casing (PATH,
    // Path, path, ...) varies by how the process was launched.
    const key = Object.keys(env).find((candidateKey) => candidateKey.toLowerCase() === 'path');
    return key ? env[key] : undefined;
  }
  return env.PATH;
}

/**
 * Walks PATH looking for a `java` executable, returning the first entry's candidate whose
 * `exists` probe is true — never the first one that also passes {@link checkJavaExecutable};
 * the caller checks the single hit this function returns (the check applies only to the
 * first hit, so a later, better PATH entry is never silently substituted).
 *
 * Entries are split on the platform delimiter (`;` on win32, `:` elsewhere), trimmed, and
 * relative or empty entries are skipped — a relative PATH entry would resolve against the
 * extension host's own working directory, which is not what a user configuring PATH intends.
 *
 * Windows executable-extension handling (PATHEXT) is layered on by {@link findJavaOnPath}'s
 * platform branch below.
 */
export function findJavaOnPath(deps: JavaResolverDeps = {}): string | undefined {
  const resolved = resolveDeps(deps);
  const { env, platform, exists } = resolved;
  const pathValue = pathEnvValue(env, platform);
  if (!pathValue) {
    return undefined;
  }

  const delimiter = platform === 'win32' ? ';' : ':';
  const pathModule = pathModuleFor(platform);
  const entries = pathValue
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  for (const rawEntry of entries) {
    const entry = platform === 'win32' ? stripSurroundingQuotes(rawEntry) : rawEntry;
    if (!pathModule.isAbsolute(entry)) {
      continue;
    }
    for (const candidateName of candidateNamesFor(resolved)) {
      const candidate = pathModule.join(entry, candidateName);
      if (exists(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

function stripSurroundingQuotes(entry: string): string {
  if (entry.length >= 2 && entry.startsWith('"') && entry.endsWith('"')) {
    return entry.slice(1, -1);
  }
  return entry;
}

const DEFAULT_PATHEXT = '.COM;.EXE;.BAT;.CMD';

function candidateNamesFor(deps: ResolvedDeps): string[] {
  if (deps.platform !== 'win32') {
    return ['java'];
  }
  const pathextKey = Object.keys(deps.env).find((candidateKey) => candidateKey.toLowerCase() === 'pathext');
  const pathext = (pathextKey ? deps.env[pathextKey] : undefined) || DEFAULT_PATHEXT;
  const extensions = pathext
    .split(';')
    .map((ext) => ext.trim())
    .filter((ext) => ext.length > 0);
  return extensions.map((ext) => `java${ext}`);
}

/**
 * Resolves the java executable the formatter should spawn from the raw `bbj.formatter.javaPath`
 * setting value.
 *
 * A non-empty (after trimming) string is the configured path: it is checked and returned as-is
 * on success, or refused with a reason naming the configured value — PATH is never consulted in
 * this branch. A non-string, non-null, non-undefined value is refused the same way,
 * without walking PATH. `undefined`, `null`, and a blank/whitespace-only string all mean "not
 * configured" and fall through to {@link findJavaOnPath}: no hit is refused naming the
 * setting; a hit is checked and returned, or refused naming the hit and the problem.
 *
 * Synchronous throughout, so the caller can still reach `cp.spawn` in the same Promise-executor
 * tick, preserving the existing synchronous call-count assertions.
 */
export function resolveFormatterJava(configured: unknown, deps: JavaResolverDeps = {}): FormatterJavaResolution {
  if (configured !== undefined && configured !== null && typeof configured !== 'string') {
    return { reason: `${JAVA_PATH_SETTING} must be a string. Formatting was cancelled.` };
  }

  const trimmed = typeof configured === 'string' ? configured.trim() : '';
  if (trimmed !== '') {
    const problem = checkJavaExecutable(trimmed, deps);
    if (problem) {
      return {
        reason: `${JAVA_PATH_SETTING} is set to "${trimmed}", which ${problem}. Formatting was cancelled.`,
      };
    }
    return { path: trimmed };
  }

  const found = findJavaOnPath(deps);
  if (!found) {
    return {
      reason: `No java executable was found on PATH. Set ${JAVA_PATH_SETTING} to the absolute path of a java executable.`,
    };
  }
  const problem = checkJavaExecutable(found, deps);
  if (problem) {
    return {
      reason: `The java executable found on PATH at "${found}" ${problem}. Set ${JAVA_PATH_SETTING} to use a specific one instead.`,
    };
  }
  return { path: found };
}
