---
status: complete
subsystem: bbj-intellij
tags: [intellij, password-safe, plugin-verifier, em-token]
dependency-graph:
  requires: []
  provides:
    - "BbjEMTokenStore.resolveBackend() classifying from the public PasswordSafe.isMemoryOnly()"
    - "Inverted source guard proving the internal password-settings API is absent from bbj-intellij/src/main/java"
  affects:
    - "IntelliJ Manual Release pipeline (verifyPlugin gate)"
tech-stack:
  added: []
  patterns:
    - "Source guard test inverted from presence-proof to absence-proof plus one-file containment of the public replacement"
key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenBackend.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java
decisions:
  - "Accepted #552 notice narrowing from three-way to two-way: memory-only still warns once; anything persisted (including KeePass) no longer warns, since the public PasswordSafe API cannot distinguish an OS keychain from a file-backed store"
  - "TokenBackend.KEEPASS_FILE and its showBackendBalloon() branch are kept as-is (policy vocabulary), even though production can no longer produce that classification"
metrics:
  duration: "~25min"
  completed: 2026-09-16
actuals:
  tokens: 12000
  tasks: 2
  commits: 1
---

# Quick Task 260916-9jy: Drop the internal PasswordSafeSettings API from BbjEMTokenStore Summary

Replaced `BbjEMTokenStore.resolveBackend()`'s dependency on the IntelliJ platform's internal `PasswordSafeSettings`/`ProviderType` API with the public `PasswordSafe.getInstance().isMemoryOnly()` flag, and inverted the source guard test so it now proves the internal API is permanently absent — unblocking the `verifyPlugin` release gate that failed on `INTERNAL_API_USAGES`.

## What Was Built

- `BbjEMTokenStore.java`: deleted the `PasswordSafeSettings`/`ProviderType` imports (and the now-unused `ApplicationManager` import); rewrote `resolveBackend()` to classify from `PasswordSafe.getInstance().isMemoryOnly()` — `true` yields `MEMORY_ONLY`, `false` yields `NATIVE_KEYCHAIN`, a null instance or any `Throwable` yields `UNKNOWN`; corrected `resolveBackend()`'s and `showBackendBalloon()`'s javadoc to describe the new two-way classification and the now-unreachable `KEEPASS_FILE` branch.
- `TokenBackend.java`: corrected the class javadoc (no longer claims a single method is allowed to touch an unstable internal API) and added a note on `KEEPASS_FILE` that the current platform API cannot detect it, though the policy still handles it.
- `EmTokenBackendNoticeSourceGuardTest.java`: inverted from proving the internal API's presence to proving its absence. `passwordSafeSettingsAppearsInExactlyOneMainSourceFile`/`providerTypeAppearsInExactlyOneMainSourceFile` became `theInternalPasswordSettingsServiceIsAbsentFromMainSources`/`theInternalProviderEnumIsAbsentFromMainSources` (assert empty results); added `theBackendClassificationCallAppearsInExactlyOneMainSourceFile` (proves `isMemoryOnly` is confined to `BbjEMTokenStore.java`); renamed `internalApiOccursOnlyAfterTheResolveBackendDeclaration` to `theBackendClassificationCallOccursOnlyInsideResolveBackend`, now scanning for `isMemoryOnly` instead of the internal identifiers; changed the `getProviderType()` assertion from `1` to `0`. Left `evaluateResolveBackendIsCalledExactlyTwice`, `thePolicyIsEvaluatedBeforePasswordSafeIsTouchedInBothEntryPoints`, and `backendNoticePolicyAndTokenBackendCarryNoIntellijPlatformImport` untouched, as planned.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - cleanliness] Removed the now-unused `ApplicationManager` import**
- **Found during:** Task 1, rewriting `resolveBackend()`
- **Issue:** The plan's instruction was "delete the two imports at lines 6-7... leave every other import alone," but rewriting `resolveBackend()` to use `PasswordSafe.getInstance()` directly (instead of `ApplicationManager.getApplication().getService(...)`) leaves the `ApplicationManager` import with zero remaining uses in the file.
- **Fix:** Deleted the unused `com.intellij.openapi.application.ApplicationManager` import alongside the two internal-API imports, since leaving a dead import in the file this change is specifically about tightening felt wrong and the plan's own naming-hazard guidance is about not reintroducing forbidden identifiers, not about preserving now-dead code.
- **Files modified:** `BbjEMTokenStore.java`
- **Commit:** `1c80dfb1`

None of the other deviation rules were triggered — the rest of the plan executed exactly as written, including the KeePass-retention decision and the javadoc rewording to avoid the forbidden identifiers.

## Auth Gates

None encountered.

## Anomaly — concurrent, unrelated modification observed in the shared working tree (not caused by this task)

