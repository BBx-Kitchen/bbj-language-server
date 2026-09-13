# Phase 92: Host-Side Hygiene & Focus Guards - Context

**Gathered:** 2026-09-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Five small, independent host-side fixes. No language-server logic changes; four touch the VS Code
extension (`bbj-vscode/src/`, outside `src/language/`), one touches the IntelliJ plugin:

- **RESP-05 (#500):** Decompile stops spinning the 20 s timeout on coarse-mtime filesystems
  (`decompile-io.ts` `waitForDecompileOutput`, `Commands/Commands.cjs` `decompileInPlace`), while a
  genuinely stale pre-existing `.lst` is still never served.
- **RESP-06 (#499):** a format request never applies output computed from an earlier in-flight
  request over interim edits (`document-formatter.ts`).
- **RESP-07 (#512):** Run, Run BUI, Run DWC, Compile, Denumber and both Decompile commands, invoked
  with no active BBj file, show a graceful warning instead of throwing (`Commands/Commands.cjs`).
- **RESP-08 (#531):** a second `activate()` in the same extension host does not double-register;
  every registration in `activate()` is disposed (`extension.ts`).
- **RESP-09 (#610):** both IntelliJ status-bar widgets show/hide on a bare editor-tab switch
  (`BbjStatusBarWidget.java`, `BbjJavaInteropStatusBarWidget.java`).

**Milestone posture (carried from Phase 91, restated by the user's choices here):** keep v4.3 lean,
the release is due soon. Every decision below is the smallest change that meets the ROADMAP success
criteria; anything wider is a deferred idea. No todos folded.

</domain>

<decisions>
## Implementation Decisions

### Decompile freshness (RESP-05, #500)
- **D-01:** **Delete the leftover first.** Immediately before `decompileInPlace` runs bbjlst, remove
  any existing `<input>.lst` — exactly the path `waitForDecompileOutput` watches. A missing file
  (`ENOENT`) is the normal case and proceeds. After the delete, any `.lst` that appears is provably
  this run's output. This is research Pitfall 9's preferred "positive freshness signal", chosen over
  mtime slack.
- **D-02:** **Drop the mtime comparison.** `waitForDecompileOutput` no longer checks
  `lstStat.mtimeMs >= callStartMs`; a `.lst` is accepted once its size settles across two polls. No
  slack constant is introduced anywhere, so Pitfall 9's "if slack is kept, document it" branch does
  not apply. `decompileReadonly` already runs bbjlst in a fresh `mkdtemp` directory, needs no delete
  step, and inherits D-02 through the shared wait.
- **D-03:** **Fail closed when the leftover can't be removed.** If `<input>.lst` exists and deleting
  it fails with anything other than `ENOENT` (permissions, a Windows file lock), do **not** run
  bbjlst. Show the existing `Failed to decompile "<file>": …` error naming the leftover `.lst` and the
  reason. Stale output is never served, and there is no fallback to the old mtime check.
- **D-04:** The existing `P62-D2-011` test ("stale `.lst` of matching size is never mistaken for
  fresh output") exercises `waitForDecompileOutput` alone with a stale file present before the wait.
  Under D-02 that guarantee moves to the delete step, so the test must be reworked to cover
  delete-then-wait. It must not be deleted, and it must not be weakened into passing vacuously.

### No-editor guard (RESP-07, #512)
- **D-05:** **Passed file first.** `run`, `runBUI`/`runDWC` (`runWeb`), `compile` and `denumber`
  (via `decompile()`) resolve their target in the order `resolveTargetFileName` already uses: the
  argument's `fsPath` (Explorer right-click, editor title, editor context menu), then the active
  editor, then the warning (D-07). This also fixes right-clicking file B in the Explorer while A is
  focused running A.
- **D-06:** **A non-BBj active editor counts as "no active BBj file".** The active-editor fallback
  only accepts an editor that the command's own menu `when` clause would accept. For run, runBUI,
  runDWC, compile and denumber that is `(resourceLangId == bbj && resourceExtname != .bbjt) ||
  resourceLangId == bbx`, so a focused `.txt`, `settings.json` or `bbx-config` document gets the
  warning instead of being handed to bbj. A passed argument is used as-is, with no language check:
  decompile's tokenized binaries open in non-text editors, and the menus already filtered the
  argument.
- **D-07:** **One shared warning for all seven commands.** `vscode.window.showWarningMessage` with one
  shared string (wording is Claude's discretion, e.g. "No active BBj file. Open or select a BBj file
  and try again.") for `bbj.run`, `bbj.runBUI`, `bbj.runDWC`, `bbj.compile`, `bbj.denumber`,
  `bbj.decompile` and `bbj.decompileReadonly`. The two Decompile commands' current silent `return`
  gets the same warning. No command throws when `params` is `undefined` and no editor is focused.

### Format race (RESP-06, #499)
- **D-08:** **Share an in-flight format only for identical text.** A request reuses the in-flight
  format for its URI only when its freshly read `documentContent` is identical to the text that run
  was started with. On a mismatch it starts a fresh `runFormatter` against the current text. The
  "Save All" one-spawn dedupe (`P62-D3-001` tests) stays valid for identical content, and the
  existing map-identity cleanup guard stays. The "accept and document the risk" option was
  rejected — ROADMAP criterion 2 says a stale result is never applied.

### Re-activation cleanup (RESP-08, #531) — not discussed; recorded default, confirmed at wrap-up
- **D-09:** Every `Disposable` returned inside `activate()` is pushed onto `context.subscriptions`,
  matching the file's existing push pattern: all `vscode.commands.registerCommand(...)` calls,
  `registerDocumentFormattingEditProvider`, and **every** `client.onNotification(...)` in
  `activate()`. The issue counted one notification handler, but the file now has at least three:
  `bbj/bbjcplAvailability`, `CONFIG_RELOAD_METHOD` and `RESOLVED_CONFIG_PATH_METHOD`. The issue's
  line numbers are stale; `activate()` starts at `extension.ts:678`. Pushing notification
  disposables does not break Phase 85's restart gate, which reuses the same client instance, so
  handlers are disposed only on deactivation, never on restart.
- **D-10:** Regression test extends `bbj-vscode/test/extension-activation.test.ts`'s mocked harness.
  `registerCommand` throws `command 'X' already exists` for an id still registered and undisposed.
  The test runs `activate()`, disposes `context.subscriptions`, then runs `activate()` again and
  asserts nothing throws.

### Status-bar widgets (RESP-09, #610)
- **D-11:** Both widgets subscribe to `FileEditorManagerListener.FILE_EDITOR_MANAGER` on their
  **existing** `messageBusConnection`, which `dispose()` already disconnects, and call
  `updateVisibility()` on `selectionChanged`. The status-bus trigger stays.
- **D-12:** **Visibility is decided by file type, never by extension.** The widgets are visible iff a
  selected file's file type is the plugin's BBj file type (`BbjFileType`, registered for
  `bbj;bbjt;src;bbx`). One shared decision serves both widgets, replacing their two hard-coded
  extension lists. Consequences:
  - ordinary `.bbx` programs now show the widgets (added);
  - `.bbl` no longer shows them, since it is not a BBj file type in IntelliJ and the server never
    serves it;
  - **the config file hides them, whatever its name.** The user flagged this explicitly:
    `config.bbx` is the config file. `config.bbx`/`config.min` and any custom configured config file
    get `BbjConfigFileType` through `BbjConfigFileTypeOverrider`. An extension check containing
    `"bbx"` would wrongly count it.
- **D-13:** **Proof = plain JUnit + one live check.** A plain-JUnit test of the file-type decision
  covers: a BBj `.bbj`/`.bbx` program shows; `config.bbx`, a custom-named config file, `.bbl` and a
  non-BBj file hide. A source guard asserts both widgets subscribe `FILE_EDITOR_MANAGER` on
  `messageBusConnection` and route to the shared visibility decision (Pitfall 12: never "recorded
  manual verification" alone). One live UAT step in IntelliJ: with no server-status change, switch
  BBj tab → non-BBj tab → `config.bbx` → BBj tab; the widgets follow each switch immediately.

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
- **Research items:**
  - Denumbering a `.lst` input: `buildDecompileArgv` switches to `-l -xlst`, `decompileInPlace` then
    sets `resolvedLstFileName` to the input itself, yet `waitForDecompileOutput` watches
    `input + '.lst'`. Confirm which path bbjlst writes in that case, and make certain D-01's delete
    can never remove the input file.
  - `contributes.languages` declares only `bbj` and `bbx-config`, so confirm whether
    `resourceLangId == bbx` in the menus' `when` clauses is a dead term before mirroring it (D-06).
  - `bbj.runBUI`/`bbj.runDWC` handlers in `extension.ts` gather EM credentials before calling
    `Commands.runBUI/runDWC`. The no-file warning (D-07) should fire before any credential prompt.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 92: Host-Side Hygiene & Focus Guards" — goal and the five success
  criteria (criterion 1 cites research Pitfall 9).
- `.planning/REQUIREMENTS.md` — RESP-05..RESP-09 wording.
- GitHub issues #500, #499, #512, #531, #610 (`gh issue view <n> --repo BBx-Kitchen/bbj-language-server`)
  — Problem, Evidence, Failure scenario, Acceptance criteria. Their line numbers are stale. #610's
  "no `src/test/` source set exists for bbj-intellij" remark is obsolete: the JUnit suite exists since
  v4.2. #500 and #499 came from the Phase 67 code review (WR-06, WR-05).

### Research
- `.planning/research/PITFALLS.md` §"Pitfall 9" — mtime slack admits stale `.lst` files; prefer
  delete-before-decompile (adopted by D-01/D-02); keep the test independent of real mtime
  granularity.
- `.planning/research/PITFALLS.md` §"Pitfall 10" — the stale-format fix must address content
  staleness, not map identity (D-08).
- `.planning/research/PITFALLS.md` §"Pitfall 12" — IntelliJ regression tests are plain JUnit over a
  seam, never "recorded manual verification" alone (D-13).
- `.planning/research/ARCHITECTURE.md` — per-issue file map for #500/#499/#512/#531/#610 (line
  numbers stale).

### Prior decisions this phase builds on
- `.planning/phases/91-language-server-responsiveness/91-CONTEXT.md` — lean-milestone posture; test
  conventions (vitest cwd = `bbj-vscode`, whole-suite gate `numFailedTests: 0`).
- `.planning/STATE.md` Decisions — [Phase 84] 84-04/84-05 (`BbjConfigPathService.isConfigFile`,
  `BbjConfigFileType`, `BbjConfigFileTypeOverrider`: why the config file has its own type, D-12);
  [Phase 85] restart gate reuses one client instance (D-09); [Phase 89] 89-11/89-12 (config file
  routed to the server as `bbx-config`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/Commands/Commands.cjs`:
  - `resolveTargetFileName(params)` has the argument-then-active-editor order D-05 extends.
  - `decompileInPlace` is where D-01's delete runs, before `execWithProgress(argv)`.
  - The `Failed to decompile "…"` error shape is reused by D-03.
  - `run`, `runWeb`, `compile` and `decompile` each carry the unguarded
    `active ? active.document.fileName : params.fsPath`.
- `bbj-vscode/src/decompile-io.ts` `waitForDecompileOutput` — the size-settle loop that stays;
  the mtime clause goes (D-02).
- `bbj-vscode/src/document-formatter.ts` — `inFlightFormats` map plus the `clearInFlight`
  identity guard; `documentContent` is already computed per request (D-08).
- `bbj-vscode/src/extension.ts` `activate()` — composer `register*` helpers and status-bar
  items already push onto `context.subscriptions`; the bare `registerCommand` /
  `registerDocumentFormattingEditProvider` / `client.onNotification` calls don't (D-09).
- `bbj-vscode/package.json` `contributes.menus` — the `when` clause D-06 mirrors. The keybindings
  (alt+g/b/d/c/n) have no `when` clause, which is why the no-editor path is reachable.
- `bbj-intellij/.../BbjFileType.java`, `BbjConfigFileType.java`,
  `config/BbjConfigFileTypeOverrider.java`, `config/BbjConfigPathService.java`
  (`isConfigFile`, static `isConfigFileName`/`isDefaultConfigFilename`) — the type distinction
  D-12 relies on.

### Established Patterns
- Fail closed on doubt (D-03 mirrors the composer stale-edit guards).
- IntelliJ: plain-Java seams with static helpers for unit tests (79-02, 84-04, 86-02), plus
  source-guard tests for platform wiring (e.g. `BbjRunActionConfigPathSourceGuardTest`,
  `ComposerDialogRefreshSourceGuardTest`).
- VS Code tests mock `vscode` with `vi.mock` (see `test/extension-activation.test.ts`,
  `test/document-formatter.test.ts`); vitest runs with cwd = `bbj-vscode`
  (`npx vitest run <file>`).
- No plan or decision ids (D-xx, plan numbers, P62-… finding ids are pre-existing) added to source
  or test comments; issue numbers are fine.

### Integration Points
- Existing tests that change meaning: `test/decompile-io.test.ts` `P62-D2-011` block (D-04);
  `test/document-formatter.test.ts` `P62-D3-001` block (must still pass for identical content);
  `test/extension-activation.test.ts` (D-10 extends its mocks: `registerCommand` currently returns
  `undefined`).
- `plugin.xml` registers both widgets through `BbjStatusBarWidgetFactory` /
  `BbjJavaInteropStatusBarWidgetFactory`; the factories are unchanged.
- UAT needs both distributables (VSIX and IntelliJ zip) rebuilt from the final tree, again after any
  code-review fixes.

</code_context>

<specifics>
## Specific Ideas

- The user's own note on the widget rule: "keep an eye on .bbx — config.bbx is the config file!"
  Hence D-12's type-based check, and the D-13 test and UAT step that include `config.bbx`.
- IntelliJ UAT step (D-13): BBj tab → non-BBj tab → `config.bbx` → BBj tab with no server-status
  change; the widgets follow each switch.

</specifics>

<deferred>
## Deferred Ideas

- Other hard-coded BBj extension lists in the IntelliJ plugin drift the same way the widgets did:
  - `BbjRunActionBase` counts `.bbl`, and any `.bbx` including `config.bbx`.
  - `BbjRestartServerAction` and `BbjServerCrashNotificationProvider` omit `.bbx`.
  The same file-type check (D-12) could replace them. Not in scope.
- `when` clauses on the alt+g/b/d/c/n keybindings so they only fire in BBj editors, freeing those
  keys elsewhere. D-07's warning already covers the no-editor case.

### Reviewed Todos (not folded)
- **Update live-interop tests for the upgraded java-interop backend (getAllClassNames)**
  (`.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md`):
  test hygiene; keyword match only. Kept out to keep the milestone lean.
- **gradle-wrapper-hygiene test fixture declares Gradle 8.13**
  (`.planning/todos/pending/2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md`):
  unrelated, and reportedly already fixed on 2026-09-06; keyword match on "hygiene" only.
- **A configured-but-unusable Node.js path suppresses the cached-download fallback**
  (`.planning/todos/pending/2026-09-06-configured-node-path-suppresses-cached-download-fallback.md`):
  an IntelliJ Node detection product decision, unrelated.
- **Live Windows check for the Node.js auto-install failure**
  (`.planning/todos/pending/2026-09-06-live-windows-check-for-node-auto-install-failure.md`):
  maintainer-owned human attestation, out of scope per REQUIREMENTS.md.

</deferred>

---

*Phase: 92-host-side-hygiene-focus-guards*
*Context gathered: 2026-09-13*
