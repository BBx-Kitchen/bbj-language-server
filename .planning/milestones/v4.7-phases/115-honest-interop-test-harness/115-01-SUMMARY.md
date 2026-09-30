---
phase: 115-honest-interop-test-harness
plan: "01"
subsystem: testing
tags: [tsx, npm, dependencies, interop-harness, jsonrpc]

# Dependency graph
requires: []
provides:
  - "Pinned, locked tsx devDependency (4.23.15, exact) that npm ci installs deterministically"
  - "npm run interop-harness as the only documented entry point for the Java interop test harness"
  - "Corrected vscode-jsonrpc/node.js import specifier matching java-interop.ts's Node16 ESM resolution"
affects: [115-02, 115-03, 115-04, 115-05, 115-06]

# Actuals (#2632)
actuals:
  tokens: 1050
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: ["tsx@4.23.15 (devDependency, exact pin)"]
  patterns: ["npm-script-only entry point for local dev tools (no shebang, no registry runner fetch)"]

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/package-lock.json
    - bbj-vscode/tools/interop-test-harness/run-tests.ts
    - CLAUDE.md

key-decisions:
  - "Human approved tsx 4.23.15 verbatim at the blocking-human legitimacy checkpoint before install (D-15)"
  - "Installed with --save-exact --ignore-scripts so bbj-vscode's own prepare script (langium generate + build) does not run under local Node 24 during the local devDependency install"

patterns-established:
  - "Local CLI tools run through an npm script backed by a pinned local binary, never a shebang that fetches an unpinned runner at invocation time"

requirements-completed: [DEP-03]

coverage:
  - id: D1
    description: "tsx@4.23.15 is an exact, locked devDependency of bbj-vscode"
    requirement: "DEP-03"
    verification:
      - kind: other
        ref: "npm --prefix bbj-vscode ls tsx --depth=0 --json (prints 4.23.15, exit 0)"
        status: pass
      - kind: other
        ref: "node -e assertion against package.json devDependencies.tsx === '4.23.15'"
        status: pass
      - kind: other
        ref: "node -e assertion against package-lock.json packages['node_modules/tsx'].version === '4.23.15' && dev === true"
        status: pass
    human_judgment: false
  - id: D2
    description: "npm run interop-harness runs the harness through the local pinned tsx end to end to the connect path (no shebang, no registry runner fetch)"
    requirement: "DEP-03"
    verification:
      - kind: other
        ref: "npm --prefix bbj-vscode run interop-harness -- --host 127.0.0.1 --port 1 --timeout 2000 (exit 2, prints 'Make sure the BBj interop service is running')"
        status: pass
      - kind: other
        ref: "grep -c 'npm run interop-harness' run-tests.ts === 3; head -c 2 run-tests.ts is '/*' not '#!'; grep -c 'npx' run-tests.ts === 0"
        status: pass
      - kind: other
        ref: "grep -c \"from 'vscode-jsonrpc/node.js'\" run-tests.ts === 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "package.json differs from the phase base only by devDependencies.tsx and scripts.interop-harness; CLAUDE.md documents the new npm script"
    requirement: "DEP-03"
    verification:
      - kind: other
        ref: "node -e deep-equal of parsed package.json against git show d6d03647:bbj-vscode/package.json after deleting the two additions"
        status: pass
      - kind: other
        ref: "grep -c 'npm run interop-harness' CLAUDE.md === 1"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-28
status: complete
---

# Phase 115 Plan 01: Pin tsx and Route the Interop Harness Through npm run interop-harness Summary

