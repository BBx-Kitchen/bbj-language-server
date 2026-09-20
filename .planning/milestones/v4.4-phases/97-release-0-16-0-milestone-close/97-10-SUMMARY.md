---
phase: 97-release-0-16-0-milestone-close
plan: 10
subsystem: infra
tags: [release, smoke-test, qa, github-releases, vs-code-marketplace, jetbrains-marketplace]

requires:
  - phase: 97-release-0-16-0-milestone-close (plans 97-08, 97-09)
    provides: the published v0.16.0 release assets (sha256, run id, released commit) and the applied curated release notes this smoke run is tied to
provides:
  - A dated, pre-filled smoke checklist copy tied to the released artifacts' identity, completed and renamed with its result suffix
  - A recorded smoke verdict (PASS) tied to both asset hashes, the workflow run id, and the released commit
  - The explicit, verifier-readable roadmap-criterion-3 override statement for the JetBrains side
affects: [97-11]

actuals:
  tokens: 3000
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns: ["96-08 UAT-record shape reused for the D-16 smoke verdict"]

key-files:
  created:
    - QA/test-runs/2026-09-20-smoke-test-PASS.md
    - .planning/phases/97-release-0-16-0-milestone-close/97-SMOKE-VERDICT.md
  modified: []

key-decisions:
  - "Maintainer's overall reply \"pass\" (no per-row marks) is recorded as marking all ten checklist rows [x], with the record stating explicitly that the basis is the overall reply, not individually confirmed per-row results."
  - "Per D-17, no finding was reported, so there is nothing to classify — recorded as \"no findings — classification not applicable\" rather than either D-17 branch."
  - "Test Information fields not stated by the maintainer (OS, IntelliJ version) are filled from evidence recorded elsewhere in this phase (97-UAT-ARTIFACTS.md Round 1 log paths) and labeled with that source; VS Code version is recorded as \"not stated\" rather than invented."
  - "Roadmap success criterion 3 is recorded as met as written for VS Code and met via the D-14 recorded override (GitHub Release zip, upload-accepted = live) for JetBrains — not reported as met verbatim, per the plan's own instruction to the verifier."

patterns-established: []

requirements-completed: [REL-01]

coverage:
  - id: D1
    description: "Dated smoke checklist copy completed by the maintainer and renamed with its PASS/FAIL result suffix, tied to the released artifacts' identity"
    requirement: REL-01
    verification:
      - kind: manual_procedural
        ref: "QA/test-runs/2026-09-20-smoke-test-PASS.md"
        status: pass
    human_judgment: true
    rationale: "The smoke test itself is a hand run of both IDEs by the maintainer (D-15) — no automation can substitute for the human verification it records."
  - id: D2
    description: "Smoke verdict recorded against both released asset hashes, run id, and released commit, with the classification and criterion-3 override stated explicitly"
    requirement: REL-01
    verification:
      - kind: other
        ref: "grep -cE '[0-9a-f]{64}' .planning/phases/97-release-0-16-0-milestone-close/97-SMOKE-VERDICT.md (2)"
        status: pass
      - kind: other
        ref: "ls QA/test-runs/*-smoke-test-(PASS|FAIL).md"
        status: pass
      - kind: other
        ref: "gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '.open_issues' (19, unchanged)"
        status: pass
    human_judgment: false

duration: ~15min (continuation; Task 1 and Task 2 prior)
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 10: v0.16.0 Smoke Verification Summary

**The maintainer smoke-tested both released v0.16.0 artifacts by hand and replied "pass"; the verdict is now recorded against both asset hashes, the workflow run, and the released commit, with the roadmap criterion-3 override for JetBrains stated explicitly.**

## Performance

- **Duration:** ~15 min (this continuation covered Task 3 only; Tasks 1-2 completed in a prior session)
- **Tasks:** 3 (1 prior, 1 human checkpoint answered inline, 1 this session)
- **Files modified:** 2 (1 renamed+edited, 1 created)

## Accomplishments
- Filled in the pre-filled smoke checklist copy with the maintainer's overall PASS verdict, marking all ten rows `[x]` on the explicit basis of that overall reply, and recorded the Test Information fields with their evidence sources labeled.
- Renamed the completed checklist to `QA/test-runs/2026-09-20-smoke-test-PASS.md` per the checklist's own instructions.
- Wrote `97-SMOKE-VERDICT.md`, tying the PASS verdict to both released asset sha256 values, byte sizes, the workflow run id, and the released commit SHA, in the 96-08 UAT-record shape.
- Recorded the D-17 classification as "no findings — classification not applicable" since the maintainer's reply carried no per-row failure.
- Stated the roadmap success-criterion-3 override explicitly: met as written for VS Code, met via the recorded D-14 override for JetBrains — not to be reported as met verbatim.
- Confirmed milestone #7 unchanged at 19 open / 2 closed issues (no new issue was filed, since there were no findings to file).

## Task Commits

Each task was committed atomically:

1. **Task 1: Prepare the filled-in smoke checklist copy** - `88ac46fa` (docs, prior session)
2. **Task 2: Maintainer runs the smoke checklist** - checkpoint answered inline by the maintainer ("pass"); no separate commit (human verification step)
3. **Task 3: Record the smoke verdict against artifact identity** - `d87ecc12` (fill in and rename the checklist copy), `ccfdff3b` (write 97-SMOKE-VERDICT.md)

**Plan metadata:** (this commit)

## Files Created/Modified
- `QA/test-runs/2026-09-20-smoke-test-PASS.md` - The completed, renamed smoke checklist copy: all ten rows marked, Test Run Result marked PASS, Test Information filled with source-labeled values.
- `.planning/phases/97-release-0-16-0-milestone-close/97-SMOKE-VERDICT.md` - The verdict record tying the PASS outcome to both asset hashes, the workflow run id, the released commit, the per-row table, the criterion-3 override statement, the D-17 classification, and what was deliberately not done.

## Decisions Made
- The maintainer gave one overall verdict ("pass"), not ten independent row confirmations. Rather than leaving the ten result cells ambiguous, they are marked `[x]` on the explicit, stated basis of the overall reply — the record says so in plain language so a later reader cannot mistake it for ten independently confirmed results.
- Test Information fields the maintainer did not state (OS, IntelliJ version) are filled from evidence already on record elsewhere in this phase (the Round 1 hand-UAT log paths in `97-UAT-ARTIFACTS.md`, which show a macOS path under IntelliJ IDEA 2026.2), with that source cited inline rather than left blank or invented outright. VS Code version is recorded as "not stated" since no equivalent evidence exists for it.
- The two optional 0.16.0-specific glance checks (no BBj page under Color Scheme; no `bbjcplAvailability` WARN) are recorded as "not reported" — they were suggested extras, not part of the ten numbered checklist rows, and the maintainer did not report on them either way.
- Per D-17, "no findings" is not the same as "non-blocking findings" — it is recorded as its own outcome ("no findings — classification not applicable") rather than forced into either of D-17's two branches, since D-17's branches presuppose at least one finding to classify.

## Deviations from Plan

None - plan executed exactly as written. The resume instructions directed filling and renaming the checklist and recording the verdict; both were completed with the maintainer's verbatim reply as the sole source of the pass verdict, and no invented data was added anywhere in either file.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

REL-01 is now ready to mark complete: all ten declaring plans (97-01 through 97-10) now carry a SUMMARY.md. This plan's execution marks REL-01 complete in REQUIREMENTS.md as part of its state update.

REL-02 (milestone #7 closure) remains for plan 97-11, which is not started by this plan. Milestone #7 stands at 19 open / 2 closed issues, unchanged and ready for the closing pass.

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*
