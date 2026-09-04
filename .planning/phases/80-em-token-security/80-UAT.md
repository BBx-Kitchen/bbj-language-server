---
status: testing
phase: 80-em-token-security
source: [80-VERIFICATION.md]
started: 2026-09-04T16:27:35Z
updated: 2026-09-04T16:27:35Z
---

## Current Test

number: 1
name: Windows temp file carries exactly one owner ACE (TOKEN-02, #536)
expected: |
  Exactly one ACE granting the logged-in account; no ACE for BUILTIN\Users, Everyone, or NT AUTHORITY\Authenticated Users; no (I) inherited entry. Login/validation still completes (write-through proof).
awaiting: user response

## Tests

### 1. Windows temp file carries exactly one owner ACE (TOKEN-02, #536)
steps: On a Windows host with the plugin installed, trigger Tools > Login to Enterprise Manager and, while em-login.bbj is running, run `icacls %TEMP%\bbj-em-login-*.tmp` (a throwaway JShell call to BbjProcessSecretEnv.createOwnerOnlyFile is an acceptable substitute).
expected: Exactly one ACE granting the logged-in account; no ACE for BUILTIN\Users, Everyone, or NT AUTHORITY\Authenticated Users; no (I) inherited entry. Login/validation still completes (write-through proof).
why_human: CI is ubuntu-latest only and the verification host has a POSIX filesystem, so the acl branch of createOwnerOnlyFile is never executed by any automated test; it is proven by OwnerOnlyAclTest, the strategy test in BbjProcessSecretEnvTest, and BbjSecretArgvSourceGuardTest.
coverage_id: 80-02 D-10d
result: [pending]

### 2. Live KeePass balloon, exactly once (TOKEN-03, #552)
steps: In a sandbox IDE, set Settings > Appearance & Behavior > System Settings > Passwords to "In KeePass", then Tools > Login to Enterprise Manager. Log in again and run a BUI or DWC file.
expected: Exactly one WARNING balloon in the "BBj Language Server" group naming the KeePass file appears on first login; no further balloon on the second login/run.
why_human: No automated test renders an IntelliJ notification balloon; BackendNoticePolicyTest exercises the decision logic against a counting double.
coverage_id: 80-03 D-13
result: [pending]

### 3. Downgrade re-warns after a return to the keychain (TOKEN-03, #552)
steps: Switch Passwords back to the native keychain, run once (expect no balloon), then switch to "Do not save, forget passwords after restart" and run again.
expected: A new balloon appears naming the memory-only store.
why_human: The reset/re-warn rule is proven against a plain-Java double, not the live PasswordSafe settings UI.
coverage_id: 80-03 D-12
result: [pending]

### 4. "Open Password Settings" action lands on the Passwords page (TOKEN-03, #552)
steps: Click the "Open Password Settings" action on the balloon.
expected: The IDE's Passwords settings page opens.
why_human: The settings-page selector string is a flagged assumption never confirmed against a running IDE in this environment.
coverage_id: 80-03 flagged assumption 2
result: [pending]

### 5. Two quick Runs, one validation subprocess (TOKEN-04, #542)
steps: In a sandbox IDE with EM login done, Run As BUI on a file, then immediately Run As BUI again.
expected: The second launch starts noticeably faster and no second em-validate-token.bbj subprocess appears.
why_human: No automated test drives a live Run action or observes the spawned subprocess; TokenValidationCacheTest proves the hit/miss arithmetic with a counting BooleanSupplier and a fixed clock.
coverage_id: 80-04 D-14/D-17
result: [pending]

### 6. Logout clears trust (TOKEN-04, #542)
steps: Run once (validated), log out (or let the token be deleted), log back in, then Run.
expected: The validation subprocess runs again on the first Run after re-login.
why_human: The invalidate()-on-storeToken/deleteToken wiring is proven by a source guard and a unit test, not by a live logout/login/Run cycle.
coverage_id: 80-04 D-16
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
