#!/usr/bin/env node
// Phase 68 D-01: mechanically derive the two Phase 68 deliverable documents —
// `.planning/reviews/EASY-FIXES.md` (DOC-01, 77 easy-fix records) and
// `.planning/reviews/MAJOR-REFACTORS.md` (DOC-02, 144 major-refactor records) — from the six
// closed COVERAGE files. Run as `node derive-review-docs.mjs <command>` from this directory (or
// anywhere — paths are resolved relative to this script's own location, not the invocation cwd).
// Forked from `.planning/phases/67-apply-easy-fixes/derive-apply-set.mjs` per 68-CONTEXT.md D-01:
// its `extractRecords`, `parseFields`, `joined`, phase-then-ID sort and hard-fail gate are already
// proven against this exact corpus.
//
// Reads .planning/reviews/{61,62,63,64,65,66}-COVERAGE.md ONLY, selects every finding record by
// the leading token of its `disposition:` field — `major-refactor` | `easy-fix` | `wontfix` — and
// emits one record block per selected record, ordered by originating phase then finding ID (D-10).
//
// Exits non-zero (after printing the derived breakdown to stderr) unless the total is exactly 224
// and the split is exactly 144 major-refactor / 77 easy-fix / 3 wontfix, with the exact per-phase
// splits declared in EXPECTED_* below — 68-CONTEXT.md D-02 states a different derived number is
// treated as a finding, not silently adjusted.
//
// Commands:
//   emit-easy    print EASY-FIXES.md's record blocks to stdout (row/finding_id/unit/location/
//                dimension/severity/effort/failure_scenario — the mechanical scaffold; judgment
//                fields are authored directly in the assembled document, not emitted here)
//   emit-major   print MAJOR-REFACTORS.md's record blocks to stdout (INVENTORY's frozen 13-field
//                order, verbatim)
//   check        validate the two assembled documents in .planning/reviews/ against the corpus
//
// Flags:
//   --force      bypass the regeneration guard (see below) for emit-easy / emit-major
//   --write      in addition to printing to stdout, atomically compose and overwrite the target
//                document in .planning/reviews/ (writeAtomic — write to a sibling .tmp path, then
//                renameSync into place, so an interrupted run cannot leave a half-written file)
//
// Regeneration guard (T-68-03, D-09's `costly` reversibility): before emit-easy or emit-major
// writes or emits, if .planning/reviews/MAJOR-REFACTORS.md already exists and carries any `issue:`
// line with a non-empty value, the command refuses (prints why, exits non-zero, emits nothing) —
// Phase 69 writes filed issue numbers into that file under ISSUE-05, and a plain re-run of this
// script must never clobber them. --force bypasses the guard explicitly.

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REVIEWS_DIR = join(SCRIPT_DIR, '..', '..', 'reviews');
const EASY_PATH = join(REVIEWS_DIR, 'EASY-FIXES.md');
const MAJOR_PATH = join(REVIEWS_DIR, 'MAJOR-REFACTORS.md');

// Phase order fixed here (not alphabetical/numeric-sorted at runtime) so the expected splits
// below stay legible next to the phase list they describe.
const PHASES = [61, 62, 63, 64, 65, 66];
const EXPECTED_TOTAL = 224;
const EXPECTED_RECORD_SPLIT = { 61: 73, 62: 34, 63: 62, 64: 44, 65: 3, 66: 8 };
const EXPECTED_MAJOR_TOTAL = 144;
const EXPECTED_MAJOR_SPLIT = { 61: 29, 62: 20, 63: 52, 64: 34, 65: 3, 66: 6 };
const EXPECTED_EASY_TOTAL = 77;
const EXPECTED_EASY_SPLIT = { 61: 44, 62: 14, 63: 10, 64: 8, 65: 0, 66: 1 };
const EXPECTED_WONTFIX_TOTAL = 3;
const EXPECTED_WONTFIX_IDS = ['P64-D8-002', 'P64-D6-012', 'P66-D5-003'];

// Column the value starts at for every rendered `key:` field, matching 67-APPLY-SET.md's and
// INVENTORY.md's Finding Record Template row shape.
const FIELD_COLUMN = 19;

/** Split a COVERAGE file's raw text into fenced ```...``` record blocks whose first non-empty
 *  line is an `id:` field naming a finding ID (P<phase>-D<dim>-<seq>). */
