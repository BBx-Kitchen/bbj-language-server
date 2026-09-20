---
phase: 96-platform-integration-node-js-diagnosis
plan: 01
subsystem: ui
tags: [intellij, color-settings-page, textmate, documentation]

requires:
  - phase: 95-java-interop-status-accuracy-widget-consolidation
    provides: BbjFileVisibility widened predicate and notification-provider conventions this phase's later plans build on
provides:
  - Deletion of the inert BbjColorSettingsPage class and its plugin.xml registration
  - Rewritten IntelliJ docs Customization section describing TextMate-driven, theme-following highlighting
affects: [96-02, 96-03, 96-09-review, phase-96-uat]

actuals:
  tokens: 4200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - documentation/docs/intellij/features.md
  deleted:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java

key-decisions:
  - "Deleted BbjColorSettingsPage outright (D-01) rather than wiring it up -- IntelliJ's TextMate engine has no supported extension point to remap scopes onto a third-party plugin's TextAttributesKeys, and the language server's semantic-token provider emits only 3 of the page's 9 descriptors."
  - "No absence guard added (D-03) -- hand UAT verifies Settings > Editor > Color Scheme has no BBj node, deliberately leaving the deferred semantic-token route free to re-add a page without deleting a test first."
  - "Documentation edit is this phase's one accepted, deliberate departure from STATE.md's v4.4-is-IntelliJ-only constraint (D-02) -- shipping 0.16.0 with docs pointing at a removed Settings page would relocate the exact misleading failure PLAT-02 exists to fix."
  - "#621 closes on cited reasoning (D-04): deletion supersedes both branches the issue's own acceptance criteria named, following the Phase 93 D-06 / Phase 94 D-05 / Phase 95 D-11 precedent of closing on reasoning rather than partial implementation."

patterns-established: []

requirements-completed: [PLAT-02]

coverage:
  - id: D1
    description: "BbjColorSettingsPage.java deleted and its plugin.xml colorSettingsPage registration removed; module compiles and the whole IntelliJ JUnit suite (865 tests) is green under a forced --rerun-tasks; BbjTokenTypes.java proven byte-identical via git diff --exit-code."
    requirement: "PLAT-02"
    verification:
      - kind: other
        ref: "cd bbj-intellij && ./gradlew compileJava --rerun-tasks"
        status: pass
      - kind: other
        ref: "git diff --exit-code -- bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java"
        status: pass
      - kind: unit
        ref: "cd bbj-intellij && ./gradlew test --rerun-tasks (865 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Settings > Editor > Color Scheme no longer offers a BBj page in a running IDE, and BBj files still highlight correctly via TextMate -- one of this phase's five intended observable changes."
    requirement: "PLAT-02"
    verification: []
    human_judgment: true
    rationale: "The absence of a page from a Settings tree is not reachable by any plain-JUnit assertion in this project, which has no live IntelliJ UI test coverage in CI (D-03). Coverage comes from hand UAT at end of phase against the final build."
  - id: D3
    description: "documentation/docs/intellij/features.md's Customization section rewritten to describe TextMate-driven, theme-following highlighting instead of pointing at the deleted Settings path."
    requirement: "PLAT-02"
    verification:
      - kind: other
        ref: "grep -c 'Color Scheme' documentation/docs/intellij/features.md (returns 0)"
        status: pass
      - kind: other
        ref: "grep -q '### Customization' && grep -q 'TextMate' documentation/docs/intellij/features.md"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 01: Delete Inert IntelliJ Color Settings Page Summary

**Deleted `BbjColorSettingsPage` and its `plugin.xml` registration outright (TextMate already owns BBj highlighting), and rewrote the published Customization docs to match reality.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-20T01:05:00Z
- **Completed:** 2026-09-20T01:30:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 deleted, 2 modified)

