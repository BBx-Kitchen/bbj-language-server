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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REVIEWS_DIR = join(SCRIPT_DIR, '..', '..', 'reviews');
const EASY_PATH = join(REVIEWS_DIR, 'EASY-FIXES.md');
const MAJOR_PATH = join(REVIEWS_DIR, 'MAJOR-REFACTORS.md');
const APPLY_SET_PATH = join(SCRIPT_DIR, '..', '67-apply-easy-fixes', '67-APPLY-SET.md');

const PLACEHOLDER_APPROACH = 'PENDING-APPROACH';
const PLACEHOLDER_AREA = 'PENDING-AREA';
const PLACEHOLDER_RESOLUTION = 'PENDING-RESOLUTION';
const PLACEHOLDER_MARKERS = [PLACEHOLDER_APPROACH, PLACEHOLDER_AREA, PLACEHOLDER_RESOLUTION];
const SEVERITY_PRIO = { critical: 'PRIO 1', high: 'PRIO 1', medium: 'PRIO 2', low: 'PRIO 3' };

const EASY_REQUIRED_KEYS = [
    'row', 'finding_id', 'unit', 'location', 'dimension', 'severity', 'effort', 'verdict',
    'failure_scenario', 'fix_applied', 'user_facing', 'verification', 'commit', 'notes'
];
const MAJOR_REQUIRED_KEYS = [
    'id', 'unit', 'location', 'dimension', 'secondary', 'severity', 'evidence_tier', 'evidence',
    'failure_scenario', 'classification', 'effort', 'dedup', 'disposition',
    'proposed_approach', 'proposed_labels', 'issue'
];
// Verdicts whose `commit:` field carries a prose reason instead of a sha — exempted from
// sha-resolvability by verdict, not by pattern (Task 2's spec).
const SHA_EXEMPT_VERDICTS = new Set(['no-op', 'excluded', 'deferred']);
const SHA_TOKEN_RE = /\b[0-9a-f]{7,40}\b/g;
const CREDENTIAL_PATTERNS = [
    { name: 'GitHub PAT (ghp_)', re: /ghp_[A-Za-z0-9]+/ },
    { name: 'GitHub fine-grained PAT (github_pat_)', re: /github_pat_[A-Za-z0-9_]+/ },
    { name: 'AWS access key (AKIA)', re: /AKIA[0-9A-Z]{16}/ },
    { name: 'Twitter/OAuth token (xox)', re: /xox[a-z0-9-]+/i },
    { name: 'PEM private key header', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ }
];

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

/** Split 67-APPLY-SET.md's raw text into fenced ```...``` row blocks whose first non-empty line
 *  is a `row:` field (D-04's lift source for EASY-FIXES.md — see loadApplySetMap). */
function extractApplySetRows(fileText) {
    const rows = [];
    const fenceRe = /```\n(row: *\d+[\s\S]*?)\n```/g;
    let match;
    while ((match = fenceRe.exec(fileText)) !== null) {
        rows.push(match[1]);
    }
    return rows;
}

/** Read 67-APPLY-SET.md's 77 ledger rows and index them by finding_id (D-04: EASY-FIXES.md's row
 *  content — verdict, fix_applied, user_facing, verification, commit, notes, and every other
 *  field — is lifted from this file, not re-derived from source or COVERAGE). */
