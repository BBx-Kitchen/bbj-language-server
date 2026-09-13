---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 16
subsystem: composer
tags: [cvs, composer, e2e, installed-bundle, qa-checklist, gap-closure]

# Dependency graph
requires:
  - phase: 89-14
    provides: "the incomplete decode outcome on CvsDecodeCallResult (VS Code half)"
  - phase: 89-15
    provides: "CvsComposeMode/COMPLETE_CALL routing (IntelliJ half of the same wire contract)"
provides:
  - "an installed-bundle e2e assertion that the rebuilt VS Code server decodes an unfinished CVS() call as incomplete"
  - "a byte-identical rebuilt IntelliJ zip (sha256-matched main.cjs) proving the same server ships to both IDEs"
  - "QA/FULL-TEST-CHECKLIST.md step 5 on VS Code row 19 and IntelliJ row 25, reproducing UAT test 3's reported flow with explicit no-nesting expectations"
  - "a pending todo recording the analogous MSGBOX compose-new nesting defect, routed to Phase 90"
  - "two end-of-phase human checks staging the UAT test 3 re-run against artifacts rebuilt from the final tree"
affects: []

# Actuals (#2632)
actuals:
  tokens: 3327
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Installed-bundle decode proof: the e2e test builds request lines from literal strings (no fixture change needed) and asserts the exact incomplete-outcome shape (found/editable/incomplete/edit/initial/reason) against the server spawned from the reinstalled extension's own out/language/main.cjs"

key-files:
  created:
    - .planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md
  modified:
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "Task 2's step 5 text folds the plan's three sub-actions per row into one numbered step (semicolon-joined), matching the existing table's one-action-per-numbered-step convention while still covering all three flows (lightbulb, context menu, and — VS Code only — the stale-edit refusal) the plan specified for that single appended step."
  - "The MSGBOX sibling nesting defect is recorded as a todo, not fixed here — per gap decision 7, it needs its own design (a guarded replace + MSGBOX's own replace/sameMsgbox/banner semantics) and belongs with Phase 90's composer-robustness work, not copied from the CVS fix."

requirements-completed: [DISC-03]

coverage:
  - id: D1
    description: "The rebuilt, reinstalled VS Code bundle's language server decodes `a$ = CVS(` at character 9 as found/not-editable/incomplete with span 5..9, empty prefill and no reason, and decodes `a$ = CVS(name$)` as incomplete with the string argument preserved — proven over IPC against the installed extension, not the source tree's unit tests alone"
    requirement: DISC-03
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#bbj/composer/cvs/decodeCall on an unfinished call returns the incomplete outcome with the call span"
        status: pass
    human_judgment: false
  - id: D2
    description: "The IntelliJ plugin zip rebuilt after both code plans carries a language-server/main.cjs entry that is byte-identical (sha256-matched) to the freshly built bbj-vscode/out/language/main.cjs, so both IDEs ship the same fix"
    verification:
      - kind: other
        ref: "sha256sum match between bbj-vscode/out/language/main.cjs and the zip's bbj-intellij/lib/language-server/main.cjs entry"
        status: pass
    human_judgment: false
  - id: D3
    description: "QA/FULL-TEST-CHECKLIST.md gains exactly one step 5 on IntelliJ row 25 and VS Code row 19, each with an explicit no-nesting expected result, and no other row changed"
    requirement: DISC-03
    verification:
      - kind: other
        ref: "git diff -- QA/FULL-TEST-CHECKLIST.md (rows 19, 25 only; grep 'Complete CVS() call' → 2 matches)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The MSGBOX compose-new nesting defect is recorded as a pending todo naming Phase 90, not fixed in Phase 89"
    verification:
      - kind: other
        ref: ".planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md (exists, five front-matter keys, both sections, names Phase 90)"
        status: pass
    human_judgment: false
  - id: D5
    description: "In IntelliJ, re-running UAT test 3 against a plugin zip rebuilt from the final tree opens the CVS() composer at every entry point, including typing CVS( then Alt+Enter, with no error notice; applying leaves one complete CVS() call; the VS Code lightbulb equivalent behaves the same"
    requirement: DISC-03
    verification: []
    human_judgment: true
    rationale: "The Alt+Enter intention popup, the modal dialog's layout, the VS Code lightbulb menu, the webview panel, and a live edit made beside the non-modal panel all need a running IDE this devcontainer cannot drive headlessly. Both human checks are staged verbatim below for the end-of-phase UAT harvest."

