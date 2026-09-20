---
phase: "93"
slug: "composer-robustness-consolidation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-18"
---

# Phase 93 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `93-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

**Primary — IntelliJ plugin (all seven requirements):**

| Property | Value |
|----------|-------|
| **Framework** | JUnit Jupiter 5 via `org.junit:junit-bom:6.1.3` (`bbj-intellij/build.gradle.kts:39-41`) |
| **Config file** | `bbj-intellij/build.gradle.kts` — Gradle `test { useJUnitPlatform() }`; no separate JUnit config file |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.composer.*" --tests "com.basis.bbj.intellij.actions.*"` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| **Estimated runtime** | Not measured this session — suite is 865 tests at v4.3 close; planner should record a real figure on first run rather than inherit an invented one |

**Secondary — shared language server, for D-08 (COMP-04's SETOPTS change) only:**

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (`bbj-vscode/package.json`) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <setopts test file>` — exact filename to be resolved during planning |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` |
| **Cwd constraint** | vitest requires cwd = `bbj-vscode`; running it from the repo root fails on relative fixtures |

**Known-failing local baseline — NOT a regression from this phase.** `bbj-vscode`'s standing local
whole-suite baseline is 12 failures (11 `linking.test.ts` interop tests + 1 `issue447` capability
drift), recorded in `.planning/DEBT.md` and STATE.md's Blockers/Concerns. Green requires
`RUN_BBJ_TESTS=0`. This phase touches no file in that failure set.

---

## Sampling Rate

- **After every task commit:** `./gradlew test --tests "com.basis.bbj.intellij.composer.*"` — scoped to
  the touched package; the whole 865-test suite is too slow for per-task iteration
- **After every plan wave:** full `./gradlew test`, plus `cd bbj-vscode && npm test` if D-08's
  shared-LS change landed in that wave
- **Before `/gsd-verify-work`:** full IntelliJ suite green, **and** the hand UAT round below
- **Max feedback latency:** targeted run, not measured — record on first execution

---

## Per-Task Verification Map

Seeded at plan time from `93-RESEARCH.md` § Phase Requirements → Test Map. Plan and task IDs are
assigned when PLAN.md files are written; rows are keyed by requirement until then.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | COMP-03 | — | N/A — malformed payload handling, not a trust boundary | unit (plain construction, no `BasePlatformTestCase`) | `./gradlew test --tests "com.basis.bbj.intellij.composer.*"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | COMP-04 | — | Server-owned verdict gates the write; no client-authored rule | source guard + vitest | `./gradlew test --tests "*.ComposerFieldValidationSourceGuardTest"` | ⚠️ guard exists, needs extension; vitest ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | COMP-05 | — | Malformed LS payload aborts the edit rather than throwing | unit + `ComposerNoticesTest` | `./gradlew test --tests "*.ComposerNoticesTest" --tests "*.ComposerLauncher*"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | COMP-06 | — | N/A — behaviour-preserving consolidation | source guard (2 re-pointed + 1 new base guard) | `./gradlew test --tests "*.ComposerDialogRefreshSourceGuardTest" --tests "*.ComposerFieldValidationSourceGuardTest"` | ✅ both exist | ⬜ pending |
| TBD | TBD | TBD | COMP-07 | — | N/A — behaviour-preserving consolidation | new source guard for the shared Swing-helper home | `./gradlew test --tests "*SwingHelper*SourceGuardTest"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | COMP-08 | — | N/A — behaviour-preserving consolidation | source guard re-pointed + `IntentionDescriptionResourcesTest` unmodified | `./gradlew test --tests "*.ComposerIntentionPreviewSourceGuardTest" --tests "*.IntentionDescriptionResourcesTest"` | ✅ both exist | ⬜ pending |
| TBD | TBD | TBD | COMP-09 | — | N/A — behaviour-preserving consolidation | 3 existing per-action guards re-pointed + 1 new guard covering all 6 | `./gradlew test --tests "*.BbjCompose*ActionSourceGuardTest"` | ⚠️ 3/6 exist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] A test (or one parameterized test) constructing each of the 6 dialogs with a non-null `catalogs`
      whose relevant sub-list(s) are null — proves COMP-03 without a live IDE
- [ ] vitest coverage of `setoptsPreview()`'s new `valid` / `rawTailError` computation in
      `bbj-vscode/test/` — locate or create the `setopts-catalog.ts` test file during planning
- [ ] A behavioural test feeding a length-≠-2 `flagsRange` / `eventMaskRange` / `hexRange` into
      `ComposerLauncher`'s apply paths, proving `MALFORMED_EDIT` fires instead of
      `ArrayIndexOutOfBoundsException`
- [ ] New source guard for the COMP-07 shared Swing-helper home — per D-12 it must be its own file
      with its own private helper copies, never importing a shared test utility
- [ ] New source guard covering all 6 `BbjCompose*Action` subclasses' delegation to the COMP-09 base —
      `BbjComposeMsgboxAction`, `BbjComposeAddWindowAction` and `BbjComposeAddChildWindowAction`
      currently have **zero** guard coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All six composers (MSGBOX, addWindow, addChildWindow, CVS, SETOPTS, SETOPTS-in-code) behave identically after consolidation, reached three ways each — lightbulb, editor context menu, cue click-through | COMP-03..COMP-09 (success criterion 5) | No live IntelliJ UI test coverage exists in CI — standing project constraint since v4.1 | Build both distributables from the phase's final tree (after any code-review fixes), install, then exercise 6 kinds × 3 entry points |
| D-02 / D-04 visual deltas: error text renders theme-aware red; a stalled preview renders red instead of gray | COMP-07 (via D-02, D-04) | Theme-dependent rendering; only observable in a running IDE in both Light and Darcula | Confirm in **both** themes. These are **intended** changes — report them as observed deltas, never as no-observable-delta |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency recorded from a real run (not inherited)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
