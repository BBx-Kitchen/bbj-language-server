# Project Research Summary

**Project:** BBj Language Server — v4.3 Polish & Quality milestone
**Domain:** Polish/quality milestone for an existing dual-IDE (VS Code + IntelliJ via LSP4IJ) Langium-based language server; 23 already-triaged GitHub issues (milestone #5) across three themes: composer discoverability & coverage, config changes without restart, and responsiveness/hangs
**Researched:** 2026-09-06
**Confidence:** HIGH

## Executive Summary

This is not a green-field feature build — it is an integration and hardening pass across 23 pre-triaged issues that all attach to four existing seams: the shared editor-agnostic composer modules (`*-composer.ts` + `composer-commands.ts`/`BbjComposerServer.java`), the Phase 79 `Scheduler`/`RestartGate` concurrency seam on IntelliJ, the Phase 82 `ComposerFlow`/`StaleEditGuard`/`ComposerNotices` composer-robustness seam, and the java-interop client's caching/locking internals. No new runtime dependency is needed anywhere in scope: every capability (per-document caching, AST pruning, debounced file watching, dynamic language association, targeted no-restart requests, LSP CodeLens) is reachable through APIs already vendored by Langium 4.3.1, VS Code's API, IntelliJ Platform 2024.2 Community Edition, and LSP4IJ 0.21.0 — the work is "use more of what's installed," not "install something new." One housekeeping note: PROJECT.md's recorded stack versions (Langium 4.1.3/Chevrotain 11.0.3/Vitest 1.6.1) are stale relative to `package.json`'s actual pins (4.3.1/12.0.0/4.1.10) and should be corrected outside this milestone.

The recommended approach is architecturally opinionated in one important way: composer discoverability (#650) should be implemented once, as a shared `textDocument/codeLens` handler on the language server, rather than as separate per-IDE mechanisms. VS Code renders LSP CodeLens natively; LSP4IJ maps the same protocol response into IntelliJ's native "Code Vision" inline entries — meaning one server-side implementation (reusing the `*decodeCall`/`*parseLine` detectors that already exist per composer in `composer-commands.ts`) gives both IDEs a working, always-visible cue with zero PSI/LineMarkerProvider work on the IntelliJ side (this plugin has no native BBj PSI — a `LineMarkerProvider` would need a `PsiElement` it cannot supply without a shadow PSI tree). This single decision upstream-unblocks #648, #649, and #633's own discoverability stories "for free."

Key risks cluster in two places. First, config hot-reload (#486/#485) introduces a *new* failure class this codebase has been burned by before (#232's rebuild-loop CPU spike): a watcher that isn't scoped to the resolved, symlink-followed, out-of-workspace absolute path will silently no-op; and once #633's SETOPTS composer can write `config.bbx` itself, the watcher must suppress reacting to its own writes or it creates a self-inflicted restart loop mid-composer-session. Second, the responsiveness fixes (#505, #504, #497, #498) are non-trivial concurrency corrections to already-subtle code (LRU eviction races, shared cancellation tokens, unbounded scans) where the "obvious" fix commonly reintroduces the same class of bug one layer down (e.g., an LRU pin that's never unpinned on the timeout/cancellation exit path, or a request-scoped cancel token that's accidentally memoized). Both risk clusters have concrete, already-modeled mitigations in this repo's own history (Phase 79's `RestartGate`, Phase 82's `StaleEditGuard`, the "no fourth outcome" guarantee pattern) — the roadmap should sequence work to reuse those seams rather than re-deriving them.

## Key Findings

### Recommended Stack

No new npm packages or Gradle dependencies for any of the 23 issues. Core technologies are unchanged: Langium 4.3.1 (`DocumentCache`/`WorkspaceCache` and `AstUtils.streamAst().iterator().prune()` ship in the exact installed version, unused so far), LSP4IJ 0.21.0 (`getServerInterface()` + `@JsonRequest` custom-request pattern already proven in this repo for `bbj/composer/*`), and IntelliJ Platform SDK 2024.2+ Community Edition (hard compatibility constraint). New capabilities are all reached via already-vendored APIs: `vscode.workspace.createFileSystemWatcher(new RelativePattern(...))` for out-of-workspace config watching, `vscode.languages.setTextDocumentLanguage` for dynamic language association, `AsyncFileListener`/`FileTypeOverrider` for the IntelliJ-side equivalents, and `com.intellij.util.Alarm` (via the existing `Scheduler` seam) for debounce. The one open, LOW-confidence spike needed is IntelliJ's composer-cue rendering mechanism if LSP CodeLens/Code-Vision doesn't read as visible enough in UAT (`LineMarkerProvider` vs. `CodeVisionProvider`, the latter carrying more API-churn risk).

**Core technologies:**
- Langium 4.3.1 — language server framework — already in place; ships the caching/AST-pruning primitives this milestone needs but hasn't used yet
- LSP4IJ 0.21.0 — IntelliJ↔LSP bridge — its custom-request extension pattern is already proven in this repo (`BbjComposerServer.java`)
- IntelliJ Platform SDK 2024.2+ (Community Edition) — plugin host — all new-feature APIs are Community-Edition-available, verified because this constraint is load-bearing

### Expected Features

Scope is fixed to 23 already-triaged issues, not an open feature set to prioritize from — the research instead surfaces which issues are "table stakes per their own acceptance criteria" vs. worth extending, and one architecture-shaping decision (CodeLens routing) that changes what several issues actually build.

**Must have (table stakes — committed per each issue's own acceptance criteria):**
- Visible, non-intrusive composer cue in both IDEs for all five composers (#650)
- MSGBOX composer offered for expression-valued options, not just bare integers (#648)
- CVS() visual composer, parity with existing three composers (#649)
- SETOPTS composer ported to IntelliJ (#633) + SETOPTS-in-code decode hovers and tri-state composer (#475)
- Composer edit validation before applying + re-validation of captured coordinates + webview listener disposal (#623, #532, #530)
- IntelliJ composer dialog debounce + server/catalog caching (#611, #612)
- Config file watched and reloaded on change (#486), custom-named/located config honored everywhere including editor language association (#485)
- IntelliJ targeted "Refresh Java Classes" without full restart (#632), java-interop port auto-detection fixed for every settings reader (#608)
- Workspace-size-independent scope resolution (#505), interop reachability circuit breaker (#504), LRU eviction race fix (#497), shared cancellation-token fix (#498), mtime-safe decompile freshness check (#500), stale in-flight format promise fix (#499)
- Small hygiene fixes: no-editor-focused command guards (#512), disposed VS Code registrations (#531), IntelliJ status-bar widgets following tab switches (#610)

**Should have (differentiators worth doing because the codebase already pays for it):**
- Route all five composers' discoverability cues through one shared LSP `textDocument/codeLens` handler instead of per-client/per-composer mechanisms
- Resolve `BBjMsgBox.X+BBjMsgBox.Y`-style constant-sum expressions to a numeric preview via java-interop before falling back to compose-only mode
- Give CVS()'s new catalog the same `since`-version-gate annotation shape `setopts-catalog.ts` already uses
- Debounce + silent auto-restart with a status-bar breadcrumb for config-watcher reload (not a blocking prompt), consistent with the existing BBjCPL "status bar over notification balloons" convention

**Explicitly out of scope / anti-features (tempting but wrong here):**
- General constant-folding/expression evaluation for MSGBOX/CVS() options beyond the specific `+`-joined constant-field pattern
- "Decode-and-edit-in-place" for every SETOPTS-in-code shape (the effective options vector is a runtime value; only two statically-safe shapes are soundly decodable)
- Silent unconditional auto-restart on every config write with no debounce/signal
- A native IntelliJ `LineMarkerProvider` built independently of the language server (no PSI to attach to in this LSP4IJ-only architecture)
- Purely client-side filename-pattern extension for #485 (solves syntax highlighting only, not the runtime-path-gated tooling)

### Architecture Approach

Every one of the 23 issues attaches to one of four existing seams — none require a new subsystem. The shared composer modules (`*-composer.ts` + `composer-commands.ts`) are the single source of truth for composer logic, reached in-process by VS Code's webviews and over LSP custom requests (`bbj/composer/*`) by IntelliJ; a fix to the shared module benefits both hosts automatically. The config path is today resolved in exactly one place (`bbj-ws-manager.ts`), read once at `initializeWorkspace()` with no watcher — #485 must expose that resolution to both hosts (recommended via a new small `bbj/resolvedConfigPath`-style LSP query, avoiding duplicated fallback logic per host) before #486 can watch the right file. IntelliJ has three mature, testable seams from Phase 79/81/82 (`Scheduler`/`AlarmScheduler`, `RestartGate`, `ComposerFlow`/`StaleEditGuard`/`ComposerNotices`) that this milestone's IntelliJ-side issues should extend rather than duplicate.

**Major components:**
1. `composer-commands.ts` / `BbjComposerServer.java` — single source of truth for all composer flag arithmetic and per-line applicability detection; net-new `setopts`/`cvs` sections follow the exact msgbox/addwindow/addchildwindow three-part shape (catalog, preview/compose/decodeCall handlers, auto-registration loop)
2. `bbj-ws-manager.ts` — sole owner of config-path resolution; needs to expose its resolved-path logic to both hosts and gain a debounced watch-and-restart path
3. IntelliJ concurrency/composer seams (`Scheduler`/`AlarmScheduler`, `RestartGate`, `ComposerFlow`/`StaleEditGuard`) — reusable infrastructure for debounce, coalesced restarts, and re-validation-before-apply, already proven in Phase 79-83
4. `java-interop.ts` — locking, LRU cache, and resolution-timeout internals underlying the four responsiveness fixes (#505, #504, #497 all trace back to issue #232's original CPU-spike report but are independently fixable)

### Critical Pitfalls

1. **Config watcher scoped like the existing workspace-relative `**/*.bbj` watcher misses out-of-workspace config files entirely** — build it from an absolute `RelativePattern` on the symlink-resolved directory/filename, never a bare glob; same for IntelliJ's VFS listener, which is project-content-scoped by default.
2. **The config watcher and #633's SETOPTS composer write-path race into a self-inflicted restart loop** — reproduces #232's CPU-loop history; needs a self-write suppression window (record write timestamp/hash, skip the next matching watcher-fired reload), and these two issues should be sequenced or coupled in the same phase.
3. **LRU pinning added to fix #497 leaks if unpin isn't guaranteed on every exit path** (success, per-branch failure, 30s timeout, upstream cancellation) — must use a `finally`-guaranteed unpin and a bounded pinned set, with a regression test that forces cancellation mid-recursion.
4. **The interop circuit breaker (#504) never resets or trips on a merely-slow-but-healthy peer** — needs a real closed/open/half-open state machine, not a boolean latch cleared only by `clearCache()`; a slow cold-JVM warm-up must not count the same as connection-refused.
5. **New composer discoverability cues and SETOPTS decode hovers reparse/re-walk the whole document per keystroke**, reintroducing the exact unbounded-scan cost pattern #505 is fixing elsewhere — compute cue positions and decode results as part of the existing debounced document-build/validation cycle, not an independent full walk per request.

## Implications for Roadmap

Based on research, suggested phase structure (23 issues grouped by shared seam and dependency, following the Architecture doc's Build Order):

### Phase 1: Config path resolution & discoverability foundation
**Rationale:** #485 must resolve/expose the effective config path before anything can watch it correctly (Pitfall 1); doing this first prevents every downstream config feature from re-deriving fallback logic independently.
**Delivers:** Dynamic language association in both IDEs; a resolved-path query usable by the watcher and by IntelliJ's file-type override.
**Addresses:** #485
**Avoids:** Pitfall 5 (dynamic association fighting the static filenames manifest — must survive document reopen/revert, not just first open)

### Phase 2: Config hot-reload with restart coalescing
**Rationale:** Depends directly on Phase 1's resolved path; must land its self-write suppression window before #633 (Phase 4) starts writing to the same file, or sequence/gate explicitly.
**Delivers:** Debounced file watcher (VS Code `RelativePattern`, IntelliJ `AsyncFileListener`), routed through a single restart-coalescing choke point (extending IntelliJ's existing `RestartGate`; VS Code needs an equivalent introduced), with a status-bar breadcrumb rather than a blocking prompt.
**Uses:** `RestartGate`/`Scheduler` seam (Phase 79)
**Avoids:** Pitfalls 1-4 (workspace-scoping, atomic-save, self-restart loop, debounce collision with the existing 500ms BBjCPL debounce)

### Phase 3: IntelliJ interop settings & targeted refresh
**Rationale:** Independent of config-reload data flow; pure `BbjSettings.java`/action-layer changes, safe to parallelize.
**Delivers:** Port auto-detection moved into `getState()` (#608); `bbj/refreshJavaClasses` added to `BbjComposerServer`'s single interface, ported from `BbjCompileAction`'s background-task pattern instead of a full restart (#632).
**Research flag:** LSP4IJ's custom-request-without-restart capability is an open question (#632's own acceptance criteria) — resolve once, early, since it also shapes Phase 4's composer command layer (see Research Flags below).

### Phase 4: Shared SETOPTS composer command layer + IntelliJ dialog
**Rationale:** #633 is a net-new `bbj/composer/setopts/*` LS layer that must exist before `SetoptsComposerDialog.java` can compile against it; follows the exact shared-layer-first ordering `composer-commands.ts`'s own history establishes for the other three composers.
**Delivers:** `bbj/composer/setopts/*` handlers, `SetoptsComposerDialog.java`, composed through `ComposerFlow`/`StaleEditGuard`/`ComposerNotices`.
**Implements:** Composer command-layer seam
**Research flag:** New shared DTO surface crossing the LSP4IJ boundary — extend `ComposerModelsJsonBoundaryTest` and keep numeric sentinels in-range to avoid repeating the Phase 81 G-81-4/G-81-5 version-skew bugs (Pitfall 13)

### Phase 5: SETOPTS-in-code hovers + tri-state composer
**Rationale:** Explicitly depends on Phase 4's shared catalog per #475's own issue text; tier 2 (read-only decode hovers) can ship independently of tiers 3-4 if descoping is needed.
**Delivers:** Per-statement SETOPTS decode hovers (always sound); tri-state Set/Clear/Leave composer for the two statically-safe shapes only.
**Avoids:** Pitfall 11 (full-AST-walk-per-keystroke for hover computation — hook into the existing debounced build cycle)

### Phase 6: CVS() composer + MSGBOX expression support + shared discoverability CodeLens
**Rationale:** #648 (MSGBOX regex fix) should land before #650 (visible cue) so the new cue mechanism doesn't silently fail to appear on the very lines #648 fixes; #649 (CVS()) is built cue-aware from day one.
**Delivers:** `cvs-composer.ts`/`-ui.ts`/`-webview.ts` (new, cloned from msgbox's shape); generalized options-expression parser in `msgbox-composer.ts`; one shared `textDocument/codeLens` LS handler rendering in both VS Code (native) and IntelliJ (LSP4IJ Code Vision bridge).
**Implements:** The Architecture Recommendation's CodeLens-first discoverability decision
**Research flag:** IntelliJ visual-cue mechanism needs a same-phase spike if Code Vision reads as insufficiently visible (LineMarkerProvider fallback)

### Phase 7: VS Code composer robustness + IntelliJ composer perf (batchable, independent)
**Rationale:** #623/#532/#530 are VS Code-only, small, near-identical-shape diffs across the same webview files; #611/#612 are IntelliJ-only and touch the same three dialog-launch call sites. Both clusters are independent of every other phase and cheap — good candidates to batch alongside whichever composer phase touches the same files, or run standalone.
**Delivers:** `valid`-field validation gating on addwindow/addchildwindow inserts; re-validation before applying captured MSGBOX coordinates; `onDidDispose` webview cleanup; IntelliJ composer dialog debounce via the existing `Scheduler`/`Alarm` seam (not three new ad-hoc `Alarm` instances); cached server/catalog handles.
**Avoids:** Pitfall 12 (hand-rolled per-dialog debounce instead of extending `KeystrokeDebouncer`)

### Phase 8: Responsiveness & hangs (java-interop + completion + misc hygiene)
**Rationale:** #505, #504, #497, #498 are independent of each other and of every other cluster (different files/mechanisms), all traceable to #232's original CPU-spike report — safe to parallelize within the phase, but each is a non-trivial concurrency fix in its own right (all effort-8 per issue traceability) and deserves careful, isolated testing.
**Delivers:** Per-file cache + AST pruning for scope resolution (#505); circuit breaker with open/half-open state for interop (#504); `finally`-guaranteed LRU unpin (#497); cancel token threaded as a parameter, not a shared field (#498); mtime-slack (or delete-before-decompile) fix (#500); stale-in-flight-format-promise fix (#499); plus the small, fully independent hygiene items (#512, #531, #610).
**Avoids:** Pitfalls 6, 7, 8, 9, 10 — each requires a specific "recovers/resets/isolates correctly under adversarial conditions" regression test, not just a happy-path fix

### Phase Ordering Rationale

- Config-path resolution (Phase 1) must precede config watching (Phase 2) and the SETOPTS composer's write path (Phase 4) because watching or writing the wrong (unresolved/default) path silently reintroduces the exact confusion #485 exists to close.
- Composer command-layer work (Phases 4-6) follows the established "shared LS layer first, per-IDE dialog second" pattern already proven by msgbox/addwindow/addchildwindow's own history — this ordering isn't a new convention, it's continuity with what already shipped.
- Responsiveness fixes (Phase 8) are isolated last not because they're less important (several are severity "high" per their own traceability) but because they touch different files/mechanisms with no cross-dependency on the composer/config work, so they can run in parallel with earlier phases if resourcing allows, and grouping them together keeps their shared root cause (#232) visible for whoever tests them.
- Every phase boundary above avoids the specific pitfalls PITFALLS.md flags for that exact issue cluster — most critically, config-reload (Phase 2) and the SETOPTS write path (Phase 4) are explicitly sequenced or coupled to prevent the self-inflicted restart loop (Pitfall 3).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (IntelliJ targeted refresh):** LSP4IJ's custom-request-without-restart capability is an open, unresolved question per #632's own acceptance criteria — needs to be settled once (possibly via `workspace/executeCommand` as a fallback) before Phase 3 and Phase 4 both proceed on the assumption it works.
- **Phase 4 (shared SETOPTS composer layer):** New cross-boundary DTO surface at risk of repeating Phase 81's G-81-4/G-81-5 LSP4IJ/lsp4j version-skew bugs; needs the boundary-test extension pattern researched/confirmed before implementation.
- **Phase 6 (discoverability CodeLens):** IntelliJ's Code Vision vs. LineMarkerProvider choice is LOW-confidence (community-forum-sourced only) and needs a same-phase compile+run spike against the plugin's actual `sinceBuild=242` range.

Phases with standard patterns (skip research-phase):
- **Phase 7 (composer robustness/perf batch):** Every fix is a direct port of an already-proven pattern in the same codebase (an existing `valid` field, an existing `Scheduler` seam, an existing `onDidDispose` pattern) — no new research needed.
- **Phase 8 (responsiveness, most items):** #500, #499, #512, #531, #610 are single-file, well-scoped fixes with clear existing precedent to mirror; only #505/#504/#497/#498's concurrency-correctness edge cases need extra care during planning (not external research — the pitfalls are already fully specified above).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core findings verified against installed `node_modules` source and this repo's own existing code; IntelliJ-side visual-cue APIs (LineMarkerProvider/CodeVisionProvider choice) are LOW-confidence, community-forum-only |
| Features | HIGH for composer/config mechanics (read directly off this repo's shared modules and official IDE docs); MEDIUM for BASIS CVS()/SETOPTS bit semantics (two BASIS doc pages disagree on one bit, both cited); MEDIUM for IntelliJ CodeLens/Code-Vision rendering (inferred from LSP4IJ docs, not hand-verified in a running IDE) | |
| Architecture | HIGH | Every claim grounded in a file read during this research session, with line numbers current as of `origin/main` @ `c0b113c7` |
| Pitfalls | HIGH | Grounded in this repo's own source, its GitHub issues' own evidence sections, and its own phase history (not generic advice) |

**Overall confidence:** HIGH

### Gaps to Address

- **LSP4IJ custom-request-without-restart capability (#632, and by extension #633's design):** genuinely unresolved by this research; requires either reading LSP4IJ's source directly or a same-phase spike before Phase 3/4 implementation begins. Flag as a go/no-go gate, not an implementation detail.
- **IntelliJ composer-cue rendering mechanism (#650):** LineMarkerProvider vs. CodeVisionProvider is a LOW-confidence choice pending a same-phase spike; default to LineMarkerProvider's lower API-churn risk if Code Vision's registration issues (reported in a JetBrains support thread) prove real.
- **CVS() bit 64 exact wording discrepancy between the two BASIS doc pages** (generic PRO/5 page says "as specified in OPTS" vs. BBj-specific page's fuller description) — low-impact, but worth a final read of both pages during Phase 6 planning before finalizing the CVS_BITS catalog.
- **Auto-restart vs. prompt for config reload (#486):** the issue itself frames this as an open call; this research recommends auto-restart-with-status-bar-signal (consistent with PROJECT.md's existing BBjCPL precedent), but this is a judgment call to confirm during Phase 2 discussion, not a settled fact.

## Sources

### Primary (HIGH confidence)
- Direct reads of `bbj-vscode/src/language/{bbj-ws-manager,bbj-scope,bbj-scope-local,bbj-linker,java-interop,bbj-completion-provider,composer-commands,main}.ts`, `bbj-vscode/src/{msgbox,addwindow,addchildwindow,setopts,cvs}-composer{,-ui,-webview}.ts`, `setopts-catalog.ts`, `extension.ts`, `decompile-io.ts`, `document-formatter.ts`, `Commands/Commands.cjs`, `package.json`
- Direct reads of `bbj-intellij/.../{BbjSettings,BbjSettingsConfigurable}.java`, `actions/{BbjRefreshJavaClassesAction,BbjCompileAction}.java`, `composer/{ComposerLauncher,BbjComposerService,BbjComposerServer,ComposerFlow,StaleEditGuard,ComposerModels,MsgboxComposerDialog}.java`, `concurrency/{Scheduler,AlarmScheduler,RestartGate,KeystrokeDebouncer}.java`, `ui/{BbjServerService,BbjStatusBarWidget}.java`
- `bbj-vscode/node_modules/langium/lib/utils/caching.js`/`.d.ts` and `package.json` (installed package source)
- `.planning/PROJECT.md`, `.planning/STATE.md` — Key Decisions, Active Constraints, Tech Debt
- [redhat-developer/lsp4ij DeveloperGuide.md](https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md) — confirms `getServerInterface()`/`LanguageServerManager` custom-request flow and the CodeLens-to-Code-Vision bridge
- [BASIS: CVS() Function (BBj-specific)](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/cvs_function_bbj.htm), [SETOPTS Verb (BBj-specific)](https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/setopts_verb_bbj.htm)

### Secondary (MEDIUM confidence)
- [microsoft/vscode-go PR #3211](https://github.com/microsoft/vscode-go/pull/3211) and [microsoft/vscode issue #76405](https://github.com/microsoft/vscode/issues/76405) — auto-restart-over-prompt precedent for LS config changes
- JetBrains Support community threads on VFS refresh / `EditorNotificationPanel` reload behavior — convention evidence, no single canonical doc page
- [JetBrains: Intention Actions](https://www.jetbrains.com/help/idea/intention-actions.html), [JetBrains Platform SDK: Line Marker Provider](https://plugins.jetbrains.com/docs/intellij/line-marker-provider.html)

### Tertiary (LOW confidence)
- WebSearch summaries on `LineMarkerProvider`, `FileTypeOverrider`, `BulkFileListener`/`AsyncFileListener`, `CodeVisionProvider` registration-churn risk — not independently cross-verified against a second authoritative source; treat as needing a same-phase spike
- VS Code issue-tracker discussion on `RelativePattern`-based out-of-workspace watching and `setTextDocumentLanguage` persistence caveats — community/issue-tracker discussion, not official reference text

---
*Research completed: 2026-09-06*
*Ready for roadmap: yes*