function loadApplySetMap() {
    const text = readFileSync(APPLY_SET_PATH, 'utf8');
    const map = new Map();
    for (const block of extractApplySetRows(text)) {
        const fields = parseFields(block);
        map.set(joined(fields.finding_id), fields);
    }
    return map;
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

/** EASY-FIXES.md row: unit/location/dimension/severity/effort/failure_scenario come from the
 *  record's own COVERAGE source (rec.fields) so `failure_scenario:` stays byte-identical to
 *  COVERAGE after whitespace-collapse (a must_haves.truths requirement) — derive-apply-set.mjs's
 *  own `firstThreeLines` truncation left 67-APPLY-SET.md's copy of this field shorter than the
 *  COVERAGE original for many rows, so COVERAGE, not the ledger, is this field's fidelity source.
 *  verdict/fix_applied/user_facing/verification/commit/notes have no COVERAGE equivalent and are
 *  lifted from 67-APPLY-SET.md by finding_id (D-04). A missing match is a hard error (a departure
 *  from the proven 77=77 ID-set equality), not silently skipped. */
function renderEasyRow(rowNumber, rec, applySetMap) {
    const applyFields = applySetMap.get(rec.id);
    if (!applyFields) {
        throw new Error(`No 67-APPLY-SET.md row found for ${rec.id} — D-04 lift requires an exact ID match.`);
    }
    const f = rec.fields;
    return [
        '```',
        field('row', String(rowNumber)),
        field('finding_id', rec.id),
        field('unit', joined(f.unit)),
        field('location', fullJoined(f.location)),
        field('dimension', joined(f.dimension)),
        field('severity', joined(f.severity)),
        field('effort', joined(f.effort)),
        field('verdict', joined(applyFields.verdict)),
        field('failure_scenario', fullJoined(f.failure_scenario)),
        field('fix_applied', fullJoined(applyFields.fix_applied)),
        field('user_facing', fullJoined(applyFields.user_facing)),
        field('verification', fullJoined(applyFields.verification)),
        field('commit', fullJoined(applyFields.commit)),
        field('notes', fullJoined(applyFields.notes)),
        '```'
    ].join('\n');
}

/** Locked-scale PRIO label for a severity value (INVENTORY §3d) — mechanical, not judgment. */
function prioForSeverity(severity) {
    return SEVERITY_PRIO[severity] ?? 'PRIO ?';
}

/** Area label for a finding's proposed_labels — genuine judgment (which module/component this
 *  belongs to for Phase 69's issue labels), not derivable from a locked scale. Scaffolded as a
 *  placeholder here; a later plan in this phase authors the real area per record. */
function areaForRecord(_fields) {
    return PLACEHOLDER_AREA;
}

/** Compose the `proposed_labels:` value: area (judgment, placeholder for now) + PRIO (locked
 *  severity scale, mechanical) + effort (already-recorded locked scale, mechanical). */
function proposedLabels(fields) {
    const severity = joined(fields.severity);
    const effort = joined(fields.effort);
    return `${areaForRecord(fields)}, ${prioForSeverity(severity)}, effort ${effort}`;
}

/** MAJOR-REFACTORS.md block: INVENTORY's frozen 13-field order, verbatim, plus the four
 *  Phase-69-facing fields (D-09): proposed_approach (judgment, placeholder for now),
 *  proposed_labels (area placeholder + mechanically-derived PRIO/effort), and an empty issue:
 *  slot Phase 69 fills under ISSUE-05. */
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
        field('proposed_approach', PLACEHOLDER_APPROACH),
        field('proposed_labels', proposedLabels(f)),
        field('issue', ''),
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

/** Severity / effort distribution across the 144 selected major-refactor records, plus the IDs
 *  of records whose `effort:` field carries an in-record annotation rather than a bare number
 *  (D-13's locked {2,4,8} scale, INVENTORY §3d). Every number here is re-derived from the corpus
 *  at Reconciliation-authoring time and again at every `check` run (see checkReconciliationText). */
function majorSeverityAndEffort(selection) {
    const severityCounts = {};
    const effortCounts = {};
    const annotatedEffortIds = [];
    for (const rec of selection.major) {
        const sev = joined(rec.fields.severity);
        severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
        const effRaw = fullJoined(rec.fields.effort);
        const bareMatch = effRaw.match(/^(\d+)\b/);
        const effNum = bareMatch ? bareMatch[1] : effRaw;
        effortCounts[effNum] = (effortCounts[effNum] ?? 0) + 1;
        if (effRaw !== effNum) annotatedEffortIds.push(rec.id);
    }
    return { severityCounts, effortCounts, annotatedEffortIds };
}

/** Verdict distribution, user_facing:-yes rows, and off-{2,4,8}-scale effort rows across the 77
 *  selected easy-fix records, sourced from 67-APPLY-SET.md (verdict/user_facing) and COVERAGE
 *  (effort, per the same fidelity reasoning as renderEasyRow). */
function easyVerdictAndEffort(selection, applySetMap) {
    const verdictCounts = {};
    const verdictIds = {};
    const userFacingYesIds = [];
    const offScaleEffortIds = [];
    for (const rec of selection.easy) {
        const applyFields = applySetMap.get(rec.id);
        const verdict = joined(applyFields.verdict);
        verdictCounts[verdict] = (verdictCounts[verdict] ?? 0) + 1;
        (verdictIds[verdict] ??= []).push(rec.id);
        if (fullJoined(applyFields.user_facing).startsWith('yes')) userFacingYesIds.push(rec.id);
        // Bare leading number only — COVERAGE's effort field for P63-D8-006/P63-D8-007 reads
        // "2 (revised 2026-08-18: recorded as 1 ...)" (an annotation about 67-APPLY-SET.md's own
        // separate rounding, not a COVERAGE-side off-scale value), so the bare COVERAGE number (2)
        // is what is on/off {2,4,8}-scale here, not the full annotated string.
        const effRaw = joined(rec.fields.effort);
        const bareMatch = effRaw.match(/^(\d+)\b/);
        const effBare = bareMatch ? bareMatch[1] : effRaw;
        if (!['2', '4', '8'].includes(effBare)) offScaleEffortIds.push(rec.id);
    }
    return { verdictCounts, verdictIds, userFacingYesIds, offScaleEffortIds };
}

/** MAJOR-REFACTORS.md's `## Reconciliation` section, computed fresh from the corpus every call —
 *  used both to compose the assembled document and, at `check` time, to verify the document's
 *  own Reconciliation text has not drifted from what the corpus currently derives (Task 3). */
function majorReconciliationText(selection) {
    const { severityCounts, effortCounts, annotatedEffortIds } = majorSeverityAndEffort(selection);
    const total = selection.major.length + selection.easy.length + selection.wontfix.length;
    const phaseSplit = PHASES.map(p => `${p}=\`${selection.majorSplit[p]}\``).join(', ');
    return `## Reconciliation

\`${total}\` records selected across the six closed COVERAGE files, splitting \`${selection.major.length}\` major-refactor + \`${selection.easy.length}\` easy-fix + \`${selection.wontfix.length}\` wontfix = \`${total}\`, with the per-phase major split ${phaseSplit} = \`${selection.major.length}\`.

The \`${selection.easy.length}\` easy-fix records live in \`EASY-FIXES.md\`, and the \`${selection.wontfix.length}\` wontfix records live in this document's \`## Other Dispositions\` section, so no row of the \`${total}\` is absent from the pair of documents.

Severity distribution of the \`${selection.major.length}\`: \`${severityCounts.critical ?? 0}\` critical, \`${severityCounts.high ?? 0}\` high, \`${severityCounts.medium ?? 0}\` medium, \`${severityCounts.low ?? 0}\` low.

Effort distribution after INVENTORY §3d normalisation: \`${effortCounts['2'] ?? 0}\` × \`2\`, \`${effortCounts['4'] ?? 0}\` × \`4\`, \`${effortCounts['8'] ?? 0}\` × \`8\`. Three records — ${annotatedEffortIds.map(id => `\`${id}\``).join(', ')} — carry an in-record annotation on the \`effort:\` value that is carried through verbatim rather than stripped to the bare number.

`;
}

