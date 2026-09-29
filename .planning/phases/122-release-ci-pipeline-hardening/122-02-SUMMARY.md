---
phase: 122-release-ci-pipeline-hardening
plan: "02"
subsystem: infra
tags: [github-actions, gradle, setup-gradle, caching, sha-pinning, intellij]

requires:
  - phase: 122-release-ci-pipeline-hardening
    provides: "plan 01's minified-only packaging and manifest hygiene (esbuild keepNames, narrowed activationEvents) — this plan's edits sit in the same three workflow files' Gradle blocks, no overlap"
provides:
  - "All five Gradle-invoking jobs (pr-validation validate-intellij, preview verify/publish-intellij, manual-release verify/publish-intellij) set up Gradle through a pinned gradle/actions/setup-gradle after the inline wrapper-validation step, never through setup-java's cache input"
  - "The three verify-style jobs cache Gradle User Home via setup-gradle's Enhanced Caching provider with the IntelliJ IDE downloads and their extracted transforms excluded (gradle-home-cache-excludes, four lines); only the default branch writes, pull requests read (setup-gradle's own default)"
  - "Both publish-intellij jobs (preview, manual-release) run setup-gradle with cache-disabled: true and no restore/save step, so no cache content reaches the job holding the JetBrains Marketplace token"
  - "actions/setup-java, gradle/actions/wrapper-validation, gradle/actions/setup-gradle and actions/cache are SHA-pinned with version comments in all three files; check-gradle-wrapper.mjs still reports 5 Gradle jobs and 0 findings"
affects: [122-03, 122-04, 122-05, 122-06]

actuals:
  tokens: 1982
  tasks: 3
  commits: 1

tech-stack:
  added: ["gradle/actions/setup-gradle@v6.4.0 (SHA-pinned, same commit as the already-adopted wrapper-validation)"]
  patterns: ["Gradle wrapper-validation must precede setup-gradle in the job (check-gradle-wrapper.mjs treats the setup-gradle uses: line itself as the first Gradle invocation)", "publish jobs holding a marketplace token always set cache-disabled: true with no restore/save step"]

key-files:
  created: []
  modified:
    - .github/workflows/pr-validation.yml
    - .github/workflows/preview.yml
    - .github/workflows/manual-release.yml

key-decisions:
  - "User pre-answered the Task 1 checkpoint during /gsd-plan-phase 122 (2026-09-29): option-a, setup-gradle's default Enhanced Caching provider with gradle-home-cache-excludes, accepting the Gradle Technologies Terms of Use for this public repository. Recorded verbatim as `A` in /home/coder/repos/tmp/phase-122/gradle-cache-option.txt (untracked scratch, not committed) before any workflow edit."
  - "The four gradle-home-cache-excludes lines cover both the Gradle 9 layout (caches/*/transforms) and the older layout (caches/transforms-*) since the local Gradle 9.7.1 cache used for evidence still carries stale transforms-4 content alongside 9.7.1/transforms — excluding only one form would leave the other form's IDE-derived transforms cached."
  - "cache-read-only is left unset everywhere (setup-gradle's own default already implements 'main writes, PRs read'); no workflow overrides it."

requirements-completed: []

coverage:
  - id: D1
    description: "pr-validation.yml's validate-intellij job validates the wrapper then sets up Gradle through pinned setup-gradle with the IDE downloads excluded from the cache"
    requirement: "CI-05"
    verification:
      - kind: other
        ref: "Task 2 verify block 1 (validate-intellij Gradle block OK) and block 2 (guards OK, check-gradle-wrapper.mjs reports 5 Gradle jobs, 0 findings)"
        status: pass
    human_judgment: false
  - id: D2
    description: "preview.yml's and manual-release.yml's verify jobs cache Gradle the same way; both publish-intellij jobs set up Gradle with caching disabled so the Marketplace-token job never loads the cache"
    requirement: "CI-05"
    verification:
      - kind: other
        ref: "Task 3 verify block 1 (release Gradle blocks OK) and block 2 (unchanged parts and wrapper checker OK)"
        status: pass
    human_judgment: false
  - id: D3
    description: "actions/setup-java, gradle/actions/wrapper-validation, gradle/actions/setup-gradle and actions/cache carry a commit-SHA pin with a version comment in all three files; no mutable-tag Gradle/cache reference remains"
    requirement: "CI-03"
    verification:
      - kind: other
        ref: "Task 3 verify block 2's mutable-tag grep (uses: (actions/setup-java|gradle/actions/[a-z-]+|actions/cache)@v[0-9] returns 0 matches across the three files)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The workflow-secret-hygiene and gradle-wrapper-hygiene suites, the whole test suite, and the planning-identifier/commit-hygiene checks all agree with the phase base"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/workflow-secret-hygiene.test.ts, bbj-vscode/test/gradle-wrapper-hygiene.test.ts (24/24 passed)"
        status: pass
      - kind: other
        ref: "whole-suite JSON report vs suite-base-failed.txt (numFailedTests=0, identical single pre-existing failed-suite name), diff-scoped planning-id grep and closing-keyword grep (both 0 matches)"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-29
