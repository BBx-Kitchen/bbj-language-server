---
phase: 122-release-ci-pipeline-hardening
verified: 2026-09-29T19:48:35Z
status: human_needed
score: 7/8 must-haves verified
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  previous_verified_at_commit: d6981997
  verified_at_commit: 04eedf69
  gaps_closed:
    - "CR-01: a comment directly under `jobs:` no longer disables job attribution (fixed in 73bf4e29; regression test present and passing; four independent scratch fixtures with different comment placements all produce the expected finding)"
    - "WR-01: an inline `# comment` on a job-level permissions entry no longer drops the key (fixed in b56418c3; regression test plus scratch fixture both scan clean)"
    - "WR-02: the packaged VSIX ships only runtime files (fixed in a65e792b; `npx vsce ls --no-dependencies` confirms all nine dev/CI paths excluded and em-login.bbj, em-validate-token.bbj, web.bbj and formatter/** still shipped)"
  gaps_remaining: []
  closed_after_report:
    - "Trailing comment on a job id or jobs: key hid jobs from the push-scope rule (found in this pass). Fixed in 8f794c98: JOBS_KEY_LINE, RUNS_KEY_LINE and JOB_ID_LINE accept a trailing `# comment`, and a workflow whose jobs: key yields no job ids is now a finding. Three regression tests added (first job id + jobs: key comment, later job id after a contents: write job, unrecognised job ids); all three fail on the previous checker and pass now (checker suite 19/19); the real tree still scans with 0 findings."
  regressions: []
gaps: []
behavior_unverified_items:

  - truth: "Roadmap SC2 (cache-hit half): a rerun with an unchanged lockfile shows cache hits"
    test: "npm: push a second commit to PR #708 with bbj-vscode/package-lock.json unchanged and open the Build workflow's 'Set up Node' step. Gradle: after the first preview.yml run on main (the default branch writes the Gradle cache), rerun pr-validation on a PR and open the 'Set up Gradle' step."
    expected: "npm: 'Cache restored from key: ...' instead of this first run's 'npm cache is not found'. Gradle: 'Gradle User Home cache' restored instead of 'not found', and the setup-gradle job summary shows an entry of a few hundred MB, not several GB (the IDE downloads stay excluded)."
    why_human: "Cache hits exist only across two real GitHub Actions runs. The only CI run so far (19:39Z on ec9b991f) was cold. It also confirms that setup-gradle is read-only on pull requests ('Cache is read-only: will not save state'), so no PR rerun can show a Gradle hit until a main run has written the cache."
coincidental_reliance_items: []
human_verification:

  - test: "Cache-hit reruns (Roadmap SC2 dynamic half): see behavior_unverified_items"
    expected: "npm cache restored on a PR rerun; Gradle cache restored on the first PR run after a preview.yml run on main has written it"
    why_human: "Requires real GitHub Actions runs; setup-gradle writes the cache only on the default branch"
  - test: "First preview.yml run after the milestone PR merges to main"
    expected: "The verify job is green, including Lint and Type-check test tree. bump-version pushes the bump commit, both marketplace publishes are green, the language-server, vscode-extension and bbj-intellij artifacts are all present, and setup-gradle writes a modest cache entry"
    why_human: "Every push to main publishes previews to both marketplaces, so it cannot run before merge without publishing"
  - test: "manual-release.yml's next dispatched release"
    expected: "tag-release's contents: write lets both git push calls succeed; create-release's gh release create succeeds with both artifacts attached"
    why_human: "Runs only on workflow_dispatch; this phase verifies it statically only"
  - test: "Dependabot configuration page and its next grouped github-actions PR"
    expected: "No configuration error for the `directories:` form; the next grouped PR also covers /.github/actions/node-setup"
    why_human: "Requires GitHub's Dependabot service to run against the merged config"
  - test: "#549 decision comment"
    expected: "#549 has a comment recording that build.yml stays the one unconditional PR gate and that pr-vsix.yml was folded into it (it has 0 comments today). The PR #708 body already has a Closes line for each of #547, #549, #550, #518, #573, #515, #598 and #600, verified with gh pr view"
    why_human: "An editorial step on GitHub, not a codebase check"
audit_acknowledged:
  milestone: v4.7
  at: 2026-09-29
  status: human_needed
---

# Phase 122: Release & CI Pipeline Hardening Verification Report

