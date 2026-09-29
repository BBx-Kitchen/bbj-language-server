---
phase: 119-grammar-declare-file-paths-shared-channel-opening
plan: "02"
subsystem: parser
tags: [langium, grammar, fragment-extraction]

requires:
  - phase: 119
    provides: "119-01's non-greedy BBjFilePath terminal, base SHA and probe/corpus scratch scripts under /home/coder/repos/tmp/phase-119/"
provides:
  - "One shared fragment ChannelAndOptions calling site for the output-item and input-item statement openings, with the output-only trailing-comma asymmetry documented in a grammar comment"
  - "Full re-measurement of the phase's last source change against the base: probe, private-corpus parser-mode run, whole suite by name, lint/typecheck/build gates, and diff/commit-body hygiene"
  - "Milestone-PR closing lines and closing-note drafts for #527 and #602"
affects: [120, 121, 122]

actuals:
  tokens: 1300
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Opening-only fragment extraction: fragment ChannelAndOptions holds only the shared prefix ('(' channelno=Expression? Options?), each caller keeps its own differently-typed RPAREN/items tail"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj.langium
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Named the fragment ChannelAndOptions and placed it directly above WithChannelAndOptionsAndOutputItems's existing //actual intent comment, per D-01's suggested name and CONTEXT.md's discretion note"
  - "Kept the output-only asymmetry as a multi-line // comment block above the output fragment's //actual intent line (not inside either fragment body), naming #602, 'trailing comma' and READ/INPUT explicitly so the acceptance grep and a human reader both find the rationale in the same place"
  - "Whole-suite contention flakes recurred across three separate whole-suite runs, each time on a different, unrelated test file (parser-keyword-statements.test.ts run 1; document-symbol.test.ts and on-save-kept-errors.test.ts run 2), while every one of them passed cleanly in isolation and a third run reproduced only the base's known installed-extension-e2e failure -- confirms the STATE.md-documented worker-contention pattern rather than a regression from the grammar change"

requirements-completed: [REF-13]

coverage:
  - id: D1
    description: "WithChannelAndOptionsAndOutputItems and WithChannelAndOptionsAndInputItems both open through one shared fragment ChannelAndOptions; the output-only trailing-comma alternatives stay in place with a grammar comment explaining why"
    requirement: "REF-13"
    verification:
      - kind: unit
        ref: "grammar-shape acceptance script (12-point grep/awk check embedded in the plan's Task 1 <verify>) -- grammar shape OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "generated/ast.ts is byte-identical to the post-#527 snapshot; no interface, property or type union changed"
    requirement: "REF-13"
    verification:
      - kind: integration
        ref: "diff -q against /home/coder/repos/tmp/phase-119/ast-after-token.ts -- ast unchanged"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every probed file and case (118 files, 26 inline cases) parses exactly as it did after the #527 change; base-to-head differences equal base-to-post-#527 differences"
    requirement: "REF-13"
    verification:
      - kind: integration
        ref: "probe.mts / probe-diff.mjs (scratch, /home/coder/repos/tmp/phase-119/) -- DIFF onlyA=0 onlyB=0 lexerParserErrors=0 filePathTokens=0 tokens=0 nodeTypes=0 (token-to-head); base-to-head diff byte-identical to base-to-token diff"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/parser.test.ts, test/parser-keyword-statements.test.ts, test/line-break-validation.test.ts, test/example-files.test.ts, test/declare-file-paths.test.ts (all 5 files)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Parser-mode private conformance corpus shows zero difference across base-to-post-#527, base-to-head and post-#527-to-head"
    requirement: "REF-13"
    verification:
      - kind: integration
        ref: "private conformance harness run.mjs --mode parser (scratch snapshots) -- CORPUS-DIFF total=0 unexplained=0 newFalseRejects=0 for all three comparisons; crashes 0, sampled false"
        status: pass
    human_judgment: false
  - id: D5
    description: "Whole suite at head has no failing test name absent from the base list once contention flakes are accounted for; lint, typecheck:test and build are green; diff and commit-body hygiene are clean"
    requirement: "REF-13"
    verification:
      - kind: integration
        ref: "npx vitest run --maxWorkers=2 (3 whole-suite runs) -- run 3 numFailedTests=0, only the pre-existing installed-extension-e2e suite failure present, matching the base's failed-name list exactly"
        status: pass
      - kind: other
        ref: "npm run lint / typecheck:test / build"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-29
