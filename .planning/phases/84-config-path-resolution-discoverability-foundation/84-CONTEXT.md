# Phase 84: Config Path Resolution & Discoverability Foundation - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

<domain>
## Phase Boundary

One shared answer to "which file is the BBj config file", computed once in the language
server and consumed by every reader of the config path in both IDEs; and editor treatment
of that file as a config file (highlighting, icon, composer affordance, tooling) regardless
of its name or location, surviving reopen and revert. Covers CFG-01 and CFG-02 (#485).

Not this phase: watching the resolved file and reloading PREFIX/USE on change (Phase 85,
#486); the IntelliJ SETOPTS composer itself (Phase 87, #633); java-interop port detection
and targeted Refresh Java Classes (Phase 86).

</domain>

<decisions>
## Implementation Decisions

### Resolved-path source of truth
- **D-01:** The language server is the single owner of config-path resolution and exposes it two ways: a `bbj/resolvedConfigPath` request for on-demand reads, and a server-pushed notification sent after initialize and whenever the setting changes. Hosts keep the last pushed value as a warm cache. Follows the `bbj/compile` and `bbj/composer/*` custom-request precedent. — **Reversibility:** costly — the request and notification cross the LSP4IJ boundary and land on the single `BbjComposerServer` interface plus the VS Code client; changing the shape later touches both hosts and their JSON-boundary tests.
- **D-02:** Before the server has answered (IntelliJ file-type override runs synchronously during indexing; VS Code activation precedes client readiness), hosts act only on the explicit setting (`bbj.configPath` / `BbjSettings.State.configPath`) and do nothing when it is unset. Rationale: the fallback file is always named `config.bbx`, which the static filename lists already associate, so no host-side fallback logic is needed for association. Hosts do not reimplement `configPath || home/cfg/config.bbx`.
- **D-03:** The existing host-side run-command fallbacks (VS Code web-run in `Commands.cjs`, IntelliJ `BbjRunActionBase.getConfigPath()` for BUI/DWC) are replaced by the host's cached resolved path from the notification. Run actions are already gated on the server being started, so the cache is populated by then. If the cache is somehow absent, the run surfaces a clear error naming the problem rather than guessing a path.
- **D-04:** The resolved path is one string: absolute, symlinks resolved, separators normalized for the OS. Hosts compare document paths against it using the same canonicalization. Phase 85's watcher consumes exactly this form.

### Editor association mechanics
- **D-05:** VS Code applies `bbx-config` to the configured file on every classification trigger: documents already open at activation, `onDidOpenTextDocument`, and `onDidChangeConfiguration` for `bbj.configPath` (the old path is released back to its default language, the new path associated). A regression test asserts the language id survives close/reopen and Revert File, not just first open (research Pitfall 5).
- **D-06:** IntelliJ gets a plugin-owned config file type applied to the configured path through a file-type override, with the bbx TextMate grammar, the config icon, and an `isConfigFile(VirtualFile)`-style predicate that Phase 87's SETOPTS composer will consume. The researcher verifies the exact platform APIs (file-type override extension point, TextMate highlighter binding for a non-filename match) before planning names edits. — **Reversibility:** costly — a registered file type name is user-visible in IntelliJ's File Types settings and persists in user configuration; renaming or removing it later leaves stale associations behind.
- **D-07:** Config files never reach the language server on either host. The new IntelliJ config file type is not mapped to the server, and `config.bbx` itself moves to that file type so it stops being parsed as BBj source (today the `.bbx` extension maps to the BBj file type and is sent as `bbj`). VS Code already excludes config files via its `bbj`-only document selector.
- **D-08:** When a custom path is configured, the default `{home}/cfg/config.bbx` keeps its static highlighting, but the SETOPTS composer and the Show-config command tell the user that file is not the active config and name the active one. This is the confusion #485 was filed over, in the other direction.

### Consumer audit rules
- **D-09:** Compile: an explicit `bbj.compiler.typeChecking.configFile` still wins. When type checking is on, that setting is unset, and no `typeChecking.prefixDirectories` are given, compile passes `-c` with the resolved config path. The existing `-c`/`-P` conflict rule is unchanged.
- **D-10:** The VS Code "Show the config.bbx file" command opens the resolved file. If it does not exist, the command shows an error naming the path it tried; it does not silently fall back to the home default. The command title is renamed so it no longer implies `config.bbx`.
- **D-11:** Accepted path forms: absolute paths, with a leading `~` expanded to the home directory inside the shared resolver. Relative paths are rejected with a clear message. The settings are window/application scoped, so workspace-relative paths have no stable anchor.
- **D-12:** The EM Config `--` sentinel is neutralized centrally: the shared resolver treats `--` and blank as unset, so they fall back to the default. The run-argument builders on both hosts (`getConfigPathArg`, `Commands.cjs` run / `buildRunArgv`) also refuse to emit `-c--` as a defensive second layer, mirroring the existing classpath sentinel guard.

### Bad paths & setting changes
- **D-13:** When the configured file is missing or unreadable, both IDEs show a non-modal warning naming the path that failed, once per distinct path per session, in addition to the existing server log line. Language features keep running with no prefixes loaded.
- **D-14:** When `bbj.configPath` changes at runtime, Phase 84 re-resolves and re-associates only: the server recomputes the canonical path and pushes the notification; hosts update their cache and language association immediately. Re-reading PREFIX/USE from the new file stays with Phase 85's reload path, which hooks the same notification.
- **D-15:** The IntelliJ Settings dialog validates the config path field inline: a warning when the path is not absolute after `~` expansion or the file does not exist, but Apply is still allowed so users can point at a file they are about to create.
- **D-16:** If the configured path carries a BBj source extension (for example `myconfig.bbj`), the explicit setting outranks extension-based association: the file is treated as a config file and kept out of the language server.

### Claude's Discretion
- Exact request/notification method names and payload field names, as long as they follow the `bbj/…` custom-request convention and are covered by the existing JSON-boundary tests on the IntelliJ side.
- Where the IntelliJ `isConfigFile` predicate lives (service vs. static helper) and how the VS Code side exposes the equivalent check to the SETOPTS composer.
- Wording of the warning, the inactive-config hint, and the renamed Show-config command title.
- How the once-per-path warning is keyed and reset (session-scoped is sufficient).

### Folded Todos
- **Strip EM Config `--` sentinel in getConfigPathArg and Commands.cjs run** (`.planning/todos/pending/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md`): `getConfigPathArg()` in `BbjRunActionBase.java` and the VS Code `run` path emit the literal `-c--` when the config path holds the EM Config sentinel, unlike the sibling classpath guard. Fits this phase because both sites are consumers of the config path being centralized; resolved by D-12.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design and pitfalls
- `.planning/research/ARCHITECTURE.md` §"Config Path Data Flow (#485, #486, #632, #608)" — today's single resolution site in `bbj-ws-manager.ts`, the host-side gaps, and the two candidate designs; D-01 selects the LSP-query design.
- `.planning/research/PITFALLS.md` §"Pitfall 5" — dynamic language association fighting the static `filenames` contribution; the reopen/revert regression test D-05 requires.
- `.planning/research/SUMMARY.md` §"Phase 1: Config path resolution & discoverability foundation" — rationale for sequencing this phase before the watcher.

### Requirements and issues
- `.planning/REQUIREMENTS.md` — CFG-01, CFG-02 (this phase); CFG-03 (Phase 85) names what this phase must leave room for.
- `.planning/ROADMAP.md` §"Phase 84" — the four success criteria, including criterion 4 (one shared source, no per-host reimplementation).
- GitHub issue #485 — requested behavior 1-3 (default unchanged, fully configurable location and name, dynamic association) and the `config.min` confusion that motivated it.

### Folded todo
- `.planning/todos/pending/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` — exact file/line sites for the sentinel guards (D-12).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/bbj-ws-manager.ts` — `BBjWorkspaceManager` already holds `configPath`, `bbjdir`, and the fallback branch in `initializeWorkspace()`; the shared resolver extracts that branch into a single function that both the request handler and the notification use.
- `bbj-vscode/src/language/compile-command.ts` and `composer-commands.ts` — the established shape for registering `bbj/…` custom requests in `main.ts`; the new request and notification follow it.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` — the single LSP4IJ server interface (`getServerInterface()` returns one class); the new request method and notification handler are added here, with `ComposerModelsJsonBoundaryTest`-style coverage for the DTO.
- `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` — sends `configPath` flat in `initializationOptions`; unchanged as the input channel.
- `bbj-vscode/src/Commands/Commands.cjs` `stripSentinel` helper — the classpath sentinel guard D-12 mirrors.
- `bbj-vscode/src/setopts-composer-ui.ts` `argForActiveEditor()` — gated on `languageId === 'bbx-config'`; becomes the place for the inactive-config hint (D-08) and benefits from D-05 without change.
- `bbj-intellij/.../BbjSettingsComponent.java` `configPathField` — the field D-15 validates; `BbjSettingsConfigurable` already tracks modification of `state.configPath`.

### Established Patterns
- Both hosts send raw settings (`home`/`bbjHomePath`, `configPath`) to the server at initialize; only the server derives anything from them. D-01 keeps derivation server-side.
- Custom requests are versioned and boundary-tested on the IntelliJ side (Phase 81 lessons); numeric sentinels must stay in range.
- IntelliJ run actions are gated on the server being started (PROJECT.md key decision), which is what makes D-03's cache-only rule safe.
- VS Code's language client uses a `bbj`-only `documentSelector` (`extension.ts`), so config files are host-only there; D-07 brings IntelliJ in line.

### Integration Points
- `bbj-vscode/src/language/main.ts` — `onDidChangeConfiguration` already calls `wsManager.setConfigPath(...)`; the notification push hooks in there and after `initializeWorkspace`.
- `bbj-vscode/src/extension.ts` — activation, `onDidOpenTextDocument`, `onDidChangeConfiguration` listeners for D-05; the notification handler that fills the host cache.
- `bbj-vscode/package.json` — `contributes.languages` static `filenames` stay; `bbj.configPath` description updated for `~` and absolute-only (D-11); Show-config command title (D-10).
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — the `fileType` entry currently maps `bbx` to the BBj type; D-07 moves config files to the new type and leaves it unmapped in the LSP4IJ `languageMapping`.
- `bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json` — static filename list stays for the default names; the custom-name path is served by the file-type override (D-06).
- `bbj-vscode/src/language/bbj-cpl-service.ts` / `compiler-options.ts` — the `-c` option resolution for D-09.
- `bbj-intellij/.../actions/BbjRunActionBase.java`, `BbjRunGuiAction.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java` and `bbj-vscode/src/Commands/process-args.ts` — run-argument consumers for D-03 and D-12.

</code_context>

<specifics>
## Specific Ideas

- Phase 85 must be able to take the resolved path from the same notification rather than asking again; design the payload so a later "changed" push is the same message.
- The inactive-config hint (D-08) should name the active file's full path so a user who opened `config.min` by habit learns which file the tooling actually reads.
- The reopen/revert regression test is the acceptance signal for D-05; a test that passes on first open only is not done.

</specifics>

<deferred>
## Deferred Ideas

- Workspace-relative config paths (resolved against a workspace folder or project base) — rejected for this phase by D-11 because the settings are window/application scoped; revisit only if a project-level config setting is introduced.
- A persistent status-bar indicator for an unreadable config file — Phase 85 owns the config status signal; D-13's one-time warning is the Phase 84 answer.
- Re-reading PREFIX/USE immediately on a `bbj.configPath` change — Phase 85 (#486), per D-14.

### Reviewed Todos (not folded)
- gradle-wrapper-hygiene fixture Gradle version mismatch — testing hygiene, unrelated to config path.
- Configured-but-unusable Node.js path suppresses cached-download fallback — IntelliJ Node bootstrap, unrelated.
- Live Windows check for the Node.js auto-install failure — maintainer-owned manual check, unrelated.
- Update live-interop tests for the getAllClassNames backend — interop test drift, unrelated.

</deferred>

---

*Phase: 84-config-path-resolution-discoverability-foundation*
*Context gathered: 2026-09-06*
