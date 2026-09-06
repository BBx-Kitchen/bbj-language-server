---
phase: 84-config-path-resolution-discoverability-foundation
reviewed: 2026-09-06T16:32:04Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjConfigFileType.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigLanguage.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigSyntaxHighlighterFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverrider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigPaths.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
  - bbj-intellij/src/main/resources/icons/bbj-config_dark.svg
  - bbj-intellij/src/main/resources/icons/bbj-config.svg
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsConfigPathTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverriderSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigPathServiceSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigPathsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java
  - bbj-vscode/package.json
  - bbj-vscode/src/Commands/Commands.cjs
  - bbj-vscode/src/Commands/process-args.ts
  - bbj-vscode/src/config-path-cache.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-notifications.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/compile-command.ts
  - bbj-vscode/src/language/compiler-options.ts
  - bbj-vscode/src/language/config-path-resolver.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/language/resolved-config-path-request.ts
  - bbj-vscode/src/setopts-composer-ui.ts
  - bbj-vscode/test/compile-request.test.ts
  - bbj-vscode/test/config-file-association.test.ts
  - bbj-vscode/test/config-path-consumers.test.ts
  - bbj-vscode/test/config-path-resolution.test.ts
  - bbj-vscode/test/extension-activation.test.ts
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 2
  warning: 2
  info: 3
  total: 7
status: issues_found
---

# Phase 84: Code Review Report

**Reviewed:** 2026-09-06T16:32:04Z
**Depth:** standard (with targeted cross-file tracing where correctness required it)
**Files Reviewed:** 48
**Status:** issues_found

## Summary

Phase 84 centralizes "which file is the BBj config file" resolution in `config-path-resolver.ts` (server) and mirrors its pure decisions in `ConfigPaths.java`/`BbjConfigPathService.java` (IntelliJ), then wires both hosts' editors to treat the resolved file as a config file. The core resolver (`resolveConfigPath`, `canonicalizeConfigPath`, `samePath`, sentinel/tilde handling) is careful, well-tested, and the precedence rules are unambiguous. The `bbj/compile` argv-injection and run-command argv builders correctly refuse the EM Config sentinel end-to-end.

Two real defects survived into the two host-specific integration layers, both directly touching the phase's headline feature ("config-file editor treatment... any name, any location"):

