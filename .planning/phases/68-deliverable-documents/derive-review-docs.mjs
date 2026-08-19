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
//   emit-other   print MAJOR-REFACTORS.md's `## Other Dispositions` section to stdout — DOC-04's
//                whole population (3 wontfix + 24 not-reproducible + 0 duplicate + 14
//                already-covered + 30 cross-unit referrals), extracted from the six COVERAGE
//                files' own prose sub-blocks (plan 68-03). --write splices it in as this
//                document's last section, replacing any prior copy of it.
//   check        validate the two assembled documents in .planning/reviews/ against the corpus
//
// Flags:
//   --force      bypass the regeneration guard (see below) for emit-easy / emit-major / emit-other
//   --write      in addition to printing to stdout, atomically compose and overwrite the target
//                document in .planning/reviews/ (writeAtomic — write to a sibling .tmp path, then
//                renameSync into place, so an interrupted run cannot leave a half-written file)
//
// Regeneration guard (T-68-03, D-09's `costly` reversibility): before emit-easy, emit-major or
// emit-other writes or emits, if .planning/reviews/MAJOR-REFACTORS.md already exists and carries
// any `issue:` line with a non-empty value, the command refuses (prints why, exits non-zero, emits
// nothing) — Phase 69 writes filed issue numbers into that file under ISSUE-05, and a plain re-run
// of this script must never clobber them. --force bypasses the guard explicitly.

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
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

// INVENTORY's fifteen existing area labels (INVENTORY.md:34-38) — `proposed_labels:`'s area
// component is drawn only from this set (plan 68-02 Task 2).
const AREA_LABELS = new Set([
    'grammar', 'scoping', 'types', 'library', 'validation', 'linking', 'CUI', 'vscode', 'intellij',
    'BBj integration and infrastructure', 'missing verb/parameter', 'common pattern', 'dependencies',
    'javascript', 'documentation'
]);

// The 26 major-refactor finding IDs whose `classification:` test-(5) clause names no edit
// (verdict FAIL/n/a/moot, or absent) — plan 68-02 Task 2's action text. `approachSeed` computes
// this set live from the corpus at every run and hard-fails if the derived set departs from this
// literal list (the same honesty-gate pattern `assertCounts` uses for the 224/144/77/3 denominator).
const EXPECTED_NO_NAMED_EDIT_IDS = [
    'P61-D5-001', 'P61-D5-002', 'P61-D5-003', 'P61-D5-010', 'P61-D5-013', 'P61-D5-014',
    'P63-D7-001', 'P63-D7-002', 'P63-D7-003', 'P63-D7-005', 'P63-D7-006', 'P63-D2-010',
    'P63-D6-002', 'P63-D4-010', 'P64-D1-002', 'P64-D1-003', 'P64-D2-005', 'P64-D2-006',
    'P64-D3-002', 'P64-D4-003', 'P64-D5-001', 'P64-D6-002', 'P64-D6-003', 'P64-D6-005',
    'P66-D5-001', 'P66-D5-002'
];

// Phase 67 close-out corrections that land on major records (68-02 Task 2 action) — appended to
// the corrected block's own `proposed_approach:` value so a reader is not misled by a disproven
// or superseded premise carried in the record's own `evidence:`/`classification:` prose.
const CORRECTION_P63_D2_013 =
    "Note: contrary to this record's own evidence field, `BbjSettingsConfigurable.apply():83` has " +
    'called `scheduleRestart()` since commit `35c916b`, predating the Phase 63 review — the guard ' +
    "must account for that existing call site rather than treating the debounce machinery as unused " +
    '(Phase 67 close-out correction).';
const CORRECTION_P64_D3_002 =
    'Reciprocal note: its `build.yml` `on:`-block sibling (`P64-D4-004`) already landed in Phase 67 ' +
    "as a recorded D-06 departure — whoever implements this record should expect that change is " +
    'already applied (Phase 67 close-out §"Recorded departures").';

const EASY_REQUIRED_KEYS = [
    'row', 'finding_id', 'unit', 'location', 'dimension', 'severity', 'effort', 'verdict',
    'test_required', 'fail_before', 'failure_scenario', 'fix_applied', 'user_facing',
    'verification', 'commit', 'notes'
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

// DOC-04 denominators (68-CONTEXT.md D-05/D-06/D-07, plan 68-03): the two categories the corpus's
// `disposition:` field does not carry — `### Not-reproducible dispositions` prose sub-blocks and
// `### Cross-unit referrals` / `### Cross-references` prose sub-blocks — extracted by
// `extractProseSubBlocks` below. Per-phase splits are the plan's own literal expected numbers;
// a departure is a finding (assertProseSubBlockCounts), never silently adjusted.
const EXPECTED_NOT_REPRODUCIBLE_TOTAL = 24;
const EXPECTED_NOT_REPRODUCIBLE_SPLIT = { 61: 11, 62: 4, 63: 2, 64: 7, 65: 0, 66: 0 };
const EXPECTED_REFERRAL_TOTAL = 30;
const EXPECTED_REFERRAL_SPLIT = { 61: 12, 62: 7, 63: 1, 64: 10, 65: 0, 66: 0 };
// The 14 records whose `dedup:` field is not `none` (68-CONTEXT.md's domain table) — DOC-04's
// `already-covered` category.
const EXPECTED_ALREADY_COVERED_TOTAL = 14;

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

/** Read and parse all 224 corpus records from the six closed COVERAGE files. Also returns the raw
 *  per-phase file text (phaseFileTexts), needed by `draftApproachForId` to pull a DEBT record's
 *  own "### Issue-ready draft" §"Proposed approach:" prose when its `classification:` test-(5)
 *  clause is a bare pointer ("see Issue-ready draft below") rather than inline content. */
function loadCorpus() {
    const records = [];
    const phaseFileTexts = {};
    for (const phase of PHASES) {
        const filePath = join(REVIEWS_DIR, `${phase}-COVERAGE.md`);
        const text = readFileSync(filePath, 'utf8');
        phaseFileTexts[phase] = text;
        for (const block of extractRecords(text)) {
            const fields = parseFields(block);
            records.push({ phase, id: joined(fields.id), disposition: joined(fields.disposition), fields });
        }
    }
    return { records, phaseFileTexts };
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
 *  verdict/test_required/fail_before/fix_applied/user_facing/verification/commit/notes have no
 *  COVERAGE equivalent and are lifted from 67-APPLY-SET.md by finding_id (D-04) — including the
 *  Phase 67 close-out corrections for `P61-D2-002` and `P64-D6-013`, which already live inside
 *  those two rows' own ledger `notes:` value and so travel through this verbatim lift unchanged.
 *  A missing match is a hard error (a departure from the proven 77=77 ID-set equality), not
 *  silently skipped. */
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
        field('test_required', fullJoined(applyFields.test_required)),
        field('fail_before', fullJoined(applyFields.fail_before)),
        field('failure_scenario', fullJoined(f.failure_scenario)),
        field('fix_applied', fullJoined(applyFields.fix_applied)),
        field('user_facing', fullJoined(applyFields.user_facing)),
        field('verification', fullJoined(applyFields.verification)),
        field('commit', fullJoined(applyFields.commit)),
        field('notes', fullJoined(applyFields.notes)),
        '```'
    ].join('\n');
}

