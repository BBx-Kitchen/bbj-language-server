---
phase: 122-release-ci-pipeline-hardening
plan: "04"
subsystem: infra
tags: [github-actions, composite-action, sha-pinning, permissions, concurrency, sticky-comment]

requires:
  - phase: 122-release-ci-pipeline-hardening
    provides: "plan 02's Gradle caching (pr-validation's Gradle block left untouched) and plan 03's check-action-pins-and-permissions.mjs checker, used here to verify every edited file"
provides:
  - "A shared, pinned composite action (.github/actions/node-setup) for Node setup with an optional npm cache and optional npm ci, used by every PR-side workflow"
  - "build.yml as the single unconditional PR gate: one install, build, lint, typecheck:test, one test run, the test VSIX, its sticky comment and per-PR cancellation; pr-vsix.yml deleted"
  - "pr-validation.yml and deploy-docs.yml on the shared action with least-privilege permissions and (pr-validation) its own concurrency group distinct from build.yml's"
  - "workflow-hygiene.yml's two jobs set up Node through the action, install-free and uncached"
affects: [122-05, 122-06]

actuals:
  tokens: 4403
  tasks: 3
  commits: 3

tech-stack:
  added: ["local composite action (.github/actions/node-setup) — first in this repository"]
  patterns:
    - "actions/checkout stays every job's own first step; a local composite action can only be reached after checkout"
    - "job-level permissions block replaces the top-level one for that job, so contents: read must be repeated alongside a job's escalated scope (pull-requests: write, pages: read/write, id-token: write)"
    - "per-PR concurrency groups are named with the workflow as a prefix (build-<PR#>, pr-validation-<PR#>) so two PR workflows never cancel each other"

key-files:
  created:
    - .github/actions/node-setup/action.yml
  modified:
    - .github/workflows/workflow-hygiene.yml
    - .github/workflows/build.yml
    - .github/workflows/pr-validation.yml
    - .github/workflows/deploy-docs.yml

key-decisions:
  - "The composite action's Set up Node.js step carries the Node-22-toolchain rationale as a preceding comment (not inline on the node-version line), keeping the verify regex's line-anchored match clean while still documenting why 22 is pinned here."
  - "deploy-docs's build job keeps contents: read explicitly alongside pages: read (job-level permissions replaces, not merges with, the top-level block); the deploy job carries only pages: write and id-token: write, matching what actions/deploy-pages documents as its minimum."

requirements-completed: [CI-02, CI-06, CI-01, CI-03, CI-05]

coverage:
  - id: D1
    description: "The composite action exists once, pinned, and workflow-hygiene's two jobs set up Node through it install-free and uncached; both checkers report 0 findings"
    requirement: "CI-06"
    verification:
      - kind: other
        ref: "Task 1 verify block 1 (composite action shape) and block 2 (pin/permissions checker 0 findings on the action + workflow-hygiene.yml, secret checker 8 files 0 findings, wrapper checker 7 workflow files 0 findings)"
        status: pass
    human_judgment: false
  - id: D2
    description: "build.yml absorbs pr-vsix.yml and becomes the single unconditional PR gate: one install through the action, build/lint/typecheck gates, one test run, the test VSIX package/artifact/sticky comment carried over verbatim, its own concurrency group and a least-privilege token; pr-vsix.yml is deleted"
    requirement: "CI-02"
    verification:
      - kind: other
        ref: "Task 2 verify block 1 (build.yml shape: pr-vsix.yml gone, no paths filter, concurrency group, 9-step order, gate conditions, fork gate, head-SHA checkout, artifact settings, marker, no shell:/cd/four-space items), block 2 (byte-identical sticky-comment and VSIX-naming scripts against the base pr-vsix.yml), block 3 (pin/permissions checker 0 findings, workflow/job permissions contents=read and contents=read,pull-requests=write, wrapper checker 6 workflow files 0 findings), and a direct grep confirming npm ci appears 0 times outside the action"
        status: pass
    human_judgment: false
  - id: D3
    description: "pr-validation.yml keeps its trigger and path filter byte-identical and gains only the shared action, pins, permissions and its own concurrency group (distinct from build.yml's); plan 02's Gradle block is untouched"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "Task 3 verify block 1 (byte-identical on:-through-path-filter diff against the base, distinct concurrency group name, build-vscode's four-step shape, no npm ci/setup-node/node-version/shell: leftovers, plan 02's setup-gradle line still present)"
        status: pass
    human_judgment: false
  - id: D4
    description: "deploy-docs.yml keeps only contents: read at the top level, with pages: read on the build job and pages: write plus id-token: write on the deploy job; it adopts the action with the documentation working directory and lockfile path; the pages concurrency group is unchanged"
    requirement: "CI-05"
    verification:
      - kind: other
        ref: "Task 3 verify block 2 (pin/permissions checker's --print output for both job scopes, pages group and cancel-in-progress: false present, working-directory and cache-dependency-path point at documentation, no npm ci/setup-node/node-version leftovers, npm run build step present)"
        status: pass
    human_judgment: false
  - id: D5
    description: "All three checkers report 0 findings across the four PR-side workflows and the action, no drift marker (four-space step item, unnamed checkout, shell:, cd, old Node step names) remains, and the hygiene suites, whole suite and the planning-identifier/closing-keyword scans all agree with the phase base"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/workflow-secret-hygiene.test.ts, gradle-wrapper-hygiene.test.ts, action-pins-and-permissions-hygiene.test.ts (37/37 passed)"
        status: pass
      - kind: other
        ref: "Task 3 verify block 3 (PR-side tree pin/permissions checker 0 findings, secret checker 7 files 0 findings, wrapper checker 6 workflow files 0 findings), block 5 (whole-suite JSON report: numFailedTests=0, numPassedTests=3707, same single pre-existing failed-suite name as suite-base-failed.txt), block 6 (planning-id diff grep, closing-keyword commit-body grep, file-scope name-only diff, and uncommitted-change porcelain check, all clean)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-29
