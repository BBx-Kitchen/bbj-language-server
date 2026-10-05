---
phase: 126-ls-denum
plan: 04
subsystem: language-server
tags: [lsp, formatting, denum, notifications, window-messages, vitest]

requires:
  - phase: 126-ls-denum
    provides: "BBjDenumService core, DenumMessenger, diagnostics list and counts message, the failure presenter (plans 01 and 03)"
  - phase: 125-ls-formatting
    provides: "BBjFormatService with its bounded notice ledger, the format failure texts, invalidSettingsMessage, OPEN_SETTINGS_ACTION"
provides:
  - "Format Document on a line-numbered file returns [] at once and raises one deduplicated Warning offering Denumber and Denumber and Format"
  - "Format Selection on a line-numbered file returns [] and raises one explanation offering Denumber only"
  - "BBjDenumService.offer and BBjDenumService.runDenumAndFormat on one orchestration core (execute) shared with run"
  - "Denumber and Format as one whole-document formatProgram call with the denumber permission, applied as one edit labelled Denumber and Format"
  - "showWarningWithActions, DenumOffer, BBjFormatService.describeInvalidSettings, the DENUMBER_* / DENUM_OFFER / DENUM_SELECTION / DENUM_AND_FORMAT constants"
affects: [126-05, 127-vscode-denum, 128-intellij-denum]

actuals:
  tokens: 15300
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "The format path only raises an offer through the existing per-kind-and-scope ledger; the offer prompt is started unawaited inside the ledger's show callback"
    - "Cross-service reads (denum offer from the format service, format settings from the denum service) happen lazily at use time, never in a constructor"
    - "One private execute(operation, ...) core; the peer call is normalised to a DENUM-shaped outcome so every guard, re-check, apply and presenter exists once"

key-files:
  created:
    - bbj-vscode/test/bbj-denum-offer.test.ts
  modified:
    - bbj-vscode/src/language/bbj-format-service.ts
    - bbj-vscode/src/language/bbj-denum-service.ts
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/test/denum-test-harness.ts
    - bbj-vscode/test/bbj-format-notices.test.ts

key-decisions:
  - "Selection explanation and document offer are two ledger kinds (denum-needed-selection, denum-needed) on the same document-and-version scope, so neither suppresses the other and an edit re-arms both; no second ledger"
  - "A combined run whose answer says denumbered false applies the formatted edit when it differs, then shows the nothing-to-denumber message with no list"
  - "A range-scoped answer to the whole-document combined request is treated as a malformed answer (formatting engine text)"
  - "-33001 parser exception and every outcome that is not formatting-specific keep the DENUM texts in a combined run; only invalid settings, size cap, format failure, malformed answer, timeout and service unavailable use the formatting texts"

patterns-established:
  - "Offer tests drive the real format handler on a mock connection plus the scripted interop double and the fake client connection, holding the window prompt with a deferred"

requirements-completed: [FMT-06, FMT-07]

