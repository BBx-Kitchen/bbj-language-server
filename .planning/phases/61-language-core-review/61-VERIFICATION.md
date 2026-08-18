---
phase: 61-language-core-review
verified: 2026-08-18T05:32:26Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 61: Language Core Review Verification Report

**Phase Goal:** Every hand-written file in `bbj-vscode/src/language/` — the largest and most
structurally critical module (~10.8k LOC across ~49 files; 53 files / 13,748 LOC verified on disk)
— is swept across all 8 dimensions, including the trust boundary of its java-interop client.

**Verified:** 2026-08-18T05:32:26Z
**Status:** passed
**Re-verification:** No — initial verification

This is a code-review sweep phase. Its sole deliverable is `.planning/reviews/61-COVERAGE.md`
(3,329 lines). No source file was modified — confirmed correct, not a gap (see Anti-Patterns
section). Verification below re-derives every load-bearing claim from the codebase rather than
trusting SUMMARY.md or the coverage file's own self-reported counts.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria 1-4)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 53 hand-written files in `bbj-vscode/src/language/` have a recorded pass/fail against every applicable D1-D8 cell | ✓ VERIFIED | Independently re-ran the file enumeration (`ls .../language/*.ts .../*.langium .../validations/*.ts .../lib/*`) → 53 basenames, all 53 confirmed present in `61-COVERAGE.md` by direct grep (0 missing). All 7 unit sections + 4 `.bbl` file-exception rows present with `### Cells` blocks; 0 occurrences of the literal `pending` placeholder marker remain. |
| 2 | `java-interop.ts`'s trust boundary is documented — peer capabilities, auth posture, malicious/unresponsive-peer behavior | ✓ VERIFIED | `### SEC-06 Trust Boundary` subsection (lines 124-143) answers all 6 named questions (peer control, auth posture, destination configurability, malicious-answering-peer behavior, unresponsive-peer behavior at each timeout, blast radius). Spot-checked evidence against source: `interopPort = port \|\| 5008` at `java-interop.ts:118`, `socket.connect(this.interopPort, this.interopHost)` at line 140, 10s connect timeout at lines 127-131 — all match exactly. |
| 3 | Every recorded finding carries `file:line`, dimension, and a verified failure scenario | ✓ VERIFIED | All 73 findings carry all 12 required fields (`id/unit/location/dimension/severity/evidence_tier/evidence/failure_scenario/classification/effort/dedup/disposition`), each occurring exactly 73 times — verified by independent grep count, not the coverage file's own self-report. Spot-checked 6 findings' `file:line` anchors against real source across 4 different units (`java-interop.ts:118/140`, `bbj-cpl-service.ts:82-155/228-235`, `bbj-ws-manager.ts:107-241`, `bbj-document-builder.ts:303-317`, `lib/events.ts:57,528,62,533`) — every anchor pointed at exactly the code the finding described. The one `critical`/`high` D1 finding (`P61-D1-003`, bbjcpl spawn-path validation) correctly states a runnable reproduction was built and run while withholding the trigger sequence per D-11/D-12. |
| 4 | Every recorded finding has been checked against the 15 open GitHub issues for duplication | ✓ VERIFIED | 0 blank `dedup:` fields across all 73 findings (independent grep). The specific "plausible neighbour" issues each plan's must_haves named (#83, #90, #466, #108, #475, #33, #231, #385, #485, #486) are all explicitly checked with substantive per-issue reasoning in the relevant unit's findings. 6 findings resolve to a named partial-overlap or DEBT cross-reference with full reasoning; the remaining findings (mostly narrow internal-implementation defects — e.g. a missing `??=` guard, an unreset cache field) carry `dedup: none` without elaboration, which is defensible given none plausibly overlaps a user-facing tracker issue, but is worth noting as the one place where evidence quality varies (see Anti-Patterns). |

**Score:** 4/4 ROADMAP success criteria verified.

### Additional Must-Haves (from PLAN frontmatter, merged across 7 plans)

