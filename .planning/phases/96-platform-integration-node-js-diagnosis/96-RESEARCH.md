# Phase 96: Platform Integration & Node.js Diagnosis - Research

**Researched:** 2026-09-19
**Domain:** IntelliJ Platform SDK integration (TextMate bundle EP, Settings/Color-scheme EP, EditorNotificationProvider EP), plain-Java decision seams over Node.js discovery/download
**Confidence:** HIGH for verified source/bytecode findings; MEDIUM for platform-behavior claims backed by official docs; LOW/ASSUMED flagged individually below

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

D-01 through D-15, verbatim from `.planning/phases/96-platform-integration-node-js-diagnosis/96-CONTEXT.md`'s `<decisions>` section — reproduced there in full; summarized here for quick reference and NOT to be re-opened by this research or by planning:

- **D-01:** The Color Settings page is deleted — `BbjColorSettingsPage.java` and its `plugin.xml:236` `<colorSettingsPage>` registration both go. `BbjTokenTypes` stays untouched (still live, used by `BbjWordLexer`/`BbjParserDefinition`/`BbjPairedBraceMatcher`).
- **D-02:** `documentation/docs/intellij/features.md:39-41`'s "Customization" section is rewritten (not deleted) to state highlighting is TextMate-driven and follows the active IDE theme.
- **D-03:** Verification is hand UAT only for PLAT-02 — no absence guard is required (an optional one is idiomatic but would permanently forbid re-adding a page).
- **D-04:** Close #621 as done on cited reasoning — deletion supersedes both branches its acceptance criteria named.
- **D-05:** One decision engine — the editor banner stops calling `NodeAvailability.decide` and routes through `NodeExecutableResolver.resolve`, inheriting its configured→detected→cached fallback and `Source`×`Reason` vocabulary. This is PLAT-05's required product decision: yes, an unusable configured path consults the cached download, reached by unifying the two seams. Reversibility: costly.
- **D-06:** The minimum-version check becomes a sixth validation step inside the resolver, after "is executable," resolved through `BbjNodeVersionCache`. INTENDED OBSERVABLE CHANGE (declare at UAT): a too-old configured Node is now rejected at startup and falls through to detected/cached. Reversibility: costly.
- **D-07:** "Cache directory inaccessible" becomes a new `Reason` constant on the `CACHED` source (e.g. `CACHE_UNAVAILABLE`). Rejected: a second sealed-result-type vocabulary, and a log-only fix.
- **D-08:** The banner's text AND its action set both vary by reason, through a platform-free `NodePresentation` seam modelled on `InteropStatusPresentation`. The cache-inaccessible case drops "Download Node.js."
- **D-09:** The notification base covers all four registered providers (not the three #622 names); `BbjServerCrashNotificationProvider`'s extension check is replaced by the resolved-file-type guard. Overrides ROADMAP criterion 3. INTENDED OBSERVABLE CHANGES (declare at UAT): crash banner now appears on `.bbx`, no longer appears on `.bbl`. Reversibility: costly.
- **D-10:** All three of the crash provider's divergences are normalized: every provider becomes `DumbAware`; every provider constructs its panel with the `fileEditor` argument; `Status` stays a per-subclass hook. INTENDED OBSERVABLE CHANGE (declare at UAT): crash banner now appears during indexing.
- **D-11:** `BbjFileVisibility.isBbjProgramFileTypeName` is widened to public; the base calls it with `file.getFileType().getName()`. Rejected: `file.getFileType() != BbjFileType.INSTANCE` (keeps two definitions) and relocating all four providers into `ui` (turns a behaviour-preserving consolidation into a hidden rename diff).
- **D-12:** Close #622 as done on cited reasoning — four providers consolidated where the issue named three.
- **D-13:** The maintainer attests PLAT-06 by hand at phase end, against the phase-final build, per the todo's four steps (open a BBj file with no Node configured, use "Download Node.js," confirm `node.exe`+`.sha256` sidecar in `bbj-intellij-data/nodejs` and that the language server starts, capture `idea.log` + directory contents on failure).
- **D-14:** Exactly WR-02 and WR-04 (of the five open 83-REVIEW findings) are folded — both re-verified still open on 2026-09-19. WR-01, WR-03, WR-05, IN-01, IN-02 are explicitly NOT folded (see Deferred Ideas).
- **D-15:** The attestation's outcome is recorded either way; it does not block phase completion. A failure becomes a `WINDOWS.md` entry with `idea.log` + directory contents, and its own debug session or phase. `workflow.windows_enforce` is not set in `.planning/config.json`, so this does not currently block `/gsd-ship`.

### Claude's Discretion

- **PLAT-01 (#613) in full** — not discussed by the user; the shape is the agreed default (a stable cache directory mirroring `BbjNodeDownloader.getNodeDataDirectory()`, replacing the per-launch temp directory, skipping the copy loop on a valid prior copy), with the staleness/invalidation key, concurrent-launch safety, and whether to sweep abandoned `textmate-bbj*` directories all left to research (addressed above in Architecture Patterns).
- `NodeAvailability`'s fate — retired outright, or kept as a thin banner-facing wrapper — and the disposition of its 10 pinned tests in `NodeAvailabilityTest`. (Research recommendation: retire both, per "one engine" reasoning — see State of the Art.)
- Names and packages of the `NodePresentation` seam and the action-id vocabulary it returns, and the notification base's own name and package.
- Exact wording of each reason-specific banner sentence, within D-08's meaning.
- Whether `BbjSettingsLookups`' field validator also routes through the unified resolver or keeps calling `meetsMinimumVersion` directly (see Open Questions #3).
- How the base carries Phase 95's varying banner text (an abstract `bannerText` hook vs a supplied string), and how broken guards are re-pointed — per Phase 95 D-16: assert each pin exactly once inside the base's extracted method body, keep a delegation pin per subclass, and keep negative assertions sweeping the subclass files at full breadth.
- Whether `BbjMissingNodeNotificationSourceGuardTest` is rewritten in place or replaced. Its six-argument ordered pin on `NodeAvailability.decide(` is fully invalidated by D-05.
- Whether IN-02 (`installExtracted:280-282`) is folded alongside WR-04. (Research recommendation: fold it — confirmed a one-line reuse per branch, see Code Examples.)
- Javadoc wording throughout.

### Deferred Ideas (OUT OF SCOPE)

- **Semantic-token coloring in IntelliJ** — the route by which a color-customization page could ever become live again. The language server's `BBjSemanticTokenProvider` emits only `parameter`/`variable`/`keyword` (3 of 9 descriptors), and IntelliJ has no LSP4IJ semantic-token wiring at all. A full integration is a feature phase in its own right; D-03 deliberately adds no guard blocking it.
- **83-REVIEW WR-01** (tar cancellation not honored mid-extraction) — Unix-only, does not touch the Windows path PLAT-06 attests. Verified still open 2026-09-19.
- **83-REVIEW WR-03** (`process.getOutputStream()` never closed) — verified still open 2026-09-19.
- **83-REVIEW WR-05** (`flushPendingHomeLookup()` calling `lookupHome` synchronously on the EDT) — Settings dialog, not the Node pipeline. Verified still open 2026-09-19.
- **83-REVIEW IN-01** (decision-id comments leaked into production Javadoc) — sweep whenever those files are next touched.
- **The `.bbl` question beyond the crash banner** — if `.bbl` should get BBj language support at all is a file-type-registration question for another phase.
- Two reviewed-and-rejected todos (gradle-wrapper-hygiene fixture, live-interop `getAllClassNames` test drift) — both environment drift, not IntelliJ work, not regressions.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAT-01 (#613) | TextMate bundle provider reuses a cached directory instead of a fresh temp directory + 5-file copy every launch; abandoned directories are cleaned up | Architecture Patterns "Pattern 3" and "Concurrent-launch safety"/"Sweep" subsections give the concrete directory location, invalidation key, write-ordering safety mechanism, and sweep scoping. Validation Architecture flags this as a Wave 0 test gap requiring an extracted plain-Java seam. |
| PLAT-02 (#621) | Color Scheme customization page either works or is removed | D-01 (locked: removed). Don't-Hand-Roll/State-of-the-Art note `BbjTokenTypes` must stay untouched. D-02's exact doc text to rewrite is quoted from `features.md:39-41`. |
| PLAT-03 (#622) | Four editor notification providers share one base | Architecture Patterns "Pattern 1" gives the verified `BbjStatusBarWidgetBase<S>` model to translate, a concrete base sketch, and the specific per-provider divergences (file-type guard, panel constructor, `DumbAware`) confirmed by reading all four provider files this session. |
| PLAT-04 (#588) | "Not yet downloaded" vs "cache directory inaccessible" distinguishable to every caller | Common Pitfalls #1 traces the exact swallowed-`IOException` mechanism and gives the recommended fix shape respecting D-07's "no second vocabulary" constraint. |
| PLAT-05 (todo, configured-path fallback) | Configured-but-unusable Node path consults the cached download | Architecture Patterns "Pattern 2" shows the fall-through is automatic once the version check is a `validate()` step, per the existing three-branch `resolve()` structure — no new fall-through logic needed. |
| PLAT-06 (todo, Windows attestation) | Node.js auto-install attested by hand on real Windows | Common Pitfalls #4/#5 (WR-04, WR-02) give concrete, fixture-verified fix recommendations that determine what the attestation will actually exercise. Validation Architecture states explicitly this closes only by human attestation. |
</phase_requirements>

## Summary

This phase touches five already-implemented, already-tested surfaces (`BbjTextMateBundleProvider`,
`BbjColorSettingsPage`, four `EditorNotificationProvider`s, `NodeExecutableResolver`/`NodeAvailability`,
`NodeInstallPipeline`) rather than introducing new libraries or frameworks. All 15 decisions in
96-CONTEXT.md are locked; this research verifies the mechanics needed to implement them without
re-opening any of them, and resolves the one item CONTEXT.md left fully open (PLAT-01/#613).

Every claim below that names a line range was re-read this session with `Read`; every claim about
IntelliJ Platform or LSP4IJ internal behavior was checked by decompiling the exact jar versions this
project's `build.gradle.kts` pins (`ideaIC-2024.2`'s `textmate.jar`/`util.jar` family,
`lsp4ij-0.21.0.jar`), not inferred from memory. Two genuinely new mechanical findings came out of that
work: (1) `TextMateBundleProvider.getBundles()` is an **application-scoped** extension point invoked
under a `ReentrantLock`-guarded `ensureInitialized()`/`reloadEnabledBundles()` inside a single JVM, so
concurrency is a **cross-process**, not cross-thread, question — bounded because `PathManager`'s temp
and plugins paths are both scoped to the IDE's own config path, not the raw OS temp directory; and (2)
`BbjLanguageServer`'s constructor (via LSP4IJ's `createConnectionProvider`) runs on
`ApplicationManager.getApplication().executeOnPooledThread(...)`, confirmed off the EDT by decompiling
`LanguageServerWrapper.start()` in the pinned `lsp4ij-0.21.0.jar` — so D-06's version-check spawn is
safe there by construction, no new threading seam is needed for that call site.

**Primary recommendation:** For PLAT-01, mirror `BbjNodeDownloader.getNodeDataDirectory()`'s exact
`bbj-intellij-data/<subdir>` pattern with a `bbj-intellij-data/textmate` sibling to `nodejs`, invalidate
on plugin version (not per-file content digest — the five bundle files are packaged resources that can
only change when the plugin JAR changes), write the five bundle files first and a version-marker file
**last** so a concurrent reader never observes a "fresh" marker beside a partially-copied bundle, and
sweep `textmate-bbj*` under `PathManager.getTempPath()` only after the new stable directory is
confirmed populated. For PLAT-04/05/06, extend `NodeExecutableResolver.resolve()`/`validate()` with a
**new overload** carrying the version-check collaborators, keeping the existing 4-arg overload as a
thin "no version gating" delegator — this satisfies the canonical-refs requirement that
`NodeExecutableResolverTest`'s ~24 existing 4-arg call sites keep passing with **zero edits**, while
`BbjLanguageServer` and the rebuilt banner call the new 6-arg overload. For PLAT-03, follow
`BbjStatusBarWidgetBase<S>`'s exact base+thin-subclass shape (verified in full below) rather than
inventing a new consolidation pattern.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TextMate bundle caching (PLAT-01) | IDE Plugin (application-level EP) | Filesystem / plugin data dir | `TextMateBundleProvider` is a platform EP with no project scope; the cache lives under the IDE's own config-scoped plugins path |
| Color scheme customization (PLAT-02) | IDE Plugin (Settings EP) | — | `ColorSettingsPage` is a pure Settings-dialog integration; deleted, not replaced, since TextMate owns highlighting |
| Editor notification banners (PLAT-03) | IDE Plugin (EditorNotificationProvider EP) | Project services (`BbjJavaInteropService`, `BbjServerService`) | Banners are UI, but their *decisions* delegate to project-level services already responsible for status |
| Node.js discovery/validation (PLAT-04/05/06) | IDE Plugin (plain-Java decision seam) | Filesystem / subprocess (`node --version`) | `NodeExecutableResolver` and companions hold no `com.intellij` import by design — this is the "decision layer," with IDE-only wiring (`BbjLanguageServer`, the banner provider) as a thin edge |
| Node.js download/install (PLAT-06) | IDE Plugin (background task) | External network (nodejs.org over HTTPS) + OS process (`tar`) | `NodeInstallPipeline` is plain-Java but its production wiring (`BbjNodeDownloader.productionPipeline()`) is platform-bound; only Windows itself can attest the `.zip` branch |

## Project Constraints (from CLAUDE.md)

- BBj is case-insensitive — not directly relevant to this phase's files, but preserved as a standing
  constraint for anyone editing grammar-adjacent code.
- `bbj-vscode/` is where nearly all development happens; this phase is the exception — every file is
  under `bbj-intellij/` (confirmed: all files read this session are under `bbj-intellij/src/main/java`
  or `bbj-intellij/src/test/java`).
- Never edit generated files directly (`src/language/generated/` in `bbj-vscode/`) — not touched by
  this phase.
- Shell and file-access rules (absolute paths, no `cd` chained with `grep`/`find`/`cat`, no blind
  recursive scans, `Grep` tool unavailable per project memory — use scoped `bash grep` instead):
  followed throughout this research session; every command in the Sources section used an absolute
  path and a scoped target.
- `git add <exact path>` only when staging, never `-A`/`.` — applies to whichever plan stages this
  phase's changes, not to this research task itself (no commits made this session beyond writing
  RESEARCH.md, per this agent's own "do not modify source" instruction).

## Standard Stack

Not applicable — this phase introduces no new libraries, frameworks, or dependencies of any
ecosystem. Every file touched already exists in `bbj-intellij/src/main/java` and depends only on the
IntelliJ Platform SDK and LSP4IJ, both already declared in `build.gradle.kts` and already used
throughout the codebase (`com.redhat.devtools.lsp4ij:0.21.0`, IntelliJ Platform `2024.2`+ per
`build.gradle.kts`). No `npm install` / `pip install` / `cargo add` step applies.

## Package Legitimacy Audit

Not applicable — no external package is added, upgraded, or otherwise introduced by this phase. The
Package Legitimacy Gate protocol is skipped per its own trigger condition ("whenever this phase
installs external packages"); this phase installs none.

## Architecture Patterns

### System Architecture Diagram

```
IDE process (single JVM, application-scoped)
│
├── TextMate EP (org.jetbrains.plugins.textmate.TextMateServiceImpl, application service)
│     ensureInitialized() ──[ReentrantLock: registrationLock]──> registerBundles(false)
│        └─> TextMateBundleProvider.EP_NAME.extensionList.forEach { it.getBundles() }
│              └─> BbjTextMateBundleProvider.getBundles()          <── PLAT-01 lives here
│                    ├─ (today) Files.createTempDirectory(tempPath, "textmate-bbj") + copy 5 files
│                    └─ (after) bbj-intellij-data/textmate/ : version-marker check → skip-or-copy
│     reloadEnabledBundles() [public] ──> same path, can re-invoke getBundles() mid-session
│
├── Settings dialog EP (ColorSettingsPage)                         <── PLAT-02: deleted entirely
│
├── EditorNotificationProvider EP (4 registrations, plugin.xml:254-265)
│     BbjMissingHomeNotificationProvider  ──file-type guard──> BbjHomeDetector           (unchanged)
│     BbjMissingNodeNotificationProvider  ──file-type guard──> NodeExecutableResolver     <── PLAT-04/05
│     BbjJavaInteropNotificationProvider  ──file-type guard──> BbjJavaInteropService + InteropStatusPresentation
│     BbjServerCrashNotificationProvider  ──EXTENSION guard (bug)──> BbjServerService.isServerCrashed()
│        ⇓ D-09/D-10/D-11: all four share one base; crash provider's guard becomes file-type too
│
└── LSP4IJ (LanguageServerWrapper.start(), decompiled 0.21.0)
      Application.executeOnPooledThread(() -> {
          provider = serverDefinition.createConnectionProvider(project)   // → new BbjLanguageServer(project)
              └─ resolveNodePath(project)
                    configuredPath, detectedPath, cachedPath = BbjNodeDownloader.getCachedNodePath()
                    NodeExecutableResolver.resolve(...)   <── PLAT-04/05/06: sixth (version) step added here
      })   // OFF the EDT — verified, not assumed (see Sources)
```

### Recommended Project Structure

No new files/directories at the top level; new files land beside their siblings:

```
bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── BbjTextMateBundleProvider.java        # rewritten: stable dir, version marker, sweep
├── BbjColorSettingsPage.java             # deleted (D-01)
├── ui/
│   ├── BbjNotificationProviderBase.java  # NEW — base for the four providers (name is discretion)
│   ├── BbjMissingHomeNotificationProvider.java     # thin subclass (moved or stays — see below)
│   ├── BbjMissingNodeNotificationProvider.java     # thin subclass
│   ├── BbjJavaInteropNotificationProvider.java     # thin subclass
│   └── BbjServerCrashNotificationProvider.java     # thin subclass (already in ui/)
└── lsp/
    ├── NodeExecutableResolver.java       # + sixth validation step, + new Reason, + new overload
    ├── NodePresentation.java             # NEW — D-08 seam (name is discretion)
    └── NodeInstallPipeline.java          # WR-02, WR-04 (+ optionally IN-02) fixes
```

**Relocation note:** D-11's canonical_refs explicitly rejected "relocating all four providers into
`ui`" as a decision *for the file-type-guard change itself* ("turning a behaviour-preserving
consolidation into a rename diff that hides the real change in review"). Two of the four providers
(`BbjMissingHomeNotificationProvider`, `BbjMissingNodeNotificationProvider`,
`BbjJavaInteropNotificationProvider`) currently live in the **default** package
(`com.basis.bbj.intellij`), not `ui`; only `BbjServerCrashNotificationProvider` is already in `ui`.
Since `plugin.xml:254-265` registers all four by concrete FQN and needs **no** change either way
(verified: registration is per-concrete-class, not per-package), moving the other three into `ui`
alongside the new base is a **separate** file-move decision from D-11's guard fix — recommend keeping
all four (and the new base) in whichever single package the planner picks for the base, decided once
and stated explicitly, rather than leaving three in the default package and one in `ui`.

### Pattern 1: Base + thin-subclass consolidation (verified model: `BbjStatusBarWidgetBase<S>`)

**What:** An abstract base implements the platform interface (`CustomStatusBarWidget` there,
`EditorNotificationProvider` here) and owns every member/step that is identical across concrete
subclasses; each subclass supplies only its own status type and rendering via abstract hooks.

**When to use:** Exactly the D-09/D-10/D-11 situation — four (there, two) implementations of the same
platform interface that differ only in a small, enumerable set of hooks.

**Verified structure** (read in full this session,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetBase.java:35-161`):
- Constructor takes only what every subclass needs (`Project`) and does all shared wiring
  (message-bus connection, `FileEditorManagerListener` subscription, initial render).
- Abstract hooks are typed per-subclass concern (`currentStatus()`, `iconFor(S)`, `textFor(S)`,
  `tooltipFor(S, String)`, `addPopupItems(JPopupMenu)`), never a single "do everything" hook — this is
  what keeps a wiring mistake a compile error.
- A `protected final` template method (`updateStatus(S)`) sequences the shared render steps and is
  the *only* place `updateVisibility()` is called — one method, one call site, easy to pin with a
  source guard (`BbjStatusBarWidgetSourceGuardTest.java:124-130`, verified, asserts
  `BbjFileVisibility.showsForSelection(` appears exactly once inside `updateVisibility()`'s body).
- Widget-specific popup construction stays entirely in the subclass via `addPopupItems`; the base only
  supplies a `protected final addOpenSettingsItem(JPopupMenu)` convenience the subclass calls at the
  position it wants.

**Recommended translation to `EditorNotificationProvider`:**
```java
// Sketch — not verified code, a design recommendation grounded in the pattern above.
public abstract class BbjNotificationProviderBase implements EditorNotificationProvider, DumbAware {

    @Override
    public final @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            collectNotificationData(@NotNull Project project, @NotNull VirtualFile file) {
        if (!BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())) {
            return null;
        }
        return buildPanel(project, file);
    }

    /** Subclass hook: the file-type guard has already passed. Return null for "no banner". */
    protected abstract @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file);

    /** Shared panel construction, always through the fileEditor overload (D-10). */
    protected static EditorNotificationPanel newPanel(
            @NotNull FileEditor fileEditor, EditorNotificationPanel.Status status, String text) {
        EditorNotificationPanel panel = new EditorNotificationPanel(fileEditor, status);
        panel.setText(text);
        return panel;
    }
}
```
Each subclass keeps its own action labels (`createActionLabel(...)`) — those are genuinely
per-provider and not shared, matching how `addPopupItems` stays per-subclass in the status-bar base.
This also means `BbjServerCrashNotificationProvider`'s `requestRestart(0)` call site
**stays inside that file**, so `BbjServerServiceRestartSourceGuardTest`'s existing
`EXTERNAL_RESTART_SITES` entry for it (verified,
`BbjServerServiceRestartSourceGuardTest.java:25-26,84-92`) needs **no re-pointing** if this shape is
followed — only re-point it if the restart action is hoisted into the shared base instead.

### Pattern 2: Additive overload over signature-breaking change (`NodeExecutableResolver`)

**What:** When a new validation step needs new collaborators but an existing signature has many
pinned call sites, add a new overload that takes the extra collaborators, and make the old signature
delegate to it with permissive defaults — rather than changing the old signature and updating every
call site.

**When to use:** Here, specifically, to satisfy the canonical-refs constraint that
`NodeExecutableResolverTest` (24 test methods, all calling the current 4-arg
`resolve(configuredPath, detectedPath, cachedPath, probe)`, verified in full this session) "must keep
passing." Two ways to make D-06's sixth validation step true without editing that file:

```java
// Existing signature — becomes a thin delegator, its own contract documented as
// "no version gating" so the 24 existing tests remain correct assertions of that contract.
public static Resolution resolve(String configuredPath, String detectedPath, String cachedPath,
                                  PathProbe probe) {
    return resolve(configuredPath, detectedPath, cachedPath, probe,
            path -> null, version -> true);   // no-op version collaborators
}

// New overload — the one BbjLanguageServer and the rebuilt banner call.
public static Resolution resolve(String configuredPath, String detectedPath, String cachedPath,
                                  PathProbe probe, Function<String, String> versionOf,
                                  Predicate<String> meetsMinimum) {
    // validate() grows a sixth step after isExecutable: resolve version, check meetsMinimum,
    // reject with a new Reason (e.g. BELOW_MINIMUM_VERSION) on failure.
}
```
`Function<String, String>` and `Predicate<String>` are already the exact functional-interface shapes
`NodeAvailability.decide` uses today (verified,
`NodeAvailability.java:49-51`), so no new interface type is introduced — production code passes
`BbjNodeVersionCache.SESSION::getVersion` and `BbjNodeDetector::meetsMinimumVersion`, identically to
how the banner already wires them into `NodeAvailability.decide` today (verified,
`BbjMissingNodeNotificationProvider.java:39-42`).

**PLAT-05's fall-through is then automatic**, not a separate code path: because `resolve()`'s existing
three-branch fall-through (SETTINGS → DETECTED → CACHED, verified `NodeExecutableResolver.java:155-172`)
already re-runs the *same* `validate()` for every candidate, a configured-but-too-old Node now falls
through to the cached download exactly the way a configured-but-missing Node already does today
(verified via the existing `aRejectedConfiguredValueFallsThroughToAValidCachedValue` test,
`NodeExecutableResolverTest.java:342-362`) — no new fall-through logic is needed, only the new
rejection reason feeding into the pre-existing mechanism.

### Pattern 3: PLAT-01's stable-directory cache — mirroring `BbjNodeDownloader`'s cache-hit shape

**What:** `NodeInstallPipeline.cachedNodePath()` (verified, `NodeInstallPipeline.java:161-169`) is the
in-repo model for "does a valid cached artifact already exist at a stable path": it checks
`paths.exists`, `paths.isExecutable`, then `integrity.matchesRecordedDigest` — three gates, all
consulted before trusting the cache, none of which throws.

**Recommended translation for the TextMate bundle:**
1. Target directory: `Paths.get(PathManager.getPluginsPath(), "bbj-intellij-data", "textmate")` —
   the exact `PathManager.getPluginsPath(), "bbj-intellij-data", "<subdir>"` shape verified at
   `BbjNodeDownloader.java:150` (`Path dataDir = Paths.get(PathManager.getPluginsPath(),
   "bbj-intellij-data", "nodejs");`), swapping only the leaf subdirectory name.
2. Invalidation key: **plugin version**, not a per-file content digest. Rationale: the five bundle
   files (`package.json`, two `*-language-configuration.json`, two `*.tmLanguage.json`) are packaged
   `src/main/resources/textmate/bbj-bundle/` resources baked into the plugin JAR — they change **only**
   when the JAR changes, i.e. on plugin upgrade. A single marker file (e.g.
   `bbj-intellij-data/textmate/.plugin-version`, containing the running plugin's version string
   obtained the same way `BbjLanguageServer.resolveServerPath()` already does —
   `PluginManager.getInstance().findEnabledPlugin(pluginId)`, verified `BbjLanguageServer.java:99-106`
   — reused for `getVersion()` instead of `getPluginPath()`) is cheaper than hashing 5 small files on
   every `getBundles()` call and matches the actual invalidation boundary exactly. The `.sha256`
   sidecar convention (`NodeInstallIntegrity`, verified in full,
   `NodeInstallPipeline`'s companion) is the right model for a *downloaded, mutable* artifact whose
   integrity must be re-checked against tampering or partial writes; it is not the right model for a
   *packaged, immutable* resource whose only threat is "the plugin was upgraded." Flag this choice
   explicitly to the planner/user as a recommendation, not a re-opening of a locked decision — CONTEXT.md
   left this specific sub-question to research.
3. **Write ordering is the correctness rule, not a lock.** Copy all five bundle files first; write the
   version marker **last**, only after all five copies succeed. A concurrent reader (a second
   `getBundles()` call, whether from the same JVM's `reloadEnabledBundles()` or — in the bounded
   cross-process case below — a second process) that sees the marker can trust every bundle file is
   complete; one that does not see the marker safely falls back to "no valid cache, copy again," which
   is idempotent (identical bytes from the same JAR resource, so a benign double-write is harmless).
4. **Skip the copy loop entirely when the marker already matches**, per the phase's own success
   criterion 1 — read the marker, compare to the current plugin version, and return the existing
   `PluginBundle` referencing the stable directory without touching the filesystem further when it
   matches.

### Concurrent-launch safety — verified findings and the residual ambiguity

**Verified, application-scoped, single JVM:** `TextMateBundleProvider`'s extension point is declared
with no `area` attribute (`<extensionPoint qualifiedName="com.intellij.textmate.bundleProvider"
interface="org.jetbrains.plugins.textmate.api.TextMateBundleProvider" />`, decompiled from the
pinned platform's `textmate.jar!/META-INF/plugin.xml` this session), which defaults to
application-level scope — one instance per running IDE process, not per project. Decompiling
`TextMateServiceImpl` (`ideaIC-2024.2/plugins/textmate/lib/textmate.jar`) confirms `getBundles()` is
invoked from `registerBundles(boolean)`, itself called from `ensureInitialized()` under a
double-checked `ReentrantLock` (`registrationLock`) and from the **public** `reloadEnabledBundles()`.
This means, within a single JVM: (a) calls are serialized by the lock — no intra-process race is
possible; (b) `getBundles()` can fire **more than once per launch** (any reload of TextMate bundle
settings re-triggers it), so the implementation must be safe to call repeatedly, not just once.

**Verified, config-scoped paths:** `PathManager.getTempPath()` and `getPluginsPath()` both resolve
through the IDE's own config/system path (`getTempDir()` → `getSystemDir().resolve("tmp")`;
`getPluginsDir()` derives from `idea.config.path` or a per-product default selector — confirmed by
fetching `platform/util/src/com/intellij/openapi/application/PathManager.java` from
`JetBrains/intellij-community` this session). Neither is the raw, machine-wide OS temp directory. This
means two **different** IDE product installations (different config paths) never contend for this
directory at all.

**Residual, unresolved ambiguity — surfaced per CONTEXT.md's explicit instruction, not assumed away:**
Two processes *can* still contend for the identical path in scenarios where IntelliJ's normal
single-instance-per-config-path lock does not apply or is not effective:
- A developer running `./gradlew runIde` from two separate terminals against the same checkout without
  a custom `sandboxDir` (verified: this project's `build.gradle.kts:224-226` sets no `sandboxDir`
  override, only `args`, so both invocations would use the Gradle IntelliJ plugin's default sandbox
  path for this module) — a real, concrete local-dev scenario, not theoretical.
- A config/plugins path mounted from a network filesystem where the platform's instance-lock file does
  not enforce exclusivity reliably (documented general NFS/lock caveat, not BBj-specific).
- Any CI or container setup that intentionally launches two IDE processes against a shared, persisted
  home directory (this project's own devcontainer conventions persist state across sessions per prior
  project memory).

None of these is ruled out by anything found this session. **Recommendation:** treat the write-order
rule above (bundle files first, marker last) as the actual safety mechanism — it makes every possible
race benign (idempotent double-copy, never a torn read) — rather than adding a file lock, which would
be new complexity for a risk that a strict write-ordering already neutralizes.

### Sweep of abandoned `textmate-bbj*` temp directories

**Verified via `grep`:** `"textmate-bbj"` appears in exactly one place in the entire repository —
`BbjTextMateBundleProvider.java:30` — so the prefix is unique to this plugin *within this codebase*.
`Files.createTempDirectory(dir, prefix)` (the current call site, verified
`BbjTextMateBundleProvider.java:29-30`) appends an implementation-defined random suffix with no
separator (e.g. `textmate-bbj4821771...`), so a sweep matching `name.startsWith("textmate-bbj")` under
`PathManager.getTempPath()` will not false-positive against anything else this plugin creates.

**Residual ambiguity, surfaced rather than assumed safe:** `PathManager.getTempPath()` is shared by
**every plugin** running under the same IDE installation, not scoped per-plugin (only per-IDE-config,
per the finding above). A sweep is safe only because no other plugin in this codebase's dependency set
is known to use this exact prefix — that is a fact about *this* codebase today, not a platform
guarantee for all time. Recommend the sweep run **only after** the new stable directory is confirmed
built (ordering, not locking, again) and log (do not throw on) any directory it cannot delete, mirroring
`NodeInstallPipeline.deleteRecursivelyQuietly`'s exact "best-effort cleanup: a failure here must never
mask [primary] work" pattern (verified, `NodeInstallPipeline.java:301-307`).

### Anti-Patterns to Avoid

- **Reintroducing a second Node-availability engine** (rejected explicitly by D-05): do not give
  `NodeAvailability` a "thin wrapper" role that still branches independently — retire it and its test
  file, per the discretion item's own framing, rather than keep it half-alive.
- **A sealed/second vocabulary for cache-unavailable** (rejected explicitly by D-07): the fix for
  "cache directory inaccessible" must stay inside the existing `Source`/`Reason`/`Rejected` triple —
  see the concrete mechanism below, not a new result type.
- **Extension-based file-type guards** (the exact bug D-09/D-11 fix): never add a new check of the
  shape `file.getExtension().equals(...)` anywhere in this phase's four providers — the resolved
  file-type check is the one and only pattern, and `BbjFileVisibility`'s own javadoc
  (`BbjFileVisibility.java:9-15`, verified) explains why in the code itself.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this a BBj program file" | A new extension or file-type check inside the notification base | `BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())`, widened public per D-11 | Already the resolved-file-type source of truth for the status-bar widgets and the interop poll gate; a second definition is the exact problem #622/D-11 exists to end |
| Node.js version parsing/comparison | A new semver parser | `BbjNodeDetector.meetsMinimumVersion(String)` (verified, `BbjNodeDetector.java:58-69`) | Already handles the `vX.Y.Z` format and the `>= 18` rule; reused, never reimplemented |
| Memoizing a subprocess spawn keyed on file identity | A new cache | `BbjNodeVersionCache.SESSION` (verified in full, `BbjNodeVersionCache.java`) | Already stat-keyed, already thread-safe via `ConcurrentHashMap.compute`, already the Phase 79 EDT-03 contract's home |
| Presenting a platform-free decision to a Swing panel | Inline string-building inside the `EditorNotificationProvider` | A `*Presentation` seam modelled on `InteropStatusPresentation`/`ConfigReloadPresentation` (both verified in full) | The established, three-times-repeated convention in this codebase for keeping platform code out of decision logic |
| Recursive directory delete for the sweep | A hand-rolled `Files.walk().forEach(Files::delete)` | `NodeInstallPipeline.deleteRecursively(Path)` (verified, `NodeInstallPipeline.java:314-331`) — but note it is currently **package-private in `lsp`**, so either widen it to public or write the sweep's own copy | The existing method already gets the symlink-safety detail right (no `FOLLOW_LINKS`, verified and pinned by `NodeInstallPipelineSourceGuardTest.java:192-199`); a second hand-rolled walker risks getting that detail wrong |

**Key insight:** every piece of this phase's actual decision logic already has a `com.intellij`-free,
plain-JUnit-tested home in this codebase (`NodeExecutableResolver`, `NodeAvailability`,
`BbjFileVisibility`, `*Presentation` classes, `BbjNodeVersionCache`). The work in this phase is almost
entirely "route an existing decision through the existing seam" and "extend an existing seam by one
step" — not "design a new decision."

## Common Pitfalls

### Pitfall 1: Treating "no CACHED rejection recorded" as informative

**What goes wrong:** `NodeExecutableResolver.validate()` returns `null` **without recording anything**
when a candidate is blank/null (verified, `NodeExecutableResolver.java:183-185`:
`if (candidate == null || candidate.isBlank()) { return null; }`). Today, `BbjNodeDownloader
.getCachedNodePath()` returns `null` for **both** "nothing downloaded yet" and "the cache directory
itself is inaccessible" (verified, `BbjNodeDownloader.java:49-56` — the `IOException` from
`getNodeDataDirectory()`'s `Files.createDirectories` at `BbjNodeDownloader.java:151` is caught and
silently turned into the same `null`). Both collapse to the CACHED source producing **zero** rejection
entries — the caller cannot tell them apart from `resolution.rejections()` alone.

**Why it happens:** the null-skip design intentionally treats "absent candidate" as unremarkable, which
is correct for "not configured" but wrong for "we tried and failed to even check."

**How to avoid:** D-07's fix must happen at the call site that already knows the difference — inside
`BbjNodeDownloader` or wherever it is invoked before `resolve()` runs — not inside `validate()`'s
generic null-skip. Recommended shape: give `resolve()` a way to receive an *already-known* CACHED
rejection instead of a bare candidate string, e.g. a new parameter or overload that, when the caller
signals "cache directory inaccessible," has `resolve()` push
`new Rejected(Source.CACHED, Reason.CACHE_UNAVAILABLE, <the data directory path or an empty string>)`
directly into `rejections` instead of silently skipping. This keeps the *existing* `Source`/`Reason`
vocabulary (only one new `Reason` constant is added) and both existing call sites
(`BbjLanguageServer`'s `getCachedNodePath()` and the banner) can be updated to detect the same
IOException/no-IOException distinction they need without introducing a second result type — exactly
what D-07 rejected avoiding.

**Warning signs:** any UAT check that types the failure into "download fails a second time at the same
step" (#588's own named failure scenario) is testing this exact seam — if the cache-inaccessible
banner still offers "Download Node.js," this pitfall was not actually fixed.

### Pitfall 2: Breaking `NodeExecutableResolverTest` by changing `resolve()`'s signature in place

**What goes wrong:** Adding the version-check parameters directly to the existing
`resolve(String, String, String, PathProbe)` signature breaks all ~24 existing call sites in
`NodeExecutableResolverTest.java` (verified, read in full — every test method calls this exact
4-parameter form).

**Why it happens:** the natural first instinct for "add a sixth validation step" is to add parameters
to the one method that runs all six steps.

**How to avoid:** see Pattern 2 above — add a new overload, keep the old one as a documented
"no version gating" delegator.

**Warning signs:** if a plan task description says "update `NodeExecutableResolverTest`'s call sites,"
that is a signal the wrong mechanism was chosen — the canonical-refs constraint is that this file
"must keep passing," which the community reading of that phrase is "with no edits," not "after being
updated."

### Pitfall 3: Assuming `getBundles()` runs once per IDE launch

**What goes wrong:** designing the cache logic (or its test) around "this method is called exactly
once, at startup."

**Why it happens:** the phase description's own wording ("reuses the cached directory across IDE
launches") reads that way at a glance.

**How to avoid:** per the verified decompilation above, `getBundles()` can be invoked again mid-session
via `reloadEnabledBundles()`. The implementation must be idempotent under repeat calls within one
process, not just safe across separate launches — the version-marker check naturally provides this
(second call sees the marker already matches, does nothing) as long as the check-then-skip logic runs
on **every** call, not behind a one-shot static flag.

### Pitfall 4: The Windows zip-extraction loose match (WR-04) picking the wrong entry

**What goes wrong:** `extractZip`'s `entry.getName().endsWith("node.exe")` (verified,
`NodeInstallPipeline.java:225`) matches *any* archive entry whose name ends in that literal, not only
the real Node.js binary at its expected path.

**Why it happens:** written as a defensive "we only want node.exe from the archive" shortcut without
anchoring to the archive's known internal layout.

**How to avoid:** the committed fixture (`src/test/resources/node-fixtures/fake-node-win.zip`, verified
by listing its contents this session) lays its entries out exactly as the official Node.js Windows
distribution does: a single top-level folder named identically to `archiveFileName()` minus its
extension (`node-v20.18.1-win-x64/`), containing `node.exe` directly inside it (alongside, in the
fixture, a decoy `CHANGELOG.md`). The fix is an **exact** relative-path match:
`"node-" + NODE_VERSION + "-" + target.platformName() + "-" + target.archName() + "/node.exe"`,
reusing the exact same three literals `archiveFileName()` already assembles
(verified, `NodeInstallPipeline.java:141-144`).

**Warning signs:** `NodeInstallPipelineTest`'s Windows-branch coverage (verified present,
`NodeInstallPipelineTest.java:33-50`) is the regression fixture to extend with an entry that ends in
`"node.exe"` at the **wrong** path (e.g. `other/decoy-node.exe`) — if that new case isn't added, WR-04's
fix is unverified by anything in the suite.

### Pitfall 5: Outer `finally` cleanup masking the pipeline's real exception (WR-02)

**What goes wrong:** `install()`'s outer `finally { Files.deleteIfExists(tempFile); }` (verified,
`NodeInstallPipeline.java:207-209`) runs **unguarded** — if it throws, that exception replaces whatever
the try block was already about to throw (a fetch failure, a verification failure), so `idea.log` (the
artifact PLAT-06's attestation step 4 depends on) would report the wrong root cause.

**Why it happens:** the sibling inner cleanup (`deleteRecursivelyQuietly(tempExtractDir)`, verified
`NodeInstallPipeline.java:204-206,301-307`) already gets this right with a swallow-and-log pattern; the
outer one was written before that pattern existed or was simply missed.

**How to avoid:** wrap the outer `Files.deleteIfExists(tempFile)` the same way — a single-file sibling
of `deleteRecursivelyQuietly` that swallows `IOException` and never lets a cleanup failure surface as
the method's result.

**Warning signs:** any Windows-attestation failure (D-13/D-15's `idea.log` capture) whose logged
exception message is about file deletion rather than download/verification is this bug manifesting live
— exactly the scenario D-14 folds this fix to prevent.

## Code Examples

### The version-check step's expected shape inside `validate()`

```java
// Sketch of the sixth step — added after the existing isExecutable check, inside the NEW
// 6-parameter overload's private validate() (or a private validate() taking the two extra
// collaborators; the 5-parameter validate() used by the legacy 4-arg resolve() overload can
// delegate to it with the same no-op version collaborators shown in Pattern 2 above).
if (!probe.isExecutable(candidate)) {
    rejections.add(new Rejected(source, Reason.NOT_EXECUTABLE, candidate));
    return null;
}
String version = versionOf.apply(candidate);
if (!meetsMinimum.test(version)) {
    rejections.add(new Rejected(source, Reason.BELOW_MINIMUM_VERSION, candidate));
    return null;
}
return candidate;
```
This preserves every existing rejection-ordering test in `NodeExecutableResolverTest` (they never reach
this new step, since they use the no-op-version legacy overload) while giving the new overload the
exact per-candidate ordering (`SETTINGS` → `DETECTED` → `CACHED`, each through the full six-step core)
that D-06 asks for.

### IN-02's one-line reuse (verified fold-candidate)

```java
// Before (NodeInstallPipeline.java:280-282, verified) — re-derives the literals nodeExecutableName()
// already owns:
Path extractedNode = target.os() == Os.WINDOWS
        ? tempExtractDir.resolve("node.exe")
        : tempExtractDir.resolve("bin").resolve("node");

// After — reuses Target.nodeExecutableName() (verified, NodeInstallPipeline.java:72-75),
// which already returns "node.exe" or "node" for exactly these two branches:
Path extractedNode = target.os() == Os.WINDOWS
        ? tempExtractDir.resolve(target.nodeExecutableName())
        : tempExtractDir.resolve("bin").resolve(target.nodeExecutableName());
```
Genuinely a one-line reuse per branch, confirming CONTEXT.md's own "lean yes if it stays a one-line
reuse" framing for folding IN-02 alongside WR-04.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Two independent Node-availability engines (`NodeAvailability` for the banner, `NodeExecutableResolver` for startup) | One engine (`NodeExecutableResolver`), banner and startup both call it | This phase (D-05) | The banner and the language server can no longer disagree about whether a given Node.js is usable |
| Extension-based file-type guard in one of four notification providers | Resolved-file-type guard (`BbjFileVisibility`) in all four | This phase (D-09/D-11) | Crash banner starts firing on `.bbx` and stops firing on `.bbl`, matching the other three providers and the status-bar widgets already fixed in Phase 92/95 |
| `Files.createTempDirectory` + full 5-file copy on every `getBundles()` call | Stable `bbj-intellij-data/textmate` directory, skip-copy on a version-marker hit | This phase (PLAT-01) | No more per-launch temp-directory allocation or disk churn; old temp dirs get swept |

**Deprecated/outdated:**
- `BbjColorSettingsPage` and its `plugin.xml:236` registration: removed outright (D-01), not migrated —
  TextMate already owns highlighting and the page never actually controlled it.
- `NodeAvailability` (recommended, Claude's Discretion per CONTEXT.md): retire outright rather than
  keep as a wrapper, per the "one engine" rationale D-05 already gives.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `TextMateServiceImpl.ensureInitialized()`/`registerBundles()` runs on a background thread rather than the EDT (not directly decompiled this session — only the lock and call graph were confirmed, not the calling thread of `ensureInitialized()` itself) | Concurrent-launch safety / PLAT-01 | If it turns out `getBundles()` can run on the EDT, a version-marker file read/write should be confirmed cheap (it is — one small file stat+read) rather than deferred to a background thread; low risk either way since the operation is already fast |
| A2 | No other plugin bundled with, or commonly installed alongside, this plugin uses the exact `textmate-bbj` temp-directory prefix, beyond what a repo-wide `grep` of *this* codebase can confirm | Sweep of abandoned temp directories / PLAT-01 | If wrong, the sweep could delete an unrelated directory that happens to share the prefix; mitigated by the prefix's specificity and by only sweeping under the IDE's own config-scoped temp path, never the raw OS temp dir |
| A3 | The recommended `NodePresentation` seam lives in `com.basis.bbj.intellij.lsp` alongside `NodeExecutableResolver` and takes the real `Source`/`Reason` enum types directly, rather than stringified names the way `InteropStatusPresentation` does | Architecture Patterns / D-08 | Low risk — this is explicitly Claude's Discretion per CONTEXT.md; naming/package choice does not affect correctness |
| A4 | Recommending plugin-version (not per-file digest) as PLAT-01's invalidation key | Pattern 3 | If a future change makes the bundle resources mutable independent of plugin version (unlikely, they are packaged resources), the marker would need to become content-based; explicitly flagged as a recommendation for the planner/user to confirm, not a verified fact |

## Open Questions

1. **Exact package/location for the new notification base and the four providers.**
   - What we know: `plugin.xml` needs no change regardless of package choice (verified — registration
     is per-FQN); three of the four providers are currently in the default package, one in `ui`.
   - What's unclear: whether the planner wants to move all four into `ui` alongside the new base in
     this phase, or leave the default-package three where they are and put only the new base in `ui`.
   - Recommendation: pick one package for the base and require every subclass to move there in the
     same plan — leaving a split (three in default package, one in `ui`) recreates exactly the kind of
     inconsistency #622/D-09 exists to remove.

2. **Whether `NodeExecutableResolver.deleteRecursively`/a new sweep helper needs its own home.**
   - What we know: `NodeInstallPipeline.deleteRecursively(Path)` (verified) is package-private in
     `lsp`, and PLAT-01's sweep needs the same symlink-safe recursive delete but lives conceptually
     closer to `BbjTextMateBundleProvider` (default package, not `lsp`).
   - What's unclear: whether to widen `NodeInstallPipeline.deleteRecursively` to public and reuse it
     across packages, or let the sweep write its own (smaller, since it only ever deletes directories
     it created) copy.
   - Recommendation: widen and reuse — a second hand-rolled recursive walker is exactly the kind of
     "don't hand-roll" this phase's own Node pipeline work argues against.

3. **Whether `BbjSettingsLookups`'s Node field validator also routes through the unified resolver.**
   - This is explicitly Claude's Discretion in CONTEXT.md; not re-opened here. Noted only that
     `BbjSettingsLookups.lookupNode` (verified in full, `BbjSettingsLookups.java:45-73`) already
     resolves version through `BbjNodeVersionCache.SESSION::getVersion` and
     `BbjNodeDetector::meetsMinimumVersion` directly — the same two collaborators the resolver's new
     sixth step would use — so routing it through `NodeExecutableResolver` instead would be a
     same-behavior refactor, not a behavior change, if the planner chooses to do it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| IntelliJ Platform SDK (`ideaIC`) | Every file this phase touches | ✓ (in Gradle cache) | 2024.2 (pinned family; project also caches 2024.2.6/2024.3.7.1/2025.x for compat testing) | — |
| LSP4IJ | `BbjLanguageServer`/`BbjLanguageServerFactory` | ✓ | 0.21.0 (pinned, `build.gradle.kts:34`) | — |
| Real Windows machine | PLAT-06's attestation | ✗ (this session is Linux) | — | None — PLAT-06 is a human attestation by construction; no Linux-hosted run can close it (see Validation Architecture) |
| `node`/`tar` on PATH | `NodeInstallPipeline`'s Unix branch tests | not probed this session (existing test suite already covers it; out of scope for a research-only session) | — | — |

**Missing dependencies with no fallback:**
- A real Windows machine for PLAT-06. Per D-13/D-15, its absence does not block the rest of the phase;
  the attestation happens at phase end and is recorded either way.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5 (Jupiter), via Gradle `test` task |
| Config file | `bbj-intellij/build.gradle.kts` (JUnit Platform config inline; no separate `junit-platform.properties` found) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.lsp.NodeExecutableResolverTest"` (single-class, fast) |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` (per Phase 94's own noted convention to avoid an UP-TO-DATE no-op masking a stale green) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAT-01 | Stable directory reused; skip-copy on hit; abandoned dirs swept | unit (plain JUnit, `@TempDir`-based, mirroring `NodeInstallPipelineTest`'s style) | new test class, e.g. `BbjTextMateBundleProviderTest` | ❌ Wave 0 — none exists today (verified: "no existing test or source guard on `BbjTextMateBundleProvider`" per CONTEXT.md, confirmed by absence in this session's file listing) |
| PLAT-02 | Settings page absent | manual-only (hand UAT per D-03; optionally a `plugin.xml`-literal guard, explicitly optional per D-03) | none required; optional guard `assertEquals(0, countOccurrences(pluginXml, "colorSettingsPage"))` | ❌ Wave 0 if the optional guard is chosen |
| PLAT-03 | Base owns shared shape; all four banners appear/disappear as intended (including the two intended changes) | unit (source guards, whole-file literal pins) + manual UAT for visual appearance | rewrite/extend the existing four provider-adjacent guard files | Partial — `BbjServerServiceRestartSourceGuardTest`, `Lsp4ijImportAllowlistTest` exist and need review, not creation |
| PLAT-04 | "Not yet downloaded" vs "cache inaccessible" distinguishable | unit | new/extended `NodeExecutableResolverTest` cases for the new `Reason` | ❌ Wave 0 — the distinguishing test case does not exist yet |
| PLAT-05 | Configured-but-unusable path falls through to cached download | unit | extend `NodeExecutableResolverTest` with a version-based fall-through case (mirrors the existing missing-path fall-through case at `NodeExecutableResolverTest.java:342-362`) | Partial — the pattern exists, the version-specific case does not |
| PLAT-06 | Windows auto-install works end-to-end | **manual-only** — no Linux-hosted run can close this | none (by construction) | N/A |

### Sampling Rate
- **Per task commit:** the quick single-class command above, scoped to whichever class the task
  touched.
- **Per wave merge:** the full suite command with `--rerun-tasks`.
- **Phase gate:** full suite green (this project's standing gate is project-wide `numFailedTests: 0`
  plus deterministic targeted-file runs, per STATE.md's Phase 83/94 decision — not a failing-suite
  identity delta) before `/gsd-verify-work`, plus the hand UAT for PLAT-02/PLAT-03's visual criteria and
  the PLAT-06 attestation recorded in `WINDOWS.md` if it fails.

### Wave 0 Gaps
- [ ] A new test class for `BbjTextMateBundleProvider` (e.g. `BbjTextMateBundleProviderTest`) —
      covers PLAT-01. Since `BbjTextMateBundleProvider` currently has `com.intellij` imports
      (`PathManager`, `TextMateBundleProvider`'s own interface), a plain-JUnit test needs either (a) an
      extracted plain-Java decision core (mirroring the rest of this codebase's convention — e.g. a
      `TextMateBundleCache` seam taking injectable `Path` roots and a version string, tested with
      `@TempDir`, with the platform class becoming a thin wrapper), or (b) acceptance that this file
      stays untested by plain JUnit and is covered only by hand UAT + a source guard. Recommend (a),
      consistent with every other seam in this codebase (`NodeExecutableResolver`, `NodeAvailability`,
      `BbjFileVisibility` are all `com.intellij`-free for exactly this reason).
- [ ] A new/extended `NodeExecutableResolverTest` nested class for the version-check overload and the
      new `Reason` constants — covers PLAT-04/PLAT-05.
- [ ] Framework install: none — JUnit 5 is already wired.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `NodeExecutableResolver.validate()`'s existing five-step core already treats every filesystem candidate as untrusted input (parses, checks absolute, exists, regular file, executable) before use; the new sixth step follows the same discipline |
| V10 Malicious Code / Software Supply Chain (archive extraction) | yes | `NodeArchiveVerifier` (verified via `NodeInstallPipeline`'s use of it) pins a SHA-256 digest per archive **before** extraction; WR-04's loose entry match is a robustness bug in an already-integrity-checked artifact, not an untrusted-input vulnerability, because the archive's bytes are verified against a pinned digest before `extractZip`/`extractTarGz` ever runs (verified ordering, `NodeInstallPipelineSourceGuardTest.java:80-88`: "verification must precede the extraction call") |
| V12 File and Resources | yes | The temp-directory sweep (PLAT-01) is new filesystem-deletion logic on a user's machine; scope it strictly to the plugin's own prefix under the plugin's own config-scoped temp path (see Concurrent-launch safety section) |
| V6 Cryptography | no (unchanged) | This phase does not touch `NodeInstallIntegrity`'s SHA-256 digest logic; it is reused as a *model*, not modified |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Zip-slip / loose entry matching during archive extraction | Tampering | Already mitigated at the archive level by the pinned-digest pre-check (`NodeArchiveVerifier.verify` before any extraction); WR-04's fix (exact relative-path match) closes the remaining "wrong file, still inside a verified archive" looseness, not a path-traversal vector |
| Deletion of the wrong directory during a filesystem sweep | Tampering / Denial of Service (on the user's own disk) | Scope by an application-unique prefix under a config-scoped (not machine-wide) directory; log-and-continue on any delete failure rather than throwing |
| A downed/misdiagnosed Node.js runtime silently starting the language server anyway | Tampering (of trust: user believes a gate exists that doesn't) | D-06's sixth validation step closes exactly this — a too-old configured Node no longer silently starts the server |

## Sources

### Primary (HIGH confidence — read/decompiled this session)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDetector.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java` (full file)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingHomeNotificationProvider.java`,
  `BbjMissingNodeNotificationProvider.java`, `BbjJavaInteropNotificationProvider.java`,
  `ui/BbjServerCrashNotificationProvider.java` (all full files)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java`,
  `ui/BbjStatusBarWidgetBase.java` (full files)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropStatusPresentation.java`,
  `config/ConfigReloadPresentation.java` (full files)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java`,
  `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallIntegrity.java` (full files)
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (lines 165-266 read directly)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java`,
  `NodeAvailabilityTest.java`, `NodeExecutableResolverTest.java`, `NodeInstallPipelineTest.java`
  (partial), `NodeInstallPipelineSourceGuardTest.java`, `BbjServerServiceRestartSourceGuardTest.java`
  (all read this session)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java`
  (lines 110-160)
- `bbj-intellij/src/test/resources/node-fixtures/fake-node-win.zip`,
  `fake-node-unix.tar.gz` — contents listed via `unzip -l`/`tar -tzf` this session
- `documentation/docs/intellij/features.md:30-43` (Customization section D-02 rewrites)
- `ideaIC-2024.2/plugins/textmate/lib/textmate.jar!/org/jetbrains/plugins/textmate/api/
  TextMateBundleProvider.class`, `TextMateServiceImpl.class`, `TextMateServiceImplKtKt.class`,
  `META-INF/plugin.xml` — decompiled with `javap -p -c` this session (interface shape, EP
  declaration, `ensureInitialized()`/`registerBundles()` call graph and lock usage)
- `ideaIC-2024.2/lib/app-client.jar!/com/intellij/ui/EditorNotificationPanel.class` — decompiled with
  `javap -p -c` this session (all constructor overloads; the `(Status)` constructor passes a `null`
  `Editor` to the shared internal constructor, the `(FileEditor, Status)` overload extracts the real
  `Editor` when the `FileEditor` is a `TextEditor`)
- `com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/lsp4ij-0.21.0.jar!/com/redhat/devtools/lsp4ij/
  LanguageServerWrapper.class` — decompiled with `javap -p -c` this session (`start()` dispatches
  `createConnectionProvider` via `Application.executeOnPooledThread`, verified off the EDT)
- `.planning/phases/96-platform-integration-node-js-diagnosis/96-CONTEXT.md` (full file, all 15
  decisions and canonical references)
- `.planning/REQUIREMENTS.md:43-50`, `.planning/STATE.md` (full files)
- `.planning/WINDOWS.md`, `.planning/config.json` (full files)

### Secondary (MEDIUM confidence — official docs, fetched this session)
- [`PathManager.java` on `JetBrains/intellij-community`](https://github.com/JetBrains/intellij-community/blob/master/platform/util/src/com/intellij/openapi/application/PathManager.java) —
  confirms `getTempPath()`/`getPluginsPath()` are config/system-path-scoped, not the raw OS temp
  directory; both methods are marked `@ApiStatus.Obsolete` in current platform sources although this
  codebase still calls them (no functional difference — the obsolete wrappers delegate to the
  current `Path`-returning methods)
- JetBrains support article confirming `idea.system.path` governs the temp location, surfaced via
  WebSearch this session

### Tertiary (LOW confidence)
- None — every claim in this document is tagged with its provenance above; there is no
  unverified-and-uncited claim left untagged.

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no new dependencies
- Architecture (base+thin-subclass, resolver overload strategy): HIGH — grounded in three existing
  in-repo precedents (Phase 93, Phase 95) plus this session's own reading of every file involved
- Concurrent-launch safety (PLAT-01): MEDIUM — the application-scope and config-path-scoping facts are
  verified/CITED; the residual cross-process ambiguity is explicitly surfaced, not resolved, per
  CONTEXT.md's own instruction to flag rather than assume
- Pitfalls (WR-02/WR-04/IN-02 mechanics): HIGH — every fix recommendation is grounded in a verified
  line-level read of the current source plus the actual committed test fixtures
- EDT/threading (BbjLanguageServer constructor): HIGH — verified by decompiling the exact pinned
  LSP4IJ jar version, not inferred

**Research date:** 2026-09-19
**Valid until:** 30 days (stable platform APIs; no fast-moving dependency in scope) — but re-verify
against the specific `NodeExecutableResolverTest`/`NodeAvailabilityTest`/`BbjServerServiceRestartSourceGuardTest`
line numbers quoted here if any other phase touches those files before Phase 96 executes, since this
research pins several assertions by exact line range.
