---
phase: 63-intellij-plugin-review
plan: 02
subsystem: review
tags: [intellij, run-actions, compile, em-login, token-store, security-audit, sec-04, sec-05, java]

requires:
  - phase: 63-intellij-plugin-review
    plan: 01
    provides: .planning/reviews/63-COVERAGE.md's frozen phase skeleton, the 8-row inherited-referral ledger, and the P63-D5-001 systemic no-test-source-set finding this plan cross-references
provides:
  - RU-63-01 (Run, compile & EM actions, 11 files / 1,260 LOC, INVENTORY risk rank 2) fully swept across all 7 live dimensions
  - Concrete, evidenced IntelliJ-side D1 findings on the process-spawn (GeneralCommandLine) and EM token-lifecycle (BbjEMTokenStore/BbjEMLoginAction) paths — the second half of the picture Phase 62's P62-D7-001 opened from the VS Code side
  - All 3 inherited Phase 62 referrals (BbjCompileAction.java stub, 5 no-counterpart VS Code commands, refreshJavaClasses full-restart mechanism) dispositioned — each promoted to a P63-D7-* finding
  - An outbound cross-unit referral to RU-63-05 routing BbjServerService.restart()'s mechanism side
affects: [63-intellij-plugin-review, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes-major-refactors, 68-deliverable-documents]

actuals:
  tokens: 23300
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Referral-count correction — Phase 62's own referral text described 'six' no-counterpart VS Code commands but a direct enumeration confirmed exactly 5 distinct command IDs; recorded as a correction to the inherited referral's own count rather than silently adopted"
    - "EDT-blocking chain trace — confirming a UI-freeze defect via pure control-flow analysis (actionPerformed always runs on EDT; buildCommandLine() invoked before the pooled-thread dispatch) without needing to launch the IDE, satisfying D-07's repro-tier trace requirement"
    - "God-class placement smell — flagging a responsibility (EM server-side token validation) as structurally misplaced in a base class distant from the rest of that lifecycle's files, a D4 finding class distinct from pure code duplication"

key-files:
  created: []
  modified:
    - .planning/reviews/63-COVERAGE.md

key-decisions:
  - "Confirmed IntelliJ's BbjSettings is an application-level (not project-level) PersistentStateComponent (plugin.xml:174-176's <applicationService/> registration) — the key D1 divergence from VS Code's workspace-settable bbj.classpath/bbj.configPath, since IntelliJ's equivalents cannot be supplied by an untrusted committed repository setting"
  - "Rated P63-D1-003 (EM password/token passed as GeneralCommandLine process arguments) severity high, matching the threat model's T-63-P02-S2, and rendered per D-13's two-tier disclosure rule — surface/problem-class/impact only, no trigger sequence or PoC"
  - "Found BbjRunBuiAction/BbjRunDwcAction's buildCommandLine() calls validateTokenServerSide()/BbjEMLoginAction.performLogin() synchronously on the EDT, before BbjRunActionBase's own pooled-thread dispatch — up to ~25s of IDE freeze on a single Run-As-BUI/DWC click with an expired token, undermining the project's own 'Process launch off EDT to pooled thread' Key Decision for this one flow; recorded as P63-D2-004, severity high"
  - "Corrected inherited referral #2's count: Phase 62's text says 'six' VS Code commands with no IntelliJ counterpart but names only five (configureCompileOptions, denumber, decompile, decompileReadonly, em); direct enumeration against bbj-intellij's action inventory confirmed exactly 5 — stated explicitly as a correction, not silently adopted, and one finding (P63-D7-002) allocated for the categorical absence"
  - "Disposed all 3 inherited Phase 62 referrals as promoted — P63-D7-001 (compile stub), P63-D7-002 (5 missing commands), P63-D7-003 (refreshJavaClasses full-restart-vs-targeted-request divergence) — and added an outbound Cross-unit referral to RU-63-05 naming BbjServerService.restart() as the mechanism side, per referral #3's own note that plan 63-04 should re-triage rather than re-report"
  - "D5 cell cross-references P63-D5-001 by ID with no new finding ID allocated — only this unit's own untested-behaviour consequence (three run-mode command-line assemblies, EM login round-trip, token lifecycle, per-action enablement matrix) was added, per D-08"
  - "Rated all four D4 duplication/god-class findings and the two D8 doc-accuracy findings major/easy per D-09's strict single-file test: duplication fixes spanning 2-3 files fail test (1) and are major even though they are behaviour-preserving refactors satisfying test (4) vacuously; the two doc-only fixes (BbjCompileAction's misleading class Javadoc, BbjEMTokenStore's PasswordSafe-backend overclaim) are confined to 1 file and change no behaviour, so both are easy"

