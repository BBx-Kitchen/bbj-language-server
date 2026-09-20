# Phase 96: Platform Integration & Node.js Diagnosis - Context

**Gathered:** 2026-09-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The plugin's platform-integration surfaces stop wasting resources and stop misleading — a reused
TextMate bundle directory, no inert Color Settings page, one notification-provider base — and a
developer without a usable Node.js is shown the real diagnosis, with the auto-install path finally
attested on real Windows.

Covers PLAT-01 (#613), PLAT-02 (#621), PLAT-03 (#622), PLAT-04 (#588), PLAT-05 (todo
`2026-09-06-configured-node-path-suppresses-cached-download-fallback`), PLAT-06 (todo
`2026-09-06-live-windows-check-for-node-auto-install-failure`).

**Five corrections to the ROADMAP and issue text that planning MUST carry:**

1. **ROADMAP's "file-disjoint from Phases 93-95" claim is FALSE.** Phase 95's D-05 edited
   `BbjJavaInteropNotificationProvider` — one of PLAT-03's three providers. It now reads
   `InteropStatusPresentation.bannerText(status)` instead of a fixed string, so PLAT-03's base must
   absorb a provider whose banner text varies. Phase 95's own CONTEXT flagged this for confirmation
   here; it is hereby confirmed.

2. **Four editor notification providers are registered, not three** (`plugin.xml:254-265`). #622
   names three. The fourth, `BbjServerCrashNotificationProvider`, guards by **extension**
   (`bbj|bbl|bbjt|src` at `:29-33`) while the BBj file type is registered for `bbj;bbjt;src;bbx`
   (`plugin.xml:175`). It therefore **fires on `.bbl`** (which carries no BBj file type — excluded
   in v3.4) and **misses genuine `.bbx` programs**. `BbjFileVisibility`'s own javadoc (`:9-15`)
   already documents exactly why extension checks are wrong here. D-09 fixes this.

3. **PLAT-05's premise is narrower than written.** `NodeExecutableResolver.resolve` already tries
   configured → detected → cached **and explicitly falls through a rejected candidate**
   (`:150-167`), and `BbjLanguageServer:59` uses it. The language server therefore **already starts**
   off the cached download when a configured path is broken. Only the editor banner
   (`NodeAvailability.decide`) stops at the configured path. This is not an open question about
   whether a fallback is desirable — it is two decision seams that already disagree, with the banner
   being the one that lies.

4. **A second, previously unrecorded disagreement between those seams.** `NodeExecutableResolver`
   validates parses/absolute/exists/regular-file/executable but **never checks the minimum version**;
   the banner does. `meetsMinimumVersion` has exactly two callers —
   `BbjMissingNodeNotificationProvider:41` and `BbjSettingsLookups:49` — and neither is the startup
   path. **A too-old configured Node.js starts the language server today.** D-06 closes this.

5. **#621's "wire it up" branch is not actually reachable.** IntelliJ's TextMate engine resolves
   scopes through its own theme mapping; there is no supported extension point for a third-party
   plugin to remap TextMate scopes onto its own `TextAttributesKey`s. The semantic-token route the
   class doc points at (`:20-23`) is further along than that comment suggests — the language server
   already registers `BBjSemanticTokenProvider` (`bbj-module.ts:104`) — but it emits only
   `parameter`, `variable` and `keyword`, so it would light up at most 3 of the 9 descriptors and
   would contest TextMate for the same ranges. D-01 takes ROADMAP criterion 2's second branch.

</domain>

<decisions>
## Implementation Decisions

### Color Scheme page (PLAT-02, #621)

