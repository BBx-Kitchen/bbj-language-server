---
phase: 117-dependency-hygiene-dependabot-coverage
plan: "05"
subsystem: infra
tags: [langium, chevrotain, dependency-hygiene, external-repro, upstream-issue]

requires: []
provides:
  - "A standalone, bug-free npm project at /home/coder/repos/tmp/langium-44-regression-repro/ pinning langium 4.3.1 and 4.4.0 side by side via npm aliases, that builds a parser from a grammar string at runtime (no langium-cli) and measures parse timing, error counts and DEF FN completion labels for both versions"
  - "Documented, honest evidence that a toy grammar AND a structurally-faithful stripped subset of bbj.langium (72 statement alternatives, the real 7-level Expression precedence chain, the real MemberCall unclosed-call postfix loop) do NOT reproduce either regression the maintainer reported in PR #682/#684, measured through both raw LangiumParser.parse() and the full parseHelper document-build pipeline"
  - "Confirmation that the repro harness itself is sound: langium43 and langium44 load genuinely distinct, correctly-resolved chevrotain versions (12.0.0 and 13.2.0 respectively), ruling out a shared-dependency test-setup bug as the reason for non-reproduction"
affects: []

actuals:
  tokens: 8000
  tasks: 2
  commits: 0

tech-stack:
  added: []
  patterns:
    - "npm alias side-by-side version pinning (langium43: npm:langium@4.3.1, langium44: npm:langium@4.4.0) plus createServicesForGrammar to compare two versions of a library without langium-cli code generation or sibling subprojects"

key-files:
  created:
    - /home/coder/repos/tmp/langium-44-regression-repro/package.json (external artifact, not a repository file)
    - /home/coder/repos/tmp/langium-44-regression-repro/package-lock.json (external artifact, not a repository file)
    - /home/coder/repos/tmp/langium-44-regression-repro/toy.langium (external artifact, not a repository file)
    - /home/coder/repos/tmp/langium-44-regression-repro/bbj-subset.langium (external artifact, not a repository file)
    - /home/coder/repos/tmp/langium-44-regression-repro/repro.mjs (external artifact, not a repository file)
  modified: []

key-decisions:
  - "One project with two npm aliases (not sibling subprojects), per the plan's own planner assumption: createServicesForGrammar builds the parser from a grammar string at runtime, so langium-cli's alias-resolution limitation (flagged as a risk in 117-RESEARCH.md) never applies — no code generation is used at all"
  - "D-09's fallback was exercised fully: the toy grammar reproduced neither symptom, so a second grammar (bbj-subset.langium) was built, stripped from bbj-vscode/src/language/bbj.langium's real Statement alternation (72 alternatives, ExpressionStatement forced last) and its real 7-level Expression precedence chain (BinaryExpression -> RelationalExpr -> AdditiveExpr -> MultiplicativeExpr -> ExponentiationExpr -> PrefixExpression -> MemberCall -> PrimaryExpression), per the task's explicit instruction to take only what the failing symptoms need"
  - "Unary '+' was deliberately dropped from the subset's PrefixExpression rule (real grammar has '!'|'-'|'+') after it was found to make 'DEF fnIsText(...)=...+' ambiguous between DefFunction and the Statement/ExpressionStatement fallback at the Program level, in BOTH langium versions equally -- a grammar-authoring bug in the reduced subset, not evidence of either regression, and unrelated to the custom RPAREN_NL/RPAREN_NO_NL lexer split (not ported) that lets the real grammar carry '+' in both roles safely"
  - "Per the plan's own instruction ('If a symptom still shows no after the fallback, stop... return a blocker... for a user decision'), Task 3 was not executed: no ISSUE-DRAFT.md was written, because it would need measured current-behavior data for a regression this repro could not reproduce, and fabricating that data was out of the question"

requirements-completed: []

