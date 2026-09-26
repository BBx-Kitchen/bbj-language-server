---
phase: 110-workspace-settings-filesystem-trust
plan: 05
subsystem: extension-host
tags: [vscode, workspace-trust, configPath, vscode-languageclient, security]

# Dependency graph
requires: []
provides:
  - "config-path-trust.ts: effectiveConfigPath/gatedBbjSettings/createConfigPathTrustMiddleware/registerTrustGrantRepush — the one place the VS Code client decides which bbj.configPath it hands the server"
  - "extension.ts wired to the trust helper at every configPath handoff: initializationOptions, the synchronize.configurationSection push (via clientOptions.middleware.workspace), the workspace/configuration pull, and the trust-grant re-push"
  - "config-path-cache.ts's explicitSettingPath() reads through the same helper, so the client's own config-association fallback is gated too"
affects: []

# Actuals (#2632)
actuals:
  tokens: 12983
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable TrustAwareWorkspace interface (isTrusted/getConfiguration/onDidGrantWorkspaceTrust) satisfied by vscode.workspace, mirroring config-path-resolver.ts's plain-module/injectable-deps shape but wrapping vscode.workspace instead of fs"
    - "A middleware.workspace.didChangeConfiguration hook that never calls the library's next() for an actual section list — it builds the payload itself, since vscode-languageclient's next() re-reads vscode.workspace.getConfiguration() directly and cannot be handed a substituted value"

key-files:
  created:
    - bbj-vscode/src/config-path-trust.ts
    - bbj-vscode/test/extension-config-trust.test.ts
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/config-path-cache.ts
    - bbj-vscode/src/language/config-path-resolver.ts
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/config-file-association.test.ts
    - bbj-vscode/test/config-reload-host.test.ts
    - bbj-vscode/test/stale-output-channel-repro.test.ts

key-decisions:
  - "Followed D-05..D-09, D-21 exactly as written: configPath itself stays un-anchored (config-path-resolver.ts unchanged besides a header comment); only the workspace-scoped value is gated; package.json gains no capabilities block (D-08); IntelliJ and main.ts are untouched (D-09, D-21)"
  - "The push path's middleware never calls the library's next() for a section list — it builds the bbj section itself (gatedBbjSettings) and sends DidChangeConfigurationNotification directly, since vscode-languageclient's next() re-derives values from vscode.workspace.getConfiguration() and cannot substitute a single field (RESEARCH Pitfall 1, confirmed against vscode-languageclient 10.1.0 source)"
  - "A host reporting no trust state at all (isTrusted !== true, including undefined) is treated as untrusted — fail closed"

patterns-established:
  - "Every VS Code-side configPath handoff — initializationOptions, the push, the pull, and the client's own association-cache fallback — reads through one function (effectiveConfigPath), so a future handoff has one obvious place to wire in rather than risking a fifth ungated path"

requirements-completed: [SEC-02]

coverage:
  - id: D1
    description: "One client helper (effectiveConfigPath) computes the configPath the client hands over: untrusted reads only inspect('configPath').globalValue (never workspaceValue/workspaceFolderValue, fail-closed on a missing trust state); trusted returns get('configPath', null) exactly as before"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "test/extension-config-trust.test.ts#effectiveConfigPath (6 rows: global-wins, workspace-only, workspaceFolder-only, no-values, undefined-isTrusted, trusted-merged)"
        status: pass
      - kind: integration
        ref: "test/extension-config-trust.test.ts#initializationOptions honour Workspace Trust for bbj.configPath (issue #511)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every place the client hands configPath to the server uses the helper: initializationOptions, the synchronize.configurationSection push (through a middleware that never calls next() for a section list), the workspace/configuration pull answer, and the client-local config-association fallback"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "test/extension-config-trust.test.ts#the bbj settings push and pull carry the gated configPath (issue #511) (push, trusted push, undefined-sections passthrough, pull substitution across bbj/bbj.configPath/whole-config items, gatedBbjSettings JSON-copy isolation, activate()-level push assertion)"
        status: pass
      - kind: unit
        ref: "test/extension-config-trust.test.ts#config-path-cache honours Workspace Trust before any server push (issue #511)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Granting Workspace Trust re-sends the gated bbj settings through the same builder without a reload, and a rejected send is routed to the output channel instead of escaping as an unhandled rejection"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "test/extension-config-trust.test.ts#granting Workspace Trust re-pushes the bbj settings (issue #511) (subscribe/dispose, fires on grant, rejected send routed to onError, activate()-level subscription + dispose-removes-listener)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No capabilities/untrustedWorkspaces/restrictedConfigurations declaration is added to package.json, and config-path-resolver.ts, main.ts and bbj-intellij are unchanged"
    requirement: SEC-02
    verification:
      - kind: other
        ref: "git diff --stat HEAD -- bbj-intellij bbj-vscode/src/language/main.ts bbj-vscode/package.json (empty after every task)"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-09-26
