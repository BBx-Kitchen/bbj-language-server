# Phase 97: Release 0.16.0 & Milestone Close - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 12 (code wave + housekeeping) + 4 non-code deliverables
**Analogs found:** 12 / 12 (code wave is entirely modifications to existing files — the analog for
each file IS the file itself; there are no brand-new production files in this phase)

**Scope note:** Phase 97's code wave modifies existing files rather than creating new ones (six
folded todos, all localized edits). Consequently "closest analog" for each touched file is the file
itself — the pattern to copy is the file's *own* existing conventions (its neighboring methods,
its existing test's assertion style). Where a genuinely new construct is added (the
`LSPClientFeatures#handleServerStatusChanged` override, its coupling canary, its allowlist entry,
a new pinning test for todo 2), the closest sibling pattern within the same file is cited.

## File Classification

| Modified File | Role | Data Flow | Closest Analog (sibling pattern within/near the same file) | Match Quality |
|---|---|---|---|---|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` | provider/factory (DI wiring) | event-driven | Same file's `createClientFeatures()` anonymous `LSPClientFeatures` override of `initializeParams` | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` | controller (LSP client callbacks) | event-driven | Same file's existing `handleServerStatusChanged` override (being reduced) and `@JsonNotification` handlers (`resolvedConfigPath`, `configReloadRequired`) as the no-op-handler template | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` | service (state machine) | event-driven | Same file's `updateStatus(ServerStatus)` — the classify/log/state-mutate sequence being fixed in place | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java` | utility (pure classifier) | transform | Unchanged this phase (no semantic edit) — cited only as the classifier `updateStatus` feeds | n/a (unchanged) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` | utility (progress reporting) | streaming | Same file's `downloadNodeAsync` lambda at lines 98-103 | exact |
| `bbj-intellij/src/test/java/.../lsp/Lsp4ijOverrideSiteSourceGuardTest.java` | test (whole-file source guard) | transform | Same file's `handleServerStatusChangedCallsSuperOnceAndDispatchesItsOwnWorkThroughInvokeLater` (lines 126-135) and `createClientFeaturesBuildsExactlyOne...` (lines ~95-109) | exact |
| `bbj-intellij/src/test/java/.../lsp/Lsp4ijCouplingCanaryTest.java` | test (reflective coupling canary) | transform | Same file's `theClientMembersThisPluginOverridesStillExist` (lines 331-344) and `theServerStatusConstantsThisPluginBranchesOnStillExist` (lines 258-269) | exact |
| `bbj-intellij/src/test/java/.../lsp/Lsp4ijImportAllowlistTest.java` | test (allowlist data) | transform | Same file's `ALLOWLIST` map, `BbjLanguageServerFactory.java` entry at lines 55-57 | exact |
| `bbj-intellij/src/test/java/.../concurrency/ExpectedStopGuardTest.java` | test (plain-JUnit behavioural) | transform | Same file's existing per-transition tests (lines 26-80) | exact |
| any new `BbjServerService`-scoped pinning test for todo 2 (from-state staleness) | test (new, no direct analog) | transform | `ExpectedStopGuardTest`'s style (arrange guard/service, `assertEquals` verdict + message) — no `BbjServerServiceTest` currently exists; closest sibling is `BbjServerServiceRestartSourceGuardTest` (same package, source-guard style) if a source-guard is preferred over a state test | role-match |
| `bbj-vscode/test/functional/issue447-real-interop.test.ts` | test (live-interop functional) | request-response | Read in full — see excerpt below; rewrite `capability detection...` to accept either backend shape | exact (self) |
| `bbj-vscode/test/linking.test.ts` (investigation, `-t Interop`) | test (linking/scope) | request-response | Not fully re-read this session (11/7/24 baseline already confirmed in RESEARCH.md); no new pattern needed — investigation task, not a new-code task | n/a (investigation only) |

## Pattern Assignments

### `BbjLanguageServerFactory.java` (provider, event-driven) — new `handleServerStatusChanged` override

