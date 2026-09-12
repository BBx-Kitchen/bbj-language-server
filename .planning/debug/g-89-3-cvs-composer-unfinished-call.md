---
status: diagnosed
trigger: "g-89-3-cvs-composer-unfinished-call: In IntelliJ, pressing Alt+Enter on an unfinished CVS( call (typed only up to `CVS(`) shows the error 'This CVS() call has no mask argument, so there is nothing to compose from' instead of opening the CVS() composer. On an existing, complete CVS() call the composer opens fine."
created: 2026-09-12T13:20:00Z
updated: 2026-09-12T13:45:00Z
---

## Current Focus

hypothesis: CONFIRMED -- decodeCvsCall classifies every CVS call with fewer than two arguments (including a call still being typed, `a$ = CVS(`) as found:true / editable:false / missing-mask, and IntelliJ's ComposerLauncher.openCvs treats every found && !editable verdict as a terminal requestFailed notice, returning before any dialog; the intention is offered on `CVS(` because its isAvailable is a text heuristic, so Alt+Enter deterministically lands on that branch
test: done (esbuild-bundled probe of the real decode source + code trace of both IDE entry points)
expecting: n/a
next_action: return ROOT CAUSE FOUND to orchestrator (goal find_root_cause_only; no source edits)
bug_class: Bohrbug (deterministic: the same line text always yields the same decode verdict)
known_pattern_candidate: none (no knowledge-base.md; resolved/ holds 2 unrelated sessions)

reasoning_checkpoint:
  hypothesis: "Alt+Enter on `a$ = CVS(` shows the missing-mask error because (1) cvs-composer.ts:215-216 returns {found:true, editable:false, reason:missing-mask} for any call with args.length < 2, and (2) ComposerLauncher.java:654-660 renders any found && !editable CVS verdict as requestFailed and returns, so the compose-new branch (reached only when found == false) is never taken"
  confirming_evidence:
    - "Probe: decodeCvsCall('a$ = CVS(', 9) => {found:true, editable:false, reason:'This CVS() call has no mask argument, so there is nothing to compose from.', edit:{5,9}}; identical verdict for 'a$ = CVS()', 'a$ = CVS(a$', 'a$ = CVS(a$,'"
    - "Probe control: decodeCvsCall('a$ = CVS(a$, 5)', 9) => editable:true with initial bits [1,4] -- matches tester's 'works fine on an existing one'"
    - "composer-commands.ts:248 is a pure pass-through; ComposerLauncher.java:237-245 forwards the verdict to openCvs; openCvs:654-660 is the only place a CVS not-editable reason reaches the user"
    - "The error string exists in exactly one place (cvs-composer.ts:184); IntelliJ never constructs it"
  falsification_test: "If decodeCvsCall('a$ = CVS(', 9) returned found:false or editable:true, or openCvs had no early return on found && !editable, the hypothesis would be wrong -- the probe shows found:true/editable:false and the early return is present at HEAD e9ec533d"
  fix_rationale: "(direction only, not applied) distinguish an argument-less/unfinished call from a complete call whose mask is unsafe to decode, and give it a composable verdict that opens the dialog and replaces the partial call span; routing it to the existing insertAtCaret compose-new would nest a second CVS(...) inside the partial call"
  blind_spots: "Not reproduced live in IntelliJ (no sandbox here; Gradle runs disallowed). ComposerNoticeRenderer's balloon rendering is not exercised, but the reason text matches verbatim. Did not check whether LSP4IJ sends a different line/column for the caret (column is clamped to line length in launchAt, and the probe covers both col 9 and the no-column first-call path, which give the same verdict)."
  candidate_causes:
    - "code: decodeCvsCall's 'missing-mask' branch conflates a call still being typed with a complete call that has no mask (bbj-vscode/src/cvs-composer.ts:215-216)"
    - "code: IntelliJ openCvs treats every not-editable verdict as a terminal error, with no compose path for an empty call (ComposerLauncher.java:654-660)"
    - "config/design: 89-03-PLAN defined missing-mask as not-editable and 89-08-PLAN prescribed the requestFailed early return; 89-CONTEXT D-14 never considered an unfinished call"
    - "environment: stale plugin build or server not running -- eliminated (see Eliminated)"
    - "data: caret column / auto-closed paren changing which call is matched -- eliminated (see Eliminated)"
  and_gate: "yes -- the user-visible error needs all of: (a) the server verdict found:true/not-editable for an argument-less call, (b) openCvs's terminal not-editable branch, and (c) ConfigureCvsIntention offering the intention on a text heuristic. Changing (a) to found:false or a composable verdict, or (b) to route missing-mask to a dialog, suppresses the error; (c) is why IntelliJ shows it while VS Code silently offers nothing"

