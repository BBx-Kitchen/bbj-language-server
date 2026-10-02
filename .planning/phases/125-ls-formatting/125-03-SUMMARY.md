---
phase: 125-ls-formatting
plan: 03
subsystem: language-server-formatting
tags: [langium, formatting, lsp, bounded-handler, interop, vitest]

requires:
  - phase: 124-interop-program-client
    provides: JavaInteropService.formatProgram returning a typed, validated ProgramOutcome
  - phase: 125-ls-formatting
    provides: "plan 01: FormatterSettingsHolder, minimalLineEdit, rangeFormatEdits"
provides:
  - "BBjFormatService: whole-document and selection format requests become minimal line edits, with stale, cancel, tokenized and document-kind guards"
  - "Bounded document and range formatting handlers that read the open buffer only and never wait for the workspace"
  - "BBjFormatter: Langium Formatter over the same service, on-type formatting never offered"
  - "compiler.BBjFormatService DI slot (lsp.Formatter and the main.ts registration deliberately not added yet)"
  - "Test double that records formatProgram requests and can hold an answer until the test releases it"
affects: [125-04 format notices, 125-05 settings intake, 125-06 formatter wiring and VS Code cut-over]

actuals:
  tokens: 12000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Request carries a live-buffer lookup (current()) read after the async call, so a stale answer is dropped by version"
    - "Selection requests use canonicalName = path + #range:start-end so they never supersede a whole-document format in bbj-ls"
    - "Positive language-id allow-list in the handler and in the Langium adapter, before any interop call"
    - "Log lines carry outcome kinds and fixed tokens only, passed as plain strings so a test can read them"

key-files:
  created:
    - bbj-vscode/src/language/bbj-format-service.ts
    - bbj-vscode/src/language/bbj-formatting-handler.ts
    - bbj-vscode/src/language/bbj-formatter.ts
    - bbj-vscode/test/bbj-format-service.test.ts
    - bbj-vscode/test/bbj-formatting-handler.test.ts
    - bbj-vscode/test/bbj-formatter.test.ts
  modified:
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/test/bbj-test-module.ts

key-decisions:
  - "The shared handler body is one private function taking an optional range, so the document and range handlers cannot drift apart on their gates"
  - "The tokenized-program prefix check sits in the service (before any params are built) rather than the handler, so the Langium adapter gets it too"
  - "A cancelled caller token is checked before the stale-version check; both give [] with a debug line only"
  - "The double's pending script is a recursive variant that settles to a resolved script; the resolved variants get their own exported type so scriptedProgramOutcome keeps an exhaustive final branch"

patterns-established:
  - "Hermetic format tests: createBBjTestServices + listenOnFakeConnection + a fake connection whose registration mocks hand back the registered handler"

requirements-completed: [FMT-01, FMT-02, FMT-03, FMT-04, FMT-05, FMT-12, SET-02]

coverage:
  - id: D1
    description: "A whole-document format of an open BBj buffer reaches the interop client with the buffer text, version string, file path and the 15 normalized settings (never the denumber permission, never the editor formatting options) and comes back as one minimal line edit; identical output gives no edit"
    requirement: "FMT-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-service.test.ts#whole-document format through the bounded handler"
        status: pass
    human_judgment: false
  - id: D2
    description: "Format Selection sends the range and a range-suffixed name, accepts bbj-ls's snapped edit at its own range trimmed to differing lines, and never shares a name with a whole-document request"
    requirement: "FMT-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-service.test.ts#format selection"
        status: pass
    human_judgment: false
  - id: D3
    description: "The handler answers from the open buffer while the workspace-ready promise never settles and no document wait is started; config, plain text, unopened and tokenized documents are never sent"
    requirement: "FMT-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-formatting-handler.test.ts#with the real services"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-service.test.ts#tokenized programs"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cancellation (caller token, cancelled outcome, peer-superseded) is silent; an answer for an edited or closed document is dropped"
    requirement: "FMT-05"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-service.test.ts#cancellation"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-service.test.ts#an answer for an older version is dropped when the document was edited meanwhile"
        status: pass
    human_judgment: false
  - id: D5
    description: "BBjFormatter answers document and range formatting through the same service and gates, returns no on-type edits and advertises no on-type options"
    requirement: "FMT-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-formatter.test.ts#BBjFormatter"
        status: pass
    human_judgment: false
  - id: D6
    description: "Which statements a selection snaps to in live BBj 26.03, and that no formatting log line carries document text in a real session"
    requirement: "FMT-02"
    verification: []
    human_judgment: true
    rationale: "Snapping is decided by bbj-ls and accepted as returned; the phase flags it for a hand check in VS Code against live BBj once the formatter is wired in the cut-over plan"

