---
phase: 61-language-core-review
plan: 01
subsystem: review
tags: [langium, java-interop, jsonrpc, security-review, trust-boundary, test-coverage]

# Dependency graph
requires:
  - phase: 60-baseline-resync-review-standards
    provides: INVENTORY.md (finding standard, applicability grid, 21 review units, frozen open-issue snapshot)
provides:
  - ".planning/reviews/61-COVERAGE.md skeleton — 88-cell Phase 61 applicability grid, D-17 cell-total gate, 38 verbatim n/a carry-forwards, 7 stubbed unit sections"
  - "RU-61-06 (java-interop client) swept end to end across all 6 live dimensions — 14 findings, SEC-06 trust-boundary write-up, D-05 recording shape approved and frozen for plans 61-02..61-07"
  - ".planning/BACKLOG.md — FUT-01 Java-side observations (out of scope for this milestone)"
affects: [61-02-PLAN, 61-03-PLAN, 61-04-PLAN, 61-05-PLAN, 61-06-PLAN, 61-07-PLAN, phase-68-doc-assembly]

# Actuals (#2632)
actuals:
  tokens: 18715
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-unit coverage section shape: Files/Risk-rank/Sweep-method/Owning-plan header, 8-line ### Cells block, 13-field fenced finding records, ### Findings / ### Not-reproducible dispositions / ### Cross-unit referrals sub-blocks"
    - "Cross-unit referral convention: a finding's location: decides ownership, not the unit that discovered it; the discovering unit records a one-line pointer instead of duplicating or silently dropping the item"

key-files:
  created:
    - .planning/reviews/61-COVERAGE.md
    - .planning/BACKLOG.md
  modified: []

key-decisions:
  - "D-05 checkpoint (Task 3): user approved the rendered RU-61-06 recording shape verbatim, no revisions — frozen for plans 61-02..61-07 per D-03"
  - "The 11 test/linking.test.ts 'Interop related tests' failures are recorded as an RU-61-06 (not RU-61-02) finding per the location:-decides-ownership rule, with a cross-unit referral so RU-61-02 does not re-record them"
  - "No D1 finding was rated critical/high, so the D-11 runnable-reproduction requirement did not apply to any finding in this plan; all 8 repro-tier findings clear their bar via line-by-line trace"
  - "One D1 candidate (HTML/script injection via unescaped Javadoc content in hover) and one D8 candidate ('cheap' package-probe claim) could not clear their evidence tier from this unit's own files alone and were recorded under Not-reproducible dispositions rather than asserted as findings"

patterns-established:
  - "Pattern: dedup field on an environment/infrastructure-gap finding names the DEBT requirement it maps to when one exists, and explicitly says 'no DEBT item names this' when none does, rather than leaving ownership implicit"

requirements-completed: [RVW-01, SEC-06]

coverage:
  - id: D1
    description: "61-COVERAGE.md skeleton created — 88-cell Phase 61 applicability grid (7 unit rows + 4 lib/*.bbl file-exception rows), D-17 cell-total gate re-derived from INVENTORY.md (50/38/88), all 38 n/a cells carried forward verbatim, 7 unit sections stubbed"
    requirement: RVW-01
    verification:
      - kind: other
        ref: "acceptance_criteria grep suite in 61-01-PLAN.md Task 1 (grep -cE checks on RU-61-0[1-7] headers, D[1-8] cell lines, file-exception lines, n/a counts, D-17 gate output) — all passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "RU-61-06 (java-interop client, 4 files/1,255 LOC) swept across D1, D2, D3 at evidence tier repro — 8 findings recorded (P61-D1-001/002, P61-D2-001..004, P61-D3-001/002), all 13-field-complete with non-blank dedup"
    requirement: RVW-01
    verification:
      - kind: other
        ref: "acceptance_criteria grep suite in 61-01-PLAN.md Task 1 (field-count equality, ID uniqueness, no P00-* leakage, no java-interop/ location) — all passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "SEC-06 trust boundary documented — six named questions (peer control, auth posture, destination control, malicious peer, unresponsive peer, blast radius) answered with file:line anchors"
    requirement: SEC-06
    verification:
      - kind: other
        ref: "acceptance_criteria grep suite in 61-01-PLAN.md Task 1 (SEC-06 heading count, >=6 [a-z-]+.ts:[0-9]+ anchors) — all passed"
        status: pass
    human_judgment: false
  - id: D4
    description: "RU-61-06 completed across D4, D5, D8 at evidence tier trace — 6 more findings (P61-D4-001..003, P61-D5-001/002, P61-D8-001), including the routed 11-failure test/linking.test.ts item"
    requirement: RVW-01
    verification:
      - kind: other
        ref: "acceptance_criteria grep suite in 61-01-PLAN.md Task 2 (6 live cells verdicted, 2 n/a cells intact, unique IDs, linking.test.ts named) — all passed"
        status: pass
    human_judgment: false
  - id: D5
    description: "D-05 checkpoint: recording shape reviewed and approved by the user as rendered, no revisions"
    verification: []
    human_judgment: true
    rationale: "Shape approval is an explicit human decision by design (D-05) — not something a passing test can substitute for."

