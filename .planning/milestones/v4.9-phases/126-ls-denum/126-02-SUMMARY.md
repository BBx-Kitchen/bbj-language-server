---
phase: 126-ls-denum
plan: 02
subsystem: vscode-extension
tags: [vscode, output-channel, lsp-notification, denum, vitest]

requires:
  - phase: 126-ls-denum
    provides: "Host-neutral notification contract (bbj/denumDiagnostics, bbj/showDenumDiagnostics) in denum-notifications.ts"
provides:
  - "formatDenumDiagnosticsBlock: pure, vscode-free rendering of a diagnostics payload into output lines, total over any input"
  - "registerDenumDiagnosticsOutput: the two VS Code client handlers writing to and revealing the existing 'BBj' channel"
affects: [126-03, 126-05, 127-vscode-denum]

actuals:
  tokens: 4800
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Trust-boundary formatter: validate every field of a peer payload, skip bad entries, never throw"
    - "Peer text goes to the channel through raw appendLine only, so the Output level filter cannot hide an ERROR entry"

key-files:
  created:
    - bbj-vscode/src/denum-diagnostics-output.ts
    - bbj-vscode/test/denum-diagnostics-output.test.ts
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/activation-command-coverage.test.ts

key-decisions:
  - "The header path comes from vscode-uri's strict parse: a file uri shows its fsPath, anything else (including a string that does not parse) is shown as given"
  - "An empty or non-string original line number is left out of the entry line instead of printing an empty pair of parentheses; line 0 reads 'no location' and keeps any original number"
  - "The reveal handler ignores its payload entirely and calls show(true) (preserve focus)"

patterns-established:
  - "Activation tests reach the output channel mock through createOutputChannel's mock results and give it spies for every log-level method, so a handler that strays from raw appendLine fails"

requirements-completed: [DEN-04]

coverage:
  - id: D1
    description: "A bbj/denumDiagnostics notification is written into the existing 'BBj' output channel as a header naming the file plus one line per entry (line, original line number, severity, message)"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/denum-diagnostics-output.test.ts#formatDenumDiagnosticsBlock writes a header naming the file, then one line per entry"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#denumber diagnostics output the list notification appends the block to the BBj channel as raw lines and does nothing else"
        status: pass
    human_judgment: false
  - id: D2
    description: "bbj/showDenumDiagnostics reveals the 'BBj' channel without taking focus and ignores any payload"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#denumber diagnostics output the reveal notification shows the BBj channel without taking focus and appends nothing"
        status: pass
    human_judgment: false
  - id: D3
    description: "Malformed, hostile, multi-line, astral, repeated and equal-line payloads render as one clean line per valid entry in payload order, never throw, and never become a command, an opened file or a jump"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/denum-diagnostics-output.test.ts"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#denumber diagnostics output a hostile list payload only appends text and never opens, runs or jumps anywhere"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both handlers are registered once right after the formatter settings link and disposed with the extension"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/activation-command-coverage.test.ts (EXPECTED_SEQUENCE, EXPECTED_SUBSCRIPTIONS_LENGTH = 34)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#denumber diagnostics output each notification has exactly one handler, disposed with the activation"
        status: pass
    human_judgment: false
  - id: D5
    description: "The list actually looks right in a real VS Code Output panel against a live server run"
    requirement: DEN-04
    verification: []
    human_judgment: true
    rationale: "The server side that sends the notifications arrives in the next plan; a visual check of the real Output panel belongs to the live DENUM verification at the end of the phase"

duration: 3min
completed: 2026-10-02
status: complete
---

# Phase 126 Plan 02: DENUM diagnostics in VS Code's BBj output Summary

**VS Code writes the server's `bbj/denumDiagnostics` list into the existing 'BBj' log channel as a header plus one raw line per entry, reveals it on `bbj/showDenumDiagnostics`, and renders any payload through a pure formatter that skips bad entries and never throws.**

## Performance

