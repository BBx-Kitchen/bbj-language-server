---
phase: 122-release-ci-pipeline-hardening
plan: "05"
subsystem: infra
tags: [github-actions, sha-pinning, permissions, release-workflow, npm-cache, gradle-cache]

requires:
  - phase: 122-release-ci-pipeline-hardening
    provides: "plan 04's shared .github/actions/node-setup composite action and plan 03's check-action-pins-and-permissions.mjs checker, both used to scope and verify preview.yml and manual-release.yml here"
provides:
  - "preview.yml and manual-release.yml both declare a top-level contents: read permissions block, with contents: write only on the jobs that push a commit, push a tag, or create a release (bump-version; tag-release and create-release)"
  - "Both verify jobs set up Node through the shared node-setup action (cached) instead of a bare setup-node step, and both token-holding publish-vscode jobs use the action with cache 'false' for a cold install"
  - "Both verify jobs run npm run lint and npm run typecheck:test after Build and before Test, closing the gap left by narrowing vscode:prepublish in an earlier plan"
  - "Every uses reference in both files is pinned to a commit SHA with a version comment; the whole six-workflow-plus-action tree now reports 0 findings on all three hygiene checkers"
affects: [122-06]

actuals:
  tokens: 2446
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A release workflow's top-level permissions block stays contents: read; only the job whose run body contains a git push or gh release line gets its own job-level contents: write block, checked mechanically by the pin/permissions checker's push-scope rule"
    - "The verify job's version bump (or version-set) step keeps its existing position between npm ci (now inside the shared action) and the explicit Build step, so the packaged VSIX always carries the bumped/set version"
    - "The two Marketplace-token jobs (publish-vscode in both files) call the shared node-setup action with cache: 'false' and no separate install step; no cache-writing step (actions/cache, setup-gradle without cache-disabled) exists in any job that also holds a marketplace secret"

key-files:
  modified:
    - .github/workflows/preview.yml
    - .github/workflows/manual-release.yml

key-decisions:
  - "The top-level permissions comment in each file is a short, project-specific one-liner ('Only jobs that push a commit, a tag or create a release escalate their own scope; everything else reads.') rather than a copy of D-19's prose, keeping workflow comments free of planning identifiers per the executor shell rules."
  - "bump-version's and tag-release's new permissions blocks carry a one-line comment naming what the job does (pushes the bump commit; pushes the release commit and tag) rather than repeating the longer existing comments already present on their Commit steps."

requirements-completed: [CI-01, CI-03, CI-05, CI-06, CI-08]

coverage:
  - id: D1
    description: "preview.yml: top-level contents: read, contents: write only on bump-version, verify uses the shared action (cached) with lint/type-check gates after Build and before Test, publish-vscode uses the action cold (cache: 'false'), and every uses reference is pinned"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "Task 1 verify block 1 (permissions/pin checker 0 findings, --print job-scope lines for all five jobs, publish-preview concurrency intact), block 2 (verify/publish-vscode/publish-intellij/bump-version step-name order, cache 'false' on publish-vscode, no leftover setup-node/node-version/npm ci, two node-setup uses lines), block 3 (run-body set diff: only the two npm ci lines removed, only npm run lint and npm run typecheck:test added, every base comment line still present)"
        status: pass
    human_judgment: false
  - id: D2
    description: "manual-release.yml: the same treatment with contents: write only on tag-release and create-release, and the whole six-workflow-plus-action tree checks clean on all three hygiene checkers with the suite unchanged"
    requirement: "CI-01, CI-03, CI-05, CI-06, CI-08"
    verification:
      - kind: other
        ref: "Task 2 verify block 1 (permissions/pin checker --print job-scope lines for all six jobs), block 2 (run-body/comment diff against base), block 3 (whole-tree pin scan '7 file(s) ... 6 workflow(s), 0 findings', node-setup used everywhere, node-version stated once in the action, secret checker 0 findings, gradle-wrapper checker '1 wrapper(s), 6 workflow file(s), 5 Gradle job(s), 0 findings')"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/workflow-secret-hygiene.test.ts, gradle-wrapper-hygiene.test.ts, action-pins-and-permissions-hygiene.test.ts (37/37 passed)"
        status: pass
      - kind: other
        ref: "Task 2 verify block 5 (whole-suite JSON report: numFailedTests=0, numPassedTests=3707, same single pre-existing failed-suite name test/functional/installed-extension-e2e.test.ts as suite-base-failed.txt), block 6 (planning-identifier diff grep, closing-keyword commit-body grep, file-scope name-only diff, uncommitted-change porcelain check — all clean)"
        status: pass
    human_judgment: false

