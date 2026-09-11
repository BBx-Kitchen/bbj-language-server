---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 11
subsystem: language-server
tags: [bbj, hex-literal, setopts, langium, grammar, vitest, gap-closure]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: bbjHexLiteral(digits) (plan 10) — the writer side of the hexRange/hexDigits contract this plan's round-trip test exercises
provides:
  - "parseHexLiteral narrowed to the grammar's own HEX_STRING terminal shape, decided from the StringLiteral's raw CST source text rather than its converted value (the only place a quoted \"$08$\" and a bare $08$ remain distinguishable after BBjValueConverter)"
  - "A decode-side fixture corpus (setopts-code-scanner.test.ts, hover.test.ts, setopts-in-code-request.test.ts) written entirely in syntax a real BBj program can contain, matching examples/issue475-setopts-in-code.bbj"
  - "The absolute edit contract's round-trip test: hexRange (delimiter-inclusive) spliced with bbjHexLiteral's output (delimiter-emitting) re-decodes to the new digits with no quote character in the rebuilt line"
affects: [88-13]

# Actuals (#2632)
actuals:
  tokens: 8100
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A decoder that must distinguish two grammar terminals sharing one converted-value shape reads the CST node's raw source text instead of the converted AST value — the value converter is a lossy simplification for exactly this kind of terminal-identity question"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/setopts-code-scanner.ts
    - bbj-vscode/test/setopts-code-scanner.test.ts
    - bbj-vscode/test/hover.test.ts
    - bbj-vscode/test/setopts-in-code-request.test.ts

key-decisions:
  - "Deleted the pre-existing 'detectSetOptsShape decodes an absolute hex literal (quoted-string form)' positive test rather than repurposing it as a second negative — plan 88-11's new negative test already covers the identical source, and the pre-existing bare-form positive test already covers the positive side, so keeping both would have produced two negatives/two positives instead of the target one-of-each."
  - "Left three fixture classes deliberately quoted: the two X$=\"$08$\" non-literal-mask fixtures (the mask IS the variable, not the literal — migrating them would silently evaporate the unparseable-mask coverage) and the two \"$ZZ$\" invalid-hex-content fixtures (the bare HEX_STRING terminal cannot even lex non-hex characters between the delimiters, so no bare equivalent exists)."
  - "Converted the quoted-absolute case in setopts-in-code-request.test.ts into an explicit named negative (not-found/not-editable) instead of dropping it, so a future reader sees this is deliberately the invalid form the composer used to emit before plan 88-10's writer fix."

requirements-completed: [DISC-05, DISC-06]

coverage:
  - id: D1
    description: "parseHexLiteral accepts a literal only when its raw CST source text matches the grammar's own anchored HEX_STRING shape ($[0-9a-fA-F]*$); a quoted STRING_LITERAL containing the same characters is rejected at all three call sites (absolute, mask-call, chain-link)"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-code-scanner.test.ts#detectSetOptsShape returns no shape for a quoted absolute hex literal / detectSetOptsShape returns no shape for a quoted IOR mask-call argument / a chain reassignment whose single mask literal is quoted"
        status: pass
    human_judgment: false
  - id: D2
    description: "A quoted SETOPTS argument is not offered for edit-in-place (decodeInCode returns not-found), matching the decoder's own verdict"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts#an absolute SETOPTS \"$hex$\" statement (quoted -- the invalid form the composer previously emitted) returns not-found"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every decode-side SETOPTS/IOR/AND fixture is syntax a real BBj program can contain, migrated from the invalid quoted form to the bare form examples/issue475-setopts-in-code.bbj uses throughout"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-code-scanner.test.ts, bbj-vscode/test/hover.test.ts, bbj-vscode/test/setopts-in-code-request.test.ts (full files, 200 tests across the five SETOPTS test files)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The absolute edit contract composes end to end: hexRange (delimiter-inclusive) spliced with bbjHexLiteral's output (delimiter-emitting) re-decodes to the new digits with no quote character in the rebuilt line"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts#round trip: splicing bbjHexLiteral output into hexRange re-decodes to the new digits, with no quote character in the rebuilt line"
        status: pass
    human_judgment: false
  - id: D5
    description: "G-88-3's live-runtime correctness (88-RESEARCH.md Assumption A2 — is a 16-byte mask the right width against a real OPTS value) — this plan and 88-10 together prove the emitted/accepted TEXT only"
    verification: []
    human_judgment: true
    rationale: "Only a live BBjServices run (staged by plan 88-13) can confirm the runtime accepts the corrected literal end-to-end; unit tests here cannot execute BBj's AND()/IOR() against a real OPTS value."

