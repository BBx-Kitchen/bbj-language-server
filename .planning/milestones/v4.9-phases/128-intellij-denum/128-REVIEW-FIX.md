---
phase: 128-intellij-denum
fixed_at: 2026-10-04T00:00:00Z
review_path: .planning/phases/128-intellij-denum/128-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 128: Code Review Fix Report

**Fixed at:** 2026-10-04
**Source review:** .planning/phases/128-intellij-denum/128-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03; WR-04 and the Info findings were excluded by instruction)
- Fixed: 3
- Skipped: 0

**Verification:** edits and gates ran in the main checkout (no worktree). `./gradlew test` in
`bbj-intellij` passed with 1263 tests, 0 failures, 0 skipped (baseline 1258 plus 5 new).

## Fixed Issues

### WR-01: CancellationException escapes the Denumber background task

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjDenumberAction.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjDenumberActionSourceGuardTest.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java`
**Commit:** 5bf76fb5
**Applied fix:** The Denumber task now catches `CancellationException` and reports it through the existing XML-escaped "Denumber failed" balloon. `BbjCompileAction` adds `CancellationException` to both of its multi-catches, so it reaches its existing `requestFailed` rendering. Source-guard tests pin both catches.

### WR-02: The timeout is applied twice, but the message names one

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjDenumberAction.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjDenumberActionSourceGuardTest.java`
**Commit:** bd607fa8
**Applied fix:** One deadline is computed from the 60-second constant. Server resolution and the request both wait only for the remaining time, and a timed-out request future is cancelled. The user-visible message text is unchanged. A source guard pins the single deadline, the two remaining-time waits and the cancel.

### WR-03: A throwing refresh strands the remaining dirty keys

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/DirtyFileCoalescer.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/DirtyFileCoalescerTest.java`
**Commit:** 9a09f46d
**Applied fix:** `drain` catches and logs a `RuntimeException` per key through `java.util.logging`, the logger the other plain-Java classes in the plugin use, so the class stays free of platform imports. Two behavioural tests cover a first refresh that throws while the others still run, and a failed key being refreshed again on a later mark.

---

_Fixed: 2026-10-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
