---
phase: 11-enhance-em-auth-token-info-string-change
plan: 01
subsystem: auth
tags: [em, jwt, info-string, vscode, intellij]

provides:
  - "EM auth token payload uses 'info-string' key instead of 'client'"
  - "VS Code info string includes IDE, platform, and OS username"
  - "IntelliJ info string includes IDE, platform, and OS username"
affects: [em-login, em-auth, token-payload]

key-files:
  modified:
    - bbj-vscode/tools/em-login.bbj
    - bbj-vscode/src/extension.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java

key-decisions:
  - "Used os.userInfo().username for VS Code and System.getProperty('user.name') for IntelliJ -- platform-idiomatic username retrieval"

duration: 1min
completed: 2026-02-16
---

# Quick Task 11: Enhance EM Auth Token Info String

**Renamed payload key from "client" to "info-string" and enriched info string format to "{IDE} on {platform} as {username}" in both VS Code and IntelliJ**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-16T12:13:49Z
- **Completed:** 2026-02-16T12:14:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Changed BBj EM login payload key from `"client"` to `"info-string"` for correct API alignment
- VS Code now sends info strings like `"VS Code on MacOS as beff"` instead of `"MacOS VS Code"`
- IntelliJ now sends info strings like `"IntelliJ on MacOS as beff"` instead of `"MacOS IntelliJ IDE"`
- Both IDEs include OS username for better session identification in Enterprise Manager

## Task Commits

Each task was committed atomically:

1. **Task 1: Update payload key and VS Code info string** - `662a095` (feat)
2. **Task 2: Update IntelliJ info string format** - `5a5b6ed` (feat)

## Files Modified
- `bbj-vscode/tools/em-login.bbj` - Changed payload key from "client" to "info-string", updated comment example
- `bbj-vscode/src/extension.ts` - Changed info string from `${platform} VS Code` to `VS Code on ${platform} as ${os.userInfo().username}`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` - Changed info string from `platform + " IntelliJ IDE"` to `"IntelliJ on " + platform + " as " + System.getProperty("user.name")`

## Decisions Made
- Used `os.userInfo().username` in VS Code (Node.js idiomatic) and `System.getProperty("user.name")` in IntelliJ (Java idiomatic) for OS username retrieval -- both are standard APIs requiring no additional imports

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit `662a095` found (Task 1)
- Commit `5a5b6ed` found (Task 2)

---
*Quick Task: 11-enhance-em-auth-token-info-string-change*
*Completed: 2026-02-16*