duration: 13min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 16: Installed-Bundle Proof, QA Checklist Steps, MSGBOX Follow-Up Summary

**Proves the reinstalled VS Code bundle and the rebuilt, sha256-matched IntelliJ zip both decode an unfinished `CVS(` call as the new `incomplete` outcome, adds the reproduction steps to the QA checklist in both IDEs, files the MSGBOX sibling defect as a Phase 90 todo, and stages the human re-run of UAT test 3 for end-of-phase harvest.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-12T14:36:31Z (immediately after 89-15's final commit)
- **Completed:** 2026-09-12T14:48:39Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Added `bbj/composer/cvs/decodeCall on an unfinished call returns the incomplete outcome with the call span` to the `new decode payloads on the installed bundle` describe in `installed-extension-e2e.test.ts`. It sends two requests built from literal line strings (no fixture change): `{ line: 'a$ = CVS(', character: 9 }` must return `found: true`, `editable: false`, `incomplete: true`, `edit: { callStart: 5, callEnd: 9 }`, `initial.str` empty, `initial.bits` empty, and `reason` undefined; `{ line: 'a$ = CVS(name$)' }` must return `incomplete: true` with `initial.str === 'name$'`.
- Rebuilt and reinstalled the VS Code extension (`npm run build` → `bbj-ext-install`) and ran the e2e file against the reinstalled bundle: 31 passed, 1 skipped (the fallback "needs bbj-ext-install" test, since the install is present) — including the existing `1+4` editable assertion and the two new incomplete-outcome requests.
- Rebuilt the IntelliJ plugin (`./gradlew buildPlugin --offline`) and confirmed via `unzip -l` that `bbj-intellij/lib/language-server/main.cjs` is present with a fresh timestamp; `sha256sum` confirms it is byte-identical to the freshly built `bbj-vscode/out/language/main.cjs` (`e08c3f8c…`).
- Whole-suite vitest gate re-run clean: 1702 passed, 29 skipped, 0 failed (`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`) — one more pass than the pre-plan baseline (1701), matching the one new test added, no regressions.
- Appended a step 5 to QA/FULL-TEST-CHECKLIST.md row 19 (VS Code) and row 25 (IntelliJ), each reproducing the exact flow the tester reported (typing `CVS(` then invoking the lightbulb/Alt+Enter/context menu), with explicit no-nesting expected results — including, on the VS Code row only, the stale-edit refusal when the line changes while the panel is open. No other row was touched (confirmed by `git diff`).
- Created `.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md`, recording the analogous MSGBOX( unfinished-call nesting defect found during diagnosis, routed to Phase 90 (Composer Robustness) and deliberately left unfixed here.

## Task Commits

1. **Task 1 (`type="tracer"`): Prove the rebuilt, installed bundles carry the unfinished-call outcome end to end** - `66dbe20d` (test)
2. **Task 2: QA steps for completing an unfinished CVS() call in both IDEs, the MSGBOX follow-up todo, and the UAT test 3 re-run as end-of-phase human checks** - `ad519814` (docs)

**Plan metadata:** captured in this SUMMARY's own commit.

_Task 1 is `type="tracer"`; auto mode is active (`workflow.auto_advance: true`, `_auto_chain_active: false`), and its own `<verify>` (build, targeted e2e run, IntelliJ `buildPlugin`, zip `main.cjs` entry check) was re-run end-to-end against the exact committed tree before Task 2 began — all four steps passed, logged `⚡ Tracer verified end-to-end — expanding`._

## Files Created/Modified

- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` — one new installed-bundle decode test for the unfinished CVS() call outcome
- `QA/FULL-TEST-CHECKLIST.md` — VS Code row 19 and IntelliJ row 25 each gain a step 5 and matching `Step 5:` expected sentence
- `.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md` — new pending todo for Phase 90

## Installed Artifact Details

- **VS Code extension:** version `0.12.28`, reinstalled to `/home/coder/.ext-test/extensions/basis-intl.bbj-lang-0.12.28`, `installedTimestamp` `1789224170484` (`2026-09-12T14:42:50.484Z`), VSIX at `/tmp/bbj-lang.vsix`.
- **IntelliJ plugin zip:** `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`; `bbj-intellij/lib/language-server/main.cjs` entry timestamp `2026-09-12 14:43`; sha256 `e08c3f8c873de74a2794c4b7d07df9ad57e81afedc02a32098d8607d7721dce9`, identical to `bbj-vscode/out/language/main.cjs`.

## Decisions Made

- Folded each row's three plan-specified sub-actions into one numbered step 5 (semicolon-joined sentences), matching the checklist's existing one-action-per-numbered-step shape while still covering every flow (lightbulb, context menu, and the VS Code stale-edit refusal) the plan named for that single appended step.
- Kept the MSGBOX sibling nesting defect as a todo rather than fixing it in-phase, per gap decision 7 — it needs a design pass (a guarded replace using MSGBOX's own `replace`/`sameMsgbox`/banner semantics), not a copy of the CVS fix, and belongs with Phase 90's composer-robustness success criteria.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Human Checks (staged for end-of-phase UAT harvest)

### Human check 1 — IntelliJ

**Test:** First rebuild both distributables from the final tree, after any code-review fixes: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, then `bbj-ext-install` (→ `/tmp/bbj-lang.vsix`); then `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew buildPlugin --console=plain -q` (→ `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`). Install the zip in IntelliJ and re-run UAT test 3 in full: Alt+Enter on a complete CVS( call, the editor context menu, and the Compose CVS() cue. Then run QA row 25 step 5: type `a$ = CVS(`, press Alt+Enter, and repeat with `b$ = CVS(name$` from the context menu.

**Expected:**
- Every entry point opens the CVS() composer; the unfinished calls open as `Complete CVS() call` with no error notice.
- The eight operations render as one flat checkbox list, with no byte-group headers and no scroll pane.
- The chars field stays visible but greyed out, with its BBj 19.0/19.10 tooltip, while no chars-customizable bit is checked.
- OK stays disabled until the first preview resolves, and while the string is empty.
- Applying leaves exactly one complete CVS() call on each line.

**Why human:** The Alt+Enter intention popup, the modal dialog's layout and the resulting document write happen in a running IntelliJ that this devcontainer cannot drive headlessly.

### Human check 2 — VS Code

**Test:** Install the rebuilt `/tmp/bbj-lang.vsix` in VS Code and run QA row 19 step 5: the lightbulb on `a$ = CVS(name$`, the editor context menu on `b$ = CVS(`, and typing on the `b$` line while its panel is open before pressing Insert.

**Expected:**
- The lightbulb offers `Complete CVS() call…`, and applying yields `a$ = CVS(name$, 5)`.
- The context menu opens the complete-the-call panel for the `b$` call rather than inserting a nested call.
- Insert after the line changed shows the "changed since the composer opened" warning and writes nothing.
- No `Compose CVS()` cue appears above either unfinished line.

**Why human:** The lightbulb menu, the webview panel, and a live edit made beside the non-modal panel all need a running VS Code.

## Next Phase Readiness

- Both halves of gap G-89-3 (DISC-03, #649) are code-complete (89-14, 89-15) and this plan proves the fix ships in both installed artifacts.
- The two human checks above are the phase's remaining evidence for G-89-3 and are staged for the end-of-phase UAT re-run, matching the pattern established by plan 89-13.
- The MSGBOX sibling nesting defect is filed and out of scope for Phase 89; Phase 90 (Composer Robustness) should pick it up alongside its own success criterion on re-resolving the MSGBOX target before an edit.

## Self-Check: PASSED

- FOUND: `bbj-vscode/test/functional/installed-extension-e2e.test.ts` (new test present, 31 passed/1 skipped against the reinstalled bundle)
- FOUND: `QA/FULL-TEST-CHECKLIST.md` (rows 19, 25 each gained exactly one step 5; no other row touched)
- FOUND: `.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md`
- FOUND: commit `66dbe20d` (`git log --oneline --all | grep 66dbe20d`)
- FOUND: commit `ad519814` (`git log --oneline --all | grep ad519814`)
- Re-ran plan `<verification>`:
  1. `npm run build` + `bbj-ext-install` + targeted vitest run — clean, 31 passed/1 skipped
  2. `./gradlew buildPlugin --offline` + `unzip -l` — zip lists a fresh `language-server/main.cjs`, sha256-identical to the source build
  3. Register-id scan over `HEAD~2..HEAD` for the test file's added lines — 0 hits
  4. `git diff HEAD~2..HEAD --stat -- bbj-vscode/src bbj-intellij/src` — empty (no source changed)
  5. Whole-suite vitest gate — 1702 passed, 29 skipped, 0 failed
- Task-level acceptance criteria re-run and passing for both tasks.
