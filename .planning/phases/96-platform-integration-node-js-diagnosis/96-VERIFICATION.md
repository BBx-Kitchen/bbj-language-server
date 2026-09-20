---
phase: 96-platform-integration-node-js-diagnosis
verified: 2026-09-20T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified (1 verified-with-recorded-deviation, 1 failed)
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "On a real Windows machine with no Node.js configured, the editor banner's 'Download Node.js' action produces a working node.exe beside its .sha256 sidecar and the language server starts afterward."
    status: failed
    reason: "Hand attestation on real Windows (IntelliJ IDEA 2026.2.2, Windows 10) confirms the download half works (node.exe + .sha256 sidecar land correctly, 68 MB, verified by the maintainer) but the language server does not start afterward. Two root causes were found and fixed during the same session (Node floor pin, version-cache null poisoning), but a further blocker remains unresolved and undiagnosed because BbjLanguageServer's Node-path diagnostics use java.util.logging.Logger, which IntelliJ never routes to idea.log."
    artifacts:
      - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java"
        issue: "Node-path diagnostics logged via java.util.logging.Logger never reach idea.log, blocking root-cause diagnosis of the startup failure"
    missing:
      - "A dedicated debug session on real Windows, starting with switching BbjLanguageServer's logger to com.intellij.openapi.diagnostic.Logger so the failure's real cause becomes visible in idea.log (96-07-SUMMARY.md finding 7)."
      - "Root-cause fix for the language server failing to start after a successful Node.js auto-install on Windows."
      - "Re-attestation on real Windows once the above is fixed."
deferred: []
behavior_unverified_items: []
human_verification:
  - test: "A Node.js path configured to an older-than-minimum-version runtime no longer starts the language server on real Windows; it falls through to a detected or downloaded candidate."
    expected: "Language server starts off the detected/cached runtime instead of the rejected too-old configured one; no silent launch on an unsupported runtime."
    why_human: "Not tested during the 96-07 attestation session on the real Windows machine; the resolver-level behavior is proven by NodeExecutableResolverVersionGatingTest, but the end-to-end IDE-visible startup path has not been confirmed on Windows."
  - test: "With the plugin's Node.js cache/data directory made unwritable, the missing-Node banner names the cache problem and offers no 'Download Node.js' action."
    expected: "Banner text names the inaccessible-cache reason distinctly from 'nothing found', and its action list omits the Download Node.js button entirely."
    why_human: "Not tested during the 96-07 attestation session; NodePresentationTest proves the seam's decision logic, but the real banner rendering with a genuinely unwritable directory on Windows has not been confirmed."
  - test: "The server-crash banner appears while the IDE is indexing (dumb mode) with the server in a crashed state."
    expected: "Banner renders during an active indexing pass, not only after indexing completes."
    why_human: "Not tested during the 96-07 attestation session; DumbAware wiring is structurally correct and reviewed, but a real indexing pass was not exercised against a crashed server."
  - test: "All four editor notification banners (missing BBj home, missing/unusable Node, server crashed, java-interop unavailable) checked together in one session, including Phase 95's wrong-peer wording on the java-interop banner."
    expected: "Each banner appears and disappears independently and correctly when its triggering condition is present/absent, with no cross-banner interference."
    why_human: "Not tested together in the 96-07 attestation session; individual banners were spot-checked (crash banner, missing-Node banner) but the full four-banner sweep, including Phase 95's status-varying wording, remains outstanding."
---

# Phase 96: Platform Integration and Node.js Diagnosis Verification Report

**Phase Goal:** The plugin's platform-integration surfaces stop wasting resources and stop
misleading — a reused TextMate bundle directory, no inert settings page, one notification-provider
base — and a developer without a usable Node.js is shown the real diagnosis, with the auto-install
path finally attested on real Windows.