**Analog:** same file, `createClientFeatures()` (already read in full above)

**Core pattern to extend** (lines 40-71):
```java
@Override
public @NotNull LSPClientFeatures createClientFeatures() {
    return new LSPClientFeatures() {
        @Override
        public void initializeParams(@NotNull InitializeParams params) {
            super.initializeParams(params);
            ...
        }
        // NEW: add here, following the same anonymous-subclass-override convention
        // @Override
        // public void handleServerStatusChanged(@NotNull ServerStatus status) {
        //     BbjServerService.getInstance(project).updateStatus(status);
        // }
    }
    .setDocumentLinkFeature(...)
    .setCompletionFeature(...);
}
```
Note `project` is not currently captured in this anonymous class — `createClientFeatures()`'s own
signature receives no `Project` parameter (only `createConnectionProvider`/`createLanguageClient`
do), so the override must resolve the project some other way (e.g. constructor-inject at the
factory-instance level, or store it during `createConnectionProvider`/`createLanguageClient` on
`this` — LSP4IJ constructs one factory instance per server definition, not necessarily per
project, so verify this assumption against LSP4IJ's actual lifecycle before relying on `this`
state). This is exactly the kind of design detail the plan must record explicitly (ties to D-08).

**Import pattern** (lines 1-15) — add `ServerStatus`:
```java
import com.redhat.devtools.lsp4ij.client.features.LSPClientFeatures;
import com.redhat.devtools.lsp4ij.client.features.LSPDocumentLinkFeature;
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider;
```
`ServerStatus` must be added here to reference it in the new override — this is exactly the import
the allowlist test's `Set.of(...)` for this file must also gain (see Shared Patterns → LSP4IJ
coupling fence).

---

### `BbjLanguageClient.java` (controller, event-driven) — reduce `handleServerStatusChanged`, add `bbjcplAvailability` no-op

**Analog:** same file's existing `handleServerStatusChanged` (lines 41-56) and the two
`@JsonNotification` handlers (lines 68-121)

**Current shape to reduce** (lines 41-56):
```java
@Override
public void handleServerStatusChanged(ServerStatus serverStatus) {
    super.handleServerStatusChanged(serverStatus);
    Project project = getProject();
    if (project.isDisposed()) {
        return;
    }
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) {
            return;
        }
        BbjServerService service = BbjServerService.getInstance(project);
        service.logToConsole("Server status: " + serverStatus, com.intellij.execution.ui.ConsoleViewContentType.SYSTEM_OUTPUT);
        service.updateStatus(serverStatus);
    });
}
```
Per Pitfall 1 (RESEARCH.md), the `service.updateStatus(serverStatus)` call must be removed from
here once the new hook becomes authoritative — keep only the `logToConsole` call (or drop the
override's body-work entirely and rely on the new hook's own logging) to avoid double-processing.
`Lsp4ijOverrideSiteSourceGuardTest`'s `handleServerStatusChangedCallsSuperOnceAndDispatchesItsOwnWorkThroughInvokeLater`
(pinning `super.handleServerStatusChanged(` once, `invokeLater(` once) must be re-examined: if this
method's body is trimmed, that assertion's `body` (extracted via `bodyOf(text, "public void
handleServerStatusChanged(ServerStatus serverStatus)")`) still needs exactly one `super...` call
and, only if `invokeLater` work remains for logging, exactly one `invokeLater(`.

**No-op notification handler template** (copy shape from lines 68-70, RESEARCH.md's exact
recommendation):
```java
@JsonNotification("bbj/bbjcplAvailability")
public void bbjcplAvailability(Object result) {
    // no-op: IntelliJ has no UI to surface BBjCPL availability; this exists only to
    // silence LSP4IJ's "Unsupported notification method" WARN in idea.log.
}
```
Place it beside the two existing `@JsonNotification` methods (after `configReloadRequired`, line
121), matching their doc-comment convention that explains why declaring the method directly on
this class is sufficient (LSP4J reflects over the concrete class).

**Imports already present, no change needed** for the no-op handler:
```java
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
```
(already imported, line 16).

