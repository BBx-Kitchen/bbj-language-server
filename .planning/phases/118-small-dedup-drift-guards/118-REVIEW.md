---
phase: 118-small-dedup-drift-guards
reviewed: 2026-09-28T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - bbj-vscode/src/language/bbj-inlay-hint-provider.ts
  - bbj-vscode/src/language/bbj-signature-help-provider.ts
  - bbj-vscode/src/language/lib/events.bbl
  - bbj-vscode/src/language/lib/events.ts
  - bbj-vscode/src/language/lib/functions.bbl
  - bbj-vscode/src/language/lib/functions.ts
  - bbj-vscode/src/language/lib/labels.bbl
  - bbj-vscode/src/language/lib/labels.ts
  - bbj-vscode/src/language/lib/variables.bbl
  - bbj-vscode/src/language/lib/variables.ts
  - bbj-vscode/src/language/utils.ts
  - bbj-vscode/test/bbl-catalog-drift.test.ts
  - bbj-vscode/test/builtin-library-members.test.ts
  - bbj-vscode/test/compiler-options-package-json-drift.test.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 118: Code Review Report

**Reviewed:** 2026-09-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found (info only)

## Summary

This phase does two things: (1) extracts the duplicated `getFunctionReference` helper out of `BBjInlayHintProvider` and `BBjSignatureHelpProvider` into a single exported function in `utils.ts`, updating both call sites and dropping now-unused imports; and (2) adds two new drift-guard tests (`bbl-catalog-drift.test.ts`, `compiler-options-package-json-drift.test.ts`) plus a cleanup of a stale duplicate-entries comment in `builtin-library-members.test.ts`, paired with hand-edits to the `lib/*.bbl` mirror files (`events.bbl`, `functions.bbl`, `labels.bbl`, `variables.bbl`) and their `.ts` siblings to make them byte-identical.

Verified the refactor: `getFunctionReference` was moved verbatim (identical branch logic on `isSymbolRef`/`isMemberCall`), both former call sites now import and call the shared function, unused imports (`Reference`, `MethodCall`, `NamedElement`, `isMemberCall`, `isSymbolRef`) were correctly dropped from both provider files, and no subclasses of either provider exist that could have relied on the removed `protected` methods. ESLint is clean on all three touched TS source files.

Verified the `.bbl`/`.ts` sync fixes: `functions.bbl` had stray `\`` (backslash-escaped backtick) sequences left over from copy-pasting the `.ts` template-literal source — these are gone now, and the physical file matches the evaluated string value character-for-character (confirmed no `\`` sequences remain via grep). `events.bbl` previously declared `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` twice (a genuine pre-existing duplicate); the fix merges the two doc comments ("Window Mouse Enter / Mouse Enter Event") and removes the duplicate block, matching `events.ts`, which never had the duplicate.

Ran the full set of directly affected tests locally (`bbl-catalog-drift.test.ts`, `builtin-library-members.test.ts`, `compiler-options-package-json-drift.test.ts`, `inlay-hints.test.ts`, `inlay-hints-javadoc.test.ts`, `overload-selector.test.ts`, `functional/lsp-features.test.ts`): 100/100 passing. The new drift-guard tests are well-constructed (not tautological) — they read the real `package.json` and the real `.bbl` files off disk and compare against the evaluated TS exports, with a documented, reasoned allow-list (`NOT_BBJCPL_FLAGS`) for the one setting that legitimately isn't a bbjcpl flag.

No security, correctness, or data-loss issues found. Only two cosmetic Info-level nits below.

## Info

### IN-01: `utils.ts` has no trailing newline

**File:** `bbj-vscode/src/language/utils.ts:32`
**Issue:** The file ends with `}` and no trailing newline (confirmed via `od -c`: `...e d ; \n }` with no final `\n`). The sibling `lib/*.ts` files touched in this same phase (`events.ts`, `functions.ts`, `labels.ts`, `variables.ts`) were all fixed to end with a trailing newline as part of this phase's cleanup, but `utils.ts` — which also gained new content in this diff — was not. ESLint's current config doesn't flag it, so it's cosmetic only.
**Fix:** Add a trailing newline at end of file for consistency with the rest of the phase's cleanup.

### IN-02: Duplicate-mouse-event fix only touched the never-read `.bbl` mirror path, not a runtime symptom

**File:** `bbj-vscode/src/language/lib/events.bbl:54-63` (pre-fix), `bbj-vscode/src/language/lib/events.ts` (already correct)
**Issue:** Not a bug introduced by this phase — flagging for completeness since it's the kind of thing that's easy to lose track of. The duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` `eventtype` declarations lived only in the physical `events.bbl` file, which `builtin-library-members.test.ts`'s own comment confirms is "never read by any production code path" — so this was purely a stale-mirror issue with no runtime effect, correctly scoped as such by the fix and its updated comment.
**Fix:** None needed — already fixed correctly in this phase. Noted only so a future reviewer doesn't mistake the old comment history (visible in `git log`) for an indication of a live duplicate-registration bug in the language server itself.

---

_Reviewed: 2026-09-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
