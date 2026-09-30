# Phase 120: ClassValidator & activate() Splits - Research

**Researched:** 2026-09-29
**Domain:** TypeScript refactor — Langium validator decomposition + VS Code extension `activate()` decomposition, behaviour-neutral
**Confidence:** HIGH (every claim below is grounded in a `Read`/`grep`/test-run performed this session; no external library research was needed — this phase adds no new dependencies)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**ClassValidator split (REF-10, #625)**
- **D-01:** Four modules, one per responsibility: (1) class reference and visibility (`checkClassReference`, `warnUnresolvableType`, `checkBBjClass`, `isSubFolderOf`); (2) return type and field initializer (`checkMethodReturn`, `checkReturnTypeAssignable`, `isAssignable`, `classDisplayName`, `checkFieldInit`, `literalTypeMismatch`, `simpleTypeName`, the `STRING_/NUMERIC_/BBJ_SCALAR_RETURN_TYPES` sets and `FINAL_TYPE_ASSIGNABLE_TO`); (3) constructor (`checkInstantiable`, `checkConstructorArguments`, `isArrayConstruction`); (4) cyclic inheritance (`checkCyclicInheritance`).
- **D-02:** Extracted checks are exported free functions taking dependencies (`TypeInferer`, `JavaInteropService`) as arguments, following `check-function-calls.ts`/`check-unknown-java-member.ts`. Static sets/maps become module-level constants. `FINAL_TYPE_ASSIGNABLE_TO` moves with identical entries/order/lookup.
- **D-03:** One registration entry point. `check-classes.ts` keeps `registerClassChecks` and its single `ValidationChecks` map. Per-node-type handlers call the new modules in exactly today's order. `bbj-validator.ts` is untouched. `ClassValidator` goes away or shrinks to nothing; `registry.register(classChecks, validator)` loses its `thisArg` only if no handler still needs it.
- **D-04:** New shared helper module (e.g. `validations/class-types.ts`) for `classFqn`, `bbjSupertypesReach`, `bbjTypesAreRelated`, `KNOWN_BBJ_SCALAR_TYPES`. `check-variable-scoping.ts` imports from the new module. No re-export shim in `check-classes.ts`.

**Shared exec helper (REF-11, #564)**
- **D-05:** Layer on `runProcess`. New helper `runScriptToOwnerOnlyFile(argv, prefix, timeoutMs)` creates the owner-only temp file (`createOwnerOnlyFile`), runs with `env: { ...process.env, ...argv.env }` and the timeout, reads/trims the output file, always unlinks it. EM login (15s) and EM validate (10s) both call it. Own unit tests: output returned, temp file removed on success/failure, env spread, timeout passed through, rejection propagated.
- **D-06:** Keep `Commands.cjs`'s `execWithProgress` alias — already `(argv) => runProcess(argv)`; `test/decompile-io.test.ts:328` pins the text `execWithProgress(argv)`. Only its doc comment changes.
- **D-07:** Error handling stays with callers. Helper returns trimmed output or rethrows `ProcessError` unchanged. EM login keeps `stderr || message` rethrow, `ERROR:` prefix check, token-validity check. EM validate keeps catch-all `false`. Every user-visible message stays byte-identical.
- **D-08:** New `em-auth` module (e.g. `src/em-auth.ts`) holds `bbj.loginEM` handler, `validateTokenServerSide`, `ensureValidToken`, `getEMCredentials`. `extension.ts` only registers them. `getEMCredentials` stays importable from `extension.ts` via a re-export (`test/em-token-expiry-wiring.test.ts` imports it from there). Temp-file helper lives in `process-runner.ts` or next to `em-auth`, planner's choice.

**Dead branches**
- **D-09:** Delete `getEMCredentials()`'s `secretStorage?.get('bbj.em.credentials')` fallback.
- **D-10:** Also delete `runWeb`'s non-token `else` branch (Commands.cjs, "Username/password from SecretStorage"). The planner first checks that no existing test drives a non-token credential through `runWeb`. If one does, the branch stays and the SUMMARY says why.
- **D-11:** Keep the `{ username: '__token__', password: token }` shape — interface between `getEMCredentials`, `ensureValidToken`, `Commands.runBUI`/`runDWC` and tests. Out of scope to change.
- **D-12:** No cleanup of stale `bbj.em.credentials` secrets.

**activate() layout, shared state and source guards**
- **D-13:** Mixed by size. `em-auth.ts` (D-08) plus one or two modules for large pieces: status bars (suppression, BBjCPL, config-reload) and the tokenized/line-numbered open prompts with their `prompted*` state sets. Small `register*` functions stay in `extension.ts`. Registration order stays as today (composer registrations first, `secretStorage`, output channel, client, restart gate, then commands and listeners).
- **D-14:** Shared state passed as deps. Each `register*(context, deps)` receives what it needs (`getClient()` accessor, output channel, secret storage). No new module-level globals in new modules.
- **D-15:** Widen guard file lists only. Where a source guard names `extension.ts` (`em-secret-env-channel`, `target-resolution`, `setopts-in-code-ui`, `no-shell-command-construction`, and any the planner finds), add the new module to its file list or path constant, or point a block extraction at the file the code moved to. No `expect()` changes, no loosened patterns. SUMMARY lists every guard touched and states the checks are unchanged.
- **D-16:** Command-registration proof: a new test activates with the mocked `vscode` (the `extension-activation.test.ts` pattern) and asserts every `contributes.commands` id in `package.json` was passed to `registerCommand`. A named allow-list (each entry with a one-line reason) covers ids registered elsewhere (composer modules mocked in that suite).

**Verification**
- **D-17:** "Identical diagnostics" = `class-validations-issues.test.ts` and `inheritance-cycle-validation.test.ts` (plus every other validation suite) pass without assertion changes. Compare against phase base when in doubt. Activation, Commands.cjs, EM and process-runner suites pass unchanged except D-15's file-list widening.
- **D-18:** Criterion 4 is a hand UAT in VS Code (GUI/BUI/DWC run, EM login, compile). Build/install the VSIX from the final tree first (after code-review fixes).

### Claude's Discretion
- File names for the four validation modules, the helper module, the EM temp-file helper and the new activate() modules.
- Exactly which concerns are big enough for their own module (D-13), within "mixed by size."
- Whether `ensureValidToken`'s `creds.username === '__token__'` check stays as written (becomes always-true after D-09). Keep unless dropping is clearly behaviour-neutral.
- Plan split and ordering. REF-10 and REF-11 are independent and can run in parallel waves.

### Deferred Ideas (OUT OF SCOPE)
- Simplifying the `__token__` credential shape to a bare token (D-11).
- Deleting stale `bbj.em.credentials` entries from users' SecretStorage (D-12).
- Extending `FINAL_TYPE_ASSIGNABLE_TO` sibling-type coverage (#466).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REF-10 | `ClassValidator` is split into modules along its four responsibilities, with unchanged diagnostics (#625) | Full method/line inventory below (Architecture Patterns § ClassValidator groups) proves a clean four-way split with zero cross-group private-helper sharing; import graph confirms only `bbj-validator.ts` and `check-variable-scoping.ts` consume `check-classes.ts` exports, and no test imports them directly — so D-04's "no re-export shim" is safe. |
| REF-11 | `activate()` is split into single-purpose registration functions sharing one exec-wrapping helper, with unchanged behaviour (#564) | Full `activate()` inventory (lines 664-1025) below, with every registration block, module-level state variable and command id mapped; the D-10 branch-survival check (§ Common Pitfalls, Pitfall 1) is answered directly: an existing test DOES drive a non-token credential through `runWeb`, so the branch must stay. |
</phase_requirements>

## Summary

Both halves of this phase are pure, low-risk mechanical splits of already-well-tested code — nothing in either target file needs new logic, only relocation. `check-classes.ts` (579 lines) decomposes cleanly: every private helper method is used by exactly one of the four responsibility groups (no cross-group calls exist inside the class), and the only two things any other file imports from it are `registerClassChecks` (consumed solely by `bbj-validator.ts`) and the four helpers `classFqn`/`bbjSupertypesReach`/`bbjTypesAreRelated`/`KNOWN_BBJ_SCALAR_TYPES` (consumed solely by `check-variable-scoping.ts`). No test file imports any `check-classes.ts` export directly — every validation test drives the checks through the full Langium validation pipeline (`createBBjServices` + `validationHelper`), so `class-validations-issues.test.ts`/`inheritance-cycle-validation.test.ts` will not need a single line changed, only the same diagnostics from a different file layout.

`extension.ts`'s `activate()` (lines 664-1025, ~360 lines) is a flat sequence of `context.subscriptions.push(...)` registrations. It has exactly one significant landmine: **the D-10 branch-survival check comes back positive** — `test/commands-cjs-execution.test.ts` already exercises `runWeb`'s non-token credential path 4 times (lines 233, 249, 261/264, 272/280, 292, 318) with `{ username: 'jdoe', password: 'pw' }`. Per D-10's own instruction, this means **the `else` branch in `Commands.cjs`'s `runWeb` must stay**, and the SUMMARY must record why (D-09's deletion of the `bbj.em.credentials` fallback in `getEMCredentials` still proceeds — no caller can *construct* such a credential object anymore in production code, but the branch itself must not be deleted because tests still construct one directly).

The second major finding is a **sixth source guard beyond CONTEXT's named five**: `test/config-reload-host.test.ts` (lines 562-599) does a whole-file text-count assertion against `extension.ts` — exactly one `client.start()`, exactly one `client.stop(`, exactly one `createRestartGate(`, and exactly one `client.onNotification(CONFIG_RELOAD_METHOD` occurrence, with a body-content assertion on that last one. If the config-reload status bar handler (one of D-13's "large pieces" candidates for its own module) is extracted, this guard's `CONFIG_RELOAD_METHOD` assertion moves with it and needs the same D-15 treatment as the five CONTEXT already named.

**Primary recommendation:** Plan REF-10 (ClassValidator split, 4 files + 1 shared helper) and REF-11 (activate() split, em-auth.ts + 1-2 activate modules + Commands.cjs's `runWeb` branch staying) as two independent waves. Every fact needed to write both plans without further exploration is captured below with file:line citations.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Class-reference/visibility validation | Langium validation (language server) | — | Runs inside `registerClassChecks`, invoked from `bbj-validator.ts`'s `registerValidationChecks`, part of the shared LSP backend both IDEs consume. |
| Return-type/field-initializer validation | Langium validation (language server) | — | Same tier; uses `TypeInferer` (also language-server-side). |
| Constructor validation | Langium validation (language server) | — | Same tier; pure AST/index lookups (`getClass`), no host dependency. |
| Cyclic-inheritance validation | Langium validation (language server) | — | Same tier; pure AST walk. |
| `activate()` registration wiring | VS Code host (extension) | — | `vscode.ExtensionContext`/`vscode.commands`/`vscode.window` APIs only exist in the VS Code extension host process, never the language server. |
| EM login/validate exec (`em-auth.ts`) | VS Code host (extension) | Commands.cjs (CommonJS host module) | Spawns `bbj` via `execFile` from the extension host; `runWeb`'s web-launch counterpart lives in the CommonJS `Commands.cjs` sibling module for historical reasons (`require`-based, not ESM), not because it belongs to a different runtime tier. |
| Shared exec helper (`runScriptToOwnerOnlyFile`) | VS Code host (extension) | — | Builds on `process-runner.ts`'s `runProcess`, itself host-tier (uses Node's `child_process`). |

## Standard Stack

No new external dependency is introduced by this phase. Every helper, pattern and test utility this phase needs already exists in the repository:

| Asset | Location | Role in this phase |
|-------|----------|---------------------|
| `runProcess` / `runProcessCallback` / `formatArgvForLog` | `bbj-vscode/src/Commands/process-runner.ts` | The exec core the new `runScriptToOwnerOnlyFile` helper (D-05) is built on. |
| `createOwnerOnlyFile` / `buildEmLoginArgv` / `buildEmValidateArgv` | `bbj-vscode/src/Commands/process-args.ts` | Already used by both EM paths; move (unchanged) with the em-auth extraction. |
| `check-function-calls.ts`, `check-unknown-java-member.ts` | `bbj-vscode/src/language/validations/` | The two existing free-function validator module precedents (see Architecture Patterns). |
| `registerSetOptsInCodeComposer(context, sendRequest)` | `bbj-vscode/src/setopts-in-code-ui.ts` | The existing `register*(context, deps)` precedent for D-14. |
| `extension-activation.test.ts`'s mocked-`vscode` harness | `bbj-vscode/test/extension-activation.test.ts` | Base for the D-16 command-registration proof test. |

**Installation:** None — no `npm install` needed for this phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs no external packages; it only moves existing first-party TypeScript/CommonJS code between files. No `package-legitimacy check` was run because there is nothing to check.

## Architecture Patterns

### System Architecture Diagram — ClassValidator split (REF-10)

```
                     bbj-validator.ts (registerValidationChecks)
                                    |
                                    v
                  check-classes.ts :: registerClassChecks(registry, services)
                  (single ValidationChecks<BBjAstType> map — UNCHANGED)
                                    |
        +---------------+----------+----------+---------------+
        |               |                     |               |
        v               v                     v               v
   Use/BbjClass/    MethodDecl/          ConstructorCall   BbjClass
   Param/VarDecl     FieldDecl                |            (cycle only)
        |               |                     |               |
        v               v                     v               v
  check-class-      check-return-      check-constructor  check-cyclic-
  reference.ts       types.ts             .ts               inheritance.ts
  (group 1)          (group 2)           (group 3)           (group 4)
        |               |
        +-------+-------+
                |
                v
        class-types.ts (classFqn, bbjSupertypesReach,
                         bbjTypesAreRelated, KNOWN_BBJ_SCALAR_TYPES)
                |
                v
   check-variable-scoping.ts  (imports bbjTypesAreRelated,
                                KNOWN_BBJ_SCALAR_TYPES — UNCHANGED import shape,
                                new source path only)
```

### System Architecture Diagram — activate() split (REF-11)

```
extension.ts :: activate(context)
   |
   +-- registerMsgboxComposer / AddWindow / AddChildWindow / ComposerLens /
   |   Cvs / SetOpts / SetOptsInCode composers   [UNCHANGED — stay inline, small]
   |
   +-- secretStorage = context.secrets
   +-- outputChannel = vscode.window.createOutputChannel(...)
   +-- client = startLanguageClient(context, outputChannel)   [UNCHANGED — stays inline]
   +-- restartGate = createRestartGate(client, onConfigRestartPhase)  [UNCHANGED]
   |
   +-- register*(context, deps) calls, each a single-purpose function:
   |     |
   |     +--> registerEmAuthCommands(context, deps)  --> em-auth.ts
   |     |        (bbj.loginEM handler, getEMCredentials [re-exported],
   |     |         validateTokenServerSide, ensureValidToken)
   |     |        `runScriptToOwnerOnlyFile` <-- process-runner.ts (or em-auth.ts)
   |     |
   |     +--> registerStatusBars(context, deps) --> activate-status-bars.ts (name TBD)
   |     |        (suppression status bar, BBjCPL availability status bar,
   |     |         config-reload status bar + onConfigRestartPhase +
   |     |         client.onNotification(CONFIG_RELOAD_METHOD ...))
   |     |
   |     +--> registerTokenizedAndLineNumberedPrompts(context, deps) --> activate-open-prompts.ts (name TBD)
   |              (promptedTokenizedFiles / promptedLineNumberedDocs sets,
   |               maybePromptTokenized, maybePromptLineNumbered, tab/editor listeners)
   |
   +-- remaining small register* calls (bbj.config/.properties/.em/.run/.compile/
        .denumber/.decompile*/.configureCompileOptions/.refreshJavaClasses/
        .showClasspathEntries/.runBUI/.runDWC, DocumentFormatter, config-path
        association sweep/listeners)  [UNCHANGED — stay inline, small per D-13]
```

### ClassValidator groups: full method/field inventory with line ranges (D-01/D-02)

All line numbers below are from `bbj-vscode/src/language/validations/check-classes.ts` as read this session (579 total lines).

**Module-level (outside the class), lines 10-163 — these stay module-level, not group members:**
- `registerClassChecks(registry, services)` — lines 10-87. The single registration entry point (D-03). Calls into all four groups; **stays in `check-classes.ts`**.
- `classFqn(klass)` — lines 89-100 → moves to `class-types.ts` (D-04).
- `bbjSupertypesReach(klass, target)` — lines 102-126 → moves to `class-types.ts`.
- `KNOWN_BBJ_SCALAR_TYPES` (const Set) — line 136 → moves to `class-types.ts`.
- `bbjTypesAreRelated(a, b)` — lines 144-163 → moves to `class-types.ts`.

**`class ClassValidator` body, lines 165-578:**

| Group | Members (line ranges) | Needs `inferer`? | Needs `javaInterop`? | Cross-calls |
|-------|------------------------|:---:|:---:|--------------|
| 1. Class reference & visibility | `constructor` (167-168, shared by all groups today — dissolves), `isSubFolderOf` (170-176, private), `checkClassReference` (178-194, public), `warnUnresolvableType` (205-221, private), `checkBBjClass` (223-254, public) | No | **Yes** (`javaInterop.isClasspathAvailable()` in `warnUnresolvableType`, line 209) | `checkClassReference` calls `warnUnresolvableType` and `checkBBjClass` — both group 1. `isSubFolderOf` used only by `checkBBjClass`. |
| 2. Return type & field initializer | `STRING_RETURN_TYPES`/`NUMERIC_RETURN_TYPES` (258-259), `checkMethodReturn` (270-325, public), `BBJ_SCALAR_RETURN_TYPES` (330), `FINAL_TYPE_ASSIGNABLE_TO` (340-352), `checkReturnTypeAssignable` (368-388, private), `isAssignable` (396-423, private), `classDisplayName` (426-428, private), `checkFieldInit` (435-446, public), `literalTypeMismatch` (455-478, private), `simpleTypeName` (481-487, private) | **Yes** (`this.inferer.getType(returned)` in `checkReturnTypeAssignable`, line 381) | No | `checkMethodReturn` calls `literalTypeMismatch` and `checkReturnTypeAssignable`. `checkReturnTypeAssignable` calls `simpleTypeName`, `isAssignable`, `classDisplayName`. `checkFieldInit` calls `literalTypeMismatch`. `literalTypeMismatch` calls `simpleTypeName`. All calls stay inside group 2. |
| 3. Constructor | `checkInstantiable` (493-504, public), `checkConstructorArguments` (514-536, public), `isArrayConstruction` (543-551, private) | No | No | `checkInstantiable` and `checkConstructorArguments` both call `isArrayConstruction` — both group 3. |
| 4. Cyclic inheritance | `checkCyclicInheritance` (553-577, public) | No | No | None — self-contained. |

**Zero cross-group private-helper sharing exists.** Every private helper (`isSubFolderOf`, `warnUnresolvableType`, `checkReturnTypeAssignable`, `isAssignable`, `classDisplayName`, `literalTypeMismatch`, `simpleTypeName`, `isArrayConstruction`) is called only from within its own group. Nothing needs to be duplicated or kept as a fifth shared file beyond `class-types.ts`. This means (per D-02) group 1's exported functions take `javaInterop: JavaInteropService` as a parameter, group 2's take `inferer: TypeInferer`, and groups 3/4's take neither — mirroring `check-function-calls.ts` (no services) vs. `check-unknown-java-member.ts` (takes `TypeInferer` only) exactly.

**Per-node-type handler order in `registerClassChecks` (D-03 — must be preserved exactly), lines 13-84:**
```
Use:            checkBBjClass (group 1, only when the ref resolves to a BbjClass with visibility)
BbjClass:       [visibility early-return] -> checkClassReference(extends)*N (group1) -> checkClassReference(implements)*N (group1) -> checkCyclicInheritance (group4, only if extends.length > 0)
ConstructorCall: checkClassReference(klass) (group1) -> checkInstantiable (group3) -> checkConstructorArguments (group3)
MethodDecl:     checkClassReference(returnType) (group1) -> checkMethodReturn (group2)
FieldDecl:      checkClassReference(type) (group1) -> checkFieldInit (group2)
ParameterDecl:  checkClassReference(type) (group1) only
VariableDecl:   checkClassReference(type) (group1) only
```
Nothing here is ambiguous or fails to fit one of the four groups.

### Every importer of `check-classes.ts` exports (src/ and test/)

Confirmed via `grep -rn` across `bbj-vscode/src` and `bbj-vscode/test`:

- `bbj-vscode/src/language/bbj-validator.ts:17` — `import { registerClassChecks } from './validations/check-classes.js';`, called once at `bbj-validator.ts:74`. **This is the only consumer of `registerClassChecks`.**
- `bbj-vscode/src/language/validations/check-variable-scoping.ts:26` — `import { bbjTypesAreRelated, KNOWN_BBJ_SCALAR_TYPES } from './check-classes.js';`, used at lines 358 and 373. **This is the only consumer of these two exports.** (`classFqn` and `bbjSupertypesReach` have zero external consumers today — they exist only to be called from inside `bbjTypesAreRelated` itself, lines 148-149/156/159 — but D-04 still names them for export from `class-types.ts` since they are the natural public surface of the new module and `checkReturnTypeAssignable`/`isAssignable` in group 2 also need `classFqn`/`bbjSupertypesReach` directly, lines 400-401/413.)
- **No file under `bbj-vscode/test/` imports any `check-classes.ts` export.** (Confirmed: `grep -rln 'classFqn\|bbjSupertypesReach\|bbjTypesAreRelated\|KNOWN_BBJ_SCALAR_TYPES\|registerClassChecks\|ClassValidator' bbj-vscode/test` returns zero files. The one textual hit in `test/method-return-java-type.test.ts:256` is a comment referencing "check-classes.ts's" FQN-reconstruction logic, not an import.) This confirms D-04's "no re-export shim needed" claim.

### `activate()` full inventory (`extension.ts`, lines 664-1025)

Module-level state used by `activate()` and its helpers (declared lines 46-51, 526, 587, 621-626):
```
let client: LanguageClient;                                    // line 46
let secretStorage: vscode.SecretStorage;                        // line 47
let outputChannel: vscode.LogOutputChannel;                     // line 48
let restartGate: RestartGate | undefined;                       // line 49
let configReloadStatusBar: vscode.StatusBarItem;                 // line 50
let configReloadAutoHideTimer: ReturnType<typeof setTimeout> | undefined;  // line 51
const promptedTokenizedFiles = new Set<string>();                // line 526
const promptedLineNumberedDocs = new Set<string>();              // line 587
let lastKnownActiveConfigPath: string | undefined;               // line 626
```
Per D-14, none of these become new module-level globals in the split-out modules — each new module receives what it needs via `register*(context, deps)` parameters (e.g. a `getClient()`/`getOutputChannel()` accessor), exactly like `registerSetOptsInCodeComposer(context, sendRequest)`.

**Ordered registration blocks inside `activate()` (line ranges from the actual file):**

| Lines | Block | Notes |
|-------|-------|-------|
| 665 | `BBjLibraryFileSystemProvider.register(context)` | stays inline |
| 666-672 | 7 composer registrations (`registerMsgboxComposer`...`registerSetOptsInCodeComposer`) | stays inline (D-13: "small register* functions stay") — each is itself a `register*(context, ...)` call into an *already-separate* module; not part of this phase's split |
| 673 | `secretStorage = context.secrets` | module-level assignment, order-sensitive (must precede any EM code) |
| 675-684 | `outputChannel` creation + `context.subscriptions.push` | stays inline |
| 686 | `client = startLanguageClient(context, outputChannel)` | stays inline; `startLanguageClient` itself is a separate, already-existing function (lines 1038-1132), out of scope |
| 691 | `restartGate = createRestartGate(client, onConfigRestartPhase)` | stays inline — **guarded by `config-reload-host.test.ts`'s exactly-one-`createRestartGate(` count, see Common Pitfalls Pitfall 2** |
| 692-695 | `Commands.setOutputChannel`, `bbj.config`, `bbj.properties`, `bbj.em` command registrations | stays inline, small |
| 698-788 | `bbj.loginEM` command handler (91 lines) | **moves to `em-auth.ts` (D-08)** — uses `createOwnerOnlyFile`, `buildEmLoginArgv`, `runProcess`, `formatArgvForLog`, `isEmTokenExpired`, `rememberEmUsername` |
| 789 | `bbj.run` | stays inline |
| 792-801 | `bbj.runBUI` command handler | **stays inline** (small; calls `ensureValidToken` which moves, and `Commands.runBUI` which doesn't) |
| 804-813 | `bbj.runDWC` command handler | stays inline, same shape as runBUI |
| 814-818 | `bbj.compile`, `bbj.denumber`, `bbj.decompile`, `bbj.decompileReadonly`, `bbj.configureCompileOptions` | stays inline |
| 820-830 | `bbj.refreshJavaClasses` | stays inline |
| 833-872 | `bbj.showClasspathEntries` (uses module-level `getBBjClasspathEntries`, lines 110-142 — unrelated helper, stays) | stays inline |
| 874-879 | `DocumentFormatter` registration | stays inline |
| 884-896 | tokenized-file tab-open detection + initial scan (`maybePromptTokenized`, `promptedTokenizedFiles`) | **candidate for its own module (D-13)** together with the next block |
| 899-903 | line-numbered-file active-editor detection (`maybePromptLineNumbered`, `promptedLineNumberedDocs`) | **candidate for its own module (D-13)** |
| 906-938 | diagnostic-suppression status bar (`suppressionStatusBar`, `updateSuppressionStatus`) | **candidate for status-bar module (D-13)** |
| 940-958 | BBjCPL-availability status bar (`bbjcplStatusBar`, `client.onNotification('bbj/bbjcplAvailability', ...)`) | **candidate for status-bar module** |
| 960-976 | config-reload status bar + `client.onNotification(CONFIG_RELOAD_METHOD, ...)` | **candidate for status-bar module — see Common Pitfalls Pitfall 2 (config-reload-host.test.ts guard)** |
| 978-1023 | resolved-config-path notification handler, config-association sweep + listeners (`applyConfigAssociation`, `releaseConfigAssociation`, `sweepOpenDocumentsForConfigAssociation`, `lastKnownActiveConfigPath`) | module-level helper functions (lines 621-661) already exist outside `activate()`; only the `context.subscriptions.push(...)` wiring at 980-1023 is inside `activate()` itself — could move with the status-bar/config module or stay, planner's discretion |

**`getEMCredentials`/`validateTokenServerSide`/`ensureValidToken` (outside `activate()`, lines 414-522)** — all three move to `em-auth.ts` per D-08. `getEMCredentials` (414-432) is `export`ed already; D-08 requires a re-export from `extension.ts` because `test/em-token-expiry-wiring.test.ts:129` does `import { activate, getEMCredentials } from '../src/extension.js';` — **confirmed this session**, this import will break without the re-export.

### EM login / EM validate exec code paths (exact current shapes)

**`validateTokenServerSide` (lines 438-490):** reads `bbj.home` config; builds `emValidatePath` via `context.asAbsolutePath(path.join('tools', 'em-validate-token.bbj'))`; creates a temp file via `createOwnerOnlyFile(path.join(os.tmpdir(), 'bbj-em-validate-${Date.now()}.tmp'))`; builds argv via `buildEmValidateArgv({ home, platform, scriptPath, token, tmpFile })`; logs via `formatArgvForLog` when `bbj.debug` is true; runs `await runProcess(argv, { timeout: 10000, env: { ...process.env, ...argv.env } })` inside a `try`, reads the temp file in the `try`, always `fs.unlinkSync(tmpFile)` in a `finally`; returns `result === 'VALID'`; any thrown error anywhere is caught by the outer `try`/`catch` and turns into `return false` (D-07: "EM validate keeps its catch-all `false`").

**`bbj.loginEM` handler (lines 698-788):** prompts for `bbj.home`, username (pre-filled via `initialEmUsername(context.globalState)`), password; builds `emLoginPath`; creates a temp file via `createOwnerOnlyFile(path.join(os.tmpdir(), 'bbj-em-login-${Date.now()}.tmp'))`; builds argv via `buildEmLoginArgv({ home, platform, scriptPath, username, password, tmpFile, infoString })` where `infoString` is `"VS Code on ${platformLabel} as ${os.userInfo().username}"`; logs via `formatArgvForLog` (masking `[password]`) when `bbj.debug`; runs `await runProcess(argv, { timeout: 15000, env: { ...process.env, ...argv.env } })` inside a nested `try`/`catch`/`finally` — on catch, rethrows `new Error(pe.stderr || pe.message)` (D-07's "stderr || message rethrow"); `finally` always unlinks the temp file; after the inner block, checks `output.startsWith('ERROR:')` and throws `new Error(output.substring(6))` (D-07's "ERROR: prefix check"); checks `isEmTokenExpired(output, ...)` and throws if so (D-07's "token-validity check"); on success stores the token via `context.secrets.store('bbj.em.token', output)` and calls `rememberEmUsername`; the OUTER `try`/`catch` around all of this shows `vscode.window.showErrorMessage('EM login failed: ${error}')` on any thrown error.

**Both temp-file timeouts (10000ms / 15000ms) and both `createOwnerOnlyFile` + `buildEmValidateArgv`/`buildEmLoginArgv` + `runProcess(argv, { timeout, env: {...process.env, ...argv.env} })` + always-unlink shapes are identical enough that D-05's `runScriptToOwnerOnlyFile(argv, prefix, timeoutMs)` helper can wrap exactly this pattern** — the only per-caller variance is the timeout value, the temp-file prefix (`bbj-em-validate-` vs. `bbj-em-login-`), and what happens to a caught error (D-07 keeps that variance with the callers, not the helper).

`createOwnerOnlyFile` (confirmed via `Read`, `bbj-vscode/src/Commands/process-args.ts:78-85`) lives in **`process-args.ts`**, not `process-runner.ts` — it opens the file with `O_CREAT|O_EXCL|O_WRONLY` mode `0o600`, then `chmodSync(filePath, 0o600)` on non-Windows. This file does not move; only its call sites (currently in `extension.ts`) move to `em-auth.ts`.

### D-10: does an existing test drive a non-token credential through `runWeb`? **YES.**

Confirmed via `grep -n "runWeb\|runBUI\|runDWC" bbj-vscode/test/*.ts` and reading `bbj-vscode/test/commands-cjs-execution.test.ts` lines 206-323 (`describe('Commands.cjs runBUI / runDWC', ...)`):

- Line 237: `Commands.runDWC({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw-secret-9' });` — asserts `argv.env.BBJ_EM_USERNAME` = `'jdoe'`, `argv.env.BBJ_EM_PASSWORD` = `'pw-secret-9'`.
- Line 253: `Commands.runBUI({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw' });` (config-path sentinel case)
- Line 264: same non-token shape (no resolved config path case)
- Line 292: same non-token shape (callback-error case)
- Line 318: `Commands.runDWC({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw-secret-9' });` (debug-log redaction case)

Every one of these calls `credentials.username !== '__token__'`, which is exactly `runWeb`'s (`Commands.cjs` lines 87-98) `else` branch: `username = credentials.username; password = credentials.password; token = "";`. **Per D-10's own instruction: "If one does, the branch stays and the SUMMARY says why."** The planner must NOT delete this `else` branch. The SUMMARY should note: production code can no longer construct a non-`__token__` credential object after D-09 removes the `bbj.em.credentials` fallback from `getEMCredentials` (the only producer of the `credentials` object `ensureValidToken` returns), but `commands-cjs-execution.test.ts` constructs one directly and asserts on its env-variable routing — deleting the branch would either break 5 passing tests or force rewriting them to assert dead code, neither of which is in scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Owner-only temp file for EM login/validate output | A second ad-hoc `fs.openSync`/`chmodSync` sequence in the new `em-auth.ts` | The existing `createOwnerOnlyFile` from `process-args.ts` (unchanged) | It already exists, is unit-tested indirectly through the exec suites, and encodes a security-relevant symlink-race mitigation (GHSA-33x9-cpwv-xcv2/GHSA-xxp5-vv2w-42q8) that must not be duplicated or subtly diverge. |
| Process launch with env/timeout | A new `execFile` wrapper in `em-auth.ts` | `runProcess` from `process-runner.ts`, wrapped by the new `runScriptToOwnerOnlyFile` (D-05) | `runProcess` already resolves the executable through `confineBbjExecutable` (the `bbj.home` layout check) and is directly unit-tested in `process-runner.test.ts`; a second launcher bypasses that check. |
| Command-registration completeness proof | A hand-maintained list of "commands I moved, so I checked them" in the SUMMARY | The D-16 activation test asserting every `package.json` `contributes.commands` id reaches `registerCommand` | A hand-maintained list silently rots the next time a command is added; the test fails automatically. |

**Key insight:** every piece of infrastructure this phase needs (exec launcher, temp-file creation, argv builders, the free-function validator pattern, the `register*(context, deps)` host pattern) already exists elsewhere in this codebase with its own tests. This phase is 100% "move code, don't write code."

## Runtime State Inventory

This is a code-structure refactor (splitting files), not a rename/rebrand of any identifier, key, or path visible outside the TypeScript/JavaScript source tree. All five categories were checked explicitly:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. `secretStorage` keys (`bbj.em.token`, and the read-only-until-D-9 `bbj.em.credentials`) are string literals that do not change; D-09 removes a *read* of `bbj.em.credentials`, not a rename, and D-12 explicitly leaves any already-stored `bbj.em.credentials` entries untouched. | None. |
| Live service config | None. This repository has no live external service (no n8n/Datadog/Tailscale-style config store) whose configuration references a file path or module name being moved. | None. |
| OS-registered state | None. VS Code command ids (`contributes.commands` in `package.json`) are unchanged strings; which `.ts`/`.js` module calls `vscode.commands.registerCommand(id, ...)` at runtime is invisible to VS Code's command palette, keybindings, or any OS-level registration — confirmed by the D-16 test design itself (it asserts ids reach `registerCommand` regardless of which file the call lives in). | None. |
| Secrets/env vars | None renamed. The three env var names read by the `.bbj` scripts via `ENV()` — `BBJ_EM_USERNAME`, `BBJ_EM_PASSWORD`, `BBJ_EM_TOKEN` (confirmed in `em-secret-env-channel.test.ts:40`'s `BBJ_EM_VOCABULARY` list) — are built by `process-args.ts`'s `buildEmValidateArgv`/`buildEmLoginArgv`, which does not move. Only the TypeScript call sites in `extension.ts` relocate to `em-auth.ts`; the argv/env shape they construct is unchanged. | None. |
| Build artifacts | None requiring action. `bbj-vscode/esbuild.mjs` bundles from two entry points (`src/extension.ts`, `src/language/main.ts`) and follows the `import` graph automatically (confirmed via `Read`) — new sibling modules (`class-types.ts`, `em-auth.ts`, the activate() sub-modules) are picked up with zero build-config changes as long as they're imported from an existing entry point's transitive closure. | None. |

**Nothing found in any category** — this is a low-risk mechanical move with no user-visible or persisted-state surface.

## Common Pitfalls

### Pitfall 1: Deleting `runWeb`'s non-token branch without checking tests first (D-10)
**What goes wrong:** A planner reads issue #564's description ("the leftover non-token credential branch") and deletes it as originally scoped, since production code genuinely can no longer produce a non-`__token__` credential after D-09.
**Why it happens:** The dead-code reasoning is correct for *production* callers, but `test/commands-cjs-execution.test.ts` (lines 233-323) directly constructs `{ username: 'jdoe', password: 'pw...' }` objects and calls `Commands.runBUI`/`runDWC` with them, asserting on the resulting `argv.env.BBJ_EM_USERNAME`/`PASSWORD` routing — a legitimate defence-in-depth test of `runWeb`'s branching, independent of what callers can construct today.
**How to avoid:** This research already ran the D-10 check (see § "D-10: does an existing test drive..." above) — the answer is **yes, keep the branch**, and the plan should say so explicitly rather than re-deriving this at execution time.
**Warning signs:** If the branch is deleted, `commands-cjs-execution.test.ts`'s "runDWC with username/password credentials..." (line 233) and 4 sibling tests fail immediately — an easy regression to catch, but wasted execution-time debugging that this research avoids.

### Pitfall 2: Missing the sixth source guard (`config-reload-host.test.ts`)
**What goes wrong:** The planner widens exactly the five guards CONTEXT names (`em-secret-env-channel`, `target-resolution`, `setopts-in-code-ui`, `no-shell-command-construction`, `decompile-io`) and stops there, since D-15 says "and any the planner finds" but the planner doesn't find the sixth.
**Why it happens:** `test/config-reload-host.test.ts` (lines 512-611) is not obviously a "source guard" from its file name or its dominant content (it's mostly a config-reload *behaviour* test using a fake target) — the guard block is a small `describe('source guard: the choke point is the only restart path', ...)` at the very end of the file.
**How to avoid:** If the config-reload status bar block (lines 960-976 of `extension.ts`, one of D-13's status-bar candidates) is extracted into its own module, the plan must add that new module's path to `config-reload-host.test.ts`'s `readGuardedSource('extension.ts')` calls at lines 563, 569, 584, 589 — specifically the count-of-exactly-1 assertion on `client.onNotification(CONFIG_RELOAD_METHOD` (line 591) and its body-content check (lines 593-598). The `client.start()`/`client.stop()`/`createRestartGate(` counts (lines 564-565, 585) are unaffected as long as `startLanguageClient`/`deactivate`/the inline `createRestartGate(...)` call stay in `extension.ts` (they are not candidates for extraction per the activate() inventory above).
**Warning signs:** `npx vitest run test/config-reload-host.test.ts` failing on the "extension.ts contains exactly one... createRestartGate(" or "...CONFIG_RELOAD_METHOD..." assertions after the status-bar module is created but before the guard is updated.

### Pitfall 3: Assuming `check-classes.ts` needs a re-export shim
**What goes wrong:** Time is spent adding `export { classFqn, bbjSupertypesReach, bbjTypesAreRelated, KNOWN_BBJ_SCALAR_TYPES } from './class-types.js';` back into `check-classes.ts` "just in case something imports it."
**Why it happens:** Habit from other refactors where external consumers are unknown.
**How to avoid:** This research already enumerated every consumer (only `bbj-validator.ts` for `registerClassChecks`, only `check-variable-scoping.ts` for the four helpers, zero test files). D-04 explicitly forbids the shim. Just update `check-variable-scoping.ts`'s import path to `'./class-types.js'`.
**Warning signs:** None expected — `tsc`/`npm run lint` will simply fail to find the old import path if it's not updated, which is the correct, immediate signal.

## Code Examples

### Group 3 free-function shape (no service dependency), following `check-function-calls.ts`'s precedent
```typescript
// Illustrative shape only — not a literal source quote. Modeled on
// bbj-vscode/src/language/validations/check-function-calls.ts's exported,
// dependency-free functions (e.g. checkFunctionCallArguments, lines 44-84).
export function checkInstantiable(call: ConstructorCall, accept: ValidationAcceptor): void {
    if (isArrayConstruction(call)) {
        return;
    }
    const klass = getClass(call.klass);
    if (isBbjClass(klass) && klass.interface) {
        accept('error', `Interface '${klass.name}' cannot be instantiated.`, {
            node: call,
            property: 'klass'
        });
    }
}
```

### Group 1 free-function shape (takes `javaInterop` as a parameter), following `check-unknown-java-member.ts`'s precedent
```typescript
// Illustrative shape only. Modeled on
// bbj-vscode/src/language/validations/check-unknown-java-member.ts's
// checkUnknownJavaMember(memberCall, accept, typeInferer) (line 183), which
// takes its one needed service as a plain parameter rather than a class field.
export function warnUnresolvableType<N extends AstNode>(
    accept: ValidationAcceptor,
    qclass: QualifiedClass,
    info: DiagnosticInfo<N>,
    javaInterop: JavaInteropService | undefined
): void {
    if (!isTypeResolutionWarningsEnabled()) return;
    if (!javaInterop?.isClasspathAvailable()) return;
    // ... unchanged body from check-classes.ts:205-221
}
```

### D-05 shared exec helper shape (built on `runProcess` + `createOwnerOnlyFile`)
```typescript
// Illustrative shape only. Wraps the identical pattern found at extension.ts
// lines 450-482 (validateTokenServerSide) and 729-767 (bbj.loginEM handler):
// createOwnerOnlyFile -> buildXArgv -> runProcess(argv, {timeout, env}) ->
// read tmpFile -> always unlink.
export async function runScriptToOwnerOnlyFile(
    argv: Argv,
    tmpFilePrefix: string,
    timeoutMs: number
): Promise<string> {
    const tmpFile = createOwnerOnlyFile(path.join(os.tmpdir(), `${tmpFilePrefix}-${Date.now()}.tmp`));
    try {
        await runProcess(argv, { timeout: timeoutMs, env: { ...process.env, ...argv.env } });
        return fs.readFileSync(tmpFile, 'utf-8').trim();
    } finally {
        try { fs.unlinkSync(tmpFile); } catch { /* best-effort cleanup */ }
    }
}
```
Per D-07, error handling (the `ERROR:` prefix check, the token-expiry check, the `stderr || message` rethrow, EM validate's catch-all `false`) stays in the two callers, wrapping this helper — not inside it.

## State of the Art

Not applicable in the usual "library/ecosystem changed" sense — this phase touches no external library version. The one internal "state of the art" fact worth recording: this codebase already has **two** precedents for the free-function validator-module pattern this phase extends to a third (`check-function-calls.ts`, `check-unknown-java-member.ts`), and **one** precedent for the `register*(context, deps)` host-module pattern this phase extends to several more (`registerSetOptsInCodeComposer`). Both precedents are current (2026, same milestone family) — no "deprecated approach" exists to avoid here; the phase is applying an already-current convention consistently.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `classFqn`/`bbjSupertypesReach` have zero external consumers beyond `bbjTypesAreRelated`'s own internal use and group 2's `checkReturnTypeAssignable`/`isAssignable` — verified by `grep` this session, not by a project-wide static-analysis tool (e.g. ts-prune). | Every importer of check-classes.ts exports | Low — the same `grep -rn` scope (`bbj-vscode/src` + `bbj-vscode/test`) was used for every other consumer claim in this document and matches the CONTEXT.md canonical-refs list; a missed dynamic `require`/reflection-based consumer is very unlikely in this ESM/TS codebase. |
| A2 | The `config-reload-host.test.ts` guard (Pitfall 2) will actually be triggered — i.e., that the planner chooses to extract the config-reload status-bar block into its own module. This is Claude's Discretion (D-13), not locked. | Common Pitfalls, Pitfall 2 | Low — if the planner instead keeps the config-reload status-bar code inline in `extension.ts` (a valid D-13 choice), this guard needs no change at all; the research still correctly identifies the guard as *at risk* under one of the two valid designs. |

**If this table is empty:** N/A — two low-risk items are listed above; neither blocks planning, both are already resolved by grep scoping consistent with the rest of this document.

## Open Questions

1. **Exact file names for the four validation modules and the two activate() sub-modules**
   - What we know: D-01/D-13 leave naming to Claude's Discretion; this research suggests `check-class-reference.ts`, `check-return-types.ts`, `check-constructor.ts`, `check-cyclic-inheritance.ts` (matching the `check-*.ts` convention already used by every sibling validator module) and `class-types.ts` for the shared helper, and something like `em-auth.ts`, `activate-status-bars.ts`, `activate-open-prompts.ts` for the host side.
   - What's unclear: Whether the planner prefers fewer, larger files (e.g. merging the two activate() prompt-related blocks with the three status bars into one `activate-ui.ts`) — D-13 explicitly allows "one or two modules for the large pieces."
   - Recommendation: Let the planner decide at plan-writing time; this is genuinely stylistic and does not affect behaviour, test outcomes, or the source-guard widening work.

2. **Whether the resolved-config-path notification handler (extension.ts lines 978-1023) moves with the status-bar module or stays inline**
   - What we know: It's adjacent to, but logically distinct from, the three status-bar blocks (suppression/BBjCPL/config-reload) — it's about the `bbx-config` language association, not a status bar.
   - What's unclear: D-13's wording ("status bars... and the tokenized and line-numbered open prompts") doesn't explicitly mention this block, so it's ambiguous whether it's a third "large piece" candidate or should stay inline as one of the "small register* functions."
   - Recommendation: Given it's ~45 lines with its own helper functions already living outside `activate()` (lines 621-661), treat it as a third optional module or leave inline — either is behaviour-neutral. No source guard depends on this block specifically (confirmed: no test string-matches `RESOLVED_CONFIG_PATH_METHOD` inside a `readGuardedSource`-style extension.ts scan), so this choice carries zero D-15 risk either way.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, test, lint | ✓ | (repo-pinned; Node 22 required for `langium:generate`, not needed this phase — no grammar change) | — |
| npm | `npm run lint`/`npm test` | ✓ | — | — |
| vitest | `npx vitest run <file>` | ✓ | 4.1.10 (confirmed via test run output this session) | — |
| tsc | `npm run typecheck:test` | ✓ | — | — |
| eslint | `npm run lint` | ✓ | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — this phase needs no BBj runtime, no java-interop socket (`:5008`), and no VS Code extension host; every test involved (validation suites via `EmptyFileSystem`/`createBBjServices`, activation suite via mocked `vscode`, exec suites via `commands-cjs-harness.ts`'s `node:module` loader) already runs fully offline, confirmed by this session's test run (see Validation Architecture below).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 |
| Config file | `bbj-vscode/vitest.config.ts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file1> <file2> ...` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (equivalently `npx vitest run`); add `RUN_BBJ_TESTS=1` (`npm run test:bbj`) only if a live BBjServices probe on `:5008` is available — not needed for this phase |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REF-10 | ClassValidator split produces identical class-reference/visibility diagnostics | unit/integration (Langium validation pipeline) | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/class-validations-issues.test.ts` | ✅ |
| REF-10 | ClassValidator split produces identical cyclic-inheritance diagnostics | unit/integration | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/inheritance-cycle-validation.test.ts` | ✅ |
| REF-10 | No other validation suite regresses (return-type, field-init, constructor checks are exercised across many files, not one dedicated suite) | unit/integration, whole-suite | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (compare failed-name set against phase base) | ✅ (whole-suite) |
| REF-11 | `activate()` registers every contributed command after the split (D-16) | unit (mocked vscode) | new test, e.g. `test/activation-command-coverage.test.ts`, following `extension-activation.test.ts`'s harness | ❌ — Wave 0 gap, planner writes it |
| REF-11 | EM login/validate exec behaviour unchanged (timeouts, temp files, env, error messages) | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/em-token-expiry-wiring.test.ts test/em-login-username.test.ts` | ✅ |
| REF-11 | Shared exec helper (D-05) has its own unit tests | unit | new test, e.g. `test/process-runner-owner-only.test.ts` or added to `test/process-runner.test.ts` | ❌ — Wave 0 gap, planner writes it |
| REF-11 | `runWeb`/Commands.cjs execution paths (token and non-token credential routing) unchanged | unit (real Commands.cjs via `node:module` hooks) | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/commands-cjs-execution.test.ts` | ✅ |
| REF-11 | Source guards widened, not weakened (D-15) | unit (string/AST scan) | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/em-secret-env-channel.test.ts test/target-resolution.test.ts test/setopts-in-code-ui.test.ts test/no-shell-command-construction.test.ts test/config-reload-host.test.ts test/decompile-io.test.ts` | ✅ (all 6 exist; see Pitfall 2 for the 6th) |

### Sampling Rate
- **Per task commit:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <the specific files touched by that task>`
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (whole suite; compare failed-test-name set against the phase base commit, per the v4.7 standing decision — a failing-suite identity delta is not the gate, `numFailedTests: 0` plus a deterministic targeted-file diff is)
- **Phase gate:** Full suite green (or only pre-existing/known-flaky failures, cross-checked against a scratch worktree at the base SHA per the Phase 119 pattern below) before `/gsd-verify-work`

### Base-evidence pattern to reuse (from Phase 119)
Phase 119's plans (`119-01-PLAN.md` lines 100, 171-172, 216, 231) established this project's standard base-evidence idiom, directly reusable here:
1. At the first task's start, `mkdir -p /home/coder/repos/tmp/phase-120` and write `git -C /home/coder/repos/bbj-language-server rev-parse HEAD` to `base-sha.txt`. **This session's HEAD is `fd3d75ef3cb32f7f901eedc8a5b2c9aa17b38d5b`** on branch `gsd/v4.7-audit-hygiene-burndown`, clean tree.
2. Run the whole-suite once on the untouched base tree (or reuse a same-session pre-change run), capturing the failed-test-name list.
3. After each wave, run the whole suite again and `comm -13` the two sorted failed-name lists — any new name is a regression until proven otherwise by reproducing it on a scratch worktree at `base-sha.txt` (`git worktree add`, symlink `node_modules` in, regenerate langium with Node 22 if grammar-adjacent — not needed here since this phase touches no grammar — then run the specific failing file with `--maxWorkers=1`).
4. This session's own targeted run of all 15 test files this research names as load-bearing (`class-validations-issues`, `inheritance-cycle-validation`, `extension-activation`, `em-token-expiry-wiring`, `em-login-username`, `commands-cjs-execution`, `process-runner`, `decompile-io`, `no-shell-command-construction`, `target-resolution`, `em-secret-env-channel`, `setopts-in-code-ui`, `composer-cue-single-source`, `config-reload-host`, `em-properties-reader-guard`) is **clean at HEAD**: `Test Files 15 passed (15)`, `Tests 262 passed | 1 skipped (263)`. This is the pre-change baseline every later comparison in this phase should diff against.

### Wave 0 Gaps
- [ ] D-05's shared exec helper (`runScriptToOwnerOnlyFile` or similar) needs its own unit test file/block — output-returned, temp-file-removed-on-success, temp-file-removed-on-failure, env-spread, timeout-passed-through, rejection-propagated (6 cases named in D-05 itself).
- [ ] D-16's command-registration proof test needs writing — no existing test asserts "every `contributes.commands` id reaches `registerCommand`" today; `extension-activation.test.ts` only tests the `client.start()` rejection path.

*(No other gaps — every other requirement's test infrastructure already exists and passes.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Indirectly (EM login/token flow moves, doesn't change) | `isEmTokenExpired` (existing, unchanged), SecretStorage for `bbj.em.token` (existing, unchanged) |
| V3 Session Management | No | N/A — no session concept in this phase |
| V4 Access Control | Yes, but pre-existing and unchanged | The class visibility check (`checkBBjClass`, group 1) enforces PUBLIC/PROTECTED/PRIVATE — moves file, logic untouched |
| V5 Input Validation | No new surface | This phase adds no new external input path |
| V6 Cryptography | No | No cryptographic primitive is touched; JWT decode (`isEmTokenExpired`) is untouched, unmoved (lives in `em-token-validity.ts`, not part of this phase's file set) |
| V7 Error Handling and Logging | Yes — directly relevant (D-07) | `formatArgvForLog`'s secret-redaction contract must survive the move unchanged; already guarded by `em-secret-env-channel.test.ts` (widened per D-15) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret (token/password) leaking into a debug log line | Information Disclosure | `formatArgvForLog(argv, [secrets])` redaction — unchanged by this phase, guarded by `em-secret-env-channel.test.ts` (must be re-pointed at `em-auth.ts` per D-15, since the `appendLine` call sites move there) |
| Symlink/TOCTOU race on a predictable temp-file path | Tampering | `createOwnerOnlyFile`'s `O_CREAT|O_EXCL` exclusive-create — unchanged, unmoved (lives in `process-args.ts`) |
| Command-injection via shell-string process launch | Tampering (CWE-78, GHSA-p5f3-9456-9pcx) | `runProcess`/`runProcessCallback`'s `execFile`-only launch (never a shell) — unchanged; `no-shell-command-construction.test.ts`'s zero-shell-exec guard should be widened to also scan any new `em-auth.ts`/activate-submodule files, even though the invariant (currently checked only against `extension.ts`/`Commands.cjs`) would not itself break if left unwidened — it's a coverage gap, not a broken assertion, worth a one-line note in the SUMMARY either way |

## Sources

### Primary (HIGH confidence — read this session)
- `bbj-vscode/src/language/validations/check-classes.ts` (full file, 579 lines) — the ClassValidator inventory
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` (full file) — confirms the only external consumer of `bbjTypesAreRelated`/`KNOWN_BBJ_SCALAR_TYPES`
- `bbj-vscode/src/language/validations/check-function-calls.ts`, `check-unknown-java-member.ts` (full files) — the free-function pattern precedents
- `bbj-vscode/src/language/bbj-validator.ts` (full file) — confirms `registerClassChecks`'s single call site and registration order
- `bbj-vscode/src/extension.ts` (full file, 1132 lines) — the activate() inventory
- `bbj-vscode/src/Commands/Commands.cjs` (lines 1-250) — `runWeb`, `execWithProgress`
- `bbj-vscode/src/Commands/process-runner.ts` (full file) — `runProcess`/`runProcessCallback`/`formatArgvForLog`
- `bbj-vscode/src/Commands/process-args.ts` (lines 60-155) — `createOwnerOnlyFile`, `buildRunArgv`, `buildWebRunArgv` signatures
- `bbj-vscode/test/commands-cjs-execution.test.ts` (full runBUI/runDWC describe block) — the D-10 branch-survival evidence
- `bbj-vscode/test/em-secret-env-channel.test.ts` (lines 1-80, 320-480) — the widest-blast-radius source guard
- `bbj-vscode/test/config-reload-host.test.ts` (lines 500-611) — the 6th (previously unnamed) source guard
- `bbj-vscode/test/target-resolution.test.ts` (lines 120-220), `test/setopts-in-code-ui.test.ts` (lines 550-600), `test/no-shell-command-construction.test.ts` (full file), `test/decompile-io.test.ts` (lines 1-30, 320-345), `test/em-properties-reader-guard.test.ts` (full file), `test/composer-cue-single-source.test.ts` (full file)
- `bbj-vscode/test/extension-activation.test.ts` (lines 1-190) — the D-16 harness base, and the `contributes.commands` mock-module list cross-referenced against `package.json`
- `bbj-vscode/test/em-token-expiry-wiring.test.ts` (lines 1-60, 129) — confirms `getEMCredentials` is imported directly from `extension.js` in a test
- `bbj-vscode/package.json` (lines 78-211) — the full `contributes.commands` list (21 entries)
- `bbj-vscode/src/msgbox-composer-ui.ts`, `addwindow-composer-ui.ts`, `addchildwindow-composer-ui.ts`, `setopts-composer-ui.ts`, `setopts-in-code-ui.ts`, `cvs-composer-ui.ts`, `composer-lens-command.ts`, `composer-lens-contract.ts` — grepped for `registerCommand(` to build the D-16 allow-list (7 composer commands + `bbj.openComposerAt`, which is not in `contributes.commands`)
- `bbj-vscode/esbuild.mjs` (full file) — confirms entry-point + import-graph bundling, no explicit file lists to update
- `bbj-vscode/test/process-runner.test.ts` (lines 1-60) — existing test pattern for the new D-05 helper tests
- `bbj-vscode/test/inheritance-cycle-validation.test.ts` (lines 1-30) — confirms `createBBjServices`/`validationHelper` pipeline testing, no direct import
- `.planning/phases/119-grammar-declare-file-paths-shared-channel-opening/119-01-PLAN.md` (grepped lines) — the base-evidence pattern to reuse
- `.planning/phases/120-classvalidator-activate-splits/120-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — required reading, fully read
- Live test run this session: `cd bbj-vscode && npx vitest run <15 files>` → `Test Files 15 passed (15)`, `Tests 262 passed | 1 skipped (263)` at HEAD `fd3d75ef3cb32f7f901eedc8a5b2c9aa17b38d5b`

### Secondary (MEDIUM confidence)
- None — every claim in this document was verified by direct file read, grep, or test execution this session; no web search or Context7 lookup was needed (no external library is involved).

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external stack; every asset cited was read directly this session.
- Architecture: HIGH — the four-group inventory and the activate() inventory were built by reading the complete source of both target files line-by-line, not sampled.
- Pitfalls: HIGH — both named pitfalls (D-10 branch survival, the 6th source guard) were discovered by actually running the relevant greps/reads, not inferred.
- Package legitimacy: N/A — no packages installed.
- Validation architecture: HIGH — the full 15-file targeted suite was actually executed this session (262 passed, 1 skipped, 0 failed) against the exact HEAD the phase will branch from.

**Research date:** 2026-09-29
**Valid until:** Effectively indefinite for the architectural facts (they're static code-structure claims about the current tree); re-verify the "clean baseline" test-run claim and the base SHA if more than a few days pass before planning starts, since `main`/this branch may move.
