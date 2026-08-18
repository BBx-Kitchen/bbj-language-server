---
phase: 65-cross-cutting-security-audit
plan: 02
subsystem: security-review
tags: [em-token, secretstorage, passwordsafe, jwt-expiry, credential-lifecycle, security-audit]

# Dependency graph
requires:
  - phase: 65-01
    provides: "the frozen 65-COVERAGE.md skeleton, the closed SEC-04 enumeration register (7 sites), the Inherited Findings Ledger's 6 SEC-04 rows, and the allocated finding-ID sequence starting at P65-D1-002"
  - phase: 62-vscode-extension-review
    provides: "P62-D1-004 (extension.ts's EM token process-argument exposure and log-masking fragility)"
  - phase: 63-intellij-plugin-review
    provides: "P63-D1-003/004/005 (IntelliJ's process-argument exposure, fail-open expiry decode, temp-file permission gap)"
  - phase: 64-build-ci-dependency-review
    provides: "P64-D1-001/002 (web.bbj admin-credential fallback, em-login.bbj plaintext-token file write)"
provides:
  - ".planning/reviews/65-COVERAGE.md §## SEC-04 — EM token lifecycle end to end, closed: 28/28 items verdicted (7 sites × 4 stages), two new findings"
  - "P65-D1-002 — cross-IDE at-rest asymmetry: VS Code's SecretStorage binding is platform-fixed, IntelliJ's PasswordSafe backend is user-configurable to a KeePass file or memory-only with no code-level pin"
  - "P65-D1-003 — VS Code's isTokenExpired (extension.ts) independently exhibits the identical fail-open decode shape already recorded on the IntelliJ side as P63-D1-004, previously unowned"
  - "The token-as-process-argument question settled once for the whole phase (D-07), with its owning verdict lines and discharging IDs named for 65-03/SEC-05 to cross-reference"
affects: [65-03-process-spawn-and-close-out, 68-documentation-assembly, 69-issue-filing]

actuals:
  tokens: 12722
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: [stage-by-stage-task-split-not-module-split, two-IDE-comparison-as-first-class-record, agreement-vs-asymmetry-under-D-12-D-04]

key-files:
  created: []
  modified:
    - .planning/reviews/65-COVERAGE.md

key-decisions:
  - "Confirmed (via bbj-intellij/build.gradle.kts's copyWebRunner task) that bbj-vscode/tools/em-login.bbj and em-validate-token.bbj are literally the same source files bundled into the IntelliJ plugin at build time — both IDEs spawn the identical script, not per-IDE copies, which is why the register counts 7 sites rather than 9"
  - "Recorded the at-rest comparison as a genuine asymmetry (P65-D1-002): both IDEs delegate to a platform credential service (agreement, D-12), but IntelliJ's PasswordSafe backend is user-configurable down to a KeePass file or memory-only via an IDE-wide setting outside the plugin's knowledge, while VS Code's SecretStorage binding is fixed by the platform with no equivalent lever — an asymmetry only visible by reading both sides' storage APIs side by side (D-04 justification 2)"
  - "Recorded the expiry comparison as a genuine agreement, not an asymmetry (D-12): both sides run an identical fail-open client-side JWT exp-claim decode followed by an identical mandatory, unconditional server round trip through the one shared em-validate-token.bbj script for every currently-used run path; no divergence was found between the two IDEs on this stage"
  - "Filed P65-D1-003 for VS Code's extension.ts:isTokenExpired despite the two-IDE agreement on this stage, because no P62-D1-* record ever evaluated this function's fail-open shape as a security concern (Phase 62's own D8 check only confirmed the docstring matches the implementation) — the gap is between the VS-Code-scoped review (Phase 62) and the IntelliJ-scoped review (Phase 63), neither of which could see it alone (D-04 justification 1), not a duplicate of P63-D1-004 since the evidence and location are a different file"
  - "Declined to file a third finding for BbjRunActionBase.java's shared validateTokenServerSide temp file: P63-D1-005 already names this call site, but this sweep's own at-rest/exposure verdicts for BbjRunBuiAction.java/BbjRunDwcAction.java state precisely that this particular temp file carries only the non-secret VALID/INVALID marker (not the token) — a scope precision on an existing finding, not a disagreement requiring a new ID or an edit to the closed Phase 63 record"
  - "Declined to file a fourth finding for a similar imprecision in P64-D1-002's own prose (which describes em-validate-token.bbj:8-9 as reading the token 'the same way' as a file read, when both lines are in fact ARGV reads) — stated the precise fact in em-validate-token.bbj's exposure verdict instead, since it changes no severity/classification/disposition of the closed Phase 64 finding"

