---
phase: 119-grammar-declare-file-paths-shared-channel-opening
plan: "01"
subsystem: parser
tags: [langium, grammar, lexer, terminal-regex, bbj-file-path]

requires:
  - phase: 116
    provides: the re-enabled parser assertions and the hermetic Java-interop test double used by declare-file-paths.test.ts
provides:
  - "Non-greedy BBjFilePath terminal so a line with two file-path-qualified class references parses as two tokens instead of one"
  - "test/test-data/issue527-declare-file-paths.bbj: an 8-line regression file covering five two-path shapes, picked up by example-files.test.ts"
  - "test/declare-file-paths.test.ts: the #527 acceptance test (two VariableDecls resolving into real lib1/lib2 documents with zero diagnostics) plus token/AST-shape assertions on the regression file"
  - "Base-vs-fix evidence (per-file probe over 117/118 files, whole-suite failing names, parser-mode private-corpus run) attributing every difference to the #527 two-path shape"
affects: [119-02, 120, 121]

actuals:
  tokens: 2610
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Non-greedy delimiter-pair terminal (/::.*?::/) for a token meant to capture 'everything up to the nearest matching delimiter' on one line"
    - "Before/after per-file parse-diff probe (tsx script, not committed) comparing lexerErrors/parserErrors/filePathTokens/tokens/nodeTypes across examples/ + test-data/ + 26 inline cases"

key-files:
  created:
    - bbj-vscode/test/test-data/issue527-declare-file-paths.bbj
    - bbj-vscode/test/declare-file-paths.test.ts
  modified:
    - bbj-vscode/src/language/bbj.langium
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Kept the D-04 non-greedy terminal fix even though it turned out the base grammar DOES misparse the #527 line today (D-05 base check: both new tests failed on the base, one VariableDecl named 'b' instead of two) -- so the fix was necessary, not just defensive"
  - "Classified the intermittent test/parser-keyword-statements.test.ts and test/functional/installed-extension-e2e.test.ts whole-suite failures as pre-existing contention/stale-bundle flakiness, not a regression from this plan's grammar change, after 5 whole-suite runs (2 at HEAD, 2 at a detached base-SHA scratch worktree, 1 original base capture) and 2 isolated single-file runs at both commits -- see Deviations"

requirements-completed: [FIX-01]

coverage:
  - id: D1
    description: "declare ::lib1::ClassA a; declare ::lib2::ClassB b on one line parses as two VariableDecls, each resolving into its own real lib document with zero diagnostics"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/declare-file-paths.test.ts#the #527 line parses as two declarations, each resolving into its own lib document"
        status: pass
    human_judgment: false
  - id: D2
    description: "The regression file pins every two-path shape (two USEs, drive-letter path, declare+new, class extends/implements) at token and AST level"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/declare-file-paths.test.ts#the regression file pins every two-path shape at token and AST level"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/example-files.test.ts#Parse all files in \"test-data\" folder"
        status: pass
    human_judgment: false
  - id: D3
    description: "No other parse outcome changed: 117/118-file probe (26 inline cases) and a parser-mode private-corpus run over 16,884 corpus + 4,615 reject files show every difference from the base is exactly the #527 two-path shape"
    requirement: "FIX-01"
    verification:
      - kind: integration
        ref: "probe.mts / probe-diff.mjs (scratch, /home/coder/repos/tmp/phase-119/) -- DIFF onlyA=0 onlyB=1 lexerParserErrors=0 filePathTokens=7 tokens=7 nodeTypes=7"
        status: pass
      - kind: integration
        ref: "bbj-corpus/conformance/run.mjs --mode parser (scratch snapshots) -- CORPUS-DIFF total=0 unexplained=0 newFalseRejects=0"
        status: pass
    human_judgment: false

duration: 68min
completed: 2026-09-28
status: complete
---

# Phase 119 Plan 01: DECLARE File-Path Terminal Fix Summary

**Made the `BBjFilePath` lexer terminal non-greedy (`/::.*?::/`) so two file-path-qualified class references on one line stay two tokens instead of silently merging into one, verified by a regression file, a targeted test against real lib documents, a 117/118-file before/after parse probe, and a parser-mode run of the private conformance corpus.**

## Performance

