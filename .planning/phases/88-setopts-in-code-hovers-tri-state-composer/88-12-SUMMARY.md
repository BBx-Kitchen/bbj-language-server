---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 12
subsystem: lsp
tags: [langium, lsp4ij, intellij, code-action, dos, gap-closure]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: "88-10's canonical hex-literal formatter (bbjHexLiteral) and 88-11's decoder narrowing to the grammar's HEX_STRING terminal, both landed on the tree this plan builds and reinstalls from"
provides:
  - "bbj-code-action-handler.ts — createBoundedCodeActionHandler/registerBoundedCodeActionHandler, a textDocument/codeAction handler that always answers within a named 5000ms budget, gated on the same DocumentState.Linked hover uses (not Langium's later Validated default), overriding Langium's default registration after startLanguageServer(shared)"
  - "A cold-ordering codeAction probe (installed-extension-e2e.test.ts) that issues codeAction immediately after didOpen, workspace = repo root, LSP4IJ's own params — correcting 88-08's warm-ordering '205ms/15000ms' measurement, which never reproduced the Alt+Enter ordering"
  - "BbjComposeSetoptsInCodeAction + SetoptsInCodeActionAvailability — a second, non-intention editor-context-menu entry point into the IntelliJ tri-state SETOPTS-in-code composer, reaching the identical ComposerLauncher.launch(..., Kind.SETOPTS_IN_CODE) call the lightbulb intention makes"
affects: ["88-13 (rebuilds again for the live IntelliJ Alt+Enter + context-menu retest; this plan's bounded handler and second entry point are what that retest verifies)"]

# Actuals (#2632)
actuals:
  tokens: 10700
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bounded LSP handler: race a Langium document-state wait against a named budget via Promise.race, reshaping the wait's own promise into one that can never reject (settle -> 'settled', any rejection -> 'failed') BEFORE racing it, so an abandoned wait can never surface as an unhandled rejection no matter which side of the race wins"
    - "Post-start handler override: registerBoundedCodeActionHandler(connection, shared, BBj) is called in main.ts immediately after startLanguageServer(shared), the same documented pattern the file already uses for onDidChangeConfiguration — connection.onCodeAction is idempotent-per-registration, so the later call wins"
    - "Cold vs. warm LSP latency probes as two sibling describe blocks in the same e2e file: WARM issues the request only after publishDiagnostics is observed (or its budget elapses); COLD issues it immediately after didOpen with no wait — the two orderings previously produced 205ms vs. 56016ms on the same server/fixture, so measuring only one silently answers the wrong question"

key-files:
  created:
    - bbj-vscode/src/language/bbj-code-action-handler.ts
    - bbj-vscode/test/bbj-code-action-handler.test.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailability.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailabilityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java
  modified:
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "CODE_ACTION_BUDGET_MS = 5000 — comfortably longer than a warm answer on an already-Validated document (measured 205ms against the shared server), far shorter than a human's tolerance for a frozen dialog (a live probe measured a real 56016ms hang on an unsettled workspace, and an unsettled build can otherwise wait forever)"
  - "The document-state gate moves from addCodeActionHandler's default (DocumentState.Validated) to addHoverHandler's (DocumentState.Linked) — hover answered on the very workspace where code actions never did, on the same build, in the same session, per the debug session's own evidence"
  - "The wait's own promise is reshaped into a never-rejecting one (.then -> 'settled', .catch -> 'failed') BEFORE racing it against the budget, not after — this is what makes it safe to abandon: whichever side of Promise.race wins, the original promise already has both a resolve and a reject handler attached, so a late rejection from an abandoned wait can never become an unhandled rejection"
  - "The cold-ordering probe opens the workspace at the repository root (not rootUri: null, which the file's other describe blocks use) — this matches the workspace shape the tester's IntelliJ project actually used when the live probe measured the 56016ms hang, and is the reason DocumentState.Validated (which depends on full workspace/Java-classpath resolution) is slow while DocumentState.Linked is fast"
  - "SetoptsInCodeActionAvailability's BBJ_SOURCE_EXTENSIONS set is exactly the four extensions plugin.xml already registers for BbjFileType (bbj/bbjt/src/bbx), not a new list — the entry belongs everywhere a .bbj-language file can appear, and nowhere else"
  - "bbj.composeSetoptsInCode is the IntelliJ action's id, matching the existing VS Code command id (bbj.composeSetoptsInCode, already registered in package.json) verbatim, so both hosts name the feature identically"

