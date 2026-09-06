# Phase 82: Composer Robustness - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Mode:** `--auto` — every decision below is the recommended default, selected without user prompts. Each `[auto]` line in `82-DISCUSSION-LOG.md` records the alternatives.

<domain>
## Phase Boundary

The IntelliJ plugin's three visual composers (`MSGBOX`, `addWindow`, `addChildWindow`, all under `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/`) stop failing silently:

1. **#538 / COMP-01** — every composer `CompletableFuture` chain (the `ComposerLauncher.launch()` chain and each dialog's `refresh()` chain) has a terminal failure handler that produces a user-visible notification instead of leaving the exception unobserved.
2. **#567 / COMP-02** — the three edit-in-place apply paths (`openMsgbox`'s replace, `applyAddWindowEdit`, `applyHexEdit`) re-decode the call at the captured line/offsets after the modal dialog closes and, on any mismatch with the pre-dialog decode, **abort the edit and notify the user** (decision already locked in REQUIREMENTS.md — do not re-open) instead of rewriting whatever text now occupies the range.

Both are locked in by regression tests under the existing plain-JUnit 5 `./gradlew test` task (COMP-01: a test forces one chain to fail and asserts the notification; COMP-02: a test mutates the document while the dialog is "open" and asserts no edit is applied).

Not in this phase: the create flows (`insertAtCaret` uses the live caret offset at apply time and has no captured range), any change to the language server's `bbj/composer/*` handlers or to VS Code's composer webview, relocating a call whose line moved (see Deferred Ideas), new composer features, and any `BasePlatformTestCase` / live-IDE harness (REQUIREMENTS.md Out of Scope). Phase 83 (BUILD-05) owns LSP4IJ canary coverage of the composer request surface.

</domain>

<decisions>
## Implementation Decisions

### Verified state of `main` (2026-09-05)