function extractRecords(fileText) {
    const records = [];
    const fenceRe = /```\n(id: *P\d+-D\d+-\d+[\s\S]*?)\n```/g;
    let match;
    while ((match = fenceRe.exec(fileText)) !== null) {
        records.push(match[1]);
    }
    return records;
}

/** Split an already-assembled document's raw text into every fenced ```...``` block, regardless
 *  of leading field name. Used by `check` to read back EASY-FIXES.md / MAJOR-REFACTORS.md, whose
 *  blocks lead with `row:` / `id:` respectively. */
function extractFencedBlocks(fileText) {
    const blocks = [];
    const fenceRe = /```\n([\s\S]*?)\n```/g;
    let match;
    while ((match = fenceRe.exec(fileText)) !== null) {
        blocks.push(match[1]);
    }
    return blocks;
}

/** Parse a record block's text into a map of field name -> array of raw lines (the first line's
 *  post-colon remainder, then each indented continuation line, in original order). */
function parseFields(blockText) {
    const lines = blockText.split('\n');
    const fields = {};
    let current = null;
    for (const line of lines) {
        const m = line.match(/^([A-Za-z_]+): *(.*)$/);
        if (m) {
            current = m[1];
            fields[current] = [m[2]];
        } else if (current) {
            fields[current].push(line.trim());
        }
    }
    return fields;
}

/** Join a field's lines (first line + every continuation line) into one space-separated string.
 *  Used for fields that are reliably single-line (id, unit, dimension, severity, effort). */
function joined(fieldLines) {
    return (fieldLines ?? []).map(l => l.trim()).filter(Boolean).join(' ').trim();
}

/** Same join behaviour as `joined`, named separately per 68-CONTEXT.md/68-PATTERNS.md: used for
 *  multi-line prose fields (failure_scenario, evidence, classification, dedup, disposition) where
 *  preserving every continuation line — not derive-apply-set.mjs's `firstThreeLines` truncation —
 *  is a correctness requirement (D-04, ISSUE-02: `failure_scenario:` must stand alone in full). */
function fullJoined(fieldLines) {
    return (fieldLines ?? []).map(l => l.trim()).filter(Boolean).join(' ').trim();
}

/** Render one `key:` field line, value starting at FIELD_COLUMN. */
function field(key, value) {
    return `${(key + ':').padEnd(FIELD_COLUMN)}${value}`;
}

/** Read and parse all 224 corpus records from the six closed COVERAGE files. */
function loadCorpus() {
    const records = [];
    for (const phase of PHASES) {
        const filePath = join(REVIEWS_DIR, `${phase}-COVERAGE.md`);
        const text = readFileSync(filePath, 'utf8');
        for (const block of extractRecords(text)) {
            const fields = parseFields(block);
            records.push({ phase, id: joined(fields.id), disposition: joined(fields.disposition), fields });
        }
    }
    return records;
}

/** Three-way split by the leading token of `disposition:` (D-01), each ordered by originating
 *  phase then finding ID (D-10). Also returns per-phase counts for the hard-fail gate. */
function selectByDisposition(corpusRecords) {
    const major = [];
    const easy = [];
    const wontfix = [];
    const recordTotal = {};
    const majorSplit = {};
    const easySplit = {};
    const wontfixSplit = {};
    for (const phase of PHASES) {
        recordTotal[phase] = 0;
        majorSplit[phase] = 0;
        easySplit[phase] = 0;
        wontfixSplit[phase] = 0;
    }
    for (const rec of corpusRecords) {
        recordTotal[rec.phase]++;
        if (rec.disposition.startsWith('major-refactor')) {
            major.push(rec);
            majorSplit[rec.phase]++;
        } else if (rec.disposition.startsWith('easy-fix')) {
            easy.push(rec);
            easySplit[rec.phase]++;
        } else if (rec.disposition.startsWith('wontfix')) {
            wontfix.push(rec);
            wontfixSplit[rec.phase]++;
        } else {
            throw new Error(`Unrecognized disposition on ${rec.id}: "${rec.disposition}"`);
        }
    }
    const byPhaseThenId = (a, b) => (a.phase !== b.phase ? a.phase - b.phase : a.id.localeCompare(b.id));
    major.sort(byPhaseThenId);
    easy.sort(byPhaseThenId);
    wontfix.sort(byPhaseThenId);
    return { major, easy, wontfix, recordTotal, majorSplit, easySplit, wontfixSplit };
}