coverage:
  - id: D1
    description: "Format Document on a line-numbered file returns no edits at once and shows one Warning with Denumber and Denumber and Format; the interim message is gone; the format response never waits for the prompt"
    requirement: FMT-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#Format Document on a file with line numbers"
        status: pass
    human_judgment: false
  - id: D2
    description: "Clicking Denumber acts on the buffer as it is at click time (late click on a changed buffer, closed buffer ends with the not-open Warning, dismissal sends nothing)"
    requirement: FMT-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#clicking Denumber on the offer"
        status: pass
    human_judgment: false
  - id: D3
    description: "Formatting, format-on-save included, never denumbers: no denumProgram call and no formatProgram call with the denumber permission until a click; one offer per document and version, re-armed by an edit, concurrency-safe"
    requirement: FMT-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#each offer shows once per document and version"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#a file the offer must never be raised for"
        status: pass
    human_judgment: false
  - id: D4
    description: "Format Selection explains and offers Denumber only; the explanation and the offer are independent whatever the order"
    requirement: FMT-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#Format Selection on a file with line numbers"
        status: pass
    human_judgment: false
  - id: D5
    description: "Denumber and Format is one formatProgram call (denumber permission, 15 settings, no range, no canonicalName, no denumProgram call) applied as one edit labelled Denumber and Format, with the DENUM diagnostics list and counts flow and the confirmation 'Denumbered and formatted.'"
    requirement: FMT-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#clicking Denumber and Format on the offer"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every Denumber and Format failure ends in exactly one Warning: formatting texts for formatting failures (invalid settings with Open Settings), DENUM texts for the rest; stale answers and tokenized buffers apply nothing"
    requirement: FMT-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-offer.test.ts#every way Denumber and Format can fail"
        status: pass
    human_judgment: false
  - id: D7
    description: "Denumber and Format lands as one undo step in the host editor"
    requirement: FMT-07
    verification: []
    human_judgment: true
    rationale: "Rests on the host applying one workspace/applyEdit with one TextEdit as one undo step; tests prove one edit in one request, VS Code undo is checked by hand from the built VSIX, and IntelliJ cannot reach this path until its formatting verdict"
  - id: D8
    description: "VS Code keeps a Warning with action buttons open until dismissed, so a late click is realistic"
    requirement: FMT-06
    verification: []
    human_judgment: true
    rationale: "Host UI behaviour; the late-click behaviour is identical either way and is covered by tests, the realism is checked by hand"

duration: 10min
completed: 2026-10-02
status: complete
---

# Phase 126 Plan 04: Format-time Denumber offer and Denumber and Format Summary

**A DENUM-needed answer to Format Document now returns no edits and raises one deduplicated Warning offering Denumber or Denumber and Format (Format Selection explains and offers Denumber only), and Denumber and Format is one denumber-permitted formatProgram call applied as one edit with the same diagnostics flow as a plain DENUM.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-10-02T15:32:00Z
- **Completed:** 2026-10-02T15:41:40Z
- **Tasks:** 3 (tracer, TDD, TDD)
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- The interim "Run Denumber BBj Program first" text and its constant are gone. `report()` routes a `denum-needed` failure to `offerDenum`, which goes through the existing bounded notice ledger (kinds `denum-needed` and `denum-needed-selection`, scope `uri@version`) and starts the offer unawaited, so a save never waits for the user.
- `BBjDenumService.offer(request, scope)` shows the two-button offer (document) or the single-button explanation (selection). A pick starts `run` or `runDenumAndFormat` on `request.current()` read at click time; a late click works on the buffer as it is then, and a closed buffer ends with the not-open Warning.
- `run` and `runDenumAndFormat` share one private `execute` core. The combined run sends one whole-document `formatProgram` call with `allowDenum: true`, the 15 normalized settings, no range and no canonicalName, and applies one edit labelled `Denumber and Format`. Diagnostics go to the list and the counts message like a plain DENUM, with `Denumbered and formatted.` as the base.
- Failures that come from formatting (invalid settings with Open Settings, too large, format failure, malformed answer, timeout, service unavailable) reuse the formatting texts via `BBjFormatService.describeInvalidSettings` and the 125 constants; every other outcome uses the DENUM table.
- `showWarningWithActions` is a never-rejecting multi-button prompt; `bbj-notifications.ts` still imports nothing from `main.ts` and only types from `vscode-languageserver`.

## Task Commits

