---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 10
subsystem: composer
tags: [intellij, cvs, intention, action, composer, discoverability]

# Dependency graph
requires:
  - phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
    provides: "plan 89-08's ComposerLauncher.Kind.CVS / openCvs (guarded edit-in-place, not-editable reason, compose-new)"
provides:
  - "ConfigureCvsIntention -- Alt+Enter lightbulb entry into the CVS() composer, with shipped intentionDescriptions/ resources"
  - "BbjComposeCvsAction -- editor context-menu entry (bbj.composeCvs) into the same composer"
  - "ComposerIntentionPreviewSourceGuardTest widened to five intentions; new BbjComposeCvsActionSourceGuardTest"
affects: [89-13-full-uat-and-verification]

# Actuals (#2632)
actuals:
  tokens: 4700
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A fifth composer intention/action pair follows the exact ConfigureMsgboxIntention/BbjComposeMsgboxAction shape: caret-line heuristic gate with no LSP round trip on isAvailable, ComposerLauncher.launch delegation on invoke/actionPerformed, and its own intentionDescriptions/ resource tree so the lightbulb preview cannot throw"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/description.html
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/before.bbj.template
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/after.bbj.template
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeCvsActionSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java

key-decisions:
  - "ConfigureCvsIntention's isAvailable uses the existing ComposerLauncher.isCaretOnCall(editor, \"cvs(\") heuristic unchanged -- CVS() needs no SETOPTS-style multi-keyword or trailing-boundary widening since the keyword already ends in a literal '(' and gets a trailing boundary for free."
  - "BbjComposeCvsActionSourceGuardTest's no-Java-parsing assertion checks for both Pattern.compile( and Integer.parseInt(, mirroring the sibling SETOPTS-in-code guard's intent (the decode is always the server's cvsDecodeCall, never a Java-side mask parse) even though CVS has no comma/bracket-shape complexity of its own to forbid."

patterns-established:
  - "A new composer intention added to ComposerIntentionPreviewSourceGuardTest's INTENTION_SOURCES array also needs the count-based pluginXmlRegistersAllNIntentionsExactlyOnce test's literal N and its own fully-qualified-classname assertion bumped in the same task -- both were previously named/counted for four intentions."

requirements-completed: [DISC-03]

coverage:
  - id: D1
    description: "With the caret on a CVS( call, Alt+Enter offers Configure CVS() options... and opens the composer through ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS); the intention ships intentionDescriptions/ConfigureCvsIntention/ with a non-blank description.html and before/after templates, returns exactly one HTML preview, and never starts in a write action"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "IntentionDescriptionResourcesTest (derives its subject list from plugin.xml, covers ConfigureCvsIntention automatically)"
        status: pass
      - kind: unit
        ref: "ComposerIntentionPreviewSourceGuardTest (five intentions: no IntentionPreviewInfo.EMPTY, exactly one new IntentionPreviewInfo.Html(, startInWriteAction returns false, ComposerLauncher.launch delegation, plugin.xml registers all five exactly once)"
        status: pass
    human_judgment: true
    rationale: "The lightbulb popup rendering without exception, and the actual Alt+Enter/context-menu reachability in a running IntelliJ IDE, are deferred to plan 89-13's end-of-phase human checks, per this plan's own acceptance criteria wording (\"renders without an exception\")."
  - id: D2
    description: "The editor context menu offers Compose CVS()... (bbj.composeCvs, same id as the VS Code command) reaching ComposerLauncher.Kind.CVS, with no keyboard shortcut"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "BbjComposeCvsActionSourceGuardTest (launch call exactly once, setEnabledAndVisible exactly once and no setEnabled(, ActionUpdateThread.BGT, no Pattern.compile(/Integer.parseInt(, plugin.xml element slice: EditorPopupMenu group, no keyboard-shortcut)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The lightbulb check stays a synchronous caret-line text heuristic with no LSP round trip; editability is always decided by the server's decodeCall, never Java-side CVS parsing"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "ComposerIntentionPreviewSourceGuardTest.invokeAndIsAvailableAreUndisturbedOnEveryIntention (ComposerLauncher.isCaretOnCall(editor, exactly once for CVS) and BbjComposeCvsActionSourceGuardTest's Pattern.compile(/Integer.parseInt( absence checks"
        status: pass
    human_judgment: false
  - id: D4
    description: "The full IntelliJ test suite stays green after both changes, and no plan/decision/threat id leaked into the new or edited source/test/resource comments"
    verification:
      - kind: unit
        ref: "./gradlew test --offline (green, no regressions)"
        status: pass
      - kind: other
        ref: "register check: git diff b7e708dc~1..HEAD -- bbj-intellij/src, zero matches for the banned id regex"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 10: IntelliJ CVS() Composer Discoverability (Alt+Enter + Context Menu) Summary