requirements-completed: []  # RVW-04 is phase-wide (spans all 5 plans); not marked complete until 63-05 closes the phase

metrics:
  duration: ~40min (task commits only)
  completed: 2026-08-18
  status: complete
---

# Phase 63 Plan 02: RU-63-01 (Run, compile & EM actions) Summary

**Swept all 11 files under `bbj-intellij/.../actions/` across all 7 live dimensions, recording 16 findings including concrete D1 records on the process-spawn and EM-token-lifecycle surfaces Phase 65 will later synthesize, and dispositioned all 3 inherited Phase 62 referrals.**

## Performance

- **Duration:** ~40 min (task commits only)
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/63-COVERAGE.md`)

## Accomplishments

- Swept `RU-63-01` (Run, compile & EM actions, 11 files / 1,260 LOC, INVENTORY risk rank 2) end to end across all 7 live dimensions — D1, D2, D3, D7 at `repro`/repro-equivalent tier; D4, D5, D8 at `trace` tier.
- Recorded 16 findings: 3 D1 (EM password/token exposed as process arguments — high; JWT expiry decoder fail-open on malformed/unsigned/exp-less tokens — medium; EM secrets in temp files with no explicit POSIX permissions — medium), 3 D2 (BUI/DWC's `buildCommandLine()` blocking the EDT for up to ~25s via synchronous token validation/re-login — high; `BbjEMLoginAction` missing `update()`/`getActionUpdateThread()` overrides — low; a temp-file leak on a `runProcess()` exception path — low), 1 D3 (redundant full server-round-trip token re-validation on every single run, compounding the D2 EDT-freeze), 4 D4 (three near-identical plugin-tool-path resolvers; `BbjRunBuiAction`/`BbjRunDwcAction`'s 131-of-142-line duplication; the three `BbjCompose*Action` files' 33-of-38-line duplication; `BbjRunActionBase`'s EM-token-validation placement smell), 1 D5 (`P63-D5-001` cross-reference plus this unit's own untested-behaviour consequence — no new ID), 3 D7 (the compile stub, the 5 missing VS Code commands, and the `refreshJavaClasses` restart-vs-targeted-request divergence — all 3 promoting the inherited referrals), and 2 D8 (`BbjCompileAction`'s misleading unconditional class Javadoc, and `BbjEMTokenStore`'s "OS-native keychain" overclaim against IntelliJ's user-configurable `PasswordSafe` backend).
- Confirmed IntelliJ's `GeneralCommandLine.addParameter(...)` construction has no shell-injection surface analogous to VS Code's `child_process.exec()` (Phase 62's `P62-D7-001`), and that IntelliJ's settings are application-level (not workspace-committable) — stated explicitly as the D1 divergence, so this unit's D1 findings focus on the genuine remaining surface: process-argument secret exposure, temp-file permissions, and the token-expiry decoder's fail-open behaviour.
- Found and traced a concrete EDT-blocking defect (`P63-D2-004`): `BbjRunBuiAction`/`BbjRunDwcAction`'s `buildCommandLine()` performs the EM token server-side validation round trip (and, on failure, a full re-login prompt) synchronously on the EDT, *before* `BbjRunActionBase`'s own pooled-thread dispatch — undermining the project's documented "Process launch off EDT to pooled thread" decision for this one flow.
- Disposed all 3 inherited Phase 62 referrals as promoted to `P63-D7-001`/`002`/`003`, correcting referral #2's own stated count ("six" vs. the 5 actually enumerated), and added an outbound Cross-unit referral to `RU-63-05` for `BbjServerService.restart()`'s mechanism side.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-63-01 at evidence tier `repro` — D1, D2, D3, D7 — and triage the 3 inherited referrals** - `5e26839` (docs)
2. **Task 2: Complete RU-63-01 at evidence tier `trace` — D4, D5, D8** - `ae644bc` (docs)

_No TDD tasks in this plan — it is a review-recording plan that modifies no source file._

## Files Created/Modified

- `.planning/reviews/63-COVERAGE.md` - Filled the `## RU-63-01 — Run, compile & EM actions` section only: all 7 live cells, the inherited referral triage, 16 finding records, the empty Not-reproducible dispositions statement, one outbound cross-unit referral, and the unit closure/scope-fidelity note.

