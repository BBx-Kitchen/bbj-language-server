---
phase: 123-documentation-drift
plan: 01
subsystem: build
tags: [vscode-tasks, gitpod, readme, docusaurus, npm]

requires: []
provides:
  - "A VS Code build task (\"build bbj-vscode\") wired as Run Extension's preLaunchTask"
  - "Gitpod init that builds the extension before the interop assemble step"
  - "Root README build steps that name all three project parts and produce a real build"
  - "documentation/README.md matching the actual npm workflow and deploy-docs.yml"
affects: [documentation-drift-remaining-plans]

actuals:
  tokens: 6800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "VS Code npm task with explicit path (cwd) used as a preLaunchTask, instead of relying on prepare/postinstall scripts to build"

key-files:
  created:
    - .vscode/tasks.json
  modified:
    - .vscode/launch.json
    - .gitpod.yml
    - README.md
    - documentation/README.md

key-decisions:
  - "Followed the user's 2026-09-30 decision verbatim: a dedicated \"build bbj-vscode\" npm task (path bbj-vscode) as Run Extension's preLaunchTask, rather than restoring a build step to bbj-vscode's own `prepare` script."
  - "Root README's Gitpod section: replaced the nonexistent \"Run Interop Service\" launch configuration with a plain terminal command (./gradlew run in java-interop), since .vscode/launch.json has no such configuration."

requirements-completed: [BUILD-01, BUILD-02, BUILD-03]

coverage:
  - id: D1
    description: "\"Run Extension\" launch configuration builds bbj-vscode first via a new preLaunchTask, proven by deleting and rebuilding out/extension.cjs"
    requirement: BUILD-01
    verification:
      - kind: other
        ref: "node -e task/launch.json structural checks + npm run build recreating out/extension.cjs (ad hoc verify commands from 123-01-PLAN.md Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gitpod's init block runs npm run build in bbj-vscode right after npm install, before the java-interop assemble step"
    requirement: BUILD-02
    verification:
      - kind: other
        ref: "grep -A1 'npm install' .gitpod.yml | grep -c 'npm run build' (123-01-PLAN.md Task 2 verify)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Root README names all three project parts, gives real Building Locally steps (npm install + npm run build, gradlew build/run, gradlew buildPlugin), and drops the nonexistent Run Interop Service launch configuration"
    requirement: BUILD-01
    verification:
      - kind: other
        ref: "grep checks for bbj-intellij, npm run build, and absence of 'Run Interop Service'/'two main parts'/'Debugger for Java' (123-01-PLAN.md Task 2 acceptance criteria)"
        status: pass
    human_judgment: false
  - id: D4
    description: "documentation/README.md describes npm ci / npm start / npm run build and deploy-docs.yml deployment, with no yarn and no gh-pages/SSH deploy instructions"
    requirement: BUILD-03
    verification:
      - kind: other
        ref: "grep checks for yarn (0), USE_SSH/GIT_USER (0), npm ci/npm start/npm run build/deploy-docs.yml (>=1 each) (123-01-PLAN.md Task 3 acceptance criteria)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 01: Build Instructions That Actually Build Summary

**New `.vscode/tasks.json` "build bbj-vscode" npm task wired as Run Extension's preLaunchTask, `npm run build` added to Gitpod's init, and both the root and docs-site READMEs rewritten to match the real npm/Gradle workflow.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-30T09:23:11Z (per STATE.md phase-start timestamp)
- **Completed:** 2026-09-30
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- Created `.vscode/tasks.json` with a single npm task, `"build bbj-vscode"` (type `npm`, script `build`, path `bbj-vscode`), and pointed `"Run Extension"`'s `preLaunchTask` at it — proven end to end by deleting `bbj-vscode/out/extension.cjs` and confirming the task's own npm script (`npm run build` in `bbj-vscode`) recreates it.
- Added `npm run build` to `.gitpod.yml`'s `init` block, directly after `npm install`, so a Gitpod workspace also ends with a built extension before the java-interop `./gradlew assemble` step.
- Rewrote the root README: intro line now says VS Code extension *and* IntelliJ plugin; "Project Overview" lists all three parts (`bbj-vscode`, `java-interop`, `bbj-intellij`); the Gitpod "How to Test" steps drop the nonexistent "Run Interop Service" launch configuration in favor of a plain `./gradlew run` terminal command, and name "Run Extension" as running the new build task first; "Building Locally" now requires Node.js 22+ and JDK 17 and gives real per-folder steps (`npm install` + `npm run build` in `bbj-vscode`, `./gradlew build`/`run` in `java-interop`, `./gradlew buildPlugin` in `bbj-intellij`).
- Rewrote `documentation/README.md` end to end: `npm ci` (from `package-lock.json`, Node 22) for installation, `npm start` for local dev, `npm run build` for the build (noting `onBrokenLinks: 'throw'` makes a clean build double as the link check, plus `npm run serve` to preview), and a Deployment section describing `.github/workflows/deploy-docs.yml`'s push-to-main / `workflow_dispatch` trigger and its `npm ci` + `npm run build` + `actions/deploy-pages` steps — no `yarn`, no SSH/`GIT_USER` gh-pages instructions anywhere.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): "build bbj-vscode" task and Run Extension preLaunchTask, proven by a fresh build** - `7288ec9d` (build)
2. **Task 2: Gitpod init builds the extension; root README builds, names three parts, drops the missing launch config** - `40ef15ce` (docs)
3. **Task 3: documentation/README.md describes the real npm workflow and deploy-docs.yml** - `e7f8b9f3` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `.vscode/tasks.json` - New "build bbj-vscode" npm task (type npm, script build, path bbj-vscode)
- `.vscode/launch.json` - "Run Extension" gained `"preLaunchTask": "build bbj-vscode"`; the other three configurations are untouched
- `.gitpod.yml` - `init` block now runs `npm run build` right after `npm install` in `bbj-vscode`
- `README.md` - Intro, Project Overview (3 parts), Gitpod "How to Test" steps, and "Building Locally" all rewritten to match the real build/launch setup
- `documentation/README.md` - Rewritten to npm (`npm ci`/`npm start`/`npm run build`/`npm run serve`) and `deploy-docs.yml`-based deployment; no yarn, no SSH/gh-pages instructions

## Decisions Made

- Implemented the user's 2026-09-30 decision verbatim: a small, explicit `.vscode/tasks.json` build task rather than restoring build behavior to `bbj-vscode`'s own `prepare` npm lifecycle script (which now only runs `langium:generate` since the release-pipeline hardening).
- The README's old step 1 named a "Run Interop Service" launch configuration that does not exist in `.vscode/launch.json` (confirmed by reading the file) — replaced with a plain terminal instruction to run `./gradlew run` in `java-interop`, per the plan's read_first note and ROADMAP planning notes.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' automated verify commands and acceptance criteria passed without needing fixes.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The "build bbj-vscode" task name (`"build bbj-vscode"`) and the three real launch configuration names (`Run Extension`, `Attach to Language Server`, `Vitest: Run All`, `Vitest: Run Selected File`) are now the ground truth other plans in this phase may need to reference (e.g. VS Code guide plans).
- `documentation/README.md`'s npm-based workflow is now consistent with `documentation/package.json`'s scripts and `.github/workflows/deploy-docs.yml`; no known drift remains in this plan's five files.
- No blockers for the next plan in Wave 1 (QA checklists, VS Code guide, IntelliJ guide, or developer docs plans).

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*

## Self-Check: PASSED

All 5 key files confirmed present on disk; all 3 task commits (7288ec9d, 40ef15ce, e7f8b9f3) confirmed in git log.
