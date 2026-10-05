---
phase: 128-intellij-denum
plan: 04
subsystem: testing
tags: [intellij, vsix, plugin-zip, gates, hand-check, denum]

requires:
  - phase: 128-intellij-denum
    provides: "the Denumber action, the diagnostics console and the line-numbered banner (plans 01-03)"
provides:
  - "language server, VSIX and IntelliJ plugin zip built from the final tree, with the zip contents checked"
  - "gate results for the final tree: whole IntelliJ suite, register check, scope check, allowlist check"
  - "the hand check of the rebuilt plugin zip in a running IntelliJ against live BBj 26.03, approved by the user"
  - "a fix for a language-server crash found in that hand check: a cancelled window message no longer terminates the server"
affects: [verification]

actuals:
  tokens: 6200
  tasks: 3
  commits: 3

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/src/language/java-class-refresh.ts
    - bbj-vscode/test/notifications.test.ts
    - bbj-vscode/test/java-class-refresh.test.ts

key-decisions:
  - "Tasks 1 and 2 changed no source: every automated gate passed on the first run"
  - "The cancelled-message crash found in the hand check was fixed inside this phase, with the user's approval, at all five fire-and-forget message sites in the language server"

requirements-completed: [IJF-05, IJF-06]

status: complete
completed: 2026-10-04
---

# Phase 128 Plan 04: Plugin zip, gates and hand check Summary

**The language server, the VSIX and the IntelliJ plugin zip are built from the final tree, the zip carries the byte-identical fresh server plus the action, banner and refresher, the whole IntelliJ suite (1258 tests, 0 failures) and the register, scope and allowlist checks pass, and the user approved the hand check in a running IntelliJ; the hand check also exposed a language-server crash on closing a balloon, fixed in the same plan.**

Status: complete. All three tasks are done. The user approved the Task 3 hand check on the rebuilt zip.

## Commits

- `d32a90d9` docs(128-04): plugin zip build and gate results (Tasks 1 and 2, this SUMMARY only)
- `acb1912a` fix(128-04): never let a cancelled window message terminate the language server (`bbj-notifications.ts`, `java-class-refresh.ts` and their tests `notifications.test.ts`, `java-class-refresh.test.ts`)
- `d68f5f93` docs(128-04): record the cancelled-message crash fix as a deviation

## Performance

- **Started:** 2026-10-03T12:53Z
- **Tasks 1 and 2 finished:** 2026-10-03T12:55Z
- **Tasks:** 3 of 3 (Task 3 is the human checkpoint, approved by the user)
- **Files modified:** 2 source files and 2 test files under `bbj-vscode/` (the deviation fix, `acb1912a`), plus this SUMMARY
- **Packaged root:** `/home/coder/repos/bbj-language-server/bbj-vscode` on the main working tree, branch `gsd/v4.9-bbj-ls-denum-format`, HEAD `9687f988` (no worktree, so `BBJ_LS_SRC` was not set)

## Task 1: both distributables from the final tree

Preconditions held: `bbj-vscode/node_modules` exists and `/usr/local/bin/bbj-ext-install` exists.