duration: 20min
completed: 2026-09-11
status: complete
---

# Phase 88 Plan 11: Narrow the SETOPTS decoder to real BBj hex-literal syntax Summary

**`parseHexLiteral` now reads the StringLiteral's raw CST source text (not its converted value) to reject any quoted hex string, closing the leniency that let an invalid composer-generated literal round-trip cleanly through the decode-side test corpus, and a new round-trip test proves the absolute edit contract's range and formatter compose.**

**G-88-3 remains `status: failed`.** This plan and 88-10 together prove the composer's emitted and accepted TEXT is valid BBj syntax. Neither proves the runtime accepts it: 88-RESEARCH.md Assumption A2 — whether a 16-byte/32-hex-digit mask is the right width against a live `OPTS` value — is still unverified. Plan 88-13 stages the live BBjServices check that would resolve G-88-3.

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 4
- **Commits:** 5

## Accomplishments

- Narrowed `parseHexLiteral` (`setopts-code-scanner.ts`) to accept a literal only when its raw CST source text matches the grammar's own anchored `HEX_STRING` terminal shape (`^\$[0-9a-fA-F]*\$$`), falling back to the converted value only when no CST text exists. `STRING_LITERAL` and `HEX_STRING` are separate grammar terminals that `BBjValueConverter` makes byte-identical by the time the AST value is read (both `"$08$"` and `$08$` convert to `$08$`), so raw source text is the only place the distinction survives. No new `SetOptsUnsafeReason`, no change to `UNSAFE_REASON_TEXT`, no change at any of the three call sites — all three already handled `undefined` correctly.
- Added six new direct-coverage tests (RED, then GREEN once the narrowing landed) at all three decode sites: a quoted absolute argument, a quoted plain hex string with no `$` delimiters, a quoted mask-call argument, a chain whose single reassignment mask is quoted, plus regression pins for the bare-form positive and the empty `$$` literal.
- Migrated every quoted-hex fixture in `setopts-code-scanner.test.ts` and `hover.test.ts` that stood in a `SETOPTS`-argument or `IOR`/`AND`-mask position to the bare `$…$` form `examples/issue475-setopts-in-code.bbj` uses throughout — 24 fixture sites across the two files, all confirmed by content diff to carry no expected-value change. Deleted the now-redundant `(quoted-string form)` positive test (superseded by the bare-form positive plus this plan's new negative). Left the two `X$="$08$"` non-literal-mask fixtures and the two `"$ZZ$"` invalid-hex-content fixtures deliberately quoted — neither has a bare equivalent.
- Migrated `setopts-in-code-request.test.ts`'s three quoted fixtures (the chain and mask-call cases) to bare form, and converted the quoted-absolute decode case into an explicit named negative (`not-found`/`not-editable`) instead of the stale positive it used to assert.
- Added the round-trip test the absolute edit contract never had: decode a bare absolute line, splice `bbjHexLiteral`'s output for a different digit string into `hexRange` exactly as each host's in-place writer does, re-parse, decode again, and assert both the new digits come back and the rebuilt line carries no quote character.

## Task Commits

Each task was committed atomically (Tasks 1 and 3 mix `test`/`feat` since Task 1 is `tdd="true"`; the register-check cleanup is a separate follow-up commit, matching plan 88-10's own precedent):

1. **Task 1: Narrow the decoder to the grammar's own hex-string terminal, with direct coverage at all three decode sites**
   - `3d2c85c9` `test(88-11): pin the decoder to the grammar's HEX_STRING terminal shape (RED)`
   - `49681b23` `feat(88-11): narrow parseHexLiteral to the grammar's HEX_STRING terminal shape (GREEN)`
2. **Task 2: Migrate the decode-side fixture corpus to syntax a real BBj program can contain**
   - `46effa7f` `test(88-11): migrate decode-side fixtures to syntax a real BBj program can contain`
3. **Task 3: Prove the range and the formatter compose — the absolute-edit round trip nobody had**
   - `c806394a` `test(88-11): pin the absolute edit contract's round trip and the quoted-argument negative`

**Register-check follow-up:** `e0c99fc7` `docs(88-11): scrub internal plan/gap/decision ids from test comments (register check)` — the plan's own verification step 7 forbids plan numbers, decision ids and gap ids in source/test comments; initial commits named plan 88-11/88-10, D-02, D-04 and G-88-3 in doc comments and one test title, so this commit reworded them to plain prose with no functional change and re-ran every targeted test, build and lint to confirm nothing regressed.

## Files Created/Modified

- `bbj-vscode/src/language/setopts-code-scanner.ts` — `parseHexLiteral` narrowed to the raw-source-text `HEX_STRING` shape test; doc comment rewritten to state the two-terminal fact and why leniency here was a contributing cause
- `bbj-vscode/test/setopts-code-scanner.test.ts` — six new direct-coverage tests, 24 fixture sites migrated to bare form, one redundant positive test deleted
- `bbj-vscode/test/hover.test.ts` — 8 fixture/positionOf-token pairs migrated to bare form in lockstep
- `bbj-vscode/test/setopts-in-code-request.test.ts` — three fixtures migrated, the quoted-absolute case converted to a named negative, `bbjHexLiteral`-based round-trip test added

## Decisions Made

- **Deleted, not repurposed, the redundant quoted-form positive test** in `setopts-code-scanner.test.ts`: plan 88-11's own new negative test already covers the identical source (`SETOPTS "$08004020$"`), and the pre-existing bare-form positive already covers the positive side — keeping the old test would have produced two negatives or two positives instead of the plan's target "one positive and one negative" state.
- **Three fixture classes stayed deliberately quoted** with no migration: two `X$="$08$"` fixtures (the mask is the variable, not the literal — migrating would silently evaporate the `unparseable-mask` coverage) and two `"$ZZ$"` fixtures (the bare `HEX_STRING` terminal cannot lex non-hex characters between `$` delimiters, so there is no bare equivalent to migrate to).
- **The quoted-absolute case in `setopts-in-code-request.test.ts` became an explicit named negative** rather than being silently dropped, so a future reader understands this is deliberately the invalid form the composer used to emit before plan 88-10 fixed the writer.

## Deviations from Plan

None — plan executed exactly as written. (The register-check follow-up commit is expected process per this plan's own verification step 7 and plan 88-10's precedent, not a deviation from plan intent.)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. This plan integrates no external API (`assumption_delta: no-change`; no `COVERAGE.md` produced, per the plan's own note).

## Next Phase Readiness

- The decoder now agrees with BBj about what a hex literal is at all three decode sites (absolute, mask-call, chain-link), and the entire decode-side fixture corpus (`setopts-code-scanner.test.ts`, `hover.test.ts`, `setopts-in-code-request.test.ts`) is written in syntax a real BBj program can contain — an invalid generated form can no longer round-trip cleanly through the tests meant to catch it.
- The absolute edit contract (delimiter-spanning `hexRange` + delimiter-emitting `bbjHexLiteral`) is proven to compose by a dedicated round-trip test, closing the two-condition defect class G-88-3 diagnosed.
- All five SETOPTS test files pass together (200 tests); the whole VS Code suite is green (1481 passed, 29 skipped, 0 failed, `RUN_BBJ_TESTS=0 --maxWorkers=2`).
- **G-88-3 stays open (`status: failed`)** pending plan 88-13's live BBjServices verification of 88-RESEARCH.md Assumption A2 — do not close the gap from this plan's SUMMARY alone.
- Plan 88-12 (G-88-2, unrelated) is unaffected by this plan's changes.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-11*

## Self-Check: PASSED

All 5 commit hashes (`3d2c85c9`, `49681b23`, `46effa7f`, `c806394a`, `e0c99fc7`) verified present in `git log`; all modified files (`setopts-code-scanner.ts`, `setopts-code-scanner.test.ts`, `hover.test.ts`, `setopts-in-code-request.test.ts`) verified present on disk.
