---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 06
subsystem: composer
tags: [codelens, e2e, intellij, vscode, spike, discoverability]

# Dependency graph
requires:
  - phase: 89-01
    provides: server-side composer CodeLens tracer (composer-codelens.ts, bbj.openComposerAt)
  - phase: 89-04
    provides: IntelliJ Code Vision click wiring (ComposerLensKinds/BbjOpenComposerAtAction)
provides:
  - examples/issue650-composer-cues.bbj cue fixture (addWindow lines, REM decoy, string-literal decoy, shared-line pair)
  - installed-bundle e2e proof that the shipped VS Code extension serves codeLensProvider and Compose addWindow cues
  - a human GO verdict for IntelliJ Code Vision rendering and click-through, unblocking Roadmap Success Criterion 1
  - a human decision (route) on how config.bbx reaches the shared composer cue, unblocking plans 89-11/89-12
affects: [89-11, 89-12, 89-13]

actuals:
  tokens: 6000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "installed-bundle e2e describe blocks spawn the reinstalled server directly and assert on textDocument/codeLens, never the in-repo dev build"

key-files:
  created:
    - examples/issue650-composer-cues.bbj
  modified:
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts

key-decisions:
  - "Code Vision spike: GO (IU-262.10315.125) — IntelliJ IDEA 2026.2.2, macOS aarch64, LSP4IJ 0.21.0 plugin; the cue rendered and clicking it opened the composer."
  - "Config routing decision: route — plans 89-11 and 89-12 proceed as planned with config.bbx routed to the language server under its own bbx-config id; the Phase 84 'never reaches the server' invariant is superseded by a refined one those plans re-pin."
  - "Because the Code Vision spike is GO, no D-07 gutter-marker gap-closure plan is needed before plan 89-12 runs — the fallback path is moot."

requirements-completed: [DISC-01]

coverage:
  - id: D1
    description: "The installed VS Code bundle (reinstalled from a fresh build) advertises codeLensProvider and serves Compose addWindow cues on the correct lines only, proven against the actual shipped artifact rather than the dev server"
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#composer cues on the installed bundle (#650)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A human confirms IntelliJ Code Vision renders the addWindow cue and clicking it opens the composer, in a real IntelliJ build inside the plugin's sinceBuild range"
    verification: []
    human_judgment: true
    rationale: "No automated harness exists for IntelliJ Code Vision rendering/click-through in this devcontainer; Roadmap Success Criterion 1 and D-07 require a human looking at a real IDE build."
  - id: D3
    description: "A human decides how config.bbx files get the shared composer cue, reversing or preserving the Phase 84 pinned invariant"
    verification: []
    human_judgment: true
    rationale: "The decision overturns a prior phase's pinned test invariant and gates two downstream plans; this is exactly the kind of default-would-be-wrong decision gate=blocking-human exists for."

duration: 6min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 06: Composer Discoverability Go/No-Go Spike Summary

**IntelliJ Code Vision renders and clicks through the shared composer cue (GO, IU-262.10315.125), and the human decision routes config.bbx to the language server under its own bbx-config id — both distributables were proven end-to-end first via an installed-bundle e2e test against the reinstalled VS Code extension.**

## Performance

- **Duration:** 6 min (this continuation segment; Task 1 build/e2e work was completed in an earlier session)
- **Tasks:** 3
- **Files modified:** 2 (Task 1 only; Tasks 2/3 produced no source changes)