- **Duration:** about 3 min
- **Started:** 2026-10-02T15:24:30Z
- **Completed:** 2026-10-02T15:28:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `formatDenumDiagnosticsBlock` (no `vscode` import) renders `Denumber diagnostics for <path>:` followed by `  line N (original X) SEVERITY: message`, `no location` for line 0, an unknown-file header for a payload without a string uri, and drops entries with a bad line, severity or message.
- `registerDenumDiagnosticsOutput` in `extension.ts` registers both handlers right after `registerFormatterSettingsLink`; the list handler appends through `appendOutputLine` (raw `appendLine`), the reveal handler calls `outputChannel.show(true)` and reads nothing from its payload. No second channel is created.
- Hostile payloads (a `command:` uri, a `file:///etc/passwd` reveal payload) are proven to cause no `executeCommand`, `showTextDocument` or `openTextDocument` call.
- Activation sequence pin updated: two new notification entries and 34 subscriptions.

## Task Commits

1. **Task 1: tracer, a bbj/denumDiagnostics notification becomes a block in the 'BBj' output and Show reveals it** - `80ea6c22` (feat)
2. **Task 2: odd, empty, hostile and repeated payloads (TDD)** - `5f2599a9` (test, RED: 21 failing), `9fef0645` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/denum-diagnostics-output.ts` - the pure formatter
- `bbj-vscode/src/extension.ts` - imports, `registerDenumDiagnosticsOutput` and its call in `activate()`
- `bbj-vscode/test/denum-diagnostics-output.test.ts` - formatter tests (header, entries, line 0, malformed, hostile, encoding, order, separate blocks)
- `bbj-vscode/test/extension-activation.test.ts` - channel mock gains `show` and the log-level spies, workspace mock gains `openTextDocument`, new `denumber diagnostics output` suite
- `bbj-vscode/test/activation-command-coverage.test.ts` - channel mock gains `show`, two sequence entries, subscription count 34

## Decisions Made
- Strict `URI.parse` for the header path: a string that is not a full uri falls back to being shown as given rather than being coerced into a `file` path.
- An empty original line number is omitted from the entry line (the format table's `line 0` row shows `no location INFO: note`), and a located entry with no original number reads `line 1 ERROR: message`.
- The reveal handler is payload-free by construction; the tests pass it a file uri, nothing and a string.

## Deviations from Plan

**1. [Process] Commit trailer** - The plan text names `Claude Opus 5.5`; the orchestrator's instructions for this run specify `Claude Sonnet 5.5`, which every commit carries.

**2. [Process] Tracer implementation kept minimal so Task 2 has a real RED** - Task 1's formatter handled only well-formed payloads; the malformed-payload tests added in Task 2 failed against it (21 failures) before the hardening commit made them pass.

**Total deviations:** 0 auto-fixed, 2 process notes. **Impact:** none on behaviour or scope.

## Issues Encountered
None.

## Known Stubs
None.

## Threat Flags
None. The two client handlers are the surface named in the plan's threat model (T-126-07 to T-126-10); each mitigation has a test: no command, open or jump from a payload, CR/LF flattening, one append per entry, and a formatter that never throws.

## Verification Run
- `npx vitest run test/denum-diagnostics-output.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts test/activation-prompts-and-status-bars.test.ts test/config-reload-host.test.ts test/extension-config-trust.test.ts`: 6 files, 101 tests, all passed
- `npm run typecheck:test`: clean
- `npm run lint`: clean (max-warnings 0)
- All `<acceptance_criteria>` grep checks pass, including no `vscode` import in the formatter and no planning identifiers in source or test comments

## Next Phase Readiness
Ready for 126-03: the server can now send `bbj/denumDiagnostics` and `bbj/showDenumDiagnostics` through the connection-free senders and VS Code will render them. IntelliJ registers no handler yet; its renderer comes with the IntelliJ DENUM work.

## Self-Check: PASSED

Created files exist (`src/denum-diagnostics-output.ts`, `test/denum-diagnostics-output.test.ts`); commits `80ea6c22`, `5f2599a9`, `9fef0645` are in `git log`.