- **D-01:** **The Color Settings page is deleted** — `BbjColorSettingsPage.java` and its
  `plugin.xml:236` `<colorSettingsPage>` registration both go. This is ROADMAP criterion 2's second
  branch ("the page is gone from Settings entirely, so it cannot mislead"). Verified clean: nothing
  outside the file references the nine `TextAttributesKey` constants (the lone `BBJ_STRING` hit
  elsewhere is an unrelated `IElementType` in `BbjTokenTypes`), no bundled theme or scheme in
  `src/main/resources` references them, and the only other highlighter registrations are TextMate's
  own plus the live `BbxConfigSyntaxHighlighterFactory`. `BbjTokenTypes` itself is **live** — used by
  `BbjWordLexer`, `BbjParserDefinition` and `BbjPairedBraceMatcher` (v4.2 PARITY-02) — and must not
  be touched. Users who already customized the nine keys have values persisted in their IDE
  color-scheme XML; IntelliJ ignores unknown keys, so those entries become inert, not broken, and no
  migration is needed.

- **D-02:** **`documentation/docs/intellij/features.md:39-41`'s "Customization" section is
  rewritten**, not deleted — it currently tells users "Customize colors via Settings > Editor >
  Color Scheme > BBj", which D-01 makes false. The replacement states that highlighting is
  TextMate-driven and follows the active IDE theme. This is a **deliberate, accepted departure** from
  STATE.md's active constraint that v4.4 is IntelliJ-only: shipping 0.16.0 with published docs
  pointing at a removed Settings page would relocate the very "misleading" failure PLAT-02 exists to
  remove.

- **D-03:** **Verification is hand UAT only — no absence guard.** Confirm at UAT that Settings ›
  Editor › Color Scheme has no BBj node. A guard asserting `plugin.xml` contains no
  `colorSettingsPage` would be idiomatic here (16 test files already pin `plugin.xml` by literal, and
  `assertEquals(0, countOccurrences(...))` is routine), but it would also permanently forbid
  re-adding a page — which the deferred semantic-token route would eventually want to do.

- **D-04:** **Close #621 as done on cited reasoning**, recording that deletion supersedes both
  branches its acceptance criteria name, and that those criteria were written too narrowly. Follows
  the Phase 93 D-06 / Phase 94 D-05 / Phase 95 D-11 precedent.

### Node diagnosis & fallback (PLAT-04 #588, PLAT-05)

- **D-05:** **One decision engine.** The editor banner stops calling `NodeAvailability.decide` and
  routes through `NodeExecutableResolver.resolve`, inheriting both the configured → detected →
  cached fallback and the per-candidate `Source` × `Reason` vocabulary the resolver already records
  and renders. **PLAT-05's required product decision is therefore "yes, an unusable configured path
  consults the cached download"** — reached by unifying the two seams rather than by patching
  `NodeAvailability` in isolation. Rejected: adding the fallback to `NodeAvailability` (leaves two
  engines that can drift again, and leaves correction 4 unfixed) and keeping today's behaviour with
  better wording (contradicts REQUIREMENTS.md's PLAT-05 wording, and leaves the banner contradicting
  a server that starts fine anyway).
  — **Reversibility:** costly — undo touches the banner provider, the resolver, the retired seam and
  every guard pinning them.

- **D-06:** **The minimum-version check becomes a sixth validation step inside the resolver**, after
  "is executable", with the version resolved through `BbjNodeVersionCache` so it stays one
  stat-keyed spawn per unchanged path (the Phase 79 EDT-03 contract). This makes all three
  surfaces — banner, startup, Settings field — agree.
  **INTENDED OBSERVABLE CHANGE, declare at UAT:** a too-old configured Node is now rejected at
  startup and falls through to detected/cached, where today it silently launches the server on an
  unsupported Node.
  — **Reversibility:** costly — undo means re-splitting the version check back out of the resolver
  and restoring the startup path's acceptance of an unsupported runtime.

