---
phase: 117-dependency-hygiene-dependabot-coverage
plan: "06"
subsystem: infra
tags: [langium, chevrotain, dependency-hygiene, external-repro, upstream-issue, gap-closure]

requires:
  - phase: 117-dependency-hygiene-dependabot-coverage
    provides: "117-05's honest negative result (toy grammar + structurally-faithful bbj-subset grammar reproduced neither langium 4.4.0 symptom) and D-13's top-down pivot decision"
provides:
  - "A standalone, non-git scratch project at /home/coder/repos/tmp/langium-44-topdown-repro/ that copies bbj-vscode's real, unmodified language-server sources via `git archive` into two sibling copies (langium-4.3/, langium-4.4/), generates each copy with its own langium-cli, and confirms BOTH langium 4.4.0 regressions from PR #682/#684 against the real server: the parse-recovery slowdown on an unclosed call (~2s vs ~1.5ms, 2 vs 1 parser errors) and the lost DEF FN completion params (_f$/_t$ present on 4.3.1, absent on 4.4.0)"
  - "A fixed, pre-declared reduction ladder (STRIP-LOG.md) that strips the real server down per symptom while the verdict stays yes: slowdown keeps raw-parse/parser-only/default-parser-factory/default-lexer/default-value-converter/runtime-grammar/omit:shared (rejects default-token-builder); DEF FN additionally sheds default-token-builder too, ending on pure Langium defaults plus the reduced grammar"
  - "A reduced grammar (grammar/bbj-min.langium, 181 -> 59 parser rules, 0 unreachable) and a packaged minimal/ deliverable (two sibling subprojects, each depending on exactly `langium` at one exact version, plus one esbuild-transpiled BBjTokenBuilder class) whose `npm run repro` reproduces both symptoms in ~4 seconds"
  - "ISSUE-DRAFT.md in langium's own bug-report template, with measured current/expected behavior for both symptoms, not filed"
  - "DEP-05 marked complete in REQUIREMENTS.md"
affects: []

actuals:
  tokens: 210000
  tasks: 3
  commits: 0

tech-stack:
  added: []
  patterns:
    - "Top-down repro (D-13): copy the real, unmodified language-server sources with `git archive` into sibling langium-4.3/langium-4.4 copies (each with its own langium-cli-generated files), confirm against the real server first, then strip down along a fixed, pre-declared ladder — the opposite order from 117-05's bottom-up toy/subset-grammar attempt, which reproduced neither symptom"
    - "Reduction-flag harness: probe.ts composes services via `inject()`/`createServicesForGrammar` with named flags (omit:<group>, parser-only, default-<piece>, runtime-grammar, no-recovery) selected at the CLI, letting one probe script represent every rung of the ladder without hand-editing source between runs"
    - "spliceToken hardcoded-terminal-name gate: BBjTokenBuilder.reorderTokenPriorities calls spliceToken(tokens, name) unconditionally for 15 hardcoded terminal names and throws if one is unreachable — this, not \"used by the fixed inputs\", is what actually bounds how far SingleStatement can be delta-debugged while the real token builder stays in the composition"
    - "Minimal-package pinning: a subproject depending on only `langium` at an exact version is not fully pinned — langium's own transitive `chevrotain-allstar` range (~0.4.3 / ~0.5.0) can resolve a newer patch that changes parse behavior on its own; pin it explicitly to the exact version the real tree resolves, confirmed via a working-vs-broken A/B (tsx-compiled source vs esbuild-transpiled class, R's full node_modules vs minimal's bare one) that isolated the drift to this one transitive dependency"

key-files:
  created:
    - /home/coder/repos/tmp/langium-44-topdown-repro/ (external artifact — package.json, run-repro.mjs, langium-4.3/, langium-4.4/, grammar/, STRIP-LOG.md, final-flags.json, minimal/, README.md, ISSUE-DRAFT.md; not repository files)
  modified:
    - .planning/REQUIREMENTS.md (DEP-05 checkbox + traceability row marked Complete)

