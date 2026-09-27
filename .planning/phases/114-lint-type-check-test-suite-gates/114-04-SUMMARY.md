---
phase: 114-lint-type-check-test-suite-gates
plan: "04"
subsystem: testing
tags: [vitest, java-interop, wire-recording, fake-peer, issue-447]

# Dependency graph
requires:
  - phase: 114-05
    provides: "eslint.config.js recommended preset + overrides this plan's file is checked against"
  - phase: 114-07
    provides: "the working tsconfig.test.json / typecheck:test gate this plan's file is checked against"
provides:
  - "bbj-vscode/test/functional/issue447-real-interop.test.ts: a definitive live capability test, a live forced-fallback test, an ungated hermetic forced-fallback pair, and the kept code-action test — no tautological assertion, no src/ change"
affects: [114-13]

actuals:
  tokens: 4060
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "WireRecordingInteropService (test-only subclass overriding the protected wrapSocket seam): wraps the real MessageConnection in a Proxy that records every sendRequest's {method, params, outcome} and can force a named method to answer MethodNotFound without ever touching the socket, so a live test judges client behaviour against what was actually observed on the wire instead of an invariant that holds by construction"
    - "Three-layer confidence structure for one capability guard: a definitive live test (judges the real backend's actual answer), a live forced-fallback test (forces the failure branch against the real backend via the same wrapSocket seam), and an ungated hermetic forced-fallback pair (the scriptable fake peer, always MethodNotFound, runs everywhere including CI)"

key-files:
  modified:
    - bbj-vscode/test/functional/issue447-real-interop.test.ts

key-decisions:
  - "Per RESEARCH Open Question 1, used the existing protected wrapSocket() seam (option b) in a test-only WireRecordingInteropService subclass, not a new protected latch-setter on JavaInteropService (option a) — this exercises the real METHOD_NOT_FOUND detection in ensureCompleteClassIndex rather than bypassing it, and adds zero lines to src/ (confirmed via a diff-quiet check against the plan's own starting commit)."
  - "The hermetic forced-fallback case needed no special peerscripting: FakePeerInteropService (fake-interop-peer.ts) already answers getAllClassNames with a MethodNotFound-shaped rejection unconditionally, so createFakePeerServices() alone (peerUp=true, connectDelayMs=0) is a ready-made forced-fallback double; no change to fake-interop-peer.ts was needed."
  - "WireRecordingInteropService's Proxy delegates every property except sendRequest straight to the real connection object returned by super.wrapSocket(socket) via Reflect.get, binding functions to the real target — this keeps listen()/onClose()/onError()/dispose() etc. working exactly as the unwrapped connection would, with sendRequest the only interception point."
  - "The definitive test branches on the recorded outcome of the live backend's own getAllClassNames answer (fulfilled-with-array vs rejected-with-METHOD_NOT_FOUND) rather than asserting one fixed answer, because which branch the deployed backend takes is an environment fact, not a product invariant — matching the original test's own stated intent, but now proven from an independent wire observation instead of the client's self-reported cache flag."

requirements-completed: [FIX-04]
# FIX-04's frontmatter is declared only by 114-03 (closed) and this plan; 114-13's own
# frontmatter declares TEST-01/TEST-02/TEST-07 only (it mentions FIX-04 in prose, closing the
# todo, but does not declare it). requirements.ready-ids confirmed 1/1 ready with both
# declaring plans done, and requirements.mark-complete applied it to REQUIREMENTS.md.