- **D-07:** **"Cache directory inaccessible" becomes a new `Reason` constant on the `CACHED`
  source** (e.g. `CACHE_UNAVAILABLE`), so an unwritable `bbj-intellij-data/nodejs` surfaces as a
  `Rejected(CACHED, CACHE_UNAVAILABLE, …)` in `rejections()` and in `failureMessage()`. This fits the
  vocabulary already present, and ROADMAP criterion 4's "distinguishable to every caller" holds
  structurally rather than by convention. Rejected: #588's sealed-result-type suggestion (a second
  vocabulary alongside `Source`/`Reason`, and both call sites change signature) and its
  log-the-exception branch (a log line does not make the states distinguishable to callers, and the
  banner would still show the same wrong diagnosis). The `IOException` in question originates in
  `BbjNodeDownloader.getNodeDataDirectory():151`'s `Files.createDirectories`, not in
  `NodeInstallPipeline.cachedNodePath()`, which is documented never to throw.

- **D-08:** **The banner's text *and* its action set both vary by reason**, through a platform-free
  `NodePresentation` seam modelled on `InteropStatusPresentation` (plain statics, plain arguments, no
  `com.intellij` import, `null` meaning "no banner"). The seam returns the sentence plus which
  actions to offer; the provider maps action ids to `createActionLabel` calls so the seam stays
  platform-free. Concretely, the cache-inaccessible case **drops "Download Node.js"** — which closes
  #588's own stated failure scenario, *"a user retries a download that is doomed to fail at the same
  directory-creation step"*. Varying only the text would leave that doomed link in place.

### Notification base (PLAT-03, #622)

- **D-09:** **The base covers all four registered providers, not the three #622 names**, and
  `BbjServerCrashNotificationProvider`'s extension check is replaced by the resolved-file-type guard.
  This **overrides ROADMAP criterion 3's** "each banner still appears and disappears in exactly the
  conditions it did before" with recorded reasoning, exactly as Phase 95's D-01 overrode #587's own
  acceptance criteria. Leaving it out would ship the `.bbl`/`.bbx` bug into 0.16.0 and keep two
  contradictory file-guard conventions in the tree, with the wrong one sitting in the file a future
  reader is most likely to copy.
  **INTENDED OBSERVABLE CHANGES, declare at UAT:** the crash banner now appears on `.bbx` programs,
  and no longer appears on `.bbl` files.
  — **Reversibility:** costly — undo touches four providers, the base and the re-pointed guards.

- **D-10:** **All three of the crash provider's divergences are normalized.** Every provider becomes
  `DumbAware`; every provider constructs its panel with the `fileEditor` argument (the crash provider
  alone uses the bare `new EditorNotificationPanel(Status.Error)` today); and `Status` stays a
  per-subclass hook, so the crash banner keeps `Error` while the other three keep `Warning`.
  **INTENDED OBSERVABLE CHANGE, declare at UAT:** the crash banner now appears during indexing —
  safe, because `isServerCrashed()` is a plain field read. Rejected: a base holding only what is
  byte-identical, which would leave the base nearly empty and defeat the consolidation #622 asked
  for.

- **D-11:** **`BbjFileVisibility.isBbjProgramFileTypeName` is widened to public**, and the base calls
  it with `file.getFileType().getName()` — one shared definition of "is this a BBj program file" for
  widgets and banners alike. Follows Phase 95, which widened the sibling `showsForFileTypeNames` for
  a cross-package caller while keeping `showsForSelection` package-private.
  **Verified safe:** `BbjStatusBarWidgetSourceGuardTest:146` pins exactly one `getFileType()` read
  *inside `BbjFileVisibility.java` itself*, and the base's read lives in the base's own file, so that
  pin is untouched. Rejected: `file.getFileType() != BbjFileType.INSTANCE` (correct, and what three
  of four providers already do, but it leaves "is this a BBj program file" with two definitions in
  the tree — #622's own complaint one level up) and relocating all four providers into `ui` (four
  `plugin.xml` FQN changes and four file moves, turning a behaviour-preserving consolidation into a
  rename diff that hides the real change in review).

- **D-12:** **Close #622 as done on cited reasoning** — four providers consolidated where the issue
  named three — consistent with D-04 and the same Phase 93/94/95 precedent.

### Windows attestation & Node pipeline (PLAT-06)

