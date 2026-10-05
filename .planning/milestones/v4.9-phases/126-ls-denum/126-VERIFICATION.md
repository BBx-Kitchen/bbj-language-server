---
phase: 126-ls-denum
verified: 2026-10-03T08:00:00Z
status: passed
score: 8/9 must-haves verified
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 6/7
  gaps_closed:
    - "G-126-1: Format Document / Format Selection on a numbered file offer on every request (plan 126-06)"
    - "G-126-2: Show on the 'Denumbered. N error(s).' message opens the Problems view with the DENUM entries (plan 126-07)"
  gaps_remaining: []
  regressions: []
behavior_unverified_items:

  - truth: "Denumber and Format is one undoable step (SC2); a plain Denumber is also one undo step and leaves the buffer dirty"
    test: "In VS Code, open a line-numbered file, type an unsaved edit, run Format Document, click 'Denumber and Format', then press Ctrl+Z once. Repeat with 'Denumber'."
    expected: "One Ctrl+Z restores the numbered text including the unsaved edit; the tab stays dirty after the run; nothing is written to disk."
    why_human: "The server sends exactly one workspace/applyEdit with one TextDocumentEdit holding one TextEdit (tests prove this). Whether the editor groups that into a single undo entry is client behavior no hermetic test can exercise."
coincidental_reliance_items:

  - truth: "Problems placed from bbj/denumDiagnostics survive the denumber edit's own content-change event (G-126-2)"
    reason: incidental-ordering
    harden: "The client clears on any content change and the server sends the list after applyEdit resolves, but nothing in the payload binds the list to the text version it describes (review WR-02). Carry the document version in bbj/denumDiagnostics and drop placement when document.version differs."
unverified_prohibitions:

  - statement: "DENUM must never write or save the file on disk, never touch a document other than the open buffer the request names, and never apply text computed for another version of it"
    verification: judgment
    verdict: "NON-AUTHORITATIVE LLM-judge verdict: holds. unverified-prohibition - human review recommended"
    evidence: "Unchanged by the gap closures. bbj-denum-service.ts and denum-command.ts import no fs. The new client code only reads vscode.workspace.textDocuments and writes a DiagnosticCollection keyed by the open document's own Uri; the payload uri is compared as a string and never parsed, opened or turned into a command (tests: command uri, numeric uri, non-BBj document, unknown uri all place nothing)."
human_verification:

  - test: "VS Code from a VSIX built from the final tree, live BBj 26.03: line-numbered file, run Format Document twice with no edit in between, then once after an edit, then Format Selection twice"
    expected: "Every Format Document shows the Warning with 'Denumber' and 'Denumber and Format' (a repeat replaces the showing one rather than stacking); every Format Selection shows the explanation with 'Denumber' only; Format Document still returns at once and never changes the buffer. Format-on-save on a numbered file also shows the offer on every save and never blocks the save."
    why_human: "Closes UAT test 1 (G-126-1). Notification rendering, the replace-identical-notification behavior and save timing are editor behavior."
  - test: "VS Code, same VSIX: denumber a numbered file with a syntax error (Denumber and Denumber and Format), click Show on 'Denumbered. 1 error.'"
    expected: "The Problems view opens listing the entry under the file (source 'BBj Denumber', right line, message with the original line number) while the editor keeps focus; clicking Show again does not close the view. Typing one character removes the entry; closing the file removes it. The 'BBj' output still holds the block."
    why_human: "Closes UAT test 2 (G-126-2). The Problems view, preserveFocus and click-through are editor behavior; hermetic tests stop at the mocked vscode API."
  - test: "VS Code: denumber a file with an error, type a character, then click the still-open Show button"
    expected: "Decide whether an empty Problems view is acceptable. Code review WR-01 predicts it opens empty and that the log copy is then unreachable from Show."
    why_human: "Product decision on an edge case the code review flagged; see Open Review Warnings."
  - test: "VS Code: Denumber and Format a numbered file whose DENUM reports an error line, formatter reflows"
    expected: "The Problems entry sits on the line that holds the offending statement in the formatted text (bbj-ls remaps DENUM diagnostics onto the formatted text)."
    why_human: "Line remapping is a bbj-ls behavior; the client only maps line-1 and clamps. Live check against 26.03."
  - test: "IntelliJ zip from the final tree: open numbered and unnumbered BBj files"
    expected: "No formatting offer, no error balloon, idea.log has no exception naming bbj/denumDiagnostics or bbj/showDenumDiagnostics."
    why_human: "Already passed in UAT test 4 on the pre-gap-closure tree; the gap closures touched no server method, payload or IntelliJ file, so this is a regression sanity check only."
  - test: "Tokenized and protected programs"
    expected: "Not reachable from the VS Code UI until the Denumber command moves onto bbj/denum (Phase 127)."
    why_human: "Accepted in UAT test 5; recheck in Phase 127."
