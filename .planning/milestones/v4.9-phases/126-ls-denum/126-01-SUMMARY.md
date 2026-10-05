---
phase: 126-ls-denum
plan: 01
subsystem: language-server
tags: [lsp, denum, bbj-ls, workspace-applyEdit, custom-request, vitest]

requires:
  - phase: 124-interop-client
    provides: "JavaInteropService.denumProgram with typed ProgramOutcome results and the validated DenumProgramResult"
  - phase: 125-ls-formatting
    provides: "minimalLineEdit, TOKENIZED_PROGRAM_PREFIX, the connection-free notification senders and the open-document formatting gate"
provides:
  - "bbj/denum custom request: denumbers the open buffer, applies one versioned edit itself and shows one message"
  - "BBjDenumService.run, the one DENUM orchestration core (capture, call, re-check, edit, apply, message)"
  - "Closed DENUM failure-reason vocabulary and plain-JSON DenumResult for both IDEs"
  - "Host-neutral diagnostics notification contract (bbj/denumDiagnostics, bbj/showDenumDiagnostics)"
  - "showInformation and applyDocumentEdit connection-free senders"
  - "Hermetic DENUM test harness, fake server connection and a recording denumProgram double"
affects: [126-02, 126-03, 126-04, 126-05, 127-vscode-denum, 128-intellij-denum]

actuals:
  tokens: 14200
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Server-presents-and-applies: the server shows every outcome and applies the edit; clients only send the request"
    - "Capture version and text as primitives, re-read the live document after the await, drop stale answers"
    - "Per-document in-flight Set released in finally; no canonicalName so bbj-ls never supersedes one run with another"

key-files:
  created:
    - bbj-vscode/src/language/denum-command.ts
    - bbj-vscode/src/language/denum-notifications.ts
    - bbj-vscode/src/language/bbj-denum-service.ts
    - bbj-vscode/test/fake-server-connection.ts
    - bbj-vscode/test/denum-test-harness.ts
    - bbj-vscode/test/denum-command.test.ts
    - bbj-vscode/test/bbj-denum-service.test.ts
  modified:
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/test/bbj-test-module.ts

key-decisions:
  - "The edit is applied by the server through a versioned TextDocumentEdit in documentChanges, after the live version is re-checked; the client's own version check is only a second line of defence"
  - "DENUM requests never carry canonicalName, so bbj-ls cannot supersede one run with another; overlap is handled by a per-document in-flight guard that answers in-progress at once"
  - "The language allow-list (bbj only) and the open-document lookup run before the text is read for sending, so config and plain-text documents never leave the server"
  - "Cancellation ends silently with reason cancelled; every other ending shows exactly one message and DENUM messages are never routed through the formatting notice ledger"

patterns-established:
  - "Failure vocabulary as a const tuple plus derived union, with a rename warning, for IntelliJ to match on"
  - "Import-free contract module for pushed notifications (method constants and DTOs only)"

requirements-completed: [DEN-01]

coverage:
  - id: D1
    description: "bbj/denum denumbers the open buffer through bbj-ls and the server applies it as one versioned minimal edit with one Denumbered. message"
    requirement: DEN-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/denum-command.test.ts#bbj/denum on a numbered open buffer"
        status: pass
    human_judgment: false
  - id: D2
    description: "Malformed requests and closed or non-BBj documents end with one Warning and never reach bbj-ls; tokenized text is never sent"
    requirement: DEN-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/denum-command.test.ts#bbj/denum requests that must not reach bbj-ls"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-service.test.ts#what is sent to bbj-ls"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stale, refused, overlapping, cancelled and failed runs never apply an edit to another version and each ends as decided"
    requirement: DEN-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-service.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The result carries DENUM diagnostics in the host-neutral four-field shape and is plain JSON"
    requirement: DEN-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/denum-command.test.ts#the bbj/denum result"
        status: pass
    human_judgment: false
  - id: D5
    description: "Edit positions are correct for a CRLF buffer with astral characters"
    requirement: DEN-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-service.test.ts#the edit"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-10-02
status: complete
---

# Phase 126 Plan 01: bbj/denum Server Core Summary

**`bbj/denum` denumbers the open buffer through bbj-ls and applies the result itself as one versioned minimal-line edit, with stale, refused, overlapping, cancelled, tokenized and non-BBj cases each ending in one decided message.**

## Performance

- **Duration:** about 8 min
- **Started:** 2026-10-02T15:17:00Z
- **Completed:** 2026-10-02T15:25:00Z
- **Tasks:** 3
- **Files modified:** 11 (7 created, 4 modified)

## Accomplishments
- A client sends `bbj/denum` with a uri; the server reads the open buffer, calls `denumProgram`, re-checks the version, builds one `minimalLineEdit` and applies it through `workspace/applyEdit` as a `TextDocumentEdit` carrying the version it was computed for, then shows `Denumbered.`.
- Every failure path (invalid params, not open or not BBj, tokenized, stale, not applied, in progress, DENUM failed) shows exactly one Warning; cancellation is silent; nothing is ever written to disk.
- The result is plain JSON with `status`, `reason` from a closed 16-value vocabulary, `message`, `version`, `edits`, `diagnostics` (four-field host-neutral copy) and `applied`.
- The notification contract for the diagnostics list (`bbj/denumDiagnostics`, `bbj/showDenumDiagnostics`) exists as an import-free module for plans 126-02 and 126-03.

