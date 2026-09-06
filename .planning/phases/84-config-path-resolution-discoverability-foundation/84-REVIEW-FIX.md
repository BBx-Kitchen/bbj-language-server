---
phase: 84-config-path-resolution-discoverability-foundation
fixed_at: 2026-09-06T16:51:35Z
review_path: .planning/phases/84-config-path-resolution-discoverability-foundation/84-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 84: Code Review Fix Report

**Fixed at:** 2026-09-06T16:51:35Z
**Source review:** .planning/phases/84-config-path-resolution-discoverability-foundation/84-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, CR-02, WR-01, WR-02; IN-01..IN-03 out of scope per fix_scope=critical_warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Stale `bbx-config` association survives a live `bbj.configPath` change (race condition)

**Files modified:** `bbj-vscode/src/extension.ts`, `bbj-vscode/test/config-file-association.test.ts`
**Commit:** `90a2822e`
**Applied fix:** The `bbj/resolvedConfigPath` notification handler now captures `lastKnownActiveConfigPath` as `previousActive` before calling `setResolvedConfigPath`, then — after the cache update — releases `previousActive`'s association whenever the newly active path differs from it (guarding for the new active path being `undefined`), before sweeping. This makes the push handler self-sufficient: it no longer depends on the local `bbj.configPath` settings-change listener having already released the stale path (that listener's release is a no-op in the realistic ordering, since the cache hasn't been updated yet when it fires).

Added a new regression test, `'the resolvedConfigPath push releases the old path even when the settings listener already fired and no-op'd'`, that fires the config-change listener with the cache still holding the OLD path (matching the realistic production ordering the review called out — the existing test's ordering was unrealistic), then delivers the push, and asserts the old document's language is released and the new document's language is set. The test uses a reactive `setTextDocumentLanguage` mock (mutates the fake document's `languageId` synchronously) so the "no-op" from the settings listener and the actual release from the push handler are both observable through document state, not just call counts.

Verified: manually reverted the source fix only (via `git stash`) and reran the test suite — the new test fails without the fix (`docA.languageId` was `'bbx-config'` instead of `'plaintext'`) and passes with it restored. `npx vitest run test/config-file-association.test.ts` — 20/20 passed with the fix in place.

### CR-02: Windows path-separator mismatch breaks IntelliJ's custom config-file classification

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigPaths.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigPathsTest.java`
**Commit:** `07b7656f`
**Applied fix:** `ConfigPaths.samePath(String, String, String)` now normalizes both operands' backslashes to forward slashes (`a.replace('\\', '/')`) before the case-fold/exact comparison, so the language server's win32 backslash-separated resolved path compares correctly against IntelliJ's always-forward-slash `VirtualFile.getPath()`. Both call sites (`BbjConfigPathService.isConfigFileName`/`isActiveConfigFile`) delegate through this single method, so no other changes were needed.

Added `samePathNormalizesBackslashesSoAWindowsNativePathMatchesAVirtualFilePath` to `ConfigPathsTest`, asserting `samePath("C:\\bbj\\cfg\\config.bbx", "C:/bbj/cfg/config.bbx", "Windows 11")` is `true` (plus a case-folded-mismatch variant and a same-separator-mismatch negative case). No source-guard test asserted the exact body text of `samePath`, so no other test needed updating.

Verified: `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.config.ConfigPathsTest"` — 17/17 passed (0 failures/errors), confirmed via the JUnit XML report. Ran with the gradle-managed sandbox against the already-built `bbj-vscode/out/language/main.cjs` (no rebuild needed for this Java-only change).

### WR-01: Synchronous filesystem I/O on every keystroke before the first server push arrives

**Files modified:** `bbj-vscode/src/extension.ts`
**Commit:** `2c142311`
**Applied fix:** Dropped the `vscode.workspace.onDidChangeTextDocument` listener entirely, per the review's preferred option — checked `bbj-vscode/test/config-file-association.test.ts` and `bbj-vscode/test/extension-activation.test.ts` first; neither test invokes the registered `onDidChangeTextDocument` callback or asserts a subscription count, so removal was safe without any test changes. `onDidOpenTextDocument` plus the two config-path-changing paths (the server push and the settings listener) already cover every case the association needs to (re)evaluate. Added an explanatory comment in place of the removed listener registration.

Verified: `npx tsc --noEmit -p .` clean; `npx vitest run test/config-file-association.test.ts test/extension-activation.test.ts` — 22/22 passed.