coverage:
  - id: D1
    description: "Task 1: a runnable external project pins langium 4.3.1 and 4.4.0 side by side with matching integrity hashes (4.3.1 against bbj-vscode's own lockfile, 4.4.0 against the npm registry's dist.integrity) and prints comparable parse timings for the maintainer's three unclosed-call inputs"
    requirement: DEP-05
    verification:
      - kind: other
        ref: "bash: Task 1's two <verify> commands (repro run + lockfile integrity cross-check against bbj-vscode/package-lock.json and the registry) both exit 0, see repro-task1.txt"
        status: pass
    human_judgment: false
  - id: D2
    description: "Task 2: the toy grammar and a structurally-faithful bbj.langium subset (72-alternative Statement rule, real 7-level Expression precedence chain, real MemberCall unclosed-call loop) were both measured for the parse-recovery slowdown and the lost DEF FN completion params; neither grammar reproduced either symptom, verified through both raw LangiumParser.parse() and the full parseHelper document-build pipeline, with the harness's version isolation (distinct chevrotain 12.0.0 / 13.2.0) independently confirmed"
    requirement: DEP-05
    verification:
      - kind: other
        ref: "bash: Task 2's own <verify> command (grep for 'slowdown=yes' and 'defFnParams=yes' in repro-final.txt) — run and confirmed to FAIL as designed, since the measured verdict is 'no' for both symptoms with every grammar tried"
        status: fail
    human_judgment: true
    rationale: "The plan's own action text designs for exactly this outcome ('return a blocker... for a user decision') when a symptom does not reproduce even with the D-09 fallback; whether to accept the honest negative result, attempt a larger-scale (non-subset) reconstruction, or close DEP-05's repro half as infeasible is a human call, not one this executor can make unilaterally"

duration: 40min
completed: 2026-09-28
status: halted
---

# Phase 117 Plan 05: Langium 4.4 regression repro — Summary

**Task 1 (side-by-side version pin) fully succeeded; Task 2's extensive grammar reconstruction (toy, then a structurally-faithful bbj.langium subset) did not reproduce either langium 4.4.0 regression from PR #682/#684, so Task 3 (ISSUE-DRAFT.md) was not written — this plan halts short of DEP-05's repro deliverable, per the plan's own built-in stop condition, and returns the finding for a human decision.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-28 (after 117-04 completed)
- **Completed:** 2026-09-28T17:09:15Z
- **Tasks:** 2 of 3 executed (Task 3 not started)
- **Files modified:** 0 repository files; 5 external files created under `/home/coder/repos/tmp/langium-44-regression-repro/`

## Accomplishments

