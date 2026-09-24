---
phase: 103-one-set-of-errors-diagnostic-reconciliation
reviewed: 2026-09-23T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-parser-service.ts
  - bbj-vscode/src/language/validations/line-break-validation.ts
  - bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts
  - bbj-vscode/test/bbj-document-validator.test.ts
  - bbj-vscode/test/bbj-parser-service.test.ts
  - bbj-vscode/test/document-builder.test.ts
  - bbj-vscode/test/functional/parse-program-live.test.ts
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 103: Code Review Report

**Reviewed:** 2026-09-23
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The new pure reconciliation module (`bbj-diagnostic-reconciliation.ts`) is well-designed and
thoroughly unit-tested: `reconcileWithVerdict`, `applyVerdictCarryOver`, `downgradeSyntaxComplaint`
and the Rule 1/2/3/3b changes to `applyDiagnosticHierarchy` all correctly implement the D-04
through D-10 decisions from 103-CONTEXT.md, and the tests exercise the interesting edge cases
(colon-continuation overlap, line-shift carry-over, cap interaction, purity). The `LiveParseOutcome`
typing change to `BBjParserService.requestLiveParse()` cleanly resolves the "can't tell verdict from
failure" gap flagged in the phase's own scouting notes.

However, wiring the reconciliation into `BBjDocumentBuilder.debouncedCompile()` has one real defect:
on a `cancelled` or stale-text `verdict` outcome — exactly the case the server is expected to hit
routinely while a user is typing quickly — the debounce callback unconditionally strips
`BBj Parser`/`BBjCPL`-sourced diagnostics from `document.diagnostics` *before* it knows which branch
it will take, then republishes that stripped list even though the branch taken does nothing to
restore it. This directly undermines the phase's own D-08 "no flicker while typing" goal: any
diagnostic BBj's parser previously *replaced* a Langium complaint with disappears from the editor
for one cycle, without any test currently covering this path (every existing `cancelled` /
stale-version test uses an all-downgraded verdict, which never populates a `BBj Parser`-sourced
diagnostic in the first place, so the gap is invisible to the suite). See CR-01.

Two smaller issues round out the review: the per-document verdict-state map is never cleared when a
file is deleted from the workspace (only on editor close, latch-off, trigger-off, or connection
reset), and one defensive fallback in the verdict-reconciliation branch silently degrades to a
different (less correct) input shape instead of surfacing the deviation.

## Critical Issues

### CR-01: A cancelled/stale-version debounce cycle republishes diagnostics with BBj's replacement diagnostics silently stripped

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:296-362`
**Issue:**

`debouncedCompile()`'s callback unconditionally strips every `'BBjCPL'`- and
`BBJ_PARSER_SOURCE`-sourced diagnostic from `document.diagnostics` right at the top of the cycle
(lines 302-304), *before* it has asked the live parser anything:

```ts
document.diagnostics = (document.diagnostics ?? []).filter(
    d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE
);
```

If the outcome of this cycle is `cancelled` (the request was superseded by a newer one — "the
server's ordinary answer to fast typing" per `LiveParseOutcome`'s own doc comment) or a `verdict`
for text that has since moved on (`liveOutcome?.kind === 'verdict' && document.textDocument.version
!== versionBeforeRequest`), the branch taken is:

```ts
} else if (liveOutcome?.kind === 'verdict' || liveOutcome?.kind === 'cancelled') {
    // A verdict for text that has since moved on, or a request superseded by a
    // newer one: nothing further this cycle — no reconciliation, no state change,
    // no save-time compile.
}
```

— which does *nothing* to restore what was just stripped. Control then falls through
unconditionally to:

```ts
await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
```

which republishes `document.diagnostics` to the client exactly as it stands after the strip. Any
diagnostic that a *previous* verdict had produced by **replacing** a Langium syntax complaint (i.e.
a `BBJ_PARSER_SOURCE`-sourced entry added by `reconcileWithVerdict`'s `[...processed,
...verdictDiagnostics]`) is gone from what the client sees, with nothing put back in its place,
until the *next* debounce cycle happens to succeed. Given that a `cancelled` outcome only occurs
because a newer edit already scheduled a following cycle, this manifests as a visible flicker
(errors blinking off, then back on) during ordinary fast typing — the exact symptom D-08
("No flicker while typing... A Langium syntax complaint that the *previous* verdict downgraded stays
a warning until the next verdict") was written to prevent, except here it is BBj's own replacement
diagnostic that flickers, not a downgraded Langium one.

This path is untested: every existing `cancelled`/stale-version test
(`bbj-parser-service.test.ts`'s "a cancelled answer after an accepted verdict..." and "a verdict for
a document whose text version changed...") drives the *preceding* cycle with a scripted
`{ errors: [] }` (all-downgrade) verdict, which never adds a `BBJ_PARSER_SOURCE`-sourced diagnostic
to `document.diagnostics` in the first place — so the strip-with-no-restore has nothing to remove in
those fixtures and the bug is invisible to the suite. A fixture where the preceding cycle scripts at
least one BBj error (producing a `source: 'BBj Parser'` diagnostic via the replace path) followed by
a `cancelled` or stale-version cycle would reproduce it: `doc.diagnostics` would end up `[]` (or
missing that entry) instead of unchanged.

**Fix:** Save the pre-strip list and restore it in the no-op branch, so a cycle that decides "nothing
changed" really does republish nothing changed:

```ts
const diagnosticsBeforeCycle = document.diagnostics ?? [];
document.diagnostics = diagnosticsBeforeCycle.filter(
    d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE
);

