---
phase: 66-known-debt-re-triage
plan: 02
subsystem: testing
tags: [triage, tech-debt, lsp4ij, scoping, java-interop, static-analysis]

# Dependency graph
requires:
  - phase: 66-known-debt-re-triage plan 01
    provides: "66-COVERAGE.md header, finding-ID namespace, dedup source, evidence rule, scope fence, 8-row Debt Denominator Register (rows 250/256 left pending 66-02)"
  - phase: 63-intellij-plugin-review
    provides: "P63-D4-010 (DEBT-05's designated evidence record, superseded here)"
  - phase: 59-java-class-reference-features
    provides: "commit 99820a0 / 59-04-SUMMARY.md — the historical record of the MemberCall isClassRef extension being attempted and reverted, which DEBT-04's trace and blocker are built on"
provides:
  - "DEBT-05 verdict (major-refactor) with P66-D4-001: a 9-target javap annotation table read live off the cached LSP4IJ 0.19.0 jar, live re-derivation of 63-COVERAGE.md's two baselines (no drift), and PROJECT.md's '19 experimental API usages' figure settled by tracing its real provenance (the IntelliJ Plugin Verifier's 2026-02-10 compatibility run)"
  - "DEBT-04 verdict (major-refactor) with P66-D2-002: a line-by-line static trace distinguishing the working USE-alias path from the diverging MemberCall FQN path, with the java-interop JAR-redeployment blocker named"
  - "66-COVERAGE.md's Debt Denominator Register at 6/8 rows verdicted (250, 251, 253, 254, 256, 257); 252/255 still pending 66-03"