/** Hard-fail check (D-04, D-02): the 77-row ledger's own finding-ID set must equal the corpus
 *  easy-fix selection's ID set — the ledger is the content source, the corpus is still the
 *  denominator, and a departure between the two is a finding, not a silent skip. */
function checkLedgerIdSetEquality(selection, applySetMap) {
    const ledgerIds = new Set(applySetMap.keys());
    const corpusIds = new Set(selection.easy.map(r => r.id));
    const inLedgerNotCorpus = [...ledgerIds].filter(id => !corpusIds.has(id));
    const inCorpusNotLedger = [...corpusIds].filter(id => !ledgerIds.has(id));
    if (inLedgerNotCorpus.length || inCorpusNotLedger.length) {
        throw new Error(
            'D-04 ledger/corpus ID-set mismatch — in 67-APPLY-SET.md not in corpus easy-fix selection: ' +
            `[${inLedgerNotCorpus.join(', ')}]; in corpus not in ledger: [${inCorpusNotLedger.join(', ')}]`
        );
    }
}

/** EASY-FIXES.md's `## Index` table (Task 1): one row per selected easy-fix record, in the same
 *  four-column shape `67-APPLY-SET.md` uses. For the 7 non-`applied` rows the `commit` cell
 *  carries the inline reason (D-03) rather than a hash, so the table alone answers why a row has
 *  no commit hash without a reader needing `67-APPLY-SET.md` open. The reason text is selected by
 *  the row's own `verdict:` value (mechanical, not per-ID): `no-op` rows lift the ledger's own
 *  `commit:` field verbatim (it already names the resolving finding ID and its commit); `excluded`
 *  and `deferred` rows get a fixed reason naming the governing decision. */
const EXCLUDED_INDEX_REASON = 'excluded — INVENTORY.md is immutable for v4.0 (Phase 60 D-09, Phase 67 D-03)';
const DEFERRED_INDEX_REASON = 'deferred — no JDK 17 available in this environment (Phase 67 D-15)';
function easyIndexCommitCell(applyFields) {
    const verdict = joined(applyFields.verdict);
    if (verdict === 'excluded') return EXCLUDED_INDEX_REASON;
    if (verdict === 'deferred') return DEFERRED_INDEX_REASON;
    // applied and no-op: the ledger's own commit: field already carries the sha(s), or (for
    // no-op) the resolving finding ID and its commit — lifted verbatim either way.
    return fullJoined(applyFields.commit);
}
function easyIndexTable(selection, applySetMap) {
    const rows = selection.easy.map((rec, i) => {
        const applyFields = applySetMap.get(rec.id);
        const verdict = joined(applyFields.verdict);
        const commitCell = easyIndexCommitCell(applyFields).replace(/\|/g, '\\|');
        return `| ${i + 1} | ${rec.id} | ${verdict} | ${commitCell} |`;
    });
    return [
        '## Index',
        '',
        '| # | finding_id | verdict | commit |',
        '|---|---|---|---|',
        ...rows
    ].join('\n');
}

/** Locked-scale PRIO label for a severity value (INVENTORY §3d) — mechanical, not judgment. */
function prioForSeverity(severity) {
    return SEVERITY_PRIO[severity] ?? 'PRIO ?';
}

/** Bare leading `{2,4,8}` token of an `effort:` field that may carry an in-record annotation
 *  (e.g. `P63-D3-005`'s "2\n(revised 2026-08-18: ...)") — proposed_labels' effort component is
 *  this bare token, so the label and the recorded estimate are the same value with no translation
 *  step (D-09), while the block's own `effort:` field keeps the full annotation prose intact. */
function bareEffort(effortJoined) {
    const m = effortJoined.match(/^(\d+)\b/);
    return m ? m[1] : effortJoined;
}

/** Area label for a finding's `proposed_labels:` (68-02 Task 2 action) — resolved mechanically,
 *  in order: dimension `D6` -> `dependencies`; dimension `D8` -> `documentation`; else the longest
 *  matching `location:` path prefix among the six named prefixes. A bare `bbj-vscode/` root-level
 *  file (package.json, eslint.config.js, tsconfig.test.json, vitest.config.ts — none of them under
 *  `src/`, `test/` or `tools/`) is still part of the VS Code extension's own build tooling, so it
 *  resolves to `vscode` as the broader, lower-priority catch-all for that repo — applying the same
 *  longest-prefix-match principle one level up rather than falling to a placeholder for a case the
 *  must_haves.truths gate requires to resolve inside the fifteen-label set. Six of 144 records take
 *  this catch-all path (`P64-D2-007`, `P64-D2-008`, `P64-D3-003`, `P64-D4-005`, `P64-D4-006`,
 *  `P64-D5-002`); every other record resolves via one of the six explicitly named prefixes. */
