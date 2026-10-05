---
phase: 125-ls-formatting
plan: 04
subsystem: language-server-formatting
tags: [langium, formatting, lsp, notifications, dedup, vitest]

requires:
  - phase: 124-interop-program-client
    provides: typed ProgramOutcome values from JavaInteropService.formatProgram and its connectionGeneration counter
  - phase: 125-ls-formatting
    provides: "plan 01: FormatterSettingsHolder.userKeyFor and revision; plan 03: BBjFormatService with the single report() landing point"
provides:
  - "One short Warning per formatting failure kind, shown once per its own scope and then logged only"
  - "Older-BBj notice ('requires BBj 26.03') once per connection generation, distinct from every not-connected text; an unreachable interop connection shows nothing"
  - "Invalid-settings warning naming every bad bbj.formatter key with an Open Settings action that sends bbj/openFormatterSettings (names only)"
  - "Mixed-numbering warning naming the line with a Go to Line action that shows the request's own document, clamped at click time"
  - "format-settings-notification.ts: the one owner of the bbj/openFormatterSettings method string, payload type and the client's settings query"
  - "FormatMessenger seam and a bounded (256) insertion-ordered notice ledger on BBjFormatService"
affects: [125-05 settings intake, 125-06 formatter wiring and VS Code client handler for bbj/openFormatterSettings, 126 DENUM offer replaces the line-numbers text]

actuals:
  tokens: 12000
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Outcome-to-notice table in one private report(): environment kinds keyed by connection generation, content kinds by uri@version, settings by revision"
    - "Notice ledger: insertion-ordered Set of kind|scope, oldest evicted when full; first sighting logs warn and shows, repeats log debug"
    - "Messenger seam with a default built on connection-free senders; every prompt started without awaiting it, onAction wrapped so a late click never rejects"
    - "Log lines carry notice kind, failure token and numeric code only; peer text and document text never reach a log"

key-files:
  created:
    - bbj-vscode/src/language/format-settings-notification.ts
    - bbj-vscode/test/bbj-format-notices.test.ts
  modified:
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/src/language/bbj-format-service.ts
    - bbj-vscode/test/document-builder.test.ts

key-decisions:
  - "Log lines for failed outcomes name the failure token and numeric code but never the peer's message: bbj-ls parser messages can quote source text, and the toasts already tell the user which output to look at"
  - "The ledger evicts when adding a new entry while already holding 256, so it remembers exactly 256 notices; the eviction test therefore formats 257 distinct documents before the first one shows again"
  - "invalid-params is a ledger notice without a toast (warn once per connection generation, debug after)"
  - "Open Settings sends every rejected key (unique, first-seen order) even when the toast lists only the first five"
  - "showFormatterWarningWithAction is a plain function returning a promise of an inner async function (never rejects), so it matches the contract signature exactly"

patterns-established:
  - "Hermetic notice tests: createBBjTestServices + fake text-document connection + a fake language-client connection whose window methods are vi.fn(), driven through the real default messenger"
  - "A recording FormatMessenger installed with setMessenger for table-style assertions"

requirements-completed: [FMT-08, FMT-09, FMT-10, FMT-11]

coverage:
  - id: D1
    description: "Against a peer without formatProgram the user sees the requires-26.03 Warning once per connection generation (concurrent formats show one, a reconnect re-arms), with text distinct from the not-connected error; unreachable or transport failures show nothing and log one debug line"
    requirement: "FMT-11"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#an older BBj without a formatter"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#an interop connection that is not reachable"
        status: pass
    human_judgment: false
  - id: D2
    description: "Timeout, too large, protected program, engine failure, service unavailable and line-numbers each show their own fixed Warning once; content kinds re-arm per document and version, environment kinds per connection generation; ledger bounded at 256 oldest-first; no document text or peer text in any toast or log level"
    requirement: "FMT-10"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#every failure kind has its own short Warning"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#a message repeats only when its own scope changes"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#what the user and the log are never shown"
        status: pass
    human_judgment: false
  - id: D3
    description: "Invalid settings name every bad bbj.formatter key (legacy spelling where the user set it), cap the list at five plus 'and N more', and Open Settings sends bbj/openFormatterSettings with the unique full key names only"
    requirement: "FMT-08"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#the invalid-settings text"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#invalid settings through the format request"
        status: pass
    human_judgment: false
  - id: D4
    description: "Mixed numbering names the line and Go to Line shows the request's own document at line-1 clamped to the live document at click time; no line gives a plain warning without an action; the format response never waits for a prompt"
    requirement: "FMT-09"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#mixed numbering through the format request"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-notices.test.ts#a prompt never holds up the format response"
        status: pass
    human_judgment: false
  - id: D5
    description: "How the warnings and the two actions look and behave in a real VS Code session against live BBj 26.03 (the mixed-numbering path cannot be reached live until the DENUM work sends the denumber permission)"
    requirement: "FMT-09"
    verification: []
    human_judgment: true
    rationale: "bbj-ls answers a mixed-numbered file with the line-numbers error unless the denumber permission is sent, so Go to Line is proven by hermetic tests only in this phase; the toast wording and the client handler for the settings notification belong to the end-of-phase hand check"

