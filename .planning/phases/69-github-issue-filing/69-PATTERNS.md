# Phase 69: GitHub Issue Filing - Pattern Map

**Mapped:** 2026-08-19
**Files analyzed:** 5 (69-ISSUE-DRAFT.md, 69-FILING-LEDGER.md, MAJOR-REFACTORS.md write-back, gh issue/advisory calls, 69 close-out/summary docs)
**Analogs found:** 5 / 5

This phase creates **no application source files** and **no scripts by default** (D-13: inline `gh`
calls, not a committed script — the derive scripts below are read only as pattern sources, not to be
copied verbatim as deliverables). It creates/modifies exactly these artifacts:

1. `.planning/phases/69-github-issue-filing/69-ISSUE-DRAFT.md` — new, the approval artifact (D-05)
2. `.planning/phases/69-github-issue-filing/69-FILING-LEDGER.md` — new, crash-safe append ledger (D-14)
3. `.planning/reviews/MAJOR-REFACTORS.md` — modified in place, 144 `issue:` slots only (D-16)
4. `gh issue create` / `gh api .../security-advisories` calls — no file, tracker mutation
5. Phase close-out (`69-CLOSE-OUT.md` or similar, per project convention) — carve-out per D-17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `69-ISSUE-DRAFT.md` | planning-doc (rendered-output) | batch/transform (read 144 records → render bodies) | `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` | exact (same role: derived, mechanically-produced planning doc with an Index table and per-record blocks) |
| `69-FILING-LEDGER.md` | planning-doc (append ledger) | event-driven (append-per-create, crash-safe) | `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` `## Index` table + row-block shape | exact (identical "one row per unit of work, filled incrementally" pattern) |
| write-back into `MAJOR-REFACTORS.md` (`issue:` field only) | targeted-field-mutator | batch/transform (in-place field edit, regeneration-guard aware) | `.planning/phases/68-deliverable-documents/derive-review-docs.mjs` (`checkRegenerationGuard`, `issue:` line regex) | exact (same file, same field, same guard concern) |
| `gh issue create` calls (public issues) | CLI-invocation / event-driven tracker write | request-response (one call per issue, title+body+labels) | No prior `gh issue create` call exists in this repo (verified — see below); pattern must be assembled from `gh` CLI conventions + D-09/D-10/D-11 field mapping | no analog (documented in "No Analog Found") |
| `gh api .../security-advisories` calls (draft advisories) | CLI-invocation / event-driven tracker write | request-response (one call per advisory, JSON body) | No prior use in this repo | no analog |
| record-block parsing (144 `id:`/`proposed_labels:`/etc. blocks) | parser/transform | batch | `.planning/phases/67-apply-easy-fixes/derive-apply-set.mjs` (`extractRecords`, `parseFields`) | exact (identical fenced-block field-parsing shape, same corpus) |

## Pattern Assignments

### `69-ISSUE-DRAFT.md` (planning-doc, batch/transform)

**Analog:** `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md`

**Document shape** (whole file — read via `Read` at `/home/coder/repos/bbj-language-server/.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md`):
- `# Phase NN <Title>` heading
- `## Derivation` — states the mechanical selection rule and where the script that produced it lives (even though 69's draft is not script-produced, this section should state *how* the 144→135+9 split and filing order were derived, referencing `## Index (severity-sorted...)` in `MAJOR-REFACTORS.md`)
- `## Reconciliation` — arithmetic connecting counts (mirror for 69: 144 = 135 public + 9 advisory; 17 wave-1 = 9 advisories + 8 issues; explicit exclusions/groupings argued in writing, per D-08's dedup-annotation carry-forward and D-03's D1 grouping)
- `## Index` — a `| # | finding_id | verdict | ... |` table, one row per unit of work, in filing order

For 69 specifically, adapt the `## Index` table columns to: `| # | finding_id | route (issue/advisory) | title | labels |` and follow it with the full rendered bodies in filing order (D-05 requires every body rendered in full, not just indexed).

**Reconciliation-writing pattern** (67-APPLY-SET.md lines ~17-27): state each derived count as an
equation with the excluded/merged items named individually — do not just state a final total. Apply
this to 69's 144 → 135/9 split and to the D-08 (11 dedup-annotated) and D-03 (33 D1, 24 medium/low
grouped) callouts.

