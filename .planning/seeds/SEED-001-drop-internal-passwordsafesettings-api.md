---
id: SEED-001
status: dormant
planted: 2026-09-16
planted_during: v4.3 (complete) / phase 92
trigger_when: now — blocks the next Manual Release
scope: small
---

# SEED-001: Drop the internal PasswordSafeSettings/ProviderType API from BbjEMTokenStore.resolveBackend() in favour of the public PasswordSafe.isMemoryOnly()

## Why This Matters

The Manual Release workflow run for v0.15.0 (run 35064112482, 2026-09-16) failed at
`build-intellij` → "Verify plugin compatibility":

```
Verification failed with [INTERNAL_API_USAGES] problems
```

The IntelliJ Plugin Verifier reported the plugin **Compatible** against all four IDEs
(IC-242, IC-243, IC-251, IC-252). Only the failure-level gate failed, on a single usage:

- `com.intellij.credentialStore.PasswordSafeSettings.getProviderType()` — `@ApiStatus.Internal`
- `com.intellij.credentialStore.ProviderType.DO_NOT_STORE` — also the deprecated-API usage in the same report

This code shipped fine in v0.14.0. What changed is the build, not the code: PR #669
(`aa87a21f`, 2026-09-14) bumped the IntelliJ Platform Gradle Plugin **2.11.0 → 2.18.1**, and
plugin **2.15.0** expanded the default `failureLevel` to include internal and override-only API
usages. `bbj-intellij/build.gradle.kts` sets no explicit `failureLevel`, so it silently inherited
the stricter default.

It went unnoticed until release time because **`verifyPlugin` runs only in
`manual-release.yml`** — not in `build.yml`, `pr-validation.yml` or `preview.yml`. PR #669 was
green and every preview build since has been green.

The decision (2026-09-16) was to fix the code rather than relax the gate, so the verifier keeps
catching real internal-API drift.

## When to Surface

**Trigger:** now — blocks the next Manual Release

v0.15.0 is half-released: `origin/main` carries the `Release version 0.15.0` commit, tag `v0.15.0`
exists, and the VS Code Marketplace has 0.15.0, but the IntelliJ plugin was never published and no
GitHub Release was created. Re-dispatching Manual Release with 0.15.0 cannot work — the version
validation rejects a non-greater version and `git tag v0.15.0` already exists — so the fix must
land and ship as 0.16.0.

## Scope Estimate

**Small** — one method, its guard test, and the notice's semantics. A few hours at most.

### Approach

`javap` against the pinned platform (`ideaIC-2024.2`) confirms the replacement exists:

| API | Status |
|-----|--------|
| `PasswordSafeSettings.getProviderType()` | internal — what fails the gate |
| `ProviderType.DO_NOT_STORE` | deprecated |
| `PasswordSafe.isMemoryOnly()` | **public, not annotated internal** — the replacement |
| `PasswordSafe.isPasswordStoredOnlyInMemory(attrs, creds)` | public, same limitation |

**Accepted consequence (decided 2026-09-16):** the public surface distinguishes only
*memory-only* from *persisted*. Nothing public tells an OS keychain from a KeePass file, so the
#552 notice narrows from three-way to two-way:

- memory-only → warn ("token will be lost when the IDE restarts")
- anything persisted → no warning

KeePass users stop being told they are not on the OS keychain. `TokenBackend` and
`BackendNoticePolicy` stay — the policy seam and its plain-Java tests are unaffected; only
`resolveBackend()`'s classification source changes.

The source guard `EmTokenBackendNoticeSourceGuardTest` asserts the *presence* of
`PasswordSafeSettings`, `ProviderType` and `getProviderType()` in exactly one file, so it must be
inverted to assert their **absence** from `src/main/java` entirely.

## Breadcrumbs

Code to change:
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:145-170` — `resolveBackend()`, the only internal-API site; imports at lines 6-7
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:94-132` — `showBackendBalloon()`, whose `KEEPASS_FILE` branch becomes unreachable
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenBackend.java` — classification enum (no `com.intellij` import; keep it that way)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BackendNoticePolicy.java` — policy seam, unchanged

Tests to update:
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java` — asserts the internal API is present in exactly one file; invert to absence
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java` — behavioural rule, should survive unchanged

Build/CI context:
- `bbj-intellij/build.gradle.kts:86` — `pluginVerification { ides { recommended() } }`, no explicit `failureLevel`
- `bbj-intellij/settings.gradle.kts:2` — platform plugin `2.18.1` (was `2.11.0` at v0.14.0)
- `.github/workflows/manual-release.yml:138` — the only place `verifyPlugin` runs

Related decisions:
- #552 — the backend notice this narrows
- #669 / `aa87a21f` — the Gradle 9 + platform plugin 2.18.1 migration that surfaced it
- Deliberately **not** filed as a GitHub issue (2026-09-16): internal detail, tracked here instead

## Notes

Two follow-ups were considered alongside this and are **not** part of it:

1. Pinning `failureLevel` back to `COMPATIBILITY_PROBLEMS` — rejected in favour of fixing the code.
2. Running `verifyPlugin` in PR validation so a verifier-default change cannot ambush a release
   again — still open, worth doing separately.
