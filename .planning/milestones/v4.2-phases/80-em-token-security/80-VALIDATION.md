---
phase: "80"
slug: "em-token-security"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-04"
reconstructed: true
---

# Phase 80 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed from PLAN/SUMMARY artifacts by `/gsd-validate-phase 80` after execution (State B): research was disabled for this phase, so no VALIDATION.md was seeded at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (plain JVM, no IntelliJ platform test fixture) via Gradle |
| **Config file** | `bbj-intellij/build.gradle.kts` (JDK 17 daemon toolchain, phase 78) |
| **Quick run command** | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests '<FQCN>'` |
| **Full suite command** | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test` (add `--rerun` when Gradle reports the task UP-TO-DATE) |
| **Estimated runtime** | ~5 s warm daemon, ~2 min cold (Gradle configuration dominates) |

Prerequisite: `bbj-vscode/out/language/main.cjs` must exist (phase 78 fail-fast bundle check) or packaging tasks abort; `./gradlew test` itself does not need it.

---

## Sampling Rate

- **After every task commit:** Run the plan's targeted test classes with `--tests`
- **After every plan wave:** Run `./gradlew test --rerun`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 80-01-01 | 01 | 1 | TOKEN-01 | T-80-01..05 | An undecodable JWT classifies MALFORMED and is treated as expired | unit | `./gradlew test --tests 'com.basis.bbj.intellij.actions.JwtValidityTest'` | ✅ | ✅ green (12) |
| 80-01-02 | 01 | 1 | TOKEN-01 | T-80-01..05 | Two-part, exp-less, decode-throwing, decimal-exp and null tokens all fail closed; `exp == now` is EXPIRED | unit | `./gradlew test --tests 'com.basis.bbj.intellij.actions.JwtValidityTest'` | ✅ | ✅ green (12) |
| 80-01-03 | 01 | 1 | TOKEN-01 | T-80-01..05 | Login rejects a MALFORMED/EXPIRED result before `storeToken`; the four fail-open `return false` sites are gone | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.actions.EmTokenFailClosedSourceGuardTest'` | ✅ | ✅ green (7) |
| 80-02-01 | 02 | 1 | TOKEN-02 | T-80-06..11 | One ALLOW entry for one principal, no inherit flags, supplied as `acl:acl` at creation | unit | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.OwnerOnlyAclTest' --tests 'com.basis.bbj.intellij.lsp.BbjProcessSecretEnvTest'` | ✅ | ✅ green (6 + 29) |
| 80-02-02 | 02 | 1 | TOKEN-02 | T-80-06..11 | `selectOwnerOnlyStrategy` throws when neither view exists; POSIX branch and its 23 prior tests unchanged; concurrent launches get distinct files | unit | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.BbjProcessSecretEnvTest'` | ✅ | ✅ green (29) |
| 80-02-03 | 02 | 1 | TOKEN-02 | T-80-06..11 | `acl:acl` branch present, bare two-argument `createTempFile(prefix, suffix)` absent | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.BbjSecretArgvSourceGuardTest'` | ✅ | ✅ green (19) |
| 80-03-01 | 03 | 2 | TOKEN-03 | T-80-12..18 | One notification per distinct non-keychain backend; UNKNOWN is warn-worthy | unit | `./gradlew test --tests 'com.basis.bbj.intellij.actions.BackendNoticePolicyTest'` | ✅ | ✅ green (10) |
| 80-03-02 | 03 | 2 | TOKEN-03 | T-80-12..18 | Downgrade re-warns, return-to-keychain clears, concurrent evaluate yields one balloon | unit | `./gradlew test --tests 'com.basis.bbj.intellij.actions.BackendNoticePolicyTest'` | ✅ | ✅ green (10) |
| 80-03-03 | 03 | 2 | TOKEN-03 | T-80-12..18 | `PasswordSafeSettings`/`ProviderType` appear only inside `resolveBackend()`; seams carry no `com.intellij` import | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.actions.EmTokenBackendNoticeSourceGuardTest'` | ✅ | ✅ green (7) |
| 80-04-01 | 04 | 3 | TOKEN-04 | T-80-19..25 | Two Runs with the same token within the window run the server check once | unit | `./gradlew test --tests 'com.basis.bbj.intellij.actions.TokenValidationCacheTest'` | ✅ | ✅ green (11) |
| 80-04-02 | 04 | 3 | TOKEN-04 | T-80-19..25 | Window expiry, `invalidate()`, a different token, a MALFORMED token and a failed validation all miss; cache holds a digest, never plaintext | unit | `./gradlew test --tests 'com.basis.bbj.intellij.actions.TokenValidationCacheTest'` | ✅ | ✅ green (11) |
| 80-04-03 | 04 | 3 | TOKEN-04 | T-80-19..25 | BUI/DWC call only `validateTokenTrusted`; `storeToken`/`deleteToken` call `invalidate()` | source-guard | `./gradlew test --tests 'com.basis.bbj.intellij.actions.EmTokenTrustWindowSourceGuardTest'` | ✅ | ✅ green (7) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement coverage (all four phase requirements have at least one green automated test; whole suite 25 classes / 234 tests / 0 failures on 2026-09-04):