**Verified:** 2026-09-20
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A second IDE launch reuses the cached TextMate bundle directory instead of allocating a fresh temp directory and re-copying its five files; abandoned directories are cleaned up. | ✓ VERIFIED | `TextMateBundleCache.java` (platform-free, 0 `com.intellij` occurrences) implements `isPopulatedFor`/`populate`/`sweepAbandoned`; `BbjTextMateBundleProvider.java` contains 0 occurrences of `createTempDirectory`/`getTempPath`, 1 occurrence of `bbj-intellij-data`. `TextMateBundleCacheTest` (15 cases) proves zero-resource-open on cache hit, marker-written-last ordering, and sweep blast-radius bounds; re-run green in this verification session. |
| 2 | Customizing a colour under Settings › Editor › Color Scheme › BBj visibly changes highlighting — or the page is gone entirely. | ✓ VERIFIED | `BbjColorSettingsPage.java` confirmed absent from disk; `plugin.xml` has 0 occurrences of `colorSettingsPage`/`BbjColorSettingsPage`; `documentation/docs/intellij/features.md` names TextMate and contains 0 occurrences of "Color Scheme". Maintainer hand-UAT on the Windows build (96-07-SUMMARY.md): "it's correct" — no BBj Color Scheme page, highlighting intact. |
| 3 | The three editor notification providers share one base carrying the file-type guard and panel construction; each banner still appears/disappears in exactly the conditions it did before. | ✓ VERIFIED (recorded deviation) | `BbjNotificationProviderBase.java` exists; all four registered providers (`BbjServerCrashNotificationProvider`, `BbjMissingHomeNotificationProvider`, `BbjMissingNodeNotificationProvider`, `BbjJavaInteropNotificationProvider`) declare `extends BbjNotificationProviderBase` (grep confirms 1 each); `BbjFileVisibility.isBbjProgramFileTypeName` widened to `public static`. **Intended deviation from literal wording (D-09/D-10), per known_outcome context:** the crash banner now appears on `.bbx` files, no longer on `.bbl` files, and now appears during indexing — the old extension-based guard was itself the bug (`BbjServerCrashNotificationProvider.java` has 0 occurrences of `getExtension(` and 0 of `"bbl"`). Hand-verified on Windows (96-07-SUMMARY.md): crash banner confirmed on `.bbx`/not on `.bbl`. Also a deliberate superset: four providers consolidated where #622 named three. |
| 4 | A developer whose Node.js is unusable is shown the diagnosis that matches reality; "not yet downloaded" and "cache directory inaccessible" are distinguishable to every caller; a configured-but-unusable path either consults the cached download or deliberately does not, with the decision recorded. | ✓ VERIFIED | `NodeExecutableResolver.java` carries `Reason.BELOW_MINIMUM_VERSION` and `Reason.CACHE_UNAVAILABLE` (2 occurrences confirmed); `NodePresentation.java` (0 `com.intellij` occurrences) exposes `bannerText`/`bannerActions`; `BbjMissingNodeNotificationProvider.java` calls `NodeExecutableResolver.resolve(` and both `NodePresentation.bannerText`/`bannerActions`; `NodeAvailability.java` (the superseded second engine) confirmed deleted. Behavioral unit tests (`NodeExecutableResolverVersionGatingTest`, `NodePresentationTest`) — re-run green in this session — exercise the actual state transitions: version-based fall-through to cached, cache-inaccessible vs. cache-empty distinction, at-most-once version-cache spawn. Two of the code-level behaviors (too-old-Node startup rejection on real Windows, unwritable-cache banner) remain end-to-end **unconfirmed on a real IDE** — routed to Human Verification below. |
| 5 | On a real Windows machine with no Node.js configured, the "Download Node.js" action produces a working `node.exe` beside its `.sha256` sidecar and the language server starts afterward. | ✗ FAILED | Hand attestation performed on real Windows (IntelliJ IDEA 2026.2.2, Windows 10) per 96-07-SUMMARY.md. Download half passed: `node.exe` (68 MB) + `.sha256` sidecar verified in place. Language-server-starts half did NOT pass — maintainer reported "BBj Stopped", restart made no difference. WINDOWS.md ledger entry id 3 (open) records this. PLAT-06 correctly left Pending in REQUIREMENTS.md. |