---

### `BbjServerService.java` (service, event-driven) — the authoritative `updateStatus` call site + todo 2 fix

**Analog:** same file's `updateStatus(ServerStatus)` (lines 139-217, read in full above)

**Bug to fix (todo 2)** — exact lines 146-150 and 206-207:
```java
ExpectedStopGuard.StopKind stopKind =
    expectedStop.classify(status.name(), previousStatus.name(), System.currentTimeMillis());

LOG.info("BBj language server status: " + previousStatus + " -> " + status
    + " (classified as " + stopKind + ")");
...
previousStatus = currentStatus;
this.currentStatus = status;
```
Per RESEARCH.md's traced bug: `previousStatus` here is stale by one call. Fix is to classify/log
against `currentStatus` (the true "from" state for *this* call) instead of the `previousStatus`
field, e.g.:
```java
ExpectedStopGuard.StopKind stopKind =
    expectedStop.classify(status.name(), currentStatus.name(), System.currentTimeMillis());

LOG.info("BBj language server status: " + currentStatus + " -> " + status
    + " (classified as " + stopKind + ")");
```
Keep the `previousStatus = currentStatus; this.currentStatus = status;` assignment at the end
(lines 206-207) if any other code still reads the `previousStatus` field — grep for other readers
before deciding whether to keep or drop it.

**Threading decision site (todo 1's Option A, per RESEARCH.md)**: if `synchronized(this)` is
adopted for the non-UI section, wrap `updateStatus`'s body from the `stopKind` computation through
the `previousStatus = currentStatus; this.currentStatus = status;` assignment (lines 146-207),
leaving the `ApplicationManager.getApplication().invokeLater(...)` UI-touching tail (lines 209-216)
and the crash-branch's `notifyCrash()` / `EditorNotifications` calls unsynchronized (they are
already IntelliJ-platform calls expected to run off arbitrary threads per existing convention, and
wrapping them in the monitor risks a deadlock if the platform ever calls back synchronously).

**Style precedent for a `synchronized` non-UI section**: `ExpectedStopGuard` itself already uses
`synchronized` per-method for its own smaller mutable state (`arm`, `disarm`, `classify` — lines
46, 51, 63) — mirror that per-method-`synchronized` style rather than introducing an explicit
`Lock`/`ReentrantLock` object, to match the file's own existing concurrency idiom.

---

### `BbjNodeDownloader.java` (utility, streaming) — todo 4 `setFraction` fix

**Analog:** same file, lines 93-103 (read in full above)

**Exact site and fix**:
```java
new Task.Backgroundable(project, "Downloading Node.js " + NodeInstallPipeline.NODE_VERSION + "...", true) {
    @Override
    public void run(@NotNull ProgressIndicator indicator) {
        try {
            NodeInstallPipeline pipeline = productionPipeline();
            indicator.setIndeterminate(false);   // NEW — call once, before the first setFraction
            pipeline.install(
                    (text, fraction) -> {
                        indicator.setText(text);
                        indicator.setFraction(fraction);
                    },
                    indicator::checkCanceled);
```
One-line insertion immediately before `pipeline.install(...)` (or as the first statement inside
the lambda, guarded so it only runs once — a plain call before `pipeline.install` is simplest and
matches "call it once" from RESEARCH.md).

---

### `Lsp4ijOverrideSiteSourceGuardTest.java` (test, whole-file source guard)

**Analog:** same file's existing per-method body-shape assertions (lines 95-135, read in full)

