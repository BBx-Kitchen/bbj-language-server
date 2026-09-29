---
phase: 113-composer-webview-hardening-consolidation
plan: "02"
subsystem: security
tags: [vscode-extension, webview, postMessage, composer, vitest]

requires:
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 01's addwindow/addchildwindow/setopts-composer-ui.ts wiring tests, executed unmocked against the phase base so the consolidation waves have a regression gate"
provides:
  - "bbj-vscode/src/webview-message-guard.ts: isPlainObject, isString, isBoolean, isFiniteInt, isStringArray, isIntArray, isOneOf, isPanelMessage — dependency-free runtime type-check primitives for a composer webview's postMessage payload"
  - "One isXxxPanelMessage guard per composer webview (isMsgboxPanelMessage, isAddWindowPanelMessage, isAddChildWindowPanelMessage, isCvsPanelMessage, isSetOptsPanelMessage, isSetOptsTriStatePanelMessage), each the first statement of its handler"
  - "bbj-vscode/test/webview-message-guard.test.ts and bbj-vscode/test/composer-webview-message-shape.test.ts: table-driven primitive coverage plus per-panel and discovery-based malformed-message batteries"
affects: [113-03, 113-04, 113-05, 113-06, 113-07, 113-08]

actuals:
  tokens: 13238
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Hand-rolled untrusted-boundary guard module (webview-message-guard.ts), following java-peer-guard.ts's style: dependency-free exported type predicates, failure means silent drop, never throw or log"
    - "A composer's isXxxPanelMessage guard sits next to its Selection/PanelSelection type in its own webview module, composing the shared primitives"
    - "Discovery-based cross-panel test (mirroring webview-panel-lifecycle.test.ts's discoverPanelModules): scans src/ for createWebviewPanel( calls instead of hard-coding the panel list, so a future seventh composer is covered automatically"

key-files:
  created:
    - bbj-vscode/src/webview-message-guard.ts
    - bbj-vscode/test/webview-message-guard.test.ts
    - bbj-vscode/test/composer-webview-message-shape.test.ts
  modified:
    - bbj-vscode/src/msgbox-composer-webview.ts
    - bbj-vscode/src/addwindow-composer-webview.ts
    - bbj-vscode/src/addchildwindow-composer-webview.ts
    - bbj-vscode/src/cvs-composer-webview.ts
    - bbj-vscode/src/setopts-composer-webview.ts
    - bbj-vscode/src/setopts-tristate-webview.ts

key-decisions:
  - "The guard is applied inline as the first statement of each handler, not as an optional registerPanelMessageHandler argument — per the research's Pitfall 4, wrapping the handler in that helper would break webview-panel-lifecycle.test.ts's exact-identity assertion on onDidReceiveMessage"
  - "The SETOPTS tristate guard runs before compose()/sender(...), so a malformed selection never reaches the language server; its test asserts on the injected sender mock, not on WorkspaceEdit, since this panel never computes a preview locally"
  - "The config.bbx SETOPTS apply case gained only the shape guard — its pre-existing missing if (!r.valid) break value-validity check is left as a separate, deferred gap (research Open Question 1), not folded into this plan"
  - "The discovery-based generic-battery test in composer-webview-message-shape.test.ts is the vehicle for the plan's 'a test posts one to each of the six' requirement, reusing webview-panel-lifecycle.test.ts's collectTsFiles/stripComments/discoverPanelModules helpers"

patterns-established:
  - "PanelMessage<S>/PanelMessageSpec<S>/isPanelMessage in webview-message-guard.ts is the shared shape every future composer's guard should compose against"

requirements-completed: [SEC-10]