duration: 34min
completed: 2026-09-29
status: complete
---

# Phase 122 Plan 05: Release workflow permissions, shared Node setup and lint/type-check gates Summary

**`preview.yml` and `manual-release.yml` now run with a read-only token except on the jobs that push a commit, push a tag or create a release, install through the shared `node-setup` action (cached in `verify`, cold in the token-holding `publish-vscode`), gate on the same lint and type-check steps as the PR build, and pin every `uses:` reference — closing the release-side half of CI-01, CI-03, CI-05, CI-06 and CI-08 with the whole six-workflow-plus-action tree reporting 0 findings on all three hygiene checkers.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-29T16:58:51Z (continuing directly from plan 04's completion)
- **Completed:** 2026-09-29T17:32:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `preview.yml`: a top-level `permissions: contents: read` block sits between the existing `concurrency:` block and `jobs:`; `bump-version` is the only job that escalates, with its own `contents: write` block. `verify`'s `Checkout` is named and pinned, `Set up Node` now calls `./.github/actions/node-setup` (no inputs — cached npm install), the old `Install deps and build` step (a bare `npm ci`) is gone since the action covers it, and `Install CLI Tools`/`Bump patch version` keep their exact position so the bump still lands between `npm ci` and `Build`. `Lint` and `Type-check test tree` steps run after `Build` and before `Test`, mirroring `build.yml`'s gates. `Upload language server`, `Upload VS Code extension` and `Upload IntelliJ plugin` are pinned to the `upload-artifact` SHA.
- `preview.yml`'s `publish-vscode` and `publish-intellij` jobs both get a named, pinned `Checkout`; `publish-vscode`'s `Set up Node` + `Install dependencies` steps collapse into one `Set up Node` call to the shared action with `cache: 'false'` (cold install, no cache restore next to the `VSCE_PAT` secret); `Download VS Code extension` and `Download language server` are pinned to the `download-artifact` SHA.
- `manual-release.yml` receives the identical treatment: top-level `contents: read`; `verify`'s `Checkout` named/pinned, `Set up Node` through the action, `Install dependencies` deleted, `Install tools`/`Validate version input`/`Set package.json version` unchanged in position so the version set still sits between `npm ci` and `Build`; `Lint` and `Type-check test tree` added after `Build`; all three upload steps pinned. `publish-vscode` collapses to the action with `cache: 'false'`; `publish-intellij`'s checkout and download are pinned. `tag-release` gains a new `permissions: contents: write` block (it previously inherited the repository default with no explicit scope) alongside a named, pinned `Checkout`; `create-release`'s existing `contents: write` block, checkout and both downloads are pinned, its `Create GitHub Release` step untouched.
- Three independent verify passes across the whole tree (`.github/workflows` + `.github/actions/node-setup`): `check-action-pins-and-permissions.mjs` reports `Scanned 7 file(s), ... 6 workflow(s), 0 findings.`; `check-workflow-secrets.mjs` reports `0 findings` across all 7 files; `check-gradle-wrapper.mjs` reports `1 wrapper(s), 6 workflow file(s), 5 Gradle job(s), 0 findings.`.
- 37/37 targeted hygiene tests pass; the whole suite reports `numFailedTests=0`, `numPassedTests=3707`, and the same single pre-existing failed-suite name (`test/functional/installed-extension-e2e.test.ts`) as the phase base's `suite-base-failed.txt`.
- A diff-scoped grep for planning identifiers across every added `.github` line since the phase base, a commit-body grep for GitHub closing keywords, a name-only diff confirming each commit touched exactly one file, and a final `git status --porcelain` on `.github`/`bbj-vscode` all came back clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: preview.yml publishes from a read-only token with write only on bump-version, sets up Node through the shared action, cold in the token job, and gates on lint and type-check** - `8b1d3da4` (ci)
2. **Task 2: manual-release.yml gets the same treatment with write only on tag-release and create-release, and the whole workflow tree checks clean** - `dba463d9` (ci)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP)

