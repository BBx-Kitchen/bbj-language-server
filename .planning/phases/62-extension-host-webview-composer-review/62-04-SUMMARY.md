---
phase: 62-extension-host-webview-composer-review
plan: 04
subsystem: review
tags: [code-review, textmate-grammar, cross-ide-parity, test-coverage, doc-accuracy, dedup]

# Dependency graph
requires:
  - phase: 60-baseline-resync-review-standards
    provides: INVENTORY.md (immutable review contract), Finding Standard, Applicability Grid
  - phase: 62-extension-host-webview-composer-review
    plan: 03
    provides: RU-62-03 fully swept (wave-3 predecessor per depends_on), phase-wide verdict count 21/40
provides:
  - "RU-62-05 (TextMate grammar & language configuration, 3 files / 256 LOC) fully swept across all 7 live dimensions, 8 findings recorded"
  - "P62-D2-006: bbj-language-configuration.json has 2 trailing commas making it invalid strict JSON"
  - "P62-D2-007: bbj.tmLanguage.json unconditionally mis-scopes every character inside a string literal as constant.character.escape.bbj instead of plain string content"
  - "P62-D2-008: a bare REM line is not recognized as a comment by the TextMate grammar though the language server's own lexer accepts it"
  - "P62-D2-009: the IOL=/LEN= keyword pattern's trailing \\B assertion is inverted and never fires when a value is attached, the only realistic usage"
  - "P62-D5-004/005: the existing dedicated TextMate tests did not catch the D2-tier defects above, and neither language-configuration.json file has any test coverage at all (no vscode-test-electron-style harness exists in this project)"
  - "P62-D7-002: VS Code's package.json omits .bbl from the \"bbj\" language's extensions array while IntelliJ's TextMate bundle manifest already includes it"
  - "P62-D8-001: CLAUDE.md's IDE Integration section names only bbj.tmLanguage.json as IDE-shared, stale since the #381 fix widened the shared set to 4 files"
  - "Confirmed #381 (config.bbx lost highlighting) is already fixed on this branch by commit 2489001, symmetric on both IDEs — every finding in this unit dedup-checked against it explicitly"
  - "syntaxes/ enumeration re-derived from the tree: bbx.tmLanguage.json is tracked/shipped but absent from INVENTORY's per-file table (observation only, no INVENTORY edit); gen-bbj.tmLanguage.json confirmed gitignored, unreferenced generated leftover"
affects: [62-05-plan, 63-02-plan, 67-fix-phase, 69-issue-drafting]

actuals:
  tokens: 22000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "62-COVERAGE.md recording shape inherited unchanged from plan 62-01 (D-03)"
    - "D2/D3 checks performed via live vscode-textmate+vscode-oniguruma tokenization (the same libraries the project's own textmate-highlighting.test.ts/textmate-bbx-highlighting.test.ts use) rather than pattern-reading alone — this is what surfaced all 4 D2 findings, none of which were visible from reading the JSON source alone"
    - "D7 two-part method: mechanical byte-diff of the copyTextMateBundle output (all 4 files identical) followed by a full read of both contribution manifests (bbj-vscode/package.json vs the IntelliJ TextMate bundle's package.json), redirecting the parity question from bytes to declarations once Part 1 ruled out byte divergence"
    - "D-14 syntaxes/ enumeration re-derived from the tree and cross-checked against .gitignore/git ls-files/package.json/BUNDLE_FILES rather than trusting INVENTORY's per-file table at face value"

key-files:
  created: []
  modified:
    - .planning/reviews/62-COVERAGE.md

key-decisions:
  - "P62-D2-006/007/008/009 all rated low/medium and classified easy — each is a single-file, single-purpose regex/JSON fix with an exact vitest-assertable reproduction, none touches grammar/LSP/public API"
  - "P62-D7-002 (.bbl missing from VS Code's package.json) filed with location: inside bbj-vscode/ per this plan's own D7 template, since IntelliJ's manifest is the more complete side here — the fix target is bbj-vscode/package.json, not one of this unit's 3 reviewed files, but package.json is inside bbj-vscode/ and was explicitly licensed reading for the D7 manifest comparison"
  - "Whether IntelliJ's built-in TextMate bundle importer actually honors a VS-Code-style filenames field (vs. STATE.md's now possibly-stale tech-debt note) cannot be confirmed without launching the IDE — referred to RU-63-02 rather than asserted either way"
  - "gen-bbj.tmLanguage.json recorded as a stated fact (gitignored, unreferenced, drifted keyword set, dangling #comments include into an empty repository) in the D4 cell rather than promoted to a finding, per the plan's own instruction to record its status as fact rather than assert dead code as a defect"
  - "bbx.tmLanguage.json's absence from INVENTORY's RU-62-05 per-file table (while Surface Accounting assigns the whole syntaxes/ directory to this unit) is surfaced as a prose observation only — INVENTORY not edited, no grid row added, 40-cell/22-file gate totals unchanged (D-14)"