coverage:
  - id: D1
    description: "A hermetic, ungated forced-fallback pair (always runs, including CI with nothing on :5008) pins the getAllClassNames MethodNotFound latch and the curated-package getClassInfo probe deterministically, proven to have teeth by a mutation probe against the real comparison in ensureCompleteClassIndex"
    requirement: FIX-04
    verification:
      - kind: unit
        ref: "test/functional/issue447-real-interop.test.ts#Issue #447 - forced fallback with no backend (hermetic) a getAllClassNames MethodNotFound latches once and the candidate probe still resolves java.util.HashMap"
        status: pass
      - kind: unit
        ref: "test/functional/issue447-real-interop.test.ts#Issue #447 - forced fallback with no backend (hermetic) a seeded index answers without probing"
        status: pass
      - kind: other
        ref: "Mutation probe: java-interop.ts's METHOD_NOT_FOUND comparison in ensureCompleteClassIndex changed to a value that can never match e -> the hermetic latch test above failed (AssertionError: expected length 1, got 2); reverted via git checkout, confirmed clean against the plan's starting commit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Against the live backend, the class-index capability is judged from the request actually observed on the wire (via a WireRecordingInteropService wrapping the real connection), and a forced MethodNotFound drives the real fallback latch and probe against the real classpath — the tautological hasCompleteClassIndex()===ensureCompleteClassIndex() assertion is gone"
    requirement: FIX-04
    verification:
      - kind: unit
        ref: "test/functional/issue447-real-interop.test.ts#Issue #447 - suggest missing use statements (real interop) capability is judged from the answer actually observed on the wire, not an invariant that holds either way"
        status: pass
      - kind: unit
        ref: "test/functional/issue447-real-interop.test.ts#Issue #447 - forced fallback with a live backend (real interop) a forced MethodNotFound latches once and the probe resolves java.util.HashMap from the real classpath but not java.util.concurrent.HashMap"
        status: pass
      - kind: unit
        ref: "test/functional/issue447-real-interop.test.ts#Issue #447 - suggest missing use statements (real interop) offers 'use java.util.HashMap' for an unresolved HashMap reference"
        status: pass
      - kind: other
        ref: "RUN_BBJ_TESTS=1 npx vitest run test/functional/issue447-real-interop.test.ts: 5/5 assertions passed (coverage/phase-114/issue447-live.json)"
        status: pass
      - kind: other
        ref: "grep -c 'hasCompleteClassIndex()).toBe(hasCompleteIndex)' = 0; grep -c 'protected override wrapSocket(' = 1; grep -c 'Diagnostic.getMessageString(' = 1; npm run typecheck:test | grep -c issue447-real-interop = 0; npx eslint test/functional/issue447-real-interop.test.ts --max-warnings 0 exits 0"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs (coverage/phase-114/114-04-run1.json, run2.json; digests baseline/suite-114-04-run1.txt, run2.txt): interop5008=open and hookTimeoutSuites=0 both times, FAILED_TEST lines byte-identical to baseline/suite-before.txt in both runs (diff exits clean); one extra FAILED_SUITE (installed-extension-e2e.test.ts, 0 failed assertions) in both runs, matching the pre-existing contention flakiness already diagnosed in 114-02/114-06/114-07 and confirmed here as untouched by this plan (git diff --stat against the plan's starting commit is empty for that file)"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 04: Issue #447 Guard — Wire-Observed Capability, Real and Hermetic Forced Fallback Summary

**The issue #447 class-index guard now judges the live backend's getAllClassNames capability from the request actually recorded on the wire and exercises the real MethodNotFound fallback both against the live backend and hermetically everywhere, replacing an assertion that held by construction.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-09-27T19:33:00Z (approx)
- **Completed:** 2026-09-27T19:57:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- An ungated, hermetic `describe` block (Task 1) added to `issue447-real-interop.test.ts`, built on the existing scriptable fake peer (`fake-interop-peer.ts`, which already answers `getAllClassNames` with a MethodNotFound-shaped rejection unconditionally): one test proves the client-side latch fires exactly once across two `ensureCompleteClassIndex()` calls and the curated-package probe still resolves `java.util.HashMap` (and `java.io.HashMap`) via `getClassInfo`; a second test proves a seeded index answers with zero probe requests. A mutation probe against the real `METHOD_NOT_FOUND` comparison in `ensureCompleteClassIndex` (`bbj-vscode/src/language/java-interop.ts`) turned the latch test red (`expected length 1, got 2`) before being reverted, proving the guard has teeth.
- A new test-only `WireRecordingInteropService` (Task 2) overrides the existing `protected wrapSocket()` seam — no `src/` change — wrapping the real `MessageConnection` in a `Proxy` that records every `sendRequest`'s `{method, params, outcome}` and can force any named method to answer `MethodNotFound` without touching the socket. The tautological `hasCompleteClassIndex()).toBe(hasCompleteIndex)` assertion is gone: the definitive live test now branches on the backend's actual recorded answer (array vs `MethodNotFound`) and asserts the corresponding client behaviour for whichever branch the deployed backend actually takes.
- A second live `describe` forces `getAllClassNames` to `MethodNotFound` through the same seam while every other request (including the curated-package `getClassInfo` probe) still reaches the real backend: it proves the real latch holds at exactly one attempt and the real probe resolves `java.util.HashMap` from the real classpath while sending — but not finding — `java.util.concurrent.HashMap`.
- The kept code-action test now reads the diagnostic message through `Diagnostic.getMessageString(d)` (LSP 3.18's `string | MarkupContent`), closing the file's one pre-existing `typecheck:test` error with no assertion change.
- `npm run typecheck:test` reports zero errors for this file; `eslint` is clean; both a `RUN_BBJ_TESTS=0` run (hermetic-only, 2 passed) and a `RUN_BBJ_TESTS=1` run against the live backend (5/5 passed) succeed; two whole-suite runs match `baseline/suite-before.txt`'s `FAILED_TEST` set exactly.

## Task Commits

1. **Task 1: A hermetic forced fallback proves the MethodNotFound latch and the candidate probe in every environment** - `8dbdf3ad` (test)
2. **Task 2: Against the live backend, the capability is judged by the wire answer and a forced MethodNotFound drives the real fallback** - `79343e53` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/test/functional/issue447-real-interop.test.ts` - three-layer capability guard: definitive live test, live forced-fallback test, ungated hermetic forced-fallback pair, kept code-action test

## Decisions Made
- Used the existing `protected wrapSocket()` seam (RESEARCH Open Question 1, option b) in a test-only subclass rather than adding a new protected latch-setter to `JavaInteropService` — exercises the real `MethodNotFound` detection instead of bypassing it, and needed zero `src/` lines (verified via `git diff --quiet` against this plan's own starting commit for `bbj-vscode/src` and `bbj-vscode/test/fake-interop-peer.ts`).
- No change was needed to `fake-interop-peer.ts`: its `FakePeerInteropService` already answers `getAllClassNames` with a `{code: -32601}` rejection unconditionally, so it was already a ready-made hermetic forced-fallback double.
- `WireRecordingInteropService`'s `Proxy` delegates every property except `sendRequest` straight to the real connection via `Reflect.get`, binding functions to the real target, so `listen()`/`onClose()`/`onError()`/`dispose()` all keep working exactly as the unwrapped connection would.
- The definitive live test branches on the backend's actual recorded `getAllClassNames` outcome (array vs `MethodNotFound`) instead of asserting one fixed answer, since which branch a deployed backend takes is an environment fact — matching the original test's own stated intent, but now proven from an independent wire observation instead of the client's self-reported cache flag.

## Deviations from Plan

### Note on Task 1's `e8941d48`-based diff acceptance criterion

Task 1's acceptance criteria literally specify `git -C ... diff --quiet e8941d48 -- bbj-vscode/src` exiting 0 after the mutation probe is restored. `e8941d48` is the true phase-114 base commit — but by the time this plan (wave 4, `depends_on: ["114-05", "114-07"]`) ran, sibling plans 114-05/114-06/114-07 had already landed legitimate `src/` changes (lint hand-fixes, `tsconfig.test.json`/`bbj-comment-provider.ts` typing), so that literal command exits 1 regardless of this plan's own work (confirmed: it exits 1 even before Task 1 started). The criterion's actual intent — "this plan's own mutation probe left no residue in `src/`" — was verified instead against this plan's own starting commit (`0ee03de4`, the tip of 114-07): `git diff --stat 0ee03de4 -- bbj-vscode/src` is empty. Task 2's equivalent (broader) diff check was likewise verified against `8dbdf3ad` (this plan's own Task 1 commit) rather than `e8941d48`, for the same reason, and is also empty. Not a Rule 1-3 fix (no code behaviour changed) — a verification-target correction, documented per the deviation-rules "genuinely unsure -> ask/report" guidance; no `src/` file was touched by this plan.

### Auto-fixed Issues

None — both tasks' edits were exactly the kind of test-only, wire-observation rewrite the plan specified. No Rule 1/2/3 fixes were needed.

---

**Total deviations:** 0 auto-fixed. 1 documented verification-target correction (described above, not a code change).
**Impact on plan:** Both tasks' own deliverables (hermetic pair with a proven-red mutation probe; live definitive + forced-fallback tests; kept code-action test; zero `src/` change) are fully verified — locally, against the live backend, and across two byte-identical whole-suite runs.

## Issues Encountered

None beyond the diff-baseline note documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `bbj-vscode/test/functional/issue447-real-interop.test.ts` is done; FIX-04 is now fully marked complete in `REQUIREMENTS.md` (both declaring plans, 114-03 and 114-04, are finished).
- The todo `.planning/todos/pending/2026-09-20-phase-97-code-review-follow-ups.md`'s WR-04 (issue447 tautology) is now resolved; its WR-01..WR-03 (IntelliJ `BbjNodeDownloader`/`bbjcplAvailability` guards) are owned by other 114-xx plans per D-15 — confirm the todo is fully closable once those land.

## Self-Check: PASSED

Modified file verified present on disk with the described three-layer structure. Both task commits (`8dbdf3ad`, `79343e53`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `RUN_BBJ_TESTS=0` run passes (hermetic cases, live tests skipped); `RUN_BBJ_TESTS=1` run passes 5/5; `npm run typecheck:test` and `eslint` report zero errors for this file; two whole-suite runs match `baseline/suite-before.txt`'s `FAILED_TEST` set exactly, with the one pre-existing flaky suite (`installed-extension-e2e.test.ts`) confirmed untouched by this plan.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