duration: 11min
completed: 2026-10-02
status: complete
---

# Phase 125 Plan 04: Formatting notices Summary

**Every formatting failure becomes one deduplicated Warning (requires-26.03 once per connection, a distinct text per kind, Open Settings via a host-neutral notification, Go to Line via showDocument) that is fire-and-forget, so a save never waits and no log or toast carries document text.**

## Performance

- **Duration:** about 11 min
- **Started:** 2026-10-02T05:34:00Z (approximate; not recorded at start)
- **Completed:** 2026-10-02T05:45:00Z
- **Tasks:** 3 (one tracer, two TDD)
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `report()` in `BBjFormatService` is now the outcome-to-notice table: `unavailable/method-not-found` shows the D-11 text once per connection generation; `unavailable/not-reachable` and `failed/transport` show nothing and log one debug line; timeout, engine failure (format failure, parser exception, malformed answer) and service unavailable are per connection generation; too large, protected, line numbers and mixed numbering are per document and version; invalid settings per settings revision; `invalid-params` is log-only (warn once, then debug).
- The notice ledger is an insertion-ordered `Set` capped at 256 that forgets its oldest entry first; the first sighting logs warn and shows, every repeat logs debug.
- Invalid settings produce `Invalid BBj formatter settings: bbj.formatter.<key>: <peer message>; ... and N more. The file was not changed.` with an Open Settings action; a click sends `bbj/openFormatterSettings` with the unique full key names (the legacy `splitSingleLineIF` spelling where that is what the user set).
- Mixed numbering produces `Mixed line numbering at line N. ...` with Go to Line; the click calls `window/showDocument` on the request's own uri with `takeFocus` and a collapsed selection at `line - 1`, clamped to the live document's line count at click time. With no line it is a plain warning with no action.
- `format-settings-notification.ts` (no imports) owns the method string, the `{ keys }` payload and the `bbj.formatter` settings query; `bbj-notifications.ts` gains four connection-free senders that are no-ops before `initNotifications`, never throw and never reject.
- 53 new tests in `bbj-format-notices.test.ts` drive the real chain from the bounded format handler through the default messenger to a fake language-client connection, including a prompt that never settles (format still answers `[]` at once) and late clicks that still act.

## Task Commits

1. **Task 1: requires-26.03 once per connection, nothing for an unreachable interop (tracer)** - `e179adca` (feat)
2. **Task 2: per-kind Warnings with scoped dedup (TDD)**
   - RED: `6f36f2b6` (test) - 23 of 32 failing: no messenger, no table
   - GREEN: `9fe8c9f6` (feat) - 53/53 across the notice and service suites
3. **Task 3: invalid settings and mixed numbering with actions (TDD)**
   - RED: `5b987300` (test) - 20 failures: no message builders, no actions
   - GREEN: `2d3fa43c` (feat) - 90/90 across the four format suites
