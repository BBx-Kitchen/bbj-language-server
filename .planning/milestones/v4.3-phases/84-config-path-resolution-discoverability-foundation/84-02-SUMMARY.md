---
phase: 84-config-path-resolution-discoverability-foundation
plan: 02
subsystem: editor-integration
tags: [vscode, language-association, config-path, setopts-composer, vitest]

requires:
  - phase: 84-01
    provides: "config-path-resolver.ts (normalizeConfigSetting, expandHome, canonicalizeConfigPath, samePath), the bbj/resolvedConfigPath request and identically-shaped pushed notification"
provides:
  - "config-path-cache.ts: the VS Code host's warm cache for the resolved config path (setResolvedConfigPath, getResolvedConfigPath, getActiveConfigPath, isActiveConfigPath, shouldWarnOnce, resetConfigPathCacheForTests)"
  - "extension.ts wiring: bbj/resolvedConfigPath notification listener with a once-per-path missing-file warning; applyConfigAssociation/releaseConfigAssociation driving bbx-config on activation sweep, open, change and config-path setting change"
  - "setopts-composer-ui.ts: inactive-config hint naming the active config file when the open bbx-config document is a different one"
affects: [84-03, 84-04, 84-05, 84-06]

actuals:
  tokens: 7783
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "VS Code host warm cache mirroring a server push in module-level state, matching the existing bbj/bbjcplAvailability precedent"
    - "Multi-trigger dynamic language association (activation sweep + onDidOpenTextDocument + onDidChangeTextDocument + onDidChangeConfiguration) so an override applied via setTextDocumentLanguage survives reopen and revert instead of firing once"

key-files:
  created:
    - bbj-vscode/src/config-path-cache.ts
    - bbj-vscode/test/config-file-association.test.ts
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/setopts-composer-ui.ts
    - bbj-vscode/test/extension-activation.test.ts
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "extension.ts tracks lastKnownActiveConfigPath itself rather than re-deriving 'the previous path' from the cache at release time, since the cache only moves once the server's next resolvedConfigPath push arrives — a setting-change release must target what was actually associated, not a value that may already have changed underneath it."
  - "releaseConfigAssociation casts undefined to string for setTextDocumentLanguage's second argument: the public vscode .d.ts types that parameter as string-only, so passing undefined (VS Code's own re-classification trigger) needs an explicit cast to keep the build's zero-error-TS gate green."
  - "argForActiveEditor is now exported from setopts-composer-ui.ts so the inactive-config hint is unit-testable directly, instead of only reachable through the full webview-opening command handler (which would need createWebviewPanel/ViewColumn mocked for no additional coverage)."

requirements-completed: [CFG-02]

coverage:
  - id: D1
    description: "config-path-cache.ts is the VS Code host's warm cache: getActiveConfigPath prefers the last pushed path, falls back to the explicit bbj.configPath setting canonicalized (never a derived home default) when nothing has been pushed, and shouldWarnOnce dedupes the missing-file warning per session"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config-file-association.test.ts#config-path-cache (7 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The configured file is switched to bbx-config on activation, on open, after a revert-style edit, and after a bbj.configPath setting change, with the previously active path released back to its default language on that setting change"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config-file-association.test.ts#bbx-config editor association (8 tests, incl. simulated reopen and the .bbj-extension case)"
        status: pass
    human_judgment: true
    rationale: "The unit tests exercise the wiring against a mocked vscode module; actually surviving close/reopen and Revert File in a real editor is only provable in a live VS Code window. This is the QA row this task added (VS Code - LSP Features #10), not yet run by a human."
  - id: D3
    description: "The SETOPTS composer shows a non-blocking hint naming the active config file's full path when the open bbx-config document is not that file, shows nothing when there is no active config path yet, and still opens the composer on the file the user has open"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config-file-association.test.ts#inactive-config hint in the SETOPTS composer (5 tests)"
        status: pass
    human_judgment: true
    rationale: "The unit tests assert the hint call and its wording against a mocked vscode module. Confirming the composer actually opens on the correct file and the message reads sensibly in a live editor is the QA row this task added (VS Code - LSP Features #11), not yet run by a human."

duration: 20min
completed: 2026-09-06
status: complete
---

# Phase 84 Plan 02: Config Path Resolution & Discoverability Foundation Summary

**The VS Code host now keeps the server-pushed resolved config path as a warm cache and dynamically applies the `bbx-config` language to whatever file that cache names — on activation, on open, on revert, and on a `bbj.configPath` setting change — so a custom-named or custom-located config file gets highlighting, the SETOPTS lens and composer, and a user who opens the wrong file by habit is told which one the tooling actually reads.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-06T14:44:00Z (approx.)
- **Completed:** 2026-09-06T15:03:00Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `config-path-cache.ts` holds the last pushed `bbj/resolvedConfigPath` payload and is the single
  place every other VS Code consumer asks "is this document the config file" — before the server
  answers it uses only the explicit `bbj.configPath` setting, canonicalized, and never derives a
  home default itself; a missing/unreadable resolved file warns once per distinct path per session.
- `extension.ts`'s `applyConfigAssociation`/`releaseConfigAssociation` are wired to four
  classification triggers (an activation-time sweep, `onDidOpenTextDocument`,
  `onDidChangeTextDocument`, and `onDidChangeConfiguration` for `bbj.configPath`), so the configured
  file keeps the `bbx-config` language across close/reopen and revert instead of being a one-shot
  association, and a setting change releases the old file before associating the new one. A
  configured path ending in a BBj source extension is still treated as the config file — the
  setting outranks extension-based association.