### WR-02: `BbjRunBuiAction` and `BbjRunDwcAction` are near-total duplicates

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java`, and three source-guard test files that read these three files' text directly: `BbjRunActionConfigPathSourceGuardTest.java`, `EmTokenTrustWindowSourceGuardTest.java`, `BbjSecretArgvSourceGuardTest.java`
**Commit:** `6a55b854`
**Applied fix:** Extracted the identical `buildCommandLine` body (token acquisition/validation, classpath and config-path resolution, command-line assembly) into a new protected helper, `BbjRunActionBase.buildWebRunCommandLine(VirtualFile file, Project project, String clientType)`, parameterized by the ARGV client-type string (also substituted into the login/expiry dialog copy). Both `BbjRunBuiAction` and `BbjRunDwcAction` are now thin subclasses that just call `buildWebRunCommandLine(file, project, "BUI"/"DWC")`. Also moved the identical `showYesNoOnEdt` EDT-dispatch helper into the base class, since the shared method needs it and it was otherwise duplicated too.

This moved the token-handling / config-path-guard / secret-argv-handling logic that three existing source-guard tests assert on directly against `BbjRunBuiAction.java`/`BbjRunDwcAction.java`'s own source text, so those three test files were updated (not just left to fail):
- `BbjRunActionConfigPathSourceGuardTest`: the blank-config-path guard check now scopes to the extracted `buildWebRunCommandLine` method body in `BbjRunActionBase.java` (via a brace-balanced body extraction, to avoid double-counting the `getConfigPath()` method declaration itself), plus a new check that both subclasses delegate to it with their own client-type literal.
- `EmTokenTrustWindowSourceGuardTest`: the token-flow ordering assertions (expiry-before-trusted-validation, trusted-validation-before-reprompt, no direct `validateTokenServerSide` call, exactly-one `validateTokenTrusted` call) now scope to the shared helper's body in `BbjRunActionBase.java` instead of iterating the two subclass files (which no longer contain this text at all); a new test pins the delegation itself.
- `BbjSecretArgvSourceGuardTest`: the "four secret-bearing call sites" model was updated to reflect that `BbjRunActionBase.java` now hosts two call sites directly (JWT validate + BUI/DWC web-run) and `BbjRunBuiAction`/`BbjRunDwcAction` delegate rather than duplicating; new tests scope the `withEnvironment`/`BbjProcessSecretEnv`/environment-map checks to the extracted helper's body and separately pin the subclasses' delegation.

Verified: `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.actions.*" --tests "com.basis.bbj.intellij.lsp.*"` — passed after one iteration (an initial version of the `BbjRunActionConfigPathSourceGuardTest` update double-counted `getConfigPath()` because it checked the whole file instead of the extracted method body; fixed by scoping to the method body). Then ran the full `./gradlew test` suite: **564 tests, 0 failures, 0 errors** (aggregated across all JUnit XML reports), confirming no other test in the module was affected by the refactor.

## Overall Verification

- `cd bbj-vscode && npm run build` — TypeScript compiles and esbuild bundles cleanly (`tsc -b tsconfig.json && node ./esbuild.mjs`, no errors).
- `cd bbj-vscode && npx vitest run test/config-file-association.test.ts test/config-path-resolution.test.ts test/config-path-consumers.test.ts test/extension-activation.test.ts test/compile-request.test.ts` — 83/83 passed.
- `cd bbj-vscode && npx eslint src/extension.ts test/config-file-association.test.ts` — clean, no warnings.
- `cd bbj-intellij && ./gradlew test` (full suite) — 564/564 passed, 0 failures/errors.
- Grepped the full diff for accidentally-introduced review/plan identifiers (CR-xx/WR-xx/D-xx/COMP) per project convention: the only matches are two **pre-existing** references (a v4.1-era "CR-02" off-EDT-dispatch rationale comment that was relocated, not newly written, when `showYesNoOnEdt` moved into the base class; and a pre-existing phase-75 "CR-01" data-flow-check comment whose scope description was reworded from "all four call sites" to "both direct call sites"). Neither is a new reference to this phase's own review findings.

No findings were skipped. IN-01, IN-02, IN-03 were out of scope for this run (`fix_scope: critical_warning`) and were not touched, though the WR-02 refactor necessarily rewrote the code IN-01's stale comment sits above — the original comment text ("Get config path - only add if configured...") was preserved verbatim in the extracted helper rather than corrected, to keep this run strictly scoped to WR-02.

---

_Fixed: 2026-09-06T16:51:35Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
