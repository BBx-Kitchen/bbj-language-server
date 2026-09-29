---
phase: 122-release-ci-pipeline-hardening
verified: 2026-09-29T19:00:42Z
status: gaps_found
score: 3/5 must-haves verified
behavior_unverified: 1
overrides_applied: 0
gaps:
  - truth: "Roadmap Success Criterion 1: a scan of the workflow files finds every workflow declaring a least-privilege permissions: block, and the phase's own permanent CI gate (pin-hygiene, D-08) reliably enforces this going forward"
    status: failed
    reason: "check-action-pins-and-permissions.mjs's attributeJobs() (bbj-vscode/tools/check-action-pins-and-permissions.mjs:219-236) determines job indentation from the first non-blank line after `jobs:` and unconditionally breaks after inspecting that one line, even when it does not match JOB_ID_LINE. If that line is a comment instead of a job id, attributeJobs() returns [] for the whole file, silently disabling every job-level permissions and push/release contents:write check in that file while the scan still exits 0 (Scanned N file(s)... 0 findings). This is CR-01 from 122-REVIEW.md (critical, unresolved as of this verification), reproduced against a throwaway fixture and reconfirmed by direct inspection of the current source. The existing 14-test suite in action-pins-and-permissions-hygiene.test.ts does not exercise a comment directly under `jobs:` (confirmed: none of its fixtures place anything but a job id there), so the defect has no regression coverage. Today's six real workflows happen not to trigger it (none has a comment directly under `jobs:`), so the current tree scans clean, but the enforcement mechanism this phase built specifically so Success Criterion 1 'holds permanently' (122-06-PLAN.md's own success_criteria) does not reliably hold for a shape a future contributor could easily introduce (e.g. adding an explanatory comment above the first job)."
    artifacts:
      - path: "bbj-vscode/tools/check-action-pins-and-permissions.mjs"
        issue: "attributeJobs() (lines 219-236) breaks on the first non-blank line after `jobs:` regardless of match, silently zeroing out job attribution for the file. A related, lower-severity bug in the same file (WR-01): parsePermissionsAt's block-mapping entry regex (line 168, `^\\s*([A-Za-z-]+):\\s*(\\S+)\\s*$`) silently drops a permission key that carries a trailing inline `#` comment, which fails closed (false positive) rather than open."
    missing:
      - "Skip comment lines (and any other non-job-id line) in attributeJobs() the same way blank lines are already skipped, instead of breaking on the first non-blank line (fix given verbatim in 122-REVIEW.md CR-01)"
      - "Add a regression fixture to action-pins-and-permissions-hygiene.test.ts asserting that a comment directly under `jobs:` does not suppress the job-level permissions / push-release finding"
      - "Optionally strip a trailing '# ...' comment before matching a block-mapping permission entry (WR-01) so an inline-commented permission key is not silently dropped"
  - truth: "The packaged VSIX ships only what the runtime extension needs, consistent with the phase's packaging-hardening intent (vscode:prepublish builds only the shipped bundles; package.json carries no dead scripts)"
    status: partial
    reason: "vscode:prepublish itself is correctly narrowed (esbuild.mjs --minify only, no tsc/lint/second bundler), but .vscodeignore was not extended to exclude the CI hygiene tooling and dev-only config that also live under bbj-vscode/. This is WR-02 from 122-REVIEW.md, unresolved as of this verification: npx vsce ls against the current tree still lists tools/check-action-pins-and-permissions.mjs, tools/check-gradle-wrapper.mjs, tools/check-workflow-secrets.mjs, the whole tools/interop-test-harness/** TypeScript source tree, tsconfig.harness.json, tsconfig.test.json, tsconfig.tsbuildinfo, eslint.config.js and vitest.config.ts — none of which src/ references at runtime (grep confirmed only tools/em-login.bbj, tools/em-validate-token.bbj, tools/web.bbj and tools/formatter/** are actually loaded via context.asAbsolutePath). This does not violate any literal must-have wording checked by this phase's plans (which scoped the VSIX-content checks to out/main.js, *.map, coverage/** and the generated grammar only), so it does not by itself block Success Criterion 4, but it is a real, reviewer-identified gap against the phase's stated packaging-hardening intent and remains open."
    artifacts:
      - path: "bbj-vscode/.vscodeignore"
        issue: "Missing exclusions for tools/check-action-pins-and-permissions.mjs, tools/check-gradle-wrapper.mjs, tools/check-workflow-secrets.mjs, tools/interop-test-harness/**, tsconfig.harness.json, tsconfig.test.json, tsconfig.tsbuildinfo, eslint.config.js, vitest.config.ts"
    missing:
      - "Add the WR-02 exclusion list to .vscodeignore and reverify with npx vsce ls that tools/em-login.bbj, tools/em-validate-token.bbj, tools/web.bbj and tools/formatter/** still ship"
