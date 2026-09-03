// Pin table and pure verify function for the bundled BBj
// formatter JARs. This module has one job — decide whether an on-disk artefact matches its
// committed checksum — and is deliberately dependency-free (only `node:fs` and `node:crypto`)
// so it stays importable from a vitest guard with no `vscode` or `child_process` harness, and
// so it does not add a fourth entry to no-shell-command-construction.test.ts's three-launcher
// list.
//
// This is one of three consumers of the table below: the runtime gate in
// document-formatter.ts, the tamper guard, and the drift guard. Keeping the
// pins here rather than inlined at the spawn site gives all three one source of truth.
//
// What this module does NOT claim: it detects a JAR that no longer matches the bytes committed
// to this repository. It does not defend against someone who can already write to the installed
// extension directory, since the same access can rewrite this file's own compiled output
// (out/extension.cjs). The committed pin table below and the drift check that couples it to the
// vendored bytes are where the guarantee lives, not this runtime gate.
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

/**
 * A single vendored formatter artefact's pinned trust anchor. `origin` and `vendoredOn` are
 * provenance, not just a hash — knowing where the bytes came from and when they entered the
 * tree is what lets a future updater re-vendor deliberately rather than merely detect that
 * something changed.
 */
export interface PinnedFormatterArtifact {
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  origin: string;
  vendoredOn: string;
}

// The verifier uses a static artefact list rather than one derived from BBjCFCli.jar's own
// MANIFEST.MF Class-Path entry. This is sound because BBjCFCli.jar's own hash is pinned below:
// its manifest cannot grow a fourth Class-Path entry without failing this table's own digest
// check first. Do not "fix" this by adding zip/manifest parsing to the format-on-save path.
//
// All three artefacts BBjCFCli.jar's Class-Path transitively loads on every format are pinned
// here, in this declared order. Verification below iterates in this order and returns on the
// first failure, so the reported (and notified) failure is deterministic when more than one
// artefact is bad.
export const FORMATTER_ARTIFACT_PINS: readonly PinnedFormatterArtifact[] = [
  {
    relativePath: 'BBjCFCli.jar',
    sizeBytes: 6780,
    sha256: 'f73a8af5b6eceee3fa5ab11f71e96a629629dc4885235293cfaf6ed6e3c68bd4',
    origin: 'BASIS-supplied build, vendored 2023-07-10; no public upstream feed — re-vendor via BASIS.',
    vendoredOn: '2023-07-10',
  },
  // No authoritative upstream digest is obtainable for this coordinate: the referenced version
  // is absent from this dependency's published release history, and its likely original
  // distribution channel has since been retired. This entry therefore records the vendored
  // bytes as of the date below — the same change-detection-only status as the two BASIS
  // artefacts in this table, not a verified-upstream provenance claim. Re-vendor deliberately,
  // from a source you can independently confirm, if this artefact is ever updated.
  {
    relativePath: 'lib/jcommander-1.71.jar',
    sizeBytes: 67503,
    sha256: 'b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804',
    origin: 'Vendored third-party build (jcommander 1.71); no upstream digest obtainable for this version — re-vendor deliberately from a verifiable source if updating.',
    vendoredOn: '2023-07-10',
  },
  {
    relativePath: 'lib/BBjCodeFomatter.jar',
    sizeBytes: 38078,
    sha256: '5df78cc81797d0c2e0c5c14eb75c5141a5edb1bb9d131e84ebaafd26a6c1cf9f',
    origin: 'BASIS-supplied build, vendored 2023-07-10; no public upstream feed — re-vendor via BASIS.',
    vendoredOn: '2023-07-10',
  },
];

// Computed here, not in document-formatter.ts, so the drift guard (a separate consumer) uses
// the exact same directory the runtime gate resolves against.
export const FORMATTER_TOOLS_DIR = `${__dirname}/../tools/formatter`;

export type FormatterVerificationFailureReason = 'MISSING_OR_UNREADABLE' | 'DIGEST_MISMATCH';

export type FormatterVerificationResult =
  | { ok: true }
  | {
      ok: false;
      reason: FormatterVerificationFailureReason;
      relativePath: string;
      absolutePath: string;
      expectedSha256: string;
      actualSha256?: string;
    };

/** The relative paths of every pinned artefact, in declared order. */
export function formatterArtifactNames(): readonly string[] {
  return FORMATTER_ARTIFACT_PINS.map((pin) => pin.relativePath);
}

function refuse(
  reason: FormatterVerificationFailureReason,
  artefactRelativePath: string,
  absolutePath: string,
  expectedSha256: string,
  actualSha256?: string
): FormatterVerificationResult {
  return { ok: false, reason, relativePath: artefactRelativePath, absolutePath, expectedSha256, actualSha256 };
}

/**
 * Verifies every pinned formatter artefact under `formatterDir` against its committed SHA-256,
 * in declared table order, returning on the first failure — so the reported failure is
 * deterministic when more than one artefact is bad.
 *
 * Synchronous by design: `document-formatter.ts`'s spawn site must reach `cp.spawn` in the same
 * tick this function returns, so the existing synchronous `cp.spawn` call-count assertions in
 * document-formatter.test.ts keep holding with no `await` inserted.
 *
 * `readFile` defaults to `fs.readFileSync` and exists purely as an injection seam so a guard
 * can drive this function with fixture bytes without touching the real tree.
 *
 * Nothing in this function may throw outward: an unexpected error becomes a refusal rather than
 * a fall-through that would let the caller reach `cp.spawn` unverified.
 */
export function verifyFormatterArtifacts(
  formatterDir: string,
  readFile: (absolutePath: string) => Buffer = (absolutePath) => fs.readFileSync(absolutePath)
): FormatterVerificationResult {
  try {
    for (const pin of FORMATTER_ARTIFACT_PINS) {
      const absolutePath = `${formatterDir}/${pin.relativePath}`;

      let buffer: Buffer;
      try {
        buffer = readFile(absolutePath);
      } catch {
        return refuse('MISSING_OR_UNREADABLE', pin.relativePath, absolutePath, pin.sha256);
      }

      // A present-but-zero-length file is readable, so it reaches here and is hashed. That
      // hash will not match a non-empty artefact's pin, so it refuses with DIGEST_MISMATCH, not
      // MISSING_OR_UNREADABLE. Deliberate: a truncated artefact is indistinguishable from a
      // substituted one to this function, and the stronger signal is the safer default.
      const actualSha256 = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
      const expectedSha256 = pin.sha256.toLowerCase();

      const expectedBuf = Buffer.from(expectedSha256, 'ascii');
      const actualBuf = Buffer.from(actualSha256, 'ascii');
      const matches =
        expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

      if (!matches) {
        return refuse('DIGEST_MISMATCH', pin.relativePath, absolutePath, expectedSha256, actualSha256);
      }
    }

    return { ok: true };
  } catch {
    // Total function: any unexpected error (a bad injected readFile, a hashing failure) is a
    // refusal, never a throw that could leave the caller free to fall through to cp.spawn.
    const firstPin = FORMATTER_ARTIFACT_PINS[0];
    return refuse(
      'MISSING_OR_UNREADABLE',
      firstPin?.relativePath ?? 'unknown',
      formatterDir,
      firstPin?.sha256 ?? ''
    );
  }
}