key-decisions:
  - "Both langium 4.4.0 regressions reproduce with the real, unmodified bbj-vscode language server (Task 1), settling 117-05's open question: the earlier toy/subset-grammar attempts failed not because the regressions don't exist, but because they needed real structures (recovery-on parsing, case-insensitive keyword-as-ID categorization, the real 72-alternative-then-reduced SingleStatement, the real completion pipeline) the reduced grammars hadn't reconstructed"
  - "The two symptoms' reduction ladders diverge on exactly one flag (default-token-builder: rejected for slowdown, kept for DEF FN); since probe.ts's --only always tests one symptom per invocation regardless of flag overlap, one shared grammar file (grammar/bbj-min.langium) checked against each symptom's own kept flags at every step was used rather than two separate grammar files, per this executor's reading of the plan's 'same parser-level flags' clause"
  - "The DEF FN completion-parameter loss reproduces with Langium's own stock DefaultCompletionProvider, not BBjCompletionProvider — it is a langium-core regression, not a BBj-specific completion bug, confirmed by the DEF FN ladder shedding every custom BBj service including the token builder and still reproducing"
  - "The slowdown symptom's magnitude shrinks substantially through reduction (~2000-2400ms on the full 1200-line grammar down to ~90-125ms on the 59-rule reduced grammar) while still clearing the fixed threshold (>=10x ratio AND >=100ms absolute) on repeated runs; reported honestly as measurement-sensitive at this reduction level rather than tuned"

requirements-completed: [DEP-05]

coverage:
  - id: D1
    description: "Task 1: the real, unmodified BBj language server (two langium-cli-generated sibling copies, langium 4.3.1 and langium 4.4.0) reproduces both maintainer-reported regressions — parse-recovery slowdown and lost DEF FN completion params — with measured numbers, corroborated by the maintainer's own two failing test suites"
    requirement: DEP-05
    verification:
      - kind: other
        ref: "bash: Task 1's four <verify> commands (full-run REPRO SUMMARY with 12 timing + 4 completion rows, lockfile integrity cross-check, source/probe.ts identity check, vitest corroboration on both copies) all exit 0 — see topdown-full.txt, topdown-vitest-4.3.json, topdown-vitest-4.4.json"
        status: pass
    human_judgment: false
  - id: D2
    description: "Task 2: a fixed, pre-declared reduction ladder strips the real server down per symptom (STRIP-LOG.md, 19+ rung/check rows) while each verdict stays yes, down to a reduced grammar (181 -> 59 parser rules) that still reproduces both symptoms in one all-inputs run"
    requirement: DEP-05
    verification:
      - kind: other
        ref: "bash: Task 2's two <verify> commands (reduced-variant all-inputs run keeps both symptoms; final-flags.json + STRIP-LOG.md structural checks) both exit 0 — see topdown-reduced.txt, STRIP-LOG.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "Task 3: the deliverable (minimal/, two sibling subprojects each depending on exactly one langium version plus one esbuild-transpiled class) reproduces both symptoms in ~4 seconds; ISSUE-DRAFT.md and README.md are written; DEP-05 marked complete; no repository file outside .planning/ changed; nothing filed upstream"
    requirement: DEP-05
    verification:
      - kind: other
        ref: "bash: Task 3's four <verify> commands (deliverable all-inputs run keeps both symptoms; core/ identity + minimal lockfile integrity; ISSUE-DRAFT.md template-field + hygiene checks; full repo-hygiene check against the base commit) all exit 0 — see topdown-deliverable.txt, ISSUE-DRAFT.md, README.md"
        status: pass
    human_judgment: false

duration: 33min
completed: 2026-09-28
status: complete
---

# Phase 117 Plan 06: Langium 4.4 top-down regression repro (gap closure) Summary

**Both langium 4.4.0 regressions from the closed Dependabot PRs — the parse-recovery slowdown on an unclosed call and the lost DEF FN completion parameters — reproduce with the real, unmodified BBj language server, then strip down to a 59-rule reduced grammar and a ~4-second minimal deliverable, closing DEP-05's repro half that 117-05 left open.**