---

### `69-FILING-LEDGER.md` (append ledger, event-driven)

**Analog:** `67-APPLY-SET.md` `## Index` table + fenced row-block shape, and `derive-apply-set.mjs`'s `renderRow()`

**Row-block shape to copy** (`.planning/phases/67-apply-easy-fixes/derive-apply-set.mjs`, `renderRow()`):
```javascript
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
    ...
    `commit:            TBD`,
    `notes:             TBD`,
    '```'
].join('\n');
```
Adapt field names per D-14's row shape: one row per created entry, fields `finding_id`, `issue number
or GHSA ID`, `timestamp` — appended immediately after each create, before the next is attempted. Use
the same fixed-width `label:            value` alignment convention (label padded to ~19 chars) seen
throughout `MAJOR-REFACTORS.md` and `67-APPLY-SET.md` record blocks — this is the project's
established field-block convention, not just this one file's.

**Index-table pattern** (`67-APPLY-SET.md` `## Index`, e.g.):
```
| # | finding_id | verdict | commit |
|---|---|---|---|
| 1 | P61-D2-001 | applied | 38fe1d1 (red) + 59dc2be (green) |
```
For 69: `| # | finding_id | issue/GHSA | timestamp |`.

---

### Write-back into `MAJOR-REFACTORS.md` (`issue:` field only)

**Analog:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`

**Regeneration-guard pattern to respect (read-only reference, do NOT invoke this script per D-16)** —
`checkRegenerationGuard()` (around line 1232):
```javascript
function checkRegenerationGuard(force) {
    if (force) return { blocked: false };
    // ... scans for any `issue:` line with non-empty value; if found, blocks with:
    // '`issue:` value — Phase 69 has filed issue numbers into this document under ISSUE-05, and '
    // 'regenerating would clobber them. Pass --force to override.\n'
}
```
This confirms the exact `issue:` line regex already anticipated by Phase 68: `/^issue: *(.*)$/` (line
~1237). Phase 69's write-back tool (if scripted at all — D-16 allows either a small helper or manual
edits) must target only lines matching this regex inside the 144 fenced record blocks, using the same
`readFileSync` → string `replace` → `writeFileSync` (with `renameSync`/`existsSync` for atomic
temp-file write, lines ~45, ~982-990) approach `derive-review-docs.mjs` itself uses — but must NOT
call `derive-review-docs.mjs` and must NOT pass `--force` (D-16 is explicit: this phase does not run
that script at all).

**Record block field shape** (`.planning/reviews/MAJOR-REFACTORS.md`, e.g. lines 261-279 for
`P61-D1-001`):
```
id:                P61-D1-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:116-120
dimension:         D1
...
proposed_labels:   area=vscode; PRIO 2; effort 2
issue:
```
The `issue:` line is the last field in every block, currently blank after the colon+padding. The
write-back must preserve the padding convention and append the value on the same line (e.g.
`issue:             #512` or `issue:             GHSA-xxxx-xxxx-xxxx (draft advisory)` per D-15).

---

### `gh issue create` / `gh api .../security-advisories` calls

**No analog found in this repository.** Confirmed via `grep -rn "gh issue create\|gh api" .github/
.planning` — the only prior `gh` usage in the repo is `gh release create` in
`.github/workflows/manual-release.yml:172`, which is a release-tagging call, not an issue/advisory
create and offers no reusable body/label pattern.

**Field mapping to use instead (derived from CONTEXT.md decisions, not from an existing call site):**
- Title: `gh issue create --title "<area>: <problem>"` — D-10, e.g. `vscode: bbjcpl binary path from workspace-settable bbj.home is spawned without validation`
- Labels: `--label` three times, values parsed mechanically from `proposed_labels:` (never
  `effort:`/`severity:`) per D-09, shape `area=<X>; PRIO <N>; effort <N>` — split on `;` and strip
  the `area=` prefix to get the bare area label; `PRIO <N>` and `<N>` (bare digit) are used as-is.
