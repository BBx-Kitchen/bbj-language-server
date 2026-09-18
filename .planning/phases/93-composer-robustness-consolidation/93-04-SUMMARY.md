---
phase: 93-composer-robustness-consolidation
plan: 04
subsystem: ide-intellij
tags: [intellij-plugin, intention-action, composer, java, source-guard]

# Dependency graph
requires:
  - phase: 93
    provides: "93-03's ComposerEditRanges/MALFORMED_EDIT range guards on ComposerLauncher (read but not modified by this plan)"
provides:
  - "ComposerIntentionBase abstract class carrying getFamilyName, startInWriteAction, invoke and generatePreview exactly once"
  - "All five Configure*Intention classes converted to thin no-arg subclasses"
  - "ComposerIntentionBaseSourceGuardTest pinning the base's structural shape"
  - "ComposerIntentionPreviewSourceGuardTest re-pointed to the base+subclass shape"
affects: ["93-07 (analogous BbjComposeActionBase consolidation for the six launch actions, per D-06)"]

actuals:
  tokens: 9568
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "abstract-base-plus-thin-no-arg-subclasses for a platform extension point that instantiates via a no-arg constructor and gives the instance no way to learn its own registration identity"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerIntentionBase.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionBaseSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java

key-decisions:
  - "Shipped as abstract base + 5 thin no-arg subclasses (platform-forced, not the issue's literal 'single data-driven registration' wording) -- IntelliJ's <intentionAction> extension point accepts only <className>, instantiates via a no-arg constructor, and gives the instance no way to learn which registration produced it, so one class registered five times cannot vary its text, Kind or keyword. Record this reasoning when closing the underlying issue: close as done, not as partially implemented."
  - "getText() and isAvailable(...) deliberately NOT declared on the base -- every subclass supplies its own, so a future sixth intention that forgets one fails to compile rather than silently inheriting the wrong text or availability gate."
  - "kind() and previewHtml() are the only two abstract hooks; both are one-line declarations ending in ';' with no body, per the abstract-declaration source-guard edge case already established in this repo."

patterns-established:
  - "For future consolidations of a class that a platform extension point instantiates by no-arg constructor (see the sibling BbjComposeActionBase work), the same shape applies: identical members final on the base, differing members as abstract hooks the base calls, getText()-equivalent left undeclared so a forgotten override is a compile error."

requirements-completed: [COMP-08]

coverage:
  - id: D1
    description: "ComposerIntentionBase carries getFamilyName, startInWriteAction, invoke and the single IntentionPreviewInfo.Html construction exactly once across the source tree"
    requirement: COMP-08
    verification:
      - kind: unit
        ref: "ComposerIntentionBaseSourceGuardTest#generatePreviewBodyConstructsExactlyOneHtmlPreviewFromPreviewHtml"
        status: pass
      - kind: unit
        ref: "ComposerIntentionBaseSourceGuardTest#invokeBodyDelegatesToLaunchWithKindExactlyOnceBehindANullEditorGuard"
        status: pass
      - kind: unit
        ref: "ComposerIntentionBaseSourceGuardTest#getFamilyNameBodyReturnsTheSharedLiteralExactlyOnce"
        status: pass
      - kind: unit
        ref: "ComposerIntentionPreviewSourceGuardTest#everyIntentionReturnsExactlyOneHtmlPreview"
        status: pass
    human_judgment: false
  - id: D2
    description: "All five Configure*Intention class names, plugin.xml registrations and intentionDescriptions/ directories are unchanged"
    requirement: COMP-08
    verification:
      - kind: unit
        ref: "IntentionDescriptionResourcesTest (unmodified, all 5 subjects)"
        status: pass
      - kind: unit
        ref: "ComposerIntentionPreviewSourceGuardTest#pluginXmlRegistersAllFiveIntentionsExactlyOnce (byte-identical to pre-plan form)"
        status: pass
      - kind: unit
        ref: "ComposerIntentionBaseSourceGuardTest#pluginXmlNeverRegistersTheBaseDirectly"
        status: pass
    human_judgment: false
  - id: D3
    description: "Popup preview HTML is byte-identical to what each intention produced before consolidation"
    requirement: COMP-08
    verification:
      - kind: other
        ref: "git diff over the five intention files -- confirmed no character-level change to any <p>-wrapped literal (verified manually during Task 2)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Availability stays a per-subclass predicate: ConfigureSetoptsInCodeIntention keeps isCaretOnSetoptsInCode(editor); the other four keep isCaretOnCall(editor, keyword)"
    requirement: COMP-08
    verification:
      - kind: unit
        ref: "ComposerIntentionPreviewSourceGuardTest#invokeAndIsAvailableAreUndisturbedOnEveryIntention"
        status: pass
    human_judgment: false
  - id: D5
    description: "Whole IntelliJ JUnit suite green after the consolidation (912 tests, 0 failures)"
    verification:
      - kind: unit
        ref: "./gradlew test (912 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 04: Composer Intention Consolidation Summary

