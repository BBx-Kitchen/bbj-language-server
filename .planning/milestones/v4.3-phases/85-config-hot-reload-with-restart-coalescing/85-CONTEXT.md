# Phase 85: Config Hot-Reload With Restart Coalescing - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

> Gathered in `--auto` mode: every gray area below was resolved with the recommended option;
> the alternatives considered are recorded in `85-DISCUSSION-LOG.md`.

<domain>
## Phase Boundary

A change to the resolved BBj config file (the one file Phase 84's shared resolver names)
takes effect in both IDEs without a manual language-server restart: the change is detected
wherever the file lives and however it was saved, debounced, judged for relevance, and turned
into exactly one coalesced language-server restart with a non-blocking status-bar signal.
Composer writes to the same file cannot cascade into a restart loop, and a restart never
lands mid-validation. Covers CFG-03 (#486).

Not this phase: the IntelliJ SETOPTS composer that will write config.bbx (Phase 87, which
depends on the suppression guarantee this phase establishes); java-interop port detection and
targeted Refresh Java Classes (Phase 86); fine-grained in-process re-evaluation of PREFIX/USE
instead of a restart (rejected by the issue itself); a user-facing opt-out setting (deferred).

</domain>

<decisions>
## Implementation Decisions

### Detection ownership
- **D-01:** The language server owns change detection. It watches the *directory* of the canonical resolved config path (Phase 84 D-04 form: absolute, symlink-resolved, normalized) with a non-recursive Node `fs.watch`, filters events to the config file's basename using the same `samePath` semantics as the resolver, and re-arms the watch whenever the resolved path changes. Neither host runs its own file watcher for the config file. — **Reversibility:** costly — moving detection host-side later means two watcher implementations (VS Code `RelativePattern`, IntelliJ VFS watch root + refresh) plus retiring a notification that already crosses the LSP4IJ boundary. Rationale: one implementation serves both IDEs; the server already owns the resolved path (D-01/84), knows exactly which config lines it consumes (D-04), and is the only party that knows whether a build is in flight (D-09). IntelliJ's VFS does not deliver events for files outside content roots without an explicit watch root and a refresh, and VS Code's workspace watchers are workspace-scoped (research Pitfalls 1-2); watching the directory rather than the file makes an atomic write-temp-then-rename save visible as a rename/create on the same basename instead of a lost inode.
- **D-02:** The server tells hosts to reload through a new pushed notification in the `bbj/…` convention (exact name and payload are Claude's discretion; the payload carries at least the resolved path and a short machine-readable reason). Hosts never judge whether a change matters; they execute the restart through their choke point (D-10, D-11) and render the signal (D-14). The notification follows the `bbj/resolvedConfigPath` precedent: a method-name constant shared by `bbj-notifications.ts` and a Gson DTO on the IntelliJ side, covered by the existing JSON-boundary and request-contract test families.

### Reload semantics — what counts as a change
- **D-03:** Reload means a full language-server restart, not in-process re-evaluation. Locked by issue #486's own analysis (a PREFIX change invalidates external-document loading, `use ::path::Class` resolution and external classification workspace-wide) and by the roadmap title; not revisited here.
- **D-04:** Relevance gate: a file event triggers a reload only when the config content the server actually consumes changed. Today that is the `PREFIX` directive read in `initializeWorkspace` (project-wide USE resolution flows from it). The planner extracts that read into one shared "consumed config content" function that both `initializeWorkspace` and the gate call, so the gate cannot drift from the read; the gate compares a normalized hash of that extraction against the snapshot the running server took when it last read the file. Comment edits, `SETOPTS` lines, whitespace, unrelated directives, and saves that do not change the PREFIX never restart the server. — **Reversibility:** reversible.
- **D-05:** Missing or deleted file: if the file is absent when the debounce window (D-08) closes — an atomic save recreates it inside the window and is coalesced — the consumed content is "empty"; that counts as a change when the snapshot was non-empty and reloads with no prefixes, alongside the existing Phase 84 once-per-path missing-file warning (84 D-13). If the watched directory itself does not exist, no watch is armed; arming is re-attempted at every resolved-path change, and the failure is logged once per path.

### Self-write suppression (the guarantee Phase 87 depends on)
- **D-06:** Composer writes are absorbed structurally by the relevance gate (D-04), not by a timestamp window. The SETOPTS composer only ever rewrites `SETOPTS` lines, so its write never changes the consumed content and never produces a reload notification — regardless of whether the bytes reach disk via VS Code's `WorkspaceEdit` plus a later user save, IntelliJ's `WriteCommandAction` plus autosave, or an external tool. Rejected alternative: "record own write timestamp/hash and skip the next matching event". VS Code's composer edits the editor buffer and the disk write happens at the user's later save (IntelliJ autosaves on its own cadence), so no reliable write-time marker exists; and a marker keyed to the composer would not cover an external editor touching only SETOPTS. Acceptance is a pair of regression tests: a SETOPTS-only change produces no reload notification; a PREFIX change produces exactly one. Phase 87 needs no API call to inherit this. — **Reversibility:** reversible.
- **D-07:** A restart that lands while a composer dialog session is open may fail that dialog's next request; the failure surfaces through the existing `ComposerFlow`/`ComposerNotices` reason-keyed balloon (Phase 82 seam), never silently. No dialog-aware deferral of restarts in this phase (deferred idea).

### Debounce, quiescence and coalescing
- **D-08:** Server-side trailing-edge debounce on raw file events, no shorter than 1000 ms and never shorter than the 500 ms BBjCPL debounce (planner fixes the constant and documents it), so an atomic save's delete+create pair and a burst of saves collapse into one relevance evaluation.
- **D-09:** After the debounce closes and the gate says "changed", the server waits for build quiescence before pushing the notification: no in-flight `DocumentBuilder` build and no pending BBjCPL debounce timers. The wait is bounded (on the order of 5 s) so a busy workspace cannot starve the reload; after the bound it pushes anyway. This is the research Pitfall 4 guard: the restart request is never emitted mid-validation. The planner exposes a testable quiescence predicate on the document builder (or a completion promise) instead of sleeping in the watcher.
- **D-10:** VS Code gets a single restart choke point — a `requestRestart(delayMs)` with the cancel-then-schedule coalescing shape of IntelliJ's `RestartGate` — and the config-reload handler is its first caller. Any later VS Code restart trigger must go through it (a source-guard or unit test fences that nothing else stops/starts the client). It operates on the existing `client` instance (stop then start, or `restart()` if the installed vscode-languageclient 10.1.0 exposes it — researcher confirms) so the `onNotification` handlers already registered on the client survive the restart. — **Reversibility:** costly — becomes the contract every future VS Code restart trigger is written against, mirroring EDT-05 on the IntelliJ side.
- **D-11:** IntelliJ's notification handler calls `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)` — the same 500 ms coalescing delay the settings-apply flow uses — so a config-path settings Apply (which already schedules a restart) and the server's reload push collapse into one restart through the existing `RestartGate`. A source-guard test fences that the handler never touches `LanguageServerManager` directly (Phase 79 convention).

### Setting-change path (Phase 84 D-14 hook)
- **D-12:** When `bbj.configPath` / IntelliJ `configPath` changes at runtime, the server re-resolves (Phase 84 already does), re-arms the watch on the new canonical path, and runs the same relevance gate over the new file's consumed content against the running snapshot: different PREFIX → reload notification; identical → no restart (pointing at a copy of the same config is a no-op). On IntelliJ the settings-apply restart still happens and coalesces per D-11.

### Signal UX
- **D-13:** Auto-restart with a non-blocking status-bar signal. No prompt, no modal, no toast. Confirms the research recommendation and PROJECT.md's "status bar over notification balloons" precedent (BBjCPL). The issue's floated "config.bbx changed — reload?" prompt is rejected because D-04, D-08 and D-09 already remove the surprise it was meant to prevent: a restart happens only when the effective PREFIX changed, after typing has quieted, and never mid-validation.
- **D-14:** VS Code: a dedicated `StatusBarItem` (left alignment, adjacent to the BBjCPL item) shows a spinning "reloading" state while the restart runs and a brief "config reloaded" confirmation once the client is back, then auto-hides (≈5 s); its tooltip names the config file's full path. The output channel gets one line naming the file and that the PREFIX changed. IntelliJ: the existing `BbjStatusBarWidget` already renders starting/started transitions; during this restart its text or tooltip carries the reason (config file changed), and one line goes to the BBj Language Server console tool window. No new balloon on either host.
- **D-15:** If the restart fails, the existing failure handling applies unchanged (VS Code's start-failure `showErrorMessage`; IntelliJ's crash-count notification) and the config status signal clears rather than sticking in "reloading".

### Claude's Discretion
- Exact notification method name and payload field names within the `bbj/…` convention.
- The debounce constant within the D-08 bounds and the quiescence bound within D-09.
- How the server re-arms the watch (close-and-reopen vs. a keyed watcher registry) and whether it falls back to `fs.watchFile` polling where `fs.watch` is unreliable (network shares) — researcher checks Node behaviour per platform.
- Status-bar wording and icons; whether IntelliJ's reason goes in the widget text or only the tooltip.
- Normalization rules for the consumed-content hash (trailing whitespace, line endings, case of the directive keyword).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design and pitfalls
- `.planning/research/PITFALLS.md` §"Pitfall 1" through §"Pitfall 4" — out-of-workspace watcher scoping, atomic-save semantics, the self-inflicted restart loop (#232 history), and the two-debounce collision; D-01, D-04, D-06, D-08, D-09 are the answers. §"Technical Debt Patterns" row "Auto-restart on config change with no suppression window".
- `.planning/research/ARCHITECTURE.md` §"Config Path Data Flow (#485, #486, #632, #608)" — today's single resolution site and the restart machinery on each host (IntelliJ has `RestartGate`; VS Code has none — D-10 introduces one).
- `.planning/research/SUMMARY.md` §"Phase 2: Config hot-reload with restart coalescing" and §"Gaps to Address" bullet "Auto-restart vs. prompt for config reload (#486)" — the judgment call D-13 closes.

### Phase 84 handoff (direct dependency)
- `.planning/phases/84-config-path-resolution-discoverability-foundation/84-CONTEXT.md` — D-01 (server owns resolution; request + pushed notification), D-04 (canonical path form the watcher consumes), D-13 (once-per-path missing-file warning), D-14 (setting change re-resolves only; PREFIX reload is this phase's job).
- `.planning/phases/84-config-path-resolution-discoverability-foundation/84-01-SUMMARY.md` — `config-path-resolver.ts`, `resolved-config-path-request.ts`, `bbj-notifications.ts` push-and-dedupe pattern, the two `setConfigPath` call sites in `main.ts`.
- `.planning/phases/84-config-path-resolution-discoverability-foundation/84-02-SUMMARY.md` — VS Code host cache (`config-path-cache.ts`) and the notification listener in `extension.ts`.
- `.planning/phases/84-config-path-resolution-discoverability-foundation/84-04-SUMMARY.md` — IntelliJ `ConfigModels` DTO, `BbjLanguageClient` `@JsonNotification` handler shape, `BbjConfigPathService`, and the JSON-boundary/request-contract/source-guard test families the new notification must join.

### Requirements and issues
- `.planning/REQUIREMENTS.md` — CFG-03 (this phase); DISC-04 (Phase 87) depends on D-06.
- `.planning/ROADMAP.md` §"Phase 85" — the four success criteria; §"Phase 87" "Depends on" line naming the self-write suppression window.
- GitHub issue #486 — the restart-over-re-evaluation rationale (D-03) and the optional prompt (rejected by D-13).
- `.planning/PROJECT.md` §"Key Decisions" — EDT-05 (`requestRestart(long)` over a synchronized `RestartGate`), "500ms trailing-edge debounce for BBjCPL", "Status bar over notification balloons for BBjCPL", "Plain-Java `Scheduler` seam", "Source-guard tests as the regression fence".

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/config-path-resolver.ts` — `canonicalizeConfigPath`, `samePath`, `resolveConfigPath`, `ResolvedConfigPath`; the watcher takes `path.dirname`/`basename` of the canonical path and filters with `samePath`.
- `bbj-vscode/src/language/bbj-notifications.ts` — `notifyResolvedConfigPath` shows the push-once-deduped notification shape; the new reload notification sits beside it (`initNotifications` already wires the connection).
- `bbj-vscode/src/language/bbj-ws-manager.ts` `initializeWorkspace()` — the `PREFIX` read (`configContents.split('\n').find(line => line.startsWith("PREFIX"))`) that D-04 extracts into the shared consumed-content function; `setConfigPath()`/`getResolvedConfigPath()` are the re-arm hooks for D-12.
- `bbj-vscode/src/language/main.ts` — `workspaceInitialized` gate (arm the watcher once the first build validates), the two `setConfigPath` + `notifyResolvedConfigPath` sites (D-12 re-arm), and `reloadJavaClassesAndRevalidate` as the precedent for a server-driven workspace-wide refresh (not reused for PREFIX — D-03).
- `bbj-vscode/src/language/bbj-document-builder.ts` — `cplDebounceTimers` and `SAVE_DEBOUNCE_MS = 500`; the natural home for the D-09 quiescence predicate.
- `bbj-vscode/src/extension.ts` — `startLanguageClient()` and the module-level `client`, `deactivate()`'s `client.stop()`, the two existing `StatusBarItem`s (suppression at priority 100, BBjCPL at 99), and the `client.onNotification(RESOLVED_CONFIG_PATH_METHOD, …)` listener the new handler mirrors.
- `bbj-vscode/src/config-path-cache.ts` — `getActiveConfigPath()` for the tooltip path in D-14.
- `bbj-intellij/.../concurrency/RestartGate.java`, `Scheduler.java`, `AlarmScheduler.java` — the coalescing shape D-10 ports to VS Code and D-11 reuses.
- `bbj-intellij/.../ui/BbjServerService.java` — `requestRestart(long)`, `RESTART_DEBOUNCE_MS = 500`, `scheduleRestart()` (settings-apply caller), `logToConsole`, `BbjServerStatusListener.TOPIC`.
- `bbj-intellij/.../lsp/BbjLanguageClient.java` — `@JsonNotification("bbj/resolvedConfigPath")` handler: synchronous cache update, `invokeLater` behind a project-disposed guard.
- `bbj-intellij/.../ui/BbjStatusBarWidget.java` `updateStatus(ServerStatus)` — where the D-14 reason text/tooltip attaches.
- `bbj-intellij/.../config/ConfigModels.java` + `ConfigModelsJsonBoundaryTest.java` — the DTO and boundary-test pattern for the new notification payload.
- `bbj-intellij/.../composer/ComposerFlow.java`, `ComposerNotices.java` — the reason-keyed balloon D-07 relies on.

### Established Patterns
- Injectable filesystem/timer probes on pure functions for hermetic unit tests (84-01) — the watcher, debounce and gate should be built the same way so `vitest` covers them without touching real timers or disk in the common case.
- Source-guard tests (whole-file text assertions) fence wiring a live IDE would otherwise be needed to exercise (Phase 79/84) — D-10 and D-11 both get one.
- Every `bbj/…` request/notification name lives in one constant on the server side and is asserted against the language-server sources by `ComposerRequestContractTest` on the IntelliJ side; the new notification joins that scan.
- Status bar over balloons; log lines over toasts (PROJECT.md v3.7 decisions).
- All IntelliJ restart triggers funnel through `requestRestart(long)` (EDT-05); D-10 gives VS Code the same discipline.

### Integration Points
- `bbj-vscode/src/language/main.ts` — arm the watcher after the first `Validated` build phase (inside the existing `workspaceInitialized` block) and re-arm from both `setConfigPath` sites; the reload notification is pushed from the watcher module through `bbj-notifications.ts`.
- `bbj-vscode/src/language/bbj-ws-manager.ts` — take the consumed-content snapshot at the moment `initializeWorkspace` reads the file.
- `bbj-vscode/src/extension.ts` — new `client.onNotification(<reload method>, …)` → `requestRestart(delay)` choke point → status item transitions; `deactivate()` should also route through the choke point or cancel its pending restart.
- `bbj-intellij/.../lsp/BbjLanguageClient.java` — new `@JsonNotification` method → `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)` + `logToConsole`; `BbjStatusBarWidget` reads the reason.
- `bbj-intellij/src/test/java/.../composer/ComposerRequestContractTest.java` and `ComposerFlowTest.java`'s `FakeComposerServer` — only if the notification is declared on the server-proxy interface (it should not be; notifications live on the client class, as `bbj/resolvedConfigPath` does).
- `QA/FULL-TEST-CHECKLIST.md` — rows for: external-editor PREFIX change reloads (both IDEs); atomic-save editor; out-of-workspace config file; SETOPTS composer apply + save does not restart; `.bbj` save burst plus config save yields one clean restart.

</code_context>

<specifics>
## Specific Ideas

- The acceptance signal for D-06 is the test pair "SETOPTS-only edit → zero reload notifications; PREFIX edit → exactly one", written against the shared consumed-content function so Phase 87's composer inherits it without wiring.
- The consumed-content extraction must be the *same function* `initializeWorkspace` uses to read PREFIX — a second parser for the gate is the drift bug this whole milestone treats as a defect class.
- The VS Code choke point should be small enough to unit-test with a fake timer the way `RestartGateTest` does on the IntelliJ side; one coalescing test (two requests inside the window → one restart) is the minimum.
- Success criterion 4 (no restart mid-validation) is proven by a server-side test that holds a build in flight, fires the file event, and asserts the notification is emitted only after the build completes (and within the D-09 bound when it never completes).

</specifics>

<deferred>
## Deferred Ideas

- **Opt-out / mode setting for config auto-reload** (e.g. auto vs off, in the spirit of `bbj.compiler.trigger`) — not requested by #486; add only if UAT or users ask for manual control.
- **In-process PREFIX/USE re-evaluation instead of a restart** — rejected by the issue's own stale-state analysis (D-03); revisit only if restart cost becomes a complaint.
- **Dialog-aware restart deferral** while a composer dialog session is open — Phase 87 can add it on top of D-07 if UAT shows the reason-keyed balloon is not enough.
- **Watching `project.properties`** (also read once at `initializeWorkspace`) with the same server-side mechanism — natural extension, out of CFG-03's scope.
- **Reload-required signal for the java-interop refresh path** (Phase 86 CFG-04) — Phase 86 owns whether its targeted request reuses the D-10 choke point on VS Code.

### Reviewed Todos (not folded)
All five pending todos matched on the keyword `bbj` only (scores 0.4–0.6); none is in this phase's domain, so none was folded despite the auto-mode threshold — folding them would have planned unrelated work into a hot-reload phase.
- Strip EM Config `--` sentinel in `getConfigPathArg` and `Commands.cjs` run — already delivered by Phase 84 D-12 (`ConfigPaths.configPathArg` in `BbjRunActionBase`, `stripSentinel(getActiveConfigPath())` in `Commands.cjs`); the todo should be closed, not folded.
- Configured-but-unusable Node.js path suppresses the cached-download fallback — IntelliJ Node bootstrap, unrelated.
- Live Windows check for the Node.js auto-install failure — maintainer-owned manual check, unrelated.
- Update live-interop tests for the getAllClassNames backend — interop test drift, unrelated.
- gradle-wrapper-hygiene fixture declares a stale Gradle version — testing hygiene, already fixed 2026-09-06 per project memory; unrelated.

</deferred>

---

*Phase: 85-config-hot-reload-with-restart-coalescing*
*Context gathered: 2026-09-06*
