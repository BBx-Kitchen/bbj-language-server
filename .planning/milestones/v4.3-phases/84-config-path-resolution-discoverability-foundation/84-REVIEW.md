---
phase: 84-config-path-resolution-discoverability-foundation
reviewed: 2026-09-06T17:15:00Z
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
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLookupsConfigPathTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverriderSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigPathServiceSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/ConfigPathsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java
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
  critical: 0
  warning: 0
  info: 4
  total: 4
status: issues_found
---

# Phase 84: Code Review Report (Re-review)

**Reviewed:** 2026-09-06T17:15:00Z
**Depth:** standard
**Files Reviewed:** 48
**Status:** issues_found (Info only — no Critical or Warning findings)

## Summary

This is a re-review of the current working tree (HEAD) against the earlier same-day review
(`84-REVIEW.md`, findings CR-01, CR-02, WR-01, WR-02, IN-01, IN-02, IN-03), whose four
Critical/Warning findings were addressed in commits `90a2822e`, `07b7656f`, `2c142311`,
`6a55b854` per `84-REVIEW-FIX.md`. I traced each fix against the live source rather than
trusting the fix report's narrative:

- **CR-01** (stale `bbx-config` association race): confirmed fixed. `extension.ts`'s
  `bbj/resolvedConfigPath` handler now captures `lastKnownActiveConfigPath` as `previousActive`
  before updating the cache, and releases it whenever the newly-active path differs (including
  when the new active path is `undefined`), before sweeping. Traced the full production
  ordering by hand (local settings-listener fires first with a stale cache and no-ops; the
  server push arrives later and is now the one that actually performs the release) — the fix is
  correct, and the new regression test in `config-file-association.test.ts` exercises exactly
  that realistic ordering with a reactive `setTextDocumentLanguage` mock.
- **CR-02** (Windows path-separator mismatch): confirmed fixed. `ConfigPaths.samePath` now
  normalizes both operands' backslashes to forward slashes before comparing, and both
  `BbjConfigPathService` call sites delegate through it. `ConfigPathsTest` now covers the
  mixed-separator case directly.
- **WR-01** (synchronous FS I/O on every keystroke): confirmed fixed. The
  `onDidChangeTextDocument` listener is gone from `extension.ts`, replaced with an explanatory
  comment; `onDidOpenTextDocument` plus the two config-path-changing paths still cover every
  association-relevant event.
- **WR-02** (BUI/DWC action duplication): confirmed fixed. `BbjRunActionBase` now owns
  `buildWebRunCommandLine(file, project, clientType)`; both subclasses are thin one-line
  delegates. The three source-guard tests that used to assert against the duplicated bodies
  were correctly re-scoped to the extracted method.

No new Critical or Warning defects surfaced in this pass — I traced the CR-01/CR-02 fixes for
regressions they might have introduced (e.g., a Linux path containing a literal backslash
character now false-matches under the CR-02 fix's unconditional separator normalization; noted
below as Info given how vanishingly unlikely that input is for a BBj config path) and reviewed
every test file for reliability, not just presence.

## Info

### IN-01: Comment contradicts the actual behavior it sits above

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:532`
**Issue:** `// Get config path - only add if configured (web.bbj handles absent ARGV(6) gracefully)` sits directly above code that unconditionally refuses to launch (`return null` with an error) when `configPath` is blank — the opposite of "only add if configured." The refusal is intentional (issue #382: never register an EM app with an unusable config path) and is correctly asserted by `BbjRunActionConfigPathSourceGuardTest`, but the comment still misleads. This is the same comment the prior review flagged (then in both `BbjRunBuiAction.java:112` and `BbjRunDwcAction.java:112`); the WR-02 refactor moved it, unedited, into the new shared `buildWebRunCommandLine` helper, so it now exists in exactly one place instead of two — a smaller footprint, but still unfixed since IN-01 was out of scope for that fix run (`fix_scope: critical_warning`).
**Fix:** Update the comment to state the actual policy, e.g. `// A real config path is required here (not merely preferred) — see issue #382: a blank/sentinel value would register an unusable EM app config.`

### IN-02: `readerWithResolvedConfigFile`'s `-c` auto-injection is currently unreachable from IntelliJ

**File:** `bbj-vscode/src/language/compiler-options.ts:575-597`, `bbj-vscode/src/language/compile-command.ts:105-106`
**Issue:** Unchanged since the prior review. The auto-injection of the resolved config path into bbjcpl's `-c` flag only fires when `typeChecking.enabled` reads `true` from the effective `bbj.compiler.*` configuration, which is populated only from VS Code's `bbj.compiler` settings push or the flat `compilerOutputDirectory` initialization option. IntelliJ has no UI for `bbj.compiler.typeChecking.*` today, so `bbj/compile` invoked from IntelliJ can never satisfy the injection's precondition. Not a regression from this phase; the GUI/BUI/DWC run commands' `-c` argument genuinely is cross-host, but this particular compile-time injection is currently VS-Code-only in practice.
**Fix:** No action required for this phase; flag for the IntelliJ compiler-options UI work (if/when it lands) to confirm the injection path is exercised end-to-end from that side too.

### IN-03: Redundant case-listing on an already case-insensitive attribute

**File:** `bbj-intellij/src/main/resources/META-INF/plugin.xml:142`
**Issue:** Unchanged since the prior review. `fileNamesCaseInsensitive="config.bbx;Config.bbx;config.min;Config.min"` lists both letter-casings of each filename even though `fileNamesCaseInsensitive` already performs case-insensitive matching by IntelliJ platform contract — listing `Config.bbx` alongside `config.bbx` is a no-op.
**Fix:** Simplify to `fileNamesCaseInsensitive="config.bbx;config.min"` (cosmetic only; no behavior change).

### IN-04 (new): CR-02's unconditional separator normalization would false-match a literal backslash in a Linux filename

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigPaths.java:59-69`
**Issue:** The CR-02 fix normalizes both operands' backslashes to forward slashes unconditionally, on every platform, before comparing — not only on win32 (where `\` is the path separator). POSIX filesystems (Linux) permit a literal backslash as an ordinary filename character; since `isCaseInsensitivePlatform` only gates the case-fold, not the separator normalization, two genuinely different Linux paths that differ only in a backslash-vs-forward-slash character at the same position (e.g. a config file literally named `my\config.bbx` vs. one named `my/config.bbx` — an unusual but valid pair of distinct POSIX paths, the second requiring an escaped `/` in a directory name) would now compare equal on Linux, where they are not the same file. This is an extremely low-probability input for a BBj config file path (no existing test, default filename, or documented workflow produces a literal backslash in a Linux path), so it is Info rather than Warning, but it is a genuine behavior change introduced by the fix, not merely a latent edge case that predates it.
**Fix:** Gate the separator normalization the same way the case-fold already is, so Linux/other POSIX platforms compare exactly on the raw strings and only win32 (and, harmlessly, darwin) normalize separators first:
```java
public static boolean samePath(String a, String b, String osName) {
    if (a == null || a.isEmpty() || b == null || b.isEmpty()) {
        return false;
    }
    if (isCaseInsensitivePlatform(osName)) {
        return a.replace('\\', '/').equalsIgnoreCase(b.replace('\\', '/'));
    }
    return a.equals(b);
}
```

---

_Reviewed: 2026-09-06T17:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
