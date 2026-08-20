---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/src/Commands/process-args.ts
  - bbj-vscode/src/Commands/process-runner.ts
  - bbj-vscode/src/Commands/Commands.cjs
  - bbj-vscode/src/extension.ts
  - bbj-vscode/test/command-argv-injection.test.ts
  - bbj-vscode/test/process-runner.test.ts
  - bbj-vscode/test/no-shell-command-construction.test.ts
autonomous: true
requirements: [GHSA-p5f3-9456-9pcx, P62-D1-003]

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Run, Run BUI, Run DWC, Compile, Denumber, Decompile (replace and read-only), EM login and EM token validation all still work unchanged on Linux, macOS and Windows"
    - "No process in bbj-vscode/src is launched through a shell-interpreted command string; every launch passes an executable path plus an argument array"
    - "A bbj.classpath value containing shell metacharacters reaches the child process as exactly one argument element, byte-identical to the configured value"
    - "A bbj.configPath value containing shell metacharacters reaches the child process as exactly one argument element, byte-identical to the configured value"
    - "A bbj.web.apps.<file>.name value containing shell metacharacters reaches the child process as exactly one argument element, byte-identical to the configured value"
    - "Each bbj.compiler.* option value containing shell metacharacters reaches bbjcpl as exactly one argument element, in the same order buildCompileOptions produced"
    - "A params.fsPath supplied by another extension's command invocation reaches the child process as exactly one argument element"
    - "Debug logging still prints the launched command line, with a non-empty EM token and password redacted"
    - "The regression tests pass under plain `npm test` with no BBj installation and no java-interop service on port 5008"
  artifacts:
    - path: "bbj-vscode/src/Commands/process-args.ts"
      provides: "Pure argv builders (executable path + argument array) for every BBj process this extension launches"
      contains: "buildRunArgv"
    - path: "bbj-vscode/src/Commands/process-runner.ts"
      provides: "Single argument-array process launcher used by every call site, plus redacting log formatter"
      contains: "execFile"
    - path: "bbj-vscode/src/Commands/Commands.cjs"
      provides: "Run / BUI / DWC / Compile / Denumber / Decompile commands rewired onto the argv builders"
      contains: "buildRunArgv"
    - path: "bbj-vscode/src/extension.ts"
      provides: "EM login and EM token validation rewired onto the argv builders"
      contains: "buildEmLoginArgv"
    - path: "bbj-vscode/test/command-argv-injection.test.ts"
      provides: "Metacharacter pass-through regression tests, one per affected settings group"
      contains: "buildRunArgv"
    - path: "bbj-vscode/test/process-runner.test.ts"
      provides: "Proof the launcher hands the argument array to execFile and never builds a shell string"
      contains: "execFile"
    - path: "bbj-vscode/test/no-shell-command-construction.test.ts"
      provides: "Source-scanning guard preventing reintroduction of shell-string command construction"
      contains: "Commands.cjs"
  key_links:
    - from: "Commands.run / Commands.runBUI / Commands.runDWC"
      to: "child process"
      via: "buildRunArgv / buildWebRunArgv -> runProcess -> execFile"
      pattern: "argument array"
    - from: "Commands.compile"
      to: "bbjcpl"
      via: "buildCompileOptions (already an array) -> buildCompileArgv -> runProcess"
      pattern: "argument array"
    - from: "Commands.denumber / decompileReplace / decompileReadonly"
      to: "bbjlst"
      via: "buildDecompileArgv -> runProcess"
      pattern: "argument array"
    - from: "extension.ts validateTokenServerSide / bbj.loginEM"
      to: "bbj"
      via: "buildEmValidateArgv / buildEmLoginArgv -> runProcess"
      pattern: "argument array"
---

<objective>
Harden how the VS Code extension launches BBj executables: replace every shell-interpolated command-string launch with argument-array process spawning, so that workspace-settable configuration values and caller-supplied file paths are handed to the child process as inert argument data rather than as text a shell parses.

Remediates GHSA-p5f3-9456-9pcx (finding P62-D1-003), an OS command injection class defect (CWE-78). This mirrors the IntelliJ plugin's `GeneralCommandLine.addParameter` approach, so both IDE integrations construct process invocations the same way.