status: complete
---

# Phase 119 Plan 02: Shared ChannelAndOptions Fragment Summary

**Extracted the duplicated `'(' channelno=Expression? Options?` opening from the PRINT/WRITE and READ/INPUT/EXTRACT/FIND statement fragments into one shared `ChannelAndOptions` fragment, then re-measured the whole phase (probe, private conformance corpus, whole suite, gates, diff/commit hygiene) against the base commit to prove the refactor changed no parse outcome.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-28T23:49:00Z
- **Completed:** 2026-09-29T00:44:00Z
- **Tasks:** 2
- **Files modified:** 2 (bbj.langium, REQUIREMENTS.md)

## Accomplishments

- New `fragment ChannelAndOptions: '(' channelno=Expression? Options?;` sits directly above `WithChannelAndOptionsAndOutputItems`, with a one-line `//` comment naming what it is and citing #602. Both `WithChannelAndOptionsAndOutputItems` and `WithChannelAndOptionsAndInputItems` now open with `ChannelAndOptions (...)` in place of the repeated opening sequence; each keeps its own RPAREN/items tail (`OutputItem[]` vs `InputItem[]`), and neither gained a guard parameter (`grep -c -E '^(fragment +)?[A-Za-z_]+ *<'` still prints 0). OPEN (line 549) and CLOSE (line 745) keep their own untouched inline opening — confirmed by `grep -c -F "'(' channelno=Expression? Options?"` dropping from 4 to 3 (OPEN, CLOSE, and the new fragment's own definition).
- The output fragment's two item-less trailing-comma alternatives (`RPAREN_NO_NL ENDLINE_PRINT_COMMA` and the bare `ENDLINE_PRINT_COMMA`) stay exactly where they were. A five-line `//` comment directly above the fragment (and above its pre-existing `//actual intent` line) explains why: PRINT/WRITE's trailing comma suppresses the line end even with no items, READ/INPUT/EXTRACT/FIND have no such item-less form, and adding one to the input fragment would change what parses. The input fragment's own `//actual intent` line is unchanged.
- `generated/ast.ts`, regenerated via the Node 22 `langium-cli` wrapper, is byte-identical to the post-#527 snapshot captured by plan 01 (`diff -q` against `ast-after-token.ts` reports no difference; the `BBjFilePath: /::.*?::/,` reflection line from plan 01's fix is present and unchanged).
- The 118-file/26-case before/after probe against the post-#527 baseline is all zeros (`DIFF onlyA=0 onlyB=0 lexerParserErrors=0 filePathTokens=0 tokens=0 nodeTypes=0`), and the base-to-head diff is byte-identical to plan 01's recorded base-to-post-#527 diff (the only 8 differing entries — the new regression file plus the same 7 two-path probe cases — are exactly the #527 shape, unrelated to this plan's REF-13 change).
- A parser-mode run of the private `bbj-corpus` conformance harness (16,884 corpus files, 4,615 rejects, `--shards 4`, 105s, `crashes: 0`, `sampled: false`) shows `CORPUS-DIFF total=0 unexplained=0 newFalseRejects=0` in all three directions: base-to-post-#527 (already recorded by plan 01), base-to-head, and post-#527-to-head. The refactor touches zero corpus files.
- The five targeted test files pass (`parser.test.ts`, `parser-keyword-statements.test.ts`, `line-break-validation.test.ts`, `example-files.test.ts`, `declare-file-paths.test.ts`): 655 passed, 1 skipped.
- REF-13 marked complete in `.planning/REQUIREMENTS.md` (checkbox + traceability row only).

## Task Commits

