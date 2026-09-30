---
phase: 122-release-ci-pipeline-hardening
fixed_at: 2026-09-29T19:15:00Z
review_path: .planning/phases/122-release-ci-pipeline-hardening/122-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 122: Code Review Fix Report

**Fixed at:** 2026-09-29T19:15:00Z
**Source review:** .planning/phases/122-release-ci-pipeline-hardening/122-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 3
- Skipped: 1

**Verification environment:** All edits, syntax checks, and vitest/vsce verification ran inside
an isolated git worktree (`git worktree add -b gsd-reviewfix/122-389342 ...` off
`gsd/v4.7-audit-hygiene-burndown`), with `node_modules` symlinked in from the main checkout so
`npx vitest` / `npx vsce` could resolve dependencies without a separate `npm install`. The
worktree's commits were fast-forwarded onto `gsd/v4.7-audit-hygiene-burndown` and the worktree
removed as part of this run's cleanup, so these results are reproducible from the main checkout at
its current `HEAD`.

## Fixed Issues

### CR-01: `attributeJobs()` silently disables all job-level checks when a comment follows `jobs:`

**Files modified:** `bbj-vscode/tools/check-action-pins-and-permissions.mjs`, `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts`
**Commit:** `73bf4e29`
**Applied fix:** Changed the indent-detection loop in `attributeJobs()` to skip comment lines (`/^\s*#/`) the same way it already skips blank lines, instead of unconditionally `break`ing on the first non-blank line regardless of whether it matched a job id. Added a regression fixture (`a comment line directly under jobs: does not suppress job attribution`) asserting a push/release finding still fires when a comment sits directly under `jobs:`. Verified: `npx vitest run test/action-pins-and-permissions-hygiene.test.ts` — 15/15 passing (14 original + 1 new) at this point; and `node tools/check-action-pins-and-permissions.mjs` against the real workflow tree still reports `0 findings`.

### WR-01: Inline comment on a job-level `permissions:` entry silently drops that key

**Files modified:** `bbj-vscode/tools/check-action-pins-and-permissions.mjs`, `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts`
**Commit:** `b56418c3`
**Applied fix:** In `parsePermissionsAt()`'s block-mapping branch, strip a trailing `\s+#.*$` comment from each candidate line before matching the `key: value` entry regex, so `contents: write # needed to push the release tag` is no longer silently dropped (which previously made `contentsFromBlock` fall back to `'none'` and raise a spurious finding). Added a regression fixture (`an inline comment on a job-level permissions entry does not drop that key`) covering exactly the reviewer's reproduction. Verified: `npx vitest run test/action-pins-and-permissions-hygiene.test.ts` — 16/16 passing; `node tools/check-action-pins-and-permissions.mjs` against the real workflow tree still reports `0 findings`.

### WR-02: VSIX packaging still ships dev/CI-only files the runtime extension never loads

**Files modified:** `bbj-vscode/.vscodeignore`
**Commit:** `a65e792b`
**Applied fix:** Added the eight entries the review suggested (`tools/check-action-pins-and-permissions.mjs`, `tools/check-gradle-wrapper.mjs`, `tools/check-workflow-secrets.mjs`, `tools/interop-test-harness/**`, `tsconfig.harness.json`, `tsconfig.test.json`, `tsconfig.tsbuildinfo`, `eslint.config.js`, `vitest.config.ts`) to `.vscodeignore`. Verified with `npx vsce ls --no-dependencies`: all nine excluded paths are gone from the package listing, while `tools/em-login.bbj`, `tools/em-validate-token.bbj`, `tools/web.bbj`, and all four `tools/formatter/**` files (loaded at runtime via `context.asAbsolutePath(...)` in `src/em-auth.ts` and `src/formatter-verifier.ts`) still ship. Checked for existing tests asserting on `.vscodeignore` contents or on the excluded paths (`grep` over `test/` and `test/functional/installed-extension-e2e.test.ts`) — none found, so no test needed updating.

## Skipped Issues

### IN-01: `vscode:prepublish` no longer runs lint

**File:** `bbj-vscode/package.json:669`
**Reason:** skipped: no change warranted (info-level, review itself says "No action required")
**Original issue:** The new `vscode:prepublish` script (`shx cp ../LICENSE ./LICENSE && node ./esbuild.mjs --minify`) dropped the old script's trailing `npm run lint` step. Verified via `grep -l "npm run lint" .github/workflows/*.yml`: all three workflows that actually invoke `vsce package` (`build.yml`, `manual-release.yml`, `preview.yml`) run `npm run lint` as an explicit, gating (`if: success()`-scoped) prior step, so CI is unaffected. `workflow-hygiene.yml`, `pr-validation.yml`, and `deploy-docs.yml` don't run lint either, but none of them package the VSIX, so that's not a gap for this finding. The only residual effect is that a developer running `npx vsce package` locally right after a clean checkout no longer gets a free lint pass. Per the review's own "no action required" framing and the fix guidance to prefer skip over a speculative doc edit, no contributor-doc note was added — CI packaging is fully covered, and adding developer-workflow documentation for a single local-only command is judgment-call scope creep beyond what the finding asks for.

---

_Fixed: 2026-09-29T19:15:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
