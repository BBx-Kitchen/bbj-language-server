---
phase: 122-release-ci-pipeline-hardening
plan: "06"
subsystem: infra
tags: [github-actions, sha-pinning, dependabot, vsce, packaging, release-gate]

requires:
  - phase: 122-release-ci-pipeline-hardening
    provides: "every prior plan's pinned, scoped, cached workflow tree (01 packaging/manifest, 02 Gradle caching, 03 the pin/permissions checker, 04 the composite action and PR-side workflows, 05 the release workflows) — this plan wires the checker into CI permanently and proves the whole tree end to end"
provides:
  - "workflow-hygiene.yml's third job (pin-hygiene) runs check-action-pins-and-permissions.mjs over the whole tree on every pull request and push to main; a real-tree vitest case asserts the same"
  - "The secret-hygiene job scans every composite-action directory alongside .github/workflows"
  - "Dependabot's github-actions entry watches both the root and .github/actions/node-setup, so the composite action's own pins stay current, with no ignore rule for majors"
  - "Every pin in the tree (12 distinct references) verified against GitHub's tag object, annotated tags dereferenced, zero mismatches"
  - "A fresh Node 22 scratch worktree proves the release-shaped packaging pipeline: npm ci generates sources only, the preview.yml-style patch bump lands in the manifest, and vsce package ships minified bundles with kept names and no stale artifacts"
  - "Both distributables (VSIX, IntelliJ plugin zip) built from the final tree and proven to carry the identical minified main.cjs"
affects: []

actuals:
  tokens: 1224
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Phase-gate packaging proof: a detached scratch worktree on a pinned Node major replays the exact npm ci -> bump -> build -> vsce package sequence a release workflow runs, without ever reaching a publish step"
    - "Pin verification against GitHub: resolve repos/{owner}/{repo}/git/ref/tags/{version}; when the ref's object type is tag (annotated), dereference through repos/{owner}/{repo}/git/tags/{sha} before comparing to the pinned commit"

key-files:
  created: []
  modified:
    - bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts
    - .github/workflows/workflow-hygiene.yml
    - .github/dependabot.yml

key-decisions:
  - "Task 1's real-tree test and header-comment rewrite were made exactly as scoped in the plan (only the described test added; no other assertion touched), keeping the diff minimal and the verify commands deterministic."
  - "The IntelliJ buildPlugin gate is built with -x test, matching the Phase 120 UAT precedent recorded in STATE.md's Blockers/Concerns (ComposerRequestContractTest has failed since 116-02 moved the bbj/refreshJavaClasses literal out of main.ts; the test's own scanned-file list needs updating, tracked separately, unrelated to this phase's files)."
  - "No pin was re-pinned to a newer patch: every one of the 12 distinct references already resolves to the latest tag within its pinned major (confirmed via the GitHub tags API for each repo), so Dependabot's grouped weekly PR has nothing to pick up yet."

requirements-completed: [CI-01, CI-03, CI-07, CI-08]

