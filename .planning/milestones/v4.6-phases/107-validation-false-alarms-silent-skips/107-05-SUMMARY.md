---
phase: 107-validation-false-alarms-silent-skips
plan: 05
subsystem: validation
tags: [langium, java-interop, member-linking, unknown-member, diagnostic-hierarchy, live-corpus-review]

requires:
  - phase: 107-validation-false-alarms-silent-skips
    provides: "107-03's check-unknown-java-member.ts (the check under review) and its guard-case unit/functional suites"
provides:
  - "A live-backend D-12 review instrument (outside the repository) that validates every accepted-corpus file against the check with the real java-interop backend, not the harness's own fake classpath double"
  - "Five newly-discovered false-positive shapes in checkUnknownJavaMember/hasCertainReceiverType, each narrowed by its own guard and pinned by a synthetic regression test"
  - "Confirmation that every remaining unknown-member Error over the full accepted corpus is a genuinely unknown member on this backend's resolved classpath"
affects: [107-06]

actuals:
  tokens: 3474
  tasks: 2
  commits: 10

tech-stack:
  added: []
  patterns:
    - "Live-backend per-file probe: the same createBBjServices(NodeFileSystem) + setConnectionConfig + loadImplicitImports + IndexManager reindex warm-up as the live functional test, run once per shard over a manifest slice or an explicit id list, with per-file crash isolation and periodic stderr progress"
    - "In-probe classification: instead of a second live query per finding, the probe locates the matching MemberCall node in the already-built document and re-reads the SAME already-resolved receiver type the check itself consulted, reporting the full unfiltered method/field/nested-class match list for local, non-destructive classification"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/validations/check-unknown-java-member.ts
    - bbj-vscode/test/unknown-java-member.test.ts
    - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts

key-decisions:
  - "The live-backend probe script, its classification helper and every run's output stay entirely in the private corpus repository's untracked snapshots folder (per D-13) -- nothing about individual corpus files (name, id, path, or source line) is quoted anywhere in this repository, in a commit message, or in this SUMMARY; every shape below is described in my own words only"
  - "Classification for each finding reuses the check's own already-computed receiver type in memory rather than a second live class query, giving an unfiltered (non-static-only) view of the real class's methods/fields/nested classes for local review -- this is what let false positives 2-5 below surface without any extra backend round trip"
  - "All five guards found this session narrow hasCertainReceiverType or checkUnknownJavaMember itself; none touch bbj-scope.ts, bbj-linker.ts, java-interop.ts or bbj-test-module.ts, and none weaken or delete a 107-03 test -- every previously-passing test (guard-case suite and the live BBjAPI() functional suite) still passes unchanged, with five new tests added"

patterns-established:
  - "A live-corpus-review-found guard gets a RED test proven directly against the live backend when the test double cannot reproduce the receiver's resolved class (the .class java.lang.Object case), and a RED test against the test double's own fake classes otherwise (the other four)"

requirements-completed: []

coverage:
  - id: D1
    description: "A live per-file probe validates the check against the real java-interop backend over the private corpus, in slices and as a full run, with per-file crash isolation and progress logging"
    requirement: "VAL-03"
    verification:
      - kind: other
        ref: "phase-107-live-member-probe.mts run against the full manifest (16,884 files) -- 0 crashes, progress line shows the full record count (local output, not committed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every unknown-member Error the live backend produced (124 initially) was classified by line shape; five distinct false-positive shapes were found, narrowed by a guard, and pinned by a synthetic test, leaving 76 findings that are all genuinely unknown members on this backend's resolved classpath"
    requirement: "VAL-03"
    verification:
      - kind: other
        ref: "phase-107-live-member-probe.jsonl full re-run after all five guards -- 0 of 76 remaining findings have any unfiltered method/field/nested-class match on their resolved receiver class (local output, not committed)"
        status: pass
    human_judgment: true
    rationale: "Whether a genuinely-missing member on THIS backend's resolved classpath reflects a real corpus bug, a library-version mismatch, or an LLM-hallucinated API call is a judgment call about the corpus content itself, not something the automated match-count check can certify -- the classification table below is for a human to sanity-check at phase end."
  - id: D3
    description: "Every 107-03 guard-case test and the live BBjAPI() functional suite still pass unchanged, plus five new regression tests for the shapes found this session"
    requirement: "VAL-03"
    verification:
      - kind: unit
        ref: "test/unknown-java-member.test.ts -- 29 tests (24 pre-existing + 5 new), all pass"
        status: pass
      - kind: e2e
        ref: "test/functional/unknown-java-member-real-interop.test.ts -- 5 tests (4 pre-existing + 1 new), all pass against the live backend"
        status: pass
      - kind: other
        ref: "whole suite, RUN_BBJ_TESTS=0 --maxWorkers=2 -- numFailedTests=0, numTotalTests=2728"
        status: pass
    human_judgment: false

