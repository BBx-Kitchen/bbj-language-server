---
phase: 92-host-side-hygiene-focus-guards
verified: 2026-09-13T08:10:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "In IntelliJ, with the rebuilt plugin installed and the language server started, click through: .bbj tab -> non-BBj tab -> config.bbx tab -> .bbx program tab -> .bbj tab again, with no server-status change."
    expected: "Both status-bar widgets (BBj: ... and Java: ...) show for the .bbj tab, hide immediately for the non-BBj tab, stay hidden for config.bbx, show for the .bbx program, and show again for the .bbj tab — each change happening on the tab click itself."
    why_human: "Platform FILE_EDITOR_MANAGER delivery, FileTypeOverrider resolution for the real config.bbx, and status-bar repaint require a running IntelliJ IDE; no IntelliJ sandbox exists in this devcontainer. The automated seam test (BbjFileVisibilityTest) and source guard (BbjStatusBarWidgetSourceGuardTest) prove the decision logic and the wiring only (D-13)."
---

# Phase 92: Host-Side Hygiene & Focus Guards Verification Report

**Phase Goal:** Decompile, format, run/compile commands, extension activation, and IntelliJ's status bar all behave correctly under repeated use, no active editor, or a coarse-mtime filesystem.
**Verified:** 2026-09-13T08:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Decompiling immediately after a previous decompile of the same file always reflects the new output, even on a coarse-mtime filesystem, while a genuinely stale pre-existing `.lst` is still rejected | ✓ VERIFIED | `decompile-io.ts` `deleteLeftoverLst`/`lstPathFor` remove the leftover `<input>.lst` before `waitForDecompileOutput` runs (`Commands.cjs` line 214, before `execWithProgress`); the mtime gate is fully removed (`grep -c 'mtimeMs' decompile-io.ts` = 0); reworked `P62-D2-011` test proves a stale `.lst` present before the run is deleted and the wait resolves only with the fresh write. `test/decompile-io.test.ts` — 16/16 passing (re-run confirmed). |
| 2 | A format request never applies content computed from an earlier in-flight request over the user's interim edits | ✓ VERIFIED | `document-formatter.ts` `inFlightFormats` is keyed `{ content, promise }`; a request reuses the in-flight promise only when `inFlight.content === documentContent` (line 63); cleanup compares the stored entry's promise identity so an older settle can't evict a newer entry. `test/document-formatter.test.ts` — race, newer-entry-survival and no-leak tests plus all 4 pre-existing `P62-D3-001` cases pass (re-run confirmed). |
| 3 | Invoking Run, Compile, Decompile, or Denumber with no active BBj editor focused shows a graceful "no active BBj file" message instead of an error | ✓ VERIFIED | New vscode-free `target-resolution.ts` (`resolveRunTarget`/`resolveDecompileTarget`) is wired into `run`, `runWeb`, `compile`, `decompile`, `decompileReplace`, `decompileReadonly` via `runTargetOrWarn`/`decompileTargetOrWarn` (all confirmed present in `Commands.cjs`); `bbj.runBUI`/`bbj.runDWC` in `extension.ts` resolve and warn before `ensureValidToken` (credential prompt). Old editor-first ternary and `resolveTargetFileName` are gone. `test/target-resolution.test.ts` — 71 combined tests across the 4 targeted files pass (re-run confirmed). |
| 4 | Reactivating the VS Code extension in the same host (e.g., a window reload) does not double-register commands, providers, or notifications — every registration from the prior activation is disposed | ✓ VERIFIED | All 14 `vscode.commands.registerCommand(...)` calls in `activate()` are wrapped in `context.subscriptions.push(...)` (`grep -c` = 14); the formatting provider and all three `client.onNotification` calls (`bbj/bbjcplAvailability`, `CONFIG_RELOAD_METHOD`, `RESOLVED_CONFIG_PATH_METHOD`) are likewise pushed (confirmed by direct file read, lines 869-989). `test/extension-activation.test.ts` mocked harness throws `already exists` on a duplicate id and the double-activate test passes (re-run confirmed). |
| 5 | IntelliJ's status-bar widgets show or hide immediately on a bare editor-tab switch, not only when the language-server status itself changes | ✓ VERIFIED (code); ⚠️ live behavior not exercised | `BbjFileVisibility.showsForSelection` decides visibility from `file.getFileType().getName()`, never extension; both `BbjStatusBarWidget.java` and `BbjJavaInteropStatusBarWidget.java` subscribe `FileEditorManagerListener.FILE_EDITOR_MANAGER` on their existing `messageBusConnection` and call `updateVisibility()` from `selectionChanged` (confirmed by direct file read). `BbjFileVisibilityTest` and `BbjStatusBarWidgetSourceGuardTest` pass (re-run confirmed, quiet/0 exit). The live in-IDE tab-switch behavior itself is not exercised by any automated test and needs a running IntelliJ — routed to human verification below. |