patterns-established:
  - "Running the actual TextMate tokenizer (not just reading the grammar JSON) against realistic and adversarial inputs is what distinguishes a pattern that looks correct from one that is correct — every one of this unit's 4 D2 findings would have been missed by a read-only review"

requirements-completed: []  # RVW-02 remains open; RU-62-02 (plan 62-05) is the last unit needed to close it

coverage:
  - id: D1
    description: "RU-62-05 (bbj.tmLanguage.json, bbj-language-configuration.json, bbx-language-configuration.json — 3 files, 256 LOC) swept across all 7 live dimensions with 8 findings recorded (P62-D2-006..009, P62-D5-004..005, P62-D7-002, P62-D8-001), 0 not-reproducible dispositions, 2 cross-unit referrals to RU-63-02"
    requirement: "RVW-02"
    verification:
      - kind: other
        ref: "plan's own automated <verify> blocks for Task 1 (repro tier: D1/D2/D3/D7) and Task 2 (trace tier: D4/D5/D8) — both re-run clean except one deliberate sub-check (see Deviations); phase-wide gate 28 verdicts / 7 pending / 5 n/a / 40 total, matching plan-declared targets"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every D2 finding backed by a live vscode-textmate tokenization reproduction (not a pattern-reading assertion), with exact file:line and a runnable command"
    requirement: "RVW-06"
    verification:
      - kind: other
        ref: "each of P62-D2-006/007/008/009's evidence field names the exact command run and its literal output"
        status: pass
    human_judgment: false
  - id: D3
    description: "D7 parity assessed by a stated two-part method (mechanical byte-diff, then manifest-vs-manifest comparison) with literal command output recorded in the cell, not asserted"
    requirement: "RVW-02"
    verification:
      - kind: other
        ref: "acceptance grep confirming the D7 cell contains 'copyTextMateBundle', 'package.json', '#381', 'bbx-config', and 'RU-63-02'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every recorded finding carries all 13 required fields with a non-blank, explicit #381 dedup verdict, and no location resolves inside bbj-intellij/"
    requirement: "RVW-07"
    verification:
      - kind: other
        ref: "field-count parity check (26 findings phase-wide x 12 required fields, all equal counts = 26); grep -c for '#381' across the section; grep -c for bbj-intellij/ locations -> 0"
        status: pass
    human_judgment: false

duration: ~22min (session clock; substantial live-tokenization investigation preceded each commit)
completed: 2026-08-18
status: complete
---

# Phase 62 Plan 04: RU-62-05 (TextMate Grammar & Language Configuration) Summary

