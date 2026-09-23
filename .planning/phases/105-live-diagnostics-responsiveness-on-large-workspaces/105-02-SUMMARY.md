---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
plan: 02
subsystem: language-server
tags: [diagnostics, reconciliation, langium, pure-function]

requires:
  - phase: 103-one-set-of-errors-diagnostic-reconciliation
    provides: "reconcileWithVerdict, applyVerdictCarryOver, VerdictState, the syntax-complaint downgrade/overlap primitives"
provides:
  - "composeWithVerdict: one pure function that derives the published diagnostics list from Langium's latest list, the text it was validated against, the live text/version and the stored verdict"
  - "reconcileEarlyVerdict: the stale-Langium-list case composeWithVerdict selects when a verdict is already for newer text than Langium has validated"
  - "An extended remembered-Langium-diagnostics snapshot (validatedText) and an extended VerdictState (version, diagnostics) that composeWithVerdict reads"
affects: [105-04]

actuals:
  tokens: 7544
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Compute-first case selection: composeWithVerdict never mutates or appends to a prior published list — every call re-derives the whole result from its four inputs, so a result for an older text version can never overwrite a newer one just by running later"
    - "Text-based staleness detection instead of a version counter: LangiumDiagnosticsSnapshot.validatedText is a reference to the parsed text itself (never a copy), compared by equality against the live text, because an open document's own TextDocument is updated in place and can already be ahead of what was parsed"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts
    - bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts

key-decisions:
  - "reconcileEarlyVerdict drops a stale complaint on any overlap with a verdict diagnostic, whether or not the line text still matches — D-05's rule is unconditional on overlap. It only records that complaint's key in `seen` when the line also matched, because an unmatched line was never actually re-confirmed by anything; remembering it as seen would let a real edit on that line go unflagged by the next carry-over pass."
  - "The `seen` key for a stale complaint always uses the *live* line text, not the validated line text, so the very next per-keystroke carry-over pass (which reads against live text) matches it exactly."
  - "composeWithVerdict treats any verdict that is not exactly `isVerdictForVersion(verdict, liveVersion)` — older, newer, or missing `version`/`diagnostics` — as a carry-over-only state: applyVerdictCarryOver runs and no verdict diagnostic is ever shown, closing the gap where an older text's BBj diagnostics could appear against newer text."
  - "isVerdictForVersion requires both `version` and `diagnostics` to be present, not just a matching `version` number, so a state that only carries decisions forward (deliberately built with no `version`) can never accidentally be treated as current even if some future caller sets a stray `version` on it without `diagnostics`."

patterns-established:
  - "Pure composition over mutable state: every diagnostics-list producer in this module takes its inputs as plain values and returns a plain value; no function reaches into module-scoped state except through the explicit remember/recall and get/set accessors."

requirements-completed: []

coverage:
  - id: D1
    description: "composeWithVerdict composes an early verdict (already for the live text) against a stale Langium list validated on older text: matched complaints downgrade, complaints overlapping the verdict's lines drop regardless of match, non-matching complaints stay Errors, and non-syntax diagnostics pass through untouched"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/bbj-diagnostic-reconciliation.test.ts#an early verdict for the live version composed against a stale Langium list downgrades a matched complaint, leaves a changed-line complaint an Error, drops the complaint on a line BBj flags, and passes a non-syntax diagnostic through unchanged"
        status: pass
    human_judgment: false
  - id: D2
    description: "The remembered-Langium-diagnostics snapshot carries the validated text as an optional third argument, and rememberLangiumDiagnostics/recallLangiumDiagnostics keep their original two-argument meaning for every existing caller"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/bbj-diagnostic-reconciliation.test.ts#rememberLangiumDiagnostics/recallLangiumSnapshot round-trip the validated text; recallLangiumDiagnostics returns the same list; remembering with two arguments recalls validatedText as undefined"
        status: pass
    human_judgment: false
  - id: D3
    description: "composeWithVerdict's full case table: no verdict, a carry-over-only verdict, a verdict for an older or newer version than the live one, and a current verdict with validatedText equal to or absent alongside the live text — each matches its defined fallback (Langium unchanged, applyVerdictCarryOver, or reconcileWithVerdict) exactly"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/bbj-diagnostic-reconciliation.test.ts#composeWithVerdict — case selection (6 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty-input, line-text-equality and idempotency edges are pinned: zero-diagnostic/empty-list/both-empty combinations, a CRLF-only terminator difference (matches), a trailing-space and a precomposed-vs-decomposed-accent difference (both stay unmatched), a complaint past the live text's last line, and that composing twice with equal inputs gives equal, non-mutated outputs with no duplicated verdict diagnostic"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/bbj-diagnostic-reconciliation.test.ts#composeWithVerdict — edges (8 tests)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-23
