---
phase: 117-dependency-hygiene-dependabot-coverage
plan: "01"
subsystem: infra
tags: [npm, vsce, packaging, dependency-hygiene, vscode-extension]

requires: []
provides:
  - "@vscode/vsce moved to devDependencies in bbj-vscode/package.json"
  - "package-lock.json regenerated with vsce (and its exclusive transitive packages) flagged dev"
  - "proof that the production tree, both locked and installed, excludes vsce"
  - "proof that the packaged VSIX file list is unchanged and every CI vsce job still installs it"
affects: [122-release-ci-pipeline-hardening]

actuals:
  tokens: 10628
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "diff-shape gate: compare a regenerated lockfile against its phase-base commit, asserting the only allowed diff lines are added dev flags and the one moved entry"
    - "static CI audit: parse workflow YAML with the yaml package and assert every job calling npx vsce runs a bare npm ci earlier in the same job with no --omit/--production/--only=prod and no NODE_ENV"

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/package-lock.json

key-decisions:
  - "Regenerated the lockfile with npm install --package-lock-only --ignore-scripts (not a plain npm install), because the container's Node 24 breaks the prepare script's langium generate step; --package-lock-only skips node_modules and --ignore-scripts skips the lifecycle hook entirely, so this is safe on any Node version"
  - "Verified vsce packaging twice: a light vsce ls file-list diff around the manifest edit, then a full vsce package run (dependency listing on, vscode:prepublish's build+esbuild+lint executed, matching what CI runs) to prove the real packaging path"

patterns-established:
  - "For any future devDependency move, use the same diff-shape gate + lock-only production-tree check + full vsce package + static-YAML CI audit sequence rather than trusting a single npm ls output"

requirements-completed: [DEP-01]