status: complete
---

# Phase 122 Plan 02: Gradle caching via setup-gradle, IDE downloads excluded, publish jobs cold Summary

**All five Gradle jobs across `pr-validation.yml`, `preview.yml` and `manual-release.yml` now run a SHA-pinned `gradle/actions/setup-gradle` after wrapper validation — the three verify-style jobs cache Gradle User Home with the IntelliJ IDE downloads excluded via the user-approved Enhanced Caching provider, and both Marketplace-token `publish-intellij` jobs run it with `cache-disabled: true`.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-29T16:02:32Z (continuing directly from plan 01's completion)
- **Completed:** 2026-09-29T16:24:00Z (approximate — sequential in-context execution, no worktree)
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Recorded the user's pre-answered Task 1 decision (option-a, Enhanced Caching with `gradle-home-cache-excludes`) to `/home/coder/repos/tmp/phase-122/gradle-cache-option.txt` before touching any workflow file, per the checkpoint's "PRE-ANSWERED" instruction — no pause, no re-asking.
- `pr-validation.yml`'s `validate-intellij` job: `actions/setup-java` and `gradle/actions/wrapper-validation` pinned to their commit SHAs (no Gradle cache input added to setup-java), then a new `Set up Gradle` step using the pinned `gradle/actions/setup-gradle` with a four-line `gradle-home-cache-excludes` covering the IDE archive group (`caches/modules-2/files-2.1/idea`), the `com.jetbrains.intellij.*` module group, and both Gradle-9-era (`caches/*/transforms`) and older (`caches/transforms-*`) extracted-transform layouts. `Cache Plugin Verifier downloads` pinned to `actions/cache`'s SHA with its 13-line comment left byte-identical.
- `preview.yml`'s and `manual-release.yml`'s `verify` jobs received the identical treatment (same pin set, same four-line excludes, same comment).
- `preview.yml`'s and `manual-release.yml`'s `publish-intellij` jobs each gained a `Set up Gradle` step with `with: cache-disabled: true` only, right after the pinned wrapper-validation step — no restore/save step, no exclude config, so the proprietary Enhanced Caching component never loads next to `JETBRAINS_MARKETPLACE_TOKEN`.
- Local evidence of the exclude paths' real weight, written to `/home/coder/repos/tmp/phase-122/gradle-excludes-local.txt` (this container's own Gradle 9.7.1 cache, the same wrapper CI uses): `idea` 4.9G, `com.jetbrains.intellij.idea` 757M, `com.jetbrains.intellij.java` 620K, `com.jetbrains.intellij.platform` 5.0M, `com.jetbrains.intellij.tools` 96K, three Gradle-version `transforms` directories (`8.13` 5.4G, `8.14.5` 20K, `9.7.1` 5.4G) and the older `transforms-4` 2.9G — several gigabytes each, confirming the exclude list targets real weight against the 10 GB repository cache limit.
- `check-gradle-wrapper.mjs` still reports `1 wrapper(s), 7 workflow file(s), 5 Gradle job(s), 0 findings.` after every edit — wrapper-validation stays inline and ahead of `setup-gradle` in every job, satisfying the checker's "setup-gradle counts as the first Gradle invocation" rule.
- `workflow-secret-hygiene.test.ts` and `gradle-wrapper-hygiene.test.ts` both pass (24/24); the whole suite matches the phase base exactly (`numFailedTests=0`, `numPassedTests=3694`, the same single pre-existing failed-suite name `installed-extension-e2e.test.ts`, unchanged from plan 01's own run).
- No mutable action tag (`@v4`, `@v6`, etc.) remains for `setup-java`, any `gradle/actions/*`, or `actions/cache` in the three files; every reference is a 40-hex commit SHA with a `# vX.Y.Z` comment.

## Task Commits

1. **Task 1: Choose how setup-gradle caches Gradle User Home without the IntelliJ IDE downloads** — no commit (checkpoint pre-answered; only writes the untracked scratch decision file, no workflow edit)
2. **Task 2: pr-validation's validate-intellij job sets up Gradle through a pinned setup-gradle after wrapper validation** — held uncommitted per the plan's own instruction ("do not commit yet; Task 3 commits all three files together")
3. **Task 3: preview and manual-release verify jobs cache Gradle the same way, both publish-intellij jobs set up Gradle with caching disabled, and the three files are committed** - `4c5da4b4` (ci)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP)