**Score:** 4/5 truths verified (truth 3 verified with a recorded, reasoned deviation from its literal wording; truth 5 failed).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/TextMateBundleCache.java` | Platform-free cache decision seam | ✓ VERIFIED | Exists, 0 `com.intellij` imports, declares `MARKER_FILE_NAME`, `isPopulatedFor`, `populate`, `sweepAbandoned` |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java` | Thin wrapper over the cache seam | ✓ VERIFIED | 0 occurrences `createTempDirectory`/`getTempPath`; 1 occurrence `bbj-intellij-data` |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java` | Deleted | ✓ VERIFIED | Absent from disk |
| `bbj-intellij/src/main/resources/META-INF/plugin.xml` | `colorSettingsPage` registration removed; 4 `editorNotificationProvider` entries intact | ✓ VERIFIED | 0 `colorSettingsPage`/`BbjColorSettingsPage`; 4 `editorNotificationProvider` occurrences |
| `documentation/docs/intellij/features.md` | Customization section rewritten, TextMate-driven | ✓ VERIFIED | 0 "Color Scheme"; TextMate named |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java` | Exact zip-entry match; guarded cleanup; `nodeExecutableName()` reuse | ✓ VERIFIED | 0 `endsWith("node.exe")`; `deleteIfExistsQuietly` present; `nodeExecutableName` referenced 6×|
| `bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip` | Committed decoy fixture proving exact-path match | ✓ VERIFIED | Exists; README carries its section (3 occurrences of the fixture name) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNotificationProviderBase.java` | Abstract base owning guard + panel construction | ✓ VERIFIED | Exists; all 4 providers extend it |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` | Widened shared predicate | ✓ VERIFIED | `isBbjProgramFileTypeName` is `public static` |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java` | Single Node decision engine, version gate, cache-unavailable reason | ✓ VERIFIED | `BELOW_MINIMUM_VERSION`/`CACHE_UNAVAILABLE` present |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java` | Platform-free reason-varying banner seam | ✓ VERIFIED | 0 `com.intellij`; `bannerText`/`bannerActions` present |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java` | Superseded engine deleted | ✓ VERIFIED | Absent from disk |
| `.planning/WINDOWS.md` | Ledger entry for the failed attestation | ✓ VERIFIED | Entry id 3, phase 96, `unmet-truth`, status `open`; frontmatter counts (open=2, total=3) match the JSON array rows exactly |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BbjTextMateBundleProvider.getBundles()` | `TextMateBundleCache` | cache-decision delegation | ✓ WIRED | Provider references `TextMateBundleCache.` |
| `TextMateBundleCache.sweepAbandoned` | `NodeInstallPipeline.deleteRecursively` | reused symlink-safe delete | ✓ WIRED | Confirmed by 96-02-SUMMARY.md and REVIEW disposition |
| `BbjServerCrashNotificationProvider` | `BbjNotificationProviderBase` | thin subclass | ✓ WIRED | `extends BbjNotificationProviderBase` confirmed |
| `BbjMissingNodeNotificationProvider.buildPanel` | `NodeExecutableResolver.resolve` | version-gating decision call | ✓ WIRED | 1 occurrence confirmed |
| `BbjMissingNodeNotificationProvider.buildPanel` | `NodePresentation.bannerText`/`bannerActions` | reason-specific sentence + action set | ✓ WIRED | 1 occurrence each confirmed |
| `BbjLanguageServer.resolveNodePath` | `NodeExecutableResolver.resolve` (7-arg) | startup-path version gate | ✓ WIRED | Confirmed via 96-05-SUMMARY.md and source read |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TextMate cache seam behaves as specified (cache hit opens zero resources, marker written last, sweep blast radius bounded) | `./gradlew test --tests "*.TextMateBundleCacheTest"` | BUILD SUCCESSFUL | ✓ PASS |
| Node version-gating engine behaves as specified (fall-through, cache-inaccessible distinction, at-most-once version spawn) | `./gradlew test --tests "*.NodeExecutableResolverVersionGatingTest"` | BUILD SUCCESSFUL | ✓ PASS |
| Reason-varying banner seam behaves as specified (null-for-resolved, download action dropped for cache-inaccessible) | `./gradlew test --tests "*.NodePresentationTest"` | BUILD SUCCESSFUL | ✓ PASS |
| Notification base structural guard (single guard call, per-subclass delegation, Status split) | `./gradlew test --tests "*.BbjNotificationProviderBaseSourceGuardTest"` | BUILD SUCCESSFUL | ✓ PASS |
| Missing-Node provider source guard (resolver call shape, presentation seam calls) | `./gradlew test --tests "*.BbjMissingNodeNotificationSourceGuardTest"` | BUILD SUCCESSFUL | ✓ PASS |
| Windows Node.js auto-install end-to-end on real hardware | Hand attestation (96-07) | download passed, LS-start failed | ✗ FAIL (recorded, not re-run — see gaps) |

