---
phase: 84-config-path-resolution-discoverability-foundation
plan: 03
subsystem: editor-integration
tags: [vscode, config-path, run-commands, bbjcpl, vitest]

requires:
  - phase: 84-01
    provides: "config-path-resolver.ts (resolveConfigPath, EM_CONFIG_SENTINEL), the bbj/resolvedConfigPath request/notification, BBjWorkspaceManager.getResolvedConfigPath()"
  - phase: 84-02
    provides: "config-path-cache.ts (getActiveConfigPath, getResolvedConfigPath) — the VS Code host's warm cache this plan's consumers read"
provides:
  - "Commands.cjs's openConfigFile, GUI run, and web-run read the resolved config path from config-path-cache.ts instead of a hardcoded {home}/cfg/config.bbx or the raw bbj.configPath setting"
  - "process-args.ts's buildRunArgv/buildWebRunArgv refuse the EM Config sentinel as a second defensive layer"
  - "compiler-options.ts's readerWithResolvedConfigFile — a reader wrapper injecting the resolved config path as -c only when nothing else claims it"
  - "bbj.configPath setting description (absolute-only, tilde expansion, stated default) and the renamed bbj.config command title"
affects: [84-04, 84-05, 84-06]

actuals:
  tokens: 7180
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Reader-wrapper substitution (readerWithResolvedConfigFile) over a plain CompilerConfigReader so an injected value flows through the exact same declaration-order loop and conflict rules an explicit value would"
    - "Source-guard tests over extracted CommonJS function bodies for Commands.cjs, since vi.mock('vscode') cannot reach a native require() inside a .cjs file (established elsewhere in this test suite, reconfirmed empirically before writing new tests)"

key-files:
  created:
    - bbj-vscode/test/config-path-consumers.test.ts
  modified:
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/src/Commands/process-args.ts
    - bbj-vscode/package.json
    - bbj-vscode/src/language/compiler-options.ts
    - bbj-vscode/src/language/compile-command.ts
    - bbj-vscode/test/compile-request.test.ts

key-decisions:
  - "openConfigFile's missing-file check reads getResolvedConfigPath()'s cached exists flag (matched against the active path) rather than a live fs check, because the resolved payload is the one source of truth for existence and the test suite's own convention (config-file-association.test.ts) seeds cache state with synthetic paths that never exist on the real filesystem."
  - "buildWebRunArgv's configPath is positional (web.bbj's ARGV(9)), so the sentinel guard replaces it with an empty string rather than omitting the argument, which would shift every later positional element; buildRunArgv's -c is a flag and is omitted entirely instead."
  - "readerWithResolvedConfigFile is a reader wrapper, not an edit to buildCompileOptionsFrom, so the injected value's argv position and the existing -c/-P conflict rule are provably unchanged whether the value came from injection or an explicit setting."

requirements-completed: [CFG-01]

coverage:
  - id: D1
    description: "Show-config opens the resolved file, or names the exact path it tried without falling back to the home default; the command title no longer implies config.bbx"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config-path-consumers.test.ts#Commands.cjs - Show-config and run paths read the resolved config path"
        status: pass
      - kind: other
        ref: "node -e (package.json contributions check) in the plan's Task 2 <verify>"
        status: pass
    human_judgment: false
  - id: D2
    description: "GUI run, BUI/DWC run, and web run all read the host's cached resolved config path (never a locally-guessed fallback), refusing to run when nothing can be resolved"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config-path-consumers.test.ts#Commands.cjs - Show-config and run paths read the resolved config path"
        status: pass
    human_judgment: true
    rationale: "The source-guard tests prove the wiring structurally (Commands.cjs cannot be exercised end-to-end under Vitest — vi.mock('vscode') never reaches its native require). Actually launching a GUI/BUI/DWC run in a live VS Code window against a resolved custom-named config file is not proven by this plan's automated suite."
  - id: D3
    description: "No run or compile argv can carry a -c/positional element equal to the EM Config sentinel"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config-path-consumers.test.ts#process-args - buildRunArgv / buildWebRunArgv refuse the EM Config sentinel"
        status: pass
    human_judgment: false
  - id: D4
    description: "bbjcpl's -c injects the resolved config path only when type checking is on, no explicit config-file is set, and no prefix-directories are given; an explicit config-file or prefix-directories setting is never overridden, and the argv position/conflict rule are unchanged"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config-path-consumers.test.ts#compiler-options - readerWithResolvedConfigFile"
        status: pass
      - kind: unit
        ref: "test/compile-request.test.ts (whole file, updated stub)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-06
status: complete
---

# Phase 84 Plan 03: Config Path Resolution & Discoverability Foundation Summary