4. **Fix: partial mock in the document builder suite** - `c56d28d2` (test), see deviations

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/language/format-settings-notification.ts` - `OPEN_FORMATTER_SETTINGS_METHOD`, `OpenFormatterSettingsParams`, `FORMATTER_SETTINGS_QUERY`
- `bbj-vscode/src/language/bbj-notifications.ts` - `showFormatterWarning`, `showFormatterWarningWithAction`, `showFormatterDocument`, `notifyOpenFormatterSettings`
- `bbj-vscode/src/language/bbj-format-service.ts` - message constants, `FormatMessenger`, default messenger, `setMessenger`, notice ledger, outcome table, `invalidSettingsMessage`, `mixedNumberingMessage`
- `bbj-vscode/test/bbj-format-notices.test.ts` - message, dedup, action, fire-and-forget and privacy tests
- `bbj-vscode/test/document-builder.test.ts` - partial notifications mock now keeps the real senders

## Decisions Made
- Log lines name the notice kind, the failure token and the numeric code only. The plan allowed appending the sanitised peer message; it is left out because bbj-ls parser messages can quote source text and the privacy gate is stricter than a diagnostic nicety. A test echoes a marker in the peer message and in the buffer and checks every logger level.
- The ledger holds exactly 256 entries and evicts when a new entry arrives while full. The behaviour line "after 256 distinct notices the first shows again" is therefore tested with 257 documents (the first is evicted by the 257th); with exactly 256 it is still remembered.
- `invalid-params` is recorded in the ledger without a toast so its warn log is once per connection generation.
- Open Settings carries all rejected keys, not only the five listed in the toast.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Document builder suite's partial mock broke on the new imports**
- **Found during:** whole-suite run after Task 3
- **Issue:** `test/document-builder.test.ts` mocks `bbj-notifications.js` with a factory exposing only `notifyBbjcplAvailability`. `bbj-format-service.ts` now imports four more senders from that module, so loading it through the module graph threw "No showFormatterWarning export is defined on the mock" and the suite failed to load (no tests ran).
- **Fix:** the mock now spreads `importOriginal()` and overrides only `notifyBbjcplAvailability`.
- **Files modified:** `bbj-vscode/test/document-builder.test.ts`
- **Verification:** the suite passes alone (7/7); whole suite afterwards shows only the known installed-extension e2e failure.
- **Committed in:** `c56d28d2`

---

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** test-only; no scope change.

The plan's executor-rules block names the commit trailer as `Claude Opus 5.5`; the orchestrator's instruction for this run specified `Claude Sonnet 5.5`, which was used on all commits.

## Issues Encountered
- A whole-suite run (`--maxWorkers=2`) reported `test/functional/installed-extension-e2e.test.ts` failing; that is the known environment case (it spawns the installed `~/.ext-test` bundle, not this branch). Everything else: 4086 tests passed, 30 skipped, after the document-builder fix.

## Known Stubs
None. The default messenger sends through the connection set by `initNotifications`; the server still does not advertise formatting (`lsp.Formatter` and the `main.ts` registration come in the next wave), so none of these messages can reach a user until then.

## Threat Flags
None beyond the plan's threat model. Mitigations present: peer names and messages reach toasts only after the interop client's sanitising, as plain text, at most five listed (T-125-16); showDocument always uses the request's own uri with a line clamped at click time, tested with uri-shaped peer data (T-125-17); the notification payload holds key names only and the contract module says hosts must not turn it into a command argument (T-125-18); ledger dedup per decided scope, bounded at 256 oldest-first (T-125-19); prompts are never awaited, tested with a never-settling prompt (T-125-20); a marker test covers every toast and every logger level (T-125-21).

## TDD Gate Compliance
Task 2: `6f36f2b6` (test) precedes `9fe8c9f6` (feat). Task 3: `5b987300` (test) precedes `2d3fa43c` (feat). Task 1 was a tracer, not TDD. Both RED runs failed for the missing behaviour (no messenger, no message builders or actions), not for test slips.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 125-06 adds the VS Code client handler for `bbj/openFormatterSettings` (opening the Settings UI with the fixed `FORMATTER_SETTINGS_QUERY`, ignoring the payload keys), switches the formatter on and removes the jar provider.
- The Settings UI filtered to `bbj.formatter` lists only declared keys until all 15 are declared; a bad value for an undeclared key shows in `settings.json` only. The message names the full key, so it stays findable.
- FMT-08..FMT-11 are declared by this plan only and are marked complete.
- Open for the end-of-phase hand check: how the toasts look in VS Code, and Go to Line against a real mixed-numbered file once the denumber permission is sent (flagged assumption D5).

## Self-Check: PASSED

- Created files exist: `format-settings-notification.ts` and `bbj-format-notices.test.ts` found on disk; the three modified files carry the changes.
- Commits `e179adca`, `6f36f2b6`, `9fe8c9f6`, `5b987300`, `2d3fa43c`, `c56d28d2` present in `git log`.
- Task acceptance greps re-run: all counts as required; the planning-identifier scan over the four source and test files prints nothing; `bbj-notifications.ts` has no `main.js` import.
- Plan verification re-run: `npx vitest run test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/bbj-formatter.test.ts` 90/90 pass; `npm run typecheck:test` and `npm run lint` clean.

---
*Phase: 125-ls-formatting*
*Completed: 2026-10-02*