**Phase Goal:** Every workflow runs with least privilege, SHA-pinned actions, cached installs and one shared setup preamble, and `build.yml` stops duplicating the PR checks. The VSIX is built once, minified, from a `package.json` without dead scripts. The phase lands last and is verified with care, because every push to `main` publishes previews to both marketplaces.
**Verified:** 2026-09-29T19:48:35Z, against HEAD `04eedf69` (code identical to `ec9b991f`; the only later commit adds 122-SECURITY.md)
**Status:** human_needed (updated after 8f794c98 closed the remaining gap; originally gaps_found)
**Re-verification:** Yes. The previous report at `d6981997` had status gaps_found and score 3/5. This pass is a full goal-backward re-run, not a regression-only check.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | **SC1.** A scan finds every workflow declaring a least-privilege `permissions:` block (per job where scopes differ), and every `uses:` pinned to a full SHA with a version comment | ✓ VERIFIED | Local checker: `Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings.`, exit 0. The same line appears in the live GitHub `pin-hygiene` job on PR #708 (run 36620838644, green). `--print`: all 6 workflows have top-level `contents=read`. Write scopes appear only on preview `bump-version`, manual-release `tag-release` and `create-release` (`contents=write`), build `pull-requests=write`, and deploy-docs `deploy` (`pages=write`, `id-token=write`). I re-resolved all 12 distinct pins through the GitHub API (annotated tags dereferenced): 12 OK, 0 MISMATCH. Durability of the gate is covered by truth 6. |
| 2 | **SC2.** The checkout/Node preamble is defined once and used by every workflow with npm and Gradle caching; a rerun with an unchanged lockfile shows cache hits | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `.github/actions/node-setup/action.yml`: setup-node is pinned with Node 22, npm cache is conditional on `cache`, and `npm ci` is conditional on `install`. Every one of the 6 workflows uses `./.github/actions/node-setup` (1/1/2/1/2/3 references). `setup-gradle` appears in all 5 Gradle jobs. Both publish-vscode jobs pass `cache: 'false'` and both publish-intellij jobs pass `cache-disabled: true`. The live first run shows setup-node with `cache: npm` ("npm cache is not found", cold) and setup-gradle active ("Gradle User Home cache not found"; read-only on PR). The cache-hit half needs a second real run and is routed to human verification. |
| 3 | **SC3.** `build.yml` no longer duplicates another PR workflow's build/test, has a concurrency group, and every PR to main still passes a build-and-test gate | ✓ VERIFIED | `pr-vsix.yml` is gone (6 workflows remain). `build.yml` triggers on `pull_request: branches: [main]` with no paths filter. Its concurrency group is `build-${{ github.event.pull_request.number }}`, which differs from `pr-validation-…`. Steps run in order: Build, Lint, Type-check, Test (`success() \|\| failure()`), Package VSIX, Upload, sticky comment. Live: the Build workflow is green on PR #708 (run 36620838698). |
| 4 | **SC4.** `vscode:prepublish` builds only the shipped bundles, minified; `prepare` no longer runs the full pipeline; the packaged VSIX installs, activates and carries the bumped version | ✓ VERIFIED | `prepare` = `npm run langium:generate`. `vscode:prepublish` = `shx cp ../LICENSE ./LICENSE && node ./esbuild.mjs --minify`. `esbuild.mjs` has two entry points (`src/extension.ts`, `src/language/main.ts`), `minify`, `keepNames: true` and `sourcemap: !minify`. `vsce ls`: `out/` holds only `extension.cjs` and `language/main.cjs`, with no `.map`, `out/main.js`, `coverage/` or generated grammar. UAT tests 1-3 were passed by a human: the minified VSIX activates in VS Code and IntelliJ starts the LS from the minified main.cjs. UAT test 31 (automated, Node 22 scratch worktree) confirmed the bumped version in both package.json and the vsixmanifest. |
| 5 | **SC5.** The unreachable npm scripts, unused TextMate directive and contradictory `activationEvents` are gone; build, generate and the whole suite pass | ✓ VERIFIED | None of `esbuild-base`, `esbuild`, `esbuild-watch` or `test-compile` exists. `activationEvents` = `["onLanguage:bbj","onLanguage:bbx-config"]`. `langium-config.json` has no `textMate` key, `.gitignore` has no `gen-bbj` line, and `syntaxes/` holds only the two hand-written grammars. Rerun here: `npm run lint` exit 0 and `npm run typecheck:test` exit 0. Whole suite (`--maxWorkers=2`): numFailedTests **0**, 3710 passed, 30 pending. That is 3708 at plan 06 plus the 2 new regression fixtures. The only failing suite is the pre-existing environment-dependent `installed-extension-e2e.test.ts`. I did not rerun `build` or `langium:generate` because local Node is v24, which is known to break langium generate. No commit since the last passing run touches their inputs (only a tools `.mjs`, a test, `.vscodeignore` and one harness comment changed), and UAT tests 13 and 32 cover both on Node 22. |
| 6 | Previous gap 1 (CR-01): a comment directly under `jobs:` no longer suppresses job-level permissions and push-scope findings | ✓ VERIFIED | The fix at line 229 skips `/^\s*#/` lines. The checker suite passes **16/16**, including `a comment line directly under jobs: does not suppress job attribution`. Scratch fixtures a-d all give the expected finding (exit 1): a comment under `jobs:`, several comments plus a blank line, a column-0 comment, and a comment between two jobs. |
| 7 | Plan 122-03 must-have: every job whose run body pushes or creates a release is flagged unless its effective scope is `contents: write` | ✓ VERIFIED (after 8f794c98; originally ✗ FAILED) | Fixed in 8f794c98 with three regression tests that fail on the previous checker. Original finding: | Scratch fixture **e** (`  pusher: # pushes the tag` as the first job, `git push`, top-level `contents: read`) prints `0 findings.` and exits **0**. Scratch fixture **h** (a later `  pusher: # tag job` after a `contents: write` job) also exits **0**. Root cause: `JOB_ID_LINE` does not allow a trailing comment. See the Gaps section. |
| 8 | Previous gap 2 (WR-02): the packaged VSIX ships only what the runtime needs | ✓ VERIFIED | `npx vsce ls --no-dependencies` (37 files). Under `tools/` only `em-login.bbj`, `em-validate-token.bbj`, `web.bbj` and the 5 `formatter/**` files remain; `src/em-auth.ts` and `src/formatter-verifier.ts` load these, and `web.bbj` is referenced from `src/Commands/process-args.ts`. None of `check-*.mjs`, `interop-test-harness`, `tsconfig*.json`, `eslint.config.js` or `vitest.config.ts` appears. |