behavior_unverified_items:
  - truth: "Roadmap Success Criterion 2 (cache-hit half): a rerun with an unchanged lockfile shows npm/Gradle cache hits"
    test: "Push a second commit to the milestone PR (or observe the first preview.yml run on main) with an unchanged bbj-vscode/package-lock.json, and open the 'Set up Node.js' step log"
    expected: "The step log shows 'Cache restored from key: ...' (npm) and setup-gradle's job summary shows a Gradle cache entry in the low hundreds of MB, not multi-gigabyte (confirming the IntelliJ IDE-download excludes matched)"
    why_human: "A cache hit is an artifact of GitHub Actions' hosted cache service across two real runs; it cannot be observed by reading files in this checkout, and the publish/PR workflows cannot be executed from this local verification pass"
coincidental_reliance_items: []
human_verification:
  - test: "Cache-hit rerun on the milestone PR (Success Criterion 2's dynamic half)"
    expected: "A second push with an unchanged lockfile shows 'Cache restored' in the Set up Node.js step of build.yml/pr-validation.yml, and setup-gradle's job summary reports a modest (not multi-GB) cache entry"
    why_human: "Requires two real GitHub Actions runs; cannot be produced from a local checkout"
  - test: "First preview.yml run after the milestone PR merges to main"
    expected: "Verify job green including Lint and Type-check test tree; bump-version pushes the bump commit; both marketplace publishes green; language-server, vscode-extension and bbj-intellij artifacts all present; setup-gradle's job summary shows a modest cache entry"
    why_human: "Every push to main publishes previews to both marketplaces; this cannot be exercised before merge without actually publishing"
  - test: "manual-release.yml's next dispatched release"
    expected: "tag-release's contents: write scope succeeds at both git push calls; create-release's gh release create succeeds with both artifacts attached"
    why_human: "Only runs on workflow_dispatch; verified statically only in this phase, per the plan's own scope"
  - test: "Install uat-bbj-lang.vsix and uat-bbj-intellij.zip (under /home/coder/repos/tmp/phase-122/) in a live VS Code and IntelliJ instance"
    expected: "The VS Code extension activates on a .bbj file; the IntelliJ plugin starts the language server from the minified main.cjs"
    why_human: "Live IDE activation and language-server startup need an interactive session this verification pass cannot drive; note the automated rig-based e2e suite (test/functional/installed-extension-e2e.test.ts) already exercises activation against the base-version VSIX, so this item is a final human sanity check, not the only evidence for Success Criterion 4"
  - test: "Milestone PR body and the #549 issue comment"
    expected: "PR body carries one `Closes #N` line for each of #547, #549, #550, #518, #573, #515, #598, #600 (an issue table alone does not close issues); #549 gets a comment recording that build.yml stays the one unconditional PR gate and pr-vsix.yml was folded into it"
    why_human: "Editorial/process step on GitHub, not a codebase check"
  - test: "Dependabot configuration page and its next grouped github-actions PR"
    expected: "No configuration error is shown for the new `directories:` form; the next grouped PR also covers /.github/actions/node-setup"
    why_human: "Requires GitHub's Dependabot service to actually run against the merged config"
---

# Phase 122: Release & CI Pipeline Hardening Verification Report