- **D-13:** **The maintainer attests PLAT-06 by hand at phase end, against the phase-final build** —
  after PLAT-02/03/04/05 have all landed and after any code-review fixes, per the ROADMAP ordering
  note, so the build under test is the one that ships. Both distributables are built and installed
  from the final tree first (project convention: build both extensions before UAT, and again from the
  final tree after code-review fixes). The procedure is the todo's four steps: open a BBj file with
  no Node.js configured, use the banner's "Download Node.js" action, confirm a working `node.exe`
  beside its `.sha256` sidecar in `bbj-intellij-data/nodejs` and that the language server starts, and
  capture `idea.log` plus the directory contents if it fails.

- **D-14:** **Exactly two of the open 83-REVIEW findings are folded: WR-02 and WR-04** — the two that
  change what the Windows attestation produces. All five findings were **re-verified against current
  code on 2026-09-19 and are still open**; they are not stale review text.
  - **WR-02** (`NodeInstallPipeline:207-209`): the outer `finally` calls `Files.deleteIfExists`
    unguarded while the inner cleanup deliberately swallows via `deleteRecursivelyQuietly`. A cleanup
    failure therefore replaces the pipeline's real exception — and the attestation's step 4 depends on
    `idea.log` telling the truth about why it failed.
  - **WR-04** (`NodeInstallPipeline:225`): `entry.getName().endsWith("node.exe")` is a loose suffix
    match on the **`.zip` branch — the Windows-only code path being attested**.
  WR-01, WR-03, WR-05, IN-01 and IN-02 are explicitly **not** folded; see `<deferred>`.

- **D-15:** **The attestation's outcome is recorded either way; it does not block phase completion.**
  A failure is written up as a `WINDOWS.md` entry with `idea.log` and the
  `bbj-intellij-data/nodejs` directory contents attached, and becomes its own debug session or phase
  rather than holding Phase 96 open. Noted for planning: `workflow.windows_enforce` is **not set** in
  `.planning/config.json`, so a `WINDOWS.md` entry does not currently block `/gsd-ship` — though
  entry 1 (Phase 70) is already open regardless.

### Claude's Discretion

