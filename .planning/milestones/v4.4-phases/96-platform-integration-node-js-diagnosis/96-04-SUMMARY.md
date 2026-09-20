---
phase: 96-platform-integration-node-js-diagnosis
plan: 04
subsystem: intellij-platform-integration
tags: [intellij, editor-notification-provider, dumb-aware, file-type-guard, consolidation]

requires:
  - phase: 95-java-interop-status-accuracy-widget-consolidation
    provides: InteropStatusPresentation.bannerText(status) status-varying banner text, which this base must absorb without flattening
provides:
  - "BbjNotificationProviderBase: abstract base owning the resolved-file-type guard and fileEditor-arg panel construction for all four editor notification providers"
  - "BbjFileVisibility.isBbjProgramFileTypeName widened to public, shared across widgets and banners"
  - "Fixed server-crash banner guard: resolved file type instead of file extension"
affects: [96-05, 96-06, 96-07]

actuals:
  tokens: 8500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Abstract base + thin subclasses over a single sequencing method, mirroring BbjStatusBarWidgetBase (Phase 95)"
    - "Resolved-file-type guard (file.getFileType().getName()) as the sole visibility predicate, never file extension"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNotificationProviderBase.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNotificationProviderBaseSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingHomeNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java

key-decisions:
  - "Base class placed in com.basis.bbj.intellij (not ui or lsp) so it is a cross-package caller of BbjFileVisibility, and no provider had to move (D-11)."
  - "Base covers all four registered providers, not the three #622 named; the crash provider's extension guard is replaced by the resolved-file-type guard, overriding ROADMAP criterion 3's 'conditions unchanged' clause with recorded reasoning (D-09)."
  - "Status stays a per-subclass value at the panel-construction call site, never a base field; the crash banner keeps Error, the other three keep Warning (D-10)."
  - "#622 closes as done on cited reasoning -- four providers consolidated where the issue named three (D-12)."

requirements-completed: [PLAT-03]

coverage:
  - id: D1
    description: "All four registered editor notification providers extend BbjNotificationProviderBase, which owns the single resolved-file-type guard and fileEditor-arg panel factory"
    requirement: PLAT-03
    verification:
      - kind: unit
        ref: "BbjNotificationProviderBaseSourceGuardTest#baseCollectNotificationDataDelegatesToTheSharedPredicateExactlyOnce"
        status: pass
      - kind: unit
        ref: "BbjNotificationProviderBaseSourceGuardTest#subclassCarriesADelegationPinAndDeclaresNoOwnCollectNotificationData"
        status: pass
      - kind: unit
        ref: "BbjNotificationProviderBaseSourceGuardTest#providerSourceNeverReDerivesVisibilityByExtension"
        status: pass
      - kind: unit
        ref: "BbjNotificationProviderBaseSourceGuardTest#crashSubclassUsesErrorStatusAndTheOtherThreeUseWarning"
        status: pass
    human_judgment: false
  - id: D2
    description: "The server-crash banner now appears on .bbx programs, no longer appears on .bbl files, and now appears during indexing -- three intended, user-visible behaviour changes"
    requirement: PLAT-03
    verification: []
    human_judgment: true
    rationale: "Observable UI behaviour on real .bbx/.bbl files and during indexing requires a running IDE; harvested at end-of-phase UAT per human_verify_mode=end-of-phase."
  - id: D3
    description: "Per-provider content preserved through the consolidation: home provider's auto-detection fallback, node provider's decision call and three actions, java-interop provider's isFirstCheckCompleted() guard and status-varying InteropStatusPresentation.bannerText() sentence (Phase 95's wrong-peer wording)"
    requirement: PLAT-03
    verification:
      - kind: unit
        ref: "grep-based acceptance criteria (detectBbjHome, three action-label literals, bannerText(/isFirstCheckCompleted() counts) run during execution"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 04: Notification Provider Base Consolidation Summary

