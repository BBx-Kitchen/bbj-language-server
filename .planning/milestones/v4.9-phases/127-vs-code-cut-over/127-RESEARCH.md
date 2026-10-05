# Phase 127: VS Code Cut-Over - Research

**Researched:** 2026-10-03
**Domain:** VS Code extension (TypeScript, vscode-languageclient 10.1.2) cut-over from the client-side formatter jar and bbjlst denumber onto the BBj language server's `formatProgram` / `bbj/denum`; VS Code settings schema and migration; VSIX packaging.
**Confidence:** HIGH (all in-repo facts read this session; VS Code API facts read from `vscode.d.ts` and the installed `vscode-languageclient` source). Items that rest on training knowledge or cannot be probed here are tagged `[ASSUMED]` and collected in the Assumptions Log.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Carried forward (not re-asked)
- Phase 126 D-10/D-14 stand: **the server presents every DENUM outcome and applies the edit** via
  `workspace/applyEdit` (one undo step, buffer left dirty). The VS Code command shrinks to "send
  `bbj/denum` with the document URI"; the client words nothing about outcomes. `bbj/denum` answers
  `failed` + `reason: 'not-open'` for a document the LS does not have open (closed reason vocabulary in
  `bbj-vscode/src/language/denum-command.ts`, `DENUM_FAILURE_REASONS`).
- Phase 126 D-01..D-04 / 126-07: DENUM diagnostics go to the Problems view (`bbj-denum` collection)
  with a log copy in the 'BBj' channel. Already wired in `extension.ts`; this phase reuses it unchanged.
- Phase 125 D-09/D-10: the LS normalizer (`bbj-format-settings.ts`) already maps the legacy
  `splitSingleLineIF` to `splitSingleLineIf` when the new key is absent and never forwards `javaPath`.
  It stays as a backstop.
- Hard cut-over, no jar fallback; `indentWidth` defaults to 2 (bbj-ls defaults to 4).

### Denumber command targets (DEN-02)
- **D-01:** Invoked from the **Explorer context menu on a file that is not open**, the client
  **opens it in an editor first** (`showTextDocument`), waits until the LS has the document, then
  sends `bbj/denum`. Explorer and editor invocations behave the same. The planner decides how to wait
  for the LS `didOpen` (or how to retry once on `not-open`).
- **D-02:** After a successful denumber the file is **left dirty, never saved automatically**: the
  user reviews and saves. This is a behaviour change from bbjlst (which rewrote the file on disk); it
  goes into the Phase 130 migration note.
- **D-03:** **Menus stay as they are.** `.bbx` program files are valid denumber targets: they have
  language id `bbj` (package.json maps `.bbx` to `bbj`), so they get the menus and pass the LS's `bbj`
  allow-list. `config.bbx` is the outlier — it is the BBj config file despite its extension and is
  mapped by filename to `bbx-config`, so it gets no menu and the LS refuses it. Note: the menu clause
  `resourceLangId == bbx` matches no declared language (dead clause); leaving it unchanged is fine,
  removing it is the planner's call.
- **D-04:** **Keep the client-side no-target guard** (`runTargetOrWarn` / "no active BBj file"
  wording, as Run/Compile): `bbj/denum` is never sent without a URI.