status: complete
---

# Phase 122 Plan 04: Composite Node-setup action, single PR gate, and pinned/scoped PR-side workflows Summary

**A new pinned composite action (`.github/actions/node-setup`) now provides the one shared Node preamble; `build.yml` absorbed `pr-vsix.yml` into the single unconditional PR gate with a per-PR cancellation group, and `pr-validation.yml`/`deploy-docs.yml`/`workflow-hygiene.yml` all adopted the action with least-privilege permissions — leaving 0 findings across three independent hygiene checkers and an unchanged whole-suite result.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-29T16:47:22Z (continuing directly from plan 03's completion)
- **Completed:** 2026-09-29T16:56:00Z (approximate — sequential in-context execution, no worktree)
- **Tasks:** 3
- **Files modified:** 6 (1 created, 4 modified, 1 deleted)

## Accomplishments
- `.github/actions/node-setup/action.yml`: a composite action with four string inputs (`working-directory` default `bbj-vscode`, `cache-dependency-path` default `bbj-vscode/package-lock.json`, `install` default `'true'`, `cache` default `'true'`), one pinned `actions/setup-node` step whose `cache`/`cache-dependency-path` expressions go empty when `cache` is `'false'`, and one `npm ci` step gated on `inputs.install == 'true'` with `shell: bash` and `working-directory: ${{ inputs.working-directory }}`.
- `workflow-hygiene.yml`'s two jobs: `Checkout` pinned, `Set up Node` now calls the action with `install: 'false'` and `cache: 'false'` (the checkers are zero-dependency scripts) — no `setup-node` or Node-version line remains in the file.
- `build.yml` rewritten whole: absorbed `pr-vsix.yml`'s head-SHA checkout, VSIX packaging script, artifact upload settings and sticky-comment script byte-for-byte (confirmed by a whitespace-normalised diff against the base file), added its own `build-${{ github.event.pull_request.number }}` concurrency group, dropped the per-step `cd bbj-vscode`/`shell: bash` pattern in favor of `working-directory:` and the shared action, and kept the existing `steps.build.outcome`/`success() || failure()` gate conditions. `pr-vsix.yml` deleted via `git rm`.
- `pr-validation.yml`: trigger and path filter left byte-identical (confirmed by diff against the base); gained a `pr-validation-${{ github.event.pull_request.number }}` concurrency group (a distinct name from `build.yml`'s, so the two PR workflows never cancel each other), a top-level `permissions: contents: read`, pinned `Checkout`/`Upload language server`/`Download language server` steps, and `build-vscode`'s install+build collapsed into `Set up Node` (the action) + one `Build` step running `npm run build`. Plan 02's `validate-intellij` Gradle block (Java, wrapper-validation, setup-gradle, Plugin Verifier cache, both `gradlew` steps) is untouched.
- `deploy-docs.yml`: top-level `permissions:` narrowed to `contents: read` only; the `build` job gained its own `contents: read, pages: read` block (`configure-pages` reads the Pages site) and the `deploy` job gained `pages: write, id-token: write` (what `deploy-pages` documents as its minimum); `Setup Node.js` + `Install dependencies` collapsed into one `Set up Node` step using the action with `working-directory: documentation` and `cache-dependency-path: documentation/package-lock.json`; the `pages` concurrency group is unchanged.
- Three independent verify passes across the four workflows and the action: `check-action-pins-and-permissions.mjs` (0 findings, correct workflow/job permission summaries via `--print`), `check-workflow-secrets.mjs` (0 findings across 7/8 files depending on the target set), `check-gradle-wrapper.mjs` (stable at "1 wrapper(s), N workflow file(s), 5 Gradle job(s), 0 findings" as the workflow count dropped from 7 to 6 with `pr-vsix.yml`'s deletion).
- 37/37 targeted hygiene tests pass (`workflow-secret-hygiene.test.ts`, `gradle-wrapper-hygiene.test.ts`, `action-pins-and-permissions-hygiene.test.ts`); the whole suite reports `numFailedTests=0`, `numPassedTests=3707`, and the same single pre-existing failed-suite name (`installed-extension-e2e.test.ts`) as `suite-base-failed.txt`.
- A diff-scoped grep for planning identifiers (`D-NN`, `122-NN`, requirement-family IDs, phase numbers) across every added `.github` line, a commit-body grep for GitHub closing keywords, a name-only diff confirming only this plan's six files changed under `.github`, and a final `git status --porcelain` on `.github`/`bbj-vscode` all came back clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: The composite action exists and workflow-hygiene's two jobs set up Node through it, pinned, with the checkers green on both** - `bf508fda` (ci)
2. **Task 2: build.yml becomes the single PR gate with the test VSIX and sticky comment, and pr-vsix.yml is deleted** - `b326ef22` (ci)
3. **Task 3: pr-validation and deploy-docs adopt the action, pins, least-privilege permissions and pr-validation a concurrency group, and the PR-side tree checks clean** - `1b0a8a29` (ci)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP)

## Files Created/Modified
- `.github/actions/node-setup/action.yml` — new composite action: shared, pinned Node setup with optional npm cache and optional `npm ci`
- `.github/workflows/workflow-hygiene.yml` — both jobs' checkout pinned; Node setup routed through the action, install-free and uncached
- `.github/workflows/build.yml` — rewritten as the single unconditional PR gate (build/lint/typecheck/test/VSIX/comment), own concurrency group, least-privilege job token
- `.github/workflows/pr-vsix.yml` — deleted (merged into `build.yml`)
- `.github/workflows/pr-validation.yml` — trigger/filter unchanged; gained the action, pins, top-level `permissions`, own concurrency group
- `.github/workflows/deploy-docs.yml` — top-level permissions narrowed to `contents: read`; Pages scopes moved to the jobs that need them; adopted the action for `documentation/`

## Decisions Made
See `key-decisions` in the frontmatter: the Node-22 rationale as a preceding (not inline) comment on the setup-node step, and deploy-docs's build job repeating `contents: read` alongside `pages: read` since a job-level `permissions:` block replaces rather than merges with the top-level one.

## Deviations from Plan

None - plan executed exactly as written, including its own explicit staging/commit ordering (Task 1 commits the action + workflow-hygiene.yml alone; Task 2 commits build.yml + the pr-vsix.yml deletion together; Task 3 commits pr-validation.yml + deploy-docs.yml together).

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Roadmap criterion 3 (PR gate half): `build.yml` no longer duplicates another PR workflow's build and test, carries its own concurrency group, and every PR to `main` still passes a build-and-test gate via its unconditional trigger.
- Roadmap criterion 2 (PR half): the Node preamble is defined once (the composite action) and used by every PR-side workflow with npm caching; a milestone-PR rerun with an unchanged lockfile should show "Cache restored" in the `Set up Node.js` step of `build.yml` and `pr-validation.yml`.
- Roadmap criterion 1 (PR half): least-privilege permissions and SHA pins are in place across these four workflows and the action, verified by the same checker plan 03 built.
- Watch items for the user, once this branch reaches a real PR and then merges to `main`:
  - On the milestone PR itself: `build.yml` and `pr-validation.yml` both exercise the new action; a second push with an unchanged lockfile should show a Node/npm cache restore, not a cold resolve.
  - The sticky comment (`<!-- pr-vsix -->` marker) should update in place across pushes and link a `vsix-pr<N>` artifact from `build.yml`, not a separate `pr-vsix.yml` run (that workflow no longer exists).
  - After the merge, the next documentation change should deploy through `deploy-docs.yml` with the job-scoped Pages permissions (`build`: `contents: read, pages: read`; `deploy`: `pages: write, id-token: write`) rather than the old workflow-wide grant.
- Plans 05 and 06 are unblocked: plan 05 owns `preview.yml`/`manual-release.yml` (untouched by this plan, confirmed by the `HEAD~3..HEAD` diff-stat check) and the packaging/manifest work; plan 06 wires `check-action-pins-and-permissions.mjs` into `workflow-hygiene.yml` as a third job and adds the real-tree vitest case once every workflow (not just this plan's four) is pinned.

## Self-Check: PASSED

- `.github/actions/node-setup/action.yml`, `.github/workflows/workflow-hygiene.yml`, `.github/workflows/build.yml`, `.github/workflows/pr-validation.yml`, `.github/workflows/deploy-docs.yml` all found on disk; `.github/workflows/pr-vsix.yml` confirmed absent.
- Commits `bf508fda`, `b326ef22`, `1b0a8a29` all found in `git log --oneline --all`.
- All 37 targeted hygiene tests pass; whole suite matches the phase base (`numFailedTests=0`, identical single pre-existing failed-suite name).

---
*Phase: 122-release-ci-pipeline-hardening*
*Completed: 2026-09-29*