coverage:
  - id: D1
    description: "workflow-hygiene.yml's pin-hygiene job runs check-action-pins-and-permissions.mjs with no arguments (covering .github/workflows and .github/actions) on every pull_request and push to main; a new real-tree vitest case pins that the tree stays clean; the secret-hygiene job's run line now also globs every composite-action directory"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts > action pin and permission checker contract > the real workflow tree and composite actions scan clean"
        status: pass
      - kind: other
        ref: "task 1 verify block 2: workflow-hygiene.yml's three run: lines replayed from the repository root — 'Scanned 7 file(s), 39 run block(s), 0 findings.' / '1 wrapper(s), 6 workflow file(s), 5 Gradle job(s), 0 findings.' / 'Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings.'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dependabot's github-actions entry lists directories: [\"/\", \"/.github/actions/node-setup\"] so the composite action's own pins are watched too, keeps its weekly grouped schedule, and gains no ignore rule for majors; the pre-existing planning-id fragment in the neighboring Gradle-wrapper comment is reworded"
    requirement: "CI-03"
    verification:
      - kind: other
        ref: "task 1 verify block 3: directories key present, both list entries present, no directory:/ignore: key, weekly interval and patterns: [\"*\"] intact, every .github/actions/* subdirectory listed, zero D-NN tokens, reworded comment present"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every one of the 12 distinct owner/repo[/path]@sha # vX.Y.Z references across the six workflows and the composite action resolves, through the GitHub API with annotated tags dereferenced, to exactly its pinned commit SHA — zero mismatches"
    requirement: "CI-03"
    verification:
      - kind: other
        ref: "/home/coder/repos/tmp/phase-122/pins-verified.txt: 12 OK lines, 0 MISMATCH lines, matching the tree's own distinct-reference count"
        status: pass
    human_judgment: false
  - id: D4
    description: "A fresh Node 22 scratch worktree at HEAD runs npm ci (generates only src/language/generated/, builds nothing, writes no syntaxes/gen-bbj.tmLanguage.json), bumps the patch version exactly as preview.yml's Bump patch version step does, builds, and packages a VSIX whose package.json and vsixmanifest both carry the bumped version, whose two shipped bundles keep names and are each under 70% of their unminified size, and which contains no out/main.js, sourcemap, coverage output or generated grammar"
    requirement: "CI-07"
    verification:
      - kind: other
        ref: "task 2 verify block 2 (release-shaped package OK): version 0.16.10 in both package.json and vsixmanifest inside dryrun.vsix; extension.cjs 955192/1947483 bytes (49%), main.cjs 1257107/2396978 bytes (52%); CvsCodeActionProvider and BBjHoverProvider literals present; no stale entries"
        status: pass
    human_judgment: false
  - id: D5
    description: "prepare narrowed to langium generate only is proven at the phase gate: the scratch worktree's npm ci produces no out/ directory and only the generated AST, so CI's explicit npm run build step is the only place a build happens; lint, typecheck:test and build all pass unchanged in the main tree, and the whole suite matches the phase base with zero new failing names"
    requirement: "CI-08"
    verification:
      - kind: other
        ref: "task 2 verify block 1 (post-npm-ci assertions OK, inline in the scratch-worktree run) plus verify blocks 4-5 (suite names OK: numFailedTests=0, numPassedTests=3708 vs base 3694, same single pre-existing failed-suite name; gates OK: lint and typecheck:test both exit 0)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Both distributables are built from the final tree and carry byte-identical minified main.cjs: uat-bbj-lang.vsix (via bbj-ext-install) and uat-bbj-intellij.zip (via ./gradlew buildPlugin -x test, working around the pre-existing ComposerRequestContractTest failure), each compared with cmp against bbj-vscode/out/language/main.cjs"
    requirement: "CI-07"
    verification:
      - kind: other
        ref: "task 2 verify block 3 (distributables OK): both cmp comparisons silent (byte-identical), no stale VSIX entries"
        status: pass
      - kind: manual_procedural
        ref: "installing uat-bbj-lang.vsix / uat-bbj-intellij.zip in a running VS Code / IntelliJ and confirming activation and version — listed in Manual watch items below"
        status: unknown
    human_judgment: true
    rationale: "Package/artifact-level checks (contents, byte-identical bundles, manifest version) are fully automated and pass; actual extension activation and language-server startup in a live IDE needs a human running VS Code or IntelliJ interactively, which this session cannot do."
  - id: D7
    description: "The phase diff stays inside its planned file set, carries no planning identifier in any added line, and no commit body could close a GitHub issue early on the eventual squash merge"
    verification:
      - kind: other
        ref: "task 2 verify block 6 (phase hygiene OK): diff-scoped planning-id grep, closing-keyword commit-body grep, file-scope name-only diff against the allow-list, uncommitted-change porcelain check, and stray-worktree check all clean"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-09-29
status: complete
---

# Phase 122 Plan 06: Permanent pin/permissions CI gate and the release-packaging phase gate Summary