**Phase Goal:** Every workflow runs with least privilege, SHA-pinned actions, cached installs and one shared setup preamble, and `build.yml` stops duplicating the PR checks. The VSIX is built once, minified, from a `package.json` without dead scripts. The phase lands last and is verified with care, because every push to `main` publishes previews to both marketplaces.
**Verified:** 2026-09-29T19:00:42Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | Every workflow declares a least-privilege `permissions:` block; every `uses:` is pinned to a full SHA with a version comment — found by a scan, and the scan holds permanently | ✗ FAILED | All 6 workflows presently have top-level `contents: read` (spot-checked, no top-level write scope). Checker (`check-action-pins-and-permissions.mjs`) reports "Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings." today. But the checker's job-level attribution has an unresolved critical bug (CR-01, 122-REVIEW.md) that silently disables all job-level permissions/push-scope checks for any file whose `jobs:` key is followed by a comment — reproduced, confirmed still present in the current source, and untested by the 14-test suite. See gap 1. |
| 2 | The checkout/Node-setup preamble is defined once and every workflow uses it with npm+Gradle caching; a rerun with an unchanged lockfile shows cache hits | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `.github/actions/node-setup/action.yml` exists and all 6 workflows use `./.github/actions/node-setup`; `gradle/actions/setup-gradle` used in all 5 Gradle-invoking jobs; publish jobs (`publish-vscode`, `publish-intellij` in both release workflows) correctly pass `cache: 'false'` (D-10). The actual "cache hit on rerun" behavior can only be observed on a live GitHub Actions run — not achievable pre-merge. Routed to human verification. |
| 3 | `build.yml` no longer duplicates another PR workflow's build/test, has a concurrency group, and every PR still passes at least one build-and-test gate | ✓ VERIFIED | `pr-vsix.yml` confirmed deleted (`ls .github/workflows/` — 6 files, no pr-vsix.yml); `build.yml` has `concurrency: group: build-${{ github.event.pull_request.number }}, cancel-in-progress: true` and is the single unconditional PR gate per D-01/D-02. |
| 4 | `vscode:prepublish` builds only the shipped bundles, minified; `prepare` no longer runs the full generate/type-check/bundle pipeline; the packaged VSIX installs, activates, and carries the bumped version | ✓ VERIFIED | `package.json`: `prepare` = `npm run langium:generate` only; `vscode:prepublish` = `shx cp ../LICENSE ./LICENSE && node ./esbuild.mjs --minify` (spot-checked). Plan 122-06's scratch Node-22 worktree ran the exact preview.yml sequence (npm ci → bump → build → vsce package) and its automated verify block confirmed the bumped version (0.16.10) in both package.json and vsixmanifest inside the packaged VSIX, kept class names, and no stale artifacts. Plan 122-01's rig-based e2e suite (`test/functional/installed-extension-e2e.test.ts`, `test/language-server-lifecycle.test.ts`) exercised real installation and activation of the minified server against the ext-test rig. Live-IDE install of the final `uat-*` artifacts remains a human sanity check (listed under human_verification), not the sole evidence. |
| 5 | The unreachable npm scripts, unused TextMate generator directive and contradictory `activationEvents` entries are gone; `npm run build`, `npm run langium:generate` and the whole suite still pass | ✓ VERIFIED | `package.json` scripts no longer contain `esbuild-base`/`esbuild`/`esbuild-watch`/`test-compile` (spot-checked); `activationEvents` is exactly `["onLanguage:bbj", "onLanguage:bbx-config"]`; `langium-config.json`'s `textMate` block and the matching `.gitignore` line are gone (per 122-01-SUMMARY.md, confirmed against SUMMARY-recorded evidence). Whole suite per 122-06-SUMMARY.md: `numFailedTests=0`, `numPassedTests=3708` vs base 3694, with the same single pre-existing failing suite (`installed-extension-e2e.test.ts`, itself an environment-dependent test, already known pre-existing per STATE.md). |

