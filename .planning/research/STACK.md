# Stack Research

**Domain:** Dual-IDE language server polish milestone (VS Code + IntelliJ via LSP4IJ, shared Langium LS)
**Researched:** 2026-09-06
**Confidence:** MEDIUM-HIGH (core findings verified against installed package source and this repo's own existing code; a few IntelliJ-side visual-cue findings are LOW/community-forum-only and flagged)

## Bottom line

**No new runtime dependency is required for any of the 23 v4.3 issues.** Every capability in
scope is reachable with APIs already present in this repo's two existing frameworks — Langium 4.x
(bundled utility exports the code doesn't use yet) and LSP4IJ 0.21.0 (an extension pattern this
repo already exercises for `bbj/composer/*` and `bbj/compile`) — plus VS Code's and IntelliJ's own
built-in platform APIs. The work in this milestone is almost entirely "use more of what's already
installed," not "install something new." This also matches the milestone's own framing (composer
robustness, config reload, responsiveness) — none of it is a new product surface.

One version-drift correction: `.planning/PROJECT.md`'s "Tech stack" line says Langium 4.1.3 /
Chevrotain 11.0.3 / Vitest 1.6.1, but `bbj-vscode/package.json` (read directly for this research)
pins `langium: ~4.3.1`, `chevrotain: ~12.0.0`, `vitest: ^4.1.10` — confirmed live in
`node_modules`. Treat 4.3.1/12.0.0/4.1.10 as current for any version-sensitive planning; flag the
PROJECT.md line for a housekeeping update outside this milestone's scope.

## Recommended Stack

### Core Technologies (unchanged — confirmed current)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Langium | 4.3.1 (installed; `node_modules/langium/package.json`) | Language server framework | Already the project's framework; the caching APIs this milestone needs (`DocumentCache`, `WorkspaceCache`) ship in this exact installed version — read directly from `node_modules/langium/lib/utils/caching.js`, re-exported from the package root via `utils/index.js` |
| LSP4IJ | 0.21.0 (Gradle pin in `bbj-intellij/build.gradle.kts`) | IntelliJ↔LSP bridge | Already the project's IntelliJ integration layer; its custom-request extension pattern (`getServerInterface()` + `@JsonRequest`) is already proven in this exact repo for `bbj/composer/*` (`BbjComposerServer.java`) and `bbj/compile` |
| IntelliJ Platform SDK | 2024.2+ (Community Edition compile target; `intellijIdeaCommunity("2024.2")`) | IntelliJ plugin host | Unchanged; all new-feature APIs below are checked for Community Edition availability specifically because this constraint is load-bearing (PROJECT.md Constraints) |

### Supporting Libraries / APIs Newly Exercised This Milestone

None of these are new `npm install` / new Gradle `dependencies {}` entries — they are APIs already
shipped inside the pinned Langium/VS Code/IntelliJ-Platform/LSP4IJ versions above, simply not yet
called from this codebase.

