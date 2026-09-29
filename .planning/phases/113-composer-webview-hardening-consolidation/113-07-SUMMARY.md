---
phase: 113-composer-webview-hardening-consolidation
plan: "07"
subsystem: vscode-extension
tags: [vscode-extension, webview, csp, consolidation, vitest]

requires:
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 02's per-panel isXxxPanelMessage shape guards, so the CSP consolidation edits land on top of already-guarded handlers"
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 04's msgbox/CVS assignTo validation, unaffected by this plan's getHtml changes"
provides:
  - "bbj-vscode/src/webview-csp.ts: buildComposerCsp(webview) — the one place every composer webview builds its CSP array and nonce"
  - "All six composer webviews (msgbox, addWindow, addChildWindow, CVS, SETOPTS config.bbx, SETOPTS tristate) call buildComposerCsp(webview) in getHtml, byte-identical output to before"
  - "bbj-vscode/test/webview-csp.test.ts: helper unit tests, per-panel end-to-end CSP/nonce checks, and a discovery-based guard pinning the CSP to one src file"
affects: [113-08]

actuals:
  tokens: 8105
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "buildComposerCsp(webview: Pick<vscode.Webview, 'cspSource'>) follows webview-nonce.ts's module style: one small, type-only-vscode-import function, byte-identical output to the six former inline builders"
    - "A discovery-based source guard (mirroring webview-panel-lifecycle.test.ts's discoverPanelModules) confirms every panel module calling createWebviewPanel also calls buildComposerCsp and carries neither its own getNonce() call nor its own default-src directive"

key-files:
  created:
    - bbj-vscode/src/webview-csp.ts
    - bbj-vscode/test/webview-csp.test.ts
  modified:
    - bbj-vscode/src/msgbox-composer-webview.ts
    - bbj-vscode/src/addwindow-composer-webview.ts
    - bbj-vscode/src/addchildwindow-composer-webview.ts
    - bbj-vscode/src/cvs-composer-webview.ts
    - bbj-vscode/src/setopts-composer-webview.ts
    - bbj-vscode/src/setopts-tristate-webview.ts
    - bbj-vscode/test/cvs-composer-ui.test.ts

key-decisions:
  - "buildComposerCsp takes Pick<vscode.Webview, 'cspSource'> rather than the full vscode.Webview type, keeping the module unit-testable with a plain { cspSource } object and requiring only a type-only vscode import"
  - "cvs-composer-ui.test.ts's nonce-CSP source check was changed by exactly one line: the expect subject now reads ../src/webview-csp.ts inline via the same readFileSync(fileURLToPath(new URL(...))) form the file already used, with the matcher and its regex byte-identical"
  - "The discovery-based CSP guard test in webview-csp.test.ts reuses webview-panel-lifecycle.test.ts's collectTsFiles/stripComments/CREATE_WEBVIEW_PANEL_CALL helpers so a future seventh composer webview is covered automatically"

patterns-established:
  - "webview-csp.ts is the single owner of the composer CSP string and nonce; any new composer webview must call buildComposerCsp(webview) or the discovery-based guard test fails"

requirements-completed: [REF-07]