**Score:** 7/8 truths verified (1 present but behavior-unverified). Originally 6/8 with truth 7 failed; closed by 8f794c98.

WR-01 (an inline comment on a permission entry) is also closed. Its regression test passes, and scratch fixture g (`contents: write # needed to push` under a leading `jobs:` comment) scans clean with exit 0.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `.github/actions/node-setup/action.yml` | Shared Node preamble | ✓ VERIFIED | Substantive (4 inputs, pinned setup-node v4.4.0, conditional cache and install). Wired into all 6 workflows. |
| `.github/workflows/build.yml` | Single unconditional PR gate | ✓ VERIFIED | Concurrency group, least privilege, test VSIX and sticky comment. Green on PR #708. |
| `.github/workflows/{pr-validation,preview,manual-release,deploy-docs,workflow-hygiene}.yml` | Pinned, least-privilege, action-based | ✓ VERIFIED | All three hygiene checkers report 0 findings locally and in live CI. |
| `bbj-vscode/tools/check-action-pins-and-permissions.mjs` | Permanent pin/permission gate | ⚠️ WIRED, PARTIAL | Wired into `workflow-hygiene.yml`'s `pin-hygiene` job (`node bbj-vscode/tools/check-action-pins-and-permissions.mjs`, live green). CR-01 and WR-01 are fixed, but a trailing-comment job id still fails open (truth 7). |
| `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` | Rule-by-rule fixtures plus the real-tree case | ✓ VERIFIED (coverage gap) | 16/16 pass, including the real-tree case. It has no trailing-comment job-id fixture. |
| `.github/dependabot.yml` | github-actions entry covering the composite action | ✓ VERIFIED | `directories: ["/", "/.github/actions/node-setup"]`, weekly, grouped, no `ignore:`. |
| `bbj-vscode/package.json` | Narrowed scripts and two activation events | ✓ VERIFIED | Read directly. |
| `bbj-vscode/esbuild.mjs` | Minified, keepNames, no sourcemap when minified | ✓ VERIFIED | Lines 5, 8, 19, 20, 23. |
| `bbj-vscode/.vscodeignore` | VSIX excludes non-runtime files | ✓ VERIFIED | 9 WR-02 entries plus `**/*.map`, `out/main.js` and `coverage/**`; confirmed with `vsce ls`. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `workflow-hygiene.yml` `pin-hygiene` | `check-action-pins-and-permissions.mjs` | `run:` step, on push and pull_request to main | WIRED | Live run log: `Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings.` |
| 6 workflows | `.github/actions/node-setup` | `uses: ./.github/actions/node-setup` | WIRED | 10 references in total |
| 5 Gradle jobs | `gradle/actions/setup-gradle@3f5f9ada… # v6.4.0` | pinned step after inline wrapper-validation | WIRED | `check-gradle-wrapper.mjs`: 5 Gradle jobs, 0 findings (local and live) |
| `dependabot.yml` github-actions | composite action | `directories:` entry | WIRED | |
| `package.json` `vscode:prepublish` | `esbuild.mjs --minify` | npm script | WIRED | |
| `.vscodeignore` | VSIX contents | vsce packaging | WIRED | `vsce ls` output matches the intended set |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Checker suite | `npx vitest run test/action-pins-and-permissions-hygiene.test.ts` | 16 passed (16) | ✓ PASS |
| Real-tree pin/permission scan | `node bbj-vscode/tools/check-action-pins-and-permissions.mjs` | `Scanned 7 file(s), 64 uses reference(s), 6 workflow(s), 0 findings.` exit 0 | ✓ PASS |
| Secret and wrapper hygiene | `check-workflow-secrets.mjs` and `check-gradle-wrapper.mjs` | 7 files, 39 run blocks, 0 findings / 1 wrapper, 5 Gradle jobs, 0 findings | ✓ PASS |
| CR-01 shapes (fixtures a-d) | scratch fixtures, comment under or between jobs | 1 finding each, exit 1 | ✓ PASS |
| WR-01 shape (fixture g) | inline comment on `contents: write` | 0 findings, exit 0 (correct) | ✓ PASS |
| Trailing-comment job id, first job (fixture e) | `pusher: # …` pushes with `contents: read` | 0 findings, **exit 0** | ✗ FAIL |
| Trailing-comment job id, later job (fixture h) | `pusher: # …` after a write-scoped job | 0 findings, **exit 0** | ✗ FAIL |
| VSIX contents | `npx vsce ls --no-dependencies` | 37 files; runtime tools kept, dev/CI files absent | ✓ PASS |
| Pin to SHA correctness | `gh api` tag resolution for 12 distinct pins | 12 OK, 0 MISMATCH | ✓ PASS |
| Lint / typecheck:test | `npm run lint`, `npm run typecheck:test` | both exit 0 | ✓ PASS |
| Whole suite (run once) | `npx vitest run --maxWorkers=2` | numFailedTests 0, 3710 passed | ✓ PASS |
| Live PR CI on #708 | `gh run list --branch gsd/v4.7-audit-hygiene-burndown` | Build ✓, Workflow Hygiene ✓ (3/3 jobs), PR Validation ✗ (see the milestone-level note below) | ✓ for this phase's gates |