| Step | Result |
|------|--------|
| `npm --prefix .../bbj-vscode run build` | exit 0 (`tsc -b` and esbuild), no `error TS` line |
| `bbj-ext-install` | exit 0; vsce prepublish ran the minified esbuild bundle; ended with `Extension installed - reload the 'VS Code (ext test)' browser tab to pick it up.` after `Extension 'bbj-lang.vsix' was successfully installed.` |
| `./gradlew buildPlugin` in `bbj-intellij` | `BUILD SUCCESSFUL` (7 executed, 16 up-to-date); the Swing stack trace during `buildSearchableOptions` is headless noise with exit code 0 |
| zip inspection (the plan's automated command, run as written) | exit 0 |

Outputs:

- **VSIX:** `/tmp/bbj-lang.vsix`, 34 files, 671.98 KB per vsce (688106 bytes on disk), installed into the test code-server (`~/.ext-test`). The bundles inside it are the minified ones built by the prepublish step during `bbj-ext-install`.
- **Plugin zip:** `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, 1038354 bytes, written 2026-10-03 12:54:10. Two older `.vsix` files in the same directory are leftovers and are not part of the zip.
- **`unzip -l` lines for `lib/` (files only):**

```
     1298  bbj-intellij/lib/bbj-intellij-0.1.0-searchableOptions.jar
   797133  bbj-intellij/lib/bbj-intellij-0.1.0.jar
  1291724  bbj-intellij/lib/language-server/main.cjs
     1855  bbj-intellij/lib/textmate/bbj-bundle/bbj-language-configuration.json
     1323  bbj-intellij/lib/textmate/bbj-bundle/bbx-language-configuration.json
      720  bbj-intellij/lib/textmate/bbj-bundle/package.json
     4049  bbj-intellij/lib/textmate/bbj-bundle/syntaxes/bbj.tmLanguage.json
     4813  bbj-intellij/lib/textmate/bbj-bundle/syntaxes/bbx.tmLanguage.json
     2005  bbj-intellij/lib/tools/em-login.bbj
     1218  bbj-intellij/lib/tools/em-validate-token.bbj
     5484  bbj-intellij/lib/tools/web.bbj
```

- **`cmp`:** the zip's `lib/language-server/main.cjs` against `bbj-vscode/out/language/main.cjs` printed nothing (identical, 1291724 bytes both; the `out/` bundle is the minified one the prepublish step left, and `buildPlugin` bundled it).
- **Classes found in `bbj-intellij/lib/bbj-intellij-0.1.0.jar`:**
  - `com/basis/bbj/intellij/actions/BbjDenumberAction.class`
  - `com/basis/bbj/intellij/BbjLineNumberedNotificationProvider.class`
  - `com/basis/bbj/intellij/denum/BbjLineNumberedBannerRefresher.class`
- **`META-INF/plugin.xml` declarations in that jar:**
  - line 113: `<action id="bbj.denumber" class="com.basis.bbj.intellij.actions.BbjDenumberAction" text="Denumber BBj Program" description="Remove the line numbers from the current BBj program">`
  - line 194: `<editorNotificationProvider implementation="com.basis.bbj.intellij.BbjLineNumberedNotificationProvider" />`
  - line 202: `<projectService serviceImplementation="com.basis.bbj.intellij.denum.BbjLineNumberedBannerRefresher" />`
- **Source untouched:** `git status --porcelain -- bbj-intellij/src bbj-vscode/src bbj-vscode/test` printed nothing; the full status shows only the two files that were untracked before the plan started (`.planning/milestone.lock`, `com/`).

## Task 2: gates on the final tree

| Gate | Command | Result |
|------|---------|--------|
| IntelliJ suite | `./gradlew cleanTest test` in `bbj-intellij` | `BUILD SUCCESSFUL`; fresh XML reports written 12:54:26; no test reported FAILED |
| Summed result | the plan's awk over `build/test-results/test/TEST-*.xml` (141 files) | `tests=1258 failures=0 errors=0`, exit 0 (baseline 1165; 0 skipped) |
| Contract test | `TEST-com.basis.bbj.intellij.composer.ComposerRequestContractTest.xml` | `tests="4" skipped="0" failures="0" errors="0"`; the test source lists `bbj/denum` (line 68) and reads `denum-command.ts` (line 48) |
| Register check | diff from phase base `49544f09` (commit that added the plans, `49544f09f5e27919496759e8e152881bbd3bb9ca`) to HEAD over `bbj-intellij/src`, added lines grepped for D-NN / IJF / DEN / FMT / SET / CUT / INT / MIG-NN, 12x-NN, T-12x-N, Pitfall N, C/CR/WR/IN-NN, "phase 1NN", "plan N" | printed nothing (grep exit 1) |
| Scope check | `git diff --name-only 49544f09 HEAD` minus `bbj-intellij/` and `.planning/` | printed nothing (grep exit 1): no language-server or other change |
| Allowlist | `git diff --quiet 49544f09 HEAD -- .../lsp/Lsp4ijImportAllowlistTest.java` | exit 0: unchanged since the phase base |
| Leftover processes | `pgrep -af 'vitest\|gradlew'` | printed nothing |

Phase diff size for context: 17 commits since the base; `bbj-intellij` shows 26 files changed, 2462 insertions, 12 deletions.

## Task 3: hand check (approved)

The tester installs `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` through Settings | Plugins | gear | Install Plugin from Disk, against IntelliJ with LSP4IJ and a BBj 26.03 BBjServices (live on 127.0.0.1:5008 in this container; the VSIX is installed in the test code-server on :13338). The 15 steps are in `128-04-PLAN.md` (Task 3, `how-to-verify`). 

Outcome, as reported by the user:

- The first session, on the zip from Task 1, exposed the crash described under Deviations (closing the "Denumbered." balloon killed the language server). The fix `acb1912a` followed, and the language server, VSIX and plugin zip were rebuilt.
- The user re-ran the hand check on the rebuilt zip (`bbj-intellij-0.1.0.zip`, 1038423 bytes) and answered "approved". Steps 1-14 are approved by the user.
- Step 14 `idea.log` lines: not provided by the user, so no `idea.log` excerpt is recorded and the "no `Unsupported notification method` line" claim of the plan rests on the user's approval only, not on pasted log evidence.
- A `Denumber run failed: not-open` language-server log line was seen in the first (crashing) session. The user did not say which step produced it, so its step is unidentified and it is not explained here.
- No per-step observations beyond the approval were reported, and none are recorded.

## Deviations from Plan

Tasks 1 and 2 executed as written, and each automated command passed on its first run. Task 3 led to the one deviation below. The commit trailer follows the task prompt (`Claude Opus 5.5`).

**1. [Rule 1 - Bug, found in the Task 3 hand check, user-approved] Closing a DENUM balloon terminated the language server**
- **Found during:** Task 3 (first hand-check session). Closing the plain "Denumbered." balloon in IntelliJ killed the LS (`ResponseError: The request (id: 7, method: 'window/showMessageRequest') has been cancelled`, code -32800, then Node exit).
- **Cause:** every `window.show*Message` call is a `window/showMessageRequest` request, even without buttons. LSP4IJ cancels it when the balloon is closed (VS Code answers `null` instead, so VS Code never showed it). The fire-and-forget helpers dropped the promise; their `try/catch` only covered synchronous throws, so the rejection went unhandled.
- **Fix:** `acb1912a` (recorded in `d68f5f93`). The rejection is handled at all five fire-and-forget sites: `showInformation`, `showFormatterWarning` and `notifyJavaConnectionError` in `bbj-notifications.ts`, and the success and failure messages in `java-class-refresh.ts`. Four regression tests (`notifications.test.ts`, `java-class-refresh.test.ts`) use plain-function cancelling mocks, because a `vi.fn` mock subscribes to its returned promise and hides the defect. They are red on the old source (4 failed) and green on the fix.
- **Scope gate:** this deliberately breaks Task 2's "nothing outside bbj-intellij/ and .planning/" check. The user asked for the fix inside this phase so it finishes clean; the only paths outside are those two source files and two test files under `bbj-vscode/`.
- **Re-verified on the final tree:** lint and typecheck:test are clean. Whole vitest suite: 4464 tests, 0 failed; the only failing suite is the known baseline `installed-extension-e2e`. The LS, the VSIX (`bbj-ext-install`) and the plugin zip were rebuilt (`bbj-intellij-0.1.0.zip`, 1038423 bytes), and the zip's `main.cjs` is byte-identical to the fresh build.

## Issues Encountered

None.

## Known Stubs

None. This plan adds no source.

## Threat Flags

None - the plan adds no source and no new surface. T-128-16 (zip contents: `cmp` plus class and plugin.xml check), T-128-17 (register check) and T-128-18 (scope and allowlist checks) are mitigated as planned; T-128-19 stays accepted.

## Self-Check: PASSED (Tasks 1, 2 and 3)

- Zip, VSIX, `cmp` result, class and plugin.xml lines, suite numbers, register, scope and allowlist results: each taken from the command output in this session.
- `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`: FOUND. `/tmp/bbj-lang.vsix`: FOUND.
- Source and test trees: no change (`git status --porcelain` empty for `bbj-intellij/src`, `bbj-vscode/src`, `bbj-vscode/test`).
- Task 3: the approval is the user's answer "approved" on the rebuilt zip; the missing step 14 log lines and the unidentified `not-open` log line are stated above, not filled in.
- Commits `d32a90d9`, `acb1912a`, `d68f5f93`: each present in `git log`.
- The four `bbj-vscode` files of `acb1912a`: each present in that commit's stat.

---
*Phase: 128-intellij-denum*
*Tasks 1-2 completed: 2026-10-03; Task 3 approved and plan closed: 2026-10-04*
