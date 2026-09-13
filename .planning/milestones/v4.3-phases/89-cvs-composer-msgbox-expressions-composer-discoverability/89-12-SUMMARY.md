---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 12
subsystem: composer
tags: [intellij, lsp4ij, codevision, cvs, config, discoverability]

# Dependency graph
requires:
  - phase: 89-08
    provides: "ComposerLauncher.Kind.CVS and CvsComposerDialog"
  - phase: 89-10
    provides: "ConfigureCvsIntention, BbjComposeCvsAction, plugin.xml registrations for CVS entry points"
  - phase: 89-11
    provides: "the server/VS Code side of config routing: bbx-config language id, setopts-config cue kind, the builder filter"
  - phase: 89-06
    provides: "the recorded GO + route decisions this plan's precondition checks"
provides:
  - "ComposerLensKinds mapping cvs -> ComposerLauncher.Kind.CVS (six wire kinds mapped)"
  - "plugin.xml languageMapping for BBx Config under languageId bbx-config"
  - "BbjConfigFileTypeRegistrationTest's refined two-mapping invariant"
affects: [89-13]

actuals:
  tokens: 2200
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A sixth wire kind (cvs) joins ComposerLensKinds' existing pure map with no change to the routing action or contract test, since both already key off mappedWireKinds() rather than a hard-coded set"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLensKinds.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensKindsTest.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java

key-decisions:
  - "The pre-existing (D-01) parenthetical on the line touched to correct BbjComposeSetoptsAction's Javadoc was dropped rather than kept, since modifying that same line for wording would otherwise reintroduce a banned decision-id token into the diff's added lines even though the id itself predates this plan."
  - "BbjConfigFileTypeRegistrationTest's replacement test also asserts serverId=\"bbjLanguageServer\" on both mappings and that no mapping ever pairs the config language with languageId=\"bbj\", going slightly beyond the plan's four bullet points for defense in depth against a future partial edit."

requirements-completed: [DISC-01]

coverage:
  - id: D1
    description: "Clicking a Compose CVS() cue in IntelliJ opens the CVS() composer for that call, because ComposerLensKinds maps cvs to ComposerLauncher.Kind.CVS"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "ComposerLensKindsTest#mapsEveryDocumentedWireKindToItsLauncherKind[cvs] (#650)"
        status: pass
      - kind: unit
        ref: "ComposerLensCommandContractTest (still passes, finds 'cvs' quoted in composer-lens-contract.ts)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The BBx Config language is mapped to the BBj language server under language id bbx-config, never bbj, so LSP4IJ renders the server's config-file Compose SETOPTS cue as Code Vision"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "BbjConfigFileTypeRegistrationTest#theBbjLanguageIsMappedAsBbjAndTheConfigLanguageOnlyAsBbxConfig"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase 84's invariant is re-pinned in refined form: exactly two LSP4IJ language mappings exist (bbj, bbx-config), so a config file is never sent as BBj source"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "BbjConfigFileTypeRegistrationTest#theBbjLanguageIsMappedAsBbjAndTheConfigLanguageOnlyAsBbxConfig (asserts exactly 2 mappings and forbids config->bbj pairing)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Visible config-file Code Vision rendering and click-through in a running IntelliJ IDE"
    verification: []
    human_judgment: true
    rationale: "Covered by plan 89-13's end-of-phase human checks per this plan's own <verification> item 3; no IntelliJ sandbox render was exercised in this plan."

duration: 12min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 12: IntelliJ CVS Cue Wiring and Config-to-Server Language Mapping Summary

**`ComposerLensKinds` now routes the `cvs` wire kind to `ComposerLauncher.Kind.CVS`, and `plugin.xml` gains a second LSP4IJ `languageMapping` sending `BBx Config` documents to the language server under their own `bbx-config` id — with Phase 84's single-mapping registration test replaced by a two-mapping invariant that still forbids the config language from ever reaching the server as BBj source.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-12T10:33:00Z
- **Completed:** 2026-09-12T10:45:00Z
- **Tasks:** 2
- **Files modified:** 5

## Precondition Check

Re-read `.planning/phases/89-cvs-composer-msgbox-expressions-composer-discoverability/89-06-SUMMARY.md`
before Task 2. Both required lines are present verbatim:
- `Code Vision spike: GO (IU-262.10315.125)`
- `Config routing decision: route`

Task 2 proceeded.

## Accomplishments
- `ComposerLensKinds.WIRE_TO_LAUNCHER_KIND` gained `"cvs" -> ComposerLauncher.Kind.CVS`, bringing the map to six entries (`msgbox`, `addwindow`, `addchildwindow`, `cvs`, `setopts-in-code`, `setopts-config`). The stale Javadoc line calling out `cvs` as an example of an unhandled kind "until a CVS launcher kind exists" was corrected — the method's Javadoc no longer names any kind as an exception.
- `ComposerLensKindsTest` updated first (RED): the `cvs` case moved from the "any other wire kind is empty" parameterized set into the "maps every documented wire kind" table, and `mappedWireKinds()` now expects six strings. Test failed as expected before the `ComposerLensKinds.java` change, then passed after.
- `plugin.xml` gained `<languageMapping language="BBx Config" serverId="bbjLanguageServer" languageId="bbx-config"/>` directly after the existing BBj mapping — two `languageMapping` elements now exist, both naming `serverId="bbjLanguageServer"`.
- `BbjConfigFileTypeRegistrationTest`'s `exactlyOneLanguageMappingExistsAndItNamesBbj` was replaced by `theBbjLanguageIsMappedAsBbjAndTheConfigLanguageOnlyAsBbxConfig`, asserting: exactly two `languageMapping` elements; the `BBj`-named one has `languageId="bbj"`; the `BBx Config`-named one has `languageId="bbx-config"`; both name `serverId="bbjLanguageServer"`; and no mapping ever pairs the config language with `languageId="bbj"`. The class Javadoc's closing clause was rewritten to describe the refined two-mapping invariant instead of the old single-mapping one.
- `BbjComposeSetoptsAction.java`'s Javadoc phrase "is unmapped to the server" was corrected to state the config language reaches the server only under `bbx-config`, which the server never parses. No code in the class changed.

