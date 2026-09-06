---
phase: 81-feature-parity-and-correctness
plan: 03
subsystem: ui
tags: [intellij, commenter, self-managing-commenter, junit5, tdd]

requires:
  - phase: 78-build-and-test-foundation
    provides: JDK 17 toolchain auto-provisioning so ./gradlew test resolves without manual JDK switching
provides:
  - Plain-Java RemToggleSeam (isCommented/comment/uncomment) mirroring the grammar's COMMENT terminal word boundary
  - BbjCommenter implementing both Commenter and SelfManagingCommenter<CommenterDataHolder>, delegating every line decision to the seam
  - Source guard pinning the wiring so a future edit can't silently drop an interface or inline recognition logic back into BbjCommenter
affects: [83-regression-test-hardening]

actuals:
  tokens: 5023
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Plain-Java seam pattern (no com.intellij import) for IntelliJ platform classes that need behavioural JUnit coverage — same shape as KeystrokeDebouncer/BbjStringCommentScanner"
    - "Source guard test asserting interface declarations, delegation call counts, and index-ordering invariants over the raw source text (OffEdtDispatchSourceGuardTest convention)"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/commenter/RemToggleSeam.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/RemToggleSeamTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/BbjCommenterSelfManagingSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java

key-decisions:
  - "Recognition compares each of the three rem letters against explicit upper/lower ASCII forms directly, never via toLowerCase/equalsIgnoreCase, so it stays locale-independent (proven under a Turkish default locale)"
  - "Insert position is hard-coded to column 0 in commentLine, because a self-managing commenter bypasses the LINE_COMMENT_AT_FIRST_COLUMN code-style setting the platform no longer consults"
  - "BbjCommenter keeps both Commenter and SelfManagingCommenter<CommenterDataHolder> — the platform interface does not extend Commenter at the bytecode level and getLineCommentPrefix() is still read elsewhere"

patterns-established:
  - "Concurrency backstop pattern: build sequential seam results for a fixed line list, then run the same calls from a small fixed ExecutorService pool and assert every parallel result equals the sequential baseline (TokenValidationCacheTest convention)"

requirements-completed: [PARITY-03]

coverage:
  - id: D1
    description: "A rem/Rem/REM (word-bounded) line is recognised as already commented and uncomments back to its original text instead of stacking a second prefix"
    requirement: PARITY-03
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/RemToggleSeamTest.java#aLowercaseRemLineIsAlreadyCommentedAndUncommentsToTheOriginalText"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/RemToggleSeamTest.java#aMixedCaseRemLineIsAlreadyCommentedAndUncommentsToTheOriginalText"
        status: pass
    human_judgment: false
  - id: D2
    description: "remark = 1, rem15, rem$ are not treated as comments; indentation, bare-rem, and single-separator stripping are preserved; column-0 insert; locale and concurrency edges hold"
    requirement: PARITY-03
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/RemToggleSeamTest.java (11 tests, 0 failures)"
        status: pass
    human_judgment: false
  - id: D3
    description: "BbjCommenter implements both Commenter and SelfManagingCommenter<CommenterDataHolder> and delegates every line decision to the seam, with no recognition logic inlined back into the platform class"
    requirement: PARITY-03
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/BbjCommenterSelfManagingSourceGuardTest.java (7 tests, 0 failures)"
        status: pass
      - kind: integration
        ref: "./gradlew test (whole bbj-intellij module, 29 test classes, 0 failures)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Live-IDE Ctrl+/ behavior on rem/Rem/REM/remark lines, double-toggle round trip, and multi-line selection semantics"
    human_judgment: true
    rationale: "C-01 keeps the platform test framework (BasePlatformTestCase) out of this module, so the toggle cannot be exercised without a live editor. Deferred to /gsd-verify-work UAT per Phase 79/80 practice."

duration: 18min
completed: 2026-09-05
status: complete
---

# Phase 81 Plan 3: Case-Insensitive REM Toggle Summary

**IntelliJ's line-comment toggle now recognises `rem`/`Rem`/`REM` (word-bounded) via a stateless `RemToggleSeam` that `BbjCommenter` delegates to as a `SelfManagingCommenter`, so toggling an already-commented BBj line removes the prefix instead of doubling it (#540).**

