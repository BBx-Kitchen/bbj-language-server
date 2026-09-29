---
phase: 122-release-ci-pipeline-hardening
plan: "03"
subsystem: infra
tags: [github-actions, sha-pinning, permissions, hygiene-checker, vitest]

requires:
  - phase: 122-release-ci-pipeline-hardening
    provides: "plan 01's minified-only packaging/manifest hygiene and plan 02's Gradle caching — this plan only adds a new checker + test, touching no workflow file either plan edited"
provides:
  - "bbj-vscode/tools/check-action-pins-and-permissions.mjs: a zero-dependency checker that fails when a uses: reference (in a workflow or a composite action) is not a 40-hex commit SHA with a `# vX.Y.Z` comment, when a workflow has no least-privilege top-level permissions: block or one that grants a write scope/write-all, or when a job whose run body runs git push/gh release create lacks an effective contents: write scope"
  - "One-level directory descent (a directory target's immediate subdirectories are checked for their own action.yml/action.yaml), so a single `.github/actions` target covers every composite action without listing each one"
  - "--print mode reporting each scanned file's workflow and job permissions summary and every uses: reference with its comment"
  - "bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts: 13 fixture-driven tests pinning every rule's CLI contract (exit codes 0/1/2, finding text, --print output)"
affects: [122-04, 122-05, 122-06]

actuals:
  tokens: 8852
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Third zero-dependency workflow-hygiene checker alongside check-workflow-secrets.mjs and check-gradle-wrapper.mjs: same line-based scanning, exported pure functions (expandTargets/scanTargets/inspectFile), exit codes 0/1/2, import.meta.url main() guard"
    - "attributeJobs copied verbatim from check-gradle-wrapper.mjs (not exported/shared) so both checkers and their tests stay independently pinned"

key-files:
  created:
    - bbj-vscode/tools/check-action-pins-and-permissions.mjs
    - bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts
  modified: []

key-decisions:
  - "Push-scope effective contents value is computed by a single function (job block, else top-level block, else 'default') so the job-level-only-pull-requests case ('none'), the no-block-at-all case ('default'), and the ordinary top-level-inherited case share one code path instead of three near-duplicates."
  - "Permissions parsing supports both the block-mapping form (key: value lines indented under permissions:) and the same-line scalar/flow-mapping forms (write-all, {}, { contents: write }), since the real manual-release.yml and preview.yml use the block form and D-19's own examples use flow mappings."
  - "A lint follow-up commit (5th commit) removed one unused test constant discovered only by npm run lint after the GREEN commit landed — tracked as a deviation below, not folded into the GREEN commit, per the plan's own allowance for 'a separate lint follow-up commit, if any'."

requirements-completed: []

coverage:
  - id: D1
    description: "check-action-pins-and-permissions.mjs enforces SHA pins with version comments on every uses: reference (workflows and composite actions), exempting local ./ references and run: body text"
    requirement: "CI-03"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts (6 Task 1 tests: clean fixture, mutable tag, missing/incomplete comment, short/uppercase SHA, local+run-body exemption, empty-directory refusal)"
        status: pass
      - kind: other
        ref: "real .github/workflows scan: exit 1, 46 findings, every mutable actions/* tag named including build.yml:15's actions/checkout@v4"
        status: pass
    human_judgment: false
  - id: D2
    description: "The checker requires a least-privilege top-level permissions: block on every workflow (missing block and write/write-all scopes are findings) and contents: write on every job whose run body pushes or creates a release, reported per the job's effective scope (write/read/none/default)"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts (7 Task 2 tests: missing block, top-level write/write-all + scoped-ok, four push-scope scope variants, composite pin-only, one-level descent, unrecognised/zero-uses refusal, --print)"
        status: pass
      - kind: other
        ref: "real .github/workflows scan: build.yml:1 missing-block finding, preview.yml bump-version job flagged contents: default; --print shows workflow-hygiene.yml's contents=read and manual-release.yml's create-release job contents=write"
        status: pass
    human_judgment: false
  - id: D3
    description: "The checker's own suite (13 tests), the whole test suite, lint and typecheck:test all agree with the phase base; only the two new files changed and no planning identifier or closing-keyword text leaked into the diff"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts (13/13 passed), whole-suite JSON report (numFailedTests=0, numPassedTests=3707, same single pre-existing failed suite as suite-base-failed.txt)"
        status: pass
      - kind: other
        ref: "npm run lint (0 problems), npm run typecheck:test (0 errors), diff-scope/closing-keyword/uncommitted-changes hygiene grep (all 0 matches)"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-09-29
status: complete
---

# Phase 122 Plan 03: Action-pin, permissions and push-scope hygiene checker Summary