**Swept `bbj.tmLanguage.json`, `bbj-language-configuration.json`, and `bbx-language-configuration.json` (256 LOC, the phase's most genuine cross-IDE parity surface) across all 7 live dimensions using live `vscode-textmate` tokenization rather than reading the grammar JSON alone — surfacing 4 concrete, reproducible D2 tokenization/JSON-validity defects invisible from a static read (a JSON trailing-comma bug, every string-literal character mis-scoped as an escape sequence, a bare `REM` line not recognized as a comment, and the `IOL=`/`LEN=` keyword pattern never firing on its only realistic form), confirming open issue #381 is already fixed and symmetric on both IDEs, finding one genuine remaining VS Code-side `.bbl`-extension gap where IntelliJ's own manifest is already correct, and re-deriving the `syntaxes/` directory's true file count against INVENTORY's per-file table.**

## Performance

- **Duration:** ~22 min (session clock)
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/62-COVERAGE.md`)

## Accomplishments

- Swept `RU-62-05` at evidence tier `repro`/repro-equivalent across D1, D2, D3, D7, then at tier `trace` across D4, D5, D8 — all 7 live cells filled with a verdict and a written check line naming the concrete checks applied; the D6 cell's verbatim `n/a` carry-forward was left untouched.
- **D1 (pass):** checked `bbj.tmLanguage.json`'s and `bbx.tmLanguage.json`'s patterns for catastrophic-backtracking risk (no nested/unbounded quantifiers found in either grammar), confirmed no `include` resolves outside each file's own repository, and confirmed the two language-configuration files enable only documented, execution-free capabilities (comment markers, brackets, auto-closing/surrounding pairs, `onEnterRules` indent hints — no `folding` key in either file).
- **D2 (fail, 4 findings):** ran the actual TextMate tokenizer (`vscode-textmate`+`vscode-oniguruma`) against realistic inputs and found: (1) `bbj-language-configuration.json` has two trailing commas (lines 54, 100) making it invalid strict JSON — confirmed via `node -e "JSON.parse(...)"`, which this plan's own acceptance check also runs and which fails on this file (see Deviations) — `P62-D2-006`; (2) both string patterns in `bbj.tmLanguage.json` unconditionally include a catch-all escape rule with no trigger character, so every character inside any `"..."`/`'...'` string is mis-scoped `constant.character.escape.bbj` instead of plain string content, visible on virtually every line with a string literal — `P62-D2-007`; (3) a bare `REM` line (a valid, complete comment per the language server's own lexer, `bbj.langium:923`) is not recognized as a comment by the TextMate grammar, which hard-requires a trailing space/tab — `P62-D2-008`; (4) the `IOL=`/`LEN=` keyword sub-pattern's trailing `\B` assertion is inverted, so `IOL=5`/`LEN=80` — the only realistic form — never receive keyword highlighting — `P62-D2-009`. Also confirmed labels (`mylabel:`) and non-string `:`-continuation lines have completeness gaps (unscoped, but not mis-scoped) — checked and explicitly not filed, per D2's "wrong behavior" bar.
- **D3 (pass):** confirmed via live-timed adversarial-input tokenization (2000-char plain line, 2000-char string) that no pattern in either grammar is superlinear in line length; the P62-D2-007 mis-scoping's extra per-character token cost is bounded, not pathological, and filed under D2 not D3.
- **D4 (pass):** ran the mandated programmatic diffs (`bbj`/`bbx-language-configuration.json` and `bbj`/`bbx.tmLanguage.json`) and confirmed the differences are deliberate (different comment syntax, different bracket sets, `onEnterRules` only where REM doc-comments apply), not copy-paste drift. Confirmed `syntaxes/gen-bbj.tmLanguage.json` is a gitignored, unreferenced generated leftover (absent from `package.json`'s `contributes.grammars` and from `BbjTextMateBundleProvider.java`'s `BUNDLE_FILES`) with a keyword set that has drifted from the hand-maintained grammar and a dangling `#comments` include — recorded as fact, not filed as a defect since nothing loads it. Recorded the D-13 scope-fidelity note here: `RU-62-05` is swept in full despite ROADMAP's Phase 62 success criteria not naming it.
- **D5 (fail, 2 findings):** confirmed the 2 existing TextMate tests for `bbj.tmLanguage.json` (both scoped narrowly to the #107 multiline-string regression) did not catch any of the 4 D2 defects above, despite using the identical real-tokenizer mechanism that found them — `P62-D5-004`. Confirmed neither language-configuration file has any test coverage of any kind, and the project has no `@vscode/test-electron`-style harness capable of exercising VS Code's own consumption of these files' declared behaviors — `P62-D5-005`. Explicitly distinguished `example-files.test.ts`'s language-server parser coverage from TextMate grammar coverage (the two are disjoint surfaces).
- **D7 (fail, 1 finding):** ran the two-part parity method — mechanical `diff -q` confirmed all 4 files `copyTextMateBundle` copies into the IntelliJ bundle are byte-identical to their `bbj-vscode/` source; the manifest comparison then confirmed #381's fix (commit `2489001`, ancestor of the swept tree) is symmetric on both IDEs for `config.bbx`/`Config.bbx`/`config.min`/`Config.min` resolution, but found one genuine, newly-discovered divergence: VS Code's `package.json` omits `.bbl` from the `"bbj"` language's `extensions` array while IntelliJ's TextMate bundle manifest already includes it — `P62-D7-002`, located inside `bbj-vscode/` per this plan's D7 template. Re-derived the `syntaxes/` enumeration from the tree (`ls` -> 3 files) and surfaced, as an observation only, that `bbx.tmLanguage.json` is tracked/shipped/contributed but absent from INVENTORY's per-file table, while `gen-bbj.tmLanguage.json` is confirmed correctly excluded (gitignored generated output). Recorded 2 cross-unit referrals to `RU-63-02` for the two items that need the actual IDE running to confirm.
- **D8 (fail, 1 finding):** checked `CLAUDE.md`'s IDE Integration claim against the D7 Part 1 evidence and found it names only `bbj.tmLanguage.json` as shared, when 4 files actually are; confirmed via git blame the claim predates (2026-07-15) the #381 fix commit (2026-07-18) that widened the shared set, so the claim was accurate when written and has since gone stale — `P62-D8-001`.
- Recorded 0 not-reproducible dispositions and 2 cross-unit referrals to `RU-63-02` (both stemming from the D7 sweep).

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-62-05 at evidence tier `repro` — D1, D2, D3, D7** - `f09a5bb` (docs)
2. **Task 2: Complete RU-62-05 at evidence tier `trace` — D4, D5, D8** - `27236e3` (docs)

**Plan metadata:** commit created by this SUMMARY step (docs: complete plan)

## Files Created/Modified

- `.planning/reviews/62-COVERAGE.md` - `## RU-62-05 — TextMate grammar & language configuration` section only: all 7 live cells verdicted, 8 finding records, 0 not-reproducible dispositions, 2 cross-unit referrals. Header, grid, D-14 gate, stopping rule, exclusion-reason block, the other four unit sections, and `## Phase 62 Close-Out` were not touched.

## Decisions Made

- All 4 D2 findings, `P62-D7-002`, and `P62-D8-001` classified `easy` (single-file, vitest-testable, no API/grammar/LSP change); `P62-D5-005` classified `major` because closing its behavioral half needs new test infrastructure (`@vscode/test-electron`) this project does not have.
- `P62-D7-002`'s `location:` placed inside `bbj-vscode/package.json` (outside this unit's own 3-file list, but inside `bbj-vscode/` and explicitly licensed reading for the D7 manifest comparison) rather than deferred to `RU-64-02`, per this plan's own D7 template for VS-Code-side defects.
- The IntelliJ-side "does the TextMate bundle importer honor `filenames`" question and the "does LSP4IJ independently cover `.bbl`" question were both referred to `RU-63-02` rather than asserted, since neither is confirmable without launching the IDE (deferred infrastructure per `62-CONTEXT.md`).
- `gen-bbj.tmLanguage.json`'s dead/generated status recorded as a stated fact in the D4 cell, not promoted to a finding, per the plan's own instruction.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written; both tasks' actions were followed without deviation.

### Plan verification-script assumption invalidated by a genuine finding

**Task 1's `<verify>` block and the plan's overall `<verification>` block both assert that all three of this unit's JSON files parse via a bare `node -e "JSON.parse(...)"` call.** Running that exact check surfaced that `bbj-vscode/bbj-language-configuration.json` does **not** parse as strict JSON — it contains two trailing commas (confirmed, exact `file:line` cited) — which is precisely the D2 defect this plan's own action text asked Task 1 to check for and record ("Validate all three files parse as JSON ... and record the command used"). Because this is a genuine, pre-existing defect in a reviewed file, and this plan prohibits modifying any file under `bbj-vscode/` (Phase 67 is the only phase permitted to apply fixes), the file cannot be made to parse within this plan's scope. I ran Task 1's full `<verify>` script and confirmed every other assertion passes; only the JSON-parse sub-check for this one file fails, and it fails for the exact reason `P62-D2-006` documents. I did not weaken or omit the finding to make the automated check pass — RVW-06's drop-vs-disposition rule requires recording a genuine finding, not suppressing it to satisfy a verification script written before the defect was known. This is not a deviation in my own deliverable; it is the intended output of a correctness review discovering that one of its own written-in assumptions (the plan author had no reason to expect a `.json`-extension file inside this review's own scope to be invalid JSON) does not hold. No source file was touched to work around it.