patterns-established: []

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "textDocument/codeAction always answers within a 5000ms budget, gated on DocumentState.Linked (not Validated); every failure path (absent document, rejected wait, throwing provider) also resolves null rather than propagating; an abandoned wait never surfaces as an unhandled rejection"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-code-action-handler.test.ts (9 tests, all behaviours from the plan's <behavior> block)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/code-action.test.ts (7 tests — existing quick-fix provider behaviour unchanged)"
        status: pass
      - kind: other
        ref: "npm --prefix bbj-vscode run build (tsc -b + esbuild)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A cold-ordering codeAction probe against the freshly rebuilt/reinstalled bundle, workspace = repository root, issued immediately after didOpen with LSP4IJ's own params, settles well within budget — correcting 88-08's warm-ordering measurement"
    requirement: "DISC-06"
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts ('cold-ordering codeAction probe against the reinstalled bundle, workspace = repo root (#475)') — measured 7ms, diagnostics NOT yet arrived"
        status: pass
    human_judgment: false
  - id: D3
    description: "A second, non-intention editor-context-menu entry point into the IntelliJ tri-state SETOPTS-in-code composer, scoped to BBj source files and absent on the resolved config file, calling the identical launcher the lightbulb intention calls"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailabilityTest.java (4 tests)"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java (5 tests)"
        status: pass
      - kind: other
        ref: "cd bbj-intellij && ./gradlew test (750 tests, 0 failures) && ./gradlew buildPlugin"
        status: pass
    human_judgment: false
  - id: D4
    description: "G-88-2's actual symptom — a frozen 'Searching for Context Actions...' modal on Alt+Enter in a live, running IntelliJ — and the new context-menu entry point actually appearing/working in that same live IDE"
    verification: []
    human_judgment: true
    rationale: "No IntelliJ sandbox exists in this devcontainer (probed directly by plan 88-09). Every gate in this plan proves the server answers within budget and the new action is wired/registered correctly against real artifacts (a spawned LSP process, a built plugin distributable) — none of it drives a live IntelliJ Application. G-88-2 stays status:failed; plan 88-13 stages the live retest."

duration: ~20min
completed: 2026-09-11
status: complete
---

# Phase 88 Plan 12: Bounded codeAction Handler + IntelliJ Composer Context-Menu Entry Summary

**A `textDocument/codeAction` handler that always answers within a 5000ms budget on hover's own document-state gate (replacing Langium's default, unbounded, later-gated one), proven against a cold-ordering probe that dropped from a measured 56016ms hang to 7ms — plus a second, non-intention editor-context-menu door into IntelliJ's SETOPTS-in-code composer.**

## G-88-2 status: still `failed` — no live IntelliJ retest happened here

