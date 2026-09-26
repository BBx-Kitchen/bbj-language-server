---
phase: 110-workspace-settings-filesystem-trust
plan: 04
subsystem: extension-host
tags: [formatter, child_process, java, security, vscode-settings]

# Dependency graph
requires: []
provides:
  - "formatter-java-resolver.ts: resolveFormatterJava/checkJavaExecutable/findJavaOnPath, a plain injectable-probes module that resolves and verifies the formatter's java executable"
  - "bbj.formatter.javaPath (machine-scoped setting) wired through document-formatter.ts's runFormatter, replacing the bare cp.spawn('java', ...) call"
affects: []

# Actuals (#2632)
actuals:
  tokens: 10888
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain, Langium-free resolver module (formatter-java-resolver.ts) mirroring bbj-home-layout.ts's isExecutableFile/resolveBbjBinary { path?, reason? } result shape"
    - "A once-per-exact-message Set<string> dedups a pre-spawn refusal toast across repeated format-on-save invocations, mirroring the existing checksum-mismatch toast pattern"

key-files:
  created:
    - bbj-vscode/src/formatter-java-resolver.ts
    - bbj-vscode/test/formatter-java-resolver.test.ts
  modified:
    - bbj-vscode/src/document-formatter.ts
    - bbj-vscode/package.json
    - bbj-vscode/test/document-formatter.test.ts
    - bbj-vscode/test/no-shell-command-construction.test.ts
    - documentation/docs/vscode/configuration.md

key-decisions:
  - "Followed D-18..D-20 exactly as written: bbj.formatter.javaPath is machine-scoped so a workspace cannot choose the spawned binary; a set value is checked and never replaced by a PATH fallback; an empty value is resolved by the module's own PATH walk, checked the same way"
  - "Task 1 implemented the full resolver (including the win32 PATHEXT walk, quoted-entry stripping and platform-specific isAbsolute) in one pass rather than splitting POSIX-only into Task 1 and Windows handling into Task 2, since both branches share the same small function and splitting them would have meant a half-finished findJavaOnPath sitting mid-plan"

patterns-established:
  - "checkJavaExecutable/findJavaOnPath/resolveFormatterJava all take an optional deps object (env, platform, exists, isFile, isExecutable) defaulting to real Node probes, the same injectable-module shape as config-path-resolver.ts and bbj-home-layout.ts"

requirements-completed: [SEC-09]

coverage:
  - id: D1
    description: "package.json declares bbj.formatter.javaPath (string, default \"\", scope machine) next to the other bbj.formatter.* settings, describing it as an absolute java path where empty means PATH lookup"
    requirement: SEC-09
    verification:
      - kind: unit
        ref: "test/formatter-java-resolver.test.ts#package.json manifest > declares bbj.formatter.javaPath with type string, default \"\" and scope machine"
        status: pass
    human_judgment: false
  - id: D2
    description: "A configured javaPath is checked (absolute, exists, regular file after symlinks, executable) and spawned as-is on success, or refuses with an error naming the configured path and the problem, never falling back to PATH"
    requirement: SEC-09
    verification:
      - kind: unit
        ref: "test/formatter-java-resolver.test.ts#resolveFormatterJava (relative/nonexistent/non-file/non-executable/accepted cases)"
        status: pass
      - kind: integration
        ref: "test/document-formatter.test.ts#formatter java executable > an accepted resolution is passed as the first argument of cp.spawn ... synchronously"
        status: pass
      - kind: integration
        ref: "test/document-formatter.test.ts#formatter java executable > a refusal rejects the format promise, never spawns, and shows an error message with the refusal reason"
        status: pass
      - kind: integration
        ref: "test/document-formatter.test.ts#formatter java executable > the real resolver refuses a non-executable configured file and accepts an executable one, end to end"
        status: pass
    human_judgment: false
  - id: D3
    description: "An empty javaPath makes the formatter walk PATH itself (and PATHEXT on Windows), check the first hit the same way, and spawn its absolute path; no hit shows an error naming the setting"
    requirement: SEC-09
    verification:
      - kind: unit
        ref: "test/formatter-java-resolver.test.ts#findJavaOnPath and #win32 (PATHEXT order, default extensions, quoted entry, first-hit semantics, relative/empty entries skipped)"
        status: pass
      - kind: unit
        ref: "test/formatter-java-resolver.test.ts#real filesystem (POSIX permission checks) > findJavaOnPath finds a later PATH entry, accepts a symlinked executable, and refuses a directory named java"
        status: pass
    human_judgment: false
  - id: D4
    description: "The launcher guard (no-shell-command-construction.test.ts) states the real trust boundary after SEC-09 and pins resolveFormatterJava's import and its ordering before cp.spawn"
    requirement: SEC-09
    verification:
      - kind: unit
        ref: "test/no-shell-command-construction.test.ts#document-formatter.ts imports resolveFormatterJava from formatter-java-resolver"
        status: pass
      - kind: unit
        ref: "test/no-shell-command-construction.test.ts#document-formatter.ts calls resolveFormatterJava( before cp.spawn("
        status: pass
      - kind: unit
        ref: "test/no-shell-command-construction.test.ts#document-formatter.ts never spawns a string literal as the java executable"
        status: pass
    human_judgment: false
  - id: D5
    description: "The setting and its behavior are documented in configuration.md's Formatter Settings section"
    verification:
      - kind: other
        ref: "grep -c bbj.formatter.javaPath documentation/docs/vscode/configuration.md -> 2"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-09-26
