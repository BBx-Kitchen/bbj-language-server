---
phase: 125-ls-formatting
plan: 05
subsystem: language-server-settings
tags: [langium, lsp, configuration, initialization-options, formatting, vitest]

requires:
  - phase: 125-ls-formatting
    provides: "plan 03: BBjFormatService.setSettings / settingsSnapshot / settingsRevision and the recording interop double"
provides:
  - "workspace/didChangeConfiguration hands the bbj.formatter section to the format service before the startup gate, on push and on pull"
  - "VS Code sends the raw bbj.formatter object in initializationOptions.formatter; the workspace manager applies it on initialize"
  - "End-to-end tests proving both channels land as exactly the 15 normalized keys in the recorded formatProgram request"
affects: [125-06 formatter wiring and VS Code cut-over]

actuals:
  tokens: 3000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Raw settings object handed to the owning service, which normalizes it; no client-side whitelist or defaults"
    - "Lazy accessor to a DI service from the workspace manager, so the service is never built while the manager is"

key-files:
  created:
    - bbj-vscode/test/bbj-format-settings-intake.test.ts
  modified:
    - bbj-vscode/src/language/configuration-change-handler.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/extension.ts
    - bbj-vscode/test/configuration-change-handler.test.ts
    - bbj-vscode/test/extension-config-trust.test.ts

key-decisions:
  - "The handler checks `config.formatter !== undefined` only; a push without the section never touches the settings or their revision"
  - "initializationOptions.formatter is read inside the existing object branch of onInitialize, so string-form legacy options and absent options leave the 15 defaults untouched"
  - "No trust gating for formatter values: they only change formatting style and bbj-ls validates each one"

patterns-established:
  - "Intake test shape: real createBBjTestServices + a configuration handler whose dependency is bound to the real service + the recording interop double, asserting on the outgoing request"

requirements-completed: [SET-02]

coverage:
  - id: D1
    description: "A bbj.formatter change pushed or pulled through didChangeConfiguration reaches BBjFormatService.setSettings before the workspace-initialized gate, and the next formatProgram request carries exactly the 15 normalized keys (javaPath, the legacy splitSingleLineIF spelling and unknown keys never forwarded)"
    requirement: "SET-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-settings-intake.test.ts#a push reaches the next format request as exactly the 15 normalized keys"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/configuration-change-handler.test.ts#formatter settings"
        status: pass
    human_judgment: false
  - id: D2
    description: "A configuration change without a formatter section leaves the settings and their revision unchanged"
    requirement: "SET-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-settings-intake.test.ts#a later push without a formatter section leaves the settings and their revision unchanged"
        status: pass
    human_judgment: false
  - id: D3
    description: "The startup settings travel in initializationOptions.formatter, apply on initialize (first format already uses them), and a client that sends none gets the 15 defaults with indentWidth 2"
    requirement: "SET-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-settings-intake.test.ts#formatter settings sent in initializationOptions"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/extension-config-trust.test.ts#initializationOptions carry the raw formatter section"
        status: pass
    human_judgment: false
  - id: D4
    description: "VS Code's getConfiguration('bbj').get('formatter') and the settings push include user-set keys that package.json does not declare"
    requirement: "SET-02"
    verification: []
    human_judgment: true
    rationale: "Real VS Code behaviour for undeclared keys cannot be shown by the mocked vscode module; hand check: set bbj.formatter.indentCharacter to TAB in settings.json and expect a tab-indented result once the formatter is wired in the cut-over plan"

duration: 6min
completed: 2026-10-02
status: complete
---

# Phase 125 Plan 05: Formatter settings intake Summary

**The user's bbj.formatter settings reach the format service on both client channels, live through didChangeConfiguration (before the startup gate) and at startup through initializationOptions.formatter, and leave for bbj-ls only as the normalized 15 keys.**

## Performance

