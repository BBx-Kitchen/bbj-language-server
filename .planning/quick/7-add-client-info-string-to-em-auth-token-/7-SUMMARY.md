---
phase: quick-7
plan: 01
subsystem: em-auth
tags: [em, authentication, token, client-info, multi-ide]
dependency_graph:
  requires: [em-login.bbj, BbjEMLoginAction.java, extension.ts]
  provides: [client-info-in-tokens]
  affects: [em-auth-tokens]
tech_stack:
  added: []
  patterns: [payload-metadata]
key_files:
  created: []
  modified:
    - bbj-vscode/tools/em-login.bbj
    - bbj-vscode/src/extension.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
decisions: []
metrics:
  duration_minutes: 1
  tasks_completed: 2
  files_modified: 3
  commits: 2
  completed_date: 2026-02-09
---

# Quick Task 7: Add Client Info String to EM Auth Token

EM auth tokens now include client info identifying the OS and IDE (e.g. "MacOS VS Code", "Windows IntelliJ IDE").

## Tasks Completed

### Task 1: Add optional client info parameter to em-login.bbj
- **Commit:** 449c605
- **Files:** bbj-vscode/tools/em-login.bbj
- **Changes:**
  - Added 4th ARGV parameter for optional client info string
  - Put client info into payload HashMap when provided
  - Updated header comment to document new parameter
  - Backward compatible: no 4th arg = empty payload as before

### Task 2: Pass client info string from VS Code and IntelliJ callers
- **Commit:** 3f6aa1f
- **Files:** bbj-vscode/src/extension.ts, bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
- **Changes:**
  - VS Code: Build infoString with platform + "VS Code" and pass as 4th arg
  - IntelliJ: Detect platform and pass platform + "IntelliJ IDE" as 4th arg
  - Platform detection: Windows/MacOS/Linux

## Verification

All verification criteria passed:
- em-login.bbj reads 4th ARGV, puts "client" into payload HashMap when present
- extension.ts builds emLoginCmd with platform + "VS Code" as 4th argument
- BbjEMLoginAction.java adds platform + "IntelliJ IDE" as additional cmd parameter
- No existing functionality is broken (4th param is optional in BBj stub)

## Success Criteria

All success criteria met:
- All three files updated
- Client info string flows from IDE caller through em-login.bbj into the EM auth token payload
- Backward compatible (no 4th arg = empty payload as before)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Implementation

The client info string is passed from the IDE caller (VS Code or IntelliJ) to the em-login.bbj script, which puts it into the payload HashMap with the key "client". This payload is then passed to BBjAdminFactory.getAuthToken(), which includes it in the JWT token.

Example client info strings:
- "MacOS VS Code"
- "Windows VS Code"
- "Linux VS Code"
- "MacOS IntelliJ IDE"
- "Windows IntelliJ IDE"
- "Linux IntelliJ IDE"

### Backward Compatibility

The 4th parameter is optional. If not provided, the BBj script's `ARGV(4,err=*next)` will error to `*next`, leaving `infoString!` as null, and the conditional `if (infoString! <> null())` will skip adding the "client" key to the payload. This maintains backward compatibility with any existing callers that don't provide the 4th argument.

## Self-Check

Verifying all claimed files and commits exist.

Files:
- FOUND: bbj-vscode/tools/em-login.bbj
- FOUND: bbj-vscode/src/extension.ts
- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java

Commits:
- FOUND: 449c605
- FOUND: 3f6aa1f

## Self-Check: PASSED
