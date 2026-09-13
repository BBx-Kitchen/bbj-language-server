---
phase: quick
verified: 2026-08-20T13:30:45Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Quick Task 260820-hxg: Fix GHSA-p5f3-9456-9pcx Verification Report

**Task Goal:** Replace unescaped `child_process.exec()` shell-string construction with `execFile`/`spawn` argument arrays across every affected call site in the VS Code extension, plus a regression test proving shell metacharacters in configuration values are passed through as inert argument data.

**Verified:** 2026-08-20T13:30:45Z
**Status:** passed
**Re-verification:** No — initial verification

**Advisory:** GHSA-p5f3-9456-9pcx (CWE-78, OS command injection). Draft/unpublished — no exploit payload, attack string, or trigger sequence is reproduced anywhere in this report; the only metacharacter fixtures referenced are the inert `legit;`injected`` test literal already committed in the test suite, and an inert filesystem-probe canary (a file-creation marker, described but not reproduced as a runnable command) used during live verification below.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Run, Run BUI, Run DWC, Compile, Denumber, Decompile (replace/read-only), EM login/validate all work unchanged | ✓ VERIFIED | Element-by-element diff of old (`291cd23`) vs. new command construction for all seven constructions (see Behavior Preservation below); live compile smoke test against the real `/opt/bbx` BBj installation succeeded end-to-end (see Live Verification below); `tsc -b`, `npm run build`, and the full non-pre-existing-failure test suite pass |
| 2 | No process in `bbj-vscode/src` is launched through a shell-interpreted command string | ✓ VERIFIED | Repo-wide grep for `exec(`/`execSync(`/`spawn(`/`spawnSync(`/`execFile(`/`shell: true`/`sendText`/`.bat`/`.cmd` in `src/` — only hits are `RegExp.exec()` calls (unrelated), the two `execFile()` calls inside `process-runner.ts`, and the pre-existing out-of-scope `cp.spawn('java', formatFlags)` / `spawn(bbjcplBin, [...])` array-based calls. No `shell: true` anywhere. No `.bat`/`.cmd` targets. Confirmed live against the real `bbjcpl` binary: an injected metacharacter string never reached a shell (see Live Verification). |
| 3 | `bbj.classpath` value with metacharacters reaches child process as one argument element | ✓ VERIFIED | `test/command-argv-injection.test.ts` "a classpathEntry carrying a shell metacharacter is one verbatim element" + `process-runner.test.ts` seam test confirms `execFile` receives it as one array element |
| 4 | `bbj.configPath` value with metacharacters reaches child process as one argument element | ✓ VERIFIED | Covered in `buildRunArgv` and `buildWebRunArgv` test groups |
| 5 | `bbj.web.apps.<file>.name` value with metacharacters reaches child process as one argument element | ✓ VERIFIED | `buildWebRunArgv` "an app name carrying a shell metacharacter is one verbatim element" test |
| 6 | Each `bbj.compiler.*` string option reaches bbjcpl as one argument element, in `buildCompileOptions` order | ✓ VERIFIED | `buildCompileArgv` forwards `buildCompileOptions`'s array (already one token per flag+value, confirmed by reading `CompilerOptions.ts:438-479`) element-for-element; unit test and a live run against the real `bbjcpl` binary (below) both confirm a metacharacter-bearing option value stays in one element |
| 7 | `params.fsPath` reaches child process as one argument element | ✓ VERIFIED | Covered for `buildRunArgv`, `buildWebRunArgv`, `buildCompileArgv`, `buildDecompileArgv` |
| 8 | Debug logging redacts EM token/password | ✓ VERIFIED | `formatArgvForLog` tests confirm non-empty secret → `***`; call sites in `Commands.cjs`/`extension.ts` pass `[token, password]`/`[token]`/`[password]` |
| 9 | Regression tests pass under plain `npm test`, no BBj install, no java-interop | ✓ VERIFIED | Ran full suite independently: 952 passed, 69 skipped, 11 failed — all 11 confined to `test/linking.test.ts` "Interop related tests", and independently proven pre-existing and unrelated to this fix (see Corrected Root Cause below; note the root cause is different from a "dead java-interop service" — see correction) |