1. **Task 1: PRINT/WRITE and READ/INPUT open through one ChannelAndOptions fragment, with ast.ts and every parse unchanged** — `efcb7105` (refactor)
2. **Task 2: The phase measured against its base** — evidence-gathering plus `REQUIREMENTS.md` flag only, folded into the plan-metadata commit (see the orchestrator's completion report for its hash).

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` - new `fragment ChannelAndOptions`, both item fragments call it, output-only asymmetry documented in a grammar comment
- `.planning/REQUIREMENTS.md` - REF-13 checkbox and traceability row marked Complete

## Decisions Made

- Regenerated only via `npx --yes node@22 node_modules/langium-cli/bin/langium.js generate` (same Node-24-crashes-langium-cli workaround as plan 01); `generated/` stayed gitignored and untracked throughout, and the pre-existing "This parser rule potentially consumes no input" Chevrotain warning is unrelated and unchanged.
- Placed the new fragment and its explanatory comment directly above the existing `//actual intent` comment on `WithChannelAndOptionsAndOutputItems`, matching the file's established doc-comment convention for these two fragments (per 119-PATTERNS.md).
- Used a detached scratch worktree at the base SHA (`cb948700`, symlinked `node_modules`, regenerated with Node 22) to independently reproduce two whole-suite flakes seen at HEAD, confirming both are pre-existing contention/stale-bundle issues rather than regressions — see Deviations.

## Deviations from Plan

### Investigated, not code deviations — whole-suite flake recurrence across three runs

**1. Three consecutive whole-suite runs (`--maxWorkers=2`) at HEAD produced three different sets of "extra" failing names not present in the base's single recorded failure (`test/functional/installed-extension-e2e.test.ts > (suite failed)`).**

- **Found during:** Task 2, step 2 (the `comm -13` whole-suite check against the base failing-name list).
- **Run 1:** `test/parser-keyword-statements.test.ts > ... a verifier option whose value is absent is still a parser error` (the exact same assertion plan 01 already classified as a pre-existing contention flake) plus a specific-assertion form of the `installed-extension-e2e` failure.
- **Run 2:** two entirely different, unrelated names — `test/document-symbol.test.ts > ... completely broken file returns empty or near-empty array` and two `test/on-save-kept-errors.test.ts` assertions — plus `installed-extension-e2e > (suite failed)` matching the base's generic form.
- **Run 3:** clean — `numFailedTests=0`, only `installed-extension-e2e > (suite failed)` present, an exact match to the base's failed-name list. `comm -13` against the base list is empty.
- **Investigation:** Per the plan's protocol, `test/parser-keyword-statements.test.ts` was run alone at HEAD (332/332 passed) and alone at a detached base-SHA scratch worktree (`--maxWorkers=1`, Node-22-regenerated; 332/332 passed) — same conclusion plan 01 already reached for this exact test. `test/document-symbol.test.ts` and `test/on-save-kept-errors.test.ts` were run alone together at HEAD: 27/27 passed. `test/functional/installed-extension-e2e.test.ts` was run alone at both HEAD and the base-SHA scratch worktree and failed **identically** both times with `Error: No document found for URI: .../examples/issue475-setopts-in-code.bbj` — the same class of stale-installed-extension-bundle symptom plan 01 already documented (three different specific symptoms across five runs there too).
- **Conclusion:** None of the three "extra" names in runs 1 and 2 relates to grammar, channel/options syntax, or file-path parsing at all (`document-symbol` and `on-save-kept-errors` exercise document-symbol and BBjCPL-fallback save flows). Every one passes cleanly in isolation, and a third whole-suite run reproduced only the base's own known failure. This is the same worker-contention pattern already recorded in `.planning/STATE.md` ("Whole-suite hook timeouts are contention... judge on numFailedTests") and by plan 01, now additionally confirmed to surface on a *different* random test file each run under contention — not a regression introduced by the `ChannelAndOptions` extraction.
- **Verification:** 3 whole-suite runs (1 clean, matching base exactly) + 4 isolated single/multi-file runs (all clean) + 1 base-SHA scratch-worktree run each for the two recurring names (both clean/identical-to-HEAD).

**2. `test/functional/installed-extension-e2e.test.ts` failed in all three whole-suite runs, with the same three-symptom non-determinism plan 01 already documented** (a bare "suite failed" with 0 failed assertions twice, and a specific SETOPTS-cue-count assertion once).

- **Found during:** every one of Task 2's whole-suite runs, and the isolated single-file run.
- **Issue:** unchanged from plan 01 — this test drives a separately-built, installed VS Code extension bundle against fixtures in the live source tree; a stale installed bundle, already tracked in `.planning/STATE.md`'s Tech Debt list, unrelated to this plan's grammar change.
- **Fix:** none — out of scope, as in plan 01.
- **Verification:** present identically in the base's own first capture (`suite-base-failed.txt`) and reproduced with the identical specific error text (`No document found for URI`) at both HEAD and a base-SHA scratch worktree when run alone.

---

**Total deviations:** 0 auto-fixed (no Rule 1-3 code changes beyond the plan). 2 items investigated and re-classified as the same pre-existing test-infrastructure flakiness plan 01 already documented, with a full evidence chain recorded above.
**Impact on plan:** None on the delivered refactor. No scope creep; both flake classes are orthogonal test-infrastructure issues already tracked in the project's history (plan 01's Deviations, STATE.md Tech Debt).

