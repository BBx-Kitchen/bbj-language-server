---
phase: 100-parser-gaps-remaining-groups-long-tail-examples
plan: 05
subsystem: testing
tags: [bbjcpl, examples, vitest, langium, EXMP-01]

# Dependency graph
requires:
  - phase: 100-03
    provides: the corrected grammar (empty array brackets, block-boundary comments,
      line-numbered classes, oracle-sweep words as names) that every example in
      examples/ now parses cleanly against
provides:
  - a two-layer examples-compile test (bbj-vscode/test/examples-compile.test.ts) that
    keeps examples/ and the real compiler's verdict from silently drifting apart again
  - examples/invalid/ with its README and sidecar convention, ready for future
    deliberately-invalid examples
affects: [100-06]

# Actuals (#2632)
actuals:
  tokens: 6650
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "examples/invalid/<name>.bbj + <name>.expected.json sidecar pair, `diagnostics`
      either a literal \"none-today\" marker or an array of {line, severity,
      messageFragment} entries"
    - "always-on layer (parseHelper/validationHelper, runs in CI) + BBj-gated layer
      (RUN_BBJ_TESTS=1, spawnSync bbjcpl -N, concatenates stdout+stderr) as two
      independent describe blocks in one test file"

key-files:
  created:
    - bbj-vscode/test/examples-compile.test.ts
    - examples/invalid/README.md
    - examples/invalid/dim-examples-substring-expressions.bbj
    - examples/invalid/dim-examples-substring-expressions.expected.json
  modified:
    - examples/dim-examples.bbj
    - examples/mnemonics.bbj
    - examples/files.bbj
    - examples/imports/issue50.bbj
    - examples/imports/onlyStaticField.bbj
    - examples/issue181-release-syntax.bbj
    - examples/issue182-clipfromstr-syntax.bbj
    - examples/issue198-member-access-levels-instance.bbj
    - examples/issue198-member-access-levels-static.bbj
    - examples/issue207-member-access-levels-auto-getter-setter.bbj
    - examples/issue224.bbj
    - examples/issue246.bbj
    - examples/issue44-return.bbj
    - examples/issue650-composer-cues.bbj
    - examples/issue_378_class_bbjstring_bbjnumber.bbj
    - examples/msgbox.bbj
    - examples/using-java.bbj
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts

key-decisions:
  - "All 17 originally-failing examples turned out to have a valid, compiler-accepted repair that keeps their construct -- none needed a D-18 false-premise move+todo. Only one file (a 3-line split out of dim-examples.bbj) genuinely belongs in examples/invalid/."
  - "A class's own field must be read via a bare #fieldName reference; #this!.fieldName is rejected by bbjcpl even though the grammar accepts it and #this!.methodName() calls are fine -- established by direct probe, not documented anywhere offline."
  - "The sidecar's diagnostics field is either the literal string \"none-today\" or an array of {line, severity, messageFragment} -- both examples-compile.test.ts's own sidecar (no LS diagnostic exists for any construct fixed in this phase) and the README document this."

requirements-completed: []  # EXMP-01 also declared by 100-06 (not yet run) -- shared-ID gate, not marked here

coverage:
  - id: D1
    description: "bbj-vscode/test/examples-compile.test.ts exists with an always-on layer (parses/validates every examples/*.bbj, asserts examples/invalid/ sidecar pairing and diagnostics) and a BBj-gated layer (RUN_BBJ_TESTS=1, compiles every file with bbjcpl, asserts the folder split agrees with the compiler)"
    requirement: "EXMP-01"
    verification:
      - kind: integration
        ref: "bbj-vscode/test/examples-compile.test.ts (RUN_BBJ_TESTS=0 -- always-on layer)"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/examples-compile.test.ts (RUN_BBJ_TESTS=1 -- BBj-gated layer)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every example under examples/ either compiles with bbjcpl or lives in examples/invalid/ with an asserted sidecar; a fresh full sweep confirms 92 compile, 1 (deliberately invalid) fails"
    requirement: "EXMP-01"
    verification:
      - kind: other
        ref: "scratch sweep script (spawnSync bbjcpl -N per file, stdout+stderr concatenated) run before and after this plan's edits"
        status: pass
    human_judgment: false
  - id: D3
    description: "The two hardcoded copies of issue650-composer-cues.bbj's failing line in installed-extension-e2e.test.ts stay in sync with the repaired example, and the addwindow-cue tests that quote it still pass"
    requirement: "EXMP-01"
    verification:
      - kind: integration
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts -t \"addwindow\""
        status: pass
    human_judgment: false