## Symptoms

expected: Opening the CVS() composer in IntelliJ via Alt+Enter on a CVS( call works, including on a call the user is still typing (e.g. `x$ = CVS(` with the caret after the paren and no arguments yet). The composer should open so the user can build the call, the same way it does for a complete call. The context menu and the Compose CVS() cue are the other entry points; check whether they share the same code path.
actual: "for an unfinished CVS I get an error: This CVS() call has no mask argument, so there is nothing to compose from - works fine on an existing one. But not while typing it up to CVS( and then pushing alt-enter" (verbatim from the tester)
errors: User-facing message: "This CVS() call has no mask argument, so there is nothing to compose from"
reproduction: Test 3 in .planning/phases/89-cvs-composer-msgbox-expressions-composer-discoverability/89-UAT.md. In a .bbj file in IntelliJ with the Phase 89 plugin build, type `a$ = CVS(` and press Alt+Enter, then choose the CVS() compose intention.
started: Discovered during Phase 89 UAT on 2026-09-12, against the final tree including the code-review fixes (HEAD e9ec533d).

## Eliminated

- hypothesis: stale plugin build or language server not running/not ready
  evidence: a complete CVS() call opens the composer in the same session (server answers cvsDecodeCall), and the reported text is the exact current CVS_NOT_EDITABLE_REASON_TEXT['missing-mask'] from HEAD; a not-ready server would render ComposerNotices.notReady instead
  timestamp: 2026-09-12T13:34:00Z

- hypothesis: Langium error recovery fails to produce a CVS call node for the unfinished `CVS(`, so the decode finds nothing
  evidence: decodeCvsCall is purely textual (regex `(?<![A-Za-z0-9_.])cvs\s*\(` + scanArgs over the line string passed by composer-commands.ts:248); no AST is involved, and the probe shows the call IS found (found:true, edit 5..9)
  timestamp: 2026-09-12T13:34:00Z

- hypothesis: caret column past the call span, or IntelliJ's auto-inserted closing paren, makes the wrong call (or no call) match
  evidence: probe with col 9 on 'a$ = CVS(', no column, and 'a$ = CVS()' col 9 all return the same found:true/missing-mask verdict; launchAt clamps col to line length (ComposerLauncher.java:171)
  timestamp: 2026-09-12T13:34:00Z

## Evidence

- timestamp: 2026-09-12T13:25:00Z
  checked: Phase 0 knowledge base
  found: .planning/debug/knowledge-base.md does not exist; resolved/ holds dread-variable-unresolved-refs and super-class-field-access (unrelated)
  implication: no known-pattern candidate

- timestamp: 2026-09-12T13:26:00Z
  checked: grep "nothing to compose from" in bbj-vscode/src and bbj-intellij/src
  found: single producer bbj-vscode/src/cvs-composer.ts:184 CVS_NOT_EDITABLE_REASON_TEXT['missing-mask']; only other hit is a DecodeEqualityTest.java:687 fixture string
  implication: IntelliJ has no own copy of the text; it comes from the server's decode response

- timestamp: 2026-09-12T13:27:00Z
  checked: bbj-vscode/src/cvs-composer.ts decodeCvsCall (lines 206-217)
  found: findCvsCallAt matches regex `(?<![A-Za-z0-9_.])cvs\s*\(` (no closing paren needed; callEnd = line end when unterminated). Then `if (args.length < 2 || args[1].trim() === '')` returns { found: true, editable: false, reason: missing-mask, edit }
  implication: a typed-so-far `a$ = CVS(` is classified as "found, not editable" rather than "not found", so it never reaches any compose-new branch that keys on found==false

- timestamp: 2026-09-12T13:28:00Z
  checked: bbj-vscode/src/language/composer-commands.ts:248
  found: 'bbj/composer/cvs/decodeCall': (p) => decodeCvsCall(p.line, p.character) -- thin pass-through, no extra handling
  implication: IntelliJ receives exactly decodeCvsCall's verdict

- timestamp: 2026-09-12T13:29:00Z
  checked: IntelliJ entry points ConfigureCvsIntention.java:30-38, BbjComposeCvsAction.java:21-28, ComposerLauncher.launch (133-141) and launchAt CVS case (237-245)
  found: intention isAvailable = isCaretOnCall(editor, "cvs(") (true for `a$ = CVS(`); both intention.invoke and the context-menu action call ComposerLauncher.launch(project, editor, Kind.CVS) -> launchAt(..., fromCue=false) -> server.cvsDecodeCall(lineText, col) -> openCvs
  implication: Alt+Enter and the editor context menu share ONE code path; both fail identically when the caret is inside `CVS(`

- timestamp: 2026-09-12T13:30:00Z
  checked: ComposerLauncher.openCvs (648-690)
  found: lines 654-660 `if (decoded != null && decoded.found && !decoded.editable) { ... ComposerNoticeRenderer.render(project, ComposerNotices.requestFailed(labelOf(Kind.CVS), reason), null); return; }` -- compose-new (line 664/688) is reached only when decoded == null or !found
  implication: the missing-mask verdict is rendered as the user-facing error and no dialog opens; this is the direct symptom site

- timestamp: 2026-09-12T13:34:00Z
  checked: direct observation -- esbuild-bundled scratch probe calling decodeCvsCall/decodeMsgboxCall from the real source (HEAD e9ec533d, same tree as UAT)
  found: |
    CVS  'a$ = CVS('  col 9   => {found:true, editable:false, reason:"This CVS() call has no mask argument, so there is nothing to compose from.", edit:{5,9}}
    CVS  'a$ = CVS()' col 9   => same missing-mask verdict (IntelliJ auto-closed paren case)
    CVS  'a$ = CVS(a$' col 11 => same missing-mask verdict
    CVS  'a$ = CVS(a$,' col 12 => same missing-mask verdict
    CVS  'a$ = CVS(a$, 5)'    => {found:true, editable:true, initial:{str:"a$", bits:[1,4]}}  (control: "works fine on an existing one")
    CVS  'a$ = CVS(a$, n%)'   => non-literal-mask (not editable)
    MSGBOX 'x = MSGBOX(' / 'x = MSGBOX()' => {found:false}
    MSGBOX 'x = MSGBOX("hi"'  => {found:true} (add-options payload)
  implication: reproduces the exact user-facing text deterministically for every stage of typing a CVS call before the mask exists; complete call control matches tester's "works on an existing one"; the MSGBOX sibling classifies an argument-less call as found:false (-> IntelliJ compose-new), CVS classifies it as found:true/not-editable (-> error)

- timestamp: 2026-09-12T13:35:00Z
  checked: design intent -- 89-CONTEXT.md D-14 (109-119), 89-03-PLAN.md truths line 29 + task lines 208/231, 89-08-PLAN.md openCvs spec lines 174-182
  found: CONTEXT D-14 scopes edit-in-place for "an existing CVS() call" and only names a variable/method-call mask as the not-editable fallback; it never considers a call still being typed. 89-03-PLAN introduced 'missing-mask' ("fewer than two arguments or an empty mask -> not editable") and 89-08-PLAN prescribed `found && !editable -> requestFailed(reason); return` in openCvs. cvs-composer.test.ts:129-131 pins only `x$ = CVS(a$)` (a closed one-arg call) as missing-mask; no test covers `CVS(` / `CVS()`
  implication: behaviour is implemented exactly as planned; the defect is a design gap -- 'missing-mask' conflates "complete call with no mask" and "call being typed", and no plan defined an entry for composing into an argument-less/unfinished call

- timestamp: 2026-09-12T13:36:00Z
  checked: VS Code equivalents -- cvs-composer-ui.ts cvsPanelArgAt (31-51), composer-codelens.ts (94-102), composer-lens-command.ts (81-87), cvs-composer-webview.ts openCvsComposerPanel (54-71, 105-120)
  found: VS Code Code Action returns undefined for any not-editable verdict (no CVS lightbulb entry at all on `CVS(`); the cue requires found && editable (no cue on `CVS(`); the bbj.composeCvs command (palette + editor context menu, package.json 207/291) never decodes -- no target means compose-new, inserting r.statement at the captured cursor position
  implication: VS Code never shows the error text (lightbulb silently omits the action; command is position-blind compose-new). Neither IDE can "complete" an unfinished CVS( call; VS Code's compose-new would insert a whole CVS(...) statement at the caret inside the partial call

- timestamp: 2026-09-12T13:37:00Z
  checked: IntelliJ compose-new write shape -- CvsComposerDialog (assignToRow visible only when !editMode, getStatement returns full preview statement), ComposerLauncher.insertAtCaret (712-714 -> insertAt 699-710 inserts at caret offset); MsgboxComposerDialog assignTo default "ret!"
  found: compose-new inserts the full composed statement (optionally `assignTo = CVS(str, mask)`) at the caret; it does not replace the partial `CVS(` span
  implication: simply routing missing-mask to the existing compose-new branch (as MSGBOX effectively does) would open the dialog but insert `CVS(a$, 5)` after `a$ = CVS(`, yielding `a$ = CVS(CVS(a$, 5)` -- a fix needs a replace-the-partial-call-span write (edit.callStart..callEnd is already in the verdict), not insertAtCaret

- timestamp: 2026-09-12T13:40:00Z
  checked: QA/FULL-TEST-CHECKLIST.md rows 19 and 25; intentionDescriptions/ConfigureCvsIntention/description.html; 89-03/89-08/89-10 SUMMARY, 89-REVIEW, 89-VERIFICATION
  found: row 25 (IntelliJ Alt+Enter/context menu) covers compose-new on a BLANK line, edit on the `1+4` call, and the `mode%` reason notice -- no row covers an unfinished `CVS(`; description.html only describes the variable/expression-mask reason case; 89-08-SUMMARY:117 records "openCvs renders requestFailed for a found && !editable decode (never opening a dialog)"; no review/verification artifact mentions an unfinished or argument-less call
  implication: the gap was never specified, tested or reviewed; UAT test 3's "Alt+Enter on a CVS( call" wording is the first place the typing-in-progress case appears

- timestamp: 2026-09-12T13:41:00Z
  checked: IntelliJ vs VS Code entry-point gating
  found: IntelliJ ConfigureCvsIntention.isAvailable is a pure text heuristic (isCaretOnCall "cvs(") so the intention IS offered on `a$ = CVS(`, and the server verdict then routes to the error; VS Code's CodeAction gates on the decode verdict itself (cvsPanelArgAt -> undefined) so it offers nothing, and its command path never decodes
  implication: the user-visible error is IntelliJ-only; VS Code has the same underlying gap (no way to compose into an unfinished call from the lightbulb) but fails silently

- timestamp: 2026-09-12T13:43:00Z
  checked: package.json menu keys; ComposerApplyGuardSourceGuardTest.java:104-161; DecodeEquality.sameCvs (289-315); git log -S for the not-editable branch
  found: bbj.composeCvs at package.json:291 sits inside "editor/context" (234-295). The apply-guard source test pins exactly 6 applyIfUnchanged(, 6 replaceString(, 1 DecodeEquality::sameCvs and 2 cvsDecodeCall( in ComposerLauncher.java. sameCvs compares found, editable, reason, edit span, initial and trailingArgs, so a re-decode of an unfinished call whose text changed (e.g. the user kept typing) would already fail the guard. The openCvs not-editable branch was introduced by 437f6517 feat(89-08) and has existed since
  implication: a guarded replace-the-partial-span write can reuse StaleEditGuard + sameCvs as-is but must move the pinned source-guard counts; the behaviour is present since the CVS IntelliJ path first landed (no regression bisect needed)

## Resolution

root_cause: "bbj-vscode/src/cvs-composer.ts:215-216 decodeCvsCall classifies any CVS call with fewer than two arguments -- including a call still being typed (`a$ = CVS(`, `CVS()`, `CVS(a$`, `CVS(a$,`) -- as {found:true, editable:false, reason:'missing-mask'}, conflating an unfinished call with a complete call that lacks a mask and carrying no initial payload; bbj-intellij/.../composer/ComposerLauncher.java:654-660 openCvs renders every found && !editable CVS verdict as a terminal ComposerNotices.requestFailed notice and returns, so no dialog opens (compose-new at 664/688 runs only for found == false); ConfigureCvsIntention.java:30-32 offers the intention from a text-only heuristic, and both it and BbjComposeCvsAction reach openCvs via ComposerLauncher.launch, so Alt+Enter and the context menu deterministically land on that branch. Design gap, not a regression: 89-03-PLAN defined missing-mask as not-editable and 89-08-PLAN prescribed the early return; 89-CONTEXT D-14 never considered an unfinished call"
fix:
verification:
files_changed: []
