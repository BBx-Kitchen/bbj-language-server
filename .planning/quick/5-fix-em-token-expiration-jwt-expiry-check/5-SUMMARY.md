---
phase: quick-5
plan: 01
subsystem: run-commands
tags:
  - authentication
  - token-validation
  - jwt
  - bui
  - dwc
  - vscode
  - intellij
dependency_graph:
  requires: []
  provides:
    - client-side-jwt-expiry-check
    - server-side-token-validation
  affects:
    - bbj-vscode/src/extension.ts
    - bbj-intellij BUI/DWC actions
tech_stack:
  added:
    - em-validate-token.bbj
  patterns:
    - jwt-payload-decode
    - base64url-decoding
    - server-side-validation
key_files:
  created:
    - bbj-vscode/tools/em-validate-token.bbj
  modified:
    - bbj-vscode/tools/em-login.bbj
    - bbj-vscode/src/extension.ts
    - bbj-intellij/build.gradle.kts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
decisions:
  - Two-tier validation: client-side JWT decode (fast path) + server-side BBjAdmin check (authoritative)
  - Automatic re-login flow on expired/invalid tokens (no manual intervention)
  - 525000 minute token duration for persistent logins
metrics:
  duration: 252 seconds
  completed: 2026-02-09
---

# Quick Task 5: Fix EM Token Expiration JWT Expiry Check

**One-liner:** JWT expiry check + server-side token validation before BUI/DWC launch in both IDEs

## Objective

Fix EM token expiration handling by adding client-side JWT expiry checking and server-side token validation before BUI/DWC launches in both VS Code and IntelliJ. Expired/revoked tokens now trigger automatic re-login instead of failing at runtime with unhelpful error messages.

## What Was Built

### VS Code Extension

1. **isTokenExpired()** - Decodes JWT base64url payload, extracts exp claim, compares against current time
2. **validateTokenServerSide()** - Executes em-validate-token.bbj against EM to check token validity
3. **ensureValidToken()** - Helper function that combines credential fetch, client-side expiry check, server-side validation, and automatic re-login flow
4. **Updated getEMCredentials()** - Now checks token expiry before returning credentials
5. **Updated BUI/DWC commands** - Replaced manual login prompts with ensureValidToken() helper

### IntelliJ Plugin

1. **BbjEMTokenStore.isTokenExpired()** - JWT payload decoder using Base64.getUrlDecoder(), regex parsing for exp claim
2. **BbjRunActionBase.getEmValidateBbjPath()** - Resolves bundled em-validate-token.bbj path
3. **BbjRunActionBase.validateTokenServerSide()** - Runs em-validate-token.bbj via CapturingProcessHandler
4. **BUI/DWC Actions** - Added two-tier validation: client-side expiry check (fast path) → server-side validation → automatic re-login prompt

### Shared Infrastructure

1. **em-validate-token.bbj** - Server-side token validation script using BBjAdminFactory.getBBjAdmin()
2. **em-login.bbj duration change** - Updated from 0 (server default) to 525000 minutes for persistent tokens
3. **Gradle bundling** - Updated copyWebRunner and prepareSandbox tasks to include em-validate-token.bbj

## Implementation Details

### JWT Expiry Check (Client-Side)

Both IDEs decode JWT tokens locally to check expiration before making network calls:

**TypeScript (VS Code):**
- Split token by `.` (header.payload.signature)
- Base64url-decode payload: replace `-` with `+`, `_` with `/`, decode as base64
- Parse JSON, extract `exp` claim (Unix timestamp in seconds)
- Compare against `Math.floor(Date.now() / 1000)`

**Java (IntelliJ):**
- Split token by `\\.`
- Base64url-decode using `Base64.getUrlDecoder().decode()`
- Regex pattern `"exp"\s*:\s*(\d+)` to extract exp claim (no JSON library needed)
- Compare against `System.currentTimeMillis() / 1000`

Both implementations return `false` (not expired) on any parsing error, deferring to server-side validation.

### Server-Side Validation

em-validate-token.bbj runs `BBjAdminFactory.getBBjAdmin(token)` to verify token against EM:
- Prints "VALID" if token is accepted by EM
- Prints "INVALID" if token is expired, revoked, or malformed
- 10-second timeout in both IDEs to prevent hangs

### Automatic Re-Login Flow

When a token fails validation:
1. Delete expired/invalid token from storage (SecretStorage in VS Code, PasswordSafe in IntelliJ)
2. Show user-friendly message: "EM token expired or invalid. Login again?"
3. Execute loginEM command automatically on user confirmation
4. Re-fetch credentials and proceed with BUI/DWC launch
5. If user cancels, abort the run command gracefully

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| d9db651 | feat(quick-5): add em-validate-token.bbj and update token duration | em-validate-token.bbj, em-login.bbj, build.gradle.kts |
| 97bc7e7 | feat(quick-5): add JWT expiry check and server-side validation to VS Code | extension.ts |
| 3a17f15 | feat(quick-5): add JWT expiry check and server-side validation to IntelliJ | BbjEMTokenStore.java, BbjRunActionBase.java, BbjRunBuiAction.java, BbjRunDwcAction.java |

## Testing & Verification

- TypeScript compilation: `npm run build` succeeded
- Java compilation: `./gradlew compileJava` succeeded
- em-validate-token.bbj bundled in both VS Code tools/ and IntelliJ lib/tools/
- isTokenExpired() functions present in both IDEs
- validateTokenServerSide() functions present in both IDEs
- BUI/DWC commands use new validation flow

## Edge Cases Handled

1. **Malformed tokens** - Return false from isTokenExpired(), defer to server validation
2. **Missing exp claim** - Return false (can't determine expiry), defer to server validation
3. **Server validation timeout** - 10s timeout prevents hangs, treats as invalid
4. **User cancels re-login** - Gracefully abort run command (no error spam)
5. **Token revoked but not expired** - Server-side validation catches this (client-side only checks exp)

## Impact

- **User experience:** Clear feedback on token expiration, automatic re-login prompts
- **Reliability:** Two-tier validation (fast client-side check + authoritative server check)
- **Performance:** Client-side JWT decode prevents unnecessary network calls for obviously expired tokens
- **Security:** Server-side validation ensures revoked tokens are caught even if not expired

## Self-Check: PASSED

**Created files exist:**
```
FOUND: bbj-vscode/tools/em-validate-token.bbj
```

**Commits exist:**
```
FOUND: d9db651
FOUND: 97bc7e7
FOUND: 3a17f15
```

**Build verification:**
- VS Code TypeScript: ✓ Compiled
- IntelliJ Java: ✓ Compiled

**Function presence:**
- VS Code: isTokenExpired ✓, validateTokenServerSide ✓, ensureValidToken ✓
- IntelliJ: isTokenExpired ✓, validateTokenServerSide ✓, getEmValidateBbjPath ✓

**Usage verification:**
- BUI/DWC commands in VS Code use ensureValidToken ✓
- BUI/DWC actions in IntelliJ call isTokenExpired and validateTokenServerSide ✓
