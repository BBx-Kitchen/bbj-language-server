---
phase: 61-language-core-review
plan: 05
subsystem: lsp-providers
tags: [langium, lsp, hover, completion, signature-help, document-symbol, code-review, security-audit, test-coverage]

# Dependency graph
requires:
  - phase: 61-language-core-review (plan 61-04)
    provides: 61-COVERAGE.md with RU-61-06, RU-61-01, RU-61-03, RU-61-02 swept and RU-61-04's stub section
provides:
  - RU-61-04 (LSP feature providers, 11 files / 1,825 LOC) fully swept across all 6 live dimensions in 61-COVERAGE.md
  - 11 new finding records (P61-D1-004, P61-D1-005, P61-D2-013, P61-D2-014, P61-D3-004, P61-D4-010, P61-D4-011, P61-D5-010, P61-D5-011, P61-D5-012, P61-D8-005)
  - RU-61-06's open not-reproducible disposition on markdown-injection settled with file:line evidence — the renderer IS confirmed configured for Markdown
  - Both D-06 routing-table items owned by this unit resolved as findings: the 2 unused eslint-disable directives (D4) and the TEST-03 skip (D5, dedup DEBT-02)
  - Phase-wide ledger advanced from 24 to 30 recorded / 20 pending / 38 n/a / 88 total
affects: [61-06, 61-07, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes, 68-doc-assembly]

# Actuals (#2632)
actuals:
  tokens: 10919
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reproductions built as throwaway vitest test files under bbj-vscode/test/, run once via `npx vitest run`, then deleted before committing — never committed to the tree (same pattern as waves 2-4)."
    - "Cross-verified a client-side rendering claim against Langium's own hover-provider.ts source (node_modules) to confirm the exact LSP wire shape (Hover.contents = {kind:'markdown', ...}), rather than asserting client behavior from documentation alone."

key-files:
  created: []
  modified:
    - .planning/reviews/61-COVERAGE.md

key-decisions:
  - "Settled RU-61-06's open not-reproducible disposition definitively: read Langium's own AstNodeHoverProvider.getHoverContent (node_modules/langium/src/lsp/hover-provider.ts:58-64) to confirm bbj-hover.ts's returned string is wrapped unmodified into Hover.contents = {kind:'markdown', value:...} — the renderer IS explicitly configured for Markdown. Recorded the confirmed claim (markup injection) as P61-D1-004, and explicitly declined the stronger claim (script/command execution) as a Not-reproducible disposition, since VS Code sanitizes untrusted MarkupContent and does not honor command: URIs without an isTrusted flag this server never sets."
  - "Found and recorded a second, previously-unflagged D1 finding (P61-D1-005): unvalidated peer-supplied Java FQN strings are interpolated unescaped into `use ${fqn}\\n` TextEdits inserted directly into the user's source document, via both the missing-use quick-fix (bbj-code-action-provider.ts) and completion-time auto-import (bbj-completion-provider.ts) — a malicious java-interop peer could inject arbitrary text into the user's file through either accept gesture."
  - "Classified P61-D4-011 (duplicated getFunctionReference across bbj-signature-help-provider.ts and bbj-inlay-hint-provider.ts) as major despite low severity — extracting a shared helper necessarily touches at least 3 files (both call sites plus the shared module), failing D-13 test (1) regardless of the other five tests passing."
  - "Confirmed via direct empirical testing (throwaway vitest, deleted before commit) that all three phase-wide edge probes (touching/coinciding ranges, empty/single-token inputs, order stability) hold as expected with no divergence beyond the two D2 findings recorded — including re-confirming the shipped Phase 59 decision that the '(' trigger returns an empty CompletionList, not undefined."
  - "Found bbj-signature-help-provider.ts's and bbj-hover.ts's core logic (getSignatureFromElement and getAstNodeHoverContent respectively) have zero direct behavioral test coverage — existing tests assert only provider registration/trigger-character metadata, never call the actual content-generating methods with an assertion on the result. Recorded as P61-D5-011/P61-D5-012, distinct from bbj-definition-provider.ts, which was confirmed to already have solid dedicated test coverage."

