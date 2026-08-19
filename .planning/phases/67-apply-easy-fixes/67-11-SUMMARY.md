---
phase: 67-apply-easy-fixes
plan: 11
subsystem: intellij-plugin
tags: [intellij, java, javadoc, code-shape, gradle, jdk-toolchain]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: 67-BASELINE.md and 67-APPLY-SET.md apparatus (plan 67-01), the ten P63-* bbj-intellij/ finding records from 63-COVERAGE.md
provides:
  - Nine bbj-intellij/ easy-fix findings applied as single commits (P63-D4-001, P63-D4-014, P63-D8-001/002/003/005/006/007/008)
  - P63-D7-004 recorded deferred per D-15 (no JDK 17 in this environment)
  - Plan 67-11 gradle re-check and baseline delta appended to 67-BASELINE.md
affects: [67-12]

# Actuals (#2632)
actuals:
  tokens: 12336
  tasks: 3
  commits: 10

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform enum (WINDOWS/UNIX) centralizing SystemInfo.isWindows branching in BbjNodeDownloader, with buildUrl/download/extract/install/cleanup steps replacing a single 69-line method"
    - "Comment-only proof for D8 doc-accuracy commits: git show <sha> -U0 | grep for +/- lines, every printed line's content must begin *, /**, */ or //"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P63-D8-007's premise verified false during execution: P63-D2-013's evidence claims scheduleRestart() has zero call sites, but BbjSettingsConfigurable.apply():83 has called it since v1.2 (commit 35c916b), predating the Phase 63 review. Applied a corrected-not-removed Javadoc edit (names the one real debounced path and the six direct-restart() bypass sites) instead of the plan's literal 'remove the claim' instruction, recorded as a documented divergence."
  - "P63-D8-008's comment-only-proof check does not literally apply: the edit is inside a Java text-block String literal (demo sample data), not Java comment syntax, so the diff line doesn't begin with *, /**, */ or //. Recorded as a plan-convention discrepancy rather than fabricating a passing proof."
  - "P63-D8-005 took both branches the finding record offered (softened 'mirroring' AND added a note naming the two intentionally-unused TS-side fields) rather than picking one, since neither alone fully removed the overstatement; P63-D7-004 (the two field additions) remains deferred per D-15."
  - "P63-D4-014's icon deletion also cleaned up BbjNodeDownloader.java:50's own SystemInfo.isWindows branch (getCachedNodePath) to route through the new Platform helper for consistency, beyond the literal five sites the record names, since it's the same duplication cited in the finding's own evidence."
  - "FIX-01..04 left Pending in REQUIREMENTS.md, continuing the established 67-01/05/06/07/08/09/10 precedent — deferred to 67-12 phase close."

patterns-established:
  - "Statement-by-statement ordering trace as the mitigation for a control-flow-restructuring D4 finding with no compiler available (P63-D4-001) — 12-step trace confirming every extracted step preserves order, conditions, and finally/cleanup semantics, paired with an explicit note recording the divergence from D-14's 'cannot change bytecode behaviour' characterisation."

requirements-completed: []

