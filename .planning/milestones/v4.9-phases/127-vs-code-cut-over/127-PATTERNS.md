# Phase 127: VS Code Cut-Over - Pattern Map

**Mapped:** 2026-10-03
**Files analyzed:** 24 (4 new src/test groups, rest edits or deletions)
**Analogs found:** 9 / 9 files that need an analog (deletions need none)

All analog paths verified git-tracked. All paths are under `/home/coder/repos/bbj-language-server/bbj-vscode/`.

Rule reminders for the planner: no planning ids (D-xx, plan or phase numbers) in source or test comments; new modules import no `child_process`; the migration entry point must never throw (activation test mocks lack `inspect`/`update`/`sendRequest`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/denumber-command.ts` (NEW) | command (DI, no vscode import) | request-response | `src/Commands/target-resolution.ts` + `src/restart-gate.ts` (DI style) | role-match |
| `src/settings-migration.ts` (NEW) | utility (config migration, DI) | batch / file-I/O via config API | `src/restart-gate.ts` (DI deps) + `appendOutputLine` in `src/extension.ts` | partial |
| `src/extension.ts` (EDIT: line 543, activate hook) | wiring | request-response | its own `bbj.runBUI` wrapper (lines 516-525) and `registerSetOptsInCodeComposer` call (line 468) | exact |
| `src/open-file-prompts.ts` (EDIT lines 77-107) | provider/prompt | event-driven | itself (`maybePromptTokenized`, lines 47-75) | exact |
| `src/Commands/process-args.ts` (EDIT lines 211-234) | utility | transform | itself (`buildCompileArgv` lines 195-209) | exact |
| `src/Commands/Commands.cjs` (EDIT: remove denumber path) | controller | request-response | itself (`decompileReplace`/`decompileReadonly`) | exact |
| `package.json` (EDIT lines 404-439) | config | n/a | existing property blocks, `bbj.home` for `["string","null"]` default null | exact |
| `test/denumber-command.test.ts` (NEW) | test | request-response | `test/target-resolution.test.ts` (no-vscode-mock style) | role-match |
| `test/settings-migration.test.ts` (NEW) | test | batch | `test/target-resolution.test.ts` (pure DI stubs) | role-match |
| `test/formatter-settings-schema.test.ts` (NEW) | test | transform | `test/activation-command-coverage.test.ts` (reads package.json) | role-match |
| `test/formatter-removal.test.ts` (NEW) | test | file-I/O (fs absence + source guards) | `test/target-resolution.test.ts` source guards (`readFileSync`, `extractBraceBlock`) | role-match |
| Deletions: `src/document-formatter.ts`, `src/formatter-java-resolver.ts`, `src/formatter-verifier.ts`, `tools/formatter/**`, 4 tests | n/a | n/a | none (delete) | n/a |
| Edits to existing tests (command-argv-injection, commands-cjs-execution, commands-cjs-harness, target-resolution, decompile-io, no-shell-command-construction, activation-prompts-and-status-bars, 10 mocks) | test | mixed | themselves | exact |

## Pattern Assignments

### `src/denumber-command.ts` (command, request-response)

**Analog:** `src/Commands/target-resolution.ts` (pure module, header and no-vscode rule) and the inline run wrappers in `src/extension.ts`.

**Header and no-vscode convention** (`target-resolution.ts` lines 1-5, 24-28):
```typescript
/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
...
 * No `vscode` import here, intentionally: every function takes plain
 * primitives, so this module is unit-testable with zero mocks.
```

**Target guard to reuse** (`target-resolution.ts` lines 31, 65-76, and exports `ActiveEditorSnapshot`, `toActiveEditorSnapshot`):
```typescript
export const NO_ACTIVE_BBJ_FILE_MESSAGE = 'No active BBj file. Open or select a BBj file and try again.';
export function resolveRunTarget(argFsPath: string | undefined, active: ActiveEditorSnapshot | undefined): string | undefined {
    if (argFsPath) { return argFsPath; }
    if (active && isRunnableBbjDocument(active)) { return active.fileName; }
    return undefined;
}
```

**Guard-then-act pattern in extension.ts** (`extension.ts` lines 516-521):
```typescript
vscode.commands.registerCommand("bbj.runBUI", async (params) => {
    const target = resolveRunTarget(params?.fsPath, toActiveEditorSnapshot(vscode.window.activeTextEditor));
    if (!target) {
        vscode.window.showWarningMessage(NO_ACTIVE_BBJ_FILE_MESSAGE);
        return;
    }
```

**Core pattern:** use the `createDenumberCommand(deps)` design in RESEARCH "Pattern 1" verbatim (open, show unless visible with `{ preview: false }`, `sendDenum({ uri: doc.uri.toString() })`, one error toast only on rejection, no retry). Import `DENUM_REQUEST_METHOD`, `DenumParams`, `DenumResult` from `./language/denum-command.js` (`DENUM_REQUEST_METHOD = 'bbj/denum'`, `DenumParams { uri: string }`). The handler reads only the first argument (Explorer passes a second).

### `src/extension.ts` (wiring)

**Registration slot to change** (line 543, keep position between `bbj.compile` and `bbj.decompile`, add no extra disposable; `EXPECTED_SUBSCRIPTIONS_LENGTH = 36` and the trace in `activation-command-coverage.test.ts` lines 239/260/284 stay untouched):
```typescript
context.subscriptions.push(vscode.commands.registerCommand("bbj.denumber", Commands.denumber));
```
Becomes `createDenumberCommand({ activeEditor: () => toActiveEditorSnapshot(vscode.window.activeTextEditor), openDocument: p => vscode.workspace.openTextDocument(vscode.Uri.file(p)), isVisible, show: d => vscode.window.showTextDocument(d, { preview: false }), sendDenum: params => client.sendRequest(DENUM_REQUEST_METHOD, params), warn: m => void vscode.window.showWarningMessage(m), error: m => void vscode.window.showErrorMessage(m) })`.

**Lazy client binding precedent** (line 468; `client` is the module-level `let client: LanguageClient`, line 44):
```typescript
registerSetOptsInCodeComposer(context, (method, params) => client.sendRequest(method, params));
```

**Never-throw log helper for the migration** (lines 60-66):
```typescript
function appendOutputLine(message: string): void {
    try { outputChannel.appendLine(message); } catch { /* swallow */ }
}
```
Use `appendOutputLine` (not `outputChannel.info`) because test channel mocks only have `appendLine`/`dispose`. Kick the migration off from `activate()` fire-and-forget (`void migrateSplitSingleLineIf(...).catch(...)`), wrapped so a missing `inspect`/`update` cannot throw.

### `src/settings-migration.ts` (utility, config migration)

**Analog:** `src/restart-gate.ts` for the DI shape (an interface of structural deps, no `vscode` import, header comment explaining why).

**Core design:** RESEARCH "Migration core" block (Global and Workspace only; `typeof old === 'boolean' && new === undefined`; write new key then `update(oldKey, undefined, target)`; per-scope try/catch; one log line per migrated scope; idempotent). Take key names from `LEGACY_SPLIT_SINGLE_LINE_IF_KEY` and the `splitSingleLineIf` constant in `src/language/bbj-format-settings.ts`. Deps interface: `{ inspect(key), update(key, value, target), log(line) }` over `getConfiguration('bbj.formatter')`, with the scope targets passed in as plain values so tests need no vscode mock.

### `src/open-file-prompts.ts` (prompt, event-driven)

**Analog:** same file. Change only lines 77-80 comment, 92, 95, 99. Current text:
```typescript
const denumberAction = 'Denumber & Replace';
const readOnlyAction = 'Open Read-only';
const choice = await vscode.window.showInformationMessage(
    `"${path.basename(doc.fileName)}" is a line-numbered BBj program. Denumber it to editable source, or open it read-only?`,
    denumberAction, readOnlyAction
);
if (choice === denumberAction) {
    // bbj.denumber runs bbjlst and replaces the file in place with denumbered source.
    vscode.commands.executeCommand('bbj.denumber', doc.uri);
```
New button `'Denumber'`, text `"x.bbj" is a line-numbered BBj program. Denumber it for editing, or open it read-only?`, keep `executeCommand('bbj.denumber', doc.uri)`, rewrite the lines 77-80 and 99 comments (no "replace the file"). The read-only branch (lines 101-106) is unchanged.

### `src/Commands/process-args.ts` (utility, transform)

**Analog:** `buildCompileArgv` (lines 195-209) as the shape of a flat-options builder. Target for `buildDecompileArgv` (current lines 211-234): drop the `denumber` option, always push `-l`, keep the `.lst` rule (orchestrator clarification):
```typescript
const { home, platform = process.platform, fileName } = opts;
const args: string[] = ['-l'];
if (fileName.endsWith('.lst')) {
    args.push('-xlst');
}
args.push(fileName);
return { file: bbjlstBin(home, platform), args };
```
Reword the doc comment (lines 218-222) to "always `-l`; `-xlst` added for a `.lst` input; file name last". Callers: `Commands.cjs` line 468 passes `denumber: true` and must drop it.

### `src/Commands/Commands.cjs` (controller, remove denumber path)

No new code. Per RESEARCH Q5: delete `Commands.denumber` (lines 429-431) and `const decompile = (params, options = {}) => {...}` (186-192); simplify `decompileInPlace(resolvedFileName, options)` to no `options` (title `"Decompiling BBj Program..."`, `newFileName = resolvedFileName`, drop dead unlink branch); `decompileReplace` calls `decompileInPlace(path.resolve(fileName))`; `decompileReadonly` calls `buildDecompileArgv({ home, platform: os.platform(), fileName: tmpInput })`. Reword comments at 159-161 and `decompile-io.ts` 109-112. Keep `runTargetOrWarn` and `decompileTargetOrWarn`. The file is CommonJS: tsc does not catch leftovers; the source-guard tests do. Line numbers are from research; re-read before editing.

### `package.json` (config)

**Analog:** existing blocks, lines 404-439. Existing key shape (line 404-409):
```json
"bbj.denumber.promptOnOpen": {
  "type": "boolean",
  "default": true,
  "description": "When opening a line-numbered BBj program, prompt to denumber it (replacing the file with editable source) or open it read-only.",
  "scope": "window"
},
```
Rewrite the description to drop "replacing". Replace lines 410-439 (4 old formatter keys plus `javaPath`) with the 15 keys from RESEARCH Q3 (rich shape per "Pattern 2": `type`, `default`, `enum`, `enumDescriptions`, `markdownDescription`, `order`, `scope: "window"`; `indentWidth` integer 0-16 default 2; `order` grouping from RESEARCH Q3) plus the deprecated key `bbj.formatter.splitSingleLineIF` as `"type": ["boolean","null"], "default": null` with `deprecationMessage` and `markdownDeprecationMessage` naming `splitSingleLineIf`, no `order`. Copy the `["string","null"]` plus `default: null` pattern from the existing `bbj.home` property. The `bbj.denumber` command, menus (lines 158-347) and Alt+N keybinding stay byte-identical.

### `test/denumber-command.test.ts` (test, request-response)

**Analog:** `test/target-resolution.test.ts` (imports only vitest and the pure module, no `vi.mock('vscode')`):
```typescript
import { describe, expect, test } from 'vitest';
import {
    NO_ACTIVE_BBJ_FILE_MESSAGE,
    ...
} from '../src/Commands/target-resolution.js';
```
Use hand-written DI stubs recording call order. Cases per RESEARCH Q6: no target warns and sends nothing; unopened Explorer file order open, show, send with `{ uri: doc.uri.toString() }`; already visible skips `show`; argument `fsPath` wins; a `failed` result sends no client message; a rejected request gives exactly one error; extra args ignored. Add the package.json pin (command id/title, `alt+n`, three menu entries).

### `test/settings-migration.test.ts` (test, batch)

**Analog:** same pure style. Fake config object with `inspect`/`update` recording calls. Cases: old set + new unset moves and removes per scope; both set leaves both; non-boolean ignored; update rejection logs one warning and does not throw; second run no-op; scopes migrate independently.

### `test/formatter-settings-schema.test.ts` (test, transform)

**Analog:** `test/activation-command-coverage.test.ts` reads `package.json` from disk; use `path.resolve(__dirname, '..')` as in `target-resolution.test.ts` line 23. Import `FORMATTER_SETTING_KEYS`, `FORMATTER_DEFAULTS`, `LEGACY_SPLIT_SINGLE_LINE_IF_KEY`, `normalizeFormatterSettings` from `../src/language/bbj-format-settings.js`. Assertions 1-6 as listed in RESEARCH Q3 "Pin test". Literal enum table in the test (CI has no bbj-ls sibling repo).

### `test/formatter-removal.test.ts` (test, file-I/O)

**Analog:** the source-guard helpers in `test/target-resolution.test.ts` lines 23-33 (`REPO_ROOT`, `fs.readFileSync`). Asserts per RESEARCH Q4 absence guard and Q5 (no `/denumber/i` in `Commands.cjs` and `process-args.ts`; `extension.ts` has no `Commands.denumber`). Note: `process-args.ts` must contain no "denumber" at all, including comments; `-xlst` stays so assert on the word, not the flag. Scan only `src/`, not the test file itself.

## Shared Patterns

### No-vscode, DI-only pure modules
**Source:** `src/Commands/target-resolution.ts`, `src/Commands/process-args.ts`, `src/restart-gate.ts`
**Apply to:** `denumber-command.ts`, `settings-migration.ts`. File header is the TypeFox MIT block; a doc comment states why there is no `vscode` import.

### Never throw from activation-reachable code
**Source:** `appendOutputLine` in `src/extension.ts` lines 60-66.
**Apply to:** the migration kickoff and anything new reached from `activate()` (test mocks omit `inspect`, `update`, `sendRequest`).

### Mock sweep when removing `Commands.denumber`
**Apply to:** the 10 test files with `denumber: vi.fn()` in the `Commands.cjs` mock (activation-command-coverage, activation-prompts-and-status-bars, config-file-association, config-reload-host, em-auth-error-paths, em-login-username, em-token-expiry-wiring, extension-activation, extension-config-trust, stale-output-channel-repro) and `test/commands-cjs-harness.ts` line 155. Run these edits sequentially with the denumber-command plan (shared files).

### Narrow the shell-launcher guard
**Source/Apply to:** `test/no-shell-command-construction.test.ts` line 102: importers list becomes `['Commands/process-runner.ts', 'language/bbj-cpl-service.ts']`; delete the seven `document-formatter.ts` tests (lines ~115-155) and comment at 94-97.

### Ordering constraints
1. `package.json` `javaPath` removal lands with or after the deletion sweep (`formatter-java-resolver.test.ts:242` reads that property).
2. New `bbj.denumber` registration lands before or with removal of `Commands.denumber`.
3. Delete each module in the same commit as the tests importing it.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `127-UAT.md` hand-check list (CUT-03) | doc | manual | Follow RESEARCH Q7 steps; no code analog |
| Settings-schema `order`/`enumDescriptions` block | config | n/a | No existing property uses `enum`/`order`; use RESEARCH "Pattern 2" |

## Metadata

**Analog search scope:** `bbj-vscode/src`, `bbj-vscode/src/Commands`, `bbj-vscode/test`, `bbj-vscode/package.json`
**Files scanned:** about 12 read in full or in part, plus targeted greps of `extension.ts`
**Pattern extraction date:** 2026-10-03
