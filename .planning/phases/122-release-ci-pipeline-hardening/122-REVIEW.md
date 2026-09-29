---
phase: 122-release-ci-pipeline-hardening
reviewed: 2026-09-29T18:56:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .github/actions/node-setup/action.yml
  - .github/dependabot.yml
  - .github/workflows/build.yml
  - .github/workflows/deploy-docs.yml
  - .github/workflows/manual-release.yml
  - .github/workflows/pr-validation.yml
  - .github/workflows/preview.yml
  - .github/workflows/workflow-hygiene.yml
  - bbj-vscode/.gitignore
  - bbj-vscode/.vscodeignore
  - bbj-vscode/esbuild.mjs
  - bbj-vscode/langium-config.json
  - bbj-vscode/package.json
  - bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts
  - bbj-vscode/test/cvs-composer-ui.test.ts
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
  - bbj-vscode/test/setopts-in-code-ui.test.ts
  - bbj-vscode/tools/check-action-pins-and-permissions.mjs
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 122: Code Review Report

**Reviewed:** 2026-09-29T18:56:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the workflow-hardening changes (SHA pinning, least-privilege `permissions:`, the shared
`node-setup` composite action, the new `check-action-pins-and-permissions.mjs` gate) and the
extension-packaging changes (`.vscodeignore`, `esbuild.mjs` `keepNames`, `langium-config.json`,
dropped `onCommand:*` activation events).