**`workflow-hygiene.yml` gained a permanent `pin-hygiene` job (with a real-tree vitest proof), Dependabot now watches the composite action too, every one of the tree's 12 pins verified clean against GitHub, and a fresh Node 22 scratch worktree proved the release-shaped packaging pipeline end to end — both distributables built from the final tree with byte-identical minified `main.cjs`, closing the phase.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-29T18:35:40Z (continuing directly from plan 05's completion)
- **Completed:** 2026-09-29T18:46:00Z (approximate — sequential in-context execution, no worktree for the CI edits; a scratch worktree was created and removed for Task 2's packaging proof)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `workflow-hygiene.yml`'s header comment now describes all three permanent checks; a new `pin-hygiene` job (`Checkout` pinned, `Set up Node` through the shared action install-free/uncached, then `node bbj-vscode/tools/check-action-pins-and-permissions.mjs`) runs on every `pull_request` and `push` to `main`, right beside `secret-hygiene` and `wrapper-hygiene`.
- `secret-hygiene`'s run line now scans `.github/workflows .github/actions/*`, so the shell glob covers every composite-action directory (currently just `node-setup`) alongside the workflows.
- A new real-tree test, `the real workflow tree and composite actions scan clean`, calls the checker with no arguments (default targets) and with `--print`, asserting the whole tree resolves to `0 findings` and that `.github/actions/node-setup/action.yml` is enumerated.
- `.github/dependabot.yml`'s `github-actions` entry now uses block-style `directories: ["/", "/.github/actions/node-setup"]` instead of a single `directory: "/"`, with a two-line comment explaining why, and no new `ignore:` rule; the pre-existing planning-id fragment in the neighboring Gradle-wrapper comment (`(D-08, discretion resolved)`) was dropped, keeping the rest of that comment's wording.
- Replaying the three `run:` commands from the repository root (exactly as the workflow would) reports `Scanned 7 file(s), 39 run block(s), 0 findings.`, `1 wrapper(s), 6 workflow file(s), 5 Gradle job(s), 0 findings.` and `Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings.` — the whole tree is clean end to end.
- Every one of the 12 distinct pinned references (`actions/cache`, `actions/checkout`, `actions/configure-pages`, `actions/deploy-pages`, `actions/download-artifact`, `actions/github-script`, `actions/setup-java`, `actions/setup-node`, `actions/upload-artifact`, `actions/upload-pages-artifact`, `gradle/actions/setup-gradle`, `gradle/actions/wrapper-validation`) resolved through the GitHub API — with `gradle/actions`'s two annotated tags dereferenced through their tag objects — to exactly its pinned commit SHA. Zero mismatches; every pin is also already the newest release within its own pinned major, so Dependabot's grouped weekly PR has no patch to pick up yet.
- A fresh scratch worktree (`git worktree add --detach`) at HEAD, run under Node 22 via `npx --yes -p node@22`, proved the release-shaped packaging pipeline: `npm ci` produced no `out/` directory, a non-empty `src/language/generated/ast.ts`, and no `syntaxes/gen-bbj.tmLanguage.json`; the patch version was bumped `0.16.9 -> 0.16.10` with the exact `jq` sequence `preview.yml`'s `Bump patch version` step uses; `npm run build` then `npx vsce package --no-dependencies` produced a VSIX whose `package.json` and `extension.vsixmanifest` both carry `0.16.10`, whose `activationEvents` still holds exactly the two `onLanguage` entries with `prepare` still `npm run langium:generate`, whose two shipped bundles keep their class/function names (`CvsCodeActionProvider`, `BBjHoverProvider` both present) and are minified to 49% (`extension.cjs`, 955,192 / 1,947,483 bytes) and 52% (`main.cjs`, 1,257,107 / 2,396,978 bytes) of their unminified size, and which carries no `out/main.js`, sourcemap, coverage output or generated grammar. The worktree was removed immediately after.
- Main-tree gates all pass unchanged: `npm run lint` (0 problems), `npm run typecheck:test` (0 errors), `npm run build` (clean).
- Both distributables built from the final tree: `bbj-ext-install` packaged and installed `uat-bbj-lang.vsix` (780,743 bytes) into the ext-test rig; `./gradlew buildPlugin --console=plain -q -x test` produced `uat-bbj-intellij.zip` (996,573 bytes) — the `-x test` flag works around the pre-existing `ComposerRequestContractTest` failure recorded in STATE.md's Blockers/Concerns (unrelated to this phase). Both distributables' `main.cjs` (`extension/out/language/main.cjs` in the VSIX, `bbj-intellij/lib/language-server/main.cjs` in the plugin zip) are byte-identical to `bbj-vscode/out/language/main.cjs` via `cmp`.
- Whole suite: `numFailedTests=0`, `numPassedTests=3708` (base 3694, +14 for the 13 checker tests plan 03 added plus this plan's 1 real-tree test), same single pre-existing failed-suite name (`test/functional/installed-extension-e2e.test.ts`) as `suite-base-failed.txt`; no new failing name.
- Phase-wide hygiene: zero planning identifiers in any added line across the whole `.github`/`bbj-vscode` diff since the phase base, zero GitHub-closing-keyword matches in any commit body, the file-scope diff stays entirely inside the plan's declared file set across all six plans, no uncommitted change and no stray scratch worktree remain.

## Task Commits

1. **Task 1: The pin and permission check runs in CI against the real tree, the secret scan covers composite actions, and Dependabot watches the composite action** - `a5bbb28f` (ci)
2. **Task 2: Phase gate — pins verified against GitHub, a fresh Node 22 worktree packages the bumped VSIX as the release workflows do, both distributables built, suite and hygiene green** - no commit (produces only evidence under `/home/coder/repos/tmp/phase-122/`; changes no tracked file, per the plan's own instruction)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS)

## Files Created/Modified
- `.github/workflows/workflow-hygiene.yml` — rewritten header comment (describes all three checks); `secret-hygiene`'s run line now globs composite-action directories; new `pin-hygiene` job
- `.github/dependabot.yml` — `github-actions` entry's `directory: "/"` replaced with `directories: ["/", "/.github/actions/node-setup"]` plus an explanatory comment; the neighboring Gradle-wrapper comment's planning-id fragment dropped
- `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` — one new test, `the real workflow tree and composite actions scan clean`

## Decisions Made
See `key-decisions` in the frontmatter: the real-tree test and header rewrite were scoped exactly as the plan described; `buildPlugin` used `-x test` matching the documented Phase 120 precedent for the pre-existing `ComposerRequestContractTest` failure; no pin needed re-pinning since every one is already the latest release within its own major.

## Deviations from Plan

### Documented Pre-existing Condition (not a deviation, not auto-fixed)

**Task 2's IntelliJ plugin build hit a pre-existing test failure unrelated to this plan's files.**

- **What was found:** `./gradlew buildPlugin --console=plain -q` failed with `1160 tests completed, 1 failed`, isolated to `com.basis.bbj.intellij.composer.ComposerRequestContractTest` (via its JUnit XML report).
- **Proof this predates the plan:** STATE.md's own "Blockers/Concerns" section already records this exact condition: *"IntelliJ `ComposerRequestContractTest` fails since 116-02 moved the `bbj/refreshJavaClasses` literal from `main.ts` to `language/java-class-refresh.ts`; the test's scanned-file list needs that file (found at the Phase 120 UAT build, which used `-x test`)."* Phase 116 and Phase 120 both predate this phase; this plan's files (`.github/workflows/workflow-hygiene.yml`, `.github/dependabot.yml`, and the checker test) never touch the IntelliJ source tree or that test.
- **Action taken:** rebuilt with `./gradlew buildPlugin --console=plain -q -x test`, exactly the documented workaround, which succeeded cleanly (no stack trace, `bbj-intellij-0.1.0.zip` produced, verified fresh — `unzip -Z1` timestamp and the `cmp` check against `bbj-vscode/out/language/main.cjs` both confirm it is the just-built plugin, not a stale zip).
- **Effect on this plan's own gates:** none of the plan's `<verify>` blocks assert on the IntelliJ JUnit suite; the "distributables OK" block only asserts the plugin zip's `main.cjs` matches the tree's minified bundle, which passed. Out of this plan's scope to fix (Rule 1/3 scope boundary — the test's own scanned-file list is a Phase 116/120 concern, not a workflow/packaging one); not re-opened here.

---

**Total deviations:** 0 auto-fixed. 1 pre-existing condition documented (proven via STATE.md's own prior record, not caused by this plan, out of its file scope).
**Impact on plan:** None on correctness of this plan's own deliverables — every `<verify>` block this plan's tasks actually touch passed cleanly, including the distributables check that depends on a successful `buildPlugin` run.

## Issues Encountered
None beyond the documented pre-existing condition above.

## User Setup Required
None - no external service configuration required.

## Manual Watch Items

The publish workflows cannot be exercised from this branch (every push to `main` publishes previews to both marketplaces). This is the hand-off for the milestone PR and the first post-merge run:

- **Milestone PR body:** it needs one `Closes #N` line for each of the phase's issues — an issue table alone does not close them. Scan the branch's commit bodies for closing keywords before the squash merge (this plan's own hygiene scan already confirms zero such keywords exist in the phase's own commits).
  - Closes #547
  - Closes #549
  - Closes #550
  - Closes #518
  - Closes #573
  - Closes #515
  - Closes #598
  - Closes #600
- **#549's CI-policy decision:** record on the issue that `build.yml` stays the one unconditional PR gate and `pr-vsix.yml` was folded into it (plan 04).
- **On the milestone PR:** `build.yml` (BBj CI), `pr-validation.yml` and `workflow-hygiene.yml` (now three jobs, including this plan's `pin-hygiene`) should all go green on the new composite action and pins; the sticky PR comment should update in place with a `vsix-pr<N>` artifact; a second push with an unchanged lockfile should show "Cache restored" in the `Set up Node.js` step; no run should fail with a workflow-file error across any of the six workflows.
- **After the merge, the first `preview.yml` run:** verify green including the `Lint` and `Type-check test tree` steps; `bump-version` pushes the bump commit; both marketplace publishes go green; the `language-server`, `vscode-extension` and `bbj-intellij-<version>` artifacts are all present; `setup-gradle`'s job summary shows the Gradle cache entry size (a multi-gigabyte entry would mean an exclude pattern did not match).
- **A pull request opened after that run:** should show a Gradle cache restore in `pr-validation.yml`'s `validate-intellij` job and an npm cache restore from `main`.
- **The next documentation change:** should deploy docs with the job-scoped Pages permissions (`build`: `contents: read, pages: read`; `deploy`: `pages: write, id-token: write`).
- **`manual-release.yml`:** verified statically only in this phase; its next dispatched release is its first real run under the new scoping — watch `tag-release`'s `contents: write` scope succeed at both `git push` calls, and `create-release`'s `gh release create` succeed with both artifacts attached.
- **Dependabot:** the repository's Dependabot page should show no configuration error for the new `directories:` form, and the next grouped `github-actions` PR should also cover `.github/actions/node-setup`.
- **UAT of both distributables:** install `uat-bbj-lang.vsix` (or use the ext-test rig, already updated by this plan's `bbj-ext-install` run) and check the extension activates on a `.bbj` file and reports version `0.16.9` (the un-bumped main-tree version — the bumped `0.16.10` only exists inside the removed scratch worktree's `dryrun.vsix`); install `uat-bbj-intellij.zip` in IntelliJ and check the language server starts from the minified `main.cjs`. Both files are at `/home/coder/repos/tmp/phase-122/uat-bbj-lang.vsix` and `/home/coder/repos/tmp/phase-122/uat-bbj-intellij.zip`.

## Next Phase Readiness

- **Roadmap criterion 1** now holds permanently: `pin-hygiene` enforces it in CI on every PR and push to `main`, backed by a real-tree vitest case that cannot silently go stale.
- **Roadmap criterion 4** is fully proven: `vscode:prepublish` builds only the minified shipped bundles, `prepare` builds nothing beyond Langium generation, and a release-shaped scratch-worktree run confirms the packaged VSIX after the version bump carries the bumped version, minified bundles with kept names, and no stale artifacts.
- **Roadmap criteria 2 and 3** are proven statically across all six plans; the first `preview.yml` run after the merge is the true end-to-end test (see Manual Watch Items above).
- All eight phase requirements are delivered. This plan's `requirements-completed` (CI-01, CI-03, CI-07, CI-08) closes out the four that were still pending; combined with CI-02, CI-04, CI-05, CI-06, CI-09 already marked complete by earlier plans, Phase 122 is complete.
- Evidence retained under `/home/coder/repos/tmp/phase-122/` for this plan: `pins-verified.txt`, `verify-pins.sh`, `hygiene-cmds.txt`, `hygiene-cmds-out.txt`, `pack-script.sh`, `dryrun-version.txt`, `dryrun-unminified-sizes.txt`, `dryrun.vsix`, `uat-bbj-lang.vsix`, `uat-bbj-intellij.zip`, `suite-06.json`, `suite-06-failed.txt`, `pins-06.json`. None of this is committed.

## Self-Check: PASSED

- `.github/workflows/workflow-hygiene.yml`, `.github/dependabot.yml`, `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` all found on disk with the expected content.
- Commit `a5bbb28f` found in `git log --oneline --all`.
- All six of Task 2's verify blocks reproduced and passed in this session ("pins verified", "release-shaped package OK", "distributables OK", "suite names OK", "gates OK", "phase hygiene OK").

---
*Phase: 122-release-ci-pipeline-hardening*
*Completed: 2026-09-29*
