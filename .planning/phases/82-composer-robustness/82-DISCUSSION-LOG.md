# Phase 82: Composer Robustness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-05
**Phase:** 82-composer-robustness
**Mode:** `--auto` (reached by the yolo-mode transition after Phase 81 verified). No user prompts; every selection is the recommended default and is marked `[auto]`.
**Areas discussed:** Failure-surfacing channel, In-dialog refresh failure behaviour, Chain shape and timeouts, Re-decode comparison semantics, Stale-abort notification, Regression-test strategy, Plan split

`[--auto] Selected all gray areas: Failure-surfacing channel, In-dialog refresh failure behaviour, Chain shape and timeouts, Re-decode comparison semantics, Stale-abort notification, Regression-test strategy, Plan split.`

---

## Failure-surfacing channel

| Option | Description | Selected |
|--------|-------------|----------|
| One presenter seam → balloon in the "BBj Language Server" group + LS console (recommended) | Mirrors Phase 81's `CompileResultPresenter` convention; reason-keyed, injectable notifier, no modal | ✓ |
| Keep `Messages.showInfoMessage` modals | Matches today's `notifyNotReady`; a modal from a refresh failure would stack on the open modal dialog | |
| IDE log only (`Logger.error`) | Visible only to developers; fails COMP-01's "user-visible" wording | |

`[auto] Failure-surfacing channel — Q: "Where does a failed composer chain surface?" → Selected: "One presenter seam → balloon + LS console" (recommended default)`
`[auto] Failure-surfacing channel — Q: "Does notifyNotReady keep its modal?" → Selected: "Route it through the same seam as an information balloon" (recommended default; one convention for the package)`

**Notes:** D-01, D-02.

---

## In-dialog refresh failure behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Inline "Preview unavailable" + disable OK until the next good preview + one balloon per dialog session (recommended) | Closes the "stale text accepted via still-clickable OK" hazard #538 names; no balloon spam | ✓ |
| Balloon only | Leaves OK enabled on stale text | |
| Close the dialog on failure | Loses the user's selections on a transient server restart | |

`[auto] In-dialog refresh failure — Q: "What happens when refresh() fails while the dialog is open?" → Selected: "Inline message + OK disabled + rate-limited balloon" (recommended default)`

**Notes:** D-05; failures for a superseded `seq` are discarded like superseded successes.

---

## Chain shape and timeouts

| Option | Description | Selected |
|--------|-------------|----------|
| Flatten to one `thenCompose` chain with a single terminal handler; add `orTimeout` (recommended) | An inner failure in the nested pyramid never reaches an outer stage; a hung request never completes at all | ✓ |
| Add `.exceptionally` to every nested future | Three handlers per launch, easy to miss one | |
| No timeout | A hung server stays silent, contradicting the phase goal | |

`[auto] Chain shape — Q: "Flatten or annotate the nested chain?" → Selected: "Flatten with one terminal handler" (recommended default)`
`[auto] Chain shape — Q: "Bound the wait?" → Selected: "orTimeout on launcher (~30 s) and refresh (~10 s)" (recommended default; values Claude's discretion)`

**Notes:** D-03, D-04, source-guard on unobserved futures.

---

## Re-decode comparison semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Re-run the same decodeCall on the current line text and require the whole decode result to be equal, then re-check the modification stamp inside the write command (recommended) | Meets COMP-02's literal wording; conservative; closes the async window between re-decode and write | ✓ |
| Compare only the edit ranges | Applies an edit computed from arguments the user no longer sees when only the args changed | |
| Compare only the captured vs current line text | Rejects harmless changes elsewhere on the line and skips the mandated re-decode | |
| Search the document for the moved call | Heuristic could target the wrong call; C-05 says abort | |

`[auto] Re-decode semantics — Q: "What counts as a match?" → Selected: "Whole decode result equal + modification-stamp gate" (recommended default)`

**Notes:** D-07, D-08. "Abort and notify" itself was locked in REQUIREMENTS.md (C-05) and was not re-opened.

---

## Stale-abort notification

| Option | Description | Selected |
|--------|-------------|----------|
| WARNING balloon stating nothing was changed, with a "Reopen composer" action (recommended) | Abort-and-notify per C-05; reopening is an explicit user click, not automatic | ✓ |
| Plain balloon, no action | User has to find the intention again by hand | |
| Prompt "Reopen now?" modal | Closer to research's "prompt to reopen", but a second modal right after the dialog is heavier than needed | |

`[auto] Stale-abort notification — Q: "What does the user see on a mismatch?" → Selected: "Warning balloon + Reopen composer action" (recommended default)`

**Notes:** D-09; selections are not carried over (deferred idea).

---

## Regression-test strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Plain-Java flow seam over the `BbjComposerServer` interface with an injected EDT executor and notifier; fake document for COMP-02; source-guards on wiring (recommended) | Continues Phases 79-81; `BbjComposerServer` is already an interface, lsp4j is on the test classpath | ✓ |
| `BasePlatformTestCase` | Ruled out by REQUIREMENTS.md and Phases 79-81 | |
| Manual verification only | Fails both requirements' "regression test" clauses | |

`[auto] Regression-test strategy — Q: "How do the tests force a failure and mutate the document without the platform?" → Selected: "Flow seam + fake server double + fake document" (recommended default)`

**Notes:** D-06, D-10, C-01, C-02.

---

## Plan split

| Option | Description | Selected |
|--------|-------------|----------|
| Two sequential plans: COMP-01 then COMP-02 (recommended) | Research build order: #567 inherits #538's notice path | ✓ |
| One plan | Acceptable fallback if seams make the split artificial; must keep COMP-01 green before the COMP-02 production change | |
| Parallel plans | Both touch `ComposerLauncher.java`; conflict-prone | |

`[auto] Plan split — Q: "How many plans?" → Selected: "Two sequential plans" (recommended default)`

**Notes:** D-11, D-12.

---

## Claude's Discretion

- Seam/guard names and packages; `whenComplete` vs `exceptionally`; EDT-executor shape.
- Exact timeout values; balloon wording beyond the fixed phrases.
- DTO equality mechanism (field-wise vs canonical JSON).
- Test file placement and source-guard scoping.

## Deferred Ideas

- Relocate a moved call instead of aborting.
- Carry dialog selections into "Reopen composer".
- VS Code composer webview parity check.
- LSP4IJ canaries over the composer proxy (Phase 83).
- Plugin-wide observed-future helper (ruled out as a general abstraction).

## Reviewed Todos (not folded)

- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` — keyword match only; `bbj-vscode` interop drift.
- `2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md` — keyword match only; `bbj-vscode` fixture hygiene.
