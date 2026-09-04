---
status: testing
phase: 79-edt-responsiveness
source: [79-VERIFICATION.md]
started: 2026-09-04T10:49:31Z
updated: 2026-09-04T10:49:31Z
---

## Current Test

number: 1
name: Settings dialog keeps the persisted classpath entry across reset() while a home-path lookup is in flight
expected: |
  The previously-persisted classpath entry stays selected (or is silently re-applied) across the reset()-then-lookup window; isModified() never reports a spurious change and apply() never overwrites the stored entry with an empty string.
awaiting: user response

## Tests

### 1. Settings dialog keeps the persisted classpath entry across reset() while a home-path lookup is in flight
steps: Open the Settings dialog, set a valid BBj home with a classpath entry already selected, close and reopen the dialog (or trigger reset()) while the home-path background lookup is still in flight, and confirm the classpath combo does not visibly reset to empty/placeholder before the lookup lands.
expected: The previously-persisted classpath entry stays selected (or is silently re-applied) across the reset()-then-lookup window; isModified() never reports a spurious change and apply() never overwrites the stored entry with an empty string.
why_human: pendingClasspathSelection preservation across a real Settings-dialog open/reset()/apply() cycle is asserted only by source-guard text checks and by construction (no BasePlatformTestCase harness exists in this repo); 79-02-SUMMARY.md marks this human_judgment.
result: [pending]

### 2. Run As BUI/DWC and EM login still succeed with the off-EDT assertion in place
steps: In a running IDE build, invoke Run As BUI, Run As DWC, and Login to Enterprise Manager, and confirm they still complete successfully (no new failure, no new dialog, no logged assertion error) now that assertIsNonDispatchThread() runs on both paths.
expected: Both paths behave exactly as before; the assertion is a diagnostic tripwire on an already-correct off-EDT path and must not become a new way for either action to fail.
why_human: The assertion only fires meaningfully inside a real IDE platform (isDispatchThread() semantics); the plain-JUnit classpath used by this repo's tests has no platform runtime to exercise it end-to-end; 79-03-SUMMARY.md marks this human_judgment.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
