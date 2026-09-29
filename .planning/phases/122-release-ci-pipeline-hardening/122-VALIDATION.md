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

---

## Wave 0 Requirements

- [ ] `bbj-vscode/tools/<pin-permissions checker>.mjs` — new zero-dependency checker (CI-01, CI-03)
- [ ] `bbj-vscode/test/<pin-permissions>-hygiene.test.ts` — its vitest test
- [ ] `.github/actions/<name>/action.yml` — the composite action (CI-06)
- [ ] Rewrites of `test/cvs-composer-ui.test.ts`, `test/setopts-in-code-ui.test.ts`, `test/functional/installed-extension-e2e.test.ts` `onCommand:` assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cache hit on rerun | CI-05 | Needs two real Actions runs | Push an empty commit to the milestone PR; check setup-node / setup-gradle logs for a cache restore |
| VSIX installs and activates with bumped version | CI-07, CI-08 | Needs a VS Code instance | Install the PR VSIX artifact, open a `.bbj` file, confirm the LS starts and the version matches |
| IntelliJ plugin starts the minified `main.cjs` | CI-07 | Needs IntelliJ | Build the plugin zip from the final tree, install, open a `.bbj` file |
| `preview.yml` first post-merge run | CI-01, CI-03, CI-05, CI-08 | Publishes to both marketplaces; cannot run from branch | Watch the first run after merge: bump commit pushed, both publishes green, both artifacts present |
| `manual-release.yml` | CI-01, CI-03 | Dispatch-only, publishes | Static review of job permissions vs. push/tag/release steps; first real release is the true test |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