/** EASY-FIXES.md's `## Reconciliation` section, computed fresh from the corpus every call — see
 *  majorReconciliationText for the check-time re-derivation this feeds. */
function easyReconciliationText(selection, applySetMap) {
    const { verdictCounts, verdictIds, userFacingYesIds, offScaleEffortIds } = easyVerdictAndEffort(selection, applySetMap);
    const applied = verdictCounts.applied ?? 0;
    const noOp = verdictCounts['no-op'] ?? 0;
    const excluded = verdictCounts.excluded ?? 0;
    const deferred = verdictCounts.deferred ?? 0;
    const total = selection.easy.length;
    const noOpIds = (verdictIds['no-op'] ?? []).map(id => `\`${id}\``).join(', ');
    const excludedIds = (verdictIds.excluded ?? []).map(id => `\`${id}\``).join(', ');
    const deferredIds = (verdictIds.deferred ?? []).map(id => `\`${id}\``).join(', ');
    const offScale = offScaleEffortIds.map(id => `\`${id}\``).join(' and ');
    return `## Reconciliation

\`${total}\` easy-fix records selected, splitting \`${applied}\` \`applied\` + \`${noOp}\` \`no-op\` + \`${excluded}\` \`excluded\` + \`${deferred}\` \`deferred\` = \`${total}\` (D-03). The \`${noOp}\` \`no-op\` records are ${noOpIds}; the \`${excluded}\` \`excluded\` records are ${excludedIds}; the \`${deferred}\` \`deferred\` record is ${deferredIds}.

\`${userFacingYesIds.length}\` of the \`${total}\` rows carry \`user_facing: yes\`, and those rows are what discharges FIX-04 under D-11.

\`${offScaleEffortIds.length}\` records — ${offScale} — carry \`effort: 1\`, off INVENTORY §3d's locked \`{2,4,8}\` scale. Phase 67's close-out §"Recorded departures" found no in-record annotation for either despite 68-CONTEXT.md D-02 asserting one exists; the value is carried through unrounded and the discrepancy is stated here rather than an annotation being fabricated.

Findings that are neither easy-fix nor major-refactor are recorded in \`MAJOR-REFACTORS.md\` §"Other Dispositions" (D-06); this document is not duplicated there.

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

    let body, header, reconciliation, targetPath, sectionHeading;
    if (kind === 'easy') {
        const applySetMap = loadApplySetMap();
        body = selection.easy.map((rec, i) => renderEasyRow(i + 1, rec, applySetMap)).join('\n\n');
        header = easyHeader();
        reconciliation = easyReconciliationText(selection, applySetMap);
        sectionHeading = '## Rows';
        targetPath = EASY_PATH;
    } else {
        body = selection.major.map(rec => renderMajorBlock(rec)).join('\n\n');
        header = majorHeader();
        reconciliation = majorReconciliationText(selection);
        sectionHeading = '## Records';
        targetPath = MAJOR_PATH;
    }

    process.stdout.write(body + '\n');

    if (write) {
        writeAtomic(targetPath, `${header}${reconciliation}${sectionHeading}\n\n${body}\n`);
    }
}

function collapseWhitespace(s) {
    return s.replace(/\s+/g, ' ').trim();
}

/** Field-presence assertion: every block in `blocks` (each a parsed-fields map, tagged with its
 *  own identifying finding ID) carries every key in `requiredKeys`. A key present with an empty
 *  value is not a failure (INVENTORY requires optional fields to be written, never dropped); a
 *  key absent entirely is. Returns the list of "<id>: missing <key>" failure strings. */
function checkFieldPresence(blocks, requiredKeys, idKey) {
    const failures = [];
    for (const fields of blocks) {
        const id = joined(fields[idKey]) || '(unknown)';
        for (const key of requiredKeys) {
            if (!Object.prototype.hasOwnProperty.call(fields, key)) {
                failures.push(`${id}: missing \`${key}:\` (key absent, not merely empty)`);
            }
        }
    }
    return failures;
}