Purpose: `bbj.classpath`, `bbj.configPath`, `bbj.web.apps.<file>.name` and the seven string-typed `bbj.compiler.*` options are all workspace-scoped settings, and `params.fsPath` is reachable from any other extension's command invocation. Today all of them are interpolated into a command string that a shell then parses. After this change no shell is involved at any launch site.

Output: two new modules (`process-args.ts`, `process-runner.ts`), both existing launch sites rewired, three regression test files.

## Verified current surface (HEAD 291cd23)

The advisory's line numbers have drifted. Five shell-string launches exist in `bbj-vscode/src/`, carrying seven distinct command constructions:

| # | Location | Command construction | Untrusted inputs |
|---|----------|----------------------|------------------|
| 1 | `Commands.cjs:271` (`Commands.run`) | `bbj -q -CP<classpath> -c<configPath> -WD<workingDir> <fileName>` | `bbj.classpath`, `bbj.configPath`, `params.fsPath` |
| 2 | `Commands.cjs:117` (`runWeb`, used by `runBUI`/`runDWC`) | `bbj -q -WD<toolsDir> web.bbj - <client> <name> <programme> <workingDir> <username> <password> <classpath> <token> <configPath>` | `bbj.classpath`, `bbj.configPath`, `bbj.web.apps.<file>.name`, `params.fsPath` |
| 3 | `Commands.cjs:336` via `execWithProgress` (`Commands.compile`) | `bbjcpl <options...> <fileName>` | seven string-typed `bbj.compiler.*` options, `params.fsPath` |
| 4 | `Commands.cjs:180` via `execWithProgress` (`decompileInPlace`) | `bbjlst [-l [-xlst]] <fileName>` | `params.fsPath` |
| 5 | `Commands.cjs:383` via `execWithProgress` (`decompileReadonly`) | `bbjlst -l <tmpInput>` | `params.fsPath` (via a temp copy) |
| 6 | `extension.ts:426` (`validateTokenServerSide`) | `bbj -q em-validate-token.bbj - <token> <tmpFile>` | stored EM token |
| 7 | `extension.ts:645` (`bbj.loginEM`) | `bbj -q em-login.bbj - <username> <password> <tmpFile> <infoString>` | user-entered EM credentials |

Constructions 3, 4 and 5 all funnel through the single `execWithProgress` helper at `Commands.cjs:29-41`, which is why the file shows five launches for seven constructions.

`src/document-formatter.ts:83` and `src/language/bbj-cpl-service.ts:140` already spawn with argument arrays and no shell; they are out of scope and must stay as they are.

## Argument-mapping decision (explicit, not silent)

Each configured string maps to **exactly one** argument element. No value is split on whitespace.

- `bbj.classpath` is documented as a *classpath entry name* (`bbj_default`, `addon`, `barista`), i.e. a single token; it becomes the single element `-CP<value>`.
- `bbj.configPath` is documented as a *path to a config.bbx file*, i.e. a single token; it becomes the single element `-c<value>` (and, in the web path, a standalone positional element).
- Every string-typed `bbj.compiler.*` option is documented as a single path, extension, password or number. `buildCompileOptions` already returns a `string[]` where each entry is one complete flag-plus-value token; that array is now forwarded element-for-element instead of being joined with spaces.

This preserves the behaviour of every documented usage. It also, deliberately, fixes a pre-existing latent bug: a value containing a space (for example an output directory under `Program Files`) is today split by the shell into two arguments, and will now be delivered intact as one. Record this in the module doc comment so the intent is not mistaken for a regression.

## Disclosure constraint