- **PLAT-01 (#613) in full.** Not discussed; the shape below is the agreed default, with the details
  left to research and planning:
  - A **stable cache directory** mirroring `BbjNodeDownloader.getNodeDataDirectory()`'s
    `PathManager.getPluginsPath()/bbj-intellij-data/…` pattern, as #613's own proposed approach asks,
    replacing `Files.createTempDirectory(PathManager.getTempPath(), "textmate-bbj")` at
    `BbjTextMateBundleProvider:29-30`, and skipping the five-file copy loop when a valid prior copy
    is present.
  - **Open sub-questions for research:** the staleness/invalidation key (plugin version vs content
    digest — note the Node pipeline's `.sha256` sidecar convention is available as a model);
    concurrent-launch safety, since a stable shared directory can be written by two IDE instances at
    once where a unique temp directory never could; and **whether this phase sweeps the
    `textmate-bbj*` directories earlier launches already abandoned on users' disks**. The sweep is
    file deletion on a user's machine, so it needs an explicit decision — it is scoped safely by the
    plugin's own `textmate-bbj` prefix under the plugin's own temp path, but if research finds any
    ambiguity, surface it rather than deleting by default.
  - There is **no existing test or source guard** on `BbjTextMateBundleProvider` — only the file
    itself and `plugin.xml:213-214` reference it.
- `NodeAvailability`'s fate — retired outright, or kept as a thin banner-facing wrapper over the
  resolver — and the disposition of its 10 pinned tests in `NodeAvailabilityTest`. A refactoring
  consequence of D-05, not a product choice.
- Names and packages of the `NodePresentation` seam and the action-id vocabulary it returns, and the
  notification base's own name and package.
- Exact wording of each reason-specific banner sentence, within D-08's meaning.
- Whether `BbjSettingsLookups`' field validator also routes through the unified resolver or keeps
  calling `meetsMinimumVersion` directly.
- How the base carries Phase 95's varying banner text (an abstract `bannerText` hook vs a supplied
  string), and how broken guards are re-pointed — per Phase 95 D-16: assert each pin exactly once
  inside the base's extracted method body, keep a delegation pin per subclass, and keep negative
  assertions sweeping the subclass files at full breadth.
- Whether `BbjMissingNodeNotificationSourceGuardTest` is rewritten in place or replaced. Its
  six-argument ordered pin on `NodeAvailability.decide(` is **fully invalidated** by D-05.
- Whether IN-02 (`installExtracted:280-282` re-deriving `node.exe` and `bin/node` independently of
  `Target.nodeExecutableName()`) is folded alongside WR-04, since WR-04 touches the same literal.
  Lean yes if it stays a one-line reuse; no if it grows.
- Javadoc wording throughout.

### Folded Todos

Both were already promoted to requirements by the v4.4 roadmap; `todo.match-phase 96` confirms them:

- **`2026-09-06-configured-node-path-suppresses-cached-download-fallback`** → **PLAT-05**. Its
  "What's needed" asks for a product decision on whether the configured-path branch should consult
  the cached download. D-05 supplies it: yes, via seam unification. Note the todo's own hypothesis —
  that this asymmetry is a plausible mechanism for the prior Windows UAT observation — connects it
  directly to PLAT-06.
- **`2026-09-06-live-windows-check-for-node-auto-install-failure`** → **PLAT-06**. D-13/D-14/D-15
  define how it is attested, what is fixed first, and what happens if it fails.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and requirement definition
- `.planning/ROADMAP.md` — Phase 96's goal, its five success criteria and the ordering note. Read
  with the `<domain>` corrections in mind: the "file-disjoint from Phases 93-95" claim is false
  (correction 1), "three editor notification providers" is four (correction 2), and criterion 3 is
  deliberately overridden by D-09.
- `.planning/REQUIREMENTS.md:45-50` — the PLAT-01..PLAT-06 statements; `:111-116` the coverage table.
- `.planning/STATE.md` — Active Constraints (v4.4 is IntelliJ-only; branch + PR with a per-commit
  register check), the standing Phase 79/80/92 decisions, and the Blockers listing 83-REVIEW
  WR-01..WR-05 as "Phase 96 territory".
- `.planning/phases/95-java-interop-status-accuracy-widget-consolidation/95-CONTEXT.md` — D-05 (the
  varying banner text PLAT-03's base must absorb), D-13 (base + thin subclasses), D-16 (base-aware
  guard re-pointing), and its flagged cross-phase consequence for this phase.
- `.planning/phases/93-composer-robustness-consolidation/93-CONTEXT.md` — D-05/D-06 (base + thin
  subclasses over data-driven registration), D-11/D-12 (guard re-pointing, per-guard private
  helpers): the precedents D-10 and D-11 adopt.
- `.planning/milestones/v4.2-phases/83-regression-test-hardening/83-REVIEW.md` — WR-01..WR-05 and
  IN-01/IN-02 in full, with the fix sketches. D-14 folds WR-02 and WR-04 only.
- `.planning/WINDOWS.md` — the ledger format and entry 1's open status, for D-15.

### Code the decisions bind to
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java` — the whole file,
  deleted by D-01; `plugin.xml:236` is its registration.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java` — **live, do not touch**;
  `BbjWordLexer`, `BbjParserDefinition` and `BbjPairedBraceMatcher` consume it.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java` — `:27-48`, the
  whole of PLAT-01's surface; `:29-30` is the per-launch temp directory.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java` — `:21-42`
  (`Source`, `Reason`, `Rejected`), `:135-146` (`failureMessage`), `:150-167` (the fall-through
  `resolve`), `:175-209` (the five-step `validate` core D-06 extends), `:212-224` (`render`).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java` — the seam D-05
  supersedes; `:49-67` `decide`, `:74-79` `bannerNeeded`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` — `:49-56`
  `getCachedNodePath()`'s swallowed `IOException` (#588's literal surface), `:149-153`
  `getNodeDataDirectory()` where it actually originates and the pattern PLAT-01 mirrors.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java` — `:161-169`
  `cachedNodePath()`, `:207-209` (WR-02), `:220-240` `extractZip` incl. `:225` (WR-04),
  `:242-277` `extractTarGz` (WR-01 at `:251-265`, WR-03 at `:249`), `:279-299` `installExtracted`
  (IN-02 at `:280-282`).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:56-77` — the startup
  path that already falls through, and the second `getCachedNodePath()` caller.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDetector.java:53-66` and
  `.../BbjNodeVersionCache.java:76` — `meetsMinimumVersion` and the stat-keyed cache D-06 routes
  through.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java:49` — the third
  version-check caller (the Settings field validator).
