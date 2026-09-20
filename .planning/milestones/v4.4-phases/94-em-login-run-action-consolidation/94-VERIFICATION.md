---
phase: 94-em-login-run-action-consolidation
verified: 2026-09-19T14:05:56Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verified: true
re_verification_reason: "Post-closure code-review fix (WR-01, commit 46dc128c) landed after the initial verification; scan ranges, line citations and suite evidence re-stamped to cover it"
covers_commit_range: 5535b0db~1..46dc128c
human_verification:

  - test: "EM login enablement/visibility: install the built distributable, open Tools menu with a project open, then with all projects closed"
    expected: "Item present with a project open; absent (hidden, not greyed) with no project open — the phase's one intended user-visible change"
    why_human: "Action-presentation rendering in a running IDE; source guards prove the code shape (setEnabledAndVisible, project-only gate) but not what the Tools menu actually renders"
  - test: "EM login end-to-end: Tools > Login to Enterprise Manager, enter credentials"
    expected: "Credential prompts appear, login succeeds with a success dialog, token is stored, no leftover temp file remains on disk afterward"
    why_human: "Live network/subprocess flow against a real BBj interpreter and EM server; no CI harness exercises this"
  - test: "BUI/DWC launch from all entry points: run a .bbj file as BUI and DWC via editor context menu and via alt-B/alt-D keyboard shortcuts"
    expected: "All four invocations launch the program in the browser"
    why_human: "Requires a running IDE, a browser, and a live BBj interpreter; not observable from source"
  - test: "Token lifecycle: run with no stored token, with an expired token, then again within 5 minutes of a successful validation"
    expected: "No token -> login prompt. Expired token -> re-prompt. Second run inside 5 minutes -> trust-window hit, no em-validate-token.bbj subprocess spawned"
    why_human: "The trust-window arithmetic and null/expired branches are unit-tested (EmTokenValidatorTest), but the full run-time re-prompt UX and subprocess-not-spawned observation need a live IDE + BBj interpreter"
  - test: "Control: run a BBj file as GUI"
    expected: "Behaves exactly as before — GUI run touches no EM code, so it is the regression control for this phase's base-class edits"
    why_human: "Regression control requiring a running IDE and live BBj interpreter"
---

# Phase 94: EM Login & Run Action Consolidation Verification Report

