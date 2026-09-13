---
phase: 90-composer-robustness-intellij-composer-performance
plan: 05
subsystem: composer
tags: [vscode, webview, disposable, listener-leak, msgbox, addwindow, addchildwindow, cvs, setopts]

# Dependency graph
requires:
  - phase: 90-01
    provides: "openMsgboxComposerPanel with completing mode and span-exact staleness guard"
  - phase: 90-02
    provides: "openAddWindowComposerPanel / openAddChildWindowComposerPanel field validation and the window-composer-validation-ui.test.ts fake panels with onDidDispose"
provides:
  - "registerPanelMessageHandler(panel, handler): ties a webview panel's message subscription to panel.onDidDispose instead of the extension context"
  - "All six VS Code composer panels (MSGBOX, addWindow, addChildWindow, CVS(), SETOPTS, SETOPTS tri-state) routed through the shared helper"
  - "A source-discovered lifecycle test (webview-panel-lifecycle.test.ts) that finds every panel module by scanning src/ for createWebviewPanel(, never a hard-coded list, and proves an open-then-dispose cycle for each"
affects: [90-08]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 9426
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared panel-lifecycle helper: a type-only `import type * as vscode` module with no runtime vscode dependency, unit-testable with a plain object fake panel"
    - "Source-discovery regression test (mirrors composer-cue-single-source.test.ts's collectTsFiles/stripComments precedent): scans src/ for a marker call instead of a hard-coded module list, so a future seventh composer is covered automatically"

key-files:
  created:
    - bbj-vscode/src/webview-panel-lifecycle.ts
    - bbj-vscode/test/webview-panel-lifecycle.test.ts
  modified:
    - bbj-vscode/src/msgbox-composer-webview.ts
    - bbj-vscode/src/addwindow-composer-webview.ts
    - bbj-vscode/src/addchildwindow-composer-webview.ts
    - bbj-vscode/src/cvs-composer-webview.ts
    - bbj-vscode/src/setopts-composer-webview.ts
    - bbj-vscode/src/setopts-tristate-webview.ts
    - bbj-vscode/test/msgbox-composer-ui.test.ts
    - bbj-vscode/test/cvs-composer-ui.test.ts
    - bbj-vscode/test/window-composer-validation-ui.test.ts
    - bbj-vscode/test/setopts-in-code-ui.test.ts
    - bbj-vscode/test/setopts-stale-edit-guard.test.ts

key-decisions:
  - "registerPanelMessageHandler subscribes with panel.webview.onDidReceiveMessage(handler) — no this-argument, no disposables array — then registers panel.onDidDispose(() => subscription.dispose()) and returns the subscription, exactly as the plan's artifact contract specified"
  - "Every panel's exported context: vscode.ExtensionContext parameter was kept unchanged (callers still pass it); tsconfig has no noUnusedParameters and eslint.config.js sets no unused-vars rule, so no rename to _context was needed"
  - "The discovery test's vi.mock('vscode') is the union of every panel module's actual runtime surface (createWebviewPanel, activeTextEditor getter with document.uri/lineAt/lineCount and selection.active, showInformationMessage/showWarningMessage, workspace.applyEdit/textDocuments, commands.registerCommand/executeCommand, languages.registerCodeActionsProvider, ViewColumn, CodeActionKind, CodeAction, Position, Range, WorkspaceEdit, Uri.parse) — no member beyond the interfaces list was needed"
  - "Discovery test calls every open…Panel export as fn(context, {}, vi.fn()) — an empty arg object puts every panel in NEW mode, which needs a live activeTextEditor (provided as a module-level default) but exercises the identical registerPanelMessageHandler/onDidDispose wiring EDIT mode would"

patterns-established:
  - "A shared, panel-owned disposable replaces a context-parked one wherever a VS Code webview panel registers a message handler; new composer panels must call registerPanelMessageHandler instead of panel.webview.onDidReceiveMessage(..., context.subscriptions) directly"

requirements-completed: []

