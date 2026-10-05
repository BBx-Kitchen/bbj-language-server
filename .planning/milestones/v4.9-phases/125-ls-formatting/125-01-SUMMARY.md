---
phase: 125-ls-formatting
plan: 01
subsystem: language-server-formatting
tags: [langium, formatting, settings, text-edit, vitest]

requires:
  - phase: 124-interop-program-client
    provides: FormatSettingValue and ProgramTextEdit wire types in java-interop-program-types.ts
provides:
  - "normalizeFormatterSettings: any raw bbj.formatter value becomes exactly the 15 bbj-ls keys, fixed order, explicit values, indentWidth 2"
  - "FormatterSettingsHolder: revisioned holder that moves only on a real change, with userKeyFor for the legacy split key"
  - "minimalLineEdit and rangeFormatEdits: smallest whole-line edit for a formatter answer, none for identical output"
  - "COVERAGE.md api-coverage gate note for the phase"
affects: [125-03 format service, 125-04 format notices, 125-05 settings intake, 125-06 formatter wiring]

actuals:
  tokens: 8000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Settings normalizer builds a fresh object by walking a fixed key list and reads own properties only"
    - "Edit helper trims identical leading and trailing lines (terminator-aware) and takes every position from TextDocument.positionAt"

key-files:
  created:
    - bbj-vscode/src/language/bbj-format-settings.ts
    - bbj-vscode/src/language/bbj-format-edit.ts
    - bbj-vscode/test/bbj-format-settings.test.ts
    - bbj-vscode/test/bbj-format-edit.test.ts
    - .planning/phases/125-ls-formatting/COVERAGE.md
  modified: []

key-decisions:
  - "A function or other non-JSON value for a known key is forwarded as String(value) when JSON.stringify yields undefined, so bbj-ls rejects the key by name"
  - "minimalLineEdit clamps start and end to the document and forces end >= start, so a peer range past the document end stays inside it"
  - "wholeDocumentChangeAsRange in bbj-kept-check.ts left untouched; the new helper does not reuse it"

patterns-established:
  - "Own-property reads (hasOwnProperty.call) for any settings object that may come from parsed JSON"
  - "Seeded in-test PRNG (mulberry32) for deterministic property tests, no new dependency"

requirements-completed: [SET-02, FMT-04, FMT-05]

coverage:
  - id: D1
    description: "Raw bbj.formatter value normalized to exactly the 15 bbj-ls keys with explicit values, indentWidth 2, legacy key mapped, javaPath and unknown keys dropped, no prototype pollution"
    requirement: "SET-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-settings.test.ts#normalizeFormatterSettings"
        status: pass
    human_judgment: false
  - id: D2
    description: "Revisioned settings holder whose revision moves only on a real change and that reports the key spelling the user set"
    requirement: "SET-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-settings.test.ts#FormatterSettingsHolder"
        status: pass
    human_judgment: false
  - id: D3
    description: "Identical formatter output gives no edit for LF, CRLF and lone-CR documents"
    requirement: "FMT-04"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-edit.test.ts#minimalLineEdit equal text gives no edit"
        status: pass
    human_judgment: false
  - id: D4
    description: "Any other answer becomes one whole-line edit that round-trips exactly (300 seeded cases over all terminator styles and astral characters) and touches only the differing lines"
    requirement: "FMT-05"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-edit.test.ts#minimalLineEdit seeded round trip"
        status: pass
    human_judgment: false
  - id: D5
    description: "A single-hunk line trim is minimal enough in the editor: folding, cursor position and undo survive a format in VS Code"
    requirement: "FMT-05"
    verification: []
    human_judgment: true
    rationale: "The plan flags this as an unresolved assumption; VS Code re-minimises provider edits, but cursor, folding and undo behaviour needs the end-of-phase hand check once the formatter is wired"

duration: 7min
completed: 2026-10-01
status: complete
---

# Phase 125 Plan 01: Format settings normalizer and minimal edit helper Summary

**Two pure modules the language-server formatter will consume: a 15-key settings normalizer with a revisioned holder, and a terminator-aware single-hunk whole-line edit helper verified by a 300-case seeded round-trip test.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-10-01T17:51:00Z
- **Completed:** 2026-10-01T17:58:30Z
- **Tasks:** 2
- **Files modified:** 5 (all created)