**`ConfigureCvsIntention` gives IntelliJ users an Alt+Enter lightbulb into the CVS() composer with its own shipped description resources, and `BbjComposeCvsAction` adds a matching editor context-menu door — both calling the exact same `ComposerLauncher.Kind.CVS` the plan 89-08 dialog already implements, with the server's decode staying the sole authority on editability.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments
- `ConfigureCvsIntention` (#649): text `Configure CVS() options…`, family `BBj visual composer`; `isAvailable` gates on the existing synchronous `ComposerLauncher.isCaretOnCall(editor, "cvs(")` heuristic (no LSP round trip); `invoke` delegates to `ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS)`; `startInWriteAction()` returns `false`; `generatePreview` returns one `IntentionPreviewInfo.Html`. Registered in `plugin.xml` right after `ConfigureSetoptsInCodeIntention`.
- `intentionDescriptions/ConfigureCvsIntention/` ships `description.html` (with the `<!-- tooltip end -->` marker, explaining mask/chars pre-fill, verbatim string handling, the non-editable-mask case, and the language-server requirement), `before.bbj.template` (`trimmed$ = cvs("  name  ", 3)`) and `after.bbj.template` (`trimmed$ = cvs("  name  ", 7)`).
- `BbjComposeCvsAction` (#649): `AnAction` id `bbj.composeCvs`, text `Compose CVS()…`, in `EditorPopupMenu` with no keyboard shortcut; `actionPerformed` resolves project/editor and calls `ComposerLauncher.launch(..., Kind.CVS)`; `update` calls `setEnabledAndVisible` once; `getActionUpdateThread()` returns `BGT`.
- `ComposerIntentionPreviewSourceGuardTest` extended to a fifth intention (`ConfigureCvsIntention.java` added to `INTENTION_SOURCES`), and `pluginXmlStillRegistersAllFourIntentionsUntouched` renamed to `pluginXmlRegistersAllFiveIntentionsExactlyOnce`, asserting exactly five `<intentionAction>` elements and one occurrence of each of the five fully-qualified class names — every prior assertion in the class kept unchanged.
- New `BbjComposeCvsActionSourceGuardTest` pins: `ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS)` appears exactly once; `setEnabledAndVisible(` exactly once and `setEnabled(` never; `ActionUpdateThread.BGT` present; no `Pattern.compile(`/`Integer.parseInt(` (no Java-side mask parsing); and the `bbj.composeCvs` plugin.xml element slice names `BbjComposeCvsAction`, sits in `EditorPopupMenu`, and has no `keyboard-shortcut`.

## Task Commits

1. **Task 1: Alt+Enter on a CVS( call opens the CVS() composer, with description resources shipped** — `b7e708dc` (feat)
2. **Task 2: Editor context-menu entry for the CVS() composer, and source guards over both entry points** — `63a41755` (feat)

_Task 1 is `type="tracer"`; its own `<verify>` (`IntentionDescriptionResourcesTest` + `compileJava`) was re-run at commit time under the auto-mode tracer feedback gate and passed before Task 2 (an independent expansion — the context-menu door and its guards) began._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java` — New Alt+Enter intention for the CVS() composer
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/description.html` — Intention description resource
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/before.bbj.template` — Before-sample for Settings › Editor › Intentions
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/after.bbj.template` — After-sample for Settings › Editor › Intentions
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java` — New editor context-menu action (`bbj.composeCvs`)
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — Registers `ConfigureCvsIntention` and `bbj.composeCvs`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java` — Widened to five intentions, renamed plugin.xml-count test
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeCvsActionSourceGuardTest.java` — New source guard for the CVS context-menu action

## Decisions Made
- `ConfigureCvsIntention`'s `isAvailable` reuses `ComposerLauncher.isCaretOnCall(editor, "cvs(")` unmodified — the keyword already ends in a literal `(`, which gives the trailing-boundary protection `isCaretOnCall` documents for free, so no SETOPTS-style multi-keyword widening was needed.
- `BbjComposeCvsActionSourceGuardTest`'s no-parsing assertion checks both `Pattern.compile(` and `Integer.parseInt(`, matching the sibling SETOPTS-in-code guard's intent that the decode is always the server's job, even though CVS's action body has no comma/bracket-shape complexity of its own that would tempt a Java-side parse.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The CVS() composer is now reachable in IntelliJ from both Alt+Enter and the editor context menu, pinned by source guards; the full IntelliJ test suite passes (`./gradlew test --offline`, green).
- Visible lightbulb-preview rendering and the actual Alt+Enter/context-menu reachability in a running IntelliJ IDE remain deferred to plan 89-13's end-of-phase human checks, matching this plan's own acceptance-criteria wording.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java`
- FOUND: `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/description.html`
- FOUND: `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/before.bbj.template`
- FOUND: `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/after.bbj.template`
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeCvsActionSourceGuardTest.java`
- FOUND: commit `b7e708dc` (Task 1) in `git log`
- FOUND: commit `63a41755` (Task 2) in `git log`
- Re-ran acceptance criteria for both tasks: `grep` for `com.basis.bbj.intellij.composer.ConfigureCvsIntention` in plugin.xml (one line), `grep` for `Kind.CVS` in `ConfigureCvsIntention.java` (one line), `grep` for `id="bbj.composeCvs"` in plugin.xml (one line) — all pass
- Re-ran plan `<verification>`: `./gradlew test --offline` (green, full suite), register check across `git diff b7e708dc~1..HEAD -- bbj-intellij/src` — zero matches for the banned plan/decision/threat id regex
