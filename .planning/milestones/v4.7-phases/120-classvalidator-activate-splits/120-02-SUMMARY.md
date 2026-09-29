---
phase: 120-classvalidator-activate-splits
plan: "02"
subsystem: testing
tags: [vscode-extension, activation, vitest, characterization-test]

requires:
  - phase: 120-classvalidator-activate-splits
    provides: "plan 01's ClassValidator split, establishing the phase's base SHA and whole-suite baseline (independent of this plan's own extension.ts safety net)"
provides:
  - "Two characterization test files pinning activate()'s command-registration coverage, activation order and subscription count, and its open-prompt and status-bar behaviour, all on the unsplit extension.ts"
affects: [120-03-activate-split, 120-04-activate-split]

actuals:
  tokens: 7800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Trace-instrumented vscode mock: every tracked vscode API call pushes a short tag (command:<id>, statusBar:<priority>, notification:<method>, composer:<functionName>, etc.) onto a hoisted ordered array, letting a single test assert both 'this happened' and 'in this order' against one literal"
    - "Hoisted mutable host-state object (tabsAll/activeTextEditor/diagnostics) read through vscode mock getters, so a test can arrange pre-activation state (tabs already open, an editor already active) before calling activate(), matching how VS Code itself calls activate() after tabs/editors already exist"

key-files:
  created:
    - bbj-vscode/test/activation-command-coverage.test.ts
    - bbj-vscode/test/activation-prompts-and-status-bars.test.ts

key-decisions:
  - "The pinned activation sequence and 32-item subscriptions count in activation-command-coverage.test.ts are the literal from the plan's interfaces block, unchanged: the instrumented trace matched it exactly on the first run against the unsplit tree, so no observed-base correction was needed"
  - "The 'decompile.promptOnOpen false suppresses both a tokenized and a plain-text file' test uses one setting (promptOnOpen: false) for both files in one activation, because that setting is read before any file content is inspected in maybePromptTokenized — both tabs return synchronously before the first await, so the negative assertion needs no vi.waitFor and cannot be a timing-dependent false pass"
  - "requirements-completed is left empty and REF-11 is not marked in REQUIREMENTS.md, per this plan's own instruction: the safety net proves today's behaviour, it does not deliver the split that satisfies REF-11 — plan 04 marks REF-11 complete"

requirements-completed: []

coverage:
  - id: D1
    description: "activation-command-coverage.test.ts proves every contributes.commands id in package.json reaches registerCommand (15 from activate() itself, 6 via the checked composer allow-list), that activate() registers nothing package.json doesn't contribute, and pins the 39-entry activation trace and 32-item subscriptions count"
    verification:
      - kind: unit
        ref: "test/activation-command-coverage.test.ts (4 tests) + test/extension-activation.test.ts (5 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "activation-prompts-and-status-bars.test.ts pins the tokenized and line-numbered open-prompt texts/actions and once-per-file behaviour, the three status bars' priorities/alignment/text/tooltip, and the suppression-bar and BBjCPL-bar show/hide rules"
    verification:
      - kind: unit
        ref: "test/activation-prompts-and-status-bars.test.ts (6 tests) + test/config-file-association.test.ts + test/em-token-expiry-wiring.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "No file under bbj-vscode/src changed; lint and typecheck:test stay clean; neither new test file carries a planning or audit identifier"
    verification:
      - kind: unit
        ref: "npm run lint && npm run typecheck:test; grep hygiene check over both new files"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-09-29
status: complete
---

# Phase 120 Plan 02: activate() Characterization Safety Net Summary

**Two new test files pin every contributed command's registration path, the 39-step activation order and 32-item subscriptions count, and the open-prompt/status-bar behaviour of the unsplit `extension.ts`, so plans 03 and 04 have a green bar to keep, not a hand re-read of the source, while moving the code out of `activate()`.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-29T06:44:50Z
- **Completed:** 2026-09-29T06:55:45Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- Task 1 (tracer): confirmed the precondition (extension.ts/Commands/package.json unchanged since the recorded phase base), then wrote `test/activation-command-coverage.test.ts` with a trace-instrumented `vscode` mock copied from `extension-activation.test.ts`'s harness. Four tests prove: every `contributes.commands` id is registered by `activate()` or is on a six-entry, individually-checked composer allow-list; nothing outside that set is registered; and the activation trace/subscriptions count match the literal derived at planning time from the unsplit `extension.ts` — the instrumented run matched that literal exactly with no correction needed, so the tracer feedback gate (targeted suites for this task) passed on the first attempt and Task 2 proceeded without a checkpoint.
- Task 2: wrote `test/activation-prompts-and-status-bars.test.ts` with a second, richer mock (mutable host state for tabs/active editor/diagnostics read through getters, a hoisted settings map, and captured listeners so a test can fire tab-open, active-editor and diagnostics events after activation). Six tests pin the tokenized-file and line-numbered-file open prompts (exact texts, both actions, once-per-file, the action that runs the replace/denumber command), the three status bars' creation order/priorities/text/tooltip, and the suppression-bar and BBjCPL-bar show/hide rules driven by diagnostics and the `bbj/bbjcplAvailability` notification.
- Both files pass together with `extension-activation.test.ts`, `config-file-association.test.ts` and `em-token-expiry-wiring.test.ts`; `npm run lint` and `npm run typecheck:test` are clean; no file under `bbj-vscode/src` changed.

## Task Commits

1. **Task 1: Every contributed command reaches registerCommand on activation, pinned against package.json together with the activation order** — `a2444ed7` (test)
2. **Task 2: The open prompts and the two diagnostic status bars are pinned by behaviour before they move** — `c152243c` (test)