# Metrics
duration: 40min
completed: 2026-09-21
status: complete
---

# Phase 100 Plan 05: examples/ Compile-Clean Summary

**Every one of the 92 real programs under `examples/` now compiles with `bbjcpl`; the one construct whose whole point is a compiler rejection moved to a new `examples/invalid/` folder with a sidecar, asserted by a new two-layer `examples-compile.test.ts`.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-09-21T22:43:57Z (previous plan's close)
- **Completed:** 2026-09-21T23:21:00Z
- **Tasks:** 3 (2 produced commits; Task 3 was a verification-only close-out)
- **Files modified:** 17 examples repaired, 1 example split into a new invalid pair, 1 test file's two hardcoded strings updated, 1 new test file, 1 new README

## Accomplishments

- Re-swept all 92 `.bbj` programs under `examples/` against the real `/opt/bbx/bin/bbjcpl` compiler on the tree this plan started from (the plan's own frontmatter expected 92/17; the fresh sweep confirmed exactly that before any edit).
- Built a disposition table by reading every failing file and probing repair candidates directly against `bbjcpl` (never guessed) -- every one of the 17 originally-failing files turned out to have a valid, compiler-accepted repair that keeps the construct it demonstrates. Only one already-planned split (`dim-examples.bbj`'s three bare substring-expression statements) produces a genuinely-invalid file.
- Created `bbj-vscode/test/examples-compile.test.ts` with an always-on layer (runs everywhere, parses/validates every valid example and asserts every `examples/invalid/` file's sidecar) and a BBj-gated layer (`RUN_BBJ_TESTS=1`, compiles every file with `bbjcpl`, asserts the folder split agrees with the compiler -- one spawn per file, 15s bounded timeout, a timeout counts as that file's failure).
- Created `examples/invalid/` with a README documenting the sidecar format (`<name>.expected.json`, `diagnostics: "none-today" | ExpectedDiagnostic[]`) and one sidecar-paired file: `dim-examples-substring-expressions.bbj`.
- Repaired all 17 originally-failing examples in place (details below), re-running the compile sweep after each family of edits.
- Updated the two hardcoded copies of `issue650-composer-cues.bbj`'s failing line in `bbj-vscode/test/functional/installed-extension-e2e.test.ts` in the same commit as the example's repair.
- Ran a fresh full sweep and both test layers at the end: 92 compile clean, 1 (deliberately invalid) fails, both layers green, the three single-file-reference tests (`textmate-bbx-highlighting.test.ts`, `utils.test.ts`, `installed-extension-e2e.test.ts`) all resolve their paths, whole suite green on `numFailedTests` apart from the documented pre-existing baseline.

## Task Commits

1. **Task 1: End-to-end proof -- test infra, one repair, one move** - `4e528881` (feat)
2. **Task 2: The remaining 15 repairs and the cross-file update** - `874d5450` (fix)

_Task 3 (close the loop) produced no code changes -- it re-ran the sweep and both test layers from scratch and confirmed the whole-suite and single-file-reference checks; see "Deviations" for what it found relative to the plan's own expectations._

## Files Created/Modified

- `bbj-vscode/test/examples-compile.test.ts` - the new two-layer test (EXMP-01)
- `examples/invalid/README.md` - sidecar format + one line per file in the folder
- `examples/invalid/dim-examples-substring-expressions.bbj` - the split-out invalid construct
- `examples/invalid/dim-examples-substring-expressions.expected.json` - its sidecar (`"none-today"`)
- `examples/dim-examples.bbj` - three bare substring-expression statements removed (split, D-17)
- `examples/mnemonics.bbj` - `ABS` → `ABS$` (unsuffixed variable assigned a string)
- `examples/files.bbj` - `DIRECT`'s keySize/records/recSize given numeric values, not strings
- `examples/imports/issue50.bbj` - added `use ::./importMe.bbj::ImportMe`; FIELD/METHOD gained visibility+STATIC; parameter suffixed; `''` → `""`; instance created for the instance-method call
- `examples/imports/onlyStaticField.bbj` - `use` statement + bare class-qualified field read
- `examples/issue181-release-syntax.bbj` - `exitcode$` → `exitcode` (RELEASE takes a numeric expression); FIELD name suffixed
- `examples/issue182-clipfromstr-syntax.bbj` - `bytes$` given a string value instead of a number
- `examples/issue198-member-access-levels-instance.bbj` - fields suffixed, methods given `void`, `#this!.fieldProtected` → `#fieldProtected`
- `examples/issue198-member-access-levels-static.bbj` - fields suffixed, methods given `void`
- `examples/issue207-member-access-levels-auto-getter-setter.bbj` - self-referential field name suffixed
- `examples/issue224.bbj` - `array` → `array$`; duplicate `READ RECORD(...)*,A$` line's leading `*,` removed
- `examples/issue246.bbj` - `fileopen`/`filesave` return values assigned instead of discarded
- `examples/issue44-return.bbj` - `def identity` → `def fnidentity`
- `examples/issue650-composer-cues.bbj` - colon join → semicolon join between two window-creation calls
- `examples/issue_378_class_bbjstring_bbjnumber.bbj` - two colliding field names given distinct names
- `examples/msgbox.bbj` - icon/flags argument `"IconInfo"` → `64` (numeric)
- `examples/using-java.bbj` - method given `void` return type
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - both hardcoded copies of the composer-cue line updated to the semicolon join

## Decisions Made

- **A class's own field is read via `#fieldName`, never `#this!.fieldName`.** Confirmed by direct probe: `#this!.fieldPublic` (read or write) is rejected by `bbjcpl` in every combination tried (same class, subclass, any visibility, any suffix on the target), while `#this!.methodName()` (a method call) and `#fieldName` (the bare hash form) both compile clean. This is not documented anywhere available offline; it was established empirically because `issue198-member-access-levels-instance.bbj`'s own `#this!.fieldProtected` line needed a real fix, not a suffix change.
- **RELEASE takes a numeric expression.** `issue181-release-syntax.bbj`'s `exitcode$` (string-suffixed) never worked as a RELEASE argument in any combination; dropping the suffix (keeping the value `1`) fixed every RELEASE line in one edit. Kept as a repair, not a split, since the file's whole point (`RELEASE` with a variable, a negated expression, and no argument) survives intact and no line's point is "this is a type error."
- **`fileopen`/`filesave` are valid BBj functions whose return value must be assigned; `MODE=` was never the problem.** This directly overturns the plan's own D-18 disposition for `issue246.bbj` (move to `examples/invalid/` + file a todo) -- see Deviations below.

## Deviations from Plan

### Auto-fixed Issues

None -- every change here is example content or test infrastructure the plan itself scoped, not an unplanned bug fix.

### Plan-vs-compiler disagreements (per the executor's explicit instructions to follow the compiler)

**1. `issue246.bbj`: repaired, not moved -- no todo filed.**
- **Plan's disposition:** move to `examples/invalid/` with an explicit no-diagnostic-today sidecar entry, file `.planning/todos/pending/2026-09-21-file-dialog-functions-accepted-on-a-false-premise.md` recording that `fileopen`/`filesave` were added to the grammar on a false premise.
- **What the compiler actually says:** `fileopen("Open Server File", "", "", "", "", MODE="CLIENT")` used as a bare statement (return value discarded) is rejected; the identical call assigned to a variable (`x$ = fileopen(...)`) compiles clean. Probed with and without `MODE=`, with and without the assignment, with a renamed target -- the discriminator is only "is the result assigned." `MODE=` was never the problem, matching the plan's own finding for `msgbox.bbj`.
- **Action taken:** repaired in place (`x$ = fileopen(...)`, `y$ = filesave(...)`); no move, no `examples/invalid/` sidecar, no todo file created. `.planning/todos/pending/2026-09-21-file-dialog-functions-accepted-on-a-false-premise.md` was **not** created (it is listed in the plan's `files_modified` frontmatter but the fact on the ground no longer supports it).
- **Files affected:** `examples/issue246.bbj`
- **Committed in:** `874d5450`

**2. `issue181-release-syntax.bbj`: repaired, not split.**
- **Plan's family framing:** "carries a type error next to valid release forms" -- implying D-17 (split the erroneous line into `examples/invalid/`).
- **What the compiler actually says:** the single root cause (`exitcode$`'s `$` suffix; RELEASE wants a numeric argument) is fixable by dropping the suffix everywhere it appears, with zero loss to any of the RELEASE forms the file demonstrates (with a variable, with a negated expression, bare). A split would have thrown away working content for no reason once the actual repair was found.
- **Action taken:** repaired in place; no split, no new `examples/invalid/` entry for this file.
- **Files affected:** `examples/issue181-release-syntax.bbj`
- **Committed in:** `874d5450`

**3. `files.bbj`'s `direct` line: the plan's family guess ("a verb with one argument too many") was wrong -- fixed as a value-type mismatch instead.**
- **What the compiler actually says:** `DirectStatement`'s grammar shape (`fileId, keySize, records, recSize, Err?`) was always right and the original 4-argument-plus-`err=` call already matched it; the failure was that `keySize`/`records`/`recSize` were given string literals instead of numbers. Confirmed by probing arg counts from 1 to 4 (all failed) before finding the actual value-type cause.
- **Action taken:** repaired the three argument values to numbers (`direct "a",4,10,20,err=errorCase`); no argument removed.
- **Files affected:** `examples/files.bbj`
- **Committed in:** `874d5450`

### Impact

None of these deviations touch the grammar, the lexer, or a validator -- all three are example-content-only corrections, discovered by probing every candidate repair against the real compiler rather than trusting either the plan's or the prior research session's characterization where the tree had moved or the probe methodology differed. The net effect is a **smaller** diff than the plan anticipated: no todo file, no second `examples/invalid/` entry beyond the one the plan itself called out as the Task 1 proof case.

**Total deviations:** 3, all "plan disposition vs. compiler verdict" corrections per the executor's explicit instruction to follow the compiler. **Impact on plan:** all three left `examples/invalid/` smaller than planned (1 file instead of the 2-3 the frontmatter implied) and skip creating the planned todo file -- both are net simplifications, not scope creep.

## Issues Encountered

- **`validationHelper` cannot resolve `examples/imports/*.bbj`'s relative-path cross-file imports.** Validating a file in isolation (no sibling document pre-registered under the same services instance) produces a "File '...' could not be resolved" diagnostic that a real multi-file workspace build resolves fine (confirmed by reading `bbj-document-builder.ts`'s own re-check pass, which only runs through the full pipeline this project's test conventions forbid using in tests). Excluded this diagnostic class from the always-on layer's assertion the same way `DocumentValidator.LinkingError` already is, for the identical underlying reason (this single-document harness cannot fully exercise cross-file resolution) -- documented in a code comment in `examples-compile.test.ts`.
- **3 pre-existing `linking.test.ts` failures, unrelated to this plan.** `Case insensitive access to BBjAPI`, `BBjAPI() resolves without Java interop`, and `BBjAPI() variable has correct type` fail in the whole-suite run with `java-interop` reachable on `:5008` -- all three assert `BBjAPI()` resolves as a built-in class using inline BBj source unrelated to any file this plan touches. This falls in the same documented category as the project's other linking.test.ts/interop environment-drift entries (CLAUDE.md's standing memory: "Interop backend getAllClassNames test drift... linking.test.ts interop... tests fail locally; env drift, not a regression"), just manifesting as a different specific test set than previously logged. Not fixed -- out of this plan's scope (`bbj-validator.ts`/interop untouched here, and this plan is explicitly forbidden from touching validators).
- **`installed-extension-e2e.test.ts`'s SETOPTS-in-code suite failed with "No document found for URI"** for an unrelated fixture (`issue475-setopts-in-code.bbj`) during one full-suite run -- the documented stale-bundle/cold-resolution live-VSCode-extension flakiness (CLAUDE.md's "Java interop cold-resolution gotcha" memory). The `addwindow`-cue tests this plan actually touches (`-t "addwindow"`) pass cleanly in isolation every time they were run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `examples/` is fully compiler-clean: 92 programs compile, 1 deliberately-invalid program lives in `examples/invalid/` with an asserted sidecar. `bbj-vscode/test/examples-compile.test.ts` keeps this from drifting again.
- `EXMP-01` is **not** marked complete in REQUIREMENTS.md -- `100-06-PLAN.md` also declares it and has not run yet (shared-ID gate, per this plan's own working rules).
- `examples/invalid/`'s README and sidecar convention are ready for `100-06` (or any later plan) to add more deliberately-invalid examples without inventing a new format.
- The three pre-existing `linking.test.ts` BBjAPI failures and the `installed-extension-e2e.test.ts` cold-resolution flake are unresolved and out of this plan's scope; carry them forward as known environment noise, not phase-blocking.

---
*Phase: 100-parser-gaps-remaining-groups-long-tail-examples*
*Completed: 2026-09-21*

## Self-Check: PASSED

- All 4 key created files found on disk.
- Both commit hashes (`4e528881`, `874d5450`) found in `git log`.
- Fresh full compile sweep: 92/92 examples outside `examples/invalid/` compile clean, 1/1 inside it fails, matching the SUMMARY's own counts.
- `RUN_BBJ_TESTS=1 npx vitest run test/examples-compile.test.ts`: 6/6 passed.
- Register check over the plan's whole diff (`examples` + `bbj-vscode`): no match.
