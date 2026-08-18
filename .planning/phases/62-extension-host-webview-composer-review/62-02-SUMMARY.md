---
phase: 62-extension-host-webview-composer-review
plan: 02
subsystem: review
tags: [security-review, command-injection, code-review, cross-ide-parity]

# Dependency graph
requires:
  - phase: 60-baseline-resync-review-standards
    provides: INVENTORY.md (immutable review contract), Finding Standard, Applicability Grid
  - phase: 62-extension-host-webview-composer-review
    plan: 01
    provides: 62-COVERAGE.md skeleton, RU-62-04 fully swept, D-09 disclosure tier approved and frozen
provides:
  - "RU-62-01 (extension host & commands) fully swept across all 7 live dimensions, 9 findings recorded"
  - "P62-D1-003 (critical): OS command injection via unescaped child_process.exec() interpolation of workspace-configurable settings across Commands.cjs and extension.ts, rendered per the frozen D-09 disclosure tier"
  - "P62-D7-001: VS Code's shell-string exec() vs IntelliJ's array-based GeneralCommandLine, recorded as a VS Code-side D7 finding; 3 cross-unit referrals addressed to RU-63-01 for IntelliJ-side capability gaps"
affects: [62-03-plan, 62-04-plan, 62-05-plan, 63-01-plan, 65-cross-cutting-security-audit, 67-fix-phase]

actuals:
  tokens: 13700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "62-COVERAGE.md recording shape and D-09 disclosure tier inherited unchanged from plan 62-01 (D-03) — critical/high D1 findings name surface/problem-class/impact only; everything else gets full concrete detail"
    - "Mechanical structural diff (git diff --no-index --numstat) applied to two Promise-wrapped-exec blocks within the same file (extension.ts's EM-validate vs EM-login) to evidence in-file D4 duplication, extending RU-62-04's cross-file diff technique to a within-file comparison (D-12)"
    - "D7 parity assessed by reading bbj-intellij/actions/ as comparison-only reference material (D-05): VS Code-side defects become P62-D7-* findings located inside bbj-vscode/; IntelliJ-side gaps become Cross-unit referrals to RU-63-01"

key-files:
  created: []
  modified:
    - .planning/reviews/62-COVERAGE.md

key-decisions:
  - "P62-D1-003 rated critical and rendered per the frozen D-09 two-tier disclosure rule — names the surface (7 exec() call sites across Commands.cjs/extension.ts), the problem class (CWE-78 OS command injection via unescaped workspace-settable config, plus a params.fsPath/cross-extension-command path), and the impact, without a trigger sequence, payload, or proof-of-concept"
  - "Split the credential-exposure observation (EM token passed as literal exec() argv, plus fragile substring-based output-channel masking) into its own finding (P62-D1-004, medium) rather than folding it into P62-D1-003, since it is a distinct failure mode (information disclosure vs. RCE) even though both share the same unescaped-interpolation root cause"
  - "IntelliJ's BbjCompileAction.java is an unimplemented TODO stub with no real bbjcpl invocation, and 6 VS Code commands (bbj.configureCompileOptions, bbj.denumber/decompile/decompileReadonly, bbj.em) have no IntelliJ counterpart at all — both are IntelliJ-side capability gaps, routed to RU-63-01 as Cross-unit referrals per D-05 rather than recorded as P62-D7-* findings"
  - "One D2 finding (P62-D2-004, client.start() unhandled rejection) classified easy rather than major — the only finding in this unit where all six D-13 tests pass, since it is single-file, non-D1, and low-severity"

patterns-established:
  - "A within-file mechanical diff (not just cross-file) is a valid D4 duplication-evidence technique when two near-identical blocks live in the same source file, extending D-12's method beyond RU-62-04's cross-file-only precedent"

requirements-completed: []  # RVW-02/RVW-03 span all 5 Phase 62 units; 2 of 5 (RU-62-04, RU-62-01) are now swept — not marked complete, per the RVW-01/Phase-61 precedent (only the final unit's plan flips the checkbox)

coverage:
  - id: D1
    description: "RU-62-01 (extension.ts 894 LOC, Commands/CompilerOptions.ts 506 LOC, Commands/Commands.cjs 405 LOC — 1,805 LOC total) swept across all 7 live dimensions with 9 findings recorded (P62-D1-003..004, P62-D2-002..004, P62-D7-001, P62-D4-002..003, P62-D5-002), 1 not-reproducible disposition, 3 cross-unit referrals to RU-63-01"
    requirement: "RVW-02"
    verification:
      - kind: other
        ref: "plan's own automated <verify> blocks for Task 1 (repro tier: D1/D2/D3/D7) and Task 2 (trace tier: D4/D5/D8) — both re-run clean; phase-wide gate 14 verdicts / 21 pending / 5 n/a / 40 total, matching plan-declared targets"
        status: pass
    human_judgment: false
  - id: D2
    description: "P62-D1-003 (critical) recorded a concrete, evidenced OS command-injection finding on the VS Code process-spawn surface rather than deferring to Phase 65 (D-07) — every child_process.exec() call site in the unit was traced to its unescaped inputs"
    requirement: "RVW-06"
    verification:
      - kind: other
        ref: "acceptance grep confirming the D1 cell names child_process and does not contain the string 'see Phase 65'; grep confirming child_process appears 10 times within the RU-62-01 section"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every recorded finding carries all 13 required fields (id/unit/location/dimension/secondary/severity/evidence_tier/evidence/failure_scenario/classification/effort/dedup/disposition) with a non-blank dedup checking #231/#485/#486 explicitly by number, and no location resolves inside bbj-intellij/"
    requirement: "RVW-07"
    verification:
      - kind: other
        ref: "field-count parity check (14 findings x 12 required non-secondary fields, all equal counts); grep for #231/#485/#486 across all 14 findings; grep -c for bbj-intellij/ locations -> 0"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-18