**Plan metadata:** committed alongside STATE.md/ROADMAP.md at plan-completion time.

## Files Created/Modified

- `bbj-vscode/test/activation-command-coverage.test.ts` — reads the real `package.json`, activates with a trace-instrumented mocked `vscode`, and asserts contributed-command coverage, the checked allow-list, and the pinned 39-entry activation sequence with a 32-item `context.subscriptions`
- `bbj-vscode/test/activation-prompts-and-status-bars.test.ts` — activates with a mocked tab/active-editor/diagnostics/notification harness and asserts the tokenized/line-numbered prompt texts and once-per-file behaviour, and the three status bars' creation and show/hide rules

## Base Evidence and Identity Checks

**Phase base SHA (unchanged from plan 01):** `a2d08e25ca22ab7c995f942ce6b5a21d27b0efa0`

**Precondition check (Task 1):** `git diff --quiet a2d08e25... -- bbj-vscode/src/extension.ts bbj-vscode/src/Commands bbj-vscode/package.json` exited 0 before any edit — confirmed met.

**Targeted runs:**
```
test/activation-command-coverage.test.ts + test/extension-activation.test.ts
  Test Files  2 passed (2)
       Tests  9 passed (9)

test/activation-prompts-and-status-bars.test.ts + test/activation-command-coverage.test.ts
  + test/extension-activation.test.ts + test/config-file-association.test.ts
  + test/em-token-expiry-wiring.test.ts
  Test Files  5 passed (5)
       Tests  43 passed (43)
```

**Gates:** `npm run lint` and `npm run typecheck:test` both exit 0 (`gates OK`).

**Shape/pins checks:** both plan-authored shell checks (`net test shape OK`, `pins OK`) pass — the allow-list covers all six composer ids, `package.json`/`CONFIG_RELOAD_METHOD`/`RESOLVED_CONFIG_PATH_METHOD` are read/imported (not retyped), at least 15 `command:bbj.*` literals are pinned, both prompt texts and both status-bar texts are present, and `git diff`/`git status` confirm no file under `bbj-vscode/src` changed.

**Hygiene:** `grep -c -E 'P6[0-9]-D[0-9]|\bD-[0-9]{2}\b|\b(REF|FIX|SEC|TEST|DISC)-[0-9]{2}\b|[Pp]hase [0-9]{2,3}\b'` returns 0 across both new files. `git show --stat --format= HEAD` after each commit lists exactly the one intended file. No leftover `vitest` process after the runs.

**Pinned activation sequence (39 entries) and subscriptions count (32), as observed on the unsplit tree — no correction from the interfaces-block literal was needed:**
```
libraryFileSystem, composer:registerMsgboxComposer, composer:registerAddWindowComposer,
composer:registerAddChildWindowComposer, composer:registerComposerLensCommand,
composer:registerCvsComposer, composer:registerSetOptsComposer, command:bbj.composeSetoptsInCode,
codeActions, outputChannel, fileSystemWatcher, onDidGrantWorkspaceTrust, command:bbj.config,
command:bbj.properties, command:bbj.em, command:bbj.loginEM, command:bbj.run, command:bbj.runBUI,
command:bbj.runDWC, command:bbj.compile, command:bbj.denumber, command:bbj.decompile,
command:bbj.decompileReadonly, command:bbj.configureCompileOptions, command:bbj.refreshJavaClasses,
command:bbj.showClasspathEntries, formatter, onDidChangeTabs, onDidChangeActiveTextEditor,
statusBar:100, onDidChangeDiagnostics, onDidChangeActiveTextEditor, statusBar:99,
notification:bbj/bbjcplAvailability, statusBar:98, notification:bbj/configReloadRequired,
notification:bbj/resolvedConfigPath, onDidOpenTextDocument, onDidChangeConfiguration
```
`context.subscriptions.length` after `activate()`: 32.

## Decisions Made

- Followed the plan's D-16/D-13 literals exactly; the derived activation sequence and subscription count needed no correction against the unsplit tree.
- The allow-list-suppression test (decompile.promptOnOpen false) checks both a tokenized and a plain-text file in one activation rather than two, since `maybePromptTokenized`'s config-gate check runs before any file I/O for either file — this keeps the negative assertion synchronous and non-flaky instead of needing a timing-sensitive wait for an event that never fires.
- `requirements-completed` is left empty and `REF-11` is not marked complete, per this plan's own instruction — the safety net does not itself deliver the split.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- While drafting Task 2's suppression-bar test, the shared `activeTextEditor` document object initially omitted `getText()`. Since `activate()` also wires `maybePromptLineNumbered` against every active-editor change (not just the diagnostics listener this test targets), the missing method surfaced as an unhandled promise rejection from that unrelated code path. Fixed before committing by giving that test's document a `getText()` returning ordinary (non-line-numbered) text, so it satisfies both listeners `activate()` registers on the same active editor. No plan or production-code change was needed — a test-authoring gap caught by the test run itself, not a defect in `extension.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Both characterization test files are green on the unsplit `extension.ts` and are not touched again by later plans. Plans 03 and 04 can extract `em-auth.ts`, the status-bar module and the open-prompt module against this fixed target: if either test file fails after a move, the move changed observable behaviour and needs to be reconsidered, not the test. REF-11 stays open; plan 04 is expected to mark it complete once the split itself lands.

## Self-Check: PASSED

- Both created files verified present on disk (`activation-command-coverage.test.ts`, `activation-prompts-and-status-bars.test.ts`).
- Both commits (`a2444ed7`, `c152243c`) verified present in `git log --oneline --all`.
- SUMMARY.md verified present on disk at this path.

---
*Phase: 120-classvalidator-activate-splits*
*Completed: 2026-09-29*