status: complete
---

# Phase 110 Plan 04: Formatter Java Binary Trust Summary

**A new machine-scoped `bbj.formatter.javaPath` setting, resolved and verified by the new `formatter-java-resolver.ts` module, replaces the formatter's bare `cp.spawn('java', ...)` — a set value is checked and spawned as-is or refused with a named error, and an empty value is resolved by the module's own checked PATH walk (issue #605).**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-26T11:53:00Z
- **Completed:** 2026-09-26T12:00:45Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- `formatter-java-resolver.ts` exports `JAVA_PATH_SETTING`, `JavaResolverDeps`, `FormatterJavaResolution`, `checkJavaExecutable`, `findJavaOnPath`, and `resolveFormatterJava` — a plain module (no Langium/editor/`child_process` imports) with injectable env/fs probes
- `checkJavaExecutable` checks, in order: absolute (per-platform), exists, is a regular file (symlinks followed), is executable (`fs.accessSync(X_OK)`, existence-only on Windows)
- `findJavaOnPath` walks PATH (case-insensitive `PATH`/`Path` key and `PATHEXT` lookup on win32, quoted-entry stripping, relative/empty entries skipped, `.COM;.EXE;.BAT;.CMD` default extension order), returning the first entry whose candidate exists — the caller checks only that single hit, so a later PATH entry is never silently substituted for a failing first hit
- `resolveFormatterJava` composes both: a non-empty configured string is checked and returned or refused (naming the configured value and the problem) without ever consulting PATH; a non-string configured value is refused the same way; `undefined`/`null`/blank all fall through to the PATH walk, which is refused (naming PATH and the setting) on no hit, or checked and returned/refused (naming the hit) on a hit
- `document-formatter.ts`'s `runFormatter` calls `resolveFormatterJava(configuredJavaPath)` after the existing SHA-256 artefact verification and before the spawn, still synchronously inside the Promise executor; a refusal logs `logger.warn`, shows a once-per-exact-message `showErrorMessage` toast, and rejects with `FormatterArtifactError` (never spawning); an accepted resolution spawns exactly that absolute path with the unchanged argument list
- `package.json` declares `bbj.formatter.javaPath` (`type: string`, `default: ""`, `scope: machine`) next to the other `bbj.formatter.*` settings, so a workspace `.vscode/settings.json` cannot choose the spawned binary
- `documentation/docs/vscode/configuration.md` gains a `bbj.formatter.javaPath` entry describing the setting, its default, and that it is user-settings-only
- `no-shell-command-construction.test.ts`'s launcher-pin comment now states the real trust boundary (the java executable is either the machine-scoped setting or the resolver's own checked PATH-walk hit) and gains three new pins: the `resolveFormatterJava` import, its call ordering before `cp.spawn(`, and that `cp.spawn(` is never called with a string literal
- New test file `formatter-java-resolver.test.ts` (44 tests) covers every resolver behavior row with injected probes, real-filesystem POSIX permission/symlink/directory cases, win32 PATHEXT/quoting/first-hit cases via injected probes, and a package.json manifest pin

## Task Commits

Each task was committed atomically:

1. **Task 1: A configured bbj.formatter.javaPath is verified and spawned as-is, or refused with an error, end to end** - `d7e0c7be` (feat)
2. **Task 2: The PATH walk follows Windows rules and is pinned against the real filesystem** - `683a34ab` (test)
3. **Task 3: Document the setting and correct the pinned-launcher rationale** - `71473860` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified
- `bbj-vscode/src/formatter-java-resolver.ts` - resolves and verifies the formatter's java executable (new)
- `bbj-vscode/src/document-formatter.ts` - `runFormatter` now resolves/verifies before spawning; `provideDocumentFormattingEdits` passes `config.javaPath` through
- `bbj-vscode/package.json` - new `bbj.formatter.javaPath` setting (machine scope)
- `bbj-vscode/test/formatter-java-resolver.test.ts` - resolver test suite (new)
- `bbj-vscode/test/document-formatter.test.ts` - mocks the resolver, adds a `formatter java executable` describe block, `freshEnv()` moved to outer scope so both describe blocks share it
- `bbj-vscode/test/no-shell-command-construction.test.ts` - corrected comment, three new pins
- `documentation/docs/vscode/configuration.md` - new setting entry

## Decisions Made
- Followed D-18 through D-20 exactly as CONTEXT.md specified — no deviations from the locked decisions.
- Implemented the full PATH-walk resolver (including the win32 branch: PATHEXT order, quoted-entry stripping, case-insensitive `PATH`/`PATHEXT` key lookup) in Task 1 rather than deferring the Windows handling to Task 2, since `findJavaOnPath` is one small function and both branches share its structure — see Deviations below.
- Chose a `Set<string>` keyed by exact refusal message (rather than a single boolean) for the once-per-session toast dedup, so a different refusal reason (e.g. the configured path changes) still gets its own toast instead of being silently swallowed by an earlier, different refusal.

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing critical functionality, or blocking issues were found; every change was already specified by the plan.

### Process Note (not a Rule 1-4 deviation)

**Task 2's TDD RED phase passed immediately (no failing test).** Task 1's implementation of `findJavaOnPath` already included the full win32 branch (PATHEXT order, quoted-entry stripping, case-insensitive PATH/PATHEXT key lookup) rather than a POSIX-only stub, because the plan's own Task 1 action text already specified the case-insensitive-`PATH`-key and platform-delimiter behavior, and the natural single implementation of the function covers both platforms with no meaningful "POSIX-only" intermediate shape. Per the investigation this fail-fast rule calls for: this is not a duplicate feature or a mis-scoped test — `formatter-java-resolver.ts` is new in this plan, so there is no pre-existing implementation Task 2's tests could be accidentally re-testing. Task 2's tests (win32 PATHEXT/quoting/first-hit and POSIX real-filesystem symlink/directory cases) were written and run, confirmed to pass against the already-correct implementation, and committed as a test-only commit — no production code change was needed for Task 2.

---

**Total deviations:** 0 auto-fixed (Rules 1-4 not triggered).
**Impact on plan:** None. The process note above documents an expected consequence of Task 1's action text already specifying full cross-platform behavior, not a defect.

## Issues Encountered

The whole-suite regression gate (`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`, cwd `bbj-vscode`) reported 4 failed test *files* but 0 failed *tests* (2823 passed, 100 skipped). Three are `beforeAll`/`initializeWorkspace` hook timeouts (`bbj-document-validator.test.ts`, `hover.test.ts`, `run-call-navigation.test.ts`) — the documented `initializeWorkspace` hook-contention pattern, unrelated to this plan's files (none of which touch Langium document building). The fourth, `test/functional/installed-extension-e2e.test.ts > installed extension e2e: SETOPTS-in-code (#475)`, is the project's documented pre-existing failure on the phase base (`c591cfe8`), named explicitly in this plan's executor rules; this plan's changed files (`formatter-java-resolver.ts`, `document-formatter.ts`, `package.json`, and the three test/doc files) do not intersect the SETOPTS/composer code path. This plan's own targeted verification commands (all three tasks' `<verify>` blocks) passed with 0 failures, and `npx tsc -p tsconfig.json` was clean after every task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SEC-09 is complete; issue #605 is addressed in code — the closing keyword goes in the milestone PR, not in these commits.
- `document-formatter.ts`, `formatter-java-resolver.ts`, and their tests are untouched by any other plan in this phase (disjoint files per the roadmap split), so no coordination is needed with 110-01/02/03/05.
- Manual UAT (bogus `bbj.formatter.javaPath`, confirm the error names the path and nothing formats) is deferred to VALIDATION.md at phase end, per the plan's `<verification>` section.
- No blockers for 110-05 (Workspace Trust gate) or the rest of Phase 110.

---
*Phase: 110-workspace-settings-filesystem-trust*
*Completed: 2026-09-26*

## Self-Check: PASSED