## Performance

- **Duration:** ~18 min of committed work, split across two executor sessions (RED at 10:44:30Z; a prior executor then stalled ~20 min on an unanswered `cd …; grep` permission prompt before this continuation resumed and finished GREEN through Task 3 by 11:02:13Z)
- **Started:** 2026-09-05T10:44:30Z (Task 1 RED commit)
- **Completed:** 2026-09-05T11:02:13Z (Task 3 commit)
- **Tasks:** 3 (all complete)
- **Files modified:** 4 (1 new production class, 1 modified production class, 2 new test classes)

## Accomplishments
- `RemToggleSeam` — a plain-Java, platform-import-free class recognising `rem` in any letter case via direct ASCII character comparison (never `toLowerCase`/`equalsIgnoreCase`), mirroring the grammar's `COMMENT` terminal word boundary; `comment`/`uncomment` insert/strip the prefix while preserving indentation and stripping at most one following space or tab
- `BbjCommenter` now implements both `Commenter` and `SelfManagingCommenter<CommenterDataHolder>`, with all eleven self-managing methods delegating line decisions to the seam and inserting the prefix at column 0
- Full #540 case table covered by 11 behavioural JUnit 5 tests: word-boundary near-misses (`remark = 1`, `rem15`, `rem$`), indentation preservation, bare-`rem` handling, single-separator stripping, column-0 insert, Turkish-locale independence, and an 8-thread concurrency backstop proving the seam holds no state between calls
- Source guard (`BbjCommenterSelfManagingSourceGuardTest`, 7 tests) pins both interface declarations, exactly-once delegation to the seam, zero inlined `equalsIgnoreCase`/`startsWith` recognition, and that the line-start offset is computed before the seam is asked to comment
- Whole `bbj-intellij` module test suite green: 29 test classes, 0 failures; `plugin.xml` unchanged (the existing `lang.commenter` registration already pointed at `BbjCommenter`)

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end round trip — a lowercase rem line is recognised and uncomments to its original text** (tracer, TDD)
   - RED: `b76fc12` (test) — 3 failing tests, written by the previous executor before this continuation
   - GREEN: `2315ae9` (feat) — `RemToggleSeam` + `BbjCommenter` self-managing wiring; fixed one acceptance-criteria violation before committing (see Deviations)
2. **Task 2: The full #540 case table — word boundary, indentation, bare rem, locale and concurrency** - `0da3fcd` (test) — all 11 tests passed against the existing seam with no production changes needed
3. **Task 3: Pin the self-managing wiring in source and prove the module still builds green** - `f60e2f3` (test) — source guard + whole-module `./gradlew test` green

**Plan metadata:** committed alongside this SUMMARY (see below)

_Note: Task 1 is `tdd="true"` and followed the full RED→GREEN cycle; Tasks 2 and 3 are `tdd="true"` but landed as single test-only commits because the seam already satisfied every case with no fix needed._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/commenter/RemToggleSeam.java` - New plain-Java toggle seam: `COMMENT_PREFIX`, `isCommented`, `comment`, `uncomment`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java` - Now implements `Commenter` + `SelfManagingCommenter<CommenterDataHolder>`; all line/block self-managing methods added, delegating to the seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/RemToggleSeamTest.java` - 11 behavioural tests covering every #540 acceptance case plus word boundary, locale, and concurrency edges
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/commenter/BbjCommenterSelfManagingSourceGuardTest.java` - 7 source-guard tests pinning the wiring