requirements-completed: [SEC-04]

duration: ~55min
completed: 2026-08-18
status: complete
---

# Phase 65 Plan 02: SEC-04 EM Token Lifecycle Summary

**Closed SEC-04 (EM token lifecycle end to end) across all 7 enumerated sites and all 4 lifecycle stages — 28/28 items verdicted — with the two comparisons ROADMAP criterion 3 demands answered as comparisons: a genuine at-rest asymmetry between VS Code's fixed SecretStorage and IntelliJ's user-configurable PasswordSafe (P65-D1-002), and a genuine expiry-handling agreement between both IDEs' identical fail-open-decode-plus-mandatory-server-round-trip composition (P65-D1-003 covers VS Code's independently unowned instance of the same decode weakness).**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-18T17:25:00Z (approx.)
- **Completed:** 2026-08-18T18:23:00Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/65-COVERAGE.md`)

## Accomplishments

- Re-derived the SEC-04 site denominator live at both tasks' execution time (`grep -rln 'EMToken\|emToken\|EM_TOKEN\|em\.token' bbj-vscode/src bbj-intellij/src` unioned with the two `.bbj` scripts) — 7 sites, no drift from `65-01`'s D-02 baseline
- Resolved all 14 acquisition/at-rest verdicts (Task 1) and all 14 exposure/expiry verdicts (Task 2) with `file:line` evidence, correctly distinguishing sites that acquire/persist a secret from sites that merely delegate to or read from another site's acquisition/storage
- Wrote the at-rest comparison as a comparison: both IDEs delegate to a platform credential service (agreement), but IntelliJ's backend is user-configurable to a weaker guarantee with no code-level pin (asymmetry) — new finding `P65-D1-002`
- Wrote the expiry comparison as a comparison: identical fail-open client decode, identical mandatory server round-trip backstop on both sides, no divergence found — recorded as agreement per D-12, with VS Code's own previously-unowned instance of the fail-open decode recorded separately as `P65-D1-003`
- Confirmed via `bbj-intellij/build.gradle.kts` that both IDEs spawn the literal same `em-login.bbj`/`em-validate-token.bbj` source files (bundled at build time from `bbj-vscode/tools/`), grounding several cross-references
- Completed the `### Lifecycle Matrix`, verified cell-for-cell against `### Verdicts` (all 28 cells agree)
- Cross-referenced all 6 ledger rows naming SEC-04 (`P62-D1-004`, `P63-D1-003`, `P63-D1-004`, `P63-D1-005`, `P64-D1-001`, `P64-D1-002`) and stated the D-07 handoff of the token-as-process-argument question to `65-03`/SEC-05 explicitly, by verdict line and discharging ID
- Discharged the four-part stopping rule in `### Surface closure` and closed SEC-04

## Task Commits

Each task was committed atomically:

1. **Task 1: SEC-04 acquisition and storage-at-rest across every enumerated site, with the SecretStorage vs BbjEMTokenStore comparison** - `85af48b` (feat)
2. **Task 2: SEC-04 exposure and expiry across every enumerated site — owning the token-as-process-argument question — and close the surface** - `4e1625c` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified

- `.planning/reviews/65-COVERAGE.md` - `## SEC-04` section filled and closed: `### Enumeration`, `### Verdicts` (28 lines), `### Lifecycle Matrix`, `### Findings` (`P65-D1-002`, `P65-D1-003`), `### Not-reproducible dispositions` (empty, correctly), `### Cross-references`, `### Surface closure`