**Pattern to copy for a new assertion pinning the new override's shape**:
```java
@Test
void handleServerStatusChangedCallsSuperOnceAndDispatchesItsOwnWorkThroughInvokeLater() {
    String text = readGuardedSource(CLIENT_SOURCE);
    String body = bodyOf(text, "public void handleServerStatusChanged(ServerStatus serverStatus)");

    assertEquals(1, countOccurrences(body, "super.handleServerStatusChanged("),
        "handleServerStatusChanged(...) must call super.handleServerStatusChanged( exactly once");
    assertEquals(1, countOccurrences(body, "invokeLater("),
        "handleServerStatusChanged(...) must dispatch its own work through invokeLater( exactly once");
}
```
New test (per D-07's "new assertion in this file pinning the new override's shape") should follow
this exact `readGuardedSource` → `bodyOf(text, "<signature>")` → `countOccurrences`/`assertEquals`
skeleton against `FACTORY_SOURCE` (the constant already used for `BbjLanguageServerFactory.java`,
see `createConnectionProviderConstructsBbjLanguageServerAndCreateLanguageClientConstructsBbjLanguageClient`
at lines 111-124), asserting e.g. that the new `handleServerStatusChanged` override calls
`BbjServerService.getInstance(project).updateStatus(` exactly once, and — if Option A is chosen —
that it does **not** contain `invokeLater(` (proving the call is synchronous, not UI-deferred).

---

### `Lsp4ijCouplingCanaryTest.java` (test, reflective coupling canary)

**Analog:** same file's `theClientMembersThisPluginOverridesStillExist` (lines 331-344, read above)

**Pattern to copy for a new canary pinning `LSPClientFeatures.handleServerStatusChanged`**:
```java
@Test
void theClientMembersThisPluginOverridesStillExist() throws NoSuchMethodException {
    Method createSettings = LanguageClientImpl.class.getDeclaredMethod("createSettings");
    assertEquals(Object.class, createSettings.getReturnType());

    Method handleServerStatusChanged = LanguageClientImpl.class.getMethod(
        "handleServerStatusChanged", ServerStatus.class);
    assertEquals(void.class, handleServerStatusChanged.getReturnType());
    ...
}
```
New canary (per D-07) should mirror this exactly but target `LSPClientFeatures.class` instead of
`LanguageClientImpl.class`:
```java
@Test
void theClientFeaturesMembersThisPluginOverridesStillExist() throws NoSuchMethodException {
    Method handleServerStatusChanged = LSPClientFeatures.class.getMethod(
        "handleServerStatusChanged", ServerStatus.class);
    assertEquals(void.class, handleServerStatusChanged.getReturnType());
}
```
`LSPClientFeatures` is already imported in this file (line 11). Place beside the existing
`theClientMembersThisPluginOverridesStillExist` test for locality, matching the file's existing
grouping-by-subject-class convention (`theConnectionProviderMembersThisPluginUsesStillExist`,
`theFactoryInterfaceMembersThisPluginImplementsStillExist` immediately follow, lines 346-359).

---

### `Lsp4ijImportAllowlistTest.java` (test, allowlist data)

**Analog:** same file's `ALLOWLIST` map, `BbjLanguageServerFactory.java` entry (lines 55-57, read
above)

**Exact edit** — add `"ServerStatus"` to this file's existing entry:
```java
Map.entry("com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java",
    Set.of("LanguageServerFactory", "LanguageClientImpl", "LSPClientFeatures",
        "LSPDocumentLinkFeature", "StreamConnectionProvider", "ServerStatus")),
```
The map's size assertion (`assertEquals(12, ALLOWLIST.size())`, line 251) does **not** need to
change — this is a same-file symbol addition, not a new file entry. Follow the file's own
`Set.of(...)` alphabetical-ish-by-first-use ordering convention (matches `BbjLanguageClient.java`'s
entry at line 52-53, which already lists `"ServerStatus"` first).

---

### `ExpectedStopGuardTest.java` (test, plain-JUnit behavioural) — todo 2 pinning test

**Analog:** same file's existing per-transition test style (lines 26-80, read in full above)