| API | Ships in | Purpose | When to Use (this milestone) |
|-----|----------|---------|-------------------------------|
| `DocumentCache<K,V>` (from `langium`) | Langium 4.3.1, `src/utils/caching.ts` | Cache scoped to one document; auto-evicts on that document's own rebuild/deletion via `DocumentBuilder.onUpdate`/`onDocumentPhase` | #505's `getBBjClassesFromFile()` per-file lookup cache in `bbj-scope.ts:308-331` — key by the resolved file URI, exactly the "evict when *that* document changes" semantics the issue asks for |
| `AstUtils.streamAst(...).iterator()` + `treeIter.prune()` | Langium 4.3.1 (already imported in `bbj-linker.ts:47-58`) | Skip subtrees during an AST walk | #505's `collectLocalSymbols()` in `bbj-scope-local.ts:106-114` — mirror `bbj-linker.ts`'s existing `isExternalDocument` + `prune()` pattern verbatim; it is already proven code in this repo, just not applied to this second walker |
| LSP4IJ `LanguageServerFactory#getServerInterface()` + a `@JsonRequest`-annotated interface extending `org.eclipse.lsp4j.services.LanguageServer`, resolved via `LanguageServerManager.getInstance(project).getLanguageServer(id)` → `LanguageServerItem` | LSP4IJ 0.21.0 | Send one targeted request to a running server without restarting it | #632 — the LS side already has a working, no-restart handler: `connection.onRequest('bbj/refreshJavaClasses', ...)` in `bbj-vscode/src/language/main.ts:33`, called today by VS Code via a plain `client.sendRequest('bbj/refreshJavaClasses')`. IntelliJ needs only to add one more method to the *existing* `BbjComposerServer` interface (or a small sibling interface) and call it from `BbjRefreshJavaClassesAction.java`, replacing its current `BbjServerService.getInstance(project).restart()` call. This answers #632's own open question ("is a non-restart request buildable?") definitively yes, using a pattern already merged in this repo. |
| `vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(baseUri, pattern))` | VS Code API (`^1.101.0`, already a dependency) | Watch a specific file/directory, including ones **outside** the open workspace folder | #486/#485 — the resolved config file (`bbj.configPath` or `{bbj.home}/cfg/config.bbx`) usually lives outside the workspace. The extension's only existing watcher, `vscode.workspace.createFileSystemWatcher('**/*.bbj')` (`extension.ts:863`), is a bare glob string — VS Code scopes bare-string patterns to the workspace only and silently drops events for paths outside it. A `RelativePattern` built from `vscode.Uri.file(dirname(configPath))` is required; a plain string pattern will not work here and would look like a bug where the watcher "just never fires" |
| `vscode.languages.setTextDocumentLanguage(document, 'bbx-config')` | VS Code API | Dynamically assign a language ID to an already-open document, independent of filename | #485 — a custom-named config file gets no `bbx-config` association today because both VS Code's `contributes.languages.filenames` and IntelliJ's TextMate bundle key off a fixed filename list (`config.bbx`, `Config.bbx`, `config.min`, `Config.min`). Call this from an `onDidOpenTextDocument`/`workspace.textDocuments` scan whenever the opened file's path matches the *resolved* `bbj.configPath`, regardless of its basename. Known caveat (confirmed via VS Code issue tracker): calling it fires a synthetic close+reopen of the document and the language can revert if the user later touches the editor's language-mode picker — acceptable here since this only applies to a file the user isn't meant to hand-pick a language for |
| `com.intellij.openapi.vfs.AsyncFileListener` (preferred) or `BulkFileListener` on `VirtualFileManager.VFS_CHANGES` | IntelliJ Platform (already available at 2024.2) | React to a file changing on disk, including a file outside the current project's content roots | #486/#485 IntelliJ side — `AsyncFileListener` is JetBrains' current recommendation over `BulkFileListener` for new code (non-blocking, off-EDT prepare phase); `BulkFileListener` is simpler and this repo has no precedent for either yet. Either fires on VFS refresh; a config file edited by BBjServices/another process outside the IDE needs the IDE to notice the disk change on next VFS refresh, same caveat VS Code's own watcher has |
| `com.intellij.openapi.fileTypes.FileTypeOverrider` (`com.intellij.fileTypeOverrider` EP) | IntelliJ Platform | Override the file type IntelliJ assigns to a specific `VirtualFile`, independent of its name/extension | #485 IntelliJ side — same problem as the VS Code language-id case: today's TextMate bundle only recognizes the fixed filename list. A `FileTypeOverrider` that returns the `bbx-config` file type when the file's path equals the resolved `bbj.configPath` setting is the documented mechanism for "this one file, regardless of name, is type X." Do not reach for `LanguageSubstitutor` — that overrides which *language* attaches to an already-typed file, not which file *type* a filename maps to; `FileTypeOverrider` is the correct EP for "this filename doesn't match my pattern list, treat it as mine anyway" |
| `com.intellij.util.Alarm` (already a project dependency: PROJECT.md's Phase 79 `AlarmScheduler`/`Scheduler` seam) | IntelliJ Platform | Debounce / coalesce repeated triggers on a background or pooled thread | #611 (composer dialog keystroke debounce) — reuse the *exact* seam this repo built in Phase 79 (`Scheduler` interface + `AlarmScheduler` adapter + `ManualScheduler` test double, used today by `RestartGate` and `KeystrokeDebouncer`). Do not hand-roll a second `javax.swing.Timer`-based debouncer for the composer dialogs; wire `MsgboxComposerDialog`/`AddWindowComposerDialog`/`AddChildWindowComposerDialog`'s `SimpleDocumentListener` through the same `Scheduler` seam so the existing `ManualScheduler` unit-test double covers it too |
| Plain per-project field/cache on the existing `ComposerLauncher`/`BbjComposerService` (no new class of infrastructure) | n/a — application code | Cache the resolved `BbjComposerServer` proxy and the static `ComposerCatalogs` payload for the life of one language-server run | #612 — this catalog is a module-level constant array on the LS side (`composer-commands.ts:52-57`) that "never changes at runtime" per the issue's own evidence; a `Map<Project, CachedComposerHandle>`-style field invalidated on LS restart is enough. No caching library needed — this is exactly the shape `TokenValidationCache` and `BbjNodeVersionCache` already take elsewhere in `bbj-intellij` (static/field-based memoization keyed on a cheap identity, no TTL library) |

### Development Tools

No new dev tooling. Existing Vitest 4.1.10 (V8 coverage) and JUnit 5 (via `junit-bom:5.10.2`) cover
every regression test this milestone's issues ask for, including the synthetic multi-document
workspace timing test #505 wants and the simulated-unreachable-peer test #504 wants (both plain
async/timer-based Vitest tests, no new test harness).