## Files Created/Modified
- `.github/workflows/preview.yml` — least-privilege permissions (write only on `bump-version`), shared Node setup (cached in `verify`, cold in `publish-vscode`), lint/type-check gates, pinned references
- `.github/workflows/manual-release.yml` — least-privilege permissions (write only on `tag-release` and `create-release`), shared Node setup, lint/type-check gates, pinned references

## Decisions Made
See `key-decisions` in the frontmatter: short project-specific one-line comments on the new permissions blocks (naming what each job does, not restating the plan's decision prose), keeping the two workflow files free of planning identifiers.

## Deviations from Plan

None - plan executed exactly as written, including the staging/commit ordering (Task 1 commits `preview.yml` alone; Task 2 commits `manual-release.yml` alone).

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

- Roadmap criterion 1: both release workflows now declare least-privilege permissions and every reference is pinned; the whole-tree scan (six workflows and the composite action) is clean.
- Roadmap criterion 2: both verify jobs use the shared Node setup with npm caching (Gradle caching from an earlier plan); watch for a cache hit in the `Set up Node.js` step on the first preview run after the merge with an unchanged lockfile.
- Roadmap criterion 4 (CI half): both verify jobs keep the version bump/set between `npm ci` and `Build`, so the packaged VSIX carries the bumped/set version — plan 06's scratch packaging run is expected to confirm this end to end.
- **Watch items for the user after the milestone PR merges to `main` (these workflows cannot be exercised before the merge, per the phase's own out-of-scope note):**
  - The first `preview.yml` run after the merge: `verify` green including the new `Lint` and `Type-check test tree` steps; `bump-version` pushes the bump commit; both `publish-vscode` and `publish-intellij` publish green; the `language-server`, `vscode-extension` and `bbj-intellij-<version>` artifacts are all present.
  - On the run after that, `verify`'s `Set up Node` step should show a restored npm cache (not a cold resolve) once `bump-version`'s commit has landed on `main`.
  - `manual-release.yml` is checked statically only in this plan; its next dispatched release is its first real run under the new scoping — watch `tag-release`'s new `contents: write` scope succeed at both `git push` calls, and `create-release`'s `gh release create` succeed with both artifacts attached.
- Plan 06 is unblocked: it owns wiring `check-action-pins-and-permissions.mjs` into `workflow-hygiene.yml` as a permanent CI job and any remaining real-tree vitest coverage, now that every workflow in the tree (not just this plan's two) is pinned and scoped.

## Self-Check: PASSED

- `.github/workflows/preview.yml` and `.github/workflows/manual-release.yml` both found on disk with the expected content (`run: npm run typecheck:test` in preview.yml, `run: npm run lint` in manual-release.yml).
- Commits `8b1d3da4` and `dba463d9` both found in `git log --oneline --all`.
- All 37 targeted hygiene tests pass; whole suite matches the phase base (`numFailedTests=0`, identical single pre-existing failed-suite name); the whole-tree pin/permissions, secret and Gradle-wrapper checkers all report 0 findings.

---
*Phase: 122-release-ci-pipeline-hardening*
*Completed: 2026-09-29*