**Score:** 5/5 truths verified by code+tests; 1 of the 5 additionally carries a staged live human check (D-13) that no automated test can exercise.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/Commands/target-resolution.ts` | vscode-free target resolution | ✓ VERIFIED | Exists, exports `NO_ACTIVE_BBJ_FILE_MESSAGE`, `toActiveEditorSnapshot`, `isRunnableBbjDocument`, `resolveRunTarget`, `resolveDecompileTarget`; no `vscode` import |
| `bbj-vscode/test/target-resolution.test.ts` | unit tests + source guards | ✓ VERIFIED | Present, part of 71 passing tests re-run |
| `bbj-vscode/src/Commands/Commands.cjs` | wired via `runTargetOrWarn`/`decompileTargetOrWarn` | ✓ VERIFIED | `runTargetOrWarn` used 4x (run, runWeb, compile, decompile), `decompileTargetOrWarn` used 2x (decompileReplace, decompileReadonly), plus `deleteLeftoverLst` wired in `decompileInPlace` |
| `bbj-vscode/src/extension.ts` | `bbj.runBUI`/`bbj.runDWC` resolve before `ensureValidToken`; all registrations disposed | ✓ VERIFIED | `resolveRunTarget(` appears before `ensureValidToken(` in both handlers; 14/14 `registerCommand` calls plus formatter provider and 3 notification handlers wrapped in `context.subscriptions.push` |
| `bbj-vscode/src/document-formatter.ts` | content-aware in-flight sharing | ✓ VERIFIED | `inFlight.content === documentContent` gate present, identity-based cleanup |
| `bbj-vscode/src/decompile-io.ts` | `deleteLeftoverLst` + mtime-free wait | ✓ VERIFIED | `deleteLeftoverLst` exported, `mtimeMs` absent, shared `lstPathFor` helper used by both delete and wait |
| `bbj-intellij/.../ui/BbjFileVisibility.java` | shared static visibility decision | ✓ VERIFIED | `showsForSelection`, `isBbjProgramFileTypeName`, `showsForFileTypeNames` present, exact-string match on `"BBj"` |
| `bbj-intellij/.../ui/BbjFileVisibilityTest.java`, `BbjStatusBarWidgetSourceGuardTest.java` | plain-JUnit + source guard | ✓ VERIFIED | Both test classes ran clean (0 failures) via grounded Gradle command |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `Commands.cjs` | `target-resolution.ts` | `require("./target-resolution")` | ✓ WIRED | Line 10 destructures all 4 exports |
| `extension.ts` | `target-resolution.ts` | `import from './Commands/target-resolution.js'` | ✓ WIRED | Line 39 |
| `Commands.cjs decompileInPlace` | `decompile-io.ts deleteLeftoverLst` | `await deleteLeftoverLst(resolvedFileName)` before `execWithProgress` | ✓ WIRED | Line 214, inside the existing `try` |
| `DocumentFormatter.provideDocumentFormattingEdits` | `inFlightFormats` | content-equality check | ✓ WIRED | Line 63 |
| `extension.ts activate()` | `context.subscriptions` | `.push(...)` around every registration | ✓ WIRED | 14 `registerCommand` + provider + 3 `onNotification`, all confirmed |
| `BbjStatusBarWidget.java` / `BbjJavaInteropStatusBarWidget.java` | `BbjFileVisibility.java` | `updateVisibility() → BbjFileVisibility.showsForSelection(...)` | ✓ WIRED | Both widgets confirmed by direct read |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| target-resolution, document-formatter, decompile-io, extension-activation vitest suites | `npx vitest run test/target-resolution.test.ts test/document-formatter.test.ts test/decompile-io.test.ts test/extension-activation.test.ts` | 4 files, 71 tests, 0 failed | ✓ PASS |
| IntelliJ widget visibility + source-guard JUnit | `gradlew test --tests 'com.basis.bbj.intellij.ui.BbjFileVisibilityTest' --tests 'com.basis.bbj.intellij.ui.BbjStatusBarWidgetSourceGuardTest' --offline` | exit 0, no FAILED lines | ✓ PASS |
| Register-id leakage gate | `git diff 3ec25f02 -- bbj-vscode/src bbj-vscode/test bbj-intellij/src \| grep register-id-pattern` | no output | ✓ PASS |
| Language-server boundary gate | `git diff 3ec25f02 --stat -- bbj-vscode/src/language` | no output | ✓ PASS |
| Debt-marker scan (TODO/FIXME/TBD/XXX/HACK/PLACEHOLDER) on all phase-modified source files | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` | no matches | ✓ PASS |

Full-suite evidence (already gathered by 92-06, re-verified via the targeted re-runs above rather than re-running the full ~1900-test suite a second time): whole vitest suite `RUN_BBJ_TESTS=0 --maxWorkers=2` — 1873 passed, 29 skipped, 0 failed. IntelliJ JUnit via `clean buildPlugin` — 865 tests, 0 failures. Lint exit 0.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| RESP-05 (#500) | 92-04 | Decompile freshness on coarse-mtime filesystems | ✓ SATISFIED | `deleteLeftoverLst`, mtime gate removed, tests pass |
| RESP-06 (#499) | 92-02 | Format race never applies stale content | ✓ SATISFIED | content-equality gate in `document-formatter.ts`, tests pass |
| RESP-07 (#512) | 92-01 | No-active-editor guard on seven commands | ✓ SATISFIED | `target-resolution.ts` wired into all seven commands, tests pass |
| RESP-08 (#531) | 92-05 | Extension re-activation disposes every registration | ✓ SATISFIED | all 14 commands + provider + 3 notifications pushed, double-activate test passes |
| RESP-09 (#610) | 92-03 | IntelliJ status-bar widgets follow tab switches by file type | ✓ SATISFIED (code); live behavior deferred to human check | `BbjFileVisibility` + `FILE_EDITOR_MANAGER` subscription wired in both widgets, JUnit passes; live tab-switch behavior not exercised by automation |

No orphaned requirements: REQUIREMENTS.md maps exactly RESP-05..RESP-09 to Phase 92, and all five are declared in the six plans' frontmatter (`requirements:` fields across 92-01, 92-02, 92-03, 92-04, 92-05, and 92-06's closing declaration of all five). REQUIREMENTS.md itself still shows all five as `Pending` — this is expected per this phase's own closing-plan convention (mirroring Phase 91): plans intentionally withhold marking REQUIREMENTS.md complete until phase verification, so it is not a gap.

### Anti-Patterns Found

None. Scanned all phase-modified source files (`target-resolution.ts`, `Commands.cjs`, `document-formatter.ts`, `decompile-io.ts`, `extension.ts`, `BbjFileVisibility.java`, `BbjStatusBarWidget.java`, `BbjJavaInteropStatusBarWidget.java`) for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers, stub returns, and hardcoded-empty patterns — none found. This corroborates the phase's own code-review report (92-REVIEW.md), which independently found 0 findings across the same 14 files (standard depth, 2026-09-13).

### Human Verification Required

### 1. IntelliJ status-bar widgets follow a bare tab switch (D-13)

**Test:** Rebuild the IntelliJ plugin from the final tree (`clean buildPlugin`), install it in IntelliJ, and in a project containing a `.bbj` program, a `.bbx` program, a non-BBj file, and `config.bbx`: click through `.bbj` tab → non-BBj tab → `config.bbx` tab → `.bbx` program tab → `.bbj` tab again, with no server-status change throughout.

**Expected:** Both status-bar widgets (`BBj: …` and `Java: …`) show for the `.bbj` tab, disappear immediately for the non-BBj tab, stay hidden for `config.bbx`, appear for the `.bbx` program, and show again for the `.bbj` tab — each change on the tab click itself, not later.

**Why human:** Platform `FILE_EDITOR_MANAGER` delivery, real `FileTypeOverrider` resolution for `config.bbx`, and status-bar repaint require a running IntelliJ IDE. No IntelliJ sandbox exists in this devcontainer. This item was staged by plan 92-06's SUMMARY ("Staged human verification") per the phase's own D-13 decision — it is a `verification: backstop` truth in 92-06-PLAN.md's `must_haves`, not a gap.

### Gaps Summary

No gaps. All five ROADMAP success criteria are backed by code that exists, is substantive, and is wired end to end, confirmed by direct file reads (not by trusting SUMMARY.md claims) and by re-running the targeted vitest and IntelliJ JUnit suites in this session. The register-id and language-server-boundary gates are clean, no debt markers were found, and the phase's own code review is independently clean (0 findings). The sole open item is the one live IntelliJ tab-switch check that the phase itself always intended to defer to a human with a running IDE (D-13) — it is not evidence of missing or broken implementation, only of an environment limitation (no IntelliJ sandbox here). A known pre-existing defect (denumbering an already-`.lst` input still watches an unreachable `<input>.lst.lst` path) is explicitly out of scope for this phase per 92-CONTEXT.md and 92-04-SUMMARY.md's "Discovered, Not Fixed" section, and is not counted as a gap here.

---

_Verified: 2026-09-13T08:10:00Z_
_Verifier: Claude (gsd-verifier)_