coverage:
  - id: D1
    description: "@vscode/vsce is a devDependency; the lockfile diff from the phase base contains only added dev flags and the moved vsce entry; the production tree (locked and installed) has exactly the seven runtime packages with no vsce or vsce-sign"
    requirement: DEP-01
    verification:
      - kind: other
        ref: "bash: lockfile diff-shape check (git diff -U0 against phase base deaa7de2)"
        status: pass
      - kind: other
        ref: "bash: npm ls --package-lock-only --omit=dev --all — langium present, no @vscode/vsce"
        status: pass
      - kind: other
        ref: "bash: npm ls --omit=dev --depth=0 — exactly 7 top-level entries, none named @vscode/vsce"
        status: pass
    human_judgment: false
  - id: D2
    description: "The VSIX packages identically before and after the move (same vsce ls file set), and a full vsce package run produces a VSIX with both entrypoints (extension/out/extension.cjs, extension/out/language/main.cjs) and zero extension/node_modules/ entries"
    requirement: DEP-01
    verification:
      - kind: other
        ref: "bash: diff vsce-ls-before.txt vsce-ls-after.txt — empty diff, 123 files both times"
        status: pass
      - kind: other
        ref: "bash: unzip -Z1 on the packaged VSIX — 2 entrypoint matches, 0 node_modules entries"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every CI job that runs npx vsce (six total: build#build, pr-vsix#vsix, preview#verify, preview#publish-vscode, manual-release#verify, manual-release#publish-vscode) runs a bare npm ci earlier in the same job with no --omit/--production/--only=prod flag and no NODE_ENV, so npx vsce keeps resolving the pinned devDependency; no workflow file was edited"
    requirement: DEP-01
    verification:
      - kind: other
        ref: "node: YAML-parsed static audit of build.yml, pr-vsix.yml, preview.yml, manual-release.yml — 6 ok lines, 'vsce jobs: 6'"
        status: pass
    human_judgment: true
    rationale: "The actual PR VSIX workflow run and the extension install/activation on a real .bbj file is manual UAT evidence (VALIDATION.md manual-only row), not reproducible by this executor"

duration: 8min
completed: 2026-09-28
status: complete
---

# Phase 117 Plan 01: DEP-01 vsce devDependency move Summary

**`@vscode/vsce` moved from `dependencies` to `devDependencies` in `bbj-vscode/package.json`, lockfile regenerated with only dev flags added, and both the packaged VSIX file list and all six CI packaging jobs proven unaffected.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-28T16:33:58Z (from STATE.md session marker)
- **Completed:** 2026-09-28T16:36:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `@vscode/vsce` (a packaging CLI never imported by `src/` or bundled by esbuild) is now a devDependency, not a production dependency
- `package-lock.json` regenerated with `npm install --package-lock-only --ignore-scripts`; the diff against the phase base contains only added `"dev": true` flags and the moved `"@vscode/vsce": "^4.0.0"` entry — no other package's version, resolved URL or integrity changed
- The production tree — both `npm ls --package-lock-only --omit=dev --all` (28 lines, down from 155) and `npm ls --omit=dev --depth=0` (exactly 7 entries: chevrotain, langium, properties-file, properties-reader, vscode-jsonrpc, vscode-languageclient, vscode-uri) — no longer contains `@vscode/vsce` or `@vscode/vsce-sign`
- `vsce ls` file list is byte-identical before and after the manifest edit (123 files both times), and a full `vsce package` run (with dependency listing on, running `vscode:prepublish`'s build + minified esbuild + lint exactly as CI does) produced a 9,407,455-byte VSIX containing both `extension/out/extension.cjs` and `extension/out/language/main.cjs`, and zero `extension/node_modules/` entries
- A YAML-parsed static audit of `build.yml`, `pr-vsix.yml`, `preview.yml` and `manual-release.yml` confirms all six vsce-calling jobs (`build#build`, `pr-vsix#vsix`, `preview#verify`, `preview#publish-vscode`, `manual-release#verify`, `manual-release#publish-vscode`) run a bare `npm ci` earlier in the same job, with no `--omit`/`--production`/`--only=prod` flag and no `NODE_ENV` at workflow, job or step level — no workflow file was touched

## Task Commits

1. **Task 1: vsce leaves the production tree, and the manifest, the lockfile and the tree CI installs all agree** - `5de37d21` (build)
2. **Task 2: The extension still packages as CI packages it, and every CI vsce job still installs vsce** - verification-only, no files modified, no commit (per plan: `files: (none modified)`)

**Plan metadata:** committed together with this SUMMARY

## Files Created/Modified

- `bbj-vscode/package.json` - `@vscode/vsce` moved from `dependencies` to `devDependencies` (range `^4.0.0` unchanged), inserted alphabetically after `@vitest/coverage-v8` and before `concurrently`
- `bbj-vscode/package-lock.json` - regenerated with `--package-lock-only --ignore-scripts`; 129 added lines are exclusively `"dev": true` flags plus the one moved vsce entry

## Decisions Made

- Used `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` instead of a plain `npm install`/`npm ci` to regenerate the lockfile, because a plain install would trigger the `prepare` script's `langium:generate` step, which breaks under the container's Node 24. `--package-lock-only` never touches `node_modules` and `--ignore-scripts` skips all lifecycle hooks, so the command is safe regardless of Node version. The regeneration reported "up to date" with no unexpected resolution changes.
- Verified packaging parity with two separate checks: a cheap `vsce ls` file-list diff captured seconds apart around the manifest edit (proves nothing else in the working tree drifted), and a full `vsce package` run afterward (proves the real CI packaging path, with dependency listing and `vscode:prepublish`'s build/esbuild/lint, still produces a correct VSIX).

## Deviations from Plan

None - plan executed exactly as written. Both tasks' automated `<verify>` blocks and every `<acceptance_criteria>` line passed on the first attempt.

---

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Requirement DEP-01 is complete: the production dependency set of the VS Code extension no longer includes the packaging-only `@vscode/vsce`.
- Roadmap success criterion 1 for Phase 117 holds locally (`npm ls --omit=dev` no longer lists `@vscode/vsce` or its transitive packages, extension packages with an unchanged file list). Full closure of that criterion still needs the phase PR's `pr-vsix` workflow run and a manual install/activation UAT check (recorded as `human_judgment: true` / D3 above, and as a manual-only row in this phase's `VALIDATION.md`).
- Scratch evidence left outside the repository for later reference: `/home/coder/repos/tmp/phase-117/vsce-ls-before.txt`, `vsce-ls-after.txt`, `bbj-lang-vsce-dev.vsix`.
- Observation for a later packaging phase (not fixed here, per plan instruction): `bbj-vscode/.vscodeignore` has no `coverage/` entry, so a local `vsce package` run picks up gitignored coverage scratch output (visible in this run's `vsce ls` tree as a large `coverage/` entry). CI has no coverage directory present at packaging time, so this is a local-only cosmetic effect, not a functional gap.
- Ready for the next plan in Phase 117 (DEP-02, DEP-04, DEP-05 or CI-04 work).

---
*Phase: 117-dependency-hygiene-dependabot-coverage*
*Completed: 2026-09-28*

## Self-Check: PASSED

- `bbj-vscode/package.json` found on disk
- Task commit `5de37d21` found in git log
- SUMMARY commit `69953a8c` found in git log