**This must be read before anything else in this SUMMARY.** This devcontainer has no IntelliJ sandbox (probed directly by plan 88-09), so nothing in this plan observed an Alt+Enter popup or a context-menu entry in a running IDE. Every verification below proves an artifact-level fact — a spawned LSP server process answering within budget, a built plugin distributable containing the new action, a passing plain-JUnit/vitest suite — never a live UI interaction. `G-88-2` stays `status: failed` in `88-UAT.md`; plan `88-13` stages the live retest that alone can flip it.

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-11T10:26:00Z (session start, reading plan/context)
- **Completed:** 2026-09-11T10:43:00Z
- **Tasks:** 3
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- **`bbj-code-action-handler.ts`** overrides Langium's default `addCodeActionHandler` registration (`DocumentState.Validated`) with a bounded one gated at `DocumentState.Linked` — the same state `addHoverHandler` uses. A named `CODE_ACTION_BUDGET_MS = 5000` races the state wait; on expiry it resolves `null` promptly and abandons the wait without ever re-awaiting or rejecting on it later (the wait's own promise is reshaped into a never-rejecting one *before* the race, so an eventual rejection can never surface as an unhandled rejection). Every failure path — absent document, rejected wait, throwing provider — also resolves `null` rather than propagating. Registered in `main.ts` immediately after `startLanguageServer(shared)`, mirroring the file's own documented post-start override pattern for `onDidChangeConfiguration`.
- Rebuilt and reinstalled the VS Code extension (confirming, before building, that the tree already carries 88-10's and 88-11's source commits — `git log` showed both directly), then added a **cold-ordering codeAction probe** to `installed-extension-e2e.test.ts`: workspace opened at the repository root (matching the tester's actual IntelliJ project shape), `publishDiagnostics` listener registered before `didOpen`, `codeAction` issued immediately after `didOpen` with LSP4IJ's exact params (empty `context.diagnostics`, `triggerKind: 2`). **Measured 7ms, with diagnostics not yet arrived** — down from the pre-fix 56016ms hang the debug session measured in the same ordering against the same fixture. The pre-existing latency test was retained and retitled to name its WARM ordering (`codeAction` issued only after diagnostics arrive), since it never reproduced the Alt+Enter ordering in the first place.
- **`SetoptsInCodeActionAvailability`** (plain-Java, no IntelliJ import) plus **`BbjComposeSetoptsInCodeAction`**: a second editor-context-menu entry point into the IntelliJ tri-state composer, available on the same four extensions `BbjFileType` registers (bbj/bbjt/src/bbx), absent on the resolved config file. `actionPerformed` calls `ComposerLauncher.launch(project, editor, Kind.SETOPTS_IN_CODE)` — byte-for-byte the same call the lightbulb intention makes — so the two entry points cannot drift. Registered in `plugin.xml` as `bbj.composeSetoptsInCode` (matching the existing VS Code command id) in the Editor Popup Menu, immediately after the config.bbx composer entry, with no keyboard shortcut. The lightbulb intention and its own registration are byte-identical to `HEAD` before this plan.

## Task Commits

Each task was committed atomically (Task 1 followed the plan's RED/GREEN TDD split):

1. **Task 1 (RED): failing test for the bounded code-action handler** - `edaea951` (test)
2. **Task 1 (GREEN): bounded code-action handler implementation + main.ts wiring** - `732e0d01` (feat)
3. **Task 2: cold-ordering codeAction probe against the rebuilt/reinstalled bundle** - `38878994` (test)
4. **Task 3: second, non-intention IntelliJ composer entry point** - `a09e79f7` (feat)
5. **Register-check fixup: scrub an internal gap id from the new plugin.xml comment** - `c929fc66` (docs)

_No separate plan-metadata commit — this repo is the main working tree in this session (worktree isolation auto-degraded), so this SUMMARY, STATE.md, and ROADMAP.md are committed together below._

## Files Created/Modified

- `bbj-vscode/src/language/bbj-code-action-handler.ts` - New: bounded `textDocument/codeAction` handler + registration
- `bbj-vscode/src/language/main.ts` - Registers the bounded handler immediately after `startLanguageServer(shared)`
- `bbj-vscode/test/bbj-code-action-handler.test.ts` - New: 9 unit tests covering all six behaviours
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - New cold-ordering probe describe block; existing latency test retitled WARM
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailability.java` - New: pure availability decision seam
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.java` - New: the context-menu action
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - New `bbj.composeSetoptsInCode` action registration
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailabilityTest.java` - New: plain JUnit table
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java` - New: source guard

## Decisions Made

See `key-decisions` in frontmatter — summarized: the 5000ms budget value and its rationale, the `DocumentState.Linked` gate choice (matching hover), the "reshape-before-race" technique that makes an abandoned wait safe to abandon, the repo-root workspace shape for the cold probe (the actual reproduction shape), the exact four-extension availability list (mirroring `BbjFileType`), and the shared `bbj.composeSetoptsInCode` id across both hosts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Register-check miss] Internal gap id left in a newly-added plugin.xml comment**
- **Found during:** Post-Task-3 final register check (re-run across the whole plan diff, not just per-task)
- **Issue:** The new `bbj.composeSetoptsInCode` action's registration comment in `plugin.xml` named the internal gap id `G-88-2`, missed during the per-task register-check pass that scrubbed the same reference from the Java source/test files added in the same task.
- **Fix:** Reworded the comment to keep the `#475` issue reference (explicitly permitted) and drop the internal gap id, with no other change.
- **Files modified:** `bbj-intellij/src/main/resources/META-INF/plugin.xml`
- **Verification:** Whole IntelliJ suite re-run (`./gradlew test`, 0 failures); final `git diff` register check across the entire plan's diff returns no matches.
- **Committed in:** `c929fc66`

---

**Total deviations:** 1 auto-fixed (Rule 1 — a register-check miss caught by re-running the check at plan close rather than only per-task)
**Impact on plan:** Comment-only fix; no behavior, test, or registration semantics changed. No scope creep.

## Issues Encountered

- The `~/.ext-test/extensions/extensions.json` record for this install carries no `installedTimestamp` field this run (unlike 88-08's recorded install, which had one) — the install mechanism/timing in this environment did not populate it. Used the installed bundle directory's own `package.json` mtime (`2026-09-11T10:35:53Z`) as the install-identity proxy instead, and additionally verified directly that `out/language/main.cjs` contains both `registerBoundedCodeActionHandler`/`CODE_ACTION_BUDGET_MS` (Task 1's symbols) and `bbjHexLiteral`/`parseHexLiteral` (88-10/88-11's symbols) before running the probe — a stronger proof of bundle completeness than a timestamp alone would have given.

## User Setup Required

None - no external service configuration required. The ext-test rig (`~/.ext-test/extensions`, `bbj-ext-install`) was already provisioned in this devcontainer.

## Evidence: cold vs. warm codeAction latency

| Ordering | Workspace | Diagnostics arrived first? | Elapsed | Budget |
|---|---|---|---|---|
| WARM (existing test, retitled) | `rootUri: null` | yes (awaited) | 215ms | 15000ms |
| **COLD (new, this plan)** | repository root | **no** | **7ms** | 20000ms |
| Pre-fix live probe (debug session, `.planning/debug/g-88-2-docker-pull-hang.md`, 2026-09-11T09:55:00Z) | repository root | — | 56016ms | — |

The cold probe resolving in 7ms with diagnostics not yet arrived directly confirms the fix: `codeAction` is no longer waiting for `DocumentState.Validated` (which depends on full workspace/Java-classpath resolution and was what produced the 56-second hang) — it now settles on the same `DocumentState.Linked` gate hover already answers quickly on.

**Reinstalled extension:** `basis-intl.bbj-lang`, version `0.12.28` (install directory `package.json` mtime `2026-09-11T10:35:53Z`; `extensions.json` carried no `installedTimestamp` field this run — see Issues Encountered).

## Next Phase Readiness

- Both server-side halves of G-88-2's root cause are now fixed: the timeout-free wait is bounded, and the document-state gate no longer requires a strictly later state than hover.
- The IntelliJ composer now has a second reachability path (editor context menu) that does not pass through IntelliJ's shared, single-modal intention search at all — so a future slow intention from any plugin can degrade Alt+Enter without making the composer unreachable.
- Plan 88-13 owns: the actual rebuild + install this round performs before its own live checks, and the live IntelliJ Alt+Enter + context-menu retest that is the only thing that can flip G-88-2 to `resolved`.
- No blockers for 88-13 from this plan's side — the lightbulb intention, `BBjCodeActionProvider`, and every composer dialog are unchanged, matching this plan's explicit scope guard.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-11*

## Self-Check: PASSED

- FOUND: `bbj-vscode/src/language/bbj-code-action-handler.ts`
- FOUND: `bbj-vscode/test/bbj-code-action-handler.test.ts`
- FOUND: `bbj-vscode/src/language/main.ts`
- FOUND: `bbj-vscode/test/functional/installed-extension-e2e.test.ts`
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailability.java`
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailabilityTest.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java`
- FOUND: `bbj-intellij/src/main/resources/META-INF/plugin.xml`
- FOUND commit: `edaea951`
- FOUND commit: `732e0d01`
- FOUND commit: `38878994`
- FOUND commit: `a09e79f7`
- FOUND commit: `c929fc66`