| Requirement | Covering tests | Gap type |
|-------------|----------------|----------|
| TOKEN-01 (#535) | `JwtValidityTest` (12), `EmTokenFailClosedSourceGuardTest` (7) | COVERED |
| TOKEN-02 (#536) | `OwnerOnlyAclTest` (6), `BbjProcessSecretEnvTest` (29), `BbjSecretArgvSourceGuardTest` (19) | COVERED (Windows half by pure builder + source guard; see Manual-Only) |
| TOKEN-03 (#552) | `BackendNoticePolicyTest` (10), `EmTokenBackendNoticeSourceGuardTest` (7) | COVERED |
| TOKEN-04 (#542) | `TokenValidationCacheTest` (11), `EmTokenTrustWindowSourceGuardTest` (7) | COVERED |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 stubs were needed: every task wrote its own failing test first (red observed in the SUMMARY for each task) against the JUnit 5 classpath phase 78 provisioned.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Windows temp file carries exactly one ALLOW ACE for the current user and no inherited ACEs | TOKEN-02 | CI is `ubuntu-latest` only and this host has a POSIX filesystem, so the `acl` branch never executes in any test | On a Windows host with the plugin installed, log in to EM and run `icacls %TEMP%\bbj-em-login-*.tmp` while `em-login.bbj` runs (or call `createOwnerOnlyFile` from JShell); expect one `(F)`-style ACE for the current user only |
| `em-login.bbj` can still truncate-and-write the ACL-restricted file | TOKEN-02 | Same Windows-only path | Complete an EM login on Windows; expect the success dialog and a stored token |
| One non-modal WARNING balloon naming the KeePass file, exactly once | TOKEN-03 | No test renders an IntelliJ notification balloon | Set Passwords to "In KeePass", Tools > Login to Enterprise Manager: one balloon in the "BBj Language Server" group; log in again and run a BUI file: no further balloon |
| Downgrade re-warns after a return to the keychain | TOKEN-03 | Same | Switch to native keychain, run once (no balloon), switch to "Do not save", run again: new balloon naming the memory-only store |
| "Open Password Settings" action lands on the Passwords page | TOKEN-03 | Same | Click the action on the balloon |
| Second Run within five minutes skips the validation subprocess | TOKEN-04 | No test drives a live Run action or observes the spawned subprocess | Run As BUI twice in quick succession; the second launch is noticeably faster and no second `em-validate-token.bbj` process appears |
| Logout clears trust | TOKEN-04 | Same | Run once, log out, log in, Run: the validation subprocess runs again on the first Run after re-login |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-04 (reconstructed; all 12 task commands re-run green during the wave gates)

## Validation Audit 2026-09-04
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
