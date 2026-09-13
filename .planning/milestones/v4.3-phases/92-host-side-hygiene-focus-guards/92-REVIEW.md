---
phase: 92-host-side-hygiene-focus-guards
reviewed: 2026-09-13T08:01:54Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjFileVisibilityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java
  - bbj-vscode/src/Commands/Commands.cjs
  - bbj-vscode/src/Commands/target-resolution.ts
  - bbj-vscode/src/decompile-io.ts
  - bbj-vscode/src/document-formatter.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/test/decompile-io.test.ts
  - bbj-vscode/test/document-formatter.test.ts
  - bbj-vscode/test/extension-activation.test.ts
  - bbj-vscode/test/target-resolution.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 92: Host-Side Hygiene & Focus Guards — Code Review Report

**Reviewed:** 2026-09-13T08:01:54Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** clean

## Summary

Reviewed the diff between `6f0eb47a` and `HEAD` for all 14 files in scope, covering five
independent fixes: decompile freshness (RESP-05/#500), the no-editor guard on seven
run/compile/decompile commands (RESP-07/#512), the format-race fix (RESP-06/#499), extension
re-activation cleanup (RESP-08/#531), and the IntelliJ status-bar focus guards (RESP-09/#610).

For each fix I traced the changed code against its locked decisions (D-01..D-13) in
`92-CONTEXT.md`, then independently verified the mechanics rather than trusting the decision
record:

- **Decompile freshness:** confirmed `deleteLeftoverLst`/`lstPathFor` in `decompile-io.ts` compute
  the delete target with the exact same expression `waitForDecompileOutput` polls
  (`inputPath + '.lst'`), so by construction the delete can never remove the input file itself,
  including for an already-`.lst` input (verified against the dedicated test). Confirmed the mtime
  gate was fully removed with no dangling reference to `mtimeMs`/`statSizeAndMtime`. Confirmed
  `decompileInPlace` awaits `deleteLeftoverLst` inside the `try` block, before `execWithProgress`,
  and that a non-ENOENT unlink failure fails closed via the existing `Failed to decompile "…"`
  error path. `decompileReadonly` correctly skips the delete step (fresh `mkdtemp` per run, matching
  D-02). The one known-and-documented residual gap — denumbering an already-`.lst` input still
  watches an unreachable `<input>.lst.lst` path — is a pre-existing condition unchanged by this
  diff (the delete-target and wait-target expressions were already identical before and after),
  is explicitly flagged `[ASSUMED]`/deferred in `92-RESEARCH.md` Pitfall 1, and is not something
  this phase's five success criteria require fixing; it is not treated as a defect of this review.

- **No-editor guard:** traced `resolveRunTarget`/`resolveDecompileTarget`/`isRunnableBbjDocument`
  in `target-resolution.ts` against the actual `package.json` menu `when` clauses
  (`resourceLangId == bbj && resourceExtname != .bbjt`) and the actual `contributes.languages`
  entry (`.bbx` carries language id `bbj`, confirming the module's claim that `resourceLangId ==
  bbx` is dead). Verified all seven commands (`run`, `runBUI`, `runDWC`, `compile`, `denumber`,
  `decompileReplace`, `decompileReadonly`) resolve target-first via the correct helper
  (`runTargetOrWarn` vs. `decompileTargetOrWarn`) before calling `getBBjHome()`, with no path where
  `params.fsPath` is dereferenced without a guard. Verified the `bbj.runBUI`/`bbj.runDWC` handlers
  in `extension.ts` resolve and warn before `ensureValidToken()`, so the no-file warning fires
  before any credential prompt, and pass the already-resolved path through as `{ fsPath: target }`
  so a later re-resolution inside `Commands.runBUI`/`runWeb` is a pure passthrough (no re-derivation
  from a possibly-changed active editor, no double warning). Verified the `run` command's
  auto-save-before-run condition now also requires `active.document.fileName === fileName`, fixing
  the Explorer-right-click-while-a-different-file-is-focused case D-05 calls out, without leaving
  a dangling reference to the old unconditional check.

- **Format race:** traced the `inFlightFormats` map's content-keyed sharing and the
  `clearInFlight` identity guard through a hand-simulated three-request interleaving (older run
  settling after a newer run has already replaced its map entry) and confirmed the removal guard
  (`inFlightFormats.get(uriKey)?.promise === formatPromise`) prevents an older run's settle from
  evicting a newer entry, matching the dedicated test for that exact scenario.

- **Re-activation cleanup:** diffed every `registerCommand`, the single
  `registerDocumentFormattingEditProvider`, and all three `client.onNotification` calls inside
  `activate()` and confirmed each is now wrapped in `context.subscriptions.push(...)` with no
  bare call left over. The registration helpers invoked at the top of `activate()`
  (`registerMsgboxComposer` and friends) are unchanged by this diff and out of scope per D-09's
  own explicit note.

- **IntelliJ focus guards:** confirmed both widgets subscribe `FILE_EDITOR_MANAGER` on the same
  `messageBusConnection` `dispose()` already disconnects (no new connection, no new leak surface),
  and that `showsForSelection` reads `getFileType().getName()` exclusively — no extension-based
  branch remains in either widget. Cross-checked `BbjFileVisibility`'s drift-guard tests against
  the live `BbjFileType`/`BbjConfigFileType`/`plugin.xml` literals they assert on ("BBj", "BBx
  Config", `extensions="bbj;bbjt;src;bbx"`) and confirmed all three match the current source
  exactly, so the guards are not vacuous.

I also grepped every added line across `src`/`test` in both projects for hardcoded secrets,
`eval`/`innerHTML`/shell-exec patterns, debug artifacts (`console.log`, `debugger`, TODO/FIXME),
and for planning-id leakage (`92-0N`, `D-NN`, `T-92-NN`, `Pitfall N`, `CR/WR/IN-NN`) — none found;
the pre-existing `P62-D2-011`/`P62-D2-010`/`P62-D3-001`/`P62-D5-006` labels in the two `.test.ts`
files are untouched carryovers from Phase 67, not newly introduced.

No defects were found that are attributable to this diff. All reviewed files meet quality
standards.
