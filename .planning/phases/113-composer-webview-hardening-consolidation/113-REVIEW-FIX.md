---
phase: 113-composer-webview-hardening-consolidation
fixed_at: 2026-09-27T14:09:28Z
review_path: .planning/phases/113-composer-webview-hardening-consolidation/113-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 113: Code Review Fix Report

**Fixed at:** 2026-09-27T14:09:28Z
**Source review:** .planning/phases/113-composer-webview-hardening-consolidation/113-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

**Verification:** All fixes were applied and verified inside an isolated git worktree
(`.claude/worktrees/rf-113-*`, since removed) with `bbj-vscode/node_modules`,
the repo-root `node_modules`, and `bbj-vscode/src/language/generated` symlinked in
(read-only, non-destructive) from the main checkout so `npx vitest run` and
`npx tsc --noEmit` could execute without a full `npm install`/`langium:generate` in the
worktree. `npx tsc --noEmit -p .` and the targeted vitest runs below are reproducible
from the main checkout at `/home/coder/repos/bbj-language-server/bbj-vscode` after this
report's commits fast-forward onto `gsd/v4.7-audit-hygiene-burndown`.

## Fixed Issues

### WR-01: `setopts-composer-webview.ts`'s message guard validates array-of-strings but not each entry's shape

**Files modified:** `bbj-vscode/src/setopts-composer-webview.ts`, `bbj-vscode/test/composer-webview-message-shape.test.ts`
**Commit:** 1f586f9c
**Applied fix:** Added a `BIT_ID_PATTERN = /^\d+:\d+$/` check applied via `.every(...)` to
`isSetOptsSelection`'s `checked` field, matching the sibling `setopts-tristate-webview.ts`
guard's per-field rigor, so a malformed `checked` entry (e.g. `"abc"`, `"1"`, `"1:2:3"`) is
now rejected by the guard instead of silently parsing to `{ byte: NaN, mask: undefined }` in
`toSelection`. Added a `'checked holds a malformed "byte:mask" entry'` case to the existing
malformed-message battery in `composer-webview-message-shape.test.ts`'s SETOPTS config.bbx
guard `describe` block.
**Verification:** `npx vitest run test/composer-webview-message-shape.test.ts
test/setopts-composer-ui.test.ts` — 93 passed (2 files). `npx tsc --noEmit -p .` — no errors
in the modified file.

### WR-02: `findCalls`'s two boundary modes are exercised only by hand-picked fixtures, not a shared property test across every real caller

**Files modified:** `bbj-vscode/test/composer-call-scanner.test.ts`
**Commit:** 5bd760f0
**Applied fix:** Extended the existing "per-composer boundary difference survives the
consolidation" `describe` block with a new test asserting `findAddWindowCalls` and
`findAddChildWindowCalls` both keep the looser (non-`notAfterIdentifierOrDot`) matching —
mirroring the assertion style already used for `findMsgboxCalls`/`findCvsCalls` — so an
accidental flip of either composer's `findCalls` options argument now fails a test instead of
only changing runtime behavior silently. Kept the change minimal (test-only; no production
code or caller signatures touched).
**Verification:** `npx vitest run test/composer-call-scanner.test.ts` — 13 passed. `npx tsc
--noEmit -p .` — no errors in the modified file.

### IN-01: Misleading "apply right-to-left" comment carried into the VS Code addChildWindow edit path

**Files modified:** `bbj-vscode/src/addchildwindow-composer-webview.ts`
**Commit:** d7c036b1
**Applied fix:** Reworded `applyEdit`'s comment to state the actual guarantee — a
`vscode.WorkspaceEdit`'s `replace`/`insert` calls are computed against the document's
original pre-edit offsets and applied together, so call order between the flags and
event-mask edits has no effect on correctness — and pointed out where the "apply in
descending-offset order" rationale genuinely does apply (the IntelliJ
`ComposerLauncher.applyHexEdit` counterpart, which mutates one shared `Document` via
sequential `replaceString()` calls). Comment-only change; no functional code touched.
**Verification:** Re-read modified section (Tier 1); `npx tsc --noEmit -p .` — no errors in
the modified file; `npx vitest run test/addchildwindow-composer-ui.test.ts` — 14 passed
(regression guard, no assertions on the comment itself).

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-09-27T14:09:28Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
