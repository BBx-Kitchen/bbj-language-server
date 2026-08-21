#!/usr/bin/env node
// Scans YAML workflow files for `${{ secrets.* }}` expressions that appear
// inside a `run:` block body rather than in a step-scoped `env:` mapping.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SECRET_EXPRESSION = /\$\{\{\s*secrets\./;
const BLOCK_SCALAR_INDICATOR = /^[|>][+-]?$/;
const RUN_KEY_LINE = /^(\s*)(-\s+)?run:(.*)$/;

function splitLines(content) {
  return content.split(/\r\n|\n/);
}

function leadingWhitespace(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

// Returns one entry per `run:` key found in the file:
// { keyLine, lines: [{ line, text }, ...] } with 1-based absolute line numbers.
export function collectRunBodies(filePath) {
  const lines = splitLines(fs.readFileSync(filePath, 'utf8'));
  const bodies = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(RUN_KEY_LINE);

    if (!match) {
      index += 1;
      continue;
    }

    const [, indent, dashPrefix, remainder] = match;
    const keyIndent = indent.length + (dashPrefix ? dashPrefix.length : 0);
    const keyLine = index + 1;
    const trimmedRemainder = remainder.trim();
    const bodyLines = [];
    let cursor = index + 1;

    if (BLOCK_SCALAR_INDICATOR.test(trimmedRemainder)) {
      while (cursor < lines.length) {
        const candidate = lines[cursor];
        if (candidate.trim() === '') {
          bodyLines.push({ line: cursor + 1, text: candidate });
          cursor += 1;
          continue;
        }
        if (leadingWhitespace(candidate) > keyIndent) {
          bodyLines.push({ line: cursor + 1, text: candidate });
          cursor += 1;
          continue;
        }
        break;
      }
    } else {
      bodyLines.push({ line: keyLine, text: remainder });
      while (cursor < lines.length) {
        const candidate = lines[cursor];
        if (candidate.trim() === '') {
          break;
        }
        if (leadingWhitespace(candidate) > keyIndent) {
          bodyLines.push({ line: cursor + 1, text: candidate });
          cursor += 1;
          continue;
        }
        break;
      }
    }

    bodies.push({ keyLine, lines: bodyLines });
    index = cursor;
  }

  return bodies;
}

function expandTargets(targets) {
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

// Expands directory targets to their *.yml/*.yaml entries, collects every
// `run:` body across the resulting files, and reports each body line whose
// text contains a `${{ secrets.* }}` expression.
export function scanTargets(targets) {
  const files = expandTargets(targets);
  let runBlocks = 0;
  const findings = [];

  for (const file of files) {
    const bodies = collectRunBodies(file);
    runBlocks += bodies.length;
    for (const body of bodies) {
      for (const bodyLine of body.lines) {
        if (SECRET_EXPRESSION.test(bodyLine.text)) {
          findings.push({ file, line: bodyLine.line, text: bodyLine.text.trim() });
        }
      }
    }
  }

  findings.sort((a, b) => {
    if (a.file === b.file) {
      return a.line - b.line;
    }
    return a.file < b.file ? -1 : 1;
  });

  return { filesScanned: files.length, runBlocks, findings };
}

function defaultTarget() {
  return fileURLToPath(new URL('../../.github/workflows', import.meta.url));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const printMode = args.includes('--print');
  const positional = args.filter((arg) => arg !== '--print');
  return { printMode, positional };
}

function printFoldedBodies(targets) {
  const files = expandTargets(targets);
  let runBlocks = 0;
  const outputLines = [];

  for (const file of files) {
    const bodies = collectRunBodies(file);
    runBlocks += bodies.length;
    for (const body of bodies) {
      const folded = body.lines.map((bodyLine) => bodyLine.text.trim()).join(' ');
      outputLines.push(`${file}:${body.keyLine}: ${folded}`);
    }
  }

  if (files.length === 0 || runBlocks === 0) {
    console.log('Refusing to report success on an empty scan: 0 files or 0 run blocks collected.');
    process.exit(2);
  }

  for (const line of outputLines) {
    console.log(line);
  }
  process.exit(0);
}

function main() {
  const { printMode, positional } = parseArgs(process.argv);
  const targets = positional.length > 0 ? positional : [defaultTarget()];

  if (printMode) {
    printFoldedBodies(targets);
    return;
  }

  const { filesScanned, runBlocks, findings } = scanTargets(targets);

  if (filesScanned === 0 || runBlocks === 0) {
    console.log('Refusing to report success on an empty scan: 0 files or 0 run blocks collected.');
    process.exit(2);
  }

  if (findings.length === 0) {
    console.log(`Scanned ${filesScanned} file(s), ${runBlocks} run block(s), 0 findings.`);
    process.exit(0);
  }

  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line}: ${finding.text}`);
  }
  console.log(`${findings.length} finding(s).`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
