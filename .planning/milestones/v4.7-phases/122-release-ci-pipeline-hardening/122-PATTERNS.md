# Phase 122: Release & CI Pipeline Hardening - Pattern Map

**Mapped:** 2026-09-29
**Files analyzed:** 13 (7 workflows touched, 1 new composite action, 1 new hygiene checker + test,
`package.json`, `esbuild.mjs`/`.vscodeignore`/`langium-config.json` config edits, 3 test files)
**Analogs found:** 10 / 13 (composite action has no in-repo analog; config edits are same-file
modifications, not new-file patterns)

All named analog paths verified tracked: `git ls-files` confirms every path below (all under
`.github/` and `bbj-vscode/`, which are ordinary tracked source, not a `.gsd/` capability mirror).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.github/workflows/build.yml` (merges `pr-vsix.yml` in) | workflow/config | event-driven (pull_request) | `.github/workflows/build.yml` (self, extended) + `.github/workflows/pr-vsix.yml` (donor, then deleted) | exact |
| `.github/workflows/pr-vsix.yml` (deleted) | workflow/config | event-driven | n/a — deletion | n/a |
| `.github/workflows/pr-validation.yml` | workflow/config | event-driven | `.github/workflows/build.yml` (preamble shape) + itself (path filter/jobs kept) | role-match |
| `.github/workflows/preview.yml` | workflow/config | event-driven (push to main) | itself (structure kept) + `.github/workflows/manual-release.yml` (sibling release workflow, shares verify/publish/tag shape) | exact (sibling) |
| `.github/workflows/manual-release.yml` | workflow/config | event-driven (workflow_dispatch) | itself + `.github/workflows/preview.yml` | exact (sibling) |
| `.github/workflows/deploy-docs.yml` | workflow/config | event-driven (push, path-filtered) | itself — already has the target caching/permissions shape to copy elsewhere | exact (donor for others) |
| `.github/workflows/workflow-hygiene.yml` | workflow/config | event-driven, install-free CI check | itself (add a third job matching the two existing) | exact |
| `.github/actions/<name>/action.yml` (new composite) | config (composite action) | request-response (invoked step sequence) | **none in-repo** | no analog |
| `bbj-vscode/tools/check-action-pins-and-permissions.mjs` (new) | utility (CLI checker) | batch/transform (static file scan) | `bbj-vscode/tools/check-workflow-secrets.mjs`, `bbj-vscode/tools/check-gradle-wrapper.mjs` | exact |
| `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` (new) | test | request-response (subprocess CLI contract) | `bbj-vscode/test/workflow-secret-hygiene.test.ts`, `bbj-vscode/test/gradle-wrapper-hygiene.test.ts` | exact |
| `bbj-vscode/package.json` (scripts/activationEvents/engines) | config | n/a | itself (in-place edit) | exact |
| `bbj-vscode/esbuild.mjs`, `.vscodeignore`, `langium-config.json`, `.gitignore` | config | n/a | themselves (in-place edits) | exact |
| `bbj-vscode/test/cvs-composer-ui.test.ts`, `setopts-in-code-ui.test.ts`, `test/functional/installed-extension-e2e.test.ts` | test | request-response (manifest assertions) | each other (same assertion shape, 3 near-identical blocks) | exact |

## Pattern Assignments

### `.github/workflows/build.yml` (workflow, merge target for D-01/D-02)

**Analogs:** `.github/workflows/build.yml` (current, 56 lines) + `.github/workflows/pr-vsix.yml` (56-106, donor, then delete)

**Current build.yml trigger + steps to keep/extend** (`build.yml:1-56`):
```yaml
on:
  pull_request:
    branches:
      - main
jobs:
  build:
    name: BBj CI
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22
    - name: Build
      id: build
      shell: bash
      run: |
        cd bbj-vscode
        npm ci
        npm run build
    - name: Lint
      if: ${{ !cancelled() && steps.build.outcome == 'success' }}
      shell: bash
      run: |
        cd bbj-vscode
        npm run lint
    - name: Type-check test tree
      if: ${{ !cancelled() && steps.build.outcome == 'success' }}
      shell: bash
      run: |
        cd bbj-vscode
        npm run typecheck:test
    - name: Test
      if: success() || failure()
      shell: bash
      run: |
        cd bbj-vscode
        npm run test