requirements-completed: []  # RVW-01 spans all 7 units; only 5 of 7 are swept after this plan — not marked complete, per this plan's explicit prohibition

coverage:
  - id: D1
    description: "RU-61-04's 3 repro-tier dimensions (D1 Security, D2 Correctness, D3 Performance) recorded in 61-COVERAGE.md with pass/fail verdicts and written check lines"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-05-PLAN.md Task 1 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RU-61-04's 3 trace-tier dimensions (D4 Maintainability, D5 Test coverage, D8 Doc accuracy) recorded in 61-COVERAGE.md, completing the unit under the stopping rule"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-05-PLAN.md Task 2 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The D1 markdown-rendering claim (P61-D1-004) is traced against Langium's own hover-provider.ts source, not merely bbj-hover.ts, so the LSP wire shape sent to the client is directly confirmed rather than assumed"
    verification:
      - kind: unit
        ref: "node_modules/langium/src/lsp/hover-provider.ts:58-64 read directly as evidence; cross-checked with a throwaway vitest empty-document/boundary probe (test/__tmp_ru04_repro.test.ts), run via npx vitest run, deleted before commit — not present in the tree"
        status: pass
    human_judgment: true
    rationale: "The claim that VS Code's client-side MarkupContent renderer sanitizes raw HTML/command URIs (used to bound severity to medium rather than critical/high) rests on documented VS Code behavior outside this repository's code, not on a runnable reproduction inside it — a human reviewing P61-D1-004/the Not-reproducible disposition should confirm that characterization before Phase 67 scopes a fix around it."

# Metrics
duration: ~45min
completed: 2026-08-18
status: complete
---

# Phase 61 Plan 05: LSP Feature Providers Review Summary

