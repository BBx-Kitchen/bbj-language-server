# Phase 61: Language Core Review - Pattern Map

**Mapped:** 2026-08-17
**Phase type:** review sweep (no production source is created or modified — see 61-CONTEXT.md
`<domain>`). The only artifact this phase writes is `.planning/reviews/61-COVERAGE.md`.
**Files analyzed (review targets):** 53 hand-written files under `bbj-vscode/src/language/`
(verified on disk; matches INVENTORY.md's per-unit tables and 61-CONTEXT.md's "53 files" count)
**Analogs found:** 1 primary artifact analog (Phase 60's INVENTORY.md / RU-62-04 worked example) —
this phase does not have "new file vs. existing file" analog pairs in the normal sense, because
its own deliverable is a review record, not source code.

## Why this phase does not fit the standard File Classification table

The standard pattern-mapper output (`new file -> closest analog source file`) does not apply here:
Phase 61 creates zero `.ts`/`.langium` files. Its single deliverable,
`.planning/reviews/61-COVERAGE.md`, is a **planning artifact**, not application code. The
correct analog is therefore the **artifact Phase 60 already produced in the same family**
(INVENTORY.md) and, within it, the **one review unit Phase 60 worked end-to-end as a template**
(`RU-62-04`). Below: (1) the artifact-level pattern to copy, (2) the classification of the 53
review-target files into the 7 review units so the planner can slice plans, and (3) the shared
recording conventions every plan's finding records must follow.

## Artifact Pattern Assignment

### `.planning/reviews/61-COVERAGE.md` (new artifact this phase creates)

**Analog:** `.planning/reviews/INVENTORY.md` (Phase 60, `.planning/phases/60-baseline-resync-review-standards/`)
— specifically its `## Finding Record Template` section (lines 136-159) and its one fully worked
review unit, `RU-62-04` (lines 173-263).

**Finding Record Template to copy verbatim (field shape)** — INVENTORY.md lines 141-155:
```
id:                <P{phase}-D{dimension}-{seq}> — required, see 3a
unit:              <RU-{phase}-{seq}> — required, the review unit this finding belongs to
location:           path:line — required (RVW-06, DOC-01, DOC-02, ISSUE-02)
dimension:         <D1..D8> — required, the primary dimension
secondary:         [<D1..D8>, ...] — optional, other dimensions this finding also violates
severity:          <critical|high|medium|low> — required
evidence_tier:     <repro|trace|inherited> — required, per 3b, the stricter tier if `secondary` is set
evidence:          <the reproduction, or the line-by-line trace> — required
failure_scenario:  <inputs/state -> wrong behaviour> — required
classification:    <easy|major> — required, with the six D-13 tests recorded pass/fail
effort:            <2|4|8> — required
dedup:             <none | #NNN duplicate | #NNN partial-overlap — <what this adds>> — required, never blank, checked against the Frozen Open-Issue Snapshot above
disposition:       <easy-fix|major-refactor|duplicate|wontfix|already-covered|not-reproducible> — required; a reason is required for the last four
```

**Worked example to model each cell/finding on** — INVENTORY.md lines 191-262 (`RU-62-04`
applicability table with a written reason per dimension, one file-exception row, dedup-neighbour
prose, and the fully filled `P00-D1-001` template finding, including the D-13 six-test
classification trace and the D-12 public-repo redaction note for a `high`-severity D1 finding).
This is the shape plan `61-01` must reproduce for `RU-61-06`, per 61-CONTEXT.md D-01/D-05.

**Applicability-grid vocabulary to copy** — INVENTORY.md lines 168-171: exactly two legal cell
values, `applies` or `n/a — <written reason>`; a blank cell is a defect. Grid header shape
(`Unit | D1 | ... | D8`) at INVENTORY.md lines ~794-800 for the 7 Phase 61 unit rows and
~824-827 for the 4 `.bbl` file-exception rows.

**Close-out/SUMMARY pattern** — `.planning/phases/60-baseline-resync-review-standards/60-01-SUMMARY.md`
shows how a tracer-plan close-out documents: task-by-task commit trail, a `checkpoint:decision`
resolution recorded verbatim (mirrors 61-CONTEXT.md D-05's format-only checkpoint), and a
"Self-Check / Verification" section re-running the plan's `<verify>` blocks read-only against the
committed artifact rather than re-executing tasks. Use this as the summary-writing analog for each
`61-0N-SUMMARY.md`.

## Review-Target File Classification (the 53 files under review, grouped into the 7 units)

These are not files to create — they are the sweep's **subjects**. Grouping them lets the planner
balance the 7 per-unit plans (`61-01`..`61-07`) called for by 61-CONTEXT.md D-01/D-02. Counts and
paths verified directly on disk against INVENTORY.md's per-unit tables.

| Unit | Role grouping | Data flow | File count | Total LOC | Risk rank |
|---|---|---|---|---|---|
| `RU-61-06` — Java interop client | service/client (external process boundary) | event-driven, request-response (JSON-RPC over socket) | 4 | 1,255 | 1 |
| `RU-61-01` — Grammar & lexing | grammar/lexer | transform (text -> tokens/AST) | 5 | 1,340 | 2 |
| `RU-61-03` — Validation & BBjCPL diagnostics | validation/compiler-integration | transform, event-driven (diagnostics), file-I/O (spawns external CPL process) | 8 | 2,542 | 3 |
| `RU-61-02` — Scope, linking & type inference | scoping/linking/type-inference | transform, CRUD-like (symbol resolution) | 8 | 1,601 | 4 |
| `RU-61-04` — LSP feature providers | LSP providers (controller-analog) | request-response (LSP requests) | 11 | 1,825 | 5 |
| `RU-61-05` — Server lifecycle, DI wiring & workspace management | config/bootstrap/workspace lifecycle | event-driven, batch (workspace scans) | 9 | 1,433 | 6 |
| `RU-61-07` — Builtin catalogs | static data/model catalogs | batch (mechanical `.ts`/`.bbl` diff), CRUD-adjacent (static lookup tables) | 8 (4 `.ts` + 4 `.bbl` pairs) | 3,752 | 7 |
| **Total** | | | **53** | **13,748** | |

**Per-unit file lists (verified with `find`/`ls` against `bbj-vscode/src/language/`):**

- **RU-61-06** (java-interop client): `java-interop.ts`, `java-javadoc.ts`, `lib/bbj-api.ts`, `lib/fs-provider.ts`
- **RU-61-01** (grammar & lexing): `bbj.langium`, `java-types.langium`, `bbj-lexer.ts`, `bbj-token-builder.ts`, `bbj-value-converter.ts`
- **RU-61-03** (validation & BBjCPL): `bbj-validator.ts`, `bbj-document-validator.ts`, `validations/check-classes.ts`, `validations/check-function-calls.ts`, `validations/check-variable-scoping.ts`, `validations/line-break-validation.ts`, `bbj-cpl-service.ts`, `bbj-cpl-parser.ts`
- **RU-61-02** (scope/linking/type inference): `bbj-scope.ts`, `bbj-scope-local.ts`, `bbj-linker.ts`, `bbj-index-manager.ts`, `bbj-nodedescription-provider.ts`, `bbj-type-inferer.ts`, `bbj-overload-selector.ts`, `assertions.ts`
- **RU-61-04** (LSP feature providers): `bbj-completion-provider.ts`, `bbj-hover.ts`, `bbj-signature-help-provider.ts`, `bbj-definition-provider.ts`, `bbj-document-symbol-provider.ts`, `bbj-semantic-token-provider.ts`, `bbj-inlay-hint-provider.ts`, `bbj-code-action-provider.ts`, `bbj-comment-provider.ts`, `bbj-node-kind.ts`, `bbj-use-insert.ts`
- **RU-61-05** (server lifecycle/DI/workspace): `main.ts`, `bbj-module.ts`, `bbj-ws-manager.ts`, `bbj-document-builder.ts`, `bbj-notifications.ts`, `logger.ts`, `constants.ts`, `utils.ts`, `composer-commands.ts`
- **RU-61-07** (builtin catalogs): `lib/events.ts`, `lib/functions.ts`, `lib/labels.ts`, `lib/variables.ts`, `lib/events.bbl`, `lib/functions.bbl`, `lib/labels.bbl`, `lib/variables.bbl`

`java-interop/` (the Java service itself) is explicitly excluded from all `location:` fields per
D-13 — reference-reading only, no finding may be anchored there.

## Shared Patterns (apply to every one of the 7 unit plans)

### Finding-ID allocation
**Source:** INVENTORY.md §3a (lines 61-83)
**Apply to:** every finding recorded by every plan
```
P{phase}-D{dimension}-{seq}, zero-padded to 3 digits, monotonic per (phase, dimension) pair.
Phase 00 reserved for template illustrations (never allocate a real P00-* finding).
```

### Evidence tiers
**Source:** INVENTORY.md §3b (lines 84-101); 61-CONTEXT.md D-07/D-11/D-12
**Apply to:** Task A (D1/D2/D3, tier `repro`) vs. Task B (D4/D5/D8, tier `trace`) split within
each unit plan. D1 findings rated `critical`/`high` additionally require a runnable repro
(D-11) and get the two-tier public-disclosure redaction (D-12): surface + problem class only,
no trigger sequence, no payload — model the redaction on INVENTORY.md's `P00-D1-001` example
(lines 260-263).

### Easy-vs-major classification (six-test gate)
**Source:** INVENTORY.md §3c (lines 102-120), demonstrated in `P00-D1-001` (lines 247-252)
**Apply to:** every finding's `classification:` field — record pass/fail for all 6 tests; a
`critical`/`high` D1 finding is forced `major` regardless of the other five.

### Applicability-grid cell writing (`pass` line phrasing)
**Source:** 61-CONTEXT.md D-06; INVENTORY.md's `n/a` reason style (lines 833-851)
**Apply to:** every no-finding `applies` cell — write a sentence naming the concrete checks
applied against that dimension's own "what counts as a finding" wording in REQUIREMENTS.md, not
a bare `pass`. `n/a` reasons for D6/D7 are carried forward **verbatim** from INVENTORY.md lines
842-851 (R-D6-CENTRAL, R-D7-SHARED-LS) — do not re-derive or reword them.

### Skeleton ownership / append discipline
**Source:** 61-CONTEXT.md D-03/D-04
**Apply to:** plan `61-01` creates the full `61-COVERAGE.md` skeleton (grid header + 7 stubbed
unit sections + all 38 verbatim `n/a` reasons) and fills only its own `RU-61-06` section; plans
`61-02`..`61-07` each fill exactly one section and touch nothing else. Wave-serialized via
`depends_on` chaining in D-02's risk-rank order — no same-wave concurrency on this file.

## No Analog Found

| Item | Reason |
|---|---|
| RU-61-07 mechanical D2/D4 diff method | No prior phase performed a programmatic `.ts`-vs-`.bbl` diff sweep; 61-CONTEXT.md D-08 leaves the sampling protocol size/source to planner discretion — no existing script analog in the repo to copy. |
| SEC-06 trust-boundary narrative subsection | INVENTORY.md's RU-62-04 worked example has no equivalent narrative trust-boundary subsection (that unit is D6 n/a, not a network boundary); 61-CONTEXT.md D-10 narrative shape (what the peer controls / auth posture / malicious-vs-unresponsive behavior) has no prior written instance in `.planning/reviews/` to copy from — the planner should originate this section's structure from D-10's prose description itself. |

## Metadata

**Analog search scope:** `.planning/phases/60-baseline-resync-review-standards/`,
`.planning/reviews/INVENTORY.md`, `bbj-vscode/src/language/` (file inventory verification only,
read-only, no content review performed by this mapper — that is Phase 61's own job)
**Files scanned:** 53 review-target files (verified via `find`/`ls`) + 1 artifact analog
(INVENTORY.md, 502 lines) + 1 summary analog (60-01-SUMMARY.md)
**Pattern extraction date:** 2026-08-17