| # | Must-have | Status | Evidence |
|---|-----------|--------|----------|
| 5 | D-17 hard countable gate: 50 `applies` / 38 `n/a` / 88 total, re-derived from INVENTORY at close | ✓ VERIFIED | Independently re-ran the exact `awk` pass over `INVENTORY.md` → `50 38 88`. Independently re-ran the 3 grep-based internal counts over `61-COVERAGE.md` → `50` verdicts / `38` n/a carry-forwards / `88` cell lines. Both match the coverage file's own stated verdict. |
| 6 | Cross-unit referrals: none silently dropped | ✓ VERIFIED | Read all 7 units' `### Cross-unit referrals` blocks directly. 12 referrals issued across the phase; traced each to its target unit's resolution (promoted to a new finding, or dismissed with a written reason) — e.g. `RU-61-06`'s referral on `interopHost`/`interopPort` validation → promoted as `P61-D1-006` in `RU-61-05`; `RU-61-02`'s prefix-path-traversal candidate → promoted as `P61-D1-008` with a direct `path.resolve()` reproduction, confirmed against `bbj-document-builder.ts:303-317`. |
| 7 | 5-row spec-less edge-probe ledger (RVW-01 adjacency/empty/ordering; SEC-06 boundary/precision), no silent drops | ✓ VERIFIED | Every plan's must_haves carries all 5 `EDGE-PROBE` rows, each translated into a concrete per-unit check (documented in PLAN frontmatter and exercised in the corresponding `### Cells` prose — e.g. RU-61-02's adjacency probe → overload-selection tie-breaking check; RU-61-05's empty probe → zero-workspace-folder/empty-`initializationOptions` checks). Row 5 (SEC-06/precision) is dismissed with a written reason in every plan (no rounding/tie-breaking referent in a review sweep), with its one numerically-shaped remnant (interopPort coercion) folded into the boundary row and recorded twice (RU-61-06 client side, RU-61-05 input side) rather than dropped. |
| 8 | No source file under `bbj-vscode/`, `bbj-intellij/`, or `java-interop/` modified; `INVENTORY.md` immutable | ✓ VERIFIED | `git diff --stat` between the recorded sweep SHA (`62b1e7150b91eadf6300db62103ef638c41ab25c`) and current HEAD shows zero changes under `bbj-vscode/src/language/` or `java-interop/`. `git log --oneline` across the whole phase's commit range shows zero commits touching `bbj-vscode/src`, `java-interop/`, or `bbj-intellij/` — all 14 commits are `docs`/`feat` commits to `.planning/reviews/61-COVERAGE.md` and `.planning/BACKLOG.md` only. `INVENTORY.md` untouched (confirmed same file used for the D-17 re-derivation). |

**Score:** 8/8 must-haves verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/reviews/61-COVERAGE.md` | Full 88-cell grid, D-17 gate, 38 verbatim `n/a`, 7 unit sections, SEC-06 write-up, 73 findings | ✓ VERIFIED | 3,329 lines, all structural sections present (`## Applicability Grid`, `## D-17 Cell-Total Gate`, `## Exclusion reasons carried forward`, 7× `## RU-61-0N`, `## Phase 61 Close-Out`). |
| `.planning/BACKLOG.md` | FUT-01 Java-side observations (D-13), created only if ≥1 observation arose | ✓ VERIFIED | Exists, 2 substantive Java-side observations recorded (unauthenticated unbounded socket accept loop; unrestricted classpath-driven `URLClassLoader` loading), each with `file:line` into `java-interop/`. No `P61-*` ID assigned to either, per D-13. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `61-COVERAGE.md` D-05 recording shape | Plans `61-02`..`61-07` | Frozen per D-03, checkpointed | ✓ VERIFIED | `c56e92f` commit records the D-05 checkpoint approval; all 6 downstream unit sections use an identical `### Cells` / finding-record / sub-block shape to `RU-61-06`'s. |
| `61-COVERAGE.md` findings' `location:` | Real source `file:line` | Direct code reference | ✓ VERIFIED (sampled) | 6-finding sample across 4 units, 100% precise match against current source (see Truth 3). |
| DEBT-01/DEBT-02 routing-table items | REQUIREMENTS.md DEBT items | `dedup:` field naming the owning DEBT requirement | ✓ VERIFIED | `P61-D3-003` (DEBT-01/#232), `P61-D5-003` and `P61-D5-011` (DEBT-02) each carry `dedup:` text naming the owning requirement; REQUIREMENTS.md correctly shows DEBT-01..04 still `Pending`/routed to Phase 66 (not resolved here, as intended). |
| RVW-01 / SEC-06 | REQUIREMENTS.md | Traceability table | ✓ VERIFIED | Both marked `[x]` and `Complete` / `Phase 61` in `.planning/REQUIREMENTS.md`; no other requirement ID maps to Phase 61 (no orphans). |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| RVW-01 | 61-01..61-07 | `bbj-vscode/src/language/` reviewed across all 8 dimensions | ✓ SATISFIED | 53/53 files named, 50/50 `applies` cells recorded, 0 pending. |
| SEC-06 | 61-01 | java-interop client trust boundary audited | ✓ SATISFIED | `### SEC-06 Trust Boundary` subsection answers all 6 required questions with verified evidence. |

No orphaned requirements: REQUIREMENTS.md's traceability table maps only RVW-01 and SEC-06 to Phase 61, both claimed in plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/reviews/61-COVERAGE.md` | (34 of 73 findings) | Bare `dedup: none` with no per-finding elaboration | ℹ️ Info | Not a violation of RVW-07 (field is non-blank, and the plan-level explicit "plausible neighbour" checks were done substantively where the finding is anywhere near a tracker issue's topic). Worth flagging only because the verification brief specifically asked to confirm `dedup:` is substantive rather than boilerplate — roughly half are terse. All are for narrow internal-implementation defects unlikely to overlap any of the 15 open issues; spot review of the terse ones found no case where a real duplicate was missed. |

