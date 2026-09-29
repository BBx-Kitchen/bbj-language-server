# Phase 120: ClassValidator & activate() Splits - Pattern Map

**Mapped:** 2026-09-29
**Files analyzed:** 12 (4 validator modules + 1 shared helper + em-auth + 1-2 activate sub-modules + 1 exec helper + tests for D-05/D-16 + 6 widened source guards)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/language/validations/check-class-reference.ts` (group 1) | validation module | transform (AST -> diagnostics) | `src/language/validations/check-unknown-java-member.ts` | exact (free function takes one service param, `javaInterop`) |
| `src/language/validations/check-return-types.ts` (group 2) | validation module | transform | `src/language/validations/check-unknown-java-member.ts` | exact (free function takes `TypeInferer`) |
| `src/language/validations/check-constructor.ts` (group 3) | validation module | transform | `src/language/validations/check-function-calls.ts` | exact (free function, no service deps) |
| `src/language/validations/check-cyclic-inheritance.ts` (group 4) | validation module | transform | `src/language/validations/check-function-calls.ts` | exact (free function, no service deps, self-contained) |
| `src/language/validations/check-classes.ts` (post-split, `registerClassChecks` only) | validation registry/entry point | transform | `src/language/validations/check-function-calls.ts`'s `registerFunctionCallChecks` | exact (module keeps one `registerXChecks(registry, ...)` building a `ValidationChecks<BBjAstType>` map) |
| `src/language/validations/class-types.ts` (shared helper) | utility | transform | (extraction from `check-classes.ts` itself, no separate analog needed) | role-match (module-level pure-function helper file, mirrors `check-classes.ts` lines 89-163 as they stand today) |
| `src/em-auth.ts` | service / host-registration module | request-response + file-I/O (temp file) + event-driven (vscode command) | `src/setopts-in-code-ui.ts` | exact (`register*(context, deps)` entry point + command handler + helper functions in one file) |
| `src/Commands/process-runner.ts` (add `runScriptToOwnerOnlyFile`) | utility / service | file-I/O + process-exec | `src/Commands/process-runner.ts`'s own `runProcess` | exact (same file, same layering convention) |
| `test/process-runner.test.ts` (add D-05 cases) or new `test/process-runner-owner-only.test.ts` | test | unit | `test/process-runner.test.ts` (existing) | exact |
| `src/activate-status-bars.ts` (or similar, D-13) | host-registration module | event-driven (status bar + client notifications) | `src/setopts-in-code-ui.ts` | role-match (`register*(context, deps)` shape; this one takes a `getClient()`/output-channel accessor instead of `send`) |
| `src/activate-open-prompts.ts` (or similar, D-13) | host-registration module | event-driven (tab/editor listeners) | `src/setopts-in-code-ui.ts` | role-match (same `register*(context, deps)` shape) |
| new test `test/activation-command-coverage.test.ts` (D-16) | test | unit (mocked vscode) | `test/extension-activation.test.ts` | exact (same mocked-`vscode` harness, same `registeredCommandIds` idiom) |

## Pattern Assignments

### `src/language/validations/check-class-reference.ts` (group 1: `checkClassReference`, `warnUnresolvableType`, `checkBBjClass`, `isSubFolderOf`)

**Analog:** `src/language/validations/check-unknown-java-member.ts`

**Imports pattern** (lines 1-22):
```typescript
import { AstUtils, isAstNode, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import type { BBjServices } from '../bbj-module.js';
import { TypeInferer } from '../bbj-type-inferer.js';
import {
    Assignment, BBjAstType, Expression, JavaClass, MemberCall, NamedElement,
    isArrayDecl, isAssignment, isCastExpression, isConstructorCall, isJavaClass,
    isMethodCall, isStringLiteral, isSymbolRef, isVariableDecl
} from '../generated/ast.js';
```
Group 1 needs `JavaInteropService` instead of `TypeInferer` — import it the same way `BBjServices`/`TypeInferer` are imported here (`import type { JavaInteropService } from '../java-interop.js';` or wherever it's declared — confirm exact path when extracting).

**Core pattern — free function taking its one service dependency as a parameter** (lines 183-269, `checkUnknownJavaMember`):
```typescript
export function checkUnknownJavaMember(memberCall: MemberCall, accept: ValidationAcceptor, typeInferer: TypeInferer): void {
    // ...guards that return silently on ambiguous input...
    accept('error', `...`, { node: memberCall, property: 'member', data: { code: UNKNOWN_JAVA_MEMBER_CODE } });
}
```
This is exactly D-02's required shape for group 1's `warnUnresolvableType`/`checkClassReference`/`checkBBjClass`: `(node, accept, javaInterop: JavaInteropService | undefined)`. RESEARCH.md's own illustrative snippet (Code Examples § "Group 1 free-function shape") models `warnUnresolvableType` directly on this file's `checkUnknownJavaMember` — copy that shape, not a fresh design.

**Registration pattern this module does NOT own** (D-03: only `check-classes.ts` keeps `registerClassChecks`):
```typescript
export function registerUnknownJavaMemberChecks(registry: ValidationRegistry, services: BBjServices): void {
    const typeInferer = services.types.Inferer;
    const checks: ValidationChecks<BBjAstType> = {
        MemberCall: (memberCall, accept) => checkUnknownJavaMember(memberCall, accept, typeInferer)
    };
    registry.register(checks);
}
```
Do NOT copy this registration wrapper into the four new group modules — D-03 keeps the single `ValidationChecks` map inside `check-classes.ts`'s `registerClassChecks`, which will call these groups' exported functions directly from its per-node-type handlers (see check-classes.ts's own handler-order table in RESEARCH.md, preserved verbatim).

**Error handling / silent-skip idiom** (lines 184-221, guard clauses): every guard `return`s silently on an ambiguous/unresolved shape — never throws, never reports a false positive. Preserve this exactly; it is the established idiom for every validation module in this codebase, not just this one.

---

### `src/language/validations/check-return-types.ts` (group 2: `checkMethodReturn`, `checkReturnTypeAssignable`, `isAssignable`, `classDisplayName`, `checkFieldInit`, `literalTypeMismatch`, `simpleTypeName`, the `*_RETURN_TYPES` sets, `FINAL_TYPE_ASSIGNABLE_TO`)

**Analog:** `src/language/validations/check-unknown-java-member.ts` (for the "takes a service parameter" shape) — this group takes `TypeInferer` (not `JavaInteropService`), matching `checkUnknownJavaMember`'s own dependency exactly.

**Core pattern:** same `(node, accept, inferer: TypeInferer)` free-function signature as `checkUnknownJavaMember(memberCall, accept, typeInferer)` above. Module-level constants (`STRING_RETURN_TYPES`, `NUMERIC_RETURN_TYPES`, `BBJ_SCALAR_RETURN_TYPES`, `FINAL_TYPE_ASSIGNABLE_TO`) become top-level `const`s in this file, mirroring how `check-unknown-java-member.ts` keeps `UNKNOWN_JAVA_MEMBER_CODE` as a top-level exported `const` (line 25).

**Imports needed from the new shared helper module:** `classFqn`, `bbjSupertypesReach` (used inside `checkReturnTypeAssignable`/`isAssignable` per RESEARCH.md lines 400-401/413) — import from `./class-types.js`, following the same relative-import convention `check-variable-scoping.ts` will use (see Shared Patterns below).

---

### `src/language/validations/check-constructor.ts` (group 3: `checkInstantiable`, `checkConstructorArguments`, `isArrayConstruction`) and `check-cyclic-inheritance.ts` (group 4: `checkCyclicInheritance`)

**Analog:** `src/language/validations/check-function-calls.ts`

**Imports pattern** (lines 1-16):
```typescript
import { AstNode, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import {
    Assignment, BBjAstType, Expression, LibFunction, MethodCall, ParameterCall,
    isBinaryExpression, isLibFunction, isMethodCall, isNumberLiteral,
    isPrefixExpression, isStringLiteral, isSymbolRef,
} from '../generated/ast.js';
```
Groups 3/4 need neither `TypeInferer` nor `JavaInteropService` (per RESEARCH.md's dependency table), so their imports are just `langium` + `generated/ast.js` types — exactly this file's shape, no service import at all.

**Core pattern — dependency-free exported function** (lines 44-84, `checkFunctionCallArguments`):
```typescript
export function checkFunctionCallArguments(call: MethodCall, accept: ValidationAcceptor): void {
    const fn = resolveLibFunction(call);
    if (!fn) { return; }
    // ...arity/type checks, each ending in accept('warning', `...`, { node: ... })...
}
```
This is the literal shape for `checkInstantiable`/`checkConstructorArguments`/`checkCyclicInheritance`: `(node, accept)`, no third parameter. RESEARCH.md's own "Group 3 free-function shape" code example is modeled directly on this function (see RESEARCH.md's Code Examples section) — copy that shape.

**Doc-comment convention worth preserving** (lines 112-118, `resolveLibFunction`): a one-paragraph JSDoc stating this is "the one shared resolver ... a second copy must not be written," naming the guard test that enforces it. Apply the same style to any helper in the new modules that other code must not duplicate (e.g. if `isArrayConstruction` gains a second would-be consumer later).

---

### `src/language/validations/check-classes.ts` (post-split: `registerClassChecks` only)

**Analog:** `check-function-calls.ts`'s `registerFunctionCallChecks` (lines 29-35):
```typescript
export function registerFunctionCallChecks(registry: ValidationRegistry): void {
    const checks: ValidationChecks<BBjAstType> = {
        MethodCall: checkFunctionCallArguments,
        Assignment: checkFunctionReturnAssignment,
    };
    registry.register(checks);
}
```
`registerClassChecks` keeps this one-map, one-`registry.register()` shape (D-03), but its per-node-type handler bodies become small inline arrow functions or wrappers that call across into the four new modules' exported functions, in the exact order captured in RESEARCH.md's "Per-node-type handler order" table (`Use`, `BbjClass`, `ConstructorCall`, `MethodDecl`, `FieldDecl`, `ParameterDecl`, `VariableDecl`). Do not reintroduce a `ClassValidator` class or a `thisArg` — none of the extracted free functions need one (per D-02/D-03).

---

### `src/language/validations/class-types.ts` (D-04 shared helper: `classFqn`, `bbjSupertypesReach`, `bbjTypesAreRelated`, `KNOWN_BBJ_SCALAR_TYPES`)

**Analog:** No separate file-level analog needed — this is a straight relocation of `check-classes.ts`'s own current lines 89-163 (module-level, outside the class) into a new file, unchanged. Its "role" precedent for file shape (pure exported functions + one exported `const Set`) is the same free-function convention as `check-function-calls.ts`'s bottom-of-file helpers (`numericOrString`, `inferredKind` — though those stay private/unexported there; here `classFqn`/`bbjSupertypesReach`/`bbjTypesAreRelated`/`KNOWN_BBJ_SCALAR_TYPES` must all be exported, since `check-variable-scoping.ts` and group 2 both consume them).

**Consumer update required** — `check-variable-scoping.ts:26` currently:
```typescript
import { bbjTypesAreRelated, KNOWN_BBJ_SCALAR_TYPES } from './check-classes.js';
```
becomes:
```typescript
import { bbjTypesAreRelated, KNOWN_BBJ_SCALAR_TYPES } from './class-types.js';
```
No re-export shim in `check-classes.ts` (D-04, confirmed safe by RESEARCH.md's consumer grep — zero test files import any `check-classes.ts` export).

---

### `src/em-auth.ts` (D-08: `bbj.loginEM` handler, `validateTokenServerSide`, `ensureValidToken`, `getEMCredentials`)

**Analog:** `src/setopts-in-code-ui.ts`

**Imports pattern** (lines 21-29):
```typescript
import * as vscode from 'vscode';
import { openSetOptsComposerPanel, SetOptsPanelArg } from './setopts-composer-webview.js';
import {
    openSetOptsTriStateComposerPanel, SetOptsInCodeRequestSender, SetOptsTriStatePanelArg, SetOptsTriStateTarget,
} from './setopts-tristate-webview.js';
import {
    SETOPTS_DECODE_IN_CODE_METHOD, SetOptsInCodeDecodeParams, SetOptsInCodeDecodeResult,
} from './language/setopts-in-code-request.js';
import type { SetOptsStaleEditGuard } from './setopts-stale-edit-guard.js';
```
`em-auth.ts` will import `vscode`, `createOwnerOnlyFile`/`buildEmLoginArgv`/`buildEmValidateArgv` from `process-args.js`, `runProcess`/`formatArgvForLog` (and the new `runScriptToOwnerOnlyFile`) from `process-runner.js`, `isEmTokenExpired`/`rememberEmUsername`/`initialEmUsername` from wherever they currently live in `extension.ts`.

**Registration entry point pattern** (lines 72-82, `registerSetOptsInCodeComposer`):
```typescript
export function registerSetOptsInCodeComposer(context: vscode.ExtensionContext, send: SetOptsInCodeRequestSender): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeSetoptsInCode', (arg?: SetOptsInCodeCommandArg) =>
            handleComposeSetoptsInCode(context, send, arg)),
        vscode.languages.registerCodeActionsProvider(
            BBJ, new SetOptsInCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}
```
This is the literal precedent for D-14's `register*(context, deps)` contract — the new `registerEmAuthCommands(context, deps)` (where `deps` includes `secretStorage`, `outputChannel`/debug-log accessor, `getClient()` if needed) follows this exact shape: one function, `context.subscriptions.push(...)` of one or more `vscode.commands.registerCommand(...)` calls, command handler bodies delegate to a separate named async function (compare `handleComposeSetoptsInCode`, lines 115-188, to the future `handleLoginEM`).

**Command handler error-boundary pattern** (lines 131-136):
```typescript
try {
    result = await send(SETOPTS_DECODE_IN_CODE_METHOD, params) as SetOptsInCodeDecodeResult;
} catch (error) {
    vscode.window.showInformationMessage(`SETOPTS composer failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
}
```
Mirrors the outer `try`/`catch` around the whole `bbj.loginEM` handler in `extension.ts` today (`vscode.window.showErrorMessage('EM login failed: ${error}')` on any thrown error, per RESEARCH.md's inventory) — keep that exact catch-all shape when the handler moves, per D-07 ("every user-visible message stays byte-identical").

---

### `src/Commands/process-runner.ts` (add `runScriptToOwnerOnlyFile`, D-05)

**Analog:** the file's own `runProcess` (lines 50-66):
```typescript
export function runProcess(argv: Argv, options: ExecFileOptions = {}): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const resolved = resolveExecutable(argv);
        if (resolved.error) { reject(resolved.error); return; }
        execFile(resolved.file, argv.args, options, (err, stdout, stderr) => {
            if (err) { (err as ProcessError).stderr = stderr?.toString(); reject(err); }
            else { resolve({ stdout: stdout?.toString() ?? '', stderr: stderr?.toString() ?? '' }); }
        });
    });
}
```
`runScriptToOwnerOnlyFile` layers directly on top of this (per D-05/RESEARCH's own illustrative code in RESEARCH.md's "D-05 shared exec helper shape" — copy that literally):
```typescript
export async function runScriptToOwnerOnlyFile(
    argv: Argv, tmpFilePrefix: string, timeoutMs: number
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
**File header/doc-comment convention** (lines 6-13 of `process-runner.ts`) — a module-top JSDoc naming the security rationale (GHSA id, CWE) and the invariant every caller must uphold. Add an equivalent one-paragraph note to the new function: "every EM script invocation writes its result to an owner-only temp file (`createOwnerOnlyFile`, symlink-race-safe) and always unlinks it, success or failure."

---

### D-05 helper's own unit tests

**Analog:** `test/process-runner.test.ts` (lines 1-71)

**Mocking pattern** (lines 13-19):
```typescript
const execFileMock = vi.fn();
const execMock = vi.fn();
vi.mock('child_process', () => ({
    execFile: (...args: unknown[]) => execFileMock(...args),
    exec: (...args: unknown[]) => execMock(...args)
}));
import { runProcess, runProcessCallback, formatArgvForLog } from '../src/Commands/process-runner.js';
```
The new helper's tests import `runScriptToOwnerOnlyFile` alongside these, and mock `fs` (`readFileSync`/`unlinkSync`) the same way `child_process` is mocked here, or use a real scratch tmpdir the way `process-args.test.ts`/`createOwnerOnlyFile` tests already do (check that file for the file-creation-side precedent).

**Per-behavior test shape** (lines 36-71, `describe.skipIf(process.platform === 'win32')('runProcess', ...)`): one `test(...)` per behavior, each with an inline `execFileMock.mockImplementation(...)` and a direct `await expect(...)`/`toEqual`/`toMatchObject` assertion — no shared setup beyond `beforeEach`'s `mockReset()`. Follow this exact style for D-05's six named cases (output returned, temp file removed on success, temp file removed on failure, env spread, timeout passed through, rejection propagated).

---

### `src/activate-status-bars.ts` / `src/activate-open-prompts.ts` (D-13, names at Claude's discretion)

**Analog:** `src/setopts-in-code-ui.ts`'s `registerSetOptsInCodeComposer(context, send)` (see em-auth.ts section above for the excerpt) — same `register*(context, deps)` shape, but `deps` here is a `getClient()` accessor / output channel / `configReloadStatusBar` state rather than a `send` function. Per D-14, no new module-level globals: each of these new files declares its own local `const`s inside the `register*` function closure (e.g. `promptedTokenizedFiles`/`promptedLineNumberedDocs` become closures captured by the returned disposables, not top-level `let`s).

---

### New test `test/activation-command-coverage.test.ts` (D-16)

**Analog:** `test/extension-activation.test.ts` (full file read; excerpt lines 16-134)

**Mocked-vscode harness pattern** (lines 16-80): the same `vi.mock('vscode', () => ({...}))` block with `commands.registerCommand: vi.fn((id, handler) => { registeredCommandIds.add(id); ... })`, plus the same composer-module mocks (lines 100-120) and `makeContext()` helper (lines 127-134). Reuse this file's `registeredCommandIds` set directly — after `activate(context)`, assert every `contributes.commands[].command` from `package.json` is present in `registeredCommandIds`, except a named allow-list (composer-registered ids like `bbj.openComposerAt`, each with a one-line reason per D-16).

**package.json cross-reference:** `bbj-vscode/package.json` lines 78-211 list the full 21-entry `contributes.commands` array — read that range when writing the allow-list comparison.

---

## Shared Patterns

### Free-function validator module (D-02, all four groups)
**Source:** `src/language/validations/check-function-calls.ts` (no-service shape) and `src/language/validations/check-unknown-java-member.ts` (one-service shape)
**Apply to:** `check-class-reference.ts`, `check-return-types.ts`, `check-constructor.ts`, `check-cyclic-inheritance.ts`
```typescript
// no-service shape (groups 3, 4)
export function checkX(node: NodeType, accept: ValidationAcceptor): void { /* ... */ }

// one-service shape (groups 1: javaInterop, 2: inferer)
export function checkY(node: NodeType, accept: ValidationAcceptor, service: ServiceType | undefined): void { /* ... */ }
```

### Single registration entry point per feature (D-03)
**Source:** `check-function-calls.ts`'s `registerFunctionCallChecks`, `check-unknown-java-member.ts`'s `registerUnknownJavaMemberChecks`
**Apply to:** `check-classes.ts`'s (post-split) `registerClassChecks` — stays the ONE place a `ValidationChecks<BBjAstType>` map is built and `registry.register(checks)` is called for class-related checks; the four new group modules never register anything themselves.

### Host `register*(context, deps)` entry point (D-14)
**Source:** `src/setopts-in-code-ui.ts`'s `registerSetOptsInCodeComposer(context, send)`
**Apply to:** `em-auth.ts`'s `registerEmAuthCommands`, `activate-status-bars.ts`'s `registerStatusBars`, `activate-open-prompts.ts`'s `registerTokenizedAndLineNumberedPrompts` — each takes `(context: vscode.ExtensionContext, deps: {...})`, pushes disposables onto `context.subscriptions`, delegates command bodies to a separate named handler function, and declares no new module-level `let`/`const` state outside the function closure.

### Owner-only temp file + execFile-only launch (D-05, security-relevant, do not reimplement)
**Source:** `src/Commands/process-runner.ts`'s `runProcess` + `src/Commands/process-args.ts`'s `createOwnerOnlyFile` (not read this session in full, but its signature/behavior is documented in RESEARCH.md lines 264, citing `process-args.ts:78-85`: `O_CREAT|O_EXCL|O_WRONLY` mode `0o600`, then `chmodSync` on non-Windows)
**Apply to:** the new `runScriptToOwnerOnlyFile` helper in `process-runner.ts`, consumed by both `validateTokenServerSide` and the `bbj.loginEM` handler once they move to `em-auth.ts`.

### Error handling stays with the caller, not the shared helper (D-07)
**Source:** the current (pre-split) `bbj.loginEM` handler's nested `try`/`catch`/`finally` in `extension.ts` (documented verbatim in RESEARCH.md's "bbj.loginEM handler" inventory) vs. `validateTokenServerSide`'s catch-all `false`
**Apply to:** `em-auth.ts` — the shared `runScriptToOwnerOnlyFile` only returns trimmed output or rethrows `ProcessError` unchanged; the `ERROR:` prefix check, `isEmTokenExpired` check, `stderr || message` rethrow (EM login) and the catch-all `false` (EM validate) stay in the two respective callers, wrapping the helper call.

### Source guard file-list widening (D-15) — how each guard names its scanned files
**Source (five guards CONTEXT names, plus the sixth RESEARCH found):**
- `test/em-secret-env-channel.test.ts` lines 332-333, 380-381: `const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts'); const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');` — plus a dedicated test at line 475, `'both output-file paths in extension.ts are created through createOwnerOnlyFile before their launcher call'`, which scans `extension.ts` specifically for the EM login/validate temp-file call sites. **This is the guard most directly impacted by the `em-auth.ts` move** — its file-path constant (or a second one for `em-auth.ts`) must be updated/added.
- `test/target-resolution.test.ts` lines 24-32: same `COMMANDS_CJS`/`EXTENSION_TS` `path.join(REPO_ROOT, ...)` constants, read via `fs.readFileSync(...)`, with two separate `describe(... 'source guard')` blocks (lines 131, 206) each asserting on one file's content.
- `test/setopts-in-code-ui.test.ts` line 558: `const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts');`, used at line 571 to assert `registerSetOptsInCodeComposer` is imported+called in `extension.ts` — unaffected by this phase (composer registrations stay inline per D-13), included here only because CONTEXT names it; verify no change is actually needed.
- `test/no-shell-command-construction.test.ts` lines 16-17: same two-constant pattern (`COMMANDS_CJS`, `EXTENSION_TS`), asserting "zero shell-string process launches" and "does not import child_process directly" against each file's full stripped-of-comments text (line 25, `stripLineComments`). **Must be widened to also scan `em-auth.ts`** and any new activate() sub-module per RESEARCH.md's Security Domain table.
- `test/decompile-io.test.ts` line 10: `const COMMANDS_CJS = path.join(__dirname, '..', 'src', 'Commands', 'Commands.cjs');`, line 337 pins the literal text `execWithProgress(argv)` — **do not touch this assertion** (D-06); only `Commands.cjs`'s doc comment above `execWithProgress` changes.
- **Sixth guard (RESEARCH-found):** `test/config-reload-host.test.ts` lines 536-537 (`readGuardedSource(fileName)` helper: `fs.readFileSync(path.join(__dirname, '..', 'src', fileName), 'utf-8')`), used at lines 563, 569, 584, 589 as `readGuardedSource('extension.ts')` for four assertions (`client.start()`/`client.stop(` exactly-once counts, `createRestartGate(` exactly-once count, `CONFIG_RELOAD_METHOD` exactly-once + body-content check). **If the config-reload status-bar block is extracted into its own module, `readGuardedSource('extension.ts')` at line 589 (and only that call) must become `readGuardedSource('activate-status-bars.ts')` (or wherever `client.onNotification(CONFIG_RELOAD_METHOD, ...)` lands) — the other three calls (563, 569, 584) stay pointed at `extension.ts`, since `client.start()`/`client.stop()`/the inline `createRestartGate(...)` call are not being extracted.**

**Apply to:** every file-path constant above whose target file's relevant code actually moves. Pattern to follow everywhere: add a second `path.join(...)` constant for the new file, and either (a) OR the two files' text together before the `expect(...)` count check, or (b) point the specific `describe`/`test` block that covers the moved code at the new file's constant, per D-15's "no `expect()` changes and no loosened patterns" rule. Never widen a guard's target list without checking whether the specific code it counts actually moved to that file — see config-reload-host.test.ts's four independent assertions above, only one of which is conditionally affected.

## No Analog Found

None — every file this phase creates or modifies has a strong (exact or role-match) analog already read and excerpted above.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/validations/`, `bbj-vscode/src/`, `bbj-vscode/src/Commands/`, `bbj-vscode/test/`
**Files scanned:** `check-function-calls.ts`, `check-unknown-java-member.ts`, `check-classes.ts` (via RESEARCH.md's full-file inventory), `check-variable-scoping.ts` (via RESEARCH.md), `setopts-in-code-ui.ts`, `process-runner.ts`, `process-runner.test.ts`, `extension-activation.test.ts`, `em-secret-env-channel.test.ts`, `target-resolution.test.ts`, `setopts-in-code-ui.test.ts`, `no-shell-command-construction.test.ts`, `config-reload-host.test.ts`, `decompile-io.test.ts`, `bbj-vscode/package.json` (via RESEARCH.md's citation, lines 78-211)
**Pattern extraction date:** 2026-09-29