## Installation

```bash
# No new npm packages and no new Gradle dependencies for this milestone.
# Every new capability above is exercised through an API already vendored by:
#   - langium (bbj-vscode/package.json: "langium": "~4.3.1")
#   - vscode engine (bbj-vscode/package.json: "engines".vscode "^1.101.0")
#   - the IntelliJ Platform Gradle Plugin's Community Edition target (2024.2)
#   - LSP4IJ (bbj-intellij/build.gradle.kts: plugin("com.redhat.devtools.lsp4ij:0.21.0"))
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Hand-rolled reachability circuit breaker in `java-interop.ts` (a boolean/timestamp gate around the existing `acquireLock`/`resolveClassByName` path, reset in `clearCache()`) | A library such as `opossum` or `cockatiel` | Only if the interop client grows more sophisticated failure modes (half-open probing, exponential backoff, per-endpoint state) than "one peer, unreachable or not." The actual requirement (#504) is one boolean plus one timestamp gating a single 10s-timeout code path that already exists (`RESOLUTION_TIMEOUT_MS`) — a library's state-machine/half-open/event-emitter machinery solves a much bigger problem than this one has, adds a bundle-size cost to a `--platform=node --external:vscode` esbuild bundle that currently has zero non-Langium runtime deps of this kind, and this project has no other circuit-breaker use site to amortize the dependency against. This is the "conservative validation" pattern this codebase already favors (see MEMORY.md: `builtin-call-validation-stays-conservative`) applied to infra code instead of type-checking |
| `com.intellij.util.Alarm`-backed `Scheduler` seam (Phase 79's existing abstraction) | A dedicated Java debounce library (e.g. RxJava `debounce`, Guava `RateLimiter`) | Only if `bbj-intellij` ever adopts a reactive-streams dependency for other reasons — introducing RxJava solely to debounce three `DocumentListener`s is disproportionate, and it would bypass the plain-Java-seam-for-testability pattern (MEMORY.md: `plain-java-seams-for-intellij-testability`) this repo has standardized on precisely because `bbj-intellij` has no live-IDE test harness |
| `AsyncFileListener` (or `BulkFileListener`) + `FileTypeOverrider` for IntelliJ's external-config-file handling | A custom polling thread watching `File.lastModified()` | Never for this milestone — IntelliJ's VFS already does OS-level watching including outside content roots (with the same "next refresh" caveat VS Code's watcher has); a hand-rolled poller would duplicate platform machinery the plugin already gets for free and would need its own lifecycle/dispose wiring |
| `CodeVisionProvider` **or** `LineMarkerProvider` for IntelliJ's composer-discoverability cue (#650) — see note below | `EditorNotificationProvider` (top-of-editor banner) | Only if the desired cue is file-scoped ("this file has SETOPTS composers available") rather than statement-scoped ("this specific MSGBOX call has a composer"). The issue explicitly wants a per-statement cue matching VS Code's line-scoped lightbulb/CodeLens, which rules out a whole-editor banner |

**#650 IntelliJ visual-cue decision needs a spike, not a pre-commitment (LOW confidence, flag for
phase-level research):** two IntelliJ Platform mechanisms are plausible and neither was cross-verified
against an authoritative source beyond community-forum discussion:
- **`LineMarkerProvider`** (`com.intellij.codeInsight.daemon.LineMarkerProvider`) — a gutter icon to the
  left of the line, clickable via `GutterIconNavigationHandler`/`NavigationGutterIconBuilder`. Long-stable
  API, used by hundreds of third-party CE-compatible plugins, matches this project's risk posture (v3.6
  already burned a phase migrating off IntelliJ APIs that drifted). **Recommended default** unless a
  spike shows it reads as too subtle next to VS Code's inline lightbulb.
- **`CodeVisionProvider`** (`com.intellij.codeInsight.codeVisionProvider` EP, `platform-lang-impl` module)
  — renders inline, clickable text above/beside a code line, the closer visual analog to VS Code's
  CodeLens. Available since roughly 2022.3 and lives in the base `lang-impl` module (present in Community
  Edition, not an Ultimate-only module), but a JetBrains support thread surfaced version-to-version
  registration issues for this EP, so it carries more API-churn risk than `LineMarkerProvider` — the same
  category of risk this project's Phase 83 already spent effort fencing for LSP4IJ's `@ApiStatus.Experimental`
  surface. **Do not commit to `CodeVisionProvider` without a same-phase compile+run spike against the
  2024.2-2026.1 range** this plugin already claims to support (`sinceBuild = "242"`).

Both are zero-dependency (built into the IntelliJ Platform SDK already on the classpath) — this is a
choice between two already-available APIs, not a library decision.

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| A circuit-breaker npm package (`opossum`, `cockatiel`, etc.) for #504 | Over-engineered for "one peer, unreachable or not, gate re-attempts for N seconds"; adds a dependency to a bundle that has none of this shape today | Hand-rolled boolean+timestamp gate inside `java-interop.ts`, reset by the existing `clearCache()` |
| A generic JS/TS debounce library (`lodash.debounce`, `debounce` npm package) for anything in `bbj-vscode` | Every debounce need in this milestone (config-file-watcher reload) is a one-shot `setTimeout`/trailing-edge pattern this codebase already implements natively for BBjCPL (`bbj-document-validator.ts`'s 500ms trailing-edge debounce, per PROJECT.md's Key Decisions) | Copy that same trailing-edge `setTimeout` pattern for the config-file watcher's debounced reload |
| `LanguageSubstitutor` for IntelliJ's custom-config-file association (#485) | Wrong extension point — it changes which *language* PSI attaches to a file the platform has *already* typed; it does not change *file-type* detection for a filename outside the registered pattern list, which is the actual problem here | `FileTypeOverrider` (`com.intellij.fileTypeOverrider`) |
| `Thread.sleep`/polling loops for any of the new IntelliJ file-watching or debounce work | This exact anti-pattern was the subject of a whole v4.2 phase (EDT-04: "zero `Thread.sleep` in `BbjServerService`"); reintroducing it anywhere would contradict a standing, source-guard-enforced decision | `Alarm`/`AsyncFileListener`, both already used or already the recommended seam in this repo |
| Reactive/RxJava-style stream libraries in `bbj-intellij` for composer debounce or catalog caching | No existing use in this module; would introduce a second concurrency paradigm alongside the plain-Java `Scheduler` seam this repo already standardized on for exactly this kind of problem | The existing `Scheduler`/`Alarm` seam (#611) and a plain memoizing field (#612) |
| A new `bbj/composer/setopts/*`-adjacent *library* for SETOPTS bit/byte arithmetic (#633, #475) | The shared catalog and codec logic already exists on the LS side (`setopts-catalog.ts`, referenced by both issues) and the composer JSON-RPC layer pattern (`composer-commands.ts`) is proven for three composers already; this is a "port/extend existing code," not a "pick a bitfield library" problem | Extend `composer-commands.ts` with `bbj/composer/setopts/*` handlers following the `bbj/composer/addwindow/*` shape exactly, then a `SetoptsComposerDialog.java` mirroring `AddWindowComposerDialog.java` |

## Stack Patterns by Variant

**If the composer-discoverability cue (#650) needs to look identical in spirit on both IDEs:**
- VS Code side needs no new API at all — extend the *already-existing* `vscode.languages.registerCodeLensProvider`
  usage (currently scoped to `BBX_CONFIG`/SETOPTS in `setopts-composer-ui.ts:28`) to also cover `.bbj`
  files for MSGBOX/addWindow/CVS composer-eligible lines, following the same `SetOptsCodeLensProvider`
  shape.
- IntelliJ side: spike `LineMarkerProvider` first (see Alternatives above); fall back to `CodeVisionProvider`
  only if the gutter icon reads as insufficiently visible in UAT.

**If the config-file watcher (#486) needs to survive `bbj.configPath` changing at runtime:**
- Dispose and recreate the `RelativePattern`-based `FileSystemWatcher` (VS Code) / VFS listener scope
  (IntelliJ) whenever the setting itself changes, mirroring the existing settings-change-detection guard
  already used for `bbj.interop.host`/`bbj.interop.port` hot-reload (PROJECT.md Key Decisions, v3.1).

**If #505's per-file cache and #504's circuit breaker land in the same phase:**
- Both touch `java-interop.ts`/`bbj-scope.ts` under the same "unbounded per-request cost" problem class;
  sequence #505 (cache) before #504 (breaker) since the breaker's regression test (simulated unreachable
  peer, N distinct classes) is cleaner to write against a codebase that already caches per-file lookups,
  reducing incidental scope-resolution noise in that test's assertions.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `langium@~4.3.1` | `langium-cli@~4.3.0`, `chevrotain@~12.0.0` | All three already pinned together in `bbj-vscode/package.json`; `DocumentCache`/`WorkspaceCache` have shipped unchanged in Langium's public API surface since the 3.x→4.x line (no migration needed to use them, unlike the `PrecomputedScopes`→`LocalSymbols` rename this repo already completed in v2.0) |
| `com.redhat.devtools.lsp4ij:0.21.0` (compile-time Gradle pin) | IntelliJ Platform 2024.2+ (`sinceBuild = "242"`), no `<depends>` version constraint possible | Per this repo's own recorded decision (`build.gradle.kts` comment, PROJECT.md Key Decisions): the plugin descriptor cannot pin LSP4IJ's *runtime* version, so a Marketplace user may run a newer LSP4IJ than 0.21.0. The `getServerInterface()`/`LanguageServerManager`/`LanguageServerItem` custom-request pattern recommended for #632 is the same class of LSP4IJ-coupling surface already fenced by Phase 83's reflective signature canaries (#544) — any new custom-request interface added for #632 should be added to that same canary/allowlist, not left unguarded |
| VS Code engine `^1.101.0` | `vscode-languageclient@^10.1.0` | `RelativePattern`-based `FileSystemWatcher` and `languages.setTextDocumentLanguage` are long-stable VS Code APIs (predate 1.101 by years); no engine bump needed for either |
| IntelliJ Platform 2024.2 (Community) | `FileTypeOverrider`, `AsyncFileListener`, `BulkFileListener`, `LineMarkerProvider`, `Alarm` | All five are base-`lang`/`core`-module APIs, present in Community Edition; `CodeVisionProvider` is also base-module (`lang-impl`) but carries the version-churn caveat noted above — verify against this plugin's actual `sinceBuild=242`/`untilBuild=null` range with a same-phase spike before committing to it |

## Sources

- `bbj-vscode/node_modules/langium/lib/utils/caching.js` / `.d.ts` (installed package source, read directly) — `DocumentCache`/`WorkspaceCache`/`ContextCache`/`SimpleCache` signatures and eviction semantics — HIGH confidence (primary source, matches installed version)
- `bbj-vscode/node_modules/langium/package.json` — confirms installed Langium is 4.3.1, not the 4.1.3 recorded in PROJECT.md — HIGH confidence
- `bbj-vscode/src/language/bbj-linker.ts:45-58`, `bbj-scope.ts:308-331`, `bbj-scope-local.ts:106-126` (read directly) — existing `treeIter.prune()`/`isExternalDocument` pattern and the exact methods #505 targets — HIGH confidence
- `bbj-vscode/src/language/java-interop.ts:42-46,106-115,585-591,798-820,873-943` (read directly) — existing lock/timeout/`clearCache()` shape #504's breaker must fit into — HIGH confidence
- `bbj-vscode/src/language/composer-commands.ts:11-206`, `bbj-vscode/src/language/main.ts:33` (read directly) — existing `bbj/composer/*` and `bbj/refreshJavaClasses` request registrations — HIGH confidence
- `bbj-vscode/src/setopts-composer-ui.ts:6-90` (read directly) — existing `vscode.languages.registerCodeLensProvider` pattern already shipped for SETOPTS — HIGH confidence
- `bbj-vscode/src/extension.ts:700-706,863` (read directly) — existing `bbj.refreshJavaClasses` command and the workspace-scoped `'**/*.bbj'` glob watcher #486 must move beyond — HIGH confidence
- `bbj-intellij/build.gradle.kts:26-38` (read directly) — LSP4IJ 0.21.0 Gradle pin and its "cannot pin runtime version" rationale — HIGH confidence
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java:1-58` (read directly) — proves the `getServerInterface()` + `@JsonRequest` custom-request pattern is already live in this exact repo — HIGH confidence
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:21,215` (read directly) — confirms `LanguageServerManager` already imported/used here — HIGH confidence
- [LSP4IJ DeveloperGuide.md](https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md) (official repo docs, fetched directly) — confirms `getServerInterface()` / `LanguageServerItem.getServer()` / `LanguageServerManager.getInstance(project).getLanguageServer(id)` custom-request flow, cross-checked against community-forum summaries — MEDIUM confidence (verified against two independent sources)
- IntelliJ Platform SDK docs and community threads on `LineMarkerProvider`, `FileTypeOverrider`, `BulkFileListener`/`AsyncFileListener`, `com.intellij.util.Alarm`, `CodeVisionProvider` — LOW confidence (WebSearch summaries only, not independently cross-verified against a second source); treat the #650 visual-cue choice as needing a same-phase spike, not a locked decision
- VS Code issue tracker discussion on `RelativePattern`-based watching outside the workspace and `setTextDocumentLanguage` persistence caveats — LOW confidence (community/issue-tracker discussion, not official API reference text)

---
*Stack research for: BBj Language Server v4.3 Polish & Quality milestone*
*Researched: 2026-09-06*