- `setopts-composer-ui.ts`'s `argForActiveEditor` now names the active config file's full path in a
  non-blocking hint when the open `bbx-config` document is a different file — the confusion issue
  #485 was filed over in the other direction — while still opening the composer on the file the
  user actually has open, and stays silent when there is no active config path yet.
- `QA/FULL-TEST-CHECKLIST.md` gained two rows: the custom-named config file surviving
  close/reopen/Revert File, and the inactive-config hint.

## Task Commits

Each task was committed atomically:

1. **Task 1: Host cache for the resolved config path** - `f7d6451c` (feat)
2. **Task 2: Apply bbx-config on every classification trigger, and release the old path** - `b821535d` (feat)
3. **Task 3: Inactive-config hint in the SETOPTS composer, plus the manual QA row** - `f8d4dca9` (feat)

## Files Created/Modified

- `bbj-vscode/src/config-path-cache.ts` - the host's warm cache: `setResolvedConfigPath`, `getResolvedConfigPath`, `getActiveConfigPath`, `isActiveConfigPath`, `shouldWarnOnce`, `resetConfigPathCacheForTests`
- `bbj-vscode/src/extension.ts` - registers the `bbj/resolvedConfigPath` notification listener with the once-per-path warning; `applyConfigAssociation`/`releaseConfigAssociation` wired to the four classification triggers
- `bbj-vscode/src/setopts-composer-ui.ts` - `argForActiveEditor` (now exported) shows the inactive-config hint before falling through to its existing SETOPTS-line lookup
- `bbj-vscode/test/config-file-association.test.ts` - covers the cache, the association triggers (incl. simulated reopen and release-on-setting-change), and the composer hint
- `bbj-vscode/test/extension-activation.test.ts` - `vscode` mock extended with `workspace.textDocuments`/`onDidOpenTextDocument`/`onDidChangeTextDocument`/`onDidChangeConfiguration` and `languages.setTextDocumentLanguage` so the pre-existing suite keeps passing against the new wiring
- `QA/FULL-TEST-CHECKLIST.md` - two new rows in the VS Code - LSP Features table

## Decisions Made

- `lastKnownActiveConfigPath` is tracked in `extension.ts` itself (not re-derived from the cache at release time) — see key-decisions above.
- `setTextDocumentLanguage(doc, undefined as unknown as string)` — see key-decisions above.
- `argForActiveEditor` exported for direct unit testing — see key-decisions above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended extension-activation.test.ts's vscode mock**
- **Found during:** Task 2 (running the required combined verify: `config-file-association.test.ts` + `extension-activation.test.ts`)
- **Issue:** The pre-existing `vscode` mock in `extension-activation.test.ts` had no `workspace.textDocuments`, `onDidOpenTextDocument`, `onDidChangeConfiguration`, or `languages.setTextDocumentLanguage`. Task 2's new unconditional wiring inside `activate()` calls all of these, so the pre-existing suite threw `TypeError: workspace.textDocuments is not iterable` and failed outright — blocking the plan's own two-file verify gate.
- **Fix:** Added the missing keys to that file's `vi.mock('vscode', ...)` factory (`textDocuments: []`, `onDidOpenTextDocument`, `onDidChangeConfiguration`, `setTextDocumentLanguage`, and `registerCodeLensProvider` for completeness).
- **Files modified:** `bbj-vscode/test/extension-activation.test.ts`
- **Verification:** `npx vitest run test/config-file-association.test.ts test/extension-activation.test.ts` — 2 files passed, 21 tests passed.
- **Committed in:** `b821535d` (Task 2 commit)

**2. [Rule 3 - Blocking] Explicit cast for `setTextDocumentLanguage(doc, undefined)`**
- **Found during:** Task 2 (`npx tsc --noEmit`)
- **Issue:** The plan's action text specifies calling `setTextDocumentLanguage(doc, undefined)` to let VS Code re-apply its default classification, but the public `@types/vscode` signature types the second parameter as `string` only — `undefined` is a compile error.
- **Fix:** `vscode.languages.setTextDocumentLanguage(doc, undefined as unknown as string)`, preserving the specified runtime behavior while keeping the build's zero-`error TS`-lines gate green.
- **Files modified:** `bbj-vscode/src/extension.ts`
- **Verification:** `npx tsc --noEmit -p tsconfig.json` and `npm run build` both clean.
- **Committed in:** `b821535d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes were required to keep the plan's own verification commands green; neither changes the plan's specified behavior or scope.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`config-path-cache.ts` and the four-trigger association pattern in `extension.ts` are available for
the remaining Phase 84 plans (IntelliJ-side file-type override, consumer audits for run commands and
compile, the config-path setting validation). The two new QA rows (VS Code - LSP Features #10-11)
and the D2/D3 human-judgment coverage entries above are the human-verification surface this plan
leaves for end-of-phase UAT — neither has been run by a human yet.

---
*Phase: 84-config-path-resolution-discoverability-foundation*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk (config-path-cache.ts, config-file-association.test.ts,
extension.ts, setopts-composer-ui.ts, extension-activation.test.ts, QA/FULL-TEST-CHECKLIST.md, this
SUMMARY). All three task commits (`f7d6451c`, `b821535d`, `f8d4dca9`) confirmed present in `git log`.
Plan-level `<verification>` re-run clean: `npx vitest run test/config-file-association.test.ts
test/extension-activation.test.ts` (2 files passed, 21/21 tests passed), `npm run build` (zero
`error TS` lines), and `setTextDocumentLanguage(doc, CONFIG_LANGUAGE_ID)` confirmed to appear in
exactly one call site in `extension.ts`. Whole-suite `npx vitest run --maxWorkers=2` shows 12 known
pre-existing failures (linking.test.ts interop drift + issue447-real-interop.test.ts), matching the
project's documented baseline — no new regressions.