/** Hard-fail gate (D-02): the expected denominator is 224 records, splitting 144 major-refactor +
 *  77 easy-fix + 3 wontfix, with the exact per-phase splits declared above. On any departure,
 *  print the full derived breakdown to stderr and return false without emitting anything — the
 *  caller must not adjust the number to match the expectation. */
function assertCounts(selection) {
    const total = selection.major.length + selection.easy.length + selection.wontfix.length;
    const splitStr = PHASES.map(p =>
        `${p}=${selection.recordTotal[p]}(major=${selection.majorSplit[p]} easy=${selection.easySplit[p]} wontfix=${selection.wontfixSplit[p]})`
    ).join(' ');
    process.stderr.write(`derived: total=${total} major=${selection.major.length} easy=${selection.easy.length} wontfix=${selection.wontfix.length} | ${splitStr}\n`);

    const problems = [];
    if (total !== EXPECTED_TOTAL) problems.push(`total ${total} !== expected ${EXPECTED_TOTAL}`);
    if (selection.major.length !== EXPECTED_MAJOR_TOTAL) problems.push(`major total ${selection.major.length} !== expected ${EXPECTED_MAJOR_TOTAL}`);
    if (selection.easy.length !== EXPECTED_EASY_TOTAL) problems.push(`easy total ${selection.easy.length} !== expected ${EXPECTED_EASY_TOTAL}`);
    if (selection.wontfix.length !== EXPECTED_WONTFIX_TOTAL) problems.push(`wontfix total ${selection.wontfix.length} !== expected ${EXPECTED_WONTFIX_TOTAL}`);
    for (const p of PHASES) {
        if (selection.recordTotal[p] !== EXPECTED_RECORD_SPLIT[p]) problems.push(`phase ${p} record total ${selection.recordTotal[p]} !== expected ${EXPECTED_RECORD_SPLIT[p]}`);
        if (selection.majorSplit[p] !== EXPECTED_MAJOR_SPLIT[p]) problems.push(`phase ${p} major ${selection.majorSplit[p]} !== expected ${EXPECTED_MAJOR_SPLIT[p]}`);
        if (selection.easySplit[p] !== EXPECTED_EASY_SPLIT[p]) problems.push(`phase ${p} easy ${selection.easySplit[p]} !== expected ${EXPECTED_EASY_SPLIT[p]}`);
    }
    const wontfixIds = selection.wontfix.map(r => r.id).sort();
    const expectedWontfixIds = [...EXPECTED_WONTFIX_IDS].sort();
    if (JSON.stringify(wontfixIds) !== JSON.stringify(expectedWontfixIds)) {
        problems.push(`wontfix IDs [${wontfixIds.join(', ')}] !== expected [${expectedWontfixIds.join(', ')}]`);
    }

    if (problems.length > 0) {
        process.stderr.write(
            'ERROR: derived counts departed from the expected denominator — treat as a finding, do not adjust silently.\n' +
            problems.map(p => `  - ${p}\n`).join('')
        );
        return false;
    }
    return true;
}

/** EASY-FIXES.md row: the mechanical scaffold only (row, finding_id, unit, location, dimension,
 *  severity, effort, failure_scenario). Judgment content (verdict/fix_applied/user_facing/
 *  verification/commit/notes, lifted from 67-APPLY-SET.md) is authored directly into the
 *  assembled document, not emitted here. */
function renderEasyRow(rowNumber, rec) {
    const f = rec.fields;
    return [
        '```',
        field('row', String(rowNumber)),
        field('finding_id', rec.id),
        field('unit', joined(f.unit)),
        field('location', joined(f.location)),
        field('dimension', joined(f.dimension)),
        field('severity', joined(f.severity)),
        field('effort', joined(f.effort)),
        field('failure_scenario', fullJoined(f.failure_scenario)),
        '```'
    ].join('\n');
}

/** MAJOR-REFACTORS.md block: INVENTORY's frozen 13-field order, verbatim. The four Phase-69-
 *  facing fields (proposed_approach, proposed_labels, issue) are not part of this task's scaffold. */
function renderMajorBlock(rec) {
    const f = rec.fields;
    return [
        '```',
        field('id', rec.id),
        field('unit', joined(f.unit)),
        field('location', fullJoined(f.location)),
        field('dimension', joined(f.dimension)),
        field('secondary', fullJoined(f.secondary)),
        field('severity', joined(f.severity)),
        field('evidence_tier', joined(f.evidence_tier)),
        field('evidence', fullJoined(f.evidence)),
        field('failure_scenario', fullJoined(f.failure_scenario)),
        field('classification', fullJoined(f.classification)),
        field('effort', fullJoined(f.effort)),
        field('dedup', fullJoined(f.dedup)),
        field('disposition', fullJoined(f.disposition)),
        '```'
    ].join('\n');
}