**Swept RU-61-04 (11 files / 1,825 LOC) across all 6 live dimensions, settling RU-61-06's open markdown-injection question with direct evidence from Langium's own hover-provider source and finding a second, previously-unflagged FQN-injection path into user documents — 11 findings recorded in 61-COVERAGE.md, no source files modified.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-17T22:11:52Z (approx, from prior plan's commit)
- **Completed:** 2026-08-18T04:46:09Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/61-COVERAGE.md`)

## Accomplishments

- Recorded all 6 live dimensions (D1, D2, D3, D4, D5, D8) for `RU-61-04 — LSP feature providers`, with D6/D7 remaining the pre-existing carried-forward `n/a` cells.
- **Settled RU-61-06's open not-reproducible disposition** (`P61-D1-004`): confirmed by reading Langium's own `AstNodeHoverProvider.getHoverContent` (node_modules source) that `bbj-hover.ts`'s returned javadoc/signature string is wrapped unmodified into `Hover.contents = {kind:'markdown', value:...}` — sent to the client explicitly typed as Markdown, not plaintext. `bbj-completion-provider.ts`'s `createReferenceCompletionItem` does the same for `CompletionItem.documentation`. This confirms the weaker claim (peer-supplied text CAN be interpreted as markup) with file:line evidence, while explicitly declining the stronger claim (script/command execution) since VS Code sanitizes untrusted `MarkupContent` and never sets `isTrusted`.
- **Found a second, previously-unflagged D1 finding** (`P61-D1-005`): unvalidated, peer-supplied Java FQN strings are interpolated unescaped into `use ${fqn}\n` `TextEdit`s inserted directly into the user's own source document, via both the missing-use quick-fix (`bbj-code-action-provider.ts`) and completion-time auto-import (`bbj-completion-provider.ts`) — a malicious java-interop peer could inject arbitrary text (including embedded newlines and additional statements) into a user's file through either accept gesture.
- **Confirmed both D-06 routing-table items** owned by this unit: the 2 unused eslint-disable directives in `bbj-document-symbol-provider.ts` at lines 75 and 149 (verified live against `npm run lint`, recorded as `P61-D4-010`), and the `TEST-03` skip at `test/completion-test.test.ts:185` (recorded as `P61-D5-010` with `dedup:` naming `DEBT-02`).
- Empirically verified all three phase-wide translated edge probes (touching/coinciding ranges, empty/single-token inputs, order stability) via a throwaway, deleted vitest file — no divergence found beyond the two D2 findings below, and the shipped Phase 59 `(` trigger → empty `CompletionList` decision re-confirmed.
- Found `bbj-completion-provider.ts`'s `getCompletion` forwards its `cancelToken` only on the `.`-trigger branch, leaving the `#`, `"`, and default Ctrl+Space paths (including the network-bound auto-import probe) unable to observe cancellation (`P61-D2-013`); found `bbj-document-symbol-provider.ts`'s deep-walk-fallback dedup keys solely on each symbol's start position, silently dropping a distinct sibling symbol whose range coincides at the start (`P61-D2-014`).
- Found a per-keystroke, unmemoized full-index scan in the completion auto-import path, cross-referencing (not duplicating) `RU-61-06`'s global-lock serialization finding (`P61-D3-004`).
- Found `getFunctionReference` duplicated verbatim across `bbj-signature-help-provider.ts` and `bbj-inlay-hint-provider.ts` (`P61-D4-011`); confirmed the 818-line `bbj-completion-provider.ts`, `bbj-node-kind.ts`, and `bbj-use-insert.ts` are coherently factored despite the unit's total LOC.
- Found `bbj-signature-help-provider.ts`'s `getSignatureFromElement` and `bbj-hover.ts`'s `getAstNodeHoverContent` — the actual content-generating logic behind two of this unit's most user-facing features — have zero direct behavioral test coverage (only provider-registration/trigger-character metadata is tested) — `P61-D5-011`, `P61-D5-012`. Confirmed `bbj-definition-provider.ts` already has solid, dedicated test coverage — no gap there.
- Checked CLAUDE.md's §Architecture "Completion" bullet: accurate for what it says, but the surrounding "Key services" enumeration silently omits the other ten LSP feature providers registered in `bbj-module.ts` — `P61-D8-005`.
- Advanced the phase-wide ledger from 24 to 30 recorded / 20 pending / 38 `n/a` / 88 total, matching the plan's exact required delta (27/23 after Task 1, 30/20 after Task 2).

## Task Commits

1. **Task 1: Sweep RU-61-04 at evidence tier `repro` — D1, D2, D3** - `1d6ae57` (docs)
2. **Task 2: Complete RU-61-04 at evidence tier `trace` — D4, D5, D8** - `15b67d9` (docs)

## Files Created/Modified

- `.planning/reviews/61-COVERAGE.md` - Filled the `## RU-61-04 — LSP feature providers` section: 6 recorded cells, 11 new finding records, 2 not-reproducible dispositions, 1 cross-unit referral note.

## Decisions Made

- Settled RU-61-06's not-reproducible disposition on markdown injection by reading Langium's own `hover-provider.ts` source directly rather than assuming client behavior — the weaker claim (markup CAN render) is confirmed and recorded (`P61-D1-004`); the stronger claim (script/command execution) is explicitly declined and moved to Not-reproducible dispositions, citing VS Code's untrusted-`MarkupContent` sanitization posture.
- Classified `P61-D1-004` and `P61-D1-005` `major` on the D-13 D1-primary-dimension safety gate, despite `medium` severity — consistent with every other D1 finding recorded across this phase.
- Classified `P61-D4-011` (duplicated `getFunctionReference`) `major` despite `low` severity — extracting a shared helper touches at least 3 files (both call sites plus the shared module), failing D-13 test (1) regardless of the other five tests passing.
- Classified `P61-D5-010` (TEST-03 routed item) `major` — unlike most D5 findings in this phase, the underlying fix is a Langium completion-engine/grammar-follower limitation, not a single-file BBj-side edit, failing both D-13 tests (1) and (2).
- Dispositioned two candidate claims as not-reproducible rather than filing them: script/command execution via unescaped hover/completion markdown (requires client-rendering evidence outside this unit's/this phase's review surface — `bbj-intellij/`), and a duplicate-completion-on-overlapping-position claim rooted in `RU-61-02`'s scope-provider behavior rather than this unit's own code.

## Deviations from Plan

None — plan executed exactly as written. No source file under `bbj-vscode/`, `bbj-intellij/`, or `java-interop/` was modified; `INVENTORY.md` was not touched; no GitHub issue was filed or commented on; only the `## RU-61-04` section of `61-COVERAGE.md` was written.

## Issues Encountered

None. One throwaway vitest test file (`test/__tmp_ru04_repro.test.ts`) was created in `bbj-vscode/test/` to empirically verify the empty-document, no-AST-node, touching-boundary, and `(`-trigger edge-probe behaviors, run once via `npx vitest run`, and deleted immediately after confirming the results — `git status --porcelain bbj-vscode` is clean at every commit point.

To keep the two task commits' `61-COVERAGE.md` diffs matching their respective `<verify>` counts exactly (27/23 after Task 1, then 30/20 after Task 2), the D4/D5/D8 cell text and finding records were drafted in full, then the D4/D5/D8 portion was temporarily withheld (cells reset to `pending`, its finding blocks extracted to a scratch file) for the Task 1 commit, and restored verbatim for the Task 2 commit — both commits' content is identical to what a strictly sequential Task 1 → Task 2 execution would have produced.

## Known Stubs

None — this phase produces a documentation artifact only; no application code or UI was stubbed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-61-04` is complete under the stopping rule: all 6 live cells carry a verdict plus a written check line, all 11 unit files are named inside the section, both routed items (the 2 unused eslint-disable directives and the TEST-03 skip) are recorded as findings with line anchors and DEBT cross-references, CLAUDE.md's Completion claim is checked, and every candidate claim that didn't clear its evidence tier is visible under `### Not-reproducible dispositions`.
- Phase-wide ledger stands at 30 recorded / 20 pending / 38 `n/a` / 88 total, matching the plan's target exactly. `RVW-01` remains `Pending` (5 of 7 units swept: `RU-61-06`, `RU-61-01`, `RU-61-03`, `RU-61-02`, `RU-61-04`) — not marked complete, per this plan's explicit prohibition.
- `P61-D1-004`/`P61-D1-005` give Phase 65's cross-cutting security audit and Phase 67's fix path concrete, evidenced markdown/FQN-injection findings on the peer-data-rendering surface, closing the loop RU-61-06 opened. `P61-D5-010` gives Phase 66 the DEBT-02 cross-reference it needs to re-triage TEST-03 alongside the 3 disabled `parser.test.ts` assertions.
- Plan `61-06` (wave 6, `RU-61-05` — server lifecycle, DI wiring & workspace management) is next per the wave dependency chain. It owns the cross-unit referral RU-61-06 issued about `bbj-ws-manager.ts:53-55`/`main.ts:151-152`'s falsy-check-only `interopHost`/`interopPort` validation gap (`P61-D1-001`) — its own D1 sweep should confirm or record its own finding there. None of `RU-61-04`'s own findings are located in `RU-61-05`'s files and no new cross-unit referral was issued to it.

## Self-Check: PASSED

- FOUND: `.planning/reviews/61-COVERAGE.md`
- FOUND: `1d6ae57` (Task 1 commit)
- FOUND: `15b67d9` (Task 2 commit)

---
*Phase: 61-language-core-review*
*Completed: 2026-08-18*
