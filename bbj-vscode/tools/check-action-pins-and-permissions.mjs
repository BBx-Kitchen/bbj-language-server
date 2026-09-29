#!/usr/bin/env node
// Asserts that every `uses:` reference in a workflow or composite action is
// pinned to a full 40-character commit SHA carrying a `# vX.Y.Z` version
// comment, that every workflow declares a least-privilege top-level
// `permissions:` block (no write scopes, granted per job instead), and that
// every job whose run body pushes or creates a release ends up with an
// effective `contents: write` scope. A reference starting with `./` (a
// local action in this repository) is exempt from pinning, and text inside
// a `run:` body is never read as a reference. A directory target is scanned
// for its own `*.yml`/`*.yaml` files and, one level down, for any
// `action.yml`/`action.yaml` a subdirectory holds, so `.github/actions`
// covers every composite action without listing each one. A composite
// action (a file with a top-level `runs:` key) is checked for pins only —
// the permissions and push-scope rules apply to workflows alone.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectRunBodies } from './check-workflow-secrets.mjs';

const USES_LINE = /^\s*(?:-\s+)?uses:\s+(?:'([^']*)'|"([^"]*)"|(\S+))(?:\s+(#.*))?\s*$/;
const PINNED_REF = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+@[0-9a-f]{40}$/;
const VERSION_COMMENT = /^#\s*v\d+\.\d+\.\d+\b/;
const JOBS_KEY_LINE = /^jobs:\s*$/;
const RUNS_KEY_LINE = /^runs:\s*$/;
const JOB_ID_LINE = /^(\s+)([A-Za-z0-9_-]+):\s*$/;
const PUSH_OR_RELEASE = /\bgit\s+push\b|\bgh\s+release\b/;

function splitLines(content) {
  return content.split(/\r\n|\n/);
}

function toNumberedLines(lines) {
  return lines.map((text, index) => ({ line: index + 1, text }));
}