## Decisions Made

- Confirmed `BbjSettings` is application-level (`plugin.xml:174-176`'s `<applicationService/>`), not project-level — the concrete fact underpinning why this unit's `GeneralCommandLine` arguments have a narrower attacker-control surface than VS Code's workspace-settable equivalents.
- Rated `P63-D1-003` (password/token as process arguments) `high`, matching threat `T-63-P02-S2`, rendered per D-13's two-tier disclosure rule.
- Traced and recorded `P63-D2-004` (EDT-blocking `buildCommandLine()` for BUI/DWC) as `high` severity — up to ~25s IDE freeze in the worst case — via pure control-flow analysis, no IDE launch required.
- Corrected inherited referral #2's stated count from "six" to the actually-enumerated 5 VS Code commands with no IntelliJ counterpart, stating the correction explicitly rather than silently adopting the referral's own number.
- Disposed all 3 inherited referrals as `promoted`, each becoming a `P63-D7-*` finding; added an outbound referral to `RU-63-05` per referral #3's own note that the restart mechanism (`BbjServerService.restart()`) belongs to that unit.
- Kept `D5` to a pure cross-reference (`P63-D5-001`) plus this unit's own consequence text, allocating no new D5 finding ID, per D-08.
- Classified all four D4 findings and both D8 findings per D-09's strict six-test log: the D4 duplication/placement fixes span 2-3 files and fail test (1), so all four are `major` despite being behaviour-preserving refactors that satisfy test (4) vacuously; the two D8 doc-only fixes are confined to 1 file and change no behaviour, so both are `easy`.

## Deviations from Plan

None - plan executed exactly as written. All checks the plan's `<action>` text specified were performed at both evidence tiers; every candidate claim raised during the sweep cleared its tier and was recorded as a finding (no `### Not-reproducible dispositions` entry was needed, stated explicitly rather than omitted per the stopping rule's empty-subblock register).

## Known Stubs

None — this plan's deliverable is a review-coverage document, not application code; there is no data-rendering surface to stub. The other three `## RU-63-0N` unit sections (`RU-63-04`, `RU-63-05`, `RU-63-02`) and `## Phase 63 Close-Out` remain intentionally stubbed with `pending`, per plan `63-01`'s designed handoff shape for plans `63-03`..`63-05`.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-63-01`'s D1 findings (`P63-D1-003` EM password/token in process args, `P63-D1-004` JWT expiry fail-open decoder, `P63-D1-005` unpermissioned temp files) are concrete, evidenced IntelliJ-side records ready for Phase 65's SEC-04 (EM token lifecycle) and SEC-05 (process spawning, alongside Phase 62's `P62-D7-001`) synthesis.
- The outbound Cross-unit referral to `RU-63-05` (`BbjServerService.restart()`'s mechanism side) is ready for plan `63-04` to re-triage rather than re-report.
- All 3 inherited Phase 62 referral-ledger rows (1-3) now carry a `promoted` disposition, updating the phase's third hard gate (D-17.3) toward completion — 4 rows (4-5, 6-7) remain outstanding for plans `63-03` and `63-05`.
- Plan `63-03` (`RU-63-04`, composer dialogs & bridge) is next in the wave chain and owns ledger rows 4-5 (the SETOPTS-has-no-IntelliJ-counterpart referrals, triaged once per D-06's countability note).

---
*Phase: 63-intellij-plugin-review*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `.planning/phases/63-intellij-plugin-review/63-02-SUMMARY.md`
- FOUND: commit `5e26839` (Task 1)
- FOUND: commit `ae644bc` (Task 2)
