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
  - "the hand-check list for a running IntelliJ against live BBj 26.03 (Task 3, awaiting the tester)"
affects: [verification]

actuals:
  tokens: 3000
  tasks: 2
  commits: 1

key-files:
  created: []
  modified: []

key-decisions:
  - "No source file changed; every automated gate passed on the first run, so nothing was fixed in an earlier plan"

requirements-completed: []

status: halted
completed: 2026-10-03
---

# Phase 128 Plan 04: Plugin zip, gates and hand check Summary

**Tasks 1 and 2 are done: the language server, the VSIX and the IntelliJ plugin zip are built from the final tree, the zip carries the byte-identical fresh server plus the action, banner and refresher, and the whole IntelliJ suite (1258 tests, 0 failures) plus the register, scope and allowlist checks pass. Task 3, the hand check in a running IntelliJ, is waiting for the tester.**

Status: awaiting the Task 3 hand check (`checkpoint:human-verify`, gate `blocking`). IJF-05 and IJF-06 are not marked complete: they rest on that hand check, and REQUIREMENTS.md is untouched.

## Performance

- **Started:** 2026-10-03T12:53Z
- **Tasks 1 and 2 finished:** 2026-10-03T12:55Z
- **Tasks:** 2 of 3 executed (Task 3 is the human checkpoint)
- **Files modified:** 0 source files (this SUMMARY only)
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

## Task 3: hand check (awaiting)

The tester installs `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` through Settings | Plugins | gear | Install Plugin from Disk, against IntelliJ with LSP4IJ and a BBj 26.03 BBjServices (live on 127.0.0.1:5008 in this container; the VSIX is installed in the test code-server on :13338). The 15 steps are in `128-04-PLAN.md` (Task 3, `how-to-verify`). The outcome of steps 1-14 and the pasted `idea.log` lines from step 14 are recorded below once the tester answers.

Hand-check outcome: pending.

## Deviations from Plan

None - Tasks 1 and 2 executed as written, each automated command passed on its first run. The commit trailer follows the task prompt (`Claude Opus 5.5`).

## Issues Encountered

None.

## Known Stubs

None. This plan adds no source.

## Threat Flags

None - the plan adds no source and no new surface. T-128-16 (zip contents: `cmp` plus class and plugin.xml check), T-128-17 (register check) and T-128-18 (scope and allowlist checks) are mitigated as planned; T-128-19 stays accepted.

## Self-Check: PASSED (Tasks 1 and 2)

- Zip, VSIX, `cmp` result, class and plugin.xml lines, suite numbers, register, scope and allowlist results: each taken from the command output in this session.
- `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`: FOUND. `/tmp/bbj-lang.vsix`: FOUND.
- Source and test trees: no change (`git status --porcelain` empty for `bbj-intellij/src`, `bbj-vscode/src`, `bbj-vscode/test`).
- Task 3 is not self-checked: it is the pending human checkpoint.

---
*Phase: 128-intellij-denum*
*Tasks 1-2 completed: 2026-10-03*
