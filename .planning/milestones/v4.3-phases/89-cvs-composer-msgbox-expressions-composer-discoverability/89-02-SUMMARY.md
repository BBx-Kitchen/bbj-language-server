---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 02
subsystem: composer-discoverability
tags: [msgbox, composer, lsp, vscode, decode]

# Dependency graph
requires:
  - phase: 87-shared-composer-command-layer-intellij-setopts-dialog
    provides: the bbj/composer/* shared command layer pattern this plan's decodeMsgboxCall reuses
provides:
  - decodeMsgboxCall — the one shared MSGBOX decode used by both the bbj/composer/msgbox/decodeCall LSP request and the VS Code lightbulb, so IntelliJ (plans 89-07, 89-08) and VS Code decide identically
  - parseMsgboxOptionsSum — a closed reverse-lookup recognizer for `+`-sums of integer literals and/or BBjMsgBox.* constants, no java-interop path
  - Compose-and-replace mode end-to-end: the decode payload's replace field, the VS Code lightbulb's third label, and the webview's banner + read-only original-expression display
affects: [89-09-additional-composer-kinds]

# Actuals (#2632)
actuals:
  tokens: 9190
  tasks: 2
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One shared decode function (decodeMsgboxCall) consumed by both the LSP request handler and the VS Code UI, so a language-server client (IntelliJ) and VS Code can never disagree on how a MSGBOX call decodes"
    - "A closed reverse-lookup recognizer (parseMsgboxOptionsSum) built once from the existing option catalogs — never a general expression evaluator — is the boundary between 'safe to pre-fill' and 'must compose-and-replace'"

key-files:
  created: []
  modified:
    - bbj-vscode/src/msgbox-composer.ts
    - bbj-vscode/src/language/composer-commands.ts
    - bbj-vscode/src/msgbox-composer-ui.ts
    - bbj-vscode/src/msgbox-composer-webview.ts
    - bbj-vscode/test/msgbox-composer.test.ts
    - bbj-vscode/test/composer-commands.test.ts
    - bbj-vscode/test/msgbox-composer-ui.test.ts

key-decisions:
  - "The final banner text is 'Could not decode this options expression — composing will replace it.' (MSGBOX_REPLACE_BANNER_TEXT), mirroring setopts-in-code-request.ts's NOT_EDITABLE_REASON_TEXT single-source precedent."
  - "parseMsgboxOptionsSum's accepted grammar: trim the text, reject it outright if it contains any of \" ( ) [ ] - * /, else split on '+' and require every trimmed term to be either digits-only or `BBjMsgBox.<identifier>` (case-insensitive) resolving in a reverse map built once from BUTTON_SETS/ICONS/DEFAULT_BUTTONS/FLAGS; any empty or unmatched term (including a leading/trailing/doubled '+') fails the whole expression."
  - "Added an undocumented-by-the-plan hasOptions boolean to MsgboxDecodeCallResult (Rule 2 — missing critical): the payload's initial/replace fields alone cannot always distinguish 'has an existing options argument that decoded to 0' from 'no options argument at all' (both look like an all-zero initial with no replace), and the VS Code UI layer only sees the decode result, not the raw call text. hasOptions supplies the discriminator the label logic needs. It is additive — every existing key IntelliJ's MsgboxDecodeResult parses is unchanged."
  - "The flagged DISC-02 assumption (RESEARCH.md Assumption A2) is restated as accepted: 'a sum of constant Java static fields' is read as the closed BBjMsgBox.* catalog only. A static field of any other class (e.g. SomeClass.FLAG) is treated as undecodable and opens compose-and-replace mode; no java-interop evaluation was attempted, matching the CONTEXT.md deferred-scope note."

patterns-established:
  - "A composer decode payload can carry mode-discriminating fields beyond the historical wire contract (hasOptions, replace) as long as every previously-consumed key is kept byte-for-byte compatible — additive evolution, not a breaking rename."

requirements-completed: [DISC-02]

coverage:
  - id: D1
    description: "A MSGBOX options argument that is a +-sum of integer literals and/or BBjMsgBox.* constants (case-insensitive) decodes to the same selection its numeric value would, with no raw-expression display, via one shared decodeMsgboxCall function"
    requirement: "DISC-02"
    verification:
      - kind: unit
        ref: "test/msgbox-composer.test.ts#MSGBOX options recognizer and shared decode (#648)"
        status: pass
      - kind: unit
        ref: "test/composer-commands.test.ts#msgbox/decodeCall delegates to decodeMsgboxCall for literal, constant-sum and replace-mode lines (#648)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Any other options expression (variable, method call, parentheses, -, *, /, unknown constant, or empty argument) opens compose-and-replace mode: the lightbulb offers a distinct label, message/title/trailing args are preserved verbatim, and the panel shows the banner + original expression read-only via textContent before Apply, with no extra confirmation dialog"
    requirement: "DISC-02"
    verification:
      - kind: unit
        ref: "test/msgbox-composer-ui.test.ts#MsgboxCodeActionProvider labels (#648)"
        status: pass
      - kind: unit
        ref: "test/msgbox-composer-ui.test.ts#Panel init message carries replace (#648)"
        status: pass
      - kind: unit
        ref: "test/msgbox-composer-ui.test.ts#msgbox-composer-webview.ts replace banner markup + script (#648)"
        status: pass
    human_judgment: true
    rationale: "The banner's visual placement, warning-color styling and the panel's overall look in a live VS Code webview need a human eye — no test in this plan renders the webview HTML."

duration: 20min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 02: MSGBOX Expression Decode & Compose-and-Replace Summary

**One shared `decodeMsgboxCall` function now recognizes `BBjMsgBox.*` constant-sum MSGBOX options and pre-fills the composer like a literal, while any other options expression opens a VS Code compose-and-replace mode with the original text and a warning banner visible before Apply.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-12T07:28:00Z (approx.)
- **Completed:** 2026-09-12T07:48:28Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `parseMsgboxOptionsSum` — a closed reverse-lookup recognizer built once from `BUTTON_SETS`, `ICONS`, `DEFAULT_BUTTONS` and `FLAGS`: accepts a `+`-sum of integer literals and/or `BBjMsgBox.*` constant names (case-insensitive, optional whitespace), rejects everything else (variables, method calls, parens, `-`/`*`//`, unknown constants, empty/malformed sums) with no java-interop or evaluator path.
- `buildCallInfo` in `msgbox-composer.ts` now sets `exprRange`/`exprValue` for a decodable constant sum exactly as it already did for an integer literal, plus a new `optionsText` field carrying the trimmed raw text of the options argument for undecodable cases.
- `decodeMsgboxCall(line, character?)` — one shared decode function replacing the inline body of `bbj/composer/msgbox/decodeCall`. It returns the pre-existing decodable and add-options payloads unchanged, and a new compose-and-replace payload (`found: true`, the call span, message/title/trailing args preserved verbatim, `replace: { originalOptions, banner: MSGBOX_REPLACE_BANNER_TEXT }`) for anything else with an options argument present.
- `composer-commands.ts`'s `bbj/composer/msgbox/decodeCall` handler is now a one-line delegate to `decodeMsgboxCall`, so the language server and any in-process caller (VS Code) decode identically — the contract IntelliJ's `MsgboxDecodeResult` parses is unchanged (every existing field/key kept).
- VS Code: `MsgboxCodeActionProvider` now calls `decodeMsgboxCall` and the new exported `msgboxPanelArgFromDecode`, which builds the lightbulb label and command argument from the decode result. The two existing labels (`Configure MSGBOX options (...)`, `Add MSGBOX options…`) are unchanged; a new `Compose MSGBOX options (replaces expression)…` label appears for an undecodable expression.
- `msgbox-composer-webview.ts`: `MsgboxPanelArg` gained an optional `replace` field, the `init` message now carries `replace` (or `null`), and the panel markup gained a `replace-banner`/`original-options` block (hidden by default) that the script reveals and populates only through `textContent` — never HTML — when in replace mode.

## Task Commits

Each task followed its own RED/GREEN cycle (`tdd="true"`):

1. **Task 1: One shared MSGBOX decode — constant sums pre-fill, everything else composes-and-replaces**
   - `c90e0d8a` test(89-02): add failing test for shared MSGBOX decode with constant-sum expressions
   - `3cfa1322` feat(89-02): decode MSGBOX constant-sum options via one shared decodeMsgboxCall
2. **Task 2: VS Code lightbulb and panel show compose-and-replace mode with the banner and original expression**
   - `c8debc22` test(89-02): add failing test for compose-and-replace mode in the VS Code MSGBOX UI
   - `59d8d70d` feat(89-02): VS Code MSGBOX lightbulb and panel offer compose-and-replace mode

An additional deviation-driven commit closes out the plan:
   - `c060efbe` fix(89-02): drop decision-id references from source/test comments

**Plan metadata:** captured in this SUMMARY's own commit.

_Task 1 is `type="tracer"`; its own `<verify>` (targeted tests + build) was re-run end-to-end after the commit per the auto-mode tracer feedback gate before Task 2 began, and passed._

## Files Created/Modified
- `bbj-vscode/src/msgbox-composer.ts` - `parseMsgboxOptionsSum`, `MSGBOX_REPLACE_BANNER_TEXT`, `MsgboxDecodeCallResult`, `decodeMsgboxCall`; `buildCallInfo` recognizes constant sums; new `optionsText`/`hasOptions` fields
- `bbj-vscode/src/language/composer-commands.ts` - `bbj/composer/msgbox/decodeCall` delegates to `decodeMsgboxCall`
- `bbj-vscode/src/msgbox-composer-ui.ts` - `msgboxPanelArgFromDecode`; `MsgboxCodeActionProvider` rebuilt on top of `decodeMsgboxCall`
- `bbj-vscode/src/msgbox-composer-webview.ts` - `MsgboxPanelArg.replace`, `init` message's `replace` field, banner markup + script, `.banner` CSS
- `bbj-vscode/test/msgbox-composer.test.ts` - recognizer, round-trip and `decodeMsgboxCall` behavior tests; one pre-existing test's fixture updated (see Deviations)
- `bbj-vscode/test/composer-commands.test.ts` - delegation test proving the handler equals `decodeMsgboxCall`
- `bbj-vscode/test/msgbox-composer-ui.test.ts` - new file: lightbulb label tests, `msgboxPanelArgFromDecode` tests, panel `init`-message test, webview source-text assertions

## Decisions Made
- Banner text and recognizer grammar as stated in the frontmatter `key-decisions`.
- Added `hasOptions?: boolean` to `MsgboxDecodeCallResult` (not named in the plan's artifact list) because the VS Code UI layer only has the decode payload, not the raw call text, and `initial`/`replace` alone cannot always tell "an existing options argument that happens to decode to 0" apart from "no options argument at all" — both produce an all-zero `initial` with no `replace`. This is additive; every field IntelliJ's `MsgboxDecodeResult` parses is unchanged.
- The flagged DISC-02 assumption from RESEARCH.md (Assumption A2 — "a sum of constant Java static fields" means the closed `BBjMsgBox.*` catalog, not an arbitrary class's static field) is implemented as designed and restated here for the verifier: `Other.MSGBOX_ICON_STOP`-shaped expressions are undecodable and open compose-and-replace, with no java-interop evaluation attempted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `hasOptions` discriminator to `MsgboxDecodeCallResult`**
- **Found during:** Task 2 (building `msgboxPanelArgFromDecode`)
- **Issue:** The plan's `decodeMsgboxCall` payload (as specified) cannot always distinguish a decodable call whose options argument exists and decodes to `0` from a bare call with no options argument at all — both yield an all-zero `initial` with no `replace`. The VS Code UI needs this distinction to choose between the "Configure MSGBOX options (...)" and "Add MSGBOX options…" labels, and only has the decode payload to work from (not the raw line text).
- **Fix:** Added an optional `hasOptions: boolean` field to `MsgboxDecodeCallResult`, set `true` for the decodable/compose-and-replace branches and `false` for the bare-call branch. `msgboxPanelArgFromDecode` branches on it after checking `replace`.
- **Files modified:** `bbj-vscode/src/msgbox-composer.ts`, `bbj-vscode/src/msgbox-composer-ui.ts`
- **Verification:** `test/msgbox-composer-ui.test.ts`'s three `MsgboxCodeActionProvider labels` tests and two `msgboxPanelArgFromDecode` tests all pass; the field is additive so IntelliJ's existing `MsgboxDecodeResult` field set is untouched.
- **Committed in:** `3cfa1322` (field added ahead of use, alongside Task 1's `decodeMsgboxCall`) and `59d8d70d` (consumed in Task 2's `msgboxPanelArgFromDecode`)

**2. [Rule 1 - Bug] Updated one existing test whose fixture is now a recognized constant sum**
- **Found during:** Task 1 (writing the round-trip/recognizer tests)
- **Issue:** The pre-existing test "parse yields no exprRange for a non-literal expr" used `MSGBOX("hi", 32+4)` as its example of an undecodable expression. `32+4` is exactly the kind of integer-literal sum this plan is required to recognize (D-10's own wording), so with the recognizer in place this fixture now correctly decodes to `36` — the old assertion (`exprValue`/`exprRange` both `undefined`) would fail, not because of a regression but because the plan intentionally makes that expression decodable.
- **Fix:** Renamed the test to "parse yields no exprRange for a non-literal, non-constant-sum expr" and changed the fixture to `32*4` (an arithmetic operator the recognizer deliberately rejects), preserving the original test's intent — proving the "no exprRange" path still exists — without asserting behavior the plan explicitly changes.
- **Files modified:** `bbj-vscode/test/msgbox-composer.test.ts`
- **Verification:** The renamed test passes; the full `msgbox-composer.test.ts` suite (35 pre-existing + 9 new tests) is green.
- **Committed in:** `c90e0d8a` (Task 1 RED commit)

**3. [Rule 1 - Bug] Removed decision-id references (D-08/D-09/D-10) from source and test comments**
- **Found during:** post-implementation register check (project rule: no plan/decision/threat ids in source or test comments)
- **Issue:** Several doc comments written during Task 1/Task 2 cited decision ids `D-08`, `D-09`, `D-10` directly (e.g. "(#648, D-10)", "(D-09)") alongside the GitHub issue number, violating the repository's comment-discipline rule.
- **Fix:** Reworded each comment to keep the `#648` issue reference and the descriptive prose, dropping the bare decision-id tokens. Also dropped a `DISC-02` requirement-id reference from the new test file's header comment for the same reason.
- **Files modified:** `bbj-vscode/src/msgbox-composer.ts`, `bbj-vscode/src/msgbox-composer-webview.ts`, `bbj-vscode/test/msgbox-composer.test.ts`, `bbj-vscode/test/msgbox-composer-ui.test.ts`
- **Verification:** `grep -rn "D-[0-9]|89-0|Pitfall|CR-[0-9][0-9]"` over the full plan diff range (`bbj-vscode/src`, `bbj-vscode/test`) returns no matches; targeted tests, build and lint all still pass after the edit.
- **Committed in:** `c060efbe`

---

**Total deviations:** 3 auto-fixed (1 missing-critical discriminator field, 1 pre-existing test fixture updated for now-intended behavior, 1 comment-discipline cleanup).
**Impact on plan:** No scope creep. The `hasOptions` field is a minimal additive extension needed for correct UI labeling; the test fixture change documents an intentional behavior change named directly in the plan; the comment cleanup is process hygiene with zero behavior change.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `decodeMsgboxCall` is the single decode both the language server and VS Code use; IntelliJ (plans 89-07, 89-08) can now consume the same `bbj/composer/msgbox/decodeCall` request and get the identical constant-sum/replace-mode behavior with no further wire changes.
- Plan 89-09 (additional composer kinds / MSGBOX cue) can now safely wire a MSGBOX cue to this decode, since compose-and-replace mode already exists and a cue will never land on an expression-valued call that silently opens a compose-new composer.
- The flagged DISC-02 assumption (Java static fields outside the `BBjMsgBox.*` catalog are undecodable) is implemented as designed and remains flagged here for the verifier and the user, per RESEARCH.md's guidance.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

All 4 modified `src` files and 3 modified/created `test` files verified present on disk
(`bbj-vscode/src/msgbox-composer.ts`, `bbj-vscode/src/language/composer-commands.ts`,
`bbj-vscode/src/msgbox-composer-ui.ts`, `bbj-vscode/src/msgbox-composer-webview.ts`,
`bbj-vscode/test/msgbox-composer.test.ts`, `bbj-vscode/test/composer-commands.test.ts`,
`bbj-vscode/test/msgbox-composer-ui.test.ts`). All 5 commit hashes (`c90e0d8a`, `3cfa1322`,
`c8debc22`, `59d8d70d`, `c060efbe`) verified present in `git log`. Plan-level `<verification>`
steps re-run and passing: targeted tests (60/60), `npm run build` (exit 0), `npm run lint`
(exit 0), whole-suite gate at `numFailedTests: 0` (1580 passed, 29 skipped under
`RUN_BBJ_TESTS=0`), and the register check (no plan/decision/threat ids in the diff).