## Task Commits

1. **Task 1: tracer, bbj/denum applies a denumbered edit and shows "Denumbered."** - `7d062950` (feat)
2. **Task 2: guards and diagnostics (TDD)** - `0696bc41` (test, RED), `b780dd60` (feat, GREEN)
3. **Task 3: stale/refused/overlap/cancel/encoding guards (TDD)** - `2dee6949` (test, RED), `8afeba5b` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/language/denum-command.ts` - the `bbj/denum` method, DTOs, closed reason vocabulary, handler factory and registration
- `bbj-vscode/src/language/denum-notifications.ts` - import-free diagnostics notification contract
- `bbj-vscode/src/language/bbj-denum-service.ts` - the DENUM orchestration core, message constants and the default messenger
- `bbj-vscode/src/language/bbj-notifications.ts` - `showInformation` and the versioned `applyDocumentEdit` sender
- `bbj-vscode/src/language/bbj-module.ts` - `compiler.BBjDenumService` DI slot
- `bbj-vscode/src/language/main.ts` - `registerDenumRequest` right after `registerCompileRequest`, before `startLanguageServer`
- `bbj-vscode/test/fake-server-connection.ts`, `denum-test-harness.ts` - shared hermetic helpers
- `bbj-vscode/test/bbj-test-module.ts` - `denumProgramCalls` recording and a token parameter on the double's `denumProgram`
- `bbj-vscode/test/denum-command.test.ts`, `bbj-denum-service.test.ts` - end-to-end and guard suites

## Decisions Made
- A `denumbered: true` answer whose text equals the buffer yields an empty edit list; the apply is skipped, `Denumbered.` is shown and `applied` is `false`. This cannot happen against a real peer (an unchanged text answers `denumbered: false`) but the case is handled without calling `workspace/applyEdit` with an empty edit.
- The service claims its in-flight slot by the open document's own uri after the tokenized check, so a tokenized buffer never occupies a slot and is rejected before any network call.
- Failure outcomes of the interop client (timeout, unavailable, mixed numbering, ...) all map to `denum-failed` for now, in the single private `presentFailure`; the next plan splits them into their own reasons and texts in that method.

## Deviations from Plan

**1. [Rule 3 - Blocking/criterion] `applyDocumentEdit` declared as a non-async function**
- **Found during:** Task 1 acceptance criteria
- **Issue:** The criterion greps for the literal `export function applyDocumentEdit`; the first draft was `export async function`.
- **Fix:** Declared as `export function applyDocumentEdit(...): Promise<boolean>` returning an inner async closure, same behaviour (never rejects).
- **Files modified:** `bbj-vscode/src/language/bbj-notifications.ts`
- **Commit:** `7d062950`

**2. [Process] Commit trailer** - The plan text names `Claude Opus 5.5`; the orchestrator's instructions for this run specify `Claude Sonnet 5.5`, which every commit carries.

**3. [Process] TDD RED strength** - In Task 2 most of the new tests passed against the Task 1 implementation (the guards already existed); RED failed on the missing notification contract module only. In Task 3 one test failed in RED (the same-document overlap, which hangs without the guard); the rest pinned behaviour already provided by Task 1.

**Total deviations:** 1 auto-fixed (criterion wording), 2 process notes. **Impact:** none on behaviour or scope.

## Issues Encountered
None. `.planning/STATE.md` was already dirty and `.planning/milestone.lock` untracked before this plan started; both were left to the orchestrator and the state commands.

## Known Stubs
None.

## Threat Flags
None. The new request surface (`bbj/denum`, a client-supplied uri) and the server-initiated `workspace/applyEdit` are the ones named in the plan's threat model (T-126-01 to T-126-06), each mitigated and covered by a test.

## Next Phase Readiness
Ready for 126-02 (VS Code renders the diagnostics notifications into the BBj output channel) and 126-03 (per-outcome reasons, texts and the success-with-counts message inside `presentFailure` and the success path). The `DenumMessenger` interface still has only `info`, `warn` and `applyEdit`; 126-03 extends it.

## Verification Run
- `npx vitest run test/denum-command.test.ts test/bbj-denum-service.test.ts test/java-interop-program-test-double.test.ts test/setopts-in-code-request.test.ts test/bbj-format-notices.test.ts`: 5 files, 138 tests, all passed
- `npm run typecheck:test`: clean
- `npm run lint`: clean (max-warnings 0)
- All task `<acceptance_criteria>` grep checks pass (including no `fs` import and no planning identifiers in source or test comments)
- `bbj-notifications.ts` still imports nothing from `main.ts` and only types from `vscode-languageserver`

## Self-Check: PASSED

All created files exist on disk; commits `7d062950`, `0696bc41`, `b780dd60`, `2dee6949`, `8afeba5b` are in `git log`.
