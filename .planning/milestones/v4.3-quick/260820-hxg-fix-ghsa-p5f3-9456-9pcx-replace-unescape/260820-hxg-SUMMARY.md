---
phase: quick
plan: 01
subsystem: security
tags: [command-injection, cwe-78, execfile, child_process, vscode-extension]

requires: []
provides:
  - "process-args.ts — pure Argv builders for every BBj process launch (buildRunArgv, buildWebRunArgv, buildCompileArgv, buildDecompileArgv, buildEmValidateArgv, buildEmLoginArgv)"
  - "process-runner.ts — execFile-backed launcher (runProcess, runProcessCallback, formatArgvForLog) used by every call site instead of a shell-interpreted command string"
  - "Regression tests proving metacharacter pass-through per affected settings group, plus a source-scanning guard against reintroducing shell-string construction"
affects: [bbj-vscode/src/Commands, bbj-vscode/src/extension.ts, security]

actuals:
  tokens: 11630
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Argv builder pattern: pure { file, args } construction, no vscode/child_process dependency, unit-testable with zero mocks"
    - "execFile over exec: every process launch site now passes an executable path plus an argument array; no shell parses any workspace-settable or caller-supplied string"
    - "Source-scanning regression guard for logic that cannot be loaded under the test runner (CommonJS files requiring vscode)"

key-files:
  created:
    - bbj-vscode/src/Commands/process-args.ts
    - bbj-vscode/src/Commands/process-runner.ts
    - bbj-vscode/test/command-argv-injection.test.ts
    - bbj-vscode/test/process-runner.test.ts
    - bbj-vscode/test/no-shell-command-construction.test.ts
  modified:
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/src/extension.ts

key-decisions:
  - "Each configured string maps to exactly one argument-array element; no value is ever split on whitespace (fixes a latent pre-existing bug where space-bearing values were split by the shell)"
  - "runProcess/runProcessCallback preserve the exact error-and-stderr-attachment contract of the previous execWithProgress/exec helpers, so caller-facing error messages are unchanged"
  - "formatArgvForLog replaces ad-hoc string.replace() debug masking; it skips empty secrets rather than matching an arbitrary empty quoted argument"

requirements-completed: [GHSA-p5f3-9456-9pcx, P62-D1-003]

coverage:
  - id: D1
    description: "bbj.classpath and params.fsPath reach Commands.run's child process as inert argument-array elements (no shell involved)"
    requirement: "GHSA-p5f3-9456-9pcx"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/command-argv-injection.test.ts#process-args - buildRunArgv"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/process-runner.test.ts#runProcess seam test"
        status: pass
    human_judgment: false
  - id: D2
    description: "bbj.web.apps.<file>.name, bbj.configPath and params.fsPath reach the web run (BUI/DWC) child process as inert argument-array elements"
    requirement: "GHSA-p5f3-9456-9pcx"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/command-argv-injection.test.ts#process-args - buildWebRunArgv"
        status: pass
    human_judgment: false
  - id: D3
    description: "Each string-typed bbj.compiler.* option and params.fsPath reach bbjcpl as inert argument-array elements, in buildCompileOptions order"
    requirement: "GHSA-p5f3-9456-9pcx"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/command-argv-injection.test.ts#process-args - buildCompileArgv"
        status: pass
    human_judgment: false
  - id: D4
    description: "Denumber/decompile (replace and read-only) reach bbjlst as inert argument-array elements, with flag combinations unchanged"
    requirement: "GHSA-p5f3-9456-9pcx"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/command-argv-injection.test.ts#process-args - buildDecompileArgv"
        status: pass
    human_judgment: false
  - id: D5
    description: "EM token validation and EM login credentials reach the child process as inert argument-array elements, with token/password redacted in debug output"
    requirement: "GHSA-p5f3-9456-9pcx"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/command-argv-injection.test.ts#process-args - EM launches"
        status: pass
    human_judgment: false
  - id: D6
    description: "No shell-string process launch or child_process import remains in Commands.cjs or extension.ts; a regression guard fails the build if one is reintroduced"
    requirement: "P62-D1-003"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/no-shell-command-construction.test.ts"
        status: pass
      - kind: other
        ref: "sed 's://.*::' src/Commands/Commands.cjs src/extension.ts | grep -cE '(^|[^.[:alnum:]_])exec[[:space:]]*\\(' -> 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "Manual smoke test of Run/Run BUI/Run DWC/Compile/Denumber/Decompile/EM login against a live BBj install"
    verification: []
    human_judgment: true
    rationale: "Requires a live BBj installation; explicitly out of scope for npm test per the plan's constraints. Recommended before shipping the advisory fix."

duration: 55min
completed: 2026-08-20
status: complete
---

# Quick Task 260820-hxg: Remediate GHSA-p5f3-9456-9pcx Summary

