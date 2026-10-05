---
phase: 127-vs-code-cut-over
plan: 04
subsystem: vscode-extension
tags: [vscode, bbjlst, decompile, commands-cjs, denumber-removal, vitest]

requires:
  - phase: 127-vs-code-cut-over
    provides: "plan 01 moved the Denumber command and the numbered-file prompt to bbj/denum, so nothing outside Commands.cjs referenced its denumber member"
provides:
  - "Commands.cjs without the denumber member and the decompile helper; decompileInPlace(resolvedFileName) with a fixed 'Decompiling BBj Program...' title"
  - "buildDecompileArgv without an option: always -l, -xlst for a .lst input, file name last"
  - "notTokenizedMessage(fileName) and a plain-text refusal in both decompile commands, before any leftover cleanup, temp directory or bbjlst launch"
  - "a source guard pinning that Commands.cjs and process-args.ts never mention denumbering"
affects: [127-05-activation-suite-mock-cleanup, 127-06-gate-and-hand-check]

actuals:
  tokens: 6100
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Refuse a non-tokenized input with isTokenizedFile inside the progress task, before any side effect, so withProgress is still called synchronously"

key-files:
  created: []
  modified:
    - bbj-vscode/src/Commands/process-args.ts
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/src/decompile-io.ts
    - bbj-vscode/test/command-argv-injection.test.ts
    - bbj-vscode/test/commands-cjs-execution.test.ts
    - bbj-vscode/test/commands-cjs-harness.ts
    - bbj-vscode/test/target-resolution.test.ts
    - bbj-vscode/test/decompile-io.test.ts

key-decisions:
  - "Both decompile commands share one refusal text and the same isTokenizedFile check on the original path, so a symlinked tokenized program is refused by both (the existing rule from issue #585); the real file decompiles normally"
  - "The refusal runs inside the progress task as the first statement of the try block (before deleteLeftoverLst in the in-place command, before mkdtempSync in the read-only one), leaving every later line of the tokenized flow byte-identical"
  - "-xlst stays in the argv builder: it is part of how bbjlst decompiles a .lst input"

patterns-established:
  - "Source guard over a CommonJS file the compiler does not check: a regex over the file text pinned in the suite that already reads Commands.cjs"

requirements-completed: [DEN-06]

coverage:
  - id: D1
    description: "buildDecompileArgv always emits -l (and -xlst for a .lst input) with the file name last and verbatim; it has no denumber option"
    requirement: "DEN-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/command-argv-injection.test.ts#process-args - buildDecompileArgv"
        status: pass
    human_judgment: false
  - id: D2
    description: "Decompile (Replace) and Decompile (Read-only) still turn a tokenized program into source through bbjlst in one step, with the same argv, title, failure message and temp-dir read-only flow"
    requirement: "DEN-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/commands-cjs-execution.test.ts#Commands.cjs decompileReplace / decompileReadonly"
        status: pass
    human_judgment: false
  - id: D3
    description: "Commands.cjs exports no denumber member, has no decompile helper, and neither Commands.cjs nor process-args.ts mentions denumbering anywhere"
    requirement: "DEN-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#the bbjlst launch path never denumbers (source guard)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/commands-cjs-execution.test.ts#the loaded Commands object has no member for the removed bbjlst line-number command"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both decompile commands refuse a plain-text file with a warning, launch no process, create no temporary directory, open nothing and leave the file unchanged"
    requirement: "DEN-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/commands-cjs-execution.test.ts#decompileReplace refuses a plain-text file"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/commands-cjs-execution.test.ts#decompileReadonly refuses a plain-text file"
        status: pass
    human_judgment: false
  - id: D5
    description: "A symlinked tokenized program is refused by both decompile commands because isTokenizedFile treats a non-regular file as not tokenized"
    requirement: "DEN-06"
    verification: []
    human_judgment: true
    rationale: "The behaviour follows from the existing isTokenizedFile rule (issue #585) and is a flagged assumption of the plan; no test drives a symlink through the two commands, so a human should confirm that refusing a symlinked tokenized file is the wanted outcome"

duration: 8min
completed: 2026-10-03
status: complete
---

# Phase 127 Plan 04: bbjlst denumber path removal Summary

**Commands.cjs no longer has a denumber member or a decompile helper, `buildDecompileArgv` always emits `-l` (`-xlst` kept for `.lst`), and both Decompile commands now refuse a plain-text file before touching bbjlst, while tokenized programs decompile exactly as before.**

## Performance

- **Duration:** 8 min
- **Completed:** 2026-10-03T09:50:00Z
- **Tasks:** 3
- **Files modified:** 8 (0 created, 8 modified)

## Accomplishments