# Metrics
duration: 23min
completed: 2026-08-17
status: complete
---

# Phase 61 Plan 01: Coverage Skeleton + RU-61-06 Java Interop Sweep Summary

**Created the shared 88-cell `61-COVERAGE.md` skeleton and swept the java-interop client (RU-61-06, 4 files/1,255 LOC) end to end across all 6 live dimensions, recording 14 findings and a six-question SEC-06 trust-boundary write-up — none unauthenticated, none TLS-wrapped, host/port unvalidated end to end from LSP settings through to `socket.connect()`.**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-08-17T20:55:00Z
- **Completed:** 2026-08-17T21:17:24Z
- **Tasks:** 3 (2 `auto`/`tracer` + 1 `checkpoint:decision`)
- **Files modified:** 2 (`.planning/reviews/61-COVERAGE.md`, `.planning/BACKLOG.md`)

## Accomplishments

- `.planning/reviews/61-COVERAGE.md` created with the full Phase 61 skeleton: header (swept SHA `62b1e7150b91eadf6300db62103ef638c41ab25c` on `v4.0-stability-and-quality`), Stopping Rule & Write Contract, the 7-unit + 4-file-exception-row applicability grid mirroring INVENTORY.md, the D-17 cell-total gate re-derived to `50 38 88`, all 4 exclusion-reason blocks copied verbatim, and 7 stubbed unit sections (RU-61-07 additionally carrying its 32-line File-exception cells block).
- `RU-61-06` (java-interop client) swept end to end at both evidence tiers: `repro` for D1/D2/D3 (Task 1) and `trace` for D4/D5/D8 (Task 2) — 14 total findings, none requiring a runnable D1 repro since none was rated critical/high.
- SEC-06 trust boundary fully documented: the channel is unauthenticated and unencrypted in both directions (confirmed independently from `java-interop/`'s server side, read as reference material); `interopHost`/`interopPort` are validated with a falsy check only, not a type/range check, in both LSP call sites and in `setConnectionConfig` itself; every response field crosses into the AST/hover/completion surface unvalidated; the connect timeout, per-request timeout, and a wholly untimeout'd `loadClasspath`/`loadImplicitImports` path are each documented; and a single global resolution lock fully serializes class resolution, meaning an unresponsive peer costs ~10s per distinct unresolved class reference, serially.
- Confirmed independently (not just cited from INVENTORY): in this sandbox, port 5008 is open (`isPortOpen(5008)` returns true) yet the 11 `test/linking.test.ts` "Interop related tests" still fail with "No bbjdir set" — proving the client-side symptom matches INVENTORY's established fact that a listener alone does not fix them.
- `.planning/BACKLOG.md` created with 2 FUT-01 Java-side observations (unauthenticated unbounded socket server, unrestricted `loadClasspath()` classloading) surfaced while reading `java-interop/` as reference material — explicitly out of scope for filing or fixing this milestone.
- D-05 checkpoint (Task 3) resolved: the user approved the rendered recording shape exactly as written, no revisions. The shape is now frozen and documented as such inline in the coverage file for plans `61-02`..`61-07` to copy.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 61-COVERAGE.md and sweep RU-61-06 at evidence tier `repro` (D1, D2, D3) incl. SEC-06 trust boundary** — `ee39b64` (feat)
2. **Task 2: Complete RU-61-06 at evidence tier `trace` (D4, D5, D8)** — `64b82c5` (feat)
3. **Task 3: Approve the recording shape before expansion (D-05)** — `c56e92f` (docs)

**Plan metadata:** commit follows this SUMMARY.

## Files Created/Modified

- `.planning/reviews/61-COVERAGE.md` - Phase 61's sole review artifact: applicability grid, D-17 gate, exclusion reasons, 7 stubbed unit sections, RU-61-06 fully swept (14 findings + SEC-06 write-up), D-05 approval recorded
- `.planning/BACKLOG.md` - FUT-01 Java-side observations from reading `java-interop/` as reference material (out of scope for filing/fixing)

## Decisions Made

- **D-05 checkpoint: approved as rendered.** The user reviewed `RU-61-06`'s cell format, pass/fail check-line wording, `n/a` carry-forward presentation, 13-field finding records, and the four sub-blocks (plus `### SEC-06 Trust Boundary`), and approved them unchanged. This shape is now frozen for `61-02`..`61-07` per D-03; changing it later would force every already-recorded unit to be re-recorded.
- **Ownership rule applied to a genuine cross-unit case:** the 11 `test/linking.test.ts` "Interop related tests" failures are *about* the linker (`RU-61-02`'s territory) but *caused by* this unit's unreachable/non-functional peer, so per the plan's explicit ownership rule ("a finding's `location:` decides which unit owns it, not which unit discovered it") they are recorded once here as `P61-D5-001`, with a `### Cross-unit referrals` pointer so `RU-61-02` (plan `61-04`) does not re-record them.
- **No D1 finding required a runnable repro.** Both D1 findings (`P61-D1-001` unvalidated host/port, `P61-D1-002` unvalidated peer content) were rated `medium`, not `critical`/`high`, so D-11's stronger evidence bar did not trigger. Both clear tier `repro` via a line-by-line trace with concrete `file:line` anchors instead.
- **Two candidate claims dropped to Not-reproducible dispositions rather than asserted as findings**, per the drop-vs-disposition rule: (1) whether unescaped Javadoc markdown achieves script injection in the IDE hover/completion renderer — the renderer's `MarkupKind`/`supportHtml` setting lives in `RU-61-04`, outside this unit's files; (2) whether the JSDoc's "cheap" characterization of the fallback package probe is inaccurate — would require a runtime latency measurement outside a read-only sweep.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria (both the automated `bash -c` verify blocks and the additional grep-based criteria not covered by them — pass-line length, exclusion-text verbatim match, file-granular coverage, all-fields-equal-count, three-empty-blocks-per-unit) were checked and passed before each task's commit. No source file under `bbj-vscode/`, `bbj-intellij/`, or `java-interop/` was modified; `.planning/reviews/INVENTORY.md` was not edited.

## Issues Encountered

One self-caught defect during Task 1: the Stopping Rule prose originally quoted the literal heading text `### Not-reproducible dispositions` inside a sentence, which caused `grep -c '### Not-reproducible dispositions'` to over-count (8 instead of the required 7 — one per unit section). Reworded the prose to avoid embedding the literal heading string, re-ran the full acceptance-criteria grep suite, and confirmed the count returned to 7 before committing. No user-visible impact; caught and fixed within Task 1 before any commit was made.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan `61-02` (wave 2, `RU-61-01` grammar & lexing) can now proceed: the recording shape it must copy is frozen and approved, `61-COVERAGE.md`'s skeleton already carries `61-02`'s stubbed section, and the D-17 gate command/output are already recorded for it to leave untouched.
- 6 of `61-COVERAGE.md`'s 7 unit sections remain fully `pending` (44 of 50 `applies` cells); RU-61-06 is the only unit complete.
- `RU-61-05` (plan `61-06`) has a live cross-unit referral waiting on it from this plan (host/port validation gap at `bbj-ws-manager.ts:53-55`/`main.ts:151-152`), and `RU-61-02` (plan `61-04`) has an already-owned item it must not re-record (the 11 `test/linking.test.ts` failures).
- No blockers. `.planning/BACKLOG.md`'s FUT-01 entries are informational only and do not gate any downstream plan.

## Self-Check: PASSED

- FOUND: `.planning/reviews/61-COVERAGE.md`
- FOUND: `.planning/BACKLOG.md`
- FOUND: `.planning/phases/61-language-core-review/61-01-SUMMARY.md`
- FOUND commit: `ee39b64` (Task 1)
- FOUND commit: `64b82c5` (Task 2)
- FOUND commit: `c56e92f` (Task 3)
- FOUND commit: `6379452` (SUMMARY.md)

---
*Phase: 61-language-core-review*
*Completed: 2026-08-17*