**Every VS Code consumer of the config path — the Show-config command, all four run paths, and bbjcpl's `-c` option — now reads the one resolved path the language server pushed, with sentinel guards as a second defensive layer and the `-c` injection built as a reader wrapper so bbjcpl's existing argv position and conflict rules stay provably unchanged.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-06T15:09:00Z (approx.)
- **Completed:** 2026-09-06T15:35:00Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `Commands.cjs`'s `openConfigFile` no longer hardcodes `{home}/cfg/config.bbx`. It reads
  `getActiveConfigPath()` from `config-path-cache.ts`; when nothing is configured it names the
  `bbj.configPath` setting in an error, and when the resolved payload reports the file missing
  it names the exact attempted path — neither case opens a document or falls back to the home
  default.
- The GUI `run` function and the web-run path (`runBUI`/`runDWC`) both read the same cached
  resolved path through `stripSentinel`, refusing to run with a guessed path when nothing can
  be resolved, replacing the raw `bbj.configPath` reads and the web-run's home-derived
  fallback.
- `process-args.ts`'s `buildRunArgv` refuses the EM Config sentinel (`--`) by omitting `-c`
  entirely; `buildWebRunArgv` replaces the sentinel with an empty positional element instead
  (its `configPath` is `web.bbj`'s `ARGV(9)`, so omitting it would shift every later argument).
- `compiler-options.ts` exports `readerWithResolvedConfigFile`, a `CompilerConfigReader`
  wrapper that substitutes the resolved config path for `typeChecking.configFile` only when
  type checking is on, no explicit config-file is set, and no prefix-directories are given.
  `compile-command.ts` applies it before the output-location guard and before
  `validateOptionsFrom`, so validation sees exactly what the compiler will see.
- `bbj.configPath`'s setting description now states the resolver's actual rules (absolute-only,
  leading-tilde expansion, the `{bbj.home}/cfg/config.bbx` default), and the `bbj.config`
  command is retitled "Show the Active Config File" — no filename promise.

## Task Commits

Each task was committed atomically:

1. **Task 1: Show-config command and run paths read the resolved path** - `1a462a58` (feat)
2. **Task 2: Setting description and command title tell the truth** - `431da086` (docs)
3. **Task 3: Compile passes the resolved config path as -c when nothing else claims it** - `bf50fe16` (feat)

## Files Created/Modified

- `bbj-vscode/test/config-path-consumers.test.ts` - sentinel-guard behavioral tests for
  `buildRunArgv`/`buildWebRunArgv`, source-guard tests for `Commands.cjs`'s command paths, and
  behavioral tests for `readerWithResolvedConfigFile`
- `bbj-vscode/src/Commands/Commands.cjs` - `openConfigFile`, `run`, `runWeb` read the resolved
  config path via `config-path-cache.ts`; `NO_CONFIG_PATH_MESSAGE` shared error text
- `bbj-vscode/src/Commands/process-args.ts` - sentinel guards in `buildRunArgv` (omit `-c`) and
  `buildWebRunArgv` (blank the positional element)
- `bbj-vscode/package.json` - `bbj.configPath` description, `bbj.config` command title
- `bbj-vscode/src/language/compiler-options.ts` - `readerWithResolvedConfigFile`
- `bbj-vscode/src/language/compile-command.ts` - wraps the reader with
  `deps.wsManager.getResolvedConfigPath().path` before validation
- `bbj-vscode/test/compile-request.test.ts` - `withCompilerConfig` stub extended with
  `getResolvedConfigPath` to satisfy the widened `CompileRequestDeps.wsManager` interface

## Decisions Made

- Used the cached payload's `exists` flag (matched against the active path) for
  `openConfigFile`'s missing-file check, not a live `fs.existsSync`, since the resolved payload
  is the single source of truth and the established test convention seeds cache state with
  synthetic paths that never exist on disk.
- Kept `buildWebRunArgv`'s sentinel guard as a value substitution (empty string), not an
  omission, because its `configPath` is positional.
- Built `readerWithResolvedConfigFile` as a reader wrapper rather than editing
  `buildCompileOptionsFrom`, so the `-c` argument's position and the existing conflict rule are
  provably unchanged by construction, not by a follow-up assertion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended `compile-request.test.ts`'s `withCompilerConfig` stub**
- **Found during:** Task 3 (widening `CompileRequestDeps.wsManager` to require
  `getResolvedConfigPath()`)
- **Issue:** The existing stub in `compile-request.test.ts` only implemented `getCompilerConfig`.
  `createCompileHandler` now unconditionally calls `deps.wsManager.getResolvedConfigPath()`, so
  every pre-existing test in that file would throw `TypeError: ... is not a function` at
  runtime (Vitest transpiles via esbuild without full type-checking, so the missing member
  would not surface as a compile error — it fails at the first handler invocation instead).
- **Fix:** Added a second, optional `resolvedConfigPath` parameter to `withCompilerConfig`
  defaulting to `null`, so every existing call site's behavior is unchanged (no injection).
- **Files modified:** `bbj-vscode/test/compile-request.test.ts`
- **Verification:** `npx vitest run test/compile-request.test.ts` — all 13 tests pass.
- **Committed in:** `bf50fe16` (Task 3 commit)

**2. [Rule 1 - Bug] Removed decision-id references (D-10, D-03, D-12) from two source comments**
- **Found during:** Task 1 (self-review before committing, per the source-comment-hygiene
  rule)
- **Issue:** Two comments added to `Commands.cjs` during implementation cited planning decision
  IDs (`D-10`, `D-03`, `D-12`) inline, which the plan's own hygiene rule and this repository's
  register-check convention forbid in source/test code.
- **Fix:** Reworded both comments to describe the behavior in prose with no decision-id
  reference, before staging or committing.
- **Files modified:** `bbj-vscode/src/Commands/Commands.cjs`
- **Verification:** `grep -rnE "D-[0-9]{1,3}|CFG-0[0-9]|84-0[0-9]"` over every edited file
  returns no matches.
- **Committed in:** `1a462a58` (Task 1 commit) — fixed before the commit was made, so no
  separate follow-up commit was needed.

**3. [Rule 3 - Blocking] Substituted source-guard tests for the behavioral `Commands.cjs` tests the plan described**
- **Found during:** Task 1 (writing `config-path-consumers.test.ts`)
- **Issue:** The plan's action text asks for tests "using the `extension-activation.test.ts`
  `vscode` mock shape, asserting the Show-config and run outcomes." `Commands.cjs` is a
  CommonJS file resolved by Node's native loader; `vi.mock('vscode')` intercepts ESM module
  resolution, not a bare `require()` inside a `.cjs` file, so it never reaches that require —
  a pre-existing, documented constraint in `no-shell-command-construction.test.ts` and
  `em-properties-reader-guard.test.ts` for this exact file. Confirmed empirically before
  writing any test: a throwaway test with `vi.mock('vscode', ...)` followed by
  `require('vscode')` inside the test body threw `Cannot find module 'vscode'`.
- **Fix:** Wrote source-guard tests instead — extracting each function's brace-balanced body
  from the real file and asserting (a) it calls `getActiveConfigPath`/`stripSentinel`, (b) the
  home+cfg+config.bbx concatenation is gone, and (c) each error-message string precedes its
  `return` which precedes the `openTextDocument`/`buildRunArgv`/`buildWebRunArgv` call — the
  same technique this codebase already uses for this exact file, applied to the specific
  ordering facts the plan's acceptance criteria asked for.
- **Files modified:** `bbj-vscode/test/config-path-consumers.test.ts`
- **Verification:** All 9 source-guard tests pass against the actual edited file; a scratch
  test proving the `vi.mock('vscode')` limitation was written, run, and deleted before this
  decision was made.
- **Committed in:** `1a462a58` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug).
**Impact on plan:** All three were necessary to keep the plan's own verification green and to
honor its hygiene rule; none change the plan's specified behavior or scope. Deviation 3 is a
test-implementation-technique substitution, not a behavior change — every acceptance criterion
the plan listed for Task 1's tests is still asserted, just via source-guards instead of a
live-mocked behavioral run (which this codebase has never been able to do for `Commands.cjs`).

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Every host-side consumer of the config path (Show-config, all four run paths, and bbjcpl's
`-c`) now goes through the shared resolver's cached answer, with defensive sentinel guards
layered on top. Phase 84's remaining plans (IntelliJ-side wiring) can build on the same
`config-path-cache.ts`/`resolved-config-path-request.ts` contract this plan's consumers read.
The GUI/BUI/DWC run behavior against a live resolved custom-named config file (D2's
`human_judgment: true` coverage entry) is the human-verification surface this plan leaves for
end-of-phase UAT.

---
*Phase: 84-config-path-resolution-discoverability-foundation*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk (`config-path-consumers.test.ts`, `Commands.cjs`,
`process-args.ts`, `package.json`, `compiler-options.ts`, `compile-command.ts`,
`compile-request.test.ts`, this SUMMARY). All three task commits (`1a462a58`, `431da086`,
`bf50fe16`) confirmed present in `git log`. Plan-level `<verification>` re-run clean:
`npx vitest run test/config-path-consumers.test.ts` (19/19 passed), `npm run build` (zero
`error TS` lines), and a `grep` for `cfg/config.bbx` in `Commands.cjs` returns zero matches.
Whole-suite `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`: 1219 passed, 28 skipped, 0 failed
— no regressions.
