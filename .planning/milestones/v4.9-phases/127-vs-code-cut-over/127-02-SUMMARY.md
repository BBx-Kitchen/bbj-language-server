---
phase: 127-vs-code-cut-over
plan: 02
subsystem: vscode-client
tags: [formatter, removal, vsix, supply-chain, vitest, child_process]

requires:
  - phase: 127-vs-code-cut-over
    provides: "plan 01 moved Denumber to the language server, so the client keeps no formatter or denumber jar path"
provides:
  - "document-formatter, formatter-java-resolver and formatter-verifier modules, their four tests and bbj-vscode/tools/formatter deleted"
  - "bbj.formatter.javaPath removed from the VS Code configuration schema"
  - "child_process importer guard narrowed to two launchers"
  - "test/formatter-removal.test.ts absence suite"
affects: [127-03 formatter settings schema, 127-06 VSIX file list and hand check, documentation and QA migration phase]

actuals:
  tokens: 2500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "absence suite: import-based scan while a module still names its siblings in comments, plain text scan once all are gone"

key-files:
  created:
    - bbj-vscode/test/formatter-removal.test.ts
  modified:
    - bbj-vscode/test/no-shell-command-construction.test.ts
    - bbj-vscode/package.json
    - bbj-vscode/README.md

key-decisions:
  - "Left src/language/bbj-format-settings.ts untouched: its normalizer keeps dropping a javaPath value a user left in settings.json"
  - "Left .vscodeignore and the IntelliJ build file untouched: tools/ ships by default and the IntelliJ build copies only the three .bbj tools, so deleting the directory is the whole packaging fix"

requirements-completed: [CUT-02, SET-04]

coverage:
  - id: D1
    description: "The three formatter modules, their four tests and the vendored tools/formatter directory (three jars, README, bom) are gone and pinned absent"
    requirement: CUT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/formatter-removal.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exactly two modules under src import child_process"
    requirement: CUT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/no-shell-command-construction.test.ts#the set of files under src/ importing child_process is exactly the two known launchers"
        status: pass
    human_judgment: false
  - id: D3
    description: "The packaged extension lists no jar and nothing under tools/formatter, and still lists the three tools/*.bbj files"
    requirement: CUT-02
    verification:
      - kind: other
        ref: "npx vsce ls --no-dependencies filtered for tools/formatter and .jar"
        status: pass
    human_judgment: false
  - id: D4
    description: "bbj.formatter.javaPath is no longer declared and nothing in the client reads it; a leftover user value is dropped by the language server normalizer"
    requirement: SET-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/formatter-removal.test.ts#package.json no longer declares the bbj.formatter.javaPath setting"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-format-settings.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "VS Code reports no error for a leftover bbj.formatter.javaPath in settings.json once the key is undeclared"
    requirement: SET-04
    verification: []
    human_judgment: true
    rationale: "Vendor behaviour of the VS Code settings editor; not probed in planning, confirmed in the phase hand check"

duration: 2min
completed: 2026-10-03
status: complete
---

# Phase 127 Plan 02: Remove the client-side formatter Summary

**Deleted the jar-launching formatter (three modules, four tests, three vendored jars) and the bbj.formatter.javaPath setting, left exactly two child_process launchers, and added an absence suite so the jar cannot return.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-10-03T09:31:41Z
- **Completed:** 2026-10-03T09:33:56Z
- **Tasks:** 3
- **Files modified:** 16 under bbj-vscode (130 insertions, 2101 deletions)

## Accomplishments

- The jar-launching formatter module, the java resolver and the jar verifier are gone from `src/`, together with their four tests and the five tracked files under `bbj-vscode/tools/formatter` (BBjCFCli.jar, BBjCodeFomatter.jar, jcommander-1.71.jar, lib/README.md, lib/bom.json).
- `bbj.formatter.javaPath` is no longer in `package.json`; the other formatter keys and `bbj.denumber.promptOnOpen` are unchanged.
- The `child_process` importer guard now pins `['Commands/process-runner.ts', 'language/bbj-cpl-service.ts']`; the five tests that read the deleted module and their comment blocks are removed.
- The README feature line reads "Code Formatting through the BBj language server (needs BBjServices from BBj 26.03 or later)".
- `test/formatter-removal.test.ts` (13 tests) pins the removal: modules and tests absent, no import of them, plain text scan of `src/` for the removed names, no `javaPath` in the manifest, no `tools/formatter` directory, no `.jar` under `tools/`, the three `.bbj` tools still present, and no `tools/formatter` text in the IntelliJ build file.