status: complete
---

# Phase 105 Plan 02: Diagnostic Snapshot Composition Summary

**`composeWithVerdict` derives one pre-hierarchy diagnostics list from Langium's latest list, the text it was validated against, the live text/version and the stored verdict — selecting between an unchanged pass-through, `reconcileWithVerdict`, the new `reconcileEarlyVerdict` for a verdict already ahead of Langium's validation, or a carry-over-only fallback for any non-current verdict.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-23T12:23:00Z (approx.)
- **Completed:** 2026-09-23T12:32:12Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- `composeWithVerdict(input: VerdictComposition)` is the single pure function every future writer of `document.diagnostics` will call to re-derive the whole published list from one consistent snapshot — never appending to or stripping from an earlier published list, so a result for an older text version can never overwrite one for a newer version just by running later (plan 04 wires this into the validator and the builder).
- `reconcileEarlyVerdict` handles the case `reconcileWithVerdict` does not: a verdict already computed for the live text, reconciled against a Langium list still validated on older text. Each stale syntax complaint is treated by whether its start line's text still matches between the validated and the live text, and by whether it overlaps a verdict diagnostic's line — matching D-05's drop/downgrade/keep rule exactly, including the case where an overlapping-but-unmatched complaint is still dropped (BBj's own diagnostic speaks for that line) without being remembered as `seen`.
- The remembered-Langium-diagnostics `WeakMap` now stores a `LangiumDiagnosticsSnapshot` (`diagnostics` plus an optional `validatedText`) instead of a bare array, with a new `recallLangiumSnapshot` accessor; `rememberLangiumDiagnostics` gains an optional third parameter and `recallLangiumDiagnostics` keeps its original two-argument behavior byte-for-byte for every existing caller.
- `VerdictState` gains optional `version` and `diagnostics` fields (both present together or both absent) and a new `isVerdictForVersion(verdict, version)` predicate that treats a verdict as "current" only when both fields are present and `version` matches exactly — every existing `setVerdictState(uri, { seen })` caller and test keeps compiling and keeps its carry-over-only meaning unchanged.
- `textLineLookup(text)` wraps a plain string in a throwaway `TextDocument` and reuses the existing `documentLineText` line-reading idiom, so a validated-text string and a live-editor `TextDocument` are read by the exact same line-comparison logic.
- The full composition case table (no verdict, current verdict same-text vs. early, older/newer verdict, carry-over-only) and the empty/line-text-equality/idempotency edges the plan's spec-less probe raised are pinned by 22 new unit tests (2 in the tracer task, 20 in the expansion task), all passing against a single implementation with no rework needed between tasks.

## Task Commits

Each task was committed atomically; both tasks carried `tdd="true"`:

1. **Task 1 RED: failing test for composeWithVerdict against a stale Langium list** - `763c9665` (test)
2. **Task 1 GREEN: compose one diagnostics list from Langium, live text and a verdict** - `1fca4ce7` (feat)
3. **Task 2: pin every other composeWithVerdict case and its edges** - `e2752652` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md)