## Issues Encountered

None beyond the flake investigation documented above under Deviations.

## User Setup Required

None - no external service configuration required.

## Evidence

- **Base SHA:** `cb948700c0ed95b6a38e55c65c97f6ad642ea249`
- **Probe DIFF lines:**
  - Base to post-#527 (plan 01, recorded): `DIFF onlyA=0 onlyB=1 lexerParserErrors=0 filePathTokens=7 tokens=7 nodeTypes=7` (the 8 differing entries — the new regression file plus 7 two-path probe cases — are exactly the #527 shape)
  - Post-#527 to head (this plan): `DIFF onlyA=0 onlyB=0 lexerParserErrors=0 filePathTokens=0 tokens=0 nodeTypes=0`
  - Base to head (this plan): byte-identical to the base-to-post-#527 diff above (same 8 entries, same field counts)
- **Corpus per-list counts** (16,884 corpus files, 4,615 rejects, parser mode, `--shards 4`):
  - Base to head: `CORPUS-DIFF total=0 unexplained=0 newFalseRejects=0` (all three lists — falseRejects, falseAlarms, missed — report `onlyA=0 onlyB=0 changed=0`)
  - Post-#527 to head: `CORPUS-DIFF total=0 unexplained=0 newFalseRejects=0` (same zero result)
  - No corpus file differs at all between base, post-#527 and head for this phase's changes — the private corpus apparently contains no line matching either the #527 two-path shape or any channel/options syntax whose parse changed.