## Decisions Made

See `key-decisions` in frontmatter. In brief: (1) confirmed both IDEs bundle the identical `.bbj` scripts rather than per-IDE copies; (2) at-rest comparison yielded a genuine cross-IDE asymmetry (new finding); (3) expiry comparison yielded a genuine cross-IDE agreement, but VS Code's own instance of the shared decode weakness was still unowned and was filed as its own finding; (4) two precision notes on existing closed findings' scope were written into verdict text rather than spun into new findings or edits to immutable files, since neither changes the underlying finding's validity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Substituted the anchored D-14 disclosure-marker gate for the plan's own unanchored literal**
- **Found during:** Task 1's acceptance-criteria verification pass
- **Issue:** Task 1's (and Task 2's) plan-specified automated verify script computes the `critical`/`high` severity vs. `Disclosure-limited per D-14` marker identity using the unanchored `grep -cF "Disclosure-limited per D-14" "$f"` form. `65-COVERAGE.md`'s own header (`## Stopping Rule & Write Contract` § "Two self-reference hazards") explicitly documents that this unanchored form is inflated by the header's own prose (which quotes the marker for illustration) and states that "all three plans use the anchored form" — the file's own committed content anticipates and licenses exactly this substitution.
- **Fix:** Ran the anchored comparison (`^severity:[[:space:]]+(critical|high)` vs. `^evidence:[[:space:]]+Disclosure-limited per D-14`) in place of the plan's literal unanchored one when self-verifying both tasks; both are `0 = 0` for this plan (no `critical`/`high` findings were recorded). No edit to the coverage file was needed — this was purely a verification-script substitution, matching `65-01`'s own precedent for the identical hazard.
- **Files modified:** None (verification-only; no content change).
- **Verification:** Both tasks' full acceptance-criteria scripts pass with the anchored substitution.
- **Committed in:** N/A (no content change to commit).

**Total deviations:** 1 auto-fixed (a verification-script substitution the file's own header explicitly licenses, not a content bug).
**Impact on plan:** None — no scope creep, no edit to any immutable file, no change to either task's actual deliverable.

## Issues Encountered

- **Bash/grep interaction:** the very first attempt to run the full combined acceptance-criteria one-liner (copied verbatim from the plan) via a single `bash -c '...'` call hung indefinitely; isolating each sub-check individually showed every one completing in well under a second. The one-liner was re-run as a standalone script file instead, which completed normally. No content or logic issue — attributed to shell-quoting/escaping interaction with the very long single-quoted string, not to the regex patterns themselves (each was independently confirmed fast).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `## SEC-04` is closed: 28/28 enumerated items verdicted, `### Lifecycle Matrix` complete and cell-consistent, both comparisons ROADMAP criterion 3 names answered as comparisons, four-part stopping rule discharged.
- `P65-D1-002` and `P65-D1-003` are allocated; the next allocation in this phase is `P65-D1-004`.
- The token-as-process-argument question is settled once, with its owning verdict lines (`BbjRunBuiAction.java`/`BbjRunDwcAction.java`/`extension.ts` token legs, `BbjEMLoginAction.java` password leg, `em-login.bbj` receiving-end leg) and discharging IDs (`P63-D1-003`, `P62-D1-004`, `P64-D1-002`) named for `65-03`/SEC-05 to cross-reference by ID under D-07, rather than re-recording.
- SEC-04 is the third of REQUIREMENTS.md's four `SEC-*` items this phase owns to be marked complete; only SEC-05 remains open, for `65-03`.
- No blockers. `git status --porcelain` over every reviewed tree and all five immutable planning records is empty.

---
*Phase: 65-cross-cutting-security-audit*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `.planning/reviews/65-COVERAGE.md`
- FOUND: `.planning/phases/65-cross-cutting-security-audit/65-02-SUMMARY.md`
- FOUND: commit `85af48b` (Task 1)
- FOUND: commit `4e1625c` (Task 2)