### Open-file prompt (DEN-05)
- **D-05:** The button becomes **"Denumber"** (was "Denumber & Replace"), and the prompt text drops
  the "replacing the file" promise (e.g. `"x.bbj" is a line-numbered BBj program. Denumber it for
  editing, or open it read-only?`). It runs the same path as the command (D-01/D-02). The
  `bbj.denumber.promptOnOpen` description in package.json is reworded to match (no "replacing the
  file").
- **D-06:** Detection **stays on the client regex** (`isLineNumberedSource`, `src/line-numbering.ts`):
  immediate, no round trip, works with BBjServices down. A mismatch is harmless because `bbj/denum`
  answers with its own message ("nothing to do" / mixed numbering).
- **D-07:** **"Open Read-only" is unchanged** (`workbench.action.files.setActiveEditorReadonlyInSession`).

### Decompile vs denumber (DEN-06)
- **D-08:** **Decompile keeps bbjlst's `-l`**, so Decompile (Replace) and Decompile (Read-only) still
  turn tokenized programs into unnumbered source in one step, without BBjServices or BBj 26.03.
  Removed: `Commands.denumber`, the plain-text/`.lst` denumber branch (`-xlst` handling, the in-place
  rewrite of plain-text files in `decompileInPlace`). The `denumber` option of `buildDecompileArgv`
  is renamed or folded so nothing named "denumber" remains on the bbjlst path. Decompile's output,
  messages and temp-dir read-only flow are unchanged.

### Settings migration (SET-01, SET-03, SET-04)
- **D-09:** **One-time client migration for `splitSingleLineIF`.** Reason: once
  `splitSingleLineIf` is declared with a default, VS Code always supplies it, so the normalizer's
  "legacy only when the new key is absent" rule would never fire. On activation, per scope
  (global / workspace / workspace-folder via `inspect()`): where the old key is set and the new key is
  not, write the value to the new key **in the same scope** and remove the old key there. One info
  line in the 'BBj' log; no popup. The old key stays declared for one release with a
  `deprecationMessage`/`markdownDeprecationMessage` pointing to `splitSingleLineIf`. — **Reversibility:**
  costly — it writes the user's settings files; a value moved cannot be "un-moved" by a later release.
- **D-10:** **`bbj.formatter.javaPath` is simply removed from the schema.** A leftover value in a
  user's settings.json is greyed out by VS Code as unknown and is already dropped by the LS (SET-02);
  nothing writes to settings for it.
- **D-11:** **Rich schema** for the 15 keys: `indentWidth` as `integer`, `minimum` 0, `maximum` 16,
  default 2; booleans with defaults from `FORMATTER_DEFAULTS`; every enum with `enum` +
  `enumDescriptions` (one short line per value); `markdownDescription` where bbj-ls has semantics
  worth stating (`ifClosingKeyword` / `ifKeywordCase` KEEP behaviour, `keywordsToUppercase` winning
  over `ifKeywordCase`); a stable `order` grouping. Texts short and paraphrased from the bbj-ls
  formatter README. Schema defaults must equal `FORMATTER_DEFAULTS` (a test should pin that). Changes
  apply to the next format without restart (already true via `configuration-change-handler.ts`;
  verify, don't rebuild).

### Claude's Discretion
- Exact prompt and description wording (short, plain), the `order` grouping, and enum description
  texts.
- Settings `scope` for the new keys (existing ones use `window`); keep consistent unless research
  finds a reason.
- How the open-then-denumber wait is implemented (D-01) and where the migration code lives
  (e.g. a small `settings-migration.ts` called from `activate()`).
- Order of the deletion sweep (CUT-02) and how CI guards that pin the jar
  (`formatter-pins-drift`, `formatter-verifier-tamper`, `no-shell-command-construction`) are removed
  or narrowed; every CI gate (build, lint, `typecheck:test`, test, VSIX package, workflow-hygiene)
  must pass after.
- The CUT-03 hand-check step list, within the standing UAT rules below.

### Deferred Ideas (OUT OF SCOPE)
- Migration-note entry for D-02 (Denumber no longer saves to disk) — Phase 130.

### Reviewed Todos (not folded)
- IntelliJ initOptions key mismatch, peer-name escaping in signature help, Windows IntelliJ Node
  download progress, lsp4j 1.0 in bbj-ls, vitest 5, vscode-jsonrpc 9 — matched on generic keywords
  only; none touches the VS Code cut-over.

Also from CONTEXT `<specifics>`: standing UAT rules apply to CUT-03 — build and install the VSIX first
and again from the final tree after code-review fixes; live BBj 26.03 BBjServices; check Format
Document, Format Selection, format-on-save, the numbered-file offer, Denumber (command, Explorer on an
unopened file, open prompt) and Denumber and Format, plus Decompile still working.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SET-01 | All 15 formatter settings are available in VS Code with a typed schema (bounded integer, booleans, enums with descriptions), applied without restart | "Settings schema" table below (keys, types, defaults, enums, order); schema pin test; `bbj.formatter` already flows to the LS through three channels and applies immediately (Pitfall 6) |
| SET-03 | A user who set `splitSingleLineIF` keeps that behaviour through `splitSingleLineIf` (deprecated alias for one release) | Q2 findings: keys are case-sensitive and do not collide; deprecated key shape (`["boolean","null"]`, `default: null`); migration design (Global + Workspace only; why folder scope is unreachable) |
| SET-04 | `bbj.formatter.javaPath` is removed | Remove the one property block (package.json lines 434-439); delete `formatter-java-resolver.test.ts` in the same change (Pitfall 3); absence test |
| DEN-02 | "Denumber BBj Program" (same id, menus, keybinding) denumbers the live buffer through `bbj/denum` as one undoable edit, unsaved changes included | Q1 findings (no race, no retry); `denumber-command.ts` design; request shape `{ uri }` |
| DEN-05 | Open-file prompt offers "Denumber" via the new path and still offers read-only opening | `open-file-prompts.ts` lines 92-106 change; test changes in Q6 |
| DEN-06 | The bbjlst denumber path is removed, while decompiling tokenized programs through bbjlst keeps working | Q5 breakdown of exactly which code is denumber-only vs decompile |
| CUT-02 | Jar, `tools/formatter`, the three modules, their tests, guards and packaging references are removed | Q4 deletion inventory; baseline `vsce ls` shows five `tools/formatter/**` files in today's VSIX |
| CUT-03 | Format and DENUM verified end-to-end in VS Code against live BBj 26.03 from the built VSIX | Q7 hand-check step list; automated companions (VSIX content check, live test) |
</phase_requirements>

## Summary

Phase 127 is mostly a *subtraction and re-pointing* phase. The language server already does all the work (Phases 124-126): `formatProgram` is wired as the LSP formatter, `bbj/denum` exists with a closed result vocabulary, and the server presents every outcome and applies the edit itself. What is left is: (1) a settings schema in `package.json` (15 typed keys, one deprecated alias, no `javaPath`) plus a one-time settings migration; (2) a thin client command `bbj.denumber` that resolves a target, makes sure the document is open, and sends `{ uri }`; (3) rewording the open-file prompt; (4) removing the denumber branch of the bbjlst helpers while decompile keeps `-l`; (5) deleting ~590 lines of dead formatter-jar code, 1 vendored-jar directory, 4 test files and narrowing one guard test; (6) a hand check from the built VSIX.

The three real risks are all about *ordering and mocks*, not new technology. First, the 10 activation-style test files mock `vscode.workspace.getConfiguration` without `inspect`/`update` and mock `LanguageClient` without `sendRequest`; any new code reached from `activate()` must be failure-tolerant or those suites break. Second, `activation-command-coverage.test.ts` pins the exact activation trace and `EXPECTED_SUBSCRIPTIONS_LENGTH = 36`; keeping `bbj.denumber` registered in the same slot and adding no disposables keeps that pin untouched. Third, deleting `formatter-java-resolver.ts` and removing `bbj.formatter.javaPath` from `package.json` must land together, because a test in the to-be-deleted file reads that very property.

**D-01 needs no retry.** The ordering analysis (Q1) shows `workspace.onDidOpenTextDocument` fires before `openTextDocument` resolves, vscode-languageclient sends `didOpen` immediately from that event (the `delayOpenNotifications` option is off), `sendRequest` runs the same await chain as the `didOpen` notification and was issued strictly later, and the server updates its `TextDocuments` store synchronously on `didOpen`. A retry on `not-open` would in fact be harmful: the server has already shown its "Open the BBj file in the editor first" message for the first attempt.

**Primary recommendation:** Add a DI-style `src/denumber-command.ts` (open -> show-if-not-visible -> `client.sendRequest('bbj/denum', { uri: doc.uri.toString() })`, no retry, one error toast only if the request itself rejects) registered in the existing `bbj.denumber` slot; declare the 15 keys with the deprecated alias as `["boolean","null"]` / `default: null`; migrate Global and Workspace scopes only (window-scoped keys cannot exist at folder scope); delete the formatter set and `javaPath` in one plan; pin schema == `FORMATTER_DEFAULTS` plus a literal enum table from the bbj-ls README; finish with a VSIX hand check that includes the Phase 126 UAT test 7 carry-over (tokenized and protected programs).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Formatter settings schema, defaults, enum docs | VS Code extension manifest (`package.json`) | LS normalizer (`bbj-format-settings.ts`) as backstop | Only the manifest drives the Settings UI and `settings.json` validation; the LS defends against bad values |
| Legacy-key migration (`splitSingleLineIF`) | Extension host (client) | — | Only the client can read/write user and workspace settings files; the LS cannot see scopes |
| Delivering `bbj.formatter` to the LS | Extension host (initializationOptions + `didChangeConfiguration` push + `workspace/configuration` pull) | LS (`configuration-change-handler.ts`, `bbj-ws-manager.ts`) | Already built; verify only |
| Denumber trigger (command, menus, keybinding, prompt) | Extension host | — | UI surface; the client sends one request |
| Denumber execution, edit application, user messages | Language server (`BBjDenumService`) -> bbj-ls on :5008 | — | Locked by Phase 126: the server presents every outcome and applies the edit |
| Numbered-file detection for the open prompt | Extension host (`isLineNumberedSource` regex) | LS answers "nothing to do" on a mismatch | D-06: immediate, works with BBjServices down |
| Decompile of tokenized programs | Extension host spawning `bbjlst -l` (`Commands.cjs`) | — | D-08: no BBjServices or BBj 26.03 needed |
| Formatting itself | Language server -> bbj-ls `formatProgram` | — | Done in Phase 125; this phase removes the competing jar |
| Packaging (what the VSIX contains) | `.vscodeignore` + `vsce package` | — | `tools/` ships by default; deleting the directory is the whole fix |

## Standard Stack

No new runtime or dev dependencies. Everything this phase needs is already in the repo.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vscode-languageclient | 10.1.2 `[VERIFIED: bbj-vscode/node_modules/vscode-languageclient/package.json "version": "10.1.2"]` | `client.sendRequest('bbj/denum', ...)`, didOpen sync | Already the extension's client |
| `vscode` API (`engines.vscode ^1.101.0`) | `^1.101.0` `[VERIFIED: bbj-vscode/package.json "vscode": "^1.101.0"]` | `WorkspaceConfiguration.inspect/update`, `openTextDocument`, `showTextDocument` | Host API |
| vitest | existing (`^4.1.10` per phase 126 validation) `[CITED: 126-VALIDATION.md "vitest ^4.1.10"]` | unit tests | Existing framework |
| @vscode/vsce (via `npx vsce`) | existing | `vsce ls` / `vsce package` for the VSIX content check | Used by CI (`.github/workflows/build.yml`) and `bbj-ext-install` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bbj-ext-install` (container script, `/usr/local/bin/bbj-ext-install`) | n/a | `vsce package --no-dependencies --out /tmp/bbj-lang.vsix` then force-install into `~/.ext-test` | CUT-03 and the standing "build first" UAT rule |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| No-retry denumber ordering | Retry once on `not-open` | Retry double-reports: the server already showed the not-open message; rejected (see Q1) |
| `["boolean","null"]` default `null` for the deprecated key | `boolean` with default `false` | A `false` default means VS Code always supplies the legacy key too; harmless to the normalizer but pointless and shows a bogus value in `inspect()`; `null` marks "unset" |
| Migrating folder scope too | Global + Workspace only | Window-scoped keys cannot be written at folder scope (API throws); implementing it is dead code (Q2) |

**Installation:** none.

**Version verification:** no package is added or bumped. `vscode-languageclient` version read from its installed `package.json` this session.

## Package Legitimacy Audit

No external packages are installed or added by this phase, so the legitimacy gate (`gsd_run query package-legitimacy check`) does not apply.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

The deletion removes three vendored Java jars (`BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`, `lib/jcommander-1.71.jar`); this reduces supply-chain surface.

## Architecture Patterns

### System Architecture Diagram

```
DENUMBER (DEN-02, DEN-05)

 Explorer right-click (unopened file) ─┐
 Editor context / title icon / Alt+N ──┼─> bbj.denumber(arg?)          [extension host]
 Open-file prompt "Denumber" button ───┘      │ (prompt calls executeCommand('bbj.denumber', doc.uri))
                                              ▼
                       resolveRunTarget(arg.fsPath, activeEditor)  ── none ──> warn "No active BBj file..." (no request)
                                              │ target path
                                              ▼
                       openTextDocument(Uri.file(target))   ──fires onDidOpenTextDocument──> LanguageClient
                                              │                                              │ didOpen (sent immediately)
                                              ▼                                              ▼
                       showTextDocument(doc) unless already visible                    LS TextDocuments store (sync)
                                              │
                                              ▼
                       client.sendRequest('bbj/denum', { uri: doc.uri.toString() })  ───────> LS BBjDenumService
                                              ▲                                              │ denumProgram on :5008 (bbj-ls)
                          result ignored; reject => 1 error toast                            │ workspace/applyEdit (one undo step, buffer dirty)
                                                                                             │ server shows every message
                                                                                             └─> bbj/denumDiagnostics -> Problems view (unchanged)

SETTINGS (SET-01/03/04)

 package.json schema (15 keys + deprecated splitSingleLineIF)
        │ defaults merged by VS Code into getConfiguration('bbj').formatter
        ▼
 activate(): migrate old -> new key per scope (Global, Workspace)  ──> settings.json rewrite + one 'BBj' log line
        │
        ├─> initializationOptions.formatter (startup)
        ├─> didChangeConfiguration push, section 'bbj' (middleware gatedBbjSettings)
        └─> workspace/configuration pull (middleware)
                        ▼
              LS setFormatterSettings -> normalizeFormatterSettings (exactly 15 keys, javaPath dropped)
                        ▼
              next formatProgram carries the new values (no restart)

REMOVAL (CUT-02, DEN-06)

 delete: src/document-formatter.ts, formatter-java-resolver.ts, formatter-verifier.ts,
         tools/formatter/**, 4 test files; narrow no-shell-command-construction.test.ts
 Commands.cjs: drop `denumber`, `decompile` helper, options.denumber branches; keep decompileReplace / decompileReadonly
 process-args.ts: buildDecompileArgv always `-l` (no flag, no -xlst)
```

### Recommended Project Structure
```
bbj-vscode/
├── package.json                    # 15 bbj.formatter.* keys, deprecated splitSingleLineIF, no javaPath; reworded promptOnOpen text
├── src/
│   ├── denumber-command.ts         # NEW: createDenumberCommand(deps) — pure, DI, no vscode import (like target-resolution.ts)
│   ├── settings-migration.ts       # NEW: migrateSplitSingleLineIf(deps) — DI over a WorkspaceConfiguration-shaped dep
│   ├── extension.ts                # bbj.denumber registered in the same slot; migration kicked off from activate()
│   ├── open-file-prompts.ts        # button + text change only
│   ├── Commands/Commands.cjs       # denumber path removed
│   ├── Commands/process-args.ts    # buildDecompileArgv simplified
│   └── decompile-io.ts             # comment reword only
└── test/
    ├── denumber-command.test.ts           # NEW
    ├── settings-migration.test.ts         # NEW
    ├── formatter-settings-schema.test.ts  # NEW (schema pin)
    └── formatter-removal.test.ts          # NEW (absence guard)
```

### Pattern 1: DI-style command (matches `target-resolution.ts` and `restart-gate.ts`)
**What:** The command logic lives in a module with no `vscode` import; `extension.ts` passes real functions. **When to use:** `bbj.denumber` and the migration, so unit tests need no `vi.mock('vscode')`.

**Example:**
```typescript
// Source: design for this phase; request/result shapes quoted from src/language/denum-command.ts
import type { DenumParams, DenumResult } from './language/denum-command.js';
import { NO_ACTIVE_BBJ_FILE_MESSAGE, resolveRunTarget, type ActiveEditorSnapshot } from './Commands/target-resolution.js';

export interface DenumberCommandDeps {
    activeEditor(): ActiveEditorSnapshot | undefined;                       // toActiveEditorSnapshot(vscode.window.activeTextEditor)
    openDocument(fsPath: string): Promise<{ uri: { toString(): string } }>;  // vscode.workspace.openTextDocument(vscode.Uri.file(p))
    isVisible(uri: string): boolean;                                         // visibleTextEditors.some(e => e.document.uri.toString() === uri)
    show(doc: { uri: { toString(): string } }): Promise<unknown>;            // showTextDocument(doc, { preview: false })
    sendDenum(params: DenumParams): Promise<DenumResult>;                    // client.sendRequest(DENUM_REQUEST_METHOD, params)
    warn(message: string): void;
    error(message: string): void;
}

export function createDenumberCommand(deps: DenumberCommandDeps): (arg?: { fsPath?: string }) => Promise<void> {
    return async arg => {
        const target = resolveRunTarget(arg?.fsPath, deps.activeEditor());
        if (!target) { deps.warn(NO_ACTIVE_BBJ_FILE_MESSAGE); return; }
        try {
            const doc = await deps.openDocument(target);        // fires didOpen to the LS before this resolves
            const uri = doc.uri.toString();                     // the exact string didOpen carried
            if (!deps.isVisible(uri)) { await deps.show(doc); } // D-01; skip when already shown (no duplicate tab)
            await deps.sendDenum({ uri });                      // server presents every outcome; result is not inspected
        } catch (error) {
            deps.error(`Denumber failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
}
```

### Pattern 2: Schema property with the full rich shape
```json
"bbj.formatter.ifKeywordCase": {
  "type": "string",
  "default": "KEEP",
  "enum": ["KEEP", "MATCH_IF", "LOWER_CASE", "UPPER_CASE"],
  "enumDescriptions": [
    "Leave every ELSE, FI and ENDIF as written.",
    "Copy the case of the opening IF.",
    "Write ELSE, FI and ENDIF in lower case.",
    "Write ELSE, FI and ENDIF in upper case."
  ],
  "markdownDescription": "Case of `ELSE`, `FI` and `ENDIF`. Applies to existing and generated keywords. `#bbj.formatter.keywordsToUppercase#` always wins over this setting.",
  "order": 12,
  "scope": "window"
}
```
`enumDescriptions` must have the same length as `enum` `[CITED: https://code.visualstudio.com/api/references/contribution-points — "an array of strings of the same length as the `enum` property"]`.

### Anti-Patterns to Avoid
- **Retrying `bbj/denum` on `not-open`:** the server shows its not-open message on every attempt, so a "silent" retry produces a user-visible warning even when the retry succeeds.
- **Client-worded outcomes:** the client must not turn `failed`/`not-line-numbered` into toasts; only a *rejected request* (transport failure) gets one client message.
- **Spawning anything from the new modules:** no `child_process` import (the no-shell guard pins which files may import it).
- **`getConfiguration().update` on an undeclared key:** it throws (`vscode.d.ts`); keep the old key declared while the migration exists.
- **Planning ids in source or test comments** (D-xx, plan numbers, phase numbers): a project rule (memory "Register-check the source diff"). Issue numbers are fine.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for the LS to know a document | Polling, `setTimeout`, retry loops | Await `openTextDocument` then `sendRequest` on the same connection | Ordering is guaranteed (Q1); a retry double-reports |
| Settings file edits | Manual JSON parse/rewrite of `settings.json` | `WorkspaceConfiguration.update(key, value, target)` and `update(key, undefined, target)` to remove | The API edits JSONC in place, preserves comments, and handles dirty-file rejection |
| Defaults for the Settings UI | A second defaults table in code | `FORMATTER_DEFAULTS` as the single source plus a pin test | A drifting copy is the classic failure |
| Denumbering | Anything client-side | `bbj/denum` | Phase 126 contract |
| Target resolution | A new resolver | `resolveRunTarget` / `toActiveEditorSnapshot` / `NO_ACTIVE_BBJ_FILE_MESSAGE` from `Commands/target-resolution.ts` | Already used by the `bbj.runBUI` / `bbj.runDWC` wrappers in `extension.ts`; D-04 |
| Verifying the VSIX has no jar | A new script | `npx vsce ls --no-dependencies` (and `unzip -l` on the built VSIX) | CI and `bbj-ext-install` already package with vsce |

**Key insight:** every behaviour this phase needs already exists somewhere in the repo; the work is wiring and deleting, so a custom solution for any of the rows above is a defect.

## Runtime State Inventory

This phase renames a settings key (`splitSingleLineIF` -> `splitSingleLineIf`) and removes a setting, so the inventory applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Users' global `settings.json` and workspace `.vscode/settings.json` may hold `bbj.formatter.splitSingleLineIF` (and a leftover `bbj.formatter.javaPath`). | **Data migration** (D-09) for `splitSingleLineIF` at Global and Workspace scope. **None** for `javaPath` (D-10: left as an unknown, greyed key; the LS drops it). The repo's own `.vscode/settings.json` has no formatter/denumber key (`git grep` found none). |
| Live service config | None. bbj-ls receives only the 15 normalized keys; no external service stores the key names. | None, verified by reading `normalizeFormatterSettings` (`src/language/bbj-format-settings.ts:117-135`). |
| OS-registered state | None. No task, service or registration embeds these names. | None. |
| Secrets/env vars | None. The jar path used no secret or env var (`javaPath` was a machine-scoped setting). | None. |
| Build artifacts / installed packages | (1) The currently installed extension in `~/.ext-test/extensions/basis-intl.bbj-lang-*` still contains `tools/formatter/**` until reinstalled. (2) Gitignored local VSIXs `bbj-vscode/bbj-lang.vsix` and `bbj-lang-0.15.3.vsix` and `/tmp/bbj-lang.vsix` contain the jar. (3) `out/` never bundled the jar (`document-formatter.ts` is not imported by `extension.ts`). | Reinstall via `bbj-ext-install` (standing UAT rule). Do not treat the old VSIX files as a regression. `installed-extension-e2e.test.ts` runs against the installed bundle and is a known baseline failure when the install is stale (memory: whole-suite baseline). |

**Canonical question answered:** after every repo file is updated, the stored user settings files and the installed old extension are the only places that still carry the old names.

## Common Pitfalls

### Pitfall 1: Activation test mocks do not have `inspect`/`update`/`sendRequest`
**What goes wrong:** the migration called from `activate()` throws `TypeError` in ten suites; a handler that calls `client.sendRequest` finds no such method on the mocked `LanguageClient`.
**Why it happens:** every activation-style suite builds `getConfiguration: vi.fn(() => ({ get: vi.fn(...), formatter: {} }))` and `class LanguageClient { start; stop; onNotification }`. `[VERIFIED: bbj-vscode/test/extension-activation.test.ts:66-69 — "getConfiguration: vi.fn(() => ({ get: vi.fn((_key: string, def?: unknown) => def), formatter: {}, }))"; same shape in activation-command-coverage, config-file-association, config-reload-host, em-auth-error-paths, em-login-username, em-token-expiry-wiring, stale-output-channel-repro, activation-prompts-and-status-bars; extension-config-trust has an `inspect` only on one local stub]`.
**How to avoid:** the migration entry point must never throw (try/catch around the whole thing, one log line via the existing `appendOutputLine` helper) and be fire-and-forget. Use `appendOutputLine` (raw `appendLine`), not `outputChannel.info`: the mocked channels only have `appendLine`/`dispose` (`createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), dispose: vi.fn() }))` in `activation-prompts-and-status-bars.test.ts:98`). Tests that *call* the denumber handler get their own client double.
**Warning signs:** `TypeError: config.inspect is not a function` in unrelated suites.

### Pitfall 2: The activation trace pin
**What goes wrong:** `activation-command-coverage.test.ts` fails on a reorder or an extra disposable.
**Why:** it pins `const EXPECTED_SEQUENCE = [` (line 239, containing `'command:bbj.denumber',` at line 260, between `command:bbj.compile` and `command:bbj.decompile`) and `const EXPECTED_SUBSCRIPTIONS_LENGTH = 36;` (line 284). `[VERIFIED: test/activation-command-coverage.test.ts:239,260,284]`.
**How to avoid:** register `bbj.denumber` in the same slot (`registerCompileCommands`) and add no disposable to `context.subscriptions` and no traced vscode call for the migration. If a disposable is unavoidable, update the literal deliberately.

### Pitfall 3: Deleting `formatter-java-resolver.ts` and removing `javaPath` from `package.json` in separate steps
**What goes wrong:** `formatter-java-resolver.test.ts:242` declares `'declares bbj.formatter.javaPath with type string, default "" and scope machine'` and reads `package.json`; removing the property first breaks that suite, and deleting the suite first is fine.
**How to avoid:** do the `package.json` `javaPath` removal in the same plan/commit as the deletion sweep (or after it).

### Pitfall 4: `noUnusedLocals` and ESLint `no-unused-vars` turn leftovers into build errors
**What goes wrong:** removing `Commands.denumber` leaves an unused helper; tests keep `denumber: vi.fn()` in Commands mocks.
**Why:** `tsconfig.json` has `"noUnusedLocals": true`; ESLint has `'@typescript-eslint/no-unused-vars': ['error', ...]` and `reportUnusedDisableDirectives: 'error'`. `[VERIFIED: bbj-vscode/tsconfig.json, bbj-vscode/eslint.config.js]` (`.cjs` is JS, so `Commands.cjs` leftovers are not caught by tsc; the source-guard tests are what catch them).
**How to avoid:** `npm run build && npm run lint && npm run typecheck:test` after each task; sweep the 10 `denumber: vi.fn()` mock entries.

### Pitfall 5: The deprecated key must not feed the normalizer wrongly
**What goes wrong:** with `default: false` on the old key, `getConfiguration('bbj').get('formatter')` always carries `splitSingleLineIF: false`. Harmless today because the new key (declared with default `false`) always wins, but it hides a real problem: a user whose old key is `true` and whose migration write failed silently loses the behaviour, because the normalizer only uses the legacy key when the new one is `undefined` (`ownValue(source, SPLIT_SINGLE_LINE_IF_KEY) !== undefined` returns first, `bbj-format-settings.ts:87`).
**Why:** VS Code fills in a type default when none is declared (`getDefaultValue`: boolean -> `false`) `[CITED: microsoft/vscode configurationRegistry.ts getDefaultValue]`, so omitting `default` does not give "unset" either.
**How to avoid:** declare the old key as `"type": ["boolean","null"], "default": null` (same pattern as `bbj.home` in this package.json: `["string","null"]`, `default: null`), so it never carries a fake value, and make the migration idempotent so a failed write retries on the next activation, with one warning line in the 'BBj' log.
**Residual window:** `initializationOptions.formatter` is read synchronously at client creation, before the async migration finishes; the migration's own `update()` triggers `onDidChangeConfiguration`, which pushes the corrected object within milliseconds. A format request in that window is only possible at the very start of activation.

### Pitfall 6: A formatter setting change also reloads Java classes (existing behaviour)
**What goes wrong:** not a bug introduced here, but visible in the hand check: `createConfigurationChangeHandler` applies `setFormatterSettings` immediately, then (once the workspace is initialized) continues into `reloadJavaClassesAndRevalidate()` for *any* `bbj` section change. `[VERIFIED: src/language/configuration-change-handler.ts:115-119 and 147-161]`.
**How to avoid:** do not "fix" it in this phase (D-11: verify, don't rebuild). Expect a brief revalidation after changing a formatter setting.

### Pitfall 7: `order` on only some properties may reorder the BBj settings page
**What goes wrong:** none of the existing properties in `contributes.configuration.properties` has `order`; adding `order` to the 15 formatter keys only could move them ahead of or behind the others. `[ASSUMED]` how VS Code sorts mixed ordered/unordered properties.
**How to avoid:** give the 15 keys a stable `order` (suggestion below) and check the Settings UI once in the hand check; adjust if the page looks wrong.

### Pitfall 8: Explorer multi-select passes a second argument
**What goes wrong:** for `explorer/context` commands VS Code passes `(clickedUri, selectedUris[])`. `[ASSUMED]` from VS Code behaviour. The handler must read only the first argument, like `Commands.run`.
**How to avoid:** the handler signature takes one optional `{ fsPath }`; ignore the rest.

### Pitfall 9: `config.bbx` and the Alt+N keybinding
The keybinding in `package.json` has no `when` (`{ "command": "bbj.denumber", "key": "alt+n" }`), so Alt+N on a `config.bbx` (language `bbx-config`) reaches the handler; `resolveRunTarget` rejects it (`isRunnableBbjDocument` requires `languageId === 'bbj'`) and the no-target warning shows. That is the intended D-03/D-04 behaviour; the hand check should include it.

## Code Examples

### The request, exactly as the server declares it
```typescript
// Source: bbj-vscode/src/language/denum-command.ts:27-32 (read this session)
export const DENUM_REQUEST_METHOD = 'bbj/denum';
export interface DenumParams {
    uri: string;
}
```
Result vocabulary (lines 38, 45-47): `export type DenumStatus = 'denumbered' | 'not-line-numbered' | 'failed';` and the reasons list contains `'invalid-params',` `'not-open',` `'tokenized',` `'protected-program',` `'mixed-numbering',` ...

### Registering in the existing slot (extension.ts `registerCompileCommands`)
```typescript
// Source: bbj-vscode/src/extension.ts:541-547 today:
//   context.subscriptions.push(vscode.commands.registerCommand("bbj.denumber", Commands.denumber));
// becomes (same position, same single disposable):
context.subscriptions.push(vscode.commands.registerCommand("bbj.denumber", createDenumberCommand({ /* real deps */ })));
```
`client` is the module-level `let client: LanguageClient` (extension.ts:44); the existing precedent for a lazily bound client is `registerSetOptsInCodeComposer(context, (method, params) => client.sendRequest(method, params))` (extension.ts:468). Import the method constant and types from `./language/denum-command.js`; it brings `vscode-uri` and the language `logger` into the extension bundle (both small, side-effect free). If that is unwanted, import types only and keep the literal in one place; the `denum-notifications.ts` header names "single owner of this method string", so prefer the constant import.

### Migration core (per scope)
```typescript
// Source: design; API facts from vscode.d.ts (inspect fields, update(…, undefined) removes, throws for unregistered/window-to-folder)
const SCOPES = [
    { target: vscode.ConfigurationTarget.Global, pick: (i) => i.globalValue },
    { target: vscode.ConfigurationTarget.Workspace, pick: (i) => i.workspaceValue },
] as const;
const oldI = cfg.inspect<boolean | null>('splitSingleLineIF');
const newI = cfg.inspect<boolean>('splitSingleLineIf');
for (const { target, pick } of SCOPES) {
    const oldValue = pick(oldI ?? {}); const newValue = pick(newI ?? {});
    if (typeof oldValue === 'boolean' && newValue === undefined) {
        await cfg.update('splitSingleLineIf', oldValue, target);   // write the new key first
        await cfg.update('splitSingleLineIF', undefined, target);  // then remove the old key
    }
}
```
where `cfg = vscode.workspace.getConfiguration('bbj.formatter')`. Wrap each scope in its own try/catch so one failing scope does not block the other; log one line per migrated scope (key names and scope only, no values needed).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client spawns `BBjCFCli.jar` with a verified-hash guard and a `javaPath` setting | LS `formatProgram` on BBjServices | Phase 125 (client provider removed, CUT-01 done) | The jar, its guards and the setting are dead code today |
| bbjlst rewrites the file on disk | `bbj/denum` edits the open buffer, leaves it dirty | Phase 126 | Behaviour change goes into the Phase 130 migration note |
| `splitSingleLineIF` | `splitSingleLineIf` | this phase | One-release deprecation alias |

**Deprecated/outdated:** `bbj.formatter.javaPath` (removed here), `bbj.formatter.splitSingleLineIF` (deprecated here), the `Denumber & Replace` prompt wording.

## Q&A: the eight questions

### Q1. Sending `bbj/denum` and the didOpen race (D-01)

**Result shape:** the client sends `{ uri: string }` ( `DenumParams` ) via `client.sendRequest(DENUM_REQUEST_METHOD, { uri })` and does not inspect the `DenumResult` (the server presents everything). The only client message is for a *rejected* request (connection inactive, server crashed): one `showErrorMessage`.

**Ordering analysis — there is no race in the supported configuration, and no retry is needed:**
1. `workspace.onDidOpenTextDocument` is the extension host's `onDidAddDocument`, fired in `onDidAddDocuments`; `ensureDocumentData` (what `openTextDocument` uses) resolves only *after* `$tryOpenDocument` and `assertReturnsDefined(this._documentsAndEditors.getDocument(...))`, i.e. after the add event. `[CITED: microsoft/vscode src/vs/workbench/api/common/extHostDocuments.ts]` The event therefore fires before `openTextDocument` (and so before `showTextDocument`) resolves.
2. vscode-languageclient 10.1.2 sends `didOpen` immediately from that event unless `textSynchronization.delayOpenNotifications` is set. The default is off: `this._delayOpen = client.clientOptions.textSynchronization?.delayOpenNotifications ?? false;` `[VERIFIED: node_modules/vscode-languageclient/lib/common/textSynchronization.js:55]`, and `startLanguageClient` sets no such option `[VERIFIED: src/extension.ts:855-894]`. When delay *is* on, `sendRequest` flushes pending opens itself: `await this._didOpenTextDocumentFeature.sendPendingOpenNotifications();` `[VERIFIED: lib/common/client.js:588]`.
3. `sendNotification` and `sendRequest` both begin with `const connection = await this.$start();` then the same pending-open flush (`client.js:686-688` and `586-588`), so a `didOpen` queued earlier cannot be overtaken by a request issued later (here, strictly later: `showTextDocument` is an RPC round trip). If the client is still starting, both await the same start promise and resume in FIFO order.
4. The server side: `registerDenumRequest(connection, { getTextDocument: (uri) => shared.workspace.TextDocuments?.get(uri), ... })` `[VERIFIED: src/language/main.ts:81-84]` reads the Langium `TextDocuments` store, which is updated synchronously by the `didOpen` notification handler before the next queued message (the request) is processed (`[ASSUMED]` for the exact vscode-jsonrpc dispatch order; it is the same guarantee the format handler relies on).

**Recommendation:** open (`openTextDocument(Uri.file(target))`), show unless already visible, then `sendRequest`. Use `doc.uri.toString()` as the request uri: it is the same string `code2ProtocolConverter.asOpenTextDocumentParams` puts in `didOpen`. **Do not retry on `not-open`**: the server's `execute()` calls `this.fail('not-open', DENUM_NOT_OPEN_MESSAGE)` which shows `'Open the BBj file in the editor first; denumbering works on the open editor text.'` `[VERIFIED: src/language/bbj-denum-service.ts:52-53, 296-298]` on every attempt, so a retry that succeeds would still have shown a warning. The Explorer-on-unopened-file hand check (CUT-03) is the empirical confirmation; if it ever flakes, the fix is a deterministic barrier, not a retry.

`showTextDocument` nuance: calling it on a document already visible in another editor group opens a duplicate tab in the active group; check `visibleTextEditors` first and skip the call when the document is already visible (D-01 only needs the document opened and visible for review). For a document that is not visible, use `{ preview: false }` like the existing prompt code.

### Q2. `splitSingleLineIF` -> `splitSingleLineIf`

- **Case-sensitivity:** VS Code configuration keys are case-sensitive end to end. The settings tree is built with `key.split('.')` and no case folding in `addToValueTree` / `getConfigurationValue` `[CITED: microsoft/vscode src/vs/platform/configuration/common/configuration.ts]`; the registry has no lowercasing and detects duplicates only by exact key (`Cannot register '{0}'. This property is already registered`) `[CITED: configurationRegistry.ts]`. `bbj.formatter.splitSingleLineIF` and `...If` are two distinct declared properties; `inspect()`/`update()` address them independently. The only case-insensitive behaviour is the Settings UI *search box* (irrelevant). No collision.
- **How the LS receives `bbj.formatter`:** three channels, all carrying the whole `bbj` section: `initializationOptions.formatter = getConfiguration("bbj").get("formatter")` (extension.ts:892) read once at client creation; the `didChangeConfiguration` push, built by the trust middleware's `gatedBbjSettings()` (`getConfiguration().get('bbj')`, config-path-trust.ts) because `synchronize.configurationSection: 'bbj'`; and the `workspace/configuration` pull (same middleware). The LS applies it in `createConfigurationChangeHandler` (`if (config.formatter !== undefined) deps.setFormatterSettings(config.formatter)`) and at startup in `bbj-ws-manager.ts:143-145`. `[VERIFIED: files read this session]`
- **Can the deprecated key's default feed the normalizer wrongly?** Yes if it has a `boolean` default: the object always carries the old key too (see Pitfall 5). **Recommendation: the deprecated key keeps no meaningful default: declare `"type": ["boolean","null"], "default": null`.** `normalizeFormatterSettings` ignores a legacy `null` (`usesLegacySplitKey` requires `legacy !== undefined && legacy !== null`), the new key's declared default `false` wins as intended, and VS Code hides a deprecated setting from the UI unless the user configured it `[CITED: contribution-points docs, deprecationMessage]`.
- **Scope of the migration:** the existing formatter keys use `"scope": "window"`; keep `window` for all 15 (no reason found to change: the LS reads one workspace-wide `bbj.formatter` object, so per-folder values could never reach it). A `window`-scoped key cannot exist at workspace-folder scope: `update()` is documented to throw for "window configuration to workspace folder" and for "configuration which is not registered" `[VERIFIED: vscode.d.ts update() @throws list]`. So D-09's "workspace-folder" scope is unreachable for these keys; migrate **Global and Workspace only**. (In a single-folder window, `.vscode/settings.json` *is* the Workspace scope.) Remove the old key with `update(key, undefined, target)` (documented: "To remove a configuration value use `undefined`").
- **Edge cases to test:** old key set and new key set at the same scope (leave both; new wins); old key non-boolean (leave it; the LS reports it by its real name); `update` rejection (dirty settings file, no workspace open): log one warning, do not throw, retry next activation; both scopes set to different values: migrate each independently; second run is a no-op.

### Q3. Enum values, defaults and the pin test

Source of truth for defaults (verbatim):
```typescript
// Source: bbj-vscode/src/language/bbj-format-settings.ts:52-68
export const FORMATTER_DEFAULTS: Readonly<Record<FormatterSettingKey, FormatSettingValue>> = Object.freeze({
    indentWidth: 2,
    indentCharacter: 'SPACE',
    keywordsToUppercase: false,
    removeLineContinuation: false,
    splitSingleLineIf: false,
    splitInlineComments: false,
    splitInlineLabelComment: false,
    collapseMultiLine: false,
    eolCharacter: 'KEEP',
    ifClosingKeyword: 'KEEP',
    ifKeywordCase: 'KEEP',
    parameterLayout: 'KEEP_INITIAL_LAYOUT',
    operatorSpacing: 'KEEP',
    indentLabelBlocks: false,
    blankLineAfterReturn: false
});
```
Allowed values from `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` "Settings reference" lines 127-143 `[VERIFIED: read this session]`:

| Key | Type | Allowed values | bbj-ls default | VS Code default |
|-----|------|----------------|----------------|-----------------|
| `indentWidth` | int | `0` to `16` | `4` | **2** |
| `indentCharacter` | enum | `SPACE`, `TAB` | `SPACE` | `SPACE` |
| `keywordsToUppercase` | boolean | `true`, `false` | `false` | `false` |
| `removeLineContinuation` | boolean | `true`, `false` | `false` | `false` |
| `splitSingleLineIf` | boolean | `true`, `false` | `false` | `false` |
| `splitInlineComments` | boolean | `true`, `false` | `false` | `false` |
| `splitInlineLabelComment` | boolean | `true`, `false` | `false` | `false` |
| `collapseMultiLine` | boolean | `true`, `false` | `false` | `false` |
| `eolCharacter` | enum | `KEEP`, `LF`, `CRLF` | `KEEP` | `KEEP` |
| `ifClosingKeyword` | enum | `KEEP`, `FI`, `ENDIF` | `KEEP` | `KEEP` |
| `ifKeywordCase` | enum | `KEEP`, `MATCH_IF`, `LOWER_CASE`, `UPPER_CASE` | `KEEP` | `KEEP` |
| `parameterLayout` | enum | `KEEP_INITIAL_LAYOUT`, `NO_BLANK`, `BEFORE_COMMA`, `AFTER_COMMA`, `BEFORE_AND_AFTER_COMMA` | `KEEP_INITIAL_LAYOUT` | `KEEP_INITIAL_LAYOUT` |
| `operatorSpacing` | enum | `KEEP`, `SPACED` | `KEEP` | `KEEP` |
| `indentLabelBlocks` | boolean | `true`, `false` | `false` | `false` |
| `blankLineAfterReturn` | boolean | `true`, `false` | `false` | `false` |

Semantics to paraphrase for descriptions (from `FormatOptions.java` Javadoc, read this session): `parameterLayout` = "how commas between method parameters are spaced" (no finer semantics documented, so write the five `enumDescriptions` from the value names: keep as written / no blanks / blank before comma / blank after comma / blank before and after); `operatorSpacing` `SPACED` = exactly one blank on each side of every binary operator outside strings and comments, unary signs and exponent signs untouched; `eolCharacter` `KEEP` writes the input's dominant line ending; `ifClosingKeyword` `KEEP` leaves every existing closer, a closer the splitter generates uses `FI`; `ifKeywordCase` `KEEP` leaves existing keywords, generated ones copy the opening IF's case (`MATCH_IF` rule), `keywordsToUppercase` always wins; `indentLabelBlocks` indents statements between a subroutine label and its closing `RETURN`; `blankLineAfterReturn` puts exactly one blank line after a subroutine's closing `RETURN`; `collapseMultiLine` collapses runs of blank lines to one.

Suggested `order` grouping (stable, gaps left for later keys): indentation `indentWidth` 1, `indentCharacter` 2, `indentLabelBlocks` 3; keywords and IF `keywordsToUppercase` 10, `ifClosingKeyword` 11, `ifKeywordCase` 12, `splitSingleLineIf` 13; layout `removeLineContinuation` 20, `splitInlineComments` 21, `splitInlineLabelComment` 22, `collapseMultiLine` 23, `blankLineAfterReturn` 24, `parameterLayout` 25, `operatorSpacing` 26; line endings `eolCharacter` 30. The deprecated key carries no `order`.

**Pin test (`test/formatter-settings-schema.test.ts`):** read `package.json` (like `activation-command-coverage.test.ts` does) and assert:
1. The `bbj.formatter.*` keys equal `FORMATTER_SETTING_KEYS.map(k => 'bbj.formatter.' + k)` plus exactly one extra: `'bbj.formatter.' + LEGACY_SPLIT_SINGLE_LINE_IF_KEY`; `bbj.formatter.javaPath` is absent (SET-04).
2. For each of the 15: `default` deep-equals `FORMATTER_DEFAULTS[key]`; type is `integer` for `indentWidth` (`minimum` 0, `maximum` 16) and `boolean` for the booleans; `scope` is `window`.
3. For each enum: `enum` equals a **literal table in the test** (copied from the README table above), `default` is in `enum`, `enumDescriptions.length === enum.length`, every description non-empty.
4. The deprecated key: `type` `["boolean","null"]`, `default` null, has `deprecationMessage` and `markdownDeprecationMessage` each mentioning `splitSingleLineIf`.
5. Round trip: `normalizeFormatterSettings(<object built from the package.json defaults, incl. splitSingleLineIF: null>)` equals `FORMATTER_DEFAULTS`.
6. `bbj.denumber.promptOnOpen` description does not contain "replac" (D-05).
Optional extra, skipped when absent: parse the README table from `process.env.BBJ_LS_REPO ?? '/home/coder/repos/bbj-ls'` with `test.skipIf(!fs.existsSync(path))` and compare to the literal table. The sibling repo is not available in CI, so the literal table is the real gate. Do not add exported enum constants to the LS module for this (not needed, keeps the LS untouched).

### Q4. Deletion inventory (CUT-02) — from `git grep` this session

**Delete (tracked):**
- `bbj-vscode/src/document-formatter.ts` (208 lines), `src/formatter-java-resolver.ts` (221), `src/formatter-verifier.ts` (164).
- `bbj-vscode/tools/formatter/BBjCFCli.jar`, `tools/formatter/lib/BBjCodeFomatter.jar`, `tools/formatter/lib/jcommander-1.71.jar`, `tools/formatter/lib/README.md`, `tools/formatter/lib/bom.json` (the whole `tools/formatter/` directory; `git ls-files bbj-vscode/tools` shows these five).
- Tests: `test/document-formatter.test.ts`, `test/formatter-java-resolver.test.ts`, `test/formatter-pins-drift.test.ts`, `test/formatter-verifier-tamper.test.ts`.

**Edit:**
- `test/no-shell-command-construction.test.ts`: line 102 `expect(importers).toEqual(['Commands/process-runner.ts', 'document-formatter.ts', 'language/bbj-cpl-service.ts']);` becomes the two remaining launchers (title "exactly the three known launchers" -> two); delete the seven `document-formatter.ts ...` tests (lines 115-155 incl. the comment blocks) and the doc comment at 94-97. The Commands/process-runner and bbj-cpl-service tests stay. Optionally add the two new modules to `HOST_TS_FILES` so they are scanned for `exec(`/`child_process`.
- `package.json`: remove the `bbj.formatter.javaPath` block (lines 434-439); replace the four old formatter keys (lines 410-433) with the 15; reword `bbj.denumber.promptOnOpen` (lines 404-409).
- `bbj-vscode/README.md` line 13 `* Code Formatting (using BBjCodeFormatter)`: reword to say the language server formats (BBj 26.03 or later). This is an in-`bbj-vscode/` doc; `documentation/` and `QA/` are Phase 130.

**Verified clean (no change needed):**
- `.vscodeignore`: no `tools/formatter` entry. `tools/` ships by default except the three `check-*.mjs` scripts and `tools/interop-test-harness/**`; deleting the directory removes the jar from the VSIX. Baseline `npx vsce ls --no-dependencies` (run this session) lists exactly `tools/formatter/BBjCFCli.jar`, `tools/formatter/lib/BBjCodeFomatter.jar`, `tools/formatter/lib/README.md`, `tools/formatter/lib/bom.json`, `tools/formatter/lib/jcommander-1.71.jar` plus the three kept files `tools/em-login.bbj`, `tools/em-validate-token.bbj`, `tools/web.bbj`. The post-state must keep those three and have no `tools/formatter`.
- `esbuild.mjs`, `vitest.config.ts`, `eslint.config.js`, `tsconfig*.json`, `.github/**` (workflows, `dependabot.yml`), `.gitignore`: no jar or formatter reference (`git grep` for `.jar|jcommander|osv|bom.json|sbom|tools/` over those files returned only the `bbj-vscode/tools/**` path filter in `pr-validation.yml` and the harness/check scripts, which stay).
- `src/extension.ts` does not import `document-formatter.ts` (CUT-01 already done); the formatter-provider mocks in tests (`registerDocumentFormattingEditProvider: vi.fn()`) are used by `extension-activation.test.ts:248` to assert it is *not* called, so leave them.
- IntelliJ: `bbj-intellij/build.gradle.kts` copies only `web.bbj`, `em-login.bbj`, `em-validate-token.bbj` from `bbj-vscode/tools/` (lines 180-185, 215-220); no jar reference anywhere under `bbj-intellij/` (the only "formatter" hit is a comment in `BbjLanguageServerFactory.java:29`). Nothing to change; the absence test can assert it.
- Known stale references left to Phase 130 (do not touch here): `QA/FULL-TEST-CHECKLIST.md` row 25 (`bbj.formatter.javaPath`), `documentation/docs/vscode/{commands,configuration,features}.md`.

**Absence guard (new `test/formatter-removal.test.ts`)** — pins success criterion 4 so the jar cannot come back: the three `src/` files and the four test files do not exist; `tools/formatter` does not exist and no `.jar` exists under `bbj-vscode/tools`; no file under `src/` mentions `document-formatter`, `formatter-java-resolver` or `formatter-verifier`; `package.json` has no `bbj.formatter.javaPath`; `bbj-intellij/build.gradle.kts` has no `tools/formatter`. The test file itself is not scanned (only `src/`).

### Q5. DEN-06: denumber path vs decompile path

Verbatim, `src/Commands/Commands.cjs`:
```javascript
// 429-431
  denumber: function (params) {
    decompile(params, { denumber: true });
  },
// 437-441
  decompileReplace: function (params) {
    const fileName = decompileTargetOrWarn(params);
    if (!fileName) return;
    decompileInPlace(path.resolve(fileName), { denumber: true });
  },
// 468 (inside decompileReadonly)
        const argv = buildDecompileArgv({ home, platform: os.platform(), fileName: tmpInput, denumber: true });
```
`src/Commands/process-args.ts:223-234`:
```typescript
export function buildDecompileArgv(opts: BuildDecompileArgvOptions): Argv {
    const { home, platform = process.platform, fileName, denumber } = opts;
    const args: string[] = [];
    if (denumber) {
        args.push('-l');
        if (fileName.endsWith('.lst')) {
            args.push('-xlst');
        }
    }
    args.push(fileName);
    return { file: bbjlstBin(home, platform), args };
}
```
**Key finding:** *both* decompile commands already pass `denumber: true`; the flag name is a historical misnomer for "emit `-l` (listing without line numbers)". So `denumber: false` is reachable from nowhere in production today.

**Remove (denumber-only):**
- `Commands.denumber` (429-431) and the `const decompile = (params, options = {}) => {...}` helper (186-192) whose only caller is `Commands.denumber`.
- In `decompileInPlace` (198-250): the `options` parameter; `newFileName = options.denumber ? resolvedFileName : resolvedFileName.replace(/\.lst$/, '')` becomes `resolvedFileName`; the title ternary becomes `"Decompiling BBj Program..."`; the branch `if (!options.denumber && resolvedFileName !== newFileName) { unlink }` is already dead and goes; the comment about "denumbering plain text always emits `.lst`" and the `.lst` ternary on `resolvedLstFileName` go (see D-08 / A3 below).
- `buildDecompileArgv`: drop the `denumber` option; always `['-l', fileName]`.
- The doc comment in `runTargetOrWarn` (159-161) mentions Denumber; reword. The comment in `decompile-io.ts:109-112` ("e.g. denumbering line-numbered text") is reworded.
- `Commands.cjs`'s `require("./target-resolution")` and `runTargetOrWarn` stay (Run, Run BUI/DWC, Compile still use them).

**Keep unchanged (decompile):** `decompileReplace`, `decompileReadonly` (including temp dir, `waitForDecompileOutput`, the `wasTokenized`/`canRewriteInPlace` logic, messages "Failed to decompile ..."), `isTokenizedFile`, `deleteLeftoverLst`, `waitForDecompileOutput`, `decompileTargetOrWarn`, the tokenized open prompt and the `bbj.decompile.promptOnOpen` setting.

**Tests that change:**
- `test/command-argv-injection.test.ts:224-245` (`describe('process-args - buildDecompileArgv'`): delete `'no flags when not denumbering'`, `"['-l'] when denumbering a non-.lst input"` (rewrite as "always `-l`"), `"['-l', '-xlst'] when denumbering a .lst input"`; drop `denumber: true` from the metacharacter test.
- `test/commands-cjs-execution.test.ts:381-468` (`describe('Commands.cjs denumber / decompileReplace / decompileReadonly'`): delete `'denumber rewrites the input file in place ...'` (403-417); in `'a decompile whose runProcess rejects ...'` (456-467) call `Commands.decompileReplace` instead of `Commands.denumber`; rename the describe; the `decompileReplace` and `decompileReadonly` tests stay as the decompile proof.
- `test/commands-cjs-harness.ts:155`: drop `denumber: (params: RunTargetParams) => void;` from `CommandsModule`.
- `test/target-resolution.test.ts:155-169`: delete `'const decompile = resolves its target via runTargetOrWarn before calling getBBjHome'` (anchors on `'const decompile = (params, options = {}) => {'`).
- `test/decompile-io.test.ts:317-343`: the guard anchors on `'const decompileInPlace = (resolvedFileName, options = {}) => {'`; update the anchor to the new signature, keep the "deleteLeftoverLst before execWithProgress inside try" assertions (they still describe the decompile flow).
- 10 `denumber: vi.fn()` entries in the `Commands.cjs` mocks (`activation-command-coverage`, `activation-prompts-and-status-bars`, `config-file-association`, `config-reload-host`, `em-auth-error-paths`, `em-login-username`, `em-token-expiry-wiring`, `extension-activation`, `extension-config-trust`, `stale-output-channel-repro`): remove (dead entries; also satisfies "nothing named denumber on the bbjlst path").
- New absence assertions (in `formatter-removal.test.ts` or the existing source-guard style): `Commands.cjs` and `process-args.ts` contain no `/denumber/i`; `extension.ts` does not reference `Commands.denumber`.
- Unchanged and still valid: `test/bbj-home-layout.test.ts` bbjlst tests and the `cpl-fixture-lst-bbjhome/bin/bbjlst` fixture (decompile still resolves `bbjlst`), `decompile-io.test.ts` function tests, `em-secret-env-channel.test.ts` (mentions `buildDecompileArgv` in a comment only).

### Q6. Open-file prompt and command-registration tests

- `test/activation-prompts-and-status-bars.test.ts:298-319`: the test `'shows once for the active editor; ... Denumber & Replace runs bbj.denumber'` pins `'Denumber & Replace'` (lines 306, 312) and the text `... is a line-numbered BBj program. Denumber it to editable source, or open it read-only?` (line 311). Update to the new button/text; keep the assertion `executeCommand` called with `('bbj.denumber', doc.uri)` (D-05: the prompt keeps routing through the command so one path exists). **Gap:** the `Open Read-only` branch (`showTextDocument` then `workbench.action.files.setActiveEditorReadonlyInSession`) is currently untested for the line-numbered prompt; add one test (D-07). The source line `src/open-file-prompts.ts:92` holds `const denumberAction = 'Denumber & Replace';` and 95-96 the prompt; the comment at line 99 ("bbj.denumber runs bbjlst and replaces the file in place") must be rewritten.
- `test/activation-command-coverage.test.ts`: still must see `registerCommand('bbj.denumber')` in the same trace slot; no literal change if Pitfall 2 is honoured. Its test "activate() registers no command id that package.json does not contribute" and "every contributed command is registered" keep guarding the id.
- `test/extension-activation.test.ts`: no change expected (it already asserts no client-side formatting provider and the DENUM notification handlers).
- New `test/denumber-command.test.ts` (DI stubs, no vscode mock): no target -> `warn(NO_ACTIVE_BBJ_FILE_MESSAGE)` and no request; call order for an unopened Explorer file is open -> show -> send with `{ uri: doc.uri.toString() }`; already visible -> no `show`; argument `fsPath` wins over the active editor; a `failed` result sends no client message; a rejected request -> exactly one error; multi-arg call ignores the second argument. Plus a package.json pin: command `bbj.denumber` keeps `title` `"Denumber BBj Program"`, the keybinding `alt+n`, and the three menu entries (explorer/context, editor/context, editor/title) with their `when` clauses unchanged.
- `bbj.denumber.promptOnOpen` description (package.json:407 today: `"When opening a line-numbered BBj program, prompt to denumber it (replacing the file with editable source) or open it read-only."`) becomes e.g. `"When opening a line-numbered BBj program, prompt to denumber it for editing or open it read-only."`; pinned by the schema test (no "replac").

### Q7. CUT-03 hand check — draft step list

Standing rules: build the VSIX (and, per the standing UAT rule, the IntelliJ zip) from the final tree after code-review fixes; live BBj 26.03 BBjServices. Environment facts verified this session: `127.0.0.1:5008` is listening, `127.0.0.1:13338` (ext-test code-server) is listening, `/usr/local/bin/bbj-ext-install` exists, and the shipped `/opt/bbx/.lib/bbjls/bbj-ls.jar` (Oct 2 00:37) contains `bbj/interop/FormatWorker$PendingWork.class` and `bbj/interop/denum/DenumResult*.class`, so the live peer serves format and denum.

A. Build and static proof (agent can do these)
1. On the final tree: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, then `npm run lint`, `npm run typecheck:test`, the full vitest suite (judge on `numFailedTests`), and `bbj-ext-install` (packages `/tmp/bbj-lang.vsix` with `vsce package --no-dependencies`, force-installs into `~/.ext-test`). Optionally `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew buildPlugin --console=plain -q` (not changed by this phase; regression sanity per the standing rule).
2. VSIX content: `unzip -l /tmp/bbj-lang.vsix` shows no `.jar` and no `tools/formatter`, and still shows `tools/web.bbj`, `tools/em-login.bbj`, `tools/em-validate-token.bbj`, `out/extension.cjs`, `out/language/main.cjs` (success criterion 4). Compare with the baseline file list in Q4.
3. Live peer sanity: `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept` from `bbj-vscode/` (the Phase 126 live file).

B. Settings (user, in the ext-test code-server or the user's own VS Code with the same VSIX)
4. Settings UI, search `bbj.formatter`: 15 controls (an integer input for `indentWidth` that rejects 17, checkboxes, enum dropdowns with a description per value), no `javaPath`, and no `splitSingleLineIF` entry unless set. Check the group order looks sane (Pitfall 7).
5. Migration: before opening the folder, put `"bbj.formatter.splitSingleLineIF": true` in the user `settings.json` and a different value in the workspace `.vscode/settings.json`; load/reload the window. Expect each file to now hold `splitSingleLineIf` with the same value and no `splitSingleLineIF`, one info line per migrated scope in the 'BBj' output channel, no popup, and Format Document splits a single-line IF in an affected file. Add `"bbj.formatter.javaPath": "/x"`: shown as an unknown setting, no error, formatting unaffected.
6. No restart: change `indentWidth` to 4 (and toggle one more key); the next Format Document uses it without reloading.

C. Format
7. Format Document and Format Selection on an unnumbered file: result is the bbj-ls output; a second format on the already-formatted file changes nothing and leaves the buffer clean. Format-on-save (`"editor.formatOnSave": true`) formats and saves without delay.
8. Numbered file: open one (e.g. a `0010 ...` program). The prompt appears with **Denumber** and **Open Read-only** (no "Replace"). Format Document shows the server's offer (Denumber / Denumber and Format).

D. Denumber
9. Denumber via: the prompt button; Alt+N; the editor title icon; the editor context menu; and **Explorer right-click on a numbered file that is not open** (file opens, then denumbers). Each leaves the buffer dirty (tab dot), the file on disk unchanged (`cat` it), and one Ctrl+Z restores the numbered text. Unsaved edits typed before invoking are included in the result.
10. Denumber and Format (from the offer): one undo step.
11. Unnumbered file: server says nothing to do. Mixed numbering: message names the line. **Phase 126 UAT test 7 carry-over:** tokenized program -> the server message points to Decompile; protected program -> says so (needs a fixture; if no protected fixture exists, record "not reachable" explicitly). `config.bbx`: no menu entry, and Alt+N shows "No active BBj file..." (D-03/D-04).
12. No target: close all editors, run "Denumber BBj Program" from the Command Palette -> the no-active-file warning, and no `bbj/denum` request in the LS log.
13. Denumber no longer needs bbjlst: nothing named `bbjlst` is launched during denumber (watch with `pgrep -a bbjlst` while it runs, or compare the 'BBj' output); it works with BBjServices up and does not depend on `bbj.home` for the bbjlst path.

E. Decompile still works (DEN-06)
14. With a tokenized program (produce one with the extension's Compile command or `/opt/bbx/bin/bbjcpl`; `[ASSUMED]` exact flags): the tokenized open prompt offers Decompile & Replace / Open Read-only; both Decompile commands produce unnumbered source exactly as before.

F. Record results in `127-UAT.md` via `/gsd-verify-work`; re-run B-E from a VSIX rebuilt after any code-review fix.

### Q8. Validation Architecture
See the dedicated section below.

## Don't re-derive: facts about the current code the planner will touch

- `extension.ts` imports `NO_ACTIVE_BBJ_FILE_MESSAGE, resolveRunTarget, toActiveEditorSnapshot` already (line 39) and uses them in the Run BUI/DWC wrappers; the denumber handler reuses them (D-04).
- `registerOpenFilePrompts(context)` is called from `activate()` after `registerDenumDiagnosticsOutput` (extension.ts:497); `maybePromptLineNumbered` guards on `doc.languageId !== 'bbj' || doc.uri.scheme !== 'file'`, the setting `denumber.promptOnOpen`, a per-session `promptedLineNumberedDocs` set, and `isLineNumberedSource(doc.getText())`; only the button/text/comment change.
- `bbj.denumber` is declared in `contributes.commands` without a `category` (lines 157-165), while its neighbours have `"category": "BBj"`; leave as is (menus unchanged, D-03).
- The three menu clauses and the dead `resourceLangId == bbx` branch are identical across the 3 menus + the keybinding block; D-03 says leaving them is fine.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | vscode-jsonrpc/Langium process the `didOpen` notification (store update) before the next queued request's handler runs, so `TextDocuments.get` sees the document | Q1 | A rare `not-open` on a freshly opened document; hand check Explorer-unopened case is the empirical test |
| A2 | VS Code sorts settings with `order` ahead of settings without it in the extension's group | Pitfall 7 | Formatter keys appear at the top/bottom of the BBj settings page; cosmetic, checked in hand check |
| A3 | Dropping `-xlst` (D-08) only affects a *tokenized* program that is named `*.lst`, which is not a realistic decompile input (Decompile has no menu entry; the tokenized prompt is content-based); bbjlst's exact output naming for a `.lst`-named input with `-l` and no `-xlst` was not probed | Q5 | A tokenized `*.lst` file would decompile to a different output path than before; confirm with the user if desired (Open Question 1) |
| A4 | For `explorer/context` commands VS Code passes `(clickedUri, selectedUris[])` | Pitfall 8 | Multi-select would still only denumber the clicked file; no failure either way |
| A5 | A tokenized hand-check fixture can be produced with `bbjcpl` or the extension's Compile command | Q7 step 14 | The tester needs another way to get a tokenized file; no code impact |
| A6 | Using `Uri.file(fsPath)` for the target matches the document's own uri representation on every platform | Q1 | Mitigated by sending `doc.uri.toString()` (the opened document's own URI), not the constructed one |

## Open Questions

1. **`-xlst` for a tokenized program named `*.lst`**
   - What we know: D-08 removes `-xlst` handling as part of the denumber branch; `-xlst` is emitted only when the input name ends in `.lst`; both decompile commands pass through it today.
   - What's unclear: bbjlst's output naming for `a.lst` with `-l` alone (not probed).
   - Recommendation: follow D-08 literally (drop `-xlst` and the `.lst` special case; always `<input>.lst` as the listing path). The affected input is essentially nonexistent. If the user wants zero decompile-behaviour risk, keep the `.lst` -> `-xlst` rule under a neutral name instead; either way no "denumber" name remains.
   - **RESOLVED (orchestrator, CONTEXT D-08 updated):** keep the `.lst` -> `-xlst` rule in `buildDecompileArgv`; decompile behaviour stays unchanged. Only the `denumber` option is folded away (always `-l`).
2. **Remove the dead menu clause `resourceLangId == bbx`?**
   - D-03 leaves it to the planner. Recommendation: leave it (menus byte-identical keeps the "same menus" success criterion trivially true and `target-resolution.ts` documents it).
3. **Should the migration also harden the client against a failed write?**
   - D-09 locks the migration approach. A client-side shim in the settings middleware would make behaviour survive a failed write, but adds code in `config-path-trust.ts`. Recommendation: not in this phase; log a warning and retry next activation (Pitfall 5).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm + vitest | all unit tests | yes | Node 22 required (memory: Node 24 breaks `langium generate`; build/test do not generate) | — |
| `npx vsce` | VSIX list/package | yes (ran `vsce ls` this session, exit 0) | existing | — |
| Live BBjServices with bbj-ls (format + denum) | CUT-03 and `program-live.test.ts` | yes: `127.0.0.1:5008` listening; jar contains `FormatWorker` and `denum/DenumResult*` classes | BBj 26.03 per milestone; exact version not probed (`/opt/bbx/bin/bbj -v` rejects the option) | — |
| ext-test VS Code (code-server) | install-from-VSIX check | yes: `127.0.0.1:13338` listening; `bbj-ext-install` and `code-server-test` exist | — | User's own macOS VS Code with the same VSIX |
| `/opt/bbx/bin/bbjlst`, `bbjcpl` | decompile hand check | yes (present in `/opt/bbx/bin`) | — | — |
| IntelliJ Gradle build | optional regression zip | `[ASSUMED]` available (not probed) | — | Skip; phase does not touch `bbj-intellij/` |

**Missing dependencies with no fallback:** none found.
**Missing dependencies with fallback:** a protected-program fixture for the Phase 126 carry-over check was not looked for; if absent, record it as "not reachable" in the UAT.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 (bbj-vscode), ESLint, `tsc --noEmit` via `npm run typecheck:test` |
| Config file | `bbj-vscode/vitest.config.ts` (`include: ['test/**/*.test.ts']`) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/denumber-command.test.ts test/settings-migration.test.ts test/formatter-settings-schema.test.ts test/formatter-removal.test.ts test/activation-prompts-and-status-bars.test.ts test/activation-command-coverage.test.ts test/extension-activation.test.ts test/command-argv-injection.test.ts test/commands-cjs-execution.test.ts test/target-resolution.test.ts test/decompile-io.test.ts test/no-shell-command-construction.test.ts && npm run typecheck:test` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2 && npm run lint && npm run typecheck:test && npm run build` (judge on `numFailedTests`; "failed suites" with 0 failed tests are beforeAll hook timeouts under contention) |

cwd must be `bbj-vscode` (several suites read fixtures relative to it); never `--reporter=basic` (not in vitest 4.1.10); do not run whole-suite runs in the background.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SET-01 | 15 keys, typed schema, defaults == `FORMATTER_DEFAULTS`, enums == bbj-ls values, descriptions per enum value, `indentWidth` integer 0-16 | unit (reads package.json) | `npx vitest run test/formatter-settings-schema.test.ts` | Wave 0 (new) |
| SET-01 | Settings apply without restart | unit (existing) + hand check | `npx vitest run test/configuration-change-handler.test.ts` | exists (formatter settings describe at line 137) |
| SET-03 | Old key migrated per scope, new key untouched when set, idempotent, failure tolerant, one log line; deprecated key shape | unit | `npx vitest run test/settings-migration.test.ts test/formatter-settings-schema.test.ts` | Wave 0 (new) |
| SET-03 | Normalizer keeps legacy backstop | unit (existing) | `npx vitest run test/bbj-format-settings.test.ts` | exists |
| SET-04 | `javaPath` absent from package.json | unit | `npx vitest run test/formatter-settings-schema.test.ts test/formatter-removal.test.ts` | Wave 0 (new) |
| DEN-02 | Command: guard, open->show->send order, visible skip, no client wording, one error on reject; id/title/keybinding/menus pinned | unit | `npx vitest run test/denumber-command.test.ts test/activation-command-coverage.test.ts` | Wave 0 (new) + exists |
| DEN-05 | Prompt text/button, routes via `bbj.denumber`, Open Read-only branch, description reworded | unit | `npx vitest run test/activation-prompts-and-status-bars.test.ts test/formatter-settings-schema.test.ts` | exists (edit) + new case |
| DEN-06 | No denumber on the bbjlst path; decompile still builds `-l` argv and runs | unit + source guard | `npx vitest run test/command-argv-injection.test.ts test/commands-cjs-execution.test.ts test/target-resolution.test.ts test/decompile-io.test.ts test/formatter-removal.test.ts` | exists (edit) + new asserts |
| CUT-02 | Files gone, no `.jar` under tools, no src references, launcher set narrowed to two, `javaPath` gone | unit (fs absence) | `npx vitest run test/formatter-removal.test.ts test/no-shell-command-construction.test.ts` | Wave 0 (new) + exists (edit) |
| CUT-02 | VSIX has no jar/`tools/formatter`, keeps the three scripts | gate (command) | `unzip -l /tmp/bbj-lang.vsix` after `bbj-ext-install`, or `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vsce ls --no-dependencies` | n/a (command) |
| CUT-03 | Format + DENUM end to end from the built VSIX on live BBj 26.03 | manual-only (needs GUI + live BBjServices) | hand check steps in Q7; automated companion: `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept` | exists |

### Sampling Rate
- **Per task commit:** the task's test files plus `npm run typecheck:test`.
- **Per wave merge:** the quick run command plus `npm run lint` and `npm run build`.
- **Phase gate:** full suite green on `numFailedTests` (baseline is 0 failed tests; only `installed-extension-e2e` fails when the installed bundle is stale, memory "whole-suite baseline"), lint, typecheck, build, VSIX content check, then the hand check from a VSIX built from the final tree.

### Wave 0 Gaps
- [ ] `test/formatter-settings-schema.test.ts` — SET-01, SET-03 (shape), SET-04, DEN-05 (description)
- [ ] `test/settings-migration.test.ts` — SET-03 (fake `WorkspaceConfiguration` with `inspect`/`update`)
- [ ] `test/denumber-command.test.ts` — DEN-02
- [ ] `test/formatter-removal.test.ts` — CUT-02, DEN-06 absence asserts
- [ ] Mock sweep in 10 activation-style test files (remove `denumber: vi.fn()`); a client double with `sendRequest` only in the new command test
- [ ] Framework install: none

### Plan-structure hints (ordering constraints the planner must respect)
1. The `package.json` `javaPath` removal ships with (or after) the deletion sweep (Pitfall 3).
2. The new `bbj.denumber` registration must land before or with the removal of `Commands.denumber` (else the command is registered against `undefined` at runtime; mocked tests would not notice).
3. Tests that import a deleted module must be deleted in the same commit as the module (else vitest and `typecheck:test` fail mid-sequence).
4. Both the denumber-command plan and the Commands.cjs removal plan edit the activation test mocks (and `activation-prompts-and-status-bars.test.ts`); run them sequentially.

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json`, so this section applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes (workspace trust) | Migration writes only boolean values between two keys of the same file and scope; it never reads or writes `bbj.configPath` or other trust-gated settings; failures are caught and logged |
| V5 Input Validation | yes | The command argument is validated by `resolveRunTarget` (string `fsPath` or active editor); only `doc.uri.toString()` of an opened document is sent; migration accepts `typeof === 'boolean'` only; the LS validates `uri` and the DENUM result (Phase 124/126) |
| V6 Cryptography | no | Removing the SHA-256 jar verifier is correct because the jar is removed, not bypassed |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Another extension or a keybinding invokes `bbj.denumber` with a hostile argument | Tampering | Only a string `fsPath` is used; target goes through `openTextDocument`; the server re-checks language id and open state; nothing becomes a shell command |
| Shell/process injection from new code | Elevation of privilege | New modules import no `child_process`; `no-shell-command-construction.test.ts` keeps the launcher set pinned (narrowed to `Commands/process-runner.ts` and `language/bbj-cpl-service.ts`) |
| Peer-supplied text reaching UI | Tampering / Spoofing | Unchanged: the client shows no peer text for `bbj/denum`; the server bounds and escapes (Phase 124/126); the DENUM diagnostics handler keeps its "payload never becomes a command, link or path" rule |
| Workspace settings written by a cloned repo's `.vscode/settings.json` | Tampering | The migration only *moves* an existing boolean inside the same file and scope; it adds no new trust decision |
| Removing a vendored, hash-pinned binary | Supply chain | Positive: three jars leave the VSIX; the `bom.json`/pin tests go with them |

## Project Constraints (from CLAUDE.md)

- All commands run from `bbj-vscode/`; tests are Vitest with Langium `EmptyFileSystem`; `createBBjTestServices` is the default entry for new LS tests (not needed here: this phase's tests are client-side pure/DI tests).
- Never edit generated files (`src/language/generated/`); no grammar change here, so no `langium:generate`.
- CI gates a PR must pass: `npm run build`, `npm run lint`, `npm run typecheck:test`, `npm test`, VSIX package; plus the three workflow-hygiene checkers if any workflow file changes (none is expected to).
- Shell and file-access rules: use absolute paths, never chain `cd` with grep/find/cat/sed/head/tail (the one allowed `cd` form is in front of a build tool), no blind recursive scans, never read `.env*`, `*.pem`, `*.key`, stage with `git add <exact path>` only.
- Language is case-insensitive (BBj); settings keys here are the opposite (case-sensitive JSON keys); keep the two apart when writing tests.
- No planning ids (D-xx, plan or phase numbers) in source or test files; issue numbers are fine (memory "register-check the source diff").
- Do not use `git stash` in executor prompts; do not `--reporter=basic`; run tests in the foreground and `pgrep -af vitest` afterwards.
- Commits: plain `git` with both trailers in one `-m` paragraph if the `gsd_run query commit` helper is used (it omits trailers); this agent does not commit.

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `.planning/phases/127-vs-code-cut-over/127-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (Phase 127 and "Where each phase works"), `.planning/config.json`, `bbj-vscode/package.json`, `src/extension.ts`, `src/open-file-prompts.ts`, `src/Commands/Commands.cjs`, `src/Commands/process-args.ts`, `src/Commands/target-resolution.ts`, `src/decompile-io.ts`, `src/line-numbering.ts`, `src/config-path-trust.ts`, `src/language/denum-command.ts`, `src/language/bbj-format-settings.ts`, `src/language/configuration-change-handler.ts`, `src/language/main.ts`, `src/language/bbj-denum-service.ts` (execute and not-open), the listed test files, `bbj-intellij/build.gradle.kts` (copy tasks), `.vscodeignore`, `esbuild.mjs`, `eslint.config.js`, `tsconfig.json`, `.github/**` (grep), `QA` and `documentation` (grep only).
- `bbj-vscode/node_modules/vscode-languageclient/lib/common/{client.js,textSynchronization.js,features.js}` (installed 10.1.2): sendRequest/sendNotification chains, didOpen feature, `delayOpenNotifications`.
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` "Settings reference" and `FormatOptions.java` Javadoc.
- `vscode.d.ts` (microsoft/vscode `src/vscode-dts/vscode.d.ts`, fetched into the scratchpad): `WorkspaceConfiguration.inspect` fields and `update()` `@throws` list.
- `npx vsce ls --no-dependencies` (run this session): baseline VSIX file list.

### Secondary (MEDIUM confidence)
- microsoft/vscode `configuration.ts` (value-tree key handling), `configurationRegistry.ts` (`getDefaultValue`, duplicate detection, deprecation fallback), `extHostDocuments.ts` (add-event timing), fetched via WebFetch and summarized.
- https://code.visualstudio.com/api/references/contribution-points (scope values, `deprecationMessage`, `enumDescriptions`, `order`, `markdownDescription`).

### Tertiary (LOW confidence)
- Training knowledge for the `[ASSUMED]` items in the Assumptions Log (settings ordering, explorer multi-select arguments, bbjlst `.lst` naming, tokenized-fixture production).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; versions read from installed files.
- Architecture: HIGH — every file to touch was read; ordering claims backed by installed library source plus VS Code source.
- Pitfalls: HIGH for the mock/pin/ordering pitfalls (verified in files); MEDIUM for settings-UI ordering (A2).
- Hand check: MEDIUM — step list is a draft; fixtures for tokenized/protected programs were not located.

**Research date:** 2026-10-03
**Valid until:** 2026-11-02 (stable; revisit if `vscode-languageclient` or the bbj-ls README settings table changes)
