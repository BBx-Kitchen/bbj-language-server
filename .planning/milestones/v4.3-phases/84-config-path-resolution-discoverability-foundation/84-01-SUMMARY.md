---
phase: 84-config-path-resolution-discoverability-foundation
plan: 01
subsystem: language-server
tags: [langium, lsp, config-path, vitest]

requires: []
provides:
  - "config-path-resolver.ts: the single owner of config-path resolution (normalizeConfigSetting, expandHome, canonicalizeConfigPath, samePath, resolveConfigPath, ResolvedConfigPath type)"
  - "bbj/resolvedConfigPath LSP request (on-demand read) and identically-shaped pushed notification"
  - "BBjWorkspaceManager.getResolvedConfigPath() and initializeWorkspace's PREFIX read routed through it"
affects: [84-02, 84-03, 84-04, 84-05, 84-06]

actuals:
  tokens: 10931
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "bbj/... custom LSP request/notification pair sharing one method-name constant and one payload shape, modeled on compile-command.ts + bbj-notifications.ts"
    - "Injectable filesystem/home probes (fileExists/realPath/homeDir) on a pure resolver function, for hermetic unit tests without touching real disk in the common case"

key-files:
  created:
    - bbj-vscode/src/language/config-path-resolver.ts
    - bbj-vscode/src/language/resolved-config-path-request.ts
    - bbj-vscode/test/config-path-resolution.test.ts
  modified:
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/src/language/main.ts

key-decisions:
  - "canonicalizeConfigPath always makes its input absolute via path.resolve before probing for a symlink, so a caller that already validated absoluteness (resolveConfigPath's 'setting' branch) gets a no-op there and no path silently anchors to a workspace folder."
  - "The home-default branch canonicalizes the home directory first, then joins cfg/config.bbx, then canonicalizes the joined path again — the second pass resolves a symlinked config.bbx inside a real home directory."
  - "initializeWorkspace's warn-on-failure log line names both the resolved path and, when resolution already flagged a problem, that problem string, so a missing config file is diagnosable from the log alone."

requirements-completed: [CFG-01, CFG-02]

coverage:
  - id: D1
    description: "One shared resolveConfigPath function is the sole owner of config-path derivation, exposed via bbj/resolvedConfigPath (request) and a pushed notification of the same shape"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config-path-resolution.test.ts#bbj/resolvedConfigPath request handler and notification (end-to-end)"
        status: pass
      - kind: unit
        ref: "test/config-path-resolution.test.ts#resolveConfigPath > resolveConfigPath is the only function that concatenates a BBj home with cfg and config.bbx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Blank/whitespace/EM-Config-sentinel settings resolve identically to unset (home default); a relative setting is rejected with a named problem; a leading tilde expands, a mid-string tilde does not"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config-path-resolution.test.ts#normalizeConfigSetting, expandHome, resolveConfigPath"
        status: pass
    human_judgment: false
  - id: D3
    description: "initializeWorkspace reads PREFIX through getResolvedConfigPath() instead of its own three-way branch; the directory-scan for a *config.bbx file is deleted"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config-path-resolution.test.ts#initializeWorkspace reads PREFIX through the resolver"
        status: pass
    human_judgment: false
  - id: D4
    description: "A bbj.configPath setting change re-resolves and re-pushes exactly once per distinct value, on both sides of the workspaceInitialized gate, with no PREFIX/USE reload added"
    requirement: "CFG-01"
    verification:
      - kind: unit
        ref: "test/config-path-resolution.test.ts#re-resolve and re-push on a config-path setting change"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-09-06
status: complete
---

# Phase 84 Plan 01: Config Path Resolution & Discoverability Foundation Summary

**One `resolveConfigPath()` function in `config-path-resolver.ts` is now the sole source of the BBj config-file path, exposed to both IDE hosts through a `bbj/resolvedConfigPath` request and an identically-shaped pushed notification, with `initializeWorkspace`'s own PREFIX read routed through the same function instead of a second, hand-rolled fallback.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-06T14:00:00Z (approx.)
- **Completed:** 2026-09-06T14:39:37Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `config-path-resolver.ts` is the only function in the repository that concatenates a BBj
  home with `cfg` and `config.bbx`; it also centrally neutralizes the EM Config `--`
  sentinel, expands only a leading `~`, rejects relative settings with a named problem,
  and produces an absolute, symlink-resolved, `path.normalize`d, NFC-normalized string
  compared via a platform-aware `samePath`.
- `bbj/resolvedConfigPath` is registered next to `bbj/compile` in `main.ts`, and
  `notifyResolvedConfigPath` pushes the identical payload shape once workspace
  initialization first validates, and again on every `bbj.configPath` setting change
  (both the pre- and post-`workspaceInitialized` branches), deduplicated by value.