### Probe Execution

This phase declares no `scripts/*/tests/probe-*.sh` probes. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|---|---|---|---|
| CI-01 (least-privilege permissions) | 03, 04, 05, 06 | ⚠️ PARTIAL | Every workflow in the tree is correctly scoped (verified locally and live). The permanent gate's push-scope rule fails open for trailing-comment job ids (gap). |
| CI-02 (build.yml deduplicated, concurrency) | 04 | ✓ SATISFIED | Truth 3 |
| CI-03 (SHA pins with version comment) | 02, 03, 04, 05, 06 | ✓ SATISFIED | 64 references, 0 findings; 12/12 pins re-resolved on GitHub. The pin rule does not depend on job attribution. |
| CI-05 (caching) | 02, 04, 05 | ✓ SATISFIED (static) | Cache hits are a human item |
| CI-06 (shared preamble) | 04 | ✓ SATISFIED | Truth 2, static half |
| CI-07 (prepublish minified shipped bundles only) | 01, 06 | ✓ SATISFIED | Truth 4; VSIX contents are now clean (WR-02 closed) |
| CI-08 (prepare narrowed) | 01, 05, 06 | ✓ SATISFIED | Truth 4 |
| CI-09 (dead scripts, TextMate directive, activationEvents) | 01 | ✓ SATISFIED | Truth 5 |