- `ComposerLauncher.launch()` (`ComposerLauncher.java:57-88`) captures `line` / `lineText` / `col` on the EDT, then runs a **nested** chain: `BbjComposerService.server(project).thenAccept(server -> server.composerCatalogs().thenAccept(catalogs -> server.<kind>DecodeCall(new DecodeCallParams(lineText, col)).thenAccept(decoded -> onEdt(...))))`. Each level returns a fresh future nobody observes, so an inner failure never reaches an outer stage. Only the `null` results (server not running, catalogs null) are handled, via `notifyNotReady()` (`:209-217`, a modal `Messages.showInfoMessage` "The BBj language server is not ready yet…").
- The three apply sites: `openMsgbox` (`:107-112`, `replaceString(ls + ed.callStart, ls + ed.callEnd, text)`), `applyAddWindowEdit` (`:162-165`) delegating to `applyHexEdit` (`:172-196`, right-to-left `Op`s over `flagsRange` / `flagsInsertOffset` / `eventMaskRange` / `eventMaskInsertOffset`). All three compute `ls = doc.getLineStartOffset(line)` from the **captured** `line` index and apply the **captured** decode's offsets inside `WriteCommandAction.runWriteCommandAction`, with no re-check. A grep of the package for `exceptionally|whenComplete|handle(` returns nothing.
- Each dialog's `refresh()` (`MsgboxComposerDialog.java:190-215`, `AddWindowComposerDialog.java:213-244`, `AddChildWindowComposerDialog.java:222-253`) is `server.<kind>Preview(params).thenAccept(preview -> invokeLater(() -> { if (mySeq == seq.get() && preview != null) apply(preview); }, ModalityState.any()))` — an `AtomicInteger seq` already discards stale successes; a failure is simply never observed and the OK button keeps whatever enabled state the last good preview left.
- `BbjComposerServer` is a plain Java interface (`extends LanguageServer`, `@JsonRequest` methods returning `CompletableFuture`) — a test double can implement it directly and return `CompletableFuture.failedFuture(...)`. lsp4j is on the test classpath (Phase 81's `CompileResultPresenterTest` imports `org.eclipse.lsp4j.*`). There are **no** composer tests today (`src/test/java/com/basis/bbj/intellij/` has `actions/`, `commenter/`, `compile/`, `concurrency/`, `lexer/`, `lsp/`).
- Server-side, `bbj/composer/*/decodeCall` (`bbj-vscode/src/language/composer-commands.ts:82-107`, `:141-160`, and the addchildwindow twin) is a **pure function of `(line text, character)`** — re-running it on identical text yields an identical result, and it carries no document state. `DecodeCallParams(lineText, col)` is what the launcher already sends.
- Notification precedents in the module: `CompileResultPresenter` (`compile/CompileResultPresenter.java`, Phase 81) is a plain-Java presenter seam that maps a machine-readable reason to balloon title/body/severity with no IntelliJ import; production renders it into the `"BBj Language Server"` notification group (`plugin.xml:223`) and mirrors failures to the LS console via `BbjServerService.logToConsole` (`ui/BbjServerService.java:73`). `BackendNoticePolicy` (Phase 80) shows the injected-notifier pattern.
- IntelliJ test classpath is plain JUnit 5 with no platform test framework (Phase 79 D-01, Phase 80 D-01, Phase 81 C-01 still hold). Existing seams: `concurrency/` (`Scheduler`, `ThreadProbe`, `RestartGate`, `KeystrokeDebouncer`, `ManualScheduler`), `DownloadGuard`, `BbjNodeVersionCache`, `JwtValidity`, `OwnerOnlyAcl`, `BackendNoticePolicy`, `TokenValidationCache`, `BbjStringCommentScanner`, `RemToggleSeam`, `CompilerInitOptions`, `CompileResultPresenter`; source-guard style in `src/test/java/com/basis/bbj/intellij/**/*SourceGuardTest.java`.

### Carried forward (locked by Phases 79/80/81 — do not re-open)

- **C-01:** Every fix is a plain-Java seam with no IntelliJ imports, covered by behavioural JUnit 5 tests, plus one source-guard test per production wiring site. No new test framework, no `testFramework(TestFrameworkType.Platform)`, no `BasePlatformTestCase`.
- **C-02:** Tests are written red-then-green; each issue's acceptance-criteria wording is the literal target of at least one test name (COMP-01: "forces one chain to complete exceptionally and asserts a notification"; COMP-02: "mutates the document while the dialog is open and asserts no edit is applied").
- **C-03:** Nothing blocking runs on the EDT; LS round-trips stay on LSP4IJ's futures, UI updates go back through `invokeLater` with the modality the site already uses (`ModalityState.any()` inside a dialog, `defaultModalityState()` from the launcher).
- **C-04:** Landing follows v4.1/Phase 80/81 practice: public PRs per plan or per phase, issue numbers in comments are fine, no advisory ids (none apply here).
- **C-05 (REQUIREMENTS.md COMP-02):** a stale-offset mismatch **aborts and notifies**; it never applies a best-effort edit and never re-opens the dialog automatically.

### Failure surfacing (COMP-01, #538)

- **D-01:** One plain-Java **composer notice seam** (name at planner's discretion, e.g. `ComposerNotices` / `ComposerFailurePresenter`, beside `CompileResultPresenter`'s shape) is the **only** place that decides what the user sees for the three failure classes this phase introduces or touches: `REQUEST_FAILED` (a chain completed exceptionally, including timeout), `STALE_DOCUMENT` (COMP-02 mismatch), and the existing `NOT_READY` (null server / null catalogs). It returns title, body, severity and an optional remedy action id; production renders it as a **balloon in the existing `"BBj Language Server"` notification group** and mirrors `REQUEST_FAILED` (with the throwable's class and message) to the LS console via `BbjServerService.logToConsole`, never to a modal. The notifier is injected (a small functional interface) so tests assert on calls without the platform. — **Reversibility:** reversible — internal class, no published contract.
- **D-02:** `notifyNotReady()`'s wording stays ("The BBj language server is not ready yet. Open a BBj file and try again.") but it is routed through the D-01 seam and rendered as an **information balloon** instead of `Messages.showInfoMessage`, so the package has exactly one failure-surfacing path (research Anti-Pattern 3's "one convention"). — **Reversibility:** reversible.
- **D-03:** The launcher's nested `thenAccept` pyramid is **flattened into one `thenCompose` chain** (`server` → `catalogs` → `decode`) with a **single terminal handler** (`whenComplete` or `exceptionally`) that maps any throwable to `REQUEST_FAILED` and `null` stages to `NOT_READY`. Each dialog's `refresh()` chain gets its own terminal handler. No `CompletableFuture` returned by an LSP4IJ proxy call in this package may remain unobserved; a source-guard asserts that every `.thenAccept(` / `.thenCompose(` in `composer/*.java` is followed in the same chain by a terminal handler (count-based, in the existing `*SourceGuardTest` style).
- **D-04:** A **bounded wait** is added so a request that never completes (hung server) also surfaces: `orTimeout(...)` on the launcher chain (30 s suggested; the LS's own compile timeout is 30 s and Phase 81 used a 45 s client wait) and a shorter one on `refresh()` (10 s suggested). A timeout is reported as `REQUEST_FAILED` with a "timed out" body. Values are Claude's discretion within "seconds, not minutes".
- **D-05:** **In-dialog refresh failure behaviour:** when a `refresh()` chain fails while the dialog is open and its `seq` is still current, the dialog (a) shows "Preview unavailable — <short reason>" in its existing error/summary label, (b) **disables OK** (`setOKActionEnabled(false)`) so stale statement text cannot be accepted (the exact hazard #538 names), and (c) re-enables and clears the message on the next successful `apply(preview)`. A failure for a superseded `seq` is discarded exactly like a superseded success. The balloon for refresh failures is **rate-limited to once per dialog session** (a keystroke storm during a server restart must not spam balloons); the in-dialog label carries the per-keystroke state. — **Reversibility:** reversible.
- **D-06:** The chain composition and the failure→notice mapping live in a **plain-Java flow seam** that takes the `BbjComposerServer` (an interface, stubbable), an executor for "run on EDT" (production: `invokeLater` with the site's modality; tests: run inline), and the D-01 notifier. `ComposerLauncher.launch()` and each dialog's `refresh()` become thin adapters. The COMP-01 regression test implements `BbjComposerServer` with a double whose `composerCatalogs()` (or one preview) returns `CompletableFuture.failedFuture(new RuntimeException(...))` and asserts exactly one `REQUEST_FAILED` notice — the literal "forces one chain to complete exceptionally and asserts a notification".

### Stale-edit guard (COMP-02, #567)

- **D-07:** A shared **stale-edit guard** (plain Java, name at planner's discretion, e.g. `StaleEditGuard` / `EditTargetValidator`) sits in front of all three apply paths; no apply path calls `replaceString` except through it. Flow after `dialog.showAndGet()` returns true: (1) on the EDT, read the current line count, the current text of the captured `line` (or "line gone" if `line >= lineCount`) and `doc.getModificationStamp()`; (2) **re-run the same `<kind>DecodeCall` request** the launch used, on the **current** line text at the captured `col`; (3) compare the fresh decode against the pre-dialog decode; (4) only on a match, run the `WriteCommandAction`, whose first statement re-checks that the modification stamp is unchanged and aborts otherwise (closes the async window between the re-decode and the write). Any failure in (1)–(4), including the re-decode request itself failing, is a `STALE_DOCUMENT` (or `REQUEST_FAILED`) notice and **no edit**. — **Reversibility:** reversible — one guard class, three call sites.
- **D-08:** **Match = the whole decode result is equal**, not just the edit ranges: `found`, the `edit` payload (`callStart`/`callEnd` for MSGBOX; `flagsRange`/`flagsInsertOffset`/`eventMaskRange`/`eventMaskInsertOffset`/`preservedFlagBits`/`preservedEventBits` for the window composers), `initial`, and `trailingArgs`. Rationale: the dialog's result was computed from the pre-dialog call; if the call's arguments changed underneath it, the composed statement no longer reflects what the user is looking at, so "abort and notify" (C-05) is the safe answer even when the ranges happen to line up. Equality is a pure comparison of the Gson DTOs (deep-equals on the DTO fields, or comparing their canonical JSON — Claude's discretion). Consequences accepted: a line inserted above the call shifts the index, the re-decode at the old index finds no call, and the edit is aborted with a notice — relocating the moved call is a deferred idea, not this phase.
- **D-09:** `STALE_DOCUMENT` notice: a **WARNING balloon** along the lines of "MSGBOX not updated — the line changed while the composer was open. Nothing was changed." with a **"Reopen composer" action** that calls `ComposerLauncher.launch(project, editor, kind)` again against the current document (an explicit user action, so C-05's "never re-open automatically" holds). The previous dialog selections are not carried over (deferred idea). — **Reversibility:** reversible.
- **D-10:** The COMP-02 regression test drives the guard through the D-06 flow seam with a fake document (a mutable line list with a modification stamp) and a scripted "dialog": capture → mutate the captured line (and, in a second case, insert a line above; in a third, keep the text identical) → "close dialog with OK" → assert **no edit op is emitted and one `STALE_DOCUMENT` notice** in the first two cases, and exactly the expected ops in the identical case. A fourth case has the re-decode itself fail exceptionally and asserts no edit plus a `REQUEST_FAILED` notice (Pitfall 12: both paths share one visibility convention). A source-guard asserts `replaceString(` appears in `ComposerLauncher.java` (or wherever the apply lands) only inside the guarded apply, and that all three apply sites call the guard.

### Plan split and landing

- **D-11:** **Two plans, sequential:** P01 COMP-01 (D-01–D-06: notice seam, flattened launcher chain, dialog refresh handlers + OK gating, timeouts, tests and source-guards); P02 COMP-02 (D-07–D-10: stale-edit guard using P01's notice path, tests and source-guards). P02 depends on P01 (research build order: #538 first so #567 inherits the failure-surfacing convention rather than inventing a second). Each plan red-then-green (C-02). The planner may fold both into one plan if the seam boundaries make the split artificial, but must keep the COMP-01 tests green before starting the COMP-02 production change.
- **D-12:** Human UAT items (recorded in each SUMMARY, since the balloons and the modal dialog need a live IDE): stop the language server while a composer dialog is open and type → "Preview unavailable" + OK disabled + one balloon; invoke a composer with the server stopped → one information balloon; open a composer on a `MSGBOX` call, edit that line in another split editor, press OK → warning balloon, document untouched, "Reopen composer" works.

### Claude's Discretion

- Names and packages for the notice seam, the flow seam and the stale-edit guard (all inside `composer/`, mirroring `compile/CompileResultPresenter`'s style).
- Whether the terminal handler is `whenComplete` or `exceptionally` + `thenAccept`, and how the "run on EDT" executor is expressed (a `Consumer<Runnable>` is enough).
- Exact timeout values (D-04) and the balloon wording beyond the fixed phrases above.
- Whether the decode equality is field-wise `equals` on the DTOs or canonical-JSON comparison.
- Test file placement (`src/test/java/com/basis/bbj/intellij/composer/`, mirroring production, is the natural home) and source-guard scoping (substrings vs small regexes).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 82 goal, success criteria 1-2, dependency on Phase 78; Phase 83 (BUILD-05) expects canary coverage of the LSP4IJ surface the composers use.
- `.planning/REQUIREMENTS.md` — COMP-01, COMP-02 wording (COMP-02 records the "abort and notify" decision); Out of Scope table (no `BasePlatformTestCase` harness).
- `.planning/PROJECT.md` — v4.2 milestone goals ("Composer robustness" bullet) and "Out of this milestone" list.
- GitHub issues #538 and #567 (`gh issue view <n> --repo BBx-Kitchen/bbj-language-server`) — evidence, failure scenarios, acceptance criteria (authoritative for closure).

### Research (v4.2, verified against `main` on 2026-09-05)
- `.planning/research/ARCHITECTURE.md` §4 "Composer edit-application (#538 wraps #567)" (lines ~187-206), Build Order Wave 6 (~261-266), Anti-Patterns 3 and 4 (~305-314).
- `.planning/research/PITFALLS.md` Pitfall 12 (fixing #538 without #567 leaves the silent case uncaught — plan together; route mismatch and async exception through one notification path).
- `.planning/research/SUMMARY.md` — composer robustness scope line and the note that #567's UX question had to be decided before implementation (now decided: abort and notify).

### Conventions carried forward
- `.planning/phases/81-feature-parity-and-correctness/81-CONTEXT.md` — C-01…C-04, D-07/D-09/D-10 (balloon + console + machine-readable reason convention; `CompileResultPresenter` seam).
- `.planning/phases/80-em-token-security/80-CONTEXT.md` — D-01/D-02 red-then-green, D-12/D-13 injected-notifier `BackendNoticePolicy` pattern.
- `.planning/phases/79-edt-responsiveness/79-CONTEXT.md` — D-01/D-02/D-03 seam + source-guard test pattern, off-EDT rules.

### Code that this phase changes or builds on
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — `launch()` chain (57-88), `openMsgbox` (90-116), `openAddWindow` (118-137), `openAddChildWindow` (139-159), `applyAddWindowEdit` (162-165), `applyHexEdit` (172-196), `insertAtCaret` (198-207, create path, unchanged), `notifyNotReady` (209-217), `onEdt` (219-221).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` (`refresh()` ~190-215, `apply()` ~217-226, `setOKActionEnabled` use), `AddWindowComposerDialog.java` (`refresh()` ~213-244), `AddChildWindowComposerDialog.java` (`refresh()` ~222-253) — the three refresh chains.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` — the proxy interface (stubbable in tests); `BbjComposerService.java` — `server(project)` resolver (null when not running).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` — `DecodeCallParams`, `MsgboxDecodeResult`/`MsgboxEdit`, `AddWindowDecodeResult`/`AddChildWindowDecodeResult`/`AddWindowEdit`, the preview DTOs — the shapes D-08 compares.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/Configure*Intention.java` — callers of `launch()` (`startInWriteAction() == false`; the launcher owns its write command).
- `bbj-vscode/src/language/composer-commands.ts` — `bbj/composer/msgbox/decodeCall` (82-107), `addwindow/decodeCall` (141-160), `addchildwindow/decodeCall` (following) — pure functions of `(line, character)`; **unchanged** in this phase.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java` — presenter-seam precedent (reason-keyed, no IntelliJ import); `actions/BbjCompileAction.java` — how a presentation is rendered into a balloon + console line + "Open Settings" action.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` — `logToConsole` (73), notification group usage.
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — composer actions/intentions (61-126), `notificationGroup id="BBj Language Server"` (223); no new registrations expected.

### Test patterns to follow
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java`, `BbjCompileActionSourceGuardTest.java`, `DiagnosticMessageAccessSourceGuardTest.java` — Phase 81 presenter test + source-guard style.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java` — injected-notifier counting-double style.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/*`, `ManualScheduler.java` — deterministic doubles for async seams.
- `bbj-intellij/build.gradle.kts` — test dependencies and `useJUnitPlatform()`; do not add platform test frameworks.

### Not useful here
- `.planning/codebase/*.md` — dated 2026-02-01, predate `bbj-intellij/`'s composer package.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BbjComposerServer` is already an interface: a JUnit double can return failed or never-completing futures with no mocking library.
- `CompileResultPresenter` + `BbjCompileAction` show the exact balloon/console/action rendering to copy for the composer notice seam.
- Each dialog's `AtomicInteger seq` is the staleness discriminator to reuse for failures (D-05); `setOKActionEnabled` already gates OK on `preview.valid` in the MSGBOX dialog.
- `DecodeCallParams(lineText, col)` and the `<kind>DecodeCall` requests are the re-decode primitive D-07 needs — no new LS request.
- `ComposerLauncher.onEdt` / `ModalityState` usage and `WriteCommandAction.runWriteCommandAction` are the correct threading shells; the guard slots in between.

### Established Patterns
- Plain-Java seam + behavioural test + source-guard per wiring site; the platform stays off the test classpath.
- Failures are presented from a machine-readable classification, never by matching message prose (Phase 81 D-10).
- Balloons in the `"BBj Language Server"` group with a remedy action where one exists; failures mirrored to the LS console.
- Off-EDT for anything blocking; UI updates via `invokeLater` with an explicit modality.

### Integration Points
- `ComposerLauncher.launch()` and the three `refresh()` methods become adapters over the flow seam; `notifyNotReady` folds into the notice seam.
- The stale-edit guard is the single choke point in front of `replaceString`; `insertAtCaret` stays outside it.
- Phase 83 (BUILD-05) will add LSP4IJ canaries over `BbjComposerServer` / `BbjComposerService`; keep the LSP4IJ-coupled code confined to those two files.

</code_context>

<specifics>
## Specific Ideas

- #538's test wording is literal: "forces one chain to complete exceptionally and asserts a notification (or equivalent visible signal) is produced rather than a silent no-op" — the COMP-01 test name carries it.
- #567's test wording is literal: "mutates the document while the dialog is open and asserts no edit is applied" — the COMP-02 test name carries it; a third case proves an unchanged document still applies.
- The silent case (#567's "rewrites whatever text now occupies that byte range") does not throw, so `.exceptionally` alone cannot catch it — Pitfall 12; both fixes ship in this phase, both through one notice path.
- The stale-document balloon should say plainly that nothing was changed and offer "Reopen composer".

</specifics>

<deferred>
## Deferred Ideas

- **Relocate a moved call instead of aborting** — when lines were inserted above, search the document for the same call text and re-anchor; consciously not done (C-05 says abort and notify; a search heuristic could pick the wrong call).
- **Carry dialog selections over into "Reopen composer"** — reopening starts from the current call's decode; preserving the user's unsaved choices needs dialog-state serialization.
- **VS Code composer webview parity check** — whether the VS Code side applies edits at captured ranges without re-validation is outside the IntelliJ burn-down; worth a todo.
- **LSP4IJ canary coverage of `BbjComposerServer`/`BbjComposerService`** — Phase 83 (BUILD-05).
- **A generic "observed future" helper for the whole plugin** — REQUIREMENTS.md rules out a general async abstraction; the flow seam stays composer-local.

### Reviewed Todos (not folded)
Two pending todos matched Phase 82 on keyword overlap only (`test`); the `--auto` rule would fold both, the scope guardrail wins as it did in Phases 78-81:
- `.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` — vitest live-interop drift in `bbj-vscode`; unrelated to the IntelliJ composers; stays pending.
- `.planning/todos/pending/2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md` — a `bbj-vscode` test fixture out of step with the committed Gradle wrapper; a hygiene fix, not composer work; stays pending (candidate for a quick task).

</deferred>

---

*Phase: 82-composer-robustness*
*Context gathered: 2026-09-05*
