---
phase: 126-ls-denum
plan: 05
subsystem: testing
tags: [vitest, live-interop, denum, formatProgram, intellij, gates]

requires:
  - phase: 126-ls-denum
    provides: "BBjDenumService run / runDenumAndFormat / offer, the bbj/denum request and the DENUM notifications (plans 01-04)"
provides:
  - "live DENUM, Denumber and Format and offer cases through the production services (7 tests)"
  - "gate results for the final tree: whole vitest suite, lint, typecheck:test, build, IntelliJ cleanTest test, planning-id register check"
  - "IntelliJ DENUM notes and the hand-check list"
affects: [intellij-denum, verification]

actuals:
  tokens: 2762
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "recordingDenumMessenger: a DenumMessenger that records every call and resolves applyEdit true, for driving the production service without a client"

key-files:
  created: []
  modified:
    - bbj-vscode/test/functional/program-live.test.ts

key-decisions:
  - "No source file changed; every gate passed on the first run, so there was nothing to fix in an earlier plan"

requirements-completed: [DEN-01, DEN-03, DEN-04, FMT-06, FMT-07]

duration: 10min
completed: 2026-10-02
status: complete
---

# Phase 126 Plan 05: Live DENUM proof and phase gates Summary

**Seven live tests prove Denumber, Denumber and Format and the Format Document offer against BBj 26.03 through the production services, and every phase gate (4259 vitest tests, lint, typecheck:test, build, 1165 IntelliJ tests) passes on the final tree.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-10-02T15:37Z (approximate)
- **Completed:** 2026-10-02T15:47Z
- **Tasks:** 2 (one tracer, one gate run)
- **Files modified:** 1

## Accomplishments

- Live cases in `program-live.test.ts` run `services.BBj.compiler.BBjDenumService` and `BBjFormatService` against the peer on 127.0.0.1:5008 with a recording `DenumMessenger`.
- All phase gates were run in the foreground on the final tree and passed; no source file changed.
- The IntelliJ notes and the hand-check list are recorded below.

## Task Commits

1. **Task 1: live DENUM, Denumber and Format and offer cases** - `fe5e9483` (test)
2. **Task 2: phase gates and records** - no commit (the task changes no file; results are recorded here)

**Plan metadata:** the docs commit that carries this file.

## Live results (Task 1)

The peer answered; the new tests were reported passed, not skipped. The file reported 17 passed (17), 0 failed. Every `program-live:` line the run printed:

```
program-live: idle small denum (client) median=43ms runs=[43, 43, 43]
program-live: idle large parse (client) median=240ms runs=[240, 263, 225]
program-live: (a) small denum behind a pending parse, same raw connection median=203ms runs=[203, 254, 199]
program-live: (b) small denum behind a pending parse, dedicated lane median=3ms runs=[3, 3, 3]
program-live: (c) idle small parse median=83ms runs=[83, 84, 83]
program-live: (c) small parse while a large denum runs median=43ms runs=[45, 42, 43]
program-live: cancel honoured=yes code=-32800 ms=3
program-live: client cancel outcome=cancelled ms=0
program-live: format service first edits=1 second edits=0
program-live: mixed-numbered file without denumber permission kind=failed failure=denum-needed
program-live: first format on a fresh program connection median=10ms runs=[13, 10, 9]
program-live: denumber numbered status=denumbered reason=none
program-live: denumber unnumbered status=not-line-numbered reason=none
program-live: denumber mixed status=failed reason=mixed-numbering line=1
program-live: denumber tokenized status=failed reason=tokenized
program-live: denumber syntax error status=denumbered diagnostics=[{"line":1,"originalLineNumber":"0010","severity":"ERROR","message":"syntax error"}]
program-live: denumber and format status=denumbered reason=none calls=1
program-live: offer edits=0 offers=1
```

The first eleven lines are the earlier tests of the file (unchanged); the last seven are this plan's.

What each new test established:

- **numbered:** one `applyEdit` labelled `Denumber` at version 1; the applied text contains `L10` and has no line starting with four digits and a space; the one info is `Denumbered.`.
- **unnumbered `print 1`:** `not-line-numbered`, no `applyEdit`, info `This file has no line numbers. Nothing to denumber.`.
- **mixed `0010 print 1` / `print 2`:** `failed` / `mixed-numbering`, result `line` 1 (zero-based; one-based line 2), one `warnWithAction` with `Mixed line numbering at line 2. The file was not changed.` and `Go to Line`, no edit.
- **tokenized `<<bbj>>abc`:** `failed` / `tokenized`; spies on the interop service's `denumProgram` and `formatProgram` recorded no call.
- **syntax error:** the text from the plan (`0010 if then` / `0020 print 1`) was accepted by the peer as is, so no other text was needed. Result `denumbered` with one ERROR diagnostic (line 1, original `0010`, `syntax error`), one `denumDiagnostics` call carrying it, and one `warnWithAction` starting `Denumbered. ` with action `Show`.
- **Denumber and Format:** exactly one `formatProgram` call, `allowDenum` true, no `canonicalName`, `denumProgram` never called; one `applyEdit` labelled `Denumber and Format`; applied text contains `L10` and no numbered line; info `Denumbered and formatted.`.
- **offer:** `BBjFormatService.format` on a numbered document returned `[]` (the peer answered code -33006, logged as `Format notice: denum-needed`), nothing reached the format messenger, and the denum messenger received one `warnWithActions` with the offer text and `['Denumber', 'Denumber and Format']`, no edit.

## Gate results (Task 2)

| Gate | Command | Result |
|------|---------|--------|
| Whole vitest suite | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | Test Files: 1 failed, 192 passed, 5 skipped (198). Tests: 4259 passed, 0 failed, 70 skipped (4329). The one failed file is `test/functional/installed-extension-e2e.test.ts` (suite-level failure `No document found for URI .../examples/issue475-setopts-in-code.bbj`, the known environment failure: it spawns the installed `~/.ext-test` bundle, not this branch; 15 of its 34 tests skipped). Exit 1 comes from that suite only. |
| Lint | `npm run lint` (`eslint ... --max-warnings 0`) | exit 0, no problem reported |
| Typecheck | `npm run typecheck:test` | exit 0, 0 `error TS` lines |
| Build | `npm run build` | exit 0 (`tsc -b` and esbuild) |
| IntelliJ | `./gradlew cleanTest test` in `bbj-intellij` | `BUILD SUCCESSFUL`; XML reports: 1165 tests, 0 failures, 0 errors, 0 skipped; `ComposerRequestContractTest` 4 tests, 0 failures |
| Register check | diff from the commit that added the phase plans to HEAD over `bbj-vscode/src` and `bbj-vscode/test`, grep of added lines for D-NN / DEN- / FMT- / "plan N" / "phase 1NN" / CR- / WR- | printed nothing (exit 0 of the negated grep) |
| Source untouched | `git status --porcelain -- bbj-vscode/src` | printed nothing |

No failing test was relabelled as environment noise: the whole suite has zero failed tests, and the single failed file is the one the baseline names; a base-commit comparison was therefore not needed.

## For the IntelliJ DENUM work

1. **Edit application and version.** LSP4IJ 0.21.0 applies `workspace/applyEdit` inside one write command (`WriteCommandAction.runWriteCommandAction`), so a DENUM edit is one undo step there. It never reads the edit's document version and always answers `applied: true`. On IntelliJ the server's own version re-check immediately before it sends `workspace/applyEdit` is therefore the only stale-buffer guard (on VS Code the client additionally refuses an edit computed for an older version and the user sees the not-applied Warning). This is the accepted threat T-126-21.
2. **Threading.** The IntelliJ action must send `bbj/denum` off the UI thread: the edit is applied on the UI thread while the request is still open, and a `WriteCommandAction` called from a non-UI thread is assumed to wait for the UI thread, so blocking the UI thread on the answer would deadlock against the server's own `workspace/applyEdit`. This and the next assumption are research assumptions, not observed here; they stay flagged.
3. **didChange timing.** It is assumed (unobserved) that LSP4IJ sends `didChange` right after each edit, so the window between the server's re-check and the client applying the edit is about one round trip.
4. **Notification contract.** `bbj/denumDiagnostics` carries `uri` plus a list of entries with `line`, `originalLineNumber`, `severity` and `message`; `bbj/showDenumDiagnostics` carries nothing. The IntelliJ renderer arrives with the IntelliJ DENUM work.