While running Task 2's `verifyPlugin` gate, `git status` began showing `.github/workflows/pr-validation.yml` and `.github/workflows/preview.yml` as modified, plus a new untracked `.planning/seeds/SEED-002-verify-before-publish-and-cache-verifier-ides.md`. **I did not touch either workflow file at any point** — I never ran a Read, Edit, Write, or Bash command against `.github/workflows/*` in this session. The diff content (adding a `Verify plugin compatibility` / `./gradlew verifyPlugin` step to both workflows) and the new seed's title ("verify before publish and cache verifier IDEs") match each other closely, and an unrelated untracked file already present at session start (`.planning/milestones/v4.3-quick/9-automate-jetbrains-marketplace-publishin/...-SUMMARY.md`) suggests another concurrent process (a separate quick task or agent) is running against this same non-isolated working tree and editing these files independently of this task.

Per this task's scope (`No workflow change... deliberately deferred`) and the instruction to leave any modification not made by this task alone, I left both workflow files untouched — did not stage, commit, or revert them. This means the plan's literal done-check `git status --short bbj-intellij/build.gradle.kts .github/workflows` does **not** print nothing (it lists the two workflow files) — but this is exclusively due to the concurrent process, not this task's commit. `bbj-intellij/build.gradle.kts` itself is untouched, confirmed both by `git status --short bbj-intellij/build.gradle.kts` alone (prints nothing) and by re-reading the `pluginVerification` block (lines 86-90) before running the gate.

**Recommendation:** the orchestrator/user should confirm no other process is expected to be running against this same checkout concurrently, since a non-isolated shared working tree makes it impossible for this task to guarantee its own file-scope boundary is the only source of changes.

## Acceptance Gates — verbatim outcomes

### Gate 1: `./gradlew -p bbj-intellij test`

Run twice (once after Task 1's source change, once as Task 2's final confirmation). Both green:

```
BUILD SUCCESSFUL in 5s
18 actionable tasks: 9 executed, 9 up-to-date
```

Aggregated JUnit XML across all 102 test-result files: **873 tests, 0 failures, 0 errors.** The reworked `EmTokenBackendNoticeSourceGuardTest` (8 tests) passed cleanly after the source change; it had been confirmed to FAIL (4 of 8 tests) against the unmodified source first (RED), for the expected reasons (internal identifiers still present / classification call absent), before the GREEN source rewrite. `BackendNoticePolicyTest.java` is byte-identical to its planning-time state (`git status --short` on that file prints nothing) and all its tests, including the seven referencing `KEEPASS_FILE`, passed.

Final re-confirmation after Task 2's gate:
```
BUILD SUCCESSFUL in 1s
18 actionable tasks: 2 executed, 16 up-to-date
```

### Gate 2: `./gradlew -p bbj-intellij verifyPlugin`

```
BUILD SUCCESSFUL in 3m 53s
24 actionable tasks: 8 executed, 16 up-to-date
```

Per-IDE result lines (verbatim from the run):
```
Plugin com.basis.bbj:0.1.0 against IC-242.26775.15: Compatible. 25 usages of experimental API
Plugin com.basis.bbj:0.1.0 against IC-243.28141.41: Compatible. 25 usages of experimental API
Plugin com.basis.bbj:0.1.0 against IC-252.28539.97: Compatible. 1 usage of deprecated API. 23 usages of experimental API
Plugin com.basis.bbj:0.1.0 against IC-251.29188.72: Compatible. 1 usage of deprecated API. 23 usages of experimental API
```

No `Verification failed with [INTERNAL_API_USAGES] problems` line anywhere in the output (`grep -n "INTERNAL_API_USAGES|Verification failed"` over the full log returned nothing). Each per-IDE `verification-verdict.txt` under `bbj-intellij/build/reports/pluginVerifier/*/plugins/com.basis.bbj/0.1.0/` was independently checked for any mention of "internal" — all four returned nothing.

The one remaining "deprecated API" usage on IC-251/IC-252 (`TextMateHighlightingLexer.<init>(TextMateLanguageDescriptor, int)`, used in `BbxConfigSyntaxHighlighterFactory`) and the 23-25 experimental-API usages (LSP4IJ client-features classes, `Application.assertIsNonDispatchThread()`) are all pre-existing, unrelated to this task's file scope, and not a deprecated *provider-constant* usage — there is no reference anywhere in the log to `DO_NOT_STORE`, `ProviderType`, or `PasswordSafeSettings` (confirmed by grep).

No second commit was required in Task 2 — the gate passed cleanly on Task 1's commit `1c80dfb1`, and the pre-check grep (re-run before the slow gate) was already clean.

## Known Stubs

None.

## Threat Flags

None — the threat register's `T-9jy-01` (KeePass no longer warned) is the accepted, documented behavior change from the plan, not a new undocumented surface.

## Next Manual Release

The next Manual Release must ship as **0.16.0** — tag `v0.15.0` already exists (the v0.15.0 Manual Release that surfaced this bug did not complete, since it failed at `verifyPlugin`, but the tag was already created before that failure).

## Self-Check: PASSED

- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java`
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenBackend.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java`
- FOUND commit `1c80dfb1` in `git log --oneline --all`
