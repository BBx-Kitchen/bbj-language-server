# Phase 86: IntelliJ Interop Settings & Targeted Refresh - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Phase Boundary

IntelliJ's "Refresh Java Classes" sends the language server's existing targeted
`bbj/refreshJavaClasses` request instead of restarting the whole language server, so
diagnostics, completion, hover and Structure View stay online while the Java class cache
reloads (CFG-04, #632). The java-interop port is auto-detected once, in one place, for every
reader of the IntelliJ settings (server initialization options, the interop health probe, the
Settings dialog), and a port the user explicitly chose — including 5008 — is never silently
overwritten (CFG-05, #608).

Not this phase: pushing interop host/port changes to a running IntelliJ server without a
restart (Settings Apply keeps its coalesced restart); VS Code port auto-detection (#608 is
IntelliJ-only); any change to the server-side refresh sequence or to VS Code's refresh command;
the interop reachability circuit breaker (Phase 91, RESP-02) — it only needs the refresh to
keep calling `clearCache()`, which the unchanged handler already does.

</domain>

<decisions>
## Implementation Decisions

### Port setting: auto-detect vs explicit (CFG-05, #608)
- **D-01:** The Settings dialog gains an **Auto-detect** checkbox for the java-interop port, on by default. While on, the port field is disabled and shows the detected value greyed out. Unchecked means explicit: whatever the field holds — including 5008 — is the user's choice and no code path other than the user's own Apply may write it. The persisted state gains one boolean for this (name is Claude's discretion; default `true`); the existing `javaInteropPort` int keeps carrying the explicit value. — **Reversibility:** costly — the flag is a persisted field in `BbjSettings.xml`; renaming or removing it later leaves stale user state behind and needs a migration read.
- **D-02:** Every reader gets the *effective* port from one accessor on `BbjSettings` (auto → detected-or-5008, explicit → stored value). `BbjLanguageServerFactory`'s `initializationOptions`, `BbjJavaInteropService.checkConnection`, and `BbjSettingsConfigurable.reset()` all call it; nothing outside `BbjSettings` reads the raw `javaInteropPort` field for the effective value any more (a source guard fences this). The dead `detectJavaInteropPort` call and the `== 5008` gate in `reset()` are removed.
- **D-03:** Auto-detect on but nothing detectable (no BBj Home, no `BBj.properties`, key absent or malformed): the greyed field shows 5008 and an inline hint line beneath the field says it is the default because no port was found in `BBj.properties`. No dialog, no validator warning.
- **D-04:** Upgrade migration for installs saved before the flag existed: a saved `javaInteropPort` other than 5008 means the user configured it → checkbox off, value kept. Nothing saved (IntelliJ's serializer never writes a field equal to its Java default, so 5008 and "never set" are the same on disk) → checkbox on. No existing non-default port is ever overwritten; default users gain detection without visiting Settings.
- **D-05:** Unchecking auto-detect leaves the field pre-filled with the current effective value (detected, or 5008), now editable. Re-checking discards any edits and returns to detection.
- **D-06:** Acceptance for "explicit 5008 is never overwritten": a unit test with state {auto=off, port=5008} and a `BBj.properties` naming port 6000 yields an effective port of 5008 everywhere, and `reset()` shows 5008 editable.

### Detection source & freshness
- **D-07:** Detection reads exactly one key, `com.basis.languageServer.addr`, whose value is `host\:port\:enabled` with Java-properties-escaped colons (live sample on this machine: `com.basis.languageServer.addr=localhost\:5008\:true` at `/opt/bbx/cfg/BBj.properties` line 67). The parser unescapes, splits on `:`, takes the second segment, validates 1–65535; anything else counts as "not detected" (D-03). The never-matching `java.interop.port=` / `bridge.port=` patterns are deleted — detection has been dead code against real installs.
- **D-08:** Only the port is detected. If the third segment (`enabled`) is `false`, the port is still used but the inline hint says the java-interop service is disabled in BBjServices. The host stays a manually edited field defaulting to `localhost`.
- **D-09:** Detection results are cached keyed on the properties file's path, mtime and size (the Phase 79 `BbjNodeVersionCache` precedent): the file is re-read only when the stat changes, so the EDT callers of `getState()` (`isModified()`) and the health probe's periodic reads do not hit the disk in the steady state. Nothing is persisted while auto-detect is on. The filesystem is injected so the parser and cache are plain-JUnit testable.
- **D-10:** When `BBj.properties` changes the port while the server is running, the running server learns it at its next start (Settings Apply or any other restart) through the normal `initializationOptions` channel; the health-probe widget reflects the new value on its next tick because it reads the accessor each time. No `BBj.properties` watcher and no new restart trigger.

### Targeted refresh on IntelliJ (CFG-04, #632)
- **D-11:** The roadmap's go/no-go is resolved **go**: LSP4IJ already issues this plugin's custom `bbj/compile` (Phase 81) and `bbj/resolvedConfigPath` (Phase 84) requests through the `BbjComposerServer` dynamic proxy without any restart. `bbj/refreshJavaClasses` is added to that single interface as a `@JsonRequest` returning the server's existing `Boolean`, and `BbjRefreshJavaClassesAction` calls it instead of `requestRestart(0)`. This closes research Pitfall 14 for the milestone; Phase 87's SETOPTS command layer inherits the answer and needs no spike.
- **D-12:** While the request runs, a non-cancellable `Task.Backgroundable` titled "Refreshing Java classes…" shows in the progress area — the `BbjCompileAction` shape, including the off-EDT assertion and the `BbjComposerService.server(project)` proxy lookup.
- **D-13:** Success is reported with one line in the BBj Language Server console tool window and nothing else; the progress task simply disappears. No balloon (status-bar-over-balloons rule; VS Code shows nothing on success either).
- **D-14:** Failure, timeout, or a null server proxy produces a reason-keyed warning balloon naming what failed, carrying a "Restart language server" action that routes through `BbjServerService.requestRestart` (EDT-05). The old full-restart behaviour survives only as this explicit, user-chosen fallback — never automatically.
- **D-15:** A per-project in-flight guard drops a second invocation while one refresh is running; the action stays enabled and the console notes that a refresh is already running. The request is bounded at 60 seconds (longer than Compile's 45 s because a large classpath reload takes longer).
- **D-16:** The server-side handler (`reloadJavaClassesAndRevalidate` in `main.ts`) and VS Code's `bbj.refreshJavaClasses` command are **unchanged**. The only server-visible change is one more name in the cross-language request-contract test.
- **D-17:** Settings Apply keeps its coalesced full restart, including for interop host/port changes — `initializationOptions` is the only channel that carries the port to the server on IntelliJ, so the restart stays correct. A no-restart settings push is a deferred idea.
- **D-18:** Proof for success criterion 2 (features stay available): plain-JUnit tests of the action flow against a `FakeComposerServer` (success, failure, timeout, null proxy, duplicate-while-running), a source-guard test that `BbjRefreshJavaClassesAction` never references `requestRestart`/`scheduleRestart`/`LanguageServerManager` outside the balloon action, the contract test gaining `bbj/refreshJavaClasses`, **plus** one recorded UAT hand check in a running IDE (trigger the refresh on a large classpath and invoke completion mid-refresh). Manual-only verification is not acceptable (research Pitfall 12).

### Documentation
- **D-19:** `documentation/docs/intellij/configuration.md` §"Java Interop → Port" is updated to describe the checkbox, the key it reads and the hint; today's text advertises auto-detection that never worked. (Not discussed explicitly; follows from D-01 being a user-visible settings change.)

### Claude's Discretion
- Names of the persisted auto flag, the effective-port accessor, the detector/cache classes, and where the parser lives (static on `BbjSettings` vs a small `InteropPortDetector` class with a `BbjSettingsLookups`-style result object).
- Exact hint, console and balloon wording; whether the checkbox sits before or after the port field; whether the hint is a `JBLabel` comment row or the field's empty text.
- Where the in-flight guard lives (project service vs. a static per-project map) and the timeout constant's name.
- Which malformed-value cases the parser test enumerates beyond: missing key, empty value, non-numeric port, out-of-range port, unescaped colons, `enabled=false`.

### Folded Todos
- **Strip EM Config `--` sentinel in getConfigPathArg and Commands.cjs run** (`.planning/todos/pending/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md`) — folded **to close it, not to build it**: Phase 84 D-12 already delivered both guards (`ConfigPaths.configPathArg` refuses the sentinel on IntelliJ; `stripSentinel(getActiveConfigPath())` on VS Code). This phase's deliverable for it is to move the todo to done with a note pointing at Phase 84; no code.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and issues
- `.planning/ROADMAP.md` §"Phase 86" — the three success criteria; criterion 1's go/no-go is answered by D-11.
- `.planning/REQUIREMENTS.md` — CFG-04, CFG-05 (this phase); RESP-02 (Phase 91) names "breaker resets on Refresh Java Classes", which the unchanged handler's `clearCache()` already satisfies.
- GitHub issue #632 — the `requestRestart(0)` evidence, VS Code's `client.sendRequest('bbj/refreshJavaClasses')` parity target, and the branching acceptance criterion D-11 resolves.
- GitHub issue #608 — the `reset()`-only detection, the `== 5008` equality gate, and the "never configured" sentinel requirement D-01/D-04 answer.

### Research (milestone-level)
- `.planning/research/ARCHITECTURE.md` §"Config Path Data Flow (#485, #486, #632, #608)" and the file/line evidence table rows for #608 and #632 — today's call sites; the `BbjCompileAction` background-task + bounded-future shape D-12 ports.
- `.planning/research/PITFALLS.md` §"Pitfall 14" (LSP4IJ custom-request capability — closed by D-11, record that closure for Phase 87) and §"Pitfall 12" plus the checklist row "IntelliJ composer/config-refresh test coverage" (no manual-only verification — D-18).
- `.planning/research/SUMMARY.md` §"Phase 3" delivery line and §"Research Flags" bullet on LSP4IJ custom requests.
- `.planning/research/FEATURES.md` rows "IntelliJ Refresh Java Classes via targeted request" and "java-interop port auto-detection for every settings reader".

### Prior-phase precedents
- `.planning/phases/84-config-path-resolution-discoverability-foundation/84-CONTEXT.md` — D-01 (single `BbjComposerServer` interface, `bbj/compile` precedent); D-15 (inline settings-field validation style D-03's hint follows).
- `.planning/phases/84-config-path-resolution-discoverability-foundation/84-04-SUMMARY.md` — IntelliJ JSON-boundary / request-contract / source-guard test families the new request joins.
- `.planning/phases/85-config-hot-reload-with-restart-coalescing/85-CONTEXT.md` — D-11 (every IntelliJ restart goes through `requestRestart`; the D-14 fallback action here obeys it), D-13/D-14 (status bar over balloons; console line pattern).
- `.planning/PROJECT.md` §"Key Decisions" — EDT-02/EDT-03 (`KeystrokeDebouncer`, stat-keyed `BbjNodeVersionCache` — D-09's model), EDT-05 (`requestRestart(long)` over `RestartGate`), "Plain-Java `Scheduler` seam", "Source-guard tests as the regression fence", "`bbj/compile` lives on the shared language server … flat `initializationOptions` key", "Status bar over notification balloons".

### Live data and docs
- `/opt/bbx/cfg/BBj.properties` line 67 (dev-container BBj install, outside the repo) — the real `com.basis.languageServer.addr=localhost\:5008\:true` line; copy it into the parser test fixture.
- `documentation/docs/intellij/configuration.md` §"Java Interop" — the Port section D-19 rewrites.
- `QA/FULL-TEST-CHECKLIST.md` — gains the D-18 hand-check row and a port auto-detect / explicit-5008 row.

### Folded todo
- `.planning/todos/pending/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` — close as delivered by Phase 84 D-12.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` (lines ~50–113) — `Task.Backgroundable` + `assertIsNonDispatchThread` + `BbjComposerService.server(project).get(timeout)` + bounded `server.compile(...).get(timeout)` + `CompileResultPresenter` rendering: the direct template for the rewritten refresh action (D-12, D-14, D-15).
- `bbj-intellij/.../composer/BbjComposerServer.java` — the single `getServerInterface()` proxy; `bbj/compile` and `bbj/resolvedConfigPath` show the `@JsonRequest` + javadoc convention for the new `bbj/refreshJavaClasses` method (D-11).
- `bbj-intellij/src/test/java/.../composer/ComposerRequestContractTest.java` (name list at lines 39–47) — add the new request name; the test already asserts every name against the language-server sources.
- `bbj-intellij/src/test/java/.../composer/ComposerFlowTest.java` `FakeComposerServer` — extend for the action-flow tests (D-18).
- `bbj-intellij/.../composer/ComposerNotices.java`, `ComposerFlow.java`, `compile/CompileResultPresenter.java` — reason-keyed balloon rendering for D-14; `BbjServerService.logToConsole` for D-13.
- `bbj-intellij/.../ui/BbjServerService.java` — `requestRestart(long)` (the only permitted restart entry for the D-14 fallback action), `getCurrentStatus()` (the action's existing `update()` gate on `ServerStatus.started`).
- `bbj-intellij/.../BbjSettings.java` — `State` fields, `getState()`'s home/node auto-detect shape (the pattern D-02 generalises via an accessor rather than field mutation), `detectJavaInteropPort` (to be replaced by the D-07 parser), `getBBjClasspathEntries` (existing `BBj.properties` line reader to share).
- `bbj-intellij/.../BbjSettingsConfigurable.java` — `isModified()` (lines ~43–58), `apply()` (~60–90, calls `scheduleRestart()` — unchanged per D-17), `reset()` port block (~136–148, the `== 5008` gate to delete).
- `bbj-intellij/.../BbjSettingsComponent.java` — port field construction and `ComponentValidator` (~184–203; empty text currently means 5008), `getJavaInteropPort`/`setJavaInteropPort` (~446–460), the `FormBuilder` rows (~297–298) where the checkbox and hint attach; `flushPendingHomeLookup`/`KeystrokeDebouncer` (Phase 79) if the hint must follow BBj Home edits.
- `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` (`initializeParams`, ~42–63) — `options.addProperty("javaInteropPort", …)` becomes an accessor call (D-02).
- `bbj-intellij/.../ui/BbjJavaInteropService.java` `checkConnection()` (~118–124) — reads host/port from `getState()` every tick; becomes an accessor call (D-02, D-10).
- `bbj-intellij/.../BbjNodeVersionCache` (Phase 79, EDT-03) — stat-keyed cache shape for D-09; `BbjSettingsLookups`-style result objects for "detected / not found / disabled".
- `bbj-vscode/src/language/main.ts` line 36 — `connection.onRequest('bbj/refreshJavaClasses', …)` returning `true`/`false`; `reloadJavaClassesAndRevalidate` (~81–110). Read-only for this phase (D-16).
- `bbj-vscode/src/extension.ts` (~797–806) — VS Code's `client.sendRequest('bbj/refreshJavaClasses')`, the behaviour to match.

### Established Patterns
- Every custom request family lives on `BbjComposerServer`; its name is a constant asserted by the contract test (Phases 81–85).
- All IntelliJ restart triggers funnel through `requestRestart(long)` (EDT-05); the refresh action must leave that set, and a source guard proves it.
- Settings paths do no filesystem I/O on the EDT (EDT-02); `getState()` is called from `isModified()` on the EDT, which is why D-09 caches on stat.
- Plain-JUnit seams with injected filesystem/time plus whole-file source guards, not live-IDE tests (Phases 79–85); one hand check at UAT for what only a running IDE shows.
- Status bar and console lines over balloons; balloons only for failures, reason-keyed (v3.7, Phase 82).
- Inline field hints/validation in the Settings dialog (Phase 84 D-15 config-path field).

### Integration Points
- `BbjRefreshJavaClassesAction.actionPerformed` — replace `requestRestart(0)` with the background task calling `server.refreshJavaClasses()`; keep `update()`'s started-gate and BGT thread.
- `BbjComposerServer` — new `@JsonRequest("bbj/refreshJavaClasses") CompletableFuture<Boolean> refreshJavaClasses()`.
- `BbjSettings` — new persisted auto flag, effective-port accessor, detector + stat cache; `BbjSettingsConfigurable.reset()/apply()/isModified()` and `BbjSettingsComponent` — checkbox, hint, prefill (D-01, D-03, D-05); migration logic in `loadState` or the accessor (D-04).
- `BbjLanguageServerFactory.initializeParams` and `BbjJavaInteropService.checkConnection` — switch to the accessor.
- Tests: new `BbjRefreshJavaClassesActionTest` (fake server), `…SourceGuardTest` (no restart calls), `ComposerRequestContractTest` name, detector/cache/migration unit tests, `BbjSettingsComponentSourceGuardTest` extension for the raw-field fence.
- `documentation/docs/intellij/configuration.md`, `QA/FULL-TEST-CHECKLIST.md`.
- `.planning/todos/pending/2026-08-22-strip-em-config-sentinel-…md` → done (folded to close).

</code_context>

<specifics>
## Specific Ideas

- Port auto-detection on IntelliJ is dead code today: the detector's `java.interop.port=` / `bridge.port=` patterns never match a real `BBj.properties`, whose key is `com.basis.languageServer.addr=localhost\:5008\:true`. The parser test must use that exact escaped line as its fixture.
- IntelliJ's `PersistentStateComponent` serializer omits fields equal to their Java default, so "explicitly 5008" cannot be represented by the int alone — that is why the auto flag exists (D-01) and why the upgrade rule is inferred from a saved non-5008 value (D-04).
- The regression pair for CFG-05: (a) {auto=on, properties say 6000} → every reader sees 6000; (b) {auto=off, port=5008, properties say 6000} → every reader sees 5008 and `reset()` shows 5008 editable.
- The UAT hand check for CFG-04: on a workspace with a large classpath, trigger Refresh Java Classes, and while the progress task is visible, invoke completion and hover in an open `.bbj` file; both must answer, and the server status widget must never leave "started".
- The D-14 fallback action is the only place the phase may mention `requestRestart`; the source guard should allow exactly that reference.

</specifics>

<deferred>
## Deferred Ideas

- **Push interop host/port changes to a running IntelliJ server without a restart** (a `bbj/…` connection-config request mirroring VS Code's `onDidChangeConfiguration` path) — D-17 keeps the Apply restart; revisit if the restart on port change becomes a complaint.
- **Restart on Apply only when server-relevant fields changed** — optimisation unrelated to CFG-04/05.
- **Auto-detect the interop host from the same `com.basis.languageServer.addr` key** — D-08 keeps host manual; trivial to add later under the same checkbox.
- **Watch `BBj.properties` and react to port changes live** — D-10 chose next-start propagation; would be a new watcher, in the spirit of Phase 85's config watcher.
- **VS Code java-interop port auto-detection** — #608 is IntelliJ-only; VS Code has no detection at all today.
- **Structured `bbj/refreshJavaClasses` result** (class count, duration, reason) for richer feedback — D-16 keeps the boolean.
- **Narrow the refresh re-validation to open documents** — Phase 91 workspace-size territory (RESP-01).

### Reviewed Todos (not folded)
- Update live-interop tests for the getAllClassNames backend — interop *test* drift in `linking.test.ts`/`issue447`, unrelated to the IntelliJ settings/refresh surface; environment drift, not a regression.
- Configured-but-unusable Node.js path suppresses the cached-download fallback — IntelliJ Node bootstrap, unrelated.
- Live Windows check for the Node.js auto-install failure — maintainer-owned manual check, unrelated.

</deferred>

---

*Phase: 86-intellij-interop-settings-targeted-refresh*
*Context gathered: 2026-09-07*