## Accomplishments
- `examples/issue650-composer-cues.bbj` fixture created: two separate `addWindow` lines (one with a `$........$` flags literal), one shared line with two `addWindow` calls, a REM-commented call, and a string-literal decoy containing `addWindow(1, 2, 3, 4)`.
- New describe block `composer cues on the installed bundle (#650)` in `installed-extension-e2e.test.ts` spawns the freshly reinstalled bundle, asserts `capabilities.codeLensProvider` is advertised, and confirms `textDocument/codeLens` returns `bbj.openComposerAt` cues with `kind: 'addwindow'` on every addWindow code line (with `(1/2)`/`(2/2)` suffixing the shared line) and none on the REM or string-literal lines. A client-bundle check confirms `out/extension.cjs` carries the `bbj.openComposerAt` literal.
- Both distributables were rebuilt from the tracer (VS Code VSIX reinstalled to `~/.ext-test` at version 0.12.28; IntelliJ `bbj-intellij-0.1.0.zip` built via `buildPlugin`, jar's `plugin.xml` confirmed to declare `bbj.openComposerAt`).
- **Go/no-go spike (Task 2): GO.** A human installed the plugin in IntelliJ IDEA 2026.2.2 (build IU-262.10315.125, macOS aarch64, LSP4IJ 0.21.0 plugin), opened the fixture, saw the `Compose addWindow` Code Vision cue render without caret placement, and clicked through to the composer successfully. No VS Code issues were reported.
- **Config-routing decision (Task 3): route.** The human selected routing config.bbx files to the language server under their own `bbx-config` language id, superseding Phase 84's "config file never reaches the server" invariant with a refined one (server never parses/indexes/diagnoses the config content; a builder filter drops it). Plans 89-11 and 89-12 proceed unchanged.
- Because Task 2 resolved GO, D-07's gutter-marker fallback is not needed — no gap-closure plan is required before plan 89-12.

Code Vision spike: GO (IU-262.10315.125)

Config routing decision: route

## Task Commits

1. **Task 1: Build both distributables from the tracer and prove the installed bundle serves the addWindow cue** - `c6c5b5f5` (test)
2. **Task 2: Go/no-go — Code Vision render and click-through** - checkpoint:human-verify, `gate="blocking-human"` — no code changes, human answered `GO IU-262.10315.125`
3. **Task 3: Config routing decision** - checkpoint:decision, `gate="blocking-human"` — no code changes, human answered `route`

**Plan metadata:** (this commit) — completes the plan

## Files Created/Modified
- `examples/issue650-composer-cues.bbj` - cue fixture with addWindow lines, a shared two-call line, a REM decoy, and a string-literal decoy
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - new describe block proving the installed bundle's `codeLensProvider` capability and `Compose addWindow` cue placement, plus a client-bundle literal check for `bbj.openComposerAt`

## Decisions Made
- Code Vision spike: **GO** (IU-262.10315.125, IntelliJ IDEA 2026.2.2, macOS aarch64, LSP4IJ 0.21.0 plugin) — the cue renders without caret placement and clicking it opens the composer pre-filled.
- Config routing decision: **route** — config.bbx reaches the language server under its own `bbx-config` id; plans 89-11 and 89-12 execute as originally planned.
- No D-07 gutter-marker gap-closure plan is needed, since the spike outcome is GO.

## Deviations from Plan

None - plan executed exactly as written. Tasks 2 and 3 are checkpoints answered by the human with no source changes of their own.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 89-11 and 89-12 are unblocked: their precondition on the recorded `Config routing decision: route` line is satisfied by this SUMMARY.
- Plan 89-12 (and any IntelliJ Code Vision cue-dependent plan) is unblocked by the recorded `Code Vision spike: GO` line; no fallback gutter-marker plan is required.
- Wave 3 of Phase 89 (plans 89-06 and 89-07) is now fully summarized.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED
- FOUND: examples/issue650-composer-cues.bbj
- FOUND: bbj-vscode/test/functional/installed-extension-e2e.test.ts (describe block `composer cues on the installed bundle (#650)`)
- FOUND: commit c6c5b5f5 (`git log --oneline --all | grep c6c5b5f5`)
- Re-ran plan `<verification>` item 5 (register check): `git -C /home/coder/repos/bbj-language-server diff` for this plan's files shows no plan/decision/threat ids in source or test comments — only `#650` (permitted issue reference)
- Both required verbatim lines (`Code Vision spike: GO (IU-262.10315.125)`, `Config routing decision: route`) present above, each on its own line
