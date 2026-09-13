---
phase: 92-host-side-hygiene-focus-guards
plan: "05"
subsystem: vs-code-extension
tags: [vscode, activation, disposables, command-registration, regression-test]

requires:
  - phase: 92-host-side-hygiene-focus-guards
    provides: "plan 92-01's bbj.runBUI/bbj.runDWC handler bodies (D-05/D-06/D-07 target-resolution wiring) that this plan wraps unchanged"
provides:
  - "extension.ts activate() pushes every Disposable it creates directly (all 14 registerCommand calls, registerDocumentFormattingEditProvider, and all 3 client.onNotification calls) onto context.subscriptions"
  - "extension-activation.test.ts's mocked vscode harness now throws command '<id>' already exists for a still-registered id, proving a re-activation regression the same way real VS Code would"
affects: []

actuals:
  tokens: 4300
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "vi.hoisted-shared mock state (registeredCommandIds Set, onNotificationMock) referenced both inside vi.mock('vscode', ...) factories and inside test bodies, mirroring composer-lens-command.test.ts's established idiom"

key-files:
  created: []
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/test/extension-activation.test.ts

key-decisions:
  - "D-09/D-10 implemented exactly as locked in 92-CONTEXT.md: every Disposable activate() creates directly is pushed onto context.subscriptions, and the regression test extends the existing mocked harness rather than adding a new one."
  - "The languages.registerCodeActionsProvider and registerCodeLensProvider mocks were changed to return disposable() (not just registerDocumentFormattingEditProvider) because setopts-in-code-ui.ts's real (unmocked) registerSetOptsInCodeComposer call also registers through them during every activate(); without a real dispose function there, the re-activation test's disposeSubscriptions() call would crash on an undefined entry unrelated to this plan's own registrations. This surfaced empirically while validating the two-commit split, not from a production defect — no production code outside activate()'s own bare registrations needed a fix."
  - "Nothing outside activate()'s own bare registrations needed disposal: document-formatter.ts's import-time listeners and the module-level client/restartGate variables were left untouched per the plan's flagged assumption, since the double-activate test passed without touching them."

requirements-completed: [RESP-08]

coverage:
  - id: D1
    description: "Every vscode.commands.registerCommand(...) call in activate() (all 14) is pushed onto context.subscriptions"
    requirement: RESP-08
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#extension re-activation (#531) > a second activation after disposing the first registers every command again without throwing"
        status: pass
    human_judgment: false
  - id: D2
    description: "The mocked harness proves it would actually catch a double registration: two activations with no disposal in between throw command '<id>' already exists"
    requirement: RESP-08
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#extension re-activation (#531) > activating twice without disposing the first throws on a duplicate command id"
        status: pass
    human_judgment: false
  - id: D3
    description: "registerDocumentFormattingEditProvider and all three client.onNotification handlers (bbj/bbjcplAvailability, CONFIG_RELOAD_METHOD, RESOLVED_CONFIG_PATH_METHOD) are pushed onto context.subscriptions, and every Disposable those calls return is present in the activation's own context.subscriptions"
    requirement: RESP-08
    verification:
      - kind: unit
        ref: "bbj-vscode/test/extension-activation.test.ts#extension re-activation (#531) > the formatting provider and every notification handler are disposed with the activation, alongside every command"
        status: pass
    human_judgment: false
  - id: D4
    description: "The restart gate is unaffected: restart-gate.ts never touches context.subscriptions, and the config-reload restart path (config-reload-host.test.ts) still passes unchanged, so notification handlers are released only on deactivation, never on a config-reload restart"
    requirement: RESP-08
    verification:
      - kind: unit
        ref: "bbj-vscode/test/config-reload-host.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "A VS Code window reload starts a fresh extension host and cannot reproduce #531 by hand — the automated double-activate test is the only proof this requirement has"
    verification: []
    human_judgment: true
    rationale: "CONTEXT.md states explicitly that this requirement has no live UAT step; the underlying behavior is fully covered by the automated re-activation and membership tests above."

duration: ~20min
completed: 2026-09-13
status: complete
---

# Phase 92 Plan 05: VS Code Re-Activation Cleanup (RESP-08) Summary

**Every Disposable `activate()` creates directly — all 14 `registerCommand` calls, the formatting provider, and all three `client.onNotification` handlers — is now pushed onto `context.subscriptions`, proven by a mocked-VS-Code harness that throws `command '<id>' already exists` on a still-registered id exactly as the real API does.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-13T07:39Z
- **Completed:** 2026-09-13T07:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `extension.ts`'s `activate()` wraps all 14 `vscode.commands.registerCommand(...)` calls in `context.subscriptions.push(...)`: `bbj.config`, `bbj.properties`, `bbj.em`, `bbj.loginEM`, `bbj.run`, `bbj.runBUI`, `bbj.runDWC`, `bbj.compile`, `bbj.denumber`, `bbj.decompile`, `bbj.decompileReadonly`, `bbj.configureCompileOptions`, `bbj.refreshJavaClasses`, `bbj.showClasspathEntries`. Handler bodies are byte-identical inside the wrapper.
- `vscode.languages.registerDocumentFormattingEditProvider("bbj", DocumentFormatter)` and all three `client.onNotification(...)` calls (`bbj/bbjcplAvailability`, `CONFIG_RELOAD_METHOD`, `RESOLVED_CONFIG_PATH_METHOD`) are likewise pushed onto `context.subscriptions`.
- `extension-activation.test.ts`'s mocked `vscode` harness now models the real failure: `commands.registerCommand` throws `command '<id>' already exists` for an id still registered and undisposed, and returns a real `dispose()` that releases it; `languages.registerDocumentFormattingEditProvider`/`registerCodeActionsProvider`/`registerCodeLensProvider` and the `LanguageClient` mock's `onNotification` now return real disposables instead of `undefined`.
- New `describe('extension re-activation (#531)')` block with three tests: a negative control (two activations without disposal throw), the re-activation regression itself (dispose then re-activate does not throw and re-registers every command), and a membership test proving every mock return value from `registerCommand`, `registerDocumentFormattingEditProvider` and `onNotification` is present in that activation's own `context.subscriptions`.
- The two pre-existing `P62-D2-004` tests (`client.start()` rejection surfaced / successful start activates cleanly) still pass unchanged in intent.

