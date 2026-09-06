---
phase: 82-composer-robustness
plan: 04
subsystem: intellij-plugin
tags: [intellij-platform, intention-preview, plugin-resources, junit5]

# Dependency graph
requires:
  - phase: 82-composer-robustness (82-03)
    provides: StaleEditGuard/DecodeEquality apply-path guarding that gap-closure test 6 was exercising when the intention-preview exception surfaced
provides:
  - "intentionDescriptions/<SimpleClassName>/ resource tree (description.html + before/after templates) for all three composer intentions"
  - "generatePreview() on all three composer intentions returns IntentionPreviewInfo.Html instead of EMPTY"
  - "IntentionDescriptionResourcesTest: plugin.xml-driven regression guard so a future intention cannot ship without its description resources"
  - "ComposerIntentionPreviewSourceGuardTest: source guard pinning the Html preview, unchanged invoke/isAvailable/startInWriteAction, and an untouched plugin.xml"
affects: [composer-robustness, intellij-plugin-packaging]

actuals:
  tokens: 6200
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Descriptor-driven test enumeration: a JUnit test parses plugin.xml with a hardened DocumentBuilderFactory and derives its subject list from <intentionAction> registrations rather than a hard-coded class-name array, so a new registration is covered automatically."
    - "Belt-and-braces preview fix: both the shipped description resource AND a non-EMPTY IntentionPreviewInfo.Html are kept, so the fallback lookup is silenced twice over."

key-files:
  created:
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/before.bbj.template
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/after.bbj.template
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/description.html
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/before.bbj.template
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/after.bbj.template
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/description.html
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/before.bbj.template
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/after.bbj.template
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java

key-decisions:
  - "Kept both halves of the fix deliberately redundant: the shipped intentionDescriptions/ resource covers Settings › Editor › Intentions independently of the popup, and the Html preview covers the popup independently of the resource — either alone would silence the reported exception, but a future intention reverting to EMPTY would re-enter the fallback path if the resource were the only fix."
  - "The descriptor-enumerating test derives its subject list from plugin.xml's <intentionAction> elements via a hardened DocumentBuilderFactory (DOCTYPE disabled, external entities off, XInclude off), never from a hard-coded class-name array, so a fourth intention registered later is covered the moment it lands."

requirements-completed: [COMP-02]

coverage:
  - id: D1
    description: "Every intentionAction registered in plugin.xml ships a description directory with a non-blank description.html carrying the tooltip-end marker, plus a distinct before/after template pair."
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java#everyRegisteredIntentionShipsADescriptionDirectory,everyRegisteredIntentionShipsANonBlankDescriptionHtml,everyRegisteredIntentionShipsABeforeAndAfterTemplate"
        status: pass
    human_judgment: false
  - id: D2
    description: "All three composer intentions return IntentionPreviewInfo.Html instead of EMPTY from generatePreview, so the platform's fallback description lookup is unreachable from the lightbulb popup; invoke/isAvailable/startInWriteAction/getText/getFamilyName and plugin.xml are unchanged."
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java#noIntentionReturnsAnEmptyPreviewAnymore,everyIntentionReturnsExactlyOneHtmlPreview,startInWriteActionStillReturnsFalseOnEveryIntention,invokeAndIsAvailableAreUndisturbedOnEveryIntention,pluginXmlStillRegistersAllThreeIntentionsUntouched"
        status: pass
    human_judgment: false
  - id: D3
    description: "The description resources are physically present in the composed plugin jar as directory entries plus files (the platform resolves a directory URL, so file-only packaging would still throw), and the whole IntelliJ module stays green."
    requirement: COMP-02
    verification:
      - kind: other
        ref: "unzip -l bbj-intellij/build/libs/bbj-intellij-0.1.0.jar | grep 'intentionDescriptions/' (16 lines: 4 directory entries + 12 files)"
        status: pass
      - kind: unit
        ref: "./gradlew test (408 tests, 0 failures, 44 classes including 9 composer classes)"
        status: pass
      - kind: other
        ref: "./gradlew buildPlugin (exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Human re-verification of the lightbulb popup (no more PluginException), the Settings › Editor › Intentions rendering, and phase 82 UAT test 6's stale-edit abort behaviour, all in a live IDE."
    human_judgment: true
    rationale: "This repository has no live IntelliJ UI test harness; popup preview computation, Settings-page rendering and WriteCommandAction's real document integration all need a running IDE. Carried forward as outstanding UAT, same as prior phases (79/80/81)."

duration: 10min
completed: 2026-09-05
status: complete
---

# Phase 82 Plan 04: Intention Description Resources Summary

**Shipped `intentionDescriptions/<SimpleClassName>/` resource trees for all three composer intentions and switched their `generatePreview` to `IntentionPreviewInfo.Html`, closing gap G-82-6's `PluginException: Intention Description Dir URL is null` lightbulb-preview crash.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-05T21:20:00Z
- **Completed:** 2026-09-05T21:27:52Z
- **Tasks:** 3
- **Files modified:** 14 (11 created, 3 modified)

## Accomplishments

