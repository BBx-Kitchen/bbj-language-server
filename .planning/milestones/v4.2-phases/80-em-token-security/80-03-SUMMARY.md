---
phase: 80-em-token-security
plan: 03
subsystem: security
tags: [intellij, java, notifications, passwordsafe, credential-store]

# Dependency graph
requires:
  - phase: 78-build-foundation
    provides: JDK 17 daemon toolchain (BUILD-01) so ./gradlew test resolves correctly on this JDK 25 host
  - phase: 80-em-token-security-01-fail-closed-jwt-expiry
    provides: BbjEMTokenStore.java as 80-01 left it (fail-closed isTokenExpired delegate), the shared file 80-03 edits after 80-01 merged
provides:
  - TokenBackend — a plain four-value classification enum (NATIVE_KEYCHAIN, KEEPASS_FILE, MEMORY_ONLY, UNKNOWN) with no platform import
  - BackendNoticePolicy — an injected-collaborator seam deciding once-per-distinct-non-keychain-backend notification, with a keychain-triggered reset
  - BbjEMTokenStore.resolveBackend() — the sole PasswordSafeSettings/ProviderType touch point in the plugin
  - BbjEMTokenStore.showBackendBalloon() — the non-modal WARNING balloon the user actually sees
  - A cross-file source guard proving the internal-API isolation as a build-checked property
affects: []

# Actuals (#2632)
actuals:
  tokens: 8378
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injected-collaborator decision policy (BackendNoticePolicy) mirroring concurrency/RestartGate.java's shape: constructor collaborators, one synchronized entry point, no static state of its own"
    - "Internal-platform-API isolation behind exactly one method (resolveBackend), proven as a build-checked property by a Files.walk cross-file source guard rather than by convention alone"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenBackend.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BackendNoticePolicy.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java

key-decisions:
  - "resolveBackend() is placed as the last method declared in BbjEMTokenStore.java, and is package-private static so the source guard can pin both its uniqueness and its position (D-11)"
  - "The last-warned record is a string (the backend name), not a boolean flag, so a later downgrade to a different weak backend after having been warned about a first one still warns (D-12)"
  - "evaluate(resolveBackend()) runs first in both storeToken and getToken, never in deleteToken — covers both login and every Run without adding a PasswordSafeSettingsListener subscription (D-12)"
  - "Flagged assumption 1 resolved: ApplicationManager.getApplication().getService(PasswordSafeSettings.class) compiled and is used as written — the alternative getInstance() form was never needed"
  - "TokenBackend's own javadoc named the literal ProviderType in prose, which the Task 3 source guard correctly flagged as a violation of the single-file isolation rule; reworded to 'password-provider enum' with no behaviour change (Rule 1 auto-fix, see Deviations)"

requirements-completed: [TOKEN-03]

coverage:
  - id: D1
    description: "A non-keychain backend (KeePass file, memory-only, or an unrecognised/undetectable store) is notified exactly once per distinct value, and the native keychain never notifies"
    requirement: "TOKEN-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java#aKeepassBackendNotifiesOnce,theSameBackendEvaluatedAgainDoesNotNotifyASecondTime,theNativeKeychainNeverNotifies,anUnknownBackendIsWarnWorthy"
        status: pass
    human_judgment: false
  - id: D2
    description: "A switch back to the native keychain clears the warned record, so a later switch to a different (or the same) weak backend warns again; the record persists across a fresh policy instance (simulating an IDE restart)"
    requirement: "TOKEN-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java#switchingBackToTheNativeKeychainClearsTheRecord,aDifferentNonKeychainBackendWarnsAgainWithoutAnInterveningKeychain,theNativeKeychainClearsAnExistingRecordEvenWhenItNeverWarnedInThisInstance,aPersistedRecordSurvivesANewPolicyInstance,aNullOrEmptyStoredValueIsTreatedAsNeverWarned"
        status: pass
    human_judgment: false
  - id: D3
    description: "Eight concurrent evaluate() calls for the same backend produce exactly one notification — the read-compare-notify-write sequence is atomic"
    requirement: "TOKEN-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java#eightConcurrentEvaluatesOfTheSameBackendProduceExactlyOneNotification"
        status: pass
    human_judgment: false
  - id: D4
    description: "PasswordSafeSettings and ProviderType each appear in exactly one file in the whole plugin (BbjEMTokenStore.java), and only after the resolveBackend() declaration; the policy runs before PasswordSafe is touched in both storeToken and getToken; the plain seam classes carry no com.intellij import; no PasswordSafeSettingsListener subscription exists"
    requirement: "TOKEN-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java (7 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The user actually sees one non-modal WARNING balloon in the 'BBj Language Server' group, naming their real backend in plain language, with Open Password Settings and Dismiss actions, and no interpolated credential/path/token value"
    requirement: "TOKEN-03"
    human_judgment: true
    rationale: "The literal title/body/action strings and the WARNING type are pinned by grep-based acceptance criteria against BbjEMTokenStore.java (all confirmed passing), but no automated test in this repository renders an actual IntelliJ notification balloon. A live IDE run against a KeePass-configured PasswordSafe is the natural check — see Human UAT items 1-3 below, carried into /gsd-verify-work."