function areaForRecord(fields) {
    const dimension = joined(fields.dimension);
    if (dimension === 'D6') return 'dependencies';
    if (dimension === 'D8') return 'documentation';
    const firstLoc = fullJoined(fields.location).split(',')[0].trim();
    const PREFIX_RULES = [
        ['bbj-intellij/', 'intellij'],
        ['bbj-vscode/src/', 'vscode'],
        ['bbj-vscode/tools/', 'BBj integration and infrastructure'],
        ['bbj-vscode/test/', 'javascript'],
        ['.github/', 'BBj integration and infrastructure'],
        ['java-interop/', 'BBj integration and infrastructure'],
        ['bbj-vscode/', 'vscode'] // catch-all: root-level bbj-vscode/ build/tooling files
    ];
    let best = null;
    for (const [prefix, area] of PREFIX_RULES) {
        if (firstLoc.startsWith(prefix) && (!best || prefix.length > best[0].length)) best = [prefix, area];
    }
    return best ? best[1] : `${PLACEHOLDER_AREA} (unresolved location prefix: ${firstLoc})`;
}

/** Compose the `proposed_labels:` value: `area=<label>; PRIO <n>; effort <n>` (68-02 Task 2
 *  action's exact shape) — area is the mechanical rule above, PRIO is INVENTORY §3d's locked
 *  severity scale, and effort is the bare leading token of the block's own `effort:` field, so the
 *  label and the estimate are the same value with no translation step. */
function proposedLabels(fields) {
    const severity = joined(fields.severity);
    const effort = bareEffort(fullJoined(fields.effort));
    return `area=${areaForRecord(fields)}; ${prioForSeverity(severity)}; effort ${effort}`;
}

/** Extract the text of test `(n)` from a `classification:` field's joined text — the span from the
 *  literal `(n)` marker up to (but not including) the next `(n+1)` marker, or to the end of the
 *  string if `(n)` is the last test recorded. */
function extractClause(classificationJoined, n) {
    const re = new RegExp(`\\(${n}\\)([\\s\\S]*?)(?:\\(${n + 1}\\)|$)`);
    const m = classificationJoined.match(re);
    return m ? m[1].trim() : '';
}

/** If `anchor` (e.g. "name the exact edit") is immediately followed by a parenthetical group in
 *  `clause` — tracking paren depth so a nested paren inside the named edit (a regex literal, a
 *  code snippet) does not truncate the capture early — return that group's inner text; else null. */