duration: 14min
completed: 2026-10-02
status: complete
---

# Phase 125 Plan 03: Format service, bounded handlers and Langium formatter adapter Summary

**A bounded document and selection format path that sends the open buffer plus 15 explicit settings to bbj-ls and returns minimal line edits, dropping stale, cancelled, tokenized and non-BBj requests without a warning, registered as `compiler.BBjFormatService` but not yet advertised.**

## Performance

- **Duration:** about 14 min
- **Started:** 2026-10-02T04:57:30Z (approximate; not recorded at start)
- **Completed:** 2026-10-02T05:12:00Z
- **Tasks:** 3 (one tracer, two TDD)
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments
- `BBjFormatService.format` captures version and text before the call, builds params with `canonicalName` equal to the file path, the 15 normalized settings and no `allowDenum`, and re-reads the live buffer after the call; an edited or closed document, a cancelled caller or a cancelled outcome gives `[]` with debug logging only. Identical output gives `[]`.
- Selection requests send `range` copied field by field and `canonicalName = <path>#range:<startLine>-<endLine>`, so they never cancel a pending whole-document format. bbj-ls's snapped edit is accepted at its own range (not clipped to the selection) and trimmed to the lines that differ.
- `bbj-formatting-handler.ts` answers from the open-document store only: no workspace-ready wait, no document wait, no disk lookup (a real-services test replaces the ready promise with a never-settling one and spies the document wait). A positive `bbj` language-id allow-list gives `[]` for config, plain text and unopened documents before any interop call.
- A buffer starting with `<<bbj>>` gives `[]` with no interop call.
- `BBjFormatter` implements Langium's `Formatter` over the same service; `formatDocumentOnType` returns `[]` and `formatOnTypeOptions` is `undefined`.
- `JavaInteropTestService` now records a copy of every `formatProgram` request (`formatProgramCalls`) and supports a `{ pending: Promise<script> }` script variant, which made the stale, closed, cancel and concurrency races testable.

## Task Commits

1. **Task 1: whole-document path, handler, DI slot, test double (tracer)** - `64a91dfc` (feat)
2. **Task 2: selection, cancellation, gates (TDD)**
   - RED: `14ca0553` (test) - 13 failures: no range path, no range handler, no tokenized check
   - GREEN: `00af73fb` (feat) - 33/33 pass across the two suites