```
This "run even if a prior step failed" chain (`steps.build.outcome`, `success() || failure()`) is
the existing convention D-02 leaves to the planner's discretion to keep or not — copy it verbatim
if kept.

**pr-vsix.yml pieces to fold in as-is** (`pr-vsix.yml:12-28` trigger/concurrency/permissions,
`36-72` package+upload, `74-106` sticky comment):
```yaml
concurrency:
  group: pr-vsix-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
```
```yaml
      - name: Checkout PR head
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      ...
      - name: Package VSIX
        id: pkg
        working-directory: bbj-vscode
        run: |
          NAME=$(node -p "require('./package.json').name")
          VERSION=$(node -p "require('./package.json').version")
          SHA=$(git rev-parse --short HEAD)
          OUT="${NAME}-${VERSION}-pr${{ github.event.pull_request.number }}-${SHA}.vsix"
          npx vsce package --out "$OUT"
          echo "vsix=$OUT" >> "$GITHUB_OUTPUT"
          echo "sha=$SHA" >> "$GITHUB_OUTPUT"
      - name: Upload VSIX artifact
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: vsix-pr${{ github.event.pull_request.number }}
          path: bbj-vscode/${{ steps.pkg.outputs.vsix }}
          retention-days: 14
          if-no-files-found: error
      - name: Comment on PR with install instructions
        if: github.event.pull_request.head.repo.full_name == github.repository
        uses: actions/github-script@v7
        with:
          script: |
            const vsix = ${{ toJSON(steps.pkg.outputs.vsix) }};
            ...
            const marker = '<!-- pr-vsix -->';
            ...
            const existing = comments.find(c => c.body && c.body.includes(marker));
            if (existing) {
              await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
            } else {
              await github.rest.issues.createComment({ owner, repo, issue_number, body });
            }
```
Copy the full `script:` block from `pr-vsix.yml:78-105` verbatim into the merged job — this is the
canonical sticky-comment implementation, no adaptation needed beyond step ordering relative to
build/test/lint (D-02 leaves that ordering to the planner).

**Checkout ref note (D-02):** the merged job must checkout PR head SHA
(`ref: ${{ github.event.pull_request.head.sha }}`, from pr-vsix.yml:36-39), not just
`actions/checkout@v4` with no ref (build.yml's current bare checkout) — carry over pr-vsix's
checkout, not build.yml's.

**Error handling / gating:** fork-PR gate on the comment step only (`if:
github.event.pull_request.head.repo.full_name == github.repository`, `pr-vsix.yml:76`) — the VSIX
build/upload still runs for fork PRs, only the comment is skipped.

---

### `.github/workflows/pr-validation.yml`, `preview.yml`, `manual-release.yml`, `deploy-docs.yml`

**Analog:** `.github/workflows/deploy-docs.yml` (target caching/permissions shape already correct
here per RESEARCH.md — read its npm-cache + `permissions:` block directly, lines 1-20, before
editing the others) and each file's own current job structure (kept, just gains preamble/pins/perms/
cache/concurrency per D-03/D-04/D-09/D-10/D-19/D-20/D-21).

No structural rewrite — these are in-place edits. Pull the composite-action call in wherever
`actions/setup-node` currently appears; keep `actions/checkout` as each job's own first step (D-20);
keep `gradle/actions/wrapper-validation` inline before any Gradle invocation, including before
`gradle/actions/setup-gradle` itself (Pitfall 4, `check-gradle-wrapper.mjs`'s
`GRADLE_SETUP_USES` regex, `tools/check-gradle-wrapper.mjs:606`).

**Existing `permissions:` shape to copy** (`deploy-docs.yml:12-15`, plus
`manual-release.yml:246-248` for a job-level escalation example):
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```
```yaml
# manual-release.yml create-release job (job-level escalation)
permissions:
  contents: write
```
`manual-release.yml`'s `tag-release` job has **no** `permissions:` block today and needs one created
(`contents: write`) — this is a gap, not an edit to an existing block.

---

### `.github/workflows/workflow-hygiene.yml` (add third job, D-08)

