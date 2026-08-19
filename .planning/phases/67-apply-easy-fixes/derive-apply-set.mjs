#!/usr/bin/env node
// Phase 67 D-01: mechanically derive the 77-row easy-fix apply set from the six closed
// COVERAGE files. Run as `node derive-apply-set.mjs` from this directory (or anywhere — paths
// are resolved relative to this script's own location, not the invocation cwd).
//
// Reads .planning/reviews/{61,62,63,64,65,66}-COVERAGE.md ONLY, selects every finding record
// whose `disposition:` field begins `easy-fix`, and emits one ledger row block per selected
// record — in the exact field shape defined by 67-01-PLAN.md's <ledger_row_shape> — ordered by
// originating phase then finding ID. It fills only the mechanically-derivable fields (row,
// finding_id, unit, location, dimension, severity, effort, and the first three lines of the
// record's own failure_scenario field); every judgement field is written as TBD for a human/
// downstream step to fill.
//
// Exits non-zero (after printing the selection breakdown to stderr) unless the total is exactly
// 77 and the per-phase split is exactly 61=44 62=14 63=10 64=8 65=0 66=1 — CONTEXT.md's
// "Specific Ideas" section states a different number must be treated as a finding, not silently
// accepted.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REVIEWS_DIR = join(SCRIPT_DIR, '..', '..', 'reviews');

// Phase order fixed here (not alphabetical/numeric-sorted at runtime) so the expected split
// below stays legible next to the phase list it describes.
const PHASES = [61, 62, 63, 64, 65, 66];
const EXPECTED_SPLIT = { 61: 44, 62: 14, 63: 10, 64: 8, 65: 0, 66: 1 };
const EXPECTED_TOTAL = 77;

/** Split a COVERAGE file's raw text into fenced ```...``` record blocks whose first
 *  non-empty line is an `id:` field naming a finding ID (P<phase>-D<dim>-<seq>). */
function extractRecords(fileText) {
    const records = [];
    const fenceRe = /```\n(id: *P\d+-D\d+-\d+[\s\S]*?)\n```/g;
    let match;
    while ((match = fenceRe.exec(fileText)) !== null) {
        records.push(match[1]);
    }
    return records;
}

/** Parse a record block's text into a map of field name -> array of raw lines (the first
 *  line's post-colon remainder, then each indented continuation line, in original order). */
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

function joined(fieldLines) {
    return (fieldLines ?? []).map(l => l.trim()).filter(Boolean).join(' ').trim();
}

function firstThreeLines(fieldLines) {
    return (fieldLines ?? []).slice(0, 3).map(l => l.trim()).filter(Boolean).join(' ').trim();
}

function renderRow(rowNumber, fields, phase) {
    const id = joined(fields.id);
    const unit = joined(fields.unit);
    const location = joined(fields.location);
    const dimension = joined(fields.dimension);
    const severity = joined(fields.severity);
    const effort = joined(fields.effort);
    const failureScenario = firstThreeLines(fields.failure_scenario);

    return [
        '```',
        `row:               ${rowNumber}`,
        `finding_id:        ${id}`,
        `unit:              ${unit}`,
        `location:          ${location}`,
        `dimension:         ${dimension}`,
        `severity:          ${severity}`,
        `effort:            ${effort}`,
        `verdict:           TBD`,
        `test_required:     TBD`,
        `fail_before:       TBD`,
        `failure_scenario:  ${failureScenario}`,
        `fix_applied:       TBD`,
        `user_facing:       TBD`,
        `verification:      TBD`,
        `commit:            TBD`,
        `notes:             TBD`,
        '```'
    ].join('\n');
}

function main() {
    const selected = []; // { phase, id, fields }
    const perPhaseCounts = {};

    for (const phase of PHASES) {
        const filePath = join(REVIEWS_DIR, `${phase}-COVERAGE.md`);
        const text = readFileSync(filePath, 'utf8');
        const records = extractRecords(text);
        let count = 0;
        for (const block of records) {
            const fields = parseFields(block);
            const disposition = joined(fields.disposition);
            if (disposition.startsWith('easy-fix')) {
                selected.push({ phase, id: joined(fields.id), fields });
                count++;
            }
        }
        perPhaseCounts[phase] = count;
    }

    // Order by originating phase (PHASES order, already ascending), then finding ID
    // (lexicographic sort is safe: dimension is a single digit, seq is fixed-width 3 digits).
    selected.sort((a, b) => {
        if (a.phase !== b.phase) return a.phase - b.phase;
        return a.id.localeCompare(b.id);
    });

    const total = selected.length;

    const splitStr = PHASES.map(p => `${p}=${perPhaseCounts[p]}`).join(' ');
    process.stderr.write(`${splitStr} total=${total}\n`);

    const splitOk = PHASES.every(p => perPhaseCounts[p] === EXPECTED_SPLIT[p]);
    if (total !== EXPECTED_TOTAL || !splitOk) {
        process.stderr.write(
            `ERROR: expected total=${EXPECTED_TOTAL} and split ${PHASES.map(p => `${p}=${EXPECTED_SPLIT[p]}`).join(' ')}, ` +
            `got total=${total} and split ${splitStr} — treat as a finding, do not adjust silently.\n`
        );
        process.exitCode = 1;
        return;
    }

    const output = selected
        .map((rec, index) => renderRow(index + 1, rec.fields, rec.phase))
        .join('\n\n');
    process.stdout.write(output + '\n');
}

main();
