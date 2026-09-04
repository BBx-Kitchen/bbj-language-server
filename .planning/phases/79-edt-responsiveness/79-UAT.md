---
status: complete
phase: 79-edt-responsiveness
source: [79-01-SUMMARY.md, 79-02-SUMMARY.md, 79-03-SUMMARY.md, 79-REVIEW-FIX.md]
started: 2026-09-04T10:49:31Z
updated: 2026-09-04T12:06:06Z
---

## Current Test

[testing complete]

## Tests

### 1. Settings dialog keeps the persisted classpath entry across reset() while a home-path lookup is in flight
steps: Open the Settings dialog, set a valid BBj home with a classpath entry already selected, close and reopen the dialog (or trigger reset()) while the home-path background lookup is still in flight, and confirm the classpath combo does not visibly reset to empty/placeholder before the lookup lands.
expected: The previously-persisted classpath entry stays selected (or is silently re-applied) across the reset()-then-lookup window; isModified() never reports a spurious change and apply() never overwrites the stored entry with an empty string.
why_human: pendingClasspathSelection preservation across a real Settings-dialog open/reset()/apply() cycle is asserted only by source-guard text checks and by construction (no BasePlatformTestCase harness exists in this repo); 79-02-SUMMARY.md marks this human_judgment.
coverage_id: 79-02 D3
result: pass

### 2. Run As BUI/DWC and EM login still succeed with the off-EDT assertion in place
steps: In a running IDE build, invoke Run As BUI, Run As DWC, and Login to Enterprise Manager, and confirm they still complete successfully (no new failure, no new dialog, no logged assertion error) now that assertIsNonDispatchThread() runs on both paths and validateBeforeRun() moved into the pooled lambda (review fix CR-01).
expected: Both paths behave exactly as before; the assertion is a diagnostic tripwire on an already-correct off-EDT path and must not become a new way for either action to fail. Validation failures (e.g. missing BBj home) still surface as before.
why_human: The assertion only fires meaningfully inside a real IDE platform (isDispatchThread() semantics); the plain-JUnit classpath used by this repo's tests has no platform runtime to exercise it end-to-end; 79-03-SUMMARY.md marks this human_judgment.
coverage_id: 79-03 D3
result: pass

### 3. Apply immediately after typing a new BBj home persists a classpath derived from the new home
steps: In Settings, type a different valid BBj home path and click Apply/OK within the ~300 ms debounce window (before the classpath combo re-enables). Reopen Settings and check the persisted classpath entry.
expected: The persisted classpath entry belongs to the newly-typed home, not the previous one; the brief synchronous flush on Apply is not perceptible as a hang. Typing alone (without Apply) still does no filesystem work per keystroke.
why_human: Review fix WR-03 (commit b7c41f8) added flushPendingHomeLookup() before apply() reads the classpath; 79-REVIEW-FIX.md flags it "fixed: requires human verification" since no unit harness covers BbjSettingsConfigurable.
result: pass

### 4. Every language-server restart trigger goes through the single guarded entry point
expected: requestRestart(long) is the single guarded entry point; every one of the eight restart triggers reaches the language server only through it
result: pass
source: automated
coverage_id: 79-01 D1

### 5. Overlapping restart requests coalesce into exactly one stop+start
expected: Two overlapping restart requests within one pending window produce exactly one stop+start; adjacency, ordering, and zero-delay edges all coalesce correctly through RestartGate
result: pass
source: automated
coverage_id: 79-01 D2

### 6. First-crash auto-restart delay is scheduled off the EDT
expected: The first-crash auto-restart delay (1000 ms) is scheduled on the restart gate's pooled-thread Alarm instead of blocking the EDT inside Thread.sleep; no EDT sleep remains in BbjServerService
result: pass
source: automated
coverage_id: 79-01 D3

### 7. node --version is memoized per path, keyed on file stat
expected: BbjNodeVersionCache memoizes node --version per path keyed on lastModified+length; unchanged path spawns once, stat change re-spawns, null result cached, one entry per path
result: pass
source: automated
coverage_id: 79-02 D1

### 8. Keystroke burst produces exactly one background lookup with staleness discard and EDT refusal
expected: A rapid keystroke burst produces zero lookups until the scheduler fires, then exactly one carrying the last text; coalescing uses cancel(pending) never cancelAll(); stale results are discarded; a pending task refuses to run on the EDT
result: pass
source: automated
coverage_id: 79-02 D2

### 9. Two near-simultaneous Node.js download requests start exactly one download
expected: Exactly one download task starts; the loser gets the same balloon and still has its onComplete callback run on the EDT when the winning download finishes
result: pass
source: automated
coverage_id: 79-03 D1

### 10. Persisted download in-progress flag is gone
expected: In-progress state is in-memory only, so an IDE killed mid-download leaves nothing behind
result: pass
source: automated
coverage_id: 79-03 D2

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