function parenAfterAnchor(clause, anchor) {
    const anchorIdx = clause.indexOf(anchor);
    if (anchorIdx === -1) return null;
    const after = clause.slice(anchorIdx + anchor.length);
    const pm = after.match(/^\s*\(/);
    if (!pm) return null;
    const openIdx = anchorIdx + anchor.length + pm[0].length - 1;
    let depth = 0, i = openIdx;
    for (; i < clause.length; i++) {
        if (clause[i] === '(') depth++;
        else if (clause[i] === ')') { depth--; if (depth === 0) break; }
    }
    if (depth !== 0) return null;
    return clause.slice(openIdx + 1, i).trim();
}

/** The reasoning prose that follows a test clause's own verdict token (`: pass —` / `: PASS,` /
 *  `: FAIL —` / etc.), with the verdict token and its leading punctuation stripped. Returns '' if
 *  the clause carries no verdict token at all. */
function reasoningAfterVerdict(clause) {
    const m = clause.match(/:\s*(pass|PASS|FAIL|n\/a|moot)\b\.?/);
    if (!m) return '';
    return clause.slice(m.index + m[0].length).replace(/^[\s,]*[—–-]+\s*/, '').trim();
}

/** The last verdict token (pass/PASS/FAIL/n/a/moot) appearing in `clause`, lowercased, or null if
 *  none is found. Uses the last match rather than the first because a clause's own reasoning prose
 *  (inside a nested parenthetical or a quoted phrase) can itself contain an earlier colon+word that
 *  is not the test's own verdict. */
function lastVerdictToken(clause) {
    const vm = [...clause.matchAll(/:\s*(pass|PASS|FAIL|n\/a|moot)\b/g)];
    return vm.length ? vm[vm.length - 1][1].toLowerCase() : null;
}

/** True when `text` is nothing but a pointer to the record's own "### Issue-ready draft" section
 *  ("(see Issue-ready draft below)" / "see Issue-ready draft below") rather than an inline named
 *  edit — the six Phase 66 DEBT records with a full issue-ready draft use this phrasing. */
function isPointerOnly(text) {
    return /^\(?see (the )?issue-ready draft below\)?/i.test(text.trim());
}

/** For a finding ID whose own COVERAGE record is followed (within the same file, close by) by an
 *  "### Issue-ready draft" section, pull that section's own "**Proposed approach:**" paragraph —
 *  real reviewer-authored text, not inferred — up to the next bold label, `---`, or `###` heading.
 *  Returns null if the ID has no nearby draft section or the paragraph can't be located. */
function draftApproachForId(fileText, id) {
    const idIdx = fileText.indexOf(`id:                ${id}\n`);
    if (idIdx === -1) return null;
    const draftIdx = fileText.indexOf('### Issue-ready draft', idIdx);
    if (draftIdx === -1 || draftIdx - idIdx > 4000) return null; // must belong to this same record, not a later one
    const afterDraft = fileText.slice(draftIdx);
    const m = afterDraft.match(/\*\*Proposed approach:\*\*([\s\S]*?)(?:\n\n\*\*|\n\n---|\n### )/);
    return m ? collapseWhitespace(m[1]) : null;
}

/** Light rewrite so an extracted clause reads as a standalone imperative-ish sentence rather than
 *  a mid-sentence reasoning fragment: strip leading connective punctuation left over from the
 *  extraction point, capitalize the first letter, strip trailing dangling punctuation, and ensure
 *  a closing period. This is punctuation cleanup only — no word of the reviewer's own content is
 *  added or changed, per DOC-02's "MUST NOT invent" prohibition. */
function toImperative(text) {
    let t = text.trim().replace(/^[,;:\s]+/, '').replace(/^[—–-]+\s*/, '');
    if (t.length) t = t.charAt(0).toUpperCase() + t.slice(1);
    t = t.replace(/[\s,;—–-]+$/, '');
    if (!/[.?!]$/.test(t)) t += '.';
    return t;
}

/** Seed `proposed_approach:` from the record's own `classification:` field (68-02 Task 2 action).
 *  Primary source is test-(5)'s own clause: a parenthetical immediately after "name the exact
 *  edit" if present, else the reasoning prose following its verdict token. When that clause's own
 *  verdict is not `pass`, or is `pass` but names no edit inline (a bare pointer to the record's own
 *  "### Issue-ready draft" section, or genuinely empty — five Phase 62 D4 dedup records and one
 *  Phase 64 D6 record read this way), two mechanical fallbacks apply in order before falling to the
 *  placeholder: the record's own Issue-ready draft "Proposed approach:" paragraph (six Phase 66
 *  DEBT records carry one), then test-(1)'s own clause by the same parenthetical/reasoning
 *  extraction (its FAIL reasoning routinely names the same edit test-5 references, since test (1)
 *  is "at most one file touched" and its failure explanation is "because fixing this needs edit X
 *  across N files"). Every fallback still draws only on the record's own written text — never a
 *  guess. Returns `{ placeholder: boolean, text: string }`. */
function approachSeed(rec, phaseFileTexts) {
    const classificationJoined = fullJoined(rec.fields.classification);
    const clause5 = extractClause(classificationJoined, 5);
    const verdict5 = lastVerdictToken(clause5);
    if (verdict5 !== 'pass') {
        return { placeholder: true, text: PLACEHOLDER_APPROACH };
    }
    let content = parenAfterAnchor(clause5, 'name the exact edit');
    if (!content) content = reasoningAfterVerdict(clause5);
    if (!content || content.length < 8 || isPointerOnly(content)) {
        const draft = draftApproachForId(phaseFileTexts[rec.phase], rec.id);
        if (draft && draft.length >= 8) {
            content = draft;
        } else {
            const clause1 = extractClause(classificationJoined, 1);
            const c1 = parenAfterAnchor(clause1, 'touches 1 file') || reasoningAfterVerdict(clause1);
            content = (c1 && c1.length >= 8 && !isPointerOnly(c1)) ? c1 : null;
        }
    }
    if (!content) {
        // A test-(5) "pass" verdict with no named edit anywhere findable in the record's own
        // written text — treat as the placeholder class too, per the same honesty gate: a derived
        // discrepancy from the expected 118/26 split is reported, never silently forced to fit.
        return { placeholder: true, text: PLACEHOLDER_APPROACH };
    }
    return { placeholder: false, text: toImperative(content) };
}

/** MAJOR-REFACTORS.md block: INVENTORY's frozen 13-field order, verbatim, plus the three
 *  Phase-69-facing fields (D-09's four appended fields, minus `effort:` which is already carried
 *  in the frozen order — see the reconciliation note below): `proposed_approach:` (seeded from the
 *  record's own classification test-5 clause, or the placeholder marker where it names no edit),
 *  `proposed_labels:` (mechanically-derived area/PRIO/effort), and an empty `issue:` slot Phase 69
 *  fills under ISSUE-05. Reconciliation note: D-09 describes "four appended fields"
 *  (proposed_approach, effort, proposed_labels, issue); the frozen 13-field order already carries
 *  `effort:` in place, so only three fields are genuinely appended here — `effort:` itself is not
 *  moved or duplicated. Carries the two Phase 67 close-out corrections (68-02 Task 2 action):
 *  `P63-D2-013`'s corrected call-site note, and `P64-D3-002`'s reciprocal `P64-D4-004` note. */
function renderMajorBlock(rec, phaseFileTexts) {
    const f = rec.fields;
    let seed = approachSeed(rec, phaseFileTexts);
    let approachText = seed.text;
    if (rec.id === 'P63-D2-013') approachText = `${approachText} ${CORRECTION_P63_D2_013}`;
    if (rec.id === 'P64-D3-002') approachText = `${approachText} — ${CORRECTION_P64_D3_002}`;
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
        field('proposed_approach', approachText),
        field('proposed_labels', proposedLabels(f)),
        field('issue', ''),
        '```'
    ].join('\n');
}

/** MAJOR-REFACTORS.md's `## Index (severity-sorted, for Phase 69 filing order)` (Task 3, D-10).
 *  Sort key, in order: severity rank (critical, high, medium, low), then PRIO, then effort
 *  ascending, then originating phase, then finding ID — the last two components make the key
 *  total, so no two records can tie and the table is stable across re-derivations. */
function severityIndexRow(rec) {
    const f = rec.fields;
    const severity = joined(f.severity);
    const prio = prioForSeverity(severity);
    const prioNum = Number((prio.match(/\d+/) ?? ['9'])[0]);
    const effort = Number(bareEffort(fullJoined(f.effort)));
    const area = areaForRecord(f);
    const firstLoc = fullJoined(f.location).split(',')[0].trim();
    return {
        id: rec.id, phase: rec.phase, severity, prio, prioNum, effort, area, location: firstLoc
    };
}
function severityIndexTable(selection) {
    const rows = selection.major.map(severityIndexRow);
    rows.sort((a, b) =>
        (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) ||
        (a.prioNum - b.prioNum) ||
        (a.effort - b.effort) ||
        (a.phase - b.phase) ||
        a.id.localeCompare(b.id)
    );
    const lines = rows.map((r, i) =>
        `| ${i + 1} | ${r.severity} | ${r.prio} | ${r.effort} | ${r.id} | ${r.location} | ${r.area} |`
    );
    return [
        '## Index (severity-sorted, for Phase 69 filing order)',
        '',
        'Phase 69 files in severity order (highest first); the record blocks below stay in ' +
            'originating-phase order so this document keeps diffing against `67-APPLY-SET.md` (D-10) ' +
            '— the 1 `critical` and 16 `high` records surface first here rather than being buried at ' +
            'whatever phase they came from.',
        '',
        '| # | severity | PRIO | effort | finding_id | location | area |',
        '|---|---|---|---|---|---|---|',
        ...lines
    ].join('\n');
}

/** Walk a COVERAGE file's raw text line by line and pull the items out of its
 *  `### Not-reproducible dispositions` and `### Cross-unit referrals` / `### Cross-references`
 *  prose sub-blocks (plan 68-03 Task 1). A heading line matching either target phrase (re)opens
 *  the corresponding mode; any other heading line at any level closes whichever mode is open. A
 *  file carries the not-reproducible/referral heading pair once per plan-level section, so this
 *  walk accumulates across every occurrence in the file, not just the first. Inside an open mode,
 *  an item starts at a line whose first non-space characters are a list marker — a digit + `.` +
 *  space, or `-` + space, or `*` + space — and continues (whitespace-collapsed) until the next
 *  item or the mode's close; both Phase 64's numbered markers and Phases 61-63's dash markers are
 *  handled by the same regex, so neither marker style silently loses items. Returns
 *  `{ notRepro: [{line, text}], referrals: [{line, text}] }`, `line` being the 1-based source line
 *  the item started on (used for the referral section's source anchor). */
function extractProseSubBlocks(fileText) {
    const lines = fileText.split('\n');
    const notRepro = [];
    const referrals = [];
    let mode = null;
    let currentList = null;
    let currentItem = null;
    let currentLine = null;

    const flush = () => {
        if (currentItem !== null) {
            const text = collapseWhitespace(currentItem);
            if (text.length) currentList.push({ line: currentLine, text });
        }
        currentItem = null;
    };

    lines.forEach((rawLine, idx) => {
        const lineNo = idx + 1;
        const trimmed = rawLine.trim();
        if (trimmed === '### Not-reproducible dispositions') {
            flush();
            mode = 'notrepro';
            currentList = notRepro;
            return;
        }
        if (trimmed === '### Cross-unit referrals' || trimmed === '### Cross-references') {
            flush();
            mode = 'referral';
            currentList = referrals;
            return;
        }
        if (/^#+\s/.test(trimmed)) {
            flush();
            mode = null;
            currentList = null;
            return;
        }
        if (!mode) return;
        const itemMatch = trimmed.match(/^(?:\d+\.|-|\*)\s+(.*)$/);
        if (itemMatch) {
            flush();
            currentItem = itemMatch[1];
            currentLine = lineNo;
        } else if (currentItem !== null && trimmed.length) {
            currentItem += ' ' + trimmed;
        }
    });
    flush();
    return { notRepro, referrals };
}

/** Run `extractProseSubBlocks` over all six COVERAGE files' already-loaded text, keyed by phase. */
function loadProseSubBlocks(phaseFileTexts) {
    const notRepro = {};
    const referrals = {};
    for (const phase of PHASES) {
        const { notRepro: nr, referrals: rf } = extractProseSubBlocks(phaseFileTexts[phase]);
        notRepro[phase] = nr;
        referrals[phase] = rf;
    }
    return { notRepro, referrals };
}

/** Hard-fail gate for the two prose-sub-block denominators (24 not-reproducible, 30 referrals),
 *  mirroring `assertCounts`'s honesty pattern: print the full derived breakdown to stderr and
 *  return false without emitting anything on any departure from the expected total or per-phase
 *  split — never silently adjusted. */
function assertProseSubBlockCounts(prose) {
    const nrCounts = {};
    const refCounts = {};
    let nrTotal = 0;
    let refTotal = 0;
    for (const phase of PHASES) {
        nrCounts[phase] = prose.notRepro[phase].length;
        refCounts[phase] = prose.referrals[phase].length;
        nrTotal += nrCounts[phase];
        refTotal += refCounts[phase];
    }
    process.stderr.write(
        `derived prose sub-blocks: not-reproducible total=${nrTotal} (${PHASES.map(p => `${p}=${nrCounts[p]}`).join(' ')}) ` +
        `| referrals total=${refTotal} (${PHASES.map(p => `${p}=${refCounts[p]}`).join(' ')})\n`
    );
    const problems = [];
    if (nrTotal !== EXPECTED_NOT_REPRODUCIBLE_TOTAL) problems.push(`not-reproducible total ${nrTotal} !== expected ${EXPECTED_NOT_REPRODUCIBLE_TOTAL}`);
    if (refTotal !== EXPECTED_REFERRAL_TOTAL) problems.push(`referral total ${refTotal} !== expected ${EXPECTED_REFERRAL_TOTAL}`);
    for (const p of PHASES) {
        if (nrCounts[p] !== EXPECTED_NOT_REPRODUCIBLE_SPLIT[p]) problems.push(`phase ${p} not-reproducible ${nrCounts[p]} !== expected ${EXPECTED_NOT_REPRODUCIBLE_SPLIT[p]}`);
        if (refCounts[p] !== EXPECTED_REFERRAL_SPLIT[p]) problems.push(`phase ${p} referral ${refCounts[p]} !== expected ${EXPECTED_REFERRAL_SPLIT[p]}`);
    }
    if (problems.length > 0) {
        process.stderr.write(
            'ERROR: derived prose sub-block counts departed from the expected denominator — treat as a finding, do not adjust silently.\n' +
            problems.map(p => `  - ${p}\n`).join('')
        );
        return false;
    }
    return true;
}

/** DOC-04's `already-covered` category: every corpus record whose `dedup:` field does not begin
 *  `none`, ordered by originating phase then finding ID like every other selection in this
 *  script. Currently 14 (11 major-refactor, 2 easy-fix, 1 wontfix — 68-CONTEXT.md's domain table). */
function alreadyCoveredRecords(records) {
    return records
        .filter(r => {
            const d = fullJoined(r.fields.dedup);
            return d.length > 0 && !d.startsWith('none');
        })
        .slice()
        .sort((a, b) => (a.phase !== b.phase ? a.phase - b.phase : a.id.localeCompare(b.id)));
}

/** `## Other Dispositions` §"Category reconciliation" (D-05): states, in prose, that the corpus's
 *  `disposition:` field carries three values rather than DOC-04's four named categories, and that
 *  two of those categories live outside that field — then the table with the four live counts. */
function renderCategoryReconciliation() {
    return `The corpus's \`disposition:\` field carries three values — \`major-refactor\`, \`easy-fix\` and
\`wontfix\` — not the four category names DOC-04 uses (\`duplicate\`, \`wontfix\`,
\`already-covered\`, \`not-reproducible\`). Two of DOC-04's categories live outside that field
entirely: \`not-reproducible\` is the six COVERAGE files' own \`### Not-reproducible dispositions\`
prose blocks, and \`already-covered\` is the non-\`none\` \`dedup:\` field annotations. This section
states that mapping plainly and carries the whole population each category points to, so no
category reads as populated when it is not — including the one that is genuinely empty.

### Category reconciliation

| DOC-04 category | Where it actually lives | Count |
|---|---|---|
| wontfix | \`disposition:\` field | 3 |
| not-reproducible | \`### Not-reproducible dispositions\` prose blocks | 24 |
| duplicate | nowhere — no finding was dropped as a duplicate | 0 |
| already-covered | non-\`none\` \`dedup:\` field annotations | 14 |
`;
}

/** `## Other Dispositions` §"wontfix" (D-05, D-09's Analog D): the 3 records whose
 *  `disposition:` field begins `wontfix`, each carrying its own recorded reasoning verbatim —
 *  `P64-D6-012`'s own text names Phase 68 as where it is documented, honoured as written rather
 *  than re-argued (68-CONTEXT.md `<specifics>`). Rendered as plain prose (no fenced ``` block),
 *  deliberately — the corpus record-extraction regexes key off a fenced block whose first field
 *  is `id:`/`row:`/`finding_id:`; fencing these entries would make `extractFencedBlocks` and the
 *  144/77 counts pick them up as if they were corpus records. */
function renderWontfixSection(selection) {
    const entries = selection.wontfix.map(rec => {
        const f = rec.fields;
        return `**\`${rec.id}\`** — unit: \`${joined(f.unit)}\`, location: \`${fullJoined(f.location)}\`, dimension: \`${joined(f.dimension)}\`, severity: \`${joined(f.severity)}\`.
> disposition: ${fullJoined(f.disposition)}`;
    }).join('\n\n');
    return `### wontfix

3 records whose \`disposition:\` field begins \`wontfix\` — the corpus's own zero-edit disposition —
transcribed with each record's own recorded reasoning carried verbatim rather than re-argued.

${entries}
`;
}

/** `## Other Dispositions` §"not-reproducible" (D-05, Analog E): the 24 items extracted from the
 *  six COVERAGE files' own `### Not-reproducible dispositions` prose blocks, grouped by
 *  originating phase and numbered continuously (1..24) so the section reads as one closed list.
 *  Phase 65's and Phase 66's zero-item groups each carry a written reason rather than an omitted
 *  heading (T-68-12). */
function renderNotReproducibleSection(prose) {
    const zeroReason = {
        65: 'Phase 65\'s `### Not-reproducible dispositions` blocks say "None" explicitly — roughly ' +
            '36 items enumerated during its sweep were settled by direct code trace rather than left ' +
            'open, so the zero here is a stated fact, not a missing section.',
        66: '`66-COVERAGE.md` carries no `### Not-reproducible dispositions` block at all — its 8 ' +
            "records left no candidate claim unresolved during the sweep."
    };
    const lines = [];
    let n = 0;
    for (const phase of PHASES) {
        const items = prose.notRepro[phase];
        lines.push(`**Phase ${phase} (${items.length} item${items.length === 1 ? '' : 's'}):**`, '');
        if (items.length === 0) {
            lines.push(zeroReason[phase] ?? 'No items were recorded in this phase\'s sweep.');
        } else {
            for (const item of items) {
                n++;
                lines.push(`${n}. ${item.text}`);
            }
        }
        lines.push('');
    }
    return `### not-reproducible

24 items extracted verbatim from the six COVERAGE files' own \`### Not-reproducible dispositions\`
prose sub-blocks (61→11, 62→4, 63→2, 64→7, 65→0, 66→0), grouped by originating phase and numbered
continuously, each keeping its source's own tier-failed / candidate-claim / reason-not-recorded
shape.

${lines.join('\n').trim()}
`;
}

/** `## Other Dispositions` §"duplicate" (D-05): the count is 0, stated in words with the RVW-07
 *  reason, rather than the category being omitted. */
function renderDuplicateSection() {
    return `### duplicate

**Count: 0.** RVW-07 required every finding to be checked against the 15 frozen open issues before
being recorded; where overlap existed it was annotated in-record as \`partial-overlap\` or
\`supersedes\` and the finding was still recorded — nothing was discarded for duplicating a tracker
entry. The category is written as a zero, with this reason, rather than omitted, because an omitted
category would read as an oversight rather than a checked, honest empty set.
`;
}

/** `## Other Dispositions` §"already-covered" (D-05): the 14 records whose `dedup:` field is not
 *  `none`, each naming the finding ID, that record's own disposition, and the `dedup:` text
 *  verbatim — the 14 split 11 major-refactor, 2 easy-fix, 1 wontfix, so a record can appear here
 *  and in its own document's own records without contradiction (stated explicitly, per the plan). */
function renderAlreadyCoveredSection(alreadyCovered) {
    const entries = alreadyCovered.map(rec => {
        const f = rec.fields;
        const dispToken = fullJoined(f.disposition).split(/\s+/)[0];
        return `**\`${rec.id}\`** (${dispToken}) — dedup: ${fullJoined(f.dedup)}`;
    }).join('\n\n');
    return `### already-covered

14 records whose \`dedup:\` field is not \`none\` — 11 \`major-refactor\`, 2 \`easy-fix\`
(\`P61-D2-015\`, \`P66-D2-001\`) and 1 \`wontfix\` (\`P66-D5-003\`). An entry here can also appear in
its own document's own records (\`EASY-FIXES.md\` or this document's \`## Records\` section) without
contradiction — the two facts, "this finding overlaps a tracker entry" and "this finding was still
recorded and dispositioned", are both true at once, and that overlap is stated here rather than left
for a reader to reconcile.

${entries}
`;
}

/** `## Other Dispositions` §"Cross-unit referrals and their resolution" (D-07, Analog F): the 30
 *  referrals extracted from the six COVERAGE files' own `### Cross-unit referrals` /
 *  `### Cross-references` prose blocks, each carrying its source phase/line anchor and an
 *  unfilled `resolution:` slot — plan `68-06` fills all 30; no resolution is guessed here. */
function renderReferralsSection(prose) {
    const zeroReason = {
        65: "Phase 65's four `### Cross-references` blocks hold prose cross-references — its " +
            '`P62-D1-002` CSP-nonce cross-reference is the example — rather than unit-to-unit ' +
            'handoffs, so they contribute zero enumerated referrals here; the zero is a shape ' +
            'difference, not a gap that went uncounted.',
        66: '`66-COVERAGE.md` carries no `### Cross-unit referrals` block — its own sweep referred ' +
            'nothing onward.'
    };
    const lines = [];
    let n = 0;
    for (const phase of PHASES) {
        const items = prose.referrals[phase];
        lines.push(`**Phase ${phase} (${items.length} referral${items.length === 1 ? '' : 's'}):**`, '');
        if (items.length === 0) {
            lines.push(zeroReason[phase] ?? 'No referrals were recorded in this phase\'s sweep.');
        } else {
            for (const item of items) {
                n++;
                lines.push(`${n}. **[from \`${phase}-COVERAGE.md:${item.line}\`]** ${item.text}`);
                lines.push(field('resolution', PLACEHOLDER_RESOLUTION));
            }
        }
        lines.push('');
    }
    return `### Cross-unit referrals and their resolution

30 referrals extracted verbatim from the six COVERAGE files' own \`### Cross-unit referrals\` /
\`### Cross-references\` prose blocks (61→12, 62→7, 63→1, 64→10, 65→0, 66→0), each carrying the
source phase and line anchor it came from and an unfilled \`resolution:\` slot — plan \`68-06\` fills
all 30. This is inside DOC-04's intent, not beyond it: a referral whose receiving unit recorded
nothing is exactly a finding dropped silently, which is what DOC-04 exists to prevent. A referral
that landed is \`already-covered\` with a citation; either way the reader can check it. No
resolution is guessed here — the whole point of D-07 is that guessing would hide a silent drop.

${lines.join('\n').trim()}
`;
}

/** Compose the full `## Other Dispositions` section (D-06's single home for DOC-04's population). */
function renderOtherDispositions(selection, prose, alreadyCovered) {
    return [
        '## Other Dispositions',
        '',
        renderCategoryReconciliation(),
        renderWontfixSection(selection),
        renderNotReproducibleSection(prose),
        renderDuplicateSection(),
        renderAlreadyCoveredSection(alreadyCovered),
        renderReferralsSection(prose)
    ].join('\n');
}

/** Splice a freshly rendered `## Other Dispositions` section into `existingText` (MAJOR-
 *  REFACTORS.md's current content), replacing any prior `## Other Dispositions` section (everything
 *  from that heading to EOF — it is always this document's last section) so re-running `emit-other
 *  --write` is idempotent rather than appending a second copy. */
function composeMajorWithOtherDispositions(existingText, otherSectionText) {
    const idx = existingText.indexOf('\n## Other Dispositions');
    const base = idx === -1 ? existingText.replace(/\n+$/, '') : existingText.slice(0, idx);
    return `${base}\n\n${otherSectionText}\n`;
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

Findings that are neither easy-fix nor major-refactor are recorded in \`MAJOR-REFACTORS.md\` §"Other Dispositions" (D-06) — 3 wontfix + 24 not-reproducible + 0 duplicate + 14 already-covered + 30 cross-unit referrals = 71 items; this document is not duplicated there.

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
    const selection = selectByDisposition(corpus.records);
    if (!assertCounts(selection)) {
        process.exitCode = 1;
        return;
    }

    let body, header, reconciliation, indexSection, targetPath, sectionHeading;
    if (kind === 'easy') {
        const applySetMap = loadApplySetMap();
        checkLedgerIdSetEquality(selection, applySetMap); // D-04: ledger is the content source, corpus is still the denominator (D-02)
        body = selection.easy.map((rec, i) => renderEasyRow(i + 1, rec, applySetMap)).join('\n\n');
        header = easyHeader();
        reconciliation = easyReconciliationText(selection, applySetMap);
        indexSection = `${easyIndexTable(selection, applySetMap)}\n\n`;
        sectionHeading = '## Rows';
        targetPath = EASY_PATH;
    } else {
        body = selection.major.map(rec => renderMajorBlock(rec, corpus.phaseFileTexts)).join('\n\n');
        header = majorHeader();
        reconciliation = majorReconciliationText(selection);
        indexSection = `${severityIndexTable(selection)}\n\n`;
        sectionHeading = '## Records';
        targetPath = MAJOR_PATH;
    }

    process.stdout.write(body + '\n');

    if (write) {
        writeAtomic(targetPath, `${header}${reconciliation}${indexSection}${sectionHeading}\n\n${body}\n`);
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
function checkDeterminism(selection, applySetMap, phaseFileTexts) {
    const easy1 = selection.easy.map((rec, i) => renderEasyRow(i + 1, rec, applySetMap)).join('\n\n');
    const easy2 = selection.easy.map((rec, i) => renderEasyRow(i + 1, rec, applySetMap)).join('\n\n');
    const major1 = selection.major.map(rec => renderMajorBlock(rec, phaseFileTexts)).join('\n\n');
    const major2 = selection.major.map(rec => renderMajorBlock(rec, phaseFileTexts)).join('\n\n');
    return { easyOk: easy1 === easy2, majorOk: major1 === major2 };
}

function runCheck() {
    let ok = true;
    const corpus = loadCorpus();
    const selection = selectByDisposition(corpus.records);
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
        const { easyOk, majorOk } = checkDeterminism(selection, applySetMap, corpus.phaseFileTexts);
        if (!easyOk || !majorOk) {
            console.log(`FAIL: determinism — easyOk=${easyOk} majorOk=${majorOk}`);
            ok = false;
        } else {
            console.log('PASS: determinism — two in-process renders of each emit produce identical strings');
        }
    }

    // --- 7b. Ledger/corpus ID-set equality (D-04) ---
    try {
        checkLedgerIdSetEquality(selection, applySetMap);
        console.log('PASS: 67-APPLY-SET.md finding-ID set equals the corpus easy-fix selection (D-04)');
    } catch (e) {
        console.log(`FAIL: ${e.message}`);
        ok = false;
    }

    // --- 7c. proposed_approach placeholder census equals the expected 26-ID no-named-edit set ---
    {
        const placeholderIds = majorBlocks
            .filter(f => fullJoined(f.proposed_approach).includes(PLACEHOLDER_APPROACH))
            .map(f => joined(f.id))
            .sort();
        const expected = [...EXPECTED_NO_NAMED_EDIT_IDS].sort();
        if (JSON.stringify(placeholderIds) !== JSON.stringify(expected)) {
            const missing = expected.filter(id => !placeholderIds.includes(id));
            const extra = placeholderIds.filter(id => !expected.includes(id));
            console.log(`FAIL: proposed_approach placeholder set (${placeholderIds.length}) does not equal the expected 26-ID no-named-edit set — missing: [${missing.join(', ')}]; extra: [${extra.join(', ')}]`);
            ok = false;
        } else {
            console.log(`PASS: exactly ${placeholderIds.length} blocks carry the approach placeholder marker, matching the expected no-named-edit ID set`);
        }
    }

    // --- 7d. proposed_labels area values are drawn only from INVENTORY's fifteen-label set ---
    {
        const outOfSet = [];
        for (const f of majorBlocks) {
            const labels = fullJoined(f.proposed_labels);
            const m = labels.match(/^area=([^;]+);/);
            const area = m ? m[1].trim() : null;
            if (!area || !AREA_LABELS.has(area)) outOfSet.push(`${joined(f.id)}: "${area}"`);
        }
        if (outOfSet.length) {
            console.log(`FAIL: proposed_labels area values outside the fifteen-label set — ${outOfSet.length} problem(s):`);
            for (const o of outOfSet) console.log(`  - ${o}`);
            ok = false;
        } else {
            console.log('PASS: every proposed_labels area value is drawn from INVENTORY\'s fifteen-label set');
        }
    }

    // --- 7e. Severity-sorted index (Task 3, D-10) ---
    {
        const idxMatch = majorText.match(/^## Index \(severity-sorted, for Phase 69 filing order\)\n([\s\S]*?)\n## Records/m);
        if (!idxMatch) {
            console.log('FAIL: MAJOR-REFACTORS.md is missing "## Index (severity-sorted, for Phase 69 filing order)" between Reconciliation and Records');
            ok = false;
        } else {
            const rows = idxMatch[1].split('\n').filter(l => /^\|\s*\d+\s*\|/.test(l));
            const parsed = rows.map(l => {
                const cells = l.split('|').map(c => c.trim()).filter((_, i) => i > 0);
                const [num, severity, prio, effort, id] = cells;
                return { num: Number(num), severity, prioNum: Number((prio.match(/\d+/) ?? ['9'])[0]), effort: Number(effort), id };
            });
            if (parsed.length !== EXPECTED_MAJOR_TOTAL) {
                console.log(`FAIL: severity-sorted index has ${parsed.length} rows, expected ${EXPECTED_MAJOR_TOTAL}`);
                ok = false;
            } else {
                const idxIds = new Set(parsed.map(r => r.id));
                const recIds = new Set(majorDocIds);
                const inIdxNotRec = [...idxIds].filter(id => !recIds.has(id));
                const inRecNotIdx = [...recIds].filter(id => !idxIds.has(id));
                if (inIdxNotRec.length || inRecNotIdx.length) {
                    console.log(`FAIL: severity index finding-ID set != record-block finding-ID set — in index not in records: [${inIdxNotRec.join(', ')}]; in records not in index: [${inRecNotIdx.join(', ')}]`);
                    ok = false;
                } else {
                    let sorted = true;
                    const idToPhase = new Map(selection.major.map(r => [r.id, r.phase]));
                    for (let i = 1; i < parsed.length; i++) {
                        const a = parsed[i - 1], b = parsed[i];
                        const key = x => [SEVERITY_RANK[x.severity], x.prioNum, x.effort, idToPhase.get(x.id) ?? 0, x.id];
                        const ka = key(a), kb = key(b);
                        let cmp = 0;
                        for (let k = 0; k < ka.length && cmp === 0; k++) {
                            if (typeof ka[k] === 'string') cmp = ka[k].localeCompare(kb[k]);
                            else cmp = ka[k] - kb[k];
                        }
                        if (cmp > 0) { sorted = false; break; }
                    }
                    if (!sorted) {
                        console.log('FAIL: severity-sorted index rows are not in non-decreasing order under the five-component sort key');
                        ok = false;
                    } else if (parsed[0].severity !== 'critical') {
                        console.log(`FAIL: severity-sorted index row 1 has severity "${parsed[0].severity}", expected "critical"`);
                        ok = false;
                    } else {
                        console.log('PASS: severity-sorted index has 144 rows, its finding-ID set matches the record blocks, and rows are sorted under the five-component key');
                    }
                }
            }
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
    } else if (command === 'emit-other') {
        runEmitOther({ force, write });
    } else if (command === 'check') {
        runCheck();
    } else {
        process.stderr.write('Usage: node derive-review-docs.mjs <emit-easy|emit-major|emit-other|check> [--force] [--write]\n');
        process.exitCode = 1;
    }
}

main();