- `buildDecompileArgv({ home, platform, fileName })` has no option any more: `['-l', file]`, or `['-l', '-xlst', file]` for a `.lst` input, file name last and verbatim. Argv for tokenized input is unchanged, since both callers already passed the option.
- `Commands.cjs` lost the `denumber` member and the `decompile` helper. `decompileInPlace(resolvedFileName)` takes only the resolved name, keeps `"Decompiling BBj Program..."` as its title, and lost the unlink branch that could not run any more. `decompileReplace` calls it directly.
- Both decompile commands run `isTokenizedFile` on the input first and, for anything else, show `"<name>" is not a tokenized BBj program, so there is nothing to decompile.` and return. In the in-place command that happens before `deleteLeftoverLst`; in the read-only command before `fs.mkdtempSync`. Nothing after the check changed.
- `Commands.cjs` and `process-args.ts` contain no "denumber" text at all, comments included, and a source guard in `decompile-io.test.ts` pins that; the `canRewriteInPlace` doc comment and one test comment were reworded to a plain-text example.

## Task Commits

1. **Task 1: argv always asks bbjlst for a listing without line numbers** - `f890ae19` (refactor; the argv tests were rewritten first and failed 2 of 55 against the old builder)
2. **Task 2: bbjlst line-number member, helper and option removed from Commands.cjs** - `23153416` (refactor)
3. **Task 3: both decompile commands refuse a plain-text file** - `8b7c4c34` (feat; the two refusal tests were written first and failed against the unguarded code)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/src/Commands/process-args.ts` - `buildDecompileArgv` without the option; rewritten doc comment
- `bbj-vscode/src/Commands/Commands.cjs` - member and helper removed, `decompileInPlace(resolvedFileName)`, `notTokenizedMessage`, the two refusal guards, comments reworded
- `bbj-vscode/src/decompile-io.ts` - `canRewriteInPlace` doc comment example reworded
- `bbj-vscode/test/command-argv-injection.test.ts` - three argv tests (no "no flags" case)
- `bbj-vscode/test/commands-cjs-execution.test.ts` - decompile describe on tokenized input, absent-member assertion, two refusal tests
- `bbj-vscode/test/commands-cjs-harness.ts` - member removed from the `CommandsModule` interface
- `bbj-vscode/test/target-resolution.test.ts` - test anchored on the removed helper deleted
- `bbj-vscode/test/decompile-io.test.ts` - wiring guard re-anchored on the new signature, no-denumber source guard, comment reworded

## Decisions Made

- The refusal check reads the original path in both commands, so a symlinked tokenized program is refused by both (existing `isTokenizedFile` rule, issue #585). This is recorded as coverage entry D5 with `human_judgment: true`.
- The read-only command's check is a pure insertion: no line of its tokenized flow was modified or removed (verified from the commit diff).
- `-xlst` stays in the argv builder for `.lst` input.

## Deviations from Plan

None - plan executed exactly as written.

Process notes, not deviations: the Task 1 runtime tests (decompile on tokenized input) passed before the production change, as the plan expects (both callers already passed the option), so only the argv tests were the RED signal for that task. The Task 3 RED run leaked one `bbj-decompiled-*` temp directory in `/tmp` (the unguarded read-only command ran on the plain-text file); it was identified by its contents and removed.

## Issues Encountered

- Two shell commands chained `cd` with `git` (the Task 2 and Task 3 `git add` calls). Nothing was blocked and no state was affected; later calls used `git -C` with absolute paths.
- `.planning/REQUIREMENTS.md` was not edited (this plan's rules say not to); DEN-06 is listed under `requirements-completed` here.

## Known Stubs

None.

## Threat Flags

None. The change removes a code path and adds a guard; no new network, auth or file-access surface. T-127-13 (plain-text rewrite) and T-127-15 (symlink/FIFO) are mitigated by the new checks; T-127-14 is unchanged (argv stays an array, file name one verbatim last element, metacharacter test kept).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 127-05: the activation suites still carry `denumber` in their Commands.cjs mocks, which that plan removes. No source file references the removed member.
- Open for the phase gate: confirm by hand that refusing a symlinked tokenized program is acceptable (coverage entry D5).

## Self-Check: PASSED

- FOUND commits: f890ae19, 23153416, 8b7c4c34 (all in `git log`)
- Plan verification: vitest over the named files (command-argv-injection, commands-cjs-execution, decompile-io, target-resolution, no-shell-command-construction, activation-command-coverage, activation-prompts-and-status-bars) all green; `npm run typecheck:test`, `npm run lint` and `npm run build` clean
- Acceptance greps re-run: no "denumber" in `Commands.cjs`, `process-args.ts`, `decompile-io.ts` or the harness; `buildDecompileArgv({` x2; `notTokenizedMessage(fileName)` x2; refusal line sits between `isTokenizedFile` and `deleteLeftoverLst` / before `mkdtempSync` and `execWithProgress`
- Planning-id grep over the code diff prints nothing; no unexpected file deletions

---
*Phase: 127-vs-code-cut-over*
*Completed: 2026-10-03*