## Performance

- **Duration:** ~33 min
- **Started:** 2026-09-28T17:41:00Z (approx.)
- **Completed:** 2026-09-28T18:14:00Z (approx.)
- **Tasks:** 3 of 3
- **Files modified:** 1 repository file (`.planning/REQUIREMENTS.md`); the rest is entirely external, under `/home/coder/repos/tmp/langium-44-topdown-repro/` and `/home/coder/repos/tmp/phase-117/`

## Accomplishments

- **Task 1 — real-server confirmation.** Two sibling copies of bbj-vscode's committed language-server sources (`git archive`, no repository writes), each generated by its own `langium-cli` (4.3.0 / 4.4.0, no Node-22 fallback needed — both generators ran cleanly). `npm run full` runs the unmodified server (`createBBjTestServices`, the real `BBjCompletionProvider`, the real lexer/token-builder/parser) against six unclosed-call inputs and two `DEF FN` documents on both langium versions:
  ```
  REPRO SUMMARY: slowdown=yes (input "x$ = CVS(": 4.3.1=1.534ms, 4.4.0=2086.63ms, ratio=1360.3x); defFnParams=yes (4.3.1: [_f$, _t$] of 7 items, 4.4.0: [] of 5 items)
  ```
  Corroborated by the maintainer's own two failing test files run under vitest on both copies: 4.3.1 passes 63/63, 4.4.0 fails exactly the two named tests (`composer-codelens`'s unfinished-call case, `completion-test`'s single-line DEF FN case).
- **Task 2 — fixed reduction ladder.** Per symptom, a pre-declared, run-once ladder of service-composition flags (`raw-parse`, `parser-only`, `default-parser-factory`, `default-lexer`, `default-value-converter`, `default-token-builder`, `runtime-grammar`, `omit:shared`, plus `no-recovery` as a diagnostic) stripped the composition down: slowdown rejected only `default-token-builder`; DEF FN kept every reduction, ending on pure Langium defaults. A companion grammar reduction (`grammar/bbj-runtime.langium` -> `grammar/bbj-min.langium`) cut 181 parser rules to 59 (0 unreachable), bounded by `BBjTokenBuilder`'s own hardcoded 15-terminal-name `spliceToken` gate (two reduction attempts crashed on this before the third succeeded). The reduced configuration's all-inputs run still reproduces both symptoms:
  ```
  REPRO SUMMARY: slowdown=yes (input "x$ = CVS(": 4.3.1=0.821ms, 4.4.0=113.591ms, ratio=113.6x); defFnParams=yes (4.3.1: [_f$, _t$] of 5 items, 4.4.0: [] of 3 items)
  ```