coverage:
  - id: D1
    description: "BbjNodeDownloader.java's SystemInfo.isWindows branching (6 sites) extracted into a Platform helper; downloadAndExtractNode split into buildUrl/download/extract/install/cleanup steps in the original order, with a full statement-by-statement ordering trace as the no-compiler mitigation"
    requirement: FIX-01
    verification:
      - kind: other
        ref: "review-only — no compile, no test ran (D-14); ordering trace in 67-APPLY-SET.md row 59"
        status: pass
    human_judgment: true
    rationale: "No compiler or test can confirm bytecode-behaviour equivalence in this environment (no JDK 17); the must_haves truth for this plan is explicitly marked verification: backstop and abstains to human_needed rather than passing silently."
  - id: D2
    description: "Eight Javadoc/comment doc-accuracy corrections applied across BbjNodeDownloader, BbjCompileAction, BbjEMTokenStore, ComposerModels, BbjServerLogToolWindowFactory, BbjServerService, and BbjColorSettingsPage; each confirmed comment-only via git show -U0, except P63-D8-008 whose edit is demo-text string content (documented discrepancy)"
    requirement: FIX-02
    verification:
      - kind: other
        ref: "review-only — no compile, no test ran (D-14); comment-only proof pasted into each row's verification field in 67-APPLY-SET.md rows 62-68"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unused BbjIcons.CONFIG constant and its two backing bbj-config*.svg resources removed after confirming no surviving reference in bbj-intellij/src or plugin.xml"
    requirement: FIX-01
    verification:
      - kind: other
        ref: "test ! -f bbj-config.svg && test ! -f bbj-config_dark.svg -> ICONS_REMOVED; grep -rn bbj-config bbj-intellij/src/ -> no hits"
        status: pass
    human_judgment: false
  - id: D4
    description: "P63-D7-004 recorded deferred per D-15 with its reason, the two quoted field additions, and the proving test that would confirm it once a JDK 17 exists — no field added to ComposerModels.java"
    requirement: FIX-02
    verification:
      - kind: other
        ref: "67-APPLY-SET.md row 61: verdict: deferred, commit: none — deferred per D-15"
        status: pass
    human_judgment: false
  - id: D5
    description: "./gradlew build re-run from bbj-intellij/ after all nine commits: identical build-script Java version check failure as the phase-start baseline; bbj-vscode/ baseline delta (3x npm test + npm run lint) verdict identical"
    requirement: FIX-03
    verification:
      - kind: other
        ref: "67-BASELINE.md ### Plan 67-11 gradle re-check and ### Plan 67-11 delta sections"
        status: pass
    human_judgment: false

duration: ~14min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 11: BbjIntellij Easy-Fix Apply Summary

**Applied all nine `bbj-intellij/` easy-fix findings as nine atomic commits (one control-flow refactor with a full ordering trace, one dead-code removal, seven Javadoc/comment corrections), deferred the tenth per D-15, and re-verified the JDK-17 gradle gap and the bbj-vscode/ baseline are unchanged.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-08-19 (approx, session start after Plan 67-10)
- **Completed:** 2026-08-19T15:13:28Z
- **Tasks:** 3
- **Files modified:** 10 (8 Java/svg source files, 2 planning ledger/baseline files)

## Accomplishments