1. **Task 1 (tracer): Format Document offers Denumber / Denumber and Format; Denumber click works on the buffer as it is then** - `3443b75b` (feat)
2. **Task 2 (TDD): Denumber and Format** - `705c5eab` (test, RED: 18 failing), `7a7ead55` (feat, GREEN)
3. **Task 3 (TDD): Format Selection explanation and deduplication** - `4887312d` (test)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-format-service.ts` - `DenumOffer`, optional `compiler` slice, `offerDenum`, public `describeInvalidSettings`; interim message removed
- `bbj-vscode/src/language/bbj-denum-service.ts` - `offer`, `runDenumAndFormat`, the shared `execute` core, `callPeer`, `presentFormattingFailure`, the new constants and messenger members
- `bbj-vscode/src/language/bbj-notifications.ts` - `showWarningWithActions`
- `bbj-vscode/test/bbj-denum-offer.test.ts` - 38 tests: offer, click, late click, Denumber and Format, failure rows, selection, dedup, never-offer cases, secret marker
- `bbj-vscode/test/denum-test-harness.ts` - recording messenger gains `warnWithActions` and `openFormatterSettings`; harness also returns `shared` and `textDocuments`
- `bbj-vscode/test/bbj-format-notices.test.ts` - shared fake connection; the line-numbers rows removed

## Decisions Made
- See `key-decisions` above.
- Task 3's behaviour needed no source change: the ledger scoping from Task 1 and the selection branch of `offer` already satisfied every behavior line, so Task 3 is a tests-only commit.

## Deviations from Plan

**1. [Process] Commit trailer** - The plan text names `Claude Opus 5.5`; the orchestrator's instructions for this run specify `Claude Sonnet 5.5`, which every commit carries.

**2. [Process] Task 3 has no RED commit** - Every Task 3 behavior already held after Tasks 1 and 2 (the same ledger and `offer` selection branch), so the new tests passed on first run. They were still written against the behavior list; one wording fix to a test name and one assertion was made before committing.

**3. [Process] Extra harness members** - `createDenumHarness` also returns `shared` and `textDocuments` so the offer suite can register the real format handlers and call `runDenumAndFormat` directly; no source file changed for this.

**Total deviations:** 3 process notes, no behaviour deviations. **Impact:** none on scope.

## Issues Encountered
- One test of mine queued a stray prompt answer before the offer, so the offer consumed it instead of the held prompt; fixed in the test (no source impact).

## Known Stubs
None.

## Threat Flags
None. The format-request, click and bbj-ls boundaries are those in the plan's threat model (T-126-16 to T-126-20); each mitigation has a test (no permission or denumProgram from the format path, late-click and closed-buffer tests, never-settling prompt test, ledger repeat/re-arm/concurrency tests, secret-marker test).

## Flagged assumptions (carried forward)
- One undo step in the host rests on one `workspace/applyEdit` with one `TextEdit` being one undo step; tests prove one edit in one request. VS Code undo and the "warning stays open until dismissed" assumption are hand checks on the built VSIX (see coverage D7, D8). Dismissing the offer and running Format Document again without an edit shows nothing (one offer per document and version); this is expected.

## Next Phase Readiness
Ready for 126-05 (live DENUM cases in `program-live.test.ts` and the phase record). The offer and Denumber and Format are in place on the server; the IntelliJ side has no handler for the diagnostics notifications yet.

## Verification Run
- `npx vitest run test/bbj-denum-offer.test.ts test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/bbj-formatter.test.ts test/bbj-denum-service.test.ts test/bbj-denum-outcomes.test.ts test/denum-command.test.ts`: 8 files, 232 tests, all passed
- `npm run typecheck:test`: clean; `npm run lint`: clean (max-warnings 0)
- Whole suite (`npx vitest run --maxWorkers=2`): 197 files passed, 4292 tests passed, 30 skipped; the only failing suite is `test/functional/installed-extension-e2e.test.ts` (spawns the installed `~/.ext-test` bundle, not this branch), the known baseline
- All task `<acceptance_criteria>` grep checks pass, including no planning identifiers in source or test comments and no `Run Denumber BBj Program first` anywhere under `bbj-vscode/src`, `bbj-vscode/test`, `documentation` or `QA`

## Self-Check: PASSED

`bbj-vscode/test/bbj-denum-offer.test.ts` exists; commits `3443b75b`, `705c5eab`, `7a7ead55`, `4887312d` are in `git log`.