1. A race in the VS Code extension between the local `bbj.configPath` settings-change listener and the asynchronous `bbj/resolvedConfigPath` push notification can leave the *previous* config file permanently stuck showing `bbx-config` highlighting after a live config-path change — the exact scenario QA/FULL-TEST-CHECKLIST.md item #12 exists to catch.
2. On Windows, IntelliJ's `BbjConfigPathService`/`ConfigPaths.samePath` compares the language server's OS-native-separator resolved path (backslashes) against `VirtualFile.getPath()` (which IntelliJ's VFS always returns with forward slashes), so a custom-named/located config file never matches by path — only the hardcoded default filenames (`config.bbx`/`config.min`) still work.

## Critical Issues

### CR-01: Stale `bbx-config` association survives a live `bbj.configPath` change (race condition)

**File:** `bbj-vscode/src/extension.ts:881-912`
**Issue:**

Two independent event sources drive the config-file editor association:
- `client.onNotification(RESOLVED_CONFIG_PATH_METHOD, ...)` (line 883) updates the cache and calls `sweepOpenDocumentsForConfigAssociation()` (line 891) but never calls `releaseConfigAssociation()`.
- `vscode.workspace.onDidChangeConfiguration(...)` (line 904), gated on `event.affectsConfiguration('bbj.configPath')`, is the *only* place that calls `releaseConfigAssociation(lastKnownActiveConfigPath)` (line 908) before re-sweeping.

`applyConfigAssociation` (line 597) is purely additive — it only ever sets the language to `bbx-config`, never away from it (the early `if (doc.languageId === CONFIG_LANGUAGE_ID) return;` guard at line 599 makes this permanent once applied).

In production, the local `vscode.workspace.onDidChangeConfiguration` listener fires as soon as the VS Code setting is written — a single in-process event. The server-side re-resolution and its `bbj/resolvedConfigPath` push require a full LSP round trip (client → IPC → server re-resolves → IPC → client). The local listener therefore *always* runs first, while `config-path-cache.ts`'s `cachedResult` is still the *old* value. Concretely, changing `bbj.configPath` from A to B:

1. Local listener fires: releases A's association, then immediately re-sweeps using `getActiveConfigPath()` — which still returns A (cache not yet updated) — re-applying A's `bbx-config` association and setting `lastKnownActiveConfigPath = A` again. Net effect: no-op.
2. The server's push eventually arrives with B: `setResolvedConfigPath` updates the cache, then `sweepOpenDocumentsForConfigAssociation()` runs — but only *adds* B's association; it never releases A (A's document already carries `bbx-config`, so the early-return guard skips it). `lastKnownActiveConfigPath` is now overwritten to B.
3. A's document is now permanently stuck showing `bbx-config` (wrong syntax/associations) — no future config-path change will ever target A for release again, since `lastKnownActiveConfigPath` no longer remembers it.

This is precisely QA/FULL-TEST-CHECKLIST.md item #12 ("Live config-path change flips file type on both files ... Without restarting the IDE"), and the only automated test for this path (`config-file-association.test.ts`, `'a configuration change releases the old path and associates the new one'`) hides the bug by calling `setResolvedConfigPath(...)` *before* firing the simulated config-change event — i.e., it hard-codes the unrealistic ordering where the push has already arrived, rather than the realistic ordering where it hasn't.

**Fix:** Make the notification handler self-sufficient — release the previously-active path there too, using the pre-update active path as the release target, regardless of what the local settings-change listener did:

```ts
client.onNotification(RESOLVED_CONFIG_PATH_METHOD, (params: ResolvedConfigPathResult) => {
    const previousActive = lastKnownActiveConfigPath;
    setResolvedConfigPath(params);
    if (params.path && !params.exists && shouldWarnOnce(params.path)) {
        vscode.window.showWarningMessage(/* ... */);
    }
    if (previousActive) {
        releaseConfigAssociation(previousActive);
    }
    sweepOpenDocumentsForConfigAssociation();
});
```
Add a regression test that fires the config-change listener *before* the cache is updated (the realistic order), then delivers the push, and asserts the old document's language is eventually released.

---

### CR-02: Windows path-separator mismatch breaks IntelliJ's custom config-file classification

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigPaths.java:44-60`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java:131-136,155-161`
**Issue:**

`ConfigPaths.samePath(a, b, osName)` case-folds on Windows/macOS but never normalizes path separators:

```java
public static boolean samePath(String a, String b, String osName) {
    if (a == null || a.isEmpty() || b == null || b.isEmpty()) return false;
    if (isCaseInsensitivePlatform(osName)) return a.equalsIgnoreCase(b);
    return a.equals(b);
}
```

`BbjConfigPathService.isConfigFileName`/`isActiveConfigFile` feed this function `activeConfigPath()` (ultimately the language server's `resolveConfigPath` output, canonicalized via Node's `path.normalize`, which uses **backslash** separators on `win32`) against `file.getPath()` (a `VirtualFile` path — IntelliJ's VFS **always** returns forward-slash paths, on every platform, by platform convention). On Windows these two strings will never compare equal for a custom-named/located config file (e.g. `C:\bbj\cfg\myconfig.bbx` vs `C:/bbj/cfg/myconfig.bbx`), even though the case-insensitive comparison correctly matches the rest of the path.

The TypeScript side does not have this problem because both operands passed to its `samePath` always flow through the *same* `canonicalizeConfigPath` (guaranteeing the same separator convention on both sides); the Java side compares two values produced by two different subsystems with different separator conventions, and normalizes neither. No test in `ConfigPathsTest`/`BbjConfigPathServiceSourceGuardTest` uses mixed separators, so this gap is unexercised.

Net effect: on Windows, a custom-named/located config file (the entire "any name, any location" premise of this phase) never gets the `BbjConfigFileType` override in IntelliJ — only the hardcoded default filenames (`config.bbx`/`config.min`, matched via `isDefaultConfigFilename`, which is separator-agnostic) still work.

**Fix:** Normalize both operands to one separator convention before comparing, e.g. in `ConfigPaths.samePath`:

```java
public static boolean samePath(String a, String b, String osName) {
    if (a == null || a.isEmpty() || b == null || b.isEmpty()) return false;
    String na = a.replace('\\', '/');
    String nb = b.replace('\\', '/');
    if (isCaseInsensitivePlatform(osName)) return na.equalsIgnoreCase(nb);
    return na.equals(nb);
}
```
Add a `ConfigPathsTest` case asserting `samePath("C:\\bbj\\cfg\\config.bbx", "C:/bbj/cfg/config.bbx", "Windows 11")` is `true`.

## Warnings

### WR-01: Synchronous filesystem I/O on every keystroke before the first server push arrives

**File:** `bbj-vscode/src/config-path-cache.ts:49-63`, `bbj-vscode/src/extension.ts:902-903`
**Issue:** `extension.ts` wires `vscode.workspace.onDidChangeTextDocument` directly to `applyConfigAssociation(event.document)` with no debounce, which calls `isActiveConfigPath` → `getActiveConfigPath()`. Before the language server's first `bbj/resolvedConfigPath` push arrives (`cachedResult` is `undefined`), *every* call falls through to `explicitSettingPath()`, which — whenever `bbj.configPath` is set — performs synchronous `fs.accessSync`/`fs.realpathSync.native` calls via `canonicalizeConfigPath`. During the (often multi-second) startup window before the workspace's first validated build, this means every keystroke in every open document triggers blocking filesystem I/O on the extension host, which can visibly stall typing on a slow or networked filesystem. This is a robustness/UX gap distinct from algorithmic complexity: it is unconditional blocking I/O on a hot, high-frequency event path, not a scaling concern.
**Fix:** Debounce `applyConfigAssociation` on `onDidChangeTextDocument` (association only needs to be evaluated once per open/rename/config-change, not per keystroke), or short-circuit early when `event.document.languageId` is not a candidate (e.g. skip re-checking documents that already have a stable non-`bbx-config` extension-derived language and no pending config-path ambiguity), or simply drop the `onDidChangeTextDocument` listener entirely — `onDidOpenTextDocument` plus the two config-path-changing paths already cover every case a config file's association needs to change.

### WR-02: `BbjRunBuiAction` and `BbjRunDwcAction` are near-total duplicates

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java:26-131`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java:26-131`
**Issue:** The two classes' `buildCommandLine` bodies are identical except for the client-type string (`"BUI"` vs `"DWC"`) and the balloon copy. This includes the config-path blank-guard this phase added (`if (configPath.isBlank()) { ... }`), which now exists in two places that must be kept in sync by hand. Future changes to the config-path guard, token-validation flow, or classpath handling risk being applied to only one copy (the exact drift risk `BbjRunActionConfigPathSourceGuardTest` has to explicitly assert against for *both* classes, rather than being structurally impossible).
**Fix:** Extract the shared body into a protected helper on `BbjRunActionBase` parameterized by client-type string (and per-mode balloon copy), e.g. `protected GeneralCommandLine buildWebRunCommandLine(VirtualFile file, Project project, String clientType)`, called by both thin subclasses.

## Info

### IN-01: Comment contradicts the actual behavior it sits above

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java:112`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java:112`
**Issue:** `// Get config path - only add if configured (web.bbj handles absent ARGV(6) gracefully)` is immediately followed by code that unconditionally refuses to launch when `configPath` is blank — the opposite of "only add if configured." The refusal is intentional (issue #382 — never register an EM app with an unusable config path) and is correctly asserted by `BbjRunActionConfigPathSourceGuardTest`, but the stale comment will mislead the next person who touches this method.
**Fix:** Update the comment to state the actual policy, e.g. `// A real config path is required here (not merely preferred) — see issue #382: a blank/sentinel value would register an unusable EM app config.`

### IN-02: `readerWithResolvedConfigFile`'s `-c` auto-injection is currently unreachable from IntelliJ

**File:** `bbj-vscode/src/language/compiler-options.ts:575-597`, `bbj-vscode/src/language/compile-command.ts:105-106`
**Issue:** The auto-injection of the resolved config path into bbjcpl's `-c` flag only fires when `typeChecking.enabled` reads `true` from the effective `bbj.compiler.*` configuration. `BBjWorkspaceManager.getCompilerConfig()` is populated only from VS Code's `bbj.compiler` settings push (`main.ts`'s `onDidChangeConfiguration`, itself documented as "currently VS Code-only; IntelliJ never delivers config.compiler") or the flat `compilerOutputDirectory` initialization option. IntelliJ has no UI for `bbj.compiler.typeChecking.*` today, so `bbj/compile` invoked from IntelliJ can never satisfy the injection's precondition — this piece of the "both IDEs" parity is currently VS-Code-only in practice, distinct from the GUI/BUI/DWC run commands' `-c` argument, which genuinely is cross-host. Not a regression introduced by this phase, but worth tracking since the phase's stated goal is parity across both hosts.
**Fix:** No action required for this phase; flag for the IntelliJ compiler-options UI work (if/when it lands) to confirm the injection path is exercised end-to-end from that side too.

### IN-03: Redundant case-listing on an already case-insensitive attribute

**File:** `bbj-intellij/src/main/resources/META-INF/plugin.xml:142`
**Issue:** `fileNamesCaseInsensitive="config.bbx;Config.bbx;config.min;Config.min"` lists both letter-casings of each filename even though `fileNamesCaseInsensitive` is documented by the IntelliJ platform as already performing case-insensitive matching — listing `Config.bbx` alongside `config.bbx` is a no-op.
**Fix:** Simplify to `fileNamesCaseInsensitive="config.bbx;config.min"` (cosmetic only; no behavior change).

---

_Reviewed: 2026-09-06T16:32:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