**Analog:** itself — the file already has the exact shape the new job should match
(`workflow-hygiene.yml:20-50`):
```yaml
  wrapper-hygiene:
    name: Gradle wrapper pinned and validated
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Check the Gradle wrapper pin and workflow validation steps
        run: node bbj-vscode/tools/check-gradle-wrapper.mjs
```
Add a sibling `pin-and-permissions-hygiene` job with the same three-step shape, invoking the new
checker. Target both `.github/workflows` and the composite action's own directory explicitly
(Pitfall 2 — `expandTargets`/`expandWorkflowFiles` do not recurse):
```
node bbj-vscode/tools/check-action-pins-and-permissions.mjs .github/workflows .github/actions/<name>
```

---

### `.github/actions/<name>/action.yml` (new composite action, D-20)

**Analog:** none in this repo (RESEARCH.md confirms this is new territory). Use the researcher's
illustrative skeleton as a starting point (not copied from any fetched source — verify exact syntax
against the metadata reference before landing):
```yaml
name: 'Setup Node (BBj)'
description: 'Checkout must happen before this action runs.'
inputs:
  working-directory:
    required: false
    default: 'bbj-vscode'
  cache-dependency-path:
    required: false
    default: 'bbj-vscode/package-lock.json'
  install:
    required: false
    default: 'true'
runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
      with:
        node-version: 22
        cache: npm
        cache-dependency-path: ${{ inputs.cache-dependency-path }}
    - if: inputs.install == 'true'
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: npm ci
```
`shell: bash` is mandatory on every `run:` step inside a composite action (no default shell exists
there, unlike normal workflow job steps). `actions/checkout` stays OUTSIDE this action, as the
calling job's own first step, everywhere it's used.

---

### `bbj-vscode/tools/check-action-pins-and-permissions.mjs` (new hygiene checker, D-08)

**Analogs:** `bbj-vscode/tools/check-workflow-secrets.mjs` (198 lines) and
`bbj-vscode/tools/check-gradle-wrapper.mjs` (537 lines) — follow this exact shape: zero
dependencies, ESM, `#!/usr/bin/env node` shebang, exported pure functions for testability, a
`main()` guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`.

**Directory-expansion pattern to reuse** (`check-workflow-secrets.mjs:83-100`, non-recursive by
design — must be called with each action directory explicitly per Pitfall 2):
```javascript
function expandTargets(targets) {
  const files = [];
  for (const target of targets) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      const entries = fs
        .readdirSync(target)
        .filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
        .sort();
      for (const entry of entries) {
        files.push(path.join(target, entry));
      }
    } else {
      files.push(target);
    }
  }
  return files;
}
```
Also accept `action.yml`/`action.yaml` filenames when scanning `.github/actions/<name>` — that
directory contains `action.yml`, not `*.yml` workflow files, but the same extension filter already
matches it since `action.yml` ends in `.yml`.

**Job attribution pattern to reuse** (`check-gradle-wrapper.mjs:260-304`, `attributeJobs`):
```javascript
function attributeJobs(lines) {
  const jobsKeyIndex = lines.findIndex((line) => JOBS_KEY_LINE.test(line));
  if (jobsKeyIndex === -1) return [];
  let jobIndent = null;
  for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const match = line.match(JOB_ID_LINE);
    if (match) { jobIndent = match[1].length; break; }
    break;
  }
  if (jobIndent === null) return [];
  const jobs = [];
  let current = null;
  for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(JOB_ID_LINE);
    if (match && match[1].length === jobIndent) {
      if (current) current.endLine = i;
      current = { id: match[2], startLine: i + 1, endLine: lines.length, lines: [] };
      jobs.push(current);
      continue;
    }
    if (current) current.lines.push({ line: i + 1, text: line });
  }
  return jobs;
}
```
A composite action's `action.yml` has no `jobs:`/`permissions:` mapping at all (it's a different
schema) — the checker needs a branch for `.github/actions/**/action.yml` files that only checks the
`uses:`-pin rule (SHA + version comment), skipping the `permissions:` block rule, which only applies
to workflow files.

**Error/exit-code contract to copy** (`check-workflow-secrets.mjs:157-194`, `main`):
```javascript
if (filesScanned === 0 || runBlocks === 0) {
  console.log('Refusing to report success on an empty scan: 0 files or 0 run blocks collected.');
  process.exit(2);
}
if (findings.length === 0) {
  console.log(`Scanned ${filesScanned} file(s), ... 0 findings.`);
  process.exit(0);
}
for (const finding of findings) {
  console.log(`${finding.file}:${finding.line}: ${finding.text}`);
}
console.log(`${findings.length} finding(s).`);
process.exit(1);
```
Exit codes: 0 = clean, 1 = findings, 2 = refused (empty/unattributable scan) — matches both existing
checkers; the new checker must use the same three codes.

**Detection regexes to write (new, no direct analog — D-08's own rules):**
- `uses:` line not matching a 40-hex SHA + `# vX.Y.Z` comment → finding. Reuse
  `RUN_KEY_LINE`-style line matching from `check-workflow-secrets.mjs:11` as a template for a new
  `USES_LINE` regex.