- The four notification providers D-09 consolidates:
  `.../BbjMissingHomeNotificationProvider.java:21-55`, `.../BbjMissingNodeNotificationProvider.java:24-63`,
  `.../BbjJavaInteropNotificationProvider.java:23-63` (note `:48` — Phase 95's varying text), and
  `.../ui/BbjServerCrashNotificationProvider.java:21-62` (note `:29-33` the extension guard, `:44`
  the bare panel constructor, `:21` the missing `DumbAware`).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` — `:9-15` the javadoc
  diagnosing the extension bug, `:24-26` the predicate D-11 widens.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropStatusPresentation.java` — the
  platform-free presentation seam D-08 is modelled on; `:64-73` `bannerText`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java` — the
  original seam convention both of the above follow.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetBase.java:119` — Phase 95's
  shipped base and the `showsForSelection` caller the widget guard pins.
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — `:175` the BBj file-type extensions,
  `:213-214` the TextMate bundle provider, `:236` the color settings page, `:254-265` the four
  `<editorNotificationProvider>` entries.

### Test contracts that constrain the work
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java`
  — **fully invalidated by D-05**; its six-argument ordered pin on `NodeAvailability.decide(`,
  plus the `REAL_FILES` and `getCachedNodePath` assertions, all describe the retired call shape.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeAvailabilityTest.java` — 10 tests;
  `aConfiguredPathWithATooOldVersionNeedsTheBannerAndNeverConsultsTheCachedDownload:151-162` pins
  precisely the behaviour D-05 reverses.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` —
  `:128` (one `showsForSelection(` in `updateVisibility`), `:146` (**one `getFileType()` read inside
  `BbjFileVisibility.java`** — the pin D-11 was verified against), `:148` (no extension-derived
  visibility).
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropPollGateSourceGuardTest.java:87`
  — one `showsForSelection(` in the service.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjFileVisibilityTest.java` and
  `.../interop/InteropPollPolicyTest.java:108` — the existing plain-JUnit coverage of the predicate
  D-11 widens; `InteropPollPolicyTest` already reaches it cross-package via the public
  `showsForFileTypeNames`.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java` and
  `.../NodeInstallPipelineSourceGuardTest.java` — the pipeline coverage WR-02/WR-04 must keep green;
  the four committed fixture archives live in `src/test/resources/node-fixtures/`.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java:26`
  — references `ui/BbjServerCrashNotificationProvider.java`; check it against D-09/D-10's changes.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` — the
  hand-written per-file symbol map; D-09/D-11 may need an entry edited if imports move.
- Sixteen test files already pin `plugin.xml` by literal (e.g.
  `config/BbjConfigFileTypeRegistrationTest.java`, `composer/IntentionDescriptionResourcesTest.java`)
  — the convention, should any guard need to assert a registration.

### GitHub issues
- #613 (PLAT-01), #621 (PLAT-02), #622 (PLAT-03), #588 (PLAT-04) — all on milestone #7, all
  PRIO 3. Read them against the `<domain>` corrections: #621's "wire it up" branch is unreachable
  (correction 5), #622's "three providers" is four (correction 2), and the "no `src/test/` source set
  exists" caveat in both #613 and #622 is **obsolete** — the IntelliJ suite is at 865 tests, the same
  correction Phases 93 and 95 carried.

### Documentation
- `documentation/docs/intellij/features.md:39-41` — the "Customization" section D-02 rewrites.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`NodeExecutableResolver`** — an already-tested, `com.intellij`-free resolver with a complete
  rejection vocabulary and a rendered, actionable failure message. D-05 makes it the single engine
  rather than writing anything new.
- **`InteropStatusPresentation`** (Phase 95) and **`ConfigReloadPresentation`** — the platform-free
  presentation-seam convention: plain statics, plain-String arguments, no `com.intellij` import,
  `null` meaning "no banner". D-08's `NodePresentation` is a direct transplant.
- **`BbjFileVisibility`** — the resolved-file-type predicate, with javadoc that already explains why
  the crash provider's extension check is wrong. D-11 widens one method and shares it.
- **`BbjNodeVersionCache.SESSION`** — the stat-keyed version cache from Phase 79 EDT-03, one spawn
  per unchanged path. D-06 routes the resolver's new step through it rather than spawning per call.
- **`BbjStatusBarWidgetBase`** (Phase 95 D-13) and the Phase 93 bases — the structural model for
  D-09's notification base: abstract base holding the shared shape, thin subclasses supplying
  compile-time-checked hooks.
- **`deleteRecursivelyQuietly`** (`NodeInstallPipeline:301`) — the swallow-and-log cleanup pattern
  WR-02's fix mirrors for the outer `finally`.
- **`BbjNodeDownloader.getNodeDataDirectory()`** — the `bbj-intellij-data/` stable-directory pattern
  #613 names as the model for PLAT-01, alongside the `.sha256` sidecar convention.

### Established Patterns
- **Base + thin subclasses over data-driven registration** — chosen three times (Phase 93 D-05/D-06,
  Phase 95 D-13) because a wiring mistake should be a compile error, not a runtime no-op.
- **Plain-Java seams carry no `com.intellij` import** so plain JUnit can drive them, which also keeps
  the LSP4IJ import allowlist untouched.
- **Source guards pin IDE-only wiring by comment-stripped literal counts**, each guard owning private
  copies of its helpers (Phase 93 D-12).
- **Blocking work stays off the EDT** behind the `Scheduler`/`Alarm` seam (Phase 79 EDT-01) —
  relevant to D-06, since the resolver's new step can spawn `node --version`.
- **Closing an issue on cited reasoning** rather than as partially implemented, when the issue's
  acceptance criteria prove too narrow (Phase 93 D-06, 94 D-05, 95 D-11) — D-04 and D-12 both apply
  it.

### Integration Points
- `plugin.xml:254-265` registers four `<editorNotificationProvider>` entries by concrete class, so
  D-09's base needs **no** `plugin.xml` change as long as the four concrete classes keep their FQNs —
  which is the reason D-11 rejected relocating them into `ui`.
- `plugin.xml:236` (`<colorSettingsPage>`) and `:213-214` (`<textmate.bundleProvider>`) are the two
  registrations this phase touches directly — the first removed, the second unchanged while its
  implementation changes.
- `NodeExecutableResolver` has exactly two production callers today (`BbjLanguageServer:61` and,
  after D-05, the banner). `getCachedNodePath()` has two (`BbjLanguageServer:59` and the banner via
  `NodeAvailability`).
- `BbjFileVisibility` has two production callers today — `BbjJavaInteropService:175` and
  `BbjStatusBarWidgetBase:119`; D-11 adds the notification base as a third.

</code_context>

<specifics>
## Specific Ideas

- **The user chose the more rigorous option at every branch**, continuing the pattern Phase 95
  recorded: one engine over two, a version check that actually gates startup, a structural `Reason`
  over a log line, varying actions over varying text alone, four providers over three, and fixing the
  extension guard over preserving a known defect. Planning must not quietly soften any of these back
  toward the issues' literal wording.

- **Five intended observable changes must be declared at UAT — never report this phase as
  no-observable-delta:**
  1. Settings › Editor › Color Scheme no longer has a BBj node (D-01).
  2. A too-old configured Node.js is rejected at startup and falls through to detected/cached,
     instead of launching the server on an unsupported runtime (D-06).
  3. The missing-Node banner's sentence and its action set now vary by reason; the cache-inaccessible
     case no longer offers "Download Node.js" (D-07/D-08).
  4. The server-crash banner now appears on `.bbx` programs and no longer on `.bbl` files (D-09).
  5. The server-crash banner now appears during indexing (D-10).

- **UAT must cover all four banners, not just the two that changed shape** — missing BBj home,
  missing Node (in each of its reason cases), server crashed, and java-interop unavailable (including
  Phase 95's new wrong-peer sentence, since D-09's base now owns that provider's panel construction).

- **PLAT-06 is the one criterion no Linux run can close**, and it has been carried since v4.2 through
  two milestones. It is attested by hand at phase end against the shipping build, and its outcome is
  recorded either way (D-13/D-15).

</specifics>

<deferred>
## Deferred Ideas

- **Semantic-token coloring in IntelliJ.** The route by which a color-customization page could ever
  become live. The language server already registers `BBjSemanticTokenProvider`
  (`bbj-module.ts:104`), but it emits only `parameter`, `variable` and `keyword`, and the IntelliJ
  side has no LSP4IJ semantic-token wiring at all. A full integration would light up at most 3 of the
  9 descriptors D-01 deletes and would contest TextMate for the same ranges — a feature phase in its
  own right. D-03 deliberately adds no guard that would block it.

- **83-REVIEW WR-01** (`NodeInstallPipeline:251-265`) — tar cancellation is not honored
  mid-extraction: the command has no `-v`, so a successful run emits zero lines and `readLine()`
  blocks to EOF, never reaching `checkCanceled()`, while the comment claims otherwise. Unix-only, so
  it does not touch the Windows path PLAT-06 attests. **Verified still open 2026-09-19.**

- **83-REVIEW WR-03** (`NodeInstallPipeline:249`) — `process.getOutputStream()` is never closed,
  leaking a file descriptor per extraction. **Verified still open 2026-09-19.**

- **83-REVIEW WR-05** (`BbjSettingsComponent:433`) — `flushPendingHomeLookup()` calls
  `BbjSettingsLookups.lookupHome` synchronously from `apply()`, i.e. on the EDT, violating the
  class's own documented invariant at `:32-35`. Settings dialog, not the Node pipeline. **Verified
  still open 2026-09-19.** Adjacent to D-05's discretion item about the Settings field validator.

- **83-REVIEW IN-01** — decision-id comments (`D-12`) leaked into production Javadoc at
  `BbjSettingsComponent:33,188` and `BbjSettingsLookups:11`. Worth sweeping whenever those files are
  next touched, per the project's register-check convention.

- **83-REVIEW IN-02** (`NodeInstallPipeline:280-282`) — `node.exe` and `bin/node` re-derived
  independently of `Target.nodeExecutableName()`. May be folded with WR-04 at the planner's
  discretion, since WR-04 touches the same literal.

- **The `.bbl` question beyond the crash banner.** D-09 stops the crash banner firing on `.bbl`
  because those files carry no BBj file type. If `.bbl` files should get BBj language support at all,
  that is a file-type-registration question for another phase, not a notification-provider one.

### Reviewed Todos (not folded)

`todo.match-phase 96` returned four matches. Two are this phase's own requirements (see **Folded
Todos**). The other two were reviewed and rejected — the same two Phases 93, 94 and 95 each rejected:

- **`2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version`** — fixed 2026-09-06
  (the fixture was Phase 78's wrapper 8.14.5 vs a 8.13 expectation). Needs close-out, not work.
- **`2026-09-03-update-live-interop-tests-for-getallclassnames-backend`** — environment drift in the
  local vitest baseline (BBjServices squatting on :5008, and the live backend exposing
  `getAllClassNames`), not IntelliJ work and not a regression.

</deferred>

---

*Phase: 96-Platform Integration & Node.js Diagnosis*
*Context gathered: 2026-09-19*
