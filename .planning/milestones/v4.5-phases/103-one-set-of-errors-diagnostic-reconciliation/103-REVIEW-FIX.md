---
phase: 103-one-set-of-errors-diagnostic-reconciliation
fixed_at: 2026-09-23T08:51:00Z
review_path: .planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 103: Code Review Fix Report

**Fixed at:** 2026-09-23
**Source review:** `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 3
- Fixed: 2
- Skipped: 1

**Verification environment:** All fixes were made and verified inside an isolated git worktree
(`.claude/worktrees/rf-103-...`), created per the `gsd-code-fixer` isolation protocol. The
worktree's own `bbj-vscode/node_modules` and `bbj-vscode/src/language/generated` are gitignored
and not present in a fresh worktree checkout, so both were symlinked in from the main checkout
(`/home/coder/repos/bbj-language-server/bbj-vscode/node_modules` and `.../src/language/generated`)
for the duration of the gate runs, then removed (plain `rm` on the symlink itself, never a
recursive remove) before the worktree's commits were fast-forwarded into the main checkout branch.
The gate numbers below are reproducible from the main checkout after that fast-forward, since the
symlinks pointed at the exact same `node_modules`/generated-AST content the main checkout uses.

## Fixed Issues

### CR-01: A cancelled/stale-version debounce cycle republishes diagnostics with BBj's replacement diagnostics silently stripped

**Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-vscode/test/bbj-parser-service.test.ts`
**Commit:** `52193de2`
**Applied fix:** Applied the reviewer's own suggested shape, adapted to the current code: the
`debouncedCompile()` clear-then-show step now saves the pre-strip `document.diagnostics` list
into `diagnosticsBeforeCycle` before filtering out `'BBjCPL'`/`BBJ_PARSER_SOURCE`-sourced entries.
The `cancelled`/stale-`verdict` no-op branch — which previously left `document.diagnostics` in
its stripped state and let the trailing `notifyDocumentPhase()` republish that stripped list —
now restores `diagnosticsBeforeCycle` before falling through to the republish, so a cycle that
decides "nothing changed" really does republish nothing changed.