- `initializeWorkspace`'s three-way `configPath`/`bbjdir`/neither branch collapsed into one
  call to `getResolvedConfigPath()`; the dead directory-scan for a file ending in
  `config.bbx` is deleted, and the warn-on-failure log line now names the resolved path and
  any problem the resolver already flagged.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end resolved config path — one path, server to wire** - `3709a9f1` (feat)
2. **Task 2: initializeWorkspace reads PREFIX through the resolver** - `2a9bdf73` (feat)
3. **Task 3: Re-resolve and re-push on a config-path setting change** - `1ab3319f` (feat)

_All three tasks carried `tdd="true"`; each commit bundled its test additions alongside the
implementation in a single commit rather than a separate RED/GREEN split, since the plan's
task granularity (one commit per numbered task) took precedence over the strict RED/GREEN/
REFACTOR cadence for this `type: execute` plan (not `type: tdd`). See "TDD Gate Compliance"
below._

## Files Created/Modified

- `bbj-vscode/src/language/config-path-resolver.ts` - pure resolver: `normalizeConfigSetting`, `expandHome`, `canonicalizeConfigPath`, `samePath`, `resolveConfigPath`, `EM_CONFIG_SENTINEL`, `ResolvedConfigPath`
- `bbj-vscode/src/language/resolved-config-path-request.ts` - `bbj/resolvedConfigPath` request: `createResolvedConfigPathHandler`, `registerResolvedConfigPathRequest`, `ResolvedConfigPathResult`
- `bbj-vscode/src/language/bbj-notifications.ts` - `notifyResolvedConfigPath`, deduped by serialized payload
- `bbj-vscode/src/language/bbj-ws-manager.ts` - `BBjWorkspaceManager.getResolvedConfigPath()`; `initializeWorkspace`'s PREFIX read routed through it
- `bbj-vscode/src/language/main.ts` - registers the request; pushes the notification after first validation and after each of the two `setConfigPath` call sites
- `bbj-vscode/test/config-path-resolution.test.ts` - unit + end-to-end coverage for every behavior in the plan's three tasks

## Decisions Made

- `canonicalizeConfigPath` always runs `path.resolve` first (making it idempotent for an
  already-absolute input) rather than assuming its caller pre-validated absoluteness — kept
  the function safe to reuse standalone.
- The home-default branch canonicalizes the home directory, joins `cfg`/`config.bbx`, then
  canonicalizes the joined result again, so a symlinked `config.bbx` inside a real home
  resolves to its real target exactly like the explicit-setting branch does.
- Task 2's test suite uses a real-disk-backed `BBjWorkspaceManager` (`NodeFileSystem` +
  `createBBjTestServices`'s hermetic Java-interop double) rather than an in-memory
  `FileSystemProvider`, because `resolveConfigPath`'s own existence/symlink probes run
  against the real OS filesystem and an in-memory stub would disagree with them.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' acceptance criteria were met on
first implementation; no fix-attempt cycles were needed.

## TDD Gate Compliance

All three tasks in this plan carry `tdd="true"`, but the plan's own frontmatter is
`type: execute` (not `type: tdd`), and each task's action explicitly describes writing the
test file alongside the implementation as part of one task, not a separate RED-phase
commit. Following the plan literally (one commit per task, task-level acceptance criteria
gating each commit) produced 3 commits, not the 2-3-per-feature RED/GREEN/REFACTOR pattern
`tdd.md` describes for `type: tdd` plans. No `test(84-01): ...`-prefixed commit precedes a
`feat(84-01): ...` commit for the same behavior; each `feat` commit already contains its
own tests, verified green in the same commit. This is a pre-existing tension between the
per-task `tdd="true"` attribute and the plan-level `type: execute` frontmatter, not a defect
introduced during execution — flagged here for visibility, not auto-corrected, since
splitting each commit into a separate failing-test-first commit after the fact would not
reflect how the code was actually written (tests and implementation were designed together
per the plan's own `<behavior>`/`<action>` structure).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`config-path-resolver.ts`, the `bbj/resolvedConfigPath` request/notification pair, and
`getResolvedConfigPath()` are in place for the remaining Phase 84 plans (editor
association mechanics, consumer audits for run commands and compile, IntelliJ-side
wiring) to consume without re-deriving the fallback. Phase 85's config-reload watcher can
hook the same `bbj/resolvedConfigPath` notification this plan already pushes.

---
*Phase: 84-config-path-resolution-discoverability-foundation*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk (config-path-resolver.ts, resolved-config-path-request.ts,
config-path-resolution.test.ts, bbj-ws-manager.ts, bbj-notifications.ts, main.ts, this SUMMARY).
All three task commits (`3709a9f1`, `2a9bdf73`, `1ab3319f`) confirmed present in `git log`. All
plan-level `<verification>` commands re-run clean: `npx vitest run test/config-path-resolution.test.ts`
(29/29 passed), `npm run build` (rewrote `out/language/main.cjs`, zero `error TS` lines), and
`'cfg'` string concatenation confirmed to appear in exactly one source file
(`config-path-resolver.ts`).
