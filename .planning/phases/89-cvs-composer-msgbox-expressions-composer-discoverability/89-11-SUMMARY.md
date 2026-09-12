---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 11
subsystem: composer
tags: [codelens, langium, document-builder, vscode, config-file, discoverability]

# Dependency graph
requires:
  - phase: 89-06
    provides: the human's routing decision (route config.bbx to the server under its own bbx-config id) unblocking this plan
  - phase: 89-09
    provides: the shared cue aggregator collectComposerLensCandidates and the structural no-re-parse test
  - phase: 89-01
    provides: the bounded, Parsed-gated composer codeLens handler
provides:
  - BBjDocumentBuilder.update filter (isBuildableDocumentUri) that drops bbx-config and service-less
    uris before Langium's build, so a config document never reaches parse/link/validate
  - configComposerLenses(uri, text) — the setopts-config cue source answered directly from raw text
  - VS Code documentSelector widened to include the config-document language id
  - retirement of the VS Code client-side SETOPTS-only code-lens provider (single cue source)
  - setopts-config click dispatch opening the existing SETOPTS composer panel
affects: [89-12, 89-13]

actuals:
  tokens: 9200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A document reaching the language server for a cue-only purpose is filtered out of DocumentBuilder.update entirely (never handed to the base method) rather than filtered inside the build pipeline, so no build-state reset or build phase ever fires for it"
    - "The bounded composer codeLens handler answers a raw-text-only document kind before any document-state wait, mirroring the same early-return shape the config-only update filter uses"

key-files:
  created:
    - bbj-vscode/test/bbj-document-builder-config.test.ts
    - bbj-vscode/test/composer-cue-single-source.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/composer-codelens.ts
    - bbj-vscode/src/language/composer-codelens-handler.ts
    - bbj-vscode/test/composer-codelens-handler.test.ts
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/setopts-composer-ui.ts
    - bbj-vscode/src/composer-lens-command.ts
    - bbj-vscode/test/composer-lens-command.test.ts

key-decisions:
  - "isBuildableDocumentUri checks the open text document's language id first (bbx-config -> excluded, even for a file literally named myconfig.bbj), then falls back to the service registry's own hasServices check for everything else — mirroring the same order Langium's ServiceRegistry.getServices itself uses"
  - "BBjDocumentBuilder.update returns without calling the base method at all when the filtered changed list and deleted are both empty, so a config-only change never resets currentState or fires a build phase"
  - "setoptsConfigPanelArgAt is the single argument-building function now shared by the Code Action, the active-editor command entry point and the new cue-click dispatch, so all three build byte-identical arguments"

requirements-completed: [DISC-01]

coverage:
  - id: D1
    description: "A bbx-config document reaching the language server is never parsed, linked, indexed, validated or diagnosed as BBj source — BBjDocumentBuilder.update drops it (and any service-less uri) before Langium's build, with no base-method call at all when nothing buildable and nothing deleted remains"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-document-builder-config.test.ts#isBuildableDocumentUri (#650)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-document-builder-config.test.ts#BBjDocumentBuilder.update filters config documents before the base update (#650)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A .bbj document changed in the same update batch as a bbx-config document is still passed to Langium's build unchanged"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-document-builder-config.test.ts#a config uri mixed with a bbj uri: base update is called once with only the bbj uri"
        status: pass
    human_judgment: false
  - id: D3
    description: "textDocument/codeLens on a bbx-config document answers immediately from raw text — one Compose SETOPTS cue (kind setopts-config, character 0) per SETOPTS-recognized line, nothing for any other line, and never waits on document state"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-codelens-handler.test.ts#the bbx-config branch answers from raw text before any wait (#650)"
        status: pass
    human_judgment: false
  - id: D4
    description: "VS Code sends bbx-config documents to the server (documentSelector widened) and the client-side SETOPTS-only code-lens provider is removed, so no line ever shows two SETOPTS cues"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-cue-single-source.test.ts#composer cue single source (#650)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Clicking a config-file SETOPTS cue in VS Code opens the existing SETOPTS composer panel with exactly the argument the SETOPTS Code Action builds; the Code Action and bbj.composeConfigSetopts command are otherwise unchanged"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-lens-command.test.ts#setopts-config: on an open config document whose line still carries a SETOPTS line, calls openSetOptsComposerPanel once with setoptsConfigPanelArgAt(...)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 11: Config Documents Reach the Server as Text-Only, SETOPTS Cue Unified Summary

**A bbx-config document now reaches the language server (widened VS Code documentSelector) but is filtered out of `BBjDocumentBuilder.update` before Langium's build — never parsed, linked, indexed, validated or diagnosed — and its SETOPTS line gets the shared server composer cue instead of a second, now-retired client-side lens.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-12T10:16:00Z
- **Completed:** 2026-09-12T10:41:00Z
- **Tasks:** 2
- **Files modified:** 10 (8 modified, 2 created)

## Accomplishments
- `isBuildableDocumentUri(uri, textDocuments, serviceRegistry)` in `bbj-document-builder.ts`: false for a
  `bbx-config`-language document (regardless of file extension) and for any uri with no registered
  services at all; true otherwise. `BBjDocumentBuilder.update` filters `changed` through it and returns
  without ever calling the base `update` when the filtered list and `deleted` are both empty — a
  config-only change never resets `currentState` or fires a build phase.