---

# Phase 126: LS DENUM Verification Report

**Phase Goal:** The language server can denumber a BBj program for both IDEs through a `bbj/denum` request. When a user formats a line-numbered file, the server offers DENUM instead of doing it silently, and every DENUM run ends in a clear message with its diagnostics available.
**Verified:** 2026-10-03
**Status:** human_needed
**Re-verification:** Yes, after UAT gap closure (plans 126-06 and 126-07)

## Goal Achievement

Both UAT gaps are closed in code, with wiring and tests behind them. No gaps found. The status stays `human_needed` because the editor-side behavior (undo grouping, Problems view focus, notification replacement, save timing) can only be seen in a live VS Code, and two code review warnings need a human call.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: Formatting a numbered file never denumbers automatically; Format Document offers "Denumber" / "Denumber and Format"; Format Selection explains it needs an unnumbered file | VERIFIED | `allowDenum` count in `bbj-format-service.ts` is 0 (only the combined run in `bbj-denum-service.ts` sets it). A `-33006` answer reaches `offerDenum` (format-service line 330), which returns `[]` and calls `BBjDenumService.offer(..., selection ? 'selection' : 'document')` unawaited. `bbj-denum-offer.test.ts` "never waits for the user", "never denumbers" and the selection tests pass. |
| 2 | G-126-1 (supersedes the "one deduplicated" wording of SC1): the offer is raised on every Format Document and the explanation on every Format Selection, repeats and unchanged versions included, and format-on-save gets the same | VERIFIED | `offerDenum` (lines 330-345) no longer calls `notice()`: only a debug line, a lazy `compiler?.BBjDenumService` lookup, an unawaited `offer()` and a swallowed catch. `grep "this.notice("` shows the remaining callers are other kinds (invalid-settings, mixed-numbering, environment). Tests "Format Document shows the offer on every request, edited or not" (3 warnings for 3 requests), "Format Selection shows the explanation on every request", "a save is the same request ... gets the offer again", both orderings of document and selection, two concurrent requests, and "any number of offers never pushes another notice out of the ledger" (257 offers do not evict an earlier too-large notice). All 8 targeted files re-run: 287 passed. No source or test text still says once per document and version (grep exit 1). |
| 3 | SC2a: "Denumber" replaces the open buffer (unsaved changes included) as one edit served by `bbj/denum`; the result carries DENUM's diagnostics | VERIFIED | Unchanged from the previous verification: `registerDenumRequest` wired in `main.ts`, service in DI, one `minimalLineEdit` applied through `applyDocumentEdit` with the captured version. Suites re-run green. |
| 4 | SC2b: "Denumber and Format" is one `formatProgram` call with `allowDenum` and one edit | VERIFIED | `bbj-denum-offer.test.ts` "sends one format call with the denumber permission ... and no DENUM call" and "applies the answer as one edit labelled Denumber and Format" pass. |
| 5 | SC2c: that edit is one undoable step in the editor | PRESENT_BEHAVIOR_UNVERIFIED | One `applyEdit`, one `TextDocumentEdit`, one `TextEdit` is proven. Undo grouping is editor behavior; see `behavior_unverified_items`. |
| 6 | SC3: Every DENUM run ends in one matching message (nothing to do, confirmation, tokenized pointing to Decompile, protected, typed failures) | VERIFIED | Unchanged from the previous verification; `bbj-denum-outcomes.test.ts` (test.each over every failure row, run twice shows two Warnings) re-run green. |
| 7 | SC4 / G-126-2: the diagnostics reach the user with counts and "Show"; Show opens the Problems view listing the entries (replaces the output-channel reveal target) | VERIFIED | `extension.ts:694-700`: `SHOW_DENUM_DIAGNOSTICS_METHOD` handler runs `workbench.actions.view.problems` with `{ preserveFocus: true }` and no longer calls `outputChannel.show` (grep: no `outputChannel.show` in `extension.ts`). `placeProblems` (lines 652-679) selects an open `languageId === 'bbj'` document by string-comparing `uri.toString()`, maps entries through `denumProblems(params, document.lineCount)` and sets them on a lazily created `bbj-denum` collection keyed by the document's own `Uri`; source `BBj Denumber`; severity via `denumSeverity`. The log copy still goes to the 'BBj' channel through `formatDenumDiagnosticsBlock`. Both consumers share `validEntry`. Tests: "problems for an open document" (placement, clamping, replacement, all-invalid list, non-BBj document, source/range/message/severity only), "the reveal notification with %s opens the Problems view and nothing else" asserts exactly `[['workbench.actions.view.problems', { preserveFocus: true }]]`. `denum-diagnostics-output.test.ts` covers the pure mapper. |
| 8 | G-126-2 clear rule: problems never outlive the denumbered text; a content change or close removes them, a dirty-state flip keeps them, the next list replaces them | VERIFIED | `onDidChangeTextDocument` deletes only when `event.contentChanges.length > 0`; `onDidCloseTextDocument` deletes; both pushed to `context.subscriptions`. Tests under "clearing" pass, including "an event without a content change keeps the problems" and "each document listener is registered once per activation and disposed with it". `activation-command-coverage.test.ts` pins the sequence and the subscription count. Reliance advisory below (ordering vs the server's send after `applyEdit`). |
| 9 | D-07 / plan-01 truths: stale, closed, refused, overlapping and cancelled runs never apply an edit to another version | VERIFIED | Unchanged; `execute()` (service lines 300-360) re-reads `request.current()` after the await, returns `stale` on a version mismatch, `not-applied` on a refused edit, `in-progress` through the per-document `running` set. `bbj-denum-service.test.ts` re-run green. |

**Score:** 8/9 truths verified (1 present, behavior-unverified)

Reliance advisory (does not change score or status): truth 8 holds because the server sends `bbj/denumDiagnostics` only after `workspace/applyEdit` resolves, so the client's content-change clear has already run on an empty collection. No code enforces that order on the client and the payload carries no document version. See `coincidental_reliance_items` and review WR-02.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-format-service.ts` | Ledger-free `offerDenum` | VERIFIED | Present, substantive, wired from `report()` line 312; `allowDenum` 0. |
| `bbj-vscode/src/denum-diagnostics-output.ts` | `denumPayloadUri`, `denumProblems`, `MAX_DENUM_PROBLEMS`, shared `validEntry`, no vscode import | VERIFIED | Imports only `vscode-uri`; used by `extension.ts`. |
| `bbj-vscode/src/extension.ts` | `bbj-denum` collection, Problems reveal, clear listeners | VERIFIED | Lines 640-720; `createDiagnosticCollection('bbj-denum')` created lazily and pushed to subscriptions. |
| `bbj-vscode/src/language/denum-notifications.ts` | Host contract comment | VERIFIED | Comment now allows problems on an open document; method names and DTOs unchanged. |
| Tests (4 gap-closure files) | Pin every-request rule, mapper, placement, reveal, clearing, hostile payloads | VERIFIED | 287 tests in the 8 targeted files pass. |
| Phase 126 artifacts from plans 01-05 | As in the previous verification | VERIFIED (regression check) | Targeted suites green; no change to their files in the gap-closure diff. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bbj-format-service.ts` `offerDenum` | `BBjDenumService.offer` | `compiler?.BBjDenumService`, resolved at offer time | WIRED | Line 338-339. |
| `extension.ts` list handler | `denumProblems` | `denumProblems(params, document.lineCount)` | WIRED | Line 664. |
| `extension.ts` reveal handler | Problems view | `workbench.actions.view.problems` + `preserveFocus` | WIRED | Line 699; asserted by test. |
| `extension.ts` | document change and close events | `contentChanges.length`, `onDidCloseTextDocument` | WIRED | Lines 709-720. |
| Server | client | `bbj/denumDiagnostics`, `bbj/showDenumDiagnostics` | WIRED, unchanged | `bbj-denum-service.ts` `presentSuccess` sends the list, then the message with Show. No server file in the gap-closure diff. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `bbj-denum` collection | `problems` | `params.diagnostics` from `copyDiagnostics(outcome.result)` of the live `denumProgram`/`formatProgram` answer (live peer run recorded in 126-05) | Yes | FLOWING |
| Offer notification | `offer(...)` request | `request.document.uri` and live `current()` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Gap-closure and phase suites | `npx vitest run` on `bbj-denum-offer`, `denum-diagnostics-output`, `extension-activation`, `activation-command-coverage`, `bbj-format-notices`, `bbj-denum-service`, `bbj-denum-outcomes`, `denum-command` (cwd `bbj-vscode`, `--maxWorkers=2`) | 8 files, 287 tests passed | PASS |
| Typecheck | `npx tsc --noEmit -p tsconfig.test.json` | no output | PASS |
| Lint on the 8 changed files | `npx eslint --max-warnings 0 ...` | exit 0 | PASS |
| Whole suite | Not re-run by the verifier; orchestrator reports 4345 passed, 0 failed tests, only `installed-extension-e2e` (environment) fails | Taken from the orchestrator | SKIP |

### Probe Execution

SKIPPED: no probes declared by the phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DEN-01 | 126-01, 126-05 | `bbj/denum` returns the denumbered text as one edit plus diagnostics | SATISFIED | Truths 3, 9. |
| DEN-03 | 126-03, 126-05 | Nothing-to-do, confirmation and typed failure messages | SATISFIED | Truth 6. |
| DEN-04 | 126-02, 126-03, 126-05, 126-07 | Diagnostics list with counts notification and "Show" | SATISFIED (landing place changed to the Problems view, wording drift below) | Truths 7, 8. |
| FMT-06 | 126-04, 126-05, 126-06 | Numbered file never auto-DENUMed; offer; selection explained | SATISFIED (wording drift below) | Truths 1, 2. |
| FMT-07 | 126-04, 126-05 | "Denumber and Format" in one undoable step | SATISFIED in code, undo grouping needs the hand check | Truths 4, 5. |

All five IDs appear in plan frontmatter (06 claims FMT-06, 07 claims DEN-04) and map to Phase 126 in `REQUIREMENTS.md`. No orphans. DEN-02/05/06 belong to Phase 127; DEN-07 is future and not claimed (the new collection is separate from the live parse diagnostics and is cleared on edit, as the plan says).

**Requirements wording and tracking drift (reported, not edited):**

- FMT-06 (`REQUIREMENTS.md` line 34) still says "one deduplicated message". The UAT decision behind 126-06 superseded it: the offer is raised on every format request and is deliberately outside the notice ledger. ROADMAP Phase 126 success criterion 1 (line 505) carries the same "one deduplicated message" wording.
- DEN-04 (line 47) and ROADMAP success criterion 4 (line 508) say "output list ... a 'Show' action that opens the list". Show now opens the Problems view; the 'BBj' channel keeps a log copy. The intent holds, the literal "output list" wording is stale.
- Tracking: FMT-06 is ticked Complete (line 34, traceability line 114) while FMT-07, DEN-01, DEN-03 and DEN-04 are still `[ ]` / Pending (lines 35, 44, 46, 47; 115, 121, 123, 124). The ROADMAP Phase 126 box (line ~398) is unticked. Close these when the phase completes.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | No TBD/FIXME/XXX/TODO/HACK in the changed source; no planning identifiers (D-NN, G-126, DEN-, FMT-, WR-, plan numbers) in the changed source or tests (grep exit 1 on all eight files) | - | - |

### Open Review Warnings (126-REVIEW.md, advisory)

Both are real in the code. Neither fails a must-have, since the stated truths hold in the normal flow.

- **WR-01 (Show after an edit opens an empty Problems view):** confirmed at `extension.ts:698-700`, the reveal handler is unconditional while the entries are deleted on any content change. After 126-07 the 'BBj' log copy is no longer reachable from Show. A user who leaves the persistent notification open, edits the file, then clicks Show gets an empty view. Judgment: WARNING. The recommended fallback (reveal the channel when the collection is empty, plus a test) is small.
- **WR-02 (list not bound to a text version):** confirmed, the payload (`denum-notifications.ts`) has no version, so a keystroke landing between the applied edit and the notification would leave entries on moved lines until the next edit or close. Small window. Judgment: WARNING (also the reliance advisory above). Fix touches the shared notification contract; consider doing it before Phase 128 reuses the payload for IntelliJ.
- IN-01..IN-04 (silent no-op on a uri string mismatch, empty `catch {}` blocks without a debug trace, 500-problem cap not mentioned in the summary count, a duplicated uri extraction) are minor and informational.
- From the earlier whole-phase review, still open as informational: a combined run on a file that turned out unnumbered says "Nothing to denumber" although it reformatted the buffer; a test asserts that wording deliberately. The two earlier warnings were fixed per 126-REVIEW-FIX.md.

### Human Verification Required

See the `human_verification` and `behavior_unverified_items` frontmatter. Build the VSIX and the IntelliJ zip from the final tree first, then re-run UAT tests 1 and 2 against live BBj 26.03, plus the undo check.

### Gaps Summary

No gaps. G-126-1 and G-126-2 are closed in code and tests, with the supersession of the "one deduplicated" and "output list" wording recorded above. The phase remains `human_needed` for the in-IDE hand check required by the ROADMAP verification rule, the editor undo grouping, and two advisory review warnings that need a decision.

---

_Verified: 2026-10-03_
_Verifier: Claude (gsd-verifier)_
