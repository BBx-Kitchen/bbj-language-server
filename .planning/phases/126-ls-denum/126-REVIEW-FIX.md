---
phase: 126-ls-denum
fixed_at: 2026-10-02T16:21:00Z
review_path: /home/coder/repos/bbj-language-server/.planning/phases/126-ls-denum/126-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 126: Code Review Fix Report

**Fixed at:** 2026-10-02
**Source review:** /home/coder/repos/bbj-language-server/.planning/phases/126-ls-denum/126-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: A hung `workspace/applyEdit` holds the per-document claim forever

**Files modified:** `bbj-vscode/src/language/bbj-notifications.ts`, `bbj-vscode/test/bbj-denum-service.test.ts`
**Commit:** 33d017a8
**Applied fix:** `applyDocumentEdit` now wraps the request in a `withDeadline` helper and resolves `false` after `APPLY_EDIT_TIMEOUT_MS` (30 s, exported) or on rejection, clearing its timer once the request settles. The run therefore ends as `not-applied` and the claim is released. New test: an `applyEdit` that never settles, fake timers, asserts the `not-applied` result and Warning, then that a second run is not `in-progress` and denumbers.
**Status note:** timing/logic change, flagged "fixed: requires human verification" (the 30 s value is my choice; the review gave it as an example).

### WR-02: A run that reports diagnostics but yields no edit drops them silently

**Files modified:** `bbj-vscode/src/language/bbj-denum-service.ts`, `bbj-vscode/test/bbj-denum-outcomes.test.ts`
**Commit:** a470ee97
**Applied fix:** The no-edit success branch now goes through `presentSuccess`, so the diagnostics list and the counts message with Show are sent as on the applied path; `applied` stays `false`. Two new tests: no edit with diagnostics (list sent, Warning with counts and Show, no applyEdit) and no edit without diagnostics (plain "Denumbered.").
**Status note:** logic change, flagged "fixed: requires human verification".

### IN-01: Combined run on an unnumbered file reports "Nothing to denumber" although it reformatted

**Files modified:** `bbj-vscode/src/language/bbj-denum-service.ts`, `bbj-vscode/test/bbj-denum-offer.test.ts`
**Commit:** 73b08e6c
**Applied fix:** Added exported `DENUM_NOT_NUMBERED_FORMATTED_MESSAGE` ('This file has no line numbers. It was formatted.') used for the applied-edit case of a combined run, in both the Information message and the result. `DENUM_NOTHING_TO_DO_MESSAGE` is kept for the no-edit case. The existing offer test that asserted the old text now asserts the new one. Diagnostics on that answer are still ignored, as before.

### IN-02: `flatten` only handles CR and LF

**Files modified:** `bbj-vscode/src/denum-diagnostics-output.ts`, `bbj-vscode/test/denum-diagnostics-output.test.ts`
**Commit:** 3096966e
**Applied fix:** `flatten` now replaces every `\p{Cc}` character (C0, DEL, C1) plus U+2028 and U+2029 with one space; header doc updated. New test covers separators and controls in the message, the original line number and the uri.

### IN-03: Duplicated "run only if the user picked X" logic

**Files modified:** `bbj-vscode/src/language/bbj-denum-service.ts`
**Commit:** a9a26863
**Applied fix:** `runOnPick` now takes the list of accepted titles and an `onPick(title)` callback; the two single-button senders pass `[actionTitle]` and `warnWithActions` uses it directly. Behaviour unchanged; covered by the existing offer and outcome suites.

### IN-04: Handler mixes the module-level channel with the injected one

**Files modified:** `bbj-vscode/src/extension.ts`
**Commit:** 309373c1
**Applied fix:** The denumber diagnostics handler writes through the injected `outputChannel.appendLine`, wrapped in the same try/catch, so the list is written to and revealed on the same channel. No new test (the existing activation tests already assert the lines on the channel).

## Verification

Ran in the main checkout `/home/coder/repos/bbj-language-server` (not an isolated worktree, see below).

- `npx vitest run` on bbj-denum-service, bbj-denum-outcomes, bbj-denum-offer, denum-command, denum-diagnostics-output, extension-activation, activation-command-coverage, bbj-format-notices: 8 files, 245 tests, all passed.
- `npm run lint` (eslint, `--max-warnings 0`): clean.
- `npm run typecheck:test`: clean.
- Register check on added lines of `a5830d18..HEAD` in `bbj-vscode/src` and `bbj-vscode/test` (finding, decision, plan and pitfall ids): no hits. Finding ids appear only in commit messages.
- The live-peer functional test (`test/functional/program-live.test.ts`) was not run (needs a live interop peer). Its unnumbered-buffer assertion uses the plain run, which still returns `DENUM_NOTHING_TO_DO_MESSAGE`, so IN-01 does not affect it.

**Deviation:** `workflow.use_worktrees` is true, but the orchestrator's instructions directed edits, commits and test runs at absolute paths in the main checkout (vitest needs `bbj-vscode/node_modules`, which an isolated worktree lacks). I therefore edited and committed directly on `gsd/v4.9-bbj-ls-denum-format` and created no worktree, temp branch or recovery sentinel. The working tree was clean apart from the untracked `.planning/milestone.lock`, which I did not touch.

---

_Fixed: 2026-10-02_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
