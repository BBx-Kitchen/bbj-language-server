---
phase: 126-ls-denum
verified: 2026-10-02T16:00:00Z
status: human_needed
score: 6/7 must-haves verified
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "Denumber and Format is one undoable step (SC2); a plain Denumber is also one undo step and leaves the buffer dirty"
    test: "In VS Code, open a line-numbered file, type an unsaved edit, run Format Document, click 'Denumber and Format', then press Ctrl+Z once. Repeat with 'Denumber'."
    expected: "One Ctrl+Z restores the numbered text including the unsaved edit; the tab stays dirty after the run; nothing is written to disk."
    why_human: "The server sends exactly one workspace/applyEdit with one TextDocumentEdit holding one TextEdit (tests prove this). Whether the editor groups that into a single undo entry is client behavior no hermetic test can exercise."
unverified_prohibitions:
  - statement: "DENUM must never write or save the file on disk, never touch a document other than the open buffer the request names, and never apply text computed for another version of it"
    verification: judgment
    verdict: "NON-AUTHORITATIVE LLM-judge verdict: holds. unverified-prohibition - human review recommended"
    evidence: "bbj-denum-service.ts and denum-command.ts import no fs and call no read/write API (grep exit 1). Text is read only from the open-document store via request.current(). The edit goes out only after the live version equals the captured version. Tests for a change and a close during the call, and a refused edit, pass."
human_verification:
  - test: "VS Code, built VSIX from the final tree, live BBj 26.03: line-numbered file, Format Document"
    expected: "Format Document returns at once and shows one Warning with 'Denumber' and 'Denumber and Format'. Running it again with no edit shows nothing; after an edit it shows again. Format-on-save never blocks the save and offers once per edit."
    why_human: "Real client message rendering, button placement and save behavior against a live BBjServices."
  - test: "VS Code: click Denumber, then Denumber and Format, on a numbered file with an unsaved edit"
    expected: "Buffer replaced including the unsaved edit, tab stays dirty, 'Denumbered.' or 'Denumbered and formatted.' appears, one Ctrl+Z restores the original. A syntax-error file shows a Warning 'Denumbered. 1 error.' with 'Show'; Show reveals the 'BBj' output with a header naming the file and one line per entry (line, original number, severity, message). A clean file shows only 'Denumbered.' and writes no block."
    why_human: "Undo grouping, dirty state and the Output panel are editor behavior."
  - test: "VS Code: Format Selection on a numbered file; mixed-numbered file; unnumbered file; stale click; BBjServices stopped"
    expected: "Selection explains it needs a file without line numbers and offers only 'Denumber'. Mixed file: Denumber names the line, 'Go to Line' jumps there. Unnumbered file formats normally with no offer. Edit the buffer with the offer open, then click Denumber: the current text is denumbered. Stop BBjServices, click Denumber: 'BBjServices is not reachable. The file was not changed.' appears once and no other popup."
    why_human: "Interactive timing and real service lifecycle."
  - test: "IntelliJ zip from the final tree: open numbered and unnumbered BBj files"
    expected: "No formatting is offered, no error balloon, and idea.log shows no exception naming bbj/denumDiagnostics or bbj/showDenumDiagnostics."
    why_human: "Confirms LSP4IJ tolerates the unhandled notifications quietly (CONTEXT D-01). LSP4J 1.0.0 behavior is stated in 126-05-SUMMARY from reading, not observed."
  - test: "Tokenized and protected programs"
    expected: "Not reachable from the VS Code UI until the Denumber command moves onto bbj/denum (Phase 127). Covered by hermetic tests plus the live tokenized case; a protected program was not producible live."
    why_human: "Accepted gap in live evidence; recheck in Phase 127."
---

# Phase 126: LS DENUM Verification Report

**Phase Goal:** The language server can denumber a BBj program for both IDEs through a `bbj/denum` request. When a user formats a line-numbered file, the server offers DENUM instead of doing it silently, and every DENUM run ends in a clear message with its diagnostics available.
**Verified:** 2026-10-02
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