## Files Created/Modified
- `.github/workflows/pr-validation.yml` — pinned setup-java/wrapper-validation/actions-cache; added `Set up Gradle` (option-a excludes) to `validate-intellij`
- `.github/workflows/preview.yml` — same pin/exclude treatment on `verify`; added `Set up Gradle` (`cache-disabled: true`) to `publish-intellij`
- `.github/workflows/manual-release.yml` — same pin/exclude treatment on `verify`; added `Set up Gradle` (`cache-disabled: true`) to `publish-intellij`

## Decisions Made
- The user's pre-answered choice: **"Enhanced Caching (Recommended)"** — option-a, setup-gradle's default proprietary provider with `gradle-home-cache-excludes`, recorded 2026-09-29 during `/gsd-plan-phase 122`, accepting the Gradle Technologies Terms of Use for this public repository (free for public repos; Gradle states only cache-key metadata is used; never loaded in either token-holding `publish-intellij` job).
- See `key-decisions` in the frontmatter for the exclude-pattern rationale (both Gradle-9 and legacy transforms layouts) and the `cache-read-only` no-override decision.

## Deviations from Plan

None - all three tasks executed exactly as written, including the plan's own explicit "hold Task 2's edit uncommitted, Task 3 commits all three files together" instruction (followed as authored, not treated as a deviation from the generic tracer-commit convention).

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Post-Merge Watch Item

After this branch merges to `main`, watch the first `preview.yml` run:
- **Cache size:** the `verify` job's `setup-gradle` step summary should report the Gradle User Home cache entry size. For option A, a multi-gigabyte entry means one of the four exclude patterns did not match the runner's actual cache layout (RESEARCH.md's Open Question 1 — the action's own docs do not spell out the exact glob-matching semantics for `gradle-home-cache-excludes`).
- **Cache restore on the next PR:** a pull request opened after that first `main` run should show a Gradle cache **restore** (not a cold resolve) in `pr-validation.yml`'s `validate-intellij` job, confirming the "main writes, PRs read" default is actually taking effect end-to-end.
- Neither of these can be verified from this branch — `preview.yml` only runs on push to `main` and this session cannot dispatch it without publishing to both marketplaces (per the standing v4.7 constraint on Phase 122).

## Next Phase Readiness
- Roadmap criterion 2 (Gradle half): all five Gradle jobs cache via `setup-gradle`, with the two token-holding jobs cold and the three verify-style jobs excluding the IntelliJ IDE downloads. The cache-hit observation itself is deferred to the post-merge watch item above (cannot be produced from a branch).
- Roadmap criterion 1 (partial): the Java/Gradle/cache references in these three files are now SHA-pinned with version comments; the remaining `actions/checkout`, `download-artifact`, `upload-artifact`, Node setup and `github-script` pins in these same files, plus the composite-preamble and hygiene-checker work, belong to plans 04/05/06 as noted in this plan's own prohibitions.
- Plans 03-06 are unblocked and can proceed against this tree; no file this plan touched needs revisiting by them for the Gradle blocks specifically.

## Self-Check: PASSED

- `.github/workflows/pr-validation.yml`, `.github/workflows/preview.yml`, `.github/workflows/manual-release.yml` all found on disk.
- Commit `4c5da4b4` found in `git log --oneline --all`.

---
*Phase: 122-release-ci-pipeline-hardening*
*Completed: 2026-09-29*