- `configComposerLenses(uri, text)` in `composer-codelens.ts`: a `setopts-config` cue on every line
  `parseSetOptsLine` (the retired client lens's own detector, re-hosted server-side) recognizes.
- `composer-codelens-handler.ts`'s bounded handler answers a `bbx-config` document straight from its
  open text before any document-state wait — returning `null` only when the document has no text
  available (not open) — while every other document keeps the existing Parsed-gated, budget-bounded path.
- `extension.ts`'s language client `documentSelector` now includes the config-document language id
  beside `bbj`, sourced from the shared `CONFIG_DOCUMENT_LANGUAGE_ID` constant; a config document
  reaching the server is documented as never built.
- `setopts-composer-ui.ts` retires its own `vscode.languages.registerCodeLensProvider` registration —
  the always-visible SETOPTS cue for config files now comes from the server's shared lens — and exports
  `setoptsConfigPanelArgAt(uri, line, lineText)`, now the single argument-building function shared by the
  Code Action, the active-editor command entry point, and the new cue-click dispatch.
- `composer-lens-command.ts` gains the `setopts-config` branch: re-decodes the line at click time via
  `setoptsConfigPanelArgAt` and opens the existing SETOPTS composer panel, or shows the gone-target
  message if the line no longer carries a SETOPTS shape.
- New `test/composer-cue-single-source.test.ts` scans every `.ts` module under `bbj-vscode/src`
  (excluding generated code) and fails if any registers its own VS Code code-lens provider — pinning the
  single-cue-source invariant structurally, not against a fixed file list.

## Task Commits

Each task was committed atomically:

1. **Task 1: The server treats config documents as text-only — never built, SETOPTS cues from raw text** - `06aea2ca` (test)
2. **Task 2: VS Code sends config documents to the server, retires its client-side SETOPTS lens, and opens the config composer from the shared cue** - `3651a484` (feat)

**Plan metadata:** (this commit) — completes the plan

## Files Created/Modified
- `bbj-vscode/src/language/bbj-document-builder.ts` - `isBuildableDocumentUri` and the filtering `update` override
- `bbj-vscode/test/bbj-document-builder-config.test.ts` - filter and no-call-on-config-only-change coverage
- `bbj-vscode/src/language/composer-codelens.ts` - `configComposerLenses`
- `bbj-vscode/src/language/composer-codelens-handler.ts` - `bbx-config` branch answering from raw text
- `bbj-vscode/test/composer-codelens-handler.test.ts` - config-branch coverage added to the existing handler suite
- `bbj-vscode/src/extension.ts` - widened `documentSelector`, `CONFIG_LANGUAGE_ID` sourced from the shared constant
- `bbj-vscode/src/setopts-composer-ui.ts` - retired client-side lens registration, new `setoptsConfigPanelArgAt`
- `bbj-vscode/src/composer-lens-command.ts` - `setopts-config` click dispatch
- `bbj-vscode/test/composer-lens-command.test.ts` - updated for the now-wired `setopts-config` behavior
- `bbj-vscode/test/composer-cue-single-source.test.ts` - single-cue-source and documentSelector invariant

## Decisions Made
- `isBuildableDocumentUri` checks the open text document's language id before falling back to
  `serviceRegistry.hasServices`, mirroring Langium's own `ServiceRegistry.getServices` lookup order —
  this is what makes a config file literally named `myconfig.bbj` still get excluded.
- The filtering `update` override returns before calling the base method at all when nothing survives
  the filter and nothing is deleted, rather than calling the base with empty arrays — avoiding an
  unnecessary `currentState` reset and build-phase fire for a pure config-only change.
- `setoptsConfigPanelArgAt` replaced the former `argForLine` helper as the single argument-building
  function, removing a redundant wrapper now that all three callers (Code Action, active-editor command,
  cue-click dispatch) need the same uri/line/lineText-to-argument mapping.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 89-12 (IntelliJ's matching `BBx Config` mapping and `BbjConfigFileTypeRegistrationTest`
  refinement) is unblocked: the server-side half (never parses/builds a config document, answers its
  SETOPTS cue from raw text) is in place for both IDEs to share.
- Plan 89-13 can build the end-to-end e2e proof for the config-file cue on top of this plan's server and
  VS Code wiring.
- `DISC-01` remains Pending in REQUIREMENTS.md per the shared-ID gate — plans 89-12 and 89-13 also
  declare it and have no SUMMARY yet.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED
- FOUND: bbj-vscode/src/language/bbj-document-builder.ts (isBuildableDocumentUri, override async update)
- FOUND: bbj-vscode/src/language/composer-codelens.ts (configComposerLenses)
- FOUND: bbj-vscode/test/bbj-document-builder-config.test.ts
- FOUND: bbj-vscode/test/composer-cue-single-source.test.ts
- FOUND: commit 06aea2ca (`git log --oneline --all | grep 06aea2ca`)
- FOUND: commit 3651a484 (`git log --oneline --all | grep 3651a484`)
- Re-ran all task-level `<acceptance_criteria>` greps: all four pass (isBuildableDocumentUri,
  override async update(, configComposerLenses, setoptsConfigPanelArgAt, language: CONFIG_DOCUMENT_LANGUAGE_ID)
- Re-ran the plan-level `<verification>`: targeted vitest suite (58/58 pass), `npm run build` (0 errors),
  `npm run lint` (0 errors), whole-suite vitest with `RUN_BBJ_TESTS=0 --maxWorkers=2`
  (`numFailedTests: 0` — 1663 passed, 30 skipped; the one failed suite is the known
  `run-call-file-resolution.test.ts` `initializeWorkspace` `beforeAll` hook-timeout contention, not a
  regression)
- Register check: `git diff` across both task commits for `bbj-vscode/src` and `bbj-vscode/test` shows
  no plan/decision/threat ids in source or test comments — only `#650` (permitted issue reference)