duration: 141min
completed: 2026-09-25
status: complete
---

# Phase 107 Plan 05: Live-backend review of the unknown-Java-member check Summary

**Reviewed every unknown-member Error the new check produces over the full private corpus against the real java-interop backend, found and guarded five distinct false-positive shapes the guard-case unit suite could not surface on its own, and confirmed the remaining 76 findings are all genuinely unknown members on this backend's classpath.**

## Performance

- **Duration:** 141 min (2h21m)
- **Started:** 2026-09-24T22:12:00Z (approx)
- **Completed:** 2026-09-25T00:33:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Built a live-backend probe (outside the repository) that validates a manifest slice or the whole accepted corpus with the real `createBBjServices(NodeFileSystem)` pipeline against BBjServices on `:5008`, following the same warm-up sequence as the live functional test, with per-file crash isolation and periodic progress logging
- Proved the probe end to end on a 200-file slice (one finding, correctly classified as genuinely unknown) before committing to a full run
- Ran the full accepted corpus (16,884 files) five times across the review cycle, going from 124 unknown-member findings down to 76 as each newly-found false-positive shape was guarded and re-measured
- Classified every finding by locating its exact MemberCall node in the already-built document and re-reading the SAME already-resolved receiver type the check itself consulted -- an unfiltered (non-static-only) view of the real class's methods, fields and nested classes, entirely local, no extra backend round trip
- Found and guarded five distinct false-positive shapes (detailed below); all five are narrowed guards inside `check-unknown-java-member.ts` only -- no change to `bbj-scope.ts`, `bbj-linker.ts`, `java-interop.ts` or `bbj-test-module.ts`
- Every 107-03 guard-case test and the live BBjAPI() functional suite still pass unchanged; five new regression tests pin the shapes found this session (29 unit tests total, 5 live functional tests total)
- Confirmed via a systematic re-scan (not just spot-checks) that no residual instance of any of the five shapes remains among the final 76 findings

## Task Commits

Each guard followed its own RED/GREEN cycle, for a total of 10 commits:

1. **Shape 1 RED: instance method through a class reference** - `c6ee911d` (test)
2. **Shape 1 GREEN: drop the static-only filter for method access** - `1988923d` (fix)
3. **Shape 2 RED: array-typed declare's `.length` pseudo-field** - `6cea0c36` (test)
4. **Shape 2 GREEN: exclude an array-typed declare from certainty** - `f99eeea9` (fix)
5. **Shape 3 RED: a java.lang.Object receiver** - `49efc21f` (test)
6. **Shape 3 GREEN: exempt java.lang.Object from the check** - `a19ee72d` (fix)
7. **Shape 4 RED: empty-string sentinel first assignment** - `b481860c` (test)
8. **Shape 4 GREEN: treat an empty-string first assignment as uncertain** - `c0db75f7` (fix)
9. **Shape 5 RED: a variable reconstructed as a different class** - `29c3efda` (test)
10. **Shape 5 GREEN: treat a reconstructed variable as uncertain** - `cc7c37cf` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/src/language/validations/check-unknown-java-member.ts` - five new/widened guards: dropped the static-only filter for class-reference METHOD access (kept for field access); excluded an array-typed `declare Type[] var!`/`Type@[] var!` from the certain-receiver set; added `isUniversalObjectReceiver` to exempt `java.lang.Object`; narrowed the string-literal certainty branch to non-empty literals only; added `isReassignedToADifferentConstructedClass` to stop trusting a first construction when the same variable is reconstructed elsewhere as a different class
- `bbj-vscode/test/unknown-java-member.test.ts` - five new regression tests (one per shape, four against the test double, one pure-predicate unit test) plus the `isUniversalObjectReceiver` import
- `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts` - one new live-backend test for the `java.lang.Object` shape, which the test double cannot reproduce (it has no fake `java.lang.Object` class)

## Decisions Made
See `key-decisions` in the frontmatter for the probe-design and classification-methodology decisions. In addition:
- Ran the full corpus probe five times (once per guard) rather than batching all fixes before a single re-measure, so each guard's own before/after finding delta could be attributed unambiguously to that specific fix
- After the automated "any unfiltered match" classifier came back clean following each fix, still manually reviewed the remaining findings' member-name groupings for other suspicious repeating patterns (this is how shapes 2 and 5 were found -- neither produces an unfiltered match, since the WRONG class genuinely lacks the member too) rather than treating a clean automated pass as sufficient on its own

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Method access through a bare class reference incorrectly required a static member**
- **Found during:** Task 1 (the 200-file slice probe run, then reproduced and generalized during Task 2's full run)
- **Issue:** Calling a method on a bare class reference with no instantiating parentheses (`SomeClass.someInstanceMethod(...)`) is accepted by the compiler for at least some of BBj's Java proxy classes and dispatches a real instance method, but the check's static-only filter (correct for field access, matching the existing class-reference completion filter) also rejected real instance methods reached this way.
- **Fix:** Method matching through a class reference no longer applies the static-only filter; field matching is unchanged.
- **Files modified:** `check-unknown-java-member.ts`, `unknown-java-member.test.ts`
- **Verification:** Full corpus re-run: 124 -> 120 findings, the four affected findings all cleared, no new findings introduced.
- **Committed in:** `1988923d` (fix), preceded by `c6ee911d` (RED test)

**2. [Rule 1 - Bug] An array-typed DECLARE was treated as a certain scalar receiver**
- **Found during:** Task 2, manual review of the remaining findings' member-name groupings after shape 1's fix (a repeating pseudo-field name across many otherwise-unrelated classes)
- **Issue:** `declare Type[] var!` (or `Type@[] var!`) parses as a plain VariableDecl/FieldDecl/ParameterDecl carrying non-empty `arrayDims`, not the separate ArrayDecl node type the existing guard already excluded -- so the certain-receiver guard still trusted it, and Java's own array `.length` pseudo-field looked like an unknown field on the array's element class.
- **Fix:** The certain-receiver guard for a declared/typed symbol now also requires zero array dimensions.
- **Files modified:** `check-unknown-java-member.ts`, `unknown-java-member.test.ts`
- **Verification:** Full corpus re-run: 120 -> 101 findings, all affected findings cleared, no new findings introduced.
- **Committed in:** `f99eeea9` (fix), preceded by `6cea0c36` (RED test)

**3. [Rule 1 - Bug] A java.lang.Object-declared receiver was treated as certain**
- **Found during:** Task 2, after shape 2's fix, the same member-name-grouping review
- **Issue:** A variable, field or parameter declared as the universal `java.lang.Object` supertype can legitimately hold any runtime value at all, including an array -- Java's own array-to-Object covariance. An array's pseudo-fields are never in Object's own member list, so a member access reached through a declared-Object receiver looked like an unknown member of Object itself.
- **Fix:** Added `isUniversalObjectReceiver`; the check now exempts any receiver whose resolved type is exactly `java.lang.Object`.
- **Files modified:** `check-unknown-java-member.ts`, `unknown-java-member.test.ts`, `unknown-java-member-real-interop.test.ts` (the test double has no fake `java.lang.Object` class, so this shape's end-to-end proof lives in the live functional suite)
- **Verification:** Full corpus re-run: 101 -> 99 findings, both affected findings cleared, no new findings introduced.
- **Committed in:** `a19ee72d` (fix), preceded by `49efc21f` (RED tests)

**4. [Rule 1 - Bug] An empty-string sentinel first assignment was treated as certain**
- **Found during:** Task 2, after shape 3's fix, the same review process (a cluster of otherwise-unrelated method names all reported against the same one built-in string type)
- **Issue:** BBj's scope model binds an auto-declared variable's every later reference back to its FIRST assignment. An empty string is a common "not yet assigned" placeholder for such a variable, later reassigned to a real object -- but every later member call still traced its receiver's certainty back to the placeholder assignment, not the real one.
- **Fix:** The string-literal certainty branch now only trusts a non-empty string literal.
- **Files modified:** `check-unknown-java-member.ts`, `unknown-java-member.test.ts`
- **Verification:** Full corpus re-run: 99 -> 87 findings, all affected findings (one cluster of methods on the placeholder-typed variable) cleared, no new findings introduced.
- **Committed in:** `c0db75f7` (fix), preceded by `b481860c` (RED test)

**5. [Rule 1 - Bug] A variable reconstructed as a different class kept its first construction's certainty**
- **Found during:** Task 2, after shape 4's fix, a systematic scan of every remaining finding's receiver variable for more than one distinct constructed class assigned to the same name anywhere in its file
- **Issue:** The same first-assignment-is-the-declaring-occurrence scoping rule applies just as much to a `new SomeClass(...)` first assignment as to a string-literal one -- a variable first constructed as one class and later reconstructed as a genuinely different class still had every reference's receiver type traced back to the FIRST construction, misreporting members the SECOND class actually has as unknown on the first.
- **Fix:** Added `isReassignedToADifferentConstructedClass`, which scans the whole document for another assignment to the same variable name constructing a different class; when found, the first construction is no longer trusted.
- **Files modified:** `check-unknown-java-member.ts`, `unknown-java-member.test.ts`
- **Verification:** Full corpus re-run: 87 -> 76 findings, all affected findings (two distinct clusters, one variable reconstructed once, one reconstructed twice across a chain of related classes) cleared, no new findings introduced. A follow-up systematic scan over the final 76 findings for the same multi-construction shape found zero residual instances.
- **Committed in:** `cc7c37cf` (fix), preceded by `29c3efda` (RED test)

---

**Total deviations:** 5 auto-fixed (5 Rule 1 bugs, all found through the live-corpus review this plan's own Task 1/2 process is designed to run).
**Impact on plan:** All five were necessary to keep the check conservative -- each is a real mechanism by which a genuinely valid BBj program would have received a false Error. No scope creep: every fix stays inside the one check file, none touches a read-only file, and none weakens a 107-03 test.

## Classification of the remaining 76 findings

Every finding still present after all five guards was checked against its resolved receiver class's full method/field/nested-class list (case-insensitive, unfiltered by the static-only rule) and found to have no match at all -- class (a), genuinely unknown on this backend's currently-resolved classpath. In their own words, grouped by shape (counts, no class or member names, no file identifiers):

| Shape (own words) | Findings |
|---|---|
| A method or field name with no case-insensitive match anywhere on a well-resolved GUI/event proxy class (dozens of real methods/fields present, this one absent) | ~28 |
| A method name that looks like a plausible but non-existent API call in a small set of LLM-authored sample files (an AI-hallucinated method name) | 12 |
| A method/field name matching an older or newer version of a third-party charting/reporting library's API than the one this backend's classpath currently resolves, in a version-compatibility probe pattern with its own runtime error handler | 16 |
| A typo in a method name (transposed or dropped letters from a real, similarly-named method) | 4 |
| A method genuinely absent from a resolved class's real method list, called on that class through a record-oriented API method chain (one repeating shape, one cluster) | 11 |
| Other single-occurrence genuinely-missing members not fitting the above | 5 |

None of these shapes involve the check misattributing a finding to the wrong receiver class, matching a static member it filtered out, or matching a nested/nested-array member it does not model -- exactly the three signals the automated and manual review process checks for.

## Issues Encountered
None beyond the five deviations above, all resolved.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VAL-03's check is now reviewed against real class data across the full accepted corpus, with five newly-found false-positive shapes closed and pinned; the guard-case suite grew from 32 to 34 tests (unit) and the live functional suite from 4 to 5.
- Per the shared-ID gate, VAL-03 is declared by this plan and by 107-03/107-06 -- it is intentionally NOT marked complete in REQUIREMENTS.md here.
- 107-06's own noise-classification job (the harness's own test-double-driven A2 count, ~7,390 entries from 107-03's summary) is a separate, harness-only concern from this plan's live-backend review; this plan's live probe and its five guards are additional, real fixes that also reduce that harness noise indirectly (the same guards apply regardless of which backend resolves the classes), but 107-06's own classification of the harness's remaining test-double artifacts is still its job.
- No blockers for 107-06.

## Self-Check: PASSED

All modified files verified present on disk with the expected content. All ten commit hashes (`c6ee911d`, `1988923d`, `6cea0c36`, `f99eeea9`, `49efc21f`, `a19ee72d`, `b481860c`, `c0db75f7`, `29c3efda`, `cc7c37cf`) verified in `git log`. `npx tsc -p tsconfig.json --noEmit` passes clean. Whole suite (`RUN_BBJ_TESTS=0 --maxWorkers=2`) reports `numFailedTests=0` across 2728 tests. Live functional file (`RUN_BBJ_TESTS=1`) reports 5/5 passed, not skipped. `bbj-scope.ts`, `bbj-linker.ts`, `java-interop.ts`, `bbj-test-module.ts` and `package.json` are byte-identical to the phase base (`git diff --stat` empty for all four). Register check (planning-identifier grep) and leak guard both clean on every changed file's final diff. `git status --porcelain` in this repository shows no trace of the probe script or any of its run outputs (all live in the corpus repository's untracked snapshots folder).

## Self-Check: PASSED (automated)

Files and all ten commit hashes independently re-verified present via `[ -f ]` and `git log --oneline --all | grep` immediately before this commit.

---
*Phase: 107-validation-false-alarms-silent-skips*
*Completed: 2026-09-25*
