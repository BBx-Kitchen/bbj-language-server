---
phase: 31-extension-settings-file-types
plan: 04
subsystem: auth
tags: [intellij, passwordsafe, jwt, em-auth, security]

# Dependency graph
requires:
  - phase: 31-03
    provides: VS Code EM login with SecretStorage and em-login.bbj stub
provides:
  - IntelliJ EM authentication via PasswordSafe with auto-prompt login
  - Login to EM action in Tools menu
  - Token-based BUI/DWC run commands (no plaintext passwords)
affects: [31-extension-settings-file-types]

# Tech tracking
tech-stack:
  added: [IntelliJ PasswordSafe CredentialStore API]
  patterns: [Auto-prompt login pattern for run actions, Static performLogin() for reusable authentication flow]

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java

key-decisions:
  - "Use PasswordSafe instead of plaintext settings for EM credentials"
  - "Auto-prompt login when no token stored (not just error message)"
  - "Replace emUsername/emPassword with emUrl in settings"
  - "Pass empty strings for username/password placeholders to web.bbj"

patterns-established:
  - "Auto-prompt login pattern: BUI/DWC run actions call BbjEMLoginAction.performLogin() if no token"
  - "Static performLogin() method enables programmatic login from any context"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 31 Plan 04: IntelliJ EM Authentication Summary

**IntelliJ migrated to token-based EM auth with PasswordSafe storage and auto-prompt login for BUI/DWC run commands**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-07T14:16:30Z
- **Completed:** 2026-02-07T14:20:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Removed plaintext EM credentials (emUsername, emPassword) from IntelliJ settings
- Added EM URL field to settings UI
- Implemented auto-prompt login in BUI/DWC run actions when no token stored
- Login to EM action available in Tools menu (already created in 31-03)
- BUI/DWC commands retrieve JWT from PasswordSafe and pass to web.bbj as param 8

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EM token store utility and login action** - No new commit (files already present from 31-03: `3034447`)
2. **Task 2: Update IntelliJ settings and run actions for token-based auth** - `50c52df` (feat)

**Plan metadata:** Not yet committed

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - Replaced emUsername/emPassword with emUrl field
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - Added EM URL field UI, removed username/password fields
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - Updated settings binding to use emUrl
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` - Auto-prompt login, retrieve token from PasswordSafe
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java` - Auto-prompt login, retrieve token from PasswordSafe

## Decisions Made

1. **Token store and login action already implemented in 31-03** - BbjEMTokenStore and BbjEMLoginAction were already created with the exact implementation required by this plan, so no new files were needed
2. **Auto-prompt login pattern** - When BUI/DWC run actions detect no stored token, they show a Yes/No dialog asking if the user wants to log in now, providing better UX than just an error message
3. **Empty string placeholders for username/password** - To maintain backward compatibility with web.bbj parameter positions, pass empty strings for params 5 and 6 (username/password), then token as param 8

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Task 1 files were already present from 31-03 execution, matching the plan requirements exactly. Task 2 proceeded smoothly with no issues.

## User Setup Required

None - no external service configuration required. Users will be prompted to log in via dialog when they first run a BUI/DWC command.

## Next Phase Readiness

- IntelliJ EM authentication complete with secure token storage
- No plaintext passwords in IntelliJ settings
- Auto-prompt login provides smooth UX
- Ready for any subsequent phase requiring EM authentication

---
*Phase: 31-extension-settings-file-types*
*Completed: 2026-02-07*

## Self-Check: PASSED

All modified files exist and all commits are present in git history.
