---
phase: 103-one-set-of-errors-diagnostic-reconciliation
verified: 2026-09-23T08:40:00Z
status: human_needed
score: 26/26 must-haves verified (24 code-level truths VERIFIED, 1 VERIFIED with a noted
  coincidental-reliance caveat, 1 backstop/deferred acknowledged; 4 roadmap success criteria and
  their staged hand checks require human execution in two real IDEs before final closure)
behavior_unverified: 0
overrides_applied: 0
re_verification: false
coincidental_reliance_items:
  - truth: "A cancelled request, and a verdict for a document whose text version changed while the request was in flight, change nothing in that cycle (103-02-PLAN.md must_haves)."
    reason: undeclared-precondition
    harden: "debouncedCompile()'s clear-then-show strip (bbj-document-builder.ts:302-304) is
      unconditional and its cancelled/stale-verdict branch (line 334-337) does not restore what it
      stripped — code-review finding CR-01. Tracing the actual call graph shows the strip never
      loses a live 'BBj Parser'-sourced diagnostic today only because a 'cancelled' or stale-version
      outcome is, by construction, always preceded by at least one further edit's own immediate
      validateDocument()+applyVerdictCarryOver() pass (BBjParserService.requestLiveParse()'s own
      doc comment: RequestCancelled only occurs when 'the request was superseded by a newer one',
      which requires a second debounce cycle's own requestLiveParse() call, which only happens from
      a second edit's own buildDocuments()/validateDocument() call, run synchronously before that
      edit's own debounce timer is even scheduled). That intervening validateDocument() pass always
      overwrites document.diagnostics with a fresh Langium-only + carry-over list before any BBj-
      sourced diagnostic could be lost by the later strip. Nothing in the code or a test declares
      this invariant; if Phase 105's scheduling rework (#692) decouples live-parse scheduling from
      buildDocuments() as planned, this invariant could silently break. Recommended hardening: apply
      the reviewer's own suggested fix (save the pre-strip list, restore it in the no-op branch) so
      correctness does not depend on this undeclared timing relationship."
---

# Phase 103: One Set of Errors — Diagnostic Reconciliation Verification Report

**Phase Goal:** When the compiler's parser is available, it is the authority on syntax — the
language server's own lexer, parser and line-break complaints stand down instead of contradicting
or duplicating it.
**Verified:** 2026-09-23
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths — Roadmap Success Criteria

| # | Truth (ROADMAP.md Phase 103) | Status | Evidence |
|---|---|---|---|
| 1 | A line both the compiler's parser and Langium's own checks complain about shows one diagnostic, not two; the save-time `bbjcpl` run adds nothing the endpoint already reported | ✓ VERIFIED (code level) / human check staged | `reconcileWithVerdict`'s overlap-replace logic (`bbj-diagnostic-reconciliation.ts:150-174`), 32 unit tests in `test/bbj-diagnostic-reconciliation.test.ts` covering touching/adjacent/colon-continuation, `debouncedCompile()` skipping `cplService.compile()` on a verdict (`bbj-document-builder.ts:321-333`), and the gated live-endpoint test `"a line both parsers reject keeps BBj's diagnostic alone"` — re-run by this verifier against the real, deployed BBjServices endpoint, **PASS** (`RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` → 7/7 passed). Hand check A (both real IDEs) is staged in `103-05-SUMMARY.md` but not yet executed by a human — see Human Verification. |
| 2 | When the compiler's parser accepts a document, the developer sees no lexer, parser or line-break error from the language server for that document at all | ✓ VERIFIED (code level) / human check staged | `downgradeSyntaxComplaint` + Rule 2/3 exemptions (`bbj-document-validator.ts:139-168`), `test/bbj-document-validator.test.ts`'s `"a verdict on real validator output"` suite proving 0 syntax Errors survive on real validator output, and the gated live-endpoint test `"a document the BBj parser accepts carries no language-server syntax error"` — re-run by this verifier, **PASS**. `103-CONFORMANCE.md` measures 0 of 31 compiler-accepted corpus files still carrying a language-server syntax Error after the verdict. Hand check A steps 2-4 (in-IDE visual confirmation) staged but not yet human-executed. |
| 3 | With the endpoint unavailable, the pre-existing v3.7 diagnostic behaviour returns unchanged — the suppression is conditional, not a permanent removal of checks | ✓ VERIFIED (code + corpus level) / human check staged | The old-server exact-equality regression test (`test/bbj-parser-service.test.ts`'s `"an older server gets exactly the 0.16.x diagnostics"` describe block, `toEqual(mergeDiagnostics(applyDiagnosticHierarchy(...)))`), Rule 0/`mergeDiagnostics` pinned unchanged by a diff check against the Phase 102 branch tip, and `103-CONFORMANCE.md`'s endpoint-absent harness run reproducing the pre-phase A/A2/B file sets **identically, by id set, not only totals** (A 9, A2 22, B 669 of 1,210 — 0 entered/0 left on every list). Hand check B (pre-endpoint jar swapped into both real IDEs) is staged in `103-05-SUMMARY.md`, with a rebuilt pre-endpoint jar (`bbj-ls.jar.pre-endpoint`, 23369 bytes, confirmed present outside the load directory) — but not yet human-executed. |
| 4 | A conformance run at the phase boundary with the endpoint active shows list B falling towards ≤5%, and compiler-accepted files carry no language-server syntax error | ✓ VERIFIED | `103-CONFORMANCE.md`: list B falls from 658 (milestone start) / 669 (endpoint-absent, this phase) to **31 of 1,210 (2.6%)** with the endpoint active — under the ≤5% (≤60 files) target; 0 of the 31 compiler-accepted files (9 list-A + 22 list-A2) still carry a language-server syntax Error after the verdict; 0 endpoint failures across 1,241 real calls. This is the phase's own working measurement (not the Phase 104 formal exit gate), produced by a private, untracked scratch probe reusing the shipped `reconcileWithVerdict`/`applyDiagnosticHierarchy` code against the real endpoint. |

**Score (roadmap success criteria):** 4/4 supported by strong automated/code-level evidence; all
four also have a staged, unexecuted human hand-check as their final in-IDE confirmation (this is
the phase's own design — Phase 102 followed the identical pattern).

### Observable Truths — Plan-Level Must-Haves (representative sample; full detail below)

All 5 plans' `must_haves.truths` (44 total across plans 01-05, several intentionally duplicating
roadmap language) were checked against the codebase. Summary by plan:

| Plan | Truths | Result |
|---|---|---|
| 103-01 (pure reconciliation module) | 14 | ✓ 14/14 VERIFIED — confirmed by reading `bbj-diagnostic-reconciliation.ts` end to end and re-running `test/bbj-diagnostic-reconciliation.test.ts`, `test/bbj-parser-service.test.ts`, `test/document-builder.test.ts`, `test/cpl-integration.test.ts` (this verifier's own run: all passed) |
| 103-02 (fallback/cancelled/lifecycle) | 9 (incl. 1 backstop) | ✓ 8/9 VERIFIED; 1 VERIFIED with a coincidental-reliance caveat (see CR-01 discussion below); 1 backstop item explicitly acknowledged as deferred to Phase 105 (#692), not a gap |
| 103-03 (validator carry-over, close hook, line-break tagging) | 7 | ✓ 7/7 VERIFIED — confirmed by reading `bbj-document-validator.ts`/`line-break-validation.ts` and re-running `test/bbj-document-validator.test.ts` (this verifier's own run: 11/11 passed within the targeted suite) |
| 103-04 (live-endpoint confirmation, conformance measurement) | 5 | ✓ 5/5 VERIFIED — confirmed by re-running the gated live tests against the real endpoint (7/7 passed) and reading `103-CONFORMANCE.md` |
| 103-05 (gate/build/ship) | 9 (incl. 1 backstop) | ✓ 6/9 VERIFIED directly (suite green, register/commit-body clean, distributables built, PR fast-forwarded); 3 require the staged hand checks A/B to be human-executed before final closure |

### CR-01 — Code Review Critical Finding, Assessed

`103-REVIEW.md` flags CR-01: `debouncedCompile()`'s clear-then-show step
(`bbj-document-builder.ts:302-304`) unconditionally strips `'BBjCPL'`/`BBJ_PARSER_SOURCE`-sourced
diagnostics from `document.diagnostics` *before* it knows whether the cycle's outcome is a verdict,
a fallback, a cancellation, or a stale-version answer. The `cancelled`/stale-`verdict` branch
(line 334-337) is a documented no-op that does *not* restore what was stripped, and the callback
still republishes `document.diagnostics` via a single `notifyDocumentPhase` call at the end
regardless of which branch ran.

This verifier read the full callback (`bbj-document-builder.ts:287-370`), `bbj-parser-service.ts`'s
`requestLiveParse()` (lines 241-274, including its own doc comment on `RequestCancelled`), and
`bbj-document-validator.ts`'s `validateDocument()` (lines 226-250) to answer the reviewer's own
question: does the rebuild that makes a verdict stale already recompute `document.diagnostics` via
the validator's carry-over?

**Finding: yes, by construction, every time.** `RequestCancelled` is returned only when "the request
was superseded by a newer one" (the parser service's own doc comment) — which requires a *second*
debounce cycle to reach its own `requestLiveParse()` call for the same document, which can only be
scheduled by a *second* edit's own `buildDocuments()` call. `buildDocuments()` runs
`super.buildDocuments()` (Langium's own validate pass, invoking `BBjDocumentValidator.validateDocument()`
— which unconditionally reassigns `document.diagnostics` to a fresh Langium-only list with
`applyVerdictCarryOver` already applied) *before* it calls `runBbjcplForDocuments()` /
`debouncedCompile()`, which only *schedules* the new timer. The same reasoning applies to a stale
`verdict` (text-version mismatch): a version change requires an edit, and that edit's own
`buildDocuments()` call runs the same immediate validate-and-carry-over pass first. Since
`applyVerdictCarryOver` only ever *downgrades* a Langium diagnostic (never reintroduces a
`'BBj Parser'`-sourced one), a `'BBj Parser'`-sourced diagnostic can only ever exist in
`document.diagnostics` in the narrow window between one cycle's own successful verdict-reconciliation
step and the very next keystroke's own immediate rebuild — a window the strip-without-restore defect
cannot reach for a cycle that goes on to resolve as `cancelled` or stale, because that outcome is
only reachable *after* a further edit has already scrubbed it through the unrelated, ordinary
per-keystroke path.

**Conclusion:** CR-01 does not currently undermine any of the four roadmap success criteria or D-08
("no flicker while typing") in observable behaviour — the specific diagnostic-loss scenario the
reviewer describes cannot occur given the current wiring, because of an invariant (an edit always
precedes a cancelled/stale outcome, and that edit's own validate pass already normalizes
`document.diagnostics`) that holds today but is *not declared or tested anywhere*. This is
recorded as a **coincidental-reliance** item (undeclared-precondition) rather than a gap: the
must-have truth it bears on ("a cancelled/stale cycle changes nothing") is VERIFIED as observably
true, but for a reason the code does not state. If Phase 105's scheduling rework (#692) changes the
relationship between the debounce and the immediate validate pass, this invariant could silently
break and reintroduce the exact flicker CR-01 describes. **Recommendation (not a phase gap):** apply
the reviewer's suggested fix (save the pre-strip list, restore it in the no-op branch) during or
before Phase 105, so correctness stops depending on an unstated timing relationship. WR-01 (verdict
state never cleared on file delete — confirmed unfixed by grep) and WR-02 (a defensive fallback that
silently substitutes a different diagnostics shape — confirmed unfixed by reading
`bbj-document-builder.ts:326`) and IN-01 (`validateDocument()` duplicates
`applyConfiguredDiagnosticHierarchy`'s logic instead of calling it — confirmed at
`bbj-document-validator.ts:249`) are all real, unfixed, low-severity findings that do not affect any
must-have truth; listed under Anti-Patterns below for the record.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` | New pure reconciliation module | ✓ VERIFIED | Exists, exports all 15 documented symbols, imports only from `langium`/`vscode-languageserver`/`./lsp-position.js` (no cycle) |
| `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` | Unit tests for the module | ✓ VERIFIED | 32 tests, all passing in this verifier's own run |
| `bbj-vscode/test/bbj-document-validator.test.ts` | End-to-end validator tests | ✓ VERIFIED | 11 tests across 4 describe blocks, all passing |
| `bbj-vscode/src/language/bbj-parser-service.ts` | `LiveParseOutcome`, generation-reset clear | ✓ VERIFIED | `LiveParseOutcome` union confirmed at lines 84-99, `resetIfGenerationChanged()` calls `clearAllVerdictStates()` |
| `bbj-vscode/src/language/bbj-document-builder.ts` | Live-parse-first debounce, fallback/cancelled/stale handling, `forgetVerdict()` | ✓ VERIFIED (with CR-01 caveat above) | Confirmed via direct read, lines 256-370 |
| `bbj-vscode/src/language/bbj-document-validator.ts` | Exported hierarchy, carry-over wiring, close hook | ✓ VERIFIED | Confirmed via direct read, lines 105-250 |
| `bbj-vscode/src/language/validations/line-break-validation.ts` | `data.code` tagging | ✓ VERIFIED | All 3 `accept('error', ...)` calls carry `data: { code: LINE_BREAK_DIAGNOSTIC_CODE }`, messages/severities/ranges unchanged |
| `.planning/phases/103-.../103-CONFORMANCE.md` | Phase-boundary conformance measurement | ✓ VERIFIED | Exists, no corpus identifiers leaked (grep confirmed clean), records both endpoint-absent and endpoint-active runs |
| `bbj-vscode/test/functional/parse-program-live.test.ts` | Gated live-endpoint tests | ✓ VERIFIED | Re-run by this verifier against the real endpoint: 7/7 passed; `RUN_BBJ_TESTS=0` correctly skips all |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `BBjDocumentValidator.validateDocument()` | `rememberLangiumDiagnostics`/`applyVerdictCarryOver` | pre-hierarchy list remembered before hierarchy runs; carry-over gated on trigger != 'off' and existing state | ✓ WIRED | Lines 231-249 |
| `debouncedCompile()` | `reconcileWithVerdict` | verdict path reconciles against `recallLangiumDiagnostics`, not the stripped `document.diagnostics` | ✓ WIRED | Lines 321-333 |
| `debouncedCompile()` | `cplService.compile()` | skipped exactly when a verdict for unchanged text exists | ✓ WIRED | Confirmed: `compile()` only called in the `else` branch (line 338+), never alongside a successful verdict |
| `line-break-validation.ts` | `bbj-diagnostic-reconciliation.ts` | `LINE_BREAK_DIAGNOSTIC_CODE` import, no cycle | ✓ WIRED | Confirmed no reverse import |
| `BBjDocumentValidator` constructor | `TextDocuments.onDidClose` | `clearVerdictState(event.document.uri)` | ✓ WIRED | Lines 221-224 |
| `resetIfGenerationChanged()` | `clearAllVerdictStates()` | on a decided-to-undecided connection transition | ✓ WIRED | Confirmed in `bbj-parser-service.ts` |
| `BBjDocumentBuilder.update()` | `clearVerdictState` for deleted URIs | — | ⚠️ NOT WIRED (WR-01) | Confirmed by grep: `update()` never calls `clearVerdictState` for the `deleted` list; low-severity, unbounded-map growth only under long-running file churn, does not affect any must-have truth |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full reconciliation + hierarchy + carry-over unit suite | `npx vitest run test/bbj-diagnostic-reconciliation.test.ts test/bbj-parser-service.test.ts test/document-builder.test.ts test/cpl-integration.test.ts test/bbj-document-validator.test.ts test/line-break-validation.test.ts test/validation.test.ts` | 193 passed / 43 skipped; 1 suite (`validation.test.ts`) reported a `beforeAll` hook timeout on the first combined run, re-run in isolation and passed 43/43 (documented hook-timeout-contention pattern, not a regression) | ✓ PASS |
| Live-endpoint reconciliation against real BBjServices | `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` | 7/7 passed, including "a line both parsers reject keeps BBj's diagnostic alone" and "a document the BBj parser accepts carries no language-server syntax error" | ✓ PASS |
| TypeScript build | `npx tsc -b tsconfig.json` | clean, no `error TS` | ✓ PASS |
| Register check (no planning identifiers added by this phase) | `git diff ... \| grep 'PSRV-0\|D-[0-9][0-9]\|...'` (negated) | no match | ✓ PASS |
| Commit-body closing-keyword scan | `git log --format=%B ... \| grep -niE '(closes\|fixes\|resolves) #'` (negated) | no match | ✓ PASS |
| Corpus-identifier leak check on `103-CONFORMANCE.md` | grep for corpus path/id patterns (negated) | no match | ✓ PASS |
| Jar load directory state | `ls -l /opt/bbx/.lib/bbjls/` and `.../bbjls-backup/` | load dir holds exactly 2 files (endpoint jar, lsp4j jar), both backups (`bbj-ls.jar.phase-103-endpoint`, `bbj-ls.jar.pre-endpoint`) present outside it | ✓ PASS |
| Build artifacts present | `ls -la out/language/main.cjs`, `ls -la bbj-intellij/build/distributions/` | both artifacts present, timestamps consistent with the plan-05 build | ✓ PASS |
| PR #691 state | `gh pr view 691 --json state,headRefName,title` | OPEN, head `gsd/phase-102-...`, title names phases 98-103 | ✓ PASS |
| Debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in phase-modified source | grep over 5 modified source files | none found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| PSRV-06 | 103-01..05 | Compiler diagnostics and the language server's own diagnostics do not duplicate; save-time bbjcpl does not repeat what the endpoint reported | ✓ SATISFIED (code-level; hand check A pending) | Overlap-replace reconciliation, skip-bbjcpl-on-verdict wiring, live-endpoint test, conformance measurement (641/669 rejects now caught only via BBj's own diagnostic) |
| PSRV-07 | 103-01..05 | When the compiler accepts a document, no lexer/parser/line-break error shown | ✓ SATISFIED (code-level; hand check A pending) | Downgrade-to-warning + hierarchy exemptions, live-endpoint test, conformance measurement (0/31 accepted files carry a syntax Error) |

No requirement mapped to Phase 103 in `REQUIREMENTS.md`'s traceability table is missing from a
plan's `requirements` frontmatter, and no plan declares a requirement not mapped to this phase — no
orphaned requirements. `REQUIREMENTS.md` itself correctly still shows PSRV-06/PSRV-07 as "Pending"
(unchecked `[ ]`) — by the phase's own design, this verification is what is expected to flip them,
contingent on the still-outstanding hand checks below.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `bbj-document-builder.ts` | 296-362 | CR-01: unconditional clear-then-show strip with a non-restoring no-op branch on `cancelled`/stale-verdict outcomes | ℹ️ Info (assessed, not a current defect — see discussion above) | Does not currently cause observable diagnostic loss; correctness rests on an undeclared invariant that a future scheduling change (#692) could break |
| `bbj-document-builder.ts` | 89-95 | WR-01: `update()` never clears verdict state for deleted URIs | ⚠️ Warning | Unbounded `Map` growth only under long-running sessions with file churn outside the editor; no functional impact on any must-have truth |
| `bbj-document-builder.ts` | 326 | WR-02: `recallLangiumDiagnostics(document) ?? document.diagnostics ?? []` silently substitutes a different (post-hierarchy) shape if the "always populated" assumption is ever violated, with no log line | ℹ️ Info | Confirmed dead code today (every validated document always has a remembered list); a latent silent-degrade risk only if `shouldValidate`/`shouldCompileWithBbjcpl` are ever decoupled |
| `bbj-document-validator.ts` | 249 | IN-01: `validateDocument()` calls `applyDiagnosticHierarchy(carriedOver, suppressCascadingEnabled, maxErrorsDisplayed)` directly instead of the newly-introduced `applyConfiguredDiagnosticHierarchy(carriedOver)` | ℹ️ Info | Functionally identical today; a latent duplication risk for future changes to the configured wrapper |

No debt markers (`TBD`/`FIXME`/`XXX`) and no unreferenced `TODO`/`HACK`/`PLACEHOLDER` found in any
phase-modified source file.

## Human Verification Required

Both items below are staged verbatim in `103-05-SUMMARY.md` (with every log line, source string
and fixture text substituted from the shipped code) and cannot be executed by this verifier — they
require a running VS Code and IntelliJ instance. Per the task instructions, they are carried here
self-contained enough to run without re-reading the SUMMARY.

### 1. Hand Check A — Endpoint present, verify in both IDEs

**Test:**
Setup: both distributables built from the final tree (confirmed done — `out/language/main.cjs` and
the IntelliJ plugin zip both exist with matching timestamps; `cmp` of the zip's bundled `main.cjs`
against the fresh build reportedly exits 0 per `103-05-SUMMARY.md`). BBj debug logging on in both
IDEs. `/opt/bbx/.lib/bbjls/` currently holds exactly two files with the endpoint jar
(`bbj-ls.jar`, 40889 bytes) active — confirmed by this verifier.

In VS Code (the isolated `~/.ext-test` profile on port 13338) and in IntelliJ:
1. Open a `.bbj` file from `examples/`. Find exactly one log line reading
   `Live compiler diagnostics: on`.
2. On new lines, type: `if a then if b then c=1 else d=1 fi else e=1 fi` and stop typing. The
   language server's own complaint (source `bbj`) may appear red briefly, then within about a
   second turns into a Warning with the same message and source `bbj`. No red remains on those
   lines.
3. Keep typing for a few seconds on a *different* line. The warning from step 2 must stay yellow
   the whole time — it must never flash red.
4. Type a clearly invalid BBj line and stop. After the debounce settles, that line carries exactly
   ONE diagnostic: BBj's message, source `BBj Parser`. No second diagnostic from source `bbj` on
   that line.
5. Save. No diagnostic with source `BBjCPL` appears, and the log shows no line starting
   `bbjcpl stdout: ` for this save.
6. Set the compiler trigger setting to `off`, type one character: the step-2 complaint should be
   red again. Set the trigger back to its default.
7. Close the file and reopen it: the step-2 complaint should be red until the first verdict, then
   turn yellow again.

**Expected:** All of steps 1-7 hold in both VS Code and IntelliJ exactly as described; IntelliJ's
hover additionally shows the source in its tooltip.

**Why human:** Requires observing live, real-time diagnostic rendering and debounce timing behavior
in two running IDE instances against a real BBjServices connection — not observable from source or
from a hermetic test.

### 2. Hand Check B — Pre-endpoint jar, verify both IDEs behave as 0.16.x

**Test:**
Swap (verbatim, `sudo` required for the root-owned load directory):
1. `sudo /opt/bbx/bin/stopbbjservices` — wait for it to exit.
2. `sudo cp /opt/bbx/.lib/bbjls-backup/bbj-ls.jar.pre-endpoint /opt/bbx/.lib/bbjls/bbj-ls.jar`
3. `ls -l /opt/bbx/.lib/bbjls/` — exactly two files, `bbj-ls.jar` at 23369 bytes (a jar rebuilt from
   the sibling `bbj-ls` repository at the commit immediately before the `parseProgram` endpoint was
   added, since the original on-host 26.02 backup no longer existed after a fresh BBj install landed
   on this host on 2026-09-23 — see `103-05-SUMMARY.md`'s Deviations section for full provenance).
4. `sudo /opt/bbx/bin/bbjservices`, then wait until 127.0.0.1:5008 accepts a connection (30-60s).
5. Reload the VS Code tab and restart the language server in IntelliJ.

In both IDEs:
6. The log should hold exactly ONE line: `Live compiler diagnostics: off (endpoint not available)`.
7. Type the accepted-document fixture (`if a then if b then c=1 else d=1 fi else e=1 fi`): the
   complaint should be red and STAY red — it should never turn yellow.
8. Type an invalid line: only the language server's own error (source `bbj`) should appear, no
   `BBj Parser` diagnostic.
9. Save a file with an error: a line starting `bbjcpl stdout: ` should appear in the log (when
   bbjcpl wrote to stdout) and a save-time diagnostic should appear; on a line the language server
   also flags, it should read source `BBjCPL` with the language server's own message (the 0.16.x
   merge).
10. Java completion should work; no dialog, popup or warning about the endpoint should appear.

Restore (verbatim):
11. `sudo /opt/bbx/bin/stopbbjservices`
12. `sudo cp /opt/bbx/.lib/bbjls-backup/bbj-ls.jar.phase-103-endpoint /opt/bbx/.lib/bbjls/bbj-ls.jar`
13. `ls -l /opt/bbx/.lib/bbjls/` — exactly two files, `bbj-ls.jar` at 40889 bytes.
14. `sudo /opt/bbx/bin/bbjservices`, wait for 5008, reload both IDEs; the fixture from check A
    step 2 should turn yellow again once typing stops.

**Expected:** Steps 6-10 hold in both IDEs exactly as described; after the restore (steps 11-14),
the load directory returns to its pre-check state (two files, endpoint jar active at 40889 bytes)
and the endpoint-present behavior from Hand Check A resumes.

**Why human:** Requires physically swapping the running BBjServices jar and observing real,
real-time IDE behavior across a server restart — not observable from source or from a hermetic
test, and this verifier cannot run or restart BBjServices, VS Code, or IntelliJ interactively.

## Gaps Summary

No must-have truth failed outright, no required artifact was missing or stubbed, and every key link
this verifier could check by reading code and re-running tests is wired correctly. The phase's own
extensive automated evidence (109 total phase-specific unit/integration tests re-run by this
verifier, 7/7 live tests against the real endpoint, a corpus-scale conformance measurement showing
list B at 2.6% against a ≤5% target and 0/31 accepted files carrying a syntax Error, a register/
commit-body/corpus-leak scan all clean, and a working PR #691) gives strong confidence the phase
goal is achieved in the codebase.

What remains outstanding is exactly what the phase's own plan (103-05) staged for the phase
verifier to harvest and could not execute itself: two hand-check runbooks against two real,
running IDEs (endpoint present; pre-endpoint jar). This is the same closing pattern Phase 102 used.
The status is `human_needed`, not `gaps_found` — no evidence indicates either hand check would
fail; they are simply unexecuted.

CR-01 (the code review's one Critical finding) was investigated in depth against the actual call
graph and does not currently undermine any success criterion; it is recorded as a
coincidental-reliance advisory (an undeclared invariant the phase's correctness currently depends
on) rather than a gap, with a recommendation to apply the reviewer's fix before or during Phase 105.

---

*Verified: 2026-09-23*
*Verifier: Claude (gsd-verifier)*