// ...

} else if (liveOutcome?.kind === 'verdict' || liveOutcome?.kind === 'cancelled') {
    // Nothing changed this cycle — undo the clear-then-show strip above so the republish
    // below doesn't drop a previous cycle's replacement diagnostics.
    document.diagnostics = diagnosticsBeforeCycle;
}
```

## Warnings

### WR-01: Verdict state is never cleared when a document is deleted from the workspace

**File:** `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts:210-230`,
`bbj-vscode/src/language/bbj-document-builder.ts:89-95`
**Issue:** `verdictStateByUri` is a module-scoped `Map` cleared only on editor close
(`BBjDocumentValidator`'s `onDidClose` subscription), latch-off, trigger-off, or a connection-generation
change (`resetIfGenerationChanged` / `runBbjcplForDocuments`'s trigger-off branch). `grep` across
`src/language` confirms `clearVerdictState`/`clearAllVerdictStates` have no other call sites.
`BBjDocumentBuilder.update(changed, deleted, cancelToken)` receives a `deleted` URI list (line 89)
but never calls `clearVerdictState` for those URIs. A file removed from disk outside the editor (a
workspace file-watcher delete, a git checkout, an external rename) leaves its verdict-state entry in
the map for the rest of the server process's lifetime — unbounded growth keyed by every distinct
`.bbj` file path ever open-and-verdicted during a long-running session with file churn.
**Fix:** In `update()`, before or after filtering `changed`, clear verdict state for every deleted
uri:
```ts
for (const uri of deleted) {
    clearVerdictState(uri);
}
```

### WR-02: The verdict-reconciliation branch silently falls back to a hierarchy-applied diagnostics list instead of the intended pre-hierarchy one

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:326`
**Issue:**
```ts
const langiumDiagnostics = recallLangiumDiagnostics(document) ?? document.diagnostics ?? [];
```
The surrounding comment (lines 322-325) explains the reconciliation must run against the
*pre-hierarchy* Langium list specifically because the hierarchy "may already have hidden linking
diagnostics or warnings" that need the chance to reappear. `recallLangiumDiagnostics(document)`
should always be populated for any document that reaches this code (it requires an open editor
document, and `BBjDocumentValidator.validateDocument` — which calls `rememberLangiumDiagnostics`
unconditionally — always runs before this debounce fires), so the fallback is effectively dead code
today. But if it is ever reached (e.g. a future change to `shouldValidate`/`shouldCompileWithBbjcpl`
that decouples them), it silently substitutes `document.diagnostics` — which, at this point in the
callback, has already had the hierarchy applied by a previous cycle and had `'BBjCPL'`/`BBJ_PARSER_SOURCE`
entries stripped by the clear-then-show step a few lines above — producing a reconciliation result
that no longer matches the documented "pre-hierarchy" contract, with no log line or assertion
flagging the deviation.
**Fix:** Either drop the fallback and let a missing pre-hierarchy list be a hard error (surfacing a
real bug immediately instead of silently degrading), or log at `debug`/`warn` when the fallback path
is taken so the assumption's violation is observable:
```ts
const remembered = recallLangiumDiagnostics(document);
if (!remembered) {
    logger.debug(`No remembered pre-hierarchy diagnostics for ${document.uri.toString()}; reconciling against the current (possibly hierarchy-applied) list instead.`);
}
const langiumDiagnostics = remembered ?? document.diagnostics ?? [];
```

## Info

### IN-01: `validateDocument()` duplicates `applyConfiguredDiagnosticHierarchy`'s logic instead of calling it

**File:** `bbj-vscode/src/language/bbj-document-validator.ts:249`
**Issue:** This phase introduced `applyConfiguredDiagnosticHierarchy()` specifically to apply
`applyDiagnosticHierarchy` "using the module's current settings," and `bbj-document-builder.ts` uses
it consistently in the new reconciliation/`forgetVerdict` paths. `validateDocument()` in the same
file still calls the lower-level form directly with the two module-scoped variables spelled out:
```ts
return applyDiagnosticHierarchy(carriedOver, suppressCascadingEnabled, maxErrorsDisplayed);
```
This is functionally identical today, but it's a latent duplication: a future change to
`applyConfiguredDiagnosticHierarchy` (e.g. adding a log line, a metric, or an extra config knob)
would not apply here unless both call sites are remembered and updated together.
**Fix:**
```ts
return applyConfiguredDiagnosticHierarchy(carriedOver);
```

---

_Reviewed: 2026-09-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
