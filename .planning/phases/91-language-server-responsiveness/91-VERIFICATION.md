---
phase: 91-language-server-responsiveness
verified: 2026-09-13T02:00:00Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: |
      Rebuild both distributables from the final tree (HEAD d955379f, after the WR-01/WR-02
      review fixes — the 91-06 build evidence in the SUMMARY is from 3ca0bf51, pre-fix, so it
      must be redone):
      - VS Code: `npm --prefix bbj-vscode run build`, then `bbj-ext-install`.
      - IntelliJ: `bbj-intellij/gradlew -p bbj-intellij clean buildPlugin --console=plain -q`.
      Then in VS Code (ext test), with a `.bbj` file open that uses Java classes (`use java.util.HashMap`,
      `declare HashMap m!`, `m! = new HashMap()`), wait for diagnostics to settle, then:
      1. Stop BBjServices.
      2. Add `use java.util.concurrent.ConcurrentSkipListMap` / `declare ConcurrentSkipListMap a!` and two
         more distinct unresolved-Java-class lines. Keep typing/hovering for ~10s.
      3. Start BBjServices, wait >=30s.
      4. Without editing or running Refresh Java Classes, move the caret onto `ConcurrentSkipListMap`
         (and off/back once if nothing happens within a few seconds).
    expected: |
      Steps 1-2: exactly one "Failed to connect to the Java interop service…" popup during the whole
      outage; typing/completion/hover stay responsive with no multi-second freeze; the new lines show
      unresolved-class diagnostics.
      Steps 3-4: within ~20s the unresolved-class diagnostics clear by themselves, with no popup/info
      message and no edit or Refresh Java Classes.
    why_human: |
      Stopping/restarting a real BBjServices, watching IDE popups, and judging live editor
      responsiveness need a live IDE and a real interop peer; the automated suite (D-13) uses a fake
      peer by design. This is D-14, staged verbatim in 91-06-PLAN.md/91-06-SUMMARY.md but never
      executed against a live peer during phase execution.
---

# Phase 91: Language Server Responsiveness Verification Report

