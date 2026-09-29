# Phase 122: Release & CI Pipeline Hardening - Context

**Gathered:** 2026-09-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Every workflow under `.github/workflows/` runs with a least-privilege `permissions:` block, every
action reference is pinned to a commit SHA, installs are cached, and the checkout/Node-setup
preamble is shared. `build.yml` stops duplicating the PR build and test, and the VSIX is built once,
minified, from a `package.json` without dead scripts or contradictory activation entries.

Requirements: CI-01, CI-02, CI-03, CI-05, CI-06, CI-07, CI-08, CI-09. Closes #547, #549, #550,
#518, #573, #515, #598, #600.

This phase lands last in v4.7 because every push to `main` publishes previews to both marketplaces.
The publish workflows cannot be exercised from the branch, so they are checked statically, packaging
runs up to the point before any publish, and the first preview run after the merge is watched
(SEED-002: the first real run is the true test).

Out of scope: `preview.yml`'s bump-before-publish order (ratified trade-off, #572 closed), upgrading
action majors (see D-06), and any language-server or IntelliJ plugin code change.

</domain>

<decisions>
## Implementation Decisions

### PR gate shape (CI-02, #549)
- **D-01:** Merge `pr-vsix.yml` into `build.yml` and delete `pr-vsix.yml`. `build.yml` stays
  unconditional on every PR to `main` (no `paths:` filter). It is the one PR gate: install, build,
  lint, `typecheck:test`, test, VSIX package, artifact upload and the sticky PR comment. The PR
  gets one install and one test run, not two.
- **D-02:** The VSIX package and sticky comment run on every PR, docs-only included. There is no
  changed-files condition. Carry over pr-vsix's details: artifact named `vsix-pr<N>` with a
  `<name>-<version>-pr<N>-<sha>.vsix` file, 14-day retention, `if-no-files-found: error`, the
  `<!-- pr-vsix -->` marker comment update, the gate that skips fork PRs for the comment step, and
  checkout of the PR head SHA. The planner decides whether the lint/typecheck/test steps keep
  today's `build.yml` "run even if the previous check failed" conditions.
- **D-03:** `pr-validation.yml` stays a separate workflow with its path filter. It only receives
  the shared preamble, caching, pins, permissions and a concurrency group. Folding the IntelliJ
  verify into `build.yml` was considered and rejected.
- **D-04:** Concurrency is per PR with `cancel-in-progress: true` for `build.yml` (group keyed on
  the PR number, as `pr-vsix.yml` does today) and for `pr-validation.yml`. `preview.yml` keeps its
  `publish-preview` group with `cancel-in-progress: false`, and `deploy-docs.yml` keeps its `pages`
  group.
- **D-05:** `main` has no branch protection or rulesets (checked 2026-09-29: the API returns
  "Branch not protected"), so renaming or deleting workflows breaks no required status check.
  Success criterion 3 ("every PR still passes a build-and-test gate") is met by `build.yml`'s
  unconditional trigger.

### Action pins & majors (CI-03, #550)
- **D-06:** Pin every `uses:` reference, in the workflows and in the new composite action, to the
  commit SHA of the latest release within the major in use today (`actions/checkout@v4` is pinned
  to the v4.x.y SHA, `github-script@v7` to the v7.x.y SHA, and so on), with a `# vX.Y.Z` comment.
  Resolve annotated tags to the commit SHA, not the tag-object SHA. No major upgrades in this
  phase.
- **D-07:** Major-version bumps arrive later through the existing grouped weekly Dependabot
  `github-actions` PR and get a normal review. Do not add an `ignore` rule for majors.
- **D-08:** Add a permanent check for success criterion 1 to `workflow-hygiene.yml`: a
  zero-dependency `.mjs` checker in `bbj-vscode/tools/` with a vitest test, following the pattern of
  `check-workflow-secrets.mjs` and `check-gradle-wrapper.mjs`. It fails when a `uses:` reference
  (workflows and `.github/actions/**`) is not a 40-hex SHA with a version comment, or when a
  workflow lacks a `permissions:` block. Local `./` action references are exempt from pinning.