**tsx pinned to exact 4.23.15 as a locked devDependency (human-approved at a blocking-human legitimacy checkpoint), with `npm run interop-harness` as the harness's only entry point and a corrected `vscode-jsonrpc/node.js` import specifier.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-28T07:16:00Z
- **Completed:** 2026-09-28T07:28:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `bbj-vscode/package.json` declares `"tsx": "4.23.15"` (exact, no range) in devDependencies, and `package-lock.json` records `node_modules/tsx` at 4.23.15 as a dev package; `npm ls tsx --depth=0` lists it as a direct dependency
- New npm script `"interop-harness": "tsx tools/interop-test-harness/run-tests.ts"` is the only documented way to run the harness
- `run-tests.ts` no longer has a shebang or any registry-runner invocation (`npx`); its Usage block names only `npm run interop-harness` (3 occurrences); the header otherwise untouched
- `vscode-jsonrpc` import switched from the extensionless `'vscode-jsonrpc/node'` to `'vscode-jsonrpc/node.js'`, matching `src/language/java-interop.ts` and correct Node16 ESM resolution for a package with no `exports` map
- CLAUDE.md's Build & Test Commands block documents `npm run interop-harness`
- End-to-end smoke run against a closed port (127.0.0.1:1) confirmed the whole path: npm resolves the script, the local pinned tsx loads the harness and its imports, `parseArgs` accepts `--host`/`--port`/`--timeout`, and the connect path reports the refused connection and exits 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Blocking-human legitimacy checkpoint for tsx 4.23.15** - answered by the orchestrator before this executor ran (no code changes; see Checkpoint Resolution below)
2. **Task 2: npm run interop-harness runs the harness through the pinned local tsx** - `bb6cb533` (feat)

**Plan metadata:** committed alongside this SUMMARY (see below)

## Files Created/Modified
- `bbj-vscode/package.json` - added `devDependencies.tsx` = `4.23.15` (exact) and `scripts.interop-harness`
- `bbj-vscode/package-lock.json` - added the `node_modules/tsx` lockfile entry at 4.23.15 (dev)
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` - removed shebang, rewrote Usage block to the npm script, fixed the `vscode-jsonrpc` import specifier
- `CLAUDE.md` - added one Build & Test Commands line documenting `npm run interop-harness`

## Checkpoint Resolution

**Task 1 (checkpoint:human-verify, gate="blocking-human")** was answered before this executor was dispatched. The orchestrator presented the registry legitimacy facts (repo github.com/privatenumber/tsx, latest dist-tag 4.23.15, no install scripts, dependencies esbuild ~0.28.0, optional fsevents ~2.3.3) to the human, and verified `test ! -e bbj-vscode/node_modules/tsx` succeeded beforehand (nothing installed early).

**Approved version (verbatim): `4.23.15`**

This executor used exactly that version for the Task 2 install and never re-prompted.

## Decisions Made
- Followed the plan's D-15/D-16 decisions exactly: exact-pinned `tsx` devDependency, `npm run interop-harness` as the sole entry point
- Installed with `--save-exact --ignore-scripts` per the plan's interfaces note, since bbj-vscode's own `prepare` script (langium generate + build) does not run cleanly under the local Node 24 and must not fire as a side effect of this devDependency install

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Tracer Feedback Gate

Task 2 is `type="tracer"`. Per the tracer feedback gate (auto mode active, `workflow.auto_advance: true`), the tracer's `<verify>` was re-run after the task commit: `npm run interop-harness -- --host 127.0.0.1 --port 1 --timeout 2000` again exited 2 with the "Make sure the BBj interop service is running" hint. No expansion tasks follow in this plan, so no further action was needed.

## Self-Check: PASSED

- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/package.json` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/package-lock.json` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/run-tests.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/CLAUDE.md` — FOUND
- `git log --oneline --all | grep -q bb6cb533` — FOUND
- All task `<acceptance_criteria>` re-verified: PASS (see Accomplishments)
- Plan-level `<verification>` re-run: `npm run interop-harness -- --host 127.0.0.1 --port 1 --timeout 2000` exits 2 with hint (PASS); `npm ls tsx --depth=0` shows tsx@4.23.15 direct (PASS); `npm run build` exits 0 (PASS)

## Next Phase Readiness
- The pinned local `tsx` and `npm run interop-harness` are ready for every later plan in this phase (115-02 through 115-06) to smoke-test the rewritten harness through the npm script, and for the phase's final live before/after run.
- No blockers.

---
*Phase: 115-honest-interop-test-harness*
*Completed: 2026-09-28*