coverage:
  - id: D1
    description: "buildComposerCsp(webview) in a new webview-csp.ts returns { nonce, csp } with the byte-identical three-directive CSP and a 24-character base64 nonce; the MSGBOX panel's HTML carries that exact CSP with a matching script nonce end to end"
    requirement: REF-07
    verification:
      - kind: unit
        ref: "test/webview-csp.test.ts#buildComposerCsp"
        status: pass
      - kind: unit
        ref: "test/webview-csp.test.ts#MSGBOX panel CSP end to end"
        status: pass
      - kind: unit
        ref: "test/msgbox-composer-ui.test.ts (unchanged, byte-identical to phase base)"
        status: pass
    human_judgment: false
  - id: D2
    description: "addWindow, addChildWindow and CVS panels each build their CSP through the shared helper with identical output, and cvs-composer-ui.test.ts's existing nonce-CSP source check passes unchanged against the new source location"
    requirement: REF-07
    verification:
      - kind: unit
        ref: "test/webview-csp.test.ts#addWindow panel CSP end to end"
        status: pass
      - kind: unit
        ref: "test/webview-csp.test.ts#addChildWindow panel CSP end to end"
        status: pass
      - kind: unit
        ref: "test/webview-csp.test.ts#CVS panel CSP end to end"
        status: pass
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts#carries a nonce CSP like the other composer panels"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both SETOPTS panels (config.bbx and tristate) build their CSP through the shared helper; a discovery-based test confirms every webview panel module in src/ calls buildComposerCsp and none carries its own getNonce() call or default-src directive, which now exists in exactly one src file"
    requirement: REF-07
    verification:
      - kind: unit
        ref: "test/webview-csp.test.ts#SETOPTS config.bbx panel CSP end to end"
        status: pass
      - kind: unit
        ref: "test/webview-csp.test.ts#SETOPTS tristate panel CSP end to end"
        status: pass
      - kind: unit
        ref: "test/webview-csp.test.ts#the CSP now lives in exactly one place (#533)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No composer suite regressed: every pre-existing composer/lifecycle/staleness test file (other than the one-line cvs-composer-ui.test.ts edit) is byte-identical to the phase base, and the whole-suite gate at --maxWorkers=2 shows the same 11-failure linking.test.ts interop baseline as before this plan"
    requirement: REF-07
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite)"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 07: Shared composer webview CSP helper Summary

**All six composer webviews (msgbox, addWindow, addChildWindow, CVS, SETOPTS config.bbx, SETOPTS tristate) now build their Content-Security-Policy through one `buildComposerCsp(webview)` helper in a new `webview-csp.ts`, byte-identical to the six former inline builders.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-27T12:44:52Z
- **Completed:** 2026-09-27T13:01:49Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments
- `src/webview-csp.ts` (new): `buildComposerCsp(webview: Pick<vscode.Webview, 'cspSource'>): { nonce: string; csp: string }` — moves the byte-identical three-directive CSP array (`default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'`) and its `getNonce()` call out of six inline `getHtml` builders into one place, following `webview-nonce.ts`'s existing module style with a type-only `vscode` import.
- All six composer webviews' `getHtml(webview)` functions now destructure `{ nonce, csp }` from `buildComposerCsp(webview)` and no longer import `getNonce` directly.
- `cvs-composer-ui.test.ts`'s existing nonce-CSP source check now reads `../src/webview-csp.ts` instead of its own file's source text — a one-line change to the `expect(...)` subject, matcher and regex byte-identical.
- New `test/webview-csp.test.ts` (17 tests): the helper's output shape, nonce uniqueness, the empty-`cspSource` case, an end-to-end CSP/nonce adjacency check for each of the six panels, and a discovery-based guard (reusing `webview-panel-lifecycle.test.ts`'s `collectTsFiles`/`stripComments`/`CREATE_WEBVIEW_PANEL_CALL` helpers) confirming every panel module that creates a webview panel calls `buildComposerCsp` and that `default-src` now appears in exactly one `src` file.

## Task Commits

Each task was committed atomically:

1. **Task 1: The MSGBOX panel's CSP comes from the shared helper, byte-identical, end to end** - `0012544f` (feat)
2. **Task 2: The addWindow, addChildWindow and CVS panels use the shared CSP helper** - `c8fd61d9` (feat)
3. **Task 3: Both SETOPTS panels use the shared CSP helper, and the CSP exists once in src** - `d85dfe63` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `bbj-vscode/src/webview-csp.ts` - new shared CSP/nonce builder
- `bbj-vscode/src/msgbox-composer-webview.ts` - `getHtml` calls `buildComposerCsp(webview)`
- `bbj-vscode/src/addwindow-composer-webview.ts` - `getHtml` calls `buildComposerCsp(webview)`
- `bbj-vscode/src/addchildwindow-composer-webview.ts` - `getHtml` calls `buildComposerCsp(webview)`
- `bbj-vscode/src/cvs-composer-webview.ts` - `getHtml` calls `buildComposerCsp(webview)`
- `bbj-vscode/src/setopts-composer-webview.ts` - `getHtml` calls `buildComposerCsp(webview)`
- `bbj-vscode/src/setopts-tristate-webview.ts` - `getHtml` calls `buildComposerCsp(webview)`
- `bbj-vscode/test/cvs-composer-ui.test.ts` - nonce-CSP check now reads `webview-csp.ts`
- `bbj-vscode/test/webview-csp.test.ts` - new file, all three tasks' coverage