**Five `Configure*Intention` classes now share one `ComposerIntentionBase` for family name, write-action policy, launch call and preview construction, converted to thin no-arg subclasses with byte-identical popup output.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-18T09:21:00Z (approx, from prior plan's session timestamp)
- **Completed:** 2026-09-18T09:25:44Z
- **Tasks:** 3
- **Files modified:** 8 (1 created + 5 modified in main, 1 created + 1 modified in test)

## Accomplishments
- Created `ComposerIntentionBase`, an abstract `IntentionAction` implementation carrying `getFamilyName()`, `startInWriteAction()`, `invoke(...)` and `generatePreview(...)` exactly once, with two one-line abstract hooks (`kind()`, `previewHtml()`)
- Converted all five `Configure*Intention` classes (`Cvs`, `Msgbox`, `AddWindow`, `AddChildWindow`, `SetoptsInCode`) to thin subclasses supplying only `getText()`, `isAvailable(...)`, `kind()` and `previewHtml()`
- Added `ComposerIntentionBaseSourceGuardTest` (8 tests) pinning the base's structural shape, its abstract-declaration bodies, per-subclass delegation, and that `plugin.xml` never names the base directly
- Re-pointed `ComposerIntentionPreviewSourceGuardTest` from five per-file counts to base-extracted-method-body assertions plus per-subclass delegation pins, following the `EmTokenTrustWindowSourceGuardTest`/`OffEdtDispatchSourceGuardTest` precedent
- Whole IntelliJ suite: 912 tests, 0 failures, 0 errors (up from the 904-test baseline by the 8 new guard tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Abstract intention base carrying one intention end-to-end** - `07c956e2` (feat)
2. **Task 2: Convert the remaining four intentions to thin subclasses** - `1b469734` (feat)
3. **Task 3: New base guard and re-pointed preview guard** - `9fd6a20b` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerIntentionBase.java` - new abstract base; family name, write-action policy, launch call, preview construction
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java` - thin subclass (reference shape converted in Task 1)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java` - thin subclass
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java` - thin subclass
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java` - thin subclass
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java` - thin subclass; keeps its own three-keyword `isCaretOnSetoptsInCode(editor)` gate
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionBaseSourceGuardTest.java` - new guard for the base's structural shape (8 tests)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java` - re-pointed to base+subclass assertions

## Decisions Made

- **Base-plus-subclasses shape, not a single data-driven registration.** This is a deliberate, platform-forced deviation from the underlying issue's proposed wording. IntelliJ's `<intentionAction>` extension point accepts only `<className>` and instantiates via a no-arg constructor with no way for the instance to learn which registration produced it, so one class registered five times could not vary its text, `Kind` or keyword. **When closing the underlying issue (#618), close it as done with this reasoning attached, not as partially implemented.** This same shape is the intended model for the analogous six-action consolidation in a later plan of this phase.
- `getText()` and `isAvailable(...)` were deliberately left undeclared on the base (not even as abstract hooks with a default): every subclass supplies its own concrete override directly from the `IntentionAction` interface, so a future sixth intention that forgets one fails to compile rather than silently inheriting an incorrect default.
- `kind()` and `previewHtml()` are the two abstract hooks, each a one-line `;`-terminated declaration with no body — matching the existing abstract-declaration source-guard edge case pattern already used elsewhere in this repo, so the new guard's "no assertion inside an abstract declaration" test has a clean shape to pin.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' acceptance criteria were verified via `grep`/diff before each commit: `git diff` confirmed byte-identical `<p>`-wrapped preview literals across all five intentions after Task 2, and `plugin.xml` was untouched throughout (`git diff --name-only` returned nothing for it).

## Issues Encountered

None. Task 1's verification intentionally showed 3 failing assertions in `ComposerIntentionPreviewSourceGuardTest` (per-file counts against the not-yet-converted `ConfigureCvsIntention`) exactly as the plan's `<fails_when>` anticipated; `IntentionDescriptionResourcesTest` passed (5/5) at that point, confirming no class name or description directory had moved.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ComposerIntentionBase` is the structural model plan 93-07 must mirror for the six `BbjCompose*Action` launch actions (per D-06): identical members `final` on the base, an abstract `Kind`-supplying hook, `getText()`/`isAvailable()`-equivalent members left undeclared so an omission is a compile error, and abstract declarations kept to one `;`-terminated line so a source guard can pin "no body" cleanly.
- COMP-08 is fully satisfied and marked complete in REQUIREMENTS.md. COMP-04 remains Pending — untouched by this plan, owned by a later plan in this phase.
- Whole IntelliJ suite is green (912/912) with the new 8-test guard included in that count.

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*

## Self-Check: PASSED

All created/modified files verified present on disk; all three task commit hashes (`07c956e2`, `1b469734`, `9fd6a20b`) verified present in `git log`.
