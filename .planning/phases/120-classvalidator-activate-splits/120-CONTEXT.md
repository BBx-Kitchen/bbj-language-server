# Phase 120: ClassValidator & activate() Splits - Context

**Gathered:** 2026-09-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Two behaviour-neutral refactors, plus two dead branches deleted:

- **REF-10 (#625):** `ClassValidator` in `bbj-vscode/src/language/validations/check-classes.ts`
  (579 lines) is split into modules along its four responsibilities. Diagnostics stay identical.
- **REF-11 (#564):** the VS Code `activate()` in `bbj-vscode/src/extension.ts` (lines 664-1027) is
  split into single-purpose registration functions. EM validate, EM login and the `Commands.cjs`
  run path share one exec-wrapping helper that has its own unit tests. The `bbj.em.credentials`
  fallback and the leftover non-token credential branch in `runWeb` are deleted.

Nothing else changes. No new validation rules, no `FINAL_TYPE_ASSIGNABLE_TO` coverage changes
(#466 stays open), and no new user-visible behaviour.

</domain>

<decisions>
## Implementation Decisions

### ClassValidator split (REF-10, #625)
- **D-01:** **Four modules**, one per responsibility, so roadmap criterion 1 ("live in separate
  modules") holds literally:
  1. class reference and visibility (`checkClassReference`, `warnUnresolvableType`,
     `checkBBjClass`, `isSubFolderOf`)
  2. return type and field initializer (`checkMethodReturn`, `checkReturnTypeAssignable`,
     `isAssignable`, `classDisplayName`, `checkFieldInit`, `literalTypeMismatch`,
     `simpleTypeName`, the `STRING_/NUMERIC_/BBJ_SCALAR_RETURN_TYPES` sets and
     `FINAL_TYPE_ASSIGNABLE_TO`)
  3. constructor (`checkInstantiable`, `checkConstructorArguments`, `isArrayConstruction`)
  4. cyclic inheritance (`checkCyclicInheritance`)

  #625's own acceptance text (extract return-type/field-init and constructor only) is a subset of
  this, so both are met.
- **D-02:** The extracted checks are **exported free functions**. Each takes its dependencies
  (`TypeInferer`, `JavaInteropService`) as arguments, following the pattern of
  `check-function-calls.ts` and `check-unknown-java-member.ts`. The static sets and the map become
  module-level constants. `FINAL_TYPE_ASSIGNABLE_TO` moves with the same entries in the same order
  and the same lookup, because #466 would extend it later.
- **D-03:** **One registration entry point.** `check-classes.ts` keeps `registerClassChecks` and its
  single `ValidationChecks` map. The per-node-type handlers (`Use`, `BbjClass`, `ConstructorCall`,
  `MethodDecl`, `FieldDecl`, `ParameterDecl`, `VariableDecl`) call into the new modules in exactly
  today's order: for example, `ConstructorCall` still runs reference, then instantiable, then
  arguments, and `BbjClass` still runs the visibility early-return, then extends/implements, then
  cycles. So diagnostic order can't change. `bbj-validator.ts` is untouched. The `ClassValidator`
  class goes away, or shrinks to nothing; `registry.register(classChecks, validator)` loses its
  `thisArg` only if no handler still needs it.
- **D-04:** **New shared helper module** (e.g. `validations/class-types.ts`) for the exported
  helpers `classFqn`, `bbjSupertypesReach`, `bbjTypesAreRelated` and `KNOWN_BBJ_SCALAR_TYPES`.
  `check-variable-scoping.ts` imports `bbjTypesAreRelated` and `KNOWN_BBJ_SCALAR_TYPES` from the
  new module. The return-type module imports what it needs from there as well. No re-export shim
  in `check-classes.ts` (no test imports these from `check-classes.ts`; only
  `check-variable-scoping.ts` does).

### Shared exec helper (REF-11, #564)
- **D-05:** **Layer on `runProcess`.** `process-runner.ts`'s `runProcess` (with its existing tests
  in `test/process-runner.test.ts`) is the shared exec core that all three sites use. A new
  helper, e.g. `runScriptToOwnerOnlyFile(argv, prefix, timeoutMs)`, is built on it. It creates the
  owner-only temp file (`createOwnerOnlyFile`), runs with
  `env: { ...process.env, ...argv.env }` and the timeout, reads and trims the output file, and
  always unlinks it. EM login (15 s) and EM validate (10 s) both call it. The helper gets its own
  unit tests: output returned, temp file removed on success and on failure, env spread over
  `process.env`, timeout passed through, rejection propagated.
- **D-06:** **Keep `Commands.cjs`'s `execWithProgress` alias.** It is already
  `(argv) => runProcess(argv)`, and `test/decompile-io.test.ts:328` pins the text
  `execWithProgress(argv)`. Only its doc comment changes, to name `runProcess` as the shared helper.
- **D-07:** **Error handling stays with the callers.** The helper returns the trimmed output or
  rethrows the `ProcessError` unchanged. EM login keeps its `stderr || message` rethrow, the
  `ERROR:` prefix check and the token-validity check. EM validate keeps its catch-all `false`.
  Every user-visible message stays byte-identical.
- **D-08:** **New `em-auth` module** (e.g. `src/em-auth.ts`) holds the `bbj.loginEM` handler,
  `validateTokenServerSide`, `ensureValidToken` and `getEMCredentials`. `extension.ts` only
  registers them. `getEMCredentials` stays importable from `extension.ts` via a re-export, because
  `test/em-token-expiry-wiring.test.ts` imports it from there. The temp-file helper lives in
  `process-runner.ts` or next to `em-auth`, whichever the planner prefers.

### Dead branches
- **D-09:** Delete `getEMCredentials()`'s `secretStorage?.get('bbj.em.credentials')` fallback.
- **D-10:** **Also delete `runWeb`'s non-token `else` branch** (`Commands.cjs`, "Username/password
  from SecretStorage"). The `bbj.web.username`/`bbj.web.password` settings read that #564 names was
  already removed in Phase 112 (#546/#565). This `else` branch is what's left of it, and after D-09
  no caller can reach it. The planner first checks that no existing test drives a non-token
  credential through `runWeb`. If one does, the branch stays and the SUMMARY says why.
- **D-11:** **Keep the `{ username: '__token__', password: token }` shape.** It is the interface
  between `getEMCredentials`, `ensureValidToken`, `Commands.runBUI`/`runDWC` and the tests.
  Changing it is out of scope.
- **D-12:** **No cleanup of stale `bbj.em.credentials` secrets.** Nothing reads them after this
  phase, and adding a delete-on-activation is new behaviour.

### activate() layout, shared state and source guards
- **D-13:** **Mixed by size.** `em-auth.ts` (D-08) plus one or two modules for the large pieces:
  for example, the status bars (suppression, BBjCPL, config-reload) and the tokenized and
  line-numbered open prompts with their `prompted*` state sets. Small `register*` functions stay
  in `extension.ts`. `activate()` then reads as an ordered list of `register*` calls, and the
  **registration order stays as it is today** (composer registrations first, `secretStorage`, the
  output channel, the client, the restart gate, then commands and listeners).
- **D-14:** **Shared state is passed as deps.** Each `register*(context, deps)` receives what it
  needs, such as a `getClient()` accessor (restarts reuse the same client instance), the output
  channel and the secret storage, like `registerSetOptsInCodeComposer(context, sendRequest)` and
  Phase 116's `register*(connection, deps)`. No new module-level globals in the new modules.
- **D-15:** **Widen guard file lists only.** Where a source guard names `extension.ts`
  (`em-secret-env-channel`, `target-resolution`, `setopts-in-code-ui`,
  `no-shell-command-construction`, and any the planner finds), add the new module to its file
  list or path constant, or point a block extraction at the file the code moved to. No `expect()`
  changes and no loosened patterns. For example, a `> 0` count check must still hold per file it
  covers, or be applied to the file that now holds the calls. The SUMMARY lists every guard
  touched and states that the checks are unchanged. This is how "tests pass unchanged" is read for
  this phase: moving the file path a guard points at is allowed, changing an assertion is not.
- **D-16:** **Command-registration proof:** a new test activates with the mocked `vscode` (the
  `extension-activation.test.ts` pattern) and asserts that every `contributes.commands` id in
  `bbj-vscode/package.json` was passed to `registerCommand`. A named allow-list, each entry with a
  one-line reason, covers ids registered elsewhere (for example composer modules mocked in that
  suite). This proves criterion 3's "every contributed command is still registered".

### Verification
- **D-17:** "Identical diagnostics" means `class-validations-issues.test.ts` and
  `inheritance-cycle-validation.test.ts` (plus every other validation suite) pass without
  assertion changes. When in doubt, compare against the phase base (v4.7 constraint). The
  activation, `Commands.cjs`, EM and process-runner suites pass unchanged except for the file-list
  widening in D-15.
- **D-18:** Criterion 4 is a hand UAT in VS Code: run a GUI, a BUI and a DWC program, log into EM,
  compile a file. Build and install the VSIX from the final tree first (after any code-review
  fixes).

### Claude's Discretion
- File names for the four validation modules, the helper module, the EM temp-file helper and the
  new activate() modules.
- Exactly which concerns are big enough for their own module (D-13), within "mixed by size".
- Whether `ensureValidToken`'s `creds.username === '__token__'` check stays as written (it becomes
  always true after D-09). Keep it unless dropping it is clearly behaviour-neutral.
- Plan split and ordering. REF-10 and REF-11 are independent and can run in parallel waves.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` § "Phase 120: ClassValidator & activate() Splits": goal, success criteria, planning notes
- `.planning/REQUIREMENTS.md`: REF-10, REF-11
- GitHub issue #625 (`gh issue view 625`): ClassValidator responsibilities and acceptance criteria
- GitHub issue #564 (`gh issue view 564`): activate() concerns, exec duplication, the two dead branches
- GitHub issue #466: the open feature request that would extend `FINAL_TYPE_ASSIGNABLE_TO` (do not act on it)

### Code being split
- `bbj-vscode/src/language/validations/check-classes.ts`: `registerClassChecks`, `ClassValidator`, exported helpers
- `bbj-vscode/src/language/validations/check-variable-scoping.ts`: imports `bbjTypesAreRelated`, `KNOWN_BBJ_SCALAR_TYPES`
- `bbj-vscode/src/language/validations/check-function-calls.ts`, `check-unknown-java-member.ts`: the free-function module pattern to follow
- `bbj-vscode/src/extension.ts`: `activate()`, `getEMCredentials`, `validateTokenServerSide`, `ensureValidToken`, the `bbj.loginEM` handler
- `bbj-vscode/src/Commands/Commands.cjs`: `execWithProgress`, `runWeb`
- `bbj-vscode/src/Commands/process-runner.ts`: `runProcess`, `runProcessCallback`, the shared exec core

### Tests that must stay green (and the source guards D-15 may widen)
- `bbj-vscode/test/class-validations-issues.test.ts`, `bbj-vscode/test/inheritance-cycle-validation.test.ts`
- `bbj-vscode/test/extension-activation.test.ts`, `em-token-expiry-wiring.test.ts`, `em-login-username.test.ts`, `commands-cjs-execution.test.ts`, `process-runner.test.ts`
- Source guards naming `extension.ts`/`Commands.cjs`: `bbj-vscode/test/em-secret-env-channel.test.ts`, `target-resolution.test.ts`, `setopts-in-code-ui.test.ts`, `no-shell-command-construction.test.ts`, `decompile-io.test.ts` (pins `execWithProgress(argv)`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `runProcess` / `runProcessCallback` (`src/Commands/process-runner.ts`): the execFile-only launcher with the `bbj.home` layout check. Already unit-tested.
- `createOwnerOnlyFile`, `buildEmLoginArgv`, `buildEmValidateArgv`, `formatArgvForLog`: already used by both EM paths and move with them unchanged.
- The `extension-activation.test.ts` mocked-`vscode` harness, with a `registerCommand` spy: the base for the D-16 test.

### Established Patterns
- Validation modules export `register*Checks(registry, services)` plus free check functions (`check-function-calls.ts`, `check-unknown-java-member.ts`).
- Host registration functions take `(context, deps)`: `registerSetOptsInCodeComposer(context, sendRequest)`, and Phase 116's `register*(connection, deps)` in the language server.
- The secret env is always spread over `process.env`, and a guard enforces it (`em-secret-env-channel`).
- No planning identifiers in source or test comments; issue numbers are fine.

### Integration Points
- `bbj-validator.ts` calls `registerClassChecks` (unchanged).
- `Commands.runBUI`/`runDWC` receive credentials from `ensureValidToken` (moving to `em-auth`).
- `activate()` must keep registration order: composers, `secretStorage`, the output channel, the client, the restart gate, then the rest.

</code_context>

<specifics>
## Specific Ideas

- #564 cites line numbers from before Phases 110-116. `activate()` is now lines 664-1027. The
  `bbj.web.username`/`password` read it describes is already gone. Close #564 by citing the helper
  (D-05), the em-auth extraction (D-08) and the two deletions (D-09, D-10).
- Close both issues through `Closes #625` / `Closes #564` lines in the milestone PR. Table rows
  alone don't close issues.

</specifics>

<deferred>
## Deferred Ideas

- Simplifying the `__token__` credential shape to a bare token (D-11).
- Deleting stale `bbj.em.credentials` entries from users' SecretStorage (D-12).
- Extending `FINAL_TYPE_ASSIGNABLE_TO` sibling-type coverage (#466).

### Reviewed Todos (not folded)
- `2026-09-26-intellij-interop-initoptions-key-mismatch.md`: IntelliJ plus language-server key mismatch. It matched on keywords only and is unrelated to the splits.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md`: a security escaping fix, unrelated to the splits.
- `2026-09-27-windows-intellij-node-download-progress-check.md`: a Windows IntelliJ hand check, unrelated.

</deferred>

---

*Phase: 120-classvalidator-activate-splits*
*Context gathered: 2026-09-29*