## Task Commits

Each task was committed atomically:

1. **Task 1: A CVS cue click in IntelliJ opens the CVS() composer** (`tdd="true"`, `type="tracer"`)
   - `c2ffa9ec` test(89-12): add failing test for cvs wire-kind mapping
   - `268a58ed` feat(89-12): map cvs cue clicks to the CVS() composer
2. **Task 2: Map BBx Config to the server as `bbx-config` and re-pin Phase 84's invariant in refined form**
   - `5db46fc8` feat(89-12): map BBx Config to the server as bbx-config, re-pin the refined invariant

**Plan metadata:** captured in this SUMMARY's own commit.

_Task 1 is `type="tracer"`; its own `<verify>` (the three targeted composer/action test classes) was
re-run end-to-end at commit time under the auto-mode tracer feedback gate (`workflow.auto_advance: true`)
and passed before Task 2 began._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLensKinds.java` - `cvs` mapped to `Kind.CVS`, stale Javadoc corrected
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensKindsTest.java` - `cvs` expectation moved to the mapped table, six-entry `mappedWireKinds()` assertion
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - second `languageMapping` for `BBx Config` under `languageId="bbx-config"`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java` - refined two-mapping invariant test and class Javadoc
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java` - Javadoc correction only, no code change

## Decisions Made
- The pre-existing `(D-01)` parenthetical on the `BbjComposeSetoptsAction` Javadoc line being corrected was dropped rather than preserved verbatim, since any edit to that line would re-surface the decision-id token in the diff's added lines under this plan's register-check regex, even though the id predates this plan.
- The refined registration test also asserts `serverId="bbjLanguageServer"` on both mappings and explicitly forbids ever pairing the config language with `languageId="bbj"`, going slightly beyond the plan's four literal bullet points as defense in depth against a future partial edit that adds a mapping without setting `languageId` correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed a pre-existing decision-id token surfaced by an unrelated line edit**
- **Found during:** Task 2 (correcting `BbjComposeSetoptsAction`'s Javadoc)
- **Issue:** The line being edited to fix the "unmapped to the server" phrase also carried a pre-existing `(D-01)` parenthetical from an earlier phase. Editing the line for wording would have caused git diff to show `(D-01)` as part of an added line, tripping this plan's own register-check regex (`\bD-[0-9]{2}\b`) even though the token itself predates this plan.
- **Fix:** Dropped the `(D-01)` parenthetical from the corrected sentence; no other lines on that Javadoc block (which still carry `D-04`/`D-05/D-06` on untouched lines) were touched.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java`
- **Verification:** `git diff <task1 commit>~1..HEAD -- bbj-intellij/src | grep '^+' | grep -E` against the banned-id regex returns no matches.
- **Committed in:** `5db46fc8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (comment-discipline cleanup, zero behavior change).
**Impact on plan:** No scope creep. The fix is a comment-wording adjustment only; no production behavior changed.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five composer wire kinds (`msgbox`, `addwindow`, `addchildwindow`, `cvs`, `setopts-in-code`) plus the config-file `setopts-config` kind now have a clickable IntelliJ cue-routing path (`ComposerLensKinds` maps six wire kinds total).
- `BBx Config` documents reach the language server under their own `bbx-config` id, matching the VS Code/server-side routing landed in plan 89-11; the refined registration test keeps Phase 84's "config file never reaches the server as BBj source" invariant intact in its updated two-mapping form.
- Visible Code Vision rendering and click-through for the config-file cue in a running IntelliJ IDE is deferred to plan 89-13's end-of-phase human checks, per this plan's own `<verification>` item 3 — no IntelliJ sandbox render was exercised in this plan.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLensKinds.java` (contains `map.put("cvs", ComposerLauncher.Kind.CVS);`)
- FOUND: `bbj-intellij/src/main/resources/META-INF/plugin.xml` (contains `languageId="bbx-config"`, two `<languageMapping` elements)
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java` (contains `theBbjLanguageIsMappedAsBbjAndTheConfigLanguageOnlyAsBbxConfig`)
- FOUND: commit `c2ffa9ec` (`git log --oneline --all | grep c2ffa9ec`)
- FOUND: commit `268a58ed` (`git log --oneline --all | grep 268a58ed`)
- FOUND: commit `5db46fc8` (`git log --oneline --all | grep 5db46fc8`)
- Re-ran task-level acceptance criteria: `grep -n "Kind.CVS" ComposerLensKinds.java` (one line), `grep -n "languageId=\"bbx-config\""` (one line), `grep -c "<languageMapping"` (2)
- Re-ran plan-level `<verification>`: `./gradlew test --offline` (BUILD SUCCESSFUL, full suite green); register check across `git diff c2ffa9ec~1..HEAD -- bbj-intellij/src` for `+`-prefixed added lines — zero matches for the banned plan/decision/threat id regex (only `#650` issue references remain, which are permitted)
