---
phase: 261023-mtv-intellij-version-aware-node-js-cache-pin
plan: 01
subsystem: bbj-intellij
tags: [intellij, nodejs, cache, issue-753]
requires: []
provides:
  - version-scoped Node.js cache directory (nodejs/<NODE_VERSION>/node[.exe])
  - best-effort removal of installs left by earlier versions
  - Node.js pin v22.23.4 with six archive digests
affects: [bbj-intellij]
tech-stack:
  added: []
  patterns: [version-named cache subdirectory, best-effort quiet cleanup after success]
key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifier.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifierTest.java
    - bbj-intellij/src/test/resources/node-fixtures/README.md
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-win.zip
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-win-no-binary.zip
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-unix.tar.gz
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-unix-no-binary.tar.gz
decisions:
  - "installedPath() resolves through a NODE_VERSION subdirectory; cachedNodePath() body unchanged so the source guard and digest re-check still apply"
  - "Stale cleanup removes only the legacy executable plus record and direct child real directories named v<d>.<d>.<d> other than the current version"
metrics:
  tasks: 3
  commits: 3
  completed: 2026-10-23
status: complete
actuals:
  tasks: 3
  commits: 3
plan_head_before: e71b17e6dc885c3ee1db917d7a7dbfcf7bf1394a
plan_head_after: 38d364497b2c57f5b177b9c0f43ba747109a7179
---

# Phase 261023-mtv Plan 01: Version-aware Node.js cache and v22.23.4 pin Summary

The IntelliJ plugin now keeps its downloaded Node.js in `nodejs/<NODE_VERSION>/`, so changing the pin makes older caches read as missing and triggers the normal download; the pin moves to v22.23.4.

## What changed

- **Task 1 (f68f0d6a):** `installedPath()` resolves to `<data dir>/<NODE_VERSION>/node[.exe]`. `installExtracted()` creates the version directory only after the extracted-binary existence check, so failed installs leave the data directory empty. New test covers a legacy unversioned cache and a `v20.0.0/` cache both reading as not cached, then a fresh install landing in the versioned directory.
- **Task 2 (7f751a23):** `removeStaleInstallsQuietly()` runs after a successful `installExtracted()`. It deletes the legacy executable and digest record, and every direct child real directory (no symlinks) named `v<d>.<d>.<d>` other than the current version. Failures are swallowed. Tests cover removal with unrelated entries surviving, an undeletable older install (POSIX, ran without skipping), and a failed install leaving the legacy files in place.
- **Task 3 (38d36449):** `NODE_VERSION` is `v22.23.4`; `PINNED_TABLE` holds the six v22.23.4 digests (re-checked against nodejs.org SHASUMS256.txt during execution, identical to the plan); five fixture archives rebuilt under the new version folder; README, fixture digest literals and name literals updated. `BbjNodeVersionCacheTest.java` untouched.

## Verification

- `cd bbj-intellij && ./gradlew test`: BUILD SUCCESSFUL; 1378 tests, 0 failures, 0 errors, 0 skipped (summed from the JUnit XML results).
- All Task 3 gates run by hand: pin literal, six-pair digest table, fixture entry names, README and test digest agreement, no stale old-version string outside `BbjNodeVersionCacheTest.java`, wording gate, commit-message wording gate, planning-id gate. All clean.

## Deviations from Plan

None - plan executed exactly as written. Minor notes: the Task 1 and 2 verify commands were run with `--tests 'com.basis.bbj.intellij.lsp.NodeInstallPipeline*'`; the stale-cleanup regex is held in a private constant `VERSION_DIRECTORY_NAME` rather than inline.

## Known Stubs

None.

## Threat Flags

None. Cleanup deletions stay inside the Node.js data directory and use no link-following.

## Self-Check: PASSED

- Commits f68f0d6a, 7f751a23, 38d36449 present on `fix/issue-753-node-cache-version`.
- All modified files present; working tree clean apart from `.planning/` artifacts.
