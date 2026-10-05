---
phase: 126-ls-denum
reviewed: 2026-10-03T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - bbj-vscode/src/denum-diagnostics-output.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-format-service.ts
  - bbj-vscode/src/language/denum-notifications.ts
  - bbj-vscode/test/activation-command-coverage.test.ts
  - bbj-vscode/test/bbj-denum-offer.test.ts
  - bbj-vscode/test/denum-diagnostics-output.test.ts
  - bbj-vscode/test/extension-activation.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 126: Code Review Report (gap-closure re-review)

**Reviewed:** 2026-10-03
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

This review covers the gap-closure diff only (`git diff 0f953dd9..HEAD` over the eight files, plans 126-06 and 126-07). The earlier whole-phase review is in git history; it was already fixed per 126-REVIEW-FIX.md.

The change set has two parts. In `bbj-format-service.ts` the line-number offer now bypasses the notice ledger and is raised on every format request. In `denum-diagnostics-output.ts` and `extension.ts` the denumber list is now also placed as problems in a `bbj-denum` diagnostic collection. Show now opens the Problems view, and a content change or a close clears the problems.

The trust boundary holds. The payload uri only selects an already-open BBj document by string comparison. Problems are keyed by that document's own `Uri`, and lines are clamped to `lineCount`. Nothing in a payload becomes a command, a link or a path. Both consumers go through the same `validEntry`, so the log copy and the problems cannot drift apart. The service-side line semantics ("one-based line in the result's own text") match the client-side `line - 1` mapping, and the server sends the list only after `applyEdit` has resolved, so the denumber edit does not clear its own problems. I found no critical defects. Two behavioural warnings and four info items follow.

## Warnings

### WR-01: Show opens an empty Problems view once the user has edited the document, and the list is then unreachable

**File:** `bbj-vscode/src/extension.ts:694-700` (clearing at 709-720)
**Issue:** The "Show" button is on a persistent notification, but the problems it points at are deleted by any content change (`onDidChangeTextDocument` with `contentChanges.length > 0`) or by closing the document. The notification is easy to leave unanswered while the user edits the freshly denumbered file. Clicking Show afterwards runs `workbench.actions.view.problems`, which opens a Problems view with no denumber entries. The log copy in the 'BBj' channel still holds the list, but the reveal handler no longer shows that channel, so the one remaining record is not reachable from Show. Before 126-07, Show revealed the channel and always worked. The user sees a "Show" that shows nothing.
**Fix:** When the collection holds no entries at reveal time, fall back to the channel that still holds the log copy.
```ts
client.onNotification(SHOW_DENUM_DIAGNOSTICS_METHOD, () => {
    let placed = false;
    collection?.forEach(() => { placed = true; });
    if (placed) {
        void vscode.commands.executeCommand('workbench.actions.view.problems', { preserveFocus: true });
    } else {
        outputChannel.show(true);
    }
})
```
Add a test for "problems cleared, then Show reveals the channel".

### WR-02: Problems are placed by line number with no binding to the text version they describe

**File:** `bbj-vscode/src/extension.ts:652-679` (`placeProblems`); payload `bbj-vscode/src/language/denum-notifications.ts:34-51`
**Issue:** The payload carries a uri and lines but no document version. The server checks the version only before it applies the edit. Any keystroke that reaches the client between the edit being applied and the notification being handled lands before `placeProblems`. The `onDidChangeTextDocument` clear has already run on an empty collection, so it does nothing, and the problems are then placed on lines of text that have already moved. They stay attached to the wrong lines until the next edit or close. The window is small, but the client cannot detect the case.
**Fix:** Carry the version the list was computed for (the version after the applied edit, or the live version when no edit was needed). In `placeProblems`, drop the placement (log copy only) when `document.version` differs. If threading the version is too invasive, record the document version in the `applyEdit` completion path and compare it there.

## Info

### IN-01: Uri matching is a silent no-op on any string mismatch

**File:** `bbj-vscode/src/extension.ts:654-656`
**Issue:** `candidate.uri.toString() === uri` assumes the server's uri string is byte-identical to VS Code's `toString()` (the doc comment states this is true for the language client's default conversion). If a server-side normalisation ever differs, for example Windows drive-letter casing or encoding, no problems appear and nothing is logged. The tests cover only the not-open case.
**Fix:** Compare after normalising the payload uri: `vscode.Uri.parse(uri).toString()`. Parsing is safe here because the result is only compared, never opened. Alternatively, log one debug line on a miss.

### IN-02: Silent `catch {}` around `placeProblems` and the offer hides programmer errors

**File:** `bbj-vscode/src/extension.ts:692-696`, `bbj-vscode/src/language/bbj-format-service.ts:340-342`
**Issue:** Both catches are empty. `BBjDenumService.offer` already wraps its own body in try/catch with a debug log (`bbj-denum-service.ts:254-269`), so the `try` in `offerDenum` is redundant. In the client, a bug in `placeProblems`, such as a wrong mock-only API, would fail invisibly in production because nothing reaches the output channel. Swallowing is right for the user; a one-line debug trace is missing.
**Fix:** Log a fixed token in each catch, for example `outputChannel.debug('denumber problems not placed')`. Never log payload text. Drop the redundant try in `offerDenum`, or keep it and log.

### IN-03: Problems are capped at 500 while the log copy and the summary count are not

**File:** `bbj-vscode/src/denum-diagnostics-output.ts:12-13, 86-88`
**Issue:** `MAX_DENUM_PROBLEMS` truncates silently. The notification text ("N diagnostics") and the log block use the full list, so the user can see 800 in the message and 500 in Problems with no explanation. The log block (`formatDenumDiagnosticsBlock`) has no bound at all, so it relies on the server's bound.
**Fix:** Either append a final problem such as "N more not shown, see the BBj output" when the cap is hit, or apply the same cap to the block and add a trailing line. Document the choice.

### IN-04: Duplicated uri extraction

**File:** `bbj-vscode/src/denum-diagnostics-output.ts:51, 67-70`
**Issue:** `formatDenumDiagnosticsBlock` still inlines `typeof payload.uri === 'string' ? payload.uri : undefined`, while the new `denumPayloadUri` does the same. They are two copies of one trust-boundary check.
**Fix:** Call `denumPayloadUri(params)` from `formatDenumDiagnosticsBlock`.

---

_Reviewed: 2026-10-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
