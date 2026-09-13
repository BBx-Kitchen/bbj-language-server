# Phase 92: Host-Side Hygiene & Focus Guards - Research

**Researched:** 2026-09-13
**Domain:** VS Code extension host lifecycle/IPC hygiene (decompile I/O, format-request races,
command dispatch guards, activation disposal) plus one IntelliJ status-bar reactivity fix.
**Confidence:** HIGH (every claim below is grounded in a file read this session; the one place the
evidence runs out — what `bbjlst` actually writes for `-l -xlst` — is called out explicitly as
unverifiable in this environment, not glossed over).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Five small, independent host-side fixes. No language-server logic changes; four touch the VS Code
extension (`bbj-vscode/src/`, outside `src/language/`), one touches the IntelliJ plugin.

**Decompile freshness (RESP-05, #500)**
- **D-01:** Delete the leftover first. Immediately before `decompileInPlace` runs bbjlst, remove
  any existing `<input>.lst` — exactly the path `waitForDecompileOutput` watches. A missing file
  (`ENOENT`) is the normal case and proceeds. After the delete, any `.lst` that appears is provably
  this run's output.
- **D-02:** Drop the mtime comparison. `waitForDecompileOutput` no longer checks
  `lstStat.mtimeMs >= callStartMs`; a `.lst` is accepted once its size settles across two polls. No
  slack constant is introduced anywhere. `decompileReadonly` already runs bbjlst in a fresh
  `mkdtemp` directory, needs no delete step, and inherits D-02 through the shared wait.
- **D-03:** Fail closed when the leftover can't be removed. If `<input>.lst` exists and deleting
  it fails with anything other than `ENOENT` (permissions, a Windows file lock), do not run bbjlst.
  Show the existing `Failed to decompile "<file>": …` error naming the leftover `.lst` and the
  reason. Stale output is never served, and there is no fallback to the old mtime check.
- **D-04:** The existing `P62-D2-011` test ("stale `.lst` of matching size is never mistaken for
  fresh output") exercises `waitForDecompileOutput` alone with a stale file present before the wait.
  Under D-02 that guarantee moves to the delete step, so the test must be reworked to cover
  delete-then-wait. It must not be deleted, and it must not be weakened into passing vacuously.

**No-editor guard (RESP-07, #512)**
- **D-05:** Passed file first. `run`, `runBUI`/`runDWC` (`runWeb`), `compile` and `denumber`
  (via `decompile()`) resolve their target in the order `resolveTargetFileName` already uses: the
  argument's `fsPath` (Explorer right-click, editor title, editor context menu), then the active
  editor, then the warning (D-07). This also fixes right-clicking file B in the Explorer while A is
  focused running A.
- **D-06:** A non-BBj active editor counts as "no active BBj file." The active-editor fallback
  only accepts an editor that the command's own menu `when` clause would accept. For run, runBUI,
  runDWC, compile and denumber that is `(resourceLangId == bbj && resourceExtname != .bbjt) ||
  resourceLangId == bbx`, so a focused `.txt`, `settings.json` or `bbx-config` document gets the
  warning instead of being handed to bbj. A passed argument is used as-is, with no language check:
  decompile's tokenized binaries open in non-text editors, and the menus already filtered the
  argument.
- **D-07:** One shared warning for all seven commands. `vscode.window.showWarningMessage` with one
  shared string (wording is Claude's discretion) for `bbj.run`, `bbj.runBUI`, `bbj.runDWC`,
  `bbj.compile`, `bbj.denumber`, `bbj.decompile` and `bbj.decompileReadonly`. The two Decompile
  commands' current silent `return` gets the same warning. No command throws when `params` is
  `undefined` and no editor is focused.

**Format race (RESP-06, #499)**
- **D-08:** Share an in-flight format only for identical text. A request reuses the in-flight
  format for its URI only when its freshly read `documentContent` is identical to the text that run
  was started with. On a mismatch it starts a fresh `runFormatter` against the current text. The
  "Save All" one-spawn dedupe (`P62-D3-001` tests) stays valid for identical content, and the
  existing map-identity cleanup guard stays. The "accept and document the risk" option was
  rejected — ROADMAP criterion 2 says a stale result is never applied.

**Re-activation cleanup (RESP-08, #531) — not discussed; recorded default, confirmed at wrap-up**
- **D-09:** Every `Disposable` returned inside `activate()` is pushed onto `context.subscriptions`,
  matching the file's existing push pattern: all `vscode.commands.registerCommand(...)` calls,
  `registerDocumentFormattingEditProvider`, and every `client.onNotification(...)` in `activate()`.
  The issue counted one notification handler, but the file now has at least three:
  `bbj/bbjcplAvailability`, `CONFIG_RELOAD_METHOD` and `RESOLVED_CONFIG_PATH_METHOD`. Pushing
  notification disposables does not break Phase 85's restart gate, which reuses the same client
  instance, so handlers are disposed only on deactivation, never on restart.
- **D-10:** Regression test extends `bbj-vscode/test/extension-activation.test.ts`'s mocked harness.
  `registerCommand` throws `command 'X' already exists` for an id still registered and undisposed.
  The test runs `activate()`, disposes `context.subscriptions`, then runs `activate()` again and
  asserts nothing throws.

**Status-bar widgets (RESP-09, #610)**
- **D-11:** Both widgets subscribe to `FileEditorManagerListener.FILE_EDITOR_MANAGER` on their
  existing `messageBusConnection`, which `dispose()` already disconnects, and call
  `updateVisibility()` on `selectionChanged`. The status-bus trigger stays.
- **D-12:** Visibility is decided by file type, never by extension. The widgets are visible iff a
  selected file's file type is the plugin's BBj file type (`BbjFileType`, registered for
  `bbj;bbjt;src;bbx`). One shared decision serves both widgets, replacing their two hard-coded
  extension lists. Consequences: ordinary `.bbx` programs now show the widgets (added); `.bbl` no
  longer shows them, since it is not a BBj file type in IntelliJ and the server never serves it; the
  config file hides them, whatever its name — `config.bbx`/`config.min` and any custom configured
  config file get `BbjConfigFileType` through `BbjConfigFileTypeOverrider`. An extension check
  containing `"bbx"` would wrongly count it.
- **D-13:** Proof = plain JUnit + one live check. A plain-JUnit test of the file-type decision
  covers: a BBj `.bbj`/`.bbx` program shows; `config.bbx`, a custom-named config file, `.bbl` and a
  non-BBj file hide. A source guard asserts both widgets subscribe `FILE_EDITOR_MANAGER` on
  `messageBusConnection` and route to the shared visibility decision (never "recorded manual
  verification" alone). One live UAT step in IntelliJ: with no server-status change, switch BBj tab
  → non-BBj tab → `config.bbx` → BBj tab; the widgets follow each switch immediately.

### Claude's Discretion
- **#500:** where the delete lives (e.g. a small exported helper in `decompile-io.ts` called by
  `decompileInPlace`, so it is unit-testable), and the test mechanics. Tests must not depend on the
  host filesystem's real mtime granularity: for example, backdate a fresh `.lst` with `fs.utimesSync`
  to before the call start and assert prompt resolution, plus an injected failing unlink for D-03.
- **#512:** exact warning text; whether the check runs before `getBBjHome()`; the per-command
  active-editor rule for the two Decompile commands (which accept tokenized files and `.bbjt`); the
  regression-test shape. The issue's minimum: each handler invoked with `params: undefined` and no
  active editor does not throw and shows the warning. Also cover the non-BBj-editor case (D-06) and
  argument-over-editor precedence (D-05).
- **#499:** in-flight map shape (URI → `{content, promise}`, or a URI+content key) and whether the
  newer run replaces the entry. Required test: two overlapping requests for one URI with different
  content spawn twice, and each resolves with its own output.
- **#531:** whether anything beyond `activate()`'s direct registrations needs disposal. Candidates:
  `document-formatter.ts`'s import-time `onDidChangeTextDocument`/`onDidCloseTextDocument` listeners,
  and module-level `client`/`restartGate` state. Only in scope if the D-10 double-activate test shows
  a failure; otherwise leave them.
- **#610:** seam shape, e.g. the static-helper-plus-thin-wrapper idiom from 84-04 (a pure predicate
  over file types, testable without a live IntelliJ Application); keeping `updateVisibility()` on the
  EDT.
- **UAT scope beyond D-13:** the VS Code live checks are suggestions, not locked:
  - Alt+G / palette Compile with no editor focused and with a `.txt` focused shows the warning.
  - Explorer right-click Run on a file other than the focused one runs that file.
  - The coarse-mtime decompile, the format race and double activation are proven by automated tests
    only. A VS Code window reload starts a fresh extension host, so it does not reproduce #531 by
    hand.

### Deferred Ideas (OUT OF SCOPE)
- Other hard-coded BBj extension lists in the IntelliJ plugin drift the same way the widgets did:
  `BbjRunActionBase` counts `.bbl`, and any `.bbx` including `config.bbx`; `BbjRestartServerAction`
  and `BbjServerCrashNotificationProvider` omit `.bbx`. The same file-type check (D-12) could
  replace them. Not in scope.
- `when` clauses on the alt+g/b/d/c/n keybindings so they only fire in BBj editors, freeing those
  keys elsewhere. D-07's warning already covers the no-editor case.
- Four reviewed todos (test-hygiene / unrelated IntelliJ Node.js path items) explicitly kept out to
  keep the milestone lean — see `92-CONTEXT.md`'s Deferred Ideas for the full list.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| RESP-05 (#500) | User's decompile completes promptly on coarse-mtime filesystems and never spins the 20-second timeout on output that is already fresh | Pitfall 1 (delete-target computation and its safety proof); Pitfall 3 (why the fix's testable core must live in `decompile-io.ts`, not `Commands.cjs`); Code Examples (delete-then-wait helper shape, mtime-clause removal); Validation Architecture row 1–2 |
| RESP-06 (#499) | User's format request never applies content computed from an earlier in-flight request over interim edits | Architecture diagram (format-race flow); Code Examples (D-08 content-comparison shape); Validation Architecture row 3 |
| RESP-07 (#512) | User invoking Run, Compile, Decompile or Denumber with no editor focused sees a graceful "no active BBj file" message instead of an error | Pitfall 2 (`resourceLangId == bbx` is dead — confirms D-06's exact check); Pitfall 3 (why D-05/D-06/D-07 need an extracted pure module); Validation Architecture row 4 |
| RESP-08 (#531) | User's VS Code extension survives a second activation in the same host: every command, provider and notification registration is disposed | Full enumeration of every unguarded `activate()` registration (Summary, Architecture diagram); Pitfall 4 (why only `registerCommand` can be proven by a throw-based test); Code Examples (D-10 mock extension); Validation Architecture row 5 |
| RESP-09 (#610) | User sees the IntelliJ status-bar widgets show and hide on a bare editor-tab switch, not only on a server-status change | Don't Hand-Roll table (platform `FileType`/`FileTypeOverrider` already does this); Pitfall 5 (plain-JUnit seam shape, no live `FileType`/`VirtualFile` construction); Pitfall 6 (EDT already guaranteed, no extra `invokeLater` needed); Validation Architecture rows 6–7 |

</phase_requirements>

## Summary

All five fixes are single-file, mechanical, and already fully specified by 92-CONTEXT.md's D-01
through D-13. This research's job was narrower: confirm the six things CONTEXT.md flagged as
"Claude's Discretion → Research items" with file:line evidence, and surface one structural fact the
planner needs before writing tasks — **`bbj-vscode/src/Commands/Commands.cjs` is a native
CommonJS file that cannot be loaded under Vitest** (`vi.mock('vscode')` never reaches its
`require()`; this is documented in the existing `no-shell-command-construction.test.ts` and is why
that file's own regression coverage is a source-text scan, not an executed test). Every decision in
this phase whose acceptance criterion depends on `Commands.cjs`'s internal logic — D-01/D-03's
delete-then-wait sequencing, D-05/D-06/D-07's target-resolution and language-check — needs its
testable core extracted into a plain, `vscode`-free `.ts` module (mirroring `process-args.ts` and
`decompile-io.ts`, both already proven loadable and unit-tested directly), with `Commands.cjs`
reduced to a thin, source-guard-verified caller. RESP-08 (D-09/D-10) and RESP-09 (D-11/D-12/D-13)
have no such obstacle: `extension.ts` is plain ESM/TS already covered by a `vi.mock('vscode')`
harness, and the IntelliJ side already has the exact static-helper-plus-thin-wrapper convention
(`BbjConfigPathService.isConfigFileName`/`isDefaultConfigFilename`) to extend.

**Primary recommendation:** Extract the pure decision logic RESP-05 and RESP-07 depend on into
`decompile-io.ts` (delete-then-wait) and a new small `vscode`-free module next to `process-args.ts`
(target resolution + active-editor-language acceptance), unit-test those directly, and cover
`Commands.cjs`'s wiring to them with a source-guard test in the style of
`no-shell-command-construction.test.ts`. For RESP-08, extend `test/extension-activation.test.ts`'s
`vi.mock('vscode')` so `commands.registerCommand` throws `command 'X' already exists` for a
still-registered id (this mirrors real VS Code behavior) — that single mock change makes the D-10
double-activate test meaningful without touching `registerDocumentFormattingEditProvider` or
`client.onNotification`, which don't throw on duplicate registration in real VS Code and so need a
source-guard assertion instead. For RESP-09, add a pure file-type-name predicate next to
`BbjConfigPathService`'s existing static methods (never construct `BbjFileType.INSTANCE` inside a
plain-JUnit test — no existing test in this codebase does that) and wire both widgets' existing
`messageBusConnection` to a second `subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER, ...)`
call.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Decompile freshness (delete-then-wait) | VS Code host process (Node child-process orchestration) | — | Pure filesystem/process-lifecycle logic; no language-server involvement |
| Format-race content guard | VS Code host process | — | In-memory document buffer comparison; no server round trip |
| No-active-editor command guard | VS Code host process (command dispatch) | — | Editor/menu state is host-only; server is never consulted |
| Extension re-activation disposal | VS Code extension host lifecycle | Language client (notification handlers) | `context.subscriptions` is host-owned; the client instance it disposes is created per-activation |
| IntelliJ status-bar visibility | IntelliJ plugin UI (Swing/EDT) | IntelliJ file-type system (`FileTypeManager`/`FileTypeOverrider`) | Visibility is a pure function of the selected file's resolved `FileType`, already computed by the platform |

## Package Legitimacy Audit

Not applicable — this phase adds no new npm, PyPI, or crates dependencies. All five fixes rework
existing first-party code (`decompile-io.ts`, `document-formatter.ts`, `Commands.cjs`,
`extension.ts`, and the two IntelliJ widget classes) using only APIs already imported in those
files (`fs`, `vscode`, `com.intellij.openapi.fileEditor.FileEditorManagerListener`).

## Standard Stack

No new libraries. Existing stack, confirmed by reading each file this session:

| Layer | Tech | Version | Evidence |
|-------|------|---------|----------|
| VS Code extension | TypeScript + `vscode` API, vitest 4.1.10 | engines.vscode `^1.101.0` | `[VERIFIED: bbj-vscode/package.json:10-12, 705, 713]` |
| VS Code test harness | vitest `vi.mock('vscode')` per-file mocks | vitest ^4.1.10 | `[VERIFIED: bbj-vscode/package.json:713]`, pattern confirmed in `test/extension-activation.test.ts:18-67`, `test/document-formatter.test.ts:8-53` |
| IntelliJ plugin | Java, JUnit Jupiter | junit-bom 5.10.2 | `[VERIFIED: bbj-intellij/build.gradle.kts:40-42]` |
| IntelliJ messaging | `com.intellij.util.messages.MessageBusConnection`, `FileEditorManagerListener` | platform API (no new dep) | `[VERIFIED: bbj-intellij/.../ui/BbjStatusBarWidget.java:14, 58-62]` |

## Architecture Patterns

### System Architecture Diagram

```
VS Code editor UI (commands, keybindings, menus)
        │
        ▼
extension.ts activate()  ──registers──▶  vscode.commands.registerCommand(...)
        │                                vscode.languages.registerDocumentFormattingEditProvider(...)
        │                                client.onNotification(...)
        │                                        (D-09: every one of these must be pushed onto
        │                                         context.subscriptions so a second activate()
        │                                         disposes the first activation's set first)
        ▼
Commands.cjs (run / runBUI / runDWC / compile / denumber / decompile / decompileReadonly)
        │
        ├─▶ resolveTargetFileName(params) ──▶ [D-05] argument fsPath, else active editor,
        │                                          else undefined → shared warning (D-07)
        │                                     [D-06] active-editor fallback rejects a
        │                                          non-BBj / .bbjt document
        │
        ├─▶ decompileInPlace(file, opts)
        │        │
        │        ├─▶ [D-01] delete <input>.lst if present (ENOENT = ok; other errors → D-03 fail closed)
        │        ├─▶ execWithProgress(buildDecompileArgv(...))  (spawns bbjlst via execFile, no shell)
        │        └─▶ waitForDecompileOutput(input, {canRewriteInPlace})
        │                 │
        │                 ├─▶ decompile-io.ts: poll <input>.lst until size settles across
        │                 │        two polls [D-02: no mtime check — the D-01 delete is now the
        │                 │        sole freshness signal]
        │                 └─▶ OR: input rewritten in place (only when canRewriteInPlace, i.e.
        │                          input started tokenized)
        │
        └─▶ document-formatter.ts DocumentFormatter.provideDocumentFormattingEdits(document)
                 │
                 ├─▶ read documentContent from the live in-memory buffer (unsavedContentMap)
                 ├─▶ inFlightFormats.get(uriKey) — [D-08] only reused when its captured
                 │        content === this request's freshly-read content; else a fresh
                 │        runFormatter() is spawned against current content
                 └─▶ cp.spawn('java', [...formatFlags]) with documentContent piped to stdin

IntelliJ plugin (separate process/module)
        │
BbjStatusBarWidget / BbjJavaInteropStatusBarWidget
        │
        ├─▶ existing messageBusConnection.subscribe(BbjServerStatusListener.TOPIC / interop TOPIC)
        │        → updateStatus() → updateVisibility()
        └─▶ [D-11, NEW] same messageBusConnection.subscribe(FileEditorManagerListener.
                 FILE_EDITOR_MANAGER) → selectionChanged() → updateVisibility()
                 │
                 └─▶ [D-12] visibility decided by the selected file's resolved FileType
                          (FileTypeOverrider-aware) equalling BbjFileType.INSTANCE — never by
                          extension string, so config.bbx (overridden to BbjConfigFileType) hides
                          the widgets even though its extension is "bbx"
```

### Recommended Project Structure (no new files needed except test/helper additions)

```
bbj-vscode/src/
├── decompile-io.ts             # ADD: exported delete-leftover-lst helper (D-01/D-03), vscode-free
├── Commands/
│   ├── process-args.ts         # unchanged; already the vscode-free pure-builder convention to mirror
│   ├── Commands.cjs            # MODIFY: call the new decompile-io.ts helper; call the new
│   │                           #   target-resolution helper for D-05/D-06/D-07
│   └── target-resolution.ts    # ADD (suggested name): pure, vscode-free target+language-check
│                                #   logic for run/runBUI/runDWC/compile/denumber/decompile*
├── document-formatter.ts       # MODIFY: D-08 content-comparison guard
└── extension.ts                # MODIFY: D-09 push every bare register*/onNotification call

bbj-vscode/test/
├── decompile-io.test.ts        # MODIFY: rework P62-D2-011 for delete-then-wait (D-04)
├── target-resolution.test.ts   # ADD: pure unit tests for D-05/D-06/D-07 logic
├── commands-cjs-wiring.test.ts # ADD (or extend no-shell-command-construction.test.ts): source-guard
│                                #   proving Commands.cjs calls the extracted helpers
├── document-formatter.test.ts  # MODIFY: add D-08 overlapping-different-content test
└── extension-activation.test.ts# MODIFY: vi.mock('vscode').commands.registerCommand throws on
                                 #   duplicate id; add the double-activate D-10 test

bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── config/BbjConfigPathService.java   # reference only — mirror its static-helper pattern
└── ui/
    ├── BbjStatusBarWidget.java            # MODIFY: D-11/D-12
    ├── BbjJavaInteropStatusBarWidget.java # MODIFY: D-11/D-12
    └── BbjFileVisibility.java             # ADD (suggested name): shared static predicate

bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/
└── BbjFileVisibilityTest.java + a source-guard test  # ADD: D-13
```

### Pattern: pure-logic-module + thin-wrapper (already established in this repo)

**What:** Business logic that must be unit-tested lives in a module with zero `vscode`/live-platform
imports; the file that actually calls the live API (`Commands.cjs`, the IntelliJ widget classes)
is reduced to the minimum glue, verified only by a source-guard test asserting the call exists and
looks right.

**When to use:** Any time the calling file cannot be loaded under the test runner (`Commands.cjs`
under Vitest) or needs a live platform Application (IntelliJ `FileType`/`VirtualFile` objects under
plain JUnit).

**Example — the existing, working instance of this pattern:**
```typescript
// Source: bbj-vscode/src/Commands/process-args.ts:35-41 (module docstring, verified read)
// "No `vscode` import here, intentionally: every builder takes plain primitives, so
//  this module is unit-testable with zero mocks."
export interface Argv { file: string; args: string[]; env?: Record<string, string>; }
```
```java
// Source: bbj-intellij/.../config/BbjConfigPathService.java:131-136 (verified read)
static boolean isConfigFileName(String activePath, String filePath, @Nullable String fileName) {
    if (!activePath.isEmpty() && ConfigPaths.samePath(activePath, filePath)) {
        return true;
    }
    return isDefaultConfigFilename(fileName);
}
```
Both take plain strings/primitives in and out — no live `vscode`/`VirtualFile`/`Application`
object anywhere in the signature. This is the shape the new D-01/D-05/D-06/D-07/D-12 helpers should
follow.

### Anti-Patterns to Avoid

- **Testing `Commands.cjs` by trying to `require()` or import it under Vitest with `vi.mock`:**
  confirmed non-functional — `[VERIFIED: bbj-vscode/test/no-shell-command-construction.test.ts:5-11]`
  ("`Commands.cjs` is a CommonJS file resolved by Node's native loader, so `vi.mock('vscode')` never
  reaches its `require` and it cannot be loaded under Vitest — this source scan is the only
  automated check covering the wiring inside it"). Every existing test that touches `Commands.cjs`
  either fully mocks the whole module (`test/extension-activation.test.ts:89-103`) or scans its
  source text as a string (`no-shell-command-construction.test.ts`). Do not plan a task that assumes
  `decompileInPlace`/`resolveTargetFileName`/`run` etc. can be imported and executed directly.
- **Constructing an IntelliJ `FileType`/`VirtualFile` singleton inside a plain-JUnit test:** no
  existing test in `bbj-intellij/src/test/` does this — `[VERIFIED: grep across
  bbj-intellij/src/test/ for "FileType.INSTANCE" matched only a string-literal count assertion in
  BbjConfigFileTypeOverriderSourceGuardTest.java:62, never a direct construction/comparison]`. The
  established alternative is a static predicate over plain values (a file-type *name* string, or a
  path/name pair), proven in `BbjConfigPathService.isConfigFileName`/`isDefaultConfigFilename`
  (`config/BbjConfigPathService.java:131-149`).
- **Reusing `Commands.cjs`'s own `resolvedLstFileName` variable as the D-01 delete target:** it is
  computed differently from `waitForDecompileOutput`'s watched path for a `.lst` input (see Pitfall
  1 below) — always recompute the delete target the same way `waitForDecompileOutput` does.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting a duplicate VS Code command registration | A custom registry/Set inside `extension.ts` | Real `vscode.commands.registerCommand` already throws `command 'X' already exists` for a still-registered id — `[CITED: microsoft/vscode-python issue #16087, editorconfig/editorconfig issue #274 — both describe this exact real-world failure mode]` | The disposal fix (D-09) plus that existing platform behavior is the whole proof; no new detection code is needed in production, only in the test mock |
| IntelliJ file-type comparison | A new hard-coded extension list (a fourth one, joining the two already in the widgets and the two named in Deferred Ideas) | The platform's own resolved `FileType` (post-`FileTypeOverrider`), compared to `BbjFileType.INSTANCE` | `[VERIFIED: bbj-intellij/src/main/resources/META-INF/plugin.xml:170-188]` — `BbjFileType` is registered for `extensions="bbj;bbjt;src;bbx"` (no `.bbl`) and `BbjConfigFileTypeOverrider` already overrides `config.bbx`/custom config files to a distinct `BbjConfigFileType`; re-deriving this by extension string duplicates logic the platform already resolves correctly |

**Key insight:** every piece of "don't hand-roll" guidance in this phase is really the same
insight once: two independent hard-coded classification lists (VS Code's `.bbjt` exclusion + BBj
language-check, and IntelliJ's per-file-type extension lists) already exist as declarative platform
registrations (`package.json` menus' `when` clauses; `plugin.xml`'s `fileType` `extensions`
attribute plus `BbjConfigFileTypeOverrider`). The fixes in this phase are entirely about *reading*
those existing declarations faithfully instead of re-encoding them.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. No stored data, live-service
config, OS-registered state, secrets, or build artifacts carry any renamed identifier; all five
fixes are behavioral corrections to existing code paths, verified by reading `decompile-io.ts`,
`document-formatter.ts`, `Commands.cjs`, `extension.ts`, and the two IntelliJ widget files this
session — none of them touch a stored key, external service configuration, OS registration, secret
name, or build artifact name.

## Common Pitfalls

### Pitfall 1: The D-01 delete target diverges from `Commands.cjs`'s own `resolvedLstFileName` for a `.lst` input, and the denumber-a-`.lst`-input path already looks broken independent of this phase

**What goes wrong:** `decompileInPlace` computes `resolvedLstFileName = resolvedFileName.endsWith('.lst') ? resolvedFileName : resolvedFileName + '.lst'` `[VERIFIED: bbj-vscode/src/Commands/Commands.cjs:174-176]` — i.e., when denumbering a `.lst` input, `resolvedLstFileName` is set to **the input itself**. But `waitForDecompileOutput`'s internal `lstPath` is unconditionally `inputPath + '.lst'` `[VERIFIED: bbj-vscode/src/decompile-io.ts:76]` — for a `.lst` input this is `<input>.lst.lst`, a distinct, different path from both the input and from `resolvedLstFileName`. Additionally, for this exact input shape `canRewriteInPlace` is computed from `wasTokenized = await isTokenizedFile(resolvedFileName)` `[VERIFIED: bbj-vscode/src/Commands/Commands.cjs:197]`, and a `.lst` denumber-input is plain text, not tokenized (`isTokenizedFile` checks for the `"<<bbj>>"` magic bytes, `[VERIFIED: bbj-vscode/src/decompile-io.ts:10-28]`), so `canRewriteInPlace` is `false` — the in-place-rewrite branch in `waitForDecompileOutput` (`[VERIFIED: bbj-vscode/src/decompile-io.ts:89-92]`) can never fire for this input. `buildDecompileArgv` documents that denumbering a `.lst` input passes `-l -xlst` to `bbjlst` `[VERIFIED: bbj-vscode/src/Commands/process-args.ts:218-234]`, but **no file in this repository documents what `-xlst` actually makes `bbjlst` write** — `bbjlst`'s own behavior for this flag combination is external, unverifiable in this environment (no `bbj.home`/`bbjlst` binary is configured here), and the code today waits on a path (`<input>.lst.lst`) that neither `resolvedLstFileName` nor any plausible reading of "`-xlst`" (extension-is-already-`.lst`) would produce. **`[ASSUMED]`: this denumber-a-`.lst`-input path is very likely already broken (times out at 20s) independent of the coarse-mtime bug this phase fixes — no test in this repo exercises it, and neither `decompile-io.test.ts` nor `Commands.cjs`'s callers cover it.**

**Why it happens:** `resolvedLstFileName` (used for the final `rename` step) and `waitForDecompileOutput`'s internal `lstPath` (used for polling) are two independently-written string computations over the same variable, and they only happen to agree when the input does *not* already end in `.lst`.

**How to avoid — the safety property CONTEXT.md's research question actually needs:** D-01's delete target must be computed the **same way `waitForDecompileOutput` computes `lstPath`** — always `resolvedFileName + '.lst'`, never `Commands.cjs`'s own `resolvedLstFileName` variable. Because string concatenation with a non-empty literal suffix can never produce a string equal to its own input (`x + '.lst' !== x` for any `x`), **the D-01 delete can never remove the input file itself, regardless of whether the input already ends in `.lst`** — this holds by construction, with no special-casing needed. Recommend the planner explicitly **not** widen scope to fix the denumber-`.lst`-input path itself (out of this phase's five success criteria, and consistent with the "keep it lean" milestone posture) — file it as a follow-up issue instead, the way other out-of-scope findings this milestone have been (`.planning/todos/pending/`).

**Warning signs:** a "Denumber BBj Program" run against an already-decompiled `.lst` file times out after 20s with "Failed to decompile" even after this phase's coarse-mtime fix ships.

**Phase to address:** Not this phase's five success criteria (denumbering a plain `.bbj`/tokenized-binary input is the tested/required path) — document as a discovered latent defect, not a new regression to fix under RESP-05.

---

### Pitfall 2: `resourceLangId == bbx` in the menus' `when` clauses is dead — confirm before mirroring it into D-06's active-editor check

**What goes wrong:** `package.json`'s `contributes.languages` declares exactly two language ids: `bbj` (with `extensions: [".bbj", ".bbjt", ".src", ".bbx", ".bbl"]`) and `bbx-config` (matched by `filenames`, not extension: `config.bbx`, `Config.bbx`, `config.min`, `Config.min`) `[VERIFIED: bbj-vscode/package.json:23-61]`. **No language with id `bbx` is ever declared.** VS Code's `resourceLangId`/`editorLangId` when-clause context keys can only ever equal an id from `contributes.languages` (or a built-in), so `resourceLangId == bbx` in every run/compile/denumber menu entry (`editor/context`, `editor/title`, `explorer/context`, `[VERIFIED: bbj-vscode/package.json:236, 241, 246, 251, 256, 298, 303, 308, 313, 318, 325, 330, 335, 340, 345]`) can never be true — `.bbx` files carry language id `bbj` (they're in the `bbj` language's own `extensions` array), not a separate `bbx` id.

**Why it happens:** The `|| resourceLangId == bbx` clause was very likely written when `.bbx` was expected to get its own language id, and was never removed after `.bbx` was folded into the `bbj` language's `extensions` array.

**How to avoid:** D-06's active-editor language check should test exactly what the *live* half of the when-clause tests: `document.languageId === 'bbj' && !document.fileName.endsWith('.bbjt')` (i.e., `resourceExtname != .bbjt`, expressed against `document.fileName`'s extension). Do **not** also accept `bbx-config` documents for run/compile/denumber/decompile — the config-file language is only ever referenced by the compose-SETOPTS menu entry (`editorLangId == bbx-config`, `[VERIFIED: bbj-vscode/package.json:281-284]`), never by run/compile/denumber, since a config file is not an executable/compilable BBj program.

**Warning signs:** a task description that says "accept `bbx` or `bbj` language ids" for the no-editor guard — that's testing a context-key value that can never occur.

**Phase to address:** RESP-07 (D-06).

---

### Pitfall 3: `Commands.cjs` cannot be loaded under Vitest — plan the D-01/D-03/D-05/D-06/D-07 tests around extracted pure modules, not around `Commands.cjs` itself

**What goes wrong:** Assuming `decompileInPlace`, `resolveTargetFileName`, `run`, `runWeb`, `compile`, or `decompile` inside `Commands.cjs` can be imported into a Vitest test file (even with `vi.mock('vscode')`) and executed for a red/green regression test.

**Why it happens:** `Commands.cjs` is loaded via `require()` from `extension.ts`'s ESM/TS import `[VERIFIED: bbj-vscode/src/extension.ts:40]`, and — per the existing, explicit code comment — "`Commands.cjs` is a CommonJS file resolved by Node's native loader, so `vi.mock('vscode')` never reaches its `require` and it cannot be loaded under Vitest" `[VERIFIED: bbj-vscode/test/no-shell-command-construction.test.ts:5-11]`. Every existing automated check that touches `Commands.cjs`'s content is a source-text scan (`no-shell-command-construction.test.ts`'s `readStripped`/regex-match pattern) or a full-module `vi.mock` stub (`extension-activation.test.ts:89-103`), never an executed call into the real file.

**How to avoid:** For D-01/D-03 (RESP-05) and D-05/D-06/D-07 (RESP-07), extract the testable decision logic into new `vscode`-free `.ts` modules that `Commands.cjs` merely calls:
- **D-01/D-03:** a delete-leftover-`.lst` helper belongs in `decompile-io.ts` (already `vscode`-free, already unit-tested directly, `[VERIFIED: bbj-vscode/src/decompile-io.ts:1-11]` has zero `vscode` import). CONTEXT.md's own discretion note independently suggests exactly this location (`92-CONTEXT.md` "#500... a small exported helper in `decompile-io.ts`").
- **D-05/D-06/D-07:** a new small module (suggested: `bbj-vscode/src/Commands/target-resolution.ts`, mirroring `process-args.ts`'s "no `vscode` import here, intentionally" convention `[VERIFIED: bbj-vscode/src/Commands/process-args.ts:31-33]`) exporting pure functions taking plain values (a `params.fsPath` string or `undefined`, an `{fileName: string, languageId: string} | undefined` active-editor snapshot) and returning either a resolved file name or a "show warning" signal — no direct `vscode` API calls inside the pure functions themselves.
- Cover `Commands.cjs`'s wiring to these new modules with a source-guard test in the exact style of `no-shell-command-construction.test.ts` (regex/string-count assertions against the read file), proving each of the seven commands (`run`, `runBUI`, `runDWC`, `compile`, `denumber`, `decompile`, `decompileReadonly`) actually calls the extracted helper rather than re-implementing the check inline.

**Warning signs:** a task action that says "add a unit test importing `Commands.cjs`'s `decompileInPlace`" — that test will either silently no-op (mocked `vscode` never intercepted) or fail to run at all.

**Phase to address:** RESP-05 (D-01, D-03, D-04) and RESP-07 (D-05, D-06, D-07).

---

### Pitfall 4: Only `registerCommand` throws on duplicate registration in real VS Code — the D-10 test's throw-based proof can't cover `registerDocumentFormattingEditProvider` or `client.onNotification` the same way

**What goes wrong:** Assuming the D-10 double-activate test ("asserts nothing throws" after the fix) can be made to fail-then-pass identically for all three kinds of unguarded registration in `activate()`.

**Why it happens:** Real `vscode.commands.registerCommand` throws `command 'X' already exists` for a still-registered id — this is documented, real-world VS Code behavior `[CITED: github.com/editorconfig/editorconfig issue #274, github.com/VSCodeVim/Vim issue #5318, github.com/microsoft/vscode-python issue #16087 — three independent extensions hitting exactly this failure]`. `vscode.languages.registerDocumentFormattingEditProvider` and `LanguageClient.onNotification`, by contrast, do not throw on a second registration for the same selector/method in real VS Code — they simply add another provider/handler, which is a *leak* (D-09's actual concern) but not a *crash* the way duplicate commands are.

**How to avoid:** Extend `test/extension-activation.test.ts`'s `vi.mock('vscode')` so `commands.registerCommand` tracks registered ids in a `Set` and throws `command 'X' already exists` for a duplicate still-present id, clearing the id when its returned disposable's `dispose()` is called (mirroring the mock's existing `disposable()` helper, `[VERIFIED: bbj-vscode/test/extension-activation.test.ts:19]`). The D-10 test (call `activate()`, dispose `context.subscriptions`, call `activate()` again, assert no throw) exercises this mock directly and is the phase's primary automated proof for D-09/D-10. For `registerDocumentFormattingEditProvider` and the three `client.onNotification` calls, prove D-09 with a source-guard assertion (again mirroring `no-shell-command-construction.test.ts`'s pattern) that each call site is nested inside a `context.subscriptions.push(...)` — a static/textual check, not a runtime behavioral one, since there is no runtime failure mode to provoke for these two APIs.

**Warning signs:** a task that says "assert `registerDocumentFormattingEditProvider` throws on the second `activate()` call" — it won't, in real VS Code or in a faithful mock of it.

**Phase to address:** RESP-08 (D-09, D-10).

---

### Pitfall 5: Constructing an IntelliJ `FileType`/`VirtualFile` object in a plain-JUnit test for D-13

**What goes wrong:** Writing `BbjFileVisibilityTest` (or wherever D-13's plain-JUnit coverage lives) so its assertions compare against `BbjFileType.INSTANCE` or a real `VirtualFile.getFileType()` call directly.

**Why it happens:** `BbjFileType` and `BbjConfigFileType` are `LanguageFileType` subclasses backed by `Language` singletons (`BbjLanguage.INSTANCE`, `BbxConfigLanguage.INSTANCE`, `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjFileType.java:7-11, BbjConfigFileType.java:12-17]`), and resolving a real `VirtualFile`'s `FileType` (with `BbjConfigFileTypeOverrider` correctly applied) requires a live `FileTypeManager`/`Application` — exactly the thing D-13 explicitly asks to avoid ("plain-JUnit-testable seam (no live IntelliJ Application)"). Confirming this is safe to avoid: **no existing test in this repository ever constructs or compares one of these `FileType` singletons directly** — the only occurrence of `"...FileType.INSTANCE"` in any test file is a **string-literal count** inside a source-guard test (`BbjConfigFileTypeOverriderSourceGuardTest.java:62`, asserting the production source contains that literal exactly once — the test never touches the actual object) `[VERIFIED: grep across bbj-intellij/src/test/ for "FileType.INSTANCE" returned exactly this one match]`.

**How to avoid:** Follow the exact convention `BbjConfigPathService` already established: a package-private **static** method taking plain values — for D-13, the natural shape is `static boolean isVisibleFileTypeName(@Nullable String fileTypeName)` (comparing against `BbjFileType.INSTANCE.getName()`, i.e. `"BBj"`, `[VERIFIED: BbjFileType.java:16-18]`, as a named constant rather than a repeated magic string) — tested with plain `String` inputs and no live `Application`. The widget's live call site becomes a one-line thin wrapper: `isVisibleFileTypeName(FileEditorManager.getInstance(project).getSelectedFiles()[0].getFileType().getName())`, itself covered only by a source-guard test (mirroring `BbjConfigFileTypeOverriderSourceGuardTest`'s exact style: read the `.java` source as text, assert it calls the shared predicate exactly once and does no ad-hoc extension comparison).

**Warning signs:** a JUnit test importing `com.intellij.openapi.vfs.VirtualFile` and calling `new` or a factory method on it directly, or a `NullPointerException`/`AlreadyDisposedException` from a missing `Application` when running `./gradlew test`.

**Phase to address:** RESP-09 (D-12, D-13).

---

### Pitfall 6 (informational, not a phase risk): `FileEditorManagerListener.selectionChanged` already runs on the EDT

**What goes wrong:** Nothing — flagging this so the planner doesn't add unnecessary `ApplicationManager.getApplication().invokeLater(...)` wrapping around the new `selectionChanged` handler the way `updateStatus` needs it (that one arrives from an arbitrary background thread via the server-status message-bus topic).

**Why it happens / evidence:** `FileEditorManagerListener`'s methods, including `selectionChanged`, are documented to run on the EDT `[CITED: github.com/JetBrains/intellij-community — platform/analysis-api/.../FileEditorManagerListener.java javadoc, confirmed via web search this session]`. `updateVisibility()` only touches Swing components (`panel.setVisible(...)`) and does no IntelliJ service/file-system access beyond the already-EDT-safe `FileEditorManager.getInstance(project).getSelectedFiles()` call the widgets already make today `[VERIFIED: BbjStatusBarWidget.java:107-118]`.

**How to avoid:** Call `updateVisibility()` directly from the new `selectionChanged` handler — no `invokeLater` needed for this path (unlike the existing `updateStatus` handler, which does need it because its topic can fire off-EDT).

**Phase to address:** RESP-09 (D-11) — informational, prevents an unnecessary `invokeLater` wrapper from being planned.

## Code Examples

### D-01/D-02/D-03 target shape for the extracted delete-then-wait helper (decompile-io.ts)

```typescript
// Illustrative — mirrors the existing exported-function style already in this file
// Source pattern: bbj-vscode/src/decompile-io.ts:74-96 (waitForDecompileOutput, verified read)
export async function deleteLeftoverLst(inputPath: string): Promise<void> {
    const lstPath = inputPath + '.lst'; // same computation waitForDecompileOutput uses internally
    try {
        await fs.promises.unlink(lstPath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return; // normal case, proceed
        throw err; // D-03: fail closed — decompileInPlace must not run bbjlst after this throws
    }
}
```
Note `lstPath` here is textually identical to `waitForDecompileOutput`'s own `const lstPath = inputPath + '.lst';` (`decompile-io.ts:76`) — this is the property Pitfall 1 depends on: the delete target and the wait target must be computed by the same expression, not by `Commands.cjs`'s separately-computed `resolvedLstFileName`.

### D-02: mtime clause to remove

```typescript
// Source: bbj-vscode/src/decompile-io.ts:82-88 (verified read) — current code, mtime check to delete under D-02
if (lstStat) {
    // `.lst` exists — wait until its size settles across two polls AND its mtime is at
    // or after this call started, so a stale `.lst` of matching size is never accepted.
    if (lstStat.size === lastLstSize && lstStat.mtimeMs >= callStartMs) {   // <-- D-02 drops "&& lstStat.mtimeMs >= callStartMs"
        return { sourcePath: lstPath, inPlace: false };
    }
    lastLstSize = lstStat.size;
}
```
`SizeAndMtime`'s `mtimeMs` field (`decompile-io.ts:30-33`) becomes dead once this clause is removed —
the planner should decide whether to also drop that field/interface or leave it as a documented no-op
capture; either is consistent with D-02's own wording ("no slack constant is introduced anywhere").

### D-08 shape (document-formatter.ts) — content comparison before sharing an in-flight format

```typescript
// Source pattern: bbj-vscode/src/document-formatter.ts:56-67 (verified read) — current sharing logic
const uriKey = document.uri.toString();
let formatPromise = inFlightFormats.get(uriKey);
// D-08: only reuse when the in-flight entry's own captured content matches this request's
// freshly-read content — store {content, promise} per uriKey instead of a bare Promise.
const inFlight = inFlightFormatsByContent.get(uriKey);
let formatPromise = inFlight && inFlight.content === documentContent ? inFlight.promise : undefined;
if (!formatPromise) {
    formatPromise = this.runFormatter(args, documentContent) as Promise<string>;
    inFlightFormatsByContent.set(uriKey, { content: documentContent, promise: formatPromise });
    // ...existing clearInFlight identity-guard cleanup, extended to compare the stored entry
}
```
This is illustrative shape only — CONTEXT.md's D-08/discretion leaves the exact map shape (`URI →
{content, promise}` vs. a `URI+content` composite key) to the planner; both satisfy "share only for
identical content."

### D-10 mock extension (extension-activation.test.ts)

```typescript
// Illustrative extension of the existing mock at bbj-vscode/test/extension-activation.test.ts:35-38
const registeredCommandIds = new Set<string>();
commands: {
    registerCommand: vi.fn((id: string, _handler: unknown) => {
        if (registeredCommandIds.has(id)) {
            throw new Error(`command '${id}' already exists`);
        }
        registeredCommandIds.add(id);
        return { dispose: () => registeredCommandIds.delete(id) };
    }),
    executeCommand: vi.fn(),
},
```
Real precedent for this exact throw text: `[CITED: github.com/VSCodeVim/Vim issue #5318 — "command
'type' already exists at _.registerCommand"]`.

## State of the Art

Not applicable in the "old vs. new library" sense — this phase is entirely internal-code hygiene,
not a dependency or API-surface upgrade. The one relevant "state of the art" fact is negative and
already covered above: `Commands.cjs`'s CommonJS-under-Vitest limitation is a fixed constraint of
this codebase's current test tooling, not something a newer vitest version would change (it is a
module-resolution boundary, not a mocking-API gap).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Denumbering an already-`.lst` input is already broken (times out) independent of this phase's fixes — no file in this repo documents `bbjlst`'s actual `-xlst` output path, and no `bbj.home`/`bbjlst` binary is available in this environment to falsify it | Pitfall 1 | If wrong (bbjlst does write `<input>.lst.lst` for this flag combination, matching the current wait path), the "latent defect, out of scope" recommendation is unnecessary but harmless — D-01's delete-target safety property holds either way, since it never depends on this assumption |
| A2 | `FileEditorManagerListener.selectionChanged` runs on the EDT for every IntelliJ platform version this plugin targets (not just the one covered by the JetBrains source javadoc found via web search) | Pitfall 6 | If wrong on some supported version, `updateVisibility()` could run off-EDT and throw an EDT-assertion or produce a Swing thread-safety bug; low risk since it's the same call pattern the widgets already make from inside `updateStatus`'s `invokeLater` today, so worst case is restoring that wrapper |

**If a claim here needs confirmation before planning:** A1 is inherently unverifiable in this
environment (no BBj installation) — treat it as a documented open question the planner should not
try to close in-phase; A2 is low-risk and cheap to defensively wrap in `invokeLater` if the planner
prefers not to rely on it.

## Open Questions

1. **What does `bbjlst -l -xlst <input>.lst` actually write?**
   - What we know: `buildDecompileArgv` passes `['-l', '-xlst', fileName]` for this shape
     (`[VERIFIED: bbj-vscode/src/Commands/process-args.ts:223-234]`); nothing in this repository
     documents `-xlst`'s effect, and no `bbjlst` binary is available in this devcontainer to test
     empirically.
   - What's unclear: whether it emits `<input>.lst.lst` (matching today's wait path, however
     accidentally), rewrites `<input>.lst` in place (matching `resolvedLstFileName`'s computation,
     but not matching `canRewriteInPlace`'s current false-by-construction value for this input), or
     something else.
   - Recommendation: do not fix this path in this phase (see Pitfall 1); file a follow-up issue
     if the planner or a later human UAT pass confirms the timeout empirically.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bbj.home` / real `bbjlst`/`bbj`/`bbjcpl` binaries | RESP-05, RESP-07 live behavior | ✗ (not configured in this research session) | — | All D-01–D-08 fixes are unit-testable without a real BBj install (pure fs/process-arg logic); only human UAT (already scoped as "suggestions, not locked" in CONTEXT.md) needs a live BBj installation |
| `java` on PATH (for the bundled BBjCFCli formatter) | RESP-06 (`document-formatter.ts`) live spawn | Not probed this session — irrelevant to D-08's fix, which is exercised entirely through mocked `child_process.spawn` in `document-formatter.test.ts` | — | — |
| A live IntelliJ Application/sandbox | RESP-09 live UAT (D-13's "one live check") | ✗ (no IntelliJ sandbox in this devcontainer, consistent with prior-phase notes, e.g. Phase 88's "no IntelliJ sandbox exists in this devcontainer") | — | Plain-JUnit coverage (D-13's main proof) needs no live Application; the one live UAT step is human-gated per CONTEXT.md |
| Node/vitest/gradle toolchain | Running the automated test commands below | ✓ (repo has working `bbj-vscode` npm scripts and `bbj-intellij` gradle wrapper per CLAUDE.md) | per `package.json`/`build.gradle.kts` | — |

**Missing dependencies with no fallback:** none — every automated test this phase needs is coverable
without a live BBj install or a live IntelliJ Application, by design (pure-logic extraction per
Pitfall 3/5).

**Missing dependencies with fallback:** a live BBj installation and a live IntelliJ sandbox, both
already scoped by CONTEXT.md as human-UAT-only, not automated-test blockers.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| VS Code framework | vitest 4.1.10, config via `bbj-vscode/package.json` scripts (no separate config file found) |
| IntelliJ framework | JUnit Jupiter 5.10.2 via `junit-bom` |
| Quick run (VS Code, one file) | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/<file>.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` |
| Full suite (VS Code) | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (cwd must be `bbj-vscode` — relative fixtures; see project memory) |
| Quick run (IntelliJ, one class) | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests '<FQCN>'` |
| Full suite (IntelliJ) | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| Lint / build (VS Code) | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run lint`, `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESP-05 | Delete-then-wait is the sole freshness signal; a genuinely-undeletable leftover fails closed | unit | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/decompile-io.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (rework existing P62-D2-011 block, D-04) |
| RESP-05 | `Commands.cjs`'s `decompileInPlace` actually calls the extracted delete helper (source-guard, since the file can't be loaded — Pitfall 3) | unit (source-scan) | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/no-shell-command-construction.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` (extend this file, or add a sibling) | ❌ new assertions — Wave 0 |
| RESP-06 | Two overlapping format requests with different content each resolve with their own output | unit | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/document-formatter.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ extend `P62-D3-001` describe block |
| RESP-07 | Each of the seven commands invoked with `params: undefined` and no active editor shows the warning, doesn't throw | unit (new pure module) | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/target-resolution.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ Wave 0 — new file |
| RESP-08 | A second `activate()` in the same host doesn't throw; `registerCommand` mock throws on a still-registered duplicate id | unit | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/extension-activation.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ extend existing file (D-10) |
| RESP-09 | File-type-name predicate: BBj program shows, config file (any name) hides, `.bbl`/non-BBj hides | unit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests 'com.basis.bbj.intellij.ui.BbjFileVisibilityTest'` | ❌ Wave 0 — new file |
| RESP-09 | Both widgets subscribe `FILE_EDITOR_MANAGER` on their existing `messageBusConnection` and route to the shared predicate | unit (source-guard) | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests 'com.basis.bbj.intellij.ui.BbjStatusBarWidgetSourceGuardTest'` | ❌ Wave 0 — new file, mirror `BbjConfigFileTypeOverriderSourceGuardTest`'s style |

### Sampling Rate

- **Per task commit:** the single relevant file's quick-run command above.
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (whole-suite gate: `numFailedTests: 0`, per standing project decision) and `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test`.
- **Phase gate:** both full suites green, plus `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build` and `run lint`, before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `bbj-vscode/src/Commands/target-resolution.ts` (or equivalent name) — the pure D-05/D-06/D-07 module, does not exist yet.
- [ ] `bbj-vscode/test/target-resolution.test.ts` — its unit tests.
- [ ] `bbj-vscode/src/decompile-io.ts` — add the exported delete-leftover-lst helper (D-01/D-03).
- [ ] `bbj-intellij/.../ui/BbjFileVisibility.java` (or equivalent name) — the shared static predicate for D-12.
- [ ] `bbj-intellij/src/test/.../ui/BbjFileVisibilityTest.java` — plain-JUnit coverage for D-13.
- [ ] `bbj-intellij/src/test/.../ui/BbjStatusBarWidgetSourceGuardTest.java` (or one guard test covering both widget files) — D-13's wiring proof.
- [ ] Extend `bbj-vscode/test/no-shell-command-construction.test.ts` (or add a sibling file) with source-guard assertions that `Commands.cjs` calls the new extracted helpers.

## Security Domain

`security_enforcement` is absent from `.planning/config.json` → treated as enabled per the
governing instructions, but this phase's own scope note is explicit: "No language-server logic
changes" and every fix is a host-side reliability/UX correction, not a new trust boundary.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unchanged — this phase never touches the EM-token/credential paths (`runBUI`/`runDWC` still call `ensureValidToken` before `Commands.runBUI/runDWC`; D-07 only changes *whether the command proceeds at all* before that call, see Architecture Patterns diagram) |
| V4 Access Control | Marginal | The D-07 no-editor guard is itself an access-control-adjacent UX fix (a command can no longer silently act on `params.fsPath` being `undefined` and falling through to an unintended file); no new privilege boundary is introduced |
| V5 Input Validation | Marginal | D-06's active-editor language check is a validation gate (reject non-BBj/`.bbjt` documents before dispatch); implemented as a pure predicate per Pitfall 3/5, not hand-rolled string matching against untrusted input |
| V7 Error Handling / Logging | Yes | D-03 (fail closed on an undeletable leftover `.lst`) and D-07 (graceful warning instead of an uncaught `params.fsPath` access) are both explicitly fail-closed/graceful-degradation corrections to existing silent-failure or throw-on-undefined behavior |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Race between two format requests corrupting a save with stale content | Tampering (of the user's own document, via a logic race, not an external attacker) | D-08's content-equality check before sharing an in-flight promise |
| Stale leftover `.lst` served as fresh decompile output | Tampering / information disclosure of stale source | D-01's delete-before-decompile positive-freshness signal (already the pattern `Pitfall 9` in `PITFALLS.md` recommends over mtime slack) |
| Duplicate command/notification-handler registration after re-activation | Denial of Service (extension host crash or resource leak, not an external attacker) | D-09's disposal-on-`context.subscriptions` fix |

No new external input, network surface, secret, or privilege boundary is introduced by this phase —
all five fixes operate strictly within the existing trust boundaries this codebase already
established in Phases 78–91 (e.g., `execFile`-only process launching from `process-args.ts`,
already unaffected by this phase's changes).

## Sources

### Primary (HIGH confidence — file read this session)
- `bbj-vscode/src/Commands/process-args.ts` — `buildDecompileArgv`, `bbjBin`/`bbjlstBin`/`bbjcplBin`, module-docstring testability convention
- `bbj-vscode/src/decompile-io.ts` — `waitForDecompileOutput`, `isTokenizedFile`, `SizeAndMtime`
- `bbj-vscode/src/document-formatter.ts` — `DocumentFormatter`, `inFlightFormats`, `unsavedContentMap`
- `bbj-vscode/src/Commands/Commands.cjs` — `resolveTargetFileName`, `decompileInPlace`, `run`, `runWeb`, `compile`, `decompile`, `decompileReplace`, `decompileReadonly`
- `bbj-vscode/src/extension.ts` — `activate()` (lines 678–1001), `startLanguageClient`
- `bbj-vscode/package.json` — `contributes.languages`, `contributes.menus`
- `bbj-vscode/test/extension-activation.test.ts`, `test/document-formatter.test.ts`, `test/decompile-io.test.ts`, `test/no-shell-command-construction.test.ts`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java`, `BbjJavaInteropStatusBarWidget.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjFileType.java`, `BbjConfigFileType.java`, `config/BbjConfigFileTypeOverrider.java`, `config/BbjConfigPathService.java`
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (fileType/extensions registration)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverriderSourceGuardTest.java`, `BbjConfigFileTypeRegistrationTest.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` (confirms `BbjStatusBarWidget.java`'s existing lsp4ij-symbol allowlist scope is unaffected by this phase's `FileEditorManagerListener` import)
- `bbj-intellij/build.gradle.kts` — JUnit version
- `.planning/phases/92-host-side-hygiene-focus-guards/92-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/research/PITFALLS.md` (Pitfalls 9, 10, 12), `.planning/research/ARCHITECTURE.md`
- `.planning/config.json` (`nyquist_validation: true`; `security_enforcement` absent)

### Secondary (MEDIUM confidence)
- WebSearch: JetBrains `intellij-community` GitHub source for `FileEditorManagerListener` — EDT dispatch confirmed via the platform's own javadoc/source comments
- WebSearch: `vscode.commands.registerCommand` duplicate-id throw behavior — confirmed via three independent real-world extension issue reports (editorconfig, VSCodeVim, vscode-python)

### Tertiary (LOW confidence)
- None — every claim above is either file-verified this session or cross-checked via a targeted web search against an authoritative/platform source (never training-data-only for a discrete technical claim).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; every existing tool/version confirmed by reading `package.json`/`build.gradle.kts` this session.
- Architecture: HIGH — every file/line reference above was read this session; the one genuinely unverifiable claim (`bbjlst`'s `-xlst` output path) is explicitly flagged `[ASSUMED]` in the Assumptions Log rather than presented as fact.
- Pitfalls: HIGH — all six pitfalls trace to a specific file:line read this session or an external source cross-checked via web search.

**Research date:** 2026-09-13
**Valid until:** 30 days (stable, internal-hygiene phase; no external API/library version drift risk)

## RESEARCH COMPLETE