**Four IntelliJ editor notification providers now share one base (`BbjNotificationProviderBase`) that owns the resolved-file-type guard, closing the crash banner's `.bbl`/`.bbx` extension-matching bug that #622 didn't even name as a target.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-20T02:00:33Z (approx, continuing from prior plan's session)
- **Completed:** 2026-09-20T02:07:26Z
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments

- Created `BbjNotificationProviderBase` in `com.basis.bbj.intellij` — an abstract class implementing `EditorNotificationProvider` and `DumbAware`, with one `final collectNotificationData` sequencing method delegating to an abstract `buildPanel(Project, VirtualFile)` hook, plus a shared `newPanel(FileEditor, Status, text)` factory.
- Widened `BbjFileVisibility.isBbjProgramFileTypeName` from package-private to `public static`, with a javadoc sentence recording the new cross-package caller, following the existing `showsForFileTypeNames` precedent in the same file.
- Fixed `BbjServerCrashNotificationProvider`'s file-extension guard (`bbj|bbl|bbjt|src`) by deleting it entirely — the base's resolved-file-type guard supersedes it. Also normalized this provider's other two divergences: it is now `DumbAware`, and it constructs its panel through the `fileEditor`-arg factory instead of the bare `Status`-only constructor.
- Converted the other three providers (`BbjMissingHomeNotificationProvider`, `BbjMissingNodeNotificationProvider`, `BbjJavaInteropNotificationProvider`) to thin subclasses of the base, dropping their `file.getFileType() != BbjFileType.INSTANCE` guards and unused `EditorNotificationProvider`/`DumbAware` imports, while leaving every per-provider decision (home's auto-detection fallback, node's decision call and three actions, interop's `isFirstCheckCompleted()` guard and status-varying banner text) untouched.
- Added `BbjNotificationProviderBaseSourceGuardTest`, pinning the single guard call inside the base's own method body, a delegation pin per subclass, a full five-file negative sweep for `getExtension(`/`"bbl"`, and the Error/Warning per-subclass Status split.
- Re-pointed `BbjMissingNodeNotificationSourceGuardTest`'s body-slice declaration marker from the retired `collectNotificationData(@NotNull Project project, @NotNull VirtualFile file)` to the new `buildPanel(@NotNull Project project, @NotNull VirtualFile file)`, leaving all six tests' assertions unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: One provider through the new base -- the crash banner's guard is fixed end to end** - `38a7260a` (fix)
2. **Task 2: The other three providers become thin subclasses without changing what they say** - `7245fb41` (refactor)
3. **Task 3: Pin the single guard call structurally and re-point the guard the extraction invalidated** - `11d4c30b` (test)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNotificationProviderBase.java` - new abstract base; owns the single guard and panel factory
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` - `isBbjProgramFileTypeName` widened to `public static`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` - thin subclass; extension guard deleted, now `DumbAware`, `fileEditor`-arg panel
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingHomeNotificationProvider.java` - thin subclass; own guard removed
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` - thin subclass; own guard removed, decision call unchanged
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java` - thin subclass; own guard removed, status-varying banner text preserved
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNotificationProviderBaseSourceGuardTest.java` - new structural guard for the consolidated base
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java` - body-slice marker re-pointed to `buildPanel(...)`

## Decisions Made

- **Base package and class name:** `BbjNotificationProviderBase` in `com.basis.bbj.intellij` (not `ui` as `96-PATTERNS.md` sketched, not `lsp` as `96-RESEARCH.md` sketched). D-11 requires the base to be a cross-package caller of `BbjFileVisibility` (which lives in `com.basis.bbj.intellij.ui`), and three of the four subclasses already live in `com.basis.bbj.intellij`, so placing the base there means no provider has to move and `plugin.xml` needs no registration edit.
- **Hook name:** `buildPanel(Project, VirtualFile)` — the abstract method every subclass overrides in place of the old `collectNotificationData`. Contract: the file-type guard has already passed; returning `null` means "no banner".
- **`BbjMissingNodeNotificationSourceGuardTest` re-point:** the two body-slicing tests now slice on the exact declaration marker `buildPanel(@NotNull Project project, @NotNull VirtualFile file)`, replacing the retired `collectNotificationData(@NotNull Project project, @NotNull VirtualFile file)`. Every assertion inside those tests is otherwise unchanged, since the node provider's decision call is untouched by this plan (a later plan in this phase rewrites it).
- **#622 close-out reasoning (D-12):** #622 is closable as done — four providers consolidated onto one base where the issue named only three — following the Phase 93/94/95 precedent of closing on cited reasoning rather than as partially implemented.

## Deviations from Plan

None - plan executed exactly as written. Two planning-identifier references (`D-09/D-11`, `D-10`) that were initially drafted into javadoc comments during Task 1's authoring were caught and stripped during Task 3's mandated register-check grep, before any of that code reached a final commit boundary outside this plan's own history — recorded here for transparency, not tracked as a numbered deviation since the plan's own Task 3 step explicitly required and performed this check.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Intended Observable Changes (declare at UAT)

This plan deliberately changes user-visible plugin behaviour, per D-09 and D-10. These are **not** regressions and must be confirmed, not dismissed, when the phase's UAT covers all four banners:

1. **The server-crash banner now appears on `.bbx` programs.** It previously guarded by a hard-coded extension list (`bbj|bbl|bbjt|src`) that did not include `bbx`, so genuine `.bbx` BBj programs never saw a crash banner even though the language server had, in fact, crashed.
2. **The server-crash banner no longer appears on `.bbl` files.** `.bbl` files carry no BBj file type (excluded since v3.4), so the old extension-based guard was firing on files the resolved-file-type guard correctly excludes.
3. **The server-crash banner now appears during indexing (dumb mode).** All four providers are now `DumbAware` through the shared base; this is safe because the crash check (`BbjServerService.isServerCrashed()`) is a plain field read that touches no index.

## Next Phase Readiness

- `BbjNotificationProviderBase` is in place and ready for **96-05/96-06**, which are the plans that rewrite the missing-Node banner's decision call (`NodeAvailability.decide` → `NodeExecutableResolver.resolve`) and its presentation seam. This plan deliberately left `BbjMissingNodeNotificationProvider`'s decision call and `BbjMissingNodeNotificationSourceGuardTest`'s six assertions untouched so that change is written once, not twice.
- **Cross-plan note:** 96-06 will edit `BbjMissingNodeNotificationProvider.java` and `BbjMissingNodeNotificationSourceGuardTest.java` again — both are left in a clean, consolidated, green state for that plan to build on.
- No blockers. Whole IntelliJ JUnit suite green under `./gradlew test --rerun-tasks`.

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*