**Pattern to copy** for a new pinning test proving the *correct* from-state is fed (per D-08's
"do not change the classifier input without a test that pins the intended behaviour" — this test
belongs wherever the fix is made; if the fix stays entirely inside `BbjServerService.updateStatus`,
a new `BbjServerServiceTest`-style test is more accurate than `ExpectedStopGuardTest` itself, since
`ExpectedStopGuard.classify` doesn't change semantics — only its caller's argument does):
```java
@Test
void stoppedAfterStartedWhileArmedIsAnExpectedRestartStop() {
    ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);
    guard.arm(0);
    assertEquals(EXPECTED_RESTART_STOP, guard.classify("stopped", "started", 100));
}
```
If no `BbjServerService`-scoped test currently exists (confirm via `find`/`Glob` before assuming),
the new pinning test needs a minimal harness around `BbjServerService.updateStatus` — check
`BbjServerServiceRestartSourceGuardTest` first (cited in RESEARCH.md's "Sources" and phase
requirements map) as the closest existing test scoped to this class, since it may already contain
usable IntelliJ-platform-test-fixture setup (light fixture / mock project) to reuse rather than
building a new one.

---

### `bbj-vscode/test/functional/issue447-real-interop.test.ts` (test, functional/live-interop)

**Analog:** self (read in full above)

**Test to rewrite** (lines 36-44):
```typescript
test.runIf(run)('capability detection: current server lacks getAllClassNames and degrades gracefully', async () => {
    const interop = services.BBj.java.JavaInteropService;
    // The deployed server predates the augmented endpoint, so no complete index is built...
    expect(await interop.ensureCompleteClassIndex()).toBe(false);
    expect(interop.hasCompleteClassIndex()).toBe(false);
    // ...yet suggestions still work via the fallback probe.
    const candidates = await interop.resolveClassCandidatesBySimpleName('HashMap');
    expect(candidates).toContain('java.util.HashMap');
}, 60000);
```
Per RESEARCH.md, rewrite to accept either backend shape (the live :5008 backend now returns `true`
for `ensureCompleteClassIndex()`), e.g. drop the hard-coded `.toBe(false)` and instead assert the
outcome is a `boolean` plus that the fallback/complete-index behavior both still resolve
`java.util.HashMap` correctly regardless of which branch runs — follow this file's existing
`describe`/`test.runIf(run)`/`shouldRunBBjTests()` skeleton (imports lines 1-9, `beforeAll` setup
lines 23-30) unchanged; only the one test body needs new assertions.

## Shared Patterns

### LSP4IJ coupling fence (applies to all three production files touched by todo 1/2)
**Source:** `Lsp4ijImportAllowlistTest.java` (ALLOWLIST map) + `Lsp4ijCouplingCanaryTest.java`
(reflective pins) + `Lsp4ijOverrideSiteSourceGuardTest.java` (whole-file body-shape assertions)
**Apply to:** `BbjLanguageServerFactory.java` (new `ServerStatus` import → allowlist entry gains
`"ServerStatus"`), `BbjLanguageClient.java` (reduced `handleServerStatusChanged`, unchanged
imports), and any new anonymous/override site referencing `ServerStatus`/`LSPClientFeatures`.
**Rule:** any new `com.redhat.devtools.lsp4ij.*` symbol reference in `src/main/java` must be added
to the allowlist or the whole-suite Gradle gate reds (per the file's own header comment, lines
25-28 read above: "the test... fails until ALLOWLIST is edited beside the canary that covers the
new symbol").

### `invokeLater`/EDT-safety idiom (applies to all `BbjServerService`/`BbjLanguageClient` UI work)
**Source:** `BbjServerService.java` lines 116-119, 176-181, 194-199, 209-216;
`BbjLanguageClient.java` lines 48-56, 83-94
**Apply to:** any new code inside `updateStatus` or the new `handleServerStatusChanged` override
that touches `EditorNotifications`, `NotificationGroupManager`, or the message bus — wrap in
`ApplicationManager.getApplication().invokeLater(() -> { if (project.isDisposed()) return; ... })`,
matching this project's existing every-single-site convention (project-disposed guard first,
inside the lambda, not before it).