**Phase Goal:** EM login leaves nothing behind when a launch fails and enables itself like its
sibling actions, and the BUI/DWC run flow, its server-side token validation and its bundled
tool-script paths each live in exactly one place.
**Verified:** 2026-09-19T14:05:56Z
**Status:** passed
**Re-verification:** Yes — re-stamped to cover post-closure code-review fix `46dc128c` (see
"Post-Verification Fixes" below). The initial pass closed at `human_needed`; the five UAT items
were subsequently executed and passed (`94-UAT.md`, 5 passed / 0 issues), which is what moved
this report to `passed`.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | EM login temp file is deleted even when the launch that precedes cleanup throws (EM-01, roadmap SC1) | VERIFIED | `BbjEMLoginAction.performLogin` creates the owner-only temp file before the launch `try`, runs the 15s-timeout subprocess inside that `try`, and deletes it in the enclosing `finally` (lines 124-198). `EmLoginTempFileCleanupSourceGuardTest` pins this ordering with four `indexOf`-based assertions (not mere presence), and the SUMMARY records a hand-run falsification (moved the subprocess run above the `try`, confirmed the guard failed, restored, confirmed it passed again). Java's `try/finally` semantics guarantee the deletion executes on any exception once this ordering holds, so the structural pin is sufficient proof of the runtime property. |
| 2 | "Login to Enterprise Manager" declares an enablement gate under `ActionUpdateThread.BGT`, gated on project alone, hide-not-grey (EM-02, roadmap SC2 as corrected) | VERIFIED | `BbjEMLoginAction.update()` (lines 53-56) calls `setEnabledAndVisible(e.getProject() != null)`; `getActionUpdateThread()` (58-61) returns `ActionUpdateThread.BGT`. `EmLoginEnablementSourceGuardTest` pins exactly-once declarations, the hide-not-grey setter, and that the extracted `update()` body reads neither `ServerStatus` nor `bbjHomePath`. Roadmap SC2's literal "greyed out" wording is a corrected/known deviation (all six sibling actions with an `update()` override hide, not grey) — verified against the corrected form per the pre-recorded deviation. |
| 3 | Server-side EM token validation reachable from the EM-token lifecycle class, not the run-action base; BUI/DWC launch validates identically including the 5-minute trust window (EM-03, roadmap SC3) | VERIFIED | `EmTokenValidator.java` (new file, beside `BbjEMTokenStore`/`TokenValidationCache`) holds both `validateTokenServerSide` and `validateTokenTrusted`; `BbjRunActionBase.java` contains zero declarations of either method (confirmed by direct read and by `EmTokenTrustWindowSourceGuardTest#theRunActionBaseDeclaresNeitherValidationMethod`, run and passing). `EmTokenValidatorTest#aSecondCallInsideTheTrustWindowInvokesTheRunnerZeroAdditionalTimes` behaviorally proves the trust-window hit (real `validateTokenTrusted` calls, counting fake runner, zero additional invocations on the second call). `TokenValidationCache.java` untouched (confirmed via guard `theCacheHasNoIntellijImportAndHashesWithSha256ExactlyOnce`, unchanged content). |
| 4 | Running a BBj file as BUI and DWC still launches correctly, differing only in BUI/DWC-specific literals (EM-04, roadmap SC4) | VERIFIED | `BbjRunBuiAction.java` and `BbjRunDwcAction.java` read and confirmed 31 lines each, both delegating to `buildWebRunCommandLine(file, project, "BUI"|"DWC")`; the only divergence is class name, javadoc lines, constructor text/icon, the client-type literal, and `getRunMode()`'s return value. `EmTokenTrustWindowSourceGuardTest#bothRunActionsDelegateToTheSharedWebRunHelper` and `BbjRunActionConfigPathSourceGuardTest` both pin the delegation and both pass (re-run directly, targeted). Correctly closed as verified-already-true (commit `6a55b854`), not newly implemented — confirmed in 94-04-SUMMARY. |
| 5 | `web.bbj`, `em-validate-token.bbj` and `em-login.bbj` all resolve through one shared helper, and every consumer finds its script inside an installed plugin, not only a dev sandbox (EM-05, roadmap SC5 as corrected) | VERIFIED | `BbjToolScriptResolver.java` (new file) is the single resolver; `BbjRunActionBase.java` contains zero `getWebBbjPath`/`getEmValidateBbjPath`, `BbjEMLoginAction.java` contains zero `getEMLoginBbjPath` (confirmed by direct read). `findEnabledPlugin` appears in exactly two `src/main` files (`BbjToolScriptResolver.java` and the deliberately-excluded `BbjLanguageServer.java`), confirmed by grep. The resolver's `lib/tools/` relative path matches `build.gradle.kts`'s `prepareSandbox` `into("${pluginName.get()}/lib/tools")` target (both read directly). Built `bbj-intellij-0.1.0.zip` inspected via `unzip -l`: contains `bbj-intellij/lib/tools/{web.bbj,em-login.bbj,em-validate-token.bbj}` — proving resolution works from an installed plugin, not only a dev sandbox. Roadmap SC5's literal "em-validate.bbj" wording is a corrected/known deviation (real filename `em-validate-token.bbj`) — verified against the corrected form. |
| 6 | `BbjToolScriptResolver` reproduces the exact resolve-or-null contract (path when present, null on missing/no-plugin/exception) | VERIFIED | `BbjToolScriptResolverTest` (read in full) covers all four cases with real `Files`-backed `@TempDir` fixtures and a fake seam; re-ran targeted (`./gradlew test --tests "*.BbjToolScriptResolverTest"`) — passed. |
| 7 | `EmTokenValidator` preserves null-tolerance and fail-closed behavior at its new parameterized boundary | VERIFIED | `EmTokenValidatorTest` (read in full) covers null-BBj-path, null-script-path, throwing-runner, and non-VALID-sentinel cases, each asserting zero/expected runner invocations; re-ran targeted — passed. |
| 8 | Every guard assertion disturbed by the EM-03 relocation was re-pointed with equal-or-greater assertion count, none weakened (D-08) | VERIFIED | Read `BbjSecretArgvSourceGuardTest.java` and `EmTokenTrustWindowSourceGuardTest.java` in full: `OWNER_ONLY_FILE_CALLERS` replaces the base with `EmTokenValidator` (not merely extended), `ALL_GUARDED_ACTION_FILES` gains the validator alongside base and login action, both GHSA advisory identifiers still present, and a new zero-declarations-in-base assertion was added rather than any assertion removed. Both guard files re-ran targeted — passed. |
| 9 | Concurrency/interruption edge for `BbjToolScriptResolver` (EM-05): stateless, no shared mutable state, nothing to race on | VERIFIED | Direct source read confirms the class holds only a `private final PluginPathResolver` reference set once at construction and no other mutable field — no cache map, no shared state between calls, so no concurrency test is needed to prove independence of concurrent callers. |
| 10 | No planning identifier (EM-xx, D-xx, plan numbers, C-xx, CR-xx) leaked into any source or test file | VERIFIED | `git diff` across all phase-94 commits (`5535b0db~1..46dc128c`, extended from the originally cited `..51b62968` to include the post-closure fix) for `bbj-intellij/*.java`, grepped for `EM-0[0-9]`, `D-0[0-9]`, `C-[0-9]+`, `CR-[0-9]+`, `WR-[0-9]+`, `IN-[0-9]+`, `plan 0[0-9]` in added lines — zero matches. The fix commit `46dc128c` was re-scanned separately with the same patterns (review identifiers `WR-`/`IN-` added, since that commit originates from a code review) — zero matches. GitHub issue numbers (#589, #590, #614, #615, #617) appear as permitted. |
| 11 | No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) introduced in phase-94 diff | VERIFIED | `git diff` across the same commit range (`5535b0db~1..46dc128c`) grepped for these markers in added lines — zero matches, including a separate re-scan of fix commit `46dc128c`. |
| 12 | Phase diff confined to `bbj-intellij/` and `.planning/`; whole suite green from the final tree; installable distributable built from that tree | VERIFIED | `git diff --name-only 5535b0db~1 46dc128c` (extended range, 23 changed files) filtered for anything outside `.planning/` or `bbj-intellij/` returns nothing — still fully confined after the post-closure fix, which touched exactly one file (`BbjRunActionBase.java`, +4 lines). Targeted re-run of all six new/re-pointed guard and unit test classes passed (`BUILD SUCCESSFUL`, 18 tasks). Relying on the orchestrator's independently-verified full-suite run (114 suites, 1004 tests, 0 failures, 0 errors, 0 skipped, `--rerun-tasks`) as established fact. `bbj-intellij-0.1.0.zip` (1,202,440 bytes) confirmed present at `bbj-intellij/build/distributions/`, containing all three bundled tool scripts via direct `unzip -l` inspection. |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/src/main/java/.../actions/BbjToolScriptResolver.java` | Single resolver for all three tool scripts | VERIFIED | Present, substantive (86 lines, real seam logic), wired into all 3 call sites |
| `bbj-intellij/src/test/java/.../actions/BbjToolScriptResolverTest.java` | Plain JUnit 5 coverage | VERIFIED | 5 test methods covering present/missing/null/throwing/all-three-names cases |
| `bbj-intellij/src/main/java/.../actions/EmTokenValidator.java` | Relocated validator beside EM-token lifecycle classes | VERIFIED | Present, substantive (111 lines), holds both moved methods, wired into `buildWebRunCommandLine` |
| `bbj-intellij/src/test/java/.../actions/EmTokenValidatorTest.java` | Behavioral coverage of trust window/null/throw cases | VERIFIED | 6 test methods, all exercising real `EmTokenValidator` instances via counting fake |
| `bbj-intellij/src/test/java/.../actions/EmLoginEnablementSourceGuardTest.java` | Pin the enablement gate's shape and forbidden gates | VERIFIED | 4 test methods, own private helpers, no shared utility |
| `bbj-intellij/src/test/java/.../actions/EmLoginTempFileCleanupSourceGuardTest.java` | Pin the cleanup-scope ordering invariant | VERIFIED | 4 ordered-index test methods, own private helpers, falsification recorded in SUMMARY |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `BbjRunActionBase.buildWebRunCommandLine` | `BbjToolScriptResolver.SESSION` | `resolveToolScript("web.bbj")` / `resolveToolScript("em-validate-token.bbj")` | WIRED | Both calls present and read directly (lines 338, 393 — re-read after fix `46dc128c`; the `em-validate-token.bbj` call shifted from the originally cited line 388) |
| `BbjRunActionBase.buildWebRunCommandLine` | `logError` + early return | `emValidatePath == null` guard | WIRED | Lines 394-397, added by fix `46dc128c`; mirrors the sibling `web.bbj` guard at 339-342 so a missing bundled script aborts distinctly instead of masquerading as an invalid token |
| `BbjEMLoginAction.performLogin` | `BbjToolScriptResolver.SESSION` | `resolveToolScript("em-login.bbj")` | WIRED | Present (line 98), original null-check/dialog preserved |
| `BbjRunActionBase.buildWebRunCommandLine` | `EmTokenValidator.SESSION` | `validateTokenTrusted(bbjPath, emValidatePath, token)` | WIRED | Present (line 398 after fix `46dc128c`; originally cited as 389), exactly once, confirmed by guard — now reachable only with a non-null `emValidatePath` |
| `BbjToolScriptResolver.resolveToolScript` relative path | `build.gradle.kts` `prepareSandbox` `into(...)` target | `lib/tools/` | WIRED | Both read directly: `root.resolve("lib/tools/" + scriptName)` matches `into("${pluginName.get()}/lib/tools")` |
| `BbjRunBuiAction`/`BbjRunDwcAction` | `BbjRunActionBase.buildWebRunCommandLine` | delegation with client-type literal | WIRED | Both subclasses read in full, single delegating call each |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| EM-01 (#590) | 94-03 | Temp file deleted even when launch throws | SATISFIED | Ordering guard + falsification (see Truth 1) |
| EM-02 (#589) | 94-03 | Enablement gate + `ActionUpdateThread.BGT` | SATISFIED | Code + guard (see Truth 2) |
| EM-03 (#617) | 94-02 | Token validation relocated off run-action base | SATISFIED | New class + re-pointed guards (see Truth 3) |
| EM-04 (#615) | 94-04 | BUI/DWC share run flow via base class | SATISFIED | Verified-already-true, cited evidence (see Truth 4) |
| EM-05 (#614) | 94-01 | One shared tool-script resolver | SATISFIED | New resolver + all call sites converted (see Truth 5) |

No orphaned requirements — all five phase-94 requirement IDs declared across the four plans and all appear in REQUIREMENTS.md mapped to Phase 94, all marked Complete.

### Anti-Patterns Found

None. Full phase-94 diff (`5535b0db~1..46dc128c`, `bbj-intellij/*.java`) scanned for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER and for planning-identifier leakage (`EM-0[0-9]`, `D-0[0-9]`, `C-[0-9]+`, `CR-[0-9]+`, `WR-[0-9]+`, `IN-[0-9]+`, `plan 0[0-9]`) in added lines — zero matches in both scans, re-run at re-stamp time over the extended range including fix `46dc128c`. GitHub issue numbers appear as permitted.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| New resolver unit tests pass | `./gradlew test --tests "*.BbjToolScriptResolverTest"` | BUILD SUCCESSFUL | PASS |
| New validator unit tests pass | `./gradlew test --tests "*.EmTokenValidatorTest"` | BUILD SUCCESSFUL | PASS |
| New enablement guard passes | `./gradlew test --tests "*.EmLoginEnablementSourceGuardTest"` | BUILD SUCCESSFUL | PASS |
| New cleanup-ordering guard passes | `./gradlew test --tests "*.EmLoginTempFileCleanupSourceGuardTest"` | BUILD SUCCESSFUL | PASS |
| Re-pointed argv/owner-only guard passes | `./gradlew test --tests "*.BbjSecretArgvSourceGuardTest"` | BUILD SUCCESSFUL | PASS |
| Re-pointed trust-window guard passes | `./gradlew test --tests "*.EmTokenTrustWindowSourceGuardTest"` | BUILD SUCCESSFUL | PASS |
| Full suite (orchestrator-established fact, not re-run here per full-suite-once constraint) | `./gradlew test --rerun-tasks` | 114 suites, 1004 tests, 0 failures | PASS (relied upon per task brief) |
| Installable distributable exists and bundles all three scripts | `unzip -l bbj-intellij-0.1.0.zip` | Contains `lib/tools/{web.bbj,em-login.bbj,em-validate-token.bbj}` | PASS |

### Human Verification Required

This phase has one intended user-visible change (the Tools-menu item hiding with no project open)
plus four other UAT items recorded in `94-04-SUMMARY.md`. All five require a running IDE with the
installed distributable and are listed in the frontmatter `human_verification` block above:

1. EM login enablement/visibility (the phase's one intended user-visible change)
2. EM login end-to-end (credential prompts, success dialog, token stored, no leftover temp file)
3. BUI/DWC launch from all entry points (context menu + keyboard shortcuts)
4. Token lifecycle (no token / expired token / trust-window hit)
5. GUI run as regression control

### Gaps Summary

No gaps found. All 12 observable truths verified against the actual codebase (not SUMMARY claims):
new classes exist, are substantive, are wired end-to-end, and are covered by passing tests re-run
directly during this verification. All five requirement IDs (EM-01 through EM-05) are satisfied
with cited evidence. The two known/pre-recorded wording deviations (ROADMAP criterion 2's "greyed
out" vs. the implemented hide-not-grey behavior; criterion 5's "em-validate.bbj" vs. the real
`em-validate-token.bbj`) were verified against their corrected forms, per the task brief's
pre-recorded deviations. The initial pass closed at `human_needed` solely because five UAT items
require a running IDE and cannot be verified by static analysis or unit tests — expected for an
IntelliJ plugin phase with no live UI test harness in CI. Those five items were subsequently
executed and passed (`94-UAT.md`, 5 passed / 0 issues), moving this report to `passed`.

One defect was found after closure by a later code-review round and fixed in `46dc128c`; it is
recorded under "Post-Verification Fixes" below, and the scan ranges, line citations and suite
evidence above have been re-stamped to cover it. No gap remains open.

## Post-Verification Fixes

One defect was found *after* this phase was marked complete and transitioned to phase 95
(`487c404a`), by the code-review round recorded in `94-REVIEW.md` (2026-09-19T12:39Z). It is
documented here so this report reflects the phase's final shipped state rather than its state at
closure.

| Finding | Severity | Commit | Status |
|---------|----------|--------|--------|
| WR-01 — a missing `em-validate-token.bbj` in the plugin bundle was indistinguishable from an invalid token, and could loop the user through login indefinitely | Warning | `46dc128c` | FIXED |

**Defect:** `buildWebRunCommandLine` resolved `em-validate-token.bbj` but never null-checked the
result, unlike its sibling `web.bbj` guard. A `null` fell through to
`EmTokenValidator.validateTokenTrusted`, which fails closed and returns `false` — the same value a
genuinely expired token produces. The code then deleted the *valid* stored token and re-prompted
login. Because login runs a different script (`em-login.bbj`), a fresh login could succeed and mint
a token that failed the same broken check again, with no user-visible indication that the real
cause was a broken or incomplete plugin installation.

**Fix:** explicit `emValidatePath == null` check with a distinct
`logError(project, "em-validate-token.bbj not found in plugin bundle")` and early return
(`BbjRunActionBase.java:394-397`), matching the established `logError(...); return null;` idiom
used by the method's sibling guards.

**Verification of the fix:** diff re-read directly against the working tree (+4 lines, single file,
control flow otherwise untouched); full `bbj-intellij` Gradle suite re-run from the post-fix tree
(`./gradlew test` → `BUILD SUCCESSFUL`, 114 test classes, 0 failures / 0 errors); planning-identifier
and debt-marker scans re-run over the fix commit — zero matches. Full fix record in
`94-REVIEW-FIX.md`.

**Impact on the human-verification items above:** none of the five UAT items were re-executed after
the fix, because the guard is unreachable in a correctly-built plugin — `bbj-intellij-0.1.0.zip` was
already confirmed to bundle all three tool scripts (Truth 5), so the new branch cannot be entered by
a correctly-installed distributable. The fix changes only the failure presentation for a *broken*
installation. UAT item 4 (token lifecycle) remains the closest adjacent scenario and its recorded
pass is unaffected, since it exercised the non-null path that behaves exactly as before.

**Not fixed (Info-tier, out of scope for the `critical_warning` fix scope):** IN-01 unread
`ProcessOutput` from the EM login launch; IN-02 broad `catch (Exception ignored)` around
`toRealPath()`; IN-03 source-guard test scaffolding duplicated across four test classes. All three
are documented in `94-REVIEW.md` and carried in `94-REVIEW-FIX.md` as skipped.

---

*Verified: 2026-09-19T00:00:00Z (initial) · re-stamped 2026-09-19T14:05:56Z to cover fix `46dc128c`*
*Verifier: Claude (gsd-verifier) · re-stamp: Claude (orchestrator, /gsd-code-review 94 --fix)*
