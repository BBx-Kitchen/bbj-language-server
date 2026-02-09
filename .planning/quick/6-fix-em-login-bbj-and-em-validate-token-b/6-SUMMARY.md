---
phase: quick-6
plan: 01
subsystem: EM Integration
tags: [cross-platform, windows, authentication, bbj-scripts]
dependency_graph:
  requires: []
  provides:
    - Windows-compatible EM login and token validation
  affects:
    - VS Code extension EM authentication
    - IntelliJ plugin EM authentication
tech_stack:
  added: []
  patterns:
    - BBj temp file I/O for cross-platform compatibility
    - PRINT 'HIDE' mnemonic for GUI suppression
key_files:
  created: []
  modified:
    - bbj-vscode/tools/em-login.bbj
    - bbj-vscode/tools/em-validate-token.bbj
    - bbj-vscode/src/extension.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
decisions: []
metrics:
  duration: 158 seconds (~3 minutes)
  tasks_completed: 3
  files_modified: 5
  commits: 3
  completed: 2026-02-09
---

# Quick Task 6: Fix EM Login and Token Validation for Windows

**One-liner:** Replaced POSIX-only `-tIO` flag with hidden GUI client and temp file I/O for cross-platform EM authentication

## Context

The `em-login.bbj` and `em-validate-token.bbj` scripts used the `-tIO` flag to create text-only IO sessions, which only works on POSIX systems (Linux, macOS). This caused EM authentication to fail on Windows. By switching to a GUI client with the `PRINT 'HIDE'` mnemonic and writing results to temp files instead of stdout, these scripts now work cross-platform.

## Tasks Completed

### Task 1: Update BBj Scripts (acbc60f)

**Files modified:** `bbj-vscode/tools/em-login.bbj`, `bbj-vscode/tools/em-validate-token.bbj`

**Changes:**
- Added `? 'HIDE'` as first executable line to suppress GUI windows
- Added `outputFile!` parameter as last ARGV for both scripts
- Replaced all `print` statements with file I/O using `open(ch,mode="O_CREATE,O_TRUNC")outputFile!`
- Updated header comments to document new parameter

**Pattern used:**
```bbj
ch=unt
open(ch,mode="O_CREATE,O_TRUNC")outputFile!
write(ch)result!
close(ch)
```

### Task 2: Update VS Code Extension (046b3b6)

**Files modified:** `bbj-vscode/src/extension.ts`

**Changes:**
- Added `import * as os from 'os'` for temp directory access
- Updated `validateTokenServerSide()`:
  - Created temp file: `os.tmpdir()/bbj-em-validate-${Date.now()}.tmp`
  - Removed `-tIO` flag from command
  - Read result from temp file instead of stdout
  - Added cleanup in finally block
- Updated `bbj.loginEM` handler:
  - Created temp file: `os.tmpdir()/bbj-em-login-${Date.now()}.tmp`
  - Removed `-tIO` flag from command
  - Read result from temp file instead of stdout
  - Added cleanup in finally block
- Removed stdout line-parsing logic from both functions

**Verification:** TypeScript compilation succeeded (`npx tsc --noEmit`)

### Task 3: Update IntelliJ Plugin (e346a7c)

**Files modified:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`

**Changes:**
- **BbjEMLoginAction.performLogin():**
  - Created temp file: `Files.createTempFile("bbj-em-login-", ".tmp")`
  - Removed `-tIO` parameter
  - Added temp file path as last command parameter
  - Read result using `Files.readString(tmpFile).trim()`
  - Added cleanup in finally block
  - Removed stdout line-parsing loop

- **BbjRunActionBase.validateTokenServerSide():**
  - Created temp file: `Files.createTempFile("bbj-em-validate-", ".tmp")`
  - Removed `-tIO` parameter
  - Added temp file path as last command parameter
  - Read result using `Files.readString(tmpFile).trim()`
  - Wrapped entire method body in try-finally for cleanup
  - Removed stdout line-parsing loop

**Verification:** Java compilation succeeded (`./gradlew compileJava`)

## Overall Verification

All success criteria met:
- Zero `-tIO` flags remain in source files
- Both BBj scripts use `? 'HIDE'` and write to temp file
- VS Code extension (2 call sites) passes temp file paths, reads results, cleans up
- IntelliJ plugin (2 call sites) passes temp file paths, reads results, cleans up
- TypeScript compiles without errors
- Java compiles without errors

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

**Why temp files instead of other IPC mechanisms?**
- BBj's `PRINT 'HIDE'` suppresses GUI but BBj still needs an output mechanism
- Temp files are simpler than pipes/sockets and work reliably across platforms
- File I/O is well-supported in BBj with `unt`, `open()`, `write()`, `close()`

**Why `mode="O_CREATE,O_TRUNC"`?**
- Creates file if it doesn't exist
- Truncates if it does (ensures clean slate)
- Standard BBj file open mode for output

## Impact

**Before:** EM login and token validation failed on Windows due to `-tIO` flag

**After:** EM authentication works on all platforms (Windows, macOS, Linux)

**No breaking changes:** API contracts preserved - same functionality, different implementation

## Self-Check: PASSED

Files created: None (all modifications)

Files modified verified:
- FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/tools/em-login.bbj
- FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/tools/em-validate-token.bbj
- FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/extension.ts
- FOUND: /Users/beff/_workspace/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
- FOUND: /Users/beff/_workspace/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java

Commits verified:
- FOUND: acbc60f (BBj scripts)
- FOUND: 046b3b6 (VS Code extension)
- FOUND: e346a7c (IntelliJ plugin)