All five automated spot-checks above were re-run in this verification session (single combined Gradle invocation, not the whole suite) and passed. The whole-suite regression gate (`./gradlew test --rerun-tasks`, 18/18 tasks) was already run by the orchestrator per the task's stated test baseline and is not re-run here.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| PLAT-01 (#613) | 96-02 | TextMate bundle reuse + cleanup | ✓ SATISFIED | Cache seam + sweep verified above |
| PLAT-02 (#621) | 96-01 | Inert Color Scheme page removed | ✓ SATISFIED | Page deleted, docs rewritten, hand-UAT confirmed |
| PLAT-03 (#622) | 96-04 | Four providers share one base | ✓ SATISFIED (recorded deviation) | Base + 4 subclasses verified; D-09/D-10 deviation recorded and hand-verified for the crash banner's `.bbx`/`.bbl` change |
| PLAT-04 (#588) | 96-05/96-06 | Distinguishable Node diagnoses | ✓ SATISFIED | `BELOW_MINIMUM_VERSION`/`CACHE_UNAVAILABLE` + `NodePresentation` verified by unit test and wiring |
| PLAT-05 (todo) | 96-05/96-06 | Configured-but-unusable path consults cache | ✓ SATISFIED | Fall-through proven by `NodeExecutableResolverVersionGatingTest`; banner inherits it via 96-06 wiring |
| PLAT-06 (todo) | 96-03/96-07 | Windows attestation | ✗ BLOCKED | Attestation failed; WINDOWS.md entry 3 open; REQUIREMENTS.md correctly shows Pending |

No orphaned requirements found for this phase — REQUIREMENTS.md's traceability table maps exactly PLAT-01 through PLAT-06 to Phase 96, matching the six plans.

### Anti-Patterns Found

None. Scanned all phase-96-modified production files (`BbjNotificationProviderBase.java`, `TextMateBundleCache.java`, `NodePresentation.java`, `NodeExecutableResolver.java`, `NodeInstallPipeline.java`, `BbjTextMateBundleProvider.java`, `BbjMissingNodeNotificationProvider.java`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers — zero matches. 96-REVIEW.md (standard-depth code review) found 0 critical, 2 warning, 2 info findings; the disposition table shows 2 fixed (test-only, commits `6d9b6a7d`, `d154c08b`), 1 declined with cited reasoning (WR-01, a re-litigated settled design decision, not a defect), 1 deferred by explicit human decision (IN-01, cosmetic wording). No blocker-level findings.

### Human Verification Required

The 96-07 hand attestation covered the Windows attestation itself, the Color Scheme removal, and a subset of the notification-banner changes, but explicitly left four items untested on the real Windows machine ("NOT TESTED (outstanding human verification, carried forward)" in 96-07-SUMMARY.md). These are carried into this verification unresolved:

### 1. Too-old configured Node.js startup rejection on real Windows

**Test:** Configure a Node.js path pointing at a runtime below the minimum supported version; start the IDE with a valid detected or cached Node.js also available.
**Expected:** The language server does not launch on the too-old configured runtime; it falls through and starts on the detected/cached candidate instead.
**Why human:** Requires a running IDE launch sequence on the target OS; the resolver-level decision is unit-tested and passing, but the end-to-end startup behavior was not exercised during the 96-07 session.

### 2. Unwritable Node.js cache directory drops the Download action

**Test:** Make the plugin's `bbj-intellij-data/nodejs` directory unwritable, with no Node.js configured or detected, and open a BBj file.
**Expected:** The missing-Node banner names the cache-directory problem distinctly and does not offer a "Download Node.js" button.
**Why human:** Requires manipulating real filesystem permissions and observing rendered banner UI; not exercised during 96-07.

### 3. Crash banner during indexing

**Test:** Put the server into a crashed state, then trigger a full re-index (e.g. invalidate caches and restart).
**Expected:** The server-crash banner renders while indexing is in progress (dumb mode), not only after indexing completes.
**Why human:** Requires a real indexing pass in a running IDE; the `DumbAware` wiring is structurally verified but the actual dumb-mode rendering was not observed.

### 4. All four banners together, including Phase 95's wrong-peer wording

**Test:** In one session, trigger each of the four banners (missing BBj home, missing/unusable Node, server crashed, java-interop unavailable) and confirm each appears/disappears independently and that the java-interop banner's status-varying (wrong-peer) wording from Phase 95 still renders correctly.
**Expected:** All four banners behave correctly with no cross-interference.
**Why human:** UI rendering across multiple triggering conditions in one session; not run together during 96-07 (individual banners were spot-checked separately).

### Gaps Summary

Five of Phase 96's six requirements (PLAT-01 through PLAT-05) are genuinely and observably complete
in the codebase: the TextMate bundle now reuses a stable, versioned directory with a scoped sweep of
abandoned copies; the inert Color Scheme settings page is deleted and its documentation corrected;
four notification providers (a deliberate superset of the three #622 named) now share one base, with
the crash banner's file-type guard bug fixed as a recorded, hand-verified deviation from the roadmap's
literal "conditions unchanged" wording; and the plugin's two previously-disagreeing Node.js decision
engines are unified into one, with the cache-inaccessible state now distinguishable from "nothing
downloaded" and the configured-but-unusable path proven (by passing unit tests exercising the actual
state transition) to fall through to a cached download.

**PLAT-06 — the Windows attestation — genuinely failed** and is the one gap blocking a clean pass.
This is not a surprise the phase tried to hide: the phase's own plan (96-07, D-15) anticipated this
possibility and built an explicit "record either way" mechanism specifically so a failed attestation
would not hold the phase open a third milestone in a row. The maintainer's hand attestation on real
Windows confirmed the Node.js download half works (`node.exe` + `.sha256` sidecar land correctly) but
the language server does not start afterward; two defects were found and fixed during that same
session (a Node version-floor pin and a version-cache null-poisoning bug), and a further blocker
remains — undiagnosable from `idea.log` today because `BbjLanguageServer`'s Node-path diagnostics use
`java.util.logging.Logger`, which IntelliJ never routes to its log. This is faithfully recorded as
`WINDOWS.md` entry id 3 (open), and `REQUIREMENTS.md` correctly leaves PLAT-06 Pending rather than
Complete. Per this repository's `workflow.windows_enforce` being unset, this open entry does not by
itself block `/gsd-ship`, but it is a real, unresolved, user-visible defect on Windows that a future
debug session must close.

Four additional human-verification items (the too-old-Node startup rejection, the unwritable-cache
banner's dropped Download action, the crash banner during indexing, and the full four-banner sweep)
were declared but not exercised during the 96-07 attestation session and remain outstanding — these
are lower-severity than PLAT-06 (their code-level decision logic is proven by passing unit tests) but
still need a human pass on real hardware before this phase's UAT can be called fully closed.

---

_Verified: 2026-09-20_
_Verifier: Claude (gsd-verifier)_