- Body: `--body` (or `--body-file` for a rendered `.md` body, preferable given multi-paragraph
  content) built from `location:` (evidence), `failure_scenario:` (verbatim), `proposed_approach:`
  (verbatim), plus the one authored field, acceptance criteria (D-12's derivation rule), plus one
  traceability line naming the finding ID (D-11).
- Advisories: `gh api --method POST /repos/BBx-Kitchen/bbj-language-server/security-advisories`
  with a JSON body (`-f`/`--input -` conventions) — no labels (advisories carry none, D-17), same
  body-content fields as issues.

## Shared Patterns

### Fenced record-block parsing
**Source:** `.planning/phases/67-apply-easy-fixes/derive-apply-set.mjs`, functions `extractRecords`
and `parseFields`
```javascript
function extractRecords(fileText) {
    const records = [];
    const fenceRe = /```\n(id: *P\d+-D\d+-\d+[\s\S]*?)\n```/g;
    let match;
    while ((match = fenceRe.exec(fileText)) !== null) {
        records.push(match[1]);
    }
    return records;
}
```
**Apply to:** any step that reads `MAJOR-REFACTORS.md`'s 144 records to build the draft, the dedup
check, or the write-back. This regex is the exact, already-proven way to isolate one record block;
reuse it rather than re-deriving a parser.

### Derived-denominator / reconciliation writing
**Source:** `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` `## Reconciliation`
**Apply to:** `69-ISSUE-DRAFT.md`'s own accounting section — state the selection rule, the count, and
argue every exclusion/grouping in writing (144 = 135 + 9; 17 = 9 + 8; 11 dedup-annotated carried not
skipped; 33 D1 grouped under one heading). Matches the project-wide "derived-denominator pattern"
named in `69-CONTEXT.md`'s `<code_context>`.

### Regeneration-guard respect
**Source:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`, `checkRegenerationGuard()`
**Apply to:** the write-back step only — confirms the exact `issue:` line format this phase must
produce and the reason `derive-review-docs.mjs` itself must never be invoked by this phase.

### Fixed-width field-block formatting
**Source:** every record block in `.planning/reviews/MAJOR-REFACTORS.md` and every row block in
`.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` (`label:` padded to align values, e.g.
`row:               1`, `finding_id:        P61-D2-001`)
**Apply to:** `69-FILING-LEDGER.md` row blocks and any new field appended to `MAJOR-REFACTORS.md`'s
`issue:` line — keep the existing padding width so the file's monospace alignment isn't broken.

## No Analog Found

| File / Call | Role | Data Flow | Reason |
|---|---|---|---|
| `gh issue create ...` | CLI-invocation | request-response | No prior `gh issue create` or `gh api .../issues` call exists anywhere in the repo (`.github/workflows`, `.planning`, scripts) — only `gh release create` exists, which shares no body/label shape with an issue. Pattern assembled directly from CONTEXT.md D-09/D-10/D-11 field mapping instead. |
| `gh api .../security-advisories` ... | CLI-invocation | request-response | No prior use of the GitHub security-advisories API anywhere in the repo. Pattern assembled directly from CONTEXT.md D-01/D-17. |
| Dedup re-query (`gh issue list --state all` / equivalent) | CLI-invocation | read/batch | No prior scripted `gh issue list` call exists; CONTEXT.md records the one-off manual query result (19 open issues) but not a reusable invocation pattern. Use the same `--state open`/`--state all` flag shape informally confirmed in CONTEXT.md's "The tracker, measured" section. |

## Metadata

**Analog search scope:** `.planning/phases/67-apply-easy-fixes/`, `.planning/phases/68-deliverable-documents/`, `.planning/reviews/MAJOR-REFACTORS.md`, `.github/workflows/`, repo root for any `gh` script usage.
**Files scanned:** `67-APPLY-SET.md`, `derive-apply-set.mjs`, `derive-review-docs.mjs`, `MAJOR-REFACTORS.md` (record-block region), `.github/workflows/manual-release.yml`, `.github/workflows/*` (grep for `gh `), `.planning/phases/69-github-issue-filing/69-CONTEXT.md`.
**Pattern extraction date:** 2026-08-19