All 8 of the phase's requirement IDs are claimed by plans, and none are orphaned.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `bbj-vscode/tools/check-action-pins-and-permissions.mjs` | 26, 227-237 | Silent fail-open in a CI security-control script: a job id with a trailing comment yields zero or misattributed jobs, and the scan still exits 0 | 🛑 Blocker (plan must-have falsified) | The push-scope rule (122-SECURITY.md T-122-13 "closed") can be bypassed by one comment. Today's tree is unaffected. |
| `bbj-vscode/tools/check-gradle-wrapper.mjs` | 260-278 | The same `JOB_ID_LINE` attribution shape (its own comment calls the result "unexpected shape") | ℹ️ Info | Predates this phase; worth fixing alongside the above for consistency |
| `bbj-vscode/.vscodeignore` | n/a | `esbuild.mjs`, `langium-config.json` and `VERBs.md` still ship, and `src/` does not reference them | ℹ️ Info | Outside the WR-02 list; small and harmless |
| `bbj-vscode/package.json` | `vscode:prepublish` | No lint step (intentional; CI lints before every `vsce package`) | ℹ️ Info | IN-01, accepted |

The phase diff (base `0427da45` to HEAD, excluding `.planning`) has no `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` markers, no planning identifiers in added lines, and no closing keywords in commit bodies.

### Milestone-Level Finding (not attributable to Phase 122)

PR #708's **PR Validation** run failed in the `validate-intellij` job. The step is "Build IntelliJ plugin", and the failing test is `ComposerRequestContractTest.everyDeclaredRequestNameExistsAsAQuotedLiteralInTheLanguageServerSources` (1160 tests, 1 failed). The literal `'bbj/refreshJavaClasses'` is no longer in any of the five files the test reads, because commit `4825124b` (plan 116-02) moved the handler into `src/language/java-class-refresh.ts`. This phase changed only the Gradle setup in that job; the test and the source move predate it. It is not a Phase 122 gap, but the milestone PR stays red until the test's file list is updated. The same run confirms this phase's setup-gradle wiring live ("gradle/actions: Writing build results", read-only cache on PR).

### Human Verification Required

These items stay open after the gap is closed; see `human_verification` in the frontmatter.

1. **Cache-hit reruns.** npm on a PR rerun. Gradle only after a `main` run writes the cache, because setup-gradle is read-only on PRs (confirmed live).
2. **First `preview.yml` run after merge.** Verify job, bump push, both publishes and artifacts.
3. **Next `manual-release.yml` dispatch.** `contents: write` works on tag-release and create-release.
4. **Dependabot.** It accepts `directories:` and its next grouped PR covers the composite action.
5. **#549 decision comment.** The PR body's eight `Closes` lines are already verified.

The earlier live-IDE install item is closed by UAT tests 1-3, which a human passed.

### Gaps Summary

Both gaps from the previous report are closed as written. CR-01, WR-01 and WR-02 are fixed, have regression coverage where applicable, and were independently reproduced as fixed.

A continued attack on the same function found one residual in the same fail-open class. `JOB_ID_LINE` does not accept a trailing comment on a job id line (`pusher: # pushes the tag`), which is valid workflow YAML. Two things follow:

- If that line is the first job, `attributeJobs()` still exits early with no indentation and returns no jobs.
- If it is a later job, its steps are attributed to the previous job.

Either way, an under-scoped pushing job passes the gate with exit 0. The plan 122-03 must-have ("an under-scoped release job fails CI instead of failing silently") is therefore not reliably met, and the mitigation 122-SECURITY.md marks closed for T-122-13 has a bypass. For consistency with the previous verdict, which treated CR-01 as a blocker on exactly this reasoning, this is recorded as a gap and not downgraded.

The fix is small and mechanical:

- Allow `(?:#.*)?` after the colon in `JOB_ID_LINE`.
- Add two fixtures, one for the first job id and one for a later job id after a write-scoped job.
- Ideally, fail closed when a workflow has `jobs:` but zero jobs are attributed.

Once that lands, only GitHub-side items remain, and the expected status is `human_needed`.

**Update (8f794c98):** the fix landed as described, including the fail-closed finding for a `jobs:` key with no recognised job ids. The three new regression tests fail against the previous checker and pass now (checker suite 19/19); the real tree still scans with 0 findings; lint and typecheck:test pass. Only GitHub-side items remain, so the status is now `human_needed`.

No later milestone phase covers this (122 is the milestone's last phase), so nothing is deferred.

---

_Verified: 2026-09-29T19:48:35Z_
_Verifier: Claude (gsd-verifier)_