coverage:
  - id: D1
    description: "registerPanelMessageHandler subscribes to messages exactly once, registers onDidDispose exactly once, and disposes the message subscription exactly once when the panel is disposed — independent of handler errors or message content"
    requirement: "DISC-09"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/webview-panel-lifecycle.test.ts#registerPanelMessageHandler"
        status: pass
    human_judgment: false
  - id: D2
    description: "All six composer panels (MSGBOX, addWindow, addChildWindow, CVS(), SETOPTS, SETOPTS tri-state) route their message handler through registerPanelMessageHandler, with every handler body kept byte-for-byte; opening and disposing each panel leaves context.subscriptions unchanged"
    requirement: "DISC-09"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/msgbox-composer-ui.test.ts#closing the MSGBOX panel disposes its message handler and leaves the extension context untouched (#530)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer-ui.test.ts#closing the CVS() panel disposes its message handler and leaves the extension context untouched (#530)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/window-composer-validation-ui.test.ts#closing the addWindow panel disposes its message handler and leaves the extension context untouched (#530)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/window-composer-validation-ui.test.ts#closing the addChildWindow panel disposes its message handler and leaves the extension context untouched (#530)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A source-discovered test finds every VS Code webview panel module by scanning src/ for createWebviewPanel( (never a hard-coded list), asserts each calls registerPanelMessageHandler and never onDidReceiveMessage/context.subscriptions itself, and proves an open-then-dispose cycle on every exported open…Panel function — so a future seventh composer is covered automatically"
    requirement: "DISC-09"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/webview-panel-lifecycle.test.ts#every webview panel module releases its message handler with its panel (#530)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No panel's message-handling behavior changed, and the whole VS Code suite, lint, and build all stay green"
    requirement: "DISC-09"
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole bbj-vscode suite)"
        status: pass
      - kind: other
        ref: "npm run lint"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 05: VS Code Composer Panel Listener Disposal Summary

**A shared `registerPanelMessageHandler` helper ties every VS Code composer panel's message subscription to `panel.onDidDispose` instead of the extension context, and a source-discovered test proves it for all six panels — including any composer added later.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-12T20:44:00Z
- **Completed:** 2026-09-12T20:56:00Z
- **Tasks:** 3
- **Files modified:** 13 (2 created, 11 modified)

## Accomplishments

- New `bbj-vscode/src/webview-panel-lifecycle.ts` exports `registerPanelMessageHandler<T>(panel, handler)`, which subscribes once to `panel.webview.onDidReceiveMessage(handler)`, registers `panel.onDidDispose(() => subscription.dispose())`, and returns the subscription — a type-only `vscode` import, no runtime dependency, unit-testable with a plain object fake panel.
- All six composer panels — `openMsgboxComposerPanel`, `openAddWindowComposerPanel`, `openAddChildWindowComposerPanel`, `openCvsComposerPanel`, `openSetOptsComposerPanel`, `openSetOptsTriStateComposerPanel` — now call the shared helper in place of `panel.webview.onDidReceiveMessage(handler, undefined, context.subscriptions)`; every handler body was kept byte-for-byte, including the 90-01 staleness guards, the 90-02 field-validation guards, and the SETOPTS `applyIfUnchanged` stale-edit guard.
- `bbj-vscode/test/webview-panel-lifecycle.test.ts` discovers panel modules by scanning `src/` (skipping `language/generated`) for a `createWebviewPanel(` call — never a hard-coded list — found exactly six, asserted each calls `registerPanelMessageHandler` and never `onDidReceiveMessage`/`context.subscriptions` itself, then dynamically imported each module and exercised every exported `open…Panel` function through an open-then-dispose cycle: `context.subscriptions` stays empty throughout, `onDidDispose` is registered exactly once, and firing it disposes the message subscription exactly once.
- Every existing MSGBOX, CVS(), addWindow/addChildWindow and SETOPTS panel test still passes unchanged — messages delivered while the panel is open still reach the handler exactly as before.

## Discovered panel module list (from the source-discovery test)

- `msgbox-composer-webview.ts`
- `addwindow-composer-webview.ts`
- `addchildwindow-composer-webview.ts`
- `cvs-composer-webview.ts`
- `setopts-composer-webview.ts`
- `setopts-tristate-webview.ts`