coverage:
  - id: D1
    description: "A shared, dependency-free primitives module holds every runtime type check (isPlainObject, isString, isBoolean, isFiniteInt, isStringArray, isIntArray, isOneOf, isPanelMessage); the msgbox panel's isMsgboxPanelMessage guard drops a wrong-shaped message before build() runs"
    requirement: SEC-10
    verification:
      - kind: unit
        ref: "test/webview-message-guard.test.ts"
        status: pass
      - kind: unit
        ref: "test/composer-webview-message-shape.test.ts#msgbox panel message guard (#604)"
        status: pass
    human_judgment: false
  - id: D2
    description: "addWindow, addChildWindow and CVS panels each drop a wrong-shaped change/insert payload before build() or a WorkspaceEdit, with their existing value guards and staleness checks unchanged"
    requirement: SEC-10
    verification:
      - kind: unit
        ref: "test/composer-webview-message-shape.test.ts#addWindow panel message guard (#604)"
        status: pass
      - kind: unit
        ref: "test/composer-webview-message-shape.test.ts#addChildWindow panel message guard (#604)"
        status: pass
      - kind: unit
        ref: "test/composer-webview-message-shape.test.ts#CVS panel message guard (#604)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both SETOPTS panels (config.bbx and tristate) drop a wrong-shaped message — the tristate guard runs before its language-server round-trip — and a discovery-based test confirms the six covered panel modules are the full set found under src/ and posts a generic malformed battery to each"
    requirement: SEC-10
    verification:
      - kind: unit
        ref: "test/composer-webview-message-shape.test.ts#SETOPTS config.bbx panel message guard (#604)"
        status: pass
      - kind: unit
        ref: "test/composer-webview-message-shape.test.ts#SETOPTS tristate panel message guard (#604)"
        status: pass
      - kind: unit
        ref: "test/composer-webview-message-shape.test.ts#every discovered panel module drops a generic malformed-message battery (#604)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No composer suite regressed: every pre-existing composer test file byte-identical to the phase base, and the whole-suite run at --maxWorkers=2 shows the same numFailedTests baseline (11, all linking.test.ts interop) as before this plan"
    requirement: SEC-10
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite, run twice)"
        status: pass
    human_judgment: false

duration: 38min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 02: Composer webview message-shape guard Summary

**Six composer webviews (msgbox, addWindow, addChildWindow, CVS, SETOPTS config.bbx, SETOPTS tristate) now drop a wrong-shaped postMessage payload before build(), a WorkspaceEdit, or a language-server request runs, via a shared dependency-free primitives module and one per-panel guard.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-09-27T10:31:00Z
- **Completed:** 2026-09-27T11:09:00Z
- **Tasks:** 3
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments
- `src/webview-message-guard.ts` (new): `isPlainObject`, `isString`, `isBoolean`, `isFiniteInt`, `isStringArray`, `isIntArray`, `isOneOf`, and `isPanelMessage` — the shared, import-free primitives every composer's guard composes, following `java-peer-guard.ts`'s hand-rolled untrusted-boundary style.
- Six `isXxxPanelMessage` guards, one per composer webview, each the first statement of its `registerPanelMessageHandler` callback: `isMsgboxPanelMessage`, `isAddWindowPanelMessage`, `isAddChildWindowPanelMessage`, `isCvsPanelMessage`, `isSetOptsPanelMessage`, `isSetOptsTriStatePanelMessage`.
- `test/webview-message-guard.test.ts` (new, 138 table-driven cases): every primitive's boundary behavior (`isFiniteInt` accepting `0`/`-1`/`2147483648`/`2.0` and rejecting `1.5`/`NaN`/`Infinity`/numeric strings/booleans, etc.) plus `isPanelMessage`'s absent/null/present-payload semantics.
- `test/composer-webview-message-shape.test.ts` (new, 76 test cases across 6 per-panel describes + 1 discovery describe): a malformed-message battery per panel (asserting no `postMessage`, `applyEdit`, `dispose`, sender call, toast, or console output), positive controls (`ready`/`change`/well-formed `insert`/`apply`), and a discovery-based generic battery — mirroring `webview-panel-lifecycle.test.ts`'s `discoverPanelModules()` — that confirms the six covered modules are the full set found under `src/` and posts 20 generic malformed messages to each one's `open...Panel` export.

## Task Commits

Each task was committed atomically:

1. **Task 1: A wrong-shaped message to the msgbox panel is dropped end to end, through a shared primitives module** - `7c529600` (feat)
2. **Task 2: addWindow, addChildWindow and CVS panels drop wrong-shaped messages before build() or a WorkspaceEdit** - `39cf3b1b` (feat)
3. **Task 3: Both SETOPTS panels drop wrong-shaped messages (tristate before any language-server request), and a test posts one to all six** - `1d4fcb3b` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `bbj-vscode/src/webview-message-guard.ts` - shared type-check primitives and `isPanelMessage`
- `bbj-vscode/src/msgbox-composer-webview.ts` - `isMsgboxPanelMessage` guard added
- `bbj-vscode/src/addwindow-composer-webview.ts` - `isAddWindowPanelMessage` guard added
- `bbj-vscode/src/addchildwindow-composer-webview.ts` - `isAddChildWindowPanelMessage` guard added
- `bbj-vscode/src/cvs-composer-webview.ts` - `isCvsPanelMessage` guard added
- `bbj-vscode/src/setopts-composer-webview.ts` - `isSetOptsPanelMessage` guard added (apply case otherwise untouched)
- `bbj-vscode/src/setopts-tristate-webview.ts` - `isSetOptsTriStatePanelMessage` guard added, ahead of `compose()`/`sender(...)`
- `bbj-vscode/test/webview-message-guard.test.ts` - primitive + `isPanelMessage` unit coverage
- `bbj-vscode/test/composer-webview-message-shape.test.ts` - per-panel and discovery-based malformed-message coverage