Added a regression test in `bbj-parser-service.test.ts` (`'a BBj Parser diagnostic that replaced
a Langium parse error survives a cancelled cycle and a stale-version cycle'`) that: (1) validates
real BBj source producing a genuine Langium parse error, (2) scripts a live-parser verdict whose
own error overlaps that parse error's line — driving the *replace* path (not merely downgrade),
so a `source: 'BBj Parser'` diagnostic stands in for the dropped Langium complaint, (3) runs a
`cancelled` cycle and asserts `document.diagnostics` is unchanged, then (4) runs a stale-text-version
cycle (the document's `textDocument` is swapped to a newer version mid-request, via
`Object.defineProperty` since a real `LangiumDocument`'s `textDocument` is a getter-only accessor)
and asserts `document.diagnostics` is still unchanged. Both prior-to-fix code paths would have
dropped the `BBj Parser` diagnostic; the test fails against the pre-fix code and passes against
the fix.

### WR-02: The verdict-reconciliation branch silently falls back to a hierarchy-applied diagnostics list instead of the intended pre-hierarchy one

**Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`
**Commit:** `76f02513`
**Applied fix:** Applied the reviewer's own suggested shape: the verdict branch now names the
`recallLangiumDiagnostics(document)` result (`remembered`) and, when it is `undefined`, logs at
`debug` (via the module's existing `logger`) before falling back to
`document.diagnostics ?? []` — matching the review's exact recommendation to make the fallback
observable instead of a silent degrade. No dedicated regression test was added: the review and
the phase verifier both independently confirmed this path is dead code today (every document that
reaches `debouncedCompile()`'s verdict branch has already had `rememberLangiumDiagnostics()`
called unconditionally by `BBjDocumentValidator.validateDocument()`), so there is no way to drive
this branch without a further, out-of-scope change decoupling `shouldValidate`/
`shouldCompileWithBbjcpl` — exactly the future-change scenario the finding itself describes as
the trigger. The full targeted test suite (194 tests) was re-run after this change and remained
green, confirming the added log line has no effect on any currently reachable path.

## Skipped Issues

### WR-01: Verdict state is never cleared when a document is deleted from the workspace

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:89-95`, `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts:210-230`
**Reason:** Applying the reviewer's exact suggested fix — clearing verdict state for every uri in
`update()`'s `deleted` list — was implemented, verified with `tsc -b` (clean), and then broke 3
pre-existing regression tests in `bbj-vscode/test/bbj-document-validator.test.ts`
(`'BBjDocumentValidator: carry-over between verdicts'` describe block: `'a syntax complaint the
last verdict downgraded stays a Warning on the very next validation'`, `'...carried across a line
shift...'`, and `'a second, unseen syntax error on another line is an Error...'`).

Root cause: `langium/test`'s `validationHelper` disposes a validated test document by calling
`clearDocuments()`, which calls `DocumentBuilder.update([], [thisDocumentUri])` — the exact same
API surface, with the exact same shape, that a genuine on-disk file deletion (from the real
workspace file watcher) uses. From inside `BBjDocumentBuilder.update()` there is no way to
distinguish "the file was really deleted from disk" from "a test finished with this document and
called `dispose()`" — both arrive as a populated `deleted` array. The three broken tests
specifically exercise verdict state surviving across a `dispose()` + a fresh `validate()` call at
the *same uri* (mirroring production's documented "a document survives editor close" carry-over
contract — see `bbj-diagnostic-reconciliation.ts`'s own doc comment on why verdict state is
uri-keyed and not tied to the document object). Clearing verdict state in `update()`'s `deleted`
path wipes that state during the test's own cleanup step, before the second `validate()` call can
read it back, causing all three carry-over assertions to fail with "expected undefined to be
defined."

In real production, this conflict does not currently arise: a grep of production call sites shows
`documentBuilder.update()` is only ever called with a non-empty `deleted` array from the real
workspace file-watcher path (registered externally by Langium's connection layer), while the two
in-repo call sites (`addImportedBBjDocuments`, `java-class-reload.ts`) always pass `[]` for
`deleted`. So the fix's production semantics were sound; the conflict is specifically with the
test helper's use of the identical API for document-lifecycle cleanup. Given the finding is a
low-severity Warning (an unbounded-map-growth concern under long-running file churn, not a
functional defect) and applying it verified-broken 3 pre-existing tests that are load-bearing for
the phase's own carry-over guarantee, this finding was rolled back (`git checkout --` on the
touched file, confirmed by re-reading it and by `git diff` showing no residual changes) rather
than shipped. Recommended follow-up (not applied here, out of this fix pass's scope): a narrower
fix would need the real file-watcher path to signal genuine external deletion through a distinct
seam from `update()`'s general `deleted` parameter, since the parameter alone cannot carry that
distinction.

## Verification

**Full targeted suite** (`npx vitest run test/bbj-diagnostic-reconciliation.test.ts
test/bbj-parser-service.test.ts test/document-builder.test.ts test/bbj-document-validator.test.ts
test/cpl-integration.test.ts test/line-break-validation.test.ts`), run from the isolated worktree
with `node_modules`/`generated` symlinked in from the main checkout:

```
Test Files  6 passed (6)
     Tests  194 passed (194)
```

**TypeScript build** (`npx tsc -b`), same worktree: clean, no output, no `error TS`.

**Register check** (no phase-103 planning identifiers introduced into source/test):

```
git diff 20cbf547..HEAD -- bbj-vscode/src bbj-vscode/test | grep '^+' | grep -nE 'PSRV-0|D-[0-9][0-9]|10[0-9]-[0-9][0-9]|(CR|WR|IN)-[0-9]|T-103-'
```

No output (clean) — run against the fix branch's two new commits on top of the review-report
commit `20cbf547`.

**Commit-body closing-keyword scan** (`git log --format=%B 52193de2^..76f02513 | grep -niE
'(closes|fixes|resolves) #'`): no output (clean).

---

_Fixed: 2026-09-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