### Gradle caching (CI-05, #518)
- **D-09:** Use `gradle/actions/setup-gradle`, not setup-java's `cache: gradle`, in every job that
  runs Gradle. Keep the IntelliJ IDE distributions out of the cache: the existing workflow comments
  measure them at ~4.9 GB compressed and ~14.6 GB extracted, against a 10 GB per-repository limit.
  The researcher confirms the exact exclude paths for IntelliJ Platform Gradle Plugin 2.x. Keep the
  default cache write policy (only `main` writes, PRs read). Keep the existing
  `~/.pluginVerifier` `actions/cache` step and its comment.
- **D-10:** The `verify` jobs in `preview.yml` and `manual-release.yml`, and the PR workflows, use
  npm and Gradle caching. The jobs that hold marketplace tokens (`publish-vscode`,
  `publish-intellij` in both release workflows) do not restore any cache, so cache contents cannot
  reach a credential-bearing job. They install cold. They only need vsce or Gradle, because the
  VSIX and `main.cjs` arrive as artifacts.
- **D-11:** npm caching goes through the shared preamble (`cache: npm` with a per-caller
  `cache-dependency-path`: `bbj-vscode/package-lock.json`, or `documentation/package-lock.json` for
  `deploy-docs.yml`). A second run with an unchanged lockfile shows a cache hit (success criterion
  2).

### Packaging & prepare (CI-07, CI-08, CI-09, #515, #598, #600)
- **D-12:** `prepare` becomes `langium generate` only. `src/language/generated/` is gitignored, so
  a fresh `npm ci`/`npm install` still needs it for tsc and IDE type-checking. Every CI job already
  runs `npm run build` explicitly, so each job now runs the build once.
- **D-13:** `vscode:prepublish` copies `LICENSE` and runs `node ./esbuild.mjs --minify`, building
  only the shipped `out/extension.cjs` and `out/language/main.cjs`. No `tsc`, no lint, no
  `esbuild-base`. Delete the `esbuild-base`, `esbuild`, `esbuild-watch` and `test-compile`
  scripts. The packaged VSIX must not contain `out/main.js`. Watch for stale maps: CI runs
  `npm run build` (sourcemaps on) before `vsce package`, so `out/*.cjs.map` from that build can
  survive the minified rebuild and ship. `.vscodeignore` does not exclude `*.map` today. Make sure
  the VSIX carries no stale maps (exclude them or clean them before bundling).
- **D-14:** Lint moves out of prepublish. `preview.yml`'s and `manual-release.yml`'s `verify` jobs
  gain explicit `npm run lint` and `npm run typecheck:test` steps, the same gates as the PR build.
- **D-15:** Minified bundles set esbuild `keepNames: true`, so function and class names survive in
  user-reported stack traces. No sourcemap ships (current `sourcemap: !minify` stays). This matters
  for IntelliJ too: the `main.cjs` uploaded for the plugin is taken after `vsce package`, so it is
  the minified bundle.
- **D-16:** Remove every `onCommand:` entry from `activationEvents` and keep only
  `onLanguage:bbj` and `onLanguage:bbx-config`. With `engines.vscode ^1.101`, VS Code generates
  command activation from `contributes.commands`. Update the two tests that assert `onCommand:`
  entries (`test/cvs-composer-ui.test.ts:582`, `test/setopts-in-code-ui.test.ts:593`) to assert
  the command is contributed in `contributes.commands` and not listed in `activationEvents`.
- **D-17:** Remove the `textMate` block from `langium-config.json`. The generated
  `syntaxes/gen-bbj.tmLanguage.json` is gitignored and unreferenced; the shipped grammar is the
  hand-maintained `syntaxes/bbj.tmLanguage.json`. Then remove the matching `.gitignore` line.