## Task Commits

1. **Task 1: A second activation after disposing the first registers every command again without throwing** - `f2395b42` (feat)
2. **Task 2: The formatting provider and all three notification handlers are released with the activation, and every returned Disposable is accounted for** - `e8193f7d` (feat)

**Plan metadata:** committed separately after this SUMMARY.

_Note: both tasks were TDD (`tdd="true"`). The RED state for Task 1 (negative control + re-activation test failing against the unwrapped `activate()`) and Task 2 (membership test failing on the formatter/notification results) was confirmed in one combined pass before any production code changed — running the full test file at that point showed exactly the two GREEN-dependent tests failing (`a second activation... registers every command again without throwing` and `the formatting provider and every notification handler are disposed...`), with the negative control already passing (it only needs the throwing mock, not the production fix). The work was then split into two atomic task commits by reconstructing each task's intermediate state (registerCommand wraps only, then formatter/notification wraps added) and re-verifying both intermediate and final states independently — both intermediate states passed their own targeted test runs before being committed, and the final committed files are byte-identical to the originally validated combined GREEN state._

## Files Created/Modified
- `bbj-vscode/src/extension.ts` - every Disposable `activate()` creates directly is pushed onto `context.subscriptions`
- `bbj-vscode/test/extension-activation.test.ts` - duplicate-throwing `registerCommand` mock, negative control, double-activate test, Disposable membership test

## Decisions Made
- D-09/D-10 implemented exactly as locked: every Disposable `activate()` creates directly (commands, formatter, notifications) is pushed onto `context.subscriptions`; the regression test extends the existing mocked harness.
- The `languages.registerCodeActionsProvider`/`registerCodeLensProvider` mocks needed the same `disposable()` return as the formatter, discovered while validating the two-commit split: `setopts-in-code-ui.ts`'s real (unmocked) `registerSetOptsInCodeComposer(context, ...)` call, invoked at the top of every `activate()`, registers through those exact mocks too. Without a real `dispose()` there, `disposeSubscriptions()` in the re-activation test crashed on an `undefined` entry that had nothing to do with this plan's own changes. No production code outside `activate()`'s bare registrations required a fix — `setopts-in-code-ui.ts` already pushes its own registrations correctly, as `92-CONTEXT.md`'s Reusable Assets section notes.
- Nothing beyond `activate()`'s own bare registrations needed disposal (the plan's flagged assumption): `document-formatter.ts`'s import-time `onDidChangeTextDocument`/`onDidCloseTextDocument` listeners and the module-level `client`/`restartGate` variables were left untouched, since the double-activate test passed without touching them.

## Deviations from Plan

None - plan executed exactly as written. (The mock-fixture discovery above is test-mechanics scope, matching the plan's own "Claude's Discretion" note that whether anything beyond `activate()`'s direct registrations needs disposal is decided by whether the D-10 test fails — here the test only needed a mock fixture broadened, not a production fix.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RESP-08 (#531) is closed: a second `activate()` in the same extension host re-registers every command, the formatting provider and every notification handler cleanly after the first activation's `context.subscriptions` are disposed, proven by a mocked harness that fails exactly like real VS Code on a leaked registration.
- The restart gate (Phase 85) is unaffected: `restart-gate.ts` never touches `context.subscriptions`, and `config-reload-host.test.ts`'s full suite still passes, so config-reload restarts continue to reuse the same `LanguageClient` instance with its notification handlers intact.
- Live VS Code UAT is not applicable for this requirement (a window reload starts a fresh extension host and cannot reproduce #531 by hand, per `92-CONTEXT.md`); the automated test is the sole proof, and it is green.

---
*Phase: 92-host-side-hygiene-focus-guards*
*Completed: 2026-09-13*

## Self-Check: PASSED

- `bbj-vscode/src/extension.ts` — FOUND
- `bbj-vscode/test/extension-activation.test.ts` — FOUND
- Commit `f2395b42` — FOUND in `git log --all`
- Commit `e8193f7d` — FOUND in `git log --all`
- `grep -c 'context.subscriptions.push(vscode.commands.registerCommand(' bbj-vscode/src/extension.ts` — 14
- `grep -c 'client.onNotification(CONFIG_RELOAD_METHOD' bbj-vscode/src/extension.ts` — 1
- Targeted suite (`extension-activation.test.ts`, `config-reload-host.test.ts`, `config-file-association.test.ts`, `target-resolution.test.ts`, `no-shell-command-construction.test.ts`, `em-secret-env-channel.test.ts`, `setopts-in-code-ui.test.ts`) — 171 passed, 1 skipped, 0 failed
- Build (`tsc -b` + esbuild) — clean
- Lint (`eslint src test`) — clean
- Register check (no planning ids in added lines since base `3ec25f02`) — clean