### Plain-JUnit-only, no vendor import (applies to `ExpectedStopGuard` and its test)
**Source:** `ExpectedStopGuard.java` header comment (lines 3-14)
**Apply to:** any new logic that could be extracted from `BbjServerService.updateStatus` into a
pure function — prefer keeping it free of `com.intellij`/`com.redhat.devtools.lsp4ij` imports so it
stays outside the allowlist/canary fence and testable under plain JUnit, exactly as
`ExpectedStopGuard` and `ConfigReloadPresentation` already do (both cited by this file's own doc
comment as siblings using the same status-name-as-String convention).

### 96-08 UAT-record shape (applies to the D-07 hand-UAT record and the D-16 smoke-verdict record)
**Source:** `.planning/phases/96-platform-integration-node-js-diagnosis/96-08-SUMMARY.md`
(excerpt, lines 41, 79-98, 136 read above)
**Apply to:** any UAT/smoke verdict Claude records this phase — tie the verdict sentence to an
exact artifact identity (`sha256 <hash>`, byte size, `built from source commit <sha>`), plus the
maintainer's verbatim reply quoted directly ("pass, works as expected now"). Example shape to
copy:
```
G-96-2 is recorded as closed on the maintainer's reply "pass, works as expected now" (2026-09-20),
tied to artefact `bbj-intellij-0.1.0.zip` sha256 `89ba447...` (1,159,831 bytes) and source commit
`dbdb6528...`, plus VS Code side `bbj-lang-0.15.3.vsix` sha256 `1226591...` (2,631,405 bytes).
```
Use this exact "verdict + artifact identity (hash, size, commit) + counterpart artifact" sentence
shape for D-16's release smoke record and for the D-07 hand-UAT record ("both distributables built
before the UAT" — cite both zip/vsix hashes the same way).

## No Analog Found

| File / deliverable | Role | Data Flow | Reason |
|---|---|---|---|
| Reconciliation runbook (D-10) | doc | n/a | No existing runbook-style doc in `.planning/phases/9[3-6]-*/`; closest structural precedent is `manual-release.yml` itself (the job graph the runbook narrates) plus RESEARCH.md's own "Code Examples" section, which already drafts the exact `gh run download` / `curl` commands to copy verbatim. |
| Precondition checklist (D-11) | doc | n/a | No existing precondition-checklist doc found under `.planning/phases/9[3-6]-*/`; D-11's own bullet list in 97-CONTEXT.md (landing PR merged; Preview run green; hand check passed; HEAD SHA; package.json version; no v0.16.0 tag/release; runbook written) is itself the closest template — restate as a literal markdown checklist. |
| 21-comment closing-comment review file (D-19/D-20) | doc | n/a | No existing "batch of N GitHub comments for review" file found in this repo's `.planning/` tree; D-20's own worked example (2-4 sentences, "Fixed in 0.16.0" + link + user-visible change + commit SHA, extra reasoning sentence for #616/#618/#620/#622/#594/#593) is the template — no closer analog exists to cite. |
| Curated v4.4 release-notes summary (D-13) | doc | n/a | No prior curated-release-notes doc exists in this repo (0.15.0 was not similarly curated per the Out-of-Scope note); write fresh per D-13's own spec (eleven fixes in plain language, ten consolidations as one line, Color Scheme removal, Node.js diagnosis/fallback change, user-visible folded todos). |
| `QA/SMOKE-TEST-CHECKLIST.md` filled-in copy (D-15) | doc | n/a | The checklist file itself (`QA/SMOKE-TEST-CHECKLIST.md`) is the analog to copy structure from directly — not read in full this session (out of budget), but its "Test Run Result"/"Test Information" blocks are named explicitly in D-15/97-CONTEXT.md; read it in full during planning/execution before filling it in. |

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/{lsp,ui,concurrency,BbjNodeDownloader.java}`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/{lsp,concurrency}`,
`bbj-vscode/test/{functional/issue447-real-interop.test.ts,linking.test.ts}`,
`.planning/phases/96-platform-integration-node-js-diagnosis/`, `QA/`.
**Files scanned:** 12 production/test files read in full or targeted excerpt; 1 prior-phase SUMMARY
grepped for the UAT-record shape.
**Pattern extraction date:** 2026-09-20