- **Duration:** about 6 min
- **Completed:** 2026-10-02T05:48:22Z
- **Tasks:** 2 (one tracer, one TDD)
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `BbjSettings.formatter` and `ConfigurationChangeDeps.setFormatterSettings` added; the handler calls it right after the compiler-trigger block and before the `isWorkspaceInitialized()` gate whenever the section is present, for push and pull alike. `main.ts` binds it to `BBj.compiler.BBjFormatService.setSettings`.
- `BBjWorkspaceManager.onInitialize` hands `initializationOptions.formatter` to the format service through a lazy accessor, so the service is never constructed while the manager is.
- `extension.ts` sends the raw `bbj.formatter` object in `initializationOptions.formatter` (no client-side whitelist or defaults). The formatter provider registration is untouched.
- `bbj-format-settings-intake.test.ts` drives a real configuration handler and a real `LanguageServer.initialize` into the recording interop double and asserts the exact outgoing key set: 15 keys, `indentWidth` 4 or 3, `splitSingleLineIf` true from the legacy `splitSingleLineIF` spelling, no `javaPath`, `splitSingleLineIF` or unknown key. A push without the section leaves settings and revision unchanged; no initialization options at all gives the defaults with `indentWidth` 2.

## Task Commits

1. **Task 1: push channel (tracer)** - `30494389` (feat)
2. **Task 2: initializationOptions channel (TDD)**
   - RED: `8564b383` (test) - 3 failures: indentWidth stayed 2 after initialize (twice), client sent no `formatter`
   - GREEN: `bfb81617` (feat) - 65/65 across the five task suites

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/language/configuration-change-handler.ts` - `formatter` field, `setFormatterSettings` dependency, intake before the startup gate
- `bbj-vscode/src/language/main.ts` - binds the dependency to the format service
- `bbj-vscode/src/language/bbj-ws-manager.ts` - applies `initializationOptions.formatter` on initialize
- `bbj-vscode/src/extension.ts` - `formatter` in `initializationOptions`
- `bbj-vscode/test/bbj-format-settings-intake.test.ts` - both channels end to end (6 tests)
- `bbj-vscode/test/configuration-change-handler.test.ts` - `setFormatterSettings` stub plus three handler cases
- `bbj-vscode/test/extension-config-trust.test.ts` - two client cases

## Decisions Made
- The handler tests only `config.formatter !== undefined`; malformed values (null, non-object) are the format service's normalizer's job and turn into defaults there.
- Formatter values from an untrusted workspace are not trust-gated (low severity: style only, every value validated by bbj-ls); `configPath` stays the only gated key.

## Deviations from Plan

None - plan executed exactly as written.

Notes, not deviations: the commit trailer is `Claude Sonnet 5.5` as the orchestrator instructed for this run (the plan text names Opus 5.5). The task 1 tracer's `<verify>` is automated-only, so it was re-run and passed before task 2 began.

## Issues Encountered
- One typecheck error in the new intake test (a stubbed resolved config path inferred `source` as `string`); fixed by typing the constant as `ResolvedConfigPath`, as the existing handler test does.

## Known Stubs
None.

## Threat Flags
None beyond the plan's threat model. T-125-23 (malformed push) is covered by the normalizer and the absent-section test; T-125-22 and T-125-24 accepted as planned.

## TDD Gate Compliance
Task 2: `8564b383` (test) precedes `bfb81617` (feat). RED failures were the missing behavior (settings not applied on initialize, `formatter` absent from the client options). Task 1 was a tracer, not TDD.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 125-06 can add `lsp.Formatter`, the `registerBoundedFormattingHandler` call and remove the client-side jar formatter; the settings it will format with are already live.
- Open for the end-of-phase hand check (flagged assumption D4): with the formatter wired, set `bbj.formatter.indentCharacter` to `TAB` in settings.json and confirm a tab-indented result, which proves undeclared keys reach the server.
- SET-02 is also declared by plan 125-06 (still open), so it is not marked Complete in REQUIREMENTS.md by this plan.

## Self-Check: PASSED

- Created file `bbj-vscode/test/bbj-format-settings-intake.test.ts` exists; the six modified files are in `git diff --stat`.
- Commits `30494389`, `8564b383`, `bfb81617` present in `git log`.
- Plan verification re-run: intake, extension-config-trust, configuration-change-handler, config-hot-reload-wiring, extension-activation and activation-command-coverage suites pass (plus config-path-resolution and interop-config in task 1; format service, handler, notices and formatter suites 108/108); `npm run typecheck:test` and `npm run lint` clean; planning-identifier scan over all touched source and test files prints nothing; `registerDocumentFormattingEditProvider` still present once in `extension.ts`.

---
*Phase: 125-ls-formatting*
*Completed: 2026-10-02*