/** Write `text` to `path` without ever leaving a half-written file: write to a sibling `.tmp`
 *  path first, then renameSync into place (same filesystem, so the rename is atomic). */
function writeAtomic(path, text) {
    const tmpPath = `${path}.tmp`;
    writeFileSync(tmpPath, text, 'utf8');
    renameSync(tmpPath, path);
}

/** DOC title + Derivation section shared preamble builders. */
function easyHeader() {
    return `# Phase 68 Easy-Fix Findings

## Derivation

Records are selected by the leading token of each finding's \`disposition:\` field — \`easy-fix\` —
across the six closed COVERAGE files (\`.planning/reviews/61-COVERAGE.md\` … \`66-COVERAGE.md\`),
produced mechanically by \`derive-review-docs.mjs\` (run as \`node derive-review-docs.mjs emit-easy\`
from \`.planning/phases/68-deliverable-documents/\` — see that script for the exact selection and
ordering logic). Records are ordered by originating phase then finding ID (D-10). The script emits
the mechanical scaffold — \`row:\`, \`finding_id:\`, \`unit:\`, \`location:\`, \`dimension:\`,
\`severity:\`, \`effort:\` and the full \`failure_scenario:\` — while judgment content is authored
directly in this document, so re-running \`emit-easy\` regenerates the scaffold only and is not a
safe overwrite of this assembled file once that content has been added.

`;
}

function majorHeader() {
    return `# Phase 68 Major-Refactor Findings

## Derivation

Records are selected by the leading token of each finding's \`disposition:\` field —
\`major-refactor\` — across the six closed COVERAGE files (\`.planning/reviews/61-COVERAGE.md\` …
\`66-COVERAGE.md\`), produced mechanically by \`derive-review-docs.mjs\` (run as
\`node derive-review-docs.mjs emit-major\` from \`.planning/phases/68-deliverable-documents/\` — see
that script for the exact selection and ordering logic). Records are ordered by originating phase
then finding ID (D-10); a severity-sorted index is added above the phase-then-ID order for Phase
69's filing order. The script emits INVENTORY's frozen 13-field order verbatim as the mechanical
scaffold; the four Phase-69-facing fields (\`proposed_approach:\`, \`proposed_labels:\`, \`issue:\`)
and their judgment content are authored directly in this document, so re-running \`emit-major\`
regenerates the scaffold only and is not a safe overwrite of this assembled file once that content
has been added.

`;
}

/** Regeneration guard (T-68-03): refuse to emit if MAJOR-REFACTORS.md already carries a non-empty
 *  `issue:` value, unless --force is passed. Applies to both emit-easy and emit-major. */
function checkRegenerationGuard(force) {
    if (force) return { blocked: false };
    if (!existsSync(MAJOR_PATH)) return { blocked: false };
    const text = readFileSync(MAJOR_PATH, 'utf8');
    const hasFiledIssue = text.split('\n').some(line => {
        const m = line.match(/^issue: *(.*)$/);
        return m && m[1].trim().length > 0;
    });
    if (hasFiledIssue) {
        return {
            blocked: true,
            message: 'ERROR: .planning/reviews/MAJOR-REFACTORS.md already carries at least one non-empty ' +
                '`issue:` value — Phase 69 has filed issue numbers into this document under ISSUE-05, and ' +
                'regenerating would clobber them. Pass --force to override.\n'
        };
    }
    return { blocked: false };
}

function runEmit(kind, { force, write }) {
    const guard = checkRegenerationGuard(force);
    if (guard.blocked) {
        process.stderr.write(guard.message);
        process.exitCode = 1;
        return;
    }

    const corpus = loadCorpus();
    const selection = selectByDisposition(corpus);
    if (!assertCounts(selection)) {
        process.exitCode = 1;
        return;
    }

    let body, header, targetPath, sectionHeading;
    if (kind === 'easy') {
        body = selection.easy.map((rec, i) => renderEasyRow(i + 1, rec)).join('\n\n');
        header = easyHeader();
        sectionHeading = '## Rows';
        targetPath = EASY_PATH;
    } else {
        body = selection.major.map(rec => renderMajorBlock(rec)).join('\n\n');
        header = majorHeader();
        sectionHeading = '## Records';
        targetPath = MAJOR_PATH;
    }

    process.stdout.write(body + '\n');

    if (write) {
        writeAtomic(targetPath, `${header}${sectionHeading}\n\n${body}\n`);
    }
}