Automated evidence supports the goal. No gaps were found. The status is `human_needed` because the ROADMAP's verification rule requires a hand check in a running IDE against live BBj 26.03, and because the one-undo-step claim is client behavior no test can see.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: Formatting a numbered file never denumbers automatically; Format Document shows one deduplicated offer "Denumber" / "Denumber and Format"; Format Selection explains it needs an unnumbered file | VERIFIED | `allowDenum` is set only at `bbj-denum-service.ts:414` (the combined run); `bbj-format-service.ts` `paramsFor` never sets it. A `-33006` answer goes through `report()` to `offerDenum()` (format-service lines 310-337), returns `[]`, and raises the offer through the notice ledger keyed per document and version (kinds `denum-needed` and `denum-needed-selection`). `offer()` gives two buttons for a document and one for a selection (service lines 260-277). The interim "Run Denumber BBj Program first" text is gone from src and test. `bbj-denum-offer.test.ts` covers immediate `[]`, never-waits, repeat dedup, edit re-arm, unchanged-save dedup and concurrent requests. The wire contract (bbj-ls README: `-33006` also for a `range` request) agrees. |
| 2 | SC2a: "Denumber" replaces the open buffer (unsaved changes included) as one edit served by `bbj/denum`; the result carries DENUM's diagnostics | VERIFIED | `registerDenumRequest` is wired in `main.ts:81` against `BBj.compiler.BBjDenumService` (DI slot `bbj-module.ts:110`). The handler reads text only from `shared.workspace.TextDocuments` (the live buffer). `execute()` builds one `minimalLineEdit` and applies it through `applyDocumentEdit` as one `TextDocumentEdit` carrying the captured version. `DenumResult` returns `status`, `reason`, `version`, `edits`, `diagnostics` (four-field copy) and `applied`. `denum-command.test.ts` and `bbj-denum-service.test.ts` pass, including CRLF and astral-character positions. |
| 3 | SC2b: "Denumber and Format" is one `formatProgram` call with `allowDenum` and one edit | VERIFIED | `callPeer()` makes one whole-document `formatProgram` with `allowDenum: true`, no `canonicalName`, and rejects a range-scoped answer. `bbj-denum-offer.test.ts` "sends one format call ... and no DENUM call" and "applies the answer as one edit labelled Denumber and Format" pass. The live test (126-05) records `calls=1`. |
| 4 | SC2c: that edit is one undoable step in the editor | PRESENT_BEHAVIOR_UNVERIFIED | One `applyEdit` with one `TextDocumentEdit` and one `TextEdit` is proven. Editor undo grouping is client behavior; see `behavior_unverified_items`. |
| 5 | SC3: Every DENUM run ends in one matching message (nothing to do / confirmation / tokenized pointing to Decompile / protected) | VERIFIED | `execute()` has one ending per path. `presentFailure` / `presentFailed` / `fail` cover unavailable (`-32601` gives the 26.03 text), not-reachable, timeout, mixed numbering (with Go to Line), too-large, protected (`-33005`), parser failure and service-unavailable, each with a fixed text. Tokenized input is intercepted by the `<<bbj>>` prefix before any peer call, with a message that names Decompile. Unnumbered gives "Nothing to denumber". `bbj-denum-outcomes.test.ts` has a `test.each` over every failure row, a "run twice shows two Warnings" case (never deduplicated, D-12), and a "no document text in any message or log" case. |
| 6 | SC4: Diagnostics reach an output list (line, original line number, severity, message) plus a notification with counts and "Show" | VERIFIED | `presentSuccess` sends `bbj/denumDiagnostics`, then shows one message (`Denumbered. 2 errors, 1 warning.`) with the Show button. Warning if any ERROR, Information otherwise; a clean run shows a plain confirmation and sends no list (D-03/D-04). `extension.ts:496,629-647` handles the notification by writing `formatDenumDiagnosticsBlock` lines into the existing 'BBj' channel, and `bbj/showDenumDiagnostics` calls `outputChannel.show(true)`. The renderer validates every field, never throws, and emits `line N (original 0010) ERROR: message`. Covered by `denum-diagnostics-output.test.ts`, `bbj-denum-outcomes.test.ts` and `extension-activation.test.ts`. |
| 7 | D-07 / plan-01 truths: stale, closed, refused, overlapping and cancelled runs never apply an edit to another version | VERIFIED | `execute()` captures version and text as primitives, re-reads `request.current()` after the await, and returns `stale` if it is gone or the version differs. A refused edit gives `not-applied`. A per-document `running` set gives `in-progress`, released in `finally`. Cancellation returns silently. A named run of `bbj-denum-service.test.ts` passes (behavioral evidence, not presence). |