function leadingWhitespace(text) {
  const match = text.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

// Expands directory targets to their *.yml/*.yaml entries (sorted); a file
// target is kept as-is. Each immediate subdirectory of a directory target
// is also checked for its own action.yml/action.yaml, one level down — a
// directory scan is otherwise not recursive.
export function expandTargets(targets) {
  const files = [];
  for (const target of targets) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(target, { withFileTypes: true });

      const ymlNames = entries
        .filter((entry) => entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')))
        .map((entry) => entry.name)
        .sort();
      for (const name of ymlNames) {
        files.push(path.join(target, name));
      }

      const subdirNames = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      for (const subdirName of subdirNames) {
        const subdirPath = path.join(target, subdirName);
        for (const candidate of ['action.yml', 'action.yaml']) {
          const candidatePath = path.join(subdirPath, candidate);
          if (fs.existsSync(candidatePath)) {
            files.push(candidatePath);
            break;
          }
        }
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

function collectUsesRefs(numberedLines, skipLines) {
  const refs = [];
  for (const entry of numberedLines) {
    if (skipLines.has(entry.line)) {
      continue;
    }
    const parsed = parseUsesLine(entry.text);
    if (!parsed) {
      continue;
    }
    refs.push({ line: entry.line, ref: parsed.ref, comment: parsed.comment });
  }
  return refs;
}

function classifyFile(lines) {
  if (lines.some((line) => JOBS_KEY_LINE.test(line))) {
    return 'workflow';
  }
  if (lines.some((line) => RUNS_KEY_LINE.test(line))) {
    return 'action';
  }
  return 'unrecognised';
}

// A `permissions:` value is either a scalar on the same line (`write-all`,
// a flow mapping `{}`/`{ contents: write }`), or a block mapping of
// more-indented `key: value` lines following it. Returns
// { kind: 'scalar', value, line } or { kind: 'mapping', entries, line }.
function parsePermissionsAt(numberedLines, index, baseIndent) {
  const entry = numberedLines[index];
  const match = entry.text.match(/^\s*permissions:(.*)$/);
  const remainder = match ? match[1].trim() : '';
  const permLine = entry.line;

  if (remainder.length > 0) {
    if (remainder.startsWith('{')) {
      const inner = remainder.replace(/^\{/, '').replace(/\}\s*$/, '').trim();
      const entries = {};
      if (inner.length > 0) {
        for (const part of inner.split(',')) {
          const pieces = part.split(':');
          const key = (pieces[0] ?? '').trim();
          const value = (pieces[1] ?? '').trim();
          if (key) {
            entries[key] = value;
          }
        }
      }
      return { kind: 'mapping', entries, line: permLine };
    }
    return { kind: 'scalar', value: remainder, line: permLine };
  }

  const entries = {};
  let cursor = index + 1;
  while (cursor < numberedLines.length) {
    const candidate = numberedLines[cursor];
    if (candidate.text.trim() === '') {
      cursor += 1;
      continue;
    }
    const indent = leadingWhitespace(candidate.text);
    if (indent <= baseIndent) {
      break;
    }
    const entryMatch = candidate.text.match(/^\s*([A-Za-z-]+):\s*(\S+)\s*$/);
    if (entryMatch) {
      entries[entryMatch[1]] = entryMatch[2];
    }
    cursor += 1;
  }
  return { kind: 'mapping', entries, line: permLine };
}

// Finds a `permissions:` line whose own indentation equals `indent` within
// the given numbered-line list (either a whole file's lines, or one job's
// own lines) and parses its value. Returns null when no such line exists —
// "no block at this level".
function findPermissionsBlock(numberedLines, indent) {
  const index = numberedLines.findIndex(
    (entry) => leadingWhitespace(entry.text) === indent && /^\s*permissions:/.test(entry.text)
  );
  if (index === -1) {
    return null;
  }
  return parsePermissionsAt(numberedLines, index, indent);
}

function contentsFromBlock(block) {
  if (!block) {
    return null;
  }
  if (block.kind === 'scalar') {
    if (block.value === 'write-all') {
      return 'write';
    }
    if (block.value === 'read-all') {
      return 'read';
    }
    return 'none';
  }
  return block.entries.contents ?? 'none';
}

function effectiveContentsScope(jobBlock, topBlock) {
  if (jobBlock) {
    return contentsFromBlock(jobBlock);
  }
  if (!topBlock) {
    return 'default';
  }
  return contentsFromBlock(topBlock);
}

// Mirrors check-gradle-wrapper.mjs's own job attribution (kept internal
// there too) so that module stays untouched by this checker.
function attributeJobs(lines) {
  const jobsKeyIndex = lines.findIndex((line) => JOBS_KEY_LINE.test(line));
  if (jobsKeyIndex === -1) {
    return [];
  }

  let jobIndent = null;
  for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) {
      continue;
    }
    const match = line.match(JOB_ID_LINE);
    if (match) {
      jobIndent = match[1].length;
    }
    break;
  }
  if (jobIndent === null) {
    return [];
  }

  const jobs = [];
  let current = null;
  for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(JOB_ID_LINE);
    if (match && match[1].length === jobIndent) {
      if (current) {
        current.endLine = i;
      }
      current = { id: match[2], startLine: i + 1, endLine: lines.length, lines: [] };
      jobs.push(current);
      continue;
    }
    if (current) {
      current.lines.push({ line: i + 1, text: line });
    }
  }
  return jobs;
}

function firstLineIndent(numberedLines) {
  for (const entry of numberedLines) {
    if (entry.text.trim() === '' || /^\s*#/.test(entry.text)) {
      continue;
    }
    return leadingWhitespace(entry.text);
  }
  return null;
}

// Inspects one file: classifies it, collects its uses: references, and —
// for a workflow — its top-level permissions block and each job's own
// permissions block plus whether its run body pushes or creates a release.
export function inspectFile(file) {
  const lines = splitLines(fs.readFileSync(file, 'utf8'));
  const kind = classifyFile(lines);
  if (kind === 'unrecognised') {
    return { file, kind };
  }

  const numberedLines = toNumberedLines(lines);
  const skipLines = collectSkipLines(file);
  const usesRefs = collectUsesRefs(numberedLines, skipLines);

  if (kind === 'action') {
    return { file, kind, usesRefs };
  }

  const topBlock = findPermissionsBlock(numberedLines, 0);
  const runBodies = collectRunBodies(file);
  const jobs = attributeJobs(lines).map((job) => {
    const jobKeyIndent = firstLineIndent(job.lines);
    const block = jobKeyIndent === null ? null : findPermissionsBlock(job.lines, jobKeyIndent);
    const jobLineNumbers = new Set(job.lines.map((entry) => entry.line));
    const pushes = runBodies.some((body) =>
      body.lines.some((bodyLine) => jobLineNumbers.has(bodyLine.line) && PUSH_OR_RELEASE.test(bodyLine.text))
    );
    return { id: job.id, startLine: job.startLine, block, pushes };
  });

  return { file, kind, usesRefs, topBlock, jobs };
}

function pushPinFinding(findings, file, ref) {
  if (ref.ref.startsWith('./')) {
    return;
  }
  if (!PINNED_REF.test(ref.ref)) {
    findings.push({ file, line: ref.line, message: `uses reference '${ref.ref}' is not pinned to a full commit SHA` });
    return;
  }
  if (!ref.comment || !VERSION_COMMENT.test(ref.comment)) {
    findings.push({ file, line: ref.line, message: `uses reference '${ref.ref}' has no '# vX.Y.Z' version comment` });
  }
}

function checkTopLevelOverBroad(topBlock, file, findings) {
  if (topBlock.kind === 'scalar') {
    if (topBlock.value === 'write-all') {
      findings.push({ file, line: topBlock.line, message: "top-level permissions grant 'write-all'; grant write scopes per job" });
    }
    return;
  }
  for (const [key, value] of Object.entries(topBlock.entries)) {
    if (value === 'write') {
      findings.push({
        file,
        line: topBlock.line,
        message: `top-level permissions grant '${key}: write'; grant write scopes per job`,
      });
    }
  }
}

// Scans every uses: reference for the pin rule, plus — for workflows — the
// least-privilege permissions rules and the push-scope rule. Composite
// actions only get the pin rule. A file with neither a top-level jobs: nor
// runs: key is collected as unrecognised rather than scanned.
export function scanTargets(targets) {
  const files = expandTargets(targets);
  let usesCount = 0;
  let workflowCount = 0;
  const findings = [];
  const unrecognised = [];

  for (const file of files) {
    const inspected = inspectFile(file);
    if (inspected.kind === 'unrecognised') {
      unrecognised.push(file);
      continue;
    }

    usesCount += inspected.usesRefs.length;
    for (const ref of inspected.usesRefs) {
      pushPinFinding(findings, file, ref);
    }

    if (inspected.kind !== 'workflow') {
      continue;
    }
    workflowCount += 1;

    if (!inspected.topBlock) {
      findings.push({ file, line: 1, message: 'workflow has no top-level permissions block' });
    } else {
      checkTopLevelOverBroad(inspected.topBlock, file, findings);
    }

    for (const job of inspected.jobs) {
      if (!job.pushes) {
        continue;
      }
      const scope = effectiveContentsScope(job.block, inspected.topBlock);
      if (scope !== 'write') {
        findings.push({
          file,
          line: job.startLine,
          message: `job '${job.id}' pushes or creates a release but its token has contents: ${scope}`,
        });
      }
    }
  }

  findings.sort((a, b) => {
    if (a.file === b.file) {
      return a.line - b.line;
    }
    return a.file < b.file ? -1 : 1;
  });

  return { filesScanned: files.length, usesCount, workflowCount, findings, unrecognised };
}

function formatPermissionsSummary(block) {
  if (block.kind === 'scalar') {
    return block.value;
  }
  const keys = Object.keys(block.entries);
  if (keys.length === 0) {
    return 'none';
  }
  return keys.map((key) => `${key}=${block.entries[key]}`).join(',');
}

function printReport(targets) {
  const files = expandTargets(targets);
  const unrecognised = [];
  let usesCount = 0;
  const outputLines = [];

  for (const file of files) {
    const inspected = inspectFile(file);
    if (inspected.kind === 'unrecognised') {
      unrecognised.push(file);
      continue;
    }
    usesCount += inspected.usesRefs.length;

    if (inspected.kind === 'workflow') {
      outputLines.push(`${file}: workflow permissions: ${inspected.topBlock ? formatPermissionsSummary(inspected.topBlock) : '(missing)'}`);
      for (const job of inspected.jobs) {
        outputLines.push(`${file}: job ${job.id} permissions: ${job.block ? formatPermissionsSummary(job.block) : 'inherited'}`);
      }
    }

    for (const ref of inspected.usesRefs) {
      const commentText = ref.comment ? ref.comment : '(no comment)';
      outputLines.push(`${file}:${ref.line}: uses ${ref.ref} ${commentText}`);
    }
  }

  if (unrecognised.length > 0) {
    for (const file of unrecognised) {
      console.log(`Refusing to report success on an unrecognised file: ${file}.`);
    }
    process.exit(2);
  }
  if (files.length === 0 || usesCount === 0) {
    console.log(`Refusing to report success on an empty scan: ${files.length} file(s), ${usesCount} uses reference(s).`);
    process.exit(2);
  }

  for (const line of outputLines) {
    console.log(line);
  }
  process.exit(0);
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
  const args = argv.slice(2);
  const printMode = args.includes('--print');
  const positional = args.filter((arg) => arg !== '--print');
  return { printMode, positional };
}

function main() {
  const { printMode, positional } = parseArgs(process.argv);
  const targets = positional.length > 0 ? positional : defaultTargets();

  if (printMode) {
    printReport(targets);
    return;
  }

  const { filesScanned, usesCount, workflowCount, findings, unrecognised } = scanTargets(targets);

  if (unrecognised.length > 0) {
    for (const file of unrecognised) {
      console.log(`Refusing to report success on an unrecognised file: ${file}.`);
    }
    process.exit(2);
  }

  if (filesScanned === 0 || usesCount === 0) {
    console.log(`Refusing to report success on an empty scan: ${filesScanned} file(s), ${usesCount} uses reference(s).`);
    process.exit(2);
  }

  if (findings.length === 0) {
    console.log(`Scanned ${filesScanned} file(s), ${usesCount} uses reference(s), ${workflowCount} workflow(s), 0 findings.`);
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