/** Verbatim-fidelity assertion: each document record's `failure_scenario:` equals its COVERAGE
 *  source's `failure_scenario:` after collapsing whitespace runs to a single space; and no field
 *  value in the block contains a triple-backtick sequence that would terminate the fence. */
function checkVerbatimFidelity(docBlocks, corpusById, idKey) {
    const failures = [];
    for (const fields of docBlocks) {
        const id = joined(fields[idKey]);
        const corpusRec = corpusById.get(id);
        if (corpusRec) {
            const docFS = collapseWhitespace(fullJoined(fields.failure_scenario));
            const corpusFS = collapseWhitespace(fullJoined(corpusRec.fields.failure_scenario));
            if (docFS !== corpusFS) {
                failures.push(`${id}: failure_scenario does not match its COVERAGE source after whitespace-collapse`);
            }
        }
        for (const [key, lines] of Object.entries(fields)) {
            if (fullJoined(lines).includes('```')) {
                failures.push(`${id}: field \`${key}:\` contains a triple-backtick sequence`);
            }
        }
    }
    return failures;
}

/** Commit-sha resolvability (T-68-05): every 7-40 char lowercase hex token in an EASY-FIXES.md
 *  `commit:` field, for rows whose verdict is not in SHA_EXEMPT_VERDICTS, resolves via
 *  `git cat-file -e <sha>^{commit}`, checked once per unique sha. Returns { failures, uniqueCount }. */