## The unhandled-notification answer

LSP4J 1.0.0 answers a notification it has no handler for by logging an "Unsupported notification method" line and returning; no error balloon. In this phase IntelliJ has no caller of `bbj/denum` and formatting is switched off there, so neither `bbj/denumDiagnostics` nor `bbj/showDenumDiagnostics` can reach it. `ComposerRequestContractTest` only checks that the requests IntelliJ declares exist in the TypeScript sources, so the new server-side `bbj/denum` cannot break it (it passed, 4 tests).

## Hand check (for the user, on the built VSIX and IntelliJ zip, live BBj 26.03)

Build both distributables from the final tree after the code-review fixes and install them. The list is the plan's human-check, with these notes:

- VS Code, line-numbered file: Format Document returns at once and shows one Warning with `Denumber` and `Denumber and Format`. Dismissing the offer and running Format Document again without an edit shows nothing (one offer per document and version, by decision); after an edit it shows again.
- `Denumber` replaces the buffer (unsaved edits included), the tab stays dirty, `Denumbered.` appears, one Ctrl+Z restores the numbered text. `Denumber and Format` does both in one step, `Denumbered and formatted.` appears, one Ctrl+Z restores the numbered original.
- Format Selection on a numbered file explains that a selection needs a file without line numbers and offers only `Denumber`; format-on-save on a numbered file never blocks the save and offers once per edit.
- A numbered file with a syntax error, denumbered, shows `Denumbered. 1 error.` (or the matching counts) as a Warning with `Show`; `Show` reveals the `BBj` output with a header naming the file and one line per entry; a clean file shows only `Denumbered.` and writes no block.
- A mixed-numbered file gets the offer; `Denumber` then shows the mixed-numbering message naming the line and `Go to Line` jumps there. An unnumbered file formats normally with no offer.
- With the offer open, edit the buffer, then click `Denumber`: the current text is denumbered. With the offer open, stop BBjServices, then click `Denumber`: `BBjServices is not reachable. The file was not changed.` appears once and no other popup.
- IntelliJ (plugin zip from the final tree): open line-numbered and unnumbered BBj files; no formatting is offered, no error balloon appears, and idea.log shows no exception mentioning `bbj/denumDiagnostics` or `bbj/showDenumDiagnostics`.
- The tokenized and protected DENUM messages cannot be reached from the VS Code UI until the Denumber command moves onto `bbj/denum`, so they rest on the hermetic tests and the live tokenized case here (a protected program could not be produced against the live peer).

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written. (The plan told the commit trailer to name Claude Opus 5.5; the task prompt's trailer, `Claude Sonnet 5.5`, was used as the more specific instruction.)

## Issues Encountered

None. The whole-suite exit code is 1 because of the known `installed-extension-e2e` suite, as the plan expects.

## Known Stubs

None.

## Threat Flags

None - the plan adds tests only.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 126 plans are complete; the remaining step is the end-of-phase hand check above (VSIX and IntelliJ zip against live BBj 26.03) and phase verification.
- The two flagged research assumptions (LSP4IJ didChange timing, `WriteCommandAction` thread wait) stay open for the IntelliJ DENUM work.

## Self-Check: PASSED

- `bbj-vscode/test/functional/program-live.test.ts`: FOUND, modified; commit `fe5e9483` present in `git log`.
- Acceptance greps: `BBjDenumService` 7 (at least 3), `runDenumAndFormat` 1 (at least 1), `recordingDenumMessenger` 8 (at least 2), planning-id grep over the file prints nothing.
- Verify command passed (17 of 17, new tests not skipped); all four automated gate commands passed as stated; `git status --porcelain -- bbj-vscode/src` printed nothing.

---
*Phase: 126-ls-denum*
*Completed: 2026-10-02*