- **Duration:** 68 min
- **Started:** 2026-09-28T22:36:59Z
- **Completed:** 2026-09-28T23:45:16Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `terminal BBjFilePath: /::.*?::/;` replaces the greedy `/::.*::/`, with an inline comment naming #527. Confirmed by base-evidence capture (D-05): on the untouched base grammar, both new tests fail — `declare ::lib1::ClassA a; declare ::lib2::ClassB b` produced **one** `VariableDecl` named `b` (the first `declare` silently lost), and the 8-line regression file's `BBjFilePath` token images spanned across path boundaries. After the fix, both tests pass: two `VariableDecl`s (`a`, `b`), each resolving via `AstUtils.getDocument` into its own real `lib1`/`lib2` document with zero diagnostics.
- New regression file `test/test-data/issue527-declare-file-paths.bbj` (8 lines) covers the #527 line, two `USE`s on one line, a Windows drive-letter path (single colon, must stay one token), a `declare`+`new` pair, and a `CLASS ... EXTENDS ... IMPLEMENTS` with two different paths. `example-files.test.ts`'s zero-error gate picks it up automatically.
- New `test/declare-file-paths.test.ts`: registers extensionless `lib1`/`lib2` documents through `BBjServiceRegistry.registerUseTarget` (the same seam the document builder uses for PREFIX programs, #688), asserts the #527 acceptance criteria against them, and asserts the regression file's 11 `BBjFilePath` token images plus every `Use`/`VariableDecl`/`ConstructorCall`/`BbjClass.extends`/`.implements` reference text.
- Base-vs-fix attribution, all captured under `/home/coder/repos/tmp/phase-119/` (never committed): a tsx probe over 117 base files (118 after adding the regression file) plus 26 inline cases shows `DIFF onlyA=0 onlyB=1 lexerParserErrors=0 filePathTokens=7 tokens=7 nodeTypes=7` — the only new key is the regression file itself, and the only 7 changed cases are exactly the two-path shapes (`fp-two-declares`, `fp-two-uses`, `fp-extends-implements`, `fp-declare-then-new`, `fp-two-statics`, `fp-continuation`, `fp-two-drive-paths`). The single-path, double-colon-in-string/comment/label, and all 12 channel/options cases are byte-identical.
- A parser-mode run of the private `bbj-corpus` conformance harness (16,884 corpus files, 4,615 rejects) before and after the fix is **byte-identical**: `CORPUS-DIFF total=0 unexplained=0 newFalseRejects=0`, `falseRejects=26`, `missed=2166` on both runs, `crashes: 0` on both.
- `generated/ast.ts` differs from the base snapshot in exactly the one `BBjFilePath` reflection-table line (`cp`+`diff`, since `generated/` is gitignored and `git diff` on it is always empty).
- FIX-01 marked complete in `.planning/REQUIREMENTS.md` (checkbox + traceability row only; REF-13 and its row are untouched, left for plan 02).

## Task Commits

1. **Task 1: Base evidence first, then the #527 line parses as two resolved declarations** — `2d302f88` (fix)
2. **Task 2: Every difference from the base is the #527 shape** — no standalone code commit (evidence-gathering + `REQUIREMENTS.md` flag only); folded into the plan-metadata commit below.

**Plan metadata:** committed alongside this SUMMARY (see final commit hash in the orchestrator's completion report).

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` - one-line non-greedy `BBjFilePath` terminal with an inline `#527` comment
- `bbj-vscode/test/test-data/issue527-declare-file-paths.bbj` - 8-line regression file, five two-path shapes
- `bbj-vscode/test/declare-file-paths.test.ts` - #527 acceptance test + regression-file token/AST-shape test
- `.planning/REQUIREMENTS.md` - FIX-01 checkbox and traceability row marked Complete

## Decisions Made

- Regenerated only via `npx --yes node@22 node_modules/langium-cli/bin/langium.js generate` (the container's Node 24 crashes `langium-cli`'s config-schema validation); `generated/` stayed gitignored and untracked throughout.
- Kept the D-04 non-greedy fix regardless of the D-05 base outcome per CONTEXT.md — and the base outcome confirmed the fix was load-bearing: both new tests genuinely fail on the untouched base grammar.
- Treated two intermittent whole-suite failures as pre-existing flakiness rather than blockers — see Deviations below for the full evidence chain.

## Deviations from Plan

### Investigated, not code deviations — whole-suite flake classification

**1. `test/parser-keyword-statements.test.ts > ... a verifier option whose value is absent is still a parser error` appeared as a NEW failing name in the first whole-suite run at HEAD, absent from the first base capture.**

- **Found during:** Task 2, step 4 (whole-suite `comm -13` check against the base failing-name list).
- **Investigation (per the plan's own base-SHA scratch-worktree protocol, extended with two extra runs since the first comparison was inconclusive):**
  - The file run alone at HEAD: 332/332 passed.
  - The file run alone at a detached base-SHA scratch worktree (Node-22-regenerated, `--maxWorkers=1`): 332/332 passed.
  - The full whole suite re-run a second time at the same base SHA (fresh detached worktree, `--maxWorkers=2`, same contention level as the failing run): passed clean, only the pre-existing `installed-extension-e2e` suite failure present.
  - The full whole suite re-run a second time at HEAD (`--maxWorkers=2`): passed clean, same single pre-existing failure.
  - The test file's own committed comment (lines 16-20) already documents the mechanism: *"a second instance [of `createBBjTestServices()+initializeWorkspace()`] in this file re-triggers the beforeAll hook-timeout flake under contention."* This has zero connection to the `BBjFilePath` terminal regex — the failing assertion is about a `LEN=` verifier-option parser error, an unrelated grammar area.
  - `.planning/STATE.md`'s Decisions log already recorded this exact class of flake as "confirmed pre-existing against the phase base commit" during Phase 118 (`118-02`).
- **Conclusion:** non-deterministic worker-contention flake, present intermittently at both the base and HEAD (1 failure in 2 whole-suite runs at each), not introduced by this plan. Not fixed (out of this plan's scope; it is a pre-existing test-infrastructure timing issue, not a `bbj.langium`/lexer bug).
- **Verification:** 2 isolated single-file passes + 2 additional whole-suite reruns (1 at base, 1 at HEAD), both clean.

**2. `test/functional/installed-extension-e2e.test.ts` failed in every one of the 5 whole-suite runs performed during this plan's verification, but with 3 different symptoms across those runs** (a deep-equal SETOPTS-cue-count mismatch once, a bare "suite failed" with 0 failed assertions on 4 runs, and a distinct "No document found for URI" JSON-RPC error when the file was run alone).

- **Found during:** Task 1's initial base capture and every subsequent whole-suite run in Task 2.
- **Issue:** this test drives a separately-built, installed VS Code extension bundle against fixtures in the live source tree; RESEARCH.md and `.planning/STATE.md`'s Tech Debt list already document it as "stale installed bundle, pre-existing" — unrelated to source changes since the last extension (re)install.
- **Fix:** none — out of scope; rebuilding/reinstalling the extension (standard UAT practice per the "UAT: build both extensions first" team convention) clears it.
- **Verification:** present identically in the very first base capture (`suite-base-failed.txt`), so the base-line failure itself is proven pre-existing by name; only the specific downstream symptom is non-deterministic.

---

**Total deviations:** 0 auto-fixed (no Rule 1-3 code changes beyond the plan). 2 items investigated and classified as pre-existing test-infrastructure flakiness, with a full evidence chain recorded above for reviewer visibility — neither is caused by, nor was fixed as part of, this plan's grammar change.
**Impact on plan:** None on the delivered fix. No scope creep; both flakes are orthogonal test-infrastructure issues already tracked elsewhere in the project's history (Phase 118 decision log, STATE.md Tech Debt).

## Issues Encountered

None beyond the flake investigation documented above under Deviations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 2 (119-02-PLAN.md, REF-13/#602 — the shared `ChannelAndOptions` fragment) can proceed: this plan's `ast-after-token.ts` snapshot (`/home/coder/repos/tmp/phase-119/ast-after-token.ts`) is the byte-identical-except-`BBjFilePath` baseline plan 02 diffs against, and the same probe/corpus scratch scripts are already in place for reuse.
- `Closes #527` still needs to land in the milestone PR body (per D-11) — that happens at phase/milestone close, not per-plan.
- No blockers for plan 02.

## Self-Check: PASSED

- `bbj-vscode/src/language/bbj.langium` — FOUND, contains `terminal BBjFilePath: /::.*?::/;`
- `bbj-vscode/test/declare-file-paths.test.ts` — FOUND
- `bbj-vscode/test/test-data/issue527-declare-file-paths.bbj` — FOUND, 8 lines
- Commit `2d302f88` — FOUND in `git log --oneline --all`
- `.planning/REQUIREMENTS.md` FIX-01 — `[x]` checkbox and `Complete` traceability row confirmed
- All task `<acceptance_criteria>` re-verified: "base evidence OK", "token OK", "attribution OK", "ast OK", "corpus OK", "gates OK" (lint + typecheck:test), "ids OK" all printed
- Plan-level `<verification>` bullets re-checked: base D-05 failure recorded, fix verified across the 4 targeted test files, probe/corpus attribution both zero-unexplained, whole-suite investigated and classified (see Deviations)

---
*Phase: 119-grammar-declare-file-paths-shared-channel-opening*
*Completed: 2026-09-28*
