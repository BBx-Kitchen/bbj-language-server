---
phase: 127-vs-code-cut-over
plan: 01
subsystem: vscode-extension
tags: [vscode, denumber, bbj-denum, language-client, open-file-prompt, vitest]

requires:
  - phase: 125-denum-request
    provides: "the bbj/denum request, DenumParams and DenumResult in src/language/denum-command.ts, and the server-side outcome messages and in-flight guard"
provides:
  - "src/denumber-command.ts: vscode-free createDenumberCommand(deps), DenumberCommandDeps, DenumberDocument, denumberFailedMessage"
  - "bbj.denumber registered through createDenumberCommand, sending one bbj/denum request for the live buffer"
  - "registerOpenFilePrompts returns an OpenFilePrompts handle (skipLineNumberedPrompt) and the line-numbered prompt offers Denumber / Open Read-only"
affects: [127-04-bbjlst-removal, 127-05-activation-suite-mock-cleanup, 127-06-gate-and-hand-check, intellij-denumber]

actuals:
  tokens: 6700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Command logic behind a plain-stub dependency interface (no vscode import), wired with the real vscode and client functions in extension.ts"
    - "Lazily bound module-level client read when the command runs, as the in-code SETOPTS composer already does"

key-files:
  created:
    - bbj-vscode/src/denumber-command.ts
    - bbj-vscode/test/denumber-command.test.ts
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/open-file-prompts.ts
    - bbj-vscode/test/activation-prompts-and-status-bars.test.ts

key-decisions:
  - "The client words no denumber outcome: the result of bbj/denum is ignored, only a rejected request or an unopenable file produces one 'Denumber failed: ' error"
  - "No retry: the document is opened through openTextDocument first, so the server already has it when the request arrives; a retry would only repeat the server's own not-open message"
  - "Explorer invocation marks the document with skipLineNumberedPrompt before showing it, so the line-numbered prompt never appears for the file being denumbered"
  - "Command id, title, icons, Alt+N and the three menu entries are untouched and pinned by a package.json test; the activation trace and the 36 subscriptions are unchanged"

patterns-established:
  - "Wiring tests drive the real activate() with a mocked vscode and client, taking the handler from commandHandlers and asserting call order with invocationCallOrder"

requirements-completed: [DEN-02, DEN-05]

coverage:
  - id: D1
    description: "Denumber BBj Program keeps its id, title, icons, Alt+N and menus, and keeps its activation slot (trace and 36 subscriptions unchanged)"
    requirement: "DEN-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/denumber-command.test.ts#the package.json contribution points of Denumber BBj Program"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/activation-command-coverage.test.ts#the activation sequence and subscription count match the pinned base"
        status: pass
    human_judgment: false
  - id: D2
    description: "From the editor, the command sends one bbj/denum request with the open document's URI, never saves, shows nothing of its own"
    requirement: "DEN-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/activation-prompts-and-status-bars.test.ts#from the editor it sends one bbj/denum request with the document URI, shows nothing and never saves"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/denumber-command.test.ts#the Denumber command request"
        status: pass
    human_judgment: false
  - id: D3
    description: "From the Explorer on an unopened file, the command opens, shows (preview false) without the numbered-file prompt, and only then sends the request"
    requirement: "DEN-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/activation-prompts-and-status-bars.test.ts#from the Explorer on a file that is not open it opens, shows without the prompt, then sends the request"
        status: pass
    human_judgment: true
    rationale: "Whether the language server has stored the freshly opened document before the request arrives is an ordering assumption about the real client/server connection that the mocked suite cannot prove; the Explorer-on-an-unopened-file hand check in the cut-over gate plan is the empirical confirmation"
  - id: D4
    description: "No-target guard: with no argument and no BBj editor the command warns once and sends nothing; a rejected request or unopenable file gives exactly one 'Denumber failed: ' error"
    requirement: "DEN-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/denumber-command.test.ts#the Denumber command target guard"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/activation-prompts-and-status-bars.test.ts#with no target it shows the no-active-file warning and neither opens nor sends anything"
        status: pass
    human_judgment: false
  - id: D5
    description: "The line-numbered open prompt offers Denumber and Open Read-only with no replace promise; Denumber runs bbj.denumber with the document URI; detection, setting guard and the read-only branch are unchanged"
    requirement: "DEN-05"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/activation-prompts-and-status-bars.test.ts#the line-numbered-file open prompt"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-10-03
status: complete
---

# Phase 127 Plan 01: Denumber command and numbered-file prompt on bbj/denum Summary

**"Denumber BBj Program" now sends one `bbj/denum` request for the live buffer through a vscode-free `createDenumberCommand`, with the numbered-file prompt reworded to "Denumber" / "Open Read-only" and nothing on the path running bbjlst any more.**

## Performance

- **Duration:** 10 min
- **Completed:** 2026-10-03T09:30:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `createDenumberCommand(deps)` resolves the target with the existing no-target guard, opens the document, marks it so the open prompt stays quiet, shows it only when no editor already does, and sends `{ uri }`. It ignores the result, never retries and has no save or write member.
- `bbj.denumber` is registered through it in the same activation slot between `bbj.compile` and `bbj.decompile`; the pinned activation trace and the 36 subscriptions are unchanged (the coverage suite was not edited and passes).
- `registerOpenFilePrompts` returns an `OpenFilePrompts` handle; `extension.ts` keeps it in a module-level `openFilePrompts` and the command calls `skipLineNumberedPrompt(uri)` before showing a document, so Explorer and editor invocations behave the same.
- The line-numbered prompt reads `"<name>" is a line-numbered BBj program. Denumber it for editing, or open it read-only?` with `Denumber` and `Open Read-only`; client-side detection, the `denumber.promptOnOpen` guard and the read-only branch are untouched.

