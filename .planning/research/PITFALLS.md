# Pitfalls Research

**Domain:** Adding config-hot-reload, composer UX, and responsiveness fixes to a shipped Langium-based LS with two live clients (VS Code + LSP4IJ/IntelliJ)
**Researched:** 2026-09-06
**Confidence:** HIGH (grounded in this repo's own source, its GitHub issue evidence sections, and its own phase history — not generic advice)

Feature-group shorthand used below (from STATE.md's v4.3 scope):
- **[COMPOSER]** — #650, #648, #649, #633, #475, #623, #532, #530, #611, #612
- **[CONFIG]** — #486, #485, #632, #608
- **[RESPONSIVENESS]** — #505, #504, #497, #498, #500, #499, #512, #531, #610

## Critical Pitfalls

### Pitfall 1: The config-file watcher is scoped like the existing `.bbj` watcher and misses the actual target

**What goes wrong:**
`extension.ts:863` already runs `vscode.workspace.createFileSystemWatcher('**/*.bbj')` — a glob relative to workspace folders. #486's resolved config file (`bbj.configPath` if set, else `{bbj.home}/cfg/config.bbx`) "usually lives outside the workspace" per the issue's own text. A watcher built the same way as the existing one (a bare glob, or a `RelativePattern` rooted at a workspace folder) will silently never fire for a config file outside the workspace tree — no error, just a feature that appears to work in the repo's own test workspace (where `bbj.home` might coincidentally be inside it) and does nothing for every real customer install.

**Why it happens:**
The one file-watching precedent in this codebase (`**/*.bbj`) is workspace-scoped by design, so it's the easiest thing to copy-paste. `bbj.home` resolution also already special-cases symlinks (`java.nio.file.Files` API, v1.2 decision, `JDK-4956115`) — a plain `fs.watch`/VS Code watcher on the *symlink path* rather than the resolved real path can also silently miss changes on some platforms/watcher backends that don't follow symlinks.

**How to avoid:**
Build the watcher from an absolute `RelativePattern(vscode.Uri.file(dirname(resolvedConfigPath)), basename(resolvedConfigPath))` — never a bare glob — and resolve `bbj.home`/`configPath` through the same symlink-aware resolution already used for the executable lookup before constructing the pattern. On IntelliJ, use a `VirtualFileManager`/`AsyncFileListener` scoped to the resolved absolute path, not a project-relative watch service (IntelliJ's default `VirtualFileListener` is project-content-scoped and, like VS Code's default workspace watcher, will not observe changes to files outside all content roots without an explicit non-project watch request).
**Warning signs:** the reload "works" in local dev (repo-local `bbj.home` fixture) but a QA pass with `bbj.home` outside the workspace shows no reload.
**Phase to address:** [CONFIG] — #486 / #485.

---

### Pitfall 2: Editor atomic-save (write-temp-then-rename) defeats a naive change-event watcher

**What goes wrong:**
Many editors (and some IDE "safe write" settings) save by writing to a temp file and renaming it over the target, rather than truncating and rewriting in place. A watcher that only listens for a `change` event on the exact path can see a delete+create pair instead (or nothing, if the watch handle followed the old inode) and either miss the reload entirely or double-fire.

**Why it happens:**
It's invisible in the common case — editing the file directly in VS Code/IntelliJ through the plugin's own composer typically triggers a normal write, but any external tool, sync client, or "atomic save" editor setting touching the same config file will not.

**How to avoid:**
Watch for create+change+delete on the target's containing directory (as recommended in Pitfall 1) rather than only `change` on the file itself, and re-establish the watch handle after any delete/rename observed at that path. Debounce (see Pitfall 4) absorbs the delete+create pair into one reload rather than two.
**Warning signs:** reload works when editing via the plugin's own composer but not after `git checkout`, a sync tool, or another editor's save.
**Phase to address:** [CONFIG] — #486.

---

### Pitfall 3: The config watcher restarts the LS in reaction to the SETOPTS composer's own write, creating a self-inflicted restart loop

**What goes wrong:**
#633/#475 add composer write-paths that themselves edit `config.bbx` (canonical SETOPTS block regeneration, absolute-vector round-trip). Once #486's watcher exists, the composer's own `WorkspaceEdit`/`WriteCommandAction` against that exact file is indistinguishable from an external edit and will trigger the same debounced restart — mid-flow, while the composer dialog may still be open expecting the LS to answer a subsequent `bbj/composer/setopts/*` request. This is the same shape of bug this project already paid for once: issue #232 documented a 100% CPU rebuild loop when `BBjCPL` was wired into `onBuildPhase`, later fixed by moving the compiler into `buildDocuments()` with a 500ms trailing-edge debounce specifically to break a self-triggering cycle.

**Why it happens:**
The watcher and the composer's write path are built by different work items in the same milestone with no obvious call-site coupling — nothing forces the person building #486 to check what #633 writes to the same file.

**How to avoid:**
Route composer-driven writes to `config.bbx` through a "self-write" suppression window (record the write's own timestamp/hash and skip the next watcher-fired reload if it matches), the same pattern this repo already applies for BBjCPL's abort-on-resave (Phase 81 Plan 01: `compileWithOptions` never touches the abort-on-resave in-flight map so an explicit compile and a background compile of the same file don't cancel each other) and for the composer's own `StaleEditGuard` (COMP-02, #567) which re-checks document state at write time rather than trusting captured state. A restart triggered while a composer dialog session is open should also surface through the composer's own `ComposerFlow`/`ComposerNotices` reason-keyed balloon (established in #538/COMP-01) rather than silently dropping the in-flight request.
**Warning signs:** opening the SETOPTS composer, clicking Apply, and seeing the LS restart (status bar flicker / composer preview goes blank) instead of a clean confirmation.
**Phase to address:** [CONFIG] + [COMPOSER] — sequence #486's watcher and #633's write path in the same phase, or gate #633 to depend on #486 landing the suppression window first.

---

### Pitfall 4: Two independent debounce timers (LS's 500ms document-validation debounce and the new config-restart debounce) interact unpredictably

**What goes wrong:**
The LS already has a 500ms trailing-edge debounce for `buildDocuments()`/BBjCPL. A new, separately-timed debounce for "config file changed → restart" is a second clock ticking against the same editing session. If the two windows overlap (e.g. saving both a `.bbj` file and `config.bbx` in the same edit burst), a restart can land in the middle of an in-flight document validation, and the validation's result is delivered to a client that just tore down and re-created its LSP connection.

**Why it happens:**
The two debounces are naturally implemented in different modules (`bbj-document-builder.ts` vs. wherever #486's watcher lands) with no shared clock or ordering guarantee.

**How to avoid:**
Route the config-restart trigger through the same `RestartGate`/`requestRestart(long)` coalescing point IntelliJ already uses for all eight of its other restart triggers (EDT-05, #539) — VS Code has no equivalent single choke point today, so this milestone should give VS Code's client one too rather than firing `client.restart()` directly from the watcher callback. On both sides, prefer "prompt to reload" over silent auto-restart (the issue text itself floats this as an option) specifically so a mid-typing restart is a deliberate user action, not a race outcome.
**Warning signs:** intermittent "connection to server got closed" toasts correlated with editing config.bbx near other file saves.
**Phase to address:** [CONFIG] — #486.

---

### Pitfall 5: Dynamic language association for a custom-named config file fights the static `filenames` contribution

**What goes wrong:**
Both `bbj-vscode/package.json` (`contributes.languages` → `"filenames": ["config.bbx", "Config.bbx", "config.min", "Config.min"]`) and the IntelliJ TextMate bundle declare a *fixed, static* filename list for the `bbx-config` language. #485 asks for a file at an arbitrary configured path/name (e.g. `myproject.cfg`) to *also* get this treatment, dynamically, at runtime — via `vscode.languages.setTextDocumentLanguage` (VS Code) or the IntelliJ language-substitutor equivalent. Two independent association mechanisms (declarative manifest match + imperative runtime override) now govern the same document, and they can disagree: VS Code's manifest-based association re-asserts itself on certain triggers (e.g. reopening the file, `Revert File`, or a workspace reload) after the imperative override has been applied, silently reverting the file to plain-text or `bbj` association.
STATE.md's own Known tech debt already flags one instance of this exact class of limitation: "IntelliJ TextMate bundle cannot exclude `config.bbx` by filename (platform limitation)" — the reverse problem (can't *un*-associate) from the same static-manifest constraint #485 needs to work *around* for association.

**Why it happens:**
VS Code's language-association priority order (user file-association settings > extension-contributed `filenames`/`patterns` > `setTextDocumentLanguage` calls made before the document is otherwise classified) is not something either association path controls in isolation, and the interaction is undocumented outside VS Code's own extension-host source.

**How to avoid:**
Apply the dynamic override on every event that can re-trigger classification (`onDidOpenTextDocument`, and also `workspace.onDidChangeConfiguration` when `bbj.configPath` itself changes, re-associating the *old* path back to its default language and the *new* path to `bbx-config`), not just once at extension activation. Write a regression test that opens a custom-named config file, asserts the language ID, then simulates a revert/reopen and asserts the language ID is still `bbx-config` — the "looks done" failure mode here is passing on first-open and failing on reopen.
**Phase to address:** [CONFIG] — #485.

---

### Pitfall 6: The interop circuit breaker never resets, or trips on a slow-but-healthy peer and then stays tripped

**What goes wrong:**
#504's fix wraps `resolveClassByName()`'s current one-lock-serializes-everything behavior with "fail once, short-circuit the rest." Two failure modes are easy to introduce here: (a) the breaker resets only on `clearCache()` (an explicit, rare, user-triggered action) and never on a background health signal, so a peer that comes back up mid-session stays "circuit open" for the rest of that session, silently degrading every subsequent resolution to a stub with no path back to normal; (b) the breaker's failure threshold is tuned against the existing fixed 10s connect timeout, so a peer that is merely *slow* (e.g. cold JVM warm-up on BBjServices, or a large classpath scan — see the project's own "Java interop cold-resolution gotcha" memory item about warm-up needs) trips the same breaker as a genuinely unreachable one, and large-classpath resolutions that are legitimately slow but eventually succeed get short-circuited into permanent stub results.

**Why it happens:**
"Circuit breaker" is proposed at the level of a GitHub issue ("short-circuits further connect attempts after the first failure") without specifying a half-open/retry-probe state, and the codebase's own IntelliJ status-bar widget already does independent TCP health probing (a second source of truth for "is the peer up") that a new LS-side breaker needs to either share or explicitly ignore.

**How to avoid:**
Implement a standard three-state breaker (closed / open / half-open) with a distinct, generous timeout for the half-open probe, not just a boolean latch cleared by `clearCache()`. Distinguish "connection refused / no listener" (fast-failing, safe to trip immediately) from "connected but slow to respond" (should not count toward the trip threshold the same way). A vitest regression test should assert not just "fails fast the second time" (per #504's own acceptance criteria) but also "resumes resolving once the peer becomes reachable again, without requiring `clearCache()`."
**Warning signs:** java class resolution stays broken for an entire IDE session after a transient interop restart, even though the status-bar widget shows the peer as healthy again.
**Phase to address:** [RESPONSIVENESS] — #504.

---

### Pitfall 7: LRU pinning added to fix #497 leaks pinned entries and defeats the cache's own bound

**What goes wrong:**
#497 is a real regression already found in code review (`WR-01`): the LRU cache backing `resolvedClasses` can evict a class's own entry while that class's *own* async Phase-2 recursion is still in flight, and if that class participates in a reference cycle, the recursive lookback misses the `resolvedClasses.has()` fast path and stalls for the full 30s `RESOLUTION_TIMEOUT_MS` before falling back to a stub. The two possible fixes named in the issue both introduce a *second* piece of state to protect the in-flight entry — direction 1 ("pin the currently-resolving class's cache entry… track a small protected set of in-flight class names") is the classic footgun: if the "unpin" step isn't guaranteed to run on every exit path (error, cancellation, timeout — not just the happy path), the protected set only grows, and `RESOLVED_CLASSES_CACHE_LIMIT = 5000`'s bound becomes meaningless because pinned entries can never be evicted regardless of the map's own LRU policy.

**Why it happens:**
The natural place to unpin is "after the recursion completes," but Phase-2 recursion has multiple exit paths (success, per-branch failure inside `Promise.all`-style fan-out, the 30s race timeout, and upstream cancellation via `CancellationToken`), and it's easy to wire the happy path and miss the others.

**How to avoid:**
Unpin in a `finally` block (or equivalent) that runs on every exit path of the Phase-2 recursion, not just success — mirroring this project's own recent pattern of scoping guarantees to "no fourth outcome" (Phase 80's `createOwnerOnlyFile` has exactly three outcomes, no silent fallback). Bound the pinned set itself (e.g. assert it never exceeds `MAX_RESOLUTION_DEPTH` entries, since pinning only needs to cover one call chain's own ancestry) and add a regression test that forces cancellation/timeout mid-recursion and asserts the pinned set returns to empty afterward — the existing LRU test only exercises `CACHE_LIMIT + 1` *independent* concurrent classes and, per the issue's own text, "never exercises a self-referential/cyclic resolution racing its own eviction."
**Warning signs:** memory/identity-set growth in the java-interop client that doesn't shrink even after `clearCache()`; the original bug's 30s stall symptom reappearing under different conditions (an incompletely-unpinned entry still blocks the fast path for an unrelated reason).
**Phase to address:** [RESPONSIVENESS] — #497.

---

### Pitfall 8: Threading a cancel token through `BBjCompletionProvider` fixes the race but reintroduces it at a different layer

**What goes wrong:**
#498 correctly diagnoses `activeCancelToken` as shared mutable singleton state on a Langium service that legitimately serves concurrent requests for different open documents. The "correct fix" the issue names — "Langium lets `completionFor`/`completionForCrossReference` overrides carry request-scoped closures" — requires restructuring how deep-engine callbacks reach `completeAutoImportClasses`. The easy trap: solving it with a request-scoped field on a *new* object created per `getCompletion()` call but then handing that object to a helper that is itself memoized or cached across calls (e.g. reusing a promise, or storing the helper on `this` "just for this call") silently reintroduces the same shared-mutable-state bug one layer down, and it's easy to believe the bug is fixed because the specific field named in the issue (`activeCancelToken`) is gone.
Also note: since Phase 71/72-era investigations, `shouldRunBBjTests()` gates on a bare TCP connect to :5008, and BBjServices now exposes `getAllClassNames` — meaning some interop-backed completion tests behave differently locally vs. in CI depending on what's listening on that port; a completion-cancellation test that depends on real interop timing can be flaky for reasons unrelated to the fix.

**Why it happens:**
Langium's completion provider is instantiated once via DI and treated by convention as request-scoped even though the LSP protocol and this server's connection allow concurrent completion requests across documents; the override points (`completionFor`, `completionForCrossReference`) don't take a token parameter in the base signature, which is exactly why the original shared field existed.

**How to avoid:**
Pass the token explicitly as a parameter threaded through every override in the call chain down to `completeAutoImportClasses` (option 1 from the issue), not via any instance field, however narrowly scoped. Where Langium's own override signature genuinely can't carry the token, use a `WeakMap`/`Map` keyed by a request-identity object created fresh per `getCompletion()` call (never reused, never memoized) rather than a single `this.x` field. Add a regression test with two concurrent completion requests for two different documents where the first's token is cancelled after the second's request begins, asserting the first's own cancellation is observed and the second is unaffected — this is the scenario the current single-field design cannot pass.
**Phase to address:** [RESPONSIVENESS] — #498.

---

### Pitfall 9: The mtime slack added to fix #500 admits genuinely stale `.lst` files

**What goes wrong:**
#500's own proposed fix is "add slack… `mtimeMs >= callStartMs - GRANULARITY_SLACK_MS`, slack on the order of 1-2s." The pitfall is symmetrical to the bug being fixed: too little slack and the fast-write-on-coarse-filesystem case still spins to the 20s timeout (the original bug); too much slack and a genuinely stale `.lst` file from a *previous* decompile run — sitting there for up to `GRANULARITY_SLACK_MS` before the current call started — now passes the freshness gate and is served as if it were the current run's output. The existing size-settling check is a second signal, but the issue's own "possible directions" section notes it should be a *fallback* rather than the compensating control, since two decompile runs of the same source can legitimately produce identically-sized output.

**Why it happens:**
There's no portable, cheap way in Node.js to query a given filesystem's actual mtime granularity at runtime, so any fixed slack value is a guess that trades one failure mode for the other; the test suite itself is exposed to the same hazard (the issue explicitly flags that the *fresh*-write case in the existing regression test "happens only 45ms after the call starts," so a coarse-mtime CI runner could make that very test flaky).
**How to avoid:**
Prefer a positive freshness signal over pure mtime-slack subtraction where one is available (e.g. delete or rename any pre-existing `.lst` before invoking `bbjlst`, so *any* file present afterward is provably new — this sidesteps the granularity problem entirely rather than tuning around it). If slack is kept, document the exact value and its filesystem assumption in the same file as the check, and give the regression test itself a controllable/injectable "fake clock" so the test's own correctness doesn't depend on real elapsed wall-time relative to the filesystem's actual granularity.
**Warning signs:** a decompile immediately after editing and re-decompiling the same file returns the previous run's stale output with no error.
**Phase to address:** [RESPONSIVENESS] — #500.

---

### Pitfall 10: The stale-format-promise fix (#499) is patched at the wrong layer, or not at all if "accept the risk" is chosen without recording it

**What goes wrong:**
#499 is explicit that Phase 67's earlier fix (`inFlightFormats.get(uriKey) === formatPromise` map-identity guard) solved a *different* problem (map corruption/URI poisoning) and left this one — stale *content* — untouched, because the shared promise's result reflects whichever request's content was captured first, not the requester's own document state. The trap is doing another map-identity-style fix that again solves adjacent-but-different problem, or choosing the issue's own listed "accept the risk" option without writing down that decision (the issue explicitly frames this as a cheap, deliberate either/or — not doing either, silently, is worse than either choice made and recorded).

**Why it happens:**
The in-flight promise sharing pattern (dedupe concurrent requests for the same key) is a normal, correct pattern for idempotent reads; formatting is not idempotent against a concurrently-edited document, and that distinction is easy to lose once the pattern is already in place and "working" for the common case.

**How to avoid:**
Compare the freshly-read `documentContent` (already computed on every call per the issue's own evidence) against the content the in-flight promise was started with; on mismatch, don't reuse the shared promise — start a fresh format request against current content. If the "accept the risk" branch is chosen instead, it must be recorded as a decision (mirroring how this project already records "Accepted residual" items elsewhere) rather than left as an implicit non-fix.
**Phase to address:** [RESPONSIVENESS] — #499.

---

### Pitfall 11: New composer discoverability cues (#650) or SETOPTS decode hovers (#475) reparse the whole file per keystroke

**What goes wrong:**
#650 asks for a persistent, visible cue in the editor (CodeLens-like, "above the statement") for every composer opportunity in both IDEs, not just VS Code's lightbulb. #475's tier 2 ("decode hovers… works everywhere") is explicitly scoped as "per-statement decoding needs no whole-program knowledge, so it's always sound" — but a naive implementation that recomputes composer applicability or SETOPTS decoding by re-walking the *entire* document AST on every keystroke (rather than hooking into the LS's existing document-build/validation cycle, which already runs on the established 500ms debounce) reintroduces exactly the per-file, unbounded-scan cost pattern #505 is fixing elsewhere in this same milestone — and does it in a new code path #505's own fix won't touch.

**Why it happens:**
CodeLens/inlay/hover providers in Langium/LSP are naturally implemented as "given the document, find all applicable spots," and it's easiest to write that as "walk everything, filter" rather than incrementally updating from a cache keyed off the existing build cycle.

**How to avoid:**
Compute composer-cue positions and SETOPTS decode results as part of the same document-build pass that already runs BBjCPL/validation (or explicitly cache and invalidate on that pass's completion), not as an independent per-request full walk. On the IntelliJ side, avoid registering a document listener that recomputes on every `DocumentEvent` (the same class of bug as #611's per-keystroke composer preview round trip, see Pitfall 12) — gutter icons and inline hints should update on the editor's existing "document changed and settled" signal, not the raw keystroke stream.
**Warning signs:** visible input lag or a CPU spike while typing in a large `.bbj`/`config.bbx` file after the cue feature ships, that wasn't there before.
**Phase to address:** [COMPOSER] — #650, #475 (tier 2 decode hovers).

---

### Pitfall 12: A new IntelliJ composer debounce is hand-rolled per dialog instead of reusing the established `Scheduler`/`Alarm` seam

**What goes wrong:**
#611 needs a debounce on all three composer dialogs' `SimpleDocumentListener`s. This project already solved the general "debounce a keystroke-driven action on IntelliJ, testably" problem in Phase 79 (`KeystrokeDebouncer` over a plain `Scheduler` interface with an `AlarmScheduler` adapter and a `ManualScheduler` test double, explicitly designed to be shared: "one seam serves both 79-01 and 79-02 rather than two scheduling abstractions"). #611's own acceptance criteria even names the direction ("shared debounce helper using `com.intellij.util.Alarm`"). The pitfall is three near-identical ad-hoc `Alarm` instances added directly inside `MsgboxComposerDialog`/`AddWindowComposerDialog`/`AddChildWindowComposerDialog` (repeating the exact "identical pattern duplicated across N files" shape #530 and #623 already found and had to fix elsewhere in this same issue set) instead of extending the existing seam to a fourth caller — and, per #611's own acceptance text, doing it with **no regression test**, since "no `src/test/` source set exists for `bbj-intellij` today" was true when the issue was filed but is now stale: Phase 79-83 built exactly this kind of plain-Java-seam+JUnit coverage (`RestartGateTest`, `KeystrokeDebouncerTest`, the 504-test IntelliJ suite). Treating #611 as still needing "a recorded manual verification step" instead of a `KeystrokeDebouncerTest`-style unit test is a regression in rigor, not a limitation.

**Why it happens:**
The issue text was authored before Phase 79-83 landed the plain-Java-seam testing pattern, so its own "acceptance criteria" language is out of date relative to what the codebase can now support.

**How to avoid:**
Reuse `KeystrokeDebouncer`/`Scheduler`/`AlarmScheduler` (or extend it if the composer's debounce semantics genuinely differ — e.g. per-field vs. per-dialog coalescing) rather than adding three new `Alarm` instances. Write the regression test as plain JUnit against the `Scheduler` interface with the existing `ManualScheduler` double, exactly as `KeystrokeDebouncerTest` does, instead of falling back to "recorded manual verification."
**Phase to address:** [COMPOSER] — #611 (also relevant to #612's per-project cache, same "there is now a test harness" correction).

---

### Pitfall 13: The new `bbj/composer/setopts/*` LS surface breaks silently across an LSP4IJ/lsp4j version skew, repeating G-81-4/G-81-5

**What goes wrong:**
#633 explicitly creates a brand-new shared LS command layer ("`bbj/composer/setopts/*` has zero matches today") that both VS Code and a new IntelliJ `SetoptsComposerDialog` will consume — the same shape of cross-client shared-DTO surface that `bbj/compile` was in Phase 81, where two version-skew bugs actually shipped and had to be gap-closed: G-81-4 (a `Number.MAX_SAFE_INTEGER` sentinel overflowed LSP4IJ's `int`-typed `Position.character`, crashing `MessageIssueException` on any diagnostic-bearing response) and G-81-5 (`plugin.xml` cannot pin the *runtime* LSP4IJ version — the Gradle-pinned 0.19.0 build-time API and the IDE's actual bundled 0.21.0 lsp4j diverged on `Diagnostic.getMessage()`'s return type, `String` vs. `Either`, causing a `NoSuchMethodError` in the live IDE that the JUnit suite could not catch because it compiles and runs against the *build-time* version). A new composer DTO surface (byte/bit vectors, tri-state fields per #475) built the same way — hand-written serialization assumptions, tested only against the build-time LSP4IJ jar — can ship the same class of bug invisibly, since `plugin.xml`'s LSP4IJ dependency is still unpinned at runtime (per STATE.md's "Known tech debt": "LSP4IJ experimental API usages remain… fenced by signature canaries and an eleven-file import allowlist that fail on drift").

**Why it happens:**
This is architecturally unavoidable as long as LSP4IJ's runtime version is unpinned in `plugin.xml` — every new request/response shape crossing that boundary inherits the same risk, and it's easy to treat each new composer feature as "just another JSON-RPC call" without re-running the version-skew checklist Phase 81/83 already had to build the hard way.

**How to avoid:**
Extend Phase 83's existing pattern rather than reinventing it: add the new SETOPTS DTOs to `ComposerModelsJsonBoundaryTest`'s generalized boundary harness (already generalized "across all seven composer DTOs" per Phase 83 Plan 03), keep any numeric sentinel values within the `int` range LSP4IJ's lsp4j actually uses (reuse the shared `END_OF_LINE_CHARACTER`-style constant pattern rather than inventing a new one), and read any lsp4j-vendored type reflectively by field/method *name* where its shape has previously changed across versions (mirroring `CompileResultPresenter.messageTextOf`'s reflective `getMessage()` read), not by direct cast. Confirm the version-pin test (`Lsp4ijClassFileMarkers`/import allowlist family) extends to the new composer's touch points, not just the compile surface it currently covers.
**Phase to address:** [COMPOSER] — #633, #475 (any code that serializes new composer data across the shared LS boundary).

---

### Pitfall 14: LSP4IJ's client API may not support what a targeted, no-restart request needs — for both #632 and the new SETOPTS composer surface

**What goes wrong:**
#632 names its own uncertainty directly: "whether LSP4IJ's client API supports issuing a custom request without a full server restart" is "an open question this unit's own sweep could not settle," and its acceptance criteria explicitly branches on the answer (targeted request, or a documented rationale for why restart is the only buildable option). The same open question applies to #633's new composer command layer and to any config-reload path that tries to do fine-grained re-evaluation instead of a full restart (#486 already rules that out for PREFIX/USE changes specifically, but a future narrower request — e.g. "just re-read `config.bbx`" — would hit the identical LSP4IJ capability question). Treating this as "obviously fine because VS Code's `client.sendRequest` already does it" ignores that VS Code's LSP client and LSP4IJ are different client implementations with different exposed surface area, and Community Edition compatibility (a hard constraint per PROJECT.md) further narrows which JetBrains platform APIs are even available to build a custom request path with.

**Why it happens:**
LSP4IJ's public API surface for arbitrary custom requests/notifications is less mature than VS Code's `vscode-languageclient`, and this project already tags several LSP4IJ touch points `@ApiStatus.Experimental` (Phase 83's `Lsp4ijClassFileMarkers` exists specifically to prove this class-file-only annotation can't be checked at runtime) — meaning "does the API exist" often can't be answered by a runtime check at all, only by reading LSP4IJ's actual source/version notes.

**How to avoid:**
Resolve LSP4IJ's custom-request capability *once*, early in the milestone (it gates #632 and shapes how #633's dialog talks to the LS), rather than separately for each issue. If LSP4IJ genuinely can't issue an arbitrary custom request outside its own managed completion/hover/etc. lifecycle, `bbj/refreshJavaClasses`-equivalent and `bbj/composer/setopts/*` may both need to route through whatever *does* exist (e.g. `workspace/executeCommand`, which LSP4IJ does support generically) rather than as bespoke request types — decide this pattern once and apply it to every new custom endpoint added this milestone.
**Phase to address:** [CONFIG] — #632; [COMPOSER] — #633's command-layer design, decided before dialog implementation starts.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Trusting the older issues' "no `src/test/` source set exists" acceptance language (#608, #610, #611, #612, #632, #633) and falling back to "manual verification" | Less test-writing work per issue | Regresses the rigor Phase 79-83 already established (504-test plain-Java-seam suite); manual verification doesn't survive the next refactor | Never for these issues specifically — the harness now exists; use it |
| Fixed mtime slack constant for #500 without a documented filesystem assumption | Quick, unblocks the fix | Silently trades "too-strict" (original bug) for "too-loose" (stale file admitted) depending on the deploy filesystem, with no visibility into which | Only with the value and its assumption documented next to the check, and only after checking whether the delete-before-decompile alternative (Pitfall 9) is truly unavailable |
| A bespoke `Alarm` per composer dialog instead of extending `KeystrokeDebouncer` (#611) | Faster to write in isolation | Recreates the exact "identical pattern duplicated across N files" defect class this milestone is already fixing in #530/#623 | Never — the shared seam exists precisely for this |
| Auto-restart on config change with no suppression window for the plugin's own composer writes (#486 + #633 combo) | Simpler watcher logic | Self-inflicted restart loop indistinguishable from #232's CPU-loop history | Never — sequence or couple these two fixes explicitly |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| VS Code `FileSystemWatcher` for an out-of-workspace config file | Bare glob or workspace-relative `RelativePattern`, matching the existing `**/*.bbj` precedent | Absolute `RelativePattern` on the resolved (symlink-followed) directory + filename |
| IntelliJ `VirtualFileListener`/`AsyncFileListener` for the same config file | Project-content-scoped listener, matching the assumption that all watched files live under a content root | Explicit non-project-scoped watch on the resolved absolute path |
| LSP4IJ custom request/notification (`bbj/refreshJavaClasses`, `bbj/composer/setopts/*`) | Assuming VS Code's `sendRequest` pattern ports 1:1 to LSP4IJ's client API | Confirm LSP4IJ's actual capability first (Pitfall 14); fall back to `workspace/executeCommand` if arbitrary custom requests aren't supported |
| lsp4j-vendored types crossing the shared LS boundary (`Diagnostic`, `Position`, new composer DTOs) | Direct field access/cast against the build-time (Gradle-pinned) lsp4j version | Reflective read by name (mirrors `CompileResultPresenter.messageTextOf`) or a value range provably safe across versions (mirrors `END_OF_LINE_CHARACTER`); extend the boundary-test family to cover new DTOs |
| BBjServices / java-interop socket (port 5008) | A new circuit breaker tuned only against the fixed 10s connect timeout, ignoring that the status-bar widget already runs an independent TCP health probe | Share or explicitly reconcile the breaker's state with the existing health-probe signal; don't create a third independent notion of "is the peer up" |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Full-AST walk per keystroke for a new CodeLens/hover/gutter cue (#650, #475 decode hovers) | Typing lag, CPU spike in large files, worse than before the cue feature shipped | Hook into the existing document-build/validation cycle and its 500ms debounce instead of an independent per-request walk | Any file large enough that a full walk exceeds a keystroke interval; scales with file size, same class as #505 |
| Per-keystroke composer preview round trip with no debounce (#611) | One `bbj/composer/*/preview` LSP4IJ call per character typed in any composer field | Route through the shared `Scheduler`/`Alarm` debounce seam (Pitfall 12) | Any composer field with more than a couple characters typed quickly; worse on a slower LS/interop round trip |
| Unbounded LRU pin set for in-flight cyclic resolution (#497) | Java class resolution memory/identity-set growth that doesn't shrink even after `clearCache()` | `finally`-guaranteed unpin on every exit path; bound the pinned set to at most one call chain's ancestry | A classpath with many cyclic type references (common in real JDKs) resolved repeatedly in one session |
| Serialized N × 10s connect-timeout for N distinct unresolved classes against an unreachable peer (#504, pre-fix) | Document validation with many unresolved Java references takes `10×N` seconds | Circuit breaker with a proper open/half-open state (Pitfall 6) | Any document with more than 2-3 distinct unresolved classes while the interop peer is down |
| Cross-project index full scan per `::file::Class` reference, unpruned AST walk per document (#505) | CPU cost scales with total multi-project workspace size, not the active file's size | Per-file cache keyed on `bbjFilePath` + doc URI; `isExternalDocument`-aware pruning mirroring `bbj-linker.ts`'s `treeIter.prune()` | Any multi-project workspace with a nontrivial number of external/referenced documents — this is #232's original reported symptom |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Restart-on-config-change triggered by any writable process, including a symlink target outside the user's control | A config file an attacker can write to (shared/networked `bbj.home`) can force repeated LS restarts (denial of service against the editing session) | Debounce with a reasonable minimum interval; treat rapid repeated config-file churn as a signal to back off rather than restart on every event, mirroring the existing 500ms trailing-edge convention |
| New composer write paths (#633, #475 canonical-block regeneration) reusing addWindow/addChildWindow's pre-#623 unconditional-apply pattern | A malformed value from a composer field written verbatim into the user's own document (self-inflicted corruption, not attacker-controlled, but still a real defect class this milestone is explicitly fixing for two other composers) | Port the `validateStringField`/`r.valid` gate pattern from `msgbox-composer-webview.ts` to every new composer's insert/apply path from day one, not as a follow-up fix |
| SETOPTS composer's "absolute vector" advanced mode overwriting application-reserved bytes 11-16 | Silent data loss for BBj options outside what the composer models | #475 already flags this: require an explicit warning before applying the absolute-vector mode, and preserve unknown/reserved bytes verbatim in every other (canonical-block, decode) path |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Composer cue only as a VS Code lightbulb with zero visible indication on IntelliJ (#650's stated current state) | IntelliJ users don't discover composers exist at all unless they know to right-click | A visible, always-on cue (gutter icon / inline CodeLens-equivalent) on both IDEs, not just a context-menu action |
| Silent restart on config-file change with no user-visible cue | User loses in-progress diagnostics/completions with no explanation, may think the IDE is broken | Status-bar/notification cue that a restart is happening and why (mirrors this project's existing "status bar over notification balloons" convention for BBjCPL) |
| Status-bar widget visibility that only updates on a status-bus event, never on a bare editor-tab switch (#610) | Widget shows stale visibility state (visible for a non-BBj file, or hidden for a BBj file) until an unrelated status transition happens to occur | Register a `FileEditorManagerListener`/equivalent editor-selection hook in addition to the existing status-bus trigger |
| Command invoked with no active editor throws instead of a graceful message (#512) | Jarring `TypeError` from a keybinding pressed with focus elsewhere | Apply the existing `resolveTargetFileName()` guard pattern to all affected commands uniformly |

## "Looks Done But Isn't" Checklist

- [ ] **Config-file watcher (#486):** Often missing — verify it fires for a `bbj.home` *outside* the workspace folder, not just inside it (Pitfall 1); verify it survives an atomic (write-temp+rename) save (Pitfall 2).
- [ ] **Custom config-file language association (#485):** Often missing — verify the association survives a document *reopen*/*revert*, not just the initial open (Pitfall 5).
- [ ] **Circuit breaker (#504):** Often missing — verify it *recovers* once the peer becomes reachable again without requiring `clearCache()`, not just that it fails fast the first time (Pitfall 6).
- [ ] **LRU pin fix (#497):** Often missing — verify the pinned/protected set returns to empty after a *cancelled or timed-out* resolution, not just a successful one (Pitfall 7).
- [ ] **Cancel-token threading (#498):** Often missing — verify two *concurrent* completion requests for two *different* documents don't observe each other's cancellation state (Pitfall 8).
- [ ] **mtime-slack fix (#500):** Often missing — verify a genuinely *stale* pre-existing `.lst` file is still rejected after the slack is added, not just that a fresh fast write is now accepted (Pitfall 9).
- [ ] **IntelliJ composer/config-refresh test coverage (#608, #610, #611, #612, #632, #633):** Often missing — verify each ships a plain-JUnit test against the established seam pattern (Scheduler/Alarm, `BbjSettingsLookups`-style result objects), not a "recorded manual verification step" — the harness these issues were filed against no longer applies (Pitfall 12).
- [ ] **New shared composer DTO surface (#633, #475):** Often missing — verify it's covered by the generalized JSON-boundary test family and any numeric sentinel stays in-range for lsp4j's actual runtime types (Pitfall 13), not just that it round-trips against the build-time LSP4IJ jar.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Config watcher scoped wrong (Pitfall 1) | LOW | Rebuild the `RelativePattern` from the resolved absolute path; no data loss, just a silent no-op until fixed |
| Self-inflicted restart loop from composer write (Pitfall 3) | MEDIUM | Add the self-write suppression window; if already shipped, a hotfix patch release is the only path since it manifests as a live-editing disruption |
| LRU pin leak (Pitfall 7) | MEDIUM | Add the `finally`-guaranteed unpin and a bound on the pinned set; existing leaked state clears on next `clearCache()`/restart, so no persistent corruption |
| G-81-4/G-81-5-style version skew in a new composer DTO (Pitfall 13) | HIGH if it ships before being caught (requires a live-IDE bug report to surface, per the Phase 81 precedent), LOW if caught by the extended boundary-test family before ship | Reflective read fix (mirrors 81-07) or sentinel-range fix (mirrors 81-06); both are narrow, single-file patches once identified |
| Circuit breaker stuck open (Pitfall 6) | LOW | Add the half-open probe state; until fixed, `clearCache()` (or a full restart) is the existing user-facing workaround |

## Pitfall-to-Phase Mapping

| Pitfall | Feature Group | Verification |
|---------|----------------|---------------|
| Watcher scoped to workspace-relative pattern (P1) | [CONFIG] | Test with `bbj.home` outside the workspace; test with a symlinked `bbj.home` |
| Atomic-save defeats change watcher (P2) | [CONFIG] | Test with a temp-write+rename save (simulate via `fs.rename` in the test, not just `fs.writeFile`) |
| Composer write triggers self-restart (P3) | [CONFIG] + [COMPOSER] | Open SETOPTS composer, apply an edit, assert no restart/no dropped in-flight request |
| Debounce collision (P4) | [CONFIG] | Save `.bbj` and config file in the same edit burst; assert no restart mid-validation |
| Dynamic language association vs. static `filenames` (P5) | [CONFIG] | Open, revert, reopen a custom-named config file; assert language ID stable across all three |
| Circuit breaker never resets / trips on slow peer (P6) | [RESPONSIVENESS] | Simulate peer down-then-up; assert resolution resumes without `clearCache()` |
| LRU pin leak (P7) | [RESPONSIVENESS] | Force cancellation/timeout mid cyclic-resolution; assert pinned set returns to empty |
| Cancel token races across concurrent requests (P8) | [RESPONSIVENESS] | Two concurrent completions, different documents, one cancelled; assert isolation |
| mtime slack admits stale file (P9) | [RESPONSIVENESS] | Pre-place a stale `.lst`, immediately trigger decompile; assert stale file rejected even with slack applied |
| Stale format promise (P10) | [RESPONSIVENESS] | Two overlapping format requests with differing captured content; assert second reflects current content or is explicitly documented as accepted risk |
| Per-keystroke full-AST cue computation (P11) | [COMPOSER] | Timing assertion on cue computation tied to the document-build cycle, not raw keystroke count |
| Ad-hoc per-dialog debounce instead of shared seam (P12) | [COMPOSER] | `KeystrokeDebouncer`-style plain JUnit test against the composer's `Scheduler` usage |
| Composer DTO version skew (P13) | [COMPOSER] | Extend `ComposerModelsJsonBoundaryTest` to new SETOPTS DTOs; sentinel-range test |
| LSP4IJ custom-request capability unresolved (P14) | [CONFIG] + [COMPOSER] | A single spike/decision recorded once, referenced by both #632 and #633's implementation plans |

## Sources

- This repository's own GitHub issue evidence sections (#486, #485, #632, #608, #505, #504, #497, #498, #500, #499, #512, #531, #610, #650, #648, #649, #633, #475, #623, #532, #530, #611, #612) — each cites exact file/line evidence, which this document treats as HIGH-confidence primary source over any general LSP/Langium/LSP4IJ advice.
- `/home/coder/repos/bbj-language-server/.planning/PROJECT.md` — Key Decisions table (100% CPU rebuild-loop history #232, RestartGate/EDT-05, LSP4IJ version-skew gaps G-81-4/G-81-5, TokenValidationCache/circuit-breaker-adjacent precedent, `createOwnerOnlyFile`'s "no fourth outcome" pattern, plain-Java-seam testing precedent from Phase 79-83).
- `/home/coder/repos/bbj-language-server/.planning/STATE.md` — Active Constraints, Tech Debt, Blockers/Concerns (LSP4IJ unpinned at runtime, TextMate filename-exclusion platform limitation, interop test-harness drift).
- Direct source inspection: `bbj-vscode/src/extension.ts` (existing `**/*.bbj` FileSystemWatcher scope), `bbj-vscode/src/language/bbj-ws-manager.ts` (config.bbx load-once-at-startup path), `bbj-vscode/package.json` (static `filenames` contribution for `bbx-config`), `bbj-vscode/src/language/java-interop.ts` (single-lock serialization and `resolvedClasses` cache structure underlying #504/#497).

---
*Pitfalls research for: BBj Language Server v4.3 Polish & Quality milestone*
*Researched: 2026-09-06*