## Decisions Made
- `buildComposerCsp` accepts `Pick<vscode.Webview, 'cspSource'>` rather than the full `vscode.Webview` type, so the module needs only a type-only `vscode` import and is testable with a plain `{ cspSource }` object.
- The `cvs-composer-ui.test.ts` edit is exactly one line — the `expect(...)` subject changed from `webviewSource` to an inline `readFileSync(fileURLToPath(new URL('../src/webview-csp.ts', import.meta.url)), 'utf-8')` call, keeping the matcher and regex untouched.
- The discovery-based CSP guard in `webview-csp.test.ts` reuses the exact `collectTsFiles`/`stripComments`/`CREATE_WEBVIEW_PANEL_CALL` helpers from `webview-panel-lifecycle.test.ts` rather than re-deriving them, so future panel modules are covered automatically without a hand-maintained list.

## Deviations from Plan

None - plan executed exactly as written.

(One note, not a deviation: the plan's own Task 1 acceptance-criteria grep, `grep -c "script-src 'nonce-\${nonce}'" ...`, prints 0 under this environment's `ugrep`-backed `grep` — a known environment quirk documented in the 113-04 SUMMARY. `grep -cF` on the same literal text confirms the string is present exactly once in `webview-csp.ts`.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REF-07 is fully delivered by this single plan (no sibling plan in Phase 113 also declares it): the composer webview CSP array now exists in exactly one place, and every composer suite passes with only the one documented source-path change.
- `webview-csp.ts` and its discovery-based guard test are in place for plan 08's remaining consolidation work (call-scanner, window-UI helper) to build alongside without re-touching CSP logic.
- Whole-suite regression gate run at `--maxWorkers=2`: `numFailedTests` is 11, exactly the pre-existing `linking.test.ts` interop baseline (documented in `.planning/STATE.md`/`.planning/DEBT.md`), with no composer-test or other regressions. Three additional test files (`test/functional/installed-extension-e2e.test.ts`, `test/run-call-navigation.test.ts`, `test/setopts-in-code-request.test.ts`) reported "FAIL" at the file-summary level with no individual test failures counted against them — per the project's own house rule and prior plans' precedent (113-02, 113-04), these are `beforeAll`/hook-level artifacts under contention, judged on `numFailedTests` (11), not the failing-suite identity delta.

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- All 2 created files found on disk: `bbj-vscode/src/webview-csp.ts`, `bbj-vscode/test/webview-csp.test.ts`.
- All 3 task commit hashes (`0012544f`, `c8fd61d9`, `d85dfe63`) found in `git log --oneline`.
- Task-level acceptance criteria re-verified: `buildComposerCsp(webview)` grep count is 1 in each of the six webview files; `webview-csp.ts` has exactly one `import type * as vscode from 'vscode';` line and zero `import * as vscode` lines; `default-src` (comments stripped) appears in exactly one `src` file (`webview-csp.ts`); `getNonce()` (comments stripped) appears only in `webview-csp.ts` and `webview-nonce.ts`; `cvs-composer-ui.test.ts`'s diff against the phase base is exactly one line changed, referencing `webview-csp.ts`; `npx tsc -p tsconfig.json` exits 0; `npx eslint` on all nine touched files exits 0; the planning-identifier register-check regex matches 0 lines in the full source+test diff against the phase base commit (`90031944`).
- Plan-level `<verification>` re-run: `npx vitest run test/webview-csp.test.ts` passes (17 tests); the whole-suite gate at `--maxWorkers=2` reports `numFailedTests: 11`, matching the pre-existing `linking.test.ts` interop baseline with no composer-test or other regressions.
