---
phase: "122"
slug: "release-ci-pipeline-hardening"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-29"
---

# Phase 122 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` (no changes needed) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/workflow-secret-hygiene.test.ts test/gradle-wrapper-hygiene.test.ts <new pin/permissions hygiene test>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (cwd must be `bbj-vscode`; judge on `numFailedTests: 0`, `--maxWorkers=2` if hook timeouts appear) |
| **Estimated runtime** | quick ~10 s, full ~300 s |

---

## Sampling Rate

- **After every task commit:** Run the quick command (plus the three `onCommand:`-touching test files when `activationEvents` changes)
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite green, packaging dry-run done, both distributables built from the final tree
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

Filled in by the planner/executor once task IDs exist. Requirement-level map from RESEARCH.md:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| CI-01 | Every workflow declares a least-privilege `permissions:` block | unit (new checker) | `node bbj-vscode/tools/<pin-permissions checker>.mjs` + its vitest test | ❌ W0 | ⬜ pending |
| CI-03 | Every `uses:` is a 40-hex SHA with a `# vX.Y.Z` comment (workflows + composite action) | unit (new checker) | same checker | ❌ W0 | ⬜ pending |
| CI-02 | `build.yml` is the single unconditional PR gate with a concurrency group; `pr-vsix.yml` gone | static + PR run | grep on `build.yml` / `test ! -e pr-vsix.yml`; milestone PR run goes green | ✅ | ⬜ pending |
| CI-05 | npm + Gradle caching; rerun with unchanged lockfile hits cache | static + PR run log | grep for `cache: npm` / `setup-gradle`; second PR run log shows cache restored | ✅ | ⬜ pending |
| CI-06 | Every workflow uses the shared composite action | static | `grep -L 'uses: ./.github/actions/' .github/workflows/*.yml` returns nothing | ✅ | ⬜ pending |
| CI-07 | VSIX built once, minified, no `out/main.js`, no `*.map`, names kept | packaging dry-run | scratch worktree (Node 22): `npm ci && npm run build && npx vsce package --no-dependencies`, then `unzip -l` checks | ❌ W0 (manual script) | ⬜ pending |
| CI-08 | `prepare` is `langium generate` only; bumped version reaches the VSIX | static + dry-run | `node -e` on package.json scripts; version in packaged manifest | ✅ | ⬜ pending |
| CI-09 | Dead scripts, `textMate` block, `onCommand:` entries removed; build/generate/suite pass | existing suite + 3 rewritten tests | `npx vitest run test/cvs-composer-ui.test.ts test/setopts-in-code-ui.test.ts test/functional/installed-extension-e2e.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Task-level map (planner, 2026-09-29):

| Task | Wave | Requirement | Behavior | Automated verify (see the PLAN for the exact command) | Status |
|------|------|-------------|----------|-------------------------------------------------------|--------|
| 122-01 T1 (tracer) | 1 | CI-07, CI-08 | Base captured; prepare = generate only; prepublish = LICENSE + minified esbuild with keepNames; VSIX after a sourcemapped build has no out/main.js, maps or coverage; installed minified server passes e2e | packaging-config node check; `unzip` checks on tracer.vsix; `npx vitest run test/functional/installed-extension-e2e.test.ts test/language-server-lifecycle.test.ts` | ⬜ pending |
| 122-01 T2 | 1 | CI-09 | Two activation events; three manifest tests rewritten; no TextMate output; Node 22 generate; vsce file list only loses the four stale kinds | node manifest check; `npx --yes node@22 …langium.js generate`; the three test files; vsce ls diff; whole suite; lint/typecheck/build | ⬜ pending |
| 122-02 T1 (checkpoint:decision) | 2 | CI-05 | User picks the Gradle cache provider (proprietary Enhanced vs MIT basic vs actions/cache) | gradle-cache-option.txt holds A, B or C | ⬜ pending |
| 122-02 T2 (tracer) | 2 | CI-05, CI-03 | validate-intellij: pinned setup-java, wrapper validation, then setup-gradle with the chosen caching | region order/pin/option check; `check-gradle-wrapper.mjs` = 5 jobs, 0 findings | ⬜ pending |
| 122-02 T3 | 2 | CI-05, CI-03 | Release verify jobs cached, publish-intellij cache-disabled; publish steps and verifier comments unchanged | region checks; base diffs; `npx vitest run test/workflow-secret-hygiene.test.ts test/gradle-wrapper-hygiene.test.ts`; whole suite | ⬜ pending |
| 122-03 T1 (tracer, TDD) | 2 | CI-03 | Pin rule with version comment through the CLI; real tree exits 1 | `npx vitest run test/action-pins-and-permissions-hygiene.test.ts`; checker on the real tree | ⬜ pending |
| 122-03 T2 (TDD) | 2 | CI-01 | Top-level permissions, no top-level write, push scope, composite actions, refusals, --print | same test file (≥13 tests); real-tree findings; whole suite; lint/typecheck | ⬜ pending |
| 122-04 T1 (tracer) | 3 | CI-06 | Composite action; workflow-hygiene on it | action content greps; pin/secret/wrapper checkers | ⬜ pending |
| 122-04 T2 | 3 | CI-02 | build.yml single PR gate with VSIX + sticky comment; pr-vsix.yml deleted | shape greps; whitespace-normalised script diffs vs base; checker --print | ⬜ pending |
| 122-04 T3 | 3 | CI-01, CI-03, CI-05 | pr-validation and deploy-docs on the action, pinned, least-privilege, distinct cancel groups | on-block diff; --print scopes; four workflows + action clean; hygiene tests; whole suite | ⬜ pending |
| 122-05 T1 (tracer) | 4 | CI-01, CI-03, CI-06 | preview.yml: read-only top, write on bump-version, action (cold in publish-vscode), lint/typecheck gates, bump before build | --print scopes; step order; run-body set vs base; comments kept | ⬜ pending |
| 122-05 T2 | 4 | CI-01, CI-08 | manual-release.yml likewise; whole tree clean | --print scopes; step order; run-body set; default checker scan = 6 workflows + action, 0 findings; whole suite | ⬜ pending |
| 122-06 T1 (tracer) | 5 | CI-01, CI-03 | pin-hygiene CI job; secret scan covers actions; real-tree test; Dependabot directories | real-tree vitest case; replay of the three hygiene commands; dependabot region check | ⬜ pending |
| 122-06 T2 | 5 | CI-07, CI-08 | Pins equal tag commits (GitHub API); Node 22 scratch worktree packages the bumped VSIX; both distributables; phase hygiene | pins-verified.txt; dryrun.vsix checks; cmp of main.cjs; whole suite; lint/typecheck; phase-wide id scan | ⬜ pending |

---

## Wave 0 Requirements

Created inside the plans, before their first consumer:

- [ ] `bbj-vscode/tools/check-action-pins-and-permissions.mjs` — new zero-dependency checker (CI-01, CI-03); plan 03 (wave 2), used by plans 04-06
- [ ] `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` — its vitest test; plan 03, real-tree case in plan 06
- [ ] `.github/actions/node-setup/action.yml` — the composite action (CI-06); plan 04 Task 1
- [ ] Rewrites of `test/cvs-composer-ui.test.ts`, `test/setopts-in-code-ui.test.ts`, `test/functional/installed-extension-e2e.test.ts` `onCommand:` assertions; plan 01 Task 2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cache hit on rerun | CI-05 | Needs two real Actions runs | Push an empty commit to the milestone PR; check setup-node / setup-gradle logs for a cache restore |
| VSIX installs and activates with bumped version | CI-07, CI-08 | Needs a VS Code instance | Install the PR VSIX artifact, open a `.bbj` file, confirm the LS starts and the version matches |
| IntelliJ plugin starts the minified `main.cjs` | CI-07 | Needs IntelliJ | Build the plugin zip from the final tree, install, open a `.bbj` file |
| `preview.yml` first post-merge run | CI-01, CI-03, CI-05, CI-08 | Publishes to both marketplaces; cannot run from branch | Watch the first run after merge: bump commit pushed, both publishes green, both artifacts present |
| `manual-release.yml` | CI-01, CI-03 | Dispatch-only, publishes | Static review of job permissions vs. push/tag/release steps; first real release is the true test |
| Gradle cache provider choice | CI-05 | Accepting the Gradle Technologies Terms of Use (setup-gradle's default Enhanced Caching, the only provider with cache excludes) is a policy call | Plan 02 Task 1 checkpoint:decision; the answer is recorded in the 122-02 SUMMARY |
| Gradle cache size and hit | CI-05 | Only main writes the Gradle cache | After the merge: setup-gradle job summary in the first preview run shows the entry size; a later PR shows a restore in validate-intellij |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