- **D-18:** In `preview.yml` and `manual-release.yml`, the version bump sits between `npm ci` and
  the explicit build/package. Narrowing `prepare` must keep the post-bump version in the VSIX
  manifest (success criterion 4). The packaged VSIX installs, activates and carries the bumped
  version.

### Permissions & shared preamble (Claude-proposed, user did not contest)
- **D-19:** Every workflow declares a top-level `permissions: contents: read`. Only jobs that need
  more escalate at job level: `preview.yml` `bump-version` (`contents: write`, it pushes),
  `manual-release.yml` `tag-release` and `create-release` (`contents: write`), `build.yml`'s PR job
  (`pull-requests: write` for the sticky comment), and `deploy-docs.yml` keeps `pages: write` and
  `id-token: write`. Under-scoping `contents: write` in the release workflows would fail silently
  on their next run, so check each push/tag/release step against its job's scope.
- **D-20:** The shared preamble is a composite action under `.github/actions/` (not a reusable
  workflow). A local composite action can only be used after checkout, so `actions/checkout`
  stays an inline first step in each job. The composite covers Node setup (Node 22, one place) with
  npm caching and, optionally, `npm ci`, via inputs for the working directory, the lockfile path,
  whether to install, and whether to cache (D-10). `workflow-hygiene.yml` (install-free) and
  `deploy-docs.yml` use it too, so every workflow uses the shared form.
- **D-21:** `gradle/actions/wrapper-validation` stays an inline step in each Gradle-invoking job,
  because `check-gradle-wrapper.mjs` checks that it appears in the job before the first Gradle
  invocation. Its regexes already accept `@<sha>` pins. Whether `setup-gradle` sits inline or in a
  second composite action is the planner's call, as long as that checker stays green.
- **D-22:** Extend `.github/dependabot.yml`'s `github-actions` entry to also cover the composite
  action directory (for example `directories: ["/", "/.github/actions/*"]`, confirmed by the
  researcher). Otherwise the pins inside the composite go stale. This is a small follow-on edit to
  the Phase 117 CI-04 entry.

### Gradle cache provider (decided during planning, 2026-09-29)
- The user chose setup-gradle's default Enhanced Caching provider with `gradle-home-cache-excludes`
  for the IntelliJ IDE downloads (plan 02 option-a), accepting the Gradle Technologies Terms of Use
  for this public repository. Publish jobs keep caching disabled, so it never loads next to a
  marketplace token. [informational]

### Claude's Discretion
- The composite action's name, input names and defaults.
- Whether the token-holding publish jobs run `npm ci --ignore-scripts` (they only need vsce).
- The exact layout of the new hygiene checker and its test, following the existing two checkers.
- Step naming and indentation normalisation across workflows (the six drift axes in #573 converge
  to one value each).
- Plan split and ordering (packaging/package.json, workflows + composite, hygiene checker).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 122: Release & CI Pipeline Hardening": goal, success criteria,
  planning notes (publish verification, version-bump ordering)
- `.planning/REQUIREMENTS.md`: CI-01..CI-03, CI-05..CI-09
- GitHub issues #547, #549, #550, #518, #573, #515, #598, #600 (`gh issue view <n>`): problem,
  evidence and acceptance criteria for each requirement

### Files changed
- `.github/workflows/build.yml`, `pr-vsix.yml` (to be merged and deleted), `pr-validation.yml`,
  `preview.yml`, `manual-release.yml`, `deploy-docs.yml`, `workflow-hygiene.yml`
- `.github/dependabot.yml`: the `github-actions` entry from Phase 117 (CI-04)
- `bbj-vscode/package.json`: `scripts`, `activationEvents`, `engines`
- `bbj-vscode/esbuild.mjs`: `minify`/`sourcemap` handling, where `keepNames` goes
- `bbj-vscode/langium-config.json`: `textMate` block
- `bbj-vscode/.gitignore`: `/syntaxes/gen-bbj.tmLanguage.json` line
- `bbj-vscode/.vscodeignore`: what the VSIX excludes (must still exclude sourcemaps/`src/`)