## VSIX file list (tools/ lines of `npx vsce ls --no-dependencies`)

```
tools/em-login.bbj
tools/em-validate-token.bbj
tools/web.bbj
```

No line names `tools/formatter` or ends in `.jar`.

## Task Commits

1. **Task 1: formatter module gone, launcher guard pins two, absence suite created** - `aed5c171` (refactor)
2. **Task 2: javaPath setting and its resolver gone together** - `cbedc828` (refactor)
3. **Task 3: jar verifier and vendored formatter files gone** - `06c81df9` (refactor)

**Plan metadata:** the commit carrying this SUMMARY (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/test/formatter-removal.test.ts` - absence guard for the removed formatter
- `bbj-vscode/test/no-shell-command-construction.test.ts` - launcher set narrowed to two, formatter-specific tests removed
- `bbj-vscode/package.json` - configuration without `bbj.formatter.javaPath`
- `bbj-vscode/README.md` - feature line names the language server as the formatter
- Deleted: `src/document-formatter.ts`, `src/formatter-java-resolver.ts`, `src/formatter-verifier.ts`, `test/document-formatter.test.ts`, `test/formatter-java-resolver.test.ts`, `test/formatter-verifier-tamper.test.ts`, `test/formatter-pins-drift.test.ts`, `tools/formatter/**` (five files)

## Decisions Made

- Kept the `javaPath`-dropping normalizer in `src/language/bbj-format-settings.ts` as the backstop for a value a user left behind.
- Did not edit `.vscodeignore`, the IntelliJ build file, REQUIREMENTS.md, `documentation/` or `QA/`, per the plan.
- Did not mark CUT-02 or SET-04 complete in REQUIREMENTS.md: the plan's executor rules forbid editing that file, so the requirement ids are recorded in `requirements-completed` above only.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first task commit was issued with a redundant `-c core.hooksPath=.git/hooks` flag. The repository configures no hooks path and has only a `pre-push` hook installed, so no commit hook was bypassed; the flag was dropped for the remaining commits.

## Verification

All run with cwd `bbj-vscode`:

- Task 1 verify (formatter-removal, no-shell-command-construction, extension-activation vitest files; `typecheck:test`; `lint`; `build`): pass, 56 tests.
- Task 2 verify (JSON parse of package.json; formatter-removal, bbj-format-settings, bbj-format-settings-intake, activation-command-coverage; `typecheck:test`; `lint`; `build`): pass, 40 tests.
- Task 3 verify (formatter-removal, no-shell-command-construction; `typecheck:test`; `lint`; `build`; the `vsce ls` check): pass, 20 tests.
- Plan-level verification (formatter-removal, no-shell-command-construction, bbj-format-settings, bbj-format-settings-intake): 4 files, 50 tests, 0 failed.
- `git grep` for the removed names across `bbj-vscode`, `bbj-intellij`, `.github` and `java-interop` finds only `test/formatter-removal.test.ts`, which names them to assert their absence.
- A scan of the added diff lines for planning identifiers (plan, decision, requirement and review ids) found none.
- Every intermediate commit was green on build, lint, `typecheck:test` and the absence, launcher and settings suites.

## Known Stubs

None.

## Threat Flags

None. The change removes execution surface (T-127-06, T-127-07) and adds none.

## Next Phase Readiness

- Plan 127-03 can now rewrite the `bbj.formatter.*` block in `package.json` without a `javaPath` entry in the way.
- Outstanding for the phase hand check: confirm VS Code shows a leftover `bbj.formatter.javaPath` in `settings.json` as an unknown setting without an error (flagged assumption). Mentions of the jar and BBjCodeFormatter remain in `documentation/` and `QA/` for the Docs and Migration phase; VSIX files and installed extensions outside the repository carry the jar until reinstalled.

## Self-Check: PASSED

- Created file present: `bbj-vscode/test/formatter-removal.test.ts`.
- Deleted paths absent from disk: `src/document-formatter.ts`, `src/formatter-java-resolver.ts`, `src/formatter-verifier.ts`, `tools/formatter`.
- Commits found: `aed5c171`, `cbedc828`, `06c81df9`.

---
*Phase: 127-vs-code-cut-over*
*Completed: 2026-10-03*