status: complete
---

# Phase 110 Plan 05: Workspace Trust Gate for bbj.configPath Summary

**One client-side helper (`config-path-trust.ts`) now gates every VS Code handoff of a workspace-scoped `bbj.configPath` — `initializationOptions`, the settings push, the pull answer, and the client's own config-association cache — behind Workspace Trust, while `configPath` itself stays un-anchored for system-wide config files (issue #511).**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-26T12:11:30Z
- **Completed:** 2026-09-26T12:25:48Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments
- `config-path-trust.ts` exports `TrustAwareWorkspace`, `TrustAwareWorkspaceConfiguration`, `effectiveConfigPath`, `SendBbjSettings`, `gatedBbjSettings`, `ConfigPathTrustMiddleware`, `createConfigPathTrustMiddleware`, and `registerTrustGrantRepush` — a plain, `vscode`-wrapping helper module
- `effectiveConfigPath()`: untrusted reads only the user-level `globalValue` via `inspect('configPath')` (never `workspaceValue`/`workspaceFolderValue`); a host reporting no trust state (`isTrusted !== true`, including `undefined`) is treated as untrusted; trusted returns `get('configPath', null)` exactly as before
- `extension.ts`'s `initializationOptions.configPath` now calls `effectiveConfigPath()`; the interop host/port reads dropped their client-side literal defaults (`"localhost"`/`5008`) — the server's shared validator (110-01) owns them
- `config-path-cache.ts`'s `explicitSettingPath()` reads through the same helper, so the client's own config-association fallback is gated identically before any server push arrives
- `createConfigPathTrustMiddleware` installs at `clientOptions.middleware.workspace`: `didChangeConfiguration` never calls vscode-languageclient's own `next()` for an actual section list (which re-reads the raw workspace value) — it builds the payload itself (the gated `bbj` section via `gatedBbjSettings`, a plain copy of the live value for any other requested section) and sends `DidChangeConfigurationNotification` directly; `configuration` substitutes `configPath` into any `bbj` item, `bbj.configPath` item, or whole-configuration item carrying a `bbj` object in the pull answer
- `registerTrustGrantRepush` subscribes to `vscode.workspace.onDidGrantWorkspaceTrust` and re-sends the gated settings once through the same builder, so the workspace `configPath` takes effect without a reload; a rejected send is routed to the output channel instead of becoming an unhandled rejection
- `package.json`, `bbj-vscode/src/language/main.ts`, and `bbj-intellij/` are unchanged by this plan (D-08, D-09, D-21) — criterion 2 is proven entirely by unit tests against a stubbed `vscode.workspace`, since the extension declares no `capabilities` block and therefore never activates in Restricted Mode
- New test file `extension-config-trust.test.ts` (33 tests) covers the helper, `initializationOptions`, the push/pull middleware, the config-path-cache fallback, and the trust-grant re-push, both as direct unit tests against stub workspaces and through `activate()` with the real client wiring

## Task Commits

Each task was committed atomically:

1. **Task 1: An untrusted workspace's configPath never reaches initializationOptions or the association fallback, end to end** - `6b766397` (feat)
2. **Task 2: The configuration push and pull carry the gated configPath (middleware that never calls next for bbj)** - `4e22a5ad` (test, RED) + `9abe761e` (feat, GREEN)
3. **Task 3: Granting Workspace Trust re-pushes the settings so the workspace configPath takes effect without a reload** - `9135dc75` (test, RED) + `4db6af6a` (feat, GREEN)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified
- `bbj-vscode/src/config-path-trust.ts` - the one client-side trust gate for `bbj.configPath` (new)
- `bbj-vscode/src/extension.ts` - `initializationOptions.configPath` uses the helper; `clientOptions.middleware.workspace` wired to the trust-gated middleware; the trust-grant subscription pushed onto `context.subscriptions`
- `bbj-vscode/src/config-path-cache.ts` - `explicitSettingPath()` reads through `effectiveConfigPath()` instead of the raw setting
- `bbj-vscode/src/language/config-path-resolver.ts` - one header-comment sentence pointing at the new client-side gate; no code change
- `bbj-vscode/test/extension-config-trust.test.ts` - new test file (new)
- `bbj-vscode/test/extension-activation.test.ts`, `config-file-association.test.ts`, `config-reload-host.test.ts`, `stale-output-channel-repro.test.ts` - `isTrusted: true` and `onDidGrantWorkspaceTrust` added to each file's `vscode` mock, and `DidChangeConfigurationNotification` added to each file's `vscode-languageclient/node` mock, so their existing (trusted-workspace) fixtures keep working under the new fail-closed helper; no assertion changed in any of the four

## Decisions Made
- Followed D-05 through D-09 and D-21 exactly as CONTEXT.md/RESEARCH.md specified — no deviations from the locked decisions.
- The push middleware's "any other name" branch (for a requested section other than `bbj`) uses `getConfiguration().get(name)` verbatim, matching the plan's own simplified wording rather than replicating vscode-languageclient's full dotted-namespace splitting — this client only ever registers `configurationSection: 'bbj'`, so the generic branch is defensive, not load-bearing.
- `TrustAwareWorkspaceConfiguration.get<T>`'s `defaultValue` parameter is optional (not required as in the plan's literal signature sketch) so `gatedBbjSettings` can call `.get('bbj')` with no default and still satisfy `effectiveConfigPath`'s two-argument call — both call shapes are exercised by the test suite.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed accidental planning-identifier tokens from two source comments before their commit**
- **Found during:** Task 2, at the mandatory pre-commit register-check gate
- **Issue:** Two comments (in `config-path-trust.ts` and `extension.ts`) cited `(D-21)` while explaining why the push middleware must build its own payload — a planning identifier, forbidden in source/test comments per this plan's executor rules.
- **Fix:** Reworded both comments to describe the same "never call next() for a bbj push" rationale without the identifier.
- **Files modified:** `bbj-vscode/src/config-path-trust.ts`, `bbj-vscode/src/extension.ts`
- **Verification:** Re-ran the register-check grep (`git diff --cached ... | grep -E '\bD-[0-9]{2}\b|...'`) — clean before the commit was made; no functional code changed, tests re-run to confirm still green.
- **Committed in:** `9abe761e` (Task 2 GREEN commit — caught and fixed before that commit was created, not a separate commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, self-caught by the mandated pre-commit gate).
**Impact on plan:** None on functionality — a comment-only correction caught by this plan's own required check before any commit landed. No scope creep.

## Issues Encountered

The whole-suite regression gate (`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`, cwd `bbj-vscode`) reported 3 failed test *files* but 0 failed *tests* (2827 passed, 118 skipped). All 3 are the project's documented pre-existing failures on the phase base (`c591cfe8`), named explicitly in this plan's executor rules: `installed-extension-e2e.test.ts` (SETOPTS composer, stale installed bundle) and two `initializeWorkspace`/`beforeAll` hook-timeout files (`extensionless-use-target.test.ts`, `validation-function-calls.test.ts`) under load. This plan's changed files (`config-path-trust.ts`, `extension.ts`, `config-path-cache.ts`, `config-path-resolver.ts`, and the five test files) do not intersect any of those three files' code paths. Every task's own targeted `<verify>` commands passed with 0 failures throughout, and `npx tsc -p tsconfig.json` was clean after every task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SEC-02 is complete; issue #511 is addressed via the roadmap's trust-gate decision (not the issue's own containment proposal, per D-05) — the closing keyword goes in the milestone PR, not in these commits.
- This was the last plan in Phase 110 (Workspace Settings & Filesystem Trust): all five plans (110-01 interop validation, 110-02 path containment, 110-03 decompile probe hardening, 110-04 formatter Java binary trust, 110-05 this plan) are now complete, closing out SEC-01, SEC-02, SEC-06, SEC-07, SEC-08, SEC-09, and REF-02.
- No blockers for Phase 111 (Java Class Data from the Interop Peer).

---
*Phase: 110-workspace-settings-filesystem-trust*
*Completed: 2026-09-26*

## Self-Check: PASSED