function checkCommitShaResolvability(easyBlocks) {
    const failures = [];
    const shaToIds = new Map();
    for (const fields of easyBlocks) {
        const id = joined(fields.finding_id);
        const verdict = joined(fields.verdict);
        if (SHA_EXEMPT_VERDICTS.has(verdict)) continue;
        const commitText = fullJoined(fields.commit);
        const shas = commitText.match(SHA_TOKEN_RE) ?? [];
        for (const sha of shas) {
            if (!shaToIds.has(sha)) shaToIds.set(sha, []);
            shaToIds.get(sha).push(id);
        }
    }
    for (const [sha, ids] of shaToIds) {
        try {
            execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: SCRIPT_DIR, stdio: 'ignore' });
        } catch {
            failures.push(`sha ${sha} (from ${ids.join(', ')}) does not resolve via git cat-file -e`);
        }
    }
    return { failures, uniqueCount: shaToIds.size };
}

/** Credential-shaped-literal scan (T-68-02): neither document contains a GitHub PAT, AWS access
 *  key, Slack/OAuth token, or PEM private-key header. */
function checkCredentialScan(label, text) {
    const failures = [];
    for (const pattern of CREDENTIAL_PATTERNS) {
        if (pattern.re.test(text)) {
            failures.push(`${label} contains a ${pattern.name}-shaped literal`);
        }
    }
    return failures;
}

/** Placeholder census (informational, not a failure until plan 68-07 hardens it): count each
 *  placeholder marker's occurrences per document. */
function placeholderCensus(text) {
    const counts = {};
    for (const marker of PLACEHOLDER_MARKERS) {
        const re = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = text.match(re);
        counts[marker] = matches ? matches.length : 0;
    }
    return counts;
}

/** Determinism assertion (must_haves.truths): two in-process renders of each emit produce
 *  identical strings. */