_Note: Task 2 has no separate GREEN commit — its 14 new tests all passed against the implementation Task 1 already built (the plan's own action step anticipates this: "If Task 1 was built as specified most pass at once — that is expected; a test that passes on first run still stays"). No production code needed to change._

## Files Created/Modified

- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` — added `LangiumDiagnosticsSnapshot`, `textLineLookup`, `isVerdictForVersion`, `reconcileEarlyVerdict`, `VerdictComposition`, `composeWithVerdict`; extended `VerdictState` with optional `version`/`diagnostics`; changed the remembered-diagnostics `WeakMap`'s value type and added `recallLangiumSnapshot`; `rememberLangiumDiagnostics` gained an optional third `validatedText` parameter
- `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` — added three describe blocks: `composeWithVerdict — early verdict against a stale Langium list` (the tracer, 2 tests), `composeWithVerdict — case selection` (6 tests), `composeWithVerdict — edges` (8 tests)

## Decisions Made

- `reconcileEarlyVerdict` drops any stale complaint that overlaps a verdict diagnostic's line regardless of whether the line text still matches (D-05's overlap rule is unconditional), but only records that complaint's key in `seen` when the line also matched — an unmatched, dropped complaint was never actually re-confirmed by anything, and remembering it as seen would suppress a real future error on that same line once BBj's own diagnostic disappears again.
- The `seen` key recorded for a stale complaint always uses the *live* line text (never the validated one), so the immediate next per-keystroke carry-over pass — which reads against the live text — matches it exactly, consistent with Phase 103's existing carry-over key convention.
- `composeWithVerdict` treats any verdict that fails `isVerdictForVersion(verdict, liveVersion)` — for an older or newer version, or missing either `version` or `diagnostics` — as carry-over-only: `applyVerdictCarryOver` runs and no verdict diagnostic from that state is ever shown. This is what keeps an older text's BBj diagnostics from ever appearing against newer text.
- `isVerdictForVersion` requires both `version` and `diagnostics` to be present together, not just a matching version number — so a genuinely carry-over-only state stays carry-over-only even if it happens to carry a stray `version` with no `diagnostics`.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<action>` and `<behavior>` were followed as specified, including the plan's own explicit anticipation that Task 2 might need no production-code changes.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `composeWithVerdict` and its supporting exports exist end to end and are fully unit-tested, but nothing in the codebase calls them yet — `bbj-document-validator.ts` and `bbj-document-builder.ts` are unchanged by this plan, matching plan 01's summary note that those files are left at an unchanged surface for plans 02-04.
- Plan 04 ("Concurrent writers of `document.diagnostics`: the latest text version wins") is the next plan expected to wire `composeWithVerdict` into the validator and the builder, per this phase's default plan split; per the shared-requirement gate, `RESP-03` is NOT marked complete in REQUIREMENTS.md yet because plan 04 also declares it and is still open (`requirements.ready-ids` confirmed 0/1 ready).
- No blockers.

---
*Phase: 105-live-diagnostics-responsiveness-on-large-workspaces*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` exists on disk
- `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` exists on disk
- Commits `763c9665`, `1fca4ce7`, `e2752652` all found in `git log --oneline --all`
- All 48 tests in `test/bbj-diagnostic-reconciliation.test.ts` pass (32 pre-existing + 2 tracer + 14 expansion); `test/bbj-document-validator.test.ts` (11 tests) passes unchanged; `npx tsc -b tsconfig.json` exits 0 with no output
- The register check (`git diff -U0 9601e7122827888ad308611553f9ee145ce9b1fe -- <both files> | grep '^+' | grep -E 'RESP-0|D-[0-9][0-9]|10[0-9]-[0-9][0-9]|CR-[0-9]|WR-[0-9]|T-105-'`) finds nothing — exit 1, negated to success per the plan's own `<verify>`
- Import isolation held: `grep -E '^import' bbj-diagnostic-reconciliation.ts | grep -vE "from '(langium|vscode-languageserver|\./lsp-position\.js)';"` prints nothing