- `/home/coder/repos/tmp/langium-44-regression-repro/` is a working, standalone npm project (`private: true`, `type: module`) that pins `langium43` (`npm:langium@4.3.1`) and `langium44` (`npm:langium@4.4.0`) as exact-version npm aliases in one `package.json`/`package-lock.json`, installed with `--ignore-scripts --no-audit --no-fund`. No `langium-cli` dependency exists anywhere in the project (`grep -c 'langium-cli' package.json` = 0).
- The 4.3.1 alias's lockfile integrity (`sha512-4lmkLHytLXD5pvyL0PKUj1LCNpgzv9s8luH+GbWXHG45QLmO6PlFXrCUghDN5BfcFTlaQyXpXiaSl8A28Xep8w==`) is byte-identical to `bbj-vscode/package-lock.json`'s own `node_modules/langium` entry; the 4.4.0 alias's integrity (`sha512-VFIFtohpsmJeQ+LkaeuUNtyvkklecklI0FSLxFS8JfiGABE9XCpUJwYUNnLk6C2aOyk0w99tNlvd0pmbJ2AW/w==`) matches the npm registry's published `dist.integrity` for `langium@4.4.0`. Both were re-verified at execution time (see repro-task1.txt).
- `npm run repro` (`node repro.mjs`) builds parser/LSP services for both versions from a grammar string via `createServicesForGrammar` — no code generation, so the container's Node 24 (which breaks `langium generate`) is a non-issue here. It runs in ~1 second, well under the 60-second budget.
- `repro.mjs` measures, for each of the maintainer's three unclosed-call inputs (`x$ = CVS(`, `CVS(a$`, `CVS(a$,`) and both langium versions: 1 warm-up parse + 3 measured `LangiumParser.parse()` calls, median wall-clock time and `parserErrors.length`. It separately builds a document for `DEF fnIsText(_f$,_t$)=_f$+` via `parseHelper` and requests completion at end-of-line through `services.lsp.CompletionProvider.getCompletion`, printing the sorted item labels for both versions.
- Per D-09, a second grammar (`bbj-subset.langium`) was built after the toy grammar (`toy.langium`) reproduced neither symptom — stripped from `bbj-vscode/src/language/bbj.langium`'s real `SingleStatement` alternation (72 keyword-first filler statements plus the real identifier-first `LetStatement`/`ExpressionStatement` pair, with `ExpressionStatement` forced last exactly as `bbj.langium`'s own comment requires) and its real 7-level `Expression` precedence chain (`BinaryExpression` → `RelationalExpr` → `AdditiveExpr` → `MultiplicativeExpr` → `ExponentiationExpr` → `PrefixExpression` → `MemberCall` → `PrimaryExpression`), including the real `MemberCall` postfix call loop (`'(' args ')'`) that the maintainer's inputs leave unclosed. `repro.mjs` runs both grammars in one `npm run repro` invocation and prints which grammar produced each verdict, as the task requires.
- **Neither grammar reproduced either symptom.** Full measured output is in `/home/coder/repos/tmp/phase-117/repro-final.txt`:
  - Toy grammar: `slowdown=no` (best observed ratio 0.2-0.3x, i.e. 4.4.0 was *faster*), `defFnParams=no` (both versions offer `[_f$, _t$]`).
  - bbj-subset grammar: `slowdown=no` (best observed ratio ~1.0x — both versions ~4.8-5.5ms per parse, 2 parser errors each, no differential at all), `defFnParams=no` (both versions offer `[_f$, _t$]`).
- Additional verification beyond the plan's own checks, run to rule out a test-harness bug rather than a real non-reproduction: (1) re-ran the unclosed-call probe through the **full `parseHelper` document-build pipeline** (parse + index + link, not just raw `LangiumParser.parse()`) in case the regression lives outside the bare parser — still no differential (ratios 0.94-1.06x); (2) confirmed `langium43` and `langium44` genuinely resolve **distinct, correctly-scoped chevrotain versions** (`node_modules/chevrotain` hoisted to 12.0.0 for `langium43`; `node_modules/langium44/node_modules/chevrotain` nested at 13.2.0 for `langium44`) — npm's nested-dedup handled the conflicting peer ranges correctly, so the lack of differential is not an artifact of both versions accidentally sharing one chevrotain install.

## Task Commits

