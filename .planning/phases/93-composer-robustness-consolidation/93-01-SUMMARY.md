---
phase: 93-composer-robustness-consolidation
plan: 01
subsystem: ui
tags: [intellij, swing, composer, java, source-guard]

# Dependency graph
requires: []
provides:
  - "ComposerSwingHelpers — the one home for the composer's shared Swing rendering helpers (labeled, errorForeground, errorLabel, labeledWithError, setEnabledRecursive, clip, previewUnavailable)"
  - "Theme-aware error colour (NamedColorUtil.getErrorForeground()) replacing every dialog's hardcoded new Color(0xC0392B)"
  - "A stalled preview rendered in the error colour instead of default gray"
affects: [93-06 (addWindow-family base absorbs ComposerSwingHelpers.labeledWithError/setEnabledRecursive call sites), 93-04, 93-05, 93-07, 93-08]

actuals:
  tokens: 15152
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Shared Swing rendering helpers extracted into one final utility class (ComposerSwingHelpers) with package-private static methods and a private constructor, mirroring the BbjRunActionBase base+shared-method precedent"
    - "Theme-aware color via NamedColorUtil.getErrorForeground() instead of a hardcoded RGB Color literal"
    - "Each dialog captures its preview-target's default foreground once at construction time (inside createCenterPanel, mirroring CvsComposerDialog's existing charsFieldDefaultForeground pattern) and restores it in apply() so a cleared error does not leave the label permanently red"
    - "Source guards use extractMethodBody (brace-balanced) to pin a literal inside a shared method's body rather than per-file, plus a delegation-pin count per call site — the BbjRunActionBase/EmTokenTrustWindowSourceGuardTest pattern applied to a new shared home"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerSwingHelpers.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerSwingHelpersSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/WindowSchematicPanel.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ChildWindowSchematicPanel.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java

key-decisions:
  - "NamedColorUtil.getErrorForeground() resolves against the 2024.2 platform this module compiles against (confirmed directly against app-client.jar in the Gradle cache before writing the code), so the JBColor.namedColor fallback the plan allowed for was not needed."
  - "clip() was reconciled to MsgboxSchematicPanel's cached-FontMetrics variant — a deliberate pick between two behaviourally identical copies, not an accident of which file an extraction tool kept first — noted in the shared method's javadoc."
  - "errorLabel()'s import style was normalised to the plain UIUtil.ComponentStyle.SMALL form (already imported by three of the five dialogs) rather than the fully-qualified com.intellij.util.ui.UIUtil form the addWindow-family two carried."
  - "setOKActionEnabled(false) stays in each dialog's own previewUnavailable(String) wrapper rather than moving into the shared helper, per the plan's explicit prohibition — the shared helper owns text and colour only, preserving the exactly-three setOKActionEnabled(false) count per dialog that ComposerDialogRefreshSourceGuardTest pins."

patterns-established:
  - "Composer Swing rendering helpers (layout, colour, text-clip, stalled-preview labeling) live in ComposerSwingHelpers; a fix to any of those shapes is written once."
  - "A dialog's preview-target default foreground is captured once in createCenterPanel and restored in apply() whenever the target's foreground may have been overridden by a stalled-preview error colour."

requirements-completed: [COMP-07]

coverage:
  - id: D1
    description: "labeled(), errorLabel(), labeledWithError(), setEnabledRecursive(), clip() and the unavailable-preview label each have exactly one definition in ComposerSwingHelpers.java, reached by all six dialogs and three schematic panels"
    requirement: "COMP-07"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerSwingHelpersSourceGuardTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java#eachDialogLabelsAFailureOnAFailedPreviewExactlyOnce"
        status: pass
      - kind: unit
        ref: "cd bbj-intellij && ./gradlew test (886 tests, 0 failures)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Error text renders in a theme-aware red (Light and Darcula), and a stalled preview renders in that same red instead of default gray — both are intended visual changes, not no-observable-delta"
    requirement: "COMP-07"
    verification: []
    human_judgment: true
    rationale: "Colour rendering across the Light and Darcula IntelliJ themes cannot be verified by a headless JUnit test (no live IntelliJ UI test coverage exists in this project, per the standing v4.4 verification pattern) — requires a human to open both dialogs in each theme and confirm the red is visually correct."

duration: ~25min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 01: Composer Swing Helper Consolidation Summary

**Consolidated `labeled`, `errorLabel`, `labeledWithError`, `setEnabledRecursive`, `clip`, and `previewUnavailable` from up to six duplicated per-dialog/per-panel copies into one `ComposerSwingHelpers` class, replacing every hardcoded error-red `Color(0xC0392B)` with the theme-aware `NamedColorUtil.getErrorForeground()`.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-18T09:01:24Z
- **Tasks:** 3
- **Files modified:** 12 (1 created, 1 test file created, 10 modified)

## Accomplishments