## Decisions Made
- Case recognition uses explicit per-character ASCII comparison rather than locale-sensitive case folding, matching D-16/D-17 and verified independently under a Turkish default locale (Test 9)
- The comment insert position is hard-coded to column 0 in `commentLine` rather than reading `LINE_COMMENT_AT_FIRST_COLUMN`, since `SelfManagingCommenter` bypasses that setting entirely (RESEARCH.md Pitfall 4)
- `BbjCommenter` retains the `Commenter` interface alongside `SelfManagingCommenter` — dropping it would break other call sites still reading `getLineCommentPrefix()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1 acceptance criterion violated by a javadoc comment mentioning `toLowerCase`**
- **Found during:** Continuation resume, re-verifying Task 1's acceptance criteria before committing GREEN
- **Issue:** The GREEN implementation (written by the previous executor before it stalled) included a source comment reading `never through case-folding (no toLowerCase/equalsIgnoreCase), because...`. The plan's literal acceptance criterion requires `grep -c 'toLowerCase' RemToggleSeam.java` to return 0 — a comment merely *mentioning* the method name still matched the literal string, failing the criterion even though no code path actually called `toLowerCase`.
- **Fix:** Reworded the comment to describe the same rationale ("never through a locale-sensitive case-folding method... this recognition rule is not locale-sensitive") without using the literal token `toLowerCase`.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/commenter/RemToggleSeam.java`
- **Verification:** `grep -c 'toLowerCase' RemToggleSeam.java` returns 0; `./gradlew test --tests 'com.basis.bbj.intellij.commenter.RemToggleSeamTest'` still 3/3 passing (bytecode unchanged by a comment edit)
- **Committed in:** `2315ae9` (part of Task 1 GREEN commit)

**2. [Continuation, not a deviation rule] Resumed from a stalled prior executor**
- **Context:** A previous executor wrote and locally tested Task 1's GREEN implementation (`RemToggleSeam.java`, `BbjCommenter.java`) but stalled ~20 minutes on an unanswered `cd …; grep <relative-path>` shell command that the project's permission hooks blocked (CLAUDE.md's Shell and File-Access Rules exist precisely to prevent this). It never committed the GREEN change.
- **Resolution:** This continuation executor verified the untracked/modified files matched the reported evidence exactly, re-ran the full acceptance-criteria grep suite with absolute paths and the `Grep`/`Read`/`Bash` tools per CLAUDE.md's rules (never chaining `cd` with `grep`), found and fixed the one failing criterion above, committed Task 1 GREEN, then executed Tasks 2 and 3 to completion.

---

**Total deviations:** 1 auto-fixed (1 bug: a comment string violating a literal grep-based acceptance criterion). **Impact:** Cosmetic — no behavior change; the seam's actual recognition logic never used locale-sensitive case folding, only the comment text needed rewording. No scope creep.

## Issues Encountered
None beyond the prior executor's stall, which this continuation resolved per its resume instructions (see Deviations above).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 1's tracer feedback gate was satisfied end-to-end (`HUMAN_VERIFY_MODE=end-of-phase`, auto mode off, the tracer's `<verify>` carries only `<automated>`): the automated verify was re-run and passed before expansion into Tasks 2-3, per the plan's own routing.
- `PARITY-03` is now implemented and unit/source-guard verified; the plan's four human-observable checks (Ctrl+/ on `rem`/`Rem`/`REM`/`remark`, double-toggle round trip on an indented line, and multi-line selection semantics) are deferred to `/gsd-verify-work` UAT in a live IDE, consistent with Phase 79/80 practice and C-01's constraint against a platform test framework in this module.
- 81-04-PLAN.md (compiler output directory setting) and 81-05-PLAN.md (Wave 2, blocked on 81-01 and 81-04) remain to execute this phase.
- `gsd-tools.cjs` was not found anywhere on this host (`find / -maxdepth 6 -iname 'gsd-tools.cjs'` returned nothing, no `gsd_run` on PATH) — STATE.md and ROADMAP.md below were updated by direct edit rather than via `gsd_run query state.*`/`roadmap.*` verbs. A future executor should investigate why the shim is absent from this environment.

---
*Phase: 81-feature-parity-and-correctness*
*Completed: 2026-09-05*

## Self-Check: PASSED

- All 4 key files found on disk (RemToggleSeam.java, BbjCommenter.java, RemToggleSeamTest.java, BbjCommenterSelfManagingSourceGuardTest.java)
- All 4 commits found in git log (b76fc12, 2315ae9, 0da3fcd, f60e2f3)
- All Task 1/2/3 acceptance criteria re-verified passing (see task-level grep/test output above)
- Plan-level `<verification>` automated checks re-run: `RemToggleSeamTest` (11/0), `BbjCommenterSelfManagingSourceGuardTest` (7/0), whole-module `./gradlew test` (29 classes, 0 failures)