3. **Task 3: Langium formatter adapter (TDD)**
   - RED: `aceadb6c` (test) - suite failed at import, module absent
   - GREEN: `43b4c435` (feat) - 57/57 pass across the four plan suites

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-format-service.ts` - format policy: params, outcome to edits, stale and cancel guards, settings holder, tokenized check
- `bbj-vscode/src/language/bbj-formatting-handler.ts` - bounded document and range handlers and their registration
- `bbj-vscode/src/language/bbj-formatter.ts` - Langium `Formatter` adapter
- `bbj-vscode/src/language/bbj-module.ts` - `compiler.BBjFormatService` slot only
- `bbj-vscode/test/bbj-test-module.ts` - `formatProgramCalls`, pending script variant, optional token parameter
- `bbj-vscode/test/bbj-format-service.test.ts`, `bbj-formatting-handler.test.ts`, `bbj-formatter.test.ts` - 27 service, 10 handler and 4 adapter tests (hermetic)

## Decisions Made
- One private function holds the handler gates and takes an optional range, so document and range handlers share them by construction.
- The tokenized-prefix check lives in the service, so both the handlers and the Langium adapter get it.
- Caller cancellation is checked before the stale check; both give `[]` with a debug line only.
- The double's script type was split into a resolved variants type plus the recursive pending variant, keeping the final branch of `scriptedProgramOutcome` exhaustive.

## Deviations from Plan

None - plan executed exactly as written.

Two small notes, neither a deviation from the plan's behavior:
- The plan's executor-rules block names the commit trailer as `Claude Opus 5.5`; that was used on all five commits, as the orchestrator's instruction for this run also specified.
- Task 3's config-document test opens the buffer at a `.bbj` uri with the config language id, because `LangiumDocumentFactory.fromTextDocument` needs an extension the service registry knows. The handler test with real services does use `file:///ws/config.bbx`, as planned. The gate under test is the language id in both cases.

## Issues Encountered
- Logger spies installed before the harness picked up unrelated startup `info` lines (the Javadoc provider's initialization message), so the spies are now installed after the harness is built. A test-ordering fix, not a product change.

## Known Stubs
None. `report` for non-ok outcomes logs one debug line by design; user-facing messages are the next plan's work. `lsp.Formatter` and the `main.ts` registration are intentionally absent until the cut-over plan, so the server does not advertise formatting yet.

## Threat Flags
None beyond the plan's threat model. Mitigations present: open-buffer lookup only (T-125-09), language-id allow-list with zero-call tests (T-125-10), version and text captured before and live version re-read after (T-125-11), no workspace or document wait in the handler (T-125-12), positions from the document via the plan 01 helpers (T-125-13), log lines with kinds and fixed tokens only plus a marker test at every logger level (T-125-14), denumber permission never set and asserted absent for whole-document and range requests (T-125-15).

## TDD Gate Compliance
Task 2: `14ca0553` (test) precedes `00af73fb` (feat). Task 3: `aceadb6c` (test) precedes `43b4c435` (feat). Task 1 was a tracer, not TDD. RED reasons were the missing behavior (range path, range handler, tokenized check, absent module), not import or syntax slips in the tests themselves, apart from the Task 3 module-absent case, which is the expected reason for a new module.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 125-04 can add `report` user messages and `setMessenger` on `BBjFormatService`; the outcome kinds are already routed through one private method.
- Plan 125-05 can feed `BBjFormatService.setSettings` from initialization options and configuration changes.
- Plan 125-06 adds `lsp.Formatter: BBjFormatter` in `bbj-module.ts` and calls `registerBoundedFormattingHandler(connection, shared, BBj)` in `main.ts` after `startLanguageServer`.
- The shared requirements (FMT-01..05, FMT-12, SET-02) are declared by later plans too, so they are not marked Complete in REQUIREMENTS.md by this plan.
- Open for the end-of-phase hand check: selection snapping against live BBj 26.03 (flagged assumption D6).

## Self-Check: PASSED

- Created files exist: the three source modules, the three test files and the modified module and test double were found on disk.
- Commits `64a91dfc`, `14ca0553`, `00af73fb`, `aceadb6c`, `43b4c435` present in `git log`.
- Plan verification re-run: `npx vitest run test/bbj-formatter.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/java-interop-program-test-double.test.ts` 57/57 pass; `npm run typecheck:test` and `npm run lint` clean; `bbj-module.ts` has `BBjFormatService` and no `Formatter:` or `BBjFormatter`; `main.ts` unchanged; planning-identifier scan over all source and test files prints nothing; the disk-loading and workspace-wait name scan over the handler file prints 0.

---
*Phase: 125-ls-formatting*
*Completed: 2026-10-02*
