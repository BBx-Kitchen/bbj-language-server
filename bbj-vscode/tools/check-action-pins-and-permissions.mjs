#!/usr/bin/env node
// Asserts that every `uses:` reference in a workflow or composite action is
// pinned to a full 40-character commit SHA carrying a `# vX.Y.Z` version
// comment. A reference starting with `./` (a local action in this
// repository) is exempt, and text inside a `run:` body is never read as a
// reference. A directory target is scanned for its own `*.yml`/`*.yaml`
// files; the permissions and push-scope rules land in a later revision of
// this checker.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectRunBodies } from './check-workflow-secrets.mjs';

const USES_LINE = /^\s*(?:-\s+)?uses:\s+(?:'([^']*)'|"([^"]*)"|(\S+))(?:\s+(#.*))?\s*$/;
const PINNED_REF = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+@[0-9a-f]{40}$/;
const VERSION_COMMENT = /^#\s*v\d+\.\d+\.\d+\b/;

function splitLines(content) {
  return content.split(/\r\n|\n/);
}

// Expands directory targets to their *.yml/*.yaml entries (sorted); a file
// target is kept as-is. Not recursive — a directory target only ever yields
// the files it directly contains.
export function expandTargets(targets) {
  const files = [];
  for (const target of targets) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      const entries = fs
        .readdirSync(target)
        .filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
        .sort();
      for (const entry of entries) {
        files.push(path.join(target, entry));
      }
    } else {
      files.push(target);
    }
  }
  return files;
}

function parseUsesLine(line) {
  const match = line.match(USES_LINE);
  if (!match) {
    return null;
  }
  const ref = match[1] ?? match[2] ?? match[3];
  const comment = match[4];
  return { ref, comment };
}

function collectSkipLines(filePath) {
  const skip = new Set();
  for (const body of collectRunBodies(filePath)) {
    for (const bodyLine of body.lines) {
      skip.add(bodyLine.line);
    }
  }
  return skip;
}

// Scans every uses: reference outside run: bodies across the expanded file
// set, reporting one finding per unpinned or uncommented reference. Local
// (./) references are exempt but still counted toward usesCount.
export function scanTargets(targets) {
  const files = expandTargets(targets);
  let usesCount = 0;
  const findings = [];

  for (const file of files) {
    const skipLines = collectSkipLines(file);
    const lines = splitLines(fs.readFileSync(file, 'utf8'));

    for (let i = 0; i < lines.length; i += 1) {
      const lineNo = i + 1;
      if (skipLines.has(lineNo)) {
        continue;
      }
      const parsed = parseUsesLine(lines[i]);
      if (!parsed) {
        continue;
      }
      usesCount += 1;
      const { ref, comment } = parsed;
      if (ref.startsWith('./')) {
        continue;
      }

      if (!PINNED_REF.test(ref)) {
        findings.push({ file, line: lineNo, message: `uses reference '${ref}' is not pinned to a full commit SHA` });
        continue;
      }
      if (!comment || !VERSION_COMMENT.test(comment)) {
        findings.push({ file, line: lineNo, message: `uses reference '${ref}' has no '# vX.Y.Z' version comment` });
      }
    }
  }

  findings.sort((a, b) => {
    if (a.file === b.file) {
      return a.line - b.line;
    }
    return a.file < b.file ? -1 : 1;
  });

  return { filesScanned: files.length, usesCount, findings };
}

function defaultTargets() {
  const workflows = fileURLToPath(new URL('../../.github/workflows', import.meta.url));
  const actionsDir = fileURLToPath(new URL('../../.github/actions', import.meta.url));
  const targets = [workflows];
  if (fs.existsSync(actionsDir)) {
    targets.push(actionsDir);
  }
  return targets;
}

function parseArgs(argv) {
  const positional = argv.slice(2).filter((arg) => arg !== '--print');
  return { positional };
}

function main() {
  const { positional } = parseArgs(process.argv);
  const targets = positional.length > 0 ? positional : defaultTargets();

  const { filesScanned, usesCount, findings } = scanTargets(targets);

  if (filesScanned === 0 || usesCount === 0) {
    console.log(`Refusing to report success on an empty scan: ${filesScanned} file(s), ${usesCount} uses reference(s).`);
    process.exit(2);
  }

  if (findings.length === 0) {
    console.log(`Scanned ${filesScanned} file(s), ${usesCount} uses reference(s), 0 findings.`);
    process.exit(0);
  }

  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line}: ${finding.message}`);
  }
  console.log(`${findings.length} finding(s).`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