- Nine new resource files under `bbj-intellij/src/main/resources/intentionDescriptions/` — a `description.html` (with the platform's `<!-- tooltip end -->` separator) plus a distinct `before.bbj.template`/`after.bbj.template` pair for each of `ConfigureMsgboxIntention`, `ConfigureAddWindowIntention` and `ConfigureAddChildWindowIntention`.
- `IntentionDescriptionResourcesTest` parses `plugin.xml` with a hardened `DocumentBuilderFactory` (DOCTYPE disabled, external entities off, XInclude off) and asserts every registered `<intentionAction>` has its description directory, non-blank `description.html`, and a distinct before/after pair — derived from the descriptor, never a hard-coded class list, so a future intention is covered automatically.
- All three intentions now return `new IntentionPreviewInfo.Html(...)` with a one-paragraph compile-time literal instead of `IntentionPreviewInfo.EMPTY`, so the lightbulb popup renders its own preview and the platform's fallback description lookup — the exact code path that threw `PluginException` — is never entered.
- `ComposerIntentionPreviewSourceGuardTest` pins the Html-preview construction, the absence of `IntentionPreviewInfo.EMPTY`, and that `invoke`, `isAvailable`, `startInWriteAction` and the `plugin.xml` registrations are byte-for-byte unchanged.
- Proved the resources reach the shipped artifact: the composed plugin jar (`bbj-intellij-0.1.0.jar`) carries the three `intentionDescriptions/<SimpleClassName>/` directory entries plus their nine files.

## Task Commits

Each task was committed atomically (Tasks 1 and 2 are `tdd="true"`, RED then GREEN):

1. **Task 1 (RED): descriptor-driven guard test** — `75f7500` (`test`)
2. **Task 1 (GREEN): ship the nine resource files** — `9b9b1f3` (`feat`)
3. **Task 2 (RED): preview source guard test** — `b255592` (`test`)
4. **Task 2 (GREEN): switch generatePreview to Html** — `e5c5ec2` (`feat`)
5. **Task 3: verification only** — no commit (inspects the packaged jar and the diff; writes no source, resource or test file, per the plan)

**Plan metadata:** committed alongside this SUMMARY (see final commit hash reported to the orchestrator).

## Files Created/Modified

- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html` — platform description page for the MSGBOX composer intention
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/before.bbj.template` / `after.bbj.template` — before/after MSGBOX call examples
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/description.html` — platform description page for the addWindow composer intention
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/before.bbj.template` / `after.bbj.template` — before/after addWindow flag examples
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/description.html` — platform description page for the addChildWindow composer intention
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/before.bbj.template` / `after.bbj.template` — before/after addChildWindow flag examples
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java` — descriptor-driven regression guard
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java` — source guard for the preview wiring
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java` — `generatePreview` now returns `IntentionPreviewInfo.Html`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java` — same
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java` — same

## Decisions Made

- Kept both halves of the fix (shipped resource + non-EMPTY preview) deliberately redundant, per the plan's flagged assumption — either alone silences the reported exception, but only the pair makes a future regression to EMPTY safe.
- The descriptor-enumerating test's subject list comes from parsing `plugin.xml`, never a hard-coded array, satisfying the plan's regression-guard requirement and the acceptance criterion that the test contain no `Configure*Intention` string literal.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria for all three tasks were verified and passed on the first attempt; no Rule 1-4 auto-fixes were needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-82-6 is closed: the shipped resources and the Html preview together eliminate the `PluginException` that made phase 82 UAT test 6 unreadable.
- **Outstanding human UAT** (deferred, not closed by this plan, per the plan's `<verification>` section):
  - Open a `.bbj` file, put the caret inside a `MSGBOX(...)`, `addWindow(...)` and `addChildWindow(...)` call, press Alt+Enter and arrow onto the composer entry so the popup computes a preview: confirm a one-paragraph description appears and **no IDE error report** is raised.
  - Invoke each entry and confirm the composer dialog still opens, prefilled, exactly as before.
  - Open Settings › Editor › Intentions › BBj and select each of the three entries: confirm the description text and a before/after example render.
  - Re-run phase 82's UAT test 6 (stale-edit abort) now that the error report no longer interrupts it: open a composer on an existing `MSGBOX(...)` call, edit that same line in another split editor, press OK — a warning balloon should say nothing was changed, the document should be byte-for-byte untouched, and "Reopen composer" should reopen against the current document. This behaviour itself remains unconfirmed from the earlier UAT round and is not closed by this plan.
  - The "Start BBjServices for Java completions" editor banner observed during UAT test 6 is `BbjJavaInteropNotificationProvider` (java-interop on :5008 unreachable) and is not a composer defect — no action needed on it.

## Self-Check: PASSED

- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html` — FOUND
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/description.html` — FOUND
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/description.html` — FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java` — FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java` — FOUND
- Commit `75f7500` — FOUND in `git log --oneline --all`
- Commit `9b9b1f3` — FOUND in `git log --oneline --all`
- Commit `b255592` — FOUND in `git log --oneline --all`
- Commit `e5c5ec2` — FOUND in `git log --oneline --all`
- All task-level `<acceptance_criteria>` re-run and passed (see per-task verification above)
- Plan-level `<verification>` items 1-7 re-run and passed: descriptor test green, source-guard test green, whole composer-package filter green (9 classes), whole module green (408 tests, 0 failures), `buildPlugin` exit 0, jar inspection 16 matching lines, planning-identifier scan against `origin/main` prints nothing

---
*Phase: 82-composer-robustness*
*Completed: 2026-09-05*
