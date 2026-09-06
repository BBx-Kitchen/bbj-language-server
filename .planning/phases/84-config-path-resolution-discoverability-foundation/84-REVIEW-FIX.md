---
phase: 84-config-path-resolution-discoverability-foundation
fixed_at: 2026-09-06T17:15:00Z
review_path: .planning/phases/84-config-path-resolution-discoverability-foundation/84-REVIEW.md
iteration: 1
fix_scope: all
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 84: Code Review Fix Report

**Fixed at:** 2026-09-06T17:15:00Z
**Source review:** .planning/phases/84-config-path-resolution-discoverability-foundation/84-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (IN-01, IN-02, IN-03, IN-04; the re-review's Critical/Warning findings CR-01, CR-02, WR-01, WR-02 were already fixed and are not re-listed here — see the prior `84-REVIEW-FIX.md` run this overwrites, whose commits `90a2822e`, `07b7656f`, `2c142311`, `6a55b854` remain in place)
- Fixed: 3
- Skipped: 1

## Fixed Issues

### IN-01: Comment contradicts the actual behavior it sits above

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`
**Commit:** `25a27a92`
**Applied fix:** Replaced the misleading `// Get config path - only add if configured (web.bbj handles absent ARGV(6) gracefully)` comment above the blank-config-path guard with one stating the actual policy: a real config path is required, not merely preferred, per issue #382 (registering an EM app with a blank/sentinel config path would be unusable). Checked the three source-guard tests (`BbjRunActionConfigPathSourceGuardTest`, `EmTokenTrustWindowSourceGuardTest`, `BbjSecretArgvSourceGuardTest`) first — none asserted on the old comment text, so no test changes were needed.

Verified: re-read the modified section; the surrounding blank-check/`return null` logic is unchanged. No syntax checker available for a single Java file outside the gradle build; a full Java compile check was scoped to the two findings the task instructions called out (ConfigPathsTest, registration test) rather than every touched file, and this change is comment-only (no executable-code risk).

### IN-03: Redundant case-listing on an already case-insensitive attribute

**Files modified:** `bbj-intellij/src/main/resources/META-INF/plugin.xml`
**Commit:** `09c37f16`
**Applied fix:** Simplified `fileNamesCaseInsensitive="config.bbx;Config.bbx;config.min;Config.min"` to `fileNamesCaseInsensitive="config.bbx;config.min"` — `fileNamesCaseInsensitive` already case-folds every listed name per the IntelliJ platform contract, so listing both letter-casings was a no-op. Checked `BbjConfigFileTypeRegistrationTest` and grepped the full test tree for `fileNamesCaseInsensitive`/`Config.bbx`/`Config.min` first; the only other hits were in `ConfigPathsTest`, which uses those strings as unrelated path test data (not plugin.xml assertions), so no test changes were needed.

Verified: `python3 -c "import xml.dom.minidom as m; m.parse(...)"` confirmed the edited plugin.xml is still well-formed XML. `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.config.BbjConfigFileTypeRegistrationTest"` — BUILD SUCCESSFUL, all assertions (including `configFileTypeEntryHasNoExtensionsAttribute` and the editor-highlighter/language-mapping checks) still pass.

### IN-04 (new): CR-02's unconditional separator normalization would false-match a literal backslash in a Linux filename

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigPaths.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigPathsTest.java`
**Commit:** `8e78155d`
**Applied fix:** Gated the backslash-to-forward-slash separator normalization in `ConfigPaths.samePath(String, String, String)` behind the same `isCaseInsensitivePlatform` check that already gates the case-fold, exactly as the review proposed: on win32/darwin, both operands are normalized before an case-insensitive compare; on Linux/other POSIX platforms, the raw strings are compared exactly (`a.equals(b)`), since a backslash is a valid, ordinary filename character there. Updated the method's Javadoc to describe the now-gated behavior instead of claiming unconditional normalization.

Added `samePathDoesNotNormalizeSeparatorsOnLinuxWhereBackslashIsAnOrdinaryFilenameCharacter` to `ConfigPathsTest`, asserting `samePath("/home/user/my\\config.bbx", "/home/user/my/config.bbx", "Linux")` is `false`. The existing Windows mixed-separator test (`samePathNormalizesBackslashesSoAWindowsNativePathMatchesAVirtualFilePath`) was left unchanged and still passes.

Verified: `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.config.ConfigPathsTest"` — BUILD SUCCESSFUL; JUnit XML report confirms `tests="18" skipped="0" failures="0" errors="0"` (17 pre-existing + 1 new).

## Skipped Issues

### IN-02: `readerWithResolvedConfigFile`'s `-c` auto-injection is currently unreachable from IntelliJ

**File:** `bbj-vscode/src/language/compiler-options.ts:575-597`, `bbj-vscode/src/language/compile-command.ts:105-106`
**Reason:** The review's own Fix section states "No action required for this phase; flag for the IntelliJ compiler-options UI work (if/when it lands) to confirm the injection path is exercised end-to-end from that side too." Per the task instructions, this was recorded as skipped with that reason and `compiler-options.ts`/`compile-command.ts` were left unmodified.
**Original issue:** The auto-injection of the resolved config path into bbjcpl's `-c` flag only fires when `typeChecking.enabled` reads `true` from the effective `bbj.compiler.*` configuration, which IntelliJ has no UI to populate today — not a regression from this phase, just a currently-VS-Code-only code path.

## Overall Verification

- Verification ran in the main checkout directly (`workflow.use_worktrees` is `false` in `.planning/config.json`), not an isolated worktree — the numbers above are reproducible from this tree as-is.
- `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.config.BbjConfigFileTypeRegistrationTest"` — BUILD SUCCESSFUL.
- `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.config.ConfigPathsTest"` — BUILD SUCCESSFUL, 18/18 passed per JUnit XML.
- No `.ts` files were touched (IN-02 was skipped, not applied), so no vitest run was needed.
- Grepped the diff for all three fixed findings' files (`git diff 17ab5900..HEAD -- <touched files>`) for accidentally-introduced review/plan identifiers (CR-xx/WR-xx/IN-xx/D-xx/"phase 84") per project convention — no matches; the fix text references issue #382 only, which is an existing GitHub issue number, not a review-artifact identifier.

---

_Fixed: 2026-09-06T17:15:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