## Accomplishments
- `normalizeFormatterSettings` returns exactly the 15 bbj-ls keys in a fixed order with explicit string, number or boolean values (never null), `indentWidth` 2 by default. `javaPath`, unknown keys and a parsed `__proto__` key never appear; the legacy `splitSingleLineIF` fills `splitSingleLineIf` only when the new key is absent. Object, array and other non-scalar values are forwarded as JSON text so bbj-ls names the bad key.
- `FormatterSettingsHolder` normalizes on `set`, bumps `revision` only when the serialized result changes, hands out fresh snapshots, and tracks via `userKeyFor` which spelling of the split-single-line key the user actually set.
- `minimalLineEdit` and `rangeFormatEdits` give `[]` for identical text and otherwise one whole-line edit, with line terminators part of line equality and every position taken from `TextDocument.positionAt`. A peer range edit keeps its own outer range (no clipping to the selection) but is trimmed to the lines that differ.
- Phase `COVERAGE.md` carries the one-line "No external API integration:" note, under 200 characters.

## Task Commits

1. **Task 1: settings normalizer and holder (tracer)** - `aa0166d4` (feat)
2. **Task 2: minimal whole-line edits (TDD)**
   - RED: `e0e43fa6` (test) - module absent, suite failed at import
   - GREEN: `68cae6de` (feat) - 47/47 tests in both new suites pass; no refactor needed

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-format-settings.ts` - 15 keys, defaults, normalizer, revisioned holder
- `bbj-vscode/src/language/bbj-format-edit.ts` - `minimalLineEdit`, `rangeFormatEdits`
- `bbj-vscode/test/bbj-format-settings.test.ts` - 24 tests: defaults, legacy key, javaPath, prototype keys, ordering, holder revision and `userKeyFor`
- `bbj-vscode/test/bbj-format-edit.test.ts` - 23 tests including the seeded round-trip property test
- `.planning/phases/125-ls-formatting/COVERAGE.md` - api-coverage gate note

## Decisions Made
- Non-JSON values (function, bigint, NaN, Infinity) become text through `JSON.stringify` with a `String(value)` fallback, so they reach bbj-ls as a string it rejects by key rather than being silently replaced by a default.
- `minimalLineEdit` clamps both offsets to the document and forces `end >= start`, so a formatter range past the document end cannot produce an out-of-document position.
- `bbj-kept-check.ts` (`wholeDocumentChangeAsRange`) stays untouched, as planned.

## Deviations from Plan

None - plan executed exactly as written.

The plan's executor-rules block names the commit trailer as `Claude Opus 5.5`; the orchestrator's instruction for this run specified `Claude Sonnet 5.5`, which was used on all three commits.

## Issues Encountered
None.

## Known Stubs
None. Both modules are intentionally not yet wired; the format service in a later plan of this phase consumes them.

## Threat Flags
None - no new network endpoint, auth path or file access; both modules are pure functions.

## TDD Gate Compliance
Task 2 followed RED then GREEN: `e0e43fa6` (test) precedes `68cae6de` (feat). RED failed because the module did not exist yet (import error), which is the expected reason for a test-first commit of a new module.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The format service, settings intake and formatter wiring plans can import `normalizeFormatterSettings`, `FormatterSettingsHolder`, `minimalLineEdit` and `rangeFormatEdits` directly.
- The shared requirements (SET-02, FMT-04, FMT-05) are declared by later plans in this phase too, so they are not marked Complete in REQUIREMENTS.md by this plan.
- Open for the end-of-phase hand check: folding, cursor and undo after a format in VS Code (flagged assumption D5).

## Self-Check: PASSED

- Created files exist: `bbj-format-settings.ts`, `bbj-format-edit.ts`, both test files and `COVERAGE.md` found on disk.
- Commits `aa0166d4`, `e0e43fa6`, `68cae6de` present in `git log`.
- Plan verification re-run: `npx vitest run test/bbj-format-edit.test.ts test/bbj-format-settings.test.ts` 47/47 pass; `npm run typecheck:test` and `npm run lint` clean; `bbj-kept-check.ts` unchanged; planning-identifier scan over the four new source and test files prints nothing.

---
*Phase: 125-ls-formatting*
*Completed: 2026-10-01*