## Issues Encountered

None beyond the verify-script assumption above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `62-COVERAGE.md` now has 4 of 5 Phase 62 units fully swept (`RU-62-04`, `RU-62-01`, `RU-62-03`, `RU-62-05`); phase-wide verdict count is 28/40, pending 7/40, `n/a` 5/40 — matching the D-14 gate's re-derived totals (35/5/40).
- Phase 67 inherits 6 `easy-fix` findings (`P62-D2-006..009`, `P62-D7-002`, `P62-D8-001`) and 2 `major-refactor`/`easy-fix`-mixed test-coverage findings (`P62-D5-004` easy, `P62-D5-005` major) ready to apply, all with exact `file:line` anchors and named edits.
- Phase 69 inherits an explicit `#381` dedup verdict (`none`, with reasoning) on all 8 findings from this surface, so ISSUE-04 has a decided answer rather than a re-triage.
- Phase 63 inherits 2 durable `RU-63-02` cross-unit referrals (STATE.md tech-debt currency, `.bbl` LSP4IJ coverage) to confirm once the IDE can be launched.
- Plan `62-05` (`RU-62-02`, wave 5, depends on this plan) is next — the final Phase 62 unit, which also performs the phase's D-14 gate re-derivation and closes out `## Phase 62 Close-Out`.

---
*Phase: 62-extension-host-webview-composer-review*
*Completed: 2026-08-18*