- Created `ComposerSwingHelpers` as the single home for six previously-duplicated Swing rendering helper shapes: `labeled` (was 6 copies), `errorLabel` (5), `labeledWithError` (2), `setEnabledRecursive` (2), `clip` (3), and the unavailable-preview label (6).
- Replaced every dialog's hardcoded `new Color(0xC0392B)` with `NamedColorUtil.getErrorForeground()`, a theme-aware lookup verified to resolve against the 2024.2 IntelliJ platform this module compiles against — error text and a stalled preview both now render correctly in Darcula as well as Light.
- Reconciled the two "behaviourally identical but not textually identical" duplicate families deliberately: `clip()` kept `MsgboxSchematicPanel`'s cached-`FontMetrics` variant; `errorLabel()`'s import style normalised to the plain `UIUtil` form.
- Preserved the OK-gating discipline: `setOKActionEnabled(false)` stays in each dialog's own `previewUnavailable(String)` wrapper (never moved into the shared helper), keeping the exactly-three-per-dialog count `ComposerDialogRefreshSourceGuardTest` pins.
- Each dialog now captures its preview-target's default foreground at construction and restores it in `apply()`, so a cleared stalled-preview error does not leave the label permanently red.

## Task Commits

1. **Task 1: Shared Swing home carrying one helper across all six dialogs** - `6f4a5d42` (feat)
2. **Task 2: Theme-aware error label, plus the error-row and enablement helpers** - `a90edf35` (feat)
3. **Task 3: Shared clip and unavailable-preview label, with the refresh guard re-pointed** - `326f8f10` (feat)

_No separate plan-metadata commit; this SUMMARY and STATE.md updates are committed together per the final_commit step._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerSwingHelpers.java` - new shared home; `labeled`, `errorForeground`, `errorLabel`, `labeledWithError`, `setEnabledRecursive`, `clip`, and both `previewUnavailable` overloads
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` - removed private `labeled`/`errorLabel`; delegates to shared home; captures/restores `summary`'s default foreground
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` - removed private `labeled`/`errorLabel`/`labeledWithError`/`setEnabledRecursive`; delegates to shared home; captures/restores `flagsSummary`'s default foreground
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java` - same consolidation as AddWindowComposerDialog
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java` - removed private `labeled`/`errorLabel`; delegates to shared home; captures/restores `summary`'s default foreground
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java` - removed private `labeled`; delegates to shared home; captures/restores `blockPreview`'s default foreground (the one `JBTextArea` target)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java` - removed private `labeled`/`errorLabel`; delegates to shared home; captures/restores `summary`'s default foreground
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java` - removed private `clip`; calls `ComposerSwingHelpers.clip(...)`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/WindowSchematicPanel.java` - same
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ChildWindowSchematicPanel.java` - same
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerSwingHelpersSourceGuardTest.java` - new guard; own private `extractMethodBody`/`countOccurrences`/`withoutCommentLines`/`readSource` copies; pins each shared helper to exactly one declaration, zero private duplicates, and a delegation pin per call site
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java` - re-pointed `eachDialogLabelsAFailureOnAFailedPreviewExactlyOnce` to assert the "Preview unavailable — " prefix inside the shared home's `previewUnavailableText(` body plus a per-dialog `ComposerSwingHelpers.previewUnavailable(` delegation pin; every other test in the class left untouched

## Decisions Made

- Confirmed `NamedColorUtil.getErrorForeground()` resolves against the pinned 2024.2 platform (checked directly against the platform's `app-client.jar` before writing code) — no `JBColor.namedColor` fallback needed.
- `clip()` reconciled to the cached-`FontMetrics` variant deliberately, documented in the shared method's javadoc so a later reader does not mistake the pick for an accident.
- `errorLabel()`'s import style normalised to the plain `UIUtil` form already used by three of the five original copies.
- `setOKActionEnabled(false)` deliberately stays local to each dialog's `previewUnavailable(String)` wrapper — the shared helper only owns text and colour, per the plan's explicit prohibition on moving OK-gating into the shared home.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- First pass at re-pointing `ComposerDialogRefreshSourceGuardTest`'s prefix assertion failed because `previewUnavailableText(String)`'s body referenced a separate `private static final String` constant rather than the literal directly, so the brace-balanced `extractMethodBody` extraction did not see the literal text inside the method body. Fixed by inlining the prefix literal directly into `previewUnavailableText`'s return statement (Rule 1 — bug in my own draft, fixed before commit, not carried into any committed state).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ComposerSwingHelpers` is in place as the shared Swing helper home other 93-xx plans can build on (93-06's addWindow-family base will consume `ComposerSwingHelpers.labeledWithError`/`setEnabledRecursive` call sites it inherits from `AddWindowComposerDialog`/`AddChildWindowComposerDialog`).
- The two deliberate visual changes (theme-aware error red; stalled preview now red instead of gray) must be reported at UAT as intended deltas in both Light and Darcula, never as no-observable-delta, per the plan's `<verification>` section.
- Full IntelliJ JUnit suite green: 886 tests, 0 failures, 0 errors.

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*

## Self-Check: PASSED

- FOUND: `.planning/phases/93-composer-robustness-consolidation/93-01-SUMMARY.md`
- FOUND: commit `6f4a5d42` (Task 1)
- FOUND: commit `a90edf35` (Task 2)
- FOUND: commit `326f8f10` (Task 3)
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerSwingHelpers.java`
