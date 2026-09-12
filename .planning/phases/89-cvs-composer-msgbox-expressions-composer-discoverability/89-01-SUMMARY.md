---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 01
subsystem: composer-discoverability
tags: [langium, codelens, lsp, vscode, composer, addwindow]

# Dependency graph
requires:
  - phase: 87-shared-composer-command-layer-intellij-setopts-dialog
    provides: the bbj/composer/* shared command layer pattern (Deps interface, createX/registerX factory shape) this plan's handler mirrors
provides:
  - The shared composer-cue contract module (command id, kinds, target shape, titles, config language id) with zero runtime dependencies
  - BBjComposerCodeLensProvider registered as the Langium CodeLensProvider, producing addWindow cues from text/CST only
  - A bounded textDocument/codeLens handler gated at DocumentState.Parsed, overriding Langium's default IndexedReferences/getOrCreateDocument handler
  - bbj.openComposerAt, the VS Code command a cue click invokes, reusing the addWindow Code Action's own arg-building logic
affects: [89-04-intellij-code-vision-click-target, 89-06-intellij-code-vision-render-spike, 89-09-additional-composer-kinds, 89-11-setopts-config-single-source-migration]

# Actuals (#2632)
actuals:
  tokens: 11980
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side textDocument/codeLens as the single cue source, consumed natively by VS Code and by LSP4IJ's Code Vision bridge on the IntelliJ side"
    - "Bounded LSP handler override (budget constant + narrow Deps interface + createX/registerX factory), the same shape bbj-code-action-handler.ts and setopts-in-code-request.ts established"

key-files:
  created:
    - bbj-vscode/src/composer-lens-contract.ts
    - bbj-vscode/src/language/composer-codelens.ts
    - bbj-vscode/src/language/composer-codelens-handler.ts
    - bbj-vscode/src/composer-lens-command.ts
    - bbj-vscode/test/composer-codelens.test.ts
    - bbj-vscode/test/composer-codelens-handler.test.ts
    - bbj-vscode/test/composer-lens-command.test.ts
  modified:
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/src/addwindow-composer-ui.ts
    - bbj-vscode/src/extension.ts
    - bbj-vscode/test/extension-activation.test.ts

key-decisions:
  - "COMPOSER_CODE_LENS_BUDGET_MS = 5000ms, mirroring CODE_ACTION_BUDGET_MS's rationale: a bound on how long a client's cue request can be held, not a performance target for a healthy build."
  - "The handler gates at DocumentState.Parsed (not Langium's default IndexedReferences) because the cue provider reads only text and CST -- linking is never needed and would delay every cue by the cold linking time."
  - "workspace/codeLens/refresh is sent via connection.sendRequest(CodeLensRefreshRequest.type) rather than a connection.languages.codeLens.refresh() helper, because this vscode-languageserver version exposes no CodeLens feature shape on Languages (unlike inlayHint's InlayHintFeatureShape) -- same wire behaviour, different call shape. Documented as a deviation below."

patterns-established:
  - "A composer cue's command target carries {kind, uri, line, character}; the click handler re-decodes the call from the document's CURRENT text at click time rather than trusting the target, so a stale cue degrades to a message instead of editing the wrong text."

requirements-completed: [DISC-01]

coverage:
  - id: D1
    description: "Server advertises codeLensProvider and returns ordered, plain-text 'Compose addWindow' cues for every addWindow call in code, none for comments/strings/no-call documents, with (i/n) suffixing for multiple calls per line"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/composer-codelens.test.ts#BBjComposerCodeLensProvider (#650)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cue requests are bounded, gated at DocumentState.Parsed, and proven not to re-parse/re-link/re-build across repeated requests on a 5000+ line document"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/composer-codelens-handler.test.ts#createBoundedComposerCodeLensHandler (#650)"
        status: pass
      - kind: unit
        ref: "test/composer-codelens-handler.test.ts#BBjComposerCodeLensProvider — no re-parse across repeated requests (#650)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Clicking the addWindow cue in VS Code opens that call's composer with the same argument the lightbulb Code Action builds; a stale cue shows a message and changes nothing; the Code Action's own output is unchanged"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/composer-lens-command.test.ts#openComposerAt"
        status: pass
      - kind: unit
        ref: "test/setopts-in-code-ui.test.ts"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation that the cue actually renders above an addWindow call in a live VS Code editor, and that clicking it opens a real webview panel, needs a human eye on a running extension -- not exercised by any unit test in this plan."

duration: 14min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 01: Server-Side addWindow Composer Cue Summary

**A server-side `textDocument/codeLens` provider marks every `addWindow(...)` call with a plain-text `Compose addWindow` cue, bounded and re-parse-free, with a VS Code `bbj.openComposerAt` command that opens the existing composer from it.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-12T07:09:00Z (approx.)
- **Completed:** 2026-09-12T07:22:14Z
- **Tasks:** 3
- **Files modified:** 12 (7 created, 5 modified)

## Accomplishments
- Shared `composer-lens-contract.ts` module (command id, six-kind `ComposerLensKind`, `ComposerLensTarget`, plain-text `COMPOSER_LENS_TITLES`, config-document language id, gone-target message) with zero runtime dependencies, importable by both the language server and the VS Code extension bundle without pulling either runtime into the other's bundle.
- `BBjComposerCodeLensProvider` registered as the Langium `CodeLensProvider` in `bbj-module.ts`, producing one lens per `addWindow(...)` call found by the existing `findAddWindowCalls` detector, excluding calls inside `COMMENT`/`STRING_LITERAL` CST leaves, with `(i/n)` suffixing for multiple calls on one line in source order and stable line/character ordering.
- A bounded `textDocument/codeLens` handler (`composer-codelens-handler.ts`) overriding Langium's default `addCodeLensHandler` (which gates at `DocumentState.IndexedReferences` and loads documents via `getOrCreateDocument`): gated at `DocumentState.Parsed`, resolves in-memory only, answers `null` on timeout/missing-document/rejected-wait/throwing-provider, registered after `startLanguageServer` alongside the existing code-action override, with a `workspace/codeLens/refresh` request sent once after the first build.
- `bbj.openComposerAt` (`composer-lens-command.ts`) opens the addWindow composer from a cue click, reusing `addWindowPanelArgAt` (extracted from `AddWindowCodeActionProvider` with its label/kind/argument left byte-identical) to re-decode the call from the document's current text at click time; a missing document, out-of-range line, or stale call shows `LENS_TARGET_GONE_TEXT` and opens no panel; other kinds show an informational message; no branch edits the document.
- Structural proof of Roadmap Success Criterion 5: 20 consecutive `provideCodeLens` calls on a 5000+ line document return deep-equal lists while spies on the parser, `DocumentBuilder.update` and `DocumentBuilder.build` record zero calls.

## Task Commits

Each task followed its own RED/GREEN cycle (`tdd="true"`):

1. **Task 1: One server-side cue path — addWindow lenses computed from the parsed document**
   - `73952d4b` test(89-01): add failing test for server-side addWindow composer lens
   - `29b4be74` feat(89-01): server-side addWindow composer lens via textDocument/codeLens
2. **Task 2: Bounded codeLens handler at the Parsed gate, a refresh after the first build, and proof of no re-parse**
   - `9fc18a22` test(89-01): add failing test for bounded composer codeLens handler
   - `96f5c199` feat(89-01): bounded composer codeLens handler gated at Parsed, refreshed after cold build
3. **Task 3: VS Code click-through — `bbj.openComposerAt` opens the addWindow composer from its cue**
   - `9d5af2a5` test(89-01): add failing test for bbj.openComposerAt click-through
   - `541c0f60` feat(89-01): bbj.openComposerAt opens the addWindow composer from its cue

_Task 1 is `type="tracer"`; its own `<verify>` was re-run end-to-end after the commit per the auto-mode tracer feedback gate before Task 2 began, and passed._

## Files Created/Modified
- `bbj-vscode/src/composer-lens-contract.ts` - Shared cue contract, zero runtime imports
- `bbj-vscode/src/language/composer-codelens.ts` - Candidate collection, lens construction, `BBjComposerCodeLensProvider`
- `bbj-vscode/src/language/composer-codelens-handler.ts` - Bounded `textDocument/codeLens` handler
- `bbj-vscode/src/composer-lens-command.ts` - `bbj.openComposerAt` command and dispatch
- `bbj-vscode/src/language/bbj-module.ts` - Registers `CodeLensProvider` in the `lsp` service group
- `bbj-vscode/src/language/main.ts` - Registers the bounded handler after `startLanguageServer`, refreshes code lenses after the first build
- `bbj-vscode/src/addwindow-composer-ui.ts` - Extracted `addWindowPanelArgAt`, reused by the Code Action provider
- `bbj-vscode/src/extension.ts` - Registers `registerComposerLensCommand`
- `bbj-vscode/test/composer-codelens.test.ts` - Task 1 behaviour tests plus the Task 2 structural no-re-parse test
- `bbj-vscode/test/composer-codelens-handler.test.ts` - Handler budget-race tests
- `bbj-vscode/test/composer-lens-command.test.ts` - Click-through routing/gone-target/no-edit tests
- `bbj-vscode/test/extension-activation.test.ts` - Adds the `composer-lens-command.js` mock

## Decisions Made
- `COMPOSER_CODE_LENS_BUDGET_MS = 5000` — a hold-time bound, not a performance target, matching the existing `CODE_ACTION_BUDGET_MS` convention.
- The handler gates at `DocumentState.Parsed` rather than Langium's default `IndexedReferences`, since the provider never touches linking.
- The cue's applicability comes solely from the existing `findAddWindowCalls` detector — no new addWindow pattern was introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `connection.languages.codeLens.refresh()` does not exist in this vscode-languageserver version**
- **Found during:** Task 2 (bounded codeLens handler and refresh)
- **Issue:** The plan's action text called for a `refreshCodeLenses()` mirroring `refreshInlayHints()`'s `connection.languages.inlayHint.refresh()` shape. This project's pinned `vscode-languageserver` version has no `CodeLensFeatureShape` mixed into its `Languages` type (unlike `InlayHintFeatureShape`), so `connection.languages.codeLens` does not typecheck.
- **Fix:** Sent the same LSP notification directly: `connection.sendRequest(CodeLensRefreshRequest.type)` (imported from `vscode-languageserver/node`, which re-exports the protocol-level request), with the same no-op `.catch()` for clients without refresh support. Wire behaviour is identical — a `workspace/codeLens/refresh` request reaches the client the same way.
- **Files modified:** `bbj-vscode/src/language/main.ts`
- **Verification:** `npm run build` exits 0; the acceptance-criteria grep for the literal string `codeLens.refresh()` does not match the resulting code (it matches `CodeLensRefreshRequest`/`refreshCodeLenses` instead) — noted here since a literal grep for the plan's exact wording would report this criterion as not met even though the behaviour it names is delivered correctly.
- **Committed in:** `96f5c199` (Task 2 feat commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — API shape not available in the pinned library version).
**Impact on plan:** No scope creep; the refresh-after-cold-build behaviour is delivered via the correct primitive for this library version.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The server-side cue contract, provider, bounded handler and VS Code click command are in place and proven for one composer kind (addWindow), ready for:
  - Plan 89-04 to add the IntelliJ (LSP4IJ Code Vision) click target for the same lens data.
  - Plan 89-06 to spike the IntelliJ Code Vision render.
  - Plan 89-09 to extend `collectComposerLensCandidates`/`toComposerCodeLenses` to MSGBOX, addChildWindow, CVS() and SETOPTS-in-code without changing the contract or handler shape.
  - Plan 89-11 to route `bbx-config` documents to the server and retire the client-side SETOPTS-only lens, per the assumption-delta decision recorded in the plan (invariant test `test/composer-cue-single-source.test.ts` is not yet created — it belongs to that later plan).
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

All 7 created files verified present on disk (`composer-lens-contract.ts`,
`composer-codelens.ts`, `composer-codelens-handler.ts`, `composer-lens-command.ts`,
`composer-codelens.test.ts`, `composer-codelens-handler.test.ts`, `composer-lens-command.test.ts`).
All 6 commit hashes (`73952d4b`, `29b4be74`, `9fc18a22`, `96f5c199`, `9d5af2a5`, `541c0f60`)
verified present in `git log`. Plan-level `<verification>` steps 1-4 re-run and passing
(targeted tests, build, lint, whole-suite `numFailedTests: 0`); step 5 (register check) re-run
across the full plan diff range with zero matches.