- **Whole-suite counts:**
  - Base: `numFailedTests=0 numPassedTests=3605 numPendingTests=30 numTotalTests=3635`
  - Head (clean run): `numFailedTests=0 numPassedTests=3607 numPendingTests=30 numTotalTests=3637` (2 more total tests than base — plan 01's `declare-file-paths.test.ts` additions)
  - `comm -13` of base-failed-names against head-failed-names: empty (the sole head failure, `installed-extension-e2e > (suite failed)`, is in the base list)
- **Gate results:** `npm run lint` — clean (0 warnings/errors). `npm run typecheck:test` — clean (both `tsconfig.test.json` and `tsconfig.harness.json` pass with `--noEmit`). `npm run build` — clean (`tsc -b` + `esbuild.mjs` both succeed).
- **Diff/commit hygiene:** 0 added lines under `bbj-vscode/src`/`bbj-vscode/test` since the base carry a planning identifier; 0 commit bodies since the base contain a closing keyword followed by an issue number; `git diff --stat` against the base shows exactly `3 files changed` (bbj.langium, the two plan-01 test files).
- **API-coverage gate:** `block=false` — no external-API integration detected; no `COVERAGE.md` needed.

## Milestone PR closing lines

Closes #527
Closes #602

## #602 closing-note draft

The opening paren, channel and options sequence (`'(' channelno=Expression? Options?`) that PRINT/WRITE and READ/INPUT/EXTRACT/FIND statements both used to spell out separately is now one shared fragment, `ChannelAndOptions`, that both item fragments call. The RPAREN alternatives after it stay one per fragment, because each is followed by a differently-typed `items` property (`OutputItem[]` on the print side, `InputItem[]` on the read side) — sharing that tail would need a guard parameter and risks widening `items` to a union type on both statement kinds, which this change deliberately avoids. The output fragment keeps its two item-less trailing-comma alternatives (a lone trailing comma, or a trailing comma right after the closing paren), with the reason now spelled out in a grammar comment: a trailing comma on PRINT/WRITE suppresses the line end even with no items, and READ/INPUT/EXTRACT/FIND have no such form, so giving the input fragment those alternatives would change what parses. The regenerated AST types are byte-identical to before this change, and a before/after parse probe plus a parser-mode run of BASIS's private conformance corpus both show zero changed parse outcomes anywhere in the codebase.

## #527 closing-note draft

Plan 01 of this phase found the `BBjFilePath` lexer terminal (`/::.*::/`) was greedy: on a line with two file-path-qualified references — the exact shape from this issue, `declare ::lib1::ClassA a; declare ::lib2::ClassB b` — it matched all the way to the last `::` on the line instead of the nearest one, silently losing the first declaration (the base grammar produced one `VariableDecl` named `b`, not two). The fix makes the terminal non-greedy (`/::.*?::/`), which stops at the nearest closing `::` while still allowing an interior single colon (a Windows drive-letter path) to pass through untouched. A new regression file (`bbj-vscode/test/test-data/issue527-declare-file-paths.bbj`) pins this shape plus four more it also covers: two `USE` statements on one line, a class whose `EXTENDS` and `IMPLEMENTS` clauses each reference a different file path, a `declare` immediately followed by a `new` of a second path, and a static-field access chained the same way. A targeted test (`bbj-vscode/test/declare-file-paths.test.ts`) additionally proves the fix's real-world effect: the two-declare line now produces two `VariableDecl`s, each resolving through `AstUtils.getDocument` into its own real library document with zero validation errors. Both this fix and the REF-13 fragment extraction were re-measured together against the base commit: a 118-file/26-case before/after parse probe and a parser-mode run of BASIS's private conformance corpus (16,884 accepted + 4,615 rejected programs) show every difference from the base is exactly this two-path shape, nothing else.

## Observations, not acted on

- `OpenStatement` (`OPEN`) and `CloseStatement` (`CLOSE`) both still carry the same `'(' channelno=Expression? Options?` opening inline, identical to what `ChannelAndOptions` now factors out for the other two statement families. #602 named only `WithChannelAndOptionsAndOutputItems` and `WithChannelAndOptionsAndInputItems`, so these two are deliberately left unchanged here — folding them in would widen #602's scope beyond what was asked.

## Re-measure rule

If a later code-review fix touches `bbj.langium`, the probe and private-corpus head steps of this plan (both against `/home/coder/repos/tmp/phase-119/` and the private harness's `conformance` snapshots directory) must be rerun before the phase is considered re-verified.

## Next Phase Readiness

- Phase 119 is complete: both FIX-01 (#527, plan 01) and REF-13 (#602, this plan) are done, re-measured together against the base, and hold zero unexplained differences in the probe, the private corpus, or the whole suite.
- `Closes #527` and `Closes #602` are ready to be copied into the milestone PR body at phase/milestone close (per D-11); nothing has been posted to GitHub from this plan.
- No blockers for Phase 120.

## Self-Check: PASSED

- `bbj-vscode/src/language/bbj.langium` — FOUND, contains `fragment ChannelAndOptions:` and both callers reference it
- Commit `efcb7105` — FOUND in `git log --oneline --all`
- `.planning/REQUIREMENTS.md` REF-13 — `[x]` checkbox and `Complete` traceability row confirmed; only those two lines changed in this plan's diff
- All task `<acceptance_criteria>` re-verified: "grammar shape OK", "ast unchanged", "parse unchanged" (Task 1); "corpus OK", "suite names OK", "gates OK", "hygiene OK", "block=false" (Task 2) all printed
- Plan-level `<verification>` bullets re-checked: one `ChannelAndOptions` fragment shared by both item fragments with OPEN/CLOSE untouched; ast.ts byte-identical; probe all zeros token-to-head and base-to-head equal to base-to-token; corpus zero in all three directions, crashes 0; whole suite clean on the matching run, gates green, diff/commit-body hygiene clean; this SUMMARY carries both `Closes` lines and both closing-note drafts
- `git -C /home/coder/repos/bbj-language-server worktree list` — no worktree under `/home/coder/repos/tmp/phase-119/`
- `git -C /home/coder/repos/bbj-language-server status --short` — no file under `bbj-vscode/` (only the pre-existing untracked `.planning/milestone.lock`, not staged)

---
*Phase: 119-grammar-declare-file-paths-shared-channel-opening*
*Completed: 2026-09-29*