**Score:** 6/7 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/denum-command.ts` | `bbj/denum` DTOs, closed reason vocabulary, handler, registration | VERIFIED | Exports match the plan; never-throwing handler; 16-value reason tuple. |
| `bbj-vscode/src/language/denum-notifications.ts` | Host-neutral notification contract | VERIFIED | Method names and DTOs, no imports. |
| `bbj-vscode/src/language/bbj-denum-service.ts` | One orchestration core | VERIFIED | `execute`, `offer`, `run`, `runDenumAndFormat`, `presentSuccess`, `presentFailure`; substantive, wired through DI and `main.ts`. |
| `bbj-vscode/src/language/bbj-notifications.ts` | Connection-free senders including versioned `applyDocumentEdit` | VERIFIED | `applyDocumentEdit`, `showInformation`, `notifyDenumDiagnostics`, `notifyShowDenumDiagnostics`, `showWarningWithActions`, `showInformationWithAction`. |
| `bbj-vscode/src/denum-diagnostics-output.ts` | Payload renderer | VERIFIED | Imported by `extension.ts:36` and used at line 638. |
| `bbj-vscode/src/language/bbj-format-service.ts` | Offer replaces the interim message | VERIFIED | `offerDenum` calls `BBjDenumService.offer`; interim constant removed. |
| Test files (8 plus harness) | Hermetic coverage | VERIFIED | 8 files, 241 tests passed on re-run. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `main.ts` | `denum-command.ts` | `registerDenumRequest(connection, ...)` after `registerCompileRequest`, before `startLanguageServer` | WIRED | `main.ts:81`. |
| `bbj-module.ts` | `bbj-denum-service.ts` | `BBjDenumService` DI slot | WIRED | `bbj-module.ts:73,110`. |
| `bbj-denum-service.ts` | `bbj-notifications.ts` | default messenger uses `applyDocumentEdit` | WIRED | Service line 199. |
| `bbj-denum-service.ts` | `bbj-format-edit.ts` | `minimalLineEdit` | WIRED | Service line 338. |
| `bbj-format-service.ts` | `bbj-denum-service.ts` | `context.compiler.BBjDenumService.offer` | WIRED | Format-service line 330/335, read lazily. |
| `extension.ts` | `denum-notifications.ts` | `client.onNotification` for both methods | WIRED | `extension.ts:635,642`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Output channel block | `params.diagnostics` | `outcome.result.diagnostics` from `denumProgram` / `formatProgram`, copied by `copyDiagnostics`, sent by `notifyDenumDiagnostics` | Yes: live test shows `[{"line":1,"originalLineNumber":"0010","severity":"ERROR","message":"syntax error"}]` | FLOWING |
| `applyEdit` payload | `edits` | `minimalLineEdit(live, 0, sent.length, outcome.result.text)` | Yes: live test shows applied text containing `L10` and no numbered lines | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 126 suites | `npx vitest run` on 8 phase files (`--maxWorkers=2`, in `bbj-vscode`) | 8 files, 241 tests passed | PASS |
| Typecheck | `npm run typecheck:test` | exit 0 | PASS |
| Lint | `npm run lint` (`--max-warnings 0`) | clean | PASS |
| Whole suite, IntelliJ tests, build, live :5008 (17 passed) | Not re-run; taken from 126-05-SUMMARY (4259 passed / 0 failed; only `installed-extension-e2e` fails, a known environment failure; IntelliJ 1165 tests, 0 failures) | Not independently confirmed | SKIP |

### Probe Execution

SKIPPED: no probes declared by the phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DEN-01 | 126-01, 126-05 | `bbj/denum` returns the denumbered text as one edit plus diagnostics | SATISFIED | Truths 2, 7. |
| DEN-03 | 126-03, 126-05 | Nothing-to-do, confirmation and typed failure messages | SATISFIED | Truth 5. |
| DEN-04 | 126-02, 126-03, 126-05 | Output list plus counts notification with "Show" | SATISFIED | Truth 6. |
| FMT-06 | 126-04, 126-05 | Numbered file never auto-DENUMed; one deduplicated offer; selection explained | SATISFIED | Truth 1. |
| FMT-07 | 126-04, 126-05 | "Denumber and Format" in one undoable step | SATISFIED (undo grouping needs the hand check) | Truths 3, 4. |

All five IDs appear in plan frontmatter and are mapped to Phase 126 in `REQUIREMENTS.md`. No orphaned requirements. DEN-02/05/06 belong to Phase 127 and DEN-07 is future; none is claimed here.

### Open Review Warnings

Neither warning fails a must-have or breaks a locked decision in normal operation. Both are real and worth fixing before the milestone ships.

- **WR-01 (hung `workspace/applyEdit` holds the per-document claim):** confirmed in code. `execute()` awaits `messenger.applyEdit(...)` (service lines 346, 358) with no deadline, and `finally` is the only release. It needs a client that never answers `workspace/applyEdit`. VS Code and LSP4IJ 0.21.0 both answer it, so D-12 ("every run gets its answer") holds for both supported hosts. In the pathological case every later run for that document ends `in-progress` until the server restarts. **Judgment: WARNING, not a gap.** Recommended fix: bound `applyDocumentEdit` with a deadline that resolves `false`, plus a test with a never-settling mock.
- **WR-02 (success with diagnostics but zero edits drops the diagnostics):** confirmed at service lines 354-357. D-01/D-03 are not honored on that branch. The branch needs `denumbered: true` with text equal to the buffer, which the bbj-ls contract says does not occur (an unchanged text answers `denumbered: false`), and it has no test. **Judgment: WARNING, effectively unreachable.** Recommended fix: route it through `presentSuccess`.

Informational: IN-01 (a combined run on a file that turned out unnumbered shows "Nothing to denumber" although it reformatted the buffer) is a wording gap that a test asserts deliberately. IN-02, IN-03 and IN-04 are minor.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | No TBD/FIXME/XXX/TODO/HACK in the changed source; no planning identifiers (D-NN, DEN-, FMT-, plan/phase numbers, WR-/CR-) in the changed source | - | - |

### Human Verification Required

See the `human_verification` and `behavior_unverified_items` frontmatter. In short: build the VSIX and the IntelliJ zip from the final tree, then run the hand check against live BBj 26.03.

### Gaps Summary

No gaps. Every ROADMAP success criterion has code, wiring and passing hermetic tests behind it, and the live peer run in 126-05 shows the real wire path working. Three things keep the status at `human_needed`: the mandatory in-IDE hand check, the editor's undo grouping, and the IntelliJ unhandled-notification tolerance, which was reasoned and not observed. The "never writes to disk" prohibition is recorded with a non-authoritative judgment verdict of "holds", flagged for human review.

---

_Verified: 2026-10-02_
_Verifier: Claude (gsd-verifier)_