status: complete
---

# Phase 62 Plan 02: RU-62-01 (Extension Host & Commands) Summary

**Swept `extension.ts`/`Commands/CompilerOptions.ts`/`Commands/Commands.cjs` (1,805 LOC, the extension activation entry point) across all 7 live dimensions, finding a critical, unfixed OS command-injection surface across 7 `child_process.exec()` call sites plus 8 correctness/maintainability/parity/test-coverage gaps — 9 findings total, none exploitable-in-VS-Code-Workspace-Trust-terms without first controlling a setting or command call, rendered per the frozen D-09 disclosure tier.**

## Performance

- **Duration:** ~20 min (task commits only)
- **Started:** 2026-08-18T06:55:00Z
- **Completed:** 2026-08-18T07:15:47Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/62-COVERAGE.md`)

## Accomplishments

- Swept `RU-62-01` at evidence tier `repro`/repro-equivalent across D1, D2, D3, D7, then at tier `trace` across D4, D5, D8 — all 7 live cells filled with a verdict and a written check line naming the concrete checks applied; the D6 cell's verbatim `n/a` carry-forward was left untouched.
- **D1 (fail, critical):** traced every `child_process.exec()` call site in the unit — `Commands.cjs`'s `run`/`runWeb`/`compile`/`decompile*` and `extension.ts`'s EM validate/login flows — and found none applies shell-escaping or content validation to any interpolated value. Seven distinct workspace-settable string settings (`bbj.classpath`, `bbj.configPath`, `bbj.web.apps.<file>.name`, and all 7 string-typed `bbj.compiler.*` options) reach these commands unescaped, none of them marked `restricted` under VS Code's Workspace Trust model (confirmed: `package.json` declares no `capabilities.untrustedWorkspaces`), so a malicious workspace's committed `.vscode/settings.json` can reach this surface; a second, workspace-independent path exists via `bbj.runBUI`/`bbj.runDWC`'s caller-supplied `params.fsPath`, reachable by any other extension in the same VS Code window. Recorded as `P62-D1-003` (critical), rendered per the D-09 two-tier disclosure rule approved at plan `62-01`'s checkpoint — surface, problem class, and impact only, no trigger sequence/payload/PoC. A second D1 finding, `P62-D1-004` (medium), records that the EM JWT token is passed as a literal `exec()` process argument (OS-process-list-visible) and that the debug-mode output-channel masking that redacts it is a fragile substring match sharing the same escaping gap.
- **D2 (fail, medium):** found and recorded 3 findings — `P62-D2-002` (4 of 6 exec-invoking command entry points crash with `TypeError` when invoked via a globally-bound keybinding or the Command Palette while no editor is focused, since they dereference `params.fsPath` without checking `params` is defined, unlike the file's own `resolveTargetFileName()` helper which correctly guards this); `P62-D2-003` (none of `extension.ts`'s 16 disposable registrations — 14 `registerCommand` calls plus a formatting-provider registration and a notification listener — is pushed onto `context.subscriptions`, unlike the 4 composer-ui modules in the same extension, which do this correctly; a second `activate()` call within the same extension-host process would throw on every one); and `P62-D2-004` (`client.start()`'s rejection is unobserved — the only finding in the unit classified `easy`, since all six D-13 tests pass).
- **D3 (pass):** checked activation-path cost, config-file re-reads, and per-invocation resource accumulation — no defect found; the disposable-leak gap is correctly attributed to D2 (a one-time re-activation-lifecycle issue) rather than double-counted here.
- **D7 (fail, medium):** compared VS Code's shell-string `child_process.exec()` methodology against IntelliJ's array-based `GeneralCommandLine.addParameter()` (immune to shell-metacharacter reinterpretation) across all 5 run/compile/EM-login/validate actions, plus IntelliJ's pre-flight executable/directory validation (absent on the VS Code side) — recorded as `P62-D7-001`, a VS Code-side defect. Separately found `BbjCompileAction.java` is an unimplemented `TODO` stub and that 6 VS Code commands have no IntelliJ counterpart at all — both IntelliJ-side gaps, routed to `### Cross-unit referrals` addressed to `RU-63-01` per D-05 rather than recorded as findings here.
- **D4 (fail, medium+low):** `P62-D4-002` records `activate()`'s 9-concern god-function shape plus a triplicated exec-wrapping pattern (mechanical `git diff --no-index --numstat` on `extension.ts`'s two Promise-wrapped-exec blocks: `27 23` of 31/35 lines share the same shape) and 2 confirmed-dead code branches (`bbj.em.credentials`, `bbj.web.username`/`password` legacy fallback). `P62-D4-003` records `CompilerOptions.ts`'s 20-option `COMPILER_OPTIONS` array as a hand-maintained duplicate of `package.json`'s 20 matching `bbj.compiler.*` schema entries, with no single source of truth. The D-13 scope-fidelity note (`Commands.cjs` swept despite ROADMAP's criteria omitting it) is recorded in the D4 cell text.
- **D5 (fail, medium):** `CompilerOptions.ts` is thoroughly tested (511-line `compiler-options.test.ts`, ~45 cases), but `extension.ts` and `Commands.cjs` have zero test coverage — none of this section's 8 other findings would be caught by `npm test`. Recorded as `P62-D5-002`.
- **D8 (pass):** checked every JSDoc block in `Commands.cjs`/`CompilerOptions.ts` and `CLAUDE.md`'s Repository Structure/Build & Test/IDE Integration claims against the code just read — no contradiction found.
- Recorded 1 not-reproducible disposition (a candidate EM login/validate temp-file millisecond-collision race, deferred pending a concurrency harness) and 3 cross-unit referrals to `RU-63-01`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-62-01 at evidence tier `repro` — D1, D2, D3, D7** - `d1bb0c3` (docs)
2. **Task 2: Complete RU-62-01 at evidence tier `trace` — D4, D5, D8** - `b7f829b` (docs)

**Plan metadata:** commit created by this SUMMARY step (docs: complete plan)

## Files Created/Modified

- `.planning/reviews/62-COVERAGE.md` - `## RU-62-01 — Extension host & commands` section only: all 7 live cells verdicted, 9 finding records, 1 not-reproducible disposition, 3 cross-unit referrals. Header, grid, D-14 gate, stopping rule, exclusion-reason block, `RU-62-04`, the other three stubbed unit sections, and `## Phase 62 Close-Out` were not touched.

## Decisions Made

- `P62-D1-003` rated `critical` and rendered per the frozen D-09 two-tier disclosure rule — full trace of every unescaped interpolation point recorded, but no trigger sequence, payload, or proof-of-concept, since the surface is unfixed in a public repository.
- Credential/token exposure (EM JWT passed as literal process argv, plus fragile substring-based debug-log masking) split into its own finding (`P62-D1-004`) rather than folded into `P62-D1-003`, since it is a distinct failure mode (information disclosure) from the injection finding (arbitrary command execution), even though both share the same root unescaped-interpolation cause.
- `BbjCompileAction.java`'s TODO-stub status and the 6-command IntelliJ capability gap are IntelliJ-side observations, routed to `### Cross-unit referrals` addressed to `RU-63-01` rather than recorded as `P62-D7-*` findings, per D-05.
- `P62-D2-004` (unhandled `client.start()` rejection) is the only finding in this unit classified `easy` — single-file, non-D1, low-severity, all six D-13 tests pass — demonstrating the classification rule produces varied outcomes, not a blanket `major` for every D1-adjacent unit.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' automated `<verify>` blocks passed on the first run.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `62-COVERAGE.md` now has 2 of 5 Phase 62 units fully swept (`RU-62-04`, `RU-62-01`); phase-wide verdict count is 14/40, pending 21/40, `n/a` 5/40 — matching the D-14 gate's re-derived totals.
- Phase 65's cross-cutting security synthesis inherits `P62-D1-003`/`P62-D1-004` as concrete, evidenced VS Code-side process-spawn/credential findings rather than a deferral pointer, satisfying D-07.
- Phase 63 inherits 3 open `RU-63-01` cross-unit referrals (compile-action stub, 6-command capability gap, refresh-java-classes granularity difference) as durable records to re-triage.
- `RVW-02`/`RVW-03` remain open (2 of 5 units swept); plan `62-03` (`RU-62-03`, wave 3, depends on this plan) is next.

---
*Phase: 62-extension-host-webview-composer-review*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `.planning/reviews/62-COVERAGE.md`
- FOUND: `d1bb0c3` (Task 1 commit)
- FOUND: `b7f829b` (Task 2 commit)
- Both plan-level automated `<verify>` gates re-run clean (7/7 live cells verdicted, 9 finding records with complete 13-field parity, phase-wide 14/21/5/40, no `location:` inside `bbj-intellij/`, no source-file modification, `.planning/reviews/INVENTORY.md` unchanged, D-14 gate re-derivation `35 5 40`)