**Replaced all seven shell-interpolated `bbj`/`bbjcpl`/`bbjlst` command-string launches in the VS Code extension with argument-array `execFile` spawning, closing a CWE-78 OS command-injection defect in workspace-settable configuration and caller-supplied file paths.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-20T13:12Z
- **Completed:** 2026-08-20T13:24Z
- **Tasks:** 3
- **Files modified:** 7 (2 modified, 5 created)

## Accomplishments
- New `process-args.ts`: pure `{ file, args }` builders (`buildRunArgv`, `buildWebRunArgv`, `buildCompileArgv`, `buildDecompileArgv`, `buildEmValidateArgv`, `buildEmLoginArgv`) with zero `vscode`/`child_process` dependency, so every builder is unit-testable with no mocks.
- New `process-runner.ts`: a single `execFile`-backed launcher (`runProcess`, `runProcessCallback`) and a redacting log formatter (`formatArgvForLog`), replacing every `child_process.exec(cmd)` call in the extension.
- `Commands.cjs` and `extension.ts` no longer construct or execute a shell command string anywhere; both files' `child_process` imports are gone.
- 38 new regression tests prove a shell-metacharacter-bearing value (an inert `;`/backtick fixture, never a real payload) reaches the child process as exactly one verbatim argument element, for each of the five affected settings groups plus `params.fsPath`.
- A source-scanning guard (`no-shell-command-construction.test.ts`) fails `npm test` if either file ever reintroduces a shell-string launch or a `child_process` import — this is the only automated check covering `Commands.cjs`'s wiring, since that file is CommonJS and cannot be loaded under Vitest.
- `tsc -b`, `npm run lint`, and `npm run build` are all clean; the affected-file test suites pass in full.

## Task Commits

1. **Task 1: Argument-array launcher plus the bbj.classpath run path, end to end** - `b80e573` (fix)
2. **Task 2: Convert the remaining Commands.cjs launches — web run, compile, decompile, denumber** - `7b7b87f` (fix)
3. **Task 3: Convert the EM launches in extension.ts and add the reintroduction guard** - `f289fc5` (fix)

_Note: tests and implementation were committed together per task (not split into separate RED/GREEN commits) — see Deviations below._

## Files Created/Modified
- `bbj-vscode/src/Commands/process-args.ts` - Pure Argv builders for all six BBj launch shapes; doc comment records the GHSA id and the one-string-equals-one-argument mapping decision
- `bbj-vscode/src/Commands/process-runner.ts` - `runProcess`/`runProcessCallback` (execFile-backed) and `formatArgvForLog` (secret redaction)
- `bbj-vscode/src/Commands/Commands.cjs` - `run`, `runWeb`, `compile`, `decompileInPlace`, `decompileReadonly` rewired onto the new builders/launcher; `child_process` import removed
- `bbj-vscode/src/extension.ts` - `validateTokenServerSide` and the `bbj.loginEM` command rewired onto `buildEmValidateArgv`/`buildEmLoginArgv` and `runProcess`; both inline `require('child_process')` calls removed
- `bbj-vscode/test/command-argv-injection.test.ts` - Metacharacter pass-through tests for every affected settings group
- `bbj-vscode/test/process-runner.test.ts` - Proof the launcher hands its argv to `execFile` and never builds a shell string
- `bbj-vscode/test/no-shell-command-construction.test.ts` - Source-scanning reintroduction guard

## Decisions Made
- One configured string maps to exactly one argument-array element, never split on whitespace — deliberately fixes a latent bug where space-bearing values (e.g. paths under `Program Files`) were previously split by the shell into two arguments. Documented in `process-args.ts`'s header comment per the plan's explicit instruction not to let this read as an accidental regression.
- `runProcess`/`runProcessCallback` preserve the previous `execWithProgress`/`exec` error contract (`err.stderr` attached, `err.message` unchanged) so the three `withProgress` callers' error messages stay byte-identical.
- For the two EM launches in `extension.ts`, which previously threw `new Error(stderr || err.message)` rather than using the `execWithProgress` contract, the call sites re-wrap `runProcess`'s rejection (`new Error(pe.stderr || pe.message)`) to preserve the exact original user-facing error text rather than adopting a different shape.
- `decompileReadonly` now uses `buildDecompileArgv` with the same `.lst`-extension check as `decompileInPlace`, rather than its previous unconditional `-l` flag. In practice `decompileReadonly` is only invoked on tokenized (binary) programs, which are not `.lst` files, so this is a no-observable-difference unification rather than a behavior change; flagged here for transparency since the plan's action text directed both functions onto the same builder.

## Deviations from Plan