## Decisions Made
- Guard placement: inline as each handler's first statement, not as an optional `registerPanelMessageHandler` argument — avoids breaking `webview-panel-lifecycle.test.ts`'s assertion that `onDidReceiveMessage` is called with the handler function itself, unwrapped.
- The SETOPTS tristate panel's test asserts on the injected `sender` mock (never called for a malformed message), not on `WorkspaceEdit`, since this panel's preview is always an async LS round-trip, never a local `build()`.
- Left the SETOPTS config.bbx apply case's pre-existing missing `if (!r.valid) break;` value-validity gap untouched — out of this plan's locked scope (research Open Question 1); recorded here so it isn't lost.
- The discovery-based generic-battery describe reuses `webview-panel-lifecycle.test.ts`'s `collectTsFiles`/`stripComments`/`discoverPanelModules` helpers so a future seventh composer webview is covered automatically, without a hand-maintained list.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed two planning-identifier tokens that slipped into doc comments**
- **Found during:** Task 2 (register-check of the source diff before committing)
- **Issue:** The Task 1 commit's `webview-message-guard.ts` doc comment and the Task 2 draft of `composer-webview-message-shape.test.ts`'s header comment referenced `D-02` and `SEC-10` — planning identifiers the project's CLAUDE.md forbids in source/test comments (issue numbers like `#604` are fine, decision/requirement IDs are not).
- **Fix:** Reworded both comments to drop the `D-02`/`SEC-10` tokens while keeping the `#604` issue reference and the same meaning.
- **Files modified:** `bbj-vscode/src/webview-message-guard.ts`, `bbj-vscode/test/composer-webview-message-shape.test.ts`
- **Verification:** `git diff <base> -- bbj-vscode/src bbj-vscode/test | grep '^+[^+]' | grep -cE '...'` (the plan's own Task 3 acceptance-criteria regex) prints `0` after the fix.
- **Committed in:** `39cf3b1b` (Task 2 commit, alongside the addWindow/addChildWindow/CVS guards)

---

**Total deviations:** 1 auto-fixed (1 bug — a register-check catch, not a behavior change).
**Impact on plan:** No functional change; purely a comment-text correction to comply with the project's planning-identifier hygiene rule. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All six composer webviews now validate message shape before any side effect; SEC-10 is fully delivered by this single plan (no sibling plan in Phase 113 also declares it).
- `webview-message-guard.ts` and the six `isXxxPanelMessage` guards are ready for plans 113-05..08's consolidation work (CSP, call-scanner, window-UI helper) to build alongside without re-touching this guard logic.
- The SETOPTS config.bbx apply case's missing value-validity guard (research Open Question 1) remains open and undecided — not scheduled to any plan in this phase; flagged here for a future decision.
- Whole-suite regression gate run twice at `--maxWorkers=2`: `numFailedTests` is 11 both times, exactly the pre-existing `linking.test.ts` interop baseline (documented in `.planning/STATE.md`/`.planning/DEBT.md`) with no other individual test failures — the additional "failed" test files reported at the suite level (`parser.test.ts`, `classes.test.ts`, `declare-in-class.test.ts`, etc.) are `beforeAll` hook timeouts under contention (`Hook timed out in 10000ms`), a known environmental artifact, not assertion failures.

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- All 3 created files found on disk: `bbj-vscode/src/webview-message-guard.ts`, `bbj-vscode/test/webview-message-guard.test.ts`, `bbj-vscode/test/composer-webview-message-shape.test.ts`.
- All 3 task commit hashes (`7c529600`, `39cf3b1b`, `1d4fcb3b`) found in `git log --oneline`.
- Task-level acceptance criteria re-verified: guard-line grep counts are 1 per file across all six webview files; `webview-message-guard.ts` has 0 `^import` lines; no `package.json`/`package-lock.json` diff; `npx tsc -p tsconfig.json` exits 0; `npx eslint` on all nine touched files exits 0; the config.bbx apply case gained no `r.valid` line; `webview-panel-lifecycle.ts` is untouched; the planning-identifier register-check regex matches 0 lines in the full source+test diff.
- Plan-level `<verification>` re-run: `npx vitest run test/webview-message-guard.test.ts test/composer-webview-message-shape.test.ts` passes (140 tests); the 11 pre-existing composer test files listed in the plan's `<verification>` are byte-identical to the phase base commit (`90031944`); the whole-suite gate at `--maxWorkers=2` was run twice and both times reported `numFailedTests: 11`, matching the pre-existing `linking.test.ts` interop baseline with no composer-test or other regressions.