affects: [66-03-orphans-and-closeout, 67-fix-application, 68-doc-assembly, 69-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 11100
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "javap -v class-level vs member-level RuntimeInvisibleAnnotations reading, all-or-nothing per class (D-10)"
    - "Provenance tracing via git log -S over planning docs to settle an unsourced-looking figure instead of asserting or discarding it (the '19' figure)"
    - "Static trace with 'why no live reproduction was attempted' stated first, then a line-by-line file:line divergence trace, as the second evidentiary form of INVENTORY §3b's repro tier"

key-files:
  created: []
  modified:
    - .planning/reviews/66-COVERAGE.md

key-decisions:
  - "DEBT-05's '19 experimental API usages' figure settled by provenance, not re-derived: traced via git log -S to the IntelliJ Plugin Verifier's 2026-02-10 compatibility report (49-01-VERIFICATION.md), a real measured source with a different metric (whole-plugin bytecode usage-sites) than this task's own 9-target class-declaration table (3 of 9 classes carry class-level @ApiStatus.Experimental) — the two are reported as complementary, not conflated as the same number"
  - "DEBT-05 verdicts major-refactor (not wontfix): although LSP4IJ's own experimental marking can't be 'fixed' by this project, the actionable, in-repo edit is a regression-catching contract test for the 3 experimentally-marked extension points (bbj-intellij has no src/test/ source set at all, P63-D5-001) — matching P63-D4-010's own major-refactor disposition and Phase 69 drafting"
  - "DEBT-04 verdicts major-refactor (not wontfix), per D-07's precedent from 66-01's DEBT-02 split: the java-interop JAR-redeployment dependency is recorded as the draft's stated blocker, not used as an escape hatch to avoid filing an issue"
  - "DEBT-04's evidence_tier recorded repro (not trace) per D2's INVENTORY §3b bar, explicitly reconciling CONTEXT.md D-09's 'static trace' phrasing with the tier vocabulary: the trace clears §3b's second repro form (a line-by-line trace naming concrete inputs and the exact file:line where behaviour diverges), not a runtime reproduction"

patterns-established: []

requirements-completed: [DEBT-04, DEBT-05]

coverage:
  - id: D4
    description: "DEBT-05 (LSP4IJ experimental API coupling) measured directly against the cached LSP4IJ 0.19.0 jar: 63-COVERAGE.md's two baselines re-derived live (0, 11, 20 — no drift), a 9-target javap annotation table (all 9 read successfully, none unreadable) shows 3 of 9 classes (LSPCompletionFeature, LSPClientFeatures, LSPDocumentLinkFeature — the classes BbjCompletionFeature/BbjLanguageServerFactory actually subclass/anonymously implement) carry class-level @ApiStatus.Experimental with none of the specific overridden members individually annotated, PROJECT.md's '19' figure settled by provenance (IntelliJ Plugin Verifier, 2026-02-10), verdicted major-refactor with P66-D4-001 and a contract-test issue draft"
    requirement: DEBT-05
    verification:
      - kind: other
        ref: "grep -c '^id: *P66-D4-001' .planning/reviews/66-COVERAGE.md == 1; grep -c '^## DEBT-05$' == 1; sed -n '/^## DEBT-05/,/^## /p' | grep -c 'lsp4ij-0.19.0.jar' >= 1; annotation table names all 9 targets"
        status: pass
    human_judgment: false
  - id: D2
    description: "DEBT-04 (FQN path static-only completion filtering) traced line-by-line: bbj-scope.ts:191-234's isClassRef detection works for the USE-alias path (receiver is a SymbolRef bound to a JavaClass) but never activates for the MemberCall FQN path (receiver is itself a chained MemberCall), falling through to the instance-access branch; the java-interop.ts:572-588 isStatic ?? false default and commit 99820a0's historical revert are named as the stated JAR-redeployment blocker; no live reproduction attempted, with the reason stated explicitly; verdicted major-refactor with P66-D2-002 and an issue draft"
    requirement: DEBT-04
    verification:
      - kind: other
        ref: "grep -c '^id: *P66-D2-002' .planning/reviews/66-COVERAGE.md == 1; grep -c '^## DEBT-04$' == 1; range names USE, MemberCall, isClassRef, isJavaClass, bbj-scope.ts, bbj-completion-provider.ts, and 'redeploy' (case-insensitive) at least once each"
        status: pass
    human_judgment: false
  - id: D5
    description: "Debt Denominator Register updated to 6/8 rows verdicted (250, 251, 253, 254, 256, 257); rows 252/255 remain explicitly pending 66-03, never blank; zero GitHub tracker writes and zero source-file modifications across both tasks"
    verification:
      - kind: other
        ref: "sed -n '/^## Debt Denominator Register/,/^## /p' .planning/reviews/66-COVERAGE.md | grep -c 'pending 66-02' == 0; grep -c 'pending 66-03' == 3; git status --porcelain bbj-vscode bbj-intellij java-interop .github (empty); git status --porcelain over the five closed 6N-COVERAGE.md files + INVENTORY.md (empty); no gh write subcommand invoked"
        status: pass
    human_judgment: false

duration: ~55min
completed: 2026-08-19
status: complete
---

# Phase 66 Plan 2: Known Debt Re-triage — Live-Investigation Items Summary

**DEBT-05 measured directly against the cached LSP4IJ 0.19.0 jar (3 of 9 touched classes carry class-level `@ApiStatus.Experimental`, PROJECT.md's "19" figure traced to its real source — the 2026-02-10 IntelliJ Plugin Verifier report — rather than re-derived or discarded) and DEBT-04 traced line-by-line in `bbj-scope.ts`'s `isClassRef` detection, distinguishing the working `USE`-alias path from the diverging `MemberCall` FQN path and naming the `java-interop` JAR-redeployment blocker; both verdict `major-refactor` with issue-ready drafts.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2 completed (Task 1: DEBT-05 jar measurement; Task 2: DEBT-04 static trace)
- **Files modified:** 1 (`.planning/reviews/66-COVERAGE.md`, appended)

## Accomplishments

- **DEBT-05** verdicted end to end against the locally cached `lsp4ij-0.19.0.jar`:
  - Re-derived `63-COVERAGE.md`'s two baseline commands live — `grep -rn
    "ApiStatus.Experimental\|@Experimental" bbj-intellij/src/main/java` → `0`; `grep -rln
    "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` → `11` files; `grep -rn
    "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` → `20` references — all three match
    exactly, no drift to report.
  - Verified the precondition (jar readable, `javap -version` working) before starting, then ran
    `javap -v -cp "$JAR" <FQN>` against all nine targets D-10 enumerated — all nine read
    successfully (all-or-nothing rule satisfied with zero `unreadable` fallbacks needed). Built a
    9-row table recording each target's class-level annotation and the specific member(s)
    `BbjCompletionFeature`/`BbjLanguageServerFactory`/etc. actually override or call, and that
    member's own annotation.
  - Found: `LSPCompletionFeature`, `LSPClientFeatures`, and `LSPDocumentLinkFeature` — the exact
    three classes our code subclasses or anonymously implements — carry `@ApiStatus.Experimental`
    at the **class** level. None of the specific overridden members (`getIcon`,
    `initializeParams`, `setDocumentLinkFeature`, `setCompletionFeature`, `isSupported`,
    `createSettings`, `handleServerStatusChanged`) carries an annotation of its own; two other
    members our code never calls (`addLookupItem`, `setServerWrapper`/`getServerWrapper`) carry
    `@ApiStatus.Internal`. The remaining six targets carry zero `ApiStatus` references anywhere.
  - Traced PROJECT.md's "19 experimental API usages" figure to its real source via `git log -S`
    over the planning history: the IntelliJ Plugin Verifier's own compatibility report, run at
    v3.6 Phase 49 (`49-01-VERIFICATION.md:84`, "Compatible. 19 usages of experimental API",
    2026-02-10, all 6 target IDE versions) — a legitimate measured figure, just a different metric
    (whole-plugin bytecode usage-sites) than this task's own 9-target class-declaration table.
    Settled by naming this provenance rather than re-derived live (blocked by `P64-D6-010`'s JDK
    toolchain mismatch, which prevents any `./gradlew` task from running in this sandbox) and
    rather than restated as if freshly measured.
  - Recorded `P66-D4-001` (dimension D4, `trace` tier, severity medium, effort 4, `major-refactor`,
    superseding `P63-D4-010`) with an issue-ready draft proposing a `bbj-intellij/src/test/`
    contract test for the three experimentally-marked extension points.
- **DEBT-04** traced end to end with zero inherited evidence to cite from (the one denominator
  item no Phase 61-65 sweep recorded):
  - Stated why no live reproduction was attempted, before any evidence: this sandbox's known
    pre-existing, environment-classified test failures (`java-interop` unreachable) make a failed
    setup indistinguishable from a failed repro, per CONTEXT.md D-09; cited `61-COVERAGE.md:1862`,
    which independently noted DEBT-04 has only a prose record and no dedicated regression test.
  - Read `bbj-scope.ts:191-234`'s `getScope` member-completion branch line-by-line: `isClassRef`
    (line 200) is set `true` only when `receiver` is a `SymbolRef` (line 201) resolving to a
    `JavaClass` (line 204) — the `USE`-alias path (`USE java.lang.String` then `String.`), which
    **works**. For a fully-qualified reference typed without `USE` (`java.lang.String.valueOf`),
    the grammar's left-recursive `MemberCall` chaining makes the receiver of the final `.valueOf`
    call itself a `MemberCall` node, not a `SymbolRef` — `isSymbolRef(receiver)` is `false`,
    `isClassRef` never becomes `true`, and completion falls to the "instance access" branch
    (`:226-228`), offering every field and method instead of statics only. Confirmed
    `bbj-completion-provider.ts` adds no independent `isClassRef`-aware filtering — the divergence
    is entirely inside `bbj-scope.ts`.
  - Named the stated blocker: `java-interop.ts:572-588`'s `field.isStatic`/`method.isStatic
    ?? false` default, and the historical precedent — commit `99820a0` (`feat(59-04)`) attempted
    exactly this `isClassRef` extension and reverted it in the same commit, documented in
    `59-04-SUMMARY.md`'s own Deviations section, because the old JAR does not reliably send
    `isStatic` for fields. `java-interop/` sits outside this milestone's review boundary (`FUT-01`).
  - Recorded `P66-D2-002` (dimension D2, `repro` tier via INVENTORY §3b's second form — a
    line-by-line trace, not a runtime reproduction — severity medium, effort 8, `major-refactor`)
    with an issue-ready draft naming the concrete `bbj-scope.ts` edit and its cross-repo,
    JAR-redeployment unblocking condition.
- Updated the Debt Denominator Register: rows 250 (DEBT-05) and 256 (DEBT-04) resolved; the
  "Rows this plan (66-01) verdicts" paragraph corrected to reflect 66-02's own resolved rows
  without leaving a stale `pending 66-02` marker anywhere in the register section. Added
  `## Plan 66-02 accounting` naming both allocated finding IDs, the two register rows closed, and
  the literal `git status --porcelain` output confirming zero source-file modifications and zero
  tracker writes.

## Task Commits

1. **Task 1: DEBT-05 — measure LSP4IJ 0.19.0 experimental-API exposure against the cached jar** —
   `afe298f` (feat) — appends `## DEBT-05` (baseline re-derivation, jar measurement, the "19"
   settle-or-retire, verdict, `P66-D4-001`, issue-ready draft) and updates the pre-allocation table.
2. **Task 2: DEBT-04 — static trace of the FQN static-only completion filtering gap** — `8e6bdfe`
   (feat) — appends `## DEBT-04` (why no live reproduction, static trace, stated blocker, verdict,
   `P66-D2-002`, issue-ready draft) and `## Plan 66-02 accounting`; corrects the Debt Denominator
   Register's own status paragraph.

Neither task carried a checkpoint — both are `type="auto"`, fully autonomous.

## Files Created/Modified

- `.planning/reviews/66-COVERAGE.md` — appended `## DEBT-05` and `## DEBT-04` (606 net insertions
  across both commits). Zero other files modified (D-01 verdict-only boundary held throughout;
  confirmed by literal `git status --porcelain` output over `bbj-vscode`, `bbj-intellij`,
  `java-interop`, `.github`, and the five closed `6N-COVERAGE.md` files plus `INVENTORY.md`).

## Decisions Made

- **DEBT-05's "19" figure settled by provenance, not re-derived or discarded.** See key-decisions
  above and the `### The "19", settled or retired` subsection in `66-COVERAGE.md` for the full
  reasoning: `git log -S` traced it to the IntelliJ Plugin Verifier's own 2026-02-10 compatibility
  report, a real measured figure with a different metric than this task's own jar-inspection table.
- **DEBT-05 verdicts `major-refactor`**, matching `P63-D4-010`'s own disposition, because the
  actionable fix this phase can name — a contract test for the 3 experimentally-marked extension
  points — is in-repo and concrete, unlike an unfixable "LSP4IJ must stabilize" framing that would
  point toward `wontfix`.
- **DEBT-04 verdicts `major-refactor`, not `wontfix`,** per 66-01's own D-07 precedent: the
  cross-repo JAR-redeployment dependency is recorded as the issue draft's stated blocker, not used
  to avoid filing an issue for a still-real, nameable-edit item.
- **DEBT-04's `evidence_tier` recorded `repro` (not `trace`),** explicitly reconciling CONTEXT.md
  D-09's "static trace" phrasing with D2's INVENTORY §3b bar: the trace clears §3b's second `repro`
  form (a line-by-line trace naming concrete inputs and the exact `file:line` where behaviour
  diverges), which the plan's own "Planner reconciliation note" flagged as the correct reading.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a self-correcting, unpolished sentence in DEBT-04's issue-ready draft**
- **Found during:** Task 2, before this file's final acceptance-criteria pass
- **Issue:** The first draft of the "Proposed approach" paragraph in DEBT-04's issue-ready draft
  contained a mid-sentence self-correction ("...already computed at line 193 as `receiverType`...
  no — the *receiver's own* type...") — an artifact of composing the trace, not a factual error,
  but not publication-quality prose for an issue-ready draft this phase hands to Phase 69.
- **Fix:** Rewrote the paragraph to state the correct, already-verified fact cleanly:
  `receiverType` already resolves correctly for the `MemberCall`-chain case; the actual gap is the
  syntactic `isSymbolRef(receiver)` test conflating "written as a bare name" with "refers to the
  class itself" — no change to the underlying finding, evidence, or verdict.
- **Files modified:** `.planning/reviews/66-COVERAGE.md` (the `### Issue-ready draft` subsection
  under `## DEBT-04`).
- **Verification:** Re-read the corrected paragraph; re-ran the full acceptance-criteria grep suite
  for Task 2 — all still pass.
- **Committed in:** `8e6bdfe` (the fix was applied before this commit, so it is part of the
  committed content, not a separate correction).

**2. [Rule 1 - Bug] Corrected a stale `pending 66-02` reference left by 66-01's own register
paragraph**
- **Found during:** Task 2, running this task's own acceptance-criteria grep suite
- **Issue:** 66-01's "Rows this plan (66-01) verdicts" paragraph in the `## Debt Denominator
  Register` section stated "250 and 256 remain `pending 66-02`" — accurate when 66-01 wrote it, but
  stale once this plan resolved both rows. The literal `pending 66-02` substring in that prose
  paragraph would have kept Task 2's own acceptance criterion (`... | grep -c 'pending 66-02' ==
  0`) failing even after the register table's cells were correctly updated.
- **Fix:** Reworded the paragraph to attribute rows to the plan that actually verdicted them (66-01:
  251/253/254/257; 66-02: 250/256) and to state the current status without repeating the stale
  literal marker string.
- **Files modified:** `.planning/reviews/66-COVERAGE.md` (the paragraph immediately following the
  Debt Denominator Register table).
- **Verification:** `sed -n '/^## Debt Denominator Register/,/^## /p' .planning/reviews/66-COVERAGE.md
  | grep -c 'pending 66-02'` → `0`; `... | grep -c 'pending 66-03'` → `3` (252, 255, and the
  explanatory sentence naming them).
- **Committed in:** `8e6bdfe`.

---

**Total deviations:** 2 auto-fixed (1 prose-quality bug in an issue draft, 1 stale-cross-reference
bug in shared register prose). Neither changed any evidentiary claim, verdict, or finding-record
field.
**Impact on plan:** No scope creep — both fixes were required to satisfy this plan's own literal
acceptance criteria and to keep the shared register section internally consistent after this
plan's own edits.

## Issues Encountered

None beyond the two auto-fixed deviations documented above.

## User Setup Required

None — no external service configuration required. This plan reads (never writes to) the GitHub
tracker and modifies no source file.

## Next Phase Readiness

- `66-03` can proceed independently: it owns `DEBT-07`/`DEBT-08` (register rows 252, 255,
  pre-allocated `P66-D2-003`/`P66-D5-003`, both still `pending 66-03`), the
  `REQUIREMENTS.md`/`PROJECT.md` edits (D-05, D-13), `DEBT-06` closure, and the four close-out gates
  (D-15) — all of which read this plan's completed `## DEBT-05` and `## DEBT-04` sections (register
  rows 250 and 256, both now verdicted) as inputs, alongside 66-01's `## DEBT-01`/`## DEBT-02`/
  `## DEBT-03`.
- No blockers. The phase-wide currency baseline 66-01 established (empty diff between the swept SHA
  and execution HEAD) still held for this plan's own re-reads of `bbj-scope.ts`,
  `bbj-completion-provider.ts`, and `java-interop.ts` — no drift found.
- `P64-D6-010`'s JDK toolchain mismatch remains the reason DEBT-05's "19" figure could not be
  re-derived live in this sandbox and the reason DEBT-05's proposed contract test cannot be run
  locally yet — both are stated as named, tracked blockers in the issue draft, not silently worked
  around.

## Self-Check: PASSED

- FOUND: `.planning/reviews/66-COVERAGE.md`
- FOUND: `.planning/phases/66-known-debt-re-triage/66-02-SUMMARY.md`
- FOUND: `afe298f` (Task 1 commit)
- FOUND: `8e6bdfe` (Task 2 commit)

---
*Phase: 66-known-debt-re-triage*
*Completed: 2026-08-19*
