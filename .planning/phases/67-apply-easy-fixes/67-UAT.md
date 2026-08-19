---
status: testing
phase: 67-apply-easy-fixes
source: [67-VERIFICATION.md]
started: 2026-08-19
updated: 2026-08-19
---

## Current Test

number: 2
name: Triage disposition of Critical finding CR-01
expected: |
  Human agrees the unvalidated `bbj.home` -> `spawn()` exposure is P61-D1-003, a D1-classified
  major-refactor finding that Phase 67's own D-05 rule forbids re-triaging — correctly left
  untouched by this phase and now flagged at true severity for Phase 68/69 to prioritize.
awaiting: user response

## Tests

### 1. Residual risk from the 6 newly-introduced Warnings
expected: A human accepts the residual risk as documented and narrow-trigger, or requires follow-up action (fast-follow fix or filed issues). The phase goal requires fixes be applied "as a low-risk change"; these six were introduced by this phase's own commits and none is exercised by the regression tests those same commits added.

  - WR-01 `java-interop.ts` — LRU cache eviction can race its own cyclic resolution
  - WR-02 `java-interop.ts` — stale connection listener can clobber a healthy reconnect
  - WR-03 `bbj-completion-provider.ts` — shared mutable cancellation token across concurrent requests
  - WR-04 `bbj-lexer.ts` — split widened to also break on bare `\r`, beyond the stated CRLF/LF scope
  - WR-05 `document-formatter.ts` — stale-content risk in the shared in-flight format promise
  - WR-06 `decompile-io.ts` — mtime-truncation false negative in the `.lst` freshness gate

  WR-02 and WR-04 were independently confirmed real and phase-introduced by both the orchestrator and the verifier.
result: pass
reported: "Yes fix WR-02 and WR-04 and file the other into the list for next phase, they should become issues at github to address individually."
disposition: |
  Human required follow-up action rather than accepting the residual risk as-is. The follow-up
  is complete:

  - WR-02, WR-04 -- fixed in-phase (commit 8194248). Each carries a regression test verified to
    FAIL against the un-fixed code and pass after. Full suite unchanged from 67-BASELINE.md:
    11 failures, all in linking.test.ts "Interop related tests" (no reachable :5008).
  - WR-01, WR-03, WR-05, WR-06 -- deferred to the next phase and filed individually on GitHub
    with the Phase 69 label convention (area + PRIO + effort):
      WR-01 -> #497 (bug, vscode, PRIO 2, 8)
      WR-03 -> #498 (bug, vscode, PRIO 2, 4)
      WR-05 -> #499 (bug, vscode, PRIO 3, 2)
      WR-06 -> #500 (bug, vscode, PRIO 2, 4)

  Dispositions are recorded inline against each finding in 67-REVIEW.md.

### 2. Triage disposition of Critical finding CR-01
expected: Human agrees the unvalidated `bbj.home` → `spawn()` exposure is P61-D1-003, a D1-classified major-refactor finding that Phase 67's own D-05 rule forbids re-triaging — correctly left untouched by this phase and now flagged at true severity for Phase 68/69 to prioritize.
result: [pending]

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

[none]

## Deferred Follow-Ups

<!-- Not gaps: approved follow-up work routed to the next phase, filed individually on GitHub. -->
- test: 1
  idea: "WR-01 -- LRU cache can evict a class registration still needed by its own in-flight cyclic resolution"
  issue: 497
  deferred_at: 2026-08-19
- test: 1
  idea: "WR-03 -- activeCancelToken is shared mutable singleton state, not threaded per-request"
  issue: 498
  deferred_at: 2026-08-19
- test: 1
  idea: "WR-05 -- shared in-flight format promise can apply a stale full-document replacement"
  issue: 499
  deferred_at: 2026-08-19
- test: 1
  idea: "WR-06 -- .lst freshness gate can hang for the full 20s timeout on coarse-mtime filesystems"
  issue: 500
  deferred_at: 2026-08-19