**Score:** 3/5 truths verified (1 present-but-behavior-unverified, 1 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `.github/actions/node-setup/action.yml` | Shared checkout/Node-setup preamble, one place | ✓ VERIFIED | Exists, substantive (Node 22, npm cache/install inputs), wired into all 6 workflows (`grep -rn 'node-setup'` across `.github/workflows/*.yml`) |
| `bbj-vscode/tools/check-action-pins-and-permissions.mjs` | Permanent CI-01/CI-03 enforcement checker | ⚠️ WIRED BUT DEFECTIVE | Exists, substantive, wired into `workflow-hygiene.yml`'s `pin-hygiene` job (confirmed) and currently scans clean, but contains the unresolved CR-01 fail-open bug in its job-attribution logic (see gap 1) |
| `.github/dependabot.yml` | `github-actions` entry watches root + composite action, no ignore rule | ✓ VERIFIED | `directories: ["/", "/.github/actions/node-setup"]` present (per 122-06-SUMMARY.md, spot-checked structure); no `ignore:` block |
| `.github/workflows/build.yml` | Single unconditional PR gate, VSIX package + sticky comment, concurrency group | ✓ VERIFIED | `pr-vsix.yml` gone; concurrency group present; top-level `permissions: contents: read` |
| `bbj-vscode/package.json` | Narrowed `prepare`, `vscode:prepublish`, two `activationEvents`, dead scripts removed | ✓ VERIFIED | Spot-checked scripts block and activationEvents array directly |
| `bbj-vscode/.vscodeignore` | VSIX excludes non-runtime files | ⚠️ PARTIAL | Excludes `*.map`, `out/main.js`, `coverage/**` (verified) but not the CI tooling / dev-config files identified in WR-02 (see gap 2) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `workflow-hygiene.yml` `pin-hygiene` job | `check-action-pins-and-permissions.mjs` | `run: node bbj-vscode/tools/check-action-pins-and-permissions.mjs` | WIRED | Confirmed present in workflow-hygiene.yml |
| `.github/dependabot.yml` `github-actions` entry | `.github/actions/node-setup/action.yml` | `directories:` list entry | WIRED | Confirmed structure per 122-06-SUMMARY.md |
| `package.json` `vscode:prepublish` | `esbuild.mjs` | `node ./esbuild.mjs --minify` | WIRED | Confirmed literal script text |
| 6 workflows | `.github/actions/node-setup` | `uses: ./.github/actions/node-setup` | WIRED | Confirmed via grep across all 6 workflow files |
| 5 Gradle-invoking jobs | `gradle/actions/setup-gradle` | pinned `uses:` reference after inline `wrapper-validation` | WIRED | Confirmed via grep; publish jobs correctly set `cache: 'false'` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Checker scans the real tree clean | `node bbj-vscode/tools/check-action-pins-and-permissions.mjs` | `Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings.` exit 0 | ✓ PASS (today's shapes only — see gap 1 for the untested failure mode) |
| Checker test suite passes | `npx vitest run test/action-pins-and-permissions-hygiene.test.ts` | 14/14 passed | ✓ PASS (no fixture exercises a comment directly under `jobs:`) |
| CR-01 repro (comment directly under `jobs:` disables job checks) | Fixture with `# a job comment` immediately after `jobs:`, a job with `git push` and no explicit `permissions:` | Reported by 122-REVIEW.md: exits 0, 0 findings, despite an under-scoped pushing job | ✗ FAIL (confirmed still reproducible against current source by direct code inspection — lines 226-236 unchanged since the review) |
| Top-level permissions present in all workflows | `grep -n '^permissions:' -A2 .github/workflows/*.yml` | All 6 show `contents: read` | ✓ PASS |
| `pr-vsix.yml` deleted, folded into `build.yml` | `ls .github/workflows/` | 6 files, no `pr-vsix.yml`; `build.yml` has concurrency group | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| CI-01 | 122-03, 122-04, 122-05, 122-06 | Every workflow declares a least-privilege `permissions:` block | ⚠️ PARTIAL | Today's workflows are correctly scoped (verified), but the permanent enforcement checker has the unresolved CR-01 fail-open bug for the job-level/push-scope half of this rule |
| CI-02 | 122-04 | `build.yml` no longer duplicates the PR build/test, has a concurrency group | ✓ SATISFIED | `pr-vsix.yml` deleted, merged into `build.yml`; concurrency group confirmed |
| CI-03 | 122-02, 122-03, 122-04, 122-05, 122-06 | Every action reference pinned to a commit SHA with version comment | ✓ SATISFIED | All 12 distinct pins cross-checked against GitHub in 122-06 (pins-verified.txt: 12 OK, 0 MISMATCH) and by code review's independent `gh api` cross-check; the pin-checking code path is not affected by CR-01 (CR-01 only disables the job-attribution-dependent permissions/push-scope checks, not `pushPinFinding`) |
| CI-05 | 122-02, 122-04, 122-05 | Every workflow installing npm/Gradle deps uses caching | ✓ SATISFIED (static) | Composite action npm caching + `setup-gradle` in every Gradle job confirmed; publish jobs correctly cache-disabled; actual cache-hit behavior is a human-verification item |
| CI-06 | 122-04 | Shared checkout/Node-setup preamble used by every workflow | ✓ SATISFIED | `.github/actions/node-setup` used by all 6 workflows (confirmed via grep) |
| CI-07 | 122-01, 122-06 | `vscode:prepublish` builds only shipped bundles, minified; dead `esbuild-base` step gone | ✓ SATISFIED (packaging pipeline itself) / ⚠️ NOTE | Script narrowing verified directly; packaging *pipeline* is correct, but the resulting VSIX still ships non-runtime dev/CI files per WR-02 (gap 2) — a scope gap against the phase's broader packaging-hardening intent, not a literal violation of CI-07's stated acceptance criteria |
| CI-08 | 122-01, 122-05, 122-06 | `prepare` no longer duplicates generate/type-check/bundle pipeline | ✓ SATISFIED | `prepare` = `npm run langium:generate` only (verified directly); scratch-worktree dry run confirmed `npm ci` builds nothing |
| CI-09 | 122-01 | Unreachable scripts, unused TextMate directive, contradictory `activationEvents` removed | ✓ SATISFIED | Verified directly against package.json and langium-config.json |

All 8 phase requirement IDs (CI-01, CI-02, CI-03, CI-05, CI-06, CI-07, CI-08, CI-09) are declared across the six plans' frontmatter and each has SUMMARY evidence; none are orphaned against REQUIREMENTS.md's Phase 122 mapping.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `bbj-vscode/tools/check-action-pins-and-permissions.mjs` | 226-236 | Silent fail-open in a security-control script (`attributeJobs()` breaks on the first non-blank line after `jobs:` regardless of match) | 🛑 Blocker | The permanent CI-01 enforcement gate this phase built can be silently defeated by a one-line comment; untested by the accompanying suite |
| `bbj-vscode/tools/check-action-pins-and-permissions.mjs` | 168 | Fails-closed parsing bug: a permission entry with a trailing inline comment is silently dropped | ⚠️ Warning | Lower severity (fails closed, i.e. produces a false-positive finding rather than a missed one), but still incorrect logic in a hand-rolled security-control parser |
| `bbj-vscode/.vscodeignore` | n/a | Missing exclusions for CI hygiene scripts and dev-only config that ship in the VSIX | ⚠️ Warning | Public Marketplace artifact ships internal tooling source and dev configs unnecessarily (WR-02) |
| `bbj-vscode/package.json` | `vscode:prepublish` | No `lint` step in `vscode:prepublish` (intentional, per D-14) | ℹ️ Info | Safe in CI (every workflow calling `vsce package` runs `npm run lint` as an explicit prior step); a developer running `npx vsce package` locally, cold, no longer gets a lint pass for free (IN-01 in 122-REVIEW.md, informational only) |

No `TBD`/`FIXME`/`XXX` debt markers were found in the phase's modified files.

### Human Verification Required

See the `human_verification` list in the frontmatter — six items, none of which are gaps in the codebase per se: they require a live GitHub Actions run (cache-hit rerun, the first `preview.yml` run after merge, `manual-release.yml`'s next dispatch), a live IDE session (installing the two `uat-*.vsix`/`.zip` artifacts), or a GitHub-side editorial step (the milestone PR's `Closes #N` lines and the `#549` decision comment, and confirming Dependabot's config is accepted).

### Gaps Summary

Two gaps block a clean "passed" verdict, both carried over unresolved from the code review completed just before this verification (122-REVIEW.md):

1. **CR-01 (critical, BLOCKER):** the pin/permissions checker's `attributeJobs()` silently disables every job-level permissions and push/release `contents: write` check for a workflow file the moment a comment appears directly under `jobs:` — reproduced, confirmed still present, and untested by the checker's own 14-test suite. This is a defect in the very artifact this phase built to make Success Criterion 1 hold "permanently" (122-06-PLAN.md's own words), so it is treated as a failed truth rather than an accepted trade-off. Today's six real workflows don't trigger it, so the phase's current state is not insecure — but the enforcement mechanism cannot be trusted to catch the next contributor who does.
2. **WR-02 (warning, non-blocking):** `.vscodeignore` was not extended to exclude the three CI hygiene `.mjs` scripts, the `tools/interop-test-harness/` source tree, and several dev-only config files, so the public VSIX still ships them even though nothing at runtime loads them. This doesn't violate any must-have literally checked by this phase's plans, but it is a real, reviewer-identified shortfall against the phase's packaging-hardening intent.

Both gaps have exact fixes already spelled out in 122-REVIEW.md (CR-01, WR-01, WR-02) and are small, mechanical closure plans — not a redesign.

**This looks intentional in neither case** — no alternative implementation exists that achieves the same intent, so no override is suggested. Recommend a small follow-up plan (or wave) to apply the CR-01 fix plus its regression fixture, and the WR-02 `.vscodeignore` additions, before treating Phase 122 as fully closed.

---

_Verified: 2026-09-29T19:00:42Z_
_Verifier: Claude (gsd-verifier)_