- **Task 3 — deliverable, README, draft.** Because both symptoms' final flags include `parser-only` and `runtime-grammar`, the `minimal/` package was built: two sibling subprojects each depending on exactly one `langium` version, plus one esbuild-transpiled class (`BBjTokenBuilder`, needed only for the slowdown symptom — DEF FN needs no custom class at all). `cd minimal && npm run setup && npm run repro` reproduces both symptoms in ~4 seconds (target: under a minute):
  ```
  REPRO SUMMARY: slowdown=yes (input "x$ = CVS(": 4.3.1=0.891ms, 4.4.0=124.978ms, ratio=125.0x); defFnParams=yes (4.3.1: [_f$, _t$] of 5 items, 4.4.0: [] of 3 items)
  ```
  `README.md` and `ISSUE-DRAFT.md` (langium's own bug-report template, measured numbers, no planning ids, PR numbers, or local paths) are written; nothing is filed. DEP-05 is marked complete in `REQUIREMENTS.md`.

## Task Commits

No repository source files were modified by Tasks 1-3 (all artifacts are external, under `/home/coder/repos/tmp/langium-44-topdown-repro/` and `/home/coder/repos/tmp/phase-117/`, per D-08 and this plan's `files_modified: []`). Per this plan's shell rules, only this SUMMARY plus the standard planning-state updates (`REQUIREMENTS.md`, `STATE.md`, `ROADMAP.md`) are committed to the repository, with plain `git -C /home/coder/repos/bbj-language-server commit` carrying the `Co-Authored-By` trailer.

**Plan metadata + REQUIREMENTS.md:** committed together with this SUMMARY (see below).

## Files Created/Modified

External (not repository files):
- `/home/coder/repos/tmp/langium-44-topdown-repro/package.json`, `run-repro.mjs` — top-level driver, `full`/`variant`/`repro` scripts
- `/home/coder/repos/tmp/langium-44-topdown-repro/langium-4.3/`, `langium-4.4/` — sibling full-server copies (archived sources, own `package.json`/`package-lock.json`, own `langium-cli`-generated files, byte-identical `probe.ts`; `grammar-stats.mjs` in the 4.3 copy only)
- `/home/coder/repos/tmp/langium-44-topdown-repro/grammar/bbj-runtime.langium`, `bbj-min.langium` — the real grammar with `java-types` inlined, then reduced 181 -> 59 parser rules
- `/home/coder/repos/tmp/langium-44-topdown-repro/STRIP-LOG.md`, `final-flags.json` — every ladder rung and grammar-reduction check; the kept configuration per symptom
- `/home/coder/repos/tmp/langium-44-topdown-repro/minimal/` — the packaged deliverable (two sibling subprojects, one esbuild-transpiled class, `run.mjs`)
- `/home/coder/repos/tmp/langium-44-topdown-repro/README.md`, `ISSUE-DRAFT.md` — how to run every stage; the upstream draft, not filed
- `/home/coder/repos/tmp/phase-117/topdown-base.txt`, `topdown-generated-diff.txt`, `topdown-full.txt`, `topdown-vitest-4.3.json`/`.log`, `topdown-vitest-4.4.json`/`.log`, `topdown-reduced.txt`, `topdown-deliverable.txt` — scratch evidence

Repository:
- `.planning/REQUIREMENTS.md` — DEP-05 marked Complete (checkbox + traceability row)
- `.planning/phases/117-dependency-hygiene-dependabot-coverage/117-06-SUMMARY.md` (this file)

## Decisions Made

See `key-decisions` in the frontmatter. In brief: both regressions reproduce with the real server (settling 117-05's open question); one shared grammar file serves both symptoms' diverging kept-flag sets; the DEF FN loss is a langium-core regression, not BBj-specific; the reduced/deliverable slowdown magnitude is reported honestly as smaller and closer to the noise floor than the full server's, not tuned.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `chevrotain-allstar` version drift silently broke the minimal deliverable's 4.3.1 baseline**
- **Found during:** Task 3 (building and first-testing `minimal/`)
- **Issue:** `minimal/langium-4.3/package.json` declared only `"langium": "4.3.1"`. With no lockfile to pin against on first install, npm resolved langium's own transitive `chevrotain-allstar` range (`~0.4.3`) to `0.4.4` instead of the real tree's `0.4.3`. That one patch version changed how a pre-existing, unrelated grammar ambiguity in `PrimaryExpression` resolves, making 4.3.1 *also* show the "broken" behavior (2 parser errors, ~100ms instead of 1 error, <1ms) — which would have been a false positive misattributing an unrelated `chevrotain-allstar` change to langium itself.
- **Fix:** Diagnosed via a targeted A/B (tsx-compiled source vs esbuild-transpiled class; `R`'s full node_modules vs `minimal`'s bare one) that isolated the drift to this one transitive dependency, confirmed by directly diffing `chevrotain-allstar` versions between the two node_modules trees. Pinned `chevrotain-allstar` to the exact version each langium version's real tree resolves (`0.4.3` for 4.3.1, already-correct `0.5.0` for 4.4.0) via `npm install --save-exact chevrotain-allstar@0.4.3` in `minimal/langium-4.3/package.json`, confirmed to survive `npm ci`.
- **Files modified:** `/home/coder/repos/tmp/langium-44-topdown-repro/minimal/langium-4.3/package.json`, `package-lock.json` (external artifacts only)
- **Verification:** Re-ran `minimal/`'s `npm run repro` — 4.3.1 returned to the correct fast/1-error baseline on all six inputs; re-ran 3 additional times to confirm stability
- **Committed in:** N/A (external artifact only; documented here, not in a repository commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug, in the external scratch deliverable's own dependency pinning, not in this repository)
**Impact on plan:** Necessary for the deliverable to be a faithful, deterministic reproduction rather than an artifact of unpinned transitive-dependency drift. No scope creep — this is exactly the kind of fidelity issue Task 3's own dependency-pinning intent (D-08) exists to prevent, just discovered one level deeper (a transitive dependency of the one direct dependency, `langium`, itself) than the plan's literal text anticipated.

## Issues Encountered

None beyond the deviation documented above. One additional due-diligence check beyond the plan's literal fixed rung order: `omit:shared` was tested on top of both symptoms' final kept flags (Task 2, STRIP-LOG check 15) before Task 3 packaging, since the plan's Task 3 precondition text ("the kept pieces are BBj parser-level classes") implied `BBjSharedModule` was already excluded, but the fixed ladder's rung order (which only falls back to per-group omission if `parser-only` is rejected) never actually tested it. Both symptoms kept `omit:shared`, folded into `final-flags.json`, and re-verified with Task 2's own `<verify>` commands before proceeding — this is not a change to the fixed ladder's rung order or verdict rules, only an additional confirmed reduction found before packaging.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **DEP-05 is complete.** Both langium 4.4.0 regressions from PR #682/#684 are independently reproduced against the real, unmodified language server, reduced to a 59-rule grammar, and packaged into a ~4-second deliverable with a ready-to-file `ISSUE-DRAFT.md`. Filing upstream still needs the maintainer's explicit approval (per D-08/D-10) — nothing was filed by this plan.
- Dependabot (117-02, already complete) continues to hold `langium`/`langium-cli` at 4.3.x; `bbj-vscode` is untouched and still runs 4.3.1.
- Phase 117 requirements (DEP-01, DEP-02, DEP-04, DEP-05, CI-04) are now all complete.
- `/home/coder/repos/tmp/langium-44-topdown-repro/` (this plan's deliverable) and the earlier `/home/coder/repos/tmp/langium-44-regression-repro/` (117-05's honest-negative attempt) are both left on disk, unfiled, ungit-ed, for inspection.

---
*Phase: 117-dependency-hygiene-dependabot-coverage*
*Completed: 2026-09-28*

## Self-Check: PASSED

- `/home/coder/repos/tmp/langium-44-topdown-repro/README.md` FOUND
- `/home/coder/repos/tmp/langium-44-topdown-repro/ISSUE-DRAFT.md` FOUND
- `/home/coder/repos/tmp/langium-44-topdown-repro/STRIP-LOG.md` FOUND
- `/home/coder/repos/tmp/langium-44-topdown-repro/final-flags.json` FOUND
- `/home/coder/repos/tmp/langium-44-topdown-repro/run-repro.mjs` FOUND
- `/home/coder/repos/tmp/langium-44-topdown-repro/minimal/run.mjs` FOUND
- `/home/coder/repos/tmp/langium-44-topdown-repro/grammar/bbj-min.langium` FOUND
- `/home/coder/repos/tmp/phase-117/topdown-full.txt`, `topdown-reduced.txt`, `topdown-deliverable.txt` FOUND
- `bbj-vscode/node_modules/langium` version confirmed still `4.3.1`
- `bbj-vscode/package.json` still requests `"langium": "~4.3.1"`
- `git -C bbj-language-server status --porcelain -- bbj-vscode` confirmed empty
- `.planning/REQUIREMENTS.md` diff confirmed only DEP-05 flipped (checkbox + traceability row)
- `git -C langium-44-topdown-repro rev-parse --git-dir` confirmed not a git repository
- `gh issue list --repo eclipse-langium/langium --author @me --search "created:>=2026-09-28"` confirmed 0 issues filed