# Metrics
duration: ~30min (14:59:42Z-15:29:45Z; includes a prior stalled session's Task 1 RED commit)
completed: 2026-09-04
status: complete
---

# Phase 80 Plan 03: Non-Keychain Backend Notice Summary

**A `resolveBackend()`/`BackendNoticePolicy` pair that warns the user once per distinct non-native-keychain PasswordSafe backend via a WARNING balloon, with the internal `PasswordSafeSettings`/`ProviderType` API isolated to one method and pinned by a cross-file source guard.**

## Performance

- **Duration:** ~30 min total (14:59:42Z start of Task 1 RED by a prior stalled session, 15:29:45Z close of this session)
- **Started:** 2026-09-04T14:59:42Z
- **Completed:** 2026-09-04T15:29:45Z
- **Tasks:** 3
- **Files modified:** 5 (4 new, 1 modified)

## Accomplishments
- `TokenBackend` — plain four-constant enum (`NATIVE_KEYCHAIN`, `KEEPASS_FILE`, `MEMORY_ONLY`, `UNKNOWN`) with no platform import
- `BackendNoticePolicy` — injected-collaborator seam (`Supplier<String>`, `Consumer<String>`, `Consumer<TokenBackend>`) whose `synchronized evaluate()` notifies once per distinct non-keychain value, clears on keychain, and is atomic under concurrent Runs
- `BbjEMTokenStore.resolveBackend()` — the sole method in the plugin naming `PasswordSafeSettings`/`ProviderType`, mapping `KEYCHAIN`→`NATIVE_KEYCHAIN`, `KEEPASS`→`KEEPASS_FILE`, `MEMORY_ONLY`/`DO_NOT_STORE`→`MEMORY_ONLY`, and any exception/null/unrecognised constant→`UNKNOWN`
- `BbjEMTokenStore.showBackendBalloon()` — non-modal WARNING balloon in the `"BBj Language Server"` group, titled "Enterprise Manager token is not in the OS keychain", with a body naming the store in user terms and "Open Password Settings"/"Dismiss" actions
- `storeToken` and `getToken` both call `BACKEND_NOTICE.evaluate(resolveBackend())` first; `deleteToken` is untouched
- `EmTokenBackendNoticeSourceGuardTest` — 7-assertion cross-file guard proving the internal-API isolation as a build-checked property, which caught a genuine literal-text leak (see Deviations)
- Whole `./gradlew test` suite: 216/216, 0 failures (up from 199 at the close of 80-02)

## Task Commits

Each task was committed atomically (Task 1's RED commit was made by a prior stalled session; this session verified it, completed Task 1's GREEN, and ran Tasks 2-3 in full):

1. **Task 1 RED: failing test for backend notice policy** - `a799385` (test, prior session) — `BackendNoticePolicyTest` written against classes that did not yet exist; observed red as a `cannot find symbol` compile error for `TokenBackend`/`evaluate`.
2. **Task 1 GREEN: implement policy and wire into token store** - `8e5616c` (feat) — `TokenBackend`, `BackendNoticePolicy`, `resolveBackend()`, and the two `evaluate(resolveBackend())` call sites. Verified in this session with a fresh `--rerun`: 4/4 tests passing.
3. **Task 2 RED: downgrade/reset/unknown/concurrency tests** - `3502ed3` (test) — appended Tests 5-10 to `BackendNoticePolicyTest`. All 10 passed immediately with no production change (see Deviations note — the policy rules were already complete from Task 1's tracer slice; the still-unbuilt production work was the balloon).
4. **Task 2 GREEN: the WARNING balloon** - `c27e702` (feat) — `showBackendBalloon` filled in with the title/body/action literals and the `Notifications.Bus.notify` post. All Task 2 acceptance-criteria greps confirmed (single `WARNING`, zero `INFORMATION`, three body literals, both action labels, zero `Messages.show`).
5. **Task 3 RED: cross-file source guard** - `4e1e741` (test) — `EmTokenBackendNoticeSourceGuardTest`; 6/7 passed, `providerTypeAppearsInExactlyOneMainSourceFile` failed red because `TokenBackend.java`'s own javadoc named the literal `ProviderType`.
6. **Task 3 GREEN: reword the leaking javadoc** - `efcf838` (fix) — reworded `TokenBackend`'s class comment to "password-provider enum", no behaviour change. 7/7 green; whole suite 216/216.

**Plan metadata:** (this commit) `docs(80-03): complete plan`

_Note: this plan is `tdd="true"` throughout; each task carries a red observation (compile-error red for Task 1, a genuine assertion red for Task 3, and a documented already-passing state for Task 2) and a green commit._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenBackend.java` - New plain classification enum, no platform import
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BackendNoticePolicy.java` - New injected-collaborator decision seam
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` - `resolveBackend()`, `BACKEND_WARNED_KEY`, `BACKEND_NOTICE`, `showBackendBalloon()`, and the two `evaluate(resolveBackend())` call sites added
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java` - 10-test behavioural coverage over a counting-notifier double and an in-memory store
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java` - 7-assertion cross-file source guard for the internal-API isolation

## Decisions Made
- Flagged assumption 1 resolved: `ApplicationManager.getApplication().getService(PasswordSafeSettings.class)` compiled and is used as written on the pinned `ideaIC-2024.2` platform.
- Flagged assumption 3 (`DO_NOT_STORE` folded into `MEMORY_ONLY`) implemented as specified — both map to the same enum value and the same balloon body.
- Body literals for the balloon were written as single unsplit string literals (rather than `+`-concatenated across lines) so the plan's exact-wording acceptance criteria match a contiguous substring in the source, not a reconstructed one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `TokenBackend.java`'s javadoc leaked the literal `ProviderType`, violating the single-file isolation guarantee**
- **Found during:** Task 3 RED phase (`providerTypeAppearsInExactlyOneMainSourceFile`)
- **Issue:** `TokenBackend`'s class-level javadoc explained the class's purpose using the phrase "the platform's own `ProviderType` never leaves `BbjEMTokenStore.resolveBackend()`" — a legitimate explanation, but it put the literal text `ProviderType` into a second file, which the plan's own acceptance criterion (and D-11's whole point) requires appear in exactly one file, `BbjEMTokenStore.java`.
- **Fix:** Reworded the sentence to "the platform's own password-provider enum never leaves `BbjEMTokenStore.resolveBackend()`" — same meaning, no literal identifier, no behaviour change.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenBackend.java`
- **Verification:** `EmTokenBackendNoticeSourceGuardTest` 7/7 passing after the reword; whole suite 216/216.
- **Committed in:** `efcf838`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** A one-word-phrase javadoc reword with zero behavioural change. No scope creep — the fix is exactly the isolation guarantee this task's own source guard exists to enforce, applied to itself.

## Issues Encountered

- Task 2's appended tests (5-10) all passed on first run with no production change to `BackendNoticePolicy` — Task 1's tracer slice had already implemented the full decision rule (reset-on-keychain, warn-again-on-different-backend, UNKNOWN warn-worthiness, concurrency atomicity). This is documented rather than treated as a TDD violation: the plan's own action text anticipates it ("If any rule does not already hold... fix the policy — not the test"), and the genuinely new Task 2 production code — the balloon body — is exercised only by grep-based acceptance criteria, not by `BackendNoticePolicyTest` (which is deliberately platform-import-free and cannot see `Notification`/`NotificationType`).

## User Setup Required
None - no external service configuration required.

## Human UAT items (carry into `/gsd-verify-work`)

1. **Live KeePass balloon (D-13).** In a sandbox IDE, set Settings > Appearance & Behavior > System Settings > Passwords to "In KeePass", then Tools > Login to Enterprise Manager. Expect exactly one WARNING balloon in the "BBj Language Server" group naming the KeePass file. Log in again and run a BUI or DWC file: expect no further balloon.
2. **Downgrade re-warns.** Switch Passwords back to the native keychain, run once (no balloon), then switch to "Do not save, forget passwords after restart" and run again: expect a new balloon naming the memory-only store.
3. **"Open Password Settings" action target.** Click the action on the balloon and confirm it opens the IDE's Passwords page (`ShowSettingsUtil.getInstance().showSettingsDialog(project, "Passwords")` as written — not independently verified against a running IDE in this environment). If it does not open the expected page, the working selector needs to be recorded and the call adjusted.

## Threat Flags

None — this plan introduces no surface beyond what its own threat register (T-80-12 … T-80-18, T-80-SC) already enumerates and mitigates or explicitly accepts.

## Known Stubs

None. `showBackendBalloon` — the one stub Task 1 deliberately left — was filled in by Task 2; no placeholder value or unwired data path remains.

## Next Phase Readiness
- TOKEN-03 (#552) is complete on the code side: a non-keychain backend produces one balloon naming it, the internal-API access sits in exactly one method covered by a regression test, and a detection failure warns rather than passing silently as the keychain. Issue closure additionally needs the human UAT items above (a live-IDE check, not blocking this plan's own success criteria).
- No file in this plan is shared with 80-02 (Windows ACL) or 80-01's remaining surface. `BbjEMTokenStore.java` was edited after 80-01 merged, per the plan's own sequencing note.
- 80-04 (TOKEN-04, validation trust cache) is unaffected by this plan's changes — it depends on 80-01, which already landed.

---
*Phase: 80-em-token-security*
*Completed: 2026-09-04*
