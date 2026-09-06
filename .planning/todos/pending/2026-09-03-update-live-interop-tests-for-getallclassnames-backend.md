---
created: 2026-09-03
title: Update live-interop tests for the upgraded java-interop backend (getAllClassNames)
area: testing
severity: minor
files:

  - bbj-vscode/test/functional/issue447-real-interop.test.ts:39
  - bbj-vscode/test/linking.test.ts:296-420 (Interop related tests)

audit_acknowledged:
  milestone: v4.1
  at: 2026-09-03
---

## Problem

The java-interop service on `127.0.0.1:5008` now exposes `getAllClassNames` (probe on 2026-09-03
returned 90,086 names). Two live-interop vitest suites encode the old backend's shape and fail
deterministically against it, independent of any language-server change:

- `test/functional/issue447-real-interop.test.ts` — "capability detection: current server lacks
  getAllClassNames and degrades gracefully" asserts `ensureCompleteClassIndex()` is `false`; it is now `true`.
- `test/linking.test.ts` — all 11 "Interop related tests" fail with
  `Could not resolve reference to NamedElement 'toString'` etc. (`java.lang.Object` and
  `java.util.LinkedList` resolve fine when probed directly, so the failure is in the LS code path taken
  when a complete class index is available, or in test warm-up — see memory
  `java-interop-cold-resolution-gotcha`).

CI never runs these (BBj unreachable there), so the drift is only visible locally. Whole-suite locally:
1102/1160 passed, 12 failed (these), 46 skipped; build and IntelliJ suite green.

## Not a phase 77 regression

Phase 77 changed only `document-formatter.ts`, `formatter-verifier.ts` and four formatter test files.
Confirmed by direct probe of :5008 during the phase 77 regression gate; maintainer chose
"continue to verification" on 2026-09-03.

## Fix

Rewrite the issue447 capability test to cover both backend shapes (or gate on a live probe), and
investigate why linking's interop tests fail with a complete class index present.
