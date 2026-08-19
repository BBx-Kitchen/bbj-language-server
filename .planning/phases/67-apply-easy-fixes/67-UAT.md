---
status: testing
phase: 67-apply-easy-fixes
source: [67-VERIFICATION.md]
started: 2026-08-19
updated: 2026-08-19
---

## Current Test

number: 1
name: Accept or reject the residual risk from the 6 code-review Warnings introduced by this phase
expected: |
  A human (not an LLM judgment) either accepts the residual risk as documented and
  narrow-trigger, or requires follow-up action — a fast-follow fix, or issues filed
  before the phase is considered fully closed.
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
result: [pending]

### 2. Triage disposition of Critical finding CR-01
expected: Human agrees the unvalidated `bbj.home` → `spawn()` exposure is P61-D1-003, a D1-classified major-refactor finding that Phase 67's own D-05 rule forbids re-triaging — correctly left untouched by this phase and now flagged at true severity for Phase 68/69 to prioritize.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