function runCheck() {
    let ok = true;
    const corpus = loadCorpus();
    const selection = selectByDisposition(corpus);
    if (!assertCounts(selection)) {
        process.stderr.write('FAIL: corpus hard-fail gate (see breakdown above)\n');
        process.exitCode = 1;
        return;
    }
    console.log('PASS: corpus hard-fail gate (224 = 144 + 77 + 3, all per-phase splits match)');

    // --- EASY-FIXES.md: count + ID-set equality ---
    if (!existsSync(EASY_PATH)) {
        console.log(`FAIL: ${EASY_PATH} does not exist`);
        ok = false;
    } else {
        const text = readFileSync(EASY_PATH, 'utf8');
        const blocks = extractFencedBlocks(text).map(parseFields).filter(f => f.finding_id);
        const docIds = blocks.map(f => joined(f.finding_id));
        const corpusIds = selection.easy.map(r => r.id);
        if (blocks.length !== EXPECTED_EASY_TOTAL) {
            console.log(`FAIL: EASY-FIXES.md has ${blocks.length} finding_id blocks, expected ${EXPECTED_EASY_TOTAL}`);
            ok = false;
        } else {
            console.log(`PASS: EASY-FIXES.md has exactly ${EXPECTED_EASY_TOTAL} finding_id blocks`);
        }
        const docSet = new Set(docIds);
        const corpusSet = new Set(corpusIds);
        const inDocNotCorpus = docIds.filter(id => !corpusSet.has(id));
        const inCorpusNotDoc = corpusIds.filter(id => !docSet.has(id));
        if (inDocNotCorpus.length || inCorpusNotDoc.length) {
            console.log(`FAIL: EASY-FIXES.md ID-set mismatch — in document not in corpus: [${inDocNotCorpus.join(', ')}]; in corpus not in document: [${inCorpusNotDoc.join(', ')}]`);
            ok = false;
        } else {
            console.log('PASS: EASY-FIXES.md finding-ID set equals the corpus easy-fix selection');
        }
    }

    // --- MAJOR-REFACTORS.md: count + ID-set equality ---
    if (!existsSync(MAJOR_PATH)) {
        console.log(`FAIL: ${MAJOR_PATH} does not exist`);
        ok = false;
    } else {
        const text = readFileSync(MAJOR_PATH, 'utf8');
        const blocks = extractFencedBlocks(text).map(parseFields).filter(f => f.id);
        const docIds = blocks.map(f => joined(f.id));
        const corpusIds = selection.major.map(r => r.id);
        if (blocks.length !== EXPECTED_MAJOR_TOTAL) {
            console.log(`FAIL: MAJOR-REFACTORS.md has ${blocks.length} id blocks, expected ${EXPECTED_MAJOR_TOTAL}`);
            ok = false;
        } else {
            console.log(`PASS: MAJOR-REFACTORS.md has exactly ${EXPECTED_MAJOR_TOTAL} id blocks`);
        }
        const docSet = new Set(docIds);
        const corpusSet = new Set(corpusIds);
        const inDocNotCorpus = docIds.filter(id => !corpusSet.has(id));
        const inCorpusNotDoc = corpusIds.filter(id => !docSet.has(id));
        if (inDocNotCorpus.length || inCorpusNotDoc.length) {
            console.log(`FAIL: MAJOR-REFACTORS.md ID-set mismatch — in document not in corpus: [${inDocNotCorpus.join(', ')}]; in corpus not in document: [${inCorpusNotDoc.join(', ')}]`);
            ok = false;
        } else {
            console.log('PASS: MAJOR-REFACTORS.md finding-ID set equals the corpus major-refactor selection');
        }
    }

    if (!ok) {
        process.exitCode = 1;
    }
}

function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const force = args.includes('--force');
    const write = args.includes('--write');

    if (command === 'emit-easy') {
        runEmit('easy', { force, write });
    } else if (command === 'emit-major') {
        runEmit('major', { force, write });
    } else if (command === 'check') {
        runCheck();
    } else {
        process.stderr.write('Usage: node derive-review-docs.mjs <emit-easy|emit-major|check> [--force] [--write]\n');
        process.exitCode = 1;
    }
}

main();