- Workflow file (not composite action) with no `permissions:` mapping anywhere in the file →
  finding. Local `./`-prefixed `uses:` references are exempt (composite-action self-reference).

---

### `bbj-vscode/test/action-pins-and-permissions-hygiene.test.ts` (new test, D-08)

**Analogs:** `bbj-vscode/test/workflow-secret-hygiene.test.ts` (174 lines) and
`bbj-vscode/test/gradle-wrapper-hygiene.test.ts` (487 lines). Copy the CLI-subprocess contract
verbatim (`workflow-secret-hygiene.test.ts:1-50`):
```typescript
import { afterAll, describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..');
const CHECKER_PATH = process.env.ACTION_PINS_CHECKER_PATH
    ?? path.join(REPO_ROOT, 'bbj-vscode', 'tools', 'check-action-pins-and-permissions.mjs');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');
const ACTIONS_DIR = path.join(REPO_ROOT, '.github', 'actions');

const fixtureDirs: string[] = [];
afterAll(() => {
    for (const dir of fixtureDirs) fs.rmSync(dir, { recursive: true, force: true });
});

interface CheckerResult { status: number; stdout: string; }
function runChecker(args: string[]): CheckerResult {
    try {
        const stdout = execFileSync('node', [CHECKER_PATH, ...args], { encoding: 'utf8' });
        return { status: 0, stdout };
    } catch (err) {
        const spawnError = err as { status: number | null; stdout?: string };
        return { status: spawnError.status ?? -1, stdout: spawnError.stdout ?? '' };
    }
}
```
**Test cases to mirror** (from `workflow-secret-hygiene.test.ts:81-174`, same shapes, new subject):
1. `'the real workflow tree scans clean'` — run against `WORKFLOWS_DIR` + the real composite action
   dir, expect status 0.
2. A fixture with an un-pinned `uses: actions/checkout@v4` (tag, not SHA) → expect status 1, finding
   text identifying the file/line.
3. A fixture workflow missing `permissions:` → expect status 1.
4. `'an empty target directory triggers exit code 2, never exit code 0'` — identical to
   `workflow-secret-hygiene.test.ts:126-131`.
5. A fixture with a correctly SHA-pinned + commented `uses:` and a top-level `permissions:` block →
   expect status 0, `0 findings`.

Do not use `--reporter=basic` anywhere in the plan or this test (not a valid vitest 4.1.10 reporter
per project memory) — use vitest defaults.

---

### `bbj-vscode/package.json` (D-12, D-13, D-14, D-16)

**Analog:** itself, in-place edit. Current state to change (`package.json:662-704`):
```json
"activationEvents": [
    "onLanguage:bbj",
    "onCommand:bbj.config",
    "onCommand:bbj.properties",
    "onCommand:bbj.em",
    "onCommand:bbj.loginEM",
    ...
],
"scripts": {
    "prepare": "npm run langium:generate && npm run build",
    "vscode:prepublish": "shx cp ../LICENSE ./LICENSE  && npm run build && npm run esbuild-base -- --minify && npm run lint",
    "build": "tsc -b tsconfig.json && node ./esbuild.mjs",
    ...
    "esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode --format=cjs --platform=node",
    "esbuild": "npm run esbuild-base -- --sourcemap",
    "esbuild-watch": "npm run esbuild-base -- --sourcemap --watch",
    "test-compile": "tsc -p ./",
    ...
}
```
Target per D-12/D-13: `"prepare": "npm run langium:generate"`;
`"vscode:prepublish": "shx cp ../LICENSE ./LICENSE && node ./esbuild.mjs --minify"` (no `npm run
build`, no lint); delete `esbuild-base`, `esbuild`, `esbuild-watch`, `test-compile` scripts.
`activationEvents` keeps only `onLanguage:bbj` and `onLanguage:bbx-config` (D-16) — remove every
`onCommand:*` entry.

