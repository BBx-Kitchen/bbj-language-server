---
phase: 125-ls-formatting
plan: 06
subsystem: language-server-formatting
tags: [langium, lsp, formatting, vscode, vitest, live-interop]

requires:
  - phase: 125-ls-formatting
    provides: "plan 02: IntelliJ formatting switch left off; plan 03: BBjFormatter, BBjFormatService and the bounded formatting handler; plan 04: the open-settings notification contract; plan 05: formatter settings intake"
provides:
  - "The server advertises document and range formatting (lsp.Formatter slot) and answers through the bounded handler registered after startLanguageServer"
  - "VS Code no longer registers the client-side jar formatter: the language client's provider is the only BBj formatter"
  - "Open Settings from an invalid-settings message opens the Settings UI filtered to bbj.formatter; the payload is never read"
  - "Live checks through the production format service, and the first-format latency record with the warm-up decision"
affects: [DENUM work (live mixed-numbering check), remaining settings and jar-formatter deletion, 125 hand check]

actuals:
  tokens: 3400
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Capability test via the protected buildInitializeResult structural cast"
    - "Code-only (comment-stripped) source-order guard over main.ts for post-start handler registration"
    - "Notification handler that ignores its payload and passes a fixed constant to a command"

key-files:
  created:
    - bbj-vscode/test/bbj-formatter-capability.test.ts
  modified:
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/src/extension.ts
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/activation-command-coverage.test.ts
    - bbj-vscode/test/functional/program-live.test.ts

key-decisions:
  - "The capability, the handler registration and the provider removal landed in one commit (18cea80c), after the IntelliJ switch from the earlier plan, so no commit has two VS Code formatters or IntelliJ formatting"
  - "document-formatter.ts and its jars stay in the tree, unimported; they are deleted with the remaining settings work"
  - "First-format latency is well under the 750 ms budget: stay lazy, no warm-up"

requirements-completed: [CUT-01, FMT-01, FMT-02, FMT-03, FMT-04, SET-02]

coverage:
  - id: D1
    description: "The server advertises documentFormattingProvider and documentRangeFormattingProvider and not on-type formatting; the formatter slot holds BBjFormatter"
    requirement: "FMT-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-formatter-capability.test.ts#formatting capability"
        status: pass
    human_judgment: false
  - id: D2
    description: "The bounded handler is registered exactly once, after startLanguageServer, so format requests never wait for the workspace"
    requirement: "FMT-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-formatter-capability.test.ts#the bounded handler is registered exactly once, after startLanguageServer"
        status: pass
    human_judgment: false
  - id: D3
    description: "activate() never registers a client-side formatting provider, and the activation sequence and subscription count are pinned without it"
    requirement: "CUT-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#no client-side formatting provider is registered"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/activation-command-coverage.test.ts#the activation sequence and subscription count match the pinned base"
        status: pass
    human_judgment: false
  - id: D4
    description: "The open-settings notification handler opens workbench.action.openSettings with the fixed bbj.formatter query for a normal, a hostile and an absent payload"
    requirement: "SET-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#formatter settings link"
        status: pass
    human_judgment: false
  - id: D5
    description: "Against live BBj through the production format service: a whole-document format returns edits and formatting the result again returns none; the 15 default settings and the legacy-key settings are accepted; a mixed-numbered file without the denumber permission is answered denum-needed"
    requirement: "FMT-02"
    verification:
      - kind: integration
        ref: "RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts (10 tests passed, none skipped)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Exactly one BBj formatter listed under Format Document With, Format Selection snapping, format-on-save, cursor/folding/undo survival, invalid-setting message and Open Settings, IntelliJ offering no LSP formatting"
    requirement: "CUT-01"
    verification: []
    human_judgment: true
    rationale: "Needs a VSIX and an IntelliJ plugin zip built from the final tree after code-review fixes, and a human looking at VS Code and IntelliJ; the unit tests prove only that the extension registers no formatter"

duration: 5min
completed: 2026-10-02
status: complete
---

# Phase 125 Plan 06: Formatting switched on Summary

**VS Code Format Document, Format Selection and format-on-save are now answered by the language server through the bounded handler, the client-side jar formatter is gone, Open Settings opens the formatter settings with a fixed query, and the first format on a fresh program connection measures 8 ms against live BBj (stay lazy).**

## Performance

- **Duration:** about 5 min
- **Started:** 2026-10-02T05:57:06Z
- **Completed:** 2026-10-02T06:02:29Z
- **Tasks:** 3
- **Files modified:** 7 (1 created)

## Accomplishments

- `lsp.Formatter: BBjFormatter` makes Langium advertise document and range formatting and no on-type formatting; `registerBoundedFormattingHandler(connection, shared, BBj)` is called right after the other post-start overrides in `main.ts`, so Langium's default handlers (workspace wait, disk load of a client uri) are replaced.
- `extension.ts` no longer imports or registers the jar formatter; there is no fallback. The module file stays, unimported.
- `registerFormatterSettingsLink` handles `bbj/openFormatterSettings` by calling `workbench.action.openSettings` with `bbj.formatter` and nothing derived from the payload.
- Live confirmation, gates and the D-13 record below.

## Task Commits