## Task Commits

1. **Task 1: Denumber BBj Program sends bbj/denum for the live buffer** - `9a0ea1ad` (feat)
2. **Task 2: Numbered-file prompt offers Denumber through the command** - `1a68bd23` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/src/denumber-command.ts` - the vscode-free command: target guard, open, mark, show unless visible, one request, one error on rejection
- `bbj-vscode/src/extension.ts` - `bbj.denumber` bound to `createDenumberCommand` with the real vscode and client functions; `openFilePrompts` handle
- `bbj-vscode/src/open-file-prompts.ts` - `OpenFilePrompts` handle, reworded prompt text and button, comment rewording
- `bbj-vscode/test/denumber-command.test.ts` - recording-stub behaviour suite, source guards, package.json pin
- `bbj-vscode/test/activation-prompts-and-status-bars.test.ts` - mock extended (`Uri.file`, `openTextDocument`, `visibleTextEditors`, `sendRequest`); three Denumber wiring tests; prompt tests (reworded text, Open Read-only, unnumbered file, suppressed setting)

## vscode-languageclient ordering evidence (re-read, installed 10.1.2)

- `lib/common/textSynchronization.js` line 55: `this._delayOpen = client.clientOptions.textSynchronization?.delayOpenNotifications ?? false;` and the client's options set no such value, so `didOpen` is sent from `onDidOpenTextDocument` at once.
- `lib/common/client.js` line 588: `sendRequest` awaits `this._didOpenTextDocumentFeature.sendPendingOpenNotifications();` before it sends, so a document opened by the command is announced on the connection ahead of `bbj/denum`.

The server-side dispatch order (didOpen handled before the next request) stays an assumption; the Explorer-on-an-unopened-file hand check is its empirical confirmation (coverage entry D3 carries `human_judgment: true` for this reason).

## Decisions Made

- The client words no outcome and ignores the `bbj/denum` result; only a rejection or an unopenable file yields one `Denumber failed: ` error.
- No retry, because the document is opened first and the server already has it when the request arrives.
- Explorer invocation marks the document with `skipLineNumberedPrompt` before `showTextDocument`, so the numbered-file prompt cannot appear for the file being denumbered.
- The `bbx` clause in the menu `when` expressions stays as is: it names no declared language and is unchanged by design.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Editor wiring test left `openTextDocument` unresolved**
- **Found during:** Task 1 (first run of the activation-prompts suite)
- **Issue:** the new editor-case test never gave the mocked `workspace.openTextDocument` a document, so the command hit its error path and sent nothing. The command was behaving correctly; the test setup was incomplete.
- **Fix:** the test resolves the mocked `openTextDocument` with the document.
- **Files modified:** bbj-vscode/test/activation-prompts-and-status-bars.test.ts
- **Verification:** suite green (142 tests across the six verify files)
- **Committed in:** 9a0ea1ad (part of Task 1 commit)

**2. [Process] Task 1 test-first order not followed for the tracer slice**
- **Found during:** Task 1
- **Issue:** the tracer task is marked `tdd="true"`, but the implementation was written before its tests, so no RED run was recorded for it.
- **Fix:** after the tests were green, a mutation check removed the `skipOpenPrompt` call and three tests failed (the ordered-call unit test, the already-visible unit test and the Explorer wiring test), then the line was restored. Task 2 was run test-first with a recorded RED (the reworded-text test failed against the old wording) before the GREEN change.
- **Files modified:** none beyond the plan
- **Verification:** mutation run output (3 failed / 40 passed), then full green after restore

---

**Total deviations:** 1 auto-fixed (1 test-setup bug), 1 process note
**Impact on plan:** no scope change; no source behaviour differs from the plan.

## Issues Encountered

- Two shell calls chained `cd` with `git` or `python3`/`grep` against the executor shell rules. Nothing was blocked and no state was affected; later calls used `git -C` and absolute paths.
- `.planning/REQUIREMENTS.md` was not edited (this plan's executor rules say not to), so DEN-02 and DEN-05 are listed under `requirements-completed` here but not ticked off in the requirements file; the phase gate plan owns that.

## Known Stubs

None.

## Threat Flags

None. The only new surface is the existing `bbj/denum` request carrying a document URI string, already in the plan's threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 127-02. `Commands.cjs` still carries its old denumber member (removed by the bbjlst plan once nothing references it); nothing in `extension.ts` references it any more.
- Open for the phase gate: the Explorer-on-an-unopened-file hand check (didOpen-before-request ordering on a real connection).

## Self-Check: PASSED

- FOUND: bbj-vscode/src/denumber-command.ts, bbj-vscode/test/denumber-command.test.ts
- FOUND commits: 9a0ea1ad, 1a68bd23 (both in `git log`)
- Plan verification: six-suite vitest run 142/142 passed, `npm run typecheck:test`, `npm run lint` and `npm run build` clean
- Task acceptance criteria re-run: all pass; planning-id grep over the diff and the two new files prints nothing

---
*Phase: 127-vs-code-cut-over*
*Completed: 2026-10-03*