**A third zero-dependency checker (`check-action-pins-and-permissions.mjs`) fails a scan of `.github/workflows` today with 46 findings — every mutable action tag, `build.yml`'s missing top-level `permissions:` block, and `preview.yml`'s `bump-version` job pushing with only the default (no) token scope — proving the permanent gate for roadmap criterion 1 works end to end before plans 04-06 fix the real workflows.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-29T16:27:00Z (continuing directly from plan 02's completion)
- **Completed:** 2026-09-29T16:38:00Z (approximate — sequential in-context execution, no worktree)
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `check-action-pins-and-permissions.mjs` follows `check-workflow-secrets.mjs`/`check-gradle-wrapper.mjs`'s exact shape: shebang, zero dependencies beyond node builtins and `collectRunBodies` from the secrets checker, exported `expandTargets`/`scanTargets`/`inspectFile`, exit codes 0 (clean) / 1 (findings) / 2 (refused empty or unrecognised scan), `import.meta.url` main() guard.
- SHA-pin rule: a `uses:` reference must match `owner/repo[/path]@<40 lowercase hex>` followed by a `# vX.Y.Z` comment; a `./`-prefixed local reference is exempt but still counted; text inside a `run:` body (via `collectRunBodies`) is never read as a reference.
- Permissions rule: a workflow (a file with a top-level `jobs:` key) with no top-level `permissions:` block is a finding at line 1; a top-level block granting any `write` scope or `write-all` is a finding at the `permissions:` line; job-level write scopes are allowed and unflagged.
- Push-scope rule: a job whose run body matches `git push` or `gh release` must resolve to an effective `contents: write` (job block, else top-level block, else `default` when no block exists anywhere) or it is a finding naming the job id and its actual scope (`write`/`read`/`none`/`default`).
- Composite-action rule: a file with a top-level `runs:` key (no `jobs:`) is checked for pins only; a directory target also checks each immediate subdirectory's `action.yml`/`action.yaml` one level down, so `.github/actions` (added in plan 04) will be covered without listing each action.
- `--print` reports `<file>: workflow permissions: contents=read` / `(missing)` / `none` (for `{}`), `<file>: job <id> permissions: contents=write,pull-requests=write` / `inherited` / `none`, and `<file>:<line>: uses <ref> <comment|(no comment)>` per reference.
- Against the current real `.github/workflows`, the checker exits 1 with 46 findings: every mutable `actions/*`/`github-script`/`configure-pages`/`upload-pages-artifact`/`deploy-pages` tag not yet pinned (the Gradle-related lines in `pr-validation.yml`, `preview.yml` and `manual-release.yml` were already pinned by plan 02, so none of those appear), a missing top-level `permissions:` block on `build.yml`, `pr-validation.yml`, `preview.yml` and `manual-release.yml` (`deploy-docs.yml`, `workflow-hygiene.yml` and `pr-vsix.yml` already carry one, confirmed by `--print`), and two under-scoped pushing/releasing jobs: `preview.yml`'s `bump-version` and `manual-release.yml`'s `tag-release`, both flagged `contents: default` since neither file has any permissions block at all.
- 13 fixture-driven tests (6 for the pin/comment/exemption/refusal rules, 7 for permissions/push-scope/composite/descent/unrecognised/`--print`) all pass; two end-to-end shell checks against the real tree (Task 1 and Task 2) confirm the checker is wired to reality, not just fixtures.

## Task Commits

Each task followed RED (failing test) → GREEN (implementation) TDD, plus one lint follow-up:

1. **Task 1 RED: add failing checks for SHA-pinned action references** - `5bb22de8` (test)
2. **Task 1 GREEN: check that action references are pinned to commit SHAs** - `a9fb4c55` (feat)
3. **Task 2 RED: cover workflow permissions, push scope and composite actions in the pin check** - `e63eec4e` (test)
4. **Task 2 GREEN: check workflow permissions and the token scope of pushing jobs** - `dd8e67fc` (feat)
5. **Lint follow-up: drop unused constant in the test file** - `5e60ede1` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP)

_TDD plan: each task's RED commit contains only the test file; each GREEN commit contains only the checker._

## Files Created/Modified
- `bbj-vscode/tools/check-action-pins-and-permissions.mjs` — the checker (`scanTargets`, `expandTargets`, `inspectFile` exported), 503 lines
- `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` — 13 fixture-driven CLI-contract tests, 486 lines

## Decisions Made
See `key-decisions` in the frontmatter: the single effective-scope function shared across all three push-scope cases, supporting both permissions syntaxes (block-mapping and same-line scalar/flow-mapping), and the lint follow-up commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed an unused test constant flagged by lint**
- **Found during:** post-Task-2 gate run (`npm run lint`)
- **Issue:** `WORKFLOWS_DIR`, declared for an originally-planned "real tree scans clean" test inside the vitest file, was left unused once that case was covered instead by the plan's own end-to-end shell verify commands (deliberately kept outside vitest per the plan's own must-haves: "the real-tree case is added in plan 06, once every workflow is pinned").
- **Fix:** Deleted the unused `const WORKFLOWS_DIR = ...` line and tightened the file's JSDoc comment to stop claiming real-tree coverage it doesn't have.
- **Files modified:** `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts`
- **Verification:** `npm run lint` exits 0; the 13-test suite still passes.
- **Committed in:** `5e60ede1`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** No scope change — a leftover from drafting the test file before finalizing which assertions live in vitest vs. the plan's own shell verify blocks.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Roadmap criterion 1's permanent scan exists and is proven against the real tree: it currently fails (46 findings), which is the expected, intended state before plans 04 and 05 pin and scope every real workflow.
- Plan 04 (composite action + `.github/actions`) and plan 05 (remaining workflow pins/permissions) can point this checker at their edited files as their own verification step.
- Plan 06 wires the checker into `workflow-hygiene.yml` as a third job and adds the real-tree vitest case once the tree is clean — neither is done in this plan by design (this plan's own prohibitions list `check-workflow-secrets.mjs`/`check-gradle-wrapper.mjs` and any workflow file as untouched, confirmed by the hygiene verify's diff-scope check).

## Self-Check: PASSED

- `bbj-vscode/tools/check-action-pins-and-permissions.mjs` and `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` both found on disk.
- Commits `5bb22de8`, `a9fb4c55`, `e63eec4e`, `dd8e67fc`, `5e60ede1` all found in `git log --oneline --all`.
- All 13 tests pass (`npx vitest run test/action-pins-and-permissions-hygiene.test.ts`); whole suite matches the phase base (`numFailedTests=0`, identical single pre-existing failed-suite name).

---
*Phase: 122-release-ci-pipeline-hardening*
*Completed: 2026-09-29*