- Refactored `BbjNodeDownloader.java`'s `downloadAndExtractNode` (69 lines, 8 responsibilities) into a private `Platform` enum plus `buildDownloadUrl`/`download`/`extract`/`install`/`cleanup` steps, invoked in the original order and conditions, with a full 12-step statement-by-statement ordering trace as the mitigation for the one row this plan flags as carrying materially higher behavioural risk than the other eight (P63-D4-001).
- Removed the unreferenced `BbjIcons.CONFIG` constant and its two backing `.svg` resources after confirming — via grep against both `bbj-intellij/src/` and `plugin.xml` — that nothing else names it (P63-D4-014).
- Corrected seven Javadoc/class-comment claims to match what the code beside them actually does: `BbjNodeDownloader.getCachedNodePath()`'s undocumented directory-creation side effect, `BbjCompileAction`'s unconditional-compile claim (now marked not-yet-implemented), `BbjEMTokenStore`'s overstated "OS-native keychain" guarantee (softened to name PasswordSafe's three possible backends), `ComposerModels`' "mirroring" overstatement, `BbjServerLogToolWindowFactory`'s "real-time stdout/stderr" claim (corrected to the curated status-transition messages it actually shows), `BbjServerService`'s debounced-restart claim, and `BbjColorSettingsPage`'s invalid `/@` block-comment sample delimiter (corrected to `/@@` per the grammar's DOCU terminal).
- During P63-D8-007, verified the underlying P63-D2-013 finding's "zero call sites" premise against the current code and found it false — `BbjSettingsConfigurable.apply()` has called `scheduleRestart()` since v1.2. Applied a corrected (not blindly-removed) Javadoc edit and recorded the divergence rather than propagating a false claim.
- Recorded `P63-D7-004`'s deferral (per D-15, no JDK 17 available) with its reason, the two quoted field additions, and the proving Gson round-trip test that would confirm it once a supported JDK exists — no field added to `ComposerModels.java`.
- Closed all ten `P63-*` ledger rows in `67-APPLY-SET.md` and appended `### Plan 67-11 gradle re-check` (identical build-script JDK-version-check failure) and `### Plan 67-11 delta` (identical 11-name `linking.test.ts` gate set across three `npm test` runs, `npm run lint` clean) to `67-BASELINE.md`.

## Task Commits

Each task was committed atomically:

1. **Task 1: BbjNodeDownloader, BbjCompileAction, BbjEMTokenStore, BbjIcons**
   - `7816c7d` — `refactor(P63-D4-001): extract a Platform helper and split downloadAndExtractNode`
   - `281f62c` — `docs(P63-D8-001): note the directory-creation side effect in the Javadoc`
   - `40da059` — `docs(P63-D8-002): mark the compile action as not yet implemented`
   - `b57d98b` — `docs(P63-D8-003): describe PasswordSafe backing accurately`
   - `2cf09a6` — `refactor(P63-D4-014): remove the unused config icon and its resources`
2. **Task 2: ComposerModels (applied part only), the two UI Javadocs, and the color settings sample**
   - `6ca6c49` — `docs(P63-D8-005): describe what the composer models actually carry`
   - `46a8d8c` — `docs(P63-D8-006): describe what the server log tool window actually shows`
   - `18d5cc0` — `docs(P63-D8-007): correct debounced-restart scope in the class doc` (deviated from the plan's literal instruction — see Decisions Made)
   - `97a2e6b` — `docs(P63-D8-008): correct the block-comment opener in the color settings sample`
   - P63-D7-004: no commit — recorded deferred in 67-APPLY-SET.md row 61
3. **Task 3: Close the ten ledger rows, re-record the gradle gap, and run the plan baseline delta**
   - `87043fb` — `docs(67-11): close the IntelliJ rows, record the gradle gap and the baseline delta`

**Plan metadata:** (this SUMMARY's own commit, made immediately after this file)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` — Platform enum + step-method split; Javadoc side-effect note
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` — "not yet implemented" Javadoc caveat
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` — softened PasswordSafe backing claim
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java` — removed unused `CONFIG` constant
- `bbj-intellij/src/main/resources/icons/bbj-config.svg`, `bbj-config_dark.svg` — deleted (unreferenced)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` — softened "mirroring" claim, noted the two deferred fields; no field added
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java` — corrected the console-content Javadoc
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` — corrected the debounced-restart-scope Javadoc (divergence, see below)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java` — `/@` → `/@@` demo sample fix
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — ten `P63-*` rows closed (9 applied, 1 deferred)
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — plan 67-11 gradle re-check + baseline delta sections appended

## Decisions Made

- **P63-D8-007's underlying finding premise verified false.** `P63-D2-013`'s evidence claims `grep -rn "scheduleRestart()" bbj-intellij/src/main/java` returns zero call sites, but `BbjSettingsConfigurable.apply():83` has called it since commit `35c916b` (v1.2), well before the Phase 63 review. Applied a corrected-not-removed Javadoc edit naming the one real debounced path and the six direct-`restart()` bypass sites (all independently re-verified via grep), rather than the plan's literal "remove the claim" instruction, per this plan's own `must_haves` truth requiring every corrected Javadoc claim to match code as actually read. Recorded in the ledger row's `notes:` for the phase-close reviewer.
- **P63-D8-008's comment-only-proof check does not literally apply.** The edit is inside a Java text-block String literal (demo sample data representing BBj source), not Java comment syntax — the diff line's content doesn't begin `*`, `/**`, `*/`, or `//`. Ran the check anyway, pasted the real (non-matching) output, and recorded the discrepancy explicitly rather than fabricating conformance.
- **P63-D8-005 took both branches the finding record offered** (soften "mirroring" AND add a note naming the two intentionally-unused fields) since neither alone fully addressed the overstatement; `P63-D7-004` (the two field additions themselves) stays deferred per D-15 — verified via a full-plan diff on `ComposerModels.java` showing comment-line changes only.
- **P63-D4-014's fix also routed `BbjNodeDownloader.java:50`'s own `SystemInfo.isWindows` branch through the new `Platform` helper**, beyond the five sites the P63-D4-001 record literally lists, since it's the same duplication its own evidence names at that exact line.
- **FIX-01..04 left Pending in REQUIREMENTS.md**, continuing the established precedent from plans 67-01/05/06/07/08/09/10 — deferred to 67-12 phase close.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1-equivalent: doc-accuracy correction] P63-D8-007's premise contradicted the code**
- **Found during:** Task 2, applying P63-D8-007
- **Issue:** The plan instructed removing the "debounced restart scheduling" claim from `BbjServerService`'s class Javadoc, on the inherited premise (from `P63-D2-013`) that `scheduleRestart()` has zero callers. Verification found one real caller, `BbjSettingsConfigurable.apply()`, present since v1.2.
- **Fix:** Applied a corrected (not removed) Javadoc naming the one real debounced path and the six direct-bypass sites, keeping the doc accurate rather than making it newly false in the opposite direction.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`
- **Verification:** `grep -rn "\.restart()\|scheduleRestart()" bbj-intellij/src/main/java/` — one `scheduleRestart()` call site, six `restart()` call sites, matching the corrected doc text exactly.
- **Committed in:** `18d5cc0` (Task 2 commit)

**2. [Documentation-fidelity judgment, not Rule 1-4] P63-D8-008's mechanical proof doesn't apply to demo-text content**
- **Found during:** Task 3, closing the ledger row for P63-D8-008
- **Issue:** `<phase_conventions>`'s comment-only proof (every changed line begins `*`/`/**`/`*/`/`//`) is designed for real Javadoc edits; P63-D8-008's edit is inside a Java text-block String literal, not comment syntax.
- **Fix:** Ran the check as instructed, recorded the real (non-matching) output honestly, and added an explicit caveat to the ledger row rather than glossing over or fabricating a pass.
- **Files modified:** `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` (row 68's `notes:`)
- **Verification:** N/A — this is a documentation-honesty correction, not a code fix.
- **Committed in:** `87043fb` (Task 3 commit)

---

**Total deviations:** 2 documented (1 finding-premise correction, 1 plan-convention discrepancy). Neither is a Rule 1-4 auto-fix in the code sense — both are documentation-fidelity judgment calls within this plan's own stated intent, consistent with the pattern established by plans 67-01 and 67-05 through 67-09 in this same phase.
**Impact on plan:** No scope creep. Both deviations narrow rather than widen the plan's claims — one corrects a doc edit that would otherwise have been newly inaccurate, the other prevents a fabricated verification claim.

## Issues Encountered

None beyond the two documented deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All nine `bbj-intellij/` easy-fix findings from `63-COVERAGE.md` are now applied; `P63-D7-004` is the only one of the ten held, deferred per D-15 pending a JDK 17 install.
- `67-BASELINE.md`'s gradle re-check confirms this plan's edits did not change the JDK-17-vs-25.0.3 toolchain gap; that gap remains an environment limitation for 67-12 (phase close) to state, not fix.
- The `P63-D8-007` divergence (P63-D2-013's "zero call sites" evidence error) is recorded in the ledger row's `notes:` for 67-12 or a future phase to decide whether it warrants a correction to `63-COVERAGE.md` itself (which this plan's prohibitions forbid editing).
- No blockers for 67-12.

---
*Phase: 67-apply-easy-fixes*
*Completed: 2026-08-19*