1. **Task 1: Format Document answered by the language server, one BBj formatter (tracer)** - `18cea80c` (feat)
2. **Task 2: Open Settings opens the Settings UI on bbj.formatter** - `fc93c768` (test, RED), `6b6ac33e` (feat, GREEN)
3. **Task 3: Live format-service, settings, mixed-file and first-format latency checks** - `b1d56bbd` (test)

**Plan metadata:** the docs commit that follows this summary.

Tracer gate: the Task 1 verify (seven suites, typecheck, lint, build) passed before the commit and was clean again afterwards; expansion proceeded.

## First-format latency record

Raw socket with TCP_NODELAY (research, first format on a fresh connection): 1.8-5.5 ms for 539 bytes, 3.9-4.3 ms for 1,000 lines, 29-70 ms for 10,000 lines; TCP connect 0.2-2.1 ms.

Production client (live peer on :5008, three fresh `createBBjServices(NodeFileSystem)`, each timing lane open plus probe plus the first `BBjFormatService.format` of a 1,000-line program the formatter rewrites):

`program-live: first format on a fresh program connection median=8ms runs=[10, 8, 7]`

An earlier run with a 1,000-line text the formatter leaves unchanged measured median 11 ms, runs [12, 11, 11]; it is not the record because that text yields no edits (see Issues Encountered).

Decision: the median is far below the 750 ms save budget, so the program lane stays lazy: stay lazy, no warm-up. Opening the lane when the first BBj document opens is not built.

Other live answers recorded:

- Mixed-numbered file (`0010 print 1` then `print 2`) sent without the denumber permission: `failed` with failure `denum-needed`, peer text "DENUM needed: the source is a line-numbered program (first numbered line 1)". The live mixed-numbering check therefore moves to the DENUM work.
- The 15 default settings, and the settings produced from `{ splitSingleLineIF: true, javaPath: '/usr/bin/java', indentWidth: 2 }`, are accepted with no invalid-settings answer.
- Whole-document format of the small program returns one edit; formatting the result again returns none and the recording messenger shows no notice.

## Carried forward

- **Residual worst case:** a wedged peer can still hold one format-on-save for up to the interop client's 15 s deadline. The request honours VS Code's cancellation, and later requests on a latched or cooled-down connection answer at once.
- **Open question carried forward:** `eolCharacter` LF or CRLF is not idempotent in an editor with the other line ending.
- **Manual-only checks for the hand check**, from a VSIX and an IntelliJ plugin zip built from the final tree after code-review fixes, against live BBj 26.03:
  - VS Code: Format Document With lists one BBj formatter; Format Document, Format Selection (snapped to whole statements) and format-on-save work; cursor, folding and undo survive; formatting twice leaves the file unmodified; typing while a large file formats keeps the typing.
  - VS Code: an invalid `bbj.formatter.indentWidth` shows the named-key message and Open Settings opens the Settings UI on `bbj.formatter`; a `.bbx` config document is untouched by Format Document; a numbered file shows the Denumber BBj Program message.
  - VS Code: `"bbj.formatter.indentCharacter": "TAB"` in settings.json gives a tab-indented result.
  - VS Code: pointed at the in-repo `java-interop/` mirror (no program methods), the "requires BBj 26.03 or later" message appears once per connection and the save is not blocked.
  - IntelliJ: Reformat Code and Actions on Save do nothing for BBj files; no LSP formatting is offered.
  - Flagged assumptions still open: VS Code's save participant cancels a slow provider after its own timeout, and ranged format-on-save arrives as separate range requests.

## Gates (final tree, HEAD `b1d56bbd`)

- `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts`: 10 passed, 0 skipped.
- `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`: 4083 tests passed, 0 failed tests, 63 skipped; the single failed file is `test/functional/installed-extension-e2e.test.ts` (known environment failure, it spawns the separately installed bundle).
- `npm run lint`, `npm run typecheck:test`, `npm run build`: clean.
- `cd bbj-intellij && ./gradlew cleanTest test`: BUILD SUCCESSFUL.

## Decisions Made

- One commit for capability, handler registration and provider removal, as the plan required.
- The settings link ignores its payload entirely; a hostile-payload test pins the command arguments.
- `document-formatter.ts` and its tests are left untouched for the later deletion.

## Deviations from Plan

None - plan executed exactly as written. The requirement-completion step (`requirements.mark-complete`) was not run because this plan's executor rules forbid editing REQUIREMENTS.md; the orchestrator owns that update.

## Issues Encountered

- The first 1,000-line program written for the latency measurement (comments, `x2=2`, `print x2`) is already in the formatter's output form, so the formatter answered no edits. The measured 11 ms was a real round trip but proved nothing about edit handling. The text was replaced by the small program's statements repeated, and the test now asserts at least one edit so a no-op text can never be timed again.

## Known Stubs

None.

## Threat Flags

None. The new surface (the open-settings handler) is the one in the plan's threat model, with the fixed-query mitigation tested.

## Next Phase Readiness

- Formatting is on for VS Code; IntelliJ still offers none. The phase hand check and the DENUM live mixed-numbering check are what remain.

## Self-Check: PASSED

- Created and modified files exist on disk (capability test, extension, module, main, three tests).
- Commits `18cea80c`, `fc93c768`, `6b6ac33e` and `b1d56bbd` are present in `git log`.
- Every task acceptance grep returned its expected count; no planning identifiers in the touched source or tests.

---
*Phase: 125-ls-formatting*
*Completed: 2026-10-02*