**Phase Goal:** Scope resolution, Java class resolution, and completion cancellation in the language
server no longer scale with workspace size, hang on an unreachable interop peer, or race each other.
**Verified:** 2026-09-13
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Truths below are the four ROADMAP success criteria (Step 2a "roadmap contract"), each of which is a
behavior-dependent claim (a runtime state transition / cancellation-cleanup invariant). Evidence
combines: (a) direct source inspection of every artifact and wiring point named in the plans and the
code review, (b) each plan's SUMMARY.md documented RED-before-GREEN test cycles (specific failing
assertion recorded before the production fix, passing after), (c) the independent 91-REVIEW.md's
line-by-line trace of the breaker state machine and the in-flight registry's identity-guarded
`finally`, which found and the fix pass (91-REVIEW-FIX.md, commits `2ca423ff`/`59befa50`) closed two
real correctness gaps, and (d) the orchestrator's whole-suite run on the final tree (HEAD `d955379f`):
1855 tests, 1826 passed, 0 failed, 29 skipped (pre-existing, unrelated local interop drift). Per the
shell rules for this run, vitest/build/gradle were not independently re-run by this verifier.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Scope resolution and symbol collection cost does not grow with total workspace size (RESP-01, #505) | ✓ VERIFIED | `bbj-index-manager.ts` `getBBjClassesForFiles`/`bbjClassesByPath`/`documentOrder` (path-keyed index, confirmed present at lines 28-119) replaces the full `allElements(BbjClass.$type)` scan in `bbj-scope.ts` (`getBBjClassesFromFile` calls `getBBjClassesForFiles` — confirmed one call site). `bbj-scope-local.ts` `collectLocalSymbols` prunes external-document member bodies (`isBBjClassMember` + `treeIter.prune()`, confirmed). WR-02 fix (commit `59befa50`) restores signature-type (`field`/`returnType`/`param.type`) preloading that the initial pruning had regressed — confirmed in source at lines 146/150/155, with its own regression test `PREFIX member signature types stay preloaded despite body pruning (#505)` present in `test/scope-cost-regression.test.ts`. `test/scope-cost-regression.test.ts` (21KB, 3+1 describes) exists and its SUMMARY records pre-change `examined` scaling with workspace size (11 -> 251) collapsing to constant (1 -> 1) post-change. |
| 2 | Unreachable java-interop peer costs ~one connect timeout in total, not one per class; resolution resumes without `clearCache()` (RESP-02, #504) | ✓ VERIFIED | Three-state breaker in `java-interop.ts` confirmed: `INTEROP_BREAKER_INITIAL_COOLDOWN_MS`/`BACKOFF_FACTOR`/`MAX_COOLDOWN_MS` constants, `InteropTransportError`, `onConnectionRecovered`, half-open probe gating (`connect()` throws the circuit-open error at line 274). WR-01 fix (commit `2ca423ff`) closes a review-found gap where a cancelled resolution was permanently cached as "not found" — confirmed in source (`doResolveClassByName`'s catch now checks `token?.isCancellationRequested`), with its own regression test present (`java-interop-service.test.ts:420`). Recovery re-check helper `java-class-reload.ts` (`reloadClasspathAndRecheckDocuments`) is wired from `main.ts` via `onConnectionRecovered`, deferred through `javaRecoveryPending` until the first build — confirmed at `main.ts` lines 26/143/154/161/168/170/185-186. `test/java-interop-breaker.test.ts` (11 tests) and `test/java-class-reload.test.ts` (3 tests) exist. |
| 3 | A class that genuinely resolves never stalls 30s or degrades to a stub due to LRU eviction racing its own cyclic resolution; the in-flight set drains to empty (RESP-03, #497) | ✓ VERIFIED | `_inFlightPhase2` registry confirmed in `java-interop.ts`: declared (line 156), set beside `resolvedClasses.set` (line 909), consulted at all three fast paths (lines 734, 782, 850), drained in an identity-guarded `finally` (lines 985/991), cleared by `clearCache()` (line 1097). `LruMap`/`RESOLVED_CLASSES_CACHE_LIMIT`/lock methods confirmed untouched by the plan's own diff scope (per each SUMMARY's `git diff` acceptance checks). `test/java-interop-service.test.ts` describe `a class evicted during its own cyclic resolution (#497)` (4 tests + the WR-01 cancellation test) present. |
| 4 | Two concurrent completion requests on different documents each honor their own cancellation token (RESP-04, #498) | ✓ VERIFIED | `completionRequestToken` module-level `AsyncLocalStorage` confirmed in `bbj-completion-provider.ts` (line 45), entered per request in `getCompletion` (line 259), read in `completionForCrossReference` via `.getStore()` (line 106). `activeCancelToken` instance field confirmed removed (no matches). `findClassCandidatesByPrefixCached`'s shared lookup confirmed token-free (`findClassCandidatesByPrefix(prefix, undefined, undefined)`, line 203). `concurrent completion requests keep their own cancellation (#498)` describe (2 tests) present in `test/completion-test.test.ts` per 91-02-SUMMARY.md. |

**Score:** 4/4 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-index-manager.ts` | path-keyed `BbjClass` index, `getBBjClassesForFiles` | ✓ VERIFIED | Present, wired from `bbj-scope.ts`; one call site confirmed by grep |
| `bbj-vscode/src/language/bbj-scope.ts` | `getBBjClassesFromFile` reads path-keyed index | ✓ VERIFIED | Confirmed |
| `bbj-vscode/src/language/bbj-scope-local.ts` | external-document member pruning + signature preload (post WR-02) | ✓ VERIFIED | Confirmed, including WR-02 fix |
| `bbj-vscode/test/scope-cost-regression.test.ts` | counters + loose timing + index-correctness + WR-02 regression | ✓ VERIFIED | File exists (21KB); WR-02 describe confirmed present |
| `bbj-vscode/src/language/bbj-completion-provider.ts` | `AsyncLocalStorage` token, token-free shared prefix lookup | ✓ VERIFIED | Confirmed |
| `bbj-vscode/test/completion-test.test.ts` | two-document concurrent cancellation tests | ✓ VERIFIED (not independently re-run; per SUMMARY) | Describe confirmed by plan 91-02 SUMMARY |
| `bbj-vscode/src/language/java-interop.ts` | breaker, transport classifier, in-flight registry, WR-01 fix | ✓ VERIFIED | All symbols confirmed present |
| `bbj-vscode/test/fake-interop-peer.ts` | scriptable fake peer | ✓ VERIFIED | File exists (8.4KB) |
| `bbj-vscode/test/java-interop-breaker.test.ts` | breaker regression tests | ✓ VERIFIED | File exists (12.9KB) |
| `bbj-vscode/test/java-interop-service.test.ts` | in-flight registry + WR-01 cancellation regression tests | ✓ VERIFIED | WR-01 test confirmed present at line 420 |
| `bbj-vscode/src/language/java-class-reload.ts` | shared reload/re-check helper | ✓ VERIFIED | File exists (2.6KB), imports nothing from `main.ts` per grep |
| `bbj-vscode/src/language/main.ts` | `onConnectionRecovered` wiring, deferred to first build | ✓ VERIFIED | Confirmed |
| `bbj-vscode/test/java-class-reload.test.ts` | reload/re-check regression tests | ✓ VERIFIED | File exists (7.6KB) |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `bbj-scope.ts` | `bbj-index-manager.ts` | `getBBjClassesForFiles(adjustedFileUris)` | ✓ WIRED (grep: exactly one call site) |
| `bbj-scope-local.ts` | `bbj-linker.ts` (mirrored pattern) | `isBBjClassMember` + `prune()` | ✓ WIRED |
| `bbj-completion-provider.ts` (self) | `completionRequestToken` | `.run(...)` / `.getStore()` | ✓ WIRED |
| `java-interop.ts` (self) | `notifyJavaConnectionError` | called once on closed→open transition | ✓ WIRED (per 91-03 SUMMARY test evidence) |
| `main.ts` | `java-class-reload.ts` | `reloadClasspathAndRecheckDocuments(...)` | ✓ WIRED (2 call sites: refresh path + recovery path) |
| `main.ts` | `java-interop.ts` | `JavaInteropService.onConnectionRecovered(...)` | ✓ WIRED (1 call site) |

### Behavioral Spot-Checks

SKIPPED — the orchestrator instructed this verifier not to run vitest/build/gradle in this session
(a rebuild of the distributables was in progress). Behavioral evidence instead comes from: each plan's
SUMMARY.md documented pre-change (RED) failing assertion and post-change (GREEN) pass for every
must-have test, the independent 91-REVIEW.md's line-by-line trace of the breaker/registry logic, and
the orchestrator-reported whole-suite result on the final tree (HEAD `d955379f`: 1855 tests, 1826
passed, 0 failed, 29 skipped).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| RESP-01 (#505) | 91-01, 91-06 | Scope/symbol-collection cost stops scaling with workspace size | ✓ SATISFIED (code); Pending in REQUIREMENTS.md | Path-keyed index + pruning confirmed in source; REQUIREMENTS.md checkbox intentionally left unchecked by every plan per phase instruction — the phase verification step is the one meant to flip it, gated on the D-14 human check |
| RESP-02 (#504) | 91-03, 91-05, 91-06 | Breaker limits outage cost to ~1 connect timeout; resets on cache clear/Refresh | ✓ SATISFIED (code); Pending in REQUIREMENTS.md | Breaker + recovery helper confirmed in source; same Pending-by-design note applies |
| RESP-03 (#497) | 91-04, 91-06 | No 30s stall/stub from LRU eviction racing cyclic resolution | ✓ SATISFIED (code); Pending in REQUIREMENTS.md | In-flight registry confirmed in source; same Pending-by-design note applies |
| RESP-04 (#498) | 91-02, 91-06 | Concurrent completion requests honor their own cancellation token | ✓ SATISFIED (code); Pending in REQUIREMENTS.md | AsyncLocalStorage confirmed in source; same Pending-by-design note applies |

No orphaned requirements: REQUIREMENTS.md maps exactly RESP-01..04 to Phase 91, and every plan (91-01
through 91-06) declares one or more of them. REQUIREMENTS.md and ROADMAP.md were not edited by this
verification, per instruction.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-vscode/src/language/bbj-index-manager.ts` | EOF | Missing trailing newline (91-REVIEW.md IN-01) | ℹ️ Info | Cosmetic; explicitly excluded from the review-fix pass (91-REVIEW-FIX.md), lint still passes; not a blocker |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in the phase's diff
(`git diff 174985f7 -- bbj-vscode/src bbj-vscode/test`, added lines only). No planning-register id
(plan numbers, D-xx, T-9x-xx, Pitfall N, C-/CR-/WR-/IN- ids) leaked into source or test text — the
phase-wide register-check grep prints nothing, confirming both plans' own gates and 91-06's phase-wide
check.

Both correctness warnings from 91-REVIEW.md (WR-01, WR-02) were fixed in 91-REVIEW-FIX.md
(commits `2ca423ff`, `59befa50`), each with its own regression test, and both commits are present on
HEAD (confirmed via `git log 174985f7..HEAD`).

### Human Verification Required

### 1. D-14 live outage-and-recovery check

**Test:** Rebuild both distributables from the final tree (HEAD `d955379f`, i.e. after the WR-01/WR-02
review fixes — note the 91-06-SUMMARY.md build evidence recorded sha256 digests and marker counts
against HEAD `3ca0bf51`, which predates those two fix commits, so that evidence must be treated as
stale and the rebuild redone against the current tree). Then in VS Code (ext test), with BBjServices
running and a `.bbj` file open using `java.util.HashMap`, stop BBjServices, add three lines using
distinct unresolved Java classes, keep interacting for ~10s, restart BBjServices, wait >=30s, then
move the caret onto one of the unresolved class names (and back once if nothing happens).

**Expected:** Exactly one "Failed to connect to the Java interop service…" popup during the whole
outage, with no multi-second stall; after restart, the unresolved-class diagnostics clear on their own
within ~20s with no further popup, no edit, and no Refresh Java Classes.

**Why human:** Needs a live IDE and a real BBjServices peer; the automated suite is fake-peer-only by
design (D-13). This was staged verbatim by plan 91-06 for phase-verification harvest but was not
executed during this verification pass.

### Gaps Summary

No gaps found. All four ROADMAP success criteria are backed by source-level artifact/wiring evidence,
each plan's documented RED-before-GREEN test cycles, an independent code review that found and closed
two real correctness gaps (WR-01, WR-02) with their own regression tests, and a clean whole-suite run
on the final tree (0 failed). The only open item is D-14's live outage-and-recovery check, which by
design requires a human with a real BBjServices instance and was explicitly staged (not executed) by
plan 91-06. REQUIREMENTS.md's RESP-01..04 checkboxes remain unchecked by design (every plan
deliberately left them Pending, per this phase's own instruction, for the verification/ship step to
flip after the D-14 check is recorded) — this is not itself a gap, but the requirements table above
notes it for visibility.

---

_Verified: 2026-09-13_
_Verifier: Claude (gsd-verifier)_