No `TBD`/`FIXME`/`XXX` markers, no `TODO`/`HACK`/`PLACEHOLDER` stubs, and no hollow prose ("coming soon", "not yet implemented") found in `61-COVERAGE.md` itself. The one `TODO` grep hit is a quotation of a pre-existing source-code comment cited as evidence, not a stub in the deliverable.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| D-17 gate re-derivation reproduces stated totals | `awk` pass over `INVENTORY.md` (exact command from the coverage file) | `50 38 88` | ✓ PASS |
| Coverage file's own internal cell counts match | 3 independent greps for verdicts/n-a/total-cells | `50` / `38` / `88` | ✓ PASS |
| No placeholder `pending` cells remain | `grep -c "— pending$"` | `0` | ✓ PASS |
| All 53 files named in coverage file | file enumeration + per-file grep | 53/53, 0 missing | ✓ PASS |
| Finding-record field completeness | grep count per field name | 73/73/73... (12 fields × 73) | ✓ PASS |
| No source under review-excluded paths modified | `git diff --stat` sweep-SHA..HEAD | empty | ✓ PASS |
| No commits touched reviewed source | `git log --oneline` over phase commit range, path-filtered | empty | ✓ PASS |
| 6 sampled `file:line` finding anchors match real source | direct `sed`/`grep` against cited lines | 6/6 exact matches | ✓ PASS |

### Probe Execution

Not applicable — this phase produces no runnable code, CLI, or migration script; it is a documentation/review-record deliverable. Skipped per Step 7c (no probe scripts declared or implied by PLAN/SUMMARY/success criteria).

### Human Verification Required

None. All 4 ROADMAP success criteria and all 8 derived must-haves were verifiable programmatically
against the coverage file and the underlying source tree.

### Gaps Summary

No gaps found. Every must-have — the 4 ROADMAP success criteria and the additional cross-unit
referral, edge-probe, D-17 gate, and no-source-modification must-haves drawn from the 7 plans'
frontmatter — was independently re-derived from the codebase (not merely re-read from
`61-COVERAGE.md`'s own self-reported summary) and confirmed accurate. Spot-checked file:line
evidence across all risk-rank extremes (the java-interop trust boundary, the highest-severity D1
finding in `bbj-cpl-service.ts`, and the mechanically-swept `.bbl` catalog duplication) all matched
the current source exactly. Zero source-file modifications were confirmed via git diff and git log,
consistent with this being a pure review-recording phase. The single soft observation (terse `dedup:
none` on about half the findings) does not block the phase goal and is recorded as informational
only.

---

*Verified: 2026-08-18T05:32:26Z*
*Verifier: Claude (gsd-verifier)*