function checkDeterminism(selection, applySetMap) {
    const easy1 = selection.easy.map((rec, i) => renderEasyRow(i + 1, rec, applySetMap)).join('\n\n');
    const easy2 = selection.easy.map((rec, i) => renderEasyRow(i + 1, rec, applySetMap)).join('\n\n');
    const major1 = selection.major.map(rec => renderMajorBlock(rec)).join('\n\n');
    const major2 = selection.major.map(rec => renderMajorBlock(rec)).join('\n\n');
    return { easyOk: easy1 === easy2, majorOk: major1 === major2 };
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

    if (!existsSync(EASY_PATH) || !existsSync(MAJOR_PATH)) {
        if (!existsSync(EASY_PATH)) console.log(`FAIL: ${EASY_PATH} does not exist`);
        if (!existsSync(MAJOR_PATH)) console.log(`FAIL: ${MAJOR_PATH} does not exist`);
        process.exitCode = 1;
        return;
    }

    const easyText = readFileSync(EASY_PATH, 'utf8');
    const majorText = readFileSync(MAJOR_PATH, 'utf8');
    const easyBlocks = extractFencedBlocks(easyText).map(parseFields).filter(f => f.finding_id);
    const majorBlocks = extractFencedBlocks(majorText).map(parseFields).filter(f => f.id);
    const corpusEasyById = new Map(selection.easy.map(r => [r.id, r]));
    const corpusMajorById = new Map(selection.major.map(r => [r.id, r]));

    // --- 1. Counts + ID-set equality ---
    const easyDocIds = easyBlocks.map(f => joined(f.finding_id));
    const easyCorpusIds = selection.easy.map(r => r.id);
    if (easyBlocks.length !== EXPECTED_EASY_TOTAL) {
        console.log(`FAIL: EASY-FIXES.md has ${easyBlocks.length} finding_id blocks, expected ${EXPECTED_EASY_TOTAL}`);
        ok = false;
    } else {
        console.log(`PASS: EASY-FIXES.md has exactly ${EXPECTED_EASY_TOTAL} finding_id blocks`);
    }
    {
        const docSet = new Set(easyDocIds);
        const corpusSet = new Set(easyCorpusIds);
        const inDocNotCorpus = easyDocIds.filter(id => !corpusSet.has(id));
        const inCorpusNotDoc = easyCorpusIds.filter(id => !docSet.has(id));
        if (inDocNotCorpus.length || inCorpusNotDoc.length) {
            console.log(`FAIL: EASY-FIXES.md ID-set mismatch — in document not in corpus: [${inDocNotCorpus.join(', ')}]; in corpus not in document: [${inCorpusNotDoc.join(', ')}]`);
            ok = false;
        } else {
            console.log('PASS: EASY-FIXES.md finding-ID set equals the corpus easy-fix selection');
        }
    }

    const majorDocIds = majorBlocks.map(f => joined(f.id));
    const majorCorpusIds = selection.major.map(r => r.id);
    if (majorBlocks.length !== EXPECTED_MAJOR_TOTAL) {
        console.log(`FAIL: MAJOR-REFACTORS.md has ${majorBlocks.length} id blocks, expected ${EXPECTED_MAJOR_TOTAL}`);
        ok = false;
    } else {
        console.log(`PASS: MAJOR-REFACTORS.md has exactly ${EXPECTED_MAJOR_TOTAL} id blocks`);
    }
    {
        const docSet = new Set(majorDocIds);
        const corpusSet = new Set(majorCorpusIds);
        const inDocNotCorpus = majorDocIds.filter(id => !corpusSet.has(id));
        const inCorpusNotDoc = majorCorpusIds.filter(id => !docSet.has(id));
        if (inDocNotCorpus.length || inCorpusNotDoc.length) {
            console.log(`FAIL: MAJOR-REFACTORS.md ID-set mismatch — in document not in corpus: [${inDocNotCorpus.join(', ')}]; in corpus not in document: [${inCorpusNotDoc.join(', ')}]`);
            ok = false;
        } else {
            console.log('PASS: MAJOR-REFACTORS.md finding-ID set equals the corpus major-refactor selection');
        }
    }

    // --- 2. Required-field presence per block ---
    {
        const failures = [
            ...checkFieldPresence(easyBlocks, EASY_REQUIRED_KEYS, 'finding_id'),
            ...checkFieldPresence(majorBlocks, MAJOR_REQUIRED_KEYS, 'id')
        ];
        if (failures.length) {
            console.log(`FAIL: required-field presence — ${failures.length} problem(s):`);
            for (const f of failures) console.log(`  - ${f}`);
            ok = false;
        } else {
            console.log('PASS: every block in both documents carries every required field key');
        }
    }

    // --- 3. Verbatim fidelity ---
    {
        const failures = [
            ...checkVerbatimFidelity(easyBlocks, corpusEasyById, 'finding_id'),
            ...checkVerbatimFidelity(majorBlocks, corpusMajorById, 'id')
        ];
        if (failures.length) {
            console.log(`FAIL: verbatim fidelity — ${failures.length} problem(s):`);
            for (const f of failures) console.log(`  - ${f}`);
            ok = false;
        } else {
            console.log('PASS: every failure_scenario matches its COVERAGE source verbatim (whitespace-collapsed); no fence-terminating field value');
        }
    }

    // --- 4. Commit-sha resolvability ---
    {
        const { failures, uniqueCount } = checkCommitShaResolvability(easyBlocks);
        if (failures.length) {
            console.log(`FAIL: commit-sha resolvability — ${failures.length} problem(s) (${uniqueCount} unique shas checked):`);
            for (const f of failures) console.log(`  - ${f}`);
            ok = false;
        } else {
            console.log(`PASS: commit-sha resolvability — ${uniqueCount} unique shas checked, all resolve via git cat-file -e`);
        }
    }

    // --- 5. Credential-shaped-literal scan ---
    {
        const failures = [
            ...checkCredentialScan('EASY-FIXES.md', easyText),
            ...checkCredentialScan('MAJOR-REFACTORS.md', majorText)
        ];
        if (failures.length) {
            console.log(`FAIL: credential-shaped-literal scan — ${failures.length} problem(s):`);
            for (const f of failures) console.log(`  - ${f}`);
            ok = false;
        } else {
            console.log('PASS: credential-shaped-literal scan — neither document contains a ghp_/github_pat_/AKIA/xox/PEM-header literal');
        }
    }

    // --- 6. Placeholder census (informational) ---
    {
        const easyCensus = placeholderCensus(easyText);
        const majorCensus = placeholderCensus(majorText);
        console.log(`INFO: placeholder census — EASY-FIXES.md: ${JSON.stringify(easyCensus)}`);
        console.log(`INFO: placeholder census — MAJOR-REFACTORS.md: ${JSON.stringify(majorCensus)}`);
    }

    // --- 7. Determinism ---
    const applySetMap = loadApplySetMap();
    {
        const { easyOk, majorOk } = checkDeterminism(selection, applySetMap);
        if (!easyOk || !majorOk) {
            console.log(`FAIL: determinism — easyOk=${easyOk} majorOk=${majorOk}`);
            ok = false;
        } else {
            console.log('PASS: determinism — two in-process renders of each emit produce identical strings');
        }
    }

    // --- 8. Reconciliation arithmetic re-derived from the corpus ---
    {
        const expectedEasyReconciliation = easyReconciliationText(selection, applySetMap);
        const expectedMajorReconciliation = majorReconciliationText(selection);
        const easyHasReconciliation = easyText.includes('## Reconciliation');
        const majorHasReconciliation = majorText.includes('## Reconciliation');
        if (!easyHasReconciliation || !majorHasReconciliation) {
            console.log(`FAIL: Reconciliation section missing — EASY-FIXES.md=${easyHasReconciliation} MAJOR-REFACTORS.md=${majorHasReconciliation}`);
            ok = false;
        } else if (!easyText.includes(expectedEasyReconciliation)) {
            console.log('FAIL: EASY-FIXES.md §Reconciliation text does not match what the corpus currently derives — a stated number has drifted from the corpus');
            ok = false;
        } else if (!majorText.includes(expectedMajorReconciliation)) {
            console.log('FAIL: MAJOR-REFACTORS.md §Reconciliation text does not match what the corpus currently derives — a stated number has drifted from the corpus');
            ok = false;
        } else {
            console.log('PASS: both documents\' §Reconciliation arithmetic matches what the corpus currently derives');
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