## Accomplishments
- Deleted the 157-line `BbjColorSettingsPage.java` and its single `plugin.xml` `<colorSettingsPage>` registration (plus the comment introducing it), closing ROADMAP criterion 2 via its second branch.
- Confirmed `BbjTokenTypes.java` — the live class sharing two display names (`BBJ_STRING`, `BBJ_COMMENT`) with the deleted page's constants — was left byte-identical, via `git diff --exit-code`.
- Confirmed the module compiles clean and the whole IntelliJ JUnit suite (865 tests) is green under a forced `--rerun-tasks`, and that `./gradlew build` succeeds end to end.
- Rewrote `documentation/docs/intellij/features.md`'s Customization subsection so the published 0.16.0 docs no longer point at a Settings page that no longer exists.

## Task Commits

Each task was committed atomically:

1. **Task 1: The page and its registration go together, and the plugin still builds** - `7c8bad0e` (fix)
2. **Task 2: The docs stop pointing at a page that no longer exists** - `cb52a65c` (docs)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java` - deleted (inert Color Scheme settings page)
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - removed the `colorSettingsPage` registration and its introducing comment; all four `editorNotificationProvider` entries, `textmate.bundleProvider`, `lang.parserDefinition`, and `lang.braceMatcher` entries verified still present
- `documentation/docs/intellij/features.md` - Customization subsection rewritten to describe TextMate-driven, theme-following highlighting

## Decisions Made
- D-01: Delete the page rather than attempt to wire it up — verified during planning that nothing outside the file references its nine `TextAttributesKey` constants, and re-confirmed at execution time via a targeted grep (only the class declaration and the plugin.xml registration referenced `BbjColorSettingsPage`).
- D-02: The `documentation/` edit is a deliberate, accepted departure from STATE.md's "v4.4 is IntelliJ-only" active constraint — every other file this plan touches lives under `bbj-intellij/`. Recorded here so the constraint's next reader sees it as a recorded exception, not a slip.
- D-03: No absence guard was added asserting `plugin.xml` contains zero `colorSettingsPage` occurrences. Verification is hand UAT only (harvested at end of phase), preserving the deferred semantic-token route's freedom to re-add a page later without first deleting a test.
- D-04: #621 should close on cited reasoning — deletion supersedes both branches the issue's own acceptance criteria named ("wire it up" or "remove it"), because those criteria assumed a working colour page was reachable, which CONTEXT.md correction 5 established it is not (no supported IntelliJ extension point exists for a third-party plugin to remap TextMate scopes onto its own `TextAttributesKey`s).

## Deviations from Plan

None - plan executed exactly as written. The only operational note: `git add` on `bbj-intellij/src/main/resources/META-INF/plugin.xml` required `-f` because the repo's `.gitignore` has a broad `META-INF/` pattern (intended for Gradle build output) that also matches the tracked `src/main/resources/META-INF/` directory; the file was already tracked (confirmed via `git ls-files --error-unmatch`), so this was re-staging a modification to an existing tracked file, not adding new ignored content.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 1's tracer feedback gate passed under auto mode (`workflow.auto_advance: true`): the tracer `<verify>` commands (compileJava, git diff --exit-code on BbjTokenTypes.java, test) all passed before Task 2 began.
- `./gradlew build` succeeds from the tree as it stands after both commits, satisfying this plan's build-must-pass gate before other 96-* plans that also touch `plugin.xml` (96-02+ touch different registrations/providers, no overlap with the removed `colorSettingsPage` line).
- One of the phase's five intended observable changes (Settings > Editor > Color Scheme has no BBj node) is declared here for end-of-phase UAT — do not report Phase 96 as no-observable-delta on this item.
- No blockers for subsequent 96-* plans; this plan's files (`plugin.xml`'s `colorSettingsPage` line, `BbjColorSettingsPage.java`, `features.md`'s Customization section) are not touched by any other plan in this phase per the PLAN.md's `key_links`.

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: `BbjColorSettingsPage.java` confirmed absent on disk (deletion verified).
- FOUND: `.planning/phases/96-platform-integration-node-js-diagnosis/96-01-SUMMARY.md` on disk.
- FOUND: commit `7c8bad0e` (Task 1 — delete page + registration).
- FOUND: commit `cb52a65c` (Task 2 — rewrite Customization docs).
- FOUND: commit `4d2ca879` (this SUMMARY).
