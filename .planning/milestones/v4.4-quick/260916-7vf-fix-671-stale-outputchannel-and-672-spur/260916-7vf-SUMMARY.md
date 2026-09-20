---
phase: 260916-7vf-fix-671-stale-outputchannel-and-672-spur
plan: 01
subsystem: extension-host
tags: [vscode-languageclient, output-channel, config-hot-reload, fs-watch, errno-classification]

# Dependency graph
requires:
  - phase: 85-config-hot-reload
    provides: config-watcher.ts's evaluate()/updateResolvedPath() relevance gate and consumedConfigSnapshot()
provides:
  - Extension-owned BBj output channel that survives every config-reload restart (#671)
  - Three-way config read classification (content/absent/unreadable) that stops a transient read failure from restarting the language server (#672)
affects: [vscode-extension, config-hot-reload]

actuals:
  tokens: 10200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Caller-owned VS Code OutputChannel passed via LanguageClientOptions.outputChannel so vscode-languageclient's _disposeOutputChannel stays false across a client.stop()/start() restart"
    - "Defensive appendOutputLine wrapper so a channel write can never abort a caller (the restart-gate request that follows it)"
    - "Discriminated ConfigReadResult (content/absent/unreadable) replacing a lossy string|null read contract, with a legacy adapter preserving the old null-means-absent meaning for existing callers"

key-files:
  created: []
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/language/config-watcher.ts
    - bbj-vscode/test/stale-output-channel-repro.test.ts
    - bbj-vscode/test/config-watcher-transient-read.test.ts
    - bbj-vscode/test/config-reload-host.test.ts
    - bbj-vscode/test/extension-activation.test.ts
    - bbj-vscode/test/config-file-association.test.ts

key-decisions:
  - "Created the channel with { log: true } (a LogOutputChannel), not a plain OutputChannel — vscode-languageclient's client.js reads .logLevel and later calls .trace()/.onDidChangeLogLevel() on whatever channel clientOptions.outputChannel supplies; a plain OutputChannel lacks those and the TypeScript compiler caught the mismatch (LanguageClientOptions.outputChannel is typed LogOutputChannel, not the plan's assumed OutputChannel)"
  - "Named the startLanguageClient parameter outputChannel (not channel) so the clientOptions entry could use property shorthand, satisfying the done check's literal 'outputChannel,' grep"
  - "isAbsentReadError defaults to false (unreadable) for any error object without a code, or any non-object thrown value — an unrecognized errno errs toward doing nothing rather than toward a spurious restart"

requirements-completed: ["GH-671", "GH-672"]

coverage:
  - id: D1
    description: "A config-reload restart no longer disposes the BBj output channel; a second reload still restarts the server"
    requirement: "GH-671"
    verification:
      - kind: unit
        ref: "test/stale-output-channel-repro.test.ts#the BBj output channel survives a config-reload restart (#671)"
        status: pass
      - kind: unit
        ref: "test/config-reload-host.test.ts#the reload handler appends exactly one output-channel line containing both the path and the payload reason"
        status: pass
    human_judgment: false
  - id: D2
    description: "A transient unreadable config read (EBUSY/EACCES/EPERM/etc.) emits zero notifications and leaves the snapshot untouched; a genuinely absent file still emits exactly one config-missing"
    requirement: "GH-672"
    verification:
      - kind: unit
        ref: "test/config-watcher-transient-read.test.ts#a transient unreadable config read produces zero restarts (#672)"
        status: pass
      - kind: unit
        ref: "test/config-watcher-transient-read.test.ts#isAbsentReadError: ENOENT/ENOTDIR are absent, everything else is unreadable"
        status: pass
    human_judgment: false
  - id: D3
    description: "The legacy readFile dep (null means absent) keeps its meaning byte-for-byte, proven by two committed suites passing unmodified"
    verification:
      - kind: unit
        ref: "test/config-hot-reload.test.ts (unmodified, all passing)"
        status: pass
      - kind: unit
        ref: "test/config-hot-reload-wiring.test.ts (unmodified, all passing)"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-09-16
status: complete
---

# Quick Task 260916-7vf: Fix #671 stale OutputChannel and #672 transient config-read restarts Summary

**Extension-owned BBj output channel survives config-reload restarts, and a three-way config read classification (content/absent/unreadable) stops transient filesystem hiccups from restarting the language server**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-16T05:52:00Z
- **Completed:** 2026-09-16T06:03:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `activate()` now creates the BBj output channel itself with `vscode.window.createOutputChannel('BBj', { log: true })`, passes it into `clientOptions.outputChannel`, and pushes it onto `context.subscriptions` — vscode-languageclient treats it as caller-owned so `client.stop()` (the config-reload restart path) never disposes it, and VS Code disposes it exactly once on deactivation.
- The config-reload handler's write goes through a new `appendOutputLine` helper that swallows a write failure in a try/catch, guaranteeing `restartGate?.request(...)` is always reached even if a future write throws.
- `config-watcher.ts` now classifies every config read into `content` / `absent` / `unreadable` via a new `ConfigReadResult` union and `isAbsentReadError` (true only for `ENOENT`/`ENOTDIR`). An `unreadable` read returns before the snapshot moves and before any notification, in both `evaluate()` (the debounced fs.watch path) and `updateResolvedPath()` (the settings-change path).
- The legacy `readFile` dep (`string | null`, where `null` has always meant absent) is preserved unchanged and adapted internally; `config-hot-reload.test.ts` and `config-hot-reload-wiring.test.ts` pass byte-identical to their pre-plan state.
- Both committed repro test files (`stale-output-channel-repro.test.ts`, `config-watcher-transient-read.test.ts`) were inverted from pinning the broken behavior to asserting the fixed contract, plus new coverage (context.subscriptions disposal, the settings-change unreadable path, an `isAbsentReadError` errno table).

## Task Commits

Each task was committed atomically:

1. **Task 1: The extension owns the BBj output channel end-to-end (#671)** - `1e2ffa6d` (fix)
2. **Task 2: An unreadable config read is not an absent config file (#672)** - `3e5ecaa5` (fix)

_Note: both tasks were TDD (RED test inversion folded into the single fix commit per plan instructions — the plan's action text builds RED then GREEN before the one commit per task, so no separate test-only commit exists)._

## Files Created/Modified
- `bbj-vscode/src/extension.ts` - Creates and owns the BBj output channel; passes it into `clientOptions.outputChannel`; adds the defensive `appendOutputLine` helper used by the reload handler
- `bbj-vscode/src/language/config-watcher.ts` - Adds `ConfigReadResult`, `isAbsentReadError`, the `readConfigFile` dep and its default/legacy-adapter readers; `evaluate()`/`updateResolvedPath()` return before the snapshot moves on an unreadable read
- `bbj-vscode/test/stale-output-channel-repro.test.ts` - Inverted to assert the channel survives a restart, the client never falls back to its own channel, and the channel is disposed exactly once via `context.subscriptions`
- `bbj-vscode/test/config-watcher-transient-read.test.ts` - Inverted to assert zero notifications on a transient unreadable read, a preserved snapshot across a flap, the absent-path behavior, the settings-change path, and the `isAbsentReadError` errno table
- `bbj-vscode/test/config-reload-host.test.ts` - Added `channelAppendLineMock`; retargeted the "reload handler appends" assertion at the extension-owned channel and asserted the client's own channel is never written to
- `bbj-vscode/test/extension-activation.test.ts` - Added `dispose: vi.fn()` to the `createOutputChannel` mock (the channel is now pushed onto `context.subscriptions`, which this suite disposes)
- `bbj-vscode/test/config-file-association.test.ts` - Same `dispose: vi.fn()` addition to its `createOutputChannel` mock

## Decisions Made
- Used `{ log: true }` (a `LogOutputChannel`) rather than a plain `OutputChannel` for the extension-owned channel — this is a Rule 1 auto-fix, not a plan choice: `npx tsc --noEmit` failed because `vscode-languageclient`'s `LanguageClientOptions.outputChannel` is typed `LogOutputChannel`, and reading `client.js` confirmed why — the library reads `.logLevel` on construction and later calls `.trace(...)`/`.onDidChangeLogLevel(...)` on whatever channel it was given. A plain `OutputChannel` would type-fail and, if the type error were suppressed, would throw at runtime the first time server communication tracing fired.
- Named the `startLanguageClient` output-channel parameter `outputChannel` (shadowing the module-level binding only within that function) so `clientOptions` could use property shorthand (`outputChannel,`) — this satisfies the plan's literal `grep -c 'outputChannel,'` done check and reads more naturally than an aliased `channel: outputChannel`.
- `isAbsentReadError` treats any error object lacking a `code`, and any non-object thrown value, as `unreadable` rather than `absent` — the plan's own "default-deny" instruction, confirmed by the errno table test covering `ENOENT`/`ENOTDIR` (true) vs. `EBUSY`/`EACCES`/`EPERM`/`EMFILE`/`EIO`/no-code/non-Error (false).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Output channel typed as LogOutputChannel, not plain OutputChannel**
- **Found during:** Task 1, running `npx tsc --noEmit` after the first GREEN pass
- **Issue:** `vscode.window.createOutputChannel('BBj')` returns `vscode.OutputChannel`, but `LanguageClientOptions.outputChannel` in the installed `vscode-languageclient` version is typed `LogOutputChannel`. Beyond the type error, `client.js` reads `.logLevel` synchronously when a channel is supplied and later calls `.trace(...)`/`.onDidChangeLogLevel(...)` on it — both absent from a plain `OutputChannel`, so a naive cast would compile-bypass into a runtime crash the first time server tracing fired.
- **Fix:** Created the channel with `vscode.window.createOutputChannel('BBj', { log: true })`, and widened the module-level `outputChannel` binding and the `startLanguageClient` parameter type to `vscode.LogOutputChannel` (which is a superset of `OutputChannel`, so every existing `outputChannel.appendLine(...)` call site is unaffected).
- **Files modified:** bbj-vscode/src/extension.ts (part of the same Task 1 diff)
- **Verification:** `npx tsc --noEmit` exits 0; all Task 1 verify-command tests still pass
- **Committed in:** `1e2ffa6d` (part of the Task 1 commit — caught before the commit was made, not a separate fix commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, caught by the type checker before committing)
**Impact on plan:** The fix is a strictly more correct implementation of the plan's stated interface (`LanguageClientOptions.outputChannel?: vscode.OutputChannel`, which the plan's own context section asserted — the installed library version's actual type is `LogOutputChannel`). No scope creep; behavior for every existing `appendLine` call site is unchanged since `LogOutputChannel` extends `OutputChannel`.

## Issues Encountered
None beyond the type-checker catch documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both #671 and #672 are closed in code with regression coverage; the two committed repro tests now assert the fixed behavior rather than pinning the defects.
- Whole-suite gate run at `--maxWorkers=2`: 12 failed tests, all matching the plan's documented pre-existing drift baseline (`linking.test.ts` interop = 11, `issue447-real-interop.test.ts` capability test = 1); zero regressions from this plan's changes.
- No blockers. This is a quick task (not part of an active milestone), so no next-phase handoff is required beyond normal PR review.

---
*Phase: 260916-7vf-fix-671-stale-outputchannel-and-672-spur*
*Completed: 2026-09-16*

## Self-Check: PASSED

All 7 modified source/test files confirmed present on disk; both task commits (`1e2ffa6d`, `3e5ecaa5`) confirmed present in `git log --oneline --all`.