---

### `bbj-vscode/test/cvs-composer-ui.test.ts`, `setopts-in-code-ui.test.ts`, `test/functional/installed-extension-e2e.test.ts` (D-16 rewrite)

**Analogs:** the three near-identical assertion blocks are each other's analog — same rewrite
applies to all three.

Current shape to replace, e.g. `cvs-composer-ui.test.ts:582-584`:
```typescript
test('activationEvents includes onCommand:bbj.composeCvs', () => {
    expect(packageJson.activationEvents).toContain('onCommand:bbj.composeCvs');
});
```
and `setopts-in-code-ui.test.ts:593`:
```typescript
expect(pkg.activationEvents as string[]).toContain(`onCommand:${COMMAND_ID}`);
```
and `test/functional/installed-extension-e2e.test.ts:266-269`:
```typescript
test('client manifest: activationEvents includes onCommand:bbj.composeSetoptsInCode', () => {
    const pkg = JSON.parse(fs.readFileSync(install!.packageJsonPath, 'utf-8'));
    const events: string[] = pkg.activationEvents ?? [];
    expect(events).toContain('onCommand:bbj.composeSetoptsInCode');
});
```
Rewrite target (per D-16): assert the command is contributed in `contributes.commands` (a pattern
already present and passing in each file, e.g. `cvs-composer-ui.test.ts:574`'s
`packageJson.contributes.menus['editor/context']`-style lookup — find the sibling
`contributes.commands` assertion already in each file and mirror it) AND assert the command id is
**not** present in `activationEvents` as an `onCommand:` entry. All three files already contain a
working `contributes.commands`-lookup block a few lines above the one being replaced — reuse that
exact lookup pattern rather than inventing a new one.

## Shared Patterns

### Zero-dependency hygiene-checker convention
**Source:** `bbj-vscode/tools/check-workflow-secrets.mjs`, `bbj-vscode/tools/check-gradle-wrapper.mjs`
**Apply to:** `check-action-pins-and-permissions.mjs` and its test
Line-based regex scanning, no YAML parser dependency, exported pure functions, exit codes
0/1/2, `--print` debug mode optional (present in the secrets checker, not required for the new one
unless useful for debugging).

### Least-privilege `permissions:` block
**Source:** `.github/workflows/deploy-docs.yml:12-15`, `manual-release.yml:246-248`
**Apply to:** every workflow file touched in this phase; new composite action does not need one
(actions don't have a `permissions:` key — only workflows/jobs do).

### Composite-action preamble
**Source:** no in-repo analog; RESEARCH.md's Pattern 1 skeleton is the reference
**Apply to:** every job in every workflow that needs Node (all 7 workflows except pure Gradle-only
jobs, which still need it for the wrapper-hygiene-adjacent tooling if any).

### Gradle wrapper-validation-before-setup-gradle ordering
**Source:** `bbj-vscode/tools/check-gradle-wrapper.mjs:606` (`GRADLE_SETUP_USES` treats
`uses: gradle/actions/setup-gradle` itself as a Gradle invocation)
**Apply to:** every job in `pr-validation.yml`, `preview.yml`, `manual-release.yml` that runs Gradle
— keep the inline `gradle/actions/wrapper-validation` step before `gradle/actions/setup-gradle`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `.github/actions/<name>/action.yml` | config (composite action) | request-response | No composite action exists anywhere in this repo today; use RESEARCH.md's Pattern 1 skeleton and the official GitHub Actions metadata syntax reference instead of an in-repo analog. |

## Metadata

**Analog search scope:** `.github/workflows/`, `.github/dependabot.yml`, `bbj-vscode/tools/`,
`bbj-vscode/test/`, `bbj-vscode/package.json`
**Files scanned:** 7 workflow files, 2 existing hygiene checkers + their 2 tests, 3 onCommand test
files, `package.json`
**Pattern extraction date:** 2026-09-29