This repository is public and `.planning/` is tracked, and the advisory is still a draft. Name the GHSA id, the CWE class, the affected files and the remediation — but do not write an exploit payload, a concrete attack string, or a trigger sequence into any artifact. The one permitted appearance of a shell metacharacter is the inert test fixture described in the tasks: a settings value containing `;` or a backtick, asserted to arrive as literal argument data. Keep that fixture minimal and non-weaponized.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@bbj-vscode/src/Commands/Commands.cjs
@bbj-vscode/src/Commands/CompilerOptions.ts
@bbj-vscode/test/document-formatter.test.ts
@bbj-vscode/test/compiler-options.test.ts
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Argument-array launcher plus the bbj.classpath run path, end to end</name>
  <files>bbj-vscode/src/Commands/process-args.ts, bbj-vscode/src/Commands/process-runner.ts, bbj-vscode/src/Commands/Commands.cjs, bbj-vscode/test/command-argv-injection.test.ts, bbj-vscode/test/process-runner.test.ts</files>
  <read_first>bbj-vscode/src/Commands/Commands.cjs (lines 1-10, 45-61, 241-284), bbj-vscode/src/Commands/CompilerOptions.ts (buildCompileOptions), bbj-vscode/test/document-formatter.test.ts (lines 30-55, for the child_process mocking pattern), bbj-vscode/test/compiler-options.test.ts (lines 1-30, for the vscode-free unit test pattern)</read_first>
  <behavior>
    process-args.ts (pure, no vscode import, no child_process import):
    - Test 1: `bbjBin('/opt/bbj', 'linux')` returns `/opt/bbj/bin/bbj`; `bbjBin('C:\\bbj', 'win32')` returns the same path with a `.exe` suffix. Same shape for `bbjlstBin` and `bbjcplBin`.
    - Test 2: `buildRunArgv({home, platform, classpathEntry: 'bbj_default', configPath: null, workingDir: '/w', fileName: '/w/a.bbj'})` returns `{ file: <bbj path>, args: ['-q', '-CPbbj_default', '-WD/w', '/w/a.bbj'] }`.
    - Test 3: an empty or absent `classpathEntry` omits the `-CP` element entirely (matching today's `sscp > ''` guard); an empty or absent `configPath` omits the `-c` element entirely.
    - Test 4: a `classpathEntry` carrying a shell metacharacter (a `;` and a backtick) yields exactly one args element, equal to `'-CP' + value` character-for-character, and no other element contains any part of the value.
    - Test 5: a `fileName` carrying a shell metacharacter yields exactly one args element equal to the value character-for-character.
    - Test 6: every element of `args` is a string, and `args` is an Array — never a single joined command line.

    process-runner.ts:
    - Test 7: `runProcess({file, args})` calls the mocked `execFile` with the executable path as argument 1 and the identical array instance contents as argument 2; the options object passed contains no shell-enabling flag.
    - Test 8: the module's exports never invoke the shell-string API of `child_process` (assert the mocked shell-string export is never called).
    - Test 9: `runProcess` resolves `{stdout, stderr}` on success and rejects with the error, carrying `stderr` attached, on failure — matching the existing `execWithProgress` contract exactly.
    - Test 10: `formatArgvForLog({file, args}, [secret])` returns a readable single-line rendering in which a non-empty secret is replaced by `***`, and an empty-string secret redacts nothing.
    - Test 11 (seam): feeding `buildRunArgv` output with a metacharacter-bearing classpath into `runProcess` results in `execFile` receiving that value as one array element, verbatim.
  </behavior>
  <action>
Create `bbj-vscode/src/Commands/process-args.ts` exporting an `Argv` interface (`{ file: string; args: string[] }`), the three executable-path helpers (`bbjBin`, `bbjlstBin`, `bbjcplBin`, each taking `home` and a `NodeJS.Platform` and appending `.exe` only on `win32`), and `buildRunArgv`. Take plain primitives as input — no `vscode` import at all, not even a type-only one — so the module is testable with zero mocks. Head the file with a doc comment recording the argument-mapping decision from the objective (one configured string equals one argument element, no whitespace splitting, and the deliberate fix for space-bearing values), and naming GHSA-p5f3-9456-9pcx as the reason the module exists.

`buildRunArgv` reproduces today's `Commands.run` command exactly, element by element: `-q`, then `-CP<classpathEntry>` only when the entry is a non-empty string, then `-c<configPath>` only when configPath is a non-empty string, then `-WD<workingDir>`, then the file name as the final positional element. Preserve the existing `stripSentinel` semantics by having the caller pass an already-stripped value.

Create `bbj-vscode/src/Commands/process-runner.ts` importing `execFile` from `child_process` and exporting: `runProcess(argv, options?)` returning a Promise that resolves `{stdout, stderr}` and, on failure, rejects with the error object with `stderr` attached to it (the existing `execWithProgress` contract, so callers' error messages are unchanged); `runProcessCallback(argv, options, cb)` for the fire-and-forget launches; and `formatArgvForLog(argv, secrets)` which renders the invocation for the debug output channel with each non-empty entry of `secrets` replaced by `***`. Never pass any shell-enabling option. Do not import `vscode`.

Rewire `Commands.run` in `bbj-vscode/src/Commands/Commands.cjs`: `require` the two new modules the same way the file already requires `./CompilerOptions` and `../decompile-io`, read the configuration values as it does today, call `buildRunArgv`, log via `formatArgvForLog` when `bbj.debug` is on (keeping the existing `GUI run: ` prefix), and launch via `runProcessCallback`, preserving the existing error-message text and the `AutoSaveUponRun` ordering. Delete the command-string assembly in that function. Leave the other launch sites in the file untouched for now — Task 2 converts them.

Add `bbj-vscode/test/command-argv-injection.test.ts` covering behaviours 1-6 (no mocks needed; the module has no vscode dependency). Add `bbj-vscode/test/process-runner.test.ts` covering behaviours 7-11, mocking `child_process` with `vi.mock` exactly as `test/document-formatter.test.ts` does. Define the metacharacter fixture once as a named constant with a short comment saying it is inert test data proving pass-through, not an exploit. Note that `Commands.cjs` itself cannot be loaded under Vitest — it is a CommonJS file resolved by Node's native loader, so `vi.mock('vscode')` does not reach its `require`; this was measured, so keep every assertion on the two new modules and rely on the Task 3 source guard for the wiring.
  </action>
  <verify>
    <automated>cd bbj-vscode && npx vitest run test/command-argv-injection.test.ts test/process-runner.test.ts && test "$(sed 's://.*::' src/Commands/Commands.cjs | grep -cE 'buildRunArgv')" -ge 1 && test "$(sed 's://.*::' src/Commands/Commands.cjs | grep -cE '(^|[^.[:alnum:]_])exec[[:space:]]*\(')" -eq 2 && npx tsc -b tsconfig.json --force</automated>
  </verify>
  <reversibility rating="reversible">The one-configured-string-equals-one-argument mapping can be revisited per setting later if a user turns out to rely on shell word-splitting; nothing about it is one-way.</reversibility>
  <done>`process-args.ts` and `process-runner.ts` exist and are covered by passing tests. `Commands.run` builds an argument array and launches through `runProcessCallback`; a classpath or file-path value carrying a shell metacharacter is proven to arrive as one verbatim array element. Two shell-string launches remain in `Commands.cjs` (the progress helper and the web runner) and are Task 2's scope. `tsc -b` is clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Convert the remaining Commands.cjs launches — web run, compile, decompile, denumber</name>
  <files>bbj-vscode/src/Commands/process-args.ts, bbj-vscode/src/Commands/Commands.cjs, bbj-vscode/test/command-argv-injection.test.ts</files>
  <read_first>bbj-vscode/src/Commands/Commands.cjs (lines 24-41, 63-124, 126-203, 294-343, 357-401), bbj-vscode/src/Commands/CompilerOptions.ts (buildCompileOptions, lines 438-479)</read_first>
  <behavior>
    - Test 1 (`bbj.web.apps.<file>.name` group): `buildWebRunArgv` places the app name as exactly one args element, byte-identical to the configured value, even when it carries a `;` or a backtick, and no other element contains any part of it.
    - Test 2 (`bbj.configPath` group): the web run's config path is exactly one args element equal to the configured value; when unset it falls back to `<home>/cfg/config.bbx`, still one element (issue #382 behaviour preserved — the `--` sentinel must never reach the child).
    - Test 3: `buildWebRunArgv` emits the positional arguments in exactly today's order: `-q`, `-WD<toolsDir>`, `<toolsDir>/web.bbj`, `-`, client, name, programme, workingDir, username, password, classpath, token, configPath — thirteen elements, empty-string credentials preserved as empty elements rather than dropped.
    - Test 4 (`bbj.compiler.*` group): `buildCompileArgv({compilerOptions, fileName})` forwards the `buildCompileOptions` array element-for-element in order, then the file name last. An option value carrying a `;` or a backtick stays inside its own single element; an option value containing a space also stays in one element (the deliberate pre-existing-bug fix).
    - Test 5: `buildDecompileArgv` reproduces today's bbjlst flags — no flags when not denumbering; `['-l']` when denumbering a non-`.lst` input; `['-l', '-xlst']` when denumbering a `.lst` input — with the file name as the final element.
    - Test 6 (`params.fsPath` group): a file name carrying a shell metacharacter is one verbatim element in each of `buildWebRunArgv`, `buildCompileArgv` and `buildDecompileArgv`.
  </behavior>
  <action>
Extend `bbj-vscode/src/Commands/process-args.ts` with `buildWebRunArgv`, `buildCompileArgv` and `buildDecompileArgv`, each taking plain primitives and returning `Argv`. Keep the module free of any `vscode` or `child_process` import.

Rewire the rest of `bbj-vscode/src/Commands/Commands.cjs`:

- Replace the `execWithProgress(cmd)` helper with an `Argv`-taking equivalent that delegates to `runProcess` from `process-runner.ts`, keeping the same returned-promise and attached-`stderr` rejection contract so the three `withProgress` callers' error messages stay byte-identical.
- `runWeb`: build the invocation with `buildWebRunArgv` and launch with `runProcessCallback`. Replace the hand-rolled debug masking (`cmd.replace(...)`) with `formatArgvForLog(argv, [token, password])`, keeping the `${client} run: ` prefix. Note the behaviour improvement to record in the summary: today an empty password causes the masking `replace` to hit the first empty quoted argument instead, whereas `formatArgvForLog` skips empty secrets.
- `compile`: keep `validateOptions` and `buildCompileOptions` exactly as they are, then pass the resulting array straight into `buildCompileArgv`. Remove the space-joining step.
- `decompileInPlace` and `decompileReadonly`: build with `buildDecompileArgv`. Replace the `bbjlstBin` local helper (which returns a pre-quoted string) with the unquoted path helper from `process-args.ts`, and delete the local helper. Everything downstream — the tokenized-input probe, `waitForDecompileOutput`, the rename and the editor open — is unchanged.
- Remove the now-unused destructured `child_process` import at the top of the file.

Extend `bbj-vscode/test/command-argv-injection.test.ts` with the six behaviours above, reusing the shared metacharacter fixture constant from Task 1.
  </action>
  <verify>
    <automated>cd bbj-vscode && npx vitest run test/command-argv-injection.test.ts test/process-runner.test.ts && test "$(sed 's://.*::' src/Commands/Commands.cjs | grep -cE '(^|[^.[:alnum:]_])exec[[:space:]]*\(')" -eq 0 && test "$(sed 's://.*::' src/Commands/Commands.cjs | grep -cE 'buildRunArgv|buildWebRunArgv|buildCompileArgv|buildDecompileArgv')" -ge 4 && npx tsc -b tsconfig.json --force</automated>
  </verify>
  <done>`Commands.cjs` contains no shell-string launch and no `child_process` import; all seven of its command constructions go through `process-args.ts` builders and `process-runner.ts`. Metacharacter pass-through is proven by test for the `bbj.web.apps.<file>.name`, `bbj.configPath`, `bbj.compiler.*` and `params.fsPath` groups. Compiler-option ordering, bbjlst flag combinations and the `--` sentinel fallback all match the pre-change behaviour. `tsc -b` is clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Convert the EM launches in extension.ts and add the reintroduction guard</name>
  <files>bbj-vscode/src/Commands/process-args.ts, bbj-vscode/src/extension.ts, bbj-vscode/test/command-argv-injection.test.ts, bbj-vscode/test/no-shell-command-construction.test.ts</files>
  <read_first>bbj-vscode/src/extension.ts (lines 392-450 validateTokenServerSide, lines 596-672 the bbj.loginEM registration)</read_first>
  <behavior>
    - Test 1: `buildEmValidateArgv({home, platform, scriptPath, token, tmpFile})` returns `-q`, the script path, `-`, the token, the temp file — five elements in that order, the token verbatim in exactly one element even when it carries a metacharacter.
    - Test 2: `buildEmLoginArgv({home, platform, scriptPath, username, password, tmpFile, infoString})` returns `-q`, script path, `-`, username, password, temp file, info string — seven elements in that order; a username or password carrying a metacharacter stays inside its own single element; the info string keeps its spaces in one element.
    - Test 3: `formatArgvForLog` applied to each EM invocation redacts the token and the password and leaves the remaining elements readable, so the debug output channel never prints a live secret.
    - Test 4 (guard): scanning `src/Commands/Commands.cjs` and `src/extension.ts` with comments stripped finds zero shell-string process launches, and finds no `child_process` import outside the launcher module.
  </behavior>
  <action>
Extend `bbj-vscode/src/Commands/process-args.ts` with `buildEmValidateArgv` and `buildEmLoginArgv`.

Rewire `bbj-vscode/src/extension.ts`:

- `validateTokenServerSide`: build with `buildEmValidateArgv`, launch with `runProcess` from `process-runner.ts` keeping the existing `{ timeout: 10000 }` option, and keep the surrounding logic untouched — the temp-file read, the `finally` unlink, and the `result === 'VALID'` check. Replace the inline `emValidateCmd.replace(token, '***')` debug line with `formatArgvForLog(argv, [token])`, keeping the `EM token validation: ` prefix.
- The `bbj.loginEM` command: build with `buildEmLoginArgv`, launch with `runProcess` keeping `{ timeout: 15000 }`, and keep the `ERROR:` prefix handling, the SecretStorage store and the user-facing messages unchanged. Replace the inline masking with `formatArgvForLog(argv, [password])`, keeping the `EM login: ` prefix.
- Remove both inline `require('child_process')` statements and the surrounding hand-rolled Promise wrappers, now that `runProcess` returns a Promise.

Extend `bbj-vscode/test/command-argv-injection.test.ts` with behaviours 1-3.

Add `bbj-vscode/test/no-shell-command-construction.test.ts`: read `src/Commands/Commands.cjs` and `src/extension.ts` from disk, strip line comments, and assert zero matches for a shell-string process launch and zero `child_process` imports in either file. Head the file with a comment naming GHSA-p5f3-9456-9pcx and stating that this guard is what keeps the fix from silently regressing — it is the only automated check covering the wiring inside `Commands.cjs`, which cannot be loaded under Vitest.
  </action>
  <verify>
    <automated>cd bbj-vscode && test "$(sed 's://.*::' src/Commands/Commands.cjs src/extension.ts | grep -cE '(^|[^.[:alnum:]_])exec[[:space:]]*\(')" -eq 0 && test "$(sed 's://.*::' src/extension.ts | grep -cE 'buildEmValidateArgv|buildEmLoginArgv')" -ge 2 && npx tsc -b tsconfig.json --force && npm run lint && npm test</automated>
  </verify>
  <done>Neither `Commands.cjs` nor `extension.ts` launches a process through a shell-interpreted string, and neither imports `child_process`. All seven command constructions from the objective's surface table use argument arrays. `no-shell-command-construction.test.ts` fails if any of that is undone. `npm test` and `npm run lint` both pass with no BBj installation and no service on port 5008.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| workspace settings file → extension host | `bbj.classpath`, `bbj.configPath`, `bbj.web.apps.*`, and the string-typed `bbj.compiler.*` options are all `window`-scoped and settable from a workspace's own committed settings file; the extension declares no `capabilities.untrustedWorkspaces` restriction |
| another extension's `executeCommand` → `bbj.run` / `bbj.runBUI` / `bbj.runDWC` / `bbj.compile` | the `params` object, and therefore `params.fsPath`, originates outside this extension |
| extension host → child process | the boundary being hardened: today a command string crosses it and a shell parses it; after this change an executable path plus an argument array crosses it and no shell is involved |
| extension host → debug output channel | EM tokens and passwords are rendered into a user-visible log |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Elevation of Privilege | `Commands.cjs` run / runBUI / runDWC / compile / decompile command construction | critical | mitigate | Task 1 and Task 2 replace shell-string construction with `Argv` builders and `execFile`-backed launches, so every workspace-settable value becomes one inert argument element |
| T-quick-02 | Elevation of Privilege | `extension.ts` EM token validation and EM login command construction | high | mitigate | Task 3 routes both through `buildEmValidateArgv` / `buildEmLoginArgv` and `runProcess`; credentials become argument elements a shell never sees |
| T-quick-03 | Tampering | `params.fsPath` reaching `bbj.run` / `bbj.runBUI` / `bbj.runDWC` / `bbj.compile` from another extension | high | mitigate | Same argument-array conversion; the path is always a single trailing positional element, proven by the `params.fsPath` group tests in Tasks 1 and 2 |
| T-quick-04 | Information Disclosure | debug logging of the full invocation, including EM token and password, to the output channel | medium | mitigate | `formatArgvForLog(argv, secrets)` redacts every non-empty secret; Task 3 behaviour 3 asserts it for both EM invocations |
| T-quick-05 | Tampering | a later edit reintroducing shell-string command construction at any launch site | medium | mitigate | `no-shell-command-construction.test.ts` scans both files in `npm test`, and every task carries a comment-stripped grep gate asserting a zero count |
| T-quick-06 | Denial of Service | `execFile` inherits the 1 MB default stdout buffer, as the previous API did | low | accept | Behaviour is unchanged by this plan; the existing `bbj-cpl-service.ts` streaming-`spawn` path already covers the high-volume case |
| T-quick-SC | Tampering | npm / pip / cargo installs | low | accept | This plan installs no packages and adds no dependency — the two new modules use only Node built-ins and existing project code, so no package-legitimacy audit is required |
</threat_model>

<verification>
Run from `bbj-vscode/`:

1. `npm test` — the whole suite, including the three new files, with no BBj installation and no java-interop service on port 5008.
2. `npx tsc -b tsconfig.json --force` — clean.
3. `npm run lint` — clean.
4. `npm run build` — the esbuild bundle resolves the new `.ts` modules required from `Commands.cjs`, the same way it already resolves `./CompilerOptions` and `../decompile-io`.
5. Shell-string launch count is zero: `sed 's://.*::' src/Commands/Commands.cjs src/extension.ts | grep -cE '(^|[^.[:alnum:]_])exec[[:space:]]*\('` prints `0` (it prints `5` at HEAD 291cd23).
6. Argument-array launches are wired in: `sed 's://.*::' src/Commands/Commands.cjs | grep -cE 'buildRunArgv|buildWebRunArgv|buildCompileArgv|buildDecompileArgv'` is at least 4, and the same scan of `src/extension.ts` for `buildEmValidateArgv|buildEmLoginArgv` is at least 2.
7. Out of scope and unchanged: `src/document-formatter.ts` and `src/language/bbj-cpl-service.ts` already spawn with argument arrays — `git diff --stat` must not list them.

Manual smoke (requires a BBj installation, not part of `npm test` and not a blocker for this plan): Run, Run BUI, Run DWC, Compile, Denumber, Decompile and Decompile (read-only) each still launch, and EM login still succeeds, with `bbj.classpath` and `bbj.configPath` set to ordinary values.
</verification>

<success_criteria>
- All seven command constructions listed in the objective's surface table pass an executable path plus an argument array; zero shell-string launches remain in `bbj-vscode/src/`.
- A configuration value containing a shell metacharacter is proven by test to reach the child process as one inert, byte-identical argument element, for at least one representative call site in each affected settings group: `bbj.classpath`, `bbj.configPath`, `bbj.web.apps.<file>.name`, `bbj.compiler.*`, and the caller-supplied `params.fsPath`.
- The launcher is proven by test to hand its argument array to `execFile` and never to build a command line.
- `no-shell-command-construction.test.ts` fails if shell-string construction is reintroduced in either file.
- EM token and password are redacted in debug output.
- `npm test`, `npm run lint`, `npx tsc -b` and `npm run build` all pass; the suite needs neither a BBj installation nor the java-interop service on port 5008.
- Existing behaviour is preserved: compiler-option order, bbjlst flag combinations, the `--` classpath sentinel handling, the issue #382 config.bbx fallback, `AutoSaveUponRun` ordering, EM timeouts, and every user-facing error message.
- No artifact in `.planning/` contains an exploit payload or trigger sequence; the only metacharacter appearing anywhere is the inert test fixture.
</success_criteria>

<output>
Create `.planning/quick/260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape/260820-hxg-SUMMARY.md` when done.
</output>
