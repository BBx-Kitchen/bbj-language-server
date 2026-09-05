---
status: complete
phase: 80-em-token-security
source: [80-VERIFICATION.md]
started: 2026-09-04T16:27:35Z
updated: 2026-09-05T07:08:36Z
---

## Current Test

[testing complete]

## Tests

### 1. Windows temp file carries exactly one owner ACE (TOKEN-02, #536)
steps: On a Windows host with the plugin installed, trigger Tools > Login to Enterprise Manager and, while em-login.bbj is running, run `icacls %TEMP%\bbj-em-login-*.tmp` (a throwaway JShell call to BbjProcessSecretEnv.createOwnerOnlyFile is an acceptable substitute).
expected: Exactly one ACE granting the logged-in account; no ACE for BUILTIN\Users, Everyone, or NT AUTHORITY\Authenticated Users; no (I) inherited entry. Login/validation still completes (write-through proof).
why_human: CI is ubuntu-latest only and the verification host has a POSIX filesystem, so the acl branch of createOwnerOnlyFile is never executed by any automated test; it is proven by OwnerOnlyAclTest, the strategy test in BbjProcessSecretEnvTest, and BbjSecretArgvSourceGuardTest.
coverage_id: 80-02 D-10d
result: issue
reported: "BBj can't create the tmp file in the first place: !ERROR=18 ([C:\Users\beff\AppData\Local\Temp\bbj-em-login-8853933440741698129.tmp] User not allowed: C:\Users\beff\AppData\Local\Temp\bbj-em-login-8853933440741698129.tmp) at [49] open(ch,mode=\"O_CREATE,O_TRUNC\")outputFile! in C:\Users\beff\AppData\Roaming\JetBrains\IntelliJIdea2026.2\plugins\bbj-intellij\lib\tools\em-login.bbj"
severity: blocker

### 2. Live KeePass balloon, exactly once (TOKEN-03, #552)
steps: In a sandbox IDE, set Settings > Appearance & Behavior > System Settings > Passwords to "In KeePass", then Tools > Login to Enterprise Manager. Log in again and run a BUI or DWC file.
expected: Exactly one WARNING balloon in the "BBj Language Server" group naming the KeePass file appears on first login; no further balloon on the second login/run.
why_human: No automated test renders an IntelliJ notification balloon; BackendNoticePolicyTest exercises the decision logic against a counting double.
coverage_id: 80-03 D-13
result: pass

### 3. Downgrade re-warns after a return to the keychain (TOKEN-03, #552)
steps: Switch Passwords back to the native keychain, run once (expect no balloon), then switch to "Do not save, forget passwords after restart" and run again.
expected: A new balloon appears naming the memory-only store.
why_human: The reset/re-warn rule is proven against a plain-Java double, not the live PasswordSafe settings UI.
coverage_id: 80-03 D-12
result: pass

### 4. "Open Password Settings" action lands on the Passwords page (TOKEN-03, #552)
steps: Click the "Open Password Settings" action on the balloon.
expected: The IDE's Passwords settings page opens.
why_human: The settings-page selector string is a flagged assumption never confirmed against a running IDE in this environment.
coverage_id: 80-03 flagged assumption 2
result: pass

### 5. Two quick Runs, one validation subprocess (TOKEN-04, #542)
steps: In a sandbox IDE with EM login done, Run As BUI on a file, then immediately Run As BUI again.
expected: The second launch starts noticeably faster and no second em-validate-token.bbj subprocess appears.
why_human: No automated test drives a live Run action or observes the spawned subprocess; TokenValidationCacheTest proves the hit/miss arithmetic with a counting BooleanSupplier and a fixed clock.
coverage_id: 80-04 D-14/D-17
result: pass

### 6. Logout clears trust (TOKEN-04, #542)
steps: Run once (validated), log out (or let the token be deleted), log back in, then Run.
expected: The validation subprocess runs again on the first Run after re-login.
why_human: The invalidate()-on-storeToken/deleteToken wiring is proven by a source guard and a unit test, not by a live logout/login/Run cycle.
coverage_id: 80-04 D-16
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-80-1
  truth: "On Windows, em-login.bbj writes through to the owner-only temp file (bbj-em-login-*.tmp) created by BbjProcessSecretEnv.createOwnerOnlyFile: the file carries exactly one ACE for the logged-in account and login/validation completes."
  status: failed
  reason: "User reported: BBj can't create the tmp file in the first place: !ERROR=18 ([C:\Users\beff\AppData\Local\Temp\bbj-em-login-8853933440741698129.tmp] User not allowed) at line 49 open(ch,mode=\"O_CREATE,O_TRUNC\")outputFile! in em-login.bbj (IntelliJ 2026.2 plugin, Windows host)"
  severity: blocker
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

## Observations

<!-- Side notes reported during UAT; not phase-80 gaps, captured for follow-up -->
- observed_during: test 1
  note: "An old IntelliJ 2015 installation accepted the plugin but it did not run correctly; consider trimming the supported IntelliJ version range (since-build)."
  reported_at: 2026-09-05
- observed_during: test 1
  note: "Auto-installation of Node.js did not work on the Windows test machine; user had to install Node manually and configure the node.exe home. This had been working before (possible regression)."
  reported_at: 2026-09-05
