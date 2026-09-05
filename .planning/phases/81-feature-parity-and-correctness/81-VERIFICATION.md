---
phase: 81-feature-parity-and-correctness
verified: 2026-09-05T16:30:00Z
status: human_needed
score: 3/3 roadmap success criteria verified (31/31 plan-level must-have truths checked against source, including 81-06's 7 gap-closure truths)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 3/3 roadmap success criteria (24/24 plan-level must-have truths)
  gaps_closed:
    - "G-81-4: bbj/compile's syntax-error response used Number.MAX_SAFE_INTEGER (9007199254740991) in every diagnostic's range.end.character, which overflows org.eclipse.lsp4j.Position.character (a Java primitive int, max 2147483647), causing LSP4J's Gson to reject the whole compile-errors response with MessageIssueException: Message could not be parsed before CompileResultPresenter ever ran. Fixed at the code level in 81-06: both whole-line-range emitting sites (bbj-cpl-parser.ts, bbj-document-validator.ts) now import a shared END_OF_LINE_CHARACTER = 2147483647 constant from a new lsp-position.ts module. Pinned by a TypeScript wire-shape test, a source guard scanning every character: literal under src/language/, and a new JUnit CompileResultJsonBoundaryTest that parses a captured response envelope through LSP4IJ's own MessageJsonHandler/Gson (positive case now parses; the old oversized value is pinned as still rejected)."
  gaps_remaining:
    - "Live re-confirmation that the syntax-error compile balloon now shows the real diagnostics (line:col message) instead of the MessageIssueException — the code-level fix is proven by tests on both sides of the JSON-RPC boundary, but the actual on-screen balloon after a plugin rebuild has not yet been re-exercised in a live IDE since 81-06 landed. See Human Verification."
  regressions: []
---

# Phase 81: Feature Parity and Correctness Verification Report

**Phase Goal:** IntelliJ's Compile action, bracket matching, and REM toggle match VS Code's behavior and BBj's actual syntax rules.
**Verified:** 2026-09-05
**Status:** human_needed
**Re-verification:** Yes — after gap closure (81-06 closes UAT gap G-81-4)

## Context

This is a re-verification following `81-UAT.md`, which exercised all three roadmap success criteria live and found 3 passes plus one gap (G-81-4: the compile-error balloon never appeared for syntax errors, because LSP4J rejected the whole `bbj/compile` response before any handler ran). Gap-closure plan `81-06` (gap_closure: true, wave 3) has been executed and its SUMMARY reviewed, but — per this verifier's adversarial mandate — none of that SUMMARY prose is treated as evidence. Every claim below was checked directly against source at HEAD `0f18ab08`, and the plan's own automated verification commands were re-run fresh in this pass, not read from the SUMMARY.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Invoking "Compile BBj File" in IntelliJ sends a `bbj/compile` request to the shared language server, which runs bbjcpl through the existing `BBjCPLService`, and the action displays success or the returned diagnostics — with no bbjcpl invocation logic duplicated on the IntelliJ side (#571) | ✓ VERIFIED (code + tests); one live re-check pending → human verification | Full chain re-confirmed unchanged from the previous verification pass (`BbjCompileAction.actionPerformed` → `BbjComposerServer.compile` `@JsonRequest("bbj/compile")` → `compile-command.ts` → `BBjCPLService.compileWithOptions` spawning bbjcpl as an argv array, classifying success on `stderr.trim() === ''`). **New this pass:** the one defect UAT found on this path — `range.end.character` overflowing the JVM `int` domain and causing LSP4J to reject the entire response — is now fixed at the code level. Read `bbj-vscode/src/language/lsp-position.ts` in full: exports `LSP_MAX_UINTEGER`/`END_OF_LINE_CHARACTER` both `= 2147483647`. Read `bbj-cpl-parser.ts` in full: `import { END_OF_LINE_CHARACTER } from './lsp-position.js'`, used as `end.character` in the diagnostic `range`; `grep -c MAX_SAFE_INTEGER` (comment-filtered) = 0. Read `bbj-document-validator.ts`'s `extractCyclicReferenceRelatedInfo`: same import, same substitution, `Math.max(0, line)` clamps unchanged. `grep -rn MAX_SAFE_INTEGER bbj-vscode/src --include=*.ts` = no output (repo-wide, not just the two touched files). Fresh re-run this session: `npx vitest run test/compile-request.test.ts test/cpl-parser.test.ts test/cpl-integration.test.ts test/lsp-position.test.ts` → 4 files, 34/34 passed. `CompileResultJsonBoundaryTest.java` read in full: parses a real `compile-errors` envelope (`range.end.character: 2147483647`) through LSP4IJ's own `MessageJsonHandler`/Gson into `CompileModels.CompileResult` with `getEnd().getCharacter() == Integer.MAX_VALUE`; a second test with the old `9007199254740991` value still throws (pinned as a `RuntimeException`/`MessageIssueException` naming the oversized number). Fresh re-run this session: `./gradlew test --tests 'com.basis.bbj.intellij.compile.CompileResultJsonBoundaryTest'` → BUILD SUCCESSFUL; XML confirms `tests="4" failures="0" errors="0"`. `git diff --stat` for the three 81-06 commits (`03506428`, `744993fb`, `fc984238`) against `bbj-intellij/src/main` is empty — no Java main source touched, matching D-10/PARITY-01's contract-stability prohibition. Live round trip for a **valid** file, a **cleared output directory**, an **unsaved edit**, a **large file**, and the action's **hidden-for-.bbl/stopped-server** gating were all confirmed live and passing in `81-UAT.md` test 4's surrounding assertions and are not re-litigated here. The one still-open item is a live re-confirmation, after this fix, that the **syntax-error** case specifically now renders the error balloon instead of the parse exception — see Human Verification. |
| 2 | Typing `PRINT "value (not a bracket)"` or a doubled-quote string in a BBj file does not trigger bracket matching, navigation, or auto-close on the parenthesis inside the string literal, verified by regression tests for both cases (#568) | ✓ VERIFIED (code + tests + live UAT) | Unchanged from the previous verification pass: `BbjWordLexer.advance()` dispatches to `BbjStringCommentScanner` before the bracket `switch`; `BbjParserDefinition.getStringLiteralElements()` returns `TokenSet.create(BbjTokenTypes.STRING)`; `BbjPairedBraceMatcher` excludes `STRING`/`COMMENT` contexts. `BbjStringCommentScannerTest` 13/13 (re-confirmed via the orchestrator-supplied fresh IntelliJ module run, 316/316 passing, which includes this class). **This criterion additionally now has live human confirmation**: `81-UAT.md` test 1 (caret on the parenthesis inside `PRINT "value (not a bracket)"`, a doubled-quote literal, and a `rem (x` comment line, plus a real code bracket on the same line) — `result: pass`. No further human verification needed for this criterion. |
| 3 | Toggling the line-comment shortcut on a line already prefixed with `rem`, `Rem`, or `REM` (word-bounded) removes the prefix instead of adding a second one, verified by regression tests for lowercase and mixed case (#540) | ✓ VERIFIED (code + tests + live UAT) | Unchanged from the previous verification pass: `BbjCommenter implements Commenter, SelfManagingCommenter<CommenterDataHolder>` delegates `isLineCommented`/`commentLine`/`uncommentLine` to `RemToggleSeam`, which is word-bounded (`rem` followed by space/tab/EOL) and strips the prefix plus at most one following space/tab. `RemToggleSeamTest` 11/11, `BbjCommenterSelfManagingSourceGuardTest` 7/7 (re-confirmed via the orchestrator-supplied fresh IntelliJ module run, 316/316 passing). **This criterion additionally now has live human confirmation**: `81-UAT.md` test 2 (Ctrl+/ on `rem foo`/`Rem foo`/`REM foo` removes the prefix; `remark = 1` gets `REM ` prepended; indented double-toggle round-trips; mixed/consistent multi-line selections behave correctly) — `result: pass`. No further human verification needed for this criterion. |

**Score:** 3/3 roadmap success criteria verified at the code/test level. Criteria 2 and 3 additionally carry live human confirmation from `81-UAT.md` (tests 1 and 2, both `pass`) and need no further human verification. Criterion 1's underlying protocol defect (G-81-4) is now closed at the code level with fresh passing tests on both sides of the JSON-RPC boundary, but the specific live re-check — does the syntax-error balloon now render correctly after the fix, with a plugin rebuilt from this branch — has not yet been re-exercised in a live IDE and remains a human-verification item.

### Plan-Level Must-Haves

All must-have truths across all six plans (81-01 through 81-06) were checked directly against source, not SUMMARY prose. 81-01 through 81-05's 24 must-haves were re-confirmed present via the artifact/existence sanity check below (unchanged from the previous verification pass — no regressions found). 81-06's 7 new gap-closure truths were fully re-verified in this pass:

| # | Must-have (81-06) | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Syntax-error compile shows the error balloon listing `line:col message`, matching D-07/G-81-4 | ✓ VERIFIED (code + tests); live → human | See roadmap truth #1 above. |
| 2 | Every emitted LSP `Position` is a non-negative integer ≤ 2147483647, on both `bbj/compile` and diagnostics/relatedInformation paths | ✓ VERIFIED | `lsp-position.test.ts`'s three tests pass fresh (bound value, sentinel bound, and a source guard over every `character:` literal under `src/language/`, skip `generated/`); `grep -rn MAX_SAFE_INTEGER bbj-vscode/src --include=*.ts` empty repo-wide. |
| 3 | Both whole-line ranges built from one named, documented constant, not two independent literals | ✓ VERIFIED | Both `bbj-cpl-parser.ts` and `bbj-document-validator.ts` import `END_OF_LINE_CHARACTER` from the single `lsp-position.ts` module (read both files in full, confirmed no local literal). |
| 4 | A `compile-errors` envelope parses through LSP4J's own `MessageJsonHandler` into `CompileResult` with diagnostics intact; the oversized variant still fails, pinning the failure mode | ✓ VERIFIED | `CompileResultJsonBoundaryTest.java` read in full: `aCompileErrorsResponseParsesThroughTheLsp4jGson` (positive), `theOversizedEndCharacterIsRejectedByTheSameParser` (negative control using the literal `9007199254740991`, appearing exactly once in the file per `grep -c`), `everyPositionInAParsedResultFitsAJavaInt`, `aSuccessResultWithNoDiagnosticsStillParses`. All 4 pass fresh (XML: `tests="4" failures="0" errors="0"`). |
| 5 | Whole-line highlight convention preserved: range still spans character 0 to end of line | ✓ VERIFIED | `range: { start: { line, character: 0 }, end: { line, character: END_OF_LINE_CHARACTER } }` — unchanged shape, only the end sentinel's value moved from `Number.MAX_SAFE_INTEGER` to `2147483647`. Both editors clamp an over-long end position, so the rendered squiggle is unaffected (asserted structurally; visual confirmation is the human item above). |
| 6 | `bbj/compile` contract untouched: method name, result field names, nine-value `reason` vocabulary, D-08 no-publish rule | ✓ VERIFIED | `compile-command.ts` is not in 81-06's `files_modified`; `grep -v comment compile-command.ts \| grep -c publishDiagnostics` still 0 (unchanged from prior pass); `compile-request.test.ts`'s 12 pre-existing tests plus the new wire-shape test all pass with unchanged assertions on `reason`/`success`/`message`. |
| 7 | No Java rendering code changed — `CompileResultPresenter` still reads only `range.start` | ✓ VERIFIED | `git diff --stat` for 81-06's three commits against `bbj-intellij/src/main` is empty. |

**81-06 prohibitions (all `verification: judgment` except the process one, all re-checked directly):**

| Prohibition | Status | Evidence |
|---|---|---|
| MUST NOT change the `bbj/compile` method name, params/result field names, or the nine `reason` values | ✓ kept | `compile-command.ts` untouched by 81-06 (not in `files_modified`; confirmed via `git diff --stat` against the three commits — file not listed). |
| MUST NOT change any Java main-source file | ✓ kept | `git diff --stat` against `bbj-intellij/src/main` empty for all three 81-06 commits. |
| MUST NOT narrow the whole-line range to a single character, drop `end`, or read the source file | ✓ kept | Range literal still has both `start`/`end` with the character-0-to-sentinel shape; no new `fs`/file-read call added to either emitting site (read both files in full). |
| MUST NOT publish `bbj/compile`'s diagnostics as editor markers | ✓ kept | Unrelated file (`compile-command.ts`) untouched; the two files 81-06 did touch only affect the diagnostic *value*, not where diagnostics are routed. |
| MUST NOT write a planning identifier into any source/test comment (`verification: automated`) | ✓ kept | `git diff --unified=0` across the three 81-06 commits, scoped to `bbj-vscode/src bbj-vscode/test bbj-intellij/src`, grepped for `D-0\|G-81\|SEC-\|81-06` in added lines — zero matches. (The one pre-existing `P61-D2-009` comment in `bbj-cpl-parser.ts` predates 81-06 by several phases, confirmed via `git log -S` blame — not a new violation.) |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/lsp-position.ts` | Shared `LSP_MAX_UINTEGER`/`END_OF_LINE_CHARACTER` sentinel with JVM-client rationale | ✓ VERIFIED | Read in full; both consts `= 2147483647`; doc comment explains the JVM `int` overflow hazard; leaf module, no imports. |
| `bbj-vscode/src/language/bbj-cpl-parser.ts` | Imports and uses the shared sentinel | ✓ VERIFIED | Read in full; unchanged except the import and one substituted value. |
| `bbj-vscode/src/language/bbj-document-validator.ts` | Second emitting site imports the same sentinel | ✓ VERIFIED | Read in full; `extractCyclicReferenceRelatedInfo` unchanged except the same substitution. |
| `bbj-vscode/test/compile-request.test.ts` | JSON-round-tripped Position-bound assertion | ✓ VERIFIED | `everyPositionInACompileErrorsResultFitsAJavaInt` present, asserts all four Position numbers `<= 2147483647`. |
| `bbj-vscode/test/lsp-position.test.ts` | Constant bounds + source guard | ✓ VERIFIED | 3 tests, all pass; source guard scans every `.ts` under `src/language/` (skip `generated/`) for `character:` literals. |
| `bbj-intellij/.../compile/CompileResultJsonBoundaryTest.java` | LSP4J-side positive/negative parse proof | ✓ VERIFIED | 4 `@Test` methods, all pass fresh; uses `MessageJsonHandler`, not a bare `Gson`. |
| All 81-01–81-05 artifacts (compile-command.ts, bbj-cpl-service.ts, bbj-ws-manager.ts, main.ts, CompilerOptions.ts, BbjStringCommentScanner.java, BbjTokenTypes.java, BbjParserDefinition.java, BbjPairedBraceMatcher.java, RemToggleSeam.java, BbjCommenter.java, CompilerInitOptions.java, BbjSettings*.java, CompileModels.java, CompileResultPresenter.java, BbjComposerServer.java, BbjCompileAction.java) | Present, unchanged since prior full-content verification | ✓ VERIFIED (existence + no regression) | All 17 files confirmed present on disk this pass (one path correction: `BbjCommenter.java` lives at `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java`, not under a `commenter/` subpackage — a documentation nit in the prior verification report, not a code issue). Full-content re-read was not repeated for files 81-06 did not touch; the orchestrator-supplied fresh whole-suite run (IntelliJ 316/316, vitest 1161/1161 non-drift) is the regression evidence. |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `bbj-cpl-parser.ts` | `lsp-position.ts` | `import { END_OF_LINE_CHARACTER } from './lsp-position.js'`, used as `range.end.character` | ✓ WIRED |
| `bbj-document-validator.ts` | `lsp-position.ts` | Same import, used in `extractCyclicReferenceRelatedInfo`'s `relatedInformation` range | ✓ WIRED |
| `compile-command.ts` (via `bbj-cpl-parser.ts`) | `bbj-intellij/.../CompileModels.java` | The compile-errors result's diagnostics deserialize into int-typed lsp4j `Position` fields; the sentinel now fits | ✓ WIRED (proven by `CompileResultJsonBoundaryTest`) |
| `CompileResultJsonBoundaryTest.java` | `CompileModels.java` | Deserializes into the shipped DTO (`CompileModels.CompileResult`), not a test-local copy | ✓ WIRED |
| All 81-01–81-05 key links (main.ts→compile-command.ts, compile-command.ts→bbj-cpl-service.ts, BbjCompileAction.java→BbjComposerServer.java, etc.) | — | Unchanged; not touched by 81-06 | ✓ WIRED (carried forward, no regression found) |

### Behavioral Spot-Checks (fresh re-run this session)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 81-06's four touched TS test files | `cd bbj-vscode && npx vitest run test/compile-request.test.ts test/cpl-parser.test.ts test/cpl-integration.test.ts test/lsp-position.test.ts` | `Test Files 4 passed (4)`, `Tests 34 passed (34)` | ✓ PASS |
| `CompileResultJsonBoundaryTest` (81-06's new JUnit class) | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.compile.CompileResultJsonBoundaryTest'` | BUILD SUCCESSFUL; XML `tests="4" failures="0" errors="0"` | ✓ PASS |
| No `MAX_SAFE_INTEGER` left anywhere in the language server's source | `grep -rn MAX_SAFE_INTEGER bbj-vscode/src --include=*.ts` | No output | ✓ PASS |
| No Java main source changed by 81-06 | `git diff --stat 03506428~1..fc984238 -- bbj-intellij/src/main` | No output | ✓ PASS |
| No planning identifiers added by 81-06 | `git diff --unified=0 03506428~1..fc984238` scoped to touched dirs, grepped for `D-0\|G-81\|SEC-\|81-06` in added lines | No output | ✓ PASS |
| No new debt markers in 81-06's 8 touched files | `grep -n -E "TODO\|FIXME\|XXX\|HACK\|PLACEHOLDER\|TBD"` across all 8 files | No output | ✓ PASS |
| Whole-suite evidence (orchestrator-supplied, not re-run) | bbj-vscode build; `npm test` (1161 passed/14 pre-existing-failed); IntelliJ `./gradlew test` (316/0) | As reported | ✓ ACCEPTED (consistent with fresh targeted re-runs above) |

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` files exist in this repository and no plan/summary references probe-based verification.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| PARITY-01 | 81-01, 81-04, 81-05, 81-06 | `bbj/compile` request, IntelliJ setting, IntelliJ action, gap-closure fix for the compile-errors int-overflow defect (#571) | ✓ SATISFIED (code + tests); one live re-check pending | See roadmap truth #1 above. |
| PARITY-02 | 81-02 | Bracket inertness inside string literals (#568) | ✓ SATISFIED (code + tests + live UAT pass) | See roadmap truth #2 above. |
| PARITY-03 | 81-03 | Case-insensitive REM toggle (#540) | ✓ SATISFIED (code + tests + live UAT pass) | See roadmap truth #3 above. |

No orphaned requirements — `REQUIREMENTS.md`'s traceability table maps exactly PARITY-01/02/03 to Phase 81 (all marked "Complete"), and all six plans' `requirements:` frontmatter fields claim one of these three IDs (PARITY-01: 81-01, 81-04, 81-05, 81-06; PARITY-02: 81-02; PARITY-03: 81-03), matching 1:1. `git log` HEAD confirmed at `0f18ab08`.

### Anti-Patterns Found

None introduced by 81-06. All 8 files it created/modified are free of `TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER`/`TBD`. No planning identifiers leaked into added comment lines. The one pre-existing `P61-D2-009` comment in `bbj-cpl-parser.ts` predates this plan by several phases (confirmed via `git log -S`) and is not a new violation. No regressions found in the artifacts 81-06 did not touch (existence-checked this pass; full-content re-verification was performed in the prior pass and is not repeated here since nothing changed in those files).

### Human Verification Required

One item remains, narrower than the prior verification's four — two of the original four items now have live UAT confirmation (`81-UAT.md` tests 1 and 2, both `pass`), and the settings-row item (`81-UAT.md` test 3) was confirmed `pass` after an environmental false-negative (Marketplace auto-update) was diagnosed and withdrawn as gap G-81-3. The remaining item is the live re-check of the fix this phase's gap closure delivered:

### 1. Compile-error balloon after the G-81-4 fix

**Test:** With a BBj home and a compile output directory configured, and the plugin rebuilt from this branch (containing 81-06's fix), invoke Tools > Compile BBj File on a `.bbj` file containing a syntax error.
**Expected:** An error balloon appears whose body lists the compiler's errors as `line:col message`, with the same text in the language-server console — no `MessageIssueException`, no "Message could not be parsed" anywhere. (Re-running the rest of `81-UAT.md` test 4's scenarios — valid file, cleared output directory, unsaved edit, large file, hidden-for-`.bbl`/stopped-server — is optional since those already passed live and this fix touches none of that logic.)
**Why human:** The balloon rendering and the full save→request→render round trip require the IntelliJ platform and a running language server, which this repo's test module deliberately excludes (C-01, Phase 79/80 practice). The fix is proven at the value level by tests on both sides of the JSON-RPC boundary (`lsp-position.test.ts`, `compile-request.test.ts`'s wire-shape assertion, `CompileResultJsonBoundaryTest`'s LSP4J-Gson parse), but the on-screen balloon after a plugin rebuild has not yet been re-exercised in a live IDE since 81-06 landed.

### Gaps Summary

No code-level gaps found. G-81-4 (the UAT-discovered defect where a syntax-error compile crashed the IntelliJ plugin's message parser) is closed at the code level: the root cause (`Number.MAX_SAFE_INTEGER` overflowing a JVM `int`-typed `Position.character`) is fixed at both emitting sites through one shared, documented, guarded constant, and the exact previously-broken payload now deserializes through LSP4IJ's own `MessageJsonHandler`/Gson while the old oversized value is pinned as still rejected — closing the cross-language boundary that no test covered before. No Java main source was touched, the `bbj/compile` contract is untouched, and no planning identifiers or new debt markers were introduced. Two of the three roadmap success criteria (bracket matching, REM toggle) now carry live human confirmation via `81-UAT.md` and need no further verification. The phase cannot be marked `passed` because the specific live re-check of the G-81-4 fix — does the balloon actually render correctly now, in a real IDE with a rebuilt plugin — has not yet happened; this is consistent with every prior phase in this milestone (79, 80, and the initial 81 verification) that defers on-screen/keystroke confirmation to a human running the live IDE.

---

*Verified: 2026-09-05*
*Verifier: Claude (gsd-verifier)*