**Score:** 9/9 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/Commands/process-args.ts` | Pure argv builders, no vscode/child_process import | ✓ VERIFIED | Confirmed zero `vscode`/`child_process` imports; exports `bbjBin`, `bbjlstBin`, `bbjcplBin`, `buildRunArgv`, `buildWebRunArgv`, `buildCompileArgv`, `buildDecompileArgv`, `buildEmValidateArgv`, `buildEmLoginArgv` |
| `src/Commands/process-runner.ts` | execFile-backed launcher + redacting log formatter | ✓ VERIFIED | `runProcess`, `runProcessCallback` both call `execFile` (never `exec`), no shell-enabling option passed anywhere; `formatArgvForLog` redacts; `runProcess` independently exercised end-to-end against a real `bbjcpl` process (below) |
| `src/Commands/Commands.cjs` | Run/BUI/DWC/Compile/Denumber/Decompile rewired | ✓ VERIFIED | `child_process` import removed; all five launch functions (`run`, `runWeb`, `compile`, `decompileInPlace`, `decompileReadonly`) call the new builders + `runProcess`/`runProcessCallback` |
| `src/extension.ts` | EM login/validate rewired | ✓ VERIFIED | Both inline `require('child_process')` calls removed; `validateTokenServerSide` and `bbj.loginEM` use `buildEmValidateArgv`/`buildEmLoginArgv` + `runProcess` |
| `test/command-argv-injection.test.ts` | Metacharacter pass-through tests per settings group | ✓ VERIFIED | 25 tests, one group per affected setting; assertions check exact array membership/position, not just string return |
| `test/process-runner.test.ts` | Proof launcher hands argv to execFile, never builds a string | ✓ VERIFIED | 9 tests; mocks both `execFile` and `exec` from `child_process`, asserts `execMock` never called |
| `test/no-shell-command-construction.test.ts` | Source-scanning reintroduction guard | ✓ VERIFIED | 4 tests; independently proven non-trivial (see below) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `Commands.run`/`runBUI`/`runDWC` | child process | `buildRunArgv`/`buildWebRunArgv` → `runProcessCallback` → `execFile` | ✓ WIRED | Read call sites directly; argv built then passed straight to launcher, no intermediate string join |
| `Commands.compile` | `bbjcpl` | `buildCompileOptions` (array) → `buildCompileArgv` → `runProcess` (via `execWithProgress`) | ✓ WIRED | `execWithProgress` now takes an `Argv` and delegates to `runProcess`; no `.join(' ')` remains; live-tested against the real `bbjcpl` binary (below) |
| `Commands.denumber`/`decompileReplace`/`decompileReadonly` | `bbjlst` | `buildDecompileArgv` → `runProcess` | ✓ WIRED | Flag logic (`-l`, `-xlst`) matches pre-fix behavior exactly for `decompileInPlace`; see Behavior Preservation for the one narrow disclosed exception in `decompileReadonly` |
| `extension.ts validateTokenServerSide`/`bbj.loginEM` | `bbj` | `buildEmValidateArgv`/`buildEmLoginArgv` → `runProcess` | ✓ WIRED | Both `require('child_process')` call sites removed; error-wrapping (`pe.stderr \|\| pe.message`) preserves prior user-facing error text |

### Live Verification Against the Real BBj Installation

A live BBj installation is in fact present in this environment at `/opt/bbx` (`bbj`, `bbjcpl`, `bbjlst` in `/opt/bbx/bin/`), with `bbjservices` running as a background service. This was independently confirmed (`ls /opt/bbx/bin/`, `ps aux | grep bbj`) — the SUMMARY's and this verifier's own earlier framing of "no BBj installation available" was incorrect and is corrected here.

Using `tsx` to run the actual `buildCompileArgv`/`runProcess` modules directly (no mocks) against `/opt/bbx/bin/bbjcpl`:

1. **Normal compile:** `buildCompileArgv({ home: '/opt/bbx', compilerOptions: [], fileName: <a real .bbj source file> })` → `runProcess()` invoked the real `bbjcpl` binary and it **actually compiled the file**, producing a compiled object file next to the source with no errors. This is genuine end-to-end proof the argument-array launcher works against production BBj tooling, not just against mocks.
2. **Injection canary (inert filesystem probe, not a reusable payload):** the same builder was given a compiler-option value consisting of a shell metacharacter followed by a file-creation instruction targeting a canary marker path. Result: `argv.args` had exactly two elements, with the entire crafted string preserved as one literal element; `bbjcpl` reported it could not open a file by that literal (metacharacter-and-all) name — i.e., it was treated purely as a filename string, never as a shell command. The canary marker file was never created, proving no shell ever parsed or executed any part of the value. This was re-run and independently confirmed by this verifier (not merely trusted) — same result: two argv elements, canary file absent afterward.

**Scope of what was, and was not, live-tested:** only the `bbjcpl` compile path (`Commands.compile` → `buildCompileArgv` → `runProcess`) was exercised against the real binary. The interactive GUI-triggered paths (`Run`, `Run BUI`, `Run DWC`) and the EM login/token-validation paths were **not** launched live in this verification — those still rest on unit-test and source-comparison evidence only (see Human Verification Required below, which is narrowed accordingly from the original "no smoke test at all" framing).

### Independent Regression-Detection Proof (claim 2 in the review brief)

Per-item request: "would these tests FAIL against `291cd23`? Do the check yourself rather than assuming."

Ran independently via `git worktree add` at `291cd23` with a symlinked `node_modules`:

- Copied `test/no-shell-command-construction.test.ts` into the pre-fix worktree unmodified and ran it against pre-fix `Commands.cjs`/`extension.ts`: **all 4 tests failed** (pre-fix code still has `exec(cmd, ...)` calls and `require('child_process')`/`from 'child_process'` imports). This proves the guard is a real regression detector, not a vacuous pass.
- Copied `command-argv-injection.test.ts` and `process-runner.test.ts` into the same worktree: both fail with `Cannot find module '.../process-args.js'` / `process-runner.js` — expected, since those modules don't exist pre-fix. This confirms these are genuinely new tests, not tests that would silently pass against unfixed code.

### Guard Non-Triviality (claim 3)

The `SHELL_EXEC_CALL` regex `(^|[^.\w])exec\s*\(` correctly excludes `execFile(`, `execWithProgress(`, `runProcessCallback(` (confirmed: 0 matches against the fixed files) while catching the pre-fix `exec(cmd, ...)` calls (confirmed: matches against `291cd23`). Combined with the `child_process` import ban (both `require('child_process')` and `from 'child_process'` forms), a reintroduced shell-string launch would need either a bare `exec(` call or a `child_process` import to actually spawn anything — both are caught.

**One narrow, disclosed gap:** the import-ban regexes only match the bare specifier `'child_process'`/`"child_process"`; a reintroduction using the `node:child_process` protocol-prefixed specifier would not be caught by the import check. This is a real but narrow gap — not exploitable today (no code uses `node:`-prefixed imports anywhere in this codebase) and not a blocker for this fix, but worth hardening in a follow-up if the guard is meant to be airtight against every reintroduction vector.

### Behavior Preservation (claim 4)

Diffed `291cd23` against `HEAD` command-by-command:

- `Commands.run`: old `-CP<sscp>`, `-c<configPath>` (only when non-empty), `-WD<workingDir>`, `<fileName>` → new `buildRunArgv` produces the identical sequence. Match confirmed by direct source comparison.
- `runWeb`: old 13-element positional sequence (`-q`, `-WD<toolsDir>`, `<toolsDir>/web.bbj`, `-`, client, name, programme, workingDir, username, password, classpath, token, configPath) → new `buildWebRunArgv` produces an identical 13-element array, confirmed by test and source read. Issue #382 config.bbx fallback (`configPath || \`${home}/cfg/config.bbx\``) preserved verbatim.
- `compile`: old `compilerOptions.join(' ')` (shell-parsed) → new forwards the same `buildCompileOptions()` array element-for-element via `buildCompileArgv`. `buildCompileOptions` (`CompilerOptions.ts:438-479`) already emits one `${flag}${value}` token per string/number option — confirmed by direct read, and confirmed by the live compile run above — so ordering and content are unchanged; the join step is simply removed, which is also the space-splitting bug fix the plan called out as deliberate.
- `decompileInPlace`/`denumber`/`decompileReplace`: old `-l [-xlst]` flag logic → new `buildDecompileArgv` — byte-identical logic, confirmed by source comparison.
- `decompileReadonly`: **one narrow, disclosed behavior difference.** Old code always passed a bare `-l` flag (never `-xlst`) regardless of the temp input's extension. New code routes through `buildDecompileArgv` with the same `.lst`-extension check as `decompileInPlace`, so if the *original* tokenized file happens to be named `*.lst` (its extension is preserved into the temp copy), the new code would additionally pass `-xlst` where the old code never did. In practice `decompileReadonly` only fires on tokenized binaries, which are not `.lst` (source) files in normal use, so this is very unlikely to be observable — but it is a genuine, if narrow, functional difference from pre-fix behavior. The SUMMARY discloses this transparently; it is not a security regression and not blocking, but is not literally "unchanged" as the must-have states. Flagged here for completeness rather than silently accepted.
- EM validate/login: old inline `exec()`-wrapped promises → new `buildEmValidateArgv`/`buildEmLoginArgv` + `runProcess`, confirmed identical argument order and error-wrapping behavior (`pe.stderr || pe.message`) by direct source comparison against `291cd23`. Not live-tested (see Live Verification scope note above).

`bbj.classpath`, `bbj.configPath`, and the seven string-typed `bbj.compiler.*` options were cross-checked against `package.json`'s `contributes.configuration`: each is documented as a single-token value (classpath entry name, file path, extension, password, or number) — consistent with the plan's one-string-equals-one-argument-element decision; no documented usage relies on whitespace-splitting a single setting into multiple arguments.

### Out-of-Scope Files (claim 5)

`git diff --stat 291cd23..HEAD -- bbj-vscode/src/document-formatter.ts bbj-vscode/src/language/bbj-cpl-service.ts` → empty. Both files confirmed unchanged; both already use `spawn()` with argument arrays (`cp.spawn('java', formatFlags)`, `spawn(bbjcplBin, ['-N', filePath])`) and are untouched by this task. Full diff stat for the branch touches exactly 7 files (2 new source, 2 modified source, 3 new test), matching the plan's declared scope precisely.

### Cross-Platform (claim 6)

- `bbjBin`/`bbjlstBin`/`bbjcplBin` append `.exe` only on `win32`, matching pre-fix logic exactly (`os.platform() === 'win32' ? '.exe' : ''`).
- All pre-fix shell-string constructions wrapped paths and values in double quotes (`"${bbj}"`, `"${workingDir}"`, etc.) specifically because a shell was parsing them; the new argument-array approach correctly drops all such quoting since `execFile` passes each array element directly to the OS process-creation API with no shell involved — quoting would in fact be wrong here (it would become literal characters in the argument). This is correct, not a regression.
- No `.bat`/`.cmd` targets exist anywhere in the affected code — all launched executables are `bbj`/`bbjlst`/`bbjcpl` native binaries (with `.exe` suffix on Windows), so the classic "Windows implicitly re-invokes cmd.exe for `.bat`/`.cmd` files even under `execFile`" footgun does not apply.
- No `shell: true` option is set anywhere.
- Live testing was only performed on Linux (this environment); the Windows/macOS `.exe`-suffix branch and Windows `execFile` argument-passing semantics remain unit-tested only, not live-tested.

### Corrected Root Cause: the 11 `linking.test.ts` failures

The task's "known context" (and this verifier's first draft) attributed the 11 pre-existing `linking.test.ts` "Interop related tests" failures to "a dead java-interop service on port 5008." That attribution is corrected here after independent investigation:

- Port 5008 is occupied by **`bbjservices`** (confirmed via `ps aux` and `ss -tlnp`), not by the `java-interop` Gradle service, and `bbjservices` does not speak the interop JSON-RPC protocol.
- `shouldRunBBjTests()` in `test/test-helper.ts:38-43` auto-detects via `isPortOpen(5008)` — a bare TCP-connect check with **no protocol handshake** — so it false-positives whenever anything (including `bbjservices`) is listening on that port, enabling interop-gated tests against a service that cannot answer them.
- Independently confirmed: `RUN_BBJ_TESTS=0 npx vitest run test/linking.test.ts` → **23 passed, 19 skipped, 0 failed** (clean). Auto-detect (unset `RUN_BBJ_TESTS`) → the same 11 failures.
- Independently confirmed the failures are pre-existing and unrelated to this security fix: built a fresh `git worktree` at pre-change `291cd23`, ran `npm run langium:generate` (required — generated sources aren't committed), then ran `test/linking.test.ts` in isolation → **identically 11 failed / 30 passed / 1 skipped**.

This is a pre-existing test-harness defect (a TCP-connect-only readiness probe that doesn't verify protocol compatibility), entirely orthogonal to the command-injection fix. It is **not** counted as a gap against this task, but the record is corrected here since the original causal claim ("dead service") was wrong — the service is very much alive, just not the right one.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` across all 7 changed/created files: zero matches.

### Behavioral Spot-Checks / Independent Test Runs

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| New test files pass | `npx vitest run test/command-argv-injection.test.ts test/process-runner.test.ts test/no-shell-command-construction.test.ts` | 3 files, 38 tests passed | ✓ PASS |
| Guard fails against pre-fix code | Copied `no-shell-command-construction.test.ts` into a `git worktree` at `291cd23` and ran it | 4/4 tests failed (as expected) | ✓ PASS (proves non-vacuous) |
| Type-check clean | `npx tsc -b tsconfig.json --force` | no output, exit 0 | ✓ PASS |
| Lint clean | `npm run lint` | no output, exit 0 | ✓ PASS |
| Build clean, new modules bundled | `npm run build` then `grep -rl buildRunArgv out/` | `out/extension.cjs` contains `buildRunArgv` | ✓ PASS |
| Full test suite, no regressions beyond pre-existing failures | `npm test` (full) | 952 passed, 69 skipped, 11 failed (all in `linking.test.ts` "Interop related tests"; root cause corrected above) | ✓ PASS |
| Isolated re-run of a full-suite-only failure | `npx vitest run test/class-validations-issues.test.ts` | 16/16 passed in isolation | ✓ PASS (confirms full-suite flake, not a regression) |
| `linking.test.ts` clean with the interop gate correctly off | `RUN_BBJ_TESTS=0 npx vitest run test/linking.test.ts` | 23 passed, 19 skipped, 0 failed | ✓ PASS |
| `linking.test.ts` pre-existing failure reproduced on pre-fix commit | `git worktree` at `291cd23`, `npm run langium:generate`, then `npx vitest run test/linking.test.ts` | 11 failed / 30 passed / 1 skipped (identical to HEAD) | ✓ PASS (confirms pre-existing, unrelated) |
| Live compile against real `/opt/bbx/bin/bbjcpl` | `tsx` script calling `buildCompileArgv` + `runProcess` directly, no mocks | Compiled successfully, object file produced | ✓ PASS |
| Live injection canary against real `bbjcpl` | Same script with a metacharacter-plus-file-probe compiler-option value | `argv.args` had exactly 2 elements; `bbjcpl` reported "unable to open file" using the literal string as a filename; canary file never created | ✓ PASS |
| Zero shell-exec count | `sed 's://.*::' src/Commands/Commands.cjs src/extension.ts \| grep -cE '(^\|[^.[:alnum:]_])exec[[:space:]]*\('` | `0` | ✓ PASS |
| Argv wiring count | Same grep for `buildRunArgv\|buildWebRunArgv\|buildCompileArgv\|buildDecompileArgv` in `Commands.cjs` / `buildEmValidateArgv\|buildEmLoginArgv` in `extension.ts` | `6` / `3` | ✓ PASS |
| Commit objects exist | `git cat-file -t b80e573 7b7b87f f289fc5` | all `commit` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GHSA-p5f3-9456-9pcx | 260820-hxg-PLAN.md | OS command injection via shell-string construction | ✓ SATISFIED | All seven command constructions converted to argument arrays; zero shell-string launches remain; live-confirmed for the compile path |
| P62-D1-003 | 260820-hxg-PLAN.md | Reintroduction guard | ✓ SATISFIED | `no-shell-command-construction.test.ts` proven non-vacuous against pre-fix code |

### Human Verification Required

None required to pass this verification. One item is narrower than originally stated and should be tracked before shipping the advisory:

**Interactive GUI and EM command paths not live-tested.** A live BBj installation (`/opt/bbx`) is present in this environment, and the `bbjcpl` compile path was live-tested end-to-end against it (see Live Verification above), including an injection-canary proof that a metacharacter-bearing value never reaches a shell. However, `Run`, `Run BUI`, `Run DWC`, `Denumber`, `Decompile` (replace/read-only), and the EM login/token-validation paths were **not** launched interactively through the actual VS Code extension UI in this verification — those rest on unit-test coverage and direct source-diff comparison against the pre-fix commit only. Recommended before merging to `main` and publishing the advisory: exercise these remaining paths through the extension UI (or an equivalent scripted invocation) at least once, given the `.exe`-suffix and Windows-`execFile` behavior is still unit-tested only, not live-tested, on any platform.

### Gaps Summary

No blocking gaps found. The remediation is complete: every one of the seven command constructions named in the advisory's surface table now passes an executable path plus an argument array through `execFile`, with no shell parsing any workspace-settable or caller-supplied string. This was confirmed at three independent levels: (1) unit tests on the pure builders, (2) a mocked seam test proving the launcher hands its argv to `execFile`, and (3) a live end-to-end run against the real `bbjcpl` binary, including an inert injection-canary probe that proved a metacharacter-bearing value is never interpreted by a shell. The regression tests and the source-scanning reintroduction guard were independently proven to fail against the pre-fix commit, confirming they are real regression detectors, not vacuous passes.

Four non-blocking items are recorded for transparency:
1. `decompileReadonly` now applies the `.lst`-extension `-xlst` check that `decompileInPlace` always had, which is a narrow behavior difference from pre-fix (old code never added `-xlst` in this path) — extremely unlikely to be observable given `decompileReadonly` only operates on tokenized binaries, but not literally "unchanged."
2. The reintroduction guard's `child_process` import ban does not catch a `node:`-prefixed specifier — no such usage exists anywhere in this codebase today, so this is not currently exploitable, but is worth hardening if the guard is meant to be exhaustive.
3. Only the `bbjcpl` compile path was live-tested against the real BBj installation; the GUI Run/BUI/DWC paths and EM login/validate paths remain verified by unit test and source-diff only, not by a live launch.
4. The 11 pre-existing `linking.test.ts` failures have a corrected root cause (a TCP-connect-only interop readiness probe that false-positives against `bbjservices` squatting on port 5008, not a "dead" service) — independently reproduced against the pre-fix commit and confirmed unrelated to this security fix.

---

*Verified: 2026-08-20T13:30:45Z*
*Verifier: Claude (gsd-verifier)*