`.github/workflows/pr-vsix.yml` is listed in scope but no longer exists — `git log --follow`
confirms it was deliberately folded into `build.yml` by commit `b326ef22` ("make build.yml the
single pull-request gate with the test VSIX"), not an accidental deletion; excluded from the file
count above.

Every `uses:` SHA pin across the workflow tree and the composite action was cross-checked against
the real upstream tag ref via `gh api` (including dereferencing `gradle/actions`' annotated tag) —
all 12 distinct pins resolve to the exact commit the version comment claims. `permissions:` blocks
are consistently least-privilege (no top-level write scope anywhere; write scopes are pushed down
to the specific job that needs them: `build`'s PR-comment step, `deploy-docs`' `deploy` job,
`preview`'s `bump-version`, and `manual-release`'s `tag-release`/`create-release`). Untrusted
`workflow_dispatch` input (`github.event.inputs.version`) is consistently routed through a
step-scoped `env:` mapping before use in `run:` bodies rather than interpolated directly, avoiding
shell-injection via a crafted version string. Fork-PR handling in `build.yml` is correct for the
`pull_request` (not `pull_request_target`) trigger.

The new `check-action-pins-and-permissions.mjs` hand-rolled line-based YAML scanner is the
highest-risk piece of new logic in this phase (it is itself a security control), and it has a real
gap: **`attributeJobs()` silently returns no jobs — disabling every job-level permission and
push/release check in that file — the moment `jobs:` is followed by a comment line instead of the
first job id**, reproduced below. A second, lower-severity bug in the same file causes a false
*positive* (parser drops a permission entry that carries a trailing inline `#` comment). Separately,
the packaging side of this phase does not fully deliver on its own stated goal: `npx vsce ls`
against the current tree shows the VSIX still bundles three CI checker scripts and the entire
`interop-test-harness/` TypeScript source tree (plus a handful of dev-only config files), none of
which the runtime extension ever loads.

## Critical Issues

### CR-01: `attributeJobs()` silently disables all job-level checks when a comment follows `jobs:`

**File:** `bbj-vscode/tools/check-action-pins-and-permissions.mjs:219-259`

**Issue:** `attributeJobs()` determines the jobs' indentation from the *first non-blank line* after
the `jobs:` key, then unconditionally `break`s after inspecting that one line — regardless of
whether it actually matched `JOB_ID_LINE`:

```js
for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
  const line = lines[i];
  if (line.trim() === '') continue;
  const match = line.match(JOB_ID_LINE);
  if (match) { jobIndent = match[1].length; }
  break;                       // <-- runs even when match is null
}
if (jobIndent === null) return [];
```

If the line immediately following `jobs:` is a comment (e.g. `  # a job comment`) instead of a job
id, `match` is `null`, `jobIndent` stays `null`, and `attributeJobs()` returns `[]` for the whole
file. `scanTargets()` then reports the file has zero jobs, so `checkTopLevelOverBroad` still runs
but the **push/release contents:write enforcement — the entire point of this checker for
`manual-release.yml`/`preview.yml`-style jobs — never runs**, and the scan still exits `0` (clean).

Reproduced against a throwaway fixture (removed after verification, not committed):

```yaml
name: Fixture
on: push
permissions:
  contents: read
jobs:
  # a job comment
  pusher:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
      - run: |
          git push origin main
```
```
$ node bbj-vscode/tools/check-action-pins-and-permissions.mjs fixture.yml
Scanned 1 file(s), 1 uses reference(s), 1 workflow(s), 0 findings.
$ echo $?
0
```
A job that pushes with an *inherited read-only token* passes clean. No current workflow in the
repo triggers this (none has a comment directly under `jobs:`), and the checker's own test suite
(`action-pins-and-permissions-hygiene.test.ts`) never exercises this shape either, so nothing
catches a future contributor adding an explanatory comment there and silently losing the gate this
whole phase exists to enforce.

**Fix:** Skip comment lines (and any other non-job-id line) the same way blank lines are skipped,
instead of breaking on the first non-blank line:

```js
for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
  const line = lines[i];
  if (line.trim() === '' || /^\s*#/.test(line)) continue;
  const match = line.match(JOB_ID_LINE);
  if (match) { jobIndent = match[1].length; }
  break;
}
```
Add a regression fixture to `action-pins-and-permissions-hygiene.test.ts` asserting that a comment
directly under `jobs:` does not suppress the push/release finding.

## Warnings

### WR-01: Inline comment on a job-level `permissions:` entry silently drops that key

**File:** `bbj-vscode/tools/check-action-pins-and-permissions.mjs:156-175` (block-mapping branch of
`parsePermissionsAt`)

**Issue:** The per-entry regex `^\s*([A-Za-z-]+):\s*(\S+)\s*$` requires the value to be the last
token on the line. A trailing `# ...` comment on a permission entry makes the line fail to match,
so that key is silently omitted from `entries` — `contentsFromBlock` then falls back to `'none'`
for a job/workflow that actually granted `contents: write`. This fails *closed* (a spurious
finding/CI failure) rather than open, so it's lower severity than CR-01, but it is still a real
parsing bug in a script whose own test suite explicitly worries about checks going "vacuous"
without ever adding a case for inline comments:

```
$ cat fixture.yml
...
jobs:
  pusher:
    runs-on: ubuntu-latest
    permissions:
      contents: write # needed to push the release tag
    steps:
      - run: |
          git push origin main
$ node bbj-vscode/tools/check-action-pins-and-permissions.mjs fixture.yml
fixture.yml:6: job 'pusher' pushes or creates a release but its token has contents: none
1 finding(s).
```

**Fix:** Strip a trailing `#...` comment (respecting that `#` cannot appear unquoted inside a
scope name) before matching the entry, e.g. `candidate.text.replace(/\s+#.*$/, '')`, then apply the
existing `key: value` regex to the stripped text.

### WR-02: VSIX packaging still ships dev/CI-only files the runtime extension never loads

**File:** `bbj-vscode/.vscodeignore`

**Issue:** This phase's packaging changes are framed as making `vscode:prepublish` ship "only the
built, minified bundles" (see `esbuild.mjs`'s new `keepNames` comment and the `.vscodeignore`
additions for `**/*.map`/`out/main.js`/`coverage/**`), but `.vscodeignore` was not extended to
cover the CI tooling and dev-only configs that also live under `bbj-vscode/`. Confirmed by actually
building and dry-listing the package:

```
$ npx vsce package && npx vsce ls
...
tools/check-action-pins-and-permissions.mjs
tools/check-gradle-wrapper.mjs
tools/check-workflow-secrets.mjs
tools/interop-test-harness/cases.ts
tools/interop-test-harness/gate.ts
tools/interop-test-harness/report-template.ts
tools/interop-test-harness/report.ts
tools/interop-test-harness/run-tests.ts
tools/interop-test-harness/scaffold.ts
tools/interop-test-harness/types.ts
tsconfig.harness.json
tsconfig.test.json
tsconfig.tsbuildinfo
eslint.config.js
vitest.config.ts
```
None of these are referenced from `src/` at runtime (verified: `grep -rn "tools/formatter\|tools/em-login\|tools/web\.bbj" src/` only turns up `tools/em-login.bbj`, `tools/em-validate-token.bbj`,
`tools/web.bbj` and `tools/formatter/**`, which genuinely are loaded via
`context.asAbsolutePath(...)` in `src/em-auth.ts` and `src/formatter-verifier.ts` and should ship;
the three `check-*.mjs` scripts and the whole `interop-test-harness/` tree have no such reference).
Shipping raw, unbundled TypeScript source and internal CI hygiene scripts to every Marketplace
installer is unnecessary bloat and needlessly exposes internal tooling in a public artifact.

**Fix:** Add to `bbj-vscode/.vscodeignore`:
```
tools/check-action-pins-and-permissions.mjs
tools/check-gradle-wrapper.mjs
tools/check-workflow-secrets.mjs
tools/interop-test-harness/**
tsconfig.harness.json
tsconfig.test.json
tsconfig.tsbuildinfo
eslint.config.js
vitest.config.ts
```
(and reverify with `npx vsce ls` that `tools/em-login.bbj`, `tools/em-validate-token.bbj`,
`tools/web.bbj`, and `tools/formatter/**` still ship).

## Info

### IN-01: `vscode:prepublish` no longer runs lint

**File:** `bbj-vscode/package.json:669`

**Issue:** The old `vscode:prepublish` was
`shx cp ../LICENSE ./LICENSE && npm run build && npm run esbuild-base -- --minify && npm run lint`;
the new one is `shx cp ../LICENSE ./LICENSE && node ./esbuild.mjs --minify` — no `lint` step (and
no `tsc` type-check either, though `esbuild`'s TS loader never type-checked). Every workflow that
calls `vsce package` (`build.yml`, `manual-release.yml`, `preview.yml`) already runs `npm run
build`/`npm run lint` as explicit prior CI steps that gate the job via the default `if: success()`,
so this is safe in CI. It does mean a developer running `npx vsce package` locally, straight after
a clean checkout, no longer gets a lint pass for free — worth a one-line note in a contributor doc
if that workflow is common, but not a functional defect.

**Fix:** No action required; optionally document that `npm run lint` must be run separately before
a local `vsce package`.

---

_Reviewed: 2026-09-29T18:56:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