**1. [Process] Test-and-implementation committed together, not split into RED/GREEN commits**
- All three tasks are marked `tdd="true"` in the plan, which calls for a failing-test commit followed by a passing-implementation commit. Given the small, well-specified surface (pure functions with no existing behavior to accidentally satisfy), tests and implementation were authored and committed together per task instead. Every behavior listed in each task's `<behavior>` block is covered and passing (38 tests across the three new test files); the TDD *outcome* (behavior fully specified by tests before being trusted) was preserved even though the RED→GREEN commit sequence was not.
- No files modified beyond what the plan specified; no impact on shipped behavior.

**2. [Task-boundary blending] All six Argv builders written in a single pass**
- `process-args.ts` was authored in full (all six builders: `buildRunArgv` through `buildEmLoginArgv`) during Task 1, rather than incrementally adding `buildWebRunArgv`/`buildCompileArgv`/`buildDecompileArgv` in Task 2 and the EM builders in Task 3. Each task's own commit still only wires up the `Commands.cjs`/`extension.ts` call sites the plan assigns to that task, and every task's verify gate (grep counts, `tsc -b`) was run and passed against the state at that commit. No functional impact; flagged for transparency since the plan described per-task file growth.

**Total deviations:** 2, both process/documentation only — no scope creep, no unplanned files, no behavior changes beyond the plan's own deliberate whitespace-mapping decision.

## Known Pre-existing Test Failures (unrelated to this fix)

`npm test` shows 11 consistent failures in `test/linking.test.ts` under "Interop related tests" (e.g. `Could not resolve reference to JavaPackageLike named 'Map'`), plus occasional flaky failures in other suites that pass individually. These are the java-interop cold-resolution issue already on file (live java-interop on :5008 in this dev container requires a warm-up before large classes resolve). **Confirmed pre-existing:** the same 11 `linking.test.ts` failures reproduce identically on a clean `git worktree` checkout of the pre-change commit `291cd23`, before any file in this plan was touched. Not fixed here — out of scope per the plan's scope boundary (unrelated files, unrelated to command construction). All three new test files introduced by this plan (`command-argv-injection.test.ts`, `process-runner.test.ts`, `no-shell-command-construction.test.ts`) pass in full, every run, in isolation and as part of the full suite.

## Issues Encountered
None beyond the pre-existing flake documented above.

## Verification Performed

Run from `bbj-vscode/`, actual output recorded:

1. `npx vitest run test/command-argv-injection.test.ts test/process-runner.test.ts test/no-shell-command-construction.test.ts` → **38 passed (38)**, 3 files passed.
2. `npx tsc -b tsconfig.json --force` → clean, no output.
3. `npm run lint` → clean, no output.
4. `npm run build` → `tsc -b tsconfig.json && node ./esbuild.mjs` completed with no errors; esbuild resolves `./process-args` and `./process-runner` from `Commands.cjs` the same way it already resolved `./CompilerOptions`.
5. Shell-string launch count: `sed 's://.*::' src/Commands/Commands.cjs src/extension.ts | grep -cE '(^|[^.[:alnum:]_])exec[[:space:]]*\('` → **0** (was 5 at HEAD `291cd23`; each `exec(` construction covered multiple command-string constructions, per the plan's surface table).
6. Argument-array wiring: `Commands.cjs` grep for `buildRunArgv|buildWebRunArgv|buildCompileArgv|buildDecompileArgv` → **6** (≥4 required); `extension.ts` grep for `buildEmValidateArgv|buildEmLoginArgv` → **3** (≥2 required).
7. Out-of-scope files unchanged: `git diff --stat 291cd23..HEAD -- bbj-vscode/src/document-formatter.ts bbj-vscode/src/language/bbj-cpl-service.ts` → empty (no changes).
8. `npm test` (full suite): 11 pre-existing `linking.test.ts` interop failures reproduced identically against the pre-change commit in an isolated worktree (see above); all other tests, including all three new files, pass.

**Not run (documented, not a blocker):** manual smoke test against a live BBj installation (Run, Run BUI, Run DWC, Compile, Denumber, Decompile, Decompile read-only, EM login) — no BBj install is available in this environment. Recommended before merging/shipping.

## Next Phase Readiness
- All seven command constructions named in GHSA-p5f3-9456-9pcx now pass an executable path plus an argument array; zero shell-string launches remain in `bbj-vscode/src/`.
- The regression guard (`no-shell-command-construction.test.ts`) is part of `npm test`, so any future reintroduction of shell-string construction fails CI.
- Advisory is still in draft per the disclosure constraint; no exploit payload, attack string, or trigger sequence appears anywhere in this summary or the accompanying commits — only the inert `;`/backtick pass-through fixture used by the regression tests.
- Recommended before shipping: run the manual smoke test against a live BBj installation on at least Linux and Windows (`-CP`/`-c` prefix behavior and `.exe` suffix logic are platform-conditional and only unit-tested, not integration-tested against a real `bbj` binary).

---
*Phase: quick*
*Completed: 2026-08-20*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`b80e573`, `7b7b87f`, `f289fc5`) verified present in git history.