No repository files were modified by Tasks 1-2 (all artifacts are external, under `/home/coder/repos/tmp/langium-44-regression-repro/` and `/home/coder/repos/tmp/phase-117/`, per D-08 and this plan's `files_modified: []`). Per this plan's shell rules, only this SUMMARY is committed to the repository, with plain `git -C /home/coder/repos/bbj-language-server commit` carrying the `Co-Authored-By` trailer.

**Plan metadata:** committed together with this SUMMARY (see below).

## Files Created/Modified

External (not repository files):
- `/home/coder/repos/tmp/langium-44-regression-repro/package.json` — private npm project, two exact-version aliases (`langium43`, `langium44`), `repro` script
- `/home/coder/repos/tmp/langium-44-regression-repro/package-lock.json` — kept on disk per D-08, both integrities verified
- `/home/coder/repos/tmp/langium-44-regression-repro/toy.langium` — minimal toy grammar (calls, one-line `DEF FN`, line-based statements); did not reproduce either symptom
- `/home/coder/repos/tmp/langium-44-regression-repro/bbj-subset.langium` — D-09 fallback grammar, structurally stripped from `bbj-vscode/src/language/bbj.langium`; did not reproduce either symptom
- `/home/coder/repos/tmp/langium-44-regression-repro/repro.mjs` — runs both grammars against both langium versions, prints per-grammar and overall `REPRO SUMMARY` lines

Scratch evidence (not repository files):
- `/home/coder/repos/tmp/phase-117/repro-task1.txt` — Task 1's measured output
- `/home/coder/repos/tmp/phase-117/repro-final.txt` — Task 2's final measured output (both grammars, both symptoms, both `no`)

Repository:
- `.planning/phases/117-dependency-hygiene-dependabot-coverage/117-05-SUMMARY.md` (this file) — the only repository change

## Decisions Made

- Kept the single-project, two-npm-alias structure per the plan's own "Planner assumptions" section, rather than the research doc's originally-recommended sibling subprojects — `createServicesForGrammar` avoids `langium-cli` entirely, so the alias-resolution risk that motivated the sibling-subproject recommendation never applies.
- Fixed two of my own grammar-authoring bugs during Task 2 before treating any measurement as evidence: (1) `FunctionParameter returns FunctionParameter: name=FeatureName;` (a self-typed return declaration) broke langium's cross-reference-property reflection ("Property symbol of type SymbolRef is not a reference") in **both** langium versions equally — fixed by dropping the redundant `returns FunctionParameter` clause; (2) including unary `+` in `PrefixExpression` (matching the real grammar's `'!'|'-'|'+'`) made the trailing `+` in `DEF fnIsText(_f$,_t$)=_f$+` ambiguous enough that the parser misidentified the whole statement as `ExpressionStatement` instead of `DefFunction`, again in **both** versions equally — fixed by dropping unary `+` only (kept `!` and `-`), documented inline in `bbj-subset.langium` with the reasoning (the real grammar's custom `RPAREN_NL`/`RPAREN_NO_NL` lexer split, deliberately not ported here, is what lets the real grammar reuse `+` safely in both roles).
- Did not write Task 3's `ISSUE-DRAFT.md`. The plan's own action text for Task 2 says "write Task 3's draft only for the reproduced symptom" and "return a blocker... for a user decision" when a symptom still shows `no` after the fallback grammar — with **zero** symptoms reproduced, there is no measured "current behavior" data for a draft to honestly report, and reusing the maintainer's own PR #682/#684 quotes as if they were this repro's own measured output would misrepresent what was actually observed.

## Deviations from Plan

None beyond what the plan itself anticipates and instructs for a non-reproduction outcome (Rule 4-equivalent: this is a designed stop, not an auto-fixable deviation). The two grammar bugs found and fixed during Task 2 (self-typed cross-reference target, unary `+` ambiguity) are documented above as part of reaching a trustworthy "no" rather than as Rule 1/2/3 auto-fixes to code this plan owns — they are bugs in my own throwaway repro grammar, not in this repository or in langium itself.

---

**Total deviations:** 0 (the grammar-authoring fixes above are process notes for the external, uncommitted repro artifact, not deviations from a repository-changing task)
**Impact on plan:** Task 3 not executed; DEP-05's repro deliverable is incomplete. DEP-05's Dependabot-hold half (117-02) is unaffected and remains complete.

## Issues Encountered

**The core finding: this repro attempt could not reproduce either langium 4.4.0 regression the maintainer described in PR #682/#684**, despite:
- A toy grammar (D-09's first step), and
- A structurally-faithful subset of the real `bbj.langium` grammar (D-09's fallback step) — matching the real grammar's alternation width (72 statement alternatives, `ExpressionStatement` forced last), its full 7-level `Expression` precedence chain, and its `MemberCall` unclosed-call postfix loop,
- measured through both the raw `LangiumParser.parse()` API (as the plan specifies) and, as an extra check, the full `parseHelper` document-build pipeline,
- with the test harness's own version isolation independently confirmed (distinct chevrotain 12.0.0 vs 13.2.0 resolved correctly by npm).

Both the maintainer's ~2.3s-vs-1-2ms parse-recovery slowdown and the DEF FN completion-parameter loss are absent in every measurement: the bbj-subset grammar's unclosed-call parses take ~4.8-5.5ms in **both** versions (no differential), and DEF FN completion offers `[_f$, _t$]` in **both** versions.

**Plausible reasons this reduced repro did not trigger the regression** (documented for whoever picks this up next, not verified further per the "do not tune inputs" prohibition):
1. The real `bbj-vscode` grammar is ~3x larger by rule count (207 rules vs this subset's ~90) with substantially more real statement bodies (each carrying `Err?`, `Mode?`, and similar optional trailing fragments this subset omits) — the actual cost driver during Chevrotain 13's changed error recovery may scale with a grammar complexity this subset still under-represents.
2. The real `DefFunction` rule's two-branch body (one-line vs multi-line, gated by the custom lexer's `RPAREN_NL`/`RPAREN_NO_NL` tokens) was deliberately not ported (per the "default lexer only" constraint) — the regression could specifically involve that disambiguation mechanism.
3. The maintainer's report came from `composer-codelens.test.ts` timing out inside the full `bbj-vscode` test suite, which exercises the real language server's incremental document-rebuild path on real, larger BBj files — not a fresh single-line parse of an isolated snippet, which is what both this repro and the plan's stated verification method measure.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**This plan halts before completing DEP-05's repro deliverable.** A human decision is needed on how to proceed:

1. **Accept the honest negative result.** Keep the external repro project as documented due-diligence (it disproves the "trivial to reproduce" hypothesis for a moderate-complexity reconstruction) and close DEP-05's repro half as not independently reproducible within this plan's scope — the maintainer's own first-hand PR #682/#684 comments (quoted in `117-RESEARCH.md`) remain the authoritative report; Dependabot already holds langium/langium-cli at 4.3 regardless (117-02, complete).
2. **Invest further effort** using a larger-scale grammar reconstruction (option 1 in "Plausible reasons" above) or porting the custom lexer's `RPAREN_NL`/`RPAREN_NO_NL` split (option 2) — both would deviate from D-09's "toy or stripped subset" instruction and this plan's "default lexer only" constraint, so would need explicit re-scoping.
3. **Something else** the human decides.

Per this plan's shell rules, **DEP-05 is NOT marked complete** in REQUIREMENTS.md — it stays open pending this decision (117-02's Dependabot half is already complete; this plan's repro half is not).

`/home/coder/repos/tmp/langium-44-regression-repro/` and `/home/coder/repos/tmp/phase-117/repro-*.txt` are left on disk, unfiled, ungit-ed, for inspection.

---
*Phase: 117-dependency-hygiene-dependabot-coverage*
*Completed: 2026-09-28*

## Self-Check: PASSED

- `/home/coder/repos/tmp/langium-44-regression-repro/package.json` FOUND
- `/home/coder/repos/tmp/langium-44-regression-repro/package-lock.json` FOUND
- `/home/coder/repos/tmp/langium-44-regression-repro/toy.langium` FOUND
- `/home/coder/repos/tmp/langium-44-regression-repro/bbj-subset.langium` FOUND
- `/home/coder/repos/tmp/langium-44-regression-repro/repro.mjs` FOUND
- `/home/coder/repos/tmp/phase-117/repro-task1.txt` FOUND
- `/home/coder/repos/tmp/phase-117/repro-final.txt` FOUND
- `bbj-vscode/node_modules/langium` version confirmed still `4.3.1`
- `bbj-vscode/package-lock.json` `node_modules/langium` version confirmed still `4.3.1`
- `bbj-vscode/package.json` still requests `"langium": "~4.3.1"`
- No repository files modified other than this SUMMARY.md