### Existing guards that must stay green
- `bbj-vscode/tools/check-workflow-secrets.mjs` + `bbj-vscode/test/workflow-secret-hygiene.test.ts`
  : no `${{ secrets.* }}` inside `run:` bodies (applies to the composite action too)
- `bbj-vscode/tools/check-gradle-wrapper.mjs` + `bbj-vscode/test/gradle-wrapper-hygiene.test.ts`
  : wrapper-validation before the first Gradle call in each job
- `bbj-vscode/test/cvs-composer-ui.test.ts:582`, `bbj-vscode/test/setopts-in-code-ui.test.ts:593`
  : `activationEvents` assertions to rewrite (D-16)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `check-workflow-secrets.mjs` / `check-gradle-wrapper.mjs`: zero-dependency line-based workflow
  scanners with job attribution (`attributeJobs`). The new pin/permissions checker (D-08) should
  follow the same shape and live beside them.
- `pr-vsix.yml`'s sticky-comment `github-script` block moves into `build.yml` as is (D-02).
- `deploy-docs.yml` already shows the target caching form (`cache: npm` +
  `cache-dependency-path`).

### Established Patterns
- Release workflows verify once up front and publish only after a green `verify`. Tags are pushed
  after both publishes. Long comments in `manual-release.yml`/`preview.yml` explain these orders;
  keep them.
- The Plugin Verifier cache comment (repeated in three files) records why IDE downloads are not
  cached. D-09 relies on that measurement.
- Node 22 everywhere (langium 4.3 toolchain). The composite action becomes the single place it is
  stated.

### Integration Points
- The PR workflows (`build.yml`, `pr-validation.yml`, `workflow-hygiene.yml`) run on the milestone
  PR itself, so the new preamble is exercised there before merge. `pull_request` uses the PR's
  workflow definitions; pr-vsix.yml's header comment claiming base-branch definitions is incorrect
  and goes away with the file.
- `preview.yml` runs on the merge to `main` and publishes. Its first run after merge is the real
  test and must be watched (bump commit, both marketplace publishes, both artifacts).
- `manual-release.yml` only runs on dispatch. It is checked statically; its next real release is
  its first run.

</code_context>

<specifics>
## Specific Ideas

- Pre-merge packaging check: `npm ci` → `npm run build` → `npx vsce package` locally or in the PR
  run. Then confirm the VSIX has no `out/main.js`, has minified `out/extension.cjs` and
  `out/language/main.cjs` with readable names (keepNames), and installs and activates in VS Code.
  Also build the IntelliJ plugin from that `main.cjs` and check it starts the server (standing UAT
  practice: build both distributables first, and again from the final tree after code-review
  fixes).
- Before the push, grep the source diff for planning identifiers (plan/D-xx/CR-xx) in workflow
  comments and test comments. Decision IDs in this file must not leak into workflow YAML comments.
- The milestone PR body carries one `Closes #N` line per issue (standing v4.7 constraint).

</specifics>

<deferred>
## Deferred Ideas

- Upgrading actions to current majors (checkout v5, setup-node v5/v6, artifact v5+, github-script
  v8): left to the grouped Dependabot PR after this phase (D-06, D-07).
- Folding the IntelliJ PR verification into `build.yml` to avoid its second vscode build:
  considered, rejected for now (D-03).

### Reviewed Todos (not folded)
- "Peer-supplied Java names can break out of the signature-help code fence…" (security): matched
  only on keywords, unrelated to CI.
- "Re-check the IntelliJ Node.js download progress bar on Windows" (testing): a manual Windows
  check, unrelated to CI.
- "IntelliJ sends javaInteropHost/javaInteropPort but the language server reads
  interopHost/interopPort" (intellij): a code fix, unrelated to CI.

</deferred>

---

*Phase: 122-release-ci-pipeline-hardening*
*Context gathered: 2026-09-29*