6 discovered (plan required at least 6). No `vscode` mock member beyond the plan's `<interfaces>` list (`createWebviewPanel`, `activeTextEditor`, `showInformationMessage`, `showWarningMessage`, `workspace.applyEdit`/`textDocuments`, `commands.registerCommand`, `languages.registerCodeActionsProvider`, `ViewColumn`, `CodeActionKind`, `CodeAction`, `Position`, `Range`, `WorkspaceEdit`, `Uri.parse`) plus `commands.executeCommand` was needed; none of the six modules actually call `executeCommand` at open time, but it was included per the plan's action text for completeness.

## Whole-suite result

`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (from `bbj-vscode/`): **100 test files passed, 2 skipped; 1789 tests passed, 29 skipped — 0 failed.** (The 29 skips and 2 skipped files are the local-environment interop/BBj-dependent tests that only run when `RUN_BBJ_TESTS=1`; none belong to `linking.test.ts`/`issue447` interop failures this time, since `RUN_BBJ_TESTS=0` skips them cleanly rather than hitting live drift.) `npm run lint` and `npm run build` both pass with zero errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: Closing the MSGBOX composer panel disposes its message handler through the shared helper, leaving the extension context untouched** - `019e7c31` (feat)
2. **Task 2: The addWindow, addChildWindow and CVS() panels release their handlers with the panel** - `96e549df` (feat)
3. **Task 3: The SETOPTS panels release their handlers too, and a source-discovered test proves it for every panel module** - `b198d7fb` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `bbj-vscode/src/webview-panel-lifecycle.ts` - the shared `registerPanelMessageHandler` helper
- `bbj-vscode/test/webview-panel-lifecycle.test.ts` - helper unit tests + the source-discovered open-then-dispose test across all panel modules
- `bbj-vscode/src/msgbox-composer-webview.ts` - routed through the helper
- `bbj-vscode/src/addwindow-composer-webview.ts` - routed through the helper
- `bbj-vscode/src/addchildwindow-composer-webview.ts` - routed through the helper
- `bbj-vscode/src/cvs-composer-webview.ts` - routed through the helper
- `bbj-vscode/src/setopts-composer-webview.ts` - routed through the helper
- `bbj-vscode/src/setopts-tristate-webview.ts` - routed through the helper
- `bbj-vscode/test/msgbox-composer-ui.test.ts` - fake panel exposes `onDidDispose`'s captured listener + message-subscription dispose spy; new open-then-dispose test
- `bbj-vscode/test/cvs-composer-ui.test.ts` - fake panel gains `onDidDispose`; new open-then-dispose test
- `bbj-vscode/test/window-composer-validation-ui.test.ts` - fake panel exposes the captured dispose listener + message-subscription dispose spy; new open-then-dispose tests for addWindow and addChildWindow
- `bbj-vscode/test/setopts-in-code-ui.test.ts` - `createFakePanel` and all three inline `mockReturnValue` panel stubs gain `onDidDispose`
- `bbj-vscode/test/setopts-stale-edit-guard.test.ts` - `createFakePanel` gains `onDidDispose`

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All six VS Code composer panels now release their message-handler listener when the panel closes; the extension context no longer accumulates dead subscriptions across repeated composer use.
- The source-discovery test structurally protects the invariant for any future composer: a seventh panel module calling `createWebviewPanel(` is picked up automatically and fails the build if it doesn't route through `registerPanelMessageHandler`.
- No change under `bbj-intellij/` (confirmed via `git diff --stat -- bbj-intellij`, empty) — this plan is VS Code-only, matching its `<threat_model>` and prohibitions.
- DISC-09 is shared with plan 90-08 (IntelliJ side); left `Pending` per the shared-ID gate — do not mark it complete until 90-08 also lands.

---
*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*

## Self-Check: PASSED

All key files found on disk (`bbj-vscode/src/webview-panel-lifecycle.ts`, `bbj-vscode/test/webview-panel-lifecycle.test.ts`, and all four other modified source files plus five modified test files); all three task commits (`019e7c31`, `96e549df`, `b198d7fb`) found in `git log --oneline --all`.
